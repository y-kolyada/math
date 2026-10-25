// search.js - the search panel. Loaded on demand by swa.js, together with the
// index for the language of the page, so nothing of this reaches a reader who
// never opens it.
(function () {
  const SAY = {
    ru: { place: 'Искать по разделам, словарю и вопросам', none: 'Ничего не найдено',
          empty: 'Для этого языка содержание ещё не переведено', close: 'Закрыть поиск',
          clear: 'Очистить строку поиска',
          hint: 'Esc - закрыть, стрелки - выбор, Enter - перейти' ,
          only: 'Искать только по темам или снова везде', found: 'Найдено',
          firstN: 'показаны первые',
          kinds: { t: 'Темы', e: 'Примеры', q: 'Вопросы', n: 'Навигатор', g: 'Словарь', i: 'Витрина' } },
    en: { place: 'Search sections, glossary, and questions', none: 'Nothing found',
          empty: 'This language has no content yet', close: 'Close search',
          clear: 'Clear search query',
          hint: 'Esc to close, arrows to move, Enter to open' ,
          only: 'Search topics only, or everywhere again', found: 'Found',
          firstN: 'first shown',
          kinds: { t: 'Topics', e: 'Examples', q: 'Questions', n: 'Navigator', g: 'Glossary', i: 'Landing' } },
    uk: { place: 'Шукати в розділах, словнику й питаннях', none: 'Нічого не знайдено',
          empty: 'Для цієї мови зміст ще не перекладено', close: 'Закрити пошук',
          clear: 'Очистити рядок пошуку',
          hint: 'Esc - закрити, стрілки - вибір, Enter - перейти' ,
          only: 'Шукати лише в темах або знову скрізь', found: 'Знайдено',
          firstN: 'показано перші',
          kinds: { t: 'Теми', e: 'Приклади', q: 'Питання', n: 'Навігатор', g: 'Словник', i: 'Вітрина' } },
    de: { place: 'Abschnitte, Glossar und Fragen durchsuchen', none: 'Nichts gefunden',
          empty: 'Für diese Sprache gibt es noch keine Inhalte', close: 'Suche schließen',
          clear: 'Suchfeld leeren',
          hint: 'Esc schließt, Pfeile wählen, Enter öffnet' ,
          only: 'Nur in Themen suchen oder wieder überall', found: 'Gefunden',
          firstN: 'davon angezeigt',
          kinds: { t: 'Themen', e: 'Beispiele', q: 'Fragen', n: 'Navigator', g: 'Glossar', i: 'Startseite' } },
  };

  const lang = document.documentElement.lang || 'ru';
  const say = SAY[lang] || SAY.ru;
  const raw = (window.SEARCH && window.SEARCH.i) || [];
  const SITE = document.documentElement.dataset.site || 'swa';
  const key = (name) => 'swa-' + SITE + '-' + name;

  // ё and е are one letter for a reader looking for a word.
  const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
  const items = raw.map((e) => ({ url: e[0], title: e[1], page: e[2], body: e[3],
    kind: e[4] || 't', t: norm(e[1]), b: norm(e[3]) }));

  // Виды страниц, которые в этом индексе вообще есть. Один вид - отбирать
  // не из чего, и ряда переключателей не появляется вовсе: на языке, где
  // переведена только витрина, он был бы одной кнопкой «Витрина».
  const kinds = ((window.SEARCH && window.SEARCH.k) || []).filter((k) => say.kinds[k]);
  const faceted = kinds.length > 1;
  const off = new Set();

  const panel = document.createElement('div');
  panel.className = 'search-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="search-box" role="dialog" aria-modal="true" aria-label="' + say.place + '">'
    + '<div class="search-head">'
    + '<svg class="icon search-lead-icon" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.6" cy="8.6" r="5.4"/><path d="M12.6 12.6l4 4"/></svg>'
    + '<input type="search" class="search-input" placeholder="' + say.place + '" aria-label="' + say.place + '">'
    + '<button type="button" class="search-clear" hidden aria-label="' + say.clear + '" title="' + say.clear + '">'
    + '<svg class="icon" data-icon="clear-mark" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M12.5 3.5l4 4L8 16H4v-4L12.5 3.5z"/><path d="M3 18h14"/><path d="M14.5 11.5l3.5 3.5M18 11.5l-3.5 3.5"/></svg>'
    + '</button>'
    + (faceted ? '<button type="button" class="search-only" aria-pressed="false" aria-label="'
        + say.only + '" title="' + say.only + '">'
        + '<svg class="icon" data-icon="funnel" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<path d="M3 4.5h14l-5.4 6.2v4.6l-3.2 1.8v-6.4z"/></svg>'
        + '</button>' : '')
    + '<span class="search-lang">' + lang.toUpperCase() + '</span>'
    + '<button type="button" class="search-close" aria-label="' + say.close + '">&times;</button>'
    + '</div>'
    + (faceted ? '<div class="search-facets" role="group">'
        + kinds.map((k) => '<button type="button" class="search-facet" data-kind="' + k
          + '" aria-pressed="true">' + say.kinds[k] + '</button>').join('')
        + '</div>' : '')
    + '<p class="search-count" hidden></p>'
    + '<ul class="search-results"></ul>'
    + '<div class="search-hint">' + say.hint + '</div>'
    + '</div>';
  document.body.appendChild(panel);

  const input = panel.querySelector('.search-input');
  const facets = [...panel.querySelectorAll('.search-facet')];
  const onlyBtn = panel.querySelector('.search-only');
  const count = panel.querySelector('.search-count');
  const clearBtn = panel.querySelector('.search-clear');
  const list = panel.querySelector('.search-results');
  let picked = -1;

  try {
    const saved = JSON.parse(sessionStorage.getItem(key('search')) || 'null');
    if (saved && saved.q) {
      input.value = saved.q;
      picked = typeof saved.idx === 'number' ? saved.idx : -1;
    }
    if (saved && Array.isArray(saved.off)) {
      saved.off.forEach((k) => off.add(k));
    }
  } catch (_) {}

  paintFacets();

  // Выключить все виды - то же, что не искать вовсе, поэтому последний
  // включённый не выключается: пустая выдача без причины читается как
  // поломка поиска, а не как собственный выбор.
  function paintFacets() {
    facets.forEach((b) => b.setAttribute('aria-pressed', String(!off.has(b.dataset.kind))));
    if (onlyBtn) {
      const onlyTopics = off.size === kinds.length - 1 && !off.has('t');
      onlyBtn.setAttribute('aria-pressed', String(onlyTopics));
    }
  }

  // Один щелчок вместо пяти: предмет сайта или весь сайт. Первое открытие
  // окна ищет везде - читатель, который ещё не знает, что здесь есть,
  // не должен сначала включать то, о чём не спрашивал.
  if (onlyBtn) {
    onlyBtn.addEventListener('click', () => {
      const onlyTopics = off.size === kinds.length - 1 && !off.has('t');
      off.clear();
      if (!onlyTopics) kinds.forEach((k) => { if (k !== 't') off.add(k); });
      paintFacets();
      render(input.value, false);
      saveState(picked, '', false);
    });
  }

  facets.forEach((btn) => btn.addEventListener('click', () => {
    const k = btn.dataset.kind;
    if (off.has(k)) off.delete(k);
    else if (off.size < kinds.length - 1) off.add(k);
    else return;
    paintFacets();
    render(input.value, false);
    saveState(picked, '', false);
  }));

  function saveState(idx, url, active) {
    try {
      if (!input.value.trim() && !off.size) {
        sessionStorage.removeItem(key('search'));
        return;
      }
      sessionStorage.setItem(key('search'), JSON.stringify({
        q: input.value,
        idx,
        url: url || '',
        active: Boolean(active),
        off: [...off],
      }));
    } catch (_) {}
  }

  function snippet(entry, needle) {
    const at = entry.b.indexOf(needle);
    if (at < 0) return entry.body.slice(0, 120);
    const from = Math.max(0, at - 40);
    return (from ? '… ' : '') + entry.body.slice(from, from + 150);
  }

  function find(query) {
    const needle = norm(query.trim());
    // Пустой и односимвольный запрос тоже возвращает форму {total, shown}: раньше здесь
    // стоял пустой массив, и render падал на got.shown.length при каждом открытии окна.
    if (needle.length < 2) return { total: 0, shown: [] };
    const hits = [];
    for (const entry of items) {
      if (off.has(entry.kind)) continue;
      const inTitle = entry.t.indexOf(needle);
      const inBody = inTitle < 0 ? entry.b.indexOf(needle) : -1;
      if (inTitle < 0 && inBody < 0) continue;
      hits.push({ entry, rank: inTitle >= 0 ? inTitle : 1000 + inBody });
    }
    hits.sort((a, b) => a.rank - b.rank);
    return { total: hits.length, shown: hits.slice(0, 40).map((h) => h.entry) };
  }

  function render(query, keepPicked) {
    clearBtn.hidden = !query.length;
    const got = items.length ? find(query) : { total: 0, shown: [] };
    const found = got.shown;
    list.innerHTML = '';
    if (!keepPicked) picked = -1;
    // Счётчик говорит, сколько нашлось на самом деле, а не сколько влезло:
    // сорок - это потолок выдачи, и читатель, видящий ровно сорок, не должен
    // гадать, конец это списка или его начало.
    if (count) {
      count.hidden = !got.total;
      count.textContent = got.total
        ? say.found + ': ' + got.total
          + (got.total > found.length ? ', ' + say.firstN + ' ' + found.length : '')
        : '';
    }
    if (!items.length) {
      list.innerHTML = '<li class="search-empty">' + say.empty + '</li>';
      return;
    }
    if (!found.length) {
      if (query.trim().length >= 2) list.innerHTML = '<li class="search-empty">' + say.none + '</li>';
      return;
    }
    const needle = norm(query.trim());
    found.forEach((entry, idx) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = entry.url;
      a.dataset.idx = String(idx);
      if (idx === picked) a.classList.add('picked');
      a.innerHTML = '<span class="search-title"></span>'
        + '<span class="search-where"><span class="search-badge">' + lang.toUpperCase() + '</span>'
        + '<span class="search-page"></span></span>'
        + '<span class="search-snip"></span>';
      a.querySelector('.search-title').textContent = entry.title;
      a.querySelector('.search-page').textContent = entry.page;
      a.querySelector('.search-snip').textContent = snippet(entry, needle);
      li.appendChild(a);
      list.appendChild(li);
    });
    if (picked >= 0) {
      const activeLink = list.querySelectorAll('a')[picked];
      if (activeLink) activeLink.scrollIntoView({ block: 'nearest' });
    }
  }

  function move(step) {
    const links = [...list.querySelectorAll('a')];
    if (!links.length) return;
    picked = (picked + step + links.length) % links.length;
    links.forEach((a, n) => a.classList.toggle('picked', n === picked));
    links[picked].scrollIntoView({ block: 'nearest' });
  }

  function chooseLink(a) {
    const links = [...list.querySelectorAll('a')];
    const idx = links.indexOf(a);
    if (idx >= 0) {
      picked = idx;
      links.forEach((el, n) => el.classList.toggle('picked', n === picked));
    }
    const href = a.getAttribute('href') || '';
    saveState(picked, href, true);
    const [targetPage, anchor] = href.split('#');
    const curPage = location.pathname.split('/').pop() || 'index.html';
    if (anchor && (!targetPage || targetPage === curPage) && window.applySearchHighlight) {
      window.applySearchHighlight(anchor, input.value);
    }
    close();
  }

  function open() {
    panel.hidden = false;
    render(input.value, true);
    input.focus();
    input.select();
  }

  function close() {
    panel.hidden = true;
  }

  input.addEventListener('input', () => {
    saveState(-1, '', false);
    render(input.value, false);
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    picked = -1;
    saveState(-1, '', false);
    if (window.clearSearchHighlight) window.clearSearchHighlight(false);
    render('', false);
    input.focus();
  });
  panel.querySelector('.search-close').addEventListener('click', close);
  panel.addEventListener('click', (e) => { if (e.target === panel) close(); });
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) chooseLink(a);
  });
  document.addEventListener('keydown', (e) => {
    if (panel.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); return; }
    if (e.key === 'Enter') {
      const links = [...list.querySelectorAll('a')];
      const target = links[picked >= 0 ? picked : 0];
      if (target) { e.preventDefault(); target.click(); }
    }
  });

  window.openSearch = open;
  open();
})();
