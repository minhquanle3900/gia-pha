import React, { useId, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  GitCommit,
  GitFork,
  HelpCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { calculateVietnameseKinship } from '../../services/kinshipService';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';

interface KinshipCalculatorModalProps {
  open: boolean;
  initialPersonAId?: string;
  initialPersonBId?: string;
  onClose: () => void;
  onSelectPerson?: (personId: string) => void;
}

export const KinshipCalculatorModal: React.FC<KinshipCalculatorModalProps> = ({
  open,
  initialPersonAId,
  initialPersonBId,
  onClose,
  onSelectPerson,
}) => {
  const { people, relationships, unions } = useGenealogy();

  const [personAId, setPersonAId] = useState(initialPersonAId || people[0]?.id || '');
  const [personBId, setPersonBId] = useState(
    initialPersonBId || people[1]?.id || people[0]?.id || ''
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const { requestClose } = useModalAccessibility({
    open,
    dialogRef,
    initialFocusRef: selectorRef,
    onRequestClose: onClose,
  });

  const peopleMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const personA = peopleMap.get(personAId);
  const personB = peopleMap.get(personBId);

  // Calculation
  const result = useMemo(() => {
    if (!personAId || !personBId) return null;
    return calculateVietnameseKinship(personAId, personBId, people, relationships, unions);
  }, [personAId, personBId, people, relationships, unions]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        tabIndex={-1}
        className="mobile-safe-dialog w-full sm:max-w-2xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 pt-[max(1rem,env(safe-area-inset-top))] border-b border-[#E7DFD4] bg-[#FAF7F2] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 shrink-0 rounded-xl bg-[#1B3B2B] text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 id={`${id}-title`} className="text-base font-serif font-bold text-[#1F1913]">
                Tra Cứu Xưng Hô Dòng Tộc Tự Động
              </h3>
              <p id={`${id}-description`} className="text-xs text-stone-500">
                Tìm tổ tiên chung (LCA), so sánh đời thứ và ngôi thứ chi trên / chi dưới.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => requestClose('button')}
            aria-label="Đóng tra cứu xưng hô"
            className="min-w-11 min-h-11 shrink-0 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Person Selectors */}
        <div className="p-4 sm:p-6 min-h-0 overflow-y-auto overscroll-contain space-y-6 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Person A Selector */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] space-y-2.5">
              <label htmlFor={`${id}-person-a`} className="block text-xs font-bold uppercase tracking-wider text-[#1B3B2B]">
                Người thứ nhất (A)
              </label>
              <select
                id={`${id}-person-a`}
                ref={selectorRef}
                value={personAId}
                onChange={(e) => setPersonAId(e.target.value)}
                className="w-full min-h-11 text-base sm:text-sm rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''} -{' '}
                    {p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Khác'}
                  </option>
                ))}
              </select>

              {personA && (
                <div className="flex items-center gap-2.5 pt-1">
                  <HeritageAvatar
                    fullName={personA.fullName}
                    portraitUrl={personA.portraitUrl}
                    gender={personA.gender}
                    size="sm"
                  />
                  <div className="text-xs truncate">
                    <p className="font-bold text-[#1F1913] truncate">{personA.fullName}</p>
                    <p className="text-[10px] text-stone-500">
                      {personA.clanRole || (personA.generation ? `Đời thứ ${personA.generation}` : '')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Person B Selector */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] space-y-2.5">
              <label htmlFor={`${id}-person-b`} className="block text-xs font-bold uppercase tracking-wider text-[#8C3A27] dark:text-[#F0B6A5]">
                Người thứ hai (B)
              </label>
              <select
                id={`${id}-person-b`}
                value={personBId}
                onChange={(e) => setPersonBId(e.target.value)}
                className="w-full min-h-11 text-base sm:text-sm rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''} -{' '}
                    {p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Khác'}
                  </option>
                ))}
              </select>

              {personB && (
                <div className="flex items-center gap-2.5 pt-1">
                  <HeritageAvatar
                    fullName={personB.fullName}
                    portraitUrl={personB.portraitUrl}
                    gender={personB.gender}
                    size="sm"
                  />
                  <div className="text-xs truncate">
                    <p className="font-bold text-[#1F1913] truncate">{personB.fullName}</p>
                    <p className="text-[10px] text-stone-500">
                      {personB.clanRole || (personB.generation ? `Đời thứ ${personB.generation}` : '')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Result Card */}
          {result && (
            <div className="rounded-2xl border border-[#D5CABE] bg-[#FAF8F5] p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#E7DFD4] pb-2 text-[#8C6D32]">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Kết Quả Xưng Hô Chuẩn Mực Văn Hóa Việt
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E7DFD4] space-y-1">
                  <span className="text-[11px] text-stone-500 font-medium">
                    {personA?.fullName} xưng là:
                  </span>
                  <p className="text-base font-serif font-bold text-[#1B3B2B]">{result.termAtoB}</p>
                  <p className="text-[10px] text-stone-400">(với {personB?.fullName})</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E7DFD4] space-y-1">
                  <span className="text-[11px] text-stone-500 font-medium">
                    {personB?.fullName} xưng là:
                  </span>
                  <p className="text-base font-serif font-bold text-[#8C3A27] dark:text-[#F0B6A5]">{result.termBtoA}</p>
                  <p className="text-[10px] text-stone-400">(với {personA?.fullName})</p>
                </div>
              </div>

              {/* Cultural Explanation */}
              <div className="p-3.5 rounded-xl bg-[#FFFDF9] border border-[#E7DFD4] text-xs space-y-1.5">
                <span className="font-bold text-stone-700 dark:text-[#EDE6DC] flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#1B3B2B]" />
                  <span>Cơ sở phả hệ & nguồn gốc:</span>
                </span>
                <p className="text-[#4A3F35] dark:text-[#EDE6DC] leading-relaxed">{result.explanation}</p>
                {result.lcaPerson && (
                  <p className="text-[11px] text-[#8C6D32] font-medium pt-1 border-t border-stone-100">
                    ✦ Tổ tiên chung gần nhất: <strong>{result.lcaPerson.fullName}</strong>{' '}
                    {result.lcaPerson.generation ? `(Đời thứ ${result.lcaPerson.generation})` : ''}
                  </p>
                )}
              </div>

              {/* Visual Ancestral Path */}
              {result.path.length > 1 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Đường dây liên kết huyết thống:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 text-xs" role="group" aria-label="Đường dây liên kết huyết thống">
                    {result.path.map((step, idx) => (
                      <React.Fragment key={step.person.id}>
                        {idx > 0 && <ArrowRight className="w-3 h-3 text-stone-400 shrink-0" />}
                        <button
                          type="button"
                          disabled={!onSelectPerson}
                          onClick={() => {
                            if (!onSelectPerson) return;
                            onClose();
                            onSelectPerson(step.person.id);
                          }}
                          className={`min-h-11 flex items-center gap-1.5 px-2.5 py-1 rounded-xl border shrink-0 disabled:cursor-default ${
                            step.person.id === result.lcaPerson?.id
                              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                              : 'bg-white border-[#D5CABE] text-[#1F1913] hover:bg-stone-50'
                          }`}
                        >
                          <HeritageAvatar
                            fullName={step.person.fullName}
                            portraitUrl={step.person.portraitUrl}
                            gender={step.person.gender}
                            size="xs"
                          />
                          <span className="font-semibold text-[11px]">{step.person.fullName}</span>
                          {step.person.id === result.lcaPerson?.id && (
                            <span className="text-[9px] text-[#DBC599] font-bold">(Tổ tiên chung)</span>
                          )}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#E7DFD4] bg-[#FAF7F2] flex justify-end">
          <button
            type="button"
            onClick={() => requestClose('button')}
            className="min-h-11 px-5 py-2 text-xs font-semibold bg-[#1B3B2B] text-white rounded-xl shadow-xs hover:bg-[#28503C]"
          >
            Đóng tra cứu
          </button>
        </div>
      </div>
    </div>
  );
};
