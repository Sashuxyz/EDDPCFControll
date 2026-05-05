# KycFullTakeover Implementation Plan — Foundation Milestone

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the KycFullTakeover PCF control and ship a working v0.1.0 covering: project setup, payload contract, status persistence, two read-only sections (Findings + Proposed Email), all five narrative sections (Professional Experience, Financial Situation Narrative, Digital Asset Holdings Narrative, Transactional Behaviour, Additional Comments), and the takeover lifecycle for these sections.

**Architecture:** React 18 + createRoot, field-bound PCF, single root component (`KycFullTakeover.tsx`) with state managed in the PCF class. Sticky TOC sidebar + working pane layout. Section components read their slice of the AI payload, render editable form fields, and trigger one OData write per section on takeover. Per-section status persisted via JSON blob in a bound text field. Pure utilities (parser, formatters, OptionSet maps, status serializer, GUID validation) get jest unit tests; React + Dataverse code is verified via D365 deployment.

**Tech Stack:** React 18.2, TypeScript 4.9, pcf-scripts (production build), jest 29 (utilities only), Dataverse Web API (PATCH parent fields). No Fluent UI, inline styles only, manual zip packaging into `Solution/manual-pack/Controls/Syg.KycFullTakeover/`.

**Spec:** [docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md](../specs/2026-05-05-kycfulltakeover-design.md) — read before starting Task 1.
**Sample payload:** [docs/superpowers/specs/2026-05-05-kycfulltakeover-sample-payload.json](../specs/2026-05-05-kycfulltakeover-sample-payload.json) — primary fixture for parser tests.

---

## Foundation Milestone Scope

This plan delivers a deployable v0.1.0 covering 7 of 17 sections:

| Section | Type | Status |
|---|---|---|
| Findings | read-only | included |
| Proposed Email | read-only + action | included |
| Professional Experience | narrative | included |
| Financial Situation Narrative | narrative | included |
| Digital Asset Holdings Narrative | narrative | included |
| Transactional Behaviour | narrative | included |
| Additional Comments | narrative | included |
| Personal Details | field set | M3 (next plan) |
| Total Wealth and Income | field set | M3 |
| PEP/Adverse Media/Sanctions | field set | M3 |
| Asset Allocation | field set + copy-paste | M3 |
| Business Activities | N:N | M4 |
| Countries of Activity | N:N | M4 |
| Source of Wealth | itemized + narrative | M5 |
| Detailed DA Holdings | itemized | M5 |
| Planned Fiat Funds | itemized | M5 |
| Planned DA Funds | itemized | M5 |
| Related Parties | itemized + create-new | M6 |

Sections in M3-M6 render as `n/a` placeholder cards in the TOC during v0.1.0 — the framework supports them but the section components aren't built yet.

---

## File Structure

Files this plan creates or modifies. Each gets one clear responsibility.

### New control files (under `KycFullTakeover/`)

```
KycFullTakeover/
  package.json                   # npm metadata + scripts
  tsconfig.json                  # extends pcf-scripts base
  jest.config.js                 # jest setup (utilities only)
  KycFullTakeover.pcfproj        # MSBuild project file (mostly unused on macOS)
  ControlManifest.Input.xml      # PCF manifest (4 bound props + WebAPI feature)
  WRITTEN_FIELDS.md              # documents every Dataverse field written + section
  index.ts                       # PCF entry: init/updateView/destroy/getOutputs
  types.ts                       # TypeScript interfaces from spec schema appendix

  components/
    KycFullTakeover.tsx          # root: header strip + TOC + main pane
    HeaderStrip.tsx              # profile name + schemaVersion badge + last-run badge
    TocSidebar.tsx               # 5 groups, 17 entries, status icons
    SectionFrame.tsx             # section header + takeover button + status icon
    EmptyStatePane.tsx           # shown when no payload / unknown schemaVersion

    sections/
      FindingsSection.tsx        # read-only, severity-coloured cards
      ProposedEmailSection.tsx   # read-only + "Create E-mail" button
      NarrativeSection.tsx       # generic single-textarea section (5 instances)
      PlaceholderSection.tsx     # for sections in M3-M6, shows "Coming in next milestone"

    common/
      StatusIcon.tsx             # 6 states (n/a, pending, edited, done, partial-failed, read-only)
      LookupDisplay.tsx          # name-only chip (no GUID surface)

  utils/
    payloadParser.ts             # validates schemaVersion, returns typed sections
    sectionStatus.ts             # serialise/deserialise takeoverStatus JSON blob, hash slices
    formatters.ts                # Swiss apostrophe number, dd.MM.yyyy date
    optionSets.ts                # numeric → label maps (us-person, pep-status; rest stubbed)
    guidValidation.ts            # GUID regex
    dataverse.ts                 # OData URL builders + fetch wrappers (PATCH parent, openForm)
    confirmationDialog.ts        # 5 type-templated dialog strings + Xrm.Navigation.openConfirmDialog wrapper
    emailActivity.ts             # build openForm parameters for proposedClientEmail

  styles/
    tokens.ts                    # colours, spacing, typography (Segoe UI, brand blue, etc.)

  __tests__/
    payloadParser.test.ts
    sectionStatus.test.ts
    formatters.test.ts
    guidValidation.test.ts
    optionSets.test.ts
```

### Solution packaging changes

```
Solution/manual-pack/
  Controls/
    Syg.KycFullTakeover/         # NEW — bundle.js + ControlManifest.xml + strings/
      bundle.js
      ControlManifest.xml
      strings/
        KycFullTakeover.1033.resx
  customizations.xml             # MODIFY — add CustomControl entry
  solution.xml                   # MODIFY — add RootComponent type=66 + bump version
```

---

## Tasks

### Task 1: Scaffold project — package.json + tsconfig + pcfproj

**Files:**
- Create: `KycFullTakeover/package.json`
- Create: `KycFullTakeover/tsconfig.json`
- Create: `KycFullTakeover/KycFullTakeover.pcfproj`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "kyc-full-takeover",
  "version": "0.1.0",
  "description": "Full-section AI-payload takeover for KYC profile forms",
  "scripts": {
    "build": "pcf-scripts build --buildMode production",
    "clean": "pcf-scripts clean",
    "rebuild": "pcf-scripts clean && pcf-scripts build --buildMode production",
    "start": "pcf-scripts start watch",
    "test": "jest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/powerapps-component-framework": "^1.3.18",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "jest": "^29.7.0",
    "pcf-scripts": "^1",
    "pcf-start": "^1",
    "ts-jest": "^29.1.0",
    "typescript": "^4.9.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "./node_modules/pcf-scripts/tsconfig_base.json",
  "compilerOptions": {
    "outDir": "out",
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "exclude": ["__tests__", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create KycFullTakeover.pcfproj**

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project DefaultTargets="build" ToolsVersion="15.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <ProjectGuid>{a1b2c3d4-e5f6-4a5b-9c8d-fedcba987654}</ProjectGuid>
    <OutputPath>$(MSBuildThisFileDirectory)out\controls\</OutputPath>
  </PropertyGroup>
</Project>
```

- [ ] **Step 4: Run npm install**

Run: `cd KycFullTakeover && npm install`
Expected: clean install, no high-severity vulnerabilities. Creates `node_modules/`.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/package.json KycFullTakeover/tsconfig.json KycFullTakeover/KycFullTakeover.pcfproj KycFullTakeover/package-lock.json
git commit -m "feat(kyc-full-takeover): scaffold project (package.json, tsconfig, pcfproj)"
```

---

### Task 2: Manifest (ControlManifest.Input.xml)

**Files:**
- Create: `KycFullTakeover/ControlManifest.Input.xml`
- Create: `KycFullTakeover/strings/KycFullTakeover.1033.resx`

- [ ] **Step 1: Create ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="KycFullTakeover" version="0.1.0"
           display-name-key="KycFullTakeover_Display_Key"
           description-key="KycFullTakeover_Desc_Key"
           control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <property name="aiAnalyticsAudit"  display-name-key="aiAnalyticsAudit"  description-key="aiAnalyticsAudit_Desc"  of-type="Multiple"     usage="bound" required="true"  />
    <property name="takeoverStatus"    display-name-key="takeoverStatus"    description-key="takeoverStatus_Desc"    of-type="Multiple"     usage="bound" required="false" />
    <property name="takeoverLastRunAt" display-name-key="takeoverLastRunAt" description-key="takeoverLastRunAt_Desc" of-type="DateAndTime" usage="bound" required="false" />
    <property name="takeoverLastError" display-name-key="takeoverLastError" description-key="takeoverLastError_Desc" of-type="Multiple"     usage="bound" required="false" />
    <resources>
      <code path="index.ts" order="1" />
      <resx path="strings/KycFullTakeover.1033.resx" version="1.0.0" />
    </resources>
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
    </feature-usage>
  </control>
</manifest>
```

- [ ] **Step 2: Create strings file (minimal)**

```xml
<?xml version="1.0" encoding="utf-8"?>
<root>
  <xsd:schema xmlns="" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" id="root">
    <xsd:element name="root" msdata:IsDataSet="true">
    </xsd:element>
  </xsd:schema>
  <data name="KycFullTakeover_Display_Key">
    <value>KYC Full Takeover</value>
  </data>
  <data name="KycFullTakeover_Desc_Key">
    <value>Review and persist AI-extracted KYC profile data section by section.</value>
  </data>
  <data name="aiAnalyticsAudit"><value>AI Analytics Audit (JSON)</value></data>
  <data name="aiAnalyticsAudit_Desc"><value>Bound text field containing the agent-produced JSON payload (typically syg_aianalytics_audit).</value></data>
  <data name="takeoverStatus"><value>Takeover Status (JSON)</value></data>
  <data name="takeoverStatus_Desc"><value>Bound text field where the PCF persists per-section status, timestamps and payload hashes.</value></data>
  <data name="takeoverLastRunAt"><value>Last Run At</value></data>
  <data name="takeoverLastRunAt_Desc"><value>Timestamp of the most recent takeover operation across any section.</value></data>
  <data name="takeoverLastError"><value>Last Error</value></data>
  <data name="takeoverLastError_Desc"><value>Most recent failure message; cleared on next successful section takeover.</value></data>
</root>
```

- [ ] **Step 3: Build to verify manifest is valid**

Run: `cd KycFullTakeover && npm run build`
Expected: build fails because `index.ts` doesn't exist yet — that's OK; we just want manifest to parse. Look for "Validating control" success line before the index.ts error.

- [ ] **Step 4: Commit**

```bash
git add KycFullTakeover/ControlManifest.Input.xml KycFullTakeover/strings/
git commit -m "feat(kyc-full-takeover): add control manifest (4 bound props, WebAPI feature)"
```

---

### Task 3: Jest configuration

**Files:**
- Create: `KycFullTakeover/jest.config.js`
- Create: `KycFullTakeover/__tests__/.gitkeep`

- [ ] **Step 1: Create jest.config.js**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { strict: true, esModuleInterop: true } }],
  },
};
```

- [ ] **Step 2: Verify jest runs (no tests yet)**

Run: `cd KycFullTakeover && npm test`
Expected: "No tests found" — exit code 1 is fine here (we just want jest to load).

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/jest.config.js KycFullTakeover/__tests__/
git commit -m "feat(kyc-full-takeover): add jest config for utility tests"
```

---

### Task 4: Type definitions (types.ts)

**Files:**
- Create: `KycFullTakeover/types.ts`

- [ ] **Step 1: Create types.ts with all interfaces from the spec**

```ts
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
  new_typeofcontact:                number;        // Phase 1 ships value 9
  syg_dateofbirth?:                 string;
  syg_accountholdernationalityid?:  LookupRef;
  syg_accountholderdomicileid?:     LookupRef;
  emailaddress1?:                   string;
  telephone1?:                      string;
}

export interface NewAccountAttributes {
  new_typeofcontact:           number;        // Phase 1 ships value 9
  syg_domicilecountryid?:      LookupRef;
  syg_mainbusinessactivityid?: LookupRef;
  emailaddress1?:              string;
  telephone1?:                 string;
}

// === Financial Situation ===

export interface TotalWealthIncomeSection {
  syg_TotalWealth_currency?:           number;
  syg_TotalWealth?:                    number;
  syg_annualincome?:                   number;
  syg_TimeframeforWealthAccumulation?: number;
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
  syg_pepstatus?:                                 number;
  syg_pepstatusid?:                               LookupRef;
  syg_peplevelid?:                                LookupRef;
  syg_pepdetails?:                                string;
  syg_pepderivationdetails?:                      string;
  syg_formerpepdetails?:                          string;

  syg_ReputationalRisk?:                          number;
  syg_mediascreeningandreputationalriskcomment?:  string;

  syg_SanctionCheck?:                             number;
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

export interface SectionStatusRecord {
  state:      SectionState;
  lastRunAt?: string;       // ISO 8601
  result?:    {
    patched?: number;
    created?: number;
    associated?: number;
    failed?:  number;
  };
  errors?:    Array<{ rowIndex?: number; field?: string; message: string }>;
  payloadHash?: string;     // sha-1 hex of the serialised payload slice at takeover
}

export interface TakeoverStatusBlob {
  schemaVersion: '1.0';
  sections: Partial<Record<SectionId, SectionStatusRecord>>;
}
```

- [ ] **Step 2: Verify file compiles standalone**

Run: `cd KycFullTakeover && npx tsc --noEmit types.ts`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/types.ts
git commit -m "feat(kyc-full-takeover): add TypeScript types from spec schema appendix"
```

---

### Task 5: GUID validation utility (TDD)

**Files:**
- Create: `KycFullTakeover/utils/guidValidation.ts`
- Create: `KycFullTakeover/__tests__/guidValidation.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/guidValidation.test.ts
import { isValidGuid, cleanGuid } from '../utils/guidValidation';

describe('isValidGuid', () => {
  test.each([
    ['11111111-2222-4333-8444-555555555555', true],
    ['11111111-2222-4333-A444-555555555555', true],
    ['{11111111-2222-4333-8444-555555555555}', false],   // braces not allowed
    ['11111111222243338444555555555555', false],          // dashes required
    ['', false],
    ['not-a-guid', false],
    [null as unknown as string, false],
    [undefined as unknown as string, false],
  ])('isValidGuid(%j) === %s', (input, expected) => {
    expect(isValidGuid(input)).toBe(expected);
  });
});

describe('cleanGuid', () => {
  test('strips braces', () => {
    expect(cleanGuid('{11111111-2222-4333-8444-555555555555}')).toBe('11111111-2222-4333-8444-555555555555');
  });
  test('lowercases hex', () => {
    expect(cleanGuid('11111111-2222-4333-A444-555555555555')).toBe('11111111-2222-4333-a444-555555555555');
  });
  test('returns empty string for null/undefined', () => {
    expect(cleanGuid(null)).toBe('');
    expect(cleanGuid(undefined)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=guidValidation`
Expected: FAIL — "Cannot find module '../utils/guidValidation'".

- [ ] **Step 3: Write the implementation**

```ts
// utils/guidValidation.ts
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(s: unknown): boolean {
  return typeof s === 'string' && GUID_REGEX.test(s);
}

export function cleanGuid(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[{}]/g, '').toLowerCase();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=guidValidation`
Expected: PASS — 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/guidValidation.ts KycFullTakeover/__tests__/guidValidation.test.ts
git commit -m "feat(kyc-full-takeover): GUID validation utility with tests"
```

---

### Task 6: Formatters utility (TDD)

**Files:**
- Create: `KycFullTakeover/utils/formatters.ts`
- Create: `KycFullTakeover/__tests__/formatters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/formatters.test.ts
import { formatSwissNumber, formatSwissDate, parseSwissNumber } from '../utils/formatters';

describe('formatSwissNumber', () => {
  test.each([
    [1000, "1'000"],
    [1000000, "1'000'000"],
    [12345.67, "12'345.67"],
    [0, '0'],
    [null, ''],
    [undefined, ''],
  ])('formatSwissNumber(%j) === %j', (input, expected) => {
    expect(formatSwissNumber(input as number)).toBe(expected);
  });
});

describe('parseSwissNumber', () => {
  test.each([
    ["1'000", 1000],
    ["12'345.67", 12345.67],
    ['1000000', 1000000],
    ['', null],
    ['abc', null],
  ])('parseSwissNumber(%j) === %j', (input, expected) => {
    expect(parseSwissNumber(input)).toBe(expected);
  });
});

describe('formatSwissDate', () => {
  test('formats ISO date as dd.MM.yyyy', () => {
    expect(formatSwissDate('1972-04-12')).toBe('12.04.1972');
  });
  test('handles ISO datetime', () => {
    expect(formatSwissDate('2026-05-05T10:32:11Z')).toBe('05.05.2026');
  });
  test('returns empty for invalid input', () => {
    expect(formatSwissDate('')).toBe('');
    expect(formatSwissDate(null as unknown as string)).toBe('');
    expect(formatSwissDate('not-a-date')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=formatters`
Expected: FAIL — "Cannot find module '../utils/formatters'".

- [ ] **Step 3: Write the implementation**

```ts
// utils/formatters.ts
// Swiss number formatting: 1'000'000.50 (apostrophe thousands, dot decimal).
// Swiss-German date: dd.MM.yyyy via toLocaleDateString('de-CH').

export function formatSwissNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !isFinite(n)) return '';
  // Use a regex to inject apostrophes; Intl.NumberFormat de-CH varies by runtime.
  const [whole, frac] = String(n).split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return frac !== undefined ? `${groupedWhole}.${frac}` : groupedWhole;
}

export function parseSwissNumber(s: string): number | null {
  if (typeof s !== 'string' || s.trim() === '') return null;
  const cleaned = s.replace(/'/g, '').trim();
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

export function formatSwissDate(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso === '') return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=formatters`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/formatters.ts KycFullTakeover/__tests__/formatters.test.ts
git commit -m "feat(kyc-full-takeover): Swiss number + date formatters with tests"
```

---

### Task 7: OptionSet maps utility (TDD)

**Files:**
- Create: `KycFullTakeover/utils/optionSets.ts`
- Create: `KycFullTakeover/__tests__/optionSets.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/optionSets.test.ts
import { US_PERSON_STATUS, getOptionLabel } from '../utils/optionSets';

describe('US_PERSON_STATUS map', () => {
  test('confirmed values from spec', () => {
    expect(US_PERSON_STATUS).toEqual({
      1: 'Not a US Person',
      2: 'Former US Person',
      3: 'US Person',
      4: 'US Nexus',
    });
  });
});

describe('getOptionLabel', () => {
  test('returns label for known value', () => {
    expect(getOptionLabel(US_PERSON_STATUS, 3)).toBe('US Person');
  });
  test('returns "(unknown N)" for unknown value', () => {
    expect(getOptionLabel(US_PERSON_STATUS, 99)).toBe('(unknown 99)');
  });
  test('returns empty for null/undefined', () => {
    expect(getOptionLabel(US_PERSON_STATUS, null)).toBe('');
    expect(getOptionLabel(US_PERSON_STATUS, undefined)).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=optionSets`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// utils/optionSets.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=optionSets`
Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/optionSets.ts KycFullTakeover/__tests__/optionSets.test.ts
git commit -m "feat(kyc-full-takeover): OptionSet maps (confirmed: us-person, stubs: rest)"
```

---

### Task 8: Section status persistence (TDD)

**Files:**
- Create: `KycFullTakeover/utils/sectionStatus.ts`
- Create: `KycFullTakeover/__tests__/sectionStatus.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/sectionStatus.test.ts
import {
  parseStatusBlob,
  serialiseStatusBlob,
  initialStatus,
  setSectionState,
  hashSlice,
} from '../utils/sectionStatus';
import { TakeoverStatusBlob } from '../types';

describe('parseStatusBlob', () => {
  test('returns initial status for empty/missing input', () => {
    expect(parseStatusBlob('')).toEqual(initialStatus());
    expect(parseStatusBlob(null)).toEqual(initialStatus());
    expect(parseStatusBlob(undefined)).toEqual(initialStatus());
  });
  test('returns initial status when JSON is invalid', () => {
    expect(parseStatusBlob('{not json')).toEqual(initialStatus());
  });
  test('returns initial status when schemaVersion mismatches', () => {
    const bad = JSON.stringify({ schemaVersion: '2.0', sections: {} });
    expect(parseStatusBlob(bad)).toEqual(initialStatus());
  });
  test('round-trips a valid blob', () => {
    const blob: TakeoverStatusBlob = {
      schemaVersion: '1.0',
      sections: {
        professionalExperience: { state: 'done', lastRunAt: '2026-05-05T10:00:00Z', result: { patched: 1 } },
      },
    };
    const json = serialiseStatusBlob(blob);
    expect(parseStatusBlob(json)).toEqual(blob);
  });
});

describe('setSectionState', () => {
  test('mutates immutably (returns new blob)', () => {
    const before = initialStatus();
    const after = setSectionState(before, 'additionalComments', { state: 'done', result: { patched: 1 } });
    expect(before.sections.additionalComments).toBeUndefined();
    expect(after.sections.additionalComments).toEqual({ state: 'done', result: { patched: 1 } });
  });
});

describe('hashSlice', () => {
  test('returns same hash for equivalent payloads', () => {
    const a = { foo: 'bar', n: 1 };
    const b = { n: 1, foo: 'bar' };
    expect(hashSlice(a)).toBe(hashSlice(b));
  });
  test('returns different hash for different payloads', () => {
    expect(hashSlice({ foo: 'bar' })).not.toBe(hashSlice({ foo: 'baz' }));
  });
  test('hash is hex string of length 40 (sha-1)', () => {
    expect(hashSlice({ x: 1 })).toMatch(/^[0-9a-f]{40}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=sectionStatus`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// utils/sectionStatus.ts
import { SectionId, SectionStatusRecord, TakeoverStatusBlob } from '../types';

export function initialStatus(): TakeoverStatusBlob {
  return { schemaVersion: '1.0', sections: {} };
}

export function parseStatusBlob(raw: string | null | undefined): TakeoverStatusBlob {
  if (typeof raw !== 'string' || raw.trim() === '') return initialStatus();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== '1.0' || typeof parsed.sections !== 'object') {
      return initialStatus();
    }
    return parsed as TakeoverStatusBlob;
  } catch {
    return initialStatus();
  }
}

export function serialiseStatusBlob(blob: TakeoverStatusBlob): string {
  return JSON.stringify(blob);
}

export function setSectionState(
  blob: TakeoverStatusBlob,
  id: SectionId,
  record: SectionStatusRecord
): TakeoverStatusBlob {
  return {
    ...blob,
    sections: { ...blob.sections, [id]: record },
  };
}

// Stable JSON-stringify with sorted keys, then sha-1 hex. Used to detect
// "agent payload changed since last takeover" without storing the payload.
export function hashSlice(slice: unknown): string {
  return sha1Hex(stableStringify(slice));
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify((v as Record<string, unknown>)[k])).join(',') + '}';
}

// Minimal pure-JS sha-1 implementation; avoids a node:crypto dependency that
// would tree-shake out of the browser build but trip jest's module resolution.
function sha1Hex(s: string): string {
  function rotl(x: number, n: number): number { return (x << n) | (x >>> (32 - n)); }
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const len = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = len * 8;
  for (let i = 7; i >= 0; i--) bytes.push((bitLen >>> (i * 8)) & 0xff);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);

  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[chunk + i * 4] << 24) | (bytes[chunk + i * 4 + 1] << 16) |
             (bytes[chunk + i * 4 + 2] << 8) | bytes[chunk + i * 4 + 3];
    }
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20)      { f = (b & c) | (~b & d);          k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d;                   k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else             { f = b ^ c ^ d;                   k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) | 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=sectionStatus`
Expected: PASS — 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/sectionStatus.ts KycFullTakeover/__tests__/sectionStatus.test.ts
git commit -m "feat(kyc-full-takeover): section status persistence + payload hashing"
```

---

### Task 9: Payload parser (TDD)

**Files:**
- Create: `KycFullTakeover/utils/payloadParser.ts`
- Create: `KycFullTakeover/__tests__/payloadParser.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/payloadParser.test.ts
import { parsePayload, ParseResult } from '../utils/payloadParser';
import * as fs from 'fs';
import * as path from 'path';

const samplePath = path.join(__dirname, '..', '..', 'docs', 'superpowers', 'specs', '2026-05-05-kycfulltakeover-sample-payload.json');
const sampleJson = fs.readFileSync(samplePath, 'utf-8');

describe('parsePayload', () => {
  test('rejects empty / invalid input', () => {
    expect(parsePayload('').ok).toBe(false);
    expect(parsePayload(null).ok).toBe(false);
    expect(parsePayload('{not json').ok).toBe(false);
  });

  test('rejects unknown major schemaVersion', () => {
    const result = parsePayload(JSON.stringify({ schemaVersion: '2.0' }));
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toMatch(/schemaVersion/);
  });

  test('accepts a 1.x payload', () => {
    const result = parsePayload(JSON.stringify({ schemaVersion: '1.0' }));
    expect(result.ok).toBe(true);
  });

  test('accepts the spec sample payload and exposes typed sections', () => {
    const result = parsePayload(sampleJson) as ParseResult & { ok: true };
    expect(result.ok).toBe(true);
    expect(result.payload.schemaVersion).toBe('1.0');
    expect(result.payload.findings).toHaveLength(2);
    expect(result.payload.proposedClientEmail?.to[0].etn).toBe('lead');
    expect(result.payload.relatedParties).toHaveLength(3);

    // The third related party uses CreateNewPartyRef
    const sofia = result.payload.relatedParties![2];
    expect('createNew' in sofia.syg_relatedpartyid).toBe(true);
  });

  test('isPartyRefNew discriminates correctly', () => {
    const { isPartyRefNew } = require('../utils/payloadParser');
    expect(isPartyRefNew({ id: 'x', name: 'y', etn: 'contact' })).toBe(false);
    expect(isPartyRefNew({ etn: 'contact', name: 'y', createNew: { new_typeofcontact: 9 } })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=payloadParser`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// utils/payloadParser.ts
import { KycPayload, PartyRef, CreateNewPartyRef, ExistingPartyRef } from '../types';

export type ParseResult =
  | { ok: true;  payload: KycPayload }
  | { ok: false; error: string };

export function parsePayload(raw: string | null | undefined): ParseResult {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { ok: false, error: 'empty payload' };
  }
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `JSON parse failed: ${(e as Error).message}` };
  }
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'payload root is not an object' };
  }
  const sv = (obj as { schemaVersion?: unknown }).schemaVersion;
  if (typeof sv !== 'string' || !sv.startsWith('1.')) {
    return { ok: false, error: `unsupported schemaVersion: ${sv}` };
  }
  // Phase 1 trusts the agent's structure; deep validation is plan-implementation
  // detail (M3-M6 will harden specific section parsers as they're built).
  return { ok: true, payload: obj as KycPayload };
}

export function isPartyRefNew(ref: PartyRef): ref is CreateNewPartyRef {
  return 'createNew' in ref;
}

export function isPartyRefExisting(ref: PartyRef): ref is ExistingPartyRef {
  return 'id' in ref && typeof (ref as ExistingPartyRef).id === 'string';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=payloadParser`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add KycFullTakeover/utils/payloadParser.ts KycFullTakeover/__tests__/payloadParser.test.ts
git commit -m "feat(kyc-full-takeover): payload parser + PartyRef discriminator"
```

---

### Task 10: Confirmation dialog templates

**Files:**
- Create: `KycFullTakeover/utils/confirmationDialog.ts`

- [ ] **Step 1: Write the dialog templates + Xrm wrapper**

```ts
// utils/confirmationDialog.ts
// Five type-templated confirmation dialogs. Triggered via Xrm.Navigation.openConfirmDialog.
// See spec section "Confirmation dialogs" for the canonical copy.

export type SectionDialogType =
  | 'narrative'
  | 'fieldSet'
  | 'itemized'
  | 'itemizedWithCreates'
  | 'nton';

export interface DialogParams {
  type:           SectionDialogType;
  sectionLabel:   string;          // human label of the section ("Personal Details")
  fieldLabel?:    string;          // for narrative type ("Professional Experience Summary")
  fieldCount?:    number;          // for fieldSet type
  itemCount?:     number;          // for itemized / nton type
  entityLabel?:   string;          // for itemized / nton ("Source of Wealth", "Country")
  // for itemizedWithCreates (Related Parties only):
  newContactCount?: number;
  newAccountCount?: number;
  existingCount?:   number;
  newRecordNames?:  string[];      // shown on second line
  // for re-run modifier:
  isReRun?: boolean;
}

export function buildDialogText(p: DialogParams): { title: string; subtitle?: string } {
  const reRunSuffix = (() => {
    if (!p.isReRun) return '';
    if (p.type === 'itemized' || p.type === 'itemizedWithCreates') {
      return '\n\n⚠ Already taken over once — this will create duplicate records. Delete existing rows manually first if you want a clean re-import.';
    }
    if (p.type === 'nton') {
      return '\n\n⚠ Already-associated records will be silently ignored; only missing associations will be added.';
    }
    return '';   // narrative + fieldSet are idempotent
  })();

  switch (p.type) {
    case 'narrative':
      return {
        title: `Replace ${p.fieldLabel ?? p.sectionLabel} with the AI-extracted text? Existing content will be overwritten.${reRunSuffix}`,
      };
    case 'fieldSet':
      return {
        title: `Update ${p.fieldCount ?? 0} fields in ${p.sectionLabel}? Existing values will be replaced.${reRunSuffix}`,
      };
    case 'itemized':
      return {
        title: `Create ${p.itemCount ?? 0} ${p.entityLabel ?? 'record'}(s)? This will add new rows to the ${p.entityLabel ?? 'record'} subgrid.${reRunSuffix}`,
      };
    case 'itemizedWithCreates': {
      const total = (p.existingCount ?? 0) + (p.newContactCount ?? 0) + (p.newAccountCount ?? 0);
      const breakdown = `${p.existingCount ?? 0} existing + ${(p.newContactCount ?? 0) + (p.newAccountCount ?? 0)} new`;
      const main = `This takeover will create ${p.newContactCount ?? 0} new contact(s), ${p.newAccountCount ?? 0} new account(s), and link ${total} related part(y/ies) total (${breakdown}). New contact/account creation cannot be undone automatically. Proceed?${reRunSuffix}`;
      const subtitle = (p.newRecordNames && p.newRecordNames.length > 0)
        ? 'New records: ' + p.newRecordNames.join(', ')
        : undefined;
      return { title: main, subtitle };
    }
    case 'nton':
      return {
        title: `Associate this profile with ${p.itemCount ?? 0} ${p.entityLabel ?? 'record'}(s)?${reRunSuffix}`,
      };
  }
}

interface XrmNavigationLike {
  openConfirmDialog?: (
    confirmStrings: { title?: string; subtitle?: string; text?: string; confirmButtonLabel?: string; cancelButtonLabel?: string }
  ) => Promise<{ confirmed: boolean }>;
}

// Returns true if the user confirmed; false if cancelled or Xrm unavailable.
export async function showConfirmation(p: DialogParams): Promise<boolean> {
  const { title, subtitle } = buildDialogText(p);
  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigationLike } }).Xrm;
  if (!xrm?.Navigation?.openConfirmDialog) {
    // eslint-disable-next-line no-console
    console.warn('[KycFullTakeover] Xrm.Navigation.openConfirmDialog unavailable — auto-cancel');
    return false;
  }
  try {
    const result = await xrm.Navigation.openConfirmDialog({
      title: 'Confirm takeover',
      subtitle,
      text: title,
      confirmButtonLabel: 'Take over',
      cancelButtonLabel:  'Cancel',
    });
    return result.confirmed === true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[KycFullTakeover] confirmation dialog failed', e);
    return false;
  }
}
```

- [ ] **Step 2: Quick smoke test the templates**

Add a tiny test file to validate the strings:

```ts
// __tests__/confirmationDialog.test.ts
import { buildDialogText } from '../utils/confirmationDialog';

describe('buildDialogText', () => {
  test('narrative', () => {
    const r = buildDialogText({ type: 'narrative', sectionLabel: 'X', fieldLabel: 'Professional Experience Summary' });
    expect(r.title).toContain('Replace Professional Experience Summary');
  });
  test('fieldSet count interpolation', () => {
    const r = buildDialogText({ type: 'fieldSet', sectionLabel: 'Personal Details', fieldCount: 7 });
    expect(r.title).toContain('Update 7 fields in Personal Details');
  });
  test('itemized re-run modifier', () => {
    const r = buildDialogText({ type: 'itemized', sectionLabel: 'X', entityLabel: 'Source of Wealth', itemCount: 3, isReRun: true });
    expect(r.title).toContain('duplicate records');
  });
  test('itemizedWithCreates lists new records', () => {
    const r = buildDialogText({
      type: 'itemizedWithCreates', sectionLabel: 'Related Parties',
      newContactCount: 2, newAccountCount: 1, existingCount: 3,
      newRecordNames: ['Anna', 'Sofia', 'Rossi Holdings AG'],
    });
    expect(r.title).toContain('2 new contact(s), 1 new account(s)');
    expect(r.title).toContain('6 related part(y/ies)');
    expect(r.subtitle).toBe('New records: Anna, Sofia, Rossi Holdings AG');
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd KycFullTakeover && npm test -- --testPathPattern=confirmationDialog`
Expected: PASS — 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add KycFullTakeover/utils/confirmationDialog.ts KycFullTakeover/__tests__/confirmationDialog.test.ts
git commit -m "feat(kyc-full-takeover): 5 confirmation dialog templates + Xrm wrapper"
```

---

### Task 11: Dataverse layer (URL builders + PATCH wrapper)

**Files:**
- Create: `KycFullTakeover/utils/dataverse.ts`

- [ ] **Step 1: Write the implementation**

```ts
// utils/dataverse.ts
// Thin wrapper around context.webAPI for the operations Phase 1 needs:
//   - PATCH parent KYC profile (used by all narrative + field-set sections)
// POST children, $ref POST for N:N, and contact/account creation come in M4-M6.

import { isValidGuid } from './guidValidation';

type WebAPI = ComponentFramework.WebApi;

export interface PatchResult {
  ok:    boolean;
  error?: string;
}

export async function patchKycProfile(
  webAPI: WebAPI,
  profileId: string,
  fields: Record<string, unknown>
): Promise<PatchResult> {
  if (!isValidGuid(profileId)) {
    return { ok: false, error: `invalid profileId: ${profileId}` };
  }
  if (Object.keys(fields).length === 0) {
    return { ok: true };  // nothing to write — still success
  }
  try {
    await webAPI.updateRecord('syg_kycprofile', profileId, fields);
    return { ok: true };
  } catch (e) {
    const err = e as { message?: string; toString?: () => string };
    return { ok: false, error: err.message ?? err.toString?.() ?? 'unknown error' };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors. (Note: types reference `ComponentFramework` from `@types/powerapps-component-framework`.)

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/utils/dataverse.ts
git commit -m "feat(kyc-full-takeover): dataverse layer (PATCH parent KYC profile)"
```

---

### Task 12: Email activity helper

**Files:**
- Create: `KycFullTakeover/utils/emailActivity.ts`

- [ ] **Step 1: Write the helper**

```ts
// utils/emailActivity.ts
// Builds the parameters for Xrm.Navigation.openForm to open a pre-populated
// email activity record. The "regarding" lookup binds the email to the KYC
// profile; "to" is the proposed recipient (typically a lead in Phase 1).

import { ProposedEmail } from '../types';

interface XrmNavigationLike {
  openForm?: (options: {
    entityName: string;
    createFromEntity?: { entityType: string; id: string; name?: string };
  }, parameters?: Record<string, unknown>) => Promise<unknown>;
}

export async function openProposedEmail(
  email: ProposedEmail,
  kycProfileId: string,
  kycProfileName: string,
): Promise<{ ok: boolean; error?: string }> {
  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigationLike } }).Xrm;
  if (!xrm?.Navigation?.openForm) {
    return { ok: false, error: 'Xrm.Navigation.openForm unavailable' };
  }

  // Compose partylist string for "to" — D365 accepts lead/contact/account refs
  // in the "to" parameter as a semicolon-separated list of GUIDs prefixed by
  // entity logical name. The simpler approach used here: pass via the form
  // parameters dict, which D365 maps to the email form's "to" partylist.
  const toParam = email.to.map((ref) => ({
    id:           ref.id,
    name:         ref.name,
    entityType:   ref.etn ?? 'lead',
  }));

  try {
    await xrm.Navigation.openForm(
      { entityName: 'email' },
      {
        subject:     email.subject,
        description: email.body,
        regardingobjectid:        kycProfileId,
        regardingobjectidname:    kycProfileName,
        regardingobjectidtype:    'syg_kycprofile',
        to: JSON.stringify(toParam),
      },
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}
```

- [ ] **Step 2: Verify TS compiles**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/utils/emailActivity.ts
git commit -m "feat(kyc-full-takeover): emailActivity helper (Xrm.Navigation.openForm)"
```

---

### Task 13: Style tokens

**Files:**
- Create: `KycFullTakeover/styles/tokens.ts`

- [ ] **Step 1: Write the tokens file**

```ts
// styles/tokens.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add KycFullTakeover/styles/tokens.ts
git commit -m "feat(kyc-full-takeover): style tokens (colors, typography, spacing, inputStyle)"
```

---

### Task 14: StatusIcon component

**Files:**
- Create: `KycFullTakeover/components/common/StatusIcon.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/common/StatusIcon.tsx
import * as React from 'react';
import { SectionState } from '../../types';
import { colors } from '../../styles/tokens';

interface StatusIconProps {
  state: SectionState;
  size?: number;
}

const config: Record<SectionState, { fill: string; ring: string; halo?: boolean; split?: boolean }> = {
  'na':              { fill: 'transparent',     ring: colors.textMuted },
  'pending':         { fill: colors.textMuted,  ring: colors.textMuted },
  'edited':          { fill: colors.brand,      ring: colors.brand,      halo: true },
  'done':            { fill: colors.success,    ring: colors.success },
  'partial-failed':  { fill: colors.success,    ring: colors.error,      split: true },
  'read-only':       { fill: 'transparent',     ring: colors.textMuted },
};

export const StatusIcon: React.FC<StatusIconProps> = ({ state, size = 14 }) => {
  const c = config[state];
  const r = size / 2;

  if (c.split) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={state}>
        <path d={`M ${r} 0 A ${r} ${r} 0 0 1 ${r} ${size} Z`} fill={colors.success} />
        <path d={`M ${r} 0 A ${r} ${r} 0 0 0 ${r} ${size} Z`} fill={colors.error} />
        <circle cx={r} cy={r} r={r - 1} fill="none" stroke={c.ring} strokeWidth={1} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={state}>
      {c.halo && <circle cx={r} cy={r} r={r} fill={c.fill} opacity={0.25} />}
      <circle cx={r} cy={r} r={r - 2} fill={c.fill} stroke={c.ring} strokeWidth={1.5} />
    </svg>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/common/StatusIcon.tsx
git commit -m "feat(kyc-full-takeover): StatusIcon (6 states: na/pending/edited/done/partial-failed/read-only)"
```

---

### Task 15: LookupDisplay component (name-only)

**Files:**
- Create: `KycFullTakeover/components/common/LookupDisplay.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/common/LookupDisplay.tsx
// Renders a lookup as plain name-only text. Per spec: GUIDs are NEVER shown
// to the RM — no debug tooltip, no copy-GUID affordance.

import * as React from 'react';
import { LookupRef } from '../../types';
import { colors, typography } from '../../styles/tokens';

interface LookupDisplayProps {
  value: LookupRef | null | undefined;
  emptyLabel?: string;
}

export const LookupDisplay: React.FC<LookupDisplayProps> = ({ value, emptyLabel = '—' }) => {
  if (!value) return <span style={{ color: colors.textMuted }}>{emptyLabel}</span>;
  return (
    <span style={{
      color:      colors.textPrimary,
      fontFamily: typography.fontFamily,
      fontSize:   typography.fontSizeBody,
    }}>
      {value.name}
    </span>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/common/LookupDisplay.tsx
git commit -m "feat(kyc-full-takeover): LookupDisplay component (name-only, no GUID surface)"
```

---

### Task 16: SectionFrame component

**Files:**
- Create: `KycFullTakeover/components/SectionFrame.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/SectionFrame.tsx
// Shared header bar for every takeover section: title, status icon,
// "Take over" / "Take over again" button, and a status-specific subtitle
// (e.g. "Last run 12.04.2026 at 10:32" when done).

import * as React from 'react';
import { StatusIcon } from './common/StatusIcon';
import { SectionState } from '../types';
import { colors, typography, spacing } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';

interface SectionFrameProps {
  title:        string;
  state:        SectionState;
  count?:       number;          // shown in button label, e.g. "Take over (3)"
  lastRunAt?:   string;
  errorMsg?:    string;
  onTakeover?:  () => void;      // omit for read-only sections
  children:     React.ReactNode;
}

export const SectionFrame: React.FC<SectionFrameProps> = ({
  title, state, count, lastRunAt, errorMsg, onTakeover, children,
}) => {
  const isReadOnly = state === 'read-only';
  const isHidden   = state === 'na';
  if (isHidden) return null;

  const buttonLabel = (() => {
    if (isReadOnly) return null;
    const verb = (state === 'done' || state === 'partial-failed') ? 'Take over again' : 'Take over';
    return count !== undefined ? `${verb} (${count})` : verb;
  })();

  const subtitle = (() => {
    if (errorMsg) return <span style={{ color: colors.error }}>{errorMsg}</span>;
    if (lastRunAt) return `Last run ${formatSwissDate(lastRunAt)}`;
    return null;
  })();

  return (
    <section style={{
      marginBottom:  spacing.xl,
      background:    colors.cardBg,
      border:        `1px solid ${colors.borderStandard}`,
      borderRadius:  6,
    }}>
      <header style={{
        display:        'flex',
        alignItems:     'center',
        gap:            spacing.sm,
        padding:        `${spacing.sm}px ${spacing.lg}px`,
        borderBottom:   `1px solid ${colors.borderStandard}`,
        background:     colors.sectionBg,
      }}>
        <StatusIcon state={state} />
        <span style={{
          flex:       1,
          fontWeight: typography.fontWeightBold,
          fontSize:   typography.fontSizeTitle,
          color:      colors.textPrimary,
        }}>{title}</span>
        {subtitle && (
          <span style={{
            fontSize:   typography.fontSizeLabel,
            color:      colors.textSecondary,
          }}>{subtitle}</span>
        )}
        {buttonLabel && (
          <button
            type="button"
            onClick={onTakeover}
            style={{
              fontSize:    typography.fontSizeSmall,
              fontWeight:  typography.fontWeightBold,
              color:       colors.textOnBrand,
              background:  colors.brand,
              border:      'none',
              borderRadius: 4,
              padding:     `6px ${spacing.md}px`,
              cursor:      'pointer',
              fontFamily:  typography.fontFamily,
            }}
          >{buttonLabel}</button>
        )}
      </header>
      <div style={{ padding: spacing.lg }}>
        {children}
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/SectionFrame.tsx
git commit -m "feat(kyc-full-takeover): SectionFrame component (header + button + status)"
```

---

### Task 17: HeaderStrip component

**Files:**
- Create: `KycFullTakeover/components/HeaderStrip.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/HeaderStrip.tsx
// Top bar showing the KYC profile name + AI payload schema version + last-run
// timestamp. Renders above the main grid (TOC + content).

import * as React from 'react';
import { colors, typography, spacing } from '../styles/tokens';
import { formatSwissDate } from '../utils/formatters';

interface HeaderStripProps {
  profileName?:    string;
  schemaVersion?:  string;
  lastRunAt?:      string;
}

export const HeaderStrip: React.FC<HeaderStripProps> = ({ profileName, schemaVersion, lastRunAt }) => (
  <div style={{
    display:       'flex',
    alignItems:    'center',
    gap:           spacing.lg,
    padding:       `${spacing.md}px ${spacing.lg}px`,
    background:    colors.brand,
    color:         colors.textOnBrand,
    fontFamily:    typography.fontFamily,
  }}>
    <span style={{ fontSize: typography.fontSizeTitle, fontWeight: typography.fontWeightBold }}>
      KYC Full Takeover{profileName ? ` — ${profileName}` : ''}
    </span>
    <span style={{ flex: 1 }} />
    {schemaVersion && (
      <span style={{
        fontSize:    typography.fontSizeLabel,
        background:  'rgba(255,255,255,0.18)',
        padding:     `2px ${spacing.sm}px`,
        borderRadius: 3,
      }}>schema {schemaVersion}</span>
    )}
    {lastRunAt && (
      <span style={{ fontSize: typography.fontSizeLabel }}>
        last run {formatSwissDate(lastRunAt)}
      </span>
    )}
  </div>
);
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/HeaderStrip.tsx
git commit -m "feat(kyc-full-takeover): HeaderStrip (profile name + schema badge + last run)"
```

---

### Task 18: TocSidebar component

**Files:**
- Create: `KycFullTakeover/components/TocSidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/TocSidebar.tsx
// Sticky left sidebar with 5 groups, 17 entries, status icon per entry,
// scrollspy-style highlight for the section currently in view.

import * as React from 'react';
import { StatusIcon } from './common/StatusIcon';
import { SectionId, SectionState } from '../types';
import { colors, typography, spacing, layout } from '../styles/tokens';

export interface TocEntry {
  id:    SectionId;
  label: string;
  state: SectionState;
}

interface TocGroup {
  label:    string;
  entries:  TocEntry[];
}

interface TocSidebarProps {
  groups:        TocGroup[];
  activeId?:     SectionId;
  onNavigate:    (id: SectionId) => void;
}

export const TocSidebar: React.FC<TocSidebarProps> = ({ groups, activeId, onNavigate }) => (
  <nav style={{
    width:       layout.tocWidth,
    flexShrink:  0,
    position:    'sticky',
    top:         0,
    alignSelf:   'flex-start',
    maxHeight:   '100vh',
    overflowY:   'auto',
    borderRight: `1px solid ${colors.borderStandard}`,
    background:  colors.cardBg,
    padding:     `${spacing.lg}px 0`,
  }}>
    {groups.map((g) => (
      <div key={g.label} style={{ marginBottom: spacing.lg }}>
        <div style={{
          padding:     `${spacing.xs}px ${spacing.lg}px`,
          fontSize:    typography.fontSizeLabel,
          fontWeight:  typography.fontWeightBold,
          color:       colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>{g.label}</div>
        {g.entries.map((e) => {
          const active = e.id === activeId;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onNavigate(e.id)}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         spacing.sm,
                width:       '100%',
                padding:     `${spacing.xs}px ${spacing.lg}px`,
                background:  active ? colors.brandLight : 'transparent',
                border:      'none',
                borderLeft:  `3px solid ${active ? colors.brand : 'transparent'}`,
                cursor:      'pointer',
                fontFamily:  typography.fontFamily,
                fontSize:    typography.fontSizeBody,
                color:       colors.textPrimary,
                textAlign:   'left',
                height:      layout.tocItemHeight,
              }}
            >
              <StatusIcon state={e.state} size={10} />
              <span>{e.label}</span>
            </button>
          );
        })}
      </div>
    ))}
  </nav>
);
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/TocSidebar.tsx
git commit -m "feat(kyc-full-takeover): TocSidebar (5 groups, 17 entries, status icons)"
```

---

### Task 19: PlaceholderSection (for M3-M6 sections)

**Files:**
- Create: `KycFullTakeover/components/sections/PlaceholderSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/PlaceholderSection.tsx
// Renders an n/a-like card for sections that exist in the TOC but aren't
// implemented yet (M3-M6). Lets v0.1.0 ship a complete TOC without crashing
// on missing section components.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { colors, typography } from '../../styles/tokens';

interface PlaceholderSectionProps {
  title:      string;
  milestone:  string;   // "M3", "M4", etc.
}

export const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({ title, milestone }) => (
  <SectionFrame title={title} state="read-only">
    <div style={{
      padding:    24,
      textAlign:  'center',
      color:      colors.textMuted,
      fontFamily: typography.fontFamily,
      fontSize:   typography.fontSizeBody,
      fontStyle:  'italic',
    }}>
      Coming in milestone {milestone} — section not yet implemented.
    </div>
  </SectionFrame>
);
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/sections/PlaceholderSection.tsx
git commit -m "feat(kyc-full-takeover): PlaceholderSection (renders 'coming in MX' card for unimplemented sections)"
```

---

### Task 20: NarrativeSection generic component

**Files:**
- Create: `KycFullTakeover/components/sections/NarrativeSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/NarrativeSection.tsx
// Generic editor for any section whose payload is a single string field.
// Drives 5 sections: Professional Experience, Financial Situation Narrative,
// Digital Asset Holdings Narrative, Transactional Behaviour, Additional
// Comments. Reads payload value, exposes a textarea, calls onTakeover when
// the user clicks Take over (parent handles the actual write).

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { SectionState } from '../../types';
import { colors, typography, spacing, inputStyle } from '../../styles/tokens';

interface NarrativeSectionProps {
  title:           string;
  fieldLabel:      string;       // shown above the textarea
  state:           SectionState;
  value:           string;       // current editable value
  onChange:        (next: string) => void;
  onTakeover:      () => void;
  lastRunAt?:      string;
  errorMsg?:       string;
}

export const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  title, fieldLabel, state, value, onChange, onTakeover, lastRunAt, errorMsg,
}) => {
  const [focused, setFocused] = React.useState(false);
  return (
    <SectionFrame
      title={title}
      state={state}
      lastRunAt={lastRunAt}
      errorMsg={errorMsg}
      onTakeover={onTakeover}
    >
      <label style={{
        display:    'block',
        fontSize:   typography.fontSizeLabel,
        color:      colors.textSecondary,
        marginBottom: spacing.xs,
      }}>{fieldLabel}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={()  => setFocused(false)}
        rows={6}
        style={{
          ...inputStyle(focused),
          resize:    'vertical',
          minHeight: 120,
        }}
      />
    </SectionFrame>
  );
};
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/sections/NarrativeSection.tsx
git commit -m "feat(kyc-full-takeover): NarrativeSection generic component (5 sections share this)"
```

---

### Task 21: FindingsSection component

**Files:**
- Create: `KycFullTakeover/components/sections/FindingsSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/FindingsSection.tsx
// Read-only display of agent-produced findings. Severity colour-codes the
// left border of each card. No takeover button — this section is informational.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { Finding } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

const severityColor: Record<Finding['severity'], string> = {
  info:     colors.brand,
  warning:  colors.warning,
  critical: colors.error,
};

interface FindingsSectionProps {
  findings: Finding[];
}

export const FindingsSection: React.FC<FindingsSectionProps> = ({ findings }) => (
  <SectionFrame title="Findings" state="read-only">
    {findings.length === 0 ? (
      <div style={{ color: colors.textMuted, fontFamily: typography.fontFamily }}>No findings.</div>
    ) : findings.map((f, i) => (
      <article key={i} style={{
        marginBottom:  spacing.md,
        padding:       spacing.md,
        background:    colors.whisperBg,
        borderLeft:    `3px solid ${severityColor[f.severity]}`,
        borderRadius:  3,
      }}>
        <header style={{
          display:    'flex',
          alignItems: 'center',
          gap:        spacing.sm,
          marginBottom: spacing.xs,
        }}>
          <span style={{
            fontSize:    typography.fontSizeLabel,
            fontWeight:  typography.fontWeightBold,
            color:       severityColor[f.severity],
            textTransform: 'uppercase',
          }}>{f.severity}</span>
          <span style={{
            fontSize: typography.fontSizeLabel,
            color:    colors.textMuted,
          }}>{f.category}</span>
        </header>
        <div style={{
          fontSize:   typography.fontSizeBody,
          fontWeight: typography.fontWeightBold,
          color:      colors.textPrimary,
          marginBottom: spacing.xs,
        }}>{f.title}</div>
        <div style={{
          fontSize:   typography.fontSizeBody,
          color:      colors.textPrimary,
          marginBottom: f.regulatoryReference ? spacing.xs : 0,
        }}>{f.detail}</div>
        {f.regulatoryReference && (
          <div style={{
            fontSize:   typography.fontSizeLabel,
            color:      colors.textSecondary,
            fontStyle:  'italic',
          }}>{f.regulatoryReference}</div>
        )}
      </article>
    ))}
  </SectionFrame>
);
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/sections/FindingsSection.tsx
git commit -m "feat(kyc-full-takeover): FindingsSection (read-only severity-coloured cards)"
```

---

### Task 22: ProposedEmailSection component

**Files:**
- Create: `KycFullTakeover/components/sections/ProposedEmailSection.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/sections/ProposedEmailSection.tsx
// Read-only display of the proposed email + a "Create E-mail" button that
// opens a pre-populated email activity form via Xrm.Navigation.openForm.
// The actual openForm wiring is in utils/emailActivity.ts.

import * as React from 'react';
import { SectionFrame } from '../SectionFrame';
import { ProposedEmail } from '../../types';
import { colors, typography, spacing } from '../../styles/tokens';

interface ProposedEmailSectionProps {
  email:        ProposedEmail;
  onCreateEmail: () => void;   // wired by parent to openProposedEmail
}

export const ProposedEmailSection: React.FC<ProposedEmailSectionProps> = ({ email, onCreateEmail }) => (
  <SectionFrame title="Proposed Email" state="read-only">
    <div style={{ display: 'grid', gap: spacing.sm, fontFamily: typography.fontFamily }}>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>To</div>
        <div style={{ fontSize: typography.fontSizeBody, color: colors.textPrimary }}>
          {email.to.map((r) => r.name).join(', ') || '—'}
        </div>
      </div>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>Subject</div>
        <div style={{ fontSize: typography.fontSizeBody, color: colors.textPrimary }}>{email.subject}</div>
      </div>
      <div>
        <div style={{ fontSize: typography.fontSizeLabel, color: colors.textSecondary, marginBottom: 2 }}>Body</div>
        <pre style={{
          fontSize:    typography.fontSizeBody,
          fontFamily:  typography.fontFamily,
          color:       colors.textPrimary,
          background:  colors.whisperBg,
          padding:     spacing.md,
          borderRadius: 3,
          whiteSpace:  'pre-wrap',
          margin:      0,
        }}>{email.body}</pre>
      </div>
      <div style={{ marginTop: spacing.sm }}>
        <button
          type="button"
          onClick={onCreateEmail}
          style={{
            fontSize:    typography.fontSizeSmall,
            fontWeight:  typography.fontWeightBold,
            color:       colors.textOnBrand,
            background:  colors.brand,
            border:      'none',
            borderRadius: 4,
            padding:     `6px ${spacing.md}px`,
            cursor:      'pointer',
            fontFamily:  typography.fontFamily,
          }}
        >Create E-mail</button>
      </div>
    </div>
  </SectionFrame>
);
```

- [ ] **Step 2: Verify build + commit**

```bash
cd KycFullTakeover && npx tsc --noEmit
git add KycFullTakeover/components/sections/ProposedEmailSection.tsx
git commit -m "feat(kyc-full-takeover): ProposedEmailSection (read-only + Create E-mail button)"
```

---

### Task 23: EmptyStatePane component

**Files:**
- Create: `KycFullTakeover/components/EmptyStatePane.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/EmptyStatePane.tsx
// Shown when the AI payload is missing, malformed, or has an unsupported
// schemaVersion. Replaces the entire control area — no TOC, no sections.

import * as React from 'react';
import { colors, typography, spacing } from '../styles/tokens';

interface EmptyStatePaneProps {
  message: string;     // user-facing reason
  detail?: string;     // optional technical detail (e.g. parse error)
}

export const EmptyStatePane: React.FC<EmptyStatePaneProps> = ({ message, detail }) => (
  <div style={{
    padding:        spacing.xxl,
    textAlign:      'center',
    fontFamily:     typography.fontFamily,
    background:     colors.warningBg,
    border:         `1px solid ${colors.warning}`,
    borderRadius:   6,
    margin:         spacing.lg,
  }}>
    <div style={{
      fontSize:   typography.fontSizeTitle,
      fontWeight: typography.fontWeightBold,
      color:      colors.warning,
      marginBottom: spacing.sm,
    }}>KYC Full Takeover unavailable</div>
    <div style={{
      fontSize: typography.fontSizeBody,
      color:    colors.textPrimary,
      marginBottom: detail ? spacing.sm : 0,
    }}>{message}</div>
    {detail && (
      <div style={{
        fontSize:   typography.fontSizeSmall,
        color:      colors.textMuted,
        fontStyle:  'italic',
      }}>{detail}</div>
    )}
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add KycFullTakeover/components/EmptyStatePane.tsx
git commit -m "feat(kyc-full-takeover): EmptyStatePane (shown when payload missing or schema unknown)"
```

---

### Task 24: KycFullTakeover root component

**Files:**
- Create: `KycFullTakeover/components/KycFullTakeover.tsx`

- [ ] **Step 1: Write the root component**

```tsx
// components/KycFullTakeover.tsx
// Root component. Receives parsed payload + status blob from index.ts and
// orchestrates: TOC navigation, section rendering, takeover lifecycle.
// State is held here; index.ts owns the bound-field outputs.

import * as React from 'react';
import { HeaderStrip } from './HeaderStrip';
import { TocSidebar, TocEntry } from './TocSidebar';
import { FindingsSection } from './sections/FindingsSection';
import { ProposedEmailSection } from './sections/ProposedEmailSection';
import { NarrativeSection } from './sections/NarrativeSection';
import { PlaceholderSection } from './sections/PlaceholderSection';
import {
  KycPayload, SectionId, SectionState, TakeoverStatusBlob, SectionStatusRecord,
} from '../types';
import { colors, spacing } from '../styles/tokens';
import { showConfirmation } from '../utils/confirmationDialog';
import { hashSlice, setSectionState } from '../utils/sectionStatus';
import { patchKycProfile } from '../utils/dataverse';
import { openProposedEmail } from '../utils/emailActivity';

export interface KycFullTakeoverProps {
  payload:           KycPayload;
  statusBlob:        TakeoverStatusBlob;
  kycProfileId:      string;
  kycProfileName:    string;
  webAPI:            ComponentFramework.WebApi;
  onStatusChange:    (next: TakeoverStatusBlob) => void;   // index.ts persists
}

// Per-section local edit state. Maps section id → current editable value.
// Phase 1: only narrative sections + email need editable state in the UI.
type EditState = Partial<Record<SectionId, string>>;

export const KycFullTakeover: React.FC<KycFullTakeoverProps> = ({
  payload, statusBlob: initialStatusBlob, kycProfileId, kycProfileName, webAPI, onStatusChange,
}) => {
  // Local copy of the status blob — updated synchronously on each takeover so
  // the UI reflects the new state immediately. onStatusChange persists out to
  // the bound field via index.ts; the parent does NOT re-render us with the
  // updated blob (would loop). If the form is reloaded, this component
  // remounts with a fresh initialStatusBlob from props.
  const [statusBlob, setStatusBlob] = React.useState(initialStatusBlob);
  const [edits, setEdits] = React.useState<EditState>({});
  const [activeId, setActiveId] = React.useState<SectionId | undefined>(undefined);

  const persistStatus = (next: TakeoverStatusBlob) => {
    setStatusBlob(next);
    onStatusChange(next);
  };

  // === Section state derivation ============================================
  const sectionState = (id: SectionId, payloadHasIt: boolean, isReadOnly = false): SectionState => {
    if (isReadOnly) return 'read-only';
    if (!payloadHasIt) return 'na';
    const persisted = statusBlob.sections[id];
    if (persisted?.state === 'done' || persisted?.state === 'partial-failed') return persisted.state;
    if (edits[id] !== undefined && edits[id] !== originalNarrativeValue(payload, id)) return 'edited';
    return 'pending';
  };

  // === TOC composition ====================================================
  const groups = [
    {
      label: 'Review',
      entries: [
        { id: 'findings'            as SectionId, label: 'Findings',         state: sectionState('findings',            !!payload.findings, true) },
        { id: 'proposedClientEmail' as SectionId, label: 'Proposed Email',   state: sectionState('proposedClientEmail', !!payload.proposedClientEmail, true) },
      ],
    },
    {
      label: 'Client Background',
      entries: [
        { id: 'personalDetails'        as SectionId, label: 'Personal Details',        state: sectionState('personalDetails',        !!payload.personalDetails) },
        { id: 'professionalExperience' as SectionId, label: 'Professional Experience', state: sectionState('professionalExperience', !!payload.professionalExperience) },
        { id: 'businessActivities'     as SectionId, label: 'Business Activities',     state: sectionState('businessActivities',     !!payload.businessActivities) },
        { id: 'countriesOfActivity'    as SectionId, label: 'Countries of Activity',   state: sectionState('countriesOfActivity',    !!payload.countriesOfActivity) },
        { id: 'relatedParties'         as SectionId, label: 'Related Parties',         state: sectionState('relatedParties',         !!payload.relatedParties) },
      ],
    },
    {
      label: 'Financial Situation',
      entries: [
        { id: 'financialSituationNarrative'   as SectionId, label: 'Financial Situation Narrative', state: sectionState('financialSituationNarrative',   typeof payload.financialSituationNarrative === 'string') },
        { id: 'totalWealthIncome'             as SectionId, label: 'Total Wealth and Income',       state: sectionState('totalWealthIncome',             !!payload.totalWealthIncome) },
        { id: 'sourceOfWealth'                as SectionId, label: 'Source of Wealth',              state: sectionState('sourceOfWealth',                !!payload.sourceOfWealth) },
        { id: 'currentAssetAllocation'        as SectionId, label: 'Current Asset Allocation',     state: sectionState('currentAssetAllocation',        !!payload.currentAssetAllocation) },
        { id: 'digitalAssetHoldingsNarrative' as SectionId, label: 'Digital Asset Holdings Narrative', state: sectionState('digitalAssetHoldingsNarrative', typeof payload.digitalAssetHoldingsNarrative === 'string') },
        { id: 'detailedDAHoldings'            as SectionId, label: 'Detailed DA Holdings',          state: sectionState('detailedDAHoldings',            !!payload.detailedDAHoldings) },
      ],
    },
    {
      label: 'Expected Activity',
      entries: [
        { id: 'transactionalBehaviour' as SectionId, label: 'Transactional Behaviour', state: sectionState('transactionalBehaviour', typeof payload.transactionalBehaviour === 'string') },
        { id: 'plannedFiatFunds'       as SectionId, label: 'Planned Fiat Funds',      state: sectionState('plannedFiatFunds',       !!payload.plannedFiatFunds) },
        { id: 'plannedDAFunds'         as SectionId, label: 'Planned DA Funds',        state: sectionState('plannedDAFunds',         !!payload.plannedDAFunds) },
      ],
    },
    {
      label: 'Compliance & Other',
      entries: [
        { id: 'pepSanctionsRisk'   as SectionId, label: 'PEP, Adverse Media and Sanctions', state: sectionState('pepSanctionsRisk', !!payload.pepSanctionsRisk) },
        { id: 'additionalComments' as SectionId, label: 'Additional Comments',              state: sectionState('additionalComments', typeof payload.additionalComments === 'string') },
      ],
    },
  ];

  // === Narrative takeover handler ==========================================
  const takeoverNarrative = async (
    id: SectionId,
    fieldLabel: string,
    dataverseFieldName: string,
  ) => {
    const value = edits[id] ?? originalNarrativeValue(payload, id) ?? '';
    const current = statusBlob.sections[id];
    const isReRun = current?.state === 'done' || current?.state === 'partial-failed';

    const ok = await showConfirmation({
      type: 'narrative',
      sectionLabel: id,
      fieldLabel,
      isReRun,
    });
    if (!ok) return;

    const result = await patchKycProfile(webAPI, kycProfileId, { [dataverseFieldName]: value });
    const record: SectionStatusRecord = result.ok
      ? {
          state:       'done',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 1 },
          payloadHash: hashSlice(value),
        }
      : {
          state:       'partial-failed',
          lastRunAt:   new Date().toISOString(),
          result:      { patched: 0, failed: 1 },
          errors:      [{ field: dataverseFieldName, message: result.error ?? 'unknown' }],
          payloadHash: hashSlice(value),
        };
    persistStatus(setSectionState(statusBlob, id, record));
  };

  // === Layout =============================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: colors.cardBg }}>
      <HeaderStrip
        profileName={kycProfileName}
        schemaVersion={payload.schemaVersion}
        lastRunAt={mostRecentLastRun(statusBlob)}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TocSidebar
          groups={groups}
          activeId={activeId}
          onNavigate={(id) => {
            setActiveId(id);
            const el = document.getElementById(`section-${id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
        <main style={{ flex: 1, overflowY: 'auto', padding: spacing.lg }}>

          {/* Review group */}
          {payload.findings && (
            <div id="section-findings"><FindingsSection findings={payload.findings} /></div>
          )}
          {payload.proposedClientEmail && (
            <div id="section-proposedClientEmail">
              <ProposedEmailSection
                email={payload.proposedClientEmail}
                onCreateEmail={async () => {
                  await openProposedEmail(payload.proposedClientEmail!, kycProfileId, kycProfileName);
                }}
              />
            </div>
          )}

          {/* Client Background — Personal Details / BA / Countries / Related Parties = M3-M6 placeholders */}
          <div id="section-personalDetails">       <PlaceholderSection title="Personal Details"        milestone="M3" /></div>
          {payload.professionalExperience && (
            <div id="section-professionalExperience">
              <NarrativeSection
                title="Professional Experience"
                fieldLabel="Professional Experience Summary"
                state={sectionState('professionalExperience', true)}
                value={edits.professionalExperience ?? payload.professionalExperience.syg_ProfessionalExperienceSummary ?? ''}
                onChange={(next) => setEdits((p) => ({ ...p, professionalExperience: next }))}
                onTakeover={() => takeoverNarrative('professionalExperience', 'Professional Experience Summary', 'syg_ProfessionalExperienceSummary')}
                lastRunAt={statusBlob.sections.professionalExperience?.lastRunAt}
                errorMsg={statusBlob.sections.professionalExperience?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-businessActivities">    <PlaceholderSection title="Business Activities"     milestone="M4" /></div>
          <div id="section-countriesOfActivity">   <PlaceholderSection title="Countries of Activity"   milestone="M4" /></div>
          <div id="section-relatedParties">        <PlaceholderSection title="Related Parties"         milestone="M6" /></div>

          {/* Financial Situation */}
          {typeof payload.financialSituationNarrative === 'string' && (
            <div id="section-financialSituationNarrative">
              <NarrativeSection
                title="Financial Situation Narrative"
                fieldLabel="Financial Situation Summary"
                state={sectionState('financialSituationNarrative', true)}
                value={edits.financialSituationNarrative ?? payload.financialSituationNarrative}
                onChange={(next) => setEdits((p) => ({ ...p, financialSituationNarrative: next }))}
                onTakeover={() => takeoverNarrative('financialSituationNarrative', 'Financial Situation Summary', 'syg_FinancialSituationSummary')}
                lastRunAt={statusBlob.sections.financialSituationNarrative?.lastRunAt}
                errorMsg={statusBlob.sections.financialSituationNarrative?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-totalWealthIncome">      <PlaceholderSection title="Total Wealth and Income" milestone="M3" /></div>
          <div id="section-sourceOfWealth">         <PlaceholderSection title="Source of Wealth"        milestone="M5" /></div>
          <div id="section-currentAssetAllocation"> <PlaceholderSection title="Current Asset Allocation" milestone="M3" /></div>
          {typeof payload.digitalAssetHoldingsNarrative === 'string' && (
            <div id="section-digitalAssetHoldingsNarrative">
              <NarrativeSection
                title="Digital Asset Holdings Narrative"
                fieldLabel="Crypto Holdings Narrative"
                state={sectionState('digitalAssetHoldingsNarrative', true)}
                value={edits.digitalAssetHoldingsNarrative ?? payload.digitalAssetHoldingsNarrative}
                onChange={(next) => setEdits((p) => ({ ...p, digitalAssetHoldingsNarrative: next }))}
                onTakeover={() => takeoverNarrative('digitalAssetHoldingsNarrative', 'Crypto Holdings Narrative', 'syg_CryptoHoldingsNarrative')}
                lastRunAt={statusBlob.sections.digitalAssetHoldingsNarrative?.lastRunAt}
                errorMsg={statusBlob.sections.digitalAssetHoldingsNarrative?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-detailedDAHoldings">    <PlaceholderSection title="Detailed DA Holdings" milestone="M5" /></div>

          {/* Expected Activity */}
          {typeof payload.transactionalBehaviour === 'string' && (
            <div id="section-transactionalBehaviour">
              <NarrativeSection
                title="Transactional Behaviour"
                fieldLabel="Narrative for Transactional Behaviour"
                state={sectionState('transactionalBehaviour', true)}
                value={edits.transactionalBehaviour ?? payload.transactionalBehaviour}
                onChange={(next) => setEdits((p) => ({ ...p, transactionalBehaviour: next }))}
                onTakeover={() => takeoverNarrative('transactionalBehaviour', 'Narrative for Transactional Behaviour', 'syg_NarrativeforTransactionalBehaviour')}
                lastRunAt={statusBlob.sections.transactionalBehaviour?.lastRunAt}
                errorMsg={statusBlob.sections.transactionalBehaviour?.errors?.[0]?.message}
              />
            </div>
          )}
          <div id="section-plannedFiatFunds"> <PlaceholderSection title="Planned Fiat Funds" milestone="M5" /></div>
          <div id="section-plannedDAFunds">   <PlaceholderSection title="Planned DA Funds"   milestone="M5" /></div>

          {/* Compliance & Other */}
          <div id="section-pepSanctionsRisk"> <PlaceholderSection title="PEP, Adverse Media and Sanctions" milestone="M3" /></div>
          {typeof payload.additionalComments === 'string' && (
            <div id="section-additionalComments">
              <NarrativeSection
                title="Additional Comments"
                fieldLabel="Additional Comments"
                state={sectionState('additionalComments', true)}
                value={edits.additionalComments ?? payload.additionalComments}
                onChange={(next) => setEdits((p) => ({ ...p, additionalComments: next }))}
                onTakeover={() => takeoverNarrative('additionalComments', 'Additional Comments', 'syg_AdditionalComments_clientservices')}
                lastRunAt={statusBlob.sections.additionalComments?.lastRunAt}
                errorMsg={statusBlob.sections.additionalComments?.errors?.[0]?.message}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

// === helpers ===============================================================

function originalNarrativeValue(payload: KycPayload, id: SectionId): string | undefined {
  switch (id) {
    case 'professionalExperience':         return payload.professionalExperience?.syg_ProfessionalExperienceSummary;
    case 'financialSituationNarrative':    return payload.financialSituationNarrative;
    case 'digitalAssetHoldingsNarrative':  return payload.digitalAssetHoldingsNarrative;
    case 'transactionalBehaviour':         return payload.transactionalBehaviour;
    case 'additionalComments':             return payload.additionalComments;
    default:                                return undefined;
  }
}

function mostRecentLastRun(blob: TakeoverStatusBlob): string | undefined {
  let latest: string | undefined = undefined;
  for (const s of Object.values(blob.sections)) {
    const ts = s?.lastRunAt;
    if (typeof ts === 'string' && (!latest || ts > latest)) latest = ts;
  }
  return latest;
}
```

- [ ] **Step 2: Verify build**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/components/KycFullTakeover.tsx
git commit -m "feat(kyc-full-takeover): root component with TOC + 7 implemented sections + 10 placeholders"
```

---

### Task 25: PCF entry point (index.ts)

**Files:**
- Create: `KycFullTakeover/index.ts`

- [ ] **Step 1: Write the entry**

```ts
// index.ts
// PCF lifecycle entry. Reads the bound aiAnalyticsAudit and takeoverStatus
// fields, parses both, renders the root component, and persists status
// changes via notifyOutputChanged.

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { KycFullTakeover } from './components/KycFullTakeover';
import { EmptyStatePane } from './components/EmptyStatePane';
import { parsePayload } from './utils/payloadParser';
import { parseStatusBlob, serialiseStatusBlob } from './utils/sectionStatus';
import { TakeoverStatusBlob } from './types';

export class KycFullTakeoverControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged!: () => void;

  // Mutable state mirrored to bound output fields on next updateView.
  private pendingStatus:  TakeoverStatusBlob | null = null;
  private pendingLastRun: string | null = null;
  private pendingError:   string | null = null;
  private pendingOutput  = false;

  public init(
    context:             ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state:              ComponentFramework.Dictionary,
    container:           HTMLDivElement,
  ): void {
    this.context             = context;
    this.notifyOutputChanged = notifyOutputChanged;
    this.container           = container;
    this.root                = createRoot(container);
    context.mode.trackContainerResize(true);
    this.render();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    if (this.pendingOutput) {
      this.pendingOutput = false;
      // Skip re-rendering from external state on the echo call after we
      // notified output — our local state is already current.
      return;
    }
    this.render();
  }

  public getOutputs(): IOutputs {
    const outputs: IOutputs = {};
    if (this.pendingStatus !== null) {
      outputs.takeoverStatus = serialiseStatusBlob(this.pendingStatus);
      this.pendingStatus = null;
    }
    if (this.pendingLastRun !== null) {
      outputs.takeoverLastRunAt = new Date(this.pendingLastRun);
      this.pendingLastRun = null;
    }
    if (this.pendingError !== null) {
      outputs.takeoverLastError = this.pendingError;
      this.pendingError = null;
    }
    return outputs;
  }

  public destroy(): void {
    this.root.unmount();
  }

  // === render =============================================================

  private render(): void {
    const auditRaw = this.context.parameters.aiAnalyticsAudit?.raw ?? null;
    const result = parsePayload(auditRaw);
    if (!result.ok) {
      this.root.render(
        React.createElement(EmptyStatePane, {
          message: 'No AI analytics payload available for this KYC profile, or the payload format is unsupported.',
          detail:  result.error,
        })
      );
      return;
    }

    const statusRaw  = this.context.parameters.takeoverStatus?.raw ?? '';
    const statusBlob = parseStatusBlob(statusRaw);

    const profile = this.resolveProfile();
    if (!profile) {
      this.root.render(
        React.createElement(EmptyStatePane, {
          message: 'Could not resolve the KYC profile context. The control must be placed on a syg_kycprofile form.',
        })
      );
      return;
    }

    this.root.render(
      React.createElement(KycFullTakeover, {
        payload:        result.payload,
        statusBlob,
        kycProfileId:   profile.id,
        kycProfileName: profile.name,
        webAPI:         this.context.webAPI,
        onStatusChange: (next: TakeoverStatusBlob) => {
          // Persist out to the bound takeoverStatus field. The KycFullTakeover
          // React component holds the live blob in its own useState, so we
          // don't re-render here — that would echo-loop with the bound-field
          // updateView callback. The pendingOutput flag in updateView() also
          // breaks the echo cycle.
          this.pendingStatus  = next;
          this.pendingLastRun = new Date().toISOString();
          this.pendingError   = null;
          this.pendingOutput  = true;
          this.notifyOutputChanged();
        },
      })
    );
  }

  private resolveProfile(): { id: string; name: string } | null {
    const info = (this.context.mode as unknown as {
      contextInfo?: { entityId?: unknown; entityTypeName?: string; label?: string };
    }).contextInfo;
    if (!info?.entityId || info?.entityTypeName !== 'syg_kycprofile') {
      // fallback: try Xrm.Page
      const xrm = (window as unknown as { Xrm?: { Page?: { data?: { entity?: { getId?: () => string; getEntityName?: () => string } } } } }).Xrm;
      const ent = xrm?.Page?.data?.entity;
      const id  = ent?.getId?.()?.replace(/[{}]/g, '');
      const en  = ent?.getEntityName?.();
      if (id && en === 'syg_kycprofile') {
        return { id: id.toLowerCase(), name: 'KYC Profile' };
      }
      return null;
    }
    const idRaw = String(info.entityId).replace(/[{}]/g, '').toLowerCase();
    return { id: idRaw, name: info.label ?? 'KYC Profile' };
  }
}
```

- [ ] **Step 2: Verify build**

Run: `cd KycFullTakeover && npm run build`
Expected: build succeeds. Note: pcf-scripts will autogenerate `generated/ManifestTypes.d.ts` from the manifest as part of the build.

- [ ] **Step 3: Commit**

```bash
git add KycFullTakeover/index.ts
git commit -m "feat(kyc-full-takeover): PCF entry (init/updateView/getOutputs lifecycle)"
```

---

### Task 26: WRITTEN_FIELDS.md documentation

**Files:**
- Create: `KycFullTakeover/WRITTEN_FIELDS.md`

- [ ] **Step 1: Write the doc**

```markdown
# KycFullTakeover — Fields Written by Section

This document mirrors the spec's Section Catalog, scoped to fields **actually written** by the PCF (vs fields that exist on the entity but stay untouched). Form designers should consult this list when configuring auditing, security, or workflows that need to know which columns the takeover modifies.

> **Why this exists:** narrative + field-set sections write via OData PATCH using logical names from the JSON payload. These fields are NOT bound on the manifest. Without this doc, a form designer can't tell what the component touches.

## Phase 1 (v0.1.0 — current)

| Section | Entity | Fields written | Op |
|---|---|---|---|
| Findings | — read-only — | — | none |
| Proposed Email | `email` (new record via openForm) | subject, description, regardingobjectid, to | form open |
| Professional Experience | `syg_kycprofile` | `syg_ProfessionalExperienceSummary` | PATCH |
| Financial Situation Narrative | `syg_kycprofile` | `syg_FinancialSituationSummary` | PATCH |
| Digital Asset Holdings Narrative | `syg_kycprofile` | `syg_CryptoHoldingsNarrative` | PATCH |
| Transactional Behaviour | `syg_kycprofile` | `syg_NarrativeforTransactionalBehaviour` | PATCH |
| Additional Comments | `syg_kycprofile` | `syg_AdditionalComments_clientservices` | PATCH |

## Phase 2 (planned — M3-M6)

To be filled in as those milestones land. See spec section catalog for the full list.

## Status persistence

The PCF writes its own status blob to bound fields on every takeover:

| Field | Type | Purpose |
|---|---|---|
| `takeoverStatus` | Multiple-line text | JSON blob: per-section status, timestamps, payload hashes |
| `takeoverLastRunAt` | DateTime | Most-recent takeover timestamp |
| `takeoverLastError` | Multiple-line text | Most-recent failure message |

These three fields are bound on the manifest and updated via `notifyOutputChanged` — they go through the standard PCF output flow.
```

- [ ] **Step 2: Commit**

```bash
git add KycFullTakeover/WRITTEN_FIELDS.md
git commit -m "docs(kyc-full-takeover): written fields catalog (phase 1)"
```

---

### Task 27: Production build + smoke check

**Files:**
- Modify: (none — verification only)

- [ ] **Step 1: Clean build**

Run: `cd KycFullTakeover && npm run rebuild`
Expected: Webpack succeeds. `out/controls/bundle.js` and `out/controls/ControlManifest.xml` produced. Bundle size reported (likely ~250-350 KB).

- [ ] **Step 2: Run all tests**

Run: `cd KycFullTakeover && npm test`
Expected: all jest test suites pass (guidValidation, formatters, optionSets, sectionStatus, payloadParser, confirmationDialog).

- [ ] **Step 3: Verify TypeScript strict checks**

Run: `cd KycFullTakeover && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit (no file changes — annotation only)**

If the previous tasks didn't produce a clean state: fix the failures and commit, then re-run this task. If everything passes, no commit needed for this task.

---

### Task 28: Solution packaging — RootComponent + CustomControl entries

**Files:**
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Create: `Solution/manual-pack/Controls/Syg.KycFullTakeover/bundle.js` (copy)
- Create: `Solution/manual-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml` (copy)
- Create: `Solution/manual-pack/Controls/Syg.KycFullTakeover/strings/KycFullTakeover.1033.resx` (copy)

- [ ] **Step 1: Add RootComponent to solution.xml**

Find the `<RootComponents>` block in `Solution/manual-pack/solution.xml` and add:

```xml
<RootComponent type="66" schemaName="Syg.KycFullTakeover" behavior="0" />
```

- [ ] **Step 2: Add CustomControl entry to customizations.xml**

Find the existing `<CustomControl>` entries (search for `Syg.RelatedPartiesGraph` for a template) and add a new `<CustomControl>` block for `Syg.KycFullTakeover` with `<FileName>/Controls/Syg.KycFullTakeover/ControlManifest.xml</FileName>`.

- [ ] **Step 3: Bump solution version**

```bash
# Bump Solution/manual-pack/solution.xml <Version>X.Y.Z</Version> by one patch level
```

- [ ] **Step 4: Copy build outputs**

```bash
mkdir -p "Solution/manual-pack/Controls/Syg.KycFullTakeover/strings"
cp KycFullTakeover/out/controls/bundle.js               Solution/manual-pack/Controls/Syg.KycFullTakeover/bundle.js
cp KycFullTakeover/out/controls/ControlManifest.xml     Solution/manual-pack/Controls/Syg.KycFullTakeover/ControlManifest.xml
cp KycFullTakeover/strings/KycFullTakeover.1033.resx    Solution/manual-pack/Controls/Syg.KycFullTakeover/strings/KycFullTakeover.1033.resx
```

- [ ] **Step 5: Build the solution zip**

```bash
cd Solution/manual-pack
NEW_VERSION=$(grep -oE '<Version>[^<]+</Version>' solution.xml | head -1 | sed 's/<[^>]*>//g')
zip -rq "../bin/Release/SygnumPCFComponents_${NEW_VERSION}.zip" \
  solution.xml customizations.xml '[Content_Types].xml' Controls/ \
  -x "*.DS_Store"
ls -la "../bin/Release/SygnumPCFComponents_${NEW_VERSION}.zip"
```

Expected: a valid zip with the new control included. Size ~700-900 KB.

- [ ] **Step 6: Commit**

```bash
git add Solution/manual-pack/
git commit -m "chore(solution): include KycFullTakeover v0.1.0 in solution X.Y.Z"
```

---

### Task 29: Smoke test in D365

**Files:** none — verification only.

- [ ] **Step 1: Import the solution**

Upload `Solution/bin/Release/SygnumPCFComponents_X.Y.Z.zip` via the Power Platform admin centre's "Import Solution" flow. Wait for completion (typically 1-2 min).

- [ ] **Step 2: Add the KycFullTakeover control to a test KYC profile form**

Open the form designer for a `syg_kycprofile` form. Add a section. Add the `Syg.KycFullTakeover` PCF control to the section, binding the four fields:
- `aiAnalyticsAudit` → `syg_aianalytics_audit`
- `takeoverStatus` → choose any multi-line text field provisioned for this purpose (or create a new `syg_takeoverstatus` field)
- `takeoverLastRunAt` → DateTime field (or stub)
- `takeoverLastError` → multi-line text field (or stub)

Save and publish.

- [ ] **Step 3: Open a KYC profile with a real `syg_aianalytics_audit` payload (or paste the sample)**

Hard-refresh the form (Ctrl+Shift+R). The control should render: header strip, TOC sidebar (5 groups), and main content showing the 7 implemented sections + 10 placeholders. Status icons should reflect agent's payload coverage.

- [ ] **Step 4: Take over each implemented section once**

For each of the 5 narrative sections + Findings (read-only) + Proposed Email (action only):
- Verify the section renders correctly
- Click "Take over" — verify the confirmation dialog text matches the spec template
- Confirm — verify the parent `syg_kycprofile` record's narrative field updates
- Verify the status icon flips to `done` and the "Last run" timestamp appears

For the Proposed Email section:
- Click "Create E-mail" — verify a new email activity form opens with subject/body/regarding/to pre-populated.

- [ ] **Step 5: Reload the form to verify status persistence**

Hard-refresh. Status icons should retain their `done` state from the previous run; the last-run timestamps in the section subtitles should match.

- [ ] **Step 6: Commit any docs/screenshots**

If you captured screenshots or notes, commit under `docs/superpowers/specs/2026-05-05-kycfulltakeover-smoketest.md`.

---

## Self-Review

After completing all tasks, run through this checklist:

**Spec coverage** — every Phase-1 (v0.1.0) section in the spec has a task here:
- ✓ Findings → Task 21
- ✓ Proposed Email → Task 22, 12 (helper)
- ✓ Professional Experience → Task 20 (generic) + Task 24 wiring
- ✓ Financial Situation Narrative → Task 24 wiring
- ✓ Digital Asset Holdings Narrative → Task 24 wiring
- ✓ Transactional Behaviour → Task 24 wiring
- ✓ Additional Comments → Task 24 wiring
- ✓ Status persistence → Task 8
- ✓ Confirmation dialogs → Task 10
- ✓ Solution packaging → Task 28

**Placeholder scan** — no "TBD", "TODO", "implement later" in any task body. ✓

**Type consistency** — `SectionId`, `SectionState`, `TakeoverStatusBlob` definitions in Task 4 match usage in Tasks 8, 16, 24, 25. `KycPayload` shape in Task 4 matches Task 9 parser. ✓

**TDD coverage** — pure utilities (Tasks 5-10) all have tests. React components and Dataverse layer rely on D365 smoke test (Task 29) — consistent with project convention.

---

## Future milestones (out of scope for this plan)

The following milestones get their own plans, written as the foundation lands. Each builds on the framework established here.

| Milestone | Sections | Key new work |
|---|---|---|
| **M3 — Field-set sections** | Personal Details, Total Wealth and Income, PEP/Adverse Media/Sanctions, Asset Allocation | `OptionSetSelect.tsx`, `MoneyInput.tsx`, `DateInput.tsx`, multi-field PATCH handler, copy-paste WealthAllocationControl into `components/wealth-allocation/`, fill in OptionSet maps for `syg_pepstatus`, `syg_annualincome`, etc. |
| **M4 — N:N sections** | Business Activities, Countries of Activity | $ref POST helper in `dataverse.ts`, `AssociationChipsSection.tsx`, idempotent re-association handling |
| **M5 — Itemized sections (no create-new)** | Source of Wealth, Detailed DA Holdings, Planned Fiat Funds, Planned DA Funds | Card-list UX, per-row status states, `ItemizedSection.tsx` framework, 4 entity-specific card components, partial-failure handling |
| **M6 — Related Parties (with create-new)** | Related Parties | `PartyRef` discriminator, two-stage write (POST contact/account → POST junction), `itemizedWithCreates` confirmation dialog wiring, audit trail in status blob |
| **M7 — Polish + Phase 1 ship** | — | Empty-array semantics, re-run hash detection UI, solution version bump to 1.0.0, full documentation |

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-05-kycfulltakeover.md`. 29 tasks covering scaffolding through deployable v0.1.0 with 7 of 17 sections functional.

Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, two-stage review between tasks, fast iteration. Best for a long plan like this where each task is well-isolated.

**2. Inline Execution** — execute tasks in the current session via `superpowers:executing-plans`, batch with checkpoints. Better if you want to review every task as it lands.

Which approach?
