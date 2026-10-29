#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/version.mjs --check
identity="${REMARQUE_SIGNING_IDENTITY:-Developer ID Application: FI Forensic Intelligence, Ltd. (PATM9DNCLA)}"
derived="${REMARQUE_RELEASE_DERIVED_DATA:-/tmp/remarque-build/release}"
./scripts/test.sh
node scripts/licenses.mjs
xcodebuild -project RemarqueRebuild.xcodeproj -scheme RemarqueRebuild -configuration Release -destination 'generic/platform=macOS' -derivedDataPath "$derived" ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="$identity" OTHER_CODE_SIGN_FLAGS='--timestamp' build
app="$derived/Build/Products/Release/Remarque.app"
codesign --verify --deep --strict --verbose=2 "$app"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist")"
build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$app/Contents/Info.plist")"
stage="$(mktemp -d /tmp/remarque-package.XXXXXX)"
trap 'rm -rf "$stage"' EXIT
ditto --norsrc "$app" "$stage/Remarque.app"
codesign --verify --deep --strict --verbose=2 "$stage/Remarque.app"
zip="$stage/Remarque-${version}-${build}-development-macos-universal.zip"
ditto --norsrc -c -k --keepParent "$stage/Remarque.app" "$zip"
# Set a stored notarytool keychain profile only when notarization is intended.
if [[ -n "${REMARQUE_NOTARY_PROFILE:-}" ]]; then
  xcrun notarytool submit "$zip" --keychain-profile "$REMARQUE_NOTARY_PROFILE" --wait
  xcrun stapler staple "$stage/Remarque.app"
  xcrun stapler validate "$stage/Remarque.app"
  ditto --norsrc -c -k --keepParent "$stage/Remarque.app" "$zip"
fi
mkdir -p dist
rm -rf dist/Remarque.app
ditto --norsrc "$stage/Remarque.app" dist/Remarque.app
# Desktop/iCloud may add Finder metadata while copying. Remove only signing-
# incompatible metadata on this generated output; never touch user documents.
xattr -dr com.apple.FinderInfo dist/Remarque.app 2>/dev/null || true
xattr -dr com.apple.ResourceFork dist/Remarque.app 2>/dev/null || true
codesign --verify --deep --strict --verbose=2 dist/Remarque.app
cp "$zip" dist/
(cd dist && shasum -a 256 "$(basename "$zip")" > "$(basename "$zip").sha256")
printf '%s\n' "dist/$(basename "$zip")"
