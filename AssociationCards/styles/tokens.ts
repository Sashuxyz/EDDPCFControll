import * as React from 'react';

type S = Record<string, React.CSSProperties>;

export const containerStyles: S = {
  root: {
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: '#fff',
    padding: '12px 0',
  },
};

export const barStyles: S = {
  root: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #edebe9' },
  rootEmpty: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' },
  left: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { fontSize: '14px', fontWeight: 600, color: '#323130' },
  countBadge: { display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: '2px', backgroundColor: '#E1DFDD', color: '#605E5C', fontSize: '11px', fontWeight: 600 },
  addButton: { fontSize: '13px', color: '#323130', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' },
  loadingText: { fontSize: '13px', color: '#605E5C', textAlign: 'center', padding: '20px 14px' },
};

export const chipStyles: S = {
  container: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 14px' },
  chip: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '16px', background: '#F3F2F1', fontSize: '13px', color: '#323130', cursor: 'default', border: '1px solid transparent', transition: 'background 150ms, border-color 150ms' },
  chipHover: { background: '#E8F0FE', borderColor: '#0078D4' },
};

export const cardStyles: S = {
  container: { display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '12px 14px' },
  card: { display: 'flex', flexDirection: 'column', padding: '10px 14px', border: '1px solid #f3f2f1', borderRadius: '4px', minWidth: '150px', maxWidth: '220px', width: '220px', boxSizing: 'border-box', position: 'relative', background: '#fff', transition: 'box-shadow 200ms ease', boxShadow: '0 1px 2px rgba(0,0,0,.04)', wordWrap: 'break-word', overflow: 'hidden' },
  cardHover: { boxShadow: '0 4px 12px rgba(0,0,0,.12)' },
  cardName: { fontSize: '13px', fontWeight: 600, color: '#323130', marginBottom: '6px', paddingRight: '20px', wordWrap: 'break-word', overflowWrap: 'anywhere' },
  cardField: { fontSize: '11px', color: '#605E5C', lineHeight: '1.5' },
  cardFieldLabel: { fontWeight: 600 },
  removeIcon: { position: 'absolute', top: '10px', right: '10px', cursor: 'pointer' },
};

export const tooltipStyles: S = {
  tooltip: { position: 'absolute', background: '#fff', border: '1px solid #edebe9', borderRadius: '4px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.12)', fontSize: '12px', color: '#323130', zIndex: 10, minWidth: '180px' },
  tooltipName: { fontWeight: 600, color: '#323130', marginBottom: '6px' },
  tooltipField: { color: '#605E5C', lineHeight: '1.6' },
};
