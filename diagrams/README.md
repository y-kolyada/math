# Diagram sources

A diagram on a page is **inline SVG**, not an image file: the page must work from `file://`, and inline vector inherits the theme colour through `currentColor`, so it survives the day/night switch without a second copy. A shared `assets/NN.svg` would also show one language's labels on all four language pages. The full rule is `AGENTS.md` section 5 rule 18, and `node tools/check-diagrams.mjs` guards it.

This folder holds the **source** of each diagram in Mermaid: `NN-name.mmd`, where `NN` is the page the diagram lives on. Every source answers a diagram and every diagram answers a source; the check says so out loud when they drift apart.

**State the truth about the renderer here.** If no Mermaid renderer is installed, the SVG on the page is drawn by hand from this source rather than exported from it, and this file must say that plainly - otherwise the folder quietly becomes the lie "rendered from mermaid". When a renderer or a viewer appears, the `.mmd` becomes the master and the SVG the derivative.

Fill the table as diagrams appear and delete this sentence with the placeholder row:

| Source | Page | What it shows |
| :-- | :-- | :-- |
| `01-name.mmd` | `ru/01.html` | one line on what the reader is meant to see |
