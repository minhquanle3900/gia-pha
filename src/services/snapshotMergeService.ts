import type { GenealogyDatabaseSnapshot } from '../models/genealogy';
import { validateImportSnapshot } from './importValidationService';

export const SNAPSHOT_DATA_STORES = [
  'branches', 'people', 'unions', 'relationships', 'lifeEvents', 'media', 'stories',
] as const;

type SnapshotRecords = Pick<GenealogyDatabaseSnapshot, (typeof SNAPSHOT_DATA_STORES)[number]>;

interface SnapshotMergePreview {
  errors: string[];
  warnings: string[];
  additions?: SnapshotRecords;
}

// Key order and optional properties omitted by JSON do not change a backup record.
function canonicalRecord(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return nested;
    return Object.fromEntries(Object.keys(nested).sort().map((key) => [key, nested[key]]));
  });
}

export function planSnapshotMerge(
  existing: GenealogyDatabaseSnapshot,
  incoming: GenealogyDatabaseSnapshot
): SnapshotMergePreview {
  const input = validateImportSnapshot(incoming, { checkReferences: false });
  if (input.errors.length > 0) return input;

  const errors: string[] = [];
  const additions = {} as SnapshotRecords;
  const combined = { ...existing };
  for (const store of SNAPSHOT_DATA_STORES) {
    const existingById = new Map(existing[store].map((record) => [record.id, record]));
    const added = incoming[store].filter((record) => {
      const current = existingById.get(record.id);
      if (!current) return true;
      if (canonicalRecord(current) !== canonicalRecord(record)) {
        errors.push(`${store}[${record.id}]: trùng ID với bản ghi hiện có có nội dung khác.`);
      }
      return false;
    });
    // Each store receives only records from that same key.
    Object.assign(additions, { [store]: added });
    Object.assign(combined, { [store]: [...existing[store], ...added] });
  }

  const warnings = [
    'Hợp nhất giữ nguyên thiết lập hiện tại. Bản ghi giống hệt được giữ một lần, bản ghi cùng ID nhưng khác nội dung sẽ chặn nhập.',
  ];
  const incomingRoot = incoming.settings.rootPersonId;
  if (incomingRoot && !combined.people.some((person) => person.id === incomingRoot)) {
    errors.push('settings.rootPersonId trong tệp nhập tham chiếu đến thành viên không tồn tại.');
  }
  if (errors.length > 0) return { errors, warnings };

  const validation = validateImportSnapshot(combined);
  warnings.push(...validation.warnings);
  return {
    errors: validation.errors,
    warnings,
    additions: validation.errors.length === 0 ? additions : undefined,
  };
}
