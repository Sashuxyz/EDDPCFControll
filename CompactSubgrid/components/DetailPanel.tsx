import * as React from 'react';
import { getCellValue } from '../utils/cellRenderer';
import { navigateToRecord } from '../utils/navigationHelpers';
import { detailStyles } from '../styles/tokens';

type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;
type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

interface DetailPanelProps {
  record: EntityRecord;
  detailColumns: Column[];
  context: ComponentFramework.Context<unknown>;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  record,
  detailColumns,
  context,
}) => {
  const fields = detailColumns
    .map((col) => {
      const cell = getCellValue(record, col);
      if (!cell.text) return null;
      return { column: col, cell };
    })
    .filter(Boolean) as { column: Column; cell: ReturnType<typeof getCellValue> }[];

  if (fields.length === 0) return null;

  return (
    <div style={detailStyles.panel}>
      <div style={detailStyles.fieldRow}>
        {fields.map(({ column, cell }) => (
          <span key={column.name}>
            <strong style={detailStyles.label}>{column.displayName}:</strong>{' '}
            {cell.isLookup && cell.lookupEntityName && cell.lookupEntityId ? (
              <button
                style={detailStyles.link}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToRecord(context, cell.lookupEntityName!, cell.lookupEntityId!);
                }}
              >
                {cell.text}
              </button>
            ) : (
              cell.text
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
