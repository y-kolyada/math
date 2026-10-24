#!/usr/bin/env bash
# Example check: the computation shown on a page is run, and it prints what the
# page says it prints.
#
#     tools/check-examples.sh
#
# THE MECHANISM IS THE SERIES', THE INTERPRETER IS THIS SITE'S (§1 AGENTS.md).
# Bash runs with bash, Terraform with terraform validate, a query language with
# a parser of its own. Mathematics runs with python3 and its standard library:
# no sympy, no numpy, nothing to install, so a reader can paste the block into
# any python and get the same lines.
#
# THE CONTRACT OF A BLOCK. A runnable block is <pre><code data-run="py">. The
# lines that start with `# =>` are not code: they are the output the page
# promises, written where the reader sees it rather than in a fixture file
# nobody reads. Everything else is the program. The block is run with
# python3 -I (isolated: no site packages, no environment, no current directory
# on the path), its stdout is compared with those lines, and the first
# difference turns the check red with both texts printed.
#
# WHY IT IS WORTH THE FILE. A page about mathematics states numbers, and a
# number typed by hand goes stale the moment the text around it is edited. This
# is the one defect no eye catches: the prose is corrected and the computation
# beside it is not.
#
# Output is Russian: it speaks to the person who accepts the work.

set -uo pipefail

python3 - "$@" <<'PY'
import html
import pathlib
import re
import subprocess
import sys

GREEN = '\033[32m%s\033[0m'
RED = '\033[31m%s\033[0m'
BLOCK = re.compile(r'<pre><code data-run="py">(.*?)</code></pre>', re.S)

print('\n  Примеры со страниц запускаются')
print('  ' + '-' * 46)

pages = sorted(p for p in pathlib.Path('.').glob('*/*.html'))
seen = fail = 0
for page in pages:
    raw = page.read_text(encoding='utf-8')
    for n, found in enumerate(BLOCK.finditer(raw), 1):
        seen += 1
        lines = html.unescape(found.group(1)).split('\n')
        code = '\n'.join(l for l in lines if not l.startswith('# =>'))
        want = '\n'.join(re.sub(r'^# =>\s?', '', l).rstrip() for l in lines if l.startswith('# =>'))
        name = '%s блок %d' % (page.as_posix(), n)
        try:
            run = subprocess.run([sys.executable, '-I', '-'], input=code,
                                 capture_output=True, text=True, timeout=120)
        except subprocess.TimeoutExpired:
            print('  [ %s ] %s\n        -> не досчитал за 120 секунд' % (RED % 'НЕТ', name))
            fail += 1
            continue
        got = run.stdout.rstrip('\n')
        if run.returncode:
            print('  [ %s ] %s\n        -> упал: %s' % (RED % 'НЕТ', name, run.stderr.strip().split('\n')[-1]))
            fail += 1
        elif not want:
            print('  [ %s ] %s\n        -> блок без строк «# =>»: нечего сверять' % (RED % 'НЕТ', name))
            fail += 1
        elif got != want:
            print('  [ %s ] %s\n        -> страница обещает «%s»,\n           получено      «%s»'
                  % (RED % 'НЕТ', name, want.replace('\n', ' / '), got.replace('\n', ' / ')))
            fail += 1
        else:
            print('  [ %s ] %s' % (GREEN % 'ДА ', name))

if not seen:
    print('  блоков с data-run: 0')
    print('  страницы пока не показывают счёта, который надо запускать')

print('  ' + '-' * 46)
if fail:
    print('  %s  - блоков со словом НЕТ: %d\n' % (RED % 'КРАСНОЕ', fail))
    sys.exit(1)
print('  %s  - блоков запущено: %d\n' % (GREEN % 'ЗЕЛЁНОЕ', seen))
PY
