/* ============================================================
   LOOMINA motion — a tiny scroll/interaction engine.
   Zero dependencies: the site ships as static files, so there is no
   framework to lean on. One rAF loop drives every scrubber.
   Everything degrades to a finished, readable page under
   prefers-reduced-motion or if JS never runs.
   ============================================================ */
const MO = (() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => RM.matches;
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp  = (a, b, t) => a + (b - a) * t;
  // ease that matches the CSS --e-out, so JS-driven and CSS-driven motion agree
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  /* ---------- one loop to rule them ---------- */
  const scrubbers = [];
  let ticking = false, lastY = scrollY, vel = 0, velSmooth = 0;

  function tick(){
    const y = scrollY;
    vel = y - lastY; lastY = y;
    velSmooth = lerp(velSmooth, vel, .18);
    // Clamped: a jump-scroll (anchor, scrollIntoView, a flick on a trackpad) spikes
    // velocity into the hundreds, and anything reading this as a skew tears the
    // layout off its axis. Cap the signal at the source, not at each consumer.
    const vClamped = Math.max(-60, Math.min(60, velSmooth));
    document.documentElement.style.setProperty('--scroll-v', vClamped.toFixed(2));

    const vh = innerHeight;
    for (const s of scrubbers){
      const r = s.el.getBoundingClientRect();
      // progress 0 when the element's start line reaches the bottom of the
      // viewport, 1 when its end line reaches the top
      const span = (r.height + vh * (s.enter + s.exit)) || 1;
      const travelled = (vh * s.enter) - r.top + (r.height * 0);
      let p = clamp(travelled / span);
      if (s.mode === 'through') p = clamp((vh - r.top) / (vh + r.height));
      if (p !== s.p){ s.p = p; s.cb(p, r); }
    }
    ticking = false;
    if (running) requestAnimationFrame(() => { ticking = true; tick(); });
  }
  let running = false;
  function start(){ if (running) return; running = true; ticking = true; tick(); }

  /** Register a scroll scrubber. cb(progress 0..1, rect) */
  function scrub(el, cb, { enter = 0, exit = 0, mode = 'span' } = {}){
    if (!el) return;
    const s = { el, cb, enter, exit, mode, p: -1 };
    scrubbers.push(s);
    start();
    return s;
  }

  /* ---------- staggered reveal, with the usual failsafe ---------- */
  function reveal(scope = document, { stagger = 60, cap = 320 } = {}){
    const els = [...scope.querySelectorAll('.rv:not(.in)')];
    if (!els.length) return;
    if (reduce() || !('IntersectionObserver' in window)){
      els.forEach(el => el.classList.add('in')); return;
    }
    const io = new IntersectionObserver(ents => {
      const hits = ents.filter(e => e.isIntersecting);
      hits.forEach((e, i) => {
        const d = Math.min(i * stagger, cap);
        e.target.style.transitionDelay = d + 'ms';
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .06 });
    els.forEach(el => io.observe(el));
    // nothing may stay hidden, ever
    setTimeout(() => els.forEach(el => el.classList.add('in')), 3500);
  }

  /* ---------- count up ---------- */
  function count(el){
    const to = parseFloat(el.dataset.to || el.textContent) || 0;
    const dp = parseInt(el.dataset.dp || '0', 10);
    const suffix = el.dataset.suffix || '';
    if (reduce()){ el.textContent = to.toFixed(dp) + suffix; return; }
    const t0 = performance.now(), dur = 1400;
    (function step(now){
      const t = clamp((now - t0) / dur);
      el.textContent = (to * easeOut(t)).toFixed(dp) + suffix;
      if (t < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function countsIn(scope = document){
    const els = [...scope.querySelectorAll('[data-to]')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window)){ els.forEach(count); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ count(e.target); io.unobserve(e.target); }
    }), { threshold: .5 });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(el => { if (!el.dataset.done) count(el); }), 4000);
  }

  /* ---------- pointer spotlight (dusk only) ---------- */
  function spotlight(){
    if (reduce() || !matchMedia('(pointer:fine)').matches) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, on = false;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; on = true; }, { passive: true });
    (function loop(){
      if (on){
        x = lerp(x, tx, .12); y = lerp(y, ty, .12);
        const r = document.documentElement.style;
        r.setProperty('--mx', x.toFixed(0) + 'px');
        r.setProperty('--my', y.toFixed(0) + 'px');
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- magnetic pull on a control ---------- */
  function magnet(el, strength = .28){
    if (reduce() || !matchMedia('(pointer:fine)').matches) return;
    let raf = 0, cx = 0, cy = 0, tx = 0, ty = 0;
    const run = () => {
      cx = lerp(cx, tx, .18); cy = lerp(cy, ty, .18);
      el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      raf = (Math.abs(cx - tx) > .1 || Math.abs(cy - ty) > .1) ? requestAnimationFrame(run) : 0;
    };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      if (!raf) raf = requestAnimationFrame(run);
    });
    el.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(run); });
  }

  return { scrub, reveal, count, countsIn, spotlight, magnet, clamp, lerp, easeOut, reduce };
})();
