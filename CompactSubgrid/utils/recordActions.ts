export async function deleteRecords(
  context: ComponentFramework.Context<unknown>,
  entityName: string,
  recordIds: string[],
  onComplete: () => void
): Promise<void> {
  const xrm = (window as unknown as {
    Xrm?: {
      Navigation?: {
        openConfirmDialog: (options: { title: string; text: string }) => Promise<{ confirmed: boolean }>;
      };
    };
  }).Xrm;

  const count = recordIds.length;
  const confirmText = count === 1
    ? 'Are you sure you want to delete this record?'
    : `Are you sure you want to delete ${count} records?`;

  let confirmed = true;
  if (xrm?.Navigation?.openConfirmDialog) {
    const result = await xrm.Navigation.openConfirmDialog({ title: 'Confirm Delete', text: confirmText });
    confirmed = result.confirmed;
  }

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
  context: ComponentFramework.Context<unknown>,
  recordIds: string[],
  onComplete: () => void
): Promise<void> {
  const xrm = (window as unknown as {
    Xrm?: {
      Navigation?: {
        openConfirmDialog: (options: { title: string; text: string }) => Promise<{ confirmed: boolean }>;
      };
    };
  }).Xrm;

  const count = recordIds.length;
  const confirmText = count === 1
    ? 'Are you sure you want to remove this record from the list?'
    : `Are you sure you want to remove ${count} records from the list?`;

  let confirmed = true;
  if (xrm?.Navigation?.openConfirmDialog) {
    const result = await xrm.Navigation.openConfirmDialog({ title: 'Confirm Remove', text: confirmText });
    confirmed = result.confirmed;
  }

  if (!confirmed) return;
  onComplete();
}
