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
  private initialized = false;
  private pendingOutput = false;

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

    // If we just called notifyOutputChanged, skip reading from context
    // to avoid overwriting our local state with stale Dataverse values
    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact();
      return;
    }

    // Read from context (initial load or external form change)
    const paramNames = ['cashPct', 'digitalAssetsPct', 'equitiesPct', 'fixedIncomePct', 'commoditiesPct', 'realEstatePct', 'otherPct'] as const;

    const contextWealth = context.parameters.totalWealthChf?.raw ?? 0;
    const contextVals = paramNames.map(
      (name) => (context.parameters[name] as ComponentFramework.PropertyTypes.DecimalNumberProperty)?.raw ?? 0
    );

    if (!this.initialized) {
      // First load: always accept context values
      this.state.totalWealth = contextWealth;
      this.state.vals = contextVals;
      this.initialized = true;
    } else {
      // Subsequent updateView: only accept if values actually differ from our state
      // (indicates an external change like form refresh, not our own notifyOutputChanged echo)
      const wealthChanged = Math.abs(contextWealth - this.state.totalWealth) > 0.001;
      const valsChanged = contextVals.some((v, i) => Math.abs(v - this.state.vals[i]) > 0.001);
      if (wealthChanged || valsChanged) {
        this.state.totalWealth = contextWealth;
        this.state.vals = contextVals;
      }
    }

    this.renderReact();
  }

  private handleChange(): void {
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(WealthUI, {
        state: { ...this.state, vals: [...this.state.vals] },
        disabled: this.isDisabled,
        onTotalWealthChange: (value: number) => {
          this.state.totalWealth = value;
          this.handleChange();
        },
        onSliderChange: (idx: number, raw: number) => {
          this.state.vals = applySlider(idx, raw, this.state.vals);
          this.handleChange();
        },
        onFieldBlur: (idx: number, raw: number) => {
          this.state.vals = applyFieldBlur(idx, raw, this.state.vals);
          this.handleChange();
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
