# Trigger Agent Run — Design

**Status:** approved
**Date:** 2026-05-10
**Component:** `Syg.KycFullTakeover` (PCF)
**Target version:** 0.5.0

## Goal

Give RMs a way to trigger a fresh KYC agent run from inside the KycFullTakeover control. Clicking the button creates a `syg_agentrunlog` row referencing the current KYC profile. A backend plugin/workflow picks up new rows and starts the agent. The PCF is fire-and-forget: it does not poll, does not wait, does not update its own state from the run result. The next form reload will surface the new payload via the existing `aiAnalyticsAudit` bound field.

## Non-goals

- No status polling. PCF does not watch `syg_agentrunlog` for completion.
- No disable-while-running gate. RM may queue multiple runs; backend dedupes.
- No control-property configuration. The "Queued" semantics are handled entirely by the backend plugin (PCF doesn't set `statuscode`).
- No confirmation dialog. One click triggers, with a brief in-flight state.
- No new bound output fields. The trigger writes directly via WebAPI.

## UX

### Header strip — visual

The existing brand-blue `HeaderStrip` is replaced with a coral-forward "Aurora" command bar. Variant **v2b** from the brainstorm:

- **Background:** `linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)` — wine-coral, brand-anchored
- **Aurora blobs:** three radial-gradient circles, slowly oscillating (transform translate + scale)
  - Blob 1: `#F04E68` (Sygnum coral), 300px, opacity 0.55, 12s loop
  - Blob 2: `#FFB1C0` (soft pink), 260px, opacity 0.40, 14s loop
  - Blob 3: `#FFC477` (warm amber), 240px, opacity 0.30, 16s loop
- **Bottom border:** 1px `rgba(255,255,255,0.16)`
- **Padding:** 18px vertical / 24px horizontal
- **Pulse dot:** 10px white circle, 2s pulse animation (`box-shadow` ring expansion)
- **Title:** "KYC Agent Output" — sentence case, 18px, weight 600, white, normal letter-spacing
- **Trigger button** (idle):
  - bg `rgba(255,255,255,0.18)`, border `1px solid rgba(255,255,255,0.40)`, radius 8px
  - padding 8px / 16px, 13px / weight 600, white text
  - leading icon: 14×14 SVG sun-rays (Lucide `sun`-style)
  - label: "Trigger agent run"
  - shadow: `0 4px 14px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.18)`
  - backdrop-filter: `blur(10px)`
  - hover: bg `rgba(255,255,255,0.26)`, transition 200ms
  - focus-visible: 2px outline `#FFFFFF` offset 2px
- **Schema pill:** `rgba(255,255,255,0.18)` bg, white border 0.30, radius 999px, 11px text "schema 1.0.0"
- **Last-run meta:** 12px, white opacity 0.92, "last run · 09.05.2026 14:32" (Swiss date format from existing `formatSwissDate`)
- **Font stack:** `'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif`

### Button states

| State | Visual |
|---|---|
| Idle | as above |
| In-flight (POST pending) | label "Triggering…", spinner SVG (rotating), button disabled, opacity reduced to 0.7, no glow change |
| Success (3s flash, then back to idle) | bg `rgba(46,160,67,0.85)` (green), label "Run requested", check-mark icon |
| Error (sticky until next click) | border becomes `1px solid #ff6b6b`, label reverts to "Trigger agent run". Red banner appears below the header strip with the error message. |

### Error banner

When a POST fails, render a banner directly under the header strip:

- bg `#fdecea`, color `#7a1f17`, border `1px solid #f5c2bd`, radius 3px
- padding `8px 12px`, 12px text, Inter/Segoe UI
- icon: ⚠ leading
- text: `Could not queue agent run: <message>`
- The banner has a dismiss × button on the right; clicking the trigger button again also clears it.

### Reduced motion

When `prefers-reduced-motion: reduce` is true:
- Aurora blobs hold still (no transform animation)
- Pulse dot does not pulse (static dot)
- Button state transitions remain (UX feedback necessary)

## Data flow

```
Click "Trigger agent run"
   → button enters in-flight state
   → POST /api/data/v9.2/syg_agentrunlogs
       Body: { "syg_KycProfileId@odata.bind": "/syg_kycprofiles(<id>)" }
   → on 2xx (typically 201 Created):
        → button success state for 3s
        → revert to idle
   → on non-2xx or fetch error:
        → button error state
        → render banner with message
```

The PCF does NOT:
- set `statuscode` on the row (backend assigns "Queued")
- set `statecode`
- set the primary attribute (`syg_name`) — backend or auto-numbering handles it
- read back the created row's GUID for any purpose

If the table requires a `syg_name`, the spec defers that to a server-side plugin or auto-number. If implementation reveals a hard requirement, fall back to `Run requested <ISO timestamp>` as the name. **This is a follow-up, not blocking.**

## Files

### New

- `KycFullTakeover/components/AgentTriggerButton.tsx` — the button + states + error banner. Self-contained, takes `(kycProfileId, onError)` and manages own in-flight state.
- `KycFullTakeover/utils/triggerAgentRun.ts` — pure function `triggerAgentRun(kycProfileId): Promise<{ ok: boolean; error?: string }>`. Wraps `fetch` to POST `syg_agentrunlogs`. Validates GUID, returns structured result. Uses the same patterns as `associateRecords` / `createChildren` in `utils/dataverse.ts`.

### Modified

- `KycFullTakeover/components/HeaderStrip.tsx` — full visual rewrite to v2b Aurora. Adds three CSS keyframe definitions (aurora1, aurora2, aurora3, pulseCoral). Renders the new pulse dot, sentence-case title, trigger button slot, schema pill, last-run meta. Accepts a new prop `kycProfileId: string` so it can render `<AgentTriggerButton>`.
- `KycFullTakeover/styles/tokens.ts` — add `agentBar` token group:
  - `agentBar.bgGradient: 'linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)'`
  - `agentBar.blobCoral: '#F04E68'`, `agentBar.blobPink: '#FFB1C0'`, `agentBar.blobAmber: '#FFC477'`
  - `agentBar.borderBottom: 'rgba(255,255,255,0.16)'`
  - `agentBar.fontFamily: "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif"`
- `KycFullTakeover/components/KycFullTakeover.tsx` — pass `kycProfileId` prop to `HeaderStrip`.
- `KycFullTakeover/ControlManifest.Input.xml` — bump version to 0.5.0.
- `Solution/kft-pack/solution.xml` — bump solution version to 0.5.0.

### No changes

- `index.ts` / bound output fields / status persistence — unaffected.
- All section components — unaffected.
- WebAPI utility — `triggerAgentRun` lives as a separate util to keep entity-specific logic isolated.

## Tests

- `KycFullTakeover/utils/__tests__/triggerAgentRun.test.ts`
  - rejects invalid GUID without calling fetch
  - on 2xx returns `{ ok: true }`
  - on 4xx returns `{ ok: false, error: 'HTTP <code>: <body>' }`
  - on fetch throw returns `{ ok: false, error: <message> }`
  - posts the correct body shape (`@odata.bind` URL with profileId)
- `KycFullTakeover/components/__tests__/AgentTriggerButton.test.tsx`
  - renders idle by default
  - shows in-flight state during pending promise
  - on success shows "Run requested" then reverts after 3s
  - on error shows red border + emits onError with message
  - reduced-motion media query: no transform animations on blobs (snapshot test on style)

## Accessibility

- Button has `aria-label="Trigger KYC agent run"` and `type="button"`
- Disabled state uses `disabled` attribute, not just visual
- Error banner uses `role="alert"` + `aria-live="polite"`
- Title uses `<h2>` semantics (was `<span>`); preserves heading hierarchy in the form
- Pulse dot is decorative — `aria-hidden="true"`
- Schema pill is decorative — `aria-hidden="true"` (raw text alternative is in the title block)

## Out of scope (future)

- Last-run timestamp updating from the new agent log row (currently shows last takeover time from status blob; will keep that behaviour)
- Disable-button-while-running by querying for in-progress runs
- Status polling / live-update without form reload
- Cancel button for in-progress run

## Rollout

Ship as `0.5.0`. Standalone solution `SygnumKycFullTakeover_0.5.0.zip`. No data migration needed. The `syg_agentrunlog` entity must exist in the target environment with the `syg_kycprofileid` lookup; this is assumed to already be present (per the prior brainstorm where the user moved to the backend-sync approach).
