import { isInvalidPropertyError } from '../utils/dataverse';

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
