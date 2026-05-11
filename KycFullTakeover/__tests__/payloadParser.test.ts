import { parsePayload, ParseResult } from '../utils/payloadParser';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.join(__dirname, '..', '..', 'docs', 'superpowers', 'specs', '2026-05-05-kycfulltakeover-sample-payload.json');
const sampleJson = fs.readFileSync(samplePath, 'utf-8');

describe('parsePayload', () => {
  test('rejects empty / invalid input', () => {
    expect(parsePayload('').ok).toBe(false);
    expect(parsePayload(null).ok).toBe(false);
    expect(parsePayload('{not json').ok).toBe(false);
  });

  test('rejects unknown major schemaVersion', () => {
    const result = parsePayload(JSON.stringify({ schemaVersion: '2.0' }));
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/schemaVersion/);
  });

  test('accepts a 1.x payload', () => {
    const result = parsePayload(JSON.stringify({ schemaVersion: '1.0' }));
    expect(result.ok).toBe(true);
  });

  test('accepts the spec sample payload and exposes typed sections', () => {
    const result = parsePayload(sampleJson) as ParseResult & { ok: true };
    expect(result.ok).toBe(true);
    expect(result.payload.schemaVersion).toBe('1.0');
    expect(result.payload.findings).toHaveLength(2);
    expect(result.payload.proposedClientEmail?.to[0].etn).toBe('lead');
    // relatedParties is normalised to { items } even if the source was a bare array.
    const rp = result.payload.relatedParties as { narrative?: string; items: unknown[] };
    expect(rp.items).toHaveLength(3);

    // The third related party uses CreateNewPartyRef
    const sofia = rp.items[2] as { syg_relatedpartyid: object };
    expect('createNew' in sofia.syg_relatedpartyid).toBe(true);
  });

  test('isPartyRefNew discriminates correctly', () => {
    const { isPartyRefNew } = require('../utils/payloadParser');
    expect(isPartyRefNew({ id: 'x', name: 'y', etn: 'contact' })).toBe(false);
    expect(isPartyRefNew({ etn: 'contact', name: 'y', createNew: { new_typeofcontact: 9 } })).toBe(true);
  });
});
