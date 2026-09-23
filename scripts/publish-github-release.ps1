# Create GitHub Release for Foodpos Windows installer
# Prerequisites: gh auth login, then run from foodma-desktop root after npm run build:win

$ErrorActionPreference = "Stop"
$version = (Get-Content package.json | ConvertFrom-Json).version
$tag = "v$version"
$asset = "dist/Foodpos-$version-setup.exe"

if (-not (Test-Path $asset)) {
  Write-Error "Missing $asset — run: `$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run build:win"
}

gh release create $tag $asset `
  --title "Foodpos $version" `
  --notes @"
## Foodpos $version

Windows NSIS installer for Foodpos (restaurant POS & operations).

### Install
1. Download ``Foodpos-$version-setup.exe``
2. Run the installer (SmartScreen may warn on unsigned builds — More info → Run anytime)
3. Launch **Foodpos** from the Start menu

### Notes
- Requires a Foodma premium restaurant account
- Staff sign-in: email + access code from the vendor portal
"@

Write-Host "Published $tag with $asset"
Write-Host "Download page: https://github.com/abkaaar/deskApp/releases/latest"
