/*
 * The celebration when every star is collected: confetti and fireworks on a 2D canvas laid over the whole page.
 * Celebrate.start(canvas) runs it, Celebrate.stop() clears it. With reduced motion it is a short, gentle confetti fall.
 */
'use strict';

const Celebrate = (() => {
  const COLS = ['#ffd84a', '#48d9c2', '#ff7d6e', '#7fe79b', '#ffffff', '#b89cff'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let cv = null, c = null, raf = 0, last = 0, age = 0, acc = 0, nextBurst = 0, W = 0, H = 0, calm = false, bits = [], sparks = [];

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function confetti(n, spread) {
    for (let i = 0; i < n; i++) bits.push({
      x: Math.random() * W, y: spread ? -Math.random() * H * 0.7 : -12 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 50, vy: (calm ? 50 : 70) + Math.random() * 100,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 9, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
      col: pick(COLS), sw: Math.random() * 6, sp: 1 + Math.random() * 2
    });
  }
  function burst() {
    const x = W * (0.15 + Math.random() * 0.7), y = H * (0.12 + Math.random() * 0.35), a1 = pick(COLS), a2 = pick(COLS), n = 70;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * 0.1, v = 110 + Math.random() * 210;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1 + Math.random() * 0.7, age: 0, col: i % 3 ? a1 : a2 });
    }
    Sfx.pop();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; age += dt;
    if (cv.clientWidth !== W || cv.clientHeight !== H) size();
    if (!calm) {
      acc += dt * (age < 4 ? 30 : 6);                              // a downpour first, then a gentle drift for as long as the screen is open
      while (acc >= 1) { confetti(1); acc--; }
      nextBurst -= dt;
      if (nextBurst <= 0 && age < 10) { burst(); nextBurst = age < 3 ? 0.45 + Math.random() * 0.3 : 1.3 + Math.random(); }
    }
    c.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.x += (b.vx + Math.sin(age * 2 + b.sw) * 22) * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.scale(1, Math.cos(age * b.sp * 3 + b.sw));
      c.fillStyle = b.col; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); c.restore();
    }
    bits = bits.filter(b => b.y < H + 20);
    c.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      p.age += dt; p.vx *= Math.pow(0.35, dt); p.vy = p.vy * Math.pow(0.35, dt) + 120 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.max(0, 1 - p.age / p.life);
      c.globalAlpha = a; c.fillStyle = p.col;
      c.beginPath(); c.arc(p.x, p.y, 2.2, 0, Math.PI * 2); c.fill();
      c.globalAlpha = a * 0.35; c.beginPath(); c.arc(p.x, p.y, 6, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    sparks = sparks.filter(p => p.age < p.life);
    if (calm && !bits.length) { cancelAnimationFrame(raf); raf = 0; }
  }

  return {
    start(canvas) {
      this.stop();
      cv = canvas; c = cv.getContext('2d');
      calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      size(); bits = []; sparks = []; age = 0; acc = 0; nextBurst = 0.25;
      confetti(calm ? 50 : 140, true);
      last = performance.now(); raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf); raf = 0; bits = []; sparks = [];
      if (c) c.clearRect(0, 0, W, H);
    }
  };
})();
