# Seeded RNG

Gameplay rolls that must replay identically (loot tables, caravan drops, spawn
placement) must not use global `Math.random()`. Use the seeded PRNG in
`src/game/util/rng.ts` instead.

## API

| Export       | Role |
| ------------ | ---- |
| `createRng`  | `(seed: number) => Rng` — mulberry32 stream of floats in `[0, 1)` |
| `randInt`    | `(rng, min, max) => number` — uniform integer, both ends inclusive |
| `pick`       | `(rng, array) => T` — uniform element; throws on empty array |

```ts
import { createRng, pick, randInt } from '../game/util/rng'

const rng = createRng(2024)
const roll = rng()
const qty = randInt(rng, 1, 5)
const item = pick(rng, ['herb', 'coin', 'gem'])
```

The same numeric seed always yields the same sequence, so unit tests can assert
exact outcomes and save/load can reproduce a run.

## When to use it

- **Seeded:** loot rolls, procedural placement tied to a zone or entity id,
  anything that must match between test runs or after reload.
- **Unseeded:** cosmetic jitter, one-off VFX — plain `Math.random()` is fine.

## Related modules

- `src/game/util/seededRandom.ts` — object-style wrapper (`createSeededRng`) with
  `next()`, `nextInt()`, and `seedFromString()` for string-derived seeds. Used
  by caravan loot today; new code may prefer either API.
- `src/game/loot/` — weighted loot tables consume a seeded RNG via
  [`rollLoot`](./caravans.md#loot-tables).

Tests: `src/game/util/rng.test.ts`, `src/game/util/seededRandom.test.ts`.
