// components/sections/DetailedDAHoldingsSection.tsx
// Detailed Digital Asset Holdings — itemized only (no narrative).

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetHoldingRow, SectionState } from '../../types';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';

interface DetailedDAHoldingsSectionProps {
  payload:     DigitalAssetHoldingRow[];
  state:       SectionState;
  itemsEdit:   DigitalAssetHoldingRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const DetailedDAHoldingsSection: React.FC<DetailedDAHoldingsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetHoldingRow>
    title="Detailed DA Holdings"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: DigitalAssetHoldingRow) {
  const subtitle = [
    row.syg_digitalassetid?.name,
    row.syg_amount !== undefined ? `${row.syg_amount}` : '',
    row.syg_currentvaluechf !== undefined ? `CHF ${formatSwissNumber(row.syg_currentvaluechf)}` : '',
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Asset',                    value: <LookupReadonly value={row.syg_digitalassetid} /> },
    { label: 'Amount',                   value: row.syg_amount !== undefined ? String(row.syg_amount) : '' },
    { label: 'Current value (CHF)',      value: row.syg_currentvaluechf !== undefined ? formatSwissNumber(row.syg_currentvaluechf) : '' },
    { label: 'Value (CHF)',              value: row.syg_valuechf !== undefined ? formatSwissNumber(row.syg_valuechf) : '' },
    { label: 'Date of valuation',        value: row.syg_dateofvaluation ? formatSwissDate(row.syg_dateofvaluation) : '' },
    { label: 'Acquiring year',           value: <LookupReadonly value={row.syg_acquiringyear} /> },
    { label: 'Acquiring place',          value: row.syg_acquiringplace },
    { label: 'Avg acquiring price',      value: row.syg_averageacquiringprice !== undefined ? formatSwissNumber(row.syg_averageacquiringprice) : '' },
    { label: 'Corroborated amount',      value: row.syg_corroboratedamount !== undefined ? String(row.syg_corroboratedamount) : '' },
    { label: 'Corroborated value (CHF)', value: row.syg_corroboratedvalue !== undefined ? formatSwissNumber(row.syg_corroboratedvalue) : '' },
    { label: 'Current custody',          value: row.syg_currentcustody, wide: true },
    { label: 'Description',              value: row.syg_description, wide: true },
    { label: 'Origin of funds',          value: row.syg_originoffunds, wide: true },
    { label: 'Supporting documents',     value: row.syg_supportingdocuments, wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
