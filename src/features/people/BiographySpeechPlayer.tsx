import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { useSpeechReader } from '../../hooks/useSpeechReader';
import { Person } from '../../models/genealogy';
import {
  preparePersonNarrationScript,
} from '../../services/speechSynthesisService';

interface BiographySpeechPlayerProps {
  person: Person;
  branchName?: string;
  onClose: () => void;
  autoPlay?: boolean;
}

export const BiographySpeechPlayer: React.FC<BiographySpeechPlayerProps> = ({
  person,
  branchName,
  onClose,
  autoPlay = false,
}) => {
  const [mode, setMode] = useState<'biography' | 'full_chronicle'>(
    person.biography?.trim() ? 'biography' : 'full_chronicle'
  );
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const {
    isSupported,
    status,
    currentSentenceIndex,
    voices,
    vietnameseVoices,
    selectedVoice,
    rate,
    play,
    pause,
    resume,
    stop,
    skipNext,
    skipPrevious,
    jumpToSentence,
    setRate,
    setVoice,
  } = useSpeechReader();

  // Prepare the script based on mode
  const narrationScript = useMemo(() => {
    return preparePersonNarrationScript(person, mode, branchName);
  }, [person, mode, branchName]);

  // If autoPlay requested and supported, start when mounted
  useEffect(() => {
    if (autoPlay && isSupported && narrationScript.sentences.length > 0) {
      play(narrationScript.sentences, 0);
    }
  }, [autoPlay, isSupported, mode, narrationScript.sentences, play]);

  // When mode changes while playing, stop or restart
  const handleModeChange = (newMode: 'biography' | 'full_chronicle') => {
    if (newMode === mode) return;
    setMode(newMode);
    const newScript = preparePersonNarrationScript(person, newMode, branchName);
    if (status === 'playing') {
      play(newScript.sentences, 0);
    } else {
      stop();
    }
  };

  const handlePlayToggle = () => {
    if (status === 'playing') {
      pause();
    } else if (status === 'paused') {
      resume();
    } else {
      play(narrationScript.sentences, currentSentenceIndex || 0);
    }
  };

  const handleRestart = () => {
    play(narrationScript.sentences, 0);
  };

  const totalSentences = narrationScript.sentences.length;
  const progressPercent =
    totalSentences > 0
      ? Math.round(((currentSentenceIndex + 1) / totalSentences) * 100)
      : 0;

  if (!isSupported) {
    return (
      <div className="rounded-2xl bg-[#FFF9F5] border border-[#EACBB8] p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[#8C3A27] font-semibold text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>Trình duyệt chưa hỗ trợ Web Speech API</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-[#5C4F42] leading-relaxed">
          Thiết bị hoặc trình duyệt hiện tại không hỗ trợ bộ phát âm Web Speech API. Quý vị vẫn có
          thể đọc trực tiếp toàn bộ phả ký và tiểu sử của <strong>{person.fullName}</strong> trên
          trang hồ sơ này.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] border-2 border-[#D5C7B4] p-4 sm:p-5 shadow-md space-y-4 transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E8DDCD] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#1B3B2B] text-white flex items-center justify-center shadow-xs">
            {status === 'playing' ? (
              <span className="flex items-end gap-0.5 h-3.5">
                <span className="w-1 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                <span className="w-1 bg-amber-300 rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
                <span className="w-1 bg-amber-300 rounded-full animate-bounce h-2" />
              </span>
            ) : (
              <Headphones className="w-4 h-4 text-amber-200" />
            )}
          </div>
          <div>
            <h4 className="text-sm font-serif font-bold text-[#1F1913] flex items-center gap-1.5">
              <span>Đọc truyền thanh tiểu sử & phả ký</span>
              {status === 'playing' && (
                <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                  Đang đọc
                </span>
              )}
              {status === 'paused' && (
                <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                  Tạm dừng
                </span>
              )}
            </h4>
            <p className="text-[11px] text-[#6E5F50]">
              {narrationScript.title} • {totalSentences} đoạn câu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-xl border text-xs transition-colors ${
              showSettings
                ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                : 'bg-white border-[#DCD3C7] text-stone-600 hover:bg-stone-50'
            }`}
            title="Cài đặt giọng đọc & tốc độ"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl border border-[#DCD3C7] bg-white text-stone-600 hover:bg-stone-50 text-xs transition-colors"
            title={isExpanded ? 'Thu gọn khung chữ' : 'Mở rộng khung chữ'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              stop();
              onClose();
            }}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Đóng chế độ đọc"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Pill Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF]">
          <button
            type="button"
            onClick={() => handleModeChange('biography')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'biography'
                ? 'bg-white text-[#1B3B2B] shadow-xs'
                : 'text-[#6A5A4A] hover:text-[#1F1913]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nguyên văn tiểu sử</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('full_chronicle')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              mode === 'full_chronicle'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-[#6A5A4A] hover:text-[#1F1913]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Toàn văn phả ký</span>
          </button>
        </div>

        {/* Speed Quick Selector */}
        <div className="flex items-center gap-1 text-[11px] text-[#6A5A4A]">
          <span className="hidden sm:inline font-medium">Tốc độ:</span>
          {[0.8, 1.0, 1.2].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRate(s)}
              className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                rate === s
                  ? 'bg-[#1B3B2B] text-white'
                  : 'bg-white/80 border border-[#DDD0BF] text-[#54473B] hover:bg-stone-100'
              }`}
            >
              {s === 0.8 ? '0.8x (Chậm)' : s === 1.0 ? '1.0x' : '1.2x (Nhanh)'}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="p-3.5 rounded-xl bg-white border border-[#E2D7C8] space-y-3 animate-in fade-in">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#3E342B] block">
              Giọng đọc hệ thống ({vietnameseVoices.length > 0 ? `${vietnameseVoices.length} giọng Tiếng Việt` : 'Dùng giọng thiết bị'}):
            </label>
            <select
              value={selectedVoice?.voiceURI || ''}
              onChange={(e) => {
                const found = voices.find((v) => v.voiceURI === e.target.value) || null;
                setVoice(found);
              }}
              className="w-full text-xs p-2 rounded-lg border border-[#D5CABE] bg-[#FAF8F5] text-[#2C231B] focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            >
              {vietnameseVoices.length > 0 && (
                <optgroup label="Giọng Tiếng Việt chuẩn">
                  {vietnameseVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Tất cả giọng đọc hệ thống">
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {vietnameseVoices.length === 0 && (
            <p className="text-[11px] text-[#8C5220] bg-amber-50 p-2 rounded-lg border border-amber-200">
              Thiết bị chưa cài đặt gói giọng đọc Tiếng Việt (vi-VN). Trình duyệt sẽ phát âm bằng
              giọng đọc mặc định của máy.
            </p>
          )}
        </div>
      )}

      {/* Interactive Sentence Text Box */}
      {isExpanded && (
        <div className="max-h-56 sm:max-h-64 overflow-y-auto rounded-xl bg-white/90 border border-[#E2D8CA] p-3.5 space-y-2 text-xs leading-relaxed scroll-smooth shadow-inner">
          {narrationScript.sentences.map((sent, idx) => {
            const isCurrent = status !== 'idle' && currentSentenceIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => jumpToSentence(idx)}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#FAF1D6] border-l-4 border-[#C19B4C] text-[#23180D] font-medium shadow-xs pl-2.5'
                    : 'text-[#4A3F35] hover:bg-[#FAF6F0] hover:text-[#1F1913]'
                }`}
                title="Nhấn để nghe đọc từ câu này"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`text-[10px] select-none font-mono mt-0.5 ${
                      isCurrent ? 'text-[#8C6D32] font-bold' : 'text-stone-400'
                    }`}
                  >
                    {idx + 1}.
                  </span>
                  <p className="flex-1 font-serif text-sm leading-normal">{sent}</p>
                  {isCurrent && status === 'playing' && (
                    <Volume2 className="w-3.5 h-3.5 text-[#C19B4C] flex-shrink-0 animate-pulse mt-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Playback Controls & Progress Bar */}
      <div className="space-y-2 pt-1">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[#695A4B]">
            <span>
              Câu {totalSentences > 0 ? currentSentenceIndex + 1 : 0} / {totalSentences}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#E5DACD] overflow-hidden">
            <div
              className="h-full bg-[#1B3B2B] transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Buttons Toolbar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRestart}
              className="p-2 rounded-xl border border-[#D5CABE] bg-white text-stone-600 hover:bg-stone-100 hover:text-[#1B3B2B] text-xs transition-colors"
              title="Đọc lại từ đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={skipPrevious}
              disabled={currentSentenceIndex <= 0}
              className="p-2 rounded-xl border border-[#D5CABE] bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-40 text-xs transition-colors"
              title="Câu trước đó"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={skipNext}
              disabled={currentSentenceIndex >= totalSentences - 1}
              className="p-2 rounded-xl border border-[#D5CABE] bg-white text-stone-600 hover:bg-stone-100 disabled:opacity-40 text-xs transition-colors"
              title="Câu kế tiếp"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            {status !== 'idle' && (
              <button
                type="button"
                onClick={stop}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-600 hover:bg-stone-100 text-xs font-semibold transition-colors"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dừng</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePlayToggle}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3B2B] text-white hover:bg-[#28503C] shadow-sm text-xs font-bold transition-all min-w-[120px] justify-center"
            >
              {status === 'playing' ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Tạm dừng</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>{status === 'paused' ? 'Tiếp tục đọc' : 'Bắt đầu đọc'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
