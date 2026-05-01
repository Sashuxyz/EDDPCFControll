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
  canvas: {
    width: '100%',
    height: 450,
    background: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
  },
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
    gap: 4,
  },
  segment: {
    color: '#0078D4',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 12,
    fontFamily: FONT,
    padding: 0,
  },
  segmentCurrent: {
    color: '#323130',
    fontWeight: 600,
    fontSize: 12,
  },
  separator: {
    color: '#A19F9D',
    margin: '0 4px',
    fontSize: 10,
  },
};

export const sidePanelStyles: S = {
  root: {
    padding: '12px 16px',
    borderTop: '1px solid #edebe9',
    background: '#fff',
    fontFamily: FONT,
    minHeight: 60,
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
    gap: 24,
    marginTop: 6,
    fontSize: 12,
    color: '#605E5C',
  },
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
    padding: '8px 16px',
    borderTop: '1px solid #edebe9',
    background: '#FAFAFA',
    display: 'flex',
    gap: 16,
    fontSize: 10,
    color: '#605E5C',
    flexWrap: 'wrap',
  },
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
