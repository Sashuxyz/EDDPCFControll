import * as React from 'react';
import { AllocationState, ASSET_CLASSES, REAL_ESTATE_INDEX } from '../types';
import { headroomFor, formatCHF, totalAllocated, parseCHFInput } from '../utils/allocationLogic';
import { AllocationBar } from './AllocationBar';
import { AssetRow } from './AssetRow';
import { UnallocatedRow } from './UnallocatedRow';
import { containerStyles, inputStyles, tableStyles, summaryStyles } from '../styles/tokens';

interface WealthAllocationControlProps {
  state: AllocationState;
  disabled: boolean;
  onTotalWealthChange: (value: number) => void;
  onSliderChange: (idx: number, value: number) => void;
  onFieldBlur: (idx: number, value: number) => void;
}

export const WealthAllocationControl: React.FC<WealthAllocationControlProps> = ({
  state,
  disabled,
  onTotalWealthChange,
  onSliderChange,
  onFieldBlur,
}) => {
  const [totalFocused, setTotalFocused] = React.useState(false);
  const [totalInput, setTotalInput] = React.useState(formatCHF(state.totalWealth));

  // Sync total from props when not focused
  React.useEffect(() => {
    if (!totalFocused) {
      setTotalInput(formatCHF(state.totalWealth));
    }
  }, [state.totalWealth, totalFocused]);

  const handleTotalChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalInput(e.target.value);
  }, []);

  const handleTotalFocus = React.useCallback(() => {
    setTotalFocused(true);
    // Show raw number for editing
    setTotalInput(state.totalWealth > 0 ? state.totalWealth.toString() : '');
  }, [state.totalWealth]);

  const handleTotalBlur = React.useCallback(() => {
    setTotalFocused(false);
    const parsed = parseCHFInput(totalInput);
    onTotalWealthChange(parsed);
  }, [totalInput, onTotalWealthChange]);

  const total = totalAllocated(state.vals);
  const unallocatedPct = Math.max(0, 100 - total);
  const realEstateCHF = (state.vals[REAL_ESTATE_INDEX] / 100) * state.totalWealth;
  const liquidAssets = state.totalWealth - realEstateCHF;

  const totalFieldStyle: React.CSSProperties = {
    ...inputStyles.field,
    ...(totalFocused ? inputStyles.fieldFocused : {}),
    ...(disabled ? inputStyles.fieldDisabled : {}),
  };

  return (
    <div style={containerStyles.root}>
      {/* Total Wealth Input */}
      <div style={inputStyles.totalRow}>
        <label style={inputStyles.totalLabel}>Total Wealth (CHF)</label>
        <input
          type="text"
          value={totalFocused ? totalInput : formatCHF(state.totalWealth)}
          disabled={disabled}
          onChange={handleTotalChange}
          onFocus={handleTotalFocus}
          onBlur={handleTotalBlur}
          style={totalFieldStyle}
        />
      </div>

      {/* Stacked Allocation Bar */}
      <AllocationBar vals={state.vals} totalWealth={state.totalWealth} />

      {/* Column Headers */}
      <div style={tableStyles.headerRow}>
        <div />
        <div style={tableStyles.headerCell}>Asset Class</div>
        <div style={tableStyles.headerCell}>Allocation</div>
        <div style={tableStyles.headerCellRight}>%</div>
        <div style={tableStyles.headerCellRight}>CHF Value</div>
      </div>

      {/* Asset Class Rows */}
      {ASSET_CLASSES.map((ac) => (
        <AssetRow
          key={ac.key}
          assetClass={ac}
          value={state.vals[ac.paramIndex]}
          headroom={headroomFor(ac.paramIndex, state.vals)}
          totalWealth={state.totalWealth}
          disabled={disabled}
          onSliderChange={onSliderChange}
          onFieldBlur={onFieldBlur}
        />
      ))}

      {/* Unallocated Row */}
      <UnallocatedRow unallocatedPct={unallocatedPct} totalWealth={state.totalWealth} />

      {/* Summary Footer */}
      <div style={summaryStyles.footer}>
        <div style={summaryStyles.row}>
          <span style={summaryStyles.label}>Total Assets</span>
          <span style={summaryStyles.value}>CHF {formatCHF(state.totalWealth)}</span>
        </div>
        <div style={summaryStyles.row}>
          <span style={summaryStyles.label}>Liquid Assets</span>
          <span style={summaryStyles.value}>CHF {formatCHF(liquidAssets)}</span>
        </div>
      </div>
    </div>
  );
};
