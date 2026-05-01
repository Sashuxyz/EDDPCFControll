# RelatedPartiesGraph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dataset-bound PCF control that renders an interactive radial relationship graph using Cytoscape.js, with drill-down up to 3 levels, D365-native card-style nodes, and a side panel for details.

**Architecture:** Cytoscape.js renders nodes and edges in a concentric layout inside a React-managed container. Level 0-1 data comes from the bound dataset. Level 2-3 data fetched via `context.webAPI`. Drillability resolved by checking if the related party's account/contact has its own `syg_kycprofile`. State managed in the root React component with caches for drill resolution and node deduplication.

**Tech Stack:** React 18, TypeScript 4.9, Cytoscape.js 3.30, cytoscape-cose-bilkent 4.1, pcf-scripts (production build)

---

### Task 1: Scaffold Project

**Files:**
- Create: `RelatedPartiesGraph/package.json`
- Create: `RelatedPartiesGraph/tsconfig.json`
- Create: `RelatedPartiesGraph/RelatedPartiesGraph.pcfproj`
- Create: `RelatedPartiesGraph/ControlManifest.Input.xml`
- Create: `RelatedPartiesGraph/index.ts` (stub)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "related-parties-graph",
  "version": "1.0.0",
  "description": "Interactive relationship graph for KYC profiles",
  "scripts": {
    "build": "pcf-scripts build --buildMode production",
    "clean": "pcf-scripts clean",
    "rebuild": "pcf-scripts clean && pcf-scripts build --buildMode production",
    "start": "pcf-scripts start watch"
  },
  "dependencies": {
    "cytoscape": "^3.30.0",
    "cytoscape-cose-bilkent": "^4.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/cytoscape": "^3.21.0",
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

- [ ] **Step 3: Create RelatedPartiesGraph.pcfproj**

Copy the exact pattern from `ComplianceConditionScheduler/ComplianceConditionScheduler.pcfproj`. Change `<Name>` to `RelatedPartiesGraph` and generate a new `<ProjectGuid>`.

- [ ] **Step 4: Create ControlManifest.Input.xml**

```xml
<?xml version="1.0" encoding="utf-8" ?>
<manifest>
  <control namespace="Syg" constructor="RelatedPartiesGraph" version="1.0.0"
           display-name-key="RelatedPartiesGraph"
           description-key="Interactive relationship graph for KYC profiles"
           control-type="standard" api-version="1.3.0">
    <external-service-usage enabled="false" />
    <data-set name="parties" display-name-key="Related Parties"
              cds-data-set-options="displayCommandBar:false;displayViewSelector:false" />
    <resources>
      <code path="index.ts" order="1" />
    </resources>
    <feature-usage>
      <uses-feature name="WebAPI" required="true" />
    </feature-usage>
  </control>
</manifest>
```

- [ ] **Step 5: Create index.ts stub and build**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
export class RelatedPartiesGraph implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  public init(): void {}
  public updateView(): void {}
  public getOutputs(): IOutputs { return {}; }
  public destroy(): void {}
}
```

```bash
cd RelatedPartiesGraph && npm install && npm run build
```

Expected: succeeds, `generated/ManifestTypes.d.ts` exists.

- [ ] **Step 6: Commit**

```bash
git add RelatedPartiesGraph/
git commit -m "feat(related-parties-graph): scaffold project with cytoscape deps"
```

---

### Task 2: Types and constants

**Files:**
- Create: `RelatedPartiesGraph/types.ts`

- [ ] **Step 1: Create types.ts**

```typescript
export interface NodeData {
  id: string;
  etn: 'account' | 'contact';
  displayName: string;
  level: 0 | 1 | 2 | 3;
  ownKycProfileId: string | null;
  parentProfileId: string;
  partyTypeName: string;
  partyTypeKey: number;
  impact: 'Major' | 'Minor' | 'No' | null;
  score: number | null;
  pep: boolean;
  pepLevel: string | null;
  riskScore: number | null;
  junctionId: string;
}

export interface EdgeData {
  source: string;
  target: string;
  label: string;
  level: 1 | 2 | 3;
}

export interface ProfileBreadcrumb {
  id: string;
  name: string;
}

export interface GraphState {
  centreProfileId: string;
  centreProfileName: string;
  expandedProfiles: ProfileBreadcrumb[];
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
  selectedNodeId: string | null;
  drillCache: Map<string, string | null>;
  loadingProfiles: Set<string>;
}

export interface RelatedPartyRecord {
  junctionId: string;
  relatedPartyId: string;
  relatedPartyEtn: 'account' | 'contact';
  relatedPartyName: string;
  partyTypeName: string;
  partyTypeKey: number;
  impact: 'Major' | 'Minor' | 'No' | null;
  score: number | null;
  pep: boolean;
  pepLevel: string | null;
  riskScore: number | null;
}

// Impact colour mapping
export const IMPACT_COLORS: Record<string, { border: string; text: string }> = {
  Major: { border: '#0078D4', text: '#0078D4' },
  Minor: { border: '#835B00', text: '#835B00' },
  No:    { border: '#A19F9D', text: '#A19F9D' },
};

export const DEFAULT_IMPACT_COLOR = IMPACT_COLORS.No;

export const CENTRE_COLOR = { bg: '#0078D4', text: '#FFFFFF', border: '#0078D4' };

export const MAX_DEPTH = 3;
export const MAX_CONCURRENT_DRILL_CHECKS = 10;
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/types.ts
git commit -m "feat(related-parties-graph): add types, constants, and colour mapping"
```

---

### Task 3: Styles

**Files:**
- Create: `RelatedPartiesGraph/styles/tokens.ts`

- [ ] **Step 1: Create styles/tokens.ts**

```typescript
import * as React from 'react';

type S = Record<string, React.CSSProperties>;

const FONT = "'Segoe UI', 'Helvetica Neue', sans-serif";

export const containerStyles: S = {
  root: {
    fontFamily: FONT,
    width: '100%',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  canvas: {
    width: '100%',
    height: 450,
    background: '#FAFAFA',
    position: 'relative',
    overflow: 'hidden',
  },
};

export const breadcrumbStyles: S = {
  bar: {
    padding: '8px 16px',
    background: '#F3F2F1',
    borderBottom: '1px solid #edebe9',
    fontSize: 12,
    color: '#605E5C',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  segment: {
    color: '#0078D4',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 12,
    fontFamily: FONT,
    padding: 0,
  },
  segmentCurrent: {
    color: '#323130',
    fontWeight: 600,
    fontSize: 12,
  },
  separator: {
    color: '#A19F9D',
    margin: '0 4px',
    fontSize: 10,
  },
};

export const sidePanelStyles: S = {
  root: {
    padding: '12px 16px',
    borderTop: '1px solid #edebe9',
    background: '#fff',
    fontFamily: FONT,
    minHeight: 60,
  },
  label: {
    fontSize: 11,
    color: '#A19F9D',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  placeholder: {
    fontSize: 13,
    color: '#A19F9D',
    fontStyle: 'italic',
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: '#323130',
    marginBottom: 4,
  },
  row: {
    display: 'flex',
    gap: 24,
    marginTop: 6,
    fontSize: 12,
    color: '#605E5C',
  },
  fieldLabel: {
    fontWeight: 600,
    color: '#323130',
    marginRight: 4,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    fontSize: 12,
    fontWeight: 600,
    color: '#0078D4',
    background: 'none',
    border: '1px solid #0078D4',
    borderRadius: 4,
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: FONT,
  },
  pepBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    borderRadius: 3,
    background: '#A4262C',
    color: '#fff',
    fontSize: 10,
    fontWeight: 600,
    marginLeft: 6,
  },
};

export const legendStyles: S = {
  bar: {
    padding: '8px 16px',
    borderTop: '1px solid #edebe9',
    background: '#FAFAFA',
    display: 'flex',
    gap: 16,
    fontSize: 10,
    color: '#605E5C',
    flexWrap: 'wrap',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
};

export const emptyStyles: S = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 16px',
    color: '#A19F9D',
  },
  icon: {
    marginBottom: 10,
  },
  text: {
    fontSize: 13,
    color: '#605E5C',
  },
};

// Cytoscape node style function — used in GraphCanvas
export function cyNodeStyle(impact: string | null, isCentre: boolean): {
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  textColor: string;
} {
  if (isCentre) {
    return { bgColor: '#0078D4', borderColor: '#0078D4', borderWidth: 2, textColor: '#FFFFFF' };
  }
  const colors = impact && impact in
    { Major: 1, Minor: 1, No: 1 }
    ? { Major: '#0078D4', Minor: '#835B00', No: '#A19F9D' }[impact]!
    : '#A19F9D';
  return { bgColor: '#FFFFFF', borderColor: colors, borderWidth: 2, textColor: '#323130' };
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/styles/tokens.ts
git commit -m "feat(related-parties-graph): add styles and Cytoscape node style helper"
```

---

### Task 4: Navigation utility

**Files:**
- Create: `RelatedPartiesGraph/utils/navigation.ts`

- [ ] **Step 1: Create utils/navigation.ts**

```typescript
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(id: string): boolean {
  return GUID_RE.test(id);
}

export function cleanGuid(raw: string): string {
  return raw.replace(/[{}]/g, '').toLowerCase();
}

export function openRecord(
  entityName: string,
  entityId: string
): void {
  const cleaned = cleanGuid(entityId);
  if (!isValidGuid(cleaned)) return;

  try {
    const xrm = (window as unknown as {
      Xrm?: { Navigation?: { openForm?: (opts: unknown) => void } };
    }).Xrm;
    if (xrm?.Navigation?.openForm) {
      xrm.Navigation.openForm({
        entityName,
        entityId: cleaned,
        openInNewWindow: true,
      });
      return;
    }
  } catch { /* fallback */ }

  // URL fallback
  try {
    const url = new URL(
      `/main.aspx?etn=${entityName}&id=${cleaned}&pagetype=entityrecord`,
      window.location.origin
    );
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch { /* give up */ }
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/utils/navigation.ts
git commit -m "feat(related-parties-graph): add navigation utility with GUID validation"
```

---

### Task 5: WebAPI utility

**Files:**
- Create: `RelatedPartiesGraph/utils/webapi.ts`

- [ ] **Step 1: Create utils/webapi.ts**

This is the most critical utility — handles all data fetching for levels 2-3 and drillability checks.

```typescript
import { RelatedPartyRecord, MAX_CONCURRENT_DRILL_CHECKS } from '../types';

type WebAPI = ComponentFramework.WebApi;

function parseImpact(raw: unknown): 'Major' | 'Minor' | 'No' | null {
  if (raw === 'Major' || raw === 'Minor' || raw === 'No') return raw;
  return null;
}

function extractPartyRecords(entities: ComponentFramework.WebApi.Entity[]): RelatedPartyRecord[] {
  return entities.map((e) => {
    const partyType = e['syg_relatedpartytypeid'] as Record<string, unknown> | null;
    return {
      junctionId: (e['syg_relatedclientpartiesid'] as string) ?? '',
      relatedPartyId: (e['_syg_relatedpartyid_value'] as string) ?? '',
      relatedPartyEtn:
        ((e['_syg_relatedpartyid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string) ?? 'contact') as 'account' | 'contact',
      relatedPartyName:
        (e['_syg_relatedpartyid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? '(Unknown)',
      partyTypeName: (partyType?.['syg_name'] as string) ?? '(Unknown)',
      partyTypeKey: (partyType?.['syg_propertykey'] as number) ?? 0,
      impact: parseImpact(partyType?.['syg_impact']),
      score: (partyType?.['syg_score'] as number) ?? null,
      pep: e['syg_pep'] === true || e['syg_pep'] === 1,
      pepLevel:
        (e['_syg_peplevelid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? null,
      riskScore: (e['syg_riskscore'] as number) ?? null,
    };
  });
}

export async function fetchPartiesForProfile(
  webAPI: WebAPI,
  profileId: string
): Promise<RelatedPartyRecord[]> {
  const result = await webAPI.retrieveMultipleRecords(
    'syg_relatedclientparties',
    `?$filter=_syg_kycprofileid_value eq ${profileId} and statecode eq 0` +
    `&$select=syg_relatedclientpartiesid,_syg_relatedpartyid_value,syg_pep,syg_riskscore,_syg_peplevelid_value` +
    `&$expand=syg_relatedpartytypeid($select=syg_name,syg_propertykey,syg_score,syg_impact)`
  );
  return extractPartyRecords(result.entities ?? []);
}

export async function findKycProfileForCustomer(
  webAPI: WebAPI,
  customerId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const result = await webAPI.retrieveMultipleRecords(
      'syg_kycprofile',
      `?$filter=(_syg_clientid_value eq ${customerId}) and statecode eq 0` +
      `&$select=syg_kycprofileid,syg_name&$top=1`
    );
    const first = result.entities?.[0];
    if (!first) return null;
    return {
      id: (first['syg_kycprofileid'] as string) ?? '',
      name: (first['syg_name'] as string) ?? '(Unknown)',
    };
  } catch {
    return null;
  }
}

export async function batchResolveDrillability(
  webAPI: WebAPI,
  customerIds: string[],
  existingCache: Map<string, string | null>
): Promise<Map<string, string | null>> {
  const uncached = customerIds.filter((id) => !existingCache.has(id));
  if (uncached.length === 0) return existingCache;

  const results = new Map(existingCache);

  // Process in batches of MAX_CONCURRENT_DRILL_CHECKS
  for (let i = 0; i < uncached.length; i += MAX_CONCURRENT_DRILL_CHECKS) {
    const batch = uncached.slice(i, i + MAX_CONCURRENT_DRILL_CHECKS);
    const promises = batch.map(async (id) => {
      const profile = await findKycProfileForCustomer(webAPI, id);
      return { id, profileId: profile?.id ?? null };
    });
    const resolved = await Promise.all(promises);
    for (const { id, profileId } of resolved) {
      results.set(id, profileId);
    }
  }

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/utils/webapi.ts
git commit -m "feat(related-parties-graph): add WebAPI utility — fetch, drill, batch resolve"
```

---

### Task 6: Graph model utility

**Files:**
- Create: `RelatedPartiesGraph/utils/graphModel.ts`

- [ ] **Step 1: Create utils/graphModel.ts**

Converts dataset records and API records into the internal NodeData/EdgeData model.

```typescript
import { NodeData, EdgeData, RelatedPartyRecord, DEFAULT_IMPACT_COLOR, IMPACT_COLORS } from '../types';

export function datasetRecordToPartyRecord(
  record: ComponentFramework.PropertyTypes.DataSet['records'][string],
  columns: ComponentFramework.PropertyTypes.DataSet['columns']
): RelatedPartyRecord | null {
  const getValue = (name: string): unknown => {
    try { return record.getValue(name); } catch { return null; }
  };
  const getFormatted = (name: string): string => {
    try { return record.getFormattedValue(name) ?? ''; } catch { return ''; }
  };

  const relatedPartyId = getValue('syg_relatedpartyid') as string | null;
  if (!relatedPartyId) return null;

  // Extract entity type from the lookup
  const relatedPartyRef = record.getValue('syg_relatedpartyid');
  let etn: 'account' | 'contact' = 'contact';
  if (relatedPartyRef && typeof relatedPartyRef === 'object' && 'etn' in (relatedPartyRef as Record<string, unknown>)) {
    etn = ((relatedPartyRef as Record<string, unknown>).etn as string) === 'account' ? 'account' : 'contact';
  }

  const partyTypeName = getFormatted('syg_relatedpartytypeid') || '(Unknown)';
  const relatedPartyName = getFormatted('syg_relatedpartyid') || '(Unknown)';

  return {
    junctionId: record.getRecordId(),
    relatedPartyId: typeof relatedPartyId === 'string' ? relatedPartyId :
      (relatedPartyId as Record<string, unknown>)?.id as string ?? '',
    relatedPartyEtn: etn,
    relatedPartyName,
    partyTypeName,
    partyTypeKey: 0,
    impact: null, // Dataset doesn't expand the property — resolved later or via formatted value
    score: null,
    pep: getValue('syg_pep') === true || getValue('syg_pep') === 1,
    pepLevel: getFormatted('syg_peplevelid') || null,
    riskScore: (getValue('syg_riskscore') as number) ?? null,
  };
}

export function partyRecordToNode(
  record: RelatedPartyRecord,
  level: 0 | 1 | 2 | 3,
  parentProfileId: string,
  drillCache: Map<string, string | null>
): NodeData {
  return {
    id: record.relatedPartyId,
    etn: record.relatedPartyEtn,
    displayName: record.relatedPartyName,
    level,
    ownKycProfileId: drillCache.get(record.relatedPartyId) ?? null,
    parentProfileId,
    partyTypeName: record.partyTypeName,
    partyTypeKey: record.partyTypeKey,
    impact: record.impact,
    score: record.score,
    pep: record.pep,
    pepLevel: record.pepLevel,
    riskScore: record.riskScore,
    junctionId: record.junctionId,
  };
}

export function buildEdge(
  sourceProfileId: string,
  targetPartyId: string,
  label: string,
  level: 1 | 2 | 3
): EdgeData {
  return { source: sourceProfileId, target: targetPartyId, label, level };
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/utils/graphModel.ts
git commit -m "feat(related-parties-graph): add graph model — dataset/API to NodeData conversion"
```

---

### Task 7: Layout utility

**Files:**
- Create: `RelatedPartiesGraph/utils/layout.ts`

- [ ] **Step 1: Create utils/layout.ts**

```typescript
export interface ConcentricLayoutOptions {
  name: 'concentric';
  concentric: (node: { data: (key: string) => unknown }) => number;
  levelWidth: () => number;
  minNodeSpacing: number;
  animate: boolean;
  animationDuration: number;
  fit: boolean;
  padding: number;
}

export function getConcentricLayout(): ConcentricLayoutOptions {
  return {
    name: 'concentric',
    concentric: (node) => {
      const level = node.data('level') as number;
      return 4 - level; // higher value = closer to centre
    },
    levelWidth: () => 1,
    minNodeSpacing: 40,
    animate: true,
    animationDuration: 400,
    fit: true,
    padding: 40,
  };
}

export function getNodeDimensions(level: number): { width: number; height: number } {
  switch (level) {
    case 0: return { width: 160, height: 50 };
    case 1: return { width: 140, height: 44 };
    case 2: return { width: 130, height: 40 };
    case 3: return { width: 120, height: 36 };
    default: return { width: 120, height: 36 };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/utils/layout.ts
git commit -m "feat(related-parties-graph): add concentric layout configuration"
```

---

### Task 8: Simple components (EmptyState, Legend, Breadcrumb)

**Files:**
- Create: `RelatedPartiesGraph/components/EmptyState.tsx`
- Create: `RelatedPartiesGraph/components/Legend.tsx`
- Create: `RelatedPartiesGraph/components/Breadcrumb.tsx`

- [ ] **Step 1: Create components/EmptyState.tsx**

```tsx
import * as React from 'react';
import { emptyStyles } from '../styles/tokens';

export const EmptyState: React.FC = () => (
  <div style={emptyStyles.root}>
    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#A19F9D"
         strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={emptyStyles.icon}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
    <div style={emptyStyles.text}>No active related parties for this KYC profile</div>
  </div>
);
```

- [ ] **Step 2: Create components/Legend.tsx**

```tsx
import * as React from 'react';
import { legendStyles } from '../styles/tokens';

const items = [
  { label: 'Major', border: '#0078D4', bg: '#fff' },
  { label: 'Minor', border: '#835B00', bg: '#fff' },
  { label: 'No impact', border: '#A19F9D', bg: '#fff' },
  { label: 'KYC Profile', border: '#0078D4', bg: '#0078D4' },
];

export const Legend: React.FC = () => (
  <div style={legendStyles.bar}>
    {items.map((item) => (
      <span key={item.label} style={legendStyles.item}>
        <span style={{
          width: 10, height: 10, borderRadius: 2, display: 'inline-block',
          background: item.bg, border: `2px solid ${item.border}`,
        }} />
        {item.label}
      </span>
    ))}
    <span style={legendStyles.item}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0078D4', color: '#fff', fontSize: 9, fontWeight: 700,
      }}>+</span>
      Drillable
    </span>
    <span style={legendStyles.item}>
      <span style={{
        padding: '0 4px', borderRadius: 3,
        background: '#A4262C', color: '#fff', fontSize: 7, fontWeight: 700,
      }}>PEP</span>
      PEP flagged
    </span>
  </div>
);
```

- [ ] **Step 3: Create components/Breadcrumb.tsx**

```tsx
import * as React from 'react';
import { ProfileBreadcrumb } from '../types';
import { breadcrumbStyles } from '../styles/tokens';

interface BreadcrumbProps {
  chain: ProfileBreadcrumb[];
  onNavigate: (index: number) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ chain, onNavigate }) => (
  <div style={breadcrumbStyles.bar}>
    {chain.map((item, idx) => {
      const isLast = idx === chain.length - 1;
      return (
        <React.Fragment key={item.id}>
          {idx > 0 && <span style={breadcrumbStyles.separator}>{'>'}</span>}
          {isLast ? (
            <span style={breadcrumbStyles.segmentCurrent}>{item.name}</span>
          ) : (
            <button
              style={breadcrumbStyles.segment}
              onClick={() => onNavigate(idx)}
              type="button"
            >
              {item.name}
            </button>
          )}
        </React.Fragment>
      );
    })}
  </div>
);
```

- [ ] **Step 4: Commit**

```bash
git add RelatedPartiesGraph/components/EmptyState.tsx RelatedPartiesGraph/components/Legend.tsx RelatedPartiesGraph/components/Breadcrumb.tsx
git commit -m "feat(related-parties-graph): add EmptyState, Legend, and Breadcrumb components"
```

---

### Task 9: SidePanel component

**Files:**
- Create: `RelatedPartiesGraph/components/SidePanel.tsx`

- [ ] **Step 1: Create components/SidePanel.tsx**

```tsx
import * as React from 'react';
import { NodeData, MAX_DEPTH } from '../types';
import { sidePanelStyles } from '../styles/tokens';

interface SidePanelProps {
  node: NodeData | null;
  onExpand: (nodeId: string) => void;
  onOpenRecord: (etn: string, id: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ node, onExpand, onOpenRecord }) => {
  if (!node) {
    return (
      <div style={sidePanelStyles.root}>
        <div style={sidePanelStyles.label}>Selected node</div>
        <div style={sidePanelStyles.placeholder}>Click a node to view details</div>
      </div>
    );
  }

  const isDrillable = node.ownKycProfileId !== null;
  const isDepthCapped = node.level >= MAX_DEPTH;
  const isCentre = node.level === 0;

  return (
    <div style={sidePanelStyles.root}>
      <div style={sidePanelStyles.name}>
        {node.displayName}
        {node.pep && <span style={sidePanelStyles.pepBadge}>PEP</span>}
      </div>
      <div style={sidePanelStyles.row}>
        <span><span style={sidePanelStyles.fieldLabel}>Role:</span> {node.partyTypeName}</span>
        {node.riskScore !== null && (
          <span><span style={sidePanelStyles.fieldLabel}>Risk Score:</span> {node.riskScore}</span>
        )}
        {node.pepLevel && (
          <span><span style={sidePanelStyles.fieldLabel}>PEP Level:</span> {node.pepLevel}</span>
        )}
        <span>
          <span style={sidePanelStyles.fieldLabel}>Own KYC Profile:</span>{' '}
          {isDrillable ? 'Yes' : 'No'}
        </span>
      </div>
      <div style={sidePanelStyles.actions}>
        {isDrillable && !isDepthCapped && !isCentre && (
          <button
            style={sidePanelStyles.actionButton}
            onClick={() => onExpand(node.id)}
            type="button"
          >
            Expand
          </button>
        )}
        {isDepthCapped && isDrillable && (
          <span style={{ fontSize: 11, color: '#A19F9D' }}>Depth limit reached</span>
        )}
        <button
          style={sidePanelStyles.actionButton}
          onClick={() => onOpenRecord(node.etn, node.id)}
          type="button"
        >
          Open Record
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/components/SidePanel.tsx
git commit -m "feat(related-parties-graph): add SidePanel component with expand and open actions"
```

---

### Task 10: GraphCanvas component (Cytoscape)

**Files:**
- Create: `RelatedPartiesGraph/components/GraphCanvas.tsx`

This is the core component — mounts Cytoscape, renders nodes/edges, handles interactions.

- [ ] **Step 1: Create components/GraphCanvas.tsx**

```tsx
import * as React from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import { NodeData, EdgeData, IMPACT_COLORS, DEFAULT_IMPACT_COLOR, CENTRE_COLOR } from '../types';
import { getConcentricLayout, getNodeDimensions } from '../utils/layout';
import { containerStyles } from '../styles/tokens';

// Register layout extension once
let layoutRegistered = false;
if (!layoutRegistered) {
  cytoscape.use(coseBilkent);
  layoutRegistered = true;
}

interface GraphCanvasProps {
  centreProfileId: string;
  centreProfileName: string;
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onDrillNode: (nodeId: string) => void;
  onCtrlClickNode: (etn: string, id: string) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  centreProfileId,
  centreProfileName,
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onDrillNode,
  onCtrlClickNode,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cyRef = React.useRef<Core | null>(null);

  // Build Cytoscape elements from state
  const elements = React.useMemo(() => {
    const cyNodes: cytoscape.ElementDefinition[] = [];
    const cyEdges: cytoscape.ElementDefinition[] = [];

    // Centre profile node
    cyNodes.push({
      data: {
        id: `profile-${centreProfileId}`,
        label: centreProfileName,
        sublabel: 'KYC Profile',
        level: 0,
        isCentre: true,
        isDrillable: false,
        isPep: false,
        impact: null,
      },
    });

    // Party nodes
    nodes.forEach((node) => {
      cyNodes.push({
        data: {
          id: node.id,
          label: node.displayName,
          sublabel: node.partyTypeName,
          level: node.level,
          isCentre: false,
          isDrillable: node.ownKycProfileId !== null,
          isPep: node.pep,
          impact: node.impact,
          etn: node.etn,
        },
      });
    });

    // Edges
    for (const edge of edges) {
      const sourceId = edge.source === centreProfileId
        ? `profile-${centreProfileId}`
        : edge.source;
      cyEdges.push({
        data: {
          id: `edge-${edge.source}-${edge.target}`,
          source: sourceId,
          target: edge.target,
        },
      });
    }

    return [...cyNodes, ...cyEdges];
  }, [centreProfileId, centreProfileName, nodes, edges]);

  // Mount / update Cytoscape
  React.useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 10,
            'font-family': "'Segoe UI', sans-serif",
            'color': '#323130',
            'background-color': '#FFFFFF',
            'border-width': 2,
            'border-color': '#A19F9D',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
          },
        },
        {
          selector: 'node[isCentre]',
          style: {
            'background-color': CENTRE_COLOR.bg,
            'border-color': CENTRE_COLOR.border,
            'color': CENTRE_COLOR.text,
            'font-weight': 'bold',
            'font-size': 11,
          },
        },
        {
          selector: 'node[?isDrillable]',
          style: {
            'border-style': 'double',
          },
        },
        {
          selector: 'node[impact = "Major"]',
          style: {
            'border-color': IMPACT_COLORS.Major.border,
          },
        },
        {
          selector: 'node[impact = "Minor"]',
          style: {
            'border-color': IMPACT_COLORS.Minor.border,
          },
        },
        {
          selector: 'node[impact = "No"]',
          style: {
            'border-color': IMPACT_COLORS.No.border,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#0078D4',
            'overlay-color': '#0078D4',
            'overlay-opacity': 0.1,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#E1DFDD',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: getConcentricLayout() as unknown as cytoscape.LayoutOptions,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Set node dimensions based on level
    cy.nodes().forEach((node) => {
      const level = node.data('level') as number;
      const dims = getNodeDimensions(level);
      node.style({ width: dims.width, height: dims.height });
    });

    // Event: single click
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeId = evt.target.id();
      const isCentre = evt.target.data('isCentre');
      if (isCentre) {
        onSelectNode(null);
      } else {
        onSelectNode(nodeId);
      }
    });

    // Event: double click (drill)
    let tapTimeout: ReturnType<typeof setTimeout> | null = null;
    cy.on('tap', 'node', (evt: EventObject) => {
      if (tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
        // Double tap
        const nodeId = evt.target.id();
        const isDrillable = evt.target.data('isDrillable');
        if (isDrillable) {
          onDrillNode(nodeId);
        }
      } else {
        tapTimeout = setTimeout(() => {
          tapTimeout = null;
        }, 300);
      }
    });

    // Event: Cmd/Ctrl+click
    cy.on('tap', 'node', (evt: EventObject) => {
      const originalEvent = evt.originalEvent as MouseEvent;
      if (originalEvent.metaKey || originalEvent.ctrlKey) {
        const etn = evt.target.data('etn') as string;
        const id = evt.target.id();
        if (etn && id) {
          onCtrlClickNode(etn, id);
        }
      }
    });

    // Click background to deselect
    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectNode(null);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, onSelectNode, onDrillNode, onCtrlClickNode]);

  // Sync selection state
  React.useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedNodeId) {
      const node = cy.getElementById(selectedNodeId);
      if (node.length > 0) node.select();
    }
  }, [selectedNodeId]);

  return <div ref={containerRef} style={containerStyles.canvas} />;
};
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/components/GraphCanvas.tsx
git commit -m "feat(related-parties-graph): add GraphCanvas — Cytoscape mount with interactions"
```

---

### Task 11: PCF lifecycle (index.ts) and root orchestration

**Files:**
- Modify: `RelatedPartiesGraph/index.ts`

This is the orchestrator — manages GraphState, handles drill-down, coordinates WebAPI calls, renders the component tree.

- [ ] **Step 1: Replace index.ts with full implementation**

```typescript
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GraphCanvas } from './components/GraphCanvas';
import { SidePanel } from './components/SidePanel';
import { Breadcrumb } from './components/Breadcrumb';
import { Legend } from './components/Legend';
import { EmptyState } from './components/EmptyState';
import { fetchPartiesForProfile, batchResolveDrillability } from './utils/webapi';
import { datasetRecordToPartyRecord, partyRecordToNode, buildEdge } from './utils/graphModel';
import { openRecord } from './utils/navigation';
import { GraphState, NodeData, EdgeData, ProfileBreadcrumb, MAX_DEPTH } from './types';
import { containerStyles } from './styles/tokens';

function GraphApp(props: {
  state: GraphState;
  onSelectNode: (id: string | null) => void;
  onDrillNode: (id: string) => void;
  onBreadcrumbNav: (index: number) => void;
  onOpenRecord: (etn: string, id: string) => void;
}): React.ReactElement {
  const { state, onSelectNode, onDrillNode, onBreadcrumbNav, onOpenRecord } = props;
  const selectedNode = state.selectedNodeId ? state.nodes.get(state.selectedNodeId) ?? null : null;

  if (state.nodes.size === 0 && state.expandedProfiles.length <= 1) {
    return React.createElement('div', { style: containerStyles.root },
      React.createElement(EmptyState)
    );
  }

  return React.createElement('div', { style: containerStyles.root },
    React.createElement(Breadcrumb, {
      chain: state.expandedProfiles,
      onNavigate: onBreadcrumbNav,
    }),
    React.createElement(GraphCanvas, {
      centreProfileId: state.centreProfileId,
      centreProfileName: state.expandedProfiles[0]?.name ?? '',
      nodes: state.nodes,
      edges: state.edges,
      selectedNodeId: state.selectedNodeId,
      onSelectNode,
      onDrillNode,
      onCtrlClickNode: onOpenRecord,
    }),
    React.createElement(SidePanel, {
      node: selectedNode,
      onExpand: onDrillNode,
      onOpenRecord,
    }),
    React.createElement(Legend)
  );
}

export class RelatedPartiesGraph
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private context!: ComponentFramework.Context<IInputs>;
  private state: GraphState = {
    centreProfileId: '',
    centreProfileName: '',
    expandedProfiles: [],
    nodes: new Map(),
    edges: [],
    selectedNodeId: null,
    drillCache: new Map(),
    loadingProfiles: new Set(),
  };
  private parentProfileId: string | null = null;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.context = context;
    context.mode.trackContainerResize(true);
    try {
      context.parameters.parties.paging.setPageSize(250);
    } catch { /* not available */ }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    const ds = context.parameters.parties;

    // Auto-load all pages
    if (!ds.loading && ds.paging?.hasNextPage) {
      try { ds.paging.loadNextPage(); } catch { /* give up */ }
      return;
    }

    // Resolve parent profile
    const parentInfo = this.resolveParentProfile(context);
    if (!parentInfo) {
      this.renderReact();
      return;
    }

    // If parent changed, reset state
    if (parentInfo.id !== this.parentProfileId) {
      this.parentProfileId = parentInfo.id;
      this.state = {
        centreProfileId: parentInfo.id,
        centreProfileName: parentInfo.name,
        expandedProfiles: [{ id: parentInfo.id, name: parentInfo.name }],
        nodes: new Map(),
        edges: [],
        selectedNodeId: null,
        drillCache: new Map(),
        loadingProfiles: new Set(),
      };
    }

    // Build level 1 from dataset
    if (!ds.loading) {
      this.buildLevel1FromDataset(ds, parentInfo.id);
    }

    this.renderReact();
  }

  private resolveParentProfile(context: ComponentFramework.Context<IInputs>): { id: string; name: string } | null {
    const info = (context.mode as unknown as {
      contextInfo?: { entityId?: string; entityTypeName?: string };
    }).contextInfo;
    if (info?.entityId && info?.entityTypeName === 'syg_kycprofile') {
      const label = (context.mode as unknown as { label?: string }).label;
      return {
        id: info.entityId.replace(/[{}]/g, ''),
        name: label || 'KYC Profile',
      };
    }
    return null;
  }

  private buildLevel1FromDataset(
    ds: ComponentFramework.PropertyTypes.DataSet,
    profileId: string
  ): void {
    const nodes = new Map<string, NodeData>();
    const edges: EdgeData[] = [];

    for (const id of ds.sortedRecordIds) {
      const record = ds.records[id];
      const party = datasetRecordToPartyRecord(record, ds.columns);
      if (!party) continue;
      const node = partyRecordToNode(party, 1, profileId, this.state.drillCache);
      if (!nodes.has(node.id)) {
        nodes.set(node.id, node);
        edges.push(buildEdge(profileId, node.id, party.partyTypeName, 1));
      }
    }

    this.state.nodes = nodes;
    this.state.edges = edges;

    // Resolve drillability for all level-1 nodes
    const customerIds = Array.from(nodes.keys());
    if (customerIds.length > 0) {
      void this.resolveDrillability(customerIds);
    }
  }

  private async resolveDrillability(customerIds: string[]): Promise<void> {
    this.state.drillCache = await batchResolveDrillability(
      this.context.webAPI,
      customerIds,
      this.state.drillCache
    );
    // Update nodes with drill info
    this.state.nodes.forEach((node, id) => {
      if (this.state.drillCache.has(id)) {
        node.ownKycProfileId = this.state.drillCache.get(id) ?? null;
      }
    });
    this.renderReact();
  }

  private async handleDrill(nodeId: string): Promise<void> {
    const node = this.state.nodes.get(nodeId);
    if (!node || !node.ownKycProfileId) return;
    if (node.level >= MAX_DEPTH) return;

    const profileId = node.ownKycProfileId;

    // Check if already expanded
    if (this.state.expandedProfiles.some((p) => p.id === profileId)) return;

    this.state.loadingProfiles.add(profileId);
    this.renderReact();

    try {
      const parties = await fetchPartiesForProfile(this.context.webAPI, profileId);
      const nextLevel = (node.level + 1) as 1 | 2 | 3;

      for (const party of parties) {
        if (!this.state.nodes.has(party.relatedPartyId)) {
          const newNode = partyRecordToNode(party, nextLevel, profileId, this.state.drillCache);
          this.state.nodes.set(newNode.id, newNode);
        }
        this.state.edges.push(buildEdge(profileId, party.relatedPartyId, party.partyTypeName, nextLevel));
      }

      this.state.expandedProfiles.push({ id: profileId, name: node.displayName });

      // Resolve drillability for new nodes (only if below max depth)
      if (nextLevel < MAX_DEPTH) {
        const newCustomerIds = parties.map((p) => p.relatedPartyId);
        void this.resolveDrillability(newCustomerIds);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      this.state.loadingProfiles.delete(profileId);
      this.renderReact();
    }
  }

  private handleBreadcrumbNav(index: number): void {
    // Collapse to the given breadcrumb level
    const keepProfiles = this.state.expandedProfiles.slice(0, index + 1);
    const keepLevels = index + 1; // level 0 = centre, so index 0 = keep level 1

    // Remove nodes and edges beyond the collapse point
    const newNodes = new Map<string, NodeData>();
    this.state.nodes.forEach((node, id) => {
      if (node.level <= keepLevels) {
        newNodes.set(id, node);
      }
    });
    const newEdges = this.state.edges.filter((e) => e.level <= keepLevels);

    this.state.expandedProfiles = keepProfiles;
    this.state.nodes = newNodes;
    this.state.edges = newEdges;
    this.state.selectedNodeId = null;
    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(GraphApp, {
        state: { ...this.state, nodes: new Map(this.state.nodes) },
        onSelectNode: (id: string | null) => {
          this.state.selectedNodeId = id;
          this.renderReact();
        },
        onDrillNode: (id: string) => { void this.handleDrill(id); },
        onBreadcrumbNav: (index: number) => { this.handleBreadcrumbNav(index); },
        onOpenRecord: (etn: string, id: string) => { openRecord(etn, id); },
      })
    );
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.root.unmount();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add RelatedPartiesGraph/index.ts
git commit -m "feat(related-parties-graph): add PCF lifecycle with drill-down orchestration"
```

---

### Task 12: Build and verify

- [ ] **Step 1: Run production build**

```bash
cd RelatedPartiesGraph && npm run build
```

Expected: `webpack compiled successfully`.

- [ ] **Step 2: Verify compiled manifest**

```bash
grep 'code path' out/controls/ControlManifest.xml
```

Expected: `<code path="bundle.js" order="1"/>`

- [ ] **Step 3: Verify no restricted patterns**

```bash
grep -c 'fluentui\|platform-library' out/controls/bundle.js
```

Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add RelatedPartiesGraph/
git commit -m "build(related-parties-graph): production build verified"
```

---

### Task 13: Solution integration

**Files:**
- Create: `Solution/manual-pack/Controls/Syg.RelatedPartiesGraph/`
- Modify: `Solution/manual-pack/solution.xml`
- Modify: `Solution/manual-pack/customizations.xml`

- [ ] **Step 1: Copy build output**

```bash
mkdir -p Solution/manual-pack/Controls/Syg.RelatedPartiesGraph
cp RelatedPartiesGraph/out/controls/bundle.js Solution/manual-pack/Controls/Syg.RelatedPartiesGraph/
cp RelatedPartiesGraph/out/controls/ControlManifest.xml Solution/manual-pack/Controls/Syg.RelatedPartiesGraph/
```

- [ ] **Step 2: Add to solution.xml**

Add inside `<RootComponents>`:
```xml
      <RootComponent type="66" schemaName="Syg.RelatedPartiesGraph" behavior="0" />
```

- [ ] **Step 3: Add to customizations.xml**

Add inside `<CustomControls>`:
```xml
    <CustomControl>
      <Name>Syg.RelatedPartiesGraph</Name>
      <FileName>/Controls/Syg.RelatedPartiesGraph/ControlManifest.xml</FileName>
    </CustomControl>
```

- [ ] **Step 4: Bump version, verify counts, build zip**

Bump `<Version>` in solution.xml. Verify RootComponent count, CustomControl count, and folder count all match. Build zip:

```bash
cd Solution/manual-pack
zip -r ../bin/Release/SygnumPCFComponents_<version>.zip . -x "*.DS_Store"
```

- [ ] **Step 5: Also create standalone solution**

Create `Solution/rpg-pack/` with the same pattern as `rtm-pack` — separate solution `SygnumRelatedPartiesGraph` v1.0.0 containing only this control.

- [ ] **Step 6: Commit**

```bash
git add Solution/ RelatedPartiesGraph/
git commit -m "feat(solution): add RelatedPartiesGraph + standalone solution"
```

---

## Self-Review

| Spec requirement | Task |
|---|---|
| Cytoscape.js with concentric layout | Task 7 (layout), Task 10 (GraphCanvas) |
| Rounded rectangle nodes with D365 card-style colours | Task 3 (styles), Task 10 (GraphCanvas) |
| Major/Minor/No impact colouring | Task 2 (constants), Task 3 (cyNodeStyle), Task 10 (Cytoscape styles) |
| Centre profile as solid blue node | Task 2 (CENTRE_COLOR), Task 10 |
| Drillable badge (double border) | Task 10 (isDrillable style) |
| PEP badge | Task 9 (SidePanel), Task 10 (node data) |
| Level 0-1 from bound dataset | Task 6 (graphModel), Task 11 (buildLevel1FromDataset) |
| Level 2-3 via WebAPI | Task 5 (webapi), Task 11 (handleDrill) |
| Cross-profile drillability check | Task 5 (findKycProfileForCustomer, batchResolveDrillability) |
| Depth cap at 3 levels | Task 2 (MAX_DEPTH), Task 9 (isDepthCapped), Task 11 (handleDrill) |
| Cycle protection | Task 11 (expandedProfiles check in handleDrill) |
| Single-click select + side panel | Task 9 (SidePanel), Task 10 (tap handler) |
| Double-click drill | Task 10 (double-tap handler), Task 11 (handleDrill) |
| Cmd/Ctrl+click open record | Task 4 (navigation), Task 10 (ctrl-click handler) |
| Breadcrumb with collapse-back | Task 8 (Breadcrumb), Task 11 (handleBreadcrumbNav) |
| Empty state | Task 8 (EmptyState) |
| Legend | Task 8 (Legend) |
| Side panel with expand/open actions | Task 9 (SidePanel) |
| context.webAPI with WebAPI feature | Task 1 (manifest), Task 5 (webapi) |
| No Fluent UI, no emojis, production build | Task 12 (verification) |
| Standalone solution | Task 13 |

**Placeholder scan:** No TBD, TODO, or incomplete sections.

**Type consistency:** `NodeData`, `EdgeData`, `ProfileBreadcrumb`, `GraphState`, `RelatedPartyRecord` defined in Task 2, used consistently in Tasks 5, 6, 9, 10, 11. `IMPACT_COLORS`, `CENTRE_COLOR`, `MAX_DEPTH` defined in Task 2, referenced in Tasks 3, 9, 10, 11. Function signatures in webapi.ts (Task 5) match calls in index.ts (Task 11).
