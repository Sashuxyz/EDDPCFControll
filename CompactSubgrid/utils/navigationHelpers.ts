const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface XrmOpenFormOptions {
  entityName: string;
  entityId?: string;
  useQuickCreateForm?: boolean;
}

interface XrmWindow {
  Xrm?: {
    Navigation?: {
      openForm: (
        options: XrmOpenFormOptions,
        parameters?: Record<string, string>
      ) => Promise<unknown>;
    };
  };
}

function getXrm(): XrmWindow['Xrm'] {
  return (window as unknown as XrmWindow).Xrm;
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
  if (!entityName) return;

  const modeInfo = (context.mode as unknown as Record<string, unknown>).contextInfo as
    | { entityId?: string; entityRecordName?: string; entityTypeName?: string }
    | undefined;

  const formParameters: Record<string, string> = {};
  if (modeInfo?.entityId && modeInfo?.entityTypeName) {
    // Pre-populate parent lookup using entityTypeName from contextInfo
    formParameters[`${modeInfo.entityTypeName}id`] = modeInfo.entityId;
    if (modeInfo.entityRecordName) {
      formParameters[`${modeInfo.entityTypeName}idname`] = modeInfo.entityRecordName;
    }
  }

  const xrm = getXrm();
  if (xrm?.Navigation?.openForm) {
    xrm.Navigation.openForm(
      { entityName },
      Object.keys(formParameters).length > 0 ? formParameters : undefined
    );
    return;
  }

  try {
    context.navigation.openForm(
      { entityName } as ComponentFramework.NavigationApi.EntityFormOptions,
      Object.keys(formParameters).length > 0 ? formParameters : undefined
    );
  } catch { /* Navigation failed */ }
}
