/* Ability behaviours, summons and projectiles (mixed into DH.Run.prototype). */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;
  const tmp = [];
  const aimAt = (run, range) => { const p = run.player, e = run.nearest(p.x, p.y, range); return e ? Math.atan2(e.y - p.y, e.x - p.x) : Math.atan2(p.dirY, p.dirX); };
  const angDiff = (a, b) => { let d = a - b; return Math.atan2(Math.sin(d), Math.cos(d)); };
  /** Manual aim for the hero's main weapon (right stick / mouse), else null: abilities always aim themselves. */
  R.manualAimAngle = function () { const v = DH.input.aim(); return v ? Math.atan2(v.y, v.x) : null; };
  R.manualAim = function (a) { if (a && !a.weapon) return null; const v = DH.input.aim(); return v ? Math.atan2(v.y, v.x) : null; };
  /** The nearest foe within `range` whose bearing lies within `half` radians of `ang`. */
  R.nearestInCone = function (x, y, range, ang, half, ex) {
    let best = null, bd = range * range;
    for (const e of this.enemies) { if (e.dead || e.def.prop || (ex && ex.has(e))) continue; const dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy; if (d < bd && Math.abs(angDiff(Math.atan2(dy, dx), ang)) <= half) { bd = d; best = e; } }
    return best;
  };
  const PLANTS = ['snare', 'biter', 'pod', 'spitter'];
  // Crone's plants: each strikes with its own damage type
  const PLANT_TAGS = { snare: ['physical', 'summon', 'area'], biter: ['physical', 'summon', 'melee'], pod: ['magic', 'summon', 'area'], spitter: ['magic', 'summon', 'projectile'] };
  // Alchemist's brews: the bomb (no puddle) and four elements, enabled by other sources of that element
  const BREW = { bomb: { tags: ['physical', 'area'], col: '#d8c8a0' }, fire: { tags: ['fire', 'area'], eff: 'burn', col: '#ff7a30' }, lightning: { tags: ['lightning', 'area'], eff: 'spark', col: '#fff080' },
    ice: { tags: ['ice', 'area'], eff: 'frost', col: '#80d8ff' }, earth: { tags: ['physical', 'area'], eff: 'decay', col: '#9adf50' } };
  C.BREW = BREW;
  const proj = (run, o) => { o.hit = o.hit || new Set(); o.life = o.life || 1; run.proj.push(o); return o; };

  /** A volley in one direction: along the hand aim (hero weapon) or at the nearest foe; shots fan out by `spread`.
   *  Returns the base angle, or null when there is nothing to shoot at (and `need` is set). */
  const volley = (run, a, range, spread, need, shot) => {
    const p = run.player, man = run.manualAim(a); let base = man;
    if (base == null) { const tg = run.nearest(p.x, p.y, range); if (tg) base = Math.atan2(tg.y - p.y, tg.x - p.x); else if (need) return null; else base = U.rand(0, TAU); }
    const n = a.s.count; for (let i = 0; i < n; i++) shot(base + (i - (n - 1) / 2) * spread, i);
    if (man != null) p.face = Math.cos(man) >= 0 ? 1 : -1;
    return base;
  };
  R.after = function (d, fn) { (this.timers || (this.timers = [])).push({ t: d, fn }); };

  const AB = {
    /* ---------- hero weapons ---------- */
    cleave: { fire(run, a) {
      const p = run.player, s = a.s, R = 36 * s.area, arc = 2.3;
      const man = run.manualAim(a), near = man == null ? run.nearest(p.x, p.y, R * 1.3) : null;
      const base = man != null ? man : near ? Math.atan2(near.y - p.y, near.x - p.x) : Math.atan2(p.dirY, p.dirX);
      if (man != null) p.face = Math.cos(man) >= 0 ? 1 : -1; else if (near) p.face = near.x > p.x ? 1 : -1;
      for (let i = 0; i < s.count; i++) {
        const ang = base + i * TAU / s.count;
        run.fx.push({ k: 'slash', x: p.x, y: p.y, ang, R, arc, life: 0.22, max: 0.22, follow: true, flip: i % 2, color: '#e8f0ff' });
        run.hitCircle(p.x, p.y, R, a, 1, (e) => Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), ang)) <= arc / 2 + 0.2);
      }
      DH.audio.play('swing');
    } },
    longbow: { fire(run, a) {
      // one volley in one direction: along the hand aim, or at the nearest foe; extra arrows fan out beside the first
      const p = run.player, s = a.s;
      const base = volley(run, a, 240, 0.08, true, (ang) => proj(run, { k: 'arrow', a, x: p.x, y: p.y - 2, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 4, pierce: s.pierce, life: 1.3 }));
      if (base == null) return false;
      p.face = Math.cos(base) >= 0 ? 1 : -1; DH.audio.play('bow');
    } },
    judgment: { fire(run, a) {
      const s = a.s, used = new Set();
      let fired = 0;
      for (let i = 0; i < s.count; i++) {
        const man = run.manualAim(a); let tg = man != null ? run.nearestInCone(run.player.x, run.player.y, 170, man, 0.7, used) : null;
        for (let k = 0; k < 5 && !tg; k++) { const c = run.randomTarget(170); if (c && !used.has(c)) tg = c; }
        if (!tg) { if (!fired) return false; break; }
        used.add(tg); fired++;
        const x = tg.x, y = tg.y, R = 28 * s.area;
        run.fx.push({ k: 'smite', x, y, R, life: 0.45, max: 0.45 }); run.castCircle(x, y, R, '#ffe08a');
        run.after(0.18, () => { run.hitCircle(x, y, R, a); run.shake = Math.max(run.shake, 2); DH.audio.play('boom'); run.burst(x, y, 10, ['#fff6c0', '#ffd35a'], 80); });
      }
    } },
    flamejet: { fire(run, a) {
      const p = run.player, s = a.s, man = run.manualAim(a), tg = man == null ? run.nearest(p.x, p.y, 120) : null;
      if (man == null && !tg) return false;
      const base = man != null ? man : Math.atan2(tg.y - p.y, tg.x - p.x); p.face = Math.cos(base) >= 0 ? 1 : -1;
      const ang = base + U.rand(-0.3, 0.3) * s.area, sp = U.rand(130, 170);
      proj(run, { k: 'flame', a, x: p.x + Math.cos(base) * 8, y: p.y + Math.sin(base) * 8 - 2, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: 4 * s.area, grow: 10 * s.area, pierce: 999, life: 0.55 * (1 + s.duration), max: 0.55 * (1 + s.duration) });
      DH.audio.play('fire');
    } },
    spirits: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const ang = U.rand(0, TAU);
        run.allies.push({ kind: 'spirit', a, x: p.x, y: p.y, vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60, life: s.duration, t: 0 });
      }
      DH.audio.play('throw');
    } },
    shieldbash: { fire(run, a) {
      const p = run.player, s = a.s, R = 30 * s.area, arc = 2.4, man = run.manualAim(a), near = man == null ? run.nearest(p.x, p.y, R * 1.4) : null;
      const base = man != null ? man : near ? Math.atan2(near.y - p.y, near.x - p.x) : Math.atan2(p.dirY, p.dirX);
      if (man != null) p.face = Math.cos(man) >= 0 ? 1 : -1; else if (near) p.face = near.x > p.x ? 1 : -1;
      for (let i = 0; i < s.count; i++) {
        const ang = base + i * TAU / s.count;
        run.fx.push({ k: 'bash', x: p.x, y: p.y, ang, R, life: 0.25, max: 0.25, follow: true });
        run.hitCircle(p.x, p.y, R, a, 1, (e) => Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), ang)) <= arc / 2 + 0.2);
      }
      DH.audio.play('swing'); DH.audio.play('block');
    } },
    arcbolt: { fire(run, a) {
      const p = run.player, s = a.s, ex = new Set();
      let fired = 0;
      for (let i = 0; i < s.count; i++) {
        const man = run.manualAim(a), tg = man != null ? run.nearestInCone(p.x, p.y, 220, man, 0.6, ex) : run.nearest(p.x, p.y, 220, ex); if (!tg) break;
        fired++;
        let from = { x: p.x, y: p.y - 4 }, cur = tg; const pts = [[from.x, from.y]];
        for (let c = 0; c <= s.chain && cur; c++) {
          ex.add(cur); pts.push([cur.x, cur.y]); run.hit(cur, a, c ? 0.8 : 1);
          cur = run.nearest(cur.x, cur.y, 80, ex);
        }
        run.fx.push({ k: 'chain', pts, life: 0.2, max: 0.2, seed: Math.random() * 999, color: '#bfe6ff' });
      }
      if (!fired) return false;
      DH.audio.play('zap');
    } },
    wolves: { update(run, a) { run.keepAllies('wolf', a, a.s.count); } },
    frostaxe: { fire(run, a) {
      const p = run.player, s = a.s, man = run.manualAim(a), ang0 = man != null ? man : aimAt(run, 70);
      for (let i = 0; i < s.count; i++) {
        const ang = ang0 + i * Math.PI, x = p.x + Math.cos(ang) * 16, y = p.y + Math.sin(ang) * 16, R = 28 * s.area;
        run.fx.push({ k: 'slam', x, y, R, life: 0.4, max: 0.4, color: '#bfefff' });
        run.hitCircle(x, y, R, a);
      }
      run.shake = Math.max(run.shake, 2); DH.audio.play('frost'); DH.audio.play('swing');
    } },
    arcaneorb: { fire(run, a) {
      const p = run.player, s = a.s, man = run.manualAim(a), base = man != null ? man : aimAt(run, 200);
      for (let i = 0; i < s.count; i++) {
        const ang = base + (i - (s.count - 1) / 2) * 0.5;
        // a slow, grinding sphere: it lingers in the horde and hits everything inside it five times a second
        proj(run, { k: 'orb', a, x: p.x, y: p.y - 3, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, r: 10 * Math.sqrt(s.area), pierce: 999, life: s.duration, cdHit: 0.2 });
      }
      DH.audio.play('fire');
    } },
    bloodpulse: { fire(run, a) {
      const p = run.player, s = a.s;
      if (!run.nearest(p.x, p.y, 60 * s.area)) return false;
      const cost = Math.max(1, p.hp * s.hpCost);
      if (p.hp - cost < 1) return false;
      p.hp -= cost;
      for (let i = 0; i < s.count; i++) run.after(i * 0.25, () => {
        const R = 46 * s.area;
        run.fx.push({ k: 'pulse', x: p.x, y: p.y, R, life: 0.35, max: 0.35, follow: true, color: '#ff2040' });
        run.hitCircle(p.x, p.y, R, a);
      });
      DH.audio.play('boom');
    } },
    scythes: { update(run, a, dt) { orbit(run, a, dt, 'scythe', 40, 8, 0.4); } },

    /* ---------- Landsknecht, Alchemist, Crone ---------- */
    arquebus: {
      update(run, a, dt) { // Grenades: every 3s (not sped up by attack speed) a throw of the projectile damage dealt since the last one
        if (!run.hero.grenades) return;
        if (run.gAcc == null) run.gAcc = 0;
        a.gT = (a.gT == null ? 3 : a.gT) - dt;
        if (a.gT > 0) return;
        a.gT = 3;
        const acc = run.gAcc; run.gAcc = 0;
        if (acc <= 0) return; // no projectile damage, no grenade
        const p = run.player, dmg = Math.max(1, 0.04 * acc + 0.3 * Math.pow(acc, 0.8)) * Math.max(0.1, 1 + run.P.grenadePct), n = 1 + run.detStacks(a, run.P.ms);
        for (let i = 0; i < n; i++) {
          const tg = run.randomTarget(140) || run.nearest(p.x, p.y, 200), an = U.rand(0, TAU);
          const tx = tg ? tg.x + U.rand(-6, 6) : p.x + Math.cos(an) * 60, ty = tg ? tg.y + U.rand(-6, 6) : p.y + Math.sin(an) * 50;
          run.after(i * 0.15, () => proj(run, { k: 'grenade', a, x: p.x, y: p.y - 4, sx: p.x, sy: p.y - 4, tx, ty, ft: 0, fd: 0.55, ang: 0, r: 0, pierce: 0, life: 2, gdmg: dmg, R: 35 * (1 + run.P.area) }));
        }
        DH.audio.play('throw');
      },
      fire(run, a) {
        const p = run.player, s = a.s, man = run.manualAim(a);
        let base = man;
        if (base == null) { const tg = run.nearest(p.x, p.y, 260); if (!tg) return false; base = Math.atan2(tg.y - p.y, tg.x - p.x); }
        p.face = Math.cos(base) >= 0 ? 1 : -1;
        const mx = p.x + Math.cos(base) * 14, my = p.y - 3 + Math.sin(base) * 14;
        for (let i = 0; i < s.count; i++) {
          const ang = base + (i - (s.count - 1) / 2) * 0.12 + U.rand(-0.03, 0.03);
          proj(run, { k: 'bullet', a, x: mx, y: my, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 3, pierce: s.pierce, life: 0.7 });
        }
        run.fx.push({ k: 'muzzle', x: mx, y: my, ang: base, life: 0.14, max: 0.14 });
        for (let i = 0; i < 7; i++) { const sp = U.rand(8, 40); run.parts.push({ x: mx, y: my, vx: Math.cos(base) * sp + U.rand(-10, 10), vy: Math.sin(base) * sp - U.rand(6, 22), life: U.rand(0.5, 1.1), max: 1.1, c: U.pick(['#8a8a90', '#6a6a72', '#b4b4bc']), s: U.pick([1, 2]) }); }
        run.shake = Math.max(run.shake, 1.2); DH.audio.play('gun');
      },
    },
    concoction: { fire(run, a) {
      const p = run.player, s = a.s, els = run.brewElements(), man = run.manualAim(a);
      for (let i = 0; i < s.count; i++) {
        a.spin = (a.spin || 0) + 2.4; // the throws walk around the Alchemist
        const ang = man != null ? man + U.rand(-0.35, 0.35) : a.spin, d = U.rand(44, 70) * Math.sqrt(s.area);
        const tg = run.nearestInCone(p.x, p.y, 115, ang, 1.3) || (man == null ? run.randomTarget(100) : null); // it lands on a foe in the sector it swings through
        a.elI = (a.elI || 0) + 1;
        const el = els.length ? els[a.elI % els.length] : null;
        proj(run, { k: 'brewflask', a, el, x: p.x, y: p.y - 4, sx: p.x, sy: p.y - 4, tx: tg ? tg.x + U.rand(-5, 5) : p.x + Math.cos(ang) * d, ty: tg ? tg.y + U.rand(-4, 4) : p.y + Math.sin(ang) * d * 0.8, ft: 0, fd: 0.42, ang: 0, r: 0, pierce: 0, life: 2 });
      }
      if (man != null) p.face = Math.cos(man) >= 0 ? 1 : -1;
      DH.audio.play('throw');
    } },
    bogplants: { update(run, a, dt) {
      const p = run.player, s = a.s, mine = [];
      for (const al of run.allies) if (al.kind === 'plant' && al.a === a) mine.push(al);
      a.nPlants = mine.length;
      if (run.hero.blessing) run.plantSlow = Math.max(0.72, 1 - 0.035 * mine.length); // Crone's Curse
      a.moved = (a.moved || 0) + (p.moving ? run.P.speed * dt : 0);
      a.t -= dt;
      const walk = a.moved >= 60;
      if (a.t > 0 && !walk) return;
      if (mine.length >= s.count) {
        if (!walk) { a.t = 0.25; return; }
        let old = mine[0]; for (const al of mine) if (al.life < old.life) old = al; // walking on: the oldest plant withers and a new one sprouts
        old.life = Math.min(old.life, 0.3); old.wither = true;
      }
      a.t = s.cd; a.moved = 0;
      const tg = run.nearest(p.x, p.y, 90); let x, y;
      if (tg) { const k = U.rand(0.45, 0.75); x = p.x + (tg.x - p.x) * k + U.rand(-8, 8); y = p.y + (tg.y - p.y) * k + U.rand(-6, 6); }
      else { const an = U.rand(0, TAU), d = U.rand(18, 34); x = p.x + Math.cos(an) * d; y = p.y + Math.sin(an) * d * 0.8; }
      a.pi = ((a.pi == null ? -1 : a.pi) + 1) % PLANTS.length;
      run.allies.push({ kind: 'plant', type: PLANTS[a.pi], a, x, y, t: 0, life: s.duration, max: s.duration, face: tg && tg.x < x ? -1 : 1, cd: U.rand(0.1, 0.4) });
      for (let i = 0; i < 6; i++) run.parts.push({ x: x + U.rand(-5, 5), y: y + U.rand(-2, 2), vx: U.rand(-15, 15), vy: U.rand(-30, -10), life: 0.5, max: 0.5, c: U.pick(['#4a3a22', '#6a8a30', '#2a3a18']), s: 1 });
    } },

    /* ---------- tome abilities ---------- */
    hexlance: { fire(run, a) {
      const p = run.player, s = a.s;
      volley(run, a, 230, 0.12, false, (ang) => proj(run, { k: 'hex', a, x: p.x, y: p.y - 3, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 4, pierce: 999, life: 1.2, fork: s.fork }));
      DH.audio.play('zap');
    } },
    chakrams: { fire(run, a) {
      const p = run.player, s = a.s;
      volley(run, a, 200, 0.3, false, (ang) => proj(run, { k: 'chakram', a, x: p.x, y: p.y, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 6 * Math.sqrt(s.area), pierce: 999, life: s.duration * 2 + 2, out: s.duration, cdHit: 0.3, orbit: s.orbit ? { a: ang, rad: 8, t: s.duration } : null }));
      DH.audio.play('throw');
    } },
    orbs: { update(run, a, dt) { orbit(run, a, dt, 'orb', 30, 6, 0.5); } },
    darts: { fire(run, a) {
      const p = run.player, s = a.s;
      if (volley(run, a, 230, 0.08, true, (ang) => proj(run, { k: 'dart', a, x: p.x, y: p.y - 2, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 3, pierce: s.pierce, life: 0.8 })) == null) return false;
      DH.audio.play('throw');
    } },
    wyrmfire: { fire(run, a) {
      const p = run.player, s = a.s, tg = run.nearest(p.x, p.y, 150);
      if (!tg) return false;
      const base = Math.atan2(tg.y - p.y, tg.x - p.x);
      const stream = s.stream > 0;
      const n = stream ? 1 : s.count;
      for (let i = 0; i < n; i++) {
        const ang = base + (stream ? U.rand(-0.08, 0.08) : (i - (n - 1) / 2) * 0.24);
        proj(run, { k: 'wave', a, x: p.x, y: p.y - 2, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 4, grow: 9 * s.area, pierce: 999, life: s.duration, max: s.duration, mult: stream ? 0.35 : 1 });
      }
      if (stream) a.cdNext = a.s.cd * 0.18;
      DH.audio.play('fire');
    } },
    stormsphere: { fire(run, a) {
      const p = run.player, s = a.s;
      volley(run, a, 160, 0.35, false, (ang) => proj(run, { k: 'sphere', a, x: p.x, y: p.y - 3, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, r: 5, pierce: 999, life: s.duration, pulse: 0, cdHit: 99 }));
      DH.audio.play('zap');
    } },
    halo: { update(run, a, dt) {
      const p = run.player, s = a.s; a.R = 42 * s.area; a.ang += dt; a.pulse = Math.max(0, (a.pulse || 0) - dt * 3);
      a.t -= dt;
      if (a.t <= 0) { a.t = s.cd; a.pulse = 1; run.hitCircle(p.x, p.y, a.R, a); }
    } },
    rifts: {
      fire(run, a) {
        const p = run.player, s = a.s, mine = run.zones.filter((z) => z.kind === 'rift' && z.a === a).length;
        if (mine >= s.count * 3) return false;
        const ang = U.rand(0, TAU), d = U.rand(40, 110);
        run.zones.push({ kind: 'rift', a, x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d, r: 10, life: s.duration, max: s.duration });
        run.castCircle(p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d, 16, '#c070ff');
      },
    },
    skyfall: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const tg = run.randomTarget(220); const x = tg ? tg.x + U.rand(-8, 8) : p.x + U.rand(-120, 120), y = tg ? tg.y + U.rand(-8, 8) : p.y + U.rand(-90, 90), R = 30 * s.area;
        run.fx.push({ k: 'meteor', x, y, R, life: 0.7, max: 0.7 }); run.castCircle(x, y, R, '#ff7a30');
        run.after(0.7, () => { run.hitCircle(x, y, R, a); run.fx.push({ k: 'explosion', x, y, R, life: 0.4, max: 0.4 }); run.burst(x, y, 14, ['#ff6a1a', '#ffd35a', '#7c1624'], 100); run.shake = Math.max(run.shake, 2.5); DH.audio.play('boom'); });
      }
    } },
    golem: { update(run, a) { run.keepAllies('golem', a, a.s.count); } },
    phantom: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) run.allies.push({ kind: 'phantom', a, x: p.x + U.rand(-12, 12), y: p.y + U.rand(-12, 12), life: s.duration, t: 0, face: 1 });
      DH.audio.play('roar');
    } },
    avalanche: { fire(run, a) {
      const p = run.player, s = a.s, base = aimAt(run, 200);
      for (let i = 0; i < s.count; i++) {
        const ang = base + (i - (s.count - 1) / 2) * 0.4;
        for (let k = 0; k < 7; k++) {
          const d = 16 + k * 15 * Math.sqrt(s.area), x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d, R = 13 * s.area;
          run.after(k * 0.06, () => { run.fx.push({ k: 'spike', x, y, R, life: 0.5, max: 0.5 }); run.hitCircle(x, y, R, a); });
        }
      }
      DH.audio.play('frost');
    } },
    hail: { fire(run, a) {
      // Hailstorm gathers hailstones while the hero keeps moving and drops them all, heavier, once they stop
      const p = run.player, s = a.s; a.store = a.store || 0;
      if (p.moving && a.store < s.count * 5) { a.store += s.count; return; }
      const heavy = a.store > 0, n = Math.max(s.count, a.store), k = heavy ? 1.3 : 1; a.store = 0;
      for (let i = 0; i < n; i++) {
        const tg = run.randomTarget(170); const x = tg ? tg.x + U.rand(-6, 6) : p.x + U.rand(-100, 100), y = tg ? tg.y + U.rand(-6, 6) : p.y + U.rand(-80, 80), R = 12 * s.area * (heavy ? 1.2 : 1);
        run.after(i * 0.04, () => run.fx.push({ k: 'hail', x, y, R, life: 0.35, max: 0.35 }));
        run.after(0.3 + i * 0.04, () => { run.hitCircle(x, y, R, a, k); run.burst(x, y, 5, ['#e8f8ff', '#9fd8ff'], 50); });
      }
      DH.audio.play('glass');
    } },
    flail: { update(run, a, dt) { orbit(run, a, dt, 'flail', 34, 9, 0.5); } },
    fists: { fire(run, a) {
      const p = run.player;
      if (volley(run, a, 80, 0.15, true, (ang) => proj(run, { k: 'fist', a, x: p.x + Math.cos(ang) * 6, y: p.y + Math.sin(ang) * 6, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, ang, r: 5, pierce: 0, life: 0.35 })) == null) return false;
      DH.audio.play('swing');
    } },
    storm: { fire(run, a) {
      const s = a.s, used = new Set(); let n = 0;
      for (let i = 0; i < s.count; i++) {
        let tg = null; for (let k = 0; k < 6 && !tg; k++) { const c = run.randomTarget(200); if (c && !used.has(c)) tg = c; }
        if (!tg) break; used.add(tg); n++;
        run.fx.push({ k: 'bolt', x: tg.x, y: tg.y, life: 0.28, max: 0.28, seed: Math.random() * 1000 });
        run.hitCircle(tg.x, tg.y, 14 * s.area, a);
        let cur = tg; const ex = new Set([tg]); const pts = [[tg.x, tg.y]];
        for (let c = 0; c < s.chain; c++) { cur = run.nearest(cur.x, cur.y, 70, ex); if (!cur) break; ex.add(cur); pts.push([cur.x, cur.y]); run.hit(cur, a, 0.7); }
        if (pts.length > 1) run.fx.push({ k: 'chain', pts, life: 0.2, max: 0.2, seed: Math.random() * 999, color: '#fff6a0' });
        run.burst(tg.x, tg.y, 6, ['#fff0a0', '#ffffff', '#6ad8f0'], 70);
      }
      if (!n) return false;
      DH.audio.play('zap');
    } },
    axes: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const side = (i % 2 ? -1 : 1) * p.face;
        proj(run, { k: 'axe', a, x: p.x, y: p.y, vx: side * U.rand(30, 90) + p.dirX * 20, vy: -U.rand(210, 250), g: 420, ang: 0, spin: side * 14, r: 7 * s.area, pierce: 999, life: 1.6 });
      }
      DH.audio.play('throw');
    } },
    nova: { fire(run, a) {
      const p = run.player, s = a.s;
      run.castCircle(p.x, p.y, 40 * s.area, '#a8e8ff');
      for (let i = 0; i < s.count; i++) run.after(i * 0.3, () => run.fx.push({ k: 'nova', x: p.x, y: p.y, life: 0.4, max: 0.4, R: 72 * s.area, hit: new Set(), a, update: novaUpdate }));
      DH.audio.play('frost');
    } },
    plague: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const tg = run.randomTarget(140); const tx = tg ? tg.x : p.x + U.rand(-80, 80), ty = tg ? tg.y : p.y + U.rand(-80, 80);
        proj(run, { k: 'flask', a, x: p.x, y: p.y, sx: p.x, sy: p.y, tx, ty, ft: 0, fd: 0.5, ang: 0, r: 0, pierce: 0, life: 1 });
      }
      DH.audio.play('throw');
    } },
    /* ---------- Skald songs (on the beat) ---------- */
    chord: { fire(run, a) {
      const p = run.player, s = a.s, R = 58 * s.area, arc = 1.5, near = run.nearest(p.x, p.y, R * 1.2);
      if (!near) return false;
      const base = Math.atan2(near.y - p.y, near.x - p.x); p.face = near.x > p.x ? 1 : -1;
      for (let i = 0; i < s.count; i++) {
        const ang = base + i * TAU / s.count;
        for (let k = 0; k < 3; k++) run.fx.push({ k: 'slash', x: p.x, y: p.y, ang, R: R * (0.5 + k * 0.25), arc, life: 0.3, max: 0.3, follow: true, color: k === 1 ? '#ffe08a' : '#ffb050' });
        run.hitCircle(p.x, p.y, R, a, 1, (e) => Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), ang)) <= arc / 2 + 0.15);
      }
    } },
    wardrum: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) run.after(i * 0.2, () => {
        const R = 72 * s.area;
        run.castCircle(p.x, p.y, R * 0.5, '#ffb050');
        run.fx.push({ k: 'pulse', x: p.x, y: p.y, R, life: 0.45, max: 0.45, follow: true, color: '#ffb050' });
        run.hitCircle(p.x, p.y, R, a); run.shake = Math.max(run.shake, 3);
      });
    } },
    deathwall: { fire(run, a) {
      // a rank of spectral warriors charges through the horde from behind the hero
      const p = run.player, s = a.s, ang = aimAt(run, 220), nx = -Math.sin(ang), ny = Math.cos(ang);
      const n = Math.max(1, s.count), sx = p.x - Math.cos(ang) * 70, sy = p.y - Math.sin(ang) * 70;
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * 16 * s.area;
        proj(run, { k: 'wall', a, x: sx + nx * o, y: sy + ny * o, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 8 * Math.sqrt(s.area), pierce: 999, life: 1.6 });
      }
      DH.audio.play('roar');
    } },
    moshpit: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const tg = run.randomTarget(150); const x = tg ? tg.x : p.x + U.rand(-60, 60), y = tg ? tg.y : p.y + U.rand(-50, 50);
        run.zones.push({ kind: 'mosh', a, x, y, r: 40 * s.area, life: s.duration * 60 / DH.audio.BATTLE_BPM * 1.05, max: s.duration * 60 / DH.audio.BATTLE_BPM, beat: -1 });
      }
    } },
    smite: { fire(run, a) {
      // damage and crit build up while the strike waits for a target (up to 3x after ~6s)
      const p = run.player, s = a.s, tg = run.nearest(p.x, p.y, 70);
      a.wait = (a.wait || 0);
      if (!tg) { a.wait += 0.2; return false; }
      const charge = Math.min(3, 1 + a.wait * 0.35), bonusCrit = Math.min(0.5, a.wait * 0.08);
      a.wait = 0;
      const ex = new Set();
      for (let i = 0; i < s.count; i++) {
        const e = i ? run.nearest(p.x, p.y, 70, ex) : tg; if (!e) break; ex.add(e);
        const ang = Math.atan2(e.y - p.y, e.x - p.x); p.face = e.x > p.x ? 1 : -1;
        s.crit += bonusCrit; run.hit(e, a, charge, Math.cos(ang), Math.sin(ang)); s.crit -= bonusCrit;
        run.fx.push({ k: 'explosion', x: e.x, y: e.y, R: 16 * s.area * Math.sqrt(charge), life: 0.3, max: 0.3 });
        run.burst(e.x, e.y, 10 + charge * 4, ['#ff6a1a', '#ffd35a', '#fff0a0'], 90);
      }
      run.shake = Math.max(run.shake, 1 + charge); DH.audio.play('fire'); DH.audio.play('boom');
    } },
    thorns: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) {
        const tg = run.randomTarget(120); const x = tg ? tg.x : p.x + U.rand(-70, 70), y = tg ? tg.y : p.y + U.rand(-60, 60);
        run.zones.push({ kind: 'thorns', a, x, y, r: 22 * s.area, life: s.duration, max: s.duration, tick: 0, seed: Math.random() * 99 });
      }
      DH.audio.play('throw');
    } },
    illumination: { fire(run, a) {
      const p = run.player, s = a.s;
      for (let i = 0; i < s.count; i++) run.after(i * 0.35, () => {
        const R = 52 * s.area;
        run.castCircle(p.x, p.y, R * 0.6, '#fff0a0');
        run.fx.push({ k: 'pulse', x: p.x, y: p.y, R, life: 0.4, max: 0.4, follow: true, color: '#fff0a0' });
        run.hitCircle(p.x, p.y, R, a);
        if (s.purge) { const r2 = R * R; run.eproj = run.eproj.filter((b) => U.dist2(b.x, b.y, p.x, p.y) > r2); } // Luminous: burns away enemy projectiles
      });
      DH.audio.play('heal');
    } },
    prism: { fire(run, a) {
      const p = run.player, s = a.s, ex = new Set(); let fired = 0;
      const EL = [['#ff7a30', { burn: 1 }], ['#80d8ff', { frost: 1 }], ['#fff080', { spark: 1 }]];
      for (let i = 0; i < s.count; i++) {
        let cur = run.nearest(p.x, p.y, 200, ex); if (!cur) break; fired++;
        const pts = [[p.x, p.y - 4]];
        for (let c = 0; c <= s.chain && cur; c++) {
          ex.add(cur); pts.push([cur.x, cur.y]);
          // cycle the element on every bounce: only that element's effect can apply
          const el = EL[c % 3][1], keep = { burn: s.burn, frost: s.frost, spark: s.spark };
          for (const k in keep) s[k] = el[k] ? keep[k] * 1.6 : 0;
          run.hit(cur, a, 1 + c * 0.08);
          Object.assign(s, keep);
          cur = run.nearest(cur.x, cur.y, 90, ex);
        }
        for (let k = 1; k < pts.length; k++) run.fx.push({ k: 'chain', pts: [pts[k - 1], pts[k]], life: 0.25, max: 0.25, seed: Math.random() * 999, color: EL[(k - 1) % 3][0] });
      }
      if (!fired) return false;
      DH.audio.play('zap');
    } },
    fireball: { fire(run, a) {
      const p = run.player, s = a.s;
      if (volley(run, a, 260, 0.15, true, (ang) => proj(run, { k: 'fireball', a, x: p.x, y: p.y, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, ang, r: 5, pierce: 0, life: 1.8, boom: 26 * s.area })) == null) return false;
      DH.audio.play('fire');
    } },
  };
  function novaUpdate(run, f) {
    const k = 1 - f.life / f.max, R = f.R * Math.min(1, k * 1.3), p = run.player;
    f.x = p.x; f.y = p.y; f.cur = R;
    run.grid.query(f.x, f.y, R + 10, tmp);
    for (const e of tmp.slice()) {
      if (e.dead || f.hit.has(e)) continue;
      if (U.dist2(f.x, f.y, e.x, e.y) < (R + e.r) * (R + e.r)) { f.hit.add(e); run.addSlow(e, 6); const d = Math.hypot(e.x - f.x, e.y - f.y) || 1; run.hit(e, f.a, 1, (e.x - f.x) / d, (e.y - f.y) / d); }
    }
  }
  function orbit(run, a, dt, kind, radius, hitR, cd) {
    const p = run.player, s = a.s, def = C.abilities[a.id];
    a.ang += s.speed * dt * (def && def.moveSpin && p.moving ? 1 + run.P.speed / 110 : 1); a.R = radius * s.area;
    a.pos = a.pos || []; a.pos.length = s.count;
    for (let i = 0; i < s.count; i++) {
      const ang = a.ang + i / s.count * TAU, bx = p.x + Math.cos(ang) * a.R, by = p.y + Math.sin(ang) * a.R;
      a.pos[i] = { x: bx, y: by, a: ang, kind };
      run.hitCircle(bx, by, hitR * Math.sqrt(s.area), a, 1, (e) => run.canHit(e, a.id, cd));
    }
  }
  C.AB = AB;

  /** A copy of ability `a` that strikes with other tags / an extra effect chance (plants, brews); rebuilt when `a` is recomputed. */
  R.subAb = function (a, key, tags, eff, add) {
    a.subs = a.subs || {};
    let sub = a.subs[key];
    if (!sub || sub.src !== a.s) {
      const s = Object.assign({}, a.s); if (eff) s[eff] = (s[eff] || 0) + add;
      sub = a.subs[key] = { id: a.id, weapon: a.weapon, tags, s, src: a.s, noCrit: a.noCrit, split: false };
    }
    return sub;
  };
  /** The Alchemist's elements: each one another of his damage sources already wields (abilities, traits, items). */
  R.brewElements = function () {
    const P = this.P, have = { fire: P.burn > 0 || P.tag.fire > 0, lightning: P.spark > 0 || P.tag.lightning > 0, ice: P.frost > 0 || P.tag.ice > 0, earth: P.decay > 0 };
    for (const b of this.abilities) {
      if (b.id === 'concoction' || !b.tags) continue;
      if (b.tags.includes('fire') || b.s.burn > 0) have.fire = true;
      if (b.tags.includes('lightning') || b.s.spark > 0) have.lightning = true;
      if (b.tags.includes('ice') || b.s.frost > 0) have.ice = true;
      if (b.s.decay > 0) have.earth = true;
    }
    return ['fire', 'lightning', 'ice', 'earth'].filter((k) => have[k]);
  };
  R.landBrew = function (b) {
    const s = b.a.s, key = b.el || 'bomb', E = BREW[key], R = 24 * s.area;
    const sub = this.subAb(b.a, key, E.tags, E.eff, 0.6 * (1 + this.P.effectPct));
    this.hitCircle(b.tx, b.ty, R, sub);
    this.fx.push({ k: 'pop', x: b.tx, y: b.ty, R: R * 1.1, life: 0.3, max: 0.3, color: E.col });
    this.burst(b.tx, b.ty, 10, [E.col, '#ffffff', '#6a5a4a'], 70);
    if (b.el) this.zones.push({ kind: 'brew', a: sub, el: b.el, col: E.col, x: b.tx, y: b.ty, r: R, life: s.duration, max: s.duration, tick: 0.3, seed: Math.random() * 99 });
    DH.audio.play('glass'); if (!b.el) DH.audio.play('boom');
  };
  R.landGrenade = function (b) {
    const R = b.R, x = b.tx, y = b.ty;
    this.grid.query(x, y, R + 20, tmp);
    for (const e of tmp.slice()) if (!e.dead && U.dist2(x, y, e.x, e.y) < (R + e.r) * (R + e.r)) { this.rawDamage(e, b.gdmg, '#ffb060', b.a.id); if (!e.dead && !e.boss) { const d = Math.hypot(e.x - x, e.y - y) || 1, k = 90 / Math.sqrt(e.mass); e.kx += (e.x - x) / d * k; e.ky += (e.y - y) / d * k; } }
    this.fx.push({ k: 'explosion', x, y, R, life: 0.4, max: 0.4 });
    for (let i = 0; i < 10; i++) { const an = Math.random() * TAU, sp = U.rand(40, 120); this.gpart({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 30, g: 80, life: U.rand(0.4, 0.8), max: 0.8, c: '#ff8a30', r: 1.1, core: '#fff0a0' }); }
    for (let i = 0; i < 8; i++) this.parts.push({ x: x + U.rand(-8, 8), y: y + U.rand(-6, 4), vx: U.rand(-12, 12), vy: U.rand(-26, -8), life: U.rand(0.8, 1.4), max: 1.4, c: U.pick(['#5a5a60', '#7a7a82', '#3a3a40']), s: 2 });
    this.shake = Math.max(this.shake, 2.5); DH.audio.play('boom');
  };
  /** Crone's plants. Crone's Blessing: +5% damage per level, shared among her living plants. */
  R.updatePlant = function (al, dt) {
    const a = al.a, s = a.s, sub = this.subAb(a, al.type, PLANT_TAGS[al.type]);
    const bless = this.hero.blessing ? 1 + 0.05 * (this.level - 1) / Math.max(1, a.nPlants || 1) : 1;
    al.cd -= dt; al.bite = Math.max(0, (al.bite || 0) - dt);
    if (al.t < 0.35 || al.wither) return; // still sprouting / withering
    if (al.type === 'snare') { // roots and lashes everything around it
      const R = 26 * s.area;
      if (al.cd <= 0) { al.cd = 0.8; if (this.hitCircle(al.x, al.y, R, sub, 0.55 * bless)) al.bite = 0.25; }
      this.grid.query(al.x, al.y, R, tmp);
      for (const e of tmp) if (!e.dead && !e.boss && U.dist2(al.x, al.y, e.x, e.y) < R * R && (e.slowS || 0) < 6) this.addSlow(e, 6 - (e.slowS || 0));
    } else if (al.type === 'biter') { // snaps at whatever comes close
      const tg = this.nearest(al.x, al.y, 26 * Math.sqrt(s.area));
      if (tg) { al.face = tg.x < al.x ? -1 : 1; if (al.cd <= 0) { al.cd = 0.55; const dx = tg.x - al.x, dy = tg.y - al.y, d = Math.hypot(dx, dy) || 1; this.hit(tg, sub, 1.3 * bless, dx / d, dy / d); al.bite = 0.2; } }
    } else if (al.type === 'pod') { // swells when a foe steps near and bursts
      if (al.arm == null) { if (this.nearest(al.x, al.y, 22 * Math.sqrt(s.area))) al.arm = 0.45; }
      else if ((al.arm -= dt) <= 0) {
        const R = 36 * s.area; this.hitCircle(al.x, al.y, R, sub, 2.4 * bless);
        this.fx.push({ k: 'pop', x: al.x, y: al.y, R, life: 0.35, max: 0.35, color: '#b070ff' });
        this.burst(al.x, al.y, 14, ['#b070ff', '#6a8a30', '#e0c0ff'], 90); this.shake = Math.max(this.shake, 1.5); DH.audio.play('boom');
        al.life = 0;
      }
    } else { // spitter: lobs thorny seeds at range
      if (al.cd <= 0) {
        const tg = this.nearest(al.x, al.y, 150);
        if (tg) { al.cd = 1.0; al.face = tg.x < al.x ? -1 : 1; const ang = Math.atan2(tg.y - al.y + 6, tg.x - al.x); proj(this, { k: 'spit', a: sub, mult: 0.9 * bless, x: al.x + al.face * 4, y: al.y - 7, vx: Math.cos(ang) * 190, vy: Math.sin(ang) * 190, ang, r: 3, pierce: 0, life: 1 }); al.bite = 0.2; }
        else al.cd = 0.2;
      }
    }
  };

  /** Position in beats of the battle music (the Skald's songs land on it); falls back to run time at the same tempo. */
  R.beatPos = function () { const b = DH.audio.beatPos(); return b == null ? this.time * DH.audio.BATTLE_BPM / 60 : b; };
  R.updateAbility = function (a, dt) {
    const B = AB[a.id]; if (!B) return;
    if (B.update) B.update(this, a, dt);
    if (!B.fire) { // weapons that act on their own (wolves, scythes, plants): the hero still strikes out at foes nearby
      if (a.weapon && (a.animT = (a.animT || 0) - dt) <= 0) { a.animT = 1.1; if (this.nearest(this.player.x, this.player.y, 90)) this.attackAnim(a); }
      return;
    }
    if (a.s.every) { // beat-synced song
      const idx = Math.floor(this.beatPos() / a.s.every);
      if (a.lastBeat == null) a.lastBeat = idx;
      if (idx !== a.lastBeat) {
        a.lastBeat = idx;
        if (B.fire(this, a) !== false) { if (a.weapon) this.onWeaponFire(a); const n = this.detStacks(a, a.s.ms); for (let i = 0; i < n; i++) a.rep.push(0.1 * (i + 1)); }
      }
      for (let i = a.rep.length - 1; i >= 0; i--) { a.rep[i] -= dt; if (a.rep[i] <= 0) { a.rep.splice(i, 1); B.fire(this, a); } }
      return;
    }
    a.t -= dt;
    if (a.t <= 0) {
      a.cdNext = 0;
      if (B.fire(this, a) === false) a.t = 0.2;
      else {
        if (a.weapon) this.onWeaponFire(a);
        a.t = a.cdNext || a.s.cd;
        const n = this.detStacks(a, a.s.ms);
        for (let i = 0; i < n; i++) a.rep.push(0.1 * (i + 1));
      }
    }
    for (let i = a.rep.length - 1; i >= 0; i--) { a.rep[i] -= dt; if (a.rep[i] <= 0) { a.rep.splice(i, 1); B.fire(this, a); } }
  };

  /* ---------------- summons ---------------- */
  R.keepAllies = function (kind, a, n) {
    let have = 0; for (const al of this.allies) if (al.kind === kind && al.a === a) have++;
    const p = this.player;
    while (have < n) { this.allies.push({ kind, a, x: p.x + U.rand(-10, 10), y: p.y + U.rand(-10, 10), t: 0, life: Infinity, face: 1 }); have++; }
  };
  R.updateAllies = function (dt) {
    if (this.timers) for (let i = this.timers.length - 1; i >= 0; i--) { const tm = this.timers[i]; tm.t -= dt; if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); } }
    const p = this.player;
    // imps from the Infernal Pact ring
    if (this.P.imps) { let n = 0; for (const al of this.allies) if (al.kind === 'imp') n++; if (n < this.P.imps) this.allies.push({ kind: 'imp', a: this.impAbility(), x: p.x, y: p.y, t: 0, life: Infinity, face: 1 }); }
    for (let i = this.allies.length - 1; i >= 0; i--) {
      const al = this.allies[i]; al.t += dt; al.life -= dt;
      if (al.life <= 0 || !this.abilities.includes(al.a) && al.kind !== 'imp') { this.allies.splice(i, 1); continue; }
      const s = al.a.s;
      if (al.kind === 'spirit') {
        const tg = this.nearest(al.x, al.y, 200);
        if (tg) { const d = Math.hypot(tg.x - al.x, tg.y - al.y) || 1; al.vx += (tg.x - al.x) / d * 600 * dt; al.vy += (tg.y - al.y) / d * 600 * dt; }
        const sp = Math.hypot(al.vx, al.vy), mx = s.speed * 1.6; if (sp > mx) { al.vx *= mx / sp; al.vy *= mx / sp; }
        al.x += al.vx * dt; al.y += al.vy * dt;
        if (tg && U.dist2(al.x, al.y, tg.x, tg.y) < (tg.r + 4) * (tg.r + 4)) {
          this.hitCircle(al.x, al.y, 14 * s.area, al.a); this.fx.push({ k: 'pop', x: al.x, y: al.y, R: 14 * s.area, life: 0.25, max: 0.25, color: '#d890ff' });
          this.allies.splice(i, 1);
        }
        continue;
      }
      if (al.kind === 'phantom') { this.updatePhantom(al, dt); continue; }
      if (al.kind === 'plant') { this.updatePlant(al, dt); continue; }
      // melee summons: wolf, golem, imp
      const leash = 150;
      const tg = this.nearest(al.x, al.y, 140);
      const tooFar = U.dist2(al.x, al.y, p.x, p.y) > leash * leash;
      let tx = p.x + Math.cos(al.t + i) * 18, ty = p.y + Math.sin(al.t + i) * 12;
      if (tg && !tooFar) { tx = tg.x; ty = tg.y; }
      const spd = (al.kind === 'golem' ? s.speed : al.kind === 'phantom' ? s.speed * 1.4 : al.kind === 'imp' ? 90 : s.speed) * (tooFar ? 1.8 : 1);
      const dx = tx - al.x, dy = ty - al.y, d = Math.hypot(dx, dy);
      const reach = al.kind === 'golem' ? 14 : 10;
      if (d > reach) { al.x += dx / d * spd * dt; al.y += dy / d * spd * dt; al.moving = true; } else al.moving = false;
      if (Math.abs(dx) > 1) al.face = dx > 0 ? 1 : -1;
      al.cd = (al.cd || 0) - dt;
      if (tg && d <= reach + 4 && al.cd <= 0) {
        if (al.kind === 'golem') { al.cd = s.cd; const R = 22 * s.area; this.hitCircle(al.x, al.y, R, al.a); this.fx.push({ k: 'slam', x: al.x, y: al.y + 4, R, life: 0.35, max: 0.35, color: '#e8dcc0' }); this.shake = Math.max(this.shake, 1.5); DH.audio.play('boom'); }
        else if (al.kind === 'phantom') { al.cd = 0.55; const R = 18 * s.area; this.hitCircle(al.x, al.y, R, al.a); this.fx.push({ k: 'slash', x: al.x, y: al.y, ang: Math.atan2(dy, dx), R, arc: 2.4, life: 0.2, max: 0.2, color: '#b8a8ff' }); }
        else { al.cd = al.kind === 'imp' ? 0.9 : s.cd; this.hit(tg, al.a, 1, dx / (d || 1), dy / (d || 1)); al.bite = 0.15; }
      }
      al.bite = Math.max(0, (al.bite || 0) - dt);
    }
  };
  /** Spirit Warrior: fights where it stands; when the hero moves away it dashes after them, cutting through everything on the way. */
  R.updatePhantom = function (al, dt) {
    const p = this.player, s = al.a.s;
    al.cd = (al.cd || 0) - dt;
    if (al.dash) {
      const dx = al.dash.x - al.x, dy = al.dash.y - al.y, d = Math.hypot(dx, dy), step = s.speed * 5 * dt;
      if (Math.abs(dx) > 1) al.face = dx > 0 ? 1 : -1;
      if (d <= step) { al.x = al.dash.x; al.y = al.dash.y; al.dash = null; }
      else { al.x += dx / d * step; al.y += dy / d * step; }
      this.hitCircle(al.x, al.y, 14 * s.area, al.a, 1.5, (e) => this.canHit(e, 'phd' + al.id, 0.5));
      if (Math.random() < 0.6) this.parts.push({ x: al.x, y: al.y, vx: 0, vy: 0, life: 0.3, max: 0.3, c: '#b8a8ff', s: 1 });
      al.moving = true;
      return;
    }
    al.moving = false; al.id = al.id || Math.random();
    if (U.dist2(al.x, al.y, p.x, p.y) > 90 * 90) {
      const a = Math.random() * TAU; al.dash = { x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 12 };
      this.fx.push({ k: 'slash', x: al.x, y: al.y, ang: Math.atan2(al.dash.y - al.y, al.dash.x - al.x), R: 20, arc: 1.2, life: 0.2, max: 0.2, color: '#d8c8ff' });
      DH.audio.play('swing'); return;
    }
    const tg = this.nearest(al.x, al.y, 28 * s.area);
    if (tg && al.cd <= 0) {
      al.cd = 0.55; const dx = tg.x - al.x, dy = tg.y - al.y, R = 18 * s.area;
      if (Math.abs(dx) > 1) al.face = dx > 0 ? 1 : -1;
      this.hitCircle(al.x, al.y, R, al.a); this.fx.push({ k: 'slash', x: al.x, y: al.y, ang: Math.atan2(dy, dx), R, arc: 2.4, life: 0.2, max: 0.2, color: '#b8a8ff' });
    }
  };
  R.impAbility = function () {
    if (!this._impA) { this._impA = { id: 'imp', tags: ['fire', 'summon', 'melee'], s: { dmg: 10, dmgPct: 0, cd: 0.9, knock: 20, crit: 0.05, ms: 0, burn: 0.3, spark: 0, frost: 0, decay: 0, fragile: 0, affliction: 0, speed: 90, area: 1 } }; }
    this._impA.s.dmg = 10 * (1 + this.stage.index * 0.6);
    return this._impA;
  };

  /* ---------------- projectiles ---------------- */
  R.updateProjectiles = function (dt) {
    const list = this.proj, p = this.player;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.life -= dt;
      if (b.k === 'grenade' || b.k === 'brewflask') { // lobbed: an arc to the target point
        b.ft += dt; const k = Math.min(1, b.ft / b.fd);
        b.x = U.lerp(b.sx, b.tx, k); b.y = U.lerp(b.sy, b.ty, k) - Math.sin(k * Math.PI) * (b.k === 'grenade' ? 40 : 30); b.ang += dt * (b.k === 'grenade' ? 9 : 12);
        if (k >= 1) { if (b.k === 'grenade') this.landGrenade(b); else this.landBrew(b); list.splice(i, 1); }
        continue;
      }
      if (b.k === 'flask') {
        b.ft += dt; const k = Math.min(1, b.ft / b.fd);
        b.x = U.lerp(b.sx, b.tx, k); b.y = U.lerp(b.sy, b.ty, k) - Math.sin(k * Math.PI) * 30; b.ang += dt * 12;
        if (k >= 1) {
          const s = b.a.s;
          this.zones.push({ kind: 'pool', a: b.a, x: b.tx, y: b.ty, r: 24 * s.area, life: s.duration, max: s.duration, tick: 0 });
          DH.audio.play('glass'); this.burst(b.tx, b.ty, 8, ['#6cc04a', '#7dffb0'], 60);
          list.splice(i, 1);
        }
        continue;
      }
      if (b.k === 'chakram') {
        if (b.orbit && b.orbit.t > 0) { b.orbit.t -= dt; b.orbit.a += 7 * dt; b.orbit.rad = Math.min(70, b.orbit.rad + 60 * dt); b.x = p.x + Math.cos(b.orbit.a) * b.orbit.rad; b.y = p.y + Math.sin(b.orbit.a) * b.orbit.rad; }
        else {
          b.out -= dt;
          if (b.out <= 0) { const d = Math.hypot(p.x - b.x, p.y - b.y) || 1, sp = Math.hypot(b.vx, b.vy); b.vx = (p.x - b.x) / d * sp; b.vy = (p.y - b.y) / d * sp; if (d < 10) b.life = 0; }
          b.x += b.vx * dt; b.y += b.vy * dt;
        }
        b.ang += dt * 16;
      } else {
        if (b.g) { b.vy += b.g * dt; b.ang += b.spin * dt; }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      if (b.grow) b.r = 4 + b.grow * (1 - b.life / b.max);
      if (b.k === 'sphere') {
        const s = b.a.s; b.pulse -= dt * (1 + s.ms);
        if (b.pulse <= 0) { b.pulse = s.pulse ? 0.3 : 0.5; const R = 30 * s.area; this.fx.push({ k: 'pop', x: b.x, y: b.y, R, life: 0.2, max: 0.2, color: '#fff6a0' }); this.hitCircle(b.x, b.y, R, b.a); if (Math.random() < 0.5) DH.audio.play('zap'); }
      }
      let remove = b.life <= 0;
      if (!remove && b.k !== 'sphere') {
        this.grid.query(b.x, b.y, b.r + 12, tmp);
        for (const e of tmp) {
          if (e.dead) continue;
          if (b.cdHit) { if (!this.canHit(e, 'pj' + (b.id || (b.id = Math.random())), b.cdHit)) continue; }
          else if (b.hit.has(e)) continue;
          const rr = b.r + e.r;
          if (U.dist2(b.x, b.y, e.x, e.y) >= rr * rr) continue;
          if (!b.cdHit) b.hit.add(e);
          const sp = Math.hypot(b.vx, b.vy) || 1;
          if (b.k === 'fireball') { this.explode(b); remove = true; break; }
          if (b.k === 'fist') { this.hitCircle(b.x, b.y, 10 * b.a.s.area, b.a); this.fx.push({ k: 'pop', x: b.x, y: b.y, R: 10 * b.a.s.area, life: 0.2, max: 0.2, color: '#c8a8ff' }); remove = true; break; }
          this.hit(e, b.a, (b.mult || 1) * (b.a.s.falloff ? Math.pow(b.a.s.falloff, b.nh || 0) : 1), b.vx / sp, b.vy / sp);
          b.nh = (b.nh || 0) + 1;
          if (b.fork && !b.forked) { b.forked = true; for (const o of [-0.5, 0.5]) { const ang = Math.atan2(b.vy, b.vx) + o; proj(this, { k: 'hex', a: b.a, x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ang, r: 4, pierce: 999, life: 0.6, forked: true, hit: new Set([e]) }); } }
          if (b.pierce-- <= 0 || (e.def.noPierce && b.pierce < 900)) { remove = true; break; } // some foes cannot be pierced
        }
      }
      if (remove) { if (b.k === 'fireball' && b.life <= 0) this.explode(b); list.splice(i, 1); }
    }
    // enemy projectiles
    for (let i = this.eproj.length - 1; i >= 0; i--) {
      const b = this.eproj[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.acc) { b.vx *= 1 + b.acc * dt; b.vy *= 1 + b.acc * dt; }
      if (U.dist2(b.x, b.y, p.x, p.y) < (b.r + p.r - 1) * (b.r + p.r - 1)) {
        if (b.kind === 'curse' && !(p.inv > 0) && !(this.buffs.wraith > 0) && !(this.curse > 0)) { this.curse = C.STATUS.curse; DH.audio.play('roar'); DH.events.emit('run:warning', t('hud.cursed')); } // Curse Bolt
        this.hurtPlayer(b.dmg); this.eproj.splice(i, 1); continue;
      }
      if (b.life <= 0) this.eproj.splice(i, 1);
    }
  };
  R.explode = function (b) {
    this.hitCircle(b.x, b.y, b.boom, b.a);
    for (let i = 0; i < 10; i++) { const an = Math.random() * TAU, sp = U.rand(40, 120); this.gpart({ x: b.x, y: b.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 30, g: 80, life: U.rand(0.4, 0.8), max: 0.8, c: '#ff8a30', r: 1.1, core: '#fff0a0' }); }
    this.fx.push({ k: 'explosion', x: b.x, y: b.y, R: b.boom, life: 0.35, max: 0.35 });
    this.burst(b.x, b.y, 12, ['#ff6a1a', '#ffd35a', '#fff0a0', '#7c1624'], 90);
    this.shake = Math.max(this.shake, 1.5);
    DH.audio.play('boom');
  };
  R.updateZones = function (dt) {
    const p = this.player;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i]; z.life -= dt;
      if (z.kind === 'pool') {
        z.tick -= dt;
        if (z.tick <= 0) { z.tick = 0.33; this.hitCircle(z.x, z.y, z.r, z.a); }
        if (Math.random() < dt * 12) this.parts.push({ x: z.x + U.rand(-z.r, z.r) * 0.8, y: z.y + U.rand(-z.r, z.r) * 0.5, vx: 0, vy: -12, life: 0.6, max: 0.6, c: '#9adf50', s: 1 });
      } else if (z.kind === 'brew') { // the Alchemist's puddle: its element keeps working on whoever stands in it
        z.tick -= dt;
        if (z.tick <= 0) { z.tick = 0.5; this.hitCircle(z.x, z.y, z.r, z.a, 0.35); }
        if (Math.random() < dt * 10) this.parts.push({ x: z.x + U.rand(-z.r, z.r) * 0.8, y: z.y + U.rand(-z.r, z.r) * 0.5, vx: 0, vy: z.el === 'ice' ? -4 : -14, life: 0.6, max: 0.6, c: z.col, s: 1 });
      } else if (z.kind === 'mosh') {
        const bi = Math.floor(this.beatPos());
        if (bi !== z.beat) {
          z.beat = bi; z.flash = 1;
          this.grid.query(z.x, z.y, z.r, tmp);
          for (const e of tmp.slice()) if (!e.dead && U.dist2(z.x, z.y, e.x, e.y) < z.r * z.r) this.hit(e, z.a, 1);
        }
        // the brawl drags everyone nearby into the circle
        this.grid.query(z.x, z.y, z.r * 1.6, tmp);
        for (const e of tmp) if (!e.dead && !e.boss) { const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < z.r * 1.6 && d > 6) { const k = 90 / Math.sqrt(e.mass) * dt; e.x += dx / d * k; e.y += dy / d * k; } }
        z.flash = Math.max(0, (z.flash || 0) - dt * 4);
      } else if (z.kind === 'thorns') {
        z.tick -= dt;
        if (z.tick <= 0) { z.tick = 0.4; this.hitCircle(z.x, z.y, z.r, z.a); }
        this.grid.query(z.x, z.y, z.r, tmp);
        for (const e of tmp) if (!e.dead && !e.boss && U.dist2(z.x, z.y, e.x, e.y) < z.r * z.r && (e.slowS || 0) < 8) this.addSlow(e, 8 - (e.slowS || 0)); // rooted in brambles
      } else if (z.kind === 'rift') {
        if (U.dist2(z.x, z.y, p.x, p.y) < 14 * 14) this.detonateRift(z);
      }
      if (z.life <= 0 || z.gone) this.zones.splice(i, 1);
    }
  };
  R.detonateRift = function (z) {
    if (z.gone) return; z.gone = true;
    const R = 38 * z.a.s.area;
    this.hitCircle(z.x, z.y, R, z.a);
    this.fx.push({ k: 'pop', x: z.x, y: z.y, R, life: 0.35, max: 0.35, color: '#c070ff' });
    this.burst(z.x, z.y, 14, ['#c070ff', '#ffffff', '#40106a'], 90);
    DH.audio.play('boom');
    if (z.a.s.chainRift) for (const o of this.zones) if (o.kind === 'rift' && !o.gone && o !== z && U.dist2(o.x, o.y, z.x, z.y) < 90 * 90) this.after(0.15, () => this.detonateRift(o));
  };
})(window.DH);
