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

function getXrm(): XrmGlobal | undefined {
  return (window as unknown as { Xrm?: XrmGlobal }).Xrm;
}

async function confirmDialog(title: string, text: string): Promise<boolean> {
  const xrm = getXrm();
  if (xrm?.Navigation?.openConfirmDialog) {
    const result = await xrm.Navigation.openConfirmDialog({ title, text });
    return result.confirmed;
  }
  return true;
}

const entitySetCache = new Map<string, string>();

async function getEntitySetName(entityName: string): Promise<string | null> {
  if (!entityName) return null;
  const cached = entitySetCache.get(entityName);
  if (cached) return cached;

  const xrm = getXrm();
  if (xrm?.Utility?.getEntityMetadata) {
    try {
      const meta = await xrm.Utility.getEntityMetadata(entityName, ['EntitySetName']);
      if (meta?.EntitySetName) {
        entitySetCache.set(entityName, meta.EntitySetName);
        return meta.EntitySetName;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function getClientUrl(): string {
  const clientUrl = getXrm()?.Utility?.getGlobalContext?.()?.getClientUrl?.();
  return clientUrl ?? window.location.origin;
}

export async function deleteRecords(
  context: ComponentFramework.Context<unknown>,
  entityName: string,
  recordIds: string[],
  onComplete: () => void
): Promise<void> {
  const count = recordIds.length;
  const confirmText = count === 1
    ? 'Are you sure you want to delete this record?'
    : `Are you sure you want to delete ${count} records?`;

  const confirmed = await confirmDialog('Confirm Delete', confirmText);
  if (!confirmed) return;

  const webApi = (context as unknown as { webAPI?: ComponentFramework.WebApi }).webAPI;
  if (!webApi) return;

  for (const id of recordIds) {
    try {
      await webApi.deleteRecord(entityName, id.replace(/[{}]/g, ''));
    } catch { /* Skip failed deletes */ }
  }

  onComplete();
}

export async function disassociateRecords(
  parentEntityName: string,
  parentId: string,
  relationshipName: string,
  recordIds: string[],
  onComplete: () => void
): Promise<void> {
  if (!parentEntityName || !parentId || !relationshipName) return;

  const count = recordIds.length;
  const confirmText = count === 1
    ? 'Are you sure you want to remove this record from the list?'
    : `Are you sure you want to remove ${count} records from the list?`;

  const confirmed = await confirmDialog('Confirm Remove', confirmText);
  if (!confirmed) return;

  const parentSet = await getEntitySetName(parentEntityName);
  if (!parentSet) return;

  const baseUrl = getClientUrl();
  const cleanParentId = parentId.replace(/[{}]/g, '');

  for (const id of recordIds) {
    const cleanChildId = id.replace(/[{}]/g, '');
    try {
      await fetch(
        `${baseUrl}/api/data/v9.2/${parentSet}(${cleanParentId})/${relationshipName}(${cleanChildId})/$ref`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Accept': 'application/json',
          },
        }
      );
    } catch { /* Skip failed disassociates */ }
  }

  onComplete();
}

export async function associateRecords(
  parentEntityName: string,
  parentId: string,
  relationshipName: string,
  childEntityName: string,
  childIds: string[],
  onComplete: () => void
): Promise<void> {
  if (!parentEntityName || !parentId || !relationshipName || !childEntityName) return;

  const parentSet = await getEntitySetName(parentEntityName);
  const childSet = await getEntitySetName(childEntityName);
  if (!parentSet || !childSet) return;

  const baseUrl = getClientUrl();
  const cleanParentId = parentId.replace(/[{}]/g, '');

  for (const id of childIds) {
    const cleanChildId = id.replace(/[{}]/g, '');
    try {
      await fetch(
        `${baseUrl}/api/data/v9.2/${parentSet}(${cleanParentId})/${relationshipName}/$ref`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            '@odata.id': `${baseUrl}/api/data/v9.2/${childSet}(${cleanChildId})`,
          }),
        }
      );
    } catch { /* Skip failed associates */ }
  }

  onComplete();
}

export async function openLookupPicker(
  context: ComponentFramework.Context<unknown>,
  entityName: string
): Promise<Array<{ id: string; entityType: string; name?: string }> | null> {
  const utils = (context as unknown as { utils?: ComponentFramework.Utility }).utils;
  if (!utils?.lookupObjects) return null;

  try {
    const options = {
      allowMultiSelect: true,
      defaultEntityType: entityName,
      entityTypes: [entityName],
    } as unknown as ComponentFramework.UtilityApi.LookupOptions;

    const result = await utils.lookupObjects(options);
    if (!result || result.length === 0) return null;
    return result.map((r) => ({ id: r.id, entityType: r.entityType, name: r.name }));
  } catch {
    return null;
  }
}
