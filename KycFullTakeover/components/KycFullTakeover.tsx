// Root component. Receives parsed payload + status blob from index.ts and
// orchestrates: TOC navigation, section rendering, takeover lifecycle.
// State is held here; index.ts owns the bound-field outputs.

import * as React from 'react';
import { HeaderStrip } from './HeaderStrip';
import { TocSidebar, TocEntry } from './TocSidebar';
import { FindingsSection } from './sections/FindingsSection';
import { ProposedEmailSection } from './sections/ProposedEmailSection';
import { NarrativeSection } from './sections/NarrativeSection';
import { PlaceholderSection } from './sections/PlaceholderSection';
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
// Phase 1: only narrative sections + email need editable state in the UI.
type EditState = Partial<Record<SectionId, string>>;

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
    if (edits[id] !== undefined && edits[id] !== originalNarrativeValue(payload, id)) return 'edited';
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
    const value = edits[id] ?? originalNarrativeValue(payload, id) ?? '';
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
          <div id="section-personalDetails">       <PlaceholderSection title="Personal Details"        milestone="M3" /></div>
          {payload.professionalExperience && (
            <div id="section-professionalExperience">
              <NarrativeSection
                title="Professional Experience"
                fieldLabel="Professional Experience Summary"
                state={sectionState('professionalExperience', true)}
                value={edits.professionalExperience ?? payload.professionalExperience.syg_ProfessionalExperienceSummary ?? ''}
                onChange={(next) => setEdits((p) => ({ ...p, professionalExperience: next }))}
                onTakeover={() => takeoverNarrative('professionalExperience', 'Professional Experience Summary', 'syg_ProfessionalExperienceSummary')}
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
                onTakeover={() => takeoverNarrative('financialSituationNarrative', 'Financial Situation Summary', 'syg_FinancialSituationSummary')}
                lastRunAt={statusBlob.sections.financialSituationNarrative?.lastRunAt}
                errorMsg={statusBlob.sections.financialSituationNarrative?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-totalWealthIncome">      <PlaceholderSection title="Total Wealth and Income" milestone="M3" /></div>
          <div id="section-sourceOfWealth">         <PlaceholderSection title="Source of Wealth"        milestone="M5" /></div>
          <div id="section-currentAssetAllocation"> <PlaceholderSection title="Current Asset Allocation" milestone="M3" /></div>
          {typeof payload.digitalAssetHoldingsNarrative === 'string' && (
            <div id="section-digitalAssetHoldingsNarrative">
              <NarrativeSection
                title="Digital Asset Holdings Narrative"
                fieldLabel="Crypto Holdings Narrative"
                state={sectionState('digitalAssetHoldingsNarrative', true)}
                value={edits.digitalAssetHoldingsNarrative ?? payload.digitalAssetHoldingsNarrative}
                onChange={(next) => setEdits((p) => ({ ...p, digitalAssetHoldingsNarrative: next }))}
                onTakeover={() => takeoverNarrative('digitalAssetHoldingsNarrative', 'Crypto Holdings Narrative', 'syg_CryptoHoldingsNarrative')}
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
                onTakeover={() => takeoverNarrative('transactionalBehaviour', 'Narrative for Transactional Behaviour', 'syg_NarrativeforTransactionalBehaviour')}
                lastRunAt={statusBlob.sections.transactionalBehaviour?.lastRunAt}
                errorMsg={statusBlob.sections.transactionalBehaviour?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-plannedFiatFunds"> <PlaceholderSection title="Planned Fiat Funds" milestone="M5" /></div>
          <div id="section-plannedDAFunds">   <PlaceholderSection title="Planned DA Funds"   milestone="M5" /></div>

          {/* Compliance & Other */}
          <div id="section-pepSanctionsRisk"> <PlaceholderSection title="PEP, Adverse Media and Sanctions" milestone="M3" /></div>
          {typeof payload.additionalComments === 'string' && (
            <div id="section-additionalComments">
              <NarrativeSection
                title="Additional Comments"
                fieldLabel="Additional Comments"
                state={sectionState('additionalComments', true)}
                value={edits.additionalComments ?? payload.additionalComments}
                onChange={(next) => setEdits((p) => ({ ...p, additionalComments: next }))}
                onTakeover={() => takeoverNarrative('additionalComments', 'Additional Comments', 'syg_AdditionalComments_clientservices')}
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
