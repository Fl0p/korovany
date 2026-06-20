# Health system

The health system is a pure-function model (`src/game/health/`) backed by a Redux slice (`healthSlice`). It tracks the player's current/maximum hit points, whether they are alive, and when they were last hurt — and wires 0 HP to a dedicated **death state** with respawn (E2.1).

> **Units.** Hit points (HP) are an abstract integer pool. The player starts at `max = 100`; damage and healing are plain HP amounts. There is no passive regen — HP changes only through the damage funnel, heals, reset, or a loaded save.

## Slice state

```ts
interface HealthStoreState {
  player: { current: number; max: number } // canonical HP, round-trips through the save
  isAlive: boolean                          // derived player.current > 0, kept in sync
  lastDamageAt: number | null               // epoch ms of the last hit this life
}
```

Selectors (`'../store'`): `selectPlayerHealth`, `selectIsAlive`, `selectLastDamageAt`.

## API

```ts
import { applyDamage, createHealth, healDamage, isAlive } from '../game/health'

const hp = createHealth(100)          // { current: 100, max: 100 }
const hit = applyDamage(hp, 30)       // { current: 70,  max: 100 }
const full = healDamage(hit, 30)      // { current: 100, max: 100 }
isAlive(applyDamage(hp, 9999))        // false
```

All functions are **pure** — they return a new `HealthState` and never mutate the input.

## The damage funnel (trust-the-boundary)

All player damage flows through **one** typed event, `applyPlayerDamage`. The
amount is validated exactly once at the funnel boundary (non-finite / ≤ 0 → 0);
internally the slice trusts it. The funnel clamps HP ≥ 0, refreshes `isAlive`,
and stamps `lastDamageAt`.

```ts
import { applyPlayerDamage } from '../store'

dispatch(applyPlayerDamage({ amount: 25, source: 'enemy', kind: 'physical' }))
//        amount: HP to remove (required)
//        source: 'enemy' | 'environment' | 'fall' | 'bleed' | 'debug' | 'unknown'
//        kind:   'physical' | 'fire' | 'poison' | 'true'
//        at?:    epoch ms; defaults to Date.now() (pass explicitly in tests)
```

## Redux actions

| Action | Payload | Effect |
|---|---|---|
| `applyPlayerDamage(e)` | `DamageEvent` | **The funnel.** Validate once, clamp at 0, set `isAlive`, stamp `lastDamageAt` |
| `damagePlayer(n)` | `number` | Numeric convenience (bleed ticks / legacy callers) — routes through the same funnel |
| `healPlayer(n)` | `number` | Restore player HP by *n*, clamp at max; revives if `current > 0` |
| `resetPlayerHealth()` | — | Restore HP to max (100), `isAlive = true`, clear `lastDamageAt` |
| `restorePlayerHealth(h)` | `HealthState` | Replace player HP with a loaded `{ current, max }` (used by Continue) |

Import from `'../store'`.

## Death state & respawn

Death is a first-class app phase (`appSlice`), not a bounce to the menu:

1. `App.tsx` watches `state.health.player.current`. At 0 HP during `playing`/`paused` it dispatches `playerDied()` → phase `'dead'`.
2. While `'dead'`, the **You Died** overlay shows and the forest scene is frozen — `GameCanvas` calls the scene's `setActive(false)` whenever the phase is not `'playing'`, so movement, input, melee and AI all stop (this also freezes the world on pause).
3. **Respawn** refills HP (`resetPlayerHealth`), clears injuries (`resetInjuries`), teleports the capsule to the safe spawn `(0, 2, 0)` via the `playerRuntime` bridge, then dispatches `respawn()` → phase `'playing'`.
4. **Quit to Main Menu** from the death screen returns to the menu; a later New Game resets HP.

## HUD

The in-game HUD (`App.tsx`) renders a labelled HP bar — `HP [▮▮▮▯▯] 60/100` —
sourced from `state.health.player`. The bar width tracks `current / max`; the
numeric value states the exact pool. Shown in every non-menu phase.

## Debug damage (dev only)

In dev builds (`import.meta.env.DEV`) a debug affordance drives damage before
melee/enemies are wired into a zone:

- Press **K** to take 10 HP of `debug`-sourced damage.
- Call `window.korovanyDamage(n)` from the console (defaults to 10).

Both route through `applyPlayerDamage`, so they exercise the real death/respawn
path. The affordance is removed entirely from production bundles.

## Save persistence

Player HP survives save/load. The HP travels through the versioned save schema as the `health: { current, max }` field — see [save-system.md](save-system.md) for the slot store and `SaveData` shape.

- **Autosave** (on the playing→paused transition) writes the live `state.health.player` into the save snapshot.
- **New Game** dispatches `resetPlayerHealth()` — always starts at full HP, discarding any saved value.
- **Continue** loads the latest save and dispatches `restorePlayerHealth(data.health)` — the persisted HP is restored exactly.

Because `health` is a required field of the current schema (v1), there is no "save without HP": legacy or malformed records are rejected by `parseSaveData` and forward-migrated by `migrate` when the schema version bumps, so a loaded save always carries valid HP.

## Injury & dismemberment

Alongside hit points, the health module models **limb/organ loss** and the three
canonical outcomes from the brief (`docs/plan/game-plan.md` §0). The model is
pure (`src/game/health/injuryModel.ts`) and backed by the `injurySlice`.

### Injury state

`InjuryState` carries a status for each tracked slot plus the bleed timer:

```ts
import { createInjuryState, severLimb } from '../game/health'

const injuries = createInjuryState()        // every slot 'intact', not bleeding
severLimb(injuries, 'leftHand').bleeding     // true — a lost hand opens a wound
```

Tracked slots (`Limb`): `leftHand`, `rightHand`, `leftEye`, `rightEye`,
`leftLeg`, `rightLeg` — each `'intact' | 'severed'`.

### The three outcomes

| Brief | Trigger | Modelled as |
|---|---|---|
| **Bleed-out** | lose a hand | `bleeding` flag → `tickInjuries` drains HP each second until treated; reaching 0 HP triggers the death → menu transition |
| **Half-screen** | lose an eye | `hasHalfScreenBlackout` / `selectHasHalfScreenBlackout` — true while an eye is severed |
| **Crawl** | lose a leg | `isCrawling` / `selectLocomotionSpeedMultiplier` — speed drops to `CRAWL_SPEED_MULTIPLIER` (0.35) |

Bleed drains `BLEED_DAMAGE_PER_INTERVAL` (3) HP every `BLEED_INTERVAL_SECONDS`
(1). A prosthetic/patch (`fitProsthetic`) restores a slot to intact (clearing
the half-screen); `treatBleeding` stops a bleed without restoring the hand.

### Redux actions & selectors

| Action | Payload | Effect |
|---|---|---|
| `severPlayerLimb(limb)` | `Limb` | Sever a slot; a hand also starts bleeding |
| `treatPlayerBleeding()` | — | Stop the active bleed |
| `fitPlayerProsthetic(limb)` | `Limb` | Restore a slot to intact |
| `advanceBleed(dt)` | `number` | Advance the bleed timer (no damage funnelling) |
| `resetInjuries()` | — | Restore every slot to intact |
| `tickInjuries(dt)` *(thunk)* | `number` | Advance bleed **and** funnel damage into `health` |

Selectors: `selectInjury`, `selectIsBleeding`, `selectHasHalfScreenBlackout`,
`selectIsCrawling`, `selectLocomotionSpeedMultiplier` — all importable from
`'../store'`. The HUD vignette and locomotion speed read these selectors; this
ticket delivers the model and the bleed→HP wire, leaving rendering and movement
application to their respective subsystems.

`App.tsx` ticks `tickInjuries(1)` once a second while the player is bleeding and
the game is `playing`, and resets both health and injuries on death.

## Tests

- `src/game/health/healthModel.test.ts` — 8 unit tests (pure functions)
- `src/game/health/injuryModel.test.ts` — injury model unit tests (pure functions)
- `src/store/healthSlice.test.ts` — 6 Redux tests
- `src/store/injurySlice.test.ts` — injury slice + `tickInjuries` health-wiring tests
- `src/app/App.test.tsx` — death → menu integration test
- `src/game/save/save.test.ts` — save round-trip preserves `health` (HP persistence)
