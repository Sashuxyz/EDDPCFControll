// components/sections/TotalWealthIncomeSection.tsx
// Combined "Income, total wealth and asset allocation" section. Renders three
// banded/numeric fields (banded total wealth, annual income, timeframe), then
// an embedded WealthAllocation visualisation that owns the CHF total + 7
// allocation percentages. Single takeover button writes everything in one
// PATCH (the parent KYC profile).

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { WealthAllocation } from '../wealth-allocation/WealthAllocation';
import { AllocationState } from '../wealth-allocation/types';
import {
  TotalWealthIncomeSection as TotalWealthPayload,
  AssetAllocationSection as AssetAllocationPayload,
  SectionState,
} from '../../types';
import { colors, typography, spacing, inputStyle } from '../../styles/tokens';

interface TotalWealthIncomeSectionProps {
  payload:    TotalWealthPayload;
  // Asset allocation slice — drives the embedded WealthAllocation component.
  assetPayload?: AssetAllocationPayload;
  state:      SectionState;
  edits: {
    syg_TimeframeforWealthAccumulation?: number | null;
    // Asset allocation
    totalWealth?: number | null;       // syg_TotalWealth_currency
    vals?:        number[];            // 7 _dec percentages
  };
  onEditTimeframe:     (next: number | null) => void;
  onEditTotalWealth:   (next: number) => void;
  onEditVals:          (next: number[]) => void;
  onTakeover:          () => void;
  lastRunAt?:          string;
  errorMsg?:           string;
}

export const TotalWealthIncomeSection: React.FC<TotalWealthIncomeSectionProps> = ({
  payload, assetPayload, state, edits,
  onEditTimeframe, onEditTotalWealth, onEditVals,
  onTakeover, lastRunAt, errorMsg,
}) => {
  const fieldCount = countFields(payload, assetPayload, edits);
  const [tfFocused, setTfFocused] = React.useState(false);
  const tfValue = edits.syg_TimeframeforWealthAccumulation ?? payload.syg_TimeframeforWealthAccumulation ?? null;

  const allocationState: AllocationState = {
    totalWealth: edits.totalWealth ?? assetPayload?.syg_TotalWealth_currency ?? 0,
    vals:        edits.vals ?? payloadToVals(assetPayload),
  };

  return (
    <SectionFrame
      title="Income, total wealth and asset allocation"
      state={state}
      count={fieldCount}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      <div style={gridStyle}>
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

      {assetPayload && (
        <div style={{ marginTop: spacing.lg, paddingTop: spacing.lg, borderTop: `1px solid ${colors.borderSubtle}` }}>
          <div style={{
            fontSize:    typography.fontSizeLabel,
            fontWeight:  typography.fontWeightBold,
            color:       colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: spacing.md,
          }}>Asset allocation</div>
          <WealthAllocation
            state={allocationState}
            disabled={false}
            onTotalWealthChange={onEditTotalWealth}
            onSliderChange={(idx, value) => {
              const next = [...allocationState.vals];
              next[idx] = value;
              onEditVals(next);
            }}
            onFieldBlur={(idx, value) => {
              const next = [...allocationState.vals];
              next[idx] = value;
              onEditVals(next);
            }}
          />
        </div>
      )}
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

function payloadToVals(p: AssetAllocationPayload | undefined): number[] {
  if (!p) return [0, 0, 0, 0, 0, 0, 0];
  return [
    p.syg_wealthdistribution_cash_dec         ?? 0,  // 0 cash
    p.syg_wealthdistribution_digitalassets_dec ?? 0, // 1 digitalAssets
    p.syg_wealthdistribution_equities_dec     ?? 0,  // 2 equities
    p.syg_wealthdistribution_fixedincome_dec  ?? 0,  // 3 fixedIncome
    p.syg_wealthdistribution_commodities_dec  ?? 0,  // 4 commodities
    p.syg_wealthdistribution_realestate_dec   ?? 0,  // 5 realEstate
    p.syg_wealthdistribution_other_dec        ?? 0,  // 6 other
  ];
}

function countFields(
  payload: TotalWealthPayload,
  assetPayload: AssetAllocationPayload | undefined,
  edits: TotalWealthIncomeSectionProps['edits'],
): number {
  let n = 0;
  const tf = edits.syg_TimeframeforWealthAccumulation ?? payload.syg_TimeframeforWealthAccumulation;
  if (tf !== undefined && tf !== null) n++;
  const tw = edits.totalWealth ?? assetPayload?.syg_TotalWealth_currency;
  if (tw !== undefined && tw !== null) n++;
  const a = edits.vals ?? payloadToVals(assetPayload);
  for (const v of a) if (v !== 0) n++;
  return n;
}
