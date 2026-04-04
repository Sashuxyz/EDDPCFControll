type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;
type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

export interface ClassifiedColumns {
  gridColumns: Column[];
  detailColumns: Column[];
}

const EXCLUDED_COLUMNS = new Set(['statecode']);

export function classifyColumns(
  dataset: ComponentFramework.PropertyTypes.DataSet,
  conditionalFieldsOverride?: string
): ClassifiedColumns {
  const columns = dataset.columns.filter(
    (col) => !EXCLUDED_COLUMNS.has(col.name) && col.displayName
  );

  const overrideSet = new Set<string>();
  if (conditionalFieldsOverride) {
    conditionalFieldsOverride
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((name) => overrideSet.add(name));
  }

  const recordIds = dataset.sortedRecordIds;
  const totalRecords = recordIds.length;

  const nonEmptyCount: Record<string, number> = {};
  for (const col of columns) {
    nonEmptyCount[col.name] = 0;
  }

  for (const id of recordIds) {
    const record = dataset.records[id];
    for (const col of columns) {
      const value = record.getValue(col.name);
      const formatted = record.getFormattedValue(col.name);
      if (value != null && String(value) !== '' && formatted !== '') {
        nonEmptyCount[col.name]++;
      }
    }
  }

  const gridColumns: Column[] = [];
  const detailColumns: Column[] = [];
  const primaryColumn = columns.find((col) => col.isPrimary) ?? columns[0];

  for (const col of columns) {
    if (overrideSet.has(col.name)) {
      detailColumns.push(col);
      continue;
    }
    if (primaryColumn && col.name === primaryColumn.name) {
      gridColumns.push(col);
      continue;
    }
    if (totalRecords > 0 && nonEmptyCount[col.name] / totalRecords < 0.5) {
      detailColumns.push(col);
    } else {
      gridColumns.push(col);
    }
  }

  return { gridColumns, detailColumns };
}

export function rowHasDetailData(
  record: EntityRecord,
  detailColumns: Column[]
): boolean {
  for (const col of detailColumns) {
    const value = record.getValue(col.name);
    const formatted = record.getFormattedValue(col.name);
    if (value != null && String(value) !== '' && formatted !== '') {
      return true;
    }
  }
  return false;
}
