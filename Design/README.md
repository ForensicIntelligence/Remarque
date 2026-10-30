# Remarque app icon

`AppIcon.iconset` contains the ten original macOS icon renditions recovered from the installed Remarque 2.1 application's `Assets.car` on 29 October 2026. AppKit decoded the original asset catalogue representations; these PNGs were not redrawn or enlarged. The 512pt @2x rendition is 1024 × 1024 pixels.

The original standalone `AppIcon.icns` omitted several renditions that were present in the asset catalogue, including the App Store's required 1024-pixel image. The rebuild now packages all ten renditions into its standalone ICNS resource.

Regenerate the resource from the repository root:

```sh
iconutil --convert icns --output Resources/AppIcon.icns Design/AppIcon.iconset
```

Xcode copies `Resources/AppIcon.icns` into Remarque.app. The application plist identifies it with `CFBundleIconFile = AppIcon`.

## Approved About-window style

The user approved the Remarque 3.0.4 About window as the visual reference for their other apps on 30 October 2026. [Reusable style reference](remarque-about-style/SKILL.md) includes the approved screenshot, motion and layout guidance, and the original SwiftUI implementation.

A discoverable copy is installed in `~/.codex/skills/remarque-about-style` for future app work. Keep that copy in sync if this design reference is deliberately updated.
