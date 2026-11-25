import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  History,
  Info,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import { NavigationTab, Person } from '../../models/genealogy';
import {
  calculateFamilyLegacyScore,
  ScorePillar,
} from './legacyScoreUtils';

interface FamilyLegacyScoreProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
}

export const FamilyLegacyScore: React.FC<FamilyLegacyScoreProps> = ({
  onNavigate,
  onSelectPerson,
}) => {
  const { people, media, stories, lifeEvents, relationships, unions, branches } = useGenealogy();

  const [expandedPillarId, setExpandedPillarId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const scoreResult = useMemo(() => {
    return calculateFamilyLegacyScore({
      people,
      media,
      stories,
      lifeEvents,
      relationships,
      unions,
      branches,
    });
  }, [people, media, stories, lifeEvents, relationships, unions, branches]);

  const { overallScore, tierName, tierBadge, tierColor, tierDescription, pillars, recommendations } =
    scoreResult;

  // Circular gauge math (radius 48, perimeter ~ 301.6)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const togglePillar = (id: string) => {
    setExpandedPillarId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-3xl bg-linear-to-br from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DDCD] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C19B4C]" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              Chỉ Số Bảo Tồn Di Sản Gia Tộc (Family Legacy Score)
            </h3>
          </div>
          <p className="text-xs text-[#6E5F50] mt-0.5">
            Đánh giá mức độ vẹn toàn của gia phả dựa trên tiểu sử, hình ảnh kỷ vật và cột mốc lịch sử
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-xs font-semibold text-[#54473B] hover:bg-stone-50 transition-colors self-start sm:self-auto"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#C19B4C]" />
          <span>{showExplanation ? 'Đóng giải thích' : 'Cách tính điểm'}</span>
        </button>
      </div>

      {/* Explanation drawer if toggled */}
      {showExplanation && (
        <div className="p-4 rounded-2xl bg-white border border-[#E2D7C8] space-y-2 text-xs text-[#524436] animate-in fade-in">
          <h4 className="font-serif font-bold text-sm text-[#1B3B2B] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#C19B4C]" />
            <span>Phương pháp tính Chỉ số Di sản Gia tộc:</span>
          </h4>
          <p className="leading-relaxed">
            Chỉ số (thang điểm 100) được tổng hợp khoa học từ 4 trụ cột bảo tồn cốt lõi theo tiêu
            chuẩn phả học:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD4]">
              <strong className="text-[#1B3B2B]">1. Tiểu sử & Nhân thân (35%):</strong> Tỷ lệ thành
              viên có đầy đủ ngày sinh/mất, quê quán, tên chữ (tên húy/tên tự) và văn bản tiểu sử ký
              sự.
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD4]">
              <strong className="text-[#1B3B2B]">2. Kho ảnh & Kỷ vật di sản (25%):</strong> Tỷ lệ
              chân dung các thế hệ và số lượng văn bản, sắc phong, thư từ lưu giữ.
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD4]">
              <strong className="text-[#1B3B2B]">3. Cột mốc & Ký ức truyền đời (25%):</strong> Các sự
              kiện di cư, công đức, đại trùng tu và những câu chuyện truyền khẩu.
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DFD4]">
              <strong className="text-[#1B3B2B]">4. Mạng lưới gia tộc (15%):</strong> Mối liên kết
              cha mẹ - con cái, phân nhánh các chi họ trên cây phả hệ.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Gauge, Right Pillars & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Circular Heritage Gauge (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-[#E8DFD4] shadow-xs text-center space-y-4">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Ring Gauge */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
              {/* Background track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="stroke-[#EDE4D6]"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Progress stroke with heritage gradient */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="url(#legacyGaugeGradient)"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="legacyGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C19B4C" />
                  <stop offset="60%" stopColor="#2D6A4F" />
                  <stop offset="100%" stopColor="#1B3B2B" />
                </linearGradient>
              </defs>
            </svg>

            {/* Central Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-[#1F1913] tracking-tight">
                {overallScore}
              </span>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                / 100 điểm
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: tierColor }}
            >
              {tierName}
            </span>
            <p className="text-[11px] text-[#78695A] font-medium pt-1 max-w-xs leading-relaxed">
              {tierDescription}
            </p>
          </div>
        </div>

        {/* Right Column: 4 Pillars Breakdown (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="space-y-3">
            {pillars.map((pillar) => {
              const isExpanded = expandedPillarId === pillar.id;
              const pillarIcon =
                pillar.id === 'biography' ? (
                  <FileText className="w-4 h-4 text-[#C19B4C]" />
                ) : pillar.id === 'media' ? (
                  <Camera className="w-4 h-4 text-[#286248]" />
                ) : pillar.id === 'milestones' ? (
                  <History className="w-4 h-4 text-[#8C3A27]" />
                ) : (
                  <Users className="w-4 h-4 text-[#1B3B2B]" />
                );

              return (
                <div
                  key={pillar.id}
                  className="rounded-2xl bg-white border border-[#E7DFD4] p-3.5 sm:p-4 transition-all hover:border-[#D5CABE]"
                >
                  <div
                    onClick={() => togglePillar(pillar.id)}
                    className="flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DDCD]">
                        {pillarIcon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-serif font-bold text-[#1F1913] truncate">
                            {pillar.name}
                          </h4>
                          <span className="text-[10px] text-stone-400">
                            ({Math.round(pillar.weight * 100)}% trọng số)
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate hidden sm:block">
                          {pillar.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-serif font-bold text-[#1F1913]">
                          {pillar.score}%
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          +{pillar.weightedScore}đ
                        </span>
                      </div>
                      <div className="text-stone-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-[#EDE5D8] overflow-hidden mt-2.5">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${pillar.score}%`,
                        backgroundColor:
                          pillar.score >= 80 ? '#1B3B2B' : pillar.score >= 50 ? '#C19B4C' : '#8A5A2B',
                      }}
                    />
                  </div>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5 text-xs text-[#5C4F42] animate-in fade-in">
                      {pillar.details.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actionable Recommendations (Gợi ý bồi đắp di sản) */}
      {recommendations.length > 0 && (
        <div className="pt-2 border-t border-[#E8DDCD] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-serif font-bold text-[#1B3B2B] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#C19B4C]" />
              <span>Gợi ý nâng tầm di sản gia tộc (+ Điểm số)</span>
            </h4>
            <span className="text-[11px] text-stone-400">Các hành động ưu tiên cao</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E7DFD4] flex flex-col justify-between space-y-2 hover:border-[#1B3B2B]/40 transition-colors shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      +{rec.impactPoints} điểm
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {rec.category === 'biography' ? 'Tiểu sử' : rec.category === 'media' ? 'Hình ảnh' : 'Sự kiện'}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-[#1F1913] leading-snug">{rec.title}</h5>
                  <p className="text-[11px] text-[#695A4B] leading-relaxed line-clamp-2">
                    {rec.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (rec.targetPersonId) {
                      onSelectPerson(rec.targetPersonId);
                    } else if (rec.actionTab) {
                      onNavigate(rec.actionTab);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EAF2ED] text-[#1B3B2B] text-xs font-semibold border border-[#E7DFD4] transition-colors mt-1"
                >
                  <span>Thực hiện ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
