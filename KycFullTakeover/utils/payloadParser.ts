import { KycPayload, PartyRef, CreateNewPartyRef, ExistingPartyRef, RelatedPartyRow } from '../types';

export type ParseResult =
  | { ok: true;  payload: KycPayload }
  | { ok: false; error: string };

/** Per-field string length cap. 64 KB is comfortably more than any human-
 *  authored narrative; anything beyond is treated as malformed and rejected. */
const MAX_STRING_LEN = 64 * 1024;

/** Per-section array element cap. KYC profiles in production have <50 items
 *  per section; 500 is a generous ceiling that still rejects DoS payloads. */
const MAX_ARRAY_LEN = 500;

/** Hard cap on the JSON string itself. 2 MB is much more than any
 *  legitimate agent payload (largest real samples ~30 KB). */
const MAX_RAW_LEN = 2 * 1024 * 1024;

/** Names of top-level sections that are arrays. Validated for length cap. */
const ARRAY_SECTIONS = ['findings', 'businessActivities', 'countriesOfActivity',
  'detailedDAHoldings', 'plannedFiatFunds', 'plannedDAFunds'] as const;

interface ValidationError {
  path: string;
  reason: string;
}

/** Walk the payload, capping strings/arrays and collecting structural issues.
 *  Returns the first error found, or null if the payload is acceptable. */
function validateStructure(obj: Record<string, unknown>): ValidationError | null {
  // Helper that scans a value to enforce caps + collects the first violation.
  const errors: ValidationError[] = [];
  const stack: Array<{ value: unknown; path: string; depth: number }> = [{ value: obj, path: '$', depth: 0 }];
  while (stack.length > 0) {
    const { value, path, depth } = stack.pop()!;
    if (depth > 12) {
      errors.push({ path, reason: 'nesting too deep (>12 levels)' });
      break;
    }
    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LEN) {
        errors.push({ path, reason: `string longer than ${MAX_STRING_LEN} chars` });
        break;
      }
    } else if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LEN) {
        errors.push({ path, reason: `array longer than ${MAX_ARRAY_LEN} elements` });
        break;
      }
      for (let i = 0; i < value.length; i += 1) {
        stack.push({ value: value[i], path: `${path}[${i}]`, depth: depth + 1 });
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        stack.push({ value: v, path: `${path}.${k}`, depth: depth + 1 });
      }
    }
    if (errors.length > 0) break;
  }
  return errors[0] ?? null;
}

/** Type-checks the top-level array sections — they must be arrays (or absent),
 *  not strings/objects/numbers. Returns the first mismatch found. */
function validateTopLevelShape(obj: Record<string, unknown>): ValidationError | null {
  for (const section of ARRAY_SECTIONS) {
    const v = obj[section];
    if (v !== undefined && !Array.isArray(v)) {
      return { path: `$.${section}`, reason: 'expected array' };
    }
  }
  // sourceOfWealth: { narrative, items }
  if (obj.sourceOfWealth !== undefined) {
    const sow = obj.sourceOfWealth as { items?: unknown };
    if (typeof obj.sourceOfWealth !== 'object' || obj.sourceOfWealth === null) {
      return { path: '$.sourceOfWealth', reason: 'expected object' };
    }
    if (sow.items !== undefined && !Array.isArray(sow.items)) {
      return { path: '$.sourceOfWealth.items', reason: 'expected array' };
    }
  }
  // relatedParties: either { narrative, items } (new shape) or bare array (legacy).
  // Bare array is normalised below.
  if (obj.relatedParties !== undefined && !Array.isArray(obj.relatedParties)) {
    const rp = obj.relatedParties as { items?: unknown };
    if (typeof obj.relatedParties !== 'object' || obj.relatedParties === null) {
      return { path: '$.relatedParties', reason: 'expected object or array' };
    }
    if (rp.items !== undefined && !Array.isArray(rp.items)) {
      return { path: '$.relatedParties.items', reason: 'expected array' };
    }
  }
  return null;
}

export function parsePayload(raw: string | null | undefined): ParseResult {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'empty payload' };
  }
  if (raw.length > MAX_RAW_LEN) {
    return { ok: false, error: `payload too large (${raw.length} bytes > ${MAX_RAW_LEN})` };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${(e as Error).message}` };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: 'payload root is not an object' };
  }
  const sv = (obj as { schemaVersion?: unknown }).schemaVersion;
  if (typeof sv !== 'string' || !sv.startsWith('1.')) {
    return { ok: false, error: `unsupported schemaVersion: ${sv}` };
  }

  const root = obj as Record<string, unknown>;

  const shapeErr = validateTopLevelShape(root);
  if (shapeErr) {
    return { ok: false, error: `shape mismatch at ${shapeErr.path}: ${shapeErr.reason}` };
  }

  const sizeErr = validateStructure(root);
  if (sizeErr) {
    return { ok: false, error: `${sizeErr.reason} at ${sizeErr.path}` };
  }

  // Backward-compat: relatedParties used to be a bare array; the new shape is
  // { narrative?, items } so the section can ship a parent narrative alongside
  // the junction rows. Normalise legacy arrays into the new shape so downstream
  // consumers can always read .items / .narrative.
  const rp = root.relatedParties;
  if (Array.isArray(rp)) {
    root.relatedParties = { items: rp as RelatedPartyRow[] };
  }

  return { ok: true, payload: root as unknown as KycPayload };
}

export function isPartyRefNew(ref: PartyRef): ref is CreateNewPartyRef {
  return 'createNew' in ref;
}

export function isPartyRefExisting(ref: PartyRef): ref is ExistingPartyRef {
  return 'id' in ref && typeof (ref as ExistingPartyRef).id === 'string';
}
