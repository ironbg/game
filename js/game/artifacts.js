/* Artifact run modifiers (mixed into DH.Run.prototype). Stat-style effects are applied where the stat is
 * computed (combat.recompute / computeAbility / spawnEnemy / hurtPlayer); timed world events live here. */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content, E = DH.economy;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  R.initArtifacts = function () {
    const fx = this.fx_;
    this.art = { magmaT: 3, trapT: 2, starT: 1.5, idolT: 20, gazeT: 3, boggedAt: 0, selfSlow: 0, slowT: 0, pFragile: 0, fragT: 0, moved: 0, pburn: null,
      treasure: [] };
    if (fx.thread) this.art.threadAt = 240;
    if (fx.pendulum) this.art.pendAt = U.rand(150, 360);
    // Lament shards and loot use Torment Rank; XP gets +5% per rank
    this.tormentXp = 1 + this.dread * E.TORMENT.xp;
  };

  /** Chests that appear at a spot away from the hero, with an off-screen marker. */
  R.spawnTreasure = function (kind) {
    const p = this.player, a = Math.random() * TAU, d = 190;
    const k = { type: 'chest_red', sub: kind, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, val: 1, vx: 0, vy: 0, z: 0, vz: 0, mag: false, t: 1, cluster: false };
    this.pickups.push(k); this.art.treasure.push(k);
    DH.events.emit('run:warning', t(kind === 'thread' ? 'hud.thread' : 'hud.pendulum'));
  };

  R.updateArtifacts = function (dt) {
    const fx = this.fx_, A = this.art, p = this.player, st = this.stage;
    if (!A) return;
    const dm = st.dmgMult * (1 + this.time / 60 * 0.07), hm = st.hpMult * (1 + this.time / 60 * 0.22);
    const near = (r0, r1) => { const a = Math.random() * TAU, d = U.rand(r0, r1); return { x: p.x + Math.cos(a) * d + p.dirX * (p.moving ? 30 : 0), y: p.y + Math.sin(a) * d + p.dirY * (p.moving ? 30 : 0) }; };
    const hurtEnemies = (x, y, r, dmg) => { for (const e of this.enemies) if (!e.dead && !e.def.prop && U.dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) this.rawDamage(e, e.boss ? dmg * 0.3 : dmg, '#ffb060'); };
    if (this.victoryT <= 0) {
      // Magma Urn: lava bursts near you that burn you and the horde alike
      if (fx.magma && (A.magmaT -= dt) <= 0) {
        A.magmaT = 3.2; const q = near(10, 70);
        this.hazard({ kind: 'circle', x: q.x, y: q.y, r: 24, delay: 1.1, dmg: 14 * dm, color: '#ff5a14', sound: 'boom',
          onFire: (run, h) => { hurtEnemies(h.x, h.y, h.r, 40 * hm); run.fx.push({ k: 'explosion', x: h.x, y: h.y, R: h.r, life: 0.4, max: 0.4 }); for (let i = 0; i < 8; i++) run.gpart({ x: h.x, y: h.y, vx: U.rand(-60, 60), vy: U.rand(-120, -40), g: 220, life: 0.8, max: 0.8, c: '#ff7020', r: 1.1, core: '#ffe080' }); } });
      }
      // Trickster's Bell: spike traps snap shut on your path
      if (fx.traps && (A.trapT -= dt) <= 0) {
        A.trapT = 2.2; const q = near(20, 60);
        this.hazard({ kind: 'circle', x: q.x, y: q.y, r: 12, delay: 0.8, dmg: 10 * dm, color: '#dcdce6', sound: 'block', onFire: (run, h) => hurtEnemies(h.x, h.y, h.r, 20 * hm) });
      }
      // Fallen Star: crystals rain from the ceiling
      if (fx.star && (A.starT -= dt) <= 0) {
        A.starT = 1.1; const q = near(0, 110);
        this.hazard({ kind: 'circle', x: q.x, y: q.y, r: 14, delay: 0.9, dmg: 9 * dm, color: '#78c8ff', sound: 'glass',
          onFire: (run, h) => { hurtEnemies(h.x, h.y, h.r, 30 * hm); for (let i = 0; i < 6; i++) run.gpart({ x: h.x, y: h.y, vx: U.rand(-70, 70), vy: U.rand(-70, 20), g: 150, life: 0.5, max: 0.5, c: '#80d8ff', r: 1, core: '#ffffff' }); } });
      }
      // Mountain Idol: huge, slow, very tough brutes
      if (fx.idol && (A.idolT -= dt) <= 0) {
        A.idolT = 22; const pt = this.edgePoint(); const e = this.spawnEnemy('golem', pt.x, pt.y);
        if (e) { e.scale = 2.1; e.r *= 1.7; e.hp *= 6; e.maxHp *= 6; e.spd *= 0.55; e.xp *= 8; e.mass *= 6; }
      }
      // Watcher's Eye: extra ranged cultists all run
      if (fx.gaze && (A.gazeT -= dt) <= 0) { A.gazeT = 2.4; const pt = this.edgePoint(); this.spawnEnemy('cultist', pt.x, pt.y); }
      // Bog Effigy: every 500 kills the bog invades
      if (fx.bog && this.kills - A.boggedAt >= 500) {
        A.boggedAt = this.kills; DH.events.emit('run:warning', t('hud.bog'));
        const a = Math.random() * TAU, d = 170;
        for (let i = 0; i < 30; i++) { const e = this.spawnEnemy('ghoul', p.x + Math.cos(a) * d + U.rand(-30, 30), p.y + Math.sin(a) * d + U.rand(-30, 30)); if (e) e.variant = 'bog'; }
      }
      if (A.threadAt && this.time >= A.threadAt) { A.threadAt = 0; this.spawnTreasure('thread'); }
      if (A.pendAt && this.time >= A.pendAt) { A.pendAt = 0; this.spawnTreasure('pendulum'); }
    }
    // Demon Cube: elites and champions hurl rings of bolts
    if (fx.cube) for (const e of this.enemies) if ((e.elite || e.champion) && !e.dead) {
      e.cubeT = (e.cubeT == null ? U.rand(2, 5) : e.cubeT) - dt;
      if (e.cubeT <= 0) { e.cubeT = 5; for (let i = 0; i < 8; i++) this.enemyShot(e, i / 8 * TAU, 70, e.dmg * 0.5, '#ff4050'); }
    }
    // Urn of the Restless: vengeful ghosts expire
    for (const e of this.enemies) if (e.ttl != null && (e.ttl -= dt) <= 0 && !e.dead) { e.dead = true; this.burst(e.x, e.y, 6, ['#8a7aa8', '#3a2a4a'], 40); }
    // Siren Flute: the horde is drawn to you
    if (fx.flute) for (const e of this.enemies) if (!e.dead && !e.boss && !e.def.prop) { const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy; if (d2 < 130 * 130 && d2 > 100) { const d = Math.sqrt(d2), k = 28 / Math.sqrt(e.mass) * dt; e.x += dx / d * k; e.y += dy / d * k; } }
    // Hiltless Knife: self-slow stacks fade one at a time
    if (A.selfSlow > 0 && (A.slowT -= dt) <= 0) { A.selfSlow--; A.slowT = 2 / Math.max(1, A.selfSlow); this.recompute(); }
    // Penitent Shackle: Fragile stacks every 20 units walked, fading over time
    if (fx.selfFragile) {
      if (p.moving) { A.moved += this.P.speed * dt; if (A.moved >= 20) { A.moved -= 20; A.pFragile = Math.min(10, A.pFragile + 1); A.fragT = 1.2; } }
      if (A.pFragile > 0 && (A.fragT -= dt) <= 0) { A.pFragile--; A.fragT = 1.2; }
    }
    // Scorched Palm: the hero can burn too (never below 1 HP)
    if (A.pburn) { A.pburn.t -= dt; p.hp = Math.max(1, p.hp - A.pburn.dps * dt); if (Math.random() < 0.2) this.parts.push({ x: p.x + U.rand(-3, 3), y: p.y - 4, vx: 0, vy: -20, life: 0.4, max: 0.4, c: '#ff8a20', s: 1 }); if (A.pburn.t <= 0) A.pburn = null; }
  };

  /** Hero speed from artifacts (Hourglass, Lens, Drums, Burden Stone, Hiltless Knife). */
  R.artifactSpeed = function () {
    const fx = this.fx_; let k = (fx.allSpeed || 1) * (fx.playerSpeed || 1);
    if (fx.burden) { let n = 0; for (const sl of E.slots) if (this.runGear[sl] || DH.meta.equippedItem(sl)) n++; k *= Math.max(0.4, 1 - fx.burden * n); }
    if (this.art && this.art.selfSlow) k *= Math.pow(0.95, this.art.selfSlow);
    return k;
  };
  R.onWeaponFire = function (a) {
    this.attackAnim(a);
    if (!this.fx_.selfSlow || !this.art) return;
    this.art.selfSlow = Math.min(20, this.art.selfSlow + 1); this.art.slowT = 2 / this.art.selfSlow; this.recompute();
  };
  /** The hero's attack animation: a wind-up and a strike, quicker for fast weapons. */
  R.attackAnim = function (a) { const p = this.player, cd = a && a.s ? a.s.cd : 0.5; p.atkMax = Math.max(0.12, Math.min(0.28, (cd || 0.5) * 0.85)); p.atkT = p.atkMax; };
  R.maxAbilities = function () { return Math.max(1, C.MAX_ABILITIES - Math.round(this.fx_.lessSlots || 0)); };
})(window.DH);
