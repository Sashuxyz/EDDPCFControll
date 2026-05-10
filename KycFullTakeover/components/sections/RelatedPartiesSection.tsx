// components/sections/RelatedPartiesSection.tsx
// Related Parties — itemized + can create new contacts/accounts at takeover.
//
// Each row may reference an existing party (ExistingPartyRef) or a brand-new
// contact/account that doesn't exist yet (CreateNewPartyRef). The card displays
// the party with a "(new)" tag for createNew refs so the RM can see at a glance
// which rows will create new Dataverse records on takeover.
//
// Lookups in itemized rows stay read-only (LookupReadonly). Editable fields are
// limited to:
//   syg_name (text), syg_pep (Yes/No picklist), syg_riskscore (number),
//   syg_relatedcountries (text)
// All other lookup fields (party type, nationalities, domicile, business
// activity, country) come from the agent and the RM can adjust by deleting
// the row and editing on the underlying record after creation.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { RelatedPartyRow, SectionState, PartyRef, CreateNewPartyRef, ExistingPartyRef, LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';

const YES_NO: Record<number, string> = { 1: 'Yes', 0: 'No' };

interface RelatedPartiesSectionProps {
  payload:     RelatedPartyRow[];
  state:       SectionState;
  itemsEdit:   RelatedPartyRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onUpdateRow: (idx: number, field: keyof RelatedPartyRow, value: unknown) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const RelatedPartiesSection: React.FC<RelatedPartiesSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onUpdateRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<RelatedPartyRow>
    title="Related Parties"
    items={itemsEdit ?? payload}
    rowConfig={(row, idx) => rowToCardConfig(row, idx, onUpdateRow)}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function isCreateNew(ref: PartyRef): ref is CreateNewPartyRef {
  return 'createNew' in ref;
}
function isExisting(ref: PartyRef): ref is ExistingPartyRef {
  return 'id' in ref && typeof (ref as ExistingPartyRef).id === 'string';
}

function PartyDisplay({ party }: { party: PartyRef }): React.ReactElement {
  const isNew = isCreateNew(party);
  const name  = isNew ? party.name : (isExisting(party) ? party.name : '(unknown)');
  const etn   = party.etn;
  return (
    <div style={{
      background:    colors.inputBg,
      borderBottom:  '2px solid transparent',
      borderRadius:  4,
      padding:       '6px 10px',
      fontFamily:    typography.fontFamily,
      fontSize:      typography.fontSizeBody,
      color:         colors.textPrimary,
      width:         '100%',
      minHeight:     30,
      lineHeight:    '20px',
      display:       'flex',
      alignItems:    'center',
      gap:           8,
      boxSizing:     'border-box',
    }}>
      <span>{name}</span>
      <span style={{
        fontSize:  typography.fontSizeLabel,
        padding:   '1px 6px',
        borderRadius: 3,
        background: isNew ? '#FFF4CE' : colors.inputBg,
        color:      isNew ? '#835B00' : colors.textSecondary,
        border:     isNew ? '1px solid #f0d27a' : `1px solid ${colors.borderStandard}`,
        fontWeight: 500,
      }}>
        {isNew ? `new ${etn}` : etn}
      </span>
    </div>
  );
}

function rowToCardConfig(
  row: RelatedPartyRow,
  idx: number,
  onUpdate: (idx: number, field: keyof RelatedPartyRow, value: unknown) => void,
) {
  const partyName = isCreateNew(row.syg_relatedpartyid)
    ? row.syg_relatedpartyid.name
    : (isExisting(row.syg_relatedpartyid) ? row.syg_relatedpartyid.name : '');
  const tag = row.syg_relatedpartytypeid?.name ?? '';
  const nationality = row.syg_relatedpartynationality1id?.name ?? '';
  const subtitle = [tag, nationality].filter(Boolean).join(' • ');

  const u = <K extends keyof RelatedPartyRow>(field: K) =>
    (value: RelatedPartyRow[K] | undefined) => onUpdate(idx, field, value);

  const details: ItemizedCardDetail[] = [
    { kind: 'display',  label: 'Related party',                  value: <PartyDisplay party={row.syg_relatedpartyid} /> },
    { kind: 'display',  label: 'Type',                           value: <LookupReadonly value={row.syg_relatedpartytypeid} /> },
    { kind: 'text',     label: 'Display name',                   value: row.syg_name, onChange: u('syg_name') },
    { kind: 'display',  label: 'Nationality 1',                  value: <LookupReadonly value={row.syg_relatedpartynationality1id} /> },
    { kind: 'display',  label: 'Nationality 2',                  value: <LookupReadonly value={row.syg_relatedpartynationality2id} /> },
    { kind: 'display',  label: 'Nationality 3',                  value: <LookupReadonly value={row.syg_relatedpartynationality3id} /> },
    { kind: 'display',  label: 'Domicile country',               value: <LookupReadonly value={row.syg_domicilecountryid} /> },
    { kind: 'display',  label: 'Main business activity',         value: <LookupReadonly value={row.syg_mainbusinessactivityid} /> },
    { kind: 'display',  label: 'Country of business activity',   value: <LookupReadonly value={row.syg_maincountryofbusinessactivityid} /> },
    { kind: 'text',     label: 'Related countries',              value: row.syg_relatedcountries, onChange: u('syg_relatedcountries'), wide: true },
    { kind: 'picklist', label: 'PEP',
      value: row.syg_pep === true ? 1 : (row.syg_pep === false ? 0 : undefined),
      map:   YES_NO,
      onChange: (v) => onUpdate(idx, 'syg_pep', v === undefined ? undefined : v === 1) },
    { kind: 'display',  label: 'PEP status',                     value: <LookupReadonly value={row.syg_pepstatusid} /> },
    { kind: 'display',  label: 'PEP level',                      value: <LookupReadonly value={row.syg_peplevelid} /> },
    { kind: 'number',   label: 'Risk score',                     value: row.syg_riskscore, onChange: u('syg_riskscore') },
  ];

  return {
    title:    partyName || row.syg_name || '(untitled)',
    subtitle,
    details,
  };
}

// Re-exported for callers' type imports
export type { RelatedPartyRow, LookupRef };
