# 07 · Kiểm thử baseline

Linux x86_64, Node 24.22.3, npm 11.19.1, Bun 1.4.5, Git 2.56.1. Chạy tại root repository. Đặt `npm_config_cache` vào vùng ghi được của workspace. Lần đầu npm không tạo được cache home, lần chạy lại đã dùng cache workspace.

| Exact command | Exit | Kết quả | Log |
|---|---:|---|---|
| `npm exec --yes --package=bun -- bun install --frozen-lockfile` | 0 | 625 package; Bun chặn 3 postinstall chưa được tin cậy | [install](evidence/install-retry.txt) |
| `npm run lint` | 0 | `tsc --noEmit` | [lint](evidence/lint.txt) |
| `npm run build` | 0 | Build Vite và Workbox, 9 precache entries; cảnh báo chunk, dynamic import và tương thích loader | [build](evidence/build.txt) |
| `npm test` | 0 | 9/9 tệp, 79/79 test | [test](evidence/test.txt) |
| `node --expose-gc --import tsx src/__tests__/performanceBenchmark.ts` | 0 | 100/500/2.000/5.000 người, check NaN PASS cả 4 | [benchmark](evidence/benchmark.txt) |
| `npm exec --yes --package=bun -- bun audit` | 1 | 2 advisory moderate | [audit](evidence/audit.txt) |
| `node --import tsx docs/audit/cloud/evidence/merge-event-check.mts` | 0 | Sanity check chuyên biệt xác nhận fixture bị mất event trên baseline; exit 0 là đã tái hiện | [log](evidence/merge-event-check.txt) |

Benchmark 5.000 người đo layout toàn cảnh p50 101,74 ms và p95 129,73 ms trong Node. Dòng FPS/DOM trong log do script in dự báo. Tách đo render trình duyệt, thời gian tải ảnh/chunk và tương tác. Suite PDF tạo lại hai PDF tracked trong clone; khôi phục các tệp này trước khi commit audit. GP-CLOUD-012.

**SKIP** Windows, browser UI, kiểm tra artifact PDF trực quan, rendering/media permissions, cài đặt/offline và Gemini live. Chưa có báo cáo code coverage. Không dùng suite để suy ra các đường chưa được kiểm.
