import * as React from 'react';
import { barStyles } from '../styles/tokens';

interface CardBarProps {
  title: string;
  count: number;
  isLoading: boolean;
  onAddClick: () => void;
}

export const CardBar: React.FC<CardBarProps> = ({ title, count, isLoading, onAddClick }) => {
  if (isLoading) {
    return (
      <>
        <div style={barStyles.root}>
          <div style={barStyles.left}>
            <span style={barStyles.title}>{title}</span>
          </div>
        </div>
        <div style={barStyles.loadingText}>Loading...</div>
      </>
    );
  }

  const rootStyle = count === 0 ? barStyles.rootEmpty : barStyles.root;

  return (
    <div style={rootStyle}>
      <div style={barStyles.left}>
        <span style={barStyles.title}>{title}</span>
        <span style={barStyles.countBadge}>{count}</span>
      </div>
      <button style={barStyles.addButton} type="button" onClick={onAddClick}>
        + Add
      </button>
    </div>
  );
};
