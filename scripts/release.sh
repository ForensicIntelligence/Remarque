#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/version.mjs --check
identity="${REMARQUE_SIGNING_IDENTITY:-Developer ID Application: FI Forensic Intelligence, Ltd. (PATM9DNCLA)}"
derived="${REMARQUE_RELEASE_DERIVED_DATA:-/tmp/remarque-build/release}"
./scripts/test.sh
node scripts/licenses.mjs
xcodebuild -project RemarqueRebuild.xcodeproj -scheme RemarqueRebuild -configuration Release -destination 'generic/platform=macOS' -derivedDataPath "$derived" ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO CODE_SIGN_IDENTITY="$identity" OTHER_CODE_SIGN_FLAGS='--timestamp' build
app="$derived/Build/Products/Release/Remarque.app"
codesign --verify --deep --strict --verbose=2 "$app"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app/Contents/Info.plist")"
mkdir -p dist
ditto --norsrc "$app" dist/Remarque.app
zip="dist/Remarque-${version}-${build}-development-macos-universal.zip"
ditto --norsrc -c -k --keepParent dist/Remarque.app "$zip"
shasum -a 256 "$zip" > "$zip.sha256"
# Set a stored notarytool keychain profile only when notarization is intended.
if [[ -n "${REMARQUE_NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit "$zip" --keychain-profile "$REMARQUE_NOTARY_PROFILE" --wait
  xcrun stapler staple dist/Remarque.app
  xcrun stapler validate dist/Remarque.app
  ditto --norsrc -c -k --keepParent dist/Remarque.app "$zip"
  shasum -a 256 "$zip" > "$zip.sha256"
fi
printf '%s\n' "$zip"
