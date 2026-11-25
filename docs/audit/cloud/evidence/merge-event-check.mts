import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { deletePersonSafely, loadFullSnapshot, replaceEntireDatabase, savePersonRecord } from '../../../../src/database/db.ts';
import { executeMergeRecords } from '../../../../src/services/duplicateMergeService.ts';
import type { GenealogyDatabaseSnapshot, Person } from '../../../../src/models/genealogy.ts';

const now = '2026-01-01T00:00:00.000Z';
const target: Person = { id: 'target', fullName: 'Hồ sơ mẫu', gender: 'unknown', isLiving: false, createdAt: now, updatedAt: now };
const source: Person = { ...target, id: 'source' };
const snapshot: GenealogyDatabaseSnapshot = {
  app: 'Gia Phả Việt – Cội Nguồn', schemaVersion: 1, exportedAt: now,
  settings: { id: 'default', clanName: 'Dữ liệu tổng hợp', clanMotto: '', ancestralHallLocation: '', schemaVersion: 1, updatedAt: now },
  people: [target, source], branches: [], relationships: [], unions: [], media: [], stories: [],
  lifeEvents: [{ id: 'event-1', personId: source.id, type: 'other', title: 'Sự kiện mẫu', createdAt: now, updatedAt: now }],
};
await replaceEntireDatabase(snapshot);
const plan = executeMergeRecords({
  targetPerson: target, sourcePerson: source, relationships: [], unions: [], media: [], lifeEvents: snapshot.lifeEvents,
});
assert.equal(plan.updatedLifeEvents[0]?.personId, target.id);
// Mirror the zero-edge, zero-union, zero-media path in DuplicateMergeModal.
await savePersonRecord(plan.mergedPerson);
await deletePersonSafely(plan.deletedPersonId);
const stored = await loadFullSnapshot();
assert.equal(stored.lifeEvents.length, 0, 'Baseline changed: check whether the event is now preserved');
console.log('GP-CLOUD-001 reproduced: one synthetic event planned for reassignment, zero events after save + source delete.');
