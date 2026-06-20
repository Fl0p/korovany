# Game loop

The simulation runs on a **fixed timestep** decoupled from render FPS, in
[`src/game/loop/`](https://github.com/Flopsstuff/korovany/tree/main/src/game/loop).
It is engine-agnostic — no Babylon or React imports — so it runs (and unit-tests)
unchanged under jsdom.

## Why fixed-step

Render frame times vary (vsync, backgrounded tabs, slow GPUs). If gameplay
advanced by the raw frame delta, physics and movement would behave differently
at 30 vs 144 FPS, and a single long frame could teleport entities through walls.

A fixed-step loop instead advances the simulation in constant `dt` increments
(default `1/60` s). Each frame it adds the real elapsed time to an accumulator
and runs as many fixed steps as fit, so the simulation stays deterministic and
framerate-independent. Rendering can read [`loop.alpha`](#interpolation) to
interpolate between steps for smooth visuals.

## Pieces

| Type | Responsibility |
| ---- | -------------- |
| `System` | `{ update(dt, world) }` — one unit of game logic. |
| `SystemScheduler` | Holds systems and runs them once per step in deterministic order. |
| `FixedStepLoop` | Accumulates real time and drives the scheduler with a fixed `dt`. |

## Adding a system

A system is any object with an `update(dt, world)` method. The `world` is
whatever you thread through the loop (an entity store, plain state, …); the loop
never inspects it.

```ts
import { FixedStepLoop, type System } from '../game/loop'

interface World {
  position: number
  velocity: number
}

const movement: System<World> = {
  name: 'movement',
  update(dt, world) {
    world.position += world.velocity * dt
  },
}

const world: World = { position: 0, velocity: 5 }
const loop = new FixedStepLoop<World>({ world })
loop.scheduler.register(movement)
```

Then drive it from the host's render loop, feeding **seconds elapsed since the
last frame**. From a Babylon scene:

```ts
engine.runRenderLoop(() => {
  loop.advance(engine.getDeltaTime() / 1000) // ms → s
  scene.render()
})
```

`advance()` returns how many fixed steps ran that frame.

### Ordering

Systems run in registration order by default. Pass an explicit `order` to
control sequencing (ascending; ties keep registration order):

```ts
loop.scheduler.register(input, { order: 0 })
loop.scheduler.register(physics, { order: 10 })
loop.scheduler.register(camera, { order: 20 })
```

Use `unregister(system)`, `has(system)`, `clear()`, and `size` to manage the
set. Registering or unregistering from inside an `update()` takes effect on the
**next** step, not mid-iteration.

## Catch-up and the spiral-of-death clamp

When a frame runs long, the accumulator may hold several steps' worth of time;
the loop runs them back-to-back to catch up. To stop a long stall (debugger
pause, GC, backgrounded tab) from queuing hundreds of steps — each making the
next frame even slower, a *spiral of death* — `advance()` runs at most
`maxSubSteps` steps per call (default `5`) and discards the leftover whole-step
backlog, keeping only the sub-step remainder.

Trade-off: after a stall the simulation clock slows rather than fast-forwarding.
That is the intended behaviour — gameplay stays stable instead of lurching.

```ts
const loop = new FixedStepLoop({ world, dt: 1 / 60, maxSubSteps: 5 })
```

## Interpolation

`loop.alpha` is the fraction of the next step already accumulated (`[0, 1)`).
Renderers can interpolate between the previous and current simulation state by
`alpha` to decouple smooth rendering from the fixed simulation rate.

## API surface

Exported from `src/game/loop`:

- `FixedStepLoop` — `advance(frameTime)`, `step()`, `reset()`, `alpha`,
  `pending`, `dt`, `maxSubSteps`, `scheduler`.
- `SystemScheduler` — `register`, `unregister`, `has`, `clear`, `size`,
  `systems()`, `run(dt, world)`.
- `System`, `RegisterOptions`, `FixedStepLoopOptions` types and the
  `DEFAULT_DT` / `DEFAULT_MAX_SUB_STEPS` constants.
