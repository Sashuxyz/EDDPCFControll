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
import { PersonalDetailsSection } from './sections/PersonalDetailsSection';
import { TotalWealthIncomeSection } from './sections/TotalWealthIncomeSection';
import { PepSanctionsRiskSection } from './sections/PepSanctionsRiskSection';
import { AssetAllocationSection } from './sections/AssetAllocationSection';
import {
  KycPayload, SectionId, SectionState, TakeoverStatusBlob, SectionStatusRecord,
} from '../types';
import { colors, spacing } from '../styles/tokens';
import { showConfirmation } from '../utils/confirmationDialog';
import { hashSlice, setSectionState } from '../utils/sectionStatus';
import { patchKycProfile } from '../utils/dataverse';
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
interface EditState {
  // Narrative sections (string values)
  professionalExperience?:        string;
  financialSituationNarrative?:   string;
  digitalAssetHoldingsNarrative?: string;
  transactionalBehaviour?:        string;
  additionalComments?:            string;
  // Field-set sections (typed sub-objects)
  personalDetails?: { syg_dateofbirth?: string | null; syg_uspersonstatus?: 1 | 2 | 3 | 4 | null };
  totalWealthIncome?: {
    syg_TotalWealth_currency?:           number | null;
    syg_TotalWealth?:                    number | null;
    syg_annualincome?:                   number | null;
    syg_TimeframeforWealthAccumulation?: number | null;
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
  currentAssetAllocation?: { totalWealth?: number | null; vals?: number[] };
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
        { id: 'personalDetails'        as SectionId, label: 'Personal Details',        state: sectionState('personalDetails',        !!payload.personalDetails) },
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
        { id: 'totalWealthIncome'             as SectionId, label: 'Total Wealth and Income',       state: sectionState('totalWealthIncome',             !!payload.totalWealthIncome) },
        { id: 'sourceOfWealth'                as SectionId, label: 'Source of Wealth',              state: sectionState('sourceOfWealth',                !!payload.sourceOfWealth) },
        { id: 'currentAssetAllocation'        as SectionId, label: 'Current Asset Allocation',     state: sectionState('currentAssetAllocation',        !!payload.currentAssetAllocation) },
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

  // === Patch-builder helpers ================================================

  const buildPersonalDetailsPatch = (): Record<string, unknown> => {
    if (!payload.personalDetails) return {};
    const p = payload.personalDetails;
    const e = edits.personalDetails ?? {};
    const out: Record<string, unknown> = {};
    if (p.syg_AccountHolderNationalityID?.id)    out['syg_accountholdernationalityid@odata.bind']    = `/syg_countries(${p.syg_AccountHolderNationalityID.id})`;
    if (p.syg_Nationality2ID?.id)                out['syg_nationality2id@odata.bind']                 = `/syg_countries(${p.syg_Nationality2ID.id})`;
    if (p.syg_accountholdernationality3id?.id)   out['syg_accountholdernationality3id@odata.bind']    = `/syg_countries(${p.syg_accountholdernationality3id.id})`;
    if (p.syg_AccountHolderDomicileID?.id)       out['syg_accountholderdomicileid@odata.bind']        = `/syg_countries(${p.syg_AccountHolderDomicileID.id})`;
    if (p.syg_AccountHolderCountryofBirthID?.id) out['syg_accountholdercountryofbirthid@odata.bind']  = `/syg_countries(${p.syg_AccountHolderCountryofBirthID.id})`;
    const dob = e.syg_dateofbirth ?? p.syg_dateofbirth;
    if (dob !== undefined && dob !== null) out['syg_dateofbirth'] = dob;
    const us = e.syg_uspersonstatus ?? p.syg_uspersonstatus;
    if (us !== undefined && us !== null) out['syg_uspersonstatus'] = us;
    return out;
  };

  const buildTotalWealthIncomePatch = (): Record<string, unknown> => {
    if (!payload.totalWealthIncome) return {};
    const p = payload.totalWealthIncome;
    const e = edits.totalWealthIncome ?? {};
    const out: Record<string, unknown> = {};
    const tw = e.syg_TotalWealth_currency ?? p.syg_TotalWealth_currency;
    if (tw !== undefined && tw !== null) out['syg_totalwealth_currency'] = tw;
    const twb = e.syg_TotalWealth ?? p.syg_TotalWealth;
    if (twb !== undefined && twb !== null) out['syg_totalwealth'] = twb;
    const ai = e.syg_annualincome ?? p.syg_annualincome;
    if (ai !== undefined && ai !== null) out['syg_annualincome'] = ai;
    const tf = e.syg_TimeframeforWealthAccumulation ?? p.syg_TimeframeforWealthAccumulation;
    if (tf !== undefined && tf !== null) out['syg_timeframeforwealthaccumulation'] = tf;
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
    return out;
  };

  const buildAssetAllocationPatch = (): Record<string, unknown> => {
    if (!payload.currentAssetAllocation) return {};
    const p = payload.currentAssetAllocation;
    const e = edits.currentAssetAllocation ?? {};
    const tw = e.totalWealth ?? p.syg_TotalWealth_currency;
    // vals indexed per ASSET_CLASSES paramIndex: 0=cash, 1=digitalAssets,
    // 2=equities, 3=fixedIncome, 4=commodities, 5=realEstate, 6=other
    const vals = e.vals ?? [
      p.syg_wealthdistribution_cash_dec         ?? 0,
      p.syg_wealthdistribution_digitalassets_dec ?? 0,
      p.syg_wealthdistribution_equities_dec     ?? 0,
      p.syg_wealthdistribution_fixedincome_dec  ?? 0,
      p.syg_wealthdistribution_commodities_dec  ?? 0,
      p.syg_wealthdistribution_realestate_dec   ?? 0,
      p.syg_wealthdistribution_other_dec        ?? 0,
    ];
    const out: Record<string, unknown> = {
      'syg_wealthdistribution_cash_dec':           vals[0],
      'syg_wealthdistribution_digitalassets_dec':  vals[1],
      'syg_wealthdistribution_equities_dec':       vals[2],
      'syg_wealthdistribution_fixedincome_dec':    vals[3],
      'syg_wealthdistribution_commodities_dec':    vals[4],
      'syg_wealthdistribution_realestate_dec':     vals[5],
      'syg_wealthdistribution_other_dec':          vals[6],
    };
    if (tw !== undefined && tw !== null) out['syg_totalwealth_currency'] = tw;
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

          {/* Client Background — Personal Details / BA / Countries / Related Parties = M3-M6 placeholders */}
          {payload.personalDetails && (
            <div id="section-personalDetails">
              <PersonalDetailsSection
                payload={payload.personalDetails}
                state={sectionState('personalDetails', true)}
                edits={edits.personalDetails ?? {}}
                onEditDate={(next) => setEdits((p) => ({ ...p, personalDetails: { ...(p.personalDetails ?? {}), syg_dateofbirth: next } }))}
                onEditUSPerson={(next) => setEdits((p) => ({ ...p, personalDetails: { ...(p.personalDetails ?? {}), syg_uspersonstatus: next as 1 | 2 | 3 | 4 | null } }))}
                onTakeover={() => takeoverFieldSet('personalDetails', 'Personal Details', buildPersonalDetailsPatch())}
                lastRunAt={statusBlob.sections.personalDetails?.lastRunAt}
                errorMsg={statusBlob.sections.personalDetails?.errors?.[0]?.message}
              />
            </div>
          )}
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
          <div id="section-businessActivities">    <PlaceholderSection title="Business Activities"     milestone="M4" /></div>
          <div id="section-countriesOfActivity">   <PlaceholderSection title="Countries of Activity"   milestone="M4" /></div>
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
          {payload.totalWealthIncome && (
            <div id="section-totalWealthIncome">
              <TotalWealthIncomeSection
                payload={payload.totalWealthIncome}
                state={sectionState('totalWealthIncome', true)}
                edits={edits.totalWealthIncome ?? {}}
                onEditMoney={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), syg_TotalWealth_currency: next } }))}
                onEditWealthBand={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), syg_TotalWealth: next } }))}
                onEditAnnualIncome={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), syg_annualincome: next } }))}
                onEditTimeframe={(next) => setEdits((p) => ({ ...p, totalWealthIncome: { ...(p.totalWealthIncome ?? {}), syg_TimeframeforWealthAccumulation: next } }))}
                onTakeover={() => takeoverFieldSet('totalWealthIncome', 'Total Wealth and Income', buildTotalWealthIncomePatch())}
                lastRunAt={statusBlob.sections.totalWealthIncome?.lastRunAt}
                errorMsg={statusBlob.sections.totalWealthIncome?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-sourceOfWealth">         <PlaceholderSection title="Source of Wealth"        milestone="M5" /></div>
          {payload.currentAssetAllocation && (
            <div id="section-currentAssetAllocation">
              <AssetAllocationSection
                payload={payload.currentAssetAllocation}
                state={sectionState('currentAssetAllocation', true)}
                edits={edits.currentAssetAllocation ?? {}}
                onEditTotalWealth={(next) => setEdits((p) => ({ ...p, currentAssetAllocation: { ...(p.currentAssetAllocation ?? {}), totalWealth: next } }))}
                onEditVals={(next) => setEdits((p) => ({ ...p, currentAssetAllocation: { ...(p.currentAssetAllocation ?? {}), vals: next } }))}
                onTakeover={() => takeoverFieldSet('currentAssetAllocation', 'Current Asset Allocation', buildAssetAllocationPatch())}
                lastRunAt={statusBlob.sections.currentAssetAllocation?.lastRunAt}
                errorMsg={statusBlob.sections.currentAssetAllocation?.errors?.[0]?.message}
              />
            </div>
          )}
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
          <div id="section-detailedDAHoldings">    <PlaceholderSection title="Detailed DA Holdings" milestone="M5" /></div>

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
          <div id="section-plannedFiatFunds"> <PlaceholderSection title="Planned Fiat Funds" milestone="M5" /></div>
          <div id="section-plannedDAFunds">   <PlaceholderSection title="Planned DA Funds"   milestone="M5" /></div>

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
