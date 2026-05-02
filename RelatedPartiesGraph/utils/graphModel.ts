import { NodeData, EdgeData, RelatedPartyRecord } from '../types';
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
    const ref = rawRef as { id?: string; etn?: string; name?: string };
    relatedPartyId = cleanGuid(ref.id ?? '');
    etn = ref.etn === 'account' ? 'account' : 'contact';
    refName = ref.name;
  } else {
    relatedPartyId = cleanGuid(String(rawRef));
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
    pep: getValue('syg_pep') === true || getValue('syg_pep') === 1,
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

export function buildEdge(
  sourceProfileId: string,
  targetPartyId: string,
  label: string,
  level: 1 | 2 | 3
): EdgeData {
  return { source: sourceProfileId, target: targetPartyId, label, level };
}
