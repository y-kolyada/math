#!/usr/bin/env python3
"""Two contracts: a finished translation, and a page that is still a stub.

    python3 tools/check-struct.py en            every page of a language
    python3 tools/check-struct.py en/01.html    one page
    python3 tools/check-struct.py uk de         several languages

A page carrying `.stub-card` is held to the **stub contract**; a page without
one to the **translation contract**. Which applied is printed per page, so the
person accepting the work sees it and the day a language stops being a stub is
visible in the output.

**Translation contract.** A translation must stay a translation: the set and
order of all ids; the number of sections; the number of code blocks and the
skeleton of each (comments and human strings stripped, so comments may be
translated but grep -q must not become grep -Q); the number of questions,
exactly fifty on a level page; plus everything the stub contract asks.
Accepting fifty pages in a language you do not read is guesswork otherwise.

**Stub contract.** The alphabet of its own language; the shell - fifteen
navigation items and four languages; and a way out: the card links to the
source page with the same file name. Nothing about anchors, sections or code
blocks is asked of a page that has none.

The second contract exists because without it nothing checked a stub at all,
and the gap was not theoretical: the stamp used to write the source language's
placeholder into every folder, and a whole site shipped with Russian titles and
Russian menus on all 54 foreign pages. Twelve checks were green and the
Architect found it by eye (lessons/notes-1.md 10 of devops-kubernetes).

Note what the stub contract does **not** ask: that the title differ from the
original. The alphabet rule already catches a placeholder left in the source
language, while "must differ" would redden an honest page that is called the
same in two languages - a chapter named Docker is named Docker in both.

Output is Russian: it speaks to the person who accepts the work.
"""

import os
import re
import sys

SOURCE = 'ru'
LANGS = ('en', 'uk', 'de')
SECTIONS = 15

STRIP = re.compile(r'<script\b.*?</script>|<!--.*?-->', re.S | re.I)
ID = re.compile(r'\bid\s*=\s*"([^"]+)"')
H2 = re.compile(r'<h2\b[^>]*\bid\s*=\s*"[^"]+"', re.I)
CODE = re.compile(r'<pre\b[^>]*>\s*<code\b[^>]*>(.*?)</code>\s*</pre>', re.S | re.I)
QA_ITEM = re.compile(r'<ol class="qa"[^>]*>(.*?)</ol>', re.S | re.I)
NAV_ITEM = re.compile(r'<nav class="contents".*?</nav>', re.S | re.I)
# Переключатель стал областью навигации с подписью - читалка игнорирует
# подпись на div без роли. Принимаем обе формы: старую в детской копии и
# новую здесь.
LANG_LINK = re.compile(r'<(div|nav) class="lang-switcher".*?</\1>', re.S | re.I)
ENTITIES = (('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&#39;', "'"), ('&amp;', '&'))

# Characters that mark a word as code rather than prose. A dot is not one of
# them: "subst." and its translation are words, not a command.
CODEISH = set('${}()[]<>*~|&/=+\\`!%^')

CYRILLIC = re.compile(r'[\u0400-\u04FF]')
H1 = re.compile(r'<h1\b[^>]*>(.*?)</h1>', re.S | re.I)
MARKUP = re.compile(r'<[^>]+>')
UK_OWN = re.compile(r'[іїєґІЇЄҐ]')
RU_ONLY = re.compile(r'[ыэъЫЭЪ]')

# A comment starts a word: inside ${v#x} the hash is not a comment.
COMMENT = re.compile(r'(?m)(?:(?<=\s)|^)#.*$')
EXPANSION = re.compile(r'(\$(?:[a-zA-Z0-9_?#*@!$-]+|\{[^}]*\}|\([^)]*\))|`[^`]*`)')


def read(path):
    with open(path, encoding='utf-8') as handle:
        return handle.read()


def unescape(text):
    for what, to in ENTITIES:
        text = text.replace(what, to)
    return text


def skeleton(code):
    text = COMMENT.sub('', unescape(code))
    text = re.sub(r"'[^']*'", "''", text)
    text = re.sub(r'(\$\{[^}:]+\:\?)[^}]*\}', r'\1""}', text)
    out = []
    i = 0
    n = len(text)
    while i < n:
        if text[i] == '"':
            j = i + 1
            has_dollar = False
            while j < n:
                if text[j] == '\\':
                    j += 2
                    continue
                if text[j] in ('$', '`'):
                    has_dollar = True
                if text[j] == '"':
                    break
                j += 1
            if j < n and not has_dollar:
                out.append('""')
                i = j + 1
            else:
                content = text[i+1:j] if j < n else text[i+1:]
                parts = []
                last = 0
                for m in EXPANSION.finditer(content):
                    inter = content[last:m.start()]
                    codeish = ''.join(c for c in inter if c in '/=:')
                    if codeish:
                        parts.append(codeish)
                    parts.append(m.group(0))
                    last = m.end()
                tail = content[last:]
                codeish = ''.join(c for c in tail if c in '/=:')
                if codeish:
                    parts.append(codeish)
                out.append('"' + ''.join(parts) + '"')
                i = j + 1 if j < n else n
        else:
            out.append(text[i])
            i += 1
    return ' '.join(''.join(out).split())


def shape(code):
    """Shape of a block: line count and its code-like words. Prose differs
    between languages, but {a,b}, $var and *.txt must match."""
    text = unescape(code)
    text = re.sub(r'(\$\{[^}:]+\:\?)[^}]*\}', r'\1""}', text)
    tokens = [t.strip("\"'") for t in text.split()]
    tokens = [t for t in tokens if any(ch in CODEISH for ch in t)]
    return (len(text.strip().splitlines()), tokens)



def is_scheme(code):
    """A diagram rather than commands: Cyrillic survives in the original once
    comments and human strings are stripped. Such blocks are translated whole,
    so only their shape is compared."""
    return bool(CYRILLIC.search(skeleton(code)))


def facts(path):
    raw = read(path)
    text = STRIP.sub(' ', raw)
    nav = NAV_ITEM.search(text)
    switcher = LANG_LINK.search(text)
    qa = []
    for block in QA_ITEM.findall(text):
        qa.append(block.count('<li>'))
    return {
        'ids': ID.findall(text),
        'sections': len(H2.findall(text)),
        'codes': [skeleton(c) for c in CODE.findall(text)],
        'shapes': [shape(c) for c in CODE.findall(text)],
        'schemes': [is_scheme(c) for c in CODE.findall(text)],
        'questions': sum(qa),
        'nav': nav.group(0).count('<li>') if nav else 0,
        'langs': switcher.group(0).count('<a ') if switcher else 0,
        'stub': 'stub-card' in text,
        'raw': raw,
    }


def title_of(raw):
    found = H1.search(raw)
    return ' '.join(MARKUP.sub(' ', found.group(1)).split()) if found else ''


def shell_and_alphabet(a, b, lang, name):
    """Общее у обоих контрактов: оболочка на месте и алфавит свой."""
    bad = []

    # Заголовок, дословно совпавший с кириллическим оригиналом, не переведён.
    # Правило точное и потому без ложных срабатываний: латинское название
    # («Docker») совпадает на двух языках законно и кириллицы не содержит, а
    # два многословных кириллических заголовка совпасть дословно не могут.
    # Проверка алфавита этот случай не ловит на украинском: «есть украинские
    # буквы» удовлетворяется любым словом страницы, и его даёт меню, поэтому
    # «Раздел 9» в украинском заголовке проходил незамеченным.
    here, there = title_of(a['raw']), title_of(b['raw'])
    if here and here == there and CYRILLIC.search(here):
        bad.append('заголовок не переведён, совпадает с оригиналом: «%s»' % here[:40])
    if a['nav'] != SECTIONS:
        bad.append('пунктов навигации %d вместо %d' % (a['nav'], SECTIONS))
    if a['langs'] != 4:
        bad.append('в переключателе языков %d ссылки вместо четырёх' % a['langs'])

    # Переключатель языков вырезается из проверки алфавита: имя языка там
    # намеренно написано на самом языке - «Русский», «Українська», - и читалка
    # произносит его правильным голосом благодаря lang. Это требование
    # доступности, а не недопереведённый текст.
    speech = LANG_LINK.sub(' ', a['raw'])

    if lang in ('en', 'de'):
        left = CYRILLIC.findall(speech)
        left = [c for c in left if c not in '\u0410']  # font-size button label, fixed by the shell generator
        if left:
            bad.append('осталась кириллица: %d символов' % len(left))
    elif lang == 'uk':
        if not UK_OWN.search(speech):
            bad.append('нет украинских букв (і, ї, є, ґ) - страница не переведена')
        if RU_ONLY.search(speech):
            bad.append('остались русские буквы ы, э, ъ')
    return bad, speech


def stub_contract(a, b, lang, name):
    """Страница-заглушка: своя оболочка и выход на страницу-источник.

    Заглушка - честное состояние, в котором живёт каждый сайт серии по трём
    языкам из четырёх. Требовать от неё якорей и разделов нельзя, а оставлять
    её вовсе без проверки означает, что 54 страницы сайта не держит никто.
    """
    bad, speech = shell_and_alphabet(a, b, lang, name)
    if 'class="btn-primary"' not in speech:
        bad.append('в карточке нет кнопки выхода на полную версию')
    elif 'href="../%s/%s"' % (SOURCE, name) not in speech:
        bad.append('выход из заглушки ведёт не на ../%s/%s' % (SOURCE, name))
    return bad


def compare(target, source, lang):
    a, b = facts(target), facts(source)
    name = os.path.basename(target)
    if a['stub']:
        return stub_contract(a, b, lang, name)

    bad, _ = shell_and_alphabet(a, b, lang, name)

    if a['ids'] != b['ids']:
        only_here = [i for i in a['ids'] if i not in b['ids']]
        only_there = [i for i in b['ids'] if i not in a['ids']]
        if only_here or only_there:
            bad.append('якоря разошлись: лишние %s, потерянные %s'
                       % (only_here[:3] or '-', only_there[:3] or '-'))
        else:
            bad.append('якоря те же, но в другом порядке')
    if a['sections'] != b['sections']:
        bad.append('разделов %d, в оригинале %d' % (a['sections'], b['sections']))
    if len(a['codes']) != len(b['codes']):
        bad.append('блоков кода %d, в оригинале %d' % (len(a['codes']), len(b['codes'])))
    else:
        for n in range(len(b['codes'])):
            if b['schemes'][n]:
                if a['shapes'][n] != b['shapes'][n]:
                    bad.append('схема %d: форма разошлась с оригиналом (строк %d против %d)'
                               % (n + 1, a['shapes'][n][0], b['shapes'][n][0]))
                    break
            elif a['codes'][n] != b['codes'][n]:
                bad.append('блок кода %d изменён: %s'
                           % (n + 1, a['codes'][n][:60] or '(пусто)'))
                break
    if a['questions'] != b['questions']:
        bad.append('вопросов %d, в оригинале %d' % (a['questions'], b['questions']))
    elif a['questions'] and a['questions'] != 50:
        bad.append('вопросов %d, а на странице уровня их ровно 50' % a['questions'])
    return bad


def pages(args):
    out = []
    for arg in args:
        if os.path.isfile(arg):
            out.append(arg)
        elif os.path.isdir(arg):
            out += [os.path.join(arg, n) for n in sorted(os.listdir(arg)) if n.endswith('.html')]
    return out


def main(argv):
    args = argv[1:] or list(LANGS)
    targets = pages(args)
    if not targets:
        print('нечего сверять: укажите язык (en) или страницу (en/01.html)')
        return 2

    rows = []
    for target in targets:
        lang, name = os.path.split(target)
        lang = os.path.basename(lang)
        source = os.path.join(SOURCE, name)
        if lang == SOURCE:
            continue
        if not os.path.isfile(source):
            rows.append((target, 'нет оригинала', ['нет русского оригинала ' + source]))
            continue
        kind = 'заглушка' if 'stub-card' in read(target) else 'перевод'
        rows.append((target, kind, compare(target, source, lang)))

    broken = [r for r in rows if r[2]]
    stubs = sum(1 for r in rows if r[1] == 'заглушка')
    done = sum(1 for r in rows if r[1] == 'перевод')
    print()
    print('  Перевод и заглушки: два контракта')
    print('  ' + '-' * 46)
    for target, kind, bad in rows:
        mark = 'ДА ' if not bad else 'НЕТ'
        print('  [ %s ] %-22s · %s' % (mark, target, kind))
        for line in bad:
            print('        -> %s' % line)
    print('  ' + '-' * 46)
    print('  страниц сверено: %d (переводов %d, заглушек %d), расходятся: %d'
          % (len(rows), done, stubs, len(broken)))
    print('  %s' % ('КРАСНОЕ' if broken else 'ЗЕЛЁНОЕ'))
    print()
    return 1 if broken else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
