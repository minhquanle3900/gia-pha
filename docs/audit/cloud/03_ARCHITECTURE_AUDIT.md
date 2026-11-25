# 03 · Kiến trúc

`src/main.tsx` khởi động React. `src/App.tsx:23–95` giữ tab, hồ sơ, nút focus cây và trạng thái modal. `AppShell` cung cấp điều hướng và tiện ích. `GenealogyProvider` giữ snapshot IndexedDB, xây map theo ID và cấp cả dữ liệu lẫn CRUD. Phần server Express phục vụ tệp build hoặc gắn Vite middleware, đồng thời cung cấp API tiểu sử.

| Phạm vi | Bằng chứng và hệ quả | Thay đổi nhỏ có thể kiểm chứng |
|---|---|---|
| Ranh giới ghi | `GenealogyContext.tsx:248–340` gọi hàm DB rồi đọc lại snapshot. Modal gộp tự điều phối nhiều thao tác ghi, mỗi lần có thể đọc lại cả đồ thị. | Dùng một hàm ghi nghiệp vụ cho gộp trong DB, refresh một lần sau commit. GP-CLOUD-001/002. |
| Hiệu năng dữ liệu | `db.ts:126–138` đọc cả 8 store. `GenealogyContext.tsx:175–223` lọc toàn bộ cạnh/union cho mỗi truy vấn. `duplicateMergeService.ts:56–145` so các cặp người. | Đo kích cỡ ảnh/âm thanh riêng; tạo index adjacency theo snapshot, áp dụng ở hồ sơ và các truy vấn lặp trước. Giữ ngữ nghĩa thứ tự và loại quan hệ. |
| Async và lỗi | `GenealogyContext.tsx:114–123` bắt lỗi đọc lại trong provider; nhiều thao tác có thể cạnh tranh. Navigation error hiển thị ở `App.tsx:109+`. | Phân biệt ghi thất bại với đọc lại thất bại, ngăn bấm lặp và kiểm tra hai tab cùng ghi / import bằng fixture. GP-CLOUD-002/003. |
| Màn hình lớn | FamilyTreePage 1.388 dòng, DataManagementPage 1.089 dòng, PersonFormModal 915 dòng, PersonReportModal 1.178 dòng. Cấu hình, thao tác DB, preview và trình bày cùng tồn tại. | Sau khi có fixture, tách preview/confirm khỏi thao tác import, tách toolbar cây nếu chỉnh UX. Đối chiếu thư viện helper hiện có trước khi thêm module. |
| Điều hướng | `App.tsx:25–74` dùng state cục bộ cho tab và profile. Điều hướng từ tìm kiếm, cây và menu cùng chạm state. | Xác nhận Back/reload và chọn lại người trước khi thay đổi mô hình điều hướng. |
| Bundle | `App.tsx:1–20` import đồng bộ page. Build có chunk chính 1.948,95 kB / 541,05 kB gzip. | Lazy load PDF, sách phả và thống kê theo màn hình. Đo cold start và kiểm tra mọi chunk tải được offline. GP-CLOUD-010. |
| Tái sử dụng | Hai bộ PDF có pipeline HTML/canvas và fallback. Confirmation đã có `ConfirmDialog`, nhiều modal giữ lifecycle riêng. | Giữ các bộ dựng nội dung theo domain, chia sẻ primitive focus/close hoặc helper capture khi đã có kiểm tra đầu-cuối. |
