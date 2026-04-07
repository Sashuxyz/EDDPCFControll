import * as React from 'react';
import { formatCHF } from '../utils/allocationLogic';
import { unallocatedStyles } from '../styles/tokens';

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
