# Core freeze · Kế hoạch tích hợp

Kiểm tra GitHub ngày 26/11/2026 theo giờ Việt Nam. **Cloud PASS tại head M1.2B, Core Integration Gate chờ Desktop independent QA.** Cả ba PR đang mở dưới dạng Draft. GitHub báo `mergeable: true` cho base hiện tại của từng PR. Đã xác nhận ancestry giữa bốn SHA trong bảng. Repo cho phép merge commit và cấu hình hiện tại giữ nhánh sau merge.

| Bước | PR và nhánh đích hiện tại | Base SHA | Head SHA | Diff riêng |
|---|---|---|---|---|
| 1 | [#2 Atomic Merge](https://github.com/minhquanle3900/gia-pha/pull/2) → `main` | `1cec38dc77ea46260fa0608c931b22e0b508d531` | `6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e` | 2 commit, 9 tệp |
| 2 | [#3 Atomic Import](https://github.com/minhquanle3900/gia-pha/pull/3) → `fix/m1-cloud-atomic-merge` | `6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e` | `43d9b0271c9f2fdb53f419b2fd507a7a6dd80748` | 2 commit, 12 tệp |
| 3 | [#5 Core Closure](https://github.com/minhquanle3900/gia-pha/pull/5) → `fix/m1-cloud-import-integrity` | `43d9b0271c9f2fdb53f419b2fd507a7a6dd80748` | `0eadd0099377632c3eb8d16fe28390ea2799b61a` | 9 commit, 33 tệp |

`DB_VERSION` và `SCHEMA_VERSION` đều là 1. Diff từ `main` đến head #5 giữ nguyên `package.json`, `bun.lock` và `vite.config.ts`. PR audit #1/#4 là nguồn bằng chứng. Gate triển khai đi theo đúng ba PR trong bảng.

## Commit và phụ thuộc

| Commit | Thay đổi và phụ thuộc cần giữ |
|---|---|
| `9dfd93f` | Atomic person merge ở IndexedDB. Context refresh sau commit, modal xử lý busy/error. Các test PDF chặn ghi file tracked. `6e2ba3c` thêm handoff. |
| `0db4005` | Atomic restore/import và validator chung. Nối với Context/adapter hiện có, giữ entry point merge người của #2. `43d9b02` thêm handoff. |
| `9f93a8f` | Kiểm precision qua validator #3. Cung cấp kiểm tra ngày dùng cho union ở `c4b60a8`. |
| `cf56bd4` | Cảnh báo hồ sơ cùng tên/năm, giữ xác nhận merge thủ công của #2. |
| `29b9d25` | Ghi ảnh và người cùng giao dịch. Tổng quát hóa helper transaction của #3. Backup giữ giá trị record để so ID conflict của #3 vẫn có ý nghĩa. |
| `c4b60a8` | Kiểm union collision ở ghi trực tiếp/gộp người. Dùng helper từ `29b9d25`, kiểm ngày từ `9f93a8f` và luồng merge từ `9dfd93f`. |
| `29a8d34` | Gỡ tham chiếu khi xóa chi, kiểm backup/restore qua validator #3. |
| `8c5b8f6` | Escape HTML PDF và chuyển màu clone sang sRGB trong pipeline hiện có. Giữ kiểm PDF trong bộ nhớ từ #2. |
| `8976199` | Sửa mapper GEDCOM và cảnh báo thay thế. Dùng adapter/preview và write boundary của #3. |
| `8a3d15c` | Regression backup chân dung sau person merge. Cần person merge #2, validator/restore #3 và lifecycle ảnh `29b9d25`. `0eadd00` thêm bàn giao, backlog và mobile note. |

## Trình tự đề xuất sau khi được điều phối duyệt

1. Desktop chạy QA độc lập trên đúng `0eadd00`, lưu kết quả theo ca trong bàn giao M1.2B. Chốt trạng thái từng blocker và xác nhận SHA của `main` cùng ba head ngay trước thao tác. Nếu SHA đổi, so diff và chạy lại phần bị ảnh hưởng. Người điều phối duyệt từng PR trước khi chuyển sang Ready for review. Xác nhận lại approvals và checks trên đúng base/head trước mỗi lần merge.
2. Dùng **merge commit giữ ancestry** cho chuỗi này. Tích hợp #2 vào `main` trước. Sau đó xác minh head #2 đã nằm trong ancestry của `main`, rồi retarget #3 sang `main`. Giữ nhánh #2 để tránh đổi base tự động phía GitHub trong lúc kiểm tra.
3. Sau retarget #3, đối chiếu Files changed với `6e2ba3c..43d9b02`. Kỳ vọng chỉ thấy phần Atomic Import và handoff của nó. Mốc kiểm thử của #2 là 103 test và của #3 là 145 test. Nếu `main` có thay đổi khác, kiểm diff và test trên candidate tích hợp thực tế. Chỉ xem xét tích hợp #3 sau khi diff riêng và checks đạt.
4. Sau #3, xác minh head #3 nằm trong ancestry của `main`, retarget #5 sang `main` và đối chiếu Files changed với `43d9b02..0eadd00`. Giữ nhánh #3 qua bước này. Kiểm lại toàn bộ 194 ca hoặc baseline kế nhiệm có giải thích, lint/build và ca Windows. Cập nhật review/checks theo base mới.
5. Nếu parent đã được squash hoặc rebase khi merge, SHA gốc có thể không nằm trong ancestry và diff con có thể hiển thị lại commit parent. Dừng retarget kế tiếp, dùng so sánh tree/patch để xác định nội dung tương đương và đưa cách giữ diff riêng cho điều phối duyệt. Nếu mergeability khác kết quả hiện tại hoặc thấy diff parent tái xuất hiện, đưa PR về review trước khi tiếp tục. Giữ nhánh và SHA QA cho đến khi chuỗi được xác nhận.

Các kiểm tra đọc lại tại mỗi bước gồm `gh pr view <PR> --json baseRefName,headRefOid,mergeStateStatus,files`, `git merge-base --is-ancestor <head-parent> origin/main` và `git diff --name-status origin/main...<head-con>` sau khi lấy refs mới. Không chạy thao tác thay base hoặc merge trong đợt chuẩn bị này.

## Tệp giao nhau và rủi ro UI Foundation

Giao nhau đã xác nhận trong stack:

- Cả #2/#3/#5 chạm `src/database/db.ts` và `src/context/GenealogyContext.tsx`. Khi giải conflict, giữ transaction atomic, lỗi/abort về đúng caller và refresh sau commit.
- #2/#5 cùng chạm `DuplicateMergeModal.tsx`, `duplicateMergeService.ts`, `validationService.ts` và hai suite PDF. Giữ review thủ công, kiểm union ở write boundary và test PDF không ghi artifact tracked.
- #3/#5 cùng chạm `DataManagementPage.tsx`, `gedcomService.ts`, `importValidationService.ts` và `jsonBackupService.ts`. Giữ bước preview/cảnh báo, validate lại khi ghi, chính sách ID conflict và các trường lịch sử v1.

Danh sách PR/nhánh ngày 26/11 chỉ có #1–#5, trong đó #4 là Desktop audit. **UI Foundation PR chưa xuất hiện**, nên chưa có giao tệp thực tế hoặc kết luận independent review. Các điểm dưới đây là phạm vi đối chiếu dự kiến theo audit Desktop:

| Vùng kiểm | Tệp và rủi ro |
|---|---|
| Dialog/focus và ghi đang chạy | `ConfirmDialog.tsx` từ #3 cùng `DataManagementPage.tsx`, `DuplicateMergeModal.tsx`, `RelationshipEditorModal.tsx`, `PersonFormModal.tsx`, `GalleryPage.tsx` từ core. Escape, close, backdrop và double-click phải tuân theo trạng thái đang ghi. Sau thành công/lỗi phải trả focus và giữ thông báo đúng. |
| Chủ đề/nav và PDF | `AppShell.tsx`, `src/index.css`, `src/main.tsx` là điểm nhạy cảm UI, chưa có diff core chồng trực tiếp ở ba tệp này. Nếu modal/report sửa lớp màu hoặc bố cục, so `PersonProfileView.tsx`, `PersonReportModal.tsx` và pipeline capture clone của #5. |
| Vòng đời dữ liệu/thành phần | Nếu thay đổi mount/provider, đối chiếu `GenealogyContext.tsx` và `db.ts` rồi thử reload, dữ liệu trước/sau, lỗi commit và refresh sau thành công. Nếu chế độ route/import động thay đổi, kiểm deep-link và tải lại ngoài mạng. |
| Web/PWA boundary | Nếu diff chạm entry, assets, cache hay dependency client, kiểm giữ schema v1, chuyển dịch vụ Node ở server, bundle client không có Node API và precache đủ chunk. |

Khi UI Foundation xuất hiện, lấy **base, head và danh sách file thực tế** từ PR, rồi đối chiếu cả giao file lẫn component dùng chung. Ghi phát hiện theo file/dòng, bước tái hiện bằng dữ liệu tổng hợp và mức chặn. Review lần lượt luồng tính năng cũ, IndexedDB khi reload, modal busy/rollback, version/schema, Node API trong client, keyboard/label/focus/contrast và PWA warm/cold offline. Dùng checklist thiết bị thực ở [Mobile release gate](MOBILE_RELEASE_GATE.md). Nguồn phạm vi UI dự kiến nằm trong [Desktop remediation backlog](https://github.com/minhquanle3900/gia-pha/blob/0577071fdb458f19e3231e6561b271b3dd858db4/docs/audit/desktop/07_REMEDIATION_BACKLOG.md).

## Baseline và rollback

- **Regression tại `0eadd00`** · 194/194 test trong 18 tệp, TypeScript lint và Vite/Workbox build đạt. Kiểm lại ở worktree detached sạch, Linux x86_64, Node 24.22.3/npm 11.19.1 và bộ dependency đã cài theo `bun.lock`. Lệnh `npm test`, `npm run lint`, `npm run build`. `git status --porcelain=v1 --untracked-files=all` rỗng và `git diff --exit-code HEAD -- '*.pdf'` đạt. Cảnh báo chunk và dynamic import vẫn xuất hiện. Baseline 194 là chuẩn ở candidate đủ chuỗi. Từng stage dùng checks tương ứng và lần cuối kiểm lại candidate kết hợp. [Bàn giao M1.2B](M1_2B_CLOUD_TO_DESKTOP.md).
- **Trước tích hợp** · giữ Draft, lưu SHA và kết quả QA. Phát hiện blocker thì giữ gate và xử lý theo quyết định điều phối. Khi thay đổi đã commit vào `main`, ưu tiên commit revert công khai sau phê duyệt, từ phụ thuộc cuối về đầu. Với merge commit dùng `git revert -m 1 <merge-commit>` khi xác nhận parent 1 là `main` trước merge. `c4b60a8` cần lùi trước helper ở `29b9d25` hoặc validator ngày ở `9f93a8f`. Lùi test `8a3d15c` trước các implementation mà nó phụ thuộc. Chạy lại phù hợp với candidate rollback.
- **Dữ liệu đã commit** · revert code giữ lịch sử Git. Khôi phục trạng thái người/ảnh/chi đã ghi dùng JSON v1 trước thao tác. Xác thực file, phục hồi thử vào profile riêng và đối chiếu ID, count, liên kết và media trước khi PO quyết định dùng trên kho thật. Lỗi giữa giao dịch tự abort. Rollback revision giữ nguyên schema v1. Quay về mã cũ có thể đưa trở lại lỗi đã sửa.
