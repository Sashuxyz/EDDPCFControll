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

import {
  PEP_STATUS, ANNUAL_INCOME, TOTAL_WEALTH_BAND, SANCTION_CHECK,
  REPUTATIONAL_RISK, SOURCE_OF_WEALTH, TRANSFER_TIMEFRAME,
} from '../utils/optionSets';

describe('PEP_STATUS map', () => {
  test('has the 5 confirmed values', () => {
    expect(Object.keys(PEP_STATUS)).toHaveLength(5);
    expect(PEP_STATUS[0]).toBe('No');
    expect(PEP_STATUS[2]).toBe('Domestic PEP');
  });
});

describe('ANNUAL_INCOME map', () => {
  test('has 5 banded values starting at 1', () => {
    expect(Object.keys(ANNUAL_INCOME)).toHaveLength(5);
    expect(ANNUAL_INCOME[1]).toContain('100');
    expect(ANNUAL_INCOME[5]).toContain('1');
  });
});

describe('TOTAL_WEALTH_BAND map', () => {
  test('has 7 wealth bands', () => {
    expect(Object.keys(TOTAL_WEALTH_BAND)).toHaveLength(7);
    expect(TOTAL_WEALTH_BAND[1]).toContain('500');
    expect(TOTAL_WEALTH_BAND[7]).toContain('>50');
  });
});

describe('SANCTION_CHECK map', () => {
  test('has values 2 and 3 only', () => {
    expect(Object.keys(SANCTION_CHECK).sort()).toEqual(['2', '3']);
    expect(SANCTION_CHECK[3]).toBe('No hits');
  });
});

describe('REPUTATIONAL_RISK map', () => {
  test('has values 1, 2, 3', () => {
    expect(Object.keys(REPUTATIONAL_RISK).sort()).toEqual(['1', '2', '3']);
  });
});

describe('SOURCE_OF_WEALTH map (M5 prep)', () => {
  test('has 24 entries', () => {
    expect(Object.keys(SOURCE_OF_WEALTH)).toHaveLength(24);
    expect(SOURCE_OF_WEALTH[1]).toBe('Salaried Income');
    expect(SOURCE_OF_WEALTH[7]).toBe('Inheritance/Gift');
  });
});

describe('TRANSFER_TIMEFRAME map (M5 prep)', () => {
  test('has 3 timeframes', () => {
    expect(Object.keys(TRANSFER_TIMEFRAME)).toHaveLength(3);
    expect(TRANSFER_TIMEFRAME[1]).toContain('Initial');
    expect(TRANSFER_TIMEFRAME[3]).toContain('Recurring');
  });
});
