import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createSeedSnapshot } from '../database/seedData';
import {
  buildTextDossierSummary,
  DEFAULT_REPORT_CONFIG,
  exportPersonReportToPdfDirect,
  generateStandalonePrintableHtml,
  PersonReportData,
} from '../services/personPdfReportService';

describe('Individual Formatted PDF Report Service', () => {
  const seed = createSeedSnapshot();
  const personA = seed.people.find((p) => p.fullName === 'Trần Văn Khang') || seed.people[0];
  const branch = seed.branches[0];

  // Mock relationship data
  const mockReportData: PersonReportData = {
    person: {
      ...personA,
      fullName: 'Trần Văn Khang',
      gender: 'male',
      generation: 2,
      tabooName: 'Đức Thành',
      courtesyName: 'Bá Thông',
      commonName: 'Bác Cả',
      isLiving: false,
      birthDate: { precision: 'exact', year: 1928, month: 4, day: 15 },
      deathDate: { precision: 'exact', year: 2005, month: 11, day: 20 },
      deathAnniversaryLunar: { day: 19, month: 10 },
      burialPlace: 'Nghĩa trang Dòng họ Trần, Nam Định',
      merits: 'Đóng góp phục dựng từ đường và biên tập gia phả năm 1995.',
      biography: 'Sinh thời làm nghề giáo viên, đức độ khiêm nhường, phụng sự dòng họ chu đáo.',
    },
    branch,
    parents: [
      {
        relationship: {
          id: 'rel_parent_1',
          parentId: 'p_father',
          childId: personA.id,
          lineageType: 'biological',
          createdAt: '',
          updatedAt: '',
        },
        parent: {
          id: 'p_father',
          fullName: 'Trần Văn Khởi',
          gender: 'male',
          generation: 1,
          isLiving: false,
          birthDate: { precision: 'year', year: 1902 },
          deathDate: { precision: 'year', year: 1978 },
          createdAt: '',
          updatedAt: '',
        },
      },
      {
        relationship: {
          id: 'rel_parent_2',
          parentId: 'p_mother',
          childId: personA.id,
          lineageType: 'biological',
          createdAt: '',
          updatedAt: '',
        },
        parent: {
          id: 'p_mother',
          fullName: 'Nguyễn Thị Nhuận',
          gender: 'female',
          generation: 1,
          isLiving: false,
          birthDate: { precision: 'year', year: 1905 },
          deathDate: { precision: 'year', year: 1985 },
          createdAt: '',
          updatedAt: '',
        },
      },
    ],
    spouses: [
      {
        union: {
          id: 'union_1',
          partnerIds: [personA.id, 'spouse_1'],
          marriageOrder: 1,
          status: 'widowed',
          createdAt: '',
          updatedAt: '',
        },
        spouse: {
          id: 'spouse_1',
          fullName: 'Lê Thị Mùi',
          gender: 'female',
          generation: 2,
          isLiving: false,
          birthDate: { precision: 'year', year: 1932 },
          deathDate: { precision: 'year', year: 2010 },
          createdAt: '',
          updatedAt: '',
        },
      },
    ],
    children: [
      {
        relationship: {
          id: 'rel_c1',
          parentId: personA.id,
          childId: 'c_1',
          lineageType: 'biological',
          birthOrder: 1,
          createdAt: '',
          updatedAt: '',
        },
        child: {
          id: 'c_1',
          fullName: 'Trần Văn Tuấn',
          gender: 'male',
          generation: 3,
          isLiving: true,
          birthDate: { precision: 'year', year: 1955 },
          createdAt: '',
          updatedAt: '',
        },
      },
      {
        relationship: {
          id: 'rel_c2',
          parentId: personA.id,
          childId: 'c_2',
          lineageType: 'biological',
          birthOrder: 2,
          createdAt: '',
          updatedAt: '',
        },
        child: {
          id: 'c_2',
          fullName: 'Trần Thị Mai',
          gender: 'female',
          generation: 3,
          isLiving: true,
          birthDate: { precision: 'year', year: 1958 },
          createdAt: '',
          updatedAt: '',
        },
      },
    ],
    siblings: [
      {
        id: 'sib_1',
        fullName: 'Trần Văn Dũng',
        gender: 'male',
        generation: 2,
        isLiving: true,
        birthDate: { precision: 'year', year: 1935 },
        createdAt: '',
        updatedAt: '',
      },
    ],
    lifeEvents: [
      {
        id: 'evt_1',
        personId: personA.id,
        title: 'Tham gia kháng chiến',
        type: 'contribution',
        date: { precision: 'year', year: 1950 },
        location: 'Việt Bắc',
        createdAt: '',
        updatedAt: '',
      },
    ],
    settings: {
      ...seed.settings,
      clanName: 'Họ Trần Việt Nam',
      clanMotto: 'Uống nước nhớ nguồn · Tổ tông công đức',
    },
  };

  it('builds clean structured text summary of individual dossier', () => {
    const summary = buildTextDossierSummary(mockReportData);

    expect(summary).toContain('TRÍCH LỤC TIỂU SỬ PHẢ KÝ CÁ NHÂN');
    expect(summary).toContain('HỌ TRẦN VIỆT NAM');
    expect(summary).toContain('Trần Văn Khang');
    expect(summary).toContain('Đức Thành'); // Taboo name
    expect(summary).toContain('Bá Thông'); // Courtesy name
    expect(summary).toContain('Trần Văn Khởi'); // Father
    expect(summary).toContain('Nguyễn Thị Nhuận'); // Mother
    expect(summary).toContain('Lê Thị Mùi'); // Spouse
    expect(summary).toContain('Trần Văn Tuấn'); // Child 1
    expect(summary).toContain('Trần Thị Mai'); // Child 2
    expect(summary).toContain('Trần Văn Dũng'); // Sibling
    expect(summary).toContain('Nghĩa trang Dòng họ Trần');
  });

  it('generates standalone printable HTML with traditional layout', () => {
    const html = generateStandalonePrintableHtml(mockReportData, DEFAULT_REPORT_CONFIG);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Trần Văn Khang');
    expect(html).toContain('HỌ TRẦN VIỆT NAM');
    expect(html).toContain('I. Thông Tin Cá Nhân');
    expect(html).toContain('Thân phụ (Cha)');
    expect(html).toContain('Nguyễn Thị Nhuận');
    expect(html).toContain('Chính thất');
    expect(html).toContain('Trần Văn Tuấn');
    expect(html).toContain('TRƯỞNG TỘC CHỨNG NHẬN');
    expect(html).toContain('TỘC ẤN');
  });

  it('escapes dossier fields as text in standalone HTML and preserves multilingual content', () => {
    const sample = `Gia phả 家譜 & "Đông" 'Tây' (2 < 3 > 1)`;
    const escaped = 'Gia phả 家譜 &amp; &quot;Đông&quot; &#39;Tây&#39; (2 &lt; 3 &gt; 1)';
    const withSample = (field: string) => field + ' ' + sample;
    const date = (field: string) => ({ precision: 'unknown' as const, displayText: withSample(field) });
    const data: PersonReportData = {
      ...mockReportData,
      person: {
        ...mockReportData.person,
        id: 'A& B< C>',
        fullName: withSample('Tên'),
        subBranch: withSample('Phái'),
        clanRole: withSample('Vai vế'),
        tabooName: withSample('Húy'),
        courtesyName: withSample('Tên tự'),
        commonName: withSample('Thường gọi'),
        birthDate: date('Mô tả sinh'),
        birthPlace: withSample('Nơi sinh'),
        deathDate: date('Mô tả mất'),
        deathAnniversaryLunar: { day: 10, month: 2, note: withSample('Giỗ') },
        burialPlace: withSample('Mộ'),
        ancestralHome: withSample('Nguyên quán'),
        merits: withSample('Công đức'),
        biography: withSample('Tiểu sử') + '\nDòng thứ hai &amp; Việt Nam',
      },
      settings: {
        ...mockReportData.settings,
        clanName: sample,
        clanMotto: withSample('Gia huấn'),
      },
      branch: { ...branch, name: withSample('Chi') },
      parents: [{
        ...mockReportData.parents[0],
        parent: { ...mockReportData.parents[0].parent, fullName: withSample('Cha'), birthDate: date('Mốc cha') },
      }],
      spouses: [{
        ...mockReportData.spouses[0],
        spouse: { ...mockReportData.spouses[0].spouse!, fullName: withSample('Bạn đời'), birthDate: date('Mốc bạn đời') },
      }],
      children: [{
        ...mockReportData.children[0],
        child: { ...mockReportData.children[0].child, fullName: withSample('Con'), birthDate: date('Mốc con') },
      }],
    };

    const html = generateStandalonePrintableHtml(data, DEFAULT_REPORT_CONFIG);

    expect(html).toContain('<title>Trích Lục Phả Ký – Tên ' + escaped + '</title>');
    expect(html).toContain('DÒNG HỌ GIA PHẢ 家譜 &amp; &quot;ĐÔNG&quot; &#39;TÂY&#39; (2 &lt; 3 &gt; 1)');
    expect(html).toContain('Số hiệu: GPV-A&amp; B&lt; C&gt;');
    for (const field of [
      'Phái', 'Vai vế', 'Húy', 'Tên tự', 'Thường gọi', 'Mô tả sinh', 'Nơi sinh', 'Mô tả mất',
      'Giỗ', 'Mộ', 'Nguyên quán', 'Công đức', 'Tiểu sử', 'Gia huấn', 'Chi', 'Cha', 'Mốc cha',
      'Bạn đời', 'Mốc bạn đời', 'Con', 'Mốc con',
    ]) {
      expect(html).toContain(field + ' ' + escaped);
    }
    expect(html).toContain('Dòng thứ hai &amp;amp; Việt Nam');
    expect(html).not.toContain(sample);
    expect(buildTextDossierSummary(data)).toContain(data.person.biography);
  });

  it('escapes place and occupation in the printable profile of a living person', () => {
    const html = generateStandalonePrintableHtml({
      ...mockReportData,
      person: {
        ...mockReportData.person,
        isLiving: true,
        residence: 'Đà Nẵng & Huế',
        occupation: 'Nhà giáo "Tiếng Việt"',
      },
    }, DEFAULT_REPORT_CONFIG);

    expect(html).toContain('Đà Nẵng &amp; Huế');
    expect(html).toContain('Nhà giáo &quot;Tiếng Việt&quot;');
  });

  it('respects report config customization toggles', () => {
    const customConfig = {
      ...DEFAULT_REPORT_CONFIG,
      theme: 'monochrome' as const,
      paperSize: 'letter' as const,
      showParents: false,
      showSpouses: false,
      showChildren: false,
      showBio: false,
      showMerits: false,
      showSignatures: false,
    };

    const html = generateStandalonePrintableHtml(mockReportData, customConfig);

    expect(html).toContain('Trần Văn Khang');
    expect(html).not.toContain('IV. Tiền Nhân / Thân Phụ');
    expect(html).not.toContain('V. Phối Ngẫu / Bạn Đời');
    expect(html).not.toContain('VI. Hậu Duệ / Con Cái');
    expect(html).not.toContain('TRƯỞNG TỘC CHỨNG NHẬN');
  });

  it('produces individual report PDF bytes without writing a file', async () => {
    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    try {
      await exportPersonReportToPdfDirect({
        ...mockReportData,
        person: { ...mockReportData.person, fullName: 'Ho so mau' },
      });
      expect(write).toHaveBeenCalledExactlyOnceWith('Ho_So_Gia_Pha_Ho_so_mau.pdf', expect.any(Buffer));
      expect(write.mock.calls[0][1].toString()).toMatch(/^%PDF-[\s\S]+%%EOF\s*$/);
    } finally {
      write.mockRestore();
    }
  });
});
