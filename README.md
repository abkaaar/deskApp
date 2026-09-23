# Foodpos

Windows desktop app for Foodma restaurants (checkout, kitchen, orders, staff).  
Repository folder: `foodma-desktop` · Product name: **Foodpos**.

## Prerequisites

- Node.js 18+
- npm
- Windows machine for `build:win` (NSIS installer)

## Setup

```bash
npm install
cp .env.example .env
```

Set production values in `.env` before packaging:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
# optional; defaults to foodma.co
VITE_WEB_ROOT_DOMAIN=foodma.co
```

Never ship an installer built with placeholder `.env.example` values.

## Development

```bash
npm run dev
```

## Build Windows installer

```bash
npm run build:win
```

Artifacts land in `dist/`, including:

- `Foodpos-1.0.0-setup.exe` (NSIS installer)

Packaging config: [`electron-builder.yml`](./electron-builder.yml)  
Icons: `resources/build/icon.ico` / `icon.png`

### Unsigned builds / Windows packaging notes

This release is **not code-signed**. Windows SmartScreen may warn; users can choose **More info → Run anyway**.

`electron-builder.yml` sets `win.signAndEditExecutable: false` so packaging works without Windows Developer Mode / symlink privileges (avoids winCodeSign 7z extract failures).

Auto-update is **not** enabled yet. Ship new installers via GitHub Releases; the in-app **Check for updates** button stays disabled until Phase 2 (`electron-updater`).

Build with:

```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run build:win
```

## Publish a downloadable release

1. Build with `$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run build:win`
2. Confirm `dist/Foodpos-<version>-setup.exe` exists
3. Log in once: `gh auth login`
4. Run:

```powershell
.\scripts\publish-github-release.ps1
```

Or:

```bash
gh release create v1.0.0 "dist/Foodpos-1.0.0-setup.exe" --title "Foodpos 1.0.0" --notes "First Windows installer for Foodpos."
```

Public download page on foodma-web: `/foodpos`  
Direct asset URL (this repo):

`https://github.com/abkaaar/deskApp/releases/latest/download/Foodpos-1.0.0-setup.exe`

Update `FOODPOS_VERSION` / `FOODPOS_GITHUB_REPO` in foodma-web `lib/foodpos-download.ts` when the repo or version changes.

## Project structure

```
app/                    # Renderer (React UI)
lib/main/               # Electron main process
lib/preload/            # contextBridge API
lib/shared/             # Shared config (APP_CONFIG name = Foodpos)
resources/build/        # Icons and macOS entitlements
```

## License

MIT
