# Shipped Mermaid support

Generated from the application catalogue for Remarque 3.0.3 (739). Engine: Mermaid 12.2.0, ZenUML 1.0.1, ELK 1.0.1, tidy-tree 1.0.1. Runtime resources are bundled locally.

33 families and 41 starters. The automated catalogue test renders every starter and verifies a Word graphic for each; the native PDF test checks the complete catalogue document. Richer syntax, every possible layout/look combination, and downstream accessibility remain separate qualification tasks.

| Family | Starter IDs | Canvas editing | Syntax status |
|---|---|---|---|
| Flowchart | flowchart | Restricted grammar; source fallback | Stable starter syntax |
| Swimlane | swimlane | Source editor | Contains experimental Mermaid syntax |
| Sequence | sequence | Restricted grammar; source fallback | Stable starter syntax |
| Class | class | Source editor | Stable starter syntax |
| State | state | Restricted grammar; source fallback | Stable starter syntax |
| Entity relationship | er | Source editor | Stable starter syntax |
| User journey | journey | Source editor | Stable starter syntax |
| Gantt | gantt | Source editor | Stable starter syntax |
| Pie | pie | Source editor | Stable starter syntax |
| Quadrant | quadrant | Source editor | Stable starter syntax |
| Requirement | requirement | Source editor | Stable starter syntax |
| Use case | usecase | Source editor | Contains experimental Mermaid syntax |
| Git graph | git | Source editor | Stable starter syntax |
| C4 | c4-context, c4-container, c4-component, c4-dynamic, c4-deployment | Source editor | Contains experimental Mermaid syntax |
| Mind map | mindmap | Source editor | Stable starter syntax |
| Timeline | timeline | Source editor | Stable starter syntax |
| ZenUML | zenuml | Source editor | Stable starter syntax |
| Sankey | sankey | Source editor | Stable starter syntax |
| XY | xy-bar, xy-line | Source editor | Contains experimental Mermaid syntax |
| Block | block | Source editor | Contains experimental Mermaid syntax |
| Packet | packet | Source editor | Contains experimental Mermaid syntax |
| Kanban | kanban | Source editor | Contains experimental Mermaid syntax |
| Architecture | architecture | Source editor | Contains experimental Mermaid syntax |
| Radar | radar | Source editor | Contains experimental Mermaid syntax |
| Event modeling | eventmodeling | Source editor | Contains experimental Mermaid syntax |
| Treemap | treemap | Source editor | Contains experimental Mermaid syntax |
| Venn | venn | Source editor | Contains experimental Mermaid syntax |
| Ishikawa | ishikawa | Source editor | Contains experimental Mermaid syntax |
| Wardley | wardley | Source editor | Contains experimental Mermaid syntax |
| Cynefin | cynefin | Source editor | Contains experimental Mermaid syntax |
| TreeView | tree | Source editor | Contains experimental Mermaid syntax |
| Agentflow | agentflow | Source editor | Contains experimental Mermaid syntax |
| Railroad | railroad, railroad-ebnf, railroad-abnf, railroad-peg | Source editor | Contains experimental Mermaid syntax |

All families retain fenced source through Markdown and Remarque-bundle export. SVG/PNG card exports and HTML/Word/PDF graphics are implemented. RTF embeds PNG picture groups; LaTeX uses native math plus companion diagram/image files. A render failure is surfaced and must not silently become a blank export. See the feature ledger for test scope and unresolved release gates.
