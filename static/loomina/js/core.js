/* ============================================================
   LOOMINA core — lighting state, catalogue, cart, reveals, nav
   ============================================================ */
const LM = (() => {

  /* ---------- lighting ---------- */
  const KEY_LIT = 'loomina.lit';
  const root = document.documentElement;

  function readLit(){ try { return localStorage.getItem(KEY_LIT) === 'on'; } catch { return false; } }
  function setLit(on, persist = true){
    root.dataset.lit = on ? 'on' : 'off';
    document.querySelectorAll('[data-switch]').forEach(el => {
      el.setAttribute('aria-checked', String(on));
      el.setAttribute('aria-label', on ? 'Turn the lights off' : 'Turn the lights on');
    });
    if (persist) { try { localStorage.setItem(KEY_LIT, on ? 'on' : 'off'); } catch {} }
    window.dispatchEvent(new CustomEvent('lm:lit', { detail:{ on } }));
  }
  function toggleLit(){ setLit(root.dataset.lit !== 'on'); }

  /* ---------- catalogue ---------- */
  let _db = null;
  async function db(){
    if (_db) return _db;
    const base = location.pathname.includes('/pages/') ? '../' : './';
    const r = await fetch(base + 'data/products.json', { cache:'no-cache' });
    _db = await r.json();
    _db.byId = Object.fromEntries(_db.products.map(p => [p.slug, p]));
    _db.catName = Object.fromEntries(_db.categories.map(c => [c.slug, c.name]));
    return _db;
  }

  const money = n => '$' + Number(n).toLocaleString('en-US');

  let _eager = 0;
  function imgPair(p){
    const b = location.pathname.includes('/pages/') ? '../' : './';
    const load = (_eager++ < 8) ? 'eager' : 'lazy';   // top of every grid paints immediately
    // unlit frame falls back to the neutral plate
    const fbOff = "this.dataset.f||(this.dataset.f=1,this.src='" + b + "img/placeholder.svg')";
    // lit frame falls back to the unlit frame, warm-graded, so a card is never broken
    const fbOn  = "if(!this.dataset.f){this.dataset.f=1;this.classList.add('sim');"
                + "this.src='" + b + "img/products/" + p.slug + "-off.webp';}"
                + "else if(this.dataset.f==='1'){this.dataset.f=2;this.src='" + b + "img/placeholder.svg';}";
    return `<img class="off" src="${b}img/products/${p.slug}-off.webp" alt="${p.name}, unlit"
              loading="${load}" fetchpriority="${load==='eager'?'high':'auto'}" decoding="async" width="1024" height="1024" onerror="${fbOff}">
            <img class="on"  src="${b}img/products/${p.slug}-on.webp"  alt="${p.name}, lit"
              loading="${load}" decoding="async" width="1024" height="1024" onerror="${fbOn}">`;
  }

  function resetEager(){ _eager = 0; }

  function card(p, catName){
    const b = location.pathname.includes('/pages/') ? '../' : './';
    return `<a class="card rv" href="${b}pages/product.html?p=${p.slug}">
      <div class="shot" data-peek="1">${imgPair(p)}</div>
      <div class="card-meta">
        <span class="card-name">${p.name}</span>
        <span class="card-cat">${catName || ''}</span>
        <span class="card-price tnum">${money(p.price)}</span>
      </div></a>`;
  }

  /* ---------- cart ---------- */
  const KEY_CART = 'loomina.cart';
  function cart(){ try { return JSON.parse(localStorage.getItem(KEY_CART)) || []; } catch { return []; } }
  function saveCart(c){ try { localStorage.setItem(KEY_CART, JSON.stringify(c)); } catch {} paintCount(); }
  function addToCart(slug, finish, qty = 1){
    const c = cart(); const k = slug + '|' + (finish || '');
    const hit = c.find(i => i.k === k);
    if (hit) hit.q += qty; else c.push({ k, slug, finish, q: qty });
    saveCart(c); toast('Added to bag'); return c;
  }
  function setQty(k, q){ const c = cart().map(i => i.k === k ? {...i, q} : i).filter(i => i.q > 0); saveCart(c); return c; }
  function cartCount(){ return cart().reduce((n, i) => n + i.q, 0); }
  function paintCount(){
    const n = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(e => { e.textContent = n; e.dataset.n = n; });
    if (typeof window.paintDrawer === 'function') window.paintDrawer();
  }

  /* ---------- toast ---------- */
  let toastEl, toastT;
  function toast(msg){
    if (!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- reveals (with hard failsafe) ---------- */
  function reveals(scope = document){
    const els = [...scope.querySelectorAll('.rv:not(.in)')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { document.documentElement.classList.add('no-rv'); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e, i) => { if (e.isIntersecting){ setTimeout(() => e.target.classList.add('in'), Math.min(i * 55, 260)); io.unobserve(e.target); } });
    }, { rootMargin:'0px 0px -8% 0px', threshold:.06 });
    els.forEach(el => io.observe(el));
    // failsafe: nothing stays hidden past 3.5s
    setTimeout(() => els.forEach(el => el.classList.add('in')), 3500);
  }

  /* ---------- chrome ---------- */
  function nav(active){
    const b = location.pathname.includes('/pages/') ? '../' : './';
    const L = [['Pendants','shop.html?c=pendants'],['Chandeliers','shop.html?c=chandeliers'],['Sconces','shop.html?c=sconces'],
               ['Table','shop.html?c=table-lamps'],['Floor','shop.html?c=floor-lamps'],['Bedside','shop.html?c=bed-reading'],
               ['All Lighting','shop.html']];
    return `<header class="nav"><div class="nav-in">
      <a class="brand" href="${b}index.html">LOOMINA</a>
      <nav class="nav-links">${L.map(([t,h]) =>
        `<a href="${b}pages/${h}" ${active===t?'aria-current="page"':''}>${t}</a>`).join('')}</nav>
      <span class="nav-spacer"></span>
      <div class="lightswitch">
        <span class="lbl">Light</span>
        <button class="switch" data-switch role="switch" aria-checked="false" aria-label="Turn the lights on"></button>
      </div>
      <button data-open-cart aria-label="Bag">Bag<span class="cart-count" data-cart-count data-n="0">0</span></button>
    </div></header>`;
  }

  function footer(){
    const b = location.pathname.includes('/pages/') ? '../' : './';
    const cols = [
      ['Lighting', [['Pendants','shop.html?c=pendants'],['Chandeliers','shop.html?c=chandeliers'],['Sconces','shop.html?c=sconces'],['Flush Mounts','shop.html?c=flush-mounts']]],
      ['Lamps',    [['Table Lamps','shop.html?c=table-lamps'],['Floor Lamps','shop.html?c=floor-lamps'],['Bedside','shop.html?c=bed-reading'],['Portable','shop.html?c=portable'],['Outdoor','shop.html?c=outdoor']]],
      ['Studio',   [['Our Story','about.html'],['The Workshop','about.html#workshop'],['Materials','about.html#materials'],['Trade Program','about.html#trade']]],
      ['Support',  [['Shipping','about.html#shipping'],['Warranty','about.html#warranty'],['Care Guide','about.html#care'],['Contact','about.html#contact']]],
    ];
    return `<footer class="foot"><div class="wrap-wide">
      <div class="foot-cols">${cols.map(([h, ls]) =>
        `<div><h4>${h}</h4><ul>${ls.map(([t,u]) => `<li><a href="${b}pages/${u}">${t}</a></li>`).join('')}</ul></div>`).join('')}</div>
      <hr class="hr"><div class="row" style="padding-block:22px;flex-wrap:wrap;gap:8px 20px">
        <span class="t-xs dimmer">Copyright 2026 Loomina Lighting. A fictional studio.</span>
        <span class="nav-spacer"></span>
        <span class="t-xs dimmer">Hand-assembled in Brooklyn and Murano</span>
      </div></div></footer>`;
  }

  function drawer(){
    return `<div class="scrim" data-scrim></div>
    <aside class="drawer" data-drawer aria-label="Shopping bag">
      <div class="drawer-hd"><span class="t-md">Bag</span><button class="x" data-close-cart aria-label="Close">✕</button></div>
      <div class="drawer-bd" data-drawer-body></div>
      <div class="drawer-ft">
        <div class="row"><span class="t-sm dim">Subtotal</span><span class="nav-spacer"></span><span class="t-md tnum" data-subtotal>$0</span></div>
        <button class="btn" style="width:100%" data-checkout>Check Out</button>
        <span class="t-xs dimmer center">Free shipping and returns on every order.</span>
      </div></aside>`;
  }

  async function mountChrome(active){
    document.body.insertAdjacentHTML('afterbegin', nav(active));
    document.body.insertAdjacentHTML('beforeend', footer() + drawer());

    // the nav is injected AFTER boot ran setLit(), so its switch starts stale — sync it
    const lit = root.dataset.lit === 'on';
    document.querySelectorAll('[data-switch]').forEach(el => {
      el.setAttribute('aria-checked', String(lit));
      el.setAttribute('aria-label', lit ? 'Turn the lights off' : 'Turn the lights on');
      el.addEventListener('click', toggleLit);
    });
    const scrim = document.querySelector('[data-scrim]'), dr = document.querySelector('[data-drawer]');
    const open = o => { scrim.classList.toggle('open', o); dr.classList.toggle('open', o); };
    document.querySelectorAll('[data-open-cart]').forEach(b => b.addEventListener('click', () => { open(true); paintDrawer(); }));
    document.querySelector('[data-close-cart]').addEventListener('click', () => open(false));
    scrim.addEventListener('click', () => open(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    document.querySelector('[data-checkout]').addEventListener('click', () => toast('Demo store. Nothing is charged.'));

    const D = await db();
    window.paintDrawer = function(){
      const body = document.querySelector('[data-drawer-body]');
      const c = cart(); const b = location.pathname.includes('/pages/') ? '../' : './';
      if (!c.length){ body.innerHTML = `<p class="t-sm dim" style="padding-block:40px" >Your bag is empty.</p>`;
        document.querySelector('[data-subtotal]').textContent = money(0); return; }
      let sum = 0;
      body.innerHTML = c.map(i => {
        const p = D.byId[i.slug]; if (!p) return '';
        sum += p.price * i.q;
        return `<div class="row" style="align-items:flex-start;gap:14px">
          <div class="shot" style="width:76px;flex:none;border-radius:12px">
            <img class="off" src="${b}img/products/${p.slug}-off.webp" alt="" onerror="this.style.display='none'">
            <img class="on"  src="${b}img/products/${p.slug}-on.webp"  alt="" onerror="this.style.display='none'"></div>
          <div class="stack-8" style="flex:1">
            <span class="t-sm" style="font-weight:500">${p.name}</span>
            ${i.finish ? `<span class="t-xs dimmer">${i.finish}</span>` : ''}
            <div class="row" style="gap:8px">
              <button class="chip btn-sm" data-q="${i.k}" data-d="-1" style="height:26px;padding-inline:10px">−</button>
              <span class="t-sm tnum">${i.q}</span>
              <button class="chip btn-sm" data-q="${i.k}" data-d="1" style="height:26px;padding-inline:10px">+</button>
            </div></div>
          <span class="t-sm tnum dim">${money(p.price * i.q)}</span></div>`;
      }).join('');
      document.querySelector('[data-subtotal]').textContent = money(sum);
      body.querySelectorAll('[data-q]').forEach(btn => btn.addEventListener('click', () => {
        const it = cart().find(x => x.k === btn.dataset.q);
        setQty(btn.dataset.q, it.q + Number(btn.dataset.d));
      }));
    };
    paintCount();
    reveals();
  }

  /* ---------- boot ---------- */
  setLit(readLit(), false);
  document.addEventListener('DOMContentLoaded', () => { if (!root.dataset.lit) setLit(false, false); });

  return { setLit, toggleLit, db, money, card, imgPair, resetEager, cart, addToCart, setQty, cartCount, toast, reveals, mountChrome };
})();
