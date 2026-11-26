import React, { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Compass,
  Download,
  Filter,
  Layers,
  Maximize2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import { formatLifespan } from '../../utils/dateUtils';
import { pinchScale } from './viewportGesture';

interface FanChartLayoutProps {
  initialCenterPersonId?: string;
  onOpenProfile: (personId: string) => void;
}

interface FanWedgeNode {
  id: string;
  person: Person;
  depth: number;
  startAngle: number; // in radians
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
}

export const FanChartLayout: React.FC<FanChartLayoutProps> = ({
  initialCenterPersonId,
  onOpenProfile,
}) => {
  const { people, relationships, getPersonById, getChildren, getParents, branches, settings } =
    useGenealogy();

  const [centerPersonId, setCenterPersonId] = useState<string>(
    initialCenterPersonId || settings.rootPersonId || (people[0]?.id ?? '')
  );
  const [fanAngle, setFanAngle] = useState<'180' | '240' | '360'>('240');
  const [fanDirection, setFanDirection] = useState<'descendant' | 'ancestor'>('descendant');
  const [maxGenerations, setMaxGenerations] = useState<number>(5);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // SVG Pan & Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const centerPerson = getPersonById(centerPersonId) || people[0];

  // Palette generator based on branch or generation
  const branchColorMap = useMemo(() => {
    const palette = ['#1B3B2B', '#8C6D32', '#8C3A27', '#254F3A', '#4A3B2C', '#2D5A43'];
    const map = new Map<string, string>();
    branches.forEach((b, idx) => {
      map.set(b.id, palette[idx % palette.length]);
    });
    return map;
  }, [branches]);

  // Build Fan Hierarchy Tree
  const { wedges, centerNode } = useMemo(() => {
    if (!centerPerson) return { wedges: [], centerNode: null };

    const totalAngleRad =
      fanAngle === '180' ? Math.PI : fanAngle === '240' ? (4 * Math.PI) / 3 : 2 * Math.PI;

    // Start angle offset to center the fan nicely (for 180: -PI/2 to PI/2, for 240: -2PI/3 to 2PI/3)
    const baseStartAngle = -totalAngleRad / 2;

    const ringThickness = 75; // px per generation ring
    const centerRadius = 60; // Center person radius

    const resultWedges: FanWedgeNode[] = [];

    if (fanDirection === 'descendant') {
      // Descendant Fan (con cháu tỏa ra)
      interface TreeNode {
        person: Person;
        children: TreeNode[];
      }

      const buildDescTree = (p: Person, depth: number): TreeNode => {
        if (depth >= maxGenerations) return { person: p, children: [] };
        const childInfos = getChildren(p.id);
        const children = childInfos.map((ci) => buildDescTree(ci.child, depth + 1));
        return { person: p, children };
      };

      const rootTree = buildDescTree(centerPerson, 1);

      // Recursive arc allocation
      const assignArcs = (
        node: TreeNode,
        depth: number,
        startAng: number,
        endAng: number
      ) => {
        if (depth > 1) {
          const innerR = centerRadius + (depth - 2) * ringThickness;
          const outerR = innerR + ringThickness;

          const branchColor = node.person.branchId
            ? branchColorMap.get(node.person.branchId) || '#1B3B2B'
            : '#1B3B2B';

          resultWedges.push({
            id: node.person.id,
            person: node.person,
            depth,
            startAngle: startAng,
            endAngle: endAng,
            innerRadius: innerR,
            outerRadius: outerR,
            color: branchColor,
          });
        }

        if (node.children.length > 0 && depth < maxGenerations) {
          const span = (endAng - startAng) / node.children.length;
          node.children.forEach((child, idx) => {
            const childStart = startAng + idx * span;
            const childEnd = childStart + span;
            assignArcs(child, depth + 1, childStart, childEnd);
          });
        }
      };

      assignArcs(rootTree, 1, baseStartAngle, baseStartAngle + totalAngleRad);
    } else {
      // Ancestor Fan (tiền nhân: phụ mẫu, tổ phụ mẫu...)
      const buildAncTree = (p: Person, depth: number, startAng: number, endAng: number) => {
        if (depth > 1) {
          const innerR = centerRadius + (depth - 2) * ringThickness;
          const outerR = innerR + ringThickness;
          resultWedges.push({
            id: p.id,
            person: p,
            depth,
            startAngle: startAng,
            endAngle: endAng,
            innerRadius: innerR,
            outerRadius: outerR,
            color: p.gender === 'male' ? '#1B3B2B' : '#8C3A27',
          });
        }

        if (depth < maxGenerations) {
          const parents = getParents(p.id);
          const father = parents.find((pr) => pr.parent.gender === 'male')?.parent;
          const mother = parents.find((pr) => pr.parent.gender === 'female')?.parent;

          const midAng = (startAng + endAng) / 2;
          if (father) buildAncTree(father, depth + 1, startAng, midAng);
          if (mother) buildAncTree(mother, depth + 1, midAng, endAng);
        }
      };

      buildAncTree(centerPerson, 1, baseStartAngle, baseStartAngle + totalAngleRad);
    }

    return {
      centerNode: {
        person: centerPerson,
        radius: centerRadius,
      },
      wedges: resultWedges,
    };
  }, [
    centerPerson,
    fanAngle,
    fanDirection,
    maxGenerations,
    getChildren,
    getParents,
    branchColorMap,
  ]);

  // Arc path generator
  const arcGen = useMemo(() => {
    return d3
      .arc<FanWedgeNode>()
      .innerRadius((d) => d.innerRadius)
      .outerRadius((d) => d.outerRadius)
      .startAngle((d) => d.startAngle)
      .endAngle((d) => d.endAngle)
      .padAngle(0.008)
      .cornerRadius(4);
  }, []);

  // Pan handlers for mouse & touch
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsDragging(false);
      pinchRef.current = {
        distance: Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY),
        scale: zoomLevel,
      };
      return;
    }
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const distance = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      setZoomLevel(pinchScale(pinchRef.current.scale, pinchRef.current.distance, distance));
      return;
    }
    if (!isDragging || e.touches.length !== 1) return;
    setPanOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
    setIsDragging(false);
  };


  const handleExportSvg = () => {
    const svgEl = document.getElementById('fan-chart-svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bieu_Do_Nan_Quat_${centerPerson?.fullName.replace(/\s+/g, '_') || 'Gia_Pha'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const svgDimension = 860;
  const originX = svgDimension / 2;
  const originY = fanAngle === '180' ? 440 : svgDimension / 2;

  return (
    <div className="fan-workspace flex h-full min-h-0 flex-col gap-3">
      {/* Top Controls Toolbar */}
      <div className="fan-toolbar p-3 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Fan Direction & Angle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-[#FAF7F2] rounded-xl border border-[#D5CABE]">
            <button
              type="button"
              onClick={() => setFanDirection('descendant')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                fanDirection === 'descendant'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hậu duệ tỏa nhánh
            </button>
            <button
              type="button"
              onClick={() => setFanDirection('ancestor')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                fanDirection === 'ancestor'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tiền nhân tổ tiên
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#D5CABE]">
            {(['180', '240', '360'] as const).map((ang) => (
              <button
                key={ang}
                type="button"
                onClick={() => setFanAngle(ang)}
                className={`px-2.5 py-1 rounded-lg font-semibold ${
                  fanAngle === ang ? 'bg-[#8C6D32] text-white' : 'text-stone-600'
                }`}
              >
                {ang === '180' ? 'Bán nguyệt 180°' : ang === '240' ? 'Cánh quạt 240°' : 'Tròn 360°'}
              </button>
            ))}
          </div>

          {/* Generation Depth */}
          <div className="flex items-center gap-1.5 text-stone-600">
            <span className="hidden sm:inline">Số đời:</span>
            <select
              value={maxGenerations}
              onChange={(e) => setMaxGenerations(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-white border border-[#D5CABE] font-semibold text-xs"
            >
              <option value={3}>3 đời</option>
              <option value={4}>4 đời</option>
              <option value={5}>5 đời</option>
              <option value={6}>6 đời</option>
            </select>
          </div>
        </div>

        {/* Center Person Selector & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-stone-600">
            <span className="hidden md:inline">Gốc nan quạt:</span>
            <select
              value={centerPersonId}
              onChange={(e) => setCenterPersonId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-[#D5CABE] font-semibold text-xs max-w-[160px] truncate"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.15))}
              className="p-1 text-stone-600 hover:text-stone-900"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 font-mono text-[11px] text-stone-600">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
              className="p-1 text-stone-600 hover:text-stone-900"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1 text-stone-600 hover:text-stone-900"
              title="Đặt lại góc nhìn"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportSvg}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white font-semibold shadow-xs transition-colors"
            title="Tải tệp SVG vector độ phân giải cao"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất SVG</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div
        style={{ touchAction: 'none' }}
        className="w-full flex-1 min-h-0 bg-[#FAF7F2] rounded-3xl border border-[#D5CABE] shadow-inner relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <svg
          id="fan-chart-svg"
          viewBox={`0 0 ${svgDimension} ${svgDimension}`}
          className="w-full h-full"
        >
          {/* Header watermark */}
          <text
            x={originX}
            y={40}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', serif"
            fontSize={18}
            fontWeight="bold"
            fill="#1B3B2B"
          >
            BIỂU ĐỒ NAN QUẠT PHẢ HỆ: {settings.clanName.toUpperCase()}
          </text>
          <text
            x={originX}
            y={60}
            textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontSize={10}
            fill="#8C6D32"
          >
            {fanDirection === 'descendant'
              ? `Hậu duệ phát tích từ ${centerPerson?.fullName || 'Tổ tiên'} (${maxGenerations} thế hệ)`
              : `Tổ phụ tiền nhân của ${centerPerson?.fullName || 'Hậu duệ'}`}
          </text>

          <g
            transform={`translate(${originX + panOffset.x}, ${
              originY + panOffset.y
            }) scale(${zoomLevel})`}
          >
            {/* Wedges */}
            {wedges.map((w) => {
              const pathD = arcGen(w) || '';
              const isHovered = hoveredNodeId === w.id;
              const angleSpan = w.endAngle - w.startAngle;
              const midAngle = (w.startAngle + w.endAngle) / 2;
              const midRadius = (w.innerRadius + w.outerRadius) / 2;

              // Text position in arc
              // In D3 arc, 0 rad is 12 o'clock (upward)
              const textX = midRadius * Math.sin(midAngle);
              const textY = -midRadius * Math.cos(midAngle);

              // Text rotation in degrees
              let rotDeg = (midAngle * 180) / Math.PI;
              // Normalize rotation so text is readable
              if (rotDeg > 90 && rotDeg < 270) {
                rotDeg = rotDeg - 180;
              }

              return (
                <g
                  key={`${w.id}_${w.depth}`}
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredNodeId(w.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile(w.person.id);
                  }}
                >
                  <path
                    d={pathD}
                    fill={isHovered ? '#C5A059' : '#FFFDF9'}
                    stroke={w.color}
                    strokeWidth={isHovered ? 2.5 : 1.2}
                    className="transition-colors duration-150"
                  />

                  {/* Wedge Text if angle is wide enough */}
                  {angleSpan > 0.08 && (
                    <text
                      x={textX}
                      y={textY}
                      transform={`rotate(${rotDeg}, ${textX}, ${textY})`}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="'Cormorant Garamond', serif"
                      fontSize={angleSpan > 0.25 ? 11 : 9}
                      fontWeight="bold"
                      fill={isHovered ? '#1B3B2B' : '#1F1913'}
                      pointerEvents="none"
                    >
                      {w.person.fullName}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Center Circle (Root Person) */}
            {centerNode && (
              <g
                className="cursor-pointer group"
                onClick={() => onOpenProfile(centerNode.person.id)}
              >
                <circle
                  r={centerNode.radius}
                  fill="#1B3B2B"
                  stroke="#DBC599"
                  strokeWidth={3}
                  className="shadow-md"
                />
                <text
                  textAnchor="middle"
                  y={-14}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontSize={8}
                  fontWeight="bold"
                  fill="#DBC599"
                  letterSpacing="1px"
                >
                  GỐC NAN QUẠT
                </text>
                <text
                  textAnchor="middle"
                  y={4}
                  fontFamily="'Cormorant Garamond', serif"
                  fontSize={13}
                  fontWeight="bold"
                  fill="#FFFDF9"
                >
                  {centerNode.person.fullName}
                </text>
                <text
                  textAnchor="middle"
                  y={18}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontSize={8}
                  fill="#C5BBAF"
                >
                  {formatLifespan(
                    centerNode.person.birthDate,
                    centerNode.person.deathDate,
                    centerNode.person.isLiving
                  )}
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Hovered Tooltip Card */}
        {hoveredNodeId && (
          <div className="absolute bottom-4 left-4 p-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D5CABE] shadow-lg text-xs space-y-1 max-w-xs animate-in fade-in pointer-events-none">
            {(() => {
              const p = people.find((item) => item.id === hoveredNodeId);
              if (!p) return null;
              return (
                <>
                  <p className="font-serif font-bold text-sm text-[#1B3B2B]">{p.fullName}</p>
                  <p className="text-[11px] text-stone-600">
                    {formatLifespan(p.birthDate, p.deathDate, p.isLiving)} · Đời {p.generation || '—'}
                  </p>
                  {p.clanRole && (
                    <p className="text-[10px] text-[#8C6D32] font-semibold">{p.clanRole}</p>
                  )}
                  {p.tabooName && (
                    <p className="text-[10px] text-[#8C3A27]">Tên húy: {p.tabooName}</p>
                  )}
                  <p className="text-[10px] text-stone-400 italic">Nhấp để mở hồ sơ chi tiết</p>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
