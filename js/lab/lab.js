/*
 * Free Lab: the control panel.
 * Three cards (what moves and how fast, the trip, two clocks side by side), each with its own inputs and answers.
 */
'use strict';

class Lab {
  constructor(app) {
    this.app = app; this.viewIdx = 0;
    this.s = { veh: 'rocket', speed: 90, unit: 'pct', time: 1, tunit: 'years', dest: 'd_prox' };
    this.inner = new Journey(app, this.s.veh, this.s.dest);
    this.scene = this.inner.scene; this.camera = this.inner.camera;
  }
  get view() { return this.inner.view; }
  dispose() { this.inner.dispose(); this.app.labBeta = undefined; this.app.labInfo = undefined; }
  start() {
    const a = this.app;
    a.task('labTask'); a.speed({ show: false, max: 0.9995 }); a.primary(null); a.quiz(null);
    a.extra([{ id: 'view', options: ['labV1', 'labV2'], value: this.viewIdx }]);
    a.custom(el => this.buildCalc(el)); a.readouts([]);
    this.apply();
  }
  onLang() { this.app.custom(el => this.buildCalc(el)); }
  onExtra(id, i) {
    if (i === this.viewIdx) return;
    this.viewIdx = i; this.app.extra([{ id: 'view', options: ['labV1', 'labV2'], value: i }]);
    Sfx.whoosh(0.5, i === 1);
    this.app.blink(() => { this.inner.setInside(i === 1); this.app.applyView(); });
  }
  buildCalc(el) {
    const s = this.s, opt = (v, k, cur) => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + t(k) + '</option>';
    const chip = (attr, key, label, on) => '<button type="button" data-' + attr + '="' + key + '" aria-pressed="' + on + '">' + label + '</button>';
    // three separate cards, each with its own question, its own input and its own answers
    const res = rows => '<dl class="res">' + rows.map(r => '<dt class="' + r[1] + '">' + t(r[0]) + '</dt><dd class="' + r[1] + '" data-res="' + r[0] + '"></dd>').join('') + '</dl>';
    el.innerHTML = '<div class="calc">' +
      '<section class="grp"><h4>' + t('grpMove') + '</h4>' +
      '<div class="chips">' + Object.keys(VEHICLES).map(k => chip('veh', k, t(VEHICLES[k].name), k === s.veh)).join('') + '</div>' +
      '<div><label for="lab-speed">' + t('labSpeed') + '</label><div class="row"><input type="number" id="lab-speed" min="0" step="any" value="' + s.speed + '">' +
      '<select id="lab-unit">' + opt('pct', 'u_pct', s.unit) + opt('kms', 'u_kms', s.unit) + opt('kmh', 'u_kmh', s.unit) + opt('ms', 'u_ms', s.unit) + '</select></div>' +
      '<div class="presets">' + [50, 90, 99, 99.99].map(p => '<button type="button" data-pct="' + p + '">' + p + '%</button>').join('') + '</div></div>' +
      '<p class="limit" id="lab-limit"></p>' +
      res([['labG', 'light'], ['labLen', 'rocket'], ['labRed', '']]) + '</section>' +
      '<section class="grp"><h4>' + t('grpTrip') + '</h4><p class="hint">' + t('grpTripHint') + '</p>' +
      '<div class="chips">' + Object.keys(DESTS).map(k => chip('dest', k, t(k), k === s.dest)).join('') + '</div>' +
      res([['tripFar', ''], ['tripE', 'earth'], ['tripV', 'rocket']]) + '</section>' +
      '<section class="grp"><h4>' + t('grpClock') + '</h4><p class="hint">' + t('grpClockHint') + '</p>' +
      '<div><label for="lab-time">' + t('clockIf') + '</label><div class="row"><input type="number" id="lab-time" min="0" step="any" value="' + s.time + '">' +
      '<select id="lab-tunit">' + opt('years', 't_years', s.tunit) + opt('days', 't_days', s.tunit) + opt('hours', 't_hours', s.tunit) + '</select></div></div>' +
      res([['clockV', 'rocket'], ['clockD', 'light']]) + '</section></div>';
    this.resEl = {}; this.resVal = {};
    el.querySelectorAll('[data-res]').forEach(n => { this.resEl[n.dataset.res] = n; });
    const $ = id => el.querySelector('#' + id);
    const read = () => { s.speed = parseFloat($('lab-speed').value) || 0; s.unit = $('lab-unit').value; s.time = parseFloat($('lab-time').value) || 0; s.tunit = $('lab-tunit').value; this.apply(); };
    el.querySelectorAll('input,select').forEach(n => n.addEventListener('input', read));
    el.querySelectorAll('[data-pct]').forEach(n => n.addEventListener('click', () => { $('lab-speed').value = n.dataset.pct; $('lab-unit').value = 'pct'; Sfx.click(); read(); }));
    const press = (attr, key) => el.querySelectorAll('[data-' + attr + ']').forEach(n => n.setAttribute('aria-pressed', n.dataset[attr] === key));
    el.querySelectorAll('[data-veh]').forEach(n => n.addEventListener('click', () => {
      const k = n.dataset.veh; if (k === s.veh) return;
      s.veh = k; press('veh', k); $('lab-speed').value = VEHICLES[k].speed[0]; $('lab-unit').value = VEHICLES[k].speed[1];
      read(); this.inner.setVehicle(k);
    }));
    el.querySelectorAll('[data-dest]').forEach(n => n.addEventListener('click', () => {
      const k = n.dataset.dest; if (k === s.dest) return;
      s.dest = k; press('dest', k);
      this.inner.setDest(k);
    }));
    this.limitEl = $('lab-limit');
  }
  // speed can be typed in m/s, km/s, km/h, or percent of light speed
  apply() {
    const s = this.s;
    let v = Math.max(0, s.speed) * { pct: C / 100, kms: 1000, kmh: 5 / 18, ms: 1 }[s.unit];
    const over = v >= C;
    if (over) v = C * (1 - 1e-12);
    if (this.limitEl) this.limitEl.textContent = over ? t('limit') : '';
    if (over && !this.wasOver) Sfx.wall();
    this.wasOver = over;
    this.b = v / C; this.app.labBeta = this.b;
    this.app.labInfo = { speed: num(Math.max(0, s.speed), s.speed % 1 ? 2 : 0), unit: 'u_' + s.unit };
    this.app.setBeta(Math.min(this.b, 0.9995));
  }
  update(dt) {
    const a = this.app, s = this.s, b = this.b, root = Phys.root(b), lag = Phys.lag(b);
    this.inner.update(dt);
    const T = s.time * { years: YEAR, days: 86400, hours: 3600 }[s.tunit];
    const sup = n => String(n).replace(/[-0-9]/g, ch => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]);
    const sci = x => { const e = Math.floor(Math.log10(x)); return (x / Math.pow(10, e)).toFixed(1) + '×10' + sup(e); };
    const gm1 = lag / root;                                     // γ − 1
    const gamma = b === 0 ? '1' : gm1 < 1e-3 ? '1 + ' + sci(gm1) : num(1 + gm1, gm1 > 99 ? 0 : 3);
    const shrink = x => { for (const [u, k] of [['m', 1], ['mm', 1e-3], ['µm', 1e-6], ['nm', 1e-9], ['pm', 1e-12], ['fm', 1e-15]]) if (x >= k) return num(x / k, 1) + ' ' + u; return x.toExponential(1) + ' m'; };
    const len = b === 0 ? '100 m' : lag < 1e-4 ? '100 m − ' + shrink(100 * lag) : root < 0.01 ? shrink(100 * root) : num(100 * root, 2) + ' m';
    const trip = b > 0 ? Phys.trip(DESTS[s.dest].ls, b) : null;
    const w = 650 / Math.sqrt((1 + b) / (1 - b));
    // "a little less than": when the two clocks barely differ, show the Earth figure minus the gap, so the gap is not lost in rounding
    const onBoard = total => b === 0 ? fmtDuration(total) : lag < 1e-3 ? fmtDuration(total) + t('less') + fmtDuration(total * lag) : fmtDuration(total * root);
    const put = (k, v) => { if (this.resEl && this.resEl[k] && this.resVal[k] !== v) { this.resVal[k] = v; this.resEl[k].innerHTML = v; } };
    put('labG', '<bdi>' + gamma + '</bdi>');
    put('labLen', '<bdi>' + len + '</bdi>');
    put('labRed', '<span style="color:' + (w >= 380 ? css(waveRGB(w)) : 'inherit') + '">' + t(waveName(w)) + '</span>');
    put('tripFar', farText(s.dest));
    put('tripE', trip ? fmtDuration(trip.earth) : t('never'));
    put('tripV', trip ? onBoard(trip.earth) : t('never'));
    put('clockV', onBoard(T));
    put('clockD', fmtDuration(T * lag));
  }
}
