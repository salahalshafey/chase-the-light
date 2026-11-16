/*
 * Graphics kit: everything on screen is generated in code, there are no image files.
 * Noise and painted textures, the sky, planets and stars, materials, lights and reflections,
 * rockets, astronauts, engine plumes, and the finishing pass (bloom, vignette, film grain).
 */
'use strict';

// Colours are written as normal sRGB hex values and converted so lighting is computed in linear light.
(function () {
  const setHex = THREE.Color.prototype.setHex;
  THREE.Color.prototype.setHex = function (h) { setHex.call(this, h); return this.convertSRGBToLinear(); };
})();
const TEAL = 0x35d6bd, CORAL = 0xff6a55, GOLD = 0xffd84a, NIGHT = 0x04060f, SHELL = 0xd6d4ce;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => a + (b - a) * k;
const KIT = { time: { value: 0 }, env: null, shared: new Set() };
const keep = tex => { KIT.shared.add(tex); return tex; };

// ---------- noise ----------
const Noise = (() => {
  let s = 20240611;
  const r = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const p = new Uint8Array(512), g = new Float32Array(256);
  const idx = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  for (let i = 0; i < 512; i++) p[i] = idx[i & 255];
  for (let i = 0; i < 256; i++) g[i] = r();
  function n3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let u = x - xi, v = y - yi, w = z - zi;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v); w = w * w * (3 - 2 * w);
    const X = xi & 255, Y = yi & 255, Z = zi & 255;
    const A = p[X] + Y, B = p[X + 1] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, BA = p[B] + Z, BB = p[B + 1] + Z;
    const l = (a, b, k) => a + (b - a) * k;
    return l(l(l(g[p[AA]], g[p[BA]], u), l(g[p[AB]], g[p[BB]], u), v), l(l(g[p[AA + 1]], g[p[BA + 1]], u), l(g[p[AB + 1]], g[p[BB + 1]], u), v), w);
  }
  function fbm(x, y, z, oct) {
    let a = 0.5, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += a * n3(x, y, z); norm += a; x = x * 2.03 + 11.7; y = y * 2.03 + 5.3; z = z * 2.03 + 3.1; a *= 0.5; }
    return sum / norm;
  }
  return { n3, fbm, rand: r };
})();
const GLSL_NOISE = `
float hash31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }`;

// ---------- canvas helpers ----------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  if (o.color !== false) t.encoding = THREE.sRGBEncoding;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.anisotropy = 8;
  return o.own ? t : keep(t);
}
// Paint a whole globe: fn gets the surface direction for every pixel and returns the layers' colours.
function bakeGlobe(w, h, layers, fn) {
  const cs = [], imgs = [];
  for (let i = 0; i < layers; i++) { const c = canvas(w, h); cs.push(c); imgs.push(c.getContext('2d').createImageData(w, h)); }
  const out = new Float32Array(layers * 4);
  for (let y = 0; y < h; y++) {
    const th = (y + 0.5) / h * Math.PI, st = Math.sin(th), dy = Math.cos(th);
    for (let x = 0; x < w; x++) {
      const ph = (x + 0.5) / w * Math.PI * 2;
      fn(-Math.cos(ph) * st, dy, Math.sin(ph) * st, out);
      const o = (y * w + x) * 4;
      for (let i = 0; i < layers; i++) { const d = imgs[i].data; d[o] = out[i * 4]; d[o + 1] = out[i * 4 + 1]; d[o + 2] = out[i * 4 + 2]; d[o + 3] = out[i * 4 + 3]; }
    }
  }
  cs.forEach((c, i) => c.getContext('2d').putImageData(imgs[i], 0, 0));
  return cs;
}
const ramp = (stops, k) => {                    // stops: [[pos, r, g, b], ...]
  k = clamp01(k);
  for (let i = 1; i < stops.length; i++) if (k <= stops[i][0]) {
    const a = stops[i - 1], b = stops[i], u = (k - a[0]) / (b[0] - a[0] || 1);
    return [mix(a[1], b[1], u), mix(a[2], b[2], u), mix(a[3], b[3], u)];
  }
  const l = stops[stops.length - 1]; return [l[1], l[2], l[3]];
};

let _glow, _flare;
function glowTex() {
  if (_glow) return _glow;
  const c = canvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (_glow = tex(c));
}
function flareTex() {                              // soft star with diffraction spikes
  if (_flare) return _flare;
  const c = canvas(256, 256), g = c.getContext('2d');
  g.translate(128, 128);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.08, 'rgba(255,255,255,.7)'); gr.addColorStop(0.3, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(-128, -128, 256, 256);
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 4 * (i % 2 ? 1 : 1));
    const lg = g.createLinearGradient(-128, 0, 128, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,' + (i % 2 ? 0.25 : 0.8) + ')'); lg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = lg; g.fillRect(-128, -1.2, 256, 2.4);
  }
  return (_flare = tex(c));
}
function glow(color, size, opacity = 1, map) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: map || glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- materials ----------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.1 }, o));
const paint = (color, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.42, metalness: 0.1, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 0.8 }, o));
const metal = (color = 0x9aa2b5, o = {}) => mat(color, Object.assign({ metalness: 0.95, roughness: 0.32 }, o));
const glass = (color = 0x9fd8ff, opacity = 0.16) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.04, metalness: 0.6, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
const lit = (color, k = 1) => { const m = new THREE.MeshBasicMaterial({ color }); m.color.multiplyScalar(k); return m; };
function box(w, h, d, m) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); }
function cyl(r1, r2, h, m, seg = 24) { return new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m); }
// A thin rod running from one point to another.
function between(a, b, r, m) {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A), len = d.length();
  const rod = cyl(r, r, len, m, 8); rod.position.copy(A).addScaledVector(d, 0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return rod;
}
function shadowAll(root, cast = true, receive = true) { root.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = cast; o.receiveShadow = receive; } }); return root; }

let _panel;
function panelTex() {                              // hull plating: seams, rivets, a little grime
  if (_panel) return _panel;
  const c = canvas(512, 512), g = c.getContext('2d');
  g.fillStyle = '#e9e7e2'; g.fillRect(0, 0, 512, 512);
  const img = g.getImageData(0, 0, 512, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(40,44,60,.55)'; g.lineWidth = 1.5;
  for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let y = 0; y < 512; y += 64) for (let x = (y / 64 % 2) * 64; x <= 512; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
  g.fillStyle = 'rgba(40,44,60,.4)';
  for (let y = 8; y < 512; y += 64) for (let x = 8; x < 512; x += 16) g.fillRect(x, y, 1.6, 1.6);
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(60,55,50,' + rnd(0.02, 0.07) + ')'; g.fillRect(rnd(0, 512), rnd(0, 512), rnd(2, 6), rnd(20, 120)); }
  return (_panel = tex(c, { repeat: [1, 1] }));
}
function hull(color = SHELL, rep = [2, 1], o = {}) {
  const t = panelTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.encoding = THREE.sRGBEncoding;
  return paint(color, Object.assign({ map: t, bumpMap: t, bumpScale: 0.004 }, o));
}
let _solar;
function solarTex() {
  if (_solar) return _solar;
  const c = canvas(256, 256), g = c.getContext('2d');
  g.fillStyle = '#060d26'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) for (let x = 0; x < 256; x += 64) {
    const gr = g.createLinearGradient(x, y, x + 64, y + 64); gr.addColorStop(0, '#102a6e'); gr.addColorStop(1, '#081844');
    g.fillStyle = gr; g.fillRect(x + 2, y + 2, 60, 60);
    g.strokeStyle = 'rgba(120,140,200,.25)'; g.lineWidth = 0.6;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 2, y + k * 16); g.lineTo(x + 62, y + k * 16); g.stroke(); }
  }
  return (_solar = tex(c, { repeat: [1, 1] }));
}
function solarPanel(w, h) {
  const t = solarTex().clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(Math.max(1, Math.round(w * 1.3)), Math.max(1, Math.round(h * 1.3))); t.encoding = THREE.sRGBEncoding;
  const g = new THREE.Group();
  g.add(box(w, 0.04, h, mat(0xffffff, { map: t, metalness: 0, roughness: 0.8, envMapIntensity: 0.08 })));
  const frame = box(w + 0.06, 0.03, h + 0.06, metal(0xb9bfd0)); frame.position.y = -0.02; g.add(frame);
  return g;
}
function hazardTex() {
  const c = canvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#e9b21a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#1a1c24';
  for (let i = -128; i < 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 160, 128); g.lineTo(i + 128, 128); g.fill(); }
  return tex(c, { repeat: [1, 1], own: true });
}

// ---------- lights and reflections ----------
function buildEnv(renderer) {
  const s = new THREE.Scene();
  const dc = canvas(4, 128), dx = dc.getContext('2d'), dgr = dx.createLinearGradient(0, 0, 0, 128);
  dgr.addColorStop(0, '#1a2550'); dgr.addColorStop(0.48, '#25356e'); dgr.addColorStop(0.52, '#141b3c'); dgr.addColorStop(1, '#090c1c');
  dx.fillStyle = dgr; dx.fillRect(0, 0, 4, 128);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: tex(dc, { own: true }), side: THREE.BackSide }));
  s.add(dome);
  const card = (hex, k, x, y, z, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit(hex, k)); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  card(0xfff2dd, 2.6, 28, 26, 22, 22, 22);         // sun
  card(0x7fb6ff, 2.2, -34, 6, 10, 26, 40);         // cool fill
  card(0x6f7fb8, 0.7, 4, -30, 20, 40, 14);         // soft bounce from below
  card(0xbcd0ff, 1.5, 0, 12, -38, 60, 10);
  const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.03);
  pm.dispose(); disposeTree(s);
  return rt.texture;
}
// A sun, soft sky fill, and (optionally) shadows.
function lights(scene, o = {}) {
  scene.environment = KIT.env;
  const hemi = new THREE.HemisphereLight(o.sky || 0x8fa6ff, o.ground || 0x1a1522, o.fill === undefined ? 0.5 : o.fill); scene.add(hemi);
  const sun = new THREE.DirectionalLight(o.color || 0xfff3e2, o.power === undefined ? 2.0 : o.power);
  const p = o.sun || [7, 9, 11]; sun.position.set(p[0], p[1], p[2]); scene.add(sun);
  if (o.shadow) {
    const k = o.shadow; sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -k, right: k, top: k, bottom: -k, near: 1, far: 140 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    sun.position.multiplyScalar(4);
  }
  scene.userData.sun = sun; scene.userData.hemi = hemi;
  return sun;
}

// ---------- the sky ----------
let _sky, _starGeo;
function skyTexture() {                            // faint gas and dust; the stars themselves are drawn as points
  if (_sky) return _sky;
  const band = [0.33, 0.82, 0.46];
  const [neb] = bakeGlobe(512, 256, 1, (x, y, z, o) => {
    const d = x * band[0] + y * band[1] + z * band[2], b = Math.exp(-d * d * 12);
    const n1 = Noise.fbm(x * 3 + 4, y * 3 + 1, z * 3 + 9, 5), n2 = Noise.fbm(x * 5 + 21, y * 5 + 3, z * 5 + 2, 5), dust = Noise.fbm(x * 9 + 2, y * 9 + 8, z * 9 + 5, 5);
    const mw = b * (0.2 + 1.2 * n1 * n1) * (1 - 0.9 * sstep(0.44, 0.66, dust) * b);
    const cloud = sstep(0.56, 0.86, n2) * (0.1 + 0.5 * b), cloud2 = sstep(0.58, 0.88, Noise.fbm(x * 4 + 40, y * 4 + 7, z * 4 + 31, 4)) * 0.22;
    o[0] = 1 + mw * 46 + cloud * 30 + cloud2 * 3; o[1] = 2 + mw * 40 + cloud * 11 + cloud2 * 16; o[2] = 5 + mw * 42 + cloud * 36 + cloud2 * 30; o[3] = 255;
  });
  return (_sky = tex(neb));
}
function starGeometry() {
  if (_starGeo) return _starGeo;
  const n = 7000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), band = [0.33, 0.82, 0.46];
  const tints = [[0.62, 0.72, 1], [0.8, 0.86, 1], [1, 1, 1], [1, 0.94, 0.84], [1, 0.84, 0.62], [1, 0.7, 0.5]];
  for (let i = 0; i < n; i++) {
    let x, y, z, tries = 0;
    do { z = rnd(-1, 1); const a = rnd(0, 6.2832), r = Math.sqrt(1 - z * z); x = r * Math.cos(a); y = r * Math.sin(a); const d = x * band[0] + y * band[1] + z * band[2]; if (i % 3 || Math.random() < Math.exp(-d * d * 9)) break; } while (++tries < 12);
    pos.set([x * 1300, y * 1300, z * 1300], i * 3);
    const b = Math.pow(Math.random(), 6), tint = tints[Math.floor(Math.random() * tints.length)], k = 0.08 + 0.92 * b;
    col.set([tint[0] * k, tint[1] * k, tint[2] * k], i * 3); size[i] = 1.3 + 3.2 * b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  return (_starGeo = g);
}
KIT.pix = { value: 1 };
function skyDome(tilt = 0.5, spin = 0, dim = 1) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, toneMapped: false, fog: false }));
  m.material.color.setScalar(dim); m.renderOrder = -10;
  const stars = new THREE.Points(starGeometry(), new THREE.ShaderMaterial({ uniforms: { pix: KIT.pix, dim: { value: dim } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'attribute float size; attribute vec3 color; uniform float pix; varying vec3 vC; void main(){ vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * pix; }',
    fragmentShader: 'uniform float dim; varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a * dim * 1.5, 1.0); }' }));
  stars.frustumCulled = false; stars.renderOrder = -9; stars.userData.sharedGeo = true;
  g.add(m, stars); g.rotation.set(tilt, spin, 0.3);
  return g;
}

// ---------- worlds ----------
const ATMO_VS = 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
function atmosphere(radius, color, sunDir, k = 1.09) {
  const g = new THREE.Group(), uni = { tint: { value: new THREE.Color(color) }, sun: { value: sunDir }, c0: { value: Math.sqrt(1 - 1 / (k * k)) } };
  const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * k, 64, 48), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: ATMO_VS, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    fragmentShader: 'uniform vec3 tint; uniform vec3 sun; uniform float c0; varying vec3 vN; varying vec3 vW; void main(){ float c = clamp(-vN.z / c0, 0.0, 1.0); float day = smoothstep(-0.55, 0.35, dot(vW, sun)); gl_FragColor = vec4(tint * pow(c, 2.6) * 1.25 * (0.06 + day), 1.0); }' }));
  const rim = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.008, 64, 48), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: ATMO_VS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    fragmentShader: 'uniform vec3 tint; uniform vec3 sun; varying vec3 vN; varying vec3 vW; void main(){ float f = pow(1.0 - clamp(vN.z, 0.0, 1.0), 3.4); float day = smoothstep(-0.2, 0.5, dot(vW, sun)); gl_FragColor = vec4(tint * f * 0.5 * (0.04 + day), 1.0); }' }));
  g.add(halo, rim);
  return g;
}
let _earth;
function earthMaps() {
  if (_earth) return _earth;
  const ocean = [[0, 4, 24, 66], [0.6, 9, 52, 112], [1, 30, 110, 150]];
  const [col, rough, bump, cloud] = bakeGlobe(1024, 512, 4, (x, y, z, o) => {
    let e = Noise.fbm(x * 1.5 + 11, y * 1.5 + 3, z * 1.5 + 7, 6) + 0.2 * (Noise.fbm(x * 4.3 + 1, y * 4.3 + 9, z * 4.3 + 4, 4) - 0.5);
    const lat = Math.abs(y), wet = Noise.fbm(x * 2.6 + 30, y * 2.6 + 12, z * 2.6 + 5, 4), fine = Noise.n3(x * 40, y * 40, z * 40);
    const ice = lat + (wet - 0.5) * 0.22;
    let r, g, b, ro, h = 0;
    if (e < 0.52) {
      [r, g, b] = ramp(ocean, sstep(0.3, 0.52, e)); ro = 70;
      if (ice > 0.93) { r = 228; g = 238; b = 246; ro = 150; }
    } else {
      h = (e - 0.52) / 0.3;
      const dry = sstep(0.42, 0.62, 1 - wet) * sstep(0.62, 0.2, Math.abs(lat - 0.36) * 2.2 + 0.1);
      const cold = sstep(0.5, 0.82, lat + h * 0.25);
      const green = [mix(34, 58, fine), mix(92, 118, fine), mix(40, 52, fine)], sand = [196, 164, 110], tundra = [112, 110, 86], rock = [110, 98, 86];
      r = mix(green[0], sand[0], dry); g = mix(green[1], sand[1], dry); b = mix(green[2], sand[2], dry);
      r = mix(r, tundra[0], cold); g = mix(g, tundra[1], cold); b = mix(b, tundra[2], cold);
      const m = sstep(0.35, 0.75, h); r = mix(r, rock[0], m); g = mix(g, rock[1], m); b = mix(b, rock[2], m);
      const snow = Math.max(sstep(0.85, 0.95, ice), sstep(0.62, 0.9, h) * sstep(0.3, 0.7, lat + 0.25));
      r = mix(r, 240, snow); g = mix(g, 244, snow); b = mix(b, 250, snow); ro = mix(235, 170, snow);
      const beach = sstep(0.03, 0, h); r = mix(r, 200, beach * 0.6); g = mix(g, 186, beach * 0.6); b = mix(b, 140, beach * 0.6);
    }
    o[0] = r; o[1] = g; o[2] = b; o[3] = 255;
    o[4] = ro; o[5] = ro; o[6] = ro; o[7] = 255;
    const hv = e < 0.52 ? 0 : 60 + h * 190; o[8] = hv; o[9] = hv; o[10] = hv; o[11] = 255;
    const wx = Noise.fbm(x * 2 + 50, y * 2 + 60, z * 2 + 70, 3) - 0.5, cl = Noise.fbm(x * 3.4 + wx * 2.2 + 80, y * 5.2 + wx * 1.2 + 14, z * 3.4 - wx * 2.2 + 25, 6);
    const belt = 0.52 - 0.1 * Math.cos(lat * 9.5) * (1 - lat);
    const a = sstep(belt, belt + 0.2, cl); o[12] = 255; o[13] = 255; o[14] = 255; o[15] = a * 235;
  });
  return (_earth = { map: tex(col), rough: tex(rough, { color: false }), bump: tex(bump, { color: false }), cloud: tex(cloud) });
}
function makeEarth(radius, sunPos = [7, 9, 11], air = 1.09) {
  const m = earthMaps(), g = new THREE.Group(), seg = radius > 30 ? 128 : 72;
  const sunDir = new THREE.Vector3(sunPos[0], sunPos[1], sunPos[2]).normalize();
  const tilt = new THREE.Group(); tilt.rotation.z = 0.41; g.add(tilt);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg * 0.6 | 0), new THREE.MeshStandardMaterial({ map: m.map, roughnessMap: m.rough, bumpMap: m.bump, bumpScale: radius * 0.012, metalness: 0.05, envMapIntensity: 0.25 }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.011, seg, seg * 0.6 | 0), new THREE.MeshStandardMaterial({ map: m.cloud, transparent: true, depthWrite: false, roughness: 1, metalness: 0, envMapIntensity: 0.1 }));
  tilt.add(globe, clouds);
  g.add(atmosphere(radius, 0x4f9dff, sunDir, air));
  g.userData.tick = (dt, rate = 0.02) => { globe.rotation.y += dt * rate; clouds.rotation.y += dt * rate * 1.25; };
  g.userData.globe = tilt;
  return g;
}
// The Earth seen from low orbit. A painted map would be a blur this close, so the surface is computed per pixel.
function makeOrbitEarth(radius, sunPos) {
  const g = new THREE.Group(), sunDir = new THREE.Vector3(sunPos[0], sunPos[1], sunPos[2]).normalize();
  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 160, 96), new THREE.ShaderMaterial({ uniforms: { time: KIT.time, sun: { value: sunDir } },
    vertexShader: 'varying vec3 vP; varying vec3 vW; void main(){ vP = position; vW = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_NOISE + `uniform float time; uniform vec3 sun; varying vec3 vP; varying vec3 vW;
      void main(){
        vec3 p = normalize(vP);
        float h = fbm3(p * 2.6 + 11.0) * 0.68 + fbm3(p * 11.0 + 3.0) * 0.32;
        float wet = fbm3(p * 5.0 + 30.0), lat = abs(p.y);
        vec3 sea = mix(vec3(0.012, 0.06, 0.2), vec3(0.03, 0.2, 0.34), smoothstep(0.36, 0.47, h));
        vec3 land = mix(vec3(0.1, 0.24, 0.1), vec3(0.5, 0.42, 0.26), smoothstep(0.42, 0.58, 1.0 - wet));
        land = mix(land, vec3(0.36, 0.32, 0.28), smoothstep(0.56, 0.66, h));
        vec3 c = mix(sea, land, smoothstep(0.468, 0.476, h));
        c = mix(c, vec3(0.9, 0.93, 0.97), smoothstep(0.86, 0.93, lat + (wet - 0.5) * 0.2));
        float w = fbm3(p * 3.0 + 50.0), cl = fbm3(p * 9.0 + w * 2.4 + vec3(time * 0.006, 0.0, 14.0));
        float cover = smoothstep(0.47, 0.7, cl);
        c = mix(c, vec3(0.8, 0.82, 0.86), cover * 0.9);
        float d = dot(normalize(vW), sun);
        c *= 0.03 + 1.0 * smoothstep(-0.12, 0.8, d);
        gl_FragColor = vec4(c, 1.0);
      }` }));
  globe.rotation.x = Math.PI / 2;                 // put the equator, not the pole, under the camera
  g.add(globe, atmosphere(radius, 0x4f9dff, sunDir, 1.014));
  g.userData.tick = () => {};
  return g;
}
let _moon, _mars, _gas = {};
function moonMaps() {
  if (_moon) return _moon;
  const [c] = bakeGlobe(512, 256, 1, (x, y, z, o) => {
    const mare = sstep(0.5, 0.62, Noise.fbm(x * 1.3 + 3, y * 1.3 + 8, z * 1.3 + 1, 4)), n = Noise.fbm(x * 9, y * 9, z * 9, 5);
    const v = mix(176, 96, mare) * (0.72 + 0.5 * n); o[0] = v; o[1] = v * 0.985; o[2] = v * 0.95; o[3] = 255;
  });
  const g = c.getContext('2d');
  for (let i = 0; i < 170; i++) {
    const y = Math.acos(rnd(-0.93, 0.93)) / Math.PI * 256, x = rnd(0, 512), r = Math.pow(Math.random(), 3) * 13 + 1.5, sx = 1 / Math.max(0.3, Math.sin(y / 256 * Math.PI));
    g.save(); g.translate(x, y); g.scale(sx, 1);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(60,58,56,.5)'); gr.addColorStop(0.72, 'rgba(70,68,64,.35)'); gr.addColorStop(0.86, 'rgba(235,232,225,.55)'); gr.addColorStop(1, 'rgba(200,198,190,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.restore();
  }
  const t = tex(c);
  return (_moon = { map: t, bump: t });
}
function marsMaps() {
  if (_mars) return _mars;
  const [c] = bakeGlobe(512, 256, 1, (x, y, z, o) => {
    const n = Noise.fbm(x * 2 + 5, y * 2 + 2, z * 2 + 9, 6), dark = sstep(0.5, 0.64, Noise.fbm(x * 1.6 + 20, y * 1.6 + 4, z * 1.6 + 7, 4)), cap = sstep(0.86, 0.93, Math.abs(y) + (n - 0.5) * 0.1);
    let r = mix(206, 120, dark) * (0.75 + 0.5 * n), g = mix(120, 62, dark) * (0.75 + 0.5 * n), b = mix(78, 44, dark) * (0.75 + 0.5 * n);
    o[0] = mix(r, 245, cap); o[1] = mix(g, 240, cap); o[2] = mix(b, 236, cap); o[3] = 255;
  });
  const t = tex(c);
  return (_mars = { map: t, bump: t });
}
function gasMap(key, stops) {
  if (_gas[key]) return _gas[key];
  const [c] = bakeGlobe(512, 256, 1, (x, y, z, o) => {
    const turb = Noise.fbm(x * 3 + 2, y * 9 + 5, z * 3 + 8, 5) - 0.5, k = (y * 0.5 + 0.5) + turb * 0.07, storm = sstep(0.72, 0.8, Noise.fbm(x * 6 + 9, y * 14 + 1, z * 6 + 3, 3)) * 0.12;
    const [r, g, b] = ramp(stops, (Math.sin(k * 34) * 0.5 + 0.5) * 0.55 + k * 0.45 + storm);
    o[0] = r; o[1] = g; o[2] = b; o[3] = 255;
  });
  return (_gas[key] = tex(c));
}
function makeRock(radius, kind) {
  const m = kind === 'mars' ? marsMaps() : moonMaps();
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), new THREE.MeshStandardMaterial({ map: m.map, bumpMap: m.bump, bumpScale: radius * 0.02, roughness: 0.95, metalness: 0, envMapIntensity: 0.15 }));
}
function makeGasGiant(radius, key = 'tan', ringed = true) {
  const pal = { tan: [[0, 96, 70, 60], [0.35, 190, 150, 112], [0.6, 232, 208, 170], [0.8, 168, 120, 92], [1, 110, 84, 80]], blue: [[0, 30, 50, 110], [0.4, 70, 120, 190], [0.7, 150, 190, 230], [1, 40, 70, 140]] }[key];
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), new THREE.MeshStandardMaterial({ map: gasMap(key, pal), roughness: 0.9, metalness: 0, envMapIntensity: 0.15 })));
  if (ringed) {
    const c = canvas(512, 4), x = c.getContext('2d');
    for (let i = 0; i < 512; i++) { const k = i / 512, a = (0.25 + 0.75 * Noise.n3(k * 26, 3, 7)) * sstep(0, 0.05, k) * sstep(1, 0.93, k) * (Math.abs(k - 0.62) < 0.035 ? 0.08 : 1); x.fillStyle = 'rgba(' + (214 + 30 * Noise.n3(k * 9, 1, 1) | 0) + ',' + (190 + 30 * Noise.n3(k * 9, 5, 1) | 0) + ',160,' + a.toFixed(3) + ')'; x.fillRect(i, 0, 1, 4); }
    const geo = new THREE.RingGeometry(radius * 1.3, radius * 2.25, 128, 1), uv = geo.attributes.uv, p = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - radius * 1.3) / (radius * 0.95), 0.5);
    const ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(c, { own: true }), transparent: true, side: THREE.DoubleSide, roughness: 1, metalness: 0, depthWrite: false, envMapIntensity: 0.1 }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
  }
  return g;
}
// A star: boiling surface plus corona. `cool` and `hot` set its colour.
function makeSun(radius, cool = 0xff7a1a, hot = 0xfff3c4, flare = 1) {
  const g = new THREE.Group();
  const uni = { time: KIT.time, cool: { value: new THREE.Color(cool) }, hot: { value: new THREE.Color(hot) }, seed: { value: Math.random() * 50 } };
  g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), new THREE.ShaderMaterial({ uniforms: uni,
    vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_NOISE + 'uniform float time; uniform float seed; uniform vec3 cool; uniform vec3 hot; varying vec3 vP; varying vec3 vN; void main(){ vec3 p = normalize(vP); float n = fbm3(p * 4.0 + seed + time * 0.08); float m = fbm3(p * 11.0 - seed - time * 0.16); float cells = smoothstep(0.25, 0.8, n * 0.65 + m * 0.5); float limb = pow(clamp(vN.z, 0.0, 1.0), 0.55); vec3 c = mix(cool, hot, cells) * (0.35 + 0.95 * limb); gl_FragColor = vec4(c * 1.5, 1.0); }' })));
  const c1 = glow(hot, radius * 5.2, 0.55 * flare), c2 = glow(cool, radius * 9.5, 0.4 * flare), c3 = glow(hot, radius * 9, 0.35 * flare, flareTex());
  c1.material.depthWrite = c2.material.depthWrite = false;
  g.add(c2, c1, c3);
  g.userData.tick = dt => { c3.material.rotation += dt * 0.03; };
  return g;
}
// A spiral galaxy, or (arms = 0) a dense galactic core.
function makeGalaxy(radius, arms = 2, count = 9000, warm = 0xffd9a8, cool = 0x8fb4ff) {
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3), a = new THREE.Color(warm), b = new THREE.Color(cool), pink = new THREE.Color(0xff7aa8), c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const bulge = Math.random() < (arms ? 0.24 : 0.75);
    let r = bulge ? Math.pow(Math.random(), 2.2) * radius * (arms ? 0.28 : 0.8) : Math.pow(Math.random(), 0.75) * radius;
    let th = Math.random() * 6.2832;
    if (!bulge && arms) { const arm = Math.floor(Math.random() * arms); th = arm * 6.2832 / arms + Math.log(1 + r / radius * 9) * 2.6 + (Math.random() - 0.5) * (0.55 - 0.3 * r / radius) * 2; }
    const hgt = (Math.random() - 0.5) * radius * (bulge ? 0.34 * (1 - r / radius * 0.8) : 0.035);
    pos.set([Math.cos(th) * r, hgt, Math.sin(th) * r], i * 3);
    c.copy(a).lerp(b, bulge ? 0 : sstep(0.15, 0.8, r / radius) * rnd(0.5, 1)); if (!bulge && Math.random() < 0.05) c.copy(pink);
    const k = rnd(0.25, 1) * (bulge ? 1 : 0.8); col.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const g = new THREE.Group();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: radius * 0.035, map: glowTex(), vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(pts, glow(warm, radius * (arms ? 0.9 : 2.2), 0.8), glow(0xffffff, radius * 0.3, 0.9));
  g.userData.tick = dt => { pts.rotation.y += dt * 0.02; };
  return g;
}

// ---------- spacecraft parts ----------
function makePlume(r, len, color = 0xff8a2a) {
  const pts = [[r * 0.75, 0], [r * 1.05, 0.1], [r * 0.95, 0.35], [r * 0.55, 0.7], [0.001, 1]].map(p => new THREE.Vector2(p[0], p[1] * len));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.ShaderMaterial({
    uniforms: { time: KIT.time, power: { value: 1 }, tint: { value: new THREE.Color(color) } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: GLSL_NOISE + 'uniform float time; uniform float power; uniform vec3 tint; varying vec2 vUv; varying vec3 vN; void main(){ float a = 1.0 - vUv.y; float n = vnoise(vec3(vUv.x * 14.0, vUv.y * 5.0 - time * 9.0, time * 2.0)); float face = pow(abs(vN.z), 1.3); vec3 c = mix(tint, vec3(0.8, 0.92, 1.0), pow(a, 2.5)); float k = a * a * (0.55 + 0.7 * n) * face * power; gl_FragColor = vec4(c * k * 1.6, 1.0); }' }));
  m.rotation.z = Math.PI / 2;                     // points along -x
  const g = new THREE.Group(); g.add(m);
  const halo = glow(color, r * 7, 0.7); halo.position.x = -r * 1.5; g.add(halo);
  g.userData.power = k => { m.material.uniforms.power.value = k * (0.85 + 0.3 * Math.random()); halo.material.opacity = 0.7 * k; g.visible = k > 0.01; m.scale.y = 0.6 + 0.5 * k; };
  return g;
}
// A rocket pointing along +x, centred on its middle. userData.thrust(0..1) lights the engine.
function makeRocket(len = 2.4, radius, trim = CORAL) {
  const r = radius || len * 0.105, g = new THREE.Group(), L = len, half = L / 2, nose0 = half - L * 0.34;
  const prof = [[r * 0.86, -half + L * 0.06], [r, -half + L * 0.1], [r, nose0]];
  for (let k = 1; k <= 14; k++) { const u = k / 14; prof.push([r * Math.pow(Math.cos(u * Math.PI / 2), 0.72), nose0 + (half - nose0) * u]); }
  const spin = m => { m.rotation.z = -Math.PI / 2; return m; };
  g.add(spin(new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(p[0], 0.0001), p[1])), 48), hull(SHELL, [Math.max(2, Math.round(r * 9)), Math.max(2, Math.round(L * 0.9))]))));
  const capProf = prof.slice(9).map(p => new THREE.Vector2(Math.max(p[0], 0.0001) * 1.004 + 0.002, p[1]));
  g.add(spin(new THREE.Mesh(new THREE.LatheGeometry(capProf, 48), paint(trim))));
  const band = spin(cyl(r * 1.006, r * 1.006, L * 0.045, paint(trim), 48)); band.position.x = -half + L * 0.2; g.add(band);
  const skirt = spin(cyl(r * 0.86, r * 0.7, L * 0.06, metal(0x30344a, { roughness: 0.5 }), 32)); skirt.position.x = -half + L * 0.03; g.add(skirt);
  const bell = spin(new THREE.Mesh(new THREE.LatheGeometry([[0.25, 0.06], [0.3, 0.03], [0.48, -0.03], [0.62, -0.09]].map(p => new THREE.Vector2(p[0] * r, p[1] * L)), 24), metal(0x4a4e60, { side: THREE.DoubleSide, roughness: 0.4 })));
  bell.position.x = -half; g.add(bell);
  const fs = new THREE.Shape(); fs.moveTo(0.17 * L, 0); fs.lineTo(-0.04 * L, r * 1.25); fs.lineTo(-0.12 * L, r * 1.25); fs.lineTo(-0.1 * L, 0); fs.lineTo(0.17 * L, 0);
  const fg = new THREE.ExtrudeGeometry(fs, { depth: r * 0.09, bevelEnabled: true, bevelSize: r * 0.02, bevelThickness: r * 0.02, bevelSegments: 2 }); fg.translate(0, 0, -r * 0.045);
  for (let i = 0; i < 3; i++) {
    const hold = new THREE.Group(), fin = new THREE.Mesh(fg, paint(trim)); fin.position.set(-half + L * 0.14, r * 0.92, 0);
    hold.add(fin); hold.rotation.x = i * Math.PI * 2 / 3 + Math.PI / 2; g.add(hold);
  }
  const port = new THREE.Group(); port.position.set(L * 0.06, r * 0.25, r * 0.94); g.add(port);
  const ringm = new THREE.Mesh(new THREE.TorusGeometry(r * 0.36, r * 0.07, 12, 32), metal(0xc9cede)); port.add(ringm);
  const pane = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 20, 14), mat(0x6fd0ff, { emissive: 0x1d6ea8, emissiveIntensity: 0.9, roughness: 0.08, metalness: 0.6 })); pane.scale.z = 0.35; port.add(pane);
  const plume = makePlume(r * 0.62, L * 0.75); plume.position.x = -half - L * 0.085; g.add(plume);
  g.userData.thrust = k => plume.userData.power(k);
  g.userData.thrust(0);
  return g;
}
// A small astronaut; the visor colour says who it is.
function makeAstronaut(accent) {
  const g = new THREE.Group(), suit = mat(0xe8eaf0, { roughness: 0.75 }), trim = mat(accent, { roughness: 0.5 });
  const torso = cyl(0.19, 0.22, 0.46, suit, 16); torso.position.y = 0.6; g.add(torso);
  const belt = cyl(0.225, 0.225, 0.07, trim, 16); belt.position.y = 0.42; g.add(belt);
  for (const sx of [-1, 1]) {
    const leg = cyl(0.085, 0.08, 0.38, suit, 12); leg.position.set(sx * 0.1, 0.2, 0); g.add(leg);
    const boot = box(0.13, 0.08, 0.2, mat(0x3a3f55)); boot.position.set(sx * 0.1, 0.03, 0.03); g.add(boot);
    const arm = cyl(0.065, 0.06, 0.4, suit, 12); arm.position.set(sx * 0.27, 0.6, 0.02); arm.rotation.z = sx * 0.28; g.add(arm);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), trim); glove.position.set(sx * 0.33, 0.4, 0.02); g.add(glove);
  }
  const pack = box(0.32, 0.42, 0.16, mat(0xc9ccd6, { roughness: 0.6 })); pack.position.set(0, 0.64, -0.2); g.add(pack);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), suit); helmet.position.y = 1.02; g.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), mat(accent, { metalness: 1, roughness: 0.12, envMapIntensity: 1.8 })); visor.position.set(0, 1.03, 0.075); visor.scale.set(1, 0.82, 0.8); g.add(visor);
  return g;
}
function disposeTree(root) {
  root.traverse(o => {
    if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach(x => {
      for (const k of ['map', 'bumpMap', 'roughnessMap', 'emissiveMap', 'alphaMap']) if (x[k] && !KIT.shared.has(x[k])) x[k].dispose();
      // the material itself is left alone on purpose: that keeps its compiled shader cached, so the next scene that needs it opens without a pause
    });
  });
}

// ---------- finishing: bloom, vignette, film grain ----------
function makePost(renderer) {
  if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass || !THREE.ShaderPass) return null;
  try {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    // the scene is drawn straight into display (sRGB) colour so dark skies keep their smooth gradients
    const RT = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
    const rt = new RT(size.x, size.y, { format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, encoding: THREE.sRGBEncoding });
    const composer = new THREE.EffectComposer(renderer, rt);
    const render = new THREE.RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.5, 0.6, 0.9);
    const finish = new THREE.ShaderPass({ uniforms: { tDiffuse: { value: null }, time: KIT.time },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); } void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; vec2 q = vUv - 0.5; c *= mix(0.74, 1.0, smoothstep(0.86, 0.3, length(q))); c += (h(gl_FragCoord.xy) - 0.5) * 0.016; gl_FragColor = vec4(c, 1.0); }' });
    composer.addPass(render); composer.addPass(bloom); composer.addPass(finish);
    return { composer, render, bloom };
  } catch (e) { return null; }
}
