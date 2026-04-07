interface XrmConfirmDialog {
  openConfirmDialog: (options: { title: string; text: string }) => Promise<{ confirmed: boolean }>;
}

interface XrmUtility {
  getEntityMetadata?: (entityName: string, attributes: string[]) => Promise<{ EntitySetName: string }>;
  getGlobalContext?: () => { getClientUrl?: () => string };
}

interface XrmGlobal {
  Navigation?: XrmConfirmDialog;
  Utility?: XrmUtility;
}

export function getXrm(): XrmGlobal | undefined {
  return (window as unknown as { Xrm?: XrmGlobal }).Xrm;
}

export async function confirmDialog(title: string, text: string): Promise<boolean> {
  const xrm = getXrm();
  if (xrm?.Navigation?.openConfirmDialog) {
    const result = await xrm.Navigation.openConfirmDialog({ title, text });
    return result.confirmed;
  }
  return true;
}

const entitySetCache = new Map<string, string>();

export async function getEntitySetName(entityName: string): Promise<string | null> {
  if (!entityName) return null;
  const cached = entitySetCache.get(entityName);
  if (cached) return cached;

  // Source 1: Xrm.Utility.getEntityMetadata
  const xrm = getXrm();
  if (xrm?.Utility?.getEntityMetadata) {
    try {
      const meta = await xrm.Utility.getEntityMetadata(entityName, ['EntitySetName']);
      if (meta?.EntitySetName) {
        entitySetCache.set(entityName, meta.EntitySetName);
        return meta.EntitySetName;
      }
    } catch {
      // Fall through to OData lookup
    }
  }

  // Source 2: Query OData EntityDefinitions
  try {
    const baseUrl = getClientUrl();
    const resp = await fetch(
      `${baseUrl}/api/data/v9.2/EntityDefinitions(LogicalName='${entityName}')?$select=EntitySetName`,
      {
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'OData-Version': '4.0' },
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      if (data?.EntitySetName) {
        entitySetCache.set(entityName, data.EntitySetName);
        return data.EntitySetName;
      }
    }
  } catch {
    // Fall through to pluralization heuristic
  }

  // Source 3: Simple pluralization heuristic (last resort)
  const guess = entityName.endsWith('s') ? entityName + 'es' : entityName + 's';
  entitySetCache.set(entityName, guess);
  return guess;
}

export function getClientUrl(): string {
  const clientUrl = getXrm()?.Utility?.getGlobalContext?.()?.getClientUrl?.();
  return clientUrl ?? window.location.origin;
}
