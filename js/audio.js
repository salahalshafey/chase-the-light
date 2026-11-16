/*
 * Sound: every effect is synthesised with the Web Audio API, there are no audio files.
 * Sfx.<name>() plays an effect; Sfx.ambient() runs the menu music; Sfx.engine() is the speed-linked hum.
 */
'use strict';

const Sfx = {
  ctx: null, muted: false, out: null, eng: null,
  // Browsers only allow sound after a tap or key press, so this is called from the first one.
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 6; comp.connect(c.destination);
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : 0.55; this.out.connect(comp);
      const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      if (this.wantAmbient) this.ambient(true);
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.03); },
  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; },
  env(v, t, delay = 0, attack = 0.006, into) {
    const c = this.ctx, g = c.createGain(), t0 = c.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    g.connect(into || this.out); return { g, t0 };
  },
  tone(f, t = 0.15, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx, { g, t0 } = this.env(o.v || 0.2, t, o.delay, o.attack, o.into), osc = c.createOscillator();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t0); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + t);
    osc.connect(g); osc.start(t0); osc.stop(t0 + t + 0.05);
  },
  noise(t = 0.3, o = {}) {
    if (!this.ok()) return;
    const c = this.ctx, { g, t0 } = this.env(o.v || 0.25, t, o.delay, o.attack, o.into), src = c.createBufferSource(), flt = c.createBiquadFilter();
    src.buffer = this.noiseBuf; src.loop = true; flt.type = o.type || 'lowpass'; flt.Q.value = o.q || 0.8;
    flt.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + t);
    src.connect(flt); flt.connect(g); src.start(t0, Math.random()); src.stop(t0 + t + 0.05);
  },
  // ----- the effects -----
  click() { this.tone(520, 0.06, { v: 0.12, to: 760, type: 'triangle' }); },
  hover() { this.tone(2200, 0.05, { v: 0.07, to: 1800 }); this.tone(3300, 0.03, { v: 0.025 }); },           // glass tick over a mission card
  jump() { this.tone(300, 0.35, { v: 0.11, to: 4200, attack: 0.15 }); this.noise(0.3, { v: 0.14, f: 6000, type: 'highpass', delay: 0.3 }); this.tone(90, 0.5, { v: 0.22, to: 40, delay: 0.33 }); },   // jump to light speed
  slide(b) { const now = performance.now(); if (now - (this._sl || 0) < 45) return; this._sl = now; this.tone(180 + 1100 * b * b, 0.05, { v: 0.05, type: 'triangle' }); },
  wall() { this.tone(140, 0.22, { v: 0.2, to: 70, type: 'square' }); this.noise(0.15, { v: 0.08, f: 900 }); },
  tick(high) { this.tone(high ? 1560 : 1040, 0.035, { v: high ? 0.035 : 0.05, type: 'sine' }); },
  good() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.32, { v: 0.14, delay: i * 0.085, type: 'triangle' })); this.tone(2093, 0.5, { v: 0.05, delay: 0.34 }); },
  bad() { this.tone(220, 0.16, { v: 0.14, to: 180, type: 'sawtooth' }); this.tone(165, 0.26, { v: 0.14, to: 120, type: 'sawtooth', delay: 0.15 }); },
  fanfare() { [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, i === 6 ? 0.9 : 0.2, { v: 0.14, delay: i * 0.12, type: 'triangle' })); },
  whoosh(t = 0.7, up = true) { this.noise(t, { v: 0.22, f: up ? 300 : 3000, to: up ? 3200 : 260, type: 'bandpass', q: 1.2, attack: t * 0.4 }); },
  launch(t = 4) { this.noise(t, { v: 0.3, f: 140, to: 900, attack: 0.5 }); this.tone(55, t, { v: 0.12, to: 150, type: 'sawtooth', attack: 0.6 }); },
  arrive() { this.tone(880, 0.5, { v: 0.12 }); this.tone(1320, 0.7, { v: 0.1, delay: 0.12 }); },
  clang() { [310, 465, 742, 1190].forEach(f => this.tone(f, 0.5, { v: 0.09, type: 'square', to: f * 0.985 })); this.noise(0.08, { v: 0.2, f: 3000 }); },
  crunch() { this.noise(0.45, { v: 0.4, f: 1800, to: 180 }); this.tone(90, 0.4, { v: 0.25, to: 45, type: 'square' }); },
  thunder() { this.noise(0.12, { v: 0.5, f: 6000, type: 'highpass' }); this.noise(1.6, { v: 0.45, f: 900, to: 70, delay: 0.03 }); this.tone(70, 1.2, { v: 0.2, to: 35, delay: 0.03 }); },
  ping(high) { this.tone(high ? 1760 : 990, 0.6, { v: 0.14 }); this.tone(high ? 2640 : 1485, 0.35, { v: 0.05 }); },
  warp() { this.tone(240, 1.1, { v: 0.12, to: 1900, attack: 0.5 }); this.noise(1.2, { v: 0.14, f: 500, to: 6000, type: 'bandpass', q: 2.5, attack: 0.7 }); this.tone(1320, 0.8, { v: 0.08, delay: 1.0 }); this.tone(1980, 1.0, { v: 0.05, delay: 1.08 }); },
  // ----- the mission menu: near silence, single glassy bells in a huge hall, and now and then a shooting star or a far-off ping -----
  hall() {                                         // an echoing space, made from fading noise
    if (this.hallBuf) return this.hallBuf;
    const c = this.ctx, len = Math.floor(c.sampleRate * 4), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    return (this.hallBuf = buf);
  },
  ambient(on) {
    this.wantAmbient = on;
    const c = this.ctx; if (!c) return;
    const now = c.currentTime;
    if (!on) {
      const a = this.amb; if (!a) return;
      this.amb = null; a.timers.forEach(clearTimeout);
      a.g.gain.cancelScheduledValues(now); a.g.gain.setTargetAtTime(0, now, 0.5);
      setTimeout(() => { a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); try { a.g.disconnect(); a.wet.disconnect(); } catch (e) {} }, 3000);
      return;
    }
    if (this.amb) return;
    try {
      const g = c.createGain(), rev = c.createConvolver(), wet = c.createGain(), nodes = [], timers = [];
      g.gain.value = 0; g.gain.setTargetAtTime(1, now, 1.5);                    // fades in
      rev.buffer = this.hall(); wet.gain.value = 0.85;
      g.connect(this.out); g.connect(rev); rev.connect(wet); wet.connect(this.out);
      // two very quiet low notes underneath, so the silence between bells is not empty
      for (const [f, v] of [[146.83, 0.035], [220, 0.03]]) {
        const o = c.createOscillator(), og = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        o.frequency.value = f; og.gain.value = v; lfo.frequency.value = 0.05; lg.gain.value = v * 0.5;
        lfo.connect(lg); lg.connect(og.gain); o.connect(og); og.connect(g); o.start(); lfo.start(); nodes.push(o, lfo);
      }
      const amb = this.amb = { g, wet, nodes, timers };
      const pick = a => a[Math.floor(Math.random() * a.length)];
      const every = (min, max, fn, first) => { const tick = () => { if (this.amb !== amb) return; if (this.ok()) fn(); timers.push(setTimeout(tick, (min + Math.random() * (max - min)) * 1000)); }; timers.push(setTimeout(tick, first * 1000)); };
      // crystal bells
      every(0.9, 2.6, () => { const f = pick([587.33, 739.99, 880, 987.77, 1174.66, 1479.98, 1760]); this.tone(f, 3.2, { v: 0.06, attack: 0.01, into: g }); this.tone(f * 2.76, 1.2, { v: 0.012, attack: 0.01, into: g }); }, 0.8);
      // a few times a minute: a shooting star, or a ping that repeats fainter each time
      every(10, 22, () => {
        if (Math.random() < 0.5) { this.tone(2600, 1.1, { v: 0.06, to: 700, attack: 0.05, into: g }); this.noise(1.1, { v: 0.045, f: 5000, to: 1500, type: 'bandpass', q: 3, attack: 0.05, into: g }); }
        else [0, 0.38, 0.76].forEach((d, i) => this.tone(1320, 0.8, { v: 0.1 / (1 + i * 1.6), delay: d, into: g }));
      }, 6);
    } catch (e) { this.amb = null; }
  },
  // ----- a steady engine hum whose pitch follows speed -----
  engine(level, pitch = 0.3) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.eng) {
      if (level <= 0) return;
      const g = c.createGain(); g.gain.value = 0; g.connect(this.out);
      const src = c.createBufferSource(), flt = c.createBiquadFilter(), osc = c.createOscillator(), og = c.createGain();
      src.buffer = this.noiseBuf; src.loop = true; flt.type = 'lowpass'; src.connect(flt); flt.connect(g); src.start();
      osc.type = 'sawtooth'; og.gain.value = 0.25; osc.connect(og); og.connect(flt); osc.start();
      this.eng = { g, flt, osc };
    }
    const e = this.eng, now = c.currentTime;
    e.g.gain.setTargetAtTime(Math.max(0, level) * 0.16, now, 0.15);
    e.flt.frequency.setTargetAtTime(160 + 2200 * pitch, now, 0.2);
    e.osc.frequency.setTargetAtTime(38 + 150 * pitch, now, 0.2);
  }
};
document.addEventListener('visibilitychange', () => { if (!Sfx.ctx) return; if (document.hidden) Sfx.ctx.suspend().catch(() => {}); else Sfx.ctx.resume().catch(() => {}); });
['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, () => Sfx.init(), { passive: true }));
