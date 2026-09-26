/* UI core: shell (top bar + nav), modals, toasts, reward popups, formatting helpers. */
(function (DH) {
  'use strict';
  const U = DH.util, h = U.h, E = DH.economy, C = DH.content, A = DH.art;
  const S = () => DH.save.data;

  const ui = { screen: 'home', sub: {}, screens: {} };

  /* ---------------- formatting ---------------- */
  const PCT = {}; ['dmgPct', 'maxHpPct', 'speedPct', 'as', 'area', 'duration', 'ms', 'pickup', 'critPct', 'addCrit', 'critBonus', 'summonPct',
    'burn', 'spark', 'frost', 'decay', 'fragile', 'affliction', 'growth', 'greed', 'physPct', 'magicPct', 'firePct', 'lightningPct', 'icePct',
    'killAs', 'killAsMax', 'eliteHeal', 'killHealChance', 'killHeal', 'stillDmg', 'fireSpark', 'effectPct', 'wBurn', 'wSpark', 'wFrost', 'grenadePct'].forEach((k) => { PCT[k] = 1; });
  const fmtStat1 = (k, v) => {
    if (k === 'defense' || k === 'hitDefense') return t('statfmt.flat', { v: Math.round(v * 1000) / 10, name: t('stat.defense') }); // Defense is shown in points
    if (PCT[k]) return t('statfmt.pct', { v: Math.round(v * 1000) / 10, name: t('stat.' + k) });
    const n = Math.round(v * 100) / 100;
    return t('statfmt.flat', { v: n, name: t('stat.' + k) });
  };
  ui.fmtStat = (k, v) => fmtStat1(k, v).replace('+-', '−'); // trade-offs read '−15% …'
  ui.fmtStats = (mods, mult) => Object.keys(mods).map((k) => ui.fmtStat(k, mods[k] * (mult == null ? 1 : mult))).join(', ');
  ui.weaponUpText = (id, level) => {
    if (level <= 1) return t('wpn.' + id + '.desc');
    const m = C.weapons[id].levels[level - 2], parts = [];
    for (const k in m) {
      const v = m[k];
      if (k === 'area') parts.push(t('up.area', { v: Math.round(v * 100) }));
      else if (k === 'cd') parts.push(t('up.cd', { v: Math.abs(v) }));
      else parts.push(t('up.' + k, { v }));
    }
    return parts.join(' · ');
  };
  ui.icon = (name, cls) => A.img(name, cls);
  ui.isWord = (txt) => /[^0-9+\-.,%KMB/ ]/.test(String(txt).replace(/^[+-]/, ''));
  ui.rw = (entry) => h('span.rw' + (entry.rarity != null ? '.rar' + entry.rarity : ''), A.img(entry.icon), h('span', { cls: (entry.rarity != null ? 'rtxt ' : '') + (ui.isWord(entry.text) ? 'word' : '') }, entry.text));
  ui.rewardChips = (rw) => h('div.rewards', DH.meta.rewardPreview(rw).map(ui.rw));

  /* ---------------- toasts ---------------- */
  ui.toast = (msg, kind) => {
    const box = document.getElementById('toasts');
    const el = h('div.toast' + (kind ? '.' + kind : ''), msg);
    box.appendChild(el);
    setTimeout(() => el.remove(), 2500);
    if (kind === 'bad') DH.audio.play('error');
  };

  /* ---------------- modals ---------------- */
  const stack = [];
  ui.modal = (o) => {
    const layer = document.getElementById('modals');
    const box = h('div.modal' + (o.cls ? '.' + o.cls.split(' ').join('.') : ''));
    const bg = h('div.modal-bg', box);
    const api = {
      el: box, bg, closable: o.closable !== false,
      close(v) {
        if (api.closed) return; api.closed = true;
        bg.remove(); const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        if (o.onClose) o.onClose(v);
      },
      set(content) { box.innerHTML = ''; fill(content); },
    };
    function fill(content) {
      if (o.rays) box.appendChild(h('div.raysbox', h('div.rays'))); // clipped: the spinning rays must not make a short window scroll
      // the title and the X stay pinned at the top while the window's content scrolls
      const onX = o.onX || (o.closable !== false ? () => { DH.audio.play('click'); api.close(); } : null);
      if (o.title || onX) box.appendChild(h('div.mhead' + (o.title ? '' : '.bare'), o.title ? h('div.mt', o.title) : null,
        onX ? h('button.x', { onclick: onX, 'aria-label': t('common.close') }, DH.icons.img('u_close', 'ci')) : null));
      if (typeof content === 'function') content = content(api);
      if (content) box.appendChild(content);
      box.appendChild(h('div.mfoot')); // a pinned bottom margin: scrolled content stops as far from the frame as at the sides
    }
    fill(o.body);
    if (o.closable !== false) bg.addEventListener('click', (e) => { if (e.target === bg) api.close(); });
    layer.appendChild(bg);
    stack.push(api);
    return api;
  };
  ui.closeAll = () => stack.slice().forEach((m) => m.close());
  ui.topModal = () => stack[stack.length - 1];

  ui.confirm = (o) => new Promise((resolve) => {
    let answered = false;
    const m = ui.modal({
      title: o.title, closable: true, onClose: () => { if (!answered) resolve(false); },
      body: h('div',
        h('div.center', { style: { lineHeight: '1.4' } }, o.body),
        o.note ? h('div.note', o.note) : null,
        h('div.btns',
          h('button.btn.ghost', { onclick: () => { answered = true; m.close(); resolve(false); } }, o.cancel || t('common.cancel')),
          h('button.btn.' + (o.okCls || 'gold'), { onclick: () => { answered = true; DH.audio.play('click'); m.close(); resolve(true); } }, o.ok || t('common.ok')))),
    });
  });

  ui.rewardPopup = (title, entries, extra) => {
    if (!entries || !entries.length) return null;
    DH.audio.play('reward');
    return ui.modal({
      title, rays: true,
      body: (m) => h('div',
        h('div.reward-list', entries.map((e, i) => {
          const r = e.rarity != null ? e.rarity : null;
          return h('div.reward', { style: { animationDelay: (i * 0.08) + 's' } },
            h('div.slot' + (r != null ? '.rar' + r : ''), A.img(e.icon)),
            r != null ? h('div.rn.rar' + r, h('span.rtxt', t('rarity.' + E.rarities[r]))) : null,
            h('div.n' + (ui.isWord(e.text) ? '.word' : ''), e.text));
        })),
        extra || null,
        h('div.btns', h('button.btn.gold', { onclick: () => { DH.audio.play('click'); m.close(); } }, t('common.collect')))),
    });
  };

  /* ---------------- pixel textures for the UI skin (css --tex-*) ---------------- */
  function stoneTexture(base, amp, seed) {
    const N = 32, G = DH.gfx, c = G.canvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), d = id.data;
    const [r0, g0, b0] = G.rgb(base), rng = U.seeded(seed);
    // value noise (tileable 8x8 lattice) + grain, then quantized to the game palette with dithering
    const L = []; for (let i = 0; i < 64; i++) L.push(rng());
    const lat = (x, y) => L[((y & 7) << 3) | (x & 7)];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / 4, fy = y / 4, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const v = (lat(ix, iy) * (1 - tx) + lat(ix + 1, iy) * tx) * (1 - ty) + (lat(ix, iy + 1) * (1 - tx) + lat(ix + 1, iy + 1) * tx) * ty;
      const k = 1 + (v - 0.5) * amp + (rng() - 0.5) * amp * 0.5, i = (y * N + x) * 4;
      d[i] = r0 * k; d[i + 1] = g0 * k; d[i + 2] = b0 * k; d[i + 3] = 255;
    }
    G.quantize(id, { dither: 12, sat: 1, contrast: 1 });
    g.putImageData(id, 0, 0);
    return 'url(' + c.toDataURL() + ')';
  }
  /** Old worn stone for buttons: two scales of mottling, grain, pits, chips and a few carved cracks (a 64px tile). */
  function ancientStone(base, seed) {
    const N = 64, G = DH.gfx, c = G.canvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), d = id.data;
    const [r0, g0, b0] = G.rgb(base), rng = U.seeded(seed), K = new Float32Array(N * N);
    const lattice = (n) => { const L = []; for (let i = 0; i < n * n; i++) L.push(rng()); return (x, y) => L[((y % n + n) % n) * n + ((x % n + n) % n)]; };
    const noise = (lat, cell, x, y) => { // smooth value noise, wraps with the tile
      const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      return (lat(ix, iy) * (1 - tx) + lat(ix + 1, iy) * tx) * (1 - ty) + (lat(ix, iy + 1) * (1 - tx) + lat(ix + 1, iy + 1) * tx) * ty;
    };
    const big = lattice(4), mid = lattice(8), fine = lattice(16);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      K[y * N + x] = 1 + (noise(big, 16, x, y) - 0.5) * 0.7 + (noise(mid, 8, x, y) - 0.5) * 0.42 + (noise(fine, 4, x, y) - 0.5) * 0.2 + (rng() - 0.5) * 0.18;
    }
    const at = (x, y) => ((y % N + N) % N) * N + ((x % N + N) % N);
    for (let i = 0; i < 70; i++) K[at(Math.floor(rng() * N), Math.floor(rng() * N))] *= 0.5; // pits
    for (let i = 0; i < 36; i++) K[at(Math.floor(rng() * N), Math.floor(rng() * N))] *= 1.3; // chips
    for (let i = 0; i < 4; i++) { // cracks: a dark cut with a lit lower lip
      let x = Math.floor(rng() * N), y = Math.floor(rng() * N), dx = rng() < 0.5 ? 1 : -1;
      for (let j = 0, n = 10 + Math.floor(rng() * 14); j < n; j++) {
        K[at(x, y)] *= 0.4; K[at(x, y + 1)] *= 1.2;
        const r = rng(); if (r < 0.55) x += dx; else if (r < 0.8) y++; else y--;
      }
    }
    for (let i = 0; i < N * N; i++) { d[i * 4] = r0 * K[i]; d[i * 4 + 1] = g0 * K[i]; d[i * 4 + 2] = b0 * K[i]; d[i * 4 + 3] = 255; }
    G.quantize(id, { dither: 8, sat: 0.9, contrast: 1 });
    g.putImageData(id, 0, 0);
    return 'url(' + c.toDataURL() + ')';
  }
  ui.textures = () => {
    const st = document.documentElement.style;
    st.setProperty('--tex-panel', stoneTexture('#2a2030', 0.55, 7));
    st.setProperty('--tex-dark', stoneTexture('#1a141e', 0.6, 11));
    st.setProperty('--tex-stone', ancientStone('#5a4c52', 23));
  };

  /* ---------------- shell ---------------- */
  ui.init = () => {
    ui.textures();
    const menu = document.getElementById('menu');
    menu.innerHTML = '';
    ui.topEl = h('div.topbar');
    ui.contentEl = h('div.content');
    ui.navEl = h('div.nav');
    menu.append(h('div.menu-bg'), ui.topEl, ui.contentEl, ui.navEl);
    let pend = false;
    const schedule = () => { if (pend) return; pend = true; requestAnimationFrame(() => { pend = false; if (!menu.classList.contains('hidden')) ui.refresh(); }); };
    DH.events.on('meta', schedule);
    DH.events.on('lang', () => { ui.renderNav(); ui.refresh(true); });
    setInterval(() => { if (!menu.classList.contains('hidden')) { ui.renderTop(); ui.tick && ui.tick(); } }, 1000);
    ui.renderNav();
  };

  ui.renderTop = () => {
    const s = S(), el = ui.topEl; if (!el) return;
    const need = E.accountXpNext(s.accountLevel);
    const en = DH.meta.energy();
    el.innerHTML = '';
    el.append(
      h('div.avatar', { onclick: () => ui.openProfile() }, A.img('h_' + s.selectedHero), h('div.lvl', s.accountLevel)),
      h('div.acct', h('div.name', t('top.level', { n: s.accountLevel })), h('div.xpbar', h('i', { style: { width: (s.accountXp / need * 100) + '%' } }))),
      h('div.pill', { onclick: () => ui.openEnergy() }, A.img('i_energy'), h('span', en + '/' + E.ENERGY_MAX), h('span.plus', '+')),
      h('div.pill', { onclick: () => ui.go('shop', 'gold') }, A.img('i_gold'), h('span', U.fmt(s.gold)), h('span.plus', '+')),
      h('div.pill', { onclick: () => ui.go('shop', 'gems') }, A.img('i_gem'), h('span', U.fmt(s.gems)), h('span.plus', '+')));
  };

  const NAV = [
    { id: 'shop', icon: 'c_gold', badge: 'shop' },
    { id: 'armory', icon: 'h_knight', badge: 'gear' },
    { id: 'home', icon: 'n_battle', cls: 'battle' },
    { id: 'shrine', icon: 'n_shrine', badge: 'shrine', dot: true },
    { id: 'quests', icon: 'n_scroll', badge: 'quests' },
  ];
  ui.renderNav = () => {
    const b = DH.meta.badges();
    ui.navEl.innerHTML = '';
    NAV.forEach((n) => {
      const cnt = n.badge ? b[n.badge] : 0;
      ui.navEl.appendChild(h('button' + (ui.screen === n.id ? '.on' : '') + (n.cls ? '.' + n.cls : ''), {
        onclick: () => { DH.audio.play('click'); ui.go(n.id); },
      }, A.img(n.icon), h('span', t('nav.' + n.id)), cnt ? h('span.badge' + (n.dot ? '.dot' : ''), n.dot ? '' : cnt) : null));
    });
  };

  ui.go = (screen, sub) => {
    if (sub) ui.sub[screen] = sub;
    const changedScreen = ui.screen !== screen;
    ui.screen = screen;
    ui.refresh(changedScreen);
    if (sub && ui.screens[screen] && ui.screens[screen].scrollTo) ui.screens[screen].scrollTo(sub);
  };

  ui.refresh = (resetScroll) => {
    const sc = ui.screens[ui.screen]; if (!sc) return;
    const y = ui.contentEl.scrollTop;
    ui.renderTop(); ui.renderNav();
    ui.contentEl.innerHTML = '';
    ui.tick = null;
    ui.contentEl.appendChild(sc.render());
    ui.contentEl.scrollTop = resetScroll ? 0 : y;
    DH.menuScene && DH.menuScene.setMode(ui.screen);
  };

  ui.show = (v) => {
    document.getElementById('menu').classList.toggle('hidden', !v);
    if (v) ui.refresh(true);
  };

  DH.ui = ui;
})(window.DH);
