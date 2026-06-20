# Melee combat

The melee system is a pure state machine in `src/game/combat/` that handles the attack window, hit detection, and the `Damageable` contract. It has no Babylon or React imports — it is fully unit-testable in jsdom.

## Attack key

`F` (default binding `attack`). Edge-triggered: holding the key does not repeat.

## State machine

```
idle ──[attack pressed]──▶ windup (0.15 s)
       ──────────────────▶ active (0.10 s)  ← hitWindowOpen = true
       ──────────────────▶ recovery (0.25 s)
       ──────────────────▶ idle
```

Pressing attack during windup or recovery is a no-op (guard prevents spam).

## API

```ts
import { createMeleeAttack, stepMeleeAttack, getMeleeHits } from '../game/combat'

// Per-entity state
let attack = createMeleeAttack()

// In the game loop (fixed step):
const attackPressed = intent.attack && prevIntent.attack === false // rising edge
attack = stepMeleeAttack(attack, attackPressed, dt)

// Query hits during the active window:
if (attack.hitWindowOpen) {
  const hits = getMeleeHits(attack, casterPos, casterForward, enemyList)
  hits.forEach(h => h.takeDamage(25))
}
```

## `Damageable` contract

Any entity that can receive melee hits implements:

```ts
interface Damageable {
  position: Vec3
  takeDamage(amount: number): void
}
```

Enemy NPCs (E2.3) will implement this interface.

## Hit zone geometry

- **Radius**: 2 m sphere centred on the caster
- **Arc**: 120° frontal cone (±60° from the look direction)

Targets outside either bound are not returned by `getMeleeHits`.

## Parameters

```ts
interface MeleeAttackParams {
  windupDuration: number   // default 0.15 s
  activeDuration: number   // default 0.10 s
  recoveryDuration: number // default 0.25 s
}
```

Pass a custom `MeleeAttackParams` to `stepMeleeAttack` to override (useful for weapon variety in later phases).

## Tests

`src/game/combat/meleeAttack.test.ts` — 14 tests covering all phase transitions, edge-trigger guard, arc/range miss, multi-hit, and the `Damageable` dispatch integration.

---

## MPG.3 — Combat juice & hit feedback

Four pure-Babylon effects that fire on combat events. No new Redux slices.

### Screen shake (`src/game/camera/screenShake.ts`)

`ScreenShakeManager` applies a random positional offset to the camera target for a configurable duration (default 150 ms, amplitude 0.12 scene units). Triggered on player taking damage **and** on landing a hit.

```ts
const shake = new ScreenShakeManager()  // uses DEFAULT_SHAKE_PARAMS
shake.trigger()                          // arm or re-arm
const [dx, dy] = shake.update(dt)        // call each frame; returns [0,0] when idle
rig.camera.target.x += dx
rig.camera.target.y += dy
```

### Hit flash (`src/game/combat/hitFlash.ts`)

`HitFlashManager` temporarily overrides a `StandardMaterial`'s `diffuseColor` with a red tint for 80 ms on a hit, then restores the original colour. Meshes with non-Standard materials are silently skipped.

```ts
const flash = new HitFlashManager()
flash.flash(enemyMesh)   // call when a hit lands
flash.update(dt)          // call each frame to expire active flashes
```

### Floating damage numbers (`src/app/DamageNumber.tsx`)

`<DamageNumbers entries={...} onExpire={...} />` renders DOM overlays at viewport-percentage coordinates. Each entry lives 600 ms then calls `onExpire(id)`. The Babylon scene fires `emitDamage(amount, screenX, screenY)` from `src/game/combat/damageEvents.ts`; `App` subscribes via `onDamage(...)`.

### Death emphasis (`src/game/combat/deathEmphasis.ts`)

`DeathEmphasisManager` drops `engine.timeScale` to 0.3 for 250 ms on a kill, then restores it to 1.0. Works only on concrete `Engine` instances (sets `timeScale` when present).

```ts
const emphasis = new DeathEmphasisManager(engine)
emphasis.trigger()    // on kill
emphasis.update(dt)   // call each frame (wall-clock dt, not scaled)
```

### Event bridge (`src/game/combat/damageEvents.ts`)

Lightweight pub/sub crossing the Babylon ↔ React boundary without a circular dep:

| Function | Direction | Consumer |
|---|---|---|
| `emitDamage(amount, x, y)` | Scene → HUD | `App` shows floating number |
| `emitShake()` | Scene → HUD | future HUD shake hook |
| `emitKill()` | Scene → HUD | future kill-feed |

### Test coverage

- `src/game/camera/screenShake.test.ts` — 5 tests (timer, decay, re-trigger)
- `src/game/combat/hitFlash.test.ts` — 6 tests (tint, restore, dedup, no-mat guard)
- `src/app/DamageNumber.test.tsx` — 5 tests (render, expiry timer, event bridge)
