# Diagrams, import, and printing checkpoint

Development build 3.0.0 (734), 29 October 2026. This is a development checkpoint, not a claim that every release acceptance criterion is complete.

## Added

- Native Word, RTF, and selectable-text PDF import entry points; Word XML decoding preserves common headings, marks, tables, lists, links, images, and basic Office Math.
- Paginated native PDF export and asynchronous native printing. The printing view needs a nonzero frame; an owned hidden host window must not release itself on close. The print operation runs using its supported asynchronous modal API.
- A visual Mermaid editor for flowchart, sequence, and simple state grammars. Unknown directives remain verbatim; unsafe node deletion is refused; Apply and Cancel operate on a snapshot with conflict detection.
- Diagram card layout, dragging to resize, move up/down, zoom, SVG/PNG export, and stable identity through layout metadata edits.
- Editable callouts, footnote definitions, definition lists, and details sections. Code highlighting uses ProseMirror decorations.
- Source line numbers, typewriter positioning, source/rendered scroll messages, active formatting state, and contextual toolbar availability.
- Live source mode opens a selected rendered block as Markdown and commits edits through the same native revision engine. Each pane has an independent bridge receiver.
- Searchable bundled documentation, App Intents, and external-file change handling with preserved dirty-state recovery.
- LaTeX exports now include companion graphics; Word includes structural footnotes. Export UI grants explicit access for companion asset folders.

## Evidence

- Core package: 14 tests pass, including monotonic external reload revisions and stale edit rejection.
- Projection/visual model: 11 tests pass.
- Browser integration: 18-test suite passed before adding live mode; focused follow-up passes all-family rendering, exports, metadata identity, and live-block editing. Run the complete current suite before packaging.
- Native hosted XCTest: 4 tests pass. PDF fixture contains 160 paragraphs, spans more than two pages, and preserves paragraph 160.
- Visual tests verify lossless Cancel, directive preservation, inline endpoint labels, and orphan-reference protection.

## Remaining qualification

The full feature ledger remains authoritative. Outstanding work includes broader accessibility and performance checks, IME/external-edit conflict scenarios, full export/image fidelity, release signing/notarization, and preferences/workspace edge cases. Do not replace the installed 2.1 app or label this a qualified production release yet.
