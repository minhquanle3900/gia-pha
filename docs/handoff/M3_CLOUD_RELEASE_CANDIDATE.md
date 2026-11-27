# M3 Cloud · Gift Edition review gate

- Base PR #12 `56c7133ec41ec6de1591123a7a32ee2eb51b40cc`. PR #13 `366b71ba2eeb708bea90a06652dc8c363d8a25ab`. Merge `1e2f06cb64baa28f4795042b2cf62cede45356ee` has both as parents. The shared ancestor is `f0fafa2c1aaf479bb99db173a9b049ab2f597055`.
- The Gallery conflict resolution keeps the archive navigation from #12 and restores viewer focus from #13. PDF fix and its tests are in `57cce618ad2fe8c3f1840263cc961fc9f9e09910`. Run `git revert 57cce618ad2fe8c3f1840263cc961fc9f9e09910` to roll back the PDF change while retaining the integration.
- Source changes for M3 are limited to `src/services/personPdfReportService.ts`, `src/features/people/PersonReportModal.tsx` and `src/__tests__/personReport.test.ts`.

## PDF verification

**GP-DESK-M2-001 and GP-DESK-M2-002 — fixed.** Direct and modal downloads share an isolated light print document. The capture uses the selected A4 or Letter paper dimensions and keeps cover, headings and rows together when they fit. The native print action also uses the print document. Portraits are embedded when present as supported local raster data. Legacy external/blob portrait links render initials in the download. The profile and stored links retain their original values.

| Synthetic Trần Văn Lộc fixture | Before | After |
| --- | --- | --- |
| Desktop dark direct, 1366 × 900 | 2 A4 pages, family rows hard to read | 2 A4 pages, family text readable |
| Mobile dark modal, 390 × 844 | 11 A4 pages on this integrated baseline, with clipped and reflowed sections | 2 A4 pages, cover and tables intact |
| Direct and modal, both themes, both viewports | Issues above | 8/8 A4 files with 16 visually checked pages |
| Mobile dark Letter, native print document, offline A4 | — | 2 pages each. Chromium invoked the iframe print and the print engine rendered its Letter document. Cold offline A4 used the installed service worker. |

[Before](m3-cloud/before-dark.jpg) · [Desktop A4](m3-cloud/desktop-a4.jpg) · [Mobile A4](m3-cloud/mobile-a4.jpg) · [Letter, native and offline](m3-cloud/letter-and-offline.jpg)

- `npm test -- src/__tests__/personReport.test.ts` reproduced 2 failing cases before the fix and finished 10/10 after it. `npm test` finished 249/249 (245 baseline and four additional cases). `npm run lint` and `npm run build` passed.
- `npm run preview -- --host 127.0.0.1 --port 4274 --strictPort`. `node scripts/check-pwa-assets.mjs http://127.0.0.1:4274` passed. `pdfinfo` verified the media boxes (A4 595.28 × 841.89 pt, Letter 612 × 792 pt). `pdftoppm -r 100 -png FILE.pdf PAGE` rendered every page for review. The matrix used Chromium desktop and touch emulation.
- Desktop can repeat from Thành viên → Trần Văn Lộc → Thao tác khác → Xuất file PDF trực tiếp or In phả ký cá nhân → Tải PDF. For native printing, select Letter in the modal and choose In / Lưu PDF. Device verification should include iOS Safari and Android Chrome download and native print dialogs.

## Privacy review

- **Gemini.** Only the deliberate generation action posts to `/api/biography/generate`. The server holds the API key and forwards names, biographical details, locations, events and free-text notes to Gemini. The action currently sends before displaying the exact payload for consent. Gift Edition needs a Product Owner decision on gating or disabling the action for real family data. The server route currently has no app-level authentication or rate limit, so public enablement also needs an explicit access and abuse-control decision. Review used source and offline fixtures.
- **External media and sharing.** Legacy HTTP(S) media in existing views can reach third-party hosts when rendered. Blob URLs are tied to the creating context. Personal PDF exports made no third-party or API requests in the matrix. Google Maps receives the selected coordinates or address when its link is opened. QR encoding is local and the QR itself contains readable profile fields.
- **PWA.** The installed Chromium cache contained 20 same-origin build entries including local Charm. Kho kỷ vật → Phòng trưng bày → Công đức tổ tông also worked after cold offline reload with Charm loaded. The generated worker has no runtime data cache and excludes `/api` from navigation fallback. Family records remain in origin-bound IndexedDB. Clearing site data or eviction can remove them.
- **Backup/restore.** JSON is a readable file with all records and embedded media. It preserves external/blob URL references, whose contents may be unavailable on other devices. Restore validates before its atomic write and merge revalidates against the current snapshot within the transaction. Store exports privately. GEDCOM is for interchange with known fidelity limits.

## Remaining review

Desktop owns the PersonForm dirty-close and RelationshipEditor custom/native focus follow-up. Physical phone printing/download and independent QA are pending. Licensed Charm remains the fallback. A traditional Vietnamese brush font is still pending.
