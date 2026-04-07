# WealthAllocationControl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF control for visual wealth distribution across 7 asset classes with real-time constraint enforcement and Dataverse write-back.

**Architecture:** React 18 field-bound control. PCF `index.ts` owns canonical state (total wealth + 7 percentage values), passes values + callbacks to a controlled React tree. Constraint logic (headroom clamping) lives in a pure utility module. Sliders hard-clamp in real time; text fields soft-clamp on blur. `notifyOutputChanged()` triggers `getOutputs()` which returns all values to Dataverse.

**Tech Stack:** React 18, TypeScript, PCF field-bound API, pcf-scripts (webpack), inline styles only

**Spec:** `docs/superpowers/specs/2026-04-07-wealth-allocation-design.md`

---

## File Structure

```
WealthAllocationControl/
├── index.ts                            # PCF lifecycle, state ownership, getOutputs
├── ControlManifest.Input.xml           # 8 bound parameters (totalWealth + 7 pcts)
├── WealthAllocationControl.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                            # AssetClass type + ASSET_CLASSES config array
├── components/
│   ├── WealthAllocationControl.tsx     # Root React component (controlled)
│   ├── AllocationBar.tsx               # Stacked bar + tooltip + status line
│   ├── AssetRow.tsx                    # Single row: dot + label + slider + input + CHF
│   └── UnallocatedRow.tsx             # Unallocated summary row
├── utils/
│   └── allocationLogic.ts             # headroomFor, applySlider, applyFieldBlur, formatCHF
└── styles/
    └── tokens.ts                       # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `WealthAllocationControl/package.json`
- Create: `WealthAllocationControl/tsconfig.json`
- Create: `WealthAllocationControl/ControlManifest.Input.xml`
- Create: `WealthAllocationControl/WealthAllocationControl.pcfproj`

- [ ] **Step 1: Create package.json**

Same pattern as other controls. Dependencies: react, react-dom. Build: `pcf-scripts build --buildMode production`.

- [ ] **Step 2: Create tsconfig.json**

Extends pcf-scripts base. Strict, jsx: react, esModuleInterop.

- [ ] **Step 3: Create ControlManifest.Input.xml**

Field-bound manifest (not dataset). Namespace `Syg`, constructor `WealthAllocationControl`, version `1.0.0`, control-type `standard`, api-version `1.3.0`.

8 bound properties:
```xml
<property name="totalWealthChf" display-name-key="Total Wealth (CHF)" of-type="Currency" usage="bound" required="true" />
<property name="cashPct" display-name-key="Cash %" of-type="Decimal" usage="bound" required="true" />
<property name="digitalAssetsPct" display-name-key="Digital Assets %" of-type="Decimal" usage="bound" required="true" />
<property name="equitiesPct" display-name-key="Equities %" of-type="Decimal" usage="bound" required="true" />
<property name="fixedIncomePct" display-name-key="Fixed Income %" of-type="Decimal" usage="bound" required="true" />
<property name="commoditiesPct" display-name-key="Commodities %" of-type="Decimal" usage="bound" required="true" />
<property name="realEstatePct" display-name-key="Real Estate %" of-type="Decimal" usage="bound" required="true" />
<property name="otherPct" display-name-key="Other %" of-type="Decimal" usage="bound" required="true" />
```

No dataset. No WebAPI feature needed.

- [ ] **Step 4: Create WealthAllocationControl.pcfproj**

Same structure as other controls with name `WealthAllocationControl` and unique ProjectGuid.

- [ ] **Step 5: Run npm install**

- [ ] **Step 6: Commit scaffold**

### Task 2: Types + Config (types.ts)

**Files:**
- Create: `WealthAllocationControl/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface AssetClass {
  key: string;
  label: string;
  color: string;
  paramIndex: number;
}

export const ASSET_CLASSES: AssetClass[] = [
  { key: 'cash', label: 'Cash', color: '#0078D4', paramIndex: 0 },
  { key: 'digitalAssets', label: 'Digital Assets', color: '#00B7C3', paramIndex: 1 },
  { key: 'equities', label: 'Equities', color: '#498205', paramIndex: 2 },
  { key: 'fixedIncome', label: 'Fixed Income', color: '#8764B8', paramIndex: 3 },
  { key: 'commodities', label: 'Commodities', color: '#CA5010', paramIndex: 4 },
  { key: 'realEstate', label: 'Real Estate', color: '#D13438', paramIndex: 5 },
  { key: 'other', label: 'Other', color: '#69797E', paramIndex: 6 },
];

export const REAL_ESTATE_INDEX = 5;

export interface AllocationState {
  totalWealth: number;
  vals: number[]; // 7 percentages, indexed by paramIndex
}
```

- [ ] **Step 2: Commit**

### Task 3: Allocation Logic (allocationLogic.ts)

**Files:**
- Create: `WealthAllocationControl/utils/allocationLogic.ts`

- [ ] **Step 1: Create allocationLogic.ts**

```typescript
export function headroomFor(idx: number, vals: number[]): number {
  const sumOthers = vals.reduce((s, v, i) => (i === idx ? s : s + v), 0);
  return Math.max(0, 100 - sumOthers);
}

export function applySlider(idx: number, raw: number, vals: number[]): number[] {
  const hr = headroomFor(idx, vals);
  const next = [...vals];
  next[idx] = Math.min(Math.max(0, raw), hr);
  return next;
}

export function applyFieldBlur(idx: number, raw: number, vals: number[]): number[] {
  const hr = headroomFor(idx, vals);
  const next = [...vals];
  next[idx] = Math.round(Math.min(Math.max(0, raw), hr) * 100) / 100;
  return next;
}

export function formatCHF(value: number): string {
  const rounded = Math.round(value);
  const str = rounded.toString();
  const parts: string[] = [];
  for (let i = str.length; i > 0; i -= 3) {
    parts.unshift(str.slice(Math.max(0, i - 3), i));
  }
  return parts.join("'");
}

export function parseCHFInput(raw: string): number {
  const cleaned = raw.replace(/['\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function totalAllocated(vals: number[]): number {
  return vals.reduce((s, v) => s + v, 0);
}
```

- [ ] **Step 2: Commit**

### Task 4: Styles (tokens.ts)

**Files:**
- Create: `WealthAllocationControl/styles/tokens.ts`

- [ ] **Step 1: Create tokens.ts**

All style objects for the control. Key styles:

- `containerStyles.root`: fontFamily Segoe UI, width 100%, boxSizing border-box, padding 16px
- `inputStyles.field`: D365 style — background #F3F2F1, border none, borderBottom 2px solid transparent, borderRadius 2px, padding 5px 8px, fontSize 14px, fontFamily inherit, color #323130, outline none
- `inputStyles.fieldFocused`: borderBottom 2px solid #0078D4
- `inputStyles.fieldError`: borderBottom 2px solid #A4262C
- `inputStyles.fieldDisabled`: background #F3F2F1, color #A19F9D
- `barStyles.bar`: height 24px, borderRadius 3px, overflow hidden, display flex, background #F3F2F1
- `barStyles.segment`: transition width 0.12s ease
- `barStyles.segmentHover`: outline 2px solid #fff, outlineOffset -2px, zIndex 1, position relative
- `barStyles.tooltip`: position absolute, background #fff, border 1px solid #edebe9, borderRadius 4px, padding 8px 12px, boxShadow 0 4px 12px rgba(0,0,0,.12), fontSize 12px, zIndex 10, whiteSpace nowrap
- `barStyles.statusLine`: fontSize 11px, color #605E5C, display flex, justifyContent space-between, padding 4px 0 12px 0
- `tableStyles.headerRow`: grid columns, fontSize 11px, fontWeight 600, color #605E5C, borderBottom 1px solid #edebe9
- `tableStyles.row`: grid columns, padding 8px 0, borderBottom 1px solid #f3f2f1, alignItems center
- `tableStyles.rowZero`: opacity 0.45
- `tableStyles.dot`: width 10px, height 10px, borderRadius 50%
- `tableStyles.label`: fontSize 13px, color #323130
- `tableStyles.chfValue`: fontSize 13px, color #605E5C, textAlign right
- `tableStyles.percentInput`: same as inputStyles.field but width 54px, textAlign right, fontSize 13px, padding 3px 6px
- `unallocatedStyles`: dot with dashed border, amber (#835B00) text, semibold
- `summaryStyles`: borderTop 1px solid #edebe9, padding 8px 0, fontSize 12px for labels, 13px semibold for values
- `shakeAnimation`: CSS keyframes for status bar shake

Grid template: `24px 140px 1fr 70px 110px` with gap 8px.

- [ ] **Step 2: Commit**

### Task 5: AllocationBar Component

**Files:**
- Create: `WealthAllocationControl/components/AllocationBar.tsx`

- [ ] **Step 1: Create AllocationBar.tsx**

Props: `vals: number[]`, `totalWealth: number`.

Renders:
1. Stacked bar — one div per asset class segment with width as percentage. Grey remainder for unallocated.
2. Hover state — track hovered segment index. Show white outline on hovered segment. Render tooltip below with asset name (bold, in color), "XX.XX% -- CHF X'XXX" (#605E5C).
3. Status line — "Allocated: XX.XX% -- CHF X'XXX" left. Right: "Unallocated" (amber), "Fully allocated" (green), or "Over-allocated!" (red) depending on total.
4. Shake animation — inject CSS keyframe once (like SpinnerIcon pattern). Trigger shake class when allocation hits ceiling.

Segments below 3% width get no hover interaction (too narrow for a useful click target).

- [ ] **Step 2: Commit**

### Task 6: AssetRow Component

**Files:**
- Create: `WealthAllocationControl/components/AssetRow.tsx`

- [ ] **Step 1: Create AssetRow.tsx**

Props: `assetClass: AssetClass`, `value: number`, `headroom: number`, `totalWealth: number`, `disabled: boolean`, `onSliderChange: (idx: number, value: number) => void`, `onFieldBlur: (idx: number, value: number) => void`.

Renders single grid row:
1. Color dot (10px circle, asset color)
2. Label (13px, #323130)
3. Native `<input type="range">` — min=0, max=100, step=0.5, value=value. Styled with colored track fill via inline background gradient. Disabled when value=0 and headroom=0.
4. % input — D365 grey style. Tracks local typing state. Red underline when typed value > headroom. On blur: calls onFieldBlur with parsed value.
5. CHF value — read-only: `formatCHF((value / 100) * totalWealth)`

Row has opacity 0.45 when value === 0.

Slider onChange: calls onSliderChange immediately.
Input is uncontrolled during typing (uses local state), syncs from props when not focused.

- [ ] **Step 2: Commit**

### Task 7: UnallocatedRow Component

**Files:**
- Create: `WealthAllocationControl/components/UnallocatedRow.tsx`

- [ ] **Step 1: Create UnallocatedRow.tsx**

Props: `unallocatedPct: number`, `totalWealth: number`.

Renders grid row matching asset row columns but:
- Dot: #E1DFDD fill + 1px dashed #A19F9D border
- Label: "Unallocated" in #835B00, semibold
- No slider
- % display (not input): amber text
- CHF display: amber text

- [ ] **Step 2: Commit**

### Task 8: Root Component (WealthAllocationControl.tsx)

**Files:**
- Create: `WealthAllocationControl/components/WealthAllocationControl.tsx`

- [ ] **Step 1: Create WealthAllocationControl.tsx**

Props: `state: AllocationState`, `disabled: boolean`, `onTotalWealthChange: (value: number) => void`, `onSliderChange: (idx: number, value: number) => void`, `onFieldBlur: (idx: number, value: number) => void`.

Fully controlled component. Renders:
1. Total wealth input row (label + D365-style input, formatted with `formatCHF` on blur, `parseCHFInput` on change)
2. `<AllocationBar vals={state.vals} totalWealth={state.totalWealth} />`
3. Column header row
4. 7x `<AssetRow>` — one per ASSET_CLASSES entry, passing computed headroom per row
5. `<UnallocatedRow>` with remaining percentage
6. Summary footer: Total Assets + Liquid Assets (totalWealth minus realEstate CHF)

All inputs disabled when `disabled` prop is true.

- [ ] **Step 2: Commit**

### Task 9: PCF Entry Point (index.ts) + Build

**Files:**
- Create: `WealthAllocationControl/index.ts`

- [ ] **Step 1: Create index.ts**

This is the most critical file — it owns state and bridges PCF to React.

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WealthAllocationControl as WealthUI } from './components/WealthAllocationControl';
import { AllocationState, ASSET_CLASSES } from './types';
import { applySlider, applyFieldBlur } from './utils/allocationLogic';

export class WealthAllocationControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root: Root;
  private notifyOutputChanged: () => void;
  private state: AllocationState = { totalWealth: 0, vals: [0, 0, 0, 0, 0, 0, 0] };
  private isDisabled = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.isDisabled = context.mode.isControlDisabled;
    this.state.totalWealth = context.parameters.totalWealthChf?.raw ?? 0;

    // Read each pct from context
    const paramNames = ['cashPct', 'digitalAssetsPct', 'equitiesPct', 'fixedIncomePct', 'commoditiesPct', 'realEstatePct', 'otherPct'] as const;
    paramNames.forEach((name, i) => {
      this.state.vals[i] = (context.parameters[name] as ComponentFramework.PropertyTypes.DecimalNumberProperty)?.raw ?? 0;
    });

    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(WealthUI, {
        state: { ...this.state, vals: [...this.state.vals] },
        disabled: this.isDisabled,
        onTotalWealthChange: (value: number) => {
          this.state.totalWealth = value;
          this.notifyOutputChanged();
          this.renderReact();
        },
        onSliderChange: (idx: number, raw: number) => {
          this.state.vals = applySlider(idx, raw, this.state.vals);
          this.notifyOutputChanged();
          this.renderReact();
        },
        onFieldBlur: (idx: number, raw: number) => {
          this.state.vals = applyFieldBlur(idx, raw, this.state.vals);
          this.notifyOutputChanged();
          this.renderReact();
        },
      })
    );
  }

  public getOutputs(): IOutputs {
    return {
      totalWealthChf: this.state.totalWealth,
      cashPct: this.state.vals[0],
      digitalAssetsPct: this.state.vals[1],
      equitiesPct: this.state.vals[2],
      fixedIncomePct: this.state.vals[3],
      commoditiesPct: this.state.vals[4],
      realEstatePct: this.state.vals[5],
      otherPct: this.state.vals[6],
    };
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

- [ ] **Step 2: Build and verify**

Run: `cd WealthAllocationControl && npm run build`
Expected: webpack compiled successfully, 0 restricted function calls in bundle.

- [ ] **Step 3: Commit**

### Task 10: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.WealthAllocationControl/`

- [ ] **Step 1: Update solution.xml**

Add `<RootComponent type="66" schemaName="Syg.WealthAllocationControl" behavior="0" />`. Bump version to 4.0.0.

- [ ] **Step 2: Update customizations.xml**

Add `<CustomControl><Name>Syg.WealthAllocationControl</Name><FileName>/Controls/Syg.WealthAllocationControl/ControlManifest.xml</FileName></CustomControl>`.

- [ ] **Step 3: Copy build output and create zip**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.WealthAllocationControl
cp WealthAllocationControl/out/controls/bundle.js Solution/manual-pack/Controls/Syg.WealthAllocationControl/
cp WealthAllocationControl/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.WealthAllocationControl/
cd Solution/manual-pack && zip -r ../bin/Release/SygnumPCFComponents.zip solution.xml customizations.xml '[Content_Types].xml' Controls/
```

- [ ] **Step 4: Commit**

### Task 11: End-to-End Verification

- [ ] **Step 1: Import solution into D365 sandbox**
- [ ] **Step 2: Add WealthAllocationControl to the KYC Profile form, bind to syg_totalwealthchf**
- [ ] **Step 3: Verify checklist**

- Total wealth input editable, formats as 1'000'000 on blur
- Stacked bar updates live as sliders move
- Hover tooltip shows asset name + % + CHF on bar segments
- Slider clamps to headroom in real time
- % input allows free typing, red underline when over headroom, clamps on blur
- CHF values calculate correctly per row
- Zero rows dimmed to 45% opacity
- Sliders disabled when headroom = 0 and value = 0
- Unallocated row shows correct remainder
- Status line shows allocated/unallocated/fully allocated/over-allocated states
- Status bar shakes when hitting ceiling
- Summary footer shows Total Assets and Liquid Assets (minus real estate)
- Read-only mode: all inputs disabled, values still display
- Values persist to Dataverse on save
- No console errors in DevTools
