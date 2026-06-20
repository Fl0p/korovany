# game/

Engine-agnostic game logic — systems, entities, rules. No React or Babylon imports here so it stays testable.

## `loop/`

Fixed-timestep simulation loop (`FixedStepLoop`) decoupled from render FPS, plus
a tiny system-registration API (`SystemScheduler`, `System`). See
[`docs/guide/game-loop.md`](../../docs/guide/game-loop.md).
