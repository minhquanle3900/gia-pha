import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle,
  Copy,
  Download,
  QrCode,
  Share2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import { formatLifespan, formatLunarAnniversary } from '../../utils/dateUtils';

interface QRShareModalProps {
  open: boolean;
  person?: Person | null;
  onClose: () => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({ open, person, onClose }) => {
  const { people, settings } = useGenealogy();

  const [selectedPersonId, setSelectedPersonId] = useState<string>(person?.id || people[0]?.id || '');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareText, setShareText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (person) {
      setSelectedPersonId(person.id);
    }
  }, [person]);

  const activePerson = people.find((p) => p.id === selectedPersonId) || people[0];

  useEffect(() => {
    if (!activePerson) return;

    // Generate formatted Vietnamese genealogy text card for QR code
    const lines = [
      `GIA PHẢ VIỆT – ${settings.clanName || 'DÒNG HỌ VIỆT NAM'}`,
      `Họ và tên: ${activePerson.fullName}`,
      activePerson.generation ? `Đời thứ: ${activePerson.generation}` : '',
      activePerson.clanRole ? `Vai vế: ${activePerson.clanRole}` : '',
      activePerson.tabooName ? `Tên húy: ${activePerson.tabooName}` : '',
      activePerson.commonName ? `Thường gọi: ${activePerson.commonName}` : '',
      `Sinh thời: ${formatLifespan(activePerson.birthDate, activePerson.deathDate, activePerson.isLiving)}`,
      !activePerson.isLiving && activePerson.deathAnniversaryLunar?.day
        ? `Ngày giỗ: ${formatLunarAnniversary(activePerson.deathAnniversaryLunar)}`
        : '',
      activePerson.ancestralHome ? `Nguyên quán: ${activePerson.ancestralHome}` : '',
      activePerson.burialPlace ? `Mộ phần: ${activePerson.burialPlace}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    setShareText(lines);

    // Render QR Code using canvas data URL
    QRCode.toDataURL(lines, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1B3B2B',
        light: '#FFFDF9',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [activePerson, settings]);

  if (!open) return null;

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${activePerson?.fullName || 'GiaPha'}.png`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#1B3B2B]" />
            <h3 className="text-base font-serif font-bold text-[#1F1913]">
              Chia Sẻ Hồ Sơ Ngoại Tuyến (QR)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Person Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Chọn thành viên để tạo mã QR:
          </label>
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} {p.generation ? `(Đời ${p.generation})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* QR Code Display */}
        {qrDataUrl && (
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] space-y-3">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-48 h-48 rounded-xl border border-stone-200 shadow-xs"
            />
            <p className="text-[11px] text-stone-500 text-center max-w-xs">
              Quét bằng camera điện thoại của bất kỳ người thân nào để xem thông tin phả hệ mà không cần kết nối mạng.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-[#D5CABE] text-xs font-semibold text-[#1B3B2B] hover:bg-stone-50 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải ảnh QR</span>
          </button>

          <button
            type="button"
            onClick={handleCopyText}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-xs font-semibold text-white shadow-xs transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Đã sao chép' : 'Chép nội dung'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
