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
