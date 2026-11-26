# M1.2A Independent Review: Atomic Import

26/11/2026, Asia/Saigon. **Integration: BLOCKED.** Native adapter assertions and the product JSON flows below PASS within their stated scope.

| Revision | SHA |
|---|---|
| Exact PR #3 tested | 43d9b0271c9f2fdb53f419b2fd507a7a6dd80748 |
| Base PR #2 | 6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e |
| UI Foundation base | Same exact PR3 head |

Original CLI ran in .worktrees/m1-desktop-ui before UI edits. Native verification used a second detached .worktrees/m1-pr3-qa, frozen Bun1.4.5 install, origin http://localhost:3213. IAB Chromium156 on Windows uses distinct QA origins in a shared profile; it does not meet the separate stable-browser-profile requirement. Prepared Chrome158 profile control was blocked by URL safety verification. No personal genealogy data or Gemini call was used.

| Check | Actual result | Evidence |
|---|---|---|
| Windows lint/build/full regression | PASS exit0;145/145 tests,12 files | [CLI results](evidence/phase-a-cli/cli-results.json) |
| Focused merge/import/adapters/PDF | PASS74/74,5 files | [focused log](evidence/phase-a-cli/pr3-focused.txt) |
| Native IndexedDB adapter checks | PASS7 case groups, no FAIL | [native JSON](evidence/m12a-native-iab.json) |
| Product JSON v1 populated round-trip | PASS business data after download→file chooser→confirm→reload→export | [comparison](evidence/pr3-product/roundtrip-result.json), [before](evidence/pr3-product/before-roundtrip.json), [after](evidence/pr3-product/after-roundtrip.json) |
| Deliberate empty v1 restore | PASS,7 collections stay empty after confirmation/reload; settings remain | [export](evidence/pr3-product/empty-after-ui-reload.json), [screenshot](screenshots/pr3-empty-after-reload.jpg) |
| Duplicate-ID product rejection | PASS, people[31].id error shown; no replacement confirmation | [UI text](evidence/pr3-product/duplicate-id-ui.txt), [screenshot](screenshots/pr3-duplicate-id-error.jpg) |
| Tracked source/lock/PDF after CLI | PASS diff0 | [integrity](evidence/phase-a-cli/integrity-after.json) |

## Requested cases

Source: [Cloud handoff](../../handoff/M1_2A_CLOUD_TO_DESKTOP.md). PASS in the adapter column does not certify the whole product-browser case.

| Case | Native adapter | Product UI / remaining acceptance |
|---|---|---|
| M12A-D01 | PASS:linked8-store v1 and deliberate empty restore | Populated demo31/4branches/12unions/40relationships/7events/5media/3stories plus settings survives product round-trip. Empty restore/reload/export PASS. SKIP post-restore image gallery inspection. |
| M12A-D02 | PASS:duplicate IDs, nested invalid types, missing media reject; chronology warns only | Duplicate-ID alert includes people[31].id. SKIP nested/missing-media/chronology warning UI variants. |
| M12A-D03 / GP-CLOUD-003 | PASS:combined cycle and ID collision introduced after preview reject without partial write | SKIP actual two-tab product preview/write/confirm sequence and visible cycle error. |
| M12A-D04 | PASS:identical IDs idempotent, new record once, current settings retained | SKIP repeated file-picker import and UI feedback. |
| M12A-D05 | PASS:UTF-8 CSV branch/unique existing father; ambiguous names/bad year rejected by parser | SKIP full product CSV preview/apply/error variants. |
| M12A-D06 | PASS:Unicode GEDCOM branch/family, unsupported tag warnings; missing xref/TRLR reject | SKIP full product file-picker/diagnostic/confirm variants. |
| M12A-D07 | PASS:2500-person candidate and2499 edges serialize across2 calls; native restore/merge fault rollback then retry | SKIP product rapid-confirm/busy close protection; no UI performance benchmark claim. |

Two exported populated snapshots differ only at settings.lastBackupAt, which advances when another backup is exported. Exact snapshot equality is therefore false; after excluding exportedAt and that named export bookkeeping field, all business content and references are equal. The comparison records both facts. Empty restore was repeated after an interrupted server session and then confirmed by a downloaded zero-record snapshot; a blank page while the server was unavailable is not treated as empty-data evidence.

## Confirmed scope, blockers and recovery

GP-CLOUD-003 is independently confirmed at native and fake-IDB adapter boundaries. CLI has2 explicit rollback+retry scenarios. Native harness injects synchronous restore failure after earlier writes and asynchronous merge request failure, compares all collections/settings and retries. These controlled failures are not storage quota, device suspension or process-crash tests. GP-CLOUD-012 test-file hygiene is retained. No Cloud hypothesis is rejected by these results.

Chrome/Edge stable are BLOCKED by B-DESK-URL-01; real iOS/Android SKIP. B-DESK-SESSION-02 interrupted product captures; a supervised local server restored verification. Remaining IAB UI variants above are SKIP, not invented BLOCKED claims. See [blocker record](evidence/BROWSER_AUTOMATION_BLOCKER.json). [Harness README](evidence/runtime-harness/README.md) states its adapter-only boundary.

Acceptance still requires the full handoff UI variants, real two-tab and rapid-click/busy tests, stable-browser profile runs and shared Cloud modal review. Restore/import code rollback does not undo committed data; recover synthetic fixtures using saved before JSON. No schema change, merge, deployment or M2 implementation is authorized by this report.
