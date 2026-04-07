import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { WealthAllocationControl as WealthUI } from './components/WealthAllocationControl';
import { AllocationState } from './types';
import { applySlider, applyFieldBlur } from './utils/allocationLogic';

export class WealthAllocationControl implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root: Root;
  private notifyOutputChanged: () => void;
  private state: AllocationState = { totalWealth: 0, vals: [0, 0, 0, 0, 0, 0, 0] };
  private isDisabled = false;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.isDisabled = context.mode.isControlDisabled;
    this.state.totalWealth = context.parameters.totalWealthChf?.raw ?? 0;

    const paramNames = ['cashPct', 'digitalAssetsPct', 'equitiesPct', 'fixedIncomePct', 'commoditiesPct', 'realEstatePct', 'otherPct'] as const;
    paramNames.forEach((name, i) => {
      this.state.vals[i] = (context.parameters[name] as ComponentFramework.PropertyTypes.DecimalNumberProperty)?.raw ?? 0;
    });

    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(WealthUI, {
        state: { ...this.state, vals: [...this.state.vals] },
        disabled: this.isDisabled,
        onTotalWealthChange: (value: number) => {
          this.state.totalWealth = value;
          this.notifyOutputChanged();
          this.renderReact();
        },
        onSliderChange: (idx: number, raw: number) => {
          this.state.vals = applySlider(idx, raw, this.state.vals);
          this.notifyOutputChanged();
          this.renderReact();
        },
        onFieldBlur: (idx: number, raw: number) => {
          this.state.vals = applyFieldBlur(idx, raw, this.state.vals);
          this.notifyOutputChanged();
          this.renderReact();
        },
      })
    );
  }

  public getOutputs(): IOutputs {
    return {
      totalWealthChf: this.state.totalWealth,
      cashPct: this.state.vals[0],
      digitalAssetsPct: this.state.vals[1],
      equitiesPct: this.state.vals[2],
      fixedIncomePct: this.state.vals[3],
      commoditiesPct: this.state.vals[4],
      realEstatePct: this.state.vals[5],
      otherPct: this.state.vals[6],
    };
  }

  public destroy(): void {
    this.root.unmount();
  }
}
