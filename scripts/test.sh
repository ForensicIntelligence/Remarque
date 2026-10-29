#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/version.mjs --check
swift test --package-path Packages/RemarqueCore --scratch-path /tmp/remarque-build/core
(cd Web && npm test && npm run build && npx playwright test)
xcodebuild -project RemarqueRebuild.xcodeproj -scheme RemarqueRebuild -configuration Debug -destination 'platform=macOS' -derivedDataPath /tmp/remarque-build/app test
