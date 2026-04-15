// NpOnboardingChecklist/index.ts
import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChecklistRoot } from './components/ChecklistRoot';
import { CheckState, AnswerValue, MismatchData, ManualNotDoneData } from './types';
import { parseCheckResults, resolveSrId, apiBase, formatDate, emptyCrmValues } from './utils';

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

    // Render loading state immediately
    this.renderReact();

    // Load CRM data asynchronously
    this.loadData(context).then(() => {
      this.state = { ...this.state, loading: false, loadError: null };
      this.renderReact();
    }).catch((err: unknown) => {
      this.state = { ...this.state, loading: false, loadError: String(err) };
      this.renderReact();
    });
  }

  private async loadData(context: ComponentFramework.Context<IInputs>): Promise<void> {
    const srId = resolveSrId(context);
    if (!srId) throw new Error('Cannot resolve Service Request ID');

    const base = apiBase();
    const creds: RequestInit = { credentials: 'include' };

    // ── Step 1: Fetch SR → expand onboarding → expand KYC + ID document ──
    const kycFields = 'syg_dateofbirth,syg_nationalities,syg_finsaclassification';
    const idFields = [
      'syg_identificationdocumentid',
      'syg_documenttype',
      'syg_documentnumber',
      'syg_countryofissueid',
      'syg_placeofissue',
      'syg_dateofissue',
      'syg_expirationdate',
    ].join(',');
    const coFields = [
      'syg_clientonboardingid',
      'syg_risklevel',
      'syg_pepcheck',
      'syg_specialconditions',
      'syg_aiareporting',
    ].join(',');

    const srUrl =
      `${base}/incidents(${srId})?$select=incidentid` +
      `&$expand=syg_linkedonboardingid(` +
        `$select=${coFields};` +
        `$expand=syg_relationshipmanagerid($select=systemuserid,fullname),` +
          `syg_referencecurrencyid($select=transactioncurrencyid,currencyname,isocurrencycode),` +
          `syg_kycprofilefrontinputid($select=${kycFields}),` +
          `syg_identificationdocumentid($select=${idFields})` +
      `)`;

    const srResp = await fetch(srUrl, creds);
    if (!srResp.ok) throw new Error(`SR fetch failed: ${srResp.status}`);
    const srData = await srResp.json() as Record<string, any>;

    const co = (srData['syg_linkedonboardingid'] as Record<string, any>) ?? {};
    const onboardingId: string = (co['syg_clientonboardingid'] as string) ?? '';
    const kyc = (co['syg_kycprofilefrontinputid'] as Record<string, any>) ?? {};
    const idDoc = (co['syg_identificationdocumentid'] as Record<string, any> | null) ?? null;
    const rm = (co['syg_relationshipmanagerid'] as Record<string, any>) ?? {};
    const currency = (co['syg_referencecurrencyid'] as Record<string, any>) ?? {};

    const fv = (obj: Record<string, any>, key: string): string =>
      (obj[`${key}@OData.Community.Display.V1.FormattedValue`] as string | undefined) ?? String(obj[key] ?? '');

    this.state = {
      ...this.state,
      crmValues: {
        dateOfBirth: formatDate(kyc['syg_dateofbirth'] as string | null | undefined),
        nationalities: (kyc['syg_nationalities'] as string) ?? '',
        clientSegment: fv(kyc, 'syg_finsaclassification'),
        relationshipManager: (rm['fullname'] as string) ?? '',
        referenceCurrency:
          (currency['currencyname'] as string) ?? (currency['isocurrencycode'] as string) ?? '',
        riskLevel: fv(co, 'syg_risklevel'),
        pepStatus: fv(co, 'syg_pepcheck'),
        specialConditions: (co['syg_specialconditions'] as string) ?? '',
        aiaReporting: fv(co, 'syg_aiareporting'),
      },
      idDocument: idDoc
        ? {
            id: (idDoc['syg_identificationdocumentid'] as string) ?? '',
            documentType: fv(idDoc, 'syg_documenttype'),
            documentNumber: (idDoc['syg_documentnumber'] as string) ?? '',
            countryOfIssue: fv(idDoc, 'syg_countryofissueid'),
            placeOfIssue: (idDoc['syg_placeofissue'] as string) ?? '',
            issueDate: formatDate(idDoc['syg_dateofissue'] as string | null | undefined),
            expirationDate: formatDate(idDoc['syg_expirationdate'] as string | null | undefined),
          }
        : null,
    };

    // ── Step 2: Fetch syg_taxationdetails linked to the onboarding record ──
    if (onboardingId) {
      const txUrl =
        `${base}/syg_taxationdetails?$filter=_syg_clientonboardingid_value eq '${onboardingId}'` +
        `&$select=syg_taxationdetailsid,syg_taxid` +
        `&$expand=syg_countryid($select=syg_countryid,syg_name)`;
      const txResp = await fetch(txUrl, creds);
      if (txResp.ok) {
        const txData = await txResp.json() as { value: Record<string, any>[] };
        this.state = {
          ...this.state,
          taxRecords: (txData.value ?? []).map((r: Record<string, any>) => ({
            id: (r['syg_taxationdetailsid'] as string) ?? '',
            taxDomicile:
              (r['syg_countryid'] as Record<string, any> | null)?.['syg_name'] as string
              ?? fv(r, 'syg_countryid'),
            taxId: (r['syg_taxid'] as string) ?? '',
          })),
        };
      }
    }
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.isReadOnly = context.mode.isControlDisabled;
    if (this.pendingOutput) {
      // D365 is echoing back our own output — skip re-render
      this.pendingOutput = false;
      return;
    }
    this.renderReact();
  }

  private handleOutputChanged(json: string): void {
    this.outputJson = json;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    // Do NOT call renderReact() here — React state manages UI updates internally
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
