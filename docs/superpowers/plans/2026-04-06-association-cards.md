# AssociationCards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an auto-adaptive N:N card/chip PCF control for displaying associated records like countries, industries, and products.

**Architecture:** React 18 dataset control that auto-detects chip mode (name-only view) vs card mode (multi-column view). Chips are pill-shaped tags; cards show secondary fields. Hover tooltip in chip mode. Associate via D365 lookup picker, disassociate via OData $ref DELETE. All inline styles, no UI framework.

**Tech Stack:** React 18, TypeScript, PCF dataset API, Xrm.Navigation, OData v9.2 $ref API, pcf-scripts (webpack)

**Spec:** `docs/superpowers/specs/2026-04-06-association-cards-design.md`

---

## File Structure

```
AssociationCards/
├── index.ts                        # PCF lifecycle (createRoot, updateView, destroy)
├── ControlManifest.Input.xml       # Dataset + relationshipName property
├── AssociationCards.pcfproj        # MSBuild project file
├── package.json                    # react, react-dom, pcf-scripts
├── tsconfig.json                   # strict, jsx: react
├── strings/
│   └── AssociationCards.1033.resx  # Localized labels
├── components/
│   ├── CardsContainer.tsx          # Root: mode detection, state, tooltip mgmt
│   ├── CardBar.tsx                 # Title + count + Add button + loading
│   ├── ChipItem.tsx                # Single chip with X + hover
│   ├── CardItem.tsx                # Single card with fields + X + hover
│   └── Tooltip.tsx                 # Positioned tooltip popover
├── utils/
│   ├── cellRenderer.ts             # getFormattedValue/getValue, HTML strip
│   ├── recordActions.ts            # associate, disassociate, lookupPicker
│   └── xrmHelpers.ts              # Xrm access, entity set resolution, confirm dialog
└── styles/
    └── tokens.ts                   # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `AssociationCards/package.json`
- Create: `AssociationCards/tsconfig.json`
- Create: `AssociationCards/ControlManifest.Input.xml`
- Create: `AssociationCards/AssociationCards.pcfproj`
- Create: `AssociationCards/strings/AssociationCards.1033.resx`

- [ ] **Step 1: Create package.json**

Same pattern as CompactSubgrid: react, react-dom, pcf-scripts, typescript, @types. Build script: `pcf-scripts build --buildMode production`.

- [ ] **Step 2: Create tsconfig.json**

Extends pcf-scripts base. Strict, jsx: react, esModuleInterop, forceConsistentCasingInFileNames.

- [ ] **Step 3: Create ControlManifest.Input.xml**

Namespace `Syg`, constructor `AssociationCards`, version `1.0.0`. Dataset `records`. Property `relationshipName` (SingleLine.Text, required). WebAPI required=true. Resx reference.

- [ ] **Step 4: Create AssociationCards.pcfproj**

Same structure as CompactSubgrid.pcfproj with name `AssociationCards` and unique ProjectGuid.

- [ ] **Step 5: Create AssociationCards.1033.resx**

Labels: AssociationCards = "Association Cards", AssociationCards_Desc = "N:N card/chip display for associated records", records = "Records", relationshipName = "Relationship Name", relationshipName_Desc = "The N:N relationship schema name (e.g. syg_kycprofile_syg_country). Required."

- [ ] **Step 6: Run npm install**

- [ ] **Step 7: Commit scaffold**

### Task 2: Styles (tokens.ts)

**Files:**
- Create: `AssociationCards/styles/tokens.ts`

- [ ] **Step 1: Create all style objects**

Style groups:

`containerStyles`: root (fontFamily Segoe UI, width 100%, boxSizing border-box, overflow hidden, bg #fff, padding 12px 0)

`barStyles`:
- root: flex, space-between, padding 8px 14px, borderBottom 1px solid #edebe9
- rootEmpty: same but no borderBottom
- left: flex, alignItems center, gap 8px
- title: 14px, weight 600, color #323130
- countBadge: inline-flex, padding 1px 8px, borderRadius 2px, bg #E1DFDD, color #605E5C, 11px, weight 600
- addButton: 13px, color #323130, no bg/border, cursor pointer, fontFamily inherit
- loadingText: 13px, color #605E5C, textAlign center, padding 20px 14px

`chipStyles`:
- container: flex, flexWrap wrap, gap 8px, padding 12px 14px
- chip: inline-flex, alignItems center, gap 6px, padding 5px 12px, borderRadius 16px, bg #F3F2F1, 13px, color #323130, cursor default, transition background 150ms / border 150ms, border 1px solid transparent
- chipHover: bg #E8F0FE, border 1px solid #0078D4
- removeIcon: cursor pointer, flexShrink 0

`cardStyles`:
- container: flex, flexWrap wrap, gap 10px, padding 12px 14px
- card: flex column, padding 10px 14px, border 1px solid #edebe9, borderRadius 4px, minWidth 150px, maxWidth 220px, position relative, bg #fff, transition borderColor 150ms / boxShadow 150ms
- cardHover: borderColor #0078D4, boxShadow 0 2px 4px rgba(0,0,0,.08)
- cardName: 13px, weight 600, color #323130, marginBottom 6px, paddingRight 20px
- cardField: 11px, color #605E5C, lineHeight 1.5
- cardFieldLabel: weight 600
- removeIcon: position absolute, top 10px, right 10px, cursor pointer

`tooltipStyles`:
- tooltip: position absolute, bg #fff, border 1px solid #edebe9, borderRadius 4px, padding 10px 14px, boxShadow 0 4px 12px rgba(0,0,0,.12), 12px, color #323130, zIndex 10, minWidth 180px
- tooltipName: weight 600, color #323130, marginBottom 6px
- tooltipField: color #605E5C, lineHeight 1.6

- [ ] **Step 2: Commit**

### Task 3: Utils — xrmHelpers.ts

**Files:**
- Create: `AssociationCards/utils/xrmHelpers.ts`

- [ ] **Step 1: Create xrmHelpers.ts**

Shared Xrm access functions: `getXrm()`, `confirmDialog(title, text)`, `getEntitySetName(entityName)` with cache, `getClientUrl()`. Same implementation as CompactSubgrid/utils/recordActions.ts lines 1-55, but extracted into a standalone module for reuse.

- [ ] **Step 2: Commit**

### Task 4: Utils — cellRenderer.ts

**Files:**
- Create: `AssociationCards/utils/cellRenderer.ts`

- [ ] **Step 1: Create cellRenderer.ts**

Simplified version of CompactSubgrid's cellRenderer — only needs `getCellValue(record, column)` returning `{ text: string }`. No lookup navigation needed (view-only). HTML stripping via DOMParser. Placeholder filtering. `getFormattedValue()` primary, `getValue()` fallback.

- [ ] **Step 2: Commit**

### Task 5: Utils — recordActions.ts

**Files:**
- Create: `AssociationCards/utils/recordActions.ts`

- [ ] **Step 1: Create recordActions.ts**

Three exported functions:

`disassociateRecord(parentEntityName, parentId, relationshipName, childId, onComplete)`: Confirmation dialog, then DELETE `{baseUrl}/api/data/v9.2/{parentSet}({parentId})/{relationshipName}({childId})/$ref`, then callback.

`associateRecords(parentEntityName, parentId, relationshipName, childEntityName, childIds, onComplete)`: For each child, POST `{baseUrl}/api/data/v9.2/{parentSet}({parentId})/{relationshipName}/$ref` with body `{"@odata.id": "{baseUrl}/api/data/v9.2/{childSet}({childId})"}`, then callback.

`openLookupPicker(context, entityName)`: Opens D365 lookup via `context.utils.lookupObjects()` with `allowMultiSelect: true`. Returns array of `{id, entityType, name}` or null.

All use `getEntitySetName()`, `getClientUrl()`, `confirmDialog()` from xrmHelpers.ts.

- [ ] **Step 2: Commit**

### Task 6: Component — Tooltip.tsx

**Files:**
- Create: `AssociationCards/components/Tooltip.tsx`

- [ ] **Step 1: Create Tooltip.tsx**

Props: `fields: Array<{label: string, value: string}>`, `name: string`, `style: React.CSSProperties` (for positioning).

Renders: tooltipName (bold) + tooltipField divs for each field. Parent positions via absolute style prop.

- [ ] **Step 2: Commit**

### Task 7: Component — ChipItem.tsx

**Files:**
- Create: `AssociationCards/components/ChipItem.tsx`

- [ ] **Step 1: Create ChipItem.tsx**

Props: `name: string`, `onRemove: () => void`, `onMouseEnter: (e: React.MouseEvent) => void`, `onMouseLeave: () => void`.

Renders: Chip pill with name text + 12px RemoveIcon SVG (X). Tracks hover state for chip highlight (chipHover style). RemoveIcon turns #A4262C on hover via local state. Click X calls onRemove with stopPropagation. Mouse enter/leave bubble to parent for tooltip.

Inline RemoveIcon SVG (don't import from another file — keep it self-contained):
```
<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.5} strokeLinecap="round">
  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
</svg>
```

- [ ] **Step 2: Commit**

### Task 8: Component — CardItem.tsx

**Files:**
- Create: `AssociationCards/components/CardItem.tsx`

- [ ] **Step 1: Create CardItem.tsx**

Props: `name: string`, `fields: Array<{label: string, value: string}>`, `onRemove: () => void`.

Renders: Card div with name, secondary fields as label:value, and positioned RemoveIcon. Hover state for card border highlight. RemoveIcon hover turns red. No tooltip (card mode shows all fields).

- [ ] **Step 2: Commit**

### Task 9: Component — CardBar.tsx

**Files:**
- Create: `AssociationCards/components/CardBar.tsx`

- [ ] **Step 1: Create CardBar.tsx**

Props: `title: string`, `count: number`, `isLoading: boolean`, `onAddClick: () => void`.

Two modes: loading (title only + "Loading..." text) and normal (title + count badge + "+ Add" button). Empty state uses rootEmpty style (no border-bottom when count === 0 and not loading).

- [ ] **Step 2: Commit**

### Task 10: Component — CardsContainer.tsx (Root)

**Files:**
- Create: `AssociationCards/components/CardsContainer.tsx`

- [ ] **Step 1: Create CardsContainer.tsx**

Props: `dataset`, `context`, `relationshipName`.

State: `tooltipTarget: {recordId, x, y} | null`.

Logic:
1. Detect mode: filter columns, check if nonNameColumns.length === 0 → chip mode, else card mode
2. Extract records with primary name + cell values for all columns
3. Resolve title from `context.mode.label`
4. Resolve parent context from `context.mode.contextInfo`
5. Resolve entity name from `dataset.getTargetEntityType()` or first record

Tooltip management:
- In chip mode: onMouseEnter stores target recordId + mouse position, starts 300ms timer. onMouseLeave clears timer and tooltip.
- In card mode: no tooltip.

Handlers:
- handleAddClick: calls openLookupPicker, then associateRecords, then dataset.refresh()
- handleRemove(recordId): calls disassociateRecord with single ID, then dataset.refresh()

Renders: CardBar + (chip mode: ChipItems in chipContainer + Tooltip) or (card mode: CardItems in cardContainer)

Loading state: CardBar with isLoading=true
Empty state: CardBar with count=0 (no body content)

- [ ] **Step 2: Commit**

### Task 11: PCF Entry Point (index.ts) + Build

**Files:**
- Create: `AssociationCards/index.ts`

- [ ] **Step 1: Create index.ts**

`AssociationCards` class implements `StandardControl<IInputs, IOutputs>`. init: createRoot + trackContainerResize. updateView: render CardsContainer with dataset, context, relationshipName. destroy: unmount.

- [ ] **Step 2: Build and verify**

Run: `cd AssociationCards && npm run build`
Expected: webpack compiled successfully, 0 restricted function calls in bundle.

- [ ] **Step 3: Commit**

### Task 12: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.AssociationCards/`

- [ ] **Step 1: Update solution.xml**

Add `<RootComponent type="66" schemaName="Syg.AssociationCards" behavior="0" />`. Bump version to 3.0.0.

- [ ] **Step 2: Update customizations.xml**

Add `<CustomControl><Name>Syg.AssociationCards</Name><FileName>/Controls/Syg.AssociationCards/ControlManifest.xml</FileName></CustomControl>`.

- [ ] **Step 3: Copy build output and create zip**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.AssociationCards
cp AssociationCards/out/controls/bundle.js Solution/manual-pack/Controls/Syg.AssociationCards/
cp AssociationCards/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.AssociationCards/
cp -r AssociationCards/out/controls/strings Solution/manual-pack/Controls/Syg.AssociationCards/
cd Solution/manual-pack && zip -r ../bin/Release/SygnumPCFComponents.zip solution.xml customizations.xml '[Content_Types].xml' Controls/
```

- [ ] **Step 4: Commit**

### Task 13: End-to-End Verification

- [ ] **Step 1: Import solution into D365 sandbox**
- [ ] **Step 2: Add AssociationCards to an N:N subgrid, configure Relationship Name**
- [ ] **Step 3: Verify checklist**

- Chip mode renders when view has name-only column
- Card mode renders when view has extra columns
- Hover tooltip appears in chip mode after ~300ms delay
- No tooltip in card mode
- Click X shows confirmation, disassociates record, grid refreshes
- "+ Add" opens lookup picker with multi-select
- Selected records get associated, grid refreshes
- Empty state shows just title + count 0 + Add button
- Loading state shows title + "Loading..." text
- No form navigation on click (view only)
- No console errors in DevTools
