# Core Integration Gate

26/11/2026, Asia/Saigon. **Decision: BLOCKED. Stop here.** Draft code/evidence are reviewable; no main merge, production deploy, Capacitor packaging or new sprint implementation.

| Revision | SHA |
|---|---|
| PR2 exact tested | 6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e |
| PR3 exact tested / UI base | 43d9b0271c9f2fdb53f419b2fd507a7a6dd80748 |
| Final source-tested UI head | 0e51835552741a81ed69d31080d900bf7cc726f0 |
| Branch | fix/m1-desktop-ui-foundation |
| PR evidence head | GitHub PR HEAD includes documentation/evidence-only commits after the source-tested head; final handoff reports that hash separately |

## Gate results

| Gate | Status | Evidence / qualification |
|---|---|---|
| Windows PR2 lint/build/regression | PASS |103/103, [CLI](evidence/phase-a-cli/cli-results.json) |
| Windows PR3 lint/build/regression | PASS |145/145, same CLI record |
| Native IndexedDB adapters | PASS scoped |6 M11 and7 M12A groups, [M11](evidence/m11-native-iab.json), [M12A](evidence/m12a-native-iab.json); M11-D07 outside adapter harness |
| All requested handoff product flows | SKIP remaining variants; acceptance BLOCKED | Partial IAB merge/profile/story and JSON UI evidence exists. Full timeline/tree, two real product tabs, rapid click/busy, CSV/GEDCOM diagnostic variants and new Vietnamese PDF artifacts are not complete. [M11 review](M1_1_INDEPENDENT_REVIEW.md), [M12A review](M1_2A_INDEPENDENT_REVIEW.md) |
| Dedicated Chrome/Edge stable profile runs | BLOCKED | B-DESK-URL-01. Dedicated Chrome158 profile prepared; Windows control could not verify URL. IAB Chromium156 shared-profile origins do not satisfy this requirement. |
| Final UI Windows checks | PASS |0e51835552741a81ed69d31080d900bf7cc726f0, lint/build exit0,145/145. [results](evidence/ui-cli/results.json) |
| Header/dashboard responsive scope | PASS |32 requested size/theme/orientation combinations; five search-open widths. [DOM geometry](evidence/ui-runtime.json) |
| Owned modal keyboard scope | PASS |Tour/drawer/QR/Kinship/Search/empty PIN; explicit focus/Tab/Escape/restoration. Tour8 size/theme combinations. No transaction or credential submission certification. |
| GP-DESK-003 whole-product closure | BLOCKED ownership |Cloud review/adoption required in ConfirmDialog, DuplicateMerge, RelationshipEditor, PersonForm and DataManagement. Files left unchanged. |
| Contrast and touch scope | PASS samples |Nine color pairs >=4.5; measured44px controls/filter. [contrast](evidence/contrast.json). Whole-app AA and real touch SKIP. |
| iOS/Android, real safe-area/keyboard/gestures | SKIP |No hardware in Windows environment. Tree pinch and OS interaction not emulated. |
| Manifest artifacts | FAIL |Standalone declared,3 referenced PNG icons missing from built dist. [artifact inspection](evidence/pwa-artifact-check.json). Existing Cloud PWA backlog; no PWA source fix in this branch. |
| Installed PWA/cold offline/update recovery | SKIP |No new production-build installed-device run; dev server/reload does not establish offline readiness. |
| Schema/dependency/Cloud-owned source integrity | PASS |Only10 intended UI files changed; DB/models/lock unchanged, tracked source clean after tests. |

## Blockers and next authorized review work

1. B-DESK-URL-01: restore approved native Windows URL-safe control, then execute stable Chrome/Edge profiles. Do not infer compatibility from binary installation or IAB UA.
2. Finish the named unexecuted handoff UI variants and obtain Vietnamese personal/book PDF download/render evidence. SKIP means not executed, not an invented environmental cause. Existing native adapter PASS is retained.
3. Cloud must review explicit modal integration with busy/dirty semantics. Acceptance: Tab containment/restoration, safe Escape, no close during write, no silent form loss, including nested modal transitions.
4. GP-CLOUD-006/PWA assets: supply the3 actual icons and verify manifest/install/standalone/offline/cold launch/update with IndexedDB preservation before mobile release. No source change made here.
5. Real Safari iPhone and Chrome Android: safe-area landscape, physical keyboard occlusion,44px tap, downloads/share, pan/pinch/tap, page zoom/scroll isolation, offline restart and storage recovery.

Tool/session refresh also cleared IAB bindings and terminated early CLI-owned servers (B-DESK-SESSION-02). Logs and source revisions were retained. A live supervisor restored local servers; incomplete captures were rerun where recorded. This is not evidence of an application crash. No core defect is inferred from server connection refusal.

## Review order, acceptance and rollback

- Review UI groups independently: GP001 d8e218b; GP004147979a/7a3a948/f07ac92; GP00778c0629/38469ae; GP0031026d65/0b7b6f8. Confirm Heritage tokens and existing10 destinations remain.
- Re-run the full independent product cases in dedicated stable profiles, then Cloud-owned modal review. Gate passes only when remaining required cases have actual evidence or coordinator explicitly accepts a documented scope change.
- After Cloud acceptance, schedule real-device/PWA closure. M2 five-group navigation is a proposal only in [Mobile Readiness Plan](../../handoff/MOBILE_READINESS_PLAN.md).
- Rollback UI by reverting corresponding commit groups in reverse order, or use base43d9b02 in another worktree. Check lint/build plus navigation/focus smoke. Restore fixture JSON separately; git revert cannot undo IndexedDB transactions.

PASS: listed CLI, native adapter and scoped UI checks. FAIL: missing PWA artifacts. SKIP: unexecuted/device/offline/product variants. BLOCKED: stable-profile/full integration acceptance. No release approval.
