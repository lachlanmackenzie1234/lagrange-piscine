/* Lagrange Piscine — app shell, router and views. Vanilla JS, no build step. */
(() => {
  const S = window.SEED;
  const { CHEM_RANGES, OCC_STATUS, PRODUCTS, CYA_SALT } = S;
  const productById = (id) => (PRODUCTS || []).find((x) => x.id === id) || null;
  const productLabel = (p) => p ? `${p.brand} ${p.name}` : '';
  const FC_TEST_MAX = 6; // Lovibond DPD No.1 tablet free chlorine ("Cl6") reads to ~6 mg/L (dilute 50/50 above that)
  const t = (k, p) => I18n.t(k, p);
  const app = document.getElementById('app');
  const APP_VERSION = 'v0.47'; // semver display; keep in step with sw.js VERSION

  // Nuclear refresh: drop the service worker + all caches, then reload fresh.
  async function forceUpdate() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) { /* ignore */ }
    location.reload();
  }

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
  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString(I18n.locale(), { hour: '2-digit', minute: '2-digit' }) : '');
  const todayISO = () => new Date().toISOString().slice(0, 10);
  // Local date+time stamp for export filenames: YYYY-MM-DD_HHMMSS (sorts well,
  // unique per save — avoids the browser's "(1)/(2)" same-name de-dup).
  function fileStamp() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  // Live state of a pool's fill: elapsed minutes + reminder/overdue.
  function wateringInfo(p) {
    const w = p && p.watering;
    if (!w || !w.startedAt) return null;
    const start = new Date(w.startedAt).getTime();
    const mins = Math.max(0, Math.round((Date.now() - start) / 60000));
    let overdue = false, remainMin = null;
    if (w.reminderMin) { const due = start + w.reminderMin * 60000; overdue = Date.now() > due; remainMin = Math.round((due - Date.now()) / 60000); }
    return { start, mins, overdue, remainMin, reminderMin: w.reminderMin };
  }

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
    else if (st('stabilizer') === 'high') out.push(r.stabilizer >= 80 ? t('action_cya_vhigh') : t('action_cya_high'));
    return out;
  }

  // ----- chemistry engine (advisory; standard outdoor-pool chemistry) -----
  // Heuristic, transparent coefficients — refined per pool by its own history.
  const Chem = {
    // Fraction of free chlorine present as HOCl, the form that actually
    // sanitises. Dissociation curve, pKa ≈ 7.54 at ~25 °C.
    hoclFraction(ph) {
      if (ph == null) return null;
      return 1 / (1 + Math.pow(10, ph - 7.54));
    },
    // Stabiliser shields chlorine from UV: 1 = unprotected → ~0 = well buffered.
    uvProtection(cya) {
      const c = cya == null ? CHEM_RANGES.stabilizer.ideal : cya;
      return 1 / (1 + c / 15);
    },
    // Target free chlorine scales with CYA. Industry/TFP: target ≈ 10% of CYA
    // (7% for salt pools, whose cell tops up continuously), with a sane floor.
    targetFC(cya, salt) {
      const c = cya == null ? CHEM_RANGES.stabilizer.ideal : cya;
      return Math.max(1.5, Math.round((salt ? 0.07 : 0.10) * c * 10) / 10);
    },
    // Safe minimum FC — below it algae risk climbs. TFP minimum ratio: 7.5% of
    // CYA for manual pools, 5% for salt (SWG).
    minFC(cya, salt) {
      const c = cya == null ? CHEM_RANGES.stabilizer.ideal : cya;
      return Math.max(1, Math.round((salt ? 0.05 : 0.075) * c * 10) / 10);
    },
    // Predicted free-chlorine loss (ppm/day): sun (UV ÷ CYA buffer) + a
    // temperature-driven organic/bather term, mostly blocked by a cover.
    dailyLoss(cya, uvIndex, temp, covered) {
      const uv = uvIndex == null ? 5 : uvIndex;
      const wt = temp == null ? 24 : temp;
      const uvLoss = 3.0 * (uv / 6) * this.uvProtection(cya);
      const bioLoss = 0.5 * Math.pow(1.5, (wt - 25) / 10);
      const loss = covered ? bioLoss + uvLoss * 0.25 : uvLoss + bioLoss;
      return Math.max(0.2, loss);
    },
    // Recommended CYA band — higher for salt pools (the cell makes chlorine
    // continuously, so it needs more UV protection).
    cyaBand(salt) { return salt ? CYA_SALT : { min: CHEM_RANGES.stabilizer.min, max: CHEM_RANGES.stabilizer.max, ideal: CHEM_RANGES.stabilizer.ideal }; },
    // Grams of a product needed to raise FC by ΔFC in a given volume.
    // 1 g of available chlorine per m³ ≈ 1 ppm, so grams = m³·ΔFC ÷ active%.
    gramsForFC(volM3, deltaFC, active) {
      if (!volM3 || deltaFC <= 0 || !active) return 0;
      return (volM3 * deltaFC) / active;
    },
  };
  // Upcoming sun/heat from the forecast — this is what makes the interval
  // adaptive (a heatwave pulls the next check sooner; a cool spell pushes it out).
  function forecastDrivers() {
    const d = window.Weather && Weather.data;
    if (!d || !d.daily || !d.daily.uv_index_max) return null;
    const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
    const uvs = d.daily.uv_index_max.slice(0, 3).filter((x) => x != null);
    const temps = (d.daily.temperature_2m_max || []).slice(0, 3).filter((x) => x != null);
    if (!uvs.length) return null;
    return { uv: avg(uvs), temp: avg(temps) };
  }
  // Measured FC decay between the two most recent readings (per pool), used to
  // self-calibrate the model. Null if a dose clearly happened (FC went up) or
  // the gap is too short/long to trust.
  function observedLoss(p) {
    const rs = Store.readingsFor(p.id).filter((r) => r.chlorine != null); // newest first
    if (rs.length < 2) return null;
    const [newer, older] = rs;
    const days = (new Date(newer.at).getTime() - new Date(older.at).getTime()) / 864e5;
    if (days < 0.5 || days > 14) return null;
    const drop = older.chlorine - newer.chlorine;
    if (drop <= 0) return null;
    return drop / days;
  }

  // Unique residence stops (Maps queries) for pools with work this week.
  const servicedToday = (poolId) => Store.servicedOn(poolId, todayISO());

  // ---------- router ----------
  const routes = {
    '': viewToday, 'today': viewToday, 'pools': viewPools, 'pool': viewPool,
    'schedule': viewSchedule, 'map': viewMap, 'weather': viewWeather, 'log': viewLog, 'settings': viewSettings,
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

  // Per-route scroll memory: tapping a pool then returning (back button OR the
  // bottom tab) keeps your place in the list; in-place edits don't jump to top.
  const scrollMem = {};
  const hashKey = () => location.hash || '#/today';
  window.addEventListener('scroll', () => { scrollMem[hashKey()] = window.scrollY; }, { passive: true });

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
    window.scrollTo(0, scrollMem[hashKey()] || 0);
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
  const TREAT_GRACE_H = 24;      // default 🔵 "en cours" grace (choc/pH: read next day); slow feeds derive from product days
  // Words hinting a chlorine product was applied, for the free-text fallback.
  const CL_NOTE_RE = /\b(stick|galet|chlore|chlor|choc|hypomen|javel|pastille)\b/i;
  // Most recent moment this pool was treated after `sinceISO` (structured
  // treatment, or a note mentioning a product). Null if none.
  function treatedSince(p, sinceISO) {
    const since = new Date(sinceISO).getTime();
    const tr = Store.lastTreatment(p.id);
    if (tr && new Date(tr.at).getTime() > since) return tr.at;
    const n = Store.notesFor(p.id).find((x) => new Date(x.at).getTime() > since && CL_NOTE_RE.test(x.text || ''));
    return n ? n.at : null;
  }
  function poolStatus(p) {
    if (!hasPool(p)) return { level: 'none', reason: 'na' };
    const r = Store.latestReading(p.id);
    const openTodo = Store.notesFor(p.id).some((n) => n.todo && !n.done);
    if (!r) return openTodo ? { level: 'orange', reason: 'todo' } : { level: 'grey', reason: 'nodata' };
    let sev = 0, reason = 'ok';
    // Acute status is driven by the sanitiser + pH only. CYA is a slow lever
    // (its risk shows up via chlorine + the decay estimate), so being off the
    // 30–50 band is advisory in the Chimie panel, not a fleet-wide alert — that
    // was turning nearly every pool orange.
    const critical = (r.chlorine != null && r.chlorine < 0.5) || (r.ph != null && (r.ph < 6.6 || r.ph > 8.0));
    const out = ['ph', 'chlorine'].some((k) => ['low', 'high'].includes(evalMetric(k, r[k]).state));
    if (critical) { sev = 2; reason = 'critical'; } else if (out) { sev = 1; reason = 'out'; }
    const days = (Date.now() - new Date(r.at).getTime()) / 864e5;
    if (days > CHECK_OVERDUE_DAYS && sev < 2) { sev = 2; reason = 'overdue'; }
    else if (days > CHECK_DUE_DAYS && sev < 1) { sev = 1; reason = 'due'; }
    if (openTodo && sev < 1) { sev = 1; reason = 'todo'; }
    // Dosed since the last test → its own "en cours" state (distinct colour) —
    // but only for a grace window keyed to the *product*: slow-release feeds
    // (stick/galet) are meant to trickle, so grace ≈ half their action window;
    // fast products (choc, pH) settle by the next day. After that, with no
    // re-test, it becomes a plain 🟠 "reconfirm" nudge (a re-test resolves it
    // either way). A dose on an already-fine pool stays green.
    const treatedAt = sev >= 1 ? treatedSince(p, r.at) : null;
    if (treatedAt) {
      const lastTr = Store.lastTreatment(p.id);
      const prod = lastTr ? productById(lastTr.productId) : null;
      const graceH = prod && prod.days ? prod.days * 12 : TREAT_GRACE_H;
      if ((Date.now() - new Date(treatedAt).getTime()) / 36e5 < graceH) return { level: 'treated', reason: 'treated' };
      return { level: 'orange', reason: 'retest' };
    }
    return { level: sev === 2 ? 'red' : sev === 1 ? 'orange' : 'green', reason };
  }
  const STATUS_COLOR = { green: '#1b9e4b', orange: '#d98b00', red: '#d12f2f', treated: '#2f7ec4', grey: '#8a98a4', none: '#8a98a4' };
  const statusColor = (lv) => STATUS_COLOR[lv] || STATUS_COLOR.grey;
  const statusDot = (p) => `<span class="status-dot" style="background:${statusColor(poolStatus(p).level)}"></span>`;
  // Points to plot: a pin per pool that has its own GPS; else one pin per
  // residence that has coords but no pinned pools.
  function mapPoints() {
    const pts = [];
    const resWithPoolPins = new Set();
    Store.pools().forEach((p) => {
      // only pools we actually maintain get a pin; rental-only units (e.g. the
      // EPP "Lot. Éden Club" lots) stay off the map to keep it clean.
      if (hasPool(p) && p.lat != null && p.lng != null) {
        resWithPoolPins.add(p.res);
        pts.push({ lat: p.lat, lng: p.lng, label: `${p.res} ${p.unit}`, color: statusColor(poolStatus(p).level), maps: poolMapUrl(p), href: `#/pool/${p.id}` });
      }
    });
    Store.residences().forEach((res) => {
      if (res.lat != null && res.lng != null && !resWithPoolPins.has(res.code)) {
        // approximate base pins link to the place name (accurate) rather than the rough coord
        pts.push({ lat: res.lat, lng: res.lng, label: `${res.poi ? '🏬 ' : ''}${res.code} · ${res.name}${res.approx ? ' ~' : ''}`, color: res.poi ? '#00897b' : res.nonPool ? '#6b4ed6' : '#0277bd', maps: res.poi ? coordsQueryUrl(res.lat, res.lng) : mapsUrl(res.mapsQuery) });
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
  // Place a pool's pin precisely by eye on a satellite map (beats a GPS fix).
  async function openMapPicker(p) {
    let L;
    try { L = await loadLeaflet(); } catch (e) { alert(t('geo_error')); return; }
    const ov = el('<div class="map-picker"></div>');
    const bar = el(`<div class="mp-bar">
      <button class="mp-cancel" aria-label="close">✕</button>
      <span class="mp-title">${esc(poolTitle(p))}</span>
      <button class="btn primary mp-save">${esc(t('map_save'))}</button>
    </div>`);
    const mapDiv = el('<div class="mp-map"></div>');
    ov.appendChild(bar); ov.appendChild(mapDiv);
    document.body.appendChild(ov);

    const start = poolCoords(p) || { lat: 45.0, lng: -1.175 };
    const map = L.map(mapDiv).setView([start.lat, start.lng], poolCoords(p) ? 18 : 14);
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Esri' });
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' });
    sat.addTo(map); // default satellite for house-level precision
    L.control.layers({ ['🛰️ ' + t('layer_sat')]: sat, ['🗺️ ' + t('layer_map')]: osm }).addTo(map);
    const icon = L.divIcon({ className: 'mp-pin', html: '📍', iconSize: [34, 34], iconAnchor: [17, 30] });
    const marker = L.marker([start.lat, start.lng], { draggable: true, icon }).addTo(map);
    map.on('click', (e) => marker.setLatLng(e.latlng));
    setTimeout(() => map.invalidateSize(), 80);

    bar.querySelector('.mp-cancel').addEventListener('click', () => ov.remove());
    bar.querySelector('.mp-save').addEventListener('click', () => {
      const ll = marker.getLatLng();
      Store.updatePool(p.id, { lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
      ov.remove();
      render();
    });
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
  // Photo-as-context tile: a labelled reference photo (gate/pool/pit) becomes
  // the backdrop of its own section, with the section's live state overlaid on
  // a scrim. Fuses "photo" + "state" into one compact tile (less scroll) and
  // lets the frame itself carry state between visits (e.g. valve positions in
  // the pit shot). `body` is a DOM node overlaid at the bottom; falls back to a
  // graceful empty tile with a "＋" affordance before any photo is added.
  function photoHero(p, key, body, minH) {
    const ph = window.Photos ? Photos.poolRef(p.id, key) : null;
    const hero = el(`<div class="photo-hero ${ph ? '' : 'empty'}"></div>`);
    if (minH) hero.style.minHeight = minH;
    if (ph) {
      const img = document.createElement('img');
      img.className = 'band-img'; img.loading = 'lazy'; img.src = ph.dataUrl;
      hero.appendChild(img);
      hero.appendChild(el('<div class="hero-scrim"></div>'));
    }
    const ctrls = el('<div class="hero-ctrls"></div>');
    const lab = el(`<label class="hero-cam" title="${esc(t('add_photo'))}">${ph ? '📷' : '＋'}<input type="file" accept="image/*" hidden></label>`);
    lab.querySelector('input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (ph) { try { await Photos.remove(ph.id); } catch (_) {} } // replace = drop old + add new
      try { await Photos.add({ poolId: p.id, label: key }, file); } catch (_) {}
      render();
    });
    ctrls.appendChild(lab);
    if (ph) {
      const del = el('<button class="hero-cam hero-del" title="delete">✕</button>');
      del.addEventListener('click', () => { if (confirm(t('photo_del_confirm'))) { Photos.remove(ph.id); render(); } });
      ctrls.appendChild(del);
    }
    hero.appendChild(ctrls);
    const bodyWrap = el('<div class="hero-body"></div>');
    if (body) bodyWrap.appendChild(body);
    hero.appendChild(bodyWrap);
    return hero;
  }

  // A section whose reference photo underlays its header: the 9:16 photo (capped
  // height) backs a scrim carrying the section-stripe title, with change/delete
  // controls top-right; the section's content sits below in the panel body. No
  // photo yet → a plain navy stripe with a small "add photo" control.
  function photoSection(p, key, titleText, subText, contentNode, opts = {}) {
    const ph = window.Photos ? Photos.poolRef(p.id, key) : null;
    const frag = document.createDocumentFragment();
    if (ph) {
      const band = el('<div class="photo-band"></div>');
      const img = document.createElement('img');
      img.className = 'band-img'; img.loading = 'lazy'; img.src = ph.dataUrl;
      band.appendChild(img);
      band.appendChild(el('<div class="hero-scrim"></div>'));
      if (opts.tint) { const tn = el('<div class="band-tint"></div>'); tn.style.background = `radial-gradient(circle at top right, ${opts.tint}, transparent 60%)`; band.appendChild(tn); }
      const ctrls = el('<div class="hero-ctrls"></div>');
      const lab = el(`<label class="hero-cam" title="${esc(t('add_photo'))}">📷<input type="file" accept="image/*" hidden></label>`);
      lab.querySelector('input').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { await Photos.remove(ph.id); } catch (_) {} // replace = drop old + add
        try { await Photos.add({ poolId: p.id, label: key }, file); } catch (_) {}
        render();
      });
      ctrls.appendChild(lab);
      const del = el('<button class="hero-cam hero-del" title="delete">✕</button>');
      del.addEventListener('click', () => { if (confirm(t('photo_del_confirm'))) { Photos.remove(ph.id); render(); } });
      ctrls.appendChild(del);
      band.appendChild(ctrls);
      // the section content that "slides up" into the photo space (e.g. the
      // chimie mini-bars) sits in the foot, above the title, on the scrim
      const foot = el('<div class="band-foot"></div>');
      if (opts.overlay) foot.appendChild(opts.overlay);
      foot.appendChild(el(`<div class="band-title"><h2>${esc(titleText)}</h2>${subText ? `<p>${esc(subText)}</p>` : ''}</div>`));
      band.appendChild(foot);
      frag.appendChild(band);
    } else {
      const bar = el(`<div class="section-title band-flat"><div><h2>${esc(titleText)}</h2>${subText ? `<p>${esc(subText)}</p>` : ''}</div></div>`);
      const add = el(`<label class="band-add" title="${esc(t('add_photo'))}">📷<input type="file" accept="image/*" hidden></label>`);
      add.querySelector('input').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { await Photos.add({ poolId: p.id, label: key }, file); } catch (_) {}
        render();
      });
      bar.appendChild(add);
      frag.appendChild(bar);
      if (opts.overlay) frag.appendChild(opts.overlay); // no photo → mini-bars sit below the stripe
    }
    if (contentNode) frag.appendChild(contentNode);
    return frag;
  }

  // filling / watering card — extracted so it can live inside the Piscine panel
  function wateringCard(p) {
    const wi = wateringInfo(p);
    const wb = el(`<div class="card watering ${wi ? (wi.overdue ? 'overdue' : 'active') : ''}"></div>`);
    if (wi) {
      wb.appendChild(el(`<p class="water-line">${esc(t('watering_since', { time: fmtTime(p.watering.startedAt), mins: wi.mins }))}</p>`));
      if (wi.reminderMin != null) wb.appendChild(el(`<p class="water-rem">${wi.overdue ? esc(t('reminder_overdue')) : esc(t('reminder_in', { mins: Math.max(0, wi.remainMin) }))}</p>`));
      const stop = el(`<button class="btn danger">${esc(t('stop_watering'))}</button>`);
      stop.addEventListener('click', () => { Store.updatePool(p.id, { watering: null }); render(); });
      wb.appendChild(stop);
    } else {
      const sel = el(`<select class="water-sel">
        <option value="">${esc(t('reminder_none'))}</option>
        <option value="15">15 min</option><option value="30">30 min</option>
        <option value="45">45 min</option><option value="60">60 min</option><option value="90">90 min</option></select>`);
      const row = el(`<label class="field"><span>${esc(t('reminder'))}</span></label>`);
      row.appendChild(sel);
      wb.appendChild(row);
      const start = el(`<button class="btn primary">${esc(t('start_watering'))}</button>`);
      start.addEventListener('click', () => {
        Store.updatePool(p.id, { watering: { startedAt: new Date().toISOString(), reminderMin: sel.value ? +sel.value : null } });
        render();
      });
      wb.appendChild(start);
    }
    return wb;
  }

  // pump & filter card — extracted so it can live inside the Local technique panel
  function pumpCard(p) {
    const pump = el('<div class="card pump"></div>');
    const lb = Store.lastBackwash(p.id);
    pump.appendChild(el(`<p class="pump-line">${esc(t('last_backwash', { date: lb ? fmtDateTime(lb.at) : t('never') }))}</p>`));
    const bwBtn = el(`<button class="btn">${esc(t('log_backwash'))}</button>`);
    bwBtn.addEventListener('click', () => { Store.addVisit(p.id, { type: 'backwash' }); render(); });
    pump.appendChild(bwBtn);
    pump.appendChild(collapsible({
      label: t('sand_date'),
      value: () => p.sandDate ? { text: fmtDate(p.sandDate), empty: false } : { text: t('unknown'), empty: true },
      buildEditor: (box, done) => {
        const inp = el(`<input type="date" class="date-sm" value="${esc(p.sandDate || '')}">`);
        inp.addEventListener('change', () => Store.updatePool(p.id, { sandDate: inp.value }));
        const unk = el(`<button class="btn sm">${esc(t('unknown'))}</button>`);
        unk.addEventListener('click', () => { Store.updatePool(p.id, { sandDate: '' }); done(); });
        const ok = el(`<button class="btn sm">${esc(t('done'))}</button>`);
        ok.addEventListener('click', done);
        const foot = el('<div class="one-shot-foot"></div>');
        const btns = el('<div class="os-btns"></div>'); btns.appendChild(unk); btns.appendChild(ok);
        foot.appendChild(inp); foot.appendChild(btns);
        box.appendChild(foot);
      },
    }));
    const pn = el(`<label class="field"><span>${esc(t('pump_notes'))}</span><textarea rows="2" placeholder="${esc(t('pump_notes_ph'))}"></textarea></label>`);
    pn.querySelector('textarea').value = p.pumpNote || '';
    pn.querySelector('textarea').addEventListener('change', (e) => Store.updatePool(p.id, { pumpNote: e.target.value }));
    pump.appendChild(pn);
    return pump;
  }

  // The closing "done" of the scroll — mark (or unmark) today's service visit.
  function finalServiceTick(p) {
    const doneToday = servicedToday(p.id);
    const box = el('<div class="final-tick"></div>');
    const btn = el(`<button class="btn primary big-tick ${doneToday ? 'done' : ''}">${doneToday ? '✓ ' : ''}${esc(doneToday ? t('service_undo') : t('mark_serviced'))}</button>`);
    btn.addEventListener('click', () => {
      if (doneToday) {
        Store.visitsFor(p.id)
          .filter((v) => (v.type || 'service') === 'service' && Store.localDate(v.at) === todayISO())
          .forEach((v) => Store.deleteVisit(v.id));
      } else {
        Store.addVisit(p.id, { type: 'service' });
      }
      render();
    });
    box.appendChild(btn);
    return box;
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
      const note = Store.addNote({ text, poolId: showPicker ? (fd.get('poolId') || '') : fixedPoolId, todo: !!fd.get('todo'), at, weather: window.Weather && Weather.current() });
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
      <div class="card-row"><span class="note-meta">${fmtDateTime(n.at)} ${tag} ${wxChip(n.weather)}</span>${todoChip}</div>
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
    // edit in place — fix a typo / add a forgotten detail without delete+rewrite
    const edit = el(`<button class="link-act">${esc(t('edit_note'))}</button>`);
    edit.addEventListener('click', () => {
      const textDiv = card.querySelector('.note-text');
      if (!textDiv) return;
      const ta = el('<textarea class="note-edit" rows="2"></textarea>');
      ta.value = n.text;
      const save = el(`<button class="btn primary note-edit-save">${esc(t('note_save'))}</button>`);
      save.addEventListener('click', () => { const v = ta.value.trim(); if (v) Store.updateNote(n.id, { text: v }); render(); });
      textDiv.replaceWith(ta);
      ta.after(save);
      ta.focus();
    });
    actions.appendChild(edit);
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

  // Advisory chemistry read-out for a pool's latest reading: how much chlorine
  // is actually active (pH), the CYA-scaled target, and a forecast-driven
  // estimate of when the next check is due. Read-only for now (the green/orange
  // dots still come from poolStatus); we wire it into the dots once validated.
  // Dose suggestions from the latest reading + pool volume. Correction uses the
  // fast choc (70%) for chlorine and the label rate for pH (one step at a time,
  // always "filter + retest" to avoid the over-shoot that crashed EPP-7).
  // Sticks/galets are shown only as the slow-release maintenance feed.
  function doseLines(p, r, treated) {
    const V = p.volM3;
    if (!V) return [{ cls: 'warn', k: t('chem_dose'), v: t('chem_dose_novol'), h: t('chem_dose_novol_h') }];
    const out = [];
    const fc = r.chlorine, ph = r.ph, cya = r.stabilizer, R = CHEM_RANGES.ph;
    // after a dose, don't advise another correction — retest first (below shows
    // only the maintenance feed). The next-check row flags "traité — à revérifier".
    if (treated) { out.push(maintenanceLine(p)); return out; }
    // pH correction — one label-standard step at a time (never the full gap, to
    // avoid the over-shoot that crashed EPP-7). Shows step size + rounds to target.
    if (ph != null && ph > R.max) {
      const pr = productById('hth-phminus');
      const steps = Math.max(1, Math.ceil((ph - R.max) / (pr.dropPh || 0.2) - 1e-6));
      out.push({ cls: 'warn', k: t('dose_phminus'), v: `~${Math.round(pr.dosePerM3 * V)} g`, h: t('dose_ph_h', { drop: pr.dropPh || 0.2, n: steps, target: R.max }) });
    } else if (ph != null && ph < R.min) {
      const pr = productById('mareva-phplus');
      const steps = Math.max(1, Math.ceil((R.min - ph) / (pr.raisePh || 0.1) - 1e-6));
      out.push({ cls: 'warn', k: t('dose_phplus'), v: `~${Math.round(pr.dosePerM3 * V)} g`, h: t('dose_phplus_h', { rise: pr.raisePh || 0.1, n: steps, target: R.min }) });
    }
    // chlorine correction — fast choc (grams), with the slow stick equivalent
    if (fc != null) {
      const delta = Chem.targetFC(cya, p.salt) - fc;
      if (delta > 0.2) {
        const choc = productById('hypomen-pro'), stick = productById('hth-stick');
        const nStick = Math.max(1, Math.round((V * delta) / (stick.active * stick.grammage)));
        out.push({ cls: fc < 0.5 ? 'bad' : '', k: t('dose_choc'), v: `~${Math.round((V * delta) / choc.active)} g`, h: t('dose_choc_h', { d: delta.toFixed(1), n: nStick }) });
      }
    }
    // stabiliser build — only when CYA is well under the band (in-season the
    // galets top it up; the powder is the winter→spring / direct option).
    const band = Chem.cyaBand(!!p.salt);
    if (cya != null && cya < band.min - 10) {
      const dCya = Math.round(band.min - cya);
      const stab = productById('mareva-cya');
      out.push({ cls: 'warn', k: t('dose_stab'), v: `~${Math.round(dCya * V * (stab.ratePerPpmM3 || 1))} g`, h: t('dose_stab_h', { d: dCya, target: band.min }) });
    }
    out.push(maintenanceLine(p));
    return out;
  }
  // slow-release maintenance feed for a pool's volume (reference line)
  function maintenanceLine(p) {
    const galet = productById('hth-galet'), stick = productById('hth-stick');
    return { cls: '', k: t('dose_maint'), v: `${Math.max(1, Math.round(p.volM3 / galet.coverM3))} galet · ${Math.max(1, Math.round(p.volM3 / stick.coverM3))} stick`, h: t('dose_maint_h', { gd: galet.days, sd: stick.days }) };
  }

  function chemPanel(p, withTitle = true) {
    const r = Store.latestReading(p.id);
    if (!r) return null;
    const cya = r.stabilizer, fc = r.chlorine, ph = r.ph;
    const treatedAt = treatedSince(p, r.at); // dosed since the last test → awaiting re-check
    const rows = el('<div class="chem-rows"></div>');
    const row = (cls, k, v, h) => el(`<div class="chem-row ${cls}">
      <span class="cr-k">${esc(k)}</span><span class="cr-v">${esc(v)}</span><span class="cr-h">${esc(h)}</span></div>`);

    // active chlorine fraction from pH (the HOCl curve) — the priority on salt pools
    const frac = Chem.hoclFraction(ph);
    if (frac != null) {
      const pct = Math.round(frac * 100);
      rows.appendChild(row(pct >= 50 ? 'ok' : pct >= 30 ? 'warn' : 'bad',
        t('chem_active'), pct + '%', t('chem_active_h', { ph })));
    }
    // salt level (salt pools) vs the working band
    if (p.salt) {
      const sb = CHEM_RANGES.salt, sv = r.salt;
      const cls = sv == null ? '' : (sv < sb.min || sv > sb.max) ? 'warn' : 'ok';
      rows.appendChild(row(cls, t('chem_salt'), sv == null ? '—' : sv + ' g/L', t('chem_salt_h', { min: sb.min, max: sb.max })));
    }
    // target FC from CYA
    if (cya != null) {
      const tFC = Chem.targetFC(cya, p.salt), mFC = Chem.minFC(cya, p.salt);
      const cls = fc == null ? '' : fc >= tFC ? 'ok' : fc >= mFC ? 'warn' : 'bad';
      // flag when the target is beyond the DPD test's 2 mg/L ceiling (dilute to read)
      const cibleHint = t('chem_target_fc_h', { cya }) + (tFC > FC_TEST_MAX ? ' · ' + t('fc_over_test') : '');
      rows.appendChild(row(cls, t('chem_target_fc'), tFC, cibleHint));
      // stabiliser vs recommended band (higher for salt pools)
      const band = Chem.cyaBand(!!p.salt);
      const ccls = cya > 100 ? 'bad' : (cya < band.min || cya > band.max) ? 'warn' : 'ok';
      rows.appendChild(row(ccls, t('chem_cya'), cya, t('chem_cya_h', { min: band.min, max: band.max })));
    }
    // predicted daily loss (model, blended with measured decay when available)
    const fd = forecastDrivers();
    const uv = fd ? fd.uv : (r.weather && r.weather.uv);
    const temp = fd ? fd.temp : (r.weather && r.weather.temp);
    const modelLoss = Chem.dailyLoss(cya, uv, temp, !!p.covered);
    const obs = observedLoss(p);
    const loss = obs != null ? (modelLoss + obs) / 2 : modelLoss;
    rows.appendChild(row('', t('chem_decay'), '~' + loss.toFixed(1),
      t('chem_decay_h') + (obs != null ? ' · ' + t('chem_calibrated') : '')));
    // next check — after a dose, the reading is stale: prompt a re-test instead
    // of the predicted due date.
    if (treatedAt) {
      rows.appendChild(row('warn', t('chem_next'), t('status_treated'), t('chem_treated_h', { time: fmtDateTime(treatedAt) })));
    } else if (fc != null && loss > 0) {
      const floor = Chem.minFC(cya, p.salt);
      const dueTime = new Date(r.at).getTime() + ((fc - floor) / loss) * 864e5;
      const daysFromNow = (dueTime - Date.now()) / 864e5;
      let cls, v;
      if (daysFromNow <= 0) { cls = 'bad'; v = t('chem_due_now'); }
      else { cls = daysFromNow < 1.5 ? 'warn' : 'ok'; v = t('chem_due_in', { days: daysFromNow.toFixed(1), date: fmtDate(new Date(dueTime).toISOString().slice(0, 10)) }); }
      rows.appendChild(row(cls, t('chem_next'), v, t('chem_next_h', { floor })));
    }
    // doses from this reading — suppressed after a treatment (retest first)
    if (fc != null || ph != null) {
      rows.appendChild(el(`<div class="chem-sub">${esc(t('dose_title'))}${p.volM3 ? ` · ${p.volM3} m³${p.volEst ? ' (' + esc(t('estimated')) + ')' : ''}` : ''}</div>`));
      doseLines(p, r, !!treatedAt).forEach((d) => rows.appendChild(row(d.cls, d.k, d.v, d.h)));
    }

    const box = el('<div class="chem-panel"></div>');
    if (withTitle) box.appendChild(el(`<div class="section-title"><h2>🧪 ${esc(t('chem_title'))}</h2><p>${esc(t('chem_sub'))}</p></div>`));
    box.appendChild(rows);
    if (p.salt && p.electroNote) box.appendChild(el(`<p class="chem-note">⚡ ${esc(p.electroNote)}</p>`));
    return box;
  }

  // Glanceable chimie: four small vertical stat bars (Cl% · Cl · CyA · /jour),
  // each colour-coded by status. Meant to overlay the piscine photo — compact,
  // read-at-a-glance, the detail/doses one tap away in the panel body.
  function chemMini(p) {
    const r = Store.latestReading(p.id);
    if (!r) return null;
    const cya = r.stabilizer, fc = r.chlorine, ph = r.ph;
    const cells = [];
    const frac = Chem.hoclFraction(ph);
    if (frac != null) {
      const pct = Math.round(frac * 100);
      cells.push({ k: 'Cl%', v: pct + '%', cls: pct >= 50 ? 'ok' : pct >= 30 ? 'warn' : 'bad' });
    }
    if (fc != null) {
      const tFC = cya != null ? Chem.targetFC(cya, p.salt) : null;
      const mFC = cya != null ? Chem.minFC(cya, p.salt) : null;
      const cls = tFC == null ? '' : fc >= tFC ? 'ok' : fc >= mFC ? 'warn' : 'bad';
      cells.push({ k: 'Cl', v: fc, cls });
    }
    if (cya != null) {
      const band = Chem.cyaBand(!!p.salt);
      const cls = cya > 100 ? 'bad' : (cya < band.min || cya > band.max) ? 'warn' : 'ok';
      cells.push({ k: 'CyA', v: cya, cls });
    }
    const fd = forecastDrivers();
    const uv = fd ? fd.uv : (r.weather && r.weather.uv);
    const temp = fd ? fd.temp : (r.weather && r.weather.temp);
    const modelLoss = Chem.dailyLoss(cya, uv, temp, !!p.covered);
    const obs = observedLoss(p);
    const loss = obs != null ? (modelLoss + obs) / 2 : modelLoss;
    cells.push({ k: '/jour', v: '~' + loss.toFixed(1), cls: '' });
    const row = el('<div class="chem-mini"></div>');
    cells.forEach((c) => row.appendChild(el(`<div class="cm-cell ${c.cls}"><span class="cm-v">${esc(String(c.v))}</span><span class="cm-k">${esc(c.k)}</span></div>`)));
    return row;
  }

  // ---------- view: TODAY ----------
  function viewToday() {
    const wrap = document.createElement('div');
    const week = currentWeek();
    wrap.appendChild(header(t('today_title'), t('today_sub', { date: fmtDate(week) })));

    // pools currently filling — the end-of-day "did I leave a hose running?" check
    const filling = Store.wateringPools();
    if (filling.length) {
      wrap.appendChild(sectionTitle(t('watering_today', { n: filling.length })));
      const c = el('<div class="cards"></div>');
      filling.forEach((p) => {
        const wi = wateringInfo(p);
        const card = el(`<a class="card watering ${wi && wi.overdue ? 'overdue' : 'active'}" href="#/pool/${p.id}">
          <div class="card-row"><strong>💧 ${esc(p.res + ' ' + p.unit)}</strong>${wi && wi.overdue ? `<span class="chip st-backup">${esc(t('turn_off_short'))}</span>` : ''}</div>
          <div class="card-sub">${wi ? esc(t('watering_since', { time: fmtTime(p.watering.startedAt), mins: wi.mins })) : ''}</div>
        </a>`);
        c.appendChild(card);
      });
      wrap.appendChild(c);
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

    // "À revoir" — maintained pools not seen today, longest-not-seen first
    // (blind spots on top). A memory-jog, not a route: just what's slipped.
    const revisit = toRevisit();
    wrap.appendChild(sectionTitle(t('revisit_title', { n: revisit.length }), t('revisit_sub')));
    if (revisit.length) {
      const list = el('<div class="cards"></div>');
      revisit.forEach(({ p, last }) => list.appendChild(revisitCard(p, last)));
      wrap.appendChild(list);
    } else wrap.appendChild(emptyNote(t('revisit_empty')));
    return wrap;
  }

  // Most recent "passage" for a pool — any reading, visit (service/backwash/
  // treatment) or note. Null if never logged.
  function lastPassage(poolId) {
    const times = [];
    const r = Store.latestReading(poolId); if (r) times.push(r.at);
    const v = Store.lastVisit(poolId); if (v) times.push(v.at);
    const n = Store.notesFor(poolId); if (n.length) times.push(n[0].at);
    return times.length ? times.reduce((a, b) => (a > b ? a : b)) : null;
  }
  // Maintained pools not seen today, ranked longest-not-seen first (never = top).
  // The list shrinks through the day as each pool gets a passage logged.
  function toRevisit() {
    const today = todayISO();
    return Store.pools().filter(hasPool)
      .map((p) => ({ p, last: lastPassage(p.id) }))
      .filter(({ last }) => !last || Store.localDate(last) !== today)
      .sort((a, b) => (a.last === null ? -1 : b.last === null ? 1 : a.last.localeCompare(b.last)));
  }
  function revisitCard(p, last) {
    const days = last ? Math.round((Date.now() - new Date(last).getTime()) / 864e5) : null;
    const seen = last ? t('seen_ago', { d: days }) : t('seen_never');
    const water = p.watering && p.watering.startedAt ? ' 💧' : '';
    return el(`<a class="card${last ? '' : ' never-seen'}" href="#/pool/${p.id}">
      <div class="card-row"><strong>${statusDot(p)}${esc(poolTitle(p))}${water}</strong><span class="chip ${last ? 'st-empty' : 'st-arriving'}">${esc(seen)}</span></div>
      ${chemPills(Store.latestReading(p.id))}
    </a>`);
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
    const water = p.watering && p.watering.startedAt ? ' 💧' : '';
    return el(`<a class="card" href="#/pool/${p.id}">
      <div class="card-row"><strong>${statusDot(p)}${esc(poolTitle(p))}${water}</strong><span class="chip st-empty">${esc(tag)}</span></div>
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
      const list = Store.poolsByRes(res.code).filter(hasPool); // hide nonPool units
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

    const ps = poolStatus(p);
    const pool = hasPool(p);
    const coords = p.lat != null && p.lng != null;
    const stWord = ps.reason === 'treated' ? t('status_treated') : ps.reason === 'retest' ? t('status_retest') : t('status_' + ps.level);
    const stBadge = pool ? ` · <span class="status-word" style="color:${statusColor(ps.level)}">${esc(stWord)}</span>` : '';
    const saltBadge = p.salt ? ` · <span class="salt-word">🧂 ${esc(t('salt_pool'))}</span>` : '';

    // Itinéraire (external maps) + "placer sur la carte" (manual pin by eye).
    // GPS auto-capture is gone — pins are placed/adjusted by hand. On a gate
    // photo these ride the header overlay; otherwise they sit in the actions row.
    const mkDirections = (cls) => el(`<a class="btn ${cls}" target="_blank" rel="noopener" href="${poolMapUrl(p)}">${esc(t('directions'))}</a>`);
    const mkPick = (cls) => { const b = el(`<button class="btn ${cls}">${esc(t('pick_on_map'))}</button>`); b.addEventListener('click', () => openMapPicker(p)); return b; };

    // The landing header progressively enhances: once a "portail" (gate) photo
    // exists it becomes the backdrop of the title/status with itinéraire +
    // placer-sur-carte overlaid — a visual cue for which gate you're arriving
    // at. Until then it stays the plain slim header (add a gate photo below).
    const gatePhoto = window.Photos ? Photos.poolRef(p.id, 'gate') : null;
    const subHtml = `${esc(res ? res.name : p.res)}${p.type ? ' · ' + esc(p.type) : ''}${stBadge}${saltBadge}`;
    if (gatePhoto) {
      wrap.appendChild(el(`<a class="back back-slim" href="#/pools">${esc(t('back_pools'))}</a>`));
      const headBody = el(`<div class="hero-head">
        <h1>${pool ? statusDot(p) : ''}${esc(poolTitle(p))}</h1>
        <p class="sub">${subHtml}</p>
      </div>`);
      const hact = el('<div class="hero-actions"></div>');
      hact.appendChild(mkDirections('hero-btn'));
      if (pool) hact.appendChild(mkPick('hero-btn hero-btn-sm'));
      headBody.appendChild(hact);
      wrap.appendChild(photoHero(p, 'gate', headBody, '220px')); // taller for 9:16 portraits
    } else {
      wrap.appendChild(el(`<header class="page-head">
        <a class="back" href="#/pools">${esc(t('back_pools'))}</a>
        <h1>${pool ? statusDot(p) : ''}${esc(poolTitle(p))}</h1>
        <p class="sub">${subHtml}</p>
      </header>`));
    }

    if (p.note) wrap.appendChild(el(`<p class="pool-note">ℹ︎ ${esc(p.note)}</p>`));

    // portail add-photo affordance (only when there's no gate hero yet)
    const mkPhotoAdd = (key) => {
      const lab = el(`<label class="btn">📷 ${esc(t('add_photo'))}<input type="file" accept="image/*" hidden></label>`);
      lab.querySelector('input').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { await Photos.add({ poolId: p.id, label: key }, file); } catch (_) {}
        render();
      });
      return lab;
    };
    const actions = el('<div class="actions"></div>');
    if (!gatePhoto) {
      actions.appendChild(mkDirections(''));
      if (pool) actions.appendChild(mkPick(''));
      actions.appendChild(mkPhotoAdd('gate'));
    }
    if (actions.children.length) wrap.appendChild(actions);

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
      const lastV = Store.lastService(p.id);
      if (lastV) wrap.appendChild(el(`<p class="last-serviced">${esc(t('last_serviced', { date: fmtDateTime(lastV.at) }))}</p>`));
    }

    // ===== PORTAIL panel content: occupation, then notes (both up top) =====
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
      // action suggérée — the all-inclusive summary, last of the portail block
      const advice = adviceFor(Store.latestReading(p.id));
      if (advice.length) {
        wrap.appendChild(el(`<div class="advice"><strong>${esc(t('advice_title'))}</strong>
          <ul>${advice.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>`));
      }

      // ===== PISCINE panel — the pool photo carries the glanceable chimie bars
      // (Cl% · Cl · CyA · /jour) with a status-colour corner tint; the full
      // read-out + doses fold away below, then remplissage closes the panel. =====
      const piscineBody = el('<div class="panel-body"></div>');
      const chem = chemPanel(p, false);
      if (chem) {
        const det = el(`<details class="measure"><summary>🧪 ${esc(t('dose_title'))} · ${esc(t('chem_title'))}</summary></details>`);
        det.appendChild(chem);
        piscineBody.appendChild(det);
      }
      const measure = el(`<details class="measure"><summary>➕ ${esc(t('log_reading'))}</summary></details>`);
      measure.appendChild(readingForm(p));
      piscineBody.appendChild(measure);
      // remplissage — last in the piscine panel
      piscineBody.appendChild(sectionTitle(t('watering_section')));
      piscineBody.appendChild(wateringCard(p));
      piscineBody.appendChild(volumeSection(p));
      wrap.appendChild(photoSection(p, 'pool', '🧪 ' + t('chem_title'), t('chem_sub'), piscineBody,
        { overlay: chemMini(p), tint: statusColor(ps.level) + 'cc' }));

      // ===== LOCAL TECHNIQUE panel — the pit photo underlays gestion de pompe. =====
      wrap.appendChild(photoSection(p, 'pit', t('pump_section'), '', pumpCard(p)));

      // ===== Produits ajoutés + Historique — in full at the foot (not collapsed). =====
      wrap.appendChild(sectionTitle(t('treat_section'), t('treat_sub')));
      wrap.appendChild(treatmentSection(p));
      const readings = Store.readingsFor(p.id);
      wrap.appendChild(sectionTitle(t('history', { n: readings.length })));
      wrap.appendChild(readings.length ? readingsTable(p, readings) : emptyNote(t('history_empty')));

      // ===== Final tick — entretenue aujourd'hui, the closing "done". =====
      wrap.appendChild(finalServiceTick(p));
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
      ${p.salt ? `<label class="field"><span>${esc(t('f_salt'))}</span><input name="salt" type="text" inputmode="decimal" autocomplete="off" pattern="[0-9.,]*" placeholder="${CHEM_RANGES.salt.ideal}"></label>` : ''}
      <label class="field"><span>${esc(t('f_note'))}</span><input name="note" type="text" placeholder="${esc(t('note_ph'))}"></label>
      <label class="field"><span>${esc(t('f_when'))}</span><input name="at" type="datetime-local"></label>
      <div class="target-hint">${esc(t('targets', tgt))}${p.salt ? ' · ' + esc(t('target_salt', { min: CHEM_RANGES.salt.min, max: CHEM_RANGES.salt.max })) : ''}</div>
      <div class="target-hint tip">${esc(t('cya_test_tip'))}</div>
      <button class="btn primary" type="submit">${esc(t('save_reading'))}</button>
    </form>`);
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(f);
      const atVal = fd.get('at');
      Store.addReading({
        poolId: p.id, ph: fd.get('ph'), chlorine: fd.get('chlorine'),
        stabilizer: fd.get('stabilizer'), salt: fd.get('salt'), note: fd.get('note'),
        at: atVal ? new Date(atVal).toISOString() : undefined,
        weather: window.Weather && Weather.current(),
      });
      location.hash = '#/pool/' + p.id;
      render();
    });
    return f;
  }

  function numField(name, label) {
    const r = CHEM_RANGES[name];
    // type=text + inputmode=decimal: shows the decimal keypad, accepts any
    // precision and both '.' and ',' (parsed in the store). type=number with a
    // step blocked the decimal key / extra decimals on mobile.
    return `<label class="field"><span>${esc(label)}</span>
      <input name="${name}" type="text" inputmode="decimal" autocomplete="off" pattern="[0-9.,]*" placeholder="${r ? r.ideal : ''}"></label>`;
  }

  function readingsTable(p, readings) {
    const tbl = el(`<table class="readings"><thead><tr>
      <th>${esc(t('th_when'))}</th><th>${esc(t('th_ph'))}</th><th>${esc(t('th_cl'))}</th>
      <th>${esc(t('th_cya'))}</th><th></th></tr></thead><tbody></tbody></table>`);
    const tb = tbl.querySelector('tbody');
    readings.forEach((r) => {
      const tr = el(`<tr>
        <td>${fmtDateTime(r.at)}${r.weather ? ' ' + wxChip(r.weather) : ''}${r.note ? `<div class="cell-note">${esc(r.note)}</div>` : ''}</td>
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

  // parse a decimal that may use a comma (mobile keypads)
  const numDec = (v) => {
    if (v === '' || v == null) return null;
    const n = Number(String(v).replace(',', '.').trim());
    return Number.isFinite(n) ? n : null;
  };
  // ISO → value for a <input type="datetime-local"> (local time, no seconds)
  function toLocalInput(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  // Human label for a logged treatment: unit products show "3× … · 300 g";
  // powders (no grammage) show a dose count "1 dose · …".
  function treatmentLabel(tr) {
    const prod = productById(tr.productId);
    if (!prod) return tr.note || '—';
    const q = tr.qty;
    if (prod.grammage) return `${q ? q + '× ' : ''}${productLabel(prod)} · ${prod.grammage} g`;
    if (prod.unit === 'g') return `${q != null ? q + ' g · ' : ''}${productLabel(prod)}`; // gram-dosed (choc/pH): qty = grams, no plural
    const unit = prod.unit || 'dose';
    return `${q != null ? q + ' ' : ''}${unit}${q > 1 ? 's' : ''} · ${productLabel(prod)}`;
  }

  // Compact field for a rarely-changed value: shows "label : value · [btn]"
  // (value defaults to "inconnue"); tapping reveals an editor that collapses
  // back when done. Keeps low-frequency config small so the daily logging owns
  // the screen space.
  function collapsible({ label, value, buildEditor }) {
    const wrap = el('<div class="os-inline"></div>');
    function summary() {
      wrap.innerHTML = '';
      const v = value();
      const row = el(`<div class="one-shot"><span class="os-k">${esc(label)}</span><span class="os-val ${v.empty ? 'unknown' : ''}">${esc(v.text)}</span></div>`);
      const btn = el(`<button class="btn sm">${esc(v.empty ? t('set') : t('modify'))}</button>`);
      btn.addEventListener('click', () => { wrap.innerHTML = ''; buildEditor(wrap, summary); });
      row.appendChild(btn);
      wrap.appendChild(row);
    }
    summary();
    return wrap;
  }

  // Rough size classes to seed a volume before it's measured (m). Refined by
  // measuring; flagged volEst=true until then.
  const POOL_PRESETS = {
    small:  { l: 8,  w: 4, dmin: 1.2, dmax: 1.5 },   // ≈ 43 m³
    medium: { l: 10, w: 5, dmin: 1.2, dmax: 2.0 },   // ≈ 80 m³
    large:  { l: 12, w: 6, dmin: 1.2, dmax: 2.2 },   // ≈ 122 m³
  };
  const presetVol = (d) => Math.round(d.l * d.w * ((d.dmin + d.dmax) / 2) * 10) / 10;

  // Pool volume — "inconnue · Définir" until set; pick a size class to estimate
  // now, or measure exactly. Estimates are tagged so you know to refine them.
  function volumeSection(p) {
    const card = el('<div class="card volume"></div>');
    card.appendChild(collapsible({
      label: t('vol_section'),
      value: () => p.volM3 != null
        ? { text: t('vol_result', { v: p.volM3 }) + (p.volEst ? ' · ' + t('estimated') : ''), empty: false }
        : { text: t('unknown'), empty: true },
      buildEditor: (box, done) => {
        // quick size presets
        box.appendChild(el(`<div class="os-head">${esc(t('vol_presets'))}</div>`));
        const presets = el('<div class="preset-row"></div>');
        ['small', 'medium', 'large'].forEach((k) => {
          const d = POOL_PRESETS[k], v = presetVol(d);
          const b = el(`<button class="btn sm">${esc(t('size_' + k))} <small>~${v}</small></button>`);
          // full render so the dose block above picks up the new volume live
          b.addEventListener('click', () => { Store.updatePool(p.id, { dims: { ...d }, volM3: v, volEst: true }); render(); });
          presets.appendChild(b);
        });
        box.appendChild(presets);
        // exact measurement
        box.appendChild(el(`<div class="os-head">${esc(t('vol_measure'))} · ${esc(t('vol_sub'))}</div>`));
        const d = p.dims || {};
        const field = (key, label, val) =>
          `<label class="vfield"><span>${esc(label)}</span><input data-k="${key}" type="text" inputmode="decimal" maxlength="5" autocomplete="off" pattern="[0-9.,]*" value="${val != null ? esc(val) : ''}"></label>`;
        box.appendChild(el(`<div class="vgrid">${field('l', t('vol_len'), d.l)}${field('w', t('vol_wid'), d.w)}${field('dmin', t('vol_dmin'), d.dmin)}${field('dmax', t('vol_dmax'), d.dmax)}</div>`));
        const out = el(`<p class="vol-out">${p.volM3 != null ? esc(t('vol_result', { v: p.volM3 })) : esc(t('vol_hint'))}</p>`);
        const recompute = (persist) => {
          const num = (k) => numDec(box.querySelector(`[data-k="${k}"]`).value);
          const l = num('l'), w = num('w'), dmin = num('dmin'), dmax = num('dmax');
          let vol = null;
          if (l && w && (dmin != null || dmax != null)) {
            const depth = ((dmin == null ? dmax : dmin) + (dmax == null ? dmin : dmax)) / 2;
            vol = Math.round(l * w * depth * 10) / 10;
          }
          out.textContent = vol != null ? t('vol_result', { v: vol }) : t('vol_hint');
          if (persist) Store.updatePool(p.id, { dims: { l, w, dmin, dmax }, volM3: vol, volEst: false }); // measured
        };
        box.querySelectorAll('.vgrid input').forEach((inp) => {
          inp.addEventListener('input', () => recompute(false));
          inp.addEventListener('change', () => recompute(true));
        });
        const foot = el('<div class="one-shot-foot"></div>');
        const ok = el(`<button class="btn sm">${esc(t('done'))}</button>`);
        ok.addEventListener('click', () => { recompute(true); render(); }); // render → dose block updates
        foot.appendChild(out); foot.appendChild(ok);
        box.appendChild(foot);
      },
    }));
    return card;
  }

  // "Produits ajoutés": quick-log what was added (stick/galet/pH/choc…) with a
  // quantity, so the colleague sees it and it feeds the predictive status.
  function treatmentSection(p) {
    const box = el('<div class="treat"></div>');
    const qty = el('<input class="treat-qty" type="text" inputmode="decimal" autocomplete="off" pattern="[0-9.,]*" value="1">');
    const qtyWrap = el(`<label class="treat-qtywrap"><span>${esc(t('treat_qty'))}</span></label>`);
    qtyWrap.appendChild(qty);
    box.appendChild(qtyWrap);
    const btns = el('<div class="treat-btns"></div>');
    ['hth-stick', 'hth-galet', 'hypomen-pro', 'hth-phminus', 'mareva-phplus', 'mareva-cya', 'acti-floc']
      .map(productById).filter(Boolean).forEach((prod) => {
        const b = el(`<button class="btn treat-btn"><span>${esc(prod.name)}</span><small>${esc(prod.brand)}</small></button>`);
        b.addEventListener('click', () => {
          Store.addTreatment(p.id, { productId: prod.id, qty: qty.value, weather: window.Weather && Weather.current() });
          render();
        });
        btns.appendChild(b);
      });
    box.appendChild(btns);
    const list = Store.treatmentsFor(p.id).slice(0, 8);
    if (list.length) {
      const ul = el('<div class="treat-list"></div>');
      list.forEach((tr) => {
        const itm = el(`<div class="treat-item"><span class="ti-label">${esc(treatmentLabel(tr))}</span>
          <span class="treat-meta"></span></div>`);
        const meta = itm.querySelector('.treat-meta');
        // tap the time to correct it (e.g. backdate to when you actually dosed)
        const timeBtn = el(`<button class="treat-time" title="${esc(t('edit_time'))}">${esc(fmtDateTime(tr.at))}</button>`);
        timeBtn.addEventListener('click', () => {
          // explicit validate (no commit-on-change): on iOS the wheel fires
          // 'change' on every release, which would close the picker, drop the
          // minutes and jump the page. Commit only when ✓ is tapped.
          const wrap = el('<span class="time-edit"></span>');
          const inp = el(`<input type="datetime-local" class="treat-time-edit" value="${toLocalInput(tr.at)}">`);
          const ok = el(`<button class="time-ok" title="${esc(t('validate'))}">✓</button>`);
          ok.addEventListener('click', () => { if (inp.value) Store.updateVisit(tr.id, { at: new Date(inp.value).toISOString() }); render(); });
          wrap.appendChild(inp); wrap.appendChild(ok);
          timeBtn.replaceWith(wrap);
          inp.focus();
        });
        meta.appendChild(timeBtn);
        if (tr.weather) meta.appendChild(el(`<span>${wxChip(tr.weather)}</span>`));
        const del = el('<button class="link-del">✕</button>');
        del.addEventListener('click', () => { Store.deleteVisit(tr.id); render(); });
        meta.appendChild(del);
        ul.appendChild(itm);
      });
      box.appendChild(ul);
    }
    return box;
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

  // ---------- weather ----------
  function wmo(code) {
    if (code === 0) return { e: '☀️', k: 'wx_clear' };
    if (code <= 3) return { e: '⛅', k: 'wx_cloud' };
    if (code === 45 || code === 48) return { e: '🌫️', k: 'wx_fog' };
    if (code >= 71 && code <= 77) return { e: '🌨️', k: 'wx_snow' };
    if (code === 85 || code === 86) return { e: '🌨️', k: 'wx_snow' };
    if (code >= 95) return { e: '⛈️', k: 'wx_storm' };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { e: '🌧️', k: 'wx_rain' };
    return { e: '🌥️', k: 'wx_unknown' };
  }
  // compact chip for a weather snapshot stamped on a record
  function wxChip(w) {
    if (!w || w.temp == null) return '';
    return `<span class="wx-chip">${wmo(w.code).e} ${Math.round(w.temp)}°${w.hum != null ? ' · ' + Math.round(w.hum) + '%' : ''}</span>`;
  }

  function viewWeather() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('weather_title'), 'Lacanau-Océan'));
    const d = window.Weather && Weather.data;
    if (!d || !d.current) {
      wrap.appendChild(emptyNote(t('wx_loading')));
      if (window.Weather) Weather.load(true);
      return wrap;
    }
    const c = d.current;
    const w = wmo(c.weather_code);
    wrap.appendChild(el(`<div class="card wx-current">
      <div class="wx-temp">${w.e} ${Math.round(c.temperature_2m)}°</div>
      <div class="wx-meta">${esc(t(w.k))} · 💧 ${Math.round(c.relative_humidity_2m)}% · 💨 ${Math.round(c.wind_speed_10m)} km/h · UV ${Math.round(c.uv_index)}</div>
      <div class="wx-updated">${esc(t('wx_updated', { time: fmtTime(d.at) }))}</div>
    </div>`));

    wrap.appendChild(sectionTitle(t('wx_forecast')));
    const daily = d.daily;
    const cards = el('<div class="cards"></div>');
    (daily.time || []).forEach((day, i) => {
      const dw = wmo(daily.weather_code[i]);
      cards.appendChild(el(`<div class="card">
        <div class="card-row"><strong>${fmtDate(day)}</strong><span>${dw.e} ${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</span></div>
        <div class="card-sub">🌧️ ${daily.precipitation_sum[i]} mm · UV ${Math.round(daily.uv_index_max[i])}</div>
      </div>`));
    });
    wrap.appendChild(cards);

    const refresh = el(`<button class="btn">↻ ${esc(t('wx_refresh'))}</button>`);
    refresh.addEventListener('click', () => { Weather.load(true).then(() => render()); });
    wrap.appendChild(refresh);
    Weather.load(false); // background refresh if stale
    return wrap;
  }

  // ---------- view: MAP ----------
  // Colour key for the status dots/pins.
  function statusLegend() {
    const items = [['green', t('status_green')], ['treated', t('leg_treated')], ['orange', t('status_orange')], ['red', t('status_red')], ['grey', t('leg_todo')]];
    const leg = el('<div class="status-legend"></div>');
    items.forEach(([lv, label]) => leg.appendChild(el(`<span class="leg-item"><span class="status-dot" style="background:${statusColor(lv)}"></span>${esc(label)}</span>`)));
    return leg;
  }

  function viewMap() {
    const wrap = document.createElement('div');
    wrap.appendChild(header(t('map_title'), t('map_sub')));
    wrap.appendChild(statusLegend());

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
      const tag = res.poi ? `<span class="chip st-depot">🏬 ${esc(t('depot'))}</span>` : res.nonPool ? `<span class="chip st-mgmt">${esc(t('mgmt_only'))}</span>` : `<span class="chip st-empty">${esc(t('n_pools', { n }))}</span>`;
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

    // date + time in the filename so successive saves sort cleanly and don't
    // collide into "(1)/(2)" (the browser's de-dup of same-named downloads).
    const exportBtn = el(`<button class="btn">${esc(t('export_btn'))}</button>`);
    exportBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-backup-${fileStamp()}.json`, Store.exportJSON(), 'application/json'));

    // data-only backup (no photos) — small enough to share/inspect quickly
    const exportDataBtn = el(`<button class="btn">${esc(t('export_data_btn'))}</button>`);
    exportDataBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-data-${fileStamp()}.json`, Store.exportJSON(false), 'application/json'));

    const csvReadBtn = el(`<button class="btn">${esc(t('export_csv_readings'))}</button>`);
    csvReadBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-readings-${fileStamp()}.csv`, readingsCsv(), 'text/csv'));
    const csvNoteBtn = el(`<button class="btn">${esc(t('export_csv_notes'))}</button>`);
    csvNoteBtn.addEventListener('click', () =>
      downloadFile(`lagrange-piscine-notes-${fileStamp()}.csv`, notesCsv(), 'text/csv'));

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

    const updateBtn = el(`<button class="btn">↻ ${esc(t('update_app'))} · ${APP_VERSION}</button>`);
    updateBtn.addEventListener('click', () => { updateBtn.disabled = true; updateBtn.textContent = t('updating'); forceUpdate(); });

    const box = el('<div class="settings"></div>');
    [logBtn, updateBtn, langRow, exportBtn, exportDataBtn, csvReadBtn, csvNoteBtn, importBtn, importInput, resetBtn].forEach((n) => box.appendChild(n));
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
  window.addEventListener('lp-weather', render);
  if (window.Photos) Photos.init();
  if (window.Weather) Weather.load();
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
      // updateViaCache:'none' → the SW script is always fetched fresh, so new
      // versions are detected reliably (no stale/mixed asset caches).
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      }).catch(() => {});
    });
  }
})();
