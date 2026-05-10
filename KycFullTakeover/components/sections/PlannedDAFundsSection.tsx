// components/sections/PlannedDAFundsSection.tsx
// Planned Digital Asset Funds — itemized. Each row is an upcoming inbound
// DA transfer with first-transfer + current-value semantics.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetFundRow, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME } from '../../utils/optionSets';
import { formatSwissNumber } from '../../utils/formatters';

const YES_NO: Record<number, string> = { 1: 'Yes', 0: 'No' };

interface PlannedDAFundsSectionProps {
  payload:     DigitalAssetFundRow[];
  state:       SectionState;
  itemsEdit:   DigitalAssetFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onUpdateRow: (idx: number, field: keyof DigitalAssetFundRow, value: unknown) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedDAFundsSection: React.FC<PlannedDAFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onUpdateRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetFundRow>
    title="Planned DA Funds"
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
  row: DigitalAssetFundRow,
  idx: number,
  onUpdate: (idx: number, field: keyof DigitalAssetFundRow, value: unknown) => void,
) {
  const subtitle = [
    row.syg_firstdigitalassettransfertype?.name,
    row.syg_firstdigitalassettransferamount !== undefined ? String(row.syg_firstdigitalassettransferamount) : '',
    row.syg_firsttransferamount !== undefined ? `CHF ${formatSwissNumber(row.syg_firsttransferamount)}` : '',
  ].filter(Boolean).join(' • ');

  const u = <K extends keyof DigitalAssetFundRow>(field: K) =>
    (value: DigitalAssetFundRow[K] | undefined) => onUpdate(idx, field, value);

  const details: ItemizedCardDetail[] = [
    { kind: 'display',  label: 'Customer',                    value: <LookupReadonly value={row.syg_customerid} /> },
    { kind: 'display',  label: 'First transfer asset',        value: <LookupReadonly value={row.syg_firstdigitalassettransfertype} /> },
    { kind: 'number',   label: 'First DA transfer amount',    value: row.syg_firstdigitalassettransferamount, onChange: u('syg_firstdigitalassettransferamount') },
    { kind: 'money',    label: 'First transfer (CHF)',        value: row.syg_firsttransferamount, onChange: u('syg_firsttransferamount') },
    { kind: 'money',    label: 'Current value (CHF)',         value: row.syg_currentvaluechf, onChange: u('syg_currentvaluechf') },
    { kind: 'money',    label: 'Value (CHF)',                 value: row.syg_valuechf, onChange: u('syg_valuechf') },
    { kind: 'date',     label: 'Date of valuation',           value: row.syg_dateofvaluation, onChange: u('syg_dateofvaluation') },
    { kind: 'picklist', label: 'Proof of ownership',
      value: row.syg_proofofownership === true ? 1 : (row.syg_proofofownership === false ? 0 : undefined),
      map: YES_NO,
      onChange: (v) => onUpdate(idx, 'syg_proofofownership', v === undefined ? undefined : v === 1) },
    { kind: 'longtext', label: 'Sender wallet',               value: row.syg_senderwallet, onChange: u('syg_senderwallet'), wide: true },
    { kind: 'text',     label: 'Source',                      value: row.syg_source, onChange: u('syg_source') },
    { kind: 'picklist', label: 'Transfer timeframe',          value: row.syg_transfertimeframe, map: TRANSFER_TIMEFRAME, onChange: u('syg_transfertimeframe') },
    { kind: 'longtext', label: 'Remarks',                     value: row.syg_remarks, onChange: u('syg_remarks'), wide: true },
    { kind: 'longtext', label: 'Comment',                     value: row.syg_comment, onChange: u('syg_comment'), wide: true },
    { kind: 'longtext', label: 'Additional expected funding', value: row.syg_additionalexpectedfunding, onChange: u('syg_additionalexpectedfunding'), wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
