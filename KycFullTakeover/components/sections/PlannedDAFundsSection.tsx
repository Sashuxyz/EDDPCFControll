// components/sections/PlannedDAFundsSection.tsx
// Planned Digital Asset Funds — itemized. Each row is an upcoming inbound
// DA transfer with first-transfer + current-value semantics.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetFundRow, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';

interface PlannedDAFundsSectionProps {
  payload:     DigitalAssetFundRow[];
  state:       SectionState;
  itemsEdit:   DigitalAssetFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedDAFundsSection: React.FC<PlannedDAFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetFundRow>
    title="Planned DA Funds"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: DigitalAssetFundRow) {
  const subtitle = [
    row.syg_firstdigitalassettransfertype?.name,
    row.syg_firstdigitalassettransferamount !== undefined ? String(row.syg_firstdigitalassettransferamount) : '',
    row.syg_firsttransferamount !== undefined ? `CHF ${formatSwissNumber(row.syg_firsttransferamount)}` : '',
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Customer',                   value: <LookupReadonly value={row.syg_customerid} /> },
    { label: 'First transfer asset',       value: <LookupReadonly value={row.syg_firstdigitalassettransfertype} /> },
    { label: 'First DA transfer amount',   value: row.syg_firstdigitalassettransferamount !== undefined ? String(row.syg_firstdigitalassettransferamount) : '' },
    { label: 'First transfer (CHF)',       value: row.syg_firsttransferamount !== undefined ? formatSwissNumber(row.syg_firsttransferamount) : '' },
    { label: 'Current value (CHF)',        value: row.syg_currentvaluechf !== undefined ? formatSwissNumber(row.syg_currentvaluechf) : '' },
    { label: 'Value (CHF)',                value: row.syg_valuechf !== undefined ? formatSwissNumber(row.syg_valuechf) : '' },
    { label: 'Date of valuation',          value: row.syg_dateofvaluation ? formatSwissDate(row.syg_dateofvaluation) : '' },
    { label: 'Proof of ownership',         value: row.syg_proofofownership === true ? 'Yes' : (row.syg_proofofownership === false ? 'No' : '') },
    { label: 'Sender wallet',              value: row.syg_senderwallet, wide: true },
    { label: 'Source',                     value: row.syg_source },
    { label: 'Transfer timeframe',         value: row.syg_transfertimeframe !== undefined ? getOptionLabel(TRANSFER_TIMEFRAME, row.syg_transfertimeframe) : '' },
    { label: 'Remarks',                    value: row.syg_remarks, wide: true },
    { label: 'Comment',                    value: row.syg_comment, wide: true },
    { label: 'Additional expected funding', value: row.syg_additionalexpectedfunding, wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
