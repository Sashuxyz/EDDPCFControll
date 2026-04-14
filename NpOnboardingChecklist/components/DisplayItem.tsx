// NpOnboardingChecklist/components/DisplayItem.tsx
import * as React from 'react';

interface Props {
  label: string;
  value: string;
  showLock?: boolean;
}

const lockPath = 'M4 6V4a2 2 0 014 0v2';

export function DisplayItem({ label, value, showLock = false }: Props): React.ReactElement {
  return (
    <div style={itemStyle}>
      <div style={statusRowStyle}>
        <div style={dotStyle} />
        <span style={statusTextStyle}>Display only</span>
      </div>
      <div style={titleStyle}>
        {label}
        {showLock && (
          <svg width={12} height={14} viewBox="0 0 12 14" fill="none" style={lockStyle}>
            <rect x={2} y={6} width={8} height={7} rx={1.5} stroke="#605e5c" strokeWidth={1.2} />
            <path d={lockPath} stroke="#605e5c" strokeWidth={1.2} />
          </svg>
        )}
      </div>
      <div style={valueStyle}>{value || '\u2014'}</div>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  padding: '10px 14px 12px',
  borderBottom: '1px solid #edebe9',
  background: '#faf9f8',
};
const statusRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5,
};
const dotStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', background: '#a19f9d', flexShrink: 0,
};
const statusTextStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#a19f9d',
};
const titleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2,
  display: 'flex', alignItems: 'center', gap: 5,
};
const lockStyle: React.CSSProperties = { opacity: 0.45, flexShrink: 0 };
const valueStyle: React.CSSProperties = { fontSize: 13, color: '#605e5c' };
