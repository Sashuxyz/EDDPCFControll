// components/sections/PersonalDetailsSection.tsx
// Field-set section with 4 lookup fields (read-only in Phase 1), 1 date,
// 1 country lookup, and 1 OptionSet for US Person Status. The section's
// "Take over" button writes all populated fields in one PATCH.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { LookupReadonly } from '../common/LookupReadonly';
import { DateInput } from '../common/DateInput';
import { OptionSetSelect } from '../common/OptionSetSelect';
import { PersonalDetailsSection as PersonalDetailsPayload, SectionState, LookupRef } from '../../types';
import { US_PERSON_STATUS } from '../../utils/optionSets';
import { colors, typography, spacing } from '../../styles/tokens';

interface PersonalDetailsSectionProps {
  payload:      PersonalDetailsPayload;
  state:        SectionState;
  // Editable fields the section emits — only the OptionSet + date can change in
  // Phase 1; lookups stay as the agent's payload values.
  edits:        { syg_dateofbirth?: string | null; syg_uspersonstatus?: 1 | 2 | 3 | 4 | null };
  onEditDate:   (next: string | null) => void;
  onEditUSPerson: (next: number | null) => void;
  onTakeover:   () => void;
  lastRunAt?:   string;
  errorMsg?:    string;
}

export const PersonalDetailsSection: React.FC<PersonalDetailsSectionProps> = ({
  payload, state, edits, onEditDate, onEditUSPerson, onTakeover, lastRunAt, errorMsg,
}) => {
  const fieldCount = countWritableFields(payload, edits);
  return (
    <SectionFrame
      title="Personal Details"
      state={state}
      count={fieldCount}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      <div style={gridStyle}>
        <Field label="Nationality (1)"     ><LookupReadonly value={payload.syg_AccountHolderNationalityID} /></Field>
        <Field label="Nationality (2)"     ><LookupReadonly value={payload.syg_Nationality2ID} /></Field>
        <Field label="Nationality (3)"     ><LookupReadonly value={payload.syg_accountholdernationality3id} /></Field>
        <Field label="Domicile country"    ><LookupReadonly value={payload.syg_AccountHolderDomicileID} /></Field>
        <Field label="Country of birth"    ><LookupReadonly value={payload.syg_AccountHolderCountryofBirthID} /></Field>
        <Field label="Date of birth"       >
          <DateInput
            value={edits.syg_dateofbirth ?? payload.syg_dateofbirth ?? null}
            onChange={onEditDate}
            ariaLabel="Date of birth"
          />
        </Field>
        <Field label="US Person Status"    >
          <OptionSetSelect
            map={US_PERSON_STATUS}
            value={edits.syg_uspersonstatus ?? payload.syg_uspersonstatus}
            onChange={(v) => onEditUSPerson(v)}
            ariaLabel="US Person Status"
            noneLabel="(not specified)"
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
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</div>
    {children}
  </div>
);

function countWritableFields(payload: PersonalDetailsPayload, edits: PersonalDetailsSectionProps['edits']): number {
  let n = 0;
  if (payload.syg_AccountHolderNationalityID)    n++;
  if (payload.syg_Nationality2ID)                n++;
  if (payload.syg_accountholdernationality3id)   n++;
  if (payload.syg_AccountHolderDomicileID)       n++;
  if (payload.syg_AccountHolderCountryofBirthID) n++;
  if ((edits.syg_dateofbirth ?? payload.syg_dateofbirth) !== undefined && (edits.syg_dateofbirth ?? payload.syg_dateofbirth) !== null) n++;
  if ((edits.syg_uspersonstatus ?? payload.syg_uspersonstatus) !== undefined && (edits.syg_uspersonstatus ?? payload.syg_uspersonstatus) !== null) n++;
  return n;
}
