import {
  parseStatusBlob,
  serialiseStatusBlob,
  initialStatus,
  setSectionState,
  hashSlice,
  sha1Hex,
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
  test('returns initial status when sections is null', () => {
    const bad = JSON.stringify({ schemaVersion: '1.0', sections: null });
    expect(parseStatusBlob(bad)).toEqual(initialStatus());
  });
  test('returns initial status when sections is an array', () => {
    const bad = JSON.stringify({ schemaVersion: '1.0', sections: [] });
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
  test('matches RFC 3174 known vector for "abc"', () => {
    // SHA-1("abc") = a9993e364706816aba3e25717850c26c9cd0d89d
    expect(sha1Hex('abc')).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });
  test('matches RFC 3174 known vector for empty string', () => {
    expect(sha1Hex('')).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });
  test('matches a known longer-input vector', () => {
    // SHA-1("The quick brown fox jumps over the lazy dog") = 2fd4e1c67a2d28fced849ee1bb76e7391b93eb12
    expect(sha1Hex('The quick brown fox jumps over the lazy dog')).toBe('2fd4e1c67a2d28fced849ee1bb76e7391b93eb12');
  });
});
