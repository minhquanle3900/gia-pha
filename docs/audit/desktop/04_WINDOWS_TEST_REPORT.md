# M0 Windows test report

Baseline: 1cec38dc77ea46260fa0608c931b22e0b508d531. Kết quả release: **FAIL**. Không dùng số unit test để suy ra end-to-end PASS.

## Lệnh đã chạy

| Lệnh | Kết quả cuối | Bằng chứng |
|---|---|---|
| npm exec --yes --package bun -- bun --version | PASS: 1.4.5 | Baseline |
| npm exec --yes --package bun -- bun install --frozen-lockfile | PASS: 626 packages; 3 postinstall blocked | dependency-install.log |
| npm run lint | PASS, exit 0; script chỉ là tsc --noEmit, không có ESLint | lint.log |
| npm run build | PASS sau retry ngoài sandbox | build-retry.log |
| npm test | PASS: 9 files, 79 tests, 2.44s | tests-retry.log |
| node node_modules/tsx/dist/cli.mjs src/__tests__/performanceBenchmark.ts | PASS coordinate/NaN invariants ở 100/500/2000/5000 | benchmark-retry.log |
| npm run dev | PASS, mở UI thật tại localhost:3000 | dev-server.log |
| node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 | PASS, production local | preview-server.log |
| node docs/audit/desktop/evidence/mock-server.cjs | PASS: mock success/503; không dùng API key | mock-ui.log |
| npm run clean | SKIP: ngoài nhu cầu audit; script rm -rf không được xác nhận tương thích cmd | package.json, không gọi xóa |

Các log build.log/tests.log/benchmark.log giữ lần thất bại sandbox EPERM. Không phải lỗi sản phẩm tái hiện ngoài sandbox. Bun blocked postinstall được giữ nguyên; không chạy trust hàng loạt vì build và tests đã chạy được.

Build cảnh báo: main JS 1,948.95 kB (gzip 541.05 kB), CSS 92.50 kB; import động backupReminderService không split được do import tĩnh; __dirname configLoader native tương lai và HMR config deprecated. Đây là cảnh báo, không phải build FAIL.

## Runtime cases đã chạy

| ID | Thao tác / expected | Actual / verdict | Evidence |
|---|---|---|---|
| RT01 | Mở seed mới, 31 người | Đúng / PASS | desktop-dashboard.txt |
| RT02 | Điều hướng 10 màn chính | Mở được đủ; không đánh đồng toàn bộ control bên trong / PASS navigation | desktop-*.txt, mobile-*.txt |
| RT03 | Lưu form tên rỗng bị chặn | Không lưu; form còn mở / PASS | member-empty-validation.txt |
| RT04 | Tạo M0 DEMO Nguyễn Kiểm Thử | Hồ sơ hiển thị, count 32 / PASS | crud-reload-search.txt |
| RT05 | Reload rồi tìm M0 DEMO | Tìm được record / PASS | crud-reload-search.txt |
| RT06 | Sửa tên thường gọi | Hiển thị Đã sửa M0 Desktop / PASS | crud-edit.txt |
| RT07 | Gắn cha Trần Văn Lộc rồi thử đảo thành con | Link đầu ghi được; link đảo bị chặn vòng lặp / PASS case này | relationship-create.txt, issue-ancestry-cycle-blocked.jpg |
| RT08 | Xóa đúng hồ sơ M0, không xóa cha | Trở về danh sách 31; seed vẫn có / PASS smoke; các side-link phức tạp chưa đủ | crud-delete.txt |
| RT09 | Đời 1, chuyển danh sách bảng | Hai người đời 1; bảng render / PASS | member-filter-generation.txt, member-table.txt |
| RT10 | JSON export → restore → export, so record | 7 collection không đổi sau sắp theo ID / PASS | export-comparison.json, after-json-restore.json |
| RT11 | GEDCOM export/import tiếng Việt | Nhập được 31 người nhưng 40→42 quan hệ, events/media/stories→0 / FAIL full-fidelity | after-gedcom-import.json |
| RT12 | CSV mẫu preview/confirm | +3 người, +1 union, +2 quan hệ / PASS import smoke | after-csv-import.json, desktop-csv-preview.jpg |
| RT13 | Sau CSV tìm trùng Trần Quốc Tuấn 1954 | 2 record nhưng modal báo sạch / FAIL theo thông điệp tuyệt đối | issue-duplicate-false-clean.jpg |
| RT14 | Gộp fixture giữ mốc, links sau reload | Mốc 1→0, story.personIds=[], root/founder mất / FAIL | cloud-001-result.json |
| RT15 | Chọn ảnh rồi hủy | people giữ 2, media 1→2 / FAIL | photo-cancel-result.json |
| RT16 | Upload JSON có chu trình, chỉ preview rồi hủy | Vẫn đưa nút Xác nhận thay thế, không báo cycle / FAIL validation preview | cloud-003-cyclic-preview.txt |
| RT17 | Xuất PDF sách | Tải 7 trang A4, 2,723,571 bytes; xem PNG đủ 7 trang, chữ có dấu đọc được / PASS sample này | book-export.pdf, book-pdf-1..7.png |
| RT18 | Xuất PDF hồ sơ từ report modal | Lỗi unsupported color oklab, hiện fallback instruction / FAIL | person-pdf-confirmed-error.txt, dev-server.log |
| RT19 | SVG nan quạt export mở độc lập | Text tiếng Việt và path hiển thị / PASS sample | fan-chart.svg, svg-independent.jpg |
| RT20 | File HTML với tên M0 <b>Thử</b> & An | Xuất raw markup thay vì literal escaped / FAIL | literal-name-report.html, cloud-013-result.json |
| RT21 | QR copy từ hồ sơ tổng hợp | Plaintext đúng tên và tên thường gọi / PASS payload; quét camera SKIP | qr-payload.txt |
| RT22 | Tra xưng hô hai demo | Modal và kết quả cha/con render / PASS smoke; correctness toàn graph SKIP | kinship-result.txt |
| RT23 | Lễ giỗ: 4 tab | Nội dung lịch, văn khấn, 3 miền, chuẩn bị render / PASS navigation | rites-*.txt |
| RT24 | Dark toggle + reload | Class dark tồn tại sau effect; đọc kém tại gradient / PASS persistence, FAIL contrast | dark-gradient-contrast.json |
| RT25 | Escape relationship dialog | Vẫn mở / FAIL | keyboard-relationship.txt |
| RT26 | Tab từ Lưu hồ sơ trong modal | Focus vào BODY ngoài dialog / FAIL | modal-focus-tab.json |
| RT27 | Viewport 320/390/1366 | Header có overflow và clipping / FAIL | settled-captures.json, mobile-a11y.json |
| RT28 | Gemini không có key | Hiện lỗi cấu hình, không lưu draft / PASS error path | ai-missing-key.txt |
| RT29 | Gemini mock success rồi hủy | Textarea nhận draft; vẫn 31 người sau hủy / PASS draft-not-saved | ai-mock-draft.txt, ai-mock-cancel-not-saved.txt |
| RT30 | Gemini mock HTTP 503 | Hiện lỗi cụ thể; form còn thao tác được / PASS error path | ai-mock-error.txt |
| RT31 | Production warm, stop server, reload, tìm marker | UI và hồ sơ marker vẫn đọc được / PASS origin-outage case | pwa-offline-marker.txt |
| RT32 | Icon manifest production | 4 PNG URL trả HTML / FAIL | pwa-http-assets.json |

## Benchmark thực tế và giới hạn

| Người | Hậu duệ p50/p95 ms | Tổ tiên p50/p95 ms | Toàn cảnh p50/p95 ms |
|---|---|---|---|
| 100 | 0.71 / 5.15 | 0.32 / 0.72 | 0.85 / 3.02 |
| 500 | 1.93 / 7.83 | 0.94 / 2.19 | 3.56 / 8.74 |
| 2,000 | 12.70 / 61.00 | 5.61 / 25.98 | 27.77 / 78.31 |
| 5,000 | 40.06 / 108.75 | 15.14 / 33.79 | 63.94 / 145.49 |

15 vòng/mức, Node trên Windows. Banner benchmark in Linux x64 là hardcoded; các câu FPS/DOM mount trong log là ước lượng tĩnh, **không phải số đo trình duyệt**. Không tuyên bố 60 FPS. Browser pan/zoom trace 500/2000/5000: BLOCKED/chưa thực hiện.

## Các mục không được tính PASS

Chrome/Edge stable riêng và version, thiết bị touch thật, bàn phím ảo, screen reader, browser zoom 200% (gửi phím zoom không đổi viewport, không xác nhận mức zoom), cold install offline toàn mạng, PWA update lifecycle, mic permission/ghi âm thật, voice Việt, IndexedDB quota/disk-full, transaction fault injection, cross-tab race, import malformed nested variants đầy đủ, leap-month/calendar boundary, native print driver và PDF Letter/A1/A0. Những mục này còn trong backlog/Cloud handoff, không bị bỏ qua trong kết luận RC.

Không chạy dependency security audit lần hai vì thuộc Cloud. Không gọi Gemini thật. Không kiểm bằng dữ liệu thật. Hai PDF bị suite ghi đè đã restore; không tính chúng là PDF browser E2E.

## Kiểm tra gói audit

8 tài liệu bắt buộc và 43 ảnh đã có; liên kết Markdown nội bộ được kiểm tra không thiếu đích. Source/PDF tracked và bun.lock không khác baseline trước stage. git diff --cached --check báo whitespace ở log/HTML tải xuống nguyên bản; các artifact được giữ nguyên để không sửa bằng chứng, không phải lỗi build/source. Checksum chuẩn hóa CRLF→LF cho text; binary giữ nguyên bytes.
