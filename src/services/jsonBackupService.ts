import { SCHEMA_VERSION } from '../database/db';
import { GenealogyDatabaseSnapshot, Person } from '../models/genealogy';
import { normalizeVietnameseText } from '../utils/dateUtils';
import { ensureBase64DataUrl } from '../utils/imageUtils';
import { auditDatabaseIntegrity } from './validationService';

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
  const mediaWithBase64 = await Promise.all(
    snapshot.media.map(async (item) => ({
      ...item,
      dataUrl: await ensureBase64DataUrl(item.dataUrl),
    }))
  );

  const mediaMap = new Map(mediaWithBase64.map((m) => [m.id, m.dataUrl]));

  const peopleWithBase64: Person[] = await Promise.all(
    snapshot.people.map(async (p) => {
      let portraitUrl = p.portraitUrl;
      if (p.portraitMediaId && mediaMap.has(p.portraitMediaId)) {
        portraitUrl = mediaMap.get(p.portraitMediaId);
      } else if (portraitUrl) {
        portraitUrl = await ensureBase64DataUrl(portraitUrl);
      }
      return {
        ...p,
        portraitUrl,
      };
    })
  );

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
    people: peopleWithBase64,
    unions: snapshot.unions,
    relationships: snapshot.relationships,
    lifeEvents: snapshot.lifeEvents,
    media: mediaWithBase64,
    stories: snapshot.stories,
  };

  return JSON.stringify(payload, null, 2);
}

export function validateAndPreviewJsonBackup(
  rawText: string,
  existingSnapshot: GenealogyDatabaseSnapshot
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
    parsed = JSON.parse(rawText);
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
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof obj.schemaVersion !== 'number') {
    errors.push('Thiếu thông tin phiên bản cấu trúc dữ liệu (schemaVersion).');
  } else if (obj.schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `Phiên bản tệp sao lưu (v${obj.schemaVersion}) mới hơn phiên bản ứng dụng hiện tại (v${SCHEMA_VERSION}).`
    );
  }

  if (!Array.isArray(obj.people)) {
    errors.push('Thiếu danh sách thành viên (people) trong tệp sao lưu.');
  }
  if (!Array.isArray(obj.relationships)) {
    errors.push('Thiếu danh sách quan hệ huyết thống (relationships) trong tệp sao lưu.');
  }
  if (!Array.isArray(obj.unions)) {
    errors.push('Thiếu danh sách hôn phối (unions) trong tệp sao lưu.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      warnings,
      stats: emptyStats,
    };
  }

  const people = (obj.people as Person[]).filter(
    (p) => p && typeof p.id === 'string' && typeof p.fullName === 'string'
  );
  if (people.length !== (obj.people as unknown[]).length) {
    errors.push('Một số bản ghi thành viên bị thiếu mã định danh (id) hoặc họ tên (fullName).');
    return { valid: false, errors, warnings, stats: emptyStats };
  }

  const snapshot: GenealogyDatabaseSnapshot = {
    app: typeof obj.app === 'string' ? obj.app : 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: obj.schemaVersion as number,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    settings:
      obj.settings && typeof obj.settings === 'object'
        ? (obj.settings as GenealogyDatabaseSnapshot['settings'])
        : existingSnapshot.settings,
    branches: Array.isArray(obj.branches) ? obj.branches : [],
    people,
    unions: Array.isArray(obj.unions) ? obj.unions : [],
    relationships: Array.isArray(obj.relationships) ? obj.relationships : [],
    lifeEvents: Array.isArray(obj.lifeEvents) ? obj.lifeEvents : [],
    media: Array.isArray(obj.media) ? obj.media : [],
    stories: Array.isArray(obj.stories) ? obj.stories : [],
  };

  const integrityIssues = auditDatabaseIntegrity(snapshot);
  if (integrityIssues.length > 0) {
    warnings.push(...integrityIssues);
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

  if (exactIdConflicts > 0) {
    warnings.push(
      `Phát hiện ${exactIdConflicts} hồ sơ trùng mã định danh với dữ liệu hiện tại trên thiết bị.`
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
    exportedAt: '',
    settings: {
      id: 'default',
      clanName: '',
      clanMotto: '',
      ancestralHallLocation: '',
      schemaVersion: SCHEMA_VERSION,
      updatedAt: '',
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
