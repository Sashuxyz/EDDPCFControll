// Two-stage write for one Related Parties row.
//
// Stage 1: if syg_relatedpartyid is a CreateNewPartyRef, POST a new contact
//          or account with the supplied attributes (including new_typeofcontact = 9).
//          Capture the returned GUID. If POST fails, the row is failed; stage 2 is skipped.
// Stage 2: POST a syg_relatedclientparties junction row binding the parent KYC profile
//          and the polymorphic syg_relatedpartyid lookup to the (existing or newly-created)
//          contact/account. Polymorphic bind uses syg_relatedpartyid_account@odata.bind
//          or syg_relatedpartyid_contact@odata.bind based on etn.
//
// The optional contactsetname/accountsetname args let tests stub the entity-set names
// without depending on global window. Both default to the Dataverse standard plurals.

import { isValidGuid } from './guidValidation';
import { RelatedPartyRow, ExistingPartyRef, CreateNewPartyRef, PartyRef, NewContactAttributes, NewAccountAttributes, LookupRef } from '../types';

export interface RelatedPartyCreateResult {
  ok:                boolean;
  /** GUID of the junction row when stage 2 succeeds. */
  junctionId?:       string;
  /** GUID of the contact/account created in stage 1 (only set when createNew was used). */
  newPartyId?:       string;
  /** etn of the new party (only set when createNew was used). */
  newPartyEtn?:      'contact' | 'account';
  /** Stage where failure occurred. */
  failedAt?:         'party' | 'junction';
  /** Human-facing message. */
  error?:            string;
  /** When stage-2 fails after stage-1 created an orphan contact/account, this is the orphan's GUID. */
  orphanPartyId?:    string;
  orphanPartyEtn?:   'contact' | 'account';
}

const ENTITYSET_RELATEDCLIENTPARTIES = 'syg_relatedclientpartieses';
const ENTITYSET_CONTACTS = 'contacts';
const ENTITYSET_ACCOUNTS = 'accounts';

/** Polymorphic Customer @odata.bind key for syg_relatedpartyid. */
function partyBindKey(etn: 'contact' | 'account'): string {
  return etn === 'account' ? 'syg_relatedpartyid_account@odata.bind' : 'syg_relatedpartyid_contact@odata.bind';
}

/** Builds the body for the new contact/account POST.
 *
 * NB: the agent payload uses the syg_KYCProfile field names (syg_dateofbirth,
 * syg_accountholdernationalityid, syg_accountholderdomicileid, syg_domicilecountryid,
 * syg_mainbusinessactivityid) because that's the shape the agent already knows
 * for the KYC profile. The CONTACT and ACCOUNT entities use DIFFERENT field names
 * (verified against the SygnumKYC schema dump):
 *
 *   syg_dateofbirth                  → birthdate                    (contact)
 *   syg_accountholdernationalityid   → new_nationality1id@odata.bind (contact)
 *   syg_accountholderdomicileid      → new_countryid@odata.bind      (contact)
 *   syg_domicilecountryid            → new_countryid@odata.bind      (account)
 *   syg_mainbusinessactivityid       → NO EQUIVALENT on account — dropped silently.
 *
 * Mapping happens here so the agent payload contract stays stable; only this
 * write step knows the target entity's schema.
 */
function buildNewPartyBody(ref: CreateNewPartyRef): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (ref.etn === 'contact') {
    const a = ref.createNew as NewContactAttributes;
    if (a.firstname)                        out['firstname']                        = a.firstname;
    if (a.lastname)                         out['lastname']                         = a.lastname;
    if (a.fullname)                         out['fullname']                         = a.fullname;
    // multi-select picklist on the wire is a comma-separated string of int values
    if (a.new_typeofcontact !== undefined)  out['new_typeofcontact']                = String(a.new_typeofcontact);
    if (a.syg_dateofbirth)                  out['birthdate']                        = a.syg_dateofbirth;
    if (a.syg_accountholdernationalityid?.id) {
      out['new_nationality1id@odata.bind'] = `/new_countries(${a.syg_accountholdernationalityid.id})`;
    }
    if (a.syg_accountholderdomicileid?.id) {
      out['new_countryid@odata.bind']      = `/new_countries(${a.syg_accountholderdomicileid.id})`;
    }
    if (a.emailaddress1)                    out['emailaddress1']                    = a.emailaddress1;
    if (a.telephone1)                       out['telephone1']                       = a.telephone1;
  } else {
    const a = ref.createNew as NewAccountAttributes;
    if (a.new_typeofcontact !== undefined)  out['new_typeofcontact']                = String(a.new_typeofcontact);
    if (a.syg_domicilecountryid?.id) {
      out['new_countryid@odata.bind']      = `/new_countries(${a.syg_domicilecountryid.id})`;
    }
    // syg_mainbusinessactivityid has no equivalent attribute on the account
    // entity in the SygnumKYC schema. Drop silently — the agent's intent is
    // recorded on the syg_relatedclientparties junction row instead (via
    // syg_mainbusinessactivityid on that entity, which DOES exist).
    if (a.emailaddress1)                    out['emailaddress1']                    = a.emailaddress1;
    if (a.telephone1)                       out['telephone1']                       = a.telephone1;
    // accounts require a name; use the ref.name as the company name fallback
    if (ref.name)                           out['name']                             = ref.name;
  }
  return out;
}

/** Builds the body for the syg_relatedclientparties junction POST. */
function buildJunctionBody(
  row: RelatedPartyRow,
  kycProfileId: string,
  partyId: string,
  partyEtn: 'contact' | 'account',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Scalar properties use the LOGICAL name (lowercase). Only @odata.bind keys
  // use the navigation-property (PhysicalName/PascalCase) form.
  if (row.syg_name)                                     out['syg_name']                                                    = row.syg_name;
  out['syg_kycprofileid@odata.bind']                                                                                         = `/syg_kycprofiles(${kycProfileId})`;
  out[partyBindKey(partyEtn)]                                                                                                = `/${partyEtn === 'account' ? ENTITYSET_ACCOUNTS : ENTITYSET_CONTACTS}(${partyId})`;
  if (row.syg_relatedpartytypeid?.id)                   out['syg_relatedpartytypeid@odata.bind']                           = `/syg_kycproperties(${row.syg_relatedpartytypeid.id})`;
  // Nationality 1 / 2 use PascalCase nav prop names per schema dump
  if (row.syg_relatedpartynationality1id?.id)           out['syg_RelatedPartyNationality1ID@odata.bind']                   = `/new_countries(${row.syg_relatedpartynationality1id.id})`;
  if (row.syg_relatedpartynationality2id?.id)           out['syg_RelatedPartyNationality2ID@odata.bind']                   = `/new_countries(${row.syg_relatedpartynationality2id.id})`;
  if (row.syg_relatedpartynationality3id?.id)           out['syg_relatedpartynationality3id@odata.bind']                   = `/new_countries(${row.syg_relatedpartynationality3id.id})`;
  if (row.syg_domicilecountryid?.id)                    out['syg_domicilecountryid@odata.bind']                            = `/new_countries(${row.syg_domicilecountryid.id})`;
  if (row.syg_mainbusinessactivityid?.id)               out['syg_mainbusinessactivityid@odata.bind']                       = `/syg_businessactivitieses(${row.syg_mainbusinessactivityid.id})`;
  if (row.syg_maincountryofbusinessactivityid?.id)      out['syg_maincountryofbusinessactivityid@odata.bind']              = `/new_countries(${row.syg_maincountryofbusinessactivityid.id})`;
  // syg_relatedcountries and syg_riskscore intentionally not written
  // (removed from the UI in 0.7.2 per RM request — fields stay on the entity
  // but are no longer populated from the agent payload).
  if (row.syg_pep !== undefined)                        out['syg_pep']                                                     = row.syg_pep;
  if (row.syg_pepstatusid?.id)                          out['syg_pepstatusid@odata.bind']                                  = `/syg_kycproperties(${row.syg_pepstatusid.id})`;
  if (row.syg_peplevelid?.id)                           out['syg_peplevelid@odata.bind']                                   = `/syg_kycproperties(${row.syg_peplevelid.id})`;
  if (row.syg_comment)                                  out['syg_comment']                                                  = row.syg_comment;
  return out;
}

function isCreateNew(ref: PartyRef): ref is CreateNewPartyRef {
  return 'createNew' in ref;
}

function isExisting(ref: PartyRef): ref is ExistingPartyRef {
  return 'id' in ref && typeof (ref as ExistingPartyRef).id === 'string';
}

async function postJson(url: string, body: Record<string, unknown>): Promise<{ ok: boolean; status: number; created?: { id: string }; rawError?: string; message?: string }> {
  try {
    const resp = await fetch(url, {
      method:      'POST',
      credentials: 'include',
      headers: {
        'Content-Type':     'application/json',
        'OData-Version':    '4.0',
        'OData-MaxVersion': '4.0',
        'Accept':           'application/json',
        'Prefer':           'return=representation',
      },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      let json: unknown = null;
      try { json = await resp.json(); } catch { /* ignore */ }
      const id = typeof (json as { contactid?: string })?.contactid === 'string'
        ? (json as { contactid: string }).contactid
        : typeof (json as { accountid?: string })?.accountid === 'string'
          ? (json as { accountid: string }).accountid
          : typeof (json as { syg_relatedclientpartiesid?: string })?.syg_relatedclientpartiesid === 'string'
            ? (json as { syg_relatedclientpartiesid: string }).syg_relatedclientpartiesid
            : '';
      return { ok: true, status: resp.status, created: { id } };
    }
    let raw = '';
    try { raw = await resp.text(); } catch { /* ignore */ }
    let extracted = '';
    try {
      const parsed = JSON.parse(raw) as { error?: { message?: string } };
      if (parsed?.error?.message) extracted = parsed.error.message;
    } catch { /* not JSON */ }
    return { ok: false, status: resp.status, rawError: raw, message: extracted || raw };
  } catch (e) {
    return { ok: false, status: 0, message: (e as Error).message ?? String(e) };
  }
}

export async function createRelatedParty(
  kycProfileId: string,
  row: RelatedPartyRow,
): Promise<RelatedPartyCreateResult> {
  if (!isValidGuid(kycProfileId)) {
    return { ok: false, error: `invalid KYC profile GUID: ${kycProfileId}` };
  }
  const base = window.location.origin;

  // Resolve the party reference: either an existing GUID or a new contact/account.
  let partyId:  string;
  let partyEtn: 'contact' | 'account';
  let newPartyId: string | undefined;
  let newPartyEtn: 'contact' | 'account' | undefined;

  if (isExisting(row.syg_relatedpartyid)) {
    if (!isValidGuid(row.syg_relatedpartyid.id)) {
      return { ok: false, failedAt: 'party', error: `invalid related party GUID: ${row.syg_relatedpartyid.id}` };
    }
    partyId  = row.syg_relatedpartyid.id;
    partyEtn = row.syg_relatedpartyid.etn;
  } else if (isCreateNew(row.syg_relatedpartyid)) {
    partyEtn = row.syg_relatedpartyid.etn;
    const setName = partyEtn === 'account' ? ENTITYSET_ACCOUNTS : ENTITYSET_CONTACTS;
    const newBody = buildNewPartyBody(row.syg_relatedpartyid);
    // eslint-disable-next-line no-console
    console.info('[KycFullTakeover] createRelatedParty stage 1 — creating new party', { etn: partyEtn, body: newBody });
    const created = await postJson(`${base}/api/data/v9.2/${setName}`, newBody);
    if (!created.ok || !created.created?.id) {
      // eslint-disable-next-line no-console
      console.error('[KycFullTakeover] createRelatedParty stage 1 FAILED', { etn: partyEtn, status: created.status, message: created.message });
      return {
        ok: false,
        failedAt: 'party',
        error: `Could not create new ${partyEtn}: ${(created.message ?? '').slice(0, 1500)}`,
      };
    }
    partyId      = created.created.id;
    newPartyId   = partyId;
    newPartyEtn  = partyEtn;
  } else {
    return { ok: false, failedAt: 'party', error: 'syg_relatedpartyid is neither an existing nor a createNew reference' };
  }

  // Stage 2: junction row.
  const junctionBody = buildJunctionBody(row, kycProfileId, partyId, partyEtn);
  // eslint-disable-next-line no-console
  console.info('[KycFullTakeover] createRelatedParty stage 2 — creating junction', { body: junctionBody });
  const junction = await postJson(`${base}/api/data/v9.2/${ENTITYSET_RELATEDCLIENTPARTIES}`, junctionBody);
  if (!junction.ok) {
    // eslint-disable-next-line no-console
    console.error('[KycFullTakeover] createRelatedParty stage 2 FAILED', { status: junction.status, message: junction.message, orphan: newPartyId });
    return {
      ok: false,
      failedAt: 'junction',
      error: newPartyId
        ? `Junction failed AFTER creating ${partyEtn} ${newPartyId}: ${(junction.message ?? '').slice(0, 1500)}`
        : `Junction failed: ${(junction.message ?? '').slice(0, 1500)}`,
      orphanPartyId:  newPartyId,
      orphanPartyEtn: newPartyEtn,
    };
  }

  return {
    ok:           true,
    junctionId:   junction.created?.id,
    newPartyId,
    newPartyEtn,
  };
}

/** Map an existing or createNew party reference to a display name + etn for confirmation dialogs. */
export function describeParty(p: PartyRef): { name: string; etn: 'contact' | 'account'; isNew: boolean } {
  if (isCreateNew(p)) return { name: p.name, etn: p.etn, isNew: true };
  return { name: (p as ExistingPartyRef).name, etn: (p as ExistingPartyRef).etn, isNew: false };
}

/** Helper: count new contacts / accounts in a list of related-party rows (for confirmation dialog). */
export function countNewParties(rows: RelatedPartyRow[]): { newContacts: number; newAccounts: number; existing: number } {
  let newContacts = 0;
  let newAccounts = 0;
  let existing    = 0;
  for (const r of rows) {
    if (isCreateNew(r.syg_relatedpartyid)) {
      if (r.syg_relatedpartyid.etn === 'account') newAccounts += 1;
      else newContacts += 1;
    } else {
      existing += 1;
    }
  }
  return { newContacts, newAccounts, existing };
}

// Type imports kept for reference / test support
export type { RelatedPartyRow, LookupRef, PartyRef };
