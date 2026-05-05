import { isValidGuid, cleanGuid } from '../utils/guidValidation';

describe('isValidGuid', () => {
  test.each([
    ['11111111-2222-4333-8444-555555555555', true],
    ['11111111-2222-4333-A444-555555555555', true],
    ['{11111111-2222-4333-8444-555555555555}', false],   // braces not allowed
    ['11111111222243338444555555555555', false],          // dashes required
    ['', false],
    ['not-a-guid', false],
    [null as unknown as string, false],
    [undefined as unknown as string, false],
  ])('isValidGuid(%j) === %s', (input, expected) => {
    expect(isValidGuid(input)).toBe(expected);
  });
});

describe('cleanGuid', () => {
  test('strips braces', () => {
    expect(cleanGuid('{11111111-2222-4333-8444-555555555555}')).toBe('11111111-2222-4333-8444-555555555555');
  });
  test('lowercases hex', () => {
    expect(cleanGuid('11111111-2222-4333-A444-555555555555')).toBe('11111111-2222-4333-a444-555555555555');
  });
  test('returns empty string for null/undefined', () => {
    expect(cleanGuid(null)).toBe('');
    expect(cleanGuid(undefined)).toBe('');
  });
});
