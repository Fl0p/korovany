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
│   ├── app/               # app shell & top-level composition (App.tsx)
│   ├── components/        # reusable React UI components
│   ├── engine/            # framework-agnostic Babylon Engine/Scene bootstrap (no React)
│   ├── scenes/            # Babylon scene wiring & GLB loaders (GameCanvas.tsx)
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
| Engine/Scene lifecycle, render | `src/engine/` (no React imports)    |
| A Babylon scene/world          | `src/scenes/`                       |
| Reusable UI (buttons, HUD)     | `src/components/`                    |
| Game logic (no React/Babylon)  | `src/game/`                         |
| Shared state                   | `src/store/` (a new slice)          |
| A 3D model / texture / sound   | `assets/` (tracked by Git LFS)      |
| Documentation                  | `docs/` (same change as the code)   |

## Data flow

`main.tsx` mounts React inside a Redux `<Provider>`. The full-page app shell in
`src/app` renders the `GameCanvas` (a thin React wrapper in `src/scenes/`) that
hands its `<canvas>` to `createGameEngine` in `src/engine/`. The engine module is
the single owner of the Babylon `Engine`/`Scene` lifecycle — create, render loop,
DPR-aware resize, and dispose — and imports no React, so it stays unit-testable
against Babylon's headless `NullEngine`.

UI in `src/app` and `src/components` reads state via the typed `useAppSelector`
hook and dispatches via `useAppDispatch` (both from `src/store`). The engine and
game systems can read/dispatch to the same store, so rendering and UI stay in
sync through Redux.
