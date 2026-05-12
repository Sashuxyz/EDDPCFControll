// Editable lookup field. Renders the current value in a grey input-style box;
// clicking the box opens the native D365 lookup picker. On selection, calls
// onChange with a LookupRef shaped like the rest of the payload ({id, name, etn}).
//
// Polymorphic Customer lookups (account or contact) work by passing
// entityTypes: ['account', 'contact']. The dialog's entity-type tabs let the RM
// switch between the two; the returned LookupValue carries the actual etn.
//
// Picker resolution order:
//   1. context.utils.lookupObjects (provided via LookupObjectsContext)
//   2. window.Xrm.Utility.lookupObjects fallback (some PCF hosts expose this
//      but not utils.lookupObjects, and vice-versa)
// Both calls add `disableMru: true` so the dialog isn't pre-filtered to the
// user's recently-used records.
//
// Every step logs to console.info under the [KycFullTakeover/LookupEdit] tag
// so picker problems can be diagnosed from devtools without code changes.

import * as React from 'react';
import { LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';
import { useLookupObjects, LookupObjectsFn } from './LookupContext';
import { debugInfo, debugWarn, debugError } from '../../utils/debugLog';

interface LookupEditProps {
  value:        LookupRef | null | undefined;
  /** Logical names of the target entities. For polymorphic Customer use both 'account' and 'contact'. */
  entityTypes:  string[];
  onChange:     (next: LookupRef | undefined) => void;
  emptyText?:   string;
  ariaLabel?:   string;
}

/** Try to open the picker via PCF context first, then fall back to Xrm.Utility. */
async function openLookupPicker(
  pcfFn:       LookupObjectsFn | null,
  options:     ComponentFramework.UtilityApi.LookupOptions,
): Promise<ComponentFramework.LookupValue[]> {
  // Add disableMru — bypasses the Most-Recently-Used filter that otherwise
  // limits the dialog to records the user has touched. The flag isn't in
  // the PCF type definitions but is honoured by the underlying Dataverse
  // dialog at runtime, so we cast.
  const enriched = { ...options, disableMru: true } as unknown as ComponentFramework.UtilityApi.LookupOptions;

  if (pcfFn) {
    try {
      debugInfo('[KycFullTakeover/LookupEdit] context.utils.lookupObjects', enriched);
      const r = await pcfFn(enriched);
      debugInfo('[KycFullTakeover/LookupEdit] result (pcf) count', { count: r?.length ?? 0 });
      return r ?? [];
    } catch (e) {
      debugWarn('[KycFullTakeover/LookupEdit] pcf path threw, falling back to Xrm.Utility', e);
    }
  }

  const xrm = (window as unknown as {
    Xrm?: { Utility?: { lookupObjects?: (opts: unknown) => Promise<ComponentFramework.LookupValue[]> } };
  }).Xrm;
  if (xrm?.Utility?.lookupObjects) {
    debugInfo('[KycFullTakeover/LookupEdit] Xrm.Utility.lookupObjects', enriched);
    const r = await xrm.Utility.lookupObjects(enriched);
    debugInfo('[KycFullTakeover/LookupEdit] result (xrm) count', { count: r?.length ?? 0 });
    return r ?? [];
  }

  debugError('[KycFullTakeover/LookupEdit] no lookupObjects available — neither context.utils nor Xrm.Utility');
  return [];
}

export const LookupEdit: React.FC<LookupEditProps> = ({
  value, entityTypes, onChange, emptyText = 'Pick a value…', ariaLabel,
}) => {
  const lookupObjects = useLookupObjects();
  const [busy, setBusy] = React.useState(false);

  const hasPicker = lookupObjects !== null
    || typeof (window as unknown as { Xrm?: { Utility?: { lookupObjects?: unknown } } }).Xrm?.Utility?.lookupObjects === 'function';

  const openPicker = React.useCallback(async () => {
    if (!hasPicker) {
      debugWarn('[KycFullTakeover/LookupEdit] no picker available — field is read-only');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const results = await openLookupPicker(lookupObjects, {
        entityTypes,
        defaultEntityType: entityTypes[0],
        allowMultiSelect:  false,
      });
      if (results && results.length > 0) {
        const r = results[0];
        const id = String(r.id ?? '').replace(/[{}]/g, '').toLowerCase();
        if (id) {
          const next: LookupRef = {
            id,
            name: r.name ?? '',
            etn:  r.entityType ?? entityTypes[0],
          };
          // Log only the etn + id length so the audit trail keeps schema info
          // out of devtools. The picked name flows through onChange to the UI;
          // no need to also dump it to console.
          debugInfo('[KycFullTakeover/LookupEdit] picked', { etn: next.etn, idLen: next.id.length });
          onChange(next);
        } else {
          debugWarn('[KycFullTakeover/LookupEdit] picker returned a result with empty id', { etn: r.entityType });
        }
      } else {
        debugInfo('[KycFullTakeover/LookupEdit] picker cancelled or returned empty');
      }
    } catch (e) {
      debugWarn('[KycFullTakeover/LookupEdit] picker threw', e);
    } finally {
      setBusy(false);
    }
  }, [lookupObjects, hasPicker, busy, entityTypes, onChange]);

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
        disabled={!hasPicker}
        style={{
          flex:           1,
          background:     colors.inputBg,
          border:         'none',
          borderBottom:   `2px solid ${busy ? colors.brand : 'transparent'}`,
          borderRadius:   4,
          padding:        '6px 10px',
          fontFamily:     typography.fontFamily,
          fontSize:       typography.fontSizeBody,
          color:          value ? colors.textPrimary : colors.textMuted,
          cursor:         hasPicker ? 'pointer' : 'not-allowed',
          textAlign:      'left',
          minHeight:      30,
          lineHeight:     '20px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            8,
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
