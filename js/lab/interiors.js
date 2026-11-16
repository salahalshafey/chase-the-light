/*
 * Free Lab: the view from inside each vehicle.
 * One interior per vehicle, built from boxes, rods and glowing screens, plus the live instrument they all share.
 */
'use strict';

// The live instrument every cab shares: speed, percent of light speed, gamma, and the two clocks.
function makeDisplay() {
  const c = canvas(512, 256), g = c.getContext('2d'), tx = keep(tex(c, { own: true }));
  let last = '';
  return { tex: tx, draw(o) {
    const sig = LANG + o.speed + o.unit + o.pct + o.gamma + o.ship + o.earth, dir = LANG === 'ar' ? 'rtl' : 'ltr';
    g.direction = 'ltr';
    if (sig === last) return; last = sig;
    g.fillStyle = '#04060c'; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = '#1c2340'; g.lineWidth = 2; g.strokeRect(3, 3, 506, 250);
    // dial: the needle creeps toward c but the scale never lets it arrive
    const cx = 108, cy = 138, r = 78, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    g.lineWidth = 9; g.lineCap = 'round'; g.strokeStyle = '#1b2446'; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
    g.strokeStyle = '#35d6bd'; g.beginPath(); g.arc(cx, cy, r, a0, a0 + (a1 - a0) * o.frac); g.stroke();
    const an = a0 + (a1 - a0) * o.frac; g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(an) * (r - 14), cy + Math.sin(an) * (r - 14)); g.stroke();
    g.fillStyle = '#ffd84a'; g.font = '700 26px "Readex Pro", system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('c', cx + Math.cos(a1) * (r + 20), cy + Math.sin(a1) * (r + 20) + 8);
    g.fillStyle = '#8f9bd0'; g.font = '500 17px "Readex Pro", system-ui, sans-serif'; g.fillText(o.pct + '% c', cx, cy + 58);
    // numbers
    g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = '700 ' + (o.speed.length > 9 ? 34 : 50) + 'px "Readex Pro", system-ui, sans-serif'; g.fillText(o.speed, 214, 82);
    g.direction = dir; g.fillStyle = '#8f9bd0'; g.font = '500 20px "Readex Pro", system-ui, sans-serif'; g.fillText(o.unit, 216, 110); g.direction = 'ltr';
    g.fillStyle = '#ffd84a'; g.font = '600 24px "Readex Pro", system-ui, sans-serif'; g.fillText('γ  ' + o.gamma, 214, 156);
    g.font = '600 21px "Readex Pro", system-ui, sans-serif';
    g.direction = dir;
    g.fillStyle = '#ff7d6e'; g.fillText(t('dispShip') + '  ' + o.ship, 214, 196);
    g.fillStyle = '#48d9c2'; g.fillText(t('dispEarth') + '  ' + o.earth, 214, 228);
    g.direction = 'ltr';
    tx.needsUpdate = true;
  } };
}
const _aux = {};
function auxTex(kind) {                           // decorative screens
  if (_aux[kind]) return _aux[kind];
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#04060c'; g.fillRect(0, 0, 256, 256);
  if (kind === 'nav') {
    g.strokeStyle = '#18213f'; g.lineWidth = 2;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(i * 34 - 20, 0); g.lineTo(i * 34 + 40, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 34); g.lineTo(256, i * 34 - 30); g.stroke(); }
    g.strokeStyle = '#35d6bd'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 236); g.bezierCurveTo(128, 160, 70, 150, 90, 90); g.bezierCurveTo(104, 50, 170, 60, 176, 22); g.stroke();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(128, 232, 9, 0, 7); g.fill(); g.fillStyle = '#ff7d6e'; g.beginPath(); g.arc(176, 24, 8, 0, 7); g.fill();
  } else if (kind === 'pfd') {
    g.fillStyle = '#2b6fd2'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#7b4a24'; g.fillRect(0, 128, 256, 128);
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
    g.lineWidth = 2; for (const d of [-60, -30, 30, 60]) { g.beginPath(); g.moveTo(128 - (Math.abs(d) > 40 ? 34 : 20), 128 + d); g.lineTo(128 + (Math.abs(d) > 40 ? 34 : 20), 128 + d); g.stroke(); }
    g.strokeStyle = '#ffd84a'; g.lineWidth = 6; g.beginPath(); g.moveTo(70, 128); g.lineTo(110, 128); g.lineTo(110, 140); g.moveTo(186, 128); g.lineTo(146, 128); g.lineTo(146, 140); g.stroke();
    g.fillStyle = 'rgba(4,6,12,.75)'; g.fillRect(0, 0, 38, 256); g.fillRect(218, 0, 38, 256);
  } else if (kind === 'bars') {
    for (let i = 0; i < 6; i++) { const h = 40 + ((i * 53) % 110); g.fillStyle = '#141b36'; g.fillRect(24 + i * 37, 30, 22, 150); g.fillStyle = i % 3 === 2 ? '#ffd84a' : '#35d6bd'; g.fillRect(24 + i * 37, 180 - h, 22, h); }
    g.fillStyle = '#8f9bd0'; for (let i = 0; i < 3; i++) g.fillRect(24, 200 + i * 16, 120 + i * 30, 5);
  } else {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) { g.fillStyle = ['#35d6bd', '#ffd84a', '#ff7d6e', '#27304f', '#27304f'][(x * 7 + y * 3) % 5]; g.fillRect(14 + x * 24, 14 + y * 30, 10, 6); g.fillStyle = '#10152a'; g.fillRect(12 + x * 24, 24 + y * 30, 14, 10); }
  }
  return (_aux[kind] = tex(c));
}
// Shared tools for building a cab. Everything is measured in metres from the eye: +x ahead, +y up, +z to the right.
function cabKit(scale) {
  const g = new THREE.Group();
  const dark = mat(0x14151b, { roughness: 0.85 }), soft = mat(0x20222c, { roughness: 0.75 }), trim = metal(0x4a4e60, { roughness: 0.4 });
  const B = (w, h, d, x, y, z, m = dark, rz = 0) => { const b = box(w, h, d, m); b.position.set(x, y, z); b.rotation.z = rz; g.add(b); return b; };
  const R = (a, b, r, m = dark) => { const o = between(a, b, r, m); g.add(o); return o; };
  // a glowing screen facing the eye; tilt leans its top away, turn swings it left or right
  const S = (texture, w, h, x, y, z, tilt = 0.3, turn = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = -Math.PI / 2 + turn; m.rotateX(-tilt); g.add(m); return m; };
  const lamp = new THREE.PointLight(0xffe6c4, 0.7, 10, 2); lamp.position.set(-0.2, 0.25, 0); g.add(lamp);
  g.scale.setScalar(scale);
  return { g, B, R, S, dark, soft, trim };
}
const roadGlow = (g, len, wid, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xbfd0ff, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); };

const CABS = {
  // behind the wheel, left-hand drive, in the right-hand lane
  car(d) {
    const k = cabKit(1.55), { g, B, R, S } = k, red = paint(0xd8362a, { metalness: 0.55, roughness: 0.28 }), cz = 0.37;
    B(0.55, 0.3, 1.62, 0.83, -0.5, cz); B(0.5, 0.04, 1.66, 0.85, -0.34, cz, k.soft, -0.05);
    B(0.12, 0.2, 0.44, 0.62, -0.25, 0, k.soft);                         // the binnacle the dial sits in
    S(d.tex, 0.36, 0.18, 0.535, -0.25, 0, 0.18);
    S(auxTex('nav'), 0.3, 0.2, 0.55, -0.44, 0.43, 0.45);
    B(0.5, 0.18, 0.26, 0.32, -0.7, cz, k.soft);
    const col = new THREE.Group(); col.position.set(0.42, -0.47, 0); col.rotation.z = -0.36; g.add(col);
    const wheel = new THREE.Group(); wheel.rotation.y = Math.PI / 2; col.add(wheel);
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.018, 10, 44), k.soft));
    const hub = cyl(0.055, 0.055, 0.04, k.soft, 20); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    for (const a of [0, 1.5708, -1.5708]) { const sp = box(0.03, 0.17, 0.02, k.soft); sp.position.set(Math.sin(a) * 0.1, -Math.cos(a) * 0.1, 0); sp.rotation.z = a; wheel.add(sp); }
    R([0.44, -0.475, 0], [0.8, -0.6, 0], 0.03);
    R([1.02, -0.27, -0.43], [0.2, 0.35, -0.36], 0.05); R([1.02, -0.27, cz * 2 + 0.43], [0.2, 0.35, cz * 2 + 0.36], 0.05);
    B(0.12, 0.06, 1.6, 0.2, 0.375, cz); B(1.7, 0.04, 1.62, -0.62, 0.43, cz, k.soft);
    B(0.02, 0.07, 0.25, 0.32, 0.27, cz, metal(0x262936, { roughness: 0.12 }));
    B(1.4, 0.05, 1.56, 1.76, -0.5, cz, red, -0.05);
    B(1.7, 0.45, 0.07, 0.25, -0.52, -0.45, k.soft); B(1.7, 0.45, 0.07, 0.25, -0.52, cz * 2 + 0.45, k.soft);
    B(0.05, 0.09, 0.16, 0.9, -0.24, -0.56);
    roadGlow(g, 16, 6, 10.5, -1.14, cz);
    return { g, eye: [0, 1.78, 1.43], pitch: 0.1, tick(dt, t, vis) { wheel.rotation.z = Math.sin(t * 0.7) * 0.07 * Math.min(1, vis); return Math.sin(t * 17) * 0.004 * Math.min(1, vis); } };
  },
  // the driver's desk of the bullet train, on the centre line of the track
  train(d) {
    const k = cabKit(1.45), { g, B, R, S } = k;
    B(0.75, 0.3, 2.2, 0.92, -0.58, 0); B(0.55, 0.04, 2.2, 0.78, -0.4, 0, k.soft, 0.25);
    S(d.tex, 0.4, 0.2, 0.7, -0.31, 0, 0.5); S(auxTex('bars'), 0.3, 0.2, 0.7, -0.31, -0.5, 0.5, 0.25); S(auxTex('nav'), 0.3, 0.2, 0.7, -0.31, 0.5, 0.5, -0.25);
    for (const [z, c] of [[-0.86, CORAL], [0.86, TEAL]]) { R([0.62, -0.43, z], [0.52, -0.25, z], 0.014, k.trim); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(c, { roughness: 0.4 })); knob.position.set(0.52, -0.24, z); g.add(knob); }
    R([1.32, -0.4, -1.02], [0.5, 0.56, -0.86], 0.06); R([1.32, -0.4, 1.02], [0.5, 0.56, 0.86], 0.06);
    B(0.14, 0.08, 1.8, 0.5, 0.6, 0); B(2.0, 0.05, 2.2, -0.55, 0.66, 0, k.soft);
    B(1.9, 1.0, 0.07, 0.3, -0.45, -1.08, k.soft); B(1.9, 1.0, 0.07, 0.3, -0.45, 1.08, k.soft);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 22), paint(SHELL, { roughness: 0.3 })); nose.scale.set(2.8, 0.5, 0.98); nose.position.set(1.35, -0.94, 0); g.add(nose);
    R([1.25, -0.36, 0.15], [0.95, 0.2, 0.42], 0.008, k.trim);
    roadGlow(g, 18, 5, 13, -1.12, 0);
    return { g, eye: [0, 1.72, 0], pitch: 0.07, tick(dt, t, vis) { return Math.sin(t * 9) * 0.003 * Math.min(1, vis); } };
  },
  // the captain's seat of the airliner
  jet(d) {
    const k = cabKit(1.5), { g, B, R, S } = k, cz = 0.55;
    B(0.26, 0.05, 2.3, 0.85, -0.235, cz, k.soft); B(0.08, 0.38, 2.3, 0.9, -0.45, cz);
    S(auxTex('pfd'), 0.2, 0.2, 0.855, -0.41, -0.14, 0.05); S(d.tex, 0.4, 0.2, 0.855, -0.41, 0.28, 0.05); S(auxTex('bars'), 0.2, 0.2, 0.855, -0.41, 0.74, 0.05); S(auxTex('pfd'), 0.2, 0.2, 0.855, -0.41, 1.24, 0.05);
    B(0.75, 0.3, 0.44, 0.38, -0.74, cz, k.soft);
    for (const z of [cz - 0.07, cz + 0.07]) { R([0.5, -0.59, z], [0.43, -0.43, z], 0.014, k.trim); B(0.05, 0.04, 0.08, 0.43, -0.42, z, mat(0xd9dbe2)); }
    R([0.64, -0.98, 0], [0.5, -0.53, 0], 0.025, k.trim); B(0.03, 0.03, 0.32, 0.5, -0.52, 0, k.trim); for (const z of [-0.16, 0.16]) B(0.035, 0.13, 0.035, 0.5, -0.46, z, k.trim);
    R([1.0, -0.22, cz], [0.5, 0.44, cz], 0.03); R([1.0, -0.22, -0.52], [0.45, 0.44, -0.44], 0.035); R([1.0, -0.22, cz * 2 + 0.52], [0.45, 0.44, cz * 2 + 0.44], 0.035);
    R([0.1, -0.22, -0.76], [0.0, 0.44, -0.66], 0.035); R([0.1, -0.22, cz * 2 + 0.76], [0.0, 0.44, cz * 2 + 0.66], 0.035);
    B(0.1, 0.06, 2.4, 0.47, 0.46, cz); B(1.8, 0.04, 2.5, -0.45, 0.54, cz, k.soft);
    const over = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.8), new THREE.MeshBasicMaterial({ map: auxTex('dots'), toneMapped: false })); over.rotation.x = Math.PI / 2; over.rotation.z = Math.PI / 2; over.position.set(0.02, 0.515, cz); g.add(over);
    B(1.5, 0.5, 0.06, 0.25, -0.5, -0.78, k.soft); B(1.5, 0.5, 0.06, 0.25, -0.5, cz * 2 + 0.78, k.soft);
    return { g, eye: [0, 2.3, 0], pitch: 0.13, tick(dt, t) { return Math.sin(t * 0.9) * 0.05; } };
  },
  // floating in the station's seven-window cupola, with the Earth below
  iss(d) {
    const k = cabKit(1.3), { g, R, S } = k, fr = metal(0x8f95a8, { roughness: 0.5 }), gold = metal(0xc9a04a, { roughness: 0.35 });
    const ring = (rad, tube, seg, x, m) => { const t = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 10, seg), m); t.rotation.y = Math.PI / 2; t.position.x = x; g.add(t); return t; };
    ring(0.5, 0.045, 48, 1.05, fr); ring(1.3, 0.07, 6, 0.35, fr).rotation.x = Math.PI / 6; ring(1.62, 0.3, 6, 0.0, k.soft).rotation.x = Math.PI / 6;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; R([1.05, Math.sin(a) * 0.5, Math.cos(a) * 0.5], [0.35, Math.sin(a) * 1.3, Math.cos(a) * 1.3], 0.045, fr); }
    for (const a of [-2.3, -0.85]) R([0.45, Math.sin(a) * 1.18, Math.cos(a) * 1.18], [0.85, Math.sin(a) * 0.8, Math.cos(a) * 0.8], 0.018, gold);
    const side = document.documentElement.dir === 'rtl' ? 1 : -1;       // keep the instrument clear of the on-screen console
    R([0.35, -1.05, side * 0.62], [0.6, -0.5, side * 0.52], 0.015, k.trim); S(d.tex, 0.34, 0.17, 0.62, -0.4, side * 0.5, 0.2, -side * 0.3);
    const boom = box(0.22, 0.22, 9, fr); boom.position.set(6.5, 2.9, 0); g.add(boom);
    for (const z of [-3.2, -1.9, 1.9, 3.2]) { const p = solarPanel(1.2, 3.0); p.rotation.x = Math.PI / 2; p.position.set(6.5, 4.5, z); g.add(p); }
    return { g, eye: [0, 2.3, 0], pitch: 0.22, tick(dt, t) { return Math.sin(t * 0.25) * 0.03; } };
  },
  // no crew here: this is the probe's own camera, peeking past the edge of the heat shield
  probe(d) {
    const k = cabKit(1.4), { g, B, R, S } = k, rod = metal(0xb9bfd0, { roughness: 0.35 }), hud = lit(TEAL, 1.1);
    const shield = cyl(1.35, 1.35, 0.12, mat(0x0f1015, { roughness: 0.8 }), 48); shield.rotation.z = Math.PI / 2; shield.position.set(1.9, -1.3, 0); g.add(shield);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.025, 8, 64), lit(0xff7a2a, 1.3)); rim.rotation.y = Math.PI / 2; rim.position.set(1.97, -1.3, 0); g.add(rim);
    const hot = glow(0xff8a2a, 5, 0.3); hot.position.set(2.6, -0.5, 0); g.add(hot);
    for (const z of [-0.6, 0.6]) { R([0.3, -0.95, z * 0.7], [1.85, -0.55, z * 1.5], 0.03, k.trim); R([0.3, -1.25, z], [1.85, -1.3, z * 2.0], 0.03, k.trim); R([0.9, -0.78, z * 0.5], [2.7, 0.4, z * 4.2], 0.012, rod); }
    B(1.0, 0.3, 0.9, 0.15, -1.2, 0, hull(0xc9ccd6, [2, 1], { metalness: 0.75, roughness: 0.4 }));
    const wing = solarPanel(1.4, 0.55); wing.position.set(0.55, -0.8, -1.4); wing.rotation.x = 0.45; g.add(wing);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) { B(0.004, 0.1, 0.006, 1.2, sy * 0.37, sz * 0.78, hud); B(0.004, 0.006, 0.1, 1.2, sy * 0.42, sz * 0.73, hud); }
    const side = document.documentElement.dir === 'rtl' ? 1 : -1;
    S(d.tex, 0.34, 0.17, 0.74, -0.3, side * 0.32, 0.12, -side * 0.2);
    return { g, eye: [0, 2.6, 0], pitch: 0.02, tick(dt, t) { hot.material.opacity = 0.25 + 0.1 * Math.sin(t * 3); return 0; } };
  },
  // a crew capsule at the top of the rocket
  rocket(d) {
    const k = cabKit(1.4), { g, B, R, S } = k, white = mat(0xb4b7c2, { roughness: 0.6 });
    B(0.4, 0.34, 1.7, 0.86, -0.62, 0, white);
    S(d.tex, 0.42, 0.21, 0.64, -0.32, 0, 0.4); S(auxTex('nav'), 0.3, 0.2, 0.62, -0.33, -0.48, 0.4, 0.3); S(auxTex('bars'), 0.3, 0.2, 0.62, -0.33, 0.48, 0.4, -0.3);
    R([1.05, -0.3, -0.98], [0.5, 0.55, -0.78], 0.06, white); R([1.05, -0.3, 0.98], [0.5, 0.55, 0.78], 0.06, white);
    B(0.08, 0.05, 2.0, 1.08, -0.31, 0, white); B(0.1, 0.07, 1.6, 0.55, 0.57, 0, white); B(1.9, 0.05, 2.0, -0.5, 0.63, 0, white);
    B(1.8, 0.9, 0.07, 0.2, -0.5, -1.02, white); B(1.8, 0.9, 0.07, 0.2, -0.5, 1.02, white);
    R([0.46, -0.62, 0.66], [0.42, -0.46, 0.66], 0.02, k.trim); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), mat(CORAL)); knob.position.set(0.42, -0.45, 0.66); g.add(knob);
    return { g, eye: [0, 2.0, 0], pitch: 0.08, tick(dt, t, vis) { return Math.sin(t * 31) * 0.006 * Math.min(1, vis); } };
  }
};
