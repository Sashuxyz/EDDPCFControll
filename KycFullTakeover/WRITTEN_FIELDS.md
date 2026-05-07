# KycFullTakeover — Fields Written by Section

This document mirrors the spec's Section Catalog, scoped to fields **actually written** by the PCF (vs fields that exist on the entity but stay untouched). Form designers should consult this list when configuring auditing, security, or workflows that need to know which columns the takeover modifies.

> **Why this exists:** narrative + field-set sections write via OData PATCH using logical names from the JSON payload. These fields are NOT bound on the manifest. Without this doc, a form designer can't tell what the component touches.

## Phase 1 (v0.1.1 — current)

| Section | Entity | Fields written | Op |
|---|---|---|---|
| Findings | — read-only — | — | none |
| Proposed Email | `email` (new record via openForm) | subject, description, regardingobjectid, to | form open |
| Professional Experience | `syg_kycprofile` | `syg_professionalexperiencesummary` | PATCH |
| Financial Situation Narrative | `syg_kycprofile` | `syg_financialsituationsummary` | PATCH |
| Digital Asset Holdings Narrative | `syg_kycprofile` | `syg_cryptoholdingsnarrative` | PATCH |
| Transactional Behaviour | `syg_kycprofile` | `syg_narrativefortransactionalbehaviour` | PATCH |
| Additional Comments | `syg_kycprofile` | `syg_additionalcomments_clientservices` | PATCH |

> **Note on casing:** Dataverse logical names are lowercase. The display names (e.g. "Professional Experience Summary") shown in the form designer are CamelCase but they are NOT used in OData property paths. v0.1.0 mistakenly wrote CamelCase property names and the OData API rejected them with `Invalid property '...' was found in entity 'Microsoft.Dynamics.CRM.syg_kycprofile'`. All Dataverse field references in this control's code paths must be lowercase.

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
