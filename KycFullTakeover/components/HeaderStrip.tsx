// Top bar showing the KYC profile name + AI payload schema version + last-run
// timestamp. Renders above the main grid (TOC + content).

import * as React from 'react';
import { colors, typography, spacing } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';

interface HeaderStripProps {
  profileName?:    string;
  schemaVersion?:  string;
  lastRunAt?:      string;
}

export const HeaderStrip: React.FC<HeaderStripProps> = ({ profileName, schemaVersion, lastRunAt }) => (
  <div style={{
    display:       'flex',
    alignItems:    'center',
    gap:           spacing.lg,
    padding:       `${spacing.md}px ${spacing.lg}px`,
    background:    colors.brand,
    color:         colors.textOnBrand,
    fontFamily:    typography.fontFamily,
  }}>
    <span style={{ fontSize: typography.fontSizeTitle, fontWeight: typography.fontWeightBold }}>
      KYC Full Takeover{profileName ? ` — ${profileName}` : ''}
    </span>
    <span style={{ flex: 1 }} />
    {schemaVersion && (
      <span style={{
        fontSize:    typography.fontSizeLabel,
        background:  'rgba(255,255,255,0.18)',
        padding:     `2px ${spacing.sm}px`,
        borderRadius: 3,
      }}>schema {schemaVersion}</span>
    )}
    {lastRunAt && (
      <span style={{ fontSize: typography.fontSizeLabel }}>
        last run {formatSwissDate(lastRunAt)}
      </span>
    )}
  </div>
);
