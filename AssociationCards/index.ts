import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CardsContainer } from './components/CardsContainer';

export class AssociationCards implements ComponentFramework.StandardControl<IInputs, IOutputs> {
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
    // Request a large page size so all associations load at once
    try {
      context.parameters.records.paging.setPageSize(250);
    } catch { /* setPageSize not available */ }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const dataset = context.parameters.records;
    const relationshipName = context.parameters.relationshipName?.raw ?? '';

    this.root.render(
      React.createElement(CardsContainer, {
        dataset,
        context: context as unknown as ComponentFramework.Context<unknown>,
        relationshipName,
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
