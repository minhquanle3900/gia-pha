# M2.1 Mobile Platform → Desktop

Base `0eadd0099377632c3eb8d16fe28390ea2799b61a`, cùng base với PR #6. Commit triển khai `d562ac0534e90885799448516d1fa166c4888ada`. Đã kiểm tra nhánh audit Desktop và các PR đang mở, chưa thấy thay đổi song song trong cấu hình PWA, HTML hay icon. PR này chỉ thay đổi cấu hình, đăng ký worker ở entrypoint, icon và kiểm tra HTTP.

## Cài và mở ngoại tuyến

- **iPhone, Safari** — Mở địa chỉ HTTPS chính thức, chọn Chia sẻ → Thêm vào màn hình chính. Bật **Mở dưới dạng ứng dụng web** nếu có, rồi chọn Thêm.
- **Android, Chrome** — Mở cùng địa chỉ HTTPS, chọn menu ⋮ → Cài đặt ứng dụng. Nếu menu hiển thị **Thêm vào màn hình chính**, chọn cài ứng dụng trong các tùy chọn được cung cấp.
- **Cả hai** — Mở từ biểu tượng khi có mạng và đợi ứng dụng tải xong. Đóng, mở lại một lần khi còn mạng để worker kiểm soát trang. Sau đó đóng, bật chế độ máy bay và mở lại để kiểm. Giữ nguyên origin (giao thức, máy chủ, cổng).

## Bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm test`, `npm run lint`, `npm run build` | **194/194** trong 18 tệp. Lint/build exit 0. Production tạo 12 mục precache. PDF tracked và Bun lock giữ nguyên. |
| `NODE_ENV=production PORT=4203 npm start` rồi `node scripts/check-pwa-assets.mjs http://127.0.0.1:4203` | RED ở base `0eadd00` vì URL icon trả `text/html`. GREEN với manifest đúng MIME, `id`/`scope`/`start_url` là `/`, `standalone`, PNG 192/512, maskable 512 và Apple 180 đúng MIME, chữ ký và kích thước. Maskable có nền kín, logo nằm trong vùng an toàn. |
| Chromium 156 Linux, viewport 390 × 844 | 0 lỗi installability. Cold launch sau khi khởi động lại Chromium, origin không truy cập được và HTTP disk cache tắt. CRUD trên UI và mở lại offline. Bản V2 thử nghiệm đổi revision của shell production cùng origin. Worker chờ khi form còn nháp và khi lượt lưu bị giữ bằng khóa IndexedDB thử nghiệm. Lưu hoàn tất, 0 lần tải lại hay đổi controller. Đóng tab đầu, worker vẫn chờ tab thứ hai. Đóng hết client cũ rồi mở lại, nhận V2 và giữ cả hai ID. |
| CacheStorage ở profile sạch | Chỉ 12 tệp tĩnh cùng origin. Sau GET/POST tổng hợp, không có URL hoặc marker API/Gemini/dữ liệu gia đình. Worker loại trừ `/api` khỏi navigation fallback. Google Fonts vẫn tải online khi có mạng. |
| `bun audit --json` | Hai advisory mức moderate thuộc chuỗi build PWA/Workbox, ở [glob 11.1.0](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) và [minimatch 10.2.6](https://github.com/advisories/GHSA-g3hv-75wg-m249). Workbox hiện yêu cầu `glob ^11.0.1`, bản vá cần major mới. Giữ lockfile và rà lại khi upstream nâng dependency. |

[Cold launch](screenshots/m2-mobile/offline-cold-launch-mobile.jpg) · [Hồ sơ đã sửa offline](screenshots/m2-mobile/offline-edited-profile-mobile.jpg) · [Form còn nháp](screenshots/m2-mobile/update-waiting-draft-mobile.jpg) · [Đang lưu khi worker chờ](screenshots/m2-mobile/update-waiting-save-mobile.jpg) · [Log Chromium](screenshots/m2-mobile/chromium-results.txt). Ảnh dùng giao diện từ base độc lập, trước các thay đổi trong PR #6.

## Handoff cập nhật

Worker mới đợi mọi client cũ đóng. Hãy lưu hoặc hủy form trước khi đóng hết tab và cửa sổ ứng dụng rồi mở lại. Nếu Desktop thêm nút **Cập nhật**, chỉ kích hoạt worker mới khi mọi client đã xác nhận không còn form chưa lưu hay ghi IndexedDB đang chạy. Khi rollback code, giữ origin và IndexedDB, đưa bản tĩnh cần khôi phục về cùng origin và lặp lại chu trình cập nhật.

Thiết bị thật cần kiểm riêng iPhone Safari và Android Chrome. Kết quả Cloud ở trên là Chromium, chưa xác minh cài từ launcher của hệ điều hành.
