import { formatSwissNumber, formatSwissDate, parseSwissNumber } from '../utils/formatters';

describe('formatSwissNumber', () => {
  test.each([
    [1000, "1'000"],
    [1000000, "1'000'000"],
    [12345.67, "12'345.67"],
    [0, '0'],
    [null, ''],
    [undefined, ''],
  ])('formatSwissNumber(%j) === %j', (input, expected) => {
    expect(formatSwissNumber(input as number)).toBe(expected);
  });
});

describe('parseSwissNumber', () => {
  test.each([
    ["1'000", 1000],
    ["12'345.67", 12345.67],
    ['1000000', 1000000],
    ['', null],
    ['abc', null],
  ])('parseSwissNumber(%j) === %j', (input, expected) => {
    expect(parseSwissNumber(input)).toBe(expected);
  });
});

describe('formatSwissDate', () => {
  test('formats ISO date as dd.MM.yyyy', () => {
    expect(formatSwissDate('1972-04-12')).toBe('12.04.1972');
  });
  test('handles ISO datetime', () => {
    expect(formatSwissDate('2026-05-05T10:32:11Z')).toBe('05.05.2026');
  });
  test('returns empty for invalid input', () => {
    expect(formatSwissDate('')).toBe('');
    expect(formatSwissDate(null as unknown as string)).toBe('');
    expect(formatSwissDate('not-a-date')).toBe('');
  });
});
