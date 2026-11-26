import React, { useId, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Shield, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { usePrivacyShield } from '../hooks/usePrivacyShield';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialInputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const closeAndClear = () => {
    setPinInput('');
    setConfirmPin('');
    setOldPin('');
    setErrorMsg(null);
    setShowPassword(false);
    onClose();
  };

  const { requestClose } = useModalAccessibility({
    open,
    dialogRef,
    initialFocusRef: initialInputRef,
    busy: isSubmitting,
    onRequestClose: () => {
      if ((pin || confirmPin || oldPin) && !window.confirm('Bỏ nội dung mã PIN đang nhập và đóng cửa sổ?')) return;
      closeAndClear();
    },
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
    if (effectiveMode === 'unlock') {
      const ok = await unlockShield(pin);
      if (ok) {
        onSuccess?.();
        closeAndClear();
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
      closeAndClear();
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
      closeAndClear();
    }
    } catch {
      setErrorMsg('Không thể hoàn tất thao tác mã PIN. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center sm:p-4 animate-in fade-in"
      onClick={() => requestClose('backdrop')}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={isSubmitting}
        tabIndex={-1}
        className="mobile-safe-dialog w-full sm:max-w-md h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] bg-[#FFFDF9] sm:rounded-3xl border border-[#E7DFD4] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-[#E7DFD4] p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 id={`${id}-title`} className="font-serif font-bold text-base text-[#1F1913]">
                {effectiveMode === 'unlock'
                  ? 'Mở Khóa Chế Độ Bảo Mật'
                  : effectiveMode === 'setup'
                  ? 'Thiết Lập Mã PIN Gia Đình'
                  : 'Đổi Mã PIN Gia Đình'}
              </h3>
              <p id={`${id}-description`} className="text-xs text-stone-500">
                {effectiveMode === 'unlock'
                  ? 'Nhập mã PIN để xem thông tin cư trú & riêng tư'
                  : 'Bảo vệ thông tin cá nhân của các thành viên còn sống'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => requestClose('button')}
            disabled={isSubmitting}
            aria-label="Đóng cửa sổ mã PIN"
            className="min-w-11 min-h-11 shrink-0 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-700 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div role="alert" className="shrink-0 m-5 mb-0 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 flex flex-col text-sm">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
          {effectiveMode === 'change' && (
            <div>
              <label htmlFor={`${id}-old-pin`} className="block text-stone-600 font-semibold mb-1">Mã PIN hiện tại</label>
              <input
                id={`${id}-old-pin`}
                ref={initialInputRef}
                disabled={isSubmitting}
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập mã PIN cũ..."
                className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-base sm:text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
              />
            </div>
          )}

          <div>
            <label htmlFor={`${id}-pin`} className="block text-stone-600 font-semibold mb-1">
              {effectiveMode === 'unlock' ? 'Mã PIN bảo mật' : 'Mã PIN mới (4 - 8 chữ số)'}
            </label>
            <div className="relative">
              <input
                id={`${id}-pin`}
                ref={effectiveMode === 'change' ? undefined : initialInputRef}
                disabled={isSubmitting}
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-h-11 px-3.5 pr-14 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-base sm:text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={isSubmitting}
                aria-label={showPassword ? 'Ẩn mã PIN' : 'Hiện mã PIN'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 -translate-y-1/2 min-w-11 min-h-11 flex items-center justify-center text-stone-500 hover:text-stone-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(effectiveMode === 'setup' || effectiveMode === 'change') && (
            <div>
              <label htmlFor={`${id}-confirm-pin`} className="block text-stone-600 font-semibold mb-1">Xác nhận mã PIN mới</label>
              <input
                id={`${id}-confirm-pin`}
                disabled={isSubmitting}
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-h-11 px-3.5 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-base sm:text-sm text-center font-mono tracking-widest outline-none focus:border-[#1B3B2B]"
              />
            </div>
          )}

          </div>
          <div className="shrink-0 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-[#E7DFD4] bg-[#FFFDF9] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => requestClose('button')}
              disabled={isSubmitting}
              className="min-h-11 px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-11 px-5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Đang xử lý...' : effectiveMode === 'unlock' ? 'Mở khóa' : 'Lưu mã PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
