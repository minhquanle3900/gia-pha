import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  Edit3,
  FileCode,
  FileSpreadsheet,
  GitBranch,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useGenealogy } from '../../context/GenealogyContext';
import { FamilyBranch, GenealogyDatabaseSnapshot } from '../../models/genealogy';
import { exportGedcom551, GEDCOM_REPLACEMENT_WARNING, parseAndPreviewGedcom } from '../../services/gedcomService';
import {
  exportDatabaseSnapshotJson,
  validateAndPreviewJsonBackup,
} from '../../services/jsonBackupService';
import {
  generateCsvTemplate,
  parseCsvRows,
  processCsvImport,
  CsvImportResult,
} from '../../services/csvImportService';
import { validateImportSnapshot } from '../../services/importValidationService';
import { planSnapshotMerge } from '../../services/snapshotMergeService';

function describeDiagnostics(messages: string[]): string {
  const visible = messages.slice(0, 6).join('\n');
  return messages.length > 6 ? `${visible}\nCòn ${messages.length - 6} mục khác.` : visible;
}

function importErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const DataManagementPage: React.FC = () => {
  const {
    snapshot,
    people,
    branches,
    settings,
    saveSettings,
    saveBranch,
    deleteBranch,
    importSnapshot,
    resetToDemo,
  } = useGenealogy();

  // Settings form state
  const [clanName, setClanName] = useState(settings.clanName);
  const [clanMotto, setClanMotto] = useState(settings.clanMotto);
  const [ancestralHallLocation, setAncestralHallLocation] = useState(
    settings.ancestralHallLocation
  );
  const [rootPersonId, setRootPersonId] = useState(settings.rootPersonId || '');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    setClanName(settings.clanName);
    setClanMotto(settings.clanMotto);
    setAncestralHallLocation(settings.ancestralHallLocation);
    setRootPersonId(settings.rootPersonId || '');
  }, [settings]);

  // Branch CRUD state
  const [branchFormOpen, setBranchFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<FamilyBranch | null>(null);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchOrigin, setBranchOrigin] = useState('');
  const [branchPeriod, setBranchPeriod] = useState('');
  const [branchSubBranches, setBranchSubBranches] = useState('');
  const [branchDesc, setBranchDesc] = useState('');
  const [branchError, setBranchError] = useState<string | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<FamilyBranch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  const branchMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) {
      if (p.branchId) {
        counts.set(p.branchId, (counts.get(p.branchId) ?? 0) + 1);
      }
    }
    return counts;
  }, [people]);

  const deletingBranchId = deletingBranch?.id;
  const deleteBranchImpact = deletingBranchId && snapshot
    ? {
      primary: branchMemberCounts.get(deletingBranchId) ?? 0,
      secondary: people.filter((person) => person.secondaryBranchIds?.includes(deletingBranchId)).length,
      children: branches.filter((branch) => branch.id !== deletingBranchId && branch.parentBranchId === deletingBranchId).length,
      media: snapshot.media.filter((item) => item.branchId === deletingBranchId).length,
      stories: snapshot.stories.filter((story) => story.branchId === deletingBranchId).length,
    }
    : null;

  // File import state
  const [importNotice, setImportNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [jsonImportMode, setJsonImportMode] = useState<'replace' | 'merge'>('replace');
  const [pendingImport, setPendingImport] = useState<{
    snapshot: GenealogyDatabaseSnapshot;
    mode: 'replace' | 'merge';
    label: string;
    warnings: string[];
  } | null>(null);

  const importInProgress = useRef(false);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const gedcomInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // CSV Import State
  const [csvResult, setCsvResult] = useState<(CsvImportResult & {
    candidate: GenealogyDatabaseSnapshot;
  }) | null>(null);
  const [csvPreviewOpen, setCsvPreviewOpen] = useState(false);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      ...settings,
      clanName: clanName.trim(),
      clanMotto: clanMotto.trim(),
      ancestralHallLocation: ancestralHallLocation.trim(),
      rootPersonId: rootPersonId || undefined,
      updatedAt: new Date().toISOString(),
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  // Branch CRUD Handlers
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchCode('');
    setBranchOrigin('');
    setBranchPeriod('');
    setBranchSubBranches('');
    setBranchDesc('');
    setBranchError(null);
    setBranchFormOpen(true);
  };

  const openEditBranch = (branch: FamilyBranch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchCode(branch.code || '');
    setBranchOrigin(branch.originPlace || '');
    setBranchPeriod(branch.establishedPeriod || '');
    setBranchSubBranches((branch.subBranches || []).join(', '));
    setBranchDesc(branch.description || '');
    setBranchError(null);
    setBranchFormOpen(true);
  };

  const handleSaveBranchForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setBranchError('Vui lòng nhập tên Chi họ / Nhánh.');
      return;
    }

    const now = new Date().toISOString();
    const generatedCode =
      branchCode.trim() ||
      branchName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_|_$/g, '') ||
      `CHI_${Date.now().toString().slice(-4)}`;

    const parsedSubBranches = branchSubBranches
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await saveBranch({
      id: editingBranch?.id || `branch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: branchName.trim(),
      code: generatedCode,
      subBranches: parsedSubBranches,
      originPlace: branchOrigin.trim() || undefined,
      establishedPeriod: branchPeriod.trim() || undefined,
      description: branchDesc.trim() || undefined,
      founderId: editingBranch?.founderId,
      parentBranchId: editingBranch?.parentBranchId,
      createdAt: editingBranch?.createdAt || now,
      updatedAt: now,
    });

    setBranchFormOpen(false);
    setEditingBranch(null);
    setImportNotice({
      type: 'success',
      message: editingBranch
        ? `Đã cập nhật chi họ "${branchName.trim()}".`
        : `Đã thêm chi họ mới "${branchName.trim()}".`,
    });
  };

  const handleConfirmDeleteBranch = async () => {
    if (!deletingBranch || isDeletingBranch) return;
    setIsDeletingBranch(true);
    try {
      await deleteBranch(deletingBranch.id);
      setImportNotice({
        type: 'success',
        message: `Đã xóa chi họ "${deletingBranch.name}" và gỡ các liên kết tới chi này.`,
      });
    } catch (error) {
      setImportNotice({
        type: 'error',
        message: `Không thể xóa chi họ. ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setDeletingBranch(null);
      setIsDeletingBranch(false);
    }
  };

  // 1. Export JSON Snapshot
  const handleExportJson = () => {
    if (!snapshot) return;
    exportDatabaseSnapshotJson(snapshot);
  };

  // 2. Import JSON Snapshot (with Confirmation)
  const handleJsonFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !snapshot) return;

    try {
      const text = await file.text();
      const parsed = validateAndPreviewJsonBackup(text, snapshot, jsonImportMode);
      if (!parsed.valid || !parsed.snapshot) {
        setImportNotice({
          type: 'error',
          message: `Không thể nhập bản sao lưu. ${describeDiagnostics(parsed.errors)}`,
        });
        return;
      }

      setPendingImport({
        snapshot: parsed.snapshot,
        mode: jsonImportMode,
        warnings: parsed.warnings,
        label: `JSON "${parsed.snapshot.settings.clanName}" (${parsed.snapshot.people.length} thành viên)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportNotice({
        type: 'error',
        message: `Lỗi khi đọc tệp JSON: ${msg}`,
      });
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  // 3. Export GEDCOM 5.5.1
  const handleExportGedcom = () => {
    if (!snapshot) return;
    const gedcomText = exportGedcom551(snapshot);
    const blob = new Blob([gedcomText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GiaPhaViet-${settings.clanName.replace(/\s+/g, '_')}.ged`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. Import GEDCOM 5.5.1 (with Confirmation)
  const handleGedcomFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseAndPreviewGedcom(text);
      if (!parsed.valid) {
        setImportNotice({ type: 'error', message: describeDiagnostics(parsed.errors) });
        return;
      }
      const importedSnapshot = parsed.snapshot;
      const validation = validateImportSnapshot(importedSnapshot);
      if (validation.errors.length > 0) {
        setImportNotice({ type: 'error', message: describeDiagnostics(validation.errors) });
        return;
      }
      setPendingImport({
        snapshot: importedSnapshot,
        mode: 'replace',
        warnings: [GEDCOM_REPLACEMENT_WARNING, ...parsed.warnings, ...validation.warnings],
        label: `GEDCOM (${importedSnapshot.people.length} thành viên, ${importedSnapshot.relationships.length} quan hệ)`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportNotice({
        type: 'error',
        message: `Lỗi phân tích cú pháp GEDCOM: ${msg}`,
      });
    } finally {
      if (gedcomInputRef.current) gedcomInputRef.current.value = '';
    }
  };

  const applyImport = async (candidate: GenealogyDatabaseSnapshot, mode: 'replace' | 'merge', label: string) => {
    if (importInProgress.current) return;
    importInProgress.current = true;
    setIsApplyingImport(true);
    try {
      const stats = await importSnapshot(candidate, mode);
      setImportNotice({
        type: 'success',
        message: stats
          ? `Đã gộp dữ liệu từ ${label}: thêm ${stats.addedPeople} thành viên và ${stats.addedRelationships} liên kết.`
          : `Đã khôi phục thành công dữ liệu từ ${label}.`,
      });
    } catch (error) {
      setImportNotice({ type: 'error', message: `Không thể nhập dữ liệu. ${importErrorMessage(error)}` });
    } finally {
      setPendingImport(null);
      setCsvPreviewOpen(false);
      setCsvResult(null);
      importInProgress.current = false;
      setIsApplyingImport(false);
    }
  };

  const handleConfirmPendingImport = async () => {
    if (pendingImport) await applyImport(pendingImport.snapshot, pendingImport.mode, pendingImport.label);
  };

  // 4b. Download Excel / CSV Template
  const handleDownloadCsvTemplate = () => {
    const csvContent = generateCsvTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mau_Nhap_Gia_Pha_${settings.clanName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4c. Select CSV file and parse preview
  const handleCsvFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !snapshot) return;

    try {
      setIsProcessingCsv(true);
      const text = await file.text();
      const result = processCsvImport(parseCsvRows(text), branches, people);
      const candidate: GenealogyDatabaseSnapshot = {
        ...snapshot,
        branches: result.parsedBranches,
        people: result.parsedPeople,
        relationships: result.parsedRelationships,
        unions: result.parsedUnions,
        lifeEvents: [],
        media: [],
        stories: [],
      };
      const validation = result.errors.length > 0
        ? { errors: [], warnings: [] }
        : planSnapshotMerge(snapshot, candidate);
      setCsvResult({
        ...result,
        candidate,
        errors: [...result.errors, ...validation.errors],
        warnings: [...result.warnings, ...validation.warnings],
      });
      setCsvPreviewOpen(true);
    } catch (error) {
      setImportNotice({ type: 'error', message: `Lỗi đọc tệp CSV / Excel: ${importErrorMessage(error)}` });
    } finally {
      setIsProcessingCsv(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleApplyCsvImport = async () => {
    if (csvResult && csvResult.errors.length === 0) {
      await applyImport(csvResult.candidate, 'merge', 'CSV');
    }
  };

  // 5. Reset to Demo Dataset
  const handleResetDemoConfirmed = async () => {
    await resetToDemo();
    setResetConfirmOpen(false);
    setImportNotice({
      type: 'success',
      message: 'Đã nạp lại bộ dữ liệu mẫu mẫu mực: Dòng họ Trần – Đông Ngạc.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in">
      {/* Header */}
      <div className="border-b border-[#E7DFD4] pb-4">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight">
          Quản Lý Dữ Liệu & Sao Lưu
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Dữ liệu gia phả được lưu trữ an toàn trong IndexedDB của trình duyệt. Hãy thường xuyên xuất
          bản sao lưu về máy tính hoặc điện thoại.
        </p>
      </div>

      {/* Notification banner */}
      {importNotice && (
        <div
          role={importNotice.type === 'error' ? 'alert' : 'status'}
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            importNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="whitespace-pre-line break-words">{importNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="text-xs font-semibold underline shrink-0"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Clan Settings Section */}
      <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <Database className="w-5 h-5 text-[#1B3B2B]" />
          <div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
              Thông Tin Chung Về Dòng Tộc
            </h3>
            <p className="text-xs text-stone-500">
              Cập nhật tên họ, gia huấn, địa chỉ từ đường và nhân vật khởi thủy.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#54483C] mb-1">
                Tên dòng họ / Gia tộc
              </label>
              <input
                type="text"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#54483C] mb-1">
                Nhân vật khởi thủy (Gốc cây gia phả)
              </label>
              <select
                value={rootPersonId}
                onChange={(e) => setRootPersonId(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
              >
                <option value="">-- Tự động chọn đời 1 --</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#54483C] mb-1">
              Gia huấn / Câu đối / Tôn chỉ dòng họ
            </label>
            <input
              type="text"
              value={clanMotto}
              onChange={(e) => setClanMotto(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#54483C] mb-1">
              Địa chỉ Nhà thờ tổ / Từ đường dòng họ
            </label>
            <input
              type="text"
              value={ancestralHallLocation}
              onChange={(e) => setAncestralHallLocation(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {settingsSuccess && (
              <span className="text-xs font-medium text-emerald-700">
                ✓ Đã lưu cài đặt dòng họ thành công
              </span>
            )}
            <button
              type="submit"
              className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thông tin</span>
            </button>
          </div>
        </form>
      </div>

      {/* Branch Management Section (Quản lý Chi họ / Phân nhánh) */}
      <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-[#8C6D32]" />
            <div>
              <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                Quản Lý Chi Họ & Phân Nhánh ({branches.length})
              </h3>
              <p className="text-xs text-stone-500">
                Tổ chức các chi trưởng, chi thứ hoặc chi di cư để lọc cây gia phả và bản đồ địa lý.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddBranch}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm chi họ</span>
          </button>
        </div>

        {branchFormOpen && (
          <form
            onSubmit={handleSaveBranchForm}
            className="p-4 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] space-y-3"
          >
            <h4 className="text-xs font-bold text-[#1B3B2B]">
              {editingBranch ? `Chỉnh sửa: ${editingBranch.name}` : 'Thêm chi họ mới'}
            </h4>

            {branchError && (
              <p className="text-xs text-red-700 font-medium">{branchError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Tên chi họ *
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Ví dụ: Chi Ất (Nhánh Hai)"
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Quê gốc / Địa bàn lập chi
                </label>
                <input
                  type="text"
                  value={branchOrigin}
                  onChange={(e) => setBranchOrigin(e.target.value)}
                  placeholder="Ví dụ: Nam Định hoặc TP.HCM"
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Thời kỳ khởi lập
                </label>
                <input
                  type="text"
                  value={branchPeriod}
                  onChange={(e) => setBranchPeriod(e.target.value)}
                  placeholder="Ví dụ: Thế kỷ XIX (Khoảng 1880)"
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>
            </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Mã chi họ
                </label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="Ví dụ: CHI_AT"
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Các phái (ngăn cách dấu phẩy)
                </label>
                <input
                  type="text"
                  value={branchSubBranches}
                  onChange={(e) => setBranchSubBranches(e.target.value)}
                  placeholder="Ví dụ: Phái Nhất, Phái Nhì"
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#54483C] mb-1">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={branchDesc}
                  onChange={(e) => setBranchDesc(e.target.value)}
                  placeholder="Ghi chú nguồn gốc phân chi..."
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBranchFormOpen(false);
                  setEditingBranch(null);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold cursor-pointer"
              >
                {editingBranch ? 'Cập nhật chi họ' : 'Lưu chi họ'}
              </button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-2">
            Chưa có chi họ nào được tạo. Nhấn "Thêm chi họ" để phân chia các nhánh gia tộc.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map((branch) => {
              const memberCount = branchMemberCounts.get(branch.id) || 0;
              return (
                <div
                  key={branch.id}
                  className="p-3.5 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-serif font-bold text-[#1F1913] truncate">
                        {branch.name}
                      </h4>
                      {branch.code && (
                        <span className="text-[10px] font-mono text-stone-400">
                          {branch.code}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 tabular-nums">
                      <span>{memberCount} thành viên</span>
                      {branch.originPlace && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[180px]">{branch.originPlace}</span>
                        </>
                      )}
                      {branch.establishedPeriod && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{branch.establishedPeriod}</span>
                        </>
                      )}
                    </div>
                    {branch.subBranches && branch.subBranches.length > 0 && (
                      <p className="text-[10px] text-[#8C6D32]">
                        Phái: {branch.subBranches.join(', ')}
                      </p>
                    )}
                    {branch.description && (
                      <p className="text-[11px] text-[#54483C] line-clamp-2">{branch.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditBranch(branch)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-[#1B3B2B] hover:bg-white transition-colors cursor-pointer"
                      title="Sửa chi họ"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBranch(branch)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa chi họ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Backup & Restore JSON Section */}
      <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700" />
            <div>
              <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                Sao Lưu Toàn Vẹn JSON (Định Dạng Chuẩn)
              </h3>
              <p className="text-xs text-stone-500">
                Xuất hoặc nhập tệp sao lưu .json trọn vẹn (bao gồm mọi hồ sơ, quan hệ, chi họ và ảnh tư liệu Base64).
              </p>
            </div>
          </div>

          {/* Import mode switch */}
          <div className="flex items-center gap-1 bg-[#F1EBE1] p-1 rounded-xl border border-[#E3D9CC] self-start sm:self-auto text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setJsonImportMode('replace')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                jsonImportMode === 'replace'
                  ? 'bg-[#1B3B2B] text-white'
                  : 'text-[#54483C] hover:text-[#1B3B2B]'
              }`}
            >
              Thay thế toàn bộ
            </button>
            <button
              type="button"
              onClick={() => setJsonImportMode('merge')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                jsonImportMode === 'merge'
                  ? 'bg-[#1B3B2B] text-white'
                  : 'text-[#54483C] hover:text-[#1B3B2B]'
              }`}
            >
              Gộp bổ sung
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">Xuất bản sao lưu .JSON</h4>
              <p className="text-xs text-stone-500 mt-1">
                Tải tệp sao lưu về máy. Bạn có thể chuyển tệp này sang máy khác hoặc gửi cho người thân trong dòng họ.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải bản sao lưu JSON</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">
                {jsonImportMode === 'merge' ? 'Gộp thêm dữ liệu từ .JSON' : 'Khôi phục từ tệp .JSON'}
              </h4>
              <p className="text-xs text-stone-500 mt-1">
                {jsonImportMode === 'merge'
                  ? 'Bổ sung thành viên và quan hệ mới từ tệp JSON vào gia phả hiện có mà không xóa dữ liệu cũ.'
                  : 'Chọn tệp JSON đã lưu trước đó để phục hồi toàn bộ dữ liệu dòng họ vào trình duyệt.'}
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D5CABE] hover:bg-stone-50 text-[#1F1913] text-xs font-semibold cursor-pointer shadow-xs transition-colors">
              <Upload className="w-4 h-4 text-[#1B3B2B]" />
              <span>Chọn tệp sao lưu JSON...</span>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* GEDCOM 5.5.1 Section */}
      <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <FileCode className="w-5 h-5 text-[#8C6D32]" />
          <div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
              Trao Đổi Chuẩn GEDCOM 5.5.1 (Quốc Tế)
            </h3>
            <p className="text-xs text-stone-500">
              Tương thích với các ứng dụng phả hệ thế giới (Gramps, MyHeritage, FamilySearch). Hỗ trợ mã hóa UTF-8 tiếng Việt.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">Xuất tệp GEDCOM (.ged)</h4>
              <p className="text-xs text-stone-500 mt-1">
                Trao đổi cấu trúc phả hệ và các trường tiếng Việt được hỗ trợ. Dùng JSON để sao lưu toàn bộ dữ liệu.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportGedcom}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#8C6D32] hover:bg-[#735724] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Xuất tệp GEDCOM</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">Nhập tệp GEDCOM (.ged)</h4>
              <p className="text-xs text-stone-500 mt-1">
                Nhập phả hệ từ các phần mềm khác để tiếp tục quản lý và vẽ cây trong Gia Phả Việt.
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D5CABE] hover:bg-stone-50 text-[#1F1913] text-xs font-semibold cursor-pointer shadow-xs transition-colors">
              <Upload className="w-4 h-4 text-[#8C6D32]" />
              <span>Chọn tệp GEDCOM...</span>
              <input
                ref={gedcomInputRef}
                type="file"
                accept=".ged"
                onChange={handleGedcomFileSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Excel / CSV Bulk Import Section */}
      <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
          <div>
            <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
              Nhập Dữ Liệu Hàng Loạt Từ Excel / CSV
            </h3>
            <p className="text-xs text-stone-500">
              Nhập hàng chục hoặc hàng trăm thành viên cùng lúc. Tự động liên kết quan hệ cha mẹ, vợ chồng và chi họ.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">Tải tệp mẫu Excel (.csv)</h4>
              <p className="text-xs text-stone-500 mt-1">
                Tệp mẫu tiếng Việt chuẩn UTF-8 có sẵn tiêu đề các cột và 3 dòng ví dụ mẫu mực để bạn dễ dàng điền tiếp.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Tải File Mẫu Excel / CSV</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1F1913]">Tải lên danh sách thành viên</h4>
              <p className="text-xs text-stone-500 mt-1">
                Chọn file CSV đã điền thông tin để xem trước bảng đối chiếu và tự động dựng cây gia phả.
              </p>
            </div>
            <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white border border-[#D5CABE] hover:bg-stone-50 text-[#1F1913] text-xs font-semibold cursor-pointer shadow-xs transition-colors">
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{isProcessingCsv ? 'Đang phân tích...' : 'Chọn tệp CSV / Excel...'}</span>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvFileSelected}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Reset Demo Data Section */}
      <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="w-5 h-5 text-amber-700" />
          <h3 className="text-sm font-serif font-bold text-[#1F1913]">
            Khôi Phục Dữ Liệu Mẫu (Demo Reset)
          </h3>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          Nạp lại bộ dữ liệu phả hệ mẫu mực 5 thế hệ (Dòng họ Trần – Đông Ngạc) với đầy đủ chân dung,
          chi họ, đa hôn phối, ngày giỗ âm lịch và câu chuyện gia tộc.
        </p>
        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nạp lại dữ liệu mẫu</span>
        </button>
      </div>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        open={resetConfirmOpen}
        title="Xác nhận nạp lại dữ liệu mẫu"
        description="Thao tác này sẽ ghi đè cơ sở dữ liệu hiện tại bằng bộ dữ liệu mẫu mẫu mực của Dòng họ Trần – Đông Ngạc. Bạn có muốn tiếp tục?"
        confirmLabel="Đồng ý nạp lại"
        cancelLabel="Hủy"
        danger={true}
        onConfirm={handleResetDemoConfirmed}
        onCancel={() => setResetConfirmOpen(false)}
      />

      {/* Delete Branch Confirm Dialog */}
      <ConfirmDialog
        open={!!deletingBranch}
        title={`Xác nhận xóa chi họ "${deletingBranch?.name || ''}"`}
        description={[
          'Giữ lại hồ sơ, chi con, kỷ vật và nhật ký. Khi xóa, hệ thống gỡ liên kết tới chi này. Chi con trực tiếp trở thành chi cấp cao nhất.',
          deleteBranchImpact
            ? `Theo dữ liệu đang hiển thị, liên kết bị ảnh hưởng gồm ${deleteBranchImpact.primary} hồ sơ chi chính, ${deleteBranchImpact.secondary} hồ sơ chi phụ, ${deleteBranchImpact.children} chi con trực tiếp, ${deleteBranchImpact.media} kỷ vật và ${deleteBranchImpact.stories} bản ghi nhật ký.`
            : '',
        ].filter(Boolean).join('\n\n')}
        confirmLabel={isDeletingBranch ? 'Đang xóa…' : 'Xóa chi họ'}
        cancelLabel="Hủy"
        danger={true}
        busy={isDeletingBranch}
        onConfirm={handleConfirmDeleteBranch}
        onCancel={() => setDeletingBranch(null)}
      />

      {/* Import Backup / GEDCOM Confirm Dialog */}
      <ConfirmDialog
        open={!!pendingImport}
        title={
          pendingImport?.mode === 'merge'
            ? 'Xác nhận gộp bổ sung dữ liệu'
            : 'Xác nhận khôi phục & thay thế dữ liệu'
        }
        description={
          pendingImport
            ? [
              pendingImport.mode === 'merge'
                ? `Ứng dụng sẽ bổ sung dữ liệu từ ${pendingImport.label} vào gia phả hiện có.`
                : `Thao tác này sẽ thay thế toàn bộ dữ liệu gia phả hiện tại bằng ${pendingImport.label}. Nên xuất bản sao lưu JSON trước khi tiếp tục.`,
              pendingImport.warnings.length > 0
                ? `Cảnh báo:\n${describeDiagnostics(pendingImport.warnings)}`
                : '',
            ].filter(Boolean).join('\n\n')
            : ''
        }
        confirmLabel={isApplyingImport ? 'Đang nhập…' : pendingImport?.mode === 'merge' ? 'Gộp dữ liệu' : 'Xác nhận thay thế'}
        busy={isApplyingImport}
        cancelLabel="Hủy"
        danger={pendingImport?.mode !== 'merge'}
        onConfirm={handleConfirmPendingImport}
        onCancel={() => setPendingImport(null)}
      />

      {/* CSV Import Preview Modal */}
      {csvPreviewOpen && csvResult && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in"
          onClick={() => { if (!isApplyingImport) setCsvPreviewOpen(false); }}
        >
          <div
            className="w-full max-w-3xl bg-[#FFFDF9] rounded-3xl border border-[#E7DFD4] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-[#1F1913]">
                  Xem Trước Dữ Liệu Nhập Từ CSV ({csvResult.totalRows} thành viên)
                </h3>
              </div>
              <button
                type="button"
                disabled={isApplyingImport}
                onClick={() => setCsvPreviewOpen(false)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            {/* Stats Badge */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="font-bold text-emerald-900 text-lg tabular-nums">
                  {csvResult.parsedPeople.length}
                </p>
                <p className="text-[10px] text-emerald-700">Thành viên nhận diện</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <p className="font-bold text-amber-900 text-lg tabular-nums">
                  {csvResult.parsedRelationships.length}
                </p>
                <p className="text-[10px] text-amber-700">Mối quan hệ Cha/Mẹ - Con</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <p className="font-bold text-rose-900 text-lg tabular-nums">
                  {csvResult.parsedUnions.length}
                </p>
                <p className="text-[10px] text-rose-700">Cặp hôn phối (Vợ chồng)</p>
              </div>
            </div>

            {csvResult.errors.length > 0 && (
              <p role="alert" className="max-h-32 overflow-auto whitespace-pre-line text-xs text-red-800">
                {describeDiagnostics(csvResult.errors)}
              </p>
            )}
            {csvResult.warnings.length > 0 && (
              <p className="max-h-24 overflow-auto whitespace-pre-line text-xs text-amber-800">
                {describeDiagnostics(csvResult.warnings)}
              </p>
            )}

            {/* Table preview */}
            <div className="flex-1 overflow-y-auto border border-[#E7DFD4] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-[#E7DFD4] sticky top-0">
                  <tr>
                    <th className="p-2">Dòng</th>
                    <th className="p-2">Họ và tên</th>
                    <th className="p-2">Giới tính</th>
                    <th className="p-2">Đời</th>
                    <th className="p-2">Cha / Mẹ</th>
                    <th className="p-2">Bạn đời</th>
                    <th className="p-2">Năm sinh - mất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {csvResult.rows.map((row) => (
                    <tr key={row.rowNumber} className="hover:bg-stone-50">
                      <td className="p-2 font-mono text-[11px] text-stone-400">
                        {row.rowNumber}
                      </td>
                      <td className="p-2 font-semibold text-[#1F1913]">{row.fullName}</td>
                      <td className="p-2">
                        {row.gender === 'male' ? 'Nam' : row.gender === 'female' ? 'Nữ' : '—'}
                      </td>
                      <td className="p-2 font-semibold text-[#1B3B2B]">
                        {row.generation ? `Đời ${row.generation}` : '—'}
                      </td>
                      <td className="p-2 text-stone-600 text-[11px]">
                        {[row.fatherName, row.motherName].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="p-2 text-stone-600 text-[11px]">
                        {row.spouseName || '—'}
                      </td>
                      <td className="p-2 text-stone-500 text-[11px]">
                        {row.birthYear || '?'} - {row.deathYear || (row.isLiving ? 'Còn sống' : '?')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
              <span className="text-stone-500">
                {csvResult.errors.length > 0
                  ? 'Sửa các lỗi trong tệp CSV rồi chọn lại tệp.'
                  : 'Dữ liệu sẽ được bổ sung vào gia phả hiện tại.'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isApplyingImport}
                onClick={() => setCsvPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyCsvImport}
                  disabled={isApplyingImport || csvResult.errors.length > 0}
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs disabled:opacity-50"
                >
                  {isApplyingImport ? 'Đang nhập…' : 'Xác nhận Nhập vào Gia Phả'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
