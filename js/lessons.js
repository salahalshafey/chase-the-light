/*
 * Lessons: before each mission the loading curtain offers a short lesson, a few slides that show the idea the mission is built on.
 * Each slide is a heading and a paragraph from strings.js (l_<mission>_<n>h and l_<mission>_<n>) and a small animation on a 2D canvas.
 * Some slides add a speed slider, so the player can try the idea out before the mission asks for it.
 * Drawings use a fixed 600 × 300 space scaled to the canvas. Colours follow the game: teal = Earth/Omar, coral = Sara, yellow = light.
 */
'use strict';

const Lesson = (() => {
  const W = 600, H = 300, TAU = Math.PI * 2;
  const COL = { light: '#ffd84a', earth: '#48d9c2', rocket: '#ff7d6e', ship: '#9a6cff', ink: '#eef0ff', dim: '#a9b1e0', good: '#7fe79b' };
  const el = id => document.getElementById(id);
  let fs = 1;                       // text grows a little on small canvases so it stays readable on a phone

  // ---------- drawing helpers ----------
  const rgba = (col, a) => {
    let r, g, b;
    if (Array.isArray(col)) [r, g, b] = col.map(v => Math.round(v * 255));
    else { const n = parseInt(col.slice(1), 16); r = n >> 16; g = n >> 8 & 255; b = n & 255; }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  };
  const STARS = (() => { let s = 11; const r = () => (s = s * 16807 % 2147483647) / 2147483647; return Array.from({ length: 80 }, () => [r() * W, r() * H, 0.15 + r() * 0.5]); })();
  function sky(c) {
    c.fillStyle = '#070b24'; c.fillRect(0, 0, W, H);
    for (const [x, y, a] of STARS) { c.fillStyle = 'rgba(220,226,255,' + a.toFixed(2) + ')'; c.fillRect(x, y, 1.5, 1.5); }
  }
  function glow(c, x, y, r, col) {
    const g = c.createRadialGradient(x, y, 0, x, y, r * 3);
    g.addColorStop(0, '#fff'); g.addColorStop(0.25, rgba(col, 1)); g.addColorStop(0.55, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 3, 0, TAU); c.fill();
  }
  // o: col, size, w (weight), align, ltr (keeps formulas and numbers in left-to-right order in Arabic too)
  function text(c, s, x, y, o = {}) {
    c.font = (o.w || 500) + ' ' + ((o.size || 13) * fs).toFixed(1) + 'px "Readex Pro", "Segoe UI", system-ui, sans-serif';
    c.fillStyle = o.col || COL.dim; c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
    c.direction = o.ltr || LANG !== 'ar' ? 'ltr' : 'rtl';
    c.fillText(s, x, y);
  }
  function line(c, pts, col, w = 2, dash) {
    c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath();
    pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.stroke(); c.setLineDash([]);
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function person(c, x, y, col, k = 1) {          // feet at (x, y)
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y - 21 * k, 6 * k, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(x - 8 * k, y); c.quadraticCurveTo(x - 8 * k, y - 13 * k, x, y - 13 * k); c.quadraticCurveTo(x + 8 * k, y - 13 * k, x + 8 * k, y); c.closePath(); c.fill();
  }
  // o.dir: 1 = nose to the right; o.squash: length contraction; o.flame: 0..1
  function rocket(c, x, y, len, h, col, o = {}) {
    const L = len / 2, n = Math.min(h * 0.95, len * 0.32);
    c.save(); c.translate(x, y); c.scale((o.dir || 1) * (o.squash || 1), 1);
    if (o.flame) {
      const f = 16 + 30 * o.flame, g = c.createLinearGradient(-L, 0, -L - f, 0);
      g.addColorStop(0, 'rgba(255,232,150,.95)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-L, -h * 0.3); c.lineTo(-L - f, 0); c.lineTo(-L, h * 0.3); c.fill();
    }
    c.fillStyle = col;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-L + len * 0.25, s * h / 2); c.lineTo(-L - 2, s * h * 0.95); c.lineTo(-L - 2, s * h / 2); c.closePath(); c.fill(); }
    c.fillStyle = '#e3e6f2';
    c.beginPath(); c.moveTo(-L, -h / 2); c.lineTo(L - n, -h / 2); c.quadraticCurveTo(L - n * 0.1, -h / 2, L, 0);
    c.quadraticCurveTo(L - n * 0.1, h / 2, L - n, h / 2); c.lineTo(-L, h / 2); c.closePath(); c.fill();
    c.fillStyle = col; c.fillRect(-L, -h / 2, len * 0.12, h);
    c.fillStyle = '#1b2a5c'; c.strokeStyle = col; c.lineWidth = Math.max(1.5, h * 0.08);
    c.beginPath(); c.arc(L - n - h * 0.05, 0, h * 0.2, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }
  function earth(c, x, y, r) {
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#8fd8ff'); g.addColorStop(0.55, '#2a6fd0'); g.addColorStop(1, '#0c2766');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    c.fillStyle = 'rgba(80,190,120,.75)';
    c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.15, r * 0.35, r * 0.22, 0.6, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x + r * 0.35, y + r * 0.3, r * 0.25, r * 0.35, -0.3, 0, TAU); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(140,210,255,.4)'; c.lineWidth = Math.max(2, r * 0.06); c.beginPath(); c.arc(x, y, r + 2, 0, TAU); c.stroke();
  }
  // a light clock: two mirrors and the flash between them. ph counts crossings, and each crossing is one tick.
  const bounce = (ph, top, bot) => { const k = Math.floor(ph), f = ph - k; return k % 2 ? top + f * (bot - top) : bot - f * (bot - top); };
  function lightClock(c, x, top, bot, col, ph, w = 56) {
    const k = Math.floor(ph), f = ph - k, hit = ph >= 1 && f < 0.22 ? 1 - f / 0.22 : 0;
    c.strokeStyle = 'rgba(190,220,255,.18)'; c.lineWidth = 1.5; c.strokeRect(x - w * 0.4, top, w * 0.8, bot - top);
    for (const [y, lit, cap] of [[top, k % 2 ? hit : 0, -7], [bot, k % 2 ? 0 : hit, 3]]) {
      if (lit) glow(c, x, y, 10 * lit, COL.light);
      c.fillStyle = '#dfe4f2'; c.fillRect(x - w / 2, y - 3, w, 6);
      c.fillStyle = col; c.fillRect(x - w / 2, y + cap, w, 4);
    }
    glow(c, x, bounce(ph, top, bot), 5, COL.light);
  }
  function card(c, x, y, title, value, col) {
    rr(c, x - 100, y - 38, 200, 76, 14); c.fillStyle = 'rgba(255,255,255,.05)'; c.fill();
    c.strokeStyle = rgba(col, 0.5); c.lineWidth = 1.5; c.stroke();
    text(c, title, x, y - 17, { size: 12 }); text(c, value, x, y + 12, { col, size: 24, w: 600 });
  }
  function dial(c, x, y, r, turn, col) {
    c.fillStyle = 'rgba(255,255,255,.04)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = rgba(col, 0.7); c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * TAU / 10;
      line(c, [[x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8], [x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93]], rgba(col, 0.8), 2);
    }
    const a = -Math.PI / 2 + turn * TAU;
    if (turn > 0) { c.fillStyle = rgba(col, 0.18); c.beginPath(); c.moveTo(x, y); c.arc(x, y, r * 0.75, -Math.PI / 2, a); c.closePath(); c.fill(); }
    line(c, [[x, y], [x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72]], col, 3.5);
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
  }
  function ruler(c, x0, x1, y, label, col) {
    line(c, [[x0, y], [x1, y]], col, 2); line(c, [[x0, y - 6], [x0, y + 6]], col, 2); line(c, [[x1, y - 6], [x1, y + 6]], col, 2);
    text(c, label, (x0 + x1) / 2, y + 16, { col, size: 13, w: 600 });
  }
  function garage(c, x, len, y, shut) {            // floor at y; the doors drop when shut
    const h = 46, x0 = x - len / 2, x1 = x + len / 2;
    c.fillStyle = 'rgba(72,217,194,.08)'; c.fillRect(x0, y - h, len, h);
    line(c, [[x0 - 6, y], [x1 + 6, y]], COL.earth, 3); line(c, [[x0 - 6, y - h], [x1 + 6, y - h]], COL.earth, 3);
    for (const dx of [x0, x1]) line(c, [[dx, y - h], [dx, shut ? y : y - h + 8]], shut ? COL.light : COL.earth, shut ? 3.5 : 3);
    text(c, t('garage'), x, y - h - 12, { col: COL.earth, size: 11 });
  }
  function proton(c, x, y, r, squash, col) {
    c.save(); c.translate(x, y); c.scale(squash, 1);
    const g = c.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, col); g.addColorStop(1, rgba(col, 0.25));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(16,22,63,.75)';
    for (const [qx, qy] of [[-0.3, -0.25], [0.32, -0.15], [0, 0.35]]) { c.beginPath(); c.arc(qx * r, qy * r, r * 0.12, 0, TAU); c.fill(); }
    c.restore();
  }
  function bolt(c, x, y0, y1, seed, a) {
    let s = seed * 7919 % 233280;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280 - 0.5, n = 7, pts = [];
    for (let i = 0; i <= n; i++) pts.push([x + (i && i < n ? r() * 26 : 0), y0 + (y1 - y0) * i / n]);
    c.save(); c.shadowColor = COL.light; c.shadowBlur = 14;
    line(c, pts, rgba(COL.light, a), 3.5); line(c, pts, rgba('#ffffff', a), 1.4);
    c.restore();
  }
  function train(c, x0, x1, y) {                   // a carriage from x0 to x1 with its roof at y
    const h = 34;
    rr(c, x0, y, x1 - x0, h, 8); c.fillStyle = '#c9cfe2'; c.fill();
    c.fillStyle = COL.rocket; c.fillRect(x0 + 4, y + h - 9, x1 - x0 - 8, 4);
    c.fillStyle = '#25336b';
    for (let x = x0 + 12; x < x1 - 26; x += 26) { rr(c, x, y + 7, 16, 12, 3); c.fill(); }
    c.fillStyle = '#4a5070';
    for (let x = x0 + 16; x < x1 - 8; x += 44) { c.beginPath(); c.arc(x, y + h + 3, 4, 0, TAU); c.fill(); }
  }
  // what a person has seen of the two flashes so far, in the mission's words; arr = [rear, front] arrival times
  const saw = ([r, f]) => r === null && f === null ? t('sawNone')
    : r !== null && f !== null ? (Math.abs(r - f) < 0.03 ? t('sawBoth') : f < r ? t('sawFR') : t('sawR') + ' → ' + t('sawF'))
    : f !== null ? t('sawF') : t('sawR');
  const shortName = w => t(waveName(w)).split(' (')[0];
  const ring = (c, x, y, r, col, a) => { c.strokeStyle = rgba(col, a); c.lineWidth = 2; c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.stroke(); };
  function badge(c, x, y, s) {
    c.fillStyle = COL.light; c.beginPath(); c.arc(x, y, 11, 0, TAU); c.fill();
    text(c, s, x, y + 1, { col: '#201a00', size: 13, w: 600, ltr: true });
  }

  // ---------- the slides ----------
  // draw(c, s, b): s keeps the slide's own state (s.t = seconds since it started, s.dt = this frame), b = the slider's speed.
  // speed: shows the slider with this starting value (min / max optional). keep: moving the slider does not restart the drawing.
  const SLIDES = {
    m1: [
      { draw(c, s) {                                 // light could circle the Earth 7.5 times in one second
        sky(c);
        const T = 4, p = s.t % (T + 1.6), sec = Math.min(1, p / T), laps = sec * 7.5, a = -Math.PI / 2 + laps * TAU, cx = 300, cy = 150, R = 100;
        c.setLineDash([3, 7]); c.strokeStyle = 'rgba(255,216,74,.25)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke(); c.setLineDash([]);
        earth(c, cx, cy, 60);
        for (let i = 0; i < 26 && i * 0.08 < laps * TAU; i++) {
          const a1 = a - i * 0.08;
          c.strokeStyle = rgba(COL.light, 0.85 * (1 - i / 26)); c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, R, a1 - 0.085, a1); c.stroke();
        }
        glow(c, cx + R * Math.cos(a), cy + R * Math.sin(a), 5, COL.light);
        text(c, t('secs', { n: sec.toFixed(2) }), cx, 24, { col: COL.light, size: 20, w: 600 });
        text(c, t('lLaps', { n: laps.toFixed(1) }), cx, 276, { col: COL.ink, size: 15 });
      } },
      { draw(c, s) {                                 // a light clock at rest
        sky(c);
        const top = 60, bot = 240, ph = s.t * 1.1;
        lightClock(c, 300, top, bot, COL.earth, ph, 90);
        text(c, t('lMirror'), 238, top, { align: 'right' }); text(c, t('lMirror'), 238, bot, { align: 'right' });
        text(c, Math.floor(ph) + ' ' + t('ticks'), 455, 150, { col: COL.light, size: 22, w: 600 });
      } },
      { speed: 0.6, draw(c, s, b) {                  // a moving light clock beside one at rest
        const top = 70, bot = 225, gap = bot - top, cp = 150, root = Math.sqrt(1 - b * b);
        if (s.x === undefined) { s.x = 210; s.trail = []; s.o = 0; s.r = 0; }
        s.o += s.dt * cp / gap; s.r += s.dt * cp * root / gap; s.x += s.dt * cp * b;
        if (s.x > 555) { s.x = 210; s.trail = []; }
        sky(c);
        line(c, [[150, 28], [150, 272]], 'rgba(190,200,255,.18)', 1, [4, 6]);
        lightClock(c, 75, top, bot, COL.earth, s.o);
        s.trail.push([s.x, bounce(s.r, top, bot)]); if (s.trail.length > 700) s.trail.shift();
        if (s.trail.length > 1) line(c, s.trail, rgba(COL.light, 0.5), 2);
        lightClock(c, s.x, top, bot, COL.rocket, s.r);
        text(c, t('omar'), 75, 42, { col: COL.earth, size: 14, w: 600 });
        text(c, Math.floor(s.o) + ' ' + t('ticks'), 75, 256, { col: COL.earth, size: 15, w: 600 });
        text(c, t('sara'), s.x, 42, { col: COL.rocket, size: 14, w: 600 });
        text(c, Math.floor(s.r) + ' ' + t('ticks'), s.x, 256, { col: COL.rocket, size: 15, w: 600 });
      } }
    ],
    m2: [
      { draw(c, s) {                                 // a light-year: light crossing to Proxima Centauri
        sky(c);
        const x0 = 70, x1 = 530, D = 4.24, y = 150, yrs = Math.min(D, (s.t % 7.5) * 0.9), x = x0 + (x1 - x0) * yrs / D;
        line(c, [[x0, y], [x1, y]], 'rgba(190,200,255,.25)', 1.5, [3, 6]);
        for (let k = 1; k <= 4; k++) {
          const mx = x0 + (x1 - x0) * k / D;
          line(c, [[mx, y - 7], [mx, y + 7]], 'rgba(190,200,255,.5)', 1.5);
          text(c, t('ly', { n: k }), mx, y + 26, { size: 12 });
        }
        line(c, [[x0, y], [x, y]], rgba(COL.light, 0.55), 2.5);
        glow(c, x0, y, 15, '#ffcf5a'); glow(c, x1, y, 8, '#ff6a3a');
        if (yrs < D) glow(c, x, y, 5, COL.light);
        text(c, t('d_sun'), x0, y - 50, { col: COL.ink }); text(c, t('d_prox'), x1 - 10, y - 40, { col: COL.ink });
        text(c, t('yrs', { n: yrs.toFixed(1) }), 300, 62, { col: COL.light, size: 22, w: 600 });
      } },
      { speed: 0.8, min: 0.1, max: 0.999, draw(c, s, b) {    // two calendars for one trip
        sky(c);
        const x0 = 70, x1 = 530, y = 175, D = 4.24, root = Math.sqrt(1 - b * b), Te = D / b, Tr = Te * root, dur = Math.min(12, Te * 0.7);
        if (s.t > dur + 2) s.t = 0;
        const f = Math.min(1, s.t / dur);
        line(c, [[x0, y], [x1, y]], 'rgba(190,200,255,.25)', 1.5, [3, 6]);
        earth(c, x0, y, 18); glow(c, x1, y, 8, '#ff6a3a');
        text(c, t('d_prox'), x1, y + 34, { size: 12 });
        rocket(c, x0 + 34 + (x1 - x0 - 68) * f, y, 46, 15, COL.rocket, { squash: root, flame: f < 1 ? 0.5 + 0.5 * b : 0 });
        card(c, 170, 62, t('earthL'), t('yrs', { n: (f * Te).toFixed(1) }), COL.earth);
        card(c, 430, 62, t('sara'), t('yrs', { n: (f * Tr).toFixed(1) }), COL.rocket);
        text(c, t('m2r3') + ' ' + Math.round(root * 100) + '%', 300, 262, { col: COL.ink, size: 13 });
      } },
      { draw(c, s) {                                 // the round trip at 80% of light speed to a star 4 light-years away
        sky(c);
        const x0 = 70, x1 = 525, y = 172, T = 8, E = Math.min(10, (s.t % (T + 3)) / T * 10), out = E < 5;
        const k = out ? E / 5 : 2 - E / 5, x = x0 + 44 + (x1 - x0 - 74) * k;
        line(c, [[x0, y], [x1, y]], 'rgba(190,200,255,.2)', 1.5, [3, 6]);
        earth(c, x0, y, 20); glow(c, x1, y, 9, '#9fc4ff');
        person(c, x0, 262, COL.earth, 1.1);
        rocket(c, x, y, 40, 14, COL.rocket, { dir: out ? 1 : -1, squash: 0.6, flame: E > 0 && E < 10 && Math.abs(E - 5) > 0.15 ? 0.8 : 0 });
        if (E > 4.5 && E < 5.8) text(c, t('lTurn'), x1 - 20, y + 40, { col: COL.light, size: 13, w: 600 });
        card(c, 170, 62, t('omar') + ' · ' + t('age'), (10 + E).toFixed(1), COL.earth);
        card(c, 430, 62, t('sara') + ' · ' + t('age'), (10 + 0.6 * E).toFixed(1), COL.rocket);
        if (E >= 10) text(c, t('lApart', { n: 4 }), 300, 250, { col: COL.light, size: 18, w: 600 });
      } }
    ],
    m3: [
      { draw(c, s) {                                 // two clocks, one ticking at 60% of the other's pace
        sky(c);
        const n = Math.min(10, (s.t % 7.5) * 2), m = n * 0.6;
        dial(c, 170, 138, 70, n / 10, COL.earth); dial(c, 430, 138, 70, m / 10, COL.ship);
        text(c, t('omar'), 170, 40, { col: COL.earth, size: 14, w: 600 }); text(c, t('mystery'), 430, 40, { col: COL.ship, size: 14, w: 600 });
        text(c, n.toFixed(1) + ' ' + t('ticks'), 170, 236, { col: COL.earth, size: 16, w: 600 });
        text(c, m.toFixed(1) + ' ' + t('ticks'), 430, 236, { col: COL.ship, size: 16, w: 600 });
        if (n >= 10) text(c, '6 ÷ 10 = 0.6   →   v = 80% c', 300, 276, { col: COL.light, size: 17, w: 600, ltr: true });
      } },
      { speed: 0.8, max: 0.99, draw(c, s, b) {       // the right-angled triangle inside the light clock
        sky(c);
        const root = Math.sqrt(1 - b * b), L = 205, ax = 95, ay = 252, bx = ax + L * b, cy = ay - L * root;
        line(c, [[ax, ay], [bx, ay]], COL.earth, 4); line(c, [[bx, ay], [bx, cy]], COL.rocket, 4);
        if (b > 0.06 && root > 0.06) line(c, [[bx - 12, ay], [bx - 12, ay - 12], [bx, ay - 12]], 'rgba(238,240,255,.6)', 1.5);
        line(c, [[ax, ay], [bx, cy]], COL.light, 3);
        const p = (s.t * 0.6) % 1; glow(c, ax + (bx - ax) * p, ay + (cy - ay) * p, 5, COL.light);
        text(c, 'v/c = ' + b.toFixed(2), (ax + bx) / 2, ay + 22, { col: COL.earth, size: 15, w: 600, ltr: true });
        text(c, 't′/t = ' + root.toFixed(2), bx + 12, (ay + cy) / 2, { col: COL.rocket, size: 15, w: 600, align: 'left', ltr: true });
        text(c, '1', (ax + bx) / 2 - 16, (ay + cy) / 2 - 8, { col: COL.light, size: 18, w: 600, ltr: true });
        text(c, b.toFixed(2) + '² + ' + root.toFixed(2) + '² = 1', 455, 48, { col: COL.ink, size: 20, w: 600, ltr: true });
      } },
      { draw(c, s) {                                 // muons: the same muons, with and without slow time
        const top = 46, ground = 258, cols = [150, 450], mean = [11, 168], v = 110;
        if (!s.mu) { s.mu = []; s.next = 0; s.n = [0, 0]; s.land = [0, 0]; }
        s.next -= s.dt;
        if (s.next <= 0) {
          s.next = 0.22;
          const x = Math.random() * 210 - 105, u = -Math.log(1 - Math.random());
          for (let k = 0; k < 2; k++) { s.mu.push({ k, x: cols[k] + x, y: top, life: u * mean[k], dead: -1 }); s.n[k]++; }
        }
        for (const u of s.mu) {
          if (u.dead >= 0) { u.dead += s.dt; continue; }
          u.y += v * s.dt;
          if (u.y - top >= u.life) u.dead = 0;
          else if (u.y >= ground) { u.y = ground; u.dead = 0; u.landed = true; s.land[u.k]++; }
        }
        s.mu = s.mu.filter(u => u.dead < 0.5);
        sky(c);
        for (const k of [0, 1]) {
          const x0 = cols[k] - 125, g = c.createLinearGradient(0, top, 0, ground);
          g.addColorStop(0, 'rgba(40,60,140,.25)'); g.addColorStop(1, 'rgba(90,150,230,.35)');
          c.fillStyle = g; c.fillRect(x0, top - 8, 250, ground - top + 8);
          c.fillStyle = '#2d4a3a'; c.fillRect(x0, ground, 250, 14);
          text(c, t(k ? 'lRel' : 'lNoRel'), cols[k], 22, { col: k ? COL.light : COL.dim, size: 13, w: 600 });
          text(c, t('lLanded', { n: s.land[k], m: s.n[k] }), cols[k], 287, { col: k ? COL.good : COL.dim, size: 12 });
        }
        for (const u of s.mu) {
          if (u.dead < 0) { line(c, [[u.x, u.y - 14], [u.x, u.y]], rgba(COL.ship, 0.45), 2); glow(c, u.x, u.y, 3, '#c9a8ff'); }
          else ring(c, u.x, u.y, 3 + u.dead * 24, u.landed ? COL.good : '#c9a8ff', 1 - u.dead / 0.5);
        }
      } }
    ],
    m4: [
      { speed: 0.866, draw(c, s, b) {                // the same ship at rest and moving
        sky(c);
        const root = Math.sqrt(1 - b * b), L = 300, cx = 300;
        for (const x of [cx - L / 2, cx + L / 2]) line(c, [[x, 56], [x, 262]], 'rgba(190,200,255,.22)', 1, [3, 5]);
        text(c, t('lAtRest'), cx, 26, { size: 13, w: 600 });
        rocket(c, cx, 78, L, 32, COL.rocket);
        ruler(c, cx - L / 2, cx + L / 2, 117, t('metres', { n: 100 }), COL.light);
        if (b > 0.02) for (let i = 0; i < 12; i++) {
          const y = 178 + (i * 37) % 56, x = 640 - (i * 113 + s.t * 700 * b) % 720;
          line(c, [[x, y], [x + 18 + 50 * b, y]], 'rgba(190,210,255,.3)', 1.5);
        }
        text(c, t('lMoving', { v: pct(b) }), cx, 158, { col: COL.ink, size: 13, w: 600 });
        rocket(c, cx, 203, L, 32, COL.rocket, { squash: root, flame: b > 0.01 ? 0.6 : 0 });
        ruler(c, cx - L * root / 2, cx + L * root / 2, 242, t('metres', { n: Math.round(100 * root) }), COL.light);
      } },
      { draw(c, s) {                                 // who is shorter depends on who measures (at 80% of light speed)
        sky(c);
        const p = (s.t * 160) % 1000 - 200;
        text(c, t('lFromSt'), 300, 18, { col: COL.earth, size: 13, w: 600 });
        garage(c, 300, 160, 112, Math.abs(p - 300) < 20);
        rocket(c, p, 89, 200, 22, COL.rocket, { squash: 0.6, flame: 0.7 });
        line(c, [[20, 146], [580, 146]], 'rgba(190,200,255,.15)', 1);
        text(c, t('lFromShip'), 300, 166, { col: COL.rocket, size: 13, w: 600 });
        garage(c, 600 - p, 96, 262, false);
        rocket(c, 300, 239, 200, 22, COL.rocket, { flame: 0.7 });
      } },
      { draw(c, s) {                                 // protons squashed into pancakes, then a collision
        sky(c);
        const p = s.t % 6.2;
        if (p < 1.6) {
          text(c, t('lAtRest'), 300, 36, { col: COL.ink, size: 14, w: 600 });
          proton(c, 190, 152, 46, 1, COL.rocket); proton(c, 410, 152, 46, 1, COL.earth);
        } else if (p < 3.6) {
          const k = (p - 1.6) / 2, sq = Math.max(0.06, 1 - (p - 1.6) * 2.5), e = k * k;
          text(c, t('lFast'), 300, 36, { col: COL.light, size: 14, w: 600 });
          proton(c, 190 + 104 * e, 152, 46, sq, COL.rocket); proton(c, 410 - 104 * e, 152, 46, sq, COL.earth);
        } else {
          const k = p - 3.6;
          text(c, t('lFast'), 300, 36, { col: COL.light, size: 14, w: 600 });
          if (k < 1) glow(c, 300, 152, 34 * (1 - k), '#ffffff');
          const cs = [COL.light, COL.rocket, COL.earth, '#ffffff'];
          for (let i = 0; i < 48; i++) {
            const a = i * TAU / 48 + Math.sin(i * 7) * 0.2, r = (80 + (i * 37) % 60 * 3) * k, al = Math.max(0, 1 - k / 2.4);
            if (al > 0) glow(c, 300 + Math.cos(a) * r, 152 + Math.sin(a) * r * 0.8, 2, cs[i % 4]);
          }
        }
      } }
    ],
    m5: [
      { draw(c, s) {                                 // colour is wavelength
        sky(c);
        const lam = 550 + 160 * Math.sin(s.t * 0.45), rgb = waveRGB(lam), col = css(rgb), px = lam / 5, ph = (s.t * 70) % px, y0 = 112, A = 40;
        c.save(); c.strokeStyle = col; c.lineWidth = 3.5; c.shadowColor = col; c.shadowBlur = 12; c.beginPath();
        for (let x = 30; x <= 570; x += 3) { const y = y0 - A * Math.sin(TAU * (x - ph) / px); x === 30 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke(); c.restore();
        let cx = ph + px / 4; while (cx < 210) cx += px;
        const by = y0 - A - 14;
        line(c, [[cx, by], [cx + px, by]], COL.ink, 1.5); line(c, [[cx, by - 5], [cx, by + 5]], COL.ink, 1.5); line(c, [[cx + px, by - 5], [cx + px, by + 5]], COL.ink, 1.5);
        text(c, 'λ', cx + px / 2, by - 14, { col: COL.ink, size: 17, w: 600, ltr: true });
        text(c, t('nmv', { n: Math.round(lam) }) + ' · ' + shortName(lam), 300, 196, { col, size: 18, w: 600 });
        const x0 = 70, x1 = 530, g = c.createLinearGradient(x0, 0, x1, 0);
        for (let w = 380; w <= 750; w += 10) g.addColorStop((w - 380) / 370, css(waveRGB(w)));
        rr(c, x0, 232, x1 - x0, 14, 7); c.fillStyle = g; c.fill();
        const mx = x0 + (x1 - x0) * (lam - 380) / 370; line(c, [[mx, 224], [mx, 254]], '#ffffff', 2.5);
        text(c, t('nmv', { n: 380 }), x0, 272, { size: 11 }); text(c, t('nmv', { n: 750 }), x1, 272, { size: 11 });
      } },
      { speed: 0.25, max: 0.9, draw(c, s, b) {       // a moving lamp: crests bunch up ahead and spread out behind
        const lam0 = 530, cp = 110, g = 1 / Math.sqrt(1 - b * b), k = Math.sqrt((1 - b) / (1 + b)), y = 150;
        if (s.x === undefined || s.x > 430) { s.x = 170; s.fr = []; s.emit = 0; }
        s.x += b * cp * s.dt; s.emit -= s.dt;
        if (s.emit <= 0) { s.emit += 0.4 * g; s.fr.push({ x: s.x, t: s.t }); }      // the lamp's own clock runs slow too
        s.fr = s.fr.filter(f => cp * (s.t - f.t) < 560);
        sky(c);
        const rgb0 = waveRGB(lam0);
        for (const f of s.fr) { const r = cp * (s.t - f.t); ring(c, f.x, y, r, rgb0, Math.max(0, 0.75 - r / 620)); }
        glow(c, s.x, y, 7, rgb0);
        text(c, t('nmv', { n: lam0 }), s.x, y - 34, { col: COL.ink, size: 12 });
        for (const [x, w, key] of [[530, lam0 * k, 'lAhead'], [70, lam0 / k, 'lBehind']]) {
          rr(c, x - 62, 92, 124, 116, 14); c.fillStyle = 'rgba(7,11,36,.88)'; c.fill(); c.strokeStyle = 'rgba(190,200,255,.25)'; c.lineWidth = 1; c.stroke();
          text(c, t(key), x, 110, { size: 12 });
          c.fillStyle = css(waveRGB(w)); c.beginPath(); c.arc(x, 143, 15, 0, TAU); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.stroke();
          text(c, t('nmv', { n: Math.round(w) }), x, 175, { col: COL.ink, size: 13, w: 600 });
          text(c, shortName(w), x, 193, { size: 11 });
        }
      } },
      { speed: 0.8, keep: true, draw(c, s, b) {      // aberration: the stars crowd toward the front
        if (s.b === undefined) s.b = 0;
        s.b += (b - s.b) * Math.min(1, s.dt * 3);
        const B = s.b, N = 64, cx = 300, cy = 150, RX = 240, RY = 108;
        sky(c);
        line(c, [[cx, 34], [cx, 266]], 'rgba(190,200,255,.25)', 1, [4, 6]);
        text(c, t('lBehind'), 150, 20, { size: 13, w: 600 }); text(c, t('lAhead'), 450, 20, { col: COL.light, size: 13, w: 600 });
        for (let i = 0; i < N; i++) {
          const u = -1 + (2 * i + 1) / N, cs = (u + B) / (1 + B * u), a = Math.acos(cs) * (i % 2 ? 1 : -1), D = Phys.doppler(B, cs);
          const rgb = waveRGB(Math.max(390, Math.min(700, 560 / D))).map(v => 0.45 + 0.55 * v);
          glow(c, cx + RX * Math.cos(a), cy + RY * Math.sin(a), 1.5 + Math.min(2.6, D * 0.9), rgb);
        }
        rocket(c, cx, cy, 44, 14, COL.rocket, { flame: B > 0.01 ? 0.3 + 0.7 * B : 0 });
        text(c, t('lStarsAhead', { n: Math.round((1 + B) / 2 * 100) }), 450, 282, { col: COL.light, size: 14, w: 600 });
      } }
    ],
    m6: [
      { draw(c, s) {                                 // standing halfway: both flashes arrive together
        sky(c);
        const tau = s.t % 5 - 0.7, y = 205, xs = [80, 520], ox = 300, cl = 120, d = tau * cl;
        line(c, [[30, y], [570, y]], 'rgba(190,200,255,.5)', 3);
        for (const x of xs) line(c, [[x, y], [x, y - 40]], '#8891ad', 5);
        person(c, ox, y, COL.earth, 1.2);
        text(c, t('omar'), ox, y + 22, { col: COL.earth, size: 13, w: 600 });
        if (tau >= 0 && tau < 0.25) xs.forEach((x, i) => bolt(c, x, 10, y - 40, i + 1, 1 - tau / 0.25));
        if (tau >= 0 && d < 220) xs.forEach((x, i) => {
          const px = i ? x - d : x + d;
          line(c, [[x, y - 25], [px, y - 25]], rgba(COL.light, 0.35), 2); glow(c, px, y - 25, 5, COL.light);
        });
        if (d >= 220) {
          const k = d / 220 - 1;
          ring(c, ox, y - 22, 18 + k * 70, COL.light, Math.max(0, 1 - k * 1.5));
          text(c, t('lTogether'), ox, 100, { col: COL.light, size: 20, w: 600 });
        }
      } },
      { draw(c, s) {                                 // Omar's view: the train moves at 40% of light speed
        const cl = 120, v = 48, half = 160, ts = 1, P = 5.2, p = s.t % P, yT = 140, yS = 157, yO = 248, tau = p - ts;
        const xc = 150 + v * p, x0 = 150 + v * ts, ev = [x0 - half, x0 + half];        // where each bolt struck, fixed on the platform: rear, front
        if (s.cyc !== Math.floor(s.t / P)) { s.cyc = Math.floor(s.t / P); s.S = [null, null]; s.O = [null, null]; }
        sky(c);
        line(c, [[20, 182], [580, 182]], 'rgba(190,200,255,.35)', 2);
        line(c, [[20, yO], [580, yO]], 'rgba(190,200,255,.5)', 3);
        train(c, xc - half, xc + half, yT);
        person(c, xc, yT + 30, COL.rocket, 0.7);
        person(c, x0, yO, COL.earth, 1.1);
        text(c, t('rear'), xc - half + 30, 196, { size: 11 }); text(c, t('front'), xc + half - 30, 196, { size: 11 });
        if (tau >= 0) ev.forEach((x, i) => {
          const r = cl * tau;
          if (tau < 0.25) bolt(c, x, 6, yT, i + 3, 1 - tau / 0.25);
          line(c, [[x, 177], [x, 187]], COL.light, 3);
          ring(c, x, yS, r, COL.light, Math.max(0.12, 0.8 - r / 500));
          if (s.S[i] === null && r >= Math.abs(xc - x)) s.S[i] = tau;
          if (s.O[i] === null && r >= Math.hypot(x0 - x, yO - 22 - yS)) s.O[i] = tau;
        });
        text(c, t('sara') + ' · ' + saw(s.S), xc, yT - 18, { col: COL.rocket, size: 13, w: 600 });
        text(c, t('omar') + ' · ' + saw(s.O), x0, yO + 24, { col: COL.earth, size: 13, w: 600 });
      } },
      { draw(c, s) {                                 // Sara's view: the train stands still and the platform slides past
        const cl = 120, v = 48, g = 1 / Math.sqrt(1 - 0.16), half = 160 * g, gap = g * 0.4 * 320 / cl, P = 5.6, p = s.t % P;
        const yT = 140, yS = 157, yO = 248, ev = [{ x: 300 - half, t: 1 + gap }, { x: 300 + half, t: 1 }];   // rear, front
        const mark = e => e.x - v * (p - e.t), xo = (mark(ev[0]) + mark(ev[1])) / 2;                     // Omar stands halfway between the scorch marks
        if (s.cyc !== Math.floor(s.t / P)) { s.cyc = Math.floor(s.t / P); s.S = [null, null]; s.O = [null, null]; }
        sky(c);
        line(c, [[20, 182], [580, 182]], 'rgba(190,200,255,.35)', 2);
        line(c, [[20, yO], [580, yO]], 'rgba(190,200,255,.5)', 3);
        for (let k = 0; k < 16; k++) { const x = ((k * 40 - v * p) % 640 + 640) % 640 - 20; line(c, [[x, yO + 4], [x + 14, yO + 4]], 'rgba(190,200,255,.3)', 2); }
        train(c, 300 - half, 300 + half, yT);
        person(c, 300, yT + 30, COL.rocket, 0.7);
        person(c, xo, yO, COL.earth, 1.1);
        text(c, t('rear'), 300 - half + 30, 196, { size: 11 }); text(c, t('front'), 300 + half - 30, 196, { size: 11 });
        ev.forEach((e, i) => {
          const tau = p - e.t, r = cl * tau;
          if (tau < 0) return;
          if (tau < 0.25) bolt(c, e.x, 6, yT, i + 5, 1 - tau / 0.25);
          line(c, [[mark(e), yO - 5], [mark(e), yO + 5]], COL.light, 3);
          ring(c, e.x, yS, r, COL.light, Math.max(0.12, 0.8 - r / 500));
          badge(c, e.x, yT - 14, i ? '1' : '2');
          if (s.S[i] === null && r >= half) s.S[i] = p;
          if (s.O[i] === null && r >= Math.hypot(xo - e.x, yO - 22 - yS)) s.O[i] = p;
        });
        text(c, t('sara') + ' · ' + saw(s.S), 300, yT - 40, { col: COL.rocket, size: 13, w: 600 });
        text(c, t('omar') + ' · ' + saw(s.O), Math.max(110, Math.min(490, xo)), yO + 24, { col: COL.earth, size: 13, w: 600 });
      } }
    ]
  };

  // ---------- the player ----------
  const cv = el('ls-canvas'), ctx = cv.getContext('2d');
  let mid = null, idx = 0, st = null, beta = 0, raf = 0, last = 0;
  const slide = () => SLIDES[mid][idx];
  const fresh = () => { st = { t: 0, dt: 0 }; };

  function go(n) {
    const list = SLIDES[mid];
    idx = Math.max(0, Math.min(list.length - 1, n));
    beta = list[idx].speed || 0; fresh(); render();
  }
  function render() {
    if (!mid) return;
    const list = SLIDES[mid], sl = list[idx], key = 'l_' + mid + '_' + (idx + 1), ar = LANG === 'ar';
    el('ls-tag').textContent = t('lesTag', { c: t(mid + 'tag'), n: idx + 1, m: list.length });
    el('ls-title').textContent = t(key + 'h');
    el('ls-text').innerHTML = t(key);
    el('ls-prev').textContent = (ar ? '→ ' : '← ') + t('lesPrev');
    el('ls-next').textContent = t('lesNext') + (ar ? ' ←' : ' →');
    el('ls-prev').disabled = idx === 0;
    el('ls-next').style.visibility = idx === list.length - 1 ? 'hidden' : '';
    const dots = el('ls-dots');
    dots.innerHTML = list.map((_, i) => '<button type="button" aria-label="' + (i + 1) + '"' + (i === idx ? ' aria-current="step"' : '') + '></button>').join('');
    dots.querySelectorAll('button').forEach((b, i) => { b.onclick = () => { Sfx.click(); go(i); }; });
    el('ls-speed').hidden = sl.speed === undefined;
    if (sl.speed !== undefined) {
      const r = el('ls-range');
      r.min = Math.round((sl.min || 0) * 1000); r.max = Math.round((sl.max || 0.99) * 1000); r.value = Math.round(beta * 1000);
      speedText();
    }
  }
  function speedText() {
    const r = el('ls-range');
    el('ls-speed-lbl').textContent = t('labSpeed');
    el('ls-speed-val').textContent = pct(beta) + '% ' + t('ofLight');
    r.style.setProperty('--fill', ((r.value - r.min) / (r.max - r.min) * 100).toFixed(1) + '%');
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    paint(dt);
  }
  function paint(dt) {
    const w = cv.clientWidth; if (!w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), pw = Math.round(w * dpr), ph = Math.round(w / 2 * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    fs = Math.max(1, Math.min(1.35, 0.8 * W / w));
    st.dt = dt; st.t += dt;
    ctx.setTransform(pw / W, 0, 0, pw / W, 0, 0);
    ctx.save();
    try { slide().draw(ctx, st, beta); } finally { ctx.restore(); }
  }
  function onKey(e) {
    if (!mid || (e.target && e.target.type === 'range')) return;
    const fwd = LANG === 'ar' ? 'ArrowLeft' : 'ArrowRight', back = LANG === 'ar' ? 'ArrowRight' : 'ArrowLeft';
    if (e.key === fwd) go(idx + 1); else if (e.key === back) go(idx - 1); else return;
    e.preventDefault();
  }
  el('ls-prev').onclick = () => { Sfx.click(); go(idx - 1); };
  el('ls-next').onclick = () => { Sfx.click(); go(idx + 1); if (idx === SLIDES[mid].length - 1) el('ls-enter').focus(); };
  el('ls-range').oninput = e => { beta = e.target.value / 1000; if (!slide().keep) fresh(); speedText(); Sfx.slide(beta); };

  return {
    has: id => !!SLIDES[id],
    get active() { return !!mid; },
    start(id) {
      if (!SLIDES[id]) return;
      mid = id; go(0);
      cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
      window.addEventListener('keydown', onKey);
    },
    stop() { cancelAnimationFrame(raf); raf = 0; mid = null; window.removeEventListener('keydown', onKey); },
    render,
    advance(sec) { if (mid) for (let i = 0; i < Math.round(sec * 60); i++) paint(1 / 60); }    // for automated tests: run the slide forward
  };
})();
