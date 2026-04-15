import * as React from 'react';
import { emptyStateStyles, containerStyles } from '../styles/tokens';

interface EmptyStateProps {
  message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div style={containerStyles.root}>
    <div style={emptyStateStyles.root}>{message}</div>
  </div>
);
