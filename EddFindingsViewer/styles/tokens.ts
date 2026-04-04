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
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    contain: 'inline-size' as const,
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
    margin: '3px 0',
    boxShadow: '0 1px 2px 0 rgba(0,0,0,.06), 0 0.5px 1px 0 rgba(0,0,0,.04)',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    width: '100%',
    transition: 'box-shadow 150ms ease',
  },
  cardExpanded: {
    borderColor: '#0078D4',
    boxShadow: '0 2px 4px 0 rgba(0,0,0,.08), 0 1px 2px 0 rgba(0,0,0,.06)',
  },
  headerArea: {
    padding: '10px 14px 0 14px',
    cursor: 'pointer',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    padding: '1px 6px',
    borderRadius: '2px',
    fontSize: '11px',
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
    padding: '6px 14px 0 14px',
  },
  previewText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#323130',
    overflow: 'hidden',
    wordBreak: 'break-word' as const,
    overflowWrap: 'anywhere' as const,
    whiteSpace: 'pre-wrap' as const,
    maxHeight: '100px', /* ~5 lines at 13px * 1.5 line-height = ~20px per line */
  },
  showMoreLink: {
    padding: '8px 14px 10px 14px',
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
    lineHeight: '1.5',
    color: '#323130',
    padding: '6px 14px 0 14px',
    wordBreak: 'break-word' as const,
    overflowWrap: 'anywhere' as const,
    whiteSpace: 'pre-wrap' as const,
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  },
  mitigationSubheading: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#323130',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    padding: '20px 14px 0 14px',
    margin: '0 14px',
    borderTop: '1px solid #f3f2f1',
  },
  metadataFooter: {
    padding: '10px 14px 12px 14px',
    marginTop: '8px',
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
  categoryLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#605E5C',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  conditionLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'underline',
    backgroundColor: 'transparent',
    border: '0',
    padding: '2px 4px',
    margin: '-2px -4px',
    fontFamily: 'inherit',
    fontSize: '12px',
    lineHeight: '20px',
  },
};
