const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getXrm(): { Navigation?: { openForm: (options: { entityName: string; entityId: string }) => Promise<unknown> } } | undefined {
  return (window as unknown as {
    Xrm?: { Navigation?: { openForm: (options: { entityName: string; entityId: string }) => Promise<unknown> } };
  }).Xrm;
}

export function navigateToRecord(
  context: ComponentFramework.Context<unknown>,
  entityName: string,
  entityId: string
): void {
  const cleanId = entityId.replace(/[{}]/g, '');
  if (!entityName || !GUID_REGEX.test(cleanId)) return;

  const xrm = getXrm();
  if (xrm?.Navigation?.openForm) {
    xrm.Navigation.openForm({ entityName, entityId: cleanId });
    return;
  }

  try {
    context.navigation.openForm({ entityName, entityId: cleanId });
  } catch {
    try {
      const url = new URL('/main.aspx', window.location.origin);
      url.searchParams.set('etn', entityName);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('pagetype', 'entityrecord');
      window.open(url.toString(), '_blank');
    } catch { /* URL construction failed */ }
  }
}

export function openNewRecordForm(
  context: ComponentFramework.Context<unknown>,
  entityName: string
): void {
  const modeInfo = (context.mode as unknown as Record<string, unknown>).contextInfo as
    | { entityId?: string; entityRecordName?: string }
    | undefined;

  const formOptions: ComponentFramework.NavigationApi.EntityFormOptions = { entityName };

  const formParameters: Record<string, string> | undefined = modeInfo?.entityId
    ? { parentid: modeInfo.entityId, ...(modeInfo.entityRecordName ? { parentidname: modeInfo.entityRecordName } : {}) }
    : undefined;

  const xrm = getXrm();
  if (xrm?.Navigation?.openForm) {
    xrm.Navigation.openForm(formOptions as { entityName: string; entityId: string });
    return;
  }

  try {
    context.navigation.openForm(formOptions, formParameters);
  } catch { /* Navigation failed */ }
}
