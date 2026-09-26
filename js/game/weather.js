/* Weather (mixed into DH.Run.prototype): atmosphere only, nothing here touches the fight.
 *   crypt      draughts: gusts of dust sweep through; now and then the vault rumbles and grit rains down
 *   abyss      ash falls without end; hot gusts drive the ash and embers sideways
 *   aqueduct   a downpour: slanting rain, splashes on the stones, thunder and lightning over the chasm
 *   catacombs  a blizzard: wind-driven snow that thickens into white-out gusts
 *   discord    an arcane storm: violet motes fall like rain, runes flare on the floor, violet lightning
 *   blightmire rolling banks of fog and drifting fireflies
 *   reliquary  draughts carrying gold dust; the vault rumbles and grit rains down
 * Particles live in world space (so they keep their place when the camera moves) inside a box around the view;
 * the ground layer (splashes, runes, grit) is drawn under the lighting, the sky layer (rain, snow, ash) over it. */
(function (DH) {
  'use strict';
  const U = DH.util, A = DH.art, G = DH.gfx;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;

  const W8 = {
    crypt:      { dust: 1, rumble: [26, 44] },
    abyss:      { ash: 110, wind: 10, gust: [11, 19], gustW: 70, heat: true },
    aqueduct:   { rain: 170, wind: 26, thunder: [13, 24], splash: true },
    catacombs:  { snow: 150, wind: 34, gust: [7, 13], gustW: 150, whiteout: true },
    discord:    { arcane: 60, runes: 1.1, thunder: [17, 30], violet: true },
    blightmire: { fogbanks: 5, flies: 22 },
    reliquary:  { dust: 1, gold: true, rumble: [30, 50] },
  };
  DH.content.WEATHER = W8;

  const rand = (a, b) => a + Math.random() * (b - a);

  R.initWeather = function () {
    const w = W8[this.stageId] || {};
    this.w8 = { cfg: w, parts: [], ground: [], banks: [], flies: [], gustT: w.gust ? rand(w.gust[0], w.gust[1]) : 0, gust: 0, gustDir: 1,
      thunderT: w.thunder ? rand(4, w.thunder[1]) : 0, rumbleT: w.rumble ? rand(12, w.rumble[1]) : 0, runeT: 0, dustT: rand(3, 8), shakeK: 0 };
  };

  /** Current wind (world units / s, positive = to the right): the hall's breeze plus a gust. */
  R.windNow = function () { const S = this.w8; return (S.cfg.wind || 0) + S.gust * (S.cfg.gustW || 0) * S.gustDir; };

  R.updateWeather = function (dt) {
    if (!this.w8) this.initWeather();
    const S = this.w8, w = S.cfg, V = DH.view, p = this.player, lowFx = this.settings.lowFx;
    const W = V.w || 270, H = V.h || 480, left = p.x - W / 2 - 40, top = p.y - H / 2 - 60, box = { l: left, t: top, r: left + W + 80, b: top + H + 120 };
    const mult = lowFx ? 0.4 : 1;
    // gusts: a swell of wind that rises and fades over ~3 s
    if (w.gust) {
      S.gustT -= dt;
      if (S.gustT <= 0) { S.gustT = rand(w.gust[0], w.gust[1]); S.gustLife = 3.2; S.gustDir = Math.random() < 0.7 ? 1 : -1; DH.audio.play('gust'); }
      if (S.gustLife > 0) { S.gustLife -= dt; S.gust = Math.sin(Math.max(0, S.gustLife) / 3.2 * Math.PI); } else S.gust = 0;
    }
    const wind = this.windNow();
    // falling particles (rain, snow, ash, arcane motes)
    const want = Math.round((w.rain || w.snow || w.ash || w.arcane || 0) * mult * (1 + S.gust * (w.whiteout ? 1.2 : 0.3)));
    while (S.parts.length < want) {
      const q = { x: rand(box.l, box.r), y: rand(box.t, box.b), ph: Math.random() * TAU, s: Math.random() };
      if (w.rain) { q.vy = rand(260, 340); q.len = rand(7, 12); q.land = q.y + rand(40, 260); }
      else if (w.snow) { q.vy = rand(18, 34); q.sz = Math.random() < 0.3 ? 1.5 : 1; }
      else if (w.ash) { q.vy = rand(8, 18); q.sz = Math.random() < 0.35 ? 2 : 1.4; q.c = Math.random() < 0.14 ? '#ff8a30' : Math.random() < 0.5 ? '#9a9090' : '#c0b8b0'; }
      else { q.vy = rand(40, 70); q.len = rand(4, 7); q.c = ['#e080ff', '#b060ff', '#ffb0ff'][Math.random() * 3 | 0]; q.land = q.y + rand(30, 200); }
      S.parts.push(q);
    }
    if (S.parts.length > want + 10) S.parts.length = want;
    for (let i = S.parts.length - 1; i >= 0; i--) {
      const q = S.parts[i];
      q.x += (wind * (w.rain ? 1 : 1.2) + (w.snow || w.ash ? Math.sin(this.time * 1.4 + q.ph) * 6 : 0)) * dt; q.y += q.vy * dt;
      if ((w.rain || w.arcane) && q.y >= q.land) { // it hits the floor
        if (w.splash && S.ground.length < 60) S.ground.push({ k: 'splash', x: q.x, y: q.y, t: 0, max: 0.35 });
        q.y = box.t - rand(0, 40); q.x = rand(box.l, box.r); q.land = rand(p.y - H / 2, p.y + H / 2 + 40);
      }
      if (q.y > box.b) { q.y = box.t - rand(0, 30); q.x = rand(box.l, box.r); }
      if (q.x > box.r) q.x -= box.r - box.l; else if (q.x < box.l) q.x += box.r - box.l;
    }
    // thunder: lightning flashes the hall (twice, flickering), the roll follows a moment later
    if (w.thunder) {
      S.thunderT -= dt;
      if (S.thunderT <= 0) {
        S.thunderT = rand(w.thunder[0], w.thunder[1]);
        const col = w.violet ? 'rgba(200,150,255,' : 'rgba(200,220,255,';
        this.flashLight(0.5, col); this.after(0.14, () => this.flashLight(0.32, col)); this.after(rand(0.5, 1.4), () => DH.audio.play('thunder'));
      }
    }
    // the vault rumbles: a light shake, grit and dust raining from the ceiling
    if (w.rumble) {
      S.rumbleT -= dt;
      if (S.rumbleT <= 0) {
        S.rumbleT = rand(w.rumble[0], w.rumble[1]); S.shakeK = 1.6; S.haze = 1.8; DH.audio.play('rumble');
        for (let i = 0; i < (lowFx ? 14 : 40); i++) this.after(Math.random() * 1.2, () => S.ground.push({ k: 'grit', x: p.x + rand(-W / 2, W / 2), y: p.y + rand(-H / 2, H / 2), t: 0, max: 0.9, fall: rand(50, 110) }));
      }
      if (S.haze > 0) S.haze -= dt;
      if (S.shakeK > 0) { S.shakeK -= dt; this.shake = Math.max(this.shake, 1.4 * Math.min(1, S.shakeK)); }
    }
    // draughts: a sheet of dust drifts across the view now and then
    if (w.dust) {
      S.dustT -= dt;
      if (S.dustT <= 0) { S.dustT = rand(6, 12); S.sheet = { y: p.y + rand(-H / 3, H / 3), t: 0, max: 3.2, dir: Math.random() < 0.5 ? 1 : -1 }; }
      if (S.sheet) { S.sheet.t += dt; if (S.sheet.t > S.sheet.max) S.sheet = null; }
    }
    // arcane storm: runes flare on the floor around the hero
    if (w.runes) {
      S.runeT -= dt;
      if (S.runeT <= 0) { S.runeT = w.runes * rand(0.6, 1.4); S.ground.push({ k: 'rune', x: p.x + rand(-W / 2, W / 2), y: p.y + rand(-H / 2, H / 2), t: 0, max: 1.6, rot: Math.random() * TAU, r: rand(10, 18) }); }
    }
    // fog banks and fireflies of the bog
    if (w.fogbanks) {
      while (S.banks.length < w.fogbanks) S.banks.push({ x: p.x + rand(-W, W), y: p.y + rand(-H / 2, H / 2), rx: rand(90, 160), ry: rand(40, 70), vx: rand(5, 11) * (Math.random() < 0.5 ? 1 : -1), a: rand(0.18, 0.3), ph: Math.random() * TAU });
      for (const b of S.banks) { b.x += b.vx * dt; if (Math.abs(b.x - p.x) > W * 1.1 || Math.abs(b.y - p.y) > H) { b.x = p.x - Math.sign(b.vx) * (W / 2 + b.rx); b.y = p.y + rand(-H / 2, H / 2); } }
    }
    if (w.flies) {
      while (S.flies.length < w.flies * mult) S.flies.push({ x: p.x + rand(-W / 2, W / 2), y: p.y + rand(-H / 2, H / 2), vx: 0, vy: 0, ph: Math.random() * TAU, blink: rand(1.5, 3.5) });
      for (const f of S.flies) {
        f.vx += rand(-40, 40) * dt; f.vy += rand(-40, 40) * dt; f.vx *= 0.97; f.vy *= 0.97; f.x += f.vx * dt; f.y += f.vy * dt;
        if (Math.abs(f.x - p.x) > W * 0.7 || Math.abs(f.y - p.y) > H * 0.7) { f.x = p.x + rand(-W / 2, W / 2); f.y = p.y + rand(-H / 2, H / 2); }
      }
    }
    for (let i = S.ground.length - 1; i >= 0; i--) { const q = S.ground[i]; q.t += dt; if (q.t >= q.max) S.ground.splice(i, 1); }
  };

  /** Ground layer, under the lighting: splashes, flaring runes, falling grit and its dust puffs, firefly glow. */
  R.drawWeatherGround = function (g, cx, cy, W, H, lights) {
    const S = this.w8; if (!S) return;
    for (const q of S.ground) {
      const k = q.t / q.max, x = q.x - cx, y = q.y - cy;
      if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
      if (q.k === 'splash') {
        g.strokeStyle = 'rgba(170,220,230,' + (0.55 * (1 - k)) + ')'; g.lineWidth = 0.6;
        g.beginPath(); g.ellipse(x, y, 1 + k * 4, 0.5 + k * 1.6, 0, 0, TAU); g.stroke();
        if (k < 0.3) { g.fillStyle = 'rgba(200,240,250,0.6)'; g.fillRect(this.rd(x - 1), this.rd(y - 2 - k * 6), 0.5, 0.5); g.fillRect(this.rd(x + 1), this.rd(y - 1.6 - k * 5), 0.5, 0.5); }
      } else if (q.k === 'rune') {
        const a = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.85;
        g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(200,120,255,' + a + ')'; g.lineWidth = 0.8;
        g.beginPath(); g.ellipse(x, y, q.r, q.r * 0.5, 0, 0, TAU); g.stroke();
        g.beginPath(); for (let i = 0; i <= 5; i++) { const an = q.rot + i * 4 * Math.PI / 5, px = x + Math.cos(an) * q.r * 0.8, py = y + Math.sin(an) * q.r * 0.4; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
        g.restore();
        lights.push({ x: q.x, y: q.y, r: q.r * 2.2 * a, kind: 'tint', color: '#c070ff', a: 0.4 * a });
      } else if (q.k === 'grit') {
        const fk = Math.min(1, k * 1.6), gy = y - q.fall * (1 - fk);
        if (fk < 1) { g.fillStyle = '#a89c8c'; g.fillRect(this.rd(x), this.rd(gy), 1.5, 1.5); g.fillStyle = '#6a6056'; g.fillRect(this.rd(x + 2), this.rd(gy - 4), 1, 1); g.fillRect(this.rd(x - 2), this.rd(gy - 7), 1, 1); }
        else { const pk = (k - 0.625) / 0.375; g.fillStyle = 'rgba(170,160,150,' + 0.5 * (1 - pk) + ')'; g.beginPath(); g.ellipse(x, y, 3 + pk * 7, 1.4 + pk * 2.6, 0, 0, TAU); g.fill(); g.fillStyle = '#8a7e70'; g.fillRect(this.rd(x), this.rd(y), 1.5, 1); }
      }
    }
    for (const f of S.flies) { const b = Math.max(0, Math.sin(this.time * TAU / f.blink + f.ph)); if (b > 0.2) lights.push({ x: f.x, y: f.y, r: 10 * b, kind: 'tint', color: '#d8ff70', a: 0.35 * b }); }
  };

  /** Sky layer, over the lighting: rain, snow, ash, arcane motes, dust sheets, fog banks, fireflies. */
  R.drawWeatherSky = function (g, cx, cy, W, H) {
    const S = this.w8; if (!S) return;
    const w = S.cfg, wind = this.windNow(), rd = this.rd, now = this.time;
    g.save();
    if (w.rain) { // slanting streaks, brighter near the hero's light
      const sx = wind / 300;
      g.strokeStyle = 'rgba(180,210,230,0.42)'; g.lineWidth = 0.7; g.beginPath();
      for (const q of S.parts) { const x = q.x - cx, y = q.y - cy; if (x < -10 || y < -20 || x > W + 10 || y > H + 10) continue; g.moveTo(x, y); g.lineTo(x - sx * q.len, y - q.len); }
      g.stroke();
      g.fillStyle = 'rgba(20,30,40,0.12)'; g.fillRect(0, 0, W, H); // the downpour dims the hall a little
    } else if (w.arcane) {
      g.globalCompositeOperation = 'lighter';
      for (const q of S.parts) { const x = q.x - cx, y = q.y - cy; if (x < -10 || y < -20 || x > W + 10 || y > H + 10) continue;
        g.strokeStyle = G.rgba(q.c, 0.5); g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - q.len); g.stroke(); }
    } else if (w.snow || w.ash) {
      const streak = w.snow ? Math.min(6, Math.abs(wind) / 30) : 0;
      for (const q of S.parts) {
        const x = q.x - cx, y = q.y - cy; if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue;
        if (w.snow) { g.fillStyle = 'rgba(240,248,255,' + (0.55 + q.s * 0.4) + ')'; if (streak > 1.5) { g.fillRect(rd(x - streak * Math.sign(wind)), rd(y), streak, 0.6); } else g.fillRect(rd(x), rd(y), q.sz, q.sz); }
        else { if (q.c === '#ff8a30') { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,140,50,0.9)'; } else { g.globalCompositeOperation = 'source-over'; g.fillStyle = G.rgba(q.c, 0.85); } g.fillRect(rd(x), rd(y), q.sz, q.sz * 0.7); }
      }
      g.globalCompositeOperation = 'source-over';
      if (w.whiteout && S.gust > 0.05) { g.fillStyle = 'rgba(220,235,250,' + (0.22 * S.gust) + ')'; g.fillRect(0, 0, W, H); } // the gust turns the air white
      if (w.heat && S.gust > 0.05) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,90,30,' + (0.07 * S.gust) + ')'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over'; }
    }
    if (S.haze > 0) { g.fillStyle = (w.gold ? 'rgba(200,180,130,' : 'rgba(150,140,130,') + (0.16 * Math.min(1, S.haze) * Math.min(1, (1.8 - S.haze) * 4)) + ')'; g.fillRect(0, 0, W, H); } // dust shaken down from the vault
    if (S.sheet) { // a sheet of dust drifting across
      const k = S.sheet.t / S.sheet.max, a = Math.sin(k * Math.PI) * 0.16, y = S.sheet.y - cy, x = S.sheet.dir > 0 ? -W * 0.6 + k * W * 2.2 : W * 1.6 - k * W * 2.2;
      const grd = g.createRadialGradient(x, y, 4, x, y, W * 0.55);
      const c = w.gold ? '220,190,120' : '170,160,150';
      grd.addColorStop(0, 'rgba(' + c + ',' + a + ')'); grd.addColorStop(1, 'rgba(' + c + ',0)');
      g.fillStyle = grd; g.save(); g.translate(x, y); g.scale(1, 0.35); g.translate(-x, -y); g.fillRect(x - W * 0.6, y - W * 0.6, W * 1.2, W * 1.2); g.restore();
      g.fillStyle = w.gold ? 'rgba(255,220,130,0.7)' : 'rgba(200,190,180,0.5)';
      for (let i = 0; i < 14; i++) { const px = x + Math.sin(i * 12.9 + now) * W * 0.4, py = y + Math.cos(i * 7.3 + now * 1.3) * 18; g.fillRect(rd(px), rd(py), 0.6, 0.6); }
    }
    if (S.banks.length) { // slow banks of bog fog
      const fog = DH.vfx.fog(this.stageId);
      for (const b of S.banks) {
        const x = b.x - cx, y = b.y - cy; if (x < -b.rx * 1.2 || x > W + b.rx * 1.2 || y < -b.ry * 2 || y > H + b.ry * 2) continue;
        g.save(); g.globalAlpha = b.a * (0.8 + Math.sin(now * 0.4 + b.ph) * 0.2);
        g.beginPath(); g.ellipse(x, y, b.rx, b.ry, 0, 0, TAU); g.clip();
        g.drawImage(fog.tex, x - b.rx - ((now * 6) % 40), y - b.ry, b.rx * 2 + 40, b.ry * 2);
        g.restore();
      }
    }
    if (S.flies.length) {
      g.globalCompositeOperation = 'lighter';
      for (const f of S.flies) { const b = Math.max(0, Math.sin(now * TAU / f.blink + f.ph)); if (b < 0.05) continue; const x = f.x - cx, y = f.y - cy;
        g.globalAlpha = b; g.drawImage(A.glow('rgba(200,255,110,0.8)'), x - 3, y - 3, 6, 6); g.fillStyle = '#f0ffc0'; g.fillRect(rd(x), rd(y), 0.6, 0.6); }
      g.globalAlpha = 1;
    }
    g.restore();
  };
})(window.DH);
