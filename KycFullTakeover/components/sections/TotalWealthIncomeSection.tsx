// components/sections/TotalWealthIncomeSection.tsx
// Field-set section with one MoneyInput, two OptionSet selects (banded
// total wealth + annual income), and one integer input (timeframe in years).

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { MoneyInput } from '../common/MoneyInput';
import { OptionSetSelect } from '../common/OptionSetSelect';
import { TotalWealthIncomeSection as TotalWealthPayload, SectionState } from '../../types';
import { TOTAL_WEALTH_BAND, ANNUAL_INCOME } from '../../utils/optionSets';
import { colors, typography, spacing, inputStyle } from '../../styles/tokens';

interface TotalWealthIncomeSectionProps {
  payload:    TotalWealthPayload;
  state:      SectionState;
  edits: {
    syg_TotalWealth_currency?:           number | null;
    syg_TotalWealth?:                    number | null;
    syg_annualincome?:                   number | null;
    syg_TimeframeforWealthAccumulation?: number | null;
  };
  onEditMoney:    (next: number | null) => void;
  onEditWealthBand:  (next: number | null) => void;
  onEditAnnualIncome: (next: number | null) => void;
  onEditTimeframe: (next: number | null) => void;
  onTakeover: () => void;
  lastRunAt?: string;
  errorMsg?:  string;
}

export const TotalWealthIncomeSection: React.FC<TotalWealthIncomeSectionProps> = ({
  payload, state, edits, onEditMoney, onEditWealthBand, onEditAnnualIncome, onEditTimeframe,
  onTakeover, lastRunAt, errorMsg,
}) => {
  const fieldCount = countFields(payload, edits);
  const [tfFocused, setTfFocused] = React.useState(false);
  const tfValue = edits.syg_TimeframeforWealthAccumulation ?? payload.syg_TimeframeforWealthAccumulation ?? null;

  return (
    <SectionFrame
      title="Total Wealth and Income"
      state={state}
      count={fieldCount}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      <div style={gridStyle}>
        <Field label="Total wealth (CHF)">
          <MoneyInput
            value={edits.syg_TotalWealth_currency ?? payload.syg_TotalWealth_currency ?? null}
            onChange={onEditMoney}
            ariaLabel="Total wealth"
          />
        </Field>
        <Field label="Total wealth band">
          <OptionSetSelect
            map={TOTAL_WEALTH_BAND}
            value={edits.syg_TotalWealth ?? payload.syg_TotalWealth}
            onChange={onEditWealthBand}
            ariaLabel="Total wealth band"
            noneLabel="(not specified)"
          />
        </Field>
        <Field label="Annual income">
          <OptionSetSelect
            map={ANNUAL_INCOME}
            value={edits.syg_annualincome ?? payload.syg_annualincome}
            onChange={onEditAnnualIncome}
            ariaLabel="Annual income"
            noneLabel="(not specified)"
          />
        </Field>
        <Field label="Timeframe for wealth accumulation (years)">
          <input
            type="number"
            min={0}
            step={1}
            value={tfValue === null ? '' : String(tfValue)}
            onFocus={() => setTfFocused(true)}
            onBlur={()  => setTfFocused(false)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return onEditTimeframe(null);
              const parsed = Number(v);
              onEditTimeframe(Number.isFinite(parsed) ? parsed : null);
            }}
            style={inputStyle(tfFocused)}
            aria-label="Timeframe for wealth accumulation in years"
          />
        </Field>
      </div>
    </SectionFrame>
  );
};

const gridStyle: React.CSSProperties = {
  display:             'grid',
  gridTemplateColumns: '1fr 1fr',
  gap:                 spacing.md,
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</div>
    {children}
  </div>
);

function countFields(payload: TotalWealthPayload, edits: TotalWealthIncomeSectionProps['edits']): number {
  let n = 0;
  for (const key of ['syg_TotalWealth_currency', 'syg_TotalWealth', 'syg_annualincome', 'syg_TimeframeforWealthAccumulation'] as const) {
    const v = (edits[key] ?? (payload as Record<string, unknown>)[key]);
    if (v !== undefined && v !== null) n++;
  }
  return n;
}
