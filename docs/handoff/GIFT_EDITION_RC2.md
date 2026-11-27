# Cội Nguồn · Gift Edition RC2

Từ RC1 `23df57e695f3ba8560e02af7b4f6dbc431786b9a`. Source đóng gói `77d81c90e0083f2892431108f0b19898d7b90889`. Sảnh giữ ảnh minh họa nhà cổ ở giữa, hoành phi Cội Nguồn và hai câu đối dọc trên cột gỗ. Vế “Tổ tông…” ở bên phải theo hướng nhìn vào sảnh. Thứ tự đọc và vị trí giữ nguyên khi xem toàn màn hình. RC2 dùng font Charm đi kèm giấy phép từ RC1.

## Mở bản dùng thử

1. Tải ZIP và giải nén toàn bộ. [Tải Gift Edition RC2](https://raw.githubusercontent.com/minhquanle3900/gia-pha/4a07a4d20ac174efad768483b263355e8e93bca4/release-artifacts/Coi-Nguon-Gift-Edition-RC2.zip) · [SHA-256](https://raw.githubusercontent.com/minhquanle3900/gia-pha/4a07a4d20ac174efad768483b263355e8e93bca4/release-artifacts/Coi-Nguon-Gift-Edition-RC2.zip.sha256)
2. Nếu RC1 đang chạy, lưu việc đang làm rồi đóng các tab/cửa sổ PWA RC1 và launcher RC1. Trong thư mục `Coi-Nguon-Gift-Edition-RC2`, bấm đúp `Mo-Coi-Nguon.cmd` trên Windows x64 hoặc ARM64. Dùng cùng địa chỉ `http://127.0.0.1:4315/` và hồ sơ trình duyệt để giữ IndexedDB. Giữ cửa sổ launcher mở khi dùng app.
3. Vào **Di sản → Phòng trưng bày** và bấm một trong hai cột. `BAT-DAU.html` có hướng dẫn, đường sao lưu và dữ liệu mẫu dùng cho demo. Kiểm thử bấm đúp launcher trên Windows thật vẫn SKIP.

Để quay lại RC1, xuất JSON nếu cần, đóng các cửa sổ và launcher RC2 rồi mở ZIP RC1 tại cùng địa chỉ. [Bàn giao RC1](GIFT_EDITION_RC1.md)

## Ảnh và kiểm thử

| Kích thước | RC1 | RC2 |
| --- | --- | --- |
| Mobile 390 px | [Trước](gift-rc2/before-390-light.jpg) | [Sau](gift-rc2/after-390-light.jpg) |
| Desktop 1440 px | [Trước](gift-rc2/before-1440-light.jpg) | [Sau](gift-rc2/after-1440-light.jpg) |

[320 px tối](gift-rc2/after-320-dark.jpg) · [Desktop tối](gift-rc2/after-1440-dark.jpg) · [Toàn màn hình mobile](gift-rc2/fullscreen-390-dark.jpg)

- Chromium sáng và tối ở 320, 390, 430, 768 và 1440 px. Hai vế hiện ngay, chữ vừa cột và trang không tràn ngang.
- Chạm từng cột và Tab → Enter mở được trình xem. Escape trả focus. Lối vào khu trưng bày, quay lại sảnh và mở kho kỷ vật đều đạt.
- Sau lần tải thành công, sảnh, ảnh, font cục bộ và trình xem hoạt động khi tải lại offline. Đã thử nâng RC1 lên RC2 trên cùng origin. Worker mới kích hoạt sau khi đóng tab cũ và bản ghi IndexedDB mẫu được giữ nguyên.
- `npm test` 327/327. `npm run lint`, production build và PWA checker đạt. Đã đối chiếu `dist` trong ZIP với build kiểm thử và xác minh checksum. [Log QA](gift-rc2/QA.txt)
