export interface AssetClass {
  key: string;
  label: string;
  color: string;
  paramIndex: number;
}

export const ASSET_CLASSES: AssetClass[] = [
  { key: 'cash', label: 'Cash', color: '#0078D4', paramIndex: 0 },
  { key: 'digitalAssets', label: 'Digital Assets', color: '#00B7C3', paramIndex: 1 },
  { key: 'equities', label: 'Equities', color: '#498205', paramIndex: 2 },
  { key: 'fixedIncome', label: 'Fixed Income', color: '#8764B8', paramIndex: 3 },
  { key: 'commodities', label: 'Commodities', color: '#CA5010', paramIndex: 4 },
  { key: 'realEstate', label: 'Real Estate', color: '#D13438', paramIndex: 5 },
  { key: 'other', label: 'Other', color: '#69797E', paramIndex: 6 },
];

export const REAL_ESTATE_INDEX = 5;

export interface AllocationState {
  totalWealth: number;
  vals: number[];
}
