import { RelatedPartyRecord, MAX_CONCURRENT_DRILL_CHECKS } from '../types';

type WebAPI = ComponentFramework.WebApi;

function parseImpact(raw: unknown): 'Major' | 'Minor' | 'No' | null {
  if (raw === 'Major' || raw === 'Minor' || raw === 'No') return raw;
  return null;
}

function extractPartyRecords(entities: ComponentFramework.WebApi.Entity[]): RelatedPartyRecord[] {
  return entities.map((e) => {
    const partyType = e['syg_relatedpartytypeid'] as Record<string, unknown> | null;
    return {
      junctionId: (e['syg_relatedclientpartiesid'] as string) ?? '',
      relatedPartyId: (e['_syg_relatedpartyid_value'] as string) ?? '',
      relatedPartyEtn:
        ((e['_syg_relatedpartyid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string) ?? 'contact') as 'account' | 'contact',
      relatedPartyName:
        (e['_syg_relatedpartyid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? '(Unknown)',
      partyTypeName: (partyType?.['syg_name'] as string) ?? '(Unknown)',
      partyTypeKey: (partyType?.['syg_propertykey'] as number) ?? 0,
      impact: parseImpact(partyType?.['syg_impact']),
      score: (partyType?.['syg_score'] as number) ?? null,
      pep: e['syg_pep'] === true || e['syg_pep'] === 1,
      pepLevel:
        (e['_syg_peplevelid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? null,
      riskScore: (e['syg_riskscore'] as number) ?? null,
    };
  });
}

export async function fetchPartiesForProfile(
  webAPI: WebAPI,
  profileId: string
): Promise<RelatedPartyRecord[]> {
  const result = await webAPI.retrieveMultipleRecords(
    'syg_relatedclientparties',
    `?$filter=_syg_kycprofileid_value eq ${profileId} and statecode eq 0` +
    `&$select=syg_relatedclientpartiesid,_syg_relatedpartyid_value,syg_pep,syg_riskscore,_syg_peplevelid_value` +
    `&$expand=syg_relatedpartytypeid($select=syg_name,syg_propertykey,syg_score,syg_impact)`
  );
  return extractPartyRecords(result.entities ?? []);
}

export async function findKycProfileForCustomer(
  webAPI: WebAPI,
  customerId: string
): Promise<{ id: string; name: string } | null> {
  try {
    const result = await webAPI.retrieveMultipleRecords(
      'syg_kycprofile',
      `?$filter=(_syg_clientid_value eq ${customerId}) and statecode eq 0` +
      `&$select=syg_kycprofileid,syg_name&$top=1`
    );
    const first = result.entities?.[0];
    if (!first) return null;
    return {
      id: (first['syg_kycprofileid'] as string) ?? '',
      name: (first['syg_name'] as string) ?? '(Unknown)',
    };
  } catch {
    return null;
  }
}

export async function batchResolveDrillability(
  webAPI: WebAPI,
  customerIds: string[],
  existingCache: Map<string, string | null>
): Promise<Map<string, string | null>> {
  const uncached = customerIds.filter((id) => !existingCache.has(id));
  if (uncached.length === 0) return existingCache;

  const results = new Map(existingCache);

  for (let i = 0; i < uncached.length; i += MAX_CONCURRENT_DRILL_CHECKS) {
    const batch = uncached.slice(i, i + MAX_CONCURRENT_DRILL_CHECKS);
    const promises = batch.map(async (id) => {
      const profile = await findKycProfileForCustomer(webAPI, id);
      return { id, profileId: profile?.id ?? null };
    });
    const resolved = await Promise.all(promises);
    for (const { id, profileId } of resolved) {
      results.set(id, profileId);
    }
  }

  return results;
}
