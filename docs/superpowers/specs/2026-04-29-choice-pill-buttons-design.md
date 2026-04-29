# ChoicePillButtons v1 — Design Spec

## Goal

Replace the standard D365 OptionSet dropdown with horizontal pill-style buttons. Each option renders as a button; the selected value is filled with a configurable colour, others are outlined. Designed for short, decision-style choice fields (Yes/No flags, review statuses, compliance indicators).

## Scope — v1

- Single-select OptionSet field, up to 5 values
- Per-value colour configuration via manifest input properties
- Click to select, writes OptionSet integer back to field
- Disabled/read-only rendering preserving audit visibility
- Keyboard accessible (Enter/Space, aria-pressed)

### Out of scope

- Multi-select (MultiSelectOptionSet)
- More than 5 options (surplus silently ignored)
- Confirmation dialogs before change

## Architecture

### Components

- `ChoicePillButtons.tsx` — root component. Receives options array, selected value, colour map, disabled flag, onSelect callback. Renders flex row of PillButton components. Limits to first 5 options.
- `PillButton.tsx` — single pill. Handles selected/unselected/disabled visual states, hover, keyboard activation.

### Colour mapping

`colorMap.ts` utility builds a `Map<number, string>` from manifest properties:

- 5 colour slots (`color1`-`color5`) + optional value overrides (`value1`-`value5`)
- If `valueN` provided: maps `colorN` to that OptionSet integer
- If `valueN` omitted: maps `colorN` to the Nth option in declaration order
- Invalid hex silently falls back to `#605E5C` (neutral grey)
- Validation via `/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`

### PCF lifecycle

Standard pendingOutput pattern:
1. Click pill → set `currentValue` → `pendingOutput = true` → `notifyOutputChanged()`
2. `updateView` → if `pendingOutput`, reset flag and re-render. Otherwise sync from `context.parameters.value.raw`.
3. `getOutputs` returns `{ value: currentValue }`.

### OptionSet data source

- `context.parameters.value.raw` — currently selected integer (or null)
- `context.parameters.value.attributes.Options` — array of `{ Value: number, Label: string }` for all options

## Visual States

| State | Selected pill | Unselected pills | Cursor |
|---|---|---|---|
| Active, editable | Filled with configured colour, white text | White bg, dark text, neutral border | pointer |
| Active, no value | n/a | All outlined, neutral | pointer |
| Disabled / read-only | Filled with colour at 0.6 opacity | Grey bg (#F3F2F1), muted text (#A19F9D) | not-allowed |

### Pill styling

- `border-radius: 4px`, `padding: 6px 14px`, `min-width: 64px`
- `font: 13px 'Segoe UI'`, `font-weight: 500`
- Flex row, `gap: 8px`, `flex-wrap: wrap`
- Hover on unselected enabled: background `#F3F2F1`

### Hover CSS injection

Injected once per page as a `<style>` tag on mount (same pattern as RichTextMemo):

```css
.cpb-pill:not(.cpb-pill--selected):not(.cpb-pill--disabled):hover {
  background: #F3F2F1;
}
```

### Accessibility

- `role="button"` on each pill
- `aria-pressed` reflects selected state
- `aria-disabled` reflects disabled state
- `tabIndex={0}` when enabled, `tabIndex={-1}` when disabled
- Enter and Space trigger onClick

## Manifest

```xml
<control namespace="Syg" constructor="ChoicePillButtons" version="1.0.0"
         display-name-key="ChoicePillButtons"
         description-key="Pill-style buttons for OptionSet fields"
         control-type="standard">

  <property name="value" of-type="OptionSet" usage="bound" required="true" />

  <property name="color1" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="color2" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="color3" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="color4" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="color5" of-type="SingleLine.Text" usage="input" required="false" />

  <property name="value1" of-type="Whole.None" usage="input" required="false" />
  <property name="value2" of-type="Whole.None" usage="input" required="false" />
  <property name="value3" of-type="Whole.None" usage="input" required="false" />
  <property name="value4" of-type="Whole.None" usage="input" required="false" />
  <property name="value5" of-type="Whole.None" usage="input" required="false" />

  <resources>
    <code path="index.ts" order="1" />
  </resources>
</control>
```

## Module Structure

```
ChoicePillButtons/
  index.ts                     PCF lifecycle, pendingOutput pattern
  ControlManifest.Input.xml    bound OptionSet + colour/value slots
  ChoicePillButtons.pcfproj    project file
  package.json                 react 18, pcf-scripts
  tsconfig.json                extends pcf-scripts base
  types.ts                     OptionItem, ColorMapInput interfaces
  components/
    ChoicePillButtons.tsx      root layout component
    PillButton.tsx             individual pill with states
  utils/
    colorMap.ts                builds Map<number, string> from manifest config
  styles/
    tokens.ts                  inline styles + injected hover CSS
```

## Dependencies

- `react` ^18.2.0
- `react-dom` ^18.2.0
- `@types/powerapps-component-framework` ^1.3.18 (dev)
- `pcf-scripts` ^1 (dev)
- `typescript` ^4.9.5 (dev)

No DOMPurify needed — no HTML rendering; all text via React text nodes.

## Disabled state detection

```
disabled = context.mode.isControlDisabled ||
           context.parameters.value.security?.editable === false
```

Both field-level read-only and form-level disabled are covered.

## Edge cases

- More than 5 options: render first 5, ignore rest
- Fewer than 5: render what exists, ignore unused colour slots
- Null value on new record: no pill filled; click selects and dirties form
- Invalid hex in colour config: silently fall back to `#605E5C`
- Two colour slots mapped to same OptionSet value: last write wins
- `isFinite` check on all `value1`-`value5` before using as Map keys

## Standalone solution for testing

`Solution/cpb-pack/` with:
- `UniqueName`: `SygnumChoicePillButtons`
- `Version`: `1.0.0`
- Same publisher (Sygnum, prefix `syg`)
- Only `Syg.ChoicePillButtons` as RootComponent

Same pattern as `Solution/rtm-pack/` for RichTextMemo.
