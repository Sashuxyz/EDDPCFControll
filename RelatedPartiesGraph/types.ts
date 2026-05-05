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
  // Reverse links: another KYC profile lists the centre's customer as a related
  // party. Rendered as a dashed edge to indicate the relationship is owned by
  // the OTHER side, not visible from the centre's own data.
  reverse?: boolean;
}

export interface GraphState {
  centreProfileId: string;
  centreProfileName: string;
  expandedProfileIds: Set<string>;
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

// A junction row found by querying the relationship from the OTHER side: some
// other KYC profile lists OUR centre customer as a related party. Used to draw
// the dashed back-link edges.
export interface ReversePartyRecord {
  junctionId: string;
  // The KYC profile that owns this relationship (e.g. BitCap's profile when
  // viewing Greta).
  sourceProfileId: string;
  // The customer record (account/contact) the source profile is about.
  sourceCustomerId: string;
  sourceCustomerEtn: 'account' | 'contact';
  sourceCustomerName: string;
  // The role the centre plays in the source profile (e.g. "Beneficial Owner").
  partyTypeName: string;
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
