# Remarque verification record

Inspected 29 October 2026. Installed baseline: Remarque 2.1 (733). Tests used a new Guided Tour document and [feature-probe.md](fixtures/feature-probe.md), created for this audit. Existing user documents were not edited.

This is an inventory investigation, not a completed product qualification run. A menu's presence, a help promise, a generated file and a verified round trip are different levels of evidence. [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) preserves those distinctions.

## Completed investigations

| Probe | Outcome | Evidence |
| --- | --- | --- |
| Installed identity | Version/build, bundle identifier, supported extensions, minimum macOS, universal executable and entitlements captured. | [Info](evidence/app-info.json), [entitlements](evidence/entitlements.plist), [hashes](evidence/installed-sha256.txt) |
| Local recovery | Installed app archived; UTF-8 executable strings, reflection fields, Obj-C selectors, symbols and embedded template/harness strings extracted. Original source project not found in inspected paths. | [Recovery report](RECOVERY.md) |
| Start/menu inventory | Start window, all app-specific menu categories, template names, layout/style/export menus recorded. | [Start](evidence/ui-start.txt), `evidence/menu-*.txt` |
| Help inventory | All 19 documentation articles saved from the running app. Shortcuts retain the actual modifier symbols. | `evidence/help-*.txt` |
| Preferences | Appearance, Editing, Preview, Mermaid, Export, Snippets, Keyboard pages read. About Remarque identified in toolbar overflow and native About panel captured. | `evidence/settings-*.txt`, [About](evidence/ui-about.txt) |
| Snippets | Seven names/triggers inventoried; body editor and all supplied snippet bodies captured. | [Detail](evidence/settings-snippet-detail.txt), `evidence/snippet-*.txt` |
| Guided Tour | New template opened; three-pane layout, existing source ribbon/palette, diagram rendering and status observed. | [UI](evidence/ui-guided-tour.txt), [screenshot](evidence/guided-tour.png) |
| Markdown render probe | Headings, marks, code, lists, task states, quotes/callouts, references, tables/escaped pipe, front matter hiding, details control, definition list, footnotes, emoji, Setext heading and math produced rendered content. | [Source](fixtures/feature-probe.md), [UI](evidence/ui-feature-rendered.txt), [HTML](evidence/exports/feature-probe.html) |
| Heading identity | Duplicate heading IDs were unique in exported HTML. | [HTML](evidence/exports/feature-probe.html) |
| Preview click | Clicking the first rendered heading left source status at Line 153, Col 1; focus was HTML content. No click-to-source mapping observed. | [Click result](evidence/probe-preview-click.txt) |
| Right-pane editing affordance | HTML content was not exposed as editable; task checkboxes disabled. No existing general right-panel editing toolbar/surface discovered. | [Rendered UI](evidence/ui-feature-rendered.txt) |
| Source context menu | Right-click inspection failed with computer-use errors (`cannotClickOffscreenElement`, then `noWindowsAvailable`) even though normal AX reads/screenshots worked. Native text context-menu extras remain unenumerated. | Tool-session limitation; source/menu commands otherwise captured. |
| Both preview engines | Switched to native rendering, inspected selected diagram cards, restored original HTML preview mode. | [Native](evidence/ui-native-preview.txt), [selected card](evidence/ui-selected-diagram-card.txt) |
| Existing Live Editing Mode | Mode toggled, same source text view remains; screenshot retained; restored source mode. Block tiles did not become demonstrable in this mixed fixture. | [UI](evidence/ui-live-editing.txt), [screenshot](evidence/live-editing.png) |
| Equation tools | Opened equation editor and inspected all seven palettes, Inline/Display, source field, preview and Insert/Cancel states; cancelled without insertion. | [Editor](evidence/ui-equation-editor.txt), `evidence/equation-*.txt` |
| Table tools | Opened new table grid, headers/cells, add/remove controls, alignment, size and Insert/Cancel; cancelled. | [Table editor](evidence/ui-table-editor.txt) |
| Flowchart visual tools | Opened Guided Tour flowchart, selected node, read label/shape inspector and canvas controls; cancelled. | [Editor](evidence/ui-mermaid-visual.txt), [node](evidence/ui-mermaid-node.txt) |
| Sequence visual tools | Participant/message inspector observed, including arrows and reorder controls; cancelled. | [Sequence UI](evidence/ui-state-visual-editor.txt) |
| State visual tools | Selected `stateDiagram-v2` text directly; State Diagram editor and generated state source opened; cancelled. | [State UI](evidence/ui-state-visual-selected-source.txt) |
| Class visual fallback | Selected class source; explicit visual-editing-unavailable message and Edit as Source action appeared; cancelled. | [Fallback](evidence/ui-class-visual-unsupported.txt) |
| Mermaid import | Opened file chooser and selected mixed Markdown probe. Import settings appeared but source was treated as a whole document and preview failed. Did not apply import. | [Import UI](evidence/ui-mermaid-import-options.txt) |
| Find | Query `Repeated` found matching text; case/word/regex and replace UI inspected. No replacement was applied. | [Find/Replace](evidence/ui-find-replace.txt) |
| Palette | Scrolled list to capture actions, snippets, themes and dynamic heading/diagram commands. | [Initial](evidence/ui-command-palette.txt), `evidence/palette-page-*.txt` |
| Local history | Created a manual snapshot of saved fixture; timestamp/size and +0 −0 comparison shown. Did not restore or remove history. | [Snapshot](evidence/ui-version-snapshot.txt) |
| Workspace | Opened no-folder workspace state. Did not change a persistent workspace folder. | [Workspace](evidence/ui-workspace.txt) |
| Presentation | Opened overlay; counter showed 1 / 12. Right-arrow probe did not visibly advance; exited. Keyboard navigation remains unverified. | [Initial](evidence/ui-presentation.txt), [next](evidence/ui-presentation-next.txt) |
| All export formats | Generated HTML, PDF, DOCX, RTF, Slides HTML, EPUB, LaTeX source, `.remarque`, embedded `.md`. | [Outputs](evidence/exports/), [hashes/structure](evidence/export-validation.json) |
| Diagram PNG | Exported selected native diagram card to PNG. | [PNG](evidence/exports/Flow%20probe.png), [dialog](evidence/ui-diagram-export.txt) |

## Export evidence and limits

| Format | Verified result | Still unverified |
| --- | --- | --- |
| HTML | 107,977 bytes; 9 inline SVGs; unique duplicate-heading anchors; no script tags in this output. | All syntax/media variants, custom CSS and option combinations; screen/print pixel parity. |
| PDF | 327,426-byte file produced. | Every page visually reviewed, pagination/layout correctness, title/TOC/page-number options, font fallback and downstream print. |
| DOCX | 214,383 bytes; ZIP CRC check passes; 18 entries; XML parses; 9 PNG media files. | Word/Pages/LibreOffice visual fidelity, editing semantics, nested-list/math/image import round trip. |
| RTF | 406,709-byte file produced. | Downstream word-processor opening and full visual fidelity. |
| Slides | 106,486-byte HTML output; 12 `section.slide` elements. | Keyboard behavior in target browser, slide overflow, speaker/presenter behavior beyond documented commands. |
| EPUB | 107,666 bytes; ZIP CRC check passes; 8 entries with container/package/nav/3 chapters/styles; XML/XHTML parses. | EPUBCheck and Apple Books/other readers, local asset packaging and accessibility. XML parsing is not EPUB conformance certification. |
| LaTeX | 4,167-byte article source with preamble/native math; saved filename became `feature-probe.tex.txt`. | Compilation, all syntax transformations, diagram handling in TeX, correct save extension. |
| Remarque bundle | 2,540-byte ZIP; one `feature-probe.md` member; CRC passes. | Linked asset collection, missing-file handling, relative-path rewrite, reopening/importing bundle. |
| Embedded Markdown | 2,410-byte `.md` produced. | Actual image embedding, MIME/size handling and round-trip fidelity; fixture contained no local image. |
| Diagram PNG | 20,220-byte PNG produced. | Resolution/scale/transparency options and exact SVG copy fidelity. |

Files are retained exactly as exported, including the LaTeX filename anomaly. Export success must not be confused with downstream visual correctness. No test output was uploaded or published.

## Discrepancies and regression targets

| ID | Finding | Evidence and implication |
| --- | --- | --- |
| GAP-01 | No preview click-to-source behavior | Heading click preserved Line 153, Col 1. New precise mappings are necessary; continuous scroll sync is not a substitute. |
| GAP-02 | Existing WYSIWYG wording is ambiguous | Help describes source-side render-in-place editing and a separate HTML “WYSIWYG preview.” Neither establishes general right-panel editing. Rebuild labels must distinguish editing from viewing. |
| GAP-03 | State diagrams omitted in one support description | Templates/types help says Flowchart & Sequence visual editing; visual-editor help and actual State Diagram UI support simple state diagrams. Preserve tested state support. |
| GAP-04 | Stale statement about other diagram types | Writing Diagrams help says other types render as a graceful card; full engine and actual class/pie rendering demonstrate richer rendering. Do not rebuild only a small native renderer. |
| GAP-05 | Diagram landmark boundary selected previous diagram | Clicking the state-diagram outline row set source to Line 120, Col 1, then opening visual editor opened the preceding sequence. Selecting actual `stateDiagram-v2` at Line 121 opened the correct state. Investigate fence-boundary ownership rather than assuming unsupported state syntax. |
| GAP-06 | Mixed Markdown Mermaid import failed | Importing feature-probe.md showed the whole document as source and “No diagram type detected”; no multi-diagram selector observed. This fixture has front matter, normal text, a longer code fence and five Mermaid fences. Isolate those factors before assigning a root cause. |
| GAP-07 | Slide splitting differs from documentation | Help says each top-level heading. Fixture has 11 total headings, only 2 H1 headings, but generated 12 slides and in-app counter 12. Decide intended boundary policy; verify handling of front matter/preamble. |
| GAP-08 | LaTeX filename gains `.txt` | Requested `feature-probe.tex` in save name; result `feature-probe.tex.txt`. Retain evidence and fix destination type/extension behavior. |
| GAP-09 | Wiki-link alias label lost | `[[Other Note\|Wiki alias]]` rendered label “Other Note” rather than “Wiki alias,” with target Other%20Note.md. Correct label/target mapping in rebuild. |
| GAP-10 | Native and HTML preview features differ | Native card selection exposes resize/alignment/edit/export tools. HTML probe contains rendered SVG but no comparable card toolbar. New right editor must deliberately provide these functions. |
| GAP-11 | Source highlighting and live tiles need investigation | Styling in source AX capture stops after the longer fenced-code example; Live Editing Mode screenshot still shows raw lower Mermaid fences. AX text includes formatting annotations and is not a raw-source dump. Isolate parser/highlighter/tile behavior before calling it source corruption. |
| GAP-12 | Offline claim is stronger than entitlement evidence | Sandbox present, but `com.apple.security.network.client` is true. This does not show that the app makes network calls; it means the entitlement does not enforce the advertised zero-network contract. Runtime verification remains required. |
| GAP-13 | Export UI labels underdescribe PDF options | Page numbering is labelled DOCX and page size is in DOCX settings, while help/release notes say PDF also uses them. Rebuild should label shared settings clearly. |
| GAP-14 | Bundle import/open not established | `.remarque` export exists and is ZIP-compatible. Bundle file type is absent from registered document extensions; successful reopen was not tested. Do not claim a full round trip yet. |
| GAP-15 | Presentation navigation not confirmed | Right-arrow action left counter at 1 / 12 in this automation probe. Could reflect focus/tool interaction; do not label it a proven product bug. |
| GAP-16 | Developer website is not authoritative for behavior | Local marketing copy claims broad CommonMark/export fidelity. Installed help itself contains stale claims. Treat app probes/actual outputs as stronger evidence for this build. |

## Required remaining baseline acceptance checks

These are implementation/release QA obligations. They are listed explicitly so the inventory does not turn untested claims into assumed compatibility.

1. Save, Save As, Duplicate, Rename, Move, Revert, Share, reopen, autosave, unsaved-close prompts, multiple windows/tabs and conflicting external changes.
2. Full Markdown grammar/conformance and malformed-input suite, escaping/nesting/edge cases, exact code-highlighting languages, all emoji aliases, raw HTML policy and invalid UTF-8 handling.
3. Every formatting command with caret/selection/mixed marks; smart heading/list/quote behavior, pairing, snippets, plain/rich paste, IME, native spelling and undo.
4. Long documents, incremental parsing/highlighting, live-mode tiles, focus/typewriter behavior, source/preview scroll synchronization in both engines and stable selection after resizing.
5. Image insert/paste/drop for all four formats, alt text, references, linked/embedded modes, missing media, folder grant denial/regrant, grant persistence and export assets.
6. Table insertion/editing, row/column removal, escaping, alignment/placement and preservation of extra cells and surrounding text.
7. Equation insertion/editing in both modes, all template slots, invalid math, baseline geometry, render cache/retry, large expressions and every export representation.
8. Diagram node/edge/participant/message mutations and Apply/Cancel/Undo; state aliases, unsupported syntax preservation and warnings, drag/resize/zoom, copies, all render types, valid/raw/multi-diagram imports and error recovery.
9. Find next/previous, replacement after document changes, regex failures and capture groups, Unicode, empty/overlapping/zero-width matches, keyboard focus.
10. Workspace folder browsing/recursion, fuzzy quick-open, cross-file search, wiki resolution/aliases, missing/ambiguous notes, backlinks, folder restoration and moved-folder handling.
11. Version automatic interval/retention, non-empty diff, restore safeguard and crash recovery. Snippet persistence, duplicates, malformed data and backup restoration.
12. Shortcuts and Services invocation from another app, scratchpad location/append semantics, permission failures and concurrent capture.
13. All nine exports under every material setting, actual local media, very tall/wide diagrams, long tables, custom CSS, cancellation/failures, existing destination preservation and atomicity.
14. All three print modes, page breaks, light print styling and rendered/source ordering.
15. Screen-reader, keyboard, large text, theme/contrast and narrow-window usability; source/preview controls absent from AX require special attention. Enumerate native source/HTML context-menu extras and the complete About preferences body in a subsequent manual pass.
16. Network-observation test, hostile Markdown/HTML/Mermaid/link inputs, archive path handling, file scope restrictions, cache/memory pressure and lifecycle cancellation.

## Session impact

All new files are in the rebuild workspace. The installed app was not patched, replaced, re-signed or updated. A fixture file was opened, exported and manually snapshotted in its local history. The source/live mode and HTML/native preview setting were restored to the initially observed source + HTML configuration. App window/pane positions and recent-document ordering may reflect the inspection. The original user's recent documents were only listed by the app; their contents were not opened for this audit.

The operating system denied direct inspection of the application's protected data container. No attempt was made to bypass that restriction. Settings were inventoried through the app UI; private history/workspace/snippet storage schemas remain unverified.
