# TÀI LIỆU KỸ THUẬT GEDCOM 5.5.1
## ĐẶC TẢ TƯƠNG THÍCH & PHẦN MỞ RỘNG VIỆT NAM (VIETNAMESE CUSTOM TAGS)

> **Tài liệu đặc tả chuẩn trao đổi dữ liệu phả hệ quốc tế GEDCOM 5.5.1 UTF-8 tích hợp trong hệ thống Gia Phả Việt – Cội Nguồn.**

---

## 1. Giới thiệu tổng quan

**GEDCOM** (Genealogical Data Communication) là tiêu chuẩn dữ liệu phả hệ phổ biến nhất trên thế giới, được khởi xướng bởi Giáo hội Các Thánh hữu Ngày sau của Chúa Giê Su Ky Tô (LDS) và được hỗ trợ bởi hầu hết các phần mềm gia phả quốc tế như **Gramps, FamilySearch, MyHeritage, Ancestry, RootsMagic, Brother's Keeper**.

**Gia Phả Việt – Cội Nguồn** hỗ trợ đầy đủ cả hai chiều:
1. **Xuất file `.ged` (Export)**: Xuất toàn bộ dữ liệu phả hệ theo định dạng GEDCOM 5.5.1 với bảng mã ký tự **UTF-8**, bảo toàn nguyên vẹn dấu tiếng Việt và cấu trúc huyết thống.
2. **Nhập file `.ged` (Import)**: Đọc và phân tích các tệp GEDCOM tiêu chuẩn từ các phần mềm khác, tự động tạo thành viên, gia đình và liên kết phụ mẫu - con cái.
3. **Phần mở rộng tiếng Việt (`_TAGS`)**: Bổ sung các thẻ tùy biến bắt đầu bằng ký tự gạch dưới `_` (theo đúng quy định chuẩn của GEDCOM) để bảo toàn các trường dữ liệu phả hệ đặc thù của văn hóa Việt Nam.

---

## 2. Tiêu chuẩn Mã hóa Ký tự (Character Encoding)

Để bảo tồn dấu tiếng Việt có dấu đầy đủ (Unicode), hệ thống tuân thủ nghiêm ngặt chuẩn GEDCOM 5.5.1 UTF-8:

```gedcom
0 HEAD
1 SOUR GIA_PHA_VIET
2 VERS 2.2.0
2 NAME Gia Phả Việt – Cội Nguồn
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
```

- Bảng mã bắt buộc là **UTF-8**.
- Hỗ trợ đầy đủ tất cả các ký tự tiếng Việt: `à, á, ả, ã, ạ, ă, ằ, ắ, ẳ, ẵ, ặ, â, ầ, ấ, ẩ, ẫ, ậ, đ, è, é, ẻ, ẽ, ẹ, ê, ề, ế, ể, ễ, ệ, ì, í, ỉ, ĩ, ị, ò, ó, ỏ, õ, ọ, ô, ồ, ố, ổ, ỗ, ộ, ơ, ờ, ớ, ở, ỡ, ợ, ù, ú, ủ, ũ, ụ, ư, ừ, ứ, ử, ữ, ự, ỳ, ý, ỷ, ỹ, y`.

---

## 3. Bảng Ánh xạ Thẻ GEDCOM Chuẩn (Standard Tag Mapping)

### 3.1. Thẻ Cá nhân (`INDI`)

| Trường trong Gia Phả Việt | Thẻ GEDCOM Chuẩn | Cấu trúc Ví dụ | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Mã định danh** | `0 @ID@ INDI` | `0 @I01@ INDI` | Unique ID |
| **Họ và tên đầy đủ** | `1 NAME` / `2 GIVN` / `2 SURN` | `1 NAME Trần Văn /Khải/`<br>`2 GIVN Văn Khải`<br>`2 SURN Trần` | Họ nằm giữa 2 dấu gạch chéo `/` |
| **Giới tính** | `1 SEX` | `1 SEX M` hoặc `1 SEX F` hoặc `1 SEX U` | M = Nam, F = Nữ, U = Khác/Chưa rõ |
| **Ngày & Nơi sinh** | `1 BIRT`<br>`2 DATE`<br>`2 PLAC` | `1 BIRT`<br>`2 DATE 14 MAR 1872`<br>`2 PLAC Làng Đông Ngạc, Hà Nội` | Hỗ trợ ngày tháng linh hoạt |
| **Ngày & Nơi mất** | `1 DEAT`<br>`2 DATE`<br>`2 PLAC` | `1 DEAT`<br>`2 DATE 22 NOV 1948`<br>`2 PLAC Đông Ngạc, Hà Nội` | Người còn sống sẽ không có thẻ `DEAT` |
| **Nghề nghiệp** | `1 OCCU` | `1 OCCU Thầy đồ dạy chữ Hán` | Tự do |
| **Nơi cư trú** | `1 RESI`<br>`2 ADDR` | `1 RESI`<br>`2 ADDR Xóm Chùa, Đông Ngạc` | Địa chỉ sinh sống |
| **Tiểu sử** | `1 NOTE` | `1 NOTE Cụ sinh trưởng trong...` | Văn bản tiểu sử cuộc đời |

### 3.2. Thẻ Gia đình & Hôn phối (`FAM`)

| Khái niệm Gia phả | Thẻ GEDCOM Chuẩn | Cấu trúc Ví dụ | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Bản ghi Gia đình** | `0 @FAM_ID@ FAM` | `0 @F01@ FAM` | Một cuộc hôn nhân |
| **Người Chồng** | `1 HUSB` | `1 HUSB @I01@` | Trỏ đến ID người cha/chồng |
| **Người Vợ** | `1 WIFE` | `1 WIFE @I02@` | Trỏ đến ID người mẹ/vợ |
| **Con cái** | `1 CHIL` | `1 CHIL @I03@`<br>`1 CHIL @I04@` | Danh sách con của cặp vợ chồng |
| **Gắn kết từ phía con**| `1 FAMC` | `1 FAMC @F01@` (trong `INDI`) | Gia đình cha mẹ mà người này là con |
| **Gắn kết từ phía vợ/chồng**| `1 FAMS` | `1 FAMS @F01@` (trong `INDI`) | Gia đình mà người này là vợ hoặc chồng |

---

## 4. Bảng Thẻ Mở Rộng Tiếng Việt (Vietnamese Custom Tags)

Để không bị thất thoát những thông tin phả hệ vô cùng quan trọng của dòng họ Việt Nam, Gia Phả Việt định nghĩa bộ thẻ mở rộng có tiền tố `_`:

| Thẻ Tùy biến | Tên Trường | Định dạng Dữ liệu | Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `_GEN` | Đời thứ (Thế hệ) | Số nguyên dương (`1, 2, 3...`) | `1 _GEN 3` |
| `_BRAN` | Chi họ | Chuỗi văn bản / Tên chi | `1 _BRAN Chi Giáp (Chi Trưởng)` |
| `_SUBB` | Phái trong chi | Chuỗi văn bản | `1 _SUBB Phái Đông` |
| `_ROLE` | Vai vế trong dòng tộc | Chuỗi danh xưng tộc hệ | `1 _ROLE Trưởng tộc đời thứ 3` |
| `_TABOO` | Tên húy (Tên kiêng) | Tên húy dùng trong tế tự | `1 _TABOO Trọng Lộc` |
| `_COURT` | Tên tự (Tên chữ) | Tên tự nho nhã | `1 _COURT Đức Hiên` |
| `_ALIAS` | Bí danh | Tên kháng chiến / Biệt danh | `1 _ALIAS Việt Sơn` |
| `_LUNAR_GIO`| Ngày giỗ Âm lịch | `DD/MM AL [Ghi chú]` | `1 _LUNAR_GIO 22/10 AL Giỗ Tổ Đại Tôn` |
| `_BURIAL` | Nơi an táng / Mộ phần | Chuỗi mô tả vị trí lăng mộ | `1 _BURIAL Khu mộ Tổ đồng Cửa Chùa` |
| `_MERIT` | Công đức dòng họ | Văn bản ghi nhận đóng góp | `1 _MERIT Trùng tu từ đường năm 1924` |
| `_UNION_ROLE`| Thứ tự vợ chồng | `PRIMARY` / `SECONDARY` / `REMARRIED` | `1 _UNION_ROLE PRIMARY` (Chính thất) |

---

## 5. Ví dụ Mẫu Bản ghi GEDCOM Đầy Đủ

```gedcom
0 HEAD
1 SOUR GIA_PHA_VIET
2 VERS 2.2.0
2 NAME Gia Phả Việt – Cội Nguồn
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
0 @I01@ INDI
1 NAME Trần Văn /Lộc/
2 GIVN Văn Lộc
2 SURN Trần
1 SEX M
1 BIRT
2 DATE 14 MAR 1872
2 PLAC Làng Đông Ngạc, phủ Hoài Đức, Hà Nội
1 DEAT
2 DATE 22 NOV 1948
2 PLAC Đông Ngạc, Hà Nội
1 OCCU Nhà nho, Thầy đồ dạy chữ Hán và Quốc ngữ
1 RESI
2 ADDR Nhà cổ 3 gian Xóm Chùa, Đông Ngạc
1 _GEN 1
1 _BRAN Đại Tôn Họ Trần Đông Ngạc
1 _SUBB Gốc Tổ Đông Ngạc
1 _ROLE Thủy tổ chi phái cận đại
1 _TABOO Trọng Lộc
1 _COURT Đức Hiên
1 _LUNAR_GIO 22/10 AL Giỗ Tổ Đại Tôn tại Từ đường Đông Ngạc
1 _BURIAL Khu mộ Tổ đồng Cửa Chùa, Đông Ngạc
1 _MERIT Đứng ra trùng tu nhà thờ họ năm 1924, chép lại cuốn Gia phả chữ Hán sang Quốc ngữ.
1 NOTE Cụ Trần Văn Lộc sinh trưởng trong một gia đình nho học lâu đời ven sông Hồng...
1 FAMS @F01@
0 @I01_SP@ INDI
1 NAME Nguyễn Thị /Kim/
2 GIVN Thị Kim
2 SURN Nguyễn
1 SEX F
1 BIRT
2 DATE 1876
1 DEAT
2 DATE 8 DEC 1954
1 _GEN 1
1 _ROLE Tổ mẫu Đại Tôn
1 _LUNAR_GIO 14/11 AL Giỗ Tổ Mẫu
1 FAMS @F01@
0 @I02@ INDI
1 NAME Trần Văn /Khải/
2 GIVN Văn Khải
2 SURN Trần
1 SEX M
1 BIRT
2 DATE 5 FEB 1897
1 DEAT
2 DATE 19 NOV 1974
1 _GEN 2
1 _BRAN Chi Giáp (Chi Trưởng)
1 _ROLE Trưởng tộc đời thứ 2
1 FAMC @F01@
0 @F01@ FAM
1 HUSB @I01@
1 WIFE @I01_SP@
1 CHIL @I02@
0 TRLR
```

---

## 6. Khả Năng Tương Thích Với Các Phần Mềm Khác

### 1. Gramps (Mã nguồn mở - Đề xuất cao nhất)
- Hỗ trợ hoàn hảo file GEDCOM UTF-8 xuất từ Gia Phả Việt.
- Các thẻ tùy biến (`_GEN`, `_ROLE`, `_TABOO`...) được Gramps lưu giữ trong mục "Custom Attributes" của từng cá nhân mà không bị loại bỏ.

### 2. FamilySearch & MyHeritage
- Nhận diện chính xác cây phả hệ, cha mẹ, vợ chồng và con cái.
- Hỗ trợ đầy đủ tiếng Việt Unicode.
- Khi tải file lên, các trường ngày tháng linh hoạt và tiểu sử (`NOTE`) hiển thị rõ ràng.

### 3. RootsMagic & Brother's Keeper
- Nhập xuất bình thường với tùy chọn UTF-8 Character Set.

---

## 7. Khuyến nghị khi Nhập / Xuất Dữ liệu

1. **Trước khi nhập file `.ged` mới**:
   - Luôn sử dụng chức năng **"Sao lưu JSON"** trong ứng dụng để tạo một bản sao lưu dự phòng toàn diện.
2. **Khi chia sẻ cho người thân dùng các phần mềm quốc tế**:
   - Xuất file GEDCOM để họ có thể nạp vào Gramps hoặc tải lên tài khoản FamilySearch.
3. **Khi cần bảo tồn 100% hình ảnh và bố cục**:
   - Khuyến nghị sử dụng định dạng **JSON trọn gói (`.json`)** của Gia Phả Việt, vì chuẩn GEDCOM 5.5.1 không nhúng trực tiếp dữ liệu hình ảnh Base64 trong tệp.
