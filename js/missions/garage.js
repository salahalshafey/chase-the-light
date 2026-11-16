/*
 * Mission 4: the space garage (length contraction).
 * Fly a 100 m ship fast enough to fit inside a shorter garage.
 */
'use strict';

class Garage {
  constructor(app) {
    this.app = app;
    this.view = { dist: 36, width: 34, height: 13 };
    const s = this.scene = new THREE.Scene(), sunAt = [-7, 10, 12];
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.camera.position.set(0, 5, 35.6); this.camera.lookAt(0, 0.4, 0);
    lights(s, { sun: sunAt, shadow: 17, fill: 0.4 }); s.add(skyDome(0.2, 4.1));
    const far = makeGasGiant(30, 'tan'); far.position.set(-70, 38, -190); far.rotation.set(0.35, 0, 0.3); s.add(far);
    this.garage = new THREE.Group(); this.garage.scale.set(1, 1.3, 1.3); s.add(this.garage);

    // the 100 m ship: 10 units long, centred on its middle
    this.ship = new THREE.Group(); s.add(this.ship);
    this.hull = shadowAll(makeRocket(10, 0.95), true, false); this.ship.add(this.hull);
    // ruler that shrinks with the ship
    const rp = [-5, 0, 0, 5, 0, 0, -5, -0.35, 0, -5, 0.35, 0, 5, -0.35, 0, 5, 0.35, 0];
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    this.ruler = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: GOLD })); this.ruler.position.set(0, 2.9, 1.3); this.ship.add(this.ruler);

    this.lblShip = app.label(() => this._v.set(this.ship.position.x, 3.9, 1.3), 'light');
    this.lblGar = app.label(new THREE.Vector3(0, -3.6, 3.2), 'earth');
    this._v = new THREE.Vector3();
    this.phase = 'idle'; this.last = null; this.door = 0; this.shake = 0;
  }
  build(G) {
    const g = this.garage;
    while (g.children.length) disposeTree(g.children.pop());
    const beam = metal(0x8891ad, { roughness: 0.45 });
    const floor = box(G + 0.5, 0.26, 4.8, hull(0x767d96, [Math.max(1, Math.round(G / 2)), 1], { metalness: 0.7, roughness: 0.5 })); floor.position.y = -1.78; g.add(floor);
    const back = box(G, 4.1, 0.14, hull(0x4a5273, [Math.max(1, Math.round(G / 2)), 2], { metalness: 0.5 })); back.position.set(0, 0.36, -2.38); g.add(back);
    for (const y of [1.75, -0.95]) { const lamp = box(G * 0.78, 0.07, 0.05, lit(TEAL, 1.5)); lamp.position.set(0, y, -2.29); g.add(lamp); }
    for (const z of [-2.3, 2.3]) { const top = box(G + 0.4, 0.2, 0.2, beam); top.position.set(0, 2.4, z); g.add(top); }
    const cross = box(0.16, 0.16, 4.6, beam); cross.position.set(0, 2.4, 0); g.add(cross);
    for (const x of [-G / 2, G / 2]) {
      for (const z of [-2.3, 2.3]) { const post = box(0.2, 4.2, 0.2, beam); post.position.set(x, 0.35, z); g.add(post); }
      const head = box(0.3, 0.3, 4.8, beam); head.position.set(x, 2.4, 0); g.add(head);
      const hz = hazardTex(); hz.repeat.set(1, 6);
      const mark = box(0.5, 0.02, 4.6, mat(0xffffff, { map: hz, roughness: 0.6 })); mark.position.set(x - Math.sign(x) * 0.3, -1.64, 0); g.add(mark);
    }
    const dz = hazardTex(); dz.repeat.set(3, 3);
    this.doorMat = new THREE.MeshStandardMaterial({ map: dz, color: 0xffffff, emissive: TEAL, emissiveIntensity: 0.3, metalness: 0.5, roughness: 0.5 });
    this.lampMat = lit(TEAL, 1.6);
    this.doors = [-G / 2, G / 2].map(x => {
      const d = box(0.16, 3.9, 4.4, this.doorMat); d.position.set(x, 4.4, 0); g.add(d);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), this.lampMat); lamp.position.set(x, 2.75, 2.3); g.add(lamp);
      return d;
    });
    shadowAll(g);
    this.signal(TEAL);
  }
  signal(hex) { this.doorMat.emissive.setHex(hex); this.lampMat.color.setHex(hex).multiplyScalar(1.6); }
  start(step) {
    const a = this.app;
    this.step = step; this.G = [8, 5, 2][step];
    this.build(this.G); this.phase = 'idle'; this.last = null; this.door = 0;
    a.task('m4c' + (step + 1)); a.speed({ show: true, max: 0.999 }); a.primary('launch'); a.quiz(null);
  }
  onPrimary() {
    const a = this.app;
    if (this.phase !== 'idle') return;
    if (a.beta < 0.01) return a.fail('needSpeed');
    this.b = a.beta; this.L = 10 * Phys.root(this.b); this.fits = this.L <= this.G + 0.005;
    this.phase = 'in'; this.x = -24; this.hold = 0; this.banged = false; Sfx.whoosh(1.4);
    a.clearFeedback(); a.speed({ show: true, max: 0.999, disabled: true }); a.primary('flying', true);
  }
  update(dt) {
    const a = this.app;
    let scale = 1, x = -9.8;
    if (this.phase !== 'idle') {
      const v = 9 + 16 * this.b; scale = Phys.root(this.b);
      if (this.phase === 'in') { this.x += v * dt; if (this.x >= 0) { this.x = 0; this.phase = 'hold'; this.hold = 0; } }
      else if (this.phase === 'hold') {
        this.hold += dt;
        const target = this.hold < 1.25 ? (this.fits ? 1 : 0.42) : 0;
        this.door += (target - this.door) * Math.min(1, dt * 14);
        if (!this.fits && this.hold < 0.5) this.shake = 0.25;
        this.signal(this.fits ? 0x4dff8a : 0xff3d55);
        if (!this.banged) { this.banged = true; this.fits ? Sfx.clang() : Sfx.crunch(); }
        if (this.hold > 1.6) { this.phase = 'out'; Sfx.whoosh(1.0, false); }
      } else if (this.phase === 'out') {
        this.door += (0 - this.door) * Math.min(1, dt * 14);
        this.x += v * dt;
        if (this.x > 26) {
          this.phase = 'idle'; this.last = this.L;
          this.signal(TEAL);
          a.speed({ show: true, max: 0.999 }); a.primary('launch');
          const vars = { v: pct(this.b), L: (this.L * 10).toFixed(this.L < 3 ? 1 : 0), G: this.G * 10 };
          if (this.fits) a.win('m4ok', vars); else a.fail('m4no', vars);
        }
      }
      x = this.x;
    }
    if (this.phase === 'idle') this.door += (0 - this.door) * Math.min(1, dt * 14);
    this.ship.position.x = this.phase === 'idle' ? -9.8 : x;
    this.hull.scale.set(scale, 1.3, 1.3); this.ruler.scale.x = scale;
    this.hull.userData.thrust(this.phase === 'in' || this.phase === 'out' ? 0.9 : 0);
    for (const d of this.doors) d.position.y = 4.4 - 4.05 * this.door;
    this.shake *= Math.pow(0.001, dt);
    this.garage.position.set(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake, 0);

    this.lblShip.set(t('ship') + ' · <b>' + t('metres', { n: (scale * 100).toFixed(scale < 0.3 ? 1 : 0) }) + '</b>');
    this.lblGar.set(t('garage') + ' · <b>' + t('metres', { n: this.G * 10 }) + '</b>');
    a.readouts([
      { k: 'm4r1', v: t('metres', { n: 100 }), tone: 'rocket' },
      { k: 'm4r2', v: t('metres', { n: this.G * 10 }), tone: 'earth' },
      { k: 'm4r3', v: this.last === null ? '—' : t('metres', { n: (this.last * 10).toFixed(1) }), tone: 'light' }]);
  }
}
