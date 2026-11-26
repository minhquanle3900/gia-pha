# M1.2B Cloud → Desktop · Core Integrity Closure

- Base `43d9b0271c9f2fdb53f419b2fd507a7a6dd80748` là head PR #3. Nhánh `fix/m1-cloud-core-closure` xếp chồng trên `fix/m1-cloud-import-integrity`.
- Head code `8a3d15c460a83d4575a2268a73dc57255b2e69e2`. Commit tiếp theo chỉ thêm tài liệu bàn giao.
- Audit của Desktop `0577071fdb458f19e3231e6561b271b3dd858db4`. [M0 Desktop → Cloud](https://github.com/minhquanle3900/gia-pha/blob/0577071fdb458f19e3231e6561b271b3dd858db4/docs/audit/desktop/M0_DESKTOP_TO_CLOUD.md).
- Trạng thái từng issue và QA còn chờ ở [remediation backlog](M1_2B_REMEDIATION_BACKLOG.md). Kiến trúc và rủi ro thiết bị ở [Mobile readiness](MOBILE_ARCHITECTURE_READINESS.md).

## Hành vi và tương thích

| Gói / commit | Trước / sau và quy tắc dữ liệu | Tệp chính |
|---|---|---|
| A · `c4b60a8` | Hai người cùng cặp có thể tạo union trùng, kể cả qua gộp hồ sơ. Hệ thống kiểm dưới transaction. Chấp nhận cặp khác và tái hôn có khoảng niên đại cùng lịch phân biệt được, từ chối cặp cùng ID người khi dữ kiện còn mơ hồ. Giữ nguyên record hôn phối cũ, metadata và `unionId` của con. Khi nhập snapshot v1, các union trùng cặp có sẵn được giữ; thao tác ghi trực tiếp/gộp liên quan áp dụng quyết định trên. | `db.ts`, `validationService.ts`, `duplicateMergeService.ts`, `RelationshipEditorModal.tsx`, `unionIntegrity.test.ts` |
| B · `29b9d25`, `8a3d15c` | Chọn ảnh chỉ tạo bản nháp. Lưu ghi người + media cùng lúc. Thay/gỡ chân dung giữ ảnh cũ trong kho. Xóa từ kho bị chặn nếu có tham chiếu từ hồ sơ hoặc nhật ký, kể cả URL chân dung v1 trùng dữ liệu ảnh. Với chân dung ID-only có ảnh nhúng, UI lấy ảnh để hiển thị mà giữ record thô khi backup. JSON không fetch/viết lại URL, nên backup vừa xuất gộp như no-op. ID trùng và nội dung thực sự khác vẫn chặn. | `PersonFormModal.tsx`, `GalleryPage.tsx`, `GenealogyContext.tsx`, `db.ts`, `genealogy.ts`, `imageUtils.ts`, `jsonBackupService.ts`, `portraitLifecycle.test.ts`, `IMPORT_EXPORT.md` |
| C · `29a8d34` | Preview ghi số hồ sơ chi chính/phụ, chi con, media và nhật ký bị ảnh hưởng. Transaction gỡ tham chiếu tới chi bị xóa, nâng chi con trực tiếp lên cấp cao nhất và giữ mọi người, kỷ vật, nhật ký. | `db.ts`, `DataManagementPage.tsx`, `branchDeletion.test.ts` |
| D · `9f93a8f` | Ngày có trường mâu thuẫn với precision hoặc placeholder v1 được cảnh báo; giữ từng thành phần và nguyên văn ngày lịch sử. Ngày sai kiểu, enum hoặc không tồn tại trên lịch vẫn chặn. GEDCOM tháng, ngày có qualifier và ngày văn bản vẫn đọc được. | `importValidationService.ts`, `dateUtils.ts`, `flexibleDateImport.test.ts` |
| E · `8c5b8f6` | Escape dữ liệu người dùng ở đường tạo HTML, dùng chung helper với sách phả. Chuẩn hóa màu CSS hiện đại thành sRGB trong bản sao DOM cho html2canvas. Giữ bố cục, báo rõ đường In/Lưu PDF hoặc fallback văn bản khi thiết bị giới hạn canvas. | `personPdfReportService.ts`, `familyBookPdfService.ts`, `htmlUtils.ts`, `PersonProfileView.tsx`, `PersonReportModal.tsx`, `personReport.test.ts`, `familyBookPdf.test.ts` |
| GEDCOM · `8976199` | Sửa mapper cạnh và thêm cảnh báo trước khi thay thế. Xuất GEDCOM không đánh dấu đã backup JSON. | `gedcomService.ts`, `DataManagementPage.tsx`, `gedcomRoundTrip.test.ts`, `GEDCOM_SUPPORT.md`, `IMPORT_EXPORT.md` |
| Duplicate review · `cf56bd4` | Cùng tên đã chuẩn hóa và cùng năm sinh vẫn xuất hiện để xem xét khi khác đời, có lý do cảnh báo. Giữ bước chọn và xác nhận của người dùng. | `duplicateMergeService.ts`, `DuplicateMergeModal.tsx`, `duplicateDetection.test.ts` |

### Đối chiếu GEDCOM Desktop

| Nhóm | Gốc | Restore trước sửa | Restore sau sửa | Giải thích |
|---|---:|---:|---:|---|
| Thành viên | 31 | 31 | 31 | Ánh xạ INDI với trường được hỗ trợ. |
| Chi họ | 4 | 4 | 4 | Tạo lại từ nhãn chi; các thiết lập chi chi tiết có thể mất. |
| Hôn phối | 12 | 12 | 12 | Giữ cấu trúc FAM/hôn phối trong phạm vi app. |
| Quan hệ | 40 | 42 | 40 | Cơ chế cũ mở rộng CHIL cho cả hai partner. Nó tạo thêm hai cạnh con riêng `p_02→p_06`, `p_02→p_07` trong union `u_02b`; fixture chỉ có hai cạnh đó từ partner còn lại. |
| LifeEvent | 7 | 0 | 0 | Collection sự kiện độc lập nằm ngoài tập thẻ app hỗ trợ; một số ngày hồ sơ vẫn nằm ở INDI/FAM. |
| Media | 5 | 0 | 0 | Kho tư liệu, ảnh nhúng và liên kết media nằm ngoài phạm vi trao đổi app. |
| FamilyStory | 3 | 0 | 0 | Nhật ký và liên kết người/media nằm ngoài tập thẻ hỗ trợ; NOTE hồ sơ là trường khác. |

Bản sửa ghi cạnh cha/mẹ cụ thể khi hai người trong hôn phối không có cùng bộ cạnh và loại quan hệ. App ghi thẻ mở rộng để tái liên kết union và giữ lineage chưa rõ. Công cụ khác có thể bỏ qua thẻ mở rộng, nên kiểm theo ứng dụng đích. GEDCOM không dùng làm bản sao đầy đủ. Xác nhận thay thế liệt kê mốc, kho tư liệu, nhật ký và các liên kết sẽ mất, hướng người dùng xuất JSON trước.

## Test evidence

Linux x86_64, Node 24.22.3, npm 11.19.1, Vitest 5.1.0 và Chromium headless. Dependency dùng `bun.lock` đã cài. Ca mới dùng fixture tổng hợp hoặc demo M0. Không gọi Gemini live.

| Ca / lệnh | RED | GREEN |
|---|---|---|
| `npm test -- src/__tests__/unionIntegrity.test.ts` | Write và merge chấp nhận cặp xung đột, 2/2 lỗi ban đầu. | 11 ca package A trong full suite. Ghi lỗi giữ snapshot và retry. |
| `npm test -- src/__tests__/portraitLifecycle.test.ts` | Xóa media tham chiếu thành công sai và backup ID-only xung đột, 2/2 lỗi ban đầu. | 9 ca package B, gồm JSON round-trip sau merge. Save bị chèn lỗi sau khi ghi ảnh rollback và retry, record khác nội dung vẫn chặn. |
| `npm test -- src/__tests__/branchDeletion.test.ts` | 4 lỗi, orphan ở chi con, story, media và các kỳ vọng rollback. | 4/4 PASS, kể cả chèn lỗi đồng bộ/request, ghi đồng thời và v1 round-trip. |
| `npm test -- src/__tests__/flexibleDateImport.test.ts` | 2 fail, 13 pass do thiếu cảnh báo precision. | 15/15 PASS. |
| `npm test -- src/__tests__/personReport.test.ts src/__tests__/familyBookPdf.test.ts` | Punctuation/Unicode trong hai test hồ sơ chưa được escape. Chromium báo unsupported `oklab` khi tải PDF từ modal. | Unit tests PASS trong full suite. Hai entry point đều trả PDF có raster ở viewport 1366×768 và 390×844 trên Chromium. |
| `npm test -- src/__tests__/gedcomRoundTrip.test.ts` | 2 fail, 1 pass trước triển khai. Reproduced fixture 40→42 cạnh. | Ca GEDCOM PASS trong full suite; fixture 40→40, không dư hoặc thiếu cạnh. |
| `npm test -- src/__tests__/duplicateDetection.test.ts` | 0 nghi vấn thay vì 1 với cùng tên/năm, khác đời. | 3/3 PASS; cặp được cảnh báo và hai hồ sơ giữ nguyên. |
| `npm test` | Baseline M1.2A 145. | **194/194 PASS** trong 18 tệp, 145 baseline + 49 ca mới. |
| `npm run lint` và `npm run build` | — | Cả hai exit 0. Build còn cảnh báo chunk và dynamic import có từ baseline. |
| `git status --porcelain=v1 --untracked-files=all` và `git diff --exit-code HEAD -- '*.pdf'` | — | Working tree sạch trước/sau suite, PDF tracked không thay đổi. |

Chromium 390×844 xác minh chọn PNG tổng hợp 1800×1200, preview ảnh nén 400 px, Hủy giữ nguyên snapshot và Lưu tạo đúng một media liên kết. Lặp lại sau ngắt mạng khi shell đã tải cũng đạt. Các kết quả Chromium viewport là bằng chứng Cloud. Windows Chrome/Edge, Safari iOS và Chrome Android thiết bị thật còn chờ.

## Trình duyệt Desktop cần kiểm

| Ca | Thao tác trên profile thử nghiệm | Kết quả mong đợi |
|---|---|---|
| M12B-D01 | Từ hai hồ sơ, thử ghi cùng cặp hôn phối ở hai tab. Thử thêm tái hôn có hai niên đại phân biệt, sau đó gộp hai hồ sơ có union xung đột. | Chặn ghi trùng/merge mơ hồ. Tái hôn rõ giữ hai union và liên kết con. Dữ liệu trước lỗi giữ nguyên. |
| M12B-D02 | Chọn ảnh camera hoặc PNG lớn, Hủy, thử lại rồi Lưu, thay ảnh và thử xóa ảnh được hồ sơ khác/nhật ký dùng. | Hủy không phát sinh record. Lưu giữ cả hai hướng ID/URL. Chặn xóa record có tham chiếu và hiển thị lý do. |
| M12B-D03 | Sau CRUD hoặc merge, xuất JSON có ảnh rồi gộp lại, sau đó restore vào profile riêng. Lặp sau xóa chi có chi con, media và nhật ký. | Gộp backup tự xuất là no-op. Restore giữ ID/liên kết. Xóa chi chỉ gỡ liên kết, không mất media/người. |
| M12B-D04 | Nhập backup v1 có ngày chính xác thiếu ngày, ngày văn bản và ngày lịch sai. | Hai ca lịch sử hiện cảnh báo và giữ giá trị khi xác nhận; ca lịch sai chặn ghi. |
| M12B-D05 | Từ hồ sơ xuất trực tiếp và từ modal bấm Tải PDF. Mở file, xem tên tiếng Việt, nháy, dấu `& < >`, tiểu sử nhiều dòng, ghi chú, địa điểm và tên người thân. | Giữ nội dung và bố cục. Canvas giới hạn có hướng dẫn In/Lưu PDF hoặc mô tả fallback. Kiểm Windows Chrome/Edge và iOS/Android thực. |
| M12B-D06 | Xuất fixture 40 cạnh rồi restore GEDCOM trên profile thứ hai. Đọc cảnh báo trước khi xác nhận. | Ghi rõ mất mốc/media/nhật ký. Sau restore vẫn 40 cạnh và 12 union. JSON của fixture giữ đủ 8 store. |
| M12B-D07 | Nhập CSV cùng tên và năm sinh với hồ sơ hiện có nhưng khác đời, mở lọc trùng rồi thoát. | Cặp xuất hiện với lý do cần kiểm, hai hồ sơ vẫn còn. |

## Rollback và bài học Factory

Revert commit theo work package trên nhánh tích hợp hoặc dùng base trong worktree QA riêng. A dùng helper transaction ở B và validator ngày ở D, nên revert A trước khi revert các dependency đó. Schema vẫn v1. Nếu cần hoàn tác một thao tác dữ liệu đã commit, phục hồi file JSON v1 trước ca thử trong profile thích hợp. Rollback transaction tự xử lý lỗi của lượt ghi chưa commit.

- Truyền ý định chỉnh media từ UI xuống adapter. Chuẩn bị ảnh ngoài transaction, tạo liên kết và record trong cùng commit. Khi xuất backup, giữ nguyên record để kiểm xung đột có ý nghĩa.
- Phân biệt định danh record và ngữ nghĩa trùng. Mơ hồ giữa tái hôn, trùng hồ sơ hoặc dữ liệu lịch sử cần người vận hành xem xét và có đường từ chối bảo toàn dữ liệu.
- Tách dữ liệu mô hình khỏi rendering. Escape ở bước chuyển thành HTML và chuẩn hóa màu chỉ trong bản sao capture. Với định dạng trao đổi, kiểm cả cạnh và loại quan hệ, rồi nói rõ tập trường mất trước khi thay thế.
