import * as React from 'react';

export const containerStyles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: 'Segoe UI, sans-serif',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: '#fff',
  },
};

export const commandBarStyles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderBottom: '1px solid #edebe9',
  },
  rootSelection: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderBottom: '1px solid #edebe9',
    background: '#F0F6FF',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#323130',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 8px',
    borderRadius: '2px',
    background: '#E1DFDD',
    color: '#605E5C',
    fontSize: '11px',
    fontWeight: 600,
  },
  selectionCount: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#0078D4',
  },
  button: {
    fontSize: '13px',
    color: '#323130',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 2px',
    fontFamily: 'Segoe UI, sans-serif',
  },
  deleteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#A4262C',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  removeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#323130',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  clearButton: {
    fontSize: '13px',
    color: '#605E5C',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  divider: {
    color: '#E1DFDD',
  },
};

export const headerStyles: Record<string, React.CSSProperties> = {
  row: {
    background: '#FAFAF9',
    borderBottom: '1px solid #edebe9',
    padding: '0 4px',
    display: 'flex',
    alignItems: 'center',
  },
  cell: {
    padding: '7px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#605E5C',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  cellActive: {
    padding: '7px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#0078D4',
    letterSpacing: '0.2px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkboxCell: {
    padding: '7px 4px',
    textAlign: 'center',
  },
  chevronCell: {
    padding: '7px 4px',
  },
};

export const rowStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 4px',
    minHeight: '32px',
    borderBottom: '1px solid #edebe9',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  rowHover: {
    background: '#F5F5F5',
  },
  rowExpanded: {
    background: '#F5F5F5',
  },
  rowSelected: {
    background: '#E8F0FE',
  },
  cell: {
    padding: '0 8px',
    fontSize: '13px',
    color: '#323130',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nameLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: '0',
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '13px',
  },
  checkboxCell: {
    textAlign: 'center',
  },
  chevronCell: {
    padding: '0 4px',
    fontSize: '11px',
    color: '#A19F9D',
    textAlign: 'center',
  },
};

export const detailStyles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#FAFAFA',
    borderLeft: '3px solid #0078D4',
    padding: '8px 14px 8px 24px',
    fontSize: '12px',
    color: '#323130',
    margin: '0 4px 4px 60px',
    borderRadius: '0 2px 2px 0',
  },
  fieldRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
  },
  label: {
    fontWeight: 600,
    color: '#605E5C',
  },
  link: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    padding: '0',
    fontFamily: 'Segoe UI, sans-serif',
    fontSize: '12px',
  },
};

export const emptyStyles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
  },
  icon: {
    marginBottom: '10px',
  },
  title: {
    fontSize: '13px',
    color: '#605E5C',
  },
  subtitle: {
    fontSize: '12px',
    color: '#A19F9D',
    marginTop: '4px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px',
    gap: '8px',
  },
  loadingText: {
    fontSize: '13px',
    color: '#605E5C',
  },
};

export const paginationStyles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderTop: '1px solid #edebe9',
  },
  button: {
    fontSize: '12px',
    color: '#0078D4',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
};
