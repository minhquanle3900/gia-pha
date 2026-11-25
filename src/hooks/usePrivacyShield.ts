import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY_PIN_HASH = 'giaphaviet_privacy_pin_hash';
const STORAGE_KEY_IS_SHIELDED = 'giaphaviet_privacy_shield_active';

/**
 * Computes a SHA-256 hash string from a PIN
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`gpv_salt_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function usePrivacyShield() {
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);

  useEffect(() => {
    const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
    const storedActive = localStorage.getItem(STORAGE_KEY_IS_SHIELDED);
    setHasPin(Boolean(storedHash));
    setIsShieldActive(storedActive === 'true');
  }, []);

  const setPin = useCallback(async (newPin: string): Promise<boolean> => {
    if (!newPin || newPin.length < 4) return false;
    const hash = await hashPin(newPin);
    localStorage.setItem(STORAGE_KEY_PIN_HASH, hash);
    localStorage.setItem(STORAGE_KEY_IS_SHIELDED, 'true');
    setHasPin(true);
    setIsShieldActive(true);
    return true;
  }, []);

  const verifyPin = useCallback(async (enteredPin: string): Promise<boolean> => {
    const storedHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
    if (!storedHash) return true; // No PIN set
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash;
  }, []);

  const unlockShield = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin);
    if (ok) {
      setIsShieldActive(false);
      localStorage.setItem(STORAGE_KEY_IS_SHIELDED, 'false');
      return true;
    }
    return false;
  }, [verifyPin]);

  const lockShield = useCallback(() => {
    setIsShieldActive(true);
    localStorage.setItem(STORAGE_KEY_IS_SHIELDED, 'true');
  }, []);

  const removePin = useCallback(async (currentPin: string): Promise<boolean> => {
    const ok = await verifyPin(currentPin);
    if (ok) {
      localStorage.removeItem(STORAGE_KEY_PIN_HASH);
      localStorage.setItem(STORAGE_KEY_IS_SHIELDED, 'false');
      setHasPin(false);
      setIsShieldActive(false);
      return true;
    }
    return false;
  }, [verifyPin]);

  return {
    hasPin,
    isShieldActive,
    setPin,
    verifyPin,
    unlockShield,
    lockShield,
    removePin,
  };
}
