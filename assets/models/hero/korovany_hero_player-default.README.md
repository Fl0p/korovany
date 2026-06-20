# korovany_hero_player-default_v11 — v1.1 hero asset #1

- Role: Hero (player avatar). Spec: visual language v1.1 (low-poly, board mandate).
- Final GLB: korovany_hero_player-default_v11.glb — 2,894 tris, 471 KB, 4× 1024 JPEG PBR maps.
- Budget check (v1.1 §5 Hero): tris 2,894 / 3,000 cap OK; size 0.46 / 1.0 MB OK; tex tier 1024 OK.
- Pipeline: text preview (target_polycount=2800) -> refine (enable_pbr) -> resize textures to 1024.
- Meshy tasks: preview 019ee505-baea-73e0-9bab-6e444010fcdb (20cr); refine 019ee506-b803-7794-ae16-2cc3552b9e31 (10cr). Total 30cr.
- Prompt + negative: see gen_hero_v11.sh (reproducible).
- Concept: brown bomber-jacket survivor (matches v01); re-expressed at low-poly budget.
- Style note: at 2,894 tris Meshy reads semi-realistic, not hard-faceted — flagged for Iris.
