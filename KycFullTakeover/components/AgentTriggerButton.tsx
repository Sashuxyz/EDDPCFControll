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
import { agentBar } from '../styles/tokens';
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

  const startPoll = React.useCallback((): void => {
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
  }, [kycProfileId, webAPI]);

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
          setState({ kind: 'running' });
          startPoll();
        }
      } catch {
        // Init query failure is silent — RM can still trigger manually.
      }
    })();
    return () => { cancelled = true; };
  }, [kycProfileId, webAPI, startPoll]);

  const handleClick = async (): Promise<void> => {
    if (state.kind === 'triggering' || state.kind === 'running') return;
    setState({ kind: 'triggering' });
    const result = await triggerAgentRun(webAPI, kycProfileId);
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
}
