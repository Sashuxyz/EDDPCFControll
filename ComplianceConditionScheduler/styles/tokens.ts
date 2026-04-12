import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const C = {
  brand: '#0078D4',
  brandDark: '#106EBE',
  brandBg: '#EFF6FC',
  brandBgStrong: '#DEECF9',
  n100: '#201F1E',
  n90: '#3B3A39',
  n80: '#605E5C',
  n60: '#A19F9D',
  n40: '#D2D0CE',
  n30: '#EDEBE9',
  n20: '#F3F2F1',
  n10: '#FAF9F8',
  white: '#FFFFFF',
  green: '#107C10',
  greenBg: '#DFF6DD',
  greenBorder: '#C8ECC8',
  amber: '#8A7400',
  amberBg: '#FFF4CE',
  red: '#C4314B',
};

export { C };

export const containerStyles: S = {
  root: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    color: C.n100,
    maxWidth: '600px',
    padding: '4px 0',
  },
};

export const headerStyles: S = {
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: `2px solid ${C.n30}`,
  },
  title: {
    fontSize: '15px',
    fontWeight: 700,
    color: C.n90,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  resetLink: {
    fontSize: '12px',
    color: C.n80,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'underline',
  },
};

export const badgeStyles: S = {
  draft: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 12px',
    borderRadius: '4px',
    background: C.n20,
    color: C.n80,
    border: `1px solid ${C.n40}`,
  },
  active: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 12px',
    borderRadius: '4px',
    background: C.greenBg,
    color: C.green,
    border: `1px solid ${C.greenBorder}`,
  },
  completed: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 12px',
    borderRadius: '4px',
    background: C.brandBg,
    color: C.brand,
    border: `1px solid ${C.brandBgStrong}`,
  },
  pending: {
    fontSize: '12px',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '4px',
    background: C.amberBg,
    color: C.amber,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  },
};

export const sectionStyles: S = {
  section: {
    marginBottom: '22px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
    marginBottom: '10px',
  },
  fieldLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: C.n80,
    marginBottom: '6px',
  },
  helperText: {
    fontSize: '12px',
    color: C.n60,
    marginTop: '5px',
    lineHeight: '1.45',
  },
  cardsRow: {
    display: 'flex',
    gap: '8px',
  },
};

export const cardStyles: S = {
  card: {
    flex: '1',
    padding: '10px 14px',
    borderRadius: '4px',
    border: `1px solid ${C.n40}`,
    background: C.white,
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  cardSelected: {
    border: `1px solid ${C.brand}`,
    background: C.brandBg,
  },
  cardLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#323130',
  },
  cardDescription: {
    fontSize: '11px',
    color: C.n80,
  },
};

export const chipStyles: S = {
  row: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  chip: {
    padding: '5px 14px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 400,
    border: `1px solid ${C.n40}`,
    background: C.n20,
    color: '#323130',
    cursor: 'pointer',
    transition: 'all 0.12s',
    fontFamily: 'inherit',
  },
  chipSelected: {
    fontWeight: 600,
    border: `1px solid ${C.brand}`,
    background: C.brandBg,
    color: C.brand,
  },
  customRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
  },
  customInput: {
    width: '80px',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    border: 'none',
    borderBottom: `2px solid transparent`,
    background: C.n20,
    fontFamily: 'inherit',
    color: C.n100,
    outline: 'none',
  },
  customInputFocused: {
    borderBottom: `2px solid ${C.brand}`,
  },
  customUnit: {
    fontSize: '13px',
    color: C.n80,
  },
  chipDisabled: {
    opacity: 0.5,
    cursor: 'default',
  },
};

export const inputStyles: S = {
  dateField: {
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: C.n20,
    fontFamily: 'inherit',
    color: C.n100,
    outline: 'none',
    minWidth: '180px',
  },
  dateFieldFocused: {
    borderBottom: `2px solid ${C.brand}`,
  },
  dateFieldDisabled: {
    opacity: 0.5,
    cursor: 'default',
  },
};

export const summaryStyles: S = {
  panel: {
    background: C.n10,
    borderRadius: '4px',
    padding: '16px 20px',
    border: `1px solid ${C.n30}`,
  },
  header: {
    fontSize: '12px',
    fontWeight: 700,
    color: C.n80,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '14px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 24px',
  },
  rowLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: C.n60,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: '2px',
  },
  rowValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: C.n100,
  },
  pending: {
    color: C.n60,
    fontStyle: 'italic',
  },
};

export const explanationStyles: S = {
  panel: {
    marginTop: '14px',
    fontSize: '13px',
    color: C.n80,
    lineHeight: '1.65',
    padding: '10px 14px',
    background: C.brandBg,
    borderRadius: '4px',
    borderLeft: `3px solid ${C.brand}`,
  },
};

export const activationStyles: S = {
  button: {
    marginTop: '14px',
    width: '100%',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'inherit',
    color: C.white,
    background: C.brand,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  buttonHover: {
    background: C.brandDark,
  },
  hint: {
    marginTop: '14px',
    fontSize: '12px',
    color: C.n60,
    textAlign: 'center',
    padding: '8px 0',
  },
  autoActivateMsg: {
    marginTop: '14px',
    fontSize: '13px',
    color: C.n80,
    lineHeight: '1.5',
    padding: '10px 14px',
    background: C.amberBg,
    borderRadius: '4px',
    borderLeft: `3px solid ${C.amber}`,
  },
};
