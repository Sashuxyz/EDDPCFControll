# ChoicePillButtons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF control that replaces the D365 OptionSet dropdown with horizontal pill-style buttons, with per-value colour configuration.

**Architecture:** Two React components (root layout + individual pill button) driven by a colour-mapping utility that resolves manifest config to OptionSet values. Standard pendingOutput PCF lifecycle. Hover CSS injected via `<style>` tag.

**Tech Stack:** React 18, TypeScript 4.9, pcf-scripts (production build)

---

### Task 1: Scaffold Project

**Files:**
- Create: `ChoicePillButtons/package.json`
- Create: `ChoicePillButtons/tsconfig.json`
- Create: `ChoicePillButtons/ChoicePillButtons.pcfproj`
- Create: `ChoicePillButtons/ControlManifest.Input.xml`
- Create: `ChoicePillButtons/index.ts` (stub)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "choice-pill-buttons",
  "version": "1.0.0",
  "description": "Pill-style buttons for OptionSet fields in D365",
  "scripts": {
    "build": "pcf-scripts build --buildMode production",
    "clean": "pcf-scripts clean",
    "rebuild": "pcf-scripts clean && pcf-scripts build --buildMode production",
    "start": "pcf-scripts start watch"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/powerapps-component-framework": "^1.3.18",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "pcf-scripts": "^1",
    "pcf-start": "^1",
    "typescript": "^4.9.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "./node_modules/pcf-scripts/tsconfig_base.json",
  "compilerOptions": {
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create ChoicePillButtons.pcfproj**

Copy the exact pattern from `ComplianceConditionScheduler/ComplianceConditionScheduler.pcfproj` but change `<Name>` to `ChoicePillButtons` and generate a new `<ProjectGuid>`.

- [ ] **Step 4: Create ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="ChoicePillButtons" version="1.0.0"
           display-name-key="ChoicePillButtons"
           description-key="Pill-style buttons for OptionSet fields"
           control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <property name="value" display-name-key="Value" description-key="Bound OptionSet field"
              of-type="OptionSet" usage="bound" required="true" />
    <property name="color1" display-name-key="Color 1" description-key="Hex colour for slot 1"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="color2" display-name-key="Color 2" description-key="Hex colour for slot 2"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="color3" display-name-key="Color 3" description-key="Hex colour for slot 3"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="color4" display-name-key="Color 4" description-key="Hex colour for slot 4"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="color5" display-name-key="Color 5" description-key="Hex colour for slot 5"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="value1" display-name-key="Value 1" description-key="OptionSet integer for slot 1"
              of-type="Whole.None" usage="input" required="false" />
    <property name="value2" display-name-key="Value 2" description-key="OptionSet integer for slot 2"
              of-type="Whole.None" usage="input" required="false" />
    <property name="value3" display-name-key="Value 3" description-key="OptionSet integer for slot 3"
              of-type="Whole.None" usage="input" required="false" />
    <property name="value4" display-name-key="Value 4" description-key="OptionSet integer for slot 4"
              of-type="Whole.None" usage="input" required="false" />
    <property name="value5" display-name-key="Value 5" description-key="OptionSet integer for slot 5"
              of-type="Whole.None" usage="input" required="false" />
    <resources>
      <code path="index.ts" order="1" />
    </resources>
  </control>
</manifest>
```

- [ ] **Step 5: Create index.ts stub and build**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
export class ChoicePillButtons implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  public init(): void {}
  public updateView(): void {}
  public getOutputs(): IOutputs { return {}; }
  public destroy(): void {}
}
```

```bash
cd ChoicePillButtons && npm install && npm run build
```

Expected: succeeds, `generated/ManifestTypes.d.ts` exists.

- [ ] **Step 6: Commit**

```bash
git add ChoicePillButtons/
git commit -m "feat(choice-pill-buttons): scaffold project with manifest and type generation"
```

---

### Task 2: Types and colour map utility

**Files:**
- Create: `ChoicePillButtons/types.ts`
- Create: `ChoicePillButtons/utils/colorMap.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface OptionItem {
  Value: number;
  Label: string;
}

export interface ColorMapInput {
  options: OptionItem[];
  colors: Array<string | undefined>;
  values: Array<number | undefined>;
}
```

- [ ] **Step 2: Create utils/colorMap.ts**

```typescript
import { ColorMapInput } from '../types';

const NEUTRAL = '#605E5C';
const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function isValidHex(s: string): boolean {
  return HEX_RE.test(s);
}

export function buildColorMap(input: ColorMapInput): Map<number, string> {
  const map = new Map<number, string>();
  for (let i = 0; i < 5; i++) {
    const c = input.colors[i];
    if (!c || !isValidHex(c)) continue;
    const v = input.values[i];
    const key = typeof v === 'number' && isFinite(v) ? v : input.options[i]?.Value;
    if (typeof key !== 'number') continue;
    map.set(key, c);
  }
  return map;
}

export function colorFor(value: number, map: Map<number, string>): string {
  return map.get(value) ?? NEUTRAL;
}
```

- [ ] **Step 3: Commit**

```bash
git add ChoicePillButtons/types.ts ChoicePillButtons/utils/colorMap.ts
git commit -m "feat(choice-pill-buttons): add types and colour map utility"
```

---

### Task 3: Styles

**Files:**
- Create: `ChoicePillButtons/styles/tokens.ts`

- [ ] **Step 1: Create styles/tokens.ts**

```typescript
import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    fontFamily: FONT,
  },
};

export const pillStyles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    padding: '6px 14px',
    borderRadius: 4,
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #E1DFDD',
    background: '#fff',
    color: '#323130',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.1s, border-color 0.1s',
  } as React.CSSProperties,
  disabled: {
    background: '#F3F2F1',
    color: '#A19F9D',
    border: '1px solid #EDEBE9',
    cursor: 'not-allowed',
  } as React.CSSProperties,
};

export const INJECTED_CSS = `
.cpb-pill:not(.cpb-pill--selected):not(.cpb-pill--disabled):hover {
  background: #F3F2F1 !important;
}
.cpb-pill:focus-visible {
  outline: 2px solid #0078D4;
  outline-offset: 2px;
}
`;
```

- [ ] **Step 2: Commit**

```bash
git add ChoicePillButtons/styles/tokens.ts
git commit -m "feat(choice-pill-buttons): add styles and injected hover CSS"
```

---

### Task 4: PillButton component

**Files:**
- Create: `ChoicePillButtons/components/PillButton.tsx`

- [ ] **Step 1: Create components/PillButton.tsx**

```tsx
import * as React from 'react';
import { pillStyles } from '../styles/tokens';

interface PillButtonProps {
  label: string;
  isSelected: boolean;
  color: string;
  disabled: boolean;
  onClick: () => void;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  isSelected,
  color,
  disabled,
  onClick,
}) => {
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [disabled, onClick]
  );

  const classNames = ['cpb-pill'];
  if (isSelected) classNames.push('cpb-pill--selected');
  if (disabled) classNames.push('cpb-pill--disabled');

  let style: React.CSSProperties;
  if (isSelected && disabled) {
    style = {
      ...pillStyles.base,
      background: color,
      color: '#fff',
      border: `1px solid ${color}`,
      opacity: 0.6,
      cursor: 'not-allowed',
    };
  } else if (isSelected) {
    style = {
      ...pillStyles.base,
      background: color,
      color: '#fff',
      border: `1px solid ${color}`,
    };
  } else if (disabled) {
    style = { ...pillStyles.base, ...pillStyles.disabled };
  } else {
    style = { ...pillStyles.base };
  }

  return (
    <div
      className={classNames.join(' ')}
      role="button"
      aria-pressed={isSelected}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKeyDown}
      style={style}
    >
      {label}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add ChoicePillButtons/components/PillButton.tsx
git commit -m "feat(choice-pill-buttons): add PillButton component with visual states"
```

---

### Task 5: ChoicePillButtons root component

**Files:**
- Create: `ChoicePillButtons/components/ChoicePillButtons.tsx`

- [ ] **Step 1: Create components/ChoicePillButtons.tsx**

```tsx
import * as React from 'react';
import { PillButton } from './PillButton';
import { colorFor } from '../utils/colorMap';
import { containerStyles, INJECTED_CSS } from '../styles/tokens';
import { OptionItem } from '../types';

interface ChoicePillButtonsProps {
  options: OptionItem[];
  selectedValue: number | null;
  colorMap: Map<number, string>;
  disabled: boolean;
  onSelect: (value: number) => void;
}

let cssInjected = false;
function injectCss(): void {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = INJECTED_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const MAX_OPTIONS = 5;

export const ChoicePillButtonsRoot: React.FC<ChoicePillButtonsProps> = ({
  options,
  selectedValue,
  colorMap,
  disabled,
  onSelect,
}) => {
  React.useEffect(() => { injectCss(); }, []);

  const visibleOptions = options.slice(0, MAX_OPTIONS);

  return (
    <div style={containerStyles.root}>
      {visibleOptions.map((opt) => (
        <PillButton
          key={opt.Value}
          label={opt.Label}
          isSelected={selectedValue === opt.Value}
          color={colorFor(opt.Value, colorMap)}
          disabled={disabled}
          onClick={() => onSelect(opt.Value)}
        />
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add ChoicePillButtons/components/ChoicePillButtons.tsx
git commit -m "feat(choice-pill-buttons): add root component with option rendering"
```

---

### Task 6: PCF lifecycle (index.ts)

**Files:**
- Modify: `ChoicePillButtons/index.ts` (replace stub)

- [ ] **Step 1: Replace index.ts with full implementation**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChoicePillButtonsRoot } from './components/ChoicePillButtons';
import { buildColorMap } from './utils/colorMap';
import { OptionItem } from './types';

export class ChoicePillButtons
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private currentValue: number | null = null;
  private lastContext!: ComponentFramework.Context<IInputs>;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    this.lastContext = context;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.lastContext = context;

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact(context);
      return;
    }

    this.currentValue = context.parameters.value.raw ?? null;
    this.renderReact(context);
  }

  private handleSelect = (newValue: number): void => {
    this.currentValue = newValue;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact(this.lastContext);
  };

  private renderReact(context: ComponentFramework.Context<IInputs>): void {
    const paramAttrs = context.parameters.value.attributes;
    const options: OptionItem[] = (paramAttrs as unknown as { Options?: OptionItem[] })?.Options ?? [];

    const colors: Array<string | undefined> = [
      context.parameters.color1?.raw ?? undefined,
      context.parameters.color2?.raw ?? undefined,
      context.parameters.color3?.raw ?? undefined,
      context.parameters.color4?.raw ?? undefined,
      context.parameters.color5?.raw ?? undefined,
    ];
    const values: Array<number | undefined> = [
      context.parameters.value1?.raw ?? undefined,
      context.parameters.value2?.raw ?? undefined,
      context.parameters.value3?.raw ?? undefined,
      context.parameters.value4?.raw ?? undefined,
      context.parameters.value5?.raw ?? undefined,
    ];

    const colorMap = buildColorMap({ options, colors, values });

    const disabled =
      context.mode.isControlDisabled ||
      (context.parameters.value as unknown as { security?: { editable?: boolean } })
        .security?.editable === false;

    this.root.render(
      React.createElement(ChoicePillButtonsRoot, {
        options,
        selectedValue: this.currentValue,
        colorMap,
        disabled,
        onSelect: this.handleSelect,
      })
    );
  }

  public getOutputs(): IOutputs {
    return { value: this.currentValue ?? undefined } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add ChoicePillButtons/index.ts
git commit -m "feat(choice-pill-buttons): add PCF lifecycle with pendingOutput pattern"
```

---

### Task 7: Build and verify

- [ ] **Step 1: Run production build**

```bash
cd ChoicePillButtons && npm run build
```

Expected: `webpack compiled successfully`.

- [ ] **Step 2: Verify manifest references bundle.js**

```bash
grep 'code path' out/controls/ControlManifest.xml
```

Expected: `<code path="bundle.js" order="1"/>`

- [ ] **Step 3: Verify no restricted patterns**

```bash
grep -c 'fluentui\|platform-library' out/controls/bundle.js
```

Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add ChoicePillButtons/
git commit -m "build(choice-pill-buttons): production build verified"
```

---

### Task 8: Standalone solution + main solution integration

**Files:**
- Create: `Solution/cpb-pack/` (standalone solution)
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Modify: `SOLUTION_PACKAGING.md`

- [ ] **Step 1: Create standalone solution pack**

```bash
mkdir -p Solution/cpb-pack/Controls/Syg.ChoicePillButtons
cp ChoicePillButtons/out/controls/bundle.js Solution/cpb-pack/Controls/Syg.ChoicePillButtons/
cp ChoicePillButtons/out/controls/ControlManifest.xml Solution/cpb-pack/Controls/Syg.ChoicePillButtons/
```

Create `Solution/cpb-pack/[Content_Types].xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/octet-stream" />
  <Default Extension="js" ContentType="application/octet-stream" />
</Types>
```

Create `Solution/cpb-pack/customizations.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CustomControls>
    <CustomControl>
      <Name>Syg.ChoicePillButtons</Name>
      <FileName>/Controls/Syg.ChoicePillButtons/ControlManifest.xml</FileName>
    </CustomControl>
  </CustomControls>
</ImportExportXml>
```

Create `Solution/cpb-pack/solution.xml` — same publisher block as `Solution/rtm-pack/solution.xml` but with:
- `<UniqueName>SygnumChoicePillButtons</UniqueName>`
- `<LocalizedName description="Sygnum ChoicePillButtons" />`
- `<Version>1.0.0</Version>`
- Single RootComponent: `<RootComponent type="66" schemaName="Syg.ChoicePillButtons" behavior="0" />`

- [ ] **Step 2: Build standalone zip**

```bash
cd Solution/cpb-pack
zip -r ../bin/Release/SygnumChoicePillButtons_1.0.0.zip . -x "*.DS_Store"
```

- [ ] **Step 3: Add to main solution pack**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.ChoicePillButtons
cp ChoicePillButtons/out/controls/bundle.js Solution/manual-pack/Controls/Syg.ChoicePillButtons/
cp ChoicePillButtons/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.ChoicePillButtons/
```

Add to `solution.xml` RootComponents:
```xml
      <RootComponent type="66" schemaName="Syg.ChoicePillButtons" behavior="0" />
```

Add to `customizations.xml` CustomControls:
```xml
    <CustomControl>
      <Name>Syg.ChoicePillButtons</Name>
      <FileName>/Controls/Syg.ChoicePillButtons/ControlManifest.xml</FileName>
    </CustomControl>
```

Bump `<Version>` in solution.xml.

- [ ] **Step 4: Verify counts (must be 10)**

```bash
grep -c "RootComponent type=" Solution/manual-pack/solution.xml
grep -c "<Name>" Solution/manual-pack/customizations.xml
ls Solution/manual-pack/Controls/ | wc -l
```

All three must return `10`.

- [ ] **Step 5: Update SOLUTION_PACKAGING.md**

Change "9 total" to "10 total". Add row:
```
| 10 | Syg.ChoicePillButtons | Pill-style buttons for OptionSet fields |
```
Update verification commands from "must be 9" to "must be 10".

- [ ] **Step 6: Commit**

```bash
git add Solution/ ChoicePillButtons/ SOLUTION_PACKAGING.md
git commit -m "feat(solution): add ChoicePillButtons as 10th control + standalone solution"
```

---

## Self-Review

| Spec requirement | Task |
|---|---|
| OptionSet field binding | Task 1 (manifest) |
| Per-value colour config (5 slots) | Task 1 (manifest), Task 2 (colorMap) |
| Value override slots | Task 1 (manifest), Task 2 (colorMap) |
| Invalid hex fallback | Task 2 (colorMap isValidHex) |
| isFinite check on value slots | Task 2 (colorMap) |
| PillButton visual states (selected/unselected/disabled) | Task 4 |
| Keyboard accessibility (Enter/Space, aria-pressed) | Task 4 |
| Hover CSS injection | Task 3 (tokens), Task 5 (injectCss) |
| Max 5 options | Task 5 (MAX_OPTIONS slice) |
| Flex wrap | Task 3 (containerStyles) |
| pendingOutput pattern | Task 6 |
| Disabled detection (isControlDisabled + security.editable) | Task 6 |
| getOutputs returns integer | Task 6 |
| Standalone solution | Task 8 |
| Main solution integration (10th control) | Task 8 |
| SOLUTION_PACKAGING.md update | Task 8 |

**Placeholder scan:** No TBD, TODO, or incomplete sections.

**Type consistency:** `OptionItem` used in types.ts, colorMap.ts, ChoicePillButtons.tsx, index.ts. `ColorMapInput` used in types.ts and colorMap.ts. `colorFor` used in colorMap.ts and ChoicePillButtons.tsx. All consistent.
