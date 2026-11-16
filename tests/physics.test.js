// Checks the game's physics helpers against the textbook formulas, written out independently.
// Run with:  node tests/physics.test.js
const fs = require('fs'), vm = require('vm');
const code = fs.readFileSync(__dirname + '/../js/strings.js', 'utf8') + fs.readFileSync(__dirname + '/../js/core.js', 'utf8') +
  '\nthis.out = { Phys, C, YEAR, fmtDuration, fmtTiny, waveName, pct };';
const ctx = { Math, Number, String, isFinite, console }; vm.createContext(ctx); vm.runInContext(code, ctx);
const { Phys, C, YEAR, fmtDuration, fmtTiny, waveName, pct } = ctx.out;
let bad = 0;
const near = (name, got, want, tol = 1e-9) => { const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)); if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name, got, want); };
// time_rocket = time_earth * sqrt(1 - v^2/c^2)
const v = 0.8 * C;
near('a rocket time', Phys.rocketTime(10, 0.8), 10 * Math.sqrt(1 - v * v / (C * C)));
// time_earth = time_rocket / sqrt(...)
near('b earth time', Phys.earthTime(6, 0.8), 6 / Math.sqrt(1 - v * v / (C * C)));
// speed = c * sqrt(1 - (t_rocket/t_earth)^2)
near('c speed', Phys.speedFromTimes(6, 10) * C, C * Math.sqrt(1 - Math.pow(6 / 10, 2)));
// trip: t_earth = d / v ; t_rocket = t_earth * sqrt(...)
const d = 4.24 * C * YEAR, vv = 0.816 * C, tE = d / vv;
near('d earth yrs', Phys.trip(4.24, 0.816).earth, tE / YEAR);
near('d rocket yrs', Phys.trip(4.24, 0.816).rocket, tE * Math.sqrt(1 - vv * vv / (C * C)) / YEAR);
// tiny speeds: jet for a year, compare with series b^2/2 + b^4/8
const b = 250 / C; near('jet lag/yr (s)', Phys.lag(b) * YEAR, (b * b / 2 + b ** 4 / 8) * YEAR, 1e-6);
console.log('     jet a year ->', fmtTiny(Phys.lag(b) * YEAR), '| car a year ->', fmtTiny(Phys.lag(120 / 3.6 / C) * YEAR));
// mission targets
near('m1 half rate', Phys.root(0.866), 0.5, 1e-3);
near('m1 fifth rate', Phys.root(0.98), 0.2, 6e-3);
near('m4 80 m', 100 * Phys.root(0.6), 80); near('m4 50 m', 100 * Phys.root(0.866), 50, 1e-3); near('m4 20 m', 100 * Phys.root(0.98), 20, 6e-3);
console.log('     m5 red->', waveName(650 / Math.sqrt(1.2 / 0.8)), Math.round(650 / Math.sqrt(1.2 / 0.8)), '| blue behind ->', waveName(470 * Math.sqrt(1.32 / 0.68)));
near('m5 front 90%', Phys.frontFraction(0.8), 0.9);
// aberration + doppler consistency: light from straight ahead/behind
near('doppler ahead', Phys.doppler(0.6, 1), Math.sqrt(1.6 / 0.4)); near('doppler behind', Phys.doppler(0.6, -1), Math.sqrt(0.4 / 1.6));
near('aberration 90deg', Phys.aberration(0, 0.6), 0.6);
// m6: Lorentz-transform the two strikes from platform to train frame and compare with the scene's shortcut
{ const be = 0.5, g = Phys.gamma(be), L0 = 2, Lp = L0 / g; const tp = x => g * (0 - be * x); // c = 1
  near('m6 gap', tp(-Lp / 2) - tp(Lp / 2), be * L0); near('m6 front first', tp(Lp / 2), -be * L0 / 2); }
console.log('     durations:', fmtDuration(YEAR), '|', fmtDuration(YEAR * 4.9036), '|', fmtDuration(86400 * 1.5), '|', fmtDuration(59.94), '| pct', pct(0.866), pct(0.9999), pct(0.999999999));
console.log(bad ? bad + ' FAILED' : 'all physics checks passed');
process.exit(bad ? 1 : 0);
