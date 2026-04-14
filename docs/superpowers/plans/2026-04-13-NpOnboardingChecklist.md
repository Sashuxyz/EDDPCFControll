# NpOnboardingChecklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-bound PCF control (`Syg.NpOnboardingChecklist`) that renders a 5-section 4-eyes verification checklist on a D365 Service Request form, writes all answers, mismatches, and a completion summary to a single JSON field (`checkResults`), and blocks submission until all items are answered, mismatches resolved, and manual blocks cleared.

**Architecture:** React 18 + `createRoot`, inline styles only (no Fluent UI). Single `useState` object in `ChecklistRoot.tsx` drives all rendering. Two WebAPI calls in `index.ts` `init()` load CRM values, ID documents, and tax records. The `pendingOutput` flag (same pattern as `KycDraftTakeover`) prevents the `updateView` loop. Output is serialized to JSON on every state change via `notifyOutputChanged()`.

**Tech Stack:** TypeScript 4.9, React 18.2, `pcf-scripts` (npm build), no external UI libraries, inline `React.CSSProperties` styles, D365 WebAPI OData v9.2.

---

## File Map

| File | Responsibility |
|---|---|
| `NpOnboardingChecklist/ControlManifest.Input.xml` | PCF manifest — 3 properties |
| `NpOnboardingChecklist/NpOnboardingChecklist.pcfproj` | MSBuild project file (copy of KycDraftTakeover template) |
| `NpOnboardingChecklist/package.json` | npm scripts and dependencies |
| `NpOnboardingChecklist/tsconfig.json` | TypeScript config |
| `NpOnboardingChecklist/types.ts` | All shared interfaces and static item config arrays |
| `NpOnboardingChecklist/utils.ts` | JSON parse/serialize, date format, SR ID resolution |
| `NpOnboardingChecklist/index.ts` | PCF class — init, WebAPI calls, updateView loop guard, getOutputs |
| `NpOnboardingChecklist/components/ChecklistRoot.tsx` | Top-level state, section rendering, output write |
| `NpOnboardingChecklist/components/StickyHeader.tsx` | Progress bar + mismatch/block alert bars |
| `NpOnboardingChecklist/components/SectionCard.tsx` | Collapsible section with status summary |
| `NpOnboardingChecklist/components/CheckItem.tsx` | CRM check item with mismatch form |
| `NpOnboardingChecklist/components/ManualCheckItem.tsx` | Manual check item with optional reason + block note |
| `NpOnboardingChecklist/components/DisplayItem.tsx` | Read-only display row |
| `NpOnboardingChecklist/components/IdDocumentSection.tsx` | Section 2 document cards (display only) |
| `NpOnboardingChecklist/components/TaxRecordSection.tsx` | Section 4 per-record cards with Yes/No check |
| `NpOnboardingChecklist/components/SubmitBar.tsx` | Sticky footer with complete button |
| `Solution/manual-pack/customizations.xml` | Add `Syg.NpOnboardingChecklist` entry |
| `Solution/manual-pack/solution.xml` | Bump version + add RootComponent |
| `Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/` | New bundle folder for packaging |

---

## Task 1: Scaffold — directory, manifest, package.json, tsconfig, pcfproj

**Files:**
- Create: `NpOnboardingChecklist/ControlManifest.Input.xml`
- Create: `NpOnboardingChecklist/NpOnboardingChecklist.pcfproj`
- Create: `NpOnboardingChecklist/package.json`
- Create: `NpOnboardingChecklist/tsconfig.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p NpOnboardingChecklist/components NpOnboardingChecklist/generated
```

- [ ] **Step 2: Write ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="NpOnboardingChecklist" version="1.0.0"
           display-name-key="NpOnboardingChecklist"
           description-key="4-eyes onboarding verification checklist"
           control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <property name="checkResults"
              display-name-key="Check Results"
              description-key="JSON blob storing all answers, mismatches, manual blocks and summary"
              of-type="Multiple" usage="bound" required="true" />
    <property name="checklistConfig"
              display-name-key="Checklist Config"
              description-key="Optional JSON to override labels or hide sections (future use)"
              of-type="Multiple" usage="input" required="false" />
    <property name="isReadOnly"
              display-name-key="Is Read Only"
              description-key="When true renders in read-only display mode"
              of-type="TwoOptions" usage="input" required="false" />
    <resources>
      <code path="index.ts" order="1" />
      <platform-library name="React" version="18.2.0" />
    </resources>
  </control>
</manifest>
```

- [ ] **Step 3: Write package.json**

```json
{
  "name": "np-onboarding-checklist",
  "version": "1.0.0",
  "description": "4-eyes onboarding verification checklist PCF control",
  "scripts": {
    "build": "pcf-scripts build --buildMode production",
    "clean": "pcf-scripts clean",
    "rebuild": "pcf-scripts clean && pcf-scripts build --buildMode production",
    "start": "pcf-scripts start watch"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/powerapps-component-framework": "^1.3.18",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "pcf-scripts": "^1",
    "pcf-start": "^1",
    "typescript": "^4.9.5"
  }
}
```

- [ ] **Step 4: Write tsconfig.json**

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

- [ ] **Step 5: Write NpOnboardingChecklist.pcfproj** — copy the KycDraftTakeover pcfproj with name and GUID replaced:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project ToolsVersion="15.0" DefaultTargets="Build" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <PowerAppsTargetsPath>$(MSBuildExtensionsPath)\Microsoft\VisualStudio\v$(VisualStudioVersion)\PowerApps</PowerAppsTargetsPath>
  </PropertyGroup>
  <Import Project="$(MSBuildExtensionsPath)\$(MSBuildToolsVersion)\Microsoft.Common.props" />
  <Import Project="$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.props" Condition="Exists('$(PowerAppsTargetsPath)\Microsoft.PowerApps.VisualStudio.Pcf.props')" />
  <PropertyGroup>
    <Name>NpOnboardingChecklist</Name>
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

- [ ] **Step 6: Install dependencies**

```bash
cd NpOnboardingChecklist && npm install
```

Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 7: Commit**

```bash
cd ..
git add NpOnboardingChecklist/
git commit -m "feat: scaffold NpOnboardingChecklist PCF control"
```

---

## Task 2: types.ts — shared interfaces and static config

**Files:**
- Create: `NpOnboardingChecklist/types.ts`

- [ ] **Step 1: Write types.ts**

```typescript
// NpOnboardingChecklist/types.ts

export type AnswerValue = 'yes' | 'no' | null;

export interface MismatchData {
  description: string;
  actionTaken: string;
  resolution: 'Finnova Corrected Manually' | 'Other';
  resolved: boolean;
}

export interface ManualNotDoneData {
  label: string;
  reason: string;
}

export interface CheckSummary {
  total: number;
  completed: number;
  mismatches: number;
  blocked: number;
  completedAt?: string;
  completedBy?: string;
}

export interface CheckResults {
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  manualNotDone: Record<string, ManualNotDoneData>;
  summary: CheckSummary;
}

export interface TaxRecord {
  id: string;
  taxDomicile: string;   // from syg_taxationdetails.syg_countryid (lookup formatted value)
  taxId: string;         // from syg_taxationdetails.syg_taxid
}

export interface IdDocument {
  id: string;
  documentType: string;    // syg_documenttype (option set formatted value)
  documentNumber: string;  // syg_documentnumber
  countryOfIssue: string;  // syg_countryofissueid (lookup formatted value)
  placeOfIssue: string;    // syg_placeofissue
  issueDate: string;       // syg_dateofissue, already formatted de-CH
  expirationDate: string;  // syg_expirationdate, already formatted de-CH
}

export interface CrmValues {
  // Section 1 — from syg_kycprofile (via syg_clientonboarding.syg_kycprofilefrontinputid)
  dateOfBirth: string;           // syg_dateofbirth
  nationalities: string;         // syg_nationalities
  // Section 1 — from syg_clientonboarding
  relationshipManager: string;   // syg_relationshipmanagerid (lookup formatted value)
  riskLevel: string;             // syg_risklevel (option set formatted value)
  pepStatus: string;             // syg_pepcheck (option set formatted value)
  // Section 2 — from syg_kycprofile
  clientSegment: string;         // syg_finsaclassification (option set formatted value)
  // Section 3 — from syg_clientonboarding
  referenceCurrency: string;     // syg_referencecurrencyid (lookup formatted value) — used for both Portfolio Default Currency and Digital Asset Vault Currency display
  specialConditions: string;     // syg_specialconditions
  // Section 4 — from syg_clientonboarding
  aiaReporting: string;          // syg_aiareporting (option set formatted value) — INDICIA check
}

export interface CheckState {
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  manualNotDone: Record<string, ManualNotDoneData>;
  crmValues: CrmValues;
  taxRecords: TaxRecord[];
  idDocument: IdDocument | null;   // single document via lookup on syg_clientonboarding
  loading: boolean;
  loadError: string | null;
}

/** Items whose "No" answer is a hard block (manual checks). */
export const MANUAL_KEYS = new Set<string>([
  'active', 'pms', 'payment', 'block', 'archive',
  'chtax', 'dispatch', 'oms',
  'omst', 'btct', 'btcv', 'cv4', 'cvw',
]);

/** Keys in each section (excludes dynamic tax keys computed at runtime). */
export const SEC1_KEYS = ['dob', 'rm', 'active', 'risk', 'pep'] as const;
export const SEC3_KEYS = ['currency', 'pms', 'payment', 'block', 'special', 'archive'] as const;
// Section 4: tax record keys (dynamic) + fixed items below
export const SEC4_FIXED_KEYS = ['chtax', 'dispatch', 'indicia', 'oms'] as const;
export const SEC5_KEYS = ['omst', 'cv4', 'cvw', 'btct', 'btcv'] as const;

/** Human-readable labels for alert bars. */
export const ITEM_LABELS: Record<string, string> = {
  dob: 'Date of Birth',
  rm: 'Relationship Manager',
  active: 'Set Client as Active',
  risk: 'Risk Level',
  pep: 'PEP Status',
  currency: 'Portfolio Default Currency',
  pms: 'PMS+',
  payment: 'Payment Rules Matching Main Account Currency',
  block: 'Remove General Block',
  special: 'Special Conditions',
  archive: 'Set Up a Web Archive',
  chtax: 'CH Tax Regulations',
  dispatch: 'Direct Dispatch (CH clients)',
  indicia: 'Run INDICIA Search',
  oms: 'Created Client in OMS and Added the Tier',
  omst: 'Has the Tier Been Updated on OMS Portal?',
  btct: 'Add BTC and ETH Trading',
  btcv: 'Add BTC and ETH Vault',
  cv4: 'C-Vault: Business Team Approved with 4-Eyes Check',
  cvw: 'C-Vault: Wallets',
};

export function taxKey(index: number): string {
  return `tx${index}`;
}

export function taxLabel(index: number): string {
  return `Tax ID (record ${index + 1})`;
}
```

- [ ] **Step 2: Verify TypeScript parses cleanly**

```bash
cd NpOnboardingChecklist && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors). If errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/types.ts
git commit -m "feat: add NpOnboardingChecklist types"
```

---

## Task 3: utils.ts — JSON parse/serialize, date formatting

**Files:**
- Create: `NpOnboardingChecklist/utils.ts`

- [ ] **Step 1: Write utils.ts**

```typescript
// NpOnboardingChecklist/utils.ts

import { CheckResults, CheckState, MismatchData, ManualNotDoneData, AnswerValue } from './types';

/** Parse the raw JSON string from the checkResults field. Returns null on empty or invalid. */
export function parseCheckResults(raw: string | null | undefined): Partial<CheckResults> | null {
  if (!raw || raw.trim() === '') return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<CheckResults>;
  } catch {
    return null;
  }
}

/** Serialize current state to the CheckResults JSON structure. */
export function serializeCheckResults(
  state: Pick<CheckState, 'answers' | 'mismatches' | 'manualNotDone' | 'taxRecords'>,
  summary: import('./types').CheckSummary
): string {
  const results: CheckResults = {
    answers: { ...state.answers } as Record<string, AnswerValue>,
    mismatches: { ...state.mismatches },
    manualNotDone: { ...state.manualNotDone },
    summary,
  };
  return JSON.stringify(results);
}

/** Format a D365 date string to DD.MM.YYYY (de-CH). Returns empty string on null/invalid. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-CH');
  } catch {
    return '';
  }
}

/** Resolve the Service Request record ID from PCF context with Xrm.Page fallback. */
export function resolveSrId(context: ComponentFramework.Context<any>): string | null {
  try {
    const info = (context.mode as any).contextInfo;
    if (info?.entityId && typeof info.entityId === 'string' && info.entityId.length > 10) {
      return info.entityId.replace(/[{}]/g, '');
    }
  } catch { /* ignore */ }
  try {
    const xrm = (window as any).Xrm;
    const id = xrm?.Page?.data?.entity?.getId?.();
    if (id && typeof id === 'string') return id.replace(/[{}]/g, '');
  } catch { /* ignore */ }
  return null;
}

/** Return the D365 WebAPI base URL. */
export function apiBase(): string {
  return `${window.location.origin}/api/data/v9.2`;
}

/** Build an empty default CrmValues object. */
export function emptyCrmValues(): import('./types').CrmValues {
  return {
    dateOfBirth: '',
    nationalities: '',
    relationshipManager: '',
    riskLevel: '',
    pepStatus: '',
    clientSegment: '',
    referenceCurrency: '',
    specialConditions: '',
    aiaReporting: '',
  };
}
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/utils.ts
git commit -m "feat: add NpOnboardingChecklist utils"
```

---

## Task 4: DisplayItem.tsx + SectionCard.tsx

**Files:**
- Create: `NpOnboardingChecklist/components/DisplayItem.tsx`
- Create: `NpOnboardingChecklist/components/SectionCard.tsx`

- [ ] **Step 1: Write DisplayItem.tsx**

```tsx
// NpOnboardingChecklist/components/DisplayItem.tsx
import * as React from 'react';

interface Props {
  label: string;
  value: string;
  showLock?: boolean;
}

const lockPath = 'M4 6V4a2 2 0 014 0v2';
const lockRect = 'M2 6h8v7a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 012 13V6z';

export function DisplayItem({ label, value, showLock = false }: Props): React.ReactElement {
  return (
    <div style={itemStyle}>
      <div style={statusRowStyle}>
        <div style={dotStyle} />
        <span style={statusTextStyle}>Display only</span>
      </div>
      <div style={titleStyle}>
        {label}
        {showLock && (
          <svg width={12} height={14} viewBox="0 0 12 14" fill="none" style={lockStyle}>
            <rect x={2} y={6} width={8} height={7} rx={1.5} stroke="#605e5c" strokeWidth={1.2} />
            <path d={lockPath} stroke="#605e5c" strokeWidth={1.2} />
          </svg>
        )}
      </div>
      <div style={valueStyle}>{value || '—'}</div>
    </div>
  );
}

const itemStyle: React.CSSProperties = {
  padding: '10px 14px 12px',
  borderBottom: '1px solid #edebe9',
  background: '#faf9f8',
};
const statusRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5,
};
const dotStyle: React.CSSProperties = {
  width: 8, height: 8, borderRadius: '50%', background: '#a19f9d', flexShrink: 0,
};
const statusTextStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: '#a19f9d',
};
const titleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2,
  display: 'flex', alignItems: 'center', gap: 5,
};
const lockStyle: React.CSSProperties = { opacity: 0.45, flexShrink: 0 };
const valueStyle: React.CSSProperties = { fontSize: 13, color: '#605e5c' };
```

- [ ] **Step 2: Write SectionCard.tsx**

```tsx
// NpOnboardingChecklist/components/SectionCard.tsx
import * as React from 'react';

export type SectionStatus = 'normal' | 'mismatch' | 'blocked' | 'done';

interface Props {
  title: string;
  status: SectionStatus;
  summaryText: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

const chevronPath = 'M2 4.5l4 4 4-4';

export function SectionCard({ title, status, summaryText, defaultCollapsed = true, children }: Props): React.ReactElement {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const borderLeft =
    status === 'mismatch' ? '3px solid #c8c6c4' :
    status === 'blocked'  ? '3px solid #8a8886'  :
    status === 'done'     ? '3px solid #0078d4'   : undefined;

  const sumColor =
    status === 'done'     ? '#0078d4' :
    status === 'blocked'  ? '#323130' :
    status === 'mismatch' ? '#605e5c' : '#605e5c';

  const sectionStyle: React.CSSProperties = {
    margin: '10px 12px',
    background: '#fff',
    border: '1px solid #edebe9',
    borderLeft: borderLeft || '1px solid #edebe9',
    borderRadius: 2,
  };

  const hdrStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 12px',
    background: '#f3f2f1',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: collapsed ? 'none' : '1px solid #edebe9',
    borderRadius: collapsed ? 2 : '2px 2px 0 0',
  };

  return (
    <div style={sectionStyle}>
      <div style={hdrStyle} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#201f1e' }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: sumColor, fontWeight: status !== 'normal' ? 600 : 400 }}>
            {summaryText}
          </span>
          <svg
            width={12} height={12} viewBox="0 0 12 12" fill="none"
            style={{ flexShrink: 0, transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.18s ease' }}
          >
            <path d={chevronPath} stroke="#605e5c" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add NpOnboardingChecklist/components/DisplayItem.tsx NpOnboardingChecklist/components/SectionCard.tsx
git commit -m "feat: add DisplayItem and SectionCard components"
```

---

## Task 5: CheckItem.tsx — CRM check with mismatch form

**Files:**
- Create: `NpOnboardingChecklist/components/CheckItem.tsx`

- [ ] **Step 1: Write CheckItem.tsx**

```tsx
// NpOnboardingChecklist/components/CheckItem.tsx
import * as React from 'react';
import { MismatchData, AnswerValue } from '../types';

interface Props {
  itemKey: string;
  label: string;
  crmValue: string;
  answer: AnswerValue;
  mismatch: MismatchData | undefined;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onMismatchChange: (key: string, data: MismatchData) => void;
}

const lockPath = 'M4 6V4a2 2 0 014 0v2';

export function CheckItem({
  itemKey, label, crmValue, answer, mismatch, isReadOnly,
  onAnswer, onMismatchChange,
}: Props): React.ReactElement {
  const [descInvalid, setDescInvalid] = React.useState(false);

  const status: 'pending' | 'confirmed' | 'mismatch' | 'resolved' =
    answer === 'yes' ? 'confirmed' :
    answer === 'no' && mismatch?.resolved ? 'resolved' :
    answer === 'no' ? 'mismatch' : 'pending';

  const dotColor =
    status === 'confirmed' || status === 'resolved' ? '#0078d4' :
    status === 'mismatch' ? '#c8c6c4' : '#c8c6c4';

  const statusLabel =
    status === 'confirmed' ? 'Confirmed' :
    status === 'resolved'  ? 'Resolved'  :
    status === 'mismatch'  ? 'Mismatch'  : '';

  const itemBg = answer === 'no' ? '#faf9f8' : '#fff';
  const borderLeft = answer === 'no' ? '3px solid #c8c6c4' : undefined;

  function handleResolve(checked: boolean): void {
    if (!mismatch) return;
    if (checked && !mismatch.description.trim()) {
      setDescInvalid(true);
      return;
    }
    setDescInvalid(false);
    onMismatchChange(itemKey, { ...mismatch, resolved: checked });
  }

  const md = mismatch ?? { description: '', actionTaken: '', resolution: 'Finnova Corrected Manually' as const, resolved: false };

  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid #edebe9', background: itemBg, borderLeft, paddingLeft: borderLeft ? 11 : 14 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {statusLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#605e5c' }}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Title + lock */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <svg width={12} height={14} viewBox="0 0 12 14" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
          <rect x={2} y={6} width={8} height={7} rx={1.5} stroke="#605e5c" strokeWidth={1.2} />
          <path d={lockPath} stroke="#605e5c" strokeWidth={1.2} />
        </svg>
      </div>

      {/* CRM value */}
      <div style={{ fontSize: 13, color: '#605e5c', marginBottom: 10 }}>{crmValue || '—'}</div>

      {/* Yes / No */}
      {!isReadOnly && (
        <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
          <button onClick={() => onAnswer(itemKey, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
          <button onClick={() => onAnswer(itemKey, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
        </div>
      )}
      {isReadOnly && (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {answer === 'yes' ? 'Confirmed' : answer === 'no' ? (mismatch?.resolved ? 'Resolved' : 'Mismatch') : 'Pending'}
        </span>
      )}

      {/* Mismatch form */}
      {answer === 'no' && (
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #c8c6c4', borderRadius: 2, padding: '10px 12px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Document discrepancy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={fLabelStyle}>What is incorrect in core banking?<span style={{ color: '#605e5c' }}>*</span></div>
              <textarea
                disabled={isReadOnly || mismatch?.resolved}
                value={md.description}
                onChange={e => { setDescInvalid(false); onMismatchChange(itemKey, { ...md, description: e.target.value }); }}
                placeholder="Required"
                style={{ ...taStyle, borderBottomColor: descInvalid ? '#605e5c' : '#c8c6c4' }}
              />
              {descInvalid && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 3 }}>Required before resolving.</div>}
            </div>
            <div>
              <div style={fLabelStyle}>Corrective action taken</div>
              <textarea
                disabled={isReadOnly || mismatch?.resolved}
                value={md.actionTaken}
                onChange={e => onMismatchChange(itemKey, { ...md, actionTaken: e.target.value })}
                style={taStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
            <div>
              <div style={fLabelStyle}>Resolution</div>
              <select
                disabled={isReadOnly || mismatch?.resolved}
                value={md.resolution}
                onChange={e => onMismatchChange(itemKey, { ...md, resolution: e.target.value as 'Finnova Corrected Manually' | 'Other' })}
                style={selStyle}
              >
                <option value="Finnova Corrected Manually">Finnova Corrected Manually</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {!isReadOnly && !mismatch?.resolved && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#323130', cursor: 'pointer', marginBottom: 2 }}>
                <input type="checkbox" checked={false} onChange={e => handleResolve(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#0078d4', cursor: 'pointer' }} />
                Mark as resolved
              </label>
            )}
            {mismatch?.resolved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0078d4', background: '#eff6fc', border: '1px solid #0078d4', borderRadius: 2, padding: '2px 8px' }}>
                <svg width={10} height={10} viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#0078d4" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>
                Resolved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ynStyle(isYes: boolean, isNo: boolean): React.CSSProperties {
  const active = isYes || isNo;
  return {
    width: 72, fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    background: isYes ? '#0078d4' : isNo ? '#605e5c' : '#fff',
    color: active ? '#fff' : '#323130',
    border: 'none', cursor: 'pointer', lineHeight: '28px',
    borderRight: isYes ? '1px solid #8a8886' : undefined,
  };
}

const fLabelStyle: React.CSSProperties = { fontSize: 11, color: '#605e5c', marginBottom: 3 };
const taStyle: React.CSSProperties = {
  width: '100%', background: '#f3f2f1', border: 'none',
  borderBottom: '2px solid #c8c6c4', borderRadius: '2px 2px 0 0',
  padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', color: '#201f1e',
  resize: 'vertical', minHeight: 48, outline: 'none',
};
const selStyle: React.CSSProperties = {
  background: '#f3f2f1', border: 'none', borderBottom: '1px solid #8a8886',
  borderRadius: '2px 2px 0 0', padding: '5px 7px', fontSize: 12,
  fontFamily: 'inherit', color: '#201f1e', outline: 'none', cursor: 'pointer',
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/CheckItem.tsx
git commit -m "feat: add CheckItem CRM check component"
```

---

## Task 6: ManualCheckItem.tsx — manual check with optional reason

**Files:**
- Create: `NpOnboardingChecklist/components/ManualCheckItem.tsx`

- [ ] **Step 1: Write ManualCheckItem.tsx**

```tsx
// NpOnboardingChecklist/components/ManualCheckItem.tsx
import * as React from 'react';
import { ManualNotDoneData, AnswerValue } from '../types';

interface Props {
  itemKey: string;
  label: string;
  answer: AnswerValue;
  notDone: ManualNotDoneData | undefined;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onNotDoneChange: (key: string, data: ManualNotDoneData) => void;
}

export function ManualCheckItem({
  itemKey, label, answer, notDone, isReadOnly,
  onAnswer, onNotDoneChange,
}: Props): React.ReactElement {
  const status =
    answer === 'yes' ? 'confirmed' :
    answer === 'no'  ? 'blocked'   : 'pending';

  const dotColor = status === 'confirmed' ? '#0078d4' : status === 'blocked' ? '#8a8886' : '#c8c6c4';
  const statusLabel = status === 'confirmed' ? 'Confirmed' : status === 'blocked' ? 'Not done' : '';

  const itemBg = answer === 'no' ? '#f3f2f1' : '#fff';
  const borderLeft = answer === 'no' ? '3px solid #8a8886' : undefined;

  const nd = notDone ?? { label, reason: '' };

  return (
    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid #edebe9', background: itemBg, borderLeft, paddingLeft: borderLeft ? 11 : 14 }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {statusLabel && (
          <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' ? '#0078d4' : '#605e5c' }}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#201f1e', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#a19f9d', fontStyle: 'italic', marginBottom: 10 }}>Manual check</div>

      {/* Yes / No */}
      {!isReadOnly && (
        <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
          <button onClick={() => onAnswer(itemKey, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
          <button onClick={() => onAnswer(itemKey, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
        </div>
      )}
      {isReadOnly && (
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {answer === 'yes' ? 'Confirmed' : answer === 'no' ? 'Not done' : 'Pending'}
        </span>
      )}

      {/* Blocked form */}
      {answer === 'no' && !isReadOnly && (
        <div style={{ marginTop: 10, background: '#fff', border: '1px solid #8a8886', borderRadius: 2, padding: '10px 12px 12px' }}>
          <div style={{ fontSize: 11, color: '#605e5c', marginBottom: 4 }}>
            Reason <span style={{ color: '#a19f9d', fontWeight: 400 }}>(optional)</span>
          </div>
          <textarea
            value={nd.reason}
            onChange={e => onNotDoneChange(itemKey, { ...nd, reason: e.target.value })}
            placeholder="Describe why this check could not be completed"
            style={taStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#605e5c', marginTop: 8 }}>
            <svg width={11} height={11} viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
              <circle cx={8} cy={8} r={6.5} stroke="#8a8886" strokeWidth={1.3} fill="none" />
              <line x1={8} y1={4.5} x2={8} y2={9} stroke="#8a8886" strokeWidth={1.3} strokeLinecap="round" />
              <circle cx={8} cy={11} r={0.7} fill="#8a8886" />
            </svg>
            This check blocks checklist completion
          </div>
        </div>
      )}
      {answer === 'no' && isReadOnly && notDone?.reason && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#605e5c' }}>Reason: {notDone.reason}</div>
      )}
    </div>
  );
}

function ynStyle(isYes: boolean, isNo: boolean): React.CSSProperties {
  const active = isYes || isNo;
  return {
    width: 72, fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    background: isYes ? '#0078d4' : isNo ? '#605e5c' : '#fff',
    color: active ? '#fff' : '#323130',
    border: 'none', cursor: 'pointer', lineHeight: '28px',
    borderRight: isYes ? '1px solid #8a8886' : undefined,
  };
}

const taStyle: React.CSSProperties = {
  width: '100%', background: '#f3f2f1', border: 'none',
  borderBottom: '2px solid #c8c6c4', borderRadius: '2px 2px 0 0',
  padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', color: '#201f1e',
  resize: 'vertical', minHeight: 48, outline: 'none',
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/ManualCheckItem.tsx
git commit -m "feat: add ManualCheckItem component"
```

---

## Task 7: IdDocumentSection.tsx — Section 2 display cards

**Files:**
- Create: `NpOnboardingChecklist/components/IdDocumentSection.tsx`

- [ ] **Step 1: Write IdDocumentSection.tsx**

```tsx
// NpOnboardingChecklist/components/IdDocumentSection.tsx
import * as React from 'react';
import { IdDocument } from '../types';
import { DisplayItem } from './DisplayItem';

interface Props {
  idDocument: IdDocument | null;   // single document via CO.syg_identificationdocumentid
  clientSegment: string;           // from syg_kycprofile.syg_finsaclassification
}

export function IdDocumentSection({ idDocument, clientSegment }: Props): React.ReactElement {
  return (
    <div>
      {/* Document card */}
      <div style={{ padding: '10px 12px 12px' }}>
        {!idDocument ? (
          <div style={{ fontSize: 13, color: '#a19f9d', padding: '4px 0' }}>No ID document linked to this onboarding.</div>
        ) : (
          <div style={cardStyle}>
            <div style={cardHdrStyle}>Identification Document</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '8px 12px', gap: '8px 16px' }}>
              {([
                ['Document type',   idDocument.documentType],
                ['Document number', idDocument.documentNumber],
                ['Country of issue', idDocument.countryOfIssue],
                ['Place of issue',  idDocument.placeOfIssue],
                ['Date of issue',   idDocument.issueDate],
                ['Expiration date', idDocument.expirationDate],
              ] as [string, string][]).map(([lbl, val]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 10, color: '#a19f9d', marginBottom: 1 }}>{lbl}</div>
                  <div style={{ fontSize: 12, color: '#201f1e', fontWeight: 500 }}>{val || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Client Segment display */}
      <div style={{ margin: '0 12px 12px', border: '1px solid #edebe9', borderRadius: 2 }}>
        <DisplayItem label="Client Segment" value={clientSegment} showLock />
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #edebe9', borderRadius: 2,
};
const cardHdrStyle: React.CSSProperties = {
  background: '#f3f2f1', padding: '6px 12px', fontSize: 12,
  fontWeight: 600, color: '#323130', borderBottom: '1px solid #edebe9',
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/IdDocumentSection.tsx
git commit -m "feat: add IdDocumentSection component"
```

---

## Task 8: TaxRecordSection.tsx — per-record tax check cards

**Files:**
- Create: `NpOnboardingChecklist/components/TaxRecordSection.tsx`

- [ ] **Step 1: Write TaxRecordSection.tsx**

```tsx
// NpOnboardingChecklist/components/TaxRecordSection.tsx
import * as React from 'react';
import { TaxRecord, AnswerValue, MismatchData } from '../types';
import { taxKey, taxLabel } from '../types';

interface Props {
  taxRecords: TaxRecord[];
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  isReadOnly: boolean;
  onAnswer: (key: string, value: 'yes' | 'no') => void;
  onMismatchChange: (key: string, data: MismatchData) => void;
}

export function TaxRecordSection({
  taxRecords, answers, mismatches, isReadOnly, onAnswer, onMismatchChange,
}: Props): React.ReactElement {
  return (
    <div>
      {/* Tax record count pill */}
      <div style={pillStyle}>
        <svg width={11} height={11} viewBox="0 0 12 12" fill="none">
          <rect x={1} y={2} width={10} height={8} rx={1} stroke="#0078d4" strokeWidth={1.1} />
          <line x1={3} y1={5} x2={9} y2={5} stroke="#0078d4" strokeWidth={1} />
          <line x1={3} y1={7.5} x2={7} y2={7.5} stroke="#0078d4" strokeWidth={1} />
        </svg>
        {taxRecords.length} tax record{taxRecords.length !== 1 ? 's' : ''}
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {taxRecords.length === 0 && (
          <div style={{ fontSize: 13, color: '#a19f9d', padding: '4px 0' }}>No tax records found.</div>
        )}
        {taxRecords.map((rec, i) => {
          const key = taxKey(i);
          const answer = answers[key] ?? null;
          const mismatch = mismatches[key];
          const status =
            answer === 'yes' ? 'confirmed' :
            answer === 'no' && mismatch?.resolved ? 'resolved' :
            answer === 'no' ? 'mismatch' : 'pending';
          const dotColor = status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#c8c6c4';
          const statusLabel = status === 'confirmed' ? 'Confirmed' : status === 'resolved' ? 'Resolved' : status === 'mismatch' ? 'Mismatch' : '';
          const [descInvalid, setDescInvalid] = React.useState(false);

          const md = mismatch ?? { description: '', actionTaken: '', resolution: 'Finnova Corrected Manually' as const, resolved: false };

          function handleResolve(checked: boolean): void {
            if (checked && !md.description.trim()) {
              setDescInvalid(true);
              return;
            }
            setDescInvalid(false);
            onMismatchChange(key, { ...md, resolved: checked });
          }

          return (
            <div key={rec.id} style={cardStyle}>
              <div style={cardHdrStyle}>Tax record {i + 1}</div>

              {/* Field data — always visible above the check */}
              <div style={{ display: 'flex', gap: 24, padding: '8px 12px 10px' }}>
                {[
                  ['Tax domicile', rec.taxDomicile],
                  ['Tax ID',       rec.taxId],
                ].map(([lbl, val]) => (
                  <div key={lbl}>
                    <div style={{ fontSize: 10, color: '#a19f9d', marginBottom: 2 }}>{lbl}</div>
                    <div style={{ fontSize: 13, color: '#201f1e', fontWeight: 500 }}>{val || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Check row — below field data */}
              <div style={{ borderTop: '1px solid #edebe9', padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  {statusLabel && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: status === 'confirmed' || status === 'resolved' ? '#0078d4' : '#605e5c' }}>
                      {statusLabel}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: '#201f1e', marginBottom: 10 }}>
                  {taxLabel(i)}
                </div>

                {!isReadOnly && (
                  <div style={{ display: 'inline-flex', border: '1px solid #8a8886', borderRadius: 2, overflow: 'hidden', height: 28 }}>
                    <button onClick={() => onAnswer(key, 'yes')} style={ynStyle(answer === 'yes', false)}>Yes</button>
                    <button onClick={() => onAnswer(key, 'no')}  style={ynStyle(false, answer === 'no')}>No</button>
                  </div>
                )}
                {isReadOnly && (
                  <span style={{ fontSize: 12, color: '#605e5c' }}>
                    {answer === 'yes' ? 'Confirmed' : answer === 'no' ? (mismatch?.resolved ? 'Resolved' : 'Mismatch') : 'Pending'}
                  </span>
                )}

                {/* Mismatch form */}
                {answer === 'no' && (
                  <div style={{ marginTop: 10, background: '#fff', border: '1px solid #c8c6c4', borderRadius: 2, padding: '10px 12px 12px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#605e5c', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.03em' }}>
                      Document discrepancy
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <div style={fLabelStyle}>What is incorrect in core banking?<span style={{ color: '#605e5c' }}>*</span></div>
                        <textarea
                          disabled={isReadOnly || md.resolved}
                          value={md.description}
                          onChange={e => { setDescInvalid(false); onMismatchChange(key, { ...md, description: e.target.value }); }}
                          placeholder="Required"
                          style={{ ...taStyle, borderBottomColor: descInvalid ? '#605e5c' : '#c8c6c4' }}
                        />
                        {descInvalid && <div style={{ fontSize: 11, color: '#605e5c', marginTop: 3 }}>Required before resolving.</div>}
                      </div>
                      <div>
                        <div style={fLabelStyle}>Corrective action taken</div>
                        <textarea disabled={isReadOnly || md.resolved} value={md.actionTaken}
                          onChange={e => onMismatchChange(key, { ...md, actionTaken: e.target.value })} style={taStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                      <div>
                        <div style={fLabelStyle}>Resolution</div>
                        <select disabled={isReadOnly || md.resolved} value={md.resolution}
                          onChange={e => onMismatchChange(key, { ...md, resolution: e.target.value as 'Finnova Corrected Manually' | 'Other' })}
                          style={selStyle}>
                          <option value="Finnova Corrected Manually">Finnova Corrected Manually</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {!isReadOnly && !md.resolved && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#323130', cursor: 'pointer', marginBottom: 2 }}>
                          <input type="checkbox" checked={false} onChange={e => handleResolve(e.target.checked)}
                            style={{ width: 14, height: 14, accentColor: '#0078d4', cursor: 'pointer' }} />
                          Mark as resolved
                        </label>
                      )}
                      {md.resolved && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0078d4', background: '#eff6fc', border: '1px solid #0078d4', borderRadius: 2, padding: '2px 8px' }}>
                          <svg width={10} height={10} viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#0078d4" strokeWidth={1.5} fill="none" strokeLinecap="round"/></svg>
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ynStyle(isYes: boolean, isNo: boolean): React.CSSProperties {
  const active = isYes || isNo;
  return {
    width: 72, fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 600 : 400,
    background: isYes ? '#0078d4' : isNo ? '#605e5c' : '#fff',
    color: active ? '#fff' : '#323130',
    border: 'none', cursor: 'pointer', lineHeight: '28px',
    borderRight: isYes ? '1px solid #8a8886' : undefined,
  };
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: '#eff6fc', border: '1px solid #c7e0f4', borderRadius: 2,
  padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#0078d4',
  margin: '10px 14px 8px',
};
const cardStyle: React.CSSProperties = { border: '1px solid #edebe9', borderRadius: 2 };
const cardHdrStyle: React.CSSProperties = {
  background: '#f3f2f1', padding: '6px 12px', fontSize: 12,
  fontWeight: 600, color: '#323130', borderBottom: '1px solid #edebe9',
};
const fLabelStyle: React.CSSProperties = { fontSize: 11, color: '#605e5c', marginBottom: 3 };
const taStyle: React.CSSProperties = {
  width: '100%', background: '#f3f2f1', border: 'none',
  borderBottom: '2px solid #c8c6c4', borderRadius: '2px 2px 0 0',
  padding: '5px 7px', fontSize: 12, fontFamily: 'inherit', color: '#201f1e',
  resize: 'vertical', minHeight: 48, outline: 'none',
};
const selStyle: React.CSSProperties = {
  background: '#f3f2f1', border: 'none', borderBottom: '1px solid #8a8886',
  borderRadius: '2px 2px 0 0', padding: '5px 7px', fontSize: 12,
  fontFamily: 'inherit', color: '#201f1e', outline: 'none', cursor: 'pointer',
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/TaxRecordSection.tsx
git commit -m "feat: add TaxRecordSection component"
```

---

## Task 9: StickyHeader.tsx — progress bar + alert bars

**Files:**
- Create: `NpOnboardingChecklist/components/StickyHeader.tsx`

- [ ] **Step 1: Write StickyHeader.tsx**

```tsx
// NpOnboardingChecklist/components/StickyHeader.tsx
import * as React from 'react';
import { ITEM_LABELS, taxLabel } from '../types';

interface Props {
  done: number;
  total: number;
  unresolvedKeys: string[];
  blockedKeys: string[];
  onScrollTo: (key: string) => void;
}

export function StickyHeader({ done, total, unresolvedKeys, blockedKeys, onScrollTo }: Props): React.ReactElement {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const label = (key: string): string =>
    ITEM_LABELS[key] ?? (key.startsWith('tx') ? taxLabel(parseInt(key.slice(2), 10)) : key);

  return (
    <div style={hdrStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#201f1e', letterSpacing: '-0.01em' }}>
          NP Onboarding Checklist
        </span>
        <span style={{ fontSize: 12, color: '#605e5c' }}>
          {done} of {total} items checked
        </span>
      </div>

      <div style={{ height: 4, background: '#edebe9', borderRadius: 2 }}>
        <div style={{ width: `${pct}%`, height: 4, background: '#0078d4', borderRadius: 2, transition: 'width 0.25s ease' }} />
      </div>

      {unresolvedKeys.length > 0 && (
        <div style={alertBarStyle}>
          <svg width={13} height={13} viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M8 1.5L1.5 13.5h13L8 1.5z" stroke="#605e5c" strokeWidth={1.3} fill="none" strokeLinejoin="round" />
            <line x1={8} y1={6} x2={8} y2={10} stroke="#605e5c" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={8} cy={12} r={0.7} fill="#605e5c" />
          </svg>
          <span>
            <strong>Unresolved mismatches — </strong>
            {unresolvedKeys.map((k, idx) => (
              <React.Fragment key={k}>
                {idx > 0 && ', '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onScrollTo(k)}>
                  {label(k)}
                </span>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}

      {blockedKeys.length > 0 && (
        <div style={blockBarStyle}>
          <svg width={13} height={13} viewBox="0 0 16 16" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx={8} cy={8} r={6.5} stroke="#8a8886" strokeWidth={1.3} fill="none" />
            <line x1={8} y1={4.5} x2={8} y2={9} stroke="#8a8886" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={8} cy={11} r={0.7} fill="#8a8886" />
          </svg>
          <span>
            <strong>Manual checks not completed — </strong>
            {blockedKeys.map((k, idx) => (
              <React.Fragment key={k}>
                {idx > 0 && ', '}
                <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onScrollTo(k)}>
                  {label(k)}
                </span>
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

const hdrStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 100,
  background: '#fff', borderBottom: '1px solid #edebe9',
  padding: '12px 16px 10px',
};
const alertBarStyle: React.CSSProperties = {
  marginTop: 6, padding: '7px 10px', borderRadius: 2,
  background: '#f3f2f1', border: '1px solid #c8c6c4', color: '#323130',
  fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4,
};
const blockBarStyle: React.CSSProperties = {
  marginTop: 6, padding: '7px 10px', borderRadius: 2,
  background: '#edebe9', border: '1px solid #8a8886', color: '#201f1e',
  fontSize: 12, display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4,
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/StickyHeader.tsx
git commit -m "feat: add StickyHeader component"
```

---

## Task 10: SubmitBar.tsx — sticky footer

**Files:**
- Create: `NpOnboardingChecklist/components/SubmitBar.tsx`

- [ ] **Step 1: Write SubmitBar.tsx**

```tsx
// NpOnboardingChecklist/components/SubmitBar.tsx
import * as React from 'react';

interface Props {
  pending: number;
  blocked: number;
  unresolved: number;
  onComplete: () => void;
}

export function SubmitBar({ pending, blocked, unresolved, onComplete }: Props): React.ReactElement {
  const canSubmit = pending === 0 && blocked === 0 && unresolved === 0;

  let infoText = '';
  if (!canSubmit) {
    const parts: string[] = [];
    if (pending > 0)    parts.push(`${pending} item${pending > 1 ? 's' : ''} not yet checked`);
    if (blocked > 0)    parts.push(`${blocked} manual check${blocked > 1 ? 's' : ''} not completed`);
    if (unresolved > 0) parts.push(`${unresolved} mismatch${unresolved > 1 ? 'es' : ''} unresolved`);
    infoText = parts.join(' · ');
  } else {
    infoText = 'All checks completed — ready to submit';
  }

  return (
    <div style={barStyle}>
      <div style={{ fontSize: 12, color: canSubmit ? '#0078d4' : '#605e5c', flex: 1 }}>
        {infoText}
      </div>
      <button
        disabled={!canSubmit}
        onClick={onComplete}
        style={{
          padding: '6px 20px', fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
          background: canSubmit ? '#0078d4' : '#edebe9',
          color: canSubmit ? '#fff' : '#a19f9d',
          border: 'none', borderRadius: 2, cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        Complete checklist
      </button>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  background: '#fff', borderTop: '1px solid #edebe9',
  padding: '10px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  zIndex: 200,
};
```

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add NpOnboardingChecklist/components/SubmitBar.tsx
git commit -m "feat: add SubmitBar component"
```

---

## Task 11: ChecklistRoot.tsx — state, sections, output serialization

**Files:**
- Create: `NpOnboardingChecklist/components/ChecklistRoot.tsx`

This is the largest component. It owns `useState`, computes progress stats, builds section summaries, and calls `notifyOutputChanged` on every state change.

- [ ] **Step 1: Write ChecklistRoot.tsx**

```tsx
// NpOnboardingChecklist/components/ChecklistRoot.tsx
import * as React from 'react';
import {
  CheckState, AnswerValue, MismatchData, ManualNotDoneData,
  MANUAL_KEYS, ITEM_LABELS, SEC1_KEYS, SEC3_KEYS, SEC4_FIXED_KEYS, SEC5_KEYS,
  taxKey, taxLabel, SectionStatus,
} from '../types';
import { serializeCheckResults } from '../utils';
import { StickyHeader } from './StickyHeader';
import { SectionCard } from './SectionCard';
import { CheckItem } from './CheckItem';
import { ManualCheckItem } from './ManualCheckItem';
import { DisplayItem } from './DisplayItem';
import { IdDocumentSection } from './IdDocumentSection';
import { TaxRecordSection } from './TaxRecordSection';
import { SubmitBar } from './SubmitBar';

// Re-export SectionStatus from types so SectionCard import works
// (SectionStatus is defined in types.ts)

interface Props {
  initialState: CheckState;
  isReadOnly: boolean;
  userName: string;
  onOutputChanged: (json: string) => void;
}

export function ChecklistRoot({ initialState, isReadOnly, userName, onOutputChanged }: Props): React.ReactElement {
  const [state, setState] = React.useState<CheckState>(initialState);

  // Ref map for scroll-to behaviour
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  function updateState(updater: (prev: CheckState) => CheckState): void {
    setState(prev => {
      const next = updater(prev);
      // Serialize and notify on next tick to avoid React render issues
      const stats = computeStats(next);
      const json = serializeCheckResults(next, {
        total: stats.total,
        completed: stats.done,
        mismatches: stats.unresolvedKeys.length,
        blocked: stats.blockedKeys.length,
      });
      onOutputChanged(json);
      return next;
    });
  }

  function handleAnswer(key: string, value: 'yes' | 'no'): void {
    updateState(prev => {
      const answers = { ...prev.answers, [key]: value as AnswerValue };
      // Clear mismatch/manualNotDone when switching back to yes
      const mismatches = { ...prev.mismatches };
      const manualNotDone = { ...prev.manualNotDone };
      if (value === 'yes') {
        delete mismatches[key];
        delete manualNotDone[key];
      }
      return { ...prev, answers, mismatches, manualNotDone };
    });
  }

  function handleMismatchChange(key: string, data: MismatchData): void {
    updateState(prev => ({
      ...prev,
      mismatches: { ...prev.mismatches, [key]: data },
    }));
  }

  function handleNotDoneChange(key: string, data: ManualNotDoneData): void {
    updateState(prev => ({
      ...prev,
      manualNotDone: { ...prev.manualNotDone, [key]: data },
    }));
  }

  function handleComplete(): void {
    const stats = computeStats(state);
    if (!stats.canSubmit) return;
    const json = serializeCheckResults(state, {
      total: stats.total,
      completed: stats.done,
      mismatches: stats.unresolvedKeys.length,
      blocked: stats.blockedKeys.length,
      completedAt: new Date().toISOString(),
      completedBy: userName,
    });
    onOutputChanged(json);
    // Force re-render to show completed state
    setState(s => ({ ...s }));
  }

  function scrollToItem(key: string): void {
    const el = itemRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function computeStats(s: CheckState): {
    total: number; done: number; pending: number;
    unresolvedKeys: string[]; blockedKeys: string[]; canSubmit: boolean;
  } {
    let total = 0, done = 0, pending = 0;
    const unresolvedKeys: string[] = [];
    const blockedKeys: string[] = [];

    const allCheckKeys: string[] = [
      ...SEC1_KEYS,
      ...SEC3_KEYS,
      ...s.taxRecords.map((_, i) => taxKey(i)),
      ...SEC4_FIXED_KEYS,
      ...SEC5_KEYS,
    ];

    for (const key of allCheckKeys) {
      total++;
      const ans = s.answers[key] ?? null;
      const mis = s.mismatches[key];
      if (ans === 'yes') {
        done++;
      } else if (ans === 'no' && !MANUAL_KEYS.has(key) && mis?.resolved) {
        done++;
      } else if (ans === 'no' && !MANUAL_KEYS.has(key)) {
        unresolvedKeys.push(key);
      } else if (ans === 'no' && MANUAL_KEYS.has(key)) {
        blockedKeys.push(key);
      } else {
        pending++;
      }
    }

    return { total, done, pending, unresolvedKeys, blockedKeys, canSubmit: pending === 0 && unresolvedKeys.length === 0 && blockedKeys.length === 0 };
  }

  function sectionSummary(keys: readonly string[], taxCount: number = 0): { status: SectionStatus; text: string } {
    let conf = 0, mis = 0, blk = 0, total = 0;
    const effectiveKeys = [...keys, ...(taxCount > 0 ? Array.from({ length: taxCount }, (_, i) => taxKey(i)) : [])];
    for (const key of effectiveKeys) {
      total++;
      const ans = state.answers[key] ?? null;
      const mismatch = state.mismatches[key];
      if (ans === 'yes') conf++;
      else if (ans === 'no' && !MANUAL_KEYS.has(key) && mismatch?.resolved) conf++;
      else if (ans === 'no' && !MANUAL_KEYS.has(key)) mis++;
      else if (ans === 'no' && MANUAL_KEYS.has(key)) blk++;
    }
    if (conf === total && blk === 0 && total > 0) return { status: 'done', text: 'All confirmed' };
    if (blk > 0 && mis === 0) return { status: 'blocked', text: `${blk} blocked · ${conf}/${total}` };
    if (mis > 0) return { status: 'mismatch', text: `${blk > 0 ? blk + ' blocked, ' : ''}${mis} mismatch · ${conf}/${total}` };
    return { status: 'normal', text: `${conf} / ${total} checked` };
  }

  if (state.loading) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#605e5c' }}>Loading checklist data…</div>
    );
  }
  if (state.loadError) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: '#605e5c' }}>
        Failed to load data: {state.loadError}
      </div>
    );
  }

  const stats = computeStats(state);
  const s1 = sectionSummary(SEC1_KEYS);
  const s3 = sectionSummary(SEC3_KEYS);
  const s4 = sectionSummary(SEC4_FIXED_KEYS, state.taxRecords.length);
  const s5 = sectionSummary(SEC5_KEYS);

  const { crmValues } = state;

  function itemRef(key: string): (el: HTMLDivElement | null) => void {
    return el => { itemRefs.current[key] = el; };
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: '#faf9f8', color: '#201f1e', fontSize: 14, lineHeight: 1.4, paddingBottom: 72 }}>

      <StickyHeader
        done={stats.done} total={stats.total}
        unresolvedKeys={stats.unresolvedKeys}
        blockedKeys={stats.blockedKeys}
        onScrollTo={scrollToItem}
      />

      {/* Guidance bar */}
      <div style={{ background: '#f3f2f1', borderBottom: '1px solid #edebe9', padding: '8px 16px', fontSize: 12, color: '#605e5c', lineHeight: 1.5 }}>
        <strong style={{ color: '#201f1e' }}>Yes</strong> — data matches &nbsp;|&nbsp;
        <strong style={{ color: '#201f1e' }}>No</strong> — data does not match — document and resolve before completing
      </div>

      {/* ── Section 1: Client properties ── */}
      <SectionCard title="Client properties check" status={s1.status} summaryText={s1.text} defaultCollapsed={false}>
        <DisplayItem label="Nationalities" value={crmValues.nationalities} showLock />
        {(['dob', 'rm', 'risk', 'pep'] as const).map(key => (
          <div key={key} ref={itemRef(key)}>
            <CheckItem
              itemKey={key}
              label={ITEM_LABELS[key]}
              crmValue={
                key === 'dob'  ? crmValues.dateOfBirth :
                key === 'rm'   ? crmValues.relationshipManager :
                key === 'risk' ? crmValues.riskLevel :
                                 crmValues.pepStatus
              }
              answer={state.answers[key] ?? null}
              mismatch={state.mismatches[key]}
              isReadOnly={isReadOnly}
              onAnswer={handleAnswer}
              onMismatchChange={handleMismatchChange}
            />
          </div>
        ))}
        <div ref={itemRef('active')}>
          <ManualCheckItem
            itemKey="active" label="Set Client as Active"
            answer={state.answers['active'] ?? null}
            notDone={state.manualNotDone['active']}
            isReadOnly={isReadOnly}
            onAnswer={handleAnswer}
            onNotDoneChange={handleNotDoneChange}
          />
        </div>
      </SectionCard>

      {/* ── Section 2: ID data ── */}
      <SectionCard title="ID data" status="normal" summaryText="Display only" defaultCollapsed>
        <IdDocumentSection idDocument={state.idDocument} clientSegment={crmValues.clientSegment} />
      </SectionCard>

      {/* ── Section 3: Finnova accounts ── */}
      <SectionCard title="Finnova accounts" status={s3.status} summaryText={s3.text}>
        {/* Digital Asset Vault Currency — display only, same value as Portfolio Default Currency */}
        <DisplayItem label="Digital Asset Vault Currency" value={crmValues.referenceCurrency} />
        <div ref={itemRef('currency')}>
          <CheckItem itemKey="currency" label="Portfolio Default Currency" crmValue={crmValues.referenceCurrency}
            answer={state.answers['currency'] ?? null} mismatch={state.mismatches['currency']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onMismatchChange={handleMismatchChange} />
        </div>
        {(['pms', 'payment', 'block', 'archive'] as const).map(key => (
          <div key={key} ref={itemRef(key)}>
            <ManualCheckItem
              itemKey={key} label={ITEM_LABELS[key]}
              answer={state.answers[key] ?? null}
              notDone={state.manualNotDone[key]}
              isReadOnly={isReadOnly}
              onAnswer={handleAnswer}
              onNotDoneChange={handleNotDoneChange}
            />
          </div>
        ))}
        <div ref={itemRef('special')}>
          <CheckItem itemKey="special" label="Special Conditions" crmValue={crmValues.specialConditions}
            answer={state.answers['special'] ?? null} mismatch={state.mismatches['special']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onMismatchChange={handleMismatchChange} />
        </div>
      </SectionCard>

      {/* ── Section 4: Tax information ── */}
      <SectionCard title="Finnova: Tax information" status={s4.status} summaryText={s4.text}>
        <TaxRecordSection
          taxRecords={state.taxRecords}
          answers={state.answers}
          mismatches={state.mismatches}
          isReadOnly={isReadOnly}
          onAnswer={handleAnswer}
          onMismatchChange={handleMismatchChange}
        />
        {/* Additional fixed items below the per-record tax cards */}
        <div style={grpHdrStyle}>Additional tax checks</div>
        <div ref={itemRef('chtax')}>
          <ManualCheckItem itemKey="chtax" label="CH Tax Regulations"
            answer={state.answers['chtax'] ?? null} notDone={state.manualNotDone['chtax']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('dispatch')}>
          <ManualCheckItem itemKey="dispatch" label="Direct Dispatch (CH clients)"
            answer={state.answers['dispatch'] ?? null} notDone={state.manualNotDone['dispatch']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('indicia')}>
          {/* INDICIA: CRM check — value from syg_clientonboarding.syg_aiareporting */}
          <CheckItem itemKey="indicia" label="Run INDICIA Search" crmValue={crmValues.aiaReporting}
            answer={state.answers['indicia'] ?? null} mismatch={state.mismatches['indicia']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onMismatchChange={handleMismatchChange} />
        </div>
        <div ref={itemRef('oms')}>
          <ManualCheckItem itemKey="oms" label="Created Client in OMS and Added the Tier"
            answer={state.answers['oms'] ?? null} notDone={state.manualNotDone['oms']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
      </SectionCard>

      {/* ── Section 5: Additional actions ── */}
      <SectionCard title="Additional actions" status={s5.status} summaryText={s5.text}>
        <div ref={itemRef('omst')}>
          <ManualCheckItem itemKey="omst" label="Has the Tier Been Updated on OMS Portal?"
            answer={state.answers['omst'] ?? null} notDone={state.manualNotDone['omst']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('cv4')}>
          <ManualCheckItem itemKey="cv4" label="C-Vault: Business Team Approved with 4-Eyes Check"
            answer={state.answers['cv4'] ?? null} notDone={state.manualNotDone['cv4']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('cvw')}>
          <ManualCheckItem itemKey="cvw" label="C-Vault: Wallets"
            answer={state.answers['cvw'] ?? null} notDone={state.manualNotDone['cvw']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('btct')}>
          <ManualCheckItem itemKey="btct" label="Add BTC and ETH Trading"
            answer={state.answers['btct'] ?? null} notDone={state.manualNotDone['btct']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
        <div ref={itemRef('btcv')}>
          <ManualCheckItem itemKey="btcv" label="Add BTC and ETH Vault"
            answer={state.answers['btcv'] ?? null} notDone={state.manualNotDone['btcv']}
            isReadOnly={isReadOnly} onAnswer={handleAnswer} onNotDoneChange={handleNotDoneChange} />
        </div>
      </SectionCard>

      <div style={{ height: 20 }} />

      {!isReadOnly && (
        <SubmitBar
          pending={stats.pending}
          blocked={stats.blockedKeys.length}
          unresolved={stats.unresolvedKeys.length}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

const grpHdrStyle: React.CSSProperties = {
  padding: '7px 14px 5px',
  fontSize: 11, fontWeight: 600, color: '#605e5c',
  textTransform: 'uppercase', letterSpacing: '0.04em',
  background: '#faf9f8',
  borderTop: '1px solid #edebe9',
  borderBottom: '1px solid #edebe9',
};
```

> **Note on SectionStatus import:** `SectionCard.tsx` exports `SectionStatus` type. Add `export type { SectionStatus }` to `SectionCard.tsx` so `ChecklistRoot.tsx` can import it. Alternatively, move `SectionStatus` to `types.ts` (cleaner — do this instead):

In `types.ts`, add at the bottom:
```typescript
export type SectionStatus = 'normal' | 'mismatch' | 'blocked' | 'done';
```

Then in `SectionCard.tsx`, change the local definition to:
```typescript
import { SectionStatus } from '../types';
// remove the local: export type SectionStatus = ...
```

- [ ] **Step 2: Add SectionStatus to types.ts**

Open `NpOnboardingChecklist/types.ts` and add before the closing export:
```typescript
export type SectionStatus = 'normal' | 'mismatch' | 'blocked' | 'done';
```

Then update `SectionCard.tsx` to import `SectionStatus` from `'../types'` rather than defining it locally.

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors. Fix any import path or type mismatch before proceeding.

- [ ] **Step 4: Commit**

```bash
git add NpOnboardingChecklist/components/ChecklistRoot.tsx NpOnboardingChecklist/types.ts NpOnboardingChecklist/components/SectionCard.tsx
git commit -m "feat: add ChecklistRoot with full state management"
```

---

## Task 12: index.ts — PCF class with WebAPI data loading

**Files:**
- Create: `NpOnboardingChecklist/index.ts`

This is the PCF entry point. `init()` fires two WebAPI calls sequentially:
1. Fetch the Service Request with nested `$expand=syg_linkedonboardingid` → expands `syg_kycprofilefrontinputid` (KYC fields) and `syg_identificationdocumentid` (single ID document) within the onboarding record.
2. Using the onboarding ID from step 1, fetch `syg_taxationdetails` records filtered by `_syg_clientonboardingid_value`.

- [ ] **Step 1: Write index.ts**

```typescript
// NpOnboardingChecklist/index.ts
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChecklistRoot } from './components/ChecklistRoot';
import {
  CheckState, CrmValues, TaxRecord, IdDocument, emptyCrmValues,
} from './types';
import { parseCheckResults, resolveSrId, apiBase, formatDate, emptyCrmValues as emptyCrm } from './utils';

export class NpOnboardingChecklist implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private outputJson = '';

  private state: CheckState = {
    answers: {},
    mismatches: {},
    manualNotDone: {},
    crmValues: emptyCrmValues(),
    taxRecords: [],
    idDocument: null,
    loading: true,
    loadError: null,
  };
  private isReadOnly = false;
  private userName = '';
  private context!: ComponentFramework.Context<IInputs>;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    this.context = context;
    context.mode.trackContainerResize(true);

    this.userName = (context.userSettings as any).userName ?? context.userSettings.userId ?? 'Unknown';

    // Restore saved answers before loading (so UI is not blank while API calls run)
    const savedJson = (context.parameters.checkResults as any)?.raw ?? null;
    const saved = parseCheckResults(savedJson);
    if (saved) {
      this.state = {
        ...this.state,
        answers: (saved.answers as Record<string, import('./types').AnswerValue>) ?? {},
        mismatches: (saved.mismatches as Record<string, import('./types').MismatchData>) ?? {},
        manualNotDone: (saved.manualNotDone as Record<string, import('./types').ManualNotDoneData>) ?? {},
      };
    }

    // Render loading state immediately
    this.renderReact();

    // Fire data loading
    this.loadData(context).then(() => {
      this.state = { ...this.state, loading: false, loadError: null };
      this.renderReact();
    }).catch(err => {
      this.state = { ...this.state, loading: false, loadError: String(err) };
      this.renderReact();
    });
  }

  private async loadData(context: ComponentFramework.Context<IInputs>): Promise<void> {
    const srId = resolveSrId(context);
    if (!srId) throw new Error('Cannot resolve Service Request ID');

    const base = apiBase();
    const creds: RequestInit = { credentials: 'include' };

    // ── Step 1: Fetch SR → expand onboarding → expand KYC + ID document ──
    // Nested $expand: syg_linkedonboardingid expands two more navigation properties.
    // NOTE: verify entity set name for syg_identificationdocuments if expand fails.
    const kycFields = 'syg_dateofbirth,syg_nationalities,syg_finsaclassification';
    const idFields = [
      'syg_identificationdocumentid',
      'syg_documenttype',
      'syg_documentnumber',
      'syg_countryofissueid',
      'syg_placeofissue',
      'syg_dateofissue',
      'syg_expirationdate',
    ].join(',');
    const coFields = [
      'syg_clientonboardingid',
      'syg_risklevel',
      'syg_pepcheck',
      'syg_specialconditions',
      'syg_aiareporting',
    ].join(',');

    const srUrl =
      `${base}/incidents(${srId})?$select=incidentid` +
      `&$expand=syg_linkedonboardingid(` +
        `$select=${coFields};` +
        `$expand=syg_relationshipmanagerid($select=systemuserid,fullname),` +
          `syg_referencecurrencyid($select=transactioncurrencyid,currencyname,isocurrencycode),` +
          `syg_kycprofilefrontinputid($select=${kycFields}),` +
          `syg_identificationdocumentid($select=${idFields})` +
      `)`;

    const srResp = await fetch(srUrl, creds);
    if (!srResp.ok) throw new Error(`SR fetch failed: ${srResp.status}`);
    const srData = await srResp.json();
    const co = srData.syg_linkedonboardingid ?? {};
    const onboardingId: string = co.syg_clientonboardingid ?? '';
    const kyc = co.syg_kycprofilefrontinputid ?? {};
    const idDoc = co.syg_identificationdocumentid ?? null;
    const rm = co.syg_relationshipmanagerid ?? {};
    const currency = co.syg_referencecurrencyid ?? {};

    const fv = (obj: any, key: string): string =>
      obj[`${key}@OData.Community.Display.V1.FormattedValue`] ?? String(obj[key] ?? '');

    const crm: CrmValues = {
      // KYC fields
      dateOfBirth: formatDate(kyc.syg_dateofbirth),
      nationalities: kyc.syg_nationalities ?? '',
      clientSegment: fv(kyc, 'syg_finsaclassification'),
      // CO lookup fields
      relationshipManager: rm.fullname ?? '',
      referenceCurrency: currency.currencyname ?? currency.isocurrencycode ?? '',
      // CO option set / text fields
      riskLevel: fv(co, 'syg_risklevel'),
      pepStatus: fv(co, 'syg_pepcheck'),
      specialConditions: co.syg_specialconditions ?? '',
      aiaReporting: fv(co, 'syg_aiareporting'),
    };

    const idDocument: IdDocument | null = idDoc
      ? {
          id: idDoc.syg_identificationdocumentid ?? '',
          documentType: fv(idDoc, 'syg_documenttype'),
          documentNumber: idDoc.syg_documentnumber ?? '',
          countryOfIssue: fv(idDoc, 'syg_countryofissueid'),
          placeOfIssue: idDoc.syg_placeofissue ?? '',
          issueDate: formatDate(idDoc.syg_dateofissue),
          expirationDate: formatDate(idDoc.syg_expirationdate),
        }
      : null;

    // ── Step 2: Fetch syg_taxationdetails linked to onboarding ──
    let taxRecords: TaxRecord[] = [];
    if (onboardingId) {
      const txUrl =
        `${base}/syg_taxationdetails?$filter=_syg_clientonboardingid_value eq '${onboardingId}'` +
        `&$select=syg_taxationdetailsid,syg_taxid` +
        `&$expand=syg_countryid($select=syg_countryid,syg_name)`;
      const txResp = await fetch(txUrl, creds);
      if (txResp.ok) {
        const txData = await txResp.json();
        taxRecords = (txData.value ?? []).map((r: any) => ({
          id: r.syg_taxationdetailsid,
          taxDomicile: r.syg_countryid?.syg_name ?? fv(r, 'syg_countryid') ?? '',
          taxId: r.syg_taxid ?? '',
        })) as TaxRecord[];
      }
    }

    this.state = { ...this.state, crmValues: crm, idDocument, taxRecords };
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.isReadOnly = context.mode.isControlDisabled;

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact();
      return;
    }

    // Only re-read isReadOnly from context — don't overwrite state from D365 echo
    this.renderReact();
  }

  private handleOutputChanged(json: string): void {
    this.outputJson = json;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(ChecklistRoot, {
        initialState: this.state,
        isReadOnly: this.isReadOnly,
        userName: this.userName,
        onOutputChanged: (json: string) => this.handleOutputChanged(json),
      })
    );
  }

  public getOutputs(): IOutputs {
    return { checkResults: this.outputJson } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

> **Note on `initialState` prop:** `ChecklistRoot` receives `initialState` from `index.ts` but manages its own `useState`. Since `index.ts` calls `renderReact()` every time state updates (via `handleOutputChanged`), a new `initialState` is passed on every render — but React's `useState` ignores subsequent `initialState` values after mount. To keep state alive across re-renders from `index.ts`, change `ChecklistRoot` to use a **ref for state sync** OR — simpler — stop calling `renderReact()` from `handleOutputChanged` and instead rely on React's internal state to drive re-renders.

**Apply this fix to `ChecklistRoot.tsx` `updateState` function:** Remove the `onOutputChanged(json)` call from inside `setState`. Instead, call it in a `useEffect`:

```tsx
// In ChecklistRoot.tsx — replace the updateState function:
function updateState(updater: (prev: CheckState) => CheckState): void {
  setState(prev => updater(prev));
}

// Add after the state declaration:
const prevStateRef = React.useRef(state);
React.useEffect(() => {
  if (prevStateRef.current === state) return;
  prevStateRef.current = state;
  const stats = computeStats(state);
  const json = serializeCheckResults(state, {
    total: stats.total,
    completed: stats.done,
    mismatches: stats.unresolvedKeys.length,
    blocked: stats.blockedKeys.length,
  });
  onOutputChanged(json);
}, [state]);
```

And remove `onOutputChanged(json)` from `handleComplete` — replace it with a state update that triggers the effect:
```tsx
function handleComplete(): void {
  const stats = computeStats(state);
  if (!stats.canSubmit) return;
  setState(s => ({ ...s, _completedAt: new Date().toISOString() } as any));
  // The useEffect above will fire and serialize — but we need completedAt/By in summary.
  // Better: store completedAt/By in state.
}
```

**Simplest solution**: Add `completedAt` and `completedBy` to `CheckState` and set them on complete. The `useEffect` serializes them automatically. Add to `CheckState` in `types.ts`:

```typescript
// Add to CheckState interface:
completedAt?: string;
completedBy?: string;
```

Then in `handleComplete`:
```tsx
function handleComplete(): void {
  const stats = computeStats(state);
  if (!stats.canSubmit) return;
  setState(s => ({ ...s, completedAt: new Date().toISOString(), completedBy: userName }));
}
```

And in the `useEffect` serialization, include `completedAt`/`completedBy` from state:
```tsx
const json = serializeCheckResults(state, {
  total: stats.total, completed: stats.done,
  mismatches: stats.unresolvedKeys.length, blocked: stats.blockedKeys.length,
  completedAt: state.completedAt, completedBy: state.completedBy,
});
```

Also in `index.ts` `handleOutputChanged`, remove the `renderReact()` call after `notifyOutputChanged()` — React state updates from `ChecklistRoot`'s `setState` will drive re-renders automatically via `root.render(createElement(...))` called from `updateView`. The `updateView` call caused by D365 echo is blocked by `pendingOutput`.

- [ ] **Step 2: Apply all fixes described above to ChecklistRoot.tsx and types.ts**

Final `CheckState` in `types.ts` (add two optional fields):
```typescript
export interface CheckState {
  answers: Record<string, AnswerValue>;
  mismatches: Record<string, MismatchData>;
  manualNotDone: Record<string, ManualNotDoneData>;
  crmValues: CrmValues;
  taxRecords: TaxRecord[];
  idDocument: IdDocument | null;
  loading: boolean;
  loadError: string | null;
  completedAt?: string;
  completedBy?: string;
}
```

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. The `generated/ManifestTypes.d.ts` file is auto-generated by `pcf-scripts` on first build — if it doesn't exist yet, the build step in Task 13 will create it.

- [ ] **Step 4: Commit**

```bash
git add NpOnboardingChecklist/index.ts NpOnboardingChecklist/components/ChecklistRoot.tsx NpOnboardingChecklist/types.ts
git commit -m "feat: add index.ts PCF class with WebAPI data loading"
```

---

## Task 13: Build and verify

**Files:** No new files. Verifies the full build chain produces a valid `bundle.js`.

- [ ] **Step 1: Run the production build**

```bash
cd NpOnboardingChecklist && npm run build
```

Expected output (last few lines):
```
[PCF-Scripts] Build succeeded.
```
The build creates `out/controls/NpOnboardingChecklist/bundle.js`.

- [ ] **Step 2: Verify bundle.js exists and has non-trivial size**

```bash
ls -lh out/controls/NpOnboardingChecklist/bundle.js
```

Expected: file exists, size > 50 KB (React 18 minified is ~45 KB + component code).

- [ ] **Step 3: Check bundle has no console.log (security requirement)**

```bash
grep -c "console\.log" out/controls/NpOnboardingChecklist/bundle.js
```

Expected: `0`

- [ ] **Step 4: Fix any build errors**

Common errors and fixes:
- `Cannot find module './generated/ManifestTypes'` — the manifest was not processed. Run `npm run build` once with the manifest in place; pcf-scripts generates ManifestTypes on first run.
- `Property 'X' does not exist on type 'IOutputs'` — the manifest property name must match exactly. Check `ControlManifest.Input.xml` `name` attribute vs `getOutputs()` return key.
- `JSX element type does not have any construct or call signatures` — ensure `"jsx": "react"` is in tsconfig.json and `import * as React from 'react'` is in every `.tsx` file.

- [ ] **Step 5: Commit**

```bash
git add NpOnboardingChecklist/generated/ NpOnboardingChecklist/out/
git commit -m "build: NpOnboardingChecklist production bundle"
```

---

## Task 14: Solution packaging — add control to the solution

**Files:**
- Modify: `Solution/manual-pack/customizations.xml`
- Modify: `Solution/manual-pack/solution.xml`
- Create: `Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/` folder with contents

- [ ] **Step 1: Copy bundle files into the solution Controls folder**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/strings
cp NpOnboardingChecklist/out/controls/NpOnboardingChecklist/bundle.js \
   Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/bundle.js
cp NpOnboardingChecklist/ControlManifest.Input.xml \
   Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/ControlManifest.xml
```

- [ ] **Step 2: Add entry to customizations.xml**

Open `Solution/manual-pack/customizations.xml` and add inside `<CustomControls>` after the last `</CustomControl>`:

```xml
    <CustomControl>
      <Name>Syg.NpOnboardingChecklist</Name>
      <FileName>/Controls/Syg.NpOnboardingChecklist/ControlManifest.xml</FileName>
    </CustomControl>
```

- [ ] **Step 3: Bump solution version and add RootComponent in solution.xml**

In `Solution/manual-pack/solution.xml`:
- Change `<Version>6.1.0</Version>` → `<Version>6.2.0</Version>`
- Add inside `<RootComponents>` after the last `<RootComponent>`:

```xml
      <RootComponent type="66" schemaName="Syg.NpOnboardingChecklist" behavior="0" />
```

- [ ] **Step 4: Build the solution zip**

```bash
cd Solution/manual-pack
zip -r ../bin/Release/SygnumPCFComponents_6.2.0.zip \
  solution.xml customizations.xml '[Content_Types].xml' Controls/
```

Expected: zip file created at `Solution/bin/Release/SygnumPCFComponents_6.2.0.zip`

- [ ] **Step 5: Verify the zip contents include the new control**

```bash
unzip -l Solution/bin/Release/SygnumPCFComponents_6.2.0.zip | grep NpOnboarding
```

Expected output:
```
Controls/Syg.NpOnboardingChecklist/bundle.js
Controls/Syg.NpOnboardingChecklist/ControlManifest.xml
```

- [ ] **Step 6: Commit**

```bash
cd ../..
git add Solution/manual-pack/customizations.xml Solution/manual-pack/solution.xml \
        Solution/manual-pack/Controls/Syg.NpOnboardingChecklist/
git commit -m "chore: add NpOnboardingChecklist to solution package v6.2.0"
```

---

## Task 15: Import to D365 and configure on form

- [ ] **Step 1: Import the solution**

In D365 → Solutions → Import solution → upload `SygnumPCFComponents_6.2.0.zip`. If the previous managed version is installed: delete it first (Solutions → three dots → Delete), then import the new one.

- [ ] **Step 2: Add control to the Service Request form**

In D365 → Customizations → Customize the System → Service Request entity → Forms → \[target form\]:
1. Select or create a field of type **Multiple Lines of Text** bound to `syg_checkresults` (create this field in the entity first if it doesn't exist).
2. In the field properties → Controls tab → Add control → select `NpOnboardingChecklist`.
3. Set `checkResults` binding → `syg_checkresults`.
4. Set `isReadOnly` to field binding if you have a TwoOptions field, or leave as static `false` for now.
5. Hide the default text area (show only on web/phone/tablet as the PCF control).
6. Save and publish.

- [ ] **Step 3: Hard-refresh D365 and open a Service Request record**

Press `Ctrl+Shift+R` in the browser after publish. Open a Service Request with a linked onboarding record (`syg_linkedonboardingid`). The checklist should load with CRM values populated from the onboarding and its KYC profile.

- [ ] **Step 4: Smoke-test the control**

Verify:
- [ ] Section 1 shows Date of Birth (from KYC), RM name, Risk Level, PEP Status (from onboarding CO)
- [ ] Clicking Yes on a CRM item turns dot blue, status shows "Confirmed"
- [ ] Clicking No on a CRM item opens the mismatch form; checking "Mark as resolved" without filling description shows validation message
- [ ] Clicking No on a manual item opens the optional reason textarea with "blocks completion" note
- [ ] Progress bar increments on each Yes / resolved No
- [ ] Section header summary updates (e.g. "1 mismatch · 2/6")
- [ ] "Complete checklist" button stays disabled while any item is pending, blocked, or unresolved
- [ ] Clicking Complete writes `completedAt` and `completedBy` to the JSON; saving the form persists the data
- [ ] Re-opening the form restores all previous answers, mismatch forms, and statuses

---

## Self-Review Checklist

**Spec coverage:**
- [x] 3 properties (checkResults, checklistConfig, isReadOnly) — Task 1 manifest
- [x] Output JSON schema with answers/mismatches/manualNotDone/summary — Tasks 2, 3, 11
- [x] Section 1 (dob, rm, active, risk, pep + nationalities display) — Task 11
- [x] Section 2 (ID documents display, client segment) — Tasks 7, 11
- [x] Section 3 (currency CRM, pms/payment/block/archive manual, special CRM, DAV display) — Task 11
- [x] Section 4 (dynamic tax records + chtax/dispatch/oms manual + indicia CRM check) — Tasks 8, 11
- [x] Section 5 (omst/cv4/cvw/btct/btcv — 5 manual checks, no sub-groups) — Task 11
- [x] CRM check: lock icon, mismatch form, description required, two resolution options — Task 5
- [x] Manual check: no lock, italic "Manual check", optional reason, block note — Task 6
- [x] Display-only: grey dot, no buttons, not counted — Task 4
- [x] Tax records: field data above check row — Task 8
- [x] Progress bar in sticky header — Task 9
- [x] Alert bars (grey) for mismatches and blocks — Task 9
- [x] Section header summary (normal / mismatch / blocked / done) — Task 4, 11
- [x] Submit button: disabled until all done, no unresolved, no blocked — Task 10
- [x] completedAt (ISO) and completedBy (userName) written on Complete — Tasks 2, 11, 12
- [x] pendingOutput flag preventing updateView loop — Task 12
- [x] Two WebAPI calls in init() — Task 12
- [x] SR ID resolution with Xrm.Page fallback — Task 3
- [x] Swiss date format de-CH — Task 3
- [x] isReadOnly mode — all components accept and respect prop — Tasks 5, 6, 8, 11
- [x] No console.log, no emojis, SVG icons only — throughout
- [x] pcf-scripts build --buildMode production — Task 1
- [x] React 18 createRoot — Task 12
- [x] Solution packaging — Task 14

**No placeholders found.**
