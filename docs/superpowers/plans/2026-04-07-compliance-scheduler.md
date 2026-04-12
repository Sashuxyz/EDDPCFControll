# ComplianceConditionScheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF wizard control for configuring compliance condition scheduling with guided card selections, chip presets, timeline visualization, and natural language explanation.

**Architecture:** React 18 field-bound control. PCF index.ts owns state with pendingOutput flag to prevent updateView loops. Wizard flow in edit mode, read-only summary in disabled mode. All scheduling logic (date calculations, visibility rules) in pure utility functions. Inline styles with D365-refined aesthetic.

**Tech Stack:** React 18, TypeScript, PCF field-bound API, pcf-scripts (webpack), inline styles only

**Spec:** `docs/superpowers/specs/2026-04-07-compliance-scheduler-design.md`

---

## File Structure

```
ComplianceConditionScheduler/
├── index.ts                              # PCF lifecycle + state + pendingOutput + getOutputs
├── ControlManifest.Input.xml             # 8 bound properties (OptionSets + dates + numbers)
├── ComplianceConditionScheduler.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                              # Interfaces, OptionSet maps, icon SVG paths
├── components/
│   ├── SchedulerContainer.tsx            # Root: wizard flow or read-only summary
│   ├── OptionCard.tsx                    # Selectable card (frequency, deadline type)
│   ├── ChipRow.tsx                       # Chip presets with optional custom input
│   ├── ScheduleSummary.tsx               # Summary panel + timeline SVG
│   └── NaturalLanguage.tsx               # Dynamic explanation text
├── utils/
│   └── dateUtils.ts                      # formatDate, addDays, intervalLabel
└── styles/
    └── tokens.ts                         # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `ComplianceConditionScheduler/package.json`
- Create: `ComplianceConditionScheduler/tsconfig.json`
- Create: `ComplianceConditionScheduler/ControlManifest.Input.xml`
- Create: `ComplianceConditionScheduler/ComplianceConditionScheduler.pcfproj`

- [ ] **Step 1: Create package.json, tsconfig.json, pcfproj** — Same pattern as other controls.

- [ ] **Step 2: Create ControlManifest.Input.xml** — Field-bound. 8 properties:
```xml
<property name="frequency" display-name-key="Frequency" of-type="OptionSet" usage="bound" required="true" />
<property name="startType" display-name-key="Start Type" of-type="OptionSet" usage="bound" required="true" />
<property name="relativeDays" display-name-key="Relative Days" of-type="Whole.None" usage="bound" required="false" />
<property name="recurrenceInterval" display-name-key="Recurrence Interval" of-type="Whole.None" usage="bound" required="false" />
<property name="leadTime" display-name-key="Lead Time" of-type="Whole.None" usage="bound" required="true" />
<property name="dueDate" display-name-key="Due Date" of-type="DateAndTime.DateOnly" usage="bound" required="false" />
<property name="anchorDate" display-name-key="Anchor Date" of-type="DateAndTime.DateOnly" usage="bound" required="false" />
<property name="statusCode" display-name-key="Status" of-type="OptionSet" usage="bound" required="true" />
```

- [ ] **Step 3: npm install**

- [ ] **Step 4: Commit**

### Task 2: Types + Icons + Date Utils

**Files:**
- Create: `ComplianceConditionScheduler/types.ts`
- Create: `ComplianceConditionScheduler/utils/dateUtils.ts`

- [ ] **Step 1: Create types.ts**

Interfaces, OptionSet integer-to-string maps, icon SVG path data, and state interface. Include:
- `FrequencyType`: `'One-off' | 'Recurring' | null`
- `StartType`: `'Fixed' | 'Relative' | null`
- `StatusType`: `'Draft' | 'Active' | 'Completed'`
- `FREQUENCY_MAP`: `{ 0: 'One-off', 1: 'Recurring' }` and reverse
- `START_TYPE_MAP`: `{ 0: 'Fixed', 1: 'Relative' }` and reverse
- `STATUS_MAP`: `{ 1: 'Draft', 2: 'Active', 3: 'Completed' }`
- `SchedulerState` interface with all 8 fields
- `icons` object with SVG path data for oneOff, recurring, calendar, relative, pending, reset

- [ ] **Step 2: Create dateUtils.ts**

`formatDate(d)` — de-CH locale DD.MM.YYYY
`addDays(date, days)` — returns ISO date string or null
`intervalLabel(days)` — 365="annually", 180="semi-annually", 90="quarterly", 30="monthly", else "every N days"

- [ ] **Step 3: Commit**

### Task 3: Styles (tokens.ts)

**Files:**
- Create: `ComplianceConditionScheduler/styles/tokens.ts`

- [ ] **Step 1: Create tokens.ts**

Style groups:
- `containerStyles`: root (fontFamily, maxWidth 600, padding)
- `headerStyles`: title row with status badge + reset link
- `sectionStyles`: label (13px, semibold, #323130), margin spacing
- `cardStyles`: option cards — selected (#0078D4 border, #EFF6FC bg), unselected (#E1DFDD border), hover, 2px border-radius, 10px 14px padding, inline icon + label + description
- `chipStyles`: pill chips — 16px border-radius, selected (#0078D4 border, #EFF6FC bg), unselected (#E1DFDD border, #F3F2F1 bg), 5px 14px padding
- `inputStyles`: D365 grey bg, blue underline on focus (same as WealthAllocationControl)
- `summaryStyles`: panel (#FAF9F8 bg, #edebe9 border), header, grid, labels, values
- `explanationStyles`: blue left border accent, #EFF6FC bg, 13px text
- `badgeStyles`: status badges (Draft grey, Active green, Completed blue), pending amber badge
- `timelineStyles`: SVG dimensions, dot colors

- [ ] **Step 2: Commit**

### Task 4: OptionCard Component

**Files:**
- Create: `ComplianceConditionScheduler/components/OptionCard.tsx`

- [ ] **Step 1: Create OptionCard.tsx**

Props: `selected: boolean`, `onClick: () => void`, `iconPath: string`, `label: string`, `description: string`.

Renders: Flat card with 16px inline SVG icon, label (13px semibold), description (11px #605E5C). Hover state on unselected cards. 2px border-radius. Selected state: blue border + light blue bg.

- [ ] **Step 2: Commit**

### Task 5: ChipRow Component

**Files:**
- Create: `ComplianceConditionScheduler/components/ChipRow.tsx`

- [ ] **Step 1: Create ChipRow.tsx**

Props: `presets: Array<{label: string, days: number | null}>`, `value: number`, `onChange: (days: number) => void`, `isCustom: boolean`, `setIsCustom: (v: boolean) => void`, `unit?: string`.

Renders: Row of pill chips (16px border-radius). Clicking a preset selects it. Clicking "Custom" shows a number input (D365 style) + unit suffix. Selected chip: blue outline + EFF6FC bg. Unselected: #E1DFDD border + #F3F2F1 bg.

- [ ] **Step 2: Commit**

### Task 6: ScheduleSummary Component

**Files:**
- Create: `ComplianceConditionScheduler/components/ScheduleSummary.tsx`

- [ ] **Step 1: Create ScheduleSummary.tsx**

Props: `state: SchedulerState` (all resolved values).

Renders:
1. Summary panel (#FAF9F8 bg) with 2-column grid of label:value pairs
2. Timeline SVG: horizontal track with colored dots (Anchor=grey, Task visible=blue, Due date=red, Next cycle=green) and labels below
3. Shows "Awaiting approval" amber badge when startType is Relative and anchorDate is null
4. Shows "Pending" for calculated fields that can't be computed yet

All dates formatted via `formatDate()`. Visibility of fields follows the spec's visibility matrix.

- [ ] **Step 2: Commit**

### Task 7: NaturalLanguage Component

**Files:**
- Create: `ComplianceConditionScheduler/components/NaturalLanguage.tsx`

- [ ] **Step 1: Create NaturalLanguage.tsx**

Props: `state: SchedulerState`.

Renders: Blue accent panel with dynamically generated explanation text. Four variants:
- One-off + Fixed: "The RM will receive this task **N days** before the due date of **DD.MM.YYYY**. Once completed, the condition closes automatically."
- One-off + Relative: "...which is **N days** after approval..."
- Recurring + Fixed: "The RM will receive a task **interval**, starting **N days** before **DD.MM.YYYY**..."
- Recurring + Relative: "...beginning **N days** after approval. Late completions do not shift future deadlines."

Bold values rendered via `<strong>` tags. Falls back to helper text when dates not yet configured.

- [ ] **Step 2: Commit**

### Task 8: SchedulerContainer (Root Component)

**Files:**
- Create: `ComplianceConditionScheduler/components/SchedulerContainer.tsx`

- [ ] **Step 1: Create SchedulerContainer.tsx**

Props: `state: SchedulerState`, `disabled: boolean`, `onChange: (field: string, value: any) => void`.

Two render modes:

**Edit mode** (disabled=false):
1. Header: title + status badge + Reset link
2. Section "Frequency": two OptionCards (One-off / Recurring)
3. Section "Deadline" (visible when frequency set): two OptionCards (Fixed / Relative)
4. Section "Details" (visible when both set): date input or chip presets depending on mode, recurrence interval chips (recurring only), lead time chips
5. ScheduleSummary panel
6. NaturalLanguage explanation

**Read-only mode** (disabled=true):
1. Header: title + status badge (no Reset)
2. ScheduleSummary panel directly (no wizard steps)
3. NaturalLanguage explanation

Computed values (calculatedDueDate, nextRecurrence, taskStartDate) calculated here and passed down.

- [ ] **Step 2: Commit**

### Task 9: PCF Entry Point (index.ts) + Build

**Files:**
- Create: `ComplianceConditionScheduler/index.ts`

- [ ] **Step 1: Create index.ts**

Same pattern as WealthAllocationControl with pendingOutput flag:
- `init()`: createRoot + trackContainerResize
- `updateView()`: read from context on first load; skip when pendingOutput=true; compare values on subsequent calls
- `handleChange(field, value)`: update state, set pendingOutput=true, notifyOutputChanged, renderReact
- `getOutputs()`: map all state values back to Dataverse types (OptionSet integers, Date objects, Whole Numbers)
- `destroy()`: unmount

OptionSet mapping: read integers from context.parameters, convert to strings for UI, convert back to integers in getOutputs.

Date mapping: read Date objects from context.parameters, convert to ISO strings for internal state, convert back to Date objects in getOutputs.

- [ ] **Step 2: Build and verify**

Run: `cd ComplianceConditionScheduler && npm run build`

- [ ] **Step 3: Commit**

### Task 10: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.ComplianceConditionScheduler/`

- [ ] **Step 1: Update solution.xml** — Add RootComponent, bump version to 5.0.0.

- [ ] **Step 2: Update customizations.xml** — Add CustomControl entry.

- [ ] **Step 3: Copy build output and create zip**

- [ ] **Step 4: Commit**

### Task 11: End-to-End Verification

- [ ] **Step 1: Import solution**
- [ ] **Step 2: Add control to Compliance Condition form, bind to syg_frequency**
- [ ] **Step 3: Verify checklist**

- New record: shows only Frequency section
- Select One-off: Deadline section appears
- Select Fixed: date input + lead time chips appear
- Select Relative: days-after chips + lead time chips + "Awaiting approval" badge
- Select Recurring: recurrence interval chips appear
- Chip selections update summary panel live
- Timeline SVG renders with correct dots and dates
- Natural language explanation updates dynamically
- Reset link clears all values
- Status badge shows Draft/Active/Completed correctly
- Read-only mode: wizard hidden, summary + explanation shown directly
- Values persist to Dataverse on save
- No updateView loop (sliders stable, no flickering)
- No console errors
