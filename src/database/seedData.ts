import {
  AppSettings,
  FamilyBranch,
  FamilyStory,
  GenealogyDatabaseSnapshot,
  LifeEvent,
  Media,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';

// Self-contained high-fidelity SVG data URIs for heritage demonstration
const svgAncestralHall = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1B3B2B"/>
      <stop offset="60%" stop-color="#132A1F"/>
      <stop offset="100%" stop-color="#0D1D15"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C5A059"/>
      <stop offset="50%" stop-color="#E5C788"/>
      <stop offset="100%" stop-color="#9E7B3B"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <!-- Courtyard floor tiles -->
  <path d="M0 500 L1200 500 L1200 675 L0 675 Z" fill="#2E241E" opacity="0.9"/>
  <!-- Traditional temple columns -->
  <rect x="220" y="240" width="44" height="260" rx="4" fill="#3D2B1F" stroke="#C5A059" stroke-width="2"/>
  <rect x="420" y="220" width="48" height="280" rx="4" fill="#3D2B1F" stroke="#C5A059" stroke-width="2"/>
  <rect x="732" y="220" width="48" height="280" rx="4" fill="#3D2B1F" stroke="#C5A059" stroke-width="2"/>
  <rect x="936" y="240" width="44" height="260" rx="4" fill="#3D2B1F" stroke="#C5A059" stroke-width="2"/>
  <!-- Curved roof eaves -->
  <path d="M120 250 Q600 160 1080 250 L1020 220 Q600 130 180 220 Z" fill="#8B3A2B" stroke="#C5A059" stroke-width="3"/>
  <path d="M260 170 Q600 90 940 170 L900 150 Q600 80 300 150 Z" fill="#8B3A2B"/>
  <!-- Plaque "THẾ ĐỨC TRUYỀN GIA" -->
  <rect x="490" y="250" width="220" height="74" rx="8" fill="#5A1A1A" stroke="url(#gold)" stroke-width="4"/>
  <text x="600" y="296" text-anchor="middle" font-family="serif" font-size="24" font-weight="bold" fill="#E5C788" letter-spacing="4">THẾ ĐỨC TRUYỀN GIA</text>
  <circle cx="600" cy="400" r="48" fill="none" stroke="#C5A059" stroke-width="2" opacity="0.4"/>
</svg>
`)}`;

const svgPatriarch = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="400" height="533">
  <rect width="400" height="533" fill="#3A2E25"/>
  <rect x="16" y="16" width="368" height="501" rx="8" fill="#EAE4D6" stroke="#C5A059" stroke-width="3"/>
  <circle cx="200" cy="180" r="72" fill="#D5CBB8"/>
  <!-- Turban and Robe silhouette -->
  <path d="M140 136 Q200 106 260 136 Q250 110 200 106 Q150 110 140 136 Z" fill="#231C16"/>
  <circle cx="200" cy="178" r="46" fill="#D5CBB8"/>
  <path d="M110 320 Q200 240 290 320 L310 470 L90 470 Z" fill="#1B3B2B"/>
  <path d="M170 250 L200 360 L230 250 Z" fill="#FAF7F2" opacity="0.8"/>
  <text x="200" y="440" text-anchor="middle" font-family="serif" font-size="20" font-weight="bold" fill="#C5A059">CỤ ĐỒ LỘC (1872 - 1948)</text>
  <text x="200" y="468" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#655A4E">Hiệu ảnh Lê Văn – Hà Nội 1926</text>
</svg>
`)}`;

const svgMatriarch = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 533" width="400" height="533">
  <rect width="400" height="533" fill="#3A2E25"/>
  <rect x="16" y="16" width="368" height="501" rx="8" fill="#F2E9DF" stroke="#C5A059" stroke-width="3"/>
  <circle cx="200" cy="180" r="72" fill="#DFCBB8"/>
  <!-- Traditional Headscarf silhouette -->
  <path d="M136 140 Q200 112 264 140 Q270 200 250 230 Q200 244 150 230 Z" fill="#231C16"/>
  <circle cx="200" cy="182" r="44" fill="#DFCBB8"/>
  <path d="M110 320 Q200 250 290 320 L310 470 L90 470 Z" fill="#4A2E1F"/>
  <circle cx="200" cy="300" r="14" fill="none" stroke="#C5A059" stroke-width="4"/>
  <text x="200" y="440" text-anchor="middle" font-family="serif" font-size="20" font-weight="bold" fill="#856428">CỤ BÀ KIM (1876 - 1954)</text>
  <text x="200" y="468" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#85786A">Tổ mẫu Đại Tôn – Đông Ngạc</text>
</svg>
`)}`;

const svgReunion = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#2E241E"/>
  <rect x="20" y="20" width="760" height="560" rx="12" fill="#E8DFD1" stroke="#C5A059" stroke-width="4"/>
  <!-- Courtyard veranda -->
  <path d="M80 180 L720 180 L720 480 L80 480 Z" fill="#D8CEBD"/>
  <circle cx="280" cy="310" r="34" fill="#1B3B2B"/>
  <circle cx="400" cy="290" r="38" fill="#3D2B1F"/>
  <circle cx="520" cy="310" r="34" fill="#1B3B2B"/>
  <circle cx="200" cy="330" r="28" fill="#8B3A2B"/>
  <circle cx="600" cy="330" r="28" fill="#8B3A2B"/>
  <text x="400" y="520" text-anchor="middle" font-family="serif" font-size="24" font-weight="bold" fill="#231C16">Đại gia đình sum họp xuân Ất Tỵ 1965</text>
  <text x="400" y="546" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#655A4E">Hiên nhà cổ 5 gian tại Xóm Chùa, làng Đông Ngạc</text>
</svg>
`)}`;

const svgAncientBook = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <rect width="800" height="600" fill="#2E241E"/>
  <rect x="20" y="20" width="760" height="560" rx="12" fill="#DFD3BE" stroke="#C5A059" stroke-width="4"/>
  <!-- Open Manuscript Pages -->
  <rect x="100" y="100" width="290" height="380" rx="6" fill="#F4EBD9" stroke="#C5B59A" stroke-width="2"/>
  <rect x="410" y="100" width="290" height="380" rx="6" fill="#F4EBD9" stroke="#C5B59A" stroke-width="2"/>
  <!-- Calligraphy vertical strips -->
  <line x1="160" y1="140" x2="160" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <line x1="240" y1="140" x2="240" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <line x1="320" y1="140" x2="320" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <line x1="480" y1="140" x2="480" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <line x1="560" y1="140" x2="560" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <line x1="640" y1="140" x2="640" y2="440" stroke="#3A2E25" stroke-width="6" stroke-linecap="round" stroke-dasharray="16,10"/>
  <!-- Red seal imprint -->
  <rect x="220" y="400" width="40" height="40" rx="4" fill="#B22222" opacity="0.85"/>
  <text x="400" y="530" text-anchor="middle" font-family="serif" font-size="22" font-weight="bold" fill="#231C16">Bản Gia phả cổ chép tay trên giấy dó (1930)</text>
</svg>
`)}`;

export const HERITAGE_BANNERS = {
  ancestralHall: svgAncestralHall,
  patriarch: svgPatriarch,
  matriarch: svgMatriarch,
  reunion: svgReunion,
  ancientBook: svgAncientBook,
};

const SEED_TIMESTAMP = '2026-10-15T08:00:00.000Z';

export function createSeedSnapshot(): GenealogyDatabaseSnapshot {
  const settings: AppSettings = {
    id: 'default',
    clanName: 'Dòng họ Trần – Đông Ngạc',
    clanMotto: 'Tiên tổ phương danh lưu vạn đại · Tử tôn hiếu thảo kế thiên thu',
    ancestralHallLocation: 'Làng cổ Đông Ngạc, Bắc Từ Liêm, Hà Nội',
    rootPersonId: 'p_01',
    schemaVersion: 1,
    updatedAt: SEED_TIMESTAMP,
  };

  const branches: FamilyBranch[] = [
    {
      id: 'branch_daiton',
      name: 'Đại Tôn Họ Trần Đông Ngạc',
      code: 'DAI-TON',
      founderId: 'p_01',
      subBranches: ['Gốc Tổ Đông Ngạc'],
      originPlace: 'Làng Đông Ngạc, phủ Hoài Đức, Hà Nội',
      establishedPeriod: 'Cuối thế kỷ XIX',
      description:
        'Gốc đại tôn quy tụ các thế hệ khai cơ lập nghiệp tại làng khoa bảng Đông Ngạc bên bờ sông Hồng, gìn giữ từ đường và gia phả gốc.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'branch_giap',
      name: 'Chi Giáp (Chi Trưởng)',
      code: 'CHI-GIAP',
      founderId: 'p_02',
      parentBranchId: 'branch_daiton',
      subBranches: ['Phái Đông', 'Phái Đoài'],
      originPlace: 'Đông Ngạc, Hà Nội',
      establishedPeriod: '1920',
      description:
        'Chi trưởng phụng sự từ đường chính tại Đông Ngạc, nhiều đời theo nghề dạy học, y thuật cổ truyền và nghiên cứu văn hóa.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'branch_at',
      name: 'Chi Ất (Chi Thứ)',
      code: 'CHI-AT',
      founderId: 'p_04',
      parentBranchId: 'branch_daiton',
      subBranches: ['Phái Nam', 'Phái Bắc'],
      originPlace: 'Phố Hàng Đào, Hoàn Kiếm, Hà Nội',
      establishedPeriod: '1926',
      description:
        'Chi thứ lập nghiệp tại nội thành Hà Nội và Hải Phòng, phát triển nghề thủ công mỹ nghệ, kiến trúc và thương mại.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'branch_binh',
      name: 'Chi Bính (Chi Nam Tiến)',
      code: 'CHI-BINH',
      founderId: 'p_10',
      parentBranchId: 'branch_at',
      subBranches: ['Phái Sài Gòn', 'Phái Đà Lạt'],
      originPlace: 'Quận Phú Nhuận, TP. Hồ Chí Minh',
      establishedPeriod: '1955',
      description:
        'Nhánh con cháu vào Nam sinh sống và lập nghiệp từ giữa thế kỷ XX, vẫn đều đặn hướng về giỗ Tổ tháng Chạp hằng năm.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const people: Person[] = [
    // ==================== ĐỜI THỨ 1 ====================
    {
      id: 'p_01',
      fullName: 'Trần Văn Lộc',
      gender: 'male',
      portraitMediaId: 'media_01',
      portraitUrl: svgPatriarch,
      commonName: 'Cụ Đồ Lộc',
      tabooName: 'Trọng Lộc',
      courtesyName: 'Đức Hiên',
      isLiving: false,
      birthDate: { precision: 'exact', day: 14, month: 3, year: 1872 },
      birthPlace: 'Làng Đông Ngạc, phủ Hoài Đức, Hà Nội',
      deathDate: { precision: 'exact', day: 22, month: 11, year: 1948 },
      deathPlace: 'Đông Ngạc, Hà Nội',
      ancestralHome: 'Làng Đông Ngạc, Hà Nội',
      residence: 'Nhà cổ 3 gian Xóm Chùa, Đông Ngạc',
      occupation: 'Nhà nho, Thầy đồ dạy chữ Hán và Quốc ngữ',
      generation: 1,
      branchId: 'branch_daiton',
      subBranch: 'Gốc Tổ Đông Ngạc',
      clanRole: 'Thủy tổ chi phái cận đại',
      deathAnniversaryLunar: { day: 22, month: 10, note: 'Giỗ Tổ Đại Tôn tại Từ đường Đông Ngạc' },
      burialPlace: 'Khu mộ Tổ đồng Cửa Chùa, Đông Ngạc',
      merits:
        'Đứng ra trùng tu nhà thờ họ năm 1924, chép lại cuốn Gia phả chữ Hán sang Quốc ngữ năm 1930 và lập quỹ khuyến học cho con cháu trong làng.',
      biography:
        'Cụ Trần Văn Lộc sinh trưởng trong một gia đình nho học lâu đời ven sông Hồng. Năm 1898 cụ mở lớp dạy học miễn phí cho trẻ nghèo trong vùng, đồng thời kết hợp truyền dạy cả chữ Hán Nôm lẫn chữ Quốc ngữ buổi giao thời. Cụ nổi tiếng cương trực, điềm đạm, để lại bản Gia huấn 12 điều răn dạy con cháu lấy chữ Hiếu và sự học làm gốc.',
      notes: 'Chân dung chụp tại hiệu ảnh Lê Văn – Hà Nội năm 1926.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-11-01T09:15:00.000Z',
    },
    {
      id: 'p_01_sp',
      fullName: 'Nguyễn Thị Kim',
      gender: 'female',
      portraitMediaId: 'media_02',
      portraitUrl: svgMatriarch,
      commonName: 'Cụ Bà Đồ Lộc',
      tabooName: 'Thị Kim',
      courtesyName: 'Từ Thuận',
      isLiving: false,
      birthDate: { precision: 'year', year: 1876 },
      birthPlace: 'Làng Nhật Tân, Hà Nội',
      deathDate: { precision: 'exact', day: 8, month: 12, year: 1954 },
      deathPlace: 'Đông Ngạc, Hà Nội',
      ancestralHome: 'Nhật Tân, Tây Hồ, Hà Nội',
      residence: 'Đông Ngạc, Hà Nội',
      occupation: 'Nghề dệt lụa và trồng dâu tằm',
      generation: 1,
      branchId: 'branch_daiton',
      clanRole: 'Tổ mẫu Đại Tôn',
      deathAnniversaryLunar: { day: 14, month: 11, note: 'Giỗ Tổ Mẫu' },
      burialPlace: 'Khu mộ Tổ đồng Cửa Chùa, Đông Ngạc',
      merits:
        'Tần tảo nuôi dạy ba người con trưởng thành qua thời kỳ biến động, quyên góp ruộng hương hỏa 3 mẫu để lo việc tế tự lâu dài.',
      biography:
        'Cụ bà Nguyễn Thị Kim vốn dòng dõi gia giáo làng Nhật Tân, nổi tiếng khéo tay nghề tơ lụa. Trong những năm mất mùa đầu thế kỷ XX, cụ mở kho thóc gia đình giúp đỡ bà con lối xóm, được dân làng kính trọng gọi là Cụ Bà Từ Thuận.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-10-28T14:20:00.000Z',
    },

    // ==================== ĐỜI THỨ 2 ====================
    {
      id: 'p_02',
      fullName: 'Trần Văn Khải',
      gender: 'male',
      commonName: 'Ông Cả Khải',
      tabooName: 'Minh Khải',
      courtesyName: 'Kế Quang',
      isLiving: false,
      birthDate: { precision: 'exact', day: 5, month: 2, year: 1897 },
      birthPlace: 'Đông Ngạc, Hà Nội',
      deathDate: { precision: 'exact', day: 19, month: 11, year: 1974 },
      deathPlace: 'Đông Ngạc, Hà Nội',
      ancestralHome: 'Làng Đông Ngạc, Hà Nội',
      residence: 'Đông Ngạc, Hà Nội',
      occupation: 'Lương y Đông y, Giáo viên tiểu học',
      generation: 2,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      clanRole: 'Trưởng tộc đời thứ 2 · Trưởng Chi Giáp',
      deathAnniversaryLunar: { day: 6, month: 10, note: 'Giỗ Ông Cả tại nhà thờ Chi Giáp' },
      burialPlace: 'Nghĩa trang dòng họ Trần, Đông Ngạc',
      merits:
        'Bảo vệ nguyên vẹn hòm sắc phong và cuốn Gia phả cổ trong những năm chiến tranh tản cư 1946–1954.',
      biography:
        'Ông Trần Văn Khải là trưởng nam của cụ Đồ Lộc. Ông nối nghiệp cha dạy học và bốc thuốc Bắc cứu người. Sau khi người vợ đầu là bà Nguyễn Thị Lan qua đời sớm năm 1932, ông tục huyền với bà Đặng Thị Nguyệt để cùng nuôi dạy đàn con nên người.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-11-02T10:00:00.000Z',
    },
    {
      id: 'p_03',
      fullName: 'Nguyễn Thị Lan',
      gender: 'female',
      commonName: 'Bà Cả Lan',
      tabooName: 'Ngọc Lan',
      isLiving: false,
      birthDate: { precision: 'year', year: 1899 },
      birthPlace: 'Làng Vẽ, Đông Ngạc, Hà Nội',
      deathDate: { precision: 'exact', day: 12, month: 9, year: 1932 },
      deathPlace: 'Đông Ngạc, Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      occupation: 'Nội trợ, làm bánh truyền thống',
      generation: 2,
      branchId: 'branch_giap',
      clanRole: 'Chính thất Trưởng chi Giáp',
      deathAnniversaryLunar: { day: 12, month: 8, note: 'Giỗ mùa thu rằm tháng Tám' },
      burialPlace: 'Nghĩa trang dòng họ Trần, Đông Ngạc',
      biography:
        'Bà Nguyễn Thị Lan là người vợ đầu của ông Trần Văn Khải, tính tình hiền hậu, đảm đang. Bà lâm bệnh qua đời sớm ở tuổi 33, để lại hai người con nhỏ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_03b',
      fullName: 'Đặng Thị Nguyệt',
      gender: 'female',
      commonName: 'Bà Hai Nguyệt',
      tabooName: 'Thu Nguyệt',
      isLiving: false,
      birthDate: { precision: 'exact', day: 20, month: 8, year: 1908 },
      birthPlace: 'Làng Xuân Đỉnh, Hà Nội',
      deathDate: { precision: 'exact', day: 3, month: 4, year: 1986 },
      deathPlace: 'Hà Nội',
      ancestralHome: 'Xuân Đỉnh, Từ Liêm, Hà Nội',
      occupation: 'Bào chế dược liệu Đông y',
      generation: 2,
      branchId: 'branch_giap',
      clanRole: 'Kế thất Trưởng chi Giáp',
      deathAnniversaryLunar: { day: 25, month: 2 },
      burialPlace: 'Nghĩa trang dòng họ Trần, Đông Ngạc',
      merits:
        'Hết lòng thương yêu, nuôi dạy các con riêng của chồng như con ruột, giữ hòa khí đại gia đình qua nhiều thập kỷ.',
      biography:
        'Bà Đặng Thị Nguyệt kết hôn với ông Trần Văn Khải năm 1934. Bà phụ giúp chồng bốc thuốc nam và chăm sóc cả đại gia đình trong giai đoạn tản cư lên Phú Thọ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_04',
      fullName: 'Trần Văn Phúc',
      gender: 'male',
      commonName: 'Ông Hai Phúc',
      tabooName: 'Hồng Phúc',
      courtesyName: 'Tân Dân',
      isLiving: false,
      birthDate: { precision: 'exact', day: 18, month: 6, year: 1900 },
      birthPlace: 'Đông Ngạc, Hà Nội',
      deathDate: { precision: 'exact', day: 27, month: 11, year: 1981 },
      deathPlace: 'Hoàn Kiếm, Hà Nội',
      ancestralHome: 'Làng Đông Ngạc, Hà Nội',
      residence: 'Số 42 Hàng Đào, Hoàn Kiếm, Hà Nội',
      occupation: 'Thương nhân tơ lụa, Nghệ nhân khảm trai',
      generation: 2,
      branchId: 'branch_at',
      subBranch: 'Phái Bắc',
      clanRole: 'Trưởng Chi Ất',
      deathAnniversaryLunar: { day: 2, month: 11, note: 'Giỗ Trưởng Chi Ất' },
      burialPlace: 'Nghĩa trang Văn Điển, Hà Nội',
      merits:
        'Đóng góp toàn bộ gỗ lim trùng tu hậu cung Từ đường năm 1962 và hỗ trợ con cháu các chi ra Hà Nội ăn học.',
      biography:
        'Ông Trần Văn Phúc là con trai thứ hai của cụ Đồ Lộc. Năm 1926 ông lập hiệu tơ lụa và đồ gỗ khảm trai tại phố Hàng Đào, mở đầu cho Chi Ất phát triển tại nội thành Hà Nội.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_04_sp',
      fullName: 'Lê Thị Thanh',
      gender: 'female',
      commonName: 'Bà Hai Hàng Đào',
      isLiving: false,
      birthDate: { precision: 'year', year: 1904 },
      birthPlace: 'Bắc Ninh',
      deathDate: { precision: 'year', year: 1989 },
      deathPlace: 'Hà Nội',
      ancestralHome: 'Đình Bảng, Từ Sơn, Bắc Ninh',
      residence: 'Hoàn Kiếm, Hà Nội',
      occupation: 'Buôn bán tơ lụa',
      generation: 2,
      branchId: 'branch_at',
      clanRole: 'Nội tướng Chi Ất',
      deathAnniversaryLunar: { day: 19, month: 9, note: 'Giỗ cuối thu' },
      burialPlace: 'Nghĩa trang Văn Điển, Hà Nội',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_05',
      fullName: 'Trần Thị Hạnh',
      gender: 'female',
      commonName: 'Bà Cô Ba Hạnh',
      isLiving: false,
      birthDate: { precision: 'approx', year: 1903, displayText: 'Khoảng năm Quý Mão 1903' },
      birthPlace: 'Đông Ngạc, Hà Nội',
      deathDate: { precision: 'unknown', displayText: 'Khoảng thập niên 1970' },
      ancestralHome: 'Làng Đông Ngạc, Hà Nội',
      residence: 'Sơn Tây, Hà Nội',
      occupation: 'Làm vườn, dệt vải',
      generation: 2,
      branchId: 'branch_daiton',
      clanRole: 'Cô họ Đời thứ 2',
      notes: 'Tư liệu ngày mất thất lạc trong chiến tranh, con cháu giỗ chung vào ngày giỗ Tổ mẫu 14/11 ÂL.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },

    // ==================== ĐỜI THỨ 3 ====================
    {
      id: 'p_06',
      fullName: 'Trần Văn Nghị',
      gender: 'male',
      commonName: 'Ông Trưởng Nghị',
      alias: 'Việt Sơn',
      isLiving: false,
      birthDate: { precision: 'exact', day: 10, month: 5, year: 1923 },
      birthPlace: 'Đông Ngạc, Hà Nội',
      deathDate: { precision: 'exact', day: 15, month: 12, year: 2004 },
      deathPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Đông Ngạc, Bắc Từ Liêm, Hà Nội',
      occupation: 'Nhà giáo ưu tú, Hiệu trưởng trường cấp 3',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      clanRole: 'Trưởng tộc đời thứ 3',
      deathAnniversaryLunar: { day: 4, month: 11, note: 'Giỗ Ông Trưởng Nghị' },
      burialPlace: 'Nghĩa trang dòng họ Trần, Đông Ngạc',
      merits:
        'Chủ trì biên soạn tập Gia phả đánh máy năm 1992 và thành lập Hội đồng Gia tộc họ Trần Đông Ngạc.',
      biography:
        'Ông Trần Văn Nghị là con trai trưởng của ông Khải và bà Lan. Tham gia bình dân học vụ từ năm 1945, sau đó cống hiến hơn 40 năm cho ngành giáo dục Thủ đô.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-10-30T11:10:00.000Z',
    },
    {
      id: 'p_06_sp',
      fullName: 'Phạm Thị Hiền',
      gender: 'female',
      commonName: 'Bà Giáo Hiền',
      isLiving: false,
      birthDate: { precision: 'exact', day: 2, month: 9, year: 1927 },
      birthPlace: 'Hà Đông, Hà Nội',
      deathDate: { precision: 'exact', day: 21, month: 1, year: 2016 },
      deathPlace: 'Hà Nội',
      ancestralHome: 'Làng lụa Vạn Phúc, Hà Đông',
      residence: 'Đông Ngạc, Hà Nội',
      occupation: 'Giáo viên Văn học',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      deathAnniversaryLunar: { day: 12, month: 12 },
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_07',
      fullName: 'Trần Thị Mai',
      gender: 'female',
      commonName: 'Bà Cô Mai',
      isLiving: false,
      birthDate: { precision: 'year', year: 1928 },
      birthPlace: 'Đông Ngạc, Hà Nội',
      deathDate: { precision: 'year', year: 2012 },
      deathPlace: 'Hải Phòng',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Lê Chân, Hải Phòng',
      occupation: 'Y tá bệnh viện đa khoa',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      deathAnniversaryLunar: { day: 18, month: 7 },
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_08',
      fullName: 'Trần Văn Minh',
      gender: 'male',
      commonName: 'Ông Minh Kiến Trúc',
      isLiving: true,
      birthDate: { precision: 'exact', day: 16, month: 10, year: 1938 },
      birthPlace: 'Đông Ngạc, Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Quận Ba Đình, Hà Nội',
      occupation: 'Kiến trúc sư bảo tồn di sản',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đoài',
      clanRole: 'Cố vấn Hội đồng Gia tộc · Trưởng Phái Đoài',
      merits:
        'Thiết kế bản vẽ tu bổ Từ đường năm 2008 giữ nguyên kiến trúc gỗ kẻ truyền Bắc Bộ.',
      biography:
        'Ông Trần Văn Minh là con trai của ông Khải và bà Đặng Thị Nguyệt. Tốt nghiệp Đại học Kiến trúc khóa đầu, ông dành trọn sự nghiệp nghiên cứu đình chùa và nhà cổ đồng bằng Bắc Bộ. Hiện ở tuổi gần 90, ông vẫn minh mẫn kể chuyện lịch sử dòng họ cho con cháu.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-11-03T16:40:00.000Z',
    },
    {
      id: 'p_08_sp',
      fullName: 'Hoàng Thị Bích',
      gender: 'female',
      commonName: 'Bà Bích',
      isLiving: true,
      birthDate: { precision: 'exact', day: 8, month: 3, year: 1942 },
      birthPlace: 'Nam Định',
      ancestralHome: 'Hành Thiện, Xuân Trường, Nam Định',
      residence: 'Quận Ba Đình, Hà Nội',
      occupation: 'Dược sĩ cao cấp (nghỉ hưu)',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đoài',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_09',
      fullName: 'Trần Văn Tín',
      gender: 'male',
      commonName: 'Chú Út Tín',
      isLiving: false,
      birthDate: { precision: 'year', year: 1944 },
      birthPlace: 'Phú Thọ (nơi tản cư)',
      deathDate: { precision: 'exact', day: 30, month: 10, year: 1971 },
      deathPlace: 'Quảng Trị',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      occupation: 'Kỹ sư thông tin quân đội (Liệt sĩ)',
      generation: 3,
      branchId: 'branch_giap',
      subBranch: 'Phái Đoài',
      clanRole: 'Liệt sĩ dòng họ',
      deathAnniversaryLunar: { day: 12, month: 9, note: 'Giỗ Liệt sĩ Trần Văn Tín' },
      burialPlace: 'Nghĩa trang Liệt sĩ Trường Sơn, Quảng Trị',
      merits: 'Hy sinh vì độc lập Tổ quốc năm 27 tuổi khi chưa lập gia đình.',
      biography:
        'Sinh ra trong những năm gia đình bắt đầu chuẩn bị kháng chiến, Trần Văn Tín là sinh viên xuất sắc ngành vô tuyến điện trước khi nhập ngũ năm 1968. Những bức thư tay từ chiến trường của ông hiện được lưu giữ trang trọng tại phòng truyền thống dòng họ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_10',
      fullName: 'Trần Hữu Đạt',
      gender: 'male',
      commonName: 'Ông Cả Đạt Sài Gòn',
      isLiving: false,
      birthDate: { precision: 'exact', day: 12, month: 4, year: 1929 },
      birthPlace: 'Hàng Đào, Hà Nội',
      deathDate: { precision: 'exact', day: 9, month: 11, year: 2015 },
      deathPlace: 'TP. Hồ Chí Minh',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Phú Nhuận, TP. Hồ Chí Minh',
      occupation: 'Nghệ nhân kim hoàn và đồng hồ cổ',
      generation: 3,
      branchId: 'branch_binh',
      secondaryBranchIds: ['branch_at'],
      subBranch: 'Phái Sài Gòn',
      clanRole: 'Trưởng Chi Bính (Nam Tiến)',
      deathAnniversaryLunar: { day: 28, month: 9, note: 'Giỗ Trưởng Chi Bính' },
      burialPlace: 'Hoa viên Nghĩa trang Bình Dương',
      merits:
        'Kết nối bà con đồng hương họ Trần tại miền Nam, lập Ban liên lạc họ Trần phía Nam từ năm 1995.',
      biography:
        'Con trai trưởng của ông Trần Văn Phúc (Chi Ất). Năm 1955 ông vào Sài Gòn lập nghiệp với nghề chế tác kim hoàn và sửa đồng hồ tinh xảo, gây dựng Chi Bính gắn bó nghĩa tình.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_10_sp',
      fullName: 'Võ Thị Ngọc Mai',
      gender: 'female',
      commonName: 'Bà Đạt',
      isLiving: true,
      birthDate: { precision: 'exact', day: 25, month: 1, year: 1935 },
      birthPlace: 'Gia Định, TP. Hồ Chí Minh',
      ancestralHome: 'Gò Công, Tiền Giang',
      residence: 'Phú Nhuận, TP. Hồ Chí Minh',
      occupation: 'Giáo viên nữ công gia chánh (nghỉ hưu)',
      generation: 3,
      branchId: 'branch_binh',
      subBranch: 'Phái Sài Gòn',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_11',
      fullName: 'Trần Hữu Kiên',
      gender: 'male',
      commonName: 'Ông Kiên Hàng Đào',
      isLiving: true,
      birthDate: { precision: 'exact', day: 3, month: 11, year: 1934 },
      birthPlace: 'Hoàn Kiếm, Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Hoàn Kiếm, Hà Nội',
      occupation: 'Kỹ sư cơ khí chế tạo (nghỉ hưu)',
      generation: 3,
      branchId: 'branch_at',
      subBranch: 'Phái Bắc',
      clanRole: 'Trưởng Chi Ất đương nhiệm',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },

    // ==================== ĐỜI THỨ 4 ====================
    {
      id: 'p_12',
      fullName: 'Trần Quốc Tuấn',
      gender: 'male',
      commonName: 'Ông Tuấn Trưởng Tộc',
      isLiving: true,
      birthDate: { precision: 'exact', day: 19, month: 5, year: 1954 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Đông Ngạc, Bắc Từ Liêm, Hà Nội',
      occupation: 'Bác sĩ chuyên khoa Nội, Giảng viên Y khoa',
      generation: 4,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      clanRole: 'Trưởng tộc đương nhiệm',
      merits:
        'Chủ trì số hóa Gia phả dòng họ Trần Đông Ngạc, tổ chức khám sức khỏe định kỳ cho các bậc cao niên trong họ.',
      biography:
        'Là con trưởng của ông Trần Văn Nghị, bác sĩ Trần Quốc Tuấn hiện đảm nhiệm vai trò Trưởng tộc, tận tâm kết nối các thế hệ trẻ trong và ngoài nước hướng về cội nguồn.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-11-04T01:00:00.000Z',
    },
    {
      id: 'p_12_sp',
      fullName: 'Ngô Thị Phương Thảo',
      gender: 'female',
      commonName: 'Bà Thảo',
      isLiving: true,
      birthDate: { precision: 'exact', day: 12, month: 8, year: 1958 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Thanh Oai, Hà Nội',
      residence: 'Đông Ngạc, Bắc Từ Liêm, Hà Nội',
      occupation: 'Kế toán trưởng (nghỉ hưu)',
      generation: 4,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      clanRole: 'Thủ quỹ Quỹ Khuyến học dòng họ',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_13',
      fullName: 'Trần Thị Thu Thủy',
      gender: 'female',
      commonName: 'Cô Thủy',
      isLiving: true,
      birthDate: { precision: 'exact', day: 4, month: 12, year: 1959 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Cầu Giấy, Hà Nội',
      occupation: 'Biên tập viên xuất bản văn hóa',
      generation: 4,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      merits: 'Biên tập cuốn Ký ức Đông Ngạc và sưu tầm tư liệu ảnh gia đình.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_14',
      fullName: 'Trần Thị Thu Hà',
      gender: 'female',
      commonName: 'Cô Hà Kiến Trúc',
      isLiving: true,
      birthDate: { precision: 'exact', day: 22, month: 7, year: 1968 },
      birthPlace: 'Ba Đình, Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Tây Hồ, Hà Nội',
      occupation: 'Kiến trúc sư cảnh quan',
      generation: 4,
      branchId: 'branch_giap',
      subBranch: 'Phái Đoài',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_15',
      fullName: 'Trần Đức Bảo',
      gender: 'male',
      commonName: 'Chú Bảo',
      isLiving: true,
      birthDate: { precision: 'approx', year: 1972, displayText: 'Khoảng cuối năm 1972' },
      birthPlace: 'Quảng Bình',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Đống Đa, Hà Nội',
      occupation: 'Nghệ nhân phục chế đồ gỗ cổ',
      generation: 4,
      branchId: 'branch_giap',
      subBranch: 'Phái Đoài',
      clanRole: 'Thành viên Ban Nghi lễ Từ đường',
      merits: 'Trực tiếp sơn son thếp vàng và bảo dưỡng hoành phi câu đối tại nhà thờ họ.',
      biography:
        'Ông Trần Văn Minh và bà Hoàng Thị Bích nhận nuôi Trần Đức Bảo từ năm 1973 sau chiến tranh. Anh lớn lên trong tình yêu thương trọn vẹn của dòng họ và trở thành nghệ nhân chăm lo nội thất thờ tự của Từ đường.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_16',
      fullName: 'Trần Gia Hưng',
      gender: 'male',
      commonName: 'Anh Hưng Sài Gòn',
      isLiving: true,
      birthDate: { precision: 'exact', day: 15, month: 3, year: 1963 },
      birthPlace: 'Sài Gòn',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Quận 3, TP. Hồ Chí Minh',
      occupation: 'Doanh nhân xuất nhập khẩu nông sản',
      generation: 4,
      branchId: 'branch_binh',
      subBranch: 'Phái Sài Gòn',
      clanRole: 'Trưởng Ban liên lạc Chi Bính',
      merits: 'Tài trợ học bổng khuyến tài hằng năm cho sinh viên xuất sắc toàn dòng họ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_16_sp',
      fullName: 'Lâm Mỹ Dung',
      gender: 'female',
      commonName: 'Chị Dung',
      isLiving: true,
      birthDate: { precision: 'exact', day: 9, month: 9, year: 1966 },
      birthPlace: 'Đà Lạt, Lâm Đồng',
      ancestralHome: 'Đà Lạt, Lâm Đồng',
      residence: 'Quận 3, TP. Hồ Chí Minh',
      occupation: 'Chuyên gia dinh dưỡng',
      generation: 4,
      branchId: 'branch_binh',
      subBranch: 'Phái Sài Gòn',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_17',
      fullName: 'Trần Hữu Khôi',
      gender: 'male',
      commonName: 'Anh Khôi',
      isLiving: true,
      birthDate: { precision: 'exact', day: 28, month: 10, year: 1965 },
      birthPlace: 'Hoàn Kiếm, Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Long Biên, Hà Nội',
      occupation: 'Giảng viên Lịch sử Việt Nam',
      generation: 4,
      branchId: 'branch_at',
      subBranch: 'Phái Bắc',
      clanRole: 'Thư ký Hội đồng Gia tộc · Phụ trách biên khảo phả hệ',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },

    // ==================== ĐỜI THỨ 5 ====================
    {
      id: 'p_18',
      fullName: 'Trần Minh Quân',
      gender: 'male',
      commonName: 'Minh Quân',
      isLiving: true,
      birthDate: { precision: 'exact', day: 11, month: 2, year: 1985 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Nam Từ Liêm, Hà Nội',
      occupation: 'Kỹ sư phần mềm & Lưu trữ số',
      generation: 5,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      clanRole: 'Trưởng tôn Đời thứ 5 · Quản trị gia phả số',
      merits: 'Xây dựng hệ thống lưu trữ gia phả số ngoại tuyến cho toàn dòng họ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: '2026-11-04T01:30:00.000Z',
    },
    {
      id: 'p_18_sp',
      fullName: 'Đỗ Ngọc Lan Anh',
      gender: 'female',
      commonName: 'Lan Anh',
      isLiving: true,
      birthDate: { precision: 'exact', day: 7, month: 6, year: 1988 },
      birthPlace: 'Hải Dương',
      ancestralHome: 'Chí Linh, Hải Dương',
      residence: 'Nam Từ Liêm, Hà Nội',
      occupation: 'Bác sĩ Nhi khoa',
      generation: 5,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_19',
      fullName: 'Trần Minh Châu',
      gender: 'female',
      commonName: 'Minh Châu',
      isLiving: true,
      birthDate: { precision: 'exact', day: 24, month: 9, year: 1991 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Đông Ngạc, Hà Nội',
      occupation: 'Nhà nghiên cứu mỹ thuật cổ',
      generation: 5,
      branchId: 'branch_giap',
      subBranch: 'Phái Đông',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_20',
      fullName: 'Trần Bảo Nam',
      gender: 'male',
      commonName: 'Bảo Nam',
      isLiving: true,
      birthDate: { precision: 'exact', day: 3, month: 4, year: 1995 },
      birthPlace: 'TP. Hồ Chí Minh',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh',
      occupation: 'Chuyên viên Thiết kế Công nghiệp',
      generation: 5,
      branchId: 'branch_binh',
      subBranch: 'Phái Sài Gòn',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_21',
      fullName: 'Trần Ngọc Khánh Linh',
      gender: 'female',
      commonName: 'Khánh Linh',
      isLiving: true,
      birthDate: { precision: 'exact', day: 18, month: 11, year: 2001 },
      birthPlace: 'TP. Hồ Chí Minh',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Quận 3, TP. Hồ Chí Minh',
      occupation: 'Nghiên cứu sinh Văn hóa Đông Nam Á',
      generation: 5,
      branchId: 'branch_binh',
      subBranch: 'Phái Sài Gòn',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'p_22',
      fullName: 'Trần Khôi Nguyên',
      gender: 'male',
      commonName: 'Khôi Nguyên',
      isLiving: true,
      birthDate: { precision: 'exact', day: 14, month: 1, year: 1998 },
      birthPlace: 'Hà Nội',
      ancestralHome: 'Đông Ngạc, Hà Nội',
      residence: 'Long Biên, Hà Nội',
      occupation: 'Kiến trúc sư quy hoạch đô thị',
      generation: 5,
      branchId: 'branch_at',
      subBranch: 'Phái Bắc',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const unions: Union[] = [
    {
      id: 'u_01',
      partnerIds: ['p_01', 'p_01_sp'],
      marriageDate: { precision: 'year', year: 1895 },
      marriagePlace: 'Đông Ngạc, Hà Nội',
      status: 'married',
      marriageOrder: 1,
      notes: 'Hôn lễ truyền thống tại làng Đông Ngạc.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_02a',
      partnerIds: ['p_02', 'p_03'],
      marriageDate: { precision: 'year', year: 1920 },
      marriagePlace: 'Đông Ngạc, Hà Nội',
      status: 'widowed',
      marriageOrder: 1,
      notes: 'Chính thất (bà Nguyễn Thị Lan mất sớm năm 1932).',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_02b',
      partnerIds: ['p_02', 'p_03b'],
      marriageDate: { precision: 'year', year: 1934 },
      marriagePlace: 'Xuân Đỉnh, Hà Nội',
      status: 'married',
      marriageOrder: 2,
      notes: 'Tục huyền (kế thất bà Đặng Thị Nguyệt).',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_04',
      partnerIds: ['p_04', 'p_04_sp'],
      marriageDate: { precision: 'year', year: 1925 },
      marriagePlace: 'Từ Sơn, Bắc Ninh',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_06',
      partnerIds: ['p_06', 'p_06_sp'],
      marriageDate: { precision: 'year', year: 1951 },
      marriagePlace: 'Hà Nội',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_08',
      partnerIds: ['p_08', 'p_08_sp'],
      marriageDate: { precision: 'exact', day: 20, month: 11, year: 1965 },
      marriagePlace: 'Ba Đình, Hà Nội',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_10',
      partnerIds: ['p_10', 'p_10_sp'],
      marriageDate: { precision: 'year', year: 1960 },
      marriagePlace: 'Gia Định, Sài Gòn',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_11',
      partnerIds: ['p_11'],
      status: 'married',
      marriageOrder: 1,
      notes: 'Thông tin người phối ngẫu đang được con cháu cập nhật bổ sung.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_12',
      partnerIds: ['p_12', 'p_12_sp'],
      marriageDate: { precision: 'exact', day: 16, month: 1, year: 1983 },
      marriagePlace: 'Đông Ngạc, Hà Nội',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_16',
      partnerIds: ['p_16', 'p_16_sp'],
      marriageDate: { precision: 'exact', day: 10, month: 12, year: 1992 },
      marriagePlace: 'TP. Hồ Chí Minh',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_17',
      partnerIds: ['p_17'],
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'u_18',
      partnerIds: ['p_18', 'p_18_sp'],
      marriageDate: { precision: 'exact', day: 22, month: 10, year: 2014 },
      marriagePlace: 'Hà Nội',
      status: 'married',
      marriageOrder: 1,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const makeRel = (
    id: string,
    parentId: string,
    childId: string,
    unionId: string | undefined,
    lineageType: Relationship['lineageType'] = 'biological',
    birthOrder?: number,
    notes?: string
  ): Relationship => ({
    id,
    parentId,
    childId,
    unionId,
    lineageType,
    birthOrder,
    notes,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
  });

  const relationships: Relationship[] = [
    // Đời 1 -> Đời 2
    makeRel('r_01', 'p_01', 'p_02', 'u_01', 'biological', 1),
    makeRel('r_02', 'p_01_sp', 'p_02', 'u_01', 'biological', 1),
    makeRel('r_03', 'p_01', 'p_04', 'u_01', 'biological', 2),
    makeRel('r_04', 'p_01_sp', 'p_04', 'u_01', 'biological', 2),
    makeRel('r_05', 'p_01', 'p_05', 'u_01', 'biological', 3),
    makeRel('r_06', 'p_01_sp', 'p_05', 'u_01', 'biological', 3),

    // Đời 2 -> Đời 3
    makeRel('r_07', 'p_02', 'p_06', 'u_02a', 'biological', 1),
    makeRel('r_08', 'p_03', 'p_06', 'u_02a', 'biological', 1),
    makeRel('r_09', 'p_02', 'p_07', 'u_02a', 'biological', 2),
    makeRel('r_10', 'p_03', 'p_07', 'u_02a', 'biological', 2),

    // Kế thất
    makeRel('r_10_step1', 'p_03b', 'p_06', 'u_02b', 'step', 1, 'Mẹ kế nuôi dưỡng từ nhỏ'),
    makeRel('r_10_step2', 'p_03b', 'p_07', 'u_02b', 'step', 2, 'Mẹ kế nuôi dưỡng từ nhỏ'),

    makeRel('r_11', 'p_02', 'p_08', 'u_02b', 'biological', 3),
    makeRel('r_12', 'p_03b', 'p_08', 'u_02b', 'biological', 3),
    makeRel('r_13', 'p_02', 'p_09', 'u_02b', 'biological', 4),
    makeRel('r_14', 'p_03b', 'p_09', 'u_02b', 'biological', 4),

    // Chi Ất
    makeRel('r_15', 'p_04', 'p_10', 'u_04', 'biological', 1),
    makeRel('r_16', 'p_04_sp', 'p_10', 'u_04', 'biological', 1),
    makeRel('r_17', 'p_04', 'p_11', 'u_04', 'biological', 2),
    makeRel('r_18', 'p_04_sp', 'p_11', 'u_04', 'biological', 2),

    // Đời 3 -> Đời 4
    makeRel('r_19', 'p_06', 'p_12', 'u_06', 'biological', 1),
    makeRel('r_20', 'p_06_sp', 'p_12', 'u_06', 'biological', 1),
    makeRel('r_21', 'p_06', 'p_13', 'u_06', 'biological', 2),
    makeRel('r_22', 'p_06_sp', 'p_13', 'u_06', 'biological', 2),

    makeRel('r_23', 'p_08', 'p_14', 'u_08', 'biological', 1),
    makeRel('r_24', 'p_08_sp', 'p_14', 'u_08', 'biological', 1),
    makeRel('r_25', 'p_08', 'p_15', 'u_08', 'adoptive', 2, 'Nhận nuôi năm 1973'),
    makeRel('r_26', 'p_08_sp', 'p_15', 'u_08', 'adoptive', 2, 'Nhận nuôi năm 1973'),

    makeRel('r_27', 'p_10', 'p_16', 'u_10', 'biological', 1),
    makeRel('r_28', 'p_10_sp', 'p_16', 'u_10', 'biological', 1),

    makeRel('r_29', 'p_11', 'p_17', 'u_11', 'biological', 1),

    // Đời 4 -> Đời 5
    makeRel('r_30', 'p_12', 'p_18', 'u_12', 'biological', 1),
    makeRel('r_31', 'p_12_sp', 'p_18', 'u_12', 'biological', 1),
    makeRel('r_32', 'p_12', 'p_19', 'u_12', 'biological', 2),
    makeRel('r_33', 'p_12_sp', 'p_19', 'u_12', 'biological', 2),

    makeRel('r_34', 'p_16', 'p_20', 'u_16', 'biological', 1),
    makeRel('r_35', 'p_16_sp', 'p_20', 'u_16', 'biological', 1),
    makeRel('r_36', 'p_16', 'p_21', 'u_16', 'biological', 2),
    makeRel('r_37', 'p_16_sp', 'p_21', 'u_16', 'biological', 2),

    makeRel('r_38', 'p_17', 'p_22', 'u_17', 'biological', 1),
  ];

  const lifeEvents: LifeEvent[] = [
    {
      id: 'ev_01',
      personId: 'p_01',
      title: 'Mở lớp nghĩa thục tại làng Đông Ngạc',
      type: 'career',
      date: { precision: 'year', year: 1898 },
      location: 'Xóm Chùa, Đông Ngạc, Hà Nội',
      description: 'Dạy chữ Hán Nôm và đạo lý làm người miễn phí cho thanh thiếu niên trong vùng.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_02',
      personId: 'p_01',
      title: 'Chủ trì đại trùng tu Từ đường họ Trần',
      type: 'contribution',
      date: { precision: 'exact', day: 15, month: 10, year: 1924 },
      location: 'Từ đường họ Trần, Đông Ngạc',
      description: 'Dựng lại 3 gian tiền tế bằng gỗ lim và khắc bức hoành phi Thế Đức Truyền Gia.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_03',
      personId: 'p_01',
      title: 'Phiên âm và biên tập bộ Gia phả chữ Quốc ngữ đầu tiên',
      type: 'contribution',
      date: { precision: 'year', year: 1930 },
      location: 'Đông Ngạc, Hà Nội',
      description: 'Chuyển dịch phả ký cổ sang Quốc ngữ để các thế hệ hậu sinh dễ dàng tra cứu.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_04',
      personId: 'p_02',
      title: 'Đưa đại gia đình và hòm gia phả tản cư lên Phú Thọ',
      type: 'migration',
      date: { precision: 'month', month: 12, year: 1946 },
      location: 'Thanh Ba, Phú Thọ',
      description: 'Giữ gìn nguyên vẹn sắc phong và sổ giỗ họ suốt 8 năm kháng chiến.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_05',
      personId: 'p_10',
      title: 'Di cư lập nghiệp tại Sài Gòn – Khởi lập Chi Bính',
      type: 'migration',
      date: { precision: 'year', year: 1955 },
      location: 'Phú Nhuận, Sài Gòn',
      description: 'Mở tiệm kim hoàn Đức Đạt, giữ liên lạc thư từ đều đặn với quê nhà Đông Ngạc.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_06',
      personId: 'p_08',
      title: 'Chủ trì thiết kế tu bổ Từ đường họ Trần theo lối cổ',
      type: 'contribution',
      date: { precision: 'exact', day: 8, month: 3, year: 2008 },
      location: 'Đông Ngạc, Hà Nội',
      description: 'Phục dựng mái ngói mũi hài, sân gạch Bát Tràng và hệ thống cột lim truyền thống.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'ev_07',
      personId: 'p_12',
      title: 'Tổ chức Đại lễ kỷ niệm 100 năm trùng tu Từ đường (1924 – 2024)',
      type: 'contribution',
      date: { precision: 'exact', day: 20, month: 11, year: 2024 },
      location: 'Từ đường họ Trần, Đông Ngạc, Hà Nội',
      description: 'Quy tụ hơn 120 con cháu cả ba chi Bắc – Trung – Nam về dự lễ dâng hương.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const media: Media[] = [
    {
      id: 'media_01',
      title: 'Chân dung Cụ Tổ Trần Văn Lộc (1926)',
      description: 'Bức ảnh chân dung lưu trữ chụp tại hiệu ảnh Lê Văn – Hà Nội khi cụ tròn 54 tuổi.',
      dateLabel: 'Năm 1926',
      category: 'portrait',
      mimeType: 'image/svg+xml',
      dataUrl: svgPatriarch,
      personIds: ['p_01'],
      branchId: 'branch_daiton',
      storyContext:
        'Cụ mặc áo ngũ thân lụa thâm, đội khăn xếp chỉnh tề, tay đặt lên cuốn sách gia huấn vừa biên soạn xong.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'media_02',
      title: 'Chân dung Tổ mẫu Nguyễn Thị Kim (1935)',
      description: 'Ảnh chụp lưu niệm của cụ bà Nguyễn Thị Kim trong trang phục áo dài lụa nâu truyền thống.',
      dateLabel: 'Khoảng năm 1935',
      category: 'portrait',
      mimeType: 'image/svg+xml',
      dataUrl: svgMatriarch,
      personIds: ['p_01_sp'],
      branchId: 'branch_daiton',
      storyContext:
        'Chiếc vòng ngọc thạch cụ đeo trên cổ tay trái sau này được truyền lại cho con dâu trưởng qua các thế hệ.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'media_03',
      title: 'Đại gia đình sum họp đầu xuân Ất Tỵ tại Đông Ngạc (1965)',
      description: 'Bức ảnh quý chụp ba thế hệ quây quần trước hiên nhà cổ 5 gian dịp Tết Nguyên đán.',
      dateLabel: 'Xuân Ất Tỵ 1965',
      category: 'historical_photo',
      mimeType: 'image/svg+xml',
      dataUrl: svgReunion,
      personIds: ['p_02', 'p_03b', 'p_06', 'p_06_sp', 'p_08', 'p_08_sp', 'p_09', 'p_12', 'p_13'],
      branchId: 'branch_giap',
      storyContext:
        'Đây là bức ảnh chụp chung đông đủ cuối cùng có mặt chú Út Trần Văn Tín trước khi chú lên đường nhập ngũ năm 1968.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'media_04',
      title: 'Bản Gia phả cổ chép tay trên giấy dó',
      description: 'Cuốn phả ký gốc chữ Hán Nôm do tiền nhân truyền lại và được cụ Đồ Lộc chú giải năm 1930.',
      dateLabel: 'Cuối thế kỷ XIX – 1930',
      category: 'document',
      mimeType: 'image/svg+xml',
      dataUrl: svgAncientBook,
      personIds: ['p_01', 'p_02', 'p_06', 'p_17'],
      branchId: 'branch_daiton',
      storyContext:
        'Được cất giữ trong tráp gỗ sơn son chống ẩm suốt thời gian tản cư lên Phú Thọ (1946–1954).',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'media_05',
      title: 'Từ đường họ Trần tại làng cổ Đông Ngạc',
      description: 'Không gian sân gạch, phương đình và bức hoành phi Thế Đức Truyền Gia vào buổi sớm mùa thu.',
      dateLabel: 'Năm 2024',
      category: 'historical_photo',
      mimeType: 'image/svg+xml',
      dataUrl: svgAncestralHall,
      personIds: ['p_01', 'p_08', 'p_12', 'p_15'],
      branchId: 'branch_daiton',
      storyContext:
        'Nơi con cháu ba chi hội tụ mỗi dịp Giỗ Tổ 22 tháng Mười Âm lịch và lễ khuyến học rằm tháng Giêng.',
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  const stories: FamilyStory[] = [
    {
      id: 'story_01',
      title: 'Chiếc tráp gỗ sơn son và hành trình giữ Gia phả năm 1946',
      summary: 'Câu chuyện ông Cả Trần Văn Khải gùi hòm gia phả vượt sông Hồng trong đêm đông tản cư.',
      periodLabel: '1946 – 1954',
      personIds: ['p_01', 'p_02', 'p_03b', 'p_06'],
      branchId: 'branch_giap',
      mediaIds: ['media_04'],
      recordedBy: 'Trần Hữu Khôi (ghi theo lời kể của KTS Trần Văn Minh)',
      content: `Cuối tháng Chạp năm 1946, khi tiếng đại bác vang rền phía nội thành Hà Nội, cụ Đồ Lộc tuổi đã cao liền gọi trưởng nam là ông Trần Văn Khải đến bên án thư. Cụ trao chiếc tráp gỗ lim sơn phủ cánh gián, bên trong bọc vải điều giữ cuốn Gia phả giấy dó và năm đạo sắc phong cổ, dặn rằng: "Nhà cửa có thể dựng lại, ruộng vườn còn đất còn người, nhưng mất chữ của tổ tiên là con cháu lạc mất cội nguồn."

Suốt tám năm tản cư nơi đồi cọ Thanh Ba (Phú Thọ), bà Hai Đặng Thị Nguyệt cứ mỗi mùa mưa ngâu lại đem tráp ra hong nắng sớm cùng lá long não để chống mối mọt. Nhờ tấm lòng thành kính ấy, ngày trở về làng Đông Ngạc mùa thu năm 1954, từng trang giấy dó vẫn còn nguyên nét mực tàu sắc sảo.`,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'story_02',
      title: 'Tấm lòng người mẹ kế Đặng Thị Nguyệt và nếp nhà hòa thuận',
      summary: 'Sự gắn kết máu thịt giữa hai dòng con trong gia đình ông Cả Khải.',
      periodLabel: '1934 – 1986',
      personIds: ['p_02', 'p_03', 'p_03b', 'p_06', 'p_07', 'p_08', 'p_09'],
      branchId: 'branch_giap',
      mediaIds: ['media_03'],
      recordedBy: 'Trần Thị Thu Thủy',
      content: `Khi bà Nguyễn Thị Lan lâm bệnh qua đời sớm năm 1932, bác Nghị mới 9 tuổi, cô Mai mới lên 4. Hai năm sau, bà Đặng Thị Nguyệt về làm kế thất. Ngày bước chân qua bậc cửa gỗ nhà họ Trần, việc đầu tiên bà làm là tự tay thắp hương trước bàn thờ người vợ trước của chồng và xin nhận hai con nhỏ làm con đẻ trong lòng.

Những năm đói kém 1945, phần cơm trắng ít ỏi trong nồi đất bao giờ bà cũng xới cho anh Nghị đang tuổi ăn học và bé Tín nhỏ nhất nhà, còn mình ăn độn khoai sắn không một lời than vãn. Bởi thế trong họ Trần Đông Ngạc không bao giờ tồn tại hai tiếng "con chung – con riêng", mà chỉ có một nghĩa tình anh em ruột thịt vẹn tròn.`,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
    {
      id: 'story_03',
      title: 'Nhịp cầu Bắc – Nam của Chi Bính sau bốn mươi năm đoàn tụ',
      summary: 'Chuyến trở về Từ đường Đông Ngạc xúc động của ông Trần Hữu Đạt mùa thu năm 1995.',
      periodLabel: '1955 – 1995',
      personIds: ['p_04', 'p_10', 'p_11', 'p_16'],
      branchId: 'branch_binh',
      mediaIds: ['media_05'],
      recordedBy: 'Trần Gia Hưng',
      content: `Rời phố Hàng Đào vào Sài Gòn lập nghiệp năm 26 tuổi, ông Trần Hữu Đạt luôn đặt trên bàn thờ gia tiên tại Phú Nhuận một nắm đất nhỏ lấy từ gốc cây đại trước cổng làng Đông Ngạc. Hằng năm đúng ngày 22 tháng Mười Âm lịch, dù ở cách xa gần hai nghìn cây số, gia đình Chi Bính đều bày mâm cỗ hướng về phương Bắc vọng bái tổ tiên.

Mùa thu năm 1995, khi dẫn các con cháu miền Nam lần đầu bước qua cổng tam quan Từ đường, ông Đạt chạm tay vào hàng cột gỗ lim do chính cha mình là ông Hai Phúc cung tiến năm xưa mà rưng rưng nước mắt. Từ chuyến đi ấy, Quỹ Khuyến học họ Trần ba miền chính thức ra đời và duy trì bền bỉ đến tận hôm nay.`,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    },
  ];

  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: SEED_TIMESTAMP,
    settings,
    branches,
    people,
    unions,
    relationships,
    lifeEvents,
    media,
    stories,
  };
}
