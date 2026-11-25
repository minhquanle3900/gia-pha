import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart2,
  Calendar,
  ChevronRight,
  Filter,
  PieChart as PieIcon,
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
import { useGenealogy } from '../../context/GenealogyContext';
import { Gender, NavigationTab, Person } from '../../models/genealogy';
import { extractPersonLifespan } from './lifespanUtils';

interface FamilyStatsProps {
  onSelectPerson?: (personId: string) => void;
  onNavigate?: (tab: NavigationTab) => void;
}

export const FamilyStats: React.FC<FamilyStatsProps> = ({ onNavigate }) => {
  const { people, branches } = useGenealogy();

  const [activeTab, setActiveTab] = useState<'all' | 'generation' | 'age' | 'gender'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  // Filter people by selected branch if specified
  const filteredPeople = useMemo(() => {
    if (selectedBranch === 'all') return people;
    return people.filter((p) => p.branchId === selectedBranch);
  }, [people, selectedBranch]);

  // 1. DATA: Generation Distribution (Phân bổ theo thế hệ)
  const generationData = useMemo(() => {
    const map = new Map<
      number,
      {
        generation: number;
        genLabel: string;
        male: number;
        female: number;
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
        total: 0,
        living: 0,
        deceased: 0,
      };

      existing.total++;
      if (p.gender === 'male') existing.male++;
      else if (p.gender === 'female') existing.female++;

      if (p.isLiving) existing.living++;
      else existing.deceased++;

      map.set(gen, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.generation - b.generation);
  }, [filteredPeople]);

  // 2. DATA: Average Age by Generation (Độ tuổi trung bình)
  const averageAgeData = useMemo(() => {
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

  // Overall Clan Average Age
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

  // 3. DATA: Gender Ratio (Tỷ lệ Nam Nữ)
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
        color: '#1B3B2B',
      },
      {
        name: 'Nữ giới',
        value: female,
        percent: Math.round((female / total) * 100),
        color: '#8C3A27',
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

  // Peak Generation with most members
  const peakGeneration = useMemo(() => {
    if (generationData.length === 0) return null;
    let peak = generationData[0];
    for (const g of generationData) {
      if (g.total > peak.total) peak = g;
    }
    return peak;
  }, [generationData]);

  return (
    <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DFD4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#C19B4C]" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              Thống Kê Phả Hệ & Nhân Khẩu (Family Stats)
            </h3>
          </div>
          <p className="text-xs text-[#6E5F50] mt-0.5">
            Trực quan hóa cơ cấu thế hệ, độ tuổi trung bình và tỷ lệ nam nữ bằng Recharts
          </p>
        </div>

        {/* Tab switcher & Full Page Link */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('stats')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B3B2B] text-white hover:bg-[#2A4D3B] text-xs font-semibold shadow-xs transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[#DBC599]" />
              <span>Xem Dashboard Thống Kê →</span>
            </button>
          )}

          {branches.length > 1 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-[#FAF7F2] text-xs font-semibold text-[#3D3126]"
            >
              <option value="all">Tất cả chi họ ({people.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('generation')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'generation'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Thế hệ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('age')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'age'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Độ tuổi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gender')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'gender'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#6A5A4A] hover:text-[#1F1913]'
              }`}
            >
              Giới tính
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase">Tổng nhân khẩu</span>
            <Users className="w-4 h-4 text-[#1B3B2B]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif font-bold text-[#1F1913]">
              {filteredPeople.length}
            </span>
            <span className="text-xs text-stone-500">thành viên</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Qua {generationData.length} thế hệ gia tộc
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase">Tỷ lệ Nam / Nữ</span>
            <PieIcon className="w-4 h-4 text-[#8C3A27]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-serif font-bold text-[#1B3B2B]">
              {genderData[0]?.percent || 0}%
            </span>
            <span className="text-xs text-stone-400">/</span>
            <span className="text-xl font-serif font-bold text-[#8C3A27]">
              {genderData[1]?.percent || 0}%
            </span>
          </div>
          <p className="text-[10px] text-stone-400">
            {genderData[0]?.value || 0} Nam · {genderData[1]?.value || 0} Nữ
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase">Độ tuổi bình quân</span>
            <TrendingUp className="w-4 h-4 text-[#C19B4C]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif font-bold text-[#1F1913]">
              {overallAverageAge}
            </span>
            <span className="text-xs text-stone-500">tuổi</span>
          </div>
          <p className="text-[10px] text-stone-400">Tính trên hồ sơ có năm sinh</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase">Đời đông đúc nhất</span>
            <Award className="w-4 h-4 text-[#2E6B4F]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-serif font-bold text-[#2E6B4F]">
              {peakGeneration?.genLabel || '--'}
            </span>
            <span className="text-xs text-stone-500">({peakGeneration?.total || 0} vị)</span>
          </div>
          <p className="text-[10px] text-stone-400">Thế hệ phát triển sung túc nhất</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Generation Distribution (BarChart) */}
        {(activeTab === 'all' || activeTab === 'generation') && (
          <div
            className={`rounded-2xl bg-white border border-[#E7DFD4] p-4 sm:p-5 shadow-xs space-y-3 ${
              activeTab === 'all' ? 'lg:col-span-7' : 'lg:col-span-12'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1B3B2B] uppercase tracking-wider">
                  Phân Bổ Nhân Khẩu Theo Thế Hệ
                </h4>
                <p className="text-[11px] text-stone-500">
                  Số lượng nam và nữ phân bố qua từng đời
                </p>
              </div>
              <span className="text-[11px] font-semibold text-stone-400">
                {generationData.length} thế hệ
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={generationData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis
                    dataKey="genLabel"
                    tick={{ fontSize: 11, fill: '#6B5E51' }}
                    axisLine={{ stroke: '#E0D6C8' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#6B5E51' }}
                    axisLine={{ stroke: '#E0D6C8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF7F2',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [
                      `${value} người`,
                      name === 'male' ? 'Nam giới' : name === 'female' ? 'Nữ giới' : name,
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (value === 'male' ? 'Nam giới' : 'Nữ giới')}
                  />
                  <Bar
                    dataKey="male"
                    name="male"
                    fill="#1B3B2B"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="female"
                    name="female"
                    fill="#8C3A27"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Chart 2: Gender Demographics (Donut PieChart) */}
        {(activeTab === 'all' || activeTab === 'gender') && (
          <div
            className={`rounded-2xl bg-white border border-[#E7DFD4] p-4 sm:p-5 shadow-xs space-y-3 ${
              activeTab === 'all' ? 'lg:col-span-5' : 'lg:col-span-12'
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1B3B2B] uppercase tracking-wider">
                  Cơ Cấu Giới Tính Dòng Tộc
                </h4>
                <p className="text-[11px] text-stone-500">Tỷ lệ cân đối nhân khẩu trong phả hệ</p>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-1 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="80%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF7F2',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any) => [`${value} người`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend with counts */}
              <div className="flex items-center justify-center gap-6 text-xs pt-2">
                {genderData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-medium text-[#2C231B]">
                      {entry.name}: <strong>{entry.value}</strong> ({entry.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chart 3: Average Age Trend (LineChart) */}
        {(activeTab === 'all' || activeTab === 'age') && (
          <div className="lg:col-span-12 rounded-2xl bg-white border border-[#E7DFD4] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F0EAE1] pb-2">
              <div>
                <h4 className="text-xs font-serif font-bold text-[#1B3B2B] uppercase tracking-wider">
                  Độ Tuổi Bình Quân Qua Các Thế Hệ
                </h4>
                <p className="text-[11px] text-stone-500">
                  Đường xu hướng tuổi thọ và số tuổi bình quân của từng đời
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8C6D32]">
                <span>Trung bình toàn tộc: {overallAverageAge} tuổi</span>
              </div>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={averageAgeData}
                  margin={{ top: 15, right: 20, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="ageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C19B4C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C19B4C" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis
                    dataKey="genLabel"
                    tick={{ fontSize: 11, fill: '#6B5E51' }}
                    axisLine={{ stroke: '#E0D6C8' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#6B5E51' }}
                    axisLine={{ stroke: '#E0D6C8' }}
                    unit="t"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF7F2',
                      borderColor: '#D5CABE',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} tuổi`, 'Tuổi trung bình']}
                  />
                  <ReferenceLine
                    y={overallAverageAge}
                    stroke="#1B3B2B"
                    strokeDasharray="4 4"
                    label={{
                      value: `TB: ${overallAverageAge}t`,
                      position: 'right',
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
                    fill="url(#ageGradient)"
                    dot={{ r: 5, fill: '#1B3B2B', stroke: '#FFFDF9', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#C19B4C', stroke: '#1B3B2B', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
