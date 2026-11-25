import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Compass,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Focus,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  Maximize2,
  Minus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { usePreferences } from '../../hooks/usePreferences';
import { Person, TreeViewMode } from '../../models/genealogy';
import {
  formatFlexibleDate,
  formatLifespan,
  formatLunarAnniversary,
} from '../../utils/dateUtils';
import { RelationshipEditorModal } from '../relationships/RelationshipEditorModal';
import { FanChartLayout } from './FanChartLayout';
import {
  buildFamilyTreeLayout,
  generateCurvedLinkPath,
  TREE_LEVEL_GAP_Y,
  TREE_NODE_HEIGHT,
  TREE_NODE_WIDTH,
  TREE_SIBLING_GAP_X,
  TreeNodeData,
} from './treeLayout';

interface FamilyTreePageProps {
  initialFocusPersonId?: string;
  onOpenProfile: (personId: string) => void;
  onEditPerson?: (person: Person) => void;
  onAddPerson: () => void;
  onOpenKinship?: () => void;
  onOpenBook?: () => void;
}

export const FamilyTreePage: React.FC<FamilyTreePageProps> = ({
  initialFocusPersonId,
  onOpenProfile,
  onEditPerson,
  onAddPerson,
  onOpenKinship,
  onOpenBook,
}) => {
  const {
    people,
    relationships,
    unions,
    branches,
    settings,
    getPersonById,
    getParents,
    getChildren,
    getSpouses,
    getBranchById,
  } = useGenealogy();
  const { preferences, updatePreferences } = usePreferences();

  const [viewMode, setViewMode] = useState<TreeViewMode>(
    preferences.defaultTreeView || 'descendant'
  );
  const [focusPersonId, setFocusPersonId] = useState<string | undefined>(
    initialFocusPersonId || settings.rootPersonId
  );
  const [chartType, setChartType] = useState<'tree' | 'fan'>('tree');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Interactive Node Inspector (Gramps Web / MyHeritage slide-over panel)
  const [inspectedPersonId, setInspectedPersonId] = useState<string | null>(
    initialFocusPersonId || settings.rootPersonId || (people[0]?.id ?? null)
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [showShortcutsHint, setShowShortcutsHint] = useState<boolean>(false);
  const [relEditorOpen, setRelEditorOpen] = useState<boolean>(false);

  // SVG ref and zoom state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Sync initialFocusPersonId
  useEffect(() => {
    if (initialFocusPersonId) {
      setFocusPersonId(initialFocusPersonId);
      setInspectedPersonId(initialFocusPersonId);
    }
  }, [initialFocusPersonId]);

  const branchesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) map.set(b.id, b.name);
    return map;
  }, [branches]);

  // Layout calculation
  const layout = useMemo(() => {
    return buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode,
      rootPersonId: settings.rootPersonId,
      focusPersonId,
      collapsedNodeIds: collapsedNodes,
      branchFilter: selectedBranch === 'all' ? undefined : selectedBranch,
      branchesMap,
    });
  }, [
    people,
    relationships,
    unions,
    viewMode,
    settings.rootPersonId,
    focusPersonId,
    collapsedNodes,
    selectedBranch,
    branchesMap,
  ]);

  // Generation watermark bands for archival elegance
  const generationBands = useMemo(() => {
    const map = new Map<number, number>(); // gen -> minY
    for (const n of layout.nodes) {
      const gen = n.generation;
      if (gen !== undefined) {
        const existing = map.get(gen);
        if (existing === undefined || n.y < existing) {
          map.set(gen, n.y);
        }
      }
    }
    const list: { generation: number; y: number }[] = [];
    map.forEach((y, generation) => {
      list.push({ generation, y });
    });
    return list.sort((a, b) => a.generation - b.generation);
  }, [layout.nodes, viewMode]);

  // D3 Zoom Setup
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setZoomScale(event.transform.k);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial center on tree
    if (layout.nodes.length > 0) {
      fitToScreen();
    }

    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  const fitToScreen = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    const { bounds } = layout;
    if (bounds.width === 0 || bounds.height === 0) return;

    // Leave margin for side drawer if open on desktop
    const rightMargin = inspectedPersonId && window.innerWidth >= 1024 ? 340 : 60;
    const padding = 60;
    const scaleX = (width - padding - rightMargin) / bounds.width;
    const scaleY = (height - padding * 2) / bounds.height;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 1.2);

    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;

    const targetCenterX = (width - rightMargin) / 2;

    const transform = d3.zoomIdentity
      .translate(targetCenterX - midX * scale, height / 2 - midY * scale)
      .scale(scale);

    svg.transition().duration(500).call(zoomBehaviorRef.current.transform, transform);
    setZoomScale(scale);
  };

  const zoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.25);
  };

  const zoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.8);
  };

  const centerOnNode = (node: TreeNodeData) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;
    const currentScale = d3.zoomTransform(svgRef.current).k || 0.85;

    // If inspector drawer is visible on desktop, shift center slightly left
    const rightOffset = inspectedPersonId && window.innerWidth >= 1024 ? 160 : 0;
    const targetCenterX = width / 2 - rightOffset;

    const transform = d3.zoomIdentity
      .translate(
        targetCenterX - (node.x + node.width / 2) * currentScale,
        height / 2 - (node.y + node.height / 2) * currentScale
      )
      .scale(currentScale);

    d3.select(svgRef.current).transition().duration(500).call(zoomBehaviorRef.current.transform, transform);
    setZoomScale(currentScale);
  };

  // Re-fit canvas smoothly whenever viewMode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (layout.nodes.length > 0) {
        fitToScreen();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [viewMode]);


  const resetToRoot = () => {
    const rootId = settings.rootPersonId || (people[0]?.id ?? '');
    const rootNode = layout.nodes.find((n) => n.id === rootId) || layout.nodes[0];
    if (rootNode) {
      setFocusPersonId(rootNode.id);
      setInspectedPersonId(rootNode.id);
      centerOnNode(rootNode);
    } else {
      fitToScreen();
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        fitToScreen();
      } else if (e.key === 'Escape') {
        setInspectedPersonId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [layout]);

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Export SVG function
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cay-Gia-Pha-${settings.clanName || 'Viet'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Search filtered people for quick jump
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return people.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.commonName?.toLowerCase().includes(q) ||
        p.tabooName?.toLowerCase().includes(q)
    );
  }, [people, searchQuery]);

  // Current Inspected Person Details for Side Panel
  const inspectedPerson = useMemo(() => {
    if (!inspectedPersonId) return null;
    return getPersonById(inspectedPersonId);
  }, [inspectedPersonId, getPersonById]);

  const inspectedBranch = useMemo(() => {
    if (!inspectedPerson?.branchId) return undefined;
    return getBranchById(inspectedPerson.branchId);
  }, [inspectedPerson, getBranchById]);

  const inspectedParents = useMemo(() => {
    if (!inspectedPerson) return [];
    return getParents(inspectedPerson.id);
  }, [inspectedPerson, getParents]);

  const inspectedChildren = useMemo(() => {
    if (!inspectedPerson) return [];
    return getChildren(inspectedPerson.id);
  }, [inspectedPerson, getChildren]);

  const inspectedSpouses = useMemo(() => {
    if (!inspectedPerson) return [];
    return getSpouses(inspectedPerson.id);
  }, [inspectedPerson, getSpouses]);

  // Ancestry Trail / Lineage Path to Inspected Person (FamilySearch style)
  const lineagePath = useMemo(() => {
    if (!inspectedPersonId) return [];
    const trail: Person[] = [];
    let curId: string | undefined = inspectedPersonId;
    const visited = new Set<string>();

    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const p = getPersonById(curId);
      if (!p) break;
      trail.unshift(p);
      const parents = getParents(curId);
      // Prefer father or first parent
      const father = parents.find((pr) => pr.parent.gender === 'male')?.parent || parents[0]?.parent;
      curId = father ? father.id : undefined;
    }
    return trail;
  }, [inspectedPersonId, getPersonById, getParents]);

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [viewModeMenuOpen, setViewModeMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewModeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (chartType === 'fan') {
    return (
      <div className="flex flex-col h-[calc(100vh-125px)] min-h-[550px] relative bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] shadow-xs overflow-hidden">
        {/* Top Slim Switcher */}
        <div className="px-3.5 py-2 bg-[#FAF7F2] border-b border-[#E7DFD4] flex items-center justify-between gap-2 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#8C6D32]">Kiểu biểu đồ:</span>
            <div className="flex items-center p-0.5 rounded-xl bg-[#EFE9DF] border border-[#DDD4C7]">
              <button
                type="button"
                onClick={() => setChartType('tree')}
                className="px-3 py-1 rounded-lg text-xs font-medium text-[#5C4F42] hover:text-[#1B3B2B] transition-colors"
              >
                Cây phân nhánh
              </button>
              <button
                type="button"
                onClick={() => setChartType('fan')}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-[#1B3B2B] text-white shadow-xs"
              >
                Nan Quạt (Fan Chart)
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenBook && (
              <button
                type="button"
                onClick={onOpenBook}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#8C6D32] hover:bg-stone-50 text-xs font-medium shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xuất sách / In ấn</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <FanChartLayout
            initialCenterPersonId={focusPersonId}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] min-h-[550px] relative bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] shadow-xs overflow-hidden">
      {/* Canvas-First Slim Header Toolbar */}
      <div className="px-3 py-2 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E7DFD4] flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Left: View Mode Segmented Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center p-0.5 rounded-xl bg-[#EAE3D6] border border-[#D9CEBF]">
            {[
              { mode: 'descendant', label: 'Hậu duệ' },
              { mode: 'ancestor', label: 'Tổ tiên' },
              { mode: 'full', label: 'Toàn cảnh' },
            ].map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  setViewMode(item.mode as TreeViewMode);
                  updatePreferences({ defaultTreeView: item.mode as TreeViewMode });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === item.mode
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#5C4F42] hover:text-[#1B3B2B]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Overflow Modes Dropdown */}
            <div className="relative" ref={viewMenuRef}>
              <button
                type="button"
                onClick={() => setViewModeMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'individual' || viewMode === 'generation'
                    ? 'bg-[#1B3B2B] text-white shadow-xs font-semibold'
                    : 'text-[#5C4F42] hover:text-[#1B3B2B]'
                }`}
                title="Các góc nhìn phả đồ khác"
              >
                <span>
                  {viewMode === 'individual'
                    ? 'Tiêu điểm'
                    : viewMode === 'generation'
                    ? 'Đời thứ'
                    : 'Khác'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {viewModeMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-[#D5CABE] shadow-xl z-50 p-1 space-y-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('individual');
                      updatePreferences({ defaultTreeView: 'individual' });
                      setViewModeMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      viewMode === 'individual'
                        ? 'bg-[#1B3B2B] text-white font-semibold'
                        : 'text-[#3E342B] hover:bg-stone-100'
                    }`}
                  >
                    Tiêu điểm trực hệ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('generation');
                      updatePreferences({ defaultTreeView: 'generation' });
                      setViewModeMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      viewMode === 'generation'
                        ? 'bg-[#1B3B2B] text-white font-semibold'
                        : 'text-[#3E342B] hover:bg-stone-100'
                    }`}
                  >
                    Phân tầng đời thứ
                  </button>
                  <div className="h-px bg-stone-150 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setChartType('fan');
                      setViewModeMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[#8C6D32] hover:bg-[#F7F2E7] font-medium"
                  >
                    Biểu đồ Nan quạt →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Search, Branch Filter & Overflow Menu */}
        <div className="flex items-center gap-2">
          {/* Branch Filter dropdown */}
          {branches.length > 1 && (
            <div className="relative">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-xs rounded-xl border border-[#D5CABE] bg-white pl-6 pr-2.5 py-1.5 text-[#2C241C] font-medium outline-none focus:border-[#1B3B2B] cursor-pointer"
              >
                <option value="all">Tất cả chi</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Filter className="w-3 h-3 text-stone-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Search box with jump suggestions */}
          <div className="relative">
            <div className="flex items-center rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-stone-400 mr-1.5 shrink-0" />
              <input
                type="text"
                placeholder="Tìm thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-transparent outline-none w-28 sm:w-40 text-[#2C241C]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-stone-400 hover:text-stone-600 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute right-0 top-full mt-1.5 w-60 max-h-60 overflow-y-auto bg-white rounded-xl border border-[#D5CABE] shadow-xl z-50 p-1 space-y-0.5">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setFocusPersonId(p.id);
                      setInspectedPersonId(p.id);
                      setSearchQuery('');
                      const targetNode = layout.nodes.find((n) => n.id === p.id);
                      if (targetNode) centerOnNode(targetNode);
                    }}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-stone-50 cursor-pointer text-xs"
                  >
                    <HeritageAvatar fullName={p.fullName} portraitUrl={p.portraitUrl} gender={p.gender} size="xs" />
                    <div className="truncate">
                      <p className="font-semibold text-[#1F1913] truncate">{p.fullName}</p>
                      <p className="text-[10px] text-stone-500">
                        {p.generation ? `Đời thứ ${p.generation}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overflow Menu (...) for Secondary Tools */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setMoreMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-[#54483C] transition-colors"
              title="Công cụ bổ trợ"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {moreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-[#D5CABE] shadow-xl z-50 p-1.5 space-y-0.5 text-xs">
                {onOpenKinship && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenKinship();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 text-[#3E342B] transition-colors"
                  >
                    <Users className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    <span>Tra cứu xưng hô</span>
                  </button>
                )}
                {onOpenBook && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenBook();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 text-[#8C6D32] transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8C6D32]" />
                    <span>Xuất sách / In phả đồ</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleExportSvg();
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 text-[#3E342B] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span>Tải ảnh vector SVG</span>
                </button>
                <div className="h-px bg-stone-150 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowShortcutsHint((prev) => !prev);
                    setMoreMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-50 text-stone-600 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                  <span>Phím tắt điều hướng</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative flex-1 overflow-hidden bg-[#FAF7F2]/40 select-none">
        {/* Sleek Lineage Breadcrumb Trail (FamilySearch style, integrated at top-left) */}
        {lineagePath.length > 1 && (
          <div className="absolute top-2.5 left-3 z-10 max-w-lg bg-white/90 backdrop-blur-md border border-[#E7DFD4] rounded-lg px-2.5 py-1 shadow-xs flex items-center gap-1.5 text-xs overflow-x-auto">
            <span className="text-[10px] font-bold text-[#8C6D32] uppercase tracking-wider shrink-0">
              Phả hệ:
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {lineagePath.map((ancestor, idx) => {
                const isCurrent = ancestor.id === inspectedPersonId;
                return (
                  <React.Fragment key={ancestor.id}>
                    {idx > 0 && <span className="text-stone-300">·</span>}
                    <button
                      type="button"
                      onClick={() => {
                        setInspectedPersonId(ancestor.id);
                        const targetNode = layout.nodes.find((n) => n.id === ancestor.id);
                        if (targetNode) centerOnNode(targetNode);
                      }}
                      className={`text-[11px] px-1 py-0.5 rounded transition-colors ${
                        isCurrent
                          ? 'font-bold text-[#1B3B2B] bg-[#EAF2ED]'
                          : 'text-stone-600 hover:text-[#1B3B2B]'
                      }`}
                      title={`Đời ${ancestor.generation || '—'}: ${ancestor.fullName}`}
                    >
                      {ancestor.fullName}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          style={{ touchAction: 'none' }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onClick={() => {
            // Clicking empty canvas keeps inspection or can close if user desires
          }}
        >
          <g ref={gRef}>
            {/* Generation Guidelines / Horizontal Watermark Bands */}
            {generationBands.map((band) => (
              <g key={band.generation} className="select-none pointer-events-none opacity-45">
                <line
                  x1={layout.bounds.minX - 400}
                  y1={band.y - 24}
                  x2={layout.bounds.maxX + 400}
                  y2={band.y - 24}
                  stroke="#D5CABE"
                  strokeDasharray="6 6"
                  strokeWidth={1}
                />
                <rect
                  x={layout.bounds.minX - 220}
                  y={band.y - 36}
                  width={130}
                  height={22}
                  rx={11}
                  fill="#F5EFE6"
                  stroke="#DDD4C7"
                  strokeWidth={0.8}
                />
                <text
                  x={layout.bounds.minX - 155}
                  y={band.y - 21}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="700"
                  letterSpacing="0.05em"
                  fill="#8C6D32"
                >
                  ĐỜI THỨ {band.generation}
                </text>
              </g>
            ))}

            {/* Tree Links */}
            {layout.links.map((link) => (
              <path
                key={link.id}
                d={generateCurvedLinkPath(link)}
                fill="none"
                stroke={link.lineageType === 'adoptive' ? '#A27B38' : '#8A7E72'}
                strokeWidth={1.8}
                strokeDasharray={link.lineageType === 'adoptive' ? '4,4' : undefined}
                className="transition-colors"
              />
            ))}

            {/* Tree Nodes */}
            {layout.nodes.map((node) => {
              const p = node.person;
              const isSelected = inspectedPersonId === node.id;
              const isFocused = node.isFocused;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInspectedPersonId(node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile(node.id);
                  }}
                >
                  {/* Selected Outer Halo */}
                  {isSelected && (
                    <rect
                      x={-5}
                      y={-5}
                      width={node.width + 10}
                      height={node.height + 10}
                      rx={20}
                      ry={20}
                      fill="none"
                      stroke="#1B3B2B"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      opacity={0.7}
                    />
                  )}

                  {/* Node Background Card */}
                  <rect
                    width={node.width}
                    height={node.height}
                    rx={14}
                    ry={14}
                    fill={isSelected || isFocused ? '#FFFDF8' : '#FFFFFF'}
                    stroke={
                      isSelected || isFocused
                        ? '#1B3B2B'
                        : p.gender === 'male'
                        ? '#2D5A43'
                        : p.gender === 'female'
                        ? '#B75338'
                        : '#D5CABE'
                    }
                    strokeWidth={isSelected || isFocused ? 2.5 : 1.2}
                    className="filter drop-shadow-xs group-hover:drop-shadow-md transition-all"
                  />

                  {/* HTML in foreignObject for rich content */}
                  <foreignObject x={10} y={8} width={node.width - 20} height={node.height - 16}>
                    <div className="h-full flex items-center gap-2.5 p-0.5">
                      <HeritageAvatar
                        fullName={p.fullName}
                        portraitUrl={p.portraitUrl}
                        gender={p.gender}
                        size="sm"
                        isLiving={p.isLiving}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Generation & clan role or branch name */}
                        <div className="flex items-center gap-1 mb-0.5 text-[10px] text-[#8C6D32] font-semibold">
                          {p.generation && (
                            <span className="text-[#1B3B2B] font-bold">
                              Đời {p.generation}
                            </span>
                          )}
                          {(p.clanRole || node.branchName) && (
                            <>
                              <span aria-hidden="true" className="text-stone-300">·</span>
                              <span className="truncate max-w-[90px]">
                                {p.clanRole || node.branchName}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Full Name */}
                        <h4 className="text-xs font-serif font-bold text-[#1F1913] truncate group-hover:text-[#1B3B2B] transition-colors leading-tight">
                          {p.fullName}
                        </h4>

                        {/* Lifespan */}
                        <p className="text-[10px] text-[#695E52] truncate mt-0.5">
                          {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                        </p>

                        {/* Spouses Indicator - Crucial for genealogical completeness */}
                        {node.spouses && node.spouses.length > 0 && (
                          <p className="text-[9px] text-[#8C3A27] truncate flex items-center gap-1 font-medium mt-0.5">
                            <span className="text-rose-500">♥</span>
                            <span className="truncate">
                              {node.spouses[0].fullName}
                              {node.spouses.length > 1 ? ` (+${node.spouses.length - 1})` : ''}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </foreignObject>

                  {/* Collapse / Expand Button */}
                  {node.hasChildren && viewMode !== 'ancestor' && viewMode !== 'generation' && (
                    <g
                      transform={`translate(${node.width / 2}, ${node.height + 10})`}
                      onClick={(e) => toggleCollapse(node.id, e as unknown as React.MouseEvent)}
                    >
                      {node.isCollapsed ? (
                        <>
                          <rect
                            x={-18}
                            y={-10}
                            width={36}
                            height={20}
                            rx={10}
                            fill="#FAF7F2"
                            stroke="#1B3B2B"
                            strokeWidth={1.5}
                            className="hover:fill-[#1B3B2B] group/btn transition-colors"
                          />
                          <text
                            textAnchor="middle"
                            dy={3.5}
                            fontSize={9}
                            fontWeight="bold"
                            fill="#1B3B2B"
                            className="pointer-events-none group-hover/btn:fill-white font-sans"
                          >
                            +{node.childIds.length}
                          </text>
                        </>
                      ) : (
                        <>
                          <circle
                            r={9}
                            fill="#FAF7F2"
                            stroke="#8A7E72"
                            strokeWidth={1.5}
                            className="hover:fill-[#1B3B2B] hover:stroke-[#1B3B2B] group/btn transition-colors"
                          />
                          <text
                            textAnchor="middle"
                            dy={3.5}
                            fontSize={10}
                            fontWeight="bold"
                            fill="#54483C"
                            className="pointer-events-none group-hover/btn:fill-white font-sans"
                          >
                            −
                          </text>
                        </>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Side Inspector Drawer (Desktop: Floating Panel, Mobile: Bottom Sheet) */}
        {inspectedPerson && (
          <>
            {/* Desktop Panel */}
            <div className="hidden lg:flex flex-col absolute top-2.5 right-2.5 bottom-2.5 w-80 bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border border-[#D5CABE] shadow-xl z-30 overflow-hidden animate-in slide-in-from-right-4 duration-200">
              {/* Header */}
              <div className="px-3.5 py-3 bg-[#FAF7F2] border-b border-[#E7DFD4] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C6D32]">
                  Hồ sơ nhanh thành viên
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const targetNode = layout.nodes.find((n) => n.id === inspectedPerson.id);
                      if (targetNode) centerOnNode(targetNode);
                    }}
                    className="p-1 text-stone-500 hover:text-[#1B3B2B] rounded-lg transition-colors"
                    title="Căn giữa vào người này"
                  >
                    <Focus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedPersonId(null)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
                    title="Đóng bảng tin"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Person Hero */}
                <div className="flex items-start gap-3">
                  <HeritageAvatar
                    fullName={inspectedPerson.fullName}
                    portraitUrl={inspectedPerson.portraitUrl}
                    gender={inspectedPerson.gender}
                    size="md"
                    isLiving={inspectedPerson.isLiving}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#8C6D32] font-semibold mb-0.5">
                      {inspectedPerson.generation && (
                        <span className="text-[#1B3B2B] font-bold">
                          Đời thứ {inspectedPerson.generation}
                        </span>
                      )}
                      {inspectedBranch && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="truncate">{inspectedBranch.name}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-base text-[#1F1913] leading-snug truncate">
                      {inspectedPerson.fullName}
                    </h3>
                    <p className="text-[11px] text-[#695E52] mt-0.5">
                      {formatLifespan(
                        inspectedPerson.birthDate,
                        inspectedPerson.deathDate,
                        inspectedPerson.isLiving
                      )}
                    </p>
                    {inspectedPerson.clanRole && (
                      <p className="text-[11px] text-[#8C6D32] font-medium mt-0.5">
                        {inspectedPerson.clanRole}
                      </p>
                    )}
                  </div>
                </div>

                {/* Traditional names */}
                {(inspectedPerson.commonName || inspectedPerson.tabooName) && (
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7DFD4] space-y-1 text-[11px] text-[#54483C]">
                    {inspectedPerson.commonName && (
                      <p>
                        Tên thường gọi: <strong className="text-[#1F1913]">{inspectedPerson.commonName}</strong>
                      </p>
                    )}
                    {inspectedPerson.tabooName && (
                      <p>
                        Tên húy: <strong className="text-[#8C3A27]">{inspectedPerson.tabooName}</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* Lunar Anniversary */}
                {!inspectedPerson.isLiving && inspectedPerson.deathAnniversaryLunar && (
                  <div className="p-2.5 rounded-xl bg-[#FAF5EB] border border-[#E8DDCD] space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8C6D32]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Ngày giỗ Âm lịch hàng năm:</span>
                    </div>
                    <p className="text-xs font-serif font-bold text-[#3A2E25]">
                      {formatLunarAnniversary(inspectedPerson.deathAnniversaryLunar)}
                    </p>
                  </div>
                )}

                {/* Spouses */}
                <div>
                  <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    <span>Hôn phối ({inspectedSpouses.length})</span>
                  </h4>
                  {inspectedSpouses.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic">Chưa ghi nhận bạn đời.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {inspectedSpouses.map(({ union, spouse }) => (
                        <div
                          key={union.id}
                          onClick={() => {
                            if (spouse) {
                              setInspectedPersonId(spouse.id);
                              const target = layout.nodes.find((n) => n.id === spouse.id);
                              if (target) centerOnNode(target);
                            }
                          }}
                          className="flex items-center justify-between p-2 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <HeritageAvatar
                              fullName={spouse?.fullName || 'Chưa rõ'}
                              portraitUrl={spouse?.portraitUrl}
                              gender={spouse?.gender}
                              size="xs"
                            />
                            <div className="truncate">
                              <p className="font-semibold text-[#1F1913] truncate">
                                {spouse?.fullName || 'Chưa rõ danh tính'}
                              </p>
                              <p className="text-[10px] text-stone-400">
                                {union.marriageOrder === 1
                                  ? 'Chính thất'
                                  : union.marriageOrder === 2
                                  ? 'Kế thất'
                                  : `Lần ${union.marriageOrder || 1}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parents */}
                <div>
                  <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Thân sinh (Cha Mẹ)
                  </h4>
                  {inspectedParents.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic">Chưa ghi nhận cha mẹ.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5">
                      {inspectedParents.map(({ parent }) => (
                        <div
                          key={parent.id}
                          onClick={() => {
                            setInspectedPersonId(parent.id);
                            const target = layout.nodes.find((n) => n.id === parent.id);
                            if (target) centerOnNode(target);
                          }}
                          className="flex items-center gap-1.5 p-1.5 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors"
                        >
                          <HeritageAvatar
                            fullName={parent.fullName}
                            portraitUrl={parent.portraitUrl}
                            gender={parent.gender}
                            size="xs"
                          />
                          <div className="truncate">
                            <p className="font-semibold text-[#1F1913] truncate">{parent.fullName}</p>
                            <p className="text-[10px] text-stone-400">
                              {parent.gender === 'male' ? 'Cha' : 'Mẹ'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Children */}
                <div>
                  <h4 className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Hậu duệ trực hệ ({inspectedChildren.length})
                  </h4>
                  {inspectedChildren.length === 0 ? (
                    <p className="text-[11px] text-stone-400 italic">Chưa ghi nhận con cái.</p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {inspectedChildren.map(({ child }) => (
                        <div
                          key={child.id}
                          onClick={() => {
                            setInspectedPersonId(child.id);
                            const target = layout.nodes.find((n) => n.id === child.id);
                            if (target) centerOnNode(target);
                          }}
                          className="flex items-center justify-between p-1.5 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors text-[11px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <HeritageAvatar
                              fullName={child.fullName}
                              portraitUrl={child.portraitUrl}
                              gender={child.gender}
                              size="xs"
                            />
                            <span className="font-semibold text-[#1F1913] truncate">
                              {child.fullName}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400 shrink-0">
                            {child.gender === 'male' ? 'Trai' : 'Gái'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-[#FAF7F2] border-t border-[#E7DFD4] space-y-2">
                <button
                  type="button"
                  onClick={() => onOpenProfile(inspectedPerson.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem hồ sơ đầy đủ & Tiểu sử</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  {onEditPerson && (
                    <button
                      type="button"
                      onClick={() => onEditPerson(inspectedPerson)}
                      className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-[11px] font-semibold text-[#1B3B2B] transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa hồ sơ</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setRelEditorOpen(true)}
                    className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-[11px] font-semibold text-[#8C6D32] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Quan hệ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusPersonId(inspectedPerson.id)}
                    className="py-1.5 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-[11px] font-semibold text-[#4A3F35] text-center cursor-pointer"
                    title="Đặt người này làm tâm điểm mở rộng nhánh"
                  >
                    Tâm điểm cây
                  </button>
                  {onOpenKinship && (
                    <button
                      type="button"
                      onClick={onOpenKinship}
                      className="py-1.5 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-[11px] font-semibold text-[#1B3B2B] text-center cursor-pointer"
                    >
                      Tra xưng hô
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Bottom Sheet */}
            <div className="lg:hidden absolute bottom-0 left-0 right-0 max-h-[55vh] bg-[#FFFDF9] rounded-t-3xl border-t border-[#D5CABE] shadow-2xl z-30 overflow-y-auto animate-in slide-in-from-bottom-4 duration-200 p-4 space-y-3">
              <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto -mt-1 mb-2" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 truncate">
                  <HeritageAvatar
                    fullName={inspectedPerson.fullName}
                    portraitUrl={inspectedPerson.portraitUrl}
                    gender={inspectedPerson.gender}
                    size="sm"
                    isLiving={inspectedPerson.isLiving}
                  />
                  <div className="truncate">
                    <h3 className="font-serif font-bold text-sm text-[#1F1913] truncate">
                      {inspectedPerson.fullName}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      {formatLifespan(
                        inspectedPerson.birthDate,
                        inspectedPerson.deathDate,
                        inspectedPerson.isLiving
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(inspectedPerson.id)}
                    className="px-3 py-1.5 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold"
                  >
                    Hồ sơ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectedPersonId(null)}
                    className="p-1.5 text-stone-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-100">
                {onEditPerson && (
                  <button
                    type="button"
                    onClick={() => onEditPerson(inspectedPerson)}
                    className="py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[11px] font-semibold text-[#1B3B2B]"
                  >
                    Sửa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRelEditorOpen(true)}
                  className="py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[11px] font-semibold text-[#8C6D32]"
                >
                  Quan hệ
                </button>
                <button
                  type="button"
                  onClick={() => setFocusPersonId(inspectedPerson.id)}
                  className="py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[11px] font-semibold text-[#4A3F35]"
                >
                  Tâm điểm
                </button>
              </div>
            </div>
          </>
        )}

        {/* Sleek Floating Canvas Controls (Horizontal Glass Dock at bottom-left to avoid drawer collision) */}
        <div className="absolute bottom-3.5 left-3.5 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-[#D5CABE] shadow-md select-none text-xs">
          <button
            type="button"
            onClick={zoomIn}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-[#3E342B] transition-colors"
            title="Phóng to (Phím +)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={fitToScreen}
            className="text-[11px] font-mono font-semibold text-stone-600 hover:text-[#1B3B2B] px-1.5 py-0.5 rounded transition-colors"
            title="Tỷ lệ hiện tại (Bấm để vừa màn hình)"
          >
            {Math.round(zoomScale * 100)}%
          </button>

          <button
            type="button"
            onClick={zoomOut}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-[#3E342B] transition-colors"
            title="Thu nhỏ (Phím -)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-stone-300 mx-0.5" />

          <button
            type="button"
            onClick={fitToScreen}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-[#3E342B] transition-colors"
            title="Căn vừa màn hình (Phím 0)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={resetToRoot}
            className="p-1.5 rounded-lg hover:bg-stone-100 text-[#3E342B] transition-colors"
            title="Về cội nguồn / Thủy tổ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty tree state */}
        {layout.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <Users className="w-10 h-10 text-stone-400 mx-auto" />
              <h3 className="text-base font-serif font-bold text-[#2C241C]">
                Chưa có dữ liệu cây cho bộ lọc này
              </h3>
              <p className="text-xs text-stone-500">
                Hãy chọn chế độ xem khác hoặc thêm thành viên mới vào gia phả.
              </p>
              <button
                type="button"
                onClick={onAddPerson}
                className="px-4 py-2 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold"
              >
                + Thêm thành viên
              </button>
            </div>
          </div>
        )}
      </div>

      {inspectedPerson && (
        <RelationshipEditorModal
          person={inspectedPerson}
          open={relEditorOpen}
          onClose={() => setRelEditorOpen(false)}
        />
      )}
    </div>
  );
};
