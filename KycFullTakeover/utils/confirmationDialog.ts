// Five type-templated confirmation dialogs. Triggered via Xrm.Navigation.openConfirmDialog.
// See spec section "Confirmation dialogs" for the canonical copy.

export type SectionDialogType =
  | 'narrative'
  | 'fieldSet'
  | 'itemized'
  | 'itemizedWithCreates'
  | 'nton';

export interface DialogParams {
  type:           SectionDialogType;
  sectionLabel:   string;          // human label of the section ("Personal Details")
  fieldLabel?:    string;          // for narrative type ("Professional Experience Summary")
  fieldCount?:    number;          // for fieldSet type
  itemCount?:     number;          // for itemized / nton type
  entityLabel?:   string;          // for itemized / nton ("Source of Wealth", "Country")
  // for itemizedWithCreates (Related Parties only):
  newContactCount?: number;
  newAccountCount?: number;
  existingCount?:   number;
  newRecordNames?:  string[];      // shown on second line
  // for re-run modifier:
  isReRun?: boolean;
}

export function buildDialogText(p: DialogParams): { title: string; subtitle?: string } {
  const reRunSuffix = (() => {
    if (!p.isReRun) return '';
    if (p.type === 'itemized' || p.type === 'itemizedWithCreates') {
      return '\n\n⚠ Already taken over once — this will create duplicate records. Delete existing rows manually first if you want a clean re-import.';
    }
    if (p.type === 'nton') {
      return '\n\n⚠ Already-associated records will be silently ignored; only missing associations will be added.';
    }
    return '';   // narrative + fieldSet are idempotent
  })();

  switch (p.type) {
    case 'narrative':
      return {
        title: `Replace ${p.fieldLabel ?? p.sectionLabel} with the AI-extracted text? Existing content will be overwritten.${reRunSuffix}`,
      };
    case 'fieldSet':
      return {
        title: `Update ${p.fieldCount ?? 0} fields in ${p.sectionLabel}? Existing values will be replaced.${reRunSuffix}`,
      };
    case 'itemized':
      return {
        title: `Create ${p.itemCount ?? 0} ${p.entityLabel ?? 'record'}(s)? This will add new rows to the ${p.entityLabel ?? 'record'} subgrid.${reRunSuffix}`,
      };
    case 'itemizedWithCreates': {
      const total = (p.existingCount ?? 0) + (p.newContactCount ?? 0) + (p.newAccountCount ?? 0);
      const breakdown = `${p.existingCount ?? 0} existing + ${(p.newContactCount ?? 0) + (p.newAccountCount ?? 0)} new`;
      const main = `This takeover will create ${p.newContactCount ?? 0} new contact(s), ${p.newAccountCount ?? 0} new account(s), and link ${total} related part(y/ies) total (${breakdown}). New contact/account creation cannot be undone automatically. Proceed?${reRunSuffix}`;
      const subtitle = (p.newRecordNames && p.newRecordNames.length > 0)
        ? 'New records: ' + p.newRecordNames.join(', ')
        : undefined;
      return { title: main, subtitle };
    }
    case 'nton':
      return {
        title: `Associate this profile with ${p.itemCount ?? 0} ${p.entityLabel ?? 'record'}(s)?${reRunSuffix}`,
      };
  }
}

interface XrmNavigationLike {
  openConfirmDialog?: (
    confirmStrings: { title?: string; subtitle?: string; text?: string; confirmButtonLabel?: string; cancelButtonLabel?: string }
  ) => Promise<{ confirmed: boolean }>;
}

// Returns true if the user confirmed; false if cancelled or Xrm unavailable.
export async function showConfirmation(p: DialogParams): Promise<boolean> {
  const { title, subtitle } = buildDialogText(p);
  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigationLike } }).Xrm;
  if (!xrm?.Navigation?.openConfirmDialog) {
    // eslint-disable-next-line no-console
    console.warn('[KycFullTakeover] Xrm.Navigation.openConfirmDialog unavailable — auto-cancel');
    return false;
  }
  try {
    const result = await xrm.Navigation.openConfirmDialog({
      title: 'Confirm takeover',
      subtitle,
      text: title,
      confirmButtonLabel: 'Take over',
      cancelButtonLabel:  'Cancel',
    });
    return result.confirmed === true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[KycFullTakeover] confirmation dialog failed', e);
    return false;
  }
}
