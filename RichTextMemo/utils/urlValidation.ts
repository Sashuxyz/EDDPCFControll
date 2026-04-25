const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_MAILTO = 'mailto:';

export function isValidHttpUrl(candidate: string): boolean {
  try { const url = new URL(candidate); return ALLOWED_PROTOCOLS.has(url.protocol); }
  catch { return false; }
}

export function isValidMailto(email: string): boolean {
  try { const url = new URL(ALLOWED_MAILTO + email); return url.protocol === ALLOWED_MAILTO; }
  catch { return false; }
}

export function isSafeHref(href: string): boolean {
  try { const url = new URL(href); return ALLOWED_PROTOCOLS.has(url.protocol) || url.protocol === ALLOWED_MAILTO; }
  catch { return false; }
}
