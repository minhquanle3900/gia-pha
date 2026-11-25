# 06 · UI/UX từ mã nguồn

- `src/index.css:3–58` định nghĩa dark variant, font và màu gốc. Palette lá/xám/giấy xuất hiện cả trong token lẫn class màu hex. Form, modal và bản in dùng nhiều màu literal; so sánh theme khi màn hình vừa có lớp override toàn cục vừa có `dark:` cục bộ. Bản in cần giữ màu giấy và tương phản riêng.
- `index.html:19–21` yêu cầu Cormorant Garamond, Plus Jakarta Sans và JetBrains Mono từ Google Fonts. Kiểm tra dấu tiếng Việt ở cỡ nhỏ, hệ điều hành dùng font thay thế và offline lần đầu.
- `AppShell.tsx` có menu desktop, điều hướng mobile, công cụ và tìm kiếm. Kiểm tra rằng cách vào hồ sơ, quay lại danh sách hoặc xem cây cho kết quả nhất quán khi đổi tab. `GlobalSearch.tsx:376` đặt chiều rộng tối thiểu 340 px cho popover; có bố cục mobile riêng. Xác minh ngưỡng 320–390 px, vùng nhập trong viewport khi bàn phím mở.
- `PersonFormModal.tsx` dài, gồm cặp ngày, chi/phái/đời, tiểu sử và ảnh. Ưu tiên giữ trường chính thấy ngay và lỗi gắn với trường. Kiểm tra scroll modal tại 200% zoom, hủy sau upload và ảnh cũ khi chỉnh.
- `ConfirmDialog.tsx`, modal quan hệ/QR và tour có markup dialog khác nhau. Kiểm tra tên truy cập, focus ban đầu, Tab/Shift+Tab, Escape, focus trả về và tình trạng nền còn nhận tương tác. `GlobalSearch.tsx:133–145` có handler phím/click ngoài, cần xác minh với modal đang mở.
- `App.tsx:96–126` có loading/error cấp ứng dụng. Import và PDF có luồng dài riêng. Kiểm tra trạng thái dữ liệu trắng, parse lỗi, quota, mất mạng, vô quyền mic/thông báo và hủy giữa chừng. Ưu tiên thông báo phân biệt thao tác ghi với tải lại dữ liệu.
- Các kiểm tra trên là đánh giá từ source. Tiêu chí chụp ảnh, môi trường và thao tác được liệt kê trong [bàn giao Desktop](M0_CLOUD_TO_DESKTOP.md).
