import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Heart, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { FlexibleDateInput } from '../../components/FlexibleDateInput';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { useModalAccessibility } from '../../hooks/useModalAccessibility';
import { FlexibleDate, LineageType, Person, UnionStatus } from '../../models/genealogy';
import { validateParentChildRelationship } from '../../services/validationService';
import { formatFlexibleDate, generateId, normalizeVietnameseText } from '../../utils/dateUtils';

interface RelationshipEditorModalProps {
  person: Person;
  open: boolean;
  onClose: () => void;
}

export const RelationshipEditorModal: React.FC<RelationshipEditorModalProps> = ({
  person,
  open,
  onClose,
}) => {
  const {
    people,
    relationships,
    saveRelationship,
    deleteRelationship,
    saveUnion,
    deleteUnion,
    getParents,
    getChildren,
    getSpouses,
  } = useGenealogy();

  const [activeTab, setActiveTab] = useState<'parents' | 'children' | 'spouses'>('parents');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [selectedLineageType, setSelectedLineageType] = useState<LineageType>('biological');
  const [selectedSpouseStatus, setSelectedSpouseStatus] = useState<UnionStatus>('married');
  const [marriageDate, setMarriageDate] = useState<FlexibleDate>();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const savingRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const { requestClose } = useModalAccessibility({
    open,
    dialogRef,
    initialFocusRef: searchRef,
    busy: isSaving,
    onRequestClose: () => { if (!savingRef.current) onClose(); },
  });

  useEffect(() => {
    if (!open) return;
    setActiveTab('parents');
    setSelectedPersonId('');
    setMemberSearch('');
    setSelectedLineageType('biological');
    setSelectedSpouseStatus('married');
    setMarriageDate(undefined);
    setErrorMessage(null);
  }, [open, person.id]);

  const parents = getParents(person.id);
  const children = getChildren(person.id);
  const spouses = getSpouses(person.id);

  // Keep existing spouses selectable for recording a separate, dated remarriage.
  const availablePeople = useMemo(() => {
    const q = memberSearch.trim() ? normalizeVietnameseText(memberSearch.trim()) : '';
    return people.filter((p) => {
      if (p.id === person.id) return false;
      if (activeTab === 'parents' && parents.some((par) => par.parent.id === p.id)) return false;
      if (activeTab === 'children' && children.some((c) => c.child.id === p.id)) return false;
      if (q) {
        const nameNorm = normalizeVietnameseText(p.fullName);
        const commonNorm = p.commonName ? normalizeVietnameseText(p.commonName) : '';
        if (!nameNorm.includes(q) && !commonNorm.includes(q)) return false;
      }
      return true;
    });
  }, [people, person.id, activeTab, parents, children, memberSearch]);

  if (!open) return null;

  const runMutation = async (mutation: () => Promise<unknown>, onSuccess?: () => void) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await mutation();
      onSuccess?.();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu thay đổi quan hệ. Hãy thử lại.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleAddParent = async () => {
    if (!selectedPersonId || savingRef.current) return;
    setErrorMessage(null);

    const validation = validateParentChildRelationship({
      parentId: selectedPersonId,
      childId: person.id,
      lineageType: selectedLineageType,
      people,
      relationships,
    });

    if (!validation.valid) {
      setErrorMessage(validation.errors.join(' '));
      return;
    }

    await runMutation(() => saveRelationship({
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parentId: selectedPersonId,
      childId: person.id,
      lineageType: selectedLineageType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }), () => setSelectedPersonId(''));
  };

  const handleAddChild = async () => {
    if (!selectedPersonId || savingRef.current) return;
    setErrorMessage(null);

    const validation = validateParentChildRelationship({
      parentId: person.id,
      childId: selectedPersonId,
      lineageType: selectedLineageType,
      people,
      relationships,
    });

    if (!validation.valid) {
      setErrorMessage(validation.errors.join(' '));
      return;
    }

    await runMutation(() => saveRelationship({
      id: `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      parentId: person.id,
      childId: selectedPersonId,
      lineageType: selectedLineageType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }), () => setSelectedPersonId(''));
  };

  const handleAddSpouse = async () => {
    if (!selectedPersonId || savingRef.current) return;

    const now = new Date().toISOString();
    await runMutation(() => saveUnion({
        id: generateId('union'),
        partnerIds: [person.id, selectedPersonId],
        status: selectedSpouseStatus,
        marriageOrder: spouses.length + 1,
        marriageDate,
        createdAt: now,
        updatedAt: now,
      }), () => {
      setSelectedPersonId('');
      setMarriageDate(undefined);
    });
  };

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      aria-busy={isSaving}
      tabIndex={-1}
      onClick={(event) => { if (event.target === event.currentTarget) requestClose('backdrop'); }}
    >
      <fieldset
        disabled={isSaving}
        className="min-w-0 w-full max-w-xl rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl overflow-hidden flex flex-col max-h-[88dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7DFD4] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-3">
            <HeritageAvatar
              fullName={person.fullName}
              portraitUrl={person.portraitUrl}
              gender={person.gender}
              size="sm"
            />
            <div>
              <h3 id={`${formId}-title`} className="text-base font-serif font-bold text-[#1F1913]">
                Quan hệ gia đình: {person.fullName}
              </h3>
              <p className="text-xs text-stone-500">
                Thêm, sửa và kiểm tra liên kết huyết thống, phụ mẫu và hôn phối
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => requestClose('button')}
            disabled={isSaving}
            aria-label="Đóng quan hệ gia đình"
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-[#E7DFD4] bg-[#F7F2EA]/70 px-4 pt-2">
          {[
            { key: 'parents', label: `Cha & Mẹ (${parents.length})`, icon: Users },
            { key: 'spouses', label: `Vợ / Chồng (${spouses.length})`, icon: Heart },
            { key: 'children', label: `Con cái (${children.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key as 'parents' | 'children' | 'spouses');
                  setSelectedPersonId('');
                  setMarriageDate(undefined);
                  setErrorMessage(null);
                }}
                disabled={isSaving}
                className={`flex min-h-11 items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-[#1B3B2B] text-[#1B3B2B] bg-white rounded-t-xl'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isSaving && <p role="status" className="text-xs text-[#54483C]">Đang lưu thay đổi quan hệ. Vui lòng chờ hoàn tất trước khi đóng.</p>}
          {errorMessage && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          {/* Add form */}
          <div className="p-3.5 rounded-xl border border-[#E3D9CC] bg-[#FAF8F5] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#54483C]">
              {activeTab === 'parents'
                ? 'Thêm Cha hoặc Mẹ'
                : activeTab === 'children'
                ? 'Thêm Con trai hoặc Con gái'
                : 'Thêm Vợ hoặc Chồng'}
            </h4>

            <div>
              <label htmlFor={`${formId}-member-search`} className="mb-1 block text-xs font-medium text-[#54483C]">Tìm thành viên</label>
              <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                id={`${formId}-member-search`}
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setSelectedPersonId('');
                }}
                placeholder="Lọc nhanh theo họ tên hoặc tên thường gọi..."
                className="min-h-11 w-full text-xs rounded-lg border border-[#D5CABE] bg-white pl-8 pr-11 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
              />
              {memberSearch && (
                <button
                  type="button"
                  onClick={() => setMemberSearch('')}
                  aria-label="Xóa từ khóa tìm thành viên"
                  className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-stone-500 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label htmlFor={`${formId}-member`} className="mb-1 block text-xs font-medium text-[#54483C]">Thành viên liên kết</label>
                <select
                  id={`${formId}-member`}
                  value={selectedPersonId}
                  onChange={(e) => {
                    setSelectedPersonId(e.target.value);
                    setMarriageDate(undefined);
                    setErrorMessage(null);
                  }}
                  disabled={isSaving}
                  className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2.5 py-2 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
                >
                  <option value="">
                    -- Chọn thành viên ({availablePeople.length} khả dụng) --
                  </option>
                  {availablePeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''} -{' '}
                      {p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Khác'}
                    </option>
                  ))}
                </select>
              </div>

              {activeTab !== 'spouses' ? (
                <div>
                  <label htmlFor={`${formId}-lineage`} className="mb-1 block text-xs font-medium text-[#54483C]">Loại quan hệ</label>
                  <select
                    id={`${formId}-lineage`}
                    value={selectedLineageType}
                    onChange={(e) => setSelectedLineageType(e.target.value as LineageType)}
                    className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-2 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
                  >
                    <option value="biological">Con ruột (Huyết thống)</option>
                    <option value="adoptive">Con nuôi (Dưỡng tử/nữ)</option>
                    <option value="step">Con riêng (Kế tử)</option>
                    <option value="unknown">Chưa rõ</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor={`${formId}-spouse-status`} className="mb-1 block text-xs font-medium text-[#54483C]">Tình trạng hôn phối</label>
                  <select
                    id={`${formId}-spouse-status`}
                    value={selectedSpouseStatus}
                    onChange={(e) => setSelectedSpouseStatus(e.target.value as UnionStatus)}
                    className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-2 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
                  >
                    <option value="married">Phu thê / Đang kết hôn</option>
                    <option value="widowed">Góa</option>
                    <option value="divorced">Ly hôn</option>
                    <option value="separated">Ly thân</option>
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'spouses' && selectedPersonId && (
              <FlexibleDateInput
                label="Niên đại hôn phối"
                value={marriageDate}
                onChange={setMarriageDate}
                helperText={spouses.some(({ spouse }) => spouse?.id === selectedPersonId)
                  ? 'Ghi niên đại phân biệt được với lần hôn phối đã lưu nếu đây là một lần tái hôn.'
                  : undefined}
              />
            )}

            <button
              type="button"
              disabled={!selectedPersonId || isSaving}
              onClick={
                activeTab === 'parents'
                  ? handleAddParent
                  : activeTab === 'children'
                  ? handleAddChild
                  : handleAddSpouse
              }
              className="flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu…' : 'Thêm liên kết'}</span>
            </button>
          </div>

          {/* Current relationships list */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-stone-600">Danh sách hiện tại</h4>

            {activeTab === 'parents' && (
              <div className="space-y-2">
                {parents.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Chưa thiết lập thông tin cha mẹ.</p>
                ) : (
                  parents.map(({ relationship, parent }) => (
                    <div
                      key={relationship.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <HeritageAvatar
                          fullName={parent.fullName}
                          portraitUrl={parent.portraitUrl}
                          gender={parent.gender}
                          size="xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#1F1913]">{parent.fullName}</p>
                          <p className="text-[10px] text-stone-500">
                            {parent.gender === 'male' ? 'Cha' : 'Mẹ'} •{' '}
                            {relationship.lineageType === 'adoptive'
                              ? 'Nuôi'
                              : relationship.lineageType === 'step'
                              ? 'Kế phụ/mẫu'
                              : 'Huyết thống'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { void runMutation(() => deleteRelationship(relationship.id)); }}
                        disabled={isSaving}
                        aria-label={`Xóa liên kết với ${parent.fullName}`}
                        className="grid min-h-11 min-w-11 shrink-0 place-items-center text-stone-500 hover:text-red-600 rounded-lg"
                        title="Xóa liên kết này (không xóa hồ sơ thành viên)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'children' && (
              <div className="space-y-2">
                {children.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Chưa có thông tin con cái.</p>
                ) : (
                  children.map(({ relationship, child }) => (
                    <div
                      key={relationship.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <HeritageAvatar
                          fullName={child.fullName}
                          portraitUrl={child.portraitUrl}
                          gender={child.gender}
                          size="xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#1F1913]">{child.fullName}</p>
                          <p className="text-[10px] text-stone-500">
                            {child.gender === 'male' ? 'Con trai' : 'Con gái'} •{' '}
                            {relationship.lineageType === 'adoptive'
                              ? 'Con nuôi'
                              : relationship.lineageType === 'step'
                              ? 'Con riêng'
                              : 'Con ruột'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { void runMutation(() => deleteRelationship(relationship.id)); }}
                        disabled={isSaving}
                        aria-label={`Xóa liên kết với ${child.fullName}`}
                        className="grid min-h-11 min-w-11 shrink-0 place-items-center text-stone-500 hover:text-red-600 rounded-lg"
                        title="Xóa liên kết này (không xóa hồ sơ thành viên)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'spouses' && (
              <div className="space-y-2">
                {spouses.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Chưa có thông tin vợ/chồng.</p>
                ) : (
                  spouses.map(({ union, spouse }) => (
                    <div
                      key={union.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <HeritageAvatar
                          fullName={spouse?.fullName || 'Chưa rõ'}
                          portraitUrl={spouse?.portraitUrl}
                          gender={spouse?.gender}
                          size="xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#1F1913]">
                            {spouse?.fullName || 'Bạn đời chưa rõ tên'}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {union.marriageOrder === 1
                              ? 'Chính thất (Lần 1)'
                              : union.marriageOrder === 2
                              ? 'Kế thất / Tục huyền (Lần 2)'
                              : `Hôn phối lần ${union.marriageOrder || 1}`}
                            {union.marriageDate ? ` • ${formatFlexibleDate(union.marriageDate)}` : ''}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => { void runMutation(() => deleteUnion(union.id)); }}
                        disabled={isSaving}
                        aria-label={`Xóa hôn phối với ${spouse?.fullName || 'bạn đời chưa rõ tên'}`}
                        className="grid min-h-11 min-w-11 shrink-0 place-items-center text-stone-500 hover:text-red-600 rounded-lg"
                        title="Xóa cuộc hôn phối này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7DFD4] bg-[#FAF7F2] flex justify-end">
          <button
            type="button"
            onClick={() => requestClose('button')}
            disabled={isSaving}
            className="min-h-11 px-4 py-2 text-xs font-medium bg-[#1B3B2B] text-white rounded-xl"
          >
            Đóng
          </button>
        </div>
      </fieldset>
    </div>
  );
};
