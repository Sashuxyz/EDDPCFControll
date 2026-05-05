import {
  parseStatusBlob,
  serialiseStatusBlob,
  initialStatus,
  setSectionState,
  hashSlice,
} from '../utils/sectionStatus';
import { TakeoverStatusBlob } from '../types';

describe('parseStatusBlob', () => {
  test('returns initial status for empty/missing input', () => {
    expect(parseStatusBlob('')).toEqual(initialStatus());
    expect(parseStatusBlob(null)).toEqual(initialStatus());
    expect(parseStatusBlob(undefined)).toEqual(initialStatus());
  });
  test('returns initial status when JSON is invalid', () => {
    expect(parseStatusBlob('{not json')).toEqual(initialStatus());
  });
  test('returns initial status when schemaVersion mismatches', () => {
    const bad = JSON.stringify({ schemaVersion: '2.0', sections: {} });
    expect(parseStatusBlob(bad)).toEqual(initialStatus());
  });
  test('round-trips a valid blob', () => {
    const blob: TakeoverStatusBlob = {
      schemaVersion: '1.0',
      sections: {
        professionalExperience: { state: 'done', lastRunAt: '2026-05-05T10:00:00Z', result: { patched: 1 } },
      },
    };
    const json = serialiseStatusBlob(blob);
    expect(parseStatusBlob(json)).toEqual(blob);
  });
});

describe('setSectionState', () => {
  test('mutates immutably (returns new blob)', () => {
    const before = initialStatus();
    const after = setSectionState(before, 'additionalComments', { state: 'done', result: { patched: 1 } });
    expect(before.sections.additionalComments).toBeUndefined();
    expect(after.sections.additionalComments).toEqual({ state: 'done', result: { patched: 1 } });
  });
});

describe('hashSlice', () => {
  test('returns same hash for equivalent payloads', () => {
    const a = { foo: 'bar', n: 1 };
    const b = { n: 1, foo: 'bar' };
    expect(hashSlice(a)).toBe(hashSlice(b));
  });
  test('returns different hash for different payloads', () => {
    expect(hashSlice({ foo: 'bar' })).not.toBe(hashSlice({ foo: 'baz' }));
  });
  test('hash is hex string of length 40 (sha-1)', () => {
    expect(hashSlice({ x: 1 })).toMatch(/^[0-9a-f]{40}$/);
  });
});
