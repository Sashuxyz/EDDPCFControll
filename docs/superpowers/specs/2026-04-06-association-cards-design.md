# AssociationCards — Design Specification

## Overview

A view-only PCF dataset control for N:N (many-to-many) relationship subgrids that displays associated records as compact chips or mini cards. Auto-adapts between chip mode (name-only views) and card mode (views with extra columns). Designed for category-style associations: countries, industries, products.

## Problem

The D365 out-of-box N:N subgrid uses a full table layout for records that are often just simple category names. This wastes space and feels heavy for lightweight associations like "Countries of Business Activity" or "Related Industries."

## Solution

An auto-adaptive component that:
- Shows **chips** (pill-shaped tags) when the view only has the name column
- Shows **mini cards** with secondary fields when the view includes extra columns
- Hover tooltip shows all view fields regardless of mode
- X button to disassociate, + Add button to associate via lookup picker
- No click-to-open — strictly view-only display

---

## Layout

### Command Bar
- **Left**: Title (14px, semibold, #323130) + record count badge (#E1DFDD, 11px)
- **Right**: "+ Add" button (13px, #323130, no background/border)
- Title resolved from `context.mode.label` (form designer configured label)

### Chip Mode (name-only view)
Triggered when view has only 1 column (the primary name).

- **Container**: `display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 14px`
- **Chip**: Pill shape — `border-radius: 16px; background: #F3F2F1; padding: 5px 12px; font-size: 13px; color: #323130`
- **Remove icon**: 12px X SVG (#A19F9D), turns #A4262C on hover. Click disassociates with confirmation.
- **Hover**: Chip gets blue border (#0078D4) + light blue background (#E8F0FE). Tooltip appears below.

### Card Mode (multi-column view)
Triggered when view has 2+ columns.

- **Container**: `display: flex; flex-wrap: wrap; gap: 10px; padding: 12px 14px`
- **Card**: `border: 1px solid #edebe9; border-radius: 4px; padding: 10px 14px; min-width: 150px; max-width: 220px; background: #fff`
- **Card name**: 13px, semibold, #323130 (not a link — view only)
- **Secondary fields**: 11px, #605E5C, `line-height: 1.5`. Label:value format using column display names.
- **Remove icon**: 12px X SVG, positioned `top: 10px; right: 10px; position: absolute`. Turns #A4262C on hover.
- **Hover**: Card border turns #0078D4, subtle shadow `0 2px 4px rgba(0,0,0,.08)`.

### Hover Tooltip
Shown on both chips and cards on hover, after a short delay (~300ms).

- **Style**: `background: #fff; border: 1px solid #edebe9; border-radius: 4px; padding: 10px 14px; box-shadow: 0 4px 12px rgba(0,0,0,.12); font-size: 12px; min-width: 180px`
- **Content**: Record name (bold, #323130) followed by all non-name columns from the view as label:value pairs (#605E5C, line-height 1.6)
- **Position**: Below and aligned to the hovered chip/card
- In **chip mode**: tooltip shows ALL columns including ones not visible on the chip
- In **card mode**: tooltip is skipped since all fields are already visible on the card

### Empty State
- Title bar with count badge showing 0 + "+ Add" button
- No border-bottom on command bar
- No empty message text — clean and minimal

### Loading State
- Title bar (no count badge) + centered "Loading..." text (13px, #605E5C)

---

## Auto-Adaptive Logic

```
columns = dataset.columns.filter(col => col.displayName && col.name !== 'statecode')
nonNameColumns = columns.filter(col => !col.isPrimary)

if (nonNameColumns.length === 0) → Chip Mode
else → Card Mode
```

The primary name column is identified via `col.isPrimary` or falls back to `columns[0]`.

---

## N:N Configuration

### PCF Input Properties
- **`relationshipName`** (SingleLine.Text, required): The N:N relationship schema name (e.g., `syg_kycprofile_syg_country`)

### Associate (+ Add)
1. Opens D365 native lookup picker via `context.utils.lookupObjects()` with `allowMultiSelect: true`
2. For each selected record, POST to `/api/data/v9.2/{parentSet}({parentId})/{relationshipName}/$ref`
3. After completion, `dataset.refresh()`

### Disassociate (X button)
1. Confirmation dialog via `Xrm.Navigation.openConfirmDialog`
2. DELETE to `/api/data/v9.2/{parentSet}({parentId})/{relationshipName}({childId})/$ref`
3. After completion, `dataset.refresh()`

### Entity Set Name Resolution
Use `Xrm.Utility.getEntityMetadata(entityName, ['EntitySetName'])` with in-memory cache to resolve logical entity names to OData collection names.

### Parent Context
- Parent entity name from `context.mode.contextInfo.entityTypeName`
- Parent record ID from `context.mode.contextInfo.entityId`

---

## Field Type Handling

Same as CompactSubgrid — `getFormattedValue()` primary, `getValue()` fallback. All values displayed as plain text. HTML stripped via DOMParser. Lookup values displayed as text (no navigation — view only).

---

## Technical Constraints

- **Inline styles only** — no Fluent UI
- **React 18** with `createRoot`
- **Production build** (`--buildMode production`)
- **No console.log** in production
- **SVG icons** only (no emojis)
- **Dependencies**: react, react-dom only
- **View only** — no form navigation from chips/cards

---

## Project Structure

```
EDDPCFControll/AssociationCards/
├── index.ts
├── ControlManifest.Input.xml
├── AssociationCards.pcfproj
├── package.json
├── tsconfig.json
├── strings/
│   └── AssociationCards.1033.resx
├── components/
│   ├── CardsContainer.tsx          # Root: mode detection, state, tooltip
│   ├── CardBar.tsx                 # Title + count + Add button
│   ├── ChipItem.tsx                # Single chip with X button
│   ├── CardItem.tsx                # Single card with secondary fields + X button
│   └── Tooltip.tsx                 # Hover tooltip popover
├── utils/
│   ├── cellRenderer.ts             # Reuse pattern from CompactSubgrid
│   ├── recordActions.ts            # Associate/disassociate/lookupPicker
│   └── navigationHelpers.ts        # Only for entity metadata resolution
└── styles/
    └── tokens.ts
```

### Solution Packaging
- Add `<RootComponent type="66" schemaName="Syg.AssociationCards" behavior="0" />` to solution.xml
- Add `<CustomControl>` entry to customizations.xml
- Bundle all three controls in same `SygnumPCFComponents` solution zip

---

## Design References

- Visual mockups: `.superpowers/brainstorm/` directory
- Final approved mockup: `card-final-v2.html`
- Chip mode: pill-shaped #F3F2F1 with 16px border-radius
- Card mode: bordered cards with secondary fields
- Tooltip: white popover with shadow
