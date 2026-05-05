// Async resolver for the bar title. The PCF dataset APIs (getTitle / title /
// context.mode.label) are unreliable on subgrid placements — they often return
// undefined, leaving us with the literal fallback "Records". This utility
// reaches further up the stack:
//   1. Saved-query name (the view bound to the subgrid) via WebAPI
//   2. Entity DisplayCollectionName via Xrm.Utility.getEntityMetadata
// Results are cached at the module level by viewId / entityName so multiple
// subgrid instances on the same form don't repeat the same calls.
//
// resolveHostControlLabel (synchronous, separate function below) is the most
// preferred source — it returns the form-designer "Beschriftung" even when
// the form has "Hide label" enabled, because Xrm.Page.getControl().getLabel()
// reads the configured label, not the rendered one.

const titleCache = new Map<string, string>();

interface XrmFormControl {
  getLabel?: () => string;
  getControlType?: () => string;
}

interface XrmPageLike {
  Page?: {
    getControl?: (name: string) => XrmFormControl | null;
  };
}

// Walk up the DOM from the PCF's rendered container, looking for an ancestor
// with a `data-id` that resolves to a form control via Xrm.Page.getControl.
// The first matching control's label wins. This survives "Hide label" being
// checked on the form designer (which suppresses context.mode.label) because
// getLabel() returns the *configured* caption, not the rendered one.
export function resolveHostControlLabel(rootElement: HTMLElement | null): string | null {
  if (!rootElement) return null;

  const xrm = (window as unknown as { Xrm?: XrmPageLike }).Xrm;
  if (!xrm?.Page?.getControl) return null;

  // Walk up the DOM. The host subgrid's name lives on `data-control-name` in
  // modern UCI; intermediate wrappers may carry an unrelated `data-id` (e.g.
  // "DataSetHostContainer", "dataSetRoot_..."). Try both attributes per node
  // and keep walking on misses — the first ancestor whose name resolves to a
  // control with a non-empty label wins.
  let el: HTMLElement | null = rootElement;
  let depth = 0;
  while (el && depth < 30) {
    const candidates = [
      el.getAttribute('data-control-name'),
      el.getAttribute('data-id'),
    ].filter((v): v is string => typeof v === 'string' && v.length > 0);

    for (const name of candidates) {
      try {
        const control = xrm.Page.getControl(name);
        const label = control?.getLabel?.();
        if (label && typeof label === 'string' && label.length > 0) return label;
      } catch { /* try next */ }
    }
    el = el.parentElement;
    depth += 1;
  }
  return null;
}

interface DatasetLike {
  getTitle?: () => string | undefined;
  title?: string;
  getViewId?: () => string;
  getTargetEntityType?: () => string;
}

interface XrmLike {
  Utility?: {
    getEntityMetadata?: (entityName: string, attributes: string[]) => Promise<{
      DisplayCollectionName?: string;
      DisplayName?: string;
      EntitySetName?: string;
    }>;
  };
}

export async function resolveDatasetTitle(
  webAPI: ComponentFramework.WebApi,
  dataset: ComponentFramework.PropertyTypes.DataSet
): Promise<string | null> {
  const ds = dataset as unknown as DatasetLike;

  // Synchronous PCF sources first — usually empty on subgrid placements but
  // cheap to check and avoids a round-trip when they do work.
  if (typeof ds.getTitle === 'function') {
    const t = ds.getTitle();
    if (t && typeof t === 'string') return t;
  }
  if (ds.title && typeof ds.title === 'string') return ds.title;

  const viewId = typeof ds.getViewId === 'function' ? ds.getViewId() : '';
  const entityName = typeof ds.getTargetEntityType === 'function' ? ds.getTargetEntityType() : '';
  const cacheKey = `${viewId}|${entityName}`;
  const cached = titleCache.get(cacheKey);
  if (cached) return cached;

  // Saved-query name — most descriptive (e.g. "Active Beneficial Owners").
  if (viewId && /^[0-9a-f-]{32,38}$/i.test(viewId)) {
    try {
      const result = await webAPI.retrieveRecord('savedquery', viewId, '?$select=name');
      const name = result['name'];
      if (typeof name === 'string' && name.length > 0) {
        titleCache.set(cacheKey, name);
        return name;
      }
    } catch { /* fall through to entity metadata */ }
  }

  // Entity collection name — e.g. "Related Parties" — broader fallback.
  if (entityName) {
    try {
      const xrm = (window as unknown as { Xrm?: XrmLike }).Xrm;
      if (xrm?.Utility?.getEntityMetadata) {
        const meta = await xrm.Utility.getEntityMetadata(entityName, []);
        const label = meta?.DisplayCollectionName ?? meta?.DisplayName;
        if (label && typeof label === 'string') {
          titleCache.set(cacheKey, label);
          return label;
        }
      }
    } catch { /* ignore */ }
  }

  return null;
}
