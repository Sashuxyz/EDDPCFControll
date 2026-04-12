import * as React from 'react';
import { icons } from '../types';
import { emptyStyles } from '../styles/tokens';

interface EmptyStateProps {
  type: 'empty' | 'error';
  rawPreview?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ type, rawPreview }) => {
  if (type === 'error') {
    return (
      <div style={emptyStyles.root}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={emptyStyles.icon}>
          <path d={icons.warning} />
        </svg>
        <div style={emptyStyles.title}>Unable to parse agent output</div>
        {rawPreview && (
          <div style={emptyStyles.codeBlock}>{rawPreview}</div>
        )}
      </div>
    );
  }

  return (
    <div style={emptyStyles.root}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={emptyStyles.icon}>
        <path d={icons.grid} />
      </svg>
      <div style={emptyStyles.title}>No agent output available</div>
      <div style={emptyStyles.subtitle}>Run the KYC research agent to generate a draft.</div>
    </div>
  );
};
