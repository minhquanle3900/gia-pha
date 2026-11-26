import React, { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  GitFork,
  Image as ImageIcon,
  MapPin,
  Plus,
  Scroll,
  Users,
} from 'lucide-react';
import { GlobalSearch } from '../components/GlobalSearch';
import { HeritageAvatar } from '../components/HeritageAvatar';
import { useGenealogy } from '../context/GenealogyContext';
import { BackupReminderBanner } from '../features/backup/BackupReminderBanner';
import { UpcomingAnniversariesWidget } from '../features/rites/UpcomingAnniversariesWidget';
import type { NavigationTab } from '../models/genealogy';
import { formatLifespan } from '../utils/dateUtils';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
  onFocusInTree?: (personId: string) => void;
  onAddPerson: () => void;
  onOpenTour?: () => void;
}

const surface = 'min-w-0 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9]';
const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32] dark:focus-visible:outline-[#E5BE6C]';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectPerson,
  onFocusInTree,
  onAddPerson,
  onOpenTour,
}) => {
  const { people, branches, media, stories, settings } = useGenealogy();

  const livingCount = useMemo(() => people.filter((person) => person.isLiving).length, [people]);
  const deceasedCount = people.length - livingCount;
  const maxGeneration = useMemo(
    () => people.reduce((maximum, person) => Math.max(maximum, person.generation ?? 0), 0),
    [people],
  );
  const elders = useMemo(
    () => people
      .filter((person) => person.generation !== undefined)
      .sort((a, b) => (a.generation ?? 99) - (b.generation ?? 99))
      .slice(0, 5),
    [people],
  );

  const statistics = [
    { label: 'Thành viên', value: people.length, unit: 'người', note: `${livingCount} còn sống · ${deceasedCount} đã mất`, icon: Users, tab: 'members' },
    { label: 'Thế hệ', value: maxGeneration || '—', unit: maxGeneration ? 'đời' : '', note: maxGeneration ? 'Xem thống kê phả hệ' : 'Chưa ghi số đời', icon: GitFork, tab: 'stats' },
    { label: 'Chi họ', value: branches.length, unit: 'chi', note: 'Xem thành viên theo chi', icon: Scroll, tab: 'members' },
    { label: 'Di sản', value: media.length, unit: 'tư liệu', note: 'Mở phòng trưng bày', icon: ImageIcon, tab: 'gallery' },
  ] as const;

  const secondaryActions = [
    { label: 'Nhật ký', icon: Scroll, action: () => onNavigate('journal') },
    { label: 'Thống kê', icon: BarChart3, action: () => onNavigate('stats') },
    ...(onOpenTour ? [{ label: 'Hướng dẫn', icon: Compass, action: onOpenTour }] : []),
  ];

  return (
    <div className="min-w-0 space-y-5 pb-4 sm:space-y-7">
      <section
        aria-labelledby="dashboard-title"
        className="relative isolate overflow-hidden rounded-3xl bg-[#19372A] px-5 py-5 text-[#FFFDF9] sm:px-8 sm:py-7 lg:flex lg:items-center lg:justify-between lg:gap-10"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-36 -z-10 size-80 rounded-full border border-[#D8BD82]/15 sm:-right-12 sm:size-[26rem]">
          <div className="absolute inset-9 rounded-full border border-[#D8BD82]/12" />
          <div className="absolute inset-[4.5rem] rounded-full border border-[#D8BD82]/10" />
        </div>
        <div className="min-w-0 max-w-2xl">
          <h1 id="dashboard-title" className="text-3xl font-bold leading-[1.05] tracking-tight text-[#FFFDF9] [overflow-wrap:anywhere] sm:text-5xl">
            {settings.clanName || 'Dòng họ Việt Nam'}
          </h1>
          <p className="mt-3 max-w-lg font-serif text-base italic leading-snug text-[#F1E8D6] [overflow-wrap:anywhere] sm:text-lg">
            {settings.clanMotto || 'Cây có cội mới trổ cành xanh lá, nước có nguồn mới bủa khắp rạch sông.'}
          </p>
          {settings.ancestralHallLocation && (
            <p className="mt-3 flex items-start gap-2 text-sm leading-snug text-[#E4DAC7]">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#E1C88F]" />
              <span className="min-w-0 [overflow-wrap:anywhere]">Từ đường · {settings.ancestralHallLocation}</span>
            </p>
          )}
        </div>

        <div className="mt-5 min-w-0 lg:mt-0 lg:w-full lg:max-w-sm">
          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
            <button
              type="button"
              onClick={() => onNavigate('tree')}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#E3CA91] px-3 py-2 text-center text-sm font-bold text-[#19372A] hover:bg-[#EED9A9] ${focus}`}
            >
              <GitFork aria-hidden="true" className="size-4 shrink-0" />
              Cây gia phả
            </button>
            <button
              type="button"
              onClick={onAddPerson}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#8CA797] px-3 py-2 text-center text-sm font-semibold text-[#FFFDF9] hover:bg-[#294737] ${focus}`}
            >
              <Plus aria-hidden="true" className="size-4 shrink-0" />
              Thêm thành viên
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3">
            {secondaryActions.map(({ label, icon: Icon, action }) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-[#F1E8D6] hover:underline ${focus}`}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-[#E1C88F]" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="dashboard-search" className={`${surface} p-3.5 sm:flex sm:items-center sm:gap-5 sm:p-4`}>
        <h2 id="dashboard-search" className="mb-2 shrink-0 text-lg font-bold text-[#1F1913] sm:mb-0">
          Tra cứu thành viên
        </h2>
        <GlobalSearch
          variant="prominent"
          className="min-w-0 flex-1 [&_.top-full]:min-w-0 [&_input]:min-h-11"
          onSelectPerson={onSelectPerson}
          onFocusInTree={(id) => {
            if (onFocusInTree) {
              onFocusInTree(id);
            } else {
              onNavigate('tree');
            }
          }}
          placeholder="Tìm tên, năm sinh hoặc đời thứ"
        />
      </section>

      <section aria-label="Số liệu phả hệ" className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        {statistics.map(({ label, value, unit, note, icon: Icon, tab }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate(tab)}
            className={`${surface} group flex flex-col gap-2.5 p-3 text-left hover:border-[#9FB5A7] sm:p-4 ${focus}`}
          >
            <span className="flex w-full items-center gap-2 text-sm font-semibold text-[#54483C]">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-[#1B3B2B]" />
              {label}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-serif text-3xl font-bold leading-none text-[#1F1913] tabular-nums sm:text-4xl">{value}</span>
              {unit && <span className="text-sm text-[#655A4E]">{unit}</span>}
            </span>
            <span className="mt-auto flex items-center justify-between gap-1 text-sm leading-snug text-[#655A4E]">
              <span>{note}</span>
              <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-[#1B3B2B] sm:block" />
            </span>
          </button>
        ))}
      </section>

      <div className="min-w-0 space-y-4">
        <UpcomingAnniversariesWidget onSelectPerson={onSelectPerson} onNavigate={onNavigate} />
        <BackupReminderBanner onNavigate={onNavigate} />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section aria-labelledby="dashboard-stories" className={`${surface} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-[#E7DFD4] pb-2">
            <h2 id="dashboard-stories" className="flex items-center gap-2 text-xl font-bold text-[#1F1913]">
              <BookOpen aria-hidden="true" className="size-5 shrink-0 text-[#1B3B2B]" />
              Nhật ký dòng họ
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('journal')}
              className={`inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#1B3B2B] hover:underline ${focus}`}
            >
              Xem tất cả ({stories.length})
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>

          {stories.length === 0 ? (
            <div className="py-5">
              <p className="text-sm text-[#655A4E]">Chưa có ghi chép trong nhật ký.</p>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1B3B2B] px-3 text-sm font-semibold text-white hover:bg-[#254F3A] ${focus}`}
              >
                <Plus aria-hidden="true" className="size-4" />
                Viết ghi chép đầu tiên
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#E7DFD4]">
              {stories.slice(0, 3).map((story) => (
                <li key={story.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('journal')}
                    className={`group block w-full rounded-lg px-1 py-3 text-left sm:px-2 ${focus}`}
                  >
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="min-w-0 font-serif text-lg font-bold leading-snug text-[#1F1913] [overflow-wrap:anywhere] group-hover:underline">
                        {story.title}
                      </span>
                      {story.periodLabel && (
                        <span className="min-w-0 text-xs font-semibold leading-snug text-[#8C6D32] [overflow-wrap:anywhere]">{story.periodLabel}</span>
                      )}
                    </span>
                    {story.summary && <span className="mt-1 block text-sm italic leading-snug text-[#54483C] [overflow-wrap:anywhere]">{story.summary}</span>}
                    <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#655A4E] [overflow-wrap:anywhere]">{story.content}</span>
                    {story.location && <span className="mt-2 block text-xs text-[#655A4E] [overflow-wrap:anywhere]">{story.location}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="dashboard-elders" className={`${surface} p-4 sm:p-5`}>
          <h2 id="dashboard-elders" className="border-b border-[#E7DFD4] pb-3 text-xl font-bold text-[#1F1913]">
            Các bậc tiền nhân
          </h2>
          {elders.length === 0 ? (
            <p className="py-4 text-sm text-[#655A4E]">Chưa có hồ sơ được ghi số đời.</p>
          ) : (
            <ul className="divide-y divide-[#E7DFD4]">
              {elders.map((elder) => (
                <li key={elder.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPerson(elder.id)}
                    className={`group flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left sm:px-2 ${focus}`}
                  >
                    <HeritageAvatar
                      fullName={elder.fullName}
                      portraitUrl={elder.portraitUrl}
                      gender={elder.gender}
                      size="sm"
                      isLiving={elder.isLiving}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#1F1913] [overflow-wrap:anywhere] group-hover:underline">{elder.fullName}</span>
                      <span className="mt-0.5 block text-xs text-[#655A4E] [overflow-wrap:anywhere]">
                        Đời {elder.generation}{elder.clanRole ? ` · ${elder.clanRole}` : ''}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#655A4E] tabular-nums">
                        {formatLifespan(elder.birthDate, elder.deathDate, elder.isLiving)}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#8C6D32]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className={`mt-2 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-semibold text-[#1B3B2B] hover:underline ${focus}`}
          >
            Xem toàn bộ thành viên
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </section>
      </div>
    </div>
  );
};
