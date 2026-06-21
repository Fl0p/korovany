# Dev tools

Developer-only conveniences that are gated out of production builds. They exist
to help inspect and debug the game; none of them change shipped behaviour.

## Unlock all zones (FLO-469)

By default the world map gates fast-travel behind sequential conquest: a world
opens only once the previous one is conquered (ADR 0005, see
[World map & zones](./world-map)). To **inspect every map** without playing
through the campaign, a dev-only override marks all registered zones
(`forest`, `human-lands`, `empire`, `mountains`) as unlocked, so each is
selectable and travelable from the world-map overlay (press **M** in play).

It is **travel/routing only** — it does not grant conquest credit, write to the
save, or alter any other progression. Production builds are unaffected.

### Turning it on

The gate is resolved by `isDevZoneUnlockEnabled()` in
[`src/game/world/devUnlock.ts`](../../src/game/world/devUnlock.ts), read once at
startup in `App`. Resolution (first match wins):

| Condition                         | Unlock all zones? |
| --------------------------------- | ----------------- |
| `VITE_DEV_UNLOCK_ZONES=true`      | **on** — even in a built/preview bundle |
| `VITE_DEV_UNLOCK_ZONES=false`     | **off** — even in a dev build (exercise the real gate) |
| flag unset, `npm run dev`         | **on** (dev build default) |
| flag unset, prod build            | **off** |

So the common cases need no setup:

- **Local inspection:** `npm run dev` → open the app, press **M**, travel anywhere.
- **Test the real conquest gate in dev:** `VITE_DEV_UNLOCK_ZONES=false npm run dev`.
- **Deployed preview the board can poke:** build with
  `VITE_DEV_UNLOCK_ZONES=true npm run build` (do **not** set this on the
  production deploy).

> ⚠️ Do not set `VITE_DEV_UNLOCK_ZONES=true` for the production Cloudflare Pages
> build — that would ship the override and let real players skip progression.

### Scene caveat

Every zone has its own scene (`createZoneScene` in
[`src/scenes/zoneScenes.ts`](../../src/scenes/zoneScenes.ts)): `forest`,
`human-lands`, `empire` (palace) and `mountains` (Black Crown Pass). Travelling
with the override mounts each zone's real scene — there is no forest fallback for
the unlocked maps.
