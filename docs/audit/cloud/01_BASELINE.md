# 01 · Baseline M0 Cloud

- Repository công khai [minhquanle3900/gia-pha](https://github.com/minhquanle3900/gia-pha).
- Baseline `main` [`1cec38dc77ea46260fa0608c931b22e0b508d531`](https://github.com/minhquanle3900/gia-pha/commit/1cec38dc77ea46260fa0608c931b22e0b508d531), commit Initial-import.
- Nhánh audit `audit/m0-cloud-engineering`. Thay đổi của M0 giới hạn trong `docs/audit/cloud/`.
- [Manifest baseline](evidence/source-inventory.tsv) kiểm kê 99 tệp tracked, gồm 81 tệp dưới `src/`, cấu hình root, Bun lockfile, tài liệu và hai PDF. Tổng phần văn bản là 97 tệp và 37.830 dòng, gồm lockfile. Hai PDF được ghi nhận theo tên và thay đổi hash trong lúc test. Nội dung PDF và danh tính người trong fixture chưa được xác minh.
- Độ sâu xác minh khác nhau theo đường gọi. Đã truy vết entry point, store, validation, import, merge, export, API, cấu hình PWA và suite. Những hành vi dựa vào browser, thiết bị hoặc service bên ngoài được đánh dấu riêng trong [ma trận](02_FEATURE_MATRIX.md). Số tệp kiểm kê không đại diện cho tỷ lệ branch coverage hay một lượt đọc thủ công từng dòng.
- Nguồn đối chiếu gồm `README.md`, `CHANGELOG.md`, `DATA_MODEL.md`, `USER_GUIDE.md`, `IMPORT_EXPORT.md`, `GEDCOM_SUPPORT.md`. Ưu tiên quan sát từ đường gọi thực tế và lệnh chạy tại SHA trên khi khác mô tả.
