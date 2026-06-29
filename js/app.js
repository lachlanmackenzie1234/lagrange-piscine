/* Lagrange Piscine — app shell, router and views. Vanilla JS, no build step. */
(() => {
    const S = window.SEED;
    const { CHEM_RANGES, OCC_STATUS } = S;
    const app = document.getElementById('app');
  
    // ---------- helpers ----------
    const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  
    const fmtDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
    };
    const fmtDateTime = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };
    const todayISO = () => new Date().toISOString().slice(0, 10);
  
    // Nearest turnover Saturday on/after today (falls back to last known week).
    function currentWeek() {
      const wks = Store.weeks();
      const t = todayISO();
      return wks.find((w) => w >= t) || wks[wks.length - 1] || S.SAT.jun27;
    }
  
    // Evaluate a single chemistry metric against its range.
    function evalMetric(key, v) {
      if (v === null || v === undefined || v === '') return { state: 'na', label: '—' };
      const r = CHEM_RANGES[key];
      if (!r) return { state: 'na', label: String(v) };
      if (v < r.min) return { state: 'low', label: 'low' };
      if (v > r.max) return { state: 'high', label: 'high' };
      return { state: 'ok', label: 'ok' };
    }
  
    const statusMeta = (s) => OCC_STATUS[s] || OCC_STATUS.empty;
  
    // ---------- router ----------
    const routes = {
      '': viewToday,
      'today': viewToday,
      'pools': viewPools,
      'pool': viewPool,       // #/pool/:id
      'schedule': viewSchedule,
      'map': viewMap,
      'settings': viewSettings,
    };
  
    function parseHash() {
      const h = location.hash.replace(/^#\/?/, '');
      const [name, ...rest] = h.split('/');
      return { name: name || '', args: rest };
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
      app.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    window.addEventListener('hashchange', render);
  
    // ---------- shared bits ----------
    function header(title, sub) {
      return el(`<header class="page-head">
        <h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
      </header>`);
    }
  
    function statusChip(status) {
      const m = statusMeta(status);
      return `<span class="chip ${m.cls}">${esc(m.label)}</span>`;
    }
  
    function poolTitle(p) {
      const res = Store.residence(p.res);
      return `${res ? res.name : p.res} · ${p.unit}`;
    }
  
    function mapsUrl(query) {
      return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
    }
  
    // ---------- view: TODAY ----------
    function viewToday() {
      const wrap = document.createElement('div');
      const week = currentWeek();
      wrap.appendChild(header('This week', `Turnover Saturday · ${fmtDate(week)}`));
  
      const occ = Store.occupancyForWeek(week);
      const byStatus = (s) => occ.filter((o) => o.status === s);
  
      const arriving = byStatus('arriving');
      const departing = occ.filter((o) => o.departure === week || o.status === 'departing');
  
      // Priority 1: arrivals needing a pristine pool for Saturday.
      wrap.appendChild(sectionTitle(`Arrivals to prep (${arriving.length})`,
        'Pools that must be checked & clean for new guests this Saturday.'));
      if (arriving.length) {
        const list = el('<div class="cards"></div>');
        arriving.forEach((o) => list.appendChild(occCard(o)));
        wrap.appendChild(list);
      } else {
        wrap.appendChild(emptyNote('No new arrivals recorded for this week.'));
      }
  
      // Priority 2: mid-week cycling for occupied / owner pools.
      const cycling = occ.filter((o) => ['occupied', 'owner'].includes(o.status));
      wrap.appendChild(sectionTitle(`Mid-week checks (${cycling.length})`,
        'Occupied pools to cycle and keep balanced during the stay.'));
      if (cycling.length) {
        const list = el('<div class="cards"></div>');
        cycling.forEach((o) => list.appendChild(occCard(o)));
        wrap.appendChild(list);
      } else {
        wrap.appendChild(emptyNote('Nothing mid-stay this week.'));
      }
  
      // Pools needing a chemistry reading (none logged in last 4 days).
      const stale = staleReadings();
      wrap.appendChild(sectionTitle(`Chemistry due (${stale.length})`,
        'No reading logged in the last 4 days.'));
      if (stale.length) {
        const list = el('<div class="cards"></div>');
        stale.forEach((p) => list.appendChild(poolMiniCard(p)));
        wrap.appendChild(list);
      } else {
        wrap.appendChild(emptyNote('All pools have a recent reading. 🎉'));
      }
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
      const card = el(`<a class="card" href="#/pool/${o.poolId}">
        <div class="card-row">
          <strong>${p ? esc(poolTitle(p)) : esc(o.poolId)}</strong>
          ${statusChip(o.status)}
        </div>
        <div class="card-sub">
          ${o.name ? esc(o.name) + ' · ' : ''}${o.arrival ? 'in ' + fmtDate(o.arrival) : ''}${o.departure ? ' → out ' + fmtDate(o.departure) : ''}
        </div>
        ${chemPills(latest)}
      </a>`);
      return card;
    }
  
    function poolMiniCard(p) {
      const latest = Store.latestReading(p.id);
      return el(`<a class="card" href="#/pool/${p.id}">
        <div class="card-row"><strong>${esc(poolTitle(p))}</strong>
          <span class="chip st-empty">${latest ? 'last ' + fmtDate(latest.at) : 'never'}</span></div>
        ${chemPills(latest)}
      </a>`);
    }
  
    function chemPills(r) {
      if (!r) return '<div class="pills"><span class="pill na">no reading</span></div>';
      const cell = (k) => {
        const e = evalMetric(k, r[k]);
        const val = r[k] ?? '—';
        return `<span class="pill ${e.state}">${CHEM_RANGES[k].label.split(' ')[0]}: ${val}</span>`;
      };
      return `<div class="pills">${cell('ph')}${cell('chlorine')}${cell('stabilizer')}</div>`;
    }
  
    function sectionTitle(t, sub) {
      return el(`<div class="section-title"><h2>${esc(t)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`);
    }
    function emptyNote(t) { return el(`<p class="empty-note">${esc(t)}</p>`); }
  
    // ---------- view: POOLS ----------
    function viewPools() {
      const wrap = document.createElement('div');
      wrap.appendChild(header('Pools', `${Store.pools().length} pools across ${Store.residences().length} residences`));
      Store.residences().forEach((res) => {
        const list = Store.poolsByRes(res.code);
        if (!list.length) return;
        wrap.appendChild(sectionTitle(`${res.name} (${list.length})`, res.verify ? '⚠︎ details to confirm' : ''));
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
      if (!p) { wrap.appendChild(header('Pool not found')); return wrap; }
      const res = Store.residence(p.res);
  
      wrap.appendChild(el(`<header class="page-head">
        <a class="back" href="#/pools">‹ Pools</a>
        <h1>${esc(poolTitle(p))}</h1>
        <p class="sub">${esc(res ? res.name : p.res)}${p.type ? ' · ' + esc(p.type) : ''}</p>
      </header>`));
  
      // quick actions
      const actions = el('<div class="actions"></div>');
      actions.appendChild(el(`<a class="btn" target="_blank" rel="noopener"
        href="${mapsUrl((res ? res.mapsQuery : '') + ' ' + p.unit)}">📍 Directions</a>`));
      wrap.appendChild(actions);
  
      // occupancy timeline for this pool
      const occ = Store.occupancyFor(p.id);
      if (occ.length) {
        wrap.appendChild(sectionTitle('Occupancy'));
        const ol = el('<div class="cards"></div>');
        occ.forEach((o) => ol.appendChild(el(`<div class="card">
          <div class="card-row"><strong>${fmtDate(o.week)}</strong>${statusChip(o.status)}</div>
          <div class="card-sub">${o.name ? esc(o.name) + ' · ' : ''}${o.arrival ? 'in ' + fmtDate(o.arrival) : ''}${o.departure ? ' → out ' + fmtDate(o.departure) : ''}${o.note ? ' · ' + esc(o.note) : ''}</div>
        </div>`)));
        wrap.appendChild(ol);
      }
  
      // chemistry: log form + history
      wrap.appendChild(sectionTitle('Log a reading'));
      wrap.appendChild(readingForm(p));
  
      const readings = Store.readingsFor(p.id);
      wrap.appendChild(sectionTitle(`History (${readings.length})`));
      if (readings.length) {
        wrap.appendChild(readingsTable(p, readings));
      } else {
        wrap.appendChild(emptyNote('No readings yet. Log the first one above.'));
      }
      return wrap;
    }
  
    function readingForm(p) {
      const f = el(`<form class="reading-form">
        <div class="grid3">
          ${numField('ph', 'pH')}
          ${numField('chlorine', 'Free Cl (ppm)')}
          ${numField('stabilizer', 'Stabilizer (ppm)')}
        </div>
        <div class="grid2">
          ${numField('temp', 'Temp (°C)', false)}
          <label class="field"><span>Note</span><input name="note" type="text" placeholder="e.g. added 2 galets"></label>
        </div>
        <div class="target-hint">Targets — pH ${CHEM_RANGES.ph.min}–${CHEM_RANGES.ph.max} · Cl ${CHEM_RANGES.chlorine.min}–${CHEM_RANGES.chlorine.max}ppm · CYA ${CHEM_RANGES.stabilizer.min}–${CHEM_RANGES.stabilizer.max}ppm</div>
        <button class="btn primary" type="submit">Save reading</button>
      </form>`);
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        Store.addReading({
          poolId: p.id,
          ph: fd.get('ph'), chlorine: fd.get('chlorine'),
          stabilizer: fd.get('stabilizer'), temp: fd.get('temp'),
          note: fd.get('note'),
        });
        location.hash = '#/pool/' + p.id;
        render();
      });
      return f;
    }
  
    function numField(name, label, ranged = true) {
      const r = CHEM_RANGES[name];
      const step = r ? r.step : 0.1;
      return `<label class="field"><span>${esc(label)}</span>
        <input name="${name}" type="number" inputmode="decimal" step="${step}" placeholder="${r ? r.ideal : ''}"></label>`;
    }
  
    function readingsTable(p, readings) {
      const t = el(`<table class="readings"><thead><tr>
        <th>When</th><th>pH</th><th>Cl</th><th>CYA</th><th>°C</th><th></th></tr></thead><tbody></tbody></table>`);
      const tb = t.querySelector('tbody');
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
          if (confirm('Delete this reading?')) { Store.deleteReading(r.id); render(); }
        });
        tb.appendChild(tr);
      });
      return t;
    }
  
    // ---------- view: SCHEDULE ----------
    function viewSchedule() {
      const wrap = document.createElement('div');
      wrap.appendChild(header('Schedule', 'Saturday turnover cycle'));
      const cw = currentWeek();
      Store.weeks().forEach((week) => {
        const occ = Store.occupancyForWeek(week);
        const arr = occ.filter((o) => o.status === 'arriving').length;
        const head = el(`<div class="section-title"><h2>${fmtDate(week)} ${week === cw ? '<span class="chip st-arriving">this week</span>' : ''}</h2>
          <p>${occ.length} active · ${arr} arriving</p></div>`);
        wrap.appendChild(head);
        const cards = el('<div class="cards"></div>');
        // group by residence
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
      wrap.appendChild(header('Map', 'Open residences in Google Maps'));
      const cards = el('<div class="cards"></div>');
      Store.residences().forEach((res) => {
        const n = Store.poolsByRes(res.code).length;
        cards.appendChild(el(`<a class="card" target="_blank" rel="noopener" href="${mapsUrl(res.mapsQuery)}">
          <div class="card-row"><strong>${esc(res.name)}</strong><span class="chip st-empty">${n} pools</span></div>
          <div class="card-sub">${esc(res.note || '')}</div>
          <div class="card-sub link">📍 Open in Google Maps</div>
        </a>`));
      });
      wrap.appendChild(cards);
      wrap.appendChild(emptyNote('Tip: route optimisation between today’s stops is on the roadmap.'));
      return wrap;
    }
  
    // ---------- view: SETTINGS ----------
    function viewSettings() {
      const wrap = document.createElement('div');
      wrap.appendChild(header('Settings & backup'));
  
      const exportBtn = el('<button class="btn">⬇︎ Export backup (.json)</button>');
      exportBtn.addEventListener('click', () => {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lagrange-piscine-backup-${todayISO()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  
      const importInput = el('<input type="file" accept="application/json" hidden>');
      const importBtn = el('<button class="btn">⬆︎ Import backup</button>');
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', async () => {
        const file = importInput.files[0];
        if (!file) return;
        try { Store.importJSON(await file.text()); alert('Backup imported.'); render(); }
        catch (e) { alert('Import failed: ' + e.message); }
      });
  
      const resetBtn = el('<button class="btn danger">↺ Reset to seed data</button>');
      resetBtn.addEventListener('click', () => {
        if (confirm('Discard all local changes and reload the original seed data?')) {
          Store.resetToSeed(); render();
        }
      });
  
      const box = el('<div class="settings"></div>');
      [exportBtn, importBtn, importInput, resetBtn].forEach((n) => box.appendChild(n));
      wrap.appendChild(box);
  
      wrap.appendChild(sectionTitle('About'));
      wrap.appendChild(el(`<p class="empty-note">
        Data is stored only on this device. Export regularly to back up.
        Chemistry targets: pH ${CHEM_RANGES.ph.min}–${CHEM_RANGES.ph.max},
        free chlorine ${CHEM_RANGES.chlorine.min}–${CHEM_RANGES.chlorine.max} ppm,
        stabilizer ${CHEM_RANGES.stabilizer.min}–${CHEM_RANGES.stabilizer.max} ppm.
      </p>`));
      return wrap;
    }
  
    // ---------- boot ----------
    Store.load();
    if (!location.hash) location.hash = '#/today';
    render();
  
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
  })();
  