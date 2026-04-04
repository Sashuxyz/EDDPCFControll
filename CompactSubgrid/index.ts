import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SubgridContainer } from './components/SubgridContainer';

export class CompactSubgrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container: HTMLDivElement;
  private root: Root;

  public init(
    context: ComponentFramework.Context<IInputs>,
    _notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.root = createRoot(container);
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const dataset = context.parameters.records;
    const conditionalFields = context.parameters.conditionalFields?.raw ?? undefined;

    this.root.render(
      React.createElement(SubgridContainer, {
        dataset,
        context: context as unknown as ComponentFramework.Context<unknown>,
        conditionalFieldsOverride: conditionalFields || undefined,
      })
    );
  }

  public getOutputs(): IOutputs {
    return {};
  }

  public destroy(): void {
    this.root.unmount();
  }
}
