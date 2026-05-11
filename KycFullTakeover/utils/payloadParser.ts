import { KycPayload, PartyRef, CreateNewPartyRef, ExistingPartyRef, RelatedPartyRow } from '../types';

export type ParseResult =
  | { ok: true;  payload: KycPayload }
  | { ok: false; error: string };

export function parsePayload(raw: string | null | undefined): ParseResult {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'empty payload' };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${(e as Error).message}` };
  }
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'payload root is not an object' };
  }
  const sv = (obj as { schemaVersion?: unknown }).schemaVersion;
  if (typeof sv !== 'string' || !sv.startsWith('1.')) {
    return { ok: false, error: `unsupported schemaVersion: ${sv}` };
  }

  // Backward-compat: relatedParties used to be a bare array; the new shape is
  // { narrative?, items } so the section can ship a parent narrative alongside
  // the junction rows. Normalise legacy arrays into the new shape so downstream
  // consumers can always read .items / .narrative.
  const root = obj as Record<string, unknown>;
  const rp   = root.relatedParties;
  if (Array.isArray(rp)) {
    root.relatedParties = { items: rp as RelatedPartyRow[] };
  }

  // Phase 1 trusts the agent's structure; deep validation is plan-implementation
  // detail (M3-M6 will harden specific section parsers as they're built).
  return { ok: true, payload: root as unknown as KycPayload };
}

export function isPartyRefNew(ref: PartyRef): ref is CreateNewPartyRef {
  return 'createNew' in ref;
}

export function isPartyRefExisting(ref: PartyRef): ref is ExistingPartyRef {
  return 'id' in ref && typeof (ref as ExistingPartyRef).id === 'string';
}
