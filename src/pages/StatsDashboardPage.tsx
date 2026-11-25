import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart2,
  BarChart3,
  Calendar,
  CheckCircle2,
  Compass,
  Filter,
  GitFork,
  PieChart as PieIcon,
  Printer,
  Sparkles,
  TrendingUp,
  UserCheck,
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
  Line,
  LineChart,
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
import { Gender, NavigationTab, Person } from '../models/genealogy';
import { formatLifespan } from '../utils/dateUtils';

interface StatsDashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
}

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

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-in fade-in">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#1B3B2B] text-[#DBC599] border border-[#2B4B3A]">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight">
              Dashboard Thống Kê Phả Hệ & Nhân Khẩu
            </h2>
          </div>
          <p className="text-xs text-[#6A5A4A] mt-1">
            Trực quan hóa đa chiều cơ cấu thế hệ, tỷ lệ nam nữ và tuổi thọ gia tộc họ{' '}
            <strong className="text-[#1B3B2B]">{settings.clanName || 'Việt Nam'}</strong> bằng biểu đồ Recharts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Trang Tổng quan</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tree')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Xem Cây gia phả</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF5EB] border border-[#C19B4C]/40 text-[#8C6D32] hover:bg-[#F3EAD6] text-xs font-semibold shadow-xs transition-colors"
            title="In trang thống kê này"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#1B3B2B]" />
            <span>Lọc dữ liệu:</span>
          </div>

          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 py-1.5 text-[#2C241C] font-medium outline-none focus:border-[#1B3B2B]"
          >
            <option value="all">Tất cả chi họ ({people.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Living/Deceased status */}
          <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-[#1B3B2B] font-bold shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Tất cả ({people.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('living')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'living'
                  ? 'bg-white text-[#1B3B2B] font-bold shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Còn sống
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('deceased')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'deceased'
                  ? 'bg-white text-[#1B3B2B] font-bold shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Đã mất
            </button>
          </div>
        </div>

        {/* Active filter count indicator */}
        <span className="text-xs text-stone-500 font-serif">
          Hiển thị <strong>{filteredPeople.length}</strong> / {people.length} thành viên
        </span>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Members */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng nhân khẩu</span>
            <Users className="w-4 h-4 text-[#1B3B2B]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {filteredPeople.length}
            </span>
            <span className="text-xs text-stone-500">người</span>
          </div>
          <p className="text-[10px] text-stone-400">
            {livingCount} còn sống · {deceasedCount} đã mất
          </p>
        </div>

        {/* Card 2: Gender Ratio */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tỷ lệ Nam / Nữ</span>
            <PieIcon className="w-4 h-4 text-[#8C3A27]" />
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl font-serif font-bold text-[#1B3B2B]">
              {genderData[0]?.percent || 0}%
            </span>
            <span className="text-xs text-stone-300">/</span>
            <span className="text-2xl font-serif font-bold text-[#8C3A27]">
              {genderData[1]?.percent || 0}%
            </span>
          </div>
          <p className="text-[10px] text-stone-400">
            {genderData[0]?.value || 0} Nam · {genderData[1]?.value || 0} Nữ
          </p>
        </div>

        {/* Card 3: Generations Count */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Số thế hệ phả hệ</span>
            <GitFork className="w-4 h-4 text-[#C19B4C]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {generationData.length}
            </span>
            <span className="text-xs text-stone-500">đời</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Đời đông nhất: {peakGen ? `${peakGen.genLabel} (${peakGen.total} vị)` : '--'}
          </p>
        </div>

        {/* Card 4: Average Age */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Độ tuổi bình quân</span>
            <TrendingUp className="w-4 h-4 text-[#2E6B4F]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2E6B4F]">
              {overallAverageAge}
            </span>
            <span className="text-xs text-stone-500">tuổi</span>
          </div>
          <p className="text-[10px] text-stone-400">Tính trên hồ sơ có dữ liệu năm sinh</p>
        </div>
      </div>

      {/* PRIMARY SECTION: Biểu đồ số lượng thành viên theo thế hệ & Tỷ lệ nam/nữ (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: Biểu đồ số lượng thành viên theo thế hệ (Recharts BarChart) */}
        <div className="lg:col-span-8 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EAE1] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#1B3B2B]" />
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                  Biểu Đồ Số Lượng Thành Viên Theo Thế Hệ
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Phân bố số lượng Nam và Nữ trong dòng tộc qua từng đời thứ (dùng Recharts)
              </p>
            </div>

            {/* Chart mode toggle: Grouped vs Stacked */}
            <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF] text-xs">
              <button
                type="button"
                onClick={() => setChartType('grouped')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartType === 'grouped'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#6A5A4A] hover:text-[#1F1913]'
                }`}
              >
                Cột đôi (Grouped)
              </button>
              <button
                type="button"
                onClick={() => setChartType('stacked')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartType === 'stacked'
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#6A5A4A] hover:text-[#1F1913]'
                }`}
              >
                Xếp chồng (Stacked)
              </button>
            </div>
          </div>

          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={generationData}
                margin={{ top: 15, right: 15, left: -10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    const gen = e.activePayload[0].payload?.generation;
                    if (typeof gen === 'number') {
                      setSelectedGenForInspect(gen === selectedGenForInspect ? null : gen);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                <XAxis
                  dataKey="genLabel"
                  tick={{ fontSize: 11, fill: '#6B5E51', fontWeight: 500 }}
                  axisLine={{ stroke: '#E0D6C8' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6B5E51' }}
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

          <p className="text-[11px] text-stone-400 italic text-center">
            * Nhấp vào cột bất kỳ để xem danh sách thành viên chi tiết của thế hệ tương ứng bên dưới.
          </p>
        </div>

        {/* CHART 2: Biểu đồ tỷ lệ nam/nữ trong dòng họ (Recharts PieChart / Donut) */}
        <div className="lg:col-span-4 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#F0EAE1] pb-3">
              <PieIcon className="w-4 h-4 text-[#8C3A27]" />
              <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                Tỷ Lệ Nam / Nữ Trong Dòng Họ
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Cơ cấu cân bằng giới tính nội ngoại trong gia phả
            </p>
          </div>

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

          {/* Legend and Stats Breakdown */}
          <div className="space-y-2 border-t border-stone-100 pt-3">
            {genderData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-[#3D3227] font-medium">{entry.name}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 3: Phân bổ thành viên theo Chi họ (Recharts BarChart ngang) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C19B4C]" />
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                  Phân Bổ Nhân Khẩu Theo Chi Họ
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Quy mô các chi phái trong toàn thể dòng họ
              </p>
            </div>
            <span className="text-xs font-semibold text-[#8C6D32]">
              {branchData.length} chi phái
            </span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B5E51' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#1B3B2B', fontWeight: 600 }}
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
        </div>

        {/* CHART 4: Xu hướng độ tuổi bình quân theo từng đời (Recharts AreaChart) */}
        <div className="lg:col-span-6 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8C3A27]" />
                <h3 className="text-sm sm:text-base font-serif font-bold text-[#1F1913]">
                  Độ Tuổi Bình Quân Qua Các Thế Hệ
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Xu hướng biến thiên tuổi thọ và độ tuổi từng đời
              </p>
            </div>
            <span className="text-xs font-semibold text-[#1B3B2B]">
              Trung bình: {overallAverageAge} tuổi
            </span>
          </div>

          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ageTrendData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="statsAgeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C19B4C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C19B4C" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                <XAxis dataKey="genLabel" tick={{ fontSize: 11, fill: '#6B5E51' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B5E51' }} unit="t" />
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
                    fill: '#1B3B2B',
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
        </div>
      </div>

      {/* INSPECTION DRAWER: Members of Selected Generation */}
      {selectedGenForInspect !== null && (
        <div className="rounded-3xl bg-[#FAF8F5] border-2 border-[#1B3B2B]/30 p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
            <div>
              <h3 className="text-base font-serif font-bold text-[#1B3B2B]">
                Danh Sách Thành Viên Đời Thứ {selectedGenForInspect} ({inspectedMembers.length} người)
              </h3>
              <p className="text-xs text-stone-500">
                Thành viên thuộc thế hệ thứ {selectedGenForInspect} trong cơ sở dữ liệu phả hệ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGenForInspect(null)}
              className="text-xs text-stone-500 hover:text-stone-800 underline font-medium"
            >
              Đóng xem chi tiết ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {inspectedMembers.map((person) => (
              <div
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="p-3 rounded-2xl bg-white border border-[#E7DFD4] hover:border-[#1B3B2B] hover:shadow-xs transition-all cursor-pointer flex items-center gap-3"
              >
                <HeritageAvatar
                  fullName={person.fullName}
                  portraitUrl={person.portraitUrl}
                  gender={person.gender}
                  size="sm"
                  isLiving={person.isLiving}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-serif font-bold text-[#1F1913] truncate hover:text-[#1B3B2B]">
                    {person.fullName}
                  </p>
                  <p className="text-[10px] text-stone-500 truncate">
                    {person.clanRole || (person.gender === 'male' ? 'Nam' : 'Nữ')}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {formatLifespan(person.birthDate, person.deathDate, person.isLiving)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED GENERATION MATRIX TABLE */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-3">
          <div>
            <h3 className="text-base font-serif font-bold text-[#1F1913]">
              Bảng Tổng Hợp Số Liệu Nhân Khẩu Từng Thế Hệ
            </h3>
            <p className="text-xs text-stone-500">
              Chi tiết số lượng nam, nữ, trạng thái và tỷ lệ nhân khẩu qua các đời
            </p>
          </div>
          <span className="text-xs text-stone-400">
            Tổng: <strong>{filteredPeople.length}</strong> thành viên
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF7F2] text-[#4A3B2C] uppercase font-bold tracking-wider border-b border-[#E7DFD4]">
              <tr>
                <th className="py-3 px-4">Thế hệ</th>
                <th className="py-3 px-4 text-center">Nam</th>
                <th className="py-3 px-4 text-center">Nữ</th>
                <th className="py-3 px-4 text-center">Tỷ lệ Nam / Nữ</th>
                <th className="py-3 px-4 text-center">Còn sống</th>
                <th className="py-3 px-4 text-center">Đã mất</th>
                <th className="py-3 px-4 text-center font-bold">Tổng số</th>
                <th className="py-3 px-4 text-right">% Toàn dòng họ</th>
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
                    onClick={() =>
                      setSelectedGenForInspect(isSelected ? null : row.generation)
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1B3B2B]/8 font-semibold'
                        : 'hover:bg-stone-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-serif font-bold text-[#1B3B2B] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1B3B2B]" />
                      <span>{row.genLabel}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-[#1B3B2B] font-medium">
                      {row.male}
                    </td>
                    <td className="py-3 px-4 text-center text-[#8C3A27] font-medium">
                      {row.female}
                    </td>
                    <td className="py-3 px-4 text-center text-stone-600">
                      {row.total > 0
                        ? `${Math.round((row.male / row.total) * 100)}% / ${Math.round(
                            (row.female / row.total) * 100
                          )}%`
                        : '--'}
                    </td>
                    <td className="py-3 px-4 text-center text-emerald-800">
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
