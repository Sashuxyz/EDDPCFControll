const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(s: unknown): boolean {
  return typeof s === 'string' && GUID_REGEX.test(s);
}

export function cleanGuid(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[{}]/g, '').toLowerCase();
}
