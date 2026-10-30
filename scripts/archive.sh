#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/version.mjs --check
version=$(node -p 'require("./VERSION.json").version')
build=$(node -p 'require("./VERSION.json").build')
derived="${REMARQUE_ARCHIVE_DERIVED_DATA:-/tmp/remarque-build/archive}"
archive="${1:-$HOME/Library/Developer/Xcode/Archives/$(date +%F)/Remarque $version ($build).xcarchive}"
if [[ -e "$archive" ]]; then
  printf 'Archive already exists: %s\nChoose another path or advance the build number.\n' "$archive" >&2
  exit 1
fi
(cd Web && npm ci --ignore-scripts && npm run build)
xcodebuild -project RemarqueRebuild.xcodeproj -scheme RemarqueRebuild -configuration Release -destination 'generic/platform=macOS' -derivedDataPath "$derived" -archivePath "$archive" ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO archive
codesign --verify --deep --strict --verbose=2 "$archive/Products/Applications/Remarque.app"
printf '%s\n' "$archive"
