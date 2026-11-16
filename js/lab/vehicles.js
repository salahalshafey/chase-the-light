/*
 * Free Lab: the things that can move.
 * Car, bullet train, jet, space station, Parker probe and rocket, each with a typical speed and the scenery level it belongs to.
 */
'use strict';

function makeCar() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const lower = new THREE.Shape();
  lower.moveTo(-2.26, 0.3); lower.lineTo(-2.32, 0.66); lower.quadraticCurveTo(-2.3, 0.95, -1.9, 0.98); lower.lineTo(0.9, 1.0);
  lower.quadraticCurveTo(1.9, 0.94, 2.26, 0.7); lower.lineTo(2.32, 0.4); lower.lineTo(2.2, 0.28); lower.lineTo(-2.26, 0.3);
  const lg = new THREE.ExtrudeGeometry(lower, { depth: 1.66, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 4, curveSegments: 16 }); lg.translate(0, 0, -0.83);
  body.add(new THREE.Mesh(lg, paint(0xd8362a, { metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 })));
  const top = new THREE.Shape();
  top.moveTo(-1.62, 0.98); top.quadraticCurveTo(-1.3, 1.38, -0.65, 1.43); top.lineTo(0.1, 1.43); top.quadraticCurveTo(0.7, 1.33, 1.12, 0.99); top.lineTo(-1.62, 0.98);
  const tg = new THREE.ExtrudeGeometry(top, { depth: 1.36, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3, curveSegments: 16 }); tg.translate(0, 0, -0.68);
  body.add(new THREE.Mesh(tg, mat(0x06080e, { metalness: 0.9, roughness: 0.06, envMapIntensity: 1.8 })));
  const roof = box(0.9, 0.03, 1.2, paint(0xd8362a, { metalness: 0.55, roughness: 0.28 })); roof.position.set(-0.28, 1.47, 0); body.add(roof);
  const under = box(4.3, 0.12, 1.5, mat(0x0a0a0e, { roughness: 0.9 })); under.position.y = 0.26; body.add(under);
  const wheels = [];
  for (const x of [-1.42, 1.42]) for (const z of [-0.86, 0.86]) {
    const w = new THREE.Group(); w.position.set(x, 0.34, z);
    const tire = cyl(0.34, 0.34, 0.24, mat(0x0b0b0f, { roughness: 0.95 }), 28); tire.rotation.x = Math.PI / 2; w.add(tire);
    const rim = cyl(0.21, 0.21, 0.25, metal(0xc5cad8, { roughness: 0.2 }), 20); rim.rotation.x = Math.PI / 2; w.add(rim);
    for (let i = 0; i < 5; i++) { const sp = box(0.05, 0.4, 0.26, mat(0x16171d)); sp.rotation.z = i * Math.PI / 5; w.add(sp); }
    g.add(w); wheels.push(w);
  }
  for (const z of [-0.58, 0.58]) {
    const head = box(0.06, 0.1, 0.36, lit(0xffffff, 3)); head.position.set(2.31, 0.7, z); body.add(head);
    const hg = glow(0xdfeaff, 1.5, 0.8); hg.position.set(2.42, 0.7, z); body.add(hg);
    const tail = box(0.06, 0.08, 0.4, lit(0xff1a1a, 2.4)); tail.position.set(-2.33, 0.76, z); body.add(tail);
    const tgw = glow(0xff2a1a, 1.0, 0.6); tgw.position.set(-2.42, 0.76, z); body.add(tgw);
  }
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(11, 4.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xbfd0ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(6.6, 0.03, 0); g.add(beam);
  shadowAll(body, true, false); g.scale.setScalar(1.55);
  g.userData = { labelY: 3.1, tick(dt, vis, t) { for (const w of wheels) w.rotation.z -= vis * dt / (0.34 * 1.55); body.position.y = Math.sin(t * 17) * 0.004 * Math.min(1, vis); } };
  return g;
}
function makeBullet() {
  const g = new THREE.Group();
  [-1, 0, 1].forEach(e => { const c = trainCar(4, e); c.position.x = e * 4.05; g.add(c); });
  const rod = metal(0x2a2d3a);
  g.add(between([0.3, 2.28, 0], [-0.35, 2.95, 0], 0.03, rod), between([-0.35, 2.95, 0], [0.25, 3.68, 0], 0.03, rod));
  const bow = box(0.06, 0.05, 1.2, rod); bow.position.set(0.25, 3.7, 0); g.add(bow);
  shadowAll(g, true, false); g.scale.setScalar(0.86); g.position.y = 0.1;
  g.userData = { labelY: 4.4, tick() {} };
  return g;
}
function makeJet() {
  const g = new THREE.Group(), white = () => paint(0xc6c9d1, { roughness: 0.34 });
  const prof = [[0.001, 5], [0.2, 4.82], [0.42, 4.4], [0.56, 3.6], [0.6, 2.6], [0.6, -2.2], [0.5, -3.4], [0.3, -4.5], [0.12, -5], [0.001, -5.05]].map(p => new THREE.Vector2(p[0], p[1]));
  const fus = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), white()); fus.rotation.z = -Math.PI / 2; g.add(fus);
  const belly = cyl(0.62, 0.62, 3.2, white(), 32); belly.rotation.z = Math.PI / 2; belly.scale.z = 0.9; belly.position.set(0, -0.2, 0); g.add(belly);
  const cock = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 16), mat(0x05070c, { metalness: 0.9, roughness: 0.06 })); cock.scale.set(1.25, 0.42, 1.02); cock.position.set(4.05, 0.3, 0); g.add(cock);
  const win = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.12, 0.02), mat(0x0a0d16, { emissive: 0xffe2a0, emissiveIntensity: 0.7 }), 68), m4 = new THREE.Matrix4();
  for (let i = 0; i < 34; i++) for (const sz of [-1, 1]) { m4.makeTranslation(-2.6 + i * 0.18, 0.16, sz * 0.592); win.setMatrixAt(i * 2 + (sz > 0 ? 1 : 0), m4); }
  g.add(win);
  const flat = (pts, depth, material) => {           // a thin swept surface drawn in plan view
    const sh = new THREE.Shape(); pts.forEach((p, i) => i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])); sh.lineTo(pts[0][0], pts[0][1]);
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); geo.translate(0, 0, -depth / 2);
    return new THREE.Mesh(geo, material);
  };
  for (const sz of [-1, 1]) {
    const wing = flat([[1.3, 0.45], [-1.5, 5.3], [-2.15, 5.3], [-1.1, 0.45]], 0.1, white()); wing.rotation.x = sz * Math.PI / 2; wing.position.y = -0.22; wing.rotation.z = 0; g.add(wing);
    const tip = flat([[-1.5, 0], [-2.3, 0.75], [-2.5, 0.75], [-2.15, 0]], 0.06, paint(TEAL)); tip.position.set(0, -0.22, sz * 5.3); g.add(tip);
    const stab = flat([[-3.5, 0.25], [-4.7, 2.0], [-5.05, 2.0], [-4.65, 0.25]], 0.07, white()); stab.rotation.x = sz * Math.PI / 2; stab.position.y = 0.2; g.add(stab);
    const eng = cyl(0.3, 0.25, 1.3, white(), 28); eng.rotation.z = -Math.PI / 2; eng.position.set(0.25, -0.62, sz * 2.0); g.add(eng);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 10, 28), metal(0xd0d4de, { roughness: 0.15 })); lip.rotation.y = Math.PI / 2; lip.position.set(0.9, -0.62, sz * 2.0); g.add(lip);
    const fan = cyl(0.27, 0.27, 0.04, mat(0x06070a, { roughness: 0.4 }), 24); fan.rotation.z = Math.PI / 2; fan.position.set(0.86, -0.62, sz * 2.0); g.add(fan);
    const pyl = box(0.8, 0.26, 0.07, white()); pyl.position.set(0.1, -0.36, sz * 2.0); g.add(pyl);
    const nav = glow(sz > 0 ? 0x2aff6a : 0xff2a2a, 0.8, 0.9); nav.position.set(-1.85, -0.2, sz * 5.35); g.add(nav);
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.5), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xaab8e6, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); trail.position.set(-13.2, -0.62, sz * 2.0); g.add(trail);
  }
  const fin = flat([[-3.4, 0.4], [-4.75, 2.3], [-5.2, 2.3], [-4.7, 0.4]], 0.09, paint(TEAL)); g.add(fin);
  const strobe = glow(0xffffff, 1.4, 0); strobe.position.set(-5.1, 2.35, 0); g.add(strobe);
  shadowAll(g, true, false);
  const inner = g, wrap = new THREE.Group(); wrap.add(inner); inner.scale.setScalar(0.95);
  wrap.userData = { labelY: 4.9, tick(dt, vis, t) { inner.position.y = 1.9 + Math.sin(t * 0.9) * 0.07; inner.rotation.x = Math.sin(t * 0.6) * 0.035; inner.rotation.z = 0.02 + Math.sin(t * 0.45) * 0.012; strobe.material.opacity = (t % 1.4) < 0.07 ? 1 : 0; } };
  return wrap;
}
function makeStation() {
  const inner = new THREE.Group(), truss = metal(0xaab0c2, { roughness: 0.4 });
  inner.add(box(11.4, 0.3, 0.3, truss));
  for (let i = -5; i <= 5; i++) { const rib = box(0.05, 0.42, 0.42, truss); rib.position.x = i * 1.03; inner.add(rib); }
  for (const x of [-5.2, -3.8, 3.8, 5.2]) for (const sy of [-1, 1]) {
    const arr = solarPanel(1.15, 3.3); arr.rotation.x = Math.PI / 2; arr.position.set(x, sy * 2.0, 0); arr.rotation.y = sy * 0.12; inner.add(arr);
    const boom = cyl(0.03, 0.03, 0.5, truss, 8); boom.position.set(x, sy * 0.3, 0); inner.add(boom);
  }
  for (const x of [-1.9, 1.9]) { const rad = box(1.0, 1.9, 0.05, mat(0xc9ccd4, { roughness: 0.5 })); rad.position.set(x, -1.15, -0.2); rad.rotation.y = 0.3; inner.add(rad); }
  const lab1 = cyl(0.46, 0.46, 3.6, hull(SHELL, [3, 2]), 28); lab1.rotation.x = Math.PI / 2; lab1.position.set(0, -0.1, 0.3); inner.add(lab1);
  const lab2 = cyl(0.42, 0.42, 2.6, hull(SHELL, [3, 2]), 28); lab2.rotation.z = Math.PI / 2; lab2.position.set(0.4, -0.75, 1.5); inner.add(lab2);
  const lab3 = cyl(0.4, 0.4, 2.0, hull(0xd9dbe2, [2, 2]), 28); lab3.rotation.z = Math.PI / 2; lab3.position.set(-0.9, 0.55, 1.2); inner.add(lab3);
  for (const p of [[0, -0.1, 2.15], [1.75, -0.75, 1.5], [-1.95, 0.55, 1.2]]) { const node = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14), hull(SHELL, [2, 1])); node.position.set(p[0], p[1], p[2]); inner.add(node); }
  const cup = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat(0x09131f, { metalness: 0.9, roughness: 0.08, emissive: 0x1d6ea8, emissiveIntensity: 0.4 })); cup.position.set(0, -0.6, 2.3); inner.add(cup);
  const g = new THREE.Group(); g.add(inner); inner.scale.setScalar(0.92); inner.position.y = 2.2;
  g.userData = { labelY: 6.6, tick(dt, vis, t) { inner.rotation.y = 0.3 + Math.sin(t * 0.2) * 0.12; inner.rotation.x = Math.sin(t * 0.15) * 0.06; } };
  return g;
}
function makeProbe() {
  const inner = new THREE.Group(), rod = metal(0xb9bfd0, { roughness: 0.35 });
  const shield = cyl(1.3, 1.3, 0.1, mat(0xf4f2ec, { roughness: 0.85, emissive: 0xff6a1a, emissiveIntensity: 0.25 }), 48); shield.rotation.z = Math.PI / 2; shield.position.x = 0.5; inner.add(shield);
  const back = cyl(1.28, 1.2, 0.12, mat(0x15161c, { roughness: 0.7 }), 48); back.rotation.z = Math.PI / 2; back.position.x = 0.4; inner.add(back);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; inner.add(between([0.34, Math.cos(a) * 0.95, Math.sin(a) * 0.95], [-0.8, Math.cos(a) * 0.5, Math.sin(a) * 0.5], 0.025, rod)); }
  const bus = cyl(0.55, 0.55, 1.5, hull(0xc9ccd6, [2, 1], { metalness: 0.75, roughness: 0.4 }), 6); bus.rotation.z = Math.PI / 2; bus.position.x = -1.5; inner.add(bus);
  for (const sy of [-1, 1]) {
    const arr = solarPanel(1.5, 0.6); arr.rotation.x = Math.PI / 2; arr.rotation.z = sy * 0.5; arr.position.set(-1.9, sy * 1.15, 0.1); inner.add(arr);
    for (const sz of [-1, 1]) inner.add(between([-0.75, sy * 0.4, sz * 0.4], [-1.25, sy * 1.9, sz * 1.9], 0.015, rod));
  }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12, 0, Math.PI * 2, 0, 1.0), metal(0xe6e8ef, { side: THREE.DoubleSide })); dish.position.set(-1.6, 0, 0.78); dish.rotation.x = -Math.PI / 2; inner.add(dish);
  const boom = cyl(0.02, 0.02, 2.6, rod, 6); boom.rotation.z = Math.PI / 2; boom.position.x = -3.5; inner.add(boom);
  const hot = glow(0xff8a2a, 5.5, 0.5); hot.position.x = 1.1; inner.add(hot);
  const g = new THREE.Group(); g.add(inner); inner.scale.setScalar(1.5); inner.position.y = 2.1;
  g.userData = { labelY: 5.2, tick(dt, vis, t) { inner.rotation.x = t * 0.12; inner.rotation.y = 0.18 + Math.sin(t * 0.3) * 0.05; hot.material.opacity = 0.4 + 0.15 * Math.sin(t * 3); } };
  return g;
}
function makeStarship() {
  const r = makeRocket(8.6, 0.8), g = new THREE.Group(); g.add(r); r.position.y = 2.0;
  g.userData = { labelY: 4.7, tick(dt, vis, t) { r.userData.thrust(vis > 0.1 ? 1 : 0); r.position.y = 2.0 + Math.sin(t * 31) * 0.006; } };
  return g;
}
const VEHICLES = {
  car: { name: 'p_car', make: makeCar, alt: 0, surface: 'road', speed: [120, 'kmh'] },
  train: { name: 'p_train', make: makeBullet, alt: 0, surface: 'track', speed: [300, 'kmh'] },
  jet: { name: 'p_jet', make: makeJet, alt: 1, speed: [900, 'kmh'] },
  iss: { name: 'p_iss', make: makeStation, alt: 2, speed: [7.66, 'kms'] },
  probe: { name: 'p_probe', make: makeProbe, alt: 3, speed: [192, 'kms'] },
  rocket: { name: 'p_rocket', make: makeStarship, alt: 3, speed: [90, 'pct'] }
};
