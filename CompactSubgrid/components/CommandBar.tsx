import * as React from 'react';
import { TrashIcon, RemoveIcon } from './SvgIcons';
import { commandBarStyles } from '../styles/tokens';

interface CommandBarProps {
  title: string;
  recordCount: number;
  selectedCount: number;
  hasExpandableRows: boolean;
  allExpanded: boolean;
  isNtoN: boolean;
  onExpandAll: () => void;
  onNewClick: () => void;
  onAddExistingClick: () => void;
  onDeleteClick: () => void;
  onClearSelection: () => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  title,
  recordCount,
  selectedCount,
  hasExpandableRows,
  allExpanded,
  isNtoN,
  onExpandAll,
  onNewClick,
  onAddExistingClick,
  onDeleteClick,
  onClearSelection,
}) => {
  if (selectedCount > 0) {
    return (
      <div style={commandBarStyles.rootSelection}>
        <div style={commandBarStyles.left}>
          <span style={commandBarStyles.selectionCount}>
            {selectedCount} selected
          </span>
        </div>
        <div style={commandBarStyles.right}>
          {isNtoN ? (
            <button style={commandBarStyles.removeButton} type="button" onClick={onDeleteClick}>
              <RemoveIcon /> Remove
            </button>
          ) : (
            <button style={commandBarStyles.deleteButton} type="button" onClick={onDeleteClick}>
              <TrashIcon /> Delete
            </button>
          )}
          <span style={commandBarStyles.divider}>|</span>
          <button style={commandBarStyles.clearButton} type="button" onClick={onClearSelection}>
            Clear selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={commandBarStyles.root}>
      <div style={commandBarStyles.left}>
        <span style={commandBarStyles.title}>{title}</span>
        <span style={commandBarStyles.countBadge}>{recordCount}</span>
      </div>
      <div style={commandBarStyles.right}>
        {hasExpandableRows && recordCount > 0 && (
          <>
            <button style={commandBarStyles.button} type="button" onClick={onExpandAll}>
              {allExpanded ? 'Collapse All' : 'Expand All'}
            </button>
            <span style={commandBarStyles.divider}>|</span>
          </>
        )}
        {isNtoN ? (
          <button style={commandBarStyles.button} type="button" onClick={onAddExistingClick}>
            + Add existing
          </button>
        ) : (
          <button style={commandBarStyles.button} type="button" onClick={onNewClick}>
            + New
          </button>
        )}
      </div>
    </div>
  );
};
