// Builds the parameters for Xrm.Navigation.openForm to open a pre-populated
// email activity record. The "regarding" lookup binds the email to the KYC
// profile; "to" is the proposed recipient (typically a lead in Phase 1).
//
// Hardening (F-04 from 2026-05-12 review):
//   - `etn` is restricted to an allow-list of types that legitimately appear
//     as an email recipient party. A compromised agent that ships
//     `etn: 'queue'` or `etn: 'systemuser'` would otherwise be able to
//     funnel KYC content to internal queues / users via the RM's draft.
//   - `id` is validated as a GUID before it ever reaches the form parameter.
//     Invalid recipients are dropped silently.
//   - Subject and body are capped at sane lengths so a giant payload can't
//     hang the email form.
//   - The kycProfileId is validated before binding it as the regarding lookup.

import { ProposedEmail } from '../types';
import { isValidGuid } from './guidValidation';

/** Entity types a draft email's `to` party may legitimately reference.
 *  Anything outside this allow-list is dropped before reaching the form. */
const ALLOWED_RECIPIENT_ETN: ReadonlySet<string> = new Set(['lead', 'contact', 'account']);

/** D365 email subject lines are practically capped at ~200 chars; we hard
 *  cap at 250 with a "…" trailer to defend against payload bloat. */
const SUBJECT_MAX = 250;

/** Email body cap. Real emails > 50 KB are unusual; the field accepts much
 *  more but this caps the agent's room to inject unbounded text into the
 *  RM's draft. */
const BODY_MAX = 50_000;

interface XrmNavigationLike {
  openForm?: (options: {
    entityName: string;
    createFromEntity?: { entityType: string; id: string; name?: string };
  }, parameters?: Record<string, unknown>) => Promise<unknown>;
}

function clampString(s: string | undefined, cap: number): string {
  if (typeof s !== 'string') return '';
  if (s.length <= cap) return s;
  return s.slice(0, cap - 1) + '…';
}

export async function openProposedEmail(
  email: ProposedEmail,
  kycProfileId: string,
  kycProfileName: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isValidGuid(kycProfileId)) {
    return { ok: false, error: 'invalid KYC profile GUID' };
  }
  const xrm = (window as unknown as { Xrm?: { Navigation?: XrmNavigationLike } }).Xrm;
  if (!xrm?.Navigation?.openForm) {
    return { ok: false, error: 'Xrm.Navigation.openForm unavailable' };
  }

  // Allow-list etn + validate GUID. Anything that fails either check is
  // silently dropped — the agent's intent to copy a "queue" or "systemuser"
  // into the recipient list is rejected.
  const toParam = email.to
    .filter((ref) => {
      const etn = ref.etn ?? 'lead';
      return ALLOWED_RECIPIENT_ETN.has(etn) && isValidGuid(ref.id);
    })
    .map((ref) => ({
      id:           ref.id,
      // Display name is shown in the form's "To" chip; clamp so an oversized
      // name can't blow up the chip rendering.
      name:         clampString(ref.name, 200),
      entityType:   ref.etn ?? 'lead',
    }));

  try {
    await xrm.Navigation.openForm(
      { entityName: 'email' },
      {
        subject:               clampString(email.subject, SUBJECT_MAX),
        description:           clampString(email.body, BODY_MAX),
        regardingobjectid:     kycProfileId,
        regardingobjectidname: clampString(kycProfileName, 200),
        regardingobjectidtype: 'syg_kycprofile',
        to:                    JSON.stringify(toParam),
      },
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message ?? String(e) };
  }
}
