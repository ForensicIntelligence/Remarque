# Comprehensive Mermaid support

Added at the user's request on 29 October 2026. This expands the rebuild requirements; it does not claim these capabilities existed in Remarque 2.1 or have already been implemented. The term **comprehensive** has a testable scope: all **33 authoring families** in the catalogue below, their named variants, a searchable insertion gallery, live source editing, offline rendering, styling controls where supported, and output verification.

The official documentation and release page identify **Mermaid 12.2.0** as the reference release checked for this specification. The main syntax navigation lists 31 families, including ZenUML; the tagged renderer registry and additional documentation establish Agentflow and Railroad. Internal `info`/error renderers are diagnostic utilities, not extra chart families. [Official catalogue](https://mermaid.js.org/intro/), [12.2.0 release](https://github.com/mermaid-js/mermaid/releases/tag/mermaid%4012.2.0), [tagged renderer registry](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/diagram-api/diagram-orchestration.ts).

## Engine and compatibility requirements

- **MER-01:** Pin the full Mermaid 12.2.0 distribution as the initial rebuild target, or a subsequently verified compatible release with at least this coverage. The old archived JavaScript is a comparison resource, not a ceiling on supported types. Package every required lazy-loaded module locally. Do not use a reduced/tiny build that omits required diagram types.
- **MER-02:** Bundle and explicitly register a compatible, pinned ZenUML extension locally. The core Mermaid bundle alone does not establish ZenUML support. Verify extension licensing and WebKit compatibility. [ZenUML integration](https://mermaid.js.org/syntax/zenuml.html).
- **MER-03:** Record exact engine, extension, layout, icon-pack and font versions/hashes in the app's dependency manifest. Use no runtime CDN. A new format that cannot render offline in the shipped app is not supported.
- **MER-04:** Preserve all original Mermaid source and recognized legacy syntax/aliases, including version-dependent `-beta` spellings. Use engine parsing/detection, not a hand-maintained first-word list alone. Test the old baseline documents after the engine upgrade; never rewrite them just to change the renderer version.
- **MER-05:** Label beta/experimental syntax accurately in the gallery/help. Include it in required coverage; a beta label is not permission to ship a broken template. Keep source editable on parse/render failure and identify the bundled engine version in diagnostic details.
- **MER-06:** Core authoring and all templates must render with network disabled. Bundle required layout modules/icon resources. Agentflow is diagram notation only; it does not execute agents, call tools, access accounts, or require an AI API.

## Required family catalogue

Every row is mandatory for **insert template → render → select/reveal source → edit source live → save/reopen → copy SVG/export PNG → document export**. The listed source entry forms are reference spellings for the selected release. Preserve accepted historical aliases; validate generated source against the actual bundled engine rather than assuming that a documentation page proves runtime behavior.

| ID | Family / gallery label | Source entry form | Required starter/variant coverage | Official reference |
| --- | --- | --- | --- | --- |
| MER-T01 | Flowchart | `flowchart`, legacy `graph` | Process, decision branches, subgraphs; vertical/horizontal; extended shapes and labelled edges | [Flowchart](https://mermaid.js.org/syntax/flowchart.html) |
| MER-T02 | Swimlanes | `swimlane-beta` | Multiple responsibility lanes and cross-lane handoffs | [Swimlanes](https://mermaid.js.org/syntax/swimlanes.html) |
| MER-T03 | Sequence | `sequenceDiagram` | Participants, calls/replies, notes, activation and nested control fragments | [Sequence](https://mermaid.js.org/syntax/sequenceDiagram.html) |
| MER-T04 | Class | `classDiagram` | Classes, properties/methods, relationships and multiplicity | [Class](https://mermaid.js.org/syntax/classDiagram.html) |
| MER-T05 | State | `stateDiagram-v2`, accepted legacy `stateDiagram` | Simple transitions and composite-state source example | [State](https://mermaid.js.org/syntax/stateDiagram.html) |
| MER-T06 | Entity Relationship | `erDiagram` | Entities, attributes, cardinality and identifying/nonidentifying relationships | [ER](https://mermaid.js.org/syntax/entityRelationshipDiagram.html) |
| MER-T07 | User Journey | `journey` | Sections, activities, scores and actors | [Journey](https://mermaid.js.org/syntax/userJourney.html) |
| MER-T08 | Gantt | `gantt` | Sections, dated/dependent tasks, milestones and status | [Gantt](https://mermaid.js.org/syntax/gantt.html) |
| MER-T09 | Pie | `pie` | Labelled values and optional value display | [Pie](https://mermaid.js.org/syntax/pie.html) |
| MER-T10 | Quadrant | `quadrantChart` | Axis labels, four quadrants and positioned points | [Quadrant](https://mermaid.js.org/syntax/quadrantChart.html) |
| MER-T11 | Requirements | `requirementDiagram` | Requirements, elements, risk/verification fields and relationships | [Requirements](https://mermaid.js.org/syntax/requirementDiagram.html) |
| MER-T12 | Use Case | `usecase-beta` | Actors, system boundary, use cases and typed relationships | [Use Case](https://mermaid.js.org/syntax/usecase.html) |
| MER-T13 | Git Graph | `gitGraph` | Branch/commit/merge and labelled commits | [Git Graph](https://mermaid.js.org/syntax/gitgraph.html) |
| MER-T14 | C4 | `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment` | **Five distinct starters**, one for each named variant | [C4](https://mermaid.js.org/syntax/c4.html) |
| MER-T15 | Mindmap | `mindmap` | Nested topics, alternate node forms and locally available icons | [Mindmap](https://mermaid.js.org/syntax/mindmap.html) |
| MER-T16 | Timeline | `timeline` | Periods, multiple events and sections | [Timeline](https://mermaid.js.org/syntax/timeline.html) |
| MER-T17 | ZenUML | `zenuml` | Calls, return/conditional/loop constructs; registered local extension | [ZenUML](https://mermaid.js.org/syntax/zenuml.html) |
| MER-T18 | Sankey | `sankey`; preserve supported legacy aliases | Weighted flows with multiple sources/targets | [Sankey](https://mermaid.js.org/syntax/sankey.html) |
| MER-T19 | XY Chart | `xychart`, accepted `xychart-beta` | Separate **bar** and **line** starters; combined series example | [XY Chart](https://mermaid.js.org/syntax/xyChart.html) |
| MER-T20 | Block | `block`; preserve supported legacy aliases | Columns, spans, nested blocks and connections | [Block](https://mermaid.js.org/syntax/block.html) |
| MER-T21 | Packet | `packet`; preserve supported legacy aliases | Bit ranges, field labels and multirow layout | [Packet](https://mermaid.js.org/syntax/packet.html) |
| MER-T22 | Kanban | `kanban` | Columns, cards and supported card metadata | [Kanban](https://mermaid.js.org/syntax/kanban.html) |
| MER-T23 | Architecture | `architecture-beta` | Groups/services/ports, connections and local built-in icons | [Architecture](https://mermaid.js.org/syntax/architecture.html) |
| MER-T24 | Radar | `radar-beta` | Multiple axes and two comparable datasets | [Radar](https://mermaid.js.org/syntax/radar.html) |
| MER-T25 | Event Modeling | `eventmodeling` | UI/command/event/read-model sequence; compact and relaxed syntax fixtures | [Event Modeling](https://mermaid.js.org/syntax/eventmodeling.html) |
| MER-T26 | Treemap | `treemap-beta` | Nested categories with numeric leaves | [Treemap](https://mermaid.js.org/syntax/treemap.html) |
| MER-T27 | Venn | `venn-beta` | Labelled sets and pairwise/three-way overlaps | [Venn](https://mermaid.js.org/syntax/venn.html) |
| MER-T28 | Ishikawa / Fishbone | `ishikawa-beta` | Outcome, cause categories and nested causes | [Ishikawa](https://mermaid.js.org/syntax/ishikawa.html) |
| MER-T29 | Wardley Map | `wardley-beta` | User anchor, components, dependencies and evolution | [Wardley](https://mermaid.js.org/syntax/wardley.html) |
| MER-T30 | Cynefin | `cynefin-beta` | All five domains, example items and transitions | [Cynefin](https://mermaid.js.org/syntax/cynefin.html) |
| MER-T31 | Tree View | `treeView-beta` | Directory hierarchy and annotated nodes; indentation/box-drawing fixtures | [Tree View](https://mermaid.js.org/syntax/treeView.html) |
| MER-T32 | Agentflow | `agentflow-beta` | Flow containers and task/tool/decision nodes; static diagram only | [Agentflow](https://mermaid.js.org/syntax/agentflow.html) |
| MER-T33 | Railroad / Grammar | `railroad-beta`, `railroad-ebnf-beta`, `railroad-abnf-beta`, `railroad-peg-beta` | **Four distinct starters**: native DSL, EBNF, ABNF and PEG | [Tagged Railroad documentation](https://github.com/mermaid-js/mermaid/blob/mermaid%4012.2.0/packages/mermaid/src/docs/syntax/railroad.md) |

The catalogue therefore requires **at least 41 valid starter templates**: one per family, four additional C4 variants, three additional Railroad variants, and a second XY starter. Extra examples and direction/style presets increase that number. Aliases and themes do not count as additional diagram families. PlantUML, Graphviz, arbitrary JavaScript charts, and arbitrary third-party Mermaid plugins are not implied by “Mermaid support.”

## Gallery, editing and visual controls

- **MER-07:** The Mermaid tab opens a searchable template gallery grouped by Process, Software/UML, Architecture, Planning, Data, Strategy and Grammar. Include readable thumbnails, a short purpose, syntax status and source preview. Search synonyms such as fishbone, ERD, bar, line, syntax diagram and directory tree. Use a compact gallery/popover rather than adding 33 top-level toolbar tabs.
- **MER-08:** Choosing a template previews it; **Insert** creates one fenced block at the retained selection. A template never replaces an existing diagram merely because it was clicked. Explicit Replace Diagram is undoable and names its target. Preserve the user's last insertion anchor while the gallery has focus.
- **MER-09:** Every family gets live Mermaid source editing in the right tab with diagnostics and corresponding left-source updates. Card selection, size/alignment/title, source visibility, zoom, Copy Source, Copy SVG and Export PNG work for every rendered type.
- **MER-10:** Preserve the existing dedicated visual editors for flowchart, sequence and simple state diagrams. Provide a visible **Edit Source** path for every other type, and mark visual-canvas capability accurately. Comprehensive format support does not falsely claim arbitrary node/canvas editing for all grammars. A more complex diagram must remain source-backed rather than being coerced into a simpler canvas model.
- **MER-11:** Expand the flowchart shape picker to the pinned engine's supported shape catalogue, with thumbnails/names, filtering and safe source insertion. Preserve noneditable shape-specific properties. If a source shape has no safe canvas adapter, retain/render it and expose its source instead of converting it to a rectangle. Flowchart labels, direction, edge variants, subgraphs and safe style properties remain editable.
- **MER-12:** Use a declarative format registry shared by gallery, detection labels, help, imports, command palette and tests. Each record has a stable ID, display name, aliases, syntax entry, template IDs, required modules, beta status, visual-edit capability, styling/layout capabilities and reference URL. Do not maintain contradictory independent lists.

## Chart appearance and layout styles

Support diagram families and chart appearance as separate choices. The documented engine themes include `default`, `neutral`, `dark`, `forest`, `base`, `neo`, `neo-dark`, `redux`, `redux-dark`, `redux-color` and `redux-dark-color`. Offer these in an overflow Style control plus **Follow App**. Expose `classic`, `neo` and `handDrawn` looks only for types that actually implement them. Custom colors use validated supported theme variables; immutable engine/security configuration cannot be changed by a diagram. [Official theme configuration](https://mermaid.js.org/config/theming.html).

Expose layout selection only where applicable: engine default, Dagre, ELK, supported ELK variants, COSE-Bilkent and Tidy Tree. Bundle/register any additional required module and validate it offline. Some charts have fixed/custom layout; do not offer an ineffective generic layout selector there. The official layout and theme pages contain differing general statements about defaults, so set Remarque's choices explicitly and test the shipped registry. [Official layouts](https://mermaid.js.org/config/layouts.html).

- **MER-13:** Preserve the original visual feel for old files by explicitly selecting compatible classic/theme/layout defaults where possible; do not modify source on opening. New diagrams may use the selected style preset. Allow app-following light/dark defaults and a print-friendly monochrome choice.
- **MER-14:** A user-selected per-diagram theme/look/layout is saved in valid Mermaid front matter inside that diagram's fence, preserving existing front matter and unknown keys. Diagram dimensions/title/placement remain in Remarque metadata. Never confuse inner Mermaid front matter with the Markdown document's front matter. A purely temporary preview choice is visibly labelled temporary.
- **MER-15:** Clamp/validate supported style options, sanitize CSS/color/font/icon values, and retain strict security. Disable unsupported combinations with a short reason. Do not lower security or permit remote resource fetches to make a template render.
- **MER-16:** Style changes are source transactions with shared Undo when persisted. Passive app theme changes and view zoom are presentation changes. Keep source mapping and current diagram selection valid through either change. Respect reduced motion and disable unnecessary animation in print/export.

## Comprehensive-support release gate

These checks supplement the main specification's acceptance suite and must be tracked in its feature ledger:

| ID | Required check |
| --- | --- |
| MER-A01 | Registry has all MER-T01–MER-T33 families and at least 41 templates with the named C4/Railroad/XY variants. No visible template is an unimplemented placeholder. |
| MER-A02 | Every starter renders to nonempty, valid, sanitized graphic content in the shipped app while offline, in light and dark modes, with no missing dynamic import/font/icon/layout requests. |
| MER-A03 | Every starter survives insert, right-source edit, left-source edit, source reveal, save/reopen and shared undo/redo. A repeated title still selects the correct fence. |
| MER-A04 | Every family supports card operations, valid SVG copy and PNG export, plus representative appearance in HTML/PDF/DOCX/RTF/slides/EPUB/LaTeX output. Markdown/bundle exports retain original diagram source. Labelled source/graphic fallbacks are recorded, never blank silent omission. |
| MER-A05 | Test richer syntax for each family beyond the starter: the variant coverage in its catalogue row, malformed input, Unicode and a large example. Preserve unknown constructs during adjacent edits. |
| MER-A06 | Test old Mermaid fixtures and accepted legacy aliases against the new engine; compare semantics and documented visual differences. Upgrading the renderer cannot alter canonical Markdown. |
| MER-A07 | Test available theme/look/layout combinations by capability, including explicit per-diagram overrides and light printing. Selected styling survives save/reopen without losing existing configuration. |
| MER-A08 | All required external modules, including ZenUML, are pinned/bundled/licensed; all renderer responses obey document/revision identity and safe SVG/bridge rules. |
| MER-A09 | Gallery and source inspector work by keyboard and VoiceOver. Each diagram has an accessible title/type/source action; thumbnail color is not the only type/status indicator. |
| MER-A10 | A supported-format report generated from the same registry states engine version, family/variant coverage, visual-edit capabilities and actual test results. Reconcile official registry changes during planned dependency upgrades; do not auto-update engines at runtime. |

Do not label Mermaid support “comprehensive” in the finished product until these checks pass. Source editing with an error card is a recovery path, not evidence that a required format renders successfully.
