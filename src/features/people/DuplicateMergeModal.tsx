import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  GitMerge,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import {
  DuplicatePair,
  findPotentialDuplicates,
} from '../../services/duplicateMergeService';
import { formatLifespan } from '../../utils/dateUtils';

interface DuplicateMergeModalProps {
  open: boolean;
  onClose: () => void;
}

export const DuplicateMergeModal: React.FC<DuplicateMergeModalProps> = ({ open, onClose }) => {
  const { people, relationships, unions, mergePeople } = useGenealogy();

  const [selectedPairIndex, setSelectedPairIndex] = useState<number>(0);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Scan duplicates
  const duplicates = useMemo(() => {
    return findPotentialDuplicates(people, relationships, unions);
  }, [people, relationships, unions]);

  const activePair: DuplicatePair | undefined = duplicates[selectedPairIndex];

  // Set initial target when active pair changes
  React.useEffect(() => {
    if (activePair) {
      setMergeTargetId(activePair.personA.id);
    }
  }, [activePair]);

  React.useEffect(() => {
    if (!open) {
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  }, [open]);

  if (!open) return null;

  const handleExecuteMerge = async () => {
    if (!activePair || isMerging) return;
    setIsMerging(true);
    setErrorMessage(null);

    try {
      const target = mergeTargetId === activePair.personA.id ? activePair.personA : activePair.personB;
      const source = mergeTargetId === activePair.personA.id ? activePair.personB : activePair.personA;

      await mergePeople(target.id, source.id);

      setSuccessMessage(
        `Đã sáp nhập thành công hồ sơ "${source.fullName}" vào "${target.fullName}". Toàn bộ quan hệ huyết thống và tư liệu đã được bảo toàn nguyên vẹn.`
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Vui lòng thử lại.';
      setErrorMessage(`Không thể hoàn tất sáp nhập. ${detail}`);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
              <GitMerge className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#1F1913]">
                Kiểm Tra & Hợp Nhất Hồ Sơ Trùng Lặp
              </h3>
              <p className="text-xs text-stone-500">
                Đối chiếu hồ sơ và quan hệ gia đình trước khi quyết định sáp nhập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isMerging}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{errorMessage}</p>
        )}

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-base text-emerald-900">Sáp Nhập Thành Công</h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">{successMessage}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold bg-[#1B3B2B] text-white rounded-xl shadow-xs"
            >
              Hoàn tất
            </button>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="p-12 text-center bg-[#FAF8F5] rounded-2xl border border-[#E7DFD4] space-y-3">
            <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="font-serif font-bold text-base text-[#1F1913]">
              Chưa phát hiện hồ sơ nghi trùng
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Kết quả dựa trên họ tên, năm sinh và các liên kết gia đình đã ghi nhận.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                Phát hiện <strong>{duplicates.length}</strong> cặp hồ sơ nghi vấn
              </span>
              <div className="flex items-center gap-1">
                {duplicates.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isMerging}
                    onClick={() => {
                      setSelectedPairIndex(idx);
                      setErrorMessage(null);
                    }}
                    className={`w-6 h-6 rounded-lg text-xs font-semibold ${
                      selectedPairIndex === idx
                        ? 'bg-[#1B3B2B] text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {activePair && (
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    Điểm tương đồng: {activePair.matchScore}%
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-800">
                    {activePair.reasons.map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-100 font-medium">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Person A */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      mergeTargetId === activePair.personA.id
                        ? 'bg-white border-[#1B3B2B] ring-2 ring-[#1B3B2B]/20 shadow-xs'
                        : 'bg-white/60 border-stone-200 opacity-80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      disabled={isMerging}
                      checked={mergeTargetId === activePair.personA.id}
                      onChange={() => setMergeTargetId(activePair.personA.id)}
                      className="mt-1 accent-[#1B3B2B]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <HeritageAvatar
                          fullName={activePair.personA.fullName}
                          portraitUrl={activePair.personA.portraitUrl}
                          gender={activePair.personA.gender}
                          size="xs"
                        />
                        <span className="font-serif font-bold text-xs truncate">
                          {activePair.personA.fullName}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        {formatLifespan(
                          activePair.personA.birthDate,
                          activePair.personA.deathDate,
                          activePair.personA.isLiving
                        )}
                      </p>
                      {activePair.personA.generation && (
                        <p className="text-[10px] text-[#1B3B2B] font-semibold">
                          Đời thứ {activePair.personA.generation}
                        </p>
                      )}
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {mergeTargetId === activePair.personA.id ? '✓ Giữ lại làm gốc' : 'Sẽ sáp nhập vào'}
                      </span>
                    </div>
                  </label>

                  {/* Person B */}
                  <label
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      mergeTargetId === activePair.personB.id
                        ? 'bg-white border-[#1B3B2B] ring-2 ring-[#1B3B2B]/20 shadow-xs'
                        : 'bg-white/60 border-stone-200 opacity-80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mergeTarget"
                      disabled={isMerging}
                      checked={mergeTargetId === activePair.personB.id}
                      onChange={() => setMergeTargetId(activePair.personB.id)}
                      className="mt-1 accent-[#1B3B2B]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <HeritageAvatar
                          fullName={activePair.personB.fullName}
                          portraitUrl={activePair.personB.portraitUrl}
                          gender={activePair.personB.gender}
                          size="xs"
                        />
                        <span className="font-serif font-bold text-xs truncate">
                          {activePair.personB.fullName}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        {formatLifespan(
                          activePair.personB.birthDate,
                          activePair.personB.deathDate,
                          activePair.personB.isLiving
                        )}
                      </p>
                      {activePair.personB.generation && (
                        <p className="text-[10px] text-[#1B3B2B] font-semibold">
                          Đời thứ {activePair.personB.generation}
                        </p>
                      )}
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {mergeTargetId === activePair.personB.id ? '✓ Giữ lại làm gốc' : 'Sẽ sáp nhập vào'}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isMerging}
                    onClick={handleExecuteMerge}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1B3B2B] hover:bg-[#28503C] text-white rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>{isMerging ? 'Đang sáp nhập...' : 'Thực hiện sáp nhập an toàn'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
