export interface FindingRecord {
  id: string;
  name: string;
  categoryValue: number | null;
  categoryLabel: string;
  riskSeverityValue: number | null;
  riskSeverityLabel: string;
  rawDescription: string;
  statusValue: number | null;
  statusLabel: string;
  linkedConditionId: string | null;
  linkedConditionName: string | null;
  createdByName: string | null;
  createdOn: string;
  modifiedOn: string;
}

function getOptionSetValue(
  record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
  columnName: string
): number | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && raw !== null && 'Value' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).Value as number;
  }
  const parsed = parseInt(String(raw), 10);
  return isNaN(parsed) ? null : parsed;
}

function getLookupId(
  record: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord,
  columnName: string
): string | null {
  const raw = record.getValue(columnName);
  if (raw == null) return null;
  if (typeof raw === 'object' && raw !== null) {
    const lookup = raw as ComponentFramework.LookupValue;
    if (lookup.id) return lookup.id;
  }
  const str = String(raw);
  return str && str !== 'null' && str !== 'undefined' ? str : null;
}

export function extractRecords(
  dataset: ComponentFramework.PropertyTypes.DataSet
): FindingRecord[] {
  const records: FindingRecord[] = [];

  for (const recordId of dataset.sortedRecordIds) {
    const record = dataset.records[recordId];

    const linkedConditionFormatted = record.getFormattedValue('syg_linkedcondition');
    const linkedConditionId = getLookupId(record, 'syg_linkedcondition');

    records.push({
      id: recordId,
      name: record.getFormattedValue('syg_name') || String(record.getValue('syg_name') ?? ''),
      categoryValue: getOptionSetValue(record, 'syg_category'),
      categoryLabel: record.getFormattedValue('syg_category') || '',
      riskSeverityValue: getOptionSetValue(record, 'syg_riskseverity'),
      riskSeverityLabel: record.getFormattedValue('syg_riskseverity') || '',
      rawDescription: String(record.getValue('syg_description') ?? ''),
      statusValue: getOptionSetValue(record, 'syg_status'),
      statusLabel: record.getFormattedValue('syg_status') || '',
      linkedConditionId,
      linkedConditionName:
        linkedConditionFormatted && linkedConditionFormatted !== linkedConditionId
          ? linkedConditionFormatted
          : null,
      createdByName: record.getFormattedValue('createdby') || null,
      createdOn: record.getFormattedValue('createdon') || '',
      modifiedOn: record.getFormattedValue('modifiedon') || '',
    });
  }

  return records;
}
