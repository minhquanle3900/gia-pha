# Data Model: Gia Phả Việt – Cội Nguồn

Tài liệu này định nghĩa mô hình dữ liệu (Data Architecture) cho ứng dụng **Gia Phả Việt – Cội Nguồn**. Mô hình được thiết kế theo hướng **Local-First (IndexedDB)**, chuẩn hóa quan hệ (Normalized Relational Graph), và tương thích đầy đủ với các yêu cầu đặc thù của văn hóa phả hệ và dòng họ Việt Nam (Đời thứ, Chi, Phái, Vai vế, Tên húy, Tên tự, Ngày giỗ âm lịch, Công đức...).

---

## 1. Tổng quan Kiến trúc Dữ liệu

Ứng dụng sử dụng mô hình thực thể quan hệ tách biệt, đảm bảo:
- **Tính chuẩn hóa (Normalized)**: Không sao chép lặp lại thông tin dòng họ giữa các thành viên. Quan hệ huyết thống (`Relationship`) và hôn phối (`Union`) được lưu riêng biệt.
- **Hỗ trợ đa hôn phối & đa chi**: Cho phép một người có nhiều vợ/chồng (Chính thất, Kế thất, Tục huyền) và liên kết với nhiều chi họ (Chi gốc, Chi di cư).
- **Hỗ trợ dữ liệu lịch sử không đầy đủ**: Cho phép ngày tháng ước tính (`approx`, `before`, `after`), tháng/năm, hoặc ngày khuyết.
- **Tính vẹn toàn huyết thống (Integrity Validation)**: Chống vòng lặp tổ tiên (Circular ancestry), ngăn tự tham chiếu phụ mẫu, và xóa an toàn không xóa dây chuyền người thân.

---

## 2. Các Kiểu Dữ liệu Nền tảng (Supporting Types)

```typescript
/**
 * Giới tính
 */
export type Gender = 'male' | 'female' | 'unknown';

/**
 * Độ chính xác của ngày tháng lịch sử
 */
export type DatePrecision =
  | 'exact'    // Ngày, tháng, năm chính xác
  | 'month'    // Tháng và năm
  | 'year'     // Chỉ biết năm
  | 'approx'   // Khoảng năm ước lượng (ước tính)
  | 'before'   // Trước năm
  | 'after'    // Sau năm
  | 'unknown'; // Chưa rõ / khuyết dữ liệu

/**
 * Ngày tháng linh hoạt hỗ trợ lịch sử gia phả cổ
 */
export interface FlexibleDate {
  precision: DatePrecision;
  year?: number;
  month?: number;
  day?: number;
  displayText?: string;     // Chuỗi hiển thị tự do nếu niên đại phức tạp (VD: "Mùa thu năm Giáp Thìn 1904")
  calendar?: 'solar' | 'lunar'; // Dương lịch hoặc Âm lịch
}

/**
 * Ngày giỗ theo lịch Âm Việt Nam
 */
export interface LunarAnniversary {
  day?: number;            // Ngày âm lịch (1 - 30)
  month?: number;          // Tháng âm lịch (1 - 12)
  note?: string;           // Ghi chú nghi lễ (VD: "Giỗ tại Từ đường Chi Giáp")
}

/**
 * Phân loại quan hệ phụ mẫu - tử tôn
 */
export type LineageType =
  | 'biological' // Con ruột (Huyết thống)
  | 'adoptive'   // Con nuôi (Dưỡng tử / Dưỡng nữ)
  | 'step'       // Con riêng của vợ/chồng (Kế tử)
  | 'unknown';   // Chưa xác thực rõ

/**
 * Tình trạng hôn nhân
 */
export type UnionStatus =
  | 'married'    // Đã kết hôn / Phu thê
  | 'widowed'    // Góa (một bên đã mãn phần)
  | 'divorced'   // Đã ly hôn
  | 'separated'  // Ly thân
  | 'unknown';   // Chưa rõ chi tiết

/**
 * Phân loại sự kiện cuộc đời
 */
export type LifeEventType =
  | 'birth'        // Khai sinh / Chào đời
  | 'education'    // Học vấn & Khoa cử
  | 'marriage'     // Hôn lễ
  | 'career'       // Sự nghiệp & Chức vụ
  | 'migration'    // Di cư & Khởi nghiệp vùng đất mới
  | 'contribution' // Công đức & Đóng góp dòng họ
  | 'death'        // Tạ thế / Mãn phần
  | 'other';       // Dấu mốc đáng nhớ khác

/**
 * Phân loại kỷ vật & tư liệu
 */
export type MediaCategory =
  | 'portrait'         // Ảnh chân dung
  | 'historical_photo' // Ảnh tư liệu lịch sử gia đình
  | 'document'         // Bản gia phả cổ / Phả ký giấy dó
  | 'letter'           // Thư từ kỷ niệm
  | 'certificate'      // Sắc phong / Bằng cấp / Văn bằng
  | 'record'           // Hồ sơ lưu trữ
  | 'audio';           // Bản ghi âm lời kể thế hệ trước
```

---

## 3. Giao diện Thực thể Chính (Core Interfaces)

### 3.1. `Person` (Thành viên Dòng họ)

Đại diện cho một cá nhân trong phả hệ, bao gồm danh tính, sinh thời và toàn bộ các trường chuyên biệt của gia phả Việt Nam.

```typescript
export interface Person {
  /** Mã định danh duy nhất (UUID) */
  id: string;

  // ==================== 1. DANH TÍNH (IDENTITY) ====================
  /** Họ và tên khai sinh / chính thức */
  fullName: string;

  /** Giới tính */
  gender: Gender;

  /** Đường dẫn ảnh chân dung (hoặc Data URL Base64) */
  portraitUrl?: string;

  /** Mã liên kết với kho kỷ vật Media nếu có */
  portraitMediaId?: string;

  /** Tên thường gọi trong gia đình / xóm làng (VD: "Cụ Đồ Lộc", "Bác Cả") */
  commonName?: string;

  /** Tên húy (Tên kiêng kỵ chỉ gọi trong nghi lễ tế tự) */
  tabooName?: string;

  /** Tên tự / Tên hiệu (Tên chữ của nho sĩ, trí thức xưa) */
  courtesyName?: string;

  /** Bí danh cách mạng, pháp danh quy y, hoặc biệt hiệu */
  alias?: string;

  // ==================== 2. THÔNG TIN SINH THỜI (LIFE INFO) ====================
  /** Trạng thái hiện tiền: true nếu còn sống, false nếu đã mất */
  isLiving: boolean;

  /** Ngày sinh linh hoạt (chính xác, khoảng năm hoặc ước lượng) */
  birthDate?: FlexibleDate;

  /** Nơi sinh */
  birthPlace?: string;

  /** Ngày mất */
  deathDate?: FlexibleDate;

  /** Nơi mất */
  deathPlace?: string;

  /** Nguyên quán (Quê gốc dòng họ) */
  ancestralHome?: string;

  /** Nơi cư trú lúc sinh thời hoặc hiện tại */
  residence?: string;

  /** Nghề nghiệp, học vị, chức sắc */
  occupation?: string;

  /** Tiểu sử, cuộc đời và hành trạng tóm tắt */
  biography?: string;

  /** Ghi chú tra cứu thêm / tư liệu lịch sử */
  notes?: string;

  // ==================== 3. TRƯỜNG TỘC HỆ VIỆT NAM (VIETNAMESE GENEALOGY) ====================
  /**
   * Đời thứ (Thế thứ trong gia tộc)
   * Tính từ Thủy tổ (Đời 1), các thế hệ sau tăng dần (Đời 2, 3, 4, 5...)
   */
  generation?: number;

  /** Mã Chi họ chính trực thuộc (Foreign Key -> FamilyBranch.id) */
  branchId?: string;

  /**
   * Danh sách các Chi họ phụ / liên kết bổ sung (Hỗ trợ người lập nghiệp mở chi mới)
   */
  secondaryBranchIds?: string[];

  /**
   * Phái trực thuộc trong Chi (VD: "Phái Đông", "Phái Đoài", "Phái Nhất", "Phái Nhì")
   */
  subBranch?: string;

  /**
   * Vai vế / Trách vụ trong dòng họ
   * (VD: "Thủy tổ", "Trưởng tộc", "Trưởng chi", "Trưởng tôn", "Dâu trưởng", "Thành viên Ban khánh tiết"...)
   */
  clanRole?: string;

  /**
   * Ngày giỗ Âm lịch
   * Dùng để tính toán lịch giỗ hàng năm và nhắc nhở con cháu trong trang Tổng quan
   */
  deathAnniversaryLunar?: LunarAnniversary;

  /** Nơi an táng / Mộ phần / Khu lăng mộ dòng họ */
  burialPlace?: string;

  /**
   * Công đức / Đóng góp cho dòng tộc
   * (VD: "Cung tiến đất nhà thờ họ", "Biên soạn phả ký", "Thành lập quỹ khuyến học"...)
   */
  merits?: string;

  // ==================== 4. AUDIT TIMESTAMPS ====================
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}
```

---

### 3.2. `Relationship` (Quan hệ Phụ mẫu – Tử tôn)

Đại diện cho liên kết huyết thống hoặc nhận nuôi giữa Cha/Mẹ và Con, hỗ trợ cấu trúc cây phức tạp không bị trùng lặp.

```typescript
export interface Relationship {
  /** Mã định danh duy nhất (UUID) */
  id: string;

  /** Mã Cha hoặc Mẹ (Foreign Key -> Person.id) */
  parentId: string;

  /** Mã Con (Foreign Key -> Person.id) */
  childId: string;

  /**
   * Thuộc cuộc hôn nhân nào (Foreign Key -> Union.id, tùy chọn)
   * Giúp phân biệt chính xác con của người vợ thứ nhất (Chính thất)
   * hay vợ thứ hai (Kế thất / Tục huyền) khi người cha có nhiều vợ
   */
  unionId?: string;

  /** Bản chất mối quan hệ (Ruột, Nuôi, Con riêng vợ/chồng, Chưa xác thực) */
  lineageType: LineageType;

  /** Thứ tự sinh của con trong gia đình (1: Con trưởng, 2: Con thứ hai...) */
  birthOrder?: number;

  /** Ghi chú bổ sung (VD: "Nhận nuôi năm 1973") */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 3.3. `Union` (Hôn phối & Gia đình)

Đại diện cho một cuộc hôn nhân hoặc gắn kết lứa đôi giữa 2 người (hoặc 1 người khi thông tin bạn đời chưa rõ). Hỗ trợ **Đa hôn phối** đầy đủ.

```typescript
export interface Union {
  /** Mã định danh duy nhất (UUID) */
  id: string;

  /**
   * Danh sách ID người phối ngẫu (1 hoặc 2 người -> Person.id)
   */
  partnerIds: string[];

  /** Ngày kết hôn */
  marriageDate?: FlexibleDate;

  /** Nơi tổ chức hôn lễ */
  marriagePlace?: string;

  /** Tình trạng hôn nhân */
  status: UnionStatus;

  /**
   * Thứ tự hôn phối của người chồng/vợ
   * (1: Hôn nhân lần 1 / Chính thất, 2: Hôn nhân lần 2 / Tục huyền, 3: Tái hôn...)
   */
  marriageOrder?: number;

  /** Ghi chú (VD: "Chính thất mất sớm, tục huyền năm 1934") */
  notes?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 3.4. `FamilyBranch` (Chi họ & Phái)

Đại diện cho tổ chức phân nhánh của dòng tộc từ Thủy tổ đến các Chi lớn và các Phái nhỏ.

```typescript
export interface FamilyBranch {
  /** Mã định danh chi họ (VD: "branch_daiton", "branch_giap") */
  id: string;

  /** Tên chi họ (VD: "Đại Tôn Đông Ngạc", "Chi Giáp - Chi Trưởng", "Chi Bính - Nam Tiến") */
  name: string;

  /** Mã ký hiệu viết tắt */
  code: string;

  /** Người khởi lập chi (Foreign Key -> Person.id, tùy chọn) */
  founderId?: string;

  /** Chi mẹ trực thuộc (Foreign Key -> FamilyBranch.id, cho phép phân nhánh đa cấp) */
  parentBranchId?: string;

  /**
   * Danh sách các Phái trực thuộc chi này
   * (VD: ["Phái Đông", "Phái Đoài"] hoặc ["Phái Nhất", "Phái Nhị", "Phái Tam"])
   */
  subBranches: string[];

  /** Nơi phát tích / Địa bàn cư trú chính của chi họ */
  originPlace?: string;

  /** Mô tả lịch sử hình thành chi họ */
  description?: string;

  /** Thời kỳ thành lập chi họ (VD: "Cuối thế kỷ XIX") */
  establishedPeriod?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 3.5. `Media` (Kỷ vật, Hình ảnh & Văn tự Cổ)

Quản lý các tư liệu lịch sử được lưu trữ hoàn toàn nội bộ trong **IndexedDB**. Không tải lên bất kỳ máy chủ bên thứ ba nào.

```typescript
export interface Media {
  /** Mã định danh duy nhất (UUID) */
  id: string;

  /** Tiêu đề kỷ vật (VD: "Sắc phong thời vua Khải Định", "Ảnh đại gia đình năm 1965") */
  title: string;

  /** Mô tả chi tiết nội dung kỷ vật */
  description?: string;

  /** Niên đại / Thời kỳ ước lượng (VD: "Xuân Ất Tỵ 1965", "Khoảng năm 1930") */
  dateLabel?: string;

  /** Phân loại tư liệu */
  category: MediaCategory;

  /** Định dạng MIME (VD: "image/jpeg", "image/png", "audio/mp3", "application/pdf") */
  mimeType: string;

  /**
   * Dữ liệu tệp lưu trữ nội bộ (Base64 Data URL nén tối ưu)
   * Đảm bảo tự động trọn gói trong bản sao lưu JSON mà không thất lạc
   */
  dataUrl: string;

  /** Tên tệp gốc khi tải lên */
  fileName?: string;

  /** Dung lượng tệp tính theo byte */
  fileSize?: number;

  /**
   * Danh sách các thành viên liên quan / xuất hiện trong kỷ vật
   * (Một bức ảnh gia đình có thể gắn với nhiều người)
   */
  personIds: string[];

  /** Chi họ gắn liền với kỷ vật */
  branchId?: string;

  /** Câu chuyện lịch sử / Hoàn cảnh lưu giữ kỷ vật */
  storyContext?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 3.6. `LifeEvent` (Dấu mốc Cuộc đời & Niên biểu)

Hỗ trợ xây dựng dòng thời gian biên niên (Chronological Timeline) cho từng cá nhân và gia tộc.

```typescript
export interface LifeEvent {
  /** Mã định danh duy nhất */
  id: string;

  /** Thành viên sở hữu sự kiện (Foreign Key -> Person.id) */
  personId: string;

  /** Tiêu đề sự kiện (VD: "Mở lớp nghĩa thục", "Chủ trì trùng tu Từ đường", "Nhập ngũ") */
  title: string;

  /** Loại sự kiện */
  type: LifeEventType;

  /** Thời gian diễn ra sự kiện */
  date?: FlexibleDate;

  /** Địa điểm diễn ra sự kiện */
  location?: string;

  /** Mô tả chi tiết sự kiện */
  description?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 3.7. `FamilyStory` (Ký ức & Câu chuyện Truyền đời)

Bảo tồn các câu chuyện truyền khẩu, gia huấn, hồi ức của các thế hệ trước.

```typescript
export interface FamilyStory {
  id: string;
  title: string;
  summary?: string;
  content: string;
  periodLabel?: string;
  personIds: string[];     // Các nhân vật được nhắc đến
  branchId?: string;      // Chi họ liên quan
  mediaIds: string[];     // Các kỷ vật/ảnh minh họa đính kèm
  recordedBy?: string;    // Người ghi chép / Người kể lại
  createdAt: string;
  updatedAt: string;
}
```

---

### 3.8. `AppSettings` (Thiết lập Toàn cục)

```typescript
export interface AppSettings {
  id: string;                    // Thường là 'default'
  clanName: string;              // Tên dòng họ (VD: "Dòng họ Trần – Đông Ngạc")
  clanMotto: string;             // Gia huấn / Câu đối (VD: "Tiên tổ phương danh lưu vạn đại...")
  ancestralHallLocation: string; // Địa chỉ nhà thờ tổ
  rootPersonId?: string;         // Người làm gốc mặc định trên Cây gia phả (Thủy tổ)
  schemaVersion: number;         // Phiên bản cấu trúc (Hiện tại: 1)
  lastBackupAt?: string;         // Lần xuất sao lưu JSON gần nhất
  updatedAt: string;
}
```

---

### 3.9. `GenealogyDatabaseSnapshot` (Bản Sao lưu Trọn vẹn JSON)

Được dùng khi xuất/nhập tệp sao lưu `.json`. Tệp này mang tính tự túc (Self-contained) 100%, chứa toàn bộ văn bản và dữ liệu ảnh Base64.

```typescript
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
```

---

## 4. Tóm tắt Khả năng Đáp ứng Đặc thù Gia phả Việt Nam

| Yêu cầu Tộc hệ | Trường dữ liệu tương ứng | Mục đích & Giải pháp |
| :--- | :--- | :--- |
| **Đời thứ (Generation)** | `Person.generation` | Xác định thứ tự thế hệ từ Thủy tổ (Đời 1), phục vụ phân tầng Cây gia phả và sắp xếp thứ bậc. |
| **Chi họ (Branch)** | `Person.branchId`, `Person.secondaryBranchIds`, `FamilyBranch` | Quản lý Đại Tôn và các Chi trưởng, Chi thứ, Chi di cư; hỗ trợ người mở chi mới. |
| **Phái (Sub-branch)** | `Person.subBranch`, `FamilyBranch.subBranches` | Phân nhánh nhỏ bên dưới từng Chi (Phái Đông/Đoài, Phái Giáp/Ất). |
| **Vai vế (Clan Role)** | `Person.clanRole` | Ghi nhận danh vị truyền thống (Thủy tổ, Trưởng tộc, Trưởng chi, Dâu trưởng...). |
| **Tên Húy (Taboo Name)** | `Person.tabooName` | Tên kiêng gọi lúc sinh thời, dùng khi xướng tên cúng tế. |
| **Tên Tự (Courtesy Name)** | `Person.courtesyName` | Tên chữ tao nhã của tiền nhân theo truyền thống Nho học. |
| **Tên Thường gọi & Bí danh** | `Person.commonName`, `Person.alias` | Tên gọi mộc mạc đời thường hoặc bí danh cách mạng. |
| **Ngày giỗ Âm lịch** | `Person.deathAnniversaryLunar` | Lưu ngày/tháng âm lịch và nghi lễ tế tự, tính lịch giỗ hàng năm. |
| **Nơi an táng** | `Person.burialPlace` | Ghi chép tọa độ mộ phần, nghĩa trang dòng họ để con cháu tảo mộ. |
| **Công đức dòng họ** | `Person.merits` | Biểu dương đóng góp xây dựng từ đường, khuyến học, tu bổ mồ mả. |
| **Đa hôn phối** | `Union.marriageOrder`, `Relationship.unionId` | Biểu diễn chính xác các đời vợ/chồng (Chính thất, Kế thất) và gắn con với đúng người mẹ. |
