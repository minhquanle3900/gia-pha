export type Gender = 'male' | 'female' | 'unknown';

export type DatePrecision = 'exact' | 'month' | 'year' | 'approx' | 'before' | 'after' | 'unknown';

export interface FlexibleDate {
  precision: DatePrecision;
  year?: number;
  month?: number;
  day?: number;
  displayText?: string;
  calendar?: 'solar' | 'lunar';
}

export interface LunarAnniversary {
  day?: number;
  month?: number;
  note?: string;
}

export type LineageType = 'biological' | 'adoptive' | 'step' | 'unknown';

export type UnionStatus = 'married' | 'widowed' | 'divorced' | 'separated' | 'unknown';

export type LifeEventType =
  | 'birth'
  | 'education'
  | 'marriage'
  | 'career'
  | 'migration'
  | 'contribution'
  | 'death'
  | 'other';

export type MediaCategory =
  | 'portrait'
  | 'historical_photo'
  | 'document'
  | 'letter'
  | 'certificate'
  | 'record'
  | 'audio';

export interface Person {
  id: string;
  // Identity
  fullName: string;
  gender: Gender;
  portraitMediaId?: string;
  portraitUrl?: string;
  commonName?: string; // Tên thường gọi
  tabooName?: string; // Tên húy
  courtesyName?: string; // Tên tự / Tên hiệu
  alias?: string; // Bí danh

  // Life information
  isLiving: boolean;
  birthDate?: FlexibleDate;
  birthPlace?: string;
  deathDate?: FlexibleDate;
  deathPlace?: string;
  ancestralHome?: string; // Nguyên quán
  residence?: string; // Nơi cư trú
  occupation?: string; // Nghề nghiệp
  biography?: string; // Tiểu sử
  notes?: string; // Ghi chú

  // Vietnamese genealogy fields
  generation?: number; // Đời thứ
  branchId?: string; // Chi chính
  secondaryBranchIds?: string[]; // Liên kết đa chi (nếu có)
  subBranch?: string; // Phái
  clanRole?: string; // Vai vế trong dòng họ
  deathAnniversaryLunar?: LunarAnniversary; // Ngày giỗ âm lịch
  burialPlace?: string; // Nơi an táng / Mộ phần
  merits?: string; // Công đức / Đóng góp cho dòng họ

  createdAt: string;
  updatedAt: string;
}

export interface Union {
  id: string;
  partnerIds: string[]; // 1 hoặc 2 thành viên
  marriageDate?: FlexibleDate;
  marriagePlace?: string;
  status: UnionStatus;
  marriageOrder?: number; // Thứ tự hôn phối
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relationship {
  id: string;
  parentId: string;
  childId: string;
  unionId?: string;
  lineageType: LineageType;
  birthOrder?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LifeEvent {
  id: string;
  personId: string;
  title: string;
  type: LifeEventType;
  date?: FlexibleDate;
  location?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  title: string;
  description?: string;
  dateLabel?: string;
  category: MediaCategory;
  mimeType: string;
  dataUrl: string;
  fileName?: string;
  fileSize?: number;
  personIds: string[];
  branchId?: string;
  storyContext?: string;
  createdAt: string;
  updatedAt: string;
}

// The form keeps this in memory until the person and image can be saved together.
export type PortraitDraft = Pick<Media, 'dataUrl' | 'mimeType'>;

export interface FamilyStory {
  id: string;
  title: string;
  summary?: string;
  content: string;
  periodLabel?: string;
  personIds: string[];
  branchId?: string;
  mediaIds: string[];
  recordedBy?: string;
  category?:
    | 'historical_event'
    | 'clan_memory'
    | 'communal_rule'
    | 'renovation_merit'
    | 'general_note';
  location?: string;
  isPinned?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FamilyBranch {
  id: string;
  name: string;
  code: string;
  founderId?: string;
  parentBranchId?: string;
  subBranches: string[];
  originPlace?: string;
  description?: string;
  establishedPeriod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  clanName: string;
  clanMotto: string;
  ancestralHallLocation: string;
  rootPersonId?: string;
  schemaVersion: number;
  lastBackupAt?: string;
  updatedAt: string;
}

export interface GenealogyDatabaseSnapshot {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  settings: AppSettings;
  branches: FamilyBranch[];
  people: Person[];
  unions: Union[];
  relationships: Relationship[];
  lifeEvents: LifeEvent[];
  media: Media[];
  stories: FamilyStory[];
}

export type NavigationTab =
  | 'dashboard'
  | 'stats'
  | 'tree'
  | 'members'
  | 'gallery'
  | 'rites'
  | 'journal'
  | 'book'
  | 'map'
  | 'data';

export type TreeViewMode =
  | 'full'
  | 'descendant'
  | 'ancestor'
  | 'individual'
  | 'generation'
  | 'branch';
