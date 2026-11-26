import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, BookOpen, Calendar, Compass, Database, GitFork, GitMerge, HelpCircle, Landmark, MapPin, Moon, MoreHorizontal, Plus, QrCode, ShieldAlert, ShieldCheck, Sun, Users, X } from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { usePreferences } from '../hooks/usePreferences';
import { usePrivacyShield } from '../hooks/usePrivacyShield';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { NavigationTab } from '../models/genealogy';
import { GlobalSearch } from './GlobalSearch';
import { PrivacyPinModal } from './PrivacyPinModal';
import { PWAWidgets } from './PWAWidgets';
import { GROUP_DESTINATIONS, NAVIGATION_GROUPS, NavigationDestination, NavigationGroup, PAGE_GROUP } from './navigation';

interface AppShellProps {
  activeTab: NavigationTab;
  galleryView?: 'hall' | 'archive';
  onSelectTab: (tab: NavigationTab) => void;
  onOpenExhibition: () => void;
  onQuickAddPerson: () => void;
  onOpenKinship?: () => void;
  onOpenQRShare?: () => void;
  onOpenDuplicateMerge?: () => void;
  onOpenTour?: () => void;
  onSelectPerson?: (id: string) => void;
  onFocusInTree?: (id: string) => void;
  children: React.ReactNode;
}
const groupIcons = { home: Compass, genealogy: GitFork, heritage: Landmark, rites: Calendar, more: MoreHorizontal };
const pageIcons = { stats: BarChart3, map: MapPin, data: Database };
const actionClass = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-ivory-300 bg-white px-3 text-sm font-semibold text-forest-800 transition-colors hover:bg-ivory-100 dark:border-[#374A3D] dark:text-emerald-200 dark:hover:bg-[#26382D]';
const headerActionClass = actionClass.replace('inline-flex', 'hidden md:inline-flex');
const linkClass = 'min-h-11 rounded-xl px-3 py-2 text-left text-sm transition-colors ';

export const AppShell: React.FC<AppShellProps> = ({ activeTab, galleryView = 'archive', onSelectTab, onOpenExhibition, onQuickAddPerson, onOpenKinship, onOpenQRShare, onOpenDuplicateMerge, onOpenTour, onSelectPerson, onFocusInTree, children }) => {
  const { settings } = useGenealogy();
  const { preferences, toggleTheme } = usePreferences();
  const { isShieldActive, hasPin, lockShield } = usePrivacyShield();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<'unlock' | 'setup'>('unlock');
  const moreRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const group = PAGE_GROUP[activeTab];
  const { requestClose } = useModalAccessibility({ open: moreOpen, dialogRef: moreRef, returnFocusRef: returnRef, onRequestClose: () => setMoreOpen(false) });
  const launch = (action: () => void) => {
    if (!moreOpen) { action(); return; }
    pendingAction.current = action;
    setMoreOpen(false);
  };
  useEffect(() => {
    if (moreOpen || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    returnRef.current?.focus({ preventScroll: true });
    action();
  }, [moreOpen]);
  const shield = () => {
    if (isShieldActive) { setPinMode(hasPin ? 'unlock' : 'setup'); setPinOpen(true); }
    else lockShield();
  };
  const navigate = (destination: NavigationDestination) => launch(() => {
    if (destination === 'exhibition') onOpenExhibition();
    else onSelectTab(destination);
  });
  const selected = (destination: NavigationDestination) => destination === 'exhibition'
    ? activeTab === 'gallery' && galleryView === 'hall'
    : destination === 'gallery' ? activeTab === 'gallery' && galleryView === 'archive' : activeTab === destination;
  const openGroup = (item: typeof NAVIGATION_GROUPS[number], trigger: HTMLButtonElement) => {
    if (item.destination) navigate(item.destination);
    else { returnRef.current = trigger; setMoreOpen(true); }
  };
  const destinations = (scope: NavigationGroup) => GROUP_DESTINATIONS[scope].map(item => (
    <button type="button" key={item.destination} onClick={() => navigate(item.destination)} aria-current={selected(item.destination) ? 'page' : undefined}
      className={linkClass + (selected(item.destination) ? 'bg-forest-800 text-white font-semibold' : 'text-bark-600 hover:bg-ivory-100 dark:text-stone-200 dark:hover:bg-[#26382D]')}>
      {item.label}
    </button>
  ));
  const brand = <><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#2B4B3A] bg-forest-800 font-serif text-lg text-[#DBC599]">源</span><span className="min-w-0"><span data-calligraphy-slot="brand" className="block truncate font-serif text-lg leading-tight font-bold text-forest-800 dark:text-stone-100">Cội Nguồn</span><span data-calligraphy-slot="clan-name" className="block truncate text-xs text-bark-600 dark:text-stone-300">{settings.clanName || 'Gia Phả Việt'}</span></span></>;

  return <div className="app-shell min-h-screen min-w-0 bg-ivory-50 text-bark-900">
    <aside className="app-sidebar print:hidden fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ivory-200 bg-[#FFFDF9] dark:border-[#374A3D] lg:flex" aria-label="Điều hướng trên máy tính">
      <button type="button" onClick={() => navigate('dashboard')} className="flex min-h-20 min-w-0 items-center gap-2 border-b border-ivory-200 p-4 text-left dark:border-[#374A3D]">{brand}</button>
      <nav aria-label="Năm nhóm chức năng" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {NAVIGATION_GROUPS.map(item => { const Icon = groupIcons[item.id]; return <div key={item.id}>
          <button type="button" onClick={event => openGroup(item, event.currentTarget)} aria-current={group === item.id ? 'true' : undefined} aria-haspopup={item.id === 'more' ? 'dialog' : undefined}
            className={'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ' + (group === item.id ? 'bg-forest-800 text-white' : 'text-bark-800 hover:bg-ivory-100 dark:text-stone-200 dark:hover:bg-[#26382D]')}><Icon aria-hidden="true" className="size-5 shrink-0" />{item.label}</button>
          {group === item.id && GROUP_DESTINATIONS[item.id].length > 0 && <div className="ml-5 mt-1 grid border-l border-ivory-200 pl-2 dark:border-[#374A3D]">{destinations(item.id)}</div>}
        </div>; })}
      </nav>
      <p className="border-t border-ivory-200 p-4 text-xs leading-relaxed text-bark-600 dark:border-[#374A3D] dark:text-stone-300">Gia phả và kỷ vật của dòng họ<br />trên thiết bị của bạn.</p>
    </aside>
    <div className="min-w-0 lg:pl-60">
      <header className="print:hidden sticky top-0 z-30 border-b border-ivory-200 bg-ivory-50/95 backdrop-blur-md dark:border-[#374A3D]">
        <div className="app-header-layout mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
          <button type="button" onClick={() => navigate('dashboard')} className="flex min-h-11 min-w-0 items-center gap-2 text-left lg:hidden">{brand}</button>
          <div className="hidden min-w-0 lg:block"><p className="text-sm font-semibold text-forest-800 dark:text-stone-100">{NAVIGATION_GROUPS.find(item => item.id === group)?.label}</p><p className="truncate text-xs text-bark-600 dark:text-stone-300">{settings.clanName}</p></div>
          <div className="app-header-actions relative flex min-w-0 items-center justify-end gap-2">
            <GlobalSearch onSelectPerson={onSelectPerson} onFocusInTree={onFocusInTree} placeholder="Tìm thành viên (Ctrl+K)…" />
            <button type="button" onClick={toggleTheme} aria-label="Chuyển đổi giao diện sáng tối" className={headerActionClass}>{preferences.theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
            <button type="button" onClick={shield} aria-label={isShieldActive ? 'Mở khóa riêng tư bằng mã PIN' : 'Khóa thông tin riêng tư'} className={headerActionClass}>{isShieldActive ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}</button>
            <button type="button" onClick={onQuickAddPerson} aria-label="Thêm thành viên mới" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-forest-800 px-3 text-sm font-semibold text-white hover:bg-forest-700"><Plus className="size-4" /><span className="hidden sm:inline">Thêm người</span></button>
          </div>
          <div className="app-pwa-status col-span-2 min-w-0"><PWAWidgets /></div>
        </div>
      </header>
      <main className="app-main min-w-0">
        <div className="app-content mx-auto min-w-0 max-w-7xl space-y-4 pt-4 sm:pt-6">
          {GROUP_DESTINATIONS[group].length > 0 && <nav aria-label={'Chức năng ' + NAVIGATION_GROUPS.find(item => item.id === group)?.label} className="print:hidden flex min-w-0 flex-wrap gap-2 lg:hidden">{destinations(group)}</nav>}
          {group === 'genealogy' && <div className="print:hidden flex flex-wrap gap-2">{onOpenKinship && <button type="button" className={actionClass} onClick={onOpenKinship}><Users className="size-4" />Tra vai vế</button>}</div>}
          {children}
        </div>
      </main>
    </div>
    <nav aria-label="Điều hướng chính" className="app-bottom-nav print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-ivory-200 bg-[#FFFDF9]/95 backdrop-blur-md dark:border-[#374A3D] lg:hidden">
      <div className="grid grid-cols-5 gap-1">{NAVIGATION_GROUPS.map(item => { const Icon = groupIcons[item.id]; return <button type="button" key={item.id} onClick={event => openGroup(item, event.currentTarget)} aria-current={group === item.id ? 'true' : undefined} aria-haspopup={item.id === 'more' ? 'dialog' : undefined} className={'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold ' + (group === item.id ? 'bg-forest-50 text-forest-800 dark:bg-[#25372C] dark:text-emerald-200' : 'text-bark-600 dark:text-stone-300')}><Icon aria-hidden="true" className="size-5" /><span>{item.label}</span></button>; })}</div>
    </nav>
    {moreOpen && <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center sm:p-4" onClick={() => requestClose('backdrop')}>
      <div ref={moreRef} role="dialog" aria-modal="true" aria-labelledby="more-tools-heading" tabIndex={-1} onClick={event => event.stopPropagation()} className="mobile-safe-dialog app-mobile-tools flex max-h-[100dvh] w-full flex-col rounded-t-3xl border border-ivory-200 bg-[#FFFDF9] p-4 shadow-2xl dark:border-[#374A3D] sm:max-h-[calc(100dvh-2rem)] sm:max-w-xl sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ivory-200 pb-3 dark:border-[#374A3D]"><h2 id="more-tools-heading" className="font-serif text-2xl font-bold">Tiện ích dòng họ</h2><button type="button" className={actionClass} aria-label="Đóng tiện ích" onClick={() => requestClose('button')}><X className="size-5" /></button></div>
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain py-4">
          <div className="grid gap-2 sm:grid-cols-3">{GROUP_DESTINATIONS.more.map(item => {const Icon = pageIcons[item.destination as keyof typeof pageIcons];return <button key={item.destination} type="button" className={actionClass + ' justify-start'} onClick={() => navigate(item.destination)}><Icon className="size-4 shrink-0" />{item.label}</button>;})}</div>
          <div className="grid grid-cols-2 gap-2">
            {onOpenKinship && <button type="button" className={actionClass} onClick={() => launch(onOpenKinship)}><Users className="size-4" />Tra vai vế</button>}
            {onOpenQRShare && <button type="button" className={actionClass} onClick={() => launch(onOpenQRShare)}><QrCode className="size-4" />Chia sẻ QR</button>}
            {onOpenDuplicateMerge && <button type="button" className={actionClass} onClick={() => launch(onOpenDuplicateMerge)}><GitMerge className="size-4" />Lọc trùng lặp</button>}
            {onOpenTour && <button type="button" className={actionClass} onClick={() => launch(onOpenTour)}><HelpCircle className="size-4" />Hướng dẫn</button>}
            <button type="button" className={actionClass} onClick={toggleTheme}>{preferences.theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}Sáng / tối</button>
            <button type="button" className={actionClass} onClick={() => launch(shield)}>{isShieldActive ? <ShieldAlert className="size-4" /> : <ShieldCheck className="size-4" />}Riêng tư / PIN</button>
          </div>
        </div>
      </div>
    </div>}
    <PrivacyPinModal open={pinOpen} defaultMode={pinMode} onClose={() => setPinOpen(false)} />
  </div>;
};
