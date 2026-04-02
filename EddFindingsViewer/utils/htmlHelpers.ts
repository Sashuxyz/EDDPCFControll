import DOMPurify from 'dompurify';

/**
 * Strip HTML tags to produce plain text for the collapsed card preview.
 * Uses DOM-based approach — never regex (malformed tags bypass naive patterns).
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.trim() ?? '';
  } catch {
    // Fallback if DOMParser unavailable: sanitize first, then extract text
    try {
      const el = document.createElement('div');
      // Safe: content is sanitized via DOMPurify before assignment
      el.innerHTML = DOMPurify.sanitize(html); // eslint-disable-line
      return el.textContent?.trim() ?? '';
    } catch {
      return html;
    }
  }
}

/**
 * Sanitize HTML for rendering in the expanded card.
 * See spec security decisions for rationale on each allowlist choice.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  try {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div', 'blockquote', 'pre', 'code',
      ],
      ALLOWED_ATTR: [
        'src', 'alt', 'title', 'class',
        'colspan', 'rowspan', 'width', 'height',
      ],
      ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/)/i,
      ALLOW_DATA_ATTR: false,
    });
  } catch {
    // DOMPurify failure — fall back to plain text
    return stripHtml(html);
  }
}
