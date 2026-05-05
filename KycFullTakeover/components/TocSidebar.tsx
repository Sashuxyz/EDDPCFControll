// Sticky left sidebar with 5 groups, 17 entries, status icon per entry.
// `activeId` is set on click via `onNavigate`; scroll-driven highlighting
// (IntersectionObserver-based scrollspy) is deferred to a later milestone.

import * as React from 'react';
import { StatusIcon } from './common/StatusIcon';
import { SectionId, SectionState } from '../types';
import { colors, typography, spacing, layout } from '../styles/tokens';

export interface TocEntry {
  id:    SectionId;
  label: string;
  state: SectionState;
}

interface TocGroup {
  label:    string;
  entries:  TocEntry[];
}

interface TocSidebarProps {
  groups:        TocGroup[];
  activeId?:     SectionId;
  onNavigate:    (id: SectionId) => void;
}

export const TocSidebar: React.FC<TocSidebarProps> = ({ groups, activeId, onNavigate }) => (
  <nav style={{
    width:       layout.tocWidth,
    flexShrink:  0,
    position:    'sticky',
    top:         0,
    alignSelf:   'flex-start',
    maxHeight:   '100vh',
    overflowY:   'auto',
    borderRight: `1px solid ${colors.borderStandard}`,
    background:  colors.cardBg,
    padding:     `${spacing.lg}px 0`,
  }}>
    {groups.map((g) => (
      <div key={g.label} style={{ marginBottom: spacing.lg }}>
        <div style={{
          padding:     `${spacing.xs}px ${spacing.lg}px`,
          fontSize:    typography.fontSizeLabel,
          fontWeight:  typography.fontWeightBold,
          color:       colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>{g.label}</div>
        {g.entries.map((e) => {
          const active = e.id === activeId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onNavigate(e.id)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         spacing.sm,
                width:       '100%',
                padding:     `${spacing.xs}px ${spacing.lg}px`,
                background:  active ? colors.brandLight : 'transparent',
                border:      'none',
                borderLeft:  `3px solid ${active ? colors.brand : 'transparent'}`,
                cursor:      'pointer',
                fontFamily:  typography.fontFamily,
                fontSize:    typography.fontSizeBody,
                color:       colors.textPrimary,
                textAlign:   'left',
                height:      layout.tocItemHeight,
              }}
            >
              <StatusIcon state={e.state} size={10} />
              <span>{e.label}</span>
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);
