# M0 Desktop → Cloud handoff

Baseline ứng dụng: **1cec38dc77ea46260fa0608c931b22e0b508d531**. Nhánh Desktop: **audit/m0-desktop-runtime**. Cloud handoff đã đọc ở **b2b707de6c3ff2207cfbb08f3b93b259460618db**, không merge. Ngày: 25/11/2026, Asia/Saigon.

**RC verdict: FAIL.** M0 chỉ có tài liệu và bằng chứng; không sửa nghiệp vụ/schema, không deploy/merge main, không bắt đầu M1.

## Kết quả có thể sử dụng ngay

- **PASS:** lint TypeScript; build Windows; 79/79 tests trong 9 files; Node layout benchmark invariants; navigation 10 màn; synthetic CRUD/reload; UI chặn parent-cycle; JSON happy round-trip giữ đủ 7 collections; CSV import sample; PDF sách A4 7 trang tiếng Việt; SVG mở độc lập; AI mock draft/cancel/503; cached production reload và tìm marker khi origin server đã dừng.
- **FAIL:** merge làm mất event/story/root/founder; cancel photo ghi media; cyclic JSON preview không chặn; PDF hồ sơ oklab; HTML literal name không escaped; manifest PNG trả HTML; header overflow; dark contrast 1.159:1; modal Escape/focus; GEDCOM full restore lossy; duplicate modal copy quá tuyệt đối.
- **SKIP:** Gemini thật, dependency advisory audit lần hai, native print/Letter/A1/A0, tất cả tổ hợp control/filter, một số CRUD thứ cấp và boundary lịch âm.
- **BLOCKED/pending:** Chrome/Edge stable version matrix, thiết bị touch thật, zoom200 xác nhận, screen reader, PWA installed cold-offline/update, mic/voice/quota, PIN session kiểm soát, fault-injection transaction/race. Những mục này không được tính PASS.

## Confirmed Cloud findings

| ID | Runtime kết quả |
|---|---|
| GP-CLOUD-001 | 3→2 người; event 1→0; story.personIds=[]; settings.rootPersonId và branch.founderId mất; media chuyển đúng target; UI vẫn báo bảo toàn |
| GP-CLOUD-003 | Preview fixture JSON cyclic vẫn cho confirm (đã hủy, không import graph lỗi) |
| GP-CLOUD-006 | 4 icon PNG URL trả HTML 200 trên production local |
| GP-CLOUD-007 | Chọn PNG rồi Hủy: media 1→2, record mới không liên kết người |
| GP-CLOUD-008 | Plaintext QR chứa trường hồ sơ, UI không có picker trường; camera scan chưa chạy |
| GP-CLOUD-009 | Gửi mock ngay khi click, không payload preview; draft Hủy không lưu và 503 được hiện; auth/quota/Gemini chưa xác minh |
| GP-CLOUD-010 | Main JS 1,948.95 kB (gzip 541.05); chưa có browser FPS trace |
| GP-CLOUD-012 | Suite pass nhưng ghi đè 2 PDF tracked; đã restore baseline |
| GP-CLOUD-013 | File HTML xuất raw M0 <b>Thử</b> & An, không literal escaped; không test payload thực thi |

GP-CLOUD-002 atomicity, 004 union boundary, 005 PIN, 011 advisory còn chờ. Không issue Cloud nào bị bác bỏ. Các suy diễn quá rộng được loại ở [verification](06_CLOUD_FINDINGS_VERIFICATION.md), không gán thành “Cloud sai”.

## Lỗi độc lập Desktop

| Issue | Mức | Triệu chứng / evidence |
|---|---|---|
| GP-DESK-001 | P1 | Header 1366→1840px; 320→394px; [ảnh](screenshots/mobile-320-dashboard.jpg) |
| GP-DESK-002 | P1 | PDF cá nhân html2canvas unsupported oklab; [ảnh lỗi](screenshots/issue-person-pdf.jpg) |
| GP-DESK-003 | P1 | Escape không đóng relationship dialog; Tab form ra BODY; fields thiếu label association |
| GP-DESK-004 | P1 | Dark text trên cream gradient ratio 1.159:1; [ảnh](screenshots/desktop-dashboard-dark.jpg) |
| GP-DESK-005 | P1 | GEDCOM replace: events/media/stories mất; generic confirm không liệt kê scope mất mát |
| GP-DESK-006 | P2 | CSV mẫu tạo 2 Trần Quốc Tuấn 1954 nhưng modal ghi dữ liệu sạch |
| GP-DESK-007 | P2 | Controls 26–36px, khó chạm cho người cao tuổi; chưa tuyên bố WCAG conformance tổng thể |

Chi tiết expected/actual, bước tái hiện và file sửa ở [UI/UX validation](03_UI_UX_VALIDATION.md). Không có P0 ảnh hưởng production được Desktop xác nhận.

## Nghi vấn cần Cloud nghiên cứu

1. Giải thích 40→42 cạnh GEDCOM và xác định mất mát nào là hợp đồng chuẩn/giới hạn đã chấp nhận.
2. Merge transaction bảo toàn event ID, story/root/founder và fault rollback trong schema v1.
3. Threshold duplicate và copy “sạch”; giữ human review, không auto merge trùng tên.
4. Chia sẻ chuẩn style/escape PDF từ pipeline sách sang cá nhân để tránh thêm exporter mới.
5. PO chốt PIN là che màn hình hay mã hóa at-rest, phạm vi QR/AI consent và dữ liệu gửi ra ngoài.
6. Có thể dùng profile/device fixture nào cho mic/quota/PWA update/browser stable matrix mà không động dữ liệu thật?

## Test evidence / cách chạy lại

[Runtime baseline](01_RUNTIME_BASELINE.md) · [Feature matrix 33 mục](02_RUNTIME_FEATURE_MATRIX.md) · [Windows report](04_WINDOWS_TEST_REPORT.md) · [PWA report](05_PWA_OFFLINE_REPORT.md) · [screenshot index](screenshots/README.md).

- Merge: import evidence/merge-fixture.json bằng UI thay thế trên profile test; Thành viên→Lọc trùng→radio thứ hai→Sáp nhập→Hoàn tất→reload→export JSON. So với evidence/after-merge.json và cloud-001-result.json.
- Photo cancel: cùng fixture, thêm người→chọn PNG tổng hợp book-pdf-1.png→Hủy→export; so after-photo-cancel.json.
- Cyclic preview: chọn cyclic-preview-fixture.json rồi kiểm dialog; **Hủy**, không cần ghi cycle vào DB để thấy thiếu chặn preview.
- JSON: demo-backup.json→restore→export→so collection theo ID; after-json-restore.json không khác record.
- AI mock: build dist trước; chạy node docs/audit/desktop/evidence/mock-server.cjs trên 127.0.0.1:4180; tên chứa ERROR nhận 503; tên M0 khác nhận draft mock. Harness không gọi Google, không thay source ứng dụng.
- PWA: xem report để lặp warm-origin-outage; không nhầm với installed cold offline.

Dữ liệu chỉ là seed đã được xác nhận demo và fixture M0 tổng hợp. Main origin 3000 đã phục hồi về seed 31 người sau các ca destructive test. Marker PWA ở origin test 4173 là giả. Không nhập thông tin người thật hoặc credential/API key.

## Blockers / bước tiếp theo

Chặn RC vì các P1 correctness và khả năng thao tác. Đề xuất M1.1 dữ liệu → M1.2 xuất bản → M1.3 UI/a11y → M1.4 PWA/privacy/browser gate, với acceptance và rollback ở [backlog](07_REMEDIATION_BACKLOG.md). **Không tự bắt đầu M1.** Draft PR audit chỉ để review bằng chứng; không merge/deploy.
