# M2.4 · Modal Safety

Draft base PR #10 `f0fafa2c1aaf479bb99db173a9b049ab2f597055`, code `539323d0f143ebe0a341052ca96183b130f2fb80`. Diff chỉ gồm `ConfirmDialog.tsx`, `DuplicateMergeModal.tsx`, `DataManagementPage.tsx`, `ClanJournalModal.tsx`, `GalleryPage.tsx`, `ExhibitionArtwork.tsx` và `useNativeModal.ts`.

## Tích hợp thử

Worktree riêng `../m24-integration` bắt đầu từ #10, merge đúng head #7 `6ffcba5908c0d64800c2c94cb46241d14d186e1f` và #9 `41f3b264521c201d6863236304478edb4b054e01`. Merge-base của #10 với #7 là `0eadd00`, với #9 là `43d9b02`. Đã xác nhận ancestry, đưa vào đúng 2 và 10 commit riêng, không cherry-pick commit chung. Xung đột duy nhất ở `UpcomingAnniversariesWidget.tsx`, giữ bố cục M2 cùng nhãn hiển thị Chi họ và select cao tối thiểu 44 px từ ý định #9. Bản tích hợp trước sửa `d7ec679`, bản có sửa `cf23138ae308cab8501db5dc119efe86b494df27`. Các merge thử và xử lý xung đột chỉ nằm trong worktree.

## Hành vi và bằng chứng

- Chromium tái hiện trên `d7ec679` việc Ctrl+K mở tìm kiếm dưới fullscreen, Escape bỏ nháp Nhật ký, và nạp mẫu thiếu busy guard với lỗi IndexedDB không hiện thông báo.
- Confirm, DuplicateMerge, Journal và Gallery viewer dùng native dialog để chặn tương tác nền, giữ Tab trong lớp hiện tại và trả tiêu điểm. Xác nhận mặc định focus Hủy. Escape chỉ đóng lớp trên cùng. Nhật ký có xác nhận bỏ bản nháp. DataManagement chặn ghi lặp và đóng trong lúc nạp mẫu, xóa chi hoặc nhập đang chạy. CSV và fullscreen báo modal đang mở cho phím tắt Desktop. Native dialog dùng `closedby="none"` lúc bận, bao gồm trường hợp Chromium phát cancel không thể hủy.
- `npm test` **221/221** trên nhánh sửa và worktree ghép. `npm run lint` và `npm run build` đạt. HTTP manifest/icon của PR #7 trên bản ghép đạt. Chromium 156 đạt **11/11** kịch bản runtime, 0 lỗi runtime. Fault injection khóa và hủy các transaction trên dữ liệu tổng hợp để kiểm ghi đúng một lần và rollback.
- [Log Chromium, RED/GREEN](screenshots/m2-modal/verification.txt) · [Nạp mẫu đang ghi](screenshots/m2-modal/reset-busy.jpg) · [Xác nhận nháp lồng nhau](screenshots/m2-modal/journal-draft.jpg).

## Desktop review

`useModalAccessibility` của #9 quản lý stack custom, trả focus, Escape và chặn busy do caller truyền. Caller quyết định dirty. Hook capture chưa nhận biết native top layer nếu hai hệ cùng được mở, và selector có thể tính một control thường với `tabindex="-1"` vào biên Tab. Bàn giao Desktop xử lý phối hợp stack nếu cần mở lồng trộn và bổ sung initial focus cho PersonForm. Chromium Cloud dùng viewport giả lập và dữ liệu tổng hợp. Windows Chrome/Edge và iOS/Android thật còn chờ review.
