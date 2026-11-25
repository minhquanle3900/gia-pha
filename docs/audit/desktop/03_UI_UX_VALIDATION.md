# M0 UI/UX validation

Antislop active: **AFTER (session override)**. Chỉ ghi nhận audit theo lựa chọn người dùng. Không đổi bản sắc hoặc sửa UI trong M0. Baseline 1cec38d.

## Bản sắc cần giữ

Xanh lá trầm #1B3B2B, giấy kem, sắc vàng nhấn, chữ serif cho phả ký và nội dung tiếng Việt. Điều hướng desktop + bottom navigation mobile đã tồn tại. Tiếp tục dùng AppShell, ConfirmDialog, PersonFormModal, FlexibleDateInput và component bộ lọc hiện tại. Mục tiêu M1 là làm chúng nhất quán và dễ đọc, không thay template.

## Lỗi tái hiện độc lập

### GP-DESK-001 · P1 · Header tràn ngang, che nút hành động

- Baseline demo 31 người, light, mở Tổng quan.
- Desktop 1366×768: document.scrollWidth 1840px; header dài hơn viewport. Lặp qua các màn: 1806–1842px tùy tên tiện ích.
- Mobile 390×844: document.scrollWidth 394px, nút thêm người bị cắt ở mép phải. Mobile 320×768: vẫn 394px, tràn 74px.
- Expected: header nằm trong viewport, mọi hành động quan trọng chạm/Tab được mà không cuộn ngang toàn trang.
- Actual: logo, 6 mục desktop, tìm kiếm và actions cùng một hàng; thao tác tự cuộn ngang có thể làm người dùng mất ngữ cảnh.
- Repro: đặt viewport → reload → Tổng quan → nhìn mép phải; so innerWidth với scrollWidth.
- Evidence: [desktop](screenshots/desktop-dashboard.jpg), [320px](screenshots/mobile-320-dashboard.jpg), [390px](screenshots/mobile-data.jpg), [số đo ổn định](evidence/settled-captures.json), [phần tử gây tràn](evidence/mobile-a11y.json).
- File liên quan: src/components/AppShell.tsx. Reuse navigation/menu hiện tại, đổi điểm reflow hoặc gom actions có sẵn; không thêm menu chức năng mới.

### GP-DESK-002 · P1 · Tải PDF hồ sơ cá nhân lỗi

- Thành viên → icon “Xuất bản in & PDF hồ sơ cá nhân” → “Tải PDF (.pdf)”.
- Expected: tải PDF đọc được tiếng Việt.
- Actual: hiện “Có lỗi khi tạo tệp PDF, quý vị có thể dùng nút In / Lưu PDF bên cạnh”; console html2canvas không parse được color function oklab. Không có file tải trong lần này.
- Tái hiện hai đường chọn hồ sơ; thông báo chỉ tồn tại khoảng 4 giây nên cần quan sát ngay.
- Evidence: [ảnh lỗi](screenshots/issue-person-pdf.jpg), [snapshot](evidence/person-pdf-confirmed-error.txt), [console](evidence/dev-server.log).
- File: PersonReportModal.tsx:143–166, personPdfReportService.ts:62–77. Tái dùng bộ dựng report và cách sách đang xuất được. Native print là phương án hiện có nhưng chưa kiểm driver, không coi là đã sửa lỗi.

### GP-DESK-003 · P1 · Modal keyboard và nhãn form chưa đủ

- Hồ sơ → + Thêm/Sửa quan hệ → nhấn Escape từ nút Thêm liên kết: dialog vẫn mở (count=1).
- Thêm người → focus nút Lưu hồ sơ → Tab: activeElement thành BODY, không nằm trong dialog. Focus có thể ra nền.
- Data page có 4 trường thông tin chung không được nối label/aria-label; select gốc cũng thiếu tên truy cập. Close button trong một số dialog không có accessible name.
- Expected: Escape đóng modal không phá dữ liệu, focus được giữ/trả về trigger, field có nhãn lập trình được. Không suy ra mọi modal đều lỗi giống nhau.
- Evidence: [Escape](evidence/keyboard-relationship.txt), [focus](evidence/modal-focus-tab.json), [labels](evidence/mobile-a11y.json). [Form 320px](screenshots/mobile-320-person-form.jpg).
- File: RelationshipEditorModal.tsx, PersonFormModal.tsx, ConfirmDialog.tsx, DataManagementPage.tsx. Sửa hành vi dùng chung trước, không viết form mới.

### GP-DESK-004 · P1 · Dark mode thiếu tương phản trên gradient kem

- Tổng quan → bật dark → xem heading Nhắc Nhở Ngày Giỗ & Tiết Kỵ Sắp Tới.
- Text thực tế rgb(237,230,220); gradient vẫn có stop rgb(250,247,242), cùng các stop (255,253,249)/(250,244,235).
- Ratio tại stop giữa: **1.159:1**, dưới 3:1 cho heading bold 18px và dưới 4.5:1 cho chữ thường. Không đánh giá bằng mắt thay số đo.
- Toggle/reload giữ class dark sau khi effect hoàn tất; đây là lỗi palette bề mặt, không phải toggle chết.
- Evidence: [ảnh dark](screenshots/desktop-dashboard-dark.jpg), [styles](evidence/dark-gradient-contrast.json), [phép tính](evidence/contrast-calculation.json).
- File: src/index.css và UpcomingAnniversariesWidget.tsx. Tái dùng màu theme đang có, sửa cả nền gradient và foreground theo theme.

### GP-DESK-005 · P1 · Thay thế bằng GEDCOM không trình bày đủ phần bị bỏ

- Dữ liệu → xuất GEDCOM từ seed → chọn lại chính file đó → Xác nhận thay thế → xuất JSON.
- People 31 giữ nguyên; unions 12 giữ; relationships 40→42; lifeEvents 7→0, media 5→0, stories 3→0; tên dòng họ đổi thành Gia Phả Nhập Từ GEDCOM.
- GEDCOM là trao đổi phả hệ có mất mát, không phải full backup. Dialog cảnh báo thay thế chung nhưng không liệt kê bộ đếm collection sẽ mất; tên “Sao lưu/khôi phục” gần luồng này dễ gây hiểu sai.
- Expected: đối chiếu preview và phạm vi mất mát rõ trước confirm; JSON được khuyến nghị làm backup toàn vẹn.
- Evidence: [comparison](evidence/export-comparison.json), [JSON sau import](evidence/after-gedcom-import.json), [UI](evidence/gedcom-import.txt).
- File: DataManagementPage.tsx, gedcomService.ts. Polish preview/confirmation hiện có. Cần Cloud giải thích 2 quan hệ tăng thêm trước khi chọn remediation; không tự kết luận đó là 2 người mới.

### GP-DESK-006 · P2 · Modal trùng lặp báo sạch quá tuyệt đối sau CSV mẫu

- Seed 31 → tải mẫu CSV → nhập chính mẫu → count 34 → Lọc trùng lặp.
- UI có hai Trần Quốc Tuấn, cùng sinh 1954 (đời/chi khác), modal vẫn ghi Dữ Liệu Gia Tộc Hoàn Toàn Trong Sạch.
- Expected: ngôn từ phản ánh ngưỡng phát hiện, hoặc hiển thị cặp nghi vấn để người dùng quyết định; không tự gộp chỉ vì trùng tên.
- Evidence: [ảnh](screenshots/issue-duplicate-false-clean.jpg), [CSV](evidence/demo-template.csv), [sau import](evidence/after-csv-import.json).
- File: DuplicateMergeModal.tsx, duplicateMergeService.ts. Chưa kết luận threshold cụ thể sai; đề nghị Cloud nghiên cứu. Fixture trùng đủ thuộc tính khác được phát hiện 100%, nên **bác bỏ suy diễn “tính năng phát hiện trùng hoàn toàn không chạy”**.

### GP-DESK-007 · P2 · Tap target và chữ nhỏ gây khó cho người lớn tuổi

- Data mobile: sửa/xóa chi 26×26px; toggle chế độ import cao 24.5px; header controls 31.6–36px; phần lớn nút tải cao 36px.
- Các target này dưới mục tiêu thiết kế 44×44px của audit. Đây không tự động là kết luận vi phạm WCAG 2.2 target size nếu chưa xét ngoại lệ/spacing 24px.
- Chữ hướng dẫn và metadata nhiều nơi 10–12px; cần thử người cao tuổi và zoom trước RC.
- Evidence: [số đo](evidence/mobile-a11y.json), [data](screenshots/mobile-data.jpg). Tái dùng button hiện có, tăng hit area và typography thay vì thêm tooltip giải thích.

## Tinh gọn đề xuất, chưa thực hiện

1. Giữ 4 mục bottom nav và Thêm, tránh đưa tất cả tiện ích ra header. Cho dữ liệu/backup ưu tiên rõ trong menu có sẵn.
2. Dùng một điểm vào báo cáo cá nhân, giữ native print/HTML làm fallback có nhãn rõ. Không mở rộng thêm định dạng khi PDF hiện tại còn lỗi.
3. Tách lời giải thích backup JSON toàn vẹn và trao đổi CSV/GEDCOM bằng chính các card/ConfirmDialog hiện có.
4. Gộp nhãn Đời/Chi/Phái nhất quán giữa chip và select; giữ bộ lọc nâng cao ở vùng có thể thu gọn, không tạo bộ lọc mới.
5. Giữ trang địa danh dạng card nếu đủ nhu cầu; sửa copy “bản đồ” để tránh kỳ vọng pan/zoom không có. Không xây bản đồ mới ở M0/M1 polish.
6. Đẩy giọng nói, AI, QR và A1 vào tiện ích thứ cấp khi các luồng lưu/khôi phục chưa đạt. Không xóa dữ liệu/chức năng trong audit.

## Antislop/a11y delivery gate cho ứng dụng hiện trạng

| Gate | Verdict | Bằng chứng |
|---|---|---|
| R-03 responsive | FAIL | GP-DESK-001; 320px overflow |
| R-25 contrast | FAIL | GP-DESK-004; 1.159:1 |
| R-26/R-32 keyboard, real controls | FAIL/PARTIAL | Escape, focus; nhiều luồng thật đã chạy nhưng không đủ mọi control |
| R-27 empty/loading/error | PARTIAL | DB loading/error có source; AI/PDF error đã thấy; mọi màn chưa chạy đủ |
| R-34 dark | FAIL | Gradient không theo theme |
| R-35 full click-through | BLOCKED/chưa hoàn tất | Không gán PASS từ build hoặc screenshot |
| R-39 labels/affordances | FAIL/PARTIAL | Field thiếu accessible name; chưa kiểm mọi trạng thái |
| R-40 performance | BLOCKED | Node benchmark không đo FPS trình duyệt |
| Purpose/liveliness | SKIP thay đổi | Giữ bản sắc, không thiết kế/generate asset mới |

Gate này cố ý ghi lỗi audit; không phải chứng nhận UI đã hoàn thiện. Các lỗi không được sửa vì M0 chỉ cho tài liệu. Zoom 200%, screen reader, reduced-motion và bàn phím ảo còn cần kiểm thử thật.
