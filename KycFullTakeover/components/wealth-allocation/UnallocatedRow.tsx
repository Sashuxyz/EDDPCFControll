// MIRROR OF WealthAllocationControl/components/UnallocatedRow.tsx
// Refactor to a shared module if/when a third consumer needs this logic.
// Until then, fixes must be applied in both files. See:
// docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md (resolved Q1)

import * as React from 'react';
import { formatCHF } from './allocationLogic';
import { unallocatedStyles } from './tokens';

interface UnallocatedRowProps {
  unallocatedPct: number;
  totalWealth: number;
}

export const UnallocatedRow: React.FC<UnallocatedRowProps> = ({ unallocatedPct, totalWealth }) => {
  const chfValue = (unallocatedPct / 100) * totalWealth;

  return (
    <div style={unallocatedStyles.row}>
      <div style={unallocatedStyles.dot} />
      <div style={unallocatedStyles.label}>Unallocated</div>
      <div />
      <div style={unallocatedStyles.value}>{unallocatedPct.toFixed(2)}%</div>
      <div style={unallocatedStyles.value}>{formatCHF(chfValue)}</div>
    </div>
  );
};
