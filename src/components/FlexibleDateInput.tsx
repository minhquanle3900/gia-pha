import React from 'react';
import { DatePrecision, FlexibleDate } from '../models/genealogy';

interface FlexibleDateInputProps {
  label: string;
  value?: FlexibleDate;
  onChange: (date?: FlexibleDate) => void;
  helperText?: string;
}

export const FlexibleDateInput: React.FC<FlexibleDateInputProps> = ({
  label,
  value,
  onChange,
  helperText,
}) => {
  const precision: DatePrecision = value?.precision ?? 'year';
  const year = value?.year !== undefined ? value.year : '';
  const month = value?.month !== undefined ? value.month : '';
  const day = value?.day !== undefined ? value.day : '';
  const displayText = value?.displayText ?? '';
  const calendar = value?.calendar ?? 'solar';

  const updateField = (updates: Partial<FlexibleDate>) => {
    const next: FlexibleDate = {
      precision,
      year: value?.year,
      month: value?.month,
      day: value?.day,
      displayText: value?.displayText,
      calendar: value?.calendar ?? 'solar',
      ...updates,
    };

    // If completely blank, allow clearing
    if (
      next.precision === 'unknown' &&
      !next.displayText &&
      next.year === undefined
    ) {
      onChange(undefined);
      return;
    }

    onChange(next);
  };

  return (
    <div className="space-y-2 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5]/60 p-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#5C4F42]">
          {label}
        </label>
        <div className="flex items-center gap-1 text-[11px] text-[#7A6E60]">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={`calendar-${label}`}
              checked={calendar === 'solar'}
              onChange={() => updateField({ calendar: 'solar' })}
              className="accent-[#1B3B2B]"
            />
            Dương
          </label>
          <span className="text-stone-300">/</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="radio"
              name={`calendar-${label}`}
              checked={calendar === 'lunar'}
              onChange={() => updateField({ calendar: 'lunar' })}
              className="accent-[#1B3B2B]"
            />
            Âm
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div className="sm:col-span-1">
          <label className="block text-[11px] text-stone-500 mb-0.5">Độ chính xác</label>
          <select
            value={precision}
            onChange={(e) => updateField({ precision: e.target.value as DatePrecision })}
            className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 text-[#2C241C] focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] outline-none"
          >
            <option value="exact">Chính xác (Ngày/Tháng/Năm)</option>
            <option value="month">Tháng và Năm</option>
            <option value="year">Chỉ biết Năm</option>
            <option value="approx">Ước tính khoảng (c.)</option>
            <option value="before">Trước năm (av.)</option>
            <option value="after">Sau năm (ap.)</option>
            <option value="unknown">Chưa rõ</option>
          </select>
        </div>

        {precision === 'exact' && (
          <div>
            <label className="block text-[11px] text-stone-500 mb-0.5">Ngày</label>
            <input
              type="number"
              min={1}
              max={31}
              placeholder="VD: 15"
              value={day}
              onChange={(e) =>
                updateField({ day: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 text-[#2C241C] focus:border-[#1B3B2B] outline-none"
            />
          </div>
        )}

        {(precision === 'exact' || precision === 'month') && (
          <div>
            <label className="block text-[11px] text-stone-500 mb-0.5">Tháng</label>
            <input
              type="number"
              min={1}
              max={12}
              placeholder="1 - 12"
              value={month}
              onChange={(e) =>
                updateField({ month: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 text-[#2C241C] focus:border-[#1B3B2B] outline-none"
            />
          </div>
        )}

        {precision !== 'unknown' && (
          <div className={precision === 'year' || precision === 'approx' || precision === 'before' || precision === 'after' ? 'sm:col-span-3' : ''}>
            <label className="block text-[11px] text-stone-500 mb-0.5">Năm</label>
            <input
              type="number"
              min={1000}
              max={2100}
              placeholder="VD: 1945"
              value={year}
              onChange={(e) =>
                updateField({ year: e.target.value ? parseInt(e.target.value, 10) : undefined })
              }
              className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white px-2 py-1.5 text-[#2C241C] focus:border-[#1B3B2B] outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <input
          type="text"
          placeholder="Mô tả niên đại cổ (VD: 'Năm Giáp Ngọ', 'Trước Cách mạng')"
          value={displayText}
          onChange={(e) => updateField({ displayText: e.target.value || undefined })}
          className="w-full text-xs rounded-lg border border-[#D5CABE] bg-white/90 px-2 py-1 text-[#2C241C] placeholder:text-stone-400 focus:border-[#1B3B2B] outline-none"
        />
      </div>

      {helperText && <p className="text-[10px] text-stone-500">{helperText}</p>}
    </div>
  );
};
