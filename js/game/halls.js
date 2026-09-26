/* Hall rules (mixed into DH.Run.prototype):
 *   bridge    the Drowned Aqueduct is a narrow viaduct over a chasm
 *   lordKills the Blightmire's Lord rises after a number of kills, not on a clock
 *   vault     the Sealed Reliquary deepens its torment every few minutes and seals its Lord
 *             behind four pylons
 *   dissonator the Halls of Discord hide a light puzzle: a source, eight relays and the Dissonator
 *             Monolith. Bumping a relay turns it 90° clockwise; when every relay matches the golden
 *             arrow on its pedestal the beam reaches the Monolith, whose pulses scourge the Lord
 * Frozen Catacombs' Snow Effigies (damage factor) live in combat.hit via def.dmgFactor. */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  R.initHall = function () {
    const st = this.stage;
    this.bridge = st.bridge || 0;
    const km = !st.lordKills && !st.vault && DH.save.data.killMode && DH.meta.altarUnlocked() ? C.KILL_MODE : 0; // Kill Mode (Shrine)
    this.killMode = !!km;
    this.lordKills = st.lordKills || km ? Math.round((st.lordKills || km) * this.runLength / C.RUN_LENGTH) : 0;
    this.vaultLevel = 0;
    this.pylons = [];
    if (st.dissonator) { this.hex = null; this.initDissonator(); }
    this.initSecret();
  };
  /** Clamp a y coordinate onto the bridge (no-op elsewhere). */
  R.onBridge = function (y, pad) { return this.bridge ? U.clamp(y, -this.bridge + (pad || 0), this.bridge - (pad || 0)) : y; };

  /** Where the horde enters: around the screen edge, or from both ends of the bridge. */
  R.hallEdgePoint = function (k) {
    const v = DH.view, p = this.player;
    if (this.bridge) {
      const side = Math.random() < 0.5 ? -1 : 1;
      return { x: p.x + side * (v.w / 2 * (k || 1) + U.rand(16, 60)), y: U.rand(-this.bridge + 10, this.bridge - 10) };
    }
    const a = Math.random() * TAU, d = Math.hypot(v.w, v.h) / 2 * (k || 1) + 16;
    return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
  };

  /** Is this hall's final Lord due? (time, or kills in the Blightmire). */
  R.lordDue = function (b, scale) {
    if (b.final && this.lordKills) return this.kills >= this.lordKills || this.time >= C.BOG_FALLBACK * scale;
    return b.t * scale <= this.time;
  };

  R.updateHall = function (dt) {
    const p = this.player;
    if (this.disso) this.updateDissonator(dt);
    this.updateSecret(dt);
    this.updateEnv(dt);
    if (this.bridge) {
      const B = this.bridge;
      p.y = U.clamp(p.y, -B + 6, B - 6);
      for (const e of this.enemies) { const lim = e.def.fly ? B + 34 : B - 4; if (e.y > lim) e.y = lim; else if (e.y < -lim) e.y = -lim; }
      for (const k of this.pickups) if (Math.abs(k.y) > B - 4) k.y = U.clamp(k.y, -B + 4, B - 4);
      for (const a of this.allies || []) if (Math.abs(a.y) > B) a.y = U.clamp(a.y, -B, B);
      if (this.well) this.well.y = U.clamp(this.well.y, -B + 20, B - 20);
      if (this.hex) this.hex.y = U.clamp(this.hex.y, -B + 20, B - 20);
    }
    if (this.stage.vault) {
      // the Reliquary: every few minutes the torment deepens and new foes come harder-skinned
      const lvl = Math.min(C.VAULT.max, Math.floor(this.time / (C.VAULT.every * this.runLength / C.RUN_LENGTH)));
      if (lvl > this.vaultLevel) { this.vaultLevel = lvl; DH.events.emit('run:warning', t('hud.vaultLevel', { n: lvl })); DH.audio.play('roar'); this.shake = Math.max(this.shake, 4); }
      // the sealed Lord waits, chained to its pylons
      for (const b of this.bosses) if (b && b.sealed) {
        b.x = b.sealX; b.y = b.sealY; b.kx = b.ky = 0;
        if (!this.pylons.some((q) => !q.dead)) {
          b.sealed = false; b.spd = b.spd0; this.whiteFlash = 0.6; this.shake = 8;
          this.burst(b.x, b.y, 50, ['#fff0a0', '#ffffff', '#c89030'], 140); DH.audio.play('boom');
          DH.events.emit('run:boss', { name: t('hud.unsealed'), final: true });
        }
      }
      for (const q of this.pylons) if (!q.dead) { q.x = q.ax; q.y = q.ay; q.kx = q.ky = 0; }
    }
  };

  /** Hall-specific tweaks to a freshly spawned enemy. */
  R.hallSpawn = function (e) {
    if (this.stage.vault && this.vaultLevel && !e.def.prop) e.armor = Math.min(0.85, e.armor + C.VAULT.def * this.vaultLevel);
    if (this.bridge && !e.def.fly) e.y = this.onBridge(e.y, 4);
  };

  /** The Reliquary's final Lord arrives sealed; four pylons hold the seal. */
  R.sealLord = function (lord) {
    lord.sealed = true; lord.spd0 = lord.spd; lord.spd = 0; lord.sealX = lord.x; lord.sealY = lord.y;
    this.pylons = [];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + Math.PI / 4, q = this.spawnEnemy('pylon', lord.x + Math.cos(a) * C.VAULT.pylonDist, lord.y + Math.sin(a) * C.VAULT.pylonDist);
      if (!q) continue;
      this.lmFree(q, 14);
      q.hp = q.maxHp = lord.maxHp * C.VAULT.pylonHp; q.ax = q.x; q.ay = q.y; q.elite = true;
      this.pylons.push(q);
    }
    DH.events.emit('run:warning', t('hud.sealed'));
  };

  /** World-space layer drawn right after the floor: the chasm around the bridge, the seal's chains of light. */
  R.drawHall = function (g, cx, cy, W, H, now) {
    if (this.bridge) {
      const B = this.bridge, T = this.stage.theme;
      const top = -B - cy, bot = B - cy;
      const dark = 'rgb(' + T.dark.join(',') + ')';
      const chasm = (y0, y1, dir) => {
        if (y1 <= 0 || y0 >= H) return;
        const gr = g.createLinearGradient(0, dir > 0 ? y0 : y1, 0, dir > 0 ? y0 + 90 : y1 - 90);
        gr.addColorStop(0, 'rgba(20,40,44,0.92)'); gr.addColorStop(0.35, dark); gr.addColorStop(1, '#010203');
        g.fillStyle = gr; g.fillRect(0, Math.max(0, y0), W, Math.min(H, y1) - Math.max(0, y0));
        // far-below water glints
        g.fillStyle = 'rgba(110,220,200,0.08)';
        for (let i = 0; i < 6; i++) { const x = ((i * 97 + Math.floor(cx * 0.4)) % (W + 40) + W + 40) % (W + 40) - 20, y = dir > 0 ? y0 + 60 + (i % 3) * 30 : y1 - 60 - (i % 3) * 30; g.fillRect(x, y + Math.sin(now + i) * 2, 14, 1); }
      };
      chasm(-1e4, top, -1); chasm(bot, 1e4, 1);
      // parapet stones along both edges, broken here and there
      for (const [y, s] of [[top, -1], [bot, 1]]) {
        if (y < -8 || y > H + 8) continue;
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, y + (s > 0 ? 0 : -3), W, 3);
        const x0 = -((cx % 12) + 12) % 12;
        for (let x = x0 - 12; x < W + 12; x += 12) {
          const wx = Math.floor((x + cx) / 12); if ((wx * 7919) % 11 === 0) continue;
          g.fillStyle = (wx & 1) ? '#5a6a6c' : '#4a585a'; g.fillRect(Math.round(x), Math.round(y - (s > 0 ? 0 : 5)), 11, 5);
          g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(Math.round(x), Math.round(y - (s > 0 ? 0 : 5)), 11, 1);
        }
      }
    }
    if (this.pylons.length) {
      for (const b of this.bosses) if (b && b.sealed) for (const q of this.pylons) if (!q.dead) {
        g.strokeStyle = 'rgba(255,220,120,' + (0.35 + Math.sin(now * 6 + q.ax) * 0.2) + ')'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(q.x - cx, q.y - cy - 10); g.lineTo(b.x - cx, b.y - cy - 8); g.stroke();
      }
    }
  };

  /* ---------------- The Dissonator (Halls of Discord) ---------------- */
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // east, south, west, north: +1 turns clockwise on screen
  R.initDissonator = function () {
    const D = C.DISSO, G = D.step;
    // the light source waits a short walk from the spawn; relays follow a winding path on a grid
    for (let tries = 0; tries < 60; tries++) {
      const a = Math.floor(Math.random() * 4), sx = DIRS[a][0] * D.srcDist + U.rand(-60, 60), sy = DIRS[a][1] * D.srcDist + U.rand(-60, 60);
      const nodes = [{ x: sx, y: sy }], used = new Set(['0,0']);
      let gx = 0, gy = 0, dir = a, ok = true;
      for (let i = 0; i <= D.relays; i++) { // relays + the monolith
        const opts = [dir, (dir + 1) % 4, (dir + 3) % 4].filter((d) => !used.has((gx + DIRS[d][0]) + ',' + (gy + DIRS[d][1])) && Math.hypot(sx + (gx + DIRS[d][0]) * G, sy + (gy + DIRS[d][1]) * G) > D.srcDist * 0.6);
        if (!opts.length) { ok = false; break; }
        dir = i === 0 ? a : U.pick(opts.concat(opts.includes(dir) ? [] : [])); if (i === 0 && !opts.includes(a)) { ok = false; break; }
        gx += DIRS[dir][0]; gy += DIRS[dir][1]; used.add(gx + ',' + gy);
        nodes.push({ x: sx + gx * G, y: sy + gy * G, inDir: dir });
      }
      if (!ok) continue;
      const relays = nodes.slice(1, -1).map((n, i) => {
        const want = nodes[i + 2].inDir; let d = Math.floor(Math.random() * 4); if (d === want) d = (d + 1 + Math.floor(Math.random() * 3)) % 4;
        return { x: n.x, y: n.y, want, dir: d, armed: true, spin: 0 };
      });
      const m = nodes[nodes.length - 1];
      this.disso = { src: { x: sx, y: sy, dir: nodes[1].inDir }, relays, mono: { x: m.x, y: m.y }, solved: false, found: false, pulseT: D.pulse, bolts: [] };
      return;
    }
    this.disso = null;
  };
  /** Index of the first relay that is still turned the wrong way (relays.length when solved). */
  R.dissoFirstWrong = function () { const r = this.disso.relays; let i = 0; while (i < r.length && r[i].dir === r[i].want) i++; return i; };

  R.updateDissonator = function (dt) {
    const Z = this.disso, p = this.player, D = C.DISSO; if (!Z) return;
    const near = (o, r) => U.dist2(o.x, o.y, p.x, p.y) < r * r;
    if (!Z.found && (near(Z.src, 260) || Z.relays.some((q) => near(q, 200)))) { Z.found = true; DH.events.emit('run:warning', t('hud.dissoFound')); }
    for (const q of Z.relays) {
      q.spin = Math.max(0, q.spin - dt * 6);
      if (Z.solved) continue;
      if (q.armed && near(q, D.touch)) {
        q.armed = false; q.dir = (q.dir + 1) % 4; q.spin = 1; DH.audio.play('block');
        this.burst(q.x, q.y - 6, 8, ['#d8a0ff', '#ffffff'], 40);
      } else if (!q.armed && !near(q, D.touch + 12)) q.armed = true;
    }
    if (!Z.solved && this.dissoFirstWrong() === Z.relays.length) {
      Z.solved = true; this.dissoSolved = true; if (this.secretT == null) this.secretT = this.time; this.whiteFlash = 0.5; this.shake = 6; DH.audio.play('roar');
      this.burst(Z.mono.x, Z.mono.y - 20, 50, ['#d8a0ff', '#ffffff', '#8a40ff'], 120);
      DH.events.emit('run:boss', { name: t('hud.dissoSolved'), final: false, hex: true });
    }
    // the awakened Monolith pulses: it scourges the Lord of Discord and burns the horde around it
    if (Z.solved) {
      Z.pulseT -= dt;
      if (Z.pulseT <= 0) {
        Z.pulseT = D.pulse;
        const lord = this.bosses.find((b) => b && !b.dead && b.def.lord);
        if (lord) { const dmg = lord.maxHp * D.lordDmg; lord.hp -= dmg; lord.flash = 0.2; this.text(lord.x, lord.y - lord.r - 10, Math.round(dmg), '#e0a0ff', true); Z.bolts.push({ x: lord.x, y: lord.y - 10, life: 0.4 }); if (lord.hp <= 0) this.killEnemy(lord); }
        for (const e of this.enemies) if (!e.dead && !e.boss && !e.def.prop && U.dist2(e.x, e.y, Z.mono.x, Z.mono.y) < D.radius * D.radius) this.rawDamage(e, e.maxHp * D.hordeDmg, '#e0a0ff');
        this.fx.push({ k: 'ring', x: Z.mono.x, y: Z.mono.y - 10, life: 0.5, max: 0.5, r0: 8, r1: D.radius, color: '#c070ff' });
        DH.audio.play('zap');
      }
    }
    for (let i = Z.bolts.length - 1; i >= 0; i--) if ((Z.bolts[i].life -= dt) <= 0) Z.bolts.splice(i, 1);
  };

  /** Drawn in the entity pass: pedestals with golden arrows, the source, the Monolith and the beam. */
  R.drawDissonator = function (g, cx, cy, W, H, now, lights) {
    const Z = this.disso; if (!Z) return;
    const vis = (o, m) => o.x - cx > -m && o.y - cy > -m && o.x - cx < W + m && o.y - cy < H + m;
    const lit = Z.solved ? Z.relays.length : this.dissoFirstWrong();
    // beam segments: source -> relay 0 -> ... ; the first wrong relay throws its light astray
    const beam = (x0, y0, x1, y1, a) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(170,90,255,' + 0.35 * a + ')'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 - cx, y0 - cy - 8); g.lineTo(x1 - cx, y1 - cy - 8); g.stroke();
      g.strokeStyle = 'rgba(255,230,255,' + 0.9 * a + ')'; g.lineWidth = 1.5; g.stroke(); g.restore();
    };
    beam(Z.src.x, Z.src.y, Z.relays[0].x, Z.relays[0].y, 0.8 + Math.sin(now * 8) * 0.2);
    for (let k = 0; k < Z.relays.length; k++) {
      const q = Z.relays[k], nx = k + 1 < Z.relays.length ? Z.relays[k + 1] : Z.mono;
      if (k < lit) { beam(q.x, q.y, nx.x, nx.y, 0.8 + Math.sin(now * 8 + k) * 0.2); continue; }
      const d = DIRS[q.dir]; beam(q.x, q.y, q.x + d[0] * C.DISSO.step * 0.55, q.y + d[1] * C.DISSO.step * 0.55, 0.45); // thrown astray
      break;
    }
    // pedestals
    Z.relays.forEach((q, i) => {
      lights.push({ x: q.x, y: q.y - 8, r: i <= lit ? 40 : 22, kind: 'magic' });
      if (!vis(q, 40)) return;
      const x = q.x - cx, y = q.y - cy;
      this.sprite(g, 'relay', null, i <= lit ? 1 : 0, x, y, false, 1);
      // golden arrow on the plate: where the light must go
      const w = DIRS[q.want]; g.fillStyle = q.dir === q.want ? '#ffe070' : 'rgba(255,208,80,' + (0.55 + Math.sin(now * 5) * 0.25) + ')';
      g.beginPath(); g.moveTo(x + w[0] * 13, y + 3 + w[1] * 7); g.lineTo(x + w[0] * 8 - w[1] * 3, y + 3 + w[1] * 4 + w[0] * 2); g.lineTo(x + w[0] * 8 + w[1] * 3, y + 3 + w[1] * 4 - w[0] * 2); g.closePath(); g.fill();
      // the prism's face: where the light goes now
      const d = DIRS[q.dir], sp = q.spin * 0.6, ca = Math.cos(sp), sa = Math.sin(sp), fx = d[0] * ca - d[1] * sa, fy = d[0] * sa + d[1] * ca;
      g.strokeStyle = i <= lit ? '#ffe8ff' : '#9a70c0'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - 9); g.lineTo(x + fx * 6, y - 9 + fy * 4); g.stroke();
    });
    // the source and the Monolith
    lights.push({ x: Z.src.x, y: Z.src.y - 8, r: 60, kind: 'magic' });
    if (vis(Z.src, 40)) this.sprite(g, 'lightsrc', null, Math.sin(now * 3.2) > 0 ? 1 : 0, Z.src.x - cx, Z.src.y - cy, false, 1);
    lights.push({ x: Z.mono.x, y: Z.mono.y - 20, r: Z.solved ? 90 : 30, kind: 'magic' });
    if (vis(Z.mono, 60)) {
      this.sprite(g, 'monolith', null, Z.solved ? 1 : 0, Z.mono.x - cx, Z.mono.y - cy, false, 1);
      if (Z.solved && Math.random() < 0.4) this.parts.push({ x: Z.mono.x + U.rand(-6, 6), y: Z.mono.y - U.rand(10, 40), vx: 0, vy: -18, life: 0.6, max: 0.6, c: '#d0a0ff', s: 1 });
    }
    for (const b of Z.bolts) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(220,160,255,' + b.life * 2 + ')'; g.lineWidth = 2; g.beginPath(); g.moveTo(Z.mono.x - cx, Z.mono.y - cy - 30);
      for (let k = 1; k <= 6; k++) { const t0 = k / 6; g.lineTo(Z.mono.x - cx + (b.x - Z.mono.x) * t0 + U.rand(-6, 6), Z.mono.y - cy - 30 + (b.y - Z.mono.y + 30) * t0 + U.rand(-6, 6)); } g.stroke(); g.restore(); }
  };
})(window.DH);
