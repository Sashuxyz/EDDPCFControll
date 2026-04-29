import { IInputs, IOutputs } from './generated/ManifestTypes';
export class ChoicePillButtons implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  public init(): void {}
  public updateView(): void {}
  public getOutputs(): IOutputs { return {}; }
  public destroy(): void {}
}
