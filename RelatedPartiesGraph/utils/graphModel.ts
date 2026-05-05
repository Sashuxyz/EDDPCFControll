import { NodeData, EdgeData, RelatedPartyRecord, ReversePartyRecord } from '../types';
import { cleanGuid, isValidGuid } from './navigation';

export function datasetRecordToPartyRecord(
  record: ComponentFramework.PropertyTypes.DataSet['records'][string],
  columns: ComponentFramework.PropertyTypes.DataSet['columns']
): RelatedPartyRecord | null {
  const getValue = (name: string): unknown => {
    try { return record.getValue(name); } catch { return null; }
  };
  const getFormatted = (name: string): string => {
    try { return record.getFormattedValue(name) ?? ''; } catch { return ''; }
  };

  const rawRef = getValue('syg_relatedpartyid');
  if (!rawRef) return null;

  let relatedPartyId: string;
  let etn: 'account' | 'contact' = 'contact';
  let refName: string | undefined;

  if (typeof rawRef === 'object' && rawRef !== null) {
    const ref = rawRef as { id?: unknown; etn?: string; name?: string };
    // D365 dataset lookups nest the GUID: id can be a string OR {guid: string}
    const rawId = ref.id;
    const idStr = (typeof rawId === 'object' && rawId !== null && 'guid' in rawId)
      ? (rawId as { guid: string }).guid
      : rawId;
    relatedPartyId = cleanGuid(idStr);
    etn = ref.etn === 'account' ? 'account' : 'contact';
    refName = ref.name;
  } else {
    relatedPartyId = cleanGuid(rawRef);
  }

  if (!relatedPartyId || !isValidGuid(relatedPartyId)) return null;

  const partyTypeName = getFormatted('syg_relatedpartytypeid') || '(Unknown)';
  const relatedPartyName = getFormatted('syg_relatedpartyid') || refName || '(Unknown)';

  return {
    junctionId: record.getRecordId(),
    relatedPartyId,
    relatedPartyEtn: etn,
    relatedPartyName,
    partyTypeName,
    partyTypeKey: 0,
    impact: null,
    score: null,
    pep: getValue('syg_pep') === true || getValue('syg_pep') === 1 || getValue('syg_pep') === '1',
    pepLevel: getFormatted('syg_peplevelid') || null,
    riskScore: (getValue('syg_riskscore') as number) ?? null,
  };
}

export function partyRecordToNode(
  record: RelatedPartyRecord,
  level: 0 | 1 | 2 | 3,
  parentProfileId: string,
  drillCache: Map<string, string | null>
): NodeData {
  return {
    id: record.relatedPartyId,
    etn: record.relatedPartyEtn,
    displayName: record.relatedPartyName,
    level,
    ownKycProfileId: drillCache.get(record.relatedPartyId) ?? null,
    parentProfileId,
    partyTypeName: record.partyTypeName,
    partyTypeKey: record.partyTypeKey,
    impact: record.impact,
    score: record.score,
    pep: record.pep,
    pepLevel: record.pepLevel,
    riskScore: record.riskScore,
    junctionId: record.junctionId,
  };
}

// Build a peer-level node from a reverse junction row. The node represents the
// SOURCE profile's client (e.g. BitCap when viewing Greta), placed at level 1
// alongside direct related parties. ownKycProfileId is pre-populated so the
// node is immediately drillable without needing a drillability check.
export function reverseRecordToNode(record: ReversePartyRecord): NodeData {
  return {
    id: record.sourceCustomerId,
    etn: record.sourceCustomerEtn,
    displayName: record.sourceCustomerName,
    level: 1,
    ownKycProfileId: record.sourceProfileId,
    parentProfileId: record.sourceProfileId,
    partyTypeName: record.partyTypeName,
    partyTypeKey: 0,
    impact: null,
    score: null,
    pep: false,
    pepLevel: null,
    riskScore: null,
    junctionId: record.junctionId,
  };
}

export function buildEdge(
  sourceProfileId: string,
  targetPartyId: string,
  label: string,
  level: 1 | 2 | 3,
  reverse = false
): EdgeData {
  return { source: sourceProfileId, target: targetPartyId, label, level, reverse };
}
