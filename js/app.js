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
    'schedule': viewSchedule, 'map': viewMap, 'settings': viewSettings,
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

    // one-tap multi-stop route for the day's properties
    const stops = todaysStops();
    if (stops.length) {
      const actions = el('<div class="actions"></div>');
      actions.appendChild(el(`<a class="btn primary" target="_blank" rel="noopener"
        href="${routeUrl(stops)}">${esc(t('nav_today', { n: stops.length }))}</a>`));
      wrap.appendChild(actions);
    }

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
      <div class="card-row"><strong>${p ? esc(poolTitle(p)) : esc(o.poolId)}</strong>${statusChip(o.status)}</div>
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
      const sub = res.nonPool ? t('mgmt_only') : (res.verify ? t('to_confirm') : '');
      wrap.appendChild(sectionTitle(`${res.code} · ${res.name} (${list.length})`, sub));
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
      const href = res.lat != null && res.lng != null ? coordsQueryUrl(res.lat, res.lng) : mapsUrl(res.mapsQuery);
      const tag = res.nonPool ? `<span class="chip st-mgmt">${esc(t('mgmt_only'))}</span>` : `<span class="chip st-empty">${esc(t('n_pools', { n }))}</span>`;
      cards.appendChild(el(`<a class="card" target="_blank" rel="noopener" href="${href}">
        <div class="card-row"><strong>${esc(res.code)} · ${esc(res.name)}</strong>${tag}</div>
        <div class="card-sub">${esc(res.note || '')}</div>
        <div class="card-sub link">${esc(t('open_maps'))}</div>
      </a>`));
    });
    wrap.appendChild(cards);
    wrap.appendChild(emptyNote(t('map_tip')));
    return wrap;
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
  if (window.Sync) Sync.maybeAutoStart();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
