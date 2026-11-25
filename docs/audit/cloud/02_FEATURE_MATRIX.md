# 02 · Kiểm kê chức năng

**S** = đã nối đường gọi từ mã nguồn. **T** = có phần hành vi được suite baseline thực thi. **D** = Desktop cần xác nhận thao tác đầu-cuối. Các tên test rút gọn tương ứng với tệp `src/__tests__/<tên>.test.ts`. Đường dẫn tính từ `src/` nếu không ghi khác. Mọi dòng cần Desktop xác nhận.

| ID | Chức năng và đường vào | Mã nguồn, nghiệp vụ và dữ liệu | Test và xác minh | Rủi ro | Xử lý |
|---|---|---|---|---|---|
| F01 | Dashboard → Tổng quan | `pages/DashboardPage.tsx`, tổng hợp bộ đếm, truy cập nhanh, mốc và nhắc giỗ từ snapshot | statsAndAnniversary · T/D | Số liệu và diễn giải trạng thái rỗng | POLISH |
| F02 | Cây gia phả → chế độ hậu duệ, tổ tiên, toàn cảnh, quạt | `features/family-tree/{FamilyTreePage,FanChartLayout,treeLayout}`, D3 và đồ thị người/hôn phối/cạnh | treeUXAndPerformance, independentVerification · T/D | DOM lớn và biểu diễn đa nhánh | POLISH |
| F03 | Thành viên → lọc danh sách | `features/people/MembersPage.tsx`, tìm/lọc từ people, branches | genealogy kiểm helper tìm kiếm · S/D | Nhiều tiêu chí, viewport nhỏ | KEEP |
| F04 | Chọn người từ danh sách/cây/tìm kiếm → Hồ sơ | `features/people/PersonProfileView.tsx`, đọc quan hệ và sự kiện từ context | independentVerification kiểm kho · S/D | Che dữ liệu khác nhau theo bề mặt | FIX |
| F05 | Thành viên → Thêm, hồ sơ → Sửa/Xóa | `features/people/{PersonFormModal,PersonProfileView}`, `database/db.ts`, validation và cascade | genealogy, independentVerification kiểm validation/kho · T/D | Ghi ảnh tách khỏi ghi người, GP-CLOUD-007 | FIX |
| F06 | Hồ sơ → Quản lý quan hệ | `features/relationships/RelationshipEditorModal.tsx`, validate cạnh cha/con, ghi relationships và unions | genealogy kiểm cạnh · T/D | Kiểm tra hôn phối thiếu ở đường ghi, GP-CLOUD-004 | FIX |
| F07 | Quản lý quan hệ → thêm hôn phối khác | Editor và `context/GenealogyContext.tsx`, tập union và thứ tự | independentVerification kiểm cấu trúc · S/D | Trùng cặp hoặc thứ tự khi sửa đồng thời | FIX |
| F08 | Quản lý quan hệ → loại quan hệ | Editor, `models/genealogy.ts`, trường lineageType và cạnh | genealogy kiểm một phần validation · S/D | Mất ngữ nghĩa khi gộp/đổi định dạng | POLISH |
| F09 | Quản lý dữ liệu → chi/phái, form người → đời | DataManagementPage, PersonFormModal, Branch và generation | genealogy, independentVerification có fixture · S/D | Chi chính/phụ và founder khi xóa/gộp | POLISH |
| F10 | Menu công cụ hoặc hồ sơ → Tra cứu vai vế | `features/kinship/KinshipCalculatorModal.tsx`, `services/kinshipService.ts`, tổ tiên chung theo people/cạnh | genealogy · T/D | Nhiều đường họ và quan hệ không sinh học | KEEP |
| F11 | Thành viên/menu → Gộp hồ sơ | DuplicateMergeModal, duplicateMergeService, dữ liệu nhiều store | genealogy kiểm hàm thuần · T/D | Mất mốc và ghi từng phần, GP-CLOUD-001/002 | FIX |
| F12 | Nhật ký dòng họ → thêm/lọc/xem | `features/journal/{ClanJournalPage,ClanJournalModal}`, stories và liên kết người/media | clanJournal · T/D | Liên kết người bị bỏ khi gộp | FIX |
| F13 | Dashboard → lịch sử, mốc, niên biểu | `features/history/{ClanHistorySection,ClanInteractiveTimeline,ClanMilestoneModal,FamilyYearTimeline}`, lifeEvents/people/unions | genealogy, familyYearTimeline · T/D | Mốc bị xóa khi gộp, quy ước năm | FIX |
| F14 | Kho tư liệu → thêm ảnh/kỷ vật/ghi âm | `features/gallery/{GalleryPage,AudioRecorderModal}`, MediaRecorder và media | Chưa thấy browser test · S/D | Quyền mic, quota, khả năng khôi phục | POLISH |
| F15 | Nghi lễ → giỗ, lịch âm và văn khấn | `features/rites/{RitesAssistantPage,UpcomingAnniversariesWidget}`, lunarCalendarService và ngày giỗ | genealogy, statsAndAnniversary, newFeatures · T/D | Tháng nhuận, ranh ngày địa phương | KEEP |
| F16 | Thống kê → nhân khẩu/tuổi thọ/di sản | `pages/StatsDashboardPage.tsx`, `features/statistics/`, people/branches/media, Recharts | statsAndAnniversary, genealogy · T/D | Mẫu nhỏ và thiếu năm sinh/tử | KEEP |
| F17 | Bản đồ di cư → địa danh/mở Maps | MigrationMapPage, dữ liệu nơi ở/địa chỉ/tọa độ | Chưa thấy · S/D | Địa chỉ gửi ra ngoài khi mở liên kết | POLISH |
| F18 | Sách phả ký → tùy chọn/xem/in PDF | FamilyBookPage, familyBookPdfService, snapshot, html2canvas và jsPDF | familyBookPdf · T/D | Font, ngắt trang và ảnh, fallback | POLISH |
| F19 | Hồ sơ → xuất báo cáo PDF | PersonReportModal, personPdfReportService, người và các liên kết | personReport · T/D | Dấu tiếng Việt, nội dung riêng tư | POLISH |
| F20 | Cây → Tải ảnh vector SVG | FamilyTreePage:310, clone SVG và tải Blob | treeUXAndPerformance kiểm layout · S/D | Font/style ngoài SVG, phạm vi xuất theo view | POLISH |
| F21 | Dữ liệu → xuất/nhập JSON | DataManagementPage, jsonBackupService, snapshot | genealogy, independentVerification · T/D | Kiểm kiểu và graph thiếu, GP-CLOUD-003 | FIX |
| F22 | Dữ liệu → tải mẫu/nhập CSV | DataManagementPage, csvImportService, người, chi và liên kết | newFeatures · T/D | Định danh trùng, xác minh hậu nhập | FIX |
| F23 | Dữ liệu → xuất/nhập GEDCOM | DataManagementPage, gedcomService, INDI/FAM và thẻ mở rộng | genealogy, independentVerification · T/D | Round-trip interop, Unicode, lineage | POLISH |
| F24 | Dữ liệu → sao lưu/khôi phục; banner nhắc | jsonBackupService, db, backupReminderService, snapshot và localStorage | independentVerification, genealogy · T/D | Hợp nhất/ghi đè, ảnh URL và cài đặt | FIX |
| F25 | Ô tìm kiếm toàn cục / phím tắt → hồ sơ/cây | GlobalSearch, searchService và people/branches | genealogy · T/D | Điều hướng bàn phím, chiều rộng | POLISH |
| F26 | Menu/hồ sơ → QR, sao chép/tải | QRShareModal, qrcode, hồ sơ và tên dòng họ | Chưa thấy · S/D | Thẻ văn bản chứa dữ liệu người, GP-CLOUD-008 | POLISH |
| F27 | Hồ sơ → soạn tiểu sử AI | PersonProfileView, aiBiographyService, `server.ts`, Gemini | genealogy kiểm lỗi mạng · T/D | Dữ liệu thật, xác thực, ngân sách, sai chi tiết | FIX |
| F28 | Hồ sơ → đọc tiểu sử | BiographySpeechPlayer, useSpeechReader, speechSynthesisService, Web Speech | genealogy kiểm lời đọc và voice · T/D | Voice tiếng Việt/voice từ xa, ngắt đọc | POLISH |
| F29 | Thanh ứng dụng → PIN/lá chắn | AppShell, PrivacyPinModal, usePrivacyShield; cờ/hash trong localStorage | Chưa thấy · S/D | Che một phần giao diện; đồng bộ giữa màn hình | FIX |
| F30 | Thanh ứng dụng → cài đặt ứng dụng, offline | PWAWidgets, usePWAInstall, `vite.config.ts`, SW và IndexedDB | Build tạo SW · S/D | Thiếu icon manifest, GP-CLOUD-006 | FIX |
| F31 | Thanh ứng dụng → giao diện tối | AppShell, usePreferences, `index.css`, localStorage | genealogy · T/D | Override theo mẫu màu và độ tương phản | POLISH |
| F32 | Lần đầu mở → tour | OnboardingTour và App, cờ hoàn thành localStorage | genealogy kiểm bước và lưu cờ · T/D | Focus và tour trên màn hình hẹp | POLISH |
| F33 | Tổng quan → cấu hình thông báo giỗ | NotificationSettingsModal, useAnniversaryNotifications, notificationService và localStorage | genealogy, statsAndAnniversary · T/D | Quyền trình duyệt, kỳ vọng khi app đóng | POLISH |
