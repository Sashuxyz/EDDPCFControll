import * as React from 'react';
import { getCellValue } from '../utils/cellRenderer';
import { navigateToRecord } from '../utils/navigationHelpers';
import { DetailPanel } from './DetailPanel';
import { rowStyles } from '../styles/tokens';

type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;
type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

interface GridRowProps {
  record: EntityRecord;
  recordId: string;
  gridColumns: Column[];
  detailColumns: Column[];
  gridTemplateColumns: string;
  isExpanded: boolean;
  isSelected: boolean;
  hasDetail: boolean;
  primaryColumnName: string;
  entityName: string;
  context: ComponentFramework.Context<unknown>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onNavigate: (entityName: string, entityId: string) => void;
}

export const GridRow: React.FC<GridRowProps> = ({
  record,
  recordId,
  gridColumns,
  detailColumns,
  gridTemplateColumns,
  isExpanded,
  isSelected,
  hasDetail,
  primaryColumnName,
  entityName,
  context,
  onToggleExpand,
  onToggleSelect,
  onNavigate,
}) => {
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = React.useState(false);

  const handleClick = React.useCallback(() => {
    if (clickTimerRef.current) return;
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (hasDetail) {
        onToggleExpand(recordId);
      }
    }, 250);
  }, [hasDetail, onToggleExpand, recordId]);

  const handleDoubleClick = React.useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onNavigate(entityName, recordId);
  }, [entityName, onNavigate, recordId]);

  const handleCheckboxChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      onToggleSelect(recordId);
    },
    [onToggleSelect, recordId]
  );

  const handleNameClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNavigate(entityName, recordId);
    },
    [entityName, onNavigate, recordId]
  );

  let rowStyle: React.CSSProperties = { ...rowStyles.row, display: 'grid', gridTemplateColumns };
  if (isSelected) {
    rowStyle = { ...rowStyle, ...rowStyles.rowSelected };
  } else if (isExpanded) {
    rowStyle = { ...rowStyle, ...rowStyles.rowExpanded };
  } else if (hovered) {
    rowStyle = { ...rowStyle, ...rowStyles.rowHover };
  }

  const chevron = isExpanded ? '\u25BC' : hasDetail ? '\u25B6' : '';

  return (
    <div style={{ borderBottom: '1px solid #edebe9' }}>
      <div
        style={rowStyle}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={rowStyles.checkboxCell} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            style={{ margin: 0, cursor: 'pointer', accentColor: '#0078D4' }}
          />
        </div>
        <div style={rowStyles.chevronCell}>{chevron}</div>
        {gridColumns.map((col) => {
          const cell = getCellValue(record, col);
          const isPrimary = col.name === primaryColumnName;

          if (isPrimary) {
            return (
              <div key={col.name} style={rowStyles.cell} title={cell.text}>
                <button style={rowStyles.nameLink} type="button" onClick={handleNameClick}>
                  {cell.text || 'Untitled'}
                </button>
              </div>
            );
          }

          if (cell.isLookup && cell.lookupEntityName && cell.lookupEntityId) {
            return (
              <div key={col.name} style={rowStyles.cell} title={cell.text}>
                <button
                  style={rowStyles.nameLink}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToRecord(context, cell.lookupEntityName!, cell.lookupEntityId!);
                  }}
                >
                  {cell.text}
                </button>
              </div>
            );
          }

          return (
            <div key={col.name} style={rowStyles.cell} title={cell.text}>
              {cell.text}
            </div>
          );
        })}
      </div>

      {isExpanded && hasDetail && (
        <DetailPanel record={record} detailColumns={detailColumns} context={context} />
      )}
    </div>
  );
};
