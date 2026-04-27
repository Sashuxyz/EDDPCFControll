import { DetectedMatch } from '../types';
import { isValidHttpUrl, isValidMailto } from './urlValidation';

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const WWW_RE = /\bwww\.[^\s<>"']+/g;
const EMAIL_RE = /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g;
const TRAILING_PUNCT = /[.,;:!?\)\]\}>]+$/;

function trimTrailingPunctuation(url: string): string {
  let result = url;
  while (TRAILING_PUNCT.test(result)) { result = result.replace(TRAILING_PUNCT, ''); }
  return result;
}

function balanceParens(url: string): string {
  if (!url.endsWith(')')) return url;
  const opens = (url.match(/\(/g) || []).length;
  const closes = (url.match(/\)/g) || []).length;
  if (closes > opens) return url.slice(0, -1);
  return url;
}

export function detectUrls(text: string): DetectedMatch[] {
  const matches: DetectedMatch[] = [];

  // Match explicit http/https URLs
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    let candidate = m[0];
    candidate = trimTrailingPunctuation(candidate);
    candidate = balanceParens(candidate);
    if (!isValidHttpUrl(candidate)) continue;
    matches.push({ start: m.index, end: m.index + candidate.length, text: candidate, href: candidate, linkType: 'url', priority: 1 });
  }

  // Match www. URLs without protocol — prepend https://
  WWW_RE.lastIndex = 0;
  while ((m = WWW_RE.exec(text)) !== null) {
    let candidate = m[0];
    candidate = trimTrailingPunctuation(candidate);
    candidate = balanceParens(candidate);
    const href = `https://${candidate}`;
    if (!isValidHttpUrl(href)) continue;
    // Skip if this range is already covered by an explicit http/https match
    const start = m.index;
    const end = m.index + candidate.length;
    if (matches.some((prev) => prev.start <= start && prev.end >= end)) continue;
    matches.push({ start, end, text: candidate, href, linkType: 'url', priority: 1 });
  }

  return matches;
}

export function detectEmails(text: string): DetectedMatch[] {
  const matches: DetectedMatch[] = [];
  EMAIL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMAIL_RE.exec(text)) !== null) {
    const candidate = m[0];
    if (!isValidMailto(candidate)) continue;
    matches.push({ start: m.index, end: m.index + candidate.length, text: candidate, href: `mailto:${candidate}`, linkType: 'email', priority: 0 });
  }
  return matches;
}
