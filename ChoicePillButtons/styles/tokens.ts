import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
    fontFamily: FONT,
  },
};

export const pillStyles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    padding: '6px 14px',
    borderRadius: 4,
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: 500,
    border: '1px solid #E1DFDD',
    background: '#fff',
    color: '#323130',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.1s, border-color 0.1s',
  } as React.CSSProperties,
  disabled: {
    background: '#F3F2F1',
    color: '#A19F9D',
    border: '1px solid #EDEBE9',
    cursor: 'not-allowed',
  } as React.CSSProperties,
};

export const INJECTED_CSS = `
.cpb-pill:not(.cpb-pill--selected):not(.cpb-pill--disabled):hover {
  background: #F3F2F1 !important;
}
.cpb-pill:focus-visible {
  outline: 2px solid #0078D4;
  outline-offset: 2px;
}
`;
