// Read-only display of agent-produced findings. Severity colour-codes the
// left border of each card. No takeover button — this section is informational.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { Finding } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

const severityColor: Record<Finding['severity'], string> = {
  info:     colors.brand,
  warning:  colors.warning,
  critical: colors.error,
};

interface FindingsSectionProps {
  findings: Finding[];
}

export const FindingsSection: React.FC<FindingsSectionProps> = ({ findings }) => (
  <SectionFrame title="Findings" state="read-only">
    {findings.length === 0 ? (
      <div style={{ color: colors.textMuted, fontFamily: typography.fontFamily }}>No findings.</div>
    ) : findings.map((f, i) => (
      <article key={i} style={{
        marginBottom:  spacing.md,
        padding:       spacing.md,
        background:    colors.whisperBg,
        borderLeft:    `3px solid ${severityColor[f.severity]}`,
        borderRadius:  3,
      }}>
        <header style={{
          display:    'flex',
          alignItems: 'center',
          gap:        spacing.sm,
          marginBottom: spacing.xs,
        }}>
          <span style={{
            fontSize:    typography.fontSizeLabel,
            fontWeight:  typography.fontWeightBold,
            color:       severityColor[f.severity],
            textTransform: 'uppercase',
          }}>{f.severity}</span>
          <span style={{
            fontSize: typography.fontSizeLabel,
            color:    colors.textMuted,
          }}>{f.category}</span>
        </header>
        <div style={{
          fontSize:   typography.fontSizeBody,
          fontWeight: typography.fontWeightBold,
          color:      colors.textPrimary,
          marginBottom: spacing.xs,
        }}>{f.title}</div>
        <div style={{
          fontSize:   typography.fontSizeBody,
          color:      colors.textPrimary,
          marginBottom: f.regulatoryReference ? spacing.xs : 0,
        }}>{f.detail}</div>
        {f.regulatoryReference && (
          <div style={{
            fontSize:   typography.fontSizeLabel,
            color:      colors.textSecondary,
            fontStyle:  'italic',
          }}>{f.regulatoryReference}</div>
        )}
      </article>
    ))}
  </SectionFrame>
);
