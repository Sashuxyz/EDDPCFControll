// Thin wrapper around context.webAPI for the operations Phase 1 needs:
//   - PATCH parent KYC profile (used by all narrative + field-set sections)
//   - $ref POST for N:N association (used by M4 sections)
// POST children + contact/account creation come in M5-M6.

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

// ============================================================================
// N:N association
// ============================================================================
//
// context.webAPI does NOT expose an associate primitive. We use raw fetch()
// against the OData $ref endpoint:
//   POST /api/data/v9.2/syg_kycprofiles(<id>)/<relationshipName>/$ref
//   Body: { "@odata.id": "<base>/api/data/v9.2/<targetEntitySet>(<id>)" }
//
// Re-running an N:N takeover is idempotent from the RM's perspective: the
// agent ships the full list every time, and Dataverse rejects duplicate
// associations with a 400 "duplicate key" error. We swallow that as success.

export interface AssociationResult {
  ok:          boolean;
  associated:  number;       // newly inserted associations
  duplicates:  number;       // already-existing associations (no-op success)
  failed:      number;       // hard failures
  errors:      Array<{ targetId: string; message: string }>;
}

const DUPLICATE_PATTERNS = [
  /duplicate key/i,
  /already exists/i,
  /duplicate.?record/i,
  /duplicate.?detected/i,
];

export function isDuplicateKeyError(message: string): boolean {
  if (typeof message !== 'string' || message.length === 0) return false;
  return DUPLICATE_PATTERNS.some((re) => re.test(message));
}

export async function associateRecords(
  kycProfileId:        string,
  relationshipName:    string,
  targetEntitySet:     string,
  targetIds:           string[],
): Promise<AssociationResult> {
  const result: AssociationResult = { ok: true, associated: 0, duplicates: 0, failed: 0, errors: [] };
  if (!isValidGuid(kycProfileId)) {
    return { ...result, ok: false, errors: [{ targetId: '', message: `invalid profileId: ${kycProfileId}` }] };
  }

  const base = window.location.origin;

  for (const targetId of targetIds) {
    if (!isValidGuid(targetId)) {
      result.failed += 1;
      result.errors.push({ targetId, message: 'invalid GUID' });
      continue;
    }
    try {
      const resp = await fetch(
        `${base}/api/data/v9.2/syg_kycprofiles(${kycProfileId})/${relationshipName}/$ref`,
        {
          method:      'POST',
          credentials: 'include',
          headers:     {
            'Content-Type':       'application/json',
            'OData-Version':      '4.0',
            'OData-MaxVersion':   '4.0',
            'Accept':             'application/json',
          },
          body: JSON.stringify({
            '@odata.id': `${base}/api/data/v9.2/${targetEntitySet}(${targetId})`,
          }),
        },
      );

      if (resp.ok || resp.status === 204) {
        result.associated += 1;
        continue;
      }

      let errBody = '';
      try { errBody = await resp.text(); } catch { /* ignore */ }
      if (isDuplicateKeyError(errBody)) {
        result.duplicates += 1;
        continue;
      }

      result.failed += 1;
      result.errors.push({ targetId, message: `HTTP ${resp.status}: ${errBody.slice(0, 200)}` });
    } catch (e) {
      result.failed += 1;
      result.errors.push({ targetId, message: (e as Error).message ?? String(e) });
    }
  }

  result.ok = result.failed === 0;
  return result;
}
