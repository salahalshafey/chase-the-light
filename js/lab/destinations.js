/*
 * Free Lab: the places to go.
 * Distance (in light-seconds) and a 3D model for each destination.
 */
'use strict';

function orbiters(g, list) {                       // small worlds circling a star
  const items = list.map(o => { const m = new THREE.Mesh(new THREE.SphereGeometry(o.r, 16, 12), o.glow ? lit(o.color, 2) : mat(o.color, { roughness: 0.9 })); if (o.glow) m.add(glow(o.color, o.r * 7, 0.8)); g.add(m); return { m, o, a: Math.random() * 6.28 }; });
  return dt => items.forEach(it => { it.a += dt * it.o.w; it.m.position.set(Math.cos(it.a) * it.o.d, Math.sin(it.a) * it.o.d * 0.22, Math.sin(it.a) * it.o.d); });
}
const DESTS = {
  d_moon: { ls: 1.2822, far: ['384,400', 'u_km'], make() { const m = makeRock(4.6, 'moon'); m.userData.tick = dt => { m.rotation.y += dt * 0.03; }; return m; } },
  d_mars: { ls: 750.5, far: ['225', 'million', 'u_km'], make() { const g = new THREE.Group(), m = makeRock(4.4, 'mars'); g.add(m, atmosphere(4.4, 0xff9a6a, new THREE.Vector3(-0.4, 0.6, 0.7).normalize(), 1.05)); g.userData.tick = dt => { m.rotation.y += dt * 0.05; }; return g; } },
  d_sun: { ls: 499.0, far: ['150', 'million', 'u_km'], make() { return makeSun(4.4, 0xff7a12, 0xfff3c0, 1.1); } },
  d_prox: { ls: 4.2465 * YEAR, far: ['4.25', 'u_ly'], make() { const g = makeSun(3.4, 0xff4a14, 0xffc38a, 0.9), sunTick = g.userData.tick, orb = orbiters(g, [{ r: 0.3, d: 6, w: 0.5, color: 0x8fa8c8 }]); g.userData.tick = dt => { sunTick(dt); orb(dt); }; return g; } },
  d_sirius: { ls: 8.6 * YEAR, far: ['8.6', 'u_ly'], make() { const g = makeSun(3.6, 0x7fb0ff, 0xffffff, 1.5), sunTick = g.userData.tick, orb = orbiters(g, [{ r: 0.16, d: 6.5, w: 0.35, color: 0xdfeaff, glow: true }]); g.userData.tick = dt => { sunTick(dt); orb(dt); }; return g; } },
  d_trap: { ls: 40.7 * YEAR, far: ['40.7', 'u_ly'], make() { const g = makeSun(2.6, 0xd22c12, 0xff9858, 0.8), sunTick = g.userData.tick, orb = orbiters(g, [0, 1, 2, 3, 4, 5, 6].map(i => ({ r: 0.16 + 0.05 * (i % 3), d: 3.6 + i * 0.75, w: 1.1 / (1 + i * 0.45), color: [0x8fb0d8, 0xc79a78, 0x7fb890][i % 3] }))); g.userData.tick = dt => { sunTick(dt); orb(dt); }; return g; } },
  d_core: { ls: 26000 * YEAR, far: ['26,000', 'u_ly'], make() { const g = makeGalaxy(7, 0, 9000, 0xffd49a, 0xffb07a); g.rotation.set(0.5, 0, 0.35); return g; } },
  d_andro: { ls: 2.5e6 * YEAR, far: ['2.5', 'million', 'u_ly'], make() { const g = makeGalaxy(8.5, 2, 12000); g.rotation.set(1.0, 0, 0.42); return g; } }
};
const farText = d => DESTS[d].far.map((p, i) => i ? t(p) : p).join(' ');
