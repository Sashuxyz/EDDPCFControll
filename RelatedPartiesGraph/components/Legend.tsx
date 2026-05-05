import * as React from 'react';
import { legendStyles } from '../styles/tokens';

const items = [
  { label: 'Major', border: '#0078D4', bg: '#fff' },
  { label: 'Minor', border: '#835B00', bg: '#fff' },
  { label: 'No impact', border: '#A19F9D', bg: '#fff' },
  { label: 'KYC Profile', border: '#0078D4', bg: '#0078D4' },
];

export const Legend: React.FC = () => (
  <div style={legendStyles.bar}>
    {items.map((item) => (
      <span key={item.label} style={legendStyles.item}>
        <span style={{
          width: 10, height: 10, borderRadius: 2, display: 'inline-block',
          background: item.bg, border: `2px solid ${item.border}`,
        }} />
        {item.label}
      </span>
    ))}
    <span style={legendStyles.item}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0078D4', color: '#fff', fontSize: 9, fontWeight: 700,
      }}>+</span>
      Drillable
    </span>
    <span style={legendStyles.item}>
      <span style={{
        padding: '0 4px', borderRadius: 3,
        background: '#A4262C', color: '#fff', fontSize: 7, fontWeight: 700,
      }}>PEP</span>
      PEP flagged
    </span>
    <span style={legendStyles.item}>
      <span style={{
        width: 18, height: 0, display: 'inline-block',
        borderTop: '1px dashed #A19F9D',
      }} />
      Reverse link
    </span>
  </div>
);
