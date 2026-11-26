# M2.3 · Typography Di sản

Base PR #8 `cf009fcc26f4c9ef5ba7a14a69daba2984af94f9`, code `290a6dc`. **BLOCKED · Thư pháp Quốc ngữ nét bút lông**. Câu đối đang dùng Charm, chữ viết tay Thái–Latin nét bút đầu dẹt, với nhãn dự phòng. Giữ nguyên “Cựu niên” trong catalog và ghi chú “Khứa niên” đang chờ Product Owner xác nhận.

## Font và vai trò

| Vai trò | Font cục bộ · dung lượng WOFF2 | Nguồn |
|---|---|---|
| Brush dự phòng · `.heritage-brush` | Charm · 35.4 KiB | [Cadson Demak](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/charm) |
| Display · `.heritage-display`, `.heritage-intro` | Viaoda Libre · 45.2 KiB | [Gydient, ViệtAnh Nguyễn](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/viaodalibre) |
| Heading · `.heritage-heading` | Cormorant Garamond · 225.2 KiB, thường và nghiêng | [Christian Thalmann](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/cormorantgaramond) |
| Body và UI · `.heritage-body`, `.heritage-ui` | Plus Jakarta Sans · 53.8 KiB | [Tokotype](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/plusjakartasans) |
| Monospace hiện có | JetBrains Mono · 51.9 KiB | [JetBrains, Philipp Nurullin, Konstantin Bulenkov](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/jetbrainsmono) |

Sáu WOFF2 subset Latin/Việt được tạo từ TTF theo revision Google Fonts trong bảng. FontTools xác minh đủ 146 dạng chữ Việt NFC và ký tự cấu thành NFD. Giấy phép OFL 1.1 và ghi công nằm ở `public/font-licenses/`. OFL cho phép nhúng, phân phối cùng ứng dụng và sửa/subset theo điều kiện của giấy phép. Các bản nguồn được chọn không khai báo Reserved Font Name. [SIL OFL](https://openfontlicense.org/) · [Giải thích về nhúng và sửa đổi](https://openfontlicense.org/ofl-faq/)

UTM Thiên Ân và DL có metadata hoặc ghi công thứ cấp, chưa thấy điều khoản từ chủ quyền cho phép nhúng, chuyển đổi và phân phối lại. HL nêu giấy phép thương mại riêng. FontZin Đức Thủy yêu cầu quyền đầy đủ khi nhúng lên web. Dancing Script hỗ trợ tiếng Việt nhưng theo chữ viết phương Tây và có Reserved Font Name. [UTM](https://fonts2u.com/utm-thuphap-thien-an.font) · [DL](https://fontxinh.com/font/font-dl-thu-phap/) · [Hùng Lân](https://www.dafont.com/font-comment.php?file=hl_thuphap_1bk) · [FontZin](https://fontzin.com/font-thu-phap-viet-sieu-dep-2023/) · [Dancing Script](https://github.com/google/fonts/tree/6ebe737e44fd64ee736bbc6feed6136a6dbfd222/ofl/dancingscript)

## Bản thử và kiểm thử

- Chạy `npm run dev`, mở `/tools/font-specimen/` để xem ba font trên cùng nội dung. Fixture nằm ngoài navigation và production build.
- Các điểm áp dụng nằm ở Dashboard, Exhibition, Gallery, Journal, Rites và Family Book. Bốn kiểu khung câu đối dùng text, hai vế giữ thứ tự đọc và kiểu đã chọn được giữ trong fullscreen.
- `npm test` **221/221**, `npm run lint` và `npm run build` đạt. Chromium dùng font thật ở 320, 390, 430, 768 và 1440 px trong light/dark. Kiểm dấu, khung chữ, radio bằng bàn phím, hai vế dọc, fullscreen/Escape, trả tiêu điểm và fallback khi chặn mọi WOFF2.
- Worktree riêng ghép PR #7 `6ffcba5`. HTTP manifest/icon/worker đạt, cả sáu font trả `font/woff2` và có trong precache cùng origin. Kiểm lần mở triển lãm đầu khi offline và tải Charm qua worker.
- Chromium tải PDF Sách phả ký 7 trang qua pipeline canvas. Bản in từ app nhúng Viaoda Libre. Bản HTML độc lập dùng Georgia và giữ dấu khi in. Đường fallback jsPDF cũ giữ như baseline.
- Baseline precache 2404.69 KiB → 2820.88 KiB, tăng 416.19 KiB, gồm 411.5 KiB font. Main JS gzip tăng 0.21 kB. Chrome Android và Safari iOS thật chưa kiểm.

## Ảnh

- [Specimen mobile](screenshots/m2-calligraphy/specimen-390-light.jpg) · [Specimen desktop](screenshots/m2-calligraphy/specimen-1440-light.jpg).
- [Câu đối trước](screenshots/m2-calligraphy/before-couplet-390-light.jpg) · [Đỏ son sau](screenshots/m2-calligraphy/after-lacquer-390-light.jpg) · [Giấy dó](screenshots/m2-calligraphy/after-paper-390-light.jpg) · [Gỗ trầm](screenshots/m2-calligraphy/after-wood-390-dark.jpg) · [Tranh cuộn](screenshots/m2-calligraphy/after-scroll-390-light.jpg) · [Fullscreen desktop](screenshots/m2-calligraphy/after-couplet-fullscreen-1440-light.jpg).
- [Bìa PDF trước](screenshots/m2-calligraphy/pdf-cover-before.jpg) · [Bìa PDF sau](screenshots/m2-calligraphy/pdf-cover-after.jpg) · [Log kiểm thử](screenshots/m2-calligraphy/verification.txt).

**NEXT_TASK** · Product Owner xác nhận dị bản và chọn font truyền thống có văn bản cho phép nhúng, phân phối lại, chuyển đổi/subset. Desktop dùng các lớp typography từ `src/styles/heritageTypography.css` cho nhãn thương hiệu AppShell, tiêu đề văn hóa ở Tree/Profile và các điểm nhấn ngắn trong UI Foundation. Menu, nút, form và bảng dùng vai trò UI.
