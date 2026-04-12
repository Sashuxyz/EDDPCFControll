import * as React from 'react';
import { AssetClass } from '../types';
import { formatCHF } from '../utils/allocationLogic';
import { tableStyles, inputStyles } from '../styles/tokens';

let sliderStyleInjected = false;
function injectSliderStyles(): void {
  if (sliderStyleInjected) return;
  const style = document.createElement('style');
  style.textContent = `
    .wac-slider {
      -webkit-appearance: none !important;
      appearance: none !important;
      height: 4px !important;
      border-radius: 2px !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
      max-height: 4px !important;
      box-sizing: content-box !important;
    }
    .wac-slider::-webkit-slider-thumb {
      -webkit-appearance: none !important;
      appearance: none !important;
      width: 12px !important;
      height: 12px !important;
      border-radius: 50% !important;
      background: var(--wac-color, #0078D4) !important;
      border: 2px solid #fff !important;
      box-shadow: 0 1px 4px rgba(0,0,0,.25) !important;
      cursor: pointer !important;
      margin-top: -4px !important;
    }
    .wac-slider::-moz-range-thumb {
      width: 12px !important;
      height: 12px !important;
      border-radius: 50% !important;
      background: var(--wac-color, #0078D4) !important;
      border: none !important;
      box-shadow: 0 1px 4px rgba(0,0,0,.25) !important;
      cursor: pointer !important;
    }
    .wac-slider::-webkit-slider-runnable-track {
      height: 4px !important;
      border-radius: 2px !important;
    }
    .wac-slider::-moz-range-track {
      height: 4px !important;
      border-radius: 2px !important;
      border: none !important;
    }
    .wac-slider:disabled::-webkit-slider-thumb {
      cursor: default !important;
      opacity: 0.4 !important;
    }
    .wac-slider:disabled::-moz-range-thumb {
      cursor: default !important;
      opacity: 0.4 !important;
    }
  `;
  document.head.appendChild(style);
  sliderStyleInjected = true;
}

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

  React.useEffect(() => { injectSliderStyles(); }, []);

  React.useEffect(() => {
    if (!isFocused) {
      setLocalInput(value.toFixed(2));
    }
  }, [value, isFocused]);

  const parsedLocal = parseFloat(localInput);
  const isOverHeadroom = isFocused && isFinite(parsedLocal) && parsedLocal > headroom + value;
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
    if (isFinite(parsed) && parsed >= 0) {
      onFieldBlur(assetClass.paramIndex, parsed);
    }
  }, [localInput, onFieldBlur, assetClass.paramIndex]);

  const chfValue = (value / 100) * totalWealth;
  const fillPct = Math.min(value, 100);

  const rowStyle: React.CSSProperties = {
    ...tableStyles.row,
    ...(isZero && !isFocused ? tableStyles.rowZero : {}),
  };

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

  const sliderBg = `linear-gradient(to right, ${assetClass.color} ${fillPct}%, #E1DFDD ${fillPct}%)`;

  return (
    <div style={rowStyle}>
      <div style={{ ...tableStyles.dot, background: assetClass.color }} />
      <div style={tableStyles.label}>{assetClass.label}</div>
      <div style={tableStyles.sliderCell}>
        <input
          type="range"
          min={0}
          max={100}
          step={0.5}
          value={value}
          disabled={sliderDisabled}
          onChange={handleSliderInput}
          className="wac-slider"
          style={{
            width: '100%',
            background: sliderBg,
            cursor: sliderDisabled ? 'default' : 'pointer',
            opacity: sliderDisabled ? 0.4 : 1,
            ['--wac-color' as string]: assetClass.color,
          }}
        />
      </div>
      <div style={inputStyles.percentWrapper}>
        <input
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
