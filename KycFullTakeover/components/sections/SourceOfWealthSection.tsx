// components/sections/SourceOfWealthSection.tsx
// Source of Wealth — itemized + narrative. The textarea writes to
// syg_sourceofwealthdetails on the parent profile; the cards each create a
// syg_sourceofwealth row. ONE takeover button does both writes.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { AutoTextarea } from '../common/AutoTextarea';
import { SourceOfWealthRow, SourceOfWealthSection as SoWPayload, SectionState } from '../../types';
import { SOURCE_OF_WEALTH, RELATIONSHIP_TO_COUNTERPARTY, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';
import { colors, typography, spacing } from '../../styles/tokens';

interface SourceOfWealthSectionProps {
  payload:        SoWPayload;
  state:          SectionState;
  narrativeEdit:  string | undefined;
  itemsEdit:      SourceOfWealthRow[] | undefined;
  onNarrativeChange: (next: string) => void;
  onRemoveRow:    (idx: number) => void;
  onTakeover:     () => void;
  lastRunAt?:     string;
  errorMsg?:      string;
}

export const SourceOfWealthSection: React.FC<SourceOfWealthSectionProps> = ({
  payload, state, narrativeEdit, itemsEdit, onNarrativeChange, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => {
  const items = itemsEdit ?? payload.items;
  const narrativeValue = narrativeEdit ?? payload.narrative ?? '';
  return (
    <ItemizedSection<SourceOfWealthRow>
      title="Source of Wealth"
      items={items}
      rowConfig={rowToCardConfig}
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

function rowToCardConfig(row: SourceOfWealthRow) {
  const amountSummary = row.syg_wealthgenerated
    ? `CHF ${formatSwissNumber(row.syg_wealthgenerated)}`
    : (row.syg_initialinvestment ? `CHF ${formatSwissNumber(row.syg_initialinvestment)}` : '');
  const categoryLabel = row.syg_sourceofwealth !== undefined ? getOptionLabel(SOURCE_OF_WEALTH, row.syg_sourceofwealth) : '';
  const subtitle = [categoryLabel, amountSummary].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Category',                 value: categoryLabel },
    { label: 'Description',              value: row.syg_description, wide: true },
    { label: 'Company',                  value: row.syg_companyname },
    { label: 'Counterparty',             value: row.syg_counterpartyname },
    { label: 'Relationship',             value: row.syg_relationshiptocounterparty !== undefined ? getOptionLabel(RELATIONSHIP_TO_COUNTERPARTY, row.syg_relationshiptocounterparty) : '' },
    { label: 'Business activity',        value: <LookupReadonly value={row.syg_businessactivityid} /> },
    { label: 'Country',                  value: <LookupReadonly value={row.syg_countryid} /> },
    { label: 'Year of generation',       value: <LookupReadonly value={row.syg_yearofwealthgenerationid} /> },
    { label: 'Year initiated',           value: <LookupReadonly value={row.syg_yearofwealthgenerationinitiatedid} /> },
    { label: 'Initial investment (CHF)', value: row.syg_initialinvestment !== undefined ? formatSwissNumber(row.syg_initialinvestment) : '' },
    { label: 'Wealth generated (CHF)',   value: row.syg_wealthgenerated !== undefined ? formatSwissNumber(row.syg_wealthgenerated) : '' },
    { label: 'Value at valuation date',  value: row.syg_valueatvaluationdate !== undefined ? formatSwissNumber(row.syg_valueatvaluationdate) : '' },
    { label: 'Valuation date',           value: row.syg_valuationdate ? formatSwissDate(row.syg_valuationdate) : '' },
    { label: 'Corroborated value',       value: row.syg_corroboratedvalue !== undefined ? formatSwissNumber(row.syg_corroboratedvalue) : '' },
    { label: 'Corroborated %',           value: row.syg_corroboratedpercentage !== undefined ? `${row.syg_corroboratedpercentage}%` : '' },
    { label: 'Rationale',                value: row.syg_rationale, wide: true },
    { label: 'Supporting information',   value: row.syg_supportinginformation, wide: true },
    { label: 'Additional details',       value: row.syg_additionaldetails, wide: true },
  ];

  return {
    title: row.syg_name ?? '(untitled)',
    subtitle,
    details,
  };
}
