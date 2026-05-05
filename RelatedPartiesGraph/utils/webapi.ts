import { RelatedPartyRecord, ReversePartyRecord, MAX_CONCURRENT_DRILL_CHECKS } from '../types';
import { isValidGuid, cleanGuid } from './navigation';

type WebAPI = ComponentFramework.WebApi;

function parseImpact(raw: unknown): 'Major' | 'Minor' | 'No' | null {
  if (raw === 'Major' || raw === 'Minor' || raw === 'No') return raw;
  // D365 may return the OptionSet as a numeric value
  const str = String(raw ?? '').toLowerCase();
  if (str === 'major' || str.includes('major')) return 'Major';
  if (str === 'minor' || str.includes('minor')) return 'Minor';
  if (str === 'no' || str.includes('no impact') || str.includes('no ')) return 'No';
  return null;
}

function extractPartyRecords(entities: ComponentFramework.WebApi.Entity[]): RelatedPartyRecord[] {
  const records: RelatedPartyRecord[] = [];
  for (const e of entities) {
    // Drop orphaned junction rows where the related party reference is null
    // or invalid — they would otherwise propagate into nodes with empty IDs
    // and crash Cytoscape's cy.add().
    const rawPartyId = e['_syg_relatedpartyid_value'];
    const partyId = typeof rawPartyId === 'string' ? cleanGuid(rawPartyId) : '';
    if (!isValidGuid(partyId)) continue;

    const partyType = e['syg_relatedpartytypeid'] as Record<string, unknown> | null;
    records.push({
      junctionId: (e['syg_relatedclientpartiesid'] as string) ?? '',
      relatedPartyId: partyId,
      relatedPartyEtn:
        ((e['_syg_relatedpartyid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string) ?? 'contact') as 'account' | 'contact',
      relatedPartyName:
        (e['_syg_relatedpartyid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? '(Unknown)',
      partyTypeName: (partyType?.['syg_name'] as string) ?? '(Unknown)',
      partyTypeKey: (partyType?.['syg_propertykey'] as number) ?? 0,
      impact: parseImpact(partyType?.['syg_impact']) ??
        parseImpact(partyType?.['syg_impact@OData.Community.Display.V1.FormattedValue']),
      score: (partyType?.['syg_score'] as number) ?? null,
      pep: e['syg_pep'] === true || e['syg_pep'] === 1,
      pepLevel:
        (e['_syg_peplevelid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? null,
      riskScore: (e['syg_riskscore'] as number) ?? null,
    });
  }
  return records;
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

// Reverse lookup: find every KYC profile that lists `customerId` as a related
// party. Each result maps to a node representing the OTHER profile's customer.
// `excludeProfileId` filters out the centre itself so we don't draw a self-loop.
export async function fetchReversePartiesForCustomer(
  webAPI: WebAPI,
  customerId: string,
  excludeProfileId: string
): Promise<ReversePartyRecord[]> {
  const cleanCustomerId = cleanGuid(customerId);
  if (!isValidGuid(cleanCustomerId)) return [];
  const cleanExclude = cleanGuid(excludeProfileId);

  const filter = isValidGuid(cleanExclude)
    ? `_syg_relatedpartyid_value eq ${cleanCustomerId} and _syg_kycprofileid_value ne ${cleanExclude} and statecode eq 0`
    : `_syg_relatedpartyid_value eq ${cleanCustomerId} and statecode eq 0`;

  const result = await webAPI.retrieveMultipleRecords(
    'syg_relatedclientparties',
    `?$filter=${filter}` +
    `&$select=syg_relatedclientpartiesid,_syg_kycprofileid_value` +
    `&$expand=syg_kycprofileid($select=syg_kycprofileid,_syg_clientid_value),syg_relatedpartytypeid($select=syg_name)`
  );

  const records: ReversePartyRecord[] = [];
  for (const e of result.entities ?? []) {
    const profile = e['syg_kycprofileid'] as Record<string, unknown> | null;
    if (!profile) continue;

    const rawProfileId = profile['syg_kycprofileid'];
    const sourceProfileId = typeof rawProfileId === 'string' ? cleanGuid(rawProfileId) : '';
    if (!isValidGuid(sourceProfileId)) continue;

    const rawCustId = profile['_syg_clientid_value'];
    const sourceCustomerId = typeof rawCustId === 'string' ? cleanGuid(rawCustId) : '';
    if (!isValidGuid(sourceCustomerId)) continue;

    const sourceCustomerEtn =
      ((profile['_syg_clientid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] as string) ?? 'contact') as
        'account' | 'contact';
    const sourceCustomerName =
      (profile['_syg_clientid_value@OData.Community.Display.V1.FormattedValue'] as string) ?? '(Unknown)';

    const partyType = e['syg_relatedpartytypeid'] as Record<string, unknown> | null;
    const partyTypeName = (partyType?.['syg_name'] as string) ?? '(Unknown)';

    records.push({
      junctionId: (e['syg_relatedclientpartiesid'] as string) ?? '',
      sourceProfileId,
      sourceCustomerId,
      sourceCustomerEtn,
      sourceCustomerName,
      partyTypeName,
    });
  }
  return records;
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
