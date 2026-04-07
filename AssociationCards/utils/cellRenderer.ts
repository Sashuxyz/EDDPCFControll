type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;

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

export function getCellValue(record: EntityRecord, column: Column): string {
  const formatted = record.getFormattedValue(column.name);
  const raw = record.getValue(column.name);

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
  return text;
}
