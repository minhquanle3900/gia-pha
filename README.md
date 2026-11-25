# Gia Phả Việt – Cội Nguồn

> **Ứng dụng quản lý gia phả dòng họ Việt Nam, bảo mật cục bộ, hoạt động ngoại tuyến (Offline-first / Local-first) và hỗ trợ đa nền tảng PWA.**

---

## 1. Giới thiệu tổng quan

**Gia Phả Việt – Cội Nguồn** là giải pháp số hóa phả hệ gia đình và dòng họ theo truyền thống văn hóa Việt Nam. Ứng dụng hoạt động trực tiếp trong trình duyệt trên máy tính, máy tính bảng và điện thoại di động, **không yêu cầu đăng nhập, không lưu trữ dữ liệu lên máy chủ đám mây của bên thứ ba, và không phụ thuộc vào kết nối Internet**.

Toàn bộ thông tin gia phả, mối quan hệ huyết thống, hình ảnh chân dung và kỷ vật lịch sử được lưu trữ độc quyền trong **IndexedDB** của thiết bị người dùng.

---

## 2. Các tính năng cốt lõi

### 🌳 1. Cây Gia Phả Tương Tác Đa Chiều (Interactive Family Tree)
- **Đa góc nhìn phả hệ**:
  - **Cây hậu duệ (Descendant tree)**: Từ đời Thủy tổ tỏa xuống các nhánh con cháu.
  - **Cây tổ tiên (Ancestor tree)**: Đi ngược từ một thành viên lên các đời phụ mẫu và tiền nhân.
  - **Toàn cảnh (Full tree)**: Hiển thị liên kết phân tầng trọn vẹn gia tộc.
  - **Tiêu điểm cá nhân (Individual focus)**: Đặt một người làm tâm điểm, hiển thị tức thời cha mẹ, bạn đời, anh chị em và con cái.
  - **Phân tầng đời thứ (Generation-based view)**: Nhóm thành viên theo dải thế hệ (Đời 1, Đời 2, Đời 3...).
  - **Theo Chi họ (Branch view)**: Lọc chi tiết theo Đại Tôn, Chi Giáp, Chi Ất, Chi Bính...
- **Tương tác trực quan**:
  - Thu phóng (Zoom in / Zoom out / Scale to fit), rê chuột và cử chỉ cảm ứng trên thiết bị di động.
  - Thu gọn / Mở rộng nhánh con cháu (Collapse / Expand toggle).
  - Tìm kiếm nhanh và nhảy tiêu điểm tới vị trí bất kỳ ai trên cây.
  - Xuất cây gia phả ra tệp vector **SVG** chất lượng cao phục vụ in ấn phả đồ.

### 👤 2. Quản lý Thành viên Toàn diện (Member CRUD)
- **Hỗ trợ đầy đủ trường tộc hệ đặc thù Việt Nam**:
  - **Danh tính**: Họ và tên, giới tính, tên thường gọi, tên húy (tên kiêng gọi khi tế tự), tên tự (tên chữ), bí danh.
  - **Sinh thời**: Ngày sinh, nơi sinh, ngày mất, nơi mất, nguyên quán, nơi cư trú, nghề nghiệp, học vị, tiểu sử cuộc đời.
  - **Tộc hệ**: Đời thứ, Chi họ trực thuộc, liên kết đa chi (người mở chi mới), Phái, vai vế trong dòng tộc (Thủy tổ, Trưởng tộc, Trưởng chi, Dâu trưởng...).
  - **Nghi lễ & Tâm linh**: Ngày giỗ Âm lịch hàng năm, nơi an táng / mộ phần gia tộc, công đức và đóng góp xây dựng từ đường.
- **Xử lý ngày tháng lịch sử linh hoạt**:
  - Hỗ trợ ngày chính xác (ngày/tháng/năm), tháng/năm, chỉ biết năm, khoảng năm ước lượng (c. 1880), trước/sau năm, hoặc niên đại cổ tự do ("Mùa thu năm Giáp Thìn 1904").
  - Hỗ trợ phân biệt lịch Dương và lịch Âm.

### 🔗 3. Mối quan hệ Huyết thống & Kiểm soát Xung đột (Relationship Integrity)
- **Hỗ trợ đa hôn phối & đa gia đình**:
  - Phân biệt Chính thất (vợ đầu), Kế thất, Tục huyền (vợ sau) hoặc tái hôn.
  - Gắn con cái chính xác với cuộc hôn nhân tương ứng (`unionId`), phân định con của người vợ thứ nhất hay thứ hai khi cha có nhiều vợ.
  - Phân loại quan hệ: Con ruột (huyết thống), con nuôi (dưỡng tử/nữ), con riêng của vợ/chồng (kế tử), chưa xác thực.
- **Thuật toán bảo vệ huyết thống**:
  - Ngăn chặn quan hệ phụ mẫu với chính mình.
  - **Phát hiện vòng lặp tổ tiên (Circular ancestry detection)** bằng thuật toán đồ thị DFS (`wouldCreateAncestryCycle`).
  - Cảnh báo trùng lặp quan hệ hoặc mâu thuẫn năm sinh/năm mất.
  - **Xóa an toàn (Safe deletion)**: Khi xóa một thành viên, hệ thống tự động gỡ liên kết phụ mẫu/hôn phối mà **không bao giờ xóa dây chuyền** bất kỳ hồ sơ người thân nào khác.

### 🏛️ 4. Kho Kỷ Vật & Tư Liệu Lịch Sử (Heritage Gallery)
- Quản lý ảnh chụp tư liệu lịch sử, ảnh đại gia đình, sắc phong triều đình, bản gia phả giấy dó cổ, văn bia, thư từ và bút tích.
- Tự động nén ảnh tối ưu trên client bằng HTML5 Canvas, chuyển đổi sang Base64 lưu an toàn trong IndexedDB.
- Gắn thẻ các thành viên có mặt trong từng kỷ vật để tiện tra cứu qua lại từ hồ sơ cá nhân.

### 💾 5. Quản lý Dữ liệu, Sao lưu & Khôi phục
- **Sao lưu toàn vẹn JSON**: Tải tệp `.json` trọn gói (gồm văn bản, cấu trúc nhánh, quan hệ và ảnh Base64).
- **Nhập/Xuất GEDCOM 5.5.1 UTF-8**: Chuẩn quốc tế, tương thích với FamilySearch, Gramps, MyHeritage, có kèm các thẻ mở rộng tiếng Việt (`_GEN`, `_BRAN`, `_ROLE`, `_TABOO`, `_LUNAR_GIO`...).
- **Khôi phục dữ liệu mẫu (Demo Dataset)**: Nạp lại gia phả mẫu mực 5 thế hệ (Dòng họ Trần – Đông Ngạc).

---

## 3. Kiến trúc Kỹ thuật (Technical Architecture)

```
/
├── DATA_MODEL.md                  # Định nghĩa mô hình dữ liệu TypeScript chi tiết
├── index.html                     # Điểm vào HTML với Typography & PWA Meta
├── metadata.json                  # Cấu hình applet và quyền hạn
├── src/
│   ├── models/                    # Interfaces & TypeScript Types
│   │   └── genealogy.ts
│   ├── database/                  # Quản lý IndexedDB cục bộ (idb)
│   │   ├── db.ts                  # Schemas, CRUD, safe deletion, transactions
│   │   └── seedData.ts            # Dữ liệu mẫu 5 thế hệ (Trần – Đông Ngạc)
│   ├── services/                  # Business logic & Thuật toán
│   │   ├── validationService.ts   # DFS cycle detection & form audits
│   │   ├── jsonBackupService.ts   # Serializer, Base64 bundle, validator
│   │   └── gedcomService.ts       # GEDCOM 5.5.1 parser & generator
│   ├── utils/                     # Hỗ trợ định dạng & nén ảnh
│   │   ├── dateUtils.ts           # Flexible date, lifespan, lunar anniversaries
│   │   └── imageUtils.ts          # Client-side canvas image compression
│   ├── context/                   # Quản lý State phản ứng tập trung
│   │   └── GenealogyContext.tsx
│   ├── hooks/                     # Custom React Hooks
│   │   ├── usePWAInstall.ts       # PWA prompt & offline indicator
│   │   └── usePreferences.ts      # LocalStorage lightweight user settings
│   ├── components/                # Giao diện dùng chung
│   │   ├── AppShell.tsx           # Mobile bottom bar + Desktop header
│   │   ├── HeritageAvatar.tsx     # Avatar chân dung với xử lý lỗi & màu giới tính
│   │   ├── FlexibleDateInput.tsx  # Bộ chọn ngày tháng gia phả cổ
│   │   ├── ConfirmDialog.tsx      # Hộp thoại cảnh báo tác động
│   │   └── PWAWidgets.tsx         # Thông báo ngoại tuyến & nút cài app
│   ├── features/                  # Các mô-đun chức năng chính
│   │   ├── family-tree/           # D3 family tree layout & canvas renderer
│   │   ├── people/                # Hồ sơ cá nhân, danh bạ, modal thêm/sửa
│   │   ├── relationships/         # Trình chỉnh sửa liên kết phụ mẫu, phu thê
│   │   ├── gallery/               # Kho kỷ vật và tư liệu lịch sử
│   │   └── import-export/         # Quản lý dữ liệu JSON & GEDCOM
│   └── pages/                     # Trang điều hướng chính
│       └── DashboardPage.tsx      # Tổng quan gia tộc, giỗ chạp, ký ức
└── package.json
```

---

## 4. Hướng dẫn Phát triển & Kiểm thử

```bash
# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy môi trường phát triển (Port 3000)
npm run dev

# Chạy kiểm thử tự động Vitest
npm test

# Kiểm tra cú pháp TypeScript
npm run lint

# Đóng gói sản phẩm sản xuất
npm run build
```
