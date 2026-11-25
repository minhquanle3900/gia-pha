# M1.2A Cloud → Desktop · GP-CLOUD-003

- Base SHA `6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e`, head M1.1 tại PR #2 đang mở. Base của stacked PR là `fix/m1-cloud-atomic-merge`; nhánh làm việc là `fix/m1-cloud-import-integrity`.
- Head code để QA `0db40052b0b173fc1a45738a2233a4fe8f0f47b6`. Commit tiếp theo chỉ thêm bàn giao.
- Audit M0 tham chiếu `b2b707de6c3ff2207cfbb08f3b93b259460618db`, mục GP-CLOUD-003.

## Luồng nhập và điểm ghi

| Đường vào | Parser và preview | Điểm ghi |
|---|---|---|
| JSON → Khôi phục | Đọc JSON, chuẩn hóa trường v1 trước đây được phép bỏ, kiểm runtime và kiểm đồ thị tự chứa. Hiển thị cảnh báo trước xác nhận thay toàn bộ. | `restoreDatabaseSnapshot` kiểm lại payload trước khi xóa hoặc ghi. Thay 8 store trong cùng transaction. |
| JSON → Gộp | Kiểm payload với dữ liệu hiện có. Liệt kê xung đột ID hoặc tham chiếu không hợp lệ; hiển thị chính sách giữ thiết lập hiện tại. | `mergeDatabaseSnapshot` đọc snapshot hiện hành trong transaction, kiểm kết quả hợp nhất, rồi thêm bản ghi mới. |
| CSV / TSV → Nhập | Parser xử lý delimiter, tiêu đề và trường trong ngoặc kép. Mapper xác định người/chi và báo từng lỗi. Candidate chỉ gồm bản ghi mới, kể cả chi phát sinh. | Dùng cùng điểm ghi với JSON gộp. Quan hệ có thể trỏ đến thành viên đang có nếu tên xác định duy nhất. |
| GEDCOM → Nhập | Parser kiểm cấu trúc GEDCOM, ID và liên kết xref. Snapshot dùng ID ứng dụng tự chứa. Hiển thị thẻ chưa hỗ trợ và thông tin phải suy ra. | Dùng cùng điểm ghi với JSON khôi phục. |
| Nạp lại dữ liệu mẫu | ConfirmDialog nạp fixture nội bộ qua `resetToDemoDataset`. Không có parser tệp. | Đường ghi nội bộ dùng chung transaction thay snapshot. |

Validator kiểm runtime tám nhóm dữ liệu, gồm trường bắt buộc, ID trùng, enum, phần tử lồng nhau, ngày, tham chiếu, tự tham chiếu và chu trình tổ tiên/chi họ. Ngày có định dạng hoặc giá trị bất khả thi chặn nhập. Thứ tự sinh/mất đáng ngờ, ngày dạng văn bản chưa hỗ trợ trong GEDCOM, metadata hôn phối cần xem lại và media phụ thuộc URL bên ngoài được cảnh báo. Warnings không chỉnh nội dung hoặc thả âm thầm bản ghi JSON.

## Tương thích và giới hạn

- Backup JSON v1 hợp lệ, kể cả dataset rỗng và ngày có độ chính xác một phần, vẫn khôi phục được. Reader giữ tương thích với timestamp record rỗng từ v1. Với tệp v1 thiếu các collection cũ từng được phép bỏ, preview nói rõ collection mặc định rỗng và thiết lập dùng khi thiếu. Collection có mặt nhưng sai kiểu hoặc chứa record lỗi sẽ bị từ chối.
- Gộp giữ nguyên thiết lập hiện có, giữ bản ghi cùng ID và cùng nội dung một lần, chặn bản ghi cùng ID nhưng khác nội dung. Thứ tự key JSON và thuộc tính tùy chọn bỏ qua khi serialize không làm phát sinh xung đột. Nếu dữ liệu đã sửa hoặc exporter đóng gói lại `portraitUrl` làm thay đổi nội dung cùng ID, merge báo xung đột. Người vận hành có thể xem xét dùng chế độ khôi phục có xác nhận khi muốn thay toàn bộ.
- CSV giữ luồng UTF-8 từ mẫu Excel/CSV, hỗ trợ tiêu đề cũ và các biến thể được kiểm thử. Tên quan hệ không xác định duy nhất chặn cả file. GEDCOM hợp lệ có HEAD/TRLR và không có INDI có thể khôi phục dataset rỗng sau xác nhận. GEDCOM là định dạng trao đổi có cảnh báo về trường chưa hỗ trợ; JSON dùng cho sao lưu đủ 8 store.
- Nếu kho hiện tại đã có lỗi, gộp sẽ chặn khi snapshot hợp nhất vẫn lỗi. Bản ghi và tham chiếu nào cần xem lại được nêu trong thông báo. Backlog ngoài sprint: `deleteBranchRecord` hiện dọn tham chiếu người nhưng chưa dọn chi cha, media và nhật ký. Backup chứa liên kết mồ côi do thao tác này sẽ bị báo lỗi.

## Tệp đã sửa

| Tệp | Vai trò |
|---|---|
| `src/services/importValidationService.ts` | Validator runtime và đồ thị, trả lỗi/cảnh báo. |
| `src/services/snapshotMergeService.ts` | Kế hoạch bổ sung và kiểm xung đột trên snapshot kết hợp. |
| `src/services/jsonBackupService.ts` | Parse/chuẩn hóa v1 và preview theo chế độ. |
| `src/services/csvImportService.ts` | Đọc CSV/TSV, báo lỗi theo dòng và tạo candidate với chi phát sinh. |
| `src/services/gedcomService.ts` | Kiểm cú pháp, xref, dữ liệu không thể ánh xạ và snapshot tự chứa. |
| `src/database/db.ts` | Đọc backup nhất quán, xác thực và ghi/abort nguyên tử. |
| `src/context/GenealogyContext.tsx` | Kết nối các điểm ghi và refresh sau commit. |
| `src/features/import-export/DataManagementPage.tsx` | Hiển thị chẩn đoán và gọi thao tác nhập tương ứng. |
| `src/components/ConfirmDialog.tsx` | Khóa xác nhận trong lúc ghi. |
| `src/__tests__/importIntegrity.test.ts` | 27 ca runtime, tích hợp parser, restore/merge và rollback. |
| `src/__tests__/importAdapters.test.ts` | 15 ca tương thích/diagnostics cho CSV và GEDCOM. |
| `docs/handoff/M1_2A_CLOUD_TO_DESKTOP.md` | Bàn giao và bằng chứng hồi quy. |

## Bằng chứng kiểm thử

Linux x86_64, Node 24.22.3, npm 11.19.1, Bun 1.4.5, Vitest 5.1.0. Môi trường dùng dependency đã cài với lockfile. Cài lại bằng `npm exec --yes --package=bun -- bun install --frozen-lockfile`.

| Exact command | Exit | Kết quả |
|---|---:|---|
| `npm test -- src/__tests__/importIntegrity.test.ts` trước fix, khi file chỉ có test GP-CLOUD-003 | 1 | RED · promise resolve với `addedPeople: 1, addedRelationships: 1, updatedPeople: 3` thay vì reject. |
| `npm test -- src/__tests__/importIntegrity.test.ts` sau fix đầu tiên | 0 | GREEN · cùng test đạt, snapshot nghiệp vụ giữ nguyên. |
| `npm test -- src/__tests__/importIntegrity.test.ts src/__tests__/importAdapters.test.ts` | 0 | 42/42 test mới PASS. |
| `npm test` | 0 | 145/145 trong 12 tệp, giữ toàn bộ 103 test baseline. Xác nhận lại trên commit code với Git sạch. |
| `npm run lint` | 0 | TypeScript PASS. |
| `npm run build` | 0 | Vite và Workbox PASS. Cảnh báo chunk và dynamic import đã có ở base. |
| `git status --porcelain=v1 --untracked-files=all` và `git diff --exit-code HEAD -- '*.pdf'` | 0 | Working tree sạch trước và sau suite trên commit code; PDF tracked giữ nguyên. |

Ca RED tạo người A, B, C trong IndexedDB với A → B → C. Backup có các bản ghi người tương đương, thêm người mới và cạnh C → A. Từng snapshot không có vòng riêng. Ca hồi quy giữ nguyên kỳ vọng từ RED sang GREEN: từ chối vì kết quả có vòng và so sánh mọi record sau lỗi với snapshot trước. Ca chèn lỗi đồng bộ ở restore chạy sau khi đã clear và ghi qua nhiều store. Ca lỗi request ở merge chạy sau khi đã thêm người mới. Cả hai rollback giữ nguyên dữ liệu và cho phép retry; so sánh chỉ bỏ timestamp `exportedAt` được tạo lúc đọc.

## Ca trình duyệt cho Desktop

Dùng Windows, Chrome và Edge, với profile và dữ liệu tổng hợp riêng. Xuất backup trước mỗi ca thay thế. Ghi SHA, trình duyệt, kết quả, thông báo và snapshot trước/sau.

| Case | Thao tác | Kết quả mong đợi |
|---|---|---|
| M12A-D01 | Khôi phục JSON v1 có đủ 8 store gồm ảnh nhúng, story và mốc. Reload và xuất lại. Lặp với tập rỗng hợp lệ. | Quan hệ và ID giữ nguyên. Tập rỗng chỉ thay thế dữ liệu sau xác nhận. |
| M12A-D02 | Nạp JSON có ID trùng, sai kiểu lồng nhau hoặc media thiếu. Thử riêng một tệp có ngày hợp lệ nhưng năm mất trước năm sinh. | Lỗi nêu vị trí và chặn tệp. Ca chronology hiển thị cảnh báo và giữ giá trị khi người dùng xác nhận. |
| M12A-D03 | Nhập gộp bản sao có cạnh kết hợp thành vòng. Trong một ca khác, mở preview hợp lệ ở tab A rồi tạo bản ghi cùng ID với nội dung khác từ bộ fixture ở tab B cùng origin. Xác nhận ở A. | Thông báo chặn vòng hoặc xung đột. Bản ghi mới hợp lệ lẫn bản ghi hiện có đều giữ trạng thái trước khi xác nhận. |
| M12A-D04 | Nhập gộp một backup có bản ghi giống hệt và một bản ghi mới, rồi nhập lại. | Lần đầu chỉ thêm dữ liệu mới. Lần sau không nhân đôi. Thiết lập hiện có giữ nguyên. |
| M12A-D05 | Nhập CSV UTF-8 có chi mới và cha đã có trong DB. Thử một tệp khác với tên người trùng hoặc năm dạng ký tự. | Chi mới và cạnh đều tồn tại sau reload ở ca hợp lệ. Ca lỗi chặn cả file và hiển thị lỗi trong preview. |
| M12A-D06 | Nạp GEDCOM 5.5.1 có tiếng Việt, chi, hôn phối và thẻ chưa hỗ trợ. Thử riêng GEDCOM có trỏ xref thiếu hoặc thiếu TRLR. | Ca hợp lệ hiển thị cảnh báo khả năng ánh xạ, các ID nội bộ tự chứa. Hai ca lỗi không mở xác nhận thay thế. |
| M12A-D07 | Với tệp lớn tổng hợp, xác nhận khi đang thực hiện và thử bấm lần hai. Reload rồi đối chiếu count và tham chiếu. | Một lần thao tác, UI thể hiện đang nhập và chỉ báo thành công sau commit. |

## Rollback và mẫu App Factory

Lỗi validation chưa ghi dữ liệu; lỗi IndexedDB rollback trước khi báo lỗi. Để lùi code ở QA, checkout base trong worktree riêng hoặc revert commit implementation trên nhánh tích hợp. Schema vẫn v1. Lùi code không phục hồi một lần thay thế đã commit; để quay lại dữ liệu fixture dùng JSON v1 hợp lệ đã xuất trước ca thử. Kiểm thử UI/IndexedDB thật còn chờ Desktop.

**Validated Atomic Import Boundary.** Parser chuyển định dạng sang candidate và báo mọi trường không thể ánh xạ. Validator dùng chung cho preview và điểm ghi, giữ lỗi cấu trúc tách khỏi cảnh báo nghiệp vụ. Import gộp đọc trạng thái hiện hành và kiểm tra kết quả kết hợp trong chính transaction ghi. Restore kiểm candidate trước khi clear, sau đó clear và ghi trong cùng transaction. Chờ commit trước khi refresh. Dùng snapshot nghiệp vụ, các lỗi đồng bộ/bất đồng bộ và retry làm kiểm tra hồi quy.
