import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    fontFamily: FONT,
    width: '100%',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    minHeight: 0,
  } as React.CSSProperties,
  canvas: {
    flex: 1,
    minWidth: 0,
    height: 550,
    background: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebar: {
    width: 260,
    flexShrink: 0,
    borderLeft: '1px solid #edebe9',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  } as React.CSSProperties,
};

export const breadcrumbStyles: S = {
  bar: {
    padding: '8px 16px',
    background: '#F3F2F1',
    borderBottom: '1px solid #edebe9',
    fontSize: 12,
    color: '#605E5C',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segmentCurrent: {
    color: '#323130',
    fontWeight: 600,
    fontSize: 12,
  },
  resetButton: {
    fontSize: 11,
    color: '#0078D4',
    background: 'none',
    border: '1px solid #0078D4',
    borderRadius: 3,
    padding: '2px 10px',
    cursor: 'pointer',
    fontFamily: FONT,
    fontWeight: 600,
  },
};

export const sidePanelStyles: S = {
  root: {
    padding: '12px 16px',
    background: '#fff',
    fontFamily: FONT,
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#A19F9D',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  placeholder: {
    fontSize: 13,
    color: '#A19F9D',
    fontStyle: 'italic',
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 6,
    fontSize: 12,
    color: '#605E5C',
  } as React.CSSProperties,
  fieldLabel: {
    fontWeight: 600,
    color: '#323130',
    marginRight: 4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0078D4',
    background: 'none',
    border: '1px solid #0078D4',
    borderRadius: 4,
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: FONT,
  },
  pepBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 3,
    background: '#A4262C',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    marginLeft: 6,
  },
};

export const legendStyles: S = {
  bar: {
    padding: '12px 16px',
    borderTop: '1px solid #edebe9',
    background: '#FAFAFA',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 10,
    color: '#605E5C',
  } as React.CSSProperties,
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export const emptyStyles: S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    color: '#A19F9D',
  },
  icon: {
    marginBottom: 10,
  },
  text: {
    fontSize: 13,
    color: '#605E5C',
  },
};
