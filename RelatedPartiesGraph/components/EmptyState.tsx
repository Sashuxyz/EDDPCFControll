import * as React from 'react';
import { emptyStyles } from '../styles/tokens';

export const EmptyState: React.FC = () => (
  <div style={emptyStyles.root}>
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={emptyStyles.icon}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
    <div style={emptyStyles.text}>No active related parties for this KYC profile</div>
  </div>
);
