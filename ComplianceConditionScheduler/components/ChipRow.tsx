import * as React from 'react';
import { chipStyles } from '../styles/tokens';

interface Preset {
  label: string;
  days: number | null;
}

interface ChipRowProps {
  presets: Preset[];
  value: number;
  onChange: (days: number) => void;
  isCustom: boolean;
  setIsCustom: (v: boolean) => void;
  unit?: string;
  disabled?: boolean;
}

export const ChipRow: React.FC<ChipRowProps> = ({ presets, value, onChange, isCustom, setIsCustom, unit = 'days', disabled = false }) => {
  const [inputFocused, setInputFocused] = React.useState(false);

  return (
    <div>
      <div style={chipStyles.row}>
        {presets.map((p) => {
          const sel = p.days === null ? isCustom : (!isCustom && value === p.days);
          const style: React.CSSProperties = {
            ...chipStyles.chip,
            ...(sel ? chipStyles.chipSelected : {}),
            ...(disabled ? chipStyles.chipDisabled : {}),
          };
          return (
            <button
              key={p.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (p.days === null) {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  onChange(p.days);
                }
              }}
              style={style}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {isCustom && !disabled && (
        <div style={chipStyles.customRow}>
          <input
            type="number"
            value={value}
            min={1}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            style={{
              ...chipStyles.customInput,
              ...(inputFocused ? chipStyles.customInputFocused : {}),
            }}
          />
          <span style={chipStyles.customUnit}>{unit}</span>
        </div>
      )}
    </div>
  );
};
