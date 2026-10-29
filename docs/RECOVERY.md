# Remarque recovery report

The installed Remarque 2.1 (733) application survives. Its original source repository was not present in the empty rebuild workspace and was not found in the app bundle or name-indexed Remarque/Remarkable locations inspected. Several local marketing-site copies were found; they are not the application source.

## Preserved materials

| Material | Location | What it provides |
| --- | --- | --- |
| Installed app archive | [Remarque-2.1-733.zip](../recovery/Remarque-2.1-733.zip) | Local archive of the entire installed app bundle, including executable and resources. |
| Installed executable and asset hashes | [installed-sha256.txt](evidence/installed-sha256.txt) | Fingerprints for executable, Mermaid JavaScript and MathJax JavaScript. |
| Bundle configuration | [app-info.json](evidence/app-info.json) | Version, IDs, document types, Services, macOS requirement and build metadata. |
| Code-signing entitlements | [entitlements.plist](evidence/entitlements.plist) | Sandbox, user-selected file access, scoped bookmarks, picture access and network-client entitlement. |
| UTF-8 executable strings | [cstring.json](evidence/cstring.json), [readable form](evidence/cstring.txt) | 1,042 ARM64 C-string entries, including help, templates, errors, export fragments and rendering harnesses. |
| Swift reflection field strings | [swift5_reflstr.json](evidence/swift5_reflstr.json) | 1,027 field/case names supporting data-model and preference reconstruction. |
| Objective-C selectors | [objc_methname.json](evidence/objc_methname.json) | 706 method-name entries, including framework integration points. |
| General executable strings | [executable-strings.txt](evidence/executable-strings.txt) | Broader raw strings including Swift type names; duplicated/noisy due to universal binary and instruction bytes. |
| Demangled symbol listing | [demangled-symbols.txt](evidence/demangled-symbols.txt) | Mostly imported framework/runtime symbols. This is not decompiled app source. |
| Recovered multiline text | [recovered-text](../recovery/recovered-text/) | Seven Markdown snippets/templates/examples and two HTML renderer harness strings, saved separately for reuse. These may be string fragments rather than complete original source files. |
| Reproducible extractor | [extract_metadata.py](../recovery/extract_metadata.py) | Read-only Mach-O ARM64 string-section extraction; does not alter installed app. |
| Behavioral evidence | [evidence](evidence/) | UI snapshots, original screenshots, help articles, exact controls and actual exports. |

The temporary second `.app` copy was compressed and removed to avoid macOS resolving two apps with the same bundle identifier. The archive remains local. This is a preservation copy on the same machine, not an off-device disaster-recovery backup.

## Installed application facts

- Version 2.1, build 733; bundle ID `ca.forensicintelligence.remarkable`.
- Native universal executable for x86_64 and arm64; minimum macOS 14.0.
- Bundled `mermaid.min.js` and `mathjax-tex-svg.js`; no original Swift project or source files in the shipped bundle.
- Bundled app icon/assets and App Intents metadata.
- Markdown extensions `.md`, `.markdown`, `.mdown`; document role Editor/Owner for declared Markdown types, plus plain text handling.
- Sandbox, user-selected read/write and security-scoped-bookmark entitlements. Network-client entitlement is enabled; do not infer enforced offline isolation from the sandbox alone.

## Recoverable architecture clues

Names below are surviving implementation/type metadata, not guarantees of full implementation behavior. They give the rebuild a useful component map.

| Area | Surviving names and concepts |
| --- | --- |
| Application/document shell | `RemarqueApp`, `AppCommands`, `RemarqueAppDelegate`, `MarkdownDocument`, `WindowConfigurator`, `DocumentFileWatcher`, `FileWatcher` |
| Shared editing | `EditorViewModel`, `EditorCommandTarget`, `EditorAction`, `MarkdownTextView`, `MarkdownTextViewRepresentable`, `MarkdownEditorView`, `MarkdownLineEditing`, `MarkdownFormatter` |
| Source presentation | `MarkdownSyntaxHighlighter`, `LineNumberRulerView`, `LiveMarkerHider`, `LiveTileAttachment`, `LiveBlockTile` |
| UI tools | `MainEditorView`, `EditorRibbonView`, `MarkdownToolPaletteView`, `LayoutSelectorView`, `StatusBarView`, `CommandPaletteView`, `SearchPanelView` |
| Parsing | `MarkdownParser`, `MarkdownParseContext`, `MarkdownAST`, `MarkdownBlock`, `MarkdownInline`, `ListItem`, `DefinitionItem`, `Footnote`, `ColumnAlignment`, `CalloutKind` |
| Outline | `OutlineItem`, `DocumentOutlineView`, `OutlineRowView`; heading/diagram kind, source line and title |
| Preview | `MarkdownPreviewView`, `MarkdownWebPreviewView`, `MarkdownRenderer`, `PreviewTheme`, `PreviewScrollObserver`, `TablePreviewView`, `CollapsibleSectionView`, `ImageAccessBanner` |
| Highlighting | `CodeHighlighter`, `CodeToken`, `CodeTokenType`, `LangConfig`, `Lexer` |
| Tables | `MarkdownTableModel`, `TableEditorView`; headers, rows, alignments, prefix/suffix lines, existing-table state |
| Math | `EquationModel`, `EquationEditorView`, `EquationField`, `EquationSymbol`, `EquationCategory`, `EquationPreview`, `MathEngineRenderer`, `MathImageStore`, `MathWebAssets` |
| Mermaid rendering | `MermaidEngineRenderer`, `MermaidImageStore`, `MermaidWebAssets`, `MermaidWebView`, `MermaidRenderer`, `MermaidRenderResult`, draw-list/primitives types |
| Mermaid editing | `MermaidVisualModel`, `MermaidEditorState`, `MermaidTool`, `MermaidCanvasView`, `MermaidVisualEditorView`, `MermaidDiagramInspectorView`, flowchart/sequence node/edge/message models |
| Mermaid integration | `MermaidDiagramMetadata`, `MermaidDiagramCardView`, `MermaidImportSheet`, `DiagramZoomView`, `FlowchartLayout`, `SequenceLayout` |
| Export/print | `ExportOptions`, `ExportFormat`, `PageSize`, `AttributedDocumentBuilder`, `PaginatedText`, `PDFExporter`, `WebPrinter`, `PrintCoordinator`, `DOCXDocumentXMLBuilder`, `ZipArchiveWriter` |
| Import | `DocxReader`, `ZipArchiveReader`; Word document/relationship/numbering XML paths |
| Local data | `DocumentVersion`, `DiffLine`, `SnippetStore`, `SearchService`, `WorkspaceModel`, `WorkspaceFile`, `WorkspaceSearchHit`, `FolderAccessStore` |
| Settings/themes | `AppSettings`, `AppStoragePublished`, `AppTheme`, `ThemePalette`, `SyntaxPalette`, `MermaidPalette`, `MediaStorageMode` |
| Help/integration | `DocumentationView`, `DocArticle`, `DocBlock`, `MarkdownGuideView`, `MermaidGuideView`, `KeyboardShortcutsView`, `OnboardingView`, `WhatsNewView`, `ReleaseNotes`, `RemarqueServiceProvider`, `RemarqueShortcuts`, `QuickCaptureIntent`, `NewNoteIntent` |

Reflection reveals existing block-line mappings, source/selection state, scroll ownership/throttling, render generations, cache state, security bookmarks and preferences. It does **not** establish that the original parser preserved a lossless concrete syntax tree or precise rendered-text source mapping; the new editing requirements need those guarantees explicitly.

## What has not been recovered

Original `.swift` files, Xcode project/workspace, package manifests, tests, compiler settings, source-control history, release pipeline, migration schemas and signing workflow are not recovered. Some Swift source filenames occur in assertion strings, but those strings contain no implementation.

Direct reading of the protected app data container was denied by macOS. User settings were read through the app, while internal version retention, scratchpad storage, bookmark persistence format and migration behavior remain unverified. No broader filesystem backup or remote-repository recovery was performed.

Future source recovery can investigate known backups/remotes/build archives if the user identifies them. The current rebuild specification does not depend on those becoming available.
