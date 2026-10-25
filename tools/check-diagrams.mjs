// check-diagrams.mjs - every diagram of the site in one browser run.
//
//     node tools/check-diagrams.mjs
//
// Guards AGENTS.md section 5 rule 18. Six things a file cannot show:
//
//   1. the canvas is 320 units wide and capped at 320px, so one unit is one
//      pixel on a 390px phone and the budget below is honest;
//   2. no label is smaller than 12 units;
//   3. every label clears the right wall of its box by at least 6 units -
//      measured with getBBox, because the width of a string depends on the
//      page font and cannot be computed from the markup;
//   4. every diagram has a non-empty aria-label, which rots silently because
//      nobody looks at it;
//   5. captions are numbered sequentially across the language folder, and
//      every diagram answers a source in diagrams/ and every source a diagram;
//   6. a translated page carries a translated diagram: its aria-label differs
//      from the base one and it keeps the same number of labels.
//
// A site without diagrams is the cheap case: no browser is started at all.
// Exits 1 if any diagram is faulty. Output is Russian: it speaks to the person
// who accepts the work.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LANGS = ['ru', 'en', 'uk', 'de'];
const BASE = 'ru'; // the language the site is written in; the others translate it
const CANVAS = 320; // units, equal to pixels on the 390px phone
const MIN_LABEL = 12; // units
const MIN_GAP = 6; // units from the end of a label to the wall of its box

const bad = [];
const has = /<svg[^>]*\brole="img"/;

// Pages that actually hold a diagram. Reading the file is free; starting a
// browser is not.
const pages = {};
for (const lang of LANGS) {
  if (!existsSync(lang)) continue;
  pages[lang] = readdirSync(lang).sort()
    .filter((n) => n.endsWith('.html'))
    .filter((n) => has.test(readFileSync(join(lang, n), 'utf8').split('<main')[1] || ''));
}
const sources = existsSync('diagrams')
  ? readdirSync('diagrams').sort().filter((n) => n.endsWith('.mmd'))
  : [];
const total = Object.values(pages).reduce((n, list) => n + list.length, 0);

if (!total && !sources.length) {
  console.log();
  console.log('  Проверка схем');
  console.log('  ' + '-'.repeat(46));
  console.log('  схем на сайте нет, проверять нечего');
  console.log('  ' + '-'.repeat(46));
  console.log('  ЗЕЛЁНОЕ');
  console.log();
  process.exit(0);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright не найден. Поставьте его в этой папке:');
  console.error('    npm i playwright');
  console.error('    npx playwright install chromium chromium-headless-shell');
  process.exit(2);
}

let browser;
try {
  browser = await chromium.launch();
} catch (e) {
  console.error('браузер не запустился: ' + String(e.message).split('\n')[0]);
  console.error('    npx playwright install chromium chromium-headless-shell');
  process.exit(2);
}
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

const seen = {}; // lang -> file -> [diagram, ...]
for (const lang of Object.keys(pages)) {
  seen[lang] = {};
  for (const name of pages[lang]) {
    await page.goto('file://' + join(process.cwd(), lang, name));
    seen[lang][name] = await page.evaluate(({ MIN_GAP }) => {
      return [...document.querySelectorAll('main svg[role="img"]')].map((svg) => {
        const vb = svg.viewBox.baseVal;
        const drawn = svg.getBoundingClientRect().width;
        const scale = drawn / vb.width || 1;
        const rects = [...svg.querySelectorAll('rect')].map((e) => ({
          x: +e.getAttribute('x'), y: +e.getAttribute('y'),
          w: +e.getAttribute('width'), h: +e.getAttribute('height'),
        })).filter((e) => Number.isFinite(e.x + e.y + e.w + e.h));
        let min = Infinity;
        const tight = [];
        const texts = [...svg.querySelectorAll('text')];
        for (const t of texts) {
          min = Math.min(min, parseFloat(getComputedStyle(t).fontSize) / scale);
          if (t.getAttribute('transform')) continue; // rotated: measured along its own axis
          const b = t.getBBox();
          const box = rects
            .filter((e) => b.x >= e.x && b.y >= e.y && b.y <= e.y + e.h && b.x <= e.x + e.w)
            .sort((a, c) => a.w * a.h - c.w * c.h)[0];
          const wall = box ? box.x + box.w : vb.width;
          const gap = wall - (b.x + b.width);
          if (gap < MIN_GAP) {
            tight.push('«' + t.textContent.trim().slice(0, 30) + '» зазор ' + gap.toFixed(0)
              + (box ? ' до стенки рамки' : ' до края холста'));
          }
        }
        const cap = svg.closest('.box') && svg.closest('.box').querySelector('p.dim');
        return {
          width: vb.width,
          capped: getComputedStyle(svg).maxWidth,
          label: (svg.getAttribute('aria-label') || '').trim(),
          labels: texts.length,
          smallest: Number.isFinite(min) ? +min.toFixed(1) : null,
          tight,
          caption: cap ? cap.textContent.trim() : null,
        };
      });
    }, { MIN_GAP });
  }
}
await browser.close();

// 1-4: the budget, the label and the caption of every diagram.
const CAPTION = /^(\S+)\s+(\d+)\./u;
let drawn = 0;
for (const lang of Object.keys(seen)) {
  let n = 0;
  let word = null;
  for (const [name, list] of Object.entries(seen[lang])) {
    for (const d of list) {
      const where = lang + '/' + name;
      if (d.width !== CANVAS) bad.push([where, 'холст шириной ' + d.width + ' единиц вместо ' + CANVAS]);
      if (d.capped !== CANVAS + 'px') bad.push([where, 'нет ограничения max-width:' + CANVAS + 'px, сейчас ' + d.capped]);
      if (!d.label) bad.push([where, 'пустой aria-label: читалке схема не достанется']);
      if (d.smallest !== null && d.smallest < MIN_LABEL) bad.push([where, 'наименьшая подпись ' + d.smallest + ' единиц вместо ' + MIN_LABEL]);
      for (const t of d.tight) bad.push([where, 'подпись не помещается: ' + t]);
      n += 1;
      drawn += 1;
      if (!d.caption) {
        bad.push([where, 'у схемы нет подписи <p class="dim">']);
        continue;
      }
      const m = CAPTION.exec(d.caption);
      if (!m) {
        bad.push([where, 'подпись не начинается со слова и номера: «' + d.caption.slice(0, 40) + '»']);
        continue;
      }
      if (word === null) word = m[1];
      else if (m[1] !== word) bad.push([where, 'подписи названы по-разному: «' + m[1] + '» против «' + word + '»']);
      if (+m[2] !== n) bad.push([where, 'номер подписи ' + m[2] + ', а по порядку ' + n]);
    }
  }
}

// 5: every source answers a diagram and every diagram a source.
const keyOf = (name) => name.replace(/\.html$/, '');
const basePages = new Set((pages[BASE] || []).map(keyOf));
for (const src of sources) {
  const key = src.split('-')[0].replace(/\.mmd$/, '');
  if (!basePages.has(key)) bad.push(['diagrams/' + src, 'исходник есть, а схемы на ' + BASE + '/' + key + '.html нет']);
}
for (const key of basePages) {
  if (!sources.some((s) => s.split('-')[0].replace(/\.mmd$/, '') === key)) {
    bad.push([BASE + '/' + key + '.html', 'схема есть, а исходника diagrams/' + key + '-*.mmd нет']);
  }
}

// 6: a translated page carries a translated diagram.
for (const lang of Object.keys(seen)) {
  if (lang === BASE) continue;
  for (const [name, list] of Object.entries(seen[lang])) {
    const base = (seen[BASE] || {})[name] || [];
    list.forEach((d, i) => {
      const where = lang + '/' + name;
      if (!base[i]) {
        bad.push([where, 'схема есть, а на ' + BASE + '/' + name + ' такой схемы нет']);
        return;
      }
      if (d.label === base[i].label) bad.push([where, 'aria-label совпадает с ' + BASE + ': схема не переведена']);
      if (d.labels !== base[i].labels) bad.push([where, 'подписей ' + d.labels + ', а на ' + BASE + ' их ' + base[i].labels + ': часть потеряна при переводе']);
    });
  }
}

console.log();
console.log('  Проверка схем: холст, подписи, исходники, перевод');
console.log('  ' + '-'.repeat(46));
console.log('  схем проверено: ' + drawn + ' на ' + total + (total === 1 ? ' странице' : ' страницах'));
console.log('  в браке:        ' + bad.length);
for (const [where, why] of bad.slice(0, 20)) console.log('        -> ' + where + ': ' + why);
if (bad.length > 20) console.log('        -> ... и ещё ' + (bad.length - 20));
console.log('  ' + '-'.repeat(46));
console.log('  ' + (bad.length ? 'КРАСНОЕ' : 'ЗЕЛЁНОЕ'));
console.log();
process.exit(bad.length ? 1 : 0);
