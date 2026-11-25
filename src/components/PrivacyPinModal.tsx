import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Shield, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { usePrivacyShield } from '../hooks/usePrivacyShield';

interface PrivacyPinModalProps {
  open: boolean;
  mode?: 'unlock' | 'setup' | 'change';
  defaultMode?: 'unlock' | 'setup' | 'change';
  onClose: () => void;
  onSuccess?: () => void;
}

export const PrivacyPinModal: React.FC<PrivacyPinModalProps> = ({
  open,
  mode,
  defaultMode = 'unlock',
  onClose,
  onSuccess,
}) => {
  const effectiveMode = mode || defaultMode;
  const { hasPin, setPin, unlockShield, verifyPin, removePin } = usePrivacyShield();

  const [pin, setPinInput] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (effectiveMode === 'unlock') {
      const ok = await unlockShield(pin);
      if (ok) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg('Mã PIN không chính xác. Vui lòng thử lại.');
      }
    } else if (effectiveMode === 'setup') {
      if (pin.length < 4) {
        setErrorMsg('Mã PIN tối thiểu phải có 4 chữ số.');
        return;
      }
      if (pin !== confirmPin) {
        setErrorMsg('Mã PIN xác nhận không trùng khớp.');
        return;
      }
      await setPin(pin);
      onSuccess?.();
      onClose();
    } else if (effectiveMode === 'change') {
      const validOld = await verifyPin(oldPin);
      if (!validOld) {
        setErrorMsg('Mã PIN cũ không chính xác.');
        return;
      }
      if (pin.length < 4) {
        setErrorMsg('Mã PIN mới phải có ít nhất 4 chữ số.');
        return;
      }
      if (pin !== confirmPin) {
        setErrorMsg('Mã PIN mới xác nhận không khớp.');
        return;
      }
      await setPin(pin);
      onSuccess?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFDF9] rounded-3xl border border-[#E7DFD4] p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#1F1913]">
                {effectiveMode === 'unlock'
                  ? 'Mở Khóa Chế Độ Bảo Mật'
                  : effectiveMode === 'setup'
                  ? 'Thiết Lập Mã PIN Gia Đình'
                  : 'Đổi Mã PIN Gia Đình'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {effectiveMode === 'unlock'
                  ? 'Nhập mã PIN để xem thông tin cư trú & riêng tư'
                  : 'Bảo vệ thông tin cá nhân của các thành viên còn sống'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {effectiveMode === 'change' && (
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Mã PIN hiện tại</label>
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập mã PIN cũ..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              {effectiveMode === 'unlock' ? 'Mã PIN bảo mật' : 'Mã PIN mới (4 - 8 chữ số)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
                autoFocus={effectiveMode !== 'change'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(effectiveMode === 'setup' || effectiveMode === 'change') && (
            <div>
              <label className="block text-stone-600 font-semibold mb-1">Xác nhận mã PIN mới</label>
              <input
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white font-semibold shadow-xs"
            >
              {effectiveMode === 'unlock' ? 'Mở khóa' : 'Lưu mã PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
