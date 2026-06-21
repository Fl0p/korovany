# Settings & accessibility

Player-facing preferences live in [`src/game/settings/`](../../src/game/settings/)
and surface through the **Settings** modal (`SettingsPanel`) from the main menu
and pause overlay (E6.4, [FLO-425](/FLO/issues/FLO-425)).

## What is persisted

| Setting | Storage key | Default |
| ------- | ----------- | ------- |
| Key bindings | `korovany-settings` → `keyBindings` | [`defaultBindings`](../../src/game/input/bindings.ts) |
| Graphics quality (`low` \| `high`) | same blob → `graphicsQuality` | `high` |

The blob is versioned (`version: 1`) and run through `migrateSettings` on load
so older shapes forward-migrate without breaking. Audio mute/volume remains in
its own key — see [Audio system](./audio.md).

## Architecture

| File | Role |
| ---- | ---- |
| [`settingsStore.ts`](../../src/game/settings/settingsStore.ts) | Canonical state, `localStorage` persistence, subscribe API. |
| [`keyDisplay.ts`](../../src/game/settings/keyDisplay.ts) | `formatKeyCode` + action labels for the UI. |
| [`SettingsPanel.tsx`](../../src/components/SettingsPanel.tsx) | Accessible modal: rebind list, audio controls, quality toggle. |
| [`domAdapter.ts`](../../src/game/input/domAdapter.ts) | Loads bindings from the store on boot; live-syncs when settings change. |

Rebinding uses the pure [`rebind`](../../src/game/input/bindings.ts) helper —
conflicting keys are cleared so one physical key never drives two actions. The
settings UI rejects reserved keys (`Escape`, world-map `M`, bandage `B`).

## Graphics quality

The quality flag is stored and readable via `settingsStore.getGraphicsQuality()`.
Perf/streaming (E5.4) can consume it in a later pass; wiring the store + UI now
keeps the preference durable across reloads.

## Usage

```ts
import { settingsStore } from '../game/settings'

const quality = settingsStore.getGraphicsQuality()
settingsStore.subscribe((snapshot) => {
  console.log(snapshot.keyBindings, snapshot.graphicsQuality)
})
```

## Related docs

- [Input system](./input-system.md) — semantic actions and binding codes.
- [Audio system](./audio.md) — master volume/mute (embedded in Settings).
- [Performance budget](./performance-budget.md) — future consumer of quality tier.
