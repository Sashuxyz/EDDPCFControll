import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ApprovalTracker } from './components/ApprovalTracker';
import { EmptyState } from './components/EmptyState';
import { extractAllRecords } from './utils/recordExtractor';
import { groupIntoRounds } from './utils/roundGrouper';
import { buildTimelineEvents } from './utils/timelineBuilder';
import { resolveParentInfo, fetchApprovalFlow, ParentInfo } from './utils/parentContext';
import { getUserTimezoneOffsetMinutes } from './utils/dateFormat';
import { STEP_MAP } from './types';

type FlowState =
  | { kind: 'loading' }
  | { kind: 'no-parent' }
  | { kind: 'error' }
  | { kind: 'ok'; approvalFlow: number | null };

export class OnboardingApprovalTracker
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private parentId: string | null = null;
  private flowState: FlowState = { kind: 'loading' };

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.notifyOutputChanged = notifyOutputChanged;
    this.root = createRoot(container);
    context.mode.trackContainerResize(true);
    try {
      context.parameters.transitionLogs.paging.setPageSize(250);
    } catch {
      // setPageSize not available in all environments
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const ds = context.parameters.transitionLogs;

    if (!ds.loading && ds.paging?.hasNextPage) {
      try {
        ds.paging.loadNextPage();
      } catch {
        // give up; render what we have
      }
    }

    const parent = resolveParentInfo(context as unknown as ComponentFramework.Context<unknown>);
    const newParentId = parent?.entityId ?? null;

    if (this.parentId !== newParentId) {
      this.parentId = newParentId;
      if (!parent) {
        this.flowState = { kind: 'no-parent' };
      } else {
        this.flowState = { kind: 'loading' };
        void this.loadFlow(parent);
      }
    }

    this.render(context, ds);
  }

  private async loadFlow(parent: ParentInfo): Promise<void> {
    const result = await fetchApprovalFlow(parent);
    if (result.kind === 'ok') {
      this.flowState = { kind: 'ok', approvalFlow: result.approvalFlow };
    } else {
      this.flowState = { kind: 'error' };
    }
    this.notifyOutputChanged();
  }

  private render(
    context: ComponentFramework.Context<IInputs>,
    ds: ComponentFramework.PropertyTypes.DataSet
  ): void {
    if (this.flowState.kind === 'loading') {
      this.root.render(React.createElement(EmptyState, { message: 'Loading approval configuration...' }));
      return;
    }

    if (this.flowState.kind === 'no-parent' || this.flowState.kind === 'error') {
      this.root.render(
        React.createElement(EmptyState, { message: 'Unable to load approval configuration' })
      );
      return;
    }

    const flow = this.flowState.approvalFlow;
    if (flow == null || !STEP_MAP[flow]) {
      this.root.render(React.createElement(EmptyState, { message: 'No approval flow configured' }));
      return;
    }

    const records = extractAllRecords(ds);
    const rounds = groupIntoRounds(records, flow);
    const events = buildTimelineEvents(rounds);
    const tzOffsetMinutes = getUserTimezoneOffsetMinutes(
      context as unknown as ComponentFramework.Context<unknown>
    );

    this.root.render(
      React.createElement(ApprovalTracker, {
        rounds,
        events,
        context: context as unknown as ComponentFramework.Context<unknown>,
        tzOffsetMinutes,
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
