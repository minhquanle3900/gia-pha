import { Person } from '../models/genealogy';
import { calculateUpcomingAnniversaries, UpcomingAnniversaryInfo } from './lunarCalendarService';

export interface NotificationSettings {
  enabled: boolean;
  leadDays: number[]; // e.g., [0, 1, 3, 7] (0: đúng ngày giỗ, 1: trước 1 ngày, 3: trước 3 ngày, 7: trước 7 ngày)
  allAncestors: boolean; // true = tất cả tiền nhân có ngày giỗ, false = chỉ những người được chọn
  trackedPersonIds: string[];
  soundEnabled: boolean;
  lastNotifiedLog: Record<string, string>; // `${personId}_${solarYear}_${leadDay}` -> timestamp
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  leadDays: [0, 1, 3],
  allAncestors: true,
  trackedPersonIds: [],
  soundEnabled: true,
  lastNotifiedLog: {},
};

const STORAGE_KEY = 'gia_pha_viet_notification_settings_v1';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

let memorySettingsCache: NotificationSettings | null = null;

export function loadNotificationSettings(): NotificationSettings {
  if (memorySettingsCache) return memorySettingsCache;
  if (typeof localStorage === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
      memorySettingsCache = parsed;
      return parsed;
    }
  } catch {
    // LocalStorage fallback
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  memorySettingsCache = settings;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save notification settings to localStorage', err);
  }
}

/**
 * Show a browser notification via Service Worker registration if available,
 * with standard Notification fallback.
 */
export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/icon.svg',
    badge: '/icon.svg',
    dir: 'auto',
    lang: 'vi',
    ...options,
  };

  // Try service worker registration first (works for PWAs and mobile background)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    } catch {
      // Fallback below
    }
  }

  // Standard window.Notification fallback
  try {
    const notif = new Notification(title, notificationOptions);
    if (options?.url) {
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
    return true;
  } catch (error) {
    console.warn('Notification constructor error:', error);
    return false;
  }
}

/**
 * Send a sample/test notification to verify browser permissions and sound
 */
export async function sendTestNotification(clanName = 'Gia Phả Việt'): Promise<boolean> {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') {
    return false;
  }

  return showBrowserNotification(`Gia Phả Việt – Nhắc Nhở Tiết Lễ Dòng Họ`, {
    body: `Thông báo trình duyệt đã kết nối thành công với ${clanName}. Bạn sẽ nhận được lời nhắc trước các ngày lễ kỵ và ngày giỗ tiền nhân.`,
    tag: 'test_notification',
  });
}

export interface ReminderTriggerResult {
  sentCount: number;
  triggeredAnniversaries: UpcomingAnniversaryInfo[];
}

/**
 * Evaluates upcoming death anniversaries and delivers push notifications
 * according to user lead-days preferences, avoiding duplicate alerts.
 */
export async function checkAndSendAnniversaryReminders(
  people: Person[],
  settings: NotificationSettings,
  clanName = 'Dòng Họ'
): Promise<ReminderTriggerResult> {
  if (!settings.enabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return { sentCount: 0, triggeredAnniversaries: [] };
  }

  const upcomingList = calculateUpcomingAnniversaries(people);
  const updatedLog = { ...settings.lastNotifiedLog };
  let sentCount = 0;
  const triggeredAnniversaries: UpcomingAnniversaryInfo[] = [];

  for (const item of upcomingList) {
    const { person, daysRemaining, lunarDay, lunarMonth, solarDate } = item;

    // Check if ancestor is tracked
    if (!settings.allAncestors && !settings.trackedPersonIds.includes(person.id)) {
      continue;
    }

    // Check if daysRemaining matches any of the user's preferred leadDays (e.g. 0, 1, 3, 7)
    const isDue = settings.leadDays.includes(daysRemaining);
    if (!isDue) continue;

    const eventYear = solarDate.getFullYear();
    const logKey = `${person.id}_${eventYear}_day${daysRemaining}`;

    // Already notified today / for this milestone?
    if (updatedLog[logKey]) {
      continue;
    }

    let title = '';
    let body = '';

    if (daysRemaining === 0) {
      title = `Hôm Nay: Lễ Giỗ ${person.fullName}`;
      body = `Hôm nay ngày ${lunarDay}/${lunarMonth} Âm lịch là ngày chính kỵ tưởng nhớ ${person.fullName}${
        person.clanRole ? ` (${person.clanRole})` : ''
      } của ${clanName}. Hãy dành thời gian dâng hương tưởng niệm.`;
    } else if (daysRemaining === 1) {
      title = `Ngày Mai: Lễ Giỗ ${person.fullName}`;
      body = `Ngày mai (${lunarDay}/${lunarMonth} Âm lịch) là ngày giỗ của ${person.fullName}${
        person.clanRole ? ` (${person.clanRole})` : ''
      }. Đã đến lúc chuẩn bị lễ vật và mâm cúng gia tiên.`;
    } else {
      title = `Sắp Đến: Lễ Giỗ ${person.fullName} (Còn ${daysRemaining} ngày)`;
      body = `Còn ${daysRemaining} ngày nữa đến ngày giỗ (${lunarDay}/${lunarMonth} ÂL) của ${person.fullName}${
        person.clanRole ? ` (${person.clanRole})` : ''
      }. Dương lịch tương ứng ngày ${solarDate.toLocaleDateString('vi-VN')}.`;
    }

    const success = await showBrowserNotification(title, {
      body,
      tag: `anniv_${person.id}_${daysRemaining}`,
      data: { personId: person.id, type: 'anniversary' },
    });

    if (success) {
      updatedLog[logKey] = new Date().toISOString();
      sentCount++;
      triggeredAnniversaries.push(item);
    }
  }

  if (sentCount > 0) {
    saveNotificationSettings({
      ...settings,
      lastNotifiedLog: updatedLog,
    });
  }

  return { sentCount, triggeredAnniversaries };
}
