import { cleanGuid, isValidGuid } from './navigation';

export interface ParentInfo {
  entityName: string;
  entityId: string;
}

export type FetchOutcome =
  | { kind: 'ok'; approvalFlow: number | null }
  | { kind: 'no-parent' }
  | { kind: 'error' };

function getXrmGlobalContext(): { getClientUrl?: () => string } | undefined {
  const xrm = (window as unknown as {
    Xrm?: { Utility?: { getGlobalContext?: () => { getClientUrl?: () => string } } };
  }).Xrm;
  return xrm?.Utility?.getGlobalContext?.();
}

export function resolveParentInfo(context: ComponentFramework.Context<unknown>): ParentInfo | null {
  const ctxInfo = (context.mode as unknown as {
    contextInfo?: { entityTypeName?: string; entityId?: string };
  }).contextInfo;

  let entityName = ctxInfo?.entityTypeName;
  let entityId = ctxInfo?.entityId;

  if (!entityName || !entityId) {
    const xrmEntity = (window as unknown as {
      Xrm?: { Page?: { data?: { entity?: { getEntityName?: () => string; getId?: () => string } } } };
    }).Xrm?.Page?.data?.entity;
    if (xrmEntity) {
      entityName = entityName || xrmEntity.getEntityName?.();
      entityId = entityId || xrmEntity.getId?.();
    }
  }

  if (!entityName || !entityId) return null;
  const cleaned = cleanGuid(entityId);
  if (!isValidGuid(cleaned)) return null;
  return { entityName, entityId: cleaned };
}

async function fetchOnce(parent: ParentInfo): Promise<FetchOutcome> {
  const baseUrl = getXrmGlobalContext()?.getClientUrl?.() ?? window.location.origin;
  const setName = `${parent.entityName}s`;

  try {
    const resp = await fetch(
      `${baseUrl}/api/data/v9.2/${setName}(${parent.entityId})?$select=syg_approvalflow`,
      {
        credentials: 'include',
        headers: {
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          'Accept': 'application/json',
        },
      }
    );
    if (!resp.ok && resp.status !== 304) return { kind: 'error' };
    const data = await resp.json();
    const raw = data?.syg_approvalflow;
    const approvalFlow = typeof raw === 'number' ? raw : null;
    return { kind: 'ok', approvalFlow };
  } catch {
    return { kind: 'error' };
  }
}

export async function fetchApprovalFlow(parent: ParentInfo): Promise<FetchOutcome> {
  const first = await fetchOnce(parent);
  if (first.kind === 'ok') return first;
  await new Promise((r) => setTimeout(r, 1000));
  return fetchOnce(parent);
}
