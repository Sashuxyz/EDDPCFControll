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

// ============================================================================
// Itemized child-record creation
// ============================================================================
//
// Creates one row per item in parallel. Each `row` is already a fully-formed
// OData write payload — fields lowercase, lookups as `<key>@odata.bind` URLs,
// parent bind included by the caller.

export interface CreateChildrenResult {
  ok:       boolean;
  created:  number;
  failed:   number;
  errors:   Array<{ rowIndex: number; rowName?: string; message: string }>;
}

const INVALID_PROPERTY_PATTERNS = [
  /invalid property/i,
  /property ["']?[^"']+["']? does not exist/i,
  /resource not found/i,
];

export function isInvalidPropertyError(message: string): boolean {
  if (typeof message !== 'string' || message.length === 0) return false;
  return INVALID_PROPERTY_PATTERNS.some((re) => re.test(message));
}

// Patterns Dataverse uses when a property/lookup-bind name in the payload
// doesn't exist on the entity. The captured group is the offending name.
const UNDECLARED_PROPERTY_PATTERNS: RegExp[] = [
  /undeclared property ['"]([^'"]+)['"]/i,
  /property ['"]([^'"]+)['"] does not exist/i,
  /An undeclared property ['"]([^'"]+)['"]/i,
];

export function extractUndeclaredProperty(message: string): string | null {
  if (typeof message !== 'string' || message.length === 0) return null;
  for (const re of UNDECLARED_PROPERTY_PATTERNS) {
    const m = re.exec(message);
    if (m) return m[1];
  }
  return null;
}

const MAX_PROPERTY_RETRIES = 5;

export async function createChildren(
  entitySetName:   string,
  rows:            Array<Record<string, unknown>>,
  rowNames:        string[],
): Promise<CreateChildrenResult> {
  const result: CreateChildrenResult = { ok: true, created: 0, failed: 0, errors: [] };
  if (rows.length === 0) return result;

  const base = window.location.origin;

  const settled = await Promise.all(rows.map(async (row, idx) => {
    let body: Record<string, unknown> = { ...row };
    const droppedProps: string[] = [];
    let lastStatus = 0;
    let lastMessage = '';
    let lastRawBody = '';

    for (let attempt = 0; attempt <= MAX_PROPERTY_RETRIES; attempt += 1) {
      try {
        const resp = await fetch(`${base}/api/data/v9.2/${entitySetName}`, {
          method:      'POST',
          credentials: 'include',
          headers:     {
            'Content-Type':       'application/json',
            'OData-Version':      '4.0',
            'OData-MaxVersion':   '4.0',
            'Accept':             'application/json',
            'Prefer':             'return=representation',
          },
          body: JSON.stringify(body),
        });

        if (resp.ok) {
          if (droppedProps.length > 0) {
            // eslint-disable-next-line no-console
            console.warn('[KycFullTakeover] createChildren succeeded after dropping props', {
              entitySetName,
              rowIndex: idx,
              rowName:  rowNames[idx],
              droppedProps,
            });
          }
          return { ok: true as const };
        }

        lastStatus = resp.status;
        let errBody = '';
        try { errBody = await resp.text(); } catch { /* ignore */ }
        lastRawBody = errBody;

        let extracted = '';
        try {
          const parsed = JSON.parse(errBody) as { error?: { message?: string } };
          if (parsed?.error?.message) extracted = parsed.error.message;
        } catch { /* not JSON, keep raw body */ }
        lastMessage = extracted || errBody;

        // Self-healing: if Dataverse names an undeclared property, drop it
        // (and any matching @odata.bind variant) and retry.
        if (attempt < MAX_PROPERTY_RETRIES) {
          const undeclared = extractUndeclaredProperty(lastMessage);
          if (undeclared) {
            const lower = undeclared.toLowerCase();
            const candidates: string[] = [
              undeclared, `${undeclared}@odata.bind`,
              lower,      `${lower}@odata.bind`,
            ];
            const toRemove = Object.keys(body).filter((k) =>
              candidates.includes(k) || candidates.includes(k.toLowerCase()),
            );
            if (toRemove.length > 0) {
              toRemove.forEach((k) => { delete body[k]; });
              droppedProps.push(...toRemove);
              // eslint-disable-next-line no-console
              console.warn('[KycFullTakeover] createChildren: dropping undeclared property and retrying', {
                entitySetName,
                rowIndex: idx,
                rowName:  rowNames[idx],
                undeclared,
                droppedKeys: toRemove,
                attempt,
              });
              continue;
            }
          }
        }

        // Out of retries / nothing more to drop — log and return failure.
        // eslint-disable-next-line no-console
        console.error('[KycFullTakeover] createChildren FAILED', {
          entitySetName,
          rowIndex:    idx,
          rowName:     rowNames[idx],
          status:      lastStatus,
          message:     lastMessage,
          body,
          rawError:    lastRawBody,
          droppedProps,
        });
        return { ok: false as const, message: `HTTP ${lastStatus}: ${lastMessage.slice(0, 1500)}` };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[KycFullTakeover] createChildren THREW', { entitySetName, rowIndex: idx, rowName: rowNames[idx], error: e });
        return { ok: false as const, message: (e as Error).message ?? String(e) };
      }
    }

    return { ok: false as const, message: `HTTP ${lastStatus}: ${lastMessage.slice(0, 1500)}` };
  }));

  settled.forEach((r, idx) => {
    if (r.ok) {
      result.created += 1;
    } else {
      result.failed += 1;
      result.errors.push({ rowIndex: idx, rowName: rowNames[idx], message: r.message });
    }
  });
  result.ok = result.failed === 0;
  return result;
}
