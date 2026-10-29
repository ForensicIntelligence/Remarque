# Remarque 3.0.0 development build 736

29 October 2026. Bundle identifier: `ca.forensicintelligence.remarque`. The original installed Remarque 2.1 application uses a different identifier and was not replaced.

## Delivered implementation

The native macOS application has a shared Markdown source and undo history, an AppKit source editor, an editable rendered pane, source reveal from rendered selections, and the exact `markdown`, `Mermaid`, `LaTeX` toolbar tabs. It includes the restored writing tools, outline, workspace/search/backlinks, local history/recovery, templates/help, snippets, media insertion, table/equation editors, document imports/exports, printing, presentations, and settings.

Mermaid 12.2.0, ZenUML, ELK, and tidy-tree are pinned and bundled. The gallery has 33 families and 41 starters. Flowchart, sequence, and simple state diagrams have a visual editor; other families and unsupported constructs retain source editing. See [the generated support report](SHIPPED_MERMAID_SUPPORT.md).

## Verification evidence

- Swift core: 15 tests, including source bytes/BOM/mixed newlines, Unicode offsets, atomic patch rejection, grouped/shared undo, randomized edits, reload revisions, searching, formatting, and history.
- Projection/visual-model tests: 13 tests, including exact duplicate mapping, incremental parse equivalence, fence/metadata preservation, directive protection, and formatting idempotence.
- Browser integration: 23 tests, including right-side typing, formatting selection retention, table editing and placement, math palettes, visual Mermaid editing, live source mode, composition conflicts, source recovery, imports/exports, and script/network probes.
- Native hosted WebKit: 7 tests, including both WebKit panes sharing one source, cross-pane editing and undo, untitled dirty state, RTF images, paginated PDF, and the full Mermaid catalogue in PDF.
- Every Mermaid starter renders and produces a graphic in Word export. The catalogue PDF spans 25 pages; sampled pages were rendered and visually inspected. A 160-paragraph PDF test retains its final paragraph.
- RTF image output was independently opened by LibreOffice and converted to Word; the resulting document retains its embedded PNG and text.
- A local projection benchmark on this Mac measured approximately 26 ms for a typical nonstructural edit in a 4,000-block, 104 KB document. This is an individual benchmark, not a complete p50/p95 application performance qualification.

The first GitHub run exposed OS-dependent Foundation UTF-8 BOM handling. Build 736 uses strict Swift UTF-8 decoding and includes empty, single, repeated, and interior BOM fixtures. Packaging stages signed artifacts outside Desktop/iCloud before creating the archive.

## Packaging and signing

The universal executable contains `arm64` and `x86_64` slices. The deployment target is macOS 14.0. Developer ID signing uses **FI Forensic Intelligence, Ltd. (PATM9DNCLA)** with the requested bundle identifier and hardened runtime. The packaged app and ZIP are produced in `dist/`; the ZIP has a SHA-256 companion file. `scripts/release.sh` documents reproducible testing, signing, packaging, and optional notarization using a stored keychain profile.

The source is backed up in the private [ForensicIntelligence/Remarque repository](https://github.com/ForensicIntelligence/Remarque). `VERSION.json` is authoritative; build numbers increase for distributable builds. Signing keys and credentials are never committed.

## Release status and practical limits

This is a **signed development build**, not a fully qualified production release. Apple notarization has not been performed. Intel and macOS 14 execution have not been tested on physical machines; the universal build compiles both architectures. The broad VoiceOver workflow, exhaustive failure injection, larger-document performance matrix, all Mermaid syntax/style combinations, and complete downstream export conformance remain qualification work recorded in the [feature ledger](feature-coverage.json).

Word/RTF/PDF import is conversion, with warnings for unsupported material. PDF import extracts selectable text and does not perform OCR. Visual Mermaid editing intentionally uses a bounded grammar and refuses destructive conversion. Complex Word formatting and uncommon RTF picture encodings require additional fixtures. EPUB structural packaging is tested; full EPUBCheck and multiple-reader validation are outstanding. These limits must not be described as fully verified parity.

## Rebuild and backup

1. Clone the private repository and open `RemarqueRebuild.xcodeproj` using the `RemarqueRebuild` scheme.
2. Install Node.js and Xcode. `scripts/build.sh` restores the pinned web dependencies and builds the application. XcodeGen is needed only when regenerating the checked-in project.
3. Run `scripts/test.sh`; Chrome is expected at the standard macOS application path for browser tests.
4. Run `scripts/release.sh` on a Mac with the matching Developer ID certificate, or override `REMARQUE_SIGNING_IDENTITY` for an authorized signing identity.
5. Keep Markdown documents in an independent backup. Push source commits regularly; local recovery/history does not replace a separate backup.
