// POST a new syg_agentrunlog row referencing the given KYC profile.
// A backend plugin/workflow on row create picks it up and starts the agent.
// PCF doesn't set syg_agentrunstatus — the backend assigns "Queued".
//
// Uses context.webAPI.createRecord which:
//   - resolves the entity-set name automatically (no need to guess plural)
//   - uses the same auth path as our retrieveMultipleRecords poll
//   - returns the new record id on success
//
// We try the lookup-bind key in two case variants because the navigation
// property name on syg_agentrunlog may be either lowercase logical name
// (`syg_kycprofileid`) or PascalCase schema name (`syg_KycProfileId`).
// First attempt uses lowercase (most common for Sygnum-prefixed fields);
// on a property-name error we retry with PascalCase. Errors are logged to
// the console so the RM/devs can diagnose unexpected schema differences.

import { isValidGuid } from './guidValidation';
import { debugInfo, debugWarn, debugError } from './debugLog';

export interface TriggerResult {
  ok:     boolean;
  error?: string;
  /** GUID of the created log row (when ok). */
  recordId?: string;
}

const PROPERTY_NAME_PATTERNS = [
  /property ["']?[^"']+["']? does not exist/i,
  /An undeclared property/i,
  /no property.*found/i,
  /invalid property/i,
];

function looksLikeBadProperty(message: string): boolean {
  return PROPERTY_NAME_PATTERNS.some((re) => re.test(message));
}

async function tryCreate(
  webAPI: ComponentFramework.WebApi,
  bindKey: string,
  kycProfileId: string,
): Promise<TriggerResult> {
  const data = { [bindKey]: `/syg_kycprofiles(${kycProfileId})` } as Record<string, string>;
  debugInfo('[KycFullTakeover] triggerAgentRun: createRecord', {
    entity: 'syg_agentrunlog',
    bindKey,
    data,
  });
  try {
    const created = await webAPI.createRecord('syg_agentrunlog', data);
    const id = (created as { id?: string }).id ?? '';
    debugInfo('[KycFullTakeover] triggerAgentRun: created', { id });
    return { ok: true, recordId: id };
  } catch (e) {
    const err = e as { message?: string; toString?: () => string };
    const msg = err.message ?? err.toString?.() ?? 'unknown error';
    debugError('[KycFullTakeover] triggerAgentRun: createRecord FAILED', { bindKey, msg, error: e });
    return { ok: false, error: msg };
  }
}

export async function triggerAgentRun(
  webAPI:        ComponentFramework.WebApi,
  kycProfileId:  string,
): Promise<TriggerResult> {
  if (!isValidGuid(kycProfileId)) {
    return { ok: false, error: `invalid GUID: ${kycProfileId}` };
  }

  // Attempt 1: lowercase logical name binding (Sygnum-style)
  const lower = await tryCreate(webAPI, 'syg_kycprofileid@odata.bind', kycProfileId);
  if (lower.ok) return lower;

  // Attempt 2: PascalCase schema name binding
  if (lower.error && looksLikeBadProperty(lower.error)) {
    debugWarn('[KycFullTakeover] triggerAgentRun: retrying with PascalCase bind key');
    const upper = await tryCreate(webAPI, 'syg_KycProfileId@odata.bind', kycProfileId);
    return upper;
  }

  return lower;
}
