import React, { useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
} from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';

interface SacredSite {
  id: string;
  name: string;
  type: 'hall' | 'tomb' | 'migration';
  branchName?: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  description: string;
  era: string;
  keyFigures: string[];
}

type SiteFilter = 'all' | SacredSite['type'];

const filters: { key: SiteFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'hall', label: 'Từ đường' },
  { key: 'tomb', label: 'Lăng mộ' },
  { key: 'migration', label: 'Di cư lập chi' },
];

const siteLabels: Record<SacredSite['type'], string> = {
  hall: 'Từ đường',
  tomb: 'Lăng mộ gia tộc',
  migration: 'Địa bàn di cư',
};

export const MigrationMapPage: React.FC = () => {
  const { people, branches, settings } = useGenealogy();

  const [selectedFilter, setSelectedFilter] = useState<SiteFilter>('all');

  // Build list of sacred sites & migration landmarks from settings, branches, and people's tombs
  const sites: SacredSite[] = useMemo(() => {
    const list: SacredSite[] = [];

    // 1. Ancestral Hall (Từ đường gốc)
    list.push({
      id: 'site_ancestral_hall',
      name: `Từ Đường Đại Tộc ${settings.clanName}`,
      type: 'hall',
      branchName: 'Đại Tôn',
      address: settings.ancestralHallLocation || 'Đông Ngạc, Bắc Từ Liêm, Hà Nội',
      coordinates: { lat: 21.0898, lng: 105.7725 },
      description:
        'Nhà thờ tổ phát tích, nơi thờ phụng Đức Thủy Tổ và linh vị các bậc Tiên hiền đời đời truyền nối.',
      era: 'Khởi dựng thế kỷ XVIII',
      keyFigures: people.filter((p) => (p.generation ?? 99) <= 2).map((p) => p.fullName),
    });

    // 2. Branch origin places & migrations
    branches.forEach((b) => {
      if (b.originPlace && b.originPlace !== settings.ancestralHallLocation) {
        list.push({
          id: `site_branch_${b.id}`,
          name: `Địa Bàn Phát Tích: ${b.name}`,
          type: 'migration',
          branchName: b.name,
          address: b.originPlace,
          description: b.description || `Địa bàn lập nghiệp và khai hoang phát triển của ${b.name}.`,
          era: b.establishedPeriod || 'Thế kỷ XIX – XX',
          keyFigures: people.filter((p) => p.branchId === b.id).slice(0, 3).map((p) => p.fullName),
        });
      }
    });

    // 3. Tombs & Burial grounds of ancestors
    const peopleWithTombs = people.filter((p) => !p.isLiving && p.burialPlace);
    const tombGroups = new Map<string, Person[]>();
    for (const p of peopleWithTombs) {
      const place = p.burialPlace!.trim();
      const group = tombGroups.get(place) ?? [];
      group.push(p);
      tombGroups.set(place, group);
    }

    let tombIdx = 1;
    for (const [place, members] of tombGroups.entries()) {
      list.push({
        id: `site_tomb_${tombIdx++}`,
        name: `Khu Mộ Phần: ${place}`,
        type: 'tomb',
        address: place,
        coordinates: place.toLowerCase().includes('đông ngạc')
          ? { lat: 21.092, lng: 105.775 }
          : undefined,
        description: `Nơi an nghỉ thiên thu của ${members.length} vị tiền nhân trong gia tộc.`,
        era: 'Khu lăng mộ dòng tộc',
        keyFigures: members.map((m) => m.fullName),
      });
    }

    return list;
  }, [people, branches, settings]);

  const filteredSites = useMemo(() => {
    if (selectedFilter === 'all') return sites;
    return sites.filter((s) => s.type === selectedFilter);
  }, [sites, selectedFilter]);

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-7">
      <header className="space-y-2 border-b border-[#E7DFD4] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1B3B2B] text-[#DBC599]">
            <Compass aria-hidden="true" className="size-5" />
          </span>
          <h2 className="text-2xl font-bold leading-tight text-[#1B3B2B] sm:text-3xl">
            Bản đồ di cư
          </h2>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-[#655A4E]">
          Từ đường, địa bàn lập chi và nơi an táng của các thế hệ.
        </p>
      </header>

      <section
        aria-labelledby="migration-journey"
        className="rounded-2xl bg-linear-to-br from-[#1B3B2B] to-[#2D5A43] px-4 py-5 text-[#FFFDF9] sm:px-6"
      >
        <div className="flex items-center gap-2">
          <Navigation aria-hidden="true" className="size-4 shrink-0 text-[#DBC599]" />
          <h3 id="migration-journey" className="text-xl font-bold text-white sm:text-2xl">
            Hành trình từ quê gốc
          </h3>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="col-span-2 min-w-0 rounded-xl border border-white/15 bg-white/10 p-3 sm:col-span-1">
            <dt className="text-xs font-semibold text-[#DBC599]">Nguyên quán</dt>
            <dd className="mt-1 wrap-anywhere text-sm font-semibold text-white">
              {settings.ancestralHallLocation || 'Chưa cập nhật địa chỉ từ đường'}
            </dd>
          </div>

          {branches.slice(0, 2).map((branch) => (
            <div key={branch.id} className="min-w-0 rounded-xl border border-white/15 bg-white/10 p-3">
              <dt className="wrap-anywhere text-xs font-semibold text-[#DBC599]">{branch.name}</dt>
              <dd className="mt-1 wrap-anywhere text-sm font-semibold text-white">
                {branch.originPlace || settings.ancestralHallLocation || 'Địa bàn phát triển'}
              </dd>
              {(branch.description || branch.establishedPeriod) && (
                <dd className="mt-1 line-clamp-2 wrap-anywhere text-xs leading-relaxed text-stone-200">
                  {branch.description || branch.establishedPeriod}
                </dd>
              )}
            </div>
          ))}

          {branches.length === 0 && (
            <div className="col-span-2 min-w-0 rounded-xl border border-white/15 bg-white/10 p-3">
              <dt className="text-xs font-semibold text-[#DBC599]">Mộ phần</dt>
              <dd className="mt-1 text-sm font-semibold text-white">
                {sites.filter((site) => site.type === 'tomb').length} khu lăng mộ được ghi nhận
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="migration-sites" className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id="migration-sites" className="text-xl font-bold text-[#1F1913]">Địa danh dòng họ</h3>
          <p role="status" className="text-sm tabular-nums text-[#655A4E]">
            {filteredSites.length} địa điểm
          </p>
        </div>

        <div
          role="group"
          aria-label="Loại địa điểm"
          className="grid grid-cols-2 gap-1 rounded-2xl border border-[#E3D9CC] bg-[#F1EBE1] p-1 sm:w-fit sm:grid-cols-4"
        >
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              aria-pressed={selectedFilter === filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              className={`min-h-11 min-w-0 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${
                selectedFilter === filter.key
                  ? 'bg-[#1B3B2B] text-white'
                  : 'text-[#5C4F42] hover:bg-[#FFFDF9]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredSites.length === 0 ? (
          <div className="space-y-2 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] px-4 py-8 text-center">
            <MapPin aria-hidden="true" className="mx-auto size-8 text-[#8C6D32]" />
            <p className="font-serif text-lg font-bold text-[#1F1913]">Chưa có địa điểm trong nhóm này</p>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-[#655A4E]">
              Địa bàn phân chi lấy từ mục Quản lý dữ liệu. Nơi an táng lấy từ hồ sơ thành viên.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {filteredSites.map((site) => {
              const googleMapsUrl = site.coordinates
                ? `https://www.google.com/maps/search/?api=1&query=${site.coordinates.lat},${site.coordinates.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

              return (
                <article
                  key={site.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="rounded-full bg-[#F1EBE1] px-2.5 py-1 text-xs font-semibold text-[#1B3B2B]">
                      {siteLabels[site.type]}
                    </span>
                    <span className="wrap-anywhere text-xs text-[#655A4E]">{site.era}</span>
                  </div>

                  <h4 className="mt-3 wrap-anywhere font-serif text-xl font-bold leading-tight text-[#1F1913]">
                    {site.name}
                  </h4>
                  <p className="mt-2 flex items-start gap-2 text-sm font-medium text-[#8C6D32]">
                    <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 wrap-anywhere">{site.address}</span>
                  </p>
                  <p className="mt-2 wrap-anywhere text-sm leading-relaxed text-[#655A4E]">{site.description}</p>

                  {site.keyFigures.length > 0 && (
                    <p className="mt-3 wrap-anywhere text-sm leading-relaxed text-[#655A4E]">
                      <span className="font-semibold text-[#1F1913]">Tiền nhân liên quan</span>
                      <span className="line-clamp-2">{site.keyFigures.join(' · ')}</span>
                    </p>
                  )}

                  <div className="mt-auto pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E7DFD4] pt-3">
                      <span className="wrap-anywhere text-xs text-[#655A4E]">
                        {site.branchName ? `Thuộc ${site.branchName}` : 'Gia tộc chung'}
                      </span>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Mở Google Maps cho ${site.name} (tab mới)`}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 py-2 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                      >
                        <span>Mở Google Maps</span>
                        <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
