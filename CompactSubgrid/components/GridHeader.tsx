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
}

export const GridHeader: React.FC<GridHeaderProps> = ({
  gridColumns,
  gridTemplateColumns,
  sortColumn,
  sortDirection,
  allSelected,
  onSort,
  onSelectAll,
}) => {
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
        return (
          <div
            key={col.name}
            style={isActive ? headerStyles.cellActive : headerStyles.cell}
            onClick={() => onSort(col.name)}
          >
            {col.displayName}{arrow}
          </div>
        );
      })}
    </div>
  );
};
