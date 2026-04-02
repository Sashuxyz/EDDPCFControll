# EDD Findings Viewer — Design Specification

## Overview

A PowerApps Component Framework (PCF) dataset control that replaces a standard Dynamics 365 subgrid on the KYC Profile (`syg_kycprofile`) form. It displays EDD Finding (`syg_eddfinding`) records as expandable document-style cards optimized for reading long-form rich text descriptions (~1000 characters, including embedded tables and images).

The control must work identically in two contexts:
1. The KYC Profile form opened standalone.
2. The KYC Profile form embedded inside another entity form via the standard "Edit Form" control.

## Technical Stack

- **PCF dataset control** (binds to the subgrid dataset)
- **React 18** (using `createRoot` API) + **TypeScript**
- **Fluent UI v9** (`@fluentui/react-components`) — styled to match Dynamics 365 design language
- **DOMPurify** for HTML sanitization of rich text descriptions
- Bundle with the PCF tooling's built-in webpack config

## Data Model — `syg_eddfinding`

The control receives these columns via the dataset binding (configured in the subgrid properties on the form):

| Column (Schema Name) | Type | Description |
|---|---|---|
| `syg_name` | Text | Short finding title |
| `syg_category` | OptionSet | Finding category (e.g., PEP, Sanctions, Adverse Media, Source of Wealth, Other) |
| `syg_riskseverity` | OptionSet | Risk severity (Low, Medium, High, Critical) |
| `syg_description` | Multiline Text (Rich Text) | Detailed finding narrative with HTML content (~1000 chars). May contain tables, images (base64), bold text, lists. |
| `syg_status` | OptionSet | Status (Open, Mitigated, Accepted, Closed) |
| `syg_linkedcondition` | Lookup | Link to a Compliance Condition record (nullable) |
| `createdon` | DateTime | Record created date |
| `modifiedon` | DateTime | Record last modified date |
| `createdby` | Lookup | User who created the record |

**Parent relationship:** The `syg_eddfinding` entity has a lookup field `syg_kycprofileid` (verify actual schema name) pointing to `syg_kycprofile`. This is the field that gets pre-populated when creating a new finding from within this control.

**Note:** OptionSet integer values and labels are read from dataset metadata at runtime. Labels are never hardcoded. Additional columns added to the subgrid view in the form designer will be auto-rendered in the expanded metadata footer — no code change required. The project structure in this spec represents the target implementation state.

## UX Design

### Visual Language

The control follows Dynamics 365 design conventions:
- **Font:** Segoe UI (inherited from D365 shell)
- **Border radius:** 2px (flat, not rounded)
- **Shadows:** D365 elevation — `0 1.6px 3.6px 0 rgba(0,0,0,.132), 0 0.3px 0.9px 0 rgba(0,0,0,.108)`
- **Color palette:** D365 semantic colors (see Color Mapping section)

### Header Bar

Above the cards:
- **Left:** Title "EDD Findings" + record count badge (e.g., "4")
- **Right:** "+ New Finding" button — opens a new `syg_eddfinding` form with the parent KYC Profile pre-populated via the parent record context (`context.navigation.openForm()`)

### Card Layout — Collapsed State

Each finding renders as a document-style card showing:
- **Top row:** Risk severity badge (left) + status badge and chevron (right)
- **Title:** Finding name (`syg_name`) as a clickable link — opens the full D365 record form
- **Description preview:** 2-3 lines of plain text (HTML tags stripped from rich text), truncated with CSS `-webkit-line-clamp: 3`
- **"Show more" link:** Below the preview text on a separate line, styled as D365 brand blue (`#0078D4`)

Category is **not shown** in the collapsed state — it's typically implied by the title and shown in the expanded footer.

Cards are displayed in the order provided by the dataset (respecting the subgrid view's configured sorting). The recommended default sort on the subgrid view is `createdon` descending (newest first), but the control does not override the dataset sort order.

### Card Layout — Expanded State

When a user clicks the card header area (severity row + title) or the "Show more" link:
- The card border changes to blue (`#0078D4`) to indicate active state
- The description preview is replaced with the **full rich HTML content**, sanitized via DOMPurify before rendering
- Rich text styling: images constrained to `max-width: 100%`, tables get D365-style borders and padding, paragraphs/lists get proper spacing
- A "Show less" link appears below the content
- **Dynamic metadata footer** appears below a separator line

**Security note:** All rich text HTML is sanitized through DOMPurify with an explicit allowlist of safe tags before rendering. This is critical because the description field stores user-authored HTML from the Dataverse rich text editor.

Only one card is expanded at a time (accordion behavior).

### Click Targets

- **Header area** (severity badge row + title row background): Clickable — toggles expand/collapse. The expand/collapse click region includes the severity badge row and the title row background, but excludes the title link text itself.
- **Title text:** Clickable link — opens the finding record in a D365 form. This is an `<a>` or `<button>` element nested within the header area; clicks on it do not bubble to the expand/collapse handler (`stopPropagation`).
- **Description area:** Not clickable for expand — allows text selection for copy-paste
- **"Show more" / "Show less" link:** Toggles expand/collapse
- **Linked condition link:** Opens the condition record in a D365 form

### Dynamic Metadata Footer (Expanded)

The expanded card's footer renders metadata in two tiers:

**Tier 1 — Curated fields** (always rendered in this order when present):
1. Category (OptionSet label)
2. Created By (user display name)
3. Linked Condition (clickable link that opens the record, or omitted if null)
4. Last Updated (`modifiedon` formatted date)

**Tier 2 — Auto-discovered fields:** Any additional columns present in the dataset that are not already rendered elsewhere in the card (not `syg_name`, `syg_description`, `syg_riskseverity`, `syg_status`, `createdon`, or any Tier 1 field) are rendered as "Label: Value" pairs. This allows new columns added to the subgrid view to appear without a code change.

**Security note:** Tier 2 auto-discovered fields rely on Dataverse field-level security to control visibility. The control renders whatever the dataset API returns — it does not implement additional field-level access control. Admins should be aware that adding columns to the subgrid view makes them visible to all users who can access the form.

Layout: Horizontal flex-wrap with 16px gaps. Each item is "**Label:** Value" in 12px text.

### Empty State

If the dataset returns zero records:
- Header bar still shows with count "0" and the "+ New Finding" button
- Centered message below: magnifying glass icon + "No EDD findings recorded." in muted text

### Pagination

If the dataset has more records than the page size, a "Load more" button appears below the last card. Calls `dataset.paging.loadNextPage()`. Unlikely with 3–8 typical records, but handled gracefully.

## Color Mapping

### Risk Severity

Keyed on OptionSet **integer values** (must be verified against Dataverse after deployment):

| Value | Label | Badge BG | Badge Text |
|---|---|---|---|
| 1 | Low | `#DFF6DD` | `#107C10` |
| 2 | Medium | `#FFF4CE` | `#835B00` |
| 3 | High | `#FED9CC` | `#C4441C` |
| 4 | Critical | `#FDE7E9` | `#A4262C` |

Fallback for unknown values: `#F3F2F1` background, `#605E5C` text.

### Status

| Value | Label | Badge BG | Badge Text |
|---|---|---|---|
| 1 | Open | `#DEECF9` | `#0078D4` |
| 2 | Mitigated | `#DFF6DD` | `#107C10` |
| 3 | Accepted | `#FFF4CE` | `#835B00` |
| 4 | Closed | `#F3F2F1` | `#605E5C` |

Fallback: same as unknown risk severity.

## Technical Requirements

### Rich Text Rendering

- **Collapsed state:** Strip all HTML tags from `syg_description` to produce plain text. **Must use DOM-based approach** — create a temporary element, set `innerHTML`, read `textContent`. Never use regex for HTML stripping (malformed tags can bypass naive regex patterns). Truncate visually with CSS line-clamp.
- **Expanded state:** Sanitize the raw HTML via **DOMPurify** with the following configuration. Render the sanitized output. No unsanitized HTML is ever rendered.
  ```ts
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
                   'table', 'thead', 'tbody', 'tr', 'th', 'td',
                   'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                   'span', 'div', 'blockquote', 'pre', 'code'],
    ALLOWED_ATTR: ['src', 'alt', 'title', 'class',
                   'colspan', 'rowspan', 'width', 'height'],
    ALLOWED_URI_REGEXP: /^(?:https?:|data:image\/)/i, // Only https and data:image/ URIs
    ALLOW_DATA_ATTR: false,
  });
  ```
  **Security decisions:**
  - **`style` attribute removed:** CSS `url()` references inside `style` attributes bypass DOMPurify's URI filtering and can be used for data exfiltration (`background-image: url('https://attacker.com/...')`). All styling is handled by the scoped CSS in `richText.ts` instead.
  - **`a` tag removed:** Compliance findings should not contain hyperlinks. If the raw HTML contains `<a>` tags, DOMPurify strips them and the text content is preserved. This eliminates tabnabbing risks (`target="_blank"` without `rel="noopener"`) and phishing links embedded in findings.
  - **`data:` URIs restricted to images only:** `data:image/` is allowed because Dataverse's rich text editor embeds images as base64. `data:text/html` and other MIME types are blocked to prevent XSS via data URI navigation.
  - **`ALLOW_DATA_ATTR: false`:** Blocks `data-*` attributes which are unnecessary.
- **Rich text base styles:** Apply scoped CSS within the expanded content area for:
  - `img`: `max-width: 100%; height: auto;`
  - `table`: `width: 100%; border-collapse: collapse; font-size: 12px;`
  - `th, td`: `padding: 6px 10px; border: 1px solid #edebe9;`
  - `th`: `background: #F3F2F1; font-weight: 600;`
  - `p`: `margin: 0 0 10px 0;`

### Dataset Binding

- Manifest declares a `data-set` element named `findings`.
- Read all column values from `dataset.records` and `dataset.columns`.
- Handle pagination via `dataset.paging.loadNextPage()`.
- Respect the dataset's sorting and filtering.

### OptionSet Labels

- Read display labels from `record.getFormattedValue(columnName)` at runtime.
- Color mapping uses integer values (from `record.getValue(columnName)`), not labels.
- Unknown values fall back to neutral gray styling.

### Lookup Display (`syg_linkedcondition`, `createdby`)

Two-tier resolution:
1. **Primary:** `record.getFormattedValue("syg_linkedcondition")` — often returns the display name if the column is in the subgrid view.
2. **Fallback:** `context.webAPI.retrieveRecord("syg_compliancecondition", guid, "?$select=syg_name")` — lightweight Web API call. Results cached in a local map to avoid duplicates.

`createdby` uses the same approach — `getFormattedValue("createdby")` typically returns the user's full name.

For clickable links: `context.navigation.openForm({ entityName, entityId })` with `Xrm.Navigation.openForm()` as fallback.

### Navigation

- **Open finding record:** `context.navigation.openForm({ entityName: "syg_eddfinding", entityId })` — triggered by clicking the finding title link.
- **Open linked condition:** `context.navigation.openForm({ entityName: "syg_compliancecondition", entityId })` — triggered by clicking the condition link in the metadata footer.
- **New finding:** Pre-populates the parent KYC Profile lookup. Use `formParameters` for reliability with custom entities:
  ```ts
  context.navigation.openForm(
    { entityName: "syg_eddfinding" },
    { syg_kycprofileid: parentRecordId, syg_kycprofileidname: parentRecordName }
  );
  ```
  Verify `syg_kycprofileid` matches the actual lookup field schema name on `syg_eddfinding`.

### Parent Record Context

The control needs the parent KYC Profile record ID to pre-populate the "+ New Finding" form. Resolution strategy:

1. **Primary:** `(context.mode as any).contextInfo.entityId` — available in model-driven app forms. This works in both standalone and embedded form contexts.
2. **Fallback:** Parse `context.page.entityId` if available.
3. **If neither is available:** The "+ New Finding" button opens a blank form without pre-population (graceful degradation).

The parent record name for display purposes can be obtained from `(context.mode as any).contextInfo.entityRecordName` or via a lightweight `retrieveRecord` call.

### Loading State

While the dataset is loading (`dataset.loading === true`), display a Fluent UI `Spinner` component centered in the control area with the label "Loading findings...". The header bar is not shown during loading.

### Error Handling

- **Navigation failures** (`openForm` calls): Caught silently with a generic `console.warn("Navigation failed")`. Do not log entity IDs, GUIDs, or error stack traces to the console in production — these could expose internal schema details to users with browser dev tools.
- **Lookup resolution failures** (Web API calls for condition names): The field displays "Open Record" as a clickable fallback instead of the display name.
- **DOMPurify failures** (malformed HTML): Falls back to plain text rendering (same as collapsed preview).
- **Pagination failures** (`loadNextPage`): The "Load more" button shows an inline error message "Failed to load — try again" and remains clickable for retry.

### Responsiveness

- Cards stack vertically and fill available width.
- Description text and tables wrap naturally.
- Images constrained to card width via `max-width: 100%`.
- Metadata footer uses `flex-wrap` so items wrap on narrow containers.
- Must handle varying widths: 1-column form sections, 2-column form sections, and embedded form scenarios.

### Accessibility

- **Keyboard:** Tab to focus card headers, Enter/Space to expand/collapse. Tab to "Show more" links and condition links.
- **ARIA:** `aria-expanded` on card header, `aria-controls` pointing to expanded content region, `role="region"` on expanded content with `aria-label`.
- **Color:** Risk severity and status badges always include text labels alongside color. Color is never the sole indicator.
- **Screen readers:** Expanded content is announced when card is toggled.

### Content Security Policy (CSP)

The control runs within the D365 model-driven app iframe. CSP requirements:
- `img-src data:` — required for base64-embedded images from the Dataverse rich text editor
- No `style-src 'unsafe-inline'` needed — the `style` attribute is stripped by DOMPurify; all styling uses Fluent UI `makeStyles` (CSS-in-JS via `<style>` tags, which D365 already permits for PCF controls)
- No external resource loading — all content is either from the dataset API or inline base64

Verify compatibility with the target D365 environment's CSP policy before deployment. If base64 images fail to render, the CSP may need `img-src data:` added.

## Project Structure

```
EddFindingsViewer/
├── ControlManifest.Input.xml
├── EddFindingsViewer.pcfproj
├── index.ts                          # PCF lifecycle (init, updateView, destroy) using React 18 createRoot
├── package.json
├── tsconfig.json
├── generated/
│   └── ManifestTypes.d.ts
├── components/
│   ├── EddFindingsContainer.tsx      # Top-level React component with FluentProvider
│   ├── FindingCard.tsx               # Card: collapsed preview + expanded rich content + metadata footer
│   ├── HeaderBar.tsx                 # Title + count + New button
│   └── EmptyState.tsx                # Zero-records view
├── utils/
│   ├── datasetHelpers.ts            # Extract typed records from PCF dataset
│   ├── optionSetColors.ts           # Risk severity + status color maps (D365 palette)
│   ├── htmlHelpers.ts               # stripHtml() for preview, sanitizeHtml() via DOMPurify
│   └── metadataHelpers.ts           # Auto-discover additional columns for dynamic footer
└── styles/
    ├── tokens.ts                    # Fluent UI makeStyles with D365 design tokens
    └── richText.ts                  # Scoped styles for rendered rich text content
```

## Dependencies

| Package | Purpose | Size |
|---|---|---|
| `react` / `react-dom` | ^18.2.0 | UI framework (PCF platform library) |
| `@fluentui/react-components` | ^9.46.0 | D365-consistent UI components |
| `@fluentui/react-icons` | ^2.0.200 | Chevron and add icons |
| `dompurify` | ^3.x | HTML sanitization (~7KB gzipped) |
| `@types/dompurify` | ^3.x | TypeScript types (dev) |

## Out of Scope (v1)

- Inline editing (records are opened in full D365 forms)
- Drag-and-drop reordering
- Bulk actions
- Filtering/search within the control (rely on subgrid view filters)
- Multiple cards expanded simultaneously

### Future Security Considerations

- **Audit trail:** EDD findings are regulated data. Consider emitting telemetry events when a user expands a finding (views full description), navigates to a linked condition, or creates a new finding. This could integrate with D365's built-in audit log or Application Insights for "who viewed what and when" compliance reporting.

## Acceptance Criteria

1. Control renders on the KYC Profile form replacing the standard EDD Findings subgrid.
2. Findings display as document-style cards with severity badge, title (clickable), status, and plain text description preview.
3. Expanding a card shows the full rich HTML description (with tables, images, formatted text) sanitized via DOMPurify.
4. Accordion behavior — only one card expanded at a time.
5. Expanded metadata footer shows category, created by, linked condition (clickable), last updated, plus any additional columns from the dataset.
6. "+ New Finding" opens a new finding form with the parent KYC Profile pre-populated.
7. Clicking a finding title opens the full record form.
8. Works identically when KYC Profile form is embedded via "Edit Form" control.
9. Empty state displays correctly when no findings exist.
10. OptionSet labels read from metadata, not hardcoded.
11. D365 visual language: Segoe UI, 2px radius, D365 shadows and color palette.
12. Keyboard accessible and screen-reader friendly.
13. Description text is selectable for copy-paste.
14. If the dataset page size is exceeded, a "Load more" button appears and loads additional records.
15. Loading spinner shown while dataset is loading.
