import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Award,
  BarChart3,
  Calendar,
  Filter,
  Flame,
  Info,
  LineChart,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Gender, Person } from '../../models/genealogy';
import { formatLifespan } from '../../utils/dateUtils';
import {
  computeClanLongevitySummary,
  extractPersonLifespan,
  LONGEVITY_BRACKETS,
  PersonLifespanData,
} from './lifespanUtils';

interface LifespanDistributionChartProps {
  onSelectPerson: (personId: string) => void;
}

export const LifespanDistributionChart: React.FC<LifespanDistributionChartProps> = ({
  onSelectPerson,
}) => {
  const { people, branches } = useGenealogy();

  const [activeTab, setActiveTab] = useState<'generation' | 'brackets'>('generation');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'deceased' | 'living'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | Gender>('all');
  const [selectedBracketKey, setSelectedBracketKey] = useState<string | null>(null);

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data?: PersonLifespanData;
  }>({ visible: false, x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(720);

  // Handle responsive width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const w = entries[0].contentRect.width;
        if (w > 200) setContainerWidth(w);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Filter people
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (selectedBranch !== 'all' && p.branchId !== selectedBranch) return false;
      if (statusFilter === 'deceased' && p.isLiving) return false;
      if (statusFilter === 'living' && !p.isLiving) return false;
      if (genderFilter !== 'all' && p.gender !== genderFilter) return false;
      return true;
    });
  }, [people, selectedBranch, statusFilter, genderFilter]);

  // Overall summary
  const summary = useMemo(() => {
    return computeClanLongevitySummary(filteredPeople);
  }, [filteredPeople]);

  // Individual analyzed data list
  const lifespanList = useMemo(() => {
    const list: PersonLifespanData[] = [];
    for (const p of filteredPeople) {
      const item = extractPersonLifespan(p);
      if (item) list.push(item);
    }
    return list;
  }, [filteredPeople]);

  // Draw D3 Chart whenever dependencies update
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear canvas

    if (lifespanList.length === 0) return;

    const width = containerWidth;
    const height = 360;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    if (activeTab === 'generation') {
      // -------------------------------------------------------------
      // VIEW 1: GENERATION SCATTER & AVERAGE TREND LINE
      // -------------------------------------------------------------
      const margin = { top: 35, right: 30, bottom: 45, left: 45 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Generations
      const gens = summary.generationStats.map((s) => s.generation);
      if (gens.length === 0) return;

      const xScale = d3
        .scalePoint<number>()
        .domain(gens)
        .range([30, innerWidth - 30])
        .padding(0.5);

      const yScale = d3
        .scaleLinear()
        .domain([0, 105])
        .range([innerHeight, 0])
        .nice();

      // Background Reference Bands for Traditional Longevity
      // 90+ Đại thọ
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(105))
        .attr('width', innerWidth)
        .attr('height', yScale(90) - yScale(105))
        .attr('fill', '#C19B4C')
        .attr('opacity', 0.08);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yScale(93))
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'serif')
        .attr('font-weight', 'bold')
        .attr('fill', '#99732B')
        .text('Đại Thọ (≥ 90 tuổi)');

      // 80 - 89 Thượng thọ
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(89))
        .attr('width', innerWidth)
        .attr('height', yScale(80) - yScale(89))
        .attr('fill', '#1B3B2B')
        .attr('opacity', 0.05);

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', yScale(83))
        .attr('text-anchor', 'end')
        .attr('font-size', '10px')
        .attr('font-family', 'serif')
        .attr('font-weight', 'bold')
        .attr('fill', '#1B3B2B')
        .text('Thượng Thọ (80 – 89 tuổi)');

      // 70 - 79 Trung thọ
      g.append('rect')
        .attr('x', 0)
        .attr('y', yScale(79))
        .attr('width', innerWidth)
        .attr('height', yScale(70) - yScale(79))
        .attr('fill', '#286248')
        .attr('opacity', 0.03);

      // Horizontal grid lines
      const yTicks = [0, 20, 40, 60, 70, 80, 90, 100];
      g.append('g')
        .selectAll('line.grid')
        .data(yTicks)
        .join('line')
        .attr('class', 'grid')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', '#E7DFD4')
        .attr('stroke-dasharray', '3,3');

      // Y Axis
      const yAxis = d3
        .axisLeft(yScale)
        .tickValues([0, 20, 40, 60, 70, 80, 90, 100])
        .tickFormat((d) => `${d}t`);

      g.append('g')
        .call(yAxis)
        .call((axis) => axis.select('.domain').remove())
        .call((axis) =>
          axis
            .selectAll('text')
            .attr('font-size', '10px')
            .attr('fill', '#786C5F')
        );

      // X Axis
      const xAxis = d3
        .axisBottom(xScale)
        .tickFormat((d) => `Đời ${d}`);

      g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(xAxis)
        .call((axis) => axis.select('.domain').attr('stroke', '#D5CABE'))
        .call((axis) =>
          axis
            .selectAll('text')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#2D241C')
            .attr('dy', '12px')
        );

      // Average Trend Line across Generations
      const lineGen = d3
        .line<typeof summary.generationStats[0]>()
        .x((d) => xScale(d.generation) || 0)
        .y((d) => yScale(d.avgAge))
        .curve(d3.curveMonotoneX);

      // Gradient for trend line
      const defs = svg.append('defs');
      const grad = defs
        .append('linearGradient')
        .attr('id', 'trendGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', '#C19B4C');
      grad.append('stop').attr('offset', '100%').attr('stop-color', '#1B3B2B');

      g.append('path')
        .datum(summary.generationStats)
        .attr('fill', 'none')
        .attr('stroke', 'url(#trendGradient)')
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', lineGen);

      // Generation Average Nodes & Labels
      summary.generationStats.forEach((stat) => {
        const cx = xScale(stat.generation) || 0;
        const cy = yScale(stat.avgAge);

        // Average point circle
        g.append('circle')
          .attr('cx', cx)
          .attr('cy', cy)
          .attr('r', 5)
          .attr('fill', '#1B3B2B')
          .attr('stroke', '#FFFDF9')
          .attr('stroke-width', 2);

        // Average label pill above
        g.append('rect')
          .attr('x', cx - 22)
          .attr('y', cy - 24)
          .attr('width', 44)
          .attr('height', 16)
          .attr('rx', 8)
          .attr('fill', '#1B3B2B')
          .attr('opacity', 0.9);

        g.append('text')
          .attr('x', cx)
          .attr('y', cy - 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('fill', '#FFFDF9')
          .text(`TB ${stat.avgAge}t`);
      });

      // Individual Scatter Points (with stable deterministic jitter per person)
      // Group by gen to jitter horizontally
      const genJitterMap = new Map<string, number>();
      lifespanList.forEach((d) => {
        // Pseudo-random offset based on person ID character codes
        let hash = 0;
        for (let i = 0; i < d.person.id.length; i++) {
          hash = (hash << 5) - hash + d.person.id.charCodeAt(i);
        }
        const jitter = ((hash % 100) / 100 - 0.5) * 36; // ±18px offset
        genJitterMap.set(d.person.id, jitter);
      });

      const circles = g
        .append('g')
        .selectAll('circle.person-dot')
        .data(lifespanList)
        .join('circle')
        .attr('class', 'person-dot')
        .attr('cx', (d) => {
          const baseX = xScale(d.generation) || 0;
          return baseX + (genJitterMap.get(d.person.id) || 0);
        })
        .attr('cy', (d) => yScale(d.age))
        .attr('r', 6)
        .attr('fill', (d) => {
          if (d.age >= 90) return '#C19B4C';
          return d.person.gender === 'female' ? '#8C3A27' : '#1B3B2B';
        })
        .attr('stroke', '#FFFDF9')
        .attr('stroke-width', 1.5)
        .attr('opacity', (d) => (d.isLiving ? 0.75 : 0.95))
        .attr('cursor', 'pointer');

      // Interactivity
      circles
        .on('mouseenter', (event: MouseEvent, d) => {
          d3.select(event.currentTarget as SVGCircleElement)
            .transition()
            .duration(150)
            .attr('r', 9)
            .attr('stroke', '#DBC599')
            .attr('stroke-width', 3);

          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            setTooltipData({
              visible: true,
              x: event.clientX - svgRect.left,
              y: event.clientY - svgRect.top,
              data: d,
            });
          }
        })
        .on('mouseleave', (event: MouseEvent) => {
          d3.select(event.currentTarget as SVGCircleElement)
            .transition()
            .duration(150)
            .attr('r', 6)
            .attr('stroke', '#FFFDF9')
            .attr('stroke-width', 1.5);

          setTooltipData((prev) => ({ ...prev, visible: false }));
        })
        .on('click', (_event, d) => {
          onSelectPerson(d.person.id);
        });
    } else {
      // -------------------------------------------------------------
      // VIEW 2: TRADITIONAL LONGEVITY BRACKETS HISTOGRAM
      // -------------------------------------------------------------
      const margin = { top: 30, right: 20, bottom: 65, left: 40 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const bracketsData = LONGEVITY_BRACKETS.map((b) => {
        const item = summary.bracketCounts[b.key];
        return {
          ...b,
          count: item ? item.count : 0,
          members: item ? item.members : [],
          percent: summary.totalAnalyzed > 0
            ? Math.round(((item ? item.count : 0) / summary.totalAnalyzed) * 100)
            : 0,
        };
      });

      const maxCount = Math.max(1, d3.max(bracketsData, (d) => d.count) || 1);

      const xScale = d3
        .scaleBand()
        .domain(bracketsData.map((d) => d.key))
        .range([0, innerWidth])
        .padding(0.24);

      const yScale = d3
        .scaleLinear()
        .domain([0, maxCount * 1.2])
        .range([innerHeight, 0])
        .nice();

      // Grid lines
      g.append('g')
        .selectAll('line.grid')
        .data(yScale.ticks(4))
        .join('line')
        .attr('class', 'grid')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', '#E7DFD4')
        .attr('stroke-dasharray', '3,3');

      // Bars
      const bars = g
        .selectAll('g.bracket-bar')
        .data(bracketsData)
        .join('g')
        .attr('class', 'bracket-bar')
        .attr('cursor', 'pointer');

      // Bar Rect
      bars
        .append('rect')
        .attr('x', (d) => xScale(d.key) || 0)
        .attr('y', (d) => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => innerHeight - yScale(d.count))
        .attr('rx', 6)
        .attr('fill', (d) => d.color)
        .attr('opacity', (d) => (selectedBracketKey === d.key ? 1 : 0.88))
        .attr('stroke', (d) => (selectedBracketKey === d.key ? '#C19B4C' : 'transparent'))
        .attr('stroke-width', 2.5);

      // Number on top of bar
      bars
        .append('text')
        .attr('x', (d) => (xScale(d.key) || 0) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.count) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1F1913')
        .text((d) => `${d.count} người (${d.percent}%)`);

      // X Axis labels (Traditional Name & Age range)
      bars
        .append('text')
        .attr('x', (d) => (xScale(d.key) || 0) + xScale.bandwidth() / 2)
        .attr('y', innerHeight + 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-family', 'serif')
        .attr('font-weight', 'bold')
        .attr('fill', '#1B3B2B')
        .text((d) => d.traditionalName);

      bars
        .append('text')
        .attr('x', (d) => (xScale(d.key) || 0) + xScale.bandwidth() / 2)
        .attr('y', innerHeight + 33)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#7A6E60')
        .text((d) => d.label);

      // Interactivity on bar click
      bars.on('click', (_event, d) => {
        setSelectedBracketKey((prev) => (prev === d.key ? null : d.key));
      });
    }
  }, [summary, lifespanList, activeTab, containerWidth, selectedBracketKey, onSelectPerson]);

  const selectedBracketDetails = useMemo(() => {
    if (!selectedBracketKey) return null;
    return summary.bracketCounts[selectedBracketKey] || null;
  }, [selectedBracketKey, summary.bracketCounts]);

  return (
    <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Title & Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C19B4C]" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              Phân Bố Tuổi Thọ & Sự Trường Thọ Của Các Thế Hệ
            </h3>
          </div>
          <p className="text-xs text-[#695A4B] mt-0.5">
            Dữ liệu tổng quan về hưởng thọ, tuổi thọ bình quân và các khung thọ truyền thống qua các đời
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('generation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'generation'
                ? 'bg-white text-[#1B3B2B] shadow-xs'
                : 'text-[#6A5A4A] hover:text-[#1F1913]'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Theo Thế Hệ & Xu hướng</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('brackets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'brackets'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-[#6A5A4A] hover:text-[#1F1913]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Khung Thọ Cổ Truyền</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Average Longevity */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tuổi thọ TB</span>
            <Flame className="w-4 h-4 text-[#8C3A27]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {summary.averageAge}
            </span>
            <span className="text-xs text-stone-500">tuổi</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Dựa trên {summary.totalAnalyzed} thành viên có năm sinh/mất
          </p>
        </div>

        {/* Metric 2: Venerable Ratio (>= 70) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tỷ lệ Thượng thọ</span>
            <Award className="w-4 h-4 text-[#C19B4C]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1B3B2B]">
              {summary.venerablePercent}%
            </span>
            <span className="text-xs text-stone-500">≥ 70 tuổi</span>
          </div>
          <p className="text-[10px] text-stone-400">
            {summary.venerableCount} vị đạt thất tuần trở lên
          </p>
        </div>

        {/* Metric 3: Oldest Ancestor */}
        <div
          onClick={() => summary.oldestAncestor && onSelectPerson(summary.oldestAncestor.person.id)}
          className={`p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1 ${
            summary.oldestAncestor ? 'cursor-pointer hover:border-[#1B3B2B]/40 hover:bg-[#F6F2EC]' : ''
          } transition-all`}
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Đại thọ tiền nhân</span>
            <Sparkles className="w-4 h-4 text-[#C19B4C]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {summary.oldestAncestor ? summary.oldestAncestor.age : '--'}
            </span>
            <span className="text-xs text-stone-500">tuổi</span>
          </div>
          <p className="text-[10px] text-stone-600 font-medium truncate">
            {summary.oldestAncestor ? summary.oldestAncestor.person.fullName : 'Chưa có dữ liệu'}
          </p>
        </div>

        {/* Metric 4: Oldest Living Member */}
        <div
          onClick={() => summary.oldestLiving && onSelectPerson(summary.oldestLiving.person.id)}
          className={`p-3.5 sm:p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1 ${
            summary.oldestLiving ? 'cursor-pointer hover:border-[#1B3B2B]/40 hover:bg-[#F6F2EC]' : ''
          } transition-all`}
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cụ thọ nhất hiện tại</span>
            <UserCheck className="w-4 h-4 text-[#286248]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#286248]">
              {summary.oldestLiving ? summary.oldestLiving.age : '--'}
            </span>
            <span className="text-xs text-stone-500">tuổi</span>
          </div>
          <p className="text-[10px] text-stone-600 font-medium truncate">
            {summary.oldestLiving ? summary.oldestLiving.person.fullName : 'Chưa có dữ liệu'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E7DFD4]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span>Lọc:</span>
          </span>

          {/* Branch filter */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-[#D5CABE] bg-white text-[#2C231B] font-medium"
          >
            <option value="all">Tất cả chi họ ({people.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg border border-[#D5CABE] bg-white text-[#2C231B] font-medium"
          >
            <option value="all">Cả còn sống & đã mất</option>
            <option value="deceased">Tiền nhân đã mất (Hưởng thọ)</option>
            <option value="living">Thành viên đương đại (Còn sống)</option>
          </select>

          {/* Gender filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded-lg border border-[#D5CABE] bg-white text-[#2C231B] font-medium"
          >
            <option value="all">Cả Nam & Nữ</option>
            <option value="male">Nam giới</option>
            <option value="female">Nữ giới</option>
          </select>
        </div>

        {/* Legend */}
        {activeTab === 'generation' ? (
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B3B2B]" />
              <span>Nam</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8C3A27]" />
              <span>Nữ</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C19B4C]" />
              <span>Đại thọ (≥90)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#1B3B2B]" />
              <span>Đường tuổi thọ TB</span>
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-stone-500 italic">
            * Nhấp vào cột bất kỳ để xem danh sách thành viên trong khung thọ đó
          </p>
        )}
      </div>

      {/* D3 Canvas Container */}
      <div ref={containerRef} className="relative w-full overflow-hidden bg-white rounded-2xl border border-[#E7DFD4] p-2 sm:p-4">
        {lifespanList.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Info className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-sm font-serif font-bold text-stone-600">
              Chưa đủ dữ liệu năm sinh và năm mất
            </p>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Hãy nhập năm sinh hoặc năm mất cho các thành viên trong gia phả để hiển thị biểu đồ phân bố tuổi thọ.
            </p>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-auto select-none" />
        )}

        {/* Hover Tooltip (rendered in React for flawless avatar & styling) */}
        {tooltipData.visible && tooltipData.data && (
          <div
            className="absolute pointer-events-none z-30 transition-all duration-75 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${tooltipData.x}px`,
              top: `${tooltipData.y}px`,
            }}
          >
            <div className="bg-[#1F1913]/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-xs border border-white/20 min-w-[210px] space-y-2 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2.5">
                <HeritageAvatar
                  fullName={tooltipData.data.person.fullName}
                  portraitUrl={tooltipData.data.person.portraitUrl}
                  gender={tooltipData.data.person.gender}
                  size="sm"
                  isLiving={tooltipData.data.person.isLiving}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-400 text-stone-900">
                      Đời {tooltipData.data.generation}
                    </span>
                    <span className="text-[10px] text-amber-200">
                      {tooltipData.data.isLiving ? 'Còn sống' : 'Hưởng thọ'}
                    </span>
                  </div>
                  <p className="text-xs font-serif font-bold text-white truncate">
                    {tooltipData.data.person.fullName}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-1.5 space-y-0.5 text-[11px] text-[#E0D7CC]">
                <p className="flex justify-between">
                  <span className="text-stone-400">Tuổi thọ:</span>
                  <span className="font-bold text-amber-300">
                    {tooltipData.data.age} tuổi
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-stone-400">Niên đại:</span>
                  <span>
                    {formatLifespan(
                      tooltipData.data.person.birthDate,
                      tooltipData.data.person.deathDate,
                      tooltipData.data.person.isLiving
                    )}
                  </span>
                </p>
                {tooltipData.data.person.clanRole && (
                  <p className="text-[10px] text-stone-300 italic pt-0.5 truncate">
                    Vai vế: {tooltipData.data.person.clanRole}
                  </p>
                )}
              </div>

              <div className="text-[9px] text-center text-stone-400 border-t border-white/10 pt-1">
                Nhấn để xem chi tiết hồ sơ
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Bracket Member List Card (in Bracket View) */}
      {activeTab === 'brackets' && selectedBracketDetails && (
        <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-2">
            <div>
              <h4 className="text-xs font-serif font-bold text-[#1B3B2B] flex items-center gap-1.5">
                <span>{selectedBracketDetails.bracket.traditionalName}</span>
                <span className="text-[11px] text-stone-500 font-sans font-normal">
                  ({selectedBracketDetails.bracket.label} • {selectedBracketDetails.count} vị)
                </span>
              </h4>
              <p className="text-[11px] text-stone-500">{selectedBracketDetails.bracket.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBracketKey(null)}
              className="text-xs text-stone-400 hover:text-stone-700"
            >
              ✕ Đóng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {selectedBracketDetails.members.map((m) => (
              <div
                key={m.person.id}
                onClick={() => onSelectPerson(m.person.id)}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#E7DFD4] hover:bg-stone-50 cursor-pointer transition-colors"
              >
                <HeritageAvatar
                  fullName={m.person.fullName}
                  portraitUrl={m.person.portraitUrl}
                  gender={m.person.gender}
                  size="sm"
                  isLiving={m.person.isLiving}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#1F1913] truncate hover:text-[#1B3B2B]">
                    {m.person.fullName}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Đời {m.generation} • {m.isLiving ? 'Hiện nay' : 'Hưởng thọ'}{' '}
                    <strong className="text-[#1B3B2B]">{m.age} tuổi</strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
