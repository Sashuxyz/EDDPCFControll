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
