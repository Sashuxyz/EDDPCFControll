// components/sections/PlannedFiatFundsSection.tsx
// Planned Fiat Funds — itemized. Each row is an upcoming inbound fiat
// transfer from the client.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { IncomingFiatFundRow, LookupRef, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME } from '../../utils/optionSets';
import { formatSwissNumber } from '../../utils/formatters';

// Yes/No picklist for proof of ownership (Boolean field rendered via picklist UI).
const YES_NO: Record<number, string> = { 1: 'Yes', 0: 'No' };

interface PlannedFiatFundsSectionProps {
  payload:     IncomingFiatFundRow[];
  state:       SectionState;
  itemsEdit:   IncomingFiatFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onUpdateRow: (idx: number, field: keyof IncomingFiatFundRow, value: unknown) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedFiatFundsSection: React.FC<PlannedFiatFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onUpdateRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<IncomingFiatFundRow>
    title="Planned Fiat Funds"
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
  row: IncomingFiatFundRow,
  idx: number,
  onUpdate: (idx: number, field: keyof IncomingFiatFundRow, value: unknown) => void,
) {
  const subtitle = [
    row.syg_amount !== undefined ? `CHF ${formatSwissNumber(row.syg_amount)}` : '',
    row.syg_bank,
  ].filter(Boolean).join(' • ');

  const u = <K extends keyof IncomingFiatFundRow>(field: K) =>
    (value: IncomingFiatFundRow[K] | undefined) => onUpdate(idx, field, value);

  const details: ItemizedCardDetail[] = [
    { kind: 'money',    label: 'Amount (CHF)',         value: row.syg_amount, onChange: u('syg_amount') },
    { kind: 'text',     label: 'Bank',                 value: row.syg_bank, onChange: u('syg_bank') },
    { kind: 'lookup',   label: 'Bank domicile',        value: row.syg_bankdomicileid, entityTypes: ['new_country'], onChange: u('syg_bankdomicileid') },
    { kind: 'lookup',   label: 'Client',               value: row.syg_clientid, entityTypes: ['account', 'contact'],
      onChange: (next: LookupRef | undefined) => onUpdate(idx, 'syg_clientid', next) },
    { kind: 'picklist', label: 'Proof of ownership',
      value: row.syg_proofofownership === true ? 1 : (row.syg_proofofownership === false ? 0 : undefined),
      map: YES_NO,
      onChange: (v) => onUpdate(idx, 'syg_proofofownership', v === undefined ? undefined : v === 1) },
    { kind: 'picklist', label: 'Transfer timeframe',   value: row.syg_transfertimeframe, map: TRANSFER_TIMEFRAME, onChange: u('syg_transfertimeframe') },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
