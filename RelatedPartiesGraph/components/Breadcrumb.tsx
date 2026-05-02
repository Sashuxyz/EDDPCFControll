import * as React from 'react';
import { ProfileBreadcrumb } from '../types';
import { breadcrumbStyles } from '../styles/tokens';

interface BreadcrumbProps {
  chain: ProfileBreadcrumb[];
  onNavigate: (index: number) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ chain, onNavigate }) => (
  <div style={breadcrumbStyles.bar}>
    {chain.map((item, idx) => {
      const isLast = idx === chain.length - 1;
      return (
        <React.Fragment key={item.id}>
          {idx > 0 && <span style={breadcrumbStyles.separator}>{'>'}</span>}
          {isLast ? (
            <span style={breadcrumbStyles.segmentCurrent}>{item.name}</span>
          ) : (
            <button
              style={breadcrumbStyles.segment}
              onClick={() => onNavigate(idx)}
              type="button"
            >
              {item.name}
            </button>
          )}
        </React.Fragment>
      );
    })}
  </div>
);
