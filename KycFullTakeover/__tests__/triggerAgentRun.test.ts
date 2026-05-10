import { triggerAgentRun } from '../utils/triggerAgentRun';

const PROFILE_ID = 'a1b2c3d4-1234-1234-1234-1234567890ab';

function makeWebAPI(behavior: 'ok' | 'badProp' | 'badPropThenOk' | 'genericError'): ComponentFramework.WebApi {
  let i = 0;
  return {
    createRecord: jest.fn(async (_entity: string, data: Record<string, string>) => {
      i += 1;
      if (behavior === 'ok') return { id: 'newid-1', entityType: 'syg_agentrunlog' };
      if (behavior === 'badProp') throw new Error('An undeclared property "syg_kycprofileid" was found');
      if (behavior === 'genericError') throw new Error('500 server error');
      if (behavior === 'badPropThenOk') {
        if (i === 1) throw new Error('property "syg_kycprofileid" does not exist on type');
        // second attempt — verify it used PascalCase
        if (data['syg_KycProfileId@odata.bind']) return { id: 'newid-2', entityType: 'syg_agentrunlog' };
        throw new Error('unexpected bind key');
      }
      throw new Error('unreachable');
    }),
  } as unknown as ComponentFramework.WebApi;
}

describe('triggerAgentRun', () => {
  beforeEach(() => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('rejects invalid GUID without calling createRecord', async () => {
    const webAPI = makeWebAPI('ok');
    const result = await triggerAgentRun(webAPI, 'not-a-guid');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/invalid.*guid/i);
    expect(webAPI.createRecord).not.toHaveBeenCalled();
  });

  test('on success returns ok:true with recordId', async () => {
    const webAPI = makeWebAPI('ok');
    const result = await triggerAgentRun(webAPI, PROFILE_ID);
    expect(result.ok).toBe(true);
    expect(result.recordId).toBe('newid-1');
  });

  test('first call uses lowercase binding key', async () => {
    const webAPI = makeWebAPI('ok');
    await triggerAgentRun(webAPI, PROFILE_ID);
    const [entity, data] = (webAPI.createRecord as jest.Mock).mock.calls[0];
    expect(entity).toBe('syg_agentrunlog');
    expect(data['syg_kycprofileid@odata.bind']).toBe(`/syg_kycprofiles(${PROFILE_ID})`);
  });

  test('on bad-property error retries with PascalCase binding key', async () => {
    const webAPI = makeWebAPI('badPropThenOk');
    const result = await triggerAgentRun(webAPI, PROFILE_ID);
    expect(result.ok).toBe(true);
    expect(webAPI.createRecord).toHaveBeenCalledTimes(2);
    const [, secondData] = (webAPI.createRecord as jest.Mock).mock.calls[1];
    expect(secondData['syg_KycProfileId@odata.bind']).toBe(`/syg_kycprofiles(${PROFILE_ID})`);
  });

  test('on persistent bad-property error returns the failure', async () => {
    const webAPI = makeWebAPI('badProp');
    const result = await triggerAgentRun(webAPI, PROFILE_ID);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/property/i);
  });

  test('on non-property error does not retry', async () => {
    const webAPI = makeWebAPI('genericError');
    const result = await triggerAgentRun(webAPI, PROFILE_ID);
    expect(result.ok).toBe(false);
    expect(webAPI.createRecord).toHaveBeenCalledTimes(1);
  });
});
