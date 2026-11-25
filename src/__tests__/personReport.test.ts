import { describe, expect, it } from 'vitest';
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

  it('exportPersonReportToPdfDirect executes successfully with jsPDF', async () => {
    // In Node.js testing environment, it uses the jsPDF direct instance without throwing
    await expect(exportPersonReportToPdfDirect(mockReportData)).resolves.not.toThrow();
  });
});
