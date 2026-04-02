import * as React from 'react';

type StyleMap = Record<string, React.CSSProperties>;

export const containerStyles: StyleMap = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0',
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  loadMoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 0',
  },
  loadMoreError: {
    color: '#A4262C',
    fontSize: '12px',
    marginTop: '4px',
    textAlign: 'center',
  },
};

export const headerStyles: StyleMap = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px 8px 16px',
  },
  left: {
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
    justifyContent: 'center',
    padding: '1px 8px',
    borderRadius: '2px',
    backgroundColor: '#E1DFDD',
    color: '#605E5C',
    fontSize: '12px',
    fontWeight: 600,
    minWidth: '18px',
    textAlign: 'center',
  },
};

export const emptyStyles: StyleMap = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    color: '#A19F9D',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  text: {
    fontSize: '13px',
    color: '#A19F9D',
  },
};

export const cardStyles: StyleMap = {
  card: {
    backgroundColor: '#fff',
    border: '1px solid #edebe9',
    borderRadius: '2px',
    margin: '4px 12px',
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#0078D4',
  },
  headerArea: {
    padding: '12px 16px 0 16px',
    cursor: 'pointer',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '2px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  rightGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  chevron: {
    color: '#A19F9D',
    fontSize: '12px',
    transition: 'transform 200ms ease',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  titleRow: {
    padding: '8px 0 0 0',
  },
  titleLink: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
    backgroundColor: 'transparent',
    border: '0',
    padding: '0',
    fontFamily: 'inherit',
  },
  previewArea: {
    padding: '8px 16px 0 16px',
  },
  previewText: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#605E5C',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  showMoreLink: {
    padding: '4px 16px 12px 16px',
  },
  showMoreButton: {
    color: '#0078D4',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: 'transparent',
    border: '0',
    padding: '0',
    fontFamily: 'inherit',
  },
  expandedDescription: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#323130',
    padding: '8px 16px 0 16px',
  },
  metadataFooter: {
    padding: '12px 16px 14px 16px',
    marginTop: '10px',
    borderTop: '1px solid #edebe9',
  },
  metadataRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    fontSize: '12px',
    color: '#605E5C',
  },
  metadataLabel: {
    color: '#323130',
    fontWeight: 600,
  },
  conditionLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'underline',
    backgroundColor: 'transparent',
    border: '0',
    padding: '0',
    fontFamily: 'inherit',
    fontSize: '12px',
  },
};
