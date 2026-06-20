# Save system

Korovany persists player progress locally so a game survives a browser reload.
The system is small and deliberately scoped: a versioned snapshot of the player,
stored in **IndexedDB**, restored on **Continue**.

Source lives in [`src/game/save/`](https://github.com/Flopsstuff/korovany/tree/main/src/game/save).

## What is saved

A save record is a single small JSON-shaped object:

| Field       | Meaning                                                        |
| ----------- | ------------------------------------------------------------- |
| `version`   | Schema version the record was written with (currently `1`).   |
| `transform` | Player capsule pose: `position` (`x,y,z`) + `rotationY` (yaw). |
| `health`    | Player health as `{ current, max }` so max HP survives reload. |
| `zoneId`    | Identifier of the zone the player was in.                     |
| `savedAt`   | Epoch milliseconds the snapshot was taken (picks the latest). |

Only this compact state is persisted. **Assets are never saved** — meshes,
textures and audio always stream from their own pipeline. This mirrors the
"one small volume" lens: the save store holds a tiny payload, never bulk data.

The transform comes from the live Babylon capsule; `health` comes from the
canonical `healthSlice` (`{ current, max }`, the single health authority); and
`zoneId` comes from the Redux `player` slice. (Zones are a placeholder today —
E1.1 is movement + camera only — so the `player` slice seeds a sensible default:
`zoneId: "forest"`. Health is real as of E2.1.)

## Where it is stored

In the browser's **IndexedDB**, database `korovany-save`, object store `slots`
keyed by a numeric slot id. There is currently **one slot** — slot `0`, the
autosave slot. The slot model is built to grow: `saveGame`/`loadLatest` already
take a `slot` option and `latest()` selects by `savedAt`, so additional slots are
a UI concern, not a format change.

The data lives only on the user's device. It is not uploaded anywhere and is not
shared between browsers or machines.

## The scene bridge (required wiring)

The UI layer decides _when_ to save, but only the live Babylon scene knows the
player's pose. They meet through
[`src/game/save/playerRuntime.ts`](https://github.com/Flopsstuff/korovany/blob/main/src/game/save/playerRuntime.ts):

- **Every scene mounted into the `playing` state must call `registerPlayer({ read, write })` on boot** and the returned unregister function on dispose.
  `read` returns `controller.snapshot()`; `write` calls `controller.teleport(t)`.
- Autosave-on-pause reads the pose via `readPlayerTransform()`. **If no scene
  registered a handle, this returns `null` and the autosave silently writes
  nothing** — so the wiring is not optional.
- Continue stages the loaded pose with `stageSpawn()` (consumed by the next
  scene's `takeSpawn()`) _and_ `applyPlayerTransform()` to teleport an
  already-running scene, covering both "scene boots after Continue" and "scene
  already running".

Both the live forest zone (`forestScene.ts`) and the `?dev=controller`
playground register this handle; `forestScene.test.ts` guards the registration
so the slice cannot regress to saving nothing.

## When it saves and loads

- **Autosave on pause.** Entering the paused state (Escape from play, the E1.0
  pause transition) writes the current player snapshot to the autosave slot.
- **Continue.** The main-menu **Continue** button loads the most recent slot,
  restores health + zone into the store, and teleports the player to the saved
  transform. It is **disabled with an empty-state hint when no save exists**.
- **New Game** resets the player to defaults; it does not erase the autosave, so
  a later Continue still resumes the last paused session until it is overwritten.

## Retention and clearing

Saves persist until overwritten by the next autosave or cleared. There is no
expiry. Programmatic clearing is available via `clearSave()`. Because the data
lives in IndexedDB, a user can also remove it by clearing site data for the app's
origin in their browser. Corrupt or unreadable records are ignored on load (the
game falls back to the empty-save state) rather than crashing.

## Schema is forever

Once a field ships it is **never renamed or silently repurposed**. Evolving the
format means bumping `SAVE_VERSION` in
[`src/game/save/types.ts`](https://github.com/Flopsstuff/korovany/blob/main/src/game/save/types.ts)
and adding a forward-migration step in `schema.ts` that maps the old shape onto
the new one. `parseSaveData()` validates and migrates every record on read, so a
save written by an old build still loads in a newer one.

## Testing

The whole layer runs headless under jsdom by injecting an `IDBFactory`
(`fake-indexeddb`) into `openSaveStore(factory)` / the convenience helpers — no
globals required. See `src/game/save/save.test.ts` for the round-trip,
version-field, empty-store and corrupt-record cases.
