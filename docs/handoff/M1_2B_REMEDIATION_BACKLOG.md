# Backlog tại Core Integration Gate · M1.2B

**FIXED** nghĩa là sửa ở mã nguồn và đã qua kiểm thử được ghi trong bàn giao. QA độc lập trên Windows và thiết bị mobile thực vẫn theo dõi riêng.

| ID | Mức tại audit | Trạng thái | Bằng chứng và điều kiện QA |
|---|---|---|---|
| GP-CLOUD-004 | P2 | FIXED | Chặn cặp trùng chưa phân biệt được ở write boundary. Kiểm hai tab và tái hôn có niên đại phân biệt. |
| GP-CLOUD-007 | P2 | FIXED | Browser Cloud xác nhận Hủy giữ nguyên store và Lưu tạo một media liên kết. Kiểm ảnh camera, thay/xóa ảnh và ảnh được nhật ký dùng trên Windows/mobile. |
| GP-CLOUD-013 | P1 | FIXED | Nội dung HTML giữ nguyên từ tiếng Việt, punctuation và multiline sau escaping. Mở file xuất ngoài app để kiểm. |
| GP-REV-001 | — | FIXED | Atomic merge từ chối union collision mơ hồ, giữ nguyên union và `unionId` của con. Kiểm thêm ca tái hôn hợp lệ. |
| GP-REV-004 | — | FIXED | Bản backup xuất lại gộp như no-op. Cùng ID nhưng trường ảnh thực sự khác vẫn chặn. Kiểm chuyển JSON giữa thiết bị. |
| GP-REV-005 | — | FIXED | Xóa chi gỡ liên kết năm nhóm, giữ bản ghi liên quan. Kiểm preview số lượng và xuất/nhập JSON sau thao tác. |
| GP-REV-006 | — | FIXED | Báo precision mâu thuẫn nhưng giữ nguyên cấu trúc ngày v1/niên đại GEDCOM. Dữ liệu ngày sai kiểu hoặc lịch bất khả thi chặn. |
| GP-DESK-002 | P1 | FIXED | Chromium Cloud tạo PDF raster ở cả hai đường xuất trên viewport desktop/mobile. QA Windows/iOS/Android kiểm font, ngắt trang và hướng dẫn in khi canvas thất bại. |
| GP-DESK-005 | P1 | FIXED | M0 fixture giữ đúng 40 cạnh. Cảnh báo trước thay thế nêu rõ mốc, media, nhật ký và liên kết bị mất theo giới hạn định dạng. Kiểm trên Windows và công cụ GEDCOM đích nếu có. |
| GP-DESK-006 | P2 | FIXED | Tìm thấy cặp cùng tên/năm nhưng lệch đời để người dùng xem xét. Kiểm CSV và xác nhận hai hồ sơ vẫn còn khi đóng modal. |
| GP-CLOUD-006 | P2 | DEFERRED | Icon manifest và PWA installed cold-offline/update thuộc lượt đánh giá PWA. |
| QA thiết bị thật | — | PARTIAL | Chromium Linux desktop và viewport mô phỏng có bằng chứng. Windows Chrome/Edge, Safari iOS, Chrome Android và camera/quota trên thiết bị còn chờ. |

Tham chiếu [bàn giao Cloud](M1_2B_CLOUD_TO_DESKTOP.md), [audit Desktop](https://github.com/minhquanle3900/gia-pha/blob/0577071fdb458f19e3231e6561b271b3dd858db4/docs/audit/desktop/M0_DESKTOP_TO_CLOUD.md).
