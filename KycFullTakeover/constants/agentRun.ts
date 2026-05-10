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
