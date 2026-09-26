/* Animated backdrop behind the menus: the selected hero standing in a torch-lit crypt. */
(function (DH) {
  'use strict';
  const U = DH.util, A = DH.art, C = DH.content, G = DH.gfx;
  const scene = { floor: null, key: null, t: 0, embers: [], mode: 'home', anchorY: 0.36, lurkers: [] };
  scene.setMode = (m) => { scene.mode = m; };

  function ensureFloor() {
    const sid = DH.save.data.selectedStage, key = sid;
    if (scene.key === key) return;
    scene.key = key; scene.stageId = sid;
    const st = C.stages[sid];
    scene.floor = G.floor(st.theme, 7 + st.index * 13);
    const pool = ['skeleton', 'ghoul', 'bat', 'ghost', 'spider', 'cultist', 'wraith'].map((k) => st.remap[k] || k);
    scene.lurkers = pool.map((name, i) => {
      const def = C.enemies[name], p = G.painters[def.painter];
      return { painter: def.painter, variant: def.variant || (p.variants && p.variants[st.variant] ? st.variant : null), a: (i / 7) * Math.PI * 2 + 0.4, d: 95 + (i % 3) * 18, ph: Math.random() * 6 };
    });
  }

  let anchorT = 0;
  scene.render = (dt) => {
    const V = DH.view, W = V.w, H = V.h;
    ensureFloor();
    scene.t += dt; anchorT -= dt;
    if (anchorT <= 0) {
      anchorT = 0.5;
      const el = document.querySelector('.hero-stage');
      if (el && scene.mode === 'home') { const r = el.getBoundingClientRect(); scene.anchorY = U.clamp((r.top + r.height * 0.5) / window.innerHeight, 0.2, 0.6); }
    }
    const g = V.begin();
    const cx = Math.round(-W / 2), cy = Math.round(-H * scene.anchorY), CH = G.CHUNK, lights = [];
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let ky = Math.floor(cy / CH); ky <= Math.floor((cy + H) / CH); ky++) for (let kx = Math.floor(cx / CH); kx <= Math.floor((cx + W) / CH); kx++) {
      const ch = scene.floor.chunk(kx, ky); g.drawImage(ch.canvas, kx * CH - cx, ky * CH - cy, CH, CH); ch.lights.forEach((l) => lights.push(l));
    }
    const s = DH.save.data;
    scene.lurkers.forEach((l) => {
      const a = l.a + scene.t * 0.05, x = Math.cos(a) * l.d * 1.3 - cx, y = Math.sin(a) * l.d * 0.8 - cy;
      const sp = G.sprite(l.painter, l.variant), fr = sp.frames[Math.floor((scene.t + l.ph) * 3) % sp.frames.length];
      g.save(); g.globalAlpha = 0.9;
      if (x > W / 2) { g.translate(Math.round(x + sp.ox), Math.round(y - sp.oy)); g.scale(-1, 1); g.drawImage(fr, 0, 0, sp.w, sp.h); }
      else g.drawImage(fr, Math.round(x - sp.ox), Math.round(y - sp.oy), sp.w, sp.h);
      g.restore();
    });
    const hs = G.sprite(s.selectedHero), bob = Math.sin(scene.t * 2) * 0.8, k = 2;
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(-cx, -cy + 16, 14, 4, 0, 0, Math.PI * 2); g.fill();
    g.drawImage(hs.frames[0], Math.round(-cx - hs.ox * k), Math.round(-cy - hs.oy * k + bob - 1), hs.w * k, hs.h * k);
    if (DH.vfx) { // drifting fog of the selected hall
      const f = DH.vfx.fog(scene.stageId), size = 256;
      g.save(); g.imageSmoothingEnabled = true;
      [[0.7, 6, 2, 1], [0.45, -9, 4, 1.5]].forEach(([a, vx, vy, sc]) => {
        const sz = size * sc, ox = ((-scene.t * vx) % sz + sz) % sz, oy = ((-scene.t * vy) % sz + sz) % sz;
        g.globalAlpha = f.a * a; for (let y = -oy; y < H; y += sz) for (let x = -ox; x < W; x += sz) g.drawImage(f.tex, x, y, sz, sz);
      });
      g.restore();
    }
    const d = V.dctx, T = C.stages[scene.stageId].theme;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    d.fillStyle = 'rgba(' + T.dark.join(',') + ',' + Math.min(0.94, T.darkness + (scene.mode === 'home' ? 0.02 : 0.1)) + ')'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const pr = 95 + Math.sin(scene.t * 3) * 3 + Math.random() * 2;
    d.drawImage(A.lightSprite, -cx - pr, -cy - pr, pr * 2, pr * 2);
    lights.forEach((l) => { const r = l.r * (0.95 + Math.random() * 0.05); d.drawImage(A.lightSprite, l.x - cx - r, l.y - cy - r, r * 2, r * 2); });
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(V.dark, 0, 0, W, H); g.restore();
    scene.lurkers.forEach((l, i) => {
      if (Math.sin(scene.t * 0.7 + i) < 0.2) return;
      const a = l.a + scene.t * 0.05, x = Math.round(Math.cos(a) * l.d * 1.3 - cx), y = Math.round(Math.sin(a) * l.d * 0.8 - cy - 3);
      g.fillStyle = '#ff3b3b'; g.fillRect(x - 2, y, 1, 1); g.fillRect(x + 1, y, 1, 1);
    });
    g.globalCompositeOperation = 'lighter';
    if (scene.embers.length < 50 && Math.random() < 0.5) scene.embers.push({ x: U.rand(0, W), y: H + 4, vx: U.rand(-6, 6), vy: U.rand(-28, -12), life: U.rand(4, 9) });
    for (let i = scene.embers.length - 1; i >= 0; i--) {
      const e = scene.embers[i]; e.life -= dt; e.x += (e.vx + Math.sin(scene.t * 2 + i) * 4) * dt; e.y += e.vy * dt;
      if (e.life <= 0 || e.y < -5) { scene.embers.splice(i, 1); continue; }
      g.fillStyle = i % 3 ? 'rgba(255,140,50,0.8)' : 'rgba(255,220,120,0.9)'; g.fillRect(V.snap(e.x), V.snap(e.y), 1, 1);
    }
    for (const l of lights) if (l.kind === 'brazier') { const x = l.x - cx, y = l.y - cy; if (x > -40 && y > -40 && x < W + 40 && y < H + 40) { g.drawImage(A.glow(T.lightTint + '0.35)'), x - 30, y - 30, 60, 60); G.P.ell(g, x, y - 2, 2.2, 3, 'rgba(255,170,60,0.9)'); } }
    g.drawImage(A.glow(T.lightTint + '0.25)'), -cx - 50, -cy - 50, 100, 100);
    g.globalCompositeOperation = 'source-over';
    const ctx = V.end();
    ctx.drawImage(V.getVignette(), 0, 0);
  };
  DH.menuScene = scene;
})(window.DH);
