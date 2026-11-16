/*
 * Mission 6: the lightning train (relativity of simultaneity).
 * Einstein's thought experiment, watched from the platform and from the train.
 * trainCar() also builds the bullet train used in the Free Lab.
 */
'use strict';

function trainCar(len, end) {                      // end: 0 = middle car, 1 = nose at +x, -1 = nose at -x
  const g = new THREE.Group(), noseL = end ? 1.6 : 0, bodyL = len - noseL, off = -end * noseL / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-0.9, 0.5); sh.lineTo(-0.95, 1.5); sh.quadraticCurveTo(-0.92, 2.1, -0.5, 2.2); sh.lineTo(0.5, 2.2); sh.quadraticCurveTo(0.92, 2.1, 0.95, 1.5); sh.lineTo(0.9, 0.5); sh.lineTo(-0.9, 0.5);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: bodyL, bevelEnabled: false, curveSegments: 10 }); geo.translate(0, 0, -bodyL / 2);
  const body = new THREE.Mesh(geo, paint(SHELL, { roughness: 0.3 })); body.rotation.y = Math.PI / 2; body.position.x = off; g.add(body);
  const wc = canvas(256, 32), wg = wc.getContext('2d'); wg.fillStyle = '#05070c'; wg.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 6; i++) { wg.fillStyle = Math.random() < 0.8 ? '#ffe7b0' : '#3a3220'; wg.fillRect(8 + i * 42, 6, 30, 20); }
  const wt = tex(wc, { own: true });
  const glassBand = box(bodyL * 0.9, 0.46, 1.93, new THREE.MeshStandardMaterial({ color: 0x0a0d16, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.1, roughness: 0.1, metalness: 0.7 })); glassBand.position.set(off, 1.62, 0); g.add(glassBand);
  const stripe = box(bodyL, 0.14, 1.925, paint(CORAL)); stripe.position.set(off, 1.12, 0); g.add(stripe);
  const skirt = box(len * 0.94, 0.34, 1.6, mat(0x1a1d28, { roughness: 0.8 })); skirt.position.set(0, 0.36, 0); g.add(skirt);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(0.26, 0.26, 0.12, metal(0x4a4f60), 16); w.rotation.x = Math.PI / 2; w.position.set(sx * len * 0.3, 0.3, sz * 0.78); g.add(w); }
  const ac = box(bodyL * 0.4, 0.12, 0.9, mat(0xc9ccd6)); ac.position.set(off, 2.24, 0); g.add(ac);
  if (end) {
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2), paint(SHELL, { roughness: 0.3 }));
    nose.rotation.z = -end * Math.PI / 2; nose.scale.set(0.86, noseL, 0.95); nose.position.set(end * (len / 2 - noseL), 1.34, 0); g.add(nose);
    const wind = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x06080e, { roughness: 0.05, metalness: 0.9 }));
    wind.rotation.z = -end * Math.PI / 2; wind.scale.set(0.3, noseL * 0.5, 0.6); wind.position.set(end * (len / 2 - noseL * 0.98), 1.95, 0); g.add(wind);
    const lamp = glow(end > 0 ? 0xfff2c0 : 0xff3a2a, 1.7, 0.9); lamp.position.set(end * (len / 2 - 0.25), 0.95, 0); g.add(lamp);
  }
  return g;
}

class Train {
  constructor(app) {
    this.app = app;
    this.view = { dist: 40, width: 31, height: 13 };
    this.c = 10; this.L0 = 20;                 // 10 units = 1 light-second; the train is 2 light-seconds long
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.camera.position.set(0, 20, 34.6); this.camera.lookAt(0, 0.5, 1);
    lights(s, { sun: [-6, 12, 9], color: 0xbfd0ff, power: 1.5, fill: 0.55, sky: 0x5f76c8, ground: 0x0a0c16, shadow: 28 });
    s.add(skyDome(0.2, 1.0)); s.fog = new THREE.Fog(NIGHT, 55, 170);
    const moon = makeRock(11, 'moon'); moon.material.fog = false; moon.position.set(-80, 62, -230); s.add(moon);
    this.hemi = s.userData.hemi; this.flash = 0;

    // everything fixed to the platform (Omar's frame): ground, track, platform, lamps
    const P = this.platG = new THREE.Group(); s.add(P);
    const gc = canvas(256, 256), gg = gc.getContext('2d'); gg.fillStyle = '#0b0e19'; gg.fillRect(0, 0, 256, 256);
    const gi = gg.getImageData(0, 0, 256, 256); for (let i = 0; i < gi.data.length; i += 4) { const n = (Math.random() - 0.5) * 16; gi.data[i] += n; gi.data[i + 1] += n; gi.data[i + 2] += n * 1.3; } gg.putImageData(gi, 0, 0);
    gg.strokeStyle = 'rgba(90,110,190,.35)'; gg.lineWidth = 2; gg.strokeRect(0, 0, 256, 256);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), mat(0xffffff, { map: tex(gc, { repeat: [240, 160], own: true }), roughness: 0.95, metalness: 0, envMapIntensity: 0.3 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -150); ground.receiveShadow = true; P.add(ground);
    const bed = box(300, 0.12, 3.4, mat(0x1c1f2b, { roughness: 1 })); bed.position.y = 0.06; bed.receiveShadow = true; P.add(bed);
    for (const z of [-0.8, 0.8]) { const rail = box(300, 0.16, 0.12, metal(0xaab2c8, { roughness: 0.25 })); rail.position.set(0, 0.22, z); P.add(rail); }
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.1, 2.5), mat(0x6f7480, { roughness: 0.9 }), 151), m4 = new THREE.Matrix4();
    for (let i = 0; i < 151; i++) { m4.makeTranslation((i - 75) * 2, 0.13, 0); sl.setMatrixAt(i, m4); }
    sl.receiveShadow = true; P.add(sl);
    const pc = canvas(128, 128), pg = pc.getContext('2d'); pg.fillStyle = '#2a2f42'; pg.fillRect(0, 0, 128, 128);
    const pi = pg.getImageData(0, 0, 128, 128); for (let i = 0; i < pi.data.length; i += 4) { const n = (Math.random() - 0.5) * 18; pi.data[i] += n; pi.data[i + 1] += n; pi.data[i + 2] += n; } pg.putImageData(pi, 0, 0);
    pg.strokeStyle = 'rgba(10,12,24,.7)'; pg.lineWidth = 2; pg.strokeRect(0, 0, 128, 128);
    const slab = box(300, 0.6, 3.6, mat(0xffffff, { map: tex(pc, { repeat: [150, 2], own: true }), roughness: 0.85 })); slab.position.set(0, 0.3, 4.6); slab.receiveShadow = true; P.add(slab);
    const tact = box(300, 0.02, 0.24, mat(0xf2c21a, { roughness: 0.7 })); tact.position.set(0, 0.61, 3.15); P.add(tact);
    const edge = box(300, 0.08, 0.08, lit(TEAL, 1.2)); edge.position.set(0, 0.58, 2.8); P.add(edge);
    for (let i = -14; i <= 14; i++) {
      if (!i) continue;
      const post = cyl(0.07, 0.09, 3.6, metal(0x8a93b0), 10); post.position.set(i * 10, 2.4, 6.1); post.castShadow = true; P.add(post);
      const arm = box(0.08, 0.08, 1.3, metal(0x8a93b0)); arm.position.set(i * 10, 4.15, 5.5); P.add(arm);
      const head = box(0.5, 0.1, 0.34, lit(0xffe6b8, 2)); head.position.set(i * 10, 4.08, 4.95); P.add(head);
      const halo = glow(0xffd9a0, 2.6, 0.55); halo.position.set(i * 10, 4.0, 4.95); P.add(halo);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffd9a0, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(i * 10, 0.62, 4.6); P.add(pool);
    }
    this.omar = makeAstronaut(TEAL); this.omar.scale.setScalar(2.1); this.omar.position.set(0, 0.6, 4.3); shadowAll(this.omar, true, false); P.add(this.omar);
    const scorch = () => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.visible = false; return m; };
    this.markP = [scorch(), scorch()]; this.markP.forEach(m => { m.position.set(0, 0.3, 0); P.add(m); });

    // the train (Sara's frame)
    const T = this.trainG = new THREE.Group(); s.add(T);
    for (let i = 0; i < 5; i++) { const car = trainCar(3.8, i === 0 ? -1 : i === 4 ? 1 : 0); car.position.x = (i - 2) * 4.05; shadowAll(car, true, false); T.add(car); }
    this.sara = makeAstronaut(CORAL); this.sara.scale.setScalar(2.1); this.sara.position.set(0, 2.3, 0); shadowAll(this.sara, true, false); T.add(this.sara);
    this.markT = [scorch(), scorch()]; this.markT[0].position.set(-9.2, 2.27, 0); this.markT[1].position.set(9.2, 2.27, 0); this.markT.forEach(m => { m.scale.setScalar(0.55); T.add(m); });

    // light shells, bolts, and the flash each observer sees
    this.rings = [0, 1].map(() => {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.945, 1, 160), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      const fill = new THREE.Mesh(new THREE.CircleGeometry(0.945, 96), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      r.add(fill);
      r.rotation.x = -Math.PI / 2; r.position.y = 0.7; r.visible = false; s.add(r); return r;
    });
    const ribbon = (pts, w) => {                     // a jagged strip of light
      const v = [];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; v.push(a[0] - w, a[1], 0, a[0] + w, a[1], 0, b[0] + w, b[1], 0, a[0] - w, a[1], 0, b[0] + w, b[1], 0, b[0] - w, b[1], 0); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    };
    this.bolts = [0, 1].map(() => {
      const main = [], g = new THREE.Group(); let x = 0;
      for (let y = 24; y >= 2.2; y -= 1.3) { main.push([x, y]); x = y > 4 ? x * 0.55 + rnd(-1.1, 1.1) : 0; }
      main.push([0, 2.2]);
      g.add(ribbon(main, 0.09));
      for (let k = 0; k < 3; k++) { const st = main[3 + k * 4], br = [st]; let bx = st[0], by = st[1]; const dir = k % 2 ? 1 : -1; for (let j = 0; j < 4; j++) { bx += dir * rnd(0.5, 1.2); by -= rnd(0.6, 1.3); br.push([bx, by]); } g.add(ribbon(br, 0.04)); }
      const f = glow(0xfff2c0, 11, 1); f.position.y = 2.4; g.add(f);
      g.visible = false; s.add(g); return g;
    });
    this.pulseO = glow(GOLD, 6, 0); this.pulseO.position.set(0, 3, 4.3); s.add(this.pulseO);
    this.pulseS = glow(GOLD, 6, 0); this.pulseS.position.set(0, 4.7, 0); s.add(this.pulseS);

    const v = this._v = new THREE.Vector3();
    this.lblO = app.label(() => v.set(this.xO, 0.2, 8.2), 'earth');
    this.lblS = app.label(() => v.set(this.xS, 6.6, -1.5), 'rocket');
    this.lblF = app.label(() => v.set(this.xEnds[1], 3.6, -2.6), 'plain');
    this.lblB = app.label(() => v.set(this.xEnds[0], 3.6, -2.6), 'plain');
    this.frame = 0; this.tau0 = -1.1; this.tau = this.tau0; this.playing = false;
    this.xO = 0; this.xS = 0; this.xEnds = [-10, 10];
    this.arr = { O: [null, null], S: [null, null] };
    this.struck = [false, false];
  }
  beta() { return this.step === 2 ? this.app.beta : 0.6; }
  rewind() { this.camX = undefined; this.tau = this.tau0; this.playing = false; this.struck = [false, false]; this.arr = { O: [null, null], S: [null, null] }; this.pulseO.material.opacity = this.pulseS.material.opacity = 0; }
  seg() { this.app.extra([{ id: 'frame', options: ['m6v1', 'm6v2'], value: this.frame, disabled: this.step < 2 || this.playing }]); }
  start(step) {
    const a = this.app;
    this.step = step; this.frame = step ? 1 : 0; this.rewind();
    a.task('m6c' + (step + 1));
    if (step === 0) { a.speed({ show: false }); a.primary(null); a.quiz(['m6q1', 'm6q2', 'm6q3']); }
    else if (step === 1) { a.speed({ show: false }); a.primary(null); a.quiz(['m6q4', 'm6q5', 'm6q6']); }
    else { a.quiz(null); a.setBeta(0.2); a.speed({ show: true, max: 0.9 }); a.primary('strike'); }
    this.seg();
  }
  onBeta() { if (!this.playing) this.rewind(); }
  onExtra(id, i) { if (this.playing) return; this.frame = i; this.rewind(); this.seg(); }
  play() {
    const b = this.beta(), c = this.c, L0 = this.L0;
    this.rewind(); this.playing = true;
    this.tauEnd = (this.frame === 0 ? L0 * Phys.root(b) / (2 * c * (1 - b)) : L0 * (1 + b) / (2 * c)) + 0.6;
    this.app.clearFeedback(); this.seg(); Sfx.engine(0.5, 0.12);
  }
  onQuiz(i) { if (this.playing) return null; this.answer = i; this.play(); return null; }      // judged when the replay ends
  onPrimary() {
    if (this.playing) return;
    this.play(); this.app.speed({ show: true, max: 0.9, disabled: true }); this.app.primary('strike', true);
  }
  done() {
    const a = this.app;
    this.playing = false; this.seg(); Sfx.engine(0);
    if (this.step < 2) {
      const ok = this.answer === 0;
      a.quizMark(this.answer, ok);
      ok ? a.win(this.step ? 'm6ok2' : 'm6ok1') : a.fail(this.step ? 'm6no2' : 'm6no1');
    } else {
      const gap = this.beta() * this.L0 / this.c;
      a.speed({ show: true, max: 0.9 }); a.primary('strike');
      Math.abs(gap - 1) <= 0.1 ? a.win('m6ok3', { v: pct(this.beta()) }) : a.fail('m6no3', { g: gap.toFixed(2) });
    }
  }
  update(dt) {
    const a = this.app, b = this.beta(), g = Phys.gamma(b), c = this.c, L0 = this.L0, Lp = L0 / g;
    if (this.playing) { this.tau += dt * 0.8; if (this.tau >= this.tauEnd) { this.tau = this.tauEnd; this.done(); } }
    const tau = this.tau, S = this.frame === 0;
    // the two strikes as events (time, place) in the frame we are watching from; index 0 = rear, 1 = front
    const ev = S ? [{ t: 0, x: -Lp / 2 }, { t: 0, x: Lp / 2 }]
                 : [{ t: b * L0 / (2 * c), x: -L0 / 2 }, { t: -b * L0 / (2 * c), x: L0 / 2 }];
    if (S) { this.trainG.position.x = b * c * tau; this.trainG.scale.x = 1 / g; this.platG.position.x = 0; this.platG.scale.x = 1; this.xS = b * c * tau; this.xO = 0; this.xEnds = [this.xS - Lp / 2, this.xS + Lp / 2]; }
    else { this.trainG.position.x = 0; this.trainG.scale.x = 1; this.platG.position.x = -b * c * tau; this.platG.scale.x = 1 / g; this.xS = 0; this.xO = -b * c * tau; this.xEnds = [-L0 / 2, L0 / 2]; }
    this.markP[0].position.x = -Lp / 2; this.markP[1].position.x = Lp / 2;   // platform coordinates
    // the camera drifts to keep both Omar and Sara in the shot
    const mid = (this.xO + this.xS) / 2; this.camX = this.camX === undefined ? mid : this.camX + (mid - this.camX) * Math.min(1, dt * 4);
    this.camera.position.x = this.camX;
    this.pulseO.position.x = this.xO; this.pulseS.position.x = this.xS;
    for (let i = 0; i < 2; i++) {
      const since = tau - ev[i].t, on = since >= 0, ring = this.rings[i];
      ring.visible = on && since > 0.001;
      if (on) { const r = Math.max(0.001, c * since); ring.position.x = ev[i].x; ring.scale.set(r, r, 1); ring.material.opacity = Math.max(0.35, 1 - r / 30); }
      this.bolts[i].visible = on && since < 0.2; this.bolts[i].position.x = ev[i].x;
      if (on && this.playing && !this.struck[i]) { this.struck[i] = true; this.flash = 1; Sfx.thunder(); }
      this.markP[i].visible = on; this.markT[i].visible = on;
      if (on) for (const [k, x, pulse] of [['O', this.xO, this.pulseO], ['S', this.xS, this.pulseS]]) {
        if (this.arr[k][i] === null && c * since >= Math.abs(x - ev[i].x)) { this.arr[k][i] = tau; pulse.material.opacity = 1; if (this.playing) Sfx.ping(i === 1); }
      }
    }
    this.pulseO.material.opacity *= Math.pow(0.05, dt); this.pulseS.material.opacity *= Math.pow(0.05, dt);
    this.flash *= Math.pow(0.004, dt); this.hemi.intensity = 0.55 + 3 * this.flash;
    const saw = ar => {
      const [r, f] = ar;
      if (r === null && f === null) return t('sawNone');
      if (r !== null && f !== null) return Math.abs(r - f) < 0.03 ? t('sawBoth') : f < r ? t('sawFR') : t('sawR') + ' → ' + t('sawF');
      return f !== null ? t('sawF') : t('sawR');
    };
    this.lblO.set(t('omar') + ' · ' + saw(this.arr.O));
    this.lblS.set(t('sara') + ' · ' + saw(this.arr.S));
    this.lblF.set(t('front')); this.lblB.set(t('rear'));
    const sec = x => t('secs', { n: (x < 0 ? '−' : x > 0 ? '+' : '') + Math.abs(x).toFixed(2) });
    a.readouts([
      { k: 'm6r3', v: sec(tau), tone: S ? 'earth' : 'rocket' },
      { k: 'm6r1', v: tau >= ev[1].t ? sec(ev[1].t) : '—', tone: 'light' },
      { k: 'm6r2', v: tau >= ev[0].t ? sec(ev[0].t) : '—', tone: 'light' }]);
  }
}
