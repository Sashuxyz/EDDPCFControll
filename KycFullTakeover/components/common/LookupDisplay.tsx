// Renders a lookup as plain name-only text. Per spec: GUIDs are NEVER shown
// to the RM — no debug tooltip, no copy-GUID affordance.

import * as React from 'react';
import { LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';

interface LookupDisplayProps {
  value: LookupRef | null | undefined;
  emptyLabel?: string;
}

export const LookupDisplay: React.FC<LookupDisplayProps> = ({ value, emptyLabel = '—' }) => {
  if (!value) return <span style={{ color: colors.textMuted }}>{emptyLabel}</span>;
  return (
    <span style={{
      color:      colors.textPrimary,
      fontFamily: typography.fontFamily,
      fontSize:   typography.fontSizeBody,
    }}>
      {value.name}
    </span>
  );
};
