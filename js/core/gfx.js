/* Graphics pipeline: detailed dark pixel art in the spirit of pre-rendered Diablo II
 * sprites. Vector painters are rasterized at CPX pixels per world unit, graded (key light, bevelled
 * edges), quantized to a gritty dungeon palette with ordered dithering and given hard 1px outlines.
 * The world is drawn into a low-res buffer and scaled up with nearest-neighbour (see view.js). */
(function (DH) {
  'use strict';
  const U = DH.util;

  /* ---------------- colour helpers ---------------- */
  const cc = {};
  function rgb(hex) {
    if (cc[hex]) return cc[hex];
    let v = hex.replace('#', '');
    if (v.length === 3) v = v.split('').map((c) => c + c).join('');
    return (cc[hex] = [parseInt(v.substr(0, 2), 16), parseInt(v.substr(2, 2), 16), parseInt(v.substr(4, 2), 16)]);
  }
  function hex(r, g, b) { return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join(''); }
  /** amt > 0 lightens toward white, < 0 darkens toward black */
  function shade(c, amt) {
    const [r, g, b] = rgb(c);
    if (amt >= 0) return hex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
    return hex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
  }
  function mix(a, b, t) { const A = rgb(a), B = rgb(b); return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  function rgba(c, a) { const [r, g, b] = rgb(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  /* ---------------- sprite cache ---------------- */
  const gfx = {
    CPX: 2, // sprite / buffer pixels per world unit
    rgb, hex, shade, mix, rgba, canvas,
    cache: {},
    painters: {},      // name -> { w, h, frames, draw(g, frame, col), colors, cx, cy }
    variants: {},      // variant name -> colour overrides (semantic keys)
    has(name) { return !!this.painters[name]; },
    /** Returns {frames, flash, w, h, ox, oy} where w/h/ox/oy are world units. */
    sprite(name, variant) {
      const key = name + '|' + (variant || '');
      return this.cache[key] || (this.cache[key] = this.paint(name, variant, this.CPX));
    },
    colors(name, variant) {
      const p = this.painters[name];
      return Object.assign({}, p.colors || {}, variant && this.variants[variant] ? this.variants[variant] : null, variant && p.variants && p.variants[variant] ? p.variants[variant] : null);
    },
    paint(name, variant, res) {
      const p = this.painters[name];
      if (!p) throw new Error('no painter ' + name);
      const col = this.colors(name, variant);
      const pad = 1.5;
      const W = p.w + pad * 2, H = p.h + pad * 2;
      const frames = [], flash = [];
      const nf = p.frames || 1;
      for (let f = 0; f < nf; f++) {
        const c = canvas(W * res, H * res), g = c.getContext('2d');
        g.scale(res, res); g.translate(pad, pad);
        g.lineJoin = 'round'; g.lineCap = 'round';
        p.draw(g, f, col, gfx.P);
        const out = p.soft ? c : classicize(c, p, res); // soft: keeps its translucency (ice, glass)
        frames.push(out);
        flash.push(whiten(out));
      }
      return { frames, flash, w: W, h: H, res, ox: pad + (p.cx == null ? p.w / 2 : p.cx), oy: pad + (p.cy == null ? p.h / 2 : p.cy) };
    },
    /** Horizontally mirrored copy of a frame (cached) — cheaper than save/scale/restore per draw. */
    flip(img) {
      if (img._flip) return img._flip;
      const c = canvas(img.width, img.height), g = c.getContext('2d');
      g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
      return (img._flip = c);
    },
    /** Tinted copy of a frame (frozen, poisoned, ...) cached per frame canvas. */
    /** A copy with a thin rim of `color` around the silhouette (px = rim width in canvas pixels), cached. */
    rim(img, color, px) {
      const key = color + px; img._rims = img._rims || {};
      if (img._rims[key]) return img._rims[key];
      const sil = this.tint(img, color), c = canvas(img.width, img.height), g = c.getContext('2d');
      for (const [dx, dy] of [[px, 0], [-px, 0], [0, px], [0, -px]]) g.drawImage(sil, dx, dy);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(img, 0, 0); // keep only the rim…
      g.globalCompositeOperation = 'source-over'; g.drawImage(img, 0, 0); // …then the sprite on top
      return (img._rims[key] = c);
    },
    tint(img, color) {
      img._tints = img._tints || {};
      if (img._tints[color]) return img._tints[color];
      const c = canvas(img.width, img.height), g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
      return (img._tints[color] = c);
    },
  };

  /* ---------------- classic: palette, grading, ordered dithering ---------------- */
  // Curated dark ramps (dark -> light), roughly a 256-colour-era dungeon palette.
  const RAMPS = [
    '#07050a',
    '#0d0c11 #1d1b23 #2f2c37 #45414f #605b6b #847f90 #aca8b8 #d8d4e0',       // cold stone
    '#120e0c #221a16 #362a23 #4c3d33 #665446 #85705e #a8927c #cdb9a0',       // warm stone
    '#1a0f09 #2e1a0e #472814 #63391c #804c27 #a06637 #c0854e',               // leather / wood
    '#3a3222 #5c5038 #807254 #a4957a #c7ba9d #e4dac0 #f6f0e0',               // bone / parchment
    '#3e2218 #633a2a #8a5540 #ad735a #cc957a #e6b89e',                       // flesh
    '#1c0406 #34080c #520c14 #74121c #981c26 #bc2c32 #de4a44 #f47a6a',       // blood
    '#3a1204 #6a2408 #a03c0c #d05a14 #f08020 #ffa840 #ffd070 #fff0b0',       // fire
    '#3a2a08 #5e4610 #86661a #ae8a28 #d4b040 #f0d468',                       // gold
    '#0c140a #172414 #243820 #34502c #486a3a #62884c #82a864 #aac888',       // moss
    '#1e2a08 #34480e #52701a #78982a #a4c040 #d4e870',                       // poison
    '#081a1c #0e2e32 #16484c #226a6c #3a9090 #62b8b0 #9ae0d4',               // teal
    '#0a0e1c #141c32 #1e2c4c #2c406a #3e5a8c #5a7cb0 #82a4d0 #b4ccec',       // steel / night blue
    '#1a3a5a #2a5e86 #4a8ab4 #78b8dc #aadcf2 #e0f6ff',                       // ice
    '#120a1c #22102e #361a48 #4e2666 #6a3688 #8a4cac #ae70cc #d4a0ec',       // arcane
    '#2e0a24 #521440 #7a2262 #a83a88 #d864b0 #f0a0d8',                       // magenta
    '#ffffff',
  ];
  const PAL = []; RAMPS.forEach((r) => r.split(' ').forEach((c) => PAL.push(rgb(c))));
  let LUT = null;
  function lut() {
    if (LUT) return LUT;
    LUT = new Uint32Array(32768);
    const n = PAL.length;
    for (let k = 0; k < 32768; k++) {
      const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const p = PAL[i], rm = (r + p[0]) / 2, dr = r - p[0], dg = g - p[1], db = b - p[2];
        const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
        if (d < bd) { bd = d; best = i; }
      }
      const p = PAL[best]; LUT[k] = p[0] | (p[1] << 8) | (p[2] << 16);
    }
    return LUT;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47);
  /** Grade (desaturate + contrast) and quantize an ImageData in place with 4x4 Bayer dithering + grain. */
  function quantize(id, o) {
    const d = id.data, W = id.width, H = id.height, L = lut();
    const amp = o.dither == null ? 16 : o.dither, grit = o.grit || 0, sat = o.sat == null ? 0.85 : o.sat, con = o.contrast || 1.08, lift = o.lift || 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4; if (d[i + 3] === 0) continue;
      let r = d[i], g = d[i + 1], b = d[i + 2];
      const l = r * 0.3 + g * 0.59 + b * 0.11;
      r = l + (r - l) * sat; g = l + (g - l) * sat; b = l + (b - l) * sat;
      r = (r - 118) * con + 118 + lift; g = (g - 118) * con + 118 + lift; b = (b - 118) * con + 118 + lift;
      let n = BAYER[(y & 3) * 4 + (x & 3)] * amp;
      if (grit) { let h = (x * 374761393 + y * 668265263 + (o.seed | 0)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); n += (((h ^ (h >>> 16)) & 255) / 255 - 0.5) * grit; }
      r += n; g += n; b += n;
      r = r < 0 ? 0 : r > 255 ? 255 : r; g = g < 0 ? 0 : g > 255 ? 255 : g; b = b < 0 ? 0 : b > 255 ? 255 : b;
      const c = L[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
      d[i] = c & 255; d[i + 1] = (c >> 8) & 255; d[i + 2] = (c >> 16) & 255;
    }
    return id;
  }
  gfx.quantize = quantize; gfx.PAL = PAL;
  /** Classic sprite post-process: hard alpha, graded palette, crisp dark outline and a light rim on top edges. */
  function classicize(src, p, res) {
    const W = src.width, H = src.height, g = src.getContext('2d');
    const id = g.getImageData(0, 0, W, H), d = id.data, solid = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { if (d[i * 4 + 3] > 120) { d[i * 4 + 3] = 255; solid[i] = 1; } else d[i * 4 + 3] = 0; }
    // pre-rendered look: key light from the top-left, darker feet, bevelled silhouette edges, slightly crushed midtones
    const px = Math.max(1, Math.round(res || gfx.CPX));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!solid[i]) continue;
      let k = 1.1 - 0.32 * (y / H);
      const tl = (x < px || y < px || !solid[i - px] || !solid[i - px * W]);
      const br = (x >= W - px || y >= H - px || !solid[i + px] || !solid[i + px * W]);
      if (tl && !br) k *= 1.22; else if (br && !tl) k *= 0.7;
      const j = i * 4;
      for (let c = 0; c < 3; c++) { const v = d[j + c] / 255; d[j + c] = Math.min(255, 255 * Math.pow(v, 1.12) * k); }
    }
    quantize(id, { dither: p && p.dither != null ? p.dither : 16, grit: 12, sat: p && p.sat != null ? p.sat : 0.78, contrast: 1.12, seed: W * 31 + H });
    const O = rgb((p && p.colors && p.colors.outline) || '#0b0710');
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < W - 1 && solid[i + 1]) || (y > 0 && solid[i - W]) || (y < H - 1 && solid[i + W])) {
        const j = i * 4; d[j] = O[0]; d[j + 1] = O[1]; d[j + 2] = O[2]; d[j + 3] = 255;
      }
    }
    g.putImageData(id, 0, 0);
    return src;
  }
  gfx.classicize = classicize;
  function whiten(src) {
    const c = canvas(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  /* ---------------- painting primitives (world units) ---------------- */
  const P = {
    path(g, pts, close) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); if (close !== false) g.closePath(); },
    fill(g, style) { g.fillStyle = style; g.fill(); },
    stroke(g, style, w) { g.strokeStyle = style; g.lineWidth = w; g.stroke(); },
    circle(g, x, y, r, style) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = style; g.fill(); },
    ell(g, x, y, rx, ry, style, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); g.fillStyle = style; g.fill(); },
    rect(g, x, y, w, h, style) { g.fillStyle = style; g.fillRect(x, y, w, h); },
    rrect(g, x, y, w, h, r, style) {
      g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      if (style) { g.fillStyle = style; g.fill(); }
    },
    line(g, x1, y1, x2, y2, w, style) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = style; g.lineWidth = w; g.stroke(); },
    lg(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); return gr; },
    rg(g, x, y, r, stops, fx, fy) { const gr = g.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, 0, x, y, r); stops.forEach((s, i) => gr.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); return gr; },
    /** Round "volume" fill: light from top-left. */
    vol(g, x, y, r, base) { return P.rg(g, x, y, r, [[0, shade(base, 0.35)], [0.55, base], [1, shade(base, -0.45)]], x - r * 0.35, y - r * 0.4); },
    glow(g, x, y, r, color, a) { g.save(); g.globalCompositeOperation = 'lighter'; P.circle(g, x, y, r, P.rg(g, x, y, r, [[0, rgba(color, a == null ? 0.9 : a)], [1, rgba(color, 0)]])); g.restore(); },
    eye(g, x, y, r, color) { P.glow(g, x, y, r * 2.6, color, 0.55); P.circle(g, x, y, r, color); P.circle(g, x - r * 0.3, y - r * 0.3, r * 0.4, '#ffffff'); },
    bone(g, x1, y1, x2, y2, w, col) {
      P.line(g, x1, y1, x2, y2, w, P.lg(g, x1, y1 - w, x1, y1 + w, [shade(col, 0.2), shade(col, -0.25)]));
      P.circle(g, x1, y1, w * 0.75, col); P.circle(g, x2, y2, w * 0.75, col);
    },
  };
  gfx.P = P;

  /* ---------------- procedural floor (256-unit chunks, cached) ---------------- */
  const CHUNK = 256;
  function Floor(theme, seed, res) { this.theme = theme; this.seed = seed || 1; this.res = res; this.chunks = new Map(); }
  Floor.prototype.chunk = function (cx, cy) {
    const key = cx + ',' + cy; let ch = this.chunks.get(key);
    if (ch) { ch.used = performance.now(); return ch; }
    ch = this.build(cx, cy); this.chunks.set(key, ch);
    if (this.chunks.size > 20) { let ok = null, ot = Infinity; this.chunks.forEach((v, k) => { if (v.used < ot) { ot = v.used; ok = k; } }); this.chunks.delete(ok); }
    return ch;
  };
  Floor.prototype.build = function (cx, cy) {
    const T = this.theme, R = this.res, S = CHUNK * R;
    const c = canvas(S, S), g = c.getContext('2d');
    const rng = U.seeded(U.strSeed(cx + '/' + cy + '/' + this.seed));
    const A = hex.apply(null, T.floorA), B = hex.apply(null, T.floorB), M = hex.apply(null, T.mortar);
    g.fillStyle = M; g.fillRect(0, 0, S, S);
    g.save(); g.scale(R, R);
    // flagstones on a 32-unit grid, randomly split into halves; running bond on odd rows
    const TS = 32;
    for (let ty = -1; ty <= CHUNK / TS; ty++) {
      const off = (ty & 1) ? TS / 2 : 0;
      for (let tx = -1; tx <= CHUNK / TS; tx++) {
        const gx = cx * 8 + tx, gy = cy * 8 + ty;
        const h1 = U.hash2(gx, gy, this.seed), split = U.hash2(gx, gy, this.seed + 9);
        const x0 = tx * TS + off, y0 = ty * TS;
        const slabs = split < 0.35 ? [[x0, y0, TS, TS / 2], [x0, y0 + TS / 2, TS, TS / 2]] : split < 0.6 ? [[x0, y0, TS / 2, TS], [x0 + TS / 2, y0, TS / 2, TS]] : [[x0, y0, TS, TS]];
        slabs.forEach((s, si) => {
          const hv = U.hash2(gx * 3 + si, gy * 5, this.seed + 1);
          const base = mix(hv < 0.5 ? A : B, T.tint || A, 0.1 * U.hash2(gx, gy + si, 4));
          const k = 0.86 + hv * 0.22;
          const col = shade(base, k - 1);
          const gap = 0.9;
          const x = s[0] + gap, y = s[1] + gap, w = s[2] - gap * 2, h = s[3] - gap * 2;
          P.rrect(g, x, y, w, h, 2.2, P.lg(g, x, y, x + w * 0.4, y + h, [shade(col, 0.12), col, shade(col, -0.18)]));
          // bevel highlight / shadow
          g.strokeStyle = rgba(shade(col, 0.35), 0.35); g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(x + 1.5, y + h - 1); g.lineTo(x + 0.6, y + 0.6); g.lineTo(x + w - 1.5, y + 0.6); g.stroke();
          g.strokeStyle = rgba('#000000', 0.3);
          g.beginPath(); g.moveTo(x + w - 0.5, y + 1.5); g.lineTo(x + w - 0.5, y + h - 0.5); g.lineTo(x + 1.5, y + h - 0.5); g.stroke();
          // pits and speckles
          const n = 5 + (rng() * 8 | 0);
          for (let i = 0; i < n; i++) {
            const px = x + 2 + rng() * (w - 4), py = y + 2 + rng() * (h - 4), pr = 0.3 + rng() * 0.9;
            P.circle(g, px, py, pr, rgba(rng() < 0.5 ? '#000000' : '#ffffff', rng() < 0.5 ? 0.14 : 0.06));
          }
          // cracks
          if (U.hash2(gx + si, gy, this.seed + 3) < 0.18) {
            g.strokeStyle = rgba('#000000', 0.45); g.lineWidth = 0.55; g.beginPath();
            let px = x + rng() * w, py = y + 1; g.moveTo(px, py);
            for (let s2 = 0; s2 < 6; s2++) { px += (rng() - 0.5) * 7; py += h / 6; g.lineTo(U.clamp(px, x + 1, x + w - 1), Math.min(py, y + h - 1)); }
            g.stroke();
          }
          // theme accent patches (moss / frost / embers / slime / gilding)
          if (U.hash2(gx - si, gy + 7, this.seed + 5) < (T.accentRate || 0.12)) {
            const ax = x + rng() * w, ay = y + rng() * h, ar = 3 + rng() * 6;
            const grd = P.rg(g, ax, ay, ar, [[0, rgba(hex.apply(null, T.moss), 0.65)], [1, rgba(hex.apply(null, T.moss), 0)]]);
            g.fillStyle = grd; g.beginPath(); g.ellipse(ax, ay, ar * 1.4, ar, rng() * 3, 0, Math.PI * 2); g.fill();
            for (let i = 0; i < 6; i++) P.circle(g, ax + (rng() - 0.5) * ar * 2, ay + (rng() - 0.5) * ar, 0.5 + rng() * 0.6, rgba(shade(hex.apply(null, T.moss), 0.2), 0.7));
          }
        });
      }
    }
    // large stains and puddles
    for (let i = 0; i < 3; i++) {
      const x = rng() * CHUNK, y = rng() * CHUNK, r = 25 + rng() * 55;
      g.fillStyle = P.rg(g, x, y, r, [[0, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (T.pools && rng() < 0.6) {
      const x = 30 + rng() * (CHUNK - 60), y = 30 + rng() * (CHUNK - 60), rx = 12 + rng() * 18, ry = rx * 0.55;
      const pc = hex.apply(null, T.pools);
      P.ell(g, x, y, rx, ry, P.lg(g, x, y - ry, x, y + ry, [shade(pc, 0.2), pc, shade(pc, -0.3)]));
      g.strokeStyle = rgba(shade(pc, 0.5), 0.35); g.lineWidth = 0.6; g.beginPath(); g.ellipse(x - rx * 0.2, y - ry * 0.3, rx * 0.5, ry * 0.3, 0, Math.PI, Math.PI * 1.8); g.stroke();
    }
    const lights = [];
    // decals
    const nDec = 7 + (rng() * 8 | 0);
    for (let i = 0; i < nDec; i++) {
      const x = 8 + rng() * (CHUNK - 16), y = 8 + rng() * (CHUNK - 16), r = rng();
      if (r < 0.25) {
        const bc = T.blood || '#6a0a14';
        for (let j = 0; j < 8; j++) P.ell(g, x + (rng() - 0.5) * 14, y + (rng() - 0.5) * 8, 1 + rng() * 5, 0.8 + rng() * 3, rgba(bc, 0.35 + rng() * 0.3), rng() * 3);
      } else if (r < 0.45) drawDecal(g, 'bones', x, y, rng);
      else if (r < 0.57) drawDecal(g, 'skull', x, y, rng);
      else if (r < 0.8) { for (let j = 0; j < 6; j++) { const rx = x + rng() * 12, ry = y + rng() * 7, rr = 0.6 + rng() * 1.6; P.circle(g, rx, ry, rr, P.vol(g, rx, ry, rr, shade(A, -0.1))); } }
      else if (r < 0.9 && T.crystals) { drawDecal(g, 'crystal', x, y, rng, hex.apply(null, T.crystals)); lights.push({ x: cx * CHUNK + x, y: cy * CHUNK + y - 3, r: 22, kind: 'crystal', color: hex.apply(null, T.crystals) }); }
      else { drawDecal(g, 'candle', x, y, rng); lights.push({ x: cx * CHUNK + x, y: cy * CHUNK + y - 5, r: 26, kind: 'candle' }); }
    }
    // set dressing: rubble, cobwebs, grates, tomb slabs, rune circles, broken columns
    const nSet = 2 + (rng() * 3 | 0);
    for (let i = 0; i < nSet; i++) {
      const x = 20 + rng() * (CHUNK - 40), y = 20 + rng() * (CHUNK - 40), r = rng();
      if (r < 0.28) drawDecal(g, 'rubble', x, y, rng, A);
      else if (r < 0.44) drawDecal(g, 'cobweb', Math.round(x / 32) * 32 + 1, Math.round(y / 32) * 32 + 1, rng);
      else if (r < 0.58) drawDecal(g, 'grate', x, y, rng);
      else if (r < 0.72) drawDecal(g, 'slab', x, y, rng, A);
      else if (r < 0.84) { drawDecal(g, 'rune', x, y, rng, T.accent || '#e8a050'); lights.push({ x: cx * CHUNK + x, y: cy * CHUNK + y, r: 20, kind: 'crystal', color: T.accent || '#e8a050' }); }
      else drawDecal(g, 'column', x, y, rng, A);
    }
    if (T.lava && rng() < 0.55) {
      g.strokeStyle = '#ff7a20'; g.lineWidth = 1.1; g.shadowColor = '#ff5a10'; g.shadowBlur = 6 * R;
      g.beginPath(); let px = rng() * CHUNK, py = rng() * CHUNK; g.moveTo(px, py);
      for (let s2 = 0; s2 < 10; s2++) { px += (rng() - 0.3) * 18; py += (rng() - 0.5) * 18; g.lineTo(px, py); }
      g.stroke(); g.shadowBlur = 0;
      lights.push({ x: cx * CHUNK + px, y: cy * CHUNK + py, r: 40, kind: 'lava' });
    }
    if (rng() < 0.55) {
      const bx = 32 + rng() * (CHUNK - 64), by = 32 + rng() * (CHUNK - 64);
      P.ell(g, bx, by + 7, 7, 2.6, 'rgba(0,0,0,0.45)');
      drawDecal(g, 'brazier', bx, by, rng);
      lights.push({ x: cx * CHUNK + bx, y: cy * CHUNK + by - 4, r: 72, kind: 'brazier' });
    }
    g.restore();
    { const id = g.getImageData(0, 0, S, S); quantize(id, { dither: 18, grit: 16, sat: 0.8, contrast: 1.12, seed: cx * 7919 + cy * 104729 }); g.putImageData(id, 0, 0); }
    return { canvas: c, lights, used: performance.now(), res: R };
  };

  function drawDecal(g, kind, x, y, rng, color) {
    if (kind === 'bones') {
      const col = '#d8cba8';
      for (let i = 0; i < 3; i++) { const a = rng() * Math.PI, l = 3 + rng() * 3, bx = x + (rng() - 0.5) * 6, by = y + (rng() - 0.5) * 4; P.bone(g, bx - Math.cos(a) * l, by - Math.sin(a) * l * 0.5, bx + Math.cos(a) * l, by + Math.sin(a) * l * 0.5, 0.9, col); }
    } else if (kind === 'skull') {
      P.ell(g, x, y + 2.6, 3.6, 1.2, 'rgba(0,0,0,0.35)');
      P.circle(g, x, y, 2.8, P.vol(g, x, y, 2.8, '#e2d6b4'));
      P.rrect(g, x - 1.6, y + 1.2, 3.2, 1.8, 0.6, '#cbbd98');
      P.circle(g, x - 1, y - 0.1, 0.75, '#1a1010'); P.circle(g, x + 1, y - 0.1, 0.75, '#1a1010');
    } else if (kind === 'candle') {
      P.ell(g, x, y + 0.8, 2.6, 1, 'rgba(0,0,0,0.4)');
      P.rrect(g, x - 1, y - 4, 2, 5, 0.6, P.lg(g, x - 1, 0, x + 1, 0, ['#fff4dc', '#d8c7a0']));
      P.ell(g, x, y + 0.6, 1.8, 0.7, '#e8dcc0');
      P.line(g, x, y - 4, x, y - 4.8, 0.3, '#2a1a10');
    } else if (kind === 'crystal') {
      for (let i = 0; i < 3; i++) {
        const cx2 = x + (i - 1) * 2.2, h = 4 + rng() * 4;
        P.path(g, [cx2 - 1.2, y, cx2, y - h, cx2 + 1.2, y]); P.fill(g, P.lg(g, cx2 - 1, 0, cx2 + 1, 0, [shade(color, 0.5), color, shade(color, -0.4)]));
      }
    } else if (kind === 'rubble') {
      for (let i = 0; i < 9; i++) {
        const rx = x + (rng() - 0.5) * 16, ry = y + (rng() - 0.5) * 9, rr = 0.8 + rng() * 2.4, c = shade(color || '#5a5464', (rng() - 0.5) * 0.3);
        P.ell(g, rx + 0.6, ry + rr * 0.6, rr * 1.1, rr * 0.5, 'rgba(0,0,0,0.35)');
        P.path(g, [rx - rr, ry, rx - rr * 0.3, ry - rr * 0.9, rx + rr * 0.8, ry - rr * 0.5, rx + rr, ry + rr * 0.4, rx, ry + rr * 0.6]);
        P.fill(g, P.lg(g, rx - rr, ry - rr, rx + rr, ry + rr, [shade(c, 0.3), c, shade(c, -0.4)]));
      }
    } else if (kind === 'cobweb') {
      g.strokeStyle = 'rgba(220,220,230,0.28)'; g.lineWidth = 0.4;
      const L = 12 + rng() * 8;
      for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
      for (let k = 1; k <= 4; k++) { const rr = L * k / 4.5; g.beginPath(); for (let i = 0; i <= 4; i++) { const a = i / 4 * Math.PI / 2, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i) g.quadraticCurveTo(x + Math.cos(a - 0.2) * rr * 0.8, y + Math.sin(a - 0.2) * rr * 0.8, px, py); else g.moveTo(px, py); } g.stroke(); }
    } else if (kind === 'grate') {
      P.rrect(g, x - 8, y - 6, 16, 12, 1, '#16121a');
      P.rrect(g, x - 7, y - 5, 14, 10, 0.5, '#050308');
      for (let i = 0; i < 5; i++) P.rect(g, x - 6.5 + i * 3, y - 5, 1.2, 10, '#4a4452');
      P.rect(g, x - 7, y - 0.6, 14, 1.2, '#3a3440');
      g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.5; g.strokeRect(x - 8, y - 6, 16, 12);
    } else if (kind === 'slab') {
      const c = shade(color || '#5a5464', 0.08);
      P.rrect(g, x - 8, y - 13, 16, 26, 2, 'rgba(0,0,0,0.45)');
      P.rrect(g, x - 7, y - 12, 14, 24, 2, P.lg(g, x - 7, y - 12, x + 7, y + 12, [shade(c, 0.25), c, shade(c, -0.35)]));
      P.rrect(g, x - 1, y - 8, 2, 12, 0.4, shade(c, -0.45)); P.rrect(g, x - 4, y - 5, 8, 2, 0.4, shade(c, -0.45));
      if (rng() < 0.6) { g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 7, y + 3); g.lineTo(x - 2, y + 5); g.lineTo(x + 1, y + 9); g.lineTo(x + 7, y + 10); g.stroke(); }
    } else if (kind === 'rune') {
      g.strokeStyle = rgba(color, 0.5); g.lineWidth = 0.7;
      g.beginPath(); g.ellipse(x, y, 13, 7, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(x, y, 9, 4.8, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const px = x + Math.cos(a) * 9, py = y + Math.sin(a) * 4.8; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.closePath(); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.rect(g, x + Math.cos(a) * 11 - 0.6, y + Math.sin(a) * 5.9 - 0.6, 1.2, 1.2, rgba(color, 0.7)); }
    } else if (kind === 'column') {
      const c = color || '#5a5464';
      P.ell(g, x + 2, y + 5, 11, 4, 'rgba(0,0,0,0.5)');
      P.rrect(g, x - 9, y - 1, 18, 6, 1, P.lg(g, x - 9, 0, x + 9, 0, [shade(c, 0.2), shade(c, -0.1), shade(c, -0.45)]));
      P.rrect(g, x - 7, y - 10, 14, 10, 1, P.lg(g, x - 7, 0, x + 7, 0, [shade(c, 0.35), c, shade(c, -0.5)]));
      for (let i = -1; i <= 1; i++) P.line(g, x + i * 3.6, y - 9, x + i * 3.6, y - 1, 0.6, shade(c, -0.35));
      P.path(g, [x - 7, y - 10, x - 4, y - 13, x - 1, y - 10.5, x + 2, y - 14, x + 7, y - 10]); P.fill(g, shade(c, 0.15));
      for (let i = 0; i < 4; i++) { const rx = x + 8 + rng() * 8, ry = y + 2 + rng() * 5, rr = 0.8 + rng() * 1.6; P.circle(g, rx, ry, rr, P.vol(g, rx, ry, rr, c)); }
    } else if (kind === 'brazier') {
      P.line(g, x - 3, y + 7, x, y + 1, 0.9, '#3a3440'); P.line(g, x + 3, y + 7, x, y + 1, 0.9, '#3a3440'); P.line(g, x, y + 7, x, y + 1, 0.9, '#4c4654');
      P.path(g, [x - 5, y - 2, x + 5, y - 2, x + 3, y + 1.5, x - 3, y + 1.5]); P.fill(g, P.lg(g, x - 5, 0, x + 5, 0, ['#5a5464', '#9a94a6', '#4a4454']));
      P.ell(g, x, y - 2, 5, 1.2, '#221a14'); P.ell(g, x, y - 2.2, 3.8, 0.8, '#ff8a2a');
    }
  }
  gfx.drawDecal = drawDecal;
  gfx.Floor = Floor;
  gfx.CHUNK = CHUNK;
  gfx.floor = function (theme, seed) { return new Floor(theme, seed, this.CPX); };

  DH.gfx = gfx;
})(window.DH);
