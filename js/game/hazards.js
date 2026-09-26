/* Environmental hazards (mixed into DH.Run.prototype):
 *   crypt / abyss  iron braziers: strike one and it tips over, spilling a field of embers that sets every foe
 *                  walking through it on fire (a Burn stack every 0.33 s)
 *   catacombs      ice spikes: they shatter into a burst that loads nearby foes with Frost
 *   blightmire     mud pits and root snares on the ground: no breaking, they simply slow the horde down
 *   aqueduct       the viaduct has no hazards (a place for the Elemental Heathen and Direct Damage deeds)
 * Hazard damage is environmental: your damage and crit do not touch it, only the effects' own math and the
 * hall's strength. It still counts as your fire / frost for the deeds. */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  C.ENV = {
    props: { crypt: 'brazier', abyss: 'brazier', catacombs: 'icespike' },
    every: [9, 14], max: 3, dist: [100, 190],
    fire: { r: 30, dur: 6, tick: 0.33, burn: 0.8 },     // burn: damage per stack per tick x the hall's strength
    ice: { r: 56, stacks: 8, frost: 2.4, reach: 40 },   // frost: Frost Wave damage per stack x the hall's strength
    bog: { cell: 380, chance: 0.45, mud: { r: 56, slow: 10 }, roots: { r: 40, slow: 14 } },
  };
  // the breakable hazards are props: any hit breaks them
  C.enemies.brazier = { painter: 'brazier', hp: 1, spd: 0, dmg: 0, xp: 0, r: 6, mass: 99, ai: 'static', prop: true, hazard: 'fire', touch: true };
  C.enemies.icespike = { painter: 'icespike', hp: 1, spd: 0, dmg: 0, xp: 0, r: 7, mass: 99, ai: 'static', prop: true, hazard: 'ice', touch: true };

  /** How strong the hall's foes are right now (the same curve their life follows). */
  R.envScale = function () { return this.stage.hpMult * (1 + this.time / 60 * 0.22 * (C.RUN_LENGTH / this.runLength)); };

  R.updateEnv = function (dt) {
    const E = C.ENV, kind = E.props[this.stageId], p = this.player;
    if (kind) { // a few hazards stand around the hero
      this.envT = (this.envT == null ? 3 : this.envT) - dt;
      if (this.envT <= 0) {
        this.envT = U.rand(E.every[0], E.every[1]);
        const n = this.enemies.reduce((a, e) => a + (e.def.hazard && !e.dead ? 1 : 0), 0);
        if (n < E.max) { const a = Math.random() * TAU, d = U.rand(E.dist[0], E.dist[1]), q = this.lmFree({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d }, 12); this.spawnEnemy(kind, q.x, q.y); }
      }
    }
    // fields of embers
    const Z = this.envZones || (this.envZones = []);
    for (let i = Z.length - 1; i >= 0; i--) {
      const z = Z[i]; z.t += dt; z.acc += dt;
      if (z.acc >= E.fire.tick) {
        z.acc -= E.fire.tick;
        const per = E.fire.burn * this.envScale(), base = per / C.STATUS.burn.per;
        this.grid.query(z.x, z.y, z.r + 10, tmp);
        for (const e of tmp) if (!e.dead && !e.def.prop && !e.def.fly && U.dist2(z.x, z.y, e.x, e.y) < z.r * z.r) this.addBurn(e, 1, base);
      }
      if (z.t >= z.dur) Z.splice(i, 1);
    }
    // the mud and roots hold the horde back
    if (this.stageId === 'blightmire') {
      this.bogT = (this.bogT || 0) - dt;
      if (this.bogT <= 0) {
        this.bogT = 0.25;
        for (const z of this.bogZones()) {
          const B = E.bog[z.kind];
          this.grid.query(z.x, z.y, z.r + 10, tmp);
          for (const e of tmp) if (!e.dead && !e.def.prop && !e.def.fly && !e.boss && U.dist2(z.x, z.y, e.x, e.y) < z.r * z.r && (e.slowS || 0) < B.slow) this.addSlow(e, B.slow - (e.slowS || 0));
        }
      }
    }
  };
  const tmp = [];

  /** Mud pits and root snares near the hero: fixed spots on a grid, the same every time you pass. */
  R.bogZones = function () {
    const B = C.ENV.bog, p = this.player, cs = B.cell, gx = Math.floor(p.x / cs), gy = Math.floor(p.y / cs), out = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      const cx = gx + i, cy = gy + j; if (Math.abs(cx) + Math.abs(cy) < 1) continue; // keep the entrance clear
      let h = (cx * 73856093) ^ (cy * 19349663) ^ (this.seed || 0x5bd1e995); h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15; h >>>= 0;
      if ((h % 1000) / 1000 >= B.chance) continue;
      const kind = (h >>> 10) & 1 ? 'mud' : 'roots';
      out.push({ kind, x: (cx + 0.2 + ((h >>> 12) % 60) / 100) * cs, y: (cy + 0.2 + ((h >>> 18) % 60) / 100) * cs, r: B[kind].r, h });
    }
    return out;
  };

  /** A hazard was struck: the brazier spills its embers, the ice spike bursts into Frost. */
  R.envBreak = function (e) {
    const E = C.ENV;
    if (e.def.hazard === 'fire') {
      (this.envZones || (this.envZones = [])).push({ x: e.x, y: e.y + 4, r: E.fire.r, t: 0, acc: 0, dur: E.fire.dur });
      DH.audio.play('fire'); this.burst(e.x, e.y, 18, ['#ff8a20', '#ffd040', '#5a2a10'], 70); this.propBreakFx(e);
    } else if (e.def.hazard === 'ice') {
      const base = E.ice.frost * this.envScale() / C.STATUS.frost.per;
      this.grid.query(e.x, e.y, E.ice.r + 10, tmp);
      for (const o of tmp) if (!o.dead && !o.def.prop && U.dist2(e.x, e.y, o.x, o.y) < E.ice.r * E.ice.r) this.addFrost(o, E.ice.stacks, base, E.ice.reach);
      this.fx.push({ k: 'frostburst', x: e.x, y: e.y, R: E.ice.r, life: 0.4, max: 0.4 });
      DH.audio.play('frost'); this.burst(e.x, e.y - 4, 20, ['#bfefff', '#ffffff', '#5a9ad0'], 80); this.propBreakFx(e);
    }
  };

  /** Idle life of a breakable: a glint on an urn, sparks and smoke over a brazier, frost glinting on an ice spike. */
  R.propIdleFx = function (e, dt) {
    if (this.settings.lowFx && Math.random() < 0.5) return;
    const P = e.def.painter;
    if (P === 'urn') { if (Math.random() < 0.35 * dt) this.gpart({ x: e.x + U.rand(-3, 3), y: e.y - U.rand(5, 10), vx: 0, vy: 0, life: 0.35, max: 0.35, c: '#fff0c0', r: 0.9 }); }
    else if (P === 'brazier') {
      if (Math.random() < 7 * dt) this.gpart({ x: e.x + U.rand(-3, 3), y: e.y - 16, vx: U.rand(-8, 8), vy: U.rand(-45, -25), drag: 0.97, life: U.rand(0.5, 0.9), max: 0.9, c: '#ffb040', r: 0.7 });
      if (Math.random() < 2.5 * dt) this.parts.push({ x: e.x + U.rand(-2, 2), y: e.y - 20, vx: U.rand(-4, 4), vy: -14, g: -14, life: 1.4, max: 1.4, c: '#3a3036', s: 2 });
    } else if (P === 'icespike') {
      if (Math.random() < 1.6 * dt) this.gpart({ x: e.x + U.rand(-5, 5), y: e.y - U.rand(3, 16), vx: 0, vy: 0, life: 0.3, max: 0.3, c: '#dff6ff', r: 1 });
      if (Math.random() < 1.2 * dt) this.parts.push({ x: e.x + U.rand(-6, 6), y: e.y - 1, vx: U.rand(3, 8), vy: -2, life: 1.4, max: 1.4, c: '#bcdcf0', s: 1 });
    }
  };
  /** Breaking one: clay shards and dust, a brazier toppling in a shower of sparks, ice splinters and glints. */
  R.propBreakFx = function (e) {
    const P = e.def.painter, arc = (n, cols, sp, up, g, s) => { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = U.rand(sp * 0.4, sp); this.parts.push({ x: e.x + U.rand(-2, 2), y: e.y - U.rand(2, 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - up, g, life: U.rand(0.4, 0.8), max: 0.8, c: U.pick(cols), s: s || 1 }); } };
    if (P === 'urn') {
      arc(12, ['#a8683a', '#7a4424', '#5a3016', '#c08050'], 70, 50, 260, 1.5);
      arc(8, ['#8a7a6a', '#6a5e52'], 30, 10, 0, 2); // dust
      this.fx.push({ k: 'pop', x: e.x, y: e.y - 3, R: 12, life: 0.3, max: 0.3, color: '#c8a070' });
    } else if (P === 'brazier') {
      this.fx.push({ k: 'tipover', x: e.x, y: e.y, life: 0.7, max: 0.7, dir: Math.random() < 0.5 ? -1 : 1 });
      for (let i = 0; i < 22; i++) { const a = -Math.PI / 2 + U.rand(-1.3, 1.3), v = U.rand(40, 120); this.gpart({ x: e.x, y: e.y - 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 140, drag: 0.96, life: U.rand(0.5, 1), max: 1, c: U.pick(['#ffb040', '#ff7a20', '#ffe080']), r: 0.9 }); }
      this.flashLight(0.08, 'rgba(255,160,80,');
    } else if (P === 'icespike') {
      arc(16, ['#ffffff', '#cfefff', '#8ac8f0'], 90, 40, 220, 1.5);
      for (let i = 0; i < 8; i++) this.gpart({ x: e.x + U.rand(-10, 10), y: e.y - U.rand(2, 14), vx: 0, vy: -6, life: U.rand(0.3, 0.6), max: 0.6, c: '#dff6ff', r: 1.1 });
    }
  };

  /** Drawn in the entity pass, under the foes: ember fields and the bog's mud and roots. */
  R.drawEnv = function (g, cx, cy, W, H, now, lights) {
    for (const z of this.envZones || []) {
      const x = z.x - cx, y = z.y - cy; if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      const k = Math.min(1, (z.dur - z.t) / 1.2);
      g.save(); g.globalAlpha = k;
      g.fillStyle = 'rgba(60,14,4,0.55)'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.55, 0, 0, TAU); g.fill();
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) { const a = i * 2.4 + z.x, rr = z.r * (0.2 + ((i * 37) % 70) / 100), fx = x + Math.cos(a) * rr, fy = y + Math.sin(a) * rr * 0.55, fl = 2 + Math.sin(now * 12 + i) * 1.2; g.fillStyle = i % 3 ? 'rgba(255,120,30,0.8)' : 'rgba(255,220,90,0.9)'; g.fillRect(Math.round(fx - 1), Math.round(fy - fl - 1), 2, fl + 1); }
      g.restore();
      lights.push({ x: z.x, y: z.y, r: z.r * 1.6 * k + 6, kind: 'fire', cast: 0.6 * k });
      if (Math.random() < 0.4) this.parts.push({ x: z.x + U.rand(-z.r, z.r) * 0.8, y: z.y + U.rand(-z.r, z.r) * 0.4, vx: 0, vy: -26, life: 0.5, max: 0.5, c: '#ff9a30', s: 1 });
    }
    for (const e of this.enemies) if (e.def.hazard && !e.dead) lights.push(e.def.hazard === 'fire' ? { x: e.x, y: e.y - 10, r: 50, kind: 'torch' } : { x: e.x, y: e.y - 8, r: 28 + Math.sin(now * 2 + e.x) * 3, kind: 'frost' });
    if (this.stageId !== 'blightmire') return;
    for (const z of this.bogZones()) {
      const x = z.x - cx, y = z.y - cy; if (x < -80 || y < -80 || x > W + 80 || y > H + 80) continue;
      if (z.kind === 'mud') {
        g.fillStyle = 'rgba(20,14,6,0.85)'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(120,100,50,0.55)'; g.lineWidth = 1.5; g.stroke(); // a wet rim
        g.fillStyle = 'rgba(66,50,22,0.8)'; g.beginPath(); g.ellipse(x - z.r * 0.15, y - 2, z.r * 0.68, z.r * 0.36, 0, 0, TAU); g.fill();
        g.fillStyle = 'rgba(210,220,160,0.3)'; for (let i = 0; i < 5; i++) { const a = now * 0.6 + i * 1.7 + (z.h % 7); g.beginPath(); g.arc(x + Math.cos(a) * z.r * 0.5, y + Math.sin(a * 1.3) * z.r * 0.22, 1.4 + (i % 2), 0, TAU); g.fill(); }
      } else {
        g.fillStyle = 'rgba(40,60,14,0.35)'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.55, 0, 0, TAU); g.fill();
        const arms = [];
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + (z.h % 10), r1 = z.r * (0.6 + (i % 3) * 0.18); arms.push([a, r1]); }
        g.strokeStyle = '#4a3418'; g.lineWidth = 3.2;
        for (const [a, r1] of arms) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * r1 * 0.6, y + Math.sin(a + 0.6) * r1 * 0.35, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.55); g.stroke(); }
        g.strokeStyle = 'rgba(190,240,90,' + (0.45 + Math.sin(now * 3 + z.h) * 0.15) + ')'; g.lineWidth = 1.1;
        for (const [a, r1] of arms) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * r1 * 0.6, y + Math.sin(a + 0.6) * r1 * 0.35, x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.55); g.stroke(); }
        g.fillStyle = '#2e2010'; g.beginPath(); g.ellipse(x, y, 6, 3.5, 0, 0, TAU); g.fill();
      }
    }
  };
})(window.DH);
