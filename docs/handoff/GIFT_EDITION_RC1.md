# Cội Nguồn · Gift Edition RC1

**Demo ready có điều kiện.** Bản build, ZIP và kịch bản dữ liệu tổng hợp đã qua Chromium với bản Linux của cùng launcher. **Windows bấm đúp, SmartScreen, iPhone và Android thật: SKIP.** **Production ready: BLOCKED** đến khi hoàn tất kiểm thử thiết bị thật, xác minh khôi phục trên origin HTTPS đã duyệt và chốt quy trình sao lưu định kỳ.

## Tải và mở

1. Tải ZIP 6,6 MiB, giải nén toàn bộ rồi bấm đúp `Coi-Nguon-Gift-Edition-RC1/Mo-Coi-Nguon.cmd` trên Windows 10/11 x64 hoặc ARM64. [ZIP](https://raw.githubusercontent.com/minhquanle3900/gia-pha/2a1124f30f6abda498ca96fb5ba13ddefb511e38/release-artifacts/Coi-Nguon-Gift-Edition-RC1.zip) · [SHA-256](https://raw.githubusercontent.com/minhquanle3900/gia-pha/2a1124f30f6abda498ca96fb5ba13ddefb511e38/release-artifacts/Coi-Nguon-Gift-Edition-RC1.zip.sha256)
2. Giữ cửa sổ launcher mở. Nếu trình duyệt chưa tự mở, dùng đúng địa chỉ `http://127.0.0.1:4315/`. Launcher kiểm tra build, dùng lại tiến trình cùng bản và báo lỗi nếu cổng bị chương trình khác chiếm. Dùng cùng origin và hồ sơ trình duyệt để mở lại IndexedDB.
3. `BAT-DAU.html` là hướng dẫn một trang kèm demo 7 phút. Gói có production build, hai launcher và `Gia-Pha-Mau-Tong-Hop.json`, gồm 31 người mẫu. Máy demo không cần Node, Go hoặc Gemini key. Launcher chưa ký. Nếu Windows chặn, chuyển cho QA hoặc IT xác minh.

## Hội tụ và kiểm thử

Pin Cloud ghi trong chỉ thị thiếu đoạn `687f`. GitHub PR #14 và bàn giao trước cùng xác nhận SHA 40 ký tự được dùng bên dưới.

- Cloud #14 `61387374be45c6446864814d8877cf95e9fa` và Desktop #15 `ebb49afefcefc2abffdf03e69202b45f4f26b2c2` là hai parent trực tiếp của merge `f65bae9c2da685c2d3ab18596e3fe3c76610536c`. Cả hai chứa #12 và #13. Desktop tested code `2036fbe9fa7cada034f565121d25fe7d872b42aa` là tổ tiên của #15 và cây ngoài `docs/` khớp #15.
- Merge tự động. Đã đối chiếu Gallery với Cloud và các hook/modal với Desktop. RC chỉ sửa thêm thông báo Gemini trong hướng dẫn lần đầu và PersonForm vì bản trước vẫn mời dùng AI khi tính năng đã khóa. Source pin ghi trong ZIP là `c682b9652ca00505aeb1b19a5329aec8d68e83d5`. ZIP cuối có cùng nội dung `dist` theo đối chiếu từng tệp với build chạy QA.
- **327/327, 24 tệp.** Giữ toàn bộ 255 ca Cloud. Desktop bổ sung 40 ca modal scope và 32 ca nháp. Inventory không có tệp test bị xóa. `npm test`, `npm run lint`, `VITE_GEMINI_BIOGRAPHY_ENABLED=false npm run build` và `node scripts/check-pwa-assets.mjs http://127.0.0.1:4315` PASS. [Log QA](gift-rc1/QA.txt)

| P1 | Kết quả Chromium |
| --- | --- |
| GP-DESK-M2-001 · Màu PDF | PASS. PDF trực tiếp và qua modal giữ bảng màu in sáng ở cả theme. |
| GP-DESK-M2-002 · Khổ giấy PDF | PASS. Tám tổ hợp A4, Letter tải trực tiếp từ modal, Letter in hệ thống bằng Chromium và A4 offline đều có hai trang. Đã xem 22 trang. [Trang 1–8](gift-rc1/pages-1.jpg) · [Trang 9–16](gift-rc1/pages-2.jpg) · [Trang 17–22](gift-rc1/pages-3.jpg) |
| GP-DESK-M2-003 · An toàn modal | PASS. PersonForm giữ nháp và trả focus, xác nhận bỏ nháp, chặn Escape/backdrop/close khi transaction IndexedDB chờ. RelationshipEditor focus ô lọc và chỉ xóa một liên kết sau khi thả khóa. Stack custom → native → custom đóng từng lớp qua Escape và trả focus đúng thứ tự. Gallery qua ca viewer và xác nhận lồng nhau. |

- **Privacy.** Gemini OFF trên Dashboard, hướng dẫn và PersonForm. Express và launcher local trả HTTP 403 cho POST trực tiếp. Canary ghi nhận 0 request ngoài hoặc POST API khi ứng dụng mở và khi xem chân dung, ảnh hoặc ghi âm có URL ngoài. JSON giữ URL gốc. Charm phục vụ cục bộ với OFL đi kèm.
- **Backup và offline.** Trên frontend production đã tải JSON, so sánh với 8 store, thực hiện thêm/mở lại/sửa/xóa hồ sơ offline, nạp bản rỗng rồi khôi phục đủ 8 store bằng UI. Bỏ qua duy nhất giá trị metadata `settings.lastBackupAt` khi so bản ghi. Duyệt Kho kỷ vật → Phòng trưng bày → tác phẩm khi offline và xác nhận Charm đã nạp.

## Trước khi dùng gia phả thật

- **Windows thật.** Dùng thư mục có dấu hoặc khoảng trắng. Bấm đúp file CMD, kiểm tra Edge/Chrome mở đúng URL. Thử mở lần hai và mở khi chương trình khác chiếm cổng. Kiểm tra mở lại cùng hồ sơ sau khi đóng launcher, tải JSON và phục hồi dữ liệu mẫu.
- **iPhone và Android thật.** Với cùng một URL HTTPS được duyệt, cài qua Safari → Chia sẻ → Thêm vào MH chính và Chrome → Cài đặt ứng dụng. Kiểm tra icon/standalone, mở lại sau một lần tải online, thêm/sửa dữ liệu offline, tắt và mở lại app. Thử modal với bàn phím thật, PDF A4/Letter, tải JSON, khôi phục chéo thiết bị, cập nhật PWA khi đã lưu nháp và kiểm tra dữ liệu còn nguyên.
- **Phương án HTTPS.** Dùng một hostname thuộc Product Owner phục vụ `dist` ở gốc với TLS hợp lệ. Giữ `start_url`, scope và origin cố định. Cho `index.html`, manifest và `sw.js` tái xác thực cache, cache lâu cho asset có hash. Dùng backend khóa Gemini hoặc trả 403 ở gateway tại `/api/biography/generate`. Xác minh bằng fixture tổng hợp trước khi duyệt sử dụng dữ liệu thật.

## Rollback

Xuất JSON trước khi đổi build hoặc origin. Với demo, dừng launcher, giữ hồ sơ trình duyệt và chạy lại gói đã kiểm trên cùng địa chỉ nếu cần. Với source, dùng worktree mới từ exact #14 `61387374be45c6446864814d8877cf95e9fa` để tách phần Desktop khỏi core đã duyệt. Với môi trường HTTPS sau này, phục hồi asset và worker của bản đã duyệt tại cùng origin, đóng các tab cũ để worker kích hoạt, rồi kiểm lại IndexedDB và khả năng khôi phục JSON. Không cần hợp nhất nhánh nguồn để thực hiện các bước này.
