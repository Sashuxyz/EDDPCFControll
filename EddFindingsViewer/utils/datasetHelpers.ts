export interface FindingRecord {
  id: string;
  name: string;
  categoryValue: number | null;
  categoryLabel: string;
  riskSeverityValue: number | null;
  riskSeverityLabel: string;
  rawDescription: string;
  rawMitigationSummary: string;
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
  if (typeof raw === 'object' && raw !== null && 'Value' in (raw as unknown as Record<string, unknown>)) {
    return (raw as unknown as Record<string, unknown>).Value as number;
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
    if (lookup.id) {
      // D365 sometimes returns id as {guid: "..."} instead of a plain string
      if (typeof lookup.id === 'string') return lookup.id;
      const nested = lookup.id as unknown as { guid?: string };
      if (nested.guid) return nested.guid;
    }
  }
  const str = String(raw);
  return str && str !== 'null' && str !== 'undefined' && str !== '[object Object]' ? str : null;
}

export function extractRecords(
  dataset: ComponentFramework.PropertyTypes.DataSet
): FindingRecord[] {
  const records: FindingRecord[] = [];

  for (const recordId of dataset.sortedRecordIds) {
    const record = dataset.records[recordId];

    const linkedConditionFormatted = record.getFormattedValue('syg_complianceconditionid');
    const linkedConditionId = getLookupId(record, 'syg_complianceconditionid');

    records.push({
      id: recordId,
      name: record.getFormattedValue('syg_name') || String(record.getValue('syg_name') ?? ''),
      categoryValue: getOptionSetValue(record, 'syg_category'),
      categoryLabel: record.getFormattedValue('syg_category') || '',
      riskSeverityValue: getOptionSetValue(record, 'syg_riskseverity'),
      riskSeverityLabel: record.getFormattedValue('syg_riskseverity') || '',
      rawDescription: String(record.getValue('syg_description') ?? ''),
      rawMitigationSummary: String(record.getValue('syg_mitigationsummary') ?? ''),
      statusValue: getOptionSetValue(record, 'statuscode'),
      statusLabel: record.getFormattedValue('statuscode') || '',
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
