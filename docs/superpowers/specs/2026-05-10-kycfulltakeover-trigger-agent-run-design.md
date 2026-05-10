# Trigger Agent Run — Design

**Status:** approved
**Date:** 2026-05-10 (updated)
**Component:** `Syg.KycFullTakeover` (PCF)
**Target version:** 0.5.0

## Goal

Give RMs a way to trigger a fresh KYC agent run from inside the KycFullTakeover control. Clicking the button creates a `syg_agentrunlog` row referencing the current KYC profile. The PCF then polls the row's status and shows an animated drone + documents in the header bar while the agent is working. When the run completes the drone lands and the form soft-reloads to surface the new payload. When the run fails an error banner is shown.

## Non-goals

- No status-code configuration via control properties. Terminal codes (3, 4) are constants in the PCF.
- No new bound output fields. Trigger writes directly via WebAPI; status reads directly via WebAPI.
- No retry button on failure (RM clicks Trigger again).
- No display of historical runs (the log is a separate entity; this control only cares about the active/latest one).

## UX

### Header strip — visual

The existing brand-blue `HeaderStrip` is replaced with a coral-forward "Aurora" command bar (variant **v2b**):

- **Background:** `linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)`
- **Aurora blobs:** three radial-gradient circles oscillating slowly (transform translate + scale, 12/14/16s loops):
  - Blob 1: `#F04E68` 300px opacity 0.55
  - Blob 2: `#FFB1C0` 260px opacity 0.40
  - Blob 3: `#FFC477` 240px opacity 0.30
- **Bottom border:** 1px `rgba(255,255,255,0.16)`
- **Padding:** 18px / 24px, min-height 64px
- **Pulse dot:** 10px white circle, 2s pulse animation
- **Title:** "KYC Agent Output" — sentence case, 18px, weight 600, white, normal letter-spacing
- **Schema pill:** `rgba(255,255,255,0.18)` bg, white border 0.30, radius 999px, 11px text "schema 1.0.0"
- **Last-run meta:** 12px, white opacity 0.92, "last run · 09.05.2026 14:32" (Swiss date format from existing `formatSwissDate`)
- **Font stack:** `'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif`

### Button states

The button slot has two visual modes: **idle button** and **launch pad** (when drone is flying).

#### Idle button

- bg `rgba(255,255,255,0.18)`, border `1px solid rgba(255,255,255,0.40)`, radius 8px, height 32px, min-width 200px
- padding 6px / 14px, 13px / weight 600, white text
- leading icon: 14×14 SVG (Lucide `sun`), label: "Trigger agent run"
- shadow: `0 4px 14px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)`
- backdrop-filter: `blur(10px)`
- hover: bg `rgba(255,255,255,0.26)`, transition 200ms
- focus-visible: 2px outline `#FFFFFF` offset 2px

#### Launch pad (run in progress)

- bg `rgba(255,255,255,0.10)`, border `1px dashed rgba(255,255,255,0.40)`, radius 8px, same dimensions
- left "runway" indicator (36×4 px gradient stripe)
- text: "launch pad · agent reading"
- click is disabled (button has `disabled` attribute and `cursor:default`)
- hint tooltip on hover: "Agent run in progress. The form will refresh when complete."

### Drone + documents (in-flight visualisation)

When the run is in progress, an animated drone-bot flies in the spacer area between the launch pad and the schema pill, examining three floating documents. **The drone and documents stay strictly inside this zone — never overlapping the title or the launch pad.**

#### Drone

SVG, 32×24 px, white fill with coral details:
- Antenna line + amber tip (pulses opacity 0.6→1, 0.9s)
- Two side rotors (white ellipses, spinning at 0.15s, opposite directions)
- Rounded body (white) with coral display window and two amber "eyes"
- Hover-bob: ±2 px y oscillation, 1.2s

#### Documents

Three SVGs, 22×26 px each, positioned absolutely inside the bar:
- White background, dog-eared corner, coral horizontal "text lines"
- Positions in a 1000px-wide bar: `left: 510px / 600px / 690px`
- Each has its own `doc-highlight-N` keyframe that pulses brightness + amber drop-shadow during the drone's dwell window over that doc
- Decorative — `aria-hidden="true"`

#### Drone flight path

Pure CSS keyframes (`flight-docs`, 10s loop, `cubic-bezier(0.45, 0, 0.55, 1)` easing):

```
0%       translate(0px,    -2px)   over doc 1
6-14%    translate(0px,    -2px)   DWELL (scan beam 1 fades in 8-12%)
20%      translate(45px,   -8px)   transit
26-40%   translate(90px,   -2px)   over doc 2 + DWELL (beam 2 fades 28-38%)
46%      translate(135px,  -8px)   transit
52-66%   translate(180px,  -2px)   over doc 3 + DWELL (beam 3 fades 54-64%)
72-100%  return path back to doc 1
```

Drone wrapper position: `left: 505px; top: 0px; z-index: 3` (centred over doc 1's start position so `translateX(0)` puts it directly above doc 1).

#### Scan beams

Three downward-pointing 14×22 px SVG cones positioned at `left: 514/604/694, top: 1px`. Each beam's opacity is keyed to its drone's dwell window (animations `beam-1`, `beam-2`, `beam-3`, all 10s loops).

### Error banner

When a POST fails or polling detects status=4, render a banner directly under the header strip:
- bg `#fdecea`, color `#7a1f17`, border `1px solid #f5c2bd`, radius 3px
- padding 8px / 12px, 12px text, Inter/Segoe UI
- icon: ⚠ leading
- text on POST failure: `Could not queue agent run: <message>`
- text on poll status=4: `Agent run failed.` (no per-row error field exists)
- text on poll timeout: `Run is taking longer than expected. Refresh the form to check for results.`
- text on connection-loss (5 consecutive poll errors): `Lost connection to run log. Refresh the form to retry.`
- Dismiss × button on the right; clicking the trigger button again also clears it
- `role="alert"`, `aria-live="polite"`

### Reduced motion (`prefers-reduced-motion: reduce`)

- Aurora blobs hold still (no transform animation, opacity preserved)
- Pulse dot does not pulse (static dot)
- Drone holds at the launch pad (no flight, no hover-bob)
- Propellers do not spin
- Scan beams hold at their visible state but do not animate fading
- Documents do not pulse-highlight
- Button state colour transitions remain (UX feedback necessary)

## Data flow

### Trigger

```
Click "Trigger agent run"
  → button enters launch-pad mode + drone takes off
  → POST /api/data/v9.2/syg_agentrunlogs
       Body: { "syg_KycProfileId@odata.bind": "/syg_kycprofiles(<id>)" }
  → on 2xx (201 Created):
       → start polling (see below)
  → on non-2xx or fetch error:
       → button reverts to idle (red border)
       → render error banner with message
       → drone lands immediately
```

### Polling

After successful trigger AND on every component mount, poll for the latest log row for this profile:

```
GET /api/data/v9.2/syg_agentrunlogs
    ?$filter=_syg_kycprofileid_value eq <profileId>
    &$orderby=createdon desc
    &$top=1
    &$select=syg_agentrunstatus,syg_agentrunlogid,createdon
```

**Schedule:**
- 5s after start, then every 5s for the first 60s
- After 60s, every 10s
- Hard timeout at 15 min (900 s) → drone lands, show timeout banner

**State machine:**

| Newest row's `syg_agentrunstatus` | Action |
|---|---|
| `3` (success) | stop polling. Drone lands. Show green flash on button "Run complete" for 3s. Call `Xrm.Page.data.refresh(false)` to soft-reload form so new `syg_aianalyticsaudit` payload renders. Revert to idle. |
| `4` (failure) | stop polling. Drone lands. Show red error banner "Agent run failed.". Button reverts to idle. |
| any other value (1, 2, …) | continue polling. Drone keeps flying. |
| query returns 0 rows | continue polling (likely the POST hasn't propagated yet). Bail out after 30s if still 0 rows — show banner "Could not find agent run log row. Refresh and try again." |
| network error | retry on next interval; after 5 consecutive errors, land drone and show "Lost connection" banner |

### On component mount (init)

Run the polling query once. If the newest row's `syg_agentrunstatus` is not in `{3, 4}` and is not stale (createdon within last 15 min), assume a run is in progress: enter launch-pad mode and start polling. This handles "user reloaded form during run" and "user navigated away and back".

If the newest row is terminal or there are no rows, stay in idle.

### On unmount

Cancel any pending poll timeout and abort any in-flight fetch.

## Files

### New

- `KycFullTakeover/components/AgentTriggerButton.tsx` — button + launch-pad states. Owns the trigger-and-poll lifecycle. Accepts `(kycProfileId, webAPI)` props. Internally manages `RunState` (`idle | triggering | running | success | error`). Uses `triggerAgentRun` and `pollAgentRunStatus` utilities. Renders the error/timeout/connection-lost banner.
- `KycFullTakeover/components/AgentDrone.tsx` — pure-presentational drone + documents + beams + keyframes. Takes a single `mode: 'idle' | 'flying'` prop. When idle, renders nothing. When flying, renders the drone, three docs, and three beams positioned at the documented offsets. All keyframes are inlined as a `<style>` block on first render (only when flying).
- `KycFullTakeover/utils/triggerAgentRun.ts` — pure function `triggerAgentRun(kycProfileId): Promise<{ ok: boolean; error?: string }>`. Wraps `fetch` to POST `syg_agentrunlogs`. Validates GUID via `isValidGuid`. Same patterns as `associateRecords` / `createChildren` in `utils/dataverse.ts`.
- `KycFullTakeover/utils/pollAgentRunStatus.ts` — pure function `pollAgentRunStatus({ kycProfileId, webAPI, onStatus, onError, onTimeout, signal })`. Exposes a controllable poll loop with the schedule above. Returns a `{ cancel(): void }` handle. Uses `AbortController` for in-flight fetch cancellation.
- `KycFullTakeover/constants/agentRun.ts` — exported constants: `STATUS_SUCCESS = 3`, `STATUS_FAILURE = 4`, `POLL_FAST_INTERVAL_MS = 5000`, `POLL_SLOW_INTERVAL_MS = 10000`, `POLL_FAST_DURATION_MS = 60000`, `POLL_HARD_TIMEOUT_MS = 900000`, `POLL_NO_ROWS_GRACE_MS = 30000`, `POLL_MAX_CONSECUTIVE_ERRORS = 5`.

### Modified

- `KycFullTakeover/components/HeaderStrip.tsx` — full visual rewrite to v2b Aurora. Adds aurora blob keyframes (`aurora1`, `aurora2`, `aurora3`) and `pulseCoral`. Renders the new pulse dot, sentence-case title, the `<AgentTriggerButton>` slot, schema pill, last-run meta. Renders `<AgentDrone>` overlay positioned absolutely. Accepts new props: `kycProfileId: string`, `webAPI: ComponentFramework.WebApi`.
- `KycFullTakeover/styles/tokens.ts` — add `agentBar` token group:
  - `agentBar.bgGradient: 'linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)'`
  - `agentBar.blobCoral: '#F04E68'`, `agentBar.blobPink: '#FFB1C0'`, `agentBar.blobAmber: '#FFC477'`
  - `agentBar.borderBottom: 'rgba(255,255,255,0.16)'`
  - `agentBar.fontFamily: "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif"`
  - `agentBar.padBgIdle: 'rgba(255,255,255,0.18)'`, `agentBar.padBorderIdle: 'rgba(255,255,255,0.40)'`
  - `agentBar.padBgRunning: 'rgba(255,255,255,0.10)'`, `agentBar.padBorderRunning: 'rgba(255,255,255,0.40)'` (dashed)
  - `agentBar.errorBg: '#fdecea'`, `agentBar.errorFg: '#7a1f17'`, `agentBar.errorBorder: '#f5c2bd'`
- `KycFullTakeover/components/KycFullTakeover.tsx` — pass `kycProfileId` and `webAPI` props to `HeaderStrip`.
- `KycFullTakeover/ControlManifest.Input.xml` — bump version to 0.5.0.
- `Solution/kft-pack/solution.xml` — bump solution version to 0.5.0.

### No changes

- `index.ts` / bound output fields / status persistence — unaffected (existing takeover persistence remains).
- All section components — unaffected.
- WebAPI utility (`utils/dataverse.ts`) — `triggerAgentRun` / `pollAgentRunStatus` live as separate utils to keep agent-run logic isolated.

## Tests

### Unit (Jest)

`KycFullTakeover/utils/__tests__/triggerAgentRun.test.ts`
- rejects invalid GUID without calling fetch
- on 2xx returns `{ ok: true }`
- on 4xx returns `{ ok: false, error: 'HTTP <code>: <body>' }`
- on fetch throw returns `{ ok: false, error: <message> }`
- posts the correct body shape (`@odata.bind` URL with profileId)

`KycFullTakeover/utils/__tests__/pollAgentRunStatus.test.ts`
- calls webAPI.retrieveMultipleRecords with the expected query string
- emits onStatus(3) → poll stops, returns success terminal state
- emits onStatus(4) → poll stops, returns failure terminal state
- emits onStatus(1) repeatedly → poll continues, second poll uses fast interval
- after 60s of polling switches from fast to slow interval
- after 15min hard timeout calls onTimeout and stops
- after 5 consecutive fetch errors calls onError('connection-lost')
- after 30s of empty result set calls onError('no-rows')
- cancel() stops further fetches
- (uses jest fake timers for time-travel)

`KycFullTakeover/components/__tests__/AgentTriggerButton.test.tsx`
- renders idle by default
- click → triggering state, calls triggerAgentRun
- on POST success → enters running state, starts polling
- on poll status=3 → success flash 3s → idle
- on poll status=4 → error banner shown
- on POST failure → error banner shown
- reduced-motion media query: no transform animations on drone (snapshot test on style)

`KycFullTakeover/components/__tests__/AgentDrone.test.tsx`
- mode='idle' renders nothing
- mode='flying' renders 1 drone + 3 docs + 3 beams
- snapshot test for animation keyframe definitions

### Manual

- Trigger button works end-to-end on a real KYC profile (drone takes off, lands on success).
- Trigger then reload form mid-run → drone resumes (init query detects in-progress).
- Trigger then immediately navigate away → no console errors (polling is cancelled).
- Reduced-motion enabled → drone holds still, flight does not animate.

## Accessibility

- Trigger button: `aria-label="Trigger KYC agent run"` and `type="button"`
- Launch pad button: `aria-label="Agent run in progress"`, `disabled` attribute
- Error banner: `role="alert"` + `aria-live="polite"`
- Title is `<h2>` (was `<span>`) for heading hierarchy
- Pulse dot, drone, docs, beams: all `aria-hidden="true"` (decorative)
- Schema pill: `aria-hidden="true"`
- All interactive elements have visible focus rings (2px white offset 2px)

## Out of scope (future)

- Cancel button for an in-progress run
- Display of run history / multiple recent runs
- Live-reload of payload without refreshing the form (would require Dataverse SignalR / push channel)
- Per-section progress (e.g. "agent is now analysing source-of-wealth")

## Rollout

Ship as `0.5.0`. Standalone solution `SygnumKycFullTakeover_0.5.0.zip`. No data migration. Assumes:

- `syg_agentrunlog` entity exists with logical fields `syg_agentrunlogid` (PK), `syg_kycprofileid` (lookup to `syg_kycprofile`), `syg_agentrunstatus` (whole-number choice / int with terminal values 3 = completed-successful, 4 = failed)
- A backend plugin/workflow on `syg_agentrunlog` create that:
  1. Sets `syg_agentrunstatus` to a non-terminal value
  2. Runs the AI agent
  3. On completion, syncs the result to `syg_aianalyticsaudit` on the parent `syg_kycprofile` and sets `syg_agentrunstatus = 3`
  4. On failure, sets `syg_agentrunstatus = 4`
