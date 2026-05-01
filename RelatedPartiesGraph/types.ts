export interface NodeData {
  id: string;
  etn: 'account' | 'contact';
  displayName: string;
  level: 0 | 1 | 2 | 3;
  ownKycProfileId: string | null;
  parentProfileId: string;
  partyTypeName: string;
  partyTypeKey: number;
  impact: 'Major' | 'Minor' | 'No' | null;
  score: number | null;
  pep: boolean;
  pepLevel: string | null;
  riskScore: number | null;
  junctionId: string;
}

export interface EdgeData {
  source: string;
  target: string;
  label: string;
  level: 1 | 2 | 3;
}

export interface ProfileBreadcrumb {
  id: string;
  name: string;
}

export interface GraphState {
  centreProfileId: string;
  centreProfileName: string;
  expandedProfiles: ProfileBreadcrumb[];
  nodes: Map<string, NodeData>;
  edges: EdgeData[];
  selectedNodeId: string | null;
  drillCache: Map<string, string | null>;
  loadingProfiles: Set<string>;
}

export interface RelatedPartyRecord {
  junctionId: string;
  relatedPartyId: string;
  relatedPartyEtn: 'account' | 'contact';
  relatedPartyName: string;
  partyTypeName: string;
  partyTypeKey: number;
  impact: 'Major' | 'Minor' | 'No' | null;
  score: number | null;
  pep: boolean;
  pepLevel: string | null;
  riskScore: number | null;
}

export const IMPACT_COLORS: Record<string, { border: string; text: string }> = {
  Major: { border: '#0078D4', text: '#0078D4' },
  Minor: { border: '#835B00', text: '#835B00' },
  No:    { border: '#A19F9D', text: '#A19F9D' },
};

export const DEFAULT_IMPACT_COLOR = IMPACT_COLORS.No;
export const CENTRE_COLOR = { bg: '#0078D4', text: '#FFFFFF', border: '#0078D4' };
export const MAX_DEPTH = 3;
export const MAX_CONCURRENT_DRILL_CHECKS = 10;
