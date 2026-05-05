// Shared header bar for every takeover section: title, status icon,
// "Take over" / "Take over again" button, and a status-specific subtitle
// (e.g. "Last run 12.04.2026 at 10:32" when done).

import * as React from 'react';
import { StatusIcon } from './common/StatusIcon';
import { SectionState } from '../types';
import { colors, typography, spacing } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';

interface SectionFrameProps {
  title:        string;
  state:        SectionState;
  count?:       number;          // shown in button label, e.g. "Take over (3)"
  lastRunAt?:   string;
  errorMsg?:    string;
  onTakeover?:  () => void;      // omit for read-only sections
  children:     React.ReactNode;
}

export const SectionFrame: React.FC<SectionFrameProps> = ({
  title, state, count, lastRunAt, errorMsg, onTakeover, children,
}) => {
  const isReadOnly = state === 'read-only';
  const isHidden   = state === 'na';
  if (isHidden) return null;

  const buttonLabel = (() => {
    if (isReadOnly) return null;
    const verb = (state === 'done' || state === 'partial-failed') ? 'Take over again' : 'Take over';
    return count !== undefined ? `${verb} (${count})` : verb;
  })();

  const subtitle = (() => {
    if (errorMsg) return <span style={{ color: colors.error }}>{errorMsg}</span>;
    if (lastRunAt) return `Last run ${formatSwissDate(lastRunAt)}`;
    return null;
  })();

  return (
    <section style={{
      marginBottom:  spacing.xl,
      background:    colors.cardBg,
      border:        `1px solid ${colors.borderStandard}`,
      borderRadius:  6,
    }}>
      <header style={{
        display:        'flex',
        alignItems:     'center',
        gap:            spacing.sm,
        padding:        `${spacing.sm}px ${spacing.lg}px`,
        borderBottom:   `1px solid ${colors.borderStandard}`,
        background:     colors.sectionBg,
      }}>
        <StatusIcon state={state} />
        <span style={{
          flex:       1,
          fontWeight: typography.fontWeightBold,
          fontSize:   typography.fontSizeTitle,
          color:      colors.textPrimary,
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontSize:   typography.fontSizeLabel,
            color:      colors.textSecondary,
          }}>{subtitle}</span>
        )}
        {buttonLabel && (
          <button
            type="button"
            onClick={onTakeover}
            style={{
              fontSize:    typography.fontSizeSmall,
              fontWeight:  typography.fontWeightBold,
              color:       colors.textOnBrand,
              background:  colors.brand,
              border:      'none',
              borderRadius: 4,
              padding:     `6px ${spacing.md}px`,
              cursor:      'pointer',
              fontFamily:  typography.fontFamily,
            }}
          >{buttonLabel}</button>
        )}
      </header>
      <div style={{ padding: spacing.lg }}>
        {children}
      </div>
    </section>
  );
};
