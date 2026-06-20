# Architecture

## Folder structure

```
korovany/
├── .github/workflows/     # CI/CD: deploy.yml (Cloudflare Pages), docs.yml (GitHub Pages)
├── assets/                # source binary assets, tracked via Git LFS (models, textures, audio)
├── docs/                  # this VitePress documentation site → GitHub Pages
│   ├── .vitepress/        # docs site config
│   ├── guide/             # getting-started, project rules, architecture
│   └── operations/        # deployment & credentials runbooks
├── public/                # static files served as-is at the web root
├── src/
│   ├── app/               # app shell & top-level composition (App.tsx, full-page stage)
│   ├── components/        # reusable React UI components
│   ├── engine/            # Babylon Engine/Scene lifecycle (createGameEngine, resize, dispose)
│   ├── scenes/            # Babylon.js scenes + GameCanvas.tsx (thin React wrapper)
│   ├── game/              # engine-agnostic game logic (systems, entities, rules)
│   ├── store/             # Redux Toolkit store + slices, typed hooks
│   ├── hooks/             # shared React hooks
│   ├── assets/            # assets imported & bundled by Vite
│   ├── styles/            # global styles
│   ├── types/             # shared TypeScript types
│   └── test/              # test setup (setup.ts)
├── AGENTS.md / CLAUDE.md  # rules for automated contributors
└── index.html             # Vite entry
```

## Where new code goes

| You are adding…                | Put it in…                          |
| ------------------------------ | ----------------------------------- |
| A Babylon scene/world          | `src/scenes/`                       |
| Engine/render-loop lifecycle   | `src/engine/`                       |
| Reusable UI (buttons, HUD)     | `src/components/`                    |
| Game logic (no React/Babylon)  | `src/game/`                         |
| Shared state                   | `src/store/` (a new slice)          |
| A 3D model / texture / sound   | `assets/` (tracked by Git LFS)      |
| Documentation                  | `docs/` (same change as the code)   |

## Data flow

`main.tsx` mounts React inside a Redux `<Provider>` and renders the full-page
app shell (`src/app/App.tsx`): a `100vw × 100vh` stage holding the 3D canvas
with a HUD overlay. UI reads state via the typed `useAppSelector` hook and
dispatches via `useAppDispatch` (both from `src/store`).

The Babylon lifecycle lives in `src/engine/`: `createGameEngine(canvas)` owns
the `Engine`/`Scene`, the render loop, the high-DPI resize handler, and
`dispose()`. The React side stays thin — `src/scenes/GameCanvas.tsx` only mounts
the engine against a ref'd canvas and disposes it on unmount. Engine code can
read/dispatch to the same store, so game systems and UI stay in sync through
Redux.

## Game loop & system scheduler

Simulation is **decoupled from render FPS**. The render loop (Babylon's
`engine.runRenderLoop`) draws every frame; simulation advances in fixed,
constant-size steps owned by `src/game/loop/` (`FixedStepLoop`). Each rendered
frame calls `loop.tick()`, which reads an injectable clock, measures the elapsed
time, and runs as many fixed steps as that time covers — so the number of
simulation steps depends only on elapsed wall-clock time, never on how fast or
jittery the frames arrive. `src/game/loop/` imports neither Babylon nor React,
so the whole loop is unit-tested headlessly.

**Fixed timestep.** Every step runs with the same `dt` (default `1/60`s, 60 Hz).
Real elapsed time is accumulated; whole `dt` chunks are drained one at a time
and the sub-`dt` remainder is carried to the next frame. This keeps physics and
gameplay deterministic: the same sequence of frame times always produces the
same number of steps in the same order.

**Spiral-of-death clamp.** A single `tick()` runs at most `maxSubSteps` steps
(default 5). After a long stall (debugger pause, backgrounded tab, GC hitch) the
backlog beyond the clamp is discarded rather than replayed, so the loop recovers
instead of falling permanently further behind. A backwards or non-finite clock
delta is treated as zero; `loop.reset()` re-seeds the clock baseline after an
intentional pause so the gap is not replayed as one huge frame.

**System contract.** Game logic is split into *systems* registered with the
scheduler:

```ts
engine.loop.registerSystem({
  name: 'movement',   // unique id; also used for unregister and ordering ties
  order: 10,          // optional; lower runs first, default 0
  update(dt, world) { /* advance one fixed step */ },
})
```

- `update(dt, world)` is called once per fixed step. `dt` is always the fixed
  timestep (never the variable frame time). `world` is the shared context
  threaded through the loop — currently a minimal `{ scene }` (`GameWorld`); a
  richer ECS world arrives in a later phase.
- Systems run in a **stable, explicit order** each tick: ascending `order`, ties
  broken by registration order. The order is deterministic across runs.
- Registering a duplicate `name` throws. (Un)registering a system during a tick
  takes effect on the *next* tick — the running set is snapshotted per tick.

Tests inject a fake clock (`{ clock }`) or call `loop.advance(seconds)` directly
to replay exact frame-time sequences without touching `performance.now()`.
