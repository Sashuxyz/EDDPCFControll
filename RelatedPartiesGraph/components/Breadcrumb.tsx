import * as React from 'react';
import { breadcrumbStyles } from '../styles/tokens';

interface GraphHeaderProps {
  centreName: string;
  hasExpansions: boolean;
  onReset: () => void;
}

export const Breadcrumb: React.FC<GraphHeaderProps> = ({ centreName, hasExpansions, onReset }) => (
  <div style={breadcrumbStyles.bar}>
    <span style={breadcrumbStyles.segmentCurrent}>{centreName}</span>
    {hasExpansions && (
      <button
        style={breadcrumbStyles.resetButton}
        onClick={onReset}
        type="button"
      >
        Reset view
      </button>
    )}
  </div>
);
