# EDD Findings Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PCF dataset control that displays EDD Finding records as expandable document-style cards with rich text support, replacing the standard Dynamics 365 subgrid on the KYC Profile form.

**Architecture:** Full rewrite of the existing scaffold. Utilities built first (no dependencies), then components bottom-up (leaf to container), then PCF entry point wired last. Each task produces a working file that can be verified independently. The control uses React 18 `createRoot`, Fluent UI v9 styled to D365 conventions, and DOMPurify for HTML sanitization.

**Tech Stack:** React 18, TypeScript, Fluent UI v9, DOMPurify, PCF dataset control API

**Spec:** `docs/superpowers/specs/2026-04-02-edd-findings-viewer-design.md`

---

## File Map

### Delete (existing scaffold — full rewrite)
All files under `EddFindingsViewer/` will be replaced. The directory structure is preserved.

### Create / Rewrite

| File | Responsibility |
|---|---|
| `EddFindingsViewer/package.json` | Dependencies: react 18, fluent ui v9, dompurify |
| `EddFindingsViewer/tsconfig.json` | TypeScript config extending pcf-scripts base |
| `EddFindingsViewer/ControlManifest.Input.xml` | PCF manifest with `data-set` binding, WebAPI feature |
| `EddFindingsViewer/EddFindingsViewer.pcfproj` | MSBuild project file |
| `EddFindingsViewer/.eslintrc.json` | Linting rules |
| `EddFindingsViewer/generated/ManifestTypes.d.ts` | Type defs for IInputs/IOutputs |
| `EddFindingsViewer/utils/optionSetColors.ts` | Risk severity + status color maps (D365 palette) |
| `EddFindingsViewer/utils/htmlHelpers.ts` | `stripHtml()` (DOM-based) + `sanitizeHtml()` (DOMPurify) |
| `EddFindingsViewer/utils/metadataHelpers.ts` | Auto-discover additional dataset columns for dynamic footer |
| `EddFindingsViewer/utils/datasetHelpers.ts` | Extract typed `FindingRecord[]` from PCF dataset API |
| `EddFindingsViewer/styles/tokens.ts` | Fluent UI `makeStyles` with D365 design tokens |
| `EddFindingsViewer/styles/richText.ts` | Scoped CSS for sanitized rich text content |
| `EddFindingsViewer/components/EmptyState.tsx` | Zero-records view with icon and message |
| `EddFindingsViewer/components/HeaderBar.tsx` | Title + count badge + New Finding button |
| `EddFindingsViewer/components/FindingCard.tsx` | Card: collapsed preview + expanded rich content + metadata footer |
| `EddFindingsViewer/components/EddFindingsContainer.tsx` | Top-level: FluentProvider, accordion state, lookup resolution, orchestration |
| `EddFindingsViewer/index.ts` | PCF lifecycle: init, updateView (React 18 createRoot), destroy |

---

## Task 1: Project Foundation

**Files:**
- Rewrite: `EddFindingsViewer/package.json`
- Rewrite: `EddFindingsViewer/ControlManifest.Input.xml`
- Rewrite: `EddFindingsViewer/generated/ManifestTypes.d.ts`
- Keep as-is: `EddFindingsViewer/EddFindingsViewer.pcfproj`
- Keep as-is: `EddFindingsViewer/.eslintrc.json`
- Keep as-is: `EddFindingsViewer/tsconfig.json`

- [ ] **Step 1: Rewrite `package.json` with DOMPurify added**

```json
{
  "name": "edd-findings-viewer",
  "version": "1.0.0",
  "description": "PCF dataset control — EDD Finding cards for KYC Profile form",
  "scripts": {
    "build": "pcf-scripts build",
    "clean": "pcf-scripts clean",
    "lint": "eslint . --ext .ts,.tsx",
    "rebuild": "pcf-scripts clean && pcf-scripts build",
    "start": "pcf-scripts start watch"
  },
  "dependencies": {
    "@fluentui/react-components": "^9.46.0",
    "@fluentui/react-icons": "^2.0.200",
    "dompurify": "^3.2.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/dompurify": "^3.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "pcf-scripts": "^1",
    "pcf-start": "^1",
    "typescript": "^4.9.5"
  }
}
```

- [ ] **Step 2: Rewrite `ControlManifest.Input.xml`**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="EddFindingsViewer" version="1.0.0" display-name-key="EddFindingsViewer" description-key="Displays EDD Finding records as expandable cards" control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <data-set name="findings" display-name-key="EDD Findings Dataset" cds-data-set-options="displayCommandBar:false;displayViewSelector:false" />
    <resources>
      <code path="index.ts" order="1" />
      <platform-library name="React" version="18.2.0" />
      <platform-library name="Fluent" version="9.46.2" />
    </resources>
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
    </feature-usage>
  </control>
</manifest>
```

- [ ] **Step 3: Rewrite `generated/ManifestTypes.d.ts`**

```ts
export interface IInputs {
  findings: ComponentFramework.PropertyTypes.DataSet;
}

export interface IOutputs {}
```

- [ ] **Step 4: Commit foundation**

```bash
git add EddFindingsViewer/package.json EddFindingsViewer/ControlManifest.Input.xml EddFindingsViewer/generated/ManifestTypes.d.ts
git commit -m "feat: rewrite project foundation with DOMPurify dependency"
```

---

## Task 2: Color Maps (`optionSetColors.ts`)

**Files:**
- Rewrite: `EddFindingsViewer/utils/optionSetColors.ts`

- [ ] **Step 1: Rewrite with D365 palette and distinct High color**

```ts
/**
 * Risk severity and status color mapping — D365 palette.
 * Integer values must be verified against the actual OptionSet definition in Dataverse.
 */

interface BadgeColors {
  bg: string;
  text: string;
}

const FALLBACK_COLORS: BadgeColors = { bg: '#F3F2F1', text: '#605E5C' };

export const RISK_COLORS: Record<number, BadgeColors> = {
  1: { bg: '#DFF6DD', text: '#107C10' },  // Low — green
  2: { bg: '#FFF4CE', text: '#835B00' },  // Medium — amber
  3: { bg: '#FED9CC', text: '#C4441C' },  // High — orange
  4: { bg: '#FDE7E9', text: '#A4262C' },  // Critical — red
};

export const STATUS_COLORS: Record<number, BadgeColors> = {
  1: { bg: '#DEECF9', text: '#0078D4' },  // Open — blue
  2: { bg: '#DFF6DD', text: '#107C10' },  // Mitigated — green
  3: { bg: '#FFF4CE', text: '#835B00' },  // Accepted — amber
  4: { bg: '#F3F2F1', text: '#605E5C' },  // Closed — gray
};

export function getRiskColors(value: number | null): BadgeColors {
  if (value == null) return FALLBACK_COLORS;
  return RISK_COLORS[value] ?? FALLBACK_COLORS;
}

export function getStatusColors(value: number | null): BadgeColors {
  if (value == null) return FALLBACK_COLORS;
  return STATUS_COLORS[value] ?? FALLBACK_COLORS;
}
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/utils/optionSetColors.ts
git commit -m "feat: rewrite color maps with D365 palette and distinct severity colors"
```

---

## Task 3: HTML Helpers (`htmlHelpers.ts`)

**Files:**
- Create: `EddFindingsViewer/utils/htmlHelpers.ts`

- [ ] **Step 1: Write `stripHtml` and `sanitizeHtml`**

```ts
import DOMPurify from 'dompurify';

/**
 * Strip HTML tags to produce plain text for the collapsed card preview.
 * Uses DOM-based approach — never regex (malformed tags bypass naive patterns).
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() ?? '';
}

/**
 * Sanitize HTML for rendering in the expanded card.
 * See spec security decisions for rationale on each allowlist choice.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div', 'blockquote', 'pre', 'code',
      ],
      ALLOWED_ATTR: [
        'src', 'alt', 'title', 'class',
        'colspan', 'rowspan', 'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/)/i,
      ALLOW_DATA_ATTR: false,
    });
  } catch {
    // DOMPurify failure — fall back to plain text
    return stripHtml(html);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/utils/htmlHelpers.ts
git commit -m "feat: add HTML helpers — DOM-based strip and DOMPurify sanitization"
```

---

## Task 4: Metadata Helpers (`metadataHelpers.ts`)

**Files:**
- Create: `EddFindingsViewer/utils/metadataHelpers.ts`

- [ ] **Step 1: Write auto-discovery logic for Tier 2 footer fields**

```ts
/**
 * Columns already rendered elsewhere in the card — excluded from Tier 2 footer.
 */
const EXCLUDED_COLUMNS = new Set([
  'syg_name',
  'syg_description',
  'syg_riskseverity',
  'syg_status',
  'createdon',
  'syg_category',
  'createdby',
  'syg_linkedcondition',
  'modifiedon',
]);

export interface MetadataField {
  name: string;
  displayName: string;
}

/**
 * Discover additional columns in the dataset not already rendered in the card.
 * Returns label/name pairs for the dynamic metadata footer.
 */
export function getAdditionalColumns(
  columns: ComponentFramework.PropertyHelper.DataSetApi.Column[]
): MetadataField[] {
  return columns
    .filter((col) => !EXCLUDED_COLUMNS.has(col.name) && col.displayName)
    .map((col) => ({
      name: col.name,
      displayName: col.displayName,
    }));
}
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/utils/metadataHelpers.ts
git commit -m "feat: add metadata helpers for auto-discovered footer fields"
```

---

## Task 5: Dataset Helpers (`datasetHelpers.ts`)

**Files:**
- Rewrite: `EddFindingsViewer/utils/datasetHelpers.ts`

- [ ] **Step 1: Rewrite with `rawDescription` and `createdByName`**

```ts
export interface FindingRecord {
  id: string;
  name: string;
  categoryValue: number | null;
  categoryLabel: string;
  riskSeverityValue: number | null;
  riskSeverityLabel: string;
  rawDescription: string;
  statusValue: number | null;
  statusLabel: string;
  linkedConditionId: string | null;
  linkedConditionName: string | null;
  createdByName: string | null;
  createdOn: string;
  modifiedOn: string;
}

function getOptionSetValue(
  record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
  columnName: string
): number | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && raw !== null && 'Value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).Value as number;
  }
  const parsed = parseInt(String(raw), 10);
  return isNaN(parsed) ? null : parsed;
}

function getLookupId(
  record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
  columnName: string
): string | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null) {
    const lookup = raw as ComponentFramework.LookupValue;
    if (lookup.id) return lookup.id;
  }
  const str = String(raw);
  return str && str !== 'null' && str !== 'undefined' ? str : null;
}

export function extractRecords(
  dataset: ComponentFramework.PropertyTypes.DataSet
): FindingRecord[] {
  const records: FindingRecord[] = [];

  for (const recordId of dataset.sortedRecordIds) {
    const record = dataset.records[recordId];

    const linkedConditionFormatted = record.getFormattedValue('syg_linkedcondition');
    const linkedConditionId = getLookupId(record, 'syg_linkedcondition');

    records.push({
      id: recordId,
      name: record.getFormattedValue('syg_name') || String(record.getValue('syg_name') ?? ''),
      categoryValue: getOptionSetValue(record, 'syg_category'),
      categoryLabel: record.getFormattedValue('syg_category') || '',
      riskSeverityValue: getOptionSetValue(record, 'syg_riskseverity'),
      riskSeverityLabel: record.getFormattedValue('syg_riskseverity') || '',
      rawDescription: String(record.getValue('syg_description') ?? ''),
      statusValue: getOptionSetValue(record, 'syg_status'),
      statusLabel: record.getFormattedValue('syg_status') || '',
      linkedConditionId,
      linkedConditionName:
        linkedConditionFormatted && linkedConditionFormatted !== linkedConditionId
          ? linkedConditionFormatted
          : null,
      createdByName: record.getFormattedValue('createdby') || null,
      createdOn: record.getFormattedValue('createdon') || '',
      modifiedOn: record.getFormattedValue('modifiedon') || '',
    });
  }

  return records;
}
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/utils/datasetHelpers.ts
git commit -m "feat: rewrite dataset helpers with rawDescription and createdByName"
```

---

## Task 6: Styles — D365 Tokens (`tokens.ts`)

**Files:**
- Rewrite: `EddFindingsViewer/styles/tokens.ts`

- [ ] **Step 1: Rewrite with D365 design language**

All styles use D365 conventions: Segoe UI, 2px border-radius, D365 shadows. Separate `makeStyles` hooks per component for clarity. Four exported hooks: `useContainerStyles`, `useHeaderStyles`, `useEmptyStyles`, `useCardStyles`.

```ts
import { makeStyles, shorthands } from '@fluentui/react-components';

export const useContainerStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('0'),
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('40px', '16px'),
  },
  loadMoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.padding('8px', '0'),
  },
  loadMoreError: {
    color: '#A4262C',
    fontSize: '12px',
    marginTop: '4px',
    textAlign: 'center',
  },
});

export const useHeaderStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('12px', '16px', '8px', '16px'),
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  title: {
    fontSize: '14px',
    fontWeight: 600 as unknown as string,
    color: '#323130',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('1px', '8px'),
    ...shorthands.borderRadius('2px'),
    backgroundColor: '#E1DFDD',
    color: '#605E5C',
    fontSize: '12px',
    fontWeight: 600 as unknown as string,
    minWidth: '18px',
    textAlign: 'center',
  },
});

export const useEmptyStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('40px', '16px'),
    color: '#A19F9D',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  text: {
    fontSize: '13px',
    color: '#A19F9D',
  },
});

export const useCardStyles = makeStyles({
  card: {
    backgroundColor: '#fff',
    ...shorthands.border('1px', 'solid', '#edebe9'),
    ...shorthands.borderRadius('2px'),
    ...shorthands.margin('4px', '12px'),
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
    ...shorthands.overflow('hidden'),
  },
  cardExpanded: {
    ...shorthands.borderColor('#0078D4'),
  },
  headerArea: {
    ...shorthands.padding('12px', '16px', '0', '16px'),
    cursor: 'pointer',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('2px'),
    fontSize: '12px',
    fontWeight: 600 as unknown as string,
    whiteSpace: 'nowrap',
  },
  rightGroup: {
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'center',
  },
  chevron: {
    color: '#A19F9D',
    fontSize: '12px',
    transitionProperty: 'transform',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  titleRow: {
    ...shorthands.padding('8px', '0', '0', '0'),
  },
  titleLink: {
    fontWeight: 600 as unknown as string,
    fontSize: '14px',
    color: '#0078D4',
    cursor: 'pointer',
    textDecorationLine: 'none',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    ':hover': {
      textDecorationLine: 'underline',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
      outlineOffset: '1px',
    },
  },
  previewArea: {
    ...shorthands.padding('8px', '16px', '0', '16px'),
  },
  previewText: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#605E5C',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    ...shorthands.overflow('hidden'),
  },
  showMoreLink: {
    ...shorthands.padding('4px', '16px', '12px', '16px'),
  },
  showMoreButton: {
    color: '#0078D4',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    ':hover': {
      textDecorationLine: 'underline',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
      outlineOffset: '1px',
    },
  },
  expandedDescription: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#323130',
    ...shorthands.padding('8px', '16px', '0', '16px'),
  },
  metadataFooter: {
    ...shorthands.padding('12px', '16px', '14px', '16px'),
    marginTop: '10px',
    ...shorthands.borderTop('1px', 'solid', '#edebe9'),
  },
  metadataRow: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('16px'),
    fontSize: '12px',
    color: '#605E5C',
  },
  metadataLabel: {
    color: '#323130',
    fontWeight: 600 as unknown as string,
  },
  conditionLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecorationLine: 'underline',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    fontSize: '12px',
    ':hover': {
      color: '#106EBE',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/styles/tokens.ts
git commit -m "feat: rewrite styles with D365 design tokens"
```

---

## Task 7: Rich Text Styles (`richText.ts`)

**Files:**
- Create: `EddFindingsViewer/styles/richText.ts`

- [ ] **Step 1: Write scoped styles for sanitized rich text**

```ts
import { makeStyles, shorthands } from '@fluentui/react-components';

/**
 * Scoped styles applied to the container wrapping sanitized rich text HTML.
 * These ensure tables, images, and text elements render correctly within cards.
 */
export const useRichTextStyles = makeStyles({
  richTextContainer: {
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      ...shorthands.borderRadius('2px'),
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px',
      ...shorthands.margin('10px', '0'),
    },
    '& th': {
      textAlign: 'left',
      ...shorthands.padding('6px', '10px'),
      ...shorthands.border('1px', 'solid', '#edebe9'),
      backgroundColor: '#F3F2F1',
      fontWeight: 600 as unknown as string,
      color: '#323130',
    },
    '& td': {
      ...shorthands.padding('6px', '10px'),
      ...shorthands.border('1px', 'solid', '#edebe9'),
    },
    '& p': {
      ...shorthands.margin('0', '0', '10px', '0'),
    },
    '& ul, & ol': {
      ...shorthands.padding('0', '0', '0', '20px'),
      ...shorthands.margin('0', '0', '10px', '0'),
    },
    '& blockquote': {
      ...shorthands.borderLeft('3px', 'solid', '#edebe9'),
      ...shorthands.padding('4px', '12px'),
      ...shorthands.margin('10px', '0'),
      color: '#605E5C',
    },
    '& pre': {
      backgroundColor: '#F3F2F1',
      ...shorthands.padding('8px', '12px'),
      ...shorthands.borderRadius('2px'),
      ...shorthands.overflow('auto'),
      fontSize: '12px',
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/styles/richText.ts
git commit -m "feat: add scoped rich text styles for sanitized HTML content"
```

---

## Task 8: EmptyState Component

**Files:**
- Rewrite: `EddFindingsViewer/components/EmptyState.tsx`

- [ ] **Step 1: Rewrite with D365 styling**

Simple component: magnifying glass icon + "No EDD findings recorded." text, centered, using `useEmptyStyles`.

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/components/EmptyState.tsx
git commit -m "feat: rewrite EmptyState with D365 styling"
```

---

## Task 9: HeaderBar Component

**Files:**
- Rewrite: `EddFindingsViewer/components/HeaderBar.tsx`

- [ ] **Step 1: Rewrite with D365 styling**

Props: `count: number`, `onNewClick: () => void`. Renders title "EDD Findings" + count badge (left) + Fluent UI Button with Add icon "New Finding" (right). Uses `useHeaderStyles`.

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/components/HeaderBar.tsx
git commit -m "feat: rewrite HeaderBar with D365 styling"
```

---

## Task 10: FindingCard Component

This is the largest component. Handles collapsed/expanded states, rich text rendering, click targets, and the dynamic metadata footer.

**Files:**
- Rewrite: `EddFindingsViewer/components/FindingCard.tsx`

- [ ] **Step 1: Write the FindingCard**

Props interface:
```ts
interface FindingCardProps {
  finding: FindingRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenFinding: (entityId: string) => void;
  onOpenCondition: (entityId: string) => void;
  conditionNameOverride?: string;
  additionalColumns: MetadataField[];
  getAdditionalValue: (recordId: string, columnName: string) => string;
}
```

Component structure:
1. **Card wrapper** — `mergeClasses(styles.card, isExpanded && styles.cardExpanded)`
2. **Header area** — `<div>` with:
   - `role="button"`, `aria-expanded={isExpanded}`, `aria-controls={contentId}`, `tabIndex={0}`
   - `onClick` → toggle, `onKeyDown` → Enter/Space toggle
   - Top row: severity badge (left) + status badge + chevron (right)
   - Title row: `<button>` element styled as link (NOT `<a>` tag). `onClick` calls `onOpenFinding` with `e.stopPropagation()` to prevent expand/collapse. `onKeyDown` also stops propagation.
3. **Description area** (collapsed) — `<div>` containing:
   - Plain text preview via `stripHtml()` with CSS line-clamp (this div is NOT a click target — no onClick handler. Text is naturally selectable for copy-paste.)
   - "Show more" `<button>` below preview, separate from description div
4. **Expanded content** — `<div id={contentId} role="region" aria-label={`Details for ${finding.name}`}>` containing:
   - Sanitized HTML via `sanitizeHtml()` rendered with `dangerouslySetInnerHTML` (safe — DOMPurify sanitized per spec security config)
   - "Show less" `<button>` below content
   - Metadata footer with Tier 1 curated fields: category, created by, linked condition (`<button>` styled as link, NOT `<a>` tag), last updated
   - Tier 2 auto-discovered: map `additionalColumns` with `getAdditionalValue`

**All clickable elements are `<button>` elements**, not `<a>` tags. The `<a>` tag is stripped by DOMPurify in sanitized content, and we maintain consistency by using `<button>` for component-level links too (title, condition link).

Key: `stripHtml` and `sanitizeHtml` results memoized with `useMemo` keyed on `rawDescription`.

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/components/FindingCard.tsx
git commit -m "feat: rewrite FindingCard with rich text, click targets, dynamic footer"
```

---

## Task 11: EddFindingsContainer Component

**Files:**
- Rewrite: `EddFindingsViewer/components/EddFindingsContainer.tsx`

- [ ] **Step 1: Write the container**

State:
- `expandedId: string | null` — accordion
- `conditionNames: Record<string, string>` — cached lookup names
- `loadMoreError: boolean` — pagination error state

Logic:
- `extractRecords(dataset)` memoized on dataset
- `getAdditionalColumns(dataset.columns)` memoized on columns
- `useEffect` to fetch condition names via `webAPI.retrieveRecord` for lookups missing `getFormattedValue`
- `navigateToForm` helper with `context.navigation.openForm` + `Xrm` fallback, generic `console.warn("Navigation failed")` on failure — no GUIDs or entity names in log output
- `handleNewFinding` — reads `context.mode.contextInfo.entityId` for parent pre-population via `formParameters`
- `handleLoadMore` — resets `loadMoreError` to false, calls `dataset.paging.loadNextPage()`, catches errors and sets `loadMoreError` to true

Render logic (conditional):
```
if (dataset.loading):
  return FluentProvider > Spinner ("Loading findings...")
  // NO HeaderBar during loading — spec requirement

else:
  return FluentProvider >
    HeaderBar (count + onNewClick)
    if (findings.length === 0): EmptyState
    else:
      FindingCard[] (mapped from findings)
      if (dataset.paging.hasNextPage):
        "Load more" Button
        if (loadMoreError): <div>"Failed to load — try again"</div>
```

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/components/EddFindingsContainer.tsx
git commit -m "feat: rewrite container with accordion, lookup resolution, navigation"
```

---

## Task 12: PCF Entry Point (`index.ts`)

**Files:**
- Rewrite: `EddFindingsViewer/index.ts`

- [ ] **Step 1: Rewrite with React 18 `createRoot` API**

```ts
import { createRoot, Root } from 'react-dom/client';
```

- `init`: create `this.root = createRoot(container)`, call `trackContainerResize(true)`
- `updateView`: `this.root.render(React.createElement(EddFindingsContainer, props))`
- `destroy`: `this.root.unmount()`

No more `ReactDOM.render` / `ReactDOM.unmountComponentAtNode`.

- [ ] **Step 2: Commit**

```bash
git add EddFindingsViewer/index.ts
git commit -m "feat: rewrite PCF entry point with React 18 createRoot"
```

---

## Task 13: Install Dependencies and Build Verification

- [ ] **Step 1: Install npm dependencies**

```bash
cd EddFindingsViewer && npm install
```

Expected: Clean install, `node_modules/` created.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Successful TypeScript compilation. Common issues to watch for:
- DOMPurify import — may need `import * as DOMPurify from 'dompurify'`
- Fluent UI `makeStyles` type issues with `fontWeight` — cast as needed
- `ComponentFramework` type narrowing — use `as unknown as` pattern

- [ ] **Step 3: Fix any type errors found during build**

- [ ] **Step 4: Commit fixes if needed**

```bash
git add EddFindingsViewer/ && git commit -m "fix: resolve build errors"
```

---

## Task 14: PCF Test Harness Verification

- [ ] **Step 1: Start PCF test harness**

```bash
cd EddFindingsViewer && npm start
```

Expected: Browser opens at `http://localhost:8181`.

- [ ] **Step 2: Verify in test harness**

Check:
1. Cards render with severity badges, clickable title, status badge, description preview
2. Card header click expands/collapses (accordion — only one at a time)
3. Expanded state shows full rich HTML + metadata footer
4. "Show more" / "Show less" links work
5. Empty state renders when no records
6. Loading spinner shows during dataset load
7. Description text is selectable (can highlight and copy)
8. Title click does NOT trigger expand/collapse (stopPropagation)
9. Base64 images render in expanded rich text (CSP `img-src data:` compatibility)

- [ ] **Step 3: Commit any fixes**

```bash
git add EddFindingsViewer/ && git commit -m "fix: address issues found in PCF test harness"
```

---

## Task 15: Final Cleanup

- [ ] **Step 1: Verify no stale files remain**

All files should match the File Map above. Delete any files that aren't in the target structure.

- [ ] **Step 2: Add `.superpowers/` to `.gitignore`**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```
