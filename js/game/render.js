/* Run renderer (mixed into DH.Run.prototype). */
(function (DH) {
  'use strict';
  const U = DH.util, A = DH.art, G = DH.gfx, C = DH.content;
  const R = DH.Run.prototype;
  const TAU = Math.PI * 2;
  const GEM = { 1: 'gem1', 10: 'gem10', 100: 'gem100', 1000: 'gem1000' };
  const GEM_COL = { 1: '#4aa8ff', 10: '#ffd040', 100: '#c060ff', 1000: '#ffb020' };

  R.render = function () {
    const V = DH.view; let g = V.begin(); const W = V.w, H = V.h, p = this.player;
    const rd = V.snap;
    this.rd = rd;
    const sh = this.settings.shake ? this.shake : 0;
    const cx = rd(p.x - W / 2 + (sh ? U.rand(-sh, sh) : 0)), cy = rd(p.y - H / 2 + (sh ? U.rand(-sh, sh) : 0));
    this.cam.x = cx; this.cam.y = cy;
    const now = this.time, lights = [];
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);

    // floor
    const CH = G.CHUNK;
    for (let ky = Math.floor(cy / CH); ky <= Math.floor((cy + H) / CH); ky++) for (let kx = Math.floor(cx / CH); kx <= Math.floor((cx + W) / CH); kx++) {
      const ch = this.floor.chunk(kx, ky);
      g.drawImage(ch.canvas, kx * CH - cx, ky * CH - cy, CH, CH);
      for (const l of ch.lights) if (!this.bridge || Math.abs(l.y) < this.bridge + 10) lights.push(l);
    }
    this.drawHall(g, cx, cy, W, H, now);
    this.drawLandmarksFlat(g, cx, cy, W, H, lights);
    this.vfxShafts(cx, cy, W, H, lights);
    // decals
    for (const d of this.decals) {
      const a = Math.min(1, d.life / 3) * 0.7;
      g.fillStyle = d.kind === 'bone' ? 'rgba(200,190,160,' + a * 0.6 + ')' : 'rgba(110,8,20,' + a + ')';
      g.beginPath(); g.ellipse(d.x - cx, d.y - cy, d.r, d.r * 0.5, 0, 0, TAU); g.fill();
    }
    // zones
    for (const z of this.zones) {
      const x = z.x - cx, y = z.y - cy;
      if (z.kind === 'pool') {
        const a = Math.min(1, z.life / 0.5, (z.max - z.life) / 0.2);
        g.fillStyle = 'rgba(80,190,70,' + 0.35 * a + ')'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(160,255,140,' + 0.5 * a + ')'; g.lineWidth = 0.8; g.stroke();
        lights.push({ x: z.x, y: z.y, r: z.r * 1.1, kind: 'tint', color: '#90e070', a: 0.18 * a });
      } else if (z.kind === 'brew') { // Alchemist's puddle in its element's colour
        const a = Math.min(1, z.life / 0.5, (z.max - z.life) / 0.2), wob = 1 + Math.sin(now * 3 + z.seed) * 0.04;
        g.fillStyle = G.rgba(z.col, 0.3 * a); g.beginPath(); g.ellipse(x, y, z.r * wob, z.r * 0.6 / wob, 0, 0, TAU); g.fill();
        g.fillStyle = G.rgba(z.col, 0.22 * a); g.beginPath(); g.ellipse(x + z.r * 0.2, y - z.r * 0.08, z.r * 0.55, z.r * 0.3, 0, 0, TAU); g.fill();
        g.strokeStyle = G.rgba(z.col, 0.6 * a); g.lineWidth = 0.8; g.beginPath(); g.ellipse(x, y, z.r * wob, z.r * 0.6 / wob, 0, 0, TAU); g.stroke();
        if (z.el === 'lightning' && Math.random() < 0.25) { g.strokeStyle = 'rgba(255,255,220,' + a + ')'; g.lineWidth = 0.6; g.beginPath(); let px = x + U.rand(-z.r, z.r) * 0.6, py = y + U.rand(-z.r, z.r) * 0.3; g.moveTo(px, py); for (let i = 0; i < 3; i++) { px += U.rand(-5, 5); py += U.rand(-3, 3); g.lineTo(px, py); } g.stroke(); }
        if (z.el === 'fire') for (let i = 0; i < 4; i++) { const an = z.seed + i * 1.7, fx = x + Math.cos(an) * z.r * 0.5, fy = y + Math.sin(an) * z.r * 0.3, fh = (3 + Math.sin(now * 12 + i * 2) * 1.5) * a; g.fillStyle = 'rgba(255,170,60,' + 0.7 * a + ')'; g.beginPath(); g.moveTo(fx - 1.4, fy); g.quadraticCurveTo(fx, fy - fh * 2, fx + 1.4, fy); g.fill(); }
        if (z.el === 'ice') { g.fillStyle = 'rgba(230,250,255,' + 0.8 * a + ')'; for (let i = 0; i < 5; i++) { const an = z.seed + i * 1.3; g.fillRect(this.rd(x + Math.cos(an) * z.r * 0.6), this.rd(y + Math.sin(an) * z.r * 0.35), 1, 1); } }
        lights.push({ x: z.x, y: z.y, r: z.r * 1.3, kind: z.el === 'fire' ? 'fire' : 'tint', color: z.col, a: 0.25 * a });
      } else if (z.kind === 'mosh') {
        const a = Math.min(1, z.life / 0.3, (z.max - z.life + 0.3) / 0.3), f = z.flash || 0;
        g.fillStyle = 'rgba(255,150,60,' + (0.12 + f * 0.2) * a + ')'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.6, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,200,110,' + (0.5 + f * 0.5) * a + ')'; g.lineWidth = 1 + f; g.setLineDash([4, 3]); g.lineDashOffset = -now * 30;
        g.beginPath(); g.ellipse(x, y, z.r * (1 + f * 0.08), z.r * 0.6 * (1 + f * 0.08), 0, 0, TAU); g.stroke(); g.setLineDash([]);
        lights.push({ x: z.x, y: z.y, r: z.r, kind: 'fire' });
      } else if (z.kind === 'thorns') {
        const a = Math.min(1, z.life / 0.5, (z.max - z.life) / 0.25);
        g.fillStyle = 'rgba(40,60,20,' + 0.45 * a + ')'; g.beginPath(); g.ellipse(x, y, z.r, z.r * 0.6, 0, 0, TAU); g.fill();
        g.lineWidth = 1; g.lineCap = 'round';
        for (let i = 0; i < 9; i++) {
          const ang = z.seed + i * 2.4, d = z.r * (0.25 + (i % 3) * 0.28), bx = x + Math.cos(ang) * d, by = y + Math.sin(ang) * d * 0.6;
          const hgt = (5 + (i % 4) * 2) * a * (0.85 + Math.sin(now * 3 + i) * 0.15);
          g.strokeStyle = i % 2 ? 'rgba(90,120,40,' + a + ')' : 'rgba(60,84,28,' + a + ')';
          g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + (i % 2 ? 3 : -3), by - hgt * 0.6, bx + (i % 2 ? -1 : 1), by - hgt); g.stroke();
          g.fillStyle = 'rgba(200,220,150,' + a + ')'; g.fillRect(bx + (i % 2 ? 1 : -2), by - hgt * 0.55, 1, 1);
        }
      } else if (z.kind === 'rift') {
        const k = 1 + Math.sin(now * 6 + z.x) * 0.1;
        this.sprite(g, 'rift_p', null, 0, x, y, false, k, false, Math.min(1, z.life));
        lights.push({ x: z.x, y: z.y, r: 22, kind: 'magic' });
      }
    }
    // hazards (telegraphs + active areas)
    for (const h of this.hazards) { this.drawHazard(g, h, cx, cy, now); this.hazardLight(h, lights); }
    // hailstones gathered by Hailstorm while moving
    for (const a of this.abilities) if (a.id === 'hail' && a.store > 0) {
      for (let i = 0; i < Math.min(12, a.store); i++) { const an = now * 4 + i * TAU / Math.min(12, a.store); G.P.circle(g, rd(p.x - cx + Math.cos(an) * 10), rd(p.y - cy - 16 + Math.sin(an) * 3), 1.3, i % 2 ? '#e8f8ff' : '#9fd8ff'); }
    }
    // halo aura
    for (const a of this.abilities) if (a.id === 'halo' && a.R) {
      const Rr = a.R * (1 + (a.pulse || 0) * 0.06), x = p.x - cx, y = p.y - cy;
      const grd = g.createRadialGradient(x, y, Rr * 0.2, x, y, Rr);
      grd.addColorStop(0, 'rgba(255,230,140,0.05)'); grd.addColorStop(0.8, 'rgba(255,215,90,' + (0.14 + (a.pulse || 0) * 0.15) + ')'); grd.addColorStop(1, 'rgba(255,215,90,0)');
      g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, Rr, Rr * 0.7, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,230,140,0.35)'; g.lineWidth = 0.7; g.setLineDash([3, 4]); g.lineDashOffset = -now * 20;
      g.beginPath(); g.ellipse(x, y, Rr, Rr * 0.7, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      lights.push({ x: p.x, y: p.y, r: Rr * 1.1, kind: 'holy' });
    }
    // the Well
    if (this.well) {
      const w = this.well;
      this.sprite(g, 'well', null, 0, w.x - cx, w.y - cy, false, 1, false, w.used ? 0.6 : 1);
      lights.push({ x: w.x, y: w.y, r: w.used ? 30 : 55, kind: 'magic' });
    }
    // the Lord's Hex obelisk (secret)
    const hxo = this.hex;
    if (hxo && hxo.x - cx > -30 && hxo.y - cy > -40 && hxo.x - cx < W + 30 && hxo.y - cy < H + 40) {
      this.sprite(g, 'hexstone', null, hxo.taken ? 0 : (Math.sin(now * 3.2) > 0 ? 1 : 0), hxo.x - cx, hxo.y - cy, false, 1, false, hxo.taken ? 0.45 : 1);
      if (!hxo.taken) { lights.push({ x: hxo.x, y: hxo.y - 12, r: 60 * (0.8 + 0.3 * (0.5 + 0.5 * Math.sin(now * 3.2))), kind: 'magic' }); if (Math.random() < 0.3) this.parts.push({ x: hxo.x + U.rand(-5, 5), y: hxo.y - U.rand(5, 25), vx: 0, vy: -14, life: 0.9, max: 0.9, c: '#c060ff', s: 1 }); }
    }
    this.drawDissonator(g, cx, cy, W, H, now, lights);
    this.drawSecret(g, cx, cy, W, H, now, lights);
    this.drawEnv(g, cx, cy, W, H, now, lights);
    // pickups
    for (const k of this.pickups) {
      const x = k.x - cx, y = k.y - cy - k.z;
      if (x < -12 || y < -12 || x > W + 12 || y > H + 12) continue;
      let name;
      if (k.type === 'xp') name = k.cluster ? (k.val >= 1000 ? 'clusterX' : 'cluster') : (GEM[k.val] || 'gem1');
      else if (k.type === 'herb') name = 'herb_' + k.sub;
      else if (k.type === 'coin' && k.sub) name = 'coin_' + k.sub;
      else if (k.type === 'food') name = 'food_' + k.sub;
      else name = k.type;
      if (k.type === 'chest_new') { // the Strange Pendulum swings over its chest
        const sw = Math.sin(now * 2.2) * 0.5, px = x, py = y - 30, bx = px + Math.sin(sw) * 18, by = py + Math.cos(sw) * 18;
        g.strokeStyle = 'rgba(200,170,255,0.8)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(px, py); g.lineTo(bx, by); g.stroke();
        G.P.circle(g, bx, by, 2.6, '#c070ff'); G.P.circle(g, bx - 0.7, by - 0.7, 0.9, '#ffffff');
        lights.push({ x: k.x, y: k.y - 12, r: 40, kind: 'item', color: '#c070ff' });
      }
      const bob = k.type === 'xp' ? 0 : Math.sin(now * 4 + k.x) * 1.4;
      this.sprite(g, name, null, 0, x, y + bob, false, 1);
      if (k.type !== 'xp' && k.type !== 'coin') lights.push({ x: k.x, y: k.y, r: k.type === 'tome' || k.type.startsWith('chest') ? 34 : 20, kind: 'item', color: k.type === 'artifact' ? '#ff70ff' : k.type === 'ulcer' ? '#8040c0' : k.type === 'chest_red' && k.sub ? '#60e070' : k.type === 'chest_red' ? '#ff3040' : k.type === 'chest_gold' ? '#ffd35a' : k.type === 'tome' ? '#80a0ff' : k.type === 'shard' ? '#ff40a0' : k.type.startsWith('rune_') ? DH.content.BUFFS[k.type.slice(5)].color : null });
      else if (k.type === 'xp' && (k.val >= 10 || k.cluster)) lights.push({ x: k.x, y: k.y, r: 12, kind: 'gem', color: GEM_COL[k.val] || '#ff3040' });
    }
    // shadows
    g.fillStyle = 'rgba(0,0,0,0.38)';
    for (const e of this.enemies) {
      const x = e.x - cx, y = e.y - cy; if (x < -60 || y < -60 || x > W + 60 || y > H + 60) continue;
      g.beginPath(); g.ellipse(x, y + e.r * 0.9 * (e.scale > 1 || e.boss ? 1.3 : 1), e.r * 0.95, e.r * 0.35, 0, 0, TAU); g.fill();
    }
    for (const al of this.allies) if (al.kind !== 'spirit') { g.beginPath(); g.ellipse(al.x - cx, al.y - cy + 6, 6, 2, 0, 0, TAU); g.fill(); }
    g.beginPath(); g.ellipse(p.x - cx, p.y - cy + 8, 6, 2.5, 0, 0, TAU); g.fill();
    // projected shadows from braziers / candles / crystals
    { const vis = [p]; for (const e of this.enemies) { const x = e.x - cx, y = e.y - cy; if (x > -40 && y > -40 && x < W + 40 && y < H + 40) vis.push(e); } for (const al of this.allies) vis.push(al); this.renderCastShadows(g, vis, lights, cx, cy); }
    // power-up auras under the hero
    for (const bk in this.buffs) if (this.buffs[bk] > 0) {
      const col = DH.content.BUFFS[bk].color, a = this.buffs[bk] < 3 ? (Math.sin(now * 20) > 0 ? 0.7 : 0.2) : 0.7, rr = 11 + Math.sin(now * 6 + bk.length) * 1.5;
      g.strokeStyle = G.rgba(col, a); g.lineWidth = 1; g.beginPath(); g.ellipse(p.x - cx, p.y - cy + 7, rr, rr * 0.38, 0, 0, TAU); g.stroke();
      lights.push({ x: p.x, y: p.y, r: 40, kind: 'item', color: col });
      if (Math.random() < 0.25) this.parts.push({ x: p.x + U.rand(-6, 6), y: p.y + U.rand(-8, 6), vx: 0, vy: -18, life: 0.5, max: 0.5, c: col, s: 1 });
    }
    // charge telegraphs
    for (const b of this.bosses) if (b.tele) {
      g.strokeStyle = 'rgba(255,40,40,' + (0.4 + Math.sin(now * 30) * 0.3) + ')'; g.lineWidth = b.r;
      g.beginPath(); g.moveTo(b.x - cx, b.y - cy); g.lineTo(b.x - cx + b.lockX * 220, b.y - cy + b.lockY * 220); g.stroke(); g.lineWidth = 1;
    }
    // entities sorted by y
    this._stL = 0;
    const ents = [];
    for (const e of this.enemies) { const x = e.x - cx, y = e.y - cy; if (x > -80 && y > -80 && x < W + 80 && y < H + 80) ents.push(e); }
    for (const al of this.allies) ents.push(al);
    ents.push(p);
    this.landmarkEnts(ents, cx, cy, W, H);
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e === p) { this.drawPlayer(g, cx, cy); continue; }
      if (e.lm) { this.drawLandmark(g, e.lm, cx, cy, now); continue; }
      if (e.kind) { this.drawAlly(g, e, cx, cy, lights); continue; }
      this.drawEnemy(g, e, cx, cy, lights);
    }
    // orbiting weapons
    for (const a of this.abilities) if (a.pos) for (const b of a.pos) {
      const name = b.kind === 'scythe' ? 'scythe_p' : b.kind === 'orb' ? 'orb_p' : 'flail_p';
      if (b.kind === 'flail') { g.strokeStyle = 'rgba(160,160,170,0.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(p.x - cx, p.y - cy); g.lineTo(b.x - cx, b.y - cy); g.stroke(); }
      this.sprite(g, name, null, 0, b.x - cx, b.y - cy, false, b.kind === 'flail' ? Math.sqrt(a.s.area) : 1, false, 1, b.kind === 'scythe' ? b.a + Math.PI / 2 + now * 6 : b.kind === 'flail' ? now * 4 : 0);
      lights.push({ x: b.x, y: b.y, r: 16, kind: 'small' });
    }
    // projectiles and effects of the hero's abilities; drawn on a layer when faded (Settings: ability effects)
    const fxA = this.settings.fxAlpha == null ? 1 : this.settings.fxAlpha, lay = fxA < 0.98 ? this.fxLayer(g) : null, g0 = g;
    if (lay) g = lay;
    for (const b of this.proj) this.drawProj(g, b, cx, cy, lights, now);
    for (const f of this.fx) this.drawFx(g, f, cx, cy, lights);
    if (lay) { g = g0; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = Math.max(0.15, fxA); g.drawImage(lay.canvas, 0, 0); g.restore(); }
    for (const b of this.eproj) {
      const x = b.x - cx, y = b.y - cy;
      g.drawImage(A.glow(b.color), x - 8, y - 8, 16, 16);
      if (b.kind === 'curse') { g.drawImage(A.glow('#a040ff'), x - 16, y - 16, 32, 32); G.P.circle(g, x, y, 4, '#2a0840'); G.P.circle(g, x - 1.3, y - 0.6, 1, '#e080ff'); G.P.circle(g, x + 1.3, y - 0.6, 1, '#e080ff'); }
      else if (b.kind === 'skull') { G.P.circle(g, x, y, 2.4, '#e8d8ff'); G.P.circle(g, x - 0.8, y - 0.3, 0.6, '#300050'); G.P.circle(g, x + 0.8, y - 0.3, 0.6, '#300050'); }
      else { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill(); }
      if (FIREY(b.color)) { lights.push({ x: b.x, y: b.y, r: 30, kind: 'fire' }); if (Math.random() < 0.4) this.parts.push({ x: b.x, y: b.y, vx: U.rand(-8, 8), vy: U.rand(-14, 4), life: 0.3, max: 0.3, c: U.pick(['#ff8a30', '#ffd040']), s: 1 }); }
      else lights.push({ x: b.x, y: b.y, r: b.kind === 'curse' ? 34 : 24, kind: 'tint', color: b.color, a: 0.4 });
    }
    // particles
    for (const q of this.parts) { g.globalAlpha = Math.min(1, q.life / q.max * 1.5); g.fillStyle = q.c; g.fillRect(rd(q.x - cx), rd(q.y - cy), q.s, q.s); }
    g.globalAlpha = 1;
    this.drawWeatherGround(g, cx, cy, W, H, lights);
    this.renderFog(g, cx, cy, W, H);

    this.renderLighting(g, lights, cx, cy, W, H);
    this.renderVfxFront(g, cx, cy, W, H);
    this.drawWeatherSky(g, cx, cy, W, H);

    // aiming line (Settings): dots from the hero toward the main weapon's aim, or the nearest foe it will fire at
    if (this.settings.aimLine && p.hp > 0) {
      let ang = this.manualAimAngle(), tg = null;
      if (ang == null) { tg = this.nearest(p.x, p.y, 320); if (tg) ang = Math.atan2(tg.y - p.y, tg.x - p.x); }
      if (ang != null) {
        const len = tg ? Math.min(150, Math.hypot(tg.x - p.x, tg.y - p.y) - 4) : 150, ca = Math.cos(ang), sa = Math.sin(ang), ph = (now * 30) % 6;
        g.fillStyle = '#ffd890';
        for (let d = 10 + ph; d < len; d += 6) { g.globalAlpha = 0.75 * (1 - d / 170); g.fillRect(rd(p.x - cx + ca * d) - 0.5, rd(p.y - cy - 3 + sa * d) - 0.5, 1.5, 1.5); }
        if (tg) { g.globalAlpha = 0.8; g.strokeStyle = '#ffd890'; g.lineWidth = 1; g.beginPath(); g.arc(rd(tg.x - cx), rd(tg.y - cy - 3), Math.max(5, tg.r * 0.9), 0, TAU); g.stroke(); }
        g.globalAlpha = 1;
      }
    }
    // manual aim: a chevron ahead of the hero
    { const ma = this.manualAimAngle(); if (ma != null) { const ax = p.x - cx + Math.cos(ma) * 16, ay = p.y - cy - 2 + Math.sin(ma) * 16; g.save(); g.translate(ax, ay); g.rotate(ma); g.fillStyle = 'rgba(255,120,80,0.85)'; g.beginPath(); g.moveTo(4, 0); g.lineTo(-2, -3); g.lineTo(-0.5, 0); g.lineTo(-2, 3); g.closePath(); g.fill(); g.restore(); } }
    // HP bar
    const hpw = 16, hx = rd(p.x - cx - hpw / 2), hy = rd(p.y - cy + 11);
    g.fillStyle = '#12060a'; g.fillRect(hx - 1, hy - 1, hpw + 2, 4);
    g.fillStyle = '#4a1016'; g.fillRect(hx, hy, hpw, 2);
    g.fillStyle = p.hp / this.P.maxHp < 0.3 ? '#ff4040' : '#e8303c'; g.fillRect(hx, hy, Math.max(0, hpw * p.hp / this.P.maxHp), 2);
    // off-screen markers: collected here, drawn crisp over the scaled view (renderMarkers)
    const marks = this.markers || (this.markers = []); marks.length = 0;
    const px = p.x - cx, py = p.y - cy, ML = 26, MT = this.bosses.some((b) => b && !b.dead) ? 76 : 54, MB = 28;
    const mark = (tx, ty, color, icon, variant) => {
      const x = tx - cx, y = ty - cy; if (x >= -4 && y >= -4 && x <= W + 4 && y <= H + 4) return;
      const a = Math.atan2(ty - p.y, tx - p.x), c = Math.cos(a), s = Math.sin(a);
      // walk the ray from the hero to the screen border (inset so the badge and arrow stay visible)
      const k = Math.min(c > 0 ? (W - ML - px) / c : c < 0 ? (ML - px) / c : 1e9, s > 0 ? (H - MB - py) / s : s < 0 ? (MT - py) / s : 1e9);
      marks.push({ x: px + c * Math.max(0, k), y: py + s * Math.max(0, k), a, color, icon, variant, dist: Math.hypot(tx - p.x, ty - p.y) });
    };
    for (const b of this.bosses) if (b && !b.dead) mark(b.x, b.y, '#ff3040', b.painter, b.variant);
    if (this.well && !this.well.used) mark(this.well.x, this.well.y, '#5ab8ff', 'well');
    for (const q of this.pylons || []) if (!q.dead) mark(q.x, q.y, '#ffd060', 'pylon');
    this.secretMarks(mark);
    if (this.disso) { const Z = this.disso; if (Z.solved) mark(Z.mono.x, Z.mono.y, '#c070ff', 'monolith'); else if (Z.found) { const q = Z.relays[this.dissoFirstWrong()]; mark(q.x, q.y, '#c070ff', 'relay'); } }
    for (const k of this.pickups) {
      if (k.type === 'artifact') mark(k.x, k.y, '#ff70ff', 'artifact');
      else if (k.type === 'tome') mark(k.x, k.y, '#c89aff', 'tome');
      else if (k.type === 'chest_red' || k.type === 'chest_gold') mark(k.x, k.y, k.sub ? '#60e070' : '#ffc040', k.type);
      else if (k.type === 'chest_new') mark(k.x, k.y, '#c070ff', 'chest_new');
      else if (k.start || k.type === 'bucket') mark(k.x, k.y, '#8ad8ff', k.type);
    }
    if (marks.length > 8) { marks.sort((m1, m2) => m1.dist - m2.dist); marks.length = 8; }

    const ctx = V.end(), S = V.S;
    this.renderTexts(ctx, cx, cy, S);
    this.renderMarkers(ctx, S);
    ctx.drawImage(V.getVignette(), 0, 0);
    const fl = this.settings.flash == null ? 1 : this.settings.flash; // Settings: damage flash intensity
    if (this.hurtFlash > 0 && fl > 0) { ctx.fillStyle = 'rgba(200,0,20,' + this.hurtFlash * 0.22 * fl + ')'; ctx.fillRect(0, 0, V.cw, V.ch); }
    if (this.healGlow > 0) { // blood flowing back in: a soft crimson rim that fades
      const a = Math.min(0.3, this.healGlow * 0.3), grd = ctx.createRadialGradient(V.cw / 2, V.ch / 2, Math.min(V.cw, V.ch) * 0.35, V.cw / 2, V.ch / 2, Math.max(V.cw, V.ch) * 0.72);
      grd.addColorStop(0, 'rgba(255,60,80,0)'); grd.addColorStop(1, 'rgba(255,60,90,' + a + ')'); ctx.fillStyle = grd; ctx.fillRect(0, 0, V.cw, V.ch);
    }
    if (this.whiteFlash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + this.whiteFlash * 0.5 + ')'; ctx.fillRect(0, 0, V.cw, V.ch); }
    if (p.hp / this.P.maxHp < 0.25) {
      const a = 0.18 + Math.sin(now * 6) * 0.08;
      const grd = ctx.createRadialGradient(V.cw / 2, V.ch / 2, Math.min(V.cw, V.ch) * 0.3, V.cw / 2, V.ch / 2, Math.max(V.cw, V.ch) * 0.7);
      grd.addColorStop(0, 'rgba(160,0,0,0)'); grd.addColorStop(1, 'rgba(160,0,0,' + a + ')');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, V.cw, V.ch);
    }
    this.renderStick(ctx);
  };

  /** Draw a sprite centred on its anchor. */
  R.sprite = function (g, name, variant, frame, x, y, flip, scale, flash, alpha, rot) {
    const s = G.sprite(name, variant), f = frame % s.frames.length, img = flash ? s.flash[f] : s.frames[f];
    const k = scale || 1, w = s.w * k, h = s.h * k;
    if (alpha != null && alpha < 1) g.globalAlpha = alpha;
    if (rot) { g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(img, -s.ox * k, -s.oy * k, w, h); g.restore(); }
    else if (flip) g.drawImage(G.flip(img), this.rd(x - (s.w - s.ox) * k), this.rd(y - s.oy * k), w, h);
    else g.drawImage(img, this.rd(x - s.ox * k), this.rd(y - s.oy * k), w, h);
    if (alpha != null && alpha < 1) g.globalAlpha = 1;
    return s;
  };
  /** Six cached frames of a small licking flame (for foes on fire). */
  const FLAMES = [];
  function flameFrame(i) {
    if (!FLAMES.length) for (let f = 0; f < 6; f++) {
      const c = G.canvas(10, 24), q = c.getContext('2d'), sw = Math.sin(f / 6 * TAU) * 1.4;
      q.fillStyle = 'rgba(255,110,30,0.6)'; q.beginPath(); q.moveTo(0.5, 24); q.quadraticCurveTo(1 + sw, 11, 5 + sw * 1.4, 0); q.quadraticCurveTo(9 + sw, 11, 9.5, 24); q.closePath(); q.fill();
      q.fillStyle = 'rgba(255,230,140,0.75)'; q.beginPath(); q.moveTo(3, 24); q.quadraticCurveTo(3.4 + sw * 0.6, 15, 5 + sw, 9); q.quadraticCurveTo(6.6 + sw * 0.6, 15, 7, 24); q.closePath(); q.fill();
      FLAMES.push(c);
    }
    return FLAMES[((i % 6) + 6) % 6];
  }
  R.drawEnemy = function (g, e, cx, cy, lights) {
    const s = G.sprite(e.painter, e.variant), nf = s.frames.length;
    const fr = nf > 1 ? Math.floor(e.anim / (e.def.anim || 0.3)) % nf : 0; // a slow, heavy two-frame gait
    const bob = e.def.fly ? Math.sin(e.anim * 4) * 1.5 - 2 : 0;
    const x = e.x - cx, y = e.y - cy + bob, k = e.scale;
    if (e.elite || e.champion || e.boss || e.def.gilded || e.special) {
      const gl = A.glow(e.boss ? 'rgba(255,60,60,0.55)' : e.champion ? 'rgba(255,40,60,0.7)' : 'rgba(255,200,80,0.55)');
      const rr = (e.boss ? 34 : 20) * k * (e.boss ? 1 : 0.8);
      g.drawImage(gl, x - rr, y - rr, rr * 2, rr * 2);
    }
    let img = e.flash > 0 ? s.flash[fr] : s.frames[fr];
    if (!(e.flash > 0) && e.st.frost > 0) img = G.tint(img, 'rgba(140,210,255,0.45)');
    else if (!(e.flash > 0) && e.st.decay > 0) img = G.tint(img, 'rgba(120,200,60,0.3)');
    const w = s.w * k, h = s.h * k;
    // readability: a pale rim lifts the foe off the floor (Settings: enemy outlines)
    if (this.settings.outlines !== false && !e.def.prop && !(e.flash > 0)) img = G.rim(img, e.boss || e.champion ? 'rgba(255,90,80,0.8)' : 'rgba(255,236,214,0.42)', Math.max(1, Math.round(s.res * 0.75)));
    if (e.def.alpha) g.globalAlpha = e.def.alpha;
    if (e.eth > 0) g.globalAlpha = 0.35 + Math.sin(e.anim * 12) * 0.1; // ethereal: untouchable
    if (e.atkT > 0) { // attack in three beats: coil back (squash), lunge at the hero (stretch), recover
      const t = 1 - e.atkT / e.atkMax, reach = Math.min(7, 2.5 + e.r * 0.35) * (e.boss ? 1.4 : 1);
      let off, sq;
      if (t < 0.35) { const u = t / 0.35; off = -reach * 0.4 * u; sq = 0.1 * u; }
      else if (t < 0.55) { const u = (t - 0.35) / 0.2; off = -reach * 0.4 + reach * 1.4 * u; sq = 0.1 - 0.22 * u; }
      else { const u = (t - 0.55) / 0.45, ease = 1 - u * u * (3 - 2 * u); off = reach * ease; sq = -0.12 * ease; }
      const dx = Math.cos(e.atkAng) * off, dy = Math.sin(e.atkAng) * off * 0.6, fx = e.face < 0 ? -1 : 1;
      g.save(); g.translate(this.rd(x + dx), this.rd(y + dy)); g.rotate(fx * off * 0.018); g.scale(1 + sq, 1 - sq);
      if (e.face < 0) g.drawImage(G.flip(img), -(s.w - s.ox) * k, -s.oy * k, w, h); else g.drawImage(img, -s.ox * k, -s.oy * k, w, h);
      g.restore();
    } else if (e.face < 0) g.drawImage(G.flip(img), this.rd(x - (s.w - s.ox) * k), this.rd(y - s.oy * k), w, h);
    else g.drawImage(img, this.rd(x - s.ox * k), this.rd(y - s.oy * k), w, h);
    g.globalAlpha = 1;
    const top = y - s.oy * k;
    // status markers
    const S = e.st;
    if (S.burn > 0) { // on fire: flames licking up the body, and they light the floor around it
      if (Math.random() < 0.3) this.parts.push({ x: e.x + U.rand(-e.r, e.r) * 0.6, y: e.y - e.r * 0.5, vx: 0, vy: -24, life: 0.35, max: 0.35, c: U.pick(['#ff8a20', '#ffd040']), s: 1 });
      const n = Math.min(3, 1 + (S.burn > 4) + (S.burn > 10)), fh = Math.min(h * 0.55, 4 + S.burn * 0.5), t0 = this.time * 11 + e.x;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const img = flameFrame(Math.floor(t0 * 0.9 + i * 3)), hh = fh * (0.75 + 0.25 * Math.sin(t0 * 1.3 + i)), fw = hh * 0.42;
        g.drawImage(img, x + (i - (n - 1) / 2) * w * 0.22 - fw / 2, y - h * 0.12 * (i % 2) - hh, fw, hh);
      }
      g.globalCompositeOperation = 'source-over';
      if ((this._stL = (this._stL || 0) + 1) < 28) lights.push({ x: e.x, y: e.y - h * 0.3, r: 18 + Math.min(16, S.burn * 1.5), kind: 'fire' });
    }
    if (S.spark > 0 && Math.random() < 0.18) { // charged with Spark: it crackles
      const rng = Math.random, ax = x + (rng() - 0.5) * w * 0.8, ay = y - h * (0.2 + rng() * 0.5);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(200,235,255,0.95)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(ax, ay);
      for (let i = 0; i < 3; i++) g.lineTo(ax + (rng() - 0.5) * 8, ay + (rng() - 0.5) * 8); g.stroke(); g.restore();
      if ((this._stL = (this._stL || 0) + 1) < 28) lights.push({ x: e.x, y: e.y - h * 0.4, r: 22, kind: 'bolt' });
    }
    if (S.fragile || S.affl || S.spark) {
      let ix = x - 6;
      const pip = (col, n) => { g.fillStyle = col; g.fillRect(this.rd(ix), this.rd(top - 3), 2.2, 2.2); if (n > 1) { g.fillStyle = '#fff'; } ix += 3; };
      if (S.fragile) pip('#ffe070', S.fragile); if (S.affl) pip('#c040ff', S.affl); if (S.spark) pip('#8ae0ff', S.spark);
    }
    if (e.stun > 0) { // stunned: little stars circling the head
      const t = this.time * 8;
      for (let i = 0; i < 3; i++) { const an = t + i * 2.1; g.fillStyle = i % 2 ? '#fff6a0' : '#ffffff'; g.fillRect(this.rd(x + Math.cos(an) * 5), this.rd(top - 2 + Math.sin(an) * 1.6), 1.5, 1.5); }
    }
    if ((e.elite || e.champion || e.boss) && e.hp < e.maxHp) {
      const bw = Math.max(16, w * 0.7), bx = this.rd(x - bw / 2), by = this.rd(top - 6);
      g.fillStyle = '#1a0a0a'; g.fillRect(bx - 1, by - 1, bw + 2, 4);
      g.fillStyle = e.boss ? '#e02838' : e.champion ? '#ff4060' : '#f0b030'; g.fillRect(bx, by, Math.max(0, bw * e.hp / e.maxHp), 2);
    }
    if ((e.elite || e.champion || e.boss) && Math.random() < 0.25) { // swirling aura motes
      const an = this.time * 3 + Math.random() * TAU, rr = e.r * (e.boss ? 1.6 : 1.3);
      this.gpart({ x: e.x + Math.cos(an) * rr, y: e.y + Math.sin(an) * rr * 0.5, vx: -Math.sin(an) * 20, vy: -18, drag: 0.96, life: 0.7, max: 0.7, c: e.boss ? '#ff3040' : e.champion ? '#ff5070' : '#ffc850', r: 0.9 });
    }
    if (e.boss) lights.push({ x: e.x, y: e.y, r: 70, kind: 'boss' });
    else if (e.elite || e.champion) lights.push({ x: e.x, y: e.y, r: 34, kind: 'elite' });
  };
  R.drawAlly = function (g, al, cx, cy, lights) {
    const x = al.x - cx, y = al.y - cy;
    if (al.kind === 'spirit') {
      g.drawImage(A.glow('rgba(200,120,255,0.8)'), x - 8, y - 8, 16, 16);
      G.P.circle(g, x, y, 2.4, '#f0d8ff'); G.P.circle(g, x + 0.6, y - 0.4, 0.7, '#6a2a9a');
      lights.push({ x: al.x, y: al.y, r: 18, kind: 'magic' });
      return;
    }
    if (al.kind === 'plant') {
      const grow = Math.min(1, al.t / 0.35), fade = Math.min(1, al.life / 0.3), sw = al.type === 'pod' && al.arm != null ? 1 + (0.45 - Math.max(0, al.arm)) * 0.6 : 1;
      if (al.type === 'snare') { g.strokeStyle = 'rgba(120,160,60,' + 0.35 * grow * fade + ')'; g.setLineDash([2, 3]); g.beginPath(); g.ellipse(x, y, 26 * al.a.s.area * grow, 26 * al.a.s.area * 0.6 * grow, 0, 0, TAU); g.stroke(); g.setLineDash([]); }
      this.sprite(g, 'plant_' + al.type, null, al.bite > 0 ? 1 : 0, x, y, al.face < 0, grow * sw, al.type === 'pod' && al.arm != null && Math.floor(al.arm * 20) % 2 === 0, fade);
      lights.push({ x: al.x, y: al.y - 4, r: 16, kind: 'tint', color: al.type === 'pod' ? '#b070ff' : '#9adf50', a: 0.2 * fade });
      return;
    }
    const name = al.kind === 'wolf' ? 'wolf' : al.kind === 'golem' ? 'golem' : al.kind === 'phantom' ? 'hknight' : 'imp';
    const variant = al.kind === 'golem' ? 'bone' : al.kind === 'phantom' ? 'ice' : null;
    const sc = al.kind === 'golem' ? 0.75 : 1, fr = al.moving ? Math.floor(al.t * 6) % 2 : 0;
    this.sprite(g, name, variant, fr, x, y, al.face < 0, sc, false, al.kind === 'phantom' ? 0.7 : 1);
    lights.push({ x: al.x, y: al.y, r: 20, kind: 'small' });
  };
  const WALK = [1, 0, 5, 0];
  R.drawPlayer = function (g, cx, cy) {
    const p = this.player;
    let fr = p.moving ? WALK[Math.floor(p.anim / 1.6) % 4] : 0; // stride, pass, the other stride, pass
    if (p.atkT > 0) { const t = 1 - p.atkT / p.atkMax; fr = t < 0.34 ? 2 : t < 0.62 ? 3 : 4; } // attack: wind-up, strike, follow-through
    const blink = p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0;
    const bob = p.moving ? -Math.abs(Math.sin(p.anim * 1.9)) : 0;
    this.sprite(g, this.hero.painter || this.heroId, null, fr, p.x - cx, p.y - cy + bob, p.face < 0, 1, blink, this.buffs && this.buffs.wraith > 0 ? 0.55 : 1);
  };
  R.drawProj = function (g, b, cx, cy, lights, now) {
    const x = b.x - cx, y = b.y - cy;
    this.projTrail(b);
    switch (b.k) {
      case 'fireball':
        g.drawImage(A.glow('rgba(255,120,30,0.8)'), x - 10, y - 10, 20, 20);
        G.P.circle(g, x, y, 3.2, '#ffd35a'); G.P.circle(g, x + 0.5, y - 0.5, 1.6, '#fff6c0');
        if (Math.random() < 0.7) this.parts.push({ x: b.x, y: b.y, vx: U.rand(-10, 10), vy: U.rand(-10, 10), life: 0.35, max: 0.35, c: U.pick(['#ff6a1a', '#ffd35a', '#7c1624']), s: 1 });
        lights.push({ x: b.x, y: b.y, r: 34, kind: 'fire' }); break;
      case 'flame': case 'wave': {
        const k = 1 - b.life / (b.max || 1), rr = b.r;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(A.glow(b.k === 'wave' ? 'rgba(255,110,30,0.75)' : 'rgba(255,140,40,0.7)'), x - rr * 1.6, y - rr * 1.6, rr * 3.2, rr * 3.2);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = 1 - k * 0.7; G.P.circle(g, x, y, rr * 0.45, k < 0.5 ? '#fff0a0' : '#ff7a20'); g.globalAlpha = 1;
        lights.push({ x: b.x, y: b.y, r: rr * 3, kind: 'fire' }); break;
      }
      case 'orb':
        g.drawImage(A.glow('rgba(120,220,255,0.7)'), x - b.r * 2, y - b.r * 2, b.r * 4, b.r * 4);
        G.P.circle(g, x, y, b.r * 0.55, G.P.vol(g, x, y, b.r * 0.55, '#a8f0ff'));
        lights.push({ x: b.x, y: b.y, r: 26, kind: 'magic' }); break;
      case 'sphere':
        g.drawImage(A.glow('rgba(255,245,150,0.8)'), x - 12, y - 12, 24, 24);
        G.P.circle(g, x, y, 3.6, G.P.vol(g, x, y, 3.6, '#fff6a0'));
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 0.5; g.beginPath(); for (let i = 0; i < 4; i++) { const a = now * 9 + i * 1.6; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } g.stroke();
        lights.push({ x: b.x, y: b.y, r: 40, kind: 'bolt' }); break;
      case 'wall': { // spectral warrior of the Wall of the Dead
        const al = Math.min(1, b.life / 0.3, (1.6 - b.life) / 0.15);
        g.drawImage(A.glow('rgba(170,150,255,0.5)'), x - 14, y - 14, 28, 28);
        this.sprite(g, 'hknight', 'ice', Math.floor(now * 10) % 2, x, y, Math.cos(b.ang) < 0, 1, false, 0.75 * al);
        if (Math.random() < 0.4) this.parts.push({ x: b.x - Math.cos(b.ang) * 6, y: b.y + U.rand(-4, 4), vx: 0, vy: -8, life: 0.4, max: 0.4, c: '#b8a8ff', s: 1 });
        lights.push({ x: b.x, y: b.y, r: 22, kind: 'magic' }); break;
      }
      case 'bullet': { // a lead ball with a hot tracer
        const tx = Math.cos(b.ang), ty = Math.sin(b.ang);
        g.strokeStyle = 'rgba(255,200,120,0.35)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - tx * 16, y - ty * 16); g.lineTo(x, y); g.stroke();
        g.strokeStyle = 'rgba(255,245,210,0.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - tx * 9, y - ty * 9); g.lineTo(x, y); g.stroke(); g.lineWidth = 1;
        G.P.circle(g, x, y, 1.3, '#3a3a40'); G.P.circle(g, x - 0.3, y - 0.3, 0.5, '#e8e8f0');
        lights.push({ x: b.x, y: b.y, r: 14, kind: 'tint', color: '#ffd8a0', a: 0.35 }); break;
      }
      case 'grenade': case 'brewflask': {
        const hgt = Math.sin(Math.min(1, b.ft / b.fd) * Math.PI) * (b.k === 'grenade' ? 40 : 30);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + hgt, 3, 1.2, 0, 0, TAU); g.fill();
        const name = b.k === 'grenade' ? 'grenade_p' : 'flask_' + (b.el || 'bomb') + '_p';
        this.sprite(g, name, null, 0, x, y, false, 1, false, 1, b.ang);
        if (b.k === 'grenade') { if (Math.random() < 0.8) this.parts.push({ x: b.x + U.rand(-1, 1), y: b.y - 3, vx: U.rand(-8, 8), vy: U.rand(-20, -5), life: 0.25, max: 0.25, c: U.pick(['#ffd35a', '#ff8a30', '#fff0a0']), s: 1 }); lights.push({ x: b.x, y: b.y, r: 14, kind: 'fire' }); }
        else lights.push({ x: b.x, y: b.y, r: 18, kind: 'tint', color: C.BREW[b.el || 'bomb'].col, a: 0.45 });
        break;
      }
      case 'spit':
        g.drawImage(A.glow('rgba(170,110,255,0.7)'), x - 6, y - 6, 12, 12);
        G.P.circle(g, x, y, 1.8, G.P.vol(g, x, y, 1.8, '#c890ff')); G.P.circle(g, x - 0.5, y - 0.5, 0.5, '#f0e0ff');
        lights.push({ x: b.x, y: b.y, r: 14, kind: 'magic' }); break;
      case 'hex':
        g.drawImage(A.glow('rgba(190,80,255,0.8)'), x - 7, y - 7, 14, 14);
        g.strokeStyle = '#f0c0ff'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - Math.cos(b.ang) * 6, y - Math.sin(b.ang) * 6); g.lineTo(x + Math.cos(b.ang) * 3, y + Math.sin(b.ang) * 3); g.stroke();
        lights.push({ x: b.x, y: b.y, r: 16, kind: 'magic' }); break;
      default: {
        const name = { arrow: 'arrow_p', dart: 'dagger_p', axe: 'axe_p', flask: 'flask_p', chakram: 'chakram_p', fist: 'fist_p' }[b.k];
        if (!name) break;
        this.sprite(g, name, null, 0, x, y, false, b.k === 'axe' || b.k === 'chakram' ? Math.max(1, b.r / 6) : 1, false, 1, b.ang || 0.0001);
        const ec = b.a && b.a.tags && b.a.tags.some((t) => t === 'fire' || t === 'ice' || t === 'lightning' || t === 'magic') ? this.elemColor(b.a.tags) : b.k === 'flask' ? '#8ae060' : null;
        if (ec) lights.push({ x: b.x, y: b.y, r: 20, kind: 'tint', color: ec, a: 0.45 }); else if (b.k !== 'axe') lights.push({ x: b.x, y: b.y, r: 10, kind: 'small' });
      }
    }
  };
  R.drawHazard = function (g, h, cx, cy, now) {
    const x = h.x - cx, y = h.y - cy, P = G.P;
    const k = h.fired ? 1 : U.clamp(h.t / h.delay, 0, 1);
    const col = h.color || '#ff3030';
    g.save();
    if (!h.fired) {
      g.globalAlpha = 0.18 + 0.25 * k; g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 1;
      this.hazardPath(g, h, x, y); g.fill();
      g.globalAlpha = 0.9; this.hazardPath(g, h, x, y, k); g.fill();
      g.globalAlpha = 0.8; this.hazardPath(g, h, x, y); g.stroke();
    } else if (h.dur) {
      if (h.hands) {
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * TAU + h.x, hx = x + Math.cos(a) * h.r * 0.5, hy = y + Math.sin(a) * h.r * 0.35, up = Math.sin(now * 5 + i) * 1.5;
          P.ell(g, hx, hy + 2, 3, 1.2, 'rgba(0,0,0,0.4)');
          P.rrect(g, hx - 1.4, hy - 8 + up, 2.8, 9, 1.2, P.lg(g, hx, hy - 8, hx, hy, ['#6a1020', '#2a0408']));
          for (let f = 0; f < 3; f++) P.line(g, hx - 1 + f, hy - 8 + up, hx - 1.6 + f * 1.4, hy - 10.5 + up, 0.6, '#8a1a2a');
        }
        g.globalAlpha = 0.25; g.fillStyle = col; this.hazardPath(g, h, x, y); g.fill();
      } else { g.globalAlpha = 0.35 + Math.sin(now * 8) * 0.08; g.fillStyle = col; this.hazardPath(g, h, x, y); g.fill(); }
    }
    g.restore();
  };
  /** Points along a hazard's shape (for its light). */
  function hazardPts(h) {
    if (h.kind === 'circle') return [[h.x, h.y, h.r * 1.3]];
    const out = [], n = 3;
    if (h.kind === 'line') for (let i = 0; i < n; i++) { const d = (i + 0.5) / n * h.len; out.push([h.x + Math.cos(h.ang) * d, h.y + Math.sin(h.ang) * d, Math.max(h.w * 2, h.len / n * 0.8)]); }
    else for (let i = 0; i < n; i++) { const d = (i + 1) / (n + 0.5) * h.len; out.push([h.x + Math.cos(h.ang) * d, h.y + Math.sin(h.ang) * d, d * Math.sin(h.arc / 2) * 1.4 + 10]); }
    return out;
  }
  const FIREY = (c) => { if (!c || c[0] !== '#') return false; const v = G.rgb(c); return v[0] > 200 && v[1] < 150 && v[2] < 90; };
  /** A telegraph lights the floor faintly and brighter as it charges; a burning or lingering hazard glows in its colour. */
  R.hazardLight = function (h, lights) {
    const col = h.color || '#ff3030', k = h.fired ? 1 : U.clamp(h.t / h.delay, 0, 1);
    if (h.fired && !h.dur) return;
    const fire = FIREY(col), a = h.fired ? 0.3 : 0.08 + 0.2 * k;
    for (const [x, y, r] of hazardPts(h)) lights.push(fire && h.fired ? { x, y, r: r * 1.2, kind: 'fire' } : { x, y, r, kind: 'tint', color: col, a });
  };
  R.hazardPath = function (g, h, x, y, k) {
    const f = k == null ? 1 : k;
    g.beginPath();
    if (h.kind === 'circle') g.ellipse(x, y, h.r * f, h.r * 0.8 * f, 0, 0, TAU);
    else if (h.kind === 'line') { g.save(); g.translate(x, y); g.rotate(h.ang); g.rect(0, -h.w / 2 * f, h.len, h.w * f); g.restore(); }
    else if (h.kind === 'cone') { g.moveTo(x, y); g.arc(x, y, h.len * f, h.ang - h.arc / 2, h.ang + h.arc / 2); g.closePath(); }
  };

  /** An offscreen layer matching the view (for fading the hero's effects). */
  R.fxLayer = function (g) {
    const c = g.canvas; let L = this._fxL;
    if (!L || L.canvas.width !== c.width || L.canvas.height !== c.height) { const cv = document.createElement('canvas'); cv.width = c.width; cv.height = c.height; L = this._fxL = cv.getContext('2d'); L.imageSmoothingEnabled = false; }
    L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, c.width, c.height); L.setTransform(g.getTransform());
    return L;
  };
  R.drawFx = function (g, f, cx, cy, lights) {
    const k = 1 - f.life / f.max, p = this.player, P = G.P;
    const x = (f.follow ? p.x : f.x) - cx, y = (f.follow ? p.y : f.y) - cy;
    switch (f.k) {
      case 'slash': {
        const a0 = f.ang - f.arc / 2, sweep = f.arc * Math.min(1, k * 2.2);
        const s0 = f.flip ? f.ang + f.arc / 2 - sweep : a0, s1 = f.flip ? f.ang + f.arc / 2 : a0 + sweep;
        g.globalAlpha = 1 - k * 0.8;
        g.strokeStyle = f.color || '#ffffff'; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, f.R * 0.88, s0, s1); g.stroke();
        g.strokeStyle = 'rgba(200,220,255,0.55)'; g.lineWidth = 5; g.beginPath(); g.arc(x, y, f.R * 0.7, s0, s1); g.stroke();
        g.strokeStyle = 'rgba(160,180,255,0.22)'; g.lineWidth = 10; g.beginPath(); g.arc(x, y, f.R * 0.5, s0, s1); g.stroke();
        g.globalAlpha = 1; g.lineWidth = 1;
        const sx = x + cx + Math.cos(f.ang) * f.R * 0.6, sy = y + cy + Math.sin(f.ang) * f.R * 0.6;
        lights.push(f.color && f.color !== '#ffffff' ? { x: sx, y: sy, r: 36 * (1 - k * 0.6), kind: 'tint', color: f.color, a: 0.45 } : { x: sx, y: sy, r: 30, kind: 'small' });
        break;
      }
      case 'bash': {
        const d = 6 + Math.sin(Math.min(1, k * 1.5) * Math.PI) * f.R * 0.5;
        this.sprite(g, 'shield_p', null, 0, x + Math.cos(f.ang) * d, y + Math.sin(f.ang) * d, false, 1.2, false, 1 - k * 0.5);
        g.globalAlpha = (1 - k) * 0.6; g.strokeStyle = '#ffe8b0'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, f.R * (0.6 + k * 0.4), f.ang - 1.1, f.ang + 1.1); g.stroke(); g.globalAlpha = 1;
        break;
      }
      case 'smite': {
        const drop = Math.max(0, 1 - k / 0.4);
        if (drop > 0) this.sprite(g, 'hammer_p', null, 0, x, y - drop * 40, false, 1.6);
        g.globalAlpha = 1 - k; g.strokeStyle = '#fff0a0'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y, f.R * Math.min(1, k * 2.5), f.R * 0.7 * Math.min(1, k * 2.5), 0, 0, TAU); g.stroke();
        g.drawImage(A.glow('rgba(255,240,160,1)'), x - f.R, y - f.R, f.R * 2, f.R * 2); g.globalAlpha = 1;
        lights.push({ x: f.x, y: f.y, r: f.R * 2 * (1 - k), kind: 'holy' });
        break;
      }
      case 'pillar': { // level-up: a column of light
        const a = Math.sin(Math.min(1, k * 1.2) * Math.PI), wdt = 10 * (1 - k * 0.5);
        g.save(); g.globalCompositeOperation = 'lighter';
        const grd = g.createLinearGradient(0, y - 90, 0, y);
        grd.addColorStop(0, 'rgba(255,230,150,0)'); grd.addColorStop(1, 'rgba(255,230,150,' + 0.55 * a + ')');
        g.fillStyle = grd; g.fillRect(x - wdt, y - 90, wdt * 2, 90);
        g.fillStyle = 'rgba(255,250,220,' + 0.7 * a + ')'; g.fillRect(x - wdt * 0.3, y - 90, wdt * 0.6, 90);
        g.strokeStyle = 'rgba(255,220,120,' + a + ')'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y + 6, 8 + k * 14, (8 + k * 14) * 0.4, 0, 0, TAU); g.stroke();
        g.restore();
        lights.push({ x: f.x, y: f.y - 10, r: 70 * a + 10, kind: 'holy' });
        break;
      }
      case 'runecircle': { // ground sigil under big spells
        const a = 1 - k, Rr = f.R * (0.7 + k * 0.3), rot = f.rot + k * 2;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
        g.strokeStyle = f.color; g.lineWidth = 1;
        g.beginPath(); g.ellipse(x, y, Rr, Rr * 0.5, 0, 0, TAU); g.stroke();
        g.beginPath(); g.ellipse(x, y, Rr * 0.72, Rr * 0.36, 0, 0, TAU); g.stroke();
        g.beginPath(); for (let i = 0; i <= 5; i++) { const an = rot + i * 4 * Math.PI / 5, px = x + Math.cos(an) * Rr * 0.72, py = y + Math.sin(an) * Rr * 0.36; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke();
        g.fillStyle = f.color; for (let i = 0; i < 10; i++) { const an = rot + i / 10 * TAU; g.fillRect(this.rd(x + Math.cos(an) * Rr * 0.86), this.rd(y + Math.sin(an) * Rr * 0.43), 1, 1); }
        g.restore();
        lights.push({ x: f.x, y: f.y, r: f.R * 1.2 * a, kind: 'magic' });
        break;
      }
      case 'pulse': case 'pop': case 'slam': {
        const Rr = f.R * (0.3 + k * 0.8);
        g.globalAlpha = 1 - k; g.strokeStyle = f.color || '#fff'; g.lineWidth = f.k === 'pop' ? 1.5 : 3;
        g.beginPath(); g.ellipse(x, y, Rr, Rr * 0.75, 0, 0, TAU); g.stroke();
        g.drawImage(A.glow(G.rgba(f.color || '#ffffff', 0.5)), x - Rr, y - Rr, Rr * 2, Rr * 2);
        g.globalAlpha = 1; g.lineWidth = 1;
        lights.push({ x: x + cx, y: y + cy, r: Rr * (f.k === 'pop' ? 1.1 : 1.4) * (1 - k * 0.5), kind: 'tint', color: f.color || '#ffffff', a: f.k === 'pop' ? 0.3 : 0.45 });
        break;
      }
      case 'muzzle': { // the arquebus' flash and a puff of powder smoke
        const tx = Math.cos(f.ang), ty = Math.sin(f.ang), L = 10 * (1 - k * 0.5);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k;
        g.drawImage(A.glow('rgba(255,190,90,0.9)'), x - 9, y - 9, 18, 18);
        g.fillStyle = '#fff4c0'; g.beginPath(); g.moveTo(x - ty * 2, y + tx * 2); g.lineTo(x + tx * L, y + ty * L); g.lineTo(x + ty * 2, y - tx * 2); g.fill();
        g.restore();
        lights.push({ x: f.x, y: f.y, r: 50 * (1 - k), kind: 'fire' });
        if (!f.flashed) { f.flashed = true; this.flashLight(0.05, 'rgba(255,190,110,'); }
        break;
      }
      case 'explosion': {
        const Rr = f.R * (0.4 + k * 0.8);
        g.globalAlpha = 1 - k; g.drawImage(A.glow('rgba(255,140,40,1)'), x - Rr * 1.4, y - Rr * 1.4, Rr * 2.8, Rr * 2.8); g.globalAlpha = 1;
        g.fillStyle = 'rgba(255,240,180,' + (1 - k) * 0.9 + ')'; g.beginPath(); g.arc(x, y, Rr * (1 - k) * 0.6, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,180,80,' + (1 - k) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, Rr, 0, TAU); g.stroke(); g.lineWidth = 1;
        lights.push({ x: f.x, y: f.y, r: f.R * 2.5 * (1 - k), kind: 'fire' });
        if (!f.flashed) { f.flashed = true; this.flashLight(Math.min(0.2, f.R / 200), 'rgba(255,170,90,'); }
        break;
      }
      case 'meteor': {
        g.globalAlpha = 0.3 + k * 0.4; g.strokeStyle = '#ff8a2a'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, f.R, f.R * 0.75, 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(255,120,40,0.25)'; g.beginPath(); g.ellipse(x, y, f.R * k, f.R * 0.75 * k, 0, 0, TAU); g.fill(); g.globalAlpha = 1;
        const mx = x + (1 - k) * 60, my = y - (1 - k) * 120;
        g.drawImage(A.glow('rgba(255,140,40,0.9)'), mx - 10, my - 10, 20, 20); P.circle(g, mx, my, 3.4, P.vol(g, mx, my, 3.4, '#8a4a2a'));
        g.strokeStyle = 'rgba(255,180,80,0.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + 14, my - 26); g.stroke(); g.lineWidth = 1;
        lights.push({ x: mx + cx, y: my + cy, r: 30, kind: 'fire' });
        break;
      }
      case 'hail': {
        const hy = y - (1 - k) * 60;
        g.globalAlpha = 0.5; g.strokeStyle = '#bfefff'; g.beginPath(); g.ellipse(x, y, f.R, f.R * 0.75, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
        P.circle(g, x, hy, 2.2, P.vol(g, x, hy, 2.2, '#e8f8ff'));
        lights.push({ x: f.x, y: f.y - (1 - k) * 60, r: 12 + k * 10, kind: 'frost' });
        break;
      }
      case 'spike': {
        const hgt = Math.sin(Math.min(1, k * 2) * Math.PI / 2) * 12 * (1 - Math.max(0, k - 0.6) * 2.5);
        for (let i = 0; i < 3; i++) { const sx = x + (i - 1) * f.R * 0.45; P.path(g, [sx - 2.2, y + 2, sx + (i - 1) * 1.2, y - hgt - (i === 1 ? 4 : 0), sx + 2.2, y + 2]); P.fill(g, P.lg(g, sx - 2, 0, sx + 2, 0, ['#ffffff', '#9fe0ff', '#4a90c8'])); }
        lights.push({ x: f.x, y: f.y, r: 22, kind: 'frost' });
        break;
      }
      case 'bolt': case 'spark': {
        if (!f.flashed) { f.flashed = true; this.flashLight(f.k === 'bolt' ? 0.55 : 0.18); }
        const rng = U.seeded(f.seed | 0);
        g.globalAlpha = 1 - k; g.strokeStyle = '#ffffff'; g.lineWidth = f.k === 'spark' ? 1 : 2;
        if (f.k === 'bolt') { g.beginPath(); let px = x + (rng() - 0.5) * 20, py = y - 160; g.moveTo(px, py); while (py < y) { py += 10 + rng() * 10; px += (rng() - 0.5) * 14; if (py > y) { py = y; px = x; } g.lineTo(px, py); } g.stroke(); g.strokeStyle = 'rgba(120,200,255,0.6)'; g.lineWidth = 5; g.stroke(); }
        else { g.beginPath(); for (let i = 0; i < 6; i++) { const a = rng() * TAU, l = 10 + rng() * 16; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l * 0.5 + (rng() - 0.5) * 6, y + Math.sin(a) * l * 0.5); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); } g.stroke(); }
        g.globalAlpha = 1; g.lineWidth = 1;
        g.drawImage(A.glow('rgba(160,220,255,0.9)'), x - 16, y - 10, 32, 20);
        lights.push({ x: f.x, y: f.y, r: 80 * (1 - k), kind: 'bolt' });
        break;
      }
      case 'chain': {
        if (!f.flashed) { f.flashed = true; this.flashLight(0.12 + 0.03 * f.pts.length); }
        const rng = U.seeded(f.seed | 0);
        g.globalAlpha = 1 - k; g.strokeStyle = f.color || '#ffffff'; g.lineWidth = 1.2;
        g.beginPath();
        for (let i = 0; i < f.pts.length - 1; i++) {
          const [x1, y1] = f.pts[i], [x2, y2] = f.pts[i + 1];
          g.moveTo(x1 - cx, y1 - cy);
          for (let s = 1; s <= 4; s++) { const t2 = s / 4; g.lineTo(U.lerp(x1, x2, t2) - cx + (s < 4 ? (rng() - 0.5) * 8 : 0), U.lerp(y1, y2, t2) - cy + (s < 4 ? (rng() - 0.5) * 8 : 0)); }
        }
        g.stroke(); g.strokeStyle = 'rgba(140,200,255,0.4)'; g.lineWidth = 4; g.stroke();
        g.globalAlpha = 1; g.lineWidth = 1;
        f.pts.forEach(([px, py]) => lights.push({ x: px, y: py, r: 24, kind: 'bolt' }));
        break;
      }
      case 'nova': {
        const Rr = f.cur || 0;
        g.strokeStyle = 'rgba(180,240,255,' + (1 - k) + ')'; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, Rr, Rr * 0.75, 0, 0, TAU); g.stroke();
        g.strokeStyle = 'rgba(120,200,255,' + (1 - k) * 0.4 + ')'; g.lineWidth = 8; g.stroke(); g.lineWidth = 1;
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k; g.fillStyle = '#ffffff'; g.fillRect(x + Math.cos(a) * Rr - 1, y + Math.sin(a) * Rr * 0.75 - 1, 2, 2); }
        lights.push({ x: f.x, y: f.y, r: Rr * 1.2, kind: 'frost' });
        break;
      }
      case 'frostburst': {
        const Rr = f.R * (0.3 + k * 0.7);
        g.globalAlpha = 1 - k;
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const sx = x + Math.cos(a) * Rr, sy = y + Math.sin(a) * Rr * 0.75; P.path(g, [x + Math.cos(a - 0.12) * Rr * 0.3, y + Math.sin(a - 0.12) * Rr * 0.22, sx, sy, x + Math.cos(a + 0.12) * Rr * 0.3, y + Math.sin(a + 0.12) * Rr * 0.22]); P.fill(g, '#dff6ff'); }
        g.drawImage(A.glow('rgba(160,230,255,0.7)'), x - Rr, y - Rr, Rr * 2, Rr * 2);
        g.globalAlpha = 1;
        lights.push({ x: f.x, y: f.y, r: f.R * 1.5 * (1 - k), kind: 'frost' });
        break;
      }
      case 'affl': {
        g.globalAlpha = 1 - k; g.strokeStyle = '#d060ff'; g.lineWidth = 1;
        f.to.forEach(([tx, ty]) => { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + tx - cx) / 2, (y + ty - cy) / 2 - 12, U.lerp(x, tx - cx, k), U.lerp(y, ty - cy, k)); g.stroke(); lights.push({ x: U.lerp(f.x, tx, k), y: U.lerp(f.y, ty, k), r: 16, kind: 'magic' }); });
        g.globalAlpha = 1;
        break;
      }
      case 'tipover': { // a struck brazier topples, spilling its fire
        const e2 = Math.min(1, k * 2.2), rot = f.dir * (e2 * e2) * 1.5;
        this.sprite(g, 'brazier', null, Math.floor(this.time * 10) % 2, x + f.dir * e2 * 4, y, false, 1, false, Math.max(0, 1 - Math.max(0, k - 0.55) * 2.2), rot);
        lights.push({ x: f.x, y: f.y - 8, r: 50 * (1 - k * 0.5), kind: 'fire' });
        break;
      }
      case 'hzfire': {
        const h = f.h; if (h.dur) break;
        g.save(); g.globalAlpha = (1 - k) * 0.8; g.fillStyle = h.color || '#ff3030'; this.hazardPath(g, h, h.x - cx, h.y - cy); g.fill(); g.restore();
        for (const [px, py, r] of hazardPts(h)) lights.push(FIREY(h.color || '#ff3030') ? { x: px, y: py, r: r * 1.4 * (1 - k), kind: 'fire', cast: 0.8 * (1 - k) } : { x: px, y: py, r: r * 1.3 * (1 - k), kind: 'tint', color: h.color, a: 0.45 });
        break;
      }
      case 'ring': {
        const Rr = U.lerp(f.r0, f.r1, k);
        g.strokeStyle = f.color; g.globalAlpha = 1 - k; g.lineWidth = 4; g.beginPath(); g.arc(x, y, Rr, 0, TAU); g.stroke(); g.globalAlpha = 1; g.lineWidth = 1;
        lights.push({ x: f.x, y: f.y, r: Rr * 1.2, kind: 'tint', color: f.color || '#ffffff', a: 0.35 * (1 - k) });
        break;
      }
      default: break;
    }
  };

  /** 0..1, a slow breath with its own phase for each light (so neighbours do not pulse in step). */
  const pulse = (l, t) => 0.5 + 0.5 * Math.sin(t * 1.7 + l.x * 0.13 + l.y * 0.07);
  R.renderLighting = function (g, lights, cx, cy, W, H) {
    const V = DH.view, d = V.dctx, T = this.stage.theme, now = this.time;
    d.globalCompositeOperation = 'source-over'; d.clearRect(0, 0, W, H);
    const fl = Math.min(1, this.lightFlash || 0); // a lightning strike lights the whole hall for an instant
    d.fillStyle = 'rgba(' + T.dark[0] + ',' + T.dark[1] + ',' + T.dark[2] + ',' + Math.min(0.97, T.darkness + 0.07 + (this.fx_.darkness ? 0.08 : 0)) * (1 - 0.8 * fl) + ')'; d.fillRect(0, 0, W, H);
    d.globalCompositeOperation = 'destination-out';
    const L = A.lightSprite, p = this.player; let pr = 118 + Math.sin(now * 2) * 3 + Math.sin(now * 13.7) * 1.5 + Math.random() * 2.5 - (Math.sin(now * 0.9) > 0.97 ? 8 : 0);
    if (this.fx_.darkness) pr *= 0.62; // Living Shadow: a black fog closes in
    d.globalAlpha = 1; d.drawImage(L, p.x - cx - pr, p.y - cy - pr, pr * 2, pr * 2);
    for (const l of lights) {
      let r = l.r; if (l.kind === 'brazier' || l.kind === 'candle' || l.kind === 'torch' || l.kind === 'fire') r *= 0.9 + Math.sin(now * 9 + l.x) * 0.05 + Math.random() * 0.05; // fire flickers
      else if (l.kind === 'crystal') r *= 0.78 + 0.3 * pulse(l, now); // crystals and runes breathe slowly
      else if (l.kind === 'lava') r *= 0.85 + 0.2 * pulse(l, now * 0.6);
      const x = l.x - cx, y = l.y - cy; if (x + r < 0 || y + r < 0 || x - r > W || y - r > H) continue;
      d.globalAlpha = l.kind === 'small' || l.kind === 'gem' ? 0.55 : l.kind === 'tint' ? Math.min(0.95, (l.a || 0.35) * 2.4) : 0.95; d.drawImage(L, x - r, y - r, r * 2, r * 2);
    }
    d.globalAlpha = 1;
    g.save(); g.imageSmoothingEnabled = true; g.drawImage(V.dark, 0, 0, W, H); g.restore();
    g.imageSmoothingEnabled = false;
    g.globalCompositeOperation = 'lighter';
    const tint = T.lightTint;
    for (const l of lights) {
      const x = l.x - cx, y = l.y - cy; if (x < -80 || y < -80 || x > W + 80 || y > H + 80) continue;
      if (l.kind === 'brazier') {
        const r = 34 + Math.sin(now * 11 + l.x) * 3;
        g.drawImage(A.glow(tint + '0.35)'), x - r, y - r, r * 2, r * 2);
        for (let i = 0; i < 3; i++) {
          const fx = x + Math.sin(now * 13 + i * 2 + l.x) * 1.5, fy = y - 1 - i * 2 - Math.random() * 2;
          G.P.ell(g, fx, fy, 2.4 - i * 0.6, 3 - i * 0.6, i === 0 ? 'rgba(255,106,26,0.9)' : i === 1 ? 'rgba(255,176,48,0.9)' : 'rgba(255,240,160,0.9)');
        }
        if (Math.random() < 0.08) this.parts.push({ x: l.x + U.rand(-2, 2), y: l.y - 4, vx: U.rand(-5, 5), vy: -25, life: 0.8, max: 0.8, c: '#ffb030', s: 1 });
      } else if (l.kind === 'candle') {
        g.drawImage(A.glow(tint + '0.25)'), x - 10, y - 10, 20, 20);
        G.P.ell(g, x, y + 1, 0.8, 1.4, 'rgba(255,220,120,0.95)');
      } else if (l.kind === 'torch') { // a steady fire source: a warm, flickering pool of light
        const r = l.r * (0.62 + Math.sin(now * 10 + l.x) * 0.04);
        g.drawImage(A.glow('rgba(255,120,40,0.32)'), x - r, y - r, r * 2, r * 2);
        if (Math.random() < 0.05) this.parts.push({ x: l.x + U.rand(-3, 3), y: l.y - 2, vx: U.rand(-6, 6), vy: -30, life: 0.7, max: 0.7, c: '#ffb030', s: 1 });
      } else if (l.kind === 'tint' && l.color) { const r = l.r * 0.7; g.drawImage(A.glow(G.rgba(l.color, l.a || 0.35)), x - r, y - r, r * 2, r * 2); }
      else if (l.kind === 'lava') { const k = pulse(l, now * 0.6); g.drawImage(A.glow('rgba(255,90,20,' + (0.2 + 0.18 * k) + ')'), x - 30, y - 30, 60, 60); }
      else if (l.kind === 'crystal') { const k = pulse(l, now), r = 12 + 8 * k; g.drawImage(A.glow(G.rgba(l.color, 0.2 + 0.3 * k)), x - r, y - r, r * 2, r * 2); }
      else if (l.kind === 'fire') g.drawImage(A.glow('rgba(255,110,30,0.35)'), x - l.r * 0.6, y - l.r * 0.6, l.r * 1.2, l.r * 1.2);
      else if (l.kind === 'bolt') g.drawImage(A.glow('rgba(140,200,255,0.35)'), x - l.r * 0.5, y - l.r * 0.5, l.r, l.r);
      else if (l.kind === 'magic') g.drawImage(A.glow('rgba(190,120,255,0.3)'), x - l.r * 0.6, y - l.r * 0.6, l.r * 1.2, l.r * 1.2);
      else if (l.kind === 'holy') g.drawImage(A.glow('rgba(255,230,140,0.18)'), x - l.r * 0.6, y - l.r * 0.6, l.r * 1.2, l.r * 1.2);
      else if (l.kind === 'blood') g.drawImage(A.glow('rgba(255,40,60,0.25)'), x - l.r * 0.6, y - l.r * 0.6, l.r * 1.2, l.r * 1.2);
      else if (l.kind === 'frost') g.drawImage(A.glow('rgba(150,220,255,0.22)'), x - l.r * 0.6, y - l.r * 0.6, l.r * 1.2, l.r * 1.2);
      else if ((l.kind === 'item' || l.kind === 'gem') && l.color) g.drawImage(A.glow(G.rgba(l.color, 0.45)), x - l.r * 0.5, y - l.r * 0.5, l.r, l.r);
    }
    if (fl > 0.01) { g.fillStyle = (this.lightFlashCol || 'rgba(190,220,255,') + (fl * 0.28) + ')'; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'source-over';
    g.globalCompositeOperation = 'lighter'; g.drawImage(A.glow(tint + '0.16)'), p.x - cx - 70, p.y - cy - 70, 140, 140); g.globalCompositeOperation = 'source-over';
  };

  R.renderTexts = function (ctx, cx, cy, S) {
    if (!this.texts.length) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const x of this.texts) {
      const a = Math.min(1, x.life / x.max * 2), pop = 1 + Math.max(0, (x.life / x.max) - 0.8) * 2;
      const size = Math.round((x.big ? 7 : 5) * S * pop * 0.5) * 2;
      ctx.font = size + 'px "PressStart", monospace'; ctx.globalAlpha = a;
      ctx.lineWidth = Math.max(2, S * 1.2); ctx.strokeStyle = '#0b0610';
      const sx = (x.x - cx) * S, sy = (x.y - cy) * S;
      ctx.strokeText(x.str, sx, sy); ctx.fillStyle = x.c; ctx.fillText(x.str, sx, sy);
    }
    ctx.globalAlpha = 1;
  };
  /** Off-screen markers: an iron arrowhead with a gold rim and a gem in the target's colour, a badge with the target's
   *  own sprite, and the distance in metres. Drawn on the full-resolution canvas so the numbers stay sharp. */
  R.renderMarkers = function (ctx, S) {
    const list = this.markers; if (!list || !list.length) return;
    const now = performance.now() / 1000, u = S, line = Math.max(1, Math.round(u * 0.8));
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const m of list) {
      const x = m.x * S, y = m.y * S, r = 9.5 * u, pulse = Math.sin(now * 5 + m.a * 3) * 0.9 * u;
      // arrowhead
      ctx.save(); ctx.translate(x, y); ctx.rotate(m.a);
      const tip = r + 10 * u + pulse, base = r + 1 * u, w = 6 * u;
      ctx.globalAlpha = 0.28; ctx.fillStyle = m.color; ctx.beginPath(); ctx.moveTo(tip + 3 * u, 0); ctx.lineTo(base - u, -w - 2 * u); ctx.lineTo(base - u, w + 2 * u); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(tip, 0); ctx.lineTo(base, -w); ctx.lineTo(base + 2.5 * u, 0); ctx.lineTo(base, w); ctx.closePath();
      ctx.fillStyle = '#1c1216'; ctx.fill(); ctx.lineWidth = line; ctx.strokeStyle = '#e8c26a'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tip - 2.6 * u, 0); ctx.lineTo(base + 1.6 * u, -2.2 * u); ctx.lineTo(base + 3 * u, 0); ctx.lineTo(base + 1.6 * u, 2.2 * u); ctx.closePath();
      ctx.fillStyle = m.color; ctx.fill();
      ctx.restore();
      // badge: dark iron disc, gold ring, coloured inner ring, the target's sprite
      ctx.beginPath(); ctx.arc(x, y, r + 1.2 * u, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = '#140c10'; ctx.fill();
      ctx.lineWidth = Math.max(1.5, u * 1.1); ctx.strokeStyle = '#e8c26a'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r - 1.5 * u, 0, TAU); ctx.lineWidth = line; ctx.strokeStyle = m.color; ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;
      if (m.icon && G.painters[m.icon]) {
        const s = G.sprite(m.icon, m.variant), img = s.frames[Math.floor(now * 4) % s.frames.length], k = Math.min(13 / s.w, 13 / s.h) * u;
        ctx.drawImage(img, Math.round(x - s.w * k / 2), Math.round(y - s.h * k / 2), Math.round(s.w * k), Math.round(s.h * k));
      }
      // distance, on the side facing the hero
      const txt = Math.max(1, Math.round(m.dist / C.UNITS_PER_M)) + 'm', size = Math.max(10, Math.round(3.2 * u) * 2);
      ctx.font = size + 'px "PressStart", monospace';
      const half = ctx.measureText(txt).width / 2, tx = x - Math.cos(m.a) * (r + 3 * u + half), ty = y - Math.sin(m.a) * (r + 7 * u); ctx.lineWidth = Math.max(2, u * 1.1); ctx.strokeStyle = '#0b0610';
      ctx.strokeText(txt, tx, ty); ctx.fillStyle = '#f2e6c8'; ctx.fillText(txt, tx, ty);
    }
    ctx.restore();
  };
  /* Virtual sticks (touch only): a forged ring with four chevrons and a glowing orb for a knob; drawn once, then blitted. */
  const stickArt = {};
  function stickRing(Rr, hue) {
    const key = 'r' + Rr + hue; if (stickArt[key]) return stickArt[key];
    const pad = 6, S2 = Math.ceil(Rr * 2 + pad * 2), c = G.canvas(S2, S2), g = c.getContext('2d'), o = S2 / 2, u = Rr / 56;
    const metal = hue === 'aim' ? ['#ffd0b0', '#d06040', '#6a1810', '#2a0604'] : ['#fff0b8', '#d8a040', '#7a4a14', '#2a1404'];
    // the well: dark glass fading toward the rim
    let gr = g.createRadialGradient(o, o, 0, o, o, Rr);
    gr.addColorStop(0, 'rgba(8,4,10,0.18)'); gr.addColorStop(0.75, 'rgba(8,4,10,0.38)'); gr.addColorStop(1, 'rgba(8,4,10,0.6)');
    g.fillStyle = gr; g.beginPath(); g.arc(o, o, Rr, 0, TAU); g.fill();
    // the forged rim: a dark bed, a bright gilt band, a thin inner line
    g.lineWidth = 7 * u; g.strokeStyle = 'rgba(10,6,4,0.85)'; g.beginPath(); g.arc(o, o, Rr - 2 * u, 0, TAU); g.stroke();
    gr = g.createLinearGradient(0, o - Rr, 0, o + Rr); gr.addColorStop(0, metal[0]); gr.addColorStop(0.35, metal[1]); gr.addColorStop(0.7, metal[2]); gr.addColorStop(1, metal[1]);
    g.lineWidth = 3.4 * u; g.strokeStyle = gr; g.beginPath(); g.arc(o, o, Rr - 2 * u, 0, TAU); g.stroke();
    g.lineWidth = 1.2 * u; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.beginPath(); g.arc(o, o, Rr - 7 * u, 0, TAU); g.stroke();
    g.lineWidth = 1 * u; g.strokeStyle = metal[2]; g.beginPath(); g.arc(o, o, Rr - 8.2 * u, 0, TAU); g.stroke();
    // studs between the chevrons
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, x = o + Math.cos(a) * (Rr - 2 * u), y = o + Math.sin(a) * (Rr - 2 * u);
      g.fillStyle = '#140a04'; g.beginPath(); g.arc(x, y, 4.2 * u, 0, TAU); g.fill();
      const sg = g.createRadialGradient(x - u, y - u, 0, x, y, 3.2 * u); sg.addColorStop(0, metal[0]); sg.addColorStop(1, metal[2]);
      g.fillStyle = sg; g.beginPath(); g.arc(x, y, 3 * u, 0, TAU); g.fill();
    }
    // four double chevrons pointing out
    for (let i = 0; i < 4; i++) {
      g.save(); g.translate(o, o); g.rotate(i * Math.PI / 2);
      for (const [dx, al] of [[-Rr + 13 * u, 0.55], [-Rr + 19 * u, 0.9]]) {
        g.beginPath(); g.moveTo(dx, -6 * u); g.lineTo(dx - 5.5 * u, 0); g.lineTo(dx, 6 * u);
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.lineWidth = 4.6 * u; g.strokeStyle = 'rgba(10,6,4,' + al + ')'; g.stroke();
        g.lineWidth = 2.2 * u; g.strokeStyle = metal[1]; g.globalAlpha = al; g.stroke(); g.globalAlpha = 1;
      }
      g.restore();
    }
    return (stickArt[key] = c);
  }
  function stickKnob(Rr, hue) {
    const key = 'k' + Rr + hue; if (stickArt[key]) return stickArt[key];
    const r = Rr * 0.4, pad = r * 0.9, S2 = Math.ceil((r + pad) * 2), c = G.canvas(S2, S2), g = c.getContext('2d'), o = S2 / 2;
    const [hi, mid, lo, glow] = hue === 'aim' ? ['#fff0e0', '#ff7050', '#8a1408', 'rgba(255,90,60,'] : ['#fffbe0', '#ffb838', '#9a3c08', 'rgba(255,170,60,'];
    let gr = g.createRadialGradient(o, o, r * 0.6, o, o, r + pad); gr.addColorStop(0, glow + '0.55)'); gr.addColorStop(1, glow + '0)');
    g.fillStyle = gr; g.beginPath(); g.arc(o, o, r + pad, 0, TAU); g.fill();
    // a gilt bezel, then the orb with a hot core and a glint
    g.fillStyle = '#1a0c04'; g.beginPath(); g.arc(o, o, r + r * 0.2, 0, TAU); g.fill();
    gr = g.createLinearGradient(0, o - r, 0, o + r); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(0.5, '#b07a28'); gr.addColorStop(1, '#5a3410');
    g.fillStyle = gr; g.beginPath(); g.arc(o, o, r + r * 0.12, 0, TAU); g.fill();
    gr = g.createRadialGradient(o - r * 0.3, o - r * 0.35, r * 0.05, o, o, r);
    gr.addColorStop(0, hi); gr.addColorStop(0.35, mid); gr.addColorStop(0.85, lo); gr.addColorStop(1, '#2a0c02');
    g.fillStyle = gr; g.beginPath(); g.arc(o, o, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.ellipse(o - r * 0.32, o - r * 0.42, r * 0.28, r * 0.16, -0.5, 0, TAU); g.fill();
    return (stickArt[key] = c);
  }
  R.renderStick = function (ctx) {
    if (this.settings.hideJoystick) return;
    const d = DH.view.dpr, RAD = DH.input.RADIUS, Rr = Math.round(RAD * d);
    for (const [s, hue] of [[DH.input.stick, 'move'], [DH.input.aimStick, 'aim']]) {
      if (!s.active || !s.touch) continue;
      const ring = stickRing(Rr, hue), knob = stickKnob(Rr, hue), ox = s.ox * d, oy = s.oy * d;
      ctx.globalAlpha = 0.9; ctx.drawImage(ring, ox - ring.width / 2, oy - ring.height / 2);
      const m = Math.hypot(s.dx, s.dy);
      if (m > 0.15) { // the chevron the hero is heading toward flares up
        const a = Math.atan2(s.dy, s.dx), gr = ctx.createRadialGradient(ox, oy, Rr * 0.55, ox, oy, Rr * 1.08);
        gr.addColorStop(0, 'rgba(255,190,80,0)'); gr.addColorStop(0.8, hue === 'aim' ? 'rgba(255,110,70,0.5)' : 'rgba(255,200,90,0.5)'); gr.addColorStop(1, 'rgba(255,190,80,0)');
        ctx.globalAlpha = Math.min(1, m); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.arc(ox, oy, Rr * 1.08, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.drawImage(knob, ox + s.dx * RAD * d - knob.width / 2, oy + s.dy * RAD * d - knob.height / 2);
    }
    ctx.globalAlpha = 1;
  };
})(window.DH);
