# Archiving and validating Remarque

Product: **Remarque**. Bundle identifier: **ca.forensicintelligence.remarkable**. Team: **FI Forensic Intelligence, Ltd. (PATM9DNCLA)**.

## Xcode archive

Use Product → Archive with the RemarqueRebuild scheme, or run `scripts/archive.sh`. The script builds both Apple Silicon and Intel architectures and creates an Organizer archive. It refuses to overwrite an existing archive. Application signing uses the configured Xcode automatic Apple Development identity; the distribution workflow subsequently re-signs the app for its destination.

The app’s Utilities category is explicitly included in `App/Info.plist`, because setting `INFOPLIST_KEY_LSApplicationCategoryType` alone does not populate this manually maintained plist.

## Mac App Store validation

Validate App uses both **Apple Distribution** for the app and **Mac Installer Distribution** for the installer package. A valid app signature alone does not establish that the installer signing certificate is usable.

The failed 29 October 2026 validation accepted the Apple Distribution identity and provisioning profile for Remarque.app, then failed while resolving the signing identity for Remarque.pkg. The local **3rd Party Mac Developer Installer: FI Forensic Intelligence, Ltd. (PATM9DNCLA)** certificate (SHA-1 `4DC900766B3FA3DC55AEC386D8156A160D292C77`) was marked **Revoked**, both by Keychain identity inspection and Xcode Manage Certificates.

The remedy is a valid Mac Installer Distribution certificate with its corresponding private key, created or imported through Xcode’s team certificate management. Do not revoke unrelated certificates or export private keys into this repository. The installer certificate is separate from the application’s bundle identifier and Developer ID signing identity.

On 29 October 2026, with the account owner’s authorization, Xcode created a replacement Mac Installer Distribution certificate (SHA-1 `92F4CAE07311D24CE054F81B434860AE08F2B6C6`). Xcode lists it with its 29 October creation date and no invalid status; local identity verification also accepts it. The old revoked certificate and unrelated signing identities were left unchanged.

A fresh universal 3.0.3 (740) archive was built successfully. Its local signature, identifier, Utilities category and architectures were verified. Apple-side validation with the replacement installer certificate completed signing, then rejected the incomplete icon package.

## Complete app icon, build 741

Apple validation of build 740 reported a missing ICNS image at 512pt × 512pt @2x (1024 × 1024 pixels). The standalone ICNS recovered from the original app contained only four representations; its compiled `Assets.car` contained the complete ten-image catalogue. AppKit decoded all ten original representations to PNG without resizing or redrawing. They are preserved in `Design/AppIcon.iconset`, and `iconutil` generated the complete `Resources/AppIcon.icns`. See [icon source and regeneration instructions](../../Design/README.md).

Build **3.0.3 (741)** packages this corrected ICNS and **passed Apple’s App Store validation on 29 October 2026 at 5:27 PM America/Vancouver**. Xcode Organizer shows “Validation succeeded,” “Validated,” and build number 741. Its identifier is `ca.forensicintelligence.remarkable`, its team is FI Forensic Intelligence, Ltd., and its architectures are Intel and Apple silicon.

The validated archive is `~/Library/Developer/Xcode/Archives/2026-10-29/Remarque 3.0.3 (741).xcarchive`. Validation does not publish the app or submit it for review. No release submission was performed.

The packaged ICNS was compared byte-for-byte with the repository resource and its 1024-pixel `ic10` representation was checked. Its SHA-256 is `3387627cb2b5520546a0855e6d59992d7e362446fd5d7df6629998e14819c377`. Local strict signature verification also passed. See [Apple’s App Store icon instructions](https://help.apple.com/xcode/mac/current/en.lproj/dev4b0ebb1bb.html).

## Direct distribution

`scripts/release.sh` uses **Developer ID Application** for the signed app ZIP. This is a separate distribution route from Mac App Store validation. Notarization is performed only when the configured notarization profile is supplied.

References: [Apple’s distribution signing instructions](https://help.apple.com/xcode/mac/current/en.lproj/devcac6ab5b3.html), [Apple’s certificate recovery guidance](https://help.apple.com/xcode/mac/current/en.lproj/devd1432da9a.html).
