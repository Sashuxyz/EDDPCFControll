import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { TakeoverContainer } from './components/TakeoverContainer';
import { EmptyState } from './components/EmptyState';
import { TriggerDraft } from './components/TriggerDraft';
import { parseAgentOutput, ParseResult } from './utils/parseAgentOutput';
import { containerStyles } from './styles/tokens';

export class KycDraftTakeover implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private isDisabled = false;
  private parseResult: ParseResult = { success: false, sections: {} };
  private currentFieldValues: Record<string, string | null> = {};
  private outputValues: Record<string, unknown> = {};
  private draftTriggered = false;

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

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact();
      return;
    }

    // Parse JSON source field
    const rawJson = context.parameters.aiAnalyticsAudit?.raw ?? null;
    this.parseResult = parseAgentOutput(rawJson);

    // If draft was triggered and data arrived, stop the triggered state
    if (this.draftTriggered && this.parseResult.success) {
      this.draftTriggered = false;
    }

    // Read current values of all target fields (to detect existing content)
    const textParams = [
      'professionalBackground',
      'financialSituation',
      'relatedParties',
      'sanctionCheck',
      'reputationalRisk',
      'pep',
      'sources',
    ] as const;
    for (const name of textParams) {
      const param = context.parameters[name];
      this.currentFieldValues[name] = (param as any)?.raw ?? null;
    }
    // Currency field
    this.currentFieldValues['estimatedTotalWealth'] =
      context.parameters.estimatedTotalWealth?.raw != null
        ? String(context.parameters.estimatedTotalWealth.raw)
        : null;

    this.renderReact();
  }

  private handleTriggerDraft(): void {
    this.draftTriggered = true;
    this.outputValues['aiAnalysisTriggeredOn'] = new Date().toISOString();
    this.pendingOutput = true;
    this.notifyOutputChanged();

    // Save the form so the timestamp reaches D365 and triggers the flow
    try {
      const xrm = (window as unknown as { Xrm?: { Page?: { data?: { save?: () => void } } } }).Xrm;
      xrm?.Page?.data?.save?.();
    } catch { /* best-effort save */ }

    this.renderReact();
  }

  private handleTakeOver(paramNames: string[], values: Record<string, unknown>): void {
    for (const name of paramNames) {
      this.outputValues[name] = values[name];
      this.currentFieldValues[name] = values[name] != null ? String(values[name]) : null;
    }
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact();
  }

  private renderReact(): void {
    // Show trigger UI when no data and not yet triggered, or when triggered (waiting)
    if (!this.parseResult.success && this.parseResult.error === 'empty') {
      this.root.render(
        React.createElement(
          'div',
          { style: containerStyles.root },
          React.createElement(TriggerDraft, {
            disabled: this.isDisabled,
            onTrigger: () => this.handleTriggerDraft(),
          })
        )
      );
      return;
    }

    if (!this.parseResult.success) {
      this.root.render(
        React.createElement(
          'div',
          { style: containerStyles.root },
          React.createElement(EmptyState, {
            type: 'error',
            rawPreview: this.parseResult.rawPreview,
          })
        )
      );
      return;
    }

    this.root.render(
      React.createElement(TakeoverContainer, {
        parsedSections: this.parseResult.sections,
        currentFieldValues: { ...this.currentFieldValues },
        disabled: this.isDisabled,
        onTakeOver: (paramNames: string[], values: Record<string, unknown>) =>
          this.handleTakeOver(paramNames, values),
      })
    );
  }

  public getOutputs(): IOutputs {
    const outputs: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(this.outputValues)) {
      if (key === 'estimatedTotalWealth') {
        if (typeof val === 'number' && isFinite(val)) {
          outputs[key] = val;
        }
      } else {
        outputs[key] = val;
      }
    }
    return outputs as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
