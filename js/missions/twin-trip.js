/*
 * Mission 2: the twin trip (the twin paradox).
 * Fly Sara to a star and back while Omar ages at home.
 */
'use strict';

class TwinTrip {
  constructor(app) {
    this.app = app;
    this.view = { dist: 30, width: 26, height: 11 };
    const s = this.scene = new THREE.Scene(), sunAt = [-7, 4, 9];
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.camera.position.set(0, 0.6, 30);
    lights(s, { sun: sunAt, fill: 0.3 }); s.add(skyDome(1.0, 0.6));
    this.x0 = -7.2; this.x1 = 7.4;
    const earth = this.earth = makeEarth(1.7, sunAt); earth.position.set(-10, 0, 0); s.add(earth);
    this.star = new THREE.Group(); this.star.position.set(10, 0, 0); s.add(this.star);
    this.starLight = new THREE.PointLight(0xffffff, 2.2, 60, 1.6); this.starLight.position.set(9, 0, 3); s.add(this.starLight);
    const pts = [];
    for (let x = this.x0 - 0.4; x <= this.x1 + 0.4; x += 0.5) pts.push(new THREE.Vector3(x, 0, 0));
    const dots = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0x6f7cc0, size: 2, sizeAttenuation: false, transparent: true, opacity: 0.7 }));
    dots.position.y = -1.0; s.add(dots);
    this.rocket = makeRocket(3); s.add(this.rocket);
    this.dests = [
      { name: 'd_prox', ly: 4.24, cool: 0xff4a14, hot: 0xffc38a, round: false, planets: 1 },
      { name: 'd_sirius', ly: 8.6, cool: 0x8fb8ff, hot: 0xffffff, round: true, planets: 0 },
      { name: 'd_trap', ly: 40.7, cool: 0xd22c12, hot: 0xff9858, round: false, planets: 7 }];
    this.lblE = app.label(new THREE.Vector3(-10, 2.9, 0), 'earth');
    this.lblR = app.label(() => this._v.set(this.rocket.position.x, 1.7, 0), 'rocket');
    this.lblD = app.label(new THREE.Vector3(10, -2.9, 0), 'plain');
    this._v = new THREE.Vector3();
    this.phase = 'idle'; this.f = 0;
  }
  buildStar(d) {
    while (this.star.children.length) { const c = this.star.children.pop(); disposeTree(c); }
    this.sun = makeSun(1.2, d.cool, d.hot, 0.8); this.star.add(this.sun);
    this.starLight.color.setHex(d.hot);
    this.planets = [];
    for (let i = 0; i < d.planets; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.1 + 0.05 * (i % 3), 16, 12), mat([0x8fb0d8, 0xc79a78, 0x7fb890][i % 3], { roughness: 0.9 }));
      p.userData = { r: 1.9 + i * 0.36, w: 1.5 / (1 + i * 0.5), a: i * 2.1 };
      this.star.add(p); this.planets.push(p);
    }
  }
  start(step) {
    const a = this.app;
    this.step = step; this.d = this.dests[step];
    this.buildStar(this.d);
    this.phase = 'idle'; this.f = 0; this.tau = 0;
    a.task('m2c' + (step + 1)); a.speed({ show: true, max: 0.999 }); a.primary('launch'); a.quiz(null);
    a.custom(el => { el.innerHTML = '<div class="twins"><div class="twin earth"><small></small><b class="digits"></b></div><div class="twin rocket"><small></small><b class="digits"></b></div></div>'; this.twinEl = el; });
  }
  onBeta() { if (this.phase === 'done') { this.phase = 'idle'; this.f = 0; } }
  onPrimary() {
    const a = this.app;
    if (this.phase === 'fly') return;
    if (a.beta < 0.01) return a.fail('needSpeed');
    this.b = a.beta;
    const total = this.d.ly * (this.d.round ? 2 : 1);
    this.T = Phys.trip(total, this.b);
    this.phase = 'fly'; this.tau = 0; this.f = 0;
    a.clearFeedback(); a.speed({ show: true, max: 0.999, disabled: true }); a.primary('flying', true);
    Sfx.launch(this.d.round ? 9 : 6);
  }
  finish() {
    const a = this.app, T = this.T, r = T.rocket, e = T.earth, f1 = x => x.toFixed(1);
    this.phase = 'done'; Sfx.arrive();
    a.speed({ show: true, max: 0.999 }); a.primary('launch');
    if (this.step === 0) {
      if (r >= 2.5 && r <= 3.5) a.win('m2ok1', { r: f1(r), e: f1(e), a: f1(10 + e) });
      else a.fail(r > 3.5 ? 'm2long' : 'm2short', { r: f1(r) });
    } else if (this.step === 1) {
      const d = e - r;
      if (d >= 9 && d <= 11) a.win('m2ok2', { s: f1(10 + r), o: f1(10 + e), d: f1(d) });
      else a.fail(d < 9 ? 'm2diffSmall' : 'm2diffBig', { d: f1(d) });
    } else {
      if (r <= 5) a.win('m2ok3', { s: f1(10 + r), e: f1(e), o: f1(10 + e) });
      else a.fail('m2late', { s: f1(10 + r) });
    }
  }
  update(dt) {
    const a = this.app, d = this.d, round = d.round;
    const b = this.phase === 'idle' ? a.beta : this.b, root = Phys.root(b);
    if (this.phase === 'fly') {
      const leg = round ? 4.2 : 6, pause = 0.7;
      this.tau += dt;
      if (!round) this.f = Math.min(1, this.tau / leg);
      else this.f = this.tau < leg ? this.tau / leg / 2 : this.tau < leg + pause ? 0.5 : Math.min(1, 0.5 + (this.tau - leg - pause) / leg / 2);
      if (this.f >= 1) this.finish();
    }
    const f = this.f, back = round && f > 0.5;
    const along = !round ? f : f <= 0.5 ? f * 2 : 2 - f * 2;      // 0 at Earth, 1 at the star
    this.rocket.position.set(this.x0 + (this.x1 - this.x0) * along, 0, 0);
    this.rocket.rotation.y = back ? Math.PI : 0;
    const moving = this.phase === 'fly' && !(round && f === 0.5);
    this.rocket.scale.x = moving ? root : 1;
    this.rocket.userData.thrust(moving ? 0.5 + 0.5 * b : 0);
    for (const p of this.planets) { const u = p.userData; u.a += dt * u.w; p.position.set(Math.cos(u.a) * u.r, Math.sin(u.a) * u.r * 0.28, Math.sin(u.a) * u.r); }
    this.earth.userData.tick(dt, 0.15); this.sun.userData.tick(dt);

    const T = this.phase === 'idle' ? { earth: 0, rocket: 0 } : this.T;
    const eY = f * T.earth, rY = f * T.rocket;
    const left = d.ly * (round ? (f <= 0.5 ? 1 - 2 * f : 2 - 2 * f) : 1 - f) * (this.phase === 'done' ? 0 : 1);
    const ageO = (10 + eY).toFixed(1), ageS = (10 + rY).toFixed(1);
    this.lblE.set(t('omar') + ' · ' + t('age') + ' <b>' + ageO + '</b>');
    this.lblR.set(t('sara') + ' · ' + t('age') + ' <b>' + ageS + '</b>');
    this.lblD.set(t(d.name) + ' · <b>' + d.ly + '</b> ' + t('ly', { n: '' }).trim());
    if (this.twinEl) {
      const [e1, e2] = this.twinEl.querySelectorAll('.twin');
      e1.firstChild.textContent = t('omar') + ' · ' + t('age'); e1.lastChild.textContent = ageO;
      e2.firstChild.textContent = t('sara') + ' · ' + t('age'); e2.lastChild.textContent = ageS;
    }
    a.readouts([
      { k: 'm2r1', v: '+' + t('yrs', { n: eY.toFixed(1) }), tone: 'earth' },
      { k: 'm2r2', v: '+' + t('yrs', { n: rY.toFixed(1) }), tone: 'rocket' },
      { k: 'm2r3', v: (root * 100).toFixed(root < 0.1 ? 1 : 0) + '%', tone: 'light' },
      { k: 'm2r4', v: t('ly', { n: (left * root).toFixed(1) }), tone: 'rocket' }]);
  }
}
