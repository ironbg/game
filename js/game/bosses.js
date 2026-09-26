/* Boss behaviour and telegraphed hazards (mixed into DH.Run.prototype). */
(function (DH) {
  'use strict';
  const U = DH.util, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  R.hazard = function (h) { h.t = 0; h.fired = false; h.tick = 0; this.hazards.push(h); return h; };
  R.inHazard = function (h, x, y) {
    if (h.kind === 'circle') return U.dist2(x, y, h.x, h.y) < h.r * h.r;
    if (h.kind === 'line') {
      const dx = x - h.x, dy = y - h.y, ca = Math.cos(h.ang), sa = Math.sin(h.ang);
      const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      return along > -h.w && along < h.len && Math.abs(perp) < h.w / 2;
    }
    if (h.kind === 'cone') {
      const d = Math.hypot(x - h.x, y - h.y); if (d > h.len) return false;
      let a = Math.atan2(y - h.y, x - h.x) - h.ang; a = Math.atan2(Math.sin(a), Math.cos(a));
      return Math.abs(a) < h.arc / 2;
    }
    return false;
  };
  R.updateHazards = function (dt) {
    const p = this.player;
    this.pslow = Math.max(0, (this.pslow || 0) - dt);
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i]; h.t += dt;
      if (!h.fired && h.t >= h.delay) {
        h.fired = true;
        const eye = this.crackedEye && h.src && h.src.def && h.src.def.lord; // Cracked Ember Eye: the Lord's bombs and flames pass you by
        if (!eye && this.inHazard(h, p.x, p.y)) { this.hurtPlayer(h.dmg); if (h.slow) this.pslow = Math.max(this.pslow, h.slow); }
        if (h.onFire) h.onFire(this, h);
        this.fx.push({ k: 'hzfire', h: Object.assign({}, h), life: 0.35, max: 0.35 });
        if (h.sound) DH.audio.play(h.sound);
      }
      if (h.fired && h.dur) {
        h.tick -= dt;
        if (!(this.crackedEye && h.src && h.src.def && h.src.def.lord) && this.inHazard(h, p.x, p.y)) { if (h.slow) this.pslow = Math.max(this.pslow, 0.25); if (h.tick <= 0) { h.tick = 0.5; this.hurtPlayer(h.dmg * 0.5); } }
      }
      if (h.fired && h.t >= h.delay + (h.dur || 0)) this.hazards.splice(i, 1);
    }
  };

  R.bossAI = function (e, dt, dx, dy, dist) {
    e.alive = (e.alive || 0) + dt;
    const eat = e.hexed ? C.HEX.enrageAt : 45;
    if (e.def.lord && e.alive > eat) { const k = 1 + (e.alive - eat) * (e.hexed ? 0.006 : 0.012); e.enr = k; } else e.enr = 1;
    const f = AI[e.def.ai]; if (f) f(this, e, dt, dx, dy, dist);
    e.cspd *= e.enr;
  };
  const shot = (run, e, ang, spd, mult, color, kind) => run.enemyShot(e, ang, spd, e.dmg * mult * e.enr, color, kind);

  function charge(run, e, dt, dx, dy, dist, spd) {
    e.phaseT = (e.phaseT || 0) + dt;
    if (e.phase === 0) { e.mx = dx; e.my = dy; e.cspd = e.spd; if (e.phaseT > 3.2 && dist < 220) { e.phase = 1; e.phaseT = 0; e.lockX = dx; e.lockY = dy; } return false; }
    if (e.phase === 1) { e.mx = 0; e.my = 0; e.cspd = 0; e.tele = true; if (e.phaseT > 0.7) { e.phase = 2; e.phaseT = 0; e.tele = false; DH.audio.play('roar'); } return false; }
    e.mx = e.lockX; e.my = e.lockY; e.cspd = spd || 230;
    if (Math.random() < dt * 20) run.parts.push({ x: e.x, y: e.y + 10, vx: U.rand(-20, 20), vy: U.rand(-30, -5), life: 0.5, max: 0.5, c: '#6a5a4a', s: 2 });
    if (e.phaseT > 0.85) { e.phase = 0; e.phaseT = 0; run.shake = 4; return true; }
    return false;
  }

  const AI = {
    b_charge(run, e, dt, dx, dy, dist) {
      if (charge(run, e, dt, dx, dy, dist)) {
        for (let i = 0; i < 10; i++) shot(run, e, i / 10 * TAU, 85, 0.6, '#ebdfc0');
        if (Math.random() < 0.5) for (let i = 0; i < 4; i++) run.spawnEnemy('skeleton', e.x + U.rand(-30, 30), e.y + U.rand(-30, 30));
      }
    },
    b_caster(run, e, dt, dx, dy, dist) {
      e.cspd = e.spd; e.mx = dist < 110 ? -dx : dist > 150 ? dx : -dy * 0.6; e.my = dist < 110 ? -dy : dist > 150 ? dy : dx * 0.6;
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt; e.c3 = (e.c3 || 0) + dt;
      const col = e.variant === 'ice' ? '#8ff0ff' : e.variant === 'gold' ? '#fff0a0' : '#7dffb0';
      if (e.c1 > 2.8) { e.c1 = 0; const off = Math.random() * TAU; for (let i = 0; i < 14; i++) shot(run, e, off + i / 14 * TAU, 70, 0.7, col); DH.audio.play('frost'); }
      if (e.c2 > 4.6) { e.c2 = 0; const a = Math.atan2(dy, dx); [-0.25, 0, 0.25].forEach((o) => shot(run, e, a + o, 120, 0.8, col)); }
      if (e.c3 > 8) { e.c3 = 0; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; run.spawnEnemy('skeleton', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30); } run.burst(e.x, e.y, 18, [col, '#ffffff'], 60); }
    },
    b_demon(run, e, dt, dx, dy, dist) {
      charge(run, e, dt, dx, dy, dist);
      e.c1 = (e.c1 || 0) + dt; e.c3 = (e.c3 || 0) + dt;
      if (e.c1 > 3.4 && e.phase === 0) { e.c1 = 0; const off = Math.random() * TAU; for (let i = 0; i < 18; i++) shot(run, e, off + i / 18 * TAU, 80, 0.6, '#ff8a3a'); DH.audio.play('fire'); }
      if (e.c3 > 9) { e.c3 = 0; for (let i = 0; i < 6; i++) run.spawnEnemy('imp', e.x + U.rand(-40, 40), e.y + U.rand(-40, 40)); }
      if (e.c4 == null) e.c4 = 0; e.c4 += dt;
      if (e.c4 > 6) { e.c4 = 0; const p = run.player; for (let i = 0; i < 4; i++) run.hazard({ kind: 'circle', x: p.x + U.rand(-50, 50), y: p.y + U.rand(-50, 50), r: 26, delay: 1.1, dmg: e.dmg, color: '#ff5a1a', src: e, boss: true, sound: 'boom', fire: true }); }
    },
    /* Lord of Anguish: mounted charges & skull formations, then on foot: fire waves & grasping hands */
    b_lord(run, e, dt, dx, dy, dist) {
      const p = run.player;
      if (!e.footed && e.hp < e.maxHp * 0.5) {
        e.footed = true; e.painter = e.def.painter2; e.phase = 0; e.phaseT = 0; e.tele = false; e.spd *= 0.75;
        run.burst(e.x, e.y, 50, ['#ff6a2a', '#2a1a22', '#ffffff'], 140); run.shake = 8; DH.audio.play('roar');
        DH.events.emit('run:warning', t('hud.dismounted'));
      }
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt;
      if (e.def.lord) { e.cb = (e.cb || 0) + dt; if (e.cb > 14) { e.cb = 0; shot(run, e, Math.atan2(p.y - e.y, p.x - e.x), 55, 0.3, '#a040ff', 'curse'); DH.audio.play('frost'); } } // Curse Bolt: slow, but deadly in 40 s
      if (!e.footed) {
        charge(run, e, dt, dx, dy, dist, 280);
        if (e.c1 > 3.4 && e.phase === 0) {
          e.c1 = 0; e.pat = ((e.pat || 0) + 1) % 3;
          const base = Math.atan2(dy, dx);
          if (e.pat === 0) { for (let i = 0; i < 22; i++) { const a = base + i / 22 * TAU; if (Math.abs(Math.atan2(Math.sin(a - base - Math.PI), Math.cos(a - base - Math.PI))) < 0.45) continue; shot(run, e, a, 75, 0.7, '#b060ff', 'skull'); } }
          else if (e.pat === 1) { for (let w = 0; w < 3; w++) run.after(w * 0.35, () => { for (let i = 0; i < 10; i++) shot(run, e, w * 0.3 + i / 10 * TAU, 85, 0.6, '#b060ff', 'skull'); }); }
          else { for (let k = 0; k < 4; k++) { const a = base + k * Math.PI / 2 + Math.PI / 4; for (let j = 0; j < 5; j++) run.after(j * 0.12, () => shot(run, e, a, 110, 0.6, '#b060ff', 'skull')); } }
          DH.audio.play('frost');
        }
      } else {
        e.cspd = e.spd; e.mx = dx; e.my = dy;
        if (e.c1 > 3) { // wave of fire with a single gap
          e.c1 = 0; const gap = Math.atan2(dy, dx) + U.rand(-1.2, 1.2);
          for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; if (Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap))) < 0.38) continue; shot(run, e, a, 60, 0.7, '#ff7a20', 'fire'); }
          DH.audio.play('fire');
        }
        if (e.c2 > 5) { // demonic hands claw up from the floor
          e.c2 = 0;
          run.hazard({ kind: 'circle', x: p.x, y: p.y, r: 18, delay: 1, dur: 2.5, dmg: e.dmg * 0.8, slow: 0.6, color: '#b02030', src: e, boss: true, hands: true });
          for (let i = 0; i < 4; i++) { const a = Math.random() * TAU, d = U.rand(30, 70); run.hazard({ kind: 'circle', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 18, delay: 1, dur: 2.5, dmg: e.dmg * 0.8, slow: 0.6, color: '#b02030', src: e, boss: true, hands: true }); }
        }
      }
    },
    b_overlord(run, e, dt, dx, dy, dist) {
      const p = run.player;
      e.cspd = e.spd; e.mx = dx; e.my = dy;
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt;
      if (e.c1 > 3.5) {
        e.c1 = 0;
        run.hazard({ kind: 'circle', x: p.x, y: p.y, r: 40, delay: 1.1, dmg: e.dmg * 1.4, color: '#ff4a2a', src: e, boss: true, sound: 'boom',
          onFire: (r, h) => { r.shake = 6; for (let i = 0; i < 12; i++) r.enemyShot({ x: h.x, y: h.y }, i / 12 * TAU, 90, e.dmg * 0.5, '#ffb030'); } });
      }
      if (e.c2 > 8) { e.c2 = 0; for (let i = 0; i < 5; i++) run.spawnEnemy('imp', e.x + U.rand(-40, 40), e.y + U.rand(-40, 40)); DH.audio.play('roar'); }
    },
    b_wyrm(run, e, dt, dx, dy, dist) {
      const p = run.player;
      e.cspd = e.spd * 1.2; e.mx = dist < 100 ? -dx : dist > 150 ? dx : -dy; e.my = dist < 100 ? -dy : dist > 150 ? dy : dx;
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt;
      if (e.c1 > 4) { e.c1 = 0; const a = Math.atan2(p.y - e.y, p.x - e.x); run.hazard({ kind: 'cone', x: e.x, y: e.y, ang: a, arc: 0.9, len: 170, delay: 0.9, dmg: e.dmg * 1.2, color: e.variant === 'bog' ? '#90d040' : '#ff6a1a', src: e, boss: true, sound: 'fire', fire: true }); }
      if (e.c2 > 2.4) { e.c2 = 0; const a = Math.atan2(dy, dx); [-0.3, 0, 0.3].forEach((o, i) => run.after(i * 0.15, () => shot(run, e, a + o, 140, 0.7, e.variant === 'bog' ? '#b0ff50' : '#ff8a3a', 'fire'))); }
    },
    b_horseman(run, e, dt, dx, dy, dist) {
      const p = run.player, S = C.SECRET;
      // the Lord turns ethereal now and then: nothing touches it (the Sentinel Orb forbids it)
      e.eth = Math.max(0, (e.eth || 0) - dt);
      if (e.def.lord && !run.sentinel) { e.ethT = (e.ethT || 0) + dt; if (e.ethT >= S.ethEvery) { e.ethT = 0; e.eth = S.ethDur; run.text(e.x, e.y - e.r - 12, t('sec.ethereal'), '#80f0ff', true); DH.audio.play('frost'); } }
      charge(run, e, dt, dx, dy, dist, 290);
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt;
      if (e.c1 > 3.8 && e.phase === 0) {
        e.c1 = 0; const a0 = Math.random() * Math.PI;
        for (let k = 0; k < 3; k++) { const a = a0 + k * Math.PI / 3; run.hazard({ kind: 'line', x: p.x - Math.cos(a) * 140, y: p.y - Math.sin(a) * 140, ang: a, len: 280, w: 16, delay: 1.1, dmg: e.dmg, color: '#80f0ff', src: e, boss: true, sound: 'zap' }); }
      }
      if (e.c2 > 10) { e.c2 = 0; for (let i = 0; i < 5; i++) run.spawnEnemy('wraith', e.x + U.rand(-40, 40), e.y + U.rand(-40, 40)); }
    },
    b_basilisk(run, e, dt, dx, dy, dist) {
      const p = run.player;
      e.cspd = e.spd; e.mx = dx; e.my = dy;
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt; e.c3 = (e.c3 || 0) + dt;
      if (e.c1 > 4.5) { e.c1 = 0; run.hazard({ kind: 'cone', x: e.x, y: e.y, ang: Math.atan2(p.y - e.y, p.x - e.x), arc: 0.8, len: 200, delay: 0.8, dmg: e.dmg * 0.7, slow: 2, color: '#e8e080', src: e, boss: true, sound: 'frost' }); }
      if (e.c2 > 3) { e.c2 = 0; for (let i = 0; i < 3; i++) run.hazard({ kind: 'circle', x: p.x + U.rand(-40, 40), y: p.y + U.rand(-40, 40), r: 20, delay: 0.9, dur: 3, dmg: e.dmg * 0.5, color: '#90d040', src: e, boss: true, pool: true }); }
      if (e.c3 > 2 && dist < 50) { e.c3 = 0; run.hazard({ kind: 'circle', x: e.x, y: e.y, r: 44, delay: 0.6, dmg: e.dmg, color: '#ff5040', src: e, boss: true, sound: 'swing' }); }
    },
    b_jotun(run, e, dt, dx, dy, dist) {
      const p = run.player;
      e.cspd = e.spd; e.mx = dx; e.my = dy;
      e.c1 = (e.c1 || 0) + dt; e.c2 = (e.c2 || 0) + dt;
      if (e.c1 > 3.6) {
        e.c1 = 0;
        run.hazard({ kind: 'circle', x: e.x, y: e.y, r: 58, delay: 0.9, dmg: e.dmg * 1.2, slow: 1, color: '#9fe8ff', src: e, boss: true, sound: 'boom',
          onFire: (r, h) => { r.shake = 7; for (let i = 0; i < 16; i++) r.enemyShot({ x: h.x, y: h.y }, i / 16 * TAU, 80, e.dmg * 0.5, '#cfefff'); } });
      }
      if (e.c2 > 5) { e.c2 = 0; for (let i = 0; i < 3; i++) run.after(i * 0.3, () => run.hazard({ kind: 'circle', x: p.x + (run.hatingHeart ? 0 : U.rand(-20, 20)), y: p.y + (run.hatingHeart ? 0 : U.rand(-20, 20)), r: 22, delay: run.hatingHeart ? 1.5 : 1.2, dmg: e.dmg, slow: 1, color: '#9fe8ff', src: e, boss: true, sound: 'boom', boulder: true })); }
    },
  };
  C.BOSS_AI = AI;
})(window.DH);
