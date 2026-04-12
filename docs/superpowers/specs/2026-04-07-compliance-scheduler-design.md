# ComplianceConditionScheduler — Design Specification

## Overview

A field-bound PCF control that replaces raw Dataverse fields for compliance condition scheduling with a guided wizard UI. Compliance officers configure frequency, deadlines, and recurrence through card selections and chip presets. The control shows a schedule summary, timeline visualization, and natural language explanation.

## Problem

The current D365 form exposes raw fields (Frequency, Start Type, Relative Days, Recurrence Interval, Lead Time, Due Date, Anchor Date) which feel technical and confuse compliance officers. Field visibility rules are complex and error-prone when managed through form business rules.

## Solution

A self-contained wizard control that:
- Guides users through configuration step by step (frequency, deadline type, details)
- Uses card selections and chip presets instead of raw dropdowns and number fields
- Shows a live schedule summary with timeline visualization
- Generates a natural language explanation of the schedule
- Handles all field visibility logic internally
- Renders as a read-only summary when the form is disabled

---

## Control Type

**Field-bound PCF** (not dataset). Primary bound field: `syg_frequency` (OptionSet). All other scheduling fields are additional bound input/output parameters.

---

## Bound Properties

| Parameter | Type | D365 Field | Values |
|-----------|------|------------|--------|
| frequency | OptionSet | syg_frequency | 0 = One-off, 1 = Recurring |
| startType | OptionSet | syg_starttype | 0 = Fixed, 1 = Relative |
| relativeDays | Whole.None | syg_relativedays | nullable |
| recurrenceInterval | Whole.None | syg_recurrenceinterval | nullable |
| leadTime | Whole.None | syg_leadtime | default 14 |
| dueDate | DateAndTime.DateOnly | syg_duedate | nullable |
| anchorDate | DateAndTime.DateOnly | syg_anchordate | nullable |
| statusCode | OptionSet | statuscode | 1 = Draft, 2 = Active, 3 = Completed |

---

## Layout (Refined D365 Style)

### General Style Principles
- **Border radius**: 2px (D365 native), except chips which use 16px pill shape
- **Input fields**: D365 style — `background: #F3F2F1; border: none; border-bottom: 2px solid transparent`. Focus: `border-bottom: 2px solid #0078D4` (stays grey, blue underline only).
- **Option cards**: Flat, inline 16px icons (no icon boxes), 2px border-radius, 1px borders
- **Section labels**: Simple semibold text (no numbered step badges)
- **Colors**: Same token palette as prototype `C` object

### Header
- **Left**: "Condition scheduling" (15px, weight 700, #3B3A39)
- **Right**: Status badge (Draft/Active/Completed with colored backgrounds) + "Reset" text link (#605E5C, visible only when frequency is set)
- Bottom border: 2px solid #edebe9

### Section 1: Frequency
- **Label**: "Frequency" (13px, semibold, #323130)
- **Two option cards** side by side:
  - Selected: `border: 1px solid #0078D4; background: #EFF6FC`
  - Unselected: `border: 1px solid #E1DFDD; background: #fff`
  - Hover (unselected): `border-color: #A19F9D; background: #FAF9F8`
  - Content: 16px inline SVG icon + label (13px, semibold) + short description (11px, #605E5C)
  - Padding: 10px 14px
- **Options**: "One-off" (single deadline) and "Recurring" (regular cycle)

### Section 2: Deadline Type (visible after frequency selected)
- **Label**: "Deadline" (13px, semibold, #323130)
- **Two option cards**: Same style as Section 1
- **Options**: "Fixed date" (exact date) and "Relative to approval" (calculated after approval)

### Section 3: Configuration Details (visible after both selections)
- **Label**: "Details" (13px, semibold, #323130)

**Due date (Fixed mode)**:
- D365-style date input (grey bg, blue underline on focus)
- Helper text below: "The RM must complete the task by this date." (one-off) or "Deadline for the first cycle." (recurring)

**Days after approval (Relative mode)**:
- Pill chips: 30 days, 60 days, 90 days, Custom
- Selected chip: `border: 1px solid #0078D4; background: #EFF6FC; color: #0078D4; font-weight: 600`
- Unselected chip: `border: 1px solid #E1DFDD; background: #F3F2F1; color: #323130`
- Custom mode: shows number input (D365 style) + "days" suffix
- Helper text: "Due date = approval date + N days" + "Awaiting approval" amber badge if no anchor date

**Recurrence interval (Recurring mode only)**:
- Pill chips: Monthly (30), Quarterly (90), Semi-annual (180), Annual (365), Custom

**Lead time (always visible in Section 3)**:
- Pill chips: 1 week (7), 2 weeks (14), 1 month (30), Custom
- Helper text: "The task appears in the RM's activities N days before the due date."

### Schedule Summary Panel
- Background: #FAF9F8, border: 1px solid #edebe9, border-radius: 2px, padding: 16px 20px
- Header: "SCHEDULE SUMMARY" (12px, weight 700, #605E5C, uppercase, letter-spacing 0.05em)
- Grid layout: 2 columns for label:value pairs
- Labels: 11px, semibold, #A19F9D, uppercase
- Values: 14px, weight 500, #201F1E
- Fields shown depend on configuration (anchor date, due date, task appears, repeats, next cycle)
- Dates formatted as DD.MM.YYYY (de-CH locale)

### Timeline Visualization
- Inside the summary panel, below the grid
- SVG-based horizontal timeline with colored dots on a track
- Points: Anchor (grey), Task visible (blue), Due date (red), Next cycle (green)
- Labels below each dot: name + formatted date

### Natural Language Explanation
- Below the summary panel
- Blue accent left border (3px solid #0078D4), #EFF6FC background, 2px border-radius
- 13px text, #605E5C, line-height 1.65
- Dynamically generated based on all configuration values
- Example: "The RM will receive this task **14 days** before the due date of **15.04.2026**. Once completed, the condition closes automatically."

---

## Read-Only Mode

When `context.mode.isControlDisabled === true`:
- Skip the wizard steps entirely
- Render directly: summary panel + timeline + natural language explanation
- No interactive elements (no cards, chips, buttons, inputs)
- This is the RM's view — they see the schedule, not the configuration

---

## Write-Back to Dataverse

Same pattern as WealthAllocationControl with `pendingOutput` flag to prevent updateView loop:
- On user interaction: update internal state, set `pendingOutput = true`, call `notifyOutputChanged()`
- `getOutputs()` returns all values mapped to Dataverse types (OptionSet integers, Date objects, Whole Numbers)
- `updateView()` skips reading from context when `pendingOutput` is true

---

## Date Handling

- **Format**: DD.MM.YYYY via `toLocaleDateString("de-CH")`
- **addDays(date, days)**: Pure date arithmetic, returns ISO date string
- **Anchor date**: Read-only from Dataverse (populated by Power Automate on approval). Never written by the component.
- **Calculated due date**: `startType === "Relative" ? anchorDate + relativeDays : dueDate`
- **Task start date**: `dueDate - leadTime` (but never before today)
- **Next recurrence**: `dueDate + recurrenceInterval` (recurring only)

---

## Visibility Logic

| Mode | Due Date | Relative Days | Recurrence Interval | Lead Time | Anchor Date |
|------|----------|---------------|---------------------|-----------|-------------|
| One-off + Fixed | editable | hidden | hidden | editable | hidden |
| One-off + Relative | read-only (calc) | editable | hidden | editable | read-only |
| Recurring + Fixed | editable | hidden | editable | editable | hidden |
| Recurring + Relative | read-only (calc) | editable | editable | editable | read-only |

---

## Technical Constraints

- **Inline styles only** — no Fluent UI v9
- **React 18** with `createRoot`
- **Production build** (`--buildMode production`)
- **No console.log** in production
- **SVG icons** inline (no emojis, no icon fonts)
- **Dependencies**: react, react-dom only
- **Date locale**: de-CH (DD.MM.YYYY)
- **updateView loop prevention**: pendingOutput flag + value comparison (same as WealthAllocationControl)

---

## Project Structure

```
EDDPCFControll/ComplianceConditionScheduler/
├── index.ts                              # PCF lifecycle + state + getOutputs
├── ControlManifest.Input.xml             # 8 bound properties
├── ComplianceConditionScheduler.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                              # Interfaces, OptionSet maps, icon paths
├── components/
│   ├── SchedulerContainer.tsx            # Root: wizard flow or read-only summary
│   ├── OptionCard.tsx                    # Selectable card (frequency, deadline type)
│   ├── ChipRow.tsx                       # Chip presets with custom input
│   ├── ScheduleSummary.tsx               # Summary panel + timeline SVG
│   └── NaturalLanguage.tsx               # Dynamic explanation text
├── utils/
│   └── dateUtils.ts                      # formatDate, addDays, intervalLabel
└── styles/
    └── tokens.ts                         # All inline style objects
```

### Solution Packaging
- Add `<RootComponent type="66" schemaName="Syg.ComplianceConditionScheduler" behavior="0" />` to solution.xml
- Add `<CustomControl>` entry to customizations.xml
- Bundle all five controls in same `SygnumPCFComponents` solution zip

---

## What NOT to Build

- "Simulate approval" button (demo only — anchor date comes from Power Automate)
- Dark mode
- Notification/reminder logic (component only configures schedule parameters)

---

## Design References

- Working prototype: `ComplianceConditionScheduler.jsx`
- Visual refinements: `.superpowers/brainstorm/` — `scheduler-refined.html`
- Style: D365-refined (flat cards, pill chips, grey-bg inputs with blue underline)
