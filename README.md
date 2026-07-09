# DeskApp Boilerplate

A lean Electron desktop app starter with React, Vite, TypeScript, Tailwind CSS, Shadcn UI, custom window chrome, and a SQLite CRUD example.

## What's included

- **Electron 36** with electron-vite triple build (main / preload / renderer)
- **Custom frameless window** with titlebar controls and application menus
- **React 19** + React Router with sidebar layout
- **Shadcn UI** components and Tailwind CSS 4 theme
- **SQLite** via better-sqlite3 with a reusable `DatabaseService` and IPC factory
- **Tasks example** demonstrating the full data flow: schema → service → IPC → preload → Zustand store → page

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
# Build app bundles
npm run vite:build:app

# Package for your platform
npm run build:win   # Windows
npm run build:mac   # macOS
npm run build:linux # Linux
```

## Project structure

```
app/                    # Renderer (React UI)
  index.html            # HTML entry
  renderer.tsx          # React bootstrap
  app.tsx               # Root component + router
  pages/                # Route pages (Home, Tasks, Settings)
  components/           # UI, window chrome, layout
  stores/               # Zustand stores (tasks example)
  styles/               # Global CSS and Tailwind theme

lib/
  main/                 # Electron main process
    main.ts             # App lifecycle
    app.ts              # BrowserWindow factory
    database.ts         # SQLite init and schema
    services.ts         # DatabaseService + domain services
    ipc-handlers.ts     # IPC registration
  preload/              # contextBridge API
    preload.ts
    api.ts
  ipc/
    createCrudHandlers.ts  # Reusable CRUD IPC factory
  shared/
    types.ts            # Shared types (main ↔ renderer)
    config.ts           # App name, window defaults
  window/               # Window control IPC + menu config

resources/build/        # App icon and macOS entitlements
```

## Entry points

| Process  | Source                         | Built output              |
|----------|--------------------------------|---------------------------|
| Main     | `lib/main/main.ts`             | `out/main/main.js`        |
| Preload  | `lib/preload/preload.ts`       | `out/preload/preload.js`  |
| Renderer | `app/index.html` → `renderer.tsx` | `out/renderer/`        |

## IPC pattern

The renderer calls typed methods on `window.api`, which invoke IPC handlers in the main process:

```
TasksPage → tasksStore → window.api.tasks.create()
  → ipcRenderer.invoke('tasks:create')
  → registerCrudHandlers → TasksService → SQLite
```

Generic window controls use `window.api.invoke('window-minimize')` etc.

## Adding a new entity

1. **Schema** — Add a table in `lib/main/database.ts`
2. **Types** — Define the interface in `lib/shared/types.ts`
3. **Service** — Extend `DatabaseService` in `lib/main/services.ts`
4. **IPC** — Call `registerCrudHandlers('notes', notesService)` in `lib/main/ipc-handlers.ts`
5. **Preload** — Add a typed namespace to `lib/preload/api.ts`
6. **Store** — Create a Zustand store in `app/stores/` (copy `tasksStore.ts`)
7. **Page** — Add a route in `app/pages/Main.tsx` and a nav item in `app/components/layout/Sidebar.tsx`

## Configuration

App name and window defaults live in `lib/shared/config.ts`. Packaging settings are in `electron-builder.yml`.

## License

MIT
