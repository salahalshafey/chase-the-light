/*
 * The game shell: menu, mission flow, the side console, 3D labels, language switch, saved stars, sound hooks and the render loop.
 * Loaded last, because it starts the game.
 */
'use strict';

const MISSIONS = [
  { id: 'm1', steps: 3, make: a => new LightClock(a, { mode: 'm1' }) },
  { id: 'm2', steps: 3, make: a => new TwinTrip(a) },
  { id: 'm3', steps: 3, make: a => new LightClock(a, { mode: 'm3' }) },
  { id: 'm4', steps: 3, make: a => new Garage(a) },
  { id: 'm5', steps: 3, make: a => new Cockpit(a, { mode: 'm5' }) },
  { id: 'm6', steps: 3, make: a => new Train(a) },
  { id: 'lab', steps: 0, make: a => new Lab(a) }
];
const ALL_STARS = MISSIONS.reduce((n, m) => n + m.steps, 0);     // 18
const ICONS = {
  m1: '<circle cx="22" cy="24" r="15"/><path d="M22 14v10l7 4M16 4h12"/>',
  m2: '<circle cx="9" cy="33" r="5"/><path d="M15 29C22 14 30 12 37 11"/><path d="M36 4l2 5 5 1-4 3 1 5-4-3-5 3 2-5-4-4 5 0z"/>',
  m3: '<circle cx="19" cy="19" r="12"/><path d="M28 28l12 12M19 12v7l5 3"/>',
  m4: '<path d="M6 8v28M38 8v28M6 8h32"/><rect x="12" y="20" width="20" height="9" rx="4.5"/><path d="M32 24.5h4"/>',
  m5: '<rect x="14" y="3" width="16" height="38" rx="8"/><circle cx="22" cy="12" r="4"/><circle cx="22" cy="22" r="4"/><circle cx="22" cy="32" r="4" fill="currentColor"/>',
  m6: '<path d="M25 3L10 25h10l-3 16 17-24H23z"/>',
  lab: '<path d="M17 4h10M19 4v12L8 36a3 3 0 0 0 3 5h22a3 3 0 0 0 3-5L25 16V4"/><path d="M13 29h18"/>'
};
const icon = id => '<svg class="icon" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + ICONS[id] + '</svg>';
const starSvg = on => '<svg viewBox="0 0 24 24" class="' + (on ? 'on' : '') + '" fill="currentColor"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8l-6.2 3.3L7 14.2 2 9.3l6.9-1z"/></svg>';
const SPEAKER = on => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/>' + (on ? '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>' : '<path d="M17 9.5l5 5M22 9.5l-5 5"/>') + '</svg>';
const $ = id => document.getElementById(id);

const App = {
  beta: 0, betaMax: 0.999, stars: {}, labels: [], mission: null, def: null, step: 0, st: {}, seen: {},

  boot(saved) {
    // Arabic first. Only a language the player picked with the toggle is remembered.
    try { const s = JSON.parse(localStorage.getItem('chase-the-light') || '{}'); this.stars = s.stars || {}; if (s.picked && s.lang) { LANG = s.lang; this.picked = true; } Sfx.muted = !!s.muted; } catch (e) {}
    if (saved && saved.stars) this.stars = saved.stars;
    if (saved && saved.picked && saved.lang) { LANG = saved.lang; this.picked = true; }
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: true, powerPreference: 'high-performance' });
    } catch (e) { $('intro').remove(); $('nogl').hidden = false; $('nogl').textContent = t('nogl'); return; }
    const R = this.renderer;
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.setClearColor(NIGHT);
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.95;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    KIT.env = buildEnv(R);
    this.post = makePost(R);
    // quality steps down by itself on slow devices: 0 = full, 1 = lower resolution, 2 = no bloom
    this.quality = this.post ? 0 : 2; this.accT = 0; this.accN = 0; this.settle = 6;
    R.outputEncoding = THREE.sRGBEncoding;
    if (window.__q !== undefined) this.setQuality(window.__q, true);
    this.bind();
    this.setLang(LANG);
    const m = saved && saved.mission && MISSIONS.find(x => x.id === saved.mission);
    m ? this.open(m, Math.min(saved.step || 0, Math.max(0, m.steps - 1))) : this.menu();
    this.intro();
    window.addEventListener('resize', () => this.applyView());
    if (window.ResizeObserver) new ResizeObserver(() => this.applyView()).observe($('console'));
    this.last = performance.now();
    const loop = now => {
      requestAnimationFrame(loop);
      const raw = (now - this.last) / 1000, dt = Math.min(0.1, raw); this.last = now;
      this.frame(dt); this.watch(raw);
    };
    requestAnimationFrame(loop);
  },
  save() { try { localStorage.setItem('chase-the-light', JSON.stringify({ lang: LANG, picked: !!this.picked, muted: Sfx.muted, stars: Object.assign({ _seen: 1 }, this.stars) })); } catch (e) {} },
  setQuality(q, lock) {
    this.quality = q; if (lock) this.locked = true;
    const R = this.renderer;
    R.setPixelRatio(q ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.applyView();
  },
  watch(raw) {                                   // if the last second and a half averaged under ~22 frames a second, step the quality down
    if (this.locked || this.quality >= 2 || document.hidden) return;
    if (this.settle > 0) { this.settle--; this.accT = 0; this.accN = 0; return; }
    this.accT += raw; this.accN++;
    if (this.accT < 1.5) return;
    const avg = this.accT / this.accN; this.accT = 0; this.accN = 0;
    if (avg > 0.045) { this.settle = 6; this.setQuality(this.quality + 1); }
  },


  bind() {
    $('btn-lang').onclick = () => { Sfx.click(); this.picked = true; this.setLang(LANG === 'ar' ? 'en' : 'ar'); };
    $('btn-back').onclick = () => { Sfx.click(); this.menu(); };
    $('btn-sound').onclick = () => { Sfx.init(); Sfx.setMuted(!Sfx.muted); this.save(); this.renderSound(); Sfx.click(); };
    const range = $('sp-range');
    range.oninput = () => this.setBeta(range.value / 1000, false, true);
    $('sp-minus').onclick = () => this.setBeta(Math.round(this.beta * 1000 - 1) / 1000, false, true);
    $('sp-plus').onclick = () => this.setBeta(Math.round(this.beta * 1000 + 1) / 1000, false, true);
    $('c-go').onclick = () => {
      Sfx.click();
      if (this.awaitNext) return this.advance();
      if (this.mission && this.mission.onPrimary) this.mission.onPrimary();
    };
    $('m-menu').onclick = () => { Sfx.click(); $('modal').hidden = true; this.menu(); };
    $('m-again').onclick = () => { $('modal').hidden = true; this.open(this.def, 0); };
    $('m-next').onclick = () => { $('modal').hidden = true; const i = MISSIONS.indexOf(this.def); this.open(MISSIONS[i + 1] || MISSIONS[0], 0); };
    $('veil-lesson').onclick = () => this.showLesson();
    $('veil-enter').onclick = () => this.enter();
    $('ls-enter').onclick = () => this.enter();
    $('party-go').onclick = () => { Sfx.click(); this.closeParty(); if (!$('modal').hidden) $('m-next').focus(); };
    $('party-lab').onclick = () => { Sfx.click(); this.closeParty(); $('modal').hidden = true; this.open(MISSIONS.find(m => m.id === 'lab'), 0); };
    $('hero-badge').onclick = () => { Sfx.init(); this.party(); };
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('party').hidden) $('party-go').click(); });
  },

  // ----- language -----
  setLang(l) {
    LANG = l;
    document.documentElement.lang = l; document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.title = t('title');
    $('btn-lang').textContent = t('langBtn'); $('btn-back').textContent = (l === 'ar' ? '→ ' : '← ') + t('back');
    $('hero-eyebrow').textContent = t('eyebrow'); $('hero-title').textContent = t('title'); $('hero-tagline').textContent = t('tagline');
    $('cruise-label').textContent = t('cruise'); $('menu-pick').textContent = t('pick');
    $('sp-of').textContent = t('ofLight'); $('top-stars').title = t('starsTitle');
    this.renderCards(); this.renderConsole(); this.renderSpeed(); this.renderSound(); this.renderIntro(); this.renderVeil();
    if (!$('modal').hidden) this.summary();
    if (!$('party').hidden) this.renderParty();
    if (this.mission && this.mission.onLang) this.mission.onLang();
    this.save(); this.applyView();
  },
  renderSound() { const b = $('btn-sound'); b.innerHTML = SPEAKER(!Sfx.muted); b.title = t(Sfx.muted ? 'soundOff' : 'soundOn'); b.setAttribute('aria-label', b.title); },
  totalStars() { return MISSIONS.reduce((n, m) => n + (this.stars[m.id] || 0), 0); },
  renderCards() {
    const total = this.totalStars(), all = total >= ALL_STARS, badge = $('hero-badge');
    $('top-stars').innerHTML = starSvg(true) + '<span>' + total + '/' + ALL_STARS + '</span>';
    $('top-stars').classList.toggle('all', all);
    badge.hidden = !all; badge.innerHTML = starSvg(true) + '<span>' + t('badge', { n: ALL_STARS }) + '</span>'; badge.title = t('badgeTip');
    $('cards').innerHTML = MISSIONS.map((m, i) => {
      const got = this.stars[m.id] || 0;
      return '<button type="button" class="card' + (m.steps ? '' : ' lab') + '" data-id="' + m.id + '">' +
        '<span class="num">' + (m.steps ? '0' + (i + 1) : '∞') + '</span>' + icon(m.id) +
        '<h3>' + t(m.id) + '</h3><span class="concept">' + t(m.id + 'tag') + '</span>' +
        (m.steps ? '<span class="stars">' + [0, 1, 2].map(k => starSvg(k < got)).join('') + '</span>' : '') + '</button>';
    }).join('');
    $('cards').querySelectorAll('.card').forEach(b => {
      b.onclick = () => { Sfx.init(); Sfx.jump(); this.open(MISSIONS.find(m => m.id === b.dataset.id), 0); };
      b.onpointerenter = e => { if (e.pointerType === 'mouse') Sfx.hover(); };      // a tap would only double up with the jump sound
      b.onfocus = () => { if (b.matches(':focus-visible')) Sfx.hover(); };
    });
  },

  // ----- screens -----
  swap(mission) {
    if (this.mission) { if (this.mission.dispose) this.mission.dispose(); disposeTree(this.mission.scene); }
    this.clearLabels(); Sfx.engine(0);
    this.mission = mission; this.settle = 6;
  },
  menu() {
    this.def = null; this.awaitNext = false; this.paused = false; Sfx.ambient(true);
    $('app').dataset.screen = 'menu';
    this.swap(null);
    this.mission = new Cockpit(this, { mode: 'ambient' });
    this.renderCards(); this.applyView();
    if (this.partyDue) { this.partyDue = false; setTimeout(() => this.party(), 400); }   // the last star was won, but the player left before the summary
  },
  // Freeze the scene behind a curtain or dialog: no motion, no ticking, no engine. The last frame stays on screen.
  pause() { this.paused = true; Sfx.engine(0); },
  // The opening screen. It paints the big textures behind a progress bar, then waits for one tap:
  // browsers only allow sound after a tap, so that tap is also what starts the music.
  intro() {
    const box = $('intro');
    if (window.__q !== undefined) return box.remove();       // automated tests skip it
    const jobs = [['introL1', () => { skyTexture(); starGeometry(); }], ['introL2', earthMaps], ['introL3', moonMaps], ['introL4', marsMaps],
                  ['introL5', () => { panelTex(); solarTex(); glowTex(); flareTex(); disposeTree(makeGasGiant(1, 'tan')); }]];
    const total = jobs.length, t0 = performance.now();
    this.introKey = 'introL1'; this.renderIntro();
    const done = () => {
      this.introKey = 'introL6'; this.introReady = true; this.renderIntro();
      $('intro-load').hidden = true; $('intro-go').hidden = false; $('intro-go').focus();
    };
    const step = () => {
      const job = jobs.shift();
      if (!job) return setTimeout(done, Math.max(350, 1500 - (performance.now() - t0)));
      this.introKey = job[0]; this.renderIntro();
      // two frames first, so the new line and the moving bar are on screen before the page gets busy
      requestAnimationFrame(() => requestAnimationFrame(() => { try { job[1](); } catch (e) {} this.settle = 6; $('intro-bar').style.transform = 'scaleX(' + (total - jobs.length) / total + ')'; setTimeout(step, 120); }));
    };
    setTimeout(step, 250);
    $('intro-go').onclick = () => { Sfx.init(); Sfx.click(); box.classList.add('gone'); setTimeout(() => box.remove(), 800); };
    $('intro-lang').onclick = () => { this.picked = true; this.setLang(LANG === 'ar' ? 'en' : 'ar'); };
  },
  renderIntro() {
    if (!$('intro')) return;
    $('intro-eyebrow').textContent = t('eyebrow'); $('intro-title').textContent = t('title'); $('intro-lang').textContent = t('langBtn');
    $('intro-status').textContent = t(this.introKey || 'introL1'); $('intro-go').textContent = t('introStart'); $('intro-note').textContent = this.introReady ? t('introNote') : '';
  },
  // Opening a mission: a curtain with a fact to read drops first, and the scene is built and drawn once behind it.
  // For the free lab the curtain then lifts by itself. For a mission it waits, with the scene held still, while the player
  // chooses between the lesson (js/lessons.js) and going straight in.
  open(def, step) {
    if (window.__q !== undefined) return this.build(def, step);          // automated tests build it straight away
    if (this.opening) return;
    this.opening = true; this.veilChoice = false;
    const veil = $('veil'), t0 = performance.now(), first = !this.seen[def.id], ask = !!def.steps && Lesson.has(def.id);
    Lesson.stop(); veil.classList.remove('lesson-on'); $('lesson').hidden = true; $('veil-intro').hidden = false;
    this.veilDef = def; this.veilKey = 'ld1'; this.renderVeil(); veil.classList.add('on');
    const frames = (n, fn) => n ? requestAnimationFrame(() => frames(n - 1, fn)) : fn();
    setTimeout(() => {
      this.build(def, step); this.seen[def.id] = true;
      this.veilKey = 'ld2'; this.renderVeil();
      // the render loop draws the new scene on the next frame, which is where shaders compile; wait for that frame to finish
      frames(3, () => {
        this.veilKey = 'ld3'; this.renderVeil();
        setTimeout(() => {
          this.opening = false; this.settle = 6;
          if (!ask) return veil.classList.remove('on');
          this.pause(); this.veilChoice = true; this.renderVeil(); $('veil-enter').focus();
        }, Math.max(150, (ask ? 700 : first ? 1500 : 500) - (performance.now() - t0)));
      });
    }, 230);
  },
  renderVeil() {
    const d = this.veilDef; if (!d) return;
    const choose = !!this.veilChoice;
    $('veil-tag').textContent = t(d.id + 'tag'); $('veil-title').textContent = t(d.id);
    $('veil-fact').innerHTML = '<b>' + t('factH') + '</b> ' + t('fact_' + d.id);
    $('veil-status').textContent = choose ? '' : t(this.veilKey); $('veil-status').hidden = choose;
    $('veil-actions').hidden = !choose;
    $('veil-lesson').textContent = t('lesSee'); $('veil-enter').textContent = t('lesEnter'); $('ls-enter').textContent = t('lesEnter');
    if (Lesson.active) Lesson.render();
  },
  showLesson() {
    if (!this.veilChoice) return;
    Sfx.click();
    $('veil-intro').hidden = true; $('lesson').hidden = false;
    $('veil').classList.add('lesson-on'); $('veil').scrollTop = 0;
    Lesson.start(this.veilDef.id);
    $('ls-next').focus();
  },
  enter() {                                        // lift the curtain and let the mission run
    if (!this.veilChoice) return;
    this.veilChoice = false; Sfx.click(); Lesson.stop();
    $('veil').classList.remove('on');
    this.paused = false; this.settle = 6;
  },
  build(def, step) {
    this.def = def; this.step = step; this.awaitNext = false; this.paused = false; Sfx.ambient(false);
    $('app').dataset.screen = 'play';
    $('top-title').textContent = t(def.id);
    this.st = { task: null, primary: null, quiz: null, extra: [], feedback: null, speed: { show: false } };
    this.rows = null; this.customFn = null; $('c-custom').innerHTML = ''; $('c-readouts').innerHTML = '';
    this.beta = 0; this.labBeta = undefined;
    this.swap(null);
    this.mission = def.make(this);
    this.mission.start(step);
    this.renderConsole(); this.renderSpeed(); this.applyView();
    $('console').scrollTop = 0;
  },
  advance() {
    this.awaitNext = false;
    if (this.step + 1 < this.def.steps) {
      this.step++; this.st.feedback = null; this.st.quizMarks = {};
      this.mission.start(this.step);
      this.renderConsole(); this.renderSpeed();
      $('console').scrollTop = 0;
    } else this.summary(true);
  },
  summary(open) {
    const id = this.def.id, got = this.stars[id] || 0;
    $('m-eyebrow').textContent = t('mEyebrow'); $('m-title').textContent = t(id + 'tag');
    $('m-stars').className = 'm-stars stars'; $('m-stars').innerHTML = [0, 1, 2].map(k => starSvg(k < got)).join('');
    $('m-kid').textContent = t(id + 'kid'); $('m-curious-h').textContent = t('curiousH'); $('m-curious').innerHTML = t(id + 'cur');
    $('m-formula').textContent = t(id + 'f');
    $('m-menu').textContent = t('mMenu'); $('m-again').textContent = t('mAgain'); $('m-next').textContent = t('mNext');
    if (open) {
      this.pause(); $('modal').hidden = false; $('m-next').focus();
      if (this.partyDue) { this.partyDue = false; this.party(); } else Sfx.fanfare();
    }
  },
  // ----- every star collected -----
  party() {
    this.renderParty(); $('party').hidden = false;
    Celebrate.start($('party-fx')); Sfx.celebrate();
    $('party-go').focus();
  },
  closeParty() { Celebrate.stop(); $('party').hidden = true; },
  renderParty() {
    $('party-eyebrow').textContent = t('partyEyebrow', { n: ALL_STARS }); $('party-title').textContent = t('partyTitle');
    $('party-text').textContent = t('partyText'); $('party-list-h').textContent = t('partyListH');
    $('party-list').innerHTML = MISSIONS.filter(m => m.steps).map((m, i) => '<li style="--i:' + i + '">' + icon(m.id) + '<span>' + t(m.id + 'tag') + '</span></li>').join('');
    $('party-lab').textContent = t('partyLab'); $('party-go').textContent = t('partyGo');
  },

  // ----- what missions call -----
  task(key, vars) { this.st.task = { key, vars }; this.st.feedback = null; this.renderConsole(); },
  primary(key, disabled) { this.st.primary = key ? { key, disabled: !!disabled } : null; this.renderConsole(); },
  quiz(keys) { this.st.quiz = keys; this.st.quizMarks = {}; this.renderConsole(); },
  quizMark(i, ok) { this.st.quizMarks[i] = ok ? 'right' : 'wrong'; this.renderConsole(); },
  extra(list) { this.st.extra = list || []; this.renderConsole(); },
  custom(fn) { this.customFn = fn; $('c-custom').innerHTML = ''; if (fn) fn($('c-custom')); },
  speed(o) { this.st.speed = o; this.betaMax = o.max || 0.999; if (this.beta > this.betaMax) this.setBeta(this.betaMax); this.renderSpeed(); },
  clearFeedback() { this.st.feedback = null; this.renderConsole(); },
  fail(key, vars) { this.st.feedback = { ok: false, key, vars }; this.renderConsole(); Sfx.bad(); },
  win(key, vars) {
    this.st.feedback = { ok: true, key, vars };
    const before = this.totalStars();
    this.stars[this.def.id] = Math.max(this.stars[this.def.id] || 0, this.step + 1);
    if (before < ALL_STARS && this.totalStars() >= ALL_STARS) this.partyDue = true;     // celebrated when the summary opens
    this.awaitNext = true; this.save(); this.renderCards(); this.renderConsole(); this.renderSpeed(); Sfx.good();
  },
  setBeta(b, silent, fromUser) {
    let hit = false;
    if (b >= this.betaMax) { b = this.betaMax; hit = true; }
    b = Math.max(0, b);
    this.beta = b;
    if (fromUser) {
      $('sp-limit').textContent = hit ? t(this.betaMax >= 0.999 ? 'limit' : 'engineMax') : '';
      if (hit) { const tr = document.querySelector('.track'); tr.classList.remove('shake'); void tr.offsetWidth; tr.classList.add('shake'); if (!this.atWall) Sfx.wall(); } else Sfx.slide(b);
      this.atWall = hit;
      if (this.st.feedback && !this.awaitNext) { this.st.feedback = null; this.renderConsole(); }
    }
    this.renderSpeed();
    if (!silent && this.mission && this.mission.onBeta) this.mission.onBeta(b);
  },
  readouts(rows) {
    const dl = $('c-readouts'), sig = rows.map(r => r.k + r.tone).join('|') + LANG;
    if (this.rows !== sig) {
      this.rows = sig;
      dl.innerHTML = rows.map(r => '<dt class="' + (r.tone || '') + '">' + t(r.k) + '</dt><dd class="' + (r.tone || '') + '"></dd>').join('');
      this.rowEls = dl.querySelectorAll('dd'); this.rowVals = [];
    }
    rows.forEach((r, i) => {
      const v = String(r.v);
      if (this.rowVals[i] !== v) { this.rowVals[i] = v; r.html ? (this.rowEls[i].innerHTML = v) : (this.rowEls[i].textContent = v); }
    });
  },
  // dip to black, change something, come back: used when the camera jumps
  blink(fn) {
    if (window.__q !== undefined) return fn();     // tests step the scene by hand, so no timers
    const f = $('fade'); f.style.opacity = 1;
    setTimeout(() => { fn(); requestAnimationFrame(() => { f.style.opacity = 0; }); }, 240);
  },
  label(target, cls) {
    const el = document.createElement('div'); el.className = 'label ' + (cls || '');
    $('labels').appendChild(el);
    const L = { el, target, html: '', set(h) { if (h !== this.html) { this.html = h; el.innerHTML = h; } } };
    this.labels.push(L); return L;
  },
  clearLabels() { this.labels = []; $('labels').innerHTML = ''; this.settle = 6; },

  // ----- rendering the console -----
  renderConsole() {
    const st = this.st, play = !!this.def;
    if (!play) return;
    $('c-step').textContent = this.def.steps ? t('step', { n: this.step + 1, m: this.def.steps }) : t('freePlay');
    $('c-tag').textContent = t(this.def.id + 'tag');
    $('top-title').textContent = t(this.def.id);
    $('c-task').innerHTML = st.task ? t(st.task.key, st.task.vars) : '';
    // segmented controls
    const ex = $('c-extra'); ex.innerHTML = '';
    (st.extra || []).forEach(g => {
      const seg = document.createElement('div'); seg.className = 'seg';
      g.options.forEach((k, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = t(k);
        b.setAttribute('aria-pressed', i === g.value); b.disabled = !!g.disabled && i !== g.value;
        b.onclick = () => { Sfx.click(); if (this.mission.onExtra) this.mission.onExtra(g.id, i); };
        seg.appendChild(b);
      });
      ex.appendChild(seg);
    });
    // quiz
    const qz = $('c-quiz'); qz.innerHTML = '';
    (st.quiz || []).forEach((k, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t(k);
      const mark = (st.quizMarks || {})[i]; if (mark) b.className = mark;
      b.disabled = this.awaitNext || mark === 'wrong';
      b.onclick = () => {
        Sfx.click();
        const res = this.mission.onQuiz(i);
        if (res !== null && res !== undefined) this.quizMark(i, res);
      };
      qz.appendChild(b);
    });
    // main button
    const go = $('c-go');
    if (this.awaitNext) { go.hidden = false; go.disabled = false; go.className = 'primary next'; go.textContent = t(this.step + 1 < this.def.steps ? 'next' : 'finish'); }
    else if (st.primary) { go.hidden = false; go.className = 'primary'; go.disabled = st.primary.disabled; go.textContent = t(st.primary.key); }
    else go.hidden = true;
    // feedback
    const fb = $('c-feedback');
    if (st.feedback) { fb.hidden = false; fb.className = st.feedback.ok ? 'ok' : 'no'; fb.innerHTML = t(st.feedback.key, st.feedback.vars); }
    else fb.hidden = true;
  },
  renderSpeed() {
    const o = this.st.speed || {}, box = $('c-speed');
    box.hidden = !o.show;
    if (!o.show) return;
    const r = $('sp-range'), lock = !!o.disabled || this.awaitNext;
    r.value = Math.round(this.beta * 1000); r.disabled = lock; $('sp-minus').disabled = lock; $('sp-plus').disabled = lock;
    r.style.setProperty('--fill', (this.beta * 100 / 0.999).toFixed(1) + '%');
    $('sp-pct').textContent = pct(this.beta) + '%';
    $('sp-kms').textContent = num(this.beta * C / 1000) + ' ' + t('kmps');
  },

  // ----- camera fitting: keep the action centred in the part of the screen the console leaves free -----
  applyView() {
    if (!this.renderer || !this.mission) return;
    const W = window.innerWidth, H = window.innerHeight, cam = this.mission.camera, view = this.mission.view;
    this.renderer.setSize(W, H, false);
    if (this.post) { this.post.composer.setPixelRatio(this.renderer.getPixelRatio()); this.post.composer.setSize(W, H); }
    let x0 = 0, x1 = W, y0 = 0, y1 = H;
    if (this.def) {
      const r = $('console').getBoundingClientRect();
      y0 = 56;
      if (W <= 760) y1 = r.top - 6;
      else if (document.documentElement.dir === 'rtl') x0 = r.right + 8;
      else x1 = r.left - 8;
    }
    const fw = Math.max(80, x1 - x0), fh = Math.max(80, y1 - y0);
    cam.aspect = W / H;
    if (view.fov) cam.fov = view.fov;
    else {
      const hh = Math.max(view.height / 2, view.width / 2 / (fw / fh));
      cam.fov = 2 * Math.atan(hh * (H / fh) / view.dist) * 180 / Math.PI;
    }
    cam.setViewOffset(W, H, W / 2 - (x0 + x1) / 2, H / 2 - (y0 + y1) / 2, W, H);
    cam.updateProjectionMatrix();
    this.redraw = true;
  },

  frame(dt) {
    const m = this.mission; if (!m) return;
    if (this.paused) { if (this.redraw) this.draw(m, 0); return; }      // held still: only redraw if a resize wiped the canvas
    KIT.time.value += dt;
    m.update(dt);
    this.draw(m, dt);
    if (!this.def && m.ambientBeta !== undefined) {
      $('cruise-fill').style.width = (m.ambientBeta * 100).toFixed(1) + '%';
      $('cruise-val').textContent = Math.round(m.ambientBeta * 100) + '%';
    }
  },
  draw(m, dt) {
    this.redraw = false;
    KIT.pix.value = this.renderer.getPixelRatio();
    if (this.post && this.quality < 2) { this.post.render.scene = m.scene; this.post.render.camera = m.camera; this.post.composer.render(dt); }
    else this.renderer.render(m.scene, m.camera);
    // pin labels to their 3D anchors
    const W = window.innerWidth, H = window.innerHeight, v = this._pv || (this._pv = new THREE.Vector3());
    for (const L of this.labels) {
      const p = typeof L.target === 'function' ? L.target() : L.target;
      v.copy(p).project(m.camera);
      const vis = v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15 && L.html;
      L.el.style.display = vis ? '' : 'none';
      if (vis) L.el.style.transform = 'translate(' + ((v.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-v.y * 0.5 + 0.5) * H).toFixed(1) + 'px) translate(-50%,-50%)';
    }
  }
};

App.boot({});
App.sfx = Sfx;
window.__app = App;        // handy in the browser console, and used by automated tests
