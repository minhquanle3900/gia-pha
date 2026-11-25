# SỔ TAY HƯỚNG DẪN SỬ DỤNG
## GIA PHẢ VIỆT – CỘI NGUỒN

> **Ứng dụng quản lý gia phả dòng họ Việt Nam, bảo mật cục bộ, hoạt động ngoại tuyến (Offline-first / Local-first) và hỗ trợ đa nền tảng PWA.**

---

## MỤC LỤC
1. [Giới thiệu & Triết lý Thiết kế](#1-giới-thiệu--triết-lý-thiết-kế)
2. [Cài đặt Ứng dụng Ngoại tuyến (PWA)](#2-cài-đặt-ứng-dụng-ngoại-tuyến-pwa)
3. [Tổng quan Dòng họ & Số liệu Phả hệ](#3-tổng-quan-dòng-họ--số-liệu-phả-hệ)
4. [Cây Gia Phả Tương Tác Đa Chiều](#4-cây-gia-phả-tương-tác-đa-chiều)
5. [Quản lý Thành viên & Mối quan hệ Huyết thống](#5-quản-lý-thành-viên--mối-quan-hệ-huyết-thống)
6. [Bộ lọc Đa Tiêu chí & Tìm kiếm Chấp nhận Tiếng Việt](#6-bộ-lọc-đa-tiêu-chí--tìm-kiếm-chấp-nhận-tiếng-việt)
7. [Xuất Sách Phả Ký & In Phả Đồ Treo Tường (A0/A1 & Bảng Chi)](#7-xuất-sách-phả-ký--in-phả-đồ-treo-tường-a0a1--bảng-chi)
8. [Trợ Lý Lễ Giỗ & Nghi Lễ Âm Lịch (Sổ Văn Khấn 3 Miền)](#8-trợ-lý-lễ-giỗ--nghi-lễ-âm-lịch-sổ-văn-khấn-3-miền)
9. [Tra Cứu Xưng Hô Dòng Tộc Tự Động (Thuật toán LCA)](#9-tra-cứu-xưng-hô-dòng-tộc-tự-động-thuật-toán-lca)
10. [Chia Sẻ Ngoại Tuyến Qua Mã QR](#10-chia-sẻ-ngoại-tuyến-qua-mã-qr)
11. [Bản Đồ Di Cư & Địa Lý Dòng Họ (GPS Từ Đường & Lăng Mộ)](#11-bản-đồ-di-cư--địa-lý-dòng-họ-gps-từ-đường--lăng-mộ)
12. [Phát Hiện Trùng Lặp & Hợp Nhất Hồ Sơ An Toàn](#12-phát-hiện-trùng-lặp--hợp-nhất-hồ-sơ-an-toàn)
13. [Kho Kỷ Vật & Tư Liệu Lịch Sử](#13-kho-kỷ-vật--tư-liệu-lịch-sử)
14. [Quản lý Dữ liệu, Sao lưu Toàn vẹn & GEDCOM](#14-quản-lý-dữ-liệu-sao-lưu-toàn-vẹn--gedcom)

---

## 1. Giới thiệu & Triết lý Thiết kế

**Gia Phả Việt – Cội Nguồn** được phát triển nhằm mục đích gìn giữ cội nguồn gia tộc Việt Nam qua nhiều thế hệ với các cam kết cốt lõi:
- **Bảo mật tuyệt đối (100% Local-first)**: Dữ liệu gia phả được lưu trực tiếp trên thiết bị của bạn thông qua công nghệ **IndexedDB**. Ứng dụng không gửi bất kỳ thông tin nào lên máy chủ đám mây.
- **Hoạt động không cần mạng (Offline-first)**: Bạn có thể mang máy tính bảng, điện thoại về tận nhà thờ tổ vùng quê, mở gia phả, tra cứu và chỉnh sửa mà không cần kết nối Internet hay 4G.
- **Tôn trọng văn hóa phả hệ Việt Nam**: Hỗ trợ đầy đủ các yếu tố truyền thống như: Đời thứ, Chi, Phái, Tên húy (tên kiêng khi tế tự), Tên tự, Ngày giỗ Âm lịch, Lăng mộ gia tộc, Đóng góp công đức, và quy tắc xưng hô "con chú con bác".

---

## 2. Cài đặt Ứng dụng Ngoại tuyến (PWA)

Ứng dụng hỗ trợ công nghệ **Progressive Web App (PWA)**, cho phép cài đặt lên màn hình chính như một ứng dụng độc lập:

### Trên Điện thoại Android (Chrome / Cốc Cốc / Edge):
1. Mở ứng dụng trong trình duyệt.
2. Chạm vào nút **"Cài đặt PWA"** xuất hiện ở góc dưới màn hình (hoặc bấm vào biểu tượng ba chấm của trình duyệt).
3. Chọn **"Thêm vào màn hình chính"** (Add to Home screen).
4. Biểu tượng **Gia Phả Việt** sẽ xuất hiện trên màn hình điện thoại và hoạt động độc lập không có thanh địa chỉ trình duyệt.

### Trên iPhone / iPad (Safari):
1. Mở ứng dụng trên trình duyệt **Safari**.
2. Nhấn vào nút **Chia sẻ (Share)** hình ô vuông có mũi tên hướng lên ở thanh công cụ dưới cùng.
3. Cuộn xuống và chọn **"Thêm vào MH chính" (Add to Home Screen)**.
4. Đặt tên hiển thị và nhấn **Thêm (Add)**.

### Trên Máy tính (Chrome / Edge / Safari macOS):
1. Nhấn vào biểu tượng cài đặt (máy tính có dấu cộng) trên thanh địa chỉ URL.
2. Hoặc bấm nút **"Cài đặt PWA"** trên thanh tiêu đề ứng dụng.

---

## 3. Tổng quan Dòng họ & Số liệu Phả hệ

Màn hình **Tổng quan** (`/`) mang đến cái nhìn trang trọng về di sản tổ tiên:
- **Biểu ngữ Di sản**: Hiển thị ảnh Từ đường đại tôn, câu đối gia tộc (*"Tiên tổ phương danh lưu vạn đại · Tử tôn hiếu thảo kế thiên thu"*).
- **Thống kê tổng hợp**:
  - Tổng số thành viên đã ghi chép.
  - Số thế hệ (đời) đã kết nối.
  - Số chi họ và phái nhánh.
  - Số người hiện tiền và người đã khuất.
  - Số kỷ vật và hình ảnh tư liệu lịch sử.
- **Phân bổ theo Chi họ**: Biểu đồ trực quan tỷ lệ thành viên giữa Đại Tôn, Chi Giáp, Chi Ất, Chi Bính...
- **Truy cập nhanh**: Các phím tắt tiện ích đến Cây phả hệ, Thêm người mới, Tra xưng hô, và Trợ lý lễ giỗ.

---

## 4. Cây Gia Phả Tương Tác Đa Chiều

Màn hình **Cây gia phả** cung cấp giao diện đồ họa trực quan:
- **Các góc nhìn phả hệ**:
  - **Cây Hậu Duệ (Descendant Tree)**: Bắt đầu từ Cụ Thủy tổ tỏa xuống con cháu các đời.
  - **Cây Tổ Tiên (Ancestor Tree)**: Truy ngược phụ mẫu, ông bà, cụ kỵ từ một thành viên bất kỳ.
  - **Toàn Cảnh (Full Network)**: Hiển thị liên kết phân tầng toàn bộ gia tộc.
  - **Tiêu Điểm Cá Nhân (Focus Mode)**: Chọn 1 người để hiển thị tức thời cha mẹ, bạn đời, anh chị em và các con.
  - **Theo Đời Thứ**: Phân tầng ranh giới rõ ràng giữa Đời 1, Đời 2, Đời 3, Đời 4...
  - **Theo Chi Họ**: Xem riêng từng chi phái để hội đồng chi họ dễ dàng theo dõi.
- **Thao tác điều khiển**:
  - **Thu phóng**: Sử dụng nút `+` / `-` hoặc cuộn chuột, chụm 2 ngón tay trên màn hình cảm ứng.
  - **Trượt di chuyển (Pan)**: Kéo rê màn hình đến nhánh họ cần xem.
  - **Thu gọn / Mở rộng**: Bấm vào nút số lượng con bên dưới mỗi thẻ thành viên để ẩn/hiện nhánh.
  - **Định vị nhanh**: Nhập tên vào ô tìm kiếm trên cây để màn hình tự động lướt đến đúng vị trí người đó.
  - **Xuất ảnh SVG**: Bấm **"Xuất SVG"** để tải file vector phả đồ sắc nét phục vụ in ấn.

---

## 5. Quản lý Thành viên & Mối quan hệ Huyết thống

### Thêm hoặc Chỉnh sửa Hồ sơ:
Bấm nút **"Thêm thành viên"** tại trang Thành viên hoặc trang Cây gia phả để mở biểu mẫu:
1. **Thông tin định danh**:
   - Họ và tên (bắt buộc).
   - Giới tính: Nam, Nữ, hoặc Khác / Chưa rõ.
   - Tên thường gọi, Tên húy (tên kiêng khi cúng bái), Tên tự (tên chữ), Bí danh.
   - Ảnh chân dung (hỗ trợ chụp hoặc tải ảnh từ máy, ứng dụng tự động tối ưu hóa).
2. **Sinh thời & Nơi chốn**:
   - Ngày sinh & Ngày mất: Hỗ trợ ngày chính xác, chỉ biết năm, khoảng năm (c. 1880), hoặc niên đại cổ ("Thời vua Tự Đức").
   - Nơi sinh, Nơi mất, Nguyên quán, Nơi cư trú, Nghề nghiệp.
   - Trạng thái: Còn sống (Hiện tiền) hoặc Đã khuất.
3. **Trường Gia phả Việt Nam**:
   - Đời thứ (Thế hệ tính từ Thủy tổ = Đời 1).
   - Chi họ trực thuộc (và các chi liên kết nếu là người mở chi mới).
   - Phái trong chi.
   - Vai vế trong họ: Thủy tổ, Trưởng tộc, Trưởng chi, Dâu trưởng, Liệt sĩ...
   - Ngày giỗ Âm lịch (Ngày và tháng Âm lịch, kèm ghi chú cúng giỗ).
   - Nơi an táng / Mộ phần dòng tộc.
   - Công đức / Đóng góp cho dòng họ.
   - Tiểu sử cuộc đời & Ghi chú tư liệu.

### Quản lý Quan hệ Gia đình & Đa Hôn phối:
- **Thiết lập Phụ mẫu**: Chọn Cha và Mẹ từ danh sách thành viên. Hệ thống tự động kiểm tra vòng lặp tổ tiên (DFS cycle check).
- **Hôn phối (Phu thê)**: Thêm bạn đời, phân định rõ **Chính thất** (vợ cả), **Kế thất** (vợ hai), hoặc **Tục huyền**.
- **Gắn con cái với đúng cuộc hôn nhân (`unionId`)**: Giúp phân biệt rõ ràng người con nào là của vợ trước, người con nào là của vợ sau.
- **Xóa an toàn**: Khi xóa một thành viên, hệ thống gỡ bỏ các liên kết quan hệ liên quan mà **không bao giờ xóa dây chuyền** con cái hay cha mẹ của họ.

---

## 6. Bộ lọc Đa Tiêu chí & Tìm kiếm Chấp nhận Tiếng Việt

Tại trang **Thành viên**, bạn có thể quản lý danh sách lớn bằng các công cụ mạnh mẽ:
- **Tìm kiếm thông minh**: Bỏ qua dấu tiếng Việt (ví dụ gõ `"tran van"` sẽ tìm thấy `"Trần Văn Khải"`, `"TRẦN VĂN LỘC"`), tìm theo cả họ tên, tên húy, nghề nghiệp và nơi sinh.
- **Lọc theo Chi họ**: Đại Tôn, Chi Giáp, Chi Ất, Chi Bính...
- **Lọc theo Phái**: Phái Đông, Phái Đoài, Phái Bắc, Phái Sài Gòn...
- **Lọc theo Thế hệ (Đời)**: Chọn xem riêng từng đời (Đời 1, Đời 2, Đời 3...).
- **Lọc theo Trạng thái**: "Hiện tiền" (còn sống) hoặc "Đã khuất".
- **Lọc theo Giới tính**: Nam hoặc Nữ.
- **Thanh thẻ lọc tích cực (Active Chips)**: Dễ dàng xem các tiêu chí đang chọn và xóa từng tiêu chí hoặc xóa toàn bộ chỉ với 1 cú nhấp.

---

## 7. Xuất Sách Phả Ký & In Phả Đồ Treo Tường (A0/A1 & Bảng Chi)

Truy cập thẻ **Sách & In ấn** trên thanh điều hướng:
### 1. Xuất Sách Phả Ký (Family Heritage Book):
- Tự động biên soạn cuốn sách gia phả hoàn chỉnh đạt chuẩn xuất bản:
  - **Trang bìa sang trọng**: Tên dòng họ, câu đối, hoa văn cổ truyền.
  - **Lời tựa (Phả ký)**: Nguồn gốc khởi phát, công đức tổ tiên khai hoang lập nghiệp.
  - **Gia huấn dòng họ**: 12 điều răn dạy con cháu về Đạo hiếu, Sự học, Tình huynh đệ và Hòa thuận xóm giềng.
  - **Danh bạ các Chi phái**: Giới thiệu các nhánh đại diện và người phụng sự.
  - **Phả lục chi tiết từng đời**: Mỗi đời được trình bày trang trọng kèm ảnh chân dung, sinh thời, tiểu sử, công đức và ngày giỗ.
  - **Mục lục tra cứu Tên húy & Tên tự**: Bảng tra cứu danh tính cổ truyền, giúp con cháu tránh phạm húy trong tế tự.
- Bấm nút **"In / Xuất PDF Sách Gia Phả"** để mở giao diện in ấn của trình duyệt, chọn lưu dưới dạng PDF chất lượng cao.

### 2. In Phả Đồ Khổ Lớn Treo Tường (A0 / A1):
- Xuất toàn bộ cây gia phả thành tệp vector **SVG sắc nét vô hạn**.
- Phù hợp đem ra nhà in để in bạt Hiflex hoặc in lụa treo tại nhà thờ họ trong ngày giỗ tổ hoặc lễ chạp đầu năm.

### 3. Chế Độ Xem Bảng Chi Truyền Thống:
- Bố cục danh sách phân cấp chữ Quốc ngữ và phong cách Hán - Nôm cổ truyền, xếp thành từng hàng thế hệ tôn ti trật tự theo chiều dọc.

---

## 8. Trợ Lý Lễ Giỗ & Nghi Lễ Âm Lịch (Sổ Văn Khấn 3 Miền)

Truy cập thẻ **Lễ Giỗ & Nghi Lễ**:
### 1. Danh sách Ngày Giỗ Sắp Tới:
- Tự động chuyển đổi ngày giỗ Âm lịch của tổ tiên sang ngày Dương lịch trong năm hiện hành.
- Tính toán chính xác số ngày đếm ngược (ví dụ: *"Còn 5 ngày"*, *"Còn 12 ngày"*), gắn nhãn màu vàng cảnh báo khi lễ giỗ đến gần trong vòng 14 ngày.

### 2. Sổ Văn Khấn Cổ Truyền 3 Miền:
Tích hợp sẵn các bài văn khấn chuẩn nghi lễ cổ truyền Việt Nam:
- **Văn khấn Thủy tổ & Tiền nhân**: Dùng cho ngày đại tế tại Từ đường chính.
- **Văn khấn Giỗ Trưởng tộc / Chi trưởng**: Nghi thức tế tự truyền thống.
- **Văn khấn Cúng giỗ thường (Cát kỵ / Hung kỵ)**: Dùng cho các gia đình cúng gia tiên tại tư gia.
- **Văn khấn Tiết Thanh minh & Tảo mộ cuối năm**: Nghi thức trước phần mộ gia tộc.
- **Tùy biến & In ấn**: Cho phép điền nhanh Tên người chủ tế, Tên người được giỗ, Địa chỉ hành lễ và nhấn **Sao chép** hoặc **In văn khấn**.

### 3. Bảng Phân Công Chuẩn Bị Ngày Giỗ:
Danh sách kiểm tra (Checklist) công việc trước ngày giỗ:
- Lau dọn bàn thờ, đánh bóng lư đồng, chuẩn bị bát hương.
- Đặt mua trầu cau, hoa tươi, ngũ quả, trà rượu, nến sáp.
- Lên thực đơn mâm cỗ truyền thống và đặt lễ chay/mặn.
- Thông báo con cháu các chi họ xa gần về dự lễ giỗ.

---

## 9. Tra Cứu Xưng Hô Dòng Tộc Tự Động (Thuật toán LCA)

Một khó khăn phổ biến của thế hệ con cháu ngày nay là không biết gọi những người họ hàng xa bằng gì theo chuẩn mực văn hóa Việt.
- Bấm nút **"Tra xưng hô"** trên thanh công cụ hoặc hồ sơ cá nhân.
- Chọn **Người A** và **Người B**:
- **Hệ thống tự động thực hiện**:
  1. Tìm **Tổ tiên chung gần nhất (Lowest Common Ancestor - LCA)** giữa 2 người.
  2. Tính toán độ chênh lệch thế hệ (cùng đời, cách 1 đời, cách 2 đời...).
  3. Xét thứ bậc chi trên / chi dưới (con của bác hay con của chú) để xác định danh xưng chuẩn xác:
     - *"Bác họ" / "Cháu"*
     - *"Chú họ" / "Cháu"*
     - *"Cô họ" / "Cháu"*
     - *"Anh họ" / "Em họ" (kèm giải thích rõ vì thuộc nhánh anh hay nhánh em)*.
  4. Hiển thị sơ đồ đường đi huyết thống từng bước từ Người A qua Cụ Tổ chung đến Người B.

---

## 10. Chia Sẻ Ngoại Tuyến Qua Mã QR

- Bấm nút **"Mã QR"** trên bất kỳ hồ sơ thành viên nào hoặc thanh công cụ.
- Hệ thống tạo ra **mã QR tóm tắt lý lịch cá nhân** hoàn toàn ngoại tuyến:
  - Họ tên, đời thứ, chi họ, vai vế.
  - Ngày sinh, ngày mất, ngày giỗ Âm lịch.
  - Nơi an táng và công đức.
- Các thành viên khác có thể dùng camera điện thoại quét mã để đọc tức thì thông tin tóm tắt mà không cần kết nối Internet.

---

## 11. Bản Đồ Di Cư & Địa Lý Dòng Họ (GPS Từ Đường & Lăng Mộ)

Truy cập thẻ **Bản đồ**:
- **Dòng thời gian thiên di (Migration Timeline)**:
  - Mô tả lịch sử di chuyển của các nhánh họ: từ đất gốc làng cổ Đông Ngạc (Hà Nội), mở chi Ất tại phố cổ Hà Nội, chi Nam Tiến vào Gia Định – Sài Gòn, và nhánh Hải ngoại.
- **Danh bạ Địa điểm Tâm linh Dòng họ**:
  - Nhà thờ họ Đại Tôn (Từ đường chính).
  - Từ đường các Chi phái.
  - Khu mộ Tổ và Nghĩa trang gia tộc.
- **Tọa độ GPS & Chỉ đường Google Maps**:
  - Lưu trữ tọa độ vĩ độ / kinh độ chính xác.
  - Nút bấm **"Mở Google Maps chỉ đường"** giúp con cháu ở xa lần đầu về quê dễ dàng tìm đúng vị trí từ đường và phần mộ.

---

## 12. Phát Hiện Trùng Lặp & Hợp Nhất Hồ Sơ An Toàn

Khi nhiều người trong họ cùng cập nhật gia phả, việc một người bị tạo trùng là khó tránh khỏi:
- Bấm nút **"Tìm trùng lặp"** tại trang Thành viên.
- Thuật toán quét và chấm điểm tương đồng dựa trên: Họ tên, năm sinh, chi họ, tên cha mẹ và bạn đời.
- Hiển thị danh sách các cặp hồ sơ nghi vấn trùng lặp kèm tỷ lệ % trùng khớp.
- **Hợp nhất an toàn (Safe Merge)**:
  - Chọn hồ sơ chính (Đích) và hồ sơ phụ (Nguồn).
  - Tự động gộp tiểu sử, chuyển giao các liên kết phụ mẫu, vợ chồng, con cái và kỷ vật sang hồ sơ chính.
  - Xóa hồ sơ trùng mà không làm đứt gãy cây phả hệ.

---

## 13. Kho Kỷ Vật & Tư Liệu Lịch Sử

Tại thẻ **Kỷ vật**:
- Lưu trữ hình ảnh sắc phong, văn bia, gia phả cổ chép tay, ảnh họp họ ngày xuân, và kỷ vật gia truyền.
- Gắn thẻ (tag) các thành viên có mặt trong từng bức ảnh.
- Khi mở hồ sơ của một cá nhân, toàn bộ hình ảnh kỷ vật liên quan đến người đó sẽ tự động hiển thị trong mục "Kỷ vật liên quan".

---

## 14. Quản lý Dữ liệu, Sao lưu Toàn vẹn & GEDCOM

Tại thẻ **Quản lý dữ liệu**:
1. **Sao lưu trọn gói JSON (`.json`)**:
   - Tải về tệp sao lưu đầy đủ toàn bộ cây gia phả, nhánh, quan hệ, nghi lễ, tiểu sử và hình ảnh nén Base64.
   - Định kỳ sao lưu ra USB, Google Drive hoặc gửi qua email gia đình để lưu giữ an toàn.
2. **Khôi phục từ tệp JSON**:
   - Nạp lại dữ liệu trên bất kỳ máy tính hay điện thoại nào chỉ trong vài giây.
3. **Nhập / Xuất chuẩn GEDCOM 5.5.1 UTF-8**:
   - Tương thích với các phần mềm phả hệ quốc tế (Gramps, FamilySearch, MyHeritage).
   - Tự động bổ sung các trường mở rộng văn hóa Việt Nam (`_GEN`, `_BRAN`, `_ROLE`, `_TABOO`, `_LUNAR_GIO`...).
4. **Nạp dữ liệu mẫu (Demo)**:
   - Cho phép nạp lại bộ gia phả mẫu mực 5 thế hệ dòng họ Trần – Đông Ngạc để trải nghiệm đầy đủ các tính năng.

---
*Gia Phả Việt – Cội Nguồn: Gìn giữ muôn đời di sản ông cha.*
