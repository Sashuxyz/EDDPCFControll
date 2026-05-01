# RelatedPartiesGraph v1 — Design Spec

## Goal

Interactive radial relationship graph on the KYC Profile form that visualises related parties (Beneficial Owners, Controlling Persons, PoA, Subsidiaries, Trust roles, etc.) as nodes around the centre KYC profile. Users can drill into a related party's own KYC profile to explore its network, up to 3 levels deep.

Replaces the read-only subgrid experience with a navigable visual network that surfaces cross-profile relationships.

## Scope — v1

- Radial graph with concentric ring layout (Cytoscape.js)
- Rounded rectangle nodes with D365 card-style left-border accent colours
- Colour by impact: Major (blue), Minor (amber), No impact (gray), Centre/drilled profile (solid blue)
- Drill-down up to 3 levels via double-click on drillable nodes
- Side panel with details on selected node
- Breadcrumb navigation to collapse back to any depth
- Cmd/Ctrl+click opens underlying record in new tab
- PEP badge on flagged nodes
- Read-only visualisation (no editing of related parties)

### Out of scope for v1

- Filtering by party type, impact, or PEP status
- Search across all related parties
- Export as PNG/SVG
- Mobile/responsive layout below 600px
- Editing or creating related parties from within the graph

## Data Model

### Entities

| Entity | Logical name | Role |
|---|---|---|
| KYC Profile | `syg_kycprofile` | Centre of graph |
| Related Client Party | `syg_relatedclientparties` | Junction record (bound dataset) |
| KYC Property | `syg_kycproperty` | Lookup for party type, carries Score and Impact |
| Account | `account` | One side of customer lookup on junction |
| Contact | `contact` | Other side of customer lookup on junction |

### Key fields on `syg_relatedclientparties`

| Field | Type | Purpose |
|---|---|---|
| `syg_kycprofileid` | Lookup → `syg_kycprofile` | Parent profile |
| `syg_relatedpartyid` | Customer → `account` + `contact` | The related party |
| `syg_relatedpartytypeid` | Lookup → `syg_kycproperty` | Edge label, node colour |
| `syg_riskscore` | Whole number | Side panel display |
| `syg_pep` | TwoOptions | PEP badge on node |
| `syg_peplevelid` | Lookup | Side panel display |
| `statecode` | State | Filter: only `0` (Active) rendered |

### Customer lookup on `syg_kycprofile`

`syg_clientid` — polymorphic Customer field resolving to both `account` and `contact`. Used to determine drillability: does the related party's underlying account/contact have its own KYC profile?

### KYC Property values (22 records)

Impact determines node colour:
- **Major** (blue border): Beneficial Owner, Controlling Person (all types), Settlor Active/Deceased, Founder, Associated Company, Holding Company
- **Minor** (amber border): PoA, Trustee, Protector, Beneficiary (Fixed/Class), Director, Close Family, Close Business Associate
- **No** (gray border): Board Member, Subsidiary, Person Opening Account
- **null** → fallback to gray

## Traversal

### Level 0-1: Bound dataset

Level 0 is the centre profile. Level 1 comes from the bound dataset (`syg_relatedclientparties` subgrid) — no additional WebAPI call needed.

### Level 2-3: WebAPI fetch

```
context.webAPI.retrieveMultipleRecords('syg_relatedclientparties',
  '?$filter=_syg_kycprofileid_value eq {profileId} and statecode eq 0' +
  '&$select=syg_relatedclientpartiesid,_syg_relatedpartyid_value,syg_pep,syg_riskscore' +
  '&$expand=syg_relatedpartytypeid($select=syg_name,syg_propertykey,syg_score,syg_impact)')
```

### Cross-profile resolution (drillability)

```
context.webAPI.retrieveMultipleRecords('syg_kycprofile',
  '?$filter=(_syg_clientid_value eq {accountOrContactId}) and statecode eq 0' +
  '&$select=syg_kycprofileid,syg_name&$top=1')
```

Results cached in `drillCache: Map<string, string | null>`. Batch resolved via `Promise.all`, max 10 concurrent.

### Depth and cycle protection

- Max depth: 3 levels from centre
- Level 3 nodes render without drill affordance, show "depth limit" hint in side panel
- `expandedProfiles` array tracks expansion chain — already-visited profiles not refetched
- `nodeCache` keyed by account/contact GUID deduplicates cross-profile appearances

## Layout

### Concentric rings (Cytoscape cose-bilkent)

- Centre node at origin
- Level 1 on first ring, level 2 on second, level 3 on third
- Node sizes scale with level: centre largest, level 3 smallest

### Zoom and pan

- Mouse wheel to zoom
- Drag to pan
- No UI zoom controls

## Node Style

### Rounded rectangle cards

White background with left-border accent, name + role visible on node.

| Impact | Left border | Role text colour |
|---|---|---|
| Major | #0078D4 (blue) | #0078D4 |
| Minor | #835B00 (amber) | #835B00 |
| No / null | #A19F9D (gray) | #A19F9D |
| Centre / drilled profile | Solid fill #0078D4, white text | — |

### Badges

- **Drillable:** blue circle `+` badge (top-right), solid #0078D4 background, white text
- **PEP:** red badge (#A4262C background, white text), bottom or inline with name

### Edges

Thin gray lines (#E1DFDD) from parent to child. No edge labels on the graph — role shown on the node itself and in the side panel.

## Interactions

| Action | Result |
|---|---|
| Single-click node | Select; populate side panel |
| Double-click drillable node | Expand: fetch next level, re-layout |
| Cmd/Ctrl+click node | Open underlying record in new tab (Xrm.Navigation.openForm) |
| Click breadcrumb segment | Collapse back to that depth |
| Click depth-capped node | Select only; "depth limit" hint in side panel |

## Side Panel

Persistent panel below the canvas. Shown when a node is selected.

Fields:
- Display name (account.name or contact.fullname)
- Role (related party type name)
- Risk score (from junction)
- PEP (Yes/No, with PEP level if set)
- Own KYC profile (Yes — drillable / No)

Actions:
- **Expand** (if drillable and below depth cap)
- **Open Record** (opens in new tab)

## Breadcrumb

Top of canvas, single line: `Centre Profile > Drilled Profile 1 > Drilled Profile 2`. Each segment clickable to collapse back.

## Empty State

When bound dataset has zero active records: centred message "No active related parties for this KYC profile" with inline SVG icon.

## Module Structure

```
RelatedPartiesGraph/
  index.ts                        PCF lifecycle
  ControlManifest.Input.xml       dataset + WebAPI feature
  RelatedPartiesGraph.pcfproj     project file
  package.json                    react 18, cytoscape, cose-bilkent
  tsconfig.json                   extends pcf-scripts base
  types.ts                        NodeData, GraphState, RelatedPartyRecord
  components/
    GraphCanvas.tsx                Cytoscape mount, node/edge rendering
    SidePanel.tsx                  Selected node details + actions
    Breadcrumb.tsx                 Expansion chain navigation
    Legend.tsx                     Impact colour legend
    EmptyState.tsx                 No data message
  utils/
    webapi.ts                     fetchPartiesForProfile, findKycProfileForCustomer, batchResolveDrillability
    graphModel.ts                 Dataset/API records → Cytoscape elements
    layout.ts                     Concentric layout configuration
    navigation.ts                 Xrm.Navigation.openForm wrapper
  styles/
    tokens.ts                     D365 colours, node styles, panel styles
```

## Manifest

```xml
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
```

## Dependencies

- `react` ^18.2.0
- `react-dom` ^18.2.0
- `cytoscape` ^3.30.0
- `cytoscape-cose-bilkent` ^4.1.0
- `@types/cytoscape` ^3.21.0 (dev)

## State Model

```typescript
type NodeData = {
  id: string;                       // accountId or contactId
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
};

type GraphState = {
  centreProfileId: string;
  expandedProfiles: { id: string; name: string }[];
  nodes: Map<string, NodeData>;
  edges: { source: string; target: string; label: string; level: 1|2|3 }[];
  selectedNodeId: string | null;
  drillCache: Map<string, string | null>;
  loadingProfiles: Set<string>;
};
```

## Security

- All WebAPI calls via `context.webAPI` (security-trimmed by D365 RBAC)
- GUID validation before `Xrm.Navigation.openForm`
- No HTML rendering — all text via Cytoscape labels or React text nodes
- No `console.log` in production
- Production build mode enforced
