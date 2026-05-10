import { isInvalidPropertyError, extractUndeclaredProperty } from '../utils/dataverse';

describe('isInvalidPropertyError', () => {
  test.each([
    ['Invalid property name',                                         true],
    ['The property "syg_xxx" does not exist on type',                 true],
    ['Resource not found for the segment',                            true],
    ['400 Bad Request',                                               false],
    ['Permission denied',                                             false],
    ['',                                                              false],
  ])('isInvalidPropertyError(%j) === %s', (msg, expected) => {
    expect(isInvalidPropertyError(msg)).toBe(expected);
  });
});

describe('extractUndeclaredProperty', () => {
  test('extracts property name from real Dataverse undeclared-property error', () => {
    const msg = "An undeclared property 'syg_yearofwealthgenerationid' which only has property annotations in the payload but no property value was found in the payload.";
    expect(extractUndeclaredProperty(msg)).toBe('syg_yearofwealthgenerationid');
  });

  test('handles double-quoted property name', () => {
    const msg = 'An undeclared property "syg_acquiringyear" which only has property annotations';
    expect(extractUndeclaredProperty(msg)).toBe('syg_acquiringyear');
  });

  test('handles "does not exist" variant', () => {
    const msg = "The property 'syg_foo' does not exist on type 'Microsoft.Dynamics.CRM.syg_bar'";
    expect(extractUndeclaredProperty(msg)).toBe('syg_foo');
  });

  test('returns null when no undeclared property is mentioned', () => {
    expect(extractUndeclaredProperty('Generic 500 error')).toBeNull();
    expect(extractUndeclaredProperty('Permission denied')).toBeNull();
    expect(extractUndeclaredProperty('')).toBeNull();
  });
});
