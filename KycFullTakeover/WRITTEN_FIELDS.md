# KycFullTakeover — Fields Written by Section

This document mirrors the spec's Section Catalog, scoped to fields **actually written** by the PCF (vs fields that exist on the entity but stay untouched). Form designers should consult this list when configuring auditing, security, or workflows that need to know which columns the takeover modifies.

> **Why this exists:** narrative + field-set sections write via OData PATCH using logical names from the JSON payload. These fields are NOT bound on the manifest. Without this doc, a form designer can't tell what the component touches.

> **Casing rule:** All Dataverse logical names below are lowercase. The OData property path is case-sensitive; v0.1.0 mistakenly wrote CamelCase property names and the API rejected them with `Invalid property '...' was found in entity 'Microsoft.Dynamics.CRM.syg_kycprofile'`. v0.1.1 onwards uses lowercase exclusively.

## Phase 1 (v0.4.0 — current)

| Section | Entity | Fields written | Op |
|---|---|---|---|
| Findings | — read-only — | — | none |
| Proposed Email | `email` (new record via openForm) | subject, description, regardingobjectid, to | form open |
| Business Activities | N:N relationship | `syg_businessactivities_syg_KYCProfile_syg_KYCProfile` → target entity-set `syg_businessactivitieses` | $ref POST |
| Countries of Activity | N:N relationship | `syg_new_country_syg_KYCProfile_syg_KYCProfile` → target entity-set `new_countries` | $ref POST |
| Personal Details | `syg_kycprofile` | `syg_accountholdernationalityid@odata.bind`, `syg_nationality2id@odata.bind`, `syg_accountholdernationality3id@odata.bind`, `syg_accountholderdomicileid@odata.bind`, `syg_accountholdercountryofbirthid@odata.bind`, `syg_dateofbirth`, `syg_uspersonstatus` | PATCH |
| Professional Experience | `syg_kycprofile` | `syg_professionalexperiencesummary` | PATCH |
| Financial Situation Narrative | `syg_kycprofile` | `syg_financialsituationsummary` | PATCH |
| Total Wealth and Income | `syg_kycprofile` | `syg_totalwealth_currency`, `syg_totalwealth`, `syg_annualincome`, `syg_timeframeforwealthaccumulation` | PATCH |
| Current Asset Allocation | `syg_kycprofile` | `syg_totalwealth_currency` (last-touch wins with Total Wealth and Income), `syg_wealthdistribution_cash_dec`, `syg_wealthdistribution_equities_dec`, `syg_wealthdistribution_fixedincome_dec`, `syg_wealthdistribution_digitalassets_dec`, `syg_wealthdistribution_realestate_dec`, `syg_wealthdistribution_commodities_dec`, `syg_wealthdistribution_other_dec` | PATCH |
| Digital Asset Holdings Narrative | `syg_kycprofile` | `syg_cryptoholdingsnarrative` | PATCH |
| Transactional Behaviour | `syg_kycprofile` | `syg_narrativefortransactionalbehaviour` | PATCH |
| PEP, Adverse Media and Sanctions | `syg_kycprofile` | `syg_pep`, `syg_pepstatus`, `syg_pepdetails`, `syg_pepderivationdetails`, `syg_formerpepdetails`, `syg_peplevelid@odata.bind`, `syg_reputationalrisk`, `syg_mediascreeningandreputationalriskcomment`, `syg_sanctioncheck`, `syg_sanctioncheckcomment` | PATCH |
| Additional Comments | `syg_kycprofile` | `syg_additionalcomments_clientservices` | PATCH |
| Source of Wealth | `syg_sourceofwealth` (POST per row) + `syg_kycprofile.syg_sourceofwealthdetails` (parent PATCH) | `syg_name`, `syg_sourceofwealth` (picklist), `syg_description`, `syg_companyname`, `syg_counterpartyname`, `syg_relationshiptocounterparty` (picklist), `syg_businessactivityid@odata.bind`, `syg_countryid@odata.bind`, `syg_yearofwealthgenerationid@odata.bind`, `syg_yearofwealthgenerationinitiatedid@odata.bind`, `syg_initialinvestment`, `syg_valueatvaluationdate`, `syg_valuationdate`, `syg_wealthgenerated`, `syg_corroboratedvalue`, `syg_corroboratedpercentage`, `syg_rationale`, `syg_supportinginformation`, `syg_additionaldetails` | POST children + PATCH parent |
| Detailed DA Holdings | `syg_DigitalAssetsHolding` (POST per row) | `syg_name`, `syg_digitalassetid@odata.bind`, `syg_amount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_acquiringyear@odata.bind`, `syg_acquiringplace`, `syg_averageacquiringprice`, `syg_corroboratedamount`, `syg_corroboratedamountchf`, `syg_corroboratedvalue`, `syg_currentcustody`, `syg_description`, `syg_originoffunds`, `syg_supportingdocuments` | POST children |
| Planned Fiat Funds | `syg_incomingfiatfunds` (POST per row) | `syg_name`, `syg_amount`, `syg_bank`, `syg_bankdomicileid@odata.bind`, `syg_clientid_account@odata.bind` OR `syg_clientid_contact@odata.bind`, `syg_proofofownership`, `syg_transfertimeframe` | POST children |
| Planned DA Funds | `syg_digitalassetfunds` (POST per row) | `syg_name`, `syg_customerid_account@odata.bind` OR `syg_customerid_contact@odata.bind`, `syg_firstdigitalassettransfertype@odata.bind`, `syg_firstdigitalassettransferamount`, `syg_firsttransferamount`, `syg_currentvaluechf`, `syg_valuechf`, `syg_dateofvaluation`, `syg_proofofownership`, `syg_senderwallet`, `syg_senderwallet_optionset` (picklist), `syg_source`, `syg_transfertimeframe` (picklist), `syg_remarks`, `syg_comment`, `syg_additionalexpectedfunding` | POST children |

## Phase 2 (planned — M6)

| Milestone | Sections | Op |
|---|---|---|
| M6 | Related Parties | POST contact/account (when CreateNewPartyRef) + POST junction `syg_relatedclientpartieses` |

## Status persistence

The PCF writes its own status blob to bound fields on every takeover:

| Field | Type | Purpose |
|---|---|---|
| `takeoverStatus` | Multiple-line text | JSON blob: per-section status, timestamps, payload hashes |
| `takeoverLastRunAt` | DateTime | Most-recent takeover timestamp |
| `takeoverLastError` | Multiple-line text | Most-recent failure message |

These three fields are bound on the manifest and updated via `notifyOutputChanged` — they go through the standard PCF output flow. v0.1.2 onwards triggers `Xrm.Page.data.save()` automatically after each takeover so the status persists across form reloads.
