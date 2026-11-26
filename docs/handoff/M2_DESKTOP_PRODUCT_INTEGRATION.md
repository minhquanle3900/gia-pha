# M2 Desktop Product Integration

**Integration Gate: BLOCKED. Draft review only; không merge main/deploy.**

## Revision và tích hợp

- Branch/worktree: `feat/m2-desktop-product-integration`, `.worktrees/m2-desktop-product-integration`.
- Base PR #8: `cf009fcc26f4c9ef5ba7a14a69daba2984af94f9`.
- Merge PR #7 `6ffcba5908c0d64800c2c94cb46241d14d186e1f` → `85bb260`; merge PR #9 `41f3b264521c201d6863236304478edb4b054e01` → `0f885e742f18d2b6d9a179f8f3649b25a5906489`.
- Code HEAD / final CLI tested SHA: **`c739bd8a7bca1d8267ffe43eadbaf4ea08bd4629`**. Native DB, PDF và production-offline build được chạy tại `211a85d25a491be1cf8317fd85cba853f1437888`; commit kế tiếp chỉ điều chỉnh toolbar cây/pointer. Kiểm lại layout cây cuối tại `c739bd8`.
- PR #2/#3/#5/#6 đã là ancestry của #8; không cherry-pick lại. Tất cả pin #2/#3/#5/#6/#7/#8/#9 là ancestry của HEAD. Nhánh nguồn PR #9 vẫn ở `41f3b264…`. [Git proof](m2-desktop/evidence/delivery-git.json).
- Conflict duy nhất: `UpcomingAnniversariesWidget.tsx`. Giữ logic, filter, layout và modal Cloud; giữ class scope Desktop và nhãn “Chi họ” gắn với select. `GalleryPage` giữ nguyên `onNavigate` và `onSelectPerson` từ `App.tsx`.

## Phần đã hoàn thành

Một cấu hình navigation dùng chung: mobile bottom bar, desktop sidebar từ 1024px. Di sản mở thẳng Phòng trưng bày; kho kỷ vật, nhật ký và sách vẫn có lối vào riêng. Đã mở đủ 10 trang cũ và Hall trong runtime. Đây là kiểm chứng đường vào/layout, không chứng nhận lại toàn bộ nghiệp vụ 33 chức năng.

| Nhóm | Các entry point được bảo toàn theo [33-feature inventory M1](MOBILE_READINESS_PLAN.md) |
|---|---|
| Trang chủ | F01, F13, F15, F24, F32, F33; shortcut vào cây/thành viên/kỷ vật |
| Gia phả | F02–F11, F19, F20, F27, F28 qua cây, danh sách, hồ sơ, form, quan hệ và tra vai vế |
| Di sản | Hall mới; F12, F14, F18; liên kết hồ sơ và nội dung nghi lễ |
| Lễ giỗ | F15, F33 |
| Thêm / header | F16, F17, F21–F26, F29–F32; dữ liệu/chi họ F09, lọc trùng F11. PWA status vẫn ở header |

Cây dùng fullscreen native, có viewport fallback khi API không khả dụng; thoát trước khi mở profile/form/quan hệ bên ngoài canvas. Bộ lọc thu gọn trên mobile; node có đường Enter/Space; toolbar/zoom dock đạt 44px ở 320px và không bị sheet hồ sơ che. Giữ D3 pan/zoom hiện có; bổ sung pinch có giới hạn cho quạt, giữ zoom buttons và xuất SVG. Danh sách/hồ sơ dùng lại component, thêm đường mở hồ sơ bằng button và toolbar co dòng. Không sửa thuật toán phả hệ/schema/DB/import-export/PDF/PersonForm/RelationshipEditor.

13 source files của Desktop: App, AppShell, navigation config, Gallery entry adapter; FamilyTreePage/FanChartLayout/viewportGesture; MembersPage/PersonProfileView; useWorkspaceFullscreen/useModalAccessibility; index.css; navigationReadiness.test. [Danh sách đầy đủ, gồm phần kế thừa #7/#9](m2-desktop/evidence/delivery-git.json).

## Kết quả kiểm thử

| Kiểm tra | Kết quả / phạm vi bằng chứng |
|---|---|
| Windows, frozen Bun 1.4.5 / bun.lock | PASS; lockfile/dependency/schema không đổi. Sandbox chặn esbuild spawn EPERM; chạy lại cùng lệnh ngoài sandbox thành công |
| Baseline trước phát triển | PASS lint/build, **221/221**. PWA checker lần đầu thiếu preview ở 4173: ECONNREFUSED, không phải PASS. [Logs](m2-desktop/evidence/baseline/results.json) |
| Final tại c739bd8 | PASS lint/build, **225/225**, PWA manifest/icons/SW HTTP checker ở 3231. Bốn test mới kiểm reachability/Hall và pinch bounds. [Logs](m2-desktop/evidence/final/results.json) |
| Responsive toàn app | PASS đo page overflow trong 176 mẫu: 10 trang + Hall + profile, 8 widths, 2 themes; thêm 48 mẫu landscape 844×390/926×430. `scrollWidth <= clientWidth + 1`. [Portrait](m2-desktop/evidence/responsive.json), [landscape](m2-desktop/evidence/landscape.json), [final tree](m2-desktop/evidence/final-tree-layout.json) |
| Touch/accessibility | PASS geometry mới: bottom nav ≥54×57px, cây ≥44×44px ở 320px. More: Tab từ nút cuối về nút đóng, Escape đóng và trả focus. Native tree fullscreen/Escape trả focus; Hall native dialog/Escape trả focus. [Targets](m2-desktop/evidence/narrow-controls.json). SKIP thao tác đa chạm thật |
| Contrast | PASS 6 mẫu token navigation/text/focus, 6.29–12.30:1. Không tuyên bố WCAG AA toàn app. [Math](m2-desktop/evidence/contrast-tokens.json) |
| Hall | PASS Di sản → Hall → kho; callback sang Nhật ký và hồ sơ; native artwork dialog. Không thay logic/media của Hall |
| PWA/offline | PASS có phạm vi: dừng PID preview, curl exit 7; save PNG + create/read/update/delete người mẫu, reload và tab mới vẫn mở shell. 31 người/5 media → 32/6 → 31/6; ảnh cũ giữ trong kho theo thiết kế. Người/quan hệ/mốc/story/chi gốc không đổi. Không đổi OS network; chưa là airplane-mode hay standalone cold-process test. [Snapshots](m2-desktop/evidence/offline-results.json) |
| JSON / CSV / GEDCOM | PASS UI own-backup no-op; restore đủ bản ghi; ngày lịch sử giữ nguyên/cảnh báo, ngày sai bị chặn; duplicate khác đời được cảnh báo, thoát không merge; GEDCOM UI cảnh báo mất dữ liệu rồi restore giữ 40 cạnh/12 union, semantic edges bằng bản gốc. Cuối cùng JSON trả lại đủ 8 stores. [Proof](m2-desktop/evidence/product-import-results.json) |
| PDF | FAIL chất lượng: tải được cả direct, modal và sách; Poppler mở được, nhưng có lỗi bên dưới. Không sửa Cloud services. [Files/renders](m2-desktop/evidence/exports/pdf-results.json) |

Runtime dùng IAB Chromium 156 trên Windows, origin QA riêng 3230/3231 và 127.0.0.1:3230; chỉ fixture tổng hợp M0/demo. Chrome provider trả `Browser is not available: chrome`; Edge không có trong browser inventory. Không dùng profile cá nhân thay profile QA và không tắt Windows URL safety. Safari iOS/Chrome Android thật, notch/safe-area thật, bàn phím mềm, installed standalone và gesture OS: **SKIP**, chưa có thiết bị. Safe-area CSS/manifest có trong build; không suy ra đã đạt iPhone thực.

## Independent M1.2B verification

[Native evidence](m2-desktop/evidence/m12b-native.json) gọi adapter thật với IndexedDB của Chromium; tách khỏi product UI và fake-indexeddb regression.

| Case / Cloud issue | Đã chứng minh | Chưa chứng nhận |
|---|---|---|
| D01 · GP-CLOUD-004 / GP-REV-001 | PASS native duplicate race: 1 fulfilled/1 rejected; dated remarriage giữ 2 union; merge xung đột rollback snapshot | SKIP hai tab product UI, repeat-tap/busy trên Chrome/Edge stable; native race hiện là hai request trong một page |
| D02 · GP-CLOUD-007 | PASS UI PNG 849×1200: Cancel không ghi record; thử lại/save offline tạo ID/URL hai chiều. Thay chân dung tạo đúng một media mới, giữ nguyên cả 5 media cũ. PASS native chặn xóa media đang được profile/story tham chiếu. [Replacement](m2-desktop/evidence/portrait-replacement.json) | Camera và thiết bị thật SKIP; native assertion không chứng nhận mọi modal guard |
| D03 · GP-REV-004/005 | PASS native merge/own JSON no-op/restore/xóa chi có chi con, media/story còn nguyên; root chuyển đúng target. PASS product JSON round-trip | Tab/profile thiết bị thật SKIP |
| D04 · GP-REV-006 | PASS UI xác nhận warning precision thiếu ngày, export giữ nguyên cả ngày văn bản; ngày 30/02/1900 bị chặn | Chưa chứng nhận UI mọi tổ hợp lịch |
| D05 | FAIL direct PDF dark ở 1366 và modal PDF dark ở 390; tải sách 7 trang thành công, bìa render đọc được | Safari/Android/Chrome-Edge stable SKIP; không nhận PASS đầy đủ từ file tải thành công |
| D06 · GP-DESK-005 | PASS native + UI 40→40 cạnh, 12 union, cùng semantic edges; đọc cảnh báo loss; JSON phục hồi đủ stores | Thiết bị thật SKIP |
| D07 · GP-DESK-006 | PASS CSV UI cùng tên/năm 1872, đời 1/2; đúng 1 cặp và lý do “Khác đời”; thoát giữ 32 người | Không auto-merge; không suy ra mọi thuật toán tìm trùng đã được QA UI |

Native run đầu có D03 FAIL do comparator so cả `settings.lastBackupAt` được serializer chủ động tạo. Giữ [log đầu](m2-desktop/evidence/m12b-native-initial.json); sau xác minh chỉ loại `exportedAt` và `lastBackupAt` khỏi so sánh, toàn bộ record vẫn so nguyên giá trị. Không che lỗi sản phẩm bằng sửa data/core.

## Blockers và bàn giao Cloud

| ID | Reproduction / actual | Owner, acceptance criteria |
|---|---|---|
| GP-DESK-M2-001 · P1 | Dark, 1366×900, profile Trần Văn Lộc → Khác → PDF trực tiếp. Bảng phối ngẫu/con có chữ gần trắng trên nền trắng. [Render](m2-desktop/evidence/exports/person-direct.png) | Cloud PDF: print palette độc lập theme, tên người và bảng đọc rõ; kiểm cả hai entry point |
| GP-DESK-M2-002 · P1 | Dark, 390×844, In phả ký cá nhân → Tải PDF. File A4 15 trang, chữ bìa phóng lớn/cắt trang. [Render](m2-desktop/evidence/exports/person-modal.png) | Cloud PDF: export layout ổn định theo khổ in, không dùng chiều rộng màn hình hẹp để scale toàn bản; render mọi trang và so desktop/mobile |
| GP-DESK-M2-003 · P1 | Sửa tên nháp → Hủy: mất nháp không confirm; Escape không đóng. Từ tree fullscreen mở Quan hệ: native fullscreen thoát đúng, modal hiện nhưng focus vẫn ngoài dialog. [Form](m2-desktop/screenshots/cloud-form-dirty-390-dark.jpg), [relationship](m2-desktop/screenshots/cloud-relationship-from-fullscreen-320.jpg) | Cloud: bàn giao rõ busy/dirty lifecycle; focus initial/trap/restore; Escape khi an toàn, chặn close trong transaction, confirm discard. Chưa bulk áp hook vào Cloud modal |

Automatic approval review đã từ chối thao tác tự động gắn label hàng loạt vào `PersonFormModal.tsx` vì Cloud ownership/lifecycle chưa bàn giao. Đã hoàn nguyên mọi sửa đổi chưa commit ở file này, diff cuối bằng 0; chuyển yêu cầu cho Cloud, không đổi cách thao tác để vượt chặn.

Calligraphy: fetch thấy `feat/m2-cloud-vietnamese-calligraphy` ở `f0fafa2c1aaf479bb99db173a9b049ab2f597055`. Đọc `M2_3_CALLIGRAPHY_SYSTEM.md` bằng git show, chưa ghép thêm ngoài các pin coordinator. Có sẵn `data-calligraphy-slot` brand/clan-name/tree-title; branch-title dùng vị trí Bảng chi và memorial dùng Hall chân dung do Cloud sở hữu. Khi ghép M2.3, dùng `.heritage-display/.heritage-heading/.heritage-brush` hiện có theo handoff; menu/form/bảng giữ UI font. Không tải font/tạo system khác. Handoff Cloud vẫn BLOCKED brush Quốc ngữ và chờ PO xác nhận dị bản.

## Evidence, rollback, NEXT_TASK

- Paired fixture demo: [before tree 390](m2-desktop/screenshots/before-tree-390-light.jpg) / [after](m2-desktop/screenshots/after-tree-390-light.jpg); [before 1366](m2-desktop/screenshots/before-tree-1366-light.jpg) / [after](m2-desktop/screenshots/after-tree-1366-light.jpg). Thêm dark/fullscreen/fan/Cloud-risk screenshots trong cùng thư mục; không lặp bộ 43 ảnh M0.
- Tên ảnh ghi CSS viewport, không phải số pixel raster. IAB có thể bỏ gutter/scale ảnh capture; lưu cả [logical frames](m2-desktop/evidence/paired-baseline-frames.json) và [raster dimensions](m2-desktop/evidence/screenshot-dimensions.json). Before chụp lại từ detached baseline 0f885e7 sau khi phát hiện ảnh chuyển viewport/theme chưa ổn định; không dùng ảnh sai nhãn làm bằng chứng.
- Revert riêng Desktop theo thứ tự `c739bd8`, `211a85d`, `1b8d187`; giữ hai merge commit nếu chỉ rollback UI. Nếu rollback toàn integration, tạo worktree mới từ pin PR #8. Không cần migration. Dữ liệu QA có bản JSON gốc để restore; không áp restore vào profile người dùng.
- Delivery Gate: navigation/reachability/layout scoped PASS; product completeness và resilience **FAIL/BLOCKED** vì modal/PDF/real-device gaps. Heritage palette/components được giữ; không có font/asset mới từ Desktop.
- **NEXT_TASK:** Cloud review Draft PR và xử lý GP-DESK-M2-001..003; thống nhất pin M2.3 trước khi ghép; chạy lại các ca fail và hai-tab/busy trên browser QA stable, Safari/Android thực. Coordinator quyết định Integration Gate. Dừng tại đây.
