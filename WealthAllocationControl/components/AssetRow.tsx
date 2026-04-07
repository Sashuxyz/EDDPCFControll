import * as React from 'react';
import { AssetClass } from '../types';
import { formatCHF } from '../utils/allocationLogic';
import { tableStyles, inputStyles } from '../styles/tokens';

interface AssetRowProps {
  assetClass: AssetClass;
  value: number;
  headroom: number;
  totalWealth: number;
  disabled: boolean;
  onSliderChange: (idx: number, value: number) => void;
  onFieldBlur: (idx: number, value: number) => void;
}

export const AssetRow: React.FC<AssetRowProps> = ({
  assetClass,
  value,
  headroom,
  totalWealth,
  disabled,
  onSliderChange,
  onFieldBlur,
}) => {
  const [localInput, setLocalInput] = React.useState(value.toFixed(2));
  const [isFocused, setIsFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync from props when not focused
  React.useEffect(() => {
    if (!isFocused) {
      setLocalInput(value.toFixed(2));
    }
  }, [value, isFocused]);

  const isOverHeadroom = isFocused && parseFloat(localInput) > headroom + value;
  const isZero = value === 0;
  const sliderDisabled = disabled || (isZero && headroom === 0);

  const handleSliderInput = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSliderChange(assetClass.paramIndex, parseFloat(e.target.value));
    },
    [onSliderChange, assetClass.paramIndex]
  );

  const handleFieldChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalInput(e.target.value);
    },
    []
  );

  const handleFieldFocus = React.useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleFieldBlur = React.useCallback(() => {
    setIsFocused(false);
    const parsed = parseFloat(localInput);
    if (!isNaN(parsed)) {
      onFieldBlur(assetClass.paramIndex, parsed);
    }
  }, [localInput, onFieldBlur, assetClass.paramIndex]);

  const chfValue = (value / 100) * totalWealth;
  const fillPct = Math.min(value, 100);

  const rowStyle: React.CSSProperties = {
    ...tableStyles.row,
    ...(isZero && !isFocused ? tableStyles.rowZero : {}),
  };

  // Percent input style
  let pctStyle: React.CSSProperties = { ...inputStyles.percentField };
  if (isFocused) {
    pctStyle = { ...pctStyle, ...inputStyles.fieldFocused };
  }
  if (isOverHeadroom) {
    pctStyle = { ...pctStyle, ...inputStyles.fieldError };
  }
  if (disabled) {
    pctStyle = { ...pctStyle, ...inputStyles.fieldDisabled };
  }

  // Slider track gradient
  const sliderBg = `linear-gradient(to right, ${assetClass.color} ${fillPct}%, #E1DFDD ${fillPct}%)`;

  return (
    <div style={rowStyle}>
      <div style={{ ...tableStyles.dot, background: assetClass.color }} />
      <div style={tableStyles.label}>{assetClass.label}</div>
      <div style={{ position: 'relative', height: '20px' }}>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={value}
          disabled={sliderDisabled}
          onChange={handleSliderInput}
          style={{
            width: '100%',
            height: '4px',
            WebkitAppearance: 'none',
            appearance: 'none' as React.CSSProperties['appearance'],
            background: sliderBg,
            borderRadius: '2px',
            outline: 'none',
            cursor: sliderDisabled ? 'default' : 'pointer',
            margin: 0,
            position: 'absolute',
            top: '8px',
            opacity: sliderDisabled ? 0.4 : 1,
          }}
        />
      </div>
      <div>
        <input
          ref={inputRef}
          type="text"
          value={isFocused ? localInput : value.toFixed(2)}
          disabled={disabled}
          onChange={handleFieldChange}
          onFocus={handleFieldFocus}
          onBlur={handleFieldBlur}
          style={pctStyle}
        />
        <span style={inputStyles.percentSuffix}>%</span>
      </div>
      <div style={tableStyles.chfValue}>{formatCHF(chfValue)}</div>
    </div>
  );
};
