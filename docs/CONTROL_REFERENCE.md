# Remarque control reference

Exact control names observed in Remarque 2.1 (733), 29 October 2026. Values below are the configuration on this machine, **not certified factory defaults**. A disabled menu item reflects its capture context. Native macOS items and share/service destinations vary by OS and installed applications.

## Preferences

### Appearance

[Original capture](evidence/settings-appearance.txt).

```text
pop up button Theme, Value: System
heading Editor
text field (settable) Editor font, Value: SF Mono
slider (settable, float) Editor size: 15 pt, Value: 15
slider (settable, float) Line spacing: 1.45, Value: 1.45
switch Show line numbers, Value: off
switch Show current line highlight, Value: on
switch Syntax-highlight code blocks, Value: on
switch Show status bar, Value: on
heading Preview
slider (settable, float) Preview size: 17 pt, Value: 17
```

### Editing

[Original capture](evidence/settings-editing.txt).

```text
switch Smart editing mode (⌥⌘S), Value: on
switch Smart headings (Tab at line start cycles #, ##, ###), Value: on
switch Smart quotes, Value: off
switch Smart dashes, Value: off
switch Auto-pair brackets, Value: on
switch Smart paste (convert HTML/Word to Markdown), Value: on
text Render-aware style toggles, list & quote continuation, snippet expansion, and the options above. Turn off for a plain text editor.
switch Live editing mode — WYSIWYG (⌥⌘W), Value: off
switch Soft wrap, Value: on
switch Typewriter mode, Value: off
switch Spellcheck, Value: on
switch Dim inactive paragraphs in Focus Mode, Value: on
switch Show Markdown tool palette, Value: on
switch Show formatting ribbon, Value: on
switch WYSIWYG preview & matching print (HTML engine), Value: on
```

### Preview

[Original capture](evidence/settings-preview.txt).

```text
switch Live preview, Value: on
slider (settable, float) Preview debounce: 150 ms, Value: 0.15
switch Scroll sync, Value: on
switch Hide front matter in preview, Value: on
switch Open links in default browser, Value: on
```

### Mermaid

[Original capture](evidence/settings-mermaid.txt).

```text
heading Rendering
switch Enable Mermaid rendering, Value: on
switch Render Mermaid live in preview, Value: on
switch Mermaid theme follows app theme, Value: on
switch Show Mermaid source below diagram, Value: off
switch Show Mermaid diagrams in outline, Value: on
heading Editing
switch Enable visual Mermaid editing, Value: on
switch Enable move/resize controls, Value: on
heading Defaults
slider (settable, float) Default width: 720 pt, Value: 720
slider (settable, float) Default height: 420 pt, Value: 420
pop up button Default alignment, Value: Center
heading Security
text Security level, Value: Strict Remarque renders diagrams locally and never executes diagram scripts.
```

### Export

[Original capture](evidence/settings-export.txt).

```text
pop up button Default format, Value: HTML
pop up button Image storage, Value: Linked — sibling assets/ folder
heading Document
switch Include title page, Value: off
switch Include table of contents, Value: off
switch Include page numbers (DOCX), Value: off
heading DOCX
pop up button Page size, Value: Letter
switch Landscape orientation, Value: off
switch Include front matter, Value: off
switch Embed local images, Value: off
switch Include Mermaid source below diagrams, Value: off
heading HTML & Slides
switch Include inline CSS, Value: on
switch Include Mermaid source in exports, Value: off
text Custom CSS None
button Choose…
```

### Snippets

[Original capture](evidence/settings-snippets.txt).

```text
row (selectable) Note callout
note ⇥
row (selectable) Warning callout
warn ⇥
row (selectable) Fenced code
code ⇥
row (selectable) Table 2×2
table ⇥
row (selectable) Link
link ⇥
row (selectable) Details
details ⇥
row (selectable) Front matter
fm ⇥
button Add
button (disabled) Remove
text Select or add a snippet
```

### Keyboard

[Original capture](evidence/settings-keyboard.txt).

```text
text DOCUMENTS New ⌘N Open ⌘O Save ⌘S Save As ⇧⌘S Save Version ⌃⌘S Print ⌘P Import Document ⇧⌘I Import Mermaid ⌥⌘I Export DOCX ⇧⌘D Show Start Window ⌥⇧⌘N Workspace ⇧⌘0 FORMATTING Bold ⌘B Italic ⌘I Insert Link ⌘K Code Block ⌥⌘C Insert Equation ⌃⌘E Mermaid Diagram ⌥⌘M Format Document ⌥⌘L Emoji & Symbols ⌃⌘Space VIEW Command Palette ⇧⌘P Find ⌘F Toggle Preview ⌥⌘P Toggle Outline ⌥⌘O Focus Mode ⌥⌘F Typewriter Mode ⌥⌘T Smart Editing Mode ⌥⌘S Live Editing Mode ⌥⌘W Formatting Ribbon ⌃⌘R Start Presentation ⌥⌘↩ Mermaid Visual Editor ⇧⌘M HELP Documentation ⌘?
```

### About Remarque

Eighth preferences item is present in the toolbar overflow; it was shown disabled in that menu capture. Its full preference-page body was not opened. The native About panel verifies Remarque 2.1 (733) and the product tagline; embedded settings text includes Forensic Intelligence attribution and publisher website. [Overflow](evidence/settings-overflow.txt) · [About panel](evidence/ui-about.txt).

### Snippet fields and exact bodies

Fields: Name, Trigger (type + Tab to expand), Body. Add/Remove controls; `$0` specifies caret placement.

**Note callout** — [capture](evidence/settings-snippet-detail.txt)

````text
> [!NOTE]
> $0
````

**Warning callout** — [capture](evidence/snippet-warning-callout.txt)

````text
> [!WARNING]
> $0
````

**Fenced code** — [capture](evidence/snippet-fenced-code.txt)

````text
```
$0
```
````

**Table 2×2** — [capture](evidence/snippet-table-2-2.txt)

````text
| $0 | Header |
| --- | --- |
| Cell | Cell |
````

**Link** — [capture](evidence/snippet-link.txt)

````text
[$0](https://)
````

**Details** — [capture](evidence/snippet-details.txt)

````text
<details>
<summary>$0</summary>


</details>
````

**Front matter** — [capture](evidence/snippet-front-matter.txt)

````text
---
title: $0
date: 
---
````

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New document | ⌘N |
| Open | ⌘O |
| Save | ⌘S |
| Save As | ⇧⌘S |
| Save Version | ⌃⌘S |
| Print rendered document | ⌘P |
| Import Document | ⇧⌘I |
| Import Mermaid | ⌥⌘I |
| Export DOCX | ⇧⌘D |
| Show Start Window | ⌥⇧⌘N |
| Workspace | ⇧⌘0 |
| Bold | ⌘B |
| Italic | ⌘I |
| Insert Link | ⌘K |
| Code Block | ⌥⌘C |
| Insert Equation | ⌃⌘E |
| Mermaid Diagram | ⌥⌘M |
| Format Document | ⌥⌘L |
| Emoji & Symbols | ⌃⌘Space |
| Command Palette | ⇧⌘P |
| Find | ⌘F |
| Toggle Preview | ⌥⌘P |
| Toggle Outline | ⌥⌘O |
| Focus Mode | ⌥⌘F |
| Typewriter Mode | ⌥⌘T |
| Smart Editing Mode | ⌥⌘S |
| Live Editing Mode | ⌥⌘W |
| Formatting Ribbon | ⌃⌘R |
| Start Presentation | ⌥⌘Return |
| Mermaid Visual Editor | ⇧⌘M |
| Documentation | ⌘? |

Command symbols: ⌘ Command, ⌥ Option, ⇧ Shift, ⌃ Control. Additional contextual keys: V/N/E in graph canvas; Tab/Shift-Tab for smart headings/lists/snippets; Return/Shift-Return in Find; arrows/Return/Escape in palette; arrows/Space/Escape documented for presentation. See [shortcut capture](evidence/help-keyboard-shortcuts.txt).

## Menu commands

### Remarque

[Original capture](evidence/menu-active-remarque.txt).

```text
About Remarque
Settings…
Services
  macOS service destinations vary by installation
Hide Remarque
Hide Others
Show All
Quit Remarque
```

### File

[Original capture](evidence/menu-active-file.txt).

```text
New
Show Start Window
Workspace
Open Folder as Workspace…
Open…
Open Recent
  Recent document names
  Clear Menu
Close
Close All
Save
Save As…
Duplicate
Rename…
Move To…
Revert To
    Browse All Versions…
Share
    AirDrop
    Messages
    Notes
    Freeform
    Journal
    Reminders
    Tailscale
    More…
Save Version
Version History…
Import Mermaid Diagram…
Import Document… (RTF, Word, PDF)
Export HTML…
Export PDF…
Export DOCX…
Export RTF…
Export Slides…
Export EPUB…
Export LaTeX…
Remarque Bundle (.remarque)…
Embedded Markdown (.md)…
Print Document…
Print Source…
Print Rendered & Source…
```

### Edit

[Original capture](evidence/menu-active-edit.txt).

```text
(disabled) Undo
(disabled) Redo
(disabled) Cut
(disabled) Copy
(disabled) Paste
(disabled) Delete
(disabled) Select All
Emoji & Symbols
AutoFill
    (disabled) Contact…
    (disabled) Passwords…
    (disabled) Credit Card…
Start Dictation…
Emoji & Symbols
```

### View

[Original capture](evidence/menu-active-view.txt).

```text
Show Tab Bar
Show All Tabs
Toggle Preview
Toggle Outline
Focus Mode
Typewriter Mode
Smart Editing Mode ✓
Live Editing Mode (WYSIWYG)
Start Presentation
Hide Markdown Tools
Hide Formatting Ribbon
Use Native Preview
Mermaid Visual Editor
Enter Full Screen
```

### Format

[Original capture](evidence/menu-format.txt).

```text
Bold
Italic
Inline Code
Code Block
Link
Image
Insert Equation…
Heading
Blockquote
Bullet List
Numbered List
Task List
Table…
Quick Table
Horizontal Rule
Format Document
```

### Diagram

[Original capture](evidence/menu-diagram.txt).

```text
(disabled) Open Mermaid Visual Editor
Insert Mermaid Diagram
Insert Mermaid Flowchart
Insert Mermaid Sequence Diagram
Insert Mermaid ER Diagram
Import Mermaid Diagram…
```

### Tools

[Original capture](evidence/menu-tools.txt).

```text
Command Palette
Find
Documentation
Markdown Guide
Mermaid Guide
```

### Window

[Original capture](evidence/menu-active-window.txt).

```text
Minimize
Minimize All
Zoom
Zoom All
(disabled) Fill
(disabled) Center
Move & Resize
    (disabled) Halves
    Left
    Right
    (disabled) Top
    (disabled) Bottom
    (disabled) Quarters
    (disabled) Top Left
    (disabled) Top Right
    (disabled) Bottom Left
    (disabled) Bottom Right
    (disabled) Arrange
    (disabled) Left & Right
    (disabled) Left & Quarters
    (disabled) Right & Left
    (disabled) Right & Quarters
    (disabled) Top & Bottom
    (disabled) Top & Quarters
    (disabled) Bottom & Top
    (disabled) Bottom & Quarters
    (disabled) Quarters
    Return to Previous Size
(disabled) Full Screen Tile
Remarque
Workspace
Welcome to Remarque
What's New
Remarque Documentation
Markdown Guide
Mermaid Guide
Keyboard Shortcuts
(disabled) Show Previous Tab
(disabled) Show Next Tab
(disabled) Move Tab to New Window
Merge All Windows
Bring All to Front
Arrange in Front
(disabled) Remove Window from Set
```

### Help

[Original capture](evidence/menu-help.txt).

```text
Remarque Documentation
Welcome to Remarque
Markdown Guide
Mermaid Guide
Keyboard Shortcuts
```

## Layout source ribbon and diagram card menus

- Layout: Editor; Editor + Preview; Editor + Outline; Outline + Editor + Preview; Preview; Mermaid Visual Editor; Focus Mode.
- Source styles: Body; Heading 1–6; Quote.
- Source ribbon: style; bold; italic; strike; highlight; inline code; per-column left/center/right; whole-table placement; shared text size.
- Diagram card: Visual Edit; Zoom; Copy Mermaid Source; Copy SVG; Export Diagram; Show Source. Selection also exposes left/center/right alignment, Reset Size and Copy Source.
- Export: HTML; PDF; DOCX; RTF; Slides; EPUB; LaTeX; Remarque Bundle (.remarque); Embedded Markdown (.md).

## Equation palettes

### Structures

[Original capture](evidence/ui-equation-editor.txt).

```text
x², Help: ^{}
xₙ, Help: _{}
a∕b, Help: \frac{}{}
√, Help: \sqrt{}
ⁿ√, Help: \sqrt[]{}
∑, Help: \sum_{}^{}
∏, Help: \prod_{}^{}
∫, Help: \int_{}^{}
∮, Help: \oint
lim, Help: \lim_{ \to }
(ⁿₖ), Help: \binom{}{}
x⃗, Help: \vec{}
x̂, Help: \hat{}
x̄, Help: \bar{}
[matrix], Help: \begin{pmatrix} a & b \\ c & d \end{pmatrix}
{cases}, Help: \begin{cases} a & x>0 \\ b & x\le 0 \end{cases}
```

### Greek

[Original capture](evidence/equation-greek.txt).

```text
α, Help: \alpha
β, Help: \beta
γ, Help: \gamma
δ, Help: \delta
ε, Help: \varepsilon
ζ, Help: \zeta
η, Help: \eta
θ, Help: \theta
κ, Help: \kappa
λ, Help: \lambda
μ, Help: \mu
ν, Help: \nu
ξ, Help: \xi
π, Help: \pi
ρ, Help: \rho
σ, Help: \sigma
τ, Help: \tau
φ, Help: \phi
χ, Help: \chi
ψ, Help: \psi
ω, Help: \omega
Γ, Help: \Gamma
Δ, Help: \Delta
Θ, Help: \Theta
Λ, Help: \Lambda
Π, Help: \Pi
Σ, Help: \Sigma
Φ, Help: \Phi
Ψ, Help: \Psi
Ω, Help: \Omega
```

### Operators

[Original capture](evidence/equation-operators.txt).

```text
×, Help: \times
÷, Help: \div
±, Help: \pm
∓, Help: \mp
·, Help: \cdot
∗, Help: \ast
⋆, Help: \star
∘, Help: \circ
⊕, Help: \oplus
⊗, Help: \otimes
∇, Help: \nabla
∂, Help: \partial
√, Help: \surd
%, Help: \%
```

### Relations

[Original capture](evidence/equation-relations.txt).

```text
=
≠, Help: \neq
≤, Help: \leq
≥, Help: \geq
≈, Help: \approx
≡, Help: \equiv
∼, Help: \sim
∝, Help: \propto
≅, Help: \cong
⊂, Help: \subset
⊆, Help: \subseteq
⊃, Help: \supset
∈, Help: \in
∉, Help: \notin
∪, Help: \cup
∩, Help: \cap
```

### Arrows

[Original capture](evidence/equation-arrows.txt).

```text
→, Help: \to
←, Help: \leftarrow
↔, Help: \leftrightarrow
⇒, Help: \Rightarrow
⇐, Help: \Leftarrow
⇔, Help: \Leftrightarrow
↦, Help: \mapsto
↑, Help: \uparrow
↓, Help: \downarrow
```

### Symbols

[Original capture](evidence/equation-symbols.txt).

```text
∞, Help: \infty
∀, Help: \forall
∃, Help: \exists
∄, Help: \nexists
∅, Help: \emptyset
ℝ, Help: \mathbb{R}
ℕ, Help: \mathbb{N}
ℤ, Help: \mathbb{Z}
ℚ, Help: \mathbb{Q}
ℂ, Help: \mathbb{C}
⋯, Help: \cdots
…, Help: \ldots
∠, Help: \angle
°, Help: ^{\circ}
⊥, Help: \perp
∥, Help: \parallel
```

### Functions

[Original capture](evidence/equation-functions.txt).

```text
sin, Help: \sin
cos, Help: \cos
tan, Help: \tan
log, Help: \log
ln, Help: \ln
exp, Help: \exp
max, Help: \max
min, Help: \min
det, Help: \det
dim, Help: \dim
gcd, Help: \gcd
mod, Help: \bmod
```

## Built-in help articles

- [Command Palette Search](evidence/help-command-palette-search.txt)
- [Exporting](evidence/help-exporting.txt)
- [Getting Started](evidence/help-getting-started.txt)
- [Keyboard Shortcuts](evidence/help-keyboard-shortcuts.txt)
- [Live Preview](evidence/help-live-preview.txt)
- [Markdown Reference](evidence/help-markdown-reference.txt)
- [Math Equations](evidence/help-math-equations.txt)
- [Mermaid Importing](evidence/help-mermaid-importing.txt)
- [Mermaid Move Resize Align](evidence/help-mermaid-move-resize-align.txt)
- [Mermaid Templates Types](evidence/help-mermaid-templates-types.txt)
- [Mermaid Visual Editor](evidence/help-mermaid-visual-editor.txt)
- [Mermaid Writing Diagrams](evidence/help-mermaid-writing-diagrams.txt)
- [Outline Navigation](evidence/help-outline-navigation.txt)
- [Privacy Local First](evidence/help-privacy-local-first.txt)
- [Settings Reference](evidence/help-settings-reference.txt)
- [The Editor](evidence/help-the-editor.txt)
- [Themes Appearance](evidence/help-themes-appearance.txt)
- [Versions Snippets Automation](evidence/help-versions-snippets-automation.txt)
- [Workspace Linking](evidence/help-workspace-linking.txt)

## Machine-readable feature catalogue

The [feature index](feature-index.json) contains **226 feature records** with category, contract and evidence marks. Its records are grouping units, not a count of independently passed tests. Individual settings, palette buttons and menu variants above remain part of the scope.

