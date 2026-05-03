import { RelatedPartyRecord, MAX_CONCURRENT_DRILL_CHECKS } from '../types';
import { isValidGuid, cleanGuid } from './navigation';

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
  const cleanId = cleanGuid(profileId);
  if (!isValidGuid(cleanId)) return [];
  const result = await webAPI.retrieveMultipleRecords(
    'syg_relatedclientparties',
    `?$filter=_syg_kycprofileid_value eq ${cleanId} and statecode eq 0` +
    `&$select=syg_relatedclientpartiesid,_syg_relatedpartyid_value,syg_pep,syg_riskscore,_syg_peplevelid_value` +
    `&$expand=syg_relatedpartytypeid($select=syg_name,syg_propertykey,syg_score,syg_impact)`
  );
  return extractPartyRecords(result.entities ?? []);
}

export async function findKycProfileForCustomer(
  webAPI: WebAPI,
  customerId: string,
  entityLogicalName: 'account' | 'contact'
): Promise<{ id: string; name: string } | null> {
  const cleanId = cleanGuid(customerId);
  if (!isValidGuid(cleanId)) return null;
  try {
    // The KYC profile link is on the contact/account record (syg_kycprofileid field)
    const record = await webAPI.retrieveRecord(
      entityLogicalName, cleanId,
      '?$select=_syg_kycprofileid_value'
    );
    const profileId = record['_syg_kycprofileid_value'] as string | null;
    if (!profileId) return null;
    const profileName = (record['_syg_kycprofileid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? '(Unknown)';
    return {
      id: cleanGuid(profileId),
      name: profileName,
    };
  } catch {
    return null;
  }
}

export async function batchResolveDrillability(
  webAPI: WebAPI,
  customers: Array<{ id: string; etn: 'account' | 'contact' }>,
  existingCache: Map<string, string | null>
): Promise<Map<string, string | null>> {
  const uncached = customers.filter((c) => !existingCache.has(c.id));
  if (uncached.length === 0) return existingCache;

  const results = new Map(existingCache);

  for (let i = 0; i < uncached.length; i += MAX_CONCURRENT_DRILL_CHECKS) {
    const batch = uncached.slice(i, i + MAX_CONCURRENT_DRILL_CHECKS);
    const promises = batch.map(async (c) => {
      const profile = await findKycProfileForCustomer(webAPI, c.id, c.etn);
      return { id: c.id, profileId: profile?.id ?? null };
    });
    const resolved = await Promise.all(promises);
    for (const { id, profileId } of resolved) {
      results.set(id, profileId);
    }
  }

  return results;
}
