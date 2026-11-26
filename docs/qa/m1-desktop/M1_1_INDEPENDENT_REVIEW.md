# M1.1 Independent Review: Atomic Merge

26/11/2026, Asia/Saigon. **Integration: BLOCKED.** CLI and native browser adapter checks PASS within the boundaries below. This is not full product acceptance.

| Revision | SHA |
|---|---|
| Exact PR #2 tested | 6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e |
| Base | 1cec38dc77ea46260fa0608c931b22e0b508d531 |
| UI branch later tested separately | 0e51835552741a81ed69d31080d900bf7cc726f0 |

Detached worktree: .worktrees/m1-pr2-qa. Browser origin: http://localhost:3211. Native adapter run: IAB Chromium156 on Windows, independent origin, shared IAB profile. Dedicated Chrome158 profile was prepared but its Windows URL safety gate blocked control. IAB results do not certify Chrome/Edge stable or an independent browser profile. Only extended synthetic M0 fixtures were used.

## Actual checks

| Check | Result | Evidence |
|---|---|---|
| Frozen Bun1.4.5 install | PASS,626 packages, no lock edit | [CLI report](evidence/phase-a-cli/CLI_VERIFICATION.md) |
| Windows lint/build/full regression | PASS, exit0,103/103 in10 files | [command results](evidence/phase-a-cli/cli-results.json) |
| Focused merge/PDF suites | PASS,32/32 in3 files | [focused log](evidence/phase-a-cli/pr2-focused.txt) |
| Native IndexedDB adapter suite | PASS,6 case groups; D07 outside harness | [native JSON](evidence/m11-native-iab.json) |
| Product merge | PASS for observed merge success,8→7 members; target family and story rendered | [success](evidence/pr2-product/merge-ui-after.txt), [target](evidence/pr2-product/target-profile-after.txt), [story](evidence/pr2-product/story-after.txt) |
| Tracked source/lock/PDF integrity after CLI | PASS, diff0 | [integrity](evidence/phase-a-cli/integrity-after.json) |

Read [Cloud handoff](../../handoff/M1_1_CLOUD_TO_DESKTOP.md) for the full sequence. Every row below retains its unexecuted product requirements; adapter PASS is not a full-case PASS.

| Case / Issue | Native adapter result | Product UI evidence / remaining acceptance |
|---|---|---|
| M11-D01 / GP-CLOUD-001 | PASS:3 original event IDs/content retained, source reassigned | Merge success and source disappearance observed. SKIP remaining timeline rendering/reload comparison via product UI. |
| M11-D02 / GP-CLOUD-002 | PASS:portrait/media/story/root/founder transfer once, snapshots retained | Target portrait/family and story observed. SKIP remaining downloaded post-merge JSON/root/founder UI comparison. |
| M11-D03 / GP-CLOUD-002 | PASS:3 generations,2 unions, single-partner union, biological/step and compatible edge coalescence | Target family lists both partners and2 children. SKIP complete tree checks from both spouse/child ends. |
| M11-D04 / GP-CLOUD-002 | PASS:direct/indirect ancestry and spouse merge reject, no writes | SKIP visible product error/cancel/reload variants. |
| M11-D05 / GP-CLOUD-002 | PASS:fresh transaction state, competing adapter calls, native abort/rollback/retry | SKIP actual two product tabs and rapid confirmation clicks. These are not replaced by competing calls in one harness document. |
| M11-D06 / GP-CLOUD-002 | PASS:ordinary-delete cascade remains independent | SKIP ordinary-delete confirmation flow. |
| M11-D07 / GP-CLOUD-012 | PASS Windows PDF suites and tracked-file hygiene; adapter N/A | SKIP new personal/book PDF downloads and Vietnamese visual inspection. Existing M0 artifacts are historical, not PR2 proof. |

## Integrity and limits

GP-CLOUD-001 and GP-CLOUD-002 fixes are independently supported at the real browser adapter boundary. GP-CLOUD-012 is confirmed at the test disk-write boundary. No Cloud hypothesis was rejected. Windows suites use fake-indexeddb:5 merge rollback scenarios, but only3 explicit retries. Native harness fault injection is test-only, restores prototypes in finally and compares complete business snapshots, then retries; read JSON for each exact assertion. It is not a quota/OS-crash simulation.

B-DESK-URL-01: native Windows control could not verify current Chrome URL, before assertions. See [blocker record](evidence/BROWSER_AUTOMATION_BLOCKER.json). Chrome/Edge stable remain BLOCKED; real iOS/Android SKIP, no hardware. B-DESK-SESSION-02: tool refresh cleared IAB bindings and terminated CLI-owned servers; incomplete product flow capture was not converted to a product failure. Servers were restored with a live supervisor. Remaining IAB product variants are explicitly SKIP, not falsely labeled as environment-blocked.

Resume full handoff cases in a dedicated stable browser profile, preserve before/after JSON, record UI/timeline/tree and both PDF artifacts, and test real two-tab and busy behavior. No merge, deploy or approval to begin M2 is issued.
