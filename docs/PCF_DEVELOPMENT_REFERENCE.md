# PCF Development Reference -- Lessons from SygnumPCFComponents

## Project Overview

We built 6 PCF (PowerApps Component Framework) controls for Dynamics 365 model-driven apps, packaged in a single managed solution called `SygnumPCFComponents`. Publisher prefix: `syg`.

### Controls Built

| Control | Type | Purpose |
|---------|------|---------|
| EddFindingsViewer | Dataset | EDD Finding cards with rich text, mitigation summary |
| CompactSubgrid | Dataset | Generic condensed subgrid with auto-detected expandable detail panels |
| AssociationCards | Dataset | N:N chips/cards for many-to-many relationship subgrids |
| WealthAllocationControl | Field-bound | Visual wealth distribution across 7 asset classes with sliders |
| ComplianceConditionScheduler | Field-bound | Guided wizard for compliance condition scheduling |
| KycDraftTakeover | Field-bound | AI research output review and takeover into form fields |

---

## Hard Constraints (Learned Through Failures)

### No Fluent UI v9
Do NOT use @fluentui/react-components. It causes D365 runtime crashes. We removed it after debugging a blank screen on load. Use inline styles only -- React style objects with React.CSSProperties. This is non-negotiable.

### No Platform Libraries on macOS
pcf-scripts on macOS cannot resolve platform libraries. Never reference Microsoft.PowerApps.MSBuild.Pcf at build time via NuGet. Use the npm-based build: pcf-scripts build.

### Production Build Mode
Always use `pcf-scripts build --buildMode production` in package.json. Development mode uses webpack devtool features which the D365 Solution Checker flags as critical violations. Production mode eliminates all restricted calls and minifies the bundle.

### No Emojis
Never use emojis or emoticons in code, UI, mockups, or icons. Use inline SVG icons exclusively. This applies to empty states, buttons, badges -- everywhere.

### Manual Solution Packaging
We use a manual zip packaging approach (not pac solution or msbuild) because the .NET-based solution build doesn't work reliably on macOS. Structure:

```
Solution/manual-pack/
  solution.xml
  customizations.xml
  [Content_Types].xml
  Controls/
    Syg.ControlName/
      bundle.js
      ControlManifest.xml
      strings/
```

Package with: `zip -r ../bin/Release/SygnumPCFComponents.zip solution.xml customizations.xml '[Content_Types].xml' Controls/`

---

## Architecture Patterns

### React 18 with createRoot
All controls use React 18 createRoot API (not the deprecated ReactDOM.render). The PCF index.ts creates the root in init() and renders in updateView():

```typescript
public init(context, notifyOutputChanged, state, container): void {
  this.root = createRoot(container);
  context.mode.trackContainerResize(true);
}
```

### Field-Bound Controls -- updateView Loop Prevention
Critical pattern. When a field-bound control calls notifyOutputChanged(), D365 immediately calls updateView() again. If updateView() reads from context.parameters and overwrites local state, it creates an infinite loop that resets user input.

Solution -- pendingOutput flag:
```typescript
private pendingOutput = false;
private initialized = false;

public updateView(context): void {
  if (this.pendingOutput) {
    this.pendingOutput = false;
    this.renderReact();
    return;
  }
}

private handleChange(): void {
  this.pendingOutput = true;
  this.notifyOutputChanged();
  this.renderReact();
}
```

For controls with multiple bound fields (WealthAllocation has 8, KycDraftTakeover has 9), also compare values on subsequent updateView calls to distinguish between echo calls and genuine external changes.

### Dataset Controls -- Pagination
Default page size is often very small (4-25 records). For controls that should show all records (like AssociationCards), call dataset.paging.setPageSize(250) in init() and auto-load all pages:

```typescript
React.useEffect(() => {
  if (!dataset.loading && dataset.paging?.hasNextPage) {
    dataset.paging.loadNextPage();
  }
}, [dataset.loading, dataset.paging]);
```

### Dataset Controls -- Sorting
Sort via dataset.sorting API, then call dataset.refresh():

```typescript
dataset.sorting = [{ name: columnName, sortDirection: 0 }];
dataset.refresh();
```

### Navigation -- Multi-Level Fallback
For opening D365 records from within PCF controls:

```typescript
// 1. Xrm.Navigation (most reliable in D365)
const xrm = (window as any).Xrm;
if (xrm?.Navigation?.openForm) {
  xrm.Navigation.openForm({ entityName, entityId });
  return;
}
// 2. PCF context.navigation (fallback)
context.navigation.openForm({ entityName, entityId });
// 3. URL construction (last resort)
const url = new URL('/main.aspx', window.location.origin);
url.searchParams.set('etn', entityName);
url.searchParams.set('id', entityId);
window.open(url.toString(), '_blank');
```

Always validate GUIDs before navigation with regex.

### N:N Associate/Disassociate via OData
PCF doesn't have a built-in associate/disassociate API. Use raw fetch() to the OData $ref endpoint:

```typescript
// Associate
fetch(`${baseUrl}/api/data/v9.2/${parentSet}(${parentId})/${relationshipName}/$ref`, {
  method: 'POST',
  body: JSON.stringify({ '@odata.id': `${baseUrl}/api/data/v9.2/${childSet}(${childId})` }),
  headers: { 'Content-Type': 'application/json', 'OData-Version': '4.0' },
  credentials: 'include',
});

// Disassociate
fetch(`${baseUrl}/api/data/v9.2/${parentSet}(${parentId})/${relationshipName}(${childId})/$ref`, {
  method: 'DELETE',
  credentials: 'include',
});
```

Resolve entity set names via Xrm.Utility.getEntityMetadata with in-memory cache. Fallback: query OData EntityDefinitions endpoint. Last resort: simple pluralization heuristic.

### Lookup Picker
Open the D365 native lookup dialog via Xrm.Utility.lookupObjects:

```typescript
const result = await Xrm.Utility.lookupObjects({
  allowMultiSelect: true,
  defaultEntityType: entityName,
  entityTypes: [entityName],
});
```

Fallback to context.utils.lookupObjects if Xrm is unavailable.

### Parent Context Resolution
For controls that need to know which record the form is showing:

```typescript
// Source 1: PCF context
const info = (context.mode as any).contextInfo;

// Source 2: Xrm.Page (fallback)
const entity = Xrm?.Page?.data?.entity;
entity.getEntityName(); entity.getId();
```

---

## Styling Patterns

### Design Language
- Font: 'Segoe UI', 'Helvetica Neue', sans-serif
- Colors: #323130 (primary text), #605E5C (secondary), #A19F9D (muted), #0078D4 (brand/interactive), #107C10 (success green), #A4262C (error red), #835B00 (amber/warning)
- Borders: #edebe9 (standard), #f3f2f1 (subtle), #E1DFDD (medium)
- Backgrounds: #fff (cards), #F3F2F1 (input fields), #FAFAF9 (whisper), #FAFAFA (section bg), #EFF6FC (brand light)

### D365 Input Field Style
Grey background with blue underline on focus (NOT white background with box border):
```typescript
{
  background: '#F3F2F1',
  border: 'none',
  borderBottom: '2px solid transparent',
  borderRadius: '4px',
  padding: '6px 10px',
  // On focus: borderBottom: '2px solid #0078D4'
}
```

### Number Formatting
Swiss format with apostrophe separator: 1'000'000 (not 1,000,000).

### Date Formatting
Swiss-German locale: DD.MM.YYYY via toLocaleDateString('de-CH').

### CSS Injection for Slider Styling
Native input type="range" requires CSS pseudo-element selectors that can't be set via inline styles. Inject via document.head.appendChild(style) with a module-level guard flag. Use !important on all rules to override D365's own stylesheets that load after the component.

---

## OptionSet Handling
D365 OptionSet values are integers, not 0-indexed. Always confirm actual values in the Dataverse environment. Typical pattern:
```typescript
export const FREQUENCY_MAP: Record<number, string> = { 1: 'One-off', 2: 'Recurring' };
export const FREQUENCY_REVERSE: Record<string, number> = { 'One-off': 1, 'Recurring': 2 };
```

Status reason (statuscode) often uses large integers like 100000002 for custom values.

---

## Security Checklist (from 6 CISO Reviews)

- No restricted function calls in bundle (production build mode)
- No console.log in production code
- No unsafe HTML rendering without DOMPurify sanitization
- No hardcoded secrets
- GUID validation before all navigation
- URL validation via new URL() constructor -- only allow http: and https: protocols
- isFinite() check on all numeric inputs (not just !isNaN -- rejects Infinity)
- credentials: 'include' on all OData fetch calls
- Confirmation dialogs via Xrm.Navigation.openConfirmDialog before destructive actions
- Response status checking on OData calls (resp.ok || resp.status === 204)
- DOMPurify for any HTML rendering (conservative allowlist: no script, iframe, style, event handlers)

---

## Common Gotchas

1. solution.xml corruption -- The manual zip approach can produce truncated XML if editors add trailing characters. Always verify the closing tag.
2. Managed vs Unmanaged -- Managed=1 in solution.xml means managed. Cannot import managed over unmanaged -- delete old solution first.
3. Publisher must exist -- The target environment must have a publisher matching the solution publisher before importing.
4. D365 caches aggressively -- After importing a new solution version, hard-refresh the browser (Ctrl+Shift+R) to pick up the new bundle.
5. Slider max attribute -- Never mutate the HTML max attribute on input type="range" to enforce headroom. This disconnects the thumb from the track. All clamping must happen in JS.
6. Dataset refresh after association -- Call dataset.paging.reset() + dataset.refresh() + a 500ms delayed second dataset.refresh() to reliably reload after OData associate/disassociate.
7. D365 overrides slider CSS -- D365 injects its own input[type="range"] styles that override component styles after initial render. Use !important on all slider CSS rules.
8. OptionSet values are not 0-indexed -- Always check actual integer values in Dataverse. Custom OptionSets typically start at 1, and status reason can use values like 100000002.
9. Lookup column data format -- D365 returns lookup values in a nested format {etn, id: {guid: "..."}, name}. Handle both plain string IDs and the nested {guid} object pattern.
10. PCF dataset page size -- Default subgrid page size can be as low as 4 records. Call setPageSize(250) in init() for controls that need all records visible.

---

## Project Structure Convention

Each control is an independent directory at the project root with its own package.json, node_modules, and build output:

```
EDDPCFControll/
  EddFindingsViewer/
  CompactSubgrid/
  AssociationCards/
  WealthAllocationControl/
  ComplianceConditionScheduler/
  KycDraftTakeover/
  Solution/manual-pack/
  docs/superpowers/specs/
  docs/superpowers/plans/
```

Each control follows the same internal structure:
```
ControlName/
  index.ts
  ControlManifest.Input.xml
  ControlName.pcfproj
  package.json
  tsconfig.json
  types.ts
  components/
  utils/
  styles/tokens.ts
```

### Dependencies (same for all controls)
```json
{
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

Exception: EddFindingsViewer also depends on dompurify for HTML sanitization of rich text fields.

### tsconfig.json (same for all controls)
```json
{
  "extends": "./node_modules/pcf-scripts/tsconfig_base.json",
  "compilerOptions": {
    "outDir": "out",
    "strict": true,
    "jsx": "react",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## Build and Package Workflow

```bash
# Build a single control
cd ControlName && npm run build

# Copy to solution packaging
cp out/controls/bundle.js ../Solution/manual-pack/Controls/Syg.ControlName/
cp out/controls/ControlManifest.xml ../Solution/manual-pack/Controls/Syg.ControlName/

# Package the solution
cd ../Solution/manual-pack
zip -r ../bin/Release/SygnumPCFComponents.zip \
  solution.xml customizations.xml '[Content_Types].xml' Controls/
```

When adding a new control to the solution:
1. Add RootComponent type="66" schemaName="Syg.NewControl" behavior="0" to solution.xml
2. Add CustomControl entry with FileName to customizations.xml
3. Bump Version in solution.xml

---

This document reflects patterns validated through building, deploying, debugging, and security-reviewing 6 production PCF controls in a D365 model-driven app environment (FINMA/Swiss AMLA compliance context).
