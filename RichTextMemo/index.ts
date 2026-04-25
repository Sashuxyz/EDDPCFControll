import { IInputs, IOutputs } from './generated/ManifestTypes';
export class RichTextMemo implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  public init(): void {}
  public updateView(): void {}
  public getOutputs(): IOutputs { return {}; }
  public destroy(): void {}
}
