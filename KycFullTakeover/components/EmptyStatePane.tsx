// Shown when the AI payload is missing, malformed, or has an unsupported
// schemaVersion. Replaces the entire control area — no TOC, no sections.

import * as React from 'react';
import { colors, typography, spacing } from '../styles/tokens';

interface EmptyStatePaneProps {
  message: string;     // user-facing reason
  detail?: string;     // optional technical detail (e.g. parse error)
}

export const EmptyStatePane: React.FC<EmptyStatePaneProps> = ({ message, detail }) => (
  <div style={{
    padding:        spacing.xxl,
    textAlign:      'center',
    fontFamily:     typography.fontFamily,
    background:     colors.warningBg,
    border:         `1px solid ${colors.warning}`,
    borderRadius:   6,
    margin:         spacing.lg,
  }}>
    <div style={{
      fontSize:   typography.fontSizeTitle,
      fontWeight: typography.fontWeightBold,
      color:      colors.warning,
      marginBottom: spacing.sm,
    }}>KYC Full Takeover unavailable</div>
    <div style={{
      fontSize: typography.fontSizeBody,
      color:    colors.textPrimary,
      marginBottom: detail ? spacing.sm : 0,
    }}>{message}</div>
    {detail && (
      <div style={{
        fontSize:   typography.fontSizeSmall,
        color:      colors.textMuted,
        fontStyle:  'italic',
      }}>{detail}</div>
    )}
  </div>
);
