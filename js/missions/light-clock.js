/*
 * Missions 1 and 3: the light clock.
 * Mission 1 (time dilation): speed up the rocket and watch its clock tick slower.
 * Mission 3 (speed detective): work out a mystery ship's speed from its clock alone.
 */
'use strict';

function makeLightClock(accent, H) {
  const g = new THREE.Group();
  const mm = () => new THREE.MeshStandardMaterial({ color: 0xe6e9f5, emissive: GOLD, emissiveIntensity: 0, roughness: 0.08, metalness: 1 });
  const bottom = cyl(0.7, 0.74, 0.14, mm(), 40); bottom.position.y = -0.07; g.add(bottom);
  const top = cyl(0.74, 0.7, 0.14, mm(), 40); top.position.y = H + 0.07; g.add(top);
  for (const y of [-0.17, H + 0.17]) { const cap = cyl(0.78, 0.78, 0.06, paint(accent), 40); cap.position.y = y; g.add(cap); }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, H, 40, 1, true), glass(0xcfeaff, 0.1)); tube.position.y = H / 2; g.add(tube);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5, rod = cyl(0.025, 0.025, H, metal(0xc9cede), 8); rod.position.set(Math.cos(a) * 0.7, H / 2, Math.sin(a) * 0.7); g.add(rod); }
  const photon = new THREE.Group();
  photon.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), lit(0xfff6c4, 1.6)));
  photon.add(glow(GOLD, 1.5, 0.85));
  g.add(photon);
  return { group: g, photon, top, bottom };
}

class LightClock {
  constructor(app, opts = {}) {
    this.app = app;
    this.mode = opts.mode || 'm1';           // 'm1' | 'm3'
    this.H = 2.4; this.cS = 5; this.X = 13;
    this.baseS = -4.7; this.baseR = 0.5;
    this.view = { dist: 30, width: 21.5, height: 13.2 };
    const s = this.scene = new THREE.Scene(), sunAt = [9, 7, 10];
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.camera.position.set(0, 0, 30);
    lights(s, { sun: sunAt, fill: 0.35 }); s.add(skyDome(0.4, 2.2));
    const earth = this.earth = makeEarth(8, sunAt); earth.position.set(-11, -13.5, -9); s.add(earth);

    // Omar's station
    const st = new THREE.Group(); st.position.set(0, this.baseS, 0); s.add(st);
    const deck = box(6.4, 0.26, 2.6, hull(0x9299b3, [3, 1], { metalness: 0.6, roughness: 0.45 })); deck.position.y = -0.3; st.add(deck);
    const strip = box(6.44, 0.07, 0.08, lit(TEAL, 1.3)); strip.position.set(0, -0.2, 1.31); st.add(strip);
    const pod = cyl(0.8, 0.8, 5.4, hull(SHELL, [3, 2]), 32); pod.rotation.z = Math.PI / 2; pod.position.y = -1.3; st.add(pod);
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 16), hull(SHELL, [2, 1])); cap.scale.x = 0.45; cap.position.set(sx * 2.7, -1.3, 0); st.add(cap);
      const arm = box(3.2, 0.12, 0.12, metal()); arm.position.set(sx * 4.6, -1.3, 0); st.add(arm);
      for (const k of [0, 1]) { const wing = solarPanel(2.5, 1.6); wing.position.set(sx * (5.1 + k * 2.75), -1.3, 0); wing.rotation.x = 1.25; st.add(wing); }
    }
    const mast = cyl(0.03, 0.03, 1.5, metal(), 8); mast.position.set(2.7, 0.55, -0.9); st.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, 1.0), metal(0xdfe3ee, { side: THREE.DoubleSide })); dish.position.set(2.7, 1.5, -0.9); dish.rotation.set(2.6, 0, -0.5); st.add(dish);
    this.cs = makeLightClock(TEAL, this.H); st.add(this.cs.group);
    const omar = makeAstronaut(TEAL); omar.position.set(-1.9, -0.17, 0.5); omar.rotation.y = 0.5; st.add(omar);

    // Sara's ship (or the mystery ship): a glass cabin so you can see the clock inside
    const tint = this.mode === 'm3' ? 0x9a6cff : CORAL;
    this.ship = new THREE.Group(); this.ship.position.set(-6, this.baseR, 0); s.add(this.ship);
    const hull_ = this.hull = new THREE.Group(); this.ship.add(hull_);
    this.cr = makeLightClock(tint, this.H); hull_.add(this.cr.group);
    const hw = 3.3, hh = this.H + 0.9, cy = this.H / 2, bar = metal(0xd5d9e6);
    const cabin = box(hw, hh, 1.3, glass(0xbfe2ff, 0.11)); cabin.position.y = cy; hull_.add(cabin);
    for (const sy of [-1, 1]) {
      const plate = box(hw + 0.1, 0.1, 1.4, hull(SHELL, [2, 1])); plate.position.y = cy + sy * hh / 2; hull_.add(plate);
      for (const sz of [-1, 1]) { const b = box(hw, 0.07, 0.07, bar); b.position.set(0, cy + sy * (hh / 2 - 0.08), sz * 0.65); hull_.add(b); }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = box(0.07, hh, 0.07, bar); b.position.set(sx * hw / 2, cy, sz * 0.65); hull_.add(b); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), paint(tint));
    nose.rotation.z = -Math.PI / 2; nose.scale.set(hh / 2 + 0.05, 1.7, 0.7); nose.position.set(hw / 2, cy, 0); hull_.add(nose);
    const engine = box(0.55, hh * 0.7, 1.15, metal(0x3d425a, { roughness: 0.5 })); engine.position.set(-hw / 2 - 0.27, cy, 0); hull_.add(engine);
    const finShape = new THREE.Shape(); finShape.moveTo(0.6, 0); finShape.lineTo(-0.95, 1.0); finShape.lineTo(-1.15, 1.0); finShape.lineTo(-0.9, 0); finShape.lineTo(0.6, 0);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    this.plumes = [];
    for (const sy of [-1, 1]) {
      const fin = new THREE.Mesh(finGeo, paint(tint)); fin.scale.y = sy; fin.position.set(-hw / 2 + 0.5, cy + sy * hh / 2, -0.05); hull_.add(fin);
      const bell = new THREE.Mesh(new THREE.LatheGeometry([[0.16, 0.2], [0.2, 0.08], [0.34, -0.12], [0.42, -0.3]].map(p => new THREE.Vector2(p[0], p[1])), 24), metal(0x565b72, { side: THREE.DoubleSide }));
      bell.rotation.z = -Math.PI / 2; bell.position.set(-hw / 2 - 0.6, cy + sy * 0.72, 0); hull_.add(bell);
      const pl = makePlume(0.34, 2.4, this.mode === 'm3' ? 0x7dffb0 : 0xff8a2a); pl.position.set(-hw / 2 - 0.85, cy + sy * 0.72, 0); hull_.add(pl); this.plumes.push(pl);
    }
    if (this.mode !== 'm3') { const sara = makeAstronaut(CORAL); sara.scale.setScalar(0.9); sara.position.set(-1.2, -0.4, 0.2); sara.rotation.y = 0.6; hull_.add(sara); }

    // the rocket photon's path as Omar sees it
    this.N = 220;
    const tg = new THREE.BufferGeometry();
    this.tpos = new Float32Array(this.N * 3);
    const tcol = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) { const k = Math.pow(1 - i / this.N, 1.6); tcol.set([k, k * 0.82, k * 0.25], i * 3); }
    tg.setAttribute('position', new THREE.BufferAttribute(this.tpos, 3));
    tg.setAttribute('color', new THREE.BufferAttribute(tcol, 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.trail.frustumCulled = false; s.add(this.trail);

    this.lblS = app.label(new THREE.Vector3(2.9, this.baseS + 1.2, 0), 'earth');
    this.lblR = app.label(() => this._lp.set(this.ship.position.x, this.baseR + this.H + 1.35, 0), 'rocket');
    this._lp = new THREE.Vector3();
    this.hidden = 0; this.jet = false;
    this.reset(-6);
  }
  shipBeta() { return this.mode === 'm3' ? this.hidden : this.jet ? 0 : this.app.beta; }
  reset(x) {
    this.sPhase = 0; this.rPhase = 0;
    if (x !== undefined) this.x = x;
    this.fillTrail();
  }
  fillTrail() {
    for (let i = 0; i < this.N; i++) this.tpos.set([this.x, this.baseR, 0], i * 3);
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  start(step) {
    const a = this.app;
    this.step = step; this.jet = false;
    if (this.mode === 'm1') {
      if (step < 2) {
        a.task(step ? 'm1c2' : 'm1c1'); a.speed({ show: true, max: 0.999 }); a.quiz(null); a.primary('check');
      } else {
        this.jet = true; this.x = 3.5; this.reset();
        a.task('m1c3'); a.speed({ show: false }); a.primary(null);
        a.quiz(['m1q1', 'm1q2', 'm1q3', 'm1q4']);
      }
    } else if (this.mode === 'm3') {
      this.hidden = [0.6, 0.8, 0.96][step];
      this.reset(-12);
      a.setBeta(0);
      a.task(step ? 'm3c2' : 'm3c', { n: step + 1 }); a.speed({ show: true, max: 0.999 }); a.primary('check');
    }
  }
  onBeta() { if (this.mode !== 'm3') this.reset(); }
  onPrimary() {
    const a = this.app, b = a.beta;
    if (this.mode === 'm1') {
      const rate = Phys.root(b), target = this.step ? 0.2 : 0.5, tol = this.step ? 0.025 : 0.03;
      if (Math.abs(rate - target) <= tol) a.win('m1ok', { v: pct(b), g: Phys.gamma(b).toFixed(1) });
      else a.fail(rate > target ? 'm1slow' : 'm1fast', { r: (rate * 10).toFixed(1) });
    } else if (this.mode === 'm3') {
      if (this.sPhase < 3) return a.fail('m3wait');
      if (Math.abs(b - this.hidden) <= 0.025) a.win('m3ok', { v: pct(this.hidden) });
      else a.fail(b < this.hidden ? 'm3noFast' : 'm3noSlow', { p: (this.sPhase * Phys.root(b)).toFixed(1), m: this.rPhase.toFixed(1) });
    }
  }
  onQuiz(i) {
    if (i === 2) this.app.win('m1q_ok'); else this.app.fail('m1q_no');
    return i === 2;
  }
  update(dt) {
    const b = this.shipBeta(), root = Phys.root(b), H = this.H;
    const tri = p => { const f = p % 2; return f < 1 ? f : 2 - f; };
    const s0 = Math.floor(this.sPhase), r0 = Math.floor(this.rPhase);
    this.sPhase += dt * this.cS / H;
    this.rPhase += dt * this.cS * root / H;
    if (this.mode === 'm3' && this.sPhase > 40) { this.sPhase = 0; this.rPhase = 0; }
    this.x += b * this.cS * dt;
    if (this.x > this.X) { this.x = -this.X; this.fillTrail(); }
    this.ship.position.x = this.x;
    this.hull.scale.x = root;                         // length contraction, for free
    for (const p of this.plumes) p.userData.power(b > 0.001 ? 0.45 + 0.55 * b : 0);
    this.cs.photon.position.y = tri(this.sPhase) * H;
    const py = tri(this.rPhase) * H;
    this.cr.photon.position.y = py;
    // mirror flashes on each tick
    const flash = (clock, n0, n1) => {
      if (n1 !== n0) { (n1 % 2 ? clock.top : clock.bottom).material.emissiveIntensity = 2.6; Sfx.tick(clock === this.cr); }
      for (const m of [clock.top, clock.bottom]) m.material.emissiveIntensity *= Math.pow(0.02, dt);
    };
    flash(this.cs, s0, Math.floor(this.sPhase));
    flash(this.cr, r0, Math.floor(this.rPhase));
    // trail
    this.tpos.copyWithin(3, 0, (this.N - 1) * 3);
    this.tpos[0] = this.x; this.tpos[1] = this.baseR + py; this.tpos[2] = 0;
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.earth.userData.tick(dt, 0.012);

    const sT = Math.floor(this.sPhase), rT = Math.floor(this.rPhase);
    this.lblS.set(t('omar') + ' · <b>' + sT + '</b> ' + t('ticks'));
    this.lblR.set((this.mode === 'm3' ? t('mystery') : t('sara')) + ' · <b>' + rT + '</b> ' + t('ticks'));
    if (this.mode === 'm1') {
      const rows = [{ k: 'm1r1', v: sT, tone: 'earth' }, { k: 'm1r2', v: rT, tone: 'rocket' }];
      if (!this.jet) rows.push({ k: 'm1r3', v: (root * 10).toFixed(1), tone: 'light' });
      this.app.readouts(rows);
    } else if (this.mode === 'm3') {
      this.app.readouts([
        { k: 'm1r1', v: this.sPhase.toFixed(1), tone: 'earth' },
        { k: 'm3r2', v: this.rPhase.toFixed(1), tone: 'rocket' },
        { k: 'm3r3', v: (this.sPhase * Phys.root(this.app.beta)).toFixed(1), tone: 'light' }]);
    }
  }
}
