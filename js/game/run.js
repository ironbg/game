/* A single run (core). Combat maths live in combat.js, abilities in abilities.js,
 * bosses/hazards in bosses.js, drawing in render.js — all mixed into Run.prototype.
 * UI events: run:levelup, run:tome, run:loot, run:well, run:dead, run:victory, run:boss, run:warning */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content, E = DH.economy;
  const TAU = Math.PI * 2;

  class Grid {
    constructor(cell) { this.cell = cell; this.map = new Map(); this.age = 0; }
    reset() { if (++this.age > 300) { this.map.clear(); this.age = 0; } else this.map.forEach((a) => { a.length = 0; }); }
    key(cx, cy) { return (cx + 32768) * 65536 + (cy + 32768); }
    insert(e) { const k = this.key(Math.floor(e.x / this.cell), Math.floor(e.y / this.cell)); let a = this.map.get(k); if (!a) { a = []; this.map.set(k, a); } a.push(e); }
    query(x, y, r, out) {
      out.length = 0; const c = this.cell;
      const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
      for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const a = this.map.get(this.key(cx, cy)); if (a) for (let i = 0; i < a.length; i++) out.push(a[i]); }
      return out;
    }
  }
  const tmp = [];

  const URN = { painter: 'urn', hp: 1, spd: 0, dmg: 0, xp: 0, r: 5, mass: 99, ai: 'static', prop: true, touch: true };

  class Run {
    constructor(opts) {
      const S = DH.save.data;
      this.heroId = opts.hero; this.stageId = opts.stage;
      this.hero = C.heroes[this.heroId]; this.stage = C.stages[this.stageId];
      this.settings = S.settings;
      this.artifacts = DH.meta.activeArtifacts();
      this.dread = DH.meta.dreadRank();
      this.fx_ = DH.meta.artifactFx();
      this.runLength = C.RUN_LENGTH * (this.fx_.runLength || 1);
      this.agonyOn = !!opts.agony;
      this.agony = 0; this.maxAgony = 0;
      this.floor = DH.gfx.floor(this.stage.theme, U.randi(1, 99999));
      this.time = 0; this.kills = 0; this.gold = 0; this.level = 1; this.xp = 0; this.xpNext = C.xpToNext(1, this.stageId);
      this.bossKills = 0; this.eliteKills = 0; this.championKills = 0; this.tomes = 0; this.bossesKilled = [];
      this.traits = { base: {}, elev: {}, cls: {}, ab: {}, up: {} };
      this.abilities = [];
      this.enemies = []; this.proj = []; this.eproj = []; this.pickups = []; this.fx = []; this.parts = []; this.texts = []; this.decals = [];
      this.zones = []; this.hazards = []; this.allies = []; this.props = [];
      this.grid = new Grid(24);
      this.spawnAcc = 0; this.eventIdx = 0; this.bossIdx = 0; this.urnT = 4; this.wellT = 80; // the Strange Pendulum comes only with its Artifact (artifacts.js)
      this.state = 'playing'; this.pendingLevels = 0; this.queue = [];
      this.usedAdRevive = false; this.usedGemRevive = 0; this.usedAdReroll = false;
      this.shake = 0; this.hurtFlash = 0; this.whiteFlash = 0; this.healGlow = 0; this.healAcc = 0; this.healT = 0; this.victoryT = -1;
      this.bosses = []; this.dmgByAb = {};
      this.bag = []; this.runGear = {}; this.wellSent = null; this.well = null; this.wellExtra = []; this.buckets = 0;
      this.champDrops = {};
      this.herbs = {};
      this.buffs = { fury: 0, haste: 0, wraith: 0 }; this.shards = 0; this.hexed = false; this.oozes = 0;
      { const a = Math.random() * TAU, d = U.rand(C.HEX.dist[0], C.HEX.dist[1]); this.hex = { x: Math.cos(a) * d, y: Math.sin(a) * d, taken: false, hinted: false }; }
      this.oozeT = U.rand(C.OOZE_EVERY[0], C.OOZE_EVERY[1]);
      this.initHall();
      // Starting Ability: once the hall's quest is done, an Arcane Tome waits next to the hero
      if (C.START_TOME_DEED[this.stageId] && DH.meta.deedDone(C.START_TOME_DEED[this.stageId])) this.drop('tome', 34, -10);
      { // the hall's starting items, spread around the spawn
        const items = C.STAGE_START[this.stageId] || [], a0 = Math.random() * TAU;
        items.forEach((type, i) => {
          const a = a0 + (i / items.length) * TAU + U.rand(-0.25, 0.25), d = U.rand(C.START_DIST[0], C.START_DIST[1]);
          const x = this.bridge ? (i % 2 ? 1 : -1) * d * (1 + Math.floor(i / 2) * 0.12) : Math.cos(a) * d, y = this.bridge ? U.rand(-this.bridge * 0.5, this.bridge * 0.5) : Math.sin(a) * d;
          this.pickups.push({ type, x, y, val: 1, cluster: false, vx: 0, vy: 0, z: 0, vz: 0, mag: false, t: 1, start: true });
        });
      }
      this.killAsStacks = 0; this.stillT = 0; this.hitRegenT = 0;
      // potions available this run
      this.potions = {}; E.potionOrder.forEach((p) => { this.potions[p] = Math.min(E.POTION_USES_PER_RUN, (S.potions && S.potions[p]) || 0); });
      this.potionsUsed = {}; this.remembered = null; this.banished = new Set();
      this.player = { x: 0, y: 0, r: 6, hp: 1, dirX: 1, dirY: 0, face: 1, moving: false, anim: 0, inv: 0 };
      this.initArtifacts(); this.uncollectedGen = DH.meta.uncollectedGeneric(); this.artifactsFound = [];
      this.recompute(true);
      this.revives = this.P.revives; this.rerolls = this.P.rerolls;
      this.addAbility(this.hero.weapon);
      this.cam = { x: 0, y: 0 };
    }

    /* ---------------- level & xp ---------------- */
    /** Experience multiplier now: Growth, Agony (per hall) and Torment. */
    // Agony's extra foes (+35% a rank) share the horde's usual XP between them: only the hall's Agony bonus raises it
    xpMult() { return this.P.growth * (1 + this.agony * (this.stage.agonyXp || 0.15)) / (1 + this.agony * 0.35) * (this.tormentXp || 1); }
    gainXp(v, mult) {
      this.xp += v * (mult == null ? this.xpMult() : mult); // a gem's worth is fixed when it drops
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext; this.level++; this.xpNext = C.xpToNext(this.level, this.stageId); this.pendingLevels++;
        DH.audio.play('levelup'); this.levelUpVfx();
        this.recompute(); // every hero grows a little with each level
      }
      this.pump();
    }
    /** Open the next pending modal (tome / loot / level-up) if the game is free. */
    pump() {
      if (this.state !== 'playing' || this.victoryT > 0) return;
      if (this.queue.length) {
        const q = this.queue.shift();
        if (q.ev === 'run:tome' && this.fx_.randomTomes) { const c = U.pick(q.data.choices); this.chooseTome(c); this.text(this.player.x, this.player.y - 20, c.kind === 'ability' ? t('ab.' + c.id + '.name') : t('tome.title'), '#c8b8ff', true); return; }
        this.state = q.state; DH.events.emit(q.ev, q.data); return;
      }
      if (this.pendingLevels > 0) { this.state = 'levelup'; this.levelFor = this.level - this.pendingLevels + 1; this.choices = this.rollChoices(this.levelFor); DH.events.emit('run:levelup', this); }
    }
    resume() { this.state = 'playing'; this.pump(); }

    /* ---------------- main update ---------------- */
    update(dt) {
      if (this.state !== 'playing') return;
      this.time += dt;
      const p = this.player, st = this.P;
      const ax = DH.input.axis();
      p.moving = ax.x !== 0 || ax.y !== 0;
      if (p.moving) {
        const sk = (this.pslow > 0 ? 0.5 : 1) * (this.plantSlow || 1); // Crone's Curse: every plant slows her a little
        p.x += ax.x * st.speed * sk * dt; p.y += ax.y * st.speed * sk * dt;
        const d = Math.hypot(ax.x, ax.y); p.dirX = ax.x / d; p.dirY = ax.y / d;
        if (Math.abs(ax.x) > 0.1) p.face = ax.x > 0 ? 1 : -1;
        p.anim += dt * 8; this.stillT = 0;
      } else this.stillT += dt;
      p.inv = Math.max(0, p.inv - dt); p.atkT = Math.max(0, (p.atkT || 0) - dt);
      const regen = st.regen + (this.hitRegenT > 0 ? st.hitRegen : 0);
      this.hitRegenT = Math.max(0, this.hitRegenT - dt);
      if (this.defT > 0 && (this.defT -= dt) <= 0) this.defStacks = 0;
      if (regen > 0 && p.hp < st.maxHp) this.heal(regen * dt, true);
      this.shake = Math.max(0, this.shake - dt * 18);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5); this.healTick(dt);
      this.whiteFlash = Math.max(0, this.whiteFlash - dt * 4);
      let bEnd = false;
      for (const k in this.buffs) if (this.buffs[k] > 0) { this.buffs[k] -= dt; if (this.buffs[k] <= 0) { this.buffs[k] = 0; bEnd = true; } }
      if (bEnd) this.recompute();
      if (this.agonyOn) { this.agony = U.clamp(this.agony + dt * C.AGONY.passive * (C.RUN_LENGTH / this.runLength) * (this.fx_.agonyGain || 1), 0, C.AGONY_MAX); this.maxAgony = Math.max(this.maxAgony, this.agony); }

      this.updateSpawns(dt);
      this.grid.reset();
      for (const e of this.enemies) this.grid.insert(e);
      for (const a of this.abilities) this.updateAbility(a, dt);
      this.updateAllies(dt);
      this.updateEnemies(dt);
      this.updateHall(dt);
      this.updateLandmarks(dt);
      if (this.curse > 0) { this.curse -= dt; if (this.curse <= 0) { this.curse = 0; this.text(this.player.x, this.player.y - 20, t('hud.curseDeath'), '#c060ff', true); this.playerDies(); } } // the Curse: death in 40 s
      this.updateProjectiles(dt);
      this.updateZones(dt);
      this.updateHazards(dt);
      this.updateArtifacts(dt);
      this.updatePickups(dt);
      this.updateProps(dt);
      this.updateFx(dt);
      this.updateVfx(dt); this.updateGparts(dt); this.updateWeather(dt);
      if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
      if (this.victoryT > 0) {
        this.victoryT -= dt;
        if (this.victoryT <= 0) { this.lateLoot(); this.state = 'victory'; DH.audio.play('victory'); DH.events.emit('run:victory', this); }
      }
    }

    /* ---------------- spawning ---------------- */
    remap(type) { return this.stage.remap[type] || type; }
    spawnRate() {
      const tl = C.timeline, late = this.lordKills && !this.lordUp; // the Blightmire keeps pressing until its Lord rises
      const tt = late ? Math.min(599, this.time / (this.runLength / C.RUN_LENGTH)) : this.time / (this.runLength / C.RUN_LENGTH);
      let i = 0; while (i < tl.length - 1 && tl[i + 1].t <= tt) i++;
      const a = tl[i], b = tl[i + 1];
      let rate = a.rate; if (b) rate = U.lerp(a.rate, b.rate, (tt - a.t) / (b.t - a.t));
      if (late) rate *= 1 + Math.max(0, this.time - this.runLength) / 180;
      return { rate: rate * (1 + this.stage.index * 0.1) * (1 + this.agony * 0.35) * (this.fx_.spawn || 1) * (this.fx_.giants ? 0.6 : 1), mix: a.mix };
    }
    updateSpawns(dt) {
      if (this.victoryT > 0) return;
      const { rate, mix } = this.spawnRate();
      this.spawnAcc += rate * dt;
      const cap = this.settings.lowFx ? 220 : 330;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (this.enemies.length >= cap) continue;
        const pt = this.edgePoint();
        this.spawnEnemy(U.weighted(mix), pt.x, pt.y);
      }
      const scale = this.runLength / C.RUN_LENGTH;
      while (this.eventIdx < C.events.length && C.events[this.eventIdx].t * scale <= this.time) this.runEvent(C.events[this.eventIdx++]);
      // Agony champions: (50 - 3 x AR) x 0.95^TR seconds apart
      if (this.agonyOn) {
        this.champT = (this.champT == null ? 20 : this.champT) - dt;
        if (this.champT <= 0) {
          this.champT = (C.AGONY.champBase - C.AGONY.champPerAR * this.agony) * Math.pow(E.TORMENT.champion, this.dread) * scale;
          const pt = this.edgePoint(), e = this.spawnEnemy(U.weighted(mix), pt.x, pt.y, { champion: true }); if (e) e.agonyChamp = true;
        }
      }
      const bl = this.stage.bosses;
      while (this.bossIdx < bl.length && this.lordDue(bl[this.bossIdx], scale)) {
        const b = bl[this.bossIdx++];
        const pt = this.edgePoint(0.85);
        const def = C.enemies[b.id];
        if (def.lord && !this.fx_.curtain) { // a Lord clears the stage of lesser foes (unless the Torn Curtain is active)
          for (const o of this.enemies) if (!o.boss && !o.def.prop && !o.keep) { o.dead = true; this.burst(o.x, o.y, 4, ['#000', '#442244'], 40); }
          this.eproj.length = 0;
        }
        const e = this.spawnEnemy(b.id, pt.x, pt.y, { boss: true, final: b.final });
        if (b.final && this.fx_.mirror) { // Mirror of Three Lords: two Lords of other halls join the final fight
          const others = C.stageOrder.filter((sid) => sid !== this.stageId).map((sid) => C.stages[sid].bosses.find((x) => x.final).id);
          U.shuffle(others).slice(0, 2).forEach((id, i) => { const q = this.edgePoint(0.85); const l = this.spawnEnemy(id, q.x, q.y, { boss: true, final: true }); if (l) { l.hp *= 0.7; l.maxHp *= 0.7; this.bosses.push(l); } });
        }
        if (e && def.lord && this.hexed) { e.hp *= C.HEX.hp; e.maxHp *= C.HEX.hp; e.dmg *= C.HEX.dmg; e.hexed = true; }
        if (b.final) this.lordUp = true;
        if (e && b.final && this.stage.vault) this.sealLord(e);
        this.bosses.push(e);
        this.shake = 6; DH.audio.play('roar'); DH.audio.vibrate(120);
        DH.events.emit('run:boss', { name: t('enemy.' + b.id), final: !!b.final });
      }
      if (this.time >= this.oozeT && !this.bosses.some((b) => b.def.lord)) {
        this.oozeT = this.time + U.rand(C.OOZE_EVERY[0], C.OOZE_EVERY[1]);
        const pt = this.edgePoint(0.8), e = this.spawnEnemy('gildedooze', pt.x, pt.y);
        if (e) { e.hp = e.maxHp = e.def.hits; e.life = e.def.life; DH.events.emit('run:warning', t('hud.ooze')); }
      }
      this.urnT -= dt;
      if (this.urnT <= 0) {
        this.urnT = 7 + Math.random() * 6;
        const n = this.enemies.reduce((a, e) => a + (e.def.prop && !e.def.hazard ? 1 : 0), 0);
        if (n < 5) { const a = Math.random() * TAU, d = 90 + Math.random() * 90; this.spawnEnemy('urn', this.player.x + Math.cos(a) * d, this.player.y + Math.sin(a) * d); }
      }
      if (!this.well) {
        this.wellT -= dt;
        if (this.wellT <= 0) { const a = Math.random() * TAU, d = 230; this.well = this.lmFree({ x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d, used: false }, 26); DH.events.emit('run:warning', t('hud.well')); }
      }
    }
    edgePoint(k) { return this.hallEdgePoint(k); }
    runEvent(ev) {
      const p = this.player, v = DH.view;
      if (ev.type === 'elite' || ev.type === 'champion') { const pt = this.edgePoint(); this.spawnEnemy(ev.enemy, pt.x, pt.y, { [ev.type]: true }); }
      else if (ev.type === 'ring') {
        DH.events.emit('run:warning', t('hud.surrounded'));
        const R = Math.max(v.w, v.h) * 0.55;
        for (let i = 0; i < ev.count; i++) { const a = i / ev.count * TAU; this.spawnEnemy(ev.enemy, p.x + Math.cos(a) * R, p.y + Math.sin(a) * R); }
      } else if (ev.type === 'swarm') {
        DH.events.emit('run:warning', t('hud.swarm'));
        const a = Math.random() * TAU, d = Math.hypot(v.w, v.h) / 2 + 20, cx = p.x + Math.cos(a) * d, cy = p.y + Math.sin(a) * d;
        for (let i = 0; i < ev.count; i++) { const e = this.spawnEnemy(ev.enemy, cx + U.rand(-30, 30), cy + U.rand(-30, 30)); if (e) e.spd *= 1.35; }
      }
    }
    spawnEnemy(type, x, y, o) {
      o = o || {};
      const id = type === 'urn' ? 'urn' : (o.boss || type === 'gildedooze' ? type : this.remap(type));
      const def = id === 'urn' ? URN : C.enemies[id];
      if (!def) return null;
      const ts = 1 + this.time / 60 * 0.22 * (C.RUN_LENGTH / this.runLength);
      const rank = o.champion ? C.CHAMPION : o.elite ? C.ELITE : null;
      const T = E.TORMENT, tr = def.prop ? 0 : this.dread, fx = this.fx_;
      const hpMult = def.prop ? 1 : this.stage.hpMult * (def.boss ? 1 + this.stage.index * 0.1 : ts) * (rank ? rank.hp : 1) * Math.pow(T.hp, tr) * (fx.giants && !def.boss ? 2 : 1)
        * (1 + this.agony * 0.25) * (this.fx_.enemyHp || 1);
      const variant = def.variant || (this.stage.variant && DH.gfx.painters[def.painter] && DH.gfx.painters[def.painter].variants && DH.gfx.painters[def.painter].variants[this.stage.variant] ? this.stage.variant : null);
      const e = {
        id, def, x, y, kx: 0, ky: 0, hp: def.hp * hpMult, maxHp: def.hp * hpMult,
        r: def.r * (rank ? rank.scale * 0.85 : 1), spd: def.spd * (rank ? 0.9 : 1) * U.rand(0.92, 1.08) * (fx.enemySpeed || 1) * (fx.allSpeed || 1) * (1 + T.speed * tr) * (fx.giants && !def.boss ? 0.8 : 1),
        dmg: def.dmg * this.stage.dmgMult * (1 + this.time / 60 * 0.07) * (rank ? rank.dmg : 1) * (1 + this.agony * 0.1) * (1 + T.dmg * tr) * (fx.enemyDmg || 1),
        xp: def.xp * (o.champion ? 30 : o.elite ? 12 : 1) * (fx.giants && !def.boss ? 1.8 : 1), scale: (rank ? rank.scale : 1) * (fx.giants && !def.boss && !def.prop ? 1.35 : 1),
        mass: (def.mass || 1) * (rank ? 4 : 1), armor: Math.min(0.75, (def.def || 0) * Math.pow(1.1, tr) + (rank ? rank.def : 0) + T.armor * tr), // Torment: base defense x1.10 per rank
        elite: !!o.elite, champion: !!o.champion, boss: !!def.boss, final: !!o.final, flash: 0, anim: Math.random() * 10,
        face: 1, t: Math.random() * 3, phase: 0, hc: null, dead: false,
        painter: def.painter, variant,
        st: { fragile: 0, affl: 0, burn: 0, burnPS: 0, burnT: 0, spark: 0, sparkPS: 0, sparkT: 0, frost: 0, frostMax: 0, frostPS: 0, decay: 0, decayPS: 0 },
      };
      this.hallSpawn(e);
      if (fx.accolade && !rank && !def.boss && !def.prop && Math.random() < fx.accolade) { e.special = true; e.hp *= 4; e.maxHp *= 4; e.scale *= 1.25; e.xp *= 5; }
      this.enemies.push(e);
      return e;
    }

    /* ---------------- enemies ---------------- */
    updateEnemies(dt) {
      const p = this.player, v = DH.view;
      const farD = Math.hypot(v.w, v.h) * 0.62 + 40;
      for (const e of this.enemies) {
        if (e.dead) continue;
        e.flash = Math.max(0, e.flash - dt);
        if (e.def.prop) {
          if (U.dist2(e.x, e.y, p.x, p.y) > farD * farD) { e.dead = true; continue; }
          e.anim += dt;
          // urns, braziers and ice spikes also break when the hero walks through them
          if (e.def.touch && !e.keep && U.dist2(e.x, e.y, p.x, p.y) < (e.r + p.r + 2) * (e.r + p.r + 2)) { this.killEnemy(e); continue; }
          this.propIdleFx(e, dt);
          continue;
        }
        e.anim += dt;
        this.tickStatus(e, dt);
        if (e.dead) continue;
        if (e.stun > 0) { e.stun -= dt; e.x += e.kx * dt; e.y += e.ky * dt; const kd0 = Math.pow(0.0005, dt); e.kx *= kd0; e.ky *= kd0; continue; }
        const slowK = this.slowFactor(e); // Slow stacks: x0.91 each
        let dx = p.x - e.x, dy = p.y - e.y; const dist = Math.hypot(dx, dy) || 1; dx /= dist; dy /= dist;
        let mx = dx, my = dy, spd = e.spd * slowK;
        e.t += dt;
        const ai = e.def.ai;
        if (ai === 'flutter') { const w = Math.sin(e.anim * 5 + e.x * 0.01) * 0.6; mx = dx - dy * w; my = dy + dx * w; }
        else if (ai === 'dash') { const c = e.t % 1.6; spd *= c < 1.0 ? 0.35 : 3.2; }
        else if (ai === 'ranged') {
          if (dist < 90) { mx = -dx; my = -dy; } else if (dist < 130) { mx = -dy; my = dx; spd *= 0.5; }
          if (e.t > e.def.shot.cd && dist < 200) { e.t = 0; this.enemyShot(e, Math.atan2(dy, dx), e.def.shot.spd, e.def.shot.dmg * this.stage.dmgMult, '#c070ff'); }
        } else if (ai === 'flee') {
          mx = -dx + Math.sin(e.t * 1.7) * 0.6; my = -dy + Math.cos(e.t * 1.3) * 0.6; if (dist > 150) spd *= 0.45;
          e.life -= dt; e.trail = (e.trail || 0) - dt;
          if (e.trail <= 0) { e.trail = 0.45; this.drop('coin', e.x, e.y, Math.ceil(this.stage.goldMult)); }
          if (e.life <= 0) { e.dead = true; this.burst(e.x, e.y, 16, ['#ffd35a', '#fff0a0'], 60); this.text(e.x, e.y - 12, t('hud.oozeEscaped'), '#ffd35a', true); continue; }
        } else if (ai && ai.startsWith('b_')) { this.bossAI(e, dt, dx, dy, dist); mx = e.mx; my = e.my; spd = e.cspd * slowK; }
        e.x += (mx * spd + e.kx) * dt; e.y += (my * spd + e.ky) * dt;
        const kd = Math.pow(0.0005, dt); e.kx *= kd; e.ky *= kd;
        if (Math.abs(mx) > 0.05) e.face = mx > 0 ? 1 : -1;
        if (!e.def.fly && !e.boss) {
          this.grid.query(e.x, e.y, e.r * 2, tmp);
          let n = 0;
          for (const o of tmp) {
            if (o === e || o.dead || o.def.fly) continue;
            const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r, d2 = ox * ox + oy * oy;
            if (d2 < rr * rr && d2 > 0.0001) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; e.x += ox / d * push; e.y += oy / d * push; if (++n > 6) break; }
          }
        }
        if (e.dmg > 0 && dist < e.r * 0.8 + p.r) this.hurtPlayer(e.dmg, e);
        // the attack animation: in reach of the hero, a foe coils, lunges and recovers
        e.atkT = Math.max(0, (e.atkT || 0) - dt); e.atkCd = (e.atkCd || 0) - dt;
        if (e.dmg > 0 && !e.def.prop && e.atkCd <= 0 && dist < e.r + p.r + 10) this.enemyAttackAnim(e);
        if (dist > (e.boss ? farD * 0.85 : farD) && !(e.keep && !e.boss)) { // secret breakables stay where they are
          if (e.boss) {
            const a = Math.atan2(p.dirY, p.dirX) + U.rand(-1, 1), d = Math.hypot(v.w, v.h) / 2 * 0.7 + 12;
            e.x = p.x + Math.cos(a) * d; e.y = p.y + Math.sin(a) * d; e.phase = e.phase === 2 ? 0 : e.phase; e.phaseT = 0; e.tele = false;
            this.burst(e.x, e.y, 30, ['#ff3b3b', '#52287e', '#000000'], 90); DH.audio.play('roar');
          } else e.dead = true; // despawned — no experience (moving fast has a cost)
        }
      }
    }
    /** Scroll of Mastery from an Elite or Champion: 30% (+4% per Torment and Agony rank, at most 60%),
     *  at most 9 a run; otherwise more gold. */
    scrollDrop(x, y) {
      // bad-luck protection: every miss adds 15%, so a long dry spell cannot happen
      const rank = (this.dread || 0) + (this.agonyOn ? Math.floor(this.agony || 0) : 0), ch = Math.min(0.6, C.SCROLL_DROP + 0.04 * rank) + 0.15 * (this.scrollMiss || 0);
      if ((this.scrolls || 0) < 9 && Math.random() < ch) { this.scrolls = (this.scrolls || 0) + 1; this.scrollMiss = 0; this.drop('tome', x, y); }
      else { this.scrollMiss = (this.scrollMiss || 0) + 1; for (let i = 0; i < 4; i++) this.drop('coin', x, y, Math.ceil(3 * this.stage.goldMult)); }
    }
    enemyAttackAnim(e) { const p = this.player; e.atkMax = e.boss ? 0.6 : 0.42; e.atkT = e.atkMax; e.atkCd = e.boss ? 1.2 : 0.8 + Math.random() * 0.3; e.atkAng = Math.atan2(p.y - e.y, p.x - e.x); }
    enemyShot(e, ang, spd, dmg, color, kind) {
      if (!(e.atkT > 0)) this.enemyAttackAnim(e);
      this.eproj.push({ x: e.x, y: e.y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, dmg, life: 6, color: color || '#c070ff', r: kind === 'skull' ? 4 : kind === 'curse' ? 6 : 3, kind, src: e });
    }

    /* ---------------- player ---------------- */
    hurtPlayer(dmg, src) {
      const p = this.player;
      if (p.inv > 0 || this.buffs.wraith > 0 || this.state !== 'playing' || this.victoryT > 0) return;
      const P = this.P;
      // Blazing Shell: foes that touch you may catch fire
      if (P.thornBurn && src && src.st && !src.dead && Math.random() < P.thornBurn) this.addBurn(src, 3, src.maxHp * (src.boss ? 0.0045 : 0.067)); // 3 stacks
      // Block: chance = min(1/2 * B/D, 1/2 * sqrt(B/D), 1)
      if (P.block > 0) {
        const ratio = P.block / Math.max(1, dmg);
        const chance = Math.min(0.5 * ratio, 0.5 * Math.sqrt(ratio), 1);
        if (Math.random() < chance) { p.inv = 0.25; this.text(p.x, p.y - 12, t('hud.block'), '#9ad0ff'); DH.audio.play('block'); return; }
      }
      const defense = C.defenseDR(P.defense + (this.defStacks || 0) * P.hitDefense); // Defiant Plate: defense after each hit (3 stacks, 4s)
      if (P.hitDefense) { this.defStacks = Math.min(3, (this.defStacks || 0) + 1); this.defT = 4; }
      let d = Math.max(1, Math.round(dmg * (1 - defense) * P.taken * (1 + 0.04 * ((this.art && this.art.pFragile) || 0))));
      if (this.fx_.plate && this.gold >= d * 0.5) { this.gold -= d * 0.5; d = Math.max(1, Math.round(d * 0.5)); this.text(p.x + 6, p.y - 18, '-' + Math.round(d) + 'g', '#ffd35a'); } // Miser's Plate
      if (this.fx_.scorch && src && Math.random() < this.fx_.scorch) this.art.pburn = { t: 3, dps: d * 0.1 }; // Scorched Palm
      p.hp -= d; p.inv = 0.45;
      this.hitRegenT = 3;
      this.hurtFlash = 1; this.shake = Math.max(this.shake, 3);
      DH.audio.play('hurt'); DH.audio.vibrate(35);
      this.text(p.x, p.y - 12, '-' + d, '#ff5050');
      if (p.hp <= 0) this.playerDies();
    }
    /** Out of life (or the Curse ran out): an auto-revive if one is left, else the run ends. */
    playerDies() {
      this.player.hp = 0;
      if (this.revives > 0) { this.revives--; this.revive(true); }
      else { this.state = 'dead'; DH.audio.play('defeat'); DH.events.emit('run:dead', this); }
    }
    revive(auto) {
      const p = this.player;
      p.hp = this.P.maxHp * (auto ? 0.5 : 1); p.inv = 2.5; this.curse = 0; // a revive lifts the Curse
      if (this.agonyOn) this.agony = Math.max(0, this.agony - C.AGONY.revive); // a revive drains a fifth of the Agony gauge
      this.nova(p.x, p.y, 999, 180, 'revive');
      this.state = 'playing';
      DH.audio.play('heal');
      if (auto) this.text(p.x, p.y - 20, t('hud.revived'), '#ffd35a', true);
    }
    heal(n, quiet) {
      const p = this.player, before = p.hp;
      p.hp = Math.min(this.P.maxHp, p.hp + n * (this.fx_.heal || 1));
      const got = p.hp - before; if (!(got > 0)) return;
      if (quiet) { this.healAcc += got; return; } // regeneration: gathered and shown once a second (see healTick)
      if (got >= 1) {
        this.text(p.x, p.y - 14, '+' + Math.round(got), '#ff7080');
        this.bloodIn(Math.min(12, 3 + Math.round(got / this.P.maxHp * 40)));
        this.healGlow = Math.min(1, this.healGlow + got / this.P.maxHp * 5);
      }
    }
    /** Drops of blood drawn in from around the hero: health flowing back. */
    bloodIn(n) {
      const p = this.player; if (this.settings.lowFx) n = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        if (this.parts.length > 700) this.parts.shift();
        const a = Math.random() * TAU, r = U.rand(14, 24);
        this.parts.push({ x: p.x + Math.cos(a) * r, y: p.y - 6 + Math.sin(a) * r * 0.8, vx: -Math.sin(a) * 30, vy: Math.cos(a) * 30 - 10, life: U.rand(0.6, 0.9), max: 0.9, c: U.pick(['#e01830', '#ff4050', '#b00c20', '#ff8a96']), s: Math.random() < 0.5 ? 3 : 2, home: true });
      }
    }
    healTick(dt) {
      this.healGlow = Math.max(0, this.healGlow - dt * 1.4);
      this.healT += dt; if (this.healT < 1) return;
      this.healT = 0;
      const n = this.healAcc; this.healAcc = 0; if (n < 0.5) return;
      const p = this.player;
      this.bloodIn(Math.min(6, 2 + Math.floor(n / this.P.maxHp * 60)));
      if (n >= 1 && this.settings.dmgNumbers !== false) this.text(p.x + U.rand(-4, 4), p.y - 16, '+' + Math.floor(n), '#ff8a96');
    }
    nova(x, y, dmg, R, kind) {
      this.whiteFlash = 1; this.shake = 6; DH.audio.play('boom');
      this.fx.push({ k: 'ring', x, y, life: 0.5, max: 0.5, r0: 10, r1: R, color: kind === 'revive' ? '#ffd35a' : '#ffffff' });
      for (const e of this.enemies) {
        if (e.dead || U.dist2(x, y, e.x, e.y) >= R * R) continue;
        this.rawDamage(e, e.boss ? Math.min(dmg, e.maxHp * 0.08) : dmg, null);
        const d = Math.hypot(e.x - x, e.y - y) || 1; e.kx += (e.x - x) / d * 200 / Math.sqrt(e.mass); e.ky += (e.y - y) / d * 200 / Math.sqrt(e.mass);
      }
      this.eproj.length = 0;
      this.hazards = this.hazards.filter((h) => h.boss);
    }

    /* ---------------- kills & loot ---------------- */
    killEnemy(e) {
      if (e.dead) return;
      e.dead = true;
      const cols = e.def.particles || ['#e6dcc0', '#8a6a4a', '#7c1624'];
      if (e.def.hazard) { this.envBreak(e); return; } // braziers and ice spikes: no loot, a hazard
      if (e.def.prop) {
        DH.audio.play('glass'); this.propBreakFx(e);
        this.urnDrop(e);
        if (this.fx_.ulcer && Math.random() < 0.2) this.drop('ulcer', e.x + 6, e.y);
        if (this.fx_.tinder) { // Volatile Tinderbox: breakables go up in fireworks
          const R0 = 40, dmg = 25 * this.stage.hpMult * (1 + this.time / 60 * 0.22);
          for (const o of this.enemies) if (!o.dead && !o.def.prop && U.dist2(e.x, e.y, o.x, o.y) < R0 * R0) this.rawDamage(o, o.boss ? dmg * 0.3 : dmg, '#ffb060');
          this.fx.push({ k: 'explosion', x: e.x, y: e.y, R: R0, life: 0.4, max: 0.4 });
          for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, sp = U.rand(40, 130); this.gpart({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, g: 120, life: U.rand(0.5, 1), max: 1, c: U.pick(['#ff5050', '#ffd040', '#60c0ff', '#c070ff']), r: 1.1 }); }
          DH.audio.play('boom');
        }
        return;
      }
      if (this.sec) this.secretKill(e);
      if (e.st.frost > 0 && e.st.frostArmed) this.frostExplode(e); // a death releases the stored Frost (not a one-hit kill)
      if (e.def.gilded) {
        this.oozes++; this.shake = 4; DH.audio.play('chest');
        this.burst(e.x, e.y, 40, ['#ffd35a', '#fff0a0', '#c9a24a'], 110);
        for (let i = 0; i < 24; i++) this.drop('coin', e.x, e.y, Math.ceil(4 * this.stage.goldMult));
        return;
      }
      this.kills++;
      if (this.agonyOn) this.agony = Math.min(C.AGONY_MAX, this.agony + C.AGONY.kill * (e.elite || e.champion ? C.AGONY.eliteKill : 1) * (this.fx_.agonyGain || 1));
      if (this.fx_.regret && this.kills % 100 === 0) this.recompute(); // Mask of Regret grows heavier
      if (e.ttl != null) return; // vengeful ghosts leave nothing behind
      if (this.fx_.urn && !e.boss && Math.random() < this.fx_.urn) { // Urn of the Restless
        const g = this.spawnEnemy('ghost', e.x, e.y); if (g) { g.variant = 'wraith'; g.ttl = 6; g.spd *= 1.8; g.xp = 0; }
      }
      if (e.special) { for (let i = 0; i < 6; i++) this.drop('coin', e.x, e.y, Math.ceil(3 * this.stage.goldMult)); if (Math.random() < 0.3) this.drop('potion', e.x, e.y); }
      if (this.P.killAs) this.killAsStacks++;
      if (this.P.killHeal && Math.random() < this.P.killHeal) this.heal(1 + this.P.maxHp * 0.005);
      if (this.P.killHealChance && Math.random() < this.P.killHealChance) this.heal(this.P.maxHp * 0.02);
      if (this.hero.afflictHeal && e.st.affl > 0 && U.dist2(e.x, e.y, this.player.x, this.player.y) < this.P.pickupR * this.P.pickupR * 4) this.heal(this.P.maxHp * this.hero.afflictHeal, true);
      this.spreadAffliction(e);
      DH.audio.play('kill');
      this.burst(e.x, e.y, e.boss ? 60 : (e.elite || e.champion) ? 24 : 7, cols, e.boss ? 140 : 70);
      if (this.decals.length > 120) this.decals.shift();
      this.decals.push({ x: e.x, y: e.y + e.r * 0.5, r: e.r * (0.6 + Math.random() * 0.5) * e.scale, life: 14, kind: e.painter === 'skeleton' || e.painter === 'golem' ? 'bone' : 'blood' });
      let xp = e.final && !this.bosses.some((b) => b.final && !b.dead && b !== e) ? 0 : e.xp; // the last Lord ends the hall: no pointless level-ups after victory
      for (const [v] of C.GEM_TIERS) { while (xp >= v) { this.drop('xp', e.x + U.rand(-5, 5), e.y + U.rand(-5, 5), v); xp -= v; } }
      this.mergeGems();
      const gm = this.stage.goldMult;
      if (Math.random() < 0.08) this.drop('coin', e.x, e.y, Math.ceil(U.randi(1, 3) * gm));
      if (e.elite || e.champion || e.boss) { if (this.P.eliteHeal) this.heal(this.P.maxHp * this.P.eliteHeal); }
      if (e.elite) { this.eliteKills++; this.shake = 3; this.scrollDrop(e.x, e.y); if (Math.random() < 0.5) this.drop('herb', e.x, e.y, 0, this.stage.herb === 'dust' ? U.pick(E.herbs) : this.stage.herb); for (let i = 0; i < 4; i++) this.drop('coin', e.x, e.y, Math.ceil(3 * gm)); }
      if (e.champion) {
        this.championKills++; this.shake = 4;
        if (e.agonyChamp) this.championDrop(e);
        else { this.scrollDrop(e.x, e.y); for (let i = 0; i < 8; i++) this.drop('coin', e.x, e.y, Math.ceil(4 * gm)); if (Math.random() < 0.3) this.drop('potion', e.x + 8, e.y); } // the hall's own champions: an ability scroll, no item chest
      }
      if (e.boss) {
        this.bossKills++; this.bossesKilled.push(e.id); this.shake = 10; this.whiteFlash = 0.8;
        this.bosses = this.bosses.filter((b) => b !== e);
        this.hazards = this.hazards.filter((h) => h.src !== e);
        DH.audio.play('boom'); DH.audio.vibrate(200);
        this.drop('chest_gold', e.x, e.y); if (!e.def.lord) this.drop('tome', e.x + 12, e.y); // the Lord's death ends the hall: no scroll
        for (let i = 0; i < 25; i++) this.drop('coin', e.x, e.y, Math.ceil(5 * gm));
        this.drop('potion', e.x - 10, e.y);
        if (e.def.lord) {
          // Lament Shards: only with Agony or Torment; 1 to 4 by Torment Rank
          const n = this.agonyOn || this.dread ? this.shardCount() : 0;
          for (let i = 0; i < n; i++) this.drop('shard', e.x + U.rand(-10, 10), e.y + U.rand(-6, 6));
        }
        if (e.def.lord && this.agonyOn && DH.meta.altarUnlocked()) {
          const id = DH.meta.rollArtifact(this.stageId, this.heroId, this.artifactsFound.concat(this.pickups.filter((k) => k.type === 'artifact').map((k) => k.sub)), this.uncollectedGen);
          if (id) this.drop('artifact', e.x, e.y - 8, 1, id);
        }
        if (e.final && this.bosses.some((b) => b.final && !b.dead && b !== e)) { /* the Mirror: more Lords still stand */ }
        else if (e.final) {
          this.victoryT = 2.5;
          for (const o of this.enemies) if (!o.dead && o !== e && !o.def.prop) { o.dead = true; this.burst(o.x, o.y, 4, ['#fff', '#aaa'], 50); }
          this.eproj.length = 0; this.hazards.length = 0;
          this.pickups.forEach((pk) => { if (pk.type === 'xp' || pk.type === 'coin' || pk.type === 'shard' || pk.type === 'artifact') pk.mag = true; });
        }
      }
    }
    mergeGems() {
      // too many gems on the floor: fold the far-away ones into a cluster that keeps their full value
      let n = 0; for (const k of this.pickups) if (k.type === 'xp') n++;
      if (n < 300) return;
      const p = this.player; let sum = 0, cx = 0, cy = 0, c = 0;
      this.pickups = this.pickups.filter((k) => {
        if (k.type === 'xp' && !k.mag && U.dist2(k.x, k.y, p.x, p.y) > 150 * 150) { sum += k.val * (k.xm == null ? 1 : k.xm); cx += k.x; cy += k.y; c++; return false; }
        return true;
      });
      if (c) { this.drop('xp', cx / c, cy / c, sum, null, true); this.pickups[this.pickups.length - 1].xm = 1; } // the cluster holds worth already multiplied
    }
    drop(type, x, y, val, sub, cluster) {
      const k = { type, x, y, val: val || 1, sub, cluster: !!cluster, vx: U.rand(-40, 40), vy: U.rand(-60, -10), z: 0, vz: type === 'xp' ? 0 : 60, mag: false, t: 0 };
      if (type === 'xp') k.xm = this.xpMult();
      this.pickups.push(k);
      return k;
    }
    /** A broken urn: one roll down the urn table; nothing special -> a single coin. */
    urnDrop(e) {
      const r = Math.random(), gm = this.stage.goldMult, V = C.COIN_VALUE; let acc = 0, k = null;
      for (const d of C.URN_DROPS) { acc += d.p; if (r < acc) { k = d.k; break; } }
      if (k === 'herb') this.drop('herb', e.x, e.y, 0, this.stage.herb === 'dust' ? U.pick(E.herbs) : this.stage.herb);
      else if (k === 'food') this.drop('food', e.x, e.y, 1, U.pick(['soup', 'carrot', 'cheese']));
      else if (k === 'coins') this.drop('coin', e.x, e.y, Math.ceil(V.coins * gm), 'stack');
      else if (k === 'coinbag') this.drop('coin', e.x, e.y, Math.ceil(V.coinbag * gm), 'bag');
      else if (k === 'ooze') { const o = this.spawnEnemy('gildedooze', e.x, e.y); if (o) { o.hp = o.maxHp = o.def.hits; o.life = o.def.life; DH.events.emit('run:warning', t('hud.ooze')); } }
      else if (k) this.drop(k, e.x, e.y);
      else this.drop('coin', e.x, e.y, Math.ceil(V.coin * gm));
      if (this.fx_.scarab) for (let i = 0; i < 8; i++) this.drop('coin', e.x, e.y, Math.ceil(V.coin * gm)); // Golden Scarab: urns spill gold
    }
    updatePickups(dt) {
      const p = this.player, mag = this.P.pickupR, got = [];
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const k = this.pickups[i];
        k.t += dt;
        if (k.vz || k.z > 0) { k.z += k.vz * dt; k.vz -= 260 * dt; if (k.z <= 0) { k.z = 0; k.vz = 0; } }
        if (k.t < 0.35 && !k.mag) { k.x += k.vx * dt; k.y += k.vy * dt * 0.3; k.vx *= 0.9; }
        const d2 = U.dist2(k.x, k.y, p.x, p.y);
        const range = k.type === 'xp' || k.type === 'coin' || k.type === 'herb' || k.type === 'shard' ? mag : 16;
        if (k.mag || d2 < range * range) {
          k.mag = true; k.sp = Math.min(420, (k.sp || 60) + 500 * dt);
          const d = Math.sqrt(d2) || 1; k.x += (p.x - k.x) / d * k.sp * dt; k.y += (p.y - k.y) / d * k.sp * dt;
        }
        if (d2 < 64) { this.pickups.splice(i, 1); got.push(k); }
      }
      for (const k of got) this.collect(k); // after the loop: collecting may add/merge pickups
    }
    collect(k) {
      switch (k.type) {
        case 'xp': DH.audio.play('xp'); this.gainXp(k.val, k.xm); break;
        case 'food': DH.audio.play('heal'); this.heal(C.FOOD_HEAL); break;
        case 'coin': DH.audio.play('coin'); this.gold += k.val * this.P.greed; if (this.fx_.scarab) this.player.hp = Math.max(1, this.player.hp - k.val); break;
        case 'artifact':
          if (!this.artifactsFound.includes(k.sub)) this.artifactsFound.push(k.sub);
          DH.audio.play('chest'); this.levelUpVfx && this.levelUpVfx();
          DH.events.emit('run:boss', { name: t('artifact.' + k.sub + '.name'), final: false, artifact: true }); break;
        case 'ulcer': { const p = this.player; DH.audio.play('hurt'); this.gainXp(this.xpNext * 0.3); p.hp = Math.max(1, p.hp - this.P.maxHp * 0.12); this.text(p.x, p.y - 14, t('hud.ulcer'), '#b060ff'); break; }
        case 'herb': DH.audio.play('coin'); this.herbs[k.sub] = (this.herbs[k.sub] || 0) + 1; this.text(this.player.x, this.player.y - 14, '+1 ' + t('herb.' + k.sub), '#b0ff80'); break;
        case 'potion': DH.audio.play('heal'); if (this.hero.potionBrew) { this.brews = (this.brews || 0) + 1; this.recompute(); this.text(this.player.x, this.player.y - 18, t('hud.brew'), '#b0ff80', true); } this.heal(C.POTION_HEAL[0] + this.P.maxHp * C.POTION_HEAL[1]); break; // 25 + 5% of max HP; the Alchemist's brews grow stronger
        case 'bucket': DH.audio.play('reward'); if (this.well && this.well.used) this.well.used = false; else this.buckets++; this.text(this.player.x, this.player.y - 14, t('hud.bucket'), '#5ab8ff', true); break;
        case 'rune_fury': case 'rune_haste': case 'rune_wraith': this.buff(k.type.slice(5)); break;
        case 'shard': DH.audio.play('reward'); this.shards++; this.text(this.player.x, this.player.y - 16, t('hud.shard'), '#ff70c0', true); break;
        case 'magnet': DH.audio.play('reward'); this.pickups.forEach((o) => { if (o.type === 'xp' || o.type === 'coin' || o.type === 'herb') o.mag = true; }); break;
        case 'bomb': this.nova(this.player.x, this.player.y, 200 * this.stage.hpMult, Math.hypot(DH.view.w, DH.view.h) / 2, 'bomb'); break;
        case 'tome': this.tomes++; DH.audio.play('chest'); this.queue.push({ state: 'tome', ev: 'run:tome', data: Object.assign(this.tomeChoices(k.sub === 'mastery' ? 99 : 3), { mastery: k.sub === 'mastery' }) }); // a Tome of Mastery offers everything this.pump(); break;
        case 'chest_red': case 'chest_gold': case 'chest_new': DH.audio.play('chest'); if (this.art) this.art.treasure = this.art.treasure.filter((x) => x !== k); this.queue.push({ state: 'loot', ev: 'run:loot', data: this.openLoot(k.type) }); this.pump(); break;
        default: break;
      }
    }
    /** Victory: every unclaimed tome / chest still on the floor is worth half a level. */
    lateLoot() {
      let n = 0;
      for (const k of this.pickups) if (k.type === 'tome' || k.type === 'chest_red' || k.type === 'chest_gold' || k.type === 'chest_new') n++;
      this.lateLevels = 0;
      for (let i = 0; i < n; i++) { this.xp += this.xpNext * 0.5; while (this.xp >= this.xpNext) { this.xp -= this.xpNext; this.level++; this.lateLevels++; this.xpNext = C.xpToNext(this.level, this.stageId); } }
    }

    /* ---------------- tomes ---------------- */
    tomeChoices(n) {
      n = n || 3; // a Tome of Mastery offers five
      const owned = new Set(this.abilities.map((a) => a.id));
      const tomeCount = this.abilities.length - 1;
      if (tomeCount < this.maxAbilities()) {
        const pool = C.tomeAbilities.filter((id) => !owned.has(id) && DH.meta.abilityUnlocked(id));
        U.shuffle(pool);
        const songs = this.hero.exclusive ? U.shuffle(C.exclusiveAbilities.filter((id) => C.abilities[id].exclusive === this.heroId && !owned.has(id))) : [];
        const pick = songs.slice(0, 1).concat(pool).slice(0, n).map((id) => ({ kind: 'ability', id }));
        if (pick.length) return { choices: pick };
      }
      const tr = this.rollChoices(Math.max(this.level, 8), true).filter((c) => c.kind === 'ab');
      if (tr.length) return { choices: tr.slice(0, n), traitsOnly: true };
      return { choices: [{ kind: 'gold', amount: Math.round(40 * this.stage.goldMult) }] };
    }
    chooseTome(c) {
      if (c.kind === 'ability') this.addAbility(c.id);
      else this.applyChoice(c);
      this.resume();
    }

    /* ---------------- items found in the run ---------------- */
    /** One reward from an Agony champion: the first roll that succeeds, top to bottom (150 gold if all fail). */
    championDrop(e) {
      const tl = this.tormentLevel(), D = this.champDrops, gm = this.stage.goldMult;
      for (const r of C.CHAMP_DROPS) {
        if (tl < r.min || (r.cap && (D[r.k] || 0) >= r.cap)) continue;
        if (Math.random() >= Math.min(r.max, r.base + r.inc * tl)) continue;
        if (r.cap) D[r.k] = (D[r.k] || 0) + 1;
        if (r.k === 'gold') { for (let i = 0; i < r.n; i++) this.drop('coin', e.x, e.y, Math.ceil(4 * gm)); }
        else if (r.k === 'chest') this.drop('chest_red', e.x, e.y);
        else if (r.k === 'mastery') this.drop('tome', e.x, e.y, 1, 'mastery');
        else this.drop(r.k, e.x, e.y);
        return;
      }
    }
    /** Lament Shards for a Lord: at least 1, up to 4 by Torment Rank. */
    shardCount() {
      const T = C.SHARD_TABLE, tr = Math.min(this.dread, T[T.length - 1][0]);
      let i = 0; while (i < T.length - 2 && T[i + 1][0] <= tr) i++;
      const a = T[i], b = T[i + 1], f = (tr - a[0]) / (b[0] - a[0]);
      let n = 1; for (let k = 1; k <= 3; k++) if (Math.random() < a[k] + (b[k] - a[k]) * f) n++;
      return n;
    }
    /** Torment Level for loot and drops: Torment Rank (active Artifacts) + the Agony rank reached. */
    tormentLevel() { return this.dread + (this.agonyOn ? Math.floor(this.maxAgony || this.agony) : 0); }
    /** A chest: a Lord's or boss's holds 3 pieces to pick from, a champion's 2 (Uncommon at least, Rare from Torment Level 10),
     *  the Strange Pendulum's 1 piece you have never found. */
    openLoot(kind) {
      const boss = kind === 'chest_gold', fresh = kind === 'chest_new', tl = this.tormentLevel(), T = C.LOOT_TIERS;
      const minR = kind === 'chest_red' ? (tl >= 10 ? 2 : 1) : 0, n = boss ? 3 : fresh ? 1 : 2;
      const score = tl + Math.floor(this.stage.index / 2) + (boss && tl > 0 ? 5 : 0), top = boss ? 5 : 4; // Torment Level (TR + AR) drives rarity: without Agony / Torment chests hold mostly Common pieces
      const s = DH.save.data, unseen = E.gearOrder.filter((t) => !s.discovered[t]);
      const items = [], types = new Set();
      for (let i = 0; i < n; i++) {
        let r = Math.max(minR, DH.meta.rollItemRarity(score, boss));
        // Torment tiers: at 11 (champion chests) / 16 (Lord chests) the top rarity can appear, at 25 every chest holds it
        if (tl >= T.all || (tl >= (boss ? T.lord : T.champion) && Math.random() < 0.25 + 0.05 * (tl - (boss ? T.lord : T.champion)))) r = top;
        let type = fresh && unseen.length ? U.pick(unseen) : DH.meta.rollItemType(this.runGear);
        for (let k = 0; k < 6 && types.has(type); k++) type = DH.meta.rollItemType(this.runGear);
        types.add(type); items.push({ type, rarity: r, level: 1 });
      }
      const g = Math.round(U.randi(20, 45) * this.stage.goldMult * this.P.greed * (boss ? 3 : 1));
      this.gold += g;
      // Ivory Dice: the chest chooses for you
      const auto = this.fx_ && this.fx_.ivoryDice ? U.pick(items) : null;
      const d = { items: auto ? [auto] : items, gold: g, boss, fresh, auto: !!auto };
      if (auto) d.result = this.takeLoot(auto);
      this.lastLoot = d;
      return d;
    }
    /** The hero takes one piece from a chest: worn if it beats what is on (or Ivory Dice), otherwise into the bag.
     *  A found piece it replaces goes into the bag too. More than C.BAG_SIZE there and one must be discarded (overflow). */
    takeLoot(item) {
      const slot = DH.meta.slotForRun(item.type, this.runGear), cur = this.runGear[slot] || DH.meta.equippedItem(slot), fx = this.fx_ || {};
      let equipped = false;
      if (fx.commit && this.runGear[slot]) equipped = false; // Curse of Commitment: what you put on stays on
      else if (!cur || item.rarity >= cur.rarity || fx.ivoryDice) equipped = true;
      if (equipped) { const prev = this.runGear[slot]; this.runGear[slot] = item; if (prev) this.bag.push(prev); this.recompute(); }
      else this.bag.push(item);
      if (!fx.ivoryDice) this.player.inv = Math.max(this.player.inv, 0.5); // half a second of grace after choosing (not with Ivory Dice)
      return { item, equipped, overflow: this.bagOverflow() };
    }
    bagOverflow() { return this.bag.length > C.BAG_SIZE; }
    /** Put on a piece from the bag; the found piece it replaces goes back into the bag (your own gear simply waits at home). */
    equipFromBag(item, slot) {
      const i = this.bag.indexOf(item); if (i < 0) return false;
      slot = slot || DH.meta.slotForRun(item.type, this.runGear);
      if ((this.fx_ || {}).commit && this.runGear[slot]) return false;
      const prev = this.runGear[slot];
      this.bag.splice(i, 1, ...(prev ? [prev] : []));
      this.runGear[slot] = item; this.recompute();
      return true;
    }
    /** Take off a found piece into the bag: your own gear for that slot is worn again. */
    unequipToBag(slot) {
      const it = this.runGear[slot];
      if (!it || this.bag.length >= C.BAG_SIZE || (this.fx_ || {}).commit) return false;
      delete this.runGear[slot]; this.bag.push(it); this.recompute();
      return true;
    }
    discardItem(item) { const i = this.bag.indexOf(item); if (i < 0) return false; this.bag.splice(i, 1); return true; }
    /** Every piece found in this run that the hero still carries: worn ones first, then the bag. */
    carried() { return E.slots.map((sl) => this.runGear[sl]).filter(Boolean).concat(this.bag); }
    buff(kind) {
      const fresh = !(this.buffs[kind] > 0);
      this.buffs[kind] = C.BUFFS[kind].dur;
      DH.audio.play('reward'); this.shake = Math.max(this.shake, 3);
      this.fx.push({ k: 'ring', x: this.player.x, y: this.player.y, life: 0.5, max: 0.5, r0: 6, r1: 60, color: C.BUFFS[kind].color });
      DH.events.emit('run:warning', t('buff.' + kind));
      if (fresh) this.recompute();
    }
    updateProps(dt) {
      const w = this.well, p = this.player, hx = this.hex;
      if (hx && !hx.taken && this.state === 'playing') {
        const d2 = U.dist2(hx.x, hx.y, p.x, p.y);
        if (!hx.hinted && d2 < 260 * 260) { hx.hinted = true; DH.events.emit('run:warning', t('hud.hexNear')); }
        if (d2 < 16 * 16) {
          hx.taken = true; this.hexed = true; if (this.secretT == null) this.secretT = this.time;
          this.burst(hx.x, hx.y - 10, 40, ['#c060ff', '#ffffff', '#301040'], 100); this.shake = 6; this.whiteFlash = 0.4;
          DH.audio.play('roar');
          for (const b of this.bosses) if (b.def.lord && !b.hexed) { b.hp *= C.HEX.hp; b.maxHp *= C.HEX.hp; b.dmg *= C.HEX.dmg; b.hexed = true; }
          DH.events.emit('run:boss', { name: t('hud.hexTaken'), final: false, hex: true });
        }
      }
      if (w && !w.used && U.dist2(w.x, w.y, p.x, p.y) < 20 * 20 && this.state === 'playing') {
        if (!w.cool || w.cool <= 0) { w.cool = 3; this.state = 'well'; DH.events.emit('run:well', this); }
      }
      if (w && w.cool > 0) w.cool -= dt;
    }
    sendToWell(item) {
      if (!this.well || this.well.used) return;
      if (this.wellSent) this.wellExtra.push(item); else this.wellSent = item;
      if (!this.discardItem(item)) for (const sl in this.runGear) if (this.runGear[sl] === item) { delete this.runGear[sl]; this.recompute(); }
      // a Bucket lets the Well be used once more
      if (this.buckets > 0) this.buckets--; else this.well.used = true;
      this.burst(this.well.x, this.well.y, 20, ['#4ab0ff', '#ffffff'], 60);
      DH.audio.play('reward');
    }

    /* ---------------- misc ---------------- */
    burst(x, y, n, colors, spd) {
      if (this.settings.lowFx) n = Math.ceil(n / 2);
      for (let i = 0; i < n; i++) {
        if (this.parts.length > 700) this.parts.shift();
        const a = Math.random() * TAU, s = Math.random() * spd;
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: U.rand(0.3, 0.8), max: 0.8, c: U.pick(colors), s: Math.random() < 0.3 ? 2 : 1, g: 120 });
      }
    }
    text(x, y, str, color, big) { if (this.texts.length < 80) this.texts.push({ x, y, str: String(str), c: color, big: !!big, life: big ? 1.1 : 0.7, max: big ? 1.1 : 0.7 }); }
    nearest(x, y, maxD, exclude) {
      let best = null, bd = maxD * maxD;
      for (const e of this.enemies) { if (e.dead || e.def.prop || (exclude && exclude.has(e))) continue; const d = U.dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      return best;
    }
    randomTarget(maxD, x, y) {
      const p = this.player; x = x == null ? p.x : x; y = y == null ? p.y : y;
      for (const b of this.bosses) if (!b.dead && Math.random() < 0.45 && U.dist2(x, y, b.x, b.y) < maxD * maxD) return b;
      const c = [];
      for (const e of this.enemies) if (!e.dead && !e.def.prop && U.dist2(x, y, e.x, e.y) < maxD * maxD) c.push(e);
      return c.length ? U.pick(c) : null;
    }
    updateFx(dt) {
      for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.life -= dt; if (f.update) f.update(this, f, dt); if (f.life <= 0) this.fx.splice(i, 1); }
      for (let i = this.parts.length - 1; i >= 0; i--) { const q = this.parts[i]; q.life -= dt;
        if (q.home) { const P = this.player, dx = P.x - q.x, dy = P.y - 6 - q.y, d = Math.hypot(dx, dy) || 1; q.vx += dx / d * 520 * dt; q.vy += dy / d * 520 * dt; if (d < 4) q.life = 0; }
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy = q.vy * 0.94 + (q.g || 0) * dt; if (q.life <= 0) this.parts.splice(i, 1); }
      for (let i = this.texts.length - 1; i >= 0; i--) { const x = this.texts[i]; x.life -= dt; x.y -= dt * 22; if (x.life <= 0) this.texts.splice(i, 1); }
      for (let i = this.decals.length - 1; i >= 0; i--) { const d = this.decals[i]; d.life -= dt; if (d.life <= 0) this.decals.splice(i, 1); }
    }
    /** Damage dealt this run by kind (element / type), by the hero weapon and by all other abilities. */
    dmgTags() {
      const out = {}, add = (k, v) => { out[k] = (out[k] || 0) + v; };
      for (const id in this.dmgByAb) {
        const v = this.dmgByAb[id], def = C.abilities[id];
        const tags = def ? def.tags : id === 'spark' ? ['lightning'] : id === 'frost' ? ['ice'] : id === 'burn' ? ['fire'] : id === 'imp' ? ['fire', 'summon'] : [];
        tags.forEach((tg) => add(tg, v));
        if (def) add(id === this.hero.weapon ? 'weapon' : 'abilities', v);
      }
      return out;
    }
    summary() {
      return { stage: this.stageId, hero: this.heroId, time: this.time, kills: this.kills, gold: this.gold, level: this.level,
        bossKills: this.bossKills, eliteKills: this.eliteKills, championKills: this.championKills, tomes: this.tomes, bosses: this.bossesKilled.slice(),
        victory: this.state === 'victory', agony: this.agonyOn ? Math.floor(this.maxAgony + 1e-6) : 0, agonyOn: this.agonyOn,
        dmgByAb: Object.assign({}, this.dmgByAb), wellSent: this.wellSent, wellExtra: this.wellExtra.slice(), herbs: Object.assign({}, this.herbs), dread: this.dread,
        potionsUsed: Object.assign({}, this.potionsUsed), lateLevels: this.lateLevels || 0, runLength: this.runLength, artifactsFound: this.artifactsFound.slice(),
        shards: this.shards, hexed: this.hexed || !!this.dissoSolved || !!this.secretDone, secretT: this.secretT, elemApplied: !!this.elemApplied, abTimes: (this.abTimes || []).slice(), oozes: this.oozes, crits: this.crits || 0, dmgTags: this.dmgTags() };
    }
  }
  Run.Grid = Grid;
  DH.Run = Run;
})(window.DH);
