/*
 * Mission 5: red light, green light (Doppler shift and aberration), seen from the pilot's seat.
 * Also provides aberrationSky(), the star field that relativity bends, used by the menu backdrop and the Free Lab.
 */
'use strict';

const ABERRATE = `
uniform float beta;
// Tilt a star's true direction n into the direction the moving pilot sees (forward is -z); D is the Doppler factor.
vec3 aberrate(vec3 n, out float D) {
  float c = -n.z;
  vec2 p = n.xy; float pl = length(p);
  float c2 = (c + beta) / (1.0 + beta * c);
  float s2 = sqrt(max(0.0, 1.0 - c2 * c2));
  D = sqrt(1.0 - beta * beta) / (1.0 - beta * c2);
  return pl > 1e-6 ? vec3(p / pl * s2, -c2) : n;
}`;
const STAR_VS = ABERRATE + `
uniform float pix; uniform float rad; uniform float gain;
attribute float temp; attribute float mag;
varying vec3 vColor;
vec3 blackbody(float T) {            // rough colour of a glowing body at T kelvin
  T = clamp(T, 1000.0, 40000.0) / 100.0;
  float r = T <= 66.0 ? 1.0 : clamp(1.2929 * pow(T - 60.0, -0.1332), 0.0, 1.0);
  float g = T <= 66.0 ? clamp(0.3901 * log(T) - 0.6318, 0.0, 1.0) : clamp(1.1299 * pow(T - 60.0, -0.0755), 0.0, 1.0);
  float b = T >= 66.0 ? 1.0 : (T <= 19.0 ? 0.0 : clamp(0.5432 * log(T - 10.0) - 1.1963, 0.0, 1.0));
  return vec3(r, g, b);
}
void main() {
  float D;
  vec3 n = aberrate(normalize(position), D);
  float T = temp * D;                // a Doppler-shifted star looks like a hotter or cooler star
  float seen = smoothstep(700.0, 2200.0, T);
  vColor = blackbody(T) * seen * clamp(pow(D, 1.2), 0.12, 1.08) * gain;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(n * rad, 1.0);
  gl_PointSize = pix * mag * clamp(pow(D, 0.9), 0.5, 3.0);
}`;
const STAR_FS = `
varying vec3 vColor;
void main() {
  float a = smoothstep(0.5, 0.05, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vColor * a, 1.0);
}`;
const GRID_VS = ABERRATE + `
uniform float rad;
void main() { float D; vec3 n = aberrate(normalize(position), D); gl_Position = projectionMatrix * modelViewMatrix * vec4(n * rad, 1.0); }`;
const GRID_FS = `uniform float gridK; void main() { gl_FragColor = vec4(vec3(0.13, 0.17, 0.42) * gridK, 1.0); }`;
// The whole sky as a moving pilot sees it: stars that bunch ahead and change colour, plus a grid that shows the squeeze.
// `uni` needs beta, pix, rad (how far away to draw it), gain (star brightness) and gridK (grid brightness).
function aberrationSky(uni) {
  const n = 5200, pos = new Float32Array(n * 3), temp = new Float32Array(n), mag = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const z = rnd(-1, 1), a = rnd(0, Math.PI * 2), r = Math.sqrt(1 - z * z);
    pos.set([r * Math.cos(a), r * Math.sin(a), z], i * 3);
    temp[i] = 2800 + Math.pow(Math.random(), 2.2) * 9000;
    mag[i] = 1.6 + Math.pow(Math.random(), 4) * 3.4;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('temp', new THREE.BufferAttribute(temp, 1));
  sg.setAttribute('mag', new THREE.BufferAttribute(mag, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: STAR_VS, fragmentShader: STAR_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  stars.frustumCulled = false;
  // circles of equal angle from straight ahead, plus spokes
  const gp = [], dir = (th, ph) => [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), -Math.cos(th)];
  for (let th = 15; th < 180; th += 15) for (let i = 0; i < 96; i++) gp.push(...dir(th * Math.PI / 180, i / 96 * 6.2832), ...dir(th * Math.PI / 180, (i + 1) / 96 * 6.2832));
  for (let k = 0; k < 12; k++) for (let i = 0; i < 60; i++) gp.push(...dir((4 + i * 2.87) * Math.PI / 180, k / 12 * 6.2832), ...dir((4 + (i + 1) * 2.87) * Math.PI / 180, k / 12 * 6.2832));
  const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  const grid = new THREE.LineSegments(gg, new THREE.ShaderMaterial({ uniforms: uni, vertexShader: GRID_VS, fragmentShader: GRID_FS, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  grid.frustumCulled = false;
  return { stars, grid };
}

class Cockpit {
  constructor(app, opts = {}) {
    this.app = app;
    this.mode = opts.mode || 'm5';           // 'm5' | 'ambient'
    this.view = { fov: this.mode === 'ambient' ? 64 : 74 };
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 3000);
    this.camera.rotation.order = 'YXZ';
    this.yaw = 0; this.pitch = 0; this.yawTo = null;
    this.uni = { beta: { value: 0 }, pix: { value: (window.devicePixelRatio || 1) }, rad: { value: 150 }, gain: { value: 1 }, gridK: { value: 1 } };

    const sky = aberrationSky(this.uni); s.add(sky.stars, sky.grid);

    // dust streaming past, just to feel the motion
    const dn = 240, dp = new Float32Array(dn * 3);
    for (let i = 0; i < dn; i++) { const a = rnd(0, 6.2832), r = rnd(2.5, 16); dp.set([Math.cos(a) * r, Math.sin(a) * r, rnd(-70, 12)], i * 3); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9fb0ff, size: 0.2, map: glowTex(), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.dust.frustumCulled = false; s.add(this.dust);

    if (this.mode !== 'ambient') {
      lights(s, { sun: [4, 6, 9], fill: 0.5, power: 1.6 });
      const dark = () => metal(0x232738, { roughness: 0.55 });
      // the red traffic light, straight ahead, on its own little space buoy
      const tl = new THREE.Group(); tl.position.set(0, -1.2, -24); s.add(tl);
      const house = box(2.3, 6.2, 1.5, dark()); house.position.y = 3.1; tl.add(house);
      const backing = box(2.9, 6.8, 0.12, mat(0x0c0e18, { roughness: 0.9 })); backing.position.set(0, 3.1, -0.7); tl.add(backing);
      const pole = cyl(0.2, 0.2, 7, dark(), 16); pole.position.y = -3.4; tl.add(pole);
      const base = cyl(1.3, 1.6, 0.8, dark(), 24); base.position.y = -7.2; tl.add(base);
      for (const sx of [-1, 1]) { const wing = solarPanel(2.6, 1.3); wing.position.set(sx * 2.9, -7.2, 0); wing.rotation.x = 1.2; tl.add(wing); }
      const lens = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 18), lit(0xff0000, 1)); m.scale.z = 0.45; return m; };
      [5, 3.1, 1.2].forEach((y, i) => {
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.9, 24, 1, true, -Math.PI / 2, Math.PI), dark()); hood.material.side = THREE.DoubleSide;
        hood.rotation.x = Math.PI / 2; hood.position.set(0, y, 1.1); tl.add(hood);
        const l = lens(); l.position.set(0, y, 0.72); tl.add(l);
        if (i) l.material = mat(0x08090f, { roughness: 0.2, metalness: 0.6 }); else this.lampA = l;
      });
      this.glowA = glow(0xff0000, 8, 0.9); this.glowA.position.set(0, 5, 1.4); tl.add(this.glowA);
      // the blue home beacon, straight behind
      const hb = new THREE.Group(); hb.position.set(0, 0, 24); s.add(hb);
      this.lampB = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 18), lit(0x0066ff, 1)); hb.add(this.lampB);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.14, 12, 64), metal(0x8a93b0)); hb.add(ring);
      const ring2 = ring.clone(); ring2.rotation.x = Math.PI / 2; hb.add(ring2);
      for (const sx of [-1, 1]) { const wing = solarPanel(2.4, 1.2); wing.position.set(sx * 3.6, 0, 0); wing.rotation.x = Math.PI / 2; hb.add(wing); }
      this.glowB = glow(0x0066ff, 10, 0.9); hb.add(this.glowB);
      this.lblA = app.label(new THREE.Vector3(0, 6.9, -24), 'plain');
      this.lblB = app.label(new THREE.Vector3(0, 3.6, 24), 'plain');

      // a little of the cockpit around you: dashboard, window struts, rear porthole
      const dc = canvas(512, 128), dg = dc.getContext('2d');
      dg.fillStyle = '#05070f'; dg.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 5; i++) { dg.strokeStyle = i % 2 ? '#35d6bd' : '#ffd84a'; dg.lineWidth = 3; dg.beginPath(); dg.arc(60 + i * 98, 64, 30, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * Math.random())); dg.stroke(); dg.fillStyle = 'rgba(255,255,255,.5)'; dg.fillRect(40 + i * 98, 104, 40, 4); }
      const dt_ = tex(dc, { own: true });
      const shade = new THREE.MeshBasicMaterial({ color: 0x07080f });
      const dash = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.6, 48, 1, false, Math.PI * 0.75, Math.PI * 0.5), shade); dash.position.set(0, -1.46, 0.2); s.add(dash);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.26), new THREE.MeshBasicMaterial({ map: dt_ })); panel.position.set(0, -1.02, -1.75); panel.rotation.x = -0.5; s.add(panel);
      const frame = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.07, 10, 96), shade); frame.position.z = -1.9; s.add(frame);
      const port = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.07, 10, 96), shade); port.position.z = 1.9; s.add(port);

      const el = app.renderer.domElement;
      this._down = e => { this.drag = { x: e.clientX, y: e.clientY }; this.yawTo = null; };
      this._move = e => {
        if (!this.drag) return;
        this.yaw += (e.clientX - this.drag.x) * 0.005; this.pitch += (e.clientY - this.drag.y) * 0.005;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
        this.drag = { x: e.clientX, y: e.clientY };
      };
      this._up = () => { this.drag = null; };
      el.addEventListener('pointerdown', this._down); window.addEventListener('pointermove', this._move); window.addEventListener('pointerup', this._up);
    }
    this.time = 0;
  }
  dispose() {
    if (this._down) {
      this.app.renderer.domElement.removeEventListener('pointerdown', this._down);
      window.removeEventListener('pointermove', this._move); window.removeEventListener('pointerup', this._up);
    }
  }
  seen() {
    const b = this.app.beta, k = Math.sqrt((1 + b) / (1 - b));
    return { ahead: 650 / k, behind: 470 * k, front: Phys.frontFraction(b) };
  }
  look(i) { this.yawTo = i ? Math.PI : 0; this.app.extra([{ id: 'look', options: ['ahead', 'behind'], value: i }]); }
  start(step) {
    const a = this.app;
    this.step = step;
    a.task('m5c' + (step + 1)); a.speed({ show: true, max: 0.999 }); a.primary('check'); a.quiz(null);
    this.look(step === 1 ? 1 : 0);
    a.custom(step === 2 ? null : el => {
      const stops = []; for (let w = 330; w <= 800; w += 10) stops.push(css(waveRGB(w)) + ' ' + ((w - 330) / 4.7).toFixed(1) + '%');
      el.innerHTML = '<div class="spectrum" style="background:linear-gradient(90deg,' + stops.join(',') + ')"><i class="true"></i><i class="seen"></i></div>';
      this.specEl = el;
    });
    if (step === 2) this.specEl = null;
  }
  onExtra(id, i) { this.look(i); }
  onPrimary() {
    const a = this.app, s = this.seen(), v = pct(a.beta);
    if (this.step === 0) {
      const name = waveName(s.ahead), vars = { v, nm: Math.round(s.ahead), c: t(name) };
      name === 'col_green' ? a.win('m5ok1', vars) : a.fail('m5no1', vars);
    } else if (this.step === 1) {
      const name = waveName(s.behind), vars = { v, nm: Math.round(s.behind), c: t(name) };
      name === 'col_red' ? a.win('m5ok2', vars) : a.fail('m5no2', vars);
    } else {
      const vars = { v, f: Math.round(s.front * 100) };
      s.front >= 0.895 ? a.win('m5ok3', vars) : a.fail('m5no3', vars);
    }
  }
  update(dt) {
    const a = this.app;
    this.time += dt;
    let b = a.beta;
    if (this.mode === 'ambient') {
      b = 0.47 - 0.47 * Math.cos(this.time * 0.22);
      this.ambientBeta = b;
      this.yaw = Math.sin(this.time * 0.07) * 0.25; this.pitch = Math.sin(this.time * 0.05) * 0.08;
    }
    this.uni.beta.value = b;
    this.uni.pix.value = this.app.renderer.getPixelRatio();
    if (this.yawTo !== null) {
      this.yaw += (this.yawTo - this.yaw) * Math.min(1, dt * 5); this.pitch += (0 - this.pitch) * Math.min(1, dt * 5);
      if (Math.abs(this.yawTo - this.yaw) < 0.002) { this.yaw = this.yawTo; this.yawTo = null; }
    }
    this.camera.rotation.set(-this.pitch, -this.yaw, 0);
    const p = this.dust.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let z = p.getZ(i) + 46 * b * dt; if (z > 12) z -= 82; p.setZ(i, z); }
    p.needsUpdate = true;
    this.dust.material.opacity = Math.min(0.5, b * 3);
    if (this.mode === 'ambient') return;
    Sfx.engine(0.2 + 0.8 * b, b);

    const s = this.seen();
    const paint = (lamp, halo, w) => {
      const vis = w >= 380 && w <= 750, rgb = waveRGB(w);
      lamp.material.color.setRGB(rgb[0], rgb[1], rgb[2]).convertSRGBToLinear(); halo.material.color.setRGB(rgb[0], rgb[1], rgb[2]).convertSRGBToLinear();
      halo.material.opacity = vis ? 0.9 : 0;
    };
    paint(this.lampA, this.glowA, s.ahead); paint(this.lampB, this.glowB, s.behind);
    const desc = w => '<b>' + t('nmv', { n: Math.round(w) }) + '</b> · ' + t(waveName(w));
    this.lblA.set(t('light1') + ' · ' + t(waveName(s.ahead)));
    this.lblB.set(t('light2') + ' · ' + t(waveName(s.behind)));
    if (this.specEl) {
      const at = w => Math.max(0, Math.min(100, (w - 330) / 4.7)) + '%';
      const [i1, i2] = this.specEl.querySelectorAll('i');
      const back = this.step === 1, w0 = back ? 470 : 650, w1 = back ? s.behind : s.ahead;
      i1.style.left = at(w0); i2.style.left = at(w1); i2.dataset.t = Math.round(w1) + ' nm';
    }
    if (this.mode === 'm5') a.readouts([
      { k: 'm5r1', v: desc(s.ahead), tone: 'light', html: true },
      { k: 'm5r2', v: desc(s.behind), tone: 'light', html: true },
      { k: 'm5r3', v: Math.round(s.front * 100) + '%', tone: 'rocket' }]);
  }
}
