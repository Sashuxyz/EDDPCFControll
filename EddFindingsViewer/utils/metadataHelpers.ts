/**
 * Columns already rendered elsewhere in the card — excluded from Tier 2 footer.
 */
const EXCLUDED_COLUMNS = new Set([
  'syg_name',
  'syg_description',
  'syg_riskseverity',
  'syg_status',
  'createdon',
  'syg_category',
  'createdby',
  'syg_linkedcondition',
  'modifiedon',
]);

export interface MetadataField {
  name: string;
  displayName: string;
}

/**
 * Discover additional columns in the dataset not already rendered in the card.
 * Returns label/name pairs for the dynamic metadata footer.
 */
export function getAdditionalColumns(
  columns: ComponentFramework.PropertyHelper.DataSetApi.Column[]
): MetadataField[] {
  return columns
    .filter((col) => !EXCLUDED_COLUMNS.has(col.name) && col.displayName)
    .map((col) => ({
      name: col.name,
      displayName: col.displayName,
    }));
}
