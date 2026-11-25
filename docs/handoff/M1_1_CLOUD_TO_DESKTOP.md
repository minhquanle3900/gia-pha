# M1.1 Cloud → Desktop

- Base SHA `1cec38dc77ea46260fa0608c931b22e0b508d531`. Remote `main` trùng baseline khi tạo nhánh.
- Head SHA của phần code để QA `9dfd93f75ec17cf74c64b1d8c266901a292104ba`. Commit kế tiếp bổ sung tài liệu bàn giao. Head của Draft PR bao gồm cả hai commit.
- Audit tham chiếu `b2b707de6c3ff2207cfbb08f3b93b259460618db`, Draft PR #1.
- Nhánh `fix/m1-cloud-atomic-merge`. Phạm vi GP-CLOUD-001, GP-CLOUD-002 và GP-CLOUD-012.

## Hành vi trước và sau

| Issue | Trước | Sau |
|---|---|---|
| GP-CLOUD-001 | Modal bỏ qua danh sách LifeEvent cần chuyển. Xóa nguồn làm mất các mốc đó. | Giữ ID và nội dung từng mốc, chuyển `personId` sang đích. Gộp cũng chuyển liên kết media, story, hôn phối, cha mẹ/con cái, founder và root. |
| GP-CLOUD-002 | Modal ra quyết định từ snapshot UI và ghi nhiều giao dịch riêng. Một lỗi có thể để lại dữ liệu đã ghi từng phần. | UI gửi hai ID. Adapter đọc dữ liệu hiện hành, lên kế hoạch và ghi trong cùng một giao dịch IndexedDB. Xóa nguồn ở cuối, chỉ refresh Context sau `tx.done`. Modal báo lỗi và khóa thao tác trong lúc chờ. |
| GP-CLOUD-012 | Hai test PDF ghi artifact vào repository. | jsPDF vẫn chạy tới lúc tạo buffer. Test chặn ghi đĩa tại `writeFileSync` và kiểm tên tệp, header PDF và dấu kết thúc. |

Khi hai liên kết cha mẹ/con cái trùng sau gộp, giữ ID của liên kết đã có ở hồ sơ đích và hợp nhất phần metadata tương thích. Từ chối giao dịch nếu thông tin loại quan hệ, hôn phối hoặc thứ tự sinh mâu thuẫn, nếu có quan hệ/hôn phối với chính mình, hoặc nếu đồ thị có vòng qua người được giữ lại. Hôn phối hợp lệ vẫn giữ ID, kể cả union chỉ có một người. Chi chính của đích được ưu tiên, chi chính còn lại của nguồn được lưu trong các chi phụ. Ảnh đã chọn ở đích được ưu tiên và ảnh nguồn có ID media vẫn liên kết với người đích. `FamilyStory.recordedBy` là nhãn văn bản do người dùng nhập. Trường ID người của FamilyStory là `personIds`.

## Tệp đã sửa

| Tệp | Thay đổi |
|---|---|
| `src/database/db.ts` | Điểm ghi cho merge, transaction 8 store và xử lý abort. |
| `src/services/duplicateMergeService.ts` | Kế hoạch giữ tham chiếu, hợp nhất cạnh trùng và từ chối xung đột. |
| `src/services/validationService.ts` | Dùng chung truy vấn đồ thị để kiểm vòng qua hồ sơ được giữ lại. |
| `src/context/GenealogyContext.tsx` | Phơi bày thao tác merge và tải lại sau commit. |
| `src/features/people/DuplicateMergeModal.tsx` | Gửi ID, khóa thao tác khi đang gộp và hiển thị lỗi. |
| `src/__tests__/atomicPersonMerge.test.ts` | 24 ca trên IndexedDB giả lập, gồm hồi quy, liên kết, tranh chấp, lỗi và retry. |
| `src/__tests__/familyBookPdf.test.ts` | Xác minh byte và tên file sách phả trong bộ nhớ. |
| `src/__tests__/personReport.test.ts` | Xác minh byte và tên file PDF cá nhân trong bộ nhớ. |
| `docs/handoff/M1_1_CLOUD_TO_DESKTOP.md` | Bàn giao, bằng chứng và hướng dẫn rollback. |

## Ca Desktop cần chạy

Dùng Windows với Chrome và Edge, profile thử nghiệm riêng và dữ liệu tổng hợp. Xuất JSON trước khi thử gộp. Ghi SHA, phiên bản trình duyệt, bước, expected/actual và ảnh trước/sau cho từng ca.

| Ca | Thao tác | Kết quả mong đợi |
|---|---|---|
| M11-D01 · GP-CLOUD-001 | Tạo hai hồ sơ trùng tên/năm, thêm hai mốc vào nguồn và một mốc vào đích. Chọn đích trong modal gộp, tải lại rồi xem hồ sơ và niên biểu. | Hiện thông báo thành công. Đích giữ cả ba mốc với ID cũ và nguồn biến mất. |
| M11-D02 · GP-CLOUD-002 | Gắn ảnh và kỷ vật, story tham chiếu cả đích và nguồn, đặt nguồn làm gốc và người sáng lập chi. Gộp và đối chiếu JSON cùng UI. | Ảnh, kỷ vật, story, root và founder đều còn, trỏ sang đích. Mỗi danh sách người chỉ chứa đích một lần. |
| M11-D03 · GP-CLOUD-002 | Tạo cây ba đời có hôn phối thứ nhất và thứ hai, con sinh học và con riêng, cho hai hồ sơ trùng một cạnh tương thích. Gộp rồi xem từ cả phía người phối ngẫu và con. | Giữ các hôn phối và loại quan hệ, chỉ còn một cạnh cho cặp trùng. Cây và hồ sơ vẫn hiển thị đúng. |
| M11-D04 · GP-CLOUD-002 | Thử gộp hai người nằm trên cùng đường tổ tiên trực tiếp hoặc cách nhau một thế hệ. Thử riêng hai người đang có hôn phối với nhau. | Modal báo lỗi, người nguồn và đích cùng mọi liên kết giữ nguyên sau tải lại. |
| M11-D05 · GP-CLOUD-002 | Mở modal ở tab A. Trong tab B cùng origin, sửa dữ liệu hồ sơ đích và thêm một mốc cho nguồn rồi lưu. Thực hiện gộp ở tab A, thử bấm liên tiếp. | Đích giữ sửa đổi mới và nhận mốc mới. Thông báo thành công ổn định, không tạo lần ghi thứ hai; kiểm lại cả hai tab sau reload. |
| M11-D06 · GP-CLOUD-002 | Với fixture riêng, xóa thành viên bằng nút Xóa thông thường. | Giữ hành vi cascade baseline: mất mốc của người bị xóa, gỡ tham chiếu story/media, xóa root/founder tương ứng. |
| M11-D07 · GP-CLOUD-012 | Xuất PDF cá nhân và sách phả từ UI. Xem file tải xuống và thư mục repository sau khi chạy hai suite. | PDF mở được, có chữ tiếng Việt, đúng loại tài liệu. Git sạch sau test; hai PDF mẫu giữ nguyên. |

Rủi ro hồi quy cần chú ý là đồ thị lớn và kho media nhiều byte kéo dài trạng thái chờ, cách xử lý cạnh mâu thuẫn, và độ tương thích của PDF khi trình duyệt đi qua pipeline canvas. Các lỗi chèn trong test Cloud dùng IndexedDB giả lập. UI/IndexedDB của Windows còn chờ Desktop xác minh.

## Kiểm thử Cloud

Linux x86_64, Node 24.22.3, npm 11.19.1, Bun 1.4.5, Vitest 5.1.0. Dependency dùng bộ cài theo `bun.lock` đã có từ baseline M0. Lệnh cài lại ở checkout mới là `npm exec --yes --package=bun -- bun install --frozen-lockfile`.

| Exact command | Exit | Kết quả |
|---|---:|---|
| `npm test -- src/__tests__/atomicPersonMerge.test.ts` trước fix | 1 | RED, 1/1 fail đúng assertion. Chỉ còn `event-c`; mong đợi cả `event-a`, `event-b` và `event-c` cùng trỏ đích. |
| `npm test -- src/__tests__/atomicPersonMerge.test.ts` sau fix đầu tiên | 0 | GREEN, 1/1 pass với cùng assertion. |
| `npm test` | 0 | 103/103 test trong 10 tệp. 79 test baseline và 24 ca M1.1. |
| `npm run lint` | 0 | TypeScript PASS. |
| `npm run build` | 0 | Vite build và Workbox PASS, còn cảnh báo chunk và dynamic import từ baseline. |
| `npm test -- src/__tests__/familyBookPdf.test.ts src/__tests__/personReport.test.ts` | 0 | 8/8 PASS trên commit code. |
| `git status --porcelain=v1 --untracked-files=all` | 0 | Không có output trước/sau khi chạy hai suite PDF. |
| `git diff --exit-code HEAD -- '*.pdf'` | 0 | Hai artifact tracked giữ nguyên. |

RED chạy trước khi triển khai fix. Để tái hiện trên checkout tạm của base, chép test từ head code và thêm hàm adapter tạm vào cuối `src/database/db.ts` như bên dưới. Fixture RED có LifeEvent và không có cạnh/union/media, nên với fixture này hai thao tác ghi bên dưới chính là trình tự của modal baseline. Chạy `npm test -- src/__tests__/atomicPersonMerge.test.ts -t GP-CLOUD-001` khi checkout có toàn bộ 24 ca. Adapter tạm chỉ phục vụ RED.

```ts
export async function mergePersonRecords(targetId: string, sourceId: string): Promise<void> {
  const snapshot = await loadFullSnapshot();
  const { executeMergeRecords } = await import('../services/duplicateMergeService');
  const plan = executeMergeRecords({
    ...snapshot,
    targetPerson: snapshot.people.find((person) => person.id === targetId)!,
    sourcePerson: snapshot.people.find((person) => person.id === sourceId)!,
  });
  await savePersonRecord(plan.mergedPerson);
  await deletePersonSafely(plan.deletedPersonId);
}
```

Rollback đã kiểm 5 tình huống. Lỗi request bất đồng bộ tại `people`, `lifeEvents` và `settings` giữ nguyên snapshot và retry thành công. Lỗi đồng bộ tại lệnh xóa và abort sau khi request xóa đã báo success cũng giữ nguyên mọi store. So sánh chỉ bỏ `exportedAt` do hàm đọc tạo mới, giữ nguyên timestamp của record.

## Rollback

Một merge thất bại tự rollback qua IndexedDB. Nếu cần quay lại code trong QA, checkout base trong worktree riêng hoặc revert commit implementation trên nhánh tích hợp. Schema v1 dùng được ở cả hai revision. Revert code không hoàn tác merge đã commit. Để phục hồi dữ liệu thử sau merge thành công, restore bản JSON chụp ngay trước ca đó vào profile thử nghiệm và đối chiếu số lượng bản ghi.

## App Factory · Atomic Entity Merge Pattern

Client gửi ID nguồn/đích. Write boundary mở transaction bao phủ các store có liên kết, đọc trạng thái hiện hành, lập kế hoạch thuần và xác thực đồ thị kết quả. Giữ ID đích, chuyển các tham chiếu có ý nghĩa, hợp nhất liên kết tương thích và xóa nguồn ở cuối. Với lỗi đồng bộ hoặc lỗi request, chờ transaction rollback trước khi báo lỗi. Chỉ refresh UI sau commit. Kiểm bằng snapshot trước/sau, lỗi sớm/giữa/muộn và retry. Có thể dùng lại trình tự này cho ứng dụng local-first có nhiều record liên kết. Chính sách chọn trường và xử lý xung đột thuộc về từng domain.
