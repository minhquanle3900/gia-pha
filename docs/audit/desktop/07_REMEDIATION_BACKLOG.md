# M0 remediation backlog / đề xuất M1

**Đây là kế hoạch, chưa thực thi M1.** Reuse First, Polish First. Giữ schema v1, không xóa dữ liệu, không deploy/merge main. P0 Desktop-confirmed: 0. Các lỗi Cloud giữ Issue ID gốc; lỗi độc lập Desktop có GP-DESK. Các sprint nhỏ có thể làm trong nhánh sửa riêng sau phê duyệt scope.

## Sprint M1.1 · Bảo toàn dữ liệu trước thao tác gộp/nhập

| Issue / ưu tiên | Sửa tối thiểu và reuse | Acceptance criteria |
|---|---|---|
| GP-CLOUD-001/002 · P1 | Tái dùng merge service và DB layer; điều phối cùng transaction, giữ đủ refs | Fixture 3→2 người; m0_event_unique vẫn 1 và thuộc target; story/media/root/founder trỏ đúng; reload không mất; lỗi chèn giữa transaction giữ nguyên cả 8 store |
| GP-CLOUD-003 · P1 | Validator runtime tập trung trước write, dùng preview hiện có | Cycle/dangling/duplicate ID/nested sai bị chặn có vị trí; fixture v1 hợp lệ vẫn round-trip đúng; lỗi không đổi snapshot |
| GP-CLOUD-007 · P2 Cloud | Hoãn save ảnh tới commit người, reuse form draft | Chọn ảnh→Hủy không tăng media; Lưu ảnh/người giữ link; quota fail không tạo record lẻ |
| GP-DESK-005 · P1 | ConfirmDialog/preview GEDCOM liệt kê scope mất mát, giữ JSON backup | Counts trước/sau đúng; người dùng thấy events/media/stories sẽ mất trước replace; cancel giữ data; Cloud giải thích 2 edges thêm |

Rollback: revert commit xử lý ghi nếu test regression, giữ DB schema v1. Trước kiểm thử export JSON fixture; phục hồi fixture bằng UI trên profile test. Không sửa dữ liệu người dùng hoặc clear IndexedDB. Không release nếu transaction rollback chưa PASS.

## Sprint M1.2 · Xuất bản tin cậy

| Issue / ưu tiên | Sửa tối thiểu và reuse | Acceptance criteria |
|---|---|---|
| GP-DESK-002 · P1 | Dùng lại pipeline report, chuẩn hóa style hỗ trợ canvas như sách hoặc native print có fallback rõ | Tải PDF cá nhân A4/Letter từ card và profile; chữ có dấu/ảnh/relations không mất; không oklab error; lỗi có message tồn tại đủ lâu và thao tác retry |
| GP-CLOUD-013 · P1 | Escape theo context trong HTML generator hiện có | M0 <b>Thử</b> & An hiển thị nguyên văn; họ tên/người thân/notes đều escaped; HTML/PDF không tạo markup từ trường văn bản |
| GP-CLOUD-012 · P3 Cloud | Test ghi output tạm hoặc mock save phù hợp, giữ E2E thật riêng | 79 tests baseline/kế nhiệm pass; git status sạch sau suite; PDF browser thật vẫn được verify |

Rollback: revert từng generator/style commit; giữ nút HTML/native print hiện có, không báo lỗi đã sửa khi chỉ chuyển nút. File tải cũ không bị xóa. So PDF 7 trang baseline trước/sau, kiểm page break và font bằng Poppler.

## Sprint M1.3 · UI dùng được trên Windows và mobile

| Issue / ưu tiên | Sửa tối thiểu và reuse | Acceptance criteria |
|---|---|---|
| GP-DESK-001 · P1 | Reflow AppShell và nhóm action/menu có sẵn | Không page overflow tại 320/390/768/1024/1366/1440; add/search/menu đều truy cập được; last content không dưới bottom bar |
| GP-DESK-003 · P1 | Shared focus/keyboard pattern trong ConfirmDialog và các modal, nối label | Tab không ra nền, Escape đóng, trả focus về trigger; close có tên; field name đọc được bằng screen reader; validation không mất draft |
| GP-DESK-004 · P1 | Theme màu nền/gradient/text hiện có nhất quán | Heading bold ≥3:1, normal text ≥4.5:1 ở cả light/dark; toggle+reload giữ trạng thái; không đổi nhận diện |
| GP-DESK-007 · P2 | Tăng hit-area/spacing/type hiện có | Mục tiêu 44×44 cho thao tác thường và nguy hiểm; kiểm zoom200, keyboard ảo, người lớn tuổi thực tế |
| GP-DESK-006 · P2 | Rà threshold + sửa thông điệp “sạch” trong modal có sẵn | CSV sample cho kết quả minh bạch; không auto merge trùng tên; cặp thật không mất mốc; ghi rõ threshold/ngoại lệ |

Rollback: revert UI-only commits nếu ảnh so sánh/state tests hỏng. Không đổi schema/labels dữ liệu lưu; lưu bộ screenshot baseline để so. Không đưa redesign, chart mới hoặc map SDK vào sprint polish.

## Sprint M1.4 · PWA / privacy boundary / compatibility gate

| Issue / ưu tiên | Sửa tối thiểu và reuse | Acceptance criteria |
|---|---|---|
| GP-CLOUD-006 · P2 Cloud | Sửa tài nguyên manifest có thật | Icon đúng MIME/size; Chrome+Edge cài được; cold offline và update giữ snapshot |
| GP-CLOUD-005/008/009 · P1/P2 Cloud | Chốt phạm vi PIN/QR/AI cùng PO; tái dùng modal/draft hiện có | Không cam kết mã hóa khi chỉ che UI; lựa chọn/payload chia sẻ rõ; cancel AI không ghi; lỗi/quota kiểm soát, không gửi dữ liệu thật trong QA |
| GP-CLOUD-010/011 · P2 | Đánh giá bundle/dependency sau các lỗi correctness | Có trace browser 500/2000/5000; không dùng FPS hardcoded; audit dependency được giải thích; offline vẫn đạt nếu split |
| Các BLOCKED | Profile Chrome/Edge test, permission fixture, device thật | Mic allowed/denied, speech Việt, quota failure, reload/crash, zoom200 và screen reader có evidence phiên bản/máy |

Rollback: revert manifest/cache update riêng; giữ DB và origin ổn định; không dùng “clear site data”. Nếu auth/privacy scope chưa chốt, giữ tính năng có rủi ro ngoài RC thay vì thêm cơ chế mới trong audit.

## Gate kết thúc M1 đề xuất

Tất cả P1 có test runtime pass đúng baseline sửa; mọi BLOCKED có owner/date hoặc lý do chấp nhận được PO ghi nhận. Lint/build/test sạch trên Windows và Cloud; working tree không bị tests ghi PDF; JSON snapshot bảo toàn; UI matrix Chrome/Edge/mobile đủ evidence. Chỉ khi được yêu cầu mới lập kế hoạch release; tài liệu này không cho phép deploy hoặc merge.
