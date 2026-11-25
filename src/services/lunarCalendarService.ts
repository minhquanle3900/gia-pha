import { LunarAnniversary, Person } from '../models/genealogy';

export interface PrayerTemplate {
  id: string;
  title: string;
  category: 'ancestor' | 'chief' | 'regular' | 'tomb' | 'festival';
  targetRitual: string;
  regionalNotes?: string;
  text: string;
}

export interface UpcomingAnniversaryInfo {
  person: Person;
  lunarDay: number;
  lunarMonth: number;
  lunarNote?: string;
  solarDate: Date;
  daysRemaining: number;
  isPassedThisYear: boolean;
  canChiYear: string;
}

const CAN_LIST = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI_LIST = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
];

export function getCanChiYear(year: number): string {
  const can = CAN_LIST[(year + 6) % 10];
  const chi = CHI_LIST[(year + 8) % 12];
  return `${can} ${chi}`;
}

/**
 * Approximate Solar Date calculation for Vietnamese Lunar Anniversary
 * (Lunar calendar typically lags Solar calendar by 28 - 45 days)
 */
export function estimateSolarDateForLunarAnniversary(
  lunarDay: number,
  lunarMonth: number,
  solarYear: number
): Date {
  // Approximate offset for Vietnamese lunar calendar
  // Month 1 lunar ~ late Jan / Feb
  // Month 12 lunar ~ late Dec / Jan
  const baseDay = Math.min(Math.max(lunarDay, 1), 30);
  const baseMonth = Math.min(Math.max(lunarMonth, 1), 12);

  // Standard month length in days roughly ~30 days
  const approxLunarDayOfYear = (baseMonth - 1) * 29.53 + baseDay;
  // Lunar New Year typically begins between Jan 21 and Feb 20 (average Feb 3, day 34 of solar year)
  const tetDayOfYear = 34;
  const solarDayOfYear = Math.round(tetDayOfYear + approxLunarDayOfYear);

  const solarDate = new Date(solarYear, 0, 1);
  solarDate.setDate(solarDate.getDate() + solarDayOfYear - 1);
  return solarDate;
}

/**
 * Calculates upcoming death anniversaries with countdown days
 */
export function calculateUpcomingAnniversaries(
  people: Person[],
  referenceDate: Date = new Date()
): UpcomingAnniversaryInfo[] {
  const currentYear = referenceDate.getFullYear();
  const todayMs = referenceDate.setHours(0, 0, 0, 0);

  const results: UpcomingAnniversaryInfo[] = [];

  for (const p of people) {
    if (p.isLiving || !p.deathAnniversaryLunar) continue;
    const { day, month, note } = p.deathAnniversaryLunar;
    if (!day || !month) continue;

    // Estimate for current solar year
    let estDate = estimateSolarDateForLunarAnniversary(day, month, currentYear);
    estDate.setHours(0, 0, 0, 0);

    let daysRemaining = Math.round((estDate.getTime() - todayMs) / (1000 * 60 * 60 * 24));
    let isPassed = false;

    // If passed by more than 15 days, estimate for next year
    if (daysRemaining < -15) {
      estDate = estimateSolarDateForLunarAnniversary(day, month, currentYear + 1);
      estDate.setHours(0, 0, 0, 0);
      daysRemaining = Math.round((estDate.getTime() - todayMs) / (1000 * 60 * 60 * 24));
      isPassed = true;
    }

    results.push({
      person: p,
      lunarDay: day,
      lunarMonth: month,
      lunarNote: note,
      solarDate: estDate,
      daysRemaining,
      isPassedThisYear: isPassed,
      canChiYear: getCanChiYear(estDate.getFullYear()),
    });
  }

  // Sort by daysRemaining ascending (nearest first)
  results.sort((a, b) => a.daysRemaining - b.daysRemaining);
  return results;
}

export type VietnameseRegion = 'north' | 'central' | 'south';

export interface RegionalRiteGuide {
  region: VietnameseRegion;
  regionName: string;
  subTitle: string;
  kinshipTerms: {
    father: string;
    mother: string;
    grandfather: string;
    grandmother: string;
    elderBrother: string;
    uncle: string;
  };
  customRituals: string[];
  traditionalDishes: string[];
  altarArrangementTips: string[];
}

export const REGIONAL_RITE_GUIDES: Record<VietnameseRegion, RegionalRiteGuide> = {
  north: {
    region: 'north',
    regionName: 'Miền Bắc (Đồng Bằng Bắc Bộ & Kinh Kỳ)',
    subTitle: 'Nghi thức Nho giáo trang trọng, chuẩn mực tứ trụ gia phong',
    kinshipTerms: {
      father: 'Cha / Thầy',
      mother: 'Mẹ / U / Bu',
      grandfather: 'Ông nội / Ông ngoại',
      grandmother: 'Bà nội / Bà ngoại',
      elderBrother: 'Anh cả / Anh trưởng',
      uncle: 'Bác / Chú',
    },
    customRituals: [
      'Trưởng nam hoặc Tộc trưởng chủ trì toàn bộ nghi thức dâng hương khai sắc',
      'Phân định rạch ròi: Giỗ đầu (Tiểu tường - 1 năm), Giỗ hết (Đại tường - 2 năm), Giỗ thường (Cát kỵ - hàng năm)',
      'Lễ yết kiến gia tiên từ tinh mơ sáng, dâng hương 3 tuần rượu, 1 tuần trà',
      'Đọc văn khấn theo tứ thời tiết lệnh, con cháu trang nghiêm đứng sau chủ lễ',
    ],
    traditionalDishes: [
      'Gà trống hoa thiến luộc nguyên con ngậm bông hoa hồng đỏ thắm',
      'Xôi gấc đỏ son tượng trưng cho may mắn, thịnh vượng bền lâu',
      'Giò lụa truyền thống thái hoa chanh hoặc chả quế thơm lừng',
      'Nem rán giòn rụm nhân thịt nấm mộc nhĩ hương vị Hà Thành',
      'Bát canh bóng bì thập cẩm hoa lơ, nấm hương, đậu Hà Lan',
      'Bát miến dong nấu lòng mề gà hoặc canh măng mực Bát Tràng',
    ],
    altarArrangementTips: [
      'Nguyên tắc "Đông bình Tây quả" (Bình hoa hướng Đông, mâm ngũ quả hướng Tây)',
      'Bát hương tổ ở chính giữa cao nhất, hai bên đặt đèn nến hoặc đôi hạc đồng chầu',
      'Mâm cỗ mặn đặt ở bàn phụ phía dưới, trên hương án chính chỉ dâng hoa tươi quả ngọt và vàng mã',
    ],
  },
  central: {
    region: 'central',
    regionName: 'Miền Trung (Xứ Huế & Cố Đô)',
    subTitle: 'Cổ kính thâm nghiêm, đượm nét cung đình và phong vị tổ tiên',
    kinshipTerms: {
      father: 'Thân phụ / Ba / Thầy',
      mother: 'Thân mẫu / Mạ / Mẹ',
      grandfather: 'Ông nội / Cố nội',
      grandmother: 'Bà nội / Mệ nội',
      elderBrother: 'Anh đầu / Anh hai',
      uncle: 'Bác / Cậu / Chú',
    },
    customRituals: [
      'Lễ Tiên Thường bắt buộc: cúng cáo chiều hôm trước ngày giỗ chính để rước vong linh tổ tiên',
      'Lễ Chánh Kỵ tổ chức trang trọng vào sáng ngày hôm sau',
      'Nghi thức dâng 3 tuần rượu, đọc chúc văn bằng giọng trầm ấm kính cẩn',
      'Con cháu sum họp đông đủ dâng hương theo đúng thứ bậc chi phái gia tộc',
    ],
    traditionalDishes: [
      'Bánh chưng gù hoặc bánh tét dẻo xanh nhân đậu thịt đậm đà',
      'Nem tré Huế chua thanh gói lá chuối kèm tỏi ớt truyền thống',
      'Đĩa thịt heo luộc thái mỏng chấm tôm chua xứ Huế kẹp vả',
      'Canh sen hầm củ sen bùi béo thanh đạm hương vị hoàng gia',
      'Xôi vò đậu xanh hạt tơi vàng óng ăn kèm chè hoa cau',
      'Cá lóc nướng trui hoặc thịt kho rệu mềm thơm đậm đà',
    ],
    altarArrangementTips: [
      'Đặt bài vị hoặc di ảnh ở vị trí trung tâm, thắp trầm hương nén nức mùi thơm linh thiêng',
      'Đĩa cau trầu tiêm cánh phượng và chén nước trong thanh tịnh',
      'Hai cây đèn dầu hoặc nến sáp ong thắp sáng suốt thời gian cúng giỗ',
    ],
  },
  south: {
    region: 'south',
    regionName: 'Miền Nam (Nam Bộ Sông Nước)',
    subTitle: 'Hiếu thảo hào sảng, gắn kết keo sơn dòng họ và láng giềng',
    kinshipTerms: {
      father: 'Tía / Ba / Cha',
      mother: 'Má / Mẹ',
      grandfather: 'Ông nội / Ông ngoại',
      grandmother: 'Bà nội / Bà ngoại',
      elderBrother: 'Anh Hai',
      uncle: 'Bác / Chú / Cậu',
    },
    customRituals: [
      'Đám giỗ vừa là ngày tưởng nhớ vừa là ngày sum họp đại gia đình và thết đãi chòm xóm thân tình',
      'Nghi thức mở đầu bằng tuần hương bái lạy tạ ơn Tiên tổ đã khai khẩn đất phương Nam',
      'Con cháu tề tựu cùng nhau nấu nướng rôm rả từ ngày hôm trước',
      'Cúng đất đai, thần linh bản thổ trước khi cúng bái gia tiên tiền tổ',
    ],
    traditionalDishes: [
      'Món Hầm: Canh khổ qua dồn thịt heo với ước nguyện "cái khổ qua đi, cái may mắn tới"',
      'Món Kho: Thịt kho tàu hột vịt nước dừa xiêm béo ngậy thơm lừng',
      'Món Luộc: Thịt ba rọi luộc xắt mỏng cuốn bánh tráng rau rừng chấm mắm nêm',
      'Món Xào: Tôm sú xào ngó sen, bông điên điển hoặc rau củ giòn ngọt',
      'Mâm trái cây ngũ quả "Cầu - Sung - Dừa - Đủ - Xoài" cầu thịnh vượng',
      'Bánh tét miền Tây dẻo thơm hạt nếp gói nhân chuối hoặc nhân thịt mỡ',
    ],
    altarArrangementTips: [
      'Bàn thờ gia tiên trang hoàng tươi tắn, cắm hoa huệ trắng hoặc hoa vạn thọ đại đóa',
      'Chưng đĩa trái cây Nam Bộ tươi ngon sum sê, bình trà sen và ly rượu đế thơm nồng',
      'Bày biện các món cúng trên bàn dài ấm cúng, thân mật',
    ],
  },
};

export const TRADITIONAL_PRAYERS: PrayerTemplate[] = [
  {
    id: 'prayer_thuy_to',
    title: 'Văn Khấn Thủy Tổ & Tiên Hiền Dòng Tộc (Đại Lễ Tế Tổ)',
    category: 'ancestor',
    targetRitual: 'Dành cho ngày Giỗ Tổ toàn dòng họ, ngày Tế xuân rằm tháng Giêng',
    regionalNotes: 'Dành cho Trưởng tộc, Tộc biểu đứng chủ lễ trước Nhà thờ tổ / Từ đường',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
 Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
 Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần cai quản nơi này.
 
 Con kính lạy Đức Thủy Tổ họ {CLAN_NAME}, chư vị Tiên tổ, chư vị Hương linh nội ngoại tôn thân.
 
 Hôm nay là ngày {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Tín chủ con là: {REPRESENTATIVE_NAME}.
 Đại diện cho toàn thể con cháu nội ngoại dòng họ {CLAN_NAME}.
 Hiện ngụ tại: {HALL_LOCATION}.
 
 Nhân tiết ngày Tế tự Thủy tổ Tiên hiền, con cháu ghi nhớ công đức trời biển của các bậc Tiên tổ đã khai sơn lập địa, gây dựng nền móng vẻ vang cho dòng họ.
 
 Chúng con kính cẩn sắm sửa hương hoa, trà quả, kim ngân, trầu cau, thanh đơn trà quả, phù tửu phù kê, kính dâng trước án tiền.
 
 Kính mời Đức Thủy Tổ, chư vị Tiên linh hiển ứng, giáng phó Từ đường, chứng giám lòng thành, thụ hưởng lễ vật.
 
 Cúi xin chư vị Tiên tổ phù hộ độ trì cho toàn thể con cháu họ {CLAN_NAME} muôn đời hưng thịnh, trong ấm ngoài êm, thế hệ rạng danh, đỗ đạt thành tài, đoàn kết thương yêu, giữ tròn gia phong lễ nghĩa.
 
 Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin chứng giám soi xét.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
  {
    id: 'prayer_truong_toc',
    title: 'Văn Khấn Cúng Giỗ Trưởng Tộc / Trưởng Chi (Miền Bắc)',
    category: 'chief',
    targetRitual: 'Dành cho ngày giỗ các bậc Trưởng tộc, Trưởng chi rường cột',
    regionalNotes: 'Nghi thức trang nghiêm, đọc trước mâm lễ chính chi tộc',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con lạy chín phương Trời, mười phương Chư Phật.
 Con kính lạy Chư vị Thần linh cai quản bản xứ.
 Con kính lạy chư vị Hương linh dòng họ {CLAN_NAME}.
 
 Hôm nay là ngày {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Con cháu chúng con kính cẩn làm lễ Chính kỵ / Cát kỵ cho:
 Chân linh: {ANCESTOR_NAME}
 Vai vế trong tộc: {ANCESTOR_ROLE}
 Đời thứ: {ANCESTOR_GEN} thuộc họ {CLAN_NAME}.
 
 Nhớ khi sinh thời, người giữ tròn đạo hiếu, gánh vác việc họ, vun đắp cơ nghiệp cho thế hệ mai sau. Nay ngày giỗ về, âm dương cách trở, ơn sâu khôn xiết.
 
 Con cháu tề tựu sắm mâm cỗ mặn, hương thơm hoa quả, kính dâng linh tọa.
 
 Kính thỉnh Chân linh {ANCESTOR_NAME} giáng lâm trước án, thụ hưởng lễ vật, độ trì cho con cháu bình an, mạnh khỏe, hiếu thuận, làm rạng danh tiên tổ.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
  {
    id: 'prayer_thuong_nien',
    title: 'Văn Khấn Cúng Giỗ Thường Tiền Nhân (Cát Kỵ - Chung 3 Miền)',
    category: 'regular',
    targetRitual: 'Dành cho ngày giỗ ông bà, cha mẹ tại tư gia hoặc chi họ',
    regionalNotes: 'Thích hợp cho lễ cúng giỗ thường niên trong gia đình người Việt',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con kính lạy Thần linh, Thổ địa, Táo quân cai quản trong gia xứ.
 Con kính lạy vong linh Tiên tổ, Ông bà, Cha mẹ nội ngoại.
 
 Hôm nay là ngày giỗ {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Tín chủ con là: {REPRESENTATIVE_NAME}.
 Ngụ tại: {RESIDENCE_LOCATION}.
 
 Thành tâm dâng nén tâm hương, mâm cơm đạm bạc kính mời vong linh:
 {ANCESTOR_NAME} ({ANCESTOR_ROLE})
 
 Cúi xin người về trước linh sàng, chứng giám tấc lòng thành kính của con cháu, thụ hưởng lễ vật, ban phúc lộc an lành cho toàn gia quyến.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
  {
    id: 'prayer_mien_trung_tien_thuong',
    title: 'Văn Khấn Lễ Tiên Thường (Cúng Chiều Chiều Trước Giỗ - Miền Trung)',
    category: 'regular',
    targetRitual: 'Dành cho lễ Tiên Thường cúng vào chiều trước ngày giỗ chính tại Huế và Miền Trung',
    regionalNotes: 'Phong tục cung đình & cổ truyền Xứ Huế - rước tiên linh về hưởng giỗ',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con kính lạy Bản cảnh Thành hoàng, Thổ địa chư vị Tôn thần cai quản chốn này.
 Con kính cẩn bái lạy chư vị Cửu Huyền Thất Tổ nội ngoại tiên linh.
 
 Nay nhân tiết trước ngày Chánh kỵ, buổi chiều hôm nay ngày {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Tín chủ chúng con là: {REPRESENTATIVE_NAME}.
 Cùng toàn thể con cháu gia quyến ngụ tại: {RESIDENCE_LOCATION}.
 
 Cung kính thiết lập lễ nghi Tiên Thường, dâng hương hoa trà tửu, kính thỉnh Chân linh:
 {ANCESTOR_NAME} ({ANCESTOR_ROLE})
 
 Cúi xin người rước phó linh sàng, về trước án tọa hưởng lễ mọn lòng son, chứng tri hiếu đạo của con cháu, chuẩn bị cho ngày Chánh kỵ trang nghiêm thanh khiết.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
  {
    id: 'prayer_mien_nam_dam_gio',
    title: 'Văn Khấn Đám Giỗ Gia Tiên Nam Bộ (Ấm Tình Hiếu Nghĩa)',
    category: 'regular',
    targetRitual: 'Dành cho ngày đám giỗ tại miền Nam và đồng bằng sông Cửu Long',
    regionalNotes: 'Phong tục mộc mạc chí hiếu, gắn kết bà con chòm xóm Nam Bộ',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con kính lạy Phật Trời, chư vị Thần linh, Thổ Địa, Tiền chủ Hậu chủ đất phương Nam.
 Con kính lạy Ông Bà, Cha Mẹ, Tiên linh cửu tộc họ {CLAN_NAME}.
 
 Hôm nay nhằm ngày giỗ {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Con cháu tề tựu tại: {RESIDENCE_LOCATION}.
 Đại diện gia quyến là: {REPRESENTATIVE_NAME}.
 
 Chúng con sửa soạn mâm cơm nghĩa tình dâng cúng lên vong linh:
 {ANCESTOR_NAME} ({ANCESTOR_ROLE} - Đời {ANCESTOR_GEN})
 
 Ơn sinh thành dưỡng dục tựa biển trời, con cháu phương Nam muôn đời không quên. Kính thỉnh người về hưởng bát cơm thơm, ly rượu nghĩa, phù hộ độ trì cho con cháu mần ăn phát đạt, trong ấm ngoài êm, mạnh giỏi bình an.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
  {
    id: 'prayer_thanh_minh',
    title: 'Văn Khấn Tiết Thanh Minh & Tảo Mộ Tiên Tộc',
    category: 'tomb',
    targetRitual: 'Dành cho lễ Tảo mộ, dọn dẹp phần mộ tổ tiên tháng 3 Âm lịch',
    regionalNotes: 'Đọc trước phần mộ gia tộc và lăng miếu dòng họ',
    text: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)
 
 Con kính lạy Hậu Thổ, Thần Linh, Chúa Đất nơi nghĩa trang dòng tộc {CLAN_NAME}.
 Con kính lạy chư vị Tiên linh đang an nghỉ nơi mộ phần.
 
 Hôm nay nhân tiết Thanh Minh, ngày {LUNAR_DATE}, năm {CAN_CHI_YEAR}.
 Con cháu dòng họ {CLAN_NAME} quy tụ về chốn nghĩa trang, đắp sửa nấm mồ, phát quang cỏ dại, thắp nén tâm hương.
 
 Kính cáo các bậc Tiên linh: Chúng con luôn khắc ghi công ơn dưỡng dục sinh thành, dù đi bốn phương trời vẫn một lòng hướng về cội rễ.
 
 Cúi xin chư vị Tiên linh yên nghỉ nơi chín suối, chứng giám lòng hiếu thảo, phù hộ cho gia tộc vạn sự bình an.
 
 Nam mô A Di Đà Phật! (3 lần, 3 lạy)`,
  },
];

/**
 * Standard Rite Preparation Checklist (Danh mục chuẩn bị Lễ giỗ gia tộc)
 */
export const RITE_PREPARATION_CHECKLIST = [
  {
    id: 'chk_1',
    category: 'Lễ Vật Hương Hoa',
    task: 'Chuẩn bị hương thơm, nến/đèn dầu, hoa tươi (hoa huệ, hoa cúc vàng), đĩa ngũ quả tươi tắn',
  },
  {
    id: 'chk_2',
    category: 'Lễ Vật Hương Hoa',
    task: 'Trầu cau tươi (lá trầu, quả cau nguyên cuống), vàng mã gia tiên, tiền vàng nghi lễ',
  },
  {
    id: 'chk_3',
    category: 'Mâm Cỗ Cúng',
    task: 'Mâm cỗ mặn truyền thống: Gà trống hoa luộc nguyên con ngậm hoa hồng, xôi gấc/xôi đỗ, giò lụa, nem rán',
  },
  {
    id: 'chk_4',
    category: 'Mâm Cỗ Cúng',
    task: 'Bát canh bóng thập cẩm/canh măng miến sườn, đĩa xào lòng mề miến, đĩa rau xào',
  },
  {
    id: 'chk_5',
    category: 'Từ Đường & Khách',
    task: 'Bao sái, lau dọn bàn thờ tổ, lư đồng, bát hương gia tiên từ ngày hôm trước',
  },
  {
    id: 'chk_6',
    category: 'Từ Đường & Khách',
    task: 'Liên hệ đón tiếp các bậc cao niên, các chi phái ở xa và thông báo thời gian dâng hương tế lễ',
  },
];
