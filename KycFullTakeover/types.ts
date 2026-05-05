// =============================================================================
// KycFullTakeover types — mirrors the spec's JSON Schema appendix verbatim.
// Source of truth: docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md
// =============================================================================

// === Top-level envelope ===

export interface KycPayload {
  schemaVersion: '1.0';

  findings?:                       Finding[];
  proposedClientEmail?:            ProposedEmail;

  personalDetails?:                PersonalDetailsSection;
  professionalExperience?:         { syg_ProfessionalExperienceSummary: string };
  businessActivities?:             LookupRef[];
  countriesOfActivity?:            LookupRef[];
  relatedParties?:                 RelatedPartyRow[];

  financialSituationNarrative?:    string;
  totalWealthIncome?:              TotalWealthIncomeSection;
  sourceOfWealth?:                 SourceOfWealthSection;
  currentAssetAllocation?:         AssetAllocationSection;
  digitalAssetHoldingsNarrative?:  string;
  detailedDAHoldings?:             DigitalAssetHoldingRow[];

  transactionalBehaviour?:         string;
  plannedFiatFunds?:               IncomingFiatFundRow[];
  plannedDAFunds?:                 DigitalAssetFundRow[];

  pepSanctionsRisk?:               PepSanctionsRiskSection;
  additionalComments?:             string;
}

// === Reusable types ===

export interface LookupRef {
  id:    string;
  name:  string;
  etn?:  string;
}

export interface Finding {
  severity:             'info' | 'warning' | 'critical';
  category:             string;
  title:                string;
  detail:               string;
  regulatoryReference?: string;
}

export interface ProposedEmail {
  subject: string;
  to:      LookupRef[];   // Phase 1: typically etn === "lead"
  body:    string;
}

// === Client Background ===

export interface PersonalDetailsSection {
  syg_AccountHolderNationalityID?:    LookupRef | null;
  syg_Nationality2ID?:                LookupRef | null;
  syg_accountholdernationality3id?:   LookupRef | null;
  syg_AccountHolderDomicileID?:       LookupRef | null;
  syg_dateofbirth?:                   string;
  syg_AccountHolderCountryofBirthID?: LookupRef | null;
  syg_uspersonstatus?:                1 | 2 | 3 | 4;
}

export interface RelatedPartyRow {
  syg_name?:                            string;
  syg_relatedpartyid:                   PartyRef;
  syg_relatedpartytypeid:               LookupRef;
  syg_relatedpartynationality1id?:      LookupRef | null;
  syg_relatedpartynationality2id?:      LookupRef | null;
  syg_relatedpartynationality3id?:      LookupRef | null;
  syg_domicilecountryid?:               LookupRef | null;
  syg_mainbusinessactivityid?:          LookupRef | null;
  syg_maincountryofbusinessactivityid?: LookupRef | null;
  syg_relatedcountries?:                string;
  syg_pep?:                             boolean;
  syg_pepstatusid?:                     LookupRef | null;
  syg_peplevelid?:                      LookupRef | null;
  syg_riskscore?:                       number;
}

export type PartyRef = ExistingPartyRef | CreateNewPartyRef;

export interface ExistingPartyRef {
  id:   string;
  name: string;
  etn:  'contact' | 'account';
}

export interface CreateNewPartyRef {
  etn:        'contact' | 'account';
  name:       string;
  createNew:  NewContactAttributes | NewAccountAttributes;
}

export interface NewContactAttributes {
  firstname?:                       string;
  lastname?:                        string;
  fullname?:                        string;
  new_typeofcontact:                9;        // Phase 1 ships value 9 — literal type prevents drift
  syg_dateofbirth?:                 string;
  syg_accountholdernationalityid?:  LookupRef;
  syg_accountholderdomicileid?:     LookupRef;
  emailaddress1?:                   string;
  telephone1?:                      string;
}

export interface NewAccountAttributes {
  new_typeofcontact:           9;        // Phase 1 ships value 9 — literal type prevents drift
  syg_domicilecountryid?:      LookupRef;
  syg_mainbusinessactivityid?: LookupRef;
  emailaddress1?:              string;
  telephone1?:                 string;
}

// === Financial Situation ===

export interface TotalWealthIncomeSection {
  syg_TotalWealth_currency?:            number;      // money — CHF fiat amount
  syg_TotalWealth?:                     number;      // OptionSet integer — banded total wealth; see optionSets.ts
  syg_annualincome?:                    number;      // OptionSet integer — annual income band; see optionSets.ts
  syg_TimeframeforWealthAccumulation?:  number;      // int — confirmed not narrative; likely "years" or banded code
}

export interface SourceOfWealthSection {
  narrative: string;
  items:     SourceOfWealthRow[];
}

export interface SourceOfWealthRow {
  syg_name?:                              string;
  syg_sourceofwealth?:                    number;
  syg_description?:                       string;
  syg_companyname?:                       string;
  syg_counterpartyname?:                  string;
  syg_relationshiptocounterparty?:        number;
  syg_businessactivityid?:                LookupRef;
  syg_countryid?:                         LookupRef;
  syg_yearofwealthgenerationid?:          LookupRef;
  syg_yearofwealthgenerationinitiatedid?: LookupRef;
  syg_initialinvestment?:                 number;
  syg_valueatvaluationdate?:              number;
  syg_valuationdate?:                     string;
  syg_wealthgenerated?:                   number;
  syg_corroboratedvalue?:                 number;
  syg_corroboratedpercentage?:            number;
  syg_rationale?:                         string;
  syg_supportinginformation?:             string;
  syg_additionaldetails?:                 string;
  syg_digitalassetactivities?:            number[];
}

export interface AssetAllocationSection {
  syg_TotalWealth_currency?:                  number;
  syg_wealthdistribution_cash_dec?:           number;
  syg_wealthdistribution_equities_dec?:       number;
  syg_wealthdistribution_fixedincome_dec?:    number;
  syg_wealthdistribution_digitalassets_dec?:  number;
  syg_wealthdistribution_realestate_dec?:     number;
  syg_wealthdistribution_commodities_dec?:    number;
  syg_wealthdistribution_other_dec?:          number;
}

export interface DigitalAssetHoldingRow {
  syg_name?:                  string;
  syg_digitalassetid?:        LookupRef;
  syg_amount?:                number;
  syg_currentvaluechf?:       number;
  syg_valuechf?:              number;
  syg_dateofvaluation?:       string;
  syg_acquiringyear?:         LookupRef;
  syg_acquiringplace?:        string;
  syg_averageacquiringprice?: number;
  syg_corroboratedamount?:    number;
  syg_corroboratedamountchf?: number;
  syg_corroboratedvalue?:     number;
  syg_currentcustody?:        string;
  syg_description?:           string;
  syg_originoffunds?:         string;
  syg_supportingdocuments?:   string;
}

// === Expected Activity ===

export interface IncomingFiatFundRow {
  syg_name?:              string;
  syg_amount?:            number;
  syg_bank?:              string;
  syg_bankdomicileid?:    LookupRef;
  syg_clientid?:          LookupRef;
  syg_proofofownership?:  boolean;
  syg_transfertimeframe?: number;
}

export interface DigitalAssetFundRow {
  syg_name?:                            string;
  syg_customerid?:                      LookupRef;
  syg_firstdigitalassettransfertype?:   LookupRef;
  syg_firstdigitalassettransferamount?: number;
  syg_firsttransferamount?:             number;
  syg_currentvaluechf?:                 number;
  syg_valuechf?:                        number;
  syg_dateofvaluation?:                 string;
  syg_proofofownership?:                boolean;
  syg_senderwallet?:                    string;
  syg_senderwallet_optionset?:          number;
  syg_source?:                          string;
  syg_transfertimeframe?:               number;
  syg_remarks?:                         string;
  syg_comment?:                         string;
  syg_additionalexpectedfunding?:       string;
}

// === Compliance & Other ===

export interface PepSanctionsRiskSection {
  syg_PEP?:                                       boolean;
  syg_pepstatus?:                                 0 | 1 | 2 | 3 | 4;
  syg_pepstatusid?:                               LookupRef;
  syg_peplevelid?:                                LookupRef;
  syg_pepdetails?:                                string;
  syg_pepderivationdetails?:                      string;
  syg_formerpepdetails?:                          string;

  syg_ReputationalRisk?:                          1 | 2 | 3;
  syg_mediascreeningandreputationalriskcomment?:  string;

  syg_SanctionCheck?:                             2 | 3;
  syg_sanctioncheckcomment?:                      string;
}

// =============================================================================
// Section status (persisted in takeoverStatus bound text field)
// =============================================================================

export type SectionState = 'na' | 'pending' | 'edited' | 'done' | 'partial-failed' | 'read-only';

export type SectionId =
  | 'findings' | 'proposedClientEmail'
  | 'personalDetails' | 'professionalExperience' | 'businessActivities' | 'countriesOfActivity' | 'relatedParties'
  | 'financialSituationNarrative' | 'totalWealthIncome' | 'sourceOfWealth' | 'currentAssetAllocation'
  | 'digitalAssetHoldingsNarrative' | 'detailedDAHoldings'
  | 'transactionalBehaviour' | 'plannedFiatFunds' | 'plannedDAFunds'
  | 'pepSanctionsRisk' | 'additionalComments';

export interface SectionResult {
  patched?:    number;
  created?:    number;
  associated?: number;
  failed?:     number;
}

export interface SectionError {
  rowIndex?: number;
  field?:    string;
  message:   string;
}

export interface SectionStatusRecord {
  state:        SectionState;
  lastRunAt?:   string;       // ISO 8601
  result?:      SectionResult;
  errors?:      SectionError[];
  payloadHash?: string;       // sha-1 hex of the serialised payload slice at takeover
}

export interface TakeoverStatusBlob {
  schemaVersion: '1.0';
  sections: Partial<Record<SectionId, SectionStatusRecord>>;
}
