import { Token, DetectedMatch } from '../types';
import { detectUrls, detectEmails } from './linkDetectors';

export interface TokenizerOptions {
  detectUrls: boolean;
  detectEmail: boolean;
}

export function tokenize(text: string, options: TokenizerOptions): Token[] {
  if (!text) return [];
  const allMatches: DetectedMatch[] = [];
  if (options.detectEmail) allMatches.push(...detectEmails(text));
  if (options.detectUrls) allMatches.push(...detectUrls(text));
  if (allMatches.length === 0) return [{ kind: 'text', text }];

  allMatches.sort((a, b) => a.start - b.start || a.priority - b.priority);
  const accepted: DetectedMatch[] = [];
  let lastEnd = 0;
  for (const match of allMatches) {
    if (match.start < lastEnd) continue;
    accepted.push(match);
    lastEnd = match.end;
  }

  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) tokens.push({ kind: 'text', text: text.slice(cursor, match.start) });
    tokens.push({ kind: 'link', text: match.text, href: match.href, linkType: match.linkType });
    cursor = match.end;
  }
  if (cursor < text.length) tokens.push({ kind: 'text', text: text.slice(cursor) });
  return tokens;
}
