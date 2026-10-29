Write TeX directly or build equations with the **LaTeX** button. The examples below are rendered by the same bundled MathJax engine as your documents.

## Math inside a sentence

```example
The area of a circle is $A=\pi r^2$.
```

## A displayed equation

```example
$$
x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}
$$
```

## Build an equation with the toolbar

1. Click **LaTeX** in the right toolbar, beside **Mermaid** and **Table**.
2. Type TeX or choose a symbol from a palette.
3. Choose inline or display mode.
4. For a new equation, choose **Insert** to add it to the document.

| Palette | Examples |
| --- | --- |
| Structures | Fractions, roots, matrices |
| Greek | $\alpha$, $\beta$, $\theta$ |
| Operators | $\sum$, $\int$, $\prod$ |
| Relations | $\leq$, $\geq$, $\approx$ |
| Arrows | $\rightarrow$, $\Rightarrow$ |
| Symbols | $\infty$, $\partial$ |
| Functions | $\sin$, $\log$, $\lim$ |

> [!TIP]
> A structure places the caret in its first argument slot. Symbols are inserted at the caret.

## Change an existing equation

Select the rendered equation, then open the arrow beside **LaTeX** and choose **Edit LaTeX**. Choose **Inline / Display** in that same menu to switch modes. Changes appear in the left pane immediately. Closing a new equation dialog before **Insert** discards that uninserted draft.
