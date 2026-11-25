# M0 PWA / offline report

Baseline 1cec38d; production build thật, localhost:4173. Verdict tổng: **FAIL / BLOCKED**, có một case cache reload **PASS**.

## Phương pháp đã chạy

1. Build dist bằng script gốc; chạy Vite preview local, không deploy.
2. Mở origin 4173 trong tab test riêng. Đây là IndexedDB khác origin 3000; seed demo tự khởi tạo.
3. Tạo hồ sơ giả M0 PWA DEMO Ngoại Tuyến bằng form; reload online; tìm lại được (32 người).
4. Dừng đúng PID preview 13712. HTTP fetch trực tiếp tới 127.0.0.1:4173 thất bại, log xác nhận origin không còn phục vụ.
5. Reload tab production: app shell vẫn mở. Vào Thành viên, tìm M0 PWA, record vẫn tồn tại.
6. Đóng tab sau kiểm thử; marker chỉ ở origin test 4173, không thay dữ liệu origin chính.

**PASS phạm vi hẹp:** warm cache app shell + IndexedDB persistence khi origin server dừng. Không giả lập navigator.onLine=false, không ngắt Internet hệ thống, không cài standalone, không cold-start process browser. Vì vậy không gọi đây là PASS toàn bộ offline/PWA.

Evidence: [marker trước](evidence/pwa-marker-created.txt), [reload trước outage](evidence/pwa-marker-reload.txt), [origin stopped](evidence/pwa-origin-stopped.txt), [reload outage](evidence/pwa-origin-outage-reload.txt), [marker sau](evidence/pwa-offline-marker.txt), [screenshot](screenshots/pwa-origin-outage.jpg).

## GP-CLOUD-006 xác nhận runtime

| Asset | Status | Content-Type thực | Verdict |
|---|---|---|---|
| /manifest.webmanifest | 200 | application/manifest+json | PASS trả manifest |
| /sw.js | 200 | text/javascript | PASS trả worker |
| /pwa-192x192.png | 200 | text/html (index fallback) | FAIL |
| /pwa-512x512.png | 200 | text/html | FAIL |
| /pwa-maskable-512x512.png | 200 | text/html | FAIL |
| /apple-touch-icon.png | 200 | text/html | FAIL |

[HTTP evidence](evidence/pwa-http-assets.json). Không chỉ nhìn HTTP 200 để báo icon PASS. Chỉ public/icon.svg có thật tại baseline.

Build tạo SW với precache 9 entries, 2179.46 KiB; chưa đo install lifecycle, update race hay quota. Dev worker chỉ có 1 entry và cảnh báo glob không khớp; không dùng dev mode để kết luận production offline.

## Ma trận còn lại

| Case | Trạng thái | Lý do |
|---|---|---|
| Cài trên Chrome/Edge stable | BLOCKED | Chưa có phiên test browser stable độc lập và version/installation evidence |
| Đóng installed app rồi cold offline | BLOCKED | Chưa cài PWA; không thay đổi network hệ thống |
| Toàn bộ tree/profile/gallery khi ngắt mọi mạng | SKIP | Chỉ xác nhận shell + tìm member khi origin dừng |
| Lần đầu truy cập hoàn toàn offline | SKIP | Không kỳ vọng cache khi chưa cài, chưa đo |
| Cập nhật service worker qua release mới | SKIP | M0 không sửa app hoặc deploy phiên bản mới |
| Banner offline theo navigator.onLine | SKIP | Origin outage không tạo offline event của OS |
| PWA update không mất IndexedDB | BLOCKED | Cần build cũ/mới và browser target kiểm soát được |
| Mic/audio offline và JSON playback | BLOCKED | Chưa cấp quyền/ghi âm thật |
| Quota / eviction / disk full | BLOCKED | Không gây đầy disk/profile hiện tại; cần profile fault test riêng |

## M1 acceptance và rollback

Fix asset manifest bằng đường dẫn/tài nguyên hợp lệ, giữ id/scope/start_url và tên DB hiện tại. Cài lại trên Chrome/Edge profile test; warm app; đóng; ngắt mạng; mở và đọc được tree/profile/gallery; sau update giữ nguyên 8-store snapshot. Không clear IndexedDB để xử lý cache.

Rollback bằng revert riêng commit manifest/SW nếu lỗi; giữ DB và backup JSON, kiểm worker cũ/mới trước khi yêu cầu người dùng reload. Không coi “xóa site data” là rollback.
