# RichTextMemo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF control that replaces D365's standard multiline text field with auto-linking of URLs and email addresses while storing only plain text.

**Architecture:** Single `contentEditable="plaintext-only"` div with a tokenizer pipeline that detects URLs and emails, renders them as `<a>` tags via sanitised innerHTML, and preserves the caret across re-renders. DOMPurify provides defence-in-depth XSS prevention. The PCF lifecycle uses the established pendingOutput pattern to prevent updateView echo loops.

**Tech Stack:** React 18, TypeScript 4.9, DOMPurify 3, pcf-scripts (production build)

---

### Task 1: Scaffold Project

**Files:**
- Create: `RichTextMemo/package.json`
- Create: `RichTextMemo/tsconfig.json`
- Create: `RichTextMemo/RichTextMemo.pcfproj`
- Create: `RichTextMemo/ControlManifest.Input.xml`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "rich-text-memo",
  "version": "1.0.0",
  "description": "Auto-linking multiline text field for D365",
  "scripts": {
    "build": "pcf-scripts build --buildMode production",
    "clean": "pcf-scripts clean",
    "rebuild": "pcf-scripts clean && pcf-scripts build --buildMode production",
    "start": "pcf-scripts start watch"
  },
  "dependencies": {
    "dompurify": "^3.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/dompurify": "^3.0.0",
    "@types/powerapps-component-framework": "^1.3.18",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "pcf-scripts": "^1",
    "pcf-start": "^1",
    "typescript": "^4.9.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "./node_modules/pcf-scripts/tsconfig_base.json",
  "compilerOptions": {
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 3: Create RichTextMemo.pcfproj**

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <PowerAppsTargetsPath>$(MSBuildExtensionsPath)\Microsoft\VisualStudio\v$(VisualStudioVersion)\PowerApps</PowerAppsTargetsPath>
  </PropertyGroup>

  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" />
  <Import Project="$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.props" Condition="Exists('$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.props')" />

  <PropertyGroup>
    <Name>RichTextMemo</Name>
    <ProjectGuid>a1b2c3d4-e5f6-7890-abcd-ef1234567890</ProjectGuid>
    <OutputPath>$(MSBuildThisFileDirectory)out\controls</OutputPath>
  </PropertyGroup>

  <PropertyGroup>
    <TargetFrameworkVersion>v4.6.2</TargetFrameworkVersion>
    <TargetFramework>net462</TargetFramework>
    <RestoreProjectStyle>PackageReference</RestoreProjectStyle>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.PowerApps.MSBuild.Pcf" Version="1.*" />
    <PackageReference Include="Microsoft.NETFramework.ReferenceAssemblies" Version="1.0.0" PrivateAssets="All" />
  </ItemGroup>

  <ItemGroup>
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\.gitignore" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\bin\**" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\obj\**" />
    <ExcludeDirectories Include="$(OutputPath)\**" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\*.pcfproj" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\*.pcfproj.user" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\*.sln" />
    <ExcludeDirectories Include="$(MSBuildThisFileDirectory)\node_modules\**" />
  </ItemGroup>

  <ItemGroup>
    <None Include="$(MSBuildThisFileDirectory)\**" Exclude="@(ExcludeDirectories)" />
  </ItemGroup>

  <Import Project="$(MSBuildToolsPath)\Microsoft.Common.targets" />
  <Import Project="$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.targets" Condition="Exists('$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.targets')" />

</Project>
```

- [ ] **Step 4: Create ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="RichTextMemo" version="1.0.0"
           display-name-key="RichTextMemo"
           description-key="Auto-linking multiline text field"
           control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <property name="value"
              display-name-key="Value"
              description-key="Bound multiline text field"
              of-type="Multiple" usage="bound" required="true" />
    <property name="placeholder"
              display-name-key="Placeholder"
              description-key="Placeholder text when field is empty"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="maxHeight"
              display-name-key="Max Height"
              description-key="Maximum height in pixels before scrolling"
              of-type="Whole.None" usage="input" required="false"
              default-value="400" />
    <property name="detectUrls"
              display-name-key="Detect URLs"
              description-key="Auto-detect and link HTTP/HTTPS URLs"
              of-type="TwoOptions" usage="input" required="false"
              default-value="true" />
    <property name="detectEmail"
              display-name-key="Detect Email"
              description-key="Auto-detect and link email addresses"
              of-type="TwoOptions" usage="input" required="false"
              default-value="true" />
    <property name="detectSharePoint"
              display-name-key="Detect SharePoint"
              description-key="Reserved for v1.1"
              of-type="TwoOptions" usage="input" required="false"
              default-value="false" />
    <property name="sharepointBaseUrl"
              display-name-key="SharePoint Base URL"
              description-key="Reserved for v1.1"
              of-type="SingleLine.Text" usage="input" required="false" />
    <property name="detectRecordRefs"
              display-name-key="Detect Record References"
              description-key="Reserved for v1.1"
              of-type="TwoOptions" usage="input" required="false"
              default-value="false" />
    <property name="recordReferencePatterns"
              display-name-key="Record Reference Patterns"
              description-key="Reserved for v1.1"
              of-type="Multiple" usage="input" required="false" />
    <resources>
      <code path="index.ts" order="1" />
    </resources>
  </control>
</manifest>
```

- [ ] **Step 5: Install dependencies and generate types**

```bash
cd RichTextMemo && npm install
```

Create a minimal index.ts stub so the build generates ManifestTypes:

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
export class RichTextMemo implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  public init(): void {}
  public updateView(): void {}
  public getOutputs(): IOutputs { return {}; }
  public destroy(): void {}
}
```

```bash
npm run build
```

Expected: succeeds, `generated/ManifestTypes.d.ts` exists.

- [ ] **Step 6: Commit**

```bash
git add RichTextMemo/
git commit -m "feat(rich-text-memo): scaffold project with manifest, deps, and type generation"
```

---

### Task 2: Types and escapeHtml utility

**Files:**
- Create: `RichTextMemo/types.ts`
- Create: `RichTextMemo/utils/escapeHtml.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export type LinkType = 'url' | 'email';

export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string; linkType: LinkType };

export interface DetectedMatch {
  start: number;
  end: number;
  text: string;
  href: string;
  linkType: LinkType;
  priority: number; // lower = higher priority
}
```

- [ ] **Step 2: Create utils/escapeHtml.ts**

```typescript
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_RE = /[&<>"']/g;

export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}
```

- [ ] **Step 3: Commit**

```bash
git add RichTextMemo/types.ts RichTextMemo/utils/escapeHtml.ts
git commit -m "feat(rich-text-memo): add Token types and escapeHtml utility"
```

---

### Task 3: URL validation utility

**Files:**
- Create: `RichTextMemo/utils/urlValidation.ts`

- [ ] **Step 1: Create utils/urlValidation.ts**

```typescript
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_MAILTO = 'mailto:';

export function isValidHttpUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return ALLOWED_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function isValidMailto(email: string): boolean {
  try {
    const url = new URL(ALLOWED_MAILTO + email);
    return url.protocol === ALLOWED_MAILTO;
  } catch {
    return false;
  }
}

export function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href);
    return ALLOWED_PROTOCOLS.has(url.protocol) || url.protocol === ALLOWED_MAILTO;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/utils/urlValidation.ts
git commit -m "feat(rich-text-memo): add URL validation with protocol allowlist"
```

---

### Task 4: Link detectors

**Files:**
- Create: `RichTextMemo/utils/linkDetectors.ts`

- [ ] **Step 1: Create utils/linkDetectors.ts**

```typescript
import { DetectedMatch } from '../types';
import { isValidHttpUrl, isValidMailto } from './urlValidation';

const URL_RE = /https?:\/\/[^\s<>"']+/g;
const EMAIL_RE = /\b[\w.+-]+@[\w.-]+\.\w{2,}\b/g;
const TRAILING_PUNCT = /[.,;:!?\)\]\}>]+$/;

function trimTrailingPunctuation(url: string): string {
  let result = url;
  while (TRAILING_PUNCT.test(result)) {
    result = result.replace(TRAILING_PUNCT, '');
  }
  return result;
}

function balanceParens(url: string): string {
  if (!url.endsWith(')')) return url;
  const opens = (url.match(/\(/g) || []).length;
  const closes = (url.match(/\)/g) || []).length;
  if (closes > opens) {
    return url.slice(0, -1);
  }
  return url;
}

export function detectUrls(text: string): DetectedMatch[] {
  const matches: DetectedMatch[] = [];
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    let candidate = m[0];
    candidate = trimTrailingPunctuation(candidate);
    candidate = balanceParens(candidate);
    if (!isValidHttpUrl(candidate)) continue;
    matches.push({
      start: m.index,
      end: m.index + candidate.length,
      text: candidate,
      href: candidate,
      linkType: 'url',
      priority: 1,
    });
  }
  return matches;
}

export function detectEmails(text: string): DetectedMatch[] {
  const matches: DetectedMatch[] = [];
  EMAIL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = EMAIL_RE.exec(text)) !== null) {
    const candidate = m[0];
    if (!isValidMailto(candidate)) continue;
    matches.push({
      start: m.index,
      end: m.index + candidate.length,
      text: candidate,
      href: `mailto:${candidate}`,
      linkType: 'email',
      priority: 0,
    });
  }
  return matches;
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/utils/linkDetectors.ts
git commit -m "feat(rich-text-memo): add URL and email link detectors"
```

---

### Task 5: Tokenizer

**Files:**
- Create: `RichTextMemo/utils/tokenizer.ts`

- [ ] **Step 1: Create utils/tokenizer.ts**

```typescript
import { Token, DetectedMatch } from '../types';
import { detectUrls, detectEmails } from './linkDetectors';

export interface TokenizerOptions {
  detectUrls: boolean;
  detectEmail: boolean;
}

export function tokenize(text: string, options: TokenizerOptions): Token[] {
  if (!text) return [];

  const allMatches: DetectedMatch[] = [];
  if (options.detectEmail) {
    allMatches.push(...detectEmails(text));
  }
  if (options.detectUrls) {
    allMatches.push(...detectUrls(text));
  }

  if (allMatches.length === 0) {
    return [{ kind: 'text', text }];
  }

  allMatches.sort((a, b) => a.start - b.start || a.priority - b.priority);

  const accepted: DetectedMatch[] = [];
  let lastEnd = 0;
  for (const match of allMatches) {
    if (match.start < lastEnd) continue;
    accepted.push(match);
    lastEnd = match.end;
  }

  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) {
      tokens.push({ kind: 'text', text: text.slice(cursor, match.start) });
    }
    tokens.push({
      kind: 'link',
      text: match.text,
      href: match.href,
      linkType: match.linkType,
    });
    cursor = match.end;
  }
  if (cursor < text.length) {
    tokens.push({ kind: 'text', text: text.slice(cursor) });
  }

  return tokens;
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/utils/tokenizer.ts
git commit -m "feat(rich-text-memo): add tokenizer — orchestrates detectors into token stream"
```

---

### Task 6: Render tokens to sanitised HTML

**Files:**
- Create: `RichTextMemo/utils/renderTokens.ts`

- [ ] **Step 1: Create utils/renderTokens.ts**

```typescript
import DOMPurify from 'dompurify';
import { Token } from '../types';
import { escapeHtml } from './escapeHtml';

const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['a'],
  ALLOWED_ATTR: ['href', 'data-link-type', 'tabindex', 'aria-label'],
};

export function renderTokensToHtml(tokens: Token[]): string {
  const parts: string[] = [];
  for (const token of tokens) {
    if (token.kind === 'text') {
      parts.push(escapeHtml(token.text));
    } else {
      const escapedText = escapeHtml(token.text);
      const escapedHref = escapeHtml(token.href);
      const ariaLabel = token.linkType === 'email'
        ? `Email: ${escapedText}. Hold Ctrl or Cmd and click, or press Alt+Enter, to open.`
        : `Link: ${escapedHref}. Hold Ctrl or Cmd and click, or press Alt+Enter, to open.`;
      parts.push(
        `<a href="${escapedHref}" data-link-type="${token.linkType}" tabindex="0" aria-label="${escapeHtml(ariaLabel)}">${escapedText}</a>`
      );
    }
  }
  const raw = parts.join('');
  return DOMPurify.sanitize(raw, PURIFY_CONFIG);
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/utils/renderTokens.ts
git commit -m "feat(rich-text-memo): add renderTokens with DOMPurify sanitisation"
```

---

### Task 7: Caret preservation utility

**Files:**
- Create: `RichTextMemo/utils/caretPreservation.ts`

- [ ] **Step 1: Create utils/caretPreservation.ts**

```typescript
export function getCaretOffset(element: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;

  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.startContainer, range.startOffset);

  return preRange.toString().length;
}

export function restoreCaretOffset(element: HTMLElement, offset: number): void {
  const sel = window.getSelection();
  if (!sel) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node: Node | null;

  while ((node = walker.nextNode()) !== null) {
    const textNode = node as Text;
    if (remaining <= textNode.length) {
      const range = document.createRange();
      range.setStart(textNode, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    remaining -= textNode.length;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/utils/caretPreservation.ts
git commit -m "feat(rich-text-memo): add caret preservation utility"
```

---

### Task 8: Styles

**Files:**
- Create: `RichTextMemo/styles/tokens.ts`

- [ ] **Step 1: Create styles/tokens.ts**

```typescript
import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const editorStyles: S = {
  container: {
    fontFamily: FONT,
    position: 'relative',
  },
  editor: {
    fontFamily: FONT,
    fontSize: 14,
    lineHeight: 1.4,
    color: '#323130',
    background: '#F3F2F1',
    border: 'none',
    borderBottom: '2px solid transparent',
    borderRadius: 4,
    padding: '8px 10px',
    minHeight: 80,
    overflowY: 'hidden',
    outline: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    cursor: 'text',
  } as React.CSSProperties,
  editorFocused: {
    borderBottom: '2px solid #0078D4',
  },
  editorDisabled: {
    cursor: 'default',
  },
};

export const INJECTED_CSS = `
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
.rtm-editor.rtm--disabled a[data-link-type] {
  cursor: pointer;
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
`;
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/styles/tokens.ts
git commit -m "feat(rich-text-memo): add editor styles and injected CSS"
```

---

### Task 9: RichTextMemo React component

**Files:**
- Create: `RichTextMemo/components/RichTextMemo.tsx`

- [ ] **Step 1: Create components/RichTextMemo.tsx**

```tsx
import * as React from 'react';
import { tokenize, TokenizerOptions } from '../utils/tokenizer';
import { renderTokensToHtml } from '../utils/renderTokens';
import { getCaretOffset, restoreCaretOffset } from '../utils/caretPreservation';
import { isSafeHref } from '../utils/urlValidation';
import { editorStyles, INJECTED_CSS } from '../styles/tokens';

interface RichTextMemoProps {
  value: string;
  disabled: boolean;
  placeholder: string;
  maxHeight: number;
  tokenizerOptions: TokenizerOptions;
  onValueChange: (value: string) => void;
}

let cssInjected = false;
function injectCss(): void {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = INJECTED_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const RETOKENIZE_KEYS = new Set([
  ' ', 'Enter', 'Tab', '.', ',', ';', ':', '!', '?', ')', ']', '}', '>',
]);

export const RichTextMemoEditor: React.FC<RichTextMemoProps> = ({
  value,
  disabled,
  placeholder,
  maxHeight,
  tokenizerOptions,
  onValueChange,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [modifierActive, setModifierActive] = React.useState(false);
  const composingRef = React.useRef(false);
  const internalValueRef = React.useRef(value);
  const isEmpty = !value;

  React.useEffect(() => { injectCss(); }, []);

  // Track modifier keys globally
  React.useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setModifierActive(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setModifierActive(false);
    };
    const onWinBlur = () => setModifierActive(false);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onWinBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onWinBlur);
    };
  }, []);

  // Tokenize and render HTML
  const renderedHtml = React.useMemo(
    () => renderTokensToHtml(tokenize(value, tokenizerOptions)),
    [value, tokenizerOptions]
  );

  // Sync innerHTML when value changes externally or after retokenise
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) {
      const offset = getCaretOffset(el);
      el.innerHTML = renderedHtml;
      restoreCaretOffset(el, offset);
    } else {
      el.innerHTML = renderedHtml;
    }
    internalValueRef.current = value;
  }, [renderedHtml]);

  // Auto-grow
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, maxHeight)}px`;
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }, [value, maxHeight]);

  const retokenize = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    if (text !== internalValueRef.current) {
      internalValueRef.current = text;
      onValueChange(text);
    }
  }, [onValueChange]);

  const handleInput = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    internalValueRef.current = text;
    onValueChange(text);
  }, [onValueChange]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (composingRef.current) return;

    // Alt+Enter: open link at caret
    if (e.altKey && e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'A' && el.dataset.linkType) {
              const href = el.getAttribute('href');
              if (href && isSafeHref(href)) {
                e.preventDefault();
                window.open(href, '_blank', 'noopener,noreferrer');
              }
              return;
            }
          }
          node = node.parentNode;
        }
      }
      return;
    }

    // Schedule retokenise on word-boundary keys
    if (RETOKENIZE_KEYS.has(e.key)) {
      requestAnimationFrame(() => retokenize());
    }
  }, [retokenize]);

  const handlePaste = React.useCallback(() => {
    requestAnimationFrame(() => retokenize());
  }, [retokenize]);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      'a[data-link-type]'
    ) as HTMLElement | null;
    if (!target) return;

    const shouldOpen = disabled || e.metaKey || e.ctrlKey;
    if (!shouldOpen) return;

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    e.preventDefault();
    const href = target.getAttribute('href');
    if (!href || !isSafeHref(href)) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [disabled]);

  const handleFocus = React.useCallback(() => setFocused(true), []);

  const handleBlur = React.useCallback(() => {
    setFocused(false);
    retokenize();
  }, [retokenize]);

  const handleCompositionStart = React.useCallback(() => {
    composingRef.current = true;
  }, []);
  const handleCompositionEnd = React.useCallback(() => {
    composingRef.current = false;
    requestAnimationFrame(() => retokenize());
  }, [retokenize]);

  const classNames = ['rtm-editor'];
  if (isEmpty) classNames.push('rtm--empty');
  if (modifierActive) classNames.push('rtm--modifier-active');
  if (disabled) classNames.push('rtm--disabled');

  const style: React.CSSProperties = {
    ...editorStyles.editor,
    ...(focused ? editorStyles.editorFocused : {}),
    ...(disabled ? editorStyles.editorDisabled : {}),
    maxHeight,
  };

  return (
    <div style={editorStyles.container}>
      <div
        ref={editorRef}
        className={classNames.join(' ')}
        contentEditable={
          disabled ? false : ('plaintext-only' as unknown as boolean)
        }
        spellCheck={true}
        role="textbox"
        aria-multiline={true}
        aria-label={placeholder || 'Text input'}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        style={style}
        suppressContentEditableWarning={true}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/components/RichTextMemo.tsx
git commit -m "feat(rich-text-memo): add editor component with all handlers"
```

---

### Task 10: PCF lifecycle (index.ts)

**Files:**
- Modify: `RichTextMemo/index.ts` (replace the stub from Task 1)

- [ ] **Step 1: Replace index.ts with full implementation**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { RichTextMemoEditor } from './components/RichTextMemo';
import { TokenizerOptions } from './utils/tokenizer';

export class RichTextMemo
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private currentValue = '';

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    if (this.pendingOutput) {
      this.pendingOutput = false;
      return;
    }

    const rawValue = context.parameters.value?.raw ?? '';
    if (rawValue !== this.currentValue) {
      this.currentValue = rawValue;
    }

    const disabled = context.mode.isControlDisabled;
    const placeholder = context.parameters.placeholder?.raw ?? '';
    const maxHeight = context.parameters.maxHeight?.raw ?? 400;

    const tokenizerOptions: TokenizerOptions = {
      detectUrls:
        (context.parameters.detectUrls as unknown as { raw?: string | boolean })
          ?.raw !== 'false' &&
        (context.parameters.detectUrls as unknown as { raw?: string | boolean })
          ?.raw !== false,
      detectEmail:
        (context.parameters.detectEmail as unknown as { raw?: string | boolean })
          ?.raw !== 'false' &&
        (context.parameters.detectEmail as unknown as { raw?: string | boolean })
          ?.raw !== false,
    };

    this.root.render(
      React.createElement(RichTextMemoEditor, {
        value: this.currentValue,
        disabled,
        placeholder,
        maxHeight,
        tokenizerOptions,
        onValueChange: (newValue: string) =>
          this.handleValueChange(newValue),
      })
    );
  }

  private handleValueChange(newValue: string): void {
    if (newValue === this.currentValue) return;
    this.currentValue = newValue;
    this.pendingOutput = true;
    this.notifyOutputChanged();
  }

  public getOutputs(): IOutputs {
    return { value: this.currentValue } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add RichTextMemo/index.ts
git commit -m "feat(rich-text-memo): add PCF lifecycle with pendingOutput pattern"
```

---

### Task 11: Build and verify

- [ ] **Step 1: Run production build**

```bash
cd RichTextMemo && npm run build
```

Expected: `webpack compiled successfully`. Output in `out/controls/bundle.js` and `out/controls/ControlManifest.xml`.

- [ ] **Step 2: Verify compiled manifest references bundle.js**

```bash
grep 'code path' out/controls/ControlManifest.xml
```

Expected: `<code path="bundle.js" order="1"/>`

- [ ] **Step 3: Verify no restricted patterns in bundle**

```bash
grep -c 'fluentui\|platform-library\|@fluentui' out/controls/bundle.js
```

Expected: `0`

- [ ] **Step 4: Verify DOMPurify is bundled**

```bash
grep -c 'DOMPurify' out/controls/bundle.js
```

Expected: greater than 0.

- [ ] **Step 5: Commit build output confirmation**

```bash
git add RichTextMemo/
git commit -m "build(rich-text-memo): production build verified"
```

---

### Task 12: Integrate into SygnumPCFComponents solution

**Files:**
- Create: `Solution/manual-pack/Controls/Syg.RichTextMemo/bundle.js` (copy)
- Create: `Solution/manual-pack/Controls/Syg.RichTextMemo/ControlManifest.xml` (copy)
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`
- Modify: `SOLUTION_PACKAGING.md`

- [ ] **Step 1: Copy build output to solution pack**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.RichTextMemo
cp RichTextMemo/out/controls/bundle.js Solution/manual-pack/Controls/Syg.RichTextMemo/bundle.js
cp RichTextMemo/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.RichTextMemo/ControlManifest.xml
```

- [ ] **Step 2: Add RootComponent to solution.xml**

Add inside `<RootComponents>`:
```xml
      <RootComponent type="66" schemaName="Syg.RichTextMemo" behavior="0" />
```

- [ ] **Step 3: Add CustomControl to customizations.xml**

Add inside `<CustomControls>`:
```xml
    <CustomControl>
      <Name>Syg.RichTextMemo</Name>
      <FileName>/Controls/Syg.RichTextMemo/ControlManifest.xml</FileName>
    </CustomControl>
```

- [ ] **Step 4: Bump solution version**

Increment `<Version>` in `solution.xml`.

- [ ] **Step 5: Verify all 9 controls registered**

```bash
grep -c "RootComponent type=" Solution/manual-pack/solution.xml
grep -c "<Name>" Solution/manual-pack/customizations.xml
ls Solution/manual-pack/Controls/ | wc -l
```

All three must return `9`.

- [ ] **Step 6: Build solution zip**

```bash
cd Solution/manual-pack
zip -r ../bin/Release/SygnumPCFComponents_<version>.zip . -x "*.DS_Store"
```

- [ ] **Step 7: Verify zip**

```bash
unzip -p ../bin/Release/SygnumPCFComponents_<version>.zip solution.xml | grep "<Version>"
unzip -p ../bin/Release/SygnumPCFComponents_<version>.zip solution.xml | grep -c "RootComponent type="
```

Expected: correct version, 9 RootComponents.

- [ ] **Step 8: Update SOLUTION_PACKAGING.md**

Change "8 total" to "9 total". Add RichTextMemo row to the controls table:

```
| 9 | Syg.RichTextMemo | Auto-linking multiline text field |
```

Update verification commands from "must be 8" to "must be 9".

- [ ] **Step 9: Commit**

```bash
git add Solution/manual-pack/ SOLUTION_PACKAGING.md RichTextMemo/
git commit -m "feat(solution): add RichTextMemo as 9th control, bump version"
```
