# Cội Nguồn RC2 · Cloudflare Pages demo/UAT

URL cố định: **https://coi-nguon-gift.pages.dev/**.
Deployed HEAD: `6cc3365d623d456ae28ddbacbd38ff884d5847eb`.
Baseline PR #17: `7b745ebe553e6db6813ae2095d6f3bd11bc0ed97`.
Deployment ID: `8d9cfe63-a72a-40ea-b4d4-217c6b27454a`.
Branch: `codex/cloudflare-pages-demo`. Không merge main hoặc đổi visibility repository.

Đây là demo/UAT với dữ liệu tổng hợp; chưa phê duyệt lưu gia phả thật lâu dài. Chỉ dist được upload. Không deploy Express/Gemini backend, tài liệu repo, bản backup máy người dùng hay API key.

## Đã kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Windows lint / Pages production build | PASS |
| Regression | PASS 336/336: 327 baseline +9 test Pages |
| Privacy test trên Windows | Giữ assertions; cấp cổng test riêng vì PORT=0 của server fallback sang3000 và chạm dịch vụ khác. Không sửa backend. |
| HTTPS cố định | PASS, HTML200 và mở được trong IAB Chromium Windows |
| Manifest, 3 PWA icon, Apple icon, SW, 6 local fonts | PASS; MIME và byte hash khớp dist |
| CSP / Privacy Lock | Policy ảnh/media/font của RC2 giữ nguyên, thêm connect-src self ở HTTP. Không đổi schema, IndexedDB, media/AI service hoặc local fonts. |
| Gemini | Build ép VITE_GEMINI_BIOGRAPHY_ENABLED=false; UI hiện AI chưa kích hoạt. Pages Worker chặn toàn bộ /api với403, no-store, không đọc/forward body; GET/POST/OPTIONS thật đã kiểm. |
| Cache/update | HTML/manifest no-cache; SW no-store, no-cache, must-revalidate và scope/. Hashed assets immutable; SW thật khớp artifact. Giữ prompt, skipWaiting=false, clientsClaim=false và API denylist của RC2. Chưa chạy vòng nâng cấp client đã cài. |
| Offline qua giao diện HTTPS | BLOCKED: IAB không có network emulation; Windows URL safety dừng Computer Use khi chọn Chrome. Không bypass. |
| Backup/restore qua giao diện HTTPS | BLOCKED trước ca runtime do Computer Use bị dừng; regression JSON hiện có vẫn chạy trong327 baseline. Không gán PASS runtime từ unit tests. |
| iPhone thật / cài standalone | SKIP, chưa có thiết bị |

Evidence: [HTTP/hash/API](evidence/https-checks.json), [deployment và trạng thái](evidence/deployment.json). HTTP verifier dùng định danh CoiNguon-UAT-Verifier/1.0; Python-urllib mặc định bị Cloudflare1010 nhưng browser mở được. Không đổi WAF, Windows hoặc browser security. Không chụp thêm UI sau khi Computer Use bị dừng.

**Hosting đã hoạt động; acceptance runtime còn BLOCKED, chưa tuyên bố toàn bộ UAT PASS.**

## Cài PWA trên iPhone

1. Mở URL cố định trên bằng Safari, chờ trang và dữ liệu mẫu tải xong khi online.
2. Mở menu Chia sẻ, chọn **Thêm vào Màn hình chính**. Bật **Mở dưới dạng ứng dụng web** nếu lựa chọn xuất hiện, rồi bấm **Thêm**.
3. Mở biểu tượng Cội Nguồn vừa cài. Đối chiếu dữ liệu mẫu và giao diện trước khi dùng thử offline.

[Hướng dẫn Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27). Các bước trên là hướng dẫn, chưa phải kết quả kiểm iPhone thật.

## Cập nhật trên cùng hostname

Project hiện dùng **Direct Upload** để upload đúng artifact đã test, không cần cấp thêm quyền GitHub. [Cloudflare không cho đổi trực tiếp project Direct Upload sang Git integration](https://developers.cloudflare.com/pages/get-started/direct-upload/). Các bản sau tiếp tục dùng cùng project; không xóa/tạo project khác. Không dùng URL hash deployment làm địa chỉ sử dụng chính vì khác origin/IndexedDB.

Tại worktree phiên bản đã review, giữ các file Pages adapter và dùng cmd.exe:

```bat
npm exec --yes --package bun@1.4.5 -- bun install --frozen-lockfile
npm run lint
npm test
npm run build:pages
git rev-parse HEAD
```

Thay SHA_DA_KIEM_THU bằng full SHA vừa in, rồi deploy vào đúng production branch của project:

```bat
npm exec --yes --package wrangler@4.168.0 -- wrangler pages deploy dist --project-name coi-nguon-gift --branch codex/cloudflare-pages-demo --commit-hash SHA_DA_KIEM_THU
```

Không cần merge main. Không đặt GEMINI_API_KEY, VITE secret, backend hoặc dữ liệu cá nhân vào hosting. Nếu phiên Cloudflare hết hạn, PO đăng nhập Wrangler trên máy mình; không gửi token qua chat. Không tạo lại project. Cờ --force chỉ đã được dùng khi tạo project để chọn Pages thay vì Wrangler tự chuyển sang Workers; không dùng cho các lần deploy sau.

Sau deploy, kiểm /build-info.json trả commit mới và geminiEnabled=false; chạy lại HTTP verifier sau build cùng SHA. Người dùng lưu xong công việc, xuất JSON dự phòng, đóng tất cả tab/PWA Cội Nguồn cũ rồi mở lại URL cố định khi online. Không xóa dữ liệu website để ép cập nhật. Worker cũ có thể giữ bản cũ cho đến khi client cũ đóng, theo lifecycle RC2.

## Rollback

Trong Cloudflare Workers & Pages → coi-nguon-gift → Deployments, chọn production deployment tốt trước đó → Rollback to this deployment và xác nhận. [Quy trình Cloudflare](https://developers.cloudflare.com/pages/configuration/rollbacks/).

Bản tốt hiện tại để quay lại sau các lần nâng cấp: deployment8d9cfe63 / SHA6cc3365. Chưa thực hiện rollback ở bản đầu tiên này. Giữ nguyên project/hostname, sau rollback đóng/mở lại các client cũ. Rollback code không tự phục hồi IndexedDB; cần bản JSON riêng trước khi thay phiên bản. Không xóa bản deployment cần dùng làm mốc.

## Checklist PO nghiệm thu còn lại

Ghi model iPhone, phiên bản iOS/Safari và ngày kiểm. Chỉ dùng dữ liệu mẫu.

- Mở URL online, cài biểu tượng, kiểm standalone, portrait/landscape, safe-area, menu và form.
- Sau lần mở online thành công: tắt kết nối trên thiết bị thử nghiệm, mở lại app, xem cây/Di sản/font, thêm và sửa một người có tên rõ QA, reload; kiểm còn dữ liệu.
- Online trở lại: xuất JSON qua Dữ liệu & sao lưu, xác minh tệp trong Files, thử nhập lại trên môi trường mẫu riêng và đối chiếu thành viên/quan hệ/ảnh/nhật ký.
- Kiểm thông báo AI chưa kích hoạt; không nhập key hay bật AI.
- Khi có bản cập nhật đã phê duyệt, giữ dữ liệu mẫu, đóng/mở client, kiểm version mới và dữ liệu còn nguyên. Không dùng Clear Website Data.
- Ghi PASS/FAIL và ảnh cho từng ca; các mục này hiện chưa được ký PASS.
