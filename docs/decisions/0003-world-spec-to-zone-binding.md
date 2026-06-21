# 0003 — World spec → zone content binding

- Status: Accepted
- Date: 2026-06-21
- Deciders: Daedalus (CTO), Wayland (impl)
- Context issue: [FLO-411](https://github.com/Flopsstuff/korovany)

## Context

The three world specs (`docs/guide/worlds/*.md`) describe each zone's lore,
landmarks, encounter hooks, and asset needs in prose. Until now that prose bound
to the running game only as `loreName` strings in `src/game/world/zones.ts`, plus
**hardcoded magic-number arrays inline in each scene** — e.g. a
`const LANDMARKS: [number, number, number, number, number, number][]` in
`humanLandsScene.ts` and `FOREST_SOLDIER_SPAWNS` / `FOREST_CARAVAN_SPAWNS` in
`forestScene.ts`. The specs nobody's code reads; the numbers nobody's spec
explains. MPG.5 ("populate the world") and every future zone build need one
source of truth for *what is in a zone*.

## Decision

World specs are **content briefs**, not data the engine parses. They attach to
the four-zone registry through a typed, engine-agnostic content layer:

- `src/game/world/zoneContent.ts` exports
  `ZONE_CONTENT: Record<ZoneId, ZoneContent>`, where each `ZoneContent` carries:
  - **`landmarks`** — `ZoneLandmark[]`: `id`, design `role`, `{x, z}` position,
    `height`/`size`, and either a greybox `color` or an `assetKey` for a streamed
    GLB. Seeded from each spec's "Landmark briefs".
  - **`encounterAnchors`** — `EncounterAnchor[]`: named `{x, y, z}` spawn points
    tagged `soldier | caravan`, distilled from each spec's "Encounter hooks".
- `getZoneContent(zoneId)` is the accessor, sitting next to `getZone()` and
  re-exported from `src/game/world/index.ts`. It is **total** over the `ZoneId`
  union — locked zones return an empty table — so callers holding a `ZoneId` never
  branch on `undefined`.
- The two `available` zones carry real content seeded from their specs
  (`human-lands` ← `velya-salt-road.md`, `forest` ← `lysaen-emerald-thicket.md`).
  `empire` and `mountains` stay `locked` with empty content until their scenes
  exist.
- **Division of responsibility:** landmark/encounter *data* lives in code
  (`zoneContent.ts`); *prose* (lore, mood, traversal notes, asset priorities)
  stays in `docs/guide/worlds/`. The two are linked by the `ZoneId` key and by
  ADR reference, not duplicated.

Scenes consume the table by id (`humanLandsScene` renders its landmark greyboxes
from `zoneContent`; both scenes derive their soldier/caravan spawns from the
encounter anchors) instead of carrying inline constants.

### Lenses

- **Schema is forever.** `ZoneContent` is keyed by `ZoneId`, and `ZoneId`s are
  persisted in saves (`playerSlice.zoneId`). The keys are forever — never rename a
  zone id without a save migration. Landmark/anchor `id`s are likewise stable
  identifiers, not display strings.
- **Trust the boundary.** The content table's shape is validated **once** in
  `zoneContent.test.ts` (every available zone has ≥1 landmark; every landmark and
  anchor type-checks and carries the required fields). Scenes downstream of that
  boundary trust the table and do not re-validate it.

## Consequences

- MPG.5 and future zone builds read one source of truth; adding a landmark or
  encounter is a data edit in `zoneContent.ts`, not a scene-code change.
- `humanLandsScene`'s inline `LANDMARKS` const and both scenes' inline spawn
  arrays are gone; the human-lands greybox still renders identically (the table is
  seeded from the exact prior numbers — guarded by a pure-extraction test).
- Landmarks can migrate from greybox `color` to streamed `assetKey` without
  touching scene code — the scene already reads geometry + appearance from data.
- The forest scene streams its environment via GLB assets rather than greybox
  boxes, so its landmark data is currently consumed only by tests and MPG.5, not
  rendered as boxes — intentional; the data still exists as the populate-pass
  source of truth.
