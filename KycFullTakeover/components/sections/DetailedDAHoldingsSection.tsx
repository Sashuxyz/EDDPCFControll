// components/sections/DetailedDAHoldingsSection.tsx
// Detailed Digital Asset Holdings — itemized only (no narrative).
// All non-lookup fields are editable; lookups stay read-only (Asset, Acquiring year).

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetHoldingRow, SectionState } from '../../types';
import { formatSwissNumber } from '../../utils/formatters';

interface DetailedDAHoldingsSectionProps {
  payload:      DigitalAssetHoldingRow[];
  state:        SectionState;
  itemsEdit:    DigitalAssetHoldingRow[] | undefined;
  onRemoveRow:  (idx: number) => void;
  onUpdateRow:  (idx: number, field: keyof DigitalAssetHoldingRow, value: unknown) => void;
  onTakeover:   () => void;
  lastRunAt?:   string;
  errorMsg?:    string;
}

export const DetailedDAHoldingsSection: React.FC<DetailedDAHoldingsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onUpdateRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetHoldingRow>
    title="Detailed DA Holdings"
    items={itemsEdit ?? payload}
    rowConfig={(row, idx) => rowToCardConfig(row, idx, onUpdateRow)}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(
  row: DigitalAssetHoldingRow,
  idx: number,
  onUpdate: (idx: number, field: keyof DigitalAssetHoldingRow, value: unknown) => void,
) {
  const subtitle = [
    row.syg_digitalassetid?.name,
    row.syg_amount !== undefined ? `${row.syg_amount}` : '',
    row.syg_currentvaluechf !== undefined ? `CHF ${formatSwissNumber(row.syg_currentvaluechf)}` : '',
  ].filter(Boolean).join(' • ');

  const u = <K extends keyof DigitalAssetHoldingRow>(field: K) =>
    (value: DigitalAssetHoldingRow[K] | undefined) => onUpdate(idx, field, value);

  const details: ItemizedCardDetail[] = [
    { kind: 'display',  label: 'Asset',                    value: <LookupReadonly value={row.syg_digitalassetid} /> },
    { kind: 'number',   label: 'Amount',                   value: row.syg_amount,             onChange: u('syg_amount') },
    { kind: 'money',    label: 'Current value (CHF)',      value: row.syg_currentvaluechf,    onChange: u('syg_currentvaluechf') },
    { kind: 'money',    label: 'Value (CHF)',              value: row.syg_valuechf,           onChange: u('syg_valuechf') },
    { kind: 'date',     label: 'Date of valuation',        value: row.syg_dateofvaluation,    onChange: u('syg_dateofvaluation') },
    { kind: 'display',  label: 'Acquiring year',           value: <LookupReadonly value={row.syg_acquiringyear} /> },
    { kind: 'text',     label: 'Acquiring place',          value: row.syg_acquiringplace,     onChange: u('syg_acquiringplace') },
    { kind: 'money',    label: 'Avg acquiring price',      value: row.syg_averageacquiringprice, onChange: u('syg_averageacquiringprice') },
    { kind: 'number',   label: 'Corroborated amount',      value: row.syg_corroboratedamount, onChange: u('syg_corroboratedamount') },
    { kind: 'money',    label: 'Corroborated value (CHF)', value: row.syg_corroboratedvalue,  onChange: u('syg_corroboratedvalue') },
    { kind: 'longtext', label: 'Current custody',          value: row.syg_currentcustody,     onChange: u('syg_currentcustody'), wide: true },
    { kind: 'longtext', label: 'Description',              value: row.syg_description,        onChange: u('syg_description'),    wide: true },
    { kind: 'longtext', label: 'Origin of funds',          value: row.syg_originoffunds,      onChange: u('syg_originoffunds'),  wide: true },
    { kind: 'longtext', label: 'Supporting documents',     value: row.syg_supportingdocuments, onChange: u('syg_supportingdocuments'), wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
