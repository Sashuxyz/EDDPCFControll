import * as React from 'react';

type S = Record<string, React.CSSProperties>;

export const containerStyles: S = {
  root: {
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
    padding: '16px',
    background: '#fff',
  },
};

export const inputStyles: S = {
  totalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  totalLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    minWidth: '120px',
  },
  field: {
    background: '#F3F2F1',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: '2px',
    padding: '5px 8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#323130',
    outline: 'none',
    width: '180px',
    textAlign: 'right',
  },
  fieldFocused: {
    borderBottom: '2px solid #0078D4',
  },
  fieldError: {
    borderBottom: '2px solid #A4262C',
  },
  fieldDisabled: {
    background: '#F3F2F1',
    color: '#A19F9D',
  },
  percentField: {
    background: '#F3F2F1',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: '2px',
    padding: '3px 6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    color: '#323130',
    outline: 'none',
    width: '54px',
    textAlign: 'right',
  },
  percentSuffix: {
    fontSize: '11px',
    color: '#605E5C',
    marginLeft: '2px',
  },
};

export const barStyles: S = {
  wrapper: {
    marginBottom: '4px',
  },
  bar: {
    height: '24px',
    borderRadius: '3px',
    overflow: 'hidden',
    display: 'flex',
    background: '#F3F2F1',
  },
  segment: {
    transition: 'width 0.12s ease',
    cursor: 'pointer',
  },
  segmentHover: {
    outline: '2px solid #fff',
    outlineOffset: '-2px',
    zIndex: 1,
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    background: '#fff',
    border: '1px solid #edebe9',
    borderRadius: '4px',
    padding: '8px 12px',
    boxShadow: '0 4px 12px rgba(0,0,0,.12)',
    fontSize: '12px',
    zIndex: 10,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  tooltipName: {
    fontWeight: 600,
    marginBottom: '2px',
  },
  tooltipValue: {
    color: '#605E5C',
  },
  statusLine: {
    fontSize: '11px',
    color: '#605E5C',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0 12px 0',
  },
  statusAllocated: {
    color: '#323130',
    fontWeight: 600,
  },
  statusUnallocated: {
    color: '#835B00',
    fontWeight: 600,
  },
  statusFull: {
    color: '#107C10',
    fontWeight: 600,
  },
  statusOver: {
    color: '#A4262C',
    fontWeight: 600,
  },
};

export const tableStyles: S = {
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '24px 140px 1fr 70px 110px',
    gap: '0 8px',
    padding: '6px 0',
    borderBottom: '1px solid #edebe9',
  },
  headerCell: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#605E5C',
  },
  headerCellRight: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#605E5C',
    textAlign: 'right',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '24px 140px 1fr 70px 110px',
    gap: '0 8px',
    padding: '8px 0',
    borderBottom: '1px solid #f3f2f1',
    alignItems: 'center',
    transition: 'opacity 150ms',
  },
  rowZero: {
    opacity: 0.45,
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  label: {
    fontSize: '13px',
    color: '#323130',
  },
  chfValue: {
    fontSize: '13px',
    color: '#605E5C',
    textAlign: 'right',
  },
};

export const unallocatedStyles: S = {
  row: {
    display: 'grid',
    gridTemplateColumns: '24px 140px 1fr 70px 110px',
    gap: '0 8px',
    padding: '8px 0',
    alignItems: 'center',
    background: '#FAFAF9',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#E1DFDD',
    border: '1px dashed #A19F9D',
    boxSizing: 'border-box',
  },
  label: {
    fontSize: '13px',
    color: '#835B00',
    fontWeight: 600,
  },
  value: {
    fontSize: '13px',
    color: '#835B00',
    fontWeight: 600,
    textAlign: 'right',
  },
};

export const summaryStyles: S = {
  footer: {
    borderTop: '1px solid #edebe9',
    marginTop: '4px',
    paddingTop: '8px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  },
  label: {
    fontSize: '12px',
    color: '#605E5C',
  },
  value: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
};
