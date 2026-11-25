import React, { useEffect, useState } from 'react';
import { Camera, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { FlexibleDateInput } from '../../components/FlexibleDateInput';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import {
  FlexibleDate,
  Gender,
  LunarAnniversary,
  Person,
} from '../../models/genealogy';
import { generateBiographyWithAI } from '../../services/aiBiographyService';
import { validatePersonInput } from '../../services/validationService';
import { compressImageFile } from '../../utils/imageUtils';

interface PersonFormModalProps {
  open: boolean;
  editingPerson?: Person | null;
  onClose: () => void;
  onSaved: (person: Person) => void;
}

export const PersonFormModal: React.FC<PersonFormModalProps> = ({
  open,
  editingPerson,
  onClose,
  onSaved,
}) => {
  const { branches, savePerson, saveMedia, lifeEvents } = useGenealogy();

  const [activeSection, setActiveSection] = useState<'identity' | 'life' | 'genealogy'>('identity');
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Biography Generation state
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [aiGeneratedBio, setAiGeneratedBio] = useState<string | null>(null);
  const [aiBioError, setAiBioError] = useState<string | null>(null);
  const [aiBioSuccess, setAiBioSuccess] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [portraitUrl, setPortraitUrl] = useState<string | undefined>(undefined);
  const [commonName, setCommonName] = useState('');
  const [tabooName, setTabooName] = useState('');
  const [courtesyName, setCourtesyName] = useState('');
  const [alias, setAlias] = useState('');

  const [isLiving, setIsLiving] = useState(true);
  const [birthDate, setBirthDate] = useState<FlexibleDate | undefined>(undefined);
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState<FlexibleDate | undefined>(undefined);
  const [deathPlace, setDeathPlace] = useState('');
  const [ancestralHome, setAncestralHome] = useState('');
  const [residence, setResidence] = useState('');
  const [occupation, setOccupation] = useState('');
  const [biography, setBiography] = useState('');
  const [notes, setNotes] = useState('');

  const [generation, setGeneration] = useState<number | undefined>(undefined);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [subBranch, setSubBranch] = useState('');
  const [clanRole, setClanRole] = useState('');
  const [lunarDay, setLunarDay] = useState<number | ''>('');
  const [lunarMonth, setLunarMonth] = useState<number | ''>('');
  const [lunarNote, setLunarNote] = useState('');
  const [burialPlace, setBurialPlace] = useState('');
  const [merits, setMerits] = useState('');

  const handleGenerateBiography = async () => {
    if (!fullName.trim()) {
      setActiveSection('identity');
      setAiBioError('Vui lòng nhập họ và tên của thành viên trước khi yêu cầu AI viết tiểu sử.');
      return;
    }

    try {
      setIsGeneratingBio(true);
      setAiBioError(null);
      setAiBioSuccess(null);
      setAiGeneratedBio(null);

      // Find events of this person
      const personEvents = editingPerson
        ? lifeEvents.filter((ev) => ev.personId === editingPerson.id)
        : [];

      const branch = branches.find((b) => b.id === branchId);

      const res = await generateBiographyWithAI({
        fullName: fullName.trim(),
        gender,
        commonName: commonName.trim() || undefined,
        tabooName: tabooName.trim() || undefined,
        courtesyName: courtesyName.trim() || undefined,
        alias: alias.trim() || undefined,
        isLiving,
        birthDate,
        birthPlace: birthPlace.trim() || undefined,
        deathDate,
        deathPlace: deathPlace.trim() || undefined,
        ancestralHome: ancestralHome.trim() || undefined,
        residence: residence.trim() || undefined,
        occupation: occupation.trim() || undefined,
        generation,
        branchName: branch?.name,
        clanRole: clanRole.trim() || undefined,
        merits: merits.trim() || undefined,
        notes: notes.trim() || undefined,
        events: personEvents,
        existingBiography: biography.trim() || undefined,
      });

      if (res.error) {
        setAiBioError(res.error);
      } else if (res.biography) {
        if (!biography.trim()) {
          setBiography(res.biography);
          setAiBioSuccess('Đã tạo tiểu sử thành công bằng Gemini AI!');
          setTimeout(() => setAiBioSuccess(null), 4000);
        } else {
          setAiGeneratedBio(res.biography);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiBioError(`Lỗi khi tạo tiểu sử: ${msg}`);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  useEffect(() => {
    if (editingPerson) {
      setFullName(editingPerson.fullName || '');
      setGender(editingPerson.gender || 'male');
      setPortraitUrl(editingPerson.portraitUrl);
      setCommonName(editingPerson.commonName || '');
      setTabooName(editingPerson.tabooName || '');
      setCourtesyName(editingPerson.courtesyName || '');
      setAlias(editingPerson.alias || '');

      setIsLiving(editingPerson.isLiving ?? true);
      setBirthDate(editingPerson.birthDate);
      setBirthPlace(editingPerson.birthPlace || '');
      setDeathDate(editingPerson.deathDate);
      setDeathPlace(editingPerson.deathPlace || '');
      setAncestralHome(editingPerson.ancestralHome || '');
      setResidence(editingPerson.residence || '');
      setOccupation(editingPerson.occupation || '');
      setBiography(editingPerson.biography || '');
      setNotes(editingPerson.notes || '');

      setGeneration(editingPerson.generation);
      setBranchId(editingPerson.branchId);
      setSubBranch(editingPerson.subBranch || '');
      setClanRole(editingPerson.clanRole || '');
      setLunarDay(editingPerson.deathAnniversaryLunar?.day ?? '');
      setLunarMonth(editingPerson.deathAnniversaryLunar?.month ?? '');
      setLunarNote(editingPerson.deathAnniversaryLunar?.note || '');
      setBurialPlace(editingPerson.burialPlace || '');
      setMerits(editingPerson.merits || '');
    } else {
      // Defaults for new person
      setFullName('');
      setGender('male');
      setPortraitUrl(undefined);
      setCommonName('');
      setTabooName('');
      setCourtesyName('');
      setAlias('');

      setIsLiving(true);
      setBirthDate(undefined);
      setBirthPlace('');
      setDeathDate(undefined);
      setDeathPlace('');
      setAncestralHome('');
      setResidence('');
      setOccupation('');
      setBiography('');
      setNotes('');

      setGeneration(undefined);
      setBranchId(branches[0]?.id);
      setSubBranch('');
      setClanRole('');
      setLunarDay('');
      setLunarMonth('');
      setLunarNote('');
      setBurialPlace('');
      setMerits('');
    }
    setErrors([]);
    setWarnings([]);
    setActiveSection('identity');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingPerson?.id, open]);

  if (!open) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setPortraitUrl(compressed.dataUrl);

      // Save to media store as well
      const mediaId = `media_${Date.now()}`;
      await saveMedia({
        id: mediaId,
        title: `Chân dung - ${fullName || 'Thành viên'}`,
        category: 'portrait',
        mimeType: 'image/jpeg',
        dataUrl: compressed.dataUrl,
        personIds: editingPerson ? [editingPerson.id] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setErrors(['Không thể xử lý tệp ảnh. Vui lòng chọn tệp định dạng JPG/PNG nhỏ hơn.']);
    }
  };

  const handleSave = async () => {
    const lunarAnniversary: LunarAnniversary | undefined =
      lunarDay !== '' || lunarMonth !== '' || lunarNote
        ? {
            day: typeof lunarDay === 'number' ? lunarDay : undefined,
            month: typeof lunarMonth === 'number' ? lunarMonth : undefined,
            note: lunarNote || undefined,
          }
        : undefined;

    const personData: Person = {
      id: editingPerson?.id || `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: fullName.trim(),
      gender,
      portraitUrl,
      commonName: commonName.trim() || undefined,
      tabooName: tabooName.trim() || undefined,
      courtesyName: courtesyName.trim() || undefined,
      alias: alias.trim() || undefined,

      isLiving,
      birthDate,
      birthPlace: birthPlace.trim() || undefined,
      deathDate: !isLiving ? deathDate : undefined,
      deathPlace: !isLiving ? deathPlace.trim() || undefined : undefined,
      ancestralHome: ancestralHome.trim() || undefined,
      residence: residence.trim() || undefined,
      occupation: occupation.trim() || undefined,
      biography: biography.trim() || undefined,
      notes: notes.trim() || undefined,

      generation: generation !== undefined && !isNaN(generation) ? Number(generation) : undefined,
      branchId: branchId || undefined,
      subBranch: subBranch.trim() || undefined,
      clanRole: clanRole.trim() || undefined,
      deathAnniversaryLunar: !isLiving ? lunarAnniversary : undefined,
      burialPlace: !isLiving ? burialPlace.trim() || undefined : undefined,
      merits: merits.trim() || undefined,

      createdAt: editingPerson?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation = validatePersonInput(personData);
    if (!validation.valid) {
      setErrors(validation.errors);
      setWarnings(validation.warnings);
      return;
    }

    try {
      setIsSubmitting(true);
      await savePerson(personData);
      onSaved(personData);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors([`Lỗi khi lưu vào cơ sở dữ liệu: ${msg}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E7DFD4] bg-[#FAF7F2] flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              {editingPerson ? 'Hiệu chỉnh thông tin thành viên' : 'Thêm thành viên mới vào gia phả'}
            </h3>
            <p className="text-xs text-stone-500">
              Các mục không rõ có thể để trống. Dữ liệu được bảo mật trên thiết bị.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E7DFD4] bg-[#F7F2EA]/70 px-4 pt-2 gap-1 overflow-x-auto">
          {[
            { key: 'identity', label: '1. Danh tính & Tên tự' },
            { key: 'life', label: '2. Sinh thời & Tiểu sử' },
            { key: 'genealogy', label: '3. Tộc hệ & Giỗ chạp' },
          ].map((tab) => {
            const isActive = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveSection(tab.key as 'identity' | 'life' | 'genealogy')}
                className={`px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'border-[#1B3B2B] text-[#1B3B2B] bg-white rounded-t-xl'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errors.length > 0 && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              {errors.map((e, idx) => (
                <p key={idx}>• {e}</p>
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              {warnings.map((w, idx) => (
                <p key={idx}>⚠️ {w}</p>
              ))}
            </div>
          )}

          {/* SECTION 1: IDENTITY */}
          {activeSection === 'identity' && (
            <div className="space-y-4">
              {/* Photo & Gender */}
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5]">
                <div className="relative group">
                  <HeritageAvatar
                    fullName={fullName || 'Thành viên'}
                    portraitUrl={portraitUrl}
                    gender={gender}
                    size="xl"
                  />
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px]">Đổi ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <label className="text-xs font-medium text-stone-600">Giới tính:</label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { val: 'male', label: 'Nam' },
                        { val: 'female', label: 'Nữ' },
                        { val: 'unknown', label: 'Chưa rõ' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setGender(item.val as Gender)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            gender === item.val
                              ? 'bg-[#1B3B2B] text-white'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {portraitUrl && (
                    <button
                      type="button"
                      onClick={() => setPortraitUrl(undefined)}
                      className="text-[11px] text-red-600 hover:underline flex items-center gap-1 mx-auto sm:mx-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa ảnh chân dung</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-[#3C3228] mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Trần Văn Khải"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-sm rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] outline-none focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B]"
                />
              </div>

              {/* Traditional Vietnamese Names */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">
                    Tên thường gọi
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cụ Ba Lộc"
                    value={commonName}
                    onChange={(e) => setCommonName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#1F1913] outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">
                    Tên húy (Tên tế tự)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thuần Lộc"
                    value={tabooName}
                    onChange={(e) => setTabooName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#1F1913] outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">
                    Tên tự / Bí danh
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tự Trọng Viễn"
                    value={courtesyName || alias}
                    onChange={(e) => {
                      setCourtesyName(e.target.value);
                      setAlias(e.target.value);
                    }}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#1F1913] outline-none focus:border-[#1B3B2B]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: LIFE INFO */}
          {activeSection === 'life' && (
            <div className="space-y-4">
              {/* Living Status */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5]">
                <div>
                  <span className="text-xs font-semibold text-[#2C241C]">Trạng thái hiện tiền</span>
                  <p className="text-[11px] text-stone-500">
                    Chọn "Đã tạ thế" để mở thêm các trường ngày mất, ngày giỗ âm lịch, mộ phần
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsLiving(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      isLiving
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Còn sống
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLiving(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      !isLiving
                        ? 'bg-stone-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Đã tạ thế
                  </button>
                </div>
              </div>

              {/* Birth Date & Place */}
              <FlexibleDateInput
                label="Ngày sinh"
                value={birthDate}
                onChange={setBirthDate}
                helperText="Hỗ trợ ngày chính xác, khoảng năm ước tính, hoặc chỉ năm sinh."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">Nơi sinh</label>
                  <input
                    type="text"
                    placeholder="VD: Làng Đông Ngạc, Từ Liêm, Hà Nội"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">Nguyên quán</label>
                  <input
                    type="text"
                    placeholder="VD: Quê gốc Đông Ngạc"
                    value={ancestralHome}
                    onChange={(e) => setAncestralHome(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              {!isLiving && (
                <>
                  <FlexibleDateInput
                    label="Ngày mất"
                    value={deathDate}
                    onChange={setDeathDate}
                  />
                  <div>
                    <label className="block text-xs font-medium text-[#54483C] mb-1">Nơi mất</label>
                    <input
                      type="text"
                      placeholder="VD: Hà Nội"
                      value={deathPlace}
                      onChange={(e) => setDeathPlace(e.target.value)}
                      className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">Nơi cư trú</label>
                  <input
                    type="text"
                    placeholder="VD: Ba Đình, Hà Nội"
                    value={residence}
                    onChange={(e) => setResidence(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#54483C] mb-1">Nghề nghiệp / Học vị</label>
                  <input
                    type="text"
                    placeholder="VD: Nhà giáo / Đốc học / Cử nhân"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#54483C]">
                    Tiểu sử & Hành trạng
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateBiography}
                    disabled={isGeneratingBio}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-linear-to-r from-[#1B3B2B] to-[#254F3A] hover:from-[#254F3A] hover:to-[#31664B] text-white text-[11px] font-semibold shadow-xs disabled:opacity-60 transition-all cursor-pointer"
                    title="Dùng Gemini AI tổng hợp ngày sinh, ngày mất, quê quán, học vị và công đức thành đoạn tiểu sử trang trọng"
                  >
                    {isGeneratingBio ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DBC599]" />
                        <span>AI đang soạn tiểu sử...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#DBC599]" />
                        <span>Soạn tiểu sử bằng AI</span>
                      </>
                    )}
                  </button>
                </div>

                {aiBioSuccess && (
                  <div className="p-2.5 rounded-xl bg-[#EAF2ED] border border-[#D2E2D7] text-xs font-semibold text-[#1B3B2B] flex items-center justify-between animate-in fade-in">
                    <span>{aiBioSuccess}</span>
                    <button
                      type="button"
                      onClick={() => setAiBioSuccess(null)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {aiBioError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-1 animate-in fade-in">
                    <p className="font-semibold">{aiBioError}</p>
                    <p className="text-[11px] text-red-600">
                      Gợi ý: Điền đầy đủ tên, năm sinh/năm mất, nghề nghiệp hoặc công đức để AI có thông tin tổng hợp tốt nhất.
                    </p>
                  </div>
                )}

                {/* AI Review Card when biography already has existing text */}
                {aiGeneratedBio && (
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#D5CABE] space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1B3B2B]">
                        <Sparkles className="w-3.5 h-3.5 text-[#C19B4C]" />
                        <span>Bản thảo tiểu sử do Gemini AI gợi ý:</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiGeneratedBio(null)}
                        className="text-stone-400 hover:text-stone-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-[#2C241C] leading-relaxed italic bg-white p-3 rounded-xl border border-stone-200 whitespace-pre-line">
                      "{aiGeneratedBio}"
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBiography(aiGeneratedBio);
                          setAiGeneratedBio(null);
                          setAiBioSuccess('Đã cập nhật tiểu sử bằng nội dung do AI soạn thảo!');
                          setTimeout(() => setAiBioSuccess(null), 3000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold hover:bg-[#28503C] transition-colors"
                      >
                        Thay thế toàn bộ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBiography(
                            biography ? `${biography}\n\n${aiGeneratedBio}` : aiGeneratedBio
                          );
                          setAiGeneratedBio(null);
                          setAiBioSuccess('Đã nối tiếp nội dung AI vào tiểu sử hiện có!');
                          setTimeout(() => setAiBioSuccess(null), 3000);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] text-xs font-semibold hover:bg-stone-50 transition-colors"
                      >
                        Nối tiếp vào sau
                      </button>

                      <button
                        type="button"
                        onClick={() => setAiGeneratedBio(null)}
                        className="px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-800"
                      >
                        Bỏ qua
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  rows={4}
                  placeholder="Ghi lại các mốc lịch sử, sự nghiệp, cống hiến hoặc bấm 'Soạn tiểu sử bằng AI' để tự động tạo..."
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white p-2.5 outline-none focus:border-[#1B3B2B] leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* SECTION 3: VIETNAMESE GENEALOGY */}
          {activeSection === 'genealogy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#54483C] mb-1">
                    Đời thứ (Thế hệ)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="VD: 1, 2, 3..."
                    value={generation ?? ''}
                    onChange={(e) =>
                      setGeneration(e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#54483C] mb-1">
                    Chi họ trực thuộc
                  </label>
                  <select
                    value={branchId ?? ''}
                    onChange={(e) => setBranchId(e.target.value || undefined)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  >
                    <option value="">-- Chưa chọn chi họ --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#54483C] mb-1">
                    Phái trong chi
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Phái Đông / Phái Nhất"
                    value={subBranch}
                    onChange={(e) => setSubBranch(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#54483C] mb-1">
                  Vai vế trong dòng tộc
                </label>
                <input
                  type="text"
                  placeholder="VD: Thủy tổ, Trưởng tộc, Trưởng chi, Trưởng tôn, Dâu trưởng..."
                  value={clanRole}
                  onChange={(e) => setClanRole(e.target.value)}
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>

              {!isLiving && (
                <div className="p-3.5 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A6335]">
                    Lễ giỗ Âm lịch & Nơi An táng
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] text-stone-500 mb-0.5">Ngày âm</label>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          placeholder="1 - 30"
                          value={lunarDay}
                          onChange={(e) =>
                            setLunarDay(e.target.value ? parseInt(e.target.value, 10) : '')
                          }
                          className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 outline-none focus:border-[#1B3B2B]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] text-stone-500 mb-0.5">Tháng âm</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          placeholder="1 - 12"
                          value={lunarMonth}
                          onChange={(e) =>
                            setLunarMonth(e.target.value ? parseInt(e.target.value, 10) : '')
                          }
                          className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 outline-none focus:border-[#1B3B2B]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-stone-500 mb-0.5">
                        Ghi chú lễ giỗ
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Cúng giỗ tại Từ đường Chi Giáp"
                        value={lunarNote}
                        onChange={(e) => setLunarNote(e.target.value)}
                        className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 outline-none focus:border-[#1B3B2B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#54483C] mb-1">
                      Nơi an táng / Mộ phần
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Nghĩa trang dòng họ tại Đông Ngạc, Mộ số 04"
                      value={burialPlace}
                      onChange={(e) => setBurialPlace(e.target.value)}
                      className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#54483C] mb-1">
                  Công đức & Đóng góp cho dòng họ
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Cung tiến đất nhà thờ tổ, chủ trì biên soạn gia phả, khuyến học..."
                  value={merits}
                  onChange={(e) => setMerits(e.target.value)}
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white p-2.5 outline-none focus:border-[#1B3B2B]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E7DFD4] bg-[#FAF7F2] flex items-center justify-between">
          <div className="flex gap-1.5">
            {activeSection !== 'identity' && (
              <button
                type="button"
                onClick={() =>
                  setActiveSection(activeSection === 'genealogy' ? 'life' : 'identity')
                }
                className="px-3 py-2 text-xs font-medium text-[#54483C] hover:bg-stone-200 rounded-xl"
              >
                Quay lại
              </button>
            )}
            {activeSection !== 'genealogy' && (
              <button
                type="button"
                onClick={() =>
                  setActiveSection(activeSection === 'identity' ? 'life' : 'genealogy')
                }
                className="px-3 py-2 text-xs font-medium text-[#1B3B2B] hover:bg-emerald-50 rounded-xl"
              >
                Tiếp theo →
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-200 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold bg-[#1B3B2B] hover:bg-[#254F3A] text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
