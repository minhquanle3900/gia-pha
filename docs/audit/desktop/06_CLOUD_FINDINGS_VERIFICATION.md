# Cloud findings verification

Application baseline: **1cec38dc77ea46260fa0608c931b22e0b508d531**. Cloud audit SHA: **b2b707de6c3ff2207cfbb08f3b93b259460618db**. Đọc handoff/backlog qua git show sau fetch; không merge/checkout Cloud. [Handoff đã đọc](evidence/cloud-handoff.md), [backlog đã đọc](evidence/cloud-backlog.md).

## Theo Issue ID

| Issue | Desktop verdict | Phần xác nhận / giới hạn | Evidence |
|---|---|---|---|
| GP-CLOUD-001 | **CONFIRMED FAIL** | Nhập fixture 3 người, chọn radio thứ hai giữ m0_target, gộp, UI báo bảo toàn; reload/export: lifeEvents 1→0, story link rỗng, root/founder undefined. Media chuyển sang target đúng. | merge-fixture.json, after-merge.json, cloud-001-result.json; cloud-001-merge-preview/success.jpg |
| GP-CLOUD-002 | **BLOCKED** atomicity | Chỉ đã chạy merge success path. Không chèn lỗi transaction/race bằng source hoặc DevTools. Không thể suy ra rollback từ GP-CLOUD-001. | Cần fault-injection harness riêng được kiểm soát |
| GP-CLOUD-003 | **CONFIRMED PARTIAL FAIL** | Preview JSON có parent↔child cycle vẫn cho confirm thay thế, không thông báo cycle; đã hủy, không ghi graph lỗi. Happy-path JSON giữ đủ collections. Kiểu nested/quota/merged graph còn pending. | cyclic-preview-fixture.json, cloud-003-cyclic-preview.txt/.jpg, export-comparison.json |
| GP-CLOUD-004 | **SKIP / chưa xác nhận** | UI parent-cycle case đạt; chưa lập đầy đủ hai union, test từ hai đầu hoặc hai tab cho cùng cặp. | relationship-create.txt chỉ chứng minh parent-child |
| GP-CLOUD-005 | **BLOCKED** runtime PIN | Chỉ thấy mặc định Đã mở PIN. Không enroll/đổi PIN trong profile chưa có quy trình credential test; không kết luận bảo mật/mã hóa từ icon. | Cần session test PIN do người dùng kiểm soát; Cloud source finding giữ nguyên |
| GP-CLOUD-006 | **CONFIRMED FAIL** | 4 PNG URL manifest/touch trả HTML 200. SW/manifest có thật. Cache shell origin-outage lại hoạt động. | pwa-http-assets.json, pwa-offline-marker.txt |
| GP-CLOUD-007 | **CONFIRMED FAIL** cancellation | Sau merge có 2 người/1 media. Thêm người→chọn PNG tổng hợp→Hủy→export: vẫn 2 người, media thành 2; media mới không có personIds. | after-photo-cancel.json, photo-cancel-result.json |
| GP-CLOUD-008 | **CONFIRMED UI BEHAVIOR / risk decision pending** | QR có plaintext tên + thường gọi + sinh thời. Copy lấy được đúng text; không có picker trường trong UI đã mở. Chưa quét camera, không kết luận toàn bộ scanner. | qr-payload.txt |
| GP-CLOUD-009 | **PARTIAL CONFIRMATION** | Nút Soạn AI gọi endpoint ngay, không có màn preview payload trước gửi. Mock nhận keys; draft đi vào form, Hủy không lưu; 503/no-key hiện lỗi. Không xác nhận auth/quota, không gọi Gemini, không kiểm chất lượng model thật. | mock-ui.log, ai-mock-draft/error/cancel-not-saved.txt, ai-missing-key.txt |
| GP-CLOUD-010 | **CONFIRMED build measurement; runtime perf BLOCKED** | Main chunk đúng 1,948.95 kB, gzip 541.05. Không có pan/zoom FPS trace hoặc cold-load browser số đo. | build-retry.log; benchmark-retry.log chỉ Node |
| GP-CLOUD-011 | **SKIP** | Advisory review thuộc Cloud, không đổi dependency trong M0, không diễn giải lại advisory khi chưa chạy audit ở Desktop. | Giữ Cloud backlog, không hạ finding |
| GP-CLOUD-012 | **CONFIRMED FAIL test hygiene** | npm test exit 0 và 79 tests pass nhưng git status có hai PDF root bị sửa; restore đúng baseline. | Windows command evidence và baseline report; working-tree tracked diff sau restore rỗng |
| GP-CLOUD-013 | **CONFIRMED FAIL HTML export** | Tên bình thường M0 <b>Thử</b> & An được UI lưu literal; File HTML xuất raw markup, không có escaped literal. Không chèn script/event payload và không tuyên bố đã exploit JS. PDF modal độc lập đang lỗi GP-DESK-002. | literal-name-report.html, cloud-013-result.json |

## Kết quả từng case handoff

| Case | Verdict tổng | Đã chạy / chưa chạy |
|---|---|---|
| D01 | **FAIL** | Merge/reload/snapshot mất event và link; fault rollback BLOCKED |
| D02 | **BLOCKED / PARTIAL** | CRUD, parent-cycle và safe delete synthetic smoke PASS; 3 đời + 2 hôn phối + adoption + hai đầu union chưa đủ |
| D03 | **FAIL / PARTIAL** | JSON happy path PASS; CSV/GEDCOM thật; photo-cancel FAIL; cross-origin image/audio playback chưa chạy |
| D04 | **FAIL / BLOCKED** | HTML literal escaping FAIL, PDF cá nhân FAIL, QR payload PASS sample; PIN/camera scan BLOCKED |
| D05 | **FAIL / BLOCKED** | Icons FAIL; warm cache origin-outage PASS; install/cold offline/update lifecycle chưa chạy |
| D06 | **PARTIAL** | Local mock success/error và Hủy không lưu PASS; preview đồng ý trước gửi thiếu; voice thật/auth/quota SKIP |
| D07 | **FAIL / BLOCKED** | 320/390/1366 screenshots, dark contrast, modal Escape/focus FAIL; zoom200/Chrome/Edge/touch chưa xác nhận |
| D08 | **SKIP / PARTIAL** | Các tab nghi lễ và chart số seed đã nhìn thấy; không tính là test boundary tháng nhuận/permissions |
| D09 | **FAIL / PARTIAL** | Book PDF tiếng Việt 7 trang + SVG độc lập PASS sample; PDF cá nhân FAIL; browser FPS trace BLOCKED |
| D10 | **BLOCKED** | Mic, denied/allowed, quota và crash-recovery cần profile/device permission fixture riêng |

## Rejected Cloud hypotheses

**Không có Issue ID Cloud nào bị Desktop bác bỏ với bằng chứng hiện tại.** Các phần chưa chạy là pending, không phải rejected. Không gán lỗi độc lập Desktop thành Cloud-confirmed nếu chỉ giống triệu chứng.

Các suy diễn rộng bị loại khỏi kết luận (không phải phát biểu quy cho Cloud):

- “Offline toàn bộ hỏng”: không được hỗ trợ; origin-outage shell + persistence đã PASS.
- “79 unit tests chứng minh browser PDF/PWA đạt”: sai; PDF cá nhân lỗi còn icon không phải ảnh.
- “Mọi duplicate đều không phát hiện”: sai; fixture đồng nhất có 1 cặp 100%; CSV sample khác đời/chi vẫn bị bỏ sót theo thông điệp sạch.
- “GEDCOM là bản sao lưu toàn vẹn”: không đúng với kết quả runtime, phải dùng JSON cho full snapshot.

## Nghi vấn gửi lại Cloud

1. Vì sao GEDCOM round-trip tạo thêm 2 quan hệ (40→42), phân loại/union nào thay đổi? Không xác nhận nguyên nhân chỉ bằng bộ đếm.
2. Ngưỡng phát hiện duplicate và copy “hoàn toàn trong sạch” có nên tách nhau? Không tự gộp người trùng tên.
3. Đưa lifeEvents/story/root/founder vào một transaction merge; chỉ ra fault test rollback và giữ schema v1.
4. PDF modal html2canvas nhận oklab từ Tailwind v4; so với pipeline sách đã xuất được để sửa tối thiểu.
5. PIN nên là che màn hình hay mã hóa at-rest? Cần PO chốt phạm vi, không dùng UI icon làm cam kết mã hóa.
6. Xác minh nguồn request ngoại vi (Google fonts/Maps/AI/speech) và copy local-only phù hợp hành vi có opt-in.
