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

  // Qualitative correction guidance for an out-of-range reading.
  function adviceFor(r) {
    if (!r) return [];
    const out = [];
    const st = (k) => evalMetric(k, r[k]).state;
    if (st('ph') === 'high') out.push(t('action_ph_high'));
    if (st('ph') === 'low') out.push(t('action_ph_low'));
    if (st('chlorine') === 'high') out.push(t('action_cl_high'));
    if (st('chlorine') === 'low') out.push(r.chlorine !== null && r.chlorine < 0.5 ? t('action_cl_vlow') : t('action_cl_low'));
    if (st('stabilizer') === 'low') out.push(t('action_cya_low'));
    if (st('stabilizer') === 'high') out.push(t('action_cya_high'));
    return out;
  }

  // Unique residence stops (Maps queries) for pools with work this week.
  function todaysStops() {
    const occ = Store.occupancyForWeek(currentWeek())
      .filter((o) => ['arriving', 'occupied', 'owner'].includes(o.status));
    const seen = new Set();
    const stops = [];
    occ.forEach((o) => {
      const p = Store.pool(o.poolId);
      if (!p || !hasPool(p)) return;
      const res = Store.residence(p.res);
      if (!res || seen.has(res.code)) return;
      seen.add(res.code);
      stops.push(res.lat != null && res.lng != null ? `${res.lat},${res.lng}` : res.mapsQuery);
    });
    return stops;
  }
  function routeUrl(stops) {
    if (!stops.length) return null;
    if (stops.length === 1) return mapsUrl(stops[0]);
    const dest = encodeURIComponent(stops[stops.length - 1]);
    const wp = stops.slice(0, -1).map(encodeURIComponent).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&waypoints=${wp}&travelmode=driving`;
  }
  const servicedToday = (poolId) => Store.servicedOn(poolId, todayISO());

  // ---------- router ----------
  const routes = {
    '': viewToday, 'today': viewToday, 'pools': viewPools, 'pool': viewPool,
    'schedule': viewSchedule, 'map': viewMap, 'log': viewLog, 'settings': viewSettings,
  };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [name, ...rest] = h.split('/');
    return { name: name || '', args: rest };
  }

  // Apply translations to the static chrome (tab bar) + <html lang>.
  function applyChrome() {
    document.documentElement.lang = I18n.get();
    document.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
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
  // Primary label = residence code prefix + logement number (matches the papers).
  function poolTitle(p) {
    return `${p.res} ${p.unit}`;
  }
  // True when this is a pool we actually maintain (not a management-only rental).
  function hasPool(p) {
    if (!p || p.nonPool) return false;
    const r = Store.residence(p.res);
    return !(r && r.nonPool);
  }
  function mapsUrl(query) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }
  const coordsQueryUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  // Pool's own GPS wins; else its residence's; else null.
  function poolCoords(p) {
    if (p && p.lat != null && p.lng != null) return { lat: p.lat, lng: p.lng };
    const r = p && Store.residence(p.res);
    if (r && r.lat != null && r.lng != null) return { lat: r.lat, lng: r.lng };
    return null;
  }
  function poolMapUrl(p) {
    const c = poolCoords(p);
    if (c) return coordsQueryUrl(c.lat, c.lng);
    const res = Store.residence(p.res);
    return mapsUrl((res ? res.mapsQuery : '') + ' ' + p.unit);
  }

  // Pool health status, grounded in chemistry + how long since the last check +
  // open to-do flags. (Interval thresholds will become weather-driven later.)
  const CHECK_DUE_DAYS = 3;      // 🟠 attention if no reading for this long
  const CHECK_OVERDUE_DAYS = 6;  // 🔴 critical if this long
  function poolStatus(p) {
    if (!hasPool(p)) return { level: 'none', reason: 'na' };
    const r = Store.latestReading(p.id);
    const openTodo = Store.notesFor(p.id).some((n) => n.todo && !n.done);
    if (!r) return openTodo ? { level: 'orange', reason: 'todo' } : { level: 'grey', reason: 'nodata' };
    let sev = 0, reason = 'ok';
    const critical = (r.chlorine != null && r.chlorine < 0.5) || (r.ph != null && (r.ph < 6.6 || r.ph > 8.0));
    const out = ['ph', 'chlorine', 'stabilizer'].some((k) => ['low', 'high'].includes(evalMetric(k, r[k]).state));
    if (critical) { sev = 2; reason = 'critical'; } else if (out) { sev = 1; reason = 'out'; }
    const days = (Date.now() - new Date(r.at).getTime()) / 864e5;
    if (days > CHECK_OVERDUE_DAYS && sev < 2) { sev = 2; reason = 'overdue'; }
    else if (days > CHECK_DUE_DAYS && sev < 1) { sev = 1; reason = 'due'; }
    if (openTodo && sev < 1) { sev = 1; reason = 'todo'; }
    return { level: sev === 2 ? 'red' : sev === 1 ? 'orange' : 'green', reason };
  }
  const STATUS_COLOR = { green: '#1b9e4b', orange: '#d98b00', red: '#d12f2f', grey: '#8a98a4', none: '#8a98a4' };
  const statusColor = (lv) => STATUS_COLOR[lv] || STATUS_COLOR.grey;
  const statusDot = (p) => `<span class="status-dot" style="background:${statusColor(poolStatus(p).level)}"></span>`;
  // Points to plot: a pin per pool that has its own GPS; else one pin per
  // residence that has coords but no pinned pools.
  function mapPoints() {
    const pts = [];
    const resWithPoolPins = new Set();
    Store.pools().forEach((p) => {
      if (p.lat != null && p.lng != null) {
        resWithPoolPins.add(p.res);
        pts.push({ lat: p.lat, lng: p.lng, label: `${p.res} ${p.unit}`, color: hasPool(p) ? statusColor(poolStatus(p).level) : '#6b4ed6', maps: poolMapUrl(p), href: `#/pool/${p.id}` });
      }
    });
    Store.residences().forEach((res) => {
      if (res.lat != null && res.lng != null && !resWithPoolPins.has(res.code)) {
        pts.push({ lat: res.lat, lng: res.lng, label: `${res.code} · ${res.name}`, color: res.nonPool ? '#6b4ed6' : '#0277bd', maps: coordsQueryUrl(res.lat, res.lng) });
      }
    });
    return pts;
  }
  let leafletPromise = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => resolve(window.L);
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return leafletPromise;
  }
  async function initLeaflet(container) {
    try {
      const L = await loadLeaflet();
      if (!container.isConnected) return;
      const pts = mapPoints();
      const map = L.map(container).setView([45.0, -1.175], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      const bounds = [];
      pts.forEach((pt) => {
        const m = L.circleMarker([pt.lat, pt.lng], { radius: 8, color: '#fff', weight: 2, fillColor: pt.color, fillOpacity: 0.95 }).addTo(map);
        const link = pt.href ? `<a href="${pt.href}">${esc(pt.label)}</a>` : `<b>${esc(pt.label)}</b>`;
        m.bindPopup(`${link}<br><a href="${pt.maps}" target="_blank" rel="noopener">Google Maps ↗</a>`);
        bounds.push([pt.lat, pt.lng]);
      });
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      setTimeout(() => map.invalidateSize(), 100);
    } catch (e) {
      container.style.display = 'none'; // offline / blocked → list below still works
    }
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

  // ----- photos -----
  function photoThumb(rec) {
    const wrap = el('<div class="thumb"><button class="thumb-del" title="delete">✕</button></div>');
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = rec.dataUrl;
    img.addEventListener('click', () => openPhoto(rec.id));
    wrap.insertBefore(img, wrap.firstChild);
    wrap.querySelector('.thumb-del').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(t('photo_del_confirm'))) { Photos.remove(rec.id); render(); }
    });
    return wrap;
  }
  function openPhoto(id) {
    const r = window.Photos && Photos.get(id);
    if (!r) return;
    const ov = el('<div class="lightbox"></div>');
    const img = document.createElement('img');
    img.src = r.dataUrl;
    ov.appendChild(img);
    ov.addEventListener('click', () => ov.remove());
    document.body.appendChild(ov);
  }

  // ----- notes / to-dos -----
  // noteForm(undefined) shows a pool picker; noteForm(poolId) is fixed to a pool.
  function noteForm(fixedPoolId) {
    const showPicker = fixedPoolId === undefined;
    const opts = showPicker
      ? `<select name="poolId" class="note-select"><option value="">${esc(t('note_general'))}</option>` +
        Store.pools().map((p) => `<option value="${p.id}">${esc(p.res + ' ' + p.unit)}</option>`).join('') + '</select>'
      : '';
    const f = el(`<form class="note-form">
      <input class="note-input" name="text" type="text" autocomplete="off" placeholder="${esc(t('note_log_ph'))}">
      <div class="note-form-row">
        ${opts}
        <label class="note-todo"><input type="checkbox" name="todo"> ${esc(t('note_todo'))}</label>
        <label class="photo-btn" title="photo">📷<input type="file" accept="image/*" class="note-photos" multiple hidden></label>
        <button class="btn primary" type="submit">${esc(t('note_save'))}</button>
      </div>
    </form>`);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const text = (fd.get('text') || '').trim();
      const files = [...(f.querySelector('.note-photos').files || [])];
      if (!text && !files.length) return;
      // stamp the note with the earliest attached photo's capture time, if any
      let at;
      if (files.length && window.Photos) {
        const times = (await Promise.all(files.map((f2) => Photos.exifTime(f2).catch(() => null)))).filter(Boolean).sort();
        at = times[0] || undefined;
      }
      const note = Store.addNote({ text, poolId: showPicker ? (fd.get('poolId') || '') : fixedPoolId, todo: !!fd.get('todo'), at });
      for (const file of files) { try { await Photos.add({ poolId: note.poolId, noteId: note.id }, file); } catch (_) {} }
      render();
    });
    return f;
  }

  function noteItem(n) {
    const p = n.poolId ? Store.pool(n.poolId) : null;
    const tag = p ? `<a class="chip st-empty" href="#/pool/${p.id}">${esc(p.res + ' ' + p.unit)}</a>` : '';
    const todoChip = n.todo ? `<span class="chip ${n.done ? 'st-done' : 'st-arriving'}">${n.done ? esc(t('done_badge')) : '☐'}</span>` : '';
    const card = el(`<div class="card note${n.done ? ' note-done' : ''}">
      <div class="card-row"><span class="note-meta">${fmtDateTime(n.at)} ${tag}</span>${todoChip}</div>
      <div class="note-text">${esc(n.text)}</div>
      <div class="note-actions"></div>
    </div>`);
    const photos = window.Photos ? Photos.byNote(n.id) : [];
    if (photos.length) {
      const pc = el('<div class="thumbs"></div>');
      photos.forEach((ph) => pc.appendChild(photoThumb(ph)));
      card.insertBefore(pc, card.querySelector('.note-actions'));
    }
    const actions = card.querySelector('.note-actions');
    if (n.todo) {
      const b = el(`<button class="link-act">${esc(n.done ? t('reopen') : t('mark_done'))}</button>`);
      b.addEventListener('click', () => { Store.setNoteDone(n.id, !n.done); render(); });
      actions.appendChild(b);
    }
    const del = el('<button class="link-act del">✕</button>');
    del.addEventListener('click', () => { if (confirm(t('confirm_del_note'))) { Store.deleteNote(n.id); render(); } });
    actions.appendChild(del);
    return card;
  }

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

    // one-tap multi-stop route for the day's properties
    const stops = todaysStops();
    if (stops.length) {
      const actions = el('<div class="actions"></div>');
      actions.appendChild(el(`<a class="btn primary" target="_blank" rel="noopener"
        href="${routeUrl(stops)}">${esc(t('nav_today', { n: stops.length }))}</a>`));
      wrap.appendChild(actions);
    }

    // preventive layer: open to-dos + quick capture; full history under #/log
    const todos = Store.openTodos();
    const noteHead = el(`<div class="section-title"><h2>${esc(t('todos_title', { n: todos.length }))}</h2></div>`);
    noteHead.appendChild(el(`<a class="see-all" href="#/log">${esc(t('see_all'))}</a>`));
    wrap.appendChild(noteHead);
    if (todos.length) {
      const c = el('<div class="cards"></div>');
      todos.forEach((n) => c.appendChild(noteItem(n)));
      wrap.appendChild(c);
    }
    wrap.appendChild(noteForm(undefined));

    // maintenance views consider only pools we actually service
    const occ = Store.occupancyForWeek(week).filter((o) => hasPool(Store.pool(o.poolId)));

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
      if (!hasPool(p)) return false; // skip management-only rentals
      const r = Store.latestReading(p.id);
      return !r || new Date(r.at).getTime() < cutoff;
    });
  }

  function occCard(o) {
    const p = Store.pool(o.poolId);
    const latest = p ? Store.latestReading(p.id) : null;
    const done = servicedToday(o.poolId) ? `<span class="chip st-done">${esc(t('serviced_today'))}</span>` : '';
    return el(`<a class="card" href="#/pool/${o.poolId}">
      <div class="card-row"><strong>${p && hasPool(p) ? statusDot(p) : ''}${p ? esc(poolTitle(p)) : esc(o.poolId)}</strong>${statusChip(o.status)}</div>
      <div class="card-sub">${o.name ? esc(o.name) + ' · ' : ''}${esc(inOut(o))}</div>
      ${chemPills(latest)}${done}
    </a>`);
  }

  function poolMiniCard(p) {
    if (!hasPool(p)) {
      return el(`<a class="card mgmt" href="#/pool/${p.id}">
        <div class="card-row"><strong>${esc(poolTitle(p))}</strong><span class="chip st-mgmt">${esc(t('mgmt_only'))}</span></div>
      </a>`);
    }
    const latest = Store.latestReading(p.id);
    const tag = latest ? t('last_date', { date: fmtDate(latest.at) }) : t('never');
    return el(`<a class="card" href="#/pool/${p.id}">
      <div class="card-row"><strong>${statusDot(p)}${esc(poolTitle(p))}</strong><span class="chip st-empty">${esc(tag)}</span></div>
      ${chemPills(latest)}
    </a>`);
  }

  // ---------- view: POOLS ----------
  // Pool residences only — management-only rentals (e.g. HO) live in Schedule.
  function viewPools() {
    const wrap = document.createElement('div');
    const poolRes = Store.residences().filter((r) => !r.nonPool);
    const nPools = Store.pools().filter((p) => hasPool(p)).length;
    wrap.appendChild(header(t('pools_title'), t('pools_sub', { n: nPools, m: poolRes.length })));
    poolRes.forEach((res) => {
      const list = Store.poolsByRes(res.code);
      if (!list.length) return;
      wrap.appendChild(sectionTitle(`${res.code} · ${res.name} (${list.length})`, res.verify ? t('to_confirm') : ''));
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

    const stLevel = poolStatus(p).level;
    const stBadge = hasPool(p) ? ` · <span class="status-word" style="color:${statusColor(stLevel)}">${esc(t('status_' + stLevel))}</span>` : '';
    wrap.appendChild(el(`<header class="page-head">
      <a class="back" href="#/pools">${esc(t('back_pools'))}</a>
      <h1>${hasPool(p) ? statusDot(p) : ''}${esc(poolTitle(p))}</h1>
      <p class="sub">${esc(res ? res.name : p.res)}${p.type ? ' · ' + esc(p.type) : ''}${stBadge}</p>
    </header>`));

    if (p.note) wrap.appendChild(el(`<p class="pool-note">ℹ︎ ${esc(p.note)}</p>`));

    const pool = hasPool(p);
    const coords = p.lat != null && p.lng != null;

    const actions = el('<div class="actions"></div>');
    actions.appendChild(el(`<a class="btn" target="_blank" rel="noopener"
      href="${poolMapUrl(p)}">${esc(t('directions'))}</a>`));

    if (pool) {
      // capture GPS at the pool (builds precise pins over time)
      const geoBtn = el(`<button class="btn">${esc(coords ? t('update_location') : t('set_location'))}</button>`);
      geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) { alert(t('geo_unsupported')); return; }
        geoBtn.disabled = true;
        geoBtn.textContent = t('geo_locating');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            Store.updatePool(p.id, { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) });
            render();
          },
          () => { alert(t('geo_error')); geoBtn.disabled = false; geoBtn.textContent = coords ? t('update_location') : t('set_location'); },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      actions.appendChild(geoBtn);

      // mark-serviced toggle (adds/removes a service visit for today)
      const doneToday = servicedToday(p.id);
      const svcBtn = el(`<button class="btn ${doneToday ? 'done' : ''}">${esc(doneToday ? t('service_undo') : t('mark_serviced'))}</button>`);
      svcBtn.addEventListener('click', () => {
        if (doneToday) {
          Store.visitsFor(p.id)
            .filter((v) => Store.localDate(v.at) === todayISO())
            .forEach((v) => Store.deleteVisit(v.id));
        } else {
          Store.addVisit(p.id, { type: 'service' });
        }
        render();
      });
      actions.appendChild(svcBtn);
    }
    wrap.appendChild(actions);

    if (!pool) {
      wrap.appendChild(el(`<p class="empty-note">${esc(t('mgmt_note'))}</p>`));
    }

    if (pool && coords) {
      const row = el(`<p class="coords-row"><span>${esc(t('coords_label', { lat: p.lat, lng: p.lng }))}</span>
        <button class="link-clear">${esc(t('clear_location'))}</button></p>`);
      row.querySelector('.link-clear').addEventListener('click', () => {
        Store.updatePool(p.id, { lat: null, lng: null });
        render();
      });
      wrap.appendChild(row);
    }

    if (pool) {
      const lastV = Store.lastVisit(p.id);
      if (lastV) wrap.appendChild(el(`<p class="last-serviced">${esc(t('last_serviced', { date: fmtDateTime(lastV.at) }))}</p>`));

      // suggested action based on the most recent reading
      const advice = adviceFor(Store.latestReading(p.id));
      if (advice.length) {
        wrap.appendChild(el(`<div class="advice"><strong>${esc(t('advice_title'))}</strong>
          <ul>${advice.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`));
      }
    }

    // reference photos: front gate / pool / pump room
    wrap.appendChild(sectionTitle(t('ref_photos')));
    const refRow = el('<div class="ref-photos"></div>');
    [['gate', t('ref_gate')], ['pool', t('ref_pool')], ['pit', t('ref_pit')]].forEach(([key, label]) => {
      const slot = el(`<div class="ref-slot"><span class="ref-label">${esc(label)}</span></div>`);
      const existing = window.Photos ? Photos.poolRef(p.id, key) : null;
      if (existing) {
        slot.appendChild(photoThumb(existing));
      } else {
        const lab = el(`<label class="ref-add">${esc(t('add_photo'))}<input type="file" accept="image/*" hidden></label>`);
        lab.querySelector('input').addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try { await Photos.add({ poolId: p.id, label: key }, file); } catch (_) {}
          render();
        });
        slot.appendChild(lab);
      }
      refRow.appendChild(slot);
    });
    wrap.appendChild(refRow);

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

    // notes / to-dos for this pool (available for every unit, incl. HO)
    wrap.appendChild(sectionTitle(t('notes_section')));
    wrap.appendChild(noteForm(p.id));
    const pNotes = Store.notesFor(p.id);
    if (pNotes.length) {
      const nc = el('<div class="cards"></div>');
      pNotes.forEach((n) => nc.appendChild(noteItem(n)));
      wrap.appendChild(nc);
    }

    if (pool) {
      wrap.appendChild(sectionTitle(t('log_reading')));
      wrap.appendChild(readingForm(p));

      const readings = Store.readingsFor(p.id);
      wrap.appendChild(sectionTitle(t('history', { n: readings.length })));
      if (readings.length) wrap.appendChild(readingsTable(p, readings));
      else wrap.appendChild(emptyNote(t('history_empty')));
    }
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
      <label class="field"><span>${esc(t('f_note'))}</span><input name="note" type="text" placeholder="${esc(t('note_ph'))}"></label>
      <label class="field"><span>${esc(t('f_when'))}</span><input name="at" type="datetime-local"></label>
      <div class="target-hint">${esc(t('targets', tgt))}</div>
      <button class="btn primary" type="submit">${esc(t('save_reading'))}</button>
    </form>`);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const atVal = fd.get('at');
      Store.addReading({
        poolId: p.id, ph: fd.get('ph'), chlorine: fd.get('chlorine'),
        stabilizer: fd.get('stabilizer'), note: fd.get('note'),
        at: atVal ? new Date(atVal).toISOString() : undefined,
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
      <th>${esc(t('th_cya'))}</th><th></th></tr></thead><tbody></tbody></table>`);
    const tb = tbl.querySelector('tbody');
    readings.forEach((r) => {
      const tr = el(`<tr>
        <td>${fmtDateTime(r.at)}${r.note ? `<div class="cell-note">${esc(r.note)}</div>` : ''}</td>
        <td class="${evalMetric('ph', r.ph).state}">${r.ph ?? '—'}</td>
        <td class="${evalMetric('chlorine', r.chlorine).state}">${r.chlorine ?? '—'}</td>
        <td class="${evalMetric('stabilizer', r.stabilizer).state}">${r.stabilizer ?? '—'}</td>
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

  // ---------- view: LOG (notes & to-dos) ----------
  function viewLog() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('log_title'), t('log_sub')));
    wrap.appendChild(noteForm(undefined));
    const all = Store.notes();
    const open = all.filter((n) => n.todo && !n.done);
    const rest = all.filter((n) => !(n.todo && !n.done));
    if (open.length) {
      wrap.appendChild(sectionTitle(t('todos_title', { n: open.length })));
      const c = el('<div class="cards"></div>');
      open.forEach((n) => c.appendChild(noteItem(n)));
      wrap.appendChild(c);
    }
    wrap.appendChild(sectionTitle(t('notes_recent')));
    if (rest.length) {
      const c = el('<div class="cards"></div>');
      rest.forEach((n) => c.appendChild(noteItem(n)));
      wrap.appendChild(c);
    } else if (!open.length) {
      wrap.appendChild(emptyNote(t('notes_empty')));
    }
    return wrap;
  }

  // ---------- view: MAP ----------
  function viewMap() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('map_title'), t('map_sub')));

    // interactive map from stored coordinates (best-effort; list below is the fallback)
    if (mapPoints().length) {
      const mapDiv = el('<div class="leaflet-map"></div>');
      wrap.appendChild(mapDiv);
      initLeaflet(mapDiv);
    }

    const cards = el('<div class="cards"></div>');
    Store.residences().forEach((res) => {
      const n = Store.poolsByRes(res.code).length;
      const href = res.lat != null && res.lng != null ? coordsQueryUrl(res.lat, res.lng) : mapsUrl(res.mapsQuery);
      const tag = res.nonPool ? `<span class="chip st-mgmt">${esc(t('mgmt_only'))}</span>` : `<span class="chip st-empty">${esc(t('n_pools', { n }))}</span>`;
      const addr = res.mapsQuery + (res.lat != null ? ` · ${res.lat}, ${res.lng}` : '');
      cards.appendChild(el(`<a class="card" target="_blank" rel="noopener" href="${href}">
        <div class="card-row"><strong>${esc(res.code)} · ${esc(res.name)}</strong>${tag}</div>
        <div class="card-sub">${esc(addr)}</div>
        <div class="card-sub link">${esc(t('open_maps'))}</div>
      </a>`));
    });
    wrap.appendChild(cards);
    wrap.appendChild(emptyNote(t('map_tip')));
    return wrap;
  }

  // ----- exports -----
  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function readingsCsv() {
    const rows = [['residence', 'unit', 'datetime', 'pH', 'chlorine_ppm', 'stabilizer_ppm', 'note']];
    const all = Store.pools().flatMap((p) => Store.readingsFor(p.id).map((r) => ({ p, r })));
    all.sort((a, b) => a.r.at.localeCompare(b.r.at));
    all.forEach(({ p, r }) => rows.push([p.res, p.unit, r.at, r.ph ?? '', r.chlorine ?? '', r.stabilizer ?? '', r.note || '']));
    return rows.map((row) => row.map(csvCell).join(',')).join('\n');
  }
  function notesCsv() {
    const rows = [['datetime', 'residence', 'unit', 'todo', 'done', 'text']];
    Store.notes().slice().reverse().forEach((n) => {
      const p = n.poolId ? Store.pool(n.poolId) : null;
      rows.push([n.at, p ? p.res : '', p ? p.unit : '', n.todo ? 'todo' : '', n.done ? 'done' : '', n.text]);
    });
    return rows.map((row) => row.map(csvCell).join(',')).join('\n');
  }

  const SYNC_STATE = { off: 'sync_state_off', connecting: 'sync_state_connecting', online: 'sync_state_online', offline: 'sync_state_offline', error: 'sync_state_error' };
  function syncSection() {
    const box = el('<div class="sync-box"></div>');
    box.appendChild(el(`<div class="section-title"><h2>${esc(t('sync_title'))}</h2><p>${esc(t('sync_desc'))}</p></div>`));
    if (!window.Sync) return box;
    const st = Sync.status;
    const on = Sync.active;
    const stateTxt = t(SYNC_STATE[st] || 'sync_state_off');
    box.appendChild(el(`<p class="sync-status s-${st}">${esc(on && Sync.team ? t('sync_on_team', { team: Sync.team }) + ' · ' + stateTxt : stateTxt)}</p>`));

    if (!on) {
      const input = el(`<input class="sync-input" type="text" inputmode="text" autocapitalize="none" autocomplete="off" placeholder="${esc(t('team_code_ph'))}" value="${esc(Sync.team || '')}">`);
      const btn = el(`<button class="btn primary">${esc(t('sync_connect'))}</button>`);
      btn.addEventListener('click', async () => {
        const code = input.value.trim();
        if (!code) { input.focus(); return; }
        btn.disabled = true;
        try { await Sync.enable(code); } catch (_) { /* status line shows the error */ }
        render();
      });
      const field = el(`<label class="field"><span>${esc(t('team_code'))}</span></label>`);
      field.appendChild(input);
      box.appendChild(field);
      box.appendChild(btn);
      box.appendChild(el(`<p class="sync-hint">${esc(t('sync_hint'))}</p>`));
    } else {
      const btn = el(`<button class="btn danger">${esc(t('sync_disconnect'))}</button>`);
      btn.addEventListener('click', () => { Sync.disable(); render(); });
      box.appendChild(btn);
    }
    return box;
  }

  // ---------- view: SETTINGS ----------
  function viewSettings() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('settings_title')));
    wrap.appendChild(syncSection());

    const exportBtn = el(`<button class="btn">${esc(t('export_btn'))}</button>`);
    exportBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-backup-${todayISO()}.json`, Store.exportJSON(), 'application/json'));

    const csvReadBtn = el(`<button class="btn">${esc(t('export_csv_readings'))}</button>`);
    csvReadBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-readings-${todayISO()}.csv`, readingsCsv(), 'text/csv'));
    const csvNoteBtn = el(`<button class="btn">${esc(t('export_csv_notes'))}</button>`);
    csvNoteBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-notes-${todayISO()}.csv`, notesCsv(), 'text/csv'));

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

    const logBtn = el(`<a class="btn" href="#/log">📝 ${esc(t('log_title'))}</a>`);

    const box = el('<div class="settings"></div>');
    [logBtn, langRow, exportBtn, csvReadBtn, csvNoteBtn, importBtn, importInput, resetBtn].forEach((n) => box.appendChild(n));
    wrap.appendChild(box);

    wrap.appendChild(sectionTitle(t('about')));
    const tgt = `pH ${CHEM_RANGES.ph.min}–${CHEM_RANGES.ph.max} · Cl ${CHEM_RANGES.chlorine.min}–${CHEM_RANGES.chlorine.max} ppm · CYA ${CHEM_RANGES.stabilizer.min}–${CHEM_RANGES.stabilizer.max} ppm`;
    wrap.appendChild(el(`<p class="empty-note">${esc(t('about_text'))}<br>${esc(tgt)}</p>`));
    return wrap;
  }

  // ---------- boot ----------
  Store.load();
  if (!location.hash) location.hash = '#/today';
  render();

  // re-render when Team Sync brings in remote changes or its status shifts
  let syncRenderQueued = false;
  window.addEventListener('lp-data-changed', () => {
    if (syncRenderQueued) return;        // coalesce bursts of remote deltas
    syncRenderQueued = true;
    requestAnimationFrame(() => { syncRenderQueued = false; render(); });
  });
  window.addEventListener('lp-sync-status', render);
  if (window.Photos) Photos.init();
  if (window.Sync) Sync.maybeAutoStart();

  if ('serviceWorker' in navigator) {
    // If a SW is already controlling this page, a controller change means a new
    // version activated → reload once to pick up fresh assets (no stale code).
    if (navigator.serviceWorker.controller) {
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloaded) return; reloaded = true; window.location.reload();
      });
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }).catch(() => {});
    });
  }
})();
