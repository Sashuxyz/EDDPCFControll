import DOMPurify from 'dompurify';
import { Token } from '../types';
import { escapeHtml } from './escapeHtml';

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['a'],
  ALLOWED_ATTR: ['href', 'data-link-type', 'tabindex', 'aria-label'],
};

export function renderTokensToHtml(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === 'text') {
      parts.push(escapeHtml(token.text));
    } else {
      const escapedText = escapeHtml(token.text);
      const escapedHref = escapeHtml(token.href);
      const ariaLabel = token.linkType === 'email'
        ? `Email: ${escapedText}. Hold Ctrl or Cmd and click, or press Alt+Enter, to open.`
        : `Link: ${escapedHref}. Hold Ctrl or Cmd and click, or press Alt+Enter, to open.`;
      parts.push(
        `<a href="${escapedHref}" data-link-type="${token.linkType}" tabindex="0" aria-label="${escapeHtml(ariaLabel)}">${escapedText}</a>`
      );
    }
  }
  const raw = parts.join('');
  return DOMPurify.sanitize(raw, PURIFY_CONFIG);
}
