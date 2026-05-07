// components/sections/PepSanctionsRiskSection.tsx
// Single section with 3 visual sub-items (PEP / Adverse Media / Sanctions).
// One section-level Take over button writes all populated fields in one
// PATCH per spec resolution Q3.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { OptionSetSelect } from '../common/OptionSetSelect';
import { LookupReadonly } from '../common/LookupReadonly';
import { PepSanctionsRiskSection as PepPayload, SectionState } from '../../types';
import { PEP_STATUS, REPUTATIONAL_RISK, SANCTION_CHECK } from '../../utils/optionSets';
import { colors, typography, spacing, inputStyle } from '../../styles/tokens';

interface PepSanctionsRiskSectionProps {
  payload:     PepPayload;
  state:       SectionState;
  edits: Partial<{
    syg_PEP:                                       boolean | null;
    syg_pepstatus:                                 number | null;
    syg_pepdetails:                                string;
    syg_pepderivationdetails:                      string;
    syg_formerpepdetails:                          string;
    syg_ReputationalRisk:                          number | null;
    syg_mediascreeningandreputationalriskcomment:  string;
    syg_SanctionCheck:                             number | null;
    syg_sanctioncheckcomment:                      string;
  }>;
  onEdit:      <K extends keyof PepSanctionsRiskSectionProps['edits']>(key: K, value: PepSanctionsRiskSectionProps['edits'][K]) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PepSanctionsRiskSection: React.FC<PepSanctionsRiskSectionProps> = ({
  payload, state, edits, onEdit, onTakeover, lastRunAt, errorMsg,
}) => {
  const fieldCount = countFields(payload, edits);

  return (
    <SectionFrame
      title="PEP, Adverse Media and Sanctions"
      state={state}
      count={fieldCount}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      {/* PEP sub-item */}
      <SubHeader title="PEP" />
      <div style={gridStyle}>
        <Field label="PEP">
          <CheckboxRow
            checked={(edits.syg_PEP ?? payload.syg_PEP ?? false) as boolean}
            onChange={(c) => onEdit('syg_PEP', c)}
          />
        </Field>
        <Field label="PEP status">
          <OptionSetSelect
            map={PEP_STATUS}
            value={(edits.syg_pepstatus ?? payload.syg_pepstatus) as number | null | undefined}
            onChange={(v) => onEdit('syg_pepstatus', v as PepPayload['syg_pepstatus'])}
            noneLabel="(none)"
            ariaLabel="PEP status"
          />
        </Field>
        <Field label="PEP level">
          <LookupReadonly value={payload.syg_peplevelid} />
        </Field>
        <Field label="PEP details" wide>
          <Textarea
            value={(edits.syg_pepdetails ?? payload.syg_pepdetails) ?? ''}
            onChange={(s) => onEdit('syg_pepdetails', s)}
            rows={3}
          />
        </Field>
        <Field label="PEP derivation details" wide>
          <Textarea
            value={(edits.syg_pepderivationdetails ?? payload.syg_pepderivationdetails) ?? ''}
            onChange={(s) => onEdit('syg_pepderivationdetails', s)}
            rows={3}
          />
        </Field>
        <Field label="Former PEP details" wide>
          <Textarea
            value={(edits.syg_formerpepdetails ?? payload.syg_formerpepdetails) ?? ''}
            onChange={(s) => onEdit('syg_formerpepdetails', s)}
            rows={3}
          />
        </Field>
      </div>

      {/* Adverse Media sub-item */}
      <SubHeader title="Adverse Media" />
      <div style={gridStyle}>
        <Field label="Reputational risk">
          <OptionSetSelect
            map={REPUTATIONAL_RISK}
            value={(edits.syg_ReputationalRisk ?? payload.syg_ReputationalRisk) as number | null | undefined}
            onChange={(v) => onEdit('syg_ReputationalRisk', v as PepPayload['syg_ReputationalRisk'])}
            noneLabel="(not assessed)"
            ariaLabel="Reputational risk"
          />
        </Field>
        <div />
        <Field label="Media screening / reputational risk comment" wide>
          <Textarea
            value={(edits.syg_mediascreeningandreputationalriskcomment ?? payload.syg_mediascreeningandreputationalriskcomment) ?? ''}
            onChange={(s) => onEdit('syg_mediascreeningandreputationalriskcomment', s)}
            rows={4}
          />
        </Field>
      </div>

      {/* Sanctions sub-item */}
      <SubHeader title="Sanctions" />
      <div style={gridStyle}>
        <Field label="Sanction check">
          <OptionSetSelect
            map={SANCTION_CHECK}
            value={(edits.syg_SanctionCheck ?? payload.syg_SanctionCheck) as number | null | undefined}
            onChange={(v) => onEdit('syg_SanctionCheck', v as PepPayload['syg_SanctionCheck'])}
            noneLabel="(not run)"
            ariaLabel="Sanction check"
          />
        </Field>
        <div />
        <Field label="Sanction check comment" wide>
          <Textarea
            value={(edits.syg_sanctioncheckcomment ?? payload.syg_sanctioncheckcomment) ?? ''}
            onChange={(s) => onEdit('syg_sanctioncheckcomment', s)}
            rows={3}
          />
        </Field>
      </div>
    </SectionFrame>
  );
};

const gridStyle: React.CSSProperties = {
  display:             'grid',
  gridTemplateColumns: '1fr 1fr',
  gap:                 spacing.md,
  marginBottom:        spacing.lg,
};

const SubHeader: React.FC<{ title: string }> = ({ title }) => (
  <div style={{
    fontSize:      typography.fontSizeBody,
    fontWeight:    typography.fontWeightBold,
    color:         colors.brand,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom:  spacing.sm,
    marginTop:     spacing.sm,
    paddingBottom: spacing.xs,
    borderBottom:  `1px solid ${colors.borderSubtle}`,
  }}>{title}</div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <div style={{ gridColumn: wide ? '1 / span 2' : undefined }}>
    <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</div>
    {children}
  </div>
);

const CheckboxRow: React.FC<{ checked: boolean; onChange: (c: boolean) => void }> = ({ checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, fontFamily: typography.fontFamily, fontSize: typography.fontSizeBody }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {checked ? 'Yes' : 'No'}
  </label>
);

const Textarea: React.FC<{ value: string; onChange: (s: string) => void; rows: number }> = ({ value, onChange, rows }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      rows={rows}
      style={{
        ...inputStyle(focused),
        resize:    'vertical',
        minHeight: rows * 22,
      }}
    />
  );
};

function countFields(payload: PepPayload, edits: PepSanctionsRiskSectionProps['edits']): number {
  let n = 0;
  const keys: Array<keyof PepPayload> = [
    'syg_PEP', 'syg_pepstatus', 'syg_pepdetails', 'syg_pepderivationdetails', 'syg_formerpepdetails',
    'syg_ReputationalRisk', 'syg_mediascreeningandreputationalriskcomment',
    'syg_SanctionCheck', 'syg_sanctioncheckcomment',
  ];
  for (const k of keys) {
    const v = (edits as Record<string, unknown>)[k as string] ?? (payload as Record<string, unknown>)[k as string];
    if (v !== undefined && v !== null && v !== '') n++;
  }
  return n;
}
