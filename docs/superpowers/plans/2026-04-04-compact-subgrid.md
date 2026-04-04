# CompactSubgrid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic, condensed PCF subgrid control with auto-detected expandable detail panels, row selection, and delete/remove actions.

**Architecture:** React 18 dataset control with CSS Grid layout. Column classifier auto-detects sparse columns (>50% empty) and moves them to expandable inline detail panels. Row selection with contextual toolbar auto-detects 1:N vs N:N relationships for delete vs disassociate. All inline styles, no UI framework dependencies.

**Tech Stack:** React 18, TypeScript, PCF dataset API, Xrm.Navigation, WebAPI, pcf-scripts (webpack)

**Spec:** `docs/superpowers/specs/2026-04-04-compact-subgrid-design.md`

---

## File Structure

```
CompactSubgrid/
├── index.ts                        # PCF lifecycle (createRoot, updateView, destroy)
├── ControlManifest.Input.xml       # Dataset + conditionalFields property
├── CompactSubgrid.pcfproj          # MSBuild project file
├── package.json                    # react, react-dom, pcf-scripts
├── tsconfig.json                   # strict, jsx: react
├── components/
│   ├── SubgridContainer.tsx        # Root: state mgmt, pagination, selection, sorting
│   ├── CommandBar.tsx              # Title, count, buttons, selection toolbar
│   ├── GridHeader.tsx              # Column headers with sort + select-all checkbox
│   ├── GridRow.tsx                 # Row with checkbox, chevron, cells, click handling
│   ├── DetailPanel.tsx             # Expanded conditional fields as label:value pairs
│   ├── EmptyState.tsx              # No records / loading / error states with SVG icons
│   └── SvgIcons.tsx                # Shared SVG icon components (trash, lock, grid, x, spinner)
├── utils/
│   ├── columnClassifier.ts         # Auto-detect grid vs detail columns
│   ├── cellRenderer.ts             # Render cell value by field type, extract lookup info
│   ├── navigationHelpers.ts        # Xrm/context/URL navigation + GUID validation
│   └── recordActions.ts            # Delete/disassociate with confirmation dialog
└── styles/
    └── tokens.ts                   # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `CompactSubgrid/package.json`
- Create: `CompactSubgrid/tsconfig.json`
- Create: `CompactSubgrid/ControlManifest.Input.xml`
- Create: `CompactSubgrid/CompactSubgrid.pcfproj`

- [ ] **Step 1: Create package.json**

See spec for dependencies: react, react-dom, pcf-scripts, typescript, @types/react, @types/react-dom, @types/powerapps-component-framework. Build script: `pcf-scripts build --buildMode production`.

- [ ] **Step 2: Create tsconfig.json**

Extends pcf-scripts base. Strict mode, jsx: react, esModuleInterop.

- [ ] **Step 3: Create ControlManifest.Input.xml**

Namespace `Syg`, constructor `CompactSubgrid`, version `1.0.0`. Dataset `records`, property `conditionalFields` (SingleLine.Text, optional), WebAPI feature optional.

- [ ] **Step 4: Create CompactSubgrid.pcfproj**

Same structure as EddFindingsViewer.pcfproj with name `CompactSubgrid` and unique ProjectGuid.

- [ ] **Step 5: Install dependencies**

Run: `cd CompactSubgrid && npm install`

- [ ] **Step 6: Commit scaffold**

### Task 2: Styles (tokens.ts)

**Files:**
- Create: `CompactSubgrid/styles/tokens.ts`

- [ ] **Step 1: Create all style objects**

Style groups: `containerStyles`, `commandBarStyles` (root, rootSelection, buttons, deleteButton, removeButton), `headerStyles` (whisper bg #FAFAF9, sort active #0078D4), `rowStyles` (32px height, hover #F5F5F5, selected #E8F0FE, nameLink #0078D4), `detailStyles` (panel with #0078D4 left border, label:value pairs), `emptyStyles`, `paginationStyles`.

- [ ] **Step 2: Commit**

### Task 3: SVG Icons (SvgIcons.tsx)

**Files:**
- Create: `CompactSubgrid/components/SvgIcons.tsx`

- [ ] **Step 1: Create icon components**

`TrashIcon` (trash can, #A4262C), `RemoveIcon` (X cross, #323130), `GridIcon` (table outline, #A19F9D), `LockIcon` (padlock, #A19F9D), `SpinnerIcon` (rotating lines, #605E5C) with `injectSpinnerStyle()` for CSS keyframe animation. All accept `size`, `color`, `style` props.

- [ ] **Step 2: Commit**

### Task 4: Column Classifier (columnClassifier.ts)

**Files:**
- Create: `CompactSubgrid/utils/columnClassifier.ts`

- [ ] **Step 1: Create classifier**

`classifyColumns(dataset, conditionalFieldsOverride?)` returns `{ gridColumns, detailColumns }`. Excludes `statecode`. Parses comma-separated override string. Counts non-empty values per column — >50% empty goes to detail. Primary column (isPrimary) always stays in grid.

`rowHasDetailData(record, detailColumns)` returns boolean — checks if record has any non-empty detail column values.

- [ ] **Step 2: Commit**

### Task 5: Cell Renderer (cellRenderer.ts)

**Files:**
- Create: `CompactSubgrid/utils/cellRenderer.ts`

- [ ] **Step 1: Create renderer**

`getCellValue(record, column)` returns `{ text, isLookup, lookupEntityName?, lookupEntityId? }`. Handles all field types via `getFormattedValue()` primary, `getValue()` fallback. Lookup extraction handles nested `{guid:"..."}` pattern. HTML stripped via DOMParser. Filters placeholder strings.

- [ ] **Step 2: Commit**

### Task 6: Navigation Helpers (navigationHelpers.ts)

**Files:**
- Create: `CompactSubgrid/utils/navigationHelpers.ts`

- [ ] **Step 1: Create helpers**

`navigateToRecord(context, entityName, entityId)` — GUID validation, then Xrm > context > URL fallback. `openNewRecordForm(context, entityName)` — opens new form with parent context pre-population from `context.mode.contextInfo`.

- [ ] **Step 2: Commit**

### Task 7: Record Actions (recordActions.ts)

**Files:**
- Create: `CompactSubgrid/utils/recordActions.ts`

- [ ] **Step 1: Create delete/disassociate functions**

`deleteRecords(context, entityName, recordIds, onComplete)` — confirmation dialog via `Xrm.Navigation.openConfirmDialog`, then `webAPI.deleteRecord()` per record, then callback. `disassociateRecords(context, recordIds, onComplete)` — confirmation dialog, then callback (platform handles N:N on refresh).

- [ ] **Step 2: Commit**

### Task 8: EmptyState Component

**Files:**
- Create: `CompactSubgrid/components/EmptyState.tsx`

- [ ] **Step 1: Create component**

Accepts `type: 'empty' | 'loading' | 'error'`. Empty: GridIcon + "No records found". Loading: SpinnerIcon + "Loading records...". Error: LockIcon + "You don't have permission to view these records".

- [ ] **Step 2: Commit**

### Task 9: DetailPanel Component

**Files:**
- Create: `CompactSubgrid/components/DetailPanel.tsx`

- [ ] **Step 1: Create component**

Renders non-empty detail column values as flowing label:value pairs. Lookup values as clickable blue links via `navigateToRecord()`. Panel styled with #FAFAFA bg, 3px #0078D4 left border, margin-left 60px (32px checkbox + 28px chevron).

- [ ] **Step 2: Commit**

### Task 10: CommandBar Component

**Files:**
- Create: `CompactSubgrid/components/CommandBar.tsx`

- [ ] **Step 1: Create component**

Two modes: normal (title + count + Expand All + New) and selection (N selected + Delete/Remove + Clear selection). Delete button uses TrashIcon (#A4262C), Remove uses RemoveIcon (#323130). `isNtoN` prop determines which to show. Selection mode has #F0F6FF background.

- [ ] **Step 2: Commit**

### Task 11: GridHeader Component

**Files:**
- Create: `CompactSubgrid/components/GridHeader.tsx`

- [ ] **Step 1: Create component**

CSS Grid row matching data row template. Select-all checkbox, empty chevron cell, data column headers. Click to sort — active column in #0078D4 with triangle arrow. Whisper background #FAFAF9.

- [ ] **Step 2: Commit**

### Task 12: GridRow Component

**Files:**
- Create: `CompactSubgrid/components/GridRow.tsx`

- [ ] **Step 1: Create component**

250ms click timer for single-click (expand) vs double-click (navigate) disambiguation. Checkbox, chevron (▶/▼/empty), data cells. Primary column as blue link. Lookup cells as blue links. Hover state #F5F5F5, selected #E8F0FE, expanded #F5F5F5. Renders DetailPanel when expanded.

- [ ] **Step 2: Commit**

### Task 13: SubgridContainer (Root Component)

**Files:**
- Create: `CompactSubgrid/components/SubgridContainer.tsx`

- [ ] **Step 1: Create root component**

State: expandedIds (Set), selectedIds (Set), sortColumn, sortDirection. Memoized: classifyColumns, rowDetailMap, gridTemplateColumns, title, entityName, isNtoN. Handlers: expand/collapse all, toggle expand, select all, toggle select, sort, navigate, new, delete/remove, load more. Renders: CommandBar, GridHeader, GridRow[], EmptyState, pagination.

- [ ] **Step 2: Commit**

### Task 14: PCF Entry Point (index.ts)

**Files:**
- Create: `CompactSubgrid/index.ts`

- [ ] **Step 1: Create PCF lifecycle class**

`CompactSubgrid` implements `StandardControl<IInputs, IOutputs>`. init: createRoot + trackContainerResize. updateView: render SubgridContainer with dataset, context, conditionalFields. destroy: unmount.

- [ ] **Step 2: Build and verify**

Run: `cd CompactSubgrid && npm run build`
Expected: webpack compiled successfully, 0 restricted function calls in bundle.

- [ ] **Step 3: Commit**

### Task 15: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.CompactSubgrid/bundle.js`
- Create: `Solution/manual-pack/Controls/Syg.CompactSubgrid/ControlManifest.xml`

- [ ] **Step 1: Update solution.xml**

Add `<RootComponent type="66" schemaName="Syg.CompactSubgrid" behavior="0" />`. Bump version to 2.0.0.

- [ ] **Step 2: Update customizations.xml**

Add `<CustomControl><Name>Syg.CompactSubgrid</Name><FileName>/Controls/Syg.CompactSubgrid/ControlManifest.xml</FileName></CustomControl>`.

- [ ] **Step 3: Copy build output and create zip**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.CompactSubgrid
cp CompactSubgrid/out/controls/bundle.js Solution/manual-pack/Controls/Syg.CompactSubgrid/
cp CompactSubgrid/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.CompactSubgrid/
cd Solution/manual-pack && zip -r ../bin/Release/SygnumPCFComponents.zip solution.xml customizations.xml '[Content_Types].xml' Controls/
```

- [ ] **Step 4: Commit**

### Task 16: End-to-End Verification

- [ ] **Step 1: Import solution into D365 sandbox**
- [ ] **Step 2: Add CompactSubgrid to a subgrid on any form**
- [ ] **Step 3: Verify checklist**

- Grid renders with columns from the view
- Sparse columns auto-detected and moved to detail panel
- Single-click expands/collapses detail
- Double-click opens record form
- Name column is clickable blue link
- Lookup columns are clickable links
- Column header click sorts asc/desc
- Expand All / Collapse All works
- "+ New" opens new record form
- Checkbox selection works (single + select all)
- Delete/Remove shows confirmation and executes
- "Load more" pagination works
- Empty, loading, error states render correctly
- No console errors in DevTools
