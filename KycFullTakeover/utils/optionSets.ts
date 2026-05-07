// utils/optionSets.ts
// Numeric OptionSet → human label maps. Single source of truth for the PCF.
// Values verified against SygnumKYC_1_0_0_1_managed.zip customizations.xml.

export type OptionSetMap = Record<number, string>;

// CONFIRMED — global optionset syg_uspersonstatus
export const US_PERSON_STATUS: OptionSetMap = {
  1: 'Not a US Person',
  2: 'Former US Person',
  3: 'US Person',
  4: 'US Nexus',
};

// CONFIRMED — global optionset syg_currentpepstatus (used by syg_kycprofile.syg_pepstatus)
export const PEP_STATUS: OptionSetMap = {
  0: 'No',
  1: 'Foreign PEP',
  2: 'Domestic PEP',
  3: 'International organization PEP',
  4: 'International Sports Federation PEP',
};

// CONFIRMED — local optionset new_annual_income (used by syg_kycprofile.syg_annualincome)
export const ANNUAL_INCOME: OptionSetMap = {
  1: '<= 100’000',
  2: '100’001 - 250’000',
  3: '250’001 - 500’000',
  4: '500’001 - 1’000’000',
  5: '> 1’000’000',
};

// CONFIRMED — local optionset new_wealth (used by syg_kycprofile.syg_totalwealth)
export const TOTAL_WEALTH_BAND: OptionSetMap = {
  1: '<500’000',
  2: '500’001-2’000’000',
  3: '2’000’001-5’000’000',
  4: '5’000’001-10’000’000',
  5: '10’000’001-25’000’000',
  6: '25’000’000-50’000’000',
  7: '>50’000’000',
};

// CONFIRMED — local optionset syg_sanctionscheck (used by syg_kycprofile.syg_sanctioncheck)
export const SANCTION_CHECK: OptionSetMap = {
  2: 'Yes, min. one hit',
  3: 'No hits',
};

// CONFIRMED — global optionset syg_reputationalrisk
export const REPUTATIONAL_RISK: OptionSetMap = {
  1: 'Yes, reputational risk identified',
  2: 'No reputational risk identified',
  3: 'Not assessed',
};

// CONFIRMED — local optionset new_originofassetsnaturalperson (used by syg_sourceofwealth.syg_sourceofwealth) — M5 prep
export const SOURCE_OF_WEALTH: OptionSetMap = {
  0: 'Self-Employment',
  1: 'Salaried Income',
  2: 'Investment Earnings: Financial Products',
  3: 'Investment Earnings: Cryptocurrencies',
  4: 'Investment Earnings: Initial Coin Offerings',
  5: 'Airdrops',
  6: 'Sale of Company',
  7: 'Inheritance/Gift',
  8: 'Sale of Real Estate',
  9: 'Pay-off/Allowance',
  10: 'Family Wealth',
  11: 'Sale of Valuables (Art, etc.)',
  12: 'Lotteries',
  13: 'Pension Funds',
  14: 'Cryptocurreny Mining',
  15: 'Other',
  16: 'Business ownership',
  17: 'Equity Fundraising / IPOs',
  18: 'Token Fundraising / ICOs',
  19: 'Government or Institutional Support',
  20: 'Donations or Endowments',
  21: 'Profit from current business activity',
  22: 'Debt Issuance',
  23: 'Corporate Dividend',
};

// CONFIRMED — global optionset syg_transfertimeframe (used by syg_incomingfiatfunds + syg_digitalassetfunds) — M5 prep
export const TRANSFER_TIMEFRAME: OptionSetMap = {
  1: 'Initial Funding (<6 months)',
  2: 'Over Time (>6 months)',
  3: 'Recurring transfer',
};

// STUB — confirmed picklist attribute syg_familyrelationship; values needed for M5 SoW only.
export const RELATIONSHIP_TO_COUNTERPARTY: OptionSetMap = {};

export function getOptionLabel(map: OptionSetMap, value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return map[value] ?? `(unknown ${value})`;
}
