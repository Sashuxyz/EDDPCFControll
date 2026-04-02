import { makeStyles, shorthands } from '@fluentui/react-components';

export const useContainerStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('0'),
    fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('40px', '16px'),
  },
  loadMoreContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.padding('8px', '0'),
  },
  loadMoreError: {
    color: '#A4262C',
    fontSize: '12px',
    marginTop: '4px',
    textAlign: 'center',
  },
});

export const useHeaderStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('12px', '16px', '8px', '16px'),
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  title: {
    fontSize: '14px',
    fontWeight: 600 as unknown as string,
    color: '#323130',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('1px', '8px'),
    ...shorthands.borderRadius('2px'),
    backgroundColor: '#E1DFDD',
    color: '#605E5C',
    fontSize: '12px',
    fontWeight: 600 as unknown as string,
    minWidth: '18px',
    textAlign: 'center',
  },
});

export const useEmptyStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('40px', '16px'),
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
});

export const useCardStyles = makeStyles({
  card: {
    backgroundColor: '#fff',
    ...shorthands.border('1px', 'solid', '#edebe9'),
    ...shorthands.borderRadius('2px'),
    ...shorthands.margin('4px', '12px'),
    boxShadow: '0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)',
    ...shorthands.overflow('hidden'),
  },
  cardExpanded: {
    ...shorthands.borderColor('#0078D4'),
  },
  headerArea: {
    ...shorthands.padding('12px', '16px', '0', '16px'),
    cursor: 'pointer',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('2px'),
    fontSize: '12px',
    fontWeight: 600 as unknown as string,
    whiteSpace: 'nowrap',
  },
  rightGroup: {
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'center',
  },
  chevron: {
    color: '#A19F9D',
    fontSize: '12px',
    transitionProperty: 'transform',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
  titleRow: {
    ...shorthands.padding('8px', '0', '0', '0'),
  },
  titleLink: {
    fontWeight: 600 as unknown as string,
    fontSize: '14px',
    color: '#0078D4',
    cursor: 'pointer',
    textDecorationLine: 'none',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    ':hover': {
      textDecorationLine: 'underline',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
      outlineOffset: '1px',
    },
  },
  previewArea: {
    ...shorthands.padding('8px', '16px', '0', '16px'),
  },
  previewText: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#605E5C',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    ...shorthands.overflow('hidden'),
  },
  showMoreLink: {
    ...shorthands.padding('4px', '16px', '12px', '16px'),
  },
  showMoreButton: {
    color: '#0078D4',
    cursor: 'pointer',
    fontSize: '12px',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    ':hover': {
      textDecorationLine: 'underline',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
      outlineOffset: '1px',
    },
  },
  expandedDescription: {
    fontSize: '13px',
    lineHeight: '1.65',
    color: '#323130',
    ...shorthands.padding('8px', '16px', '0', '16px'),
  },
  metadataFooter: {
    ...shorthands.padding('12px', '16px', '14px', '16px'),
    marginTop: '10px',
    ...shorthands.borderTop('1px', 'solid', '#edebe9'),
  },
  metadataRow: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('16px'),
    fontSize: '12px',
    color: '#605E5C',
  },
  metadataLabel: {
    color: '#323130',
    fontWeight: 600 as unknown as string,
  },
  conditionLink: {
    color: '#0078D4',
    cursor: 'pointer',
    textDecorationLine: 'underline',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    ...shorthands.padding('0'),
    fontFamily: 'inherit',
    fontSize: '12px',
    ':hover': {
      color: '#106EBE',
    },
    ':focus-visible': {
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: '#0078D4',
    },
  },
});
