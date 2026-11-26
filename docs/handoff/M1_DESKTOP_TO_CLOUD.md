# M1 Desktop to Cloud

26/11/2026, Asia/Saigon. **Integration Gate BLOCKED; Draft review only.**

Base PR3:43d9b0271c9f2fdb53f419b2fd507a7a6dd80748. Exact independent PR2:6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e. Final UI source head:0e51835552741a81ed69d31080d900bf7cc726f0. Branch:fix/m1-desktop-ui-foundation. Documentation/evidence commits follow; final PR HEAD is recorded by GitHub and the user-facing handoff, not relabeled as a source-tested revision.

## Runtime findings and changes

Header baseline overflow was89/19/489px at320/390/1366. Final dashboard/header has0 horizontal overflow in32 requested viewport/theme/orientation combinations; search-open tested at5 widths also stays contained. Owned Tour dialogs have bounded portrait/landscape/desktop layouts in both themes. Header/dialog buttons and anniversary filter are measured44px minimum. Dark menu text is now12.99:1 on its measured surface; other sampled pairs are in the contrast artifact.

Owned dialogs use explicit useModalAccessibility for topmost focus, Tab containment, Escape and restoration. Caller owns busy/dirty close decisions. A QR launched from the mobile drawer initially restored focus to BODY; launch sequencing was corrected and retested to “Thêm...”. Desktop QR restores the persistent tools trigger. PIN empty form labels/focus and reduced-height Save bounds passed; credential/dirty/busy timing not submitted or certified.

Only10 UI files changed. No DB, import/export, relationship, PersonForm media, PDF, ConfirmDialog, schema, dependency/lock or navigation restructuring. No main merge, deploy, Capacitor or mobile codebase.

## Independent Cloud verification

- GP-CLOUD-001: all3 event IDs/content survive merge in native IndexedDB.
- GP-CLOUD-002: native linked refs, unions/lineages, rollback/retry/fresh-state checks PASS; product merge success/profile/story samples observed. Remaining product two-tab/rapid-click/error/tree cases remain SKIP.
- GP-CLOUD-003: combined cycle and current-state same-ID conflict reject without partial writes in native and fake-IDB checks. Product JSON populated and empty restore/reload/export passed; duplicate-ID error includes people[31].id.
- GP-CLOUD-012: Windows PDF regression suites leave tracked source/PDF unchanged; Node ASCII-buffer assertions do not certify browser Vietnamese PDFs. New browser PDF artifacts remain SKIP.
- Rejected Cloud hypotheses: none. No unsupported claim that the complete product handoff passed.

JSON round-trip preserves all business records and refs; settings.lastBackupAt advances on the second export and is explicitly retained as the only difference in the comparison. Revert cannot restore committed genealogy; use the saved before JSON.

## Cloud review requests

| Request | Files owned by Cloud / acceptance |
|---|---|
| GP003 modal adoption | ConfirmDialog/DuplicateMerge/RelationshipEditor/PersonForm/DataManagement: explicit lifecycle integration preserving write busy guards and dirty form decisions; do not wrap with synthetic close clicks. Verify nested transitions and restoration. |
| Tree/mobile core | Validate existing pan/pinch/tap, no page gesture escape, dedicated tree/table scrolling and reduced-height layout. No core tree algorithm edit from Desktop. |
| PWA artifacts | Built manifest declares standalone but3 PNG assets are absent. Supply actual assets, then install/offline/update/device recovery verification. |
| QA completion | Full M11/M12A product variants, stable Chrome/Edge separate profiles and Vietnamese PDF downloads; preserve the scoped native adapter evidence rather than rerun full M0 audit. |

## Evidence and blockers

[M1.1 review](../qa/m1-desktop/M1_1_INDEPENDENT_REVIEW.md), [M1.2A review](../qa/m1-desktop/M1_2A_INDEPENDENT_REVIEW.md), [UI report](../qa/m1-desktop/M1_DESKTOP_UI_FOUNDATION.md), [Gate](../qa/m1-desktop/CORE_INTEGRATION_GATE.md), [33-feature Mobile Plan](MOBILE_READINESS_PLAN.md).

B-DESK-URL-01 blocks approved native Windows Chrome/Edge automation. IAB Chromium156 resumed in a new turn and uses separate QA origins in a shared profile, not an independent stable profile. Tool refresh/server lifecycle interrupted captures; incomplete product variants are SKIP unless an actual technical blocker applies. Real iOS/Android, physical safe-area/software keyboard, gestures and standalone/cold offline remain SKIP. PWA missing artifacts are FAIL. Full integration remains BLOCKED.

Review/rollback by issue commit group, then Windows lint/build and keyboard/navigation smoke. Final Windows result:145/145 at the source head above; PR2 baseline103/103 and PR3 baseline145/145. Stop at this Gate; no next sprint started.

GP-DESK-004 final stylesheet follow-up: dark dashboard gold CTA and quick-search secondary text were corrected through existing palette overrides, with computed colors saved. DashboardPage source was not edited. Whole-app AA is still not certified.
