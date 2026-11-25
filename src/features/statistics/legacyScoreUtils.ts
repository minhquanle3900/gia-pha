import {
  FamilyBranch,
  FamilyStory,
  LifeEvent,
  Media,
  Person,
  Relationship,
  Union,
} from '../../models/genealogy';

export interface ScorePillar {
  id: string;
  name: string;
  description: string;
  score: number; // 0 - 100
  weight: number; // e.g. 0.35
  weightedScore: number;
  completedCount: number;
  totalCount: number;
  status: 'excellent' | 'good' | 'needs_work';
  details: string[];
}

export interface LegacyRecommendation {
  id: string;
  title: string;
  description: string;
  impactPoints: number;
  actionTab?: 'members' | 'gallery' | 'tree' | 'rites';
  targetPersonId?: string;
  category: 'biography' | 'media' | 'milestone' | 'relationship';
}

export interface FamilyLegacyScoreResult {
  overallScore: number; // 0 - 100
  tierName: string;
  tierBadge: string;
  tierColor: string;
  tierDescription: string;
  pillars: ScorePillar[];
  recommendations: LegacyRecommendation[];
  stats: {
    totalPeople: number;
    withBioCount: number;
    withPortraitCount: number;
    withDatesCount: number;
    withTraditionalNamesCount: number;
    totalMedia: number;
    totalStories: number;
    totalMilestones: number;
    totalRelationships: number;
  };
}

export function calculateFamilyLegacyScore(params: {
  people: Person[];
  media: Media[];
  stories: FamilyStory[];
  lifeEvents: LifeEvent[];
  relationships: Relationship[];
  unions: Union[];
  branches: FamilyBranch[];
}): FamilyLegacyScoreResult {
  const { people, media, stories, lifeEvents, relationships, branches } = params;

  const totalPeople = people.length;

  if (totalPeople === 0) {
    return {
      overallScore: 0,
      tierName: 'Khởi Dựng Phả Hệ',
      tierBadge: 'Giai đoạn khởi tạo',
      tierColor: '#8C6D32',
      tierDescription: 'Chưa có thành viên nào được lưu trữ trong gia phả.',
      pillars: [],
      recommendations: [
        {
          id: 'rec_add_first_person',
          title: 'Thêm Thủy Tổ hoặc Trưởng Tộc',
          description: 'Bắt đầu bằng việc ghi danh vị Thủy tổ hoặc các bậc tiền bối đầu tiên của gia phả.',
          impactPoints: 20,
          actionTab: 'members',
          category: 'biography',
        },
      ],
      stats: {
        totalPeople: 0,
        withBioCount: 0,
        withPortraitCount: 0,
        withDatesCount: 0,
        withTraditionalNamesCount: 0,
        totalMedia: 0,
        totalStories: 0,
        totalMilestones: 0,
        totalRelationships: 0,
      },
    };
  }

  // 1. PILLAR 1: BIOGRAPHICAL COMPLETENESS (Weight: 35%)
  let withBioCount = 0;
  let withDatesCount = 0;
  let withTraditionalNamesCount = 0;
  let withPlacesCount = 0;

  for (const p of people) {
    if (p.biography && p.biography.trim().length >= 40) withBioCount++;
    if (p.birthDate?.year) withDatesCount++;
    if (p.commonName || p.tabooName || p.courtesyName || p.alias) withTraditionalNamesCount++;
    if (p.birthPlace || p.ancestralHome || p.burialPlace || p.residence) withPlacesCount++;
  }

  const bioScore = Math.min(100, Math.round((withBioCount / totalPeople) * 100));
  const datesScore = Math.min(100, Math.round((withDatesCount / totalPeople) * 100));
  const namesScore = Math.min(100, Math.round((withTraditionalNamesCount / Math.max(1, Math.min(10, totalPeople))) * 100));
  const placesScore = Math.min(100, Math.round((withPlacesCount / totalPeople) * 100));

  const pillar1Score = Math.round(
    bioScore * 0.4 + datesScore * 0.3 + namesScore * 0.15 + placesScore * 0.15
  );

  const pillar1: ScorePillar = {
    id: 'biography',
    name: 'Tiểu sử & Nhân thân',
    description: 'Độ trọn vẹn của ngày tháng, quê quán, tên chữ và tiểu sử cuộc đời',
    score: pillar1Score,
    weight: 0.35,
    weightedScore: Math.round(pillar1Score * 0.35 * 10) / 10,
    completedCount: withBioCount,
    totalCount: totalPeople,
    status: pillar1Score >= 80 ? 'excellent' : pillar1Score >= 50 ? 'good' : 'needs_work',
    details: [
      `${withBioCount}/${totalPeople} thành viên có văn bản tiểu sử chi tiết`,
      `${withDatesCount}/${totalPeople} thành viên có ghi nhận năm sinh`,
      `${withPlacesCount}/${totalPeople} thành viên có ghi chép quê quán/nơi an táng`,
    ],
  };

  // 2. PILLAR 2: VISUAL & MEDIA ARCHIVING (Weight: 25%)
  let withPortraitCount = 0;
  for (const p of people) {
    if (p.portraitUrl || p.portraitMediaId) withPortraitCount++;
  }

  const portraitRatioScore = Math.min(100, Math.round((withPortraitCount / totalPeople) * 100));
  // Total media assets: 10+ media gives 100 score on media volume
  const mediaVolumeScore = Math.min(100, Math.round((media.length / 8) * 100));

  const pillar2Score = Math.round(portraitRatioScore * 0.6 + mediaVolumeScore * 0.4);

  const pillar2: ScorePillar = {
    id: 'media',
    name: 'Kho ảnh & Kỷ vật di sản',
    description: 'Tỷ lệ chân dung thành viên và kho tư liệu sắc phong, tư liệu lịch sử',
    score: pillar2Score,
    weight: 0.25,
    weightedScore: Math.round(pillar2Score * 0.25 * 10) / 10,
    completedCount: withPortraitCount,
    totalCount: totalPeople,
    status: pillar2Score >= 80 ? 'excellent' : pillar2Score >= 50 ? 'good' : 'needs_work',
    details: [
      `${withPortraitCount}/${totalPeople} thành viên có ảnh chân dung`,
      `${media.length} tư liệu, ảnh lịch sử trong kho kỷ vật`,
    ],
  };

  // 3. PILLAR 3: HISTORICAL MILESTONES & MEMORY STORIES (Weight: 25%)
  // Clan milestones and stories: 10 milestones/stories gives 100%
  const milestoneScore = Math.min(100, Math.round((lifeEvents.length / 6) * 100));
  const storyScore = Math.min(100, Math.round((stories.length / 4) * 100));
  const pillar3Score = Math.round(milestoneScore * 0.55 + storyScore * 0.45);

  const pillar3: ScorePillar = {
    id: 'milestones',
    name: 'Cột mốc & Ký ức truyền đời',
    description: 'Các sự kiện lịch sử, di cư, trùng tu và câu chuyện dòng họ',
    score: pillar3Score,
    weight: 0.25,
    weightedScore: Math.round(pillar3Score * 0.25 * 10) / 10,
    completedCount: lifeEvents.length + stories.length,
    totalCount: 10,
    status: pillar3Score >= 80 ? 'excellent' : pillar3Score >= 50 ? 'good' : 'needs_work',
    details: [
      `${lifeEvents.length} cột mốc lịch sử và ngày lễ kỵ`,
      `${stories.length} câu chuyện ký ức truyền đời`,
    ],
  };

  // 4. PILLAR 4: KINSHIP & LINEAGE COHESION (Weight: 15%)
  // Parent-child relationships vs people
  const relRatio = Math.min(100, Math.round((relationships.length / Math.max(1, totalPeople - 1)) * 100));
  const branchBonus = branches.length >= 2 ? 100 : branches.length === 1 ? 75 : 40;
  const pillar4Score = Math.round(relRatio * 0.7 + branchBonus * 0.3);

  const pillar4: ScorePillar = {
    id: 'kinship',
    name: 'Mạng lưới gia tộc',
    description: 'Sự liên kết huyết thống, phân bổ chi phái và cây gia phả liền mạch',
    score: pillar4Score,
    weight: 0.15,
    weightedScore: Math.round(pillar4Score * 0.15 * 10) / 10,
    completedCount: relationships.length,
    totalCount: totalPeople,
    status: pillar4Score >= 80 ? 'excellent' : pillar4Score >= 50 ? 'good' : 'needs_work',
    details: [
      `${relationships.length} mối liên kết cha mẹ - con cái`,
      `${branches.length} chi họ trực thuộc được xác lập`,
    ],
  };

  const pillars = [pillar1, pillar2, pillar3, pillar4];

  // Overall Composite Score
  const rawOverall = pillars.reduce((sum, p) => sum + p.score * p.weight, 0);
  const overallScore = Math.min(100, Math.max(0, Math.round(rawOverall)));

  // Tier Classification
  let tierName = '';
  let tierBadge = '';
  let tierColor = '';
  let tierDescription = '';

  if (overallScore >= 88) {
    tierName = 'Bảo Tàng Gia Tộc Hoàng Kim';
    tierBadge = 'Cấp độ Tối Cao';
    tierColor = '#C19B4C';
    tierDescription = 'Gia phả được bảo tồn xuất sắc, tư liệu sâu sắc, hình ảnh và ký sự vẹn toàn chuẩn mực.';
  } else if (overallScore >= 72) {
    tierName = 'Gia Phong Hưng Thịnh';
    tierBadge = 'Cấp độ Toàn Diện';
    tierColor = '#1B3B2B';
    tierDescription = 'Hồ sơ các thế hệ rất đầy đủ, lưu giữ phong phú về tiểu sử, kỷ vật và cột mốc lịch sử.';
  } else if (overallScore >= 55) {
    tierName = 'Cội Nguồn Vững Chắc';
    tierBadge = 'Cấp độ Chuẩn';
    tierColor = '#286248';
    tierDescription = 'Cây phả hệ liên kết tốt, đang trong quá trình bồi đắp thêm tiểu sử và hình ảnh chân dung.';
  } else {
    tierName = 'Khởi Dựng Phả Hệ';
    tierBadge = 'Cấp độ Khởi Tạo';
    tierColor = '#8A5A2B';
    tierDescription = 'Cần bổ sung thêm tiểu sử nhân vật, ảnh tư liệu và sự kiện dòng họ để hoàn thiện hồ sơ.';
  }

  // Actionable Recommendations
  const recommendations: LegacyRecommendation[] = [];

  // Find people missing biographies
  const peopleWithoutBio = people.filter((p) => !p.biography || p.biography.trim().length < 20);
  if (peopleWithoutBio.length > 0) {
    const target = peopleWithoutBio[0];
    recommendations.push({
      id: 'rec_bio',
      title: `Soạn tiểu sử cho ${target.fullName}`,
      description: `Còn ${peopleWithoutBio.length} thành viên chưa có văn bản tiểu sử. Hãy sử dụng gợi ý AI để biên soạn nhanh chóng.`,
      impactPoints: 8,
      actionTab: 'members',
      targetPersonId: target.id,
      category: 'biography',
    });
  }

  // Find people missing portrait photos
  const peopleWithoutPhoto = people.filter((p) => !p.portraitUrl && !p.portraitMediaId);
  if (peopleWithoutPhoto.length > 0) {
    const target = peopleWithoutPhoto[0];
    recommendations.push({
      id: 'rec_photo',
      title: `Thêm ảnh chân dung cho ${target.fullName}`,
      description: `Còn ${peopleWithoutPhoto.length} thành viên chưa có chân dung đại diện để lưu truyền muôn đời.`,
      impactPoints: 6,
      actionTab: 'members',
      targetPersonId: target.id,
      category: 'media',
    });
  }

  // Check milestones
  if (lifeEvents.length < 4) {
    recommendations.push({
      id: 'rec_milestone',
      title: 'Ghi chép thêm Cột mốc lịch sử dòng họ',
      description: 'Ghi lại các mốc di cư, xây dựng từ đường, công đức hoặc sự kiện đoàn tụ gia tộc.',
      impactPoints: 7,
      actionTab: 'dashboard' as any,
      category: 'milestone',
    });
  }

  // Check family stories
  if (stories.length < 3) {
    recommendations.push({
      id: 'rec_story',
      title: 'Lưu giữ Ký ức & Câu chuyện truyền đời',
      description: 'Ghi lại lời răn gia huấn, giai thoại dòng họ hoặc kỷ niệm thời hoa lửa của tiền nhân.',
      impactPoints: 5,
      actionTab: 'dashboard' as any,
      category: 'milestone',
    });
  }

  return {
    overallScore,
    tierName,
    tierBadge,
    tierColor,
    tierDescription,
    pillars,
    recommendations: recommendations.slice(0, 3), // top 3 recommendations
    stats: {
      totalPeople,
      withBioCount,
      withPortraitCount,
      withDatesCount,
      withTraditionalNamesCount,
      totalMedia: media.length,
      totalStories: stories.length,
      totalMilestones: lifeEvents.length,
      totalRelationships: relationships.length,
    },
  };
}
