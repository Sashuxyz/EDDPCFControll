// NpOnboardingChecklist/components/SectionCard.tsx
import * as React from 'react';
import { SectionStatus } from '../types';

interface Props {
  title: string;
  status: SectionStatus;
  summaryText: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const chevronPath = 'M2 4.5l4 4 4-4';

export function SectionCard({ title, status, summaryText, defaultCollapsed = true, children }: Props): React.ReactElement {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const borderLeft =
    status === 'mismatch' ? '3px solid #c8c6c4' :
    status === 'blocked'  ? '3px solid #8a8886'  :
    status === 'done'     ? '3px solid #0078d4'   : undefined;

  const sumColor =
    status === 'done'     ? '#0078d4' :
    status === 'blocked'  ? '#323130' :
    status === 'mismatch' ? '#605e5c' : '#605e5c';

  const sectionStyle: React.CSSProperties = {
    margin: '10px 12px',
    background: '#fff',
    border: '1px solid #edebe9',
    borderLeft: borderLeft || '1px solid #edebe9',
    borderRadius: 2,
  };

  const hdrStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 12px',
    background: '#f3f2f1',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: collapsed ? 'none' : '1px solid #edebe9',
    borderRadius: collapsed ? 2 : '2px 2px 0 0',
  };

  return (
    <div style={sectionStyle}>
      <div style={hdrStyle} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#201f1e' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: sumColor, fontWeight: status !== 'normal' ? 600 : 400 }}>
            {summaryText}
          </span>
          <svg
            width={12} height={12} viewBox="0 0 12 12" fill="none"
            style={{ flexShrink: 0, transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.18s ease' }}
          >
            <path d={chevronPath} stroke="#605e5c" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
