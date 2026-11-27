import React, { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Compass,
  GitFork,
  HelpCircle,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import { NavigationTab } from '../models/genealogy';
import { useModalAccessibility } from '../hooks/useModalAccessibility';
import { GEMINI_DISABLED_MESSAGE } from '../services/aiBiographyAvailability';
import { canGenerateBiographyInBrowser } from '../services/aiBiographyService';

export const ONBOARDING_STORAGE_KEY = 'gia_pha_onboarding_completed_v1';

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCompletedOnboarding(completed = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, completed ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onOpenAddPerson: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  open,
  onClose,
  onNavigateTab,
  onOpenAddPerson,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        handleNext();
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      if (TOUR_STEPS[next].tabTarget) {
        onNavigateTab(TOUR_STEPS[next].tabTarget!);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      if (TOUR_STEPS[prev].tabTarget) {
        onNavigateTab(TOUR_STEPS[prev].tabTarget!);
      }
    }
  };

  const handleComplete = () => {
    setCompletedOnboarding(true);
    onClose();
  };

  const handleDismiss = () => {
    setCompletedOnboarding(true);
    onClose();
  };

  const { requestClose } = useModalAccessibility({
    open,
    dialogRef,
    initialFocusRef: closeButtonRef,
    onRequestClose: handleDismiss,
  });

  if (!open) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        tabIndex={-1}
        className="mobile-safe-dialog relative w-full sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl bg-[#FFFDF9] border-2 border-[#D5C7B4] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Top Heritage Accent Bar */}
        <div className="h-2 shrink-0 bg-linear-to-r from-[#1B3B2B] via-[#C19B4C] to-[#8C3A27]" />

        {/* Header with Step Counter & Close */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2 border-b border-[#E8DDCD]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1B3B2B] text-white">
              Bước {currentStep + 1} / {TOUR_STEPS.length}
            </span>
            <span className="text-xs font-semibold text-[#8C6D32] hidden sm:inline">
              {step.category}
            </span>
          </div>

          <button
            type="button"
            ref={closeButtonRef}
            onClick={() => requestClose('button')}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-xl text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Đóng hướng dẫn (Esc)"
            aria-label="Đóng hướng dẫn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Step Visual Art & Graphic */}
        <div className="px-5 pt-4">
          <div className="rounded-2xl bg-linear-to-br from-[#FAF5EC] to-[#F1E7D4] dark:from-[#1F2E25] dark:to-[#17241C] border border-[#E2D5C1] dark:border-[#3B4D40] p-4 flex items-center justify-center relative overflow-hidden min-h-36 sm:min-h-40">
            {/* Background watermark */}
            <div className="absolute right-3 -bottom-6 text-7xl font-serif text-[#1B3B2B]/5 select-none pointer-events-none">
              {step.watermark}
            </div>

            <div className="flex flex-col items-center text-center space-y-2 z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center shadow-md border border-[#2F523E]">
                <StepIcon className="w-6 h-6" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#1F1913] max-w-sm">
                {step.graphicTitle}
              </h4>
              <p className="text-xs text-[#6A5A4A] dark:text-[#B9AEA0] max-w-md">
                {step.graphicCaption}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <h3 id={`${id}-title`} className="text-lg sm:text-xl font-serif font-bold text-[#1B3B2B] tracking-tight">
              {step.title}
            </h3>
            <p id={`${id}-description`} className="text-xs sm:text-sm text-[#4E4134] dark:text-[#EDE6DC] leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Key Feature Highlights */}
          <div className="space-y-2 pt-1">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Tính năng nổi bật:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {step.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFD4] dark:border-[#3B4D40] text-[#33281E] dark:text-[#EDE6DC]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{highlight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Button for this step (if applicable) */}
          {step.actionType && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (step.actionType === 'add_person') {
                    onClose();
                    onOpenAddPerson();
                  } else if (step.actionType === 'navigate' && step.tabTarget) {
                    onNavigateTab(step.tabTarget);
                  }
                }}
                className="w-full min-h-11 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#EAF2ED] hover:bg-[#D7E6DD] dark:bg-[#1F2E25] dark:hover:bg-[#24352B] text-[#1B3B2B] font-semibold text-xs border border-[#C6DDD0] dark:border-[#3B4D40] transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C19B4C]" />
                <span>{step.actionLabel}</span>
              </button>
            </div>
          )}
        </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-[#FAF7F2] border-t border-[#E8DDCD]">
          {/* Step dots */}
          <div className="flex items-center">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentStep(idx);
                  if (TOUR_STEPS[idx].tabTarget) onNavigateTab(TOUR_STEPS[idx].tabTarget!);
                }}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-xl hover:bg-stone-100"
                title={`Chuyển tới bước ${idx + 1}`}
                aria-label={`Chuyển tới bước ${idx + 1}`}
                aria-current={idx === currentStep ? 'step' : undefined}
              >
                <span className={`h-2 rounded-full transition-all ${idx === currentStep ? 'w-6 bg-[#1B3B2B]' : 'w-2 bg-[#D5CABE]'}`} />
              </button>
            ))}
          </div>

          {/* Controls Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="min-h-11 flex items-center gap-1 px-3 py-2 rounded-xl border border-[#D5CABE] bg-white text-xs font-semibold text-[#54483C] hover:bg-stone-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <span>{currentStep === TOUR_STEPS.length - 1 ? 'Hoàn tất khám phá' : 'Tiếp tục'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TourStepDefinition {
  id: string;
  category: string;
  tabTarget?: NavigationTab;
  title: string;
  graphicTitle: string;
  graphicCaption: string;
  watermark: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  highlights: string[];
  actionType?: 'add_person' | 'navigate';
  actionLabel?: string;
}

export const TOUR_STEPS: TourStepDefinition[] = [
  {
    id: 'welcome',
    category: 'Tổng quan & Khởi tạo',
    tabTarget: 'dashboard',
    watermark: '源',
    icon: Compass,
    graphicTitle: 'Gia Phả Việt – Cội Nguồn Dòng Tộc',
    graphicCaption:
      'Lưu giữ cây phả hệ, niên biểu gia tộc và truyền thống ngàn đời trên chính thiết bị của bạn.',
    title: '1. Khởi Dựng & Bảo Tồn Di Sản Gia Tộc',
    description:
      'Chào mừng quý vị đến với ứng dụng Gia Phả Việt. Toàn bộ hồ sơ phả hệ, hình ảnh và tư liệu lịch sử được lưu trữ bảo mật cục bộ ngay trên trình duyệt (IndexedDB) của bạn, cho phép sử dụng mượt mà không cần kết nối mạng Internet.',
    highlights: [
      'Chỉ số Bảo tồn Di sản (Family Legacy Score) đánh giá độ trọn vẹn gia phả',
      'Phân bố tuổi thọ & trường thọ các thế hệ qua biểu đồ D3.js trực quan',
      'Lịch sử dòng họ & niên biểu những sự kiện trọng đại, di cư, trùng tu',
      'Hoạt động ngoại tuyến (Offline PWA) trên điện thoại và máy tính',
    ],
    actionType: 'navigate',
    actionLabel: 'Xem Dashboard & Chỉ số di sản',
  },
  {
    id: 'family_tree',
    category: 'Cây gia phả',
    tabTarget: 'tree',
    watermark: '宗',
    icon: GitFork,
    graphicTitle: 'Phả Đồ Trực Quan Bằng D3.js',
    graphicCaption:
      'Khám phá mối liên kết huyết thống qua nhiều thế hệ với khả năng phóng to, thu nhỏ và tìm kiếm tức thì.',
    title: '2. Khám Phá Cây Gia Phả Tương Tác',
    description:
      'Giao diện cây gia phả thông minh giúp bạn hình dung toàn cảnh từ Thủy tổ đến các chi phái hậu duệ. Bạn có thể tự do thu phóng, xoay chuyển tâm điểm và tra cứu từng nhánh gia tộc.',
    highlights: [
      '3 Chế độ xem phả đồ: Hậu duệ (Descendant), Tiền nhân (Ancestor) và Cốt lõi',
      'Phân biệt chi phái chính xác (Chi Trưởng, Chi Thứ, Phái Đông, Phái Đoài...)',
      'Thu phóng mượt mà, định vị nhanh bất kỳ thành viên nào',
      'Xuất bản đồ phả hệ độ phân giải cao sang định dạng SVG hoặc ảnh',
    ],
    actionType: 'navigate',
    actionLabel: 'Mở trang Cây phả hệ ngay',
  },
  {
    id: 'add_member',
    category: 'Thành viên & Tiểu sử',
    tabTarget: 'members',
    watermark: '人',
    icon: Plus,
    graphicTitle: 'Quản Lý Nhân Thân & Tiểu Sử',
    graphicCaption:
      'Ghi chép danh xưng truyền thống, ngày sinh âm dương và tiểu sử. Nghe đọc bằng giọng có sẵn trên thiết bị.',
    title: '3. Thêm Thành Viên & Ghi Chép Tiểu Sử',
    description:
      'Hồ sơ mỗi thành viên được thiết kế theo đúng phong tục Việt Nam: ghi nhận tên thường gọi, tên húy, tên tự, vai vế trong họ tộc, nơi an táng và công đức đóng góp.',
    highlights: [
      canGenerateBiographyInBrowser()
        ? 'Soạn tiểu sử tự động bằng AI (Google Gemini) dựa trên mốc ngày tháng đã nhập'
        : GEMINI_DISABLED_MESSAGE,
      'Nghe đọc tiểu sử nếu thiết bị có giọng đọc cục bộ',
      'Tra cứu cách xưng hô chuẩn mực giữa hai người bất kỳ theo vai vế dòng họ',
      'Bộ lọc tìm kiếm toàn diện theo họ tên, năm sinh, nơi sinh sống và chi tộc',
    ],
    actionType: 'add_person',
    actionLabel: 'Thử thêm thành viên mới ngay',
  },
  {
    id: 'rites_assistant',
    category: 'Lễ kỵ & Văn khấn',
    tabTarget: 'rites',
    watermark: '禮',
    icon: Calendar,
    graphicTitle: 'Trợ Lý Nghi Lễ & Giỗ Tổ Âm Lịch',
    graphicCaption:
      'Tự động chuyển đổi ngày âm lịch, nhắc nhở thông báo trình duyệt và chuẩn bị bài văn khấn gia tiên.',
    title: '4. Trợ Lý Nghi Lễ & Lễ Kỵ Hàng Năm',
    description:
      'Không bao giờ bỏ lỡ ngày giỗ của tiền nhân nhờ hệ thống tự động tính toán lịch âm và gửi thông báo nhắc nhở trước ngày kỵ.',
    highlights: [
      'Tự động đối soát ngày âm lịch hàng năm cho các bậc tiền nhân',
      'Thông báo đẩy trình duyệt (Push Notifications) nhắc trước 0, 1, 3 hoặc 7 ngày',
      'Mẫu bài văn khấn cổ truyền tự điền tên tuổi, vai vế và danh xưng người quá cố',
      'Hướng dẫn sắp đặt mâm cỗ cúng gia tiên đúng thuần phong mỹ tục',
    ],
    actionType: 'navigate',
    actionLabel: 'Xem Trợ lý Nghi lễ & Lễ giỗ',
  },
  {
    id: 'data_sharing',
    category: 'Bảo mật & Chia sẻ',
    tabTarget: 'data',
    watermark: '傳',
    icon: QrCode,
    graphicTitle: 'Chia Sẻ Mã QR & Sao Lưu GEDCOM',
    graphicCaption:
      'Đồng bộ dữ liệu ngoại tuyến giữa điện thoại của các thành viên gia đình an toàn tuyệt đối.',
    title: '5. Chia Sẻ Ngoại Tuyến & Bảo Tồn Vĩnh Cửu',
    description:
      'Dữ liệu gia phả là tài sản vô giá của gia đình. Gia Phả Việt hỗ trợ đầy đủ các tiêu chuẩn quốc tế và phương thức chia sẻ ngoại tuyến không cần qua máy chủ trung gian.',
    highlights: [
      'Chia sẻ hồ sơ tức thì qua mã QR giữa các thiết bị di động',
      'Nhập và xuất chuẩn quốc tế GEDCOM 5.5.1 tương thích mọi phần mềm phả hệ',
      'Xuất bản Sách gia phả toàn thư (Family Book) dàn trang sẵn sàng in ấn khổ A4',
      'Sao lưu toàn bộ dữ liệu dưới dạng tệp JSON mã hóa an toàn trên máy tính',
    ],
    actionType: 'navigate',
    actionLabel: 'Xem Trung tâm dữ liệu & Sao lưu',
  },
];
