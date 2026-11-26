import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  Compass,
  Database,
  GitFork,
  GitMerge,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  QrCode,
  Scroll,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { usePreferences } from '../hooks/usePreferences';
import { usePrivacyShield } from '../hooks/usePrivacyShield';
import { NavigationTab } from '../models/genealogy';
import { GlobalSearch } from './GlobalSearch';
import { PrivacyPinModal } from './PrivacyPinModal';
import { PWAWidgets } from './PWAWidgets';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface AppShellProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onQuickAddPerson: () => void;
  onOpenKinship?: () => void;
  onOpenQRShare?: () => void;
  onOpenDuplicateMerge?: () => void;
  onOpenTour?: () => void;
  onSelectPerson?: (personId: string) => void;
  onFocusInTree?: (personId: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  key: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

// 5 Core primary navigation tabs (high-frequency)
const CORE_NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: Compass },
  { key: 'tree', label: 'Cây gia phả', icon: GitFork },
  { key: 'members', label: 'Thành viên', icon: Users },
  { key: 'journal', label: 'Nhật ký dòng họ', icon: Scroll },
  { key: 'rites', label: 'Lễ giỗ & Tiết kỵ', icon: Calendar },
];

// Extended archival & analytical tools
const EXTENDED_NAV_ITEMS: NavItem[] = [
  { key: 'stats', label: 'Thống kê gia tộc', icon: BarChart3, description: 'Biểu đồ thế hệ, tỷ lệ nam/nữ, tuổi thọ' },
  { key: 'gallery', label: 'Kho kỷ vật', icon: ImageIcon, description: 'Hình ảnh chân dung, tư liệu lịch sử' },
  { key: 'book', label: 'Sách phả ký', icon: BookOpen, description: 'Xuất bản gia phả khổ A4 truyền thống' },
  { key: 'map', label: 'Bản đồ di cư', icon: MapPin, description: 'Dấu chân thiên di và các phân chi' },
  { key: 'data', label: 'Quản lý dữ liệu', icon: Database, description: 'Sao lưu JSON, nhập xuất GEDCOM, Excel' },
];

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onQuickAddPerson,
  onOpenKinship,
  onOpenQRShare,
  onOpenDuplicateMerge,
  onOpenTour,
  onSelectPerson,
  onFocusInTree,
  children,
}) => {
  const { settings } = useGenealogy();
  const { preferences, toggleTheme } = usePreferences();
  const { isShieldActive, hasPin, lockShield } = usePrivacyShield();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopToolsOpen, setDesktopToolsOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'unlock' | 'setup' | 'change'>('unlock');

  const toolsDropdownRef = useRef<HTMLDivElement | null>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const { requestClose: requestMobileMenuClose } = useModalAccessibility({
    open: mobileMenuOpen,
    dialogRef: mobileDialogRef,
    returnFocusRef: mobileMenuButtonRef,
    onRequestClose: () => setMobileMenuOpen(false),
  });

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeHiddenDrawer = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener('change', closeHiddenDrawer);
    return () => desktop.removeEventListener('change', closeHiddenDrawer);
  }, []);

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(e.target as Node)) {
        setDesktopToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleShieldToggle = () => {
    if (isShieldActive) {
      setPinModalMode(hasPin ? 'unlock' : 'setup');
      setPinModalOpen(true);
    } else {
      lockShield();
    }
  };

  const isExtendedTabActive = EXTENDED_NAV_ITEMS.some((item) => item.key === activeTab);
  const activeExtendedItem = EXTENDED_NAV_ITEMS.find((item) => item.key === activeTab);

  return (
    <div className="app-shell min-h-screen min-w-0 flex flex-col bg-[#FAF7F2] text-[#241C15]">
      {/* Top Header - Strict 3-Zone Contract */}
      <header className="print:hidden sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E7DFD4] transition-all">
        <div className="app-header-layout max-w-7xl mx-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
          {/* Zone 1: Brand Wordmark (Single clean element) */}
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left group select-none"
            onClick={() => onSelectTab('dashboard')}
            title="Về trang tổng quan"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center font-serif text-base font-bold shadow-xs border border-[#2B4B3A] shrink-0">
              源
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-serif font-bold text-sm sm:text-base text-[#1B3B2B] tracking-tight group-hover:text-[#28503C] transition-colors truncate">
                {settings.clanName || 'Gia Phả Việt'}
              </span>
              <span className="text-[10px] text-[#947432] font-semibold tracking-wider uppercase hidden sm:block">
                Cội Nguồn Dòng Họ
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links (Core 5 Tabs + Tools Menu) */}
          <nav aria-label="Điều hướng chính trên máy tính" className="order-3 col-span-2 hidden min-w-0 lg:flex flex-wrap items-center justify-center gap-1 bg-[#F1EBE1]/75 p-1 rounded-2xl border border-[#E3D9CC]">
            {CORE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectTab(item.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#5C4F42] hover:text-[#1B3B2B] hover:bg-white/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Extended Tools Dropdown */}
            <div ref={toolsDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDesktopToolsOpen(!desktopToolsOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isExtendedTabActive
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#5C4F42] hover:text-[#1B3B2B] hover:bg-white/70'
                }`}
                title="Các công cụ và tiện ích phả hệ mở rộng"
              >
                <span>{activeExtendedItem ? activeExtendedItem.label : 'Tiện ích mở rộng'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${desktopToolsOpen ? 'rotate-180' : ''}`} />
              </button>

              {desktopToolsOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] max-h-[70dvh] overflow-y-auto bg-[#FFFDF9] dark:bg-[#17231B] rounded-2xl border border-[#E7DFD4] dark:border-[#2C3E33] shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] uppercase font-bold text-stone-400 px-2.5 py-1 tracking-wider">
                    Phân Tích & Tư Liệu
                  </div>
                  {EXTENDED_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          onSelectTab(item.key);
                          setDesktopToolsOpen(false);
                        }}
                        className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-[#1B3B2B]/10 text-[#1B3B2B] font-bold'
                            : 'hover:bg-stone-100 text-[#3C3228]'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[#8C6D32] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-[10px] text-stone-400 truncate">{item.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  <div className="border-t border-[#EAE3D7] my-1 pt-1">
                    {onOpenKinship && (
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopToolsOpen(false);
                          onOpenKinship();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-[#4A3E33] hover:bg-stone-100 text-left"
                      >
                        <Users className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span>Tra xưng hô họ hàng tự động</span>
                      </button>
                    )}
                    {onOpenQRShare && (
                      <button
                        type="button"
                        onClick={() => {
                          setDesktopToolsOpen(false);
                          onOpenQRShare();
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-[#4A3E33] hover:bg-stone-100 text-left"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#1B3B2B]" />
                        <span>Tạo mã QR chia sẻ ngoại tuyến</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Zone 3: Actions & Search (High-intent controls) */}
          <div className="app-header-actions relative flex min-w-0 items-center justify-end gap-1 sm:gap-2">
            {/* Global Search */}
            <GlobalSearch
              onSelectPerson={onSelectPerson}
              onFocusInTree={onFocusInTree}
              placeholder="Tìm nhanh (Ctrl+K)..."
            />

            {/* Dark Mode Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 shadow-xs transition-colors shrink-0"
              title={
                preferences.theme === 'dark'
                  ? 'Chuyển sang chế độ ban ngày (Light Mode)'
                  : 'Chuyển sang chế độ đọc ban đêm (Dark Mode)'
              }
              aria-label="Chuyển đổi giao diện sáng tối"
            >
              {preferences.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#1B3B2B]" />
              )}
            </button>

            {/* Privacy Shield Button */}
            <button
              type="button"
              onClick={handleShieldToggle}
              aria-label={isShieldActive ? 'Mở khóa riêng tư bằng mã PIN' : 'Khóa thông tin riêng tư'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold shadow-xs transition-colors shrink-0 ${
                isShieldActive
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-emerald-50/80 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
              }`}
              title={
                isShieldActive
                  ? 'Lá chắn riêng tư đang BẬT: Ẩn thông tin riêng của người còn sống. Bấm để mở khóa PIN.'
                  : 'Lá chắn riêng tư đang TẮT: Hiển thị đầy đủ thông tin. Bấm để khóa riêng tư ngay.'
              }
            >
              {isShieldActive ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden xl:inline">Khóa riêng tư</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden xl:inline">Đã mở PIN</span>
                </>
              )}
            </button>

            {/* Tour Guide Button */}
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="hidden xl:flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors shrink-0"
                title="Khám phá các tính năng cốt lõi (Onboarding Tour)"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#C19B4C]" />
                <span>Hướng dẫn</span>
              </button>
            )}

            {/* Primary Action CTA Button: Add Person */}
            <button
              type="button"
              onClick={onQuickAddPerson}
              aria-label="Thêm thành viên mới"
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#254F3A] text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
              title="Thêm thành viên mới vào gia phả"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Thêm người</span>
            </button>
          </div>
          <div className="app-pwa-status order-4 col-span-2 min-w-0">
            <PWAWidgets />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="app-main min-w-0 flex-1 pb-24 lg:pb-8">
        <div className="app-content min-w-0 max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">{children}</div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Điều hướng chính" className="app-bottom-nav print:hidden lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t border-[#E7DFD4] px-2 py-1.5 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {[
            { key: 'dashboard', label: 'Tổng quan', icon: Compass },
            { key: 'tree', label: 'Cây phả hệ', icon: GitFork },
            { key: 'members', label: 'Thành viên', icon: Users },
            { key: 'rites', label: 'Lễ giỗ', icon: Calendar },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key && !mobileMenuOpen;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab(item.key as NavigationTab);
                }}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  isActive
                    ? 'text-[#1B3B2B] font-semibold bg-[#1B3B2B]/8'
                    : 'text-[#6C5F51] hover:text-[#1B3B2B]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.7]'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Menu toggle */}
          <button
            type="button"
            ref={mobileMenuButtonRef}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-tools-dialog"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
              mobileMenuOpen || ['stats', 'journal', 'gallery', 'book', 'map', 'data'].includes(activeTab)
                ? 'text-[#1B3B2B] font-semibold bg-[#1B3B2B]/8'
                : 'text-[#6C5F51] hover:text-[#1B3B2B]'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">Thêm...</span>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer / Popup for remaining tools */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col justify-end sm:p-3 animate-in fade-in"
          onClick={() => requestMobileMenuClose('backdrop')}
        >
          <div
            ref={mobileDialogRef}
            id="mobile-tools-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Tiện ích gia phả mở rộng"
            tabIndex={-1}
            className="mobile-safe-dialog app-mobile-tools w-full max-h-[100dvh] sm:max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain bg-[#FFFDF9] rounded-t-3xl sm:rounded-3xl border border-[#E7DFD4] p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-2.5">
              <h3 className="font-serif font-bold text-sm text-[#1B3B2B]">
                Tiện Ích Gia Phả Mở Rộng
              </h3>
              <button
                type="button"
                onClick={() => requestMobileMenuClose('button')}
                aria-label="Đóng tiện ích mở rộng"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Dark mode toggle option for mobile */}
              <button
                type="button"
                onClick={toggleTheme}
                className="col-span-2 flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-xs font-medium hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {preferences.theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-[#1B3B2B]" />
                  )}
                  <span className="font-semibold text-stone-800">
                    Chế độ đọc ban đêm (Dark Mode)
                  </span>
                </div>
                <span className="text-xs font-bold text-[#1B3B2B]">
                  {preferences.theme === 'dark' ? 'Đang bật' : 'Đang tắt'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('journal');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <Scroll className="w-4 h-4 text-[#8C3A27]" />
                <span>Nhật ký dòng họ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('stats');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <BarChart3 className="w-4 h-4 text-[#1B3B2B]" />
                <span>Thống kê dòng họ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('gallery');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <ImageIcon className="w-4 h-4 text-[#1B3B2B]" />
                <span>Kho kỷ vật</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('book');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <BookOpen className="w-4 h-4 text-[#8C6D32]" />
                <span>Sách phả ký</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('map');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <MapPin className="w-4 h-4 text-[#2D5A43]" />
                <span>Bản đồ di cư</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSelectTab('data');
                }}
                className="flex items-center gap-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] text-left text-xs font-medium hover:bg-stone-100"
              >
                <Database className="w-4 h-4 text-stone-600" />
                <span>Quản lý dữ liệu</span>
              </button>
            </div>

            <div className="pt-2 border-t border-stone-100 grid grid-cols-3 gap-2">
              {onOpenKinship && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenKinship();
                  }}
                  className="p-2 rounded-xl bg-white border border-[#D5CABE] text-center text-[11px] font-semibold text-[#1B3B2B]"
                >
                  Tra xưng hô
                </button>
              )}

              {onOpenQRShare && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenQRShare();
                  }}
                  className="p-2 rounded-xl bg-white border border-[#D5CABE] text-center text-[11px] font-semibold text-[#1B3B2B]"
                >
                  Chia sẻ QR
                </button>
              )}

              {onOpenDuplicateMerge && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenDuplicateMerge();
                  }}
                  className="p-2 rounded-xl bg-white border border-[#D5CABE] text-center text-[11px] font-semibold text-[#1B3B2B]"
                >
                  Lọc trùng lặp
                </button>
              )}

              {onOpenTour && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenTour();
                  }}
                  className="p-2 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-center text-[11px] font-semibold text-[#1B3B2B] col-span-2"
                >
                  Hướng dẫn nhanh
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleShieldToggle();
                }}
                className={`p-2 rounded-xl border text-center text-[11px] font-bold ${
                  isShieldActive
                    ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                    : 'bg-emerald-100/80 border-emerald-300 text-emerald-900'
                }`}
              >
                {isShieldActive ? 'Khóa riêng tư' : 'Mở PIN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Family Privacy Shield PIN Modal */}
      <PrivacyPinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        defaultMode={pinModalMode}
      />
    </div>
  );
};
