import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Disc,
  Download,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Media, Person } from '../../models/genealogy';
import { generateId } from '../../utils/dateUtils';

interface AudioRecorderModalProps {
  open: boolean;
  initialPersonId?: string;
  onClose: () => void;
  onSaved?: (media: Media) => void;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  open,
  initialPersonId,
  onClose,
  onSaved,
}) => {
  const { people, branches, saveMedia } = useGenealogy();

  // Recording states
  const [recordingStatus, setRecordingStatus] = useState<
    'idle' | 'recording' | 'paused' | 'stopped'
  >('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(initialPersonId || '');
  const [description, setDescription] = useState('');
  const [storyContext, setStoryContext] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  // Sync initial person
  useEffect(() => {
    if (initialPersonId) {
      setSelectedPersonId(initialPersonId);
      const p = people.find((item) => item.id === initialPersonId);
      if (p) {
        setTitle(`Lời dặn & Ký ức: ${p.fullName}`);
      }
    }
  }, [initialPersonId, people]);

  // Clean up audio URL on unmount or reset
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    };
  }, [audioUrl]);

  if (!open) return null;

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Trình duyệt hiện tại không hỗ trợ thu âm trực tiếp qua microphone.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250); // slices every 250ms
      setRecordingStatus('recording');
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setMicError(
        'Không thể truy cập microphone. Quý vị vui lòng cấp quyền microphone cho trình duyệt.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingStatus('paused');
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingStatus('recording');
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus !== 'idle') {
      mediaRecorderRef.current.stop();
      setRecordingStatus('stopped');
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingStatus('idle');
    setRecordingSeconds(0);
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioBlob) return;

    try {
      setIsSaving(true);

      // Convert Blob to Base64 DataURL
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const nowIso = new Date().toISOString();

        const selectedPerson = people.find((p) => p.id === selectedPersonId);

        const newMedia: Media = {
          id: generateId('media_audio'),
          title: title.trim() || `Thu âm lời dặn (${new Date().toLocaleDateString('vi-VN')})`,
          description: description.trim() || undefined,
          storyContext: storyContext.trim() || undefined,
          category: 'audio',
          mimeType: audioBlob.type || 'audio/webm',
          dataUrl: base64Audio,
          fileSize: audioBlob.size,
          fileName: `Loi_Dan_${selectedPerson?.fullName.replace(/\s+/g, '_') || 'Gia_Toc'}_${Date.now()}.webm`,
          dateLabel: `Thu ngày ${new Date().toLocaleDateString('vi-VN')}`,
          personIds: selectedPersonId ? [selectedPersonId] : [],
          branchId: selectedPerson?.branchId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await saveMedia(newMedia);
        onSaved?.(newMedia);
        setIsSaving(false);
        onClose();
      };
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const selectedPersonObj = people.find((p) => p.id === selectedPersonId);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFDF9] rounded-3xl border border-[#E7DFD4] p-5 sm:p-7 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#8C3A27] text-white flex items-center justify-center shadow-xs">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1F1913]">
                Thu Âm Ký Ức & Lời Dặn Tiền Nhân
              </h3>
              <p className="text-[11px] text-stone-500">
                Ghi lại giọng nói, lời kể và huấn thị của các bậc cao niên lưu truyền cho hậu thế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Microphone Error Alert */}
        {micError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{micError}</span>
          </div>
        )}

        {/* Recording Visualizer & Controls Box */}
        <div className="p-6 rounded-2xl bg-linear-to-b from-[#FAF7F2] to-[#F5EFE6] border border-[#E7DFD4] text-center space-y-4">
          {/* Animated Mic Wave or Timer */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                recordingStatus === 'recording'
                  ? 'bg-red-500 text-white animate-pulse shadow-lg ring-8 ring-red-100'
                  : recordingStatus === 'paused'
                  ? 'bg-amber-500 text-white shadow-md'
                  : audioBlob
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#1B3B2B] text-white'
              }`}
            >
              {recordingStatus === 'recording' ? (
                <Disc className="w-8 h-8 animate-spin" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </div>

            {/* Timer Counter */}
            <div className="text-2xl font-mono font-bold text-[#1F1913] tabular-nums">
              {formatTimer(recordingSeconds)}
            </div>

            <p className="text-xs text-stone-500 font-medium">
              {recordingStatus === 'idle'
                ? 'Nhấn nút bên dưới để bắt đầu ghi âm trực tiếp'
                : recordingStatus === 'recording'
                ? 'Đang thu âm... Xin mời cụ/ông/bà chia sẻ'
                : recordingStatus === 'paused'
                ? 'Đang tạm dừng thu âm'
                : 'Đã hoàn tất thu âm! Quý vị có thể nghe lại trước khi lưu'}
            </p>
          </div>

          {/* Audio Playback Preview if recorded */}
          {audioUrl && (
            <div className="pt-2">
              <audio controls src={audioUrl} className="w-full rounded-xl" />
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {recordingStatus === 'idle' && (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition-colors"
              >
                <Mic className="w-4 h-4" />
                <span>Bắt đầu thu âm</span>
              </button>
            )}

            {recordingStatus === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  <span>Tạm dừng</span>
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-semibold text-xs shadow-md transition-colors"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Dừng & Nghe lại</span>
                </button>
              </>
            )}

            {recordingStatus === 'paused' && (
              <>
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Tiếp tục</span>
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white font-semibold text-xs transition-colors"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Dừng & Nghe lại</span>
                </button>
              </>
            )}

            {recordingStatus === 'stopped' && (
              <button
                type="button"
                onClick={resetRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thu âm lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Audio Meta Form */}
        <form onSubmit={handleSaveAudio} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Tiêu đề bản thu âm <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Lời dặn con cháu của Cụ Khang trước khi đi xa..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Người nói / Thành viên liên kết
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
              >
                <option value="">(Chọn người nói hoặc chung dòng họ)</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">Bối cảnh ghi âm</label>
              <input
                type="text"
                value={storyContext}
                onChange={(e) => setStoryContext(e.target.value)}
                placeholder="Ví dụ: Dịp mừng thọ 80 tuổi, tại nhà thờ họ..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-600 font-semibold mb-1">
              Tóm tắt nội dung lời dặn / Lời kể
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú nội dung chính của đoạn thu âm để con cháu tiện tra cứu..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={!audioBlob || isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white font-semibold shadow-xs disabled:opacity-40 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu vào Kỷ vật dòng họ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
