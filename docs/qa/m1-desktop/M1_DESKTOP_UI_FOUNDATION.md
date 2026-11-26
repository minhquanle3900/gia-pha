# M1 UI Foundation: Mobile First

26/11/2026, Asia/Saigon. Implementation is a **Draft for Cloud review; Integration Gate BLOCKED**. No merge, deploy, framework replacement, schema change, new mobile codebase or M2 navigation implementation.

| Item | Value |
|---|---|
| Branch | fix/m1-desktop-ui-foundation |
| Exact base | 43d9b0271c9f2fdb53f419b2fd507a7a6dd80748 |
| Final tested code head | 0e51835552741a81ed69d31080d900bf7cc726f0 |
| Evidence/document-only commits after code | Read final PR HEAD metadata; they do not change the tested source |
| Runtime | Windows IAB Chromium156, viewport emulation; no real touch/iOS/Android certification |
| Fixture | Bundled demo31; synthetic extended M0 merge fixture for independent QA |

## Scope and implementation

Reading this as: a calm genealogy archive for families and older adults, in the existing Heritage visual language, ENERGY1 / RHYTHM1 / MOTION1. Forest green preserves hierarchy, ivory preserves the paper surface, gold marks key actions and bark keeps normal light text readable. Typography, icons,10 destinations and core data flows are reused. No new visual asset or navigation structure was created.

| Issue | Change | Actual validation / limit |
|---|---|---|
| GP-DESK-001 | Header uses2 bounded rows, shrinking/truncated clan label, bounded search, wrapping tools/status. Main/content use min-width0 and safe-area margins. | PASS dashboard/header at32 viewport/theme/orientation combinations; search-open at640/768/1024/1366/1920 also no page overflow. Not a whole-app layout certification. |
| GP-DESK-003 | Explicit topmost modal hook: initial focus, Tab containment, Escape, restoration and busy guard. Applied to Tour, PIN, QR, Kinship, mobile Search/drawer. Menu→dialog launch restores a persistent menu trigger before opening next dialog. Visible field labels and native result/path buttons. | PASS scoped keyboard flows; confirmed QR focus-to-BODY bug during QA and fixed/retested. PIN credential submission/dirty-confirm/busy timing SKIP. Cloud-owned modal adoption still BLOCKED by ownership. |
| GP-DESK-004 | Reused light/dark surfaces and readable muted text; anniversary widget, Tour, Kinship, PIN cancel and desktop tool labels receive paired dark styling. Bark on gold replaces white in the install/countdown controls. | PASS sampled sRGB pairs and computed menu colors; light/dark dashboard plus8 Tour size/theme cases. Full33-feature AA assessment SKIP. |
| GP-DESK-007 |44px minimum in header/nav/search/drawer/anniversary buttons and owned dialog close/actions/step targets. Visible3px focus rings; mobile input font16px. | PASS measured header and Tour/QR/Kinship/PIN geometry. Actual touch, assistive technology and remaining core control geometry SKIP. |

Exactly10 UI files changed. DB, models/schema, package/lockfile, import/export, relationship, PersonForm media, PDF services and ConfirmDialog are unchanged against base. See [CLI results](evidence/ui-cli/results.json). The modal hook uses caller-owned close decisions; it does not synthesize close-button clicks or observe/close Cloud transaction dialogs.

## Evidence

| Check | Before | After |
|---|---|---|
|320 dashboard dark | [image](screenshots/before-dashboard-dark-320.jpg),89px overflow | [image](screenshots/after-dashboard-dark-320.jpg),0px |
|390 dashboard dark | [image](screenshots/before-dashboard-dark-390.jpg),19px overflow | [image](screenshots/after-dashboard-dark-390.jpg),0px |
|1366 dashboard dark | [image](screenshots/before-dashboard-dark-1366.jpg),489px overflow | [image](screenshots/after-dashboard-dark-1366.jpg),0px |
|390 Tour dark | [image](screenshots/before-tour-dark-390.jpg), baseline PR3 | [image](screenshots/after-tour-dark-390.jpg), same demo/viewport |

Before source is exact PR3 served from detached worktree3213; after is the UI branch3212. [Baseline geometry](evidence/baseline-layout.json) and [runtime measurements](evidence/ui-runtime.json) contain actual innerWidth/innerHeight, scroll/client widths and target rectangles. Screenshot filenames refer to measured viewport, not a named phone. Initial wrapper-created tabs ignored viewport overrides; those captures were replaced after using documented browser.tabs.new() and verifying dimensions. No iframe fallback was used.

Widths320/360/390/430/768/1024/1366/1920 were tested with swapped height/width and both themes:32 requested combinations, including duplicate768×1024/1024×768 reference pairs. All32 dashboard/root measurements have scrollWidth<=clientWidth+1px. Owned Tour panels were also measured at320×568,390×844,844×390,1366×900 in2 themes: no horizontal overflow, button minimum44px, internal content scroll and bounded dialog height. This does not prove tree pinch, every screen or physical safe-area.

Keyboard evidence covers Tab/Shift+Tab wrap and Escape in Tour, drawer, QR, Kinship and empty PIN; Search cycles between input/result controls, restores trigger and retains query on reopen. QR/Kinship return to “Thêm...”; desktop QR returns to the tools trigger. PIN labels resolve to their inputs. Save remains inside844×390 viewport (bottom353.6px), but this is reduced-height layout rather than a real software keyboard test. Hook busy locking is implementation-reviewed, not transaction-runtime certified.

[Contrast pairs](evidence/contrast.json) use WCAG sRGB luminance. Computed dark menu foreground237/230/220 on23/36/28 was observed after correction. Ratios for each sampled pair are recorded; no whole-app AA claim is made for opacity, gradients or unchanged Cloud screens.

## Windows validation

At 0e51835552741a81ed69d31080d900bf7cc726f0: lint PASS, build PASS, full regression145/145 in12 files. [Exact commands/exit codes](evidence/ui-cli/results.json) and [.txt logs](evidence/ui-cli/CLI_VERIFICATION.md) are retained. Tracked source was clean before/after. Existing build chunk, ineffective dynamic import and configLoader warnings remain; no benchmark improvement is claimed.

## Ownership handoff and rollback

Cloud must review adoption in ConfirmDialog busy handling, DuplicateMerge, RelationshipEditor, PersonForm dirty/media lifecycle and DataManagement labels before GP-DESK-003 can be closed globally. Tree pan/pinch/tap, table region scroll, PWA/manifest assets, real keyboard and installed mobile behavior remain in [Mobile Readiness Plan](../../handoff/MOBILE_READINESS_PLAN.md). No shared business file was overwritten.

Commits: d8e218b header/safe-area;147979a contrast;78c0629 touch/focus;1026d65 explicit owned dialogs;0b7b6f8 menu focus repair;7a3a948 dark dialog text;f07ac92 dark desktop tools;38469ae labeled44px anniversary filter;0e51835 dashboard dark palette. Review/revert by issue group; for complete rollback use base in a separate worktree or revert these commits in reverse order after review. Re-run lint/build and keyboard/navigation smoke. Code rollback does not restore IndexedDB; recover test fixtures with saved JSON.

## Antislop Delivery Gate (AFTER, approved issue scope)

- Hard Gate: PASS scoped layout/targets/keyboard evidence above; BLOCKED full click-through, real mobile and Cloud-owned dialogs. No invented product readiness, security or performance claim.
- Purpose Gate: PASS by source review: header rows preserve destinations within width; safe-area/dvh/scrollers keep actions reachable; colors preserve Heritage hierarchy and readability. No new asset, font, icon library or decorative system.
- Liveliness: PASS direction retained by before/after review, ENERGY1/RHYTHM1/MOTION1, existing serif wordmark, forest archive header, restrained gold and stable spacing.
- Craftsmanship: PASS Windows checks and stated runtime samples; BLOCKED whole-product resilience and independent stable-browser acceptance. Overall delivery gate remains BLOCKED. This is a reviewable Draft, not approved UI/product delivery.

Test checkpoints: keyboard at7a3a948 (owned dialog files unchanged afterwards), menu/8 Tour layout checks atf07ac92, final32 dashboard/layout/filter measurements and Windows checks at0e51835552741a81ed69d31080d900bf7cc726f0. The last source change only labels/enlarges the anniversary select, measured30.4→44px.

Screenshot-state note: populated business fixture, date, viewport and theme match before/after. The after dashboard header shows the privacy shield enabled by the empty PIN QA; before header shows its initial state. This icon/color difference is not attributed to the layout fix.
Final visual correction: existing palette overrides now keep bark text on the gold primary CTA, readable quick-search secondary text and paired story/secondary surfaces. DashboardPage source stays unchanged; computed CTA46/36/30 on219/197/153 and subtitle168/159/147 are retained in runtime JSON. Whole-app AA remains unverified.
