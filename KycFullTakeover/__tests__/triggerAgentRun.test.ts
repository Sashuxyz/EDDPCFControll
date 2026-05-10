import { triggerAgentRun } from '../utils/triggerAgentRun';

const PROFILE_ID = 'a1b2c3d4-1234-1234-1234-1234567890ab';

describe('triggerAgentRun', () => {
  const originalFetch = global.fetch;
  beforeAll(() => {
    // testEnvironment is 'node' so window doesn't exist; stub it.
    (global as { window?: unknown }).window = { location: { origin: 'https://crm.example.com' } };
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
