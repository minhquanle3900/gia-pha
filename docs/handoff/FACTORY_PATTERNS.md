# App Factory · Các pattern đã triển khai

Các pattern dưới đây được đối chiếu tại Core head `0eadd0099377632c3eb8d16fe28390ea2799b61a`. Chúng mô tả hợp đồng có thể tái sử dụng trong codebase hiện tại. Bằng chứng Cloud gồm 194 test và các ca Chromium ghi riêng. [Bàn giao Core Closure](M1_2B_CLOUD_TO_DESKTOP.md)

## 1. Atomic Entity Merge

**Điều kiện áp dụng.** Hai hồ sơ đã được người dùng chọn, có định danh rõ và một transaction có thể bao toàn bộ store tham chiếu. Đọc dữ liệu trong transaction, lập kế hoạch chuyển liên kết sang định danh đích, kiểm vòng và xung đột hôn phối, xóa nguồn sau cùng rồi đợi commit. [Adapter merge](../../src/database/db.ts) · [Quy tắc hợp nhất](../../src/services/duplicateMergeService.ts)

**Giới hạn.** Phạm vi rollback là transaction IndexedDB. Trường xung đột hoặc hôn phối mơ hồ cần quyết định của người vận hành. Hoàn tác lần ghi đã commit cần backup phù hợp.

**Test tối thiểu.** Gộp với sự kiện, ảnh, nhật ký và hôn phối. Chèn lỗi giữa các lần ghi rồi so sánh snapshot. Thử hai yêu cầu cùng nguồn và ca hôn phối không phân biệt được để kiểm giữ nguyên `unionId` của con. [Atomic merge tests](../../src/__tests__/atomicPersonMerge.test.ts) · [Union integrity tests](../../src/__tests__/unionIntegrity.test.ts)

## 2. Validated Atomic Import

**Điều kiện áp dụng.** Dữ liệu JSON, CSV hoặc GEDCOM đi qua parser, validator và preview. Mở transaction sau khi chuẩn bị dữ liệu. Với hợp nhất, đọc dữ liệu bên nhận trong cùng transaction và kiểm kế hoạch đã kết hợp. Với thay thế, kiểm ứng viên rồi xóa và ghi trong một transaction. [Validator](../../src/services/importValidationService.ts) · [Kế hoạch hợp nhất](../../src/services/snapshotMergeService.ts) · [Adapter import](../../src/database/db.ts)

**Giới hạn.** Hợp nhất giữ thiết lập cục bộ, nhận bản ghi giống hệt một lần và chặn ID có nội dung khác. Độ đầy đủ của dữ liệu sau parse phụ thuộc định dạng nguồn. Các trường ngày có độ chính xác thấp vẫn có thể mang cảnh báo.

**Test tối thiểu.** Kiểm tệp lỗi, tham chiếu mồ côi, vòng chỉ xuất hiện sau khi kết hợp và xung đột phát sinh sau preview. Chèn lỗi sau khi xóa hoặc ghi một phần và xác minh toàn bộ snapshot được giữ. [Import integrity tests](../../src/__tests__/importIntegrity.test.ts) · [Adapter tests](../../src/__tests__/importAdapters.test.ts)

## 3. Transactional Media Lifecycle

**Điều kiện áp dụng.** UI giữ bản nháp ảnh trong bộ nhớ, giải mã và nén trước transaction. Lưu hồ sơ cùng bản ghi media và liên kết. Khi xóa media, đọc lại các tham chiếu hồ sơ và nhật ký trong transaction. [Form hồ sơ](../../src/features/people/PersonFormModal.tsx) · [Tiện ích ảnh](../../src/utils/imageUtils.ts) · [Adapter media](../../src/database/db.ts)

**Giới hạn.** Thay hoặc gỡ chân dung giữ ảnh cũ trong kho tư liệu. Quota và bộ nhớ giải mã ảnh phụ thuộc thiết bị. Trình duyệt cần hỗ trợ định dạng đầu vào.

**Test tối thiểu.** Chọn ảnh rồi hủy, lưu và thay ảnh, kiểm liên kết v1 theo ID hoặc URL. Chèn lỗi sau khi thêm ảnh nhưng trước khi ghi hồ sơ, rồi chạy lại. Thử xóa ảnh đang dùng từ hồ sơ khác hoặc nhật ký. [Portrait lifecycle tests](../../src/__tests__/portraitLifecycle.test.ts)

## 4. Referential Integrity on Delete

**Điều kiện áp dụng.** Có danh sách đầy đủ các trường liên kết và chính sách cho từng loại. Preview cho biết tác động. Khi xóa chi, đọc dữ liệu hiện hành, gỡ liên kết chi chính/phụ, chi cha, media và nhật ký, rồi xóa chi trong một transaction. [Quản lý dữ liệu](../../src/features/import-export/DataManagementPage.tsx) · [Adapter xóa chi](../../src/database/db.ts)

**Giới hạn.** Chi con trực tiếp trở thành chi cấp cao nhất. Các hồ sơ, tư liệu và nhật ký liên quan được giữ. Số lượng hiển thị ở preview phản ánh snapshot của giao diện tại thời điểm xem.

**Test tối thiểu.** Xóa chi có đủ năm kiểu liên kết, đồng thời giữ các liên kết tới chi khác. Kiểm ca có lần ghi xếp hàng trước transaction xóa, ca lỗi giữa transaction và vòng xuất–nhập JSON v1 sau xóa. [Branch deletion tests](../../src/__tests__/branchDeletion.test.ts)

## 5. Portable Backup

**Điều kiện áp dụng.** Đọc đồng nhất tám store, xuất JSON v1 với định danh và trường record được lưu. Ảnh nhúng đi cùng tệp. Xem cảnh báo và chọn chế độ hợp nhất hoặc thay thế trước khi ghi. [Serializer JSON](../../src/services/jsonBackupService.ts) · [Hướng dẫn nhập/xuất](../../IMPORT_EXPORT.md)

**Giới hạn.** URL ngoài và URL blob vẫn là tham chiếu và có thể mất khả dụng trên thiết bị đích. GEDCOM phục vụ trao đổi cấu trúc phả hệ. Thay thế từ GEDCOM có thể làm mất sự kiện, media, nhật ký và các liên kết tới chúng.

**Test tối thiểu.** Xuất backup rồi hợp nhất vào bản gốc với kết quả giữ nguyên các bản ghi. Restore vào profile sạch sau CRUD, thay ảnh, gộp người và xóa chi, rồi đối chiếu ID và tham chiếu. Kiểm ca URL ngoài giữ nguyên chuỗi và export không gửi request. [Import integrity tests](../../src/__tests__/importIntegrity.test.ts) · [Portrait lifecycle tests](../../src/__tests__/portraitLifecycle.test.ts) · [GEDCOM tests](../../src/__tests__/gedcomRoundTrip.test.ts)

## 6. Safe PDF Rendering

**Điều kiện áp dụng.** Escape dữ liệu động theo ngữ cảnh văn bản hoặc thuộc tính HTML trước khi dựng bản in. Với html2canvas, chuẩn hóa màu CSS trong DOM clone và giữ giao diện nguồn cùng bố cục báo cáo. [Helper HTML](../../src/utils/htmlUtils.ts) · [PDF cá nhân](../../src/services/personPdfReportService.ts) · [PDF sách phả](../../src/services/familyBookPdfService.ts)

**Giới hạn.** Export phụ thuộc font, khổ giấy, bộ nhớ canvas và hộp thoại in của trình duyệt. Khi canvas giới hạn, giao diện hướng người dùng tới in hoặc thông báo đang xuất bản văn bản.

**Test tối thiểu.** Dùng tiếng Việt, dấu nháy, `& < >` và tiểu sử nhiều dòng. Kiểm HTML và PDF ở cả đường xuất trực tiếp lẫn modal. Thử Chromium desktop/mobile và mở file để đối chiếu bố cục, dấu tiếng Việt và ảnh. [Person PDF tests](../../src/__tests__/personReport.test.ts) · [Family-book PDF tests](../../src/__tests__/familyBookPdf.test.ts) · [Kết quả Chromium](M1_2B_CLOUD_TO_DESKTOP.md#test-evidence)

## 7. Human-reviewed Duplicate Detection

**Điều kiện áp dụng.** Có dữ kiện để đưa hai hồ sơ vào danh sách nghi trùng, chẳng hạn tên đã chuẩn hóa và cùng năm sinh. Hiển thị lý do và điểm khác biệt. Người vận hành xác nhận trước khi gọi luồng gộp. [Dò nghi trùng](../../src/services/duplicateMergeService.ts) · [Hộp thoại review](../../src/features/people/DuplicateMergeModal.tsx)

**Giới hạn.** Tên, niên đại và đời có thể thiếu hoặc sai. Kết quả là căn cứ để xem hồ sơ, còn quyết định gộp cần đối chiếu tiểu sử và quan hệ.

**Test tối thiểu.** Nhập CSV trùng tên/năm với người hiện có nhưng khác đời, kiểm cặp xuất hiện và đóng modal vẫn giữ cả hai. Kiểm riêng ca chỉ trùng tên và ca hai hồ sơ có giới tính đã biết khác nhau. [Duplicate detection tests](../../src/__tests__/duplicateDetection.test.ts)

## 8. Mobile-ready Shared Core

**Điều kiện áp dụng.** Quy tắc TypeScript dùng chung cho client, IndexedDB quản lý giao dịch, Web APIs xử lý ảnh/tệp/PDF bên ngoài transaction và PWA phục vụ shell trên một origin ổn định. Node chỉ cần ở build, test và máy chủ cho chức năng Gemini online. [Context](../../src/context/GenealogyContext.tsx) · [IndexedDB adapter](../../src/database/db.ts) · [Cấu hình PWA](../../vite.config.ts)

**Giới hạn.** Bảo đảm offline phụ thuộc shell khả dụng và kho dữ liệu được giữ trên origin/profile. Chromium mô phỏng đo được thao tác client. iOS/Android thực, camera, quota, vòng đời cài đặt và tải tệp độc lập vẫn cần QA.

**Test tối thiểu.** Nạp shell, ngắt mạng rồi thử đọc và ghi. Kiểm cài mới, cold-offline, cập nhật service worker và tải lại dữ liệu. Restore JSON giữa thiết bị, mở ảnh/PDF, và xác minh khi quota bị từ chối dữ liệu vẫn giữ nguyên. [Mobile architecture readiness](MOBILE_ARCHITECTURE_READINESS.md) · [Bằng chứng Cloud](M1_2B_CLOUD_TO_DESKTOP.md#test-evidence)
