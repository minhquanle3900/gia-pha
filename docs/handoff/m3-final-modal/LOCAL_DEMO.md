# M3 · Chạy demo local

Code SHA: `2036fbe9fa7cada034f565121d25fe7d872b42aa`. Chỉ dùng dữ liệu mẫu tổng hợp; không nhập hoặc khôi phục gia phả thật vào origin demo.

## Mở bản preview cho Product Owner

Chạy trong **cmd.exe** trên Windows:

```bat
cd /d "D:\LMQ_My mine\Gia-pha\.worktrees\m3-desktop-final-modal"
npm run build
npm run preview -- --host 127.0.0.1 --port 3251 --strictPort
```

Nếu dependency chưa được cài, chạy lệnh dưới đây trước bước build. Dùng đúng `bun.lock`, không đổi package manager hoặc cập nhật lockfile.

```bat
npm exec --yes --package bun@1.4.5 -- bun install --frozen-lockfile
```

Giữ cửa sổ lệnh đang chạy và mở [demo preview](http://localhost:3251/). `strictPort` báo lỗi nếu cổng đang dùng; khi preview đã chạy, dùng server đang có thay vì mở thêm tiến trình. Dừng bằng Ctrl+C khi không cần nữa.

Dữ liệu nằm trong IndexedDB của **cùng hồ sơ trình duyệt và cùng origin**. `127.0.0.1` khác `localhost`; cổng 3251 khác 3250. Đổi địa chỉ hoặc hồ sơ trình duyệt có thể khiến không thấy dữ liệu ở origin trước. Không xóa dữ liệu website để xử lý tình huống này.

## Các bước trải nghiệm

1. Chọn **Thêm người**, nhập tên mẫu có tiền tố `QA`. Ô họ tên cần nhận focus khi form mở. Dùng Tab và Shift+Tab để đi qua control; focus phải ở trong lớp modal đang thao tác và có vòng viền nhìn thấy.
2. Nhấn **Hủy** khi có nháp. Xác nhận **Bỏ bản nháp thành viên?** cần xuất hiện, focus mặc định ở **Tiếp tục chỉnh sửa**. Chọn tiếp tục và đối chiếu nội dung nháp còn nguyên. Đóng lại rồi chọn **Bỏ bản nháp**; form đóng, không tạo hồ sơ.
3. Mở form mới, nhập nháp và nhấn Escape. Escape đầu tiên mở xác nhận. Escape khi xác nhận đang mở chỉ đóng xác nhận, giữ form và nháp. Thử lại, dùng **Bỏ bản nháp** để kết thúc.
4. Vào **Gia phả → Cây gia phả → Toàn màn hình**, chọn một thành viên mẫu rồi bấm **Quan hệ**. Ứng dụng rời fullscreen trước khi mở cửa sổ quan hệ. Đóng bằng Escape hoặc nút Đóng và đối chiếu focus về đúng nút **Quan hệ** đã mở cửa sổ; không chỉ trở về nút fullscreen chung.
5. Lặp lại từ fullscreen với **Sửa hồ sơ** trên desktop hoặc **Sửa** trên mobile. Không đổi dữ liệu, đóng form và đối chiếu focus về đúng nút sửa đã dùng. Thử cả click và bàn phím.

Nếu có thao tác lưu đang chờ, không đóng cưỡng bức tab. Chờ kết quả hoặc thông báo lỗi rồi kiểm tra nội dung nháp. Các bước này là hướng dẫn trải nghiệm, không thay thế log kiểm thử hay kết quả trên thiết bị iOS/Android thật.

## Trang kỹ thuật dành cho QA

Dev server dùng **Vite CLI**, không chạy API server Gemini. Mở cmd.exe khác tại cùng worktree:

```bat
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3250 --strictPort
```

Với các controls có guard, luôn dùng đúng origin [http://localhost:3250](http://localhost:3250/), dù server bind ở `127.0.0.1`. Các trang dưới đây chỉ được Vite phục vụ trong dev, không nằm trong bản production preview:

- [Custom/native nesting](http://localhost:3250/docs/handoff/m3-final-modal/evidence/preview/index.html): dùng hai hook thật; có custom/native lồng nhau, custom sibling nằm dưới native top layer, control `tabindex=-1` và busy **mô phỏng state**, không phải transaction database.
- [Transaction và fixture controls](http://localhost:3250/docs/handoff/m3-final-modal/evidence/preview/transaction-controls.html): chỉ cho origin 3250, schema v1 và các fixture tổng hợp được phép. Có thể nạp lại demo M2 hoặc fixture rỗng M1, đọc số bản ghi và đối chiếu snapshot gốc.

Để kiểm busy với transaction thật: mở form trong tab ứng dụng **trước**, sang tab controls chọn giữ khóa, chờ trạng thái **KHÓA QA ACTIVE**, quay lại form bấm Lưu rồi thử Escape/Hủy. Sau đó sang controls chọn **Thả khóa, cho Save tiếp tục**. Transaction khóa chỉ đọc trên các store trong transaction `readwrite`, không ghi bản ghi; có nút hủy khóa và tự thả tối đa sau 60 giây. Đóng tab controls cũng thả khóa. Nút Hủy transaction khóa QA chỉ hủy khóa do helper tạo, không giả lập rollback của transaction Save.

Không dùng helper ở origin có gia phả thật. Không coi state busy mô phỏng, bản preview local hoặc viewport mobile emulation là bằng chứng đã kiểm backend, PDF hoặc thiết bị thật.
