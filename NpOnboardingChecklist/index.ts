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
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    context.mode.trackContainerResize(true);

    this.userName = (context.userSettings as any).userName ?? context.userSettings.userId ?? 'Unknown';

    // Restore saved answers before loading CRM data so UI is not blank while API calls run
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

    this.renderReact();

    this.loadData(context).then(() => {
      this.state = { ...this.state, loading: false, loadError: null };
      this.renderReact();
    }).catch((err: unknown) => {
      this.state = { ...this.state, loading: false, loadError: String(err) };
      this.renderReact();
    });
  }

  private async loadData(context: ComponentFramework.Context<IInputs>): Promise<void> {
    const sr = resolveSr(context);
    if (!sr) throw new Error('Cannot resolve Service Request context');

    // Formatted value helper — works for both option sets and lookup display names
    const fv = (obj: ComponentFramework.WebApi.Entity, key: string): string =>
      (obj[`${key}@OData.Community.Display.V1.FormattedValue`] as string | undefined)
      ?? String(obj[key] ?? '');

    // Retrieve one record safely — returns empty entity instead of throwing
    const safeGet = async (
      logicalName: string, id: string, options: string
    ): Promise<ComponentFramework.WebApi.Entity> => {
      try { return await context.webAPI.retrieveRecord(logicalName, id, options); }
      catch { return {} as ComponentFramework.WebApi.Entity; }
    };

    // ── Step 1: Get the onboarding ID from the service request ──
    // Lookup field on syg_servicerequest → syg_clientonboarding is syg_linkedclientonboarding
    const srRecord = await context.webAPI.retrieveRecord(
      sr.entityName,
      sr.entityId,
      '?$select=_syg_linkedclientonboarding_value'
    );
    const onboardingId = (srRecord['_syg_linkedclientonboarding_value'] as string | null) ?? '';
    if (!onboardingId) return; // no linked onboarding — leave defaults

    // ── Step 2: Get the client onboarding record ──
    const co = await context.webAPI.retrieveRecord(
      'syg_clientonboarding',
      onboardingId,
      '?$select=syg_clientonboardingid,syg_risklevel,syg_pepcheck,syg_specialconditions,' +
      'syg_aiareporting,_syg_relationshipmanagerid_value,_syg_referencecurrencyid_value,' +
      '_syg_kycprofilefrontinputid_value,_syg_identificationdocumentid_value'
    );

    const kycId    = (co['_syg_kycprofilefrontinputid_value']   as string | null) ?? '';
    const idDocId  = (co['_syg_identificationdocumentid_value'] as string | null) ?? '';

    // ── Step 3: KYC profile and ID document in parallel ──
    const [kyc, idDoc] = await Promise.all([
      kycId
        ? safeGet('syg_kycprofilefrontinput', kycId,
            '?$select=syg_dateofbirth,syg_nationalities,syg_finsaclassification')
        : Promise.resolve({} as ComponentFramework.WebApi.Entity),
      idDocId
        ? safeGet('syg_identificationdocuments', idDocId,
            '?$select=syg_identificationdocumentid,syg_documenttype,syg_documentnumber,' +
            '_syg_countryofissueid_value,syg_placeofissue,syg_dateofissue,syg_expirationdate')
        : Promise.resolve({} as ComponentFramework.WebApi.Entity),
    ]);

    this.state = {
      ...this.state,
      crmValues: {
        dateOfBirth:          formatDate(kyc['syg_dateofbirth'] as string | null | undefined),
        nationalities:        (kyc['syg_nationalities'] as string) ?? '',
        clientSegment:        fv(kyc, 'syg_finsaclassification'),
        relationshipManager:  fv(co,  '_syg_relationshipmanagerid_value'),
        referenceCurrency:    fv(co,  '_syg_referencecurrencyid_value'),
        riskLevel:            fv(co,  'syg_risklevel'),
        pepStatus:            fv(co,  'syg_pepcheck'),
        specialConditions:    (co['syg_specialconditions'] as string) ?? '',
        aiaReporting:         fv(co,  'syg_aiareporting'),
      },
      idDocument: idDocId
        ? {
            id:             idDocId,
            documentType:   fv(idDoc, 'syg_documenttype'),
            documentNumber: (idDoc['syg_documentnumber'] as string) ?? '',
            countryOfIssue: fv(idDoc, '_syg_countryofissueid_value'),
            placeOfIssue:   (idDoc['syg_placeofissue'] as string) ?? '',
            issueDate:      formatDate(idDoc['syg_dateofissue']      as string | null | undefined),
            expirationDate: formatDate(idDoc['syg_expirationdate']   as string | null | undefined),
          }
        : null,
    };

    // ── Step 4: Tax records linked to this onboarding ──
    try {
      const txResult = await context.webAPI.retrieveMultipleRecords(
        'syg_taxationdetails',
        `?$filter=_syg_clientonboardingid_value eq ${onboardingId}` +
        `&$select=syg_taxationdetailsid,syg_taxid,_syg_countryid_value`
      );
      this.state = {
        ...this.state,
        taxRecords: (txResult.entities ?? []).map((r: any) => ({
          id:          (r['syg_taxationdetailsid'] as string) ?? '',
          taxDomicile: (r['_syg_countryid_value@OData.Community.Display.V1.FormattedValue'] as string)
                       ?? (r['_syg_countryid_value'] as string) ?? '',
          taxId:       (r['syg_taxid'] as string) ?? '',
        })),
      };
    } catch {
      // tax details are optional; leave empty array on failure
    }
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
