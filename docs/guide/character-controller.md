# Character controller & follow camera

The third-person controller (E1.1) is the core gameplay proof of the Phase 1
slice: a capsule character you walk, run, and jump around solid ground, tracked
by a collision-aware follow camera. It lives in two engine-agnostic-at-the-core
modules:

- [`src/game/controller/`](https://github.com/Flopsstuff/korovany/tree/main/src/game/controller) — capsule movement.
- [`src/game/camera/`](https://github.com/Flopsstuff/korovany/tree/main/src/game/camera) — the third-person rig.

Both follow the same split as the [input system](./input-system.md): a **pure
math core** with no Babylon/DOM imports (unit-tested under the headless
`NullEngine`), and a thin **Babylon binding** that wires the math to meshes,
rays, and the camera.

## Try it

The controller has a self-contained dev scene — open the app with the
`?dev=controller` flag:

```
https://korovany.aimost.pl/?dev=controller   # or http://localhost:5173/?dev=controller
```

A flat ground with a few pillars, the capsule (the hero GLB mounts on it), and
the follow camera. **Click the canvas** to capture the pointer for mouse-look.

## Controls

| Action | Key |
| ------ | --- |
| Move | **W A S D** |
| Sprint | hold **Shift** |
| Jump | **Space** |
| Look | mouse (after clicking to lock the pointer) |

Keys come from the data-driven [input bindings](./input-system.md#bindings), so
they are rebindable; the table above is the default map. Movement is
**camera-relative** — "forward" is always away from the camera — and diagonals
are normalised so they are not faster than cardinal movement.

## How it works

### Movement (`controller/movement.ts`)

`stepMovement(state, input, groundHeight, params, dt)` advances one fixed step
of the pure simulation. Each step, in order:

1. **Horizontal** — move by `speed · dt` along the world-space direction the
   binding resolved (walk or sprint speed).
2. **Jump** — on the *rising edge* of the jump input, if allowed (see below),
   set the upward jump velocity.
3. **Gravity** — integrate `velY -= gravity · dt`, then `posY += velY · dt`.
4. **Ground clamp** — if the feet would sink at or below the ground while
   descending, snap the capsule origin to `groundHeight + capsuleHalfHeight` and
   zero the vertical velocity. Clamping only when descending keeps a jump arc
   from being cut short by the ground it just left.
5. **Coyote bookkeeping** — refill the grace window while grounded, otherwise
   count it down.

The capsule's origin is its centre (matching Babylon's `CreateCapsule`), so the
feet rest on ground `g` when the origin sits at `g + capsuleHalfHeight`.

#### Jump, coyote-time, and no double-jump

- **Coyote-time** (`coyoteTime`, default `0.12 s`): a short grace window after
  walking off a ledge during which a jump is still allowed. It makes ledge jumps
  feel responsive instead of dropping inputs a frame late.
- **No double-jump**: a separate `canJump` guard is consumed by a jump and only
  refilled on landing, so a second jump is impossible in mid-air — even within
  the coyote window.
- Jump is **edge-triggered**: holding the key does not auto-bunny-hop; you must
  release and press again.

### Tuning (`MovementParams`)

| Param | Default | Meaning |
| ----- | ------- | ------- |
| `walkSpeed` | `4` | Ground speed, units/s. |
| `sprintSpeed` | `7` | Speed while Shift is held, units/s. |
| `gravity` | `24` | Downward acceleration, units/s². |
| `jumpSpeed` | `8` | Initial upward velocity of a jump, units/s. |
| `coyoteTime` | `0.12` | Grace window after leaving ground, seconds. |
| `capsuleHalfHeight` | `0.9` | Origin-to-feet distance (half the capsule height). |

The `CharacterController` binding keeps `capsuleHalfHeight` in lock-step with the
actual capsule mesh height so the feet always rest exactly on the ground.

### Ground collision

The binding casts a short ray straight down from the capsule origin
(`capsuleHalfHeight + groundProbe`, default probe `0.4`) and treats the picked
point's `Y` as the ground height — Babylon's built-in `pickWithRay`, no bespoke
physics engine. Out of reach → `null` → the capsule falls freely. The probe must
exceed one step of fall to avoid tunnelling at speed.

### Follow camera (`camera/`)

The rig wraps Babylon's built-in `ArcRotateCamera` (boring-tech lens — orbit,
zoom, and target tracking are solved) and adds two things:

- **Mouse-look** driven by the input system's accumulated `lookDX/lookDY` rather
  than `attachControl`, so look obeys the same intent pipeline as movement and
  stays pointer-lock friendly. Pitch is clamped to `[minPitch, maxPitch]` so the
  camera never flips over the top or sinks through the floor.
- A **collision-aware boom**: each frame a ray from the player toward the ideal
  camera spot pulls the radius in to `hitDistance − collisionMargin` when
  geometry would otherwise clip between the camera and the player. The boom never
  extends past the desired distance and never goes negative.

The rig follows the player by locking the camera's target to the capsule mesh,
so it tracks automatically as the controller moves.

#### Camera tuning (`CameraParams`)

| Param | Default | Meaning |
| ----- | ------- | ------- |
| `yawSensitivity` / `pitchSensitivity` | `0.0035` | Radians of orbit per pixel of mouse movement. |
| `minPitch` / `maxPitch` | `0.35` / `1.45` | Pitch clamp (radians from +Y). |
| `distance` | `6` | Desired boom length, units. |
| `collisionMargin` | `0.3` | Gap kept in front of an occluder the boom pulls in to. |

## Running under the loop

The `CharacterController` is a loop [`System`](./game-loop.md#adding-a-system):
register it with the fixed-step scheduler and it advances once per fixed step,
so movement stays framerate-independent. The host samples input once per render
frame, holds that intent for the frame's sub-steps, then updates the camera once
the controller has moved the player:

```ts
const controller = new CharacterController({ scene, camera: rig.camera, getIntent })
loop.scheduler.register(controller)

engine.runRenderLoop(() => {
  frameIntent = input.sample()                 // once per frame; clears look delta
  loop.advance(engine.getDeltaTime() / 1000)   // runs controller sub-steps
  rig.update(frameIntent.lookDX, frameIntent.lookDY) // look + boom, after the move
  scene.render()
})
```

See [`src/scenes/controllerPlayground.ts`](https://github.com/Flopsstuff/korovany/tree/main/src/scenes/controllerPlayground.ts)
for the full dev-scene wiring.

## Tests

- `controller/movement.test.ts` — pure gravity, ground clamp, jump,
  coyote-time window, and the no-double-jump rule.
- `camera/boom.test.ts` — pure look clamp and boom pull-in.
- `controller/characterController.test.ts` — the Babylon bindings under
  `NullEngine`: real downward-ray ground landing, camera-relative walking,
  jumping, running as a scheduler system, and the camera boom against a real
  occluder.
