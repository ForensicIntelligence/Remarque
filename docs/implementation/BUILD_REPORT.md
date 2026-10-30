# Remarque 3.0.3 development build 741

29 October 2026. Product name: **Remarque**. Bundle/signing identifier: `ca.forensicintelligence.remarkable`. This intentionally matches the original application identity, as corrected by the user. The installed Remarque 2.1 application binary was not replaced.

## Delivered implementation

The native macOS application has a shared Markdown source and undo history, an AppKit source editor, an editable rendered pane, source reveal from rendered selections, and one formatting toolbar with Mermaid and LaTeX insertion buttons immediately after Table. It includes the restored writing tools, outline, workspace/search/backlinks, local history/recovery, templates/help, snippets, media insertion, table/equation editors, document imports/exports, printing, presentations, and settings.

Mermaid 12.2.0, ZenUML, ELK, and tidy-tree are pinned and bundled. The gallery has 33 families and 41 starters. Flowchart, sequence, and simple state diagrams have a visual editor; other families and unsupported constructs retain source editing. See [the generated support report](SHIPPED_MERMAID_SUPPORT.md).

## Archive follow-up, builds 740–741

A fresh universal Xcode archive succeeds with the corrected application identity and an explicit Utilities category in the app plist. App Store validation of the previous archive failed on the revoked Mac Installer Distribution certificate while resolving Remarque.pkg; the Apple Distribution app identity was accepted. [Archive signing details](ARCHIVE_SIGNING.md). The replacement installer identity was created in Xcode with the account owner’s approval on 29 October 2026 and is valid locally. Xcode completed signing with the replacement identity. Apple then reported that build 740 lacked the required 1024-pixel app icon. Build 741 restores all ten original icon renditions from the surviving app’s asset catalogue and repackages the standalone ICNS; the original artwork was preserved without enlargement. **Build 741 passed Apple’s App Store validation at 5:27 PM America/Vancouver on 29 October 2026.** Xcode Organizer shows “Validation succeeded.” Build 739 remains the previous Developer ID ZIP.

## Changes in 3.0.3

The product name remains Remarque. The version authority, application and test bundle identifiers, Xcode project, and identity checks now use `ca.forensicintelligence.remarkable`. Version validation checks identifier consistency across both project descriptions. See [identity update](UPDATE_3.0.3.md).

## Changes in 3.0.2

The right toolbar is a single row. Mermaid and LaTeX open insertion tools directly; adjacent arrows preserve source editing, visual editing, SVG copying, and equation mode changes. Selecting an object keeps the formatting controls in place. Table, Mermaid, and LaTeX remain visible when the formatting group scrolls in a narrow pane. The illustrated guides and current specification reflect this arrangement. See [update notes](UPDATE_3.0.2.md).

## Changes in 3.0.1

Settings → Preview now clearly labels **Synchronize scrolling**, defaults to on, explains independent scrolling, and persists the choice. Both source modes route scrolling in both directions, including two WebKit panes in Live Editing. Explicit selection-to-source navigation remains enabled when synchronized scrolling is off.

The documentation window now renders all 21 bundled guides as formatted articles, including a pane illustration, source/result examples, Mermaid diagrams, MathJax equations, reference tables, callouts, topic links, search, back navigation, and adjustable text size. Help menu shortcuts open their relevant topics. All content renders locally. The SVG normalization and MathJax configuration fixes keep actual equation glyphs visible after sanitization. See [update notes and screenshots](UPDATE_3.0.1.md).

## Verification evidence

- Build 740: [GitHub Actions run 40978594157](https://github.com/ForensicIntelligence/Remarque/actions/runs/40978594157) passed the full 65-test suite and universal release compilation for commit `746d53baecdea7d8cb6085b9917cc9293a24c309`.

- Previous 3.0.0 clean checkout: [GitHub Actions run 40965663715](https://github.com/ForensicIntelligence/Remarque/actions/runs/40965663715) passed the full suite and universal release compilation on the macOS 15 runner.
- Swift core: 15 tests, including source bytes/BOM/mixed newlines, Unicode offsets, atomic patch rejection, grouped/shared undo, randomized edits, reload revisions, searching, formatting, and history.
- Projection/visual-model tests: 13 tests, including exact duplicate mapping, incremental parse equivalence, fence/metadata preservation, directive protection, and formatting idempotence.
- Browser integration: 27 tests, including right-side typing, formatting selection retention, table editing and placement, math palettes, visual Mermaid editing, live source mode, composition conflicts, source recovery, imports/exports, and script/network probes.
- Native hosted WebKit: 10 tests, including both WebKit panes sharing one source, cross-pane editing and undo, untitled dirty state, RTF images, paginated PDF, and the full Mermaid catalogue in PDF.
- New regressions cover persisted/default scrolling preferences, disabled-scroll selection reveal, actual two-WebKit-pane scrolling, all 21 help guides in light/dark, offline requests, safe help content, copy/navigation, and visible math glyphs. The native help/settings windows and representative guide screenshots were inspected.
- Every Mermaid starter renders and produces a graphic in Word export. The catalogue PDF spans 25 pages; sampled pages were rendered and visually inspected. A 160-paragraph PDF test retains its final paragraph.
- RTF image output was independently opened by LibreOffice and converted to Word; the resulting document retains its embedded PNG and text.
- A local projection benchmark on this Mac measured approximately 26 ms for a typical nonstructural edit in a 4,000-block, 104 KB document. This is an individual benchmark, not a complete p50/p95 application performance qualification.

The first GitHub run exposed OS-dependent Foundation UTF-8 BOM handling. Build 736 uses strict Swift UTF-8 decoding and includes empty, single, repeated, and interior BOM fixtures. Packaging stages signed artifacts outside Desktop/iCloud before creating the archive.

## Packaging and signing

The universal executable contains `arm64` and `x86_64` slices. The deployment target is macOS 14.0. Developer ID signing uses **FI Forensic Intelligence, Ltd. (PATM9DNCLA)** with the requested bundle identifier and hardened runtime. The packaged app and ZIP are produced in `dist/`; the ZIP has a SHA-256 companion file. `scripts/release.sh` documents reproducible testing, signing, packaging, and optional notarization using a stored keychain profile.

The source is backed up in the private [ForensicIntelligence/Remarque repository](https://github.com/ForensicIntelligence/Remarque). `VERSION.json` is authoritative; build numbers increase for distributable builds. Signing keys and credentials are never committed.

## Release status and practical limits

Build 741 was submitted to Apple App Review on 29 October 2026 at 5:39 PM America/Vancouver. App Store Connect confirms **Waiting for Review**. The existing manual-release setting is retained. This submission does not establish that Apple has approved the update or that the remaining qualification work below is complete. See the [submission record](../releases/APP_STORE_3.0.3.md).

This is a **signed development build**, not a fully qualified production release. Apple notarization has not been performed. Intel and macOS 14 execution have not been tested on physical machines; the universal build compiles both architectures. The broad VoiceOver workflow, exhaustive failure injection, larger-document performance matrix, all Mermaid syntax/style combinations, and complete downstream export conformance remain qualification work recorded in the [feature ledger](feature-coverage.json).

Word/RTF/PDF import is conversion, with warnings for unsupported material. PDF import extracts selectable text and does not perform OCR. Visual Mermaid editing intentionally uses a bounded grammar and refuses destructive conversion. Complex Word formatting and uncommon RTF picture encodings require additional fixtures. EPUB structural packaging is tested; full EPUBCheck and multiple-reader validation are outstanding. These limits must not be described as fully verified parity.

Some specification details also need implementation work: the complete named/filterable Mermaid flowchart shape catalogue, gallery synonym matching and per-item thumbnails, disabling every unsupported style combination in advance, and complete workspace alias/fragment navigation. The ledger records these separately from tests that simply have not been run.

## Installing this development build

The ZIP is created outside Desktop/iCloud and should be used for installation. Finder/File Provider may attach signing-incompatible metadata to the loose copy on Desktop. The archive is separately extracted and signature-verified before delivery.

## Rebuild and backup

1. Clone the private repository and open `RemarqueRebuild.xcodeproj` using the `RemarqueRebuild` scheme.
2. Install Node.js and Xcode. `scripts/build.sh` restores the pinned web dependencies and builds the application. XcodeGen is needed only when regenerating the checked-in project.
3. Run `scripts/test.sh`; Chrome is expected at the standard macOS application path for browser tests.
4. Run `scripts/release.sh` on a Mac with the matching Developer ID certificate, or override `REMARQUE_SIGNING_IDENTITY` for an authorized signing identity.
5. Keep Markdown documents in an independent backup. Push source commits regularly; local recovery/history does not replace a separate backup.
