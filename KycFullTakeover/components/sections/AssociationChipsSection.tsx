// components/sections/AssociationChipsSection.tsx
// Generic N:N section. Renders an array of LookupRef as visual chips
// (name-only, no GUID) and exposes a single Take over button at the section
// level. The parent supplies onTakeover which performs the actual $ref POSTs.
//
// Phase 1 limitation: chips are read-only. If the agent's resolution is wrong,
// the RM clears the section, fixes the underlying lookup on the form, and
// re-runs takeover. No inline add/remove in this milestone.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { LookupRef, SectionState } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

interface AssociationChipsSectionProps {
  title:         string;
  emptyText?:    string;
  items:         LookupRef[];
  state:         SectionState;
  onTakeover:    () => void;
  lastRunAt?:    string;
  errorMsg?:     string;
}

export const AssociationChipsSection: React.FC<AssociationChipsSectionProps> = ({
  title, emptyText = 'Agent did not extract any associations.', items, state, onTakeover, lastRunAt, errorMsg,
}) => (
  <SectionFrame
    title={title}
    state={state}
    count={items.length}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
    onTakeover={onTakeover}
  >
    {items.length === 0 ? (
      <div style={{
        padding:    spacing.md,
        color:      colors.textMuted,
        fontFamily: typography.fontFamily,
        fontSize:   typography.fontSizeBody,
        fontStyle:  'italic',
      }}>{emptyText}</div>
    ) : (
      <div style={{
        display:   'flex',
        flexWrap:  'wrap',
        gap:       spacing.sm,
      }}>
        {items.map((it, idx) => (
          <span key={`${it.id}-${idx}`} style={chipStyle}>{it.name}</span>
        ))}
      </div>
    )}
  </SectionFrame>
);

const chipStyle: React.CSSProperties = {
  display:        'inline-block',
  padding:        '4px 10px',
  background:     colors.brandLight,
  color:          colors.brand,
  border:         `1px solid ${colors.brand}`,
  borderRadius:   12,
  fontSize:       typography.fontSizeSmall,
  fontFamily:     typography.fontFamily,
  whiteSpace:     'nowrap',
};
