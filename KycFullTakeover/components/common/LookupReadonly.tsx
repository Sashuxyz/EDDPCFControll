// components/common/LookupReadonly.tsx
// Renders a lookup as a disabled-looking, labelled field. Shows the .name
// only — never the GUID. Phase 1 limitation: lookups inside takeover sections
// are display-only; if the agent's resolution is wrong the RM clears the
// section, fixes the lookup on the underlying record, and re-runs takeover.

import * as React from 'react';
import { LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';

interface LookupReadonlyProps {
  value:      LookupRef | null | undefined;
  emptyText?: string;
}

export const LookupReadonly: React.FC<LookupReadonlyProps> = ({ value, emptyText = '—' }) => (
  <div style={{
    background:    colors.inputBg,
    border:        'none',
    borderBottom:  '2px solid transparent',
    borderRadius:  4,
    padding:       '6px 10px',
    fontFamily:    typography.fontFamily,
    fontSize:      typography.fontSizeBody,
    color:         value ? colors.textPrimary : colors.textMuted,
    width:         '100%',
    boxSizing:     'border-box',
    cursor:        'not-allowed',
    minHeight:     30,
    lineHeight:    '20px',
  }}>
    {value?.name ?? emptyText}
  </div>
);
