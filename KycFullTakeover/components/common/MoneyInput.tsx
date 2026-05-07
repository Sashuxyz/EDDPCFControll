// components/common/MoneyInput.tsx
// Swiss-formatted CHF money input. Displays "1'234'567" while not focused;
// switches to a plain number input on focus so the user can edit. Emits
// onChange(number) with the parsed value. Returns null for empty input.

import * as React from 'react';
import { formatSwissNumber, parseSwissNumber } from '../../utils/formatters';
import { colors, typography, inputStyle } from '../../styles/tokens';

interface MoneyInputProps {
  value:        number | null;
  onChange:     (next: number | null) => void;
  placeholder?: string;
  ariaLabel?:   string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, placeholder, ariaLabel }) => {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft]   = React.useState<string>('');

  const display = focused
    ? draft
    : (value === null ? '' : formatSwissNumber(value));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span style={{
        fontSize:  typography.fontSizeLabel,
        color:     colors.textMuted,
        fontFamily: typography.fontFamily,
      }}>CHF</span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={display}
        onFocus={() => {
          setDraft(value === null ? '' : String(value));
          setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = draft.trim() === '' ? null : parseSwissNumber(draft);
          onChange(parsed);
        }}
        onChange={(e) => setDraft(e.target.value)}
        style={inputStyle(focused)}
      />
    </div>
  );
};
