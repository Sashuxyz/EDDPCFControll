import * as React from 'react';

export const containerStyles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: 'Segoe UI, sans-serif',
    maxWidth: '680px',
    background: '#fff',
  },
};

export const headerStyles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#323130',
  },
  subtitle: {
    fontSize: '12px',
    color: '#605E5C',
  },
  progressBar: {
    display: 'flex',
    gap: '3px',
    marginTop: '10px',
  },
  progressSegment: {
    flex: 1,
    height: '3px',
    borderRadius: '2px',
  },
  progressSegmentDone: {
    flex: 1,
    height: '3px',
    borderRadius: '2px',
    background: '#107C10',
  },
  progressSegmentPending: {
    flex: 1,
    height: '3px',
    borderRadius: '2px',
    background: '#E1DFDD',
  },
  progressText: {
    fontSize: '11px',
    color: '#A19F9D',
    marginTop: '4px',
  },
  takeOverAllLink: {
    fontSize: '12px',
    color: '#0078D4',
    fontWeight: 600,
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
  },
  divider: {
    height: '1px',
    background: '#edebe9',
    margin: '0 16px',
  },
};

export const disclaimerStyles: Record<string, React.CSSProperties> = {
  panel: {
    margin: '12px 16px 16px 16px',
    padding: '10px 14px',
    background: '#FFF4CE',
    borderLeft: '3px solid #8A7400',
    borderRadius: '0 4px 4px 0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  icon: {
    flexShrink: 0,
    marginTop: '1px',
  },
  text: {
    fontSize: '12px',
    color: '#8A7400',
    lineHeight: '1.5',
  },
  strong: {
    fontWeight: 600,
  },
};

export const cardStyles: Record<string, React.CSSProperties> = {
  pending: {
    borderLeft: '3px solid #0078D4',
    background: '#FAFAFA',
    margin: '12px 16px',
    borderRadius: '0 4px 4px 0',
    padding: '12px 16px',
  },
  takenOver: {
    borderLeft: '3px solid #107C10',
    background: '#FAFFF9',
    margin: '12px 16px',
    borderRadius: '0 4px 4px 0',
    padding: '12px 16px',
  },
  collapsed: {
    borderLeft: '3px solid #E1DFDD',
    background: 'transparent',
    padding: '10px 16px',
    margin: '0 16px 4px 16px',
  },
  collapsedHover: {
    borderLeft: '3px solid #0078D4',
    background: '#FAFAFA',
    padding: '10px 16px',
    margin: '0 16px 4px 16px',
  },
};

export const cardHeaderStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
  chevron: {
    fontSize: '11px',
    color: '#A19F9D',
  },
  takenOverBadge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#107C10',
  },
};

export const contentStyles: Record<string, React.CSSProperties> = {
  body: {
    marginLeft: '22px',
    fontSize: '13px',
    color: '#323130',
    lineHeight: '1.6',
  },
  fadeMask: {
    opacity: 0.7,
    maxHeight: '60px',
    overflow: 'hidden',
    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
  },
};

export const subFieldStyles: Record<string, React.CSSProperties> = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#fff',
    border: '1px solid #E1DFDD',
    borderRadius: '4px',
  },
  badgeLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: '#605E5C',
    letterSpacing: '0.3px',
  },
  badgeValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
};

export const buttonStyles: Record<string, React.CSSProperties> = {
  takeOver: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#0078D4',
    background: 'none',
    border: '1px solid #0078D4',
    borderRadius: '4px',
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  },
  takeOverHover: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#0078D4',
    background: '#EFF6FC',
    border: '1px solid #0078D4',
    borderRadius: '4px',
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  },
  takenOverText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#107C10',
    fontWeight: 600,
    opacity: 0.7,
  },
};

export const confirmStyles: Record<string, React.CSSProperties> = {
  panel: {
    background: '#FFF4CE',
    borderLeft: '3px solid #8A7400',
    borderRadius: '0 4px 4px 0',
    padding: '10px 14px',
    margin: '4px 16px 12px 16px',
  },
  text: {
    fontSize: '13px',
    color: '#8A7400',
    lineHeight: '1.5',
    marginBottom: '8px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  overwriteBtn: {
    fontSize: '12px',
    color: '#fff',
    background: '#0078D4',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 600,
  },
  cancelBtn: {
    fontSize: '12px',
    color: '#605E5C',
    background: 'none',
    border: '1px solid #D2D0CE',
    borderRadius: '4px',
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
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
  codeBlock: {
    marginTop: '8px',
    padding: '8px 12px',
    background: '#F3F2F1',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#605E5C',
    maxWidth: '100%',
    overflow: 'hidden',
    wordBreak: 'break-all',
  },
};

export const sourceStyles: Record<string, React.CSSProperties> = {
  linkItem: {
    display: 'flex',
    gap: '8px',
    padding: '2px 0',
  },
  refBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#0078D4',
    minWidth: '20px',
  },
  linkText: {
    fontSize: '12px',
    color: '#0078D4',
    textDecoration: 'underline',
    cursor: 'pointer',
  },
};
