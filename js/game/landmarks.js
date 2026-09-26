/* Landmarks (mixed into DH.Run.prototype): the ruins and set pieces standing in each hall.
 * The world is cut into cells; a cell may hold one set (a ruined chapel, a colonnade, the
 * Abyss' ritual dais with its fire pillars…), always the same for a given run seed. Tall pieces are
 * drawn with the heroes and foes (sorted by depth), and fade when the hero walks behind them; their bases are
 * solid for the hero and the horde, but not for bosses, flyers or projectiles.
 *   crypt      ruined chapels, colonnades, graveyards, gateways
 *   abyss      ritual daises ringed by fire pillars, obsidian spires, scorched gates
 *   aqueduct   statues and columns along the parapets of the bridge
 *   catacombs  frosted columns, ice spires, warriors frozen in ice
 *   discord    rune obelisks, crystal clusters, arcane gateways
 *   blightmire dead trees, a stilt hut, reeds, standing stones
 *   reliquary  gilded colonnades, heaps of treasure, mourner statues */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;

  // a piece: [painter, dx, dy, collider radius (0 = none), frame]; 'flat' pieces lie on the floor
  const col = (dx, dy, r) => ['lm_column', dx, dy, r == null ? 6 : r];
  const brk = (dx, dy) => ['lm_colbroken', dx, dy, 6];
  const SETS = {
    chapel: { R: 70, p: [['lm_wall', 0, 0, 0, 0, [[-26, 0, 8], [-9, 0, 8], [9, 0, 8], [26, 0, 7]]], brk(-46, 22), col(48, -4), ['lm_rubble', 16, 24, 6], ['lm_tomb', -18, 40, 4, 1]] },
    colonnade: { R: 70, p: [col(-48, -8), col(-16, -8), brk(16, -8), col(48, -8), ['lm_rubble', 0, 18, 6], col(-48, 34), brk(48, 34)] },
    graveyard: { R: 60, p: [['lm_statue', 0, -30, 7], ['lm_tomb', -30, -8, 4, 0], ['lm_tomb', -10, -12, 4, 1], ['lm_tomb', 12, -6, 4, 0], ['lm_tomb', 32, -10, 4, 1],
      ['lm_tomb', -22, 16, 4, 1], ['lm_tomb', 2, 20, 4, 0], ['lm_tomb', 26, 18, 4, 1]] },
    gate: { R: 60, p: [['lm_arch', 0, 0, 0, 0, [[-21, -2, 7], [21, -2, 7]]], ['lm_rubble', -38, 16, 6], brk(40, 10)] },
    ritual: { R: 70, p: [['lm_dais', 0, 0, 0, 0, null, true], ['lm_firepillar', -38, -18, 6], ['lm_firepillar', 38, -18, 6], ['lm_firepillar', -38, 20, 6], ['lm_firepillar', 38, 20, 6]], light: [[-38, -45, 70, 'torch'], [38, -45, 70, 'torch'], [-38, -7, 70, 'torch'], [38, -7, 70, 'torch'], [0, 0, 60, 'lava']] },
    spires: { R: 50, p: [['lm_spire', -24, -8, 8], ['lm_spire', 10, -20, 8], ['lm_spire', 30, 10, 8], ['lm_rubble', -4, 18, 6]], light: [[-24, -18, 40, 'lava'], [30, 0, 40, 'lava']] },
    obelisks: { R: 50, p: [['lm_obelisk', 0, -28, 6], ['lm_obelisk', -32, 14, 6], ['lm_obelisk', 32, 14, 6], ['lm_rubble', 0, 10, 6]], light: [[0, -50, 50, 'magic'], [-32, -8, 50, 'magic'], [32, -8, 50, 'magic']] },
    crystals: { R: 40, p: [['lm_crystal', -18, 0, 7], ['lm_crystal', 16, -10, 7], ['lm_crystal', 8, 18, 7]], light: [[0, -8, 60, 'magic']] },
    arcgate: { R: 60, p: [['lm_arch', 0, 0, 0, 0, [[-21, -2, 7], [21, -2, 7]]], ['lm_obelisk', -46, 8, 6], ['lm_obelisk', 46, 8, 6]], light: [[0, -40, 50, 'magic']] },
    icehall: { R: 60, p: [col(-30, -8), col(30, -8), brk(0, 16), ['lm_stalag', -56, 16, 8]], light: [[-56, -10, 50, 'frost'], [-30, -40, 40, 'frost']] },
    stalags: { R: 45, p: [['lm_stalag', -22, -6, 8], ['lm_stalag', 18, -14, 8], ['lm_stalag', 6, 20, 8]], light: [[0, -10, 70, 'frost']] },
    frozen: { R: 45, p: [['lm_frozen', -18, 0, 8], ['lm_frozen', 18, -10, 8], brk(2, 24)], light: [[-18, -16, 44, 'frost'], [18, -26, 44, 'frost']] },
    grove: { R: 50, p: [['lm_deadtree', 0, 0, 7], ['lm_reeds', -28, 12, 0, 0], ['lm_reeds', 26, 16, 0, 1], ['lm_menhir', 34, -14, 5]] },
    hut: { R: 60, p: [['lm_hut', 0, 0, 0, 0, [[-18, -2, 6], [18, -2, 6], [0, -2, 6]]], ['lm_reeds', -36, 18, 0, 0], ['lm_reeds', 32, 20, 0, 1], ['lm_deadtree', -52, -18, 7]], light: [[13, -26, 34, 'candle']] },
    henge: { R: 50, p: [0, 1, 2, 3, 4].map((i) => ['lm_menhir', Math.round(Math.cos(i / 5 * Math.PI * 2 - Math.PI / 2) * 38), Math.round(Math.sin(i / 5 * Math.PI * 2 - Math.PI / 2) * 24), 5]).concat([['lm_reeds', 0, 4, 0, 0]]), light: [[0, -4, 50, 'crystal', '#b0ff50']] },
    vault: { R: 70, p: [col(-48, -8), col(-16, -8), col(16, -8), col(48, -8), ['lm_hoard', 0, 20, 9]], light: [[0, 14, 50, 'item', '#ffd040']] },
    treasury: { R: 50, p: [['lm_hoard', 0, 0, 9], ['lm_statue', -32, -8, 7], ['lm_statue', 32, -8, 7]], light: [[0, -4, 50, 'item', '#ffd040']] },
    goldgate: { R: 60, p: [['lm_arch', 0, 0, 0, 0, [[-21, -2, 7], [21, -2, 7]]], ['lm_hoard', -44, 14, 9], col(46, 6)] },
  };
  C.LANDMARKS = {
    cell: 400, chance: 0.5, clear: 190,
    halls: {
      crypt: ['chapel', 'colonnade', 'graveyard', 'gate'],
      abyss: ['ritual', 'spires', 'gate', 'ritual'],
      catacombs: ['icehall', 'stalags', 'frozen', 'graveyard'],
      discord: ['obelisks', 'crystals', 'arcgate', 'colonnade'],
      blightmire: ['grove', 'hut', 'henge', 'grove'],
      reliquary: ['vault', 'treasury', 'goldgate', 'colonnade'],
    },
    // the statues and columns stand on the parapets, every `every` units
    bridge: { every: 150, pieces: [['lm_statue', 7], ['lm_column', 6], ['lm_colbroken', 6], null] },
    sets: SETS,
  };

  const hash = (x, y, s) => { let h = (x * 73856093) ^ (y * 19349663) ^ s; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15; return h >>> 0; };

  /** The set standing in a cell (cached), or null. */
  R.lmCell = function (cx, cy) {
    const M = this.lmCache || (this.lmCache = new Map()), key = cx + ',' + cy;
    if (M.has(key)) return M.get(key);
    const L = C.LANDMARKS, v = this.stage.variant, seed = this.lmSeed || (this.lmSeed = (Math.random() * 2e9) | 0), out = { pieces: [], lights: [] };
    let cell = null;
    if (this.bridge) { // the viaduct: one piece on each parapet
      const h = hash(cx, 0, seed), B = this.bridge, x = (cx + 0.5) * L.bridge.every + ((h >>> 4) % 40) - 20;
      if (cy === 0) for (const [s, k] of [[-1, h & 3], [1, (h >>> 2) & 3]]) {
        const pc = L.bridge.pieces[k]; if (!pc) continue;
        const y = s < 0 ? -B + 4 : B + 2; // behind the far parapet / in front of the near one
        out.pieces.push({ sp: pc[0], v, fr: 0, x, y, cols: [], flat: false, top: 60 });
      }
      cell = out.pieces.length ? out : null;
    } else {
      const list = L.halls[this.stageId];
      const h = hash(cx, cy, seed);
      if (list && (h % 1000) / 1000 < L.chance) {
        const S = SETS[list[(h >>> 10) % list.length]], ox = (cx + 0.5) * L.cell + ((h >>> 14) % 120) - 60, oy = (cy + 0.5) * L.cell + ((h >>> 20) % 120) - 60;
        if (Math.hypot(ox, oy) > L.clear + S.R) {
          for (const q of S.p) {
            const [sp, dx, dy, r, fr, cols, flat] = q, x = ox + dx, y = oy + dy;
            out.pieces.push({ sp, v, fr: fr || 0, x, y, flat: !!flat, cols: cols ? cols.map(([a, b, rr]) => [x + a, y + b, rr]) : r ? [[x, y - 1, r]] : [], top: G_TOP[sp] || 40 });
          }
          for (const [dx, dy, r, kind, color] of S.light || []) out.lights.push({ x: ox + dx, y: oy + dy, r, kind, color });
          out.x = ox; out.y = oy; out.R = S.R;
          cell = out;
        }
      }
    }
    M.set(key, cell);
    return cell;
  };
  const G_TOP = { lm_column: 58, lm_colbroken: 34, lm_wall: 46, lm_arch: 60, lm_tomb: 16, lm_statue: 44, lm_rubble: 10, lm_firepillar: 30, lm_spire: 48,
    lm_stalag: 42, lm_frozen: 36, lm_obelisk: 56, lm_crystal: 31, lm_deadtree: 58, lm_hut: 66, lm_reeds: 20, lm_menhir: 33, lm_hoard: 18 };
  const HALF_W = { lm_column: 9, lm_colbroken: 10, lm_wall: 36, lm_arch: 31, lm_tomb: 6, lm_statue: 11, lm_rubble: 14, lm_firepillar: 8, lm_spire: 12,
    lm_stalag: 15, lm_frozen: 14, lm_obelisk: 8, lm_crystal: 13, lm_deadtree: 23, lm_hut: 34, lm_reeds: 12, lm_menhir: 8, lm_hoard: 17 };

  /** Points that must stay free of ruins: the Well, secrets, the Hex obelisk, the light puzzle, pylons. */
  R.lmReserved = function () {
    const out = [], add = (o) => { if (o && o.x != null) out.push(o); };
    add(this.well); add(this.hex); (this.pylons || []).forEach(add);
    const Z = this.disso; if (Z) { add(Z.src); add(Z.mono); Z.relays.forEach(add); }
    const S = this.sec; if (S) { add(S.page); (S.nodes || []).forEach(add); add(S.raven); add(S.target); }
    return out;
  };

  /** Refresh the pieces near the hero (once per frame) and keep the hero and the horde out of their bases. */
  R.updateLandmarks = function (dt) {
    const L = C.LANDMARKS, p = this.player, v = DH.view, cs = this.bridge ? L.bridge.every : L.cell;
    const hw = (v.w || 270) / 2 + 140, hh = (v.h || 480) / 2 + 160;
    const x0 = Math.floor((p.x - hw) / cs), x1 = Math.floor((p.x + hw) / cs), y0 = this.bridge ? 0 : Math.floor((p.y - hh) / cs), y1 = this.bridge ? 0 : Math.floor((p.y + hh) / cs);
    const near = this.lmNear || (this.lmNear = []), lights = this.lmLights || (this.lmLights = []);
    near.length = 0; lights.length = 0;
    const seen = this.lmSeen || (this.lmSeen = new Set());
    let res = null;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = this.lmCell(cx, cy); if (!c) continue;
      const key = cx + ',' + cy;
      if (!seen.has(key) && c.R) { // the first time a set comes near, it gives way to anything the hall placed there
        res = res || this.lmReserved();
        if (res.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < c.R + 50)) { this.lmCache.set(key, null); continue; }
      }
      seen.add(key);
      for (const q of c.pieces) near.push(q);
      for (const l of c.lights) lights.push(l);
    }
    // solid bases
    const push = (o, rr) => {
      for (const q of near) for (const c of q.cols) {
        const dx = o.x - c[0], dy = o.y - c[1], m = c[2] + rr, d2 = dx * dx + dy * dy;
        if (d2 < m * m) { const d = Math.sqrt(d2) || 0.01; o.x = c[0] + dx / d * m; o.y = c[1] + dy / d * m; }
      }
    };
    if (!near.length) return;
    if (dt) this.landmarkFx(dt);
    push(p, p.r || 5);
    for (const e of this.enemies) if (!e.dead && !e.boss && !e.def.fly && !e.def.prop && Math.abs(e.x - p.x) < hw && Math.abs(e.y - p.y) < hh) push(e, e.r * 0.8);
  };

  /** Small signs of life on the set pieces near the hero: embers and smoke over fire, runes shedding motes,
   *  glints on ice, crystal and gold, dust trickling off old stone, leaves and drips in the bog. */
  const STONE = { lm_column: 1, lm_colbroken: 1, lm_wall: 1, lm_arch: 1, lm_statue: 1 };
  R.landmarkFx = function (dt) {
    const p = this.player, V = DH.view, hw = (V.w || 270) / 2 + 20, hh = (V.h || 480) / 2 + 60, lowK = this.settings.lowFx ? 0.35 : 1, ice = this.stage.variant === 'ice';
    const chance = (rate) => Math.random() < rate * dt * lowK;
    const glint = (x, y, c) => this.gpart({ x, y, vx: 0, vy: 0, life: 0.32, max: 0.32, c, r: 1, core: '#ffffff' });
    for (const q of this.lmNear) {
      if (Math.abs(q.x - p.x) > hw || q.y - q.top - p.y > hh || p.y - q.y > hh) continue;
      const x = q.x, y = q.y, sp = q.sp, rnd = U.rand;
      if (sp === 'lm_firepillar') {
        if (chance(7)) this.gpart({ x: x + rnd(-3, 3), y: y - 27, vx: rnd(-8, 8), vy: rnd(-45, -22), drag: 0.97, life: rnd(0.5, 1), max: 1, c: '#ffb040', r: 0.7 });
        if (chance(2)) this.parts.push({ x: x + rnd(-2, 2), y: y - 32, vx: rnd(-3, 3), vy: -12, g: -14, life: 1.6, max: 1.6, c: '#2e2628', s: 2 });
      } else if (sp === 'lm_dais') {
        if (chance(4)) { const a = Math.random() * Math.PI * 2, d = rnd(0, 30); this.gpart({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.56, vx: 0, vy: rnd(-26, -12), drag: 0.98, life: rnd(0.8, 1.4), max: 1.4, c: '#ff8a30', r: 0.7 }); }
      } else if (sp === 'lm_spire') {
        if (chance(2.5)) this.gpart({ x: x + rnd(-3, 3), y: y - rnd(12, 34), vx: rnd(-4, 4), vy: rnd(-20, -8), life: rnd(0.6, 1.1), max: 1.1, c: '#ff6a20', r: 0.7 });
      } else if (sp === 'lm_obelisk') {
        if (chance(3)) this.gpart({ x: x + rnd(-2.5, 2.5), y: y - rnd(10, 48), vx: rnd(-3, 3), vy: rnd(-18, -8), drag: 0.98, life: rnd(0.8, 1.4), max: 1.4, c: '#c070ff', r: 0.8 });
      } else if (sp === 'lm_crystal') {
        if (chance(2.2)) glint(x + rnd(-9, 9), y - rnd(4, 28), '#e0a0ff');
      } else if (sp === 'lm_stalag' || sp === 'lm_frozen' || (ice && STONE[sp])) {
        if (chance(1.6)) glint(x + rnd(-10, 10), y - rnd(4, Math.min(40, q.top - 4)), '#dff6ff');
        if (chance(1)) this.parts.push({ x: x + rnd(-10, 10), y: y - 1, vx: rnd(3, 8), vy: -2, life: 1.5, max: 1.5, c: '#bcdcf0', s: 1 });
      } else if (sp === 'lm_hoard') {
        if (chance(3)) glint(x + rnd(-13, 13), y - rnd(2, 12), '#ffe070');
      } else if (sp === 'lm_menhir') {
        if (chance(1)) this.gpart({ x: x + rnd(-3, 3), y: y - rnd(10, 22), vx: rnd(-4, 4), vy: rnd(-10, -4), life: 1.2, max: 1.2, c: '#b0ff50', r: 0.7 });
      } else if (sp === 'lm_deadtree') {
        if (chance(0.25)) this.parts.push({ x: x + rnd(-18, 18), y: y - rnd(36, 52), vx: rnd(6, 14), vy: rnd(8, 14), g: 10, life: 3.2, max: 3.2, c: U.pick(['#5a4a20', '#4a3a18']), s: 1 });
      } else if (sp === 'lm_hut') {
        if (chance(1.2)) this.parts.push({ x: x + rnd(-26, 26), y: y - 38, vx: 0, vy: 10, g: 240, life: 0.45, max: 0.45, c: '#8ab0a0', s: 1 });
      }
      if (STONE[sp] && !ice && chance(0.22)) { // a trickle of dust off old stone
        for (let i = 0; i < 4; i++) this.parts.push({ x: x + rnd(-4, 4), y: y - q.top + 4 + i * 2, vx: rnd(-3, 3), vy: rnd(4, 12), g: 80, life: rnd(0.6, 1), max: 1, c: '#8a8278', s: 1 });
      }
    }
  };

  /** Move a point out of any ruin (for things placed during the run: the Well, pylons, hazards). */
  R.lmFree = function (o, r) {
    const L = C.LANDMARKS, cs = this.bridge ? L.bridge.every : L.cell, gx = Math.floor(o.x / cs), gy = this.bridge ? 0 : Math.floor(o.y / cs);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const c = this.lmCell(gx + i, this.bridge ? 0 : gy + j); if (!c) continue;
      for (const q of c.pieces) for (const k of q.cols) { const dx = o.x - k[0], dy = o.y - k[1], m = k[2] + (r || 10), d = Math.hypot(dx, dy); if (d < m) { o.x = k[0] + dx / (d || 1) * m; o.y = k[1] + dy / (d || 1) * m; } }
      if (c.R && !this.bridge && Math.hypot(o.x - c.x, o.y - c.y) < c.R) { const a = Math.atan2(o.y - c.y, o.x - c.x); o.x = c.x + Math.cos(a) * (c.R + (r || 10)); o.y = c.y + Math.sin(a) * (c.R + (r || 10)); }
    }
    return o;
  };

  /** Flat pieces (the ritual dais), drawn right after the floor. */
  R.drawLandmarksFlat = function (g, cx, cy, W, H, lights) {
    const now = this.time;
    for (const l of this.lmLights || []) if (l.x - cx > -120 && l.x - cx < W + 120 && l.y - cy > -120 && l.y - cy < H + 120)
      lights.push(l.kind === 'torch' || l.kind === 'candle' ? l : Object.assign({}, l, { r: l.r * (0.72 + 0.32 * (0.5 + 0.5 * Math.sin(now * 1.7 + l.x * 0.13 + l.y * 0.07))) })); // runes, crystals and gold breathe
    for (const q of this.lmNear || []) if (q.flat) this.sprite(g, q.sp, q.v, q.fr, q.x - cx, q.y - cy, false, 1);
  };
  /** Tall pieces join the depth-sorted entities; a piece in front of the hero turns see-through. */
  R.landmarkEnts = function (ents, cx, cy, W, H) {
    for (const q of this.lmNear || []) {
      if (q.flat) continue;
      const x = q.x - cx, y = q.y - cy, hw = HALF_W[q.sp] || 12;
      if (x < -hw - 10 || x > W + hw + 10 || y < -10 || y - q.top > H + 10) continue;
      ents.push({ lm: q, y: q.y });
    }
  };
  R.drawLandmark = function (g, q, cx, cy, now) {
    const p = this.player, hw = HALF_W[q.sp] || 12;
    const behind = p.y < q.y && p.y > q.y - q.top - 6 && Math.abs(p.x - q.x) < hw + 4;
    const fr = q.sp === 'lm_firepillar' || q.sp === 'lm_hut' ? ((Math.floor(now * 4 + q.x) % 2) + 2) % 2 : q.sp === 'lm_obelisk' || q.sp === 'lm_crystal' ? (Math.sin(now * 1.7 + q.x * 0.13 + q.y * 0.07) > 0.2 ? 1 : 0) : q.sp === 'lm_reeds' ? ((Math.floor(now * 1.3 + q.x * 0.05) % 2) + 2) % 2 : q.fr;
    this.sprite(g, q.sp, q.v, fr, q.x - cx, q.y - cy, (q.x | 0) % 7 === 0 && q.sp !== 'lm_wall' && q.sp !== 'lm_arch' && q.sp !== 'lm_hut' && q.sp !== 'lm_frozen', 1, false, behind ? 0.45 : 1);
    if (q.sp === 'lm_crystal' || q.sp === 'lm_obelisk') { // the glow swells and fades gently
      const k = 0.5 + 0.5 * Math.sin(now * 1.7 + q.x * 0.13 + q.y * 0.07), r = (q.sp === 'lm_crystal' ? 16 : 12) + 6 * k, hy = q.y - cy - (q.sp === 'lm_crystal' ? 14 : 28);
      g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(DH.art.glow('rgba(200,120,255,' + (0.12 + 0.22 * k) + ')'), q.x - cx - r, hy - r * 1.3, r * 2, r * 2.6); g.restore();
    }
    if (q.sp === 'lm_frozen') this.sprite(g, 'lm_frozen_ice', null, 0, q.x - cx, q.y - cy, false, 1, false, behind ? 0.4 : 0.9); // the translucent ice over the body
  };
})(window.DH);
