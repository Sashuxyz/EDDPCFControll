import * as React from 'react';
import { emptyStyles } from '../styles/tokens';

const GridIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const LockIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill="#A19F9D" />
  </svg>
);

interface EmptyStateProps {
  type?: 'empty' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type = 'empty' }) => {
  if (type === 'error') {
    return (
      <div style={emptyStyles.root}>
        <LockIcon style={emptyStyles.icon} />
        <div style={emptyStyles.text}>You don't have permission to view these records</div>
      </div>
    );
  }

  return (
    <div style={emptyStyles.root}>
      <GridIcon style={emptyStyles.icon} />
      <div style={emptyStyles.text}>No EDD findings recorded.</div>
    </div>
  );
};
