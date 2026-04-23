// NpOnboardingChecklist/index.ts
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChecklistRoot } from './components/ChecklistRoot';
import { CheckState, AnswerValue, MismatchData, ManualNotDoneData } from './types';
import { parseCheckResults, resolveSr, formatDate, emptyCrmValues } from './utils';

export class NpOnboardingChecklist implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private outputJson = '';

  private state: CheckState = {
    answers: {},
    mismatches: {},
    manualNotDone: {},
    crmValues: emptyCrmValues(),
    taxRecords: [],
    idDocument: null,
    loading: true,
    loadError: null,
    completedAt: null,
    completedBy: null,
  };
  private isReadOnly = false;
  private userName = '';

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    // Immediately stamp the container so we know the bundle loaded and init ran
    container.setAttribute('data-np-version', '1.0.13');
    console.log('[NpChecklist v1.0.12-b] init started');

    try {
      this.root = createRoot(container);
    } catch (e) {
      console.error('[NpChecklist] createRoot failed:', e);
      container.innerText = '[NpChecklist] createRoot failed: ' + String(e);
      return;
    }

    this.notifyOutputChanged = notifyOutputChanged;

    try {
      (context.mode as any).trackContainerResize?.(true);
    } catch { /* optional API — ignore if unavailable */ }

    this.userName = (context.userSettings as any).userName ?? (context.userSettings as any).userId ?? 'Unknown';

    const savedJson = (context.parameters.checkResults as any)?.raw ?? null;
    const saved = parseCheckResults(savedJson);
    if (saved) {
      this.state = {
        ...this.state,
        answers: (saved.answers ?? {}) as Record<string, AnswerValue>,
        mismatches: (saved.mismatches ?? {}) as Record<string, MismatchData>,
        manualNotDone: (saved.manualNotDone ?? {}) as Record<string, ManualNotDoneData>,
      };
    }

    try {
      this.renderReact();
    } catch (e) {
      console.error('[NpChecklist] renderReact (initial) failed:', e);
      container.innerText = '[NpChecklist] React render failed: ' + String(e);
      return;
    }

    this.loadData(context).then(() => {
      this.state = { ...this.state, loading: false, loadError: null };
      this.renderReact();
    }).catch((err: unknown) => {
      const msg = err instanceof Error
        ? err.message
        : (typeof err === 'object' && err !== null)
          ? JSON.stringify(err)
          : String(err);
      console.error('[NpChecklist] loadData failed:', err);
      this.state = { ...this.state, loading: false, loadError: msg };
      this.renderReact();
    });
  }

  private async loadData(context: ComponentFramework.Context<IInputs>): Promise<void> {
    const sr = resolveSr(context);
    if (!sr) throw new Error('Cannot resolve Service Request context');

    const fv = (obj: ComponentFramework.WebApi.Entity, key: string): string =>
      (obj[`${key}@OData.Community.Display.V1.FormattedValue`] as string | undefined)
      ?? String(obj[key] ?? '');

    // ── Step 1: Get the onboarding ID from the service request ──
    console.log('[NpChecklist] SR entity:', sr.entityName, '| ID:', sr.entityId);
    const srRecord = await context.webAPI.retrieveRecord(
      sr.entityName,
      sr.entityId,
      '?$select=_syg_linkedonboardingid_value'
    );
    const onboardingId = (srRecord['_syg_linkedonboardingid_value'] as string | null) ?? '';
    console.log('[NpChecklist] CO id from SR:', onboardingId || '(empty)');
    if (!onboardingId) return;

    // ── Step 2: Get the client onboarding record (known-safe fields) ──
    const co = await context.webAPI.retrieveRecord(
      'syg_clientonboarding',
      onboardingId,
      '?$select=syg_risklevel,syg_pepcheck,syg_specialconditionsnp,' +
      'syg_aiareporting,_syg_relationshipmanagerid_value,_syg_referencecurrencyid_value,' +
      'syg_finsaclassification,syg_prospectapijson,syg_sygnumemployee'
    );
    console.log('[NpChecklist] CO fields:', Object.keys(co).join(', '));

    // ── Step 3: Parse prospect JSON (dateOfBirth, nationalities, ID doc, tax) ──
    let prospect: Record<string, unknown> = {};
    try {
      const raw = (co['syg_prospectapijson'] as string | null) ?? '';
      console.log('[NpChecklist] syg_prospectapijson length:', raw?.length ?? 0);
      if (raw) prospect = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) { console.warn('[NpChecklist] JSON parse failed:', e); }

    const idDet  = (prospect['identificationDetails'] as Record<string, unknown> | undefined) ?? {};
    const taxInfo = (prospect['taxInformation']        as Record<string, unknown> | undefined) ?? {};
    const nats    = Array.isArray(prospect['nationalities'])
      ? (prospect['nationalities'] as unknown[]).map(String)
      : [];

    this.state = {
      ...this.state,
      crmValues: {
        dateOfBirth:         formatDate((prospect['dateOfBirth'] as string | undefined) ?? null),
        nationalities:       nats.join(', '),
        clientSegment:       fv(co, 'syg_finsaclassification'),
        relationshipManager: fv(co, '_syg_relationshipmanagerid_value'),
        referenceCurrency:   fv(co, '_syg_referencecurrencyid_value'),
        riskLevel:           fv(co, 'syg_risklevel'),
        pepStatus:           fv(co, 'syg_pepcheck'),
        specialConditions:   (co['syg_specialconditionsnp'] as boolean | null) === true
          ? 'Client has special conditions'
          : (co['syg_specialconditionsnp'] as boolean | null) === false
            ? 'Client has NO special conditions'
            : '',
        aiaReporting:        fv(co, 'syg_aiareporting'),
        sygnumEmployee:      fv(co, 'syg_sygnumemployee'),
      },
      idDocument: idDet['documentNumber']
        ? {
            id:             '',
            documentType:   (idDet['documentType']   as string) ?? '',
            documentNumber: (idDet['documentNumber'] as string) ?? '',
            countryOfIssue: (idDet['issuanceCountry'] as string) ?? '',
            placeOfIssue:   (idDet['issuancePlace']  as string) ?? '',
            issueDate:      formatDate((idDet['documentIssueDate']  as string | undefined) ?? null),
            expirationDate: formatDate((idDet['documentExpiryDate'] as string | undefined) ?? null),
          }
        : null,
      taxRecords: (taxInfo['taxResidenceCountry'] || taxInfo['taxId'])
        ? [{ id: '', taxDomicile: (taxInfo['taxResidenceCountry'] as string) ?? '', taxId: (taxInfo['taxId'] as string) ?? '' }]
        : [],
    };
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.isReadOnly = context.mode.isControlDisabled;
    if (this.pendingOutput) {
      this.pendingOutput = false;
      return;
    }
    this.renderReact();
  }

  private handleOutputChanged(json: string): void {
    this.outputJson = json;
    this.pendingOutput = true;
    this.notifyOutputChanged();
  }

  private renderReact(): void {
    this.root.render(
      React.createElement(ChecklistRoot, {
        initialState: this.state,
        isReadOnly: this.isReadOnly,
        userName: this.userName,
        onOutputChanged: (json: string) => this.handleOutputChanged(json),
      })
    );
  }

  public getOutputs(): IOutputs {
    return { checkResults: this.outputJson } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
