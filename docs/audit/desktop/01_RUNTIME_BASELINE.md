# M0 Desktop runtime baseline

Ngày kiểm tra: 25/11/2026, Asia/Saigon. Kết luận RC: **FAIL**. Đây là báo cáo audit, không phải bản sửa sản phẩm.

## Phạm vi và phối hợp

- Repository: minhquanle3900/gia-pha.
- Baseline ứng dụng: `1cec38dc77ea46260fa0608c931b22e0b508d531`.
- Nhánh làm việc cuối: `audit/m0-desktop-runtime`. Nhánh tạm ban đầu `audit/m0-product-audit` chưa có commit và không được push.
- Cloud handoff đọc bằng `git show`, không checkout/merge: `b2b707de6c3ff2207cfbb08f3b93b259460618db`, nhánh `origin/audit/m0-cloud-engineering`.
- Chỉ thêm tài liệu, fixture tổng hợp, harness và bằng chứng trong thư mục này. Không sửa source nghiệp vụ, schema, manifest dependency hoặc lockfile. Không deploy, không merge main. Không bắt đầu M1.
- Theo cập nhật phân công, source audit chuyên sâu thuộc Cloud. File inventory ban đầu được giữ làm chỉ mục, không được coi là bằng chứng chức năng chạy được.

## Môi trường thực tế

| Thành phần | Giá trị / giới hạn |
|---|---|
| Host | Microsoft Windows 10.0.19044.2846, cmd.exe |
| Node | v24.22.1 |
| npm | 11.19.1; chỉ dùng chạy scripts và lấy Bun trong npm cache |
| Bun | 1.4.5 (a7733435c), gọi qua npm exec |
| Lockfile | Chỉ có bun.lock, lockfileVersion 2; không có package-lock.json/yarn.lock |
| Cài đặt | bun install --frozen-lockfile; 626 packages; 3 postinstall bị Bun chặn |
| Trình duyệt | Codex in-app browser trên máy Windows; số version engine không được API cung cấp |
| Browser matrix | Chưa xác nhận Chrome stable/Edge stable riêng; không suy diễn từ IAB |
| Desktop | 1366×768, bổ sung đợt đầu 1440×1000 |
| Mobile | Viewport 390×844 và 320×768; không phải điện thoại vật lý/touch thật |
| Dev | http://localhost:3000, Express + Vite |
| Production local | http://localhost:4173, Vite preview build dist |
| AI mock | http://127.0.0.1:4180, unchanged dist + endpoint mock, không gọi Google |
| Sau audit | Đã dừng các server audit; đã đóng tab test và reset viewport |

PowerShell trên host lỗi CET trước khi chạy lệnh. Dùng cmd.exe thành công. Build/test/benchmark lần đầu trong sandbox lỗi spawn EPERM; chạy lại với quyền thực thi tiến trình được duyệt thì đạt. Không đổi source để làm test xanh. [Log cài đặt](evidence/dependency-install.log), [build](evidence/build-retry.log), [test](evidence/tests-retry.log), [lint](evidence/lint.log).

## Kiến trúc được chạy, không viết lại

React 19.3.1 / Vite 8.3.5 / TypeScript 7.0.2; Tailwind 4.3.4; Express 4.22.3; idb 8.0.4; D3 7.9.2; Recharts 3.10.1; jsPDF 4.2.1; html2canvas 1.4.1; vite-plugin-pwa 2.0.0; Vitest 5.1.0. Phiên bản trên là resolved trong log cài đặt, không phải chỉ range trong package.json.

10 màn hình chính: tổng quan, cây, thành viên, nhật ký, lễ giỗ, thống kê, kỷ vật, sách, bản đồ, dữ liệu. Hồ sơ cá nhân và các modal là bề mặt con. Điều hướng bằng React state, reload trở về tổng quan; không coi đó là lỗi mất dữ liệu.

IndexedDB schema v1 có 8 store: settings, branches, people, unions, relationships, lifeEvents, media, stories. Không nâng schema. Seed được chủ dự án xác nhận là demo: 31 người, 4 chi, 12 hôn phối, 40 quan hệ, 7 mốc, 5 kỷ vật, 3 nhật ký, 1 settings. Fixture gộp riêng: 3 người, 1 chi, 2 quan hệ, 1 mốc, 1 kỷ vật, 1 nhật ký. Tất cả tên M0 là giả.

## Độ tin cậy bằng chứng

PASS chỉ áp dụng cho thao tác hoặc assertion đã chạy. PARTIAL là trạng thái tính năng; các case tổng hợp vẫn FAIL/BLOCKED nếu còn tiêu chí chưa đạt. Screenshot viewport không chứng minh cảm ứng, bàn phím ảo hay cài PWA trên thiết bị.

Ảnh 10 màn chính được chụp lại ở viewport ổn định. Dùng [settled-captures.json](evidence/settled-captures.json) làm số đo chuẩn. Đợt resize ban đầu có ảnh compositor chưa cập nhật; các ảnh chính đã thay bằng bản chụp lại. Số đo stats 813px của đợt đầu không được dùng làm lỗi đã xác nhận. [browser-captures.json](evidence/browser-captures.json) là log sơ bộ, không phải nguồn kết luận responsive cuối.

Suite hiện có tạo/ghi đè hai PDF ở repo root. Đã khôi phục đúng hai PDF về baseline sau test; source và PDF tracked không có diff. Đây là GP-CLOUD-012, không phải thay đổi audit.

## Bằng chứng đi kèm

[Danh mục screenshot](screenshots/README.md) · [Windows test report](04_WINDOWS_TEST_REPORT.md) · [Cloud verification](06_CLOUD_FINDINGS_VERIFICATION.md) · [Handoff Desktop → Cloud](M0_DESKTOP_TO_CLOUD.md).
