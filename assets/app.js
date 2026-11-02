/* Strafford County Animal Protection Society: seasons, parallax and the set pieces */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const YEAR = Math.max(2026, new Date().getFullYear());
  let vw = innerWidth, vh = innerHeight;

  /* ------------------------------------------------------------ seasons: month chip, paper colour */
  const MONTHS = {
    'September': { leaf: '#d9a72c', rot: -10, leaves: 14, snow: 0, palette: ['#e6b63f', '#d5a02c', '#9a9a3c', '#e3922e', '#c9a14d'] },
    'October': { leaf: '#c9471f', rot: 8, leaves: 24, snow: 0, palette: ['#b8361d', '#c9471f', '#d96c27', '#e3922e', '#a52f1c', '#e6b63f'] },
    'November': { leaf: '#9c5a2c', rot: 30, leaves: 10, snow: 0, palette: ['#8a4a2a', '#9c5a2c', '#7c4b33', '#b0763a', '#6e4a36'] },
    'December': { leaf: '#7c6a5a', rot: 60, leaves: 3, snow: 26, palette: ['#8a4a2a', '#7c4b33', '#6e4a36'] },
    'First snow': { leaf: '#8fa6b4', rot: 90, leaves: 0, snow: 70, palette: ['#7c4b33'] },
  };
  let season = MONTHS.September;
  const monthEl = $('.bar [data-month]');
  const sections = $$('[data-paper]');
  function setSeason(sec) {
    const name = sec.dataset.month;
    season = MONTHS[name] || season;
    root.style.setProperty('--paper', sec.dataset.paper);
    root.style.setProperty('--leaf', season.leaf);
    root.style.setProperty('--leaf-rot', season.rot + 'deg');
    if (monthEl && monthEl.textContent !== name) monthEl.textContent = name;
  }
  if (sections[0]) setSeason(sections[0]);
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) setSeason(e.target); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  sections.forEach(s => io.observe(s));

  /* ------------------------------------------------------------ parallax scenes */
  // every [data-scene] is a stack of plates; each [data-depth] inside it moves at its own speed.
  // positive depth lags the page (background), negative depth runs ahead of it (foreground).
  // "hero" scenes measure from the top of the page, the rest from the middle of the screen.
  const scenes = $$('[data-scene]').map(el => ({
    el, hero: el.dataset.scene === 'hero',
    layers: $$('[data-depth]', el).map(l => ({ el: l, d: parseFloat(l.dataset.depth) })),
  }));
  const heroCopy = $('[data-hero-copy]');

  /* ------------------------------------------------------------ the bridge */
  const bridge = $('[data-bridge]');
  const panLayers = $$('[data-pan]').map(l => ({ el: l, p: parseFloat(l.dataset.pan) }));
  const dog = $('[data-dog]');
  const legs = dog ? $$('[data-leg]', dog) : [];
  const legBase = legs.map(l => l.getAttribute('transform'));
  const tail = dog && $('[data-tail]', dog);
  const cards = $$('[data-card]');
  const bar = $('[data-bridge-bar]');
  const stage = $('.bridge-stage');
  const bankLine = $('.bank-line');
  let cardOn = 0;

  function frameBridge() {
    if (!bridge) return;
    const r = bridge.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const p = clamp(-r.top / (r.height - vh));
    const k = vw / 1440;
    panLayers.forEach(({ el, p: pan }) => {
      const tx = reduce ? 0 : (0.5 - p) * pan * 2 * k;
      el.style.transform = `translate3d(${tx.toFixed(1)}px,0,0)`;
    });
    // the dog walks along the inked bank line in the margin under the plate, towards the cat
    const sh = stage.clientHeight;
    const lineY = sh - (bankLine ? parseFloat(getComputedStyle(bankLine).bottom) + 12 : 36);
    const w = clamp(vw * 0.075, 74, 118);
    dog.style.width = w.toFixed(1) + 'px';
    const h = w * 92 / 150;
    const sx = lerp(vw * 0.08, vw * (small() ? 0.6 : 0.8), p);
    const bob = Math.abs(Math.sin(p * 46)) * 1.2;
    dog.style.transform = `translate3d(${(sx - w * 60 / 150).toFixed(1)}px,${(lineY - h * 90 / 92 - bob).toFixed(1)}px,0)`;
    const ph = p * 46;
    legs.forEach((l, i) => {
      const a = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 20;
      l.setAttribute('transform', `${legBase[i]} rotate(${a.toFixed(1)})`);
    });
    tail.setAttribute('transform', `rotate(${(Math.sin(ph * 1.7) * 6).toFixed(1)} -38 -48)`);
    const idx = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
    if (idx !== cardOn) {
      cards[cardOn].classList.remove('is-on');
      cards[idx].classList.add('is-on');
      cardOn = idx;
    }
    bar.style.transform = `scaleX(${p.toFixed(3)})`;
  }

  function frameScenes() {
    for (const sc of scenes) {
      const r = sc.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      let c = sc.hero ? r.top : r.top + r.height / 2 - vh / 2;
      c = clamp(c, -vh, vh);
      for (const l of sc.layers) {
        const ty = reduce ? 0 : -c * l.d;
        // the translate property sits outside any CSS rotate on the layer, so the drift stays vertical
        l.el.style.translate = `0 ${ty.toFixed(1)}px`;
      }
      if (sc.hero && heroCopy && !reduce) {
        const y = -c;
        heroCopy.style.transform = `translate3d(0,${(y * 0.3).toFixed(1)}px,0)`;
        heroCopy.style.opacity = clamp(1 - y / (vh * 0.75)).toFixed(3);
      }
    }
  }

  /* ------------------------------------------------------------ count the rings */
  const ringsSvg = $('[data-rings]');
  if (ringsSvg) (() => {
  const range = $('[data-ring-range]');
  const readout = $('[data-ring-read]');
  const N = YEAR - 1965;
  range.max = YEAR;
  $('[data-ring-now]').textContent = YEAR;
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 1965;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const P = [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3];
  const wob = (t, amt) => 1 + amt * (0.045 * Math.sin(2 * t + P[0]) + 0.03 * Math.sin(3 * t + P[1]) + 0.015 * Math.sin(5 * t + P[2]));
  const ringR = k => 12 + 150 * Math.pow(k / N, 0.82);
  function loop(rad, jitter = 0, steps = 72) {
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const rr = rad * wob(t, Math.min(1, rad / 60)) + (jitter ? (rnd() - 0.5) * jitter : 0);
      d += (i ? 'L' : 'M') + (200 + Math.cos(t) * rr).toFixed(1) + ',' + (200 + Math.sin(t) * rr).toFixed(1);
    }
    return d + 'Z';
  }
  const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  ringsSvg.append(mk('path', { d: loop(ringR(N) + 22, 7, 120), fill: '#4f3322' }));
  ringsSvg.append(mk('path', { d: loop(ringR(N) + 12, 3, 120), fill: '#7a5236' }));
  ringsSvg.append(mk('path', { d: loop(ringR(N) + 4), fill: '#e8c792' }));
  ringsSvg.append(mk('circle', { cx: 200, cy: 200, r: ringR(N) * 0.55, fill: '#efd3a2', opacity: '.7' }));
  const ringEls = [];
  for (let k = 1; k <= N; k++) {
    const year = 1965 + k;
    const p = mk('path', { d: loop(ringR(k), 0.9), fill: 'none', stroke: year % 10 === 0 ? '#9a6a3c' : '#b98a55', 'stroke-width': year % 10 === 0 ? 1.9 : 1.1, class: 'ring' });
    ringEls.push(p);
    ringsSvg.append(p);
  }
  ringsSvg.append(mk('path', { d: 'M203,196 L236,150 L240,138 L262,108 L268,92', stroke: '#6b4a2f', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round', opacity: '.55' }));
  ringsSvg.append(mk('path', { d: 'M196,206 L170,250 L160,276', stroke: '#6b4a2f', 'stroke-width': 1.5, fill: 'none', 'stroke-linecap': 'round', opacity: '.45' }));
  ringsSvg.append(mk('circle', { cx: 200, cy: 200, r: 5, fill: '#8a5a33' }));
  const hi = mk('path', { d: loop(4), fill: 'none', stroke: '#8e2a1e', 'stroke-width': 4, 'stroke-linejoin': 'round' });
  ringsSvg.append(hi);

  let userPicked = false;
  function showYear(year, fromUser) {
    const k = year - 1965;
    hi.setAttribute('d', k === 0 ? loop(7) : loop(ringR(k)));
    let msg;
    if (k === 0) msg = '<b>1965.</b> The IRS recognizes the Society as tax-exempt. The first ring.';
    else if (year === YEAR) msg = `<b>${year}.</b> This year's ring, ${k} years on, still growing.`;
    else msg = `<b>${year}.</b> Ring ${k}, in the ${Math.floor(year / 10) * 10}s.`;
    readout.innerHTML = msg;
    if (fromUser) { userPicked = true; range.value = year; }
  }
  range.addEventListener('input', () => showYear(+range.value, true));
  ringsSvg.addEventListener('click', e => {
    const pt = ringsSvg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(ringsSvg.getScreenCTM().inverse());
    const dx = q.x - 200, dy = q.y - 200;
    const t = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy) / wob(t, 1);
    let best = 0, bd = Infinity;
    for (let k = 0; k <= N; k++) {
      const d = Math.abs((k ? ringR(k) : 0) - dist);
      if (d < bd) { bd = d; best = k; }
    }
    showYear(1965 + best, true);
  });
  // grow the rings when the stump scrolls into view
  let grown = reduce;
  ringEls.forEach(r => { r.style.opacity = reduce ? 1 : 0; });
  const stumpIo = new IntersectionObserver(es => {
    if (grown || !es[0].isIntersecting) return;
    grown = true;
    const t0 = performance.now(), dur = 2600;
    (function grow(now) {
      const f = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - f, 2);
      const n = Math.round(e * N);
      ringEls.forEach((r, i) => { r.style.opacity = i < n ? 1 : 0; });
      if (!userPicked) { range.value = 1965 + n; showYear(1965 + n, false); }
      if (f < 1) requestAnimationFrame(grow);
    })(t0);
  }, { threshold: 0.35 });
  stumpIo.observe(ringsSvg);
  if (reduce) { range.value = YEAR; showYear(YEAR, false); } else showYear(1965, false);
  })();

  /* ------------------------------------------------------------ the type case and press */
  const BLOCKS = {
    vet: ['Help with the vet bill.', 'Small grants, mostly toward veterinary bills and medical care, for people who cannot afford the care their animal needs.'],
    spay: ['Spay and neuter.', 'Funding for spay and neuter, so the cost is less of a hurdle for owners who want to do right by their animals.'],
    food: ['Food for the bowl.', 'Support with food for animals in need, because good care starts with the basics.'],
    edu: ['Humane education.', 'Support for humane education, so kindness and good care for animals are passed on from neighbor to neighbor.'],
    rescue: ['Backing local rescues.', 'Support grants to local rescues, the groups already doing the hands-on work close to home.'],
  };
  const order = Object.keys(BLOCKS);
  const blocks = $$('[data-block]');
  const page = $('[data-page]:not(a)');
  function press(btn, focus) {
    const key = btn.dataset.block;
    blocks.forEach(b => {
      const on = b === btn;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    page.setAttribute('aria-labelledby', btn.id);
    $('[data-print-icon]').setAttribute('href', '#i-' + key);
    $('[data-print-no]').textContent = `No. ${order.indexOf(key) + 1} of 5`;
    $('[data-print-title]').textContent = BLOCKS[key][0];
    $('[data-print-text]').textContent = BLOCKS[key][1];
    page.classList.remove('is-pressing');
    void page.offsetWidth;
    page.classList.add('is-pressing');
  }
  blocks.forEach((b, i) => {
    b.addEventListener('click', () => press(b));
    b.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); press(blocks[(i + d + blocks.length) % blocks.length], true); }
      if (e.key === 'Home') { e.preventDefault(); press(blocks[0], true); }
      if (e.key === 'End') { e.preventDefault(); press(blocks[blocks.length - 1], true); }
    });
  });

  /* ------------------------------------------------------------ the letter desk */
  const LETTERS = {
    give: `Dear friends at the Strafford County Animal Protection Society,

Please accept the enclosed gift to help animals, and the people who care for them, here in Strafford County.

[Optional: I would like it to go toward vet bills, spay and neuter, food, humane education, or local rescues.]

My name and return address are below.

With thanks,
[Your name]
[Your mailing address]`,
    ask: `Dear Strafford County Animal Protection Society,

I am writing to ask about help with the cost of care for my animal.

About my animal: [kind of animal, age, and what is wrong]
The care needed: [what the vet recommends, and the estimate if you have one]
About me: [your town, and a little about why the cost is hard right now]

Please write back to me at the address below.

Thank you for reading,
[Your name]
[Your mailing address]`,
    rescue: `Dear Strafford County Animal Protection Society,

I am writing on behalf of [rescue name], a local animal rescue in [town], to ask about a support grant.

What we do: [the animals you help, and how]
What a grant would help with: [the need]

You can reach us by mail at the address below.

With thanks,
[Your name and role]
[Rescue name and mailing address]`,
  };
  const ADDRESS = 'Strafford County Animal Protection Society\n122 Cocheco Rd\nFarmington, NH 03835';
  const letter = $('[data-letter]');
  const kinds = $$('[data-kind]');
  const copied = $('[data-copied]');
  let kind = 'give';
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function showLetter(k, focusBtn) {
    kind = k;
    kinds.forEach(b => { const on = b.dataset.kind === k; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; if (on && focusBtn) b.focus(); });
    if (!letter) return;
    letter.innerHTML = esc(LETTERS[k]).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');
    letter.classList.remove('is-new'); void letter.offsetWidth; letter.classList.add('is-new');
    if (copied) copied.textContent = '';
  }
  kinds.forEach((b, i) => {
    b.addEventListener('click', () => showLetter(b.dataset.kind));
    b.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (d) { e.preventDefault(); showLetter(kinds[(i + d + kinds.length) % kinds.length].dataset.kind, true); }
    });
  });
  if (letter) { const q = new URLSearchParams(location.search).get('letter'); showLetter(LETTERS[q] ? q : 'give'); }
  async function copy(text, label, btn) {
    const out = (btn && btn.closest('[data-copy-scope]') && $('[data-copied]', btn.closest('[data-copy-scope]'))) || copied;
    try { await navigator.clipboard.writeText(text); }
    catch (_) {
      const t = document.createElement('textarea');
      t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    if (!out) return;
    out.textContent = label;
    clearTimeout(copy.t); copy.t = setTimeout(() => { out.textContent = ''; }, 3200);
  }
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.copy === 'address') copy(ADDRESS, 'Address copied.', b);
    else copy(LETTERS[kind] + '\n\n\nMail to:\n' + ADDRESS, 'Letter copied, with the address.', b);
  }));
  const printBtn = $('[data-print-letter]');
  if (printBtn) printBtn.addEventListener('click', () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Letter to the Strafford County Animal Protection Society</title><style>body{font:16px/1.7 Georgia,serif;margin:1in;color:#111}pre{white-space:pre-wrap;font:inherit}hr{margin:2em 0;border:0;border-top:1px solid #999}</style></head><body><pre>${esc(LETTERS[kind])}</pre><hr><pre>Mail to:\n${esc(ADDRESS)}</pre></body></html>`);
    w.document.close(); w.focus(); w.print();
  });

  /* ------------------------------------------------------------ drifting leaves, then snow */
  const cv = $('[data-drift]');
  const ctx = cv.getContext('2d');
  const LEAF = new Path2D('M0,-10 L2.2,-5 L6,-6.5 L4.6,-2 L9,0 L4,2.4 L4.6,6 L0.6,4 L0,9 L-0.6,4 L-4.6,6 L-4,2.4 L-9,0 L-4.6,-2 L-6,-6.5 L-2.2,-5Z');
  const OVAL = new Path2D('M0,-9 C5,-6 5,5 0,9 C-5,5 -5,-6 0,-9Z');
  const small = () => vw < 700;
  let parts = [];
  let dpr = 1;
  function sizeCanvas() {
    dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
  }
  function spawn(kindName, x, y, burst) {
    const z = 0.55 + Math.random() * 0.8;
    const leaf = kindName === 'leaf';
    return {
      kind: kindName, z,
      x: x ?? Math.random() * vw,
      y: y ?? -20 - Math.random() * vh * 0.3,
      vx: burst ? 2 + Math.random() * 5 : 0,
      vy: leaf ? 0.35 + Math.random() * 0.5 : 0.4 + Math.random() * 0.5,
      size: leaf ? (6 + Math.random() * 6) * z : (1.2 + Math.random() * 2.2) * z,
      rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.06,
      sway: Math.random() * 6.3, swayAmp: leaf ? 0.6 + Math.random() * 1.1 : 0.3 + Math.random() * 0.4,
      shape: Math.random() < 0.72 ? LEAF : OVAL,
      color: season.palette[(Math.random() * season.palette.length) | 0],
      burst: !!burst,
    };
  }
  function targets() {
    const m = small() ? 0.6 : 1;
    return { leaf: Math.round(season.leaves * m), snow: Math.round(season.snow * m) };
  }
  function gust(fromX, fromY) {
    parts.forEach(p => { if (p.kind === 'leaf') { p.vx += 3 + Math.random() * 4; p.vy -= Math.random() * 0.6; } });
    const n = small() ? 14 : 24;
    for (let i = 0; i < n; i++) {
      const p = spawn('leaf', (fromX ?? vw * 0.12) + (Math.random() - 0.4) * 160, (fromY ?? vh * 0.6) + (Math.random() - 0.5) * 160, true);
      p.color = MONTHS.October.palette[(Math.random() * 6) | 0];
      p.vy = -1 - Math.random() * 1.6;
      parts.push(p);
    }
  }
  function flurry() {
    const n = small() ? 60 : 120;
    for (let i = 0; i < n; i++) {
      const p = spawn('snow', Math.random() * vw, -10 - Math.random() * vh * 0.6, false);
      p.burst = true; p.vy *= 1.4;
      parts.push(p);
    }
  }
  let lastScroll = scrollY, t = 0, last = performance.now();
  function frameDrift(now) {
    const dt = Math.min(3, (now - last) / 16.67); last = now; t += dt;
    const dy = scrollY - lastScroll; lastScroll = scrollY;
    const tg = targets();
    const count = { leaf: 0, snow: 0 };
    parts.forEach(p => { if (!p.burst) count[p.kind]++; });
    if (count.leaf < tg.leaf && Math.random() < 0.06 * dt) parts.push(spawn('leaf'));
    if (count.snow < tg.snow && Math.random() < 0.35 * dt) parts.push(spawn('snow'));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    const keep = [];
    for (const p of parts) {
      p.sway += 0.02 * dt;
      p.vx *= Math.pow(0.985, dt);
      if (p.vy < (p.kind === 'leaf' ? 0.35 : 0.4)) p.vy += 0.03 * dt;
      p.x += (p.vx + Math.sin(p.sway) * p.swayAmp) * dt;
      p.y += p.vy * p.z * dt - dy * p.z * 0.35;
      p.rot += p.vr * dt + (p.kind === 'leaf' ? Math.sin(p.sway) * 0.01 : 0);
      if (p.y > vh + 30 || p.x > vw + 40 || p.x < -40) {
        const over = p.burst || count[p.kind] > tg[p.kind];
        if (over) { if (!p.burst) count[p.kind]--; continue; }
        Object.assign(p, spawn(p.kind), { y: -20 });
      }
      if (p.y < -60) p.y = vh + 20;
      keep.push(p);
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'leaf') {
        ctx.rotate(p.rot);
        const flip = Math.cos(p.sway * 1.6);
        ctx.scale(p.size / 10 * (0.35 + 0.65 * Math.abs(flip)), p.size / 10);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = p.color;
        ctx.fill(p.shape);
      } else {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(80,100,120,.35)';
        ctx.shadowBlur = 2;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    parts = keep;
  }

  /* ------------------------------------------------------------ the December plate: pulled onto the page, catches the light */
  const plate = $('[data-plate]');
  if (plate) {
    const mark = $('.plate-mark', plate);
    if (!reduce) {
      const r = plate.getBoundingClientRect();
      if (r.top > innerHeight * .9 || r.bottom < 0) {
        plate.classList.add('is-pending');
        const plateIo = new IntersectionObserver(es => {
          if (!es.some(e => e.isIntersecting)) return;
          plateIo.disconnect();
          plate.classList.remove('is-pending');
          plate.classList.add('is-printing');
          setTimeout(() => plate.classList.remove('is-printing'), 2900);
        }, { threshold: .35 });
        plateIo.observe(plate);
      }
    }
    const light = (x, y) => {
      const b = mark.getBoundingClientRect();
      plate.style.setProperty('--lx', clamp((x - b.left) / b.width).toFixed(3));
      plate.style.setProperty('--ly', clamp((y - b.top) / b.height).toFixed(3));
    };
    const dark = () => { plate.style.removeProperty('--lx'); plate.style.removeProperty('--ly'); };
    mark.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') light(e.clientX, e.clientY); });
    mark.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') dark(); });
    mark.addEventListener('click', e => {
      if (e.target.closest('a')) return;
      const on = !plate.classList.contains('is-lit') || e.pointerType === 'mouse';
      plate.classList.toggle('is-lit', on);
      on ? light(e.clientX, e.clientY) : dark();
    });
  }

  /* ------------------------------------------------------------ main loop */
  let ticking = false, dirty = true;
  addEventListener('scroll', () => { dirty = true; }, { passive: true });
  function frame(now) {
    if (dirty) { frameScenes(); frameBridge(); dirty = false; }
    if (!reduce && !document.hidden) frameDrift(now);
    requestAnimationFrame(frame);
  }
  if (reduce) {
    frameScenes(); frameBridge();
    addEventListener('scroll', () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { frameBridge(); ticking = false; });
    }, { passive: true });
  } else {
    sizeCanvas();
    for (let i = 0; i < targets().leaf; i++) parts.push(spawn('leaf', undefined, Math.random() * vh));
    requestAnimationFrame(frame);
  }
  addEventListener('resize', () => { vw = innerWidth; vh = innerHeight; dirty = true; if (!reduce) sizeCanvas(); }, { passive: true });

  $$('[data-gust]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (!reduce) gust(); }));
  $$('.scene-hero, [data-gust-plate]').forEach(el => el.addEventListener('click', e => { if (!reduce && !e.target.closest('a, button')) gust(e.clientX, e.clientY); }));
  $$('[data-flurry]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); if (!reduce) flurry(); }));
  $$('.scene-snow').forEach(el => el.addEventListener('click', () => { if (!reduce) flurry(); }));

  /* ------------------------------------------------------------ the contents (mobile menu) */
  const toggle = $('[data-toggle]');
  const panel = $('[data-contents]');
  if (toggle && panel) {
    const setOpen = (open, focusBack) => {
      toggle.setAttribute('aria-expanded', open);
      panel.hidden = !open;
      document.body.classList.toggle('is-contents', open);
      if (open) { const cur = $('a[aria-current]', panel) || $('a', panel); cur && cur.focus(); }
      else if (focusBack) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) setOpen(false, true); });
    panel.addEventListener('click', e => { if (e.target === panel || e.target.closest('a')) setOpen(false); });
    panel.addEventListener('focusout', e => { if (!panel.hidden && e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== toggle) setOpen(false); });
    matchMedia('(min-width: 1101px)').addEventListener('change', m => { if (m.matches) setOpen(false); });
  }

  /* ------------------------------------------------------------ small things */
  $$('[data-year]').forEach(el => { el.textContent = YEAR; });
  // the letter checklist on the grants page: ticks are kept on the page only, nothing is stored or sent
  $$('[data-checklist]').forEach(list => {
    const boxes = $$('input[type=checkbox]', list);
    const out = $('[data-check-count]', list);
    const stamp = $('[data-check-stamp]', list);
    const upd = () => {
      const n = boxes.filter(b => b.checked).length;
      if (out) out.textContent = `${n} of ${boxes.length} ticked`;
      if (stamp) stamp.classList.toggle('is-on', n === boxes.length);
    };
    boxes.forEach(b => b.addEventListener('change', upd));
    upd();
  });
})();
