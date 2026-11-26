# M2 Core Integration Gate

**BLOCKED — không merge main hoặc deploy.**

Base: `cf009fcc26f4c9ef5ba7a14a69daba2984af94f9`.
Code/test HEAD: `c739bd8a7bca1d8267ffe43eadbaf4ea08bd4629`.
Included: PR #8 + merge PR #7/#9; #2/#3/#5/#6 đã là ancestry.

| Gate | Status |
|---|---|
| Windows lint/build/regression/PWA HTTP assets | PASS, 225/225 |
| Shared navigation, all old page entry points + Hall | PASS scoped runtime |
| Responsive page overflow, required widths/themes/orientations | PASS measured scope |
| Native DB + product JSON/CSV/GEDCOM | PASS assertions; two-tab product/busy still SKIP |
| Offline CRUD/reload/new tab | PASS origin-unavailable scope; standalone/real-device SKIP |
| Personal PDF quality | FAIL GP-DESK-M2-001/002 |
| Cloud dirty/focus/busy modal acceptance | FAIL / unverified GP-DESK-M2-003 |
| Chrome/Edge stable isolated automation | BLOCKED: Chrome provider unavailable; Edge absent from connected inventory |
| Real Safari/Android, keyboard, multi-touch, safe-area/standalone | SKIP, no connected devices |
| M2.3 integration | Pending agreed pin; Cloud brush/wording decision still BLOCKED |

[Handoff, reproduction, artifacts and NEXT_TASK](../M2_DESKTOP_PRODUCT_INTEGRATION.md).
