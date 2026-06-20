# Generated 3D assets

Catalog of the game's generated 3D models. All models are produced **per
concrete character/prop ticket only** (never speculatively — board directive
[FLO-270](/plan/game-plan)) via the `tools/meshy-3d` pipeline, in **low-poly
visual language v1.2** (≤ 3000 tris/object, flat-shaded palette materials).

Files live under `public/models/*.glb` and stream into the scene through the
[asset-streaming](./asset-streaming) registry. Binaries are stored in **Git
LFS** (see `.gitattributes`). Generation is reproducible from the recorded Meshy
task id (`python tools/meshy-3d/meshy.py status <task_id> --kind text-to-3d`).

## Licensing

Generated assets are cleared for FlopBut's intended (incl. commercial) use under
the Meshy paid-plan terms, which grant full commercial ownership of generated
output. No infringing reference inputs are used, and these assets are kept out of
any Community/showcase page.

## Characters & props

| Asset | File | Tris | Size | Rig | Meshy task id |
|-------|------|------|------|-----|---------------|
| Player hero (elf) | `public/models/korovany_hero_player-default.glb` | 2894 | — | static (no skeleton) | — |
| Conifer tree | `public/models/forest-tree.glb` | 1357 | — | static | — |
| Wooden hut | `public/models/wooden-hut.glb` | 1893 | — | static | — |
| Chest | `public/models/chest.glb` | — | — | static | — |
| **Empire soldier (enemy)** | `public/models/empire-soldier.glb` | **2794** | 130 KiB | static (no skeleton) | `019ee601-93f0-7988-86f8-e35ce1067881` |

### Empire soldier (enemy) — Phase 2

Napoleonic-era Empire infantryman: bicorne hat, greatcoat, boots, musket held
across the body. Generated for [FLO-311](/plan/game-plan) (feeds the enemy-NPC
ticket E2.3).

- **Budget:** 2794 tris ≤ 3000 (v1.2). Bounding box ≈ 0.97 × 1.90 × 0.84 units
  (humanoid, ~1.9 tall). Preview-only — no PBR textures (refine is skipped for
  v1.2; PBR refine drifts the faceted low-poly look into a semi-realistic band).
- **Provenance:** Meshy text-to-3D preview, `--art-style realistic
  --target-polycount 3000`. Prompt: *"low-poly stylized empire soldier enemy,
  humanoid game character standing in a neutral A-pose, military uniform with
  peaked helmet and boots, holding a musket rifle, faceted flat-shaded surfaces,
  muted grey-green palette, full body, single character"*. Meshy emitted 3105
  tris; welded + decimated to 2794 with `gltf-transform` (`weld` → `simplify
  --ratio 0.9 --error 0.01`) to fit the budget — silhouette/bbox unchanged. 20
  Meshy credits (preview only).
- **Rig:** ships **unrigged (static mesh, no skeleton/animation clips)** — this
  matches the player hero GLB, which is also a static mesh, so the same loader /
  controller code handles it without special-casing. There is **no hero rig to
  reuse** (hero has 0 skeletons). E2.3 must therefore drive idle/walk/attack/death
  either procedurally (transform-level) or by adding a skeletal rig in a separate
  pass (Meshy auto-rigging is available but was out of scope for this asset-only
  ticket). Flag rig needs to Pygmalion if a skeletal pass is wanted.
- **Verification:** loads headless via `node tools/meshy-3d/smoke_load_glb.mjs
  public/models/empire-soldier.glb` → 2 meshes, 2794 tris, no errors.
