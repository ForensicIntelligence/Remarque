#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
configuration="${1:-Debug}"
derived="${REMARQUE_DERIVED_DATA:-/tmp/remarque-build/app}"
node scripts/version.mjs --check
(cd Web && npm ci --ignore-scripts && npm run build)
xcodebuild -project RemarqueRebuild.xcodeproj -scheme RemarqueRebuild -configuration "$configuration" -destination 'platform=macOS' -derivedDataPath "$derived" build
