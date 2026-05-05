import { buildDialogText } from '../utils/confirmationDialog';

describe('buildDialogText', () => {
  test('narrative', () => {
    const r = buildDialogText({ type: 'narrative', sectionLabel: 'X', fieldLabel: 'Professional Experience Summary' });
    expect(r.title).toContain('Replace Professional Experience Summary');
  });
  test('fieldSet count interpolation', () => {
    const r = buildDialogText({ type: 'fieldSet', sectionLabel: 'Personal Details', fieldCount: 7 });
    expect(r.title).toContain('Update 7 fields in Personal Details');
  });
  test('itemized re-run modifier', () => {
    const r = buildDialogText({ type: 'itemized', sectionLabel: 'X', entityLabel: 'Source of Wealth', itemCount: 3, isReRun: true });
    expect(r.title).toContain('duplicate records');
  });
  test('itemizedWithCreates lists new records', () => {
    const r = buildDialogText({
      type: 'itemizedWithCreates', sectionLabel: 'Related Parties',
      newContactCount: 2, newAccountCount: 1, existingCount: 3,
      newRecordNames: ['Anna', 'Sofia', 'Rossi Holdings AG'],
    });
    expect(r.title).toContain('2 new contact(s), 1 new account(s)');
    expect(r.title).toContain('6 related part(y/ies)');
    expect(r.subtitle).toBe('New records: Anna, Sofia, Rossi Holdings AG');
  });
});
