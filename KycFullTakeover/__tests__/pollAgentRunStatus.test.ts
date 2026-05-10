import { pollAgentRunStatus, type PollHandle, type PollEvents } from '../utils/pollAgentRunStatus';
import {
  POLL_FAST_INTERVAL_MS, POLL_SLOW_INTERVAL_MS, POLL_FAST_DURATION_MS,
  POLL_HARD_TIMEOUT_MS, POLL_NO_ROWS_GRACE_MS, POLL_MAX_CONSECUTIVE_ERRORS,
  STATUS_SUCCESS, STATUS_FAILURE,
} from '../constants/agentRun';

const PROFILE_ID = 'a1b2c3d4-1234-1234-1234-1234567890ab';

type MockResult = Array<{ syg_agentrunstatus: number }> | Error;

function makeWebAPI(rows: MockResult[]): ComponentFramework.WebApi {
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

interface CapturedEvent { kind: string; arg?: unknown; }
function makeEvents(): PollEvents & { calls: CapturedEvent[] } {
  const calls: CapturedEvent[] = [];
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
    expect(webAPI.retrieveMultipleRecords).toHaveBeenCalledTimes(3);
    const statuses = ev.calls.filter((c) => c.kind === 'status').map((c) => c.arg);
    expect(statuses).toEqual([1, 2, STATUS_SUCCESS]);
  });

  test('switches to slow interval after POLL_FAST_DURATION_MS', async () => {
    const nonTerminal: MockResult = [{ syg_agentrunstatus: 1 }];
    const webAPI = makeWebAPI(Array(20).fill(nonTerminal));
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    // Advance through the fast window. 12 polls of 5s = 60s.
    await jest.advanceTimersByTimeAsync(POLL_FAST_DURATION_MS);
    const fastCount = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length;
    expect(fastCount).toBeGreaterThanOrEqual(11);
    // Now advance one slow interval and expect exactly +1 call.
    await jest.advanceTimersByTimeAsync(POLL_SLOW_INTERVAL_MS);
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
    await jest.advanceTimersByTimeAsync(POLL_HARD_TIMEOUT_MS + POLL_SLOW_INTERVAL_MS);
    expect(ev.calls.some((c) => c.kind === 'timeout')).toBe(true);
  });

  test('after POLL_MAX_CONSECUTIVE_ERRORS errors emits onError("connection-lost")', async () => {
    const errs: MockResult[] = Array(POLL_MAX_CONSECUTIVE_ERRORS + 1).fill(new Error('net'));
    const webAPI = makeWebAPI(errs);
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS * (POLL_MAX_CONSECUTIVE_ERRORS + 1));
    expect(ev.calls).toContainEqual({ kind: 'error', arg: 'connection-lost' });
  });

  test('after POLL_NO_ROWS_GRACE_MS of empty results emits onError("no-rows")', async () => {
    const webAPI = makeWebAPI(Array(20).fill([]));
    const ev = makeEvents();
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: ev.onStatus, onError: ev.onError, onTimeout: ev.onTimeout,
    });
    await jest.advanceTimersByTimeAsync(POLL_NO_ROWS_GRACE_MS + POLL_FAST_INTERVAL_MS * 2);
    expect(ev.calls).toContainEqual({ kind: 'error', arg: 'no-rows' });
  });

  test('cancel() stops further polling', async () => {
    const webAPI = makeWebAPI(Array(10).fill([{ syg_agentrunstatus: 1 }]));
    const handle = pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    const beforeCancel = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length;
    handle.cancel();
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS * 5);
    expect((webAPI.retrieveMultipleRecords as jest.Mock).mock.calls.length).toBe(beforeCancel);
  });

  test('builds the expected query string', async () => {
    const webAPI = makeWebAPI([[{ syg_agentrunstatus: STATUS_SUCCESS }]]);
    pollAgentRunStatus({
      kycProfileId: PROFILE_ID, webAPI,
      onStatus: () => {}, onError: () => {}, onTimeout: () => {},
    });
    await jest.advanceTimersByTimeAsync(POLL_FAST_INTERVAL_MS);
    const [entity, query] = (webAPI.retrieveMultipleRecords as jest.Mock).mock.calls[0];
    expect(entity).toBe('syg_agentrunlog');
    expect(query).toContain(`_syg_kycprofileid_value eq ${PROFILE_ID}`);
    expect(query).toContain('$orderby=createdon desc');
    expect(query).toContain('$top=1');
    expect(query).toContain('$select=syg_agentrunstatus');
  });
});
