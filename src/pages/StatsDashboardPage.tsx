import React, { useMemo, useState } from 'react';
import {
  BarChart2,
  BarChart3,
  Compass,
  GitFork,
  PieChart as PieIcon,
  Printer,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { HeritageAvatar } from '../components/HeritageAvatar';
import { useGenealogy } from '../context/GenealogyContext';
import { extractPersonLifespan } from '../features/statistics/lifespanUtils';
import { NavigationTab } from '../models/genealogy';
import { formatLifespan } from '../utils/dateUtils';

interface StatsDashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
}

const memberStatuses = [
  { key: 'all', label: 'Tất cả' },
  { key: 'living', label: 'Còn sống' },
  { key: 'deceased', label: 'Đã mất' },
] as const;

const chartModes = [
  { key: 'grouped', label: 'Cột đôi' },
  { key: 'stacked', label: 'Xếp chồng' },
] as const;

export const StatsDashboardPage: React.FC<StatsDashboardPageProps> = ({
  onNavigate,
  onSelectPerson,
}) => {
  const { people, branches, settings } = useGenealogy();

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'living' | 'deceased'>('all');
  const [chartType, setChartType] = useState<'grouped' | 'stacked'>('grouped');
  const [selectedGenForInspect, setSelectedGenForInspect] = useState<number | null>(null);

  // 1. FILTERING
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (selectedBranch !== 'all' && p.branchId !== selectedBranch) return false;
      if (statusFilter === 'living' && !p.isLiving) return false;
      if (statusFilter === 'deceased' && p.isLiving) return false;
      return true;
    });
  }, [people, selectedBranch, statusFilter]);

  // 2. DATA: Generation Distribution (Biểu đồ số lượng thành viên theo thế hệ)
  const generationData = useMemo(() => {
    const map = new Map<
      number,
      {
        generation: number;
        genLabel: string;
        male: number;
        female: number;
        unknownGender: number;
        total: number;
        living: number;
        deceased: number;
      }
    >();

    for (const p of filteredPeople) {
      const gen = p.generation || 1;
      const existing = map.get(gen) || {
        generation: gen,
        genLabel: `Đời ${gen}`,
        male: 0,
        female: 0,
        unknownGender: 0,
        total: 0,
        living: 0,
        deceased: 0,
      };

      existing.total++;
      if (p.gender === 'male') existing.male++;
      else if (p.gender === 'female') existing.female++;
      else existing.unknownGender++;

      if (p.isLiving) existing.living++;
      else existing.deceased++;

      map.set(gen, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.generation - b.generation);
  }, [filteredPeople]);

  // 3. DATA: Gender Ratio in the Clan (Biểu đồ tỷ lệ nam/nữ trong dòng họ)
  const genderData = useMemo(() => {
    let male = 0;
    let female = 0;
    let unknown = 0;

    for (const p of filteredPeople) {
      if (p.gender === 'male') male++;
      else if (p.gender === 'female') female++;
      else unknown++;
    }

    const total = filteredPeople.length || 1;
    const result = [
      {
        name: 'Nam giới',
        value: male,
        percent: Math.round((male / total) * 100),
        color: '#1B3B2B', // Deep heritage forest green
      },
      {
        name: 'Nữ giới',
        value: female,
        percent: Math.round((female / total) * 100),
        color: '#8C3A27', // Heritage terracotta crimson
      },
    ];

    if (unknown > 0) {
      result.push({
        name: 'Chưa rõ',
        value: unknown,
        percent: Math.round((unknown / total) * 100),
        color: '#9C9082',
      });
    }

    return result;
  }, [filteredPeople]);

  // 4. DATA: Distribution by Branch (Phân bổ theo Chi họ)
  const branchData = useMemo(() => {
    const branchCountMap = new Map<string, { id: string; name: string; count: number; male: number; female: number }>();
    
    // Seed branches
    for (const b of branches) {
      branchCountMap.set(b.id, { id: b.id, name: b.name, count: 0, male: 0, female: 0 });
    }
    // Unknown branch bucket
    branchCountMap.set('unassigned', { id: 'unassigned', name: 'Chưa phân chi', count: 0, male: 0, female: 0 });

    for (const p of filteredPeople) {
      const bKey = p.branchId && branchCountMap.has(p.branchId) ? p.branchId : 'unassigned';
      const entry = branchCountMap.get(bKey)!;
      entry.count++;
      if (p.gender === 'male') entry.male++;
      else if (p.gender === 'female') entry.female++;
    }

    return Array.from(branchCountMap.values())
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredPeople, branches]);

  // 5. DATA: Average Age / Lifespan Trend by Generation
  const ageTrendData = useMemo(() => {
    const map = new Map<number, { totalAge: number; count: number }>();

    for (const p of filteredPeople) {
      const data = extractPersonLifespan(p);
      if (data) {
        const gen = data.generation;
        const existing = map.get(gen) || { totalAge: 0, count: 0 };
        existing.totalAge += data.age;
        existing.count++;
        map.set(gen, existing);
      }
    }

    return Array.from(map.entries())
      .map(([gen, val]) => ({
        generation: gen,
        genLabel: `Đời ${gen}`,
        avgAge: Math.round((val.totalAge / val.count) * 10) / 10,
        count: val.count,
      }))
      .sort((a, b) => a.generation - b.generation);
  }, [filteredPeople]);

  // Clan Average Age
  const overallAverageAge = useMemo(() => {
    let totalAge = 0;
    let count = 0;
    for (const p of filteredPeople) {
      const data = extractPersonLifespan(p);
      if (data) {
        totalAge += data.age;
        count++;
      }
    }
    return count > 0 ? Math.round((totalAge / count) * 10) / 10 : 0;
  }, [filteredPeople]);

  // Peak Generation
  const peakGen = useMemo(() => {
    if (generationData.length === 0) return null;
    let peak = generationData[0];
    for (const g of generationData) {
      if (g.total > peak.total) peak = g;
    }
    return peak;
  }, [generationData]);

  // Members in selected generation for inspection
  const inspectedMembers = useMemo(() => {
    if (selectedGenForInspect === null) return [];
    return filteredPeople.filter((p) => (p.generation || 1) === selectedGenForInspect);
  }, [filteredPeople, selectedGenForInspect]);

  const livingCount = useMemo(() => filteredPeople.filter((p) => p.isLiving).length, [filteredPeople]);
  const deceasedCount = filteredPeople.length - livingCount;
  const toggleGeneration = (generation: number) => {
    setSelectedGenForInspect((current) => current === generation ? null : generation);
  };
  const inspectFromTable = (generation: number) => {
    toggleGeneration(generation);
    if (selectedGenForInspect !== generation) {
      requestAnimationFrame(() => document.getElementById('stats-generation-members')?.focus());
    }
  };
  const closeInspection = () => {
    const trigger = document.getElementById(`stats-generation-${selectedGenForInspect}`);
    (trigger ?? document.getElementById('stats-branch'))?.focus();
    setSelectedGenForInspect(null);
  };

  return (
    <div className="min-w-0 space-y-5 pb-12 sm:space-y-7">
      <header className="grid gap-3 border-b border-[#E7DFD4] pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1B3B2B] text-[#DBC599]">
              <BarChart3 aria-hidden="true" className="size-5" />
            </span>
            <h2 className="text-2xl font-bold text-[#1B3B2B] sm:text-3xl">Thống kê gia tộc</h2>
          </div>
          <p className="mt-2 wrap-anywhere text-sm text-[#655A4E]">
            {settings.clanName || 'Dòng họ Việt Nam'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D5CABE] bg-[#FFFDF9] px-3 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Compass aria-hidden="true" className="size-4" />
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => onNavigate('tree')}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D5CABE] bg-[#FFFDF9] px-3 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <GitFork aria-hidden="true" className="size-4" />
            Cây gia phả
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D5CABE] bg-[#F1EBE1] px-3 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Printer aria-hidden="true" className="size-4" />
            In báo cáo
          </button>
        </div>
      </header>

      <section
        aria-label="Bộ lọc thống kê"
        className="grid min-w-0 gap-3 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end"
      >
        <label className="block min-w-0 text-xs font-semibold text-[#655A4E]">
          Chi họ
          <select
            id="stats-branch"
            value={selectedBranch}
            onChange={(event) => setSelectedBranch(event.target.value)}
            className="mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base font-medium text-[#2C241C] focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm"
          >
            <option value="all">Tất cả chi họ</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="min-w-0">
          <legend className="text-xs font-semibold text-[#655A4E]">Trạng thái</legend>
          <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-[#F1EBE1] p-1">
            {memberStatuses.map((status) => (
              <button
                key={status.key}
                type="button"
                aria-pressed={statusFilter === status.key}
                onClick={() => setStatusFilter(status.key)}
                className={`min-h-11 min-w-0 rounded-lg px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  statusFilter === status.key
                    ? 'bg-[#1B3B2B] text-white'
                    : 'text-[#5C4F42] hover:bg-[#FFFDF9]'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </fieldset>

        <p role="status" className="min-w-0 py-1 text-sm tabular-nums text-[#655A4E] lg:pb-3">
          <strong className="text-[#1B3B2B]">{filteredPeople.length}/{people.length}</strong> thành viên
        </p>
      </section>

      <dl className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-4">
          <dt className="flex items-start gap-1.5 text-xs font-semibold text-[#655A4E]">
            <Users aria-hidden="true" className="size-4 shrink-0 text-[#1B3B2B]" />
            Thành viên
          </dt>
          <dd className="mt-1.5 font-serif text-3xl font-bold leading-none text-[#1F1913]">{filteredPeople.length}</dd>
          <dd className="mt-1.5 text-xs leading-relaxed text-[#655A4E]">
            {livingCount} còn sống · {deceasedCount} đã mất
          </dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-4">
          <dt className="flex items-start gap-1.5 text-xs font-semibold text-[#655A4E]">
            <PieIcon aria-hidden="true" className="size-4 shrink-0 text-[#8C6D32]" />
            Tỷ lệ nam / nữ
          </dt>
          <dd className="mt-1.5 font-serif text-2xl font-bold leading-none text-[#1F1913] sm:text-3xl">
            {genderData[0]?.percent || 0}% / {genderData[1]?.percent || 0}%
          </dd>
          <dd className="mt-1.5 text-xs leading-relaxed text-[#655A4E]">
            {genderData[0]?.value || 0} nam · {genderData[1]?.value || 0} nữ
          </dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-4">
          <dt className="flex items-start gap-1.5 text-xs font-semibold text-[#655A4E]">
            <GitFork aria-hidden="true" className="size-4 shrink-0 text-[#1B3B2B]" />
            Thế hệ
          </dt>
          <dd className="mt-1.5 font-serif text-3xl font-bold leading-none text-[#1F1913]">{generationData.length}</dd>
          <dd className="mt-1.5 text-xs leading-relaxed text-[#655A4E]">
            {peakGen ? `Đông nhất: ${peakGen.genLabel.toLowerCase()} (${peakGen.total} người)` : 'Chưa có dữ liệu'}
          </dd>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-4">
          <dt className="flex items-start gap-1.5 text-xs font-semibold text-[#655A4E]">
            <TrendingUp aria-hidden="true" className="size-4 shrink-0 text-[#8C6D32]" />
            Độ tuổi bình quân
          </dt>
          <dd className="mt-1.5 font-serif text-3xl font-bold leading-none text-[#1F1913]">
            {ageTrendData.length ? `${overallAverageAge} tuổi` : '—'}
          </dd>
          <dd className="mt-1.5 text-xs leading-relaxed text-[#655A4E]">
            Từ hồ sơ có đủ dữ liệu
          </dd>
        </div>
      </dl>

      {/* PRIMARY SECTION: Biểu đồ số lượng thành viên theo thế hệ & Tỷ lệ nam/nữ (Recharts) */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* CHART 1: Biểu đồ số lượng thành viên theo thế hệ (Recharts BarChart) */}
        <div className="min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-5 lg:col-span-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DFD4] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1B3B2B]" />
                <h3 className="font-serif text-lg font-bold leading-tight text-[#1F1913]">
                  Thành viên theo thế hệ
                </h3>
              </div>
            </div>

            <div role="group" aria-label="Dạng biểu đồ" className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1EBE1] p-1 sm:w-fit">
              {chartModes.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  aria-pressed={chartType === mode.key}
                  onClick={() => setChartType(mode.key)}
                  className={`min-h-11 whitespace-nowrap rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    chartType === mode.key
                      ? 'bg-[#1B3B2B] text-white'
                      : 'text-[#5C4F42] hover:bg-[#FFFDF9]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {generationData.length > 0 ? (
            <div className="h-56 min-w-0 w-full pt-2 text-[#655A4E] sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={generationData}
                  margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
                  onClick={({ activeLabel }) => {
                    const row = generationData.find((entry) => entry.genLabel === activeLabel);
                    if (row) toggleGeneration(row.generation);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis
                    dataKey="genLabel"
                    tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 500 }}
                    axisLine={{ stroke: '#E0D6C8' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    axisLine={{ stroke: '#E0D6C8' }}
                    unit=" ng"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D5CABE',
                      borderRadius: '16px',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} người`,
                      name === 'male' ? 'Nam giới' : name === 'female' ? 'Nữ giới' : 'Chưa rõ',
                    ]}
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload;
                      return row ? `${label} (Tổng cộng: ${row.total} người · ${row.living} còn sống)` : label;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-[#2C241C] font-medium mr-3">
                        {value === 'male' ? 'Nam giới' : value === 'female' ? 'Nữ giới' : 'Chưa rõ'}
                      </span>
                    )}
                  />
                  <Bar
                    dataKey="male"
                    name="male"
                    fill="#1B3B2B"
                    stackId={chartType === 'stacked' ? 'a' : undefined}
                    radius={chartType === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="female"
                    name="female"
                    fill="#8C3A27"
                    stackId={chartType === 'stacked' ? 'a' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-xl bg-[#FAF8F5] px-3 py-5 text-sm text-[#655A4E]">
              Không có thành viên khớp bộ lọc.
            </p>
          )}

          {generationData.length > 0 && (
            <div role="group" aria-label="Xem thành viên theo thế hệ" className="flex flex-wrap gap-2">
              {generationData.map(({ generation, genLabel }) => (
                <button
                  key={generation}
                  id={`stats-generation-${generation}`}
                  type="button"
                  aria-pressed={selectedGenForInspect === generation}
                  onClick={() => toggleGeneration(generation)}
                  className={`min-h-11 rounded-xl border border-[#D5CABE] px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    selectedGenForInspect === generation
                      ? 'bg-[#1B3B2B] text-white'
                      : 'bg-[#FAF8F5] text-[#1B3B2B] hover:bg-stone-100'
                  }`}
                >
                  {genLabel}
                </button>
              ))}
            </div>
          )}

          {selectedGenForInspect !== null && (
            <section aria-labelledby="stats-generation-members" className="min-w-0 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  id="stats-generation-members"
                  tabIndex={-1}
                  className="scroll-mt-24 font-serif text-lg font-bold text-[#1B3B2B] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  Thành viên đời {selectedGenForInspect} ({inspectedMembers.length})
                </h4>
                <button
                  type="button"
                  onClick={closeInspection}
                  className="min-h-11 rounded-lg px-2 text-sm font-semibold text-[#655A4E] hover:bg-stone-100 focus-visible:outline-2"
                >
                  Đóng chi tiết
                </button>
              </div>
              {inspectedMembers.length ? (
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {inspectedMembers.map((person) => (
                    <li key={person.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelectPerson(person.id)}
                        className="flex min-h-14 w-full min-w-0 items-center gap-2 rounded-xl border border-[#E7DFD4] bg-[#FFFDF9] px-3 py-2 text-left hover:border-[#1B3B2B] focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <HeritageAvatar
                          fullName={person.fullName}
                          portraitUrl={person.portraitUrl}
                          gender={person.gender}
                          size="sm"
                          isLiving={person.isLiving}
                        />
                        <span className="min-w-0">
                          <span className="block wrap-anywhere font-serif font-bold text-[#1F1913]">{person.fullName}</span>
                          <span className="block wrap-anywhere text-xs text-[#655A4E]">
                            {person.clanRole || (person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ giới tính')}
                          </span>
                          <span className="block text-xs text-[#655A4E]">
                            {formatLifespan(person.birthDate, person.deathDate, person.isLiving)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[#655A4E]">Không có thành viên đời này trong bộ lọc.</p>
              )}
            </section>
          )}
        </div>

        {/* CHART 2: Biểu đồ tỷ lệ nam/nữ trong dòng họ (Recharts PieChart / Donut) */}
        <div className="min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-5 lg:col-span-4">
          <div>
            <div className="flex items-center gap-2 border-b border-[#E7DFD4] pb-3">
              <PieIcon className="w-4 h-4 text-[#8C3A27]" />
              <h3 className="font-serif text-lg font-bold leading-tight text-[#1F1913]">
                Cơ cấu giới tính
              </h3>
            </div>
          </div>

          {filteredPeople.length > 0 ? (
            <div className="h-64 sm:h-72 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [`${value} người`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-serif font-bold text-[#1B3B2B]">
                  {genderData[0]?.percent || 0}%
                </span>
                <span className="text-[10px] text-stone-500 uppercase tracking-widest">
                  Nam giới
                </span>
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-[#FAF8F5] px-3 py-5 text-sm text-[#655A4E]">
              Chưa có dữ liệu giới tính.
            </p>
          )}

          {/* Legend and Stats Breakdown */}
          <div className="space-y-2 border-t border-stone-100 pt-3">
            {genderData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-[#2C241C] font-medium">{entry.name}</span>
                </div>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="font-bold text-[#1F1913]">{entry.value} người</span>
                  <span className="text-[11px] text-stone-500">({entry.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: Biểu đồ chi họ & Biểu đồ xu hướng độ tuổi bình quân */}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-12">
        {/* CHART 3: Phân bổ thành viên theo Chi họ (Recharts BarChart ngang) */}
        <div className="min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-5 lg:col-span-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#E7DFD4] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C19B4C]" />
                <h3 className="font-serif text-lg font-bold leading-tight text-[#1F1913]">
                  Nhân khẩu theo chi họ
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#8C6D32]">
              {branchData.length} chi phái
            </span>
          </div>

          {branchData.length > 0 ? (
            <div className="h-56 min-w-0 w-full pt-1 text-[#655A4E] sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 600 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any, name: any) => [`${val} người`, name === 'count' ? 'Tổng số' : name]}
                  />
                  <Bar dataKey="count" name="count" fill="#2D5A43" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {branchData.map((_, index) => (
                      <Cell
                        key={`branch-${index}`}
                        fill={index === 0 ? '#1B3B2B' : index === 1 ? '#2D5A43' : '#8C6D32'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-xl bg-[#FAF8F5] px-3 py-5 text-sm text-[#655A4E]">
              Chưa có dữ liệu chi họ khớp bộ lọc.
            </p>
          )}
        </div>

        {/* CHART 4: Xu hướng độ tuổi bình quân theo từng đời (Recharts AreaChart) */}
        <div className="min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-5 lg:col-span-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#E7DFD4] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8C3A27]" />
                <h3 className="font-serif text-lg font-bold leading-tight text-[#1F1913]">
                  Độ tuổi bình quân theo thế hệ
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#1B3B2B]">
              {ageTrendData.length > 0 && `Trung bình: ${overallAverageAge} tuổi`}
            </span>
          </div>

          {ageTrendData.length > 0 ? (
            <div className="h-56 min-w-0 w-full pt-1 text-[#655A4E] sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ageTrendData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="statsAgeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C19B4C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C19B4C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis dataKey="genLabel" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} unit="t" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF9',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} tuổi`, 'Tuổi bình quân']}
                  />
                  <ReferenceLine
                    y={overallAverageAge}
                    stroke="#1B3B2B"
                    strokeDasharray="4 4"
                    label={{
                      value: `TB: ${overallAverageAge}t`,
                      position: 'insideTopRight',
                      fill: 'currentColor',
                      fontSize: 10,
                      fontWeight: 'bold',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgAge"
                    stroke="#C19B4C"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#statsAgeGradient)"
                    dot={{ r: 5, fill: '#1B3B2B', stroke: '#FFFDF9', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#C19B4C', stroke: '#1B3B2B', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="rounded-xl bg-[#FAF8F5] px-3 py-5 text-sm text-[#655A4E]">
              Chưa có hồ sơ đủ dữ liệu để tính độ tuổi.
            </p>
          )}
        </div>
      </div>

      {/* DETAILED GENERATION MATRIX TABLE */}
      <div className="min-w-0 space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[#E7DFD4] pb-3">
          <div>
            <h3 className="text-base font-serif font-bold text-[#1F1913]">
              Chi tiết theo thế hệ
            </h3>
          </div>
          <span className="text-sm text-[#655A4E]">
            Tổng: <strong>{filteredPeople.length}</strong> thành viên
          </span>
        </div>

        <div
          role="region"
          aria-label="Bảng chi tiết theo thế hệ"
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <table className="w-full min-w-[38rem] text-left text-sm">
            <thead className="border-b border-[#E7DFD4] bg-[#FAF8F5] text-xs font-semibold text-[#655A4E]">
              <tr>
                <th scope="col" className="py-3 px-4">Thế hệ</th>
                <th scope="col" className="py-3 px-4 text-center">Nam</th>
                <th scope="col" className="py-3 px-4 text-center">Nữ</th>
                <th scope="col" className="py-3 px-4 text-center">Tỷ lệ Nam / Nữ</th>
                <th scope="col" className="py-3 px-4 text-center">Còn sống</th>
                <th scope="col" className="py-3 px-4 text-center">Đã mất</th>
                <th scope="col" className="py-3 px-4 text-center font-bold">Tổng số</th>
                <th scope="col" className="py-3 px-4 text-right">% Toàn dòng họ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE1]">
              {generationData.map((row) => {
                const totalClan = filteredPeople.length || 1;
                const genPercent = Math.round((row.total / totalClan) * 100);
                const isSelected = selectedGenForInspect === row.generation;

                return (
                  <tr
                    key={row.generation}
                    onClick={() => inspectFromTable(row.generation)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1B3B2B]/8 font-semibold'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <th scope="row" className="px-4 text-[#1B3B2B]">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                          inspectFromTable(row.generation);
                        }}
                        className="min-h-11 whitespace-nowrap px-1 font-semibold underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-2"
                      >
                        {row.genLabel}
                      </button>
                    </th>
                    <td className="py-3 px-4 text-center text-[#1B3B2B] font-medium">
                      {row.male}
                    </td>
                    <td className="py-3 px-4 text-center text-[#8C6D32] font-medium">
                      {row.female}
                    </td>
                    <td className="py-3 px-4 text-center text-stone-600">
                      {row.total > 0
                        ? `${Math.round((row.male / row.total) * 100)}% / ${Math.round(
                            (row.female / row.total) * 100
                          )}%`
                        : '--'}
                    </td>
                    <td className="py-3 px-4 text-center text-[#1B3B2B]">
                      {row.living}
                    </td>
                    <td className="py-3 px-4 text-center text-stone-500">
                      {row.deceased}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-[#1F1913]">
                      {row.total}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 rounded-full bg-stone-100 overflow-hidden">
                          <div
                            className="h-full bg-[#1B3B2B] rounded-full"
                            style={{ width: `${Math.min(genPercent * 2, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-stone-600 w-9">{genPercent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
