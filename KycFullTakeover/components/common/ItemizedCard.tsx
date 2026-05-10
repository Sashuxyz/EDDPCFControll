// components/common/ItemizedCard.tsx
// Generic card for one itemized row. Header is always visible (title +
// subtitle); the body is collapsed by default and toggled by clicking the
// header. Optional × removes the row from the parent's edit state.
//
// Each detail has a `kind` that drives how the value is rendered:
//   display  — read-only React node (use for lookups, custom widgets)
//   text     — editable text input
//   number   — editable numeric input
//   money    — editable Swiss-formatted CHF money input
//   date     — editable date picker (yyyy-mm-dd)
//   longtext — editable auto-growing textarea
//   picklist — editable select bound to an option set
//
// All variants share label + wide. The discriminated union keeps the
// per-kind props (rawValue / onChange / options) type-safe.

import * as React from 'react';
import { colors, typography, spacing } from '../../styles/tokens';
import { MoneyInput } from './MoneyInput';
import { DateInput } from './DateInput';
import { AutoTextarea } from './AutoTextarea';
import { OptionSetSelect } from './OptionSetSelect';
import { OptionSetMap } from '../../utils/optionSets';

interface BaseDetail {
  label: string;
  wide?: boolean;
}

export type ItemizedCardDetail =
  | (BaseDetail & { kind?: 'display'; value: React.ReactNode })
  | (BaseDetail & { kind: 'text';     value: string | undefined; onChange: (next: string) => void; placeholder?: string })
  | (BaseDetail & { kind: 'number';   value: number | undefined; onChange: (next: number | undefined) => void; placeholder?: string })
  | (BaseDetail & { kind: 'money';    value: number | undefined; onChange: (next: number | undefined) => void })
  | (BaseDetail & { kind: 'date';     value: string | undefined; onChange: (next: string | undefined) => void })
  | (BaseDetail & { kind: 'longtext'; value: string | undefined; onChange: (next: string) => void; minRows?: number })
  | (BaseDetail & { kind: 'picklist'; value: number | undefined; map: OptionSetMap; onChange: (next: number | undefined) => void });

interface ItemizedCardProps {
  title:        string;
  subtitle?:    string;
  details:      ItemizedCardDetail[];
  canRemove?:   boolean;
  onRemove?:    () => void;
  defaultOpen?: boolean;
}

const DisplayBox: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isEmpty =
    children === null || children === undefined || children === '' ||
    (typeof children === 'string' && children.trim() === '');
  return (
    <div style={{
      background:    colors.inputBg,
      border:        'none',
      borderBottom:  '2px solid transparent',
      borderRadius:  4,
      padding:       '6px 10px',
      fontFamily:    typography.fontFamily,
      fontSize:      typography.fontSizeBody,
      color:         isEmpty ? colors.textMuted : colors.textPrimary,
      width:         '100%',
      boxSizing:     'border-box',
      minHeight:     30,
      lineHeight:    '20px',
    }}>
      {isEmpty ? '—' : children}
    </div>
  );
};

const TextInput: React.FC<{
  value: string | undefined;
  onChange: (next: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={()  => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background:    colors.inputBg,
        border:        'none',
        borderBottom:  `2px solid ${focused ? colors.brand : 'transparent'}`,
        borderRadius:  4,
        padding:       '6px 10px',
        fontFamily:    typography.fontFamily,
        fontSize:      typography.fontSizeBody,
        color:         colors.textPrimary,
        outline:       'none',
        width:         '100%',
        boxSizing:     'border-box',
      }}
    />
  );
};

const NumberInput: React.FC<{
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string>(value === undefined ? '' : String(value));
  // Keep draft in sync when the value is updated externally (e.g. payload reload)
  React.useEffect(() => {
    if (!focused) setDraft(value === undefined ? '' : String(value));
  }, [value, focused]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : (value === undefined ? '' : String(value))}
      placeholder={placeholder}
      onFocus={() => { setDraft(value === undefined ? '' : String(value)); setFocused(true); }}
      onBlur={() => {
        setFocused(false);
        const trimmed = draft.trim();
        if (trimmed === '') { onChange(undefined); return; }
        const n = Number(trimmed);
        if (Number.isFinite(n)) onChange(n);
      }}
      onChange={(e) => setDraft(e.target.value)}
      style={{
        background:    colors.inputBg,
        border:        'none',
        borderBottom:  `2px solid ${focused ? colors.brand : 'transparent'}`,
        borderRadius:  4,
        padding:       '6px 10px',
        fontFamily:    typography.fontFamily,
        fontSize:      typography.fontSizeBody,
        color:         colors.textPrimary,
        outline:       'none',
        width:         '100%',
        boxSizing:     'border-box',
      }}
    />
  );
};

const renderDetailValue = (d: ItemizedCardDetail): React.ReactNode => {
  const kind = d.kind ?? 'display';
  switch (kind) {
    case 'display':
      return <DisplayBox>{(d as Extract<ItemizedCardDetail, { kind?: 'display' }>).value}</DisplayBox>;
    case 'text': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'text' }>;
      return <TextInput value={dt.value} onChange={dt.onChange} placeholder={dt.placeholder} />;
    }
    case 'number': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'number' }>;
      return <NumberInput value={dt.value} onChange={dt.onChange} placeholder={dt.placeholder} />;
    }
    case 'money': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'money' }>;
      return <MoneyInput value={dt.value ?? null} onChange={(v) => dt.onChange(v ?? undefined)} ariaLabel={dt.label} />;
    }
    case 'date': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'date' }>;
      return <DateInput value={dt.value ?? null} onChange={(v) => dt.onChange(v ?? undefined)} ariaLabel={dt.label} />;
    }
    case 'longtext': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'longtext' }>;
      return <AutoTextarea value={dt.value ?? ''} onChange={dt.onChange} minRows={dt.minRows ?? 2} ariaLabel={dt.label} />;
    }
    case 'picklist': {
      const dt = d as Extract<ItemizedCardDetail, { kind: 'picklist' }>;
      return (
        <OptionSetSelect
          value={dt.value ?? null}
          map={dt.map}
          onChange={(v) => dt.onChange(v ?? undefined)}
          ariaLabel={dt.label}
        />
      );
    }
  }
};

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
            gap:                 `${spacing.md}px ${spacing.md}px`,
          }}>
            {details.map((d, i) => (
              <div key={i} style={{ gridColumn: d.wide ? '1 / span 2' : undefined }}>
                <div style={{
                  fontSize:     typography.fontSizeLabel,
                  color:        colors.textSecondary,
                  marginBottom: 4,
                }}>{d.label}</div>
                {renderDetailValue(d)}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
