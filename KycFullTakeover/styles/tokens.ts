// Shared visual tokens. All components import from here — no hardcoded colors,
// fonts, or spacing in component files. Conforms to the existing PCF design
// language (Segoe UI, brand blue #0078D4, etc.).

import type { CSSProperties } from 'react';

export const colors = {
  // text
  textPrimary:   '#323130',
  textSecondary: '#605E5C',
  textMuted:     '#A19F9D',
  textOnBrand:   '#FFFFFF',

  // brand + state
  brand:         '#0078D4',
  brandLight:    '#EFF6FC',
  success:       '#107C10',
  warning:       '#835B00',
  warningBg:     '#FFF4CE',
  error:         '#A4262C',

  // borders
  borderStandard: '#edebe9',
  borderSubtle:   '#f3f2f1',
  borderMedium:   '#E1DFDD',

  // backgrounds
  cardBg:        '#FFFFFF',
  inputBg:       '#F3F2F1',
  whisperBg:     '#FAFAF9',
  sectionBg:     '#FAFAFA',
};

export const typography = {
  fontFamily:    "'Segoe UI', 'Helvetica Neue', sans-serif",
  fontSizeBody:    13,
  fontSizeSmall:   12,
  fontSizeLabel:   11,
  fontSizeTitle:   14,
  fontWeightNormal: 400,
  fontWeightBold:   600,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const layout = {
  tocWidth:        260,
  tocItemHeight:    32,
  sectionMaxWidth: 720,
};

// D365 input style (grey bg, blue underline on focus). See spec hard
// constraints — this is the canonical Sygnum input look.
export const inputStyle = (focused: boolean): CSSProperties => ({
  background:    colors.inputBg,
  border:        'none',
  borderBottom:  `2px solid ${focused ? colors.brand : 'transparent'}`,
  borderRadius:  4,
  padding:       '6px 10px',
  fontFamily:    typography.fontFamily,
  fontSize:      typography.fontSizeBody,
  color:         colors.textPrimary,
  outline:       'none',
  width:         '100%',
  boxSizing:     'border-box',
});
