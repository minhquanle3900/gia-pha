import { SCHEMA_VERSION } from '../database/db';
import { GenealogyDatabaseSnapshot } from '../models/genealogy';
import { normalizeVietnameseText } from '../utils/dateUtils';
import { validateImportSnapshot } from './importValidationService';
import { planSnapshotMerge } from './snapshotMergeService';

export interface JsonImportPreview {
  valid: boolean;
  errors: string[];
  warnings: string[];
  snapshot?: GenealogyDatabaseSnapshot;
  stats: {
    peopleCount: number;
    unionsCount: number;
    relationshipsCount: number;
    branchesCount: number;
    lifeEventsCount: number;
    mediaCount: number;
    storiesCount: number;
    exactIdConflicts: number;
    potentialNameDuplicates: Array<{ importedName: string; existingName: string; birthYear?: number }>;
  };
}

export async function serializeDatabaseBackup(
  snapshot: GenealogyDatabaseSnapshot
): Promise<string> {
  // Export record values as stored. Rendering can resolve an ID-only portrait,
  // but adding a derived URL here makes a backup conflict with its own source.
  const payload: GenealogyDatabaseSnapshot = {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      ...snapshot.settings,
      schemaVersion: SCHEMA_VERSION,
      lastBackupAt: new Date().toISOString(),
    },
    branches: snapshot.branches,
    people: snapshot.people,
    unions: snapshot.unions,
    relationships: snapshot.relationships,
    lifeEvents: snapshot.lifeEvents,
    media: snapshot.media,
    stories: snapshot.stories,
  };

  return JSON.stringify(payload, null, 2);
}

export function validateAndPreviewJsonBackup(
  rawText: string,
  existingSnapshot: GenealogyDatabaseSnapshot,
  mode: 'replace' | 'merge' = 'replace'
): JsonImportPreview {
  const emptyStats = {
    peopleCount: 0,
    unionsCount: 0,
    relationshipsCount: 0,
    branchesCount: 0,
    lifeEventsCount: 0,
    mediaCount: 0,
    storiesCount: 0,
    exactIdConflicts: 0,
    potentialNameDuplicates: [],
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText.replace(/^\uFEFF/, ''));
  } catch {
    return {
      valid: false,
      errors: ['Tệp không phải định dạng JSON hợp lệ hoặc đã bị hỏng trong quá trình tải xuống.'],
      warnings: [],
      stats: emptyStats,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      errors: ['Cấu trúc gốc của tệp JSON không hợp lệ.'],
      warnings: [],
      stats: emptyStats,
    };
  }

  const obj = parsed as Record<string, unknown>;
  const warnings: string[] = [];
  const normalized: Record<string, unknown> = { ...obj };

  // The original v1 reader allowed these properties to be absent. Only fill
  // missing fields, and disclose the defaults before replacing a database.
  if (!('app' in obj)) normalized.app = 'Gia Phả Việt – Cội Nguồn';
  if (!('exportedAt' in obj)) normalized.exportedAt = new Date().toISOString();
  if (!('settings' in obj)) {
    normalized.settings = { ...existingSnapshot.settings, rootPersonId: undefined };
    warnings.push('Bản sao lưu v1 thiếu settings. Dùng thiết lập mặc định hoặc hiện có, bỏ chỉ định gốc trong bản khôi phục.');
  }
  const absentStores = ['branches', 'lifeEvents', 'media', 'stories'].filter((store) => !(store in obj));
  for (const store of absentStores) normalized[store] = [];
  if (absentStores.length > 0) {
    warnings.push(`Bản sao lưu v1 thiếu ${absentStores.join(', ')}. Những danh sách này được đọc là rỗng.`);
  }

  const input = validateImportSnapshot(normalized, { checkReferences: mode === 'replace' });
  if (input.errors.length > 0) {
    return { valid: false, errors: input.errors, warnings: [...warnings, ...input.warnings], stats: emptyStats };
  }

  const snapshot = normalized as unknown as GenealogyDatabaseSnapshot;
  const result = mode === 'merge' ? planSnapshotMerge(existingSnapshot, snapshot) : input;
  warnings.push(...result.warnings);
  if (result.errors.length > 0) {
    return { valid: false, errors: result.errors, warnings, stats: emptyStats };
  }

  const existingIds = new Set(existingSnapshot.people.map((p) => p.id));
  let exactIdConflicts = 0;
  const potentialNameDuplicates: Array<{
    importedName: string;
    existingName: string;
    birthYear?: number;
  }> = [];

  for (const imp of snapshot.people) {
    if (existingIds.has(imp.id)) {
      exactIdConflicts++;
      continue;
    }
    const normImp = normalizeVietnameseText(imp.fullName);
    const match = existingSnapshot.people.find((ex) => {
      const sameName = normalizeVietnameseText(ex.fullName) === normImp;
      if (!sameName) return false;
      if (imp.birthDate?.year && ex.birthDate?.year) {
        return imp.birthDate.year === ex.birthDate.year;
      }
      return true;
    });
    if (match) {
      potentialNameDuplicates.push({
        importedName: imp.fullName,
        existingName: match.fullName,
        birthYear: imp.birthDate?.year,
      });
    }
  }

  if (exactIdConflicts > 0 && mode === 'merge') {
    warnings.push(
      `Phát hiện ${exactIdConflicts} hồ sơ giống hệt đã có trên thiết bị.`
    );
  }
  if (potentialNameDuplicates.length > 0) {
    warnings.push(
      `Phát hiện ${potentialNameDuplicates.length} hồ sơ có cùng họ tên/năm sinh với thành viên đã có.`
    );
  }

  return {
    valid: true,
    errors: [],
    warnings,
    snapshot,
    stats: {
      peopleCount: snapshot.people.length,
      unionsCount: snapshot.unions.length,
      relationshipsCount: snapshot.relationships.length,
      branchesCount: snapshot.branches.length,
      lifeEventsCount: snapshot.lifeEvents.length,
      mediaCount: snapshot.media.length,
      storiesCount: snapshot.stories.length,
      exactIdConflicts,
      potentialNameDuplicates,
    },
  };
}

export async function exportDatabaseSnapshotJson(snapshot: GenealogyDatabaseSnapshot): Promise<void> {
  const jsonStr = await serializeDatabaseBackup(snapshot);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GiaPhaViet-${(snapshot.settings.clanName || 'Data').replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Record export timestamp in localStorage for backup monitoring
  try {
    const { recordBackupTimestamp } = await import('./backupReminderService');
    recordBackupTimestamp();
  } catch {
    // ignore
  }
}

export function parseAndValidateJsonBackup(rawText: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  snapshot?: GenealogyDatabaseSnapshot;
} {
  const preview = validateAndPreviewJsonBackup(rawText, {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      id: 'default',
      clanName: '',
      clanMotto: '',
      ancestralHallLocation: '',
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    },
    branches: [],
    people: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
  });

  return {
    valid: preview.valid,
    errors: preview.errors,
    warnings: preview.warnings,
    snapshot: preview.snapshot,
  };
}
