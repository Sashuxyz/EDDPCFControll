# KycFullTakeover — Design Spec

## Goal

Field-bound PCF on the `syg_kycprofile` form that reads a structured JSON payload from `syg_aianalytics_audit` (produced upstream by an Azure Function / KYC structurer agent) and lets the Relationship Manager review, edit, and persist it section-by-section into the KYC profile. Successor to `KycDraftTakeover` — extends the takeover from a single field to seventeen sections covering narratives, parent-record fields, child-record creation, and N:N associations.

Replaces the manual "read AI output → copy fields by hand" workflow with a guided, auditable takeover where each section is reviewed and committed independently with a confirmation dialog.

## Scope — Phase 1

**In scope:**
- All 17 sections listed in the TOC (see *Section Catalog* below) for **natural-person** KYC profiles
- Per-section takeover model: one section = one operation = one confirmation = one status update
- Status persistence across form reopens via JSON blob in a bound text field
- "Take over again" re-run flow with duplicate-creation warning for itemized sections
- Read-only Findings section (severity badges, doesn't block takeover)
- Read-only Proposed Email section with "Create E-mail" button that opens an email activity form

**Out of scope (Phase 2 / later):**
- Legal-entity-only fields (`syg_LegalEntityForm`, `syg_csa_*`, `syg_FundType`, `syg_letotalassets`, `syg_natureofbusinessandsofs`, `syg_ComplianceSummary`)
- Editing or replacing lookup values inside itemized rows (Phase 1: lookups render as plain name labels, no GUID exposed; RM deletes + re-adds the row manually if a lookup is wrong)
- A global "Run All Remaining" button (per-section only)
- Localization beyond English source strings (hooks left in place but only English is shipped)
- Mobile/narrow-viewport responsive layout

## Predecessor relationship

`KycDraftTakeover` stays in the solution through Phase 1 — it's still needed for legal-entity profiles where Phase 1 of `KycFullTakeover` doesn't cover the field set. Sunset (delete from solution + migrate form placements) happens only after Phase 2 covers legal-entity fields. Until then, no new `KycDraftTakeover` placements should be added.

## Layout

**Layout B — Sticky TOC sidebar + working pane.**

```
+--------------------+--------------------------------------------------+
|  HEADER STRIP      |                                                  |
|  (profile name,    |                                                  |
|   schemaVersion,   |   ACTIVE SECTION                                 |
|   last-run badge)  |   (header bar with "Take over (N)" button,       |
|                    |    confirmation dialog on click)                 |
+--------------------+                                                  |
|  TOC SIDEBAR       |                                                  |
|  (sticky)          |   Editable form fields populated from payload    |
|                    |   pre-takeover, replaced by current Dataverse    |
|  Review            |   values post-takeover                           |
|   • Findings    ●  |                                                  |
|   • Proposed Email |                                                  |
|                    |                                                  |
|  Client Background |                                                  |
|   • Personal Det.  |                                                  |
|   • Prof. Exp.     |                                                  |
|   • Business Act.  |                                                  |
|   ...              |                                                  |
+--------------------+--------------------------------------------------+
```

Rejected alternatives: linear single-column (loses RM context across 17 sections), tabbed sections (hides per-tab progress).

## TOC structure (5 groups, 17 sections)

| Group | Sections |
|---|---|
| **Review** *(read-only)* | Findings · Proposed Email |
| **Client Background** | Personal Details · Professional Experience · Business Activities · Countries of Activity · Related Parties |
| **Financial Situation** | Financial Situation Narrative · Total Wealth and Income · Source of Wealth · Current Asset Allocation · Digital Asset Holdings Narrative · Detailed DA Holdings |
| **Expected Activity** | Transactional Behaviour · Planned Fiat Funds · Planned DA Funds |
| **Compliance & Other** | PEP, Adverse Media and Sanctions · Additional Comments |

### Status badges in TOC

Six states, distinguishable by colour and shape:

| State | Visual | Meaning |
|---|---|---|
| `n/a` | grey ring, no fill | Agent did not produce this section (key omitted from payload) |
| `pending` | grey solid | Agent produced data; takeover not yet run |
| `edited` | blue with halo | RM edited values pre-takeover |
| `done` | green solid | Takeover completed successfully |
| `partial-failed` | green/red split | Takeover completed but some operations failed (e.g. 4 of 5 itemized rows created) |
| `read-only` | grey ring, no halo | Findings, Proposed Email — never have a takeover to run |

`pending` vs `n/a` is critical: an empty pending section invites takeover ("AI extracted nothing? RM should investigate"); n/a hides the takeover button entirely.

## Section Catalog

Section types map to the four fundamental write operations the PCF performs. Confirmation dialog copy is templated per type (see *Confirmation Dialogs*).

| Section | Type | Fields written | Operation |
|---|---|---|---|
| Findings | read-only | — | none |
| Proposed Email | read-only + action | none directly; opens email activity via `Xrm.Navigation.openForm` (subject, description=body, regarding=KYC profile, to=customer) | form open |
| Personal Details | field set | `syg_AccountHolderNationalityID`, `syg_Nationality2ID`, `syg_accountholdernationality3id`, `syg_AccountHolderDomicileID`, `syg_dateofbirth`, `syg_AccountHolderCountryofBirthID`, `syg_uspersonstatus` | PATCH parent |
| Professional Experience | narrative | `syg_ProfessionalExperienceSummary` | PATCH parent |
| Business Activities | N:N | `syg_businessactivities_syg_KYCProfile_syg_KYCProfile` | $ref POST |
| Countries of Activity | N:N | `syg_new_country_syg_KYCProfile_syg_KYCProfile` | $ref POST |
| Related Parties | itemized + party-create | for each row: if `syg_relatedpartyid` is an existing `PartyRef`, just creates the `syg_relatedclientparties` junction row; if it's a `createNew` intent, first POSTs a new `contact` or `account` (with `new_typeofcontact = 9` and the extracted attributes), captures the returned GUID, then POSTs the junction row. Junction binds `syg_kycprofileid`. Two-stage POST per new party — see *Confirmation Dialogs* and *Lifecycle for new-party creation* below. | POST children (+ POST contact/account when `createNew`) |
| Financial Situation Narrative | narrative | `syg_FinancialSituationSummary` | PATCH parent |
| Total Wealth and Income | field set | `syg_TotalWealth_currency`, `syg_annualincome` (OptionSet bands), `syg_TimeframeforWealthAccumulation` | PATCH parent |
| Source of Wealth | itemized + narrative | `syg_sourceofwealthdetails` (4000-char narrative, textarea **above** cards) + creates `syg_sourceofwealth` rows (entity set `syg_sourceofwealths`) · binds `syg_kycprofileid` | PATCH parent + POST children (single takeover button) |
| Current Asset Allocation | field set | `syg_wealthdistribution_{cash,equities,fixedincome,digitalassets,realestate,commodities,other}_dec` (decimals 0–100) + `syg_TotalWealth_currency` (last-touch wins with Total Wealth and Income) | PATCH parent |
| Digital Asset Holdings Narrative | narrative | `syg_CryptoHoldingsNarrative` | PATCH parent |
| Detailed DA Holdings | itemized | creates `syg_DigitalAssetsHolding` rows (entity set `syg_digitalassetsholdings`) · binds `syg_KYCProfileID` | POST children |
| Transactional Behaviour | narrative | `syg_NarrativeforTransactionalBehaviour` | PATCH parent |
| Planned Fiat Funds | itemized | creates `syg_incomingfiatfunds` rows (entity set `syg_incomingfiatfundses`) · binds `syg_kycprofileid` | POST children |
| Planned DA Funds | itemized | creates `syg_digitalassetfunds` rows (entity set `syg_digitalassetfundses`) · binds `syg_kycprofileid` | POST children |
| PEP, Adverse Media and Sanctions | field set (3 sub-items, 1 takeover) | PEP: `syg_PEP` (bool), `syg_pepdetails`, `syg_pepstatus` (OptionSet 0–4) · Adverse Media: `syg_ReputationalRisk` (OptionSet 1/2/3) · Sanctions: `syg_SanctionCheck` (OptionSet 2/3) | PATCH parent |
| Additional Comments | narrative | `syg_AdditionalComments_clientservices` | PATCH parent |

**`syg_nationalities` aggregate text field is not written by the PCF.** It's expected to be maintained server-side by a plugin reading the three nationality lookups; if no plugin exists that's a separate backend ticket, not the PCF's responsibility.

### US Person OptionSet values (confirmed)

`syg_uspersonstatus`: `1` = Not a US Person · `2` = Former US Person · `3` = US Person · `4` = US Nexus

## Takeover lifecycle

Per section, regardless of type:

1. **Mount.** Section reads its slice from the payload. If the key is omitted → `n/a` state, no takeover button. If present → `pending`, fields rendered editable with payload pre-filled.
2. **Pre-takeover edit.** RM can adjust any field. State transitions to `edited` (blue halo) on first change.
3. **Click "Take over section (N)".** Confirmation dialog appears (see *Confirmation Dialogs*).
4. **Confirmed.** Button disabled, in-flight spinner. Operation runs (PATCH / POST / $ref / openForm).
5. **Completion.**
   - All operations OK → state `done`, button relabels to "Take over again", `takeoverStatus` blob updated with timestamp + result counts.
   - Any operation failed → state `partial-failed`, error surfaced inline per-row (itemized) or per-field (field set). Re-run is allowed and only retries failed operations.
6. **Re-run.** Same flow; confirmation dialog adds a duplicate-creation warning for itemized sections (see *Confirmation Dialogs*). PATCH-only sections skip the warning (idempotent overwrite).

### Lifecycle for new-party creation (Related Parties section only)

Related Parties is the only itemized section that can encounter rows referencing a Dataverse record that doesn't exist yet. The takeover for this section is a two-phase POST per new-party row:

1. **Phase 1 — create the underlying contact/account.** PCF POSTs to `/contacts` or `/accounts` with the `createNew` attributes (including `new_typeofcontact = 9`). Captures the returned GUID. If POST fails, the row is marked `failed`; phase 2 is skipped for that row.
2. **Phase 2 — create the junction.** PCF POSTs the `syg_relatedclientparties` row, binding `syg_kycprofileid` to the parent profile and `syg_relatedpartyid` to the GUID returned by phase 1 (or to the original `id` if the row was an `ExistingPartyRef`). If junction POST fails, the row is marked `failed` — but the orphan contact/account from phase 1 stays in Dataverse, and the row's error message includes the orphan GUID so RM can clean up manually. PCF does **not** auto-rollback (DELETE) the orphan; rollback is a Phase 2 enhancement.

The confirmation dialog (see below) explicitly enumerates every new contact/account being created so the RM has a single audit gate for all CRM-record creation.

### Status persistence

`takeoverStatus` is a bound multi-line text field on `syg_kycprofile` containing a JSON blob:

```json
{
  "schemaVersion": "1.0",
  "sections": {
    "personalDetails":      { "state": "done",  "lastRunAt": "2026-05-05T10:32:11Z", "result": { "patched": 7 } },
    "relatedParties":       { "state": "partial-failed", "lastRunAt": "...", "result": { "created": 4, "failed": 1 }, "errors": [ { "rowIndex": 2, "message": "..." } ] },
    "personalDetailsHash":  "<sha-of-payload>"
  }
}
```

The `*Hash` keys (per section) capture a hash of the payload slice at takeover time. Used by the UI to detect "agent payload changed since takeover" — surfaces a warning on the section header. (Phase 1: hash captured but no UI yet beyond the warning text; full re-take logic deferred.)

## JSON payload schema

Top-level shape: section-keyed object. Each section's own component knows how to read its slice.

```jsonc
{
  "schemaVersion": "1.0",

  "personalDetails": {
    "syg_AccountHolderNationalityID":   { "id": "<guid>", "name": "Switzerland",  "etn": "syg_country" },
    "syg_Nationality2ID":               { "id": "<guid>", "name": "Italy",        "etn": "syg_country" },
    "syg_accountholdernationality3id":  null,
    "syg_AccountHolderDomicileID":      { "id": "<guid>", "name": "Switzerland",  "etn": "syg_country" },
    "syg_dateofbirth":                  "1972-04-12",
    "syg_AccountHolderCountryofBirthID":{ "id": "<guid>", "name": "Italy",        "etn": "syg_country" },
    "syg_uspersonstatus":               1
  },

  "professionalExperience": { "syg_ProfessionalExperienceSummary": "..." },

  "businessActivities":  [ { "id": "<guid>", "name": "Asset management" } ],
  "countriesOfActivity": [ { "id": "<guid>", "name": "Switzerland" } ],

  "relatedParties": [
    {
      "relatedParty":     { "id": "<guid>", "name": "Jane Doe", "etn": "contact" },
      "partyType":        { "id": "<guid>", "name": "Beneficial Owner" },
      "syg_pep":          true,
      "syg_peplevelid":   { "id": "<guid>", "name": "Domestic PEP" },
      "syg_riskscore":    65
    }
  ],

  "financialSituationNarrative": "...",

  "totalWealthIncome": {
    "syg_TotalWealth_currency":           12500000,
    "syg_annualincome":                   5,
    "syg_TimeframeforWealthAccumulation": "..."
  },

  "sourceOfWealth": {
    "narrative": "...",
    "items": [ { "category": { "id": "<guid>", "name": "Inheritance" }, "amount": 5000000, "details": "..." } ]
  },

  "currentAssetAllocation": {
    "syg_TotalWealth_currency":                       12500000,
    "syg_wealthdistribution_cash_dec":                25,
    "syg_wealthdistribution_equities_dec":            30,
    "syg_wealthdistribution_fixedincome_dec":         10,
    "syg_wealthdistribution_digitalassets_dec":       15,
    "syg_wealthdistribution_realestate_dec":          15,
    "syg_wealthdistribution_commodities_dec":          0,
    "syg_wealthdistribution_other_dec":                5
  },

  "digitalAssetHoldingsNarrative": "...",
  "detailedDAHoldings":            [ { ...row fields... } ],

  "transactionalBehaviour": "...",
  "plannedFiatFunds":       [ { ...row fields... } ],
  "plannedDAFunds":         [ { ...row fields... } ],

  "pepSanctionsRisk": {
    "syg_PEP":              true,
    "syg_pepdetails":       "...",
    "syg_pepstatus":        2,
    "syg_SanctionCheck":    2,
    "syg_ReputationalRisk": 1
  },

  "additionalComments": "...",

  "findings": [
    { "severity": "warning", "category": "Source of Wealth", "title": "...", "detail": "...", "regulatoryReference": "FINMA AMLA Art. 6" }
  ],

  "proposedClientEmail": { "subject": "...", "to": [ { "id": "<guid>", "etn": "contact", "name": "..." } ], "body": "..." }
}
```

### Schema rules

| Rule | Behavior |
|---|---|
| **Enums** | Numeric OptionSet values only (`syg_pepstatus: 2`). Never string labels. PCF translates to display label via `optionSets.ts`. |
| **Lookups** | `{ id, name, etn }`. `id` is the GUID for the write; `name` is read-only display; `etn` is for navigation. Phase 1 lookups inside itemized rows are display-only — no edit. **GUIDs are never shown to the RM** — the UI renders `name` only (no debug tooltip, no copy-GUID affordance). |
| **GUID resolution responsibility (R-A)** | Agent is responsible for resolving every lookup to a Dataverse GUID *before* shipping the payload, including reference data (countries, party types, business activities, years, digital asset currencies) and existing contacts/accounts. The PCF treats `LookupRef.id` as authoritative and does **not** attempt name-based fallback resolution at takeover time. If the agent cannot resolve a name, it surfaces this in `findings` rather than shipping a malformed `LookupRef`. |
| **New related parties (N-B)** | Related Parties is the only section that supports new-record creation. Agent ships `CreateNewPartyRef` (no `id`, with `createNew` attribute block including `new_typeofcontact = 9`). PCF performs a two-stage write at takeover: POST contact/account, then POST junction. Confirmation dialog enumerates the new records by name before any write. PCF does **not** create new contacts/accounts in any other section. |
| **Email recipient `etn`** | Phase 1 KYC profiles are typically associated with `lead`, not `contact`. Sample payloads and the agent contract use `etn: "lead"` for `proposedClientEmail.to`. The schema does not restrict the value — partylist accepts any of `lead`, `contact`, `account`, `systemuser`, `queue`. |
| **Schema version** | `schemaVersion: "1.0"` at top level. PCF rejects unknown major versions with an error banner; minor version bumps are forward-compatible. |
| **Missing top-level key** | Section enters `n/a` state. Takeover button hidden. |
| **Missing field within a section** | That field is skipped at takeover (no PATCH for it). Distinguishes "don't change" from "blank it out". |
| **Empty array** | Section is `pending` with zero rows; takeover button shows "Take over (0)" and is allowed (it's a no-op POST batch — useful for marking a section as reviewed). |
| **Read-only sections (`findings`, `proposedClientEmail`)** | Same omission rules; absence hides the section in the TOC. |

## Confirmation dialogs

Five type-templated strings, interpolated with section name + counts. Triggered via `Xrm.Navigation.openConfirmDialog`.

| Section type | Dialog text |
|---|---|
| **Narrative** | *Replace **{field label}** with the AI-extracted text? Existing content will be overwritten.* |
| **Field set** | *Update **{N}** fields in **{section name}**? Existing values will be replaced.* |
| **Itemized** | *Create **{N}** {entity label} record(s)? This will add new rows to the {entity label} subgrid.* |
| **Itemized with new-party creation** *(Related Parties only)* | *This takeover will create **{C}** new contact(s), **{A}** new account(s), and link **{N}** related part(y\|ies) total ({E} existing + {C+A} new). New contact/account creation cannot be undone automatically. Proceed?* — `{C}`, `{A}`, `{E}` enumerate the new + existing breakdown; the dialog also lists the names of the new records on a second line for review. |
| **N:N** | *Associate this profile with **{N}** {entity label} record(s)?* |

**Re-run modifier** (appended when section's `state` is `done` or `partial-failed`):

| Section type | Re-run addendum |
|---|---|
| Itemized | *⚠ This will create duplicate records — the agent payload hasn't changed since the last run. Delete the existing rows manually first if you want a clean re-import.* |
| N:N | *⚠ Already-associated records will be silently ignored; only missing associations will be added.* |
| Narrative / Field set | (no addendum — operation is idempotent) |

## Manifest properties

```xml
<control namespace="Syg" constructor="KycFullTakeover" version="1.0.0" control-type="standard" api-version="1.3.0">
  <property name="aiAnalyticsAudit"   of-type="Multiple"      usage="bound"  required="true"  />  <!-- target syg_aianalytics_audit -->
  <property name="takeoverStatus"     of-type="Multiple"      usage="bound"  required="false" />  <!-- JSON blob, see Status persistence -->
  <property name="takeoverLastRunAt"  of-type="DateAndTime"   usage="bound"  required="false" />
  <property name="takeoverLastError"  of-type="Multiple"      usage="bound"  required="false" />
  <feature-usage>
    <uses-feature name="WebAPI" required="true" />
  </feature-usage>
</control>
```

**Narrative target fields are NOT bound.** They're written via OData PATCH using logical names from the payload. Trade-off: form designer can't see what fields the component touches; mitigation = `WRITTEN_FIELDS.md` checked in next to the manifest, listing every logical name written and which section writes it.

## File structure

```
KycFullTakeover/
  index.ts
  ControlManifest.Input.xml
  KycFullTakeover.pcfproj
  package.json
  tsconfig.json
  types.ts
  WRITTEN_FIELDS.md            # documents every logical name written + section
  components/
    KycFullTakeover.tsx        # root: header strip + TOC sidebar + main pane
    HeaderStrip.tsx
    TocSidebar.tsx
    SectionFrame.tsx           # generic section header + takeover button + status icon
    sections/
      FindingsSection.tsx
      ProposedEmailSection.tsx
      PersonalDetailsSection.tsx
      NarrativeSection.tsx     # generic for single-textarea sections
      AssociationChipsSection.tsx  # for BA + Countries
      ItemizedSection.tsx      # for SoW (with narrative slot), RP, FF, DAF, DAH
      TotalWealthIncomeSection.tsx
      AssetAllocationSection.tsx
      PepSanctionsRiskSection.tsx  # 1 section, 3 visual sub-items
    cards/
      SourceOfWealthCard.tsx
      RelatedPartyCard.tsx
      FiatFundCard.tsx
      DigitalAssetFundCard.tsx
      DigitalAssetHoldingCard.tsx
    common/
      StatusIcon.tsx
      LookupDisplay.tsx        # read-only chip showing name only (no GUID surface)
      MoneyInput.tsx
      DateInput.tsx
      OptionSetSelect.tsx
    wealth-allocation/         # COPIED from WealthAllocationControl, mirror comment in both files
      WealthAllocation.tsx
      AllocationBar.tsx
      AssetRow.tsx
      UnallocatedRow.tsx
      allocationLogic.ts
      tokens.ts
  utils/
    dataverse.ts               # OData URL builders, fetch helpers, entity-set table
    payloadParser.ts           # validates schemaVersion + per-section parsing
    payloadWriter.ts           # PATCH / POST / $ref orchestration
    formatters.ts              # Swiss apostrophe number, dd.MM.yyyy date
    optionSets.ts              # uspersonstatus, pepstatus, sanctioncheck, reputationalrisk, sourceofwealth, etc.
    guidValidation.ts
    sectionStatus.ts           # serialise/deserialise the takeoverStatus JSON blob, hash slices
    emailActivity.ts           # build openForm parameters
  styles/
    tokens.ts
```

The `wealth-allocation/` subdirectory is a copy-paste of the corresponding files in `WealthAllocationControl/`. Both copies carry a header comment:
```ts
// MIRROR OF WealthAllocationControl/components/WealthAllocation.tsx
// Refactor to a shared module if/when a third consumer needs this logic.
// Until then, fixes must be applied in both files. See:
// /docs/superpowers/specs/2026-05-05-kycfulltakeover-design.md
```

## Hard constraints (per existing project conventions)

Pulled from `docs/PCF_DEVELOPMENT_REFERENCE.md` and `feedback_*` rules:

- No `platform-library` (breaks macOS builds + Solution Checker)
- No Fluent UI v9 (D365 runtime crashes)
- No emojis anywhere — SVG icons only
- Inline styles only (no `.css` files); use `React.CSSProperties`
- All OData calls validate `resp.ok || resp.status === 204`
- GUIDs validated via standard regex before URL construction
- URL constructed with `new URL()`, only `https:` accepted
- All numeric inputs validated with `isFinite()`, not `!isNaN()`
- Confirmation dialogs via `Xrm.Navigation.openConfirmDialog` for all destructive / write actions
- No `console.log` in production code (errors via `console.error` are acceptable)
- Production build: `pcf-scripts build --buildMode production`
- Manual zip packaging into `Solution/manual-pack/Controls/Syg.KycFullTakeover/`
- Update `solution.xml` (RootComponent type=66, behaviour=0) and `customizations.xml` (CustomControl entry)
- Bump `Solution/manual-pack/solution.xml` version
- All ~10 existing controls must remain in the managed solution (else they get deleted on import)
- WebAPI calls: include `<uses-feature name="WebAPI">` in manifest

## Open questions resolved (traceability)

| Question | Resolution |
|---|---|
| Layout | B (Sticky TOC sidebar) |
| Takeover scope | Per-section, no global Run All |
| Section grouping | Content (5 groups), not format |
| Personal Details | Added as first Client Background section |
| Domicile fields | Single field, not primary/secondary |
| US Person | OptionSet 4-value, not boolean |
| Asset Allocation impl | Copy-paste from WealthAllocationControl into KycFullTakeover; no shared module in Phase 1 |
| Total Wealth ownership | Both edit, last-touch wins |
| `syg_sourceofwealthdetails` | Textarea above SoW cards, single section |
| `syg_natureofbusinessandsofs` | Dropped (legal-entity scope) |
| `syg_ComplianceSummary` | Dropped |
| `syg_nationalities` aggregate | Not written by PCF; backend's responsibility |
| Persistence | JSON blob in `takeoverStatus` |
| Re-run | Enabled, "Take over again", duplicate warning for itemized sections only |
| PEP/Adverse Media/Sanctions | One section with 3 visual sub-items, 1 takeover button |
| KycDraftTakeover lifecycle | Keep through Phase 1, sunset after Phase 2 |
| Confirmation dialog copy | 5 type-templated strings (4 base + 1 for Related Parties with new-party creation) + re-run modifier |
| JSON payload shape | Section-keyed top-level object, numeric enums, `{id, name, etn}` lookups, `schemaVersion` field, omitted-key = n/a |
| GUID resolution (reference data + existing parties) | R-A — agent resolves every lookup to a Dataverse GUID before shipping; PCF does no name-based fallback at takeover |
| GUIDs in the UI | Never shown to the RM. UI renders `name` only — no GUID tooltip, no debug affordance. |
| New related parties not yet in Dataverse | N-B — agent ships `CreateNewPartyRef` with `createNew` block; PCF creates the contact/account at takeover (POST → capture GUID → POST junction), gated by RM confirmation. `new_typeofcontact = 9` is set on every created record. PCF only creates new records in the Related Parties section. |
| Email recipient entity | `lead` (not `contact`) — Phase 1 KYC profiles associate with leads pre-onboarding |

## JSON Schema — full type definitions

This is the canonical contract between the upstream agent and the PCF. Every field is listed with its TypeScript type. **All entries are now grounded in the SygnumKYC managed solution schema** (`SygnumKYC_1_0_0_1_managed.zip`, customizations.xml) — no `PROPOSED` markers remain.

For each itemized entity the schema lists **every non-system field** that exists on the table. Phase 1's agent payload likely populates only a subset; fields the agent doesn't extract are simply omitted (per the missing-field semantics — PCF skips that PATCH/POST attribute, doesn't blank it). Mandatory minimum fields are flagged with `// REQUIRED` comments where Dataverse demands them or the row is meaningless without them.

```ts
// === Top-level envelope ===

interface KycPayload {
  schemaVersion: "1.0";

  // Read-only sections (non-takeover)
  findings?:             Finding[];
  proposedClientEmail?:  ProposedEmail;

  // Client Background
  personalDetails?:        PersonalDetailsSection;
  professionalExperience?: { syg_ProfessionalExperienceSummary: string };
  businessActivities?:     LookupRef[];   // N:N, target: syg_businessactivity
  countriesOfActivity?:    LookupRef[];   // N:N, target: syg_country
  relatedParties?:         RelatedPartyRow[];

  // Financial Situation
  financialSituationNarrative?:    string;          // → syg_FinancialSituationSummary
  totalWealthIncome?:              TotalWealthIncomeSection;
  sourceOfWealth?:                 SourceOfWealthSection;
  currentAssetAllocation?:         AssetAllocationSection;
  digitalAssetHoldingsNarrative?:  string;          // → syg_CryptoHoldingsNarrative
  detailedDAHoldings?:             DigitalAssetHoldingRow[];

  // Expected Activity
  transactionalBehaviour?:  string;                 // → syg_NarrativeforTransactionalBehaviour
  plannedFiatFunds?:        IncomingFiatFundRow[];
  plannedDAFunds?:          DigitalAssetFundRow[];

  // Compliance & Other
  pepSanctionsRisk?:    PepSanctionsRiskSection;
  additionalComments?:  string;                     // → syg_AdditionalComments_clientservices
}

// === Reusable types ===

// Lookup reference. `id` is the Dataverse GUID for the write; `name` is for
// read-only UI display; `etn` is the entity logical name for navigation.
interface LookupRef {
  id:    string;            // GUID, validated by the PCF before write
  name:  string;            // display label
  etn?:  string;            // logical name; required for polymorphic Customer lookups (account vs contact)
}

// === Read-only sections ===

interface Finding {
  severity:             "info" | "warning" | "critical";
  category:             string;                 // free text, e.g. "Source of Wealth"
  title:                string;
  detail:               string;
  regulatoryReference?: string;                 // optional, e.g. "FINMA AMLA Art. 6"
}

interface ProposedEmail {
  subject:  string;
  to:       LookupRef[];                        // contact/account references
  body:     string;                             // plain text or HTML; PCF passes verbatim to email activity
}

// === Client Background ===

// CONFIRMED — schema catalog
interface PersonalDetailsSection {
  syg_AccountHolderNationalityID?:   LookupRef | null;   // → syg_country
  syg_Nationality2ID?:               LookupRef | null;   // → syg_country
  syg_accountholdernationality3id?:  LookupRef | null;   // → syg_country
  syg_AccountHolderDomicileID?:      LookupRef | null;   // → syg_country
  syg_dateofbirth?:                  string;             // ISO 8601 yyyy-mm-dd
  syg_AccountHolderCountryofBirthID?: LookupRef | null;  // → syg_country
  syg_uspersonstatus?:               1 | 2 | 3 | 4;      // 1=Not US, 2=Former US, 3=US Person, 4=US Nexus
}

// Grounded in syg_relatedclientparties schema. The picklist fields
// (syg_relatedpartytype, syg_pepstatus) appear to be legacy duplicates of the
// lookup forms — agent writes the *id (lookup) variants only.
//
// syg_relatedpartyid is a polymorphic Customer lookup. Two cases:
//   - Existing party in Dataverse: agent ships PartyRef with `id`
//   - New party (no Dataverse record yet): agent ships PartyRef with `createNew`
//     and the PCF creates the contact/account at takeover time, gated by RM
//     confirmation, then writes the junction.
interface RelatedPartyRow {
  syg_name?:                            string;       // primary attribute, often display label
  syg_relatedpartyid:                   PartyRef;     // REQUIRED — existing GUID OR createNew intent
  syg_relatedpartytypeid:               LookupRef;    // REQUIRED — → syg_kycproperty (always existing reference data; carries impact + score)
  syg_relatedpartynationality1id?:      LookupRef | null;
  syg_relatedpartynationality2id?:      LookupRef | null;
  syg_relatedpartynationality3id?:      LookupRef | null;
  syg_domicilecountryid?:               LookupRef | null;
  syg_mainbusinessactivityid?:          LookupRef | null;   // → syg_businessactivities
  syg_maincountryofbusinessactivityid?: LookupRef | null;
  syg_relatedcountries?:                string;       // ntext — free-text aggregate the agent may emit
  syg_pep?:                             boolean;
  syg_pepstatusid?:                     LookupRef | null;   // lookup variant — preferred over syg_pepstatus picklist
  syg_peplevelid?:                      LookupRef | null;
  syg_riskscore?:                       number;       // whole number
}

// Polymorphic reference for related-party Customer lookups. Discriminated by
// presence of `id` (existing) or `createNew` (creation intent).
type PartyRef =
  | ExistingPartyRef
  | CreateNewPartyRef;

interface ExistingPartyRef {
  id:    string;                          // GUID of existing contact / account
  name:  string;                          // display label
  etn:   "contact" | "account";
}

interface CreateNewPartyRef {
  // No `id` — PCF will POST a new record at takeover time, then use the
  // returned GUID for the junction. The RM confirmation dialog enumerates
  // every new record being created so creation is auditable.
  etn:        "contact" | "account";
  name:       string;                     // display label (also used as account.name for accounts)
  createNew:  NewContactAttributes | NewAccountAttributes;
}

// Custom field new_typeofcontact = 9 is the Phase 1 default — marks every
// contact/account created via the takeover flow with a stable category code
// so they're filterable / reportable / cleanable later.
interface NewContactAttributes {
  // contact entity fields
  firstname?:                       string;
  lastname?:                        string;
  fullname?:                        string;        // computed by Dataverse from firstname/lastname; agent may also set
  new_typeofcontact:                number;        // REQUIRED for created records — Phase 1 ships value 9
  syg_dateofbirth?:                 string;        // ISO 8601 yyyy-mm-dd
  syg_accountholdernationalityid?:  LookupRef;
  syg_accountholderdomicileid?:     LookupRef;
  emailaddress1?:                   string;
  telephone1?:                      string;
}

interface NewAccountAttributes {
  // account entity fields (account.name is taken from PartyRef.name above)
  new_typeofcontact:                number;        // REQUIRED — same custom field exists on account, value 9
  syg_domicilecountryid?:           LookupRef;
  syg_mainbusinessactivityid?:      LookupRef;
  emailaddress1?:                   string;
  telephone1?:                      string;
}

// === Financial Situation ===

// Grounded in syg_KYCProfile schema.
// IMPORTANT: schema has both syg_totalwealth (picklist, banded) AND
// syg_totalwealth_currency (money). Agent emits whichever it has confidence in;
// PCF writes both if both are present.
interface TotalWealthIncomeSection {
  syg_TotalWealth_currency?:            number;      // money — CHF amount
  syg_TotalWealth?:                     number;      // picklist — banded total wealth (OptionSet integer)
  syg_annualincome?:                    number;      // picklist — OptionSet integer (annual income band)
  syg_TimeframeforWealthAccumulation?:  number;      // int — confirmed not narrative; likely "years" or banded code
}

interface SourceOfWealthSection {
  narrative:  string;                                // → syg_sourceofwealthdetails (ntext, 4000-char)
  items:      SourceOfWealthRow[];
}

// Grounded in syg_sourceofwealth schema. Many fields available; agent only
// populates what it can extract. Mandatory minimum: syg_name + the source
// category.
interface SourceOfWealthRow {
  syg_name?:                              string;       // REQUIRED — short label
  syg_sourceofwealth?:                    number;       // REQUIRED — picklist (category: Salary, Inheritance, Sale of Business, etc.)
  syg_description?:                       string;       // ntext — primary narrative for the row
  syg_companyname?:                       string;
  syg_counterpartyname?:                  string;
  syg_relationshiptocounterparty?:        number;       // picklist
  syg_businessactivityid?:                LookupRef;    // → syg_businessactivities
  syg_countryid?:                         LookupRef;    // → syg_country
  syg_yearofwealthgenerationid?:          LookupRef;    // → syg_year
  syg_yearofwealthgenerationinitiatedid?: LookupRef;    // → syg_year
  syg_initialinvestment?:                 number;       // money
  syg_valueatvaluationdate?:              number;       // money
  syg_valuationdate?:                     string;       // ISO date
  syg_wealthgenerated?:                   number;       // money — main "amount" for this row
  syg_corroboratedvalue?:                 number;       // money
  syg_corroboratedpercentage?:            number;       // decimal 0-100
  syg_rationale?:                         string;       // ntext
  syg_supportinginformation?:             string;       // ntext
  syg_additionaldetails?:                 string;       // ntext
  syg_digitalassetactivities?:            number[];     // multiselect picklist (array of OptionSet ints)
}

// Grounded in syg_KYCProfile schema. The `_dec` decimal fields are the live
// percent fields (0-100). The `_int` fields exist but are flagged
// "XX_Depricated_*" in the schema — DO NOT WRITE.
interface AssetAllocationSection {
  // Last-touch wins with totalWealthIncome — both sections may write this field
  syg_TotalWealth_currency?:                  number;
  syg_wealthdistribution_cash_dec?:           number;     // 0-100 decimal percent
  syg_wealthdistribution_equities_dec?:       number;
  syg_wealthdistribution_fixedincome_dec?:    number;
  syg_wealthdistribution_digitalassets_dec?:  number;
  syg_wealthdistribution_realestate_dec?:     number;
  syg_wealthdistribution_commodities_dec?:    number;
  syg_wealthdistribution_other_dec?:          number;
}

// Grounded in syg_DigitalAssetsHolding schema.
interface DigitalAssetHoldingRow {
  syg_name?:                  string;       // REQUIRED — primary attribute, often token-ticker label
  syg_digitalassetid?:        LookupRef;    // REQUIRED — → syg_digitalassetcurrency (BTC, ETH, etc.)
  syg_amount?:                number;       // decimal — quantity of tokens (may be fractional)
  syg_currentvaluechf?:       number;       // money — current fiat-equivalent value
  syg_valuechf?:              number;       // money
  syg_dateofvaluation?:       string;       // ISO date
  syg_acquiringyear?:         LookupRef;    // → syg_year
  syg_acquiringplace?:        string;
  syg_averageacquiringprice?: number;       // money — avg price per DA at acquisition
  syg_corroboratedamount?:    number;       // decimal
  syg_corroboratedamountchf?: number;       // money
  syg_corroboratedvalue?:     number;       // money
  syg_currentcustody?:        string;
  syg_description?:           string;       // ntext
  syg_originoffunds?:         string;       // ntext
  syg_supportingdocuments?:   string;       // ntext
}

// === Expected Activity ===

// Grounded in syg_incomingfiatfunds schema. Slim — bank, amount, timeframe.
interface IncomingFiatFundRow {
  syg_name?:             string;            // REQUIRED — primary
  syg_amount?:           number;            // money — first-transfer amount
  syg_bank?:             string;
  syg_bankdomicileid?:   LookupRef;         // → syg_country
  syg_clientid?:         LookupRef;         // polymorphic Customer (account/contact) — payer
  syg_proofofownership?: boolean;
  syg_transfertimeframe?: number;           // picklist (timeframe band)
}

// Grounded in syg_digitalassetfunds schema. Uses first-transfer +
// current-value semantics (not per-period income).
interface DigitalAssetFundRow {
  syg_name?:                              string;     // REQUIRED — primary
  syg_customerid?:                        LookupRef;  // polymorphic Customer
  syg_firstdigitalassettransfertype?:     LookupRef;  // REQUIRED — → syg_digitalassetcurrency
  syg_firstdigitalassettransferamount?:   number;     // decimal — first-transfer DA quantity
  syg_firsttransferamount?:               number;     // money — first-transfer fiat-equivalent
  syg_currentvaluechf?:                   number;     // money
  syg_valuechf?:                          number;     // money
  syg_dateofvaluation?:                   string;     // ISO date
  syg_proofofownership?:                  boolean;
  syg_senderwallet?:                      string;     // public address (free text)
  syg_senderwallet_optionset?:            number;     // picklist alternative
  syg_source?:                            string;     // exchange name when sending from one
  syg_transfertimeframe?:                 number;     // picklist
  syg_remarks?:                           string;     // ntext
  syg_comment?:                           string;     // ntext
  syg_additionalexpectedfunding?:         string;     // ntext
}

// === Compliance & Other ===

// Grounded in syg_KYCProfile schema. The schema exposes more nuance than the
// catalog: separate narrative fields for adverse media and sanctions, plus
// derivation/former-PEP details.
interface PepSanctionsRiskSection {
  // PEP sub-item
  syg_PEP?:                                       boolean;
  syg_pepstatus?:                                 number;     // picklist (0-4)
  syg_pepstatusid?:                               LookupRef;  // lookup variant — preferred when populated
  syg_peplevelid?:                                LookupRef;
  syg_pepdetails?:                                string;     // ntext
  syg_pepderivationdetails?:                      string;     // ntext
  syg_formerpepdetails?:                          string;     // ntext

  // Adverse Media sub-item
  syg_ReputationalRisk?:                          number;     // picklist (1/2/3)
  syg_mediascreeningandreputationalriskcomment?:  string;     // ntext

  // Sanctions sub-item
  syg_SanctionCheck?:                             number;     // picklist (2/3)
  syg_sanctioncheckcomment?:                      string;     // nvarchar
}
```

### Catalog corrections from schema verification

The following adjustments to the *Section Catalog* table earlier in this spec are made effective by this schema appendix:

1. **Total Wealth and Income** writes ALSO `syg_TotalWealth` (picklist band) when present — not only the `syg_TotalWealth_currency` money field
2. **`syg_TimeframeforWealthAccumulation`** is `int`, not narrative text — store as number, not string
3. **PEP / Adverse Media / Sanctions** section also writes:
   - `syg_pepderivationdetails`, `syg_formerpepdetails` (PEP sub-item)
   - `syg_mediascreeningandreputationalriskcomment` (Adverse Media sub-item)
   - `syg_sanctioncheckcomment` (Sanctions sub-item)
4. **Wealth distribution** — only the `_dec` decimal fields are written. The `_int` percent fields and `_currency` fiat fields exist on the entity but are not Phase 1 targets (the `_int` ones are flagged deprecated in the schema)
5. **Related Parties** — junction record carries more fields than the catalog enumerated: `syg_domicilecountryid`, `syg_mainbusinessactivityid`, `syg_maincountryofbusinessactivityid`, three nationality lookups, free-text `syg_relatedcountries`. All optional in Phase 1

### OptionSet values still to confirm at implementation time

The picklist *attribute* declarations are confirmed but their integer-to-label maps weren't extracted into this spec (would have ballooned the doc). They're worth confirming when the implementation parser is written:
- `syg_annualincome` (band integers)
- `syg_TotalWealth` (band integers)
- `syg_sourceofwealth` (category integers — likely Salary, Inheritance, Sale of Business, etc.)
- `syg_relationshiptocounterparty`
- `syg_transfertimeframe` (used by both fiat-funds and DA-funds)
- `syg_pepstatus` (0–4 per catalog; verify labels)
- `syg_uspersonstatus` (1–4 confirmed earlier in this spec)

The PCF's `utils/optionSets.ts` will be the single source of truth for these maps; agent emits integers, PCF translates to display labels.

## Phase 2 (deferred)

- Legal-entity field set (`syg_LegalEntityForm`, `syg_csa_*`, `syg_FundType`, `syg_letotalassets`, `syg_natureofbusinessandsofs`)
- Editing lookups inside itemized rows (with proper lookup picker + GUID validation)
- Sunsetting `KycDraftTakeover`
- Optional: global "Run All Remaining" with per-section results modal
- Optional: localization beyond English
- Optional: refactor `wealth-allocation/` into a shared module if a third consumer appears
