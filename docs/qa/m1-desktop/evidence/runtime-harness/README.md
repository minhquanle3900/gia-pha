# Independent browser adapter harness

Execution status: **EXECUTED in IAB Chromium156 on Windows, 26/11/2026**. M11:6 adapter groups PASS and D07 not applicable. M12A:7 adapter groups PASS. See ../m11-native-iab.json and ../m12a-native-iab.json. The earlier native Windows URL safety blocker still prevents Chrome/Edge stable-profile acceptance; IAB runs occurred in a new user turn after the approved IAB connection resumed. Product UI requirements remain separate.

Serve this unchanged test harness through each exact worktree's Vite dev server. It imports the real application modules from `/src/`. No application source is patched. Use a dedicated browser profile and a distinct origin for each PR because the harness replaces the origin's genealogy database with synthetic fixtures.

URL path: `/docs/qa/m1-desktop/evidence/runtime-harness/index.html?profile=<recorded-profile-label>`.

- On PR #2 SHA `6e2ba3c7a8896a0027d8d7f8198e4d5b3ab2d44e`, select **Run M11 adapter checks**.
- On PR #3 SHA `43d9b0271c9f2fdb53f419b2fd507a7a6dd80748`, select **Run M12A adapter checks**. M11 can also be rerun there as regression.
- Download the JSON evidence after each suite. The browser user agent, expected SHA, origin, fixture snapshots, assertions and errors are included. Verify the actual serving worktree SHA externally; a label is not evidence of Git revision.
- **Prepare M11 linked fixture for product UI** sets up the extended M0 fixture. Open the application root at the same origin in the same dedicated profile for the separate product-modal checks.

The harness uses real browser IndexedDB, not `fake-indexeddb`. Test-only fault injection wraps native `IDBObjectStore.put/add/delete` briefly, restores the prototype in `finally`, compares every collection and setting before/after rejection, then retries. Snapshot comparison omits only generated `exportedAt` and sorts record collections by ID; record timestamps remain significant.

M11-D07 is intentionally `NOT_APPLICABLE` here because native PDF output and Git cleanliness require the product UI and Windows CLI. All other cases report **adapter** assertions only. Product success/error text, timeline/tree rendering, two-tab user interactions, confirmation click locking and safe modal closing remain explicitly pending in each JSON case. Do not convert an adapter PASS into a full handoff-case PASS.

Fixture lineage extends M0's synthetic `merge-fixture.json`: retains `m0_target`, `m0_source`, root/founder/story/media identifiers, then adds two source events, one target event, three generations, two unions, a single-partner union, a step child and a compatible duplicate edge. No real family data or API credentials are used.
