Markdown adds structure with a few characters. These examples show the source beside its formatted result.

## Headings and emphasis

```example
# A document title

## A section heading

Write **bold**, *italic*, ~~struck out~~,
and `inline code`.
```

Use one to six `#` characters for heading levels. Additional Remarque styles include `==highlight==`, `^superscript^`, and `~subscript~`.

## Lists and tasks

```example
1. Draft the document
2. Review the changes

- [x] Add the introduction
- [ ] Confirm the details
```

## Tables

```example
| Task | Status |
| --- | --- |
| Draft | Complete |
| Review | In progress |
```

Use `:---`, `:---:`, or `---:` in the separator row to align a column left, center, or right. The **Table** toolbar menu lets you edit the structure without typing pipes.

## Quotes and callouts

```example
> [!TIP]
> Keep one main idea in each paragraph.
```

Other callout labels are `NOTE`, `IMPORTANT`, `WARNING`, and `CAUTION`. A plain `>` creates a block quote.

## Links, images, and references

| Source | Purpose |
| --- | --- |
| `[label](https://example.com)` | Web link |
| `![description](image.png)` | Local image |
| `[[Note Name\|Display name]]` | Workspace note link with an alias |
| `[^note]` and `[^note]: Explanation` | Footnote reference and definition |

Definition lists put `: definition` beneath a term. Collapsible sections use `<details>` and `<summary>`. YAML/TOML front matter and unknown syntax remain available in the source.

## Code, diagrams, and equations

Fenced code preserves literal text. A fence labelled `mermaid` renders a diagram. Use `$…$` for inline math and a separate `$$` block for a display equation.

- [Write a Mermaid diagram →](#topic:Mermaid%20Writing%20Diagrams)
- [Build an equation →](#topic:Math%20and%20Equations)
