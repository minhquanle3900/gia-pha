# V2 data preservation, migration and release strategy

**Status:** design proposal; no migration, schema change, dependency, deployment or V2 release occurred. Baseline RC2 is `7b745ebe553e6db6813ae2095d6f3bd11bc0ed97`.

## Invariants from V1

- Data lives in IndexedDB database `gia-pha-viet-coi-nguon-db`, DB version 1, eight stores; JSON snapshot `schemaVersion: 1` ([db.ts](../../src/database/db.ts), [model](../../src/models/genealogy.ts)). Both versions need deliberate handling; changing a TypeScript interface alone is not a migration.
- [JSON backup](../../src/services/jsonBackupService.ts) is the fidelity path. GEDCOM 5.5.1 and CSV adapters do not preserve every V1 or future V2 field; they cannot be the rollback source of truth.
- [Import validator](../../src/services/importValidationService.ts) checks IDs, references and ancestry/branch cycles. [Snapshot merge](../../src/services/snapshotMergeService.ts) rejects conflicting IDs. Any V2 snapshot format must preserve those protections and perform a transactionally complete import or fail without partial writes.
- Service worker prompt update, `skipWaiting: false`, `clientsClaim: false` ([vite.config.ts](../../vite.config.ts)) aim to avoid activating new assets in an open old client. IndexedDB remains separate from cache. Browser storage is origin-specific; `localhost`, `127.0.0.1` and `https://coi-nguon-gift.pages.dev` do not share records.
- PIN in [usePrivacyShield](../../src/hooks/usePrivacyShield.ts) is a UI lock, not encryption. No migration design may describe it as protecting exported JSON or raw IndexedDB.

## Release track A — no schema change

1. Implement only projections over existing records after design approval. Keep `DB_VERSION=1`, `SCHEMA_VERSION=1`, all eight stores and JSON v1 contract.
2. Before update, offer explicit JSON export and record checksum/record counts for a **synthetic** test dataset. Do not auto-upload backup or family data.
3. Run the existing 327-test baseline or successor, lint/build, import/merge/graph integrity tests, offline CRUD, gallery/media, PDF and PWA update tests. Recheck the exact output artifact on a stable HTTPS origin.
4. Roll back static assets/SW to a known good V1 deployment if needed. With unchanged schema, old and new code can read the same DB *only after* compatibility tests confirm it. Save pending drafts before update and close old clients to let the waiting worker activate.

## Release track B — a future schema change, only if approved

| Gate | Required action and evidence |
| --- | --- |
| Design | Name the exact new entity/field, owner and read/write rules; prove it cannot be derived safely from V1. Approve snapshot schema and DB version increment together. |
| Snapshot | Export/validate an untouched V1 JSON snapshot **before** opening a DB upgrade. Keep a user-controlled copy outside browser storage. Record counts and IDs by store, excluding content from logs. |
| Migration | Use `openDB` version upgrade transaction for new stores/indexes; preserve existing stores and IDs. Transform records idempotently or record a migration marker. Abort on error. No delete/reseed fallback. |
| Compatibility | Import v1 into new schema with explicit defaults and warnings; export a versioned new snapshot. Test parse→migrate→export, duplicate IDs, broken references, ancestor cycle, branch cycle, portrait/media/story links and failure abort. |
| PWA | Serve new build with hashed assets; prompt update; test two simultaneously open clients, offline reload and activation after last old client closes. Do not mix an old app shell with a DB version it cannot open. |
| Device | Use isolated synthetic browser profiles on Windows/Android/iOS. Real iPhone status stays SKIP until tested. Test quota pressure and large media backups. |
| Rollback | **Static rollback alone is unsafe after DB upgrade.** An old app opening a newer IndexedDB version may fail with `VersionError`, and browsers do not downgrade DB versions. Plan either a forward-compatible hotfix at the new DB version or a user-directed restore of the pre-migration V1 JSON in a clean, isolated origin/profile. Never silently clear user storage. |

## Proposed migration test matrix

| Scenario | Acceptance |
| --- | --- |
| Empty V1 and populated synthetic V1 | New build opens; exact record counts/IDs, founder/root and cross-links preserved |
| Multiple unions, adoptive/step relationships, secondary branch | No new cycle/orphan; kinship semantics unchanged |
| Events/stories/media/portraits | Every reference resolves; media bytes and Story media IDs survive backup/restore |
| V1 JSON round trip through V2 | Import v1 with documented defaults, export new version, reimport to fresh DB; compare semantic snapshot |
| Invalid ID/reference/cycle and malformed date | Reject before writes; DB snapshot remains byte/semantic equivalent |
| Aborted migration or quota error | No partial new state; user retains usable V1 backup and recovery instructions |
| Old tab + new SW, online/offline | No mixed code/data state; update prompt and activation behavior observed |
| Rollback from upgraded DB | Expected old-code failure documented; approved forward fix or explicit backup restore tested |

## Release controls

- Keep one fixed HTTPS hostname for successive versions; changing hostname is a *data migration between origins*, not an ordinary update. Distinct demo origins can be used for synthetic QA. Do not use real family data in discovery or automated fixtures.
- Record source SHA, built artifact SHA, test counts, manifest/SW revision and DB/snapshot versions in each release handoff. Capture backups only as user-owned files; logs may contain counts/IDs but no names, media or PIN.
- Preserve Privacy Lock, CSP, local fonts, offline shell and Gemini default OFF. A backend/sync launch would be a new product/security decision, not an incidental V2 migration.
- Keep V1 release and rollback artifacts available until V2 migration has passed the agreed device matrix and a restore drill. Do not merge main or deploy V2 through this discovery branch.

## Coordinator decision requested

Approve the **projection-first architecture** and commission Product Blueprint + Golden Design. Confirm the official eight Connected Experience items and twelve business groups. Defer schema/dependency/core replacement decisions until a specific gap has acceptance criteria and a tested migration/rollback route.
