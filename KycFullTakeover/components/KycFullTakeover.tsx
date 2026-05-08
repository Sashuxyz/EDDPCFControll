// Root component. Receives parsed payload + status blob from index.ts and
// orchestrates: TOC navigation, section rendering, takeover lifecycle.
// State is held here; index.ts owns the bound-field outputs.

import * as React from 'react';
import { HeaderStrip } from './HeaderStrip';
import { TocSidebar } from './TocSidebar';
import { FindingsSection } from './sections/FindingsSection';
import { ProposedEmailSection } from './sections/ProposedEmailSection';
import { NarrativeSection } from './sections/NarrativeSection';
import { PlaceholderSection } from './sections/PlaceholderSection';
import { TotalWealthIncomeSection } from './sections/TotalWealthIncomeSection';
import { PepSanctionsRiskSection } from './sections/PepSanctionsRiskSection';
import { AssociationChipsSection } from './sections/AssociationChipsSection';
import { SourceOfWealthSection } from './sections/SourceOfWealthSection';
import { DetailedDAHoldingsSection } from './sections/DetailedDAHoldingsSection';
import { PlannedFiatFundsSection } from './sections/PlannedFiatFundsSection';
import { PlannedDAFundsSection } from './sections/PlannedDAFundsSection';
import {
  KycPayload, LookupRef, SectionId, SectionState, TakeoverStatusBlob, SectionStatusRecord,
  SourceOfWealthRow, DigitalAssetHoldingRow, IncomingFiatFundRow, DigitalAssetFundRow,
} from '../types';
import { colors, spacing } from '../styles/tokens';
import { showConfirmation } from '../utils/confirmationDialog';
import { hashSlice, setSectionState } from '../utils/sectionStatus';
import { patchKycProfile, associateRecords, createChildren } from '../utils/dataverse';
import { openProposedEmail } from '../utils/emailActivity';

export interface KycFullTakeoverProps {
  payload:           KycPayload;
  statusBlob:        TakeoverStatusBlob;
  kycProfileId:      string;
  kycProfileName:    string;
  webAPI:            ComponentFramework.WebApi;
  onStatusChange:    (next: TakeoverStatusBlob) => void;   // index.ts persists
}

// Per-section local edit state. Maps section id → current editable value.
// Narrative sections use string; field-set sections use typed sub-objects.
// We keep a single object shape so setEdits can merge both cleanly.
//
// Casing note: keys inside the field-set sub-objects (e.g. syg_TotalWealth_currency,
// syg_PEP, syg_ReputationalRisk) MIRROR THE PAYLOAD TYPE CASING from types.ts —
// they are NOT the OData write-side casing. The lowercase Dataverse property
// names live in the buildXPatch helpers below; that's where the boundary
// between "internal payload-mirror state" and "outbound OData wire format" is.
interface EditState {
  // Narrative sections (string values)
  professionalExperience?:        string;
  financialSituationNarrative?:   string;
  digitalAssetHoldingsNarrative?: string;
  transactionalBehaviour?:        string;
  additionalComments?:            string;
  // Merged "Income, total wealth and asset allocation" section. Banded total
  // wealth + annual income were dropped in 0.4.2 — only timeframe + asset
  // allocation remain. `totalWealth` is the CHF money owned by the embedded
  // WealthAllocation; `vals` is the 7-element percentage array from
  // ASSET_CLASSES.
  totalWealthIncome?: {
    syg_TimeframeforWealthAccumulation?: number | null;
    totalWealth?:                        number | null;
    vals?:                               number[];
  };
  pepSanctionsRisk?: Partial<{
    syg_PEP:                                      boolean | null;
    syg_pepstatus:                                number | null;
    syg_pepdetails:                               string;
    syg_pepderivationdetails:                     string;
    syg_formerpepdetails:                         string;
    syg_ReputationalRisk:                         number | null;
    syg_mediascreeningandreputationalriskcomment: string;
    syg_SanctionCheck:                            number | null;
    syg_sanctioncheckcomment:                     string;
  }>;
  // N:N section edits — the agent's resolved list, optionally trimmed by the
  // RM via the chip × buttons before takeover.
  businessActivities?:  LookupRef[];
  countriesOfActivity?: LookupRef[];
  // Itemized section edits — agent rows trimmed by the RM via card × buttons.
  // Source of Wealth additionally tracks the narrative textarea.
  sourceOfWealth?:      { narrative?: string; items?: SourceOfWealthRow[] };
  detailedDAHoldings?:  DigitalAssetHoldingRow[];
  plannedFiatFunds?:    IncomingFiatFundRow[];
  plannedDAFunds?:      DigitalAssetFundRow[];
}

export const KycFullTakeover: React.FC<KycFullTakeoverProps> = ({
  payload, statusBlob: initialStatusBlob, kycProfileId, kycProfileName, webAPI, onStatusChange,
}) => {
  // Local copy of the status blob — updated synchronously on each takeover so
  // the UI reflects the new state immediately. onStatusChange persists out to
  // the bound field via index.ts; the parent does NOT re-render us with the
  // updated blob (would loop). If the form is reloaded, this component
  // remounts with a fresh initialStatusBlob from props.
  const [statusBlob, setStatusBlob] = React.useState(initialStatusBlob);
  const [edits, setEdits] = React.useState<EditState>({});
  const [activeId, setActiveId] = React.useState<SectionId | undefined>(undefined);

  const persistStatus = (next: TakeoverStatusBlob) => {
    setStatusBlob(next);
    onStatusChange(next);
  };

  // === Section state derivation ============================================
  const sectionState = (id: SectionId, payloadHasIt: boolean, isReadOnly = false): SectionState => {
    if (isReadOnly) return 'read-only';
    if (!payloadHasIt) return 'na';
    const persisted = statusBlob.sections[id];
    if (persisted?.state === 'done' || persisted?.state === 'partial-failed') return persisted.state;
    const narrativeEdit = (edits as Record<string, unknown>)[id];
    if (narrativeEdit !== undefined && narrativeEdit !== originalNarrativeValue(payload, id)) return 'edited';
    return 'pending';
  };

  // === TOC composition ====================================================
  const groups = [
    {
      label: 'Review',
      entries: [
        { id: 'findings'            as SectionId, label: 'Findings',         state: sectionState('findings',            !!payload.findings, true) },
        { id: 'proposedClientEmail' as SectionId, label: 'Proposed Email',   state: sectionState('proposedClientEmail', !!payload.proposedClientEmail, true) },
      ],
    },
    {
      label: 'Client Background',
      entries: [
        { id: 'professionalExperience' as SectionId, label: 'Professional Experience', state: sectionState('professionalExperience', !!payload.professionalExperience) },
        { id: 'businessActivities'     as SectionId, label: 'Business Activities',     state: sectionState('businessActivities',     !!payload.businessActivities) },
        { id: 'countriesOfActivity'    as SectionId, label: 'Countries of Activity',   state: sectionState('countriesOfActivity',    !!payload.countriesOfActivity) },
        { id: 'relatedParties'         as SectionId, label: 'Related Parties',         state: sectionState('relatedParties',         !!payload.relatedParties) },
      ],
    },
    {
      label: 'Financial Situation',
      entries: [
        { id: 'financialSituationNarrative'   as SectionId, label: 'Financial Situation Narrative', state: sectionState('financialSituationNarrative',   typeof payload.financialSituationNarrative === 'string') },
        { id: 'totalWealthIncome'             as SectionId, label: 'Income, total wealth and asset allocation', state: sectionState('totalWealthIncome', !!payload.totalWealthIncome || !!payload.currentAssetAllocation) },
        { id: 'sourceOfWealth'                as SectionId, label: 'Source of Wealth',              state: sectionState('sourceOfWealth',                !!payload.sourceOfWealth) },
        { id: 'digitalAssetHoldingsNarrative' as SectionId, label: 'Digital Asset Holdings Narrative', state: sectionState('digitalAssetHoldingsNarrative', typeof payload.digitalAssetHoldingsNarrative === 'string') },
        { id: 'detailedDAHoldings'            as SectionId, label: 'Detailed DA Holdings',          state: sectionState('detailedDAHoldings',            !!payload.detailedDAHoldings) },
      ],
    },
    {
      label: 'Expected Activity',
      entries: [
        { id: 'transactionalBehaviour' as SectionId, label: 'Transactional Behaviour', state: sectionState('transactionalBehaviour', typeof payload.transactionalBehaviour === 'string') },
        { id: 'plannedFiatFunds'       as SectionId, label: 'Planned Fiat Funds',      state: sectionState('plannedFiatFunds',       !!payload.plannedFiatFunds) },
        { id: 'plannedDAFunds'         as SectionId, label: 'Planned DA Funds',        state: sectionState('plannedDAFunds',         !!payload.plannedDAFunds) },
      ],
    },
    {
      label: 'Compliance & Other',
      entries: [
        { id: 'pepSanctionsRisk'   as SectionId, label: 'PEP, Adverse Media and Sanctions', state: sectionState('pepSanctionsRisk', !!payload.pepSanctionsRisk) },
        { id: 'additionalComments' as SectionId, label: 'Additional Comments',              state: sectionState('additionalComments', typeof payload.additionalComments === 'string') },
      ],
    },
  ];

  // === Narrative takeover handler ==========================================
  const takeoverNarrative = async (
    id: SectionId,
    fieldLabel: string,
    dataverseFieldName: string,
  ) => {
    const value = ((edits as Record<string, unknown>)[id] as string | undefined) ?? originalNarrativeValue(payload, id) ?? '';
    const current = statusBlob.sections[id];
    const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

    const ok = await showConfirmation({
      type: 'narrative',
      sectionLabel: id,
      fieldLabel,
      isReRun,
    });
    if (!ok) return;

    const result = await patchKycProfile(webAPI, kycProfileId, { [dataverseFieldName]: value });
    const record: SectionStatusRecord = result.ok
      ? {
          state:       'done',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 1 },
          payloadHash: hashSlice(value),
        }
      : {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 0, failed: 1 },
          errors:      [{ field: dataverseFieldName, message: result.error ?? 'unknown' }],
          payloadHash: hashSlice(value),
        };
    persistStatus(setSectionState(statusBlob, id, record));
  };

  // Multi-field PATCH for field-set sections. Logical names must be lowercase
  // (Dataverse OData property paths are case-sensitive). Lookups are passed as
  // `{key}@odata.bind` records pointing at the target entity-set.
  const takeoverFieldSet = async (
    id: SectionId,
    sectionLabel: string,
    fields: Record<string, unknown>,
  ) => {
    const current = statusBlob.sections[id];
    const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

    const ok = await showConfirmation({
      type: 'fieldSet',
      sectionLabel,
      fieldCount: Object.keys(fields).length,
      isReRun,
    });
    if (!ok) return;

    const result = await patchKycProfile(webAPI, kycProfileId, fields);
    const record: SectionStatusRecord = result.ok
      ? {
          state:       'done',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: Object.keys(fields).length },
          payloadHash: hashSlice(fields),
        }
      : {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 0, failed: Object.keys(fields).length },
          errors:      [{ message: result.error ?? 'unknown' }],
          payloadHash: hashSlice(fields),
        };
    persistStatus(setSectionState(statusBlob, id, record));
  };

  // N:N association takeover. Iterates the agent's LookupRef list and POSTs
  // $ref records via associateRecords. Already-associated targets are silently
  // counted as `duplicates` (success); only hard failures count toward the
  // partial-failed status.
  const takeoverNN = async (
    id:                 SectionId,
    sectionLabel:       string,
    entityLabel:        string,
    relationshipName:   string,
    targetEntitySet:    string,
    items:              { id: string; name: string }[],
  ) => {
    const current = statusBlob.sections[id];
    const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

    const ok = await showConfirmation({
      type: 'nton',
      sectionLabel,
      entityLabel,
      itemCount: items.length,
      isReRun,
    });
    if (!ok) return;

    const result = await associateRecords(
      kycProfileId,
      relationshipName,
      targetEntitySet,
      items.map((i) => i.id),
    );

    // Translate error messages from GUIDs to lookup names (spec: GUIDs never
    // surface in the UI). The associateRecords helper only knows ids — we map
    // back via the items list we just sent.
    const idToName = new Map(items.map((i) => [i.id, i.name]));
    const record: SectionStatusRecord = result.failed === 0
      ? {
          state:       'done',
          lastRunAt:   new Date().toISOString(),
          result:      { associated: result.associated + result.duplicates },
          payloadHash: hashSlice(items),
        }
      : {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { associated: result.associated + result.duplicates, failed: result.failed },
          errors:      result.errors.map((e) => ({
            message: `${idToName.get(e.targetId) ?? '(unknown record)'}: ${shortenErrorMessage(e.message)}`,
          })),
          payloadHash: hashSlice(items),
        };
    persistStatus(setSectionState(statusBlob, id, record));
  };

  // Itemized child-record creation. Each row is converted to its OData write
  // payload by the caller-supplied `rowToFields`. Optional `parentPatch` runs
  // before the row creates (Source of Wealth section uses this for the
  // narrative). Re-running creates duplicate child records — the confirmation
  // dialog's re-run modifier already warns about this.
  const takeoverItemized = async <T,>(
    id:                 SectionId,
    sectionLabel:       string,
    entityLabel:        string,
    entitySetName:      string,
    parentBindKey:      string,
    rows:               T[],
    rowToFields:        (row: T) => Record<string, unknown>,
    rowToName:          (row: T) => string,
    parentPatch?:       Record<string, unknown>,
  ) => {
    const current = statusBlob.sections[id];
    const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

    const ok = await showConfirmation({
      type: 'itemized',
      sectionLabel,
      entityLabel,
      itemCount: rows.length,
      isReRun,
    });
    if (!ok) return;

    if (parentPatch && Object.keys(parentPatch).length > 0) {
      const parentResult = await patchKycProfile(webAPI, kycProfileId, parentPatch);
      if (!parentResult.ok) {
        persistStatus(setSectionState(statusBlob, id, {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 0, created: 0, failed: 1 },
          errors:      [{ message: `parent patch failed: ${parentResult.error ?? 'unknown'}` }],
          payloadHash: hashSlice({ parentPatch, rows }),
        }));
        return;
      }
    }

    const fields = rows.map((r) => ({
      [parentBindKey]: `/syg_kycprofiles(${kycProfileId})`,
      ...rowToFields(r),
    }));
    const names = rows.map((r) => rowToName(r));
    const result = await createChildren(entitySetName, fields, names);

    const record: SectionStatusRecord = result.failed === 0
      ? {
          state:       'done',
          lastRunAt:   new Date().toISOString(),
          result:      { created: result.created, patched: parentPatch ? 1 : 0 },
          payloadHash: hashSlice({ parentPatch, rows }),
        }
      : {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { created: result.created, failed: result.failed, patched: parentPatch ? 1 : 0 },
          errors:      result.errors.map((e) => ({
            rowIndex: e.rowIndex,
            message:  `${e.rowName ?? '(unnamed row)'}: ${shortenErrorMessage(e.message)}`,
          })),
          payloadHash: hashSlice({ parentPatch, rows }),
        };
    persistStatus(setSectionState(statusBlob, id, record));
  };

  // === Patch-builder helpers ================================================

  // Combined "Income, total wealth and asset allocation" patch. Reads from
  // both the totalWealthIncome and currentAssetAllocation payload slices and
  // both lives under edits.totalWealthIncome (since the section is merged).
  const buildTotalWealthIncomePatch = (): Record<string, unknown> => {
    const p   = payload.totalWealthIncome;
    const ap  = payload.currentAssetAllocation;
    const e   = edits.totalWealthIncome ?? {};
    const out: Record<string, unknown> = {};

    // Timeframe field from the income / total-wealth slice. Banded total
    // wealth + annual income are intentionally NOT written in 0.4.2 — those
    // two fields were dropped from the UI; if the agent ships them they're
    // ignored here.
    if (p) {
      const tf = e.syg_TimeframeforWealthAccumulation ?? p.syg_TimeframeforWealthAccumulation;
      if (tf !== undefined && tf !== null) out['syg_timeframeforwealthaccumulation'] = tf;
    }

    // Asset allocation: CHF money + 7 _dec percentages
    // vals indexed per ASSET_CLASSES paramIndex: 0=cash, 1=digitalAssets,
    // 2=equities, 3=fixedIncome, 4=commodities, 5=realEstate, 6=other.
    if (ap) {
      const tw = e.totalWealth ?? ap.syg_TotalWealth_currency;
      if (tw !== undefined && tw !== null) out['syg_totalwealth_currency'] = tw;
      const vals = e.vals ?? [
        ap.syg_wealthdistribution_cash_dec         ?? 0,
        ap.syg_wealthdistribution_digitalassets_dec ?? 0,
        ap.syg_wealthdistribution_equities_dec     ?? 0,
        ap.syg_wealthdistribution_fixedincome_dec  ?? 0,
        ap.syg_wealthdistribution_commodities_dec  ?? 0,
        ap.syg_wealthdistribution_realestate_dec   ?? 0,
        ap.syg_wealthdistribution_other_dec        ?? 0,
      ];
      out['syg_wealthdistribution_cash_dec']           = vals[0];
      out['syg_wealthdistribution_digitalassets_dec']  = vals[1];
      out['syg_wealthdistribution_equities_dec']       = vals[2];
      out['syg_wealthdistribution_fixedincome_dec']    = vals[3];
      out['syg_wealthdistribution_commodities_dec']    = vals[4];
      out['syg_wealthdistribution_realestate_dec']     = vals[5];
      out['syg_wealthdistribution_other_dec']          = vals[6];
    }

    return out;
  };

  const buildPepSanctionsRiskPatch = (): Record<string, unknown> => {
    if (!payload.pepSanctionsRisk) return {};
    const p = payload.pepSanctionsRisk;
    const e = edits.pepSanctionsRisk ?? {};
    const out: Record<string, unknown> = {};
    const map: Array<[keyof typeof p, string]> = [
      ['syg_PEP',                                       'syg_pep'],
      ['syg_pepstatus',                                 'syg_pepstatus'],
      ['syg_pepdetails',                                'syg_pepdetails'],
      ['syg_pepderivationdetails',                      'syg_pepderivationdetails'],
      ['syg_formerpepdetails',                          'syg_formerpepdetails'],
      ['syg_ReputationalRisk',                          'syg_reputationalrisk'],
      ['syg_mediascreeningandreputationalriskcomment',  'syg_mediascreeningandreputationalriskcomment'],
      ['syg_SanctionCheck',                             'syg_sanctioncheck'],
      ['syg_sanctioncheckcomment',                      'syg_sanctioncheckcomment'],
    ];
    for (const [typedKey, dvKey] of map) {
      const v = (e as Record<string, unknown>)[typedKey as string] ?? p[typedKey];
      if (v !== undefined && v !== null && v !== '') out[dvKey] = v;
    }
    if (p.syg_peplevelid?.id) out['syg_peplevelid@odata.bind'] = `/syg_kycproperties(${p.syg_peplevelid.id})`;
    // Note: type carries syg_pepstatusid (lookup variant of syg_pepstatus) but
    // we intentionally only write the picklist syg_pepstatus in Phase 1. If the
    // form needs the lookup column populated too, add a parallel
    // `syg_pepstatusid@odata.bind` line here pointing at /syg_kycproperties(id).
    return out;
  };

  // === Itemized row builders =================================================

  const buildSourceOfWealthRow = (r: SourceOfWealthRow): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (r.syg_name !== undefined)                       out['syg_name']                                     = r.syg_name;
    if (r.syg_sourceofwealth !== undefined)             out['syg_sourceofwealth']                           = r.syg_sourceofwealth;
    if (r.syg_description !== undefined)                out['syg_description']                              = r.syg_description;
    if (r.syg_companyname !== undefined)                out['syg_companyname']                              = r.syg_companyname;
    if (r.syg_counterpartyname !== undefined)           out['syg_counterpartyname']                         = r.syg_counterpartyname;
    if (r.syg_relationshiptocounterparty !== undefined) out['syg_relationshiptocounterparty']               = r.syg_relationshiptocounterparty;
    if (r.syg_businessactivityid?.id)                   out['syg_businessactivityid@odata.bind']            = `/syg_businessactivitieses(${r.syg_businessactivityid.id})`;
    if (r.syg_countryid?.id)                            out['syg_countryid@odata.bind']                     = `/syg_countries(${r.syg_countryid.id})`;
    if (r.syg_yearofwealthgenerationid?.id)             out['syg_yearofwealthgenerationid@odata.bind']      = `/syg_years(${r.syg_yearofwealthgenerationid.id})`;
    if (r.syg_yearofwealthgenerationinitiatedid?.id)    out['syg_yearofwealthgenerationinitiatedid@odata.bind'] = `/syg_years(${r.syg_yearofwealthgenerationinitiatedid.id})`;
    if (r.syg_initialinvestment !== undefined)          out['syg_initialinvestment']                        = r.syg_initialinvestment;
    if (r.syg_valueatvaluationdate !== undefined)       out['syg_valueatvaluationdate']                     = r.syg_valueatvaluationdate;
    if (r.syg_valuationdate)                            out['syg_valuationdate']                            = r.syg_valuationdate;
    if (r.syg_wealthgenerated !== undefined)            out['syg_wealthgenerated']                          = r.syg_wealthgenerated;
    if (r.syg_corroboratedvalue !== undefined)          out['syg_corroboratedvalue']                        = r.syg_corroboratedvalue;
    if (r.syg_corroboratedpercentage !== undefined)     out['syg_corroboratedpercentage']                   = r.syg_corroboratedpercentage;
    if (r.syg_rationale !== undefined)                  out['syg_rationale']                                = r.syg_rationale;
    if (r.syg_supportinginformation !== undefined)      out['syg_supportinginformation']                    = r.syg_supportinginformation;
    if (r.syg_additionaldetails !== undefined)          out['syg_additionaldetails']                        = r.syg_additionaldetails;
    return out;
  };

  const buildDigitalAssetHoldingRow = (r: DigitalAssetHoldingRow): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (r.syg_name !== undefined)                  out['syg_name']                            = r.syg_name;
    if (r.syg_digitalassetid?.id)                  out['syg_digitalassetid@odata.bind']       = `/syg_digitalassetcurrencies(${r.syg_digitalassetid.id})`;
    if (r.syg_amount !== undefined)                out['syg_amount']                          = r.syg_amount;
    if (r.syg_currentvaluechf !== undefined)       out['syg_currentvaluechf']                 = r.syg_currentvaluechf;
    if (r.syg_valuechf !== undefined)              out['syg_valuechf']                        = r.syg_valuechf;
    if (r.syg_dateofvaluation)                     out['syg_dateofvaluation']                 = r.syg_dateofvaluation;
    if (r.syg_acquiringyear?.id)                   out['syg_acquiringyear@odata.bind']        = `/syg_years(${r.syg_acquiringyear.id})`;
    if (r.syg_acquiringplace !== undefined)        out['syg_acquiringplace']                  = r.syg_acquiringplace;
    if (r.syg_averageacquiringprice !== undefined) out['syg_averageacquiringprice']           = r.syg_averageacquiringprice;
    if (r.syg_corroboratedamount !== undefined)    out['syg_corroboratedamount']              = r.syg_corroboratedamount;
    if (r.syg_corroboratedamountchf !== undefined) out['syg_corroboratedamountchf']           = r.syg_corroboratedamountchf;
    if (r.syg_corroboratedvalue !== undefined)     out['syg_corroboratedvalue']               = r.syg_corroboratedvalue;
    if (r.syg_currentcustody !== undefined)        out['syg_currentcustody']                  = r.syg_currentcustody;
    if (r.syg_description !== undefined)           out['syg_description']                     = r.syg_description;
    if (r.syg_originoffunds !== undefined)         out['syg_originoffunds']                   = r.syg_originoffunds;
    if (r.syg_supportingdocuments !== undefined)   out['syg_supportingdocuments']             = r.syg_supportingdocuments;
    return out;
  };

  const buildIncomingFiatFundRow = (r: IncomingFiatFundRow): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (r.syg_name !== undefined)              out['syg_name']                          = r.syg_name;
    if (r.syg_amount !== undefined)            out['syg_amount']                        = r.syg_amount;
    if (r.syg_bank !== undefined)              out['syg_bank']                          = r.syg_bank;
    if (r.syg_bankdomicileid?.id)              out['syg_bankdomicileid@odata.bind']     = `/syg_countries(${r.syg_bankdomicileid.id})`;
    if (r.syg_clientid?.id) {
      const set = r.syg_clientid.etn === 'account' ? 'accounts' : 'contacts';
      const key = r.syg_clientid.etn === 'account' ? 'syg_clientid_account@odata.bind' : 'syg_clientid_contact@odata.bind';
      out[key] = `/${set}(${r.syg_clientid.id})`;
    }
    if (r.syg_proofofownership !== undefined)  out['syg_proofofownership']              = r.syg_proofofownership;
    if (r.syg_transfertimeframe !== undefined) out['syg_transfertimeframe']             = r.syg_transfertimeframe;
    return out;
  };

  const buildDigitalAssetFundRow = (r: DigitalAssetFundRow): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (r.syg_name !== undefined)                            out['syg_name']                                  = r.syg_name;
    if (r.syg_customerid?.id) {
      const set = r.syg_customerid.etn === 'account' ? 'accounts' : 'contacts';
      const key = r.syg_customerid.etn === 'account' ? 'syg_customerid_account@odata.bind' : 'syg_customerid_contact@odata.bind';
      out[key] = `/${set}(${r.syg_customerid.id})`;
    }
    if (r.syg_firstdigitalassettransfertype?.id)             out['syg_firstdigitalassettransfertype@odata.bind'] = `/syg_digitalassetcurrencies(${r.syg_firstdigitalassettransfertype.id})`;
    if (r.syg_firstdigitalassettransferamount !== undefined) out['syg_firstdigitalassettransferamount']      = r.syg_firstdigitalassettransferamount;
    if (r.syg_firsttransferamount !== undefined)             out['syg_firsttransferamount']                  = r.syg_firsttransferamount;
    if (r.syg_currentvaluechf !== undefined)                 out['syg_currentvaluechf']                      = r.syg_currentvaluechf;
    if (r.syg_valuechf !== undefined)                        out['syg_valuechf']                             = r.syg_valuechf;
    if (r.syg_dateofvaluation)                               out['syg_dateofvaluation']                      = r.syg_dateofvaluation;
    if (r.syg_proofofownership !== undefined)                out['syg_proofofownership']                     = r.syg_proofofownership;
    if (r.syg_senderwallet !== undefined)                    out['syg_senderwallet']                         = r.syg_senderwallet;
    if (r.syg_senderwallet_optionset !== undefined)          out['syg_senderwallet_optionset']               = r.syg_senderwallet_optionset;
    if (r.syg_source !== undefined)                          out['syg_source']                               = r.syg_source;
    if (r.syg_transfertimeframe !== undefined)               out['syg_transfertimeframe']                    = r.syg_transfertimeframe;
    if (r.syg_remarks !== undefined)                         out['syg_remarks']                              = r.syg_remarks;
    if (r.syg_comment !== undefined)                         out['syg_comment']                              = r.syg_comment;
    if (r.syg_additionalexpectedfunding !== undefined)       out['syg_additionalexpectedfunding']            = r.syg_additionalexpectedfunding;
    return out;
  };

  // === Layout =============================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.cardBg }}>
      <HeaderStrip
        profileName={kycProfileName}
        schemaVersion={payload.schemaVersion}
        lastRunAt={mostRecentLastRun(statusBlob)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TocSidebar
          groups={groups}
          activeId={activeId}
          onNavigate={(id) => {
            setActiveId(id);
            const el = document.getElementById(`section-${id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: spacing.lg }}>

          {/* Review group */}
          {payload.findings && (
            <div id="section-findings"><FindingsSection findings={payload.findings} /></div>
          )}
          {payload.proposedClientEmail && (
            <div id="section-proposedClientEmail">
              <ProposedEmailSection
                email={payload.proposedClientEmail}
                onCreateEmail={async () => {
                  await openProposedEmail(payload.proposedClientEmail!, kycProfileId, kycProfileName);
                }}
              />
            </div>
          )}

          {/* Client Background */}
          {payload.professionalExperience && (
            <div id="section-professionalExperience">
              <NarrativeSection
                title="Professional Experience"
                fieldLabel="Professional Experience Summary"
                state={sectionState('professionalExperience', true)}
                value={edits.professionalExperience ?? payload.professionalExperience.syg_ProfessionalExperienceSummary ?? ''}
                onChange={(next) => setEdits((p) => ({ ...p, professionalExperience: next }))}
                onTakeover={() => takeoverNarrative('professionalExperience', 'Professional Experience Summary', 'syg_professionalexperiencesummary')}
                lastRunAt={statusBlob.sections.professionalExperience?.lastRunAt}
                errorMsg={statusBlob.sections.professionalExperience?.errors?.[0]?.message}
              />
            </div>
          )}
          {payload.businessActivities && (() => {
            const baItems = edits.businessActivities ?? payload.businessActivities;
            return (
              <div id="section-businessActivities">
                <AssociationChipsSection
                  title="Business Activities"
                  items={baItems}
                  state={edits.businessActivities !== undefined && statusBlob.sections.businessActivities?.state !== 'done'
                    ? 'edited'
                    : sectionState('businessActivities', true)}
                  onTakeover={() => takeoverNN(
                    'businessActivities',
                    'Business Activities',
                    'Business Activity',
                    'syg_businessactivities_syg_KYCProfile_syg_KYCProfile',
                    'syg_businessactivitieses',
                    baItems,
                  )}
                  onRemove={(idx) => setEdits((p) => ({
                    ...p,
                    businessActivities: baItems.filter((_, i) => i !== idx),
                  }))}
                  lastRunAt={statusBlob.sections.businessActivities?.lastRunAt}
                  errorMsg={statusBlob.sections.businessActivities?.errors?.[0]?.message}
                />
              </div>
            );
          })()}
          {payload.countriesOfActivity && (() => {
            const coItems = edits.countriesOfActivity ?? payload.countriesOfActivity;
            return (
              <div id="section-countriesOfActivity">
                <AssociationChipsSection
                  title="Countries of Activity"
                  items={coItems}
                  state={edits.countriesOfActivity !== undefined && statusBlob.sections.countriesOfActivity?.state !== 'done'
                    ? 'edited'
                    : sectionState('countriesOfActivity', true)}
                  onTakeover={() => takeoverNN(
                    'countriesOfActivity',
                    'Countries of Activity',
                    'Country',
                    'syg_new_country_syg_KYCProfile_syg_KYCProfile',
                    'new_countries',
                    coItems,
                  )}
                  onRemove={(idx) => setEdits((p) => ({
                    ...p,
                    countriesOfActivity: coItems.filter((_, i) => i !== idx),
                  }))}
                  lastRunAt={statusBlob.sections.countriesOfActivity?.lastRunAt}
                  errorMsg={statusBlob.sections.countriesOfActivity?.errors?.[0]?.message}
                />
              </div>
            );
          })()}
          <div id="section-relatedParties">        <PlaceholderSection title="Related Parties"         milestone="M6" /></div>

          {/* Financial Situation */}
          {typeof payload.financialSituationNarrative === 'string' && (
            <div id="section-financialSituationNarrative">
              <NarrativeSection
                title="Financial Situation Narrative"
                fieldLabel="Financial Situation Summary"
                state={sectionState('financialSituationNarrative', true)}
                value={edits.financialSituationNarrative ?? payload.financialSituationNarrative}
                onChange={(next) => setEdits((p) => ({ ...p, financialSituationNarrative: next }))}
                onTakeover={() => takeoverNarrative('financialSituationNarrative', 'Financial Situation Summary', 'syg_financialsituationsummary')}
                lastRunAt={statusBlob.sections.financialSituationNarrative?.lastRunAt}
                errorMsg={statusBlob.sections.financialSituationNarrative?.errors?.[0]?.message}
              />
            </div>
          )}
          {(payload.totalWealthIncome || payload.currentAssetAllocation) && (
            <div id="section-totalWealthIncome">
              <TotalWealthIncomeSection
                payload={payload.totalWealthIncome ?? {}}
                assetPayload={payload.currentAssetAllocation}
                state={sectionState('totalWealthIncome', true)}
                edits={edits.totalWealthIncome ?? {}}
                onEditTimeframe={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), syg_TimeframeforWealthAccumulation: next } }))}
                onEditTotalWealth={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), totalWealth: next } }))}
                onEditVals={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), vals: next } }))}
                onTakeover={() => takeoverFieldSet('totalWealthIncome', 'Income, total wealth and asset allocation', buildTotalWealthIncomePatch())}
                lastRunAt={statusBlob.sections.totalWealthIncome?.lastRunAt}
                errorMsg={statusBlob.sections.totalWealthIncome?.errors?.[0]?.message}
              />
            </div>
          )}
          {payload.sourceOfWealth && (() => {
            const itemsEdit = edits.sourceOfWealth?.items;
            const items = itemsEdit ?? payload.sourceOfWealth.items;
            return (
              <div id="section-sourceOfWealth">
                <SourceOfWealthSection
                  payload={payload.sourceOfWealth}
                  state={(edits.sourceOfWealth !== undefined && statusBlob.sections.sourceOfWealth?.state !== 'done')
                    ? 'edited'
                    : sectionState('sourceOfWealth', true)}
                  narrativeEdit={edits.sourceOfWealth?.narrative}
                  itemsEdit={itemsEdit}
                  onNarrativeChange={(next) => setEdits((p) => ({
                    ...p,
                    sourceOfWealth: { ...(p.sourceOfWealth ?? {}), narrative: next },
                  }))}
                  onRemoveRow={(idx) => setEdits((p) => ({
                    ...p,
                    sourceOfWealth: { ...(p.sourceOfWealth ?? {}), items: items.filter((_, i) => i !== idx) },
                  }))}
                  onTakeover={() => takeoverItemized<SourceOfWealthRow>(
                    'sourceOfWealth',
                    'Source of Wealth',
                    'Source of Wealth',
                    'syg_sourceofwealths',
                    'syg_kycprofileid@odata.bind',
                    items,
                    buildSourceOfWealthRow,
                    (r) => r.syg_name ?? '(untitled)',
                    (() => {
                      const narrative = edits.sourceOfWealth?.narrative ?? payload.sourceOfWealth?.narrative;
                      return narrative !== undefined ? { syg_sourceofwealthdetails: narrative } : undefined;
                    })(),
                  )}
                  lastRunAt={statusBlob.sections.sourceOfWealth?.lastRunAt}
                  errorMsg={statusBlob.sections.sourceOfWealth?.errors?.[0]?.message}
                />
              </div>
            );
          })()}
          {typeof payload.digitalAssetHoldingsNarrative === 'string' && (
            <div id="section-digitalAssetHoldingsNarrative">
              <NarrativeSection
                title="Digital Asset Holdings Narrative"
                fieldLabel="Crypto Holdings Narrative"
                state={sectionState('digitalAssetHoldingsNarrative', true)}
                value={edits.digitalAssetHoldingsNarrative ?? payload.digitalAssetHoldingsNarrative}
                onChange={(next) => setEdits((p) => ({ ...p, digitalAssetHoldingsNarrative: next }))}
                onTakeover={() => takeoverNarrative('digitalAssetHoldingsNarrative', 'Crypto Holdings Narrative', 'syg_cryptoholdingsnarrative')}
                lastRunAt={statusBlob.sections.digitalAssetHoldingsNarrative?.lastRunAt}
                errorMsg={statusBlob.sections.digitalAssetHoldingsNarrative?.errors?.[0]?.message}
              />
            </div>
          )}
          {payload.detailedDAHoldings && (() => {
            const items = edits.detailedDAHoldings ?? payload.detailedDAHoldings;
            return (
              <div id="section-detailedDAHoldings">
                <DetailedDAHoldingsSection
                  payload={payload.detailedDAHoldings}
                  state={(edits.detailedDAHoldings !== undefined && statusBlob.sections.detailedDAHoldings?.state !== 'done')
                    ? 'edited'
                    : sectionState('detailedDAHoldings', true)}
                  itemsEdit={edits.detailedDAHoldings}
                  onRemoveRow={(idx) => setEdits((p) => ({
                    ...p,
                    detailedDAHoldings: items.filter((_, i) => i !== idx),
                  }))}
                  onTakeover={() => takeoverItemized<DigitalAssetHoldingRow>(
                    'detailedDAHoldings',
                    'Detailed DA Holdings',
                    'DA Holding',
                    'syg_digitalassetsholdings',
                    'syg_KYCProfileID@odata.bind',
                    items,
                    buildDigitalAssetHoldingRow,
                    (r) => r.syg_name ?? '(untitled)',
                  )}
                  lastRunAt={statusBlob.sections.detailedDAHoldings?.lastRunAt}
                  errorMsg={statusBlob.sections.detailedDAHoldings?.errors?.[0]?.message}
                />
              </div>
            );
          })()}

          {/* Expected Activity */}
          {typeof payload.transactionalBehaviour === 'string' && (
            <div id="section-transactionalBehaviour">
              <NarrativeSection
                title="Transactional Behaviour"
                fieldLabel="Narrative for Transactional Behaviour"
                state={sectionState('transactionalBehaviour', true)}
                value={edits.transactionalBehaviour ?? payload.transactionalBehaviour}
                onChange={(next) => setEdits((p) => ({ ...p, transactionalBehaviour: next }))}
                onTakeover={() => takeoverNarrative('transactionalBehaviour', 'Narrative for Transactional Behaviour', 'syg_narrativefortransactionalbehaviour')}
                lastRunAt={statusBlob.sections.transactionalBehaviour?.lastRunAt}
                errorMsg={statusBlob.sections.transactionalBehaviour?.errors?.[0]?.message}
              />
            </div>
          )}
          {payload.plannedFiatFunds && (() => {
            const items = edits.plannedFiatFunds ?? payload.plannedFiatFunds;
            return (
              <div id="section-plannedFiatFunds">
                <PlannedFiatFundsSection
                  payload={payload.plannedFiatFunds}
                  state={(edits.plannedFiatFunds !== undefined && statusBlob.sections.plannedFiatFunds?.state !== 'done')
                    ? 'edited'
                    : sectionState('plannedFiatFunds', true)}
                  itemsEdit={edits.plannedFiatFunds}
                  onRemoveRow={(idx) => setEdits((p) => ({
                    ...p,
                    plannedFiatFunds: items.filter((_, i) => i !== idx),
                  }))}
                  onTakeover={() => takeoverItemized<IncomingFiatFundRow>(
                    'plannedFiatFunds',
                    'Planned Fiat Funds',
                    'Fiat Fund',
                    'syg_incomingfiatfundses',
                    'syg_kycprofileid@odata.bind',
                    items,
                    buildIncomingFiatFundRow,
                    (r) => r.syg_name ?? '(untitled)',
                  )}
                  lastRunAt={statusBlob.sections.plannedFiatFunds?.lastRunAt}
                  errorMsg={statusBlob.sections.plannedFiatFunds?.errors?.[0]?.message}
                />
              </div>
            );
          })()}
          {payload.plannedDAFunds && (() => {
            const items = edits.plannedDAFunds ?? payload.plannedDAFunds;
            return (
              <div id="section-plannedDAFunds">
                <PlannedDAFundsSection
                  payload={payload.plannedDAFunds}
                  state={(edits.plannedDAFunds !== undefined && statusBlob.sections.plannedDAFunds?.state !== 'done')
                    ? 'edited'
                    : sectionState('plannedDAFunds', true)}
                  itemsEdit={edits.plannedDAFunds}
                  onRemoveRow={(idx) => setEdits((p) => ({
                    ...p,
                    plannedDAFunds: items.filter((_, i) => i !== idx),
                  }))}
                  onTakeover={() => takeoverItemized<DigitalAssetFundRow>(
                    'plannedDAFunds',
                    'Planned DA Funds',
                    'DA Fund',
                    'syg_digitalassetfundses',
                    'syg_kycprofileid@odata.bind',
                    items,
                    buildDigitalAssetFundRow,
                    (r) => r.syg_name ?? '(untitled)',
                  )}
                  lastRunAt={statusBlob.sections.plannedDAFunds?.lastRunAt}
                  errorMsg={statusBlob.sections.plannedDAFunds?.errors?.[0]?.message}
                />
              </div>
            );
          })()}

          {/* Compliance & Other */}
          {payload.pepSanctionsRisk && (
            <div id="section-pepSanctionsRisk">
              <PepSanctionsRiskSection
                payload={payload.pepSanctionsRisk}
                state={sectionState('pepSanctionsRisk', true)}
                edits={edits.pepSanctionsRisk ?? {}}
                onEdit={(key, value) => setEdits((p) => ({ ...p, pepSanctionsRisk: { ...(p.pepSanctionsRisk ?? {}), [key as string]: value } }))}
                onTakeover={() => takeoverFieldSet('pepSanctionsRisk', 'PEP, Adverse Media and Sanctions', buildPepSanctionsRiskPatch())}
                lastRunAt={statusBlob.sections.pepSanctionsRisk?.lastRunAt}
                errorMsg={statusBlob.sections.pepSanctionsRisk?.errors?.[0]?.message}
              />
            </div>
          )}
          {typeof payload.additionalComments === 'string' && (
            <div id="section-additionalComments">
              <NarrativeSection
                title="Additional Comments"
                fieldLabel="Additional Comments"
                state={sectionState('additionalComments', true)}
                value={edits.additionalComments ?? payload.additionalComments}
                onChange={(next) => setEdits((p) => ({ ...p, additionalComments: next }))}
                onTakeover={() => takeoverNarrative('additionalComments', 'Additional Comments', 'syg_additionalcomments_clientservices')}
                lastRunAt={statusBlob.sections.additionalComments?.lastRunAt}
                errorMsg={statusBlob.sections.additionalComments?.errors?.[0]?.message}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

// === helpers ===============================================================

function originalNarrativeValue(payload: KycPayload, id: SectionId): string | undefined {
  switch (id) {
    case 'professionalExperience':         return payload.professionalExperience?.syg_ProfessionalExperienceSummary;
    case 'financialSituationNarrative':    return payload.financialSituationNarrative;
    case 'digitalAssetHoldingsNarrative':  return payload.digitalAssetHoldingsNarrative;
    case 'transactionalBehaviour':         return payload.transactionalBehaviour;
    case 'additionalComments':             return payload.additionalComments;
    default:                                return undefined;
  }
}

function mostRecentLastRun(blob: TakeoverStatusBlob): string | undefined {
  let latest: string | undefined = undefined;
  for (const s of Object.values(blob.sections)) {
    const ts = s?.lastRunAt;
    if (typeof ts === 'string' && (!latest || ts > latest)) latest = ts;
  }
  return latest;
}

// Trims raw OData error bodies into something readable on a section header.
// Strips the JSON wrapper / stack-trace and caps length so the "Last run"
// line stays single-line at typical viewport widths.
function shortenErrorMessage(raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0) return 'unknown';
  // Try to extract the OData "message" field
  const m = raw.match(/"message"\s*:\s*"([^"]+)"/);
  const msg = m ? m[1] : raw;
  return msg.length > 140 ? msg.slice(0, 137) + '…' : msg;
}
