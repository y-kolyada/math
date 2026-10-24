# Diagram sources

A diagram on a page is **inline SVG**, not an image file: the page must work from `file://`, and inline vector inherits the theme colour through `currentColor`, so it survives the day/night switch without a second copy. A shared `assets/NN.svg` would also show one language's labels on all four language pages. The full rule is `AGENTS.md` section 5 rule 18, and `node tools/check-diagrams.mjs` guards it.

This folder holds the **source** of each diagram in Mermaid: `NN-name.mmd`, where `NN` is the page the diagram lives on. Every source answers a diagram and every diagram answers a source; the check says so out loud when they drift apart.

**State the truth about the renderer here.** If no Mermaid renderer is installed, the SVG on the page is drawn by hand from this source rather than exported from it, and this file must say that plainly - otherwise the folder quietly becomes the lie "rendered from mermaid". When a renderer or a viewer appears, the `.mmd` becomes the master and the SVG the derivative.

**Состояние рендерера на этом сайте: Mermaid не установлен.** Поэтому `.mmd` здесь - источник смысла, а не мастер-файл: каждая схема нарисована руками по своему источнику, а не выгружена из него. Как только появится рендерер, `.mmd` станет мастером, а SVG производной, и эта строка изменится.

| Source | Page | What it shows |
| :-- | :-- | :-- |
| `01-sets.mmd` | `ru/01.html` | Два пересекающихся множества: пересечение как «и», объединение как «или» |
| `02-numbers.mmd` | `ru/02.html` | Вложенность числовых множеств от натуральных до комплексных |
| `03-bridges.mmd` | `ru/03.html` | Граф семи мостов: четыре вершины нечётной степени, обхода нет |
| `06-limit.mmd` | `ru/06.html` | Коридор шириной два эпсилона и номер, начиная с которого его не покидают |
| `06-derivative.mmd` | `ru/06.html` | Секущая, переходящая в касательную при сближении точек |
| `06-integral.mmd` | `ru/06.html` | Столбики под кривой и предел суммы их площадей |
| `06-series.mmd` | `ru/06.html` | Сходящиеся и расходящиеся частичные суммы на одном холсте |
| `03-kinds.mmd` | `ru/03.html` | Ненаправленный и направленный граф рядом: «связаны» против «отсюда туда» |
| `03-components.mmd` | `ru/03.html` | Одна компонента связности против трёх несообщающихся |
| `05-eigen.mmd` | `ru/05.html` | Собственный вектор остаётся на своей прямой, обычный поворачивается |
| `08-clt.mmd` | `ru/08.html` | Распределение суммы двух кубиков и колокол, к которому стремятся суммы |
