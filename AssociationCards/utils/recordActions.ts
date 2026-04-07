import { confirmDialog, getEntitySetName, getClientUrl } from './xrmHelpers';

export async function disassociateRecord(
  parentEntityName: string,
  parentId: string,
  relationshipName: string,
  childId: string,
  onComplete: () => void
): Promise<void> {
  if (!parentEntityName || !parentId || !relationshipName || !childId) return;

  const confirmed = await confirmDialog(
    'Confirm Remove',
    'Are you sure you want to remove this record from the list?'
  );
  if (!confirmed) return;

  const parentSet = await getEntitySetName(parentEntityName);
  if (!parentSet) return;

  const baseUrl = getClientUrl();
  const cleanParentId = parentId.replace(/[{}]/g, '');
  const cleanChildId = childId.replace(/[{}]/g, '');

  try {
    const resp = await fetch(
      `${baseUrl}/api/data/v9.2/${parentSet}(${cleanParentId})/${relationshipName}(${cleanChildId})/$ref`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', 'Accept': 'application/json' },
      }
    );
    if (resp.ok || resp.status === 204) onComplete();
  } catch { /* Disassociate failed */ }
}

export async function associateRecords(
  parentEntityName: string,
  parentId: string,
  relationshipName: string,
  childEntityName: string,
  childIds: string[],
  onComplete: () => void
): Promise<void> {
  if (!parentEntityName || !parentId || !relationshipName || !childEntityName || childIds.length === 0) return;

  const parentSet = await getEntitySetName(parentEntityName);
  const childSet = await getEntitySetName(childEntityName);
  if (!parentSet || !childSet) return;

  const baseUrl = getClientUrl();
  const cleanParentId = parentId.replace(/[{}]/g, '');

  let anySuccess = false;
  for (const id of childIds) {
    const cleanChildId = id.replace(/[{}]/g, '');
    try {
      const resp = await fetch(
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
      if (resp.ok || resp.status === 204) anySuccess = true;
    } catch { /* Associate failed */ }
  }

  if (anySuccess) onComplete();
}

export async function openLookupPicker(
  context: ComponentFramework.Context<unknown>,
  entityName: string
): Promise<Array<{ id: string; entityType: string; name?: string }> | null> {
  // Try Xrm.Utility.lookupObjects first (most reliable in D365)
  const xrm = (window as unknown as {
    Xrm?: {
      Utility?: {
        lookupObjects: (options: unknown) => Promise<Array<{ id: string; entityType: string; name?: string }>>;
      };
    };
  }).Xrm;

  const lookupOptions = {
    allowMultiSelect: true,
    defaultEntityType: entityName,
    entityTypes: [entityName],
  };

  if (xrm?.Utility?.lookupObjects) {
    try {
      const result = await xrm.Utility.lookupObjects(lookupOptions);
      if (!result || result.length === 0) return null;
      return result.map((r) => ({ id: r.id, entityType: r.entityType, name: r.name }));
    } catch {
      // Fall through to PCF context
    }
  }

  // Fallback to PCF context.utils
  const utils = (context as unknown as { utils?: ComponentFramework.Utility }).utils;
  if (!utils?.lookupObjects) return null;

  try {
    const result = await utils.lookupObjects(lookupOptions as unknown as ComponentFramework.UtilityApi.LookupOptions);
    if (!result || result.length === 0) return null;
    return result.map((r) => ({ id: r.id, entityType: r.entityType, name: r.name }));
  } catch {
    return null;
  }
}
