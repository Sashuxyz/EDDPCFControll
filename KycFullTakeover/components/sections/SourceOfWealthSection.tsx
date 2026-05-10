// components/sections/SourceOfWealthSection.tsx
// Source of Wealth — itemized + narrative. The textarea writes to
// syg_sourceofwealthdetails on the parent profile; the cards each create a
// syg_sourceofwealth row. ONE takeover button does both writes.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { AutoTextarea } from '../common/AutoTextarea';
import { SourceOfWealthRow, SourceOfWealthSection as SoWPayload, SectionState } from '../../types';
import { SOURCE_OF_WEALTH, RELATIONSHIP_TO_COUNTERPARTY } from '../../utils/optionSets';
import { formatSwissNumber } from '../../utils/formatters';
import { colors, typography, spacing } from '../../styles/tokens';

interface SourceOfWealthSectionProps {
  payload:           SoWPayload;
  state:             SectionState;
  narrativeEdit:     string | undefined;
  itemsEdit:         SourceOfWealthRow[] | undefined;
  onNarrativeChange: (next: string) => void;
  onRemoveRow:       (idx: number) => void;
  onUpdateRow:       (idx: number, field: keyof SourceOfWealthRow, value: unknown) => void;
  onTakeover:        () => void;
  lastRunAt?:        string;
  errorMsg?:         string;
}

export const SourceOfWealthSection: React.FC<SourceOfWealthSectionProps> = ({
  payload, state, narrativeEdit, itemsEdit, onNarrativeChange, onRemoveRow, onUpdateRow,
  onTakeover, lastRunAt, errorMsg,
}) => {
  const items = itemsEdit ?? payload.items;
  const narrativeValue = narrativeEdit ?? payload.narrative ?? '';
  return (
    <ItemizedSection<SourceOfWealthRow>
      title="Source of Wealth"
      items={items}
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
          }}>Source of Wealth narrative (parent field)</label>
          <AutoTextarea
            value={narrativeValue}
            onChange={onNarrativeChange}
            minRows={4}
            ariaLabel="Source of Wealth narrative"
          />
        </div>
      }
    />
  );
};

function rowToCardConfig(
  row: SourceOfWealthRow,
  idx: number,
  onUpdate: (idx: number, field: keyof SourceOfWealthRow, value: unknown) => void,
) {
  const amountSummary = row.syg_wealthgenerated
    ? `CHF ${formatSwissNumber(row.syg_wealthgenerated)}`
    : (row.syg_initialinvestment ? `CHF ${formatSwissNumber(row.syg_initialinvestment)}` : '');
  const categoryLabel = row.syg_sourceofwealth !== undefined
    ? (SOURCE_OF_WEALTH[row.syg_sourceofwealth] ?? '')
    : '';
  const subtitle = [categoryLabel, amountSummary].filter(Boolean).join(' • ');

  const u = <K extends keyof SourceOfWealthRow>(field: K) =>
    (value: SourceOfWealthRow[K] | undefined) => onUpdate(idx, field, value);

  const details: ItemizedCardDetail[] = [
    { kind: 'picklist', label: 'Category',                 value: row.syg_sourceofwealth, map: SOURCE_OF_WEALTH, onChange: u('syg_sourceofwealth') },
    { kind: 'longtext', label: 'Description',              value: row.syg_description, onChange: u('syg_description'), wide: true },
    { kind: 'text',     label: 'Company',                  value: row.syg_companyname, onChange: u('syg_companyname') },
    { kind: 'text',     label: 'Counterparty',             value: row.syg_counterpartyname, onChange: u('syg_counterpartyname') },
    { kind: 'picklist', label: 'Relationship',             value: row.syg_relationshiptocounterparty, map: RELATIONSHIP_TO_COUNTERPARTY, onChange: u('syg_relationshiptocounterparty') },
    { kind: 'lookup',   label: 'Business activity',        value: row.syg_businessactivityid, entityTypes: ['syg_businessactivities'], onChange: u('syg_businessactivityid') },
    { kind: 'lookup',   label: 'Country',                  value: row.syg_countryid, entityTypes: ['new_country'], onChange: u('syg_countryid') },
    { kind: 'lookup',   label: 'Year of generation',       value: row.syg_yearofwealthgenerationid, entityTypes: ['syg_year'], onChange: u('syg_yearofwealthgenerationid') },
    { kind: 'lookup',   label: 'Year initiated',           value: row.syg_yearofwealthgenerationinitiatedid, entityTypes: ['syg_year'], onChange: u('syg_yearofwealthgenerationinitiatedid') },
    { kind: 'money',    label: 'Initial investment (CHF)', value: row.syg_initialinvestment, onChange: u('syg_initialinvestment') },
    { kind: 'money',    label: 'Wealth generated (CHF)',   value: row.syg_wealthgenerated, onChange: u('syg_wealthgenerated') },
    { kind: 'money',    label: 'Value at valuation date',  value: row.syg_valueatvaluationdate, onChange: u('syg_valueatvaluationdate') },
    { kind: 'date',     label: 'Valuation date',           value: row.syg_valuationdate, onChange: u('syg_valuationdate') },
    { kind: 'money',    label: 'Corroborated value',       value: row.syg_corroboratedvalue, onChange: u('syg_corroboratedvalue') },
    { kind: 'number',   label: 'Corroborated %',           value: row.syg_corroboratedpercentage, onChange: u('syg_corroboratedpercentage') },
    { kind: 'longtext', label: 'Rationale',                value: row.syg_rationale, onChange: u('syg_rationale'), wide: true },
    { kind: 'longtext', label: 'Supporting information',   value: row.syg_supportinginformation, onChange: u('syg_supportinginformation'), wide: true },
    { kind: 'longtext', label: 'Additional details',       value: row.syg_additionaldetails, onChange: u('syg_additionaldetails'), wide: true },
  ];

  return {
    title: row.syg_name ?? '(untitled)',
    subtitle,
    details,
  };
}
