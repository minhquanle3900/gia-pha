import { AppSettings, GenealogyDatabaseSnapshot } from '../models/genealogy';

export const BACKUP_TIMESTAMP_KEY = 'gia_pha_last_backup_timestamp';
export const BACKUP_SNOOZE_KEY = 'gia_pha_backup_snooze_until';
export const BACKUP_OVERDUE_DAYS = 30;

export interface BackupStatus {
  needsBackup: boolean;
  daysSinceBackup: number | null;
  lastBackupDate: string | null;
  formattedLastBackup: string;
  isOverdue: boolean;
  isSnoozed: boolean;
}

/**
 * Record the current timestamp as the latest backup time
 */
export function recordBackupTimestamp(isoString: string = new Date().toISOString()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, isoString);
    // Clear any snooze when an actual backup is completed
    localStorage.removeItem(BACKUP_SNOOZE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Get the last backup timestamp from localStorage or settings fallback
 */
export function getLastBackupTimestamp(settings?: AppSettings): string | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
      if (stored) return stored;
    } catch {
      // ignore
    }
  }

  if (settings?.lastBackupAt) {
    return settings.lastBackupAt;
  }

  return null;
}

/**
 * Check if the user has snoozed the backup banner
 */
export function isBackupSnoozed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const snoozeUntil = localStorage.getItem(BACKUP_SNOOZE_KEY);
    if (!snoozeUntil) return false;
    const snoozeTime = new Date(snoozeUntil).getTime();
    return !isNaN(snoozeTime) && Date.now() < snoozeTime;
  } catch {
    return false;
  }
}

/**
 * Snooze the backup banner for a given number of days (default 7 days)
 */
export function snoozeBackupReminder(days = 7): void {
  if (typeof window === 'undefined') return;
  try {
    const snoozeTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(BACKUP_SNOOZE_KEY, snoozeTime);
  } catch {
    // ignore
  }
}

/**
 * Calculate the backup status:
 * - If last backup was > 30 days ago: needsBackup = true, isOverdue = true
 * - If never backed up: needsBackup = true, isOverdue = true
 */
export function getBackupStatus(
  settings?: AppSettings,
  referenceDate: Date = new Date()
): BackupStatus {
  const lastBackupIso = getLastBackupTimestamp(settings);
  const snoozed = isBackupSnoozed();

  if (!lastBackupIso) {
    return {
      needsBackup: true,
      daysSinceBackup: null,
      lastBackupDate: null,
      formattedLastBackup: 'Chưa từng sao lưu',
      isOverdue: true,
      isSnoozed: snoozed,
    };
  }

  const backupTime = new Date(lastBackupIso).getTime();
  if (isNaN(backupTime)) {
    return {
      needsBackup: true,
      daysSinceBackup: null,
      lastBackupDate: null,
      formattedLastBackup: 'Không xác định',
      isOverdue: true,
      isSnoozed: snoozed,
    };
  }

  const diffMs = referenceDate.getTime() - backupTime;
  const daysSinceBackup = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isOverdue = daysSinceBackup >= BACKUP_OVERDUE_DAYS;

  // Format date in Vietnamese style
  const dateObj = new Date(backupTime);
  const formattedLastBackup = dateObj.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    needsBackup: isOverdue,
    daysSinceBackup,
    lastBackupDate: lastBackupIso,
    formattedLastBackup,
    isOverdue,
    isSnoozed: snoozed,
  };
}
