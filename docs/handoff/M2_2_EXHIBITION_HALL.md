# M2.2 · Phòng trưng bày

Base `c8b1a4d49489c5f4fda7dc048c679339d17e384e` (PR #6), code `e86f72664dc3d1db02702026baa3ebb0021312f3`. Mở từ ô **Di sản** ở Tổng quan hoặc lối **Kho kỷ vật** sẵn có. Từ sảnh vào kho để dùng bộ lọc, thêm, ghi âm, xem và xóa như trước. Các nút Nhật ký, Lễ giỗ và Sách phả ký mở đúng màn hình hiện có.

Năm khu trưng bày dùng `Media.category`, `FamilyStory.category` và các thẻ hiện có như Thư pháp, Gia huấn hoặc Ký ức. Mục nổi bật ưu tiên bài ghim và bổ sung câu đối tham khảo. Mở chi tiết để đọc ngữ cảnh, xem tư liệu nhúng và nhận biết người hoặc chi họ liên quan. Hai câu đối mẫu chỉ dùng để trưng bày. Schema, IndexedDB, bộ dữ liệu backup và AppShell giữ nguyên. Ảnh minh họa nhà thờ họ Bắc Bộ tạo bằng ImageGen, nhúng vào chunk riêng của triển lãm để precache cùng shell.

## Ảnh Chromium

| Khung | Trước | Sau |
|---|---|---|
| Mobile 390 × 844 | [Kho kỷ vật](screenshots/m2-exhibition/before-gallery-mobile.jpg) | [Sảnh](screenshots/m2-exhibition/after-hall-mobile.jpg) · [Năm khu](screenshots/m2-exhibition/after-rooms-mobile.jpg) · [Câu đối](screenshots/m2-exhibition/after-couplet-mobile.jpg) · [Hiện vật](screenshots/m2-exhibition/after-artifact-mobile.jpg) |
| Desktop 1440 × 900 | [Kho kỷ vật](screenshots/m2-exhibition/before-gallery-desktop.jpg) | [Sảnh](screenshots/m2-exhibition/after-hall-desktop.jpg) · [Kho kỷ vật sau thay đổi](screenshots/m2-exhibition/after-gallery-desktop.jpg) |

## Kiểm thử

- `npm test -- src/__tests__/exhibitionCatalog.test.ts src/__tests__/clanJournal.test.ts src/__tests__/portraitLifecycle.test.ts src/__tests__/branchDeletion.test.ts src/__tests__/familyYearTimeline.test.ts src/__tests__/familyBookPdf.test.ts` đạt **46/46**.
- `npm test` đạt **214/214**, gồm 194 baseline và 20 ca catalog. `npm run lint` và `npm run build` exit 0. PDF tracked giữ nguyên.
- Chromium ở 320, 390 và 1440 px kiểm đủ năm khu, hai loại chi tiết, trả tiêu điểm khi quay lại, khu trống, kho cũ và điều hướng sang ba màn hình liên quan. ID fixture demo giữ nguyên, 0 runtime exception. Mở triển lãm lần đầu offline từ Dashboard đã tải online vẫn có ảnh sảnh và chi tiết. [Log Chromium](screenshots/m2-exhibition/chromium-results.txt).

Review Desktop kiểm đường vào sau khi tích hợp AppShell và thử bàn phím hoặc chạm. Vùng triển lãm vừa chiều rộng ở cả ba viewport. AppShell vẫn có tràn ngang từ baseline. Revert `e86f726` để rollback giao diện, giữ nguyên dữ liệu dùng chung.
