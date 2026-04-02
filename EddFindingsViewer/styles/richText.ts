import { makeStyles, shorthands } from '@fluentui/react-components';

/**
 * Scoped styles applied to the container wrapping sanitized rich text HTML.
 * These ensure tables, images, and text elements render correctly within cards.
 */
export const useRichTextStyles = makeStyles({
  richTextContainer: {
    '& img': {
      maxWidth: '100%',
      height: 'auto',
      ...shorthands.borderRadius('2px'),
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '12px',
      ...shorthands.margin('10px', '0'),
    },
    '& th': {
      textAlign: 'left',
      ...shorthands.padding('6px', '10px'),
      ...shorthands.border('1px', 'solid', '#edebe9'),
      backgroundColor: '#F3F2F1',
      fontWeight: 600 as unknown as string,
      color: '#323130',
    },
    '& td': {
      ...shorthands.padding('6px', '10px'),
      ...shorthands.border('1px', 'solid', '#edebe9'),
    },
    '& p': {
      ...shorthands.margin('0', '0', '10px', '0'),
    },
    '& ul, & ol': {
      ...shorthands.padding('0', '0', '0', '20px'),
      ...shorthands.margin('0', '0', '10px', '0'),
    },
    '& blockquote': {
      ...shorthands.borderLeft('3px', 'solid', '#edebe9'),
      ...shorthands.padding('4px', '12px'),
      ...shorthands.margin('10px', '0'),
      color: '#605E5C',
    },
    '& pre': {
      backgroundColor: '#F3F2F1',
      ...shorthands.padding('8px', '12px'),
      ...shorthands.borderRadius('2px'),
      ...shorthands.overflow('auto'),
      fontSize: '12px',
    },
  },
});
