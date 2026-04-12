# KycDraftTakeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF control that parses AI-generated KYC research JSON, displays it as reviewable section cards, and lets users write individual sections to dedicated Dataverse fields.

**Architecture:** React 18 field-bound control with 9 bound properties (1 input JSON + 8 output fields). Double-parses JSON (array → stringified object), renders as accordion section cards with text formatting, writes back via standard `notifyOutputChanged()` + `getOutputs()` with pendingOutput loop prevention. Inline overwrite confirmation for fields with existing content.

**Tech Stack:** React 18, TypeScript, PCF field-bound API, pcf-scripts (webpack), inline styles only

**Spec:** `docs/superpowers/specs/2026-04-09-kyc-draft-takeover-design.md`

---

## File Structure

```
KycDraftTakeover/
├── index.ts                          # PCF lifecycle + state + pendingOutput + getOutputs
├── ControlManifest.Input.xml         # 9 bound properties
├── KycDraftTakeover.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                          # SectionConfig, SECTION_CONFIGS, TakeoverState, icons
├── components/
│   ├── TakeoverContainer.tsx         # Root: JSON parsing, state, progress bar, section list
│   ├── SectionCard.tsx               # Single section: accordion, take over button, states
│   ├── SectionContent.tsx            # Text formatting + sub-field badge rendering
│   ├── OverwriteConfirm.tsx          # Inline amber confirmation panel
│   └── EmptyState.tsx                # No data / parse error states
├── utils/
│   ├── parseAgentOutput.ts           # JSON double-parse + validation
│   └── parseAgentText.ts            # Plain text → React nodes (headings, lists, paragraphs)
└── styles/
    └── tokens.ts                     # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `KycDraftTakeover/package.json`
- Create: `KycDraftTakeover/tsconfig.json`
- Create: `KycDraftTakeover/ControlManifest.Input.xml`
- Create: `KycDraftTakeover/KycDraftTakeover.pcfproj`

- [ ] **Step 1: Create package.json, tsconfig.json, pcfproj** — Same pattern as other controls.

- [ ] **Step 2: Create ControlManifest.Input.xml** — Field-bound. 9 properties:
```xml
<property name="aiAnalyticsAudit" display-name-key="AI Analytics Audit" of-type="Multiple" usage="bound" required="true" />
<property name="professionalBackground" display-name-key="Professional Background" of-type="Multiple" usage="bound" required="false" />
<property name="financialSituation" display-name-key="Financial Situation" of-type="Multiple" usage="bound" required="false" />
<property name="estimatedTotalWealth" display-name-key="Estimated Total Wealth" of-type="Currency" usage="bound" required="false" />
<property name="relatedParties" display-name-key="Related Parties" of-type="Multiple" usage="bound" required="false" />
<property name="sanctionCheck" display-name-key="Sanction Check" of-type="Multiple" usage="bound" required="false" />
<property name="reputationalRisk" display-name-key="Reputational Risk" of-type="Multiple" usage="bound" required="false" />
<property name="pep" display-name-key="PEP Status" of-type="Multiple" usage="bound" required="false" />
<property name="sources" display-name-key="Sources" of-type="Multiple" usage="bound" required="false" />
```

- [ ] **Step 3: npm install**

- [ ] **Step 4: Commit**

### Task 2: Types + Config + Icons

**Files:**
- Create: `KycDraftTakeover/types.ts`

- [ ] **Step 1: Create types.ts**

Section config interface, SECTION_CONFIGS array (7 entries with jsonKey, summaryKey, targetParam, label, iconPath, subFields), SubFieldConfig, TakeoverState interface (tracks which sections have been taken over), ParsedSection interface, SVG icon path data for each section (person, wallet, people, shield, warning, badge, link, checkmark).

Also include `formatCHF()` for Swiss number formatting (reuse pattern from WealthAllocationControl).

- [ ] **Step 2: Commit**

### Task 3: JSON Parser (parseAgentOutput.ts)

**Files:**
- Create: `KycDraftTakeover/utils/parseAgentOutput.ts`

- [ ] **Step 1: Create parseAgentOutput.ts**

```typescript
export interface ParseResult {
  success: boolean;
  sections: Record<string, unknown>;
  error?: string;
  rawPreview?: string;
}

export function parseAgentOutput(raw: string | null): ParseResult
```

Logic:
1. If null/empty → `{ success: false, error: 'empty' }`
2. `JSON.parse(raw)` → expect array. If fails → `{ success: false, error: 'parse', rawPreview: raw.slice(0, 200) }`
3. Take `array[0]`, `JSON.parse(array[0])` → expect object. If fails → same error pattern
4. Return `{ success: true, sections: parsedObject }`

All wrapped in try/catch, no throws.

- [ ] **Step 2: Commit**

### Task 4: Text Formatter (parseAgentText.ts)

**Files:**
- Create: `KycDraftTakeover/utils/parseAgentText.ts`

- [ ] **Step 1: Create parseAgentText.ts**

```typescript
export function parseAgentText(rawText: string): React.ReactNode[]
```

Logic:
1. Split by `\n\n` into paragraphs
2. Within each paragraph, split by `\n` into lines
3. For each line:
   - If matches `/^[A-Z][A-Z\s&]+:$/` → render as uppercase sub-heading (12px, semibold, #605E5C, letter-spacing 0.3px)
   - If starts with ` - ` → collect consecutive list items, render in left-bordered indent block
   - Otherwise → plain text line with `<br/>`
4. Return array of React elements (paragraphs, headings, list blocks)

Also export:
```typescript
export function parseSourceLinks(rawText: string): Array<{ ref: string; url: string; text: string }>
```
Parses `[N] URL` patterns from the sources section into clickable link data.

- [ ] **Step 2: Commit**

### Task 5: Styles (tokens.ts)

**Files:**
- Create: `KycDraftTakeover/styles/tokens.ts`

- [ ] **Step 1: Create tokens.ts**

Style groups:
- `containerStyles`: root (fontFamily, maxWidth 680, bg #fff)
- `headerStyles`: title row, progress bar (segmented, 3px height, green/grey), progress text
- `cardStyles`: three states — pending (blue left border, #FAFAFA bg), takenOver (green left border, #FAFFF9 bg), collapsed (grey left border, transparent bg, hover turns blue)
- `cardHeaderStyles`: icon + label + chevron row, taken-over badge
- `contentStyles`: text area (13px, #323130, line-height 1.6, margin-left 22px), sub-heading (12px, uppercase, #605E5C), list block (left-border indent), fade mask for taken-over content
- `subFieldStyles`: inline badge (white bg, #E1DFDD border, 4px radius), label (uppercase), value (semibold)
- `buttonStyles`: takeOver outline button (#0078D4 border), takeOverAll text link, takenOverText (green + checkmark)
- `confirmStyles`: amber panel (#FFF4CE bg, #8A7400 left border), overwrite/cancel buttons
- `emptyStyles`: centered icon + message (same pattern as CompactSubgrid)
- `sourceStyles`: numbered link items

- [ ] **Step 2: Commit**

### Task 6: EmptyState Component

**Files:**
- Create: `KycDraftTakeover/components/EmptyState.tsx`

- [ ] **Step 1: Create EmptyState.tsx**

Props: `type: 'empty' | 'error'`, `rawPreview?: string`.

Empty: GridIcon SVG + "No agent output available. Run the KYC research agent to generate a draft."
Error: Warning SVG icon + "Unable to parse agent output." + code block with rawPreview (first 200 chars, monospace, #F3F2F1 bg).

- [ ] **Step 2: Commit**

### Task 7: OverwriteConfirm Component

**Files:**
- Create: `KycDraftTakeover/components/OverwriteConfirm.tsx`

- [ ] **Step 1: Create OverwriteConfirm.tsx**

Props: `fields: string[]` (labels of fields being overwritten), `onConfirm: () => void`, `onCancel: () => void`.

Renders: Amber panel (#FFF4CE bg, 3px #8A7400 left border). Lists affected fields. "Overwrite" solid button + "Cancel" outline button.

Single field: "This field already has content. Taking over will replace it."
Multiple fields: "The following fields already have content: [list]. Taking over will replace them."

- [ ] **Step 2: Commit**

### Task 8: SectionContent Component

**Files:**
- Create: `KycDraftTakeover/components/SectionContent.tsx`

- [ ] **Step 1: Create SectionContent.tsx**

Props: `text: string`, `isSourcesSection: boolean`, `subFields?: Array<{label: string, value: string, isNumeric: boolean}>`.

Renders:
- For regular sections: calls `parseAgentText(text)` and renders the React nodes
- For sources section: calls `parseSourceLinks(text)` and renders numbered clickable links (open in new tab)
- Sub-fields: inline badge with uppercase label + formatted value. Swiss number format for numeric values. Raw text display for non-numeric values.

- [ ] **Step 2: Commit**

### Task 9: SectionCard Component

**Files:**
- Create: `KycDraftTakeover/components/SectionCard.tsx`

- [ ] **Step 1: Create SectionCard.tsx**

Props: `config: SectionConfig`, `text: string | null`, `subFieldValues: Record<string, string>`, `isTakenOver: boolean`, `isExpanded: boolean`, `disabled: boolean`, `existingContent: string | null`, `onToggle: () => void`, `onTakeOver: () => void`.

Three visual states:
1. **Taken over**: Green left border, checkmark icon, "Taken over" badge, dimmed content with fade mask, "Draft Taken Over" green text instead of button
2. **Expanded (pending)**: Blue left border, section icon, content visible, "Take over" outline button at bottom-right
3. **Collapsed**: Grey left border, just header row, hover turns blue. Right-pointing chevron.

If `text` is null (section missing from JSON): don't render anything.
If `disabled` (read-only): hide take-over button.

- [ ] **Step 2: Commit**

### Task 10: TakeoverContainer (Root Component)

**Files:**
- Create: `KycDraftTakeover/components/TakeoverContainer.tsx`

- [ ] **Step 1: Create TakeoverContainer.tsx**

Props: `parsedSections: Record<string, unknown>`, `currentFieldValues: Record<string, string | null>`, `disabled: boolean`, `onTakeOver: (paramNames: string[], values: Record<string, unknown>) => void`.

State: `takenOverSet` (Set of param names), `expandedSet` (Set of param names — all expanded by default), `confirmingFields` (for overwrite confirmation).

Logic:
1. For each SECTION_CONFIG, extract the summary text from parsedSections
2. Track which sections have been taken over
3. Progress bar: count takenOverSet.size vs total available sections
4. "Take over all" checks all pending sections for existing content, shows OverwriteConfirm if needed
5. Individual take over checks single field, shows OverwriteConfirm if needed
6. On confirmed take over: add to takenOverSet, call onTakeOver with param names and values

Header: title + subtitle + "Take over all" link (hidden when disabled or all taken over) + progress bar + progress text.

- [ ] **Step 2: Commit**

### Task 11: PCF Entry Point (index.ts) + Build

**Files:**
- Create: `KycDraftTakeover/index.ts`

- [ ] **Step 1: Create index.ts**

PCF entry point with pendingOutput flag pattern. Key differences from other controls:
- Reads `aiAnalyticsAudit` as input, parses with `parseAgentOutput()`
- Reads all 8 target fields' current values to detect existing content
- Tracks which fields have been written to
- `getOutputs()` returns only the fields that were taken over (not all fields on every call)
- `onTakeOver(paramNames, values)` callback: sets state for each param, pendingOutput=true, notifyOutputChanged

For `estimatedTotalWealth`: only include in getOutputs if the value is a valid finite number.

- [ ] **Step 2: Build and verify**

Run: `cd KycDraftTakeover && npm run build`

- [ ] **Step 3: Commit**

### Task 12: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.KycDraftTakeover/`

- [ ] **Step 1: Update solution.xml** — Add RootComponent, bump version to 6.0.0.

- [ ] **Step 2: Update customizations.xml** — Add CustomControl entry.

- [ ] **Step 3: Copy build output and create zip**

- [ ] **Step 4: Commit**

### Task 13: End-to-End Verification

- [ ] **Step 1: Import solution**
- [ ] **Step 2: Add control to KYC Profile form, bind to syg_aianalyticsaudit + all target fields**
- [ ] **Step 3: Verify checklist**

- Empty field: shows "No agent output available" with GridIcon
- Valid JSON: all 7 sections render as cards
- Text formatting: uppercase headings rendered bold, list items in bordered blocks
- Financial Situation: wealth estimate badge with Swiss formatting
- Sources: clickable numbered links
- Expand/collapse accordion works
- Progress bar updates as sections are taken over
- "Take over" writes to correct target field, section transitions to green state
- "Take over all" writes all sections at once
- Overwrite confirmation appears when target field has existing content
- Read-only mode: cards visible, buttons hidden, progress hidden
- Malformed JSON: error state with raw preview
- Missing sections in JSON: only available sections rendered
- estimatedTotalWealth: only written for valid numbers, disabled for text values
- No console errors
- No updateView loop (pendingOutput flag working)
