/* Atmosphere and spell VFX (mixed into DH.Run.prototype):
 *   - projected silhouette shadows cast away from nearby braziers / candles / crystals (Diablo II style)
 *   - drifting ground fog and per-hall ambient particles (dust, embers, drips, snow, arcane motes, spores, gold dust)
 *   - light shafts falling from cracks in the ceiling, with dust dancing inside them
 *   - glowing (additive) particles: spell trails, elemental hit sparks, level-up pillar, elite auras
 *   - flickering torchlight on the hero
 * Everything is cosmetic; the Battery saver setting (lowFx) thins it out. */
(function (DH) {
  'use strict';
  const U = DH.util, A = DH.art, G = DH.gfx;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  /* ---------------- per-hall atmosphere ---------------- */
  // fog: rgb + alpha; motes: kind, colour(s), density per screen, glow (drawn additively after lighting)
  const ATMO = {
    crypt:      { fog: [70, 60, 90, 0.16], mote: 'dust', cols: ['#b8b0c8', '#8a8298'], n: 26, glow: false },
    abyss:      { fog: [120, 30, 16, 0.14], mote: 'ember', cols: ['#ff8a30', '#ffc050', '#ff5020'], n: 34, glow: true },
    aqueduct:   { fog: [40, 90, 96, 0.2], mote: 'drip', cols: ['#9ae8e0', '#60b8c0'], n: 18, glow: false },
    catacombs:  { fog: [110, 140, 180, 0.18], mote: 'snow', cols: ['#f0f8ff', '#c8e4ff'], n: 40, glow: false },
    discord:    { fog: [90, 40, 120, 0.18], mote: 'arcane', cols: ['#e080ff', '#b060ff', '#ffb0ff'], n: 26, glow: true },
    blightmire: { fog: [70, 96, 30, 0.2], mote: 'spore', cols: ['#b0ff50', '#80d040', '#e0ff90'], n: 28, glow: true },
    reliquary:  { fog: [140, 120, 70, 0.14], mote: 'gold', cols: ['#fff0a0', '#ffd35a', '#ffffff'], n: 24, glow: true },
  };
  const ELEM = { fire: '#ff8a30', ice: '#a8e8ff', lightning: '#fff4a0', magic: '#d890ff', physical: '#f0e6d0', summon: '#9affc0' };
  function elemColor(tags) {
    if (!tags) return ELEM.physical;
    for (const k of ['fire', 'ice', 'lightning', 'magic', 'summon']) if (tags.includes(k)) return ELEM[k];
    return ELEM.physical;
  }
  R.elemColor = elemColor;

  /* ---------------- fog texture (tileable value noise, soft alpha) ---------------- */
  let fogTex = null;
  function fogTexture() {
    if (fogTex) return fogTex;
    const N = 128, c = G.canvas(N, N), g = c.getContext('2d'), id = g.createImageData(N, N), d = id.data, rng = U.seeded(1234);
    const oct = [[8, 0.55], [16, 0.3], [32, 0.15]].map(([cells, amp]) => { const L = []; for (let i = 0; i < cells * cells; i++) L.push(rng()); return { cells, amp, L }; });
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0;
      for (const o of oct) {
        const fx = x / N * o.cells, fy = y / N * o.cells, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const at = (a, b) => o.L[((b % o.cells + o.cells) % o.cells) * o.cells + ((a % o.cells + o.cells) % o.cells)];
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        v += ((at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) + (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy) * o.amp;
      }
      const i = (y * N + x) * 4, a = Math.max(0, Math.min(1, (v - 0.35) * 2.2));
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = a * 255;
    }
    g.putImageData(id, 0, 0);
    return (fogTex = c);
  }
  const fogTint = {};
  function tintedFog(rgb) {
    const key = rgb.join(',');
    if (fogTint[key]) return fogTint[key];
    const src = fogTexture(), c = G.canvas(src.width, src.height), g = c.getContext('2d');
    g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(' + key + ')'; g.fillRect(0, 0, c.width, c.height);
    return (fogTint[key] = c);
  }

  /* ---------------- per-frame update of ambient particles ---------------- */
  R.vfxAtmo = function () { return ATMO[this.stageId] || ATMO.crypt; };
  R.updateVfx = function (dt) {
    const at = this.vfxAtmo(), V = DH.view, p = this.player, W = V.w, H = V.h;
    const want = Math.round(at.n * (W * H) / (270 * 480) * (this.settings.lowFx ? 0.4 : 1));
    this.atmo = this.atmo || [];
    const list = this.atmo, left = p.x - W / 2 - 20, top = p.y - H / 2 - 20;
    while (list.length < want) {
      const m = { x: left + Math.random() * (W + 40), y: top + Math.random() * (H + 40), t: 0, life: U.rand(4, 9), ph: Math.random() * TAU, c: U.pick(at.cols), s: Math.random() < 0.25 ? 1.5 : 1 };
      if (at.mote === 'ember') { m.vx = U.rand(-6, 6); m.vy = U.rand(-22, -8); }
      else if (at.mote === 'snow') { m.vx = U.rand(4, 12); m.vy = U.rand(10, 20); }
      else if (at.mote === 'drip') { m.vx = 0; m.vy = 0; m.fall = U.rand(18, 34); m.life = U.rand(1.2, 2.6); m.drop = 0; }
      else if (at.mote === 'spore') { m.vx = U.rand(-3, 3); m.vy = U.rand(-7, -2); }
      else { m.vx = U.rand(-4, 4); m.vy = U.rand(-4, 3); }
      list.push(m);
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i]; m.t += dt;
      if (at.mote === 'drip') { m.drop = Math.min(1, m.drop + dt / (m.life * 0.8)); }
      else { m.x += (m.vx + Math.sin(m.t * 1.3 + m.ph) * (at.mote === 'arcane' ? 10 : 3)) * dt; m.y += m.vy * dt; }
      const out = m.x < left - 40 || m.x > left + W + 80 || m.y < top - 40 || m.y > top + H + 80;
      if (m.t > m.life || out) list.splice(i, 1);
    }
  };

  /* ---------------- light shafts: deterministic per 150-unit cell of the world ---------------- */
  const SHAFT = 150;
  R.vfxShafts = function (cx, cy, W, H, lights) {
    const out = [];
    for (let gy = Math.floor((cy - 60) / SHAFT); gy <= Math.floor((cy + H + 60) / SHAFT); gy++) for (let gx = Math.floor((cx - 60) / SHAFT); gx <= Math.floor((cx + W + 60) / SHAFT); gx++) {
      if (U.hash2(gx, gy, 77) > 0.2) continue;
      const x = (gx + 0.2 + U.hash2(gx, gy, 5) * 0.6) * SHAFT, y = (gy + 0.2 + U.hash2(gx, gy, 9) * 0.6) * SHAFT, w = 14 + U.hash2(gx, gy, 3) * 16;
      out.push({ x, y, w, ph: U.hash2(gx, gy, 11) * TAU });
      lights.push({ x, y, r: w * 1.6, kind: 'shaft' });
    }
    this._shafts = out;
  };

  /* ---------------- projected shadows ---------------- */
  const SHADOW_LIGHTS = { brazier: 1, candle: 0.55, crystal: 0.6, lava: 0.7, torch: 1 };
  const silhouetteCache = new WeakMap();
  function silhouette(img) {
    let s = silhouetteCache.get(img);
    if (!s) { s = G.canvas(img.width, img.height); const g = s.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, s.width, s.height); silhouetteCache.set(img, s); }
    return s;
  }
  /** Sprites lean away from the nearest static light: a flattened, skewed black silhouette anchored at the feet. */
  const MAX_SHADOWS = 40;
  R.renderCastShadows = function (g, ents, lights, cx, cy) {
    if (this.settings.lowFx) return;
    const L = lights.filter((l) => SHADOW_LIGHTS[l.kind] || l.cast);
    // moving light: a lightning strike throws hard shadows for an instant, an explosion while it burns
    for (const f of this.fx) {
      const k = 1 - f.life / f.max;
      if (f.k === 'bolt' && k < 0.35) L.push({ x: f.x, y: f.y, cast: 1.2 * (1 - k / 0.35), range: 200, flash: true });
      else if (f.k === 'explosion' && k < 0.7) L.push({ x: f.x, y: f.y, cast: 0.9 * (1 - k), range: Math.max(90, f.R * 3) });
    }
    if (!L.length) return;
    const p = this.player;
    const cap = L.some((l) => l.flash) ? 20 : MAX_SHADOWS; // a lightning flash throws the nearest shadows only
    if (ents.length > cap) { // only the ones nearest the hero
      ents = ents.slice().sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2)).slice(0, cap);
    }
    for (const e of ents) {
      let best = null, bd = Infinity, bw = 0;
      for (const l of L) { const rg = l.range || 130, d = (l.x - e.x) * (l.x - e.x) + (l.y - e.y) * (l.y - e.y); if (d >= rg * rg) continue; const wgt = (l.cast || SHADOW_LIGHTS[l.kind]) * (1 - Math.sqrt(d) / rg); if (wgt > bw) { bw = wgt; bd = d; best = l; } }
      if (!best) continue;
      let name, variant = null, frame = 0, scale = 1, face = 1;
      if (e === p) { name = this.hero.painter || this.heroId; face = p.face; frame = p.moving ? Math.floor(p.anim / 1.6) % 2 : 0; }
      else if (e.kind) { if (e.kind === 'spirit') continue; name = e.kind === 'golem' ? 'golem' : e.kind === 'phantom' ? 'hknight' : e.kind === 'imp' ? 'imp' : 'wolf'; variant = e.kind === 'golem' ? 'bone' : e.kind === 'phantom' ? 'ice' : e.kind === 'wolf' ? 'ice' : null; face = e.face || 1; }
      else { if (e.def.fly || e.def.prop) continue; name = e.painter; variant = e.variant; scale = e.scale; face = e.face; frame = e.def.anim ? Math.floor(e.anim / (e.def.anim || 0.22)) % 2 : 0; }
      if (!G.painters[name]) continue;
      const s = G.sprite(name, variant), img = s.frames[frame % s.frames.length];
      const dx = e.x - best.x, dy = e.y - best.y, d = Math.sqrt(bd) || 1, dirX = dx / d, dirY = dy / d;
      const rg = best.range || 130, k = (best.cast || SHADOW_LIGHTS[best.kind]) * Math.min(1, 1.3 * (1 - d / rg)), len = Math.min(1.3, 0.6 + d / 90);
      const w = s.w * scale, h = s.h * scale, top = e.y - s.oy * scale, feet = top + h - 1.5 * scale;
      // project the sprite onto the floor: its "up" axis maps to the direction away from the light, flattened
      let sy = -dirY * len * 0.75; if (Math.abs(sy) < 0.38) sy = sy > 0 ? 0.38 : -0.38;
      g.save();
      g.globalAlpha = Math.min(0.6, 0.75 * k);
      g.translate(e.x - cx, feet - cy);
      g.transform(1, 0, -dirX * len, sy, 0, 0);
      g.drawImage(silhouette(face < 0 ? G.flip(img) : img), -(face < 0 ? s.w - s.ox : s.ox) * scale, -(h - 1.5 * scale), w, h);
      g.restore();
    }
    g.globalAlpha = 1;
  };

  /* ---------------- fog (below lighting) ---------------- */
  // fog is composed at quarter resolution (1 px per 4 world units) and blitted once, smoothly
  let fogCv = null;
  R.renderFog = function (g, cx, cy, W, H) {
    if (this.settings.lowFx) return;
    const at = this.vfxAtmo(), tex = tintedFog(at.fog.slice(0, 3)), T = 256, now = this.time, Q = 4;
    const fw = Math.ceil(W / Q) + 1, fh = Math.ceil(H / Q) + 1;
    if (!fogCv) fogCv = G.canvas(fw, fh);
    if (fogCv.width !== fw || fogCv.height !== fh) { fogCv.width = fw; fogCv.height = fh; }
    const f = fogCv.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, fw, fh); f.imageSmoothingEnabled = true;
    [[0.6, 7, 3, 1], [0.4, -11, 5, 1.6]].forEach(([a, vx, vy, sc]) => {
      const size = T * sc, ox = ((cx * 0.9 - now * vx) % size + size) % size, oy = ((cy * 0.9 - now * vy) % size + size) % size;
      f.globalAlpha = a * (0.85 + Math.sin(now * 0.3 + sc) * 0.15);
      for (let y = -oy; y < H; y += size) for (let x = -ox; x < W; x += size) f.drawImage(tex, x / Q, y / Q, size / Q, size / Q);
    });
    g.save(); g.imageSmoothingEnabled = true; g.globalAlpha = at.fog[3];
    g.drawImage(fogCv, 0, 0, fw * Q, fh * Q);
    g.restore();
  };

  /* ---------------- after lighting: shafts, glowing motes and particles, torch flicker ---------------- */
  R.renderVfxFront = function (g, cx, cy, W, H) {
    const at = this.vfxAtmo(), now = this.time, rd = this.rd, T = this.stage.theme;
    g.save();
    // light shafts from the ceiling
    if (this._shafts && !this.settings.lowFx) {
      g.globalCompositeOperation = 'lighter';
      for (const s of this._shafts) {
        const x = s.x - cx, y = s.y - cy, a = 0.07 + Math.sin(now * 0.7 + s.ph) * 0.025;
        const grd = g.createLinearGradient(x - 60, y - 140, x, y);
        grd.addColorStop(0, T.lightTint + '0)'); grd.addColorStop(1, T.lightTint + a + ')');
        g.fillStyle = grd;
        g.beginPath(); g.moveTo(x - s.w * 0.6 - 70, y - 150); g.lineTo(x + s.w * 0.6 - 70, y - 150); g.lineTo(x + s.w, y + s.w * 0.25); g.lineTo(x - s.w, y + s.w * 0.25); g.closePath(); g.fill();
        g.fillStyle = T.lightTint + (a * 1.4) + ')'; g.beginPath(); g.ellipse(x, y, s.w, s.w * 0.4, 0, 0, TAU); g.fill();
        for (let i = 0; i < 4; i++) { // dust dancing in the beam
          const t = now * 0.25 + i * 0.27 + s.ph, k = t % 1;
          g.fillStyle = T.lightTint + (0.5 * Math.sin(k * Math.PI)) + ')';
          g.fillRect(rd(x - 70 * (1 - k) + Math.sin(t * 5) * s.w * 0.4), rd(y - 150 * (1 - k)), 1, 1);
        }
      }
    }
    // ambient motes
    if (this.atmo) {
      g.globalCompositeOperation = at.glow ? 'lighter' : 'source-over';
      for (const m of this.atmo) {
        const x = m.x - cx, y = m.y - cy, fade = Math.min(1, m.t / 0.6, (m.life - m.t) / 0.8);
        if (at.mote === 'drip') {
          const yy = y + m.fall * m.drop * m.drop;
          g.globalAlpha = 0.7 * fade; g.fillStyle = m.c; g.fillRect(rd(x), rd(yy - 2), 0.5, 2);
          if (m.drop >= 1) { g.globalAlpha = 0.5 * fade; g.strokeStyle = m.c; g.lineWidth = 0.5; g.beginPath(); g.ellipse(x, yy, 3 * (m.t % 1), 1.2 * (m.t % 1), 0, 0, TAU); g.stroke(); }
          continue;
        }
        const tw = at.glow ? 0.55 + Math.sin(now * 6 + m.ph) * 0.45 : 1;
        g.globalAlpha = (at.glow ? 0.9 : 0.45) * fade * tw;
        if (at.glow) g.drawImage(A.glow(G.rgba(m.c, 0.5)), x - 3, y - 3, 6, 6);
        g.fillStyle = m.c; g.fillRect(rd(x), rd(y), m.s * (at.mote === 'snow' ? 1 : 0.5), m.s * (at.mote === 'snow' ? 1 : 0.5));
      }
    }
    // glowing particles (spell trails, hit sparks, auras)
    g.globalCompositeOperation = 'lighter';
    for (const q of this.gparts || []) {
      const a = Math.min(1, q.life / q.max * 1.6), x = q.x - cx, y = q.y - cy, r = q.r * (q.grow ? 1 + (1 - q.life / q.max) * q.grow : 1);
      g.globalAlpha = a; g.drawImage(A.glow(G.rgba(q.c, 0.7)), x - r * 2.5, y - r * 2.5, r * 5, r * 5);
      g.fillStyle = q.core || '#ffffff'; g.globalAlpha = a * 0.9; g.fillRect(rd(x - r * 0.25), rd(y - r * 0.25), Math.max(0.5, r * 0.5), Math.max(0.5, r * 0.5));
    }
    g.restore();
  };

  /* ---------------- glowing particle system ---------------- */
  R.gpart = function (o) { const L = this.gparts || (this.gparts = []); if (L.length > (this.settings.lowFx ? 120 : 320)) L.shift(); L.push(o); };
  R.updateGparts = function (dt) {
    if (this.lightFlash > 0) this.lightFlash = this.lightFlash < 0.01 ? 0 : this.lightFlash * Math.pow(0.0015, dt);
    const L = this.gparts; if (!L) return;
    for (let i = L.length - 1; i >= 0; i--) { const q = L[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= q.drag || 0.92; q.vy = q.vy * (q.drag || 0.92) + (q.g || 0) * dt; if (q.life <= 0) L.splice(i, 1); }
  };
  /** Elemental impact sparks. */
  R.hitSpark = function (e, tags, crit) {
    if (this.settings.lowFx && Math.random() < 0.6) return;
    const c = elemColor(tags), n = crit ? 5 : 2;
    const fire = tags && tags.includes('fire'), ice = tags && tags.includes('ice'), bolt = tags && tags.includes('lightning');
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = U.rand(30, crit ? 110 : 70);
      this.gpart({ x: e.x + U.rand(-3, 3), y: e.y - e.r * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (fire ? 30 : 0), g: fire ? -20 : ice ? 60 : 0, life: U.rand(0.18, bolt ? 0.2 : 0.4), max: 0.4, c, r: crit ? 1.3 : 0.9, core: bolt ? '#ffffff' : c });
    }
  };
  /** Trails behind spell projectiles (called while rendering them). */
  R.projTrail = function (b) {
    if (!b.a || Math.random() < (this.settings.lowFx ? 0.8 : 0.45)) return;
    const c = b.k === 'flame' || b.k === 'fireball' || b.k === 'wave' ? '#ff8a30' : elemColor(b.a.tags);
    if (b.k === 'arrow' || b.k === 'dart' || b.k === 'axe' || b.k === 'chakram' || b.k === 'flask') { if (Math.random() < 0.5) return; }
    this.gpart({ x: b.x + U.rand(-1.5, 1.5), y: b.y + U.rand(-1.5, 1.5), vx: -b.vx * 0.05, vy: -b.vy * 0.05 - 4, life: 0.35, max: 0.35, c, r: 0.8, core: c });
  };
  /** Pillar of light and rising motes when the hero levels up. */
  R.levelUpVfx = function () {
    const p = this.player;
    this.fx.push({ k: 'pillar', x: p.x, y: p.y, life: 0.9, max: 0.9, color: '#ffe08a' });
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; this.gpart({ x: p.x + Math.cos(a) * 10, y: p.y + Math.sin(a) * 4, vx: 0, vy: U.rand(-60, -30), drag: 0.97, life: U.rand(0.6, 1.1), max: 1.1, c: '#ffd35a', r: 1, core: '#fff6c8' }); }
  };
  /** A burst of light over the whole hall (lightning strikes, big explosions); fades within a fraction of a second. */
  R.flashLight = function (a, col) {
    if (this.settings.lowFx) a *= 0.5;
    if (a > (this.lightFlash || 0)) { this.lightFlash = a; this.lightFlashCol = col || 'rgba(190,220,255,'; }
  };
  /** Ground rune circle for big spells. */
  DH.vfx = { ATMO, fog: (stageId) => { const at = ATMO[stageId] || ATMO.crypt; return { tex: tintedFog(at.fog.slice(0, 3)), a: at.fog[3] }; } };
  R.castCircle = function (x, y, R0, color) { this.fx.push({ k: 'runecircle', x, y, R: R0, life: 0.6, max: 0.6, color: color || '#d890ff', rot: Math.random() * TAU }); };
})(window.DH);
