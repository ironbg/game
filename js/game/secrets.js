/* Hall secrets (mixed into DH.Run.prototype), one chain per hall.
 * Every chain starts with a page lying somewhere in the hall; picking it up reveals the way on:
 *   crypt      Bloodstained Page -> two Altars of Pain: slay foes inside each ritual circle.
 *              The two halves make the Protective Pendant, which strikes the Lord for half its life.
 *   abyss      Scorched Page -> skeleton statues point from one to the next -> the Altar of Embers
 *              and its Ember Eye -> the Eye's glow leads to a hidden Cyclops. It drops the Cracked
 *              Ember Eye: the Lord's bombs and flames cannot touch you.
 *   aqueduct   Torn Page -> a raven: scare it (a burst of speed) and follow it along the viaduct
 *              until it lands on a sarcophagus. Break it for the Sentinel Orb: the Lord can no
 *              longer turn ethereal (invulnerable).
 *   catacombs  Frosted Page -> four glowing orbs -> the Frost Ghoul Lieutenant. It drops the Hating
 *              Heart: the Lord's attacks turn predictable and its guard drops every few seconds.
 *   blightmire Rooted Page -> glowing roots -> the Evil Tree. Felling it opens a rift where the
 *              Blight Worm hides; slaying it always yields a Lament Shard.
 * The Halls of Discord keep their light puzzle (halls.js) and the Sealed Reliquary its Lord's Hex. */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  C.SECRET = {
    kinds: { crypt: 'altars', abyss: 'statues', aqueduct: 'raven', catacombs: 'orbs', blightmire: 'roots' },
    pageDist: [900, 1300], step: [520, 760], touch: 18,
    altarR: 80, altarKills: 40, statues: 3, ravenHops: 3, orbs: 4, roots: 3,
    pendant: 0.5,                        // the Pendant takes half of the Lord's life
    heartEvery: 12, heartExposed: 3.5,   // Hating Heart: the Lord's guard drops for 3.5 s every 12 s
    ethEvery: 11, ethDur: 3,             // the Wraith Horseman turns ethereal for 3 s every 11 s (unless the Sentinel Orb)
    boss: { statues: 'cyclops', orbs: 'ghoullt', roots: 'blightworm' },
    target: { raven: 'sarcophagus', roots: 'eviltree' },
  };

  R.initSecret = function () {
    const S = C.SECRET, kind = S.kinds[this.stageId];
    this.sec = null;
    if (!kind) return;
    this.hex = null; // this hall has its own secret instead of the Lord's Hex
    const a = Math.random() * TAU;
    this.sec = { kind, step: 'page', dir: a, page: this.secPoint({ x: 0, y: 0 }, a, U.rand(S.pageDist[0], S.pageDist[1])), nodes: [], cur: 0, target: null, raven: null, found: false };
  };

  /** A point d away from `from` roughly along `ang`; on the viaduct it follows the bridge. */
  R.secPoint = function (from, ang, d) {
    if (this.bridge) { const s = Math.cos(ang) >= 0 ? 1 : -1; return { x: from.x + s * d, y: U.rand(-this.bridge + 26, this.bridge - 26) }; }
    return { x: from.x + Math.cos(ang) * d, y: from.y + Math.sin(ang) * d };
  };
  const stepD = () => U.rand(C.SECRET.step[0], C.SECRET.step[1]);

  /** A chain of n nodes winding onwards from `from`. */
  R.secTrail = function (from, n, type) {
    const out = []; let p = from, a = this.sec.dir;
    for (let i = 0; i < n; i++) { a += U.rand(-0.7, 0.7); p = this.secPoint(p, a, stepD()); out.push({ x: p.x, y: p.y, type, done: false }); }
    this.sec.dir = a;
    return out;
  };

  R.secWarn = function (key, args) { DH.events.emit('run:warning', t('sec.' + key, args)); };

  /** The page is picked up: the chain of this hall is revealed. */
  R.secReveal = function () {
    const Z = this.sec, S = C.SECRET, p = Z.page;
    Z.page.taken = true; DH.audio.play('reward');
    this.burst(p.x, p.y, 20, ['#ffffff', '#f0e2c0'], 60);
    if (Z.kind === 'altars') {
      Z.nodes = [-1, 1].map((s) => { const q = this.secPoint(p, Z.dir + s * U.rand(0.7, 1.1), stepD()); return { x: q.x, y: q.y, type: 'altar', kills: 0, done: false }; });
      Z.step = 'altars';
    } else if (Z.kind === 'statues') {
      Z.nodes = this.secTrail(p, S.statues, 'statue'); const last = this.secPoint(Z.nodes[Z.nodes.length - 1], Z.dir, stepD());
      Z.nodes.push({ x: last.x, y: last.y, type: 'emberaltar', done: false }); Z.step = 'trail';
    } else if (Z.kind === 'raven') {
      const q = this.secPoint(p, Z.dir, 90); Z.raven = { x: q.x, y: q.y, hops: 0, fly: null }; Z.step = 'raven';
    } else if (Z.kind === 'orbs') { Z.nodes = this.secTrail(p, S.orbs, 'wisp'); Z.step = 'trail'; }
    else if (Z.kind === 'roots') { Z.nodes = this.secTrail(p, S.roots, 'root'); Z.step = 'trail'; }
    Z.cur = 0;
    this.secWarn('page.' + Z.kind);
  };

  /** Spawn the chain's guardian (a mini-boss) or its breakable (sarcophagus, Evil Tree). */
  R.secSpawn = function (id, x, y, boss) {
    const e = this.spawnEnemy(id, x, y, boss ? { boss: true } : {});
    if (!e) return null;
    e.keep = true; e.secret = true; e.ax = x; e.ay = y;
    if (e.def.scale) e.scale = e.def.scale;
    if (boss) { this.bosses.push(e); DH.audio.play('roar'); this.shake = 6; DH.events.emit('run:boss', { name: t('enemy.' + id), final: false, sub: t('sec.guardian') }); }
    this.sec.target = e;
    return e;
  };

  R.secReward = function () {
    const Z = this.sec; if (Z.step === 'done') return;
    Z.step = 'done'; this.secretDone = true; if (this.secretT == null) this.secretT = this.time;
    this.whiteFlash = 0.5; this.shake = 6; DH.audio.play('chest');
    const p = this.player; this.burst(p.x, p.y - 10, 40, ['#ffe070', '#ffffff', '#c060ff'], 110);
    const k = Z.kind;
    if (k === 'altars') this.pendant = { fired: false, t: 0 };
    else if (k === 'statues') this.crackedEye = true;
    else if (k === 'raven') this.sentinel = true;
    else if (k === 'orbs') this.hatingHeart = true;
    else if (k === 'roots') { this.shards++; this.text(p.x, p.y - 18, t('hud.shard'), '#ff70c0', true); }
    DH.events.emit('run:boss', { name: t('sec.relic.' + k), final: false, hex: true, sub: t('sec.relicSub.' + k) });
  };

  /** Every kill: the Altars of Pain drink the deaths inside their circles; guardians and breakables end their step. */
  R.secretKill = function (e) {
    const Z = this.sec; if (!Z || Z.step === 'done') return;
    if (Z.step === 'altars') {
      const S = C.SECRET;
      for (const q of Z.nodes) if (!q.done && U.dist2(e.x, e.y, q.x, q.y) < S.altarR * S.altarR) {
        q.kills++;
        if (q.kills >= S.altarKills) {
          q.done = true; DH.audio.play('roar'); this.burst(q.x, q.y - 8, 30, ['#ff3040', '#ffffff', '#5a0010'], 90);
          if (Z.nodes.every((n) => n.done)) this.secReward(); else this.secWarn('halfPendant');
        }
      }
      return;
    }
    if (e !== Z.target) return;
    Z.target = null;
    if (Z.step === 'break' && Z.kind === 'roots') { // the felled tree opens a rift: the Blight Worm crawls out
      Z.step = 'rift'; Z.rift = { x: e.x, y: e.y, t: 0 }; this.shake = 8; DH.audio.play('boom'); this.secWarn('rift');
      this.after(1.4, () => { if (this.sec && this.sec.step === 'rift') { this.sec.step = 'boss'; this.secSpawn(C.SECRET.boss.roots, e.x, e.y, true); } });
      return;
    }
    this.secReward();
  };

  R.updateSecret = function (dt) {
    const Z = this.sec, p = this.player, S = C.SECRET;
    if (Z && Z.step !== 'done' && this.state === 'playing') {
      const near = (o, r) => U.dist2(o.x, o.y, p.x, p.y) < r * r;
      if (!Z.found && near(Z.page, 300)) { Z.found = true; this.secWarn('pageNear'); }
      if (Z.step === 'page' && near(Z.page, S.touch)) this.secReveal();
      else if (Z.step === 'trail') {
        const q = Z.nodes[Z.cur];
        if (q && near(q, S.touch + 6)) {
          q.done = true; Z.cur++; DH.audio.play('reward'); this.burst(q.x, q.y - 8, 16, ['#ffffff', '#ffe070'], 60);
          if (Z.cur >= Z.nodes.length) { // end of the trail
            const g = this.secPoint(q, Z.dir, stepD());
            if (Z.kind === 'roots') { Z.step = 'break'; this.secSpawn(S.target.roots, g.x, g.y, false); this.secWarn('tree'); }
            else { Z.step = 'boss'; if (Z.kind === 'statues') this.secWarn('eye'); this.secSpawn(S.boss[Z.kind], g.x, g.y, true); }
          }
        }
      } else if (Z.step === 'raven') {
        const rv = Z.raven;
        if (rv.fly) {
          rv.fly.t += dt; const k = Math.min(1, rv.fly.t / rv.fly.d);
          rv.x = rv.fly.x0 + (rv.fly.x1 - rv.fly.x0) * k; rv.y = rv.fly.y0 + (rv.fly.y1 - rv.fly.y0) * k - Math.sin(k * Math.PI) * 40;
          if (k >= 1) { rv.fly = null; if (rv.hops > S.ravenHops) { Z.step = 'break'; this.secSpawn(S.target.raven, rv.x, rv.y + 14, false); this.secWarn('sarcophagus'); } }
        } else if (near(rv, 70)) { // scared: it flies on, and the hero gets a burst of speed chasing it
          rv.hops++; this.buff('haste'); DH.audio.play('swing');
          const to = this.secPoint(rv, Z.dir, stepD());
          rv.fly = { x0: rv.x, y0: rv.y, x1: to.x, y1: to.y, t: 0, d: 1.6 };
          for (let i = 0; i < 6; i++) this.parts.push({ x: rv.x, y: rv.y - 4, vx: U.rand(-30, 30), vy: U.rand(-40, -10), life: 0.6, max: 0.6, c: '#141420', s: 1 });
        }
      }
      if (Z.target && !Z.target.dead && !Z.target.boss) { const e = Z.target; e.x = e.ax; e.y = e.ay; e.kx = e.ky = 0; } // breakables stay put
      if (Z.rift) Z.rift.t += dt;
    }
    // relic effects on the Lord
    const lords = this.bosses.filter((b) => b && !b.dead && b.def.lord);
    if (this.pendant && !this.pendant.fired) {
      const lord = lords.find((b) => b.final && !b.sealed && (b.alive || 0) > 2);
      if (lord) {
        this.pendant.fired = true; DH.audio.play('zap');
        this.pendant.bolt = { x0: p.x, y0: p.y - 8, lord, t: 0 };
        this.after(0.5, () => {
          if (lord.dead) return;
          const dmg = lord.hp * S.pendant; lord.hp -= dmg; lord.flash = 0.3; this.shake = 8; this.whiteFlash = 0.4; DH.audio.play('boom');
          this.burst(lord.x, lord.y - 10, 40, ['#ff3040', '#ffffff', '#ffe070'], 120);
          this.text(lord.x, lord.y - lord.r - 12, Math.round(dmg), '#ff5060', true);
          DH.events.emit('run:warning', t('sec.pendantStrike'));
        });
      }
    }
    if (this.pendant && this.pendant.bolt) { const b = this.pendant.bolt; b.t += dt; if (b.t > 0.5) this.pendant.bolt = null; }
    if (this.hatingHeart) for (const b of lords) {
      b.hhT = (b.hhT || 0) + dt; b.exposed = Math.max(0, (b.exposed || 0) - dt);
      if (b.hhT >= S.heartEvery) { b.hhT = 0; b.exposed = S.heartExposed; this.text(b.x, b.y - b.r - 14, t('sec.exposed'), '#ff8080', true); DH.audio.play('block'); }
    }
  };

  /** Is this foe untouchable right now (the Wraith Horseman's ethereal phase)? */
  R.isImmune = function (e) { return e.eth > 0; };

  /** Drawn in the entity pass. */
  R.drawSecret = function (g, cx, cy, W, H, now, lights) {
    const br = 0.8 + 0.3 * (0.5 + 0.5 * Math.sin(this.time * 3.2)); // secret lights pulse slowly
    const Z = this.sec; if (!Z) return;
    const v = this.stage.variant, S = C.SECRET;
    const vis = (o, m) => o.x - cx > -m && o.y - cy > -m && o.x - cx < W + m && o.y - cy < H + m;
    if (!Z.page.taken && vis(Z.page, 20)) {
      this.sprite(g, 'page', v, (Math.sin(now * 3.2) > 0 ? 1 : 0), Z.page.x - cx, Z.page.y - cy - 3 + Math.sin(now * 3) * 1.5, false, 1);
      lights.push({ x: Z.page.x, y: Z.page.y, r: br * (30), kind: 'magic' });
    }
    Z.nodes.forEach((q, i) => {
      const active = Z.step === 'altars' ? !q.done : i === Z.cur;
      const revealed = Z.step === 'altars' || i <= Z.cur || q.done;
      if (!revealed || !vis(q, S.altarR + 20)) return;
      const x = q.x - cx, y = q.y - cy;
      if (q.type === 'altar') {
        // the ritual circle and how many deaths it still thirsts for
        g.save(); g.strokeStyle = q.done ? 'rgba(255,80,90,0.25)' : 'rgba(255,40,60,' + (0.45 + Math.sin(now * 4) * 0.15) + ')'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
        g.beginPath(); g.ellipse(x, y, S.altarR, S.altarR * 0.6, 0, 0, TAU); g.stroke(); g.setLineDash([]);
        if (!q.done) { g.strokeStyle = '#ff5060'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(x, y, S.altarR, S.altarR * 0.6, 0, -Math.PI / 2, -Math.PI / 2 + TAU * q.kills / S.altarKills); g.stroke(); }
        g.restore();
        this.sprite(g, 'altar', null, q.done ? 0 : (Math.sin(now * 3.2) > 0 ? 1 : 0), x, y, false, 1, false, q.done ? 0.6 : 1);
        lights.push({ x: q.x, y: q.y - 8, r: br * (q.done ? 20 : 50), kind: 'fire' });
      } else if (q.type === 'statue') {
        this.sprite(g, 'statue', null, 0, x, y, false, 1);
        const nx = Z.nodes[i + 1]; // the statue points the way
        if (nx && (active || q.done)) { const a = Math.atan2(nx.y - q.y, nx.x - q.x); g.fillStyle = 'rgba(255,140,40,' + (0.6 + Math.sin(now * 5) * 0.3) + ')'; g.beginPath(); g.moveTo(x + Math.cos(a) * 20, y - 14 + Math.sin(a) * 20); g.lineTo(x + Math.cos(a + 2.6) * 8, y - 14 + Math.sin(a + 2.6) * 8); g.lineTo(x + Math.cos(a - 2.6) * 8, y - 14 + Math.sin(a - 2.6) * 8); g.closePath(); g.fill(); }
        lights.push({ x: q.x, y: q.y - 18, r: br * (26), kind: 'fire' });
      } else if (q.type === 'emberaltar') {
        this.sprite(g, 'altar', 'fire', q.done ? 0 : (Math.sin(now * 3.2) > 0 ? 1 : 0), x, y, false, 1);
        lights.push({ x: q.x, y: q.y - 8, r: br * (50), kind: 'torch' });
      } else if (q.type === 'wisp' && !q.done) {
        this.sprite(g, 'wisp', v === 'bog' ? 'bog' : null, (Math.sin(now * 3.2) > 0 ? 1 : 0), x, y + Math.sin(now * 2 + i) * 2, false, 1);
        lights.push({ x: q.x, y: q.y - 8, r: br * (44), kind: 'magic' });
      } else if (q.type === 'root') {
        this.sprite(g, 'root', null, q.done ? 0 : (Math.sin(now * 3.2) > 0 ? 1 : 0), x, y, false, 1, false, q.done ? 0.5 : 1);
        lights.push({ x: q.x, y: q.y, r: br * (q.done ? 16 : 36), kind: 'magic' });
      }
    });
    if (Z.raven && Z.step === 'raven') {
      lights.push({ x: Z.raven.x, y: Z.raven.y - 6, r: br * (40), kind: 'magic' });
      if (vis(Z.raven, 30)) this.sprite(g, 'raven', null, Z.raven.fly ? Math.floor(now * 10) % 2 : 0, Z.raven.x - cx, Z.raven.y - cy, Z.raven.fly ? Z.raven.fly.x1 < Z.raven.fly.x0 : false, 1.6);
    }
    if (Z.rift && vis(Z.rift, 40)) { const k = Math.min(1, Z.rift.t / 1.2); g.fillStyle = 'rgba(10,14,4,0.85)'; g.beginPath(); g.ellipse(Z.rift.x - cx, Z.rift.y - cy, 22 * k, 8 * k, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(176,255,80,0.6)'; g.lineWidth = 1; g.stroke(); }
    if (this.pendant && this.pendant.bolt) {
      const b = this.pendant.bolt, k = Math.min(1, b.t / 0.5), x = b.x0 + (b.lord.x - b.x0) * k - cx, y = b.y0 + (b.lord.y - 10 - b.y0) * k - cy;
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,90,100,0.9)'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 2, 0, TAU); g.fill(); g.restore();
    }
  };

  /** Off-screen arrows for the secret's next step. */
  R.secretMarks = function (mark) {
    const Z = this.sec; if (!Z || Z.step === 'done') return;
    const v = this.stage.variant;
    if (!Z.page.taken) { mark(Z.page.x, Z.page.y, '#f0e2c0', 'page', v); return; }
    if (Z.step === 'altars') { for (const q of Z.nodes) if (!q.done) mark(q.x, q.y, '#ff4050', 'altar'); }
    else if (Z.step === 'trail') { const q = Z.nodes[Z.cur]; if (q) mark(q.x, q.y, '#ffe070', q.type === 'emberaltar' ? 'altar' : q.type, q.type === 'emberaltar' ? 'fire' : q.type === 'wisp' && v === 'bog' ? 'bog' : null); }
    else if (Z.step === 'raven') mark(Z.raven.x, Z.raven.y, '#9aa0b8', 'raven');
    else if (Z.step === 'break' && Z.target && !Z.target.dead) mark(Z.target.x, Z.target.y, '#ffe070', Z.target.painter);
  };
})(window.DH);
