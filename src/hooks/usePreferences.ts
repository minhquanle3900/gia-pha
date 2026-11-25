import { useEffect, useState } from 'react';
import { TreeViewMode } from '../models/genealogy';

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultTreeView: TreeViewMode;
  showLunarDates: boolean;
  showLivingStatus: boolean;
  compactNodes: boolean;
  autoCenterTree: boolean;
  activeBranchFilter?: string;
}

const PREF_STORAGE_KEY = 'gia_pha_viet_preferences_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  defaultTreeView: 'descendant',
  showLunarDates: true,
  showLivingStatus: true,
  compactNodes: false,
  autoCenterTree: true,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREF_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
      // Check system preference if no stored preference
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return { ...DEFAULT_PREFERENCES, theme: 'dark' };
      }
    } catch {
      // LocalStorage fallback
    }
    return DEFAULT_PREFERENCES;
  });

  // Cross-component preference synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomEvent = (e: Event) => {
      const customEvt = e as CustomEvent<UserPreferences>;
      if (customEvt.detail) {
        setPreferences(customEvt.detail);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === PREF_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('gia_pha_pref_changed', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('gia_pha_pref_changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Sync dark class on document.documentElement
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (preferences.theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [preferences.theme]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(next));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gia_pha_pref_changed', { detail: next }));
        }
      } catch {
        // Ignore write errors in private browsing
      }
      return next;
    });
  };

  const toggleTheme = () => {
    updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' });
  };

  return { preferences, updatePreferences, toggleTheme };
}
