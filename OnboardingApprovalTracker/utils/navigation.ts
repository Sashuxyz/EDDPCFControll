const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cleanGuid(id: string | null | undefined): string {
  if (!id) return '';
  return id.replace(/[{}]/g, '').toLowerCase();
}

export function isValidGuid(id: string | null | undefined): boolean {
  return GUID_REGEX.test(cleanGuid(id));
}

interface XrmNavigation {
  openForm?: (options: { entityName: string; entityId: string }) => Promise<unknown>;
}

export function openTransitionLog(
  context: ComponentFramework.Context<unknown>,
  recordId: string
): void {
  const cleaned = cleanGuid(recordId);
  if (!isValidGuid(cleaned)) return;

  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigation } }).Xrm;
  if (xrm?.Navigation?.openForm) {
    void xrm.Navigation.openForm({
      entityName: 'syg_onboardingtransitionlog',
      entityId: cleaned,
    });
    return;
  }

  try {
    context.navigation.openForm({
      entityName: 'syg_onboardingtransitionlog',
      entityId: cleaned,
    });
    return;
  } catch {
    // fall through to URL
  }

  try {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/main.aspx?etn=syg_onboardingtransitionlog&id=${cleaned}&pagetype=entityrecord`;
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    // give up silently
  }
}
