# Independent Windows CLI verification, Phase A

Date: 25/11/2026 (Asia/Saigon). This file records independently executed CLI checks only. Browser cases remain owned by the parent runtime QA task.

| Revision | Tested SHA | Base SHA | Lint | Build | Full regression | Focused suites |
|---|---|---|---|---|---|---|
| PR #2 Atomic Merge | 6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e | 1cec38dc77ea46260fa0608c931b22e0b508d531 | PASS exit 0 | PASS exit 0 | PASS 103/103 in 10 files | PASS 32/32 in 3 files |
| PR #3 Atomic Import | 43d9b0271c9f2fdb53f419b2fd507a7a6dd80748 | 6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e | PASS exit 0 | PASS exit 0 | PASS 145/145 in 12 files | PASS 74/74 in 5 files |

Windows 10.0.19044.2846; cmd.exe; Node v24.22.1; npm 11.19.1; Bun 1.4.5; Vitest 5.1.0. Both worktrees installed 626 packages using frozen bun.lock. Bun blocked three postinstall scripts; none were trusted/enabled because all required checks succeeded as installed. No source/dependency/lockfile edits were made.

Exact commands, exit codes and evidence paths are recorded in cli-results.json. Log names use .txt so the baseline *.log ignore rule does not silently drop evidence. Build warnings about chunk size, ineffective backupReminderService dynamic import and future native configLoader __dirname support remain. PR #2 main JS: 1,952.70 kB/gzip 541.99. PR #3: 1,965.18 kB/gzip 547.49. These are build artifact sizes, not browser timings.

## What rollback/retry coverage actually demonstrates

The existing suites were run, then inspected to identify their assertion boundary. All DB cases below import fake-indexeddb/auto and execute application DB adapters on Windows Node. This is useful independent regression, but does not replace native Chromium/Edge IndexedDB or multi-tab GUI testing.

| Suite / lines | Assertions exercised independently | Browser gap |
|---|---|---|
| atomicPersonMerge.test.ts:111–157 | Retains all event IDs/content and reassigns source events; retains media/story/root/founder/branch membership | M11-D01/D02 still require UI + downloaded snapshot verification |
| atomicPersonMerge.test.ts:177–229 | Multiple unions and compatible duplicate edge coalescence; rejects ancestor cycles, conflicting lineage and self-union; unchanged business snapshot on rejection | M11-D03/D04 UI rendering and error messaging |
| atomicPersonMerge.test.ts:293–327 | Queued preceding writes are reread; two concurrent merges serialize and do not resurrect source | M11-D05 real tabs and rapid click UI busy state |
| atomicPersonMerge.test.ts:329–347 | Asynchronous request errors injected in people, lifeEvents and settings; whole business snapshot unchanged, retry succeeds | Faults are injected into fake-indexeddb prototype, not browser storage engine |
| atomicPersonMerge.test.ts:350–384 | Synchronous source deletion error rolls back prior writes; abort after successful delete request restores source and all records | These two cases assert rollback but do not each contain a retry; do not claim five retries |
| atomicPersonMerge.test.ts:387–403 | Ordinary delete cascade remains independent of merge | M11-D06 native user deletion flow |
| importIntegrity.test.ts:47–60,168–177 | Combined snapshot cycle rejected; invalid restore blocked before write; prior business snapshot unchanged | M12A-D02/D03 preview + native commit error paths |
| importIntegrity.test.ts:88–112 | Linked JSON v1 restore round-trip; intentionally empty v1 restore | M12A-D01 real image display and user confirm/reload/export |
| importIntegrity.test.ts:180–220 | Identical IDs idempotent, current settings retained; same-ID collision after preview rejected without partial writes | M12A-D03/D04 native two-tab race |
| importIntegrity.test.ts:247–290 | Sync restore failure after clearing/writing rolls back and allows retry; async merge request error after adding a person rolls back and allows retry | Native browser request fault injection remains outside these suites |
| importIntegrity.test.ts:293–339 and importAdapters.test.ts | CSV new branch + existing parent; GEDCOM self-contained root/branch; malformed headers/quotes/dates/xrefs/trailer and warnings | M12A-D05/D06 actual upload, preview text and cancel/confirm |
| familyBookPdf.test.ts:72–87; personReport.test.ts:232–240 | jsPDF emits expected filename and %PDF...%%EOF Buffer; writeFileSync intercepted, no disk write | M11-D07 browser canvas/font/Vietnamese export not proven; test deliberately uses ASCII names |

M12A-D07 large native import, UI busy/second click is not covered by a GUI test in these suites. No CLI finding justifies claiming that case PASS.

## Working-tree and PDF hygiene

After full and focused suites, git diff --exit-code HEAD -- src server.ts package.json bun.lock vite.config.ts tsconfig.json public and git diff --exit-code HEAD -- *.pdf both exit 0 for each exact worktree. PR #2 git status is empty. PR #3 status contains only untracked docs/qa evidence from parent/child QA tasks. integrity-after.json and status captures retain the result. GP-CLOUD-012 disk-write regression is independently confirmed fixed at the suite boundary.

## Ownership / integration note

No CLI blockers or source defects were found by these runs. ConfirmDialog.tsx was changed in PR #3 to lock confirmation while writing; any Phase B shared modal work must preserve its busy guard. Cloud-owned DB, import/export, relationship, PersonForm media and PDF-service files were not changed here. GUI/browser limitations must be reported separately, not inferred from unit green status.
