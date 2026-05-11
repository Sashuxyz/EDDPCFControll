import { cleanGuid, isValidGuid } from './navigation';

export interface ParentInfo {
  entityName: string;
  entityId: string;
}

export type FetchOutcome =
  | { kind: 'ok'; approvalFlow: number | null }
  | { kind: 'no-parent' }
  | { kind: 'error' };

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

// Formula columns that return a Choice/Whole-number value can surface in
// several shapes over OData: a plain integer, a numeric string, or an object
// with a `Value` property. Accept all of them so the control still works.
function coerceToOptionInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    if (Number.isInteger(n)) return n;
  }
  if (raw && typeof raw === 'object' && 'Value' in (raw as Record<string, unknown>)) {
    const v = (raw as { Value: unknown }).Value;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  return null;
}

async function fetchOnce(
  parent: ParentInfo,
  webAPI: ComponentFramework.WebApi
): Promise<FetchOutcome> {
  try {
    const record = await webAPI.retrieveRecord(
      parent.entityName,
      parent.entityId,
      '?$select=syg_approvalflowformula'
    );
    const fields = record as Record<string, unknown>;

    let value = coerceToOptionInt(fields.syg_approvalflowformula);
    if (value == null) {
      // Formula columns can omit the raw value and only surface the formatted
      // (label) value; if the formatted value is itself a stringified number
      // (e.g. "4") it'll coerce, otherwise we give up to ok/null.
      value = coerceToOptionInt(
        fields['syg_approvalflowformula@OData.Community.Display.V1.FormattedValue']
      );
    }

    return { kind: 'ok', approvalFlow: value };
  } catch {
    return { kind: 'error' };
  }
}

export async function fetchApprovalFlow(
  parent: ParentInfo,
  webAPI: ComponentFramework.WebApi
): Promise<FetchOutcome> {
  const first = await fetchOnce(parent, webAPI);
  if (first.kind === 'ok') return first;
  await new Promise((r) => setTimeout(r, 1000));
  return fetchOnce(parent, webAPI);
}
