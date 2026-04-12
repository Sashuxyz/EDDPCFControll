export interface ParseResult {
  success: boolean;
  sections: Record<string, unknown>;
  error?: 'empty' | 'parse';
  rawPreview?: string;
}

export function parseAgentOutput(raw: string | null | undefined): ParseResult {
  if (!raw || raw.trim() === '') {
    return { success: false, sections: {}, error: 'empty' };
  }

  try {
    const parsed = JSON.parse(raw);

    // Format 1: Plain object (most common)
    // { "professionalBackground": { ... }, "financialSituation": { ... }, ... }
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return { success: true, sections: parsed as Record<string, unknown> };
    }

    // Format 2: Array with object element
    // [{ "professionalBackground": { ... }, ... }]
    if (Array.isArray(parsed) && parsed.length > 0) {
      const inner = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
      if (typeof inner === 'object' && inner !== null) {
        return { success: true, sections: inner as Record<string, unknown> };
      }
    }

    return { success: false, sections: {}, error: 'parse', rawPreview: raw.slice(0, 200) };
  } catch {
    return { success: false, sections: {}, error: 'parse', rawPreview: raw.slice(0, 200) };
  }
}

export function extractSectionText(
  sections: Record<string, unknown>,
  jsonKey: string,
  summaryKey: string | null
): string | null {
  const section = sections[jsonKey];
  if (section == null) return null;

  if (summaryKey === null) {
    return typeof section === 'string' ? section : null;
  }

  if (typeof section === 'object' && section !== null) {
    const obj = section as Record<string, unknown>;
    const val = obj[summaryKey];
    return typeof val === 'string' ? val : null;
  }

  return null;
}

export function extractSubFieldValue(
  sections: Record<string, unknown>,
  sectionKey: string,
  subFieldKey: string
): string | null {
  const section = sections[sectionKey];
  if (typeof section !== 'object' || section === null) return null;
  const obj = section as Record<string, unknown>;
  const val = obj[subFieldKey];
  if (val == null) return null;
  return String(val);
}
