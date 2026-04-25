# RichTextMemo v1 — Design Spec

## Goal

Drop-in replacement for any D365 multiline text field that auto-renders URLs and email addresses as clickable links. Looks and behaves identically to the native Dynamics textarea. Stored value remains plain text — links are a display-layer concern only.

## Scope — v1

- Detect and render HTTP/HTTPS URLs as clickable links
- Detect and render email addresses as mailto links
- Cmd/Ctrl+click opens link in new tab (editing mode); plain click opens link (read-only mode)
- Alt+Enter keyboard shortcut opens the link the caret is inside
- Respects D365 form states: editable, disabled, read-only
- Auto-grows to content height up to configurable maxHeight, then scrolls
- Visual style matches native D365 multiline input

### Out of scope for v1

- SharePoint path detection (v1.1 — manifest properties reserved)
- D365 record reference detection (v1.1 — manifest properties reserved)
- Rich text formatting (bold, italic, lists)
- Inline images, @-mentions

## Architecture

### Editor surface

Single div with `contentEditable="plaintext-only"`. This gives us native caret behaviour, selection, IME support, spellcheck, and undo/redo without reimplementation. The `plaintext-only` mode (Chromium, which D365 runs on) strips formatting on paste and disables rich-text commands.

### Tokenizer

Takes a raw string, produces a flat array of tokens:

```typescript
type Token =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string; linkType: 'url' | 'email' };
```

Rendering maps tokens to HTML: text tokens are HTML-escaped, link tokens become `<a>` elements.

### Re-render triggers

Re-tokenisation runs only at natural word boundaries to avoid caret disruption:

- Space, Enter, Tab, or punctuation keypress (`.,;:!?)]}`)
- Paste event (after content is inserted)
- Blur
- Initial mount with non-empty value
- External value change via updateView

Between these events, the currently-being-typed word displays as plain text.

### Caret preservation

Before re-render: compute caret offset as character count from start of textContent via TreeWalker. After re-render: walk new text nodes, consume characters to saved offset, restore selection via Range API.

### IME composition

Listen for `compositionstart`/`compositionend`. Do not re-tokenise while composition is active. This prevents caret jumps for users with non-standard keyboard layouts (German umlauts, CJK input).

## Link Detection

### URL detector

**Regex:** `/https?:\/\/[^\s<>"']+/g`

Post-match processing per candidate:
1. Trim trailing punctuation iteratively: `.,;:!?)]}>`
2. Balance parentheses: if URL ends with `)` and has more `)` than `(`, strip one closing paren (Wikipedia URLs)
3. Validate via `new URL()` — reject if it throws
4. Check `.protocol` against allowlist `['http:', 'https:']` — reject anything else (`javascript:`, `data:`, `file:`, `vbscript:`, `about:`)
5. If accepted, produce link token with href = validated URL string (preserving original query/fragment)

### Email detector

**Regex:** `/\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g`

Post-match: validate via `new URL('mailto:' + match)`. If throws, reject. Produce link token with `href = 'mailto:' + match`.

Known limitation: not full RFC 5322. Matches common 99%. Ignores quoted local parts, IP domain literals, internationalised domains.

### Detector precedence

1. Email (checked first — prevents `user@https://...` edge cases)
2. HTTP URL

Later matches overlapping an earlier accepted match are discarded.

### Tokenizer orchestration

1. Collect all match ranges from enabled detectors
2. Sort by start index, then by detector precedence
3. Resolve overlaps (earlier wins)
4. Walk string: text tokens between accepted ranges, link tokens for accepted ranges
5. Rejected candidates become text tokens (merged with adjacent text)

## Editor Behaviour

### Click handling

```
if target is not a link → normal caret placement
if read-only mode → open link (plain click)
if editing mode and (metaKey or ctrlKey) → open link in new tab
otherwise → normal caret placement (no navigation)
```

All link opens use `window.open(href, '_blank', 'noopener,noreferrer')` with protocol re-validation at click time.

### Keyboard handling

- **Alt+Enter:** if caret is inside a link, open it. Otherwise no-op.
- **Space/Enter/punctuation:** schedule re-tokenisation via requestAnimationFrame.
- **Everything else:** native behaviour.

### Paste handling

`plaintext-only` strips formatting. Re-tokenise immediately after paste via requestAnimationFrame.

### Modifier-key visual affordance

Global keydown/keyup listeners track Meta/Control state. Boolean toggles `rtm--modifier-active` CSS class on the editor:

- Class absent: links show text cursor (look like links but don't indicate clickability)
- Class present: links show pointer cursor, slightly brighter colour (#106EBE)
- Window blur releases modifier (prevents stuck state on alt-tab)

### pendingOutput pattern

Same as ComplianceConditionScheduler:

1. `handleInput` → update local state → `pendingOutput = true` → `notifyOutputChanged()`
2. `updateView` → if `pendingOutput`, reset flag, skip external value sync
3. Only treat updateView as external change when `pendingOutput` is false AND incoming value differs

### getOutputs — plain text invariant

`getOutputs()` always returns `editorRef.current.textContent`. Never innerHTML. This is the single most important correctness property — the stored Dataverse value must remain plain text.

## Editor States

| State | Background | Border bottom | Links | Editable | Cursor |
|---|---|---|---|---|---|
| Empty (placeholder) | #F3F2F1 | transparent | n/a | yes | text |
| Editing (focused) | #F3F2F1 | #0078D4 (2px) | Cmd/Ctrl+click | yes | text |
| Editing (blurred) | #F3F2F1 | transparent | Cmd/Ctrl+click | yes | text |
| Read-only / disabled | #F3F2F1 | transparent | plain click | no | default |

### Auto-grow

Field height expands with content up to `maxHeight` (default 400px). Beyond that, internal scrollbar appears. Implemented via `scrollHeight` measurement after content changes.

### Placeholder

CSS pseudo-element on empty editor:
```css
.rtm-editor.rtm--empty::before {
  content: attr(data-placeholder);
  color: #A19F9D;
  pointer-events: none;
}
```

## Security

### HTML construction

All text tokens are HTML-escaped before innerHTML insertion — `& < > " '` mapped to entities. This is the primary XSS defence.

### DOMPurify

Defence in depth. Sanitize the final innerHTML string before assignment with a conservative allowlist:
- Allowed tags: `a`
- Allowed attributes: `href`, `data-link-type`, `tabindex`, `aria-label`

If someone later changes the tokenizer and introduces a gap, DOMPurify catches it.

### Protocol allowlist

Enforced twice:
1. At tokenisation time — only `http:`, `https:` produce link tokens; `mailto:` for emails only
2. At click time — re-validate before `window.open`

Rejected protocols: `javascript:`, `data:`, `file:`, `vbscript:`, `about:`

### Link opening

All external navigation via `window.open(href, '_blank', 'noopener,noreferrer')`.

## Styling

### Injected CSS

Injected once per page as a `<style>` element (needed for `:hover`, class-based modifier state, and placeholder pseudo-element — these cannot be inline):

```css
.rtm-editor a[data-link-type] {
  color: #0078D4;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: text;
}
.rtm-editor.rtm--modifier-active a[data-link-type] {
  cursor: pointer;
  color: #106EBE;
}
.rtm-editor a[data-link-type]:focus {
  outline: 2px solid #0078D4;
  outline-offset: 2px;
}
.rtm-editor.rtm--empty::before {
  content: attr(data-placeholder);
  color: #A19F9D;
  pointer-events: none;
  position: absolute;
}
```

### Inline styles

Editor surface styles defined in `styles/tokens.ts` as `React.CSSProperties`, matching the native D365 multiline input.

## Manifest

```xml
<control namespace="Syg" constructor="RichTextMemo" version="1.0.0"
         display-name-key="RichTextMemo_Display_Key"
         description-key="RichTextMemo_Description_Key"
         control-type="standard">

  <property name="value" of-type="Multiple" usage="bound" required="true" />
  <property name="placeholder" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="maxHeight" of-type="Whole.None" usage="input" required="false" default-value="400" />
  <property name="detectUrls" of-type="TwoOptions" usage="input" required="false" default-value="true" />
  <property name="detectEmail" of-type="TwoOptions" usage="input" required="false" default-value="true" />

  <!-- v1.1 placeholders (silently ignored in v1) -->
  <property name="detectSharePoint" of-type="TwoOptions" usage="input" required="false" default-value="false" />
  <property name="sharepointBaseUrl" of-type="SingleLine.Text" usage="input" required="false" />
  <property name="detectRecordRefs" of-type="TwoOptions" usage="input" required="false" default-value="false" />
  <property name="recordReferencePatterns" of-type="Multiple" usage="input" required="false" />

  <resources>
    <code path="index.ts" order="1" />
    <!-- No resx — display keys use inline defaults like other controls -->
  </resources>
</control>
```

## Module Structure

```
RichTextMemo/
  index.ts                          PCF lifecycle, pendingOutput pattern
  ControlManifest.Input.xml         bound Multiple + input properties
  RichTextMemo.pcfproj              project file
  package.json                      react 18, dompurify, pcf-scripts
  tsconfig.json                     extends pcf-scripts base
  types.ts                          Token type, LinkType enum
  components/
    RichTextMemo.tsx                contentEditable surface, handlers, modifier tracking
  utils/
    linkDetectors.ts                URL + email detectors
    tokenizer.ts                    orchestrates detectors, produces token stream
    caretPreservation.ts            save/restore selection offset across re-render
    urlValidation.ts                protocol allowlist + new URL() wrapper
    escapeHtml.ts                   HTML entity escape for text nodes
    renderTokens.ts                 tokens → sanitised HTML string
  styles/
    tokens.ts                       Segoe UI, D365 colours, spacing
```

## Dependencies

- `react` ^18.2.0
- `react-dom` ^18.2.0
- `dompurify` ^3.0.0
- `@types/dompurify` ^3.0.0 (dev)
- `@types/powerapps-component-framework` ^1.3.18 (dev)
- `pcf-scripts` ^1 (dev)
- `typescript` ^4.9.5 (dev)

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| plaintext-only misbehaves in D365 browser | Isolate editor in single component. Fallback to textarea+overlay documented but not built unless needed. |
| Caret jumps on re-render | Tokenise only on word boundaries. Robust caret preservation with character-offset approach. |
| Long memos (15k+ chars) slow to tokenise | Debounce. Measure on 20k-char fixture during dev. |
| innerHTML XSS | Single escape function + DOMPurify double-check. |
| getOutputs returns HTML | Always read textContent, never innerHTML. |
| IME breaks during tokenisation | compositionstart/end guards. |

## v1.1 Roadmap (reference only)

- SharePoint path detection via `detectSharePoint` + `sharepointBaseUrl`
- D365 record reference detection via `detectRecordRefs` + `recordReferencePatterns`
- Viewport-only tokenisation for very long memos if perf issues arise
