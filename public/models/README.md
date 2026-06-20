# public/models/

Web-ready GLB models, served by Cloudflare Pages at `/models/<name>.glb` and
loaded at runtime via `loadModel()` (`src/scenes/modelLoader.ts`).

- These `*.glb` files are tracked by **Git LFS** (`.gitattributes`). Run
  `git lfs install` once before cloning or committing.
- Generate with the `meshy-3d` skill (`tools/meshy-3d/`), review the output
  against the asset budget, then move the approved GLB here.

## Current models

- `chest.glb` — textured low-poly chest (FLO-261/263).
- `korovany_hero_player-default.glb` — player hero, low-poly (2,894 tris ·
  471 KB · 4× 1024 PBR), within the v1.2 §5 Hero budget (FLO-260). Source
  render + reproducible spec sheet in `assets/models/hero/`.

See `docs/decisions/0001-asset-hosting.md` and `0002-glb-import-contract.md`.
