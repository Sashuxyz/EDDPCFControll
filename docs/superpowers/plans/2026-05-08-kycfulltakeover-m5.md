# KycFullTakeover M5 — Itemized Sections

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.4.0 of KycFullTakeover by replacing 4 of the 5 remaining placeholder cards (Source of Wealth, Detailed DA Holdings, Planned Fiat Funds, Planned DA Funds) with real itemized child-record creation sections. Each section creates one Dataverse row per agent-extracted item via OData POST with `@odata.bind` to the parent KYC profile.

**Architecture:** Reuses the M3/M4 patterns. New `createChildren` helper in `dataverse.ts` does parallel POSTs and reports per-row results. A single generic `ItemizedCard` wrapper handles compact-summary / expand-detail / × remove. A single generic `ItemizedSection` does the section frame + card list + takeover. Each entity gets a small thin section file that maps the agent's row shape to the generic card's `details: Array<{label, value}>` config — no per-entity card components needed. Source of Wealth additionally PATCHes `syg_sourceofwealthdetails` on the parent profile alongside the row creation (single takeover button per spec resolution).

**Tech Stack:** Same as v0.3.x (React 18, TypeScript 4.9, pcf-scripts, jest for utilities).

**Spec:** [docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md](../specs/2026-05-05-kycfulltakeover-design.md)
**Predecessor plans:** [foundation](2026-05-05-kycfulltakeover.md), [M3](2026-05-07-kycfulltakeover-m3.md), [M4](2026-05-08-kycfulltakeover-m4.md)

---

## M5 Scope

| Section | Type | Target entity | Entity-set | Parent bind | Parent PATCH? |
|---|---|---|---|---|---|
| Source of Wealth | itemized + narrative | `syg_sourceofwealth` | `syg_sourceofwealths` | `syg_kycprofileid@odata.bind` → `/syg_kycprofiles(<id>)` | yes — `syg_sourceofwealthdetails` |
| Detailed DA Holdings | itemized | `syg_DigitalAssetsHolding` | `syg_digitalassetsholdings` | `syg_KYCProfileID@odata.bind` → `/syg_kycprofiles(<id>)` | no |
| Planned Fiat Funds | itemized | `syg_incomingfiatfunds` | `syg_incomingfiatfundses` | `syg_kycprofileid@odata.bind` → `/syg_kycprofiles(<id>)` | no |
| Planned DA Funds | itemized | `syg_digitalassetfunds` | `syg_digitalassetfundses` | `syg_kycprofileid@odata.bind` → `/syg_kycprofiles(<id>)` | no |

Sections still placeholder (M6): Related Parties (with create-new contact/account flow).

---

## Phase 1 row-data scope

Phase 1 ships a useful subset of each entity's fields, NOT every column. Rationale: the agent extracts what it has confidence in; the RM reviews and commits. Fields not in the table below are left unset — Dataverse will allow null/default for all of them per the schema dump.

| Section | Fields written per row |
|---|---|
| Source of Wealth | `syg_name`, `syg_sourceofwealth` (picklist), `syg_description`, `syg_companyname`, `syg_counterpartyname`, `syg_relationshiptocounterparty` (picklist), `syg_businessactivityid@odata.bind`, `syg_countryid@odata.bind`, `syg_yearofwealthgenerationid@odata.bind`, `syg_yearofwealthgenerationinitiatedid@odata.bind`, `syg_initialinvestment`, `syg_valueatvaluationdate`, `syg_valuationdate`, `syg_wealthgenerated`, `syg_corroboratedvalue`, `syg_corroboratedpercentage`, `syg_rationale`, `syg_supportinginformation`, `syg_additionaldetails` |
| Detailed DA Holdings | `syg_name`, `syg_digitalassetid@odata.bind`, `syg_amount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_acquiringyear@odata.bind`, `syg_acquiringplace`, `syg_averageacquiringprice`, `syg_corroboratedamount`, `syg_corroboratedamountchf`, `syg_corroboratedvalue`, `syg_currentcustody`, `syg_description`, `syg_originoffunds`, `syg_supportingdocuments` |
| Planned Fiat Funds | `syg_name`, `syg_amount`, `syg_bank`, `syg_bankdomicileid@odata.bind`, `syg_clientid_account@odata.bind` OR `syg_clientid_contact@odata.bind` (polymorphic Customer — pick suffix based on `etn`), `syg_proofofownership`, `syg_transfertimeframe` (picklist) |
| Planned DA Funds | `syg_name`, `syg_customerid_account@odata.bind` OR `syg_customerid_contact@odata.bind`, `syg_firstdigitalassettransfertype@odata.bind`, `syg_firstdigitalassettransferamount`, `syg_firsttransferamount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_proofofownership`, `syg_senderwallet`, `syg_senderwallet_optionset` (picklist), `syg_source`, `syg_transfertimeframe` (picklist), `syg_remarks`, `syg_comment`, `syg_additionalexpectedfunding` |

> **Polymorphic Customer caveat:** for `syg_incomingfiatfunds.syg_clientid` and `syg_digitalassetfunds.syg_customerid` the OData write key depends on the target entity type. Use `<field>_account@odata.bind` for `etn === 'account'` and `<field>_contact@odata.bind` for `etn === 'contact'`. The row builder inspects the LookupRef's `etn` and picks the right suffix.

---

## File Structure

### New files

```
KycFullTakeover/
  components/
    common/
      ItemizedCard.tsx                 # generic card: title + subtitle + expand/collapse + × remove + detail rows
    sections/
      ItemizedSection.tsx              # generic frame + card list + section-level takeover button
      SourceOfWealthSection.tsx        # narrative textarea + ItemizedSection
      DetailedDAHoldingsSection.tsx
      PlannedFiatFundsSection.tsx
      PlannedDAFundsSection.tsx
  __tests__/
    createChildren.test.ts
```

### Files modified

```
KycFullTakeover/
  utils/dataverse.ts                   # add createChildren helper (parallel POST per row)
  components/KycFullTakeover.tsx       # 4 placeholders replaced + takeoverItemized handler
  ControlManifest.Input.xml            # 0.3.1 → 0.4.0
  WRITTEN_FIELDS.md                    # add M5 section rows
Solution/kft-pack/
  solution.xml                         # 0.3.1 → 0.4.0
  Controls/Syg.KycFullTakeover/bundle.js   # rebuilt
  Controls/Syg.KycFullTakeover/ControlManifest.xml  # rebuilt
```

---

## Tasks

### Task 1: `createChildren` helper in dataverse.ts

**Files:**
- Modify: `KycFullTakeover/utils/dataverse.ts`
- Create: `KycFullTakeover/__tests__/createChildren.test.ts`

The helper does one POST per row in parallel (Promise.all) and reports per-row results. Each row already contains its `@odata.bind` to the parent.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/createChildren.test.ts
import { isInvalidPropertyError } from '../utils/dataverse';

describe('isInvalidPropertyError', () => {
  test.each([
    ['Invalid property name',                                         true],
    ['The property "syg_xxx" does not exist on type',                 true],
    ['Resource not found for the segment',                            true],
    ['400 Bad Request',                                               false],
    ['Permission denied',                                             false],
    ['',                                                              false],
  ])('isInvalidPropertyError(%j) === %s', (msg, expected) => {
    expect(isInvalidPropertyError(msg)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=createChildren`
Expected: FAIL — `isInvalidPropertyError` not exported.

- [ ] **Step 3: Append the helper to `utils/dataverse.ts`**

Add after the existing `associateRecords` function:

```ts
// ============================================================================
// Itemized child-record creation
// ============================================================================
//
// Creates one row per item in parallel. Each `row` is already a fully-formed
// OData write payload — fields lowercase, lookups as `<key>@odata.bind` URLs,
// parent bind included by the caller. We don't inspect the row's structure;
// we just POST it and report status.

export interface CreateChildrenResult {
  ok:       boolean;
  created:  number;
  failed:   number;
  errors:   Array<{ rowIndex: number; rowName?: string; message: string }>;
}

const INVALID_PROPERTY_PATTERNS = [
  /invalid property/i,
  /property ["']?[^"']+["']? does not exist/i,
  /resource not found/i,
];

export function isInvalidPropertyError(message: string): boolean {
  if (typeof message !== 'string' || message.length === 0) return false;
  return INVALID_PROPERTY_PATTERNS.some((re) => re.test(message));
}

export async function createChildren(
  entitySetName:   string,
  rows:            Array<Record<string, unknown>>,
  rowNames:        string[],            // parallel array — used for error reporting only
): Promise<CreateChildrenResult> {
  const result: CreateChildrenResult = { ok: true, created: 0, failed: 0, errors: [] };
  if (rows.length === 0) return result;

  const base = window.location.origin;

  // Use Promise.all for parallel issue. Dataverse handles ~50 concurrent writes
  // comfortably; agent payloads in Phase 1 are typically <10 rows per section,
  // so we don't bother chunking.
  const settled = await Promise.all(rows.map(async (row, idx) => {
    try {
      const resp = await fetch(`${base}/api/data/v9.2/${entitySetName}`, {
        method:      'POST',
        credentials: 'include',
        headers:     {
          'Content-Type':       'application/json',
          'OData-Version':      '4.0',
          'OData-MaxVersion':   '4.0',
          'Accept':             'application/json',
          'Prefer':             'return=representation',
        },
        body: JSON.stringify(row),
      });

      if (resp.ok) return { ok: true as const };

      let errBody = '';
      try { errBody = await resp.text(); } catch { /* ignore */ }
      return { ok: false as const, message: `HTTP ${resp.status}: ${errBody.slice(0, 240)}` };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message ?? String(e) };
    }
  }));

  settled.forEach((r, idx) => {
    if (r.ok) {
      result.created += 1;
    } else {
      result.failed += 1;
      result.errors.push({ rowIndex: idx, rowName: rowNames[idx], message: r.message });
    }
  });
  result.ok = result.failed === 0;
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=createChildren`
Expected: PASS — 6 cases.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add KycFullTakeover/utils/dataverse.ts KycFullTakeover/__tests__/createChildren.test.ts
git commit -m "feat(kyc-full-takeover m5): createChildren helper + invalid-property detector"
```

---

### Task 2: ItemizedCard generic component

**Files:**
- Create: `KycFullTakeover/components/common/ItemizedCard.tsx`

A reusable card for itemized rows. Renders title + optional subtitle (always visible) and details (revealed via expand/collapse). Supports an optional × remove button hidden when read-only.

- [ ] **Step 1: Write the component**

```tsx
// components/common/ItemizedCard.tsx
// Generic card for one itemized row. Header is always visible (title +
// subtitle); the body is collapsed by default and toggled by clicking the
// header. Optional × removes the row from the parent's edit state.

import * as React from 'react';
import { colors, typography, spacing } from '../../styles/tokens';

export interface ItemizedCardDetail {
  label:  string;
  value:  React.ReactNode;        // formatters / LookupReadonly / plain text
  wide?:  boolean;                // span both grid columns
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
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/common/ItemizedCard.tsx
git commit -m "feat(kyc-full-takeover m5): ItemizedCard (generic expandable card with × remove)"
```

---

### Task 3: ItemizedSection generic component

**Files:**
- Create: `KycFullTakeover/components/sections/ItemizedSection.tsx`

Generic frame around a list of `ItemizedCard`. Each section file (Tasks 4-7) renders this with its entity-specific row→details adapter.

- [ ] **Step 1: Write the component**

```tsx
// components/sections/ItemizedSection.tsx
// Generic frame for itemized child-record sections. Renders a list of
// ItemizedCard rows, optional pre-list slot (used by Source of Wealth's
// narrative textarea), and a section-level takeover button. Each entity-
// specific section file passes a render function that converts a row into
// the ItemizedCard's detail config.

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
  preListSlot?:  React.ReactNode;       // SoW puts its narrative textarea here
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
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/sections/ItemizedSection.tsx
git commit -m "feat(kyc-full-takeover m5): ItemizedSection (generic frame + card list)"
```

---

### Task 4: SourceOfWealthSection

**Files:**
- Create: `KycFullTakeover/components/sections/SourceOfWealthSection.tsx`

The richest section: narrative textarea above the card list, single takeover button drives both the parent PATCH and the child POSTs.

- [ ] **Step 1: Write the component**

```tsx
// components/sections/SourceOfWealthSection.tsx
// Source of Wealth — itemized + narrative. The textarea writes to
// syg_sourceofwealthdetails on the parent profile; the cards each create a
// syg_sourceofwealth row. ONE takeover button does both writes.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { AutoTextarea } from '../common/AutoTextarea';
import { SourceOfWealthRow, SourceOfWealthSection as SoWPayload, SectionState } from '../../types';
import { SOURCE_OF_WEALTH, RELATIONSHIP_TO_COUNTERPARTY, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';
import { colors, typography, spacing } from '../../styles/tokens';

interface SourceOfWealthSectionProps {
  payload:        SoWPayload;
  state:          SectionState;
  narrativeEdit:  string | undefined;       // overrides payload.narrative when set
  itemsEdit:      SourceOfWealthRow[] | undefined;
  onNarrativeChange: (next: string) => void;
  onRemoveRow:    (idx: number) => void;
  onTakeover:     () => void;
  lastRunAt?:     string;
  errorMsg?:      string;
}

export const SourceOfWealthSection: React.FC<SourceOfWealthSectionProps> = ({
  payload, state, narrativeEdit, itemsEdit, onNarrativeChange, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => {
  const items = itemsEdit ?? payload.items;
  const narrativeValue = narrativeEdit ?? payload.narrative ?? '';
  return (
    <ItemizedSection<SourceOfWealthRow>
      title="Source of Wealth"
      items={items}
      rowConfig={rowToCardConfig}
      state={state}
      onTakeover={onTakeover}
      onRemove={onRemoveRow}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      preListSlot={
        <div style={{ marginBottom: spacing.lg }}>
          <label style={{
            display:      'block',
            fontSize:     typography.fontSizeLabel,
            color:        colors.textSecondary,
            marginBottom: spacing.xs,
          }}>Source of Wealth narrative (parent field)</label>
          <AutoTextarea
            value={narrativeValue}
            onChange={onNarrativeChange}
            minRows={4}
            ariaLabel="Source of Wealth narrative"
          />
        </div>
      }
    />
  );
};

function rowToCardConfig(row: SourceOfWealthRow) {
  const amountSummary = row.syg_wealthgenerated
    ? `CHF ${formatSwissNumber(row.syg_wealthgenerated)}`
    : (row.syg_initialinvestment ? `CHF ${formatSwissNumber(row.syg_initialinvestment)}` : '');
  const categoryLabel = row.syg_sourceofwealth !== undefined ? getOptionLabel(SOURCE_OF_WEALTH, row.syg_sourceofwealth) : '';
  const subtitle = [categoryLabel, amountSummary].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Category',                 value: categoryLabel },
    { label: 'Description',              value: row.syg_description, wide: true },
    { label: 'Company',                  value: row.syg_companyname },
    { label: 'Counterparty',             value: row.syg_counterpartyname },
    { label: 'Relationship',             value: row.syg_relationshiptocounterparty !== undefined ? getOptionLabel(RELATIONSHIP_TO_COUNTERPARTY, row.syg_relationshiptocounterparty) : '' },
    { label: 'Business activity',        value: <LookupReadonly value={row.syg_businessactivityid} /> },
    { label: 'Country',                  value: <LookupReadonly value={row.syg_countryid} /> },
    { label: 'Year of generation',       value: <LookupReadonly value={row.syg_yearofwealthgenerationid} /> },
    { label: 'Year initiated',           value: <LookupReadonly value={row.syg_yearofwealthgenerationinitiatedid} /> },
    { label: 'Initial investment (CHF)', value: row.syg_initialinvestment !== undefined ? formatSwissNumber(row.syg_initialinvestment) : '' },
    { label: 'Wealth generated (CHF)',   value: row.syg_wealthgenerated !== undefined ? formatSwissNumber(row.syg_wealthgenerated) : '' },
    { label: 'Value at valuation date',  value: row.syg_valueatvaluationdate !== undefined ? formatSwissNumber(row.syg_valueatvaluationdate) : '' },
    { label: 'Valuation date',           value: row.syg_valuationdate ? formatSwissDate(row.syg_valuationdate) : '' },
    { label: 'Corroborated value',       value: row.syg_corroboratedvalue !== undefined ? formatSwissNumber(row.syg_corroboratedvalue) : '' },
    { label: 'Corroborated %',           value: row.syg_corroboratedpercentage !== undefined ? `${row.syg_corroboratedpercentage}%` : '' },
    { label: 'Rationale',                value: row.syg_rationale, wide: true },
    { label: 'Supporting information',   value: row.syg_supportinginformation, wide: true },
    { label: 'Additional details',       value: row.syg_additionaldetails, wide: true },
  ];

  return {
    title: row.syg_name ?? '(untitled)',
    subtitle,
    details,
  };
}
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/sections/SourceOfWealthSection.tsx
git commit -m "feat(kyc-full-takeover m5): SourceOfWealthSection (narrative + itemized cards)"
```

---

### Task 5: DetailedDAHoldingsSection

**Files:**
- Create: `KycFullTakeover/components/sections/DetailedDAHoldingsSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/DetailedDAHoldingsSection.tsx
// Detailed Digital Asset Holdings — itemized only (no narrative).

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetHoldingRow, SectionState } from '../../types';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';

interface DetailedDAHoldingsSectionProps {
  payload:     DigitalAssetHoldingRow[];
  state:       SectionState;
  itemsEdit:   DigitalAssetHoldingRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const DetailedDAHoldingsSection: React.FC<DetailedDAHoldingsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetHoldingRow>
    title="Detailed DA Holdings"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: DigitalAssetHoldingRow) {
  const subtitle = [
    row.syg_digitalassetid?.name,
    row.syg_amount !== undefined ? `${row.syg_amount}` : '',
    row.syg_currentvaluechf !== undefined ? `CHF ${formatSwissNumber(row.syg_currentvaluechf)}` : '',
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Asset',                    value: <LookupReadonly value={row.syg_digitalassetid} /> },
    { label: 'Amount',                   value: row.syg_amount !== undefined ? String(row.syg_amount) : '' },
    { label: 'Current value (CHF)',      value: row.syg_currentvaluechf !== undefined ? formatSwissNumber(row.syg_currentvaluechf) : '' },
    { label: 'Value (CHF)',              value: row.syg_valuechf !== undefined ? formatSwissNumber(row.syg_valuechf) : '' },
    { label: 'Date of valuation',        value: row.syg_dateofvaluation ? formatSwissDate(row.syg_dateofvaluation) : '' },
    { label: 'Acquiring year',           value: <LookupReadonly value={row.syg_acquiringyear} /> },
    { label: 'Acquiring place',          value: row.syg_acquiringplace },
    { label: 'Avg acquiring price',      value: row.syg_averageacquiringprice !== undefined ? formatSwissNumber(row.syg_averageacquiringprice) : '' },
    { label: 'Corroborated amount',      value: row.syg_corroboratedamount !== undefined ? String(row.syg_corroboratedamount) : '' },
    { label: 'Corroborated value (CHF)', value: row.syg_corroboratedvalue !== undefined ? formatSwissNumber(row.syg_corroboratedvalue) : '' },
    { label: 'Current custody',          value: row.syg_currentcustody, wide: true },
    { label: 'Description',              value: row.syg_description, wide: true },
    { label: 'Origin of funds',          value: row.syg_originoffunds, wide: true },
    { label: 'Supporting documents',     value: row.syg_supportingdocuments, wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/sections/DetailedDAHoldingsSection.tsx
git commit -m "feat(kyc-full-takeover m5): DetailedDAHoldingsSection"
```

---

### Task 6: PlannedFiatFundsSection

**Files:**
- Create: `KycFullTakeover/components/sections/PlannedFiatFundsSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/PlannedFiatFundsSection.tsx
// Planned Fiat Funds — itemized. Each row is an upcoming inbound fiat
// transfer from the client.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { IncomingFiatFundRow, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber } from '../../utils/formatters';

interface PlannedFiatFundsSectionProps {
  payload:     IncomingFiatFundRow[];
  state:       SectionState;
  itemsEdit:   IncomingFiatFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedFiatFundsSection: React.FC<PlannedFiatFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<IncomingFiatFundRow>
    title="Planned Fiat Funds"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: IncomingFiatFundRow) {
  const subtitle = [
    row.syg_amount !== undefined ? `CHF ${formatSwissNumber(row.syg_amount)}` : '',
    row.syg_bank,
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Amount (CHF)',     value: row.syg_amount !== undefined ? formatSwissNumber(row.syg_amount) : '' },
    { label: 'Bank',             value: row.syg_bank },
    { label: 'Bank domicile',    value: <LookupReadonly value={row.syg_bankdomicileid} /> },
    { label: 'Client',           value: <LookupReadonly value={row.syg_clientid} /> },
    { label: 'Proof of ownership', value: row.syg_proofofownership === true ? 'Yes' : (row.syg_proofofownership === false ? 'No' : '') },
    { label: 'Transfer timeframe', value: row.syg_transfertimeframe !== undefined ? getOptionLabel(TRANSFER_TIMEFRAME, row.syg_transfertimeframe) : '' },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/sections/PlannedFiatFundsSection.tsx
git commit -m "feat(kyc-full-takeover m5): PlannedFiatFundsSection"
```

---

### Task 7: PlannedDAFundsSection

**Files:**
- Create: `KycFullTakeover/components/sections/PlannedDAFundsSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/PlannedDAFundsSection.tsx
// Planned Digital Asset Funds — itemized. Each row is an upcoming inbound
// DA transfer with first-transfer + current-value semantics.

import * as React from 'react';
import { ItemizedSection } from './ItemizedSection';
import { ItemizedCardDetail } from '../common/ItemizedCard';
import { LookupReadonly } from '../common/LookupReadonly';
import { DigitalAssetFundRow, SectionState } from '../../types';
import { TRANSFER_TIMEFRAME, getOptionLabel } from '../../utils/optionSets';
import { formatSwissNumber, formatSwissDate } from '../../utils/formatters';

interface PlannedDAFundsSectionProps {
  payload:     DigitalAssetFundRow[];
  state:       SectionState;
  itemsEdit:   DigitalAssetFundRow[] | undefined;
  onRemoveRow: (idx: number) => void;
  onTakeover:  () => void;
  lastRunAt?:  string;
  errorMsg?:   string;
}

export const PlannedDAFundsSection: React.FC<PlannedDAFundsSectionProps> = ({
  payload, state, itemsEdit, onRemoveRow, onTakeover, lastRunAt, errorMsg,
}) => (
  <ItemizedSection<DigitalAssetFundRow>
    title="Planned DA Funds"
    items={itemsEdit ?? payload}
    rowConfig={rowToCardConfig}
    state={state}
    onTakeover={onTakeover}
    onRemove={onRemoveRow}
    lastRunAt={lastRunAt}
    errorMsg={errorMsg}
  />
);

function rowToCardConfig(row: DigitalAssetFundRow) {
  const subtitle = [
    row.syg_firstdigitalassettransfertype?.name,
    row.syg_firstdigitalassettransferamount !== undefined ? String(row.syg_firstdigitalassettransferamount) : '',
    row.syg_firsttransferamount !== undefined ? `CHF ${formatSwissNumber(row.syg_firsttransferamount)}` : '',
  ].filter(Boolean).join(' • ');

  const details: ItemizedCardDetail[] = [
    { label: 'Customer',                   value: <LookupReadonly value={row.syg_customerid} /> },
    { label: 'First transfer asset',       value: <LookupReadonly value={row.syg_firstdigitalassettransfertype} /> },
    { label: 'First DA transfer amount',   value: row.syg_firstdigitalassettransferamount !== undefined ? String(row.syg_firstdigitalassettransferamount) : '' },
    { label: 'First transfer (CHF)',       value: row.syg_firsttransferamount !== undefined ? formatSwissNumber(row.syg_firsttransferamount) : '' },
    { label: 'Current value (CHF)',        value: row.syg_currentvaluechf !== undefined ? formatSwissNumber(row.syg_currentvaluechf) : '' },
    { label: 'Value (CHF)',                value: row.syg_valuechf !== undefined ? formatSwissNumber(row.syg_valuechf) : '' },
    { label: 'Date of valuation',          value: row.syg_dateofvaluation ? formatSwissDate(row.syg_dateofvaluation) : '' },
    { label: 'Proof of ownership',         value: row.syg_proofofownership === true ? 'Yes' : (row.syg_proofofownership === false ? 'No' : '') },
    { label: 'Sender wallet',              value: row.syg_senderwallet, wide: true },
    { label: 'Source',                     value: row.syg_source },
    { label: 'Transfer timeframe',         value: row.syg_transfertimeframe !== undefined ? getOptionLabel(TRANSFER_TIMEFRAME, row.syg_transfertimeframe) : '' },
    { label: 'Remarks',                    value: row.syg_remarks, wide: true },
    { label: 'Comment',                    value: row.syg_comment, wide: true },
    { label: 'Additional expected funding', value: row.syg_additionalexpectedfunding, wide: true },
  ];

  return { title: row.syg_name ?? '(untitled)', subtitle, details };
}
```

- [ ] **Step 2: Verify TS compiles + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json
git add KycFullTakeover/components/sections/PlannedDAFundsSection.tsx
git commit -m "feat(kyc-full-takeover m5): PlannedDAFundsSection"
```

---

### Task 8: Wire 4 sections + takeoverItemized handler in root

**Files:**
- Modify: `KycFullTakeover/components/KycFullTakeover.tsx`

- [ ] **Step 1: Add the new imports**

At the top of the file, alongside other section imports:

```tsx
import { SourceOfWealthSection } from './sections/SourceOfWealthSection';
import { DetailedDAHoldingsSection } from './sections/DetailedDAHoldingsSection';
import { PlannedFiatFundsSection } from './sections/PlannedFiatFundsSection';
import { PlannedDAFundsSection } from './sections/PlannedDAFundsSection';
import {
  SourceOfWealthRow, DigitalAssetHoldingRow, IncomingFiatFundRow, DigitalAssetFundRow,
} from '../types';
```

Update the dataverse import to include `createChildren`:

```tsx
import { patchKycProfile, associateRecords, createChildren } from '../utils/dataverse';
```

- [ ] **Step 2: Extend `EditState`**

Find the `interface EditState {` block. Add these properties before its closing brace:

```tsx
  sourceOfWealth?: { narrative?: string; items?: SourceOfWealthRow[] };
  detailedDAHoldings?: DigitalAssetHoldingRow[];
  plannedFiatFunds?:    IncomingFiatFundRow[];
  plannedDAFunds?:      DigitalAssetFundRow[];
```

- [ ] **Step 3: Add the `takeoverItemized` handler**

Inside the component, after the existing `takeoverNN` definition, add:

```tsx
// Itemized child-record creation. Each row is converted to its OData write
// payload by the caller-supplied `rowToFields`. Optional `parentPatch` runs
// before the row creates (Source of Wealth section uses this for the
// narrative). Already-existing rows from a previous run are NOT detected
// here — re-running an itemized takeover produces duplicate child records.
// The confirmation dialog's re-run modifier already warns about this.
const takeoverItemized = async <T,>(
  id:                 SectionId,
  sectionLabel:       string,
  entityLabel:        string,
  entitySetName:      string,
  parentBindKey:      string,                            // e.g. 'syg_kycprofileid@odata.bind'
  rows:               T[],
  rowToFields:        (row: T) => Record<string, unknown>,
  rowToName:          (row: T) => string,
  parentPatch?:       Record<string, unknown>,
) => {
  const current = statusBlob.sections[id];
  const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

  const ok = await showConfirmation({
    type: 'itemized',
    sectionLabel,
    entityLabel,
    itemCount: rows.length,
    isReRun,
  });
  if (!ok) return;

  // Stage 1: parent PATCH (e.g. Source of Wealth narrative) if provided
  if (parentPatch && Object.keys(parentPatch).length > 0) {
    const parentResult = await patchKycProfile(webAPI, kycProfileId, parentPatch);
    if (!parentResult.ok) {
      persistStatus(setSectionState(statusBlob, id, {
        state:       'partial-failed',
        lastRunAt:   new Date().toISOString(),
        result:      { patched: 0, created: 0, failed: 1 },
        errors:      [{ message: `parent patch failed: ${parentResult.error ?? 'unknown'}` }],
        payloadHash: hashSlice({ parentPatch, rows }),
      }));
      return;
    }
  }

  // Stage 2: child POSTs in parallel
  const fields = rows.map((r) => ({
    [parentBindKey]: `/syg_kycprofiles(${kycProfileId})`,
    ...rowToFields(r),
  }));
  const names = rows.map((r) => rowToName(r));
  const result = await createChildren(entitySetName, fields, names);

  const record: SectionStatusRecord = result.failed === 0
    ? {
        state:       'done',
        lastRunAt:   new Date().toISOString(),
        result:      { created: result.created, patched: parentPatch ? 1 : 0 },
        payloadHash: hashSlice({ parentPatch, rows }),
      }
    : {
        state:       'partial-failed',
        lastRunAt:   new Date().toISOString(),
        result:      { created: result.created, failed: result.failed, patched: parentPatch ? 1 : 0 },
        errors:      result.errors.map((e) => ({
          rowIndex: e.rowIndex,
          message:  `${e.rowName ?? '(unnamed row)'}: ${shortenErrorMessage(e.message)}`,
        })),
        payloadHash: hashSlice({ parentPatch, rows }),
      };
  persistStatus(setSectionState(statusBlob, id, record));
};
```

Note: this function uses TypeScript generics (`<T>` after the `=`). The `<T,>` syntax (with the trailing comma) is required to disambiguate from JSX in `.tsx` files. Don't drop the comma.

- [ ] **Step 4: Add 4 row-to-fields builders inside the component (before the JSX return)**

```tsx
const buildSourceOfWealthRow = (r: SourceOfWealthRow): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.syg_name !== undefined)                   out['syg_name']                                  = r.syg_name;
  if (r.syg_sourceofwealth !== undefined)         out['syg_sourceofwealth']                        = r.syg_sourceofwealth;
  if (r.syg_description !== undefined)            out['syg_description']                           = r.syg_description;
  if (r.syg_companyname !== undefined)            out['syg_companyname']                           = r.syg_companyname;
  if (r.syg_counterpartyname !== undefined)       out['syg_counterpartyname']                      = r.syg_counterpartyname;
  if (r.syg_relationshiptocounterparty !== undefined) out['syg_relationshiptocounterparty']        = r.syg_relationshiptocounterparty;
  if (r.syg_businessactivityid?.id)               out['syg_businessactivityid@odata.bind']         = `/syg_businessactivitieses(${r.syg_businessactivityid.id})`;
  if (r.syg_countryid?.id)                        out['syg_countryid@odata.bind']                  = `/syg_countries(${r.syg_countryid.id})`;
  if (r.syg_yearofwealthgenerationid?.id)         out['syg_yearofwealthgenerationid@odata.bind']   = `/syg_years(${r.syg_yearofwealthgenerationid.id})`;
  if (r.syg_yearofwealthgenerationinitiatedid?.id) out['syg_yearofwealthgenerationinitiatedid@odata.bind'] = `/syg_years(${r.syg_yearofwealthgenerationinitiatedid.id})`;
  if (r.syg_initialinvestment !== undefined)      out['syg_initialinvestment']                     = r.syg_initialinvestment;
  if (r.syg_valueatvaluationdate !== undefined)   out['syg_valueatvaluationdate']                  = r.syg_valueatvaluationdate;
  if (r.syg_valuationdate)                        out['syg_valuationdate']                         = r.syg_valuationdate;
  if (r.syg_wealthgenerated !== undefined)        out['syg_wealthgenerated']                       = r.syg_wealthgenerated;
  if (r.syg_corroboratedvalue !== undefined)      out['syg_corroboratedvalue']                     = r.syg_corroboratedvalue;
  if (r.syg_corroboratedpercentage !== undefined) out['syg_corroboratedpercentage']                = r.syg_corroboratedpercentage;
  if (r.syg_rationale !== undefined)              out['syg_rationale']                             = r.syg_rationale;
  if (r.syg_supportinginformation !== undefined)  out['syg_supportinginformation']                 = r.syg_supportinginformation;
  if (r.syg_additionaldetails !== undefined)      out['syg_additionaldetails']                     = r.syg_additionaldetails;
  return out;
};

const buildDigitalAssetHoldingRow = (r: DigitalAssetHoldingRow): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.syg_name !== undefined)                  out['syg_name']                            = r.syg_name;
  if (r.syg_digitalassetid?.id)                  out['syg_digitalassetid@odata.bind']       = `/syg_digitalassetcurrencies(${r.syg_digitalassetid.id})`;
  if (r.syg_amount !== undefined)                out['syg_amount']                          = r.syg_amount;
  if (r.syg_currentvaluechf !== undefined)       out['syg_currentvaluechf']                 = r.syg_currentvaluechf;
  if (r.syg_valuechf !== undefined)              out['syg_valuechf']                        = r.syg_valuechf;
  if (r.syg_dateofvaluation)                     out['syg_dateofvaluation']                 = r.syg_dateofvaluation;
  if (r.syg_acquiringyear?.id)                   out['syg_acquiringyear@odata.bind']        = `/syg_years(${r.syg_acquiringyear.id})`;
  if (r.syg_acquiringplace !== undefined)        out['syg_acquiringplace']                  = r.syg_acquiringplace;
  if (r.syg_averageacquiringprice !== undefined) out['syg_averageacquiringprice']           = r.syg_averageacquiringprice;
  if (r.syg_corroboratedamount !== undefined)    out['syg_corroboratedamount']              = r.syg_corroboratedamount;
  if (r.syg_corroboratedamountchf !== undefined) out['syg_corroboratedamountchf']           = r.syg_corroboratedamountchf;
  if (r.syg_corroboratedvalue !== undefined)     out['syg_corroboratedvalue']               = r.syg_corroboratedvalue;
  if (r.syg_currentcustody !== undefined)        out['syg_currentcustody']                  = r.syg_currentcustody;
  if (r.syg_description !== undefined)           out['syg_description']                     = r.syg_description;
  if (r.syg_originoffunds !== undefined)         out['syg_originoffunds']                   = r.syg_originoffunds;
  if (r.syg_supportingdocuments !== undefined)   out['syg_supportingdocuments']             = r.syg_supportingdocuments;
  return out;
};

const buildIncomingFiatFundRow = (r: IncomingFiatFundRow): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.syg_name !== undefined)               out['syg_name']                          = r.syg_name;
  if (r.syg_amount !== undefined)             out['syg_amount']                        = r.syg_amount;
  if (r.syg_bank !== undefined)               out['syg_bank']                          = r.syg_bank;
  if (r.syg_bankdomicileid?.id)               out['syg_bankdomicileid@odata.bind']     = `/syg_countries(${r.syg_bankdomicileid.id})`;
  if (r.syg_clientid?.id) {
    const set = r.syg_clientid.etn === 'account' ? 'accounts' : 'contacts';
    const key = r.syg_clientid.etn === 'account' ? 'syg_clientid_account@odata.bind' : 'syg_clientid_contact@odata.bind';
    out[key] = `/${set}(${r.syg_clientid.id})`;
  }
  if (r.syg_proofofownership !== undefined)   out['syg_proofofownership']              = r.syg_proofofownership;
  if (r.syg_transfertimeframe !== undefined)  out['syg_transfertimeframe']             = r.syg_transfertimeframe;
  return out;
};

const buildDigitalAssetFundRow = (r: DigitalAssetFundRow): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.syg_name !== undefined)                            out['syg_name']                                  = r.syg_name;
  if (r.syg_customerid?.id) {
    const set = r.syg_customerid.etn === 'account' ? 'accounts' : 'contacts';
    const key = r.syg_customerid.etn === 'account' ? 'syg_customerid_account@odata.bind' : 'syg_customerid_contact@odata.bind';
    out[key] = `/${set}(${r.syg_customerid.id})`;
  }
  if (r.syg_firstdigitalassettransfertype?.id)             out['syg_firstdigitalassettransfertype@odata.bind'] = `/syg_digitalassetcurrencies(${r.syg_firstdigitalassettransfertype.id})`;
  if (r.syg_firstdigitalassettransferamount !== undefined) out['syg_firstdigitalassettransferamount']      = r.syg_firstdigitalassettransferamount;
  if (r.syg_firsttransferamount !== undefined)             out['syg_firsttransferamount']                  = r.syg_firsttransferamount;
  if (r.syg_currentvaluechf !== undefined)                 out['syg_currentvaluechf']                      = r.syg_currentvaluechf;
  if (r.syg_valuechf !== undefined)                        out['syg_valuechf']                             = r.syg_valuechf;
  if (r.syg_dateofvaluation)                               out['syg_dateofvaluation']                      = r.syg_dateofvaluation;
  if (r.syg_proofofownership !== undefined)                out['syg_proofofownership']                     = r.syg_proofofownership;
  if (r.syg_senderwallet !== undefined)                    out['syg_senderwallet']                         = r.syg_senderwallet;
  if (r.syg_senderwallet_optionset !== undefined)          out['syg_senderwallet_optionset']               = r.syg_senderwallet_optionset;
  if (r.syg_source !== undefined)                          out['syg_source']                               = r.syg_source;
  if (r.syg_transfertimeframe !== undefined)               out['syg_transfertimeframe']                    = r.syg_transfertimeframe;
  if (r.syg_remarks !== undefined)                         out['syg_remarks']                              = r.syg_remarks;
  if (r.syg_comment !== undefined)                         out['syg_comment']                              = r.syg_comment;
  if (r.syg_additionalexpectedfunding !== undefined)       out['syg_additionalexpectedfunding']            = r.syg_additionalexpectedfunding;
  return out;
};
```

> **Entity-set caveats:** Several lookup writes use entity-set names that are best-guess pluralisations of entities not in the SygnumKYC dump:
> - `syg_countries` (`syg_country`) — same risk as M3 / M4. If smoke test errors with "EntitySet not found", use the DevTools snippet to discover the real name.
> - `syg_years` (`syg_year`) — agent's year-of-wealth-generation lookups land here.
> - `syg_digitalassetcurrencies` (`syg_digitalassetcurrency`) — DA tickers/coins.
> - `accounts`, `contacts` — Customer lookup targets. These are standard Dataverse entity sets and should not error.
> Document each "EntitySet not found" finding here as it surfaces.

- [ ] **Step 5: Replace the 4 PlaceholderSection lines**

Find each line below and replace it.

**`<div id="section-sourceOfWealth">         <PlaceholderSection title="Source of Wealth"        milestone="M5" /></div>`** →

```tsx
{payload.sourceOfWealth && (() => {
  const itemsEdit = edits.sourceOfWealth?.items;
  const items = itemsEdit ?? payload.sourceOfWealth.items;
  return (
    <div id="section-sourceOfWealth">
      <SourceOfWealthSection
        payload={payload.sourceOfWealth}
        state={(edits.sourceOfWealth !== undefined && statusBlob.sections.sourceOfWealth?.state !== 'done')
          ? 'edited'
          : sectionState('sourceOfWealth', true)}
        narrativeEdit={edits.sourceOfWealth?.narrative}
        itemsEdit={itemsEdit}
        onNarrativeChange={(next) => setEdits((p) => ({
          ...p,
          sourceOfWealth: { ...(p.sourceOfWealth ?? {}), narrative: next },
        }))}
        onRemoveRow={(idx) => setEdits((p) => ({
          ...p,
          sourceOfWealth: { ...(p.sourceOfWealth ?? {}), items: items.filter((_, i) => i !== idx) },
        }))}
        onTakeover={() => takeoverItemized<SourceOfWealthRow>(
          'sourceOfWealth',
          'Source of Wealth',
          'Source of Wealth',
          'syg_sourceofwealths',
          'syg_kycprofileid@odata.bind',
          items,
          buildSourceOfWealthRow,
          (r) => r.syg_name ?? '(untitled)',
          (() => {
            const narrative = edits.sourceOfWealth?.narrative ?? payload.sourceOfWealth?.narrative;
            return narrative !== undefined ? { syg_sourceofwealthdetails: narrative } : undefined;
          })(),
        )}
        lastRunAt={statusBlob.sections.sourceOfWealth?.lastRunAt}
        errorMsg={statusBlob.sections.sourceOfWealth?.errors?.[0]?.message}
      />
    </div>
  );
})()}
```

**`<div id="section-detailedDAHoldings">    <PlaceholderSection title="Detailed DA Holdings" milestone="M5" /></div>`** →

```tsx
{payload.detailedDAHoldings && (() => {
  const items = edits.detailedDAHoldings ?? payload.detailedDAHoldings;
  return (
    <div id="section-detailedDAHoldings">
      <DetailedDAHoldingsSection
        payload={payload.detailedDAHoldings}
        state={(edits.detailedDAHoldings !== undefined && statusBlob.sections.detailedDAHoldings?.state !== 'done')
          ? 'edited'
          : sectionState('detailedDAHoldings', true)}
        itemsEdit={edits.detailedDAHoldings}
        onRemoveRow={(idx) => setEdits((p) => ({
          ...p,
          detailedDAHoldings: items.filter((_, i) => i !== idx),
        }))}
        onTakeover={() => takeoverItemized<DigitalAssetHoldingRow>(
          'detailedDAHoldings',
          'Detailed DA Holdings',
          'DA Holding',
          'syg_digitalassetsholdings',
          'syg_KYCProfileID@odata.bind',
          items,
          buildDigitalAssetHoldingRow,
          (r) => r.syg_name ?? '(untitled)',
        )}
        lastRunAt={statusBlob.sections.detailedDAHoldings?.lastRunAt}
        errorMsg={statusBlob.sections.detailedDAHoldings?.errors?.[0]?.message}
      />
    </div>
  );
})()}
```

**`<div id="section-plannedFiatFunds"> <PlaceholderSection title="Planned Fiat Funds" milestone="M5" /></div>`** →

```tsx
{payload.plannedFiatFunds && (() => {
  const items = edits.plannedFiatFunds ?? payload.plannedFiatFunds;
  return (
    <div id="section-plannedFiatFunds">
      <PlannedFiatFundsSection
        payload={payload.plannedFiatFunds}
        state={(edits.plannedFiatFunds !== undefined && statusBlob.sections.plannedFiatFunds?.state !== 'done')
          ? 'edited'
          : sectionState('plannedFiatFunds', true)}
        itemsEdit={edits.plannedFiatFunds}
        onRemoveRow={(idx) => setEdits((p) => ({
          ...p,
          plannedFiatFunds: items.filter((_, i) => i !== idx),
        }))}
        onTakeover={() => takeoverItemized<IncomingFiatFundRow>(
          'plannedFiatFunds',
          'Planned Fiat Funds',
          'Fiat Fund',
          'syg_incomingfiatfundses',
          'syg_kycprofileid@odata.bind',
          items,
          buildIncomingFiatFundRow,
          (r) => r.syg_name ?? '(untitled)',
        )}
        lastRunAt={statusBlob.sections.plannedFiatFunds?.lastRunAt}
        errorMsg={statusBlob.sections.plannedFiatFunds?.errors?.[0]?.message}
      />
    </div>
  );
})()}
```

**`<div id="section-plannedDAFunds">   <PlaceholderSection title="Planned DA Funds"   milestone="M5" /></div>`** →

```tsx
{payload.plannedDAFunds && (() => {
  const items = edits.plannedDAFunds ?? payload.plannedDAFunds;
  return (
    <div id="section-plannedDAFunds">
      <PlannedDAFundsSection
        payload={payload.plannedDAFunds}
        state={(edits.plannedDAFunds !== undefined && statusBlob.sections.plannedDAFunds?.state !== 'done')
          ? 'edited'
          : sectionState('plannedDAFunds', true)}
        itemsEdit={edits.plannedDAFunds}
        onRemoveRow={(idx) => setEdits((p) => ({
          ...p,
          plannedDAFunds: items.filter((_, i) => i !== idx),
        }))}
        onTakeover={() => takeoverItemized<DigitalAssetFundRow>(
          'plannedDAFunds',
          'Planned DA Funds',
          'DA Fund',
          'syg_digitalassetfundses',
          'syg_kycprofileid@odata.bind',
          items,
          buildDigitalAssetFundRow,
          (r) => r.syg_name ?? '(untitled)',
        )}
        lastRunAt={statusBlob.sections.plannedDAFunds?.lastRunAt}
        errorMsg={statusBlob.sections.plannedDAFunds?.errors?.[0]?.message}
      />
    </div>
  );
})()}
```

- [ ] **Step 6: Verify TS compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json`
Expected: exit 0.

If errors related to the generic syntax `takeoverItemized<T,>` come up, double-check the comma after `T` — it disambiguates from JSX. If the helper returns `Promise<void>` and TS complains about unused, ignore.

- [ ] **Step 7: Commit**

```bash
git add KycFullTakeover/components/KycFullTakeover.tsx
git commit -m "feat(kyc-full-takeover m5): wire 4 itemized sections + takeoverItemized handler"
```

---

### Task 9: Production build smoke check

**Files:** none — verification only.

- [ ] **Step 1: Clean rebuild**

Run: `cd KycFullTakeover && npm run rebuild`
Expected: webpack succeeds. Bundle size will grow (~10-15 KB for 4 new sections + helpers).

- [ ] **Step 2: All tests pass**

Run: `cd KycFullTakeover && npm test`
Expected: 66 (M4) + 6 (Task 1's `isInvalidPropertyError` cases) = 72 passing tests, 8 suites.

- [ ] **Step 3: Strict TypeScript check**

Run: `cd KycFullTakeover && npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

If any check fails, escalate as BLOCKED.

---

### Task 10: WRITTEN_FIELDS.md update

**Files:**
- Modify: `KycFullTakeover/WRITTEN_FIELDS.md`

- [ ] **Step 1: Update the Phase 1 heading**

Replace `## Phase 1 (v0.3.0 — current)` with `## Phase 1 (v0.4.0 — current)`.

- [ ] **Step 2: Add 4 rows to the Phase 1 table, just before the Adverse Media row (or wherever fits the existing ordering)**

```
| Source of Wealth | `syg_sourceofwealth` (POST per row) + `syg_kycprofile.syg_sourceofwealthdetails` (parent PATCH) | `syg_name`, `syg_sourceofwealth` (picklist), `syg_description`, `syg_companyname`, `syg_counterpartyname`, `syg_relationshiptocounterparty` (picklist), `syg_businessactivityid@odata.bind`, `syg_countryid@odata.bind`, `syg_yearofwealthgenerationid@odata.bind`, `syg_yearofwealthgenerationinitiatedid@odata.bind`, `syg_initialinvestment`, `syg_valueatvaluationdate`, `syg_valuationdate`, `syg_wealthgenerated`, `syg_corroboratedvalue`, `syg_corroboratedpercentage`, `syg_rationale`, `syg_supportinginformation`, `syg_additionaldetails` | POST children + PATCH parent |
| Detailed DA Holdings | `syg_DigitalAssetsHolding` (POST per row) | `syg_name`, `syg_digitalassetid@odata.bind`, `syg_amount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_acquiringyear@odata.bind`, `syg_acquiringplace`, `syg_averageacquiringprice`, `syg_corroboratedamount`, `syg_corroboratedamountchf`, `syg_corroboratedvalue`, `syg_currentcustody`, `syg_description`, `syg_originoffunds`, `syg_supportingdocuments` | POST children |
| Planned Fiat Funds | `syg_incomingfiatfunds` (POST per row) | `syg_name`, `syg_amount`, `syg_bank`, `syg_bankdomicileid@odata.bind`, `syg_clientid_account@odata.bind` OR `syg_clientid_contact@odata.bind`, `syg_proofofownership`, `syg_transfertimeframe` | POST children |
| Planned DA Funds | `syg_digitalassetfunds` (POST per row) | `syg_name`, `syg_customerid_account@odata.bind` OR `syg_customerid_contact@odata.bind`, `syg_firstdigitalassettransfertype@odata.bind`, `syg_firstdigitalassettransferamount`, `syg_firsttransferamount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_proofofownership`, `syg_senderwallet`, `syg_senderwallet_optionset` (picklist), `syg_source`, `syg_transfertimeframe` (picklist), `syg_remarks`, `syg_comment`, `syg_additionalexpectedfunding` | POST children |
```

- [ ] **Step 3: Update the Phase 2 heading**

Replace `## Phase 2 (planned — M5-M6)` with `## Phase 2 (planned — M6)`. In the table below it, delete the M5 row.

- [ ] **Step 4: Commit**

```bash
git add KycFullTakeover/WRITTEN_FIELDS.md
git commit -m "docs(kyc-full-takeover m5): document the 4 itemized sections"
```

---

### Task 11: Bump 0.3.1 → 0.4.0, repackage, ship

**Files:**
- Modify: `KycFullTakeover/ControlManifest.Input.xml`
- Modify: `Solution/kft-pack/solution.xml`
- Modify: `Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js` (rebuilt)
- Modify: `Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml` (rebuilt)

- [ ] **Step 1: Bump control manifest**

Edit `KycFullTakeover/ControlManifest.Input.xml`. Change:
```xml
<control namespace="Syg" constructor="KycFullTakeover" version="0.3.1"
```
to:
```xml
<control namespace="Syg" constructor="KycFullTakeover" version="0.4.0"
```

- [ ] **Step 2: Bump solution.xml**

Edit `Solution/kft-pack/solution.xml`. Change `<Version>0.3.1</Version>` to `<Version>0.4.0</Version>`.

- [ ] **Step 3: Build the control**

Run: `cd KycFullTakeover && npm run rebuild`
Expected: webpack succeeds.

- [ ] **Step 4: Copy build outputs into kft-pack**

```bash
cp KycFullTakeover/out/controls/bundle.js           Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js
cp KycFullTakeover/out/controls/ControlManifest.xml Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml
```

- [ ] **Step 5: Verify**

Run: `grep -oE 'constructor="[^"]+" version="[^"]+"' Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml | head -1`
Expected: `constructor="KycFullTakeover" version="0.4.0"`

- [ ] **Step 6: Build the solution zip**

```bash
cd Solution/kft-pack
rm -f ../bin/Release/SygnumKycFullTakeover_0.4.0.zip
zip -rq ../bin/Release/SygnumKycFullTakeover_0.4.0.zip \
  solution.xml customizations.xml '[Content_Types].xml' Controls/ \
  -x "*.DS_Store"
ls -la ../bin/Release/SygnumKycFullTakeover_0.4.0.zip
```

Expected: a valid zip ~80-90 KB.

- [ ] **Step 7: Commit**

```bash
git add KycFullTakeover/ControlManifest.Input.xml Solution/kft-pack/solution.xml Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml
git commit -m "feat(kyc-full-takeover): v0.4.0 - M5 (4 itemized sections)"
```

---

## Self-Review

**Spec coverage:**
- ✓ Source of Wealth → Tasks 4, 8 (with parent-PATCH for narrative)
- ✓ Detailed DA Holdings → Tasks 5, 8
- ✓ Planned Fiat Funds → Task 6, 8
- ✓ Planned DA Funds → Task 7, 8
- ✓ Polymorphic Customer lookups (`syg_clientid` / `syg_customerid` pick `_account` or `_contact` suffix) → Task 8 row builders
- ✓ Itemized confirmation dialog uses `itemized` template (already exists in foundation `confirmationDialog.ts`)
- ✓ Re-run modifier ("creates duplicates") fires automatically when state is `done`/`partial-failed`
- ✓ × remove on rows, hidden after `done` → Task 2 (`canRemove` prop)
- ✓ Source of Wealth narrative above cards → Task 4's `preListSlot`
- ✓ Single takeover button per section (PATCH+POST atomic for SoW) → Task 8's `takeoverItemized` parentPatch parameter
- ✓ WRITTEN_FIELDS doc updated → Task 10
- ✓ Solution packaging → Task 11

**Placeholder scan:** No "TBD" / "TODO" / "implement later". Entity-set caveats are documented risks with mitigation, not placeholders.

**Type consistency:**
- `CreateChildrenResult` declared in Task 1, consumed in Task 8's `takeoverItemized` (`result.failed`, `result.created`, `result.errors`).
- `ItemizedCardDetail` declared in Task 2, consumed in Tasks 4-7 row adapters.
- `ItemizedRowConfig` declared in Task 3, returned by all 4 section files.
- `SourceOfWealthRow`, `DigitalAssetHoldingRow`, `IncomingFiatFundRow`, `DigitalAssetFundRow` from `types.ts` (foundation) flow through every layer.
- `EditState` extension in Task 8 references the same row types.

---

## D365 smoke test (manual, after Task 11)

1. Import `SygnumKycFullTakeover_0.4.0.zip` over 0.3.1.
2. Hard-refresh the form.
3. Open a KYC profile whose payload contains all 4 itemized sections populated.
4. Verify each section renders a list of expandable cards. Click a card header → details expand. Click again → collapse.
5. Hover a card. Click × → row disappears, status flips to `edited`, count updates.
6. Click "Take over (N)" on Source of Wealth. Confirmation dialog says "Create N Source of Wealth record(s)?". Confirm. Wait. Section flips to `done` (or `partial-failed` with an error subtitle naming the failing rows).
7. Open the parent profile's Source of Wealth subgrid in the standard form view → the new rows should be there. Open the parent profile's `syg_sourceofwealthdetails` field → narrative should be the agent's text.
8. Repeat for Detailed DA Holdings, Planned Fiat Funds, Planned DA Funds.
9. Re-run any of the 4 sections. Confirmation dialog adds the duplicate-warning modifier. Confirm — Dataverse will create duplicate rows (these aren't N:N; they're itemized child records).

If errors surface: paste the error message + section, ship 0.4.x with the entity-set fix.

---

## Future milestones (deferred)

| Milestone | Scope | Estimate |
|---|---|---|
| **M6** | Related Parties (itemized + two-stage write for new contacts/accounts with `new_typeofcontact = 9`) | ~15 tasks |

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-08-kycfulltakeover-m5.md`. 11 tasks covering helper, generic components, 4 sections, wiring, smoke check, docs, and ship.

Per auto mode + the established pattern from foundation/M3/M4, defaulting to inline execution unless the user overrides.
