#!/usr/bin/env python3
"""Формулы: MathML печётся в разметку из TeX-источника.

    python3 tools/build-math.py              напечатать формулы во все страницы
    python3 tools/build-math.py ru en        только эти папки
    python3 tools/build-math.py --check      сказать, не разошлись ли формулы

ПОЧЕМУ ПЕЧЁТСЯ, А НЕ СЧИТАЕТСЯ В БРАУЗЕРЕ. По §5.1 у сайта нет рантайма:
библиотека вроде KaTeX или MathJax - это триста килобайт чужого кода у
читателя, мигание необработанных формул на медленном канале и пустое место
там, где JavaScript выключен. MathML, напечатанный в разметку, работает из
файла, печатается на бумагу, произносится синтезатором речи, масштабируется
кнопками размера шрифта и живёт в тёмной теме без второй копии. Это тот же
приём, что держит объём в словах и соседние темы: блок печётся, а --check
краснеет, когда источник поехал, а блок нет.

КОНТРАКТ КОНТЕЙНЕРА. Источник формулы живёт рядом с фразой, в атрибуте:

    <span class="math" data-tex="\\int_0^1 x^2\\,dx">∫₀¹ x² dx</span>
    <div class="math-block" data-tex="\\frac{n(n+1)}{2}">n(n+1)/2</div>

Внутренность контейнера - это то, что видит читатель до первой сборки:
юникодный запасной текст, написанный автором вместе с фразой. Генератор
заменяет её на MathML и кладёт исходник в <annotation>, поэтому второй
прогон ничего не меняет, а потеря `data-tex` немедленно краснеет.

ПОДМНОЖЕСТВО TeX задаёт не этот файл, а конвертер в tools/vendor: дроби,
степени и индексы, корни, суммы, произведения, интегралы и пределы с
границами, греческие буквы, операторы и отношения, растущие скобки, матрицы,
cases, нотация множеств. Всё, что вне подмножества, даёт красную сборку с
именем страницы и самой формулой, а не молчаливо печатает мусор.

Вывод по-русски: он говорит тому, кто принимает работу.
"""

import html
import os
import pathlib
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vendor'))
from latex2mathml.converter import convert  # noqa: E402

LANGS = ('ru', 'en', 'uk', 'de')
# Контейнер: тег, класс, источник, внутренность. Внутренность не содержит
# закрывающего тега того же имени ни до сборки (текст), ни после (MathML).
BOX = re.compile(r'<(span|div) class="(math|math-block)" data-tex="([^"]*)"\s*>(.*?)</\1>', re.S)
MATH_OPEN = re.compile(r'^<math\b[^>]*>', re.I)


def baked(tex, block):
    """MathML с исходником внутри: то, что должно стоять в контейнере."""
    out = convert(tex, display='block' if block else 'inline')
    head = MATH_OPEN.match(out)
    inner = out[head.end():-len('</math>')]
    note = '<annotation encoding="application/x-tex">%s</annotation>' % html.escape(tex, quote=False)
    return '%s<semantics>%s%s</semantics></math>' % (head.group(0), inner, note)


def rebuild(path, check):
    text = path.read_text(encoding='utf-8')
    stale = []
    broken = []
    seen = 0

    def one(m):
        nonlocal seen
        seen += 1
        tag, cls, raw, inside = m.groups()
        tex = html.unescape(raw)
        try:
            want = baked(tex, cls == 'math-block')
        except Exception as why:
            broken.append((tex, type(why).__name__))
            return m.group(0)
        if inside.strip() != want:
            stale.append(tex)
        return '<%s class="%s" data-tex="%s">%s</%s>' % (tag, cls, raw, want, tag)

    new = BOX.sub(one, text)
    if not check and new != text:
        path.write_text(new, encoding='utf-8')
    return seen, stale, broken


def main(argv):
    check = '--check' in argv
    langs = [a for a in argv if a in LANGS] or list(LANGS)
    g = lambda s: '\033[32m%s\033[0m' % s
    r = lambda s: '\033[31m%s\033[0m' % s

    print('\n  Формулы: MathML напечатан из источника')
    print('  ' + '-' * 46)

    total = fail = 0
    for lang in langs:
        for path in sorted(pathlib.Path(lang).glob('*.html')):
            seen, stale, broken = rebuild(path, check)
            total += seen
            for tex, why in broken:
                print('  [ %s ] %s\n        -> не разобрано (%s): %s' % (r('НЕТ'), path.as_posix(), why, tex[:60]))
                fail += 1
            if check:
                for tex in stale:
                    print('  [ %s ] %s\n        -> формула разошлась с источником: %s'
                          % (r('НЕТ'), path.as_posix(), tex[:60]))
                    fail += 1

    print('  формул на сайте: %d' % total)
    if not check:
        print('  напечатано заново; второй прогон ничего не меняет')
    print('  ' + '-' * 46)
    if fail:
        print('  %s  - формул со словом НЕТ: %d\n' % (r('КРАСНОЕ'), fail))
        return 1
    print('  %s\n' % g('ЗЕЛЁНОЕ'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
