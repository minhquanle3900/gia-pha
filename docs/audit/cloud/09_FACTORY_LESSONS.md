# 09 · Bài học App Factory

| Thành phần | Điều kiện để tái sử dụng |
|---|---|
| Local-first | Tái dùng cấu trúc provider và kho theo origin; thêm ranh giới mutation, refresh và trạng thái lỗi cho ứng dụng có nhiều store. |
| IndexedDB backup/restore | Tái dùng snapshot có version và transaction nhiều store; bổ sung runtime schema, kiểm tra toàn vẹn và fixtures chạy qua UI. |
| Relationship graph | Tái dùng validation chu trình và truy vấn đồ thị; định nghĩa loại cạnh, hôn phối và vòng đời tham chiếu theo domain mới. |
| Global search | Tái dùng normalize tiếng Việt, ranking và phím điều hướng; chuẩn hóa với label truy cập và ngưỡng viewport. |
| Import/export | Dùng mẫu adapter + preview + confirm; kiểm tra lossiness theo từng định dạng và chặn ghi đè khi preview chưa xác minh. |
| PWA shell | Tái dùng manifest và Workbox, cùng một kiểm tra tất cả icon và kiểm thử cold offline sau build. |
| Design tokens | Giữ token kiểu chữ, nền, bề mặt, nội dung và tương phản; chuẩn hóa semantic token trước khi đem sang sản phẩm khác. |
| PDF generator | Tái dùng pipeline HTML/canvas và text fallback; kiểm soát Unicode, escape, print CSS và thư mục artifact trong tests. |
| Privacy shield | Dùng như lớp che khi trình chiếu; chọn mô hình xác thực/mã hóa theo cam kết riêng tư của sản phẩm. |
| Media management | Tái dùng nén ảnh và bộ phân loại tư liệu. Chọn hợp đồng tham chiếu một nguồn và kiểm quota, hủy form, cleanup. |

M0 chỉ đánh giá các module đã có. Việc tách package cần một dự án thứ hai xác nhận hợp đồng dùng chung.
