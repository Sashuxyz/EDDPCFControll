// Numeric OptionSet → human label maps. Single source of truth for the PCF.
// Confirmed values come from the SygnumKYC managed solution; stubbed entries
// are filled in as the implementation progresses through M3-M6.

export type OptionSetMap = Record<number, string>;

// CONFIRMED — spec catalog
export const US_PERSON_STATUS: OptionSetMap = {
  1: 'Not a US Person',
  2: 'Former US Person',
  3: 'US Person',
  4: 'US Nexus',
};

// STUB — values per spec catalog (0-4) but labels TBC at M3 implementation
export const PEP_STATUS: OptionSetMap = {
  0: '(pending implementation)',
  1: '(pending implementation)',
  2: '(pending implementation)',
  3: '(pending implementation)',
  4: '(pending implementation)',
};

// STUB — confirmed picklist attribute, integer values TBC
export const ANNUAL_INCOME: OptionSetMap = {};
export const TOTAL_WEALTH_BAND: OptionSetMap = {};
export const SANCTION_CHECK: OptionSetMap = { 2: '(pending implementation)', 3: '(pending implementation)' };
export const REPUTATIONAL_RISK: OptionSetMap = {
  1: '(pending implementation)',
  2: '(pending implementation)',
  3: '(pending implementation)',
};
export const SOURCE_OF_WEALTH: OptionSetMap = {};
export const RELATIONSHIP_TO_COUNTERPARTY: OptionSetMap = {};
export const TRANSFER_TIMEFRAME: OptionSetMap = {};

export function getOptionLabel(map: OptionSetMap, value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return map[value] ?? `(unknown ${value})`;
}
