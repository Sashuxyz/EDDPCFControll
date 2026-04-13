# OnboardingApprovalTracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only PCF dataset control that visualises the onboarding approval workflow as a progress bar with circles, detail cards, and chronological activity timeline supporting multi-round approvals with send-back detection.

**Architecture:** React 18 dataset PCF control. Resolves parent `syg_approvalflow` via PCF context -> Xrm.Page -> OData fallback. Pure utility modules group transition logs into rounds (split on `transitionType=5 + currentStatus=13` send-backs) and build timeline events. Renders three visual zones: header with round indicator, current-round progress bar with circles-on-bar + detail cards, and full chronological vertical timeline below.

**Tech Stack:** React 18, TypeScript, PCF dataset API, Xrm.Navigation, OData v9.2 fetch, pcf-scripts (webpack production)

**Spec:** `docs/superpowers/specs/2026-04-13-onboarding-approval-tracker-design.md`

---

## File Structure

```
OnboardingApprovalTracker/
├── index.ts                           # PCF lifecycle (createRoot, updateView, destroy)
├── ControlManifest.Input.xml          # Dataset binding (4 columns)
├── OnboardingApprovalTracker.pcfproj
├── package.json
├── tsconfig.json
├── types.ts                           # Interfaces, STEP_DEFS, STEP_MAP, constants
├── components/
│   ├── ApprovalTracker.tsx            # Root: state, parent resolution, paging, orchestration
│   ├── ProgressBar.tsx                # Bar + circle indicators (3 states)
│   ├── DetailCards.tsx                # Detail card row beneath bar
│   ├── Timeline.tsx                   # Vertical activity timeline
│   └── EmptyState.tsx                 # No-data / error states
├── utils/
│   ├── recordExtractor.ts             # Extract typed values from DataSet records (handle lookup format)
│   ├── roundGrouper.ts                # Group records into ApprovalRound[]
│   ├── timelineBuilder.ts             # Build TimelineEvent[] from rounds
│   ├── parentContext.ts               # Parent resolution + OData fetch with retry
│   ├── navigation.ts                  # Multi-level nav + GUID validation
│   └── dateFormat.ts                  # de-CH date/time formatting
└── styles/
    └── tokens.ts                      # All inline style objects
```

---

### Task 1: Scaffold Project

**Files:**
- Create: `OnboardingApprovalTracker/package.json`
- Create: `OnboardingApprovalTracker/tsconfig.json`
- Create: `OnboardingApprovalTracker/ControlManifest.Input.xml`
- Create: `OnboardingApprovalTracker/OnboardingApprovalTracker.pcfproj`

- [ ] **Step 1: Create package.json** (same pattern as other controls)

```json
{
  "name": "onboarding-approval-tracker",
  "version": "1.0.0",
  "description": "Visual approval progress tracker for client onboarding",
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
    "outDir": "out",
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="OnboardingApprovalTracker" version="1.0.0" display-name-key="OnboardingApprovalTracker" description-key="Approval progress tracker for client onboarding" control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <data-set name="transitionLogs" display-name-key="Transition Logs" cds-data-set-options="displayCommandBar:false;displayViewSelector:false">
      <property-set name="transitionType" display-name-key="Transition Type" of-type="OptionSet" usage="bound" required="true" />
      <property-set name="previousAssignee" display-name-key="Previous Assignee" of-type="Lookup.Simple" usage="bound" required="true" />
      <property-set name="datetimeFrom" display-name-key="Datetime From" of-type="DateAndTime.DateAndTime" usage="bound" required="true" />
      <property-set name="currentStatus" display-name-key="Current Status" of-type="OptionSet" usage="bound" required="true" />
    </data-set>
    <resources>
      <code path="index.ts" order="1" />
    </resources>
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
    </feature-usage>
  </control>
</manifest>
```

- [ ] **Step 4: Create OnboardingApprovalTracker.pcfproj**

Same structure as `CompactSubgrid.pcfproj` with `Name=OnboardingApprovalTracker` and unique `ProjectGuid` (`d7e8f9a0-b1c2-3456-d7e8-f9a0b1c23456`).

- [ ] **Step 5: Run `npm install`**

```bash
cd OnboardingApprovalTracker && npm install
```

Expected: ~510 packages installed, 0 vulnerabilities.

- [ ] **Step 6: Commit scaffold**

### Task 2: types.ts

**Files:**
- Create: `OnboardingApprovalTracker/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface ApprovalStepDef {
  key: string;
  label: string;
  shortLabel: string;
  transitionType: number;
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

export interface ExtractedRecord {
  recordId: string;
  transitionType: number | null;
  currentStatus: number | null;
  approverName: string | null;
  approverId: string | null;
  occurredOn: Date | null;
}

export const STEP_DEFS: Record<string, ApprovalStepDef> = {
  rm:         { key: 'rm',         label: 'RM approval',  shortLabel: 'RM',     transitionType: 1 },
  sh:         { key: 'sh',         label: 'Segment Head', shortLabel: 'SH',     transitionType: 2 },
  compliance: { key: 'compliance', label: 'Compliance',   shortLabel: 'Compl.', transitionType: 3 },
  bab:        { key: 'bab',        label: 'BAB',          shortLabel: 'BAB',    transitionType: 4 },
};

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

- [ ] **Step 2: Commit**

### Task 3: utils/dateFormat.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/dateFormat.ts`

- [ ] **Step 1: Create dateFormat.ts**

```typescript
export function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  const date = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  return `${date}, ${time}`;
}
```

- [ ] **Step 2: Commit**

### Task 4: utils/recordExtractor.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/recordExtractor.ts`

- [ ] **Step 1: Create recordExtractor.ts**

Handles D365 lookup value format (plain string OR nested `{etn, id: {guid}, name}`).

```typescript
import { ExtractedRecord } from '../types';

type DSRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

function extractOptionSetValue(record: DSRecord, columnName: string): number | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'Value' in (raw as Record<string, unknown>)) {
    return (raw as unknown as { Value: number }).Value;
  }
  const parsed = parseInt(String(raw), 10);
  return isNaN(parsed) ? null : parsed;
}

function extractLookupId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null) {
    const lookup = raw as ComponentFramework.LookupValue;
    if (lookup.id) {
      if (typeof lookup.id === 'string') return lookup.id.replace(/[{}]/g, '');
      const nested = lookup.id as unknown as { guid?: string };
      if (nested.guid) return nested.guid.replace(/[{}]/g, '');
    }
  }
  const str = String(raw);
  if (str && str !== 'null' && str !== 'undefined' && str !== '[object Object]') {
    return str.replace(/[{}]/g, '');
  }
  return null;
}

function extractDate(record: DSRecord, columnName: string): Date | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? null : d;
}

export function extractRecord(record: DSRecord, recordId: string): ExtractedRecord {
  const previousAssigneeRaw = record.getValue('previousAssignee');
  const approverName = record.getFormattedValue('previousAssignee') || null;
  const approverId = extractLookupId(previousAssigneeRaw);

  return {
    recordId,
    transitionType: extractOptionSetValue(record, 'transitionType'),
    currentStatus: extractOptionSetValue(record, 'currentStatus'),
    approverName,
    approverId,
    occurredOn: extractDate(record, 'datetimeFrom'),
  };
}

export function extractAllRecords(dataset: ComponentFramework.PropertyTypes.DataSet): ExtractedRecord[] {
  const records: ExtractedRecord[] = [];
  for (const id of dataset.sortedRecordIds) {
    const rec = dataset.records[id];
    if (!rec) continue;
    records.push(extractRecord(rec, id));
  }
  return records;
}
```

- [ ] **Step 2: Commit**

### Task 5: utils/roundGrouper.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/roundGrouper.ts`

- [ ] **Step 1: Create roundGrouper.ts**

```typescript
import { ExtractedRecord, ApprovalRound, ApprovalStep, STEP_DEFS, STEP_MAP, SEND_BACK_TRANSITION_TYPE, SEND_BACK_STATUS_FRONT_INPUT_REQUIRED } from '../types';

interface RoundBucket {
  approvalEvents: ExtractedRecord[];
  sentBack?: { record: ExtractedRecord };
}

export function groupIntoRounds(records: ExtractedRecord[], approvalFlow: number): ApprovalRound[] {
  const stepKeys = STEP_MAP[approvalFlow];
  if (!stepKeys) return [];

  // Sort ascending by occurrence date (oldest first)
  const sorted = [...records].sort((a, b) => {
    const aT = a.occurredOn?.getTime() ?? 0;
    const bT = b.occurredOn?.getTime() ?? 0;
    return aT - bT;
  });

  const buckets: RoundBucket[] = [{ approvalEvents: [] }];
  let currentBucket = buckets[0];

  for (const rec of sorted) {
    const isApproval = rec.transitionType !== null && rec.transitionType >= 1 && rec.transitionType <= 4;
    const isSendBack = rec.transitionType === SEND_BACK_TRANSITION_TYPE && rec.currentStatus === SEND_BACK_STATUS_FRONT_INPUT_REQUIRED;

    if (isApproval) {
      currentBucket.approvalEvents.push(rec);
    } else if (isSendBack) {
      currentBucket.sentBack = { record: rec };
      currentBucket = { approvalEvents: [] };
      buckets.push(currentBucket);
    }
    // Otherwise ignore (transitionType=5 with status != 13)
  }

  return buckets.map((bucket, idx) => {
    const roundNumber = idx + 1;
    const isCurrent = idx === buckets.length - 1;

    // Build steps for this round, picking most recent approval per transitionType
    const stepsByType: Map<number, ExtractedRecord> = new Map();
    for (const ev of bucket.approvalEvents) {
      if (ev.transitionType === null) continue;
      const existing = stepsByType.get(ev.transitionType);
      if (!existing || (ev.occurredOn?.getTime() ?? 0) > (existing.occurredOn?.getTime() ?? 0)) {
        stepsByType.set(ev.transitionType, ev);
      }
    }

    const steps: ApprovalStep[] = stepKeys.map((key) => {
      const def = STEP_DEFS[key];
      const matched = stepsByType.get(def.transitionType);
      if (matched) {
        return {
          ...def,
          status: 'completed',
          approverName: matched.approverName ?? '(Unknown)',
          approvedOn: matched.occurredOn ?? undefined,
          recordId: matched.recordId,
        };
      }
      return { ...def, status: 'upcoming' };
    });

    // First non-completed becomes 'active' (only on the current round, before send-back)
    if (isCurrent && !bucket.sentBack) {
      const firstUpcomingIdx = steps.findIndex((s) => s.status === 'upcoming');
      if (firstUpcomingIdx >= 0) {
        steps[firstUpcomingIdx] = { ...steps[firstUpcomingIdx], status: 'active' };
      }
    }

    const round: ApprovalRound = {
      roundNumber,
      steps,
      isCurrent,
    };
    if (bucket.sentBack) {
      const sb = bucket.sentBack.record;
      round.sentBack = {
        by: sb.approverName ?? '(Unknown)',
        byRecordId: sb.recordId,
        on: sb.occurredOn ?? new Date(0),
      };
    }
    return round;
  });
}
```

- [ ] **Step 2: Commit**

### Task 6: utils/timelineBuilder.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/timelineBuilder.ts`

- [ ] **Step 1: Create timelineBuilder.ts**

```typescript
import { ApprovalRound, TimelineEvent, STEP_DEFS } from '../types';

export function buildTimelineEvents(rounds: ApprovalRound[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const round of rounds) {
    // Approval events for completed steps
    for (const step of round.steps) {
      if (step.status === 'completed' && step.approvedOn) {
        events.push({
          type: 'approval',
          step: STEP_DEFS[step.key],
          approverName: step.approverName,
          recordId: step.recordId,
          occurredOn: step.approvedOn,
          roundNumber: round.roundNumber,
        });
      }
    }

    // Send-back event for this round
    if (round.sentBack) {
      events.push({
        type: 'sentBack',
        step: STEP_DEFS.rm, // Sent back to RM
        approverName: round.sentBack.by,
        recordId: round.sentBack.byRecordId,
        occurredOn: round.sentBack.on,
        roundNumber: round.roundNumber,
      });
    }

    // Awaiting event for the active step in current round
    if (round.isCurrent && !round.sentBack) {
      const activeStep = round.steps.find((s) => s.status === 'active');
      if (activeStep) {
        events.push({
          type: 'awaiting',
          step: STEP_DEFS[activeStep.key],
          roundNumber: round.roundNumber,
        });
      }
    }
  }

  // Sort newest first; awaiting events go to the very top regardless of date
  events.sort((a, b) => {
    if (a.type === 'awaiting' && b.type !== 'awaiting') return -1;
    if (b.type === 'awaiting' && a.type !== 'awaiting') return 1;
    const aT = a.occurredOn?.getTime() ?? 0;
    const bT = b.occurredOn?.getTime() ?? 0;
    return bT - aT;
  });

  return events;
}
```

- [ ] **Step 2: Commit**

### Task 7: utils/navigation.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/navigation.ts`

- [ ] **Step 1: Create navigation.ts**

```typescript
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanGuid(id: string | null | undefined): string {
  if (!id) return '';
  return id.replace(/[{}]/g, '').toLowerCase();
}

export function isValidGuid(id: string | null | undefined): boolean {
  return GUID_REGEX.test(cleanGuid(id));
}

interface XrmNavigation {
  openForm?: (options: { entityName: string; entityId: string }) => Promise<unknown>;
}

export function openTransitionLog(
  context: ComponentFramework.Context<unknown>,
  recordId: string
): void {
  const cleaned = cleanGuid(recordId);
  if (!isValidGuid(cleaned)) return;

  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigation } }).Xrm;
  if (xrm?.Navigation?.openForm) {
    void xrm.Navigation.openForm({
      entityName: 'syg_onboardingtransitionlog',
      entityId: cleaned,
    });
    return;
  }

  try {
    context.navigation.openForm({
      entityName: 'syg_onboardingtransitionlog',
      entityId: cleaned,
    });
    return;
  } catch {
    // fall through to URL
  }

  try {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/main.aspx?etn=syg_onboardingtransitionlog&id=${cleaned}&pagetype=entityrecord`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // give up silently
  }
}
```

- [ ] **Step 2: Commit**

### Task 8: utils/parentContext.ts

**Files:**
- Create: `OnboardingApprovalTracker/utils/parentContext.ts`

- [ ] **Step 1: Create parentContext.ts**

```typescript
import { cleanGuid, isValidGuid } from './navigation';

export interface ParentInfo {
  entityName: string;
  entityId: string;
}

export type FetchOutcome =
  | { kind: 'ok'; approvalFlow: number | null }
  | { kind: 'no-parent' }
  | { kind: 'error' };

function getXrmGlobalContext(): { getClientUrl?: () => string } | undefined {
  const xrm = (window as unknown as {
    Xrm?: { Utility?: { getGlobalContext?: () => { getClientUrl?: () => string } } };
  }).Xrm;
  return xrm?.Utility?.getGlobalContext?.();
}

export function resolveParentInfo(context: ComponentFramework.Context<unknown>): ParentInfo | null {
  const ctxInfo = (context.mode as unknown as {
    contextInfo?: { entityTypeName?: string; entityId?: string };
  }).contextInfo;

  let entityName = ctxInfo?.entityTypeName;
  let entityId = ctxInfo?.entityId;

  if (!entityName || !entityId) {
    const xrmEntity = (window as unknown as {
      Xrm?: { Page?: { data?: { entity?: { getEntityName?: () => string; getId?: () => string } } } };
    }).Xrm?.Page?.data?.entity;
    if (xrmEntity) {
      entityName = entityName || xrmEntity.getEntityName?.();
      entityId = entityId || xrmEntity.getId?.();
    }
  }

  if (!entityName || !entityId) return null;
  const cleaned = cleanGuid(entityId);
  if (!isValidGuid(cleaned)) return null;
  return { entityName, entityId: cleaned };
}

async function fetchOnce(parent: ParentInfo): Promise<FetchOutcome> {
  const baseUrl = getXrmGlobalContext()?.getClientUrl?.() ?? window.location.origin;
  // Pluralization: clientonboarding -> clientonboardings (handled by Dataverse standard convention)
  const setName = `${parent.entityName}s`;

  try {
    const resp = await fetch(
      `${baseUrl}/api/data/v9.2/${setName}(${parent.entityId})?$select=syg_approvalflow`,
      {
        credentials: 'include',
        headers: {
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          'Accept': 'application/json',
        },
      }
    );
    if (!resp.ok && resp.status !== 304) return { kind: 'error' };
    const data = await resp.json();
    const raw = data?.syg_approvalflow;
    const approvalFlow = typeof raw === 'number' ? raw : null;
    return { kind: 'ok', approvalFlow };
  } catch {
    return { kind: 'error' };
  }
}

export async function fetchApprovalFlow(parent: ParentInfo): Promise<FetchOutcome> {
  const first = await fetchOnce(parent);
  if (first.kind === 'ok') return first;
  await new Promise((r) => setTimeout(r, 1000));
  return fetchOnce(parent);
}
```

- [ ] **Step 2: Commit**

### Task 9: styles/tokens.ts

**Files:**
- Create: `OnboardingApprovalTracker/styles/tokens.ts`

- [ ] **Step 1: Create tokens.ts**

```typescript
import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    fontFamily: FONT,
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    padding: '24px 32px',
  },
};

export const headerStyles: S = {
  row: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 16,
    borderBottom: '1px solid #edebe9',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
  },
  roundIndicator: {
    fontSize: 11,
    fontWeight: 600,
    color: '#605E5C',
  },
  approvedIndicator: {
    fontSize: 11,
    fontWeight: 600,
    color: '#107C10',
  },
};

export const progressBarStyles: S = {
  wrapper: {
    position: 'relative',
    height: 24,
    margin: '8px 0 12px 0',
  },
  bar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    height: 4,
    display: 'flex',
    gap: 0,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentCompleted: {
    flex: 1,
    background: '#107C10',
  },
  segmentUpcoming: {
    flex: 1,
    background: '#E1DFDD',
  },
  circlesRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBase: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    background: '#107C10',
  },
  circleActive: {
    background: '#fff',
    border: '2px solid #0078D4',
  },
  circleUpcoming: {
    background: '#E1DFDD',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#0078D4',
  },
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#A19F9D',
  },
  labelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#605E5C',
    marginTop: 4,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
};

export const detailCardsStyles: S = {
  row: {
    display: 'flex',
    gap: 0,
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #edebe9',
  },
  card: {
    flex: 1,
    padding: '0 12px',
    borderRight: '1px solid #edebe9',
  },
  cardLast: {
    flex: 1,
    padding: '0 12px',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#323130',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: 6,
  },
  approver: {
    fontSize: 13,
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  approverPlain: {
    fontSize: 13,
    color: '#323130',
  },
  approverMuted: {
    fontSize: 13,
    color: '#A19F9D',
  },
  date: {
    fontSize: 12,
    color: '#605E5C',
    marginTop: 2,
    minHeight: 14,
  },
  statusApproved: {
    fontSize: 11,
    color: '#107C10',
    marginTop: 6,
    fontWeight: 600,
  },
  statusActive: {
    fontSize: 11,
    color: '#0078D4',
    marginTop: 6,
    fontWeight: 600,
  },
  statusUpcoming: {
    fontSize: 11,
    color: '#A19F9D',
    marginTop: 6,
  },
};

export const timelineStyles: S = {
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #edebe9',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#605E5C',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: 14,
  },
  list: {
    position: 'relative',
    paddingLeft: 24,
  },
  rail: {
    position: 'absolute',
    left: 7,
    top: 8,
    bottom: 8,
    width: 1,
    background: '#E1DFDD',
  },
  item: {
    position: 'relative',
    paddingBottom: 16,
  },
  itemLast: {
    position: 'relative',
    paddingBottom: 0,
  },
  dotBase: {
    position: 'absolute',
    left: -20,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  dotApproval: { background: '#107C10' },
  dotSendBack: { background: '#A4262C' },
  dotAwaiting: { background: '#0078D4' },
  description: {
    fontSize: 13,
    color: '#323130',
  },
  descriptionSendBack: {
    fontSize: 13,
    color: '#323130',
    fontWeight: 600,
  },
  approverLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  meta: {
    fontSize: 11,
    color: '#605E5C',
    marginTop: 2,
  },
};

export const emptyStateStyles: S = {
  root: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#A19F9D',
    fontSize: 13,
  },
};
```

- [ ] **Step 2: Commit**

### Task 10: components/EmptyState.tsx

**Files:**
- Create: `OnboardingApprovalTracker/components/EmptyState.tsx`

- [ ] **Step 1: Create EmptyState.tsx**

```tsx
import * as React from 'react';
import { emptyStateStyles, containerStyles } from '../styles/tokens';

interface EmptyStateProps {
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div style={containerStyles.root}>
    <div style={emptyStateStyles.root}>{message}</div>
  </div>
);
```

- [ ] **Step 2: Commit**

### Task 11: components/ProgressBar.tsx

**Files:**
- Create: `OnboardingApprovalTracker/components/ProgressBar.tsx`

- [ ] **Step 1: Create ProgressBar.tsx**

```tsx
import * as React from 'react';
import { ApprovalStep } from '../types';
import { progressBarStyles } from '../styles/tokens';

const CHECK_PATH = 'M5 12l5 5L20 7';

interface ProgressBarProps {
  steps: ApprovalStep[];
}

function CompletedCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleCompleted }}>
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round">
        <path d={CHECK_PATH} />
      </svg>
    </div>
  );
}

function ActiveCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleActive }}>
      <div style={progressBarStyles.activeDot} />
    </div>
  );
}

function UpcomingCircle(): React.ReactElement {
  return (
    <div style={{ ...progressBarStyles.circleBase, ...progressBarStyles.circleUpcoming }}>
      <div style={progressBarStyles.upcomingDot} />
    </div>
  );
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ steps }) => {
  // Bar segments: between each pair of circles, color reflects "is left circle completed?"
  // Segment count = steps.length - 1
  const segmentCount = Math.max(0, steps.length - 1);

  return (
    <div>
      <div style={progressBarStyles.wrapper}>
        <div style={progressBarStyles.bar}>
          {Array.from({ length: segmentCount }, (_, i) => {
            const leftStep = steps[i];
            const completed = leftStep.status === 'completed';
            return (
              <div
                key={i}
                style={completed ? progressBarStyles.segmentCompleted : progressBarStyles.segmentUpcoming}
              />
            );
          })}
        </div>
        <div style={progressBarStyles.circlesRow}>
          {steps.map((step) => {
            if (step.status === 'completed') return <CompletedCircle key={step.key} />;
            if (step.status === 'active') return <ActiveCircle key={step.key} />;
            return <UpcomingCircle key={step.key} />;
          })}
        </div>
      </div>
      <div style={progressBarStyles.labelsRow}>
        {steps.map((step) => (
          <span key={step.key} style={progressBarStyles.label}>
            {step.shortLabel === 'SH' ? 'Segment Head' : step.shortLabel === 'Compl.' ? 'Compliance' : step.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

### Task 12: components/DetailCards.tsx

**Files:**
- Create: `OnboardingApprovalTracker/components/DetailCards.tsx`

- [ ] **Step 1: Create DetailCards.tsx**

```tsx
import * as React from 'react';
import { ApprovalStep } from '../types';
import { detailCardsStyles } from '../styles/tokens';
import { formatDateTime } from '../utils/dateFormat';

interface DetailCardsProps {
  steps: ApprovalStep[];
  onApproverClick: (recordId: string) => void;
}

function ApproverElement({ step, onClick }: { step: ApprovalStep; onClick: (id: string) => void }): React.ReactElement {
  if (step.status !== 'completed') {
    if (step.status === 'active') {
      return <div style={detailCardsStyles.approverMuted}>Awaiting review</div>;
    }
    return <div style={detailCardsStyles.approverMuted}>--</div>;
  }
  if (!step.recordId || !step.approverName || step.approverName === '(Unknown)') {
    return <div style={detailCardsStyles.approverPlain}>{step.approverName ?? '(Unknown)'}</div>;
  }
  return (
    <div
      style={detailCardsStyles.approver}
      role="link"
      tabIndex={0}
      onClick={() => onClick(step.recordId!)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(step.recordId!);
        }
      }}
    >
      {step.approverName}
    </div>
  );
}

function StatusLine({ step }: { step: ApprovalStep }): React.ReactElement {
  if (step.status === 'completed') return <div style={detailCardsStyles.statusApproved}>Approved</div>;
  if (step.status === 'active') return <div style={detailCardsStyles.statusActive}>In progress</div>;
  return <div style={detailCardsStyles.statusUpcoming}>Not started</div>;
}

function DateLine({ step }: { step: ApprovalStep }): React.ReactElement {
  return <div style={detailCardsStyles.date}>{step.approvedOn ? formatDateTime(step.approvedOn) : '\u00A0'}</div>;
}

export const DetailCards: React.FC<DetailCardsProps> = ({ steps, onApproverClick }) => {
  return (
    <div style={detailCardsStyles.row}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const labelText =
          step.shortLabel === 'SH' ? 'Segment Head' :
          step.shortLabel === 'Compl.' ? 'Compliance' :
          step.shortLabel;
        return (
          <div key={step.key} style={isLast ? detailCardsStyles.cardLast : detailCardsStyles.card}>
            <div style={detailCardsStyles.label}>{labelText}</div>
            <ApproverElement step={step} onClick={onApproverClick} />
            <DateLine step={step} />
            <StatusLine step={step} />
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 2: Commit**

### Task 13: components/Timeline.tsx

**Files:**
- Create: `OnboardingApprovalTracker/components/Timeline.tsx`

- [ ] **Step 1: Create Timeline.tsx**

```tsx
import * as React from 'react';
import { TimelineEvent } from '../types';
import { timelineStyles } from '../styles/tokens';
import { formatDateTime } from '../utils/dateFormat';

interface TimelineProps {
  events: TimelineEvent[];
  onApproverClick: (recordId: string) => void;
}

function dotStyle(event: TimelineEvent): React.CSSProperties {
  const base = timelineStyles.dotBase;
  if (event.type === 'approval') return { ...base, ...timelineStyles.dotApproval };
  if (event.type === 'sentBack') return { ...base, ...timelineStyles.dotSendBack };
  return { ...base, ...timelineStyles.dotAwaiting };
}

function ApproverLink({ name, recordId, onClick }: { name?: string; recordId?: string; onClick: (id: string) => void }): React.ReactElement | null {
  if (!name) return null;
  if (!recordId || name === '(Unknown)') {
    return <span>{name}</span>;
  }
  return (
    <span
      style={timelineStyles.approverLink}
      role="link"
      tabIndex={0}
      onClick={() => onClick(recordId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(recordId);
        }
      }}
    >
      {name}
    </span>
  );
}

function EventDescription({ event, onApproverClick }: { event: TimelineEvent; onApproverClick: (id: string) => void }): React.ReactElement {
  if (event.type === 'awaiting') {
    return (
      <div style={timelineStyles.description}>
        <strong>Awaiting {event.step.label} review</strong>
      </div>
    );
  }
  if (event.type === 'sentBack') {
    return (
      <div style={timelineStyles.descriptionSendBack}>
        <span style={{ color: '#A4262C' }}>Sent back to RM</span>{' '}
        <span style={{ fontWeight: 'normal', color: '#323130' }}>by{' '}
          <ApproverLink name={event.approverName} recordId={event.recordId} onClick={onApproverClick} />
        </span>
      </div>
    );
  }
  // approval
  return (
    <div style={timelineStyles.description}>
      {event.step.label.replace(' approval', '')} approved by{' '}
      <ApproverLink name={event.approverName} recordId={event.recordId} onClick={onApproverClick} />
    </div>
  );
}

function MetaLine({ event }: { event: TimelineEvent }): React.ReactElement {
  if (event.type === 'awaiting') {
    return <div style={timelineStyles.meta}>Round {event.roundNumber} -- In progress</div>;
  }
  const dt = event.occurredOn ? formatDateTime(event.occurredOn) : '';
  return <div style={timelineStyles.meta}>{dt} -- Round {event.roundNumber}</div>;
}

export const Timeline: React.FC<TimelineProps> = ({ events, onApproverClick }) => {
  if (events.length === 0) return null;
  return (
    <div style={timelineStyles.section}>
      <div style={timelineStyles.sectionLabel}>Activity timeline</div>
      <div style={timelineStyles.list}>
        <div style={timelineStyles.rail} />
        {events.map((event, idx) => {
          const isLast = idx === events.length - 1;
          return (
            <div key={idx} style={isLast ? timelineStyles.itemLast : timelineStyles.item}>
              <div style={dotStyle(event)} />
              <EventDescription event={event} onApproverClick={onApproverClick} />
              <MetaLine event={event} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

### Task 14: components/ApprovalTracker.tsx

**Files:**
- Create: `OnboardingApprovalTracker/components/ApprovalTracker.tsx`

- [ ] **Step 1: Create ApprovalTracker.tsx**

```tsx
import * as React from 'react';
import { ApprovalRound, TimelineEvent } from '../types';
import { containerStyles, headerStyles } from '../styles/tokens';
import { ProgressBar } from './ProgressBar';
import { DetailCards } from './DetailCards';
import { Timeline } from './Timeline';
import { openTransitionLog } from '../utils/navigation';
import { formatDate } from '../utils/dateFormat';

interface ApprovalTrackerProps {
  rounds: ApprovalRound[];
  events: TimelineEvent[];
  context: ComponentFramework.Context<unknown>;
}

function findFinalApprovalDate(currentRound: ApprovalRound | undefined): Date | null {
  if (!currentRound) return null;
  const allCompleted = currentRound.steps.every((s) => s.status === 'completed');
  if (!allCompleted) return null;
  let latest: Date | null = null;
  for (const s of currentRound.steps) {
    if (s.approvedOn && (latest === null || s.approvedOn > latest)) {
      latest = s.approvedOn;
    }
  }
  return latest;
}

export const ApprovalTracker: React.FC<ApprovalTrackerProps> = ({ rounds, events, context }) => {
  const currentRound = rounds.find((r) => r.isCurrent);
  if (!currentRound) {
    return (
      <div style={containerStyles.root}>
        <div style={headerStyles.row}>
          <span style={headerStyles.title}>Approval progress</span>
        </div>
      </div>
    );
  }

  const totalRounds = rounds.length;
  const finalApprovalDate = findFinalApprovalDate(currentRound);

  const onApproverClick = React.useCallback(
    (recordId: string) => {
      openTransitionLog(context, recordId);
    },
    [context]
  );

  return (
    <div style={containerStyles.root}>
      <div style={headerStyles.row}>
        <span style={headerStyles.title}>Approval progress</span>
        {finalApprovalDate ? (
          <span style={headerStyles.approvedIndicator}>Approved on {formatDate(finalApprovalDate)}</span>
        ) : totalRounds > 1 ? (
          <span style={headerStyles.roundIndicator}>Round {currentRound.roundNumber} of {totalRounds}</span>
        ) : (
          <span style={headerStyles.roundIndicator}>Round 1</span>
        )}
      </div>

      <ProgressBar steps={currentRound.steps} />
      <DetailCards steps={currentRound.steps} onApproverClick={onApproverClick} />
      <Timeline events={events} onApproverClick={onApproverClick} />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

### Task 15: index.ts (PCF Lifecycle)

**Files:**
- Create: `OnboardingApprovalTracker/index.ts`

- [ ] **Step 1: Create index.ts**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ApprovalTracker } from './components/ApprovalTracker';
import { EmptyState } from './components/EmptyState';
import { extractAllRecords } from './utils/recordExtractor';
import { groupIntoRounds } from './utils/roundGrouper';
import { buildTimelineEvents } from './utils/timelineBuilder';
import { resolveParentInfo, fetchApprovalFlow, ParentInfo } from './utils/parentContext';
import { STEP_MAP } from './types';

type FlowState =
  | { kind: 'loading' }
  | { kind: 'no-parent' }
  | { kind: 'error' }
  | { kind: 'ok'; approvalFlow: number | null };

export class OnboardingApprovalTracker
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private parentId: string | null = null;
  private flowState: FlowState = { kind: 'loading' };

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    this.root = createRoot(container);
    context.mode.trackContainerResize(true);
    try {
      context.parameters.transitionLogs.paging.setPageSize(250);
    } catch {
      // setPageSize not available in all environments
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const ds = context.parameters.transitionLogs;

    // Auto-load all pages
    if (!ds.loading && ds.paging?.hasNextPage) {
      try {
        ds.paging.loadNextPage();
      } catch {
        // give up; render what we have
      }
    }

    // Resolve parent and fetch approvalFlow if not yet done OR parent changed
    const parent = resolveParentInfo(context as unknown as ComponentFramework.Context<unknown>);
    const newParentId = parent?.entityId ?? null;

    if (this.parentId !== newParentId) {
      this.parentId = newParentId;
      if (!parent) {
        this.flowState = { kind: 'no-parent' };
      } else {
        this.flowState = { kind: 'loading' };
        void this.loadFlow(parent);
      }
    }

    this.render(context, ds);
  }

  private async loadFlow(parent: ParentInfo): Promise<void> {
    const result = await fetchApprovalFlow(parent);
    if (result.kind === 'ok') {
      this.flowState = { kind: 'ok', approvalFlow: result.approvalFlow };
    } else {
      this.flowState = { kind: 'error' };
    }
    // Re-render after fetch completes
    this.notifyOutputChanged();
  }

  private render(
    context: ComponentFramework.Context<IInputs>,
    ds: ComponentFramework.PropertyTypes.DataSet
  ): void {
    if (this.flowState.kind === 'loading') {
      this.root.render(React.createElement(EmptyState, { message: 'Loading approval configuration...' }));
      return;
    }

    if (this.flowState.kind === 'no-parent' || this.flowState.kind === 'error') {
      this.root.render(
        React.createElement(EmptyState, { message: 'Unable to load approval configuration' })
      );
      return;
    }

    const flow = this.flowState.approvalFlow;
    if (flow == null || !STEP_MAP[flow]) {
      this.root.render(React.createElement(EmptyState, { message: 'No approval flow configured' }));
      return;
    }

    const records = extractAllRecords(ds);
    const rounds = groupIntoRounds(records, flow);
    const events = buildTimelineEvents(rounds);

    this.root.render(
      React.createElement(ApprovalTracker, {
        rounds,
        events,
        context: context as unknown as ComponentFramework.Context<unknown>,
      })
    );
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

- [ ] **Step 2: Build to verify compile**

```bash
cd "/Users/Sascha/EDD PCF Control/EDDPCFControll/OnboardingApprovalTracker" && npm run build
```

Expected: `webpack compiled successfully` and `Generating build outputs... Succeeded`.

- [ ] **Step 3: Verify clean bundle**

```bash
grep -c '\beval(' /Users/Sascha/EDD\ PCF\ Control/EDDPCFControll/OnboardingApprovalTracker/out/controls/bundle.js
```

Expected: `0`

- [ ] **Step 4: Commit**

### Task 16: Solution Packaging

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker/bundle.js` (copy from build output)
- Create: `Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker/ControlManifest.xml` (copy from build output)

- [ ] **Step 1: Add RootComponent to solution.xml**

After the last existing `<RootComponent>` line in `solution.xml`, add:

```xml
<RootComponent type="66" schemaName="Syg.OnboardingApprovalTracker" behavior="0" />
```

Bump `<Version>` (e.g. `6.1.0` -> `7.0.0`).

- [ ] **Step 2: Add CustomControl entry to customizations.xml**

After the last existing `<CustomControl>` block, add:

```xml
<CustomControl>
  <Name>Syg.OnboardingApprovalTracker</Name>
  <FileName>/Controls/Syg.OnboardingApprovalTracker/ControlManifest.xml</FileName>
</CustomControl>
```

- [ ] **Step 3: Copy build output**

```bash
mkdir -p "/Users/Sascha/EDD PCF Control/EDDPCFControll/Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker"
cp "/Users/Sascha/EDD PCF Control/EDDPCFControll/OnboardingApprovalTracker/out/controls/bundle.js" \
   "/Users/Sascha/EDD PCF Control/EDDPCFControll/Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker/"
cp "/Users/Sascha/EDD PCF Control/EDDPCFControll/OnboardingApprovalTracker/out/controls/ControlManifest.xml" \
   "/Users/Sascha/EDD PCF Control/EDDPCFControll/Solution/manual-pack/Controls/Syg.OnboardingApprovalTracker/"
```

- [ ] **Step 4: Repackage solution zip**

```bash
cd "/Users/Sascha/EDD PCF Control/EDDPCFControll/Solution/manual-pack"
rm -f ../bin/Release/SygnumPCFComponents.zip
zip -r ../bin/Release/SygnumPCFComponents.zip solution.xml customizations.xml '[Content_Types].xml' Controls/
ls -lh ../bin/Release/SygnumPCFComponents.zip
```

Expected: zip created, listing shows `Syg.OnboardingApprovalTracker/bundle.js` and `ControlManifest.xml` in the archive.

- [ ] **Step 5: Commit**

### Task 17: End-to-end Verification (D365)

- [ ] **Step 1: Import** the updated solution into the D365 sandbox.
- [ ] **Step 2: Open** a `syg_clientonboarding` form. Configure the `syg_onboardingtransitionlog` subgrid to use the new `Syg.OnboardingApprovalTracker` control. Ensure the columns in the subgrid view include `syg_transitiontype`, `syg_previousassigneeid`, `syg_datetimefrom`, `syg_currentstatus`.
- [ ] **Step 3: Verify** the following with real data:

  - Approval flow value 1: only RM step shown
  - Approval flow value 4: all four steps (RM, SH, Compliance, BAB) shown
  - Approval flow value 5: three steps (RM, SH, BAB) -- Compliance NOT shown, even if a Compliance log exists
  - Send-back (transitionType=5 + currentStatus=13): increments round counter, "Sent back to RM" appears in timeline as red event
  - Multiple rounds: header shows "Round N of N", current round bar reflects only that round's logs
  - All approvals complete: bar fully green, header shows "Approved on DD.MM.YYYY"
  - Click approver name: opens the corresponding transition log record
  - No approval flow on parent: "No approval flow configured" message
  - Parent context unavailable: "Unable to load approval configuration" message
  - No restricted function calls in bundle, no console errors in DevTools, no Solution Checker critical violations
