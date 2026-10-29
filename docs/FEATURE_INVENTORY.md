# Remarque feature inventory

Baseline: **Remarque 2.1, build 733**, installed at `/Applications/Remarque.app`. Inspected on **29 October 2026**, America/Vancouver. This is the preservation inventory for the rebuild; requested additions are specified separately in [REBUILD_SPECIFICATION.md](REBUILD_SPECIFICATION.md).

The baseline is a native, document-based macOS Markdown application with an AppKit source editor, SwiftUI interface, native and HTML previews, bundled Mermaid and MathJax engines, visual diagram and equation tools, and local import/export workflows. Its existing “Live Editing Mode” belongs to the **source editor**. The right preview has no general text-editing surface, and clicking its heading did not move the source cursor in the probe.

## How to use this inventory

Every discovered feature below is part of the preservation scope unless the rebuild specification explicitly changes its behavior. Stable feature IDs support implementation and acceptance tracking. Read the [verification record](VERIFICATION.md) alongside this inventory: exposed controls and documentation are not equivalent to an end-to-end passing test.

| Evidence mark | Meaning |
| --- | --- |
| V | Behavior exercised in this audit, within the recorded probe's scope. |
| U | Control, option, or state directly observed in the installed UI. |
| D | Behavior described by the app's own help or release notes; not fully exercised. |
| B | Supported by installed bundle, executable strings, type/field metadata, or generated file structure. |

This inventory contains **226 feature records** and covers all discovered app menus, all 19 help articles, seven opened preferences pages plus the identified About section, templates, formatting tools, supported syntax families, editing modes, diagram/equation tools, workspace and automation contracts, and import/export surfaces. It cannot prove the absence of undiscoverable code paths in a compiled application. The explicit remaining checks are in [VERIFICATION.md](VERIFICATION.md), rather than being silently assumed to work.

## Application and document lifecycle

Sources: [bundle metadata](evidence/app-info.json), [File menu](evidence/menu-file.txt), [start window](evidence/ui-start.txt), [editor help](evidence/help-the-editor.txt), [recovered metadata](evidence/cstring.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| APP-01 | Native macOS application | Universal Intel and Apple Silicon executable; minimum macOS 14.0. SwiftUI, AppKit, WebKit, native document windows. | B |
| APP-02 | Product identity | Remarque; “Markdown. Beautifully refined.” Bundle ID `ca.forensicintelligence.remarkable` retains the former Remarkable name. | U+B |
| APP-03 | Plain Markdown ownership | Documents remain user-owned UTF-8 text, not an application database format. | V+D+B |
| APP-04 | Registered file types | `.md`, `.markdown`, `.mdown`, standard Markdown UTI, legacy application Markdown UTI, and plain text. | B |
| APP-05 | New document | Native New command and start-window New Document / Blank Document. | V |
| APP-06 | Open document | Native file picker and recent-document opening; tested opening the local feature probe. | V |
| APP-07 | Recent documents | Start-window list and native Open Recent list; names, location context, Clear Menu. | U |
| APP-08 | Save lifecycle | Save, Save As, Duplicate, Rename, Move To, Revert To, Share; native command enablement depends on the active document. | U |
| APP-09 | Multiple documents | Separate document windows; native tab bar and tab overview appear with document windows. | U |
| APP-10 | Window management | Close, Close All, minimize/zoom, full screen, Bring All to Front, macOS tiling/arrangement. | U |
| APP-11 | Dirty state | Status bar reports Saved or document modification state; edits must participate in the document lifecycle. | U+D |
| APP-12 | External file changes | Clean document reloads automatically; unsaved edits prompt to reload/discard or keep editing. | D+B |
| APP-13 | Text validation | Error paths for unsupported type, invalid UTF-8, unreadable/empty file, encoding failure, open/save failure. | B |
| APP-14 | Atomic exports | Release notes promise atomic export writes so failed output does not destroy a previous file. | D |
| APP-15 | App menus | About, Settings, Services, Hide, Hide Others, Show All, Quit, Quit and Keep Windows. | U |
| APP-16 | Offline product contract | Local document processing, no account/cloud/telemetry dependency. Bundled rendering assets verified; absence of network traffic is not proven. | D+B |
| APP-17 | File access grants | Sandboxed file access, remembered security-scoped folder bookmarks for sibling images and custom stylesheets. | D+B |
| APP-18 | Image access recovery | One-time folder-access prompt and a Grant Access banner after decline; grants also support export. | D+B |

## Start window and learning surfaces

Sources: [start window](evidence/ui-start.txt), [documentation](evidence/ui-documentation.txt), [embedded text](evidence/cstring.txt), [recovered templates](../recovery/recovered-text/).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| START-01 | Start window | Brand/sidebar; New Document, Open, Documentation, recent files, Open Other. Show Start Window command. | V+U |
| START-02 | Blank Document template | Empty Markdown document. | U |
| START-03 | Guided Tour template | Welcome, outline guidance, formatting shortcuts, flowchart with layout metadata, export comparison table. Opened during audit. | V+B |
| START-04 | Technical Spec template | Overview, goals, architecture diagram, risks/tasks, references. | U+B |
| START-05 | Meeting Notes template | Meeting title, date, attendees, agenda, notes, action-item tasks. | U+B |
| START-06 | Diagram Doc template | Named flowchart with size/alignment metadata and decision branches. | U+B |
| START-07 | Product Plan template | Problem, solution, and milestone table. | U+B |
| START-08 | Onboarding | Welcome, structured writing, diagramming, export, privacy, and setup-default pages. Image storage and default export choices. | D+B |
| START-09 | What's New | Versioned release highlights; remembered last-seen version/onboarding state. | U+B |
| START-10 | Searchable documentation | Dedicated window, searchable sidebar, 19 help articles. Full article evidence retained. | V |
| START-11 | Markdown Guide | Syntax examples for headings, marks, lists, links, images, tables/alignment, callouts, math, details, front matter. | U+B |
| START-12 | Mermaid Guide | Diagram examples/templates, source insertion, and visual-editor entry for supported types. | U+D+B |
| START-13 | Keyboard reference | Dedicated window plus Settings Keyboard and documentation article. | V |
| START-14 | About and publisher link | Version/product attribution and Forensic Intelligence website. External link not followed during audit. | U+B |

## Layout and navigation

Sources: [layout selector](evidence/menu-layout.txt), [View menu](evidence/menu-view.txt), [outline help](evidence/help-outline-navigation.txt), [guided-tour screenshot](evidence/guided-tour.png), [presentation](evidence/ui-presentation.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| NAV-01 | Editor layout | Source editor alone. | U |
| NAV-02 | Editor and Preview layout | Side-by-side source and typeset preview. | V |
| NAV-03 | Editor and Outline layout | Source and structural navigation. | U |
| NAV-04 | Full layout | Outline, source editor, preview; observed on launch of test documents. | V |
| NAV-05 | Preview layout | Preview-only proofreading. | U+D |
| NAV-06 | Mermaid editor layout | Generated source, interactive canvas, inspector; distinct document layout. | V |
| NAV-07 | Splitters | Adjustable pane widths; stored outline/preview width and last-layout fields exist. | U+B |
| NAV-08 | Pane toggles | Toolbar/menu commands toggle preview and outline. | U |
| NAV-09 | Outline headings | Hierarchical headings, current-section highlighting, heading count, click-to-source navigation. | V+D |
| NAV-10 | Outline diagram landmarks | Optional diagram entries labelled by metadata title or diagram source/type. | V |
| NAV-11 | Duplicate heading anchors | Unique IDs generated, e.g. `repeated-heading` and `repeated-heading-1`; verified in HTML output. | V+B |
| NAV-12 | Focus Mode | Hides chrome, readable centered column, optional inactive-paragraph dimming. | U+D |
| NAV-13 | Typewriter Mode | Keeps caret line vertically centered. | U+D |
| NAV-14 | Scroll sync | Setting advertises source-to-preview and preview-to-source scrolling. Precise behavior differs by engine and needs regression testing. | U+D |
| NAV-15 | Status bar | Word count, reading minutes, diagram count, source line/column, layout name, saved state. | V |
| NAV-16 | Presentation | In-app slide overlay, slide counter, exit control, documented arrows/Space/Escape. Probe reported 12 slides; see discrepancy record. | U+D |
| NAV-17 | Empty states | No headings, nothing to present, no recents, no workspace folder, no versions, no matching commands. | U+B |
| NAV-18 | Selection from preview | Ordinary HTML preview heading click did not move source cursor. This is a requested new feature, not established baseline behavior. | V |

## Source editing and formatting commands

Sources: [editor help](evidence/help-the-editor.txt), [Format menu](evidence/menu-format.txt), [ribbon and palette](evidence/ui-guided-tour.txt), [styles](evidence/menu-style.txt), [Editing settings](evidence/settings-editing.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| EDIT-01 | Native text editing | AppKit text engine; selection, caret, copy/cut/paste/delete/select-all, keyboard movement and native undo/redo. | U+D+B |
| EDIT-02 | Syntax highlighting | Markdown structure, subdued markers, headings, links, Mermaid fence tint; incremental styling documented. | V+D |
| EDIT-03 | Code syntax highlighting | Optional preview/export highlighting; Swift, JS/TS, Python, Go, Rust and other languages documented. | V+D |
| EDIT-04 | Smart Editing master switch | Enabled in observed settings; disables smart behaviors for plain source editing. | U+D |
| EDIT-05 | Render-aware style toggles | Toggle whole styled span under caret, or current word without selection; avoid repeated marker stacking, including nested emphasis. | D |
| EDIT-06 | Smart headings | Tab at line start cycles body/H1/H2/H3/body. | U+D |
| EDIT-07 | List continuation | Return continues bullets, numbering or task boxes; automatic numbering; empty item Return exits list. | D |
| EDIT-08 | Quote continuation | Smart quote continuation is explicitly advertised in Editing settings. | U+D |
| EDIT-09 | Indent and outdent | Tab/Shift-Tab on list lines; snippet expansion shares Tab. | D |
| EDIT-10 | Bracket pairing | Brackets, parentheses and quotes pair or wrap selected text. | U+D |
| EDIT-11 | Rich paste conversion | HTML/Word rich text becomes Markdown headings, marks, links, code, and lists; switchable. | U+D |
| EDIT-12 | Image paste and drop | Clipboard/Finder images become Markdown references and stored media. | D |
| EDIT-13 | URL drop on text | Dropping a URL on selected text makes a Markdown link. | D |
| EDIT-14 | Spelling and typography | Spellcheck, smart quotes, smart dashes, soft wrap preferences; OS dictation and Emoji & Symbols menus. | U+D |
| EDIT-15 | Live Editing Mode | Conceals source markers and provides in-place math/Mermaid tiles; entering a block reveals source. Toggle and same source-editing surface observed; full tile behavior needs further testing. | U+D+B |
| EDIT-16 | Formatting ribbon | Existing ribbon is above the **left/source pane**. Style selector, bold, italic, strike, highlight, inline code, table alignment, text-size control. | V |
| EDIT-17 | Style selector | Body, Heading 1–6, Quote; applies to current source line. | U |
| EDIT-18 | Column alignment | Left/center/right commands enabled in table context. | U+D |
| EDIT-19 | Whole-table placement | Left/center/right table placement stored using an HTML comment. | U+D+B |
| EDIT-20 | Shared display size | Ribbon text-size stepper scales source and preview together; observed source size 15 pt. | U |
| EDIT-21 | Vertical Markdown tools | Bold, italic, strike, inline code, heading, blockquote, bullet/number/task lists, link, image, table editor, code fence, equation, rule, Mermaid. Hide/show command. | U |
| EDIT-22 | Format menu helpers | Bold, italic, inline code, code block, link, image, equation, heading, blockquote, lists, table editor, quick table, horizontal rule. | U |
| EDIT-23 | Selection wrapping | Helpers wrap selection or insert a placeholder; source edits participate in undo. | D |
| EDIT-24 | Format Document | One undoable pass normalizing whitespace/list markers/table columns. Preserve code/math content, rules, hashtags and hard breaks. | U+D |
| EDIT-25 | Standard platform commands | Native AutoFill, dictation, Emoji & Symbols, document/tab/window controls; some depend on macOS/context. | U |

## Markdown language contract

Sources: [Markdown reference](evidence/help-markdown-reference.txt), [feature probe](fixtures/feature-probe.md), [rendered probe](evidence/ui-feature-rendered.txt), [HTML export](evidence/exports/feature-probe.html). “V” means a representative example rendered, not full CommonMark conformance.

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| MD-01 | ATX headings | H1–H6; heading hierarchy and IDs. H1/H2 exercised; other levels exposed by styles. | V+U |
| MD-02 | Setext headings | Underlined headings; `===` form exercised. | V+D |
| MD-03 | Paragraphs and breaks | Paragraph separation, soft wrapping, trailing-space hard line breaks. | V+D |
| MD-04 | Bold, italic, combined | Strong/emphasis/nested combination with asterisk and documented underscore forms. | V+D |
| MD-05 | Strikethrough | `~~text~~`. | V |
| MD-06 | Inline code | Literal code spans; underscores preserved in rendered `inline_code`. | V |
| MD-07 | Fenced code | Language annotation, code rendering/highlighting, four-backtick outer fence exercised. | V |
| MD-08 | Highlight | `==text==`; HTML uses contrasting mark colors, including inline code inside marks. | V+B |
| MD-09 | Superscript and subscript | `x^2^`, `H~2~O`. | V |
| MD-10 | Emoji shortcodes | Named shortcodes, aliases such as `:+1:`, broad embedded name table; `:rocket:` exercised. | V+D+B |
| MD-11 | Bullet lists | Nested unordered lists. | V |
| MD-12 | Ordered lists | Explicit start number and mixed/nested ordered/unordered children. | V |
| MD-13 | Task lists | Checked/unchecked task syntax. HTML preview checkboxes are disabled in the baseline. | V |
| MD-14 | Blockquotes | Quoted paragraphs and continued quoted lines. | V |
| MD-15 | Horizontal rules | Rule rendering; formatter promises preservation. | V+D |
| MD-16 | Inline links and autolinks | Standard links, titles, automatic URL syntax; parenthesized URLs called out in release notes. | V+D |
| MD-17 | Reference links | Definitions reused in paragraphs and table cells. | V |
| MD-18 | Images | Inline/block Markdown images, reference images, local assets, data URIs, alt text. | D+B |
| MD-19 | Wiki links | `[[Note]]` and documented alias syntax; links resolve toward local Markdown files/workspace. Alias label was incorrect in the probe. | V+D |
| MD-20 | Tables | Header/divider/body, inline formatting and links in cells, column alignment and escaped pipes. | V |
| MD-21 | Table placement metadata | `<!-- table-align: center -->` extension. | V+B |
| MD-22 | Built-in callouts | NOTE, TIP, IMPORTANT, WARNING, CAUTION; titles and body formatting. | V |
| MD-23 | Custom callouts and aliases | Custom bracket names and custom title; documented synonyms such as info/danger. | V+D |
| MD-24 | Footnotes | Definitions/references; numbered section at document end and links to it. | V |
| MD-25 | Definition lists | Term plus one or more colon-prefixed definitions. | V |
| MD-26 | Collapsible sections | `<details>`/`<summary>`, expansion state and Markdown content; nested sections with math/diagrams documented. | U+V+D |
| MD-27 | Front matter | YAML-style front matter, optional preview hiding, export-specific inclusion. Exact YAML semantics beyond demonstrated fields remain unspecified. | V+U |
| MD-28 | Math delimiters | Inline `$…$`, block `$$…$$`; literal currency such as `$5 and $10` stays text. | V |
| MD-29 | Mermaid fences | First-class rendered diagrams from fenced `mermaid` source. | V |
| MD-30 | Diagram metadata | Optional readable HTML comment storing diagram identity, title, size, alignment and source-display choices. Legacy `remarkable:mermaid` recognized in binary. | V+D+B |
| MD-31 | Escapes and literal punctuation | Escaped table pipe, literal snake_case, longer code fences verified; broad conformance suite still required. | V+D |
| MD-32 | HTML handling | Details and HTML/comment AST types exist; unrestricted raw HTML support/sanitization cannot be inferred. Preserve unknown constructs losslessly in rebuild. | B |

## Preview and media

Sources: [native preview](evidence/ui-native-preview.txt), [HTML preview](evidence/ui-feature-rendered.txt), [Preview settings](evidence/settings-preview.txt), [media help](evidence/help-the-editor.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| PREV-01 | HTML preview | HTML engine selected initially; styled headings/text/tables, rendered math and diagrams. Related setting says matching print. | V+U |
| PREV-02 | Native preview | SwiftUI-native rendering and interactive diagram cards; manually switched to inspect, then restored. | V |
| PREV-03 | Live refresh | Source-driven render with configurable debounce; observed 150 ms setting. | U+D |
| PREV-04 | Typography and themes | Coordinated app/editor/preview/diagram colors, configurable preview size. | V+U+D |
| PREV-05 | Front-matter visibility | Hide-front-matter setting enabled in observed configuration. | V+U |
| PREV-06 | Link handling | Default-browser preference; wiki/local-note routing; internal heading and footnote links. | U+D+B |
| PREV-07 | Image formats | Insert PNG, JPEG, GIF, SVG. Animated GIF playback is not established. | D+B |
| PREV-08 | Image storage modes | Linked sibling `assets/` folder or embedded/base64 self-contained Markdown. | U+D |
| PREV-09 | Image performance | Cached/downsampled previews; embedded-media cache type survives. | D+B |
| PREV-10 | Folder permissions | Missing-access banner, approval and remembered folder grant; local-image export uses same permission. | D+B |
| PREV-11 | Engine errors | Error states for missing engine, parse failures, timeouts; self-healing transient render failures advertised. | U+D+B |
| PREV-12 | Render cache management | Separate math/diagram caches and in-flight/loading/ready/failed states, generation tokens. Exact limits not recovered. | B |
| PREV-13 | Read-only right panel | HTML text is not exposed as an editable area; task inputs disabled; heading click does not select corresponding source. | V+U |

## Tables

Sources: [table editor](evidence/ui-table-editor.txt), [editor help](evidence/help-the-editor.txt), [formatting ribbon](evidence/ui-guided-tour.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| TABLE-01 | Grid editor | Modal table builder with editable headers/cells; initial grid observed as 3 columns × 2 body rows. | U |
| TABLE-02 | Structure operations | Add Row, Add Column, remove row/column controls, visible dimensions. | U |
| TABLE-03 | Per-column alignment | Alignment menu for each column. | U |
| TABLE-04 | Existing-table editing | Select existing source table and open editor; preserve prefix/suffix and extra cells rather than trimming. | D+B |
| TABLE-05 | Insert or cancel | Explicit confirmation button and cancellation; source serialization is Markdown. | U+D |
| TABLE-06 | Quick Table | Direct insertion shortcut distinct from the grid editor; recovered 2-column/2-body-row template. | U+B |
| TABLE-07 | Table formatting | Source formatter aligns Markdown columns; visual placement and text alignment remain distinct. | U+D |

## Math and equations

Sources: [equation editor](evidence/ui-equation-editor.txt), [math help](evidence/help-math-equations.txt), [palette captures](evidence/equation-greek.txt), [bundled assets](evidence/installed-sha256.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| MATH-01 | Offline TeX rendering | Bundled MathJax TeX-to-SVG engine; no CDN required. Sample inline/display equations rendered and exported. | V+B |
| MATH-02 | Equation editor | LaTeX field, live preview, Inline/Display toggle, Insert and Cancel, empty insert disabled. | U |
| MATH-03 | Structures palette | Powers, subscripts, fraction, square/nth roots, sum, product, integral, contour integral, limit, binomial, vector/hat/bar, matrix, cases. | U |
| MATH-04 | Greek palette | Lower/uppercase Greek choices; exact 30 buttons and TeX strings retained. | U |
| MATH-05 | Operators palette | Times/divide/plus-minus/minus-plus/dot/asterisk/star/circle/circled-plus/circled-times/nabla/partial/surd/percent. | U |
| MATH-06 | Relations palette | Equality, inequality, comparison, approximation, equivalence, similarity, proportionality, set membership/subsets/union/intersection. | U |
| MATH-07 | Arrows palette | Right/left/bidirectional, double arrows, maps-to, up/down. | U |
| MATH-08 | Symbols palette | Infinity, quantifiers, empty set, standard number sets, ellipses, angle/degree, perpendicular/parallel. | U |
| MATH-09 | Functions palette | sin, cos, tan, log, ln, exp, max, min, det, dim, gcd, mod. | U |
| MATH-10 | Template caret slots | Insertion positions caret in the first editable slot. | D+B |
| MATH-11 | Baseline alignment | Inline equation image baseline is tracked separately; proper text-baseline alignment advertised. | D+B |
| MATH-12 | Math export representations | SVG for HTML/EPUB/slides; image for PDF/DOCX/RTF; native TeX expressions for LaTeX. HTML SVG and DOCX image packaging exercised. | V+D+B |

## Mermaid diagrams

Sources: [visual editor](evidence/ui-mermaid-visual.txt), [node inspector](evidence/ui-mermaid-node.txt), [state editor](evidence/ui-state-visual-selected-source.txt), [sequence inspector](evidence/ui-state-visual-editor.txt), [diagram cards](evidence/ui-selected-diagram-card.txt), [card menu](evidence/menu-diagram-card.txt), [import options](evidence/ui-mermaid-import-options.txt), [help](evidence/help-mermaid-visual-editor.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| DIA-01 | Bundled full renderer | Local Mermaid engine supports broader syntax than the native visual editor. Flowchart, sequence, state, class and pie examples rendered. | V+B |
| DIA-02 | Other rendered types | ER, Gantt, journey, mindmap and other engine-supported types advertised. Exact engine syntax support requires fixtures/version pinning. | D+B |
| DIA-03 | Menu insertion templates | Generic diagram/flowchart, sequence, ER from Diagram menu and palette. | U |
| DIA-04 | Additional templates | Class, state, Gantt, pie examples survive in built-in guide/template strings. | B+D |
| DIA-05 | Diagram outline entries | Named metadata landmarks or type/source fallback labels. | V |
| DIA-06 | Card selection | Native preview card selection reveals visual-edit, alignment, reset-size, copy-source and resize affordances. | V |
| DIA-07 | Card actions menu | Visual Edit, Zoom, Copy Mermaid Source, Copy SVG, Export Diagram, Show Source. | U |
| DIA-08 | Individual diagram export | PNG save dialog and actual PNG output observed; SVG copy is separate. | V+U |
| DIA-09 | Card resizing | Drag corner; Shift maintains ratio; live dimensions; setting enables controls. | U+D |
| DIA-10 | Card alignment and size reset | Left/center/right placement and reset to configured dimensions. | U |
| DIA-11 | Layout metadata | Optional comment written only after layout/title edits; one undoable edit; plain Markdown compatibility. | D+B |
| DIA-12 | Source visibility | Per-card Show Source plus global default and independent HTML/DOCX source-export preferences. | U |
| DIA-13 | Visual editing scope | Flowchart, sequence and simple `stateDiagram-v2` have visual interfaces. Class diagram explicitly reports unsupported visual editing. | V |
| DIA-14 | Visual editor panes | Generated source, canvas, inspector; independently toggle source and inspector. | V |
| DIA-15 | Flow direction | Direction selector; observed Left→Right and Top→Down values. Other direction enum choices need direct menu capture. | U+B |
| DIA-16 | Node creation and movement | Add Node, select/move tool, canvas placement/drag, node labels, delete, snap-to-grid. | U+D |
| DIA-17 | Node shapes | Rectangle, rounded, diamond/decision, circle, stadium represented in implementation metadata. | U+D+B |
| DIA-18 | Edge editing | Source-node then target-node connection; labels; arrow/open/dotted/thick styles. | U+D+B |
| DIA-19 | Canvas layout and zoom | Auto Layout, Zoom In/Out, Fit, zoom indicator, source/inspector toggles. | U |
| DIA-20 | Canvas shortcuts | Select/Move V, Add Node N, Connect E displayed in tooltips. | U |
| DIA-21 | Sequence participants | Add/remove/rename participants. | U |
| DIA-22 | Sequence messages | Add/remove, choose sender/receiver, edit text, reorder up/down, solid/dashed arrow/line styles. | U+B |
| DIA-23 | State diagrams | States/transitions on flowchart-like canvas, start/end circle markers, generated `stateDiagram-v2`; label aliases documented. | V+D |
| DIA-24 | Apply and Cancel | Generated source changes in visual editor; Apply writes back, Cancel leaves source unchanged. Cancel exercised; edit/apply round trips still require test suite. | V+U+D |
| DIA-25 | Unsupported visual source | “Edit as Source” fallback for unsupported diagram kinds; prevent silent loss. | V |
| DIA-26 | Passthrough preservation | Preserve subgraph/style/classDef/click/linkStyle/exotic-arrow lines; warn about deleted referenced node IDs. | D+B |
| DIA-27 | Loss warnings | Warnings for unsupported notes/composite states/sequence loops or alt blocks before Apply removes content. | B |
| DIA-28 | Import file types | `.mmd`, `.mermaid`, `.md`, `.txt`; raw source wrapped in fence, documented multi-block selection. Complex Markdown import failed in this audit. | U+D |
| DIA-29 | Import configuration | Source/rendered preview, title, width, height, alignment, cursor/append/replace insertion choice, Import/Cancel. | U |
| DIA-30 | Rendering preferences | Enable rendering, live rendering, theme following, outline entries, source visibility, visual editing, move/resize, size/alignment. | U |
| DIA-31 | Render errors | Parse error display and unavailable-engine/timeout/empty-diagram paths; source remains editable. | U+B |
| DIA-32 | Renderer isolation | Local WebKit harness calls strict Mermaid initialization and returns SVG/size/token via message bridge. | B |
| DIA-33 | Native versus HTML affordances | Native cards expose the rich interaction controls above. HTML preview presented static SVG content; do not assume card-feature parity. | V+U |

## Search and command discovery

Sources: [Find/Replace](evidence/ui-find-replace.txt), [palette](evidence/ui-command-palette.txt), [palette pages](evidence/palette-page-3.txt), [search help](evidence/help-command-palette-search.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| SEARCH-01 | Find panel | In-document field, live count, previous/next, close; includes raw Mermaid because source is Markdown. | V+D |
| SEARCH-02 | Search options | Case sensitive, whole word, regex toggles. | U |
| SEARCH-03 | Replace expansion | Replace field, replace-current and replace-all actions. | U |
| SEARCH-04 | Replacement correctness | Match ranges recompute after edits; regex replacement accepts `$1` capture templates. | D |
| SEARCH-05 | Search keyboard flow | Return/Shift-Return cycle results while find field retains focus. | D |
| SEARCH-06 | Command palette | Fuzzy query, keyboard selection, Return to run, Escape to dismiss, empty-results state. | U+D |
| SEARCH-07 | Palette action coverage | Pane/mode toggles, diagram/table/code/link/task/equation insertion, table editor, formatter, snippets, diagram import/editor, HTML/PDF/DOCX export, Copy as HTML, themes, Settings. | U |
| SEARCH-08 | Dynamic navigation | Commands for each heading and diagram landmark in active document. | U |
| SEARCH-09 | Copy as HTML | Copies rendered HTML; clipboard fidelity not tested. | U+D |

## Workspace and links

Sources: [workspace window](evidence/ui-workspace.txt), [workspace help](evidence/help-workspace-linking.txt), [implementation fields](evidence/swift5_reflstr.txt).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| WORK-01 | Folder workspace | Separate window; File Workspace, Open Folder as Workspace; no-folder state. | U |
| WORK-02 | Markdown file browsing | Lists Markdown notes from chosen folder. Recursion/exclusion policy not established. | D |
| WORK-03 | Quick Open | Fuzzy filename field; Return opens selected note. | D |
| WORK-04 | Cross-file search | Search tab, phrase search across notes, file and line result context, open result. | D |
| WORK-05 | Wiki links | Note names and aliases resolve inside workspace; opening linked notes is documented. | D+B |
| WORK-06 | Backlinks | Tab lists notes linking to active document; no-backlinks/no-active-document states. | D+B |
| WORK-07 | Workspace persistence | Folder path and security bookmark retained and restored at next launch. | D+B |

## Versions snippets and automation

Sources: [version history](evidence/ui-version-snapshot.txt), [Snippets settings](evidence/settings-snippets.txt), [automation help](evidence/help-versions-snippets-automation.txt), [bundle services](evidence/app-info.json).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| LOCAL-01 | Automatic versions | Local snapshots as saved documents are edited; history begins only after save. Frequency/retention limits not recovered. | D+B |
| LOCAL-02 | Manual version capture | File Save Version and history Snapshot Now; actual snapshot created for fixture. | V |
| LOCAL-03 | History list | Timestamp and byte size, version selection. | V |
| LOCAL-04 | Diff view | Compared to current, additions/removals counts and line list. Unchanged snapshot displayed +0 −0. | V |
| LOCAL-05 | Restore safety | Restore first captures current text; recoverable history, no cloud dependency. | U+D |
| LOCAL-06 | Snippet management | Select/add/remove, name, trigger, body editor, `$0` caret marker. | U+D+B |
| LOCAL-07 | Snippet expansion | Trigger followed by Tab; also insert via command palette. | U+D |
| LOCAL-08 | Built-in snippets | Note (`note`), warning (`warn`), fenced code (`code`), 2×2 table (`table`), link (`link`), details (`details`), front matter (`fm`). | U |
| LOCAL-09 | Snippet persistence | User snippets plus backup key survive in implementation metadata. Exact restore behavior untested. | B |
| LOCAL-10 | Shortcuts integration | “New Markdown Note” and “Append to Scratchpad” App Intents; optional initial text. | D+B |
| LOCAL-11 | macOS Services | Selected text becomes New Remarque Note or Append to Remarque Scratchpad. | U+B |

## Import export and print

Sources: [export help](evidence/help-exporting.txt), [export commands](evidence/menu-export.txt), [Export settings](evidence/settings-export.txt), [actual outputs](evidence/exports/), [structural validation](evidence/export-validation.json).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| IO-01 | Document conversion import | Native picker for RTF, Word DOCX, PDF; converts to new Markdown document. | U+D+B |
| IO-02 | DOCX import | In-app ZIP/XML reader; documented equations/images/numbering/nesting preservation, embedded images. | D+B |
| IO-03 | PDF import limits | Best-effort text extraction; layout, tables, equations are not promised to survive. | D+B |
| IO-04 | HTML export | Standalone styled HTML, inline CSS option, embedded diagram/math SVG, optional Mermaid source, custom CSS. Actual output contains 9 SVGs, no external script tags. | V+U |
| IO-05 | PDF export | Paginated output; TextKit exporter; math/diagrams as images; title page, TOC with page numbers, page numbers, page size and landscape documented. File generated, full visual fidelity not certified. | V+D+B |
| IO-06 | DOCX export | OOXML headings/styles, lists/numbering, tables, links, marks, diagrams/math images; structural options. Actual package has nine PNGs and valid XML. | V+D+B |
| IO-07 | RTF export | Styled rich text with image-backed diagrams/math. File generated; downstream word-processor fidelity untested. | V+D |
| IO-08 | Slides export | Single HTML deck with embedded graphics and navigation script. Probe created 12 slides; documentation says top-level-heading split, which does not match this fixture. | V+D |
| IO-09 | EPUB export | EPUB 3 ZIP, navigation, chapter XHTML, styles, local-image packaging documented. Generated ZIP/XML parses; reader/EPUB-validator conformance untested. | V+D+B |
| IO-10 | LaTeX export | Article preamble, mapped structure/marks/lists/tables/verbatim code, native math. Save panel produced `feature-probe.tex.txt`; compile not tested. | V+D+B |
| IO-11 | Remarque bundle | ZIP-compatible `.remarque` export packages Markdown and available assets. Probe archive contains its Markdown file; asset behavior not exercised. Reopen support not established. | V+D+B |
| IO-12 | Embedded Markdown | Self-contained `.md` with base64 images; sample without local images exported successfully. | V+D |
| IO-13 | Export entry points | File menu, toolbar export menu, and selected palette commands; native save dialog; reveal in Finder documented. | V+U+D |
| IO-14 | Default export preference | Configurable default format, initially HTML in observed settings. | U |
| IO-15 | Structural export options | Title page, table of contents, page numbers; Letter/A4, landscape, front matter, image embedding; PDF follows some DOCX-labelled controls. | U+D |
| IO-16 | Source inclusion options | Independent Mermaid-source inclusion for DOCX versus HTML/general exports. | U |
| IO-17 | Custom stylesheet | Choose custom CSS for HTML/slides; persistent bookmark across launches. | U+D+B |
| IO-18 | Print document | Rendered document command and Cmd-P. Web-print/native-print implementations survive. | U+B |
| IO-19 | Print source | Raw Markdown/Mermaid listing. | U+D |
| IO-20 | Combined printing | Rendered document followed by labelled source in one print job; light print theme documented. | U+D |
| IO-21 | Export fallback and failure handling | Diagram placeholder fallback; unreadable media/engine errors; atomic output promise. Exact error recovery requires regression tests. | D+B |

## Accessibility and product constraints

Sources: [privacy/accessibility help](evidence/help-privacy-local-first.txt), all UI evidence, [entitlements](evidence/entitlements.plist).

| ID | Feature | Baseline behavior and preservation contract | Evidence |
| --- | --- | --- | --- |
| ACCESS-01 | Accessible controls | Many controls provide names/help; diagram nodes exposed as selectable accessibility buttons. | V |
| ACCESS-02 | Keyboard operation | Standard shortcuts, menus, documented full keyboard navigation; complete accessibility audit outstanding. | U+D |
| ACCESS-03 | Text scaling | Editor/preview size preferences and shared ribbon size stepper. | U |
| ACCESS-04 | Theme choices | System, Paper, Midnight, Graphite; Graphite has light/dark variants by documentation. | U+D |
| ACCESS-05 | Sandboxed architecture | App Sandbox and user-selected read/write plus scoped bookmarks entitlements present. Network-client entitlement is also present; offline claims need runtime verification. | B |
| ACCESS-06 | No account workflow | No account, sign-in, sync, collaboration or subscription feature found in inspected product surfaces. This is an observed scope statement, not a proof about every code path. | U+D |

## Exact control inventories

The [control reference](CONTROL_REFERENCE.md) preserves all eight preference sections, observed values, keyboard shortcuts, menu command trees, equation palette entries, and documented help topics. These controls are part of this feature inventory, including individually configurable options grouped above.

## Evidence and preservation

- [Verification and discrepancies](VERIFICATION.md) records each completed probe and outstanding acceptance area.
- [Recovery report](RECOVERY.md) lists the archived executable bundle, hashes, extracted text, recovered templates and renderer assets.
- [Rebuild specification](REBUILD_SPECIFICATION.md) defines the new interaction model and release gates.
- [Machine-readable feature index](feature-index.json) mirrors the feature rows for tracking.

The shipped binary and bundled assets are preserved. **The original Swift source, project, tests, build configuration and repository history have not been recovered.**
