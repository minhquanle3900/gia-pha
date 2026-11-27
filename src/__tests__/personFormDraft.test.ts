import { describe, expect, it } from 'vitest';
import { createPersonFormDraft, personFormDraftFingerprint } from '../features/people/personFormDraft';
import type { Person } from '../models/genealogy';

const person: Person = {
  id: 'synthetic-modal-person', fullName: 'Thành viên kiểm thử', gender: 'female',
  isLiving: false, birthDate: { year: 1930, precision: 'year' },
  deathDate: { precision: 'month', year: 2000, month: 3 },
  deathAnniversaryLunar: { day: 2, month: 3, note: 'Ghi chú kiểm thử' },
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('person form draft closure decisions', () => {
  it('treats the default branch for a new person as clean initial state', () => {
    const initial = createPersonFormDraft(null, 'synthetic-default-branch');
    expect(initial.branchId).toBe('synthetic-default-branch');
    expect(personFormDraftFingerprint({ ...initial })).toBe(personFormDraftFingerprint(initial));
  });

  it('preserves an edited person without a branch instead of assigning the new-person default', () => {
    expect(createPersonFormDraft(person, 'different-branch').branchId).toBeUndefined();
  });

  it('preserves deceased and flexible-date defaults without marking the form dirty', () => {
    const draft = createPersonFormDraft(person);
    expect(draft).toMatchObject({ isLiving: false, lunarDay: 2, lunarMonth: 3 });
    expect(personFormDraftFingerprint(draft)).toBe(personFormDraftFingerprint({
      ...draft, birthDate: { precision: 'year', year: 1930 },
    }));
  });

  it('returns clean after editing and restoring a year when the input materializes its solar default', () => {
    const draft = createPersonFormDraft(person);
    const baseline = personFormDraftFingerprint(draft);
    expect(personFormDraftFingerprint({ ...draft, birthDate: { precision: 'year', year: 1931, calendar: 'solar' } })).not.toBe(baseline);
    expect(personFormDraftFingerprint({ ...draft, birthDate: { precision: 'year', year: 1930, calendar: 'solar' } })).toBe(baseline);
    expect(personFormDraftFingerprint({ ...draft, birthDate: { precision: 'year', year: 1930, calendar: 'lunar' } })).not.toBe(baseline);
  });

  it('returns clean after typing and clearing an initially blank year', () => {
    const draft = createPersonFormDraft();
    expect(personFormDraftFingerprint({ ...draft, birthDate: { precision: 'year', calendar: 'solar' } }))
      .toBe(personFormDraftFingerprint(draft));
  });

  it.each([
    ['fullName', 'Nháp tên'], ['gender', 'unknown'], ['commonName', 'Tên thường gọi'],
    ['tabooName', 'Tên húy'], ['courtesyName', 'Tên tự'], ['alias', 'Bí danh'],
    ['isLiving', true], ['birthDate', { precision: 'approx', year: 1931 }],
    ['birthPlace', 'Nơi sinh mẫu'], ['deathDate', { precision: 'year', year: 2001 }],
    ['deathPlace', 'Nơi mất mẫu'], ['ancestralHome', 'Nguyên quán mẫu'],
    ['residence', 'Nơi cư trú mẫu'], ['occupation', 'Nghề nghiệp mẫu'],
    ['biography', 'Tiểu sử nháp'], ['notes', 'Ghi chú nháp'], ['generation', 3],
    ['branchId', 'synthetic-branch'], ['subBranch', 'Phái mẫu'], ['clanRole', 'Vai vế mẫu'],
    ['lunarDay', 3], ['lunarMonth', 4], ['lunarNote', 'Đổi ghi chú giỗ'],
    ['burialPlace', 'Nơi an táng mẫu'], ['merits', 'Công đức nháp'],
  ])('detects a change to %s and becomes clean when that value is restored', (key, value) => {
    const original = createPersonFormDraft(person);
    const baseline = personFormDraftFingerprint(original);
    const changed = { ...original, [key]: value };
    expect(personFormDraftFingerprint(changed)).not.toBe(baseline);
    expect(personFormDraftFingerprint({ ...changed, [key]: original[key as keyof typeof original] })).toBe(baseline);
  });

  it('tracks a pending portrait replacement and removal without changing persisted person data', () => {
    const draft = createPersonFormDraft(person);
    const baseline = personFormDraftFingerprint(draft);
    expect(personFormDraftFingerprint(draft, { dataUrl: 'data:image/png;base64,AA==', mimeType: 'image/png' })).not.toBe(baseline);
    expect(personFormDraftFingerprint(draft, null, null, true)).not.toBe(baseline);
    expect(personFormDraftFingerprint(draft, null)).toBe(baseline);
    expect(personFormDraftFingerprint(draft, undefined)).toBe(baseline);
    expect(person.portraitMediaId).toBeUndefined();
  });

  it('protects an unaccepted AI biography proposal and clears when the proposal is dismissed', () => {
    const draft = createPersonFormDraft(person);
    const baseline = personFormDraftFingerprint(draft);
    expect(personFormDraftFingerprint(draft, undefined, 'Tiểu sử đề xuất kiểm thử')).not.toBe(baseline);
    expect(personFormDraftFingerprint(draft, undefined, null)).toBe(baseline);
  });
});
