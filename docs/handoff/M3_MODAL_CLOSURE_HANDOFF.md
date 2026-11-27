# M3 Desktop modal closure · checkpoint

Branch: `fix/m3-desktop-final-modal`.
Code / targeted tested SHA: `2036fbe9fa7cada034f565121d25fe7d872b42aa`.
Preserved PR #12: `56c7133ec41ec6de1591123a7a32ee2eb51b40cc`.
Merged exact PR #13: `366b71ba2eeb708bea90a06652dc8c363d8a25ab`, merge `7103055eb748f797c3ec9a1297c4dd6af065af48`.
Only merge conflict: GalleryPage; retained Desktop navigation callback / explicit Hall-entry key and Cloud viewer-focus flag. Source branches unchanged.

## Completed

- PersonForm: all-field dirty snapshot including portrait / AI proposal; value reversion becomes clean; existing native ConfirmDialog asks before discarding. Hủy, X, backdrop and Escape share the guard. Initial name focus and short-viewport reveal stay inside form scroll area. Immediate busy guard disables editing/closing during save, image preparation or AI request; payload/services unchanged.
- RelationshipEditor: search initial focus / labels, Escape and opener restoration, immediate busy/error guard for every existing add/delete path. Existing commands/validation unchanged.
- Shared custom/native arbitration: physical native top layer wins; custom descendants may be topmost, siblings wait. Tab boundaries exclude all negative tabIndex and nested scopes. Parent/child detach preserves opener ancestry. Ancestor native cancel capture ignores descendant cancel. Busy native keeps closedby=none from caller.
- Fullscreen handoff: preserves actual Quan hệ / Sửa hồ sơ opener rather than returning to fullscreen toggle. Old async failure cannot roll back a newer handoff request.

Desktop source files changed (relative to merge 7103055):

- src/features/people/PersonFormModal.tsx
- src/features/people/personFormDraft.ts
- src/features/relationships/RelationshipEditorModal.tsx
- src/hooks/useModalAccessibility.ts
- src/hooks/useNativeModal.ts
- src/hooks/useWorkspaceFullscreen.ts
- src/hooks/modalScope.ts
- src/__tests__/personFormDraft.test.ts
- src/__tests__/modalScope.test.ts

No Desktop PDF services/templates, schema, DB/context, AI/media service, or Cloud modal component edits. PR #13's changes are inherited, not rewritten.

## Evidence and results

- **Targeted PASS: 72/72**, two files (40 arbitration/cancel +32 draft). [Log](m3-final-modal/evidence/targeted-tests.txt). Windows / Node24.22.1; no test dependency or lockfile change. Existing Vite future config-loader warning remains, no suppression added.
- Before scope reduction, Windows lint/build and full suite already passed **317/317** at the same code SHA. [Recorded CLI](m3-final-modal/evidence/cli/results.json). No further full regression was run after Coordinator narrowed the task.
- Actual browser: draft Hủy/Escape/continue/discard and focus restoration; actual app save/add/delete blocked behind native IndexedDB lock, then single write; synthetic fixture restored exactly across stores. [Person](m3-final-modal/evidence/person-final-runtime.json), [busy person](m3-final-modal/evidence/person-busy.json), [busy relationship](m3-final-modal/evidence/relationship-busy.json), [counts](m3-final-modal/evidence/mutation-counts.json), [recovery](m3-final-modal/evidence/fixture-recovery.json).
- Final native/custom nesting: one Escape per layer in four chains, Tab boundaries, busy states and suspended sibling handoff passed. [Final nesting](m3-final-modal/evidence/nesting-runtime.json). Regression RED/GREEN logs retained for detach and native-cancel fixes.
- PersonForm and RelationshipEditor each checked at eight widths ×2 themes, all three sections/tabs; no page overflow observed. Landscape name visibility fixed. [Form](m3-final-modal/evidence/form-responsive.json), [relationship](m3-final-modal/evidence/relationship-responsive.json), [landscape before](m3-final-modal/evidence/landscape-initial-settled.json), [after](m3-final-modal/evidence/landscape-initial-after.json).
- Fullscreen transition and exact opener restoration verified in app-reported native mode. DOM-only browser adapter did not expose fullscreenElement/fullscreenEnabled, so no OS fullscreen certification. [Before](m3-final-modal/evidence/fullscreen-focus-before.json), [after](m3-final-modal/evidence/fullscreen-focus-after.json).
- Runtime artifacts retain their individual tested SHA. Later fixes reran affected cases; final CLI/targeted tests use code SHA above. Some early development observations include failures that were subsequently fixed, not final PASS claims.

## Remaining / known risks

Implementation has no confirmed remaining defect in the exercised modal scope. Full product / release acceptance is **PENDING CLOUD**, not PASS.

- Per latest Coordinator instruction, **PR #14 was not integrated**. Cloud must preserve this Desktop branch and integrate exact `61387374be45c6446864814d8877cf687f95e9fa` on a convergence branch, resolve ownership conflicts, preserve Gift Edition Privacy Lock and verify frontend/backend Gemini default OFF.
- Cloud owns final regression (minimum255 baseline +Desktop tests), PDF, PWA, offline, backup/restore and navigation smoke. Pending PWA/pin command was blocked by automatic approval review after scope reduction and was not retried.
- **SKIP:** real iPhone/Safari/Android, software keyboard, physical notch/gestures and OS fullscreen. Prepare iPhone acceptance checklist in Cloud handoff. Initial pointer selection during tree transition was not counted PASS; keyboard Enter opened inspector. No Windows protection disabled.
- QA pages under evidence/preview are dev-only, clearly labelled and guarded to synthetic localhost:3250. Simulated busy is separate from actual IndexedDB-lock evidence. Restore ignores only exportedAt and backup timestamp; no real family data used.
- [Local demo instructions](m3-final-modal/LOCAL_DEMO.md) are preserved as a starting point; Cloud must update the final release pin and launch/verify the converged demo. Existing M3 dev3250 / preview3251 are local processes only.

**NEXT_TASK (Cloud):** preserve this Draft's Desktop commits, integrate PR #14 exact pin on a separate convergence branch, run affected modal tests + final release QA, check Gemini OFF / Privacy Lock, publish final local-demo instructions and real-iPhone checklist, then report Integration Gate. No main merge/deploy.
