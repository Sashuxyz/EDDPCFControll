import { US_PERSON_STATUS, getOptionLabel } from '../utils/optionSets';

describe('US_PERSON_STATUS map', () => {
  test('confirmed values from spec', () => {
    expect(US_PERSON_STATUS).toEqual({
      1: 'Not a US Person',
      2: 'Former US Person',
      3: 'US Person',
      4: 'US Nexus',
    });
  });
});

describe('getOptionLabel', () => {
  test('returns label for known value', () => {
    expect(getOptionLabel(US_PERSON_STATUS, 3)).toBe('US Person');
  });
  test('returns "(unknown N)" for unknown value', () => {
    expect(getOptionLabel(US_PERSON_STATUS, 99)).toBe('(unknown 99)');
  });
  test('returns empty for null/undefined', () => {
    expect(getOptionLabel(US_PERSON_STATUS, null)).toBe('');
    expect(getOptionLabel(US_PERSON_STATUS, undefined)).toBe('');
  });
});
