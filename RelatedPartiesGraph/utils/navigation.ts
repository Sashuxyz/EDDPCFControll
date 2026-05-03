const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuid(id: string): boolean {
  return GUID_RE.test(id);
}

export function cleanGuid(raw: unknown): string {
  return String(raw ?? '').replace(/[{}]/g, '').toLowerCase();
}

export function openRecord(entityName: string, entityId: string): void {
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

  try {
    const url = new URL(
      `/main.aspx?etn=${entityName}&id=${cleaned}&pagetype=entityrecord`,
      window.location.origin
    );
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch { /* give up */ }
}
