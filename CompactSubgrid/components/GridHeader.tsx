import * as React from 'react';
import { headerStyles } from '../styles/tokens';

type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;

interface GridHeaderProps {
  gridColumns: Column[];
  gridTemplateColumns: string;
  sortColumn: string | null;
  sortDirection: 0 | 1 | null;
  allSelected: boolean;
  onSort: (columnName: string) => void;
  onSelectAll: () => void;
  onResize: (columnName: string, newWidthPx: number) => void;
  getColumnWidthPx: (columnName: string) => number;
}

const resizeHandleStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: '6px',
  height: '100%',
  cursor: 'col-resize',
  userSelect: 'none',
};

export const GridHeader: React.FC<GridHeaderProps> = ({
  gridColumns,
  gridTemplateColumns,
  sortColumn,
  sortDirection,
  allSelected,
  onSort,
  onSelectAll,
  onResize,
  getColumnWidthPx,
}) => {
  const resizeStateRef = React.useRef<{
    columnName: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeMouseDown = React.useCallback(
    (e: React.MouseEvent, columnName: string) => {
      e.preventDefault();
      e.stopPropagation();
      resizeStateRef.current = {
        columnName,
        startX: e.clientX,
        startWidth: getColumnWidthPx(columnName),
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const state = resizeStateRef.current;
        if (!state) return;
        const delta = moveEvent.clientX - state.startX;
        const newWidth = Math.max(40, state.startWidth + delta);
        onResize(state.columnName, newWidth);
      };

      const handleMouseUp = () => {
        resizeStateRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [onResize, getColumnWidthPx]
  );

  return (
    <div style={{ ...headerStyles.row, display: 'grid', gridTemplateColumns }}>
      <div style={headerStyles.checkboxCell}>
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          style={{ margin: 0, cursor: 'pointer', accentColor: '#0078D4' }}
        />
      </div>
      <div style={headerStyles.chevronCell} />
      {gridColumns.map((col) => {
        const isActive = sortColumn === col.name;
        const arrow = isActive
          ? sortDirection === 0
            ? ' \u25B2'
            : ' \u25BC'
          : '';
        const cellStyle: React.CSSProperties = {
          ...(isActive ? headerStyles.cellActive : headerStyles.cell),
          position: 'relative',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        };
        return (
          <div key={col.name} style={cellStyle} onClick={() => onSort(col.name)} title={col.displayName}>
            {col.displayName}{arrow}
            <div
              style={resizeHandleStyle}
              onMouseDown={(e) => handleResizeMouseDown(e, col.name)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </div>
  );
};
