# M2 Desktop · Final Polish & Data Safety

**Desktop scope: PASS. Release / Integration Gate: BLOCKED** pending Cloud P1 integration and the Vietnamese brush aesthetic decision. No merge main/deploy.

## Revisions

- Preserved PR #11: `0eef3667284032a06074718dc1a515fc4d2c7342`; its local and remote branch remain unchanged.
- Separate worktree `.worktrees/m2-desktop-final-polish`, branch `codex/m2-desktop-final-polish`. Draft PR is stacked on PR #11.
- Merged PR #10 `f0fafa2c1aaf479bb99db173a9b049ab2f597055` at `d52a785`, without conflicts. Both pins remain ancestry.
- **Final code / CLI tested SHA: `0f7594bea23cada24754d94aec2b9b7b8191027d`.** Later delivery commits contain documentation/evidence only. Main navigation/responsive/offline evidence was collected across `89f94d9` → `71274ee`; the final one-class dark empty-state correction was verified at `0f7594b`.
- Read [PRIVACY_PLATFORM_PLAN.md at c8f98c3](https://github.com/minhquanle3900/gia-pha/blob/c8f98c3f93ca7287af7ce74581413e2436c6a86e/docs/handoff/PRIVACY_PLATFORM_PLAN.md) without merging the planning branch. Implemented only the local subset authorized by this task. [Integration proof](m2-final-polish/evidence/integration.json).

## Delivered

| Task | Result |
|---|---|
| A · Typography | Existing PR #10 utilities applied to Cội Nguồn brand, clan name, tree title, branch collection title and portrait/memorial room title. Menus, buttons, form inputs and data-safety text retain the UI font. No additional font files, downloads or typography system; font assets/licenses/utilities match PR #10 exactly. |
| B · Local data safety | Independent `src/features/data-safety/` module, entered through **Thêm → Dữ liệu trên thiết bị**. Shows origin usage/quota estimates, unknown/error/retry states, read-only persistence status, ≥80% near-full and ≥95% critical warnings. Reuses existing backup reminder/timestamp service; displays date and time, and routes to existing JSON backup UI. |
| B · User guidance | Explains browser/profile/origin storage, PIN as a partial UI lock rather than encryption, readable JSON and manual transfer between devices. Embedded media versus external/blob links is explained. A recorded timestamp does not claim the downloaded file still exists. |
| C · Navigation | Fixed explicit “Phòng trưng bày” navigation retaining a nested branch collection. The Gallery entry now remounts the Hall on an explicit entry request; Cloud navigation/profile callbacks and media/modal handlers stay intact. [Before](m2-final-polish/evidence/gallery-root-before.txt), [after](m2-final-polish/evidence/gallery-root-after.txt). |
| C · Empty state | Distinguishes an empty genealogy from filters with no matches. Empty member list has a 44px “Thêm thành viên đầu tiên” action using the existing form. The existing filter-reset path remains for populated data. Corrected the empty-message foreground in dark mode; [computed evidence](m2-final-polish/evidence/empty-dark-after.json). |

The storage module reads `navigator.storage.estimate()` / `persisted()` only. It never calls `persist()`, uploads a file, starts a backup, changes schema, or adds account/sync/backend behavior. Backup requires the existing user action. `DataManagementPage`, DB/models/context/services, PIN component and Cloud modal files have no Desktop edits relative to merge `d52a785`; PR #10's own PDF changes are inherited from Cloud, not rewritten here.

## Verification

Windows 10, Node 24.22.1, frozen Bun 1.4.5 install; unchanged `bun.lock` SHA-256 `1aae372dac021d58b958f441316679ec3d21056e74c85ae655059db4bb48f35e`. IAB Chromium 156, disposable local origins 3240/3241 and controlled component preview on 127.0.0.1:3240. Synthetic M0/demo fixtures only.

| Verification | Status and evidence |
|---|---|
| Lint / build / regression | **PASS 245/245 in 21 files**, including the 225 baseline and 20 storage tests. Final source diff against tested HEAD is empty. [CLI](m2-final-polish/evidence/cli/results.json). |
| Storage thresholds / failures | **PASS** unit cases: 0 usage, invalid/missing quota, non-finite ratios, 80/95% boundaries, unsupported/partial/synchronous API failure and retry; no persistence request/network calls. Controlled UI fixtures verify warnings, unsupported message, absent invented progress, callbacks and retry. **Not real quota exhaustion.** [Fixture results](m2-final-polish/evidence/fixture-ui-results.json). |
| Native storage / backup | **PASS scoped:** actual origin estimate displayed; More → panel → JSON page → real download; last backup date/time appeared afterward. Panel Tab trap, Escape and back focus passed. Estimates are read-only and do not gate closing or write genealogy data. [Time evidence](m2-final-polish/evidence/backup-time-ui.txt), [keyboard observations](m2-final-polish/evidence/keyboard-panel.json). |
| Navigation / responsive | **PASS settled scope:** all 10 old pages, Hall, profile and new panel; 208 distinct width/theme samples at 320/360/390/430/768/1024/1366/1920. Panel + tree/profile/Hall landscape: 16 samples at 844×390 and 926×430. [Widths](m2-final-polish/evidence/responsive-summary.json), [priority landscape](m2-final-polish/evidence/landscape-priority.json), [panel landscape](m2-final-polish/evidence/landscape-panel.json). |
| Resize observation | One initial Stats measurement at 1024 light was 1084px scroll / 1009px client while resizing; settled light/dark checks were 1009/1009. Raw sample retained, no Stats source change made. Do not interpret the first instantaneous frame as a separate permanent-layout PASS. |
| Empty / data preservation | **PASS:** reused empty v1 fixture, tree recovery action and revised member-list CTA open the existing form; input font remains Plus Jakarta Sans. Restored demo matches all records/settings across 8 stores, excluding only `exportedAt` and backup-generated `lastBackupAt`. [Recovery](m2-final-polish/evidence/fixture-recovery.json). |
| PWA / fonts | **PASS:** manifest, icons, worker and six WOFF2 assets return correct types/signatures; all fonts are in precache. No font delta from PR #10. [Assets](m2-final-polish/evidence/pwa-font-assets.json). |
| Offline | **PASS origin-unavailable scope at `71274ee`:** stopped preview PID, curl exit 7; reload/new tab still open the app. Data-safety panel works, sample person create/read/edit/delete survives reload (31→32→31); memorial heading renders with local Viaoda Libre. OS connectivity stayed unchanged. [Evidence](m2-final-polish/evidence/offline-results.json). |
| Safe area / accessibility | `viewport-fit=cover` and existing `env(safe-area-inset-*)` padding retained. Panel fits 390×844 and landscape with internal scrolling. Modern input/UI font observed; light text/button samples exceed 4.5:1. [Contrast](m2-final-polish/evidence/contrast-results.json). No whole-app WCAG or real-notch certification. |

**SKIP:** real Safari iOS/Chrome Android, software keyboard/notch/OS gestures, launcher cold-process/standalone tests, actual storage exhaustion/eviction and native permission denial. Controlled props/unit tests are not evidence of those device results.

## Cloud handoff and remaining gate

- **GP-DESK-M2-001..003 remain Cloud-owned.** This branch does not claim their PDF/modal failures are resolved and does not duplicate those fixes. Coordinate Cloud's fixes on an agreed pin before lifting the gate.
- **Vietnamese brush calligraphy remains an aesthetic blocker.** Viaoda/Cormorant utility integration is complete; Charm remains Cloud's licensed fallback. No claim that traditional Quốc ngữ brush typography is finished.
- Reusable integration API: `useDeviceStorageStatus()`, `<LocalDataSafetyPanel settings storage onOpenBackup />`, `<StoragePressureNotice storage onOpenDetails />`. Cloud can embed the panel later without duplicating storage/backup logic. The current integration is in Desktop-owned AppShell; DataManagement is untouched.
- QA helpers under `m2-final-polish/evidence/preview/` are dev-only and absent from production output. Snapshot replacement is guarded to the disposable `http://localhost:3240` origin. No Windows/browser protections were disabled.

## Evidence and rollback

- [Panel light](m2-final-polish/screenshots/data-safety-390-light.jpg) · [dark](m2-final-polish/screenshots/data-safety-390-dark.jpg) · [transfer guide](m2-final-polish/screenshots/transfer-guide-390-light.jpg) · [empty members](m2-final-polish/screenshots/empty-members-320-light.jpg) · [dark empty state](m2-final-polish/screenshots/empty-members-390-dark.jpg).
- [Branch title](m2-final-polish/screenshots/branch-390-light.jpg) · [memorial title](m2-final-polish/screenshots/memorial-390-light.jpg) · [offline memorial](m2-final-polish/screenshots/offline-memorial-390-dark.jpg) · [near-full fixture](m2-final-polish/screenshots/near-full-fixture-320-light.jpg). Screenshot names use requested CSS viewport; raster sizes can differ with IAB capture scaling.
- Roll back Desktop code by reverting `0f7594b`, `71274ee`, `883191f`, then `89f94d9`. Keep PR #10 merge if reverting only Desktop polish. To remove all integration, use preserved PR #11 in a separate worktree. No migration or user-data rewrite is required.
- **NEXT_TASK:** Cloud review the Draft, hand off P1 fixes, agree integration SHA, then rerun affected tests and real-device gate. No main merge/deploy in this task.
