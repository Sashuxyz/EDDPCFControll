import { NodeData, EdgeData, RelatedPartyRecord } from '../types';

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

  const relatedPartyId = getValue('syg_relatedpartyid') as string | null;
  if (!relatedPartyId) return null;

  let etn: 'account' | 'contact' = 'contact';
  const relatedPartyRef = getValue('syg_relatedpartyid');
  if (relatedPartyRef && typeof relatedPartyRef === 'object' && 'etn' in (relatedPartyRef as Record<string, unknown>)) {
    etn = ((relatedPartyRef as Record<string, unknown>).etn as string) === 'account' ? 'account' : 'contact';
  }

  const partyTypeName = getFormatted('syg_relatedpartytypeid') || '(Unknown)';
  const relatedPartyName = getFormatted('syg_relatedpartyid') || '(Unknown)';

  return {
    junctionId: record.getRecordId(),
    relatedPartyId: typeof relatedPartyId === 'string' ? relatedPartyId :
      (relatedPartyId as Record<string, unknown>)?.id as string ?? '',
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
