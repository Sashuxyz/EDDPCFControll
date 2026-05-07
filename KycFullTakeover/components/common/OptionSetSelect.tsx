// components/common/OptionSetSelect.tsx
// Native <select> bound to an OptionSetMap. Emits onChange(number | null).
// "(none)" is always available as the first option to allow clearing.

import * as React from 'react';
import { OptionSetMap } from '../../utils/optionSets';
import { colors, typography, inputStyle } from '../../styles/tokens';

interface OptionSetSelectProps {
  map:         OptionSetMap;
  value:       number | null | undefined;
  onChange:    (next: number | null) => void;
  ariaLabel?:  string;
  noneLabel?:  string;     // override "(none)" if desired (e.g. "(not assessed)")
}

export const OptionSetSelect: React.FC<OptionSetSelectProps> = ({
  map, value, onChange, ariaLabel, noneLabel = '(none)',
}) => {
  const [focused, setFocused] = React.useState(false);
  const sortedKeys = Object.keys(map).map(Number).sort((a, b) => a - b);
  return (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? null : Number(v));
      }}
      style={{
        ...inputStyle(focused),
        appearance:   'auto',
        cursor:       'pointer',
      }}
    >
      <option value="" style={{ color: colors.textMuted, fontFamily: typography.fontFamily }}>
        {noneLabel}
      </option>
      {sortedKeys.map((k) => (
        <option key={k} value={k}>{map[k]}</option>
      ))}
    </select>
  );
};
