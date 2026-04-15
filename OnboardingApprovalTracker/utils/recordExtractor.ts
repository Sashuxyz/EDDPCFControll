import { ExtractedRecord } from '../types';

type DSRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

function extractOptionSetValue(record: DSRecord, columnName: string): number | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'Value' in (raw as unknown as Record<string, unknown>)) {
    return (raw as unknown as { Value: number }).Value;
  }
  const parsed = parseInt(String(raw), 10);
  return isNaN(parsed) ? null : parsed;
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

function extractDate(record: DSRecord, columnName: string): Date | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw as string | number);
  return isNaN(d.getTime()) ? null : d;
}

export function extractRecord(record: DSRecord, recordId: string): ExtractedRecord {
  const previousAssigneeRaw = record.getValue('previousAssignee');
  const approverName = record.getFormattedValue('previousAssignee') || null;
  const approverId = extractLookupId(previousAssigneeRaw);

  return {
    recordId,
    transitionType: extractOptionSetValue(record, 'transitionType'),
    currentStatus: extractOptionSetValue(record, 'currentStatus'),
    approverName,
    approverId,
    occurredOn: extractDate(record, 'datetimeFrom'),
  };
}

export function extractAllRecords(dataset: ComponentFramework.PropertyTypes.DataSet): ExtractedRecord[] {
  const records: ExtractedRecord[] = [];
  for (const id of dataset.sortedRecordIds) {
    const rec = dataset.records[id];
    if (!rec) continue;
    records.push(extractRecord(rec, id));
  }
  return records;
}
