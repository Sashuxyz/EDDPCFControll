import * as React from 'react';
import { GridIcon, LockIcon, SpinnerIcon, injectSpinnerStyle } from './SvgIcons';
import { emptyStyles } from '../styles/tokens';

interface EmptyStateProps {
  type: 'empty' | 'loading' | 'error';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type }) => {
  React.useEffect(() => {
    if (type === 'loading') {
      injectSpinnerStyle();
    }
  }, [type]);

  if (type === 'loading') {
    return (
      <div style={emptyStyles.loadingRow}>
        <SpinnerIcon />
        <span style={emptyStyles.loadingText}>Loading records...</span>
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div style={emptyStyles.root}>
        <LockIcon style={emptyStyles.icon} />
        <div style={emptyStyles.title}>You don't have permission to view these records</div>
        <div style={emptyStyles.subtitle}>Contact your administrator if you need access</div>
      </div>
    );
  }

  return (
    <div style={emptyStyles.root}>
      <GridIcon style={emptyStyles.icon} />
      <div style={emptyStyles.title}>No records found</div>
      <div style={emptyStyles.subtitle}>Create a new record using the + New button above</div>
    </div>
  );
};
