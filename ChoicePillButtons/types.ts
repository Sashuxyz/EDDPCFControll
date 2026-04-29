export interface OptionItem {
  Value: number;
  Label: string;
}

export interface ColorMapInput {
  options: OptionItem[];
  colors: Array<string | undefined>;
  values: Array<number | undefined>;
}
