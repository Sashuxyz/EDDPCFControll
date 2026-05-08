// components/common/ItemizedCard.tsx
// Generic card for one itemized row. Header is always visible (title +
// subtitle); the body is collapsed by default and toggled by clicking the
// header. Optional × removes the row from the parent's edit state.

import * as React from 'react';
import { colors, typography, spacing } from '../../styles/tokens';

export interface ItemizedCardDetail {
  label:  string;
  value:  React.ReactNode;
  wide?:  boolean;
}

interface ItemizedCardProps {
  title:        string;
  subtitle?:    string;
  details:      ItemizedCardDetail[];
  canRemove?:   boolean;
  onRemove?:    () => void;
  defaultOpen?: boolean;
}

export const ItemizedCard: React.FC<ItemizedCardProps> = ({
  title, subtitle, details, canRemove = false, onRemove, defaultOpen = false,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <article style={{
      border:        `1px solid ${colors.borderStandard}`,
      borderRadius:  6,
      background:    colors.cardBg,
      marginBottom:  spacing.sm,
      overflow:      'hidden',
    }}>
      <header
        onClick={() => setOpen(!open)}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            spacing.sm,
          padding:        `${spacing.sm}px ${spacing.md}px`,
          cursor:         'pointer',
          background:     open ? colors.sectionBg : 'transparent',
          borderBottom:   open ? `1px solid ${colors.borderStandard}` : 'none',
          fontFamily:     typography.fontFamily,
        }}
      >
        <span aria-hidden="true" style={{
          width:      14,
          color:      colors.textMuted,
          fontSize:   typography.fontSizeSmall,
          textAlign:  'center',
        }}>{open ? '▾' : '▸'}</span>
        <span style={{
          flex:       1,
          fontWeight: typography.fontWeightBold,
          fontSize:   typography.fontSizeBody,
          color:      colors.textPrimary,
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontSize: typography.fontSizeLabel,
            color:    colors.textSecondary,
          }}>{subtitle}</span>
        )}
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            aria-label={`Remove ${title}`}
            title={`Remove ${title}`}
            style={{
              display:        'inline-flex',
              alignItems:     'center',
              justifyContent: 'center',
              width:          18,
              height:         18,
              border:         'none',
              borderRadius:   '50%',
              background:     'transparent',
              color:          colors.error,
              cursor:         'pointer',
              fontSize:       16,
              lineHeight:     1,
              padding:        0,
              fontFamily:     typography.fontFamily,
            }}
          >×</button>
        )}
      </header>
      {open && (
        <div style={{ padding: spacing.md, fontFamily: typography.fontFamily }}>
          <div style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 `${spacing.xs}px ${spacing.md}px`,
          }}>
            {details.map((d, i) => (
              <div key={i} style={{ gridColumn: d.wide ? '1 / span 2' : undefined }}>
                <div style={{
                  fontSize:   typography.fontSizeLabel,
                  color:      colors.textSecondary,
                  marginBottom: 2,
                }}>{d.label}</div>
                <div style={{
                  fontSize:   typography.fontSizeBody,
                  color:      colors.textPrimary,
                }}>{d.value || <span style={{ color: colors.textMuted }}>—</span>}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
