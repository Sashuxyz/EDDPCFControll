import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SchedulerContainer } from './components/SchedulerContainer';
import {
  SchedulerState,
  FrequencyType,
  StartTypeValue,
  StatusType,
  FREQUENCY_MAP,
  FREQUENCY_REVERSE,
  START_TYPE_MAP,
  START_TYPE_REVERSE,
  STATUS_MAP,
  STATUS_REVERSE,
} from './types';

export class ComplianceConditionScheduler
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root: Root;
  private notifyOutputChanged: () => void;
  private state: SchedulerState = {
    frequency: null,
    startType: null,
    relativeDays: null,
    recurrenceInterval: null,
    leadTime: 14,
    dueDate: null,
    anchorDate: null,
    status: 'Draft',
  };
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

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact();
      return;
    }

    // Read from context
    const freqRaw = context.parameters.frequency?.raw;
    const startRaw = context.parameters.startType?.raw;
    const statusRaw = context.parameters.statusCode?.raw;

    const contextState: SchedulerState = {
      frequency:
        freqRaw != null
          ? (FREQUENCY_MAP[freqRaw as number] ?? null)
          : null,
      startType:
        startRaw != null
          ? (START_TYPE_MAP[startRaw as number] ?? null)
          : null,
      relativeDays: context.parameters.relativeDays?.raw ?? null,
      recurrenceInterval: context.parameters.recurrenceInterval?.raw ?? null,
      leadTime: context.parameters.leadTime?.raw ?? 14,
      dueDate: context.parameters.dueDate?.raw
        ? new Date(
            context.parameters.dueDate.raw as unknown as string
          )
            .toISOString()
            .split('T')[0]
        : null,
      anchorDate: context.parameters.anchorDate?.raw
        ? new Date(
            context.parameters.anchorDate.raw as unknown as string
          )
            .toISOString()
            .split('T')[0]
        : null,
      status:
        statusRaw != null
          ? (STATUS_MAP[statusRaw as number] ?? 'Draft')
          : 'Draft',
    };

    if (!this.initialized) {
      this.state = contextState;
      this.initialized = true;
    } else {
      // Only accept if values actually differ
      if (JSON.stringify(contextState) !== JSON.stringify(this.state)) {
        this.state = contextState;
      }
    }

    this.renderReact();
  }

  private handleChange(field: string, value: unknown): void {
    (this.state as unknown as Record<string, unknown>)[field] = value;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(SchedulerContainer, {
        state: { ...this.state },
        disabled: this.isDisabled,
        onChange: (field: string, value: unknown) =>
          this.handleChange(field, value),
      })
    );
  }

  public getOutputs(): IOutputs {
    const outputs: Record<string, unknown> = {};

    if (this.state.frequency != null) {
      outputs.frequency = FREQUENCY_REVERSE[this.state.frequency];
    }
    if (this.state.startType != null) {
      outputs.startType = START_TYPE_REVERSE[this.state.startType];
    }
    outputs.relativeDays = this.state.relativeDays ?? undefined;
    outputs.recurrenceInterval =
      this.state.recurrenceInterval ?? undefined;
    outputs.leadTime = this.state.leadTime;
    outputs.dueDate = this.state.dueDate
      ? new Date(this.state.dueDate)
      : undefined;
    outputs.anchorDate = this.state.anchorDate
      ? new Date(this.state.anchorDate)
      : undefined;
    outputs.statusCode = STATUS_REVERSE[this.state.status];

    return outputs as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
