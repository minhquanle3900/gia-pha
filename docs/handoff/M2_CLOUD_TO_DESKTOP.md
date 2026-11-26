# M2 Cloud → Desktop

Nhánh `feat/m2-cloud-product-polish` bắt đầu từ `0eadd0099377632c3eb8d16fe28390ea2799b61a`, head của PR #5. SHA cuối thay đổi mã nguồn là `60c6686367072779c7decbc2f0750f1e31e95a73`. Commit bàn giao chứa tài liệu và ảnh đối chiếu. Draft PR lấy `fix/m1-cloud-core-closure` làm base trong khi PR #5 còn mở.

## Phạm vi và tệp thay đổi

| Commit | Hành vi người dùng | Tệp |
|---|---|---|
| `8e77b4d` | Đưa tìm thành viên, xem cây và thêm người lên đầu Dashboard. Các thẻ tổng quan hỗ trợ bàn phím. Giữ lối vào nhật ký, thống kê, hướng dẫn, nhắc giỗ và sao lưu. | `src/pages/DashboardPage.tsx` |
| `0b1ed5b` | Nhật ký dùng bộ lọc gọn trên mobile và nút chọn nhanh trên desktop. Danh sách, dòng thời gian, trình đọc và kho kỷ vật dễ thao tác trên màn hình hẹp. Dialog giữ trạng thái đang lưu và trả tiêu điểm khi đóng. | `src/features/journal/ClanJournalPage.tsx`, `src/features/journal/ClanJournalModal.tsx`, `src/features/gallery/GalleryPage.tsx` |
| `2fb56ef` | Bốn chế độ lịch và nghi lễ co giãn theo màn hình. Lựa chọn văn khấn, sao chép, checklist và nhắc giỗ dùng điều khiển có nhãn. | `src/features/rites/RitesAssistantPage.tsx`, `src/features/rites/UpcomingAnniversariesWidget.tsx` |
| `4039180` | Thống kê dễ đổi bộ lọc và xem chi tiết từng đời. Bảng cuộn trong vùng riêng khi cần. Bản đồ hiển thị số địa điểm theo loại và giữ lối mở bản đồ ngoài. | `src/pages/StatsDashboardPage.tsx`, `src/features/migration/MigrationMapPage.tsx` |
| `60c6686` | Bốn chế độ Sách phả ký, cỡ giấy và bố cục rộng dễ truy cập trên mobile. Quản lý dữ liệu ưu tiên JSON, nhóm CSV/GEDCOM riêng và giữ tiêu điểm khi đóng xem trước CSV. | `src/features/book-print/FamilyBookPage.tsx`, `src/features/import-export/DataManagementPage.tsx` |

## Ảnh đối chiếu

Ảnh chụp cùng fixture demo từ hai bản production build cục bộ, với Chromium 156.0.8078.79. Cả hai lần chụp dùng font dự phòng của trình duyệt để so sánh nhất quán. Các mẫu tương tác dùng hồ sơ thử nghiệm và CSV tổng hợp.

| Màn hình | Mobile 390 × 844 | Desktop 1440 × 900 |
|---|---|---|
| Dashboard | [Trước](screenshots/m2-cloud/before-dashboard-mobile.jpg) · [Sau](screenshots/m2-cloud/after-dashboard-mobile.jpg) | [Trước](screenshots/m2-cloud/before-dashboard-desktop.jpg) · [Sau](screenshots/m2-cloud/after-dashboard-desktop.jpg) |
| Nhật ký | [Trước](screenshots/m2-cloud/before-journal-mobile.jpg) · [Sau](screenshots/m2-cloud/after-journal-mobile.jpg) | [Trước](screenshots/m2-cloud/before-journal-desktop.jpg) · [Sau](screenshots/m2-cloud/after-journal-desktop.jpg) |
| Kho kỷ vật | [Trước](screenshots/m2-cloud/before-gallery-mobile.jpg) · [Sau](screenshots/m2-cloud/after-gallery-mobile.jpg) | [Trước](screenshots/m2-cloud/before-gallery-desktop.jpg) · [Sau](screenshots/m2-cloud/after-gallery-desktop.jpg) |
| Lễ giỗ | [Trước](screenshots/m2-cloud/before-rites-mobile.jpg) · [Sau](screenshots/m2-cloud/after-rites-mobile.jpg) | [Trước](screenshots/m2-cloud/before-rites-desktop.jpg) · [Sau](screenshots/m2-cloud/after-rites-desktop.jpg) |
| Thống kê | [Trước](screenshots/m2-cloud/before-statistics-mobile.jpg) · [Sau](screenshots/m2-cloud/after-statistics-mobile.jpg) | [Trước](screenshots/m2-cloud/before-statistics-desktop.jpg) · [Sau](screenshots/m2-cloud/after-statistics-desktop.jpg) |
| Bản đồ di cư | [Trước](screenshots/m2-cloud/before-map-mobile.jpg) · [Sau](screenshots/m2-cloud/after-map-mobile.jpg) | [Trước](screenshots/m2-cloud/before-map-desktop.jpg) · [Sau](screenshots/m2-cloud/after-map-desktop.jpg) |
| Sách phả ký | [Trước](screenshots/m2-cloud/before-book-mobile.jpg) · [Sau](screenshots/m2-cloud/after-book-mobile.jpg) | [Trước](screenshots/m2-cloud/before-book-desktop.jpg) · [Sau](screenshots/m2-cloud/after-book-desktop.jpg) |
| Quản lý dữ liệu | [Trước](screenshots/m2-cloud/before-data-mobile.jpg) · [Sau](screenshots/m2-cloud/after-data-mobile.jpg) | [Trước](screenshots/m2-cloud/before-data-desktop.jpg) · [Sau](screenshots/m2-cloud/after-data-desktop.jpg) |

## Kết quả kiểm thử

| Nhóm | Lệnh | Kết quả |
|---|---|---|
| Dashboard | `npm test -- src/__tests__/statsAndAnniversary.test.ts src/__tests__/familyYearTimeline.test.ts` | 8/8 |
| Nhật ký và kho kỷ vật | `npm test -- src/__tests__/clanJournal.test.ts src/__tests__/portraitLifecycle.test.ts src/__tests__/branchDeletion.test.ts` | 16/16 |
| Lễ giỗ | `npm test -- src/__tests__/statsAndAnniversary.test.ts src/__tests__/familyYearTimeline.test.ts src/__tests__/newFeatures.test.ts` | 14/14 |
| Thống kê và bản đồ | `npm test -- src/__tests__/statsAndAnniversary.test.ts src/__tests__/genealogy.test.ts src/__tests__/familyYearTimeline.test.ts` | 53/53 |
| Sách phả ký và dữ liệu | `npm test -- src/__tests__/familyBookPdf.test.ts src/__tests__/personReport.test.ts src/__tests__/importIntegrity.test.ts src/__tests__/importAdapters.test.ts src/__tests__/gedcomRoundTrip.test.ts src/__tests__/branchDeletion.test.ts src/__tests__/portraitLifecycle.test.ts` | 70/70 |
| Full regression | `npm test` | **194/194** trong 18 tệp |
| Lint và build | `npm run lint`, `npm run build` | Cả hai exit 0. Build tạo service worker và precache 9 mục. Cảnh báo Vite về cấu hình, kích thước chunk và dynamic import vẫn giống baseline. |
| Trạng thái Git và PDF | `git status --porcelain=v1 --untracked-files=all`, `git diff --exit-code HEAD -- '*.pdf'` | Working tree sạch và PDF tracked giữ nguyên sau suite. |

| Kiểm thử Chromium | Quan sát |
|---|---|
| Dashboard ở 320 px | Gõ từ khóa tiếng Việt, chọn kết quả bằng Enter và mở/đóng form thêm người. Dropdown rộng 258 px và nằm trong vùng tìm kiếm. |
| Nhật ký và kho kỷ vật ở 390 px | Mở form tạo nhật ký, hủy và kiểm tra tiêu điểm quay về nút mở. Mở/hủy thêm kỷ vật, mở/đóng trình xem. |
| Lễ giỗ, Sách phả ký ở 390 px | Mở cả bốn chế độ lễ giỗ, chọn văn khấn và đổi checkbox. Mở bốn chế độ sách, cuộn tới tùy chọn giấy và chọn A3. |
| Thống kê và bản đồ ở 320, 390 và 1440 px | Lọc fixture thống kê từ 31 xuống 18 thành viên, mở chi tiết đời và kiểm tra trả tiêu điểm. Lọc địa điểm từ 10 xuống 1 và kiểm tra đích liên kết Google Maps. |
| Quản lý dữ liệu ở 390 px | Đổi chế độ nhập JSON, mở xem trước CSV tổng hợp, kiểm tra tiêu điểm ở trong dialog và hủy. |
| Bố cục và runtime | Cả tám vùng nội dung Cloud vừa chiều rộng ở 320, 390 và 1440 px. Chromium ghi nhận 0 runtime exception trong các ca trên. [Số đo trước](screenshots/m2-cloud/before-measurements.json) · [Số đo sau](screenshots/m2-cloud/after-measurements.json). |

## Bàn giao review

- AppShell có hiện tượng tràn ngang từ baseline. Sau M2, ở viewport 320/390 px, chiều rộng cuộn của tài liệu khoảng 400 px trong khi chiều rộng cuộn của nội dung Cloud vẫn bằng viewport. Ở 1440 px, vùng Cloud rộng 1280 px và vừa container, còn tài liệu rộng khoảng 1873–1910 px tùy màn hình. Kiểm lại ở cả ba kích thước sau khi ghép AppShell của Desktop.
- Chromium giả lập kích thước giao diện. Safari iOS, Chrome Android và Windows Chrome/Edge cần xác nhận trên thiết bị hoặc hệ điều hành tương ứng. Khi ghép UI Foundation, ưu tiên kiểm thao tác bằng chạm, trạng thái đang lưu và lỗi trong dialog, xem trước và in PDF, cùng restore JSON trong profile thử nghiệm.
- Nếu cần rollback code, revert commit theo nhóm từ mới về cũ `60c6686`, `4039180`, `2fb56ef`, `0b1ed5b`, `8e77b4d`. Các thay đổi nằm ở tầng giao diện và dùng schema hiện hành, nên rollback code không cần migration dữ liệu.
