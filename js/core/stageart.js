/* Key art for the stage card: a painted scene per hall (architecture in layers of fog, the hall's Lord as a
 * looming silhouette, its lights and drifting particles). Drawn once per hall at the card's size. */
(function (DH) {
  'use strict';
  const U = DH.util, art = DH.art, TAU = Math.PI * 2;
  const mk = (w, h) => art.makeCanvas(w, h);
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const mix = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));

  // per hall: sky (top/bottom), fog, silhouette tone, accent light, particles, set pieces
  const SCENES = {
    crypt:      { top: [14, 10, 22], bot: [44, 34, 52], fog: [90, 70, 100], sil: [10, 7, 14], light: [255, 170, 90], parts: 'dust', arch: 'gothic', ground: 'tombs', lights: 'candles' },
    abyss:      { top: [18, 3, 3], bot: [96, 22, 8], fog: [160, 50, 20], sil: [14, 3, 3], light: [255, 110, 40], parts: 'embers', arch: 'spires', ground: 'lava', lights: 'lava' },
    aqueduct:   { top: [4, 14, 18], bot: [22, 56, 60], fog: [70, 150, 150], sil: [3, 12, 14], light: [120, 255, 220], parts: 'drips', arch: 'aqueduct', ground: 'water', lights: 'wisps' },
    catacombs:  { top: [6, 12, 26], bot: [40, 66, 100], fog: [140, 190, 240], sil: [6, 10, 20], light: [160, 220, 255], parts: 'snow', arch: 'icevault', ground: 'ice', lights: 'crystals' },
    discord:    { top: [14, 4, 22], bot: [60, 20, 84], fog: [170, 80, 220], sil: [12, 4, 18], light: [230, 130, 255], parts: 'motes', arch: 'pylons', ground: 'runes', lights: 'crystals' },
    blightmire: { top: [8, 12, 4], bot: [44, 58, 20], fog: [120, 150, 60], sil: [6, 9, 3], light: [190, 255, 110], parts: 'spores', arch: 'trees', ground: 'bog', lights: 'fireflies' },
    reliquary:  { top: [20, 14, 6], bot: [96, 74, 36], fog: [230, 200, 130], sil: [16, 11, 5], light: [255, 225, 150], parts: 'gold', arch: 'cathedral', ground: 'altar', lights: 'rays' },
  };

  function glow(g, x, y, r, c, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(c, a)); gr.addColorStop(0.4, rgba(c, a * 0.45)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function fogBand(g, w, y, hgt, c, a) {
    const gr = g.createLinearGradient(0, y - hgt, 0, y + hgt);
    gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.5, rgba(c, a)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(0, y - hgt, w, hgt * 2);
  }

  /* ---- architecture: drawn as a flat silhouette on a layer, the layer tinted by its depth ---- */
  const ARCH = {
    gothic(g, w, h, rng, depth) { // pointed arches on slender columns, a rose window far back
      const n = depth ? 5 : 3, cw = w / n, base = h * (depth ? 0.78 : 0.95), top = h * (depth ? 0.12 : -0.05);
      g.fillRect(0, top, w, base - top);
      g.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < n; i++) {
        const x0 = i * cw + cw * 0.16, x1 = (i + 1) * cw - cw * 0.16, mx = (x0 + x1) / 2, aw = (x1 - x0) / 2, spring = top + (base - top) * 0.42;
        g.beginPath(); g.moveTo(x0, base); g.lineTo(x0, spring); g.quadraticCurveTo(x0, spring - aw * 1.1, mx, spring - aw * 1.5); g.quadraticCurveTo(x1, spring - aw * 1.1, x1, spring); g.lineTo(x1, base); g.closePath(); g.fill();
      }
      g.globalCompositeOperation = 'source-over';
      if (depth) { g.beginPath(); g.arc(w * 0.5, h * 0.2, h * 0.07, 0, TAU); g.globalCompositeOperation = 'destination-out'; g.fill(); g.globalCompositeOperation = 'source-over'; }
    },
    spires(g, w, h, rng, depth) { // jagged obsidian spires
      const n = depth ? 9 : 5; g.beginPath(); g.moveTo(0, h);
      for (let i = 0; i <= n; i++) { const x = i / n * w + (rng() - 0.5) * w / n * 0.6, pk = h * (depth ? 0.18 + rng() * 0.35 : 0.05 + rng() * 0.4); g.lineTo(x - w / n * 0.35, h * (depth ? 0.7 : 0.8)); g.lineTo(x - w / n * 0.06, pk + h * 0.05); g.lineTo(x, pk); g.lineTo(x + w / n * 0.1, pk + h * 0.12); g.lineTo(x + w / n * 0.4, h * (depth ? 0.72 : 0.85)); }
      g.lineTo(w, h); g.closePath(); g.fill();
    },
    aqueduct(g, w, h, rng, depth) { // a two-tier arcade of round arches
      const tiers = depth ? [[0.2, 0.52, 7], [0.52, 0.8, 7]] : [[-0.1, 0.9, 3]];
      for (const [t0, t1, n] of tiers) {
        const y0 = h * t0, y1 = h * t1, cw = w / n; g.fillRect(0, y0, w, y1 - y0);
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < n; i++) { const x0 = i * cw + cw * 0.2, x1 = (i + 1) * cw - cw * 0.2, r = (x1 - x0) / 2, sp = y0 + (y1 - y0) * 0.35 + r; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, sp); g.arc(x0 + r, sp, r, Math.PI, 0); g.lineTo(x1, y1); g.closePath(); g.fill(); }
        g.globalCompositeOperation = 'source-over';
      }
    },
    icevault(g, w, h, rng, depth) { // a vault ceiling hung with icicles, frozen pillars
      g.fillRect(0, 0, w, h * (depth ? 0.14 : 0.08));
      const n = depth ? 34 : 16;
      for (let i = 0; i < n; i++) { const x = rng() * w, iw = (depth ? 4 : 10) + rng() * (depth ? 8 : 18), il = h * (0.08 + rng() * (depth ? 0.22 : 0.3)); g.beginPath(); g.moveTo(x - iw / 2, h * 0.06); g.lineTo(x, h * 0.06 + il); g.lineTo(x + iw / 2, h * 0.06); g.closePath(); g.fill(); }
      const m = depth ? 4 : 2;
      for (let i = 0; i < m; i++) { const x = (i + 0.5) / m * w + (rng() - 0.5) * 40, pw = depth ? 22 : 46; g.beginPath(); g.moveTo(x - pw / 2, h); g.lineTo(x - pw * 0.4, h * 0.1); g.lineTo(x + pw * 0.4, h * 0.1); g.lineTo(x + pw / 2, h); g.closePath(); g.fill(); }
    },
    pylons(g, w, h, rng, depth) { // shards of crystal floating over broken ground
      const n = depth ? 7 : 4;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n * w + (rng() - 0.5) * w / n * 0.5, cy = h * (depth ? 0.3 + rng() * 0.25 : 0.25 + rng() * 0.3), sw = depth ? 10 + rng() * 10 : 22 + rng() * 18, sh = sw * (2.4 + rng());
        g.beginPath(); g.moveTo(x, cy - sh); g.lineTo(x + sw, cy - sh * 0.2); g.lineTo(x + sw * 0.4, cy + sh * 0.6); g.lineTo(x - sw * 0.5, cy + sh * 0.3); g.lineTo(x - sw * 0.8, cy - sh * 0.4); g.closePath(); g.fill();
      }
      g.beginPath(); g.moveTo(0, h); for (let i = 0; i <= 12; i++) g.lineTo(i / 12 * w, h * (depth ? 0.8 : 0.88) + (rng() - 0.5) * 16); g.lineTo(w, h); g.closePath(); g.fill();
    },
    trees(g, w, h, rng, depth) { // dead, twisted trees hung with moss
      const n = depth ? 7 : 3;
      const branch = (x, y, a, len, wd, d) => {
        const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
        g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (rng() - 0.5) * len * 0.4, (y + y2) / 2, x2, y2); g.stroke();
        if (d > 0) { branch(x2, y2, a - 0.4 - rng() * 0.5, len * 0.7, wd * 0.62, d - 1); branch(x2, y2, a + 0.3 + rng() * 0.5, len * 0.65, wd * 0.6, d - 1); }
        else if (rng() < 0.6) { g.lineWidth = 1; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 + (rng() - 0.5) * 3, y2 + 8 + rng() * 16); g.stroke(); } // hanging moss
      };
      for (let i = 0; i < n; i++) { const x = (i + 0.3 + rng() * 0.4) / n * w; branch(x, h, -Math.PI / 2 + (rng() - 0.5) * 0.4, h * (depth ? 0.2 : 0.32), depth ? 7 : 16, depth ? 4 : 5); }
      g.beginPath(); g.moveTo(0, h); for (let i = 0; i <= 10; i++) g.lineTo(i / 10 * w, h * (depth ? 0.86 : 0.92) + (rng() - 0.5) * 10); g.lineTo(w, h); g.closePath(); g.fill();
    },
    cathedral(g, w, h, rng, depth) { // tall fluted columns and a vaulted nave
      const n = depth ? 6 : 3, cw = w / n;
      for (let i = 0; i <= n; i++) { const x = i * cw, pw = depth ? 16 : 34; g.fillRect(x - pw / 2, h * (depth ? 0.1 : -0.1), pw, h); g.fillRect(x - pw * 0.8, h * (depth ? 0.08 : -0.12), pw * 1.6, depth ? 8 : 14); }
      g.lineWidth = depth ? 6 : 12;
      for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(i * cw, h * (depth ? 0.12 : -0.08)); g.quadraticCurveTo((i + 0.5) * cw, h * (depth ? -0.12 : -0.4), (i + 1) * cw, h * (depth ? 0.12 : -0.08)); g.stroke(); }
    },
  };

  /* ---- the ground in front: each hall's floor ---- */
  const GROUND = {
    tombs(g, w, h, S, rng) {
      for (let i = 0; i < 5; i++) { const x = rng() * w, y = h * (0.82 + rng() * 0.1), tw = 14 + rng() * 10, th = 18 + rng() * 14; g.fillStyle = rgba(S.sil, 0.95); g.beginPath(); g.moveTo(x - tw / 2, y); g.lineTo(x - tw / 2, y - th + tw / 2); g.arc(x, y - th + tw / 2, tw / 2, Math.PI, 0); g.lineTo(x + tw / 2, y); g.closePath(); g.fill(); g.fillStyle = rgba(S.light, 0.08); g.fillRect(x - tw / 2 + 2, y - th + 4, 2, th - 6); }
    },
    lava(g, w, h, S, rng) {
      const y = h * 0.84, gr = g.createLinearGradient(0, y - 10, 0, h);
      gr.addColorStop(0, 'rgba(255,190,80,0.9)'); gr.addColorStop(0.3, 'rgba(255,90,20,0.8)'); gr.addColorStop(1, 'rgba(90,10,0,0.9)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, y + 8); for (let i = 0; i <= 16; i++) g.lineTo(i / 16 * w, y + Math.sin(i * 1.3) * 5); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,220,120,0.7)'; g.lineWidth = 1.2; for (let i = 0; i < 10; i++) { const x = rng() * w, yy = y + 10 + rng() * (h - y - 12); g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 8 + rng() * 20, yy + (rng() - 0.5) * 4); g.stroke(); }
      glow(g, w * 0.5, h, w * 0.6, [255, 100, 30], 0.35);
    },
    water(g, w, h, S, rng) {
      const y = h * 0.82, gr = g.createLinearGradient(0, y, 0, h);
      gr.addColorStop(0, rgba(S.fog, 0.35)); gr.addColorStop(1, rgba(S.sil, 0.95));
      g.fillStyle = gr; g.fillRect(0, y, w, h - y);
      g.strokeStyle = rgba(S.light, 0.35); g.lineWidth = 1; for (let i = 0; i < 18; i++) { const x = rng() * w, yy = y + 4 + rng() * (h - y - 6), l = 10 + rng() * 30; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + l, yy); g.stroke(); }
    },
    ice(g, w, h, S, rng) {
      const y = h * 0.84, gr = g.createLinearGradient(0, y, 0, h);
      gr.addColorStop(0, 'rgba(200,235,255,0.35)'); gr.addColorStop(1, rgba(S.sil, 0.95));
      g.fillStyle = gr; g.fillRect(0, y, w, h - y);
      g.strokeStyle = 'rgba(220,245,255,0.35)'; g.lineWidth = 1; for (let i = 0; i < 8; i++) { let x = rng() * w, yy = y + 4 + rng() * 20; g.beginPath(); g.moveTo(x, yy); for (let k = 0; k < 3; k++) { x += 8 + rng() * 14; yy += (rng() - 0.3) * 8; g.lineTo(x, yy); } g.stroke(); }
      g.fillStyle = 'rgba(180,230,255,0.55)'; for (let i = 0; i < 6; i++) { const x = rng() * w, yy = y + rng() * 10, s = 6 + rng() * 10; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + s * 0.3, yy - s * 1.8); g.lineTo(x + s * 0.6, yy); g.closePath(); g.fill(); }
    },
    runes(g, w, h, S, rng) {
      const cx = w * 0.62, cy = h * 0.9;
      g.strokeStyle = rgba(S.light, 0.55); g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, cy, w * 0.3, h * 0.07, 0, 0, TAU); g.stroke();
      g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, w * 0.22, h * 0.05, 0, 0, TAU); g.stroke();
      g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5, x = cx + Math.cos(a) * w * 0.22, y = cy + Math.sin(a) * h * 0.05; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      glow(g, cx, cy, w * 0.3, S.light, 0.2);
    },
    bog(g, w, h, S, rng) {
      const y = h * 0.84;
      for (let i = 0; i < 4; i++) { const x = rng() * w, rw = 40 + rng() * 70; g.fillStyle = 'rgba(40,60,14,0.75)'; g.beginPath(); g.ellipse(x, y + 8 + rng() * 20, rw, 6 + rng() * 5, 0, 0, TAU); g.fill(); g.strokeStyle = rgba(S.light, 0.25); g.lineWidth = 1; g.stroke(); }
      g.strokeStyle = rgba(S.sil, 0.95); g.lineWidth = 1.5; for (let i = 0; i < 30; i++) { const x = rng() * w, yy = h * (0.88 + rng() * 0.12); g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + (rng() - 0.5) * 6, yy - 10, x + (rng() - 0.5) * 8, yy - 14 - rng() * 14); g.stroke(); } // reeds
    },
    altar(g, w, h, S, rng) {
      const x = w * 0.62, y = h * 0.86;
      g.fillStyle = rgba(S.sil, 0.95); g.fillRect(x - 60, y - 8, 120, 30); g.fillRect(x - 76, y + 10, 152, 20);
      g.fillStyle = rgba(S.light, 0.25); g.fillRect(x - 60, y - 8, 120, 2);
      glow(g, x, y - 10, 60, S.light, 0.35);
    },
  };

  /* ---- light sources ---- */
  const LIGHTS = {
    candles(g, w, h, S, rng) { for (let i = 0; i < 6; i++) { const x = rng() * w, y = h * (0.7 + rng() * 0.2); glow(g, x, y - 6, 26 + rng() * 14, S.light, 0.55); g.fillStyle = '#e8dcc0'; g.fillRect(x - 1.5, y - 6, 3, 7); g.fillStyle = '#fff2c0'; g.beginPath(); g.ellipse(x, y - 9, 1.5, 3, 0, 0, TAU); g.fill(); } },
    lava(g, w, h, S, rng) { for (let i = 0; i < 4; i++) glow(g, rng() * w, h * (0.35 + rng() * 0.3), 50 + rng() * 40, S.light, 0.18); },
    wisps(g, w, h, S, rng) { for (let i = 0; i < 7; i++) { const x = rng() * w, y = h * (0.2 + rng() * 0.6); glow(g, x, y, 16 + rng() * 10, S.light, 0.6); g.fillStyle = 'rgba(230,255,250,0.9)'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); } },
    crystals(g, w, h, S, rng) { for (let i = 0; i < 6; i++) { const x = rng() * w, y = h * (0.55 + rng() * 0.3), s = 6 + rng() * 10; glow(g, x, y - s, s * 4, S.light, 0.45); g.fillStyle = rgba(mix(S.light, [255, 255, 255], 0.3), 0.9); g.beginPath(); g.moveTo(x, y - s * 2); g.lineTo(x + s * 0.5, y - s * 0.6); g.lineTo(x, y); g.lineTo(x - s * 0.5, y - s * 0.6); g.closePath(); g.fill(); } },
    fireflies(g, w, h, S, rng) { for (let i = 0; i < 16; i++) { const x = rng() * w, y = h * (0.3 + rng() * 0.55); glow(g, x, y, 8 + rng() * 6, S.light, 0.7); } },
    rays(g, w, h, S, rng) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const x = w * (0.2 + i * 0.16) + (rng() - 0.5) * 30, gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, rgba(S.light, 0.22)); gr.addColorStop(1, rgba(S.light, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 10, 0); g.lineTo(x + 14, 0); g.lineTo(x + 60, h); g.lineTo(x + 10, h); g.closePath(); g.fill(); }
      g.restore();
    },
  };

  function particles(g, w, h, S, rng) {
    const kind = S.parts, n = kind === 'snow' ? 90 : kind === 'embers' ? 60 : 50;
    for (let i = 0; i < n; i++) {
      const x = rng() * w, y = rng() * h, s = 0.6 + rng() * 1.8, a = 0.25 + rng() * 0.6;
      if (kind === 'embers') { g.fillStyle = 'rgba(255,' + (140 + (rng() * 90 | 0)) + ',60,' + a + ')'; g.fillRect(x, y, s, s * 2.2); }
      else if (kind === 'snow') { g.fillStyle = 'rgba(230,245,255,' + a + ')'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
      else if (kind === 'drips') { g.fillStyle = rgba(S.light, a * 0.6); g.fillRect(x, y, 1, 4 + s * 3); }
      else { g.fillStyle = rgba(kind === 'dust' ? [230, 200, 170] : kind === 'gold' ? [255, 230, 160] : S.light, a * 0.7); g.beginPath(); g.arc(x, y, s * (kind === 'spores' ? 1.2 : 0.9), 0, TAU); g.fill(); }
    }
  }

  /** Share of a sprite's border that is opaque: how badly its drawing runs past its box. */
  function clipped(cv) {
    const W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data; let n = 0;
    const op = (x, y) => d[(y * W + x) * 4 + 3] > 40;
    for (let x = 0; x < W; x++) { if (op(x, 0)) n++; if (op(x, H - 1)) n += 0.2; }
    for (let y = 0; y < H; y++) { if (op(0, y)) n++; if (op(W - 1, y)) n++; }
    return n / (W * 1.2 + H * 2);
  }
  /* the hall's Lord: a huge soft silhouette looming in the fog, a rim of the hall's light; it fades out towards its
   * edges so the sprite's box never shows */
  function lord(g, w, h, st, S) {
    const C = DH.content, G = DH.gfx;
    // of the hall's Lords, the one whose sprite is least cut off at its box (wide wings get clipped)
    let img = null, best = 1e9;
    for (const b of st.bosses.slice().reverse()) {
      const d = C.enemies[b.id], f = G.sprite(d.painter, d.variant || null).frames[0], cut = clipped(f);
      if (cut < best - 0.02) { best = cut; img = f; }
    }
    const bh = h * 0.7, k = bh / img.height, bw = img.width * k, pad = 12, x = w * 0.63 - bw / 2, y = h * 0.86 - bh;
    const sil = mk(Math.ceil(bw) + pad * 2, Math.ceil(bh) + pad * 2), sg = sil.getContext('2d');
    sg.imageSmoothingEnabled = true; sg.filter = 'blur(1.6px)'; sg.drawImage(img, pad, pad, bw, bh); sg.filter = 'none';
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = rgba(S.sil, 1); sg.fillRect(0, 0, sil.width, sil.height);
    const fade = (cv) => { // soften towards the box edges
      const fg = cv.getContext('2d'); fg.globalCompositeOperation = 'destination-in';
      const gx = fg.createLinearGradient(0, 0, cv.width, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.16, 'rgba(0,0,0,1)'); gx.addColorStop(0.84, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)');
      fg.fillStyle = gx; fg.fillRect(0, 0, cv.width, cv.height);
      const gy = fg.createLinearGradient(0, 0, 0, cv.height); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.14, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
      fg.fillStyle = gy; fg.fillRect(0, 0, cv.width, cv.height);
    };
    const rim = mk(sil.width, sil.height), rg = rim.getContext('2d');
    rg.drawImage(sil, 0, 0); rg.globalCompositeOperation = 'source-in'; rg.fillStyle = rgba(mix(S.light, [255, 255, 255], 0.25), 1); rg.fillRect(0, 0, rim.width, rim.height);
    fade(sil); fade(rim);
    glow(g, w * 0.63, y + bh * 0.42, bh * 0.8, S.light, 0.3);
    g.save(); g.globalAlpha = 0.55; g.drawImage(rim, x - pad - 2, y - pad - 3); g.drawImage(rim, x - pad + 2, y - pad - 2); g.restore();
    g.save(); g.shadowColor = rgba(S.light, 0.55); g.shadowBlur = 22; g.globalAlpha = 0.96; g.drawImage(sil, x - pad, y - pad); g.restore();
  }

  /** The key art of a hall at w x h pixels. */
  art.stageArt = function (stageId, w, h) {
    const st = DH.content.stages[stageId], S = SCENES[stageId] || SCENES.crypt, rng = U.seeded(97 + st.index * 13);
    const c = mk(w, h), g = c.getContext('2d');
    // the living hall: the pixel scene with its horde and Lord (the old thumbnail), crisp
    const tw = 256, th = Math.round(tw * h / w), base = art.stageThumb(stageId, tw, th);
    g.imageSmoothingEnabled = false; g.drawImage(base, 0, 0, w, h); g.imageSmoothingEnabled = true;
    // painted atmosphere over it: the hall's light around its Lord, fog, a frame of architecture, drifting particles
    g.save(); g.globalCompositeOperation = 'screen'; glow(g, w * 0.5, h * 0.5, h * 0.75, S.light, 0.35); g.restore();
    const tint = g.createLinearGradient(0, 0, 0, h); tint.addColorStop(0, rgba(S.top, 0.55)); tint.addColorStop(0.45, rgba(S.top, 0)); tint.addColorStop(1, rgba(S.bot, 0.25));
    g.fillStyle = tint; g.fillRect(0, 0, w, h);
    fogBand(g, w, h * 0.72, h * 0.2, S.fog, 0.16);
    const L = mk(w, h), lg = L.getContext('2d'); lg.fillStyle = lg.strokeStyle = rgba(S.sil, 1); ARCH[S.arch](lg, w, h, rng, 0);
    lg.globalCompositeOperation = 'destination-out'; // the architecture only frames the scene: clear its middle
    const m = lg.createLinearGradient(0, 0, w, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.12, 'rgba(0,0,0,0)'); m.addColorStop(0.24, 'rgba(0,0,0,1)'); m.addColorStop(0.82, 'rgba(0,0,0,1)'); m.addColorStop(0.92, 'rgba(0,0,0,0)');
    lg.fillStyle = m; lg.fillRect(0, 0, w, h);
    g.save(); g.globalAlpha = 0.92; g.drawImage(L, 0, 0); g.restore();
    g.save(); g.globalAlpha = 0.7; LIGHTS[S.lights](g, w, h, S, rng); g.restore();
    fogBand(g, w, h * 0.97, h * 0.1, S.fog, 0.18);
    particles(g, w, h, S, rng);
    const vg = g.createRadialGradient(w * 0.5, h * 0.45, h * 0.35, w * 0.5, h * 0.5, w * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
    return c;
  };
  art.stageScene = SCENES;
})(window.DH);
