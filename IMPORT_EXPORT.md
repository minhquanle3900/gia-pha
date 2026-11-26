# Tài liệu Nhập & Xuất Dữ liệu (Import & Export Guide)

Tài liệu này hướng dẫn cách sao lưu, xuất khẩu và chuyển đổi dữ liệu phả hệ trong **Gia Phả Việt – Cội Nguồn**.

---

## 1. Định dạng Bản sao lưu Toàn vẹn JSON (.json)

Tệp sao lưu `.json` giữ nguyên các bản ghi. Ảnh và kỷ vật tải lên trong ứng dụng đã được lưu dưới dạng data URL, nên đi kèm bản sao lưu. Với dữ liệu v1 có URL bên ngoài, tệp giữ nguyên URL và preview cảnh báo sự phụ thuộc này. Xuất JSON không tải tài nguyên từ các URL bên ngoài.

### Cấu trúc tệp JSON:
```json
{
  "app": "Gia Phả Việt – Cội Nguồn",
  "schemaVersion": 1,
  "exportedAt": "2026-11-04T11:00:00.000Z",
  "settings": {
    "id": "default",
    "clanName": "Dòng họ Trần – Đông Ngạc",
    "clanMotto": "Tiên tổ phương danh lưu vạn đại...",
    "ancestralHallLocation": "Làng Đông Ngạc, Bắc Từ Liêm, Hà Nội",
    "rootPersonId": "tran_nguyen_khoi",
    "schemaVersion": 1,
    "lastBackupAt": "2026-11-04T11:00:00.000Z",
    "updatedAt": "2026-11-04T11:00:00.000Z"
  },
  "branches": [...],
  "people": [...],
  "unions": [...],
  "relationships": [...],
  "lifeEvents": [...],
  "media": [...],
  "stories": [...]
}
```

### Chế độ nhập (Import modes):
1. **Ghi đè toàn bộ (Replace Entire Database)**:
   - Dùng khi chuyển đổi thiết bị hoặc phục hồi từ bản sao lưu trước đó.
   - Toàn bộ cơ sở dữ liệu hiện tại trong IndexedDB sẽ được thay thế bằng dữ liệu trong tệp.
2. **Hợp nhất thông minh (Smart Merge)**:
   - ID và nội dung giống hệt được giữ một lần. ID trùng nhưng nội dung khác chặn nhập. Trùng tên hoặc năm sinh chỉ là gợi ý để xem xét.
   - Gộp bổ sung bản ghi hợp lệ và giữ thiết lập của thiết bị hiện tại.

---

## 2. Tiêu chuẩn Phả hệ Quốc tế GEDCOM 5.5.1 (.ged)

GEDCOM là định dạng trao đổi phả hệ tiêu chuẩn được công nhận toàn cầu. Ứng dụng hỗ trợ xuất và nhập tệp GEDCOM với mã hóa ký tự **UTF-8** tiếng Việt trọn vẹn.

Khôi phục từ GEDCOM thay thế dữ liệu hiện tại. Bộ chuyển đổi không chuyển mốc sự kiện, ảnh chân dung, kho tư liệu, nhật ký dòng họ hoặc liên kết đến những mục này. Một số trường hồ sơ, chi họ và thiết lập cũng không có ánh xạ. Xuất JSON trước khi thay thế để giữ bản sao đầy đủ.

### Bảng đối chiếu thẻ GEDCOM và trường Gia Phả Việt:

| Thẻ GEDCOM chuẩn | Trường dữ liệu Gia Phả Việt | Ý nghĩa |
| :--- | :--- | :--- |
| `INDI` | `Person` | Bản ghi cá nhân |
| `NAME /Họ/ Tên` | `Person.fullName` | Họ và tên |
| `SEX (M/F/U)` | `Person.gender` | Giới tính (Nam, Nữ, Chưa rõ) |
| `BIRT` -> `DATE`, `PLAC` | `Person.birthDate`, `Person.birthPlace` | Ngày và nơi sinh |
| `DEAT` -> `DATE`, `PLAC` | `Person.deathDate`, `Person.deathPlace` | Ngày và nơi mất |
| `BURI` -> `PLAC` | `Person.burialPlace` | Nơi an táng / Mộ phần |
| `OCCU` | `Person.occupation` | Nghề nghiệp / Học vị |
| `RESI` | `Person.residence` | Nơi cư trú |
| `INDI.NOTE` | `Person.biography` | Tiểu sử |
| `FAM` | `Union` | Bản ghi hôn phối và gia đình |
| `HUSB`, `WIFE` | `Union.partnerIds` | Chồng và Vợ |
| `CHIL` / `FAMC.PEDI` | `Relationship` | Liên kết cha/mẹ – con và loại quan hệ |

### Các thẻ mở rộng đặc thù văn hóa Việt Nam (Custom Tags):
- `_GEN`: Đời thứ / Thế hệ trong dòng họ (VD: `1 _GEN 3`).
- `_BRAN`: Chi họ trực thuộc (VD: `1 _BRAN Chi Giáp - Chi Trưởng`).
- `_SUBB`: Phái trong chi (VD: `1 _SUBB Phái Đông`).
- `_ROLE`: Vai vế dòng họ (VD: `1 _ROLE Trưởng tộc`).
- `_TABOO`: Tên húy tế tự (VD: `1 _TABOO Thuần Lộc`).
- `_COURTESY`: Tên tự / Tên hiệu (VD: `1 _COURTESY Trọng Viễn`).
- `_ALIAS`: Bí danh (VD: `1 _ALIAS Ba Lộc`).
- `_LUNAR_GIO`: Ngày giỗ Âm lịch hàng năm (VD: `1 _LUNAR_GIO 15/01`).
- `_MERIT`: Công đức đóng góp cho dòng họ (VD: `1 _MERIT Cung tiến đất nhà thờ tổ`).
- `_GP_UNION`: Thẻ trên gia đình chỉ có một phụ huynh, lưu hôn phối liên quan hoặc giá trị `NONE`. Cho phép giữ đúng liên kết đã ghi khi hai người trong một hôn phối có quan hệ khác nhau với con.
- `_GP_LINEAGE`: Giữ loại quan hệ chưa rõ trên `FAMC`. Phần mềm khác có thể bỏ qua thẻ mở rộng.
