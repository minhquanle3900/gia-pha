import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createSeedSnapshot } from '../database/seedData';
import {
  buildFamilyBookBlocks,
  buildFamilyBookTextFallback,
  DEFAULT_FAMILY_BOOK_CONFIG,
  exportFamilyBookToPdf,
  generateFamilyBookPrintableHtml,
} from '../services/familyBookPdfService';

describe('Family Book Printable & PDF Export Service', () => {
  const seed = createSeedSnapshot();

  const exportData = {
    settings: seed.settings,
    people: seed.people,
    branches: seed.branches,
    stories: seed.stories,
    relationships: seed.relationships,
    unions: seed.unions,
  };

  it('builds ordered book blocks including cover, preface, branches, generations, and taboo index', () => {
    const blocks = buildFamilyBookBlocks(exportData, DEFAULT_FAMILY_BOOK_CONFIG);

    expect(blocks.length).toBeGreaterThan(4);
    expect(blocks[0]).toContain('QUỐC ÂM PHẢ KÝ');
    expect(blocks[0]).toContain(seed.settings.clanName);
    expect(blocks.some((b) => b.includes('LỜI TỰA PHẢ KÝ'))).toBe(true);
    expect(blocks.some((b) => b.includes('PHẢ LỤC CHI TIẾT CÁC THẾ HỆ'))).toBe(true);
    expect(blocks.some((b) => b.includes('ĐỜI THỨ 1'))).toBe(true);
  });

  it('generates standalone printable HTML with escaped content and print styles', () => {
    const html = generateFamilyBookPrintableHtml(
      {
        ...exportData,
        settings: {
          ...seed.settings,
          clanName: 'Họ Trần <Đông Ngạc>',
        },
      },
      DEFAULT_FAMILY_BOOK_CONFIG
    );

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Họ Trần &lt;Đông Ngạc&gt;');
    expect(html).toContain('@page { size: A4 portrait;');
    expect(html).toContain('fb-person-card');
  });

  it('respects section toggle options in FamilyBookPrintConfig', () => {
    const html = generateFamilyBookPrintableHtml(exportData, {
      paperSize: 'letter',
      includeCover: false,
      includePreface: false,
      includeBranches: false,
      includeGenerations: true,
      includeRelationships: false,
      includeTabooIndex: false,
    });

    expect(html).toContain('@page { size: letter portrait;');
    expect(html).not.toContain('QUỐC ÂM PHẢ KÝ');
    expect(html).not.toContain('LỜI TỰA PHẢ KÝ');
    expect(html).not.toContain('DANH SÁCH CÁC CHI PHÁI');
    expect(html).not.toContain('MỤC LỤC TRA CỨU TÊN HÚY');
    expect(html).toContain('PHẢ LỤC CHI TIẾT CÁC THẾ HỆ');
  });

  it('builds readable text fallback and produces PDF bytes without writing a file', async () => {
    const text = buildFamilyBookTextFallback(exportData);
    expect(text).toContain(seed.settings.clanName);
    expect(text).toContain('DOI THU 1');

    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    try {
      let progress = 0;
      await exportFamilyBookToPdf(
        { ...exportData, settings: { ...exportData.settings, clanName: 'Dong ho mau' } },
        DEFAULT_FAMILY_BOOK_CONFIG,
        (value) => { progress = value; }
      );
      expect(progress).toBe(100);
      expect(write).toHaveBeenCalledExactlyOnceWith('Sach_Pha_Ky_Dong_ho_mau.pdf', expect.any(Buffer));
      expect(write.mock.calls[0][1].toString()).toMatch(/^%PDF-[\s\S]+%%EOF\s*$/);
    } finally {
      write.mockRestore();
    }
  });
});
