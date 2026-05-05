// Builds the parameters for Xrm.Navigation.openForm to open a pre-populated
// email activity record. The "regarding" lookup binds the email to the KYC
// profile; "to" is the proposed recipient (typically a lead in Phase 1).

import { ProposedEmail } from '../types';

interface XrmNavigationLike {
  openForm?: (options: {
    entityName: string;
    createFromEntity?: { entityType: string; id: string; name?: string };
  }, parameters?: Record<string, unknown>) => Promise<unknown>;
}

export async function openProposedEmail(
  email: ProposedEmail,
  kycProfileId: string,
  kycProfileName: string,
): Promise<{ ok: boolean; error?: string }> {
  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigationLike } }).Xrm;
  if (!xrm?.Navigation?.openForm) {
    return { ok: false, error: 'Xrm.Navigation.openForm unavailable' };
  }

  // Compose partylist string for "to" — D365 accepts lead/contact/account refs
  // in the "to" parameter as a semicolon-separated list of GUIDs prefixed by
  // entity logical name. The simpler approach used here: pass via the form
  // parameters dict, which D365 maps to the email form's "to" partylist.
  const toParam = email.to.map((ref) => ({
    id:           ref.id,
    name:         ref.name,
    entityType:   ref.etn ?? 'lead',
  }));

  try {
    await xrm.Navigation.openForm(
      { entityName: 'email' },
      {
        subject:     email.subject,
        description: email.body,
        regardingobjectid:        kycProfileId,
        regardingobjectidname:    kycProfileName,
        regardingobjectidtype:    'syg_kycprofile',
        to: JSON.stringify(toParam),
      },
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}
