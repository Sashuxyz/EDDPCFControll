import * as React from 'react';
import { headerStyles } from '../styles/tokens';

interface HeaderBarProps {
  count: number;
  onNewClick: () => void;
}

const addButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  fontSize: '12px',
  fontFamily: 'inherit',
  color: '#323130',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '2px',
  cursor: 'pointer',
};

export const HeaderBar: React.FC<HeaderBarProps> = ({ count, onNewClick }) => {
  return (
    <div style={headerStyles.root}>
      <div style={headerStyles.left}>
        <span style={headerStyles.title}>EDD Findings</span>
        <span style={headerStyles.countBadge}>{count}</span>
      </div>
      <button
        style={addButtonStyle}
        onClick={onNewClick}
        type="button"
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F2F1';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
        New Finding
      </button>
    </div>
  );
};
