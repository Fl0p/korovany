# Objective & win/lose loop (world conquest)

The objective loop is what turns the forest sandbox into a *game*: a player who
clicks **New Game** is given a goal — **conquer the worlds** — surfaced on the
HUD, and the run ends in an explicit **win** or **lose** screen with a
**Restart** button. Score (kills + loot) is tracked throughout.

The campaign model (caravan **quotas per world**, sequential unlock, win when
every available world is conquered) is specified in
[ADR 0005](../decisions/0005-win-goal-conquest.md). This guide documents the
implementation.

## The run flow

App/run flow is the [`appSlice`](state-management.md) phase machine. The
objective loop adds two end-of-run phases:

```
menu → playing ⇄ paused
          │
          ├── every available world conquered ──▶ won  ──▶ (Restart → playing | Quit → menu)
          └── player HP reaches 0 ────────────────▶ lost ──▶ (Restart → playing | Quit → menu)
```

- `winGame` / `loseGame` only transition **from `playing`** — an already finished
  run never re-triggers, and a finished run cannot be paused.
- On `won`/`lost` the live zone scene is **unmounted**: `GameCanvas` keeps a scene
  only while `playing`/`paused`, so the win/lose overlay sits above the menu engine
  scene. Restart bumps the run and boots a **fresh** zone scene from scratch (the
  capsule, raided caravans, and corpses all reset with it).

## World conquest — quotas, unlock, win

Conquest is **data-driven** and reads three pieces of world data, all co-located
with [`ZONES`](world-map.md) in `src/game/world/zones.ts`:

| Data | Meaning |
| --- | --- |
| `ZONE_CARAVAN_QUOTAS` | Caravans to raid to **conquer** a world — forest 3, human-lands 5, empire 6, mountains 8. |
| `ZONE_CONQUEST_ORDER` | Campaign sequence; a world unlocks once the **previous** one is conquered. |
| `ZONES[id].status` | `available` (has a playable scene) vs `locked` (empire/mountains, no scene yet). |

The win condition reads `ZONES.status` — there is **no hardcoded world count**, so
the campaign auto-extends to four worlds the moment empire and mountains flip to
`available` and ship their scenes.

## The win/lose / conquest state machine

The *decisions* — is a world conquered, which worlds are unlocked, and is the run
still going, won, or lost? — are pure functions with no Redux/React/Babylon
dependency, so they are exhaustively unit-testable
(`src/game/objective/objectiveMachine.ts`):

```ts
isZoneConquered(zoneId, raidedByZone, quotas)          // → boolean
unlockedZoneIds(conquestOrder, raidedByZone, quotas)   // → unlocked prefix
evaluateOutcome({ raidedByZone, quotas, availableZoneIds, playerDead })
  // → 'playing' | 'won' | 'lost'
```

- **Conquered** — caravans raided in a zone reach its quota; an unknown zone (no
  quota) is never conquered.
- **Unlocked** — walking `ZONE_CONQUEST_ORDER`, the first world is always
  unlocked and each next world unlocks once the prior is conquered. This is
  progression gating only; `status` (does the world have a scene?) is intersected
  separately by the world map.
- **Win** = every `available` world is conquered. An empty available set can
  never win (guards a misconfigured zone table from declaring an instant
  victory). **Death takes priority over victory**, keeping `evaluateOutcome`
  total.

The App layer feeds these live state each frame (via the effects in `App.tsx`)
and drives the `appSlice` phase from the result.

## Objective & score state

Per-run progress lives in [`gameSlice`](state-management.md):

| Field | Meaning |
| --- | --- |
| `caravansRaidedByZone` | Caravans raided this run **per zone** — the conquest progress (`Record<zoneId, number>`). |
| `caravansRaided` | Flat total across all zones — informational / score path only. |
| `kills` | Soldiers defeated this run. |
| `score` | Running score shown in the HUD (see below). |

**Score** accumulates as the run plays: `KILL_SCORE` (10) per soldier defeated
plus the loot points (item count) of each caravan raided. Raids **beyond** a
world's quota still count and still score — pure farming.

Actions: `recordKill`, `raidCaravan({ zoneId, lootPoints })`,
`restoreRunProgress(byZone)`, `resetRun`. `raidCaravan` increments the **current
zone's** count (the dispatcher passes `playerSlice.zoneId`) and the flat total.
Both the New-Game flow (after the faction picker confirms) and the win/lose
**Restart** run the same full reset (`resetRun` + zone/HP/injuries/inventory)
before entering play — Restart reuses the current faction rather than
re-prompting.

A continued save **restores conquest progress**: `restoreRunProgress` rebuilds
`caravansRaidedByZone` from the persisted map (recomputing the flat total so the
two stay consistent); score and kills are not persisted and start fresh. See
[save system](save-system.md) (save **v5** added the per-zone map).

## How progress is fed from the scene

The forest scene stays decoupled from the store and reports events through
callbacks that `GameCanvas` adapts into dispatches:

- **Caravan raided** — defeating a caravan fires `onCaravanLooted(drop)`
  (see [caravans](caravans.md)). `GameCanvas` dispatches `pickUpLoot` per stack
  **and** `raidCaravan({ zoneId, lootPoints })` (reading the player's current
  zone), which advances that zone's conquest progress and folds the haul into the
  loot score.
- **Soldier killed** — `reapDeadSoldiers` fires `onEnemyKilled` once per fresh
  death (see [enemy AI](enemy-ai.md) / [corpses](corpses.md)); `GameCanvas`
  dispatches `recordKill`.

## HUD

While playing/paused the HUD shows the objective counter —
**Worlds conquered `X / N`** plus the current world's caravan progress
(e.g. `Forest 1/3`) — and the running `Score`. Fresh runs from the faction
picker also show the [onboarding intro](onboarding.md) overlay before play
begins, which names the first world and its quota. The win and lose screens reuse
the menu/pause overlay chrome with win- and lose-tinted accents; the win summary
reports how many worlds were conquered.

## Tests

- `src/game/objective/objectiveMachine.test.ts` — the conquest/win/lose machine:
  `isZoneConquered`, `unlockedZoneIds`, and `evaluateOutcome`
  (playing/partial/won/lost, death-priority, and empty-available edges).
- `src/store/gameSlice.test.ts` — per-zone raid reducers, `restoreRunProgress`,
  and selectors.
- `src/store/appSlice.test.ts` — `won`/`lost` transitions and guards.
- `src/game/save/schema.test.ts` — v4→v5 migration fills `caravansRaidedByZone`
  with no data loss.
- `src/app/App.test.tsx` — HUD objective/score, win and lose screens, and the
  end-to-end **Restart from win → fresh game** flow.
