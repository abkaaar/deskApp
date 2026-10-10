# Create GitHub Release for Foodpos Windows installer
# Prerequisites: gh auth login, then run from foodma-desktop root after npm run build:win

$ErrorActionPreference = "Stop"
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$tag = "v$version"
$asset = "dist/Foodpos-$version-setup.exe"
$notesFile = Join-Path $PSScriptRoot "release-notes.md"

if (-not (Test-Path $asset)) {
  Write-Error "Missing $asset. Run: `$env:CSC_IDENTITY_AUTO_DISCOVERY='false'; npm run build:win"
}

gh release create $tag $asset --repo abkaaar/deskApp --title "Foodpos $version" --notes-file $notesFile

Write-Host "Published $tag with $asset"
Write-Host "Download page: https://github.com/abkaaar/deskApp/releases/latest"
