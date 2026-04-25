import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const editorStyles: S = {
  container: {
    fontFamily: FONT,
    position: 'relative',
  },
  editor: {
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1.4,
    color: '#323130',
    background: '#F3F2F1',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 4,
    padding: '8px 10px',
    minHeight: 80,
    overflowY: 'hidden',
    outline: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: 'text',
  } as React.CSSProperties,
  editorFocused: {
    borderBottom: '2px solid #0078D4',
  },
  editorDisabled: {
    cursor: 'default',
  },
};

export const INJECTED_CSS = `
.rtm-editor a[data-link-type] {
  color: #0078D4;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: text;
}
.rtm-editor.rtm--modifier-active a[data-link-type] {
  cursor: pointer;
  color: #106EBE;
}
.rtm-editor.rtm--disabled a[data-link-type] {
  cursor: pointer;
}
.rtm-editor a[data-link-type]:focus {
  outline: 2px solid #0078D4;
  outline-offset: 2px;
}
.rtm-editor.rtm--empty::before {
  content: attr(data-placeholder);
  color: #A19F9D;
  pointer-events: none;
  position: absolute;
}
`;
