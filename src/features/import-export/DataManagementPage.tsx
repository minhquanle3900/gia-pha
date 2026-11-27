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
import { useNativeModal } from '../../hooks/useNativeModal';
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

const dataPanel = 'min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 shadow-xs sm:p-5';
const dataField = 'min-h-11 w-full rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]';
const dataAction = 'inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32] disabled:opacity-60';
const dataPrimary = 'bg-[#1B3B2B] text-white hover:bg-[#28503C]';
const dataSecondary = 'border border-[#D5CABE] bg-white text-[#1B3B2B] hover:bg-stone-50';
const dataFileAction = `${dataAction} ${dataSecondary} w-full cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#8C6D32]`;

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
  const branchDeletionInProgress = useRef(false);

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
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const resetInProgress = useRef(false);
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
  const csvPreviewDialogRef = useNativeModal(csvPreviewOpen);

  const closeCsvPreview = () => {
    if (importInProgress.current) return;
    setCsvPreviewOpen(false);
    setCsvResult(null);
  };

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
    if (!deletingBranch || branchDeletionInProgress.current) return;
    branchDeletionInProgress.current = true;
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
      branchDeletionInProgress.current = false;
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

      jsonInputRef.current?.focus({ preventScroll: true });
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
      gedcomInputRef.current?.focus({ preventScroll: true });
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
      csvInputRef.current?.focus({ preventScroll: true });
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
    if (resetInProgress.current) return;
    resetInProgress.current = true;
    setIsResettingDemo(true);
    try {
      await resetToDemo();
      setImportNotice({
        type: 'success',
        message: 'Đã nạp lại bộ dữ liệu mẫu mẫu mực: Dòng họ Trần – Đông Ngạc.',
      });
    } catch (error) {
      setImportNotice({ type: 'error', message: `Không thể nạp lại dữ liệu mẫu. ${importErrorMessage(error)}` });
    } finally {
      resetInProgress.current = false;
      setIsResettingDemo(false);
      setResetConfirmOpen(false);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-4 pb-16 sm:space-y-6">
      <div className="rounded-2xl border border-[#2B4B3A] bg-[#1B3B2B] px-4 py-5 text-white sm:px-6 sm:py-6">
        <Database aria-hidden="true" className="mb-2 size-5 text-[#DBC599]" />
        <h1 className="text-3xl font-bold leading-none text-[#FFFDF9] sm:text-4xl">Quản lý dữ liệu</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#E6DFD5]">
          Dữ liệu nằm trong trình duyệt này. Hãy giữ một bản sao lưu khi đổi thiết bị hoặc trước khi thay thế dữ liệu.
        </p>
      </div>

      {/* Notification banner */}
      {importNotice && (
        <div
          role={importNotice.type === 'error' ? 'alert' : 'status'}
          className={`flex min-w-0 items-start justify-between gap-2 rounded-2xl border p-3 text-sm ${
            importNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex min-w-0 items-start gap-2 pt-1">
            {importNotice.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="min-w-0 break-words whitespace-pre-line">{importNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="min-h-11 shrink-0 rounded-lg px-2 font-semibold underline focus-visible:outline-2"
          >
            Đóng
          </button>
        </div>
      )}

      <section aria-labelledby="json-backup-heading" className={`${dataPanel} border-t-4 border-t-[#1B3B2B]`}>
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#1B3B2B]" />
          <div className="min-w-0">
            <h2 id="json-backup-heading" className="text-2xl font-bold leading-tight text-[#1F1913]">Sao lưu và khôi phục JSON</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#655A4E]">
              Bản sao lưu giữ các bản ghi và tệp đã nhúng. Tệp từ đường dẫn ngoài có thể không mở trên thiết bị khác.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] p-3 sm:p-4">
            <div>
              <h3 className="font-sans text-sm font-semibold text-[#1F1913]">Lưu bản sao</h3>
              <p className="mt-1 text-sm text-[#655A4E]">Tải tệp JSON về để lưu giữ hoặc chuyển sang thiết bị khác.</p>
            </div>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={!snapshot}
              className={`${dataAction} ${dataPrimary} w-full`}
            >
              <Download aria-hidden="true" className="size-4 shrink-0" />
              Tải bản sao lưu JSON
            </button>
          </div>

          <div className="min-w-0 space-y-3 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] p-3 sm:p-4">
            <h3 id="json-mode-heading" className="font-sans text-sm font-semibold text-[#1F1913]">Nhập bản sao lưu</h3>
            <div role="group" aria-labelledby="json-mode-heading" className="grid grid-cols-2 gap-1 rounded-xl border border-[#E3D9CC] bg-[#F1EBE1] p-1">
              <button
                type="button"
                onClick={() => setJsonImportMode('replace')}
                aria-pressed={jsonImportMode === 'replace'}
                className={`${dataAction} px-2 text-xs ${jsonImportMode === 'replace' ? 'bg-[#1B3B2B] text-white' : 'text-[#54483C]'}`}
              >
                Thay thế toàn bộ
              </button>
              <button
                type="button"
                onClick={() => setJsonImportMode('merge')}
                aria-pressed={jsonImportMode === 'merge'}
                className={`${dataAction} px-2 text-xs ${jsonImportMode === 'merge' ? 'bg-[#1B3B2B] text-white' : 'text-[#54483C]'}`}
              >
                Gộp bổ sung
              </button>
            </div>
            <p id="json-import-description" className="text-sm leading-snug text-[#655A4E]">
              {jsonImportMode === 'merge'
                ? 'Gộp bản ghi mới vào gia phả hiện có.'
                : 'Khôi phục bản sao bằng cách thay thế dữ liệu hiện tại.'}
            </p>
            <label className={dataFileAction}>
              <Upload aria-hidden="true" className="size-4 shrink-0" />
              Chọn tệp JSON
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileSelected}
                aria-describedby="json-import-description"
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Clan Settings Section */}
      <section aria-labelledby="clan-settings" className={dataPanel}>
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <Database className="w-5 h-5 text-[#1B3B2B]" />
          <div>
            <h2 id="clan-settings" className="text-2xl font-bold leading-tight text-[#1F1913]">
              Thông tin dòng họ
            </h2>
            <p className="text-sm text-[#655A4E]">
              Cập nhật tên họ, gia huấn, địa chỉ từ đường và nhân vật khởi thủy.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="clan-name" className="mb-1 block text-sm font-semibold text-[#54483C]">
                Tên dòng họ / Gia tộc
              </label>
              <input
                type="text"
                id="clan-name"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                className={dataField}
              />
            </div>

            <div>
              <label htmlFor="clan-root" className="mb-1 block text-sm font-semibold text-[#54483C]">
                Nhân vật khởi thủy (Gốc cây gia phả)
              </label>
              <select
                id="clan-root"
                value={rootPersonId}
                onChange={(e) => setRootPersonId(e.target.value)}
                className={dataField}
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
            <label htmlFor="clan-motto" className="mb-1 block text-sm font-semibold text-[#54483C]">
              Gia huấn / Câu đối / Tôn chỉ dòng họ
            </label>
            <input
              type="text"
              id="clan-motto"
              value={clanMotto}
              onChange={(e) => setClanMotto(e.target.value)}
              className={dataField}
            />
          </div>

          <div>
            <label htmlFor="clan-ancestral-hall" className="mb-1 block text-sm font-semibold text-[#54483C]">
              Địa chỉ Nhà thờ tổ / Từ đường dòng họ
            </label>
            <input
              type="text"
              id="clan-ancestral-hall"
              value={ancestralHallLocation}
              onChange={(e) => setAncestralHallLocation(e.target.value)}
              className={dataField}
            />
          </div>

          <div className="flex flex-col items-start gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {settingsSuccess && (
              <span className="text-sm font-medium text-emerald-700" role="status">
                ✓ Đã lưu cài đặt dòng họ thành công
              </span>
            )}
            <button
              type="submit"
              className={`${dataAction} ${dataPrimary} w-full sm:ml-auto sm:w-auto`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu thông tin</span>
            </button>
          </div>
        </form>
      </section>

      {/* Branch Management Section (Quản lý Chi họ / Phân nhánh) */}
      <section aria-labelledby="clan-branches" className={dataPanel}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-[#8C6D32]" />
            <div>
              <h2 id="clan-branches" className="text-2xl font-bold leading-tight text-[#1F1913]">
                Chi họ ({branches.length})
              </h2>
              <p className="text-sm text-[#655A4E]">
                Tổ chức các chi trưởng, chi thứ hoặc chi di cư để lọc cây gia phả và bản đồ địa lý.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddBranch}
            className={`${dataAction} ${dataPrimary} w-full sm:w-auto`}
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
              <p id="branch-error" className="text-sm font-medium text-red-700 dark:text-[#F6C7BE]" role="alert">{branchError}</p>
            )}

            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="branch-name" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Tên chi họ *
                </label>
                <input
                  type="text"
                  id="branch-name"
                value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Ví dụ: Chi Ất (Nhánh Hai)"
                  aria-invalid={Boolean(branchError)}
                  aria-describedby={branchError ? 'branch-error' : undefined}
                  className={dataField}
                />
              </div>
              <div>
                <label htmlFor="branch-origin" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Quê gốc / Địa bàn lập chi
                </label>
                <input
                  type="text"
                  id="branch-origin"
                value={branchOrigin}
                  onChange={(e) => setBranchOrigin(e.target.value)}
                  placeholder="Ví dụ: Nam Định hoặc TP.HCM"
                  className={dataField}
                />
              </div>
              <div>
                <label htmlFor="branch-period" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Thời kỳ khởi lập
                </label>
                <input
                  type="text"
                  id="branch-period"
                value={branchPeriod}
                  onChange={(e) => setBranchPeriod(e.target.value)}
                  placeholder="Ví dụ: Thế kỷ XIX (Khoảng 1880)"
                  className={dataField}
                />
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 items-end gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="branch-code" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Mã chi họ
                </label>
                <input
                  type="text"
                  id="branch-code"
                value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="Ví dụ: CHI_AT"
                  className={dataField}
                />
              </div>

              <div>
                <label htmlFor="branch-sub-branches" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Các phái (ngăn cách dấu phẩy)
                </label>
                <input
                  type="text"
                  id="branch-sub-branches"
                value={branchSubBranches}
                  onChange={(e) => setBranchSubBranches(e.target.value)}
                  placeholder="Ví dụ: Phái Nhất, Phái Nhì"
                  className={dataField}
                />
              </div>

              <div>
                <label htmlFor="branch-description" className="mb-1 block text-sm font-semibold text-[#54483C]">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  id="branch-description"
                value={branchDesc}
                  onChange={(e) => setBranchDesc(e.target.value)}
                  placeholder="Ghi chú nguồn gốc phân chi..."
                  className={dataField}
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
                className={`${dataAction} ${dataSecondary}`}
              >
                Hủy
              </button>
              <button
                type="submit"
                className={`${dataAction} ${dataPrimary}`}
              >
                {editingBranch ? 'Cập nhật chi họ' : 'Lưu chi họ'}
              </button>
            </div>
          </form>
        )}

        {branches.length === 0 ? (
          <p className="text-sm text-[#655A4E] italic py-2">
            Chưa có chi họ nào được tạo. Nhấn "Thêm chi họ" để phân chia các nhánh gia tộc.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map((branch) => {
              const memberCount = branchMemberCounts.get(branch.id) || 0;
              return (
                <div
                  key={branch.id}
                  className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <h4 className="break-words text-base font-bold text-[#1F1913]">
                        {branch.name}
                      </h4>
                      {branch.code && (
                        <span className="min-w-0 break-all font-mono text-xs text-[#655A4E]">
                          {branch.code}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-500 tabular-nums">
                      <span>{memberCount} thành viên</span>
                      {branch.originPlace && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="min-w-0 break-words">{branch.originPlace}</span>
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

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEditBranch(branch)}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-[#655A4E] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]"
                      aria-label={`Sửa chi họ ${branch.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingBranch(branch)}
                      className="inline-flex size-11 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32] dark:text-[#F6C7BE]"
                      aria-label={`Xóa chi họ ${branch.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* GEDCOM 5.5.1 Section */}
      <section aria-labelledby="gedcom-heading" className={dataPanel}>
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <FileCode className="w-5 h-5 text-[#8C6D32]" />
          <div>
            <h2 id="gedcom-heading" className="text-2xl font-bold leading-tight text-[#1F1913]">
              Trao đổi GEDCOM
            </h2>
            <p className="text-sm text-[#655A4E]">
              Nhập hoặc xuất cây phả hệ GEDCOM 5.5.1 bằng tiếng Việt.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-sans text-sm font-semibold text-[#1F1913]">Xuất tệp GEDCOM (.ged)</h4>
              <p className="mt-1 text-sm text-[#655A4E]">
                Trao đổi cấu trúc phả hệ và các trường tiếng Việt được hỗ trợ. Dùng JSON để sao lưu toàn bộ dữ liệu.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportGedcom}
              className={`${dataAction} ${dataSecondary} w-full`}
            >
              <Download className="w-4 h-4" />
              <span>Xuất tệp GEDCOM</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-sans text-sm font-semibold text-[#1F1913]">Nhập tệp GEDCOM (.ged)</h4>
              <p className="mt-1 text-sm text-[#655A4E]">
                Nhập phả hệ từ các phần mềm khác để tiếp tục quản lý và vẽ cây trong Gia Phả Việt.
              </p>
            </div>
            <label className={dataFileAction}>
              <Upload className="w-4 h-4 text-[#8C6D32]" />
              <span>Chọn tệp GEDCOM...</span>
              <input
                ref={gedcomInputRef}
                type="file"
                accept=".ged"
                onChange={handleGedcomFileSelected}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Excel / CSV Bulk Import Section */}
      <section aria-labelledby="csv-heading" className={dataPanel}>
        <div className="flex items-center gap-2.5 border-b border-[#E7DFD4] pb-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
          <div>
            <h2 id="csv-heading" className="text-2xl font-bold leading-tight text-[#1F1913]">
              Nhập CSV
            </h2>
            <p className="text-sm text-[#655A4E]">
              Thêm nhiều thành viên từ bảng tính lưu dưới dạng CSV.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-sans text-sm font-semibold text-[#1F1913]">Tải tệp mẫu Excel (.csv)</h4>
              <p className="mt-1 text-sm text-[#655A4E]">
                Dùng tệp mẫu để điền đúng tên cột.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className={`${dataAction} ${dataSecondary} w-full`}
            >
              <Download className="w-4 h-4" />
              <span>Tải mẫu CSV</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-sans text-sm font-semibold text-[#1F1913]">Tải lên danh sách thành viên</h4>
              <p className="mt-1 text-sm text-[#655A4E]">
                Xem trước các hồ sơ và quan hệ trước khi nhập.
              </p>
            </div>
            <label className={dataFileAction}>
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{isProcessingCsv ? 'Đang phân tích...' : 'Chọn tệp CSV'}</span>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvFileSelected}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Reset Demo Data Section */}
      <div className="min-w-0 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:p-5">
        <div className="flex items-center gap-2.5">
          <RotateCcw className="w-5 h-5 text-amber-700" />
          <h3 className="text-sm font-serif font-bold text-[#1F1913]">
            Dữ liệu mẫu
          </h3>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed">
          Nạp dữ liệu mẫu họ Trần – Đông Ngạc sẽ thay thế dữ liệu đang có.
        </p>
        <button
          type="button"
          onClick={() => setResetConfirmOpen(true)}
          className={`${dataAction} w-full bg-amber-800 text-white hover:bg-amber-900 sm:w-auto`}
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
        confirmLabel={isResettingDemo ? 'Đang nạp lại…' : 'Đồng ý nạp lại'}
        busy={isResettingDemo}
        cancelLabel="Hủy"
        danger={true}
        onConfirm={handleResetDemoConfirmed}
        onCancel={() => {
          if (!resetInProgress.current) setResetConfirmOpen(false);
        }}
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
        onCancel={() => {
          if (!branchDeletionInProgress.current) setDeletingBranch(null);
        }}
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
        onCancel={() => {
          if (!importInProgress.current) setPendingImport(null);
        }}
      />

      {/* CSV Import Preview Modal */}
      {csvPreviewOpen && csvResult && (
        <dialog
          ref={csvPreviewDialogRef}
          aria-modal="true"
          aria-labelledby="csv-preview-title"
          aria-busy={isApplyingImport}
          closedby={isApplyingImport ? 'none' : 'closerequest'}
          onCancel={(event) => {
            event.preventDefault();
            closeCsvPreview();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCsvPreview();
          }}
          className="m-auto w-[calc(100%-1rem)] max-w-3xl rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-0 text-[#1F1913] shadow-2xl backdrop:bg-black/60"
        >
          <div className="flex max-h-[85dvh] min-w-0 flex-col gap-3 p-3 sm:p-5">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E7DFD4] pb-2">
              <div className="flex min-w-0 items-start gap-2">
                <FileSpreadsheet aria-hidden="true" className="mt-1 size-5 shrink-0 text-[#1B3B2B]" />
                <div>
                  <h2 id="csv-preview-title" className="text-xl font-bold leading-tight">Xem trước tệp CSV</h2>
                  <p className="mt-0.5 text-sm text-[#655A4E]">{csvResult.totalRows} dòng dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isApplyingImport}
                onClick={closeCsvPreview}
                aria-label="Đóng xem trước CSV"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-[#655A4E] hover:bg-stone-50 focus-visible:outline-2"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="grid shrink-0 grid-cols-3 gap-1.5 text-center text-xs sm:gap-3">
              <div className="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-1.5">
                <p className="font-bold text-emerald-900 text-lg tabular-nums">
                  {csvResult.parsedPeople.length}
                </p>
                <p className="text-emerald-900">Hồ sơ</p>
              </div>
              <div className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-1.5">
                <p className="font-bold text-amber-900 text-lg tabular-nums">
                  {csvResult.parsedRelationships.length}
                </p>
                <p className="text-amber-900">Quan hệ cha mẹ</p>
              </div>
              <div className="min-w-0 rounded-lg border border-rose-200 bg-rose-50 p-1.5">
                <p className="font-bold text-rose-900 text-lg tabular-nums">
                  {csvResult.parsedUnions.length}
                </p>
                <p className="text-rose-900">Hôn phối</p>
              </div>
            </div>

            <div className="min-h-0 min-w-0 space-y-2 overflow-y-auto p-0.5">
              {csvResult.errors.length > 0 && (
                <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm break-words whitespace-pre-line text-red-800 dark:text-[#F6C7BE]">
                  {describeDiagnostics(csvResult.errors)}
                </p>
              )}
              {csvResult.warnings.length > 0 && (
                <p className="rounded-lg bg-amber-50 p-2 text-sm break-words whitespace-pre-line text-amber-900">
                  {describeDiagnostics(csvResult.warnings)}
                </p>
              )}
              <div
                role="region"
                aria-label="Bảng dữ liệu CSV có thể cuộn ngang"
                tabIndex={0}
                className="max-w-full overflow-x-auto rounded-xl border border-[#E7DFD4] focus-visible:outline-2 focus-visible:outline-[#8C6D32]"
              >
                <table className="w-full min-w-[38rem] text-left text-xs">
                  <thead className="border-b border-[#E7DFD4] bg-[#FAF7F2] font-semibold text-[#655A4E]">
                    <tr>
                      <th scope="col" className="p-2">Dòng</th>
                      <th scope="col" className="p-2">Họ và tên</th>
                      <th scope="col" className="p-2">Giới tính</th>
                      <th scope="col" className="p-2">Đời</th>
                      <th scope="col" className="p-2">Cha / Mẹ</th>
                      <th scope="col" className="p-2">Bạn đời</th>
                      <th scope="col" className="p-2">Năm sinh - mất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {csvResult.rows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-stone-50">
                        <td className="p-2 font-mono text-[#655A4E]">{row.rowNumber}</td>
                        <td className="p-2 font-semibold">{row.fullName}</td>
                        <td className="p-2">
                          {row.gender === 'male' ? 'Nam' : row.gender === 'female' ? 'Nữ' : '—'}
                        </td>
                        <td className="p-2 font-semibold text-[#1B3B2B]">
                          {row.generation ? `Đời ${row.generation}` : '—'}
                        </td>
                        <td className="p-2 text-[#655A4E]">
                          {[row.fatherName, row.motherName].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="p-2 text-[#655A4E]">{row.spouseName || '—'}</td>
                        <td className="p-2 text-[#655A4E]">
                          {row.birthYear || '?'} - {row.deathYear || (row.isLiving ? 'Còn sống' : '?')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 border-t border-[#E7DFD4] pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#655A4E]">
                {csvResult.errors.length > 0
                  ? 'Sửa các lỗi trong tệp CSV rồi chọn lại tệp.'
                  : 'Dữ liệu sẽ được bổ sung vào gia phả hiện tại.'}
              </p>
              <div className="flex shrink-0 items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isApplyingImport}
                onClick={closeCsvPreview}
                  className={`${dataAction} ${dataSecondary}`}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyCsvImport}
                  disabled={isApplyingImport || csvResult.errors.length > 0}
                  className={`${dataAction} ${dataPrimary}`}
                >
                  {isApplyingImport ? 'Đang nhập…' : 'Xác nhận nhập'}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};
