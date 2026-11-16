/*
 * Free Lab: the 3D scene.
 * One world with four levels (road, sky, orbit, deep space) that slides into place for the chosen vehicle,
 * a destination that swaps with a flash, and two cameras: the outside tracking shot and the seat inside.
 */
'use strict';

class Journey {
  constructor(app, veh, dest) {
    this.app = app;
    this.view = { dist: 17.2, width: 21, height: 10 };
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
    this.camera.position.set(0, 2.8, 17); this.camera.lookAt(0, 3.2, 0);
    this.sun = lights(s, { sun: [-5, 9, 8], color: 0xc9d8ff, power: 1.5, fill: 0.6, sky: 0x5f76c8, ground: 0x0b0d16, shadow: 13 });
    this.warm = new THREE.Color(0xfff1dc); this.coolC = new THREE.Color(0xc9d8ff);
    this.sky = skyDome(0.55, 3.6); s.add(this.sky);
    this.t = 0; this.vis = 0; this.visTo = 0; this.tE = 0; this.tV = 0;
    this.outView = this.view; this.inside = false; this.yaw = 0; this.pitch = 0;

    // --- on the ground ---
    const G = this.ground = new THREE.Group(); s.add(G);
    const noiseTex = (base, amp, rep, lines) => {
      const c = canvas(256, 256), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 256, 256);
      const im = x.getImageData(0, 0, 256, 256); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - 0.5) * amp; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } x.putImageData(im, 0, 0);
      if (lines) lines(x);
      return tex(c, { repeat: rep, own: true });
    };
    this.landTex = noiseTex('#0c1512', 14, [50, 25]);
    const land = new THREE.Mesh(new THREE.PlaneGeometry(800, 400), mat(0xffffff, { map: this.landTex, roughness: 1, metalness: 0, envMapIntensity: 0.2 })); land.rotation.x = -Math.PI / 2; land.position.z = -150; land.receiveShadow = true; G.add(land);
    this.roadTex = noiseTex('#1b1c22', 16, [150, 1], x => { x.fillStyle = '#d9d9cf'; x.fillRect(0, 14, 256, 5); x.fillRect(0, 237, 256, 5); x.fillStyle = '#e8c33a'; x.fillRect(40, 125, 120, 6); });
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(1200, 8), mat(0xffffff, { map: this.roadTex, roughness: 0.8, metalness: 0, envMapIntensity: 0.3 })); this.road.rotation.x = -Math.PI / 2; this.road.receiveShadow = true; G.add(this.road);
    this.trackTex = noiseTex('#24252d', 30, [300, 1], x => { x.fillStyle = '#5d606b'; x.fillRect(96, 40, 64, 176); });
    this.track = new THREE.Group(); G.add(this.track);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(1200, 4), mat(0xffffff, { map: this.trackTex, roughness: 1, metalness: 0 })); bed.rotation.x = -Math.PI / 2; bed.receiveShadow = true; this.track.add(bed);
    for (const z of [-0.67, 0.67]) { const rail = box(1200, 0.14, 0.1, metal(0xaab2c8, { roughness: 0.22 })); rail.position.set(0, 0.07, z); this.track.add(rail); }
    const wire = box(1200, 0.025, 0.025, mat(0x15161c)); wire.position.y = 3.3; this.track.add(wire);   // the pantograph on the train reaches this
    // things that stream past: street lamps for the road, masts for the railway, trees for both
    this.lamps = []; this.masts = []; this.trees = [];
    for (let i = 0; i < 12; i++) {
      const L = new THREE.Group(), pole = cyl(0.06, 0.09, 5.2, metal(0x7d86a3), 8); pole.position.y = 2.6; L.add(pole);
      const arm = box(0.07, 0.07, 2.2, metal(0x7d86a3)); arm.position.set(0, 5.2, 1.0); L.add(arm);
      const head = box(0.6, 0.1, 0.3, lit(0xffe2b0, 2.2)); head.position.set(0, 5.14, 2.0); L.add(head);
      const halo = glow(0xffcf90, 3.4, 0.6); halo.position.set(0, 5.05, 2.0); L.add(halo);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32), new THREE.MeshBasicMaterial({ map: glowTex(), color: 0xffcf90, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.04, 2.6); L.add(pool);
      L.position.set(-96 + i * 16, 0, -6.2); G.add(L); this.lamps.push(L);
      const L2 = L.clone(); L2.scale.z = -1; L2.position.set(-88 + i * 16, 0, 6.2); L2.userData.near = true; G.add(L2); this.lamps.push(L2);   // the far kerb, only shown from inside
      const M = new THREE.Group(), mp = box(0.14, 4.2, 0.14, metal(0x596078)); mp.position.y = 2.1; M.add(mp);
      const ma = box(0.08, 0.08, 2.9, metal(0x596078)); ma.position.set(0, 3.75, 1.35); M.add(ma);
      M.position.set(-96 + i * 16, 0, -2.7); G.add(M); this.masts.push(M);
    }
    const leaf = mat(0x0c1a14, { roughness: 1 }), trunk = mat(0x15110e, { roughness: 1 });
    for (let i = 0; i < 46; i++) {
      const T = new THREE.Group(), h = rnd(3, 7);
      const tr = cyl(0.12, 0.18, h * 0.35, trunk, 6); tr.position.y = h * 0.17; T.add(tr);
      for (let k = 0; k < 3; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(h * (0.3 - k * 0.07), h * 0.42, 8), leaf); cone.position.y = h * (0.42 + k * 0.22); T.add(cone); }
      T.position.set(rnd(-110, 110), 0, -rnd(11, 70)); G.add(T); this.trees.push(T);
      if (i % 2) { const T2 = T.clone(); T2.position.set(rnd(-110, 110), 0, rnd(11, 70)); T2.userData.near = true; T2.visible = false; G.add(T2); this.trees.push(T2); }
    }
    const hc = canvas(1024, 128), hx = hc.getContext('2d'); hx.fillStyle = '#080d1c'; hx.beginPath(); hx.moveTo(0, 128);
    for (let i = 0; i <= 1024; i += 8) { const a = i / 1024 * 6.2832; hx.lineTo(i, 104 - 150 * Math.max(0, Noise.fbm(Math.cos(a) * 1.4 + 3, Math.sin(a) * 1.4 + 7, 3.3, 4) - 0.25)); }
    hx.lineTo(1024, 128); hx.fill();
    const hills = new THREE.Mesh(new THREE.CylinderGeometry(345, 345, 46, 72, 1, true), new THREE.MeshBasicMaterial({ map: tex(hc, { repeat: [5, 1], own: true }), transparent: true, depthWrite: false, side: THREE.BackSide })); hills.position.y = 20; G.add(hills);   // a ring of far hills, so there is a horizon whichever way you look
    const town = glow(0xffb070, 150, 0.16); town.position.set(-150, 8, -320); town.scale.set(260, 40, 1); G.add(town);

    // --- in the air: a deck of moonlit cloud, with the dark land far below ---
    const A = this.air = new THREE.Group(); s.add(A);
    const cc = canvas(512, 512), cx = cc.getContext('2d'), ci = cx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const a = x / 512 * 6.2832, b = y / 512 * 6.2832, n = Noise.fbm(Math.cos(a) * 1.3 + 9, Math.sin(a) * 1.3 + Math.cos(b) * 1.3, Math.sin(b) * 1.3 + 4, 6), k = sstep(0.42, 0.7, n), o = (y * 512 + x) * 4;
      ci.data[o] = 150 + 90 * k; ci.data[o + 1] = 165 + 80 * k; ci.data[o + 2] = 215 + 40 * k; ci.data[o + 3] = 255 * sstep(0.4, 0.62, n);
    }
    cx.putImageData(ci, 0, 0);
    this.cloudTex = [0, 1].map(i => { const tx = tex(cc, { repeat: i ? [5, 3] : [3, 2], own: true }); tx.offset.set(i * 0.37, i * 0.21); return tx; });
    this.decks = this.cloudTex.map((tx, i) => { const d = new THREE.Mesh(new THREE.PlaneGeometry(1400, 800), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, opacity: i ? 0.55 : 0.9 })); d.material.color.setScalar(i ? 0.35 : 0.5); d.rotation.x = -Math.PI / 2; d.position.set(0, -7 - i * 9, -260); A.add(d); return d; });
    const below = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1400), lit(0x04070d, 1)); below.rotation.x = -Math.PI / 2; below.position.set(0, -60, -400); A.add(below);

    // --- in orbit: the Earth turning underneath ---
    this.orbit = new THREE.Group(); s.add(this.orbit);
    this.earth = makeOrbitEarth(170, [-5, 9, 8]); this.orbit.add(this.earth);

    // --- far from anything: a few specks drifting by for a sense of motion ---
    const dn = 260, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) dp.set([rnd(-60, 60), rnd(-12, 22), rnd(-40, 6)], i * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xaab8ff, size: 0.16, map: glowTex(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); this.dust.frustumCulled = false; s.add(this.dust);
    this.dust2 = this.dust.clone(); this.dust2.scale.z = -1; this.dust2.position.z = 14; this.dust2.visible = false; s.add(this.dust2);   // the other side, for the inside view

    // --- the inside view: the sky as relativity bends it, a cab around the camera, one live instrument ---
    this.ab = { beta: { value: 0 }, pix: KIT.pix, rad: { value: 1300 }, gain: { value: 0.85 }, gridK: { value: 0 } };
    const ab = aberrationSky(this.ab); ab.stars.renderOrder = -9; ab.grid.renderOrder = -8;
    this.abSky = new THREE.Group(); this.abSky.add(ab.stars, ab.grid); this.abSky.rotation.y = -Math.PI / 2; this.abSky.visible = false; s.add(this.abSky);
    this.cabHold = new THREE.Group(); this.cabHold.visible = false; s.add(this.cabHold);
    this.disp = makeDisplay(); this.dispT = 0; this.cab = null;
    const el = app.renderer.domElement;
    this._down = e => { if (this.inside) this.drag = { x: e.clientX, y: e.clientY }; };
    this._move = e => {
      if (!this.drag) return;
      this.yaw = Math.max(-2.3, Math.min(2.3, this.yaw + (e.clientX - this.drag.x) * 0.005)); this.pitch = Math.max(-0.9, Math.min(0.9, this.pitch + (e.clientY - this.drag.y) * 0.005));
      this.drag = { x: e.clientX, y: e.clientY };
    };
    this._up = () => { this.drag = null; };
    el.addEventListener('pointerdown', this._down); window.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up);

    // --- soft glow where the sky meets the land ---
    const zc = canvas(4, 256), zx = zc.getContext('2d'), zg = zx.createLinearGradient(0, 0, 0, 256);
    zg.addColorStop(0, 'rgba(40,60,120,0)'); zg.addColorStop(0.42, 'rgba(40,60,120,0)'); zg.addColorStop(0.5, 'rgba(58,80,150,.75)'); zg.addColorStop(0.53, 'rgba(20,28,60,.95)'); zg.addColorStop(1, 'rgba(6,9,20,1)');
    zx.fillStyle = zg; zx.fillRect(0, 0, 4, 256);
    this.haze = new THREE.Mesh(new THREE.CylinderGeometry(1200, 1200, 900, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex(zc, { own: true }), side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })); this.haze.renderOrder = -5; s.add(this.haze);

    this.vehHold = new THREE.Group(); s.add(this.vehHold);
    this.destHold = new THREE.Group(); this.destHold.position.set(19, 13.5, -38); s.add(this.destHold);
    this.flashFx = glow(0xffffff, 1, 0, flareTex()); this.destHold.add(this.flashFx);
    this.alt = VEHICLES[veh].alt; this.surf = VEHICLES[veh].surface === 'track' ? 1 : 0;
    this.veh = null; this.dest = null; this.vtr = null; this.dtr = null;
    this.setVehicle(veh, true); this.setDest(dest, true);
    this._v = new THREE.Vector3();
    this.lblV = app.label(() => this._v.set(this.veh.obj.position.x, this.veh.obj.userData.labelY, 0), 'rocket');
    this.lblE = app.label(new THREE.Vector3(-7.6, 7.6, 0), 'earth');
    this.lblD = app.label(() => this.inside ? this._v.set(95, 6.5, -10) : this._v.set(this.destHold.position.x, window.innerWidth <= 760 ? 20.5 : 6.4, -38), 'plain');
    this.place(0);
  }
  setVehicle(key, instant) {
    if (this.veh && this.veh.key === key) return;
    const obj = VEHICLES[key].make(); this.vehHold.add(obj);
    const next = { key, obj };
    if (instant || !this.veh) { if (this.veh) { this.vehHold.remove(this.veh.obj); disposeTree(this.veh.obj); } this.veh = next; return; }
    if (this.vtr && this.vtr.old) { this.vehHold.remove(this.vtr.old.obj); disposeTree(this.vtr.old.obj); }
    const tr = { t: 0, old: this.veh, next, alt0: this.alt, alt1: VEHICLES[key].alt, s0: this.surf, s1: VEHICLES[key].surface === 'track' ? 1 : VEHICLES[key].surface === 'road' ? 0 : this.surf };
    this.tE = this.tV = 0;
    Sfx.whoosh(1.1, true); setTimeout(() => Sfx.whoosh(1.0, false), 1300);
    if (!this.inside) { obj.position.x = -60; this.vtr = tr; this.veh = next; return; }
    // from inside there is nothing to watch slide away: blink, swap the cab, then feel the world rise or fall
    obj.visible = false; this.veh = next; this.vtr = null;
    this.app.blink(() => { this.vehHold.remove(tr.old.obj); disposeTree(tr.old.obj); tr.old = null; this.vtr = tr; this.buildCab(); });
  }
  buildCab() {
    if (this.cab) { this.cabHold.remove(this.cab.g); disposeTree(this.cab.g); }
    this.cab = CABS[this.veh.key](this.disp); this.cabHold.add(this.cab.g);
    this.cab.g.position.set(this.cab.eye[0], this.cab.eye[1], this.cab.eye[2]);
    this.yaw = 0; this.pitch = this.cab.pitch;
  }
  // step inside the vehicle, or back out to the tracking shot
  setInside(on) {
    if (this.vtr) { const v = this.vtr; if (v.old) { this.vehHold.remove(v.old.obj); disposeTree(v.old.obj); } v.next.obj.position.x = 0; this.alt = v.alt1; this.surf = v.s1; this.vtr = null; }
    this.inside = on; this.view = on ? { fov: 66 } : this.outView;
    this.cabHold.visible = this.abSky.visible = this.dust2.visible = on; this.sky.children[1].visible = !on; this.veh.obj.visible = !on;
    for (const T of this.trees) if (T.userData.near) T.visible = on;
    if (on) { this.buildCab(); this.camera.rotation.order = 'YXZ'; }
    else { this.camera.rotation.order = 'XYZ'; this.camera.position.set(0, 2.8, 17); this.camera.lookAt(0, 3.2, 0); this.destHold.scale.setScalar(1); this.destHold.position.set(19, 13.5, -38); }
  }
  dispose() {
    this.app.renderer.domElement.removeEventListener('pointerdown', this._down); window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up);
    KIT.shared.delete(this.disp.tex); this.disp.tex.dispose();
  }
  setDest(key, instant) {
    if (this.dest && this.dest.key === key) return;
    const obj = DESTS[key].make(); this.destHold.add(obj);
    const next = { key, obj };
    if (instant || !this.dest) { if (this.dest) { this.destHold.remove(this.dest.obj); disposeTree(this.dest.obj); } this.dest = next; return; }
    if (this.dtr) { this.destHold.remove(this.dtr.old.obj); disposeTree(this.dtr.old.obj); }
    obj.scale.setScalar(0.0001);
    this.dtr = { t: 0, old: this.dest, next }; this.dest = next;
    Sfx.warp();
  }
  // Slide every layer of scenery to where it belongs for an altitude: 0 road, 1 sky, 2 orbit, 3 deep space.
  place(dt) {
    const a = this.alt, G = this.ground, k = dt ? Math.min(1, dt * 60) : 1;
    G.visible = a < 0.98; G.position.y = -a * 70;
    this.air.visible = a > 0.05 && a < 1.95; this.air.position.y = (1 - a) * 46;
    for (const [i, d] of this.decks.entries()) d.material.opacity = (i ? 0.55 : 0.9) * sstep(0.05, 0.5, a) * sstep(1.95, 1.4, a);
    this.orbit.visible = a > 1.05 && a < 2.97;
    const sc = a <= 2 ? mix(4, 1, sstep(1.1, 2, a)) : mix(1, 0.03, sstep(2, 2.9, a));
    this.earth.scale.setScalar(sc); this.earth.position.set(0, -8.5 - 170 * sc - Math.max(0, a - 2) * 70, -40 * sc);
    this.haze.material.opacity = sstep(1.9, 0.9, a); this.haze.position.y = -a * 60;
    const day = sstep(1.2, 2, a);
    this.sun.intensity = mix(1.4, 2.1, day); this.sun.color.copy(this.coolC).lerp(this.warm, day); this.sun.castShadow = a < 0.9;
    this.dust.material.opacity = sstep(1.6, 2.6, a) * Math.min(0.7, this.vis / 40);     // dust2 shares this material
    this.road.position.y = mix(0.02, -0.6, this.surf); this.track.position.y = mix(-4.5, 0.03, this.surf);
    for (const L of this.lamps) L.scale.y += (1 - this.surf - L.scale.y) * k, L.visible = L.scale.y > 0.02 && (this.inside || !L.userData.near);
    for (const M of this.masts) M.scale.y += (this.surf - M.scale.y) * k, M.visible = M.scale.y > 0.02;
  }
  update(dt) {
    const app = this.app, b = app.labBeta === undefined ? app.beta : app.labBeta, root = Phys.root(Math.min(b, 0.9999999));
    this.t += dt; this.tE += dt; this.tV += dt * root;
    this.visTo = 13 * Math.log10(1 + b * C / 2.5);
    this.vis += (this.visTo - this.vis) * Math.min(1, dt * 2.5);
    const vis = this.vis, ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };

    // swapping the vehicle: the old one pulls away, the world rises or falls, the new one slides in
    if (this.vtr) {
      const v = this.vtr; v.t += dt / 2.6;
      if (v.old) { v.old.obj.position.x = Math.pow(clamp01(v.t / 0.42), 2.2) * 70; const u = clamp01((v.t - 0.5) / 0.5); v.next.obj.position.x = -60 * Math.pow(1 - u, 3); }
      this.alt = mix(v.alt0, v.alt1, ease((v.t - 0.12) / 0.7)); this.surf = mix(v.s0, v.s1, ease((v.t - 0.2) / 0.5));
      if (v.t >= 1) { if (v.old) { this.vehHold.remove(v.old.obj); disposeTree(v.old.obj); } v.next.obj.position.x = 0; this.alt = v.alt1; this.surf = v.s1; this.vtr = null; }
    }
    // swapping the destination: the old one folds into a point of light, the new one opens out of it
    if (this.dtr) {
      const d = this.dtr; d.t += dt / 1.5;
      d.old.obj.scale.setScalar(Math.max(0.0001, 1 - Math.pow(clamp01(d.t / 0.42), 2))); d.old.obj.rotation.y += dt * 3;
      const u = clamp01((d.t - 0.42) / 0.58), back = 1 + 2.2 * Math.pow(u - 1, 3) + 1.2 * Math.pow(u - 1, 2);
      d.next.obj.scale.setScalar(Math.max(0.0001, u <= 0 ? 0 : back));
      const f = Math.max(0, 1 - Math.abs(d.t - 0.42) / 0.3); this.flashFx.material.opacity = f; this.flashFx.scale.setScalar(4 + 34 * f);
      if (d.t >= 1) { this.destHold.remove(d.old.obj); disposeTree(d.old.obj); d.next.obj.scale.setScalar(1); this.flashFx.material.opacity = 0; this.dtr = null; }
    }
    this.place(dt);

    // scenery streaming past at a speed your eyes can follow
    const move = vis * dt;
    this.roadTex.offset.x += move / 8; this.trackTex.offset.x += move / 4; this.landTex.offset.x += move / 16;
    for (const list of [this.lamps, this.masts, this.trees]) for (const o of list) { o.position.x -= move * (list === this.trees ? 1 : 1); if (o.position.x < -112) o.position.x += 224; }
    this.cloudTex[0].offset.x += move / 470; this.cloudTex[1].offset.x += move / 280;
    this.earth.rotation.z += move / 170 * 0.1; this.earth.userData.tick(dt, 0.004);
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let x = p.getX(i) - move * 1.4; if (x < -60) x += 120; p.setX(i, x); }
    p.needsUpdate = true;                                    // dust2 is a mirrored copy of the same points

    const V = this.veh.obj;
    if (this.inside && this.cab) {
      // the camera sits at the driver's eye; drag to look around
      const bob = this.cab.tick(dt, this.t, vis) || 0, e = this.cab.eye;
      this.camera.position.set(e[0], e[1] + bob, e[2]); this.camera.rotation.set(-this.pitch, -Math.PI / 2 - this.yaw, 0);
      this.abSky.position.copy(this.camera.position);
      this.ab.beta.value = Math.min(b, 0.9995); this.ab.gridK.value = sstep(0.03, 0.25, b);
      this.destHold.position.set(95, 17, -10); this.destHold.scale.setScalar(1.75);         // the destination hangs dead ahead
      if ((this.dispT -= dt) <= 0) {
        this.dispT = 0.15;
        const info = app.labInfo || {}, clock = x => x.toFixed(1) + ' ' + t('un_s'), g = 1 / root;
        this.disp.draw({ speed: info.speed || '', unit: info.unit ? t(info.unit) : '', pct: pct(b), gamma: g < 1.001 ? '1.000' : num(g, g > 99 ? 0 : 3), ship: clock(this.tV), earth: clock(this.tE), frac: clamp01(Math.log10(1 + b * C) / Math.log10(1 + C)) });
      }
    } else this.destHold.position.x = window.innerWidth <= 760 ? 7 : 19;                // keep the destination in frame on narrow screens
    V.userData.tick(dt, vis, this.t);
    if (this.vtr && this.vtr.old) this.vtr.old.obj.userData.tick(dt, vis * 2, this.t);
    V.scale.x = (V.userData.sx || (V.userData.sx = V.scale.x)) * Math.max(root, 0.02);      // length contraction applies to everything
    if (this.dest.obj.userData.tick) this.dest.obj.userData.tick(dt);
    Sfx.engine(this.vtr ? 0.9 : 0.25 + 0.5 * Math.min(1, vis / 60), 0.08 + 0.7 * Math.min(1, vis / 100));

    const fx = x => x.toFixed(1) + ' ' + t('un_s');
    this.lblV.set(this.inside ? '' : t(VEHICLES[this.veh.key].name) + ' · ' + t('labClockV') + ' <b>' + fx(this.tV) + '</b>');   // inside, the dashboard shows both clocks
    this.lblE.set(this.inside ? '' : t('labClockE') + ' <b>' + fx(this.tE) + '</b>');
    this.lblD.set(t(this.dest.key) + ' · <b>' + farText(this.dest.key) + '</b>');
  }
}
