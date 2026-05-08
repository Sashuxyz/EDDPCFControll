// components/sections/ItemizedSection.tsx
// Generic frame for itemized child-record sections. Renders a list of
// ItemizedCard rows, optional pre-list slot (used by Source of Wealth's
// narrative textarea), and a section-level takeover button.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { ItemizedCard, ItemizedCardDetail } from '../common/ItemizedCard';
import { SectionState } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

export interface ItemizedRowConfig {
  title:     string;
  subtitle?: string;
  details:   ItemizedCardDetail[];
}

interface ItemizedSectionProps<T> {
  title:         string;
  emptyText?:    string;
  items:         T[];
  rowConfig:     (row: T, idx: number) => ItemizedRowConfig;
  state:         SectionState;
  onTakeover:    () => void;
  onRemove?:     (idx: number) => void;
  preListSlot?:  React.ReactNode;
  lastRunAt?:    string;
  errorMsg?:     string;
}

export function ItemizedSection<T>({
  title, emptyText = 'Agent did not extract any rows.', items, rowConfig, state,
  onTakeover, onRemove, preListSlot, lastRunAt, errorMsg,
}: ItemizedSectionProps<T>): React.ReactElement {
  const canEdit = onRemove !== undefined && state !== 'done' && state !== 'read-only' && state !== 'na';
  return (
    <SectionFrame
      title={title}
      state={state}
      count={items.length}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      {preListSlot}
      {items.length === 0 ? (
        <div style={{
          padding:    spacing.md,
          color:      colors.textMuted,
          fontFamily: typography.fontFamily,
          fontSize:   typography.fontSizeBody,
          fontStyle:  'italic',
        }}>{emptyText}</div>
      ) : (
        <div>
          {items.map((row, idx) => {
            const cfg = rowConfig(row, idx);
            return (
              <ItemizedCard
                key={idx}
                title={cfg.title}
                subtitle={cfg.subtitle}
                details={cfg.details}
                canRemove={canEdit}
                onRemove={onRemove ? () => onRemove(idx) : undefined}
              />
            );
          })}
        </div>
      )}
    </SectionFrame>
  );
}
