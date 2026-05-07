// components/common/AutoTextarea.tsx
// Textarea that grows to fit its content. Resets to scrollHeight on every
// value change (and on mount via useLayoutEffect), with a minHeight floor so
// empty inputs don't collapse below `minRows` lines. The native resize
// handle is hidden because manual sizing would fight the auto-grow logic.

import * as React from 'react';
import { inputStyle } from '../../styles/tokens';

interface AutoTextareaProps {
  value:        string;
  onChange:     (next: string) => void;
  minRows?:     number;       // floor; defaults to 3
  ariaLabel?:   string;
  placeholder?: string;
}

const ROW_HEIGHT_PX = 22;

export const AutoTextarea: React.FC<AutoTextareaProps> = ({
  value, onChange, minRows = 3, ariaLabel, placeholder,
}) => {
  const [focused, setFocused] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Reset first so shrinking works (scrollHeight only grows, never shrinks,
    // unless we let the browser recompute the natural height from rows=minRows).
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);

  // Adjust on every value change (covers external prop updates too).
  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        adjustHeight();
      }}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      rows={minRows}
      placeholder={placeholder}
      aria-label={ariaLabel}
      style={{
        ...inputStyle(focused),
        resize:    'none',
        overflow:  'hidden',
        minHeight: minRows * ROW_HEIGHT_PX,
      }}
    />
  );
};
