type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;

export interface CellValue {
  text: string;
  isLookup: boolean;
  lookupEntityName?: string;
  lookupEntityId?: string;
}

function extractLookupId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null) {
    const lookup = raw as ComponentFramework.LookupValue;
    if (lookup.id) {
      if (typeof lookup.id === 'string') return lookup.id.replace(/[{}]/g, '');
      const nested = lookup.id as unknown as { guid?: string };
      if (nested.guid) return nested.guid.replace(/[{}]/g, '');
    }
  }
  const str = String(raw);
  if (str && str !== 'null' && str !== 'undefined' && str !== '[object Object]') {
    return str.replace(/[{}]/g, '');
  }
  return null;
}

function extractLookupEntityName(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'object') return null;
  const lookup = raw as ComponentFramework.LookupValue & { etn?: string };
  return lookup.etn ?? lookup.entityType ?? null;
}

function stripHtml(html: string): string {
  if (!html || !html.includes('<')) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent ?? '';
  } catch {
    return html.replace(/<[^>]*>/g, '');
  }
}

export function getCellValue(record: EntityRecord, column: Column): CellValue {
  const formatted = record.getFormattedValue(column.name);
  const raw = record.getValue(column.name);

  if (column.dataType === 'Lookup.Simple') {
    const displayName = formatted || '';
    const lookupId = extractLookupId(raw);
    const entityName = extractLookupEntityName(raw);
    return {
      text: displayName,
      isLookup: !!lookupId,
      lookupEntityName: entityName ?? undefined,
      lookupEntityId: lookupId ?? undefined,
    };
  }

  let text = formatted || '';
  if (!text && raw != null) {
    text = String(raw);
  }
  if (text.includes('<')) {
    text = stripHtml(text);
  }
  if (text === 'null' || text === 'undefined' || text === '[object Object]') {
    text = '';
  }

  return { text, isLookup: false };
}
