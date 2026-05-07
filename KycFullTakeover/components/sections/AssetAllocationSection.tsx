// components/sections/AssetAllocationSection.tsx
// Wraps the embedded WealthAllocation submodule in a SectionFrame with
// takeover semantics. Translates between the Dataverse payload (snake_case
// `_dec` percent fields + currency) and the component's vals[]/totalWealth
// shape, indexed by the paramIndex defined in wealth-allocation/types.ts.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { WealthAllocation } from '../wealth-allocation/WealthAllocation';
import { AllocationState } from '../wealth-allocation/types';
import { AssetAllocationSection as AssetAllocationPayload, SectionState } from '../../types';

interface AssetAllocationSectionProps {
  payload:           AssetAllocationPayload;
  state:             SectionState;
  edits:             { totalWealth?: number | null; vals?: number[] };
  onEditTotalWealth: (next: number) => void;
  onEditVals:        (next: number[]) => void;
  onTakeover:        () => void;
  lastRunAt?:        string;
  errorMsg?:         string;
}

export const AssetAllocationSection: React.FC<AssetAllocationSectionProps> = ({
  payload, state, edits, onEditTotalWealth, onEditVals, onTakeover, lastRunAt, errorMsg,
}) => {
  const allocationState: AllocationState = {
    totalWealth: edits.totalWealth ?? payload.syg_TotalWealth_currency ?? 0,
    vals:        edits.vals ?? payloadToVals(payload),
  };
  const fieldCount = countFields(allocationState);

  return (
    <SectionFrame
      title="Current Asset Allocation"
      state={state}
      count={fieldCount}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
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
    </SectionFrame>
  );
};

function payloadToVals(p: AssetAllocationPayload): number[] {
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

function countFields(s: AllocationState): number {
  let n = 0;
  if (s.totalWealth > 0) n++;
  for (const v of s.vals) if (v > 0) n++;
  return n;
}
