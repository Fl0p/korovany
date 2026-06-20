# FLO-314 — Empire soldier NPC, visual-truth gate

Screenshots from the built app (`npm run build` → `vite preview`) at `?dev=forest`
→ **New Game**, captured via headless Chromium.

## `flo314-soldier-glb-forest.png`
The FLO-311 Empire soldier GLB (grey figure, upper right) loaded and spawned in
ForestScene alongside the player hero (centre). Confirms acceptance item 1 —
*"Loads the soldier GLB and spawns ≥1 instance in the existing ForestScene."*

## `flo314-soldier-closeup.png`
After walking the player toward the soldier (WASD), the soldier GLB is framed
close-up — the scene is live and interactive.

## Fight loop
The chase → attack → die behaviour (player swing reduces enemy HP → death;
enemy attack funnels damage to the player) is proven deterministically by the
NullEngine integration tests in `src/scenes/soldierEnemy.test.ts` and the FSM
unit tests in `src/game/ai/soldierFSM.test.ts`, since autonomous chase is hard
to stage cleanly in a single headless frame.
