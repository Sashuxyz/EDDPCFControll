# NpOnboardingChecklist — Design Spec

**Date:** 2026-04-13  
**Namespace:** `Syg`  
**Folder:** `NpOnboardingChecklist/`  
**Type:** Field-bound PCF control (React 18, inline styles only)

---

## Purpose

A 4-eyes verification checklist rendered on a Dynamics 365 Service Request form. An onboarding officer confirms that data pushed from CRM into the core banking system (Finnova) is correct. The officer answers Yes/No per item, documents any discrepancies, and marks them resolved before completing the checklist.

---

## Properties

| Property | Type | Direction | Description |
|---|---|---|---|
| `checkResults` | Multiple Lines of Text | bound (output + input) | JSON blob storing all answers, mismatches, manual blocks, and completion summary |
| `checklistConfig` | Multiple Lines of Text | input | Optional JSON to override labels or hide sections (future use; MVP reads static config) |
| `isReadOnly` | TwoOptions | input | When true, renders in read-only display mode — no Yes/No buttons |

---

## Output JSON Schema

Stored in `checkResults`. Written on every answer change (no explicit save button — Dynamics saves via the form).

```json
{
  "answers": {
    "dob": "yes",
    "rm": "no",
    "active": "yes"
  },
  "mismatches": {
    "rm": {
      "description": "RM shows John Smith",
      "actionTaken": "Updated in Finnova",
      "resolution": "Finnova Corrected Manually",
      "resolved": true
    }
  },
  "manualNotDone": {
    "active": {
      "label": "Set Client as Active",
      "reason": "Client setup pending"
    }
  },
  "summary": {
    "total": 16,
    "completed": 14,
    "mismatches": 1,
    "blocked": 1,
    "completedAt": "2026-04-13T10:22:00Z",
    "completedBy": "Anna Hrynova"
  }
}
```

`completedAt` and `completedBy` are written when the user clicks "Complete checklist" (all blocks cleared, no unresolved mismatches). `completedBy` is the full name from `context.userSettings.userName`.

---

## Checklist Sections and Items

### Section 1 — Client properties check
| Key | Label | Type | CRM source field |
|---|---|---|---|
| `dob` | Date of Birth | CRM check | `birthdate` |
| `rm` | Relationship Manager | CRM check | `syg_relationshipmanager` (lookup name) |
| `active` | Set Client as Active | Manual check | — |
| `risk` | Risk Level | CRM check | `syg_risklevel` |
| `pep` | PEP Status | CRM check | `syg_pepstatus` |
| — | Nationalities | Display only | `syg_nationalities` |

### Section 2 — ID data (display only)
Related entity: `syg_iddocument` (N:1 to contact). Shows document type, number, country/place of issue, issue date, expiry date. Per document card. No Yes/No buttons — read-only reference.

Also displays: Client Segment (`syg_clientsegment`).

### Section 3 — Finnova accounts
| Key | Label | Type |
|---|---|---|
| `currency` | Portfolio Default Currency | CRM check |
| `pms` | PMS+ | Manual check |
| `payment` | Payment Rules Matching Main Account Currency | Manual check |
| `block` | Remove a General Block | Manual check |
| `special` | Special Conditions | CRM check |
| `archive` | Set Up a Web Archive | Manual check |
| `btct` | Add BTC and ETH Trading | CRM check |
| `btcv` | Add BTC and ETH Vault | CRM check |
| — | Digital Asset Vault Currency | Display only |

### Section 4 — Finnova: Tax information
Related entity: `syg_taxrecord` (N:1 to contact). Each record shows Tax domicile + Tax ID with a Yes/No "Tax ID verified" check per record.

Additional items:
| Key | Label | Type |
|---|---|---|
| `chtax` | CH Tax Regulations | Manual check |
| `dispatch` | Direct Dispatch (CH clients) | Manual check |
| `indicia` | Run INDICIA Search | CRM check |
| `oms` | Created Client in OMS and Added the Tier | Manual check |

### Section 5 — Additional actions
| Key | Label | Type |
|---|---|---|
| `omst` | Has the Tier Been Updated on OMS Portal? | Manual check |
| `cv4` | C-Vault: Business Team Approved with 4-Eyes Check | Manual check |
| `cvw` | C-Vault: Wallets | Manual check |

---

## Item Behaviour

### CRM check items
- Show a lock icon next to the title and display the CRM value below it.
- Yes = data confirmed correct → item counts as done.
- No = mismatch → yellow highlight, mismatch form appears with:
  - **What is incorrect in core banking?** (textarea, required before resolving)
  - **Corrective action taken** (textarea, optional)
  - **Resolution** (select: "Finnova Corrected Manually" | "Other")
  - **Mark as resolved** (checkbox) — requires description field filled; when checked, item counts as done.

### Manual check items
- Show italic "Manual check" below the title. No CRM value. No lock icon.
- Yes = done → counts toward progress.
- No = hard block → red highlight, simplified form appears with:
  - **Reason** (textarea, optional — not required)
  - Blocking note: "This check blocks checklist completion"
  - No resolve option — item stays blocked until user changes to Yes.

### Display-only items
- Grey "Display only" status dot + label. No Yes/No buttons. Not counted in progress total.

---

## Progress and Header

- Sticky header with title, "X of Y items checked" count, and 4px blue progress bar.
- Display-only items are excluded from the total count.
- Tax record checks count as one item per record (dynamic based on how many records exist).
- Mismatch alert bar (yellow) lists unresolved CRM mismatches — each is a scroll-to link.
- Blocked alert bar (red) lists manual checks answered No — each is a scroll-to link.

---

## Section Headers (collapsed state)

Each collapsed section shows a summary in the header:
- `X / Y checked` — normal state
- `N mismatch · X/Y` — when CRM mismatches present (yellow text)
- `N blocked · X/Y` — when manual No items present (red text)
- `All confirmed` — when all done (green text)
- Left border: yellow for mismatches, red for blocked, green for all done.

---

## Submit Bar (sticky footer)

- **Complete checklist** button — disabled while any manual No or unresolved mismatch exists.
- Info text explains what is blocking (e.g. "2 manual checks not completed — completion is blocked").
- On click: writes `completedAt` (ISO timestamp) and `completedBy` (user full name) to the JSON, then calls `notifyOutputChanged()`.

---

## Data Loading

Two WebAPI calls in `init()`:

1. Retrieve the Service Request record with expanded contact (onboarding subject). Fetches all CRM check field values (DOB, RM, risk level, PEP status, nationalities, portfolio currency, special conditions, BTC/ETH flags, client segment).

2. Retrieve related records:
   - `syg_iddocument` records linked to the contact — for Section 2 display cards.
   - `syg_taxrecord` records linked to the contact — for Section 4 tax cards and per-record Yes/No checks.

Record ID: `(context.mode as any).contextInfo.entityId`, with fallback to `Xrm.Page.data.entity.getId()`.

If `checkResults` already contains JSON (re-opening a saved record), the control restores all answers, mismatch forms, and status indicators on first render.

---

## Read-only Mode

When `isReadOnly` is true:
- Yes/No buttons are replaced with a status indicator (Confirmed / Mismatch / Not done / Pending).
- Mismatch forms are rendered collapsed and non-editable (values shown as read-only text).
- Submit bar is hidden.
- Section headers still expand/collapse for navigation.

---

## State Management (React)

Single `useState` object with shape:
```ts
interface CheckState {
  answers: Record<string, 'yes' | 'no' | null>;
  mismatches: Record<string, { description: string; actionTaken: string; resolution: string; resolved: boolean }>;
  manualNotDone: Record<string, { label: string; reason: string }>;
  crmValues: Record<string, string>;   // loaded from WebAPI
  taxRecords: TaxRecord[];
  idDocuments: IdDocument[];
  loading: boolean;
}
```

Every state change triggers `notifyOutputChanged()` (guarded by `pendingOutput` flag to prevent `updateView` loop — same pattern as WealthAllocationControl and KycDraftTakeover).

---

## Technical Constraints

All from `docs/PCF_DEVELOPMENT_REFERENCE.md`:
- No Fluent UI v9 — inline `React.CSSProperties` only.
- `createRoot` (React 18) — not deprecated `ReactDOM.render`.
- `pcf-scripts build --buildMode production` in package.json.
- No emojis — SVG icons only.
- No `console.log` in production code.
- Manifest: only `<platform-library name="React" version="18.2.0" />`.
- Swiss-German date format: `toLocaleDateString('de-CH')` → DD.MM.YYYY.

---

## Files to Create

```
NpOnboardingChecklist/
  ControlManifest.Input.xml
  package.json
  tsconfig.json
  index.ts
  components/
    ChecklistRoot.tsx       — top-level state, data loading, output write
    StickyHeader.tsx        — progress bar, alert bars
    SectionCard.tsx         — collapsible section with summary
    CheckItem.tsx           — CRM check item with mismatch form
    ManualCheckItem.tsx     — manual check item with blocked form
    DisplayItem.tsx         — display-only row
    IdDocumentSection.tsx   — Section 2 document cards
    TaxRecordSection.tsx    — Section 4 per-record tax checks
    SubmitBar.tsx           — sticky footer with complete button
  types.ts                  — shared TypeScript interfaces
  utils.ts                  — JSON serialisation, date formatting
```
