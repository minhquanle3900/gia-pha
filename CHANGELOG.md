# NHẬT KÝ THAY ĐỔI (CHANGELOG)
## GIA PHẢ VIỆT – CỘI NGUỒN

Tất cả những thay đổi, cải tiến và cập nhật quan trọng của dự án sẽ được ghi chép chi tiết tại tệp này theo định dạng [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.2.0] - 2026-11-04

### ✨ Tính Năng Mới Bổ Sung (Major Additions)
- **Xuất Sách Phả Ký Hoàn Chỉnh (Family Book Generator)**:
  - Tự động biên soạn cuốn sách phả ký in ấn chuẩn khổ dọc A4 / Letter.
  - Bao gồm: Trang bìa di sản, Lời tựa (Phả ký), Gia huấn dòng họ 12 điều răn dạy con cháu, Danh bạ các Chi phái, Phả lục chi tiết từng đời kèm chân dung, và Mục lục tra cứu Tên húy / Tên tự.
  - Tích hợp nút in một chạm (`window.print()`) hỗ trợ xuất file PDF độ phân giải cao.
- **Phả Đồ Khổ Lớn Treo Tường (A0 / A1 Printable Scroll)**:
  - Kết xuất sơ đồ cây phả hệ dưới dạng vector SVG sắc nét vô hạn.
  - Phục vụ in bạt Hiflex hoặc lụa treo tại nhà thờ họ trong ngày giỗ tổ.
- **Chế Độ Xem Bảng Chi Truyền Thống**:
  - Trình bày danh sách gia tộc theo dạng bảng phân cấp ngang/dọc cổ truyền chữ Quốc ngữ và phong cách Hán - Nôm.
- **Trợ Lý Lễ Giỗ & Nghi Lễ Âm Lịch (Lunar Calendar & Rites Assistant)**:
  - Thuật toán chuyển đổi ngày giỗ Âm lịch sang Dương lịch cho năm hiện hành kèm đếm ngược ngày.
  - Tính toán năm Can Chi (Giáp Thìn, Ất Tỵ, Bính Ngọ...).
  - Sổ Văn Khấn Cổ Truyền 3 Miền (Thủy tổ, Trưởng tộc, Giỗ thường, Thanh minh & Tảo mộ) với khả năng điền tên người cúng tế và sao chép/in ấn.
  - Bảng phân công việc chuẩn bị ngày giỗ (mâm cỗ, hương đăng, đón tiếp các chi họ ở xa).
- **Tra Cứu Xưng Hô Dòng Tộc Tự Động (Vietnamese Kinship Title Calculator)**:
  - Thuật toán tìm Tổ tiên chung gần nhất (Lowest Common Ancestor - LCA).
  - Phân tích chênh lệch thế hệ và quy tắc "con chú con bác" để đưa ra danh xưng chuẩn xác (Bác họ, Chú họ, Cô họ, Anh họ, Em họ, Cháu...).
  - Hiển thị trực quan đường đi phả hệ từng bước qua cây gia tộc.
- **Chia Sẻ Gia Phả Ngoại Tuyến Qua Mã QR**:
  - Tạo mã QR tóm tắt lý lịch thành viên hoàn toàn ngoại tuyến không cần Internet.
  - Đọc và hiển thị hồ sơ cá nhân nhanh chóng trên thiết bị di động.
- **Bản Đồ Di Cư & Địa Lý Dòng Họ (Migration Map & Sacred Sites)**:
  - Dòng thời gian thiên di của dòng họ qua các thế hệ.
  - Danh bạ Từ đường, Nhà thờ chi, Nghĩa trang và Lăng mộ gia tộc kèm tọa độ GPS và liên kết Google Maps chỉ đường.
- **Phát Hiện Trùng Lặp & Hợp Nhất Hồ Sơ An Toàn (Duplicate Merge)**:
  - Quét và tính điểm tương đồng (tên, năm sinh, chi họ, cha mẹ).
  - So sánh đối chiếu hai hồ sơ và hợp nhất dữ liệu, chuyển giao quan hệ mà không làm mất liên kết.
- **Nâng Cấp Bộ Lọc & Tìm Kiếm Thành Viên (Enhanced Search & Filters)**:
  - Tìm kiếm tiếng Việt bỏ qua dấu (diacritics-tolerant).
  - Lọc theo Chi họ, Phái, Thế hệ (Đời thứ), Trạng thái (Hiện tiền / Đã khuất), và Giới tính.
  - Thanh thẻ lọc tích cực (Active filter chips) với số lượng kết quả thực tế.

### 🧪 Kiểm Thử & Xác Nhận (Testing & Verification)
- 15/15 bài kiểm thử tự động (Vitest) cho:
  - Phát hiện vòng lặp tổ tiên (DFS cycle detection).
  - Xác thực tính hợp lệ của ngày tháng và năm sinh/mất.
  - Tính toán xưng hô dòng tộc (Cha-con, anh-em, anh-em họ khác chi).
  - Chuyển đổi Âm lịch & đếm ngược ngày giỗ.
  - Phát hiện trùng lặp & hợp nhất bản ghi.
  - Nhập xuất chuẩn JSON & GEDCOM 5.5.1 UTF-8.

---

## [2.1.0] - 2026-11-03

### 🎨 Cải Tiến Giao Diện & Trải Nghiệm (UI/UX)
- Tối ưu hóa điều hướng di động (Mobile Bottom Navigation & Drawer).
- Bổ sung hiệu ứng chuyển động mượt mà với Tailwind CSS.
- Tinh chỉnh giao diện di sản Á Đông: Tông màu kem ngà (Warm Ivory `#FAF7F2`), xanh rừng sâu (`#1B3B2B`), nâu gỗ mun cổ (`#2E241E`) và viền vàng kim (`#C5A059`).

---

## [2.0.0] - 2026-11-01

### 🚀 Nâng Cấp Nền Tảng (Core Architecture)
- Chuyển đổi toàn bộ hệ thống lưu trữ sang **IndexedDB** (`idb`), loại bỏ hoàn toàn giới hạn 5MB của LocalStorage.
- Hỗ trợ lưu trữ hình ảnh kỷ vật và ảnh chân dung dưới dạng Base64 tối ưu hóa nén trên Canvas.
- Cơ chế **Safe Deletion**: Xóa thành viên an toàn, gỡ bỏ liên kết mà không bao giờ xóa dây chuyền người thân.
- Hỗ trợ **Đa hôn phối & Đa gia đình**: Phân định Chính thất, Kế thất, Tục huyền và gắn con cái chính xác với cuộc hôn nhân tương ứng (`unionId`).
- Hỗ trợ chuẩn quốc tế **GEDCOM 5.5.1 UTF-8** với các thẻ mở rộng di sản Việt Nam.

---

## [1.0.0] - 2026-10-15

### 🌟 Bản Phát Hành Đầu Tiên (Initial Release)
- Khởi tạo kiến trúc React 19 + TypeScript + Vite.
- Cây gia phả tương tác hỗ trợ đa góc nhìn (Hậu duệ, Tổ tiên, Phân tầng thế hệ, Chi họ).
- Quản lý hồ sơ thành viên cơ bản với các trường ngày tháng lịch sử linh hoạt.
- Kho kỷ vật và tư liệu lịch sử dòng họ.
- Sao lưu và khôi phục dữ liệu qua tệp JSON.
