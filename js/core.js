/*
 * Core: the special-relativity formulas, the current language, and number/duration formatting.
 * No graphics here, so tests/physics.test.js can load this file on its own.
 */
'use strict';

// ---------- physics ----------
const C = 299792458;            // speed of light, m/s
const YEAR = 31557600;          // seconds in a 365.25-day year
const Phys = {
  root(b) { return Math.sqrt(1 - b * b); },                     // √(1 − v²/c²) = 1/γ
  gamma(b) { return 1 / Math.sqrt(1 - b * b); },
  // 1 − √(1 − β²), rewritten so it stays accurate at car speeds where β² ~ 1e-14
  lag(b) { return b * b / (1 + Math.sqrt(1 - b * b)); },
  rocketTime(tEarth, b) { return tEarth * Phys.root(b); },
  earthTime(tRocket, b) { return tRocket / Phys.root(b); },
  speedFromTimes(tRocket, tEarth) {
    const r = tRocket / tEarth; return Math.sqrt(Math.max(0, 1 - r * r));
  },
  trip(distance, b) {
    const earth = distance / b; return { earth, rocket: earth * Phys.root(b) };
  },
  doppler(b, cosSeen) { return 1 / (Phys.gamma(b) * (1 - b * cosSeen)); }, // frequency factor for light arriving from angle θ′
  aberration(cos, b) { return (cos + b) / (1 + b * cos); },
  frontFraction(b) { return (1 + b) / 2; }                      // share of an even sky that lands in the front hemisphere
};

function waveRGB(w) {
  if (w < 380 || w > 750) return [0.07, 0.07, 0.1];
  let r = 0, g = 0, b = 0;
  if (w < 440) { r = (440 - w) / 60; b = 1; }
  else if (w < 490) { g = (w - 440) / 50; b = 1; }
  else if (w < 510) { g = 1; b = (510 - w) / 20; }
  else if (w < 580) { r = (w - 510) / 70; g = 1; }
  else if (w < 645) { r = 1; g = (645 - w) / 65; }
  else { r = 1; }
  const f = w < 420 ? 0.35 + 0.65 * (w - 380) / 40 : w > 700 ? 0.35 + 0.65 * (750 - w) / 50 : 1;
  return [r, g, b].map(v => Math.pow(v * f, 0.8));
}
function waveName(w) {
  if (w < 380) return 'col_uv';
  if (w < 450) return 'col_violet';
  if (w < 490) return 'col_blue';
  if (w < 510) return 'col_cyan';
  if (w < 565) return 'col_green';
  if (w < 590) return 'col_yellow';
  if (w < 625) return 'col_orange';
  if (w <= 750) return 'col_red';
  return 'col_ir';
}
const css = rgb => 'rgb(' + rgb.map(v => Math.round(v * 255)).join(',') + ')';

// ---------- language ----------
let LANG = 'ar';                 // Arabic unless the player switches
function t(key, vars) {
  const e = STR[key];
  let s = e ? e[LANG === 'ar' ? 1 : 0] : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s.replace(/⟦/g, '<span class="f" dir="ltr">').replace(/⟧/g, '</span>');
}
const num = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = b => {
  const p = b * 100;
  if (p >= 99.95) return p.toFixed(Math.min(8, Math.max(2, Math.ceil(-Math.log10(100 - p) - 1e-9))));
  return p.toFixed(1);
};
// Break a duration into years, days, hours…, keeping the two biggest units.
function fmtDuration(sec) {
  if (!isFinite(sec)) return '∞';
  if (sec < 1) return fmtTiny(sec);
  sec = Math.round(sec * 10) / 10;
  const units = [['un_y', YEAR], ['un_d', 86400], ['un_h', 3600], ['un_min', 60], ['un_s', 1]];
  if (sec >= YEAR * 1000) return num(sec / YEAR, 0) + ' ' + t('un_y');
  const out = [];
  let rest = sec;
  for (let i = 0; i < units.length && out.length < 2; i++) {
    const [k, size] = units[i];
    if (rest >= size || (k === 'un_s' && !out.length)) {
      const last = out.length === 1 || k === 'un_s';
      const v = last ? Math.round(rest / size * 10) / 10 : Math.floor(rest / size);
      rest -= v * size;
      if (v > 0 || !out.length) out.push(num(v, last && v % 1 ? 1 : 0) + ' ' + t(k));
    }
  }
  return out.join(' ');
}
// Tiny differences step down through ms, µs, ns, ps, fs.
function fmtTiny(sec) {
  const steps = [['un_s', 1], ['un_ms', 1e-3], ['un_us', 1e-6], ['un_ns', 1e-9], ['un_ps', 1e-12], ['un_fs', 1e-15]];
  if (sec === 0) return '0 ' + t('un_s');
  for (const [k, size] of steps) if (sec >= size) return num(sec / size, sec / size < 10 ? 2 : 1) + ' ' + t(k);
  return (sec / 1e-15).toPrecision(2) + ' ' + t('un_fs');
}
