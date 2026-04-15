# OnboardingApprovalTracker -- Design Specification

## Overview

A read-only PCF dataset control that replaces the standard subgrid for `syg_onboardingtransitionlog` on the `syg_clientonboarding` form. Renders the approval workflow as a visual progress tracker: current round's progress bar with circle indicators, detail cards per step, and a chronological timeline of all events across all rounds (including send-backs to the RM).

## Problem

The standard subgrid shows a flat list of transition log records with no visual hierarchy. RMs and reviewers cannot quickly answer "which step are we on?", "who approved what?", or "did this go through multiple rounds of revision?". The approval workflow is also non-linear: any approver can send the onboarding back to the RM, restarting the chain.

## Solution

Visual progress tracker showing:
- The current round's required steps as circles on a progress bar (completed/active/upcoming)
- A detail card row beneath the bar with approver name, date, and status per step
- A vertical activity timeline below showing every event chronologically across all rounds, with red markers for send-back events

Read-only visualization. No approve/reject actions are triggered from the component.

---

## Control Type

**Dataset PCF** (not field-bound). Bound to the `syg_onboardingtransitionlog` subgrid on the `syg_clientonboarding` form. Same pattern as EddFindingsViewer, CompactSubgrid, and AssociationCards.

Parent context (`syg_approvalflow` from the parent `syg_clientonboarding` record) is resolved via the established multi-source fallback pattern (PCF context -> Xrm.Page -> OData fetch).

---

## Data Model

### Parent entity: `syg_clientonboarding`

| Field | Logical Name | Type | Purpose |
|-------|-------------|------|---------|
| Approval Flow | `syg_approvalflow` | OptionSet (global) | Determines required approval steps |

### `syg_approvalflow` OptionSet

| Value | Label | Required Steps (ordered) |
|-------|-------|--------------------------|
| 1 | RM only | RM |
| 2 | RM - Segment Head | RM, Segment Head |
| 3 | RM - Segment Head - Compliance | RM, Segment Head, Compliance |
| 4 | RM - Segment Head - Compliance - BAB | RM, Segment Head, Compliance, BAB |
| 5 | RM - Segment Head - BAB | RM, Segment Head, BAB (skips Compliance) |

**Critical**: Value 5 is NOT cumulative -- it skips Compliance. Use an explicit step-list mapping per OptionSet value, not a "show first N steps" heuristic.

### Dataset entity: `syg_onboardingtransitionlog`

| Field | Logical Name | Type | Purpose |
|-------|-------------|------|---------|
| Transition Type | `syg_transitiontype` | OptionSet | Which approval (or send-back) was given |
| Previous Assignee | `syg_previousassigneeid` | Lookup (systemuser) | Person who took the action |
| Datetime From | `syg_datetimefrom` | DateTime | When the action occurred |
| Current Status | `syg_currentstatus` | OptionSet | Status the onboarding moved into |

### `syg_transitiontype` OptionSet

| Value | Label | Use in component |
|-------|-------|------------------|
| 1 | Front approval provided (RM) | Maps to RM step |
| 2 | Senior front approval provided (Segment Head) | Maps to Segment Head step |
| 3 | Compliance approval provided | Maps to Compliance step |
| 4 | BAB approval provided | Maps to BAB step |
| 5 | Transition | Renders as send-back marker when paired with status 13. Otherwise ignored. |

### `syg_currentstatus` OptionSet (relevant values only)

| Value | Label | Use in component |
|-------|-------|------------------|
| 13 | Front Input Required | Combined with transitionType=5, marks a send-back event (start of a new round) |

---

## Round Detection Logic

Approval logs are grouped into **rounds** based on send-back events.

Algorithm:
1. Sort all dataset records by `syg_datetimefrom` ascending
2. Initialize `currentRound = 1`, `roundsBucket = { 1: { events: [] } }`
3. For each record:
   - If `transitionType` is 1-4 (an approval): push into `roundsBucket[currentRound].events`
   - If `transitionType === 5 && currentStatus === 13`: this is a send-back. Mark the current round as `sentBack` with the date and assignee, then increment `currentRound` and start a new bucket
   - Any other `transitionType === 5` event: ignore (generic non-approval transition)
4. After processing, the last round is the **current round**. Its progress bar is the primary visual.

If duplicate approval types appear within a single round, keep the **most recent** by `syg_datetimefrom`.

If an approval log appears for a step that isn't in the required flow (e.g. Compliance log when `syg_approvalflow = 5`): include it in the timeline but ignore for the progress bar.

---

## Layout

The component has four vertical zones:

### 1. Header
- Section title "Approval progress" (14px, semibold, #323130) on the left
- "Round N of N" indicator on the right (11px, semibold, #605E5C). When N is 1, just shows "Round 1".
- Bottom border: 1px solid #edebe9, 8px padding-bottom, 16px margin-bottom

### 2. Current round progress bar + step labels
- Horizontal bar with step indicators (3 or 4 depending on `syg_approvalflow`)
- Bar segments are flat colored fills, no gradients or shadows
- Step indicators are 24px circles **on** the bar
- Step labels (e.g. "RM", "Segment Head", "Compliance", "BAB") sit below in 12px #605E5C
- Circle indicator states defined in "Step States" below

### 3. Detail cards row
- One card per required step, separated by vertical #edebe9 borders
- Each card: uppercase 11px label (D365 field-label style), approver name as blue link, date/time, status text
- Card layout uses `display: flex`; each card has `flex: 1` and equal padding

### 4. Activity timeline
- Section label "Activity timeline" (11px, uppercase, semibold #605E5C, letter-spacing 0.03em)
- Vertical timeline with events stacked top-to-bottom, **newest first**
- Each event has:
  - Colored 8px dot on the left rail (blue=in progress, green=approval, red=send-back, grey=upcoming)
  - Event description (13px, #323130) -- approver name as blue link where applicable
  - Metadata line (11px, #605E5C) -- date, time, "Round N"
- Connecting vertical 1px #E1DFDD line behind the dots
- Shows ALL events across ALL rounds (no truncation, no scroll) -- form scrolls naturally

### Final approved state
When all required steps in the current round are complete:
- Progress bar fully green
- "Round N of N" indicator hidden
- Replaced with "Approved on DD.MM.YYYY" (11px, semibold, #107C10)

---

## Step States

| State | Circle indicator | Bar segment to its left | Detail card |
|-------|------------------|-------------------------|-------------|
| Completed | 24px, #107C10 fill, white checkmark SVG | #107C10 fill | Approver name as link, date/time, "Approved" in #107C10 |
| Active | 24px, white fill, 2px #0078D4 border, 8px blue dot in centre | (no segment, hasn't started) | "Awaiting review" in #A19F9D, "In progress" in #0078D4 |
| Upcoming | 24px, #E1DFDD fill, 6px grey dot in centre | #E1DFDD fill | "--" placeholder, "Not started" in #A19F9D |

---

## Timeline Events

Events shown chronologically (newest first):

| Source | Description | Dot color |
|--------|-------------|-----------|
| Current round, no active log yet | "Awaiting [Step name] review" | #0078D4 (blue) |
| Approval log (`transitionType` 1-4) | "[Step name] approved by [Approver name]" with link | #107C10 (green) |
| Send-back (`transitionType=5 && currentStatus=13`) | "**Sent back to RM** by [Approver name]" with link | #A4262C (red) |

Each event also shows:
- Date and time in `DD.MM.YYYY, HH:MM` (de-CH locale)
- Round number suffix ("Round N")

---

## Parent Context Resolution

Standard multi-source fallback pattern from PCF Development Reference:

```typescript
// Source 1: PCF context
const info = (context.mode as any).contextInfo;
const parentEntity = info?.entityTypeName;
const parentId = info?.entityId;

// Source 2: Xrm.Page fallback
const entity = (window as any).Xrm?.Page?.data?.entity;
parentEntity = parentEntity ?? entity?.getEntityName();
parentId = parentId ?? entity?.getId();

// Source 3: OData fetch for syg_approvalflow
const baseUrl = (window as any).Xrm?.Utility?.getGlobalContext()?.getClientUrl()
  ?? window.location.origin;
const resp = await fetch(
  `${baseUrl}/api/data/v9.2/syg_clientonboardings(${cleanGuid(parentId)})?$select=syg_approvalflow`,
  { credentials: 'include' }
);
```

Cache the resolved approval flow value in component state. Re-fetch on `updateView` only if the parent ID changes.

---

## Approver Name Navigation

Clicking an approver name opens the corresponding `syg_onboardingtransitionlog` record using the multi-level navigation fallback (Xrm.Navigation -> context.navigation -> URL construction). Always validate GUID via regex before navigation.

---

## TypeScript Interfaces and Constants

```typescript
// types.ts
export interface ApprovalStepDef {
  key: string;            // 'rm' | 'sh' | 'compliance' | 'bab'
  label: string;
  shortLabel: string;
  transitionType: number; // Matching syg_transitiontype value (1-4)
}

export type StepStatus = 'completed' | 'active' | 'upcoming';

export interface ApprovalStep extends ApprovalStepDef {
  status: StepStatus;
  approverName?: string;
  approvedOn?: Date;
  recordId?: string;
}

export interface ApprovalRound {
  roundNumber: number;
  steps: ApprovalStep[];
  sentBack?: {
    by: string;
    byRecordId: string;
    on: Date;
  };
  isCurrent: boolean;
}

export interface TimelineEvent {
  type: 'approval' | 'sentBack' | 'awaiting';
  step: ApprovalStepDef;
  approverName?: string;
  recordId?: string;
  occurredOn?: Date;
  roundNumber: number;
}

export const STEP_DEFS: Record<string, ApprovalStepDef> = {
  rm:         { key: 'rm',         label: 'RM approval',  shortLabel: 'RM',     transitionType: 1 },
  sh:         { key: 'sh',         label: 'Segment Head', shortLabel: 'SH',     transitionType: 2 },
  compliance: { key: 'compliance', label: 'Compliance',   shortLabel: 'Compl.', transitionType: 3 },
  bab:        { key: 'bab',        label: 'BAB',          shortLabel: 'BAB',    transitionType: 4 },
};

// CRITICAL: explicit step list per syg_approvalflow value
// Value 5 skips compliance -- NOT cumulative
export const STEP_MAP: Record<number, string[]> = {
  1: ['rm'],
  2: ['rm', 'sh'],
  3: ['rm', 'sh', 'compliance'],
  4: ['rm', 'sh', 'compliance', 'bab'],
  5: ['rm', 'sh', 'bab'],
};

export const SEND_BACK_TRANSITION_TYPE = 5;
export const SEND_BACK_STATUS_FRONT_INPUT_REQUIRED = 13;
```

---

## Edge Cases and Error Handling

| Scenario | Behaviour |
|----------|-----------|
| `syg_approvalflow` is null/empty | Show empty state: "No approval flow configured" in muted text. No progress bar. |
| `syg_approvalflow` has unknown value | Show empty state with same message. Do not crash. |
| No transition log records yet | All required steps render. First step is active. Timeline empty. |
| Duplicate transition types within same round | Use most recent record by `syg_datetimefrom`. |
| `syg_transitiontype = 5` with status NOT 13 | Ignore. |
| Log for step not in required flow | Include in timeline but ignore for progress bar. |
| All required steps complete in current round | Progress bar fully green. "Approved on DD.MM.YYYY" replaces round badge. |
| Parent context cannot be resolved | Show error state: "Unable to load approval configuration". |
| OData fetch fails | Retry once after 1 second. If still failing, show error state. |
| Dataset still loading | Show lightweight skeleton placeholder. |
| `syg_previousassigneeid` is null on a log | Show "(Unknown)" as approver. Step still completed. Name is not a clickable link (no recordId). |

---

## Hard Constraints (from PCF Development Reference)

- React 18 with `createRoot`
- Inline styles only (no Fluent UI v9)
- Production build mode (`pcf-scripts build --buildMode production`)
- No console.log in production
- Inline SVG icons only (no emojis)
- `dataset.paging.setPageSize(250)` in `init()`
- Auto-load all pages via `useEffect` checking `dataset.paging.hasNextPage`
- GUID validation via regex before any `Xrm.Navigation` call
- `credentials: 'include'` on all OData fetch calls
- Response status checking on OData responses
- Manual solution packaging
- Handle D365 lookup format: both plain string IDs and nested `{ etn, id: { guid }, name }` patterns

---

## Project Structure

```
OnboardingApprovalTracker/
  index.ts                         # PCF lifecycle
  ControlManifest.Input.xml        # Dataset binding
  OnboardingApprovalTracker.pcfproj
  package.json
  tsconfig.json
  types.ts                         # Interfaces, STEP_MAP, STEP_DEFS, constants
  components/
    ApprovalTracker.tsx            # Main React component (orchestrator)
    ProgressBar.tsx                # Bar segments + circle indicators
    DetailCards.tsx                # Detail card row
    Timeline.tsx                   # Vertical activity timeline
    EmptyState.tsx                 # No-data / error states
  utils/
    roundGrouper.ts                # Group dataset records into rounds
    timelineBuilder.ts             # Build timeline events from rounds
    parentContext.ts               # Parent resolution + OData fetch
    navigation.ts                  # Multi-level nav fallback + GUID check
    dateFormat.ts                  # de-CH date/time formatting
  styles/
    tokens.ts                      # Design tokens as inline style objects
```

---

## Solution Integration

Add to existing `SygnumPCFComponents` managed solution:
1. Add `<RootComponent type="66" schemaName="Syg.OnboardingApprovalTracker" behavior="0" />` to solution.xml
2. Add `<CustomControl>` entry in customizations.xml
3. Bump `<Version>` in solution.xml
4. Build, copy bundle.js + ControlManifest.xml to `Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker/`
5. Re-zip the solution

---

## Design References

- Visual mockups: `.superpowers/brainstorm/20071-1776080410/content/`
  - `progress-bar-options.html` (Option A approved -- circles on bar)
  - `multi-round-mockup.html` (round badge concept, superseded)
  - `history-alternatives.html` (Option A approved -- vertical timeline)
- Style: D365-native (no rounded badges/pills, plain colored text for status, uppercase 11px labels)
