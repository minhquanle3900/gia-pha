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

## Gift Edition privacy lock

Follow-up from approved PR #14 head `665ceb2acc3e99ef4148c1d19e1308ca10cac458`.

- **Gemini defaults OFF.** The dashboard displays “AI chưa được kích hoạt trong Bản Quà Tặng.” The existing form action returns that message without making a request. Express rejects a direct `POST /api/biography/generate` with `403` and `Cache-Control: no-store` before parsing the body, even with a key present. The client build flag is `VITE_GEMINI_BIOGRAPHY_ENABLED` and the server runtime flag is `GEMINI_BIOGRAPHY_ENABLED`. Leave both unset or `false` for Gift Edition. Future public enablement requires the pending consent and access-control decisions.
- **Media stays local.** Family views and Family Book exports render embedded bytes. References, including legacy HTTP(S), relative paths and Blob URLs, remain in IndexedDB and JSON backups. CSP also blocks cross-origin image, audio and font requests. Voice playback uses device-local synthesis voices. A user who opens the Google Maps link still shares the selected address or coordinates with Maps. QR generation stays local and its readable contents travel with the shared QR.
- **Backup and PWA.** JSON still carries records and embedded media. Atomic restore and merge validation remain in place. The worker precaches same-origin build assets and excludes `/api` from its navigation fallback. Site-data clearing or eviction may remove the origin’s IndexedDB data.
- **Evidence.** `npm test` 255/255, including all 249 baseline tests and six privacy cases. `npm run lint`, `npm run build` and the PWA HTTP checks passed. Chromium on the production server opened a synthetic dataset with external portrait, photo and audio URLs. Dashboard reload, profile, Gallery views, edit-form AI action and PDF download made zero third-party or API requests. A cross-origin canary received zero hits and the browser reported its direct image probe blocked by CSP. Direct A4 and Chromium native Letter PDF both remained two pages.

## Remaining review

Desktop owns the PersonForm dirty-close and RelationshipEditor custom/native focus follow-up. Physical phone printing/download and independent QA are pending. Licensed Charm remains the fallback. A traditional Vietnamese brush font is still pending.
