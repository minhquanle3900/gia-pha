# M2.2 · Phòng trưng bày di sản

PR #8 dựa trên `c8b1a4d` (PR #6). Commit triển khai Marathon `0815c8ae752a35f2364183501067aec4597e7013`. Mobile Platform đã hoàn thành ở PR #7, head `6ffcba5`.

- Từ **Kho kỷ vật**, chọn **Vào phòng trưng bày**. Sảnh dẫn đến bảy khu, gồm Chân dung tiền nhân tách riêng khỏi Ảnh gia tộc và Triển lãm theo chủ đề. Chủ đề đọc từ chi họ và thẻ Nhật ký sẵn có. Mục nổi bật tiếp tục dùng bài ghim và tư liệu trong kho.
- Chi tiết có caption, câu chuyện, xem toàn màn hình và lối mở hồ sơ, bộ sưu tập chi họ, tư liệu gốc. Hai câu đối do Product Owner cung cấp được trình bày dọc với ghi chú nguồn và dị bản chưa xác minh. Ảnh sảnh tạo bằng ImageGen có nhãn minh họa, dùng font Heritage sẵn có.
- Thay đổi nằm ở `GalleryPage.tsx`, `ExhibitionHall.tsx`, `ExhibitionArtwork.tsx`, CSS và catalog cùng test. App dùng callback điều hướng hiện có. Media, FamilyStory, Person, FamilyBranch và backup vẫn theo schema hiện hành.

## Ảnh Chromium

- Trước Marathon [Sảnh 390 px](screenshots/m2-exhibition/after-hall-mobile.jpg) · [Sảnh 1440 px](screenshots/m2-exhibition/after-hall-desktop.jpg).
- Sau Marathon [Sảnh sáng 390 px](screenshots/m2-exhibition-marathon/after-hall-390-light.jpg) · [Sảnh tối 1440 px](screenshots/m2-exhibition-marathon/after-hall-1440-dark.jpg) · [Danh sách các khu](screenshots/m2-exhibition-marathon/after-rooms-390-light.jpg).
- [Hai vế câu đối](screenshots/m2-exhibition-marathon/after-couplet-390-light.jpg) · [Câu đối toàn màn hình](screenshots/m2-exhibition-marathon/after-fullscreen-couplet-390-light.jpg) · [Hiện vật toàn màn hình](screenshots/m2-exhibition-marathon/after-fullscreen-390-dark.jpg) · [Bộ sưu tập theo chi](screenshots/m2-exhibition-marathon/after-branch-390-light.jpg) · [Bộ sưu tập trống](screenshots/m2-exhibition-marathon/after-empty-collections-390-light.jpg).

## Kiểm thử

- `npm test` đạt **221/221**, gồm 194 baseline. Targeted catalog, Journal, portrait, branch, timeline và PDF đạt **53/53**. Lint và production build đạt.
- Chromium kiểm light/dark tại 320, 390, 430, 768 và 1440 px, chạm giả lập, bàn phím, toàn màn hình, trạng thái trống, mở lần đầu offline sau khi tải shell và liên kết hồ sơ/chi họ/tư liệu. Chế độ reduced motion tắt hiệu ứng trưng bày. 0 lỗi runtime. [Log Chromium](screenshots/m2-exhibition-marathon/chromium-results.txt).
- AppShell có tràn ngang từ baseline. Vùng trưng bày vừa khung ở cả năm kích thước. Thiết bị iOS/Android thật chưa được kiểm ở vòng Cloud.

## NEXT_TASK

Desktop tích hợp đường vào chính thức của Di sản trong UI Foundation. Dùng luồng **Kho kỷ vật → Vào phòng trưng bày** để đối chiếu và xác nhận toàn màn hình trên thiết bị thật.
