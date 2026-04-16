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
    const odataFetch = async (url: string): Promise<Record<string, any>> => {
      const resp = await fetch(url, {
        credentials: 'include',
        headers: {
          'OData-Version': '4.0',
          'OData-MaxVersion': '4.0',
          'Accept': 'application/json',
          'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
        },
      });
      if (!resp.ok) {
        let detail = '';
        try {
          const body = await resp.json();
          detail = body?.error?.message ?? JSON.stringify(body);
        } catch { /* ignore */ }
        throw new Error(`${resp.status} ${resp.statusText}${detail ? ` - ${detail}` : ''}`);
      }
      return resp.json() as Promise<Record<string, any>>;
    };

    const fv = (obj: Record<string, any>, key: string): string =>
      (obj[`${key}@OData.Community.Display.V1.FormattedValue`] as string | undefined) ?? String(obj[key] ?? '');

    // ── Step 1: Fetch SR to get the linked onboarding GUID via raw lookup column ──
    const srData = await odataFetch(
      `${base}/incidents(${srId})?$select=incidentid,_syg_linkedonboardingid_value`
    );
    const onboardingId: string = (srData['_syg_linkedonboardingid_value'] as string) ?? '';
    if (!onboardingId) return; // no linked onboarding; leave defaults

    // ── Step 2: Fetch the client onboarding with its related records via $expand ──
    const coFields = [
      'syg_clientonboardingid',
      'syg_risklevel',
      'syg_pepcheck',
      'syg_specialconditions',
      'syg_aiareporting',
    ].join(',');
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

    const coUrl =
      `${base}/syg_clientonboardings(${onboardingId})?$select=${coFields}` +
      `&$expand=syg_relationshipmanagerid($select=systemuserid,fullname),` +
        `syg_referencecurrencyid($select=transactioncurrencyid,currencyname,isocurrencycode),` +
        `syg_kycprofilefrontinputid($select=${kycFields}),` +
        `syg_identificationdocumentid($select=${idFields})`;

    const co = await odataFetch(coUrl);
    const kyc = (co['syg_kycprofilefrontinputid'] as Record<string, any>) ?? {};
    const idDoc = (co['syg_identificationdocumentid'] as Record<string, any> | null) ?? null;
    const rm = (co['syg_relationshipmanagerid'] as Record<string, any>) ?? {};
    const currency = (co['syg_referencecurrencyid'] as Record<string, any>) ?? {};

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

    // ── Step 3: Fetch syg_taxationdetails linked to the onboarding record ──
    // OData v4 requires GUIDs in $filter to be unquoted.
    try {
      const txData = await odataFetch(
        `${base}/syg_taxationdetails?$filter=_syg_clientonboardingid_value eq ${onboardingId}` +
        `&$select=syg_taxationdetailsid,syg_taxid` +
        `&$expand=syg_countryid($select=syg_countryid,syg_name)`
      );
      const values = (txData['value'] as Record<string, any>[] | undefined) ?? [];
      this.state = {
        ...this.state,
        taxRecords: values.map((r) => ({
          id: (r['syg_taxationdetailsid'] as string) ?? '',
          taxDomicile:
            (r['syg_countryid'] as Record<string, any> | null)?.['syg_name'] as string
            ?? fv(r, 'syg_countryid'),
          taxId: (r['syg_taxid'] as string) ?? '',
        })),
      };
    } catch {
      // tax details are optional; leave empty on failure
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
