# World map & zones

The world is split into **four zones** (game-plan §0). The world-map overlay
lets the player **fast-travel** between the zones that have a playable scene.
This is the Phase-3 scaffolding (E3.1); zone-streaming on border crossing is
E3.2, and the caravan/loot loop is E3.3/E3.4.

For the level-design lore and layout targets behind each zone, see the
[World specs](./world-specs).

## The four zones

| Id | Display name | Lore name | Owner | Status |
| -- | ------------ | --------- | ----- | ------ |
| `human-lands` | Human lands | The Salt Road of Velya | Neutral | available |
| `empire` | Empire | The Imperial March | The Emperor | locked |
| `forest` | Forest | The Emerald Thicket of Lysaen | Forest Elves | available |
| `mountains` | Mountains | Black Crown Pass | The Villain | locked |

`available` zones have a scene and can be travelled to. `locked` zones are
declared in the registry so the world map can list all four, but travel to them
is disabled until their scene is built. E3.1 ships **Forest** (the Phase-1
vertical slice) and a **Human-lands** stub so travel between two zones works
end-to-end.

## Zone registry

The registry lives in `src/game/world/` (engine-agnostic — no Babylon or React):

- `zones.ts` — the four `ZoneDefinition`s (`id`, `displayName`, `loreName`,
  `ownerFaction`/`ownerLabel`, `spawn` transform, `status`, and a `streaming`
  entry point referencing the zone's asset manifest + scene key).
- `index.ts` — lookups (`listZones`, `getZone`, `isZoneAvailable`) and the pure
  fast-travel resolver `planTravel(currentZoneId, targetZoneId)`, which validates
  the target (must exist, be unlocked, and not be the current zone) and returns
  the destination zone plus the spawn to teleport to.

Zone ids are persisted in saves via `playerSlice.zoneId`, so they are **forever**
— never rename one without a save migration.

## Fast-travel flow

1. The player opens the world map from the HUD **Travel** button or by pressing
   **M** during live play.
2. Selecting an available zone shows a **Travel / Cancel** confirm (a two-step
   affordance so a stray click never teleports the player).
3. On confirm, `App` calls `planTravel`, stages the destination spawn on the
   `playerRuntime` bridge (`stageSpawn`), and dispatches `setZone(targetId)`.
4. Changing `zoneId` remounts `GameCanvas` with the destination scene
   (`createZoneScene` in `src/scenes/zoneScenes.ts`), which consumes the staged
   spawn on boot (`takeSpawn`) — landing the player at the zone's spawn point.

The overlay handles its **empty**, **loading** ("Travelling…"), and **error**
states. It is built against the E3.1-UX requirements; visual polish tracks
Iris's wireframes.

## Streaming entry point (E3.2 hook)

`createZoneScene(zoneId, canvas, options)` is the single place a zone's scene is
booted. E3.1 loads eagerly; E3.2 grows this into load/unload on border crossing.
Each zone's `streaming.manifestId` names the asset manifest a future ticket will
stream in.
