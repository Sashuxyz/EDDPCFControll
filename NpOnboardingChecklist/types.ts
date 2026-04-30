// NpOnboardingChecklist/types.ts

export type AnswerValue = 'yes' | 'no' | null;

export interface MismatchData {
  description: string;
  actionTaken: string;
  resolution: 'Finnova Corrected Manually' | 'Other';
  resolved: boolean;
}

export interface ManualNotDoneData {
  label: string;
  reason: string;
}

export interface CheckSummary {
  total: number;
  completed: number;
  mismatches: number;
  blocked: number;
  completedAt?: string;
  completedBy?: string;
}

export interface TaxRecord {
  id: string;
  taxDomicile: string;   // prospect.taxInformation.taxResidenceCountry
  taxId: string;         // prospect.taxInformation.taxId
}

export interface IdDocument {
  id: string;
  documentType: string;    // prospect.identificationDetails.documentType
  documentNumber: string;  // prospect.identificationDetails.documentNumber
  countryOfIssue: string;  // prospect.identificationDetails.issuanceCountry
  placeOfIssue: string;    // prospect.identificationDetails.issuancePlace
  issueDate: string;       // prospect.identificationDetails.documentIssueDate, formatted de-CH
  expirationDate: string;  // prospect.identificationDetails.documentExpiryDate, formatted de-CH
}

export interface CrmValues {
  // from syg_prospectapijson on syg_clientonboarding
  dateOfBirth: string;           // prospect.dateOfBirth
  nationalities: string;         // prospect.nationalities[] joined
  // from syg_clientonboarding directly
  relationshipManager: string;   // _syg_relationshipmanagerid_value
  riskLevel: string;             // syg_risklevel
  pepStatus: string;             // syg_pepcheck
  clientSegment: string;         // syg_finsaclassification
  referenceCurrency: string;     // _syg_referencecurrencyid_value
  specialConditions: string;     // syg_specialconditionsnp → "Client has special conditions" / "Client has NO special conditions"
  aiaReporting: string;          // syg_aiareporting
  sygnumEmployee: string;        // syg_sgnumemployee formatted value
  sygnumShareholder: string;     // syg_sygnumshareholdernp formatted value
}

export interface CheckState {
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  manualNotDone: Record<string, ManualNotDoneData>;
  crmValues: CrmValues;
  taxRecords: TaxRecord[];
  idDocument: IdDocument | null;   // single document via lookup on syg_clientonboarding
  loading: boolean;
  loadError: string | null;
  completedAt: string | null;
  completedBy: string | null;
}

export interface CheckResults extends Pick<CheckState, 'answers' | 'mismatches' | 'manualNotDone'> {
  summary: CheckSummary;
}

export type SectionStatus = 'normal' | 'mismatch' | 'blocked' | 'done';

/** Items whose "No" answer is a hard block (manual checks). */
export const MANUAL_KEYS = new Set<string>([
  'active', 'pms', 'payment', 'block', 'archive',
  'chtax', 'dispatch', 'oms',
  'omst', 'btct', 'btcv', 'cv4',
  'idcheck',
]);

/** Keys in each section (excludes dynamic tax keys computed at runtime). */
export const SEC1_KEYS = ['nat', 'dob', 'rm', 'active', 'risk', 'pep', 'sygnemp', 'sygshareholder'] as const;
export const SEC2_KEYS = ['idcheck'] as const;
export const SEC3_KEYS = ['currency', 'portcurrency', 'pms', 'payment', 'block', 'special', 'archive'] as const;
// Section 4: tax record keys (dynamic) + fixed items below
export const SEC4_FIXED_KEYS = ['chtax', 'dispatch', 'indicia', 'oms'] as const;
export const SEC5_KEYS = ['omst', 'cv4', 'btct', 'btcv'] as const;

/** Human-readable labels for alert bars. */
export const ITEM_LABELS = {
  nat: 'Nationalities',
  dob: 'Date of Birth',
  rm: 'Relationship Manager',
  active: 'Set Client as Active',
  risk: 'Risk Level',
  pep: 'PEP Status',
  sygnemp: 'Sygnum Employee',
  sygshareholder: 'Sygnum Shareholder',
  idcheck: 'ID Data Confirmed',
  currency: 'Digital Asset Vault Currency',
  portcurrency: 'Portfolio Default Currency',
  pms: 'PMS+',
  payment: 'Payment Rules Matching Main Account Currency',
  block: 'Remove General Block',
  special: 'Special Conditions',
  archive: 'Set Up a Web Archive',
  chtax: 'CH Tax Regulations',
  dispatch: 'Direct Dispatch (CH clients)',
  indicia: 'Run INDICIA Search',
  oms: 'Created Client in OMS and Added the Tier',
  omst: 'Has the Tier Been Updated on OMS Portal?',
  btct: 'Add BTC and ETH Trading',
  btcv: 'Add BTC and ETH Vault',
  cv4: 'C-Vault: Business Team Approved with 4-Eyes Check',
} as const;

export function taxKey(index: number): string {
  return `tx${index}`;
}

export function taxLabel(index: number): string {
  return `Tax ID (record ${index + 1})`;
}
