// Editable lookup field. Renders the current value in a grey input-style box;
// clicking the box (or the search icon) opens the native D365 lookup picker via
// PCF context.utils.lookupObjects. On selection, calls onChange with a
// LookupRef shaped like the rest of the payload ({id, name, etn}).
//
// Polymorphic Customer lookups (account or contact) work by passing
// entityTypes: ['account', 'contact']. The dialog's entity-type tabs let the RM
// switch between the two; the returned LookupValue carries the actual etn.
//
// If lookupObjects isn't available (older PCF host or unit tests), the
// component falls back to read-only mode and logs a warning the first time
// it's clicked.

import * as React from 'react';
import { LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';
import { useLookupObjects } from './LookupContext';

interface LookupEditProps {
  value:        LookupRef | null | undefined;
  /** Logical names of the target entities. For polymorphic Customer use both 'account' and 'contact'. */
  entityTypes:  string[];
  onChange:     (next: LookupRef | undefined) => void;
  emptyText?:   string;
  ariaLabel?:   string;
}

export const LookupEdit: React.FC<LookupEditProps> = ({
  value, entityTypes, onChange, emptyText = 'Pick a value…', ariaLabel,
}) => {
  const lookupObjects = useLookupObjects();
  const [busy, setBusy] = React.useState(false);

  const openPicker = React.useCallback(async () => {
    if (!lookupObjects) {
      // eslint-disable-next-line no-console
      console.warn('[KycFullTakeover] lookupObjects unavailable in this host — field is read-only');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const results = await lookupObjects({
        entityTypes,
        defaultEntityType: entityTypes[0],
        allowMultiSelect:  false,
      });
      if (results && results.length > 0) {
        const r = results[0];
        const id = String(r.id ?? '').replace(/[{}]/g, '').toLowerCase();
        if (id) {
          onChange({
            id,
            name: r.name ?? '',
            etn:  r.entityType ?? entityTypes[0],
          });
        }
      }
    } catch {
      // dialog cancelled — silent
    } finally {
      setBusy(false);
    }
  }, [lookupObjects, busy, entityTypes, onChange]);

  const clear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  }, [onChange]);

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, width: '100%' }}>
      <button
        type="button"
        onClick={openPicker}
        aria-label={ariaLabel ?? `Pick ${entityTypes.join(' / ')}`}
        disabled={!lookupObjects}
        style={{
          flex:          1,
          background:    colors.inputBg,
          border:        'none',
          borderBottom:  `2px solid ${busy ? colors.brand : 'transparent'}`,
          borderRadius:  4,
          padding:       '6px 10px',
          fontFamily:    typography.fontFamily,
          fontSize:      typography.fontSizeBody,
          color:         value ? colors.textPrimary : colors.textMuted,
          cursor:        lookupObjects ? 'pointer' : 'not-allowed',
          textAlign:     'left',
          minHeight:     30,
          lineHeight:    '20px',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          gap:           8,
        }}
      >
        <span style={{
          flex:           1,
          overflow:       'hidden',
          textOverflow:   'ellipsis',
          whiteSpace:     'nowrap',
        }}>
          {value?.name || emptyText}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={value ? colors.textSecondary : colors.textMuted}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <circle cx="11" cy="11" r="7"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear lookup"
          title="Clear"
          style={{
            background:    'transparent',
            border:        `1px solid ${colors.borderStandard}`,
            borderRadius:  4,
            padding:       '0 8px',
            fontFamily:    typography.fontFamily,
            fontSize:      14,
            color:         colors.textMuted,
            cursor:        'pointer',
            lineHeight:    1,
            minHeight:     30,
          }}
        >×</button>
      )}
    </div>
  );
};
