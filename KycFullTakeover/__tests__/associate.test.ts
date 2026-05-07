import { isDuplicateKeyError } from '../utils/dataverse';

describe('isDuplicateKeyError', () => {
  test.each([
    ['Cannot insert duplicate key',                                        true],
    ['A record with these values already exists.',                         true],
    ['DuplicateRecord: an associated record already exists',               true],
    ['HTTP 400: duplicate-detected',                                       true],
    ['Resource not found for the segment',                                 false],
    ['Permission denied',                                                  false],
    ['Generic 500 error',                                                  false],
    ['',                                                                   false],
  ])('isDuplicateKeyError(%j) === %s', (msg, expected) => {
    expect(isDuplicateKeyError(msg)).toBe(expected);
  });
});
