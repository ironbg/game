/* Combat maths, stats and trait choices (mixed into DH.Run.prototype).
 *  Damage   = (Base + Added Base) x (1 + additive %) x crit multiplier x vulnerability x (1 - enemy defence)
 *  Crit     = (Base Crit + Added Base Crit) x (1 + Increased Crit %); above 100% every hit crits and the
 *             excess scales the crit bonus (on-crit effects still trigger only once)
 *  Defence  = % reduction of damage taken, capped at 80%
 *  Block    = min(1/2 x B/D, 1/2 x sqrt(B/D), 1) chance to negate a hit completely (see run.js)
 *  Fragile  = +20% damage taken per stack, Affliction = +10% per stack (both uncapped); 50% of
 *             Affliction stacks jump to nearby enemies on death */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const tmp = [];
  const TAGS = ['physical', 'magic', 'fire', 'lightning', 'ice'];
  const EDGE = { dmgPct: 0.04, as: 0.03, area: 0.04, maxHpPct: 0.05, critPct: 0.04, speedPct: 0.03 }; // Master's Edge picks

  R.recompute = function (fill) {
    const st = DH.meta.baseStats(this.heroId, this.runGear);
    const add = (mods, k) => { for (const x in mods) st[x] = (st[x] || 0) + mods[x] * k; };
    const aff = this.hero.affinity || {};
    for (const id in this.traits.base) add(C.baseTraits[id].per, this.traits.base[id] * C.AFFINITY[aff[id] == null ? 1 : aff[id]]);
    for (const id in this.traits.elev) add(C.elevatedTraits[id].per, this.traits.elev[id]);
    for (const key in this.traits.cls) { const c = this.traits.cls[key]; add(C.heroes[c.hero].ct[c.cat][c.v].s, c.rank); }
    if (this.hero.potionBrew && this.brews) { st.dmgPct = (st.dmgPct || 0) + 0.05 * this.brews; st.baseHp += 1.7 * this.brews; } // Alchemist: every potion drunk strengthens his brews
    const lv = this.level - 1;
    let taken = 1;
    if (this.hero.perLevel) for (const k in this.hero.perLevel) { const v = this.hero.perLevel[k] * lv; if (k === 'taken') taken += v; else st[k] = (st[k] || 0) + v; } // Level Up Bonuses
    if (st.killAs) st.as = (st.as || 0) + Math.min(st.killAsMax || 0.1, this.killAsStacks * st.killAs);
    if (this.fx_.swapCrit) { const a = st.critPct || 0; st.critPct = st.critBonus - 0.5; st.critBonus = 0.5 + a; }
    // Artifacts that shape the hero's stats
    const fx = this.fx_ || {};
    if (fx.playerDmg) st.dmgPct = (st.dmgPct || 0) + fx.playerDmg;
    if (this.edge) for (const k in this.edge) st[k] = (st[k] || 0) + this.edge[k];
    if (fx.vice) st.baseHp = Math.max(20, st.baseHp - (this.level - 1));
    if (fx.deedXp) st.growth = (st.growth || 0) - (st.deedXp || 0) * (1 - fx.deedXp);
    if (fx.regret) { const n = Math.floor(this.kills / 100) * fx.regret; st.as = (st.as || 0) - n; st.area = (st.area || 0) - n; }
    if (fx.ms) st.ms = (st.ms || 0) + fx.ms;
    if (fx.silver) ['dmgPct', 'as', 'area', 'critPct', 'maxHpPct', 'speedPct', 'duration', 'critBonus', 'regen', 'block', 'defense'].forEach((k) => { if (st[k] > 0) st[k] *= fx.silver; });
    const B = this.buffs;
    if (B) { if (B.fury > 0) st.dmgPct = (st.dmgPct || 0) + 1; if (B.haste > 0) st.as = (st.as || 0) + 1; if (B.wraith > 0) st.speedPct = (st.speedPct || 0) + 0.5; }
    const prevMax = this.P ? this.P.maxHp : 0;
    const tag = {}; TAGS.forEach((t) => { tag[t] = st[(t === 'physical' ? 'phys' : t) + 'Pct'] || 0; });
    this.P = {
      maxHp: Math.max(10, Math.round(st.baseHp * (1 + (st.maxHpPct || 0)) * (this.fx_.maxHp || 1))),
      speed: st.baseSpeed * (1 + (st.speedPct || 0)) * (this.artifactSpeed ? this.artifactSpeed() : 1),
      regen: this.hero.noRegen ? 0 : Math.max(0, st.regen || 0),
      defense: st.defense || 0, block: st.block || 0, taken,
      dmgPct: st.dmgPct || 0, addBase: st.addBase || 0,
      critPct: st.critPct || 0, addCrit: st.addCrit || 0, critBonus: st.critBonus || 0.5,
      as: st.as || 0, area: st.area || 0, duration: st.duration || 0, count: Math.floor(st.count || 0), pierce: Math.floor(st.pierce || 0),
      ms: st.ms || 0, pickupR: 30 * (1 + (st.pickup || 0)), summonPct: st.summonPct || 0, summons: Math.floor(st.summons || 0),
      burn: st.burn || 0, spark: st.spark || 0, frost: st.frost || 0, decay: st.decay || 0, fragile: st.fragile || 0, affliction: st.affliction || 0,
      tag, growth: 1 + (st.growth || 0), greed: (1 + (st.greed || 0)) * (1 + this.dread * DH.economy.DREAD.gold),
      revives: st.revives || 0, rerolls: st.rerolls || 0,
      killAs: st.killAs || 0, eliteHeal: st.eliteHeal || 0, killHealChance: st.killHealChance || 0, killHeal: st.killHeal || 0,
      hitRegen: st.hitRegen || 0, thornBurn: st.thornBurn || 0, hitDefense: st.hitDefense || 0, stillDmg: st.stillDmg || 0, fireSpark: st.fireSpark || 0, imps: Math.floor(st.imps || 0),
      grenadePct: st.grenadePct || 0, effectPct: st.effectPct || 0, wBurn: st.wBurn || 0, wSpark: st.wSpark || 0, wFrost: st.wFrost || 0,
      sig: { fire: st.sig_fire || 0, ice: st.sig_ice || 0, lightning: st.sig_lightning || 0, magic: st.sig_magic || 0, physical: st.sig_physical || 0, summon: st.sig_summon || 0 },
    };
    const p = this.player;
    if (fill) p.hp = this.P.maxHp; else if (this.P.maxHp > prevMax) p.hp += this.P.maxHp - prevMax;
    p.hp = Math.min(p.hp, this.P.maxHp);
    this.abilities.forEach((a) => this.computeAbility(a));
  };

  R.abilityMods = function (a) {
    const def = C.abilities[a.id], m = {};
    const put = (mods, k) => { for (const x in mods) m[x] = (m[x] || 0) + mods[x] * k; };
    const tr = this.traits.ab[a.id] || {};
    for (const i in tr) put(def.traits[i].m, tr[i]);
    for (const u of this.traits.up[a.id] || []) put(C.UPGRADES[u], 1);
    if (a.weapon) for (const key in this.traits.cls) { const c = this.traits.cls[key]; put(C.heroes[c.hero].ct[c.cat][c.v].w, c.rank); }
    return m;
  };
  R.computeAbility = function (a) {
    const def = C.abilities[a.id], b = def.base, m = this.abilityMods(a), P = this.P;
    const tags = def.tags, isProj = tags.includes('projectile'), isSum = tags.includes('summon');
    a.tags = tags; a.noCrit = !!def.noCrit; a.split = !!def.split;
    const fx = this.fx_ || {};
    // Pale Chalice: area bonuses sap effect chance; Elemental Crucible: far fewer effects, but they hit twice as hard
    const eff = (1 + P.effectPct) * (fx.goblet ? Math.max(0.1, 1 - 0.333 * P.area) : 1) * (fx.incubator ? 0.3 : 1), w = a.weapon ? 1 : 0;
    a.s = {
      dmg: b.dmg, dmgPct: m.dmgPct || 0,
      cd: b.cd ? b.cd / Math.max(0.25, 1 + (def.noAs ? 0 : P.as) + (m.as || 0)) : 0,
      area: (b.area || 1) * (1 + P.area + (m.area || 0)),
      count: (b.count || 1) + Math.floor(m.count || 0) + (isProj || isSum ? P.count : 0) + (isSum ? P.summons : 0),
      pierce: (b.pierce || 0) + Math.floor(m.pierce || 0) + (isProj ? P.pierce : 0),
      speed: (b.speed || 0) * (1 + (m.speed || 0)),
      duration: (b.duration || 0) * (1 + P.duration + (m.duration || 0)),
      knock: (b.knock || 0) + (m.knock || 0),
      crit: (b.crit || 0) + (m.crit || 0) + (a.weapon && this.heroId === 'stormwitch' ? 0.01 * (this.level - 1) : 0),
      ms: def.noMs ? 0 : P.ms + (m.ms || 0),
      chain: (b.chain || 0) + (m.chain || 0), fork: m.fork || 0, orbit: m.orbit || 0, stream: m.stream || 0, chainRift: m.chainRift || 0,
      blockDmg: (b.blockDmg || 0) + (m.blockDmg || 0), hpCost: b.hpCost || 0,
      // effect chances; Marks of Incineration / Sorcery / the Beast add to the main weapon only
      burn: ((b.burn || 0) + (m.burn || 0) + P.burn + w * P.wBurn + (fx.scorch || 0)) * eff, spark: ((b.spark || 0) + (m.spark || 0) + P.spark + w * P.wSpark) * eff,
      frost: ((b.frost || 0) + (m.frost || 0) + P.frost + w * P.wFrost) * eff, decay: ((b.decay || 0) + (m.decay || 0) + P.decay) * eff,
      fragile: ((b.fragile || 0) + (m.fragile || 0) + P.fragile) * eff, affliction: ((b.affliction || 0) + (m.affliction || 0) + P.affliction) * eff,
      stun: ((b.stun || 0) + (m.stun || 0)) * eff,
      purge: m.purge || 0, pulse: m.pulse || 0, falloff: def.falloff || 0,
    };
    if (def.msToAs) { a.s.cd /= 1 + 0.5 * Math.max(0, a.s.ms); a.s.ms = 0; } // Arquebus: Multistrike speeds up the reload instead of adding shots
    if (def.beat) {
      const want = def.beat / Math.max(0.25, 1 + P.as + (m.as || 0));
      a.s.every = [8, 4, 2, 1, 0.5].find((v) => v <= want * 1.15) || 0.5;
      a.s.cd = a.s.every * 60 / DH.audio.BATTLE_BPM;
    }
  };
  R.addAbility = function (id) {
    const a = { id, weapon: this.abilities.length === 0, t: 0.4, ang: 0, s: null, rep: [] };
    this.abilities.push(a); this.computeAbility(a);
    (this.abTimes || (this.abTimes = [])).push(this.time || 0);
    return a;
  };
  /** Random stacks (Crit and Effect Chance): 3.1 = 3 sure stacks and a 10% chance of a 4th. */
  R.stacks = (ch) => ch <= 0 ? 0 : Math.floor(ch) + (Math.random() < ch % 1 ? 1 : 0);
  /** Deterministic stacks (Multistrike): the fraction fills an accumulator, 2.6 gives 2,3,3,2,3 ... */
  R.detStacks = (a, v) => { if (v <= 0) return 0; a.msAcc = (a.msAcc || 0) + (v % 1); let n = Math.floor(v); if (a.msAcc >= 1) { a.msAcc -= 1; n++; } return n; };
  /** Chance of the hit being a critical and the resulting multiplier. */
  R.critRoll = function (a) {
    if (a.noCrit) return 1;
    const P = this.P;
    const cc = (a.s.crit + P.addCrit) * (1 + P.critPct) * (this.fx_ && this.fx_.goblet ? Math.max(0.1, 1 - 0.333 * P.area) : 1);
    // over-crit (random stacks): every full 100% is a sure crit stack, the rest a chance of one more;
    // Final Damage = Damage x (1 + Crit Bonus x Crit Stacks)
    const tiers = R.stacks(cc);
    return tiers ? 1 + P.critBonus * tiers : 1;
  };

  /** Main hit. mult: extra multiplier (e.g. split damage). Returns damage dealt. */
  R.hit = function (e, a, mult, kx, ky) {
    if (!e || e.dead) return 0;
    if (e.def.prop) { this.killEnemy(e); return 0; }
    if (e.def.hits) { // Gilded Ooze: every hit counts as exactly one
      e.hp -= 1; e.flash = 0.1; DH.audio.play('coin');
      this.drop('coin', e.x, e.y, Math.ceil(this.stage.goldMult));
      if (e.hp <= 0) this.killEnemy(e);
      return 1;
    }
    if (e.sealed) { if (Math.random() < 0.08) this.text(e.x, e.y - e.r - 6, t('hud.sealedHit'), '#fff0a0'); return 0; }
    if (e.eth > 0) { if (Math.random() < 0.08) this.text(e.x, e.y - e.r - 6, t('sec.immune'), '#80f0ff'); return 0; } // ethereal Lord
    const P = this.P, s = a.s, fx = this.fx_;
    if (fx.targe && !e.boss) { // Hardened Buckler: enemies gain Block Strength as you level
      const B = fx.targe * this.level, D = Math.max(1, s.dmg), bc = Math.min(0.5 * B / D, 0.5 * Math.sqrt(B / D), 0.6);
      if (Math.random() < bc) { if (Math.random() < 0.3) this.text(e.x, e.y - e.r - 4, t('hud.block'), '#9ab0c8'); return 0; }
    }
    const base = s.dmg + P.addBase + (s.blockDmg ? P.block * s.blockDmg : 0);
    let pct = 1 + P.dmgPct + s.dmgPct;
    for (const tg of a.tags) if (P.tag[tg]) pct += P.tag[tg];
    if (a.tags.includes('summon')) pct += P.summonPct;
    if (P.stillDmg && this.stillT > 0.4) pct += P.stillDmg;
    const cm = this.critRoll(a), crit = cm > 1;
    const S = e.st;
    // Fragile / Affliction are applied before the damage of the same hit
    const cap = fx.edict ? 10 : Infinity; // Primal Edict: effect stacks are capped
    // Effect Chance above 100% applies several stacks at once (random stacks)
    let n = R.stacks(s.fragile); if (n) S.fragile = Math.min(cap, S.fragile + n);
    n = R.stacks(s.affliction); if (n) S.affl = Math.min(cap, S.affl + n);
    const exp = e.exposed > 0; // Hating Heart: the Lord's guard is down
    const vul = (1 + C.FRAGILE_PER * S.fragile) * (exp ? 1.5 : 1); // Fragile: +5% direct damage per stack
    const def = exp ? 0 : Math.max(0, e.armor - C.STATUS.decay.armor * S.decay); // Decay strips armor for good
    const dmg = Math.max(1, base * pct * cm * vul * (1 - def) * (mult == null ? 1 : mult) * (e.def.dmgFactor || 1) * U.rand(0.92, 1.08));
    e.hp -= dmg; e.flash = 0.1;
    this.dmgByAb[a.id] = (this.dmgByAb[a.id] || 0) + dmg;
    if (this.gAcc != null && a.tags.includes('projectile')) this.gAcc += dmg; // Landsknecht: projectile damage fills the next grenade
    if (crit) this.crits = (this.crits || 0) + 1;
    if (s.knock && (kx || ky)) { const k = s.knock / Math.sqrt(e.mass); e.kx += kx * k; e.ky += ky * k; }
    // elemental effects: stacks worth a share of the ability's base damage
    const ed = fx.incubator ? 2 : 1, eb = (s.dmg + P.addBase) * ed, ecap = fx.edict ? 10 : Infinity;
    n = R.stacks(s.burn); if (n) this.addBurn(e, n, eb * (1 + (P.tag.fire || 0)));
    let sparkCh = s.spark;
    if (crit && a.weapon && this.heroId === 'stormwitch') sparkCh += 0.5;
    if (P.fireSpark && a.tags.includes('fire')) sparkCh += P.fireSpark;
    n = R.stacks(sparkCh); if (n) this.addSpark(e, n, eb * (1 + (P.tag.lightning || 0)));
    S.frostMax = Math.max(S.frostMax, dmg); // the hardest single hit sets the Frost Wave's reach
    n = R.stacks(s.frost); if (n) this.addFrost(e, n, eb * (1 + (P.tag.ice || 0)));
    n = R.stacks(s.decay); if (n) { S.decay = Math.min(fx.edict ? 3 : ecap, S.decay + n); S.decayPS = Math.max(S.decayPS || 0, eb); }
    if (s.stun && !e.boss && Math.random() < s.stun) e.stun = C.STATUS.stun; // Stun: frozen in place; re-stunning refreshes, never stacks
    if (this.settings.dmgNumbers) this.text(e.x + U.rand(-4, 4), e.y - e.r - 4, Math.round(dmg), crit ? '#ffd35a' : '#ffffff', crit);
    this.hitSpark(e, a.tags, crit);
    DH.audio.play('hit');
    if (e.hp <= 0) this.killEnemy(e);
    else {
      if (S.frost >= C.STATUS.frost.max) this.frostExplode(e);
      else if (S.frost > 0) S.frostArmed = true; // it survived a hit: its death will release the wave
    }
    return dmg;
  };
  /** Damage from status effects and hazards: no crit, amplified by Affliction and Decay (Fragile only amplifies direct hits). */
  R.rawDamage = function (e, dmg, color, abId) {
    if (!e || e.dead) return;
    if (e.def.prop) { this.killEnemy(e); return; }
    if (e.def.hits || e.sealed || e.eth > 0) return;
    const S = e.st, d = dmg * (1 + C.AFFLICT_PER * S.affl) * (1 - Math.max(0, e.armor - 0.06 * S.decay)); // Affliction: +5% effect damage per stack
    e.hp -= d;
    if (abId) this.dmgByAb[abId] = (this.dmgByAb[abId] || 0) + d;
    if (color && this.settings.dmgNumbers && Math.random() < 0.5) this.text(e.x, e.y - e.r - 2, Math.round(d), color);
    if (e.hp <= 0) this.killEnemy(e);
  };
  /** Burn: n stacks worth `base`; every stack refreshes the fire, and past 20 a stack burns at once. */
  R.addBurn = function (e, n, base) {
    const B = C.STATUS.burn, S = e.st, per = base * B.per; this.elemApplied = true;
    S.burnPS = Math.max(S.burnPS || 0, per); S.burnT = B.dur;
    const room = B.max - S.burn, add = Math.min(room, n);
    S.burn += add;
    if (n > add) this.rawDamage(e, per * B.overflow * (n - add), '#ffb060', 'burn');
  };
  /** Frost: n stored stacks worth `base` (reach: a floor for the Frost Wave's reach). */
  R.addFrost = function (e, n, base, reach) {
    const S = e.st; this.elemApplied = true;
    S.frost = Math.min(C.STATUS.frost.max, S.frost + n); S.frostT = C.STATUS.frost.window; S.frostPS = Math.max(S.frostPS || 0, base);
    if (reach) { S.frostMax = Math.max(S.frostMax, reach); S.frostArmed = true; }
    if (reach && S.frost >= C.STATUS.frost.max && !e.dead) this.frostExplode(e);
  };
  /** Spark: n stacks worth `base`; past 20 a stack strikes for five at once. */
  R.addSpark = function (e, n, base) {
    const Z = C.STATUS.spark, S = e.st, per = base * Z.per; this.elemApplied = true;
    S.sparkPS = Math.max(S.sparkPS || 0, per);
    const fresh = !S.spark, room = Z.max - S.spark, add = Math.min(room, n);
    S.spark += add;
    if (fresh) S.sparkT = Z.tick * Math.pow(Z.shrink, Math.max(0, S.spark - 1));
    if (n > add) { this.rawDamage(e, per * Z.overflow * (n - add), '#fff27a', 'spark'); this.fx.push({ k: 'spark', x: e.x, y: e.y, life: 0.2, max: 0.2, seed: Math.random() * 999 }); }
  };
  /** Slow: stacks multiply speed by 0.91 each (up to 20). */
  R.addSlow = function (e, n) { const L = C.STATUS.slow; if (!e.slowS) e.slowT = L.tick / Math.max(1, n); e.slowS = Math.min(L.max, (e.slowS || 0) + n); };
  R.slowFactor = function (e) { return e.slowS > 0 ? Math.pow(C.STATUS.slow.mult, e.slowS) : 1; };

  R.tickStatus = function (e, dt) {
    const S = e.st, T = C.STATUS;
    if (S.burn > 0) {
      S.burnT -= dt; S.bAcc = (S.bAcc || 0) + dt;
      if (S.bAcc >= T.burn.tick) { S.bAcc -= T.burn.tick; this.rawDamage(e, S.burnPS * S.burn, '#ff9a40', 'burn'); if (Math.random() < 0.6) this.parts.push({ x: e.x + U.rand(-3, 3), y: e.y - 3, vx: 0, vy: -20, life: 0.4, max: 0.4, c: '#ff8a20', s: 1 }); }
      if (S.burnT <= 0) { S.burn = 0; S.burnPS = 0; S.bAcc = 0; }
    }
    if (e.dead) return;
    if (S.spark > 0) { // every tick strikes for every stack, then one stack is spent; more stacks tick faster
      S.sparkT -= dt;
      if (S.sparkT <= 0) {
        this.rawDamage(e, S.sparkPS * S.spark, '#fff27a', 'spark'); this.fx.push({ k: 'spark', x: e.x, y: e.y, life: 0.15, max: 0.15, seed: Math.random() * 999 });
        S.spark--; S.sparkT = T.spark.tick * Math.pow(T.spark.shrink, Math.max(0, S.spark - 1));
        if (!S.spark) S.sparkPS = 0;
      }
    }
    if (e.dead) return;
    if (S.decay > 0) { S.dAcc = (S.dAcc || 0) + dt; if (S.dAcc >= 1) { S.dAcc -= 1; this.rawDamage(e, S.decayPS * T.decay.per * S.decay, '#9adf50', 'decay'); } }
    if (S.frost > 0) { S.frostT -= dt; if (S.frostT <= 0) { S.frost = 0; S.frostArmed = false; } }
    // Fragile and Affliction halve on each tick; the more stacks, the sooner the tick
    const halve = (k, t) => { if (!S[k]) return; S[t] = (S[t] == null ? T.halve.tick / (1 + T.halve.k * S[k]) : S[t]) - dt; if (S[t] <= 0) { S[k] = Math.floor(S[k] / 2); S[t] = S[k] ? T.halve.tick / (1 + T.halve.k * S[k]) : null; } };
    halve('fragile', 'fT'); halve('affl', 'aT');
    if (e.slowS > 0) { e.slowT -= dt; if (e.slowT <= 0) { e.slowS--; e.slowT = T.slow.tick / Math.max(1, e.slowS); } }
  };
  /** The Frost Wave: every stored stack hits everyone around; its reach grows with the hardest hit the foe took. */
  R.frostExplode = function (e) {
    const S = e.st, r = U.clamp(12 + Math.sqrt(S.frostMax) * 1.8, 16, 70), dmg = S.frost * C.STATUS.frost.per * (S.frostPS || 0);
    S.frost = 0; S.frostArmed = false;
    this.fx.push({ k: 'frostburst', x: e.x, y: e.y, R: r, life: 0.4, max: 0.4 });
    DH.audio.play('frost');
    this.grid.query(e.x, e.y, r + 10, tmp);
    for (const o of tmp.slice()) if (!o.dead && U.dist2(e.x, e.y, o.x, o.y) < r * r) this.rawDamage(o, dmg, '#bfefff', 'frost');
  };
  /** On death half of the Affliction jumps to each foe nearby. */
  R.spreadAffliction = function (e) {
    const n = Math.floor(e.st.affl / 2); if (n <= 0) return;
    this.grid.query(e.x, e.y, 60, tmp);
    const near = tmp.filter((o) => o !== e && !o.dead && !o.def.prop).slice(0, 4);
    if (!near.length) return;
    near.forEach((o) => { o.st.affl += n; o.st.aT = null; });
    this.fx.push({ k: 'affl', x: e.x, y: e.y, to: near.map((o) => [o.x, o.y]), life: 0.3, max: 0.3 });
  };
  /** Hit every enemy touching a circle. filter(e) may veto; returns hit count. */
  R.hitCircle = function (x, y, r, a, mult, filter) {
    this.grid.query(x, y, r + 20, tmp);
    const list = [];
    for (const e of tmp) { if (e.dead) continue; const rr = r + e.r; if (U.dist2(x, y, e.x, e.y) < rr * rr && (!filter || filter(e) !== false)) list.push(e); }
    const m = a.split && list.length ? Math.max(1 / list.length, 0.12) * (mult || 1) : (mult || 1);
    for (const e of list) { const d = Math.hypot(e.x - x, e.y - y) || 1; this.hit(e, a, m, (e.x - x) / d, (e.y - y) / d); }
    return list.length;
  };
  R.canHit = function (e, key, cd) {
    if (!e.hc) e.hc = {};
    const last = e.hc[key] == null ? -99 : e.hc[key];
    if (this.time - last < cd) return false;
    e.hc[key] = this.time; return true;
  };

  /* ---------------- trait choices ---------------- */
  const ckey = (c) => c.kind + ':' + (c.kind === 'cls' ? c.hero + '.' + c.cat + '.' + c.v : c.kind === 'ab' ? c.ab + '.' + c.idx : c.kind === 'up' ? c.ab + '.' + c.id : c.id);
  R.choiceKey = ckey;
  R.classHeroes = function () {
    const m = DH.meta.eq(this.heroId).mark;
    return m && m !== this.heroId && C.heroes[m] ? [this.heroId, m] : [this.heroId];
  };
  R.classPool = function (level) {
    const out = [], allowed = C.CLASS_LEVELS.filter((l) => l <= level).length;
    for (const h of this.classHeroes()) for (const cat of ['wp', 'st', 'dd']) for (const v of [0, 1]) {
      const cur = (this.traits.cls[h + '.' + cat + '.' + v] || {}).rank || 0;
      const sis = (this.traits.cls[h + '.' + cat + '.' + (1 - v)] || {}).rank || 0;
      const c = { kind: 'cls', hero: h, cat, v, rank: cur + 1, sister: sis > 0 };
      if (this.banished.has(ckey(c))) continue;
      if (sis > 0 && cur === 0) continue; // the sister variant was taken
      if (cur >= allowed || cur >= 5) continue;
      out.push(c);
    }
    return out;
  };
  R.normalPool = function (level, abilityOnly) {
    const out = [];
    if (!abilityOnly) {
      const fx = this.fx_ || {}, DEF = ['vitality', 'metabolism', 'parry', 'thickhide'];
      if (!fx.leash) for (const id in C.baseTraits) { if (fx.glass && DEF.includes(id)) continue; const r = this.traits.base[id] || 0; if (r < C.BASE_TRAIT_MAX) out.push({ kind: 'base', id, rank: r + 1, w: 1 }); }
      const tiers = C.ELEVATED_LEVELS.filter((l) => l <= level).length;
      for (const id in C.elevatedTraits) { const r = this.traits.elev[id] || 0; if (r < tiers) out.push({ kind: 'elev', id, rank: r + 1, w: 1.3 }); }
    }
    if (level >= C.ABILITY_TRAIT_EVERY) {
      const allowed = Math.floor(level / C.ABILITY_TRAIT_EVERY);
      for (const a of this.abilities) {
        const tr = this.traits.ab[a.id] || {}; const used = Object.values(tr).reduce((x, y) => x + y, 0);
        const sig = this.signetBonus(a.id);
        if (used >= allowed + sig) continue;
        C.abilities[a.id].traits.forEach((T, idx) => {
          const r = tr[idx] || 0;
          if (r >= C.ABILITY_TRAIT_MAX + (sig ? 1 : 0)) return;
          if (!this.hero.anyAbilityTrait && !DH.meta.abilityTraitUnlocked(a.id, idx)) return;
          out.push({ kind: 'ab', ab: a.id, idx, rank: r + 1, w: 1.2 });
        });
      }
    }
    return out.filter((c) => !this.banished.has(ckey(c)));
  };
  /** Ability Signets (rings): extra upgrade picks for abilities sharing the signet's element. */
  R.signetBonus = function (abId) {
    const tags = C.abilities[abId].tags, sg = this.P.sig; let n = 0;
    for (const k in sg) if (sg[k] && tags.includes(k)) n += Math.floor(sg[k] + 1e-6);
    return Math.min(3, n);
  };
  /** Ability Upgrades waiting to be picked: ability level (sum of trait ranks) reached III / VI (/ IX with a Signet or as the Oracle). */
  R.pendingUpgrade = function () {
    for (const a of this.abilities) {
      const def = C.abilities[a.id]; if (!def.ups) continue;
      const lvl = Object.values(this.traits.ab[a.id] || {}).reduce((x, y) => x + y, 0), taken = this.traits.up[a.id] || [];
      const max = this.signetBonus(a.id) > 0 || this.hero.anyAbilityTrait ? 3 : 2;
      if (taken.length >= max || lvl < C.UPGRADE_LEVELS[taken.length]) continue;
      const opts = (taken.length < 2 ? def.ups[taken.length] : def.ups[0].concat(def.ups[1])).filter((u) => !taken.includes(u));
      const out = opts.map((u) => ({ kind: 'up', ab: a.id, id: u, tier: taken.length + 1 })).filter((c) => !this.banished.has(ckey(c)));
      if (out.length) return out;
    }
    return null;
  };
  R.rollChoices = function (level, abilityOnly) {
    const up = !abilityOnly && !C.CLASS_LEVELS.includes(level) && this.pendingUpgrade();
    if (up) return up;
    let pool = !abilityOnly && C.CLASS_LEVELS.includes(level) ? this.classPool(level) : [];
    let n = C.MAX_TRAIT_CHOICES;
    if (pool.length) n = Math.min(4, pool.length);
    else pool = this.normalPool(level, abilityOnly);
    const out = [];
    pool = pool.slice();
    while (out.length < n && pool.length) {
      let tot = 0; pool.forEach((c) => { tot += c.w || 1; });
      let r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].w || 1; if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    if (!out.length && !abilityOnly) {
      if (this.fx_ && this.fx_.edge) U.shuffle(Object.keys(EDGE)).slice(0, 3).forEach((k) => out.push({ kind: 'edge', id: k, stat: k, v: EDGE[k] })); // Master's Edge
      else out.push({ kind: 'gold', amount: Math.round(25 * this.stage.goldMult) }, { kind: 'heal', amount: 0.3 });
    }
    if (!abilityOnly && this.remembered && !out.some((c) => ckey(c) === ckey(this.remembered))) out.push(Object.assign({}, this.remembered, { remembered: true }));
    return out;
  };
  R.applyChoice = function (c, times) {
    times = times || 1;
    if (c.kind === 'base') this.traits.base[c.id] = (this.traits.base[c.id] || 0) + times;
    else if (c.kind === 'elev') this.traits.elev[c.id] = (this.traits.elev[c.id] || 0) + times;
    else if (c.kind === 'cls') { const k = c.hero + '.' + c.cat + '.' + c.v; const o = this.traits.cls[k] || { hero: c.hero, cat: c.cat, v: c.v, rank: 0 }; o.rank += times; this.traits.cls[k] = o; }
    else if (c.kind === 'ab') { const tr = this.traits.ab[c.ab] || (this.traits.ab[c.ab] = {}); tr[c.idx] = (tr[c.idx] || 0) + times; }
    else if (c.kind === 'up') (this.traits.up[c.ab] || (this.traits.up[c.ab] = [])).push(c.id);
    else if (c.kind === 'edge') (this.edge || (this.edge = {}))[c.stat] = (this.edge[c.stat] || 0) + c.v * times;
    else if (c.kind === 'gold') this.gold += c.amount;
    else if (c.kind === 'heal') this.heal(this.P.maxHp * c.amount);
    if (this.remembered && ckey(this.remembered) === ckey(c)) this.remembered = null;
    this.recompute();
  };
  R.choose = function (c, echo) {
    this.applyChoice(c, echo ? 2 : 1);
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.state = 'playing';
    this.pump();
  };
  R.reroll = function (free) {
    if (!free) { if (this.rerolls <= 0) return false; this.rerolls--; }
    this.choices = this.rollChoices(this.levelFor || this.level);
    return true;
  };
  R.usePotion = function (kind, c) {
    if (!this.potions[kind]) return false;
    this.potions[kind]--; this.potionsUsed[kind] = (this.potionsUsed[kind] || 0) + 1;
    if (kind === 'remembrance') { this.remembered = Object.assign({}, c); delete this.remembered.remembered; }
    else if (kind === 'lethe') {
      this.banished.add(ckey(c));
      const idx = this.choices.indexOf(c);
      const pool = (C.CLASS_LEVELS.includes(this.levelFor) ? this.classPool(this.levelFor) : this.normalPool(this.levelFor)).filter((x) => !this.choices.some((y) => ckey(y) === ckey(x)));
      if (idx >= 0) { if (pool.length) this.choices[idx] = U.pick(pool); else this.choices.splice(idx, 1); }
    }
    return true;
  };
})(window.DH);
