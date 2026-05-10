// PCF lifecycle entry. Reads the bound aiAnalyticsAudit and takeoverStatus
// fields, parses both, renders the root component, and persists status
// changes via notifyOutputChanged.

import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { KycFullTakeover as KycFullTakeoverComponent } from './components/KycFullTakeover';
import { EmptyStatePane } from './components/EmptyStatePane';
import { EmptyShell } from './components/EmptyShell';
import { parsePayload } from './utils/payloadParser';
import { parseStatusBlob, serialiseStatusBlob } from './utils/sectionStatus';
import { TakeoverStatusBlob } from './types';

export class KycFullTakeover implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private notifyOutputChanged!: () => void;

  // Mutable state mirrored to the bound takeoverStatus output on the next
  // updateView. takeoverLastRunAt/takeoverLastError were dropped in 0.6.1 —
  // both timestamps and errors live inside the JSON status blob already.
  private pendingStatus:  TakeoverStatusBlob | null = null;
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
    return outputs;
  }

  public destroy(): void {
    this.root.unmount();
  }

  // === render =============================================================

  private render(): void {
    const profile = this.resolveProfile();
    if (!profile) {
      // No profile context — can't render even the header (needs profile id + webAPI).
      this.root.render(
        React.createElement(EmptyStatePane, {
          message: 'Could not resolve the KYC profile context. The control must be placed on a syg_kycprofile form.',
        })
      );
      return;
    }

    const auditRaw = this.context.parameters.aiAnalyticsAudit?.raw ?? null;
    const result = parsePayload(auditRaw);
    if (!result.ok) {
      // Payload missing or unparseable — render the header (so the RM can trigger
      // a fresh run from this state) plus a friendly empty-state panel below.
      this.root.render(
        React.createElement(EmptyShell, {
          kycProfileId:   profile.id,
          kycProfileName: profile.name,
          webAPI:         this.context.webAPI,
          isEmpty:        result.error === 'empty payload',
          detail:         result.error === 'empty payload' ? undefined : result.error,
        })
      );
      return;
    }

    const statusRaw  = this.context.parameters.takeoverStatus?.raw ?? '';
    const statusBlob = parseStatusBlob(statusRaw);

    // Bind the host's lookup-picker function so editable lookup fields inside
    // the takeover tree can open the native D365 picker. Older PCF hosts
    // without context.utils.lookupObjects fall back to read-only mode.
    const utils = (this.context as ComponentFramework.Context<IInputs> & {
      utils?: { lookupObjects?: (opts: ComponentFramework.UtilityApi.LookupOptions) => Promise<ComponentFramework.LookupValue[]> };
    }).utils;
    const lookupObjects = (utils && typeof utils.lookupObjects === 'function')
      ? utils.lookupObjects.bind(utils)
      : undefined;

    this.root.render(
      React.createElement(KycFullTakeoverComponent, {
        payload:        result.payload,
        statusBlob,
        kycProfileId:   profile.id,
        kycProfileName: profile.name,
        webAPI:         this.context.webAPI,
        lookupObjects,
        onStatusChange: (next: TakeoverStatusBlob) => {
          // Persist out to the bound takeoverStatus field. The KycFullTakeover
          // React component holds the live blob in its own useState, so we
          // don't re-render here — that would echo-loop with the bound-field
          // updateView callback. The pendingOutput flag in updateView() also
          // breaks the echo cycle.
          this.pendingStatus = next;
          this.pendingOutput = true;
          this.notifyOutputChanged();
          // Auto-save the form so the takeoverStatus/takeoverLastRunAt outputs
          // reach the database. notifyOutputChanged only marks the bound fields
          // as dirty; without an explicit save the per-section status would be
          // lost on form reload, and RMs would see "pending" badges instead of
          // "done" when they return.
          this.triggerFormSave();
        },
      })
    );
  }

  // Force the form to save dirty bound-output fields. Called after every
  // takeover so per-section status persists. Deferred via setTimeout so the
  // framework has time to apply the new bound-field values before save runs.
  //
  // Skipped when the form is showing an unsaved (new) record — Xrm.Page.data.save()
  // on a never-persisted record trips an internal `_contextToken` access that
  // throws TypeError. The narrative/row writes already went via direct WebAPI,
  // so the data is safe; only the takeoverStatus blob will need a manual save
  // when the RM next clicks the form's Save button.
  private triggerFormSave(): void {
    const xrm = (window as unknown as {
      Xrm?: {
        Page?: {
          data?: {
            save?: () => Promise<unknown>;
            entity?: { getId?: () => string | null };
          };
        };
      };
    }).Xrm;

    const rawId = xrm?.Page?.data?.entity?.getId?.();
    const cleanId = typeof rawId === 'string' ? rawId.replace(/[{}]/g, '') : '';
    if (!cleanId) {
      // eslint-disable-next-line no-console
      console.info('[KycFullTakeover] auto-save skipped — record has no GUID yet (Unsaved). Click Save on the form to persist takeover status.');
      return;
    }

    const saveFn = xrm?.Page?.data?.save;
    if (typeof saveFn !== 'function') {
      // eslint-disable-next-line no-console
      console.warn('[KycFullTakeover] Xrm.Page.data.save unavailable — form must be saved manually to persist takeover status');
      return;
    }
    setTimeout(() => {
      try {
        const result = saveFn();
        if (result && typeof (result as Promise<unknown>).catch === 'function') {
          (result as Promise<unknown>).catch((e: unknown) => {
            // eslint-disable-next-line no-console
            console.error('[KycFullTakeover] auto-save rejected', e);
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[KycFullTakeover] auto-save threw', e);
      }
    }, 200);
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
