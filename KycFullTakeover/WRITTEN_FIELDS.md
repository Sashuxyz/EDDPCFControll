# KycFullTakeover — Fields Written by Section

This document mirrors the spec's Section Catalog, scoped to fields **actually written** by the PCF (vs fields that exist on the entity but stay untouched). Form designers should consult this list when configuring auditing, security, or workflows that need to know which columns the takeover modifies.

> **Why this exists:** narrative + field-set sections write via OData PATCH using logical names from the JSON payload. These fields are NOT bound on the manifest. Without this doc, a form designer can't tell what the component touches.

> **Casing rule:** All Dataverse logical names below are lowercase. The OData property path is case-sensitive; v0.1.0 mistakenly wrote CamelCase property names and the API rejected them with `Invalid property '...' was found in entity 'Microsoft.Dynamics.CRM.syg_kycprofile'`. v0.1.1 onwards uses lowercase exclusively.

## Phase 1 (v0.3.0 — current)

| Section | Entity | Fields written | Op |
|---|---|---|---|
| Findings | — read-only — | — | none |
| Proposed Email | `email` (new record via openForm) | subject, description, regardingobjectid, to | form open |
| Business Activities | N:N relationship | `syg_businessactivities_syg_KYCProfile_syg_KYCProfile` → target entity-set `syg_businessactivitieses` | $ref POST |
| Countries of Activity | N:N relationship | `syg_new_country_syg_KYCProfile_syg_KYCProfile` → target entity-set `new_country` | $ref POST |
| Personal Details | `syg_kycprofile` | `syg_accountholdernationalityid@odata.bind`, `syg_nationality2id@odata.bind`, `syg_accountholdernationality3id@odata.bind`, `syg_accountholderdomicileid@odata.bind`, `syg_accountholdercountryofbirthid@odata.bind`, `syg_dateofbirth`, `syg_uspersonstatus` | PATCH |
| Professional Experience | `syg_kycprofile` | `syg_professionalexperiencesummary` | PATCH |
| Financial Situation Narrative | `syg_kycprofile` | `syg_financialsituationsummary` | PATCH |
| Total Wealth and Income | `syg_kycprofile` | `syg_totalwealth_currency`, `syg_totalwealth`, `syg_annualincome`, `syg_timeframeforwealthaccumulation` | PATCH |
| Current Asset Allocation | `syg_kycprofile` | `syg_totalwealth_currency` (last-touch wins with Total Wealth and Income), `syg_wealthdistribution_cash_dec`, `syg_wealthdistribution_equities_dec`, `syg_wealthdistribution_fixedincome_dec`, `syg_wealthdistribution_digitalassets_dec`, `syg_wealthdistribution_realestate_dec`, `syg_wealthdistribution_commodities_dec`, `syg_wealthdistribution_other_dec` | PATCH |
| Digital Asset Holdings Narrative | `syg_kycprofile` | `syg_cryptoholdingsnarrative` | PATCH |
| Transactional Behaviour | `syg_kycprofile` | `syg_narrativefortransactionalbehaviour` | PATCH |
| PEP, Adverse Media and Sanctions | `syg_kycprofile` | `syg_pep`, `syg_pepstatus`, `syg_pepdetails`, `syg_pepderivationdetails`, `syg_formerpepdetails`, `syg_peplevelid@odata.bind`, `syg_reputationalrisk`, `syg_mediascreeningandreputationalriskcomment`, `syg_sanctioncheck`, `syg_sanctioncheckcomment` | PATCH |
| Additional Comments | `syg_kycprofile` | `syg_additionalcomments_clientservices` | PATCH |

## Phase 2 (planned — M5-M6)

| Milestone | Sections | Op |
|---|---|---|
| M5 | Source of Wealth, Detailed DA Holdings, Planned Fiat Funds, Planned DA Funds | POST children to `syg_sourceofwealths` / `syg_digitalassetsholdings` / `syg_incomingfiatfundses` / `syg_digitalassetfundses` |
| M6 | Related Parties | POST contact/account (when CreateNewPartyRef) + POST junction `syg_relatedclientpartieses` |

## Status persistence

The PCF writes its own status blob to bound fields on every takeover:

| Field | Type | Purpose |
|---|---|---|
| `takeoverStatus` | Multiple-line text | JSON blob: per-section status, timestamps, payload hashes |
| `takeoverLastRunAt` | DateTime | Most-recent takeover timestamp |
| `takeoverLastError` | Multiple-line text | Most-recent failure message |

These three fields are bound on the manifest and updated via `notifyOutputChanged` — they go through the standard PCF output flow. v0.1.2 onwards triggers `Xrm.Page.data.save()` automatically after each takeover so the status persists across form reloads.
