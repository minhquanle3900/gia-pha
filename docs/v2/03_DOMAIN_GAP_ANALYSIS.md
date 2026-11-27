# V2 domain gaps and proposed capability map

**Baseline:** `7b745ebe553e6db6813ae2095d6f3bd11bc0ed97`. The request names eight “Connected Experience” items and twelve expansion groups but supplies no canonical list; no such Blueprint/Golden Design list exists in the baseline text docs. The numbered items here are **provisional analysis buckets for Coordinator review**, not approved requirements or implementation scope.

## Eight provisional Connected Experience items

| ID | Connection users might expect | V1 evidence | Gap and schema verdict |
| --- | --- | --- | --- |
| CE-01 | Profile as one entry to relatives, biography, events, media, stories and branch | [PersonProfileView](../../src/features/people/PersonProfileView.tsx) already joins people/graph/events/media; `FamilyStory.personIds` links stories | Read-only projection and navigation **without schema change**. Need stable selection/deep-link contract and missing-reference states. |
| CE-02 | “Nhà mình” as immediate partners, parents and children | `Union.partnerIds`, `Relationship.parentId/childId/unionId`; [context helpers](../../src/context/GenealogyContext.tsx) | A derived household card **without schema change**. Persisted household ID, members outside biological graph or shared residence **requires migration**. |
| CE-03 | Branch space with founder, people, memories and artifacts | `FamilyBranch`, person primary/secondary branch IDs, story/media branch IDs; Exhibition branch collection | Existing records support a branch projection **without schema change**. Branch roles/ownership, branch-scoped settings or explicit event affiliation **requires migration**. |
| CE-04 | Unified life/heritage chronology | `LifeEvent`, `FamilyYearTimeline`, stories with `periodLabel`, media with `dateLabel` | Mixed derived timeline **without schema change** if uncertain dates are labeled. Canonical event linkage from story/media or shared event participants **requires migration**. |
| CE-05 | Cross-content search with jump to exact object | [searchFamilyMembers](../../src/services/searchService.ts) only indexes persons/aliases/year/generation; journal/gallery have local filters | In-memory search projection of existing fields **without schema change**. Persistent search index/advanced access controls **requires migration** or another storage design. |
| CE-06 | Memory-to-person/branch/artifact trails | `FamilyStory.personIds`, `branchId`, `mediaIds`; [Exhibition catalog](../../src/features/gallery/exhibitionCatalog.ts) | Already modeled; reverse lookup and navigation **without schema change**. Ordered chapters/revisions/provenance **requires migration**. |
| CE-07 | Rites connected to people, dates and branch | Person lunar death anniversary, `Union.marriageDate`, LifeEvent, [year service](../../src/services/familyYearTimelineService.ts) | Display/reminders **without schema change**. Assignments, RSVP, shared task state and cross-device notifications **requires migration** and privacy design. |
| CE-08 | Durable cross-space return path and backup continuity | App callbacks, JSON v1 snapshot, PWA prompt-update | Navigation and read-only link resolver **without schema change**. Shareable deep links across devices **cannot imply shared data**; sync/identity would require a new approved architecture. |

## Twelve provisional expansion groups

This list is a planning frame, not a claim that V2 should implement all twelve.

| Group | Existing reusable fields/services | Minimum no-schema slice | Persisted gap / migration trigger |
| --- | --- | --- | --- |
| 01 Member identity/profile | Person, Profile, form | Aggregate and progressive profile views | New per-field privacy, revisions, identity aliases as entities |
| 02 Kinship and lineage | Relationship, Union, validation, kinship | Derived family cards and relative navigation | Non-person participants, custody/household graph distinct from lineage |
| 03 Branch governance | FamilyBranch, branch filters | Branch landing view and filtered records | Branch admins, permissions, scoped settings |
| 04 Life chronology | LifeEvent, FlexibleDate, timeline | Join existing events and computed dates | Event participants, direct media/story links, new date semantics |
| 05 Stories and memories | FamilyStory, journal, Exhibition | Person/branch/story traversal | Revision history, chapter order, citations |
| 06 Media archive | Media, Gallery, Exhibition | Category/person/branch collections | Blob storage split, rendition metadata, direct event IDs |
| 07 Rites and anniversaries | Lunar anniversary, rites/year service | Personal/branch calendar projections | Task assignment, attendance, schedules |
| 08 Nếp nhà / family precepts | `FamilyStory.category='communal_rule'` | Curated read-only precepts view | Versioned rules, approval workflow and applicability |
| 09 Heritage exhibits and book | Exhibition, PDF book services | Link existing artifacts/stories/persons | Curated exhibit objects, ordering, permissions |
| 10 Discovery/search | Person search, component-level filters | Local cross-record projection | Persistent index or search visibility ACL |
| 11 Privacy and collaboration | Local PIN, privacy lock, backup reminder | Explain local boundaries and selective display | Accounts, multi-device sharing, cryptographic protection, consent |
| 12 Portability and preservation | JSON v1, GEDCOM, CSV, snapshot merge | Continue v1 round trip and explicit lossy exports | New snapshot version, migration and rollback for any new entity/field |

## Domain decisions that cannot be inferred from V1

1. **Household identity:** Does “Nhà mình” mean current co-residents, nuclear family from parent/partner graph, the user's selected home person, or all three? V1 has no account/home-user identity. A UI projection can choose a focus person locally, but its meaning needs Product Blueprint approval.
2. **Branch ownership:** Is `secondaryBranchIds` membership equal to `branchId`, or should it only appear in cross-links? Founder and parent-branch references are present, but there is no authorization model.
3. **Event identity:** A `LifeEvent` has one `personId`; wedding anniversaries and death anniversaries can be computed without a corresponding `LifeEvent`. Do not invent `eventId` for computed items. Use a tagged resolver (`record:eventId` versus `derived:kind/personId/date`) until the product chooses persistence.
4. **Media source:** `Media.dataUrl` is local and embedded. A new CDN or cloud media path would alter privacy, offline and backup guarantees. Treat this as a separate decision.
5. **Search visibility:** Current V1 is local to the browser and has no per-person ACL. A cross-record search may reveal sensitive notes in the same unlocked session. Define visibility before exposing snippets or links.
6. **Culture rules:** Existing kinship and lunar rules have tests, yet alternative forms of address, adoption and regional rites need product/domain review. Preserve validated V1 behavior while specifying additions.
7. **Source ambiguity:** README/user guide describe broad capabilities. This analysis uses source and tests as evidence. Any proposed capability absent from those files remains unverified.

## Cross-record reference contract for design review

| Key | Authoritative V1 record | Existing links | Safe V2 read projection |
| --- | --- | --- | --- |
| `personId` | `people.id` | Relationship endpoints, Union partners, LifeEvent person, Story/Media person arrays, founder/root | Resolve to person; tolerate deleted/missing ID with an explicit unavailable state |
| `branchId` | `branches.id` | Person primary/secondary, Story/Media branch, parent branch | Resolve to branch; distinguish primary and secondary membership |
| `eventId` | `lifeEvents.id` | Only `LifeEvent.personId` today | Direct event link only for persisted LifeEvent; derived dates use a separate tagged key |
| `mediaId` | `media.id` | Person portrait ID, Story media IDs | Resolve artifact; no direct event link yet; never duplicate `dataUrl` to create a link |

**Decision gate:** Coordinator supplies/approves the canonical eight and twelve items and defines household/branch/event semantics before V2 UI or schema work.
