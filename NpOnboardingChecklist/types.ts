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
  taxDomicile: string;   // from syg_taxationdetails.syg_countryid (lookup formatted value)
  taxId: string;         // from syg_taxationdetails.syg_taxid
}

export interface IdDocument {
  id: string;
  documentType: string;    // syg_documenttype (option set formatted value)
  documentNumber: string;  // syg_documentnumber
  countryOfIssue: string;  // syg_countryofissueid (lookup formatted value)
  placeOfIssue: string;    // syg_placeofissue
  issueDate: string;       // syg_dateofissue, already formatted de-CH
  expirationDate: string;  // syg_expirationdate, already formatted de-CH
}

export interface CrmValues {
  // Section 1 — from syg_kycprofile (via syg_clientonboarding.syg_kycprofilefrontinputid)
  dateOfBirth: string;           // syg_dateofbirth
  nationalities: string;         // syg_nationalities
  // Section 1 — from syg_clientonboarding
  relationshipManager: string;   // syg_relationshipmanagerid (lookup formatted value)
  riskLevel: string;             // syg_risklevel (option set formatted value)
  pepStatus: string;             // syg_pepcheck (option set formatted value)
  // Section 2 — from syg_kycprofile
  clientSegment: string;         // syg_finsaclassification (option set formatted value)
  // Section 3 — from syg_clientonboarding
  referenceCurrency: string;     // syg_referencecurrencyid (lookup formatted value) — used for both Portfolio Default Currency and Digital Asset Vault Currency display
  specialConditions: string;     // syg_specialconditions
  // Section 4 — from syg_clientonboarding
  aiaReporting: string;          // syg_aiareporting (option set formatted value) — INDICIA check
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
  'omst', 'btct', 'btcv', 'cv4', 'cvw',
]);

/** Keys in each section (excludes dynamic tax keys computed at runtime). */
export const SEC1_KEYS = ['dob', 'rm', 'active', 'risk', 'pep'] as const;
export const SEC3_KEYS = ['currency', 'pms', 'payment', 'block', 'special', 'archive'] as const;
// Section 4: tax record keys (dynamic) + fixed items below
export const SEC4_FIXED_KEYS = ['chtax', 'dispatch', 'indicia', 'oms'] as const;
export const SEC5_KEYS = ['omst', 'cv4', 'cvw', 'btct', 'btcv'] as const;

/** Human-readable labels for alert bars. */
export const ITEM_LABELS = {
  dob: 'Date of Birth',
  rm: 'Relationship Manager',
  active: 'Set Client as Active',
  risk: 'Risk Level',
  pep: 'PEP Status',
  currency: 'Portfolio Default Currency',
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
  cvw: 'C-Vault: Wallets',
} as const;

export function taxKey(index: number): string {
  return `tx${index}`;
}

export function taxLabel(index: number): string {
  return `Tax ID (record ${index + 1})`;
}
