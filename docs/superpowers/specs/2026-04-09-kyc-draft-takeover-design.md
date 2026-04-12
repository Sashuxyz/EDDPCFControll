# KycDraftTakeover — Design Specification

## Overview

A field-bound PCF control that displays AI-generated KYC research output (stored as JSON in a multi-line text field) as structured, reviewable section cards. Each section has a "Take Over" button that writes the content into the corresponding dedicated Dataverse field on the same form via bound properties and `notifyOutputChanged()`.

## Problem

The KYC research agent produces a comprehensive JSON output covering professional background, financial situation, related parties, sanctions, reputational risk, PEP status, and sources. Relationship managers must manually copy-paste content from this JSON into individual form fields. This component eliminates that friction.

## Solution

A read-and-write control that:
- Parses double-stringified JSON from the source field
- Renders each section as an expandable card with formatted text
- Lets users "take over" individual sections or all at once
- Writes to target fields via standard PCF bound properties (same pattern as WealthAllocationControl)
- Shows a progress bar tracking how many sections have been taken over
- Handles overwrite confirmation when target fields already have content

---

## Control Type

**Field-bound PCF** (not dataset). Primary bound field: `syg_aianalyticsaudit` (Multi-line text, input-only). All target fields are additional bound input/output properties.

---

## Bound Properties

| Parameter | Type | D365 Field | Usage |
|-----------|------|------------|-------|
| aiAnalyticsAudit | Multiple | syg_aianalyticsaudit | input (read JSON) |
| professionalBackground | Multiple | syg_professionalbackground | bound (read + write) |
| financialSituation | Multiple | syg_financialsituation | bound (read + write) |
| estimatedTotalWealth | Currency | syg_totalwealthchf | bound (read + write) |
| relatedParties | Multiple | syg_relatedparties | bound (read + write) |
| sanctionCheck | Multiple | syg_sanctioncheck | bound (read + write) |
| reputationalRisk | Multiple | syg_reputationalrisk | bound (read + write) |
| pep | Multiple | syg_pep | bound (read + write) |
| sources | Multiple | syg_sources | bound (read + write) |

Note: `estimatedTotalWealth` is Currency type. Only written when the JSON value is a valid number. If the agent returns text like "Unable to determine", the sub-field is displayed but the take-over button is disabled for it.

---

## JSON Parsing

The source field contains a JSON **array** with a single element (a stringified JSON object):

```
["{ \"professionalBackground\": { \"professionalBackgroundSummary\": \"...\" }, ... }"]
```

Parsing steps:
1. `JSON.parse(rawValue)` — outer array
2. `JSON.parse(array[0])` — inner stringified object
3. Extract sections by key

Error handling:
- `null` / empty string → info message: "No agent output available. Run the KYC research agent to generate a draft."
- Parse failure at either stage → error message: "Unable to parse agent output." with first 200 chars of raw content
- Missing section in JSON → skip that section, render remaining normally

---

## Section Configuration

```typescript
interface SectionConfig {
  jsonKey: string;
  summaryKey: string | null;  // null for direct string values (sources)
  targetParam: string;        // PCF parameter name for write-back
  label: string;
  iconPath: string;           // SVG path data
  subFields?: SubFieldConfig[];
}
```

7 sections in fixed order:
1. Professional Background
2. Financial Situation (with estimatedTotalWealthCHF sub-field)
3. Related Parties
4. Sanction Check
5. Reputational Risk
6. PEP Status
7. Sources

---

## Layout

### Header
- **Left**: "Agent Research Output" (15px, semibold, #323130) + "N sections ready for review" (12px, #605E5C)
- **Right**: "Take over all" underlined text link (#0078D4, 12px, semibold)
- **Progress bar**: Thin segmented bar below header. One segment per section. Green (#107C10) for taken-over, grey (#E1DFDD) for pending.
- **Progress text**: "N of 7 taken over" (11px, #A19F9D)

### Section Cards

Three visual states, distinguished by left accent border:

**Pending (not yet taken over):**
- Left border: 3px solid #0078D4 (blue)
- Background: #FAFAFA
- Margin: 12px 16px, border-radius: 0 4px 4px 0
- Header: 14px SVG icon (#0078D4) + section label (13px, semibold, #323130) + chevron
- Content: 13px, #323130, line-height 1.6, indented 22px from left
- "Take over" outline button at bottom-right (12px, #0078D4 border, font-weight 600)
- Accordion: expanded by default on first load, collapsible

**Taken over (success state):**
- Left border: 3px solid #107C10 (green)
- Background: #FAFFF9
- Header: checkmark SVG icon (#107C10) + label + "Taken over" text (#107C10, 11px, semibold)
- Content: dimmed (opacity 0.7), faded with CSS gradient mask at bottom
- Button replaced with green "Draft Taken Over" text with checkmark
- Still expandable to review content

**Collapsed (not yet expanded):**
- Left border: 3px solid #E1DFDD (grey)
- Background: transparent
- Hover: background #FAFAFA, left border turns #0078D4
- Just the header row, no content
- Chevron: &#9656; (right-pointing)

### Text Formatting

The agent output contains structured plain text. Parse and render:
- `\n\n` → paragraph break
- `\n` → line break
- `UPPERCASE TEXT:` at line start → bold sub-heading (12px, uppercase, #605E5C, letter-spacing 0.3px)
- Lines starting with ` - ` → rendered in a left-bordered indent block (2px solid #E1DFDD, padding-left 12px)
- `[N]` inline → source reference (kept as-is in plain text)

Sub-headings rendered with the same pattern as CompactSubgrid detail panel labels.

### Sub-Fields

For Financial Situation, `estimatedTotalWealthCHF` is rendered as an inline badge:
- Container: `background: #fff; border: 1px solid #E1DFDD; border-radius: 4px; padding: 6px 12px`
- Label: "EST. WEALTH" (11px, uppercase, semibold, #605E5C)
- Value: "CHF 20'000'000" (13px, semibold, #323130) — Swiss formatting
- If value is not a valid number: show raw text, disable take-over for this sub-field

### Sources Section

Special rendering for the sources section:
- Parse `[N] URL` patterns into numbered clickable links
- Non-URL text rendered as plain text
- Links open in new tab

---

## Take Over Logic

### Individual Take Over
1. User clicks "Take over" on a section
2. Check if target field already has content
3. If content exists → show confirmation: "The field '[label]' already contains content. Overwrite with the new draft?" with Overwrite / Cancel buttons
4. On confirm (or if field was empty): update internal state, set `pendingOutput = true`, call `notifyOutputChanged()`
5. `getOutputs()` returns the updated field value
6. Section transitions to "Taken over" state
7. Progress bar updates

### Take Over All
1. User clicks "Take over all"
2. Collect all sections that haven't been taken over yet
3. Check which target fields already have content
4. If any have content → show single confirmation listing all fields that will be overwritten
5. On confirm: update all fields at once, single `notifyOutputChanged()` call
6. All sections transition to success state

### Write-Back
Same pattern as WealthAllocationControl with `pendingOutput` flag:
- `getOutputs()` returns only fields that have been taken over
- Text fields: plain text with `\n` line breaks (NOT HTML)
- `estimatedTotalWealth`: numeric value parsed from JSON, only if valid number
- Form stays dirty (unsaved) — RM reviews and saves manually

---

## Overwrite Confirmation

Inline confirmation panel (not a browser dialog — those don't work reliably in PCF):
- Appears below the section card
- Background: #FFF4CE (amber), left border 3px solid #8A7400
- Text: "This field already has content. Taking over will replace it."
- Two buttons: "Overwrite" (solid #0078D4) and "Cancel" (outline)

For "Take over all" with multiple conflicts:
- Single panel listing all affected fields
- "Overwrite all N fields" / "Cancel"

---

## Read-Only Mode

When `context.mode.isControlDisabled`:
- All "Take over" buttons hidden
- "Take over all" link hidden
- Progress bar hidden
- Sections rendered as read-only cards (still expandable for content review)
- Useful for RMs reviewing agent output without write permissions

---

## Empty / Error States

- **No data**: SVG grid icon + "No agent output available. Run the KYC research agent to generate a draft." (same GridIcon as CompactSubgrid/EddFindingsViewer)
- **Parse error**: SVG warning icon + "Unable to parse agent output." + first 200 chars of raw content in a code block
- **Loading**: Not applicable (field-bound controls receive data synchronously via updateView)

---

## Technical Constraints

- **Inline styles only** — no Fluent UI v9
- **React 18** with `createRoot`
- **Production build** (`--buildMode production`)
- **No console.log** in production
- **SVG icons** inline (no emojis)
- **Dependencies**: react, react-dom only
- **updateView loop prevention**: pendingOutput flag + value comparison
- **Date format**: not applicable (no dates in this control)
- **Number format**: Swiss (1'000'000) for wealth estimate

---

## Project Structure

```
EDDPCFControll/KycDraftTakeover/
├── index.ts                          # PCF lifecycle + state + getOutputs
├── ControlManifest.Input.xml         # 9 bound properties
├── KycDraftTakeover.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                          # SectionConfig, ParsedOutput, TakeoverState
├── components/
│   ├── TakeoverContainer.tsx         # Root: parsing, state, progress, sections
│   ├── SectionCard.tsx               # Single section with expand/collapse + take over
│   ├── SectionContent.tsx            # Text formatting + sub-field rendering
│   ├── OverwriteConfirm.tsx          # Inline overwrite confirmation panel
│   └── EmptyState.tsx                # No data / parse error states
├── utils/
│   ├── parseAgentOutput.ts           # JSON double-parse + validation
│   └── parseAgentText.ts            # Plain text → React nodes (headings, lists, etc.)
└── styles/
    └── tokens.ts                     # All inline style objects
```

### Solution Packaging
- Add `<RootComponent type="66" schemaName="Syg.KycDraftTakeover" behavior="0" />` to solution.xml
- Add `<CustomControl>` entry to customizations.xml
- Bundle all six controls in same `SygnumPCFComponents` solution zip

---

## Design References

- Visual mockup: `.superpowers/brainstorm/` — `takeover-d365-refined.html`
- Left accent border pattern reused from EddFindingsViewer mitigation section and CompactSubgrid detail panel
- Sub-heading formatting matches CompactSubgrid detail panel labels
- Progress bar is a new pattern unique to this control
- Overwrite confirmation uses amber accent (same as ComplianceScheduler auto-activate message)
