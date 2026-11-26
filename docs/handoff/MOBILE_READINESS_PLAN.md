# Mobile Readiness Plan

Ngày: 26/11/2026 (Asia/Saigon). Hướng sản phẩm: **Mobile First · Desktop Enhanced · Shared Core · Offline First**.

Đây là kế hoạch kiểm chứng và ma trận coverage, không phải chứng nhận sẵn sàng phát hành. **Integration Gate chưa được thông qua**. Không triển khai M2, Capacitor, codebase mobile riêng hoặc production trong phạm vi tài liệu này.

## Revision và phạm vi

| Mốc | SHA / bằng chứng |
|---|---|
| M0 source baseline | `1cec38dc77ea46260fa0608c931b22e0b508d531` |
| M0 Desktop audit đã được coordinator chấp nhận | `0577071fdb458f19e3231e6561b271b3dd858db4`, PR #4 |
| Independent QA PR #2 | `6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e`; [M1.1 review](../qa/m1-desktop/M1_1_INDEPENDENT_REVIEW.md) |
| Independent QA PR #3, đồng thời base UI | `43d9b0271c9f2fdb53f419b2fd507a7a6dd80748`; [M1.2A review](../qa/m1-desktop/M1_2A_INDEPENDENT_REVIEW.md) |
| Nhánh UI riêng | `fix/m1-desktop-ui-foundation` |
| Mốc implementation khi lập kế hoạch | `0e51835552741a81ed69d31080d900bf7cc726f0`; SHA được kiểm runtime và head bàn giao cuối cùng phải lấy từ [UI Foundation report](../qa/m1-desktop/M1_DESKTOP_UI_FOUNDATION.md) và [Integration Gate](../qa/m1-desktop/CORE_INTEGRATION_GATE.md) |

M1 giữ Heritage Design: forest green `#1B3B2B`, ivory `#FAF7F2`, heritage gold `#C5A059`, bark `#2E241E`. Dùng lại component, token và luồng đang có. M1 chỉ xử lý GP-DESK-001, GP-DESK-003, GP-DESK-004, GP-DESK-007 trong phạm vi được giao. Bốn nhóm lỗi không đồng nghĩa mọi chức năng đã đạt mobile readiness.

Cloud tiếp tục sở hữu DB, import/export, relationship, PersonForm media và PDF services. Dialog/import đang do Cloud sửa cần bàn giao thay vì ghi đè. Dữ liệu và schema IndexedDB giữ nguyên; fixture tổng hợp của M0 được tái sử dụng. Không đưa dữ liệu gia đình thật vào kiểm thử.

## Quy tắc đọc bằng chứng

- **PASS** chỉ dùng khi có thao tác thực tế, expected/actual và artifact gắn với SHA đã chạy. Build thành công không chứng minh UI, touch, offline hay Safari tương thích.
- **SKIP** là chưa thực hiện ở M1. Đây không phải PASS và không tự động là blocker môi trường. PASS trong từng ô chỉ áp dụng cho assertion được nêu và artifact liên kết.
- **BLOCKED** cần nguyên nhân kỹ thuật. Chặn Windows URL verification trước đây được lưu tại [BROWSER_AUTOMATION_BLOCKER.json](../qa/m1-desktop/evidence/BROWSER_AUTOMATION_BLOCKER.json); không được suy ra rằng trình duyệt nhúng cũng bị chặn nếu phiên kết nối sau đó hoạt động.
- **SKIP real**: không có thiết bị iPhone/iPad hoặc Android thật trong môi trường Windows này. Emulation không kiểm chứng WebKit, bàn phím phần mềm, notch thật, gesture OS, camera, download/share sheet, installed PWA hoặc storage eviction.
- Kết quả M0 là lịch sử ở SHA khác. Nguồn cho 33 ID là [M0 Runtime Feature Matrix](https://github.com/minhquanle3900/gia-pha/blob/0577071fdb458f19e3231e6561b271b3dd858db4/docs/audit/desktop/02_RUNTIME_FEATURE_MATRIX.md). Ma trận này ghi nhiều tính năng PARTIAL; không nâng thành PASS M1 bằng việc kế thừa kết luận.
- Kiểm thử CLI PR #2 `103/103` và PR #3 `145/145` được lưu trong [CLI verification](../qa/m1-desktop/evidence/phase-a-cli/CLI_VERIFICATION.md). Các suite dùng `fake-indexeddb`; chúng không thay thế native IndexedDB hoặc click-through trên điện thoại.

## Mobile Readiness Matrix: 33 chức năng

Trong cột Desktop, `M0 partial`, `M0 error`, `M0 unverified` và `M0 sample pass` chỉ tóm tắt bằng chứng lịch sử từ ma trận M0. Các ô SKIP cần test thực tế trước khi nhận mobile readiness. `iOS real` và `Android real` luôn tách khỏi viewport emulation.

| ID | Chức năng | Desktop | Mobile viewport | Touch usability | Offline | iOS real | Android real | Known limitations / cần chứng minh |
|---|---|---|---|---|---|---|---|---|
| F01 | Tổng quan | PASS scoped dashboard/header [runtime](../qa/m1-desktop/evidence/ui-runtime.json) | PASS32 viewport/theme/orientation combinations | PASS44px geometry; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | GP-DESK-001/004; kiểm long clan name, empty/loading, anniversary cards cả hai theme. |
| F02 | Cây hậu duệ/tổ tiên/toàn cảnh/quạt | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 chưa chạy đủ drag/zoom/filter; cần giữ gesture trong vùng cây và không khóa zoom toàn trang. Phần sửa core chuyển Cloud. |
| F03 | Danh sách, tìm/lọc/sắp xếp | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 chưa phủ mọi tổ hợp lọc; bảng lớn phải cuộn riêng, không tạo page overflow. |
| F04 | Hồ sơ cá nhân | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Hồ sơ dài, ảnh, private fields, report, speech còn cần kiểm riêng; không suy ra từ mở thẻ. |
| F05 | CRUD người, ngày linh hoạt, chân dung | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | PersonForm media do Cloud sở hữu; M0 GP-CLOUD-007. Không tự sửa lifecycle/dirty/busy của form này. |
| F06 | Quan hệ cha mẹ/con, chặn cycle | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | RelationshipEditor do Cloud sở hữu; Escape/focus và nhiều tab phải được kiểm cùng write boundary. |
| F07 | Đa hôn phối | M0 unverified; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Cần quan sát từ cả hai người phối ngẫu và con sau reload; CLI graph coverage không chứng minh UI. |
| F08 | Con ruột/nuôi/riêng/chưa rõ | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 chỉ xác minh con ruột và nhìn thấy options; round-trip mỗi loại vẫn cần chứng minh. |
| F09 | Chi họ/phái/đời | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Founder sau merge thuộc M11-D02; CRUD chi và liên kết phụ cần kiểm riêng, không đổi schema. |
| F10 | Tra xưng hô | PASS owned dialog QA; SKIP full semantic matrix | PASS390 dialog/keyboard [runtime](../qa/m1-desktop/evidence/ui-runtime.json) | PASS44px geometry; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | UI có hook/labels/layout mới; semantic mọi quan hệ và voice chưa được chứng nhận bởi M1 UI. |
| F11 | Lọc trùng/gộp hồ sơ | PASS6 native adapter groups; PARTIAL product merge | SKIP M1 mobile merge UI | SKIP repeat tap/busy product | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Ưu tiên độc lập M11-D01..D07; giữ event/story/media/root/founder và chống stale data. Modal do Cloud sở hữu. |
| F12 | Nhật ký dòng họ | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 render 3 story seed; CRUD riêng chưa đủ. Story references trong merge phải giữ đúng ID. |
| F13 | Mốc/lịch sử/niên biểu | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M11-D01 cần cả JSON và UI profile/timeline sau reload; không chỉ kiểm count trong adapter. |
| F14 | Kỷ vật/ảnh/thu âm | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 mic/playback BLOCKED; xin quyền camera/mic là ca riêng, không dùng ảnh gia đình thật. |
| F15 | Giỗ/văn khấn/3 miền/checklist | PASS scoped anniversary widget; SKIP full rites flow | PASS widget reflow in32 combinations | PASS filter44px; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Boundary âm lịch/tháng nhuận và persistence checklist chưa được M0 phủ; ngày hiện hành thay đổi expected. |
| F16 | Thống kê/tuổi thọ/di sản | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Tooltip/drill-down phải có đường tap/keyboard; không mặc định chart responsive khi chỉ container co lại. |
| F17 | Địa danh di cư/Maps | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 là danh sách địa danh/link, chưa chứng minh bản đồ tương tác hoặc external navigation. |
| F18 | Sách gia phả/PDF/HTML/in | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 A4 7 trang tiếng Việt là mẫu lịch sử. Native print/A1/A0/Letter, share sheet và PDF services thuộc Cloud. |
| F19 | PDF cá nhân | M0 error; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M11-D07 cần PDF tải thật, đọc tiếng Việt; Node ASCII buffer test không chứng minh canvas/browser pipeline. |
| F20 | Xuất SVG | M0 sample pass; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 chỉ chứng minh sample nan quạt. Kiểm SVG độc lập, text có dấu và download trên thiết bị thật. |
| F21 | JSON nhập/xuất | PASS populated/empty v1 product round-trip; PARTIAL remaining flows | PARTIAL duplicate-ID alert; SKIP mobile file-picker variants | SKIP real touch/share sheet | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M12A-D01..D04: v1, empty, validation, combined cycle, ID conflict, idempotence và current settings. |
| F22 | CSV mẫu/preview/apply | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Hỗ trợ CSV/TXT, không suy ra XLSX. M12A-D05 cần chi mới, cha hiện có, lỗi tên mơ hồ/năm sai. |
| F23 | GEDCOM 5.5.1 | M0 partial/lossy; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | JSON là full backup. M12A-D06 cần Unicode/xref/TRLR/warnings; không hứa round-trip mọi trường. |
| F24 | Backup/restore/nhắc sao lưu | PASS restore/reload/export at PR3; export timestamp differs as recorded | SKIP mobile backup flow | SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Tải file thật, phục hồi đủ 8 stores; quota/eviction, đổi origin, audio và cold start cần ca riêng. |
| F25 | Tìm kiếm toàn cục/phím tắt | PASS header search containment at5 widths; SKIP full shortcuts | PASS390 dialog keyboard/query retention | PASS native result buttons/44px; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Dialog/result buttons mới cần Tab, Shift+Tab, Escape, focus return, Ctrl/Cmd+K, lọc và Enter. |
| F26 | QR chia sẻ | PASS1366 dialog keyboard; SKIP scan/download semantics | PASS390 dialog focus/labels | PASS44px geometry; SKIP camera/real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 render/clipboard, chưa quét camera/tải ảnh. GP-CLOUD-008 tiếp tục cần Cloud; sửa a11y không chứng nhận payload privacy. |
| F27 | AI tiểu sử Gemini | M0 partial/mock; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP offline inference | SKIP real | SKIP real | Gemini thật chưa chạy; không gửi fixture lên AI trong ca mobile mặc định. Offline phải báo trạng thái có thể hiểu. |
| F28 | Đọc tiểu sử | M0 unverified; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Voice Việt, giọng tải từ mạng, interruption và audio focus khác nhau theo OS; không hứa TTS offline. |
| F29 | PIN/lá chắn riêng tư | PASS empty form labels/focus; SKIP credential submission | PASS390 plus844×390 footer bounds | PASS measured geometry; SKIP real keyboard/touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Hook/labels/busy/discard guard mới chỉ là implementation. Không suy ra mã hóa DB; credential test cần workflow được phép. |
| F30 | PWA/offline/install | M0 partial; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | M0 missing icon assets và installed cold-offline chưa xác minh. Dev server online không chứng minh offline production build. |
| F31 | Light/dark mode | PASS scoped toggle/layout/contrast samples | PASS32 layout combinations; SKIP other screens AA | PASS toggle pointer; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Đo computed color của chữ thường 4.5:1, chữ lớn 3:1; token math không thay thế composited gradient/opacity. |
| F32 | Onboarding | PASS Tour1366 dialog in2 themes; SKIP all-step flows | PASS320/390/844/1366 dialog bounds in2 themes | PASS44px steps; SKIP real touch | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Dialog focus/scroll/theme mới cần before/after đúng viewport/fixture, cả bước có mở PersonForm. |
| F33 | Thông báo ngày giỗ | M0 unverified; SKIP M1 complete flow | SKIP: M1 viewport flow not executed | SKIP: real touch not tested | SKIP M1 cold offline; historical M0 evidence only | SKIP real | SKIP real | Permission allowed/denied, nền, app đóng và standalone khác nhau theo OS; không chứng nhận push từ controls hiện hữu. |

## Viewport và thiết bị

Kiểm tra tại các width **320, 360, 390, 430, 768, 1024, 1366, 1920 CSS px**. Bộ kích thước dưới đây là cấu hình emulation, không gán tên thiết bị thật. Mỗi cặp A/B hoán đổi width/height để kiểm hai hướng. Các cặp bổ sung không thay thế tám width bắt buộc.

| Width mục tiêu | Viewport A | Viewport B sau xoay | Cần đo |
|---:|---|---|---|
| 320 | 320×568 | 568×320 | Header/CTA, dialog nhỏ, keyboard reachability |
| 360 | 360×800 | 800×360 | Header, drawer, filters, form footer |
| 390 | 390×844 | 844×390 | Fullscreen dialogs, safe-area contract, tree region |
| 430 | 430×932 | 932×430 | Độ dài nhãn và khoảng chạm |
| 768 | 768×1024 | 1024×768 | Tablet reflow, table/tree scroll, navigation breakpoint |
| 1024 | 1024×768 | 768×1024 | Chuyển mobile/desktop nav khi dialog đang mở |
| 1366 | 1366×900 | 900×1366 | Desktop baseline, nhiều actions/header |
| 1920 | 1920×1080 | 1080×1920 | Max-width, focus order, không kéo giãn nội dung quá mức |

Với mỗi viewport/theme, lưu `innerWidth`, `innerHeight`, `documentElement.clientWidth`, `documentElement.scrollWidth`, phần tử vượt biên, target rectangles và screenshot. Page overflow đạt khi `scrollWidth <= clientWidth + 1 CSS px`; cây và bảng có thể cuộn trong wrapper riêng. Ghi riêng phần tràn chủ động của canvas/table, không che bằng `overflow-x:hidden` toàn trang để làm đẹp số đo.

Trên phần tử thay đổi hoặc có rủi ro hồi quy, chụp before/after cùng viewport, theme, fixture và trạng thái. Không lặp toàn bộ 43 ảnh M0. Ảnh baseline phải ghi SHA nguồn, không gắn nhãn before của PR #3 nếu thực tế chụp PR #2 mà chưa kiểm các file liên quan giống nhau.

| Môi trường | Cách ghi kết quả |
|---|---|
| Windows CLI | Lint/build/full regression, log và exit code; không nhận là browser/mobile PASS |
| Trình duyệt nhúng | Ghi engine/user agent nếu quan sát được, origin, viewport, SHA; nhãn **IAB emulation** |
| Chrome/Edge stable Windows | Ghi version và profile riêng; nếu URL safety gate chặn, ghi BLOCKED tại thao tác cụ thể |
| Safari iPhone/iPad thật | **SKIP real** cho đến khi có thiết bị và bằng chứng; Chromium viewport không thay WebKit |
| Chrome Android thật | **SKIP real** cho đến khi có thiết bị và bằng chứng; không suy ra từ Windows Chrome |

## Ca ưu tiên và acceptance criteria

| ID | Ca cần chạy | Acceptance criteria | Owner / bằng chứng cần lưu |
|---|---|---|---|
| MOB-01 | Header, nội dung dài, 8 widths, 2 hướng, light/dark | Không page overflow; mọi action còn đường truy cập; không đổi 10 màn hoặc nhóm điều hướng trong M1 | Desktop; kích thước DOM và before/after |
| MOB-02 | Touch và không hover | Action chính, close, filters và nav ưu tiên >=44×44 CSS px; action không chỉ xuất hiện khi hover; keyboard vẫn tới được | Desktop; rectangles và tap/click log, không gọi mouse click là real touch |
| MOB-03 | Dialog: Tour, PIN, QR, Kinship, mobile search/drawer | Tên dialog có nghĩa; focus vào trong; Tab/Shift+Tab giữ trong dialog trên cùng; Escape đóng khi an toàn; focus về trigger còn tồn tại; không cướp focus của dialog kế tiếp | Desktop; activeElement sequence và screenshot |
| MOB-04 | Form đang nhập/đang ghi | Không mất input chưa lưu âm thầm; không đóng khi đang ghi; lỗi giữ nội dung và cho retry; nút Lưu tiếp cận được khi mở bàn phím | Desktop cho owned modal; Cloud cho PersonForm/Relationship/ConfirmDialog/import. Bàn phím thật SKIP nếu chưa có thiết bị |
| MOB-05 | Cây lớn/bảng rộng | Pan, pinch, tap có chủ đích; không làm page pan/zoom ngoài ý muốn; không tắt zoom toàn document; cuộn nội dung dài bên ngoài vùng cây vẫn được | Cloud core + Desktop QA; gesture/video hoặc event proof thực tế, chưa thử pinch phải giữ SKIP/BLOCKED |
| MOB-06 | Safe-area và standalone | `viewport-fit=cover`, top/left/right/bottom insets không che action; dialog/footer/nav không nằm dưới home indicator/notch; xoay màn không mất đường đóng/Lưu | Desktop layout + Cloud PWA; computed insets emulation tách khỏi ảnh iPhone thật |
| MOB-07 | IndexedDB và offline | Fixture tổng hợp tạo/sửa/import tại origin QA, reload giữ ID/count/references; cold offline dùng production build đã precache; rollback/retry so sánh snapshot; không tự xóa origin khác | Cloud write boundary + Desktop independent QA; JSON trước/sau, revision, reload và offline logs |
| MOB-08 | File và thiết bị | JSON v1 đủ 8 store, CSV/GEDCOM validation đúng; PDF tiếng Việt đọc được; SVG mở độc lập; file picker/download/share/camera được kiểm đúng môi trường | Cloud dịch vụ + Desktop QA; file thật/hash/render, không dùng buffer unit test làm bằng chứng tải file |
| MOB-09 | Người lớn tuổi và accessibility | Nội dung thường AA 4.5:1, chữ lớn 3:1; focus rõ; labels liên kết; báo lỗi bằng text; zoom 200% không mất action; reduced motion được tôn trọng | Desktop; computed contrast, keyboard log, zoom và screenshot |
| MOB-10 | Manifest/install/update/recovery | Manifest và icon trả tài nguyên thật; standalone đúng; offline reload/cold launch/update giữ dữ liệu; thông báo giới hạn online rõ; backup có thể phục hồi fixture | Cloud PWA + Desktop QA; manifest/network/cache observations, installed-device evidence khi có |

Phải thực hiện M11-D01..D07 và M12A-D01..D07 theo handoff Cloud. Các ca adapter harness chỉ chứng minh adapter; trạng thái UI thông báo, locking double tap, hai tab và PDF phải có bằng chứng riêng. Tham chiếu [M1.1 handoff](M1_1_CLOUD_TO_DESKTOP.md) và [M1.2A handoff](M1_2A_CLOUD_TO_DESKTOP.md).

## Offline First và bảo toàn dữ liệu

Ưu tiên thao tác cục bộ trên shared core hiện có. Phân biệt: app shell đã cache, nội dung IndexedDB, media nhúng, media URL ngoài, fonts, AI, Maps, TTS và notifications. Từng loại có phụ thuộc khác nhau; không dùng một lần mở dashboard khi mất server để tuyên bố toàn bộ 33 chức năng offline.

Trước mỗi ca thay thế, xuất backup JSON v1 của fixture tổng hợp. Restore thử ở origin/profile QA riêng và đối chiếu cả 8 stores. Revert code không hoàn tác dữ liệu đã commit; dữ liệu test quay lại bằng backup trước ca. Không dùng `clear site data` ở origin đang có dữ liệu của người dùng. Không sửa version/schema để phục vụ UI.

## Bàn giao và lộ trình M2 chưa triển khai

Đề xuất nghiên cứu bottom navigation **5 nhóm** cho M2: **Tổng quan**, **Cây gia phả**, **Thành viên**, **Sinh hoạt dòng họ** (nhật ký/lễ giỗ), **Tiện ích** (thống kê/kỷ vật/sách/bản đồ/dữ liệu). Đây là phương án phân nhóm để PO/Cloud/Desktop review bằng tác vụ sử dụng, không phải quyết định đổi navigation trong M1. Giữ toàn bộ đường vào hiện có cho tới khi có quyết định M2 và migration/navigation acceptance riêng.

Trước khi duyệt Integration Gate:

1. Chốt tested SHA, base SHA và head SHA trong báo cáo; khóa fixture và đường dẫn evidence.
2. Hoàn tất independent QA hoặc giữ BLOCKED với nguyên nhân kỹ thuật cụ thể và phạm vi ảnh hưởng; không đổi PENDING thành PASS vì code đã tồn tại.
3. Đối chiếu before/after và đo layout/contrast/keyboard cho màn đã thay đổi; ghi lỗi ngoài ownership thành handoff, không ghi đè file Cloud.
4. Các ô thiết bị thật chưa chạy giữ SKIP; xác định người nhận và thiết bị cần cho vòng tiếp theo.
5. Draft PR riêng cho Cloud review; không merge main, deploy, đóng gói Capacitor hoặc tự bắt đầu M2.

Rollback UI dùng revert các commit tương ứng trên nhánh tích hợp sau review, hoặc checkout base ở worktree QA. Schema không thay đổi. Thực hiện smoke lint/build và keyboard/navigation sau rollback; nếu đã sửa dữ liệu fixture trong quá trình QA, khôi phục từ JSON riêng thay vì suy ra code rollback đã khôi phục dữ liệu.

## Evidence reconciled at Integration Gate

Windows source-tested head: 0e51835552741a81ed69d31080d900bf7cc726f0. [Final Windows checks](../qa/m1-desktop/evidence/ui-cli/results.json), [native M11](../qa/m1-desktop/evidence/m11-native-iab.json), [native M12A](../qa/m1-desktop/evidence/m12a-native-iab.json), [product JSON round-trip](../qa/m1-desktop/evidence/pr3-product/roundtrip-result.json).

PASS cells are scoped to the named assertions, not the entire feature. Unexecuted M1 flows are SKIP; stable Chrome/Edge profile acceptance is BLOCKED by URL safety control. IAB origins isolate test data but share a browser profile. No iframe fallback was used. Real iOS/Android, pinch, physical safe-area, software keyboard and installed standalone remain SKIP. See [Integration Gate](../qa/m1-desktop/CORE_INTEGRATION_GATE.md).
