# CompactSubgrid — Design Specification

## Overview

A generic, read-only PCF dataset control that replaces the D365 out-of-box subgrid with a condensed table view. Its key differentiator: columns that are mostly empty across records are automatically moved to an expandable inline detail panel, reducing visual noise while keeping the data accessible.

## Problem

D365 subgrids display all columns equally, even when some fields only apply to a subset of records (e.g., "Company Name" only relevant when Source of Wealth is "Sale of Company"). This creates wide, sparse grids that waste horizontal space and make it harder to scan relevant data.

## Solution

A compact grid (~32px rows) that:
- Auto-detects sparse columns and moves them to expandable row detail panels
- Shows a chevron indicator on rows that have additional data
- Supports single-click to expand detail, double-click to open the record form
- Works generically with any entity — no hardcoded field names

---

## Layout

### Command Bar
- **Left**: Entity display name (14px, semibold, #323130) + record count badge (#E1DFDD background, 11px)
- **Right**: "Expand All" / "Collapse All" toggle + "+ New" button, separated by pipe divider
- **Button style**: D365-standard — 13px, #323130, no background, no border
- "Expand All" hidden when no records exist

### Column Headers
- **Background**: Whisper (#FAFAF9) with bottom border (#edebe9)
- **Text**: 11px, semibold, #605E5C, 0.2px letter-spacing
- **Sort**: Click header to toggle ascending → descending → none. Active sort column turns #0078D4 with ▲/▼ indicator. Sort delegates to `dataset.sorting` API.
- **First column**: Fixed 28px width for chevron indicator

### Grid Rows
- **Height**: ~32px, 13px body text, #323130
- **Primary name column**: Rendered as blue link (#0078D4), click opens record
- **Chevron column**: ▶ for collapsed rows with detail data, ▼ for expanded, empty for rows without detail
- **Hover**: Row background #F5F5F5
- **Expanded row**: Background #F5F5F5, detail panel rendered below
- **Interactions**:
  - Single-click → expand/collapse detail panel (250ms timer for disambiguation)
  - Double-click → open record form
  - Click name link → open record form (stops propagation)
- **Layout**: CSS Grid with `grid-template-columns`: 32px (checkbox) + 28px (chevron) + proportional data columns from `visualSizeFactor`

### Detail Panel (Inline Card)
- **Style**: #FAFAFA background, 3px left border in #0078D4, border-radius 0 2px 2px 0
- **Position**: Below the row, indented to align with first data column (margin-left: 28px)
- **Content**: Flowing horizontal label:value pairs (flex-wrap), 12px text
- **Labels**: Semibold #605E5C, values #323130
- **Lookup values**: Rendered as clickable blue links
- **Only non-empty fields** are shown

### Row Selection & Actions
- **Checkbox column**: 32px fixed width, before the chevron column. Header checkbox = select all / deselect all.
- **Selection mode**: When 1+ rows selected, command bar swaps to selection mode:
  - Background: #F0F6FF
  - Left: "N selected" (13px, semibold, #0078D4)
  - Right: Action button + "Clear selection"
- **Selected rows**: Background #E8F0FE
- **Action auto-detection**: 
  - 1:N relationship → "Delete" button (trash SVG icon, #A4262C red, semibold)
  - N:N relationship → "Remove" button (X SVG icon, #323130 neutral, semibold)
  - Detected from dataset relationship metadata
- **Confirmation**: Both actions show confirmation dialog via `Xrm.Navigation.openConfirmDialog` before executing
- **Execution**: Delete uses `WebAPI.deleteRecord()`, Remove uses `WebAPI.disassociateRecord()`, then `dataset.refresh()`

### Pagination
- "Load more" button centered at bottom (12px, #0078D4), shown when `dataset.paging.hasNextPage`

---

## Conditional Field Classification

### Auto-Detection Algorithm
1. Iterate all loaded records in `dataset.sortedRecordIds`
2. For each column in `dataset.columns`, count how many records have a non-empty value
3. Columns with >50% empty values → classified as "detail" (conditional) columns
4. Columns with ≤50% empty → classified as "grid" (always-shown) columns

### Overrides
- **Manual override**: Optional PCF input property `conditionalFields` (comma-separated logical names) forces specific columns into the detail panel. Configured in the D365 form designer under the subgrid's control properties (e.g., `syg_companyname,syg_buyername,syg_saledate`). When set, these fields are always in the detail panel regardless of auto-detection. All other columns still go through auto-detection.
- **Protected columns**: The primary name column is never moved to detail (always stays in grid)
- **Excluded columns**: `statecode` is always excluded from the grid display

### Row Detail Indicator
- A row shows the ▶ chevron only if it has at least one non-empty value in any detail column
- Rows with no detail data show no chevron and are not expandable

---

## Field Type Handling

All field types use `getFormattedValue()` as primary display, `getValue()` as fallback.

| Field Type | Grid Cell Display | Detail Panel Display |
|---|---|---|
| Text / Memo | Plain text, truncated with ellipsis | Full text |
| Option Set | Formatted label | Formatted label |
| Lookup | Blue link (click opens related record) | Blue link |
| DateTime | Formatted date string | Formatted date string |
| Number / Currency | Formatted value | Formatted value |
| Two Options (Boolean) | Yes/No text | Yes/No text |
| Rich Text (HTML) | Strip HTML, show plain text | Strip HTML, show plain text |

### Lookup GUID Extraction
Handle D365's nested lookup format where `getValue()` returns `{etn, id: {guid: "..."}, name}`. Extract GUID from both plain string and nested `{guid}` object patterns.

---

## Navigation

Multi-level fallback (no entity whitelist — generic control):

1. **Xrm.Navigation.openForm** — primary, most reliable in D365
2. **context.navigation.openForm** — PCF context fallback
3. **URL construction** via `new URL()` — last resort, opens in new tab

GUID validation via regex before any navigation attempt.

### "+ New" Button
Opens a new record form for the subgrid's entity. Pre-populates the parent lookup field using `context.mode.contextInfo` for `entityId` and `entityRecordName`.

---

## Empty & Error States

### No Records
- Count badge shows 0
- Centered SVG grid/table outline icon (32px, #A19F9D stroke)
- "No records found" (13px, #605E5C)
- "Create a new record using the + New button above" (12px, #A19F9D)
- "Expand All" button hidden, "+ New" still visible

### Loading
- No count badge
- Centered spinning SVG icon + "Loading records..." text (13px, #605E5C)

### No Permission / Error
- Centered SVG padlock icon (32px, #A19F9D stroke)
- "You don't have permission to view these records" (13px, #605E5C)
- "Contact your administrator if you need access" (12px, #A19F9D)
- Detected via `dataset.error` property

---

## PCF Configuration

### ControlManifest.Input.xml
- **Dataset**: `<data-set name="records">` — generic, view-driven
- **Input property**: `conditionalFields` (SingleLine.Text, optional) — comma-separated field names for manual override
- **Feature usage**: `<uses-feature name="WebAPI" required="false" />`
- **Options**: `displayCommandBar:false;displayViewSelector:false`

### Title Resolution
The grid title is resolved from `dataset.getTitle()` if available, otherwise falls back to the dataset's `display-name-key` from the manifest. In practice, D365 populates this from the subgrid label configured in the form designer (e.g., "Source of Wealth").

---

## Technical Constraints

- **Inline styles only** — no Fluent UI library (causes D365 runtime crashes)
- **React 18** with `createRoot` for PCF lifecycle
- **Production webpack build** (`--buildMode production`) to avoid Solution Checker violations
- **No DOMPurify** — grid cells show plain text only (HTML stripped via DOMParser)
- **No console.log** in production code
- **SVG icons** inline in React components (no emoji, no icon fonts)
- **Dependencies**: react, react-dom only

---

## Project Structure

Separate control directory, same Dataverse solution:

```
EDDPCFControll/
├── EddFindingsViewer/     (existing, independent)
├── CompactSubgrid/        (new)
│   ├── index.ts
│   ├── ControlManifest.Input.xml
│   ├── CompactSubgrid.pcfproj
│   ├── package.json
│   ├── tsconfig.json
│   ├── components/
│   │   ├── SubgridContainer.tsx
│   │   ├── GridHeader.tsx
│   │   ├── GridRow.tsx
│   │   └── DetailPanel.tsx
│   ├── utils/
│   │   ├── columnClassifier.ts
│   │   ├── cellRenderer.ts
│   │   └── navigationHelpers.ts
│   └── styles/
│       └── tokens.ts
└── Solution/              (shared — both controls packaged here)
```

### Solution Packaging
- Add `<RootComponent type="66" schemaName="Syg.CompactSubgrid" behavior="0" />` to solution.xml
- Add `<CustomControl>` entry to customizations.xml
- Bundle both controls in same `SygnumPCFComponents` solution zip

---

## Design References

- Visual mockups: `.superpowers/brainstorm/` directory
- Final approved mockup: `full-mockup-v4.html`
- Empty states: `empty-states-v2.html`
- Header style: Whisper background (#FAFAF9)
- Detail panel: Inline card with left blue accent border
