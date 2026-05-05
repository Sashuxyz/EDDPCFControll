// Thin wrapper around context.webAPI for the operations Phase 1 needs:
//   - PATCH parent KYC profile (used by all narrative + field-set sections)
// POST children, $ref POST for N:N, and contact/account creation come in M4-M6.

import { isValidGuid } from './guidValidation';

type WebAPI = ComponentFramework.WebApi;

export interface PatchResult {
  ok:    boolean;
  error?: string;
}

export async function patchKycProfile(
  webAPI: WebAPI,
  profileId: string,
  fields: Record<string, unknown>
): Promise<PatchResult> {
  if (!isValidGuid(profileId)) {
    return { ok: false, error: `invalid profileId: ${profileId}` };
  }
  if (Object.keys(fields).length === 0) {
    return { ok: true };  // nothing to write — still success
  }
  try {
    await webAPI.updateRecord('syg_kycprofile', profileId, fields);
    return { ok: true };
  } catch (e) {
    const err = e as { message?: string; toString?: () => string };
    return { ok: false, error: err.message ?? err.toString?.() ?? 'unknown error' };
  }
}
