import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    fontFamily: FONT,
    width: '100%',
    boxSizing: 'border-box',
    background: '#fff',
    padding: '24px 32px',
  },
};

export const headerStyles: S = {
  row: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 16,
    borderBottom: '1px solid #edebe9',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
  },
  roundIndicator: {
    fontSize: 11,
    fontWeight: 600,
    color: '#605E5C',
  },
  approvedIndicator: {
    fontSize: 11,
    fontWeight: 600,
    color: '#107C10',
  },
};

export const progressBarStyles: S = {
  wrapper: {
    position: 'relative',
    height: 24,
    margin: '8px 0 12px 0',
  },
  bar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    height: 4,
    display: 'flex',
    gap: 0,
    borderRadius: 2,
    overflow: 'hidden',
  },
  segmentCompleted: {
    flex: 1,
    background: '#107C10',
  },
  segmentUpcoming: {
    flex: 1,
    background: '#E1DFDD',
  },
  circlesRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBase: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCompleted: {
    background: '#107C10',
  },
  circleActive: {
    background: '#fff',
    border: '2px solid #0078D4',
  },
  circleUpcoming: {
    background: '#E1DFDD',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#0078D4',
  },
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#A19F9D',
  },
  labelsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#605E5C',
    marginTop: 4,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
};

export const detailCardsStyles: S = {
  row: {
    display: 'flex',
    gap: 0,
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #edebe9',
  },
  card: {
    flex: 1,
    padding: '0 12px',
    borderRight: '1px solid #edebe9',
  },
  cardLast: {
    flex: 1,
    padding: '0 12px',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: '#323130',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: 6,
  },
  approver: {
    fontSize: 13,
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  approverPlain: {
    fontSize: 13,
    color: '#323130',
  },
  approverMuted: {
    fontSize: 13,
    color: '#A19F9D',
  },
  date: {
    fontSize: 12,
    color: '#605E5C',
    marginTop: 2,
    minHeight: 14,
  },
  statusApproved: {
    fontSize: 11,
    color: '#107C10',
    marginTop: 6,
    fontWeight: 600,
  },
  statusActive: {
    fontSize: 11,
    color: '#0078D4',
    marginTop: 6,
    fontWeight: 600,
  },
  statusUpcoming: {
    fontSize: 11,
    color: '#A19F9D',
    marginTop: 6,
  },
};

export const timelineStyles: S = {
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTop: '1px solid #edebe9',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#605E5C',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: 14,
  },
  list: {
    position: 'relative',
    paddingLeft: 24,
  },
  rail: {
    position: 'absolute',
    left: 7,
    top: 8,
    bottom: 8,
    width: 1,
    background: '#E1DFDD',
  },
  item: {
    position: 'relative',
    paddingBottom: 16,
  },
  itemLast: {
    position: 'relative',
    paddingBottom: 0,
  },
  dotBase: {
    position: 'absolute',
    left: -20,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  dotApproval: { background: '#107C10' },
  dotSendBack: { background: '#A4262C' },
  dotAwaiting: { background: '#0078D4' },
  description: {
    fontSize: 13,
    color: '#323130',
  },
  descriptionSendBack: {
    fontSize: 13,
    color: '#323130',
    fontWeight: 600,
  },
  approverLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  meta: {
    fontSize: 11,
    color: '#605E5C',
    marginTop: 2,
  },
};

export const emptyStateStyles: S = {
  root: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#A19F9D',
    fontSize: 13,
  },
};
