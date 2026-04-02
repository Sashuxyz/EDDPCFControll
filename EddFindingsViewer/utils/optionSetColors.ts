/**
 * Risk severity and status color mapping — D365 palette.
 * Integer values must be verified against the actual OptionSet definition in Dataverse.
 */

interface BadgeColors {
  bg: string;
  text: string;
}

const FALLBACK_COLORS: BadgeColors = { bg: '#F3F2F1', text: '#605E5C' };

export const RISK_COLORS: Record<number, BadgeColors> = {
  1: { bg: '#DFF6DD', text: '#107C10' },  // Low — green
  2: { bg: '#FFF4CE', text: '#835B00' },  // Medium — amber
  3: { bg: '#FED9CC', text: '#C4441C' },  // High — orange
  4: { bg: '#FDE7E9', text: '#A4262C' },  // Critical — red
};

export const STATUS_COLORS: Record<number, BadgeColors> = {
  1: { bg: '#DEECF9', text: '#0078D4' },  // Open — blue
  2: { bg: '#DFF6DD', text: '#107C10' },  // Mitigated — green
  3: { bg: '#FFF4CE', text: '#835B00' },  // Accepted — amber
  4: { bg: '#F3F2F1', text: '#605E5C' },  // Closed — gray
};

export function getRiskColors(value: number | null): BadgeColors {
  if (value == null) return FALLBACK_COLORS;
  return RISK_COLORS[value] ?? FALLBACK_COLORS;
}

export function getStatusColors(value: number | null): BadgeColors {
  if (value == null) return FALLBACK_COLORS;
  return STATUS_COLORS[value] ?? FALLBACK_COLORS;
}
