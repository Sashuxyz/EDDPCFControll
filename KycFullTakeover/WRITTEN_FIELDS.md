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
