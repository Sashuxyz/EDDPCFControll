# WealthAllocationControl — Design Specification

## Overview

A field-bound PCF control for distributing total wealth across 7 asset classes using sliders and percentage inputs. Enforces a 100% total allocation constraint in real time. Shows a stacked color bar with hover tooltips, per-row CHF calculations, and an unallocated remainder row. Writes back percentage values to Dataverse fields via `notifyOutputChanged()`.

## Problem

The current D365 form renders asset allocation as a flat grid of label/value pairs with no visual feedback, no constraint enforcement, and no real-time CHF calculations. Users can easily enter percentages that exceed 100% with no warning.

## Solution

A self-contained visual allocation control with:
- Editable total wealth (CHF) input
- 7 asset class rows with synchronized slider + percentage input
- Hard-clamped slider (real-time), soft-clamped text field (clamp on blur)
- Stacked color bar with hover tooltips
- Live CHF calculations per asset class
- Unallocated remainder row as constant headroom indicator

---

## Control Type

**Field-bound PCF** (not dataset). Bound to `syg_totalwealthchf` as primary field. All 7 percentage fields are additional bound input/output parameters. The control reads values from Dataverse on load and writes back changes via `getOutputs()`.

---

## Layout

### Input Field Style (D365 form aesthetic)
All input fields use the D365 form field style: `background: #F3F2F1; border: none; border-bottom: 2px solid transparent; border-radius: 2px; padding: 5px 8px`. On focus: `background: #F3F2F1; border-bottom: 2px solid #0078D4` (stays grey, blue underline only). On disabled/read-only: `background: #F3F2F1; color: #A19F9D`.

### Total Wealth Input
- Label "Total Wealth (CHF)" on the left, numeric input on the right
- D365-style input with grey background, right-aligned text
- Free numeric entry, formatted with Swiss thousands separator (apostrophe: 1'000'000) on blur

### Stacked Allocation Bar
- Height: 24px, border-radius: 3px
- Color-coded segments for each asset class, proportional to their %
- Grey (#F3F2F1) background for unallocated portion
- CSS transition: `width 0.12s ease` for smooth live updates
- **Hover**: Hovered segment gets white outline highlight. Tooltip appears below showing:
  - Asset class name (bold, in asset color)
  - Percentage + CHF value (#605E5C)
- Segments below ~3% width get no hover zone (too narrow)

### Status Line
- Below the bar, 11px text
- Left: "Allocated: **95.00%** -- CHF 2,384,500" (#323130)
- Right: "Unallocated: **5.00%** -- CHF 125,500" (#835B00 amber)
- When fully allocated (100%): right side shows "Fully allocated" in #107C10 green
- When over 100% (only possible briefly via text field): right side shows "Over-allocated!" in #A4262C red, status bar shakes (CSS animation)

### Asset Class Table

**Column headers**: 11px, semibold, #605E5C

**Grid columns**: `24px (dot) | 140px (label) | 1fr (slider) | 70px (% input) | 110px (CHF value)`

**Per row**:
- **Color dot**: 10px circle matching the stacked bar segment color
- **Label**: 13px, #323130 (e.g., "Cash", "Digital Assets", "Equities")
- **Slider**: Native `<input type="range">` with colored track fill up to thumb position, grey remainder. step=0.5. max=100 always (never mutated).
- **% input**: D365-style grey input (#F3F2F1 bg), right-aligned, 13px. Editable. Shows "%" suffix. Focus: stays grey + blue underline.
- **CHF value**: Read-only calculated display, 13px, #605E5C, right-aligned. Formula: `(pct / 100) * totalWealth`
- **Zero rows**: Dimmed to 45% opacity when % = 0

### Unallocated Row
- Always visible at bottom
- Color dot: 10px circle with #E1DFDD fill + dashed border
- Label: "Unallocated" in #835B00 amber, semibold
- No slider
- Shows remaining % and CHF, both in amber

### Summary Footer
Below the table, separated by top border. Two rows:

- **Total Assets**: label left, CHF value right (semibold). Equals `totalWealth`.
- **Liquid Assets**: label left, CHF value right (semibold). Equals `totalWealth - realEstateChf`. Real estate is the only illiquid asset class in this model.

---

## Asset Classes

| Key | Label | Color | Param Name | D365 Field |
|-----|-------|-------|------------|------------|
| cash | Cash | #0078D4 | cashPct | syg_cashpct |
| digitalAssets | Digital Assets | #00B7C3 | digitalAssetsPct | syg_digitalassetspct |
| equities | Equities | #498205 | equitiesPct | syg_equitiespct |
| fixedIncome | Fixed Income | #8764B8 | fixedIncomePct | syg_fixedincomepc |
| commodities | Commodities | #CA5010 | commoditiesPct | syg_commoditiespct |
| realEstate | Real Estate | #D13438 | realEstatePct | syg_realestatepct |
| other | Other | #69797E | otherPct | syg_otherpct |

Colors defined in a config array, not hardcoded in components.

---

## Allocation Constraint Logic

### Headroom Calculation
```
headroomFor(idx) = max(0, 100 - sumOfAllOtherPercentages)
```

### Slider Behavior (hard clamp, real-time)
- Slider max attribute always stays at 100 (never mutated — this would disconnect the thumb from the track)
- On slider input: clamp value to `min(rawValue, headroomFor(idx))`
- Update immediately, fire `notifyOutputChanged()`
- When headroom = 0 and current value = 0: slider is disabled (greyed out)

### Text Field Behavior (soft clamp, on blur)
- Allow free typing while editing (so user can type "70" without interference at keystroke level)
- While typing: if current value > headroom, show red border on the input as warning
- On blur: clamp value to `min(max(0, rawValue), headroomFor(idx))`, round to 2 decimal places, update field
- Fire `notifyOutputChanged()` on blur

### Over-Limit Feedback
- Status bar shakes (CSS `@keyframes` animation, 0.3s) when slider or field blur hits the ceiling
- Red border on % input while value exceeds headroom during typing

### Step Size
- Both slider and text input use step 0.5
- All displayed values rounded to 2 decimal places

---

## Manifest Parameters

Primary bound field: `totalWealthChf` (Currency/Decimal) -> `syg_totalwealthchf`

Additional bound parameters (all Decimal, input/output):
- `cashPct` -> `syg_cashpct`
- `digitalAssetsPct` -> `syg_digitalassetspct`
- `equitiesPct` -> `syg_equitiespct`
- `fixedIncomePct` -> `syg_fixedincomepc`
- `commoditiesPct` -> `syg_commoditiespct`
- `realEstatePct` -> `syg_realestatepct`
- `otherPct` -> `syg_otherpct`

CHF value fields (`syg_cashchf`, etc.) are calculated columns in Dataverse — the component does not write to them. They are rendered from live calculation in component state.

---

## Write-Back to Dataverse

On any user change (slider, field blur, total wealth change):
1. Update internal state
2. Call `notifyOutputChanged()`
3. PCF framework calls `getOutputs()` which returns all current values

```typescript
public getOutputs(): IOutputs {
  return {
    totalWealthChf: this._state.totalWealth,
    cashPct: this._state.vals[0],
    digitalAssetsPct: this._state.vals[1],
    equitiesPct: this._state.vals[2],
    fixedIncomePct: this._state.vals[3],
    commoditiesPct: this._state.vals[4],
    realEstatePct: this._state.vals[5],
    otherPct: this._state.vals[6],
  };
}
```

---

## Read-Only Mode

When `context.mode.isControlDisabled` is true or field-level security marks fields as non-editable:
- All sliders disabled
- All text inputs disabled (render as plain text)
- Total wealth input disabled
- Values still displayed, stacked bar still renders
- Hover tooltips still work

---

## Technical Constraints

- **Inline styles only** — no Fluent UI v9 (causes D365 runtime crashes)
- **React 18** with `createRoot`
- **Production build** (`--buildMode production`)
- **No console.log** in production
- **SVG icons** only (no emojis)
- **Dependencies**: react, react-dom only
- **Slider max always 100** — all clamping in JS, never mutate the HTML max attribute

---

## Project Structure

```
EDDPCFControll/WealthAllocationControl/
├── index.ts                            # PCF lifecycle + state ownership + getOutputs
├── ControlManifest.Input.xml           # Field-bound manifest with 8 parameters
├── WealthAllocationControl.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                            # AssetClass type + ASSET_CLASSES config array
├── components/
│   ├── WealthAllocationControl.tsx     # Root React component (controlled)
│   ├── AllocationBar.tsx               # Stacked bar + tooltip + status line
│   ├── AssetRow.tsx                    # Single asset class row (dot + label + slider + input + CHF)
│   └── UnallocatedRow.tsx             # Unallocated summary row
├── utils/
│   └── allocationLogic.ts             # headroomFor, applySlider, applyFieldBlur, formatCHF
└── styles/
    └── tokens.ts                       # All inline style objects
```

### Solution Packaging
- Add `<RootComponent type="66" schemaName="Syg.WealthAllocationControl" behavior="0" />` to solution.xml
- Add `<CustomControl>` entry to customizations.xml
- Bundle all four controls in same `SygnumPCFComponents` solution zip

---

## Design References

- Visual mockups: `.superpowers/brainstorm/` directory
- Approved mockup: `wealth-allocation-mockup.html` (first version — boxed inputs, spacious layout)
- Stacked bar: tooltip on hover only (option C)
- Color palette defined in Asset Classes table above
