// components/sections/PlannedFiatFundsSection.tsx
// Planned Fiat Funds — itemized. Each row is an upcoming inbound fiat
// transfer from the client.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { IncomingFiatFundRow, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber } from '../../utils/formatters';

interface PlannedFiatFundsSectionProps {
  payload:     IncomingFiatFundRow[];
  state:       SectionState;
  itemsEdit:   IncomingFiatFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedFiatFundsSection: React.FC<PlannedFiatFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<IncomingFiatFundRow>
    title="Planned Fiat Funds"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: IncomingFiatFundRow) {
  const subtitle = [
    row.syg_amount !== undefined ? `CHF ${formatSwissNumber(row.syg_amount)}` : '',
    row.syg_bank,
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Amount (CHF)',     value: row.syg_amount !== undefined ? formatSwissNumber(row.syg_amount) : '' },
    { label: 'Bank',             value: row.syg_bank },
    { label: 'Bank domicile',    value: <LookupReadonly value={row.syg_bankdomicileid} /> },
    { label: 'Client',           value: <LookupReadonly value={row.syg_clientid} /> },
    { label: 'Proof of ownership', value: row.syg_proofofownership === true ? 'Yes' : (row.syg_proofofownership === false ? 'No' : '') },
    { label: 'Transfer timeframe', value: row.syg_transfertimeframe !== undefined ? getOptionLabel(TRANSFER_TIMEFRAME, row.syg_transfertimeframe) : '' },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
