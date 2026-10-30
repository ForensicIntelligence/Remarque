# Remarque app icon

`AppIcon.iconset` contains the ten original macOS icon renditions recovered from the installed Remarque 2.1 application's `Assets.car` on 29 October 2026. AppKit decoded the original asset catalogue representations; these PNGs were not redrawn or enlarged. The 512pt @2x rendition is 1024 × 1024 pixels.

The original standalone `AppIcon.icns` omitted several renditions that were present in the asset catalogue, including the App Store's required 1024-pixel image. The rebuild now packages all ten renditions into its standalone ICNS resource.

Regenerate the resource from the repository root:

```sh
iconutil --convert icns --output Resources/AppIcon.icns Design/AppIcon.iconset
```

Xcode copies `Resources/AppIcon.icns` into Remarque.app. The application plist identifies it with `CFBundleIconFile = AppIcon`.
