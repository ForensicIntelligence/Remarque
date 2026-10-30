# Archiving and validating Remarque

Product: **Remarque**. Bundle identifier: **ca.forensicintelligence.remarkable**. Team: **FI Forensic Intelligence, Ltd. (PATM9DNCLA)**.

## Xcode archive

Use Product → Archive with the RemarqueRebuild scheme, or run `scripts/archive.sh`. The script builds both Apple Silicon and Intel architectures and creates an Organizer archive. It refuses to overwrite an existing archive. Application signing uses the configured Xcode automatic Apple Development identity; the distribution workflow subsequently re-signs the app for its destination.

The app’s Utilities category is explicitly included in `App/Info.plist`, because setting `INFOPLIST_KEY_LSApplicationCategoryType` alone does not populate this manually maintained plist.

## Mac App Store validation

Validate App uses both **Apple Distribution** for the app and **Mac Installer Distribution** for the installer package. A valid app signature alone does not establish that the installer signing certificate is usable.

The failed 29 October 2026 validation accepted the Apple Distribution identity and provisioning profile for Remarque.app, then failed while resolving the signing identity for Remarque.pkg. The local **3rd Party Mac Developer Installer: FI Forensic Intelligence, Ltd. (PATM9DNCLA)** certificate (SHA-1 `4DC900766B3FA3DC55AEC386D8156A160D292C77`) was marked **Revoked**, both by Keychain identity inspection and Xcode Manage Certificates.

The remedy is a valid Mac Installer Distribution certificate with its corresponding private key, created or imported through Xcode’s team certificate management. Do not revoke unrelated certificates or export private keys into this repository. The installer certificate is separate from the application’s bundle identifier and Developer ID signing identity.

A fresh universal 3.0.3 (740) archive was built successfully. Its local signature, identifier, Utilities category and architectures were verified. Apple-side validation requires the installer credential replacement.

## Direct distribution

`scripts/release.sh` uses **Developer ID Application** for the signed app ZIP. This is a separate distribution route from Mac App Store validation. Notarization is performed only when the configured notarization profile is supplied.

References: [Apple’s distribution signing instructions](https://help.apple.com/xcode/mac/current/en.lproj/devcac6ab5b3.html), [Apple’s certificate recovery guidance](https://help.apple.com/xcode/mac/current/en.lproj/devd1432da9a.html).
