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

export const agentBar = {
  // Background gradient (coral-forward Aurora variant v2b)
  bgGradient:        'linear-gradient(135deg, #7a1631 0%, #b22746 50%, #951e3a 100%)',
  borderBottom:      'rgba(255,255,255,0.16)',
  fontFamily:        "'Inter','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif",

  // Aurora blob colours
  blobCoral:         '#F04E68',
  blobPink:          '#FFB1C0',
  blobAmber:         '#FFC477',

  // Button — idle CTA
  padBgIdle:         'rgba(255,255,255,0.18)',
  padBorderIdle:     'rgba(255,255,255,0.40)',
  padBgIdleHover:    'rgba(255,255,255,0.26)',

  // Button — launch-pad mode (run in progress)
  padBgRunning:      'rgba(255,255,255,0.10)',
  padBorderRunning:  'rgba(255,255,255,0.40)',

  // Button — success flash
  padBgSuccess:      'rgba(46,160,67,0.85)',

  // Button — error
  padBorderError:    '#ff6b6b',

  // Banners
  errorBg:           '#fdecea',
  errorFg:           '#7a1f17',
  errorBorder:       '#f5c2bd',
  warningBg:         '#fff4ce',
  warningFg:         '#835B00',
  warningBorder:     '#f0d27a',
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
