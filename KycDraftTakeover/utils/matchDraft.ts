/**
 * Normalize text for fuzzy matching: lowercase, collapse whitespace,
 * strip leading/trailing whitespace. Used to compare AI draft content
 * against current field content to detect "already taken over" sections.
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Detect if a target field's current value represents a previously
 * taken-over version of the AI draft. Uses a loose match: if the
 * normalized first 200 characters of the draft appear in the normalized
 * current value, we consider it "taken over". This tolerates:
 *  - Whitespace / case differences
 *  - Minor RM edits at the end of the content
 *  - Additional content added after the AI draft
 *
 * It correctly rejects:
 *  - Empty fields
 *  - Completely unrelated content
 *  - Heavily rewritten content (less than first 200 chars intact)
 */
export function isAlreadyTakenOver(
  draftText: string | null,
  currentValue: string | null
): boolean {
  if (!draftText || !currentValue) return false;

  const normalizedDraft = normalize(draftText);
  const normalizedCurrent = normalize(currentValue);

  if (normalizedDraft.length === 0 || normalizedCurrent.length === 0) return false;

  // For very short drafts, require full match to avoid false positives
  if (normalizedDraft.length < 50) {
    return normalizedCurrent.includes(normalizedDraft);
  }

  // For longer drafts, match on first 200 characters (or full length if shorter)
  const matchLength = Math.min(200, normalizedDraft.length);
  const prefix = normalizedDraft.slice(0, matchLength);
  return normalizedCurrent.includes(prefix);
}
