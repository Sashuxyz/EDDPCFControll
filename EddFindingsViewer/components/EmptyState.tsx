import * as React from 'react';
import { emptyStyles } from '../styles/tokens';

export const EmptyState: React.FC = () => {
  return (
    <div style={emptyStyles.root}>
      <div style={emptyStyles.icon} aria-hidden="true">
        &#128269;
      </div>
      <div style={emptyStyles.text}>No EDD findings recorded.</div>
    </div>
  );
};
