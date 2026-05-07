// components/common/DateInput.tsx
// HTML date input wrapped in Sygnum styling. Stores ISO 8601 (yyyy-mm-dd)
// internally so it serialises cleanly to OData. Displays the native picker.

import * as React from 'react';
import { inputStyle } from '../../styles/tokens';

interface DateInputProps {
  value:      string | null;          // ISO 8601 yyyy-mm-dd
  onChange:   (next: string | null) => void;
  ariaLabel?: string;
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, ariaLabel }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value ?? ''}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      style={inputStyle(focused)}
    />
  );
};
