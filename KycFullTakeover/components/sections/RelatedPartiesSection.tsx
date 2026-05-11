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
import { AutoTextarea } from '../common/AutoTextarea';
import { RelatedPartyRow, SectionState, PartyRef, CreateNewPartyRef, ExistingPartyRef, LookupRef } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

const YES_NO: Record<number, string> = { 1: 'Yes', 0: 'No' };

interface RelatedPartiesSectionProps {
  payload:           RelatedPartyRow[];
  state:             SectionState;
  narrativeEdit:     string | undefined;
  payloadNarrative:  string | undefined;
  itemsEdit:         RelatedPartyRow[] | undefined;
  onNarrativeChange: (next: string) => void;
  onRemoveRow:       (idx: number) => void;
  onUpdateRow:       (idx: number, field: keyof RelatedPartyRow, value: unknown) => void;
  onTakeover:        () => void;
  lastRunAt?:        string;
  errorMsg?:         string;
}

export const RelatedPartiesSection: React.FC<RelatedPartiesSectionProps> = ({
  payload, state, narrativeEdit, payloadNarrative, itemsEdit,
  onNarrativeChange, onRemoveRow, onUpdateRow, onTakeover, lastRunAt, errorMsg,
}) => {
  const narrativeValue = narrativeEdit ?? payloadNarrative ?? '';
  return (
    <ItemizedSection<RelatedPartyRow>
      title="Related Parties"
      items={itemsEdit ?? payload}
      rowConfig={(row, idx) => rowToCardConfig(row, idx, onUpdateRow)}
      state={state}
      onTakeover={onTakeover}
      onRemove={onRemoveRow}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      preListSlot={
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{
            display:      'block',
            fontSize:     typography.fontSizeLabel,
            color:        colors.textSecondary,
            marginBottom: spacing.xs,
          }}>Related Parties narrative (parent field)</label>
          <AutoTextarea
            value={narrativeValue}
            onChange={onNarrativeChange}
            minRows={3}
            ariaLabel="Related Parties narrative"
          />
        </div>
      }
    />
  );
};

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
    { kind: 'lookup',   label: 'Type',                           value: row.syg_relatedpartytypeid, entityTypes: ['syg_kycproperty'], onChange: u('syg_relatedpartytypeid') },
    { kind: 'text',     label: 'Display name',                   value: row.syg_name, onChange: u('syg_name') },
    { kind: 'lookup',   label: 'Nationality 1',                  value: row.syg_relatedpartynationality1id, entityTypes: ['new_country'], onChange: u('syg_relatedpartynationality1id') },
    { kind: 'lookup',   label: 'Nationality 2',                  value: row.syg_relatedpartynationality2id, entityTypes: ['new_country'], onChange: u('syg_relatedpartynationality2id') },
    { kind: 'lookup',   label: 'Nationality 3',                  value: row.syg_relatedpartynationality3id, entityTypes: ['new_country'], onChange: u('syg_relatedpartynationality3id') },
    { kind: 'lookup',   label: 'Domicile country',               value: row.syg_domicilecountryid, entityTypes: ['new_country'], onChange: u('syg_domicilecountryid') },
    { kind: 'lookup',   label: 'Main business activity',         value: row.syg_mainbusinessactivityid, entityTypes: ['syg_businessactivities'], onChange: u('syg_mainbusinessactivityid') },
    { kind: 'lookup',   label: 'Country of business activity',   value: row.syg_maincountryofbusinessactivityid, entityTypes: ['new_country'], onChange: u('syg_maincountryofbusinessactivityid') },
    { kind: 'picklist', label: 'PEP',
      value: row.syg_pep === true ? 1 : (row.syg_pep === false ? 0 : undefined),
      map:   YES_NO,
      onChange: (v) => onUpdate(idx, 'syg_pep', v === undefined ? undefined : v === 1) },
    { kind: 'lookup',   label: 'PEP status',                     value: row.syg_pepstatusid, entityTypes: ['syg_kycproperty'], onChange: u('syg_pepstatusid') },
    { kind: 'lookup',   label: 'PEP level',                      value: row.syg_peplevelid, entityTypes: ['syg_kycproperty'], onChange: u('syg_peplevelid') },
    { kind: 'longtext', label: 'Comment',                        value: row.syg_comment, onChange: u('syg_comment'), wide: true, minRows: 2 },
  ];

  return {
    title:    partyName || row.syg_name || '(untitled)',
    subtitle,
    details,
  };
}

// Re-exported for callers' type imports
export type { RelatedPartyRow, LookupRef };
