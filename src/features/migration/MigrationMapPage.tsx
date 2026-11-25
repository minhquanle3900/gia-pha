import React, { useMemo, useState } from 'react';
import {
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Sparkles,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
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

export const MigrationMapPage: React.FC = () => {
  const { people, branches, settings } = useGenealogy();

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'hall' | 'tomb' | 'migration'>('all');

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
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#C19B4C]" />
            <span>Bản Đồ Di Cư & Địa Lý Dòng Họ</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Dấu mốc phát tích từ nguyên quán, lịch sử di cư lập chi mới và tọa độ phần mộ tổ tiên.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#F1EBE1] p-1 rounded-2xl border border-[#E3D9CC]">
          {[
            { key: 'all', label: 'Tất cả địa điểm' },
            { key: 'hall', label: 'Từ đường' },
            { key: 'tomb', label: 'Lăng mộ' },
            { key: 'migration', label: 'Di cư lập chi' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelectedFilter(item.key as typeof selectedFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedFilter === item.key
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#5C4F42] hover:text-[#1B3B2B]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visual Journey Overview Card */}
      <div className="rounded-3xl bg-linear-to-br from-[#1B3B2B] to-[#2D5A43] text-white p-6 sm:p-8 shadow-md space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#DBC599] uppercase tracking-wider">
          <Navigation className="w-4 h-4" />
          <span>Hành Trình Phát Tích & Thiên Di</span>
        </div>

        <h3 className="text-2xl font-serif font-bold text-[#FFFDF9]">
          Từ Quê Gốc Phát Tích Đến {branches.length > 0 ? `${branches.length} Chi Nhánh` : 'Các Thế Hệ'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-1">
            <span className="text-[10px] text-[#DBC599] uppercase font-bold">1. Nguyên Quán Gốc</span>
            <p className="font-serif font-bold text-sm text-white">
              {settings.ancestralHallLocation || 'Chưa cập nhật địa chỉ Từ đường'}
            </p>
            <p className="text-[11px] text-stone-200">
              Nơi khởi lập từ đường {settings.clanName || 'gia tộc'} và phụng thờ Đức Thủy Tổ.
            </p>
          </div>

          {branches.slice(0, 2).map((branch, idx) => (
            <div
              key={branch.id}
              className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-1"
            >
              <span className="text-[10px] text-[#DBC599] uppercase font-bold">
                {idx + 2}. {branch.name}
              </span>
              <p className="font-serif font-bold text-sm text-white">
                {branch.originPlace || settings.ancestralHallLocation || 'Địa bàn phát triển'}
              </p>
              <p className="text-[11px] text-stone-200 line-clamp-2">
                {branch.description || `Phân nhánh ${branch.name} (${branch.establishedPeriod || 'lịch sử gia tộc'}).`}
              </p>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="md:col-span-2 p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs space-y-1">
              <span className="text-[10px] text-[#DBC599] uppercase font-bold">2. Phân Chi & Mộ Phần</span>
              <p className="font-serif font-bold text-sm text-white">
                {sites.filter((s) => s.type === 'tomb').length} khu lăng mộ được ghi nhận
              </p>
              <p className="text-[11px] text-stone-200">
                Thêm chi họ trong mục Quản lý dữ liệu hoặc điền nơi an táng trong hồ sơ để hiển thị hành trình đầy đủ.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] space-y-2">
          <MapPin className="w-9 h-9 text-stone-300 mx-auto" />
          <p className="text-sm font-serif font-bold text-[#1F1913]">
            Chưa có địa điểm nào thuộc nhóm đã chọn
          </p>
          <p className="text-xs text-stone-500">
            Hãy cập nhật địa bàn phân chi trong Quản lý dữ liệu hoặc nơi an táng trong hồ sơ thành viên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSites.map((site) => {
            const googleMapsUrl = site.coordinates
              ? `https://www.google.com/maps/search/?api=1&query=${site.coordinates.lat},${site.coordinates.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

            return (
              <div
                key={site.id}
                className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs hover:border-[#1B3B2B]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span
                      className={`font-bold uppercase tracking-wider ${
                        site.type === 'hall'
                          ? 'text-[#1B3B2B]'
                          : site.type === 'tomb'
                          ? 'text-[#8C6D32]'
                          : 'text-[#2D5A43]'
                      }`}
                    >
                      {site.type === 'hall'
                        ? 'Nhà thờ tổ / Từ đường'
                        : site.type === 'tomb'
                        ? 'Lăng mộ gia tộc'
                        : 'Địa bàn di cư'}
                    </span>
                    <span className="text-stone-400 font-medium">{site.era}</span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#1F1913] leading-snug">
                    {site.name}
                  </h3>

                  <p className="text-xs text-[#8C6D32] font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{site.address}</span>
                  </p>

                  <p className="text-xs text-[#4A3F35] leading-relaxed pt-1">{site.description}</p>

                  {/* Key Figures */}
                  {site.keyFigures.length > 0 && (
                    <div className="pt-2 border-t border-stone-100">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                        Tiền nhân liên quan:
                      </span>
                      <p className="text-xs text-stone-600 line-clamp-1">
                        {site.keyFigures.join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Direction Link */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400">
                    {site.branchName ? `Thuộc ${site.branchName}` : 'Gia tộc chung'}
                  </span>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#D5CABE] text-xs font-semibold text-[#1B3B2B] hover:bg-stone-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở Google Maps chỉ đường</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
