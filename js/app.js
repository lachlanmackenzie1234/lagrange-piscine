/* Lagrange Piscine — app shell, router and views. Vanilla JS, no build step. */
(() => {
  const S = window.SEED;
  const { CHEM_RANGES, OCC_STATUS } = S;
  const t = (k, p) => I18n.t(k, p);
  const app = document.getElementById('app');

  // ---------- helpers ----------
  const el = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString(I18n.locale(), { weekday: 'short', day: '2-digit', month: 'short' });
  };
  const fmtDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString(I18n.locale(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const todayISO = () => new Date().toISOString().slice(0, 10);

  // Nearest turnover Saturday on/after today (falls back to last known week).
  function currentWeek() {
    const wks = Store.weeks();
    const t0 = todayISO();
    return wks.find((w) => w >= t0) || wks[wks.length - 1] || S.SAT.jun27;
  }

  function evalMetric(key, v) {
    if (v === null || v === undefined || v === '') return { state: 'na' };
    const r = CHEM_RANGES[key];
    if (!r) return { state: 'na' };
    if (v < r.min) return { state: 'low' };
    if (v > r.max) return { state: 'high' };
    return { state: 'ok' };
  }

  // ---------- router ----------
  const routes = {
    '': viewToday, 'today': viewToday, 'pools': viewPools, 'pool': viewPool,
    'schedule': viewSchedule, 'map': viewMap, 'settings': viewSettings,
  };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, ...rest] = h.split('/');
    return { name: name || '', args: rest };
  }

  // Apply translations to the static chrome (tab bar, toggle) + <html lang>.
  function applyChrome() {
    document.documentElement.lang = I18n.get();
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.textContent = I18n.get() === 'fr' ? 'EN' : 'FR'; // shows the language you'd switch TO
  }

  function render() {
    const { name, args } = parseHash();
    const view = routes[name] || viewToday;
    app.innerHTML = '';
    app.appendChild(view(...args));
    document.querySelectorAll('.tabbar a').forEach((a) => {
      a.classList.toggle('active', a.dataset.route === (name || 'today') ||
        (name === '' && a.dataset.route === 'today'));
    });
    applyChrome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);

  // ---------- shared bits ----------
  function header(title, sub) {
    return el(`<header class="page-head"><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</header>`);
  }
  function statusChip(status) {
    const m = OCC_STATUS[status] || OCC_STATUS.empty;
    return `<span class="chip ${m.cls}">${esc(t('st_' + status))}</span>`;
  }
  function poolTitle(p) {
    const res = Store.residence(p.res);
    return `${res ? res.name : p.res} · ${p.unit}`;
  }
  function mapsUrl(query) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }
  // "in <date> → out <date>" localized
  function inOut(o) {
    const parts = [];
    if (o.arrival) parts.push(t('in_date', { date: fmtDate(o.arrival) }));
    if (o.departure) parts.push(t('out_date', { date: fmtDate(o.departure) }));
    return parts.join(' → ');
  }
  function sectionTitle(t0, sub) {
    return el(`<div class="section-title"><h2>${esc(t0)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`);
  }
  function emptyNote(txt) { return el(`<p class="empty-note">${esc(txt)}</p>`); }

  const PILL_LABEL = { ph: 'pH', chlorine: 'Cl', stabilizer: 'CYA' };
  function chemPills(r) {
    if (!r) return `<div class="pills"><span class="pill na">${esc(t('no_reading'))}</span></div>`;
    const cell = (k) => {
      const e = evalMetric(k, r[k]);
      return `<span class="pill ${e.state}">${PILL_LABEL[k]}: ${r[k] ?? '—'}</span>`;
    };
    return `<div class="pills">${cell('ph')}${cell('chlorine')}${cell('stabilizer')}</div>`;
  }

  // ---------- view: TODAY ----------
  function viewToday() {
    const wrap = document.createElement('div');
    const week = currentWeek();
    wrap.appendChild(header(t('today_title'), t('today_sub', { date: fmtDate(week) })));
    const occ = Store.occupancyForWeek(week);

    const arriving = occ.filter((o) => o.status === 'arriving');
    wrap.appendChild(sectionTitle(t('arrivals_title', { n: arriving.length }), t('arrivals_sub')));
    if (arriving.length) {
      const list = el('<div class="cards"></div>');
      arriving.forEach((o) => list.appendChild(occCard(o)));
      wrap.appendChild(list);
    } else wrap.appendChild(emptyNote(t('arrivals_empty')));

    const cycling = occ.filter((o) => ['occupied', 'owner'].includes(o.status));
    wrap.appendChild(sectionTitle(t('midweek_title', { n: cycling.length }), t('midweek_sub')));
    if (cycling.length) {
      const list = el('<div class="cards"></div>');
      cycling.forEach((o) => list.appendChild(occCard(o)));
      wrap.appendChild(list);
    } else wrap.appendChild(emptyNote(t('midweek_empty')));

    const stale = staleReadings();
    wrap.appendChild(sectionTitle(t('chem_due_title', { n: stale.length }), t('chem_due_sub')));
    if (stale.length) {
      const list = el('<div class="cards"></div>');
      stale.forEach((p) => list.appendChild(poolMiniCard(p)));
      wrap.appendChild(list);
    } else wrap.appendChild(emptyNote(t('chem_due_empty')));
    return wrap;
  }

  function staleReadings() {
    const cutoff = Date.now() - 4 * 864e5;
    return Store.pools().filter((p) => {
      const r = Store.latestReading(p.id);
      return !r || new Date(r.at).getTime() < cutoff;
    });
  }

  function occCard(o) {
    const p = Store.pool(o.poolId);
    const latest = p ? Store.latestReading(p.id) : null;
    return el(`<a class="card" href="#/pool/${o.poolId}">
      <div class="card-row"><strong>${p ? esc(poolTitle(p)) : esc(o.poolId)}</strong>${statusChip(o.status)}</div>
      <div class="card-sub">${o.name ? esc(o.name) + ' · ' : ''}${esc(inOut(o))}</div>
      ${chemPills(latest)}
    </a>`);
  }

  function poolMiniCard(p) {
    const latest = Store.latestReading(p.id);
    const tag = latest ? t('last_date', { date: fmtDate(latest.at) }) : t('never');
    return el(`<a class="card" href="#/pool/${p.id}">
      <div class="card-row"><strong>${esc(poolTitle(p))}</strong><span class="chip st-empty">${esc(tag)}</span></div>
      ${chemPills(latest)}
    </a>`);
  }

  // ---------- view: POOLS ----------
  function viewPools() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('pools_title'), t('pools_sub', { n: Store.pools().length, m: Store.residences().length })));
    Store.residences().forEach((res) => {
      const list = Store.poolsByRes(res.code);
      if (!list.length) return;
      wrap.appendChild(sectionTitle(`${res.name} (${list.length})`, res.verify ? t('to_confirm') : ''));
      const cards = el('<div class="cards"></div>');
      list.forEach((p) => cards.appendChild(poolMiniCard(p)));
      wrap.appendChild(cards);
    });
    return wrap;
  }

  // ---------- view: POOL DETAIL ----------
  function viewPool(id) {
    const p = Store.pool(id);
    const wrap = document.createElement('div');
    if (!p) { wrap.appendChild(header(t('pool_not_found'))); return wrap; }
    const res = Store.residence(p.res);

    wrap.appendChild(el(`<header class="page-head">
      <a class="back" href="#/pools">${esc(t('back_pools'))}</a>
      <h1>${esc(poolTitle(p))}</h1>
      <p class="sub">${esc(res ? res.name : p.res)}${p.type ? ' · ' + esc(p.type) : ''}</p>
    </header>`));

    const actions = el('<div class="actions"></div>');
    actions.appendChild(el(`<a class="btn" target="_blank" rel="noopener"
      href="${mapsUrl((res ? res.mapsQuery : '') + ' ' + p.unit)}">${esc(t('directions'))}</a>`));
    wrap.appendChild(actions);

    const occ = Store.occupancyFor(p.id);
    if (occ.length) {
      wrap.appendChild(sectionTitle(t('occupancy')));
      const ol = el('<div class="cards"></div>');
      occ.forEach((o) => ol.appendChild(el(`<div class="card">
        <div class="card-row"><strong>${fmtDate(o.week)}</strong>${statusChip(o.status)}</div>
        <div class="card-sub">${o.name ? esc(o.name) + ' · ' : ''}${esc(inOut(o))}${o.note ? ' · ' + esc(o.note) : ''}</div>
      </div>`)));
      wrap.appendChild(ol);
    }

    wrap.appendChild(sectionTitle(t('log_reading')));
    wrap.appendChild(readingForm(p));

    const readings = Store.readingsFor(p.id);
    wrap.appendChild(sectionTitle(t('history', { n: readings.length })));
    if (readings.length) wrap.appendChild(readingsTable(p, readings));
    else wrap.appendChild(emptyNote(t('history_empty')));
    return wrap;
  }

  function readingForm(p) {
    const tgt = {
      phmin: CHEM_RANGES.ph.min, phmax: CHEM_RANGES.ph.max,
      clmin: CHEM_RANGES.chlorine.min, clmax: CHEM_RANGES.chlorine.max,
      cyamin: CHEM_RANGES.stabilizer.min, cyamax: CHEM_RANGES.stabilizer.max,
    };
    const f = el(`<form class="reading-form">
      <div class="grid3">
        ${numField('ph', t('f_ph'))}
        ${numField('chlorine', t('f_cl'))}
        ${numField('stabilizer', t('f_cya'))}
      </div>
      <div class="grid2">
        ${numField('temp', t('f_temp'))}
        <label class="field"><span>${esc(t('f_note'))}</span><input name="note" type="text" placeholder="${esc(t('note_ph'))}"></label>
      </div>
      <div class="target-hint">${esc(t('targets', tgt))}</div>
      <button class="btn primary" type="submit">${esc(t('save_reading'))}</button>
    </form>`);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      Store.addReading({
        poolId: p.id, ph: fd.get('ph'), chlorine: fd.get('chlorine'),
        stabilizer: fd.get('stabilizer'), temp: fd.get('temp'), note: fd.get('note'),
      });
      location.hash = '#/pool/' + p.id;
      render();
    });
    return f;
  }

  function numField(name, label) {
    const r = CHEM_RANGES[name];
    const step = r ? r.step : 0.1;
    return `<label class="field"><span>${esc(label)}</span>
      <input name="${name}" type="number" inputmode="decimal" step="${step}" placeholder="${r ? r.ideal : ''}"></label>`;
  }

  function readingsTable(p, readings) {
    const tbl = el(`<table class="readings"><thead><tr>
      <th>${esc(t('th_when'))}</th><th>${esc(t('th_ph'))}</th><th>${esc(t('th_cl'))}</th>
      <th>${esc(t('th_cya'))}</th><th>${esc(t('th_temp'))}</th><th></th></tr></thead><tbody></tbody></table>`);
    const tb = tbl.querySelector('tbody');
    readings.forEach((r) => {
      const tr = el(`<tr>
        <td>${fmtDateTime(r.at)}${r.note ? `<div class="cell-note">${esc(r.note)}</div>` : ''}</td>
        <td class="${evalMetric('ph', r.ph).state}">${r.ph ?? '—'}</td>
        <td class="${evalMetric('chlorine', r.chlorine).state}">${r.chlorine ?? '—'}</td>
        <td class="${evalMetric('stabilizer', r.stabilizer).state}">${r.stabilizer ?? '—'}</td>
        <td>${r.temp ?? '—'}</td>
        <td><button class="link-del" data-id="${r.id}">✕</button></td>
      </tr>`);
      tr.querySelector('.link-del').addEventListener('click', () => {
        if (confirm(t('confirm_del'))) { Store.deleteReading(r.id); render(); }
      });
      tb.appendChild(tr);
    });
    return tbl;
  }

  // ---------- view: SCHEDULE ----------
  function viewSchedule() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('schedule_title'), t('schedule_sub')));
    const cw = currentWeek();
    Store.weeks().forEach((week) => {
      const occ = Store.occupancyForWeek(week);
      const arr = occ.filter((o) => o.status === 'arriving').length;
      wrap.appendChild(el(`<div class="section-title">
        <h2>${fmtDate(week)} ${week === cw ? `<span class="chip st-arriving">${esc(t('this_week'))}</span>` : ''}</h2>
        <p>${esc(t('sched_counts', { n: occ.length, m: arr }))}</p></div>`));
      const cards = el('<div class="cards"></div>');
      Store.residences().forEach((res) => {
        const items = occ.filter((o) => Store.pool(o.poolId)?.res === res.code);
        if (!items.length) return;
        const rows = items.map((o) => {
          const p = Store.pool(o.poolId);
          return `<div class="sched-row"><span>${esc(p ? p.unit : o.poolId)} ${statusChip(o.status)}</span>
            <span class="muted">${o.name ? esc(o.name) : ''}</span></div>`;
        }).join('');
        cards.appendChild(el(`<div class="card"><div class="card-row"><strong>${esc(res.name)}</strong></div>${rows}</div>`));
      });
      wrap.appendChild(cards);
    });
    return wrap;
  }

  // ---------- view: MAP ----------
  function viewMap() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('map_title'), t('map_sub')));
    const cards = el('<div class="cards"></div>');
    Store.residences().forEach((res) => {
      const n = Store.poolsByRes(res.code).length;
      cards.appendChild(el(`<a class="card" target="_blank" rel="noopener" href="${mapsUrl(res.mapsQuery)}">
        <div class="card-row"><strong>${esc(res.name)}</strong><span class="chip st-empty">${esc(t('n_pools', { n }))}</span></div>
        <div class="card-sub">${esc(res.note || '')}</div>
        <div class="card-sub link">${esc(t('open_maps'))}</div>
      </a>`));
    });
    wrap.appendChild(cards);
    wrap.appendChild(emptyNote(t('map_tip')));
    return wrap;
  }

  // ---------- view: SETTINGS ----------
  function viewSettings() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('settings_title')));

    const exportBtn = el(`<button class="btn">${esc(t('export_btn'))}</button>`);
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lagrange-piscine-backup-${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    const importInput = el('<input type="file" accept="application/json" hidden>');
    const importBtn = el(`<button class="btn">${esc(t('import_btn'))}</button>`);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async () => {
      const file = importInput.files[0];
      if (!file) return;
      try { Store.importJSON(await file.text()); alert(t('imported_ok')); render(); }
      catch (e) { alert(t('import_fail') + e.message); }
    });

    const resetBtn = el(`<button class="btn danger">${esc(t('reset_btn'))}</button>`);
    resetBtn.addEventListener('click', () => {
      if (confirm(t('confirm_reset'))) { Store.resetToSeed(); render(); }
    });

    // language picker (mirrors the top-right toggle)
    const langRow = el(`<div class="lang-row">
      <span>${esc(t('language'))}</span>
      <div class="lang-seg">
        <button data-lang="en" class="${I18n.get() === 'en' ? 'on' : ''}">EN</button>
        <button data-lang="fr" class="${I18n.get() === 'fr' ? 'on' : ''}">FR</button>
      </div></div>`);
    langRow.querySelectorAll('[data-lang]').forEach((b) =>
      b.addEventListener('click', () => { I18n.set(b.dataset.lang); render(); }));

    const box = el('<div class="settings"></div>');
    [langRow, exportBtn, importBtn, importInput, resetBtn].forEach((n) => box.appendChild(n));
    wrap.appendChild(box);

    wrap.appendChild(sectionTitle(t('about')));
    const tgt = `pH ${CHEM_RANGES.ph.min}–${CHEM_RANGES.ph.max} · Cl ${CHEM_RANGES.chlorine.min}–${CHEM_RANGES.chlorine.max} ppm · CYA ${CHEM_RANGES.stabilizer.min}–${CHEM_RANGES.stabilizer.max} ppm`;
    wrap.appendChild(el(`<p class="empty-note">${esc(t('about_text'))}<br>${esc(tgt)}</p>`));
    return wrap;
  }

  // ---------- boot ----------
  Store.load();
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => { I18n.toggle(); render(); });
  if (!location.hash) location.hash = '#/today';
  render();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
