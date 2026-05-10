import { countNewParties, describeParty } from '../utils/createRelatedParty';
import { RelatedPartyRow } from '../types';

const existingContact = (name: string): RelatedPartyRow['syg_relatedpartyid'] => ({
  id: '00000000-0000-0000-0000-000000000001',
  name,
  etn: 'contact',
});
const newContact = (name: string): RelatedPartyRow['syg_relatedpartyid'] => ({
  etn:  'contact',
  name,
  createNew: { firstname: 'X', lastname: 'Y', new_typeofcontact: 9 },
});
const newAccount = (name: string): RelatedPartyRow['syg_relatedpartyid'] => ({
  etn:  'account',
  name,
  createNew: { new_typeofcontact: 9 },
});

const rowOf = (party: RelatedPartyRow['syg_relatedpartyid']): RelatedPartyRow => ({
  syg_name:               party.name,
  syg_relatedpartyid:     party,
  syg_relatedpartytypeid: { id: '0', name: 'Type', etn: 'syg_kycproperty' },
});

describe('countNewParties', () => {
  test('all existing → only existing count', () => {
    const r = countNewParties([rowOf(existingContact('A')), rowOf(existingContact('B'))]);
    expect(r).toEqual({ newContacts: 0, newAccounts: 0, existing: 2 });
  });

  test('mixed', () => {
    const r = countNewParties([
      rowOf(existingContact('A')),
      rowOf(newContact('B')),
      rowOf(newAccount('C Co')),
      rowOf(newContact('D')),
    ]);
    expect(r).toEqual({ newContacts: 2, newAccounts: 1, existing: 1 });
  });

  test('empty list', () => {
    expect(countNewParties([])).toEqual({ newContacts: 0, newAccounts: 0, existing: 0 });
  });
});

describe('describeParty', () => {
  test('existing contact', () => {
    expect(describeParty(existingContact('Alice'))).toEqual({ name: 'Alice', etn: 'contact', isNew: false });
  });
  test('new contact', () => {
    expect(describeParty(newContact('Bob'))).toEqual({ name: 'Bob', etn: 'contact', isNew: true });
  });
  test('new account', () => {
    expect(describeParty(newAccount('Acme Inc.'))).toEqual({ name: 'Acme Inc.', etn: 'account', isNew: true });
  });
});
