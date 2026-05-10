# Trigger Agent Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v0.5.0 of KycFullTakeover with a "Trigger agent run" button in the header bar that POSTs a `syg_agentrunlog` row, polls until `syg_agentrunstatus` ∈ {3, 4}, and shows an animated drone-bot examining floating documents during the run.

**Architecture:** Two pure utilities (`triggerAgentRun`, `pollAgentRunStatus`) handle WebAPI side-effects and are unit-tested. Two React components (`AgentDrone` presentational, `AgentTriggerButton` stateful) own the visual + lifecycle. `HeaderStrip` is rewritten to a coral-aurora command bar that renders the button slot and the drone overlay. Form refresh on success uses `Xrm.Page.data.refresh(false)`.

**Tech Stack:** React 18, TypeScript 4.9 strict, pcf-scripts production build, Jest with `ts-jest` (`testEnvironment: node` — pure-logic tests only; React components are verified manually).

**Spec:** [docs/superpowers/specs/2026-05-10-kycfulltakeover-trigger-agent-run-design.md](../specs/2026-05-10-kycfulltakeover-trigger-agent-run-design.md)

---

## File Structure

### New files
```
KycFullTakeover/
  constants/
    agentRun.ts                            # status codes + poll timing constants
  utils/
    triggerAgentRun.ts                     # POST syg_agentrunlogs (with @odata.bind)
    pollAgentRunStatus.ts                  # adaptive-interval poll loop
  components/
    AgentDrone.tsx                         # drone + 3 docs + 3 beams + keyframes (presentational)
    AgentTriggerButton.tsx                 # button + launch-pad + error-banner state machine
  __tests__/
    triggerAgentRun.test.ts
    pollAgentRunStatus.test.ts
```

### Files modified
```
KycFullTakeover/
  styles/tokens.ts                         # + agentBar token group
  components/HeaderStrip.tsx               # full visual rewrite + new props
  components/KycFullTakeover.tsx           # pass kycProfileId + webAPI to HeaderStrip
  ControlManifest.Input.xml                # 0.4.5 → 0.5.0
Solution/kft-pack/
  solution.xml                             # 0.4.5 → 0.5.0
```

---

## Tasks

### Task 1: Version bump + token additions

**Files:**
- Modify: `KycFullTakeover/ControlManifest.Input.xml`
- Modify: `Solution/kft-pack/solution.xml`
- Modify: `KycFullTakeover/styles/tokens.ts`

- [ ] **Step 1: Bump manifest version**

In `KycFullTakeover/ControlManifest.Input.xml`, line 3, change `version="0.4.5"` to `version="0.5.0"`.

- [ ] **Step 2: Bump solution version**

In `Solution/kft-pack/solution.xml`, line 11, change `<Version>0.4.5</Version>` to `<Version>0.5.0</Version>`.

- [ ] **Step 3: Add `agentBar` token group**

In `KycFullTakeover/styles/tokens.ts`, append after the `layout` export (before the `inputStyle` function):

```ts
export const agentBar = {
  // Background gradient (coral-forward Aurora variant v2b)
  bgGradient:        'linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)',
  borderBottom:      'rgba(255,255,255,0.16)',
  fontFamily:        "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif",

  // Aurora blob colours
  blobCoral:         '#F04E68',
  blobPink:          '#FFB1C0',
  blobAmber:         '#FFC477',

  // Button — idle CTA
  padBgIdle:         'rgba(255,255,255,0.18)',
  padBorderIdle:     'rgba(255,255,255,0.40)',
  padBgIdleHover:    'rgba(255,255,255,0.26)',

  // Button — launch-pad mode (run in progress)
  padBgRunning:      'rgba(255,255,255,0.10)',
  padBorderRunning:  'rgba(255,255,255,0.40)',  // dashed in component

  // Button — success flash
  padBgSuccess:      'rgba(46,160,67,0.85)',

  // Button — error
  padBorderError:    '#ff6b6b',

  // Error banner
  errorBg:           '#fdecea',
  errorFg:           '#7a1f17',
  errorBorder:       '#f5c2bd',
  warningBg:         '#fff4ce',
  warningFg:         '#835B00',
  warningBorder:     '#f0d27a',
};
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/ControlManifest.Input.xml \
        Solution/kft-pack/solution.xml \
        KycFullTakeover/styles/tokens.ts
git commit -m "chore: bump KycFullTakeover to 0.5.0 + add agentBar tokens"
```

---

### Task 2: Agent-run constants

**Files:**
- Create: `KycFullTakeover/constants/agentRun.ts`

- [ ] **Step 1: Create the constants file**

```ts
// Constants for the Trigger Agent Run feature. Status codes mirror the
// syg_agentrunstatus option set on the syg_agentrunlog entity. Poll cadence
// and timeouts are tuned for typical agent runs (~1-3 min, hard cap 15 min).

/** syg_agentrunstatus value meaning "Run completed successfully" */
export const STATUS_SUCCESS = 3;

/** syg_agentrunstatus value meaning "Run failed" */
export const STATUS_FAILURE = 4;

/** Fast poll cadence for the first POLL_FAST_DURATION_MS after triggering. */
export const POLL_FAST_INTERVAL_MS = 5_000;

/** Slow poll cadence after the fast window expires. */
export const POLL_SLOW_INTERVAL_MS = 10_000;

/** Switch from fast to slow poll after this many ms have elapsed. */
export const POLL_FAST_DURATION_MS = 60_000;

/** Hard cap — if no terminal status by then, give up and show timeout banner. */
export const POLL_HARD_TIMEOUT_MS = 900_000;  // 15 min

/** Grace period for the new log row to appear after POST. */
export const POLL_NO_ROWS_GRACE_MS = 30_000;

/** Max consecutive network errors before bailing out with a connection-lost banner. */
export const POLL_MAX_CONSECUTIVE_ERRORS = 5;

/** How long the green "Run complete" flash stays on the button before reverting to idle. */
export const SUCCESS_FLASH_DURATION_MS = 3_000;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/constants/agentRun.ts
git commit -m "feat: add agent-run constants (status codes + poll timing)"
```

---

### Task 3: `triggerAgentRun` utility (TDD)

**Files:**
- Create: `KycFullTakeover/utils/triggerAgentRun.ts`
- Create: `KycFullTakeover/__tests__/triggerAgentRun.test.ts`

The util POSTs to `/api/data/v9.2/syg_agentrunlogs` with `syg_KycProfileId@odata.bind` set to the profile URL. Returns `{ ok: boolean; error?: string }`. Same error-shape pattern as `associateRecords` / `createChildren`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/triggerAgentRun.test.ts
import { triggerAgentRun } from '../utils/triggerAgentRun';

const PROFILE_ID = 'a1b2c3d4-1234-1234-1234-1234567890ab';

describe('triggerAgentRun', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { origin: 'https://crm.example.com' } as Location,
    });
  });
  afterEach(() => {
    (global as { fetch?: typeof fetch }).fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('rejects invalid GUID without calling fetch', async () => {
    const fetchMock = jest.fn();
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const result = await triggerAgentRun('not-a-guid');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid.*guid/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('on 201 returns ok:true', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 201, text: async () => '',
    });
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const result = await triggerAgentRun(PROFILE_ID);
    expect(result.ok).toBe(true);
  });

  test('posts the correct body shape', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true, status: 201, text: async () => '',
    });
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    await triggerAgentRun(PROFILE_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://crm.example.com/api/data/v9.2/syg_agentrunlogs');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body['syg_KycProfileId@odata.bind'])
      .toBe(`/syg_kycprofiles(${PROFILE_ID})`);
  });

  test('on 4xx returns ok:false with HTTP-shaped error', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false, status: 400, text: async () => 'Bad request: missing field',
    });
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const result = await triggerAgentRun(PROFILE_ID);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/HTTP 400/);
    expect(result.error).toMatch(/Bad request/);
  });

  test('on fetch throw returns ok:false with thrown message', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('Network unreachable'));
    (global as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    const result = await triggerAgentRun(PROFILE_ID);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Network unreachable');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npx jest __tests__/triggerAgentRun.test.ts`
Expected: FAIL — module `'../utils/triggerAgentRun'` not found.

- [ ] **Step 3: Implement the util**

Create `KycFullTakeover/utils/triggerAgentRun.ts`:

```ts
// POST a new syg_agentrunlog row referencing the given KYC profile.
// A backend plugin/workflow on row create picks it up and starts the agent.
// PCF doesn't set syg_agentrunstatus — the backend assigns "Queued".
//
// Same shape as associateRecords / createChildren in dataverse.ts: returns
// a structured { ok, error? } so the caller can render banners without
// catching exceptions.

import { isValidGuid } from './guidValidation';

export interface TriggerResult {
  ok:     boolean;
  error?: string;
}

export async function triggerAgentRun(kycProfileId: string): Promise<TriggerResult> {
  if (!isValidGuid(kycProfileId)) {
    return { ok: false, error: `invalid GUID: ${kycProfileId}` };
  }
  const base = window.location.origin;
  try {
    const resp = await fetch(`${base}/api/data/v9.2/syg_agentrunlogs`, {
      method:      'POST',
      credentials: 'include',
      headers: {
        'Content-Type':     'application/json',
        'OData-Version':    '4.0',
        'OData-MaxVersion': '4.0',
        'Accept':           'application/json',
      },
      body: JSON.stringify({
        'syg_KycProfileId@odata.bind': `/syg_kycprofiles(${kycProfileId})`,
      }),
    });

    if (resp.ok) return { ok: true };

    let body = '';
    try { body = await resp.text(); } catch { /* ignore */ }
    return { ok: false, error: `HTTP ${resp.status}: ${body.slice(0, 240)}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd KycFullTakeover && npx jest __tests__/triggerAgentRun.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/triggerAgentRun.ts \
        KycFullTakeover/__tests__/triggerAgentRun.test.ts
git commit -m "feat: add triggerAgentRun utility — POST syg_agentrunlog"
```

---

### Task 4: `pollAgentRunStatus` utility (TDD)

**Files:**
- Create: `KycFullTakeover/utils/pollAgentRunStatus.ts`
- Create: `KycFullTakeover/__tests__/pollAgentRunStatus.test.ts`

A controllable poll loop that queries the latest log row for a profile and emits status callbacks. Uses `webAPI.retrieveMultipleRecords` (no fetch, so no `AbortController` needed — the cancel handle just sets a stopped flag and clears the next timeout). Adaptive interval per the constants.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/pollAgentRunStatus.test.ts
import { pollAgentRunStatus, type PollHandle, type PollEvents } from '../utils/pollAgentRunStatus';
import {
  POLL_FAST_INTERVAL_MS, POLL_SLOW_INTERVAL_MS, POLL_FAST_DURATION_MS,
  POLL_HARD_TIMEOUT_MS, POLL_NO_ROWS_GRACE_MS, POLL_MAX_CONSECUTIVE_ERRORS,
  STATUS_SUCCESS, STATUS_FAILURE,
} from '../constants/agentRun';

const PROFILE_ID = 'a1b2c3d4-1234-1234-1234-1234567890ab';

function makeWebAPI(rows: Array<Array<{ syg_agentrunstatus: number }>> | Error[]) {
  let i = 0;
  return {
    retrieveMultipleRecords: jest.fn(async () => {
      const v = rows[Math.min(i, rows.length - 1)];
      i += 1;
      if (v instanceof Error) throw v;
      return { entities: v };
    }),
  } as unknown as ComponentFramework.WebApi;
}

function makeEvents(): PollEvents & { calls: { kind: string; arg?: unknown }[] } {
  const calls: { kind: string; arg?: unknown }[] = [];
  return {
    calls,
    onStatus:  (s) => calls.push({ kind: 'status',  arg: s }),
    onError:   (e) => calls.push({ kind: 'error',   arg: e }),
    onTimeout: () => calls.push({ kind: 'timeout' }),
  };
}

describe('pollAgentRunStatus', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(()  => { jest.useRealTimers(); });

  test('terminates on STATUS_SUCCESS and stops polling', async () => {
    const webAPI = makeWebAPI([[{ syg_agentrunstatus: STATUS_SUCCESS }]]);
    const ev = makeEvents();
    const handle: PollHandle = pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    await Promise.resolve();  // flush microtask
    expect(ev.calls).toContainEqual({ kind: 'status', arg: STATUS_SUCCESS });
    expect(webAPI.retrieveMultipleRecords).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  test('terminates on STATUS_FAILURE', async () => {
    const webAPI = makeWebAPI([[{ syg_agentrunstatus: STATUS_FAILURE }]]);
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    await Promise.resolve();
    expect(ev.calls).toContainEqual({ kind: 'status', arg: STATUS_FAILURE });
  });

  test('keeps polling on non-terminal status (1, 2)', async () => {
    const webAPI = makeWebAPI([
      [{ syg_agentrunstatus: 1 }],
      [{ syg_agentrunstatus: 2 }],
      [{ syg_agentrunstatus: STATUS_SUCCESS }],
    ]);
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS * 3);
    await Promise.resolve();
    expect(webAPI.retrieveMultipleRecords).toHaveBeenCalledTimes(3);
    const statuses = ev.calls.filter((c) => c.kind === 'status').map((c) => c.arg);
    expect(statuses).toEqual([1, 2, STATUS_SUCCESS]);
  });

  test('switches to slow interval after POLL_FAST_DURATION_MS', async () => {
    const nonTerminal = { syg_agentrunstatus: 1 };
    const webAPI = makeWebAPI(
      Array(20).fill([nonTerminal])
    );
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    // 12 fast polls × 5s = 60s
    await jest.advanceTimersByTimeAsync(POLL_FAST_DURATION_MS);
    await Promise.resolve();
    const fastCount = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length;
    // After fast window, advance one slow interval and expect exactly +1 call
    await jest.advanceTimersByTimeAsync(POLL_SLOW_INTERVAL_MS);
    await Promise.resolve();
    const slowCount = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length;
    expect(slowCount).toBe(fastCount + 1);
  });

  test('hard timeout fires onTimeout after POLL_HARD_TIMEOUT_MS', async () => {
    const webAPI = makeWebAPI(Array(200).fill([{ syg_agentrunstatus: 1 }]));
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_HARD_TIMEOUT_MS);
    await Promise.resolve();
    expect(ev.calls.some((c) => c.kind === 'timeout')).toBe(true);
  });

  test('after POLL_MAX_CONSECUTIVE_ERRORS errors emits onError("connection-lost")', async () => {
    const errs = Array(POLL_MAX_CONSECUTIVE_ERRORS + 1).fill(new Error('net'));
    const webAPI = makeWebAPI(errs);
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS * (POLL_MAX_CONSECUTIVE_ERRORS + 1));
    await Promise.resolve();
    expect(ev.calls).toContainEqual({ kind: 'error', arg: 'connection-lost' });
  });

  test('after POLL_NO_ROWS_GRACE_MS of empty results emits onError("no-rows")', async () => {
    const webAPI = makeWebAPI(Array(20).fill([]));
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_NO_ROWS_GRACE_MS + POLL_FAST_INTERVAL_MS);
    await Promise.resolve();
    expect(ev.calls).toContainEqual({ kind: 'error', arg: 'no-rows' });
  });

  test('cancel() stops further polling', async () => {
    const webAPI = makeWebAPI(Array(10).fill([{ syg_agentrunstatus: 1 }]));
    const handle = pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    await Promise.resolve();
    const beforeCancel = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length;
    handle.cancel();
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS * 5);
    await Promise.resolve();
    expect((webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length).toBe(beforeCancel);
  });

  test('builds the expected query string', async () => {
    const webAPI = makeWebAPI([[{ syg_agentrunstatus: STATUS_SUCCESS }]]);
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    await Promise.resolve();
    const [entity, query] = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls[0];
    expect(entity).toBe('syg_agentrunlog');
    expect(query).toContain(`_syg_kycprofileid_value eq ${PROFILE_ID}`);
    expect(query).toContain('$orderby=createdon desc');
    expect(query).toContain('$top=1');
    expect(query).toContain('$select=syg_agentrunstatus');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npx jest __tests__/pollAgentRunStatus.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the util**

Create `KycFullTakeover/utils/pollAgentRunStatus.ts`:

```ts
// Adaptive-interval poll loop for syg_agentrunlog status.
//
// Queries the newest log row for a given KYC profile every 5s for the first
// minute, then every 10s thereafter. Stops on terminal status (3, 4),
// hard timeout (15 min), exhausted retries on network errors, or when the
// new row hasn't appeared within a grace period.
//
// All side-effects are emitted via callbacks; the function returns a handle
// with a cancel() method. The caller (AgentTriggerButton) is responsible
// for translating events into UI state.

import {
  POLL_FAST_INTERVAL_MS, POLL_SLOW_INTERVAL_MS, POLL_FAST_DURATION_MS,
  POLL_HARD_TIMEOUT_MS, POLL_NO_ROWS_GRACE_MS, POLL_MAX_CONSECUTIVE_ERRORS,
  STATUS_SUCCESS, STATUS_FAILURE,
} from '../constants/agentRun';

export type PollErrorReason = 'connection-lost' | 'no-rows';

export interface PollEvents {
  /** Fired with the syg_agentrunstatus value of the newest row each tick. */
  onStatus:  (status: number) => void;
  /** Fired once when polling gives up due to an unrecoverable problem. */
  onError:   (reason: PollErrorReason) => void;
  /** Fired once when POLL_HARD_TIMEOUT_MS expires without terminal status. */
  onTimeout: () => void;
}

export interface PollOptions extends PollEvents {
  kycProfileId: string;
  webAPI:       ComponentFramework.WebApi;
}

export interface PollHandle {
  cancel(): void;
}

const TERMINAL: ReadonlySet<number> = new Set([STATUS_SUCCESS, STATUS_FAILURE]);

export function pollAgentRunStatus(opts: PollOptions): PollHandle {
  let stopped              = false;
  let consecutiveErrors    = 0;
  let firstSawNoRowsAt     = 0;
  let nextTimer: ReturnType<typeof setTimeout> | null = null;
  const startedAt          = Date.now();

  const stop = (): void => {
    stopped = true;
    if (nextTimer !== null) {
      clearTimeout(nextTimer);
      nextTimer = null;
    }
  };

  const intervalFor = (elapsed: number): number =>
    elapsed < POLL_FAST_DURATION_MS ? POLL_FAST_INTERVAL_MS : POLL_SLOW_INTERVAL_MS;

  const tick = async (): Promise<void> => {
    if (stopped) return;

    const elapsed = Date.now() - startedAt;
    if (elapsed >= POLL_HARD_TIMEOUT_MS) {
      opts.onTimeout();
      stop();
      return;
    }

    try {
      const query =
        `?$filter=_syg_kycprofileid_value eq ${opts.kycProfileId}` +
        `&$orderby=createdon desc` +
        `&$top=1` +
        `&$select=syg_agentrunstatus`;
      const result = await opts.webAPI.retrieveMultipleRecords('syg_agentrunlog', query);
      if (stopped) return;

      consecutiveErrors = 0;

      const rows = (result as { entities?: Array<{ syg_agentrunstatus?: number }> }).entities ?? [];
      if (rows.length === 0) {
        if (firstSawNoRowsAt === 0) firstSawNoRowsAt = Date.now();
        if (Date.now() - firstSawNoRowsAt >= POLL_NO_ROWS_GRACE_MS) {
          opts.onError('no-rows');
          stop();
          return;
        }
      } else {
        firstSawNoRowsAt = 0;
        const status = rows[0].syg_agentrunstatus;
        if (typeof status === 'number') {
          opts.onStatus(status);
          if (TERMINAL.has(status)) {
            stop();
            return;
          }
        }
      }
    } catch {
      consecutiveErrors += 1;
      if (consecutiveErrors >= POLL_MAX_CONSECUTIVE_ERRORS) {
        opts.onError('connection-lost');
        stop();
        return;
      }
    }

    if (stopped) return;
    nextTimer = setTimeout(tick, intervalFor(Date.now() - startedAt));
  };

  // First poll fires after the fast interval (matches existing test
  // expectations and gives the backend ~5s to insert the row).
  nextTimer = setTimeout(tick, POLL_FAST_INTERVAL_MS);

  return { cancel: stop };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd KycFullTakeover && npx jest __tests__/pollAgentRunStatus.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/pollAgentRunStatus.ts \
        KycFullTakeover/__tests__/pollAgentRunStatus.test.ts
git commit -m "feat: add pollAgentRunStatus utility — adaptive-interval log poll"
```

---

### Task 5: `AgentDrone` component (presentational)

**Files:**
- Create: `KycFullTakeover/components/AgentDrone.tsx`

Pure visual component. Renders nothing in `idle` mode. In `flying` mode, renders the drone, three documents, three scan beams, and the keyframe `<style>` block. Positions are absolute and assume the parent (HeaderStrip) is `position: relative` with `min-width: 1000px` enforced via `min-width: max-content` style.

- [ ] **Step 1: Create the component**

```tsx
// Presentational drone-bot animation for the Trigger Agent Run flow.
// Renders nothing when idle. When flying, renders an SVG drone that
// patrols three "documents" in the spacer area between the launch pad
// and the schema pill, dwelling over each one and emitting a scan beam.
//
// Position constants assume the HeaderStrip uses min-width:1000px so
// the spacer always has enough room. In a real D365 form bar (typically
// 1100-1400px wide), the docs sit between left:510 and left:712, well
// clear of the title (left:62-260) and launch pad (left:270-470).

import * as React from 'react';

interface AgentDroneProps {
  /** 'flying' renders drone+docs+beams; 'idle' renders null. */
  mode: 'idle' | 'flying';
}

const KEYFRAMES = `
@keyframes kft-flight-docs {
  0%       { transform: translate(0px,    -2px); }
  6%, 14%  { transform: translate(0px,    -2px); }
  20%      { transform: translate(45px,   -8px); }
  26%, 40% { transform: translate(90px,   -2px); }
  46%      { transform: translate(135px,  -8px); }
  52%, 66% { transform: translate(180px,  -2px); }
  72%      { transform: translate(135px,  -8px); }
  80%      { transform: translate(90px,   -2px); }
  88%      { transform: translate(45px,   -8px); }
  100%     { transform: translate(0px,    -2px); }
}
@keyframes kft-drone-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes kft-prop        { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes kft-ant-glow    { 0%,100% { fill:#FFC477; opacity:0.6; } 50% { fill:#fff; opacity:1; } }
@keyframes kft-doc-1 { 0%,4%,16%,100% { filter:brightness(1); } 7%,13% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-doc-2 { 0%,24%,42%,100% { filter:brightness(1); } 27%,39% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-doc-3 { 0%,50%,68%,100% { filter:brightness(1); } 53%,65% { filter:brightness(1.4) drop-shadow(0 0 6px #FFC477); } }
@keyframes kft-beam-1 { 0%,4%,16%,100% { opacity:0; } 8%,12% { opacity:0.85; } }
@keyframes kft-beam-2 { 0%,24%,42%,100% { opacity:0; } 28%,38% { opacity:0.85; } }
@keyframes kft-beam-3 { 0%,50%,68%,100% { opacity:0; } 54%,64% { opacity:0.85; } }
@media (prefers-reduced-motion: reduce) {
  .kft-drone-flight,
  .kft-drone-hover,
  .kft-drone-prop  { animation: none !important; }
  .kft-doc, .kft-beam { animation: none !important; opacity: 1 !important; }
}
`;

const Document: React.FC<{ leftPx: number; lineWidths: [number, number, number, number]; highlightAnim: string }> =
  ({ leftPx, lineWidths, highlightAnim }) => (
    <div
      className="kft-doc"
      style={{
        position: 'absolute', left: `${leftPx}px`, top: '19px', zIndex: 1,
        animation: `${highlightAnim} 10s linear infinite`,
      }}
      aria-hidden="true"
    >
      <svg width="22" height="26" viewBox="0 0 22 26">
        <path d="M2 2 H14 L20 8 V24 H2 Z" fill="#fff" stroke="rgba(122,22,49,0.3)" strokeWidth="0.5"/>
        <path d="M14 2 V8 H20" fill="none" stroke="#7a1631" strokeWidth="0.5"/>
        <rect x="5" y="11" width={lineWidths[0]} height="1" fill="#7a1631"/>
        <rect x="5" y="14" width={lineWidths[1]} height="1" fill="#7a1631"/>
        <rect x="5" y="17" width={lineWidths[2]} height="1" fill="#7a1631"/>
        <rect x="5" y="20" width={lineWidths[3]} height="1" fill="#7a1631"/>
      </svg>
    </div>
  );

const Beam: React.FC<{ leftPx: number; gradId: string; beamAnim: string }> =
  ({ leftPx, gradId, beamAnim }) => (
    <svg
      className="kft-beam"
      style={{
        position: 'absolute', left: `${leftPx}px`, top: '1px', opacity: 0,
        animation: `${beamAnim} 10s linear infinite`,
        pointerEvents: 'none', zIndex: 2,
      }}
      width="14" height="22" viewBox="0 0 14 22"
      aria-hidden="true"
    >
      <path d="M7 22 L0 0 L14 0 Z" fill={`url(#${gradId})`}/>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="#FFC477" stopOpacity="0"/>
          <stop offset="100%" stopColor="#FFC477" stopOpacity="0.95"/>
        </linearGradient>
      </defs>
    </svg>
  );

export const AgentDrone: React.FC<AgentDroneProps> = ({ mode }) => {
  if (mode === 'idle') return null;
  return (
    <>
      <style>{KEYFRAMES}</style>

      <Document leftPx={510} lineWidths={[11, 11, 8,  11]} highlightAnim="kft-doc-1" />
      <Document leftPx={600} lineWidths={[11, 9,  11, 6 ]} highlightAnim="kft-doc-2" />
      <Document leftPx={690} lineWidths={[9,  11, 11, 9 ]} highlightAnim="kft-doc-3" />

      <Beam leftPx={514} gradId="kftBeam1" beamAnim="kft-beam-1" />
      <Beam leftPx={604} gradId="kftBeam2" beamAnim="kft-beam-2" />
      <Beam leftPx={694} gradId="kftBeam3" beamAnim="kft-beam-3" />

      <div
        className="kft-drone-flight"
        style={{
          position: 'absolute', left: '505px', top: '0px', zIndex: 3,
          animation: 'kft-flight-docs 10s cubic-bezier(0.45,0,0.55,1) infinite',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <div
          className="kft-drone-hover"
          style={{ animation: 'kft-drone-hover 1.2s ease-in-out infinite' }}
        >
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <line x1="16" y1="0" x2="16" y2="4" stroke="#fff" strokeWidth="1.2"/>
            <circle cx="16" cy="0.8" r="1.4" style={{ animation: 'kft-ant-glow 0.9s ease-in-out infinite' }}/>
            <line x1="6"  y1="11" x2="2"  y2="11" stroke="#fff" strokeWidth="1.2"/>
            <line x1="26" y1="11" x2="30" y2="11" stroke="#fff" strokeWidth="1.2"/>
            <ellipse className="kft-drone-prop" cx="2"  cy="11" rx="3" ry="0.8" fill="#fff" opacity="0.7"
              style={{ transformOrigin: '2px 11px',  animation: 'kft-prop 0.15s linear infinite' }}/>
            <ellipse className="kft-drone-prop" cx="30" cy="11" rx="3" ry="0.8" fill="#fff" opacity="0.7"
              style={{ transformOrigin: '30px 11px', animation: 'kft-prop 0.15s linear infinite reverse' }}/>
            <rect x="9"  y="6" width="14" height="10" rx="2.5" fill="#fff"/>
            <rect x="11" y="9" width="10" height="4"  rx="1"   fill="#7a1631"/>
            <circle cx="13.5" cy="11" r="0.9" fill="#FFC477"/>
            <circle cx="18.5" cy="11" r="0.9" fill="#FFC477"/>
          </svg>
        </div>
      </div>
    </>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/AgentDrone.tsx
git commit -m "feat: add AgentDrone presentational component (drone + docs + beams)"
```

---

### Task 6: `AgentTriggerButton` component (state machine)

**Files:**
- Create: `KycFullTakeover/components/AgentTriggerButton.tsx`

Owns the trigger lifecycle. Internal state: `idle | triggering | running | success | error`. On mount runs an init poll once (covers reload-during-run). On click runs `triggerAgentRun` then starts `pollAgentRunStatus`. Renders the button (idle / launch-pad / success-flash / error variants) and a banner div below.

- [ ] **Step 1: Create the component**

```tsx
// Trigger Agent Run button + lifecycle.
//
// State machine:
//   idle        — show CTA, allow click
//   triggering  — POST in flight (sub-second)
//   running     — POST done, polling status; launch-pad mode
//   success     — green flash for 3s, then back to idle
//   error       — red border + banner, click to retry
//   timeout     — orange warning banner, click to retry
//   conn-lost   — red connection banner, click to retry
//
// On mount: one init poll to detect a run already in progress (e.g. user
// reloaded the form mid-run). If the latest row is non-terminal, jump
// straight to `running` and continue polling.

import * as React from 'react';
import { agentBar, typography } from '../styles/tokens';
import { triggerAgentRun } from '../utils/triggerAgentRun';
import { pollAgentRunStatus, type PollHandle, type PollErrorReason } from '../utils/pollAgentRunStatus';
import { STATUS_SUCCESS, STATUS_FAILURE, SUCCESS_FLASH_DURATION_MS } from '../constants/agentRun';
import { AgentDrone } from './AgentDrone';

interface AgentTriggerButtonProps {
  kycProfileId: string;
  webAPI:       ComponentFramework.WebApi;
}

type ButtonState =
  | { kind: 'idle' }
  | { kind: 'triggering' }
  | { kind: 'running' }
  | { kind: 'success' }
  | { kind: 'error';     message: string }
  | { kind: 'timeout' }
  | { kind: 'conn-lost' };

const SUN_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

export const AgentTriggerButton: React.FC<AgentTriggerButtonProps> = ({ kycProfileId, webAPI }) => {
  const [state, setState] = React.useState<ButtonState>({ kind: 'idle' });
  const pollRef = React.useRef<PollHandle | null>(null);

  // Cancel any active poll on unmount.
  React.useEffect(() => {
    return () => { pollRef.current?.cancel(); };
  }, []);

  // Init poll: detect a run already in progress at mount.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const query =
          `?$filter=_syg_kycprofileid_value eq ${kycProfileId}` +
          `&$orderby=createdon desc&$top=1&$select=syg_agentrunstatus`;
        const result = await webAPI.retrieveMultipleRecords('syg_agentrunlog', query);
        if (cancelled) return;
        const rows = (result as { entities?: Array<{ syg_agentrunstatus?: number }> }).entities ?? [];
        const latest = rows[0]?.syg_agentrunstatus;
        if (typeof latest === 'number' && latest !== STATUS_SUCCESS && latest !== STATUS_FAILURE) {
          startPoll();
          setState({ kind: 'running' });
        }
      } catch {
        // Init query failure is silent — RM can still trigger manually.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kycProfileId]);

  const startPoll = (): void => {
    pollRef.current?.cancel();
    pollRef.current = pollAgentRunStatus({
      kycProfileId, webAPI,
      onStatus: (status) => {
        if (status === STATUS_SUCCESS) {
          setState({ kind: 'success' });
          softRefreshForm();
          window.setTimeout(() => setState({ kind: 'idle' }), SUCCESS_FLASH_DURATION_MS);
        } else if (status === STATUS_FAILURE) {
          setState({ kind: 'error', message: 'Agent run failed.' });
        }
      },
      onError: (reason: PollErrorReason) => {
        if (reason === 'connection-lost') setState({ kind: 'conn-lost' });
        else setState({ kind: 'error', message: 'Could not find agent run log row. Refresh and try again.' });
      },
      onTimeout: () => setState({ kind: 'timeout' }),
    });
  };

  const handleClick = async (): Promise<void> => {
    if (state.kind === 'triggering' || state.kind === 'running') return;
    setState({ kind: 'triggering' });
    const result = await triggerAgentRun(kycProfileId);
    if (!result.ok) {
      setState({ kind: 'error', message: `Could not queue agent run: ${result.error ?? 'unknown error'}` });
      return;
    }
    setState({ kind: 'running' });
    startPoll();
  };

  const dismissBanner = (): void => setState({ kind: 'idle' });

  const isFlying = state.kind === 'running' || state.kind === 'triggering';

  return (
    <>
      {renderButton(state, handleClick)}
      <AgentDrone mode={isFlying ? 'flying' : 'idle'} />
      {renderBanner(state, dismissBanner)}
    </>
  );
};

function renderButton(state: ButtonState, onClick: () => void): React.ReactElement {
  const baseStyle: React.CSSProperties = {
    height: '32px',
    minWidth: '200px',
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: agentBar.fontFamily,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 14px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)',
    position: 'relative',
    zIndex: 1,
    transition: 'background 200ms, border 200ms',
  };

  if (state.kind === 'running' || state.kind === 'triggering') {
    return (
      <button
        type="button"
        disabled
        aria-label="Agent run in progress"
        title="Agent run in progress. The form will refresh when complete."
        style={{
          ...baseStyle,
          background: agentBar.padBgRunning,
          border: `1px dashed ${agentBar.padBorderRunning}`,
          cursor: 'default',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 12,
        }}
      >
        <span aria-hidden="true" style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
        }}/>
        <span>launch pad · agent reading</span>
      </button>
    );
  }

  if (state.kind === 'success') {
    return (
      <button
        type="button"
        disabled
        aria-label="Agent run completed"
        style={{
          ...baseStyle,
          background: agentBar.padBgSuccess,
          border: `1px solid ${agentBar.padBorderIdle}`,
          cursor: 'default',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>Run complete</span>
      </button>
    );
  }

  const isError = state.kind === 'error' || state.kind === 'timeout' || state.kind === 'conn-lost';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Trigger KYC agent run"
      style={{
        ...baseStyle,
        background: agentBar.padBgIdle,
        border: `1px solid ${isError ? agentBar.padBorderError : agentBar.padBorderIdle}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = agentBar.padBgIdleHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = agentBar.padBgIdle; }}
    >
      {SUN_ICON}
      <span>Trigger agent run</span>
    </button>
  );
}

function renderBanner(state: ButtonState, onDismiss: () => void): React.ReactElement | null {
  let bg     = agentBar.errorBg;
  let fg     = agentBar.errorFg;
  let border = agentBar.errorBorder;
  let text   = '';
  if (state.kind === 'error')      text = state.message;
  else if (state.kind === 'timeout') {
    bg = agentBar.warningBg; fg = agentBar.warningFg; border = agentBar.warningBorder;
    text = 'Run is taking longer than expected. Refresh the form to check for results.';
  }
  else if (state.kind === 'conn-lost') text = 'Lost connection to run log. Refresh the form to retry.';
  else return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 0, right: 0, top: '100%',
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: 3,
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: agentBar.fontFamily,
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 14 }}>⚠</span>
      <span style={{ flex: 1 }}>{text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: fg, fontSize: 16, padding: '0 4px', lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

function softRefreshForm(): void {
  const xrm = (window as unknown as {
    Xrm?: { Page?: { data?: { refresh?: (save: boolean) => Promise<unknown> } } };
  }).Xrm;
  const refresh = xrm?.Page?.data?.refresh;
  if (typeof refresh !== 'function') return;
  try {
    const result = refresh(false);
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      (result as Promise<unknown>).catch(() => { /* swallow */ });
    }
  } catch {
    /* swallow */
  }
  // Suppress unused-import lint
  void typography;
}
```

> **Note:** the `void typography` line at the bottom is a hack to keep the import without using it (the token group exists for future text-style additions). Remove and import only what's used after Task 7 if it bothers a linter.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/AgentTriggerButton.tsx
git commit -m "feat: add AgentTriggerButton with full state machine + drone integration"
```

---

### Task 7: Rewrite `HeaderStrip` to coral Aurora + integrate

**Files:**
- Modify: `KycFullTakeover/components/HeaderStrip.tsx`

The header strip becomes the new Aurora bar. It renders the title, the trigger button (which itself owns the drone overlay), the schema pill, and the last-run meta.

- [ ] **Step 1: Replace the file contents**

Overwrite `KycFullTakeover/components/HeaderStrip.tsx` with:

```tsx
// Top bar — coral-forward Aurora command surface.
// Hosts the pulse dot, title, Trigger Agent Run slot, schema pill, last-run meta.
// AgentTriggerButton is responsible for its own state machine + drone overlay.

import * as React from 'react';
import { agentBar } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';
import { AgentTriggerButton } from './AgentTriggerButton';

interface HeaderStripProps {
  profileName?:    string;
  schemaVersion?:  string;
  lastRunAt?:      string;
  kycProfileId:    string;
  webAPI:          ComponentFramework.WebApi;
}

const KEYFRAMES = `
@keyframes kft-aurora1 { 0%,100% { transform: translate(-10%,-30%) scale(1);   } 50% { transform: translate(20%,10%)  scale(1.3); } }
@keyframes kft-aurora2 { 0%,100% { transform: translate(60%,20%)  scale(1.1); } 50% { transform: translate(30%,-10%) scale(0.9); } }
@keyframes kft-aurora3 { 0%,100% { transform: translate(80%,-20%) scale(0.9); } 50% { transform: translate(50%,40%)  scale(1.2); } }
@keyframes kft-pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } }
@media (prefers-reduced-motion: reduce) {
  .kft-aurora-blob, .kft-pulse-dot { animation: none !important; }
}
`;

export const HeaderStrip: React.FC<HeaderStripProps> = ({
  schemaVersion, lastRunAt, kycProfileId, webAPI,
}) => (
  <div
    style={{
      position:     'relative',
      overflow:     'hidden',
      padding:      '18px 24px',
      display:      'flex',
      alignItems:   'center',
      gap:          18,
      background:   agentBar.bgGradient,
      borderBottom: `1px solid ${agentBar.borderBottom}`,
      color:        '#fff',
      fontFamily:   agentBar.fontFamily,
      minHeight:    64,
      minWidth:     1000,
    }}
  >
    <style>{KEYFRAMES}</style>

    {/* Aurora blob layer */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      <div className="kft-aurora-blob" style={blobStyle(300, agentBar.blobCoral, 0.55, 'kft-aurora1', '12s', '5%')}  />
      <div className="kft-aurora-blob" style={blobStyle(260, agentBar.blobPink,  0.40, 'kft-aurora2', '14s', '35%')} />
      <div className="kft-aurora-blob" style={blobStyle(240, agentBar.blobAmber, 0.30, 'kft-aurora3', '16s', undefined, '0%')} />
    </div>

    {/* Pulse dot */}
    <span
      className="kft-pulse-dot"
      style={{
        width: 10, height: 10, borderRadius: '50%', background: '#fff',
        position: 'relative', zIndex: 1,
        animation: 'kft-pulse-dot 2s infinite',
      }}
      aria-hidden="true"
    />

    {/* Title */}
    <h2 style={{
      margin: 0, fontSize: 18, fontWeight: 600,
      letterSpacing: '-0.005em', position: 'relative', zIndex: 1,
    }}>
      KYC Agent Output
    </h2>

    {/* Trigger button slot (owns the drone) */}
    <AgentTriggerButton kycProfileId={kycProfileId} webAPI={webAPI} />

    <span style={{ flex: 1, minWidth: 260 }} />

    {schemaVersion && (
      <span
        aria-hidden="true"
        style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.30)',
          fontWeight: 500, position: 'relative', zIndex: 1,
        }}
      >schema {schemaVersion}</span>
    )}

    {lastRunAt && (
      <span style={{ fontSize: 12, opacity: 0.92, position: 'relative', zIndex: 1 }}>
        last run · {formatSwissDate(lastRunAt)}
      </span>
    )}
  </div>
);

function blobStyle(
  size: number, color: string, opacity: number,
  anim: string, duration: string,
  left?: string, right?: string,
): React.CSSProperties {
  return {
    position: 'absolute',
    width: size, height: size,
    borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
    opacity,
    filter: 'blur(50px)',
    animation: `${anim} ${duration} ease-in-out infinite`,
    top: '-30%',
    ...(left  !== undefined ? { left }  : {}),
    ...(right !== undefined ? { right } : {}),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/HeaderStrip.tsx
git commit -m "feat: rewrite HeaderStrip to coral Aurora + integrate trigger button"
```

---

### Task 8: Wire `kycProfileId` + `webAPI` through to HeaderStrip

**Files:**
- Modify: `KycFullTakeover/components/KycFullTakeover.tsx`

- [ ] **Step 1: Update the HeaderStrip usage**

In `KycFullTakeover/components/KycFullTakeover.tsx`, find the existing `<HeaderStrip ... />` (around line 522) and add the new props:

```tsx
<HeaderStrip
  profileName={kycProfileName}
  schemaVersion={payload.schemaVersion}
  lastRunAt={mostRecentLastRun(statusBlob)}
  kycProfileId={kycProfileId}
  webAPI={webAPI}
/>
```

The component already receives `kycProfileId` and `webAPI` as props (verify in the existing component signature at the top of the file — they're in `KycFullTakeoverProps`).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/KycFullTakeover.tsx
git commit -m "feat: pass kycProfileId + webAPI through to HeaderStrip"
```

---

### Task 9: Run the full test suite

**Files:** none modified.

- [ ] **Step 1: Run all jest tests**

Run: `cd KycFullTakeover && npm test`
Expected: all suites green, including the 14 new tests in this plan plus the existing 72.

- [ ] **Step 2: Run TypeScript compile check**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: If any failure, debug and fix; do not proceed until green.**

---

### Task 10: Production build + manual smoke test

**Files:**
- Modify: `Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js` (rebuilt)
- Modify: `Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml` (rebuilt)

- [ ] **Step 1: Build the production bundle**

Run: `cd KycFullTakeover && npm run rebuild`
Expected: webpack output shows `bundle.js` size, no errors.

- [ ] **Step 2: Copy artefacts to the kft-pack solution**

```bash
cp KycFullTakeover/out/controls/Syg.KycFullTakeover/bundle.js \
   Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js
cp KycFullTakeover/out/controls/Syg.KycFullTakeover/ControlManifest.xml \
   Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml
```

(Adjust paths if the project layout differs.)

- [ ] **Step 3: Pack the solution into a zip**

```bash
cd Solution/kft-pack
zip -r ../bin/Release/SygnumKycFullTakeover_0.5.0.zip ./*
cd -
```

Expected: a new zip in `Solution/bin/Release/`.

- [ ] **Step 4: Manual smoke test in dev environment**

Import `SygnumKycFullTakeover_0.5.0.zip` to dev. Open a KYC profile form. Verify:

1. Header bar renders coral Aurora gradient with three slow-oscillating blobs.
2. Title is "KYC Agent Output" sentence-case.
3. Pulse dot is white and pulsing (or static under reduced-motion).
4. Trigger button shows the sun icon + "Trigger agent run".
5. Click the button. Drone takes off, button becomes a dashed launch pad with "launch pad · agent reading".
6. Drone visits 3 documents in sequence, scan beams pulse over each.
7. Wait for run to complete. Drone lands, button flashes green "Run complete" for 3s, form soft-reloads with new payload, button reverts to idle.
8. Trigger again with a known-bad profile (or simulate by killing the backend). Verify red banner appears under the bar with "Could not queue agent run: ..." and dismissable.
9. Reload the form mid-run. Drone resumes flying after the init poll.
10. Toggle OS reduced-motion setting. Reload. Verify no animations run.

- [ ] **Step 5: Commit the rebuilt artefacts + zip**

```bash
git add Solution/kft-pack/Controls/Syg.KycFullTakeover/bundle.js \
        Solution/kft-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml \
        Solution/bin/Release/SygnumKycFullTakeover_0.5.0.zip
git commit -m "build: SygnumKycFullTakeover 0.5.0 — Trigger Agent Run with drone"
```

---

### Task 11: Tag the release

**Files:** none modified.

- [ ] **Step 1: Tag**

```bash
git tag -a kft-0.5.0 -m "KycFullTakeover 0.5.0 — Trigger Agent Run + animated drone reader"
```

- [ ] **Step 2: (Optional) Push tag**

```bash
git push origin kft-0.5.0
```

---

## Self-review notes

- **Spec coverage:** every section of the spec maps to a task — Aurora visual (Task 7), drone+docs+beams (Task 5), launch-pad mode (Task 6), polling state machine (Tasks 4 + 6), error/timeout/conn-lost banners (Task 6), reduced-motion fallback (Tasks 5 + 7), accessibility attrs (Tasks 5/6/7), version bumps + packaging (Tasks 1 + 10), tests (Tasks 3, 4, 9).
- **No placeholders:** every step shows the exact code and command. Commits are concrete strings.
- **Type consistency:** `PollHandle`, `PollEvents`, `PollErrorReason`, `TriggerResult` defined in Task 3/4 are imported by name in Task 6. Constants from `agentRun.ts` (Task 2) are imported throughout. `AgentDrone` mode prop (`'idle' | 'flying'`) matches the call site in `AgentTriggerButton`.
- **Test environment:** `testEnvironment: node` blocks JSDOM-style component tests; the plan only puts pure-logic tests in jest. `AgentTriggerButton` and `AgentDrone` are verified manually in Task 10.
