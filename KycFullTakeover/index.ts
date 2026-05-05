// PCF lifecycle entry. Reads the bound aiAnalyticsAudit and takeoverStatus
// fields, parses both, renders the root component, and persists status
// changes via notifyOutputChanged.

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { KycFullTakeover as KycFullTakeoverComponent } from './components/KycFullTakeover';
import { EmptyStatePane } from './components/EmptyStatePane';
import { parsePayload } from './utils/payloadParser';
import { parseStatusBlob, serialiseStatusBlob } from './utils/sectionStatus';
import { TakeoverStatusBlob } from './types';

export class KycFullTakeover implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged!: () => void;

  // Mutable state mirrored to bound output fields on next updateView.
  private pendingStatus:  TakeoverStatusBlob | null = null;
  private pendingLastRun: string | null = null;
  private pendingError:   string | null = null;
  private pendingOutput  = false;

  public init(
    context:             ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state:              ComponentFramework.Dictionary,
    container:           HTMLDivElement,
  ): void {
    this.context             = context;
    this.notifyOutputChanged = notifyOutputChanged;
    this.container           = container;
    this.root                = createRoot(container);
    context.mode.trackContainerResize(true);
    this.render();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    if (this.pendingOutput) {
      this.pendingOutput = false;
      // Skip re-rendering from external state on the echo call after we
      // notified output — our local state is already current.
      return;
    }
    this.render();
  }

  public getOutputs(): IOutputs {
    const outputs: IOutputs = {};
    if (this.pendingStatus !== null) {
      outputs.takeoverStatus = serialiseStatusBlob(this.pendingStatus);
      this.pendingStatus = null;
    }
    if (this.pendingLastRun !== null) {
      outputs.takeoverLastRunAt = new Date(this.pendingLastRun);
      this.pendingLastRun = null;
    }
    if (this.pendingError !== null) {
      outputs.takeoverLastError = this.pendingError;
      this.pendingError = null;
    }
    return outputs;
  }

  public destroy(): void {
    this.root.unmount();
  }

  // === render =============================================================

  private render(): void {
    const auditRaw = this.context.parameters.aiAnalyticsAudit?.raw ?? null;
    const result = parsePayload(auditRaw);
    if (!result.ok) {
      this.root.render(
        React.createElement(EmptyStatePane, {
          message: 'No AI analytics payload available for this KYC profile, or the payload format is unsupported.',
          detail:  result.error,
        })
      );
      return;
    }

    const statusRaw  = this.context.parameters.takeoverStatus?.raw ?? '';
    const statusBlob = parseStatusBlob(statusRaw);

    const profile = this.resolveProfile();
    if (!profile) {
      this.root.render(
        React.createElement(EmptyStatePane, {
          message: 'Could not resolve the KYC profile context. The control must be placed on a syg_kycprofile form.',
        })
      );
      return;
    }

    this.root.render(
      React.createElement(KycFullTakeoverComponent, {
        payload:        result.payload,
        statusBlob,
        kycProfileId:   profile.id,
        kycProfileName: profile.name,
        webAPI:         this.context.webAPI,
        onStatusChange: (next: TakeoverStatusBlob) => {
          // Persist out to the bound takeoverStatus field. The KycFullTakeover
          // React component holds the live blob in its own useState, so we
          // don't re-render here — that would echo-loop with the bound-field
          // updateView callback. The pendingOutput flag in updateView() also
          // breaks the echo cycle.
          this.pendingStatus  = next;
          this.pendingLastRun = new Date().toISOString();
          this.pendingError   = null;
          this.pendingOutput  = true;
          this.notifyOutputChanged();
        },
      })
    );
  }

  private resolveProfile(): { id: string; name: string } | null {
    const info = (this.context.mode as unknown as {
      contextInfo?: { entityId?: unknown; entityTypeName?: string; label?: string };
    }).contextInfo;
    if (!info?.entityId || info?.entityTypeName !== 'syg_kycprofile') {
      // fallback: try Xrm.Page
      const xrm = (window as unknown as { Xrm?: { Page?: { data?: { entity?: { getId?: () => string; getEntityName?: () => string } } } } }).Xrm;
      const ent = xrm?.Page?.data?.entity;
      const id  = ent?.getId?.()?.replace(/[{}]/g, '');
      const en  = ent?.getEntityName?.();
      if (id && en === 'syg_kycprofile') {
        return { id: id.toLowerCase(), name: 'KYC Profile' };
      }
      return null;
    }
    const idRaw = String(info.entityId).replace(/[{}]/g, '').toLowerCase();
    return { id: idRaw, name: info.label ?? 'KYC Profile' };
  }
}
