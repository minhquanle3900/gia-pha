import { useCallback, useEffect, useState } from 'react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../models/genealogy';
import {
  checkAndSendAnniversaryReminders,
  getNotificationPermission,
  isNotificationSupported,
  loadNotificationSettings,
  NotificationSettings,
  requestNotificationPermission,
  saveNotificationSettings,
  sendTestNotification as triggerTestNotification,
  showBrowserNotification,
} from '../services/notificationService';

export function useAnniversaryNotifications() {
  const { people, settings: clanSettings } = useGenealogy();

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [settings, setSettings] = useState<NotificationSettings>(loadNotificationSettings);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = isNotificationSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...updates };
        saveNotificationSettings(next);
        return next;
      });
    },
    []
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const nextPerm = await requestNotificationPermission();
    setPermission(nextPerm);
    return nextPerm === 'granted';
  }, []);

  const sendTest = useCallback(async () => {
    const result = await triggerTestNotification(clanSettings.clanName);
    setPermission(getNotificationPermission());
    return result;
  }, [clanSettings.clanName]);

  const togglePersonTracking = useCallback(
    (personId: string) => {
      setSettings((prev) => {
        const isTracked = prev.trackedPersonIds.includes(personId);
        const nextTracked = isTracked
          ? prev.trackedPersonIds.filter((id) => id !== personId)
          : [...prev.trackedPersonIds, personId];

        const next = { ...prev, trackedPersonIds: nextTracked };
        saveNotificationSettings(next);
        return next;
      });
    },
    []
  );

  const isPersonTracked = useCallback(
    (personId: string) => {
      if (settings.allAncestors) return true;
      return settings.trackedPersonIds.includes(personId);
    },
    [settings.allAncestors, settings.trackedPersonIds]
  );

  /**
   * Send an immediate browser reminder for a specific ancestor
   */
  const sendImmediateReminderForPerson = useCallback(
    async (person: Person): Promise<boolean> => {
      let currentPerm = permission;
      if (currentPerm !== 'granted') {
        const requested = await requestPermission();
        if (!requested) return false;
        currentPerm = 'granted';
      }

      const lunar = person.deathAnniversaryLunar;
      const lunarDateText =
        lunar?.day && lunar?.month
          ? `ngày ${lunar.day}/${lunar.month} Âm lịch`
          : lunar?.note || 'tiết giỗ hàng năm';

      return showBrowserNotification(`Lời Nhắc Lễ Giỗ: ${person.fullName}`, {
        body: `Ngày giỗ của ${person.fullName}${
          person.clanRole ? ` (${person.clanRole})` : ''
        } diễn ra vào ${lunarDateText}. Hãy chu toàn chuẩn bị lễ vật và dâng hương gia tiên.`,
        tag: `manual_anniv_${person.id}`,
      });
    },
    [permission, requestPermission]
  );

  // Automatically check reminders on load if enabled
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted' || people.length === 0) {
      return;
    }

    // Run check once per mount/session
    checkAndSendAnniversaryReminders(people, settings, clanSettings.clanName).catch((err) => {
      console.warn('Auto reminder check error:', err);
    });
  }, [settings.enabled, permission, people, clanSettings.clanName]);

  const checkRemindersNow = useCallback(async () => {
    return checkAndSendAnniversaryReminders(people, settings, clanSettings.clanName);
  }, [people, settings, clanSettings.clanName]);

  return {
    isSupported,
    permission,
    settings,
    updateSettings,
    requestPermission,
    sendTestNotification: sendTest,
    sendImmediateReminderForPerson,
    togglePersonTracking,
    isPersonTracked,
    checkRemindersNow,
  };
}
