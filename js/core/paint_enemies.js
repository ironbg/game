/* HD vector painters: regular enemies and summons. Dark, gaunt silhouettes: glowing eyes without highlights,
 * claws, fangs and rags; everything faces right (flipped when walking left). */
(function (DH) {
  'use strict';
  const G = DH.gfx, P = G.P, sh = G.shade;
  const def = (name, o) => { G.painters[name] = o; };
  const VOID = '#07040a';
  /** A menacing eye: a slanted ember with a hot core and a halo, no cute highlight. */
  const evil = (g, x, y, r, col, rot) => {
    P.glow(g, x, y, r * 2.4, col, 0.5);
    P.ell(g, x, y, r * 1.2, r * 0.62, col, rot == null ? -0.3 : rot);
    P.ell(g, x, y, r * 0.55, r * 0.3, sh(col, 0.75), rot == null ? -0.3 : rot);
  };
  P.evil = evil;
  /** A row of pointed teeth along a line (x0,y0)-(x1,y1); dir 1 = pointing down, -1 = up. */
  const teeth = (g, x0, y0, x1, y1, n, len, dir, col) => {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, xa = x0 + (x1 - x0) * t0, ya = y0 + (y1 - y0) * t0, xb = x0 + (x1 - x0) * t1, yb = y0 + (y1 - y0) * t1;
      P.path(g, [xa, ya, (xa + xb) / 2, (ya + yb) / 2 + len * dir * (i % 2 ? 0.7 : 1), xb, yb]); P.fill(g, col || '#efe6cc');
    }
  };
  P.teeth = teeth;
  /** Hooked claws fanning out from a hand at (x,y) toward angle a. */
  const claws = (g, x, y, a, n, len, w, col) => {
    for (let i = 0; i < n; i++) {
      const b = a + (i - (n - 1) / 2) * 0.38, mx = x + Math.cos(b) * len * 0.6, my = y + Math.sin(b) * len * 0.6;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, x + Math.cos(b + 0.35) * len, y + Math.sin(b + 0.35) * len);
      g.strokeStyle = col || '#e8e0c8'; g.lineWidth = w; g.stroke();
    }
  };
  P.claws = claws;
  /** A tapering limb segment with a darker underside. */
  const limb = (g, x1, y1, x2, y2, w1, w2, col) => {
    const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    P.path(g, [x1 + nx * w1, y1 + ny * w1, x2 + nx * w2, y2 + ny * w2, x2 - nx * w2, y2 - ny * w2, x1 - nx * w1, y1 - ny * w1]);
    P.fill(g, P.lg(g, x1 - nx * w1, y1 - ny * w1, x1 + nx * w1, y1 + ny * w1, [sh(col, 0.25), col, sh(col, -0.45)]));
    P.circle(g, x2, y2, w2, col);
  };
  P.limb = limb;

  /** A ragged hem along (x0,y0)-(x1,y1) hanging down by `drop`: soft torn tongues, no teeth. */
  const rag = (g, x0, y0, x1, y1, n, drop, col) => {
    g.beginPath(); g.moveTo(x0, y0 - 0.2);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, xa = x0 + (x1 - x0) * t0, xb = x0 + (x1 - x0) * t1, ya = y0 + (y1 - y0) * t0, yb = y0 + (y1 - y0) * t1, d = drop * (0.55 + ((i * 7) % 5) / 10);
      g.quadraticCurveTo(xa + (xb - xa) * 0.2, ya + d * 1.2, (xa + xb) / 2, ya + d); g.quadraticCurveTo(xa + (xb - xa) * 0.8, yb + d * 0.3, xb, yb);
    }
    g.lineTo(x1, y1 - 0.2); g.closePath(); P.fill(g, col);
  };
  P.rag = rag;

  /** A slender horn swept from (x,y) through (mx,my) to a fine tip (tx,ty). */
  const horn2 = (g, x, y, mx, my, tx, ty, w) => {
    const a = Math.atan2(ty - y, tx - x), nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
    g.beginPath(); g.moveTo(x + nx, y + ny); g.quadraticCurveTo(mx + nx * 0.4, my + ny * 0.4, tx, ty); g.quadraticCurveTo(mx - nx * 0.4, my - ny * 0.4, x - nx, y - ny); g.closePath();
    P.fill(g, P.lg(g, x, y, tx, ty, ['#3a2a1e', '#8a7a60', '#d8ccb0']));
  };
  P.horn2 = horn2;

  /* ---------- Skeleton: a hunched dead warrior with a rusted helm and a notched blade ---------- */
  def('skeleton', { w: 20, h: 21, cy: 12, frames: 2,
    colors: { bone: '#d8ccaa', eye: '#ff3a2a', rust: '#7a5a3a' },
    variants: { ice: { bone: '#c8e0ee', eye: '#8ff0ff', rust: '#5a7a98' }, fire: { bone: '#e0b890', eye: '#ffd040', rust: '#8a3a18' }, bog: { bone: '#bcbc8e', eye: '#b0ff50', rust: '#4a5a22' }, gold: { bone: '#eadaa4', eye: '#fff0a0', rust: '#a8843a' }, purple: { bone: '#d0c4e0', eye: '#ff50c0', rust: '#5a3a7a' }, drowned: { bone: '#b0c8bc', eye: '#70ffd0', rust: '#2e5a5a' } },
    draw(g, f, c) {
      const b = c.bone, bd = sh(b, -0.5), bm = sh(b, -0.18), w = f ? 1 : 0;
      g.translate(0, 1);
      // rags hanging from the hips
      P.path(g, [7.2, 11.4, 12, 11.2, 12.4, 15.4, 11.4, 14.2, 10.6, 16.6, 9.6, 14.6, 8.6, 16.2, 7.6, 14.4]); P.fill(g, P.lg(g, 7, 11, 12, 16, [sh(c.rust, -0.35), sh(c.rust, -0.7)]));
      // legs
      P.bone(g, 8.6, 12.4, 7.4 - w, 15.6, 0.8, bd); P.bone(g, 7.4 - w, 15.6, 7.8 - w * 1.4, 18.6, 0.75, bd);
      P.bone(g, 10.6, 12.4, 11.6 + w, 15.4, 0.8, bm); P.bone(g, 11.6 + w, 15.4, 11.8 + w * 1.2, 18.6, 0.75, bm);
      P.ell(g, 8 - w * 1.4, 18.9, 1.4, 0.5, bd); P.ell(g, 12.3 + w * 1.2, 18.9, 1.4, 0.5, bm);
      // back arm, clawed hand hanging
      P.bone(g, 7.4, 7.6, 5.8, 10.4, 0.7, bd); P.bone(g, 5.8, 10.4, 6, 13, 0.65, bd); claws(g, 6, 13, 1.7, 3, 1.4, 0.3, bd);
      // spine and a hollow ribcage leaning forward
      P.ell(g, 9.6, 12.2, 2.4, 1.1, P.vol(g, 9.6, 12, 2.4, bm));
      for (let i = 0; i < 5; i++) P.ell(g, 9.3 + i * 0.12, 11.2 - i * 0.9, 0.55, 0.42, bm);
      P.ell(g, 10, 8.6, 2.5, 2, VOID);
      for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(10 + i * 0.1, 7.4 + i * 1.05, 2.6 - i * 0.3, 0.6, -0.1, 0, Math.PI * 2); g.strokeStyle = i % 2 ? bd : b; g.lineWidth = 0.55; g.stroke(); }
      // skull thrust forward, rusted half-helm
      const hx = 10.9, hy = 4.2;
      P.circle(g, hx, hy, 2.6, P.vol(g, hx, hy, 2.6, b));
      P.rect(g, hx - 0.1, hy + 1.3, 3, 0.9, VOID);
      teeth(g, hx, hy + 1.3, hx + 2.9, hy + 1.3, 4, 0.5, 1, b); teeth(g, hx + 0.2, hy + 2.2, hx + 2.7, hy + 2.2, 3, 0.45, -1, b);
      P.rrect(g, hx + 0.1, hy + 2.1, 2.7, 0.9, 0.4, bm);
      P.ell(g, hx + 1.2, hy + 0.1, 1.05, 0.9, VOID, -0.3); P.ell(g, hx - 0.7, hy + 0.1, 0.85, 0.8, VOID, 0.3);
      P.circle(g, hx + 1.3, hy + 0.2, 0.28, c.eye); P.circle(g, hx - 0.6, hy + 0.2, 0.22, c.eye); P.glow(g, hx + 0.4, hy + 0.2, 1.6, c.eye, 0.35);
      g.strokeStyle = bd; g.lineWidth = 0.35; g.beginPath(); g.moveTo(hx - 0.6, hy - 2.6); g.lineTo(hx + 0.2, hy - 1.4); g.lineTo(hx - 0.4, hy - 0.8); g.stroke();
      P.path(g, [hx - 2.6, hy - 1, hx - 1.8, hy - 2.2, hx - 1.4, hy - 1.2]); P.fill(g, VOID);
      // front arm raising a notched blade
      P.bone(g, 11.8, 7.8, 13.4, 9.8, 0.7, b); P.bone(g, 13.4, 9.8, 14.8, 8.4, 0.65, b);
      P.path(g, [14.2, 8.6, 15.1, 9.1, 19, 1.8, 18.3, 1, 17.9, 2.6, 17.1, 2.4, 16.9, 3.8, 16.3, 3.8, 16, 5.2, 15.3, 5.4]);
      P.fill(g, P.lg(g, 14, 9, 19, 1, [sh(c.rust, -0.2), sh(c.rust, 0.25), sh(c.rust, -0.4)]));
      P.line(g, 13.6, 7.8, 15.6, 9.6, 0.6, '#2a1c14');
    } });

  /* ---------- Bat: a ragged blood-bat with torn wings and long fangs ---------- */
  def('bat', { w: 24, h: 16, frames: 2,
    colors: { wing: '#3a1a4e', body: '#2a1236', eye: '#ff2a2a' },
    variants: { fire: { wing: '#6a140c', body: '#420c08', eye: '#ffd040' }, ice: { wing: '#223c66', body: '#14223e', eye: '#8ff0ff' }, bog: { wing: '#2e3c1a', body: '#202a10', eye: '#b0ff50' }, purple: { wing: '#561656', body: '#3a083a', eye: '#ff50c0' }, drowned: { wing: '#143e3e', body: '#0a2626', eye: '#70ffd0' }, gold: { wing: '#5a4a22', body: '#3a2e14', eye: '#fff0a0' } },
    draw(g, f, c) {
      // Nightwing: a starved, skeletal bat; bony fingers through a torn membrane, a skull face split by fangs
      const up = f === 0, cx = 12, cy = 7, bone = sh(c.wing, 0.55);
      for (const s of [-1, 1]) {
        g.save(); g.translate(cx, cy); g.scale(s, 1);
        const el = up ? [4.2, -3.6] : [4.4, 1.6], wr = up ? [7.2, -6.4] : [7.6, 3.4];
        const tips = up ? [[11.8, -7.4], [11.6, -3], [9.4, 0.8], [6, 2.2]] : [[11.9, 3.6], [11, 7.2], [8, 8], [4.8, 6.6]];
        g.beginPath(); g.moveTo(1, -0.4); g.lineTo(el[0], el[1]); g.lineTo(wr[0], wr[1]); g.lineTo(tips[0][0], tips[0][1]);
        for (let i = 1; i < tips.length; i++) { const [px, py] = tips[i - 1], [qx, qy] = tips[i]; g.quadraticCurveTo((px + qx) / 2 - 1.1, (py + qy) / 2 - 0.4, qx, qy); }
        g.quadraticCurveTo(3, up ? 2.4 : 5, 1.2, 2.6); g.closePath();
        P.fill(g, P.lg(g, 0, up ? -7 : 0, 10, up ? 2 : 8, [sh(c.wing, 0.15), c.wing, sh(c.wing, -0.6)]));
        P.circle(g, up ? 8.6 : 8.4, up ? -2.2 : 4.6, 0.7, VOID); P.circle(g, up ? 6 : 6.2, up ? 0 : 5.6, 0.45, VOID); // torn holes
        g.strokeStyle = bone; g.lineWidth = 0.5; g.beginPath(); g.moveTo(1, -0.4); g.lineTo(el[0], el[1]); g.lineTo(wr[0], wr[1]); g.stroke();
        g.lineWidth = 0.32; for (const [tx, ty] of tips) { g.beginPath(); g.moveTo(wr[0], wr[1]); g.lineTo(tx, ty); g.stroke(); }
        P.path(g, [wr[0], wr[1], wr[0] + 0.3, wr[1] - 1.6, wr[0] + 1, wr[1] - 0.6]); P.fill(g, '#e8dcc0'); // thumb hook
        g.restore();
      }
      // gaunt ribbed body and dangling talons
      P.ell(g, cx, cy + 1.8, 1.7, 2.9, P.vol(g, cx, cy + 1.6, 2.6, c.body));
      g.strokeStyle = sh(c.body, 0.45); g.lineWidth = 0.25; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(cx - 1.2, cy + 0.8 + i * 0.9); g.quadraticCurveTo(cx, cy + 1.3 + i * 0.9, cx + 1.2, cy + 0.8 + i * 0.9); g.stroke(); }
      for (const s of [-1, 1]) { P.line(g, cx + s * 0.8, cy + 4.2, cx + s * 1.4, cy + 6.4, 0.35, sh(c.body, 0.2)); claws(g, cx + s * 1.4, cy + 6.4, 1.57 - s * 0.3, 3, 1.1, 0.22, '#e8dcc0'); }
      // skull head: towering ears, sunken eyes, a gaping fanged maw
      for (const s of [-1, 1]) { P.path(g, [cx + s * 0.6, cy - 3.2, cx + s * 2.8, cy - 8, cx + s * 1.8, cy - 2.6]); P.fill(g, P.lg(g, cx, cy - 8, cx, cy - 2, [sh(c.body, 0.3), sh(c.body, -0.3)])); }
      P.ell(g, cx, cy - 2.4, 1.9, 2.1, P.vol(g, cx, cy - 2.6, 2.1, sh(c.body, 0.1)));
      P.ell(g, cx, cy - 0.9, 1.35, 1.2, '#1a0406');
      P.teeth(g, cx - 1.1, cy - 1.5, cx + 1.1, cy - 1.5, 4, 0.9, 1, '#f4eee0'); P.teeth(g, cx - 0.9, cy - 0.1, cx + 0.9, cy - 0.1, 3, 0.6, -1, '#e0d6bc');
      P.path(g, [cx - 1, cy - 1.5, cx - 0.8, cy + 0.7, cx - 0.55, cy - 1.5]); P.fill(g, '#fff8e8'); P.path(g, [cx + 0.55, cy - 1.5, cx + 0.8, cy + 0.7, cx + 1, cy - 1.5]); P.fill(g, '#fff8e8');
      P.path(g, [cx - 0.4, cy - 2.6, cx + 0.4, cy - 2.6, cx, cy - 1.9]); P.fill(g, VOID);
      evil(g, cx - 0.95, cy - 3, 0.42, c.eye, 0.4); evil(g, cx + 0.95, cy - 3, 0.42, c.eye, -0.4);
      if (f) P.circle(g, cx + 0.3, cy + 1.2, 0.25, '#a01020'); // a drop of blood
    } });

  /* ---------- Ghoul: an emaciated corpse-eater, hunched, jaw hanging open, long claws ---------- */
  def('ghoul', { w: 22, h: 20, cy: 12, frames: 2,
    colors: { skin: '#8a9480', cloth: '#3a2e2a', eye: '#e8ff50' },
    variants: { ice: { skin: '#8aa6bc', cloth: '#22304a', eye: '#8ff0ff' }, fire: { skin: '#9a6a52', cloth: '#30140c', eye: '#ffd040' }, bog: { skin: '#6e7a48', cloth: '#30301a', eye: '#d0ff40' }, drowned: { skin: '#6a908a', cloth: '#163232', eye: '#70ffd0' }, purple: { skin: '#8a7c96', cloth: '#301640', eye: '#ff50c0' }, gold: { skin: '#a8987a', cloth: '#4a3e24', eye: '#fff0a0' } },
    draw(g, f, c) {
      // a corpse-eater stooped almost double: knees high, arms too long, a bald skull face with a jaw hanging open
      const s = c.skin, sd = sh(s, -0.5), w = f ? 0.9 : -0.9;
      // far leg and arm
      limb(g, 7.4, 12, 5 - w * 0.4, 13.6, 1, 0.7, sd); limb(g, 5 - w * 0.4, 13.6, 6.6 - w, 18.6, 0.7, 0.45, sd); claws(g, 6.6 - w, 18.8, 0.1, 3, 1.1, 0.26, '#d8d0b8');
      limb(g, 11, 7.6, 13.4, 11.8, 0.75, 0.55, sd); limb(g, 13.4, 11.8, 14.6 - w, 17.6, 0.55, 0.4, sd); claws(g, 14.6 - w, 17.8, 0.6, 4, 1.6, 0.26, '#d8d0b8');
      // a stooped back, shoulder blades and a line of vertebrae under the skin
      g.beginPath(); g.moveTo(6.2, 12.6); g.bezierCurveTo(5, 7.4, 8.4, 4.6, 12.4, 5.6); g.quadraticCurveTo(14.2, 7.6, 12.6, 10.4); g.quadraticCurveTo(10.4, 12.8, 6.2, 12.6); g.closePath();
      P.fill(g, P.lg(g, 5.6, 5, 13, 12.6, [sh(s, 0.3), s, sd]));
      g.strokeStyle = sh(s, 0.35); g.lineWidth = 0.5; g.beginPath(); g.moveTo(6.6, 11.4); g.bezierCurveTo(6, 8, 8.4, 5.8, 11.4, 5.9); g.stroke(); // the spine
      g.strokeStyle = sh(s, -0.65); g.lineWidth = 0.28; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8.4 + i * 1.1, 7 + i * 0.3); g.quadraticCurveTo(9.4 + i * 1.1, 9 + i * 0.3, 8.6 + i * 1.1, 11); g.stroke(); }
      rag(g, 5.8, 12, 10.6, 12.4, 3, 3, P.lg(g, 5, 12, 5, 15, [c.cloth, sh(c.cloth, -0.5)]));
      // near leg, bent high
      limb(g, 9.4, 12.2, 11.2 + w * 0.4, 14, 1.1, 0.75, s); limb(g, 11.2 + w * 0.4, 14, 10.2 + w, 18.6, 0.75, 0.5, s); claws(g, 10.2 + w, 18.8, 0.1, 3, 1.1, 0.28, '#e4dcc4');
      // the head hung forward: a pale skull face, sunken eyes, a jaw dropped open
      const hx = 14.6, hy = 6.4, sk = sh(s, 0.35);
      P.ell(g, hx, hy, 2.4, 2.5, P.vol(g, hx, hy - 0.4, 2.5, sk));
      P.ell(g, hx + 1, hy - 0.4, 0.8, 0.7, VOID, -0.2); P.ell(g, hx - 0.8, hy - 0.5, 0.6, 0.6, VOID, 0.2);
      P.circle(g, hx + 1.1, hy - 0.3, 0.3, c.eye); P.glow(g, hx + 1.1, hy - 0.3, 1.3, c.eye, 0.45);
      P.path(g, [hx - 0.4, hy + 1.4, hx + 2.4, hy + 1.2, hx + 2, hy + 4.4, hx, hy + 4]); P.fill(g, '#140204'); // the open maw
      P.path(g, [hx + 0.2, hy + 4, hx + 2, hy + 4.4, hx + 1.8, hy + 5, hx + 0.2, hy + 4.7]); P.fill(g, sh(sk, -0.2)); // the hanging jaw
      P.path(g, [hx + 0.4, hy + 1.3, hx + 0.6, hy + 2.5, hx + 0.9, hy + 1.3]); P.fill(g, '#ece4cc'); P.path(g, [hx + 1.6, hy + 1.2, hx + 1.8, hy + 2.3, hx + 2.1, hy + 1.2]); P.fill(g, '#ece4cc');
      g.strokeStyle = '#2a2622'; g.lineWidth = 0.3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(hx - 1.8 + i * 0.4, hy - 1.8); g.quadraticCurveTo(hx - 2.8 + i * 0.3, hy + 0.6, hx - 2.4 + i * 0.4, hy + 2.8 + i * 0.4); g.stroke(); } // lank hair behind
      // near arm reaching, claws out
      limb(g, 12.6, 8, 15.4, 11.4, 0.8, 0.55, s); limb(g, 15.4, 11.4, 17.8 + w * 0.3, 14.6, 0.55, 0.42, s); claws(g, 17.8 + w * 0.3, 14.7, 0.5, 4, 2, 0.3, '#ece4cc');
    } });

  /* ---------- Ghost / Wraith: a hooded shade, a black void for a face, clawed hands, a dissolving hem ---------- */
  def('ghost', { w: 18, h: 20, frames: 2,
    colors: { sheet: '#a8c4e0', dark: '#2a3a5a', eye: '#bfe8ff', glow: '#9ad8ff' },
    variants: { wraith: { sheet: '#3a3450', dark: '#120e1c', eye: '#7ff4ff', glow: '#7ff4ff' }, fire: { sheet: '#d88a5a', dark: '#6a1a08', eye: '#ffd040', glow: '#ff8a40' }, bog: { sheet: '#9ab478', dark: '#2e421a', eye: '#d0ff60', glow: '#b0ff60' }, purple: { sheet: '#b48ccc', dark: '#3e1a52', eye: '#ff80e0', glow: '#ff70e0' }, drowned: { sheet: '#80c4bc', dark: '#123e3e', eye: '#70ffd0', glow: '#70ffd0' }, gold: { sheet: '#e8d8a8', dark: '#6a5220', eye: '#fff0a0', glow: '#fff0a0' } },
    draw(g, f, c) {
      const wv = f ? 1 : -1;
      P.glow(g, 9, 10, 9.5, c.glow, 0.28);
      // trailing wisps
      for (let i = 0; i < 4; i++) { const x = 4.6 + i * 2.6; g.beginPath(); g.moveTo(x - 1, 13); g.quadraticCurveTo(x + wv * (i % 2 ? 1 : -1), 16.5, x - 0.4 + wv * 0.8, 19.6); g.quadraticCurveTo(x + 0.4, 16, x + 1.2, 13); P.fill(g, G.rgba(c.dark, 0.55)); }
      // hooded shroud
      g.beginPath(); g.moveTo(9.4, 1.2); g.bezierCurveTo(13.6, 1.4, 15, 5, 14.6, 9); g.quadraticCurveTo(15.6, 12.4, 14.4, 15.4);
      g.lineTo(13, 13.8 + wv * 0.5); g.lineTo(11.8, 16.4); g.lineTo(10.4, 14 - wv * 0.5); g.lineTo(9, 16.8); g.lineTo(7.6, 14.2 + wv * 0.5); g.lineTo(6.2, 16.2); g.lineTo(5, 13.8); g.lineTo(3.4, 15);
      g.quadraticCurveTo(3, 11, 4.2, 7.6); g.bezierCurveTo(4.4, 3.4, 6.4, 1.2, 9.4, 1.2); g.closePath();
      P.fill(g, P.lg(g, 5, 1, 12, 17, [G.rgba(sh(c.sheet, 0.1), 0.96), G.rgba(c.sheet, 0.86), G.rgba(c.dark, 0.55)]));
      g.save(); g.globalAlpha = 0.45; for (let i = 0; i < 3; i++) P.line(g, 7 + i * 2, 7.6, 6 + i * 2.6, 15, 0.45, c.dark); g.restore();
      // the void under the hood
      P.ell(g, 10.4, 6, 2.9, 3.3, VOID); P.ell(g, 10.6, 6.4, 2.2, 2.6, '#000000');
      evil(g, 9.6, 6, 0.46, c.eye, -0.2); evil(g, 11.8, 6, 0.4, c.eye, 0.2);
      // skeletal hands reaching out
      P.line(g, 12.6, 9, 15.4, 10.6 + wv * 0.3, 0.7, G.rgba(c.sheet, 0.8)); claws(g, 15.4, 10.6 + wv * 0.3, 0.3, 4, 1.8, 0.28, sh(c.sheet, 0.4));
      P.line(g, 5, 9.4, 3, 11.6 - wv * 0.3, 0.6, G.rgba(c.sheet, 0.6)); claws(g, 3, 11.6 - wv * 0.3, 2.2, 3, 1.4, 0.24, sh(c.sheet, 0.3));
    } });

  /* ---------- Spider: a bloated cave spider, arched legs, skull mark, dripping fangs ---------- */
  def('spider', { w: 26, h: 18, frames: 2,
    colors: { body: '#241a2c', mark: '#b01828', eye: '#ff2a2a' },
    variants: { ice: { body: '#1e2c44', mark: '#8ff0ff', eye: '#8ff0ff' }, fire: { body: '#2e140c', mark: '#ff8a20', eye: '#ffd040' }, bog: { body: '#202610', mark: '#b0ff50', eye: '#d0ff40' }, purple: { body: '#22102e', mark: '#ff50c0', eye: '#ff50c0' }, drowned: { body: '#10262a', mark: '#70ffd0', eye: '#70ffd0' }, gold: { body: '#302814', mark: '#fff0a0', eye: '#fff0a0' } },
    draw(g, f, c) {
      // Crypt weaver: eight long legs arching high over a bristled, plated abdomen; a cluster of burning eyes, dripping fangs
      const k = f ? 1 : -1, b = c.body, far = sh(b, -0.4), near = sh(b, 0.18), bx = 14, by = 11;
      const leg = (i, side, col, w1) => {
        const o = (i % 2 ? k : -k) * 0.8, d = i - 1.5;
        const root = [bx + d * 0.9, by - 0.4], knee = [bx + d * 5.4 + side * 0.5, 3.6 + (1.5 - Math.abs(d)) * 0.9 + o * 0.5], foot = [bx + d * 8.2 + side * 0.9, 17.2 - (side < 0 ? 1.4 : 0) + o * 0.3];
        limb(g, root[0], root[1], knee[0], knee[1], w1, w1 * 0.75, col); limb(g, knee[0], knee[1], foot[0], foot[1], w1 * 0.75, 0.2, col);
        P.path(g, [knee[0] - 0.35, knee[1] + 0.1, knee[0] + d * 0.3, knee[1] - 1.5, knee[0] + 0.35, knee[1] + 0.1]); P.fill(g, sh(col, 0.45)); // a spur at the knee
        for (let h = 1; h < 3; h++) { const t = h / 3, x = knee[0] + (foot[0] - knee[0]) * t, y = knee[1] + (foot[1] - knee[1]) * t; P.line(g, x, y, x + (d > 0 ? 0.8 : -0.8), y - 0.5, 0.18, sh(col, 0.4)); } // bristles
      };
      for (let i = 0; i < 4; i++) leg(i, -1, far, 0.5);
      // plated abdomen hanging behind, bristling, with a jagged blood-mark
      P.ell(g, 7.8, 10.6, 5.6, 4.6, P.vol(g, 7.4, 9.8, 6, b));
      g.strokeStyle = sh(b, 0.3); g.lineWidth = 0.35; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(7.8, 10.6, 6.2 - i * 0.2, 5 - i * 0.2, 0, -2.4 + i * 0.35, -1.9 + i * 0.35); g.stroke(); }
      for (let i = 0; i < 12; i++) { const a = -3 + i * 0.3; P.line(g, 7.8 + Math.cos(a) * 6, 10.6 + Math.sin(a) * 4.8, 7.8 + Math.cos(a) * 7, 10.6 + Math.sin(a) * 5.7, 0.18, sh(b, 0.35)); }
      P.path(g, [5, 8.6, 6.6, 9.6, 7.8, 8.4, 9, 9.6, 10.6, 8.6, 9.6, 11, 10.4, 13, 7.8, 12, 5.2, 13, 6, 11]); P.fill(g, G.rgba(c.mark, 0.85));
      P.path(g, [7, 10, 7.8, 9.2, 8.6, 10, 7.8, 11]); P.fill(g, VOID);
      P.path(g, [1.2, 10.8, 2, 9.6, 2.2, 11.8]); P.fill(g, sh(b, -0.3)); // spinneret
      // cephalothorax and head, eyes and fangs
      P.ell(g, bx, by, 3.4, 2.6, P.vol(g, bx, by - 0.4, 3.2, near));
      P.ell(g, bx + 3.4, by - 0.4, 2.1, 1.8, P.vol(g, bx + 3.4, by - 0.6, 2, sh(b, 0.25)));
      P.glow(g, bx + 3.8, by - 1.1, 3.2, c.eye, 0.55);
      [[3.6, -1.7, 0.42], [4.6, -1.3, 0.4], [2.8, -1.1, 0.28], [5.1, -0.5, 0.28], [3.2, -0.3, 0.22], [4.1, -0.4, 0.25], [2.4, -1.9, 0.18], [5.1, -1.9, 0.18]].forEach(([x, y, r]) => P.circle(g, bx + x, by + y, r, c.eye));
      for (const [x, d] of [[3.4, 0], [4.8, 0.4]]) { g.beginPath(); g.moveTo(bx + x, by + 0.8); g.quadraticCurveTo(bx + x + 1.6 + d, by + 1.8, bx + x + 0.5 + d, by + 3.8); g.strokeStyle = '#e8dcc0'; g.lineWidth = 0.55; g.stroke(); }
      P.circle(g, bx + 4, by + 4.3, 0.3, 'rgba(160,255,120,0.85)');
      for (let i = 0; i < 4; i++) leg(i, 1, near, 0.58);
    } });

  /* ---------- Imp: a lean, grinning pit fiend with ragged wings, horns and a barbed tail ---------- */
  def('imp', { w: 20, h: 20, frames: 2,
    colors: { skin: '#8a1a24', wing: '#3a0c14', eye: '#ffd040' },
    variants: { purple: { skin: '#5e1a78', wing: '#280838', eye: '#ffc0ff' }, bog: { skin: '#465a1a', wing: '#222c0c', eye: '#ffd040' } },
    draw(g, f, c) {
      // a gaunt pit fiend: great leathery wings, horns swept straight back, a narrow face split by a black mouth
      const s = c.skin, sd = sh(s, -0.55), up = f === 0;
      for (const d of [-1, 1]) {
        g.save(); g.translate(9.2, 8.4); g.scale(d, 1);
        const tip = up ? [9, -7.6] : [9.6, -2], mid = up ? [5, -8.4] : [6.4, -4.2];
        g.beginPath(); g.moveTo(0.6, 0.2); g.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]);
        g.quadraticCurveTo(tip[0] - 1.4, tip[1] + 3, tip[0] - 0.6, tip[1] + 5.4); g.quadraticCurveTo(tip[0] - 2.6, tip[1] + 4.6, tip[0] - 3, tip[1] + 7.4); g.quadraticCurveTo(tip[0] - 4.8, tip[1] + 6, 1.4, 3.6); g.closePath();
        P.fill(g, P.lg(g, 0, -7, 8, 4, [sh(c.wing, 0.2), c.wing, sh(c.wing, -0.6)]));
        g.strokeStyle = sh(c.wing, 0.3); g.lineWidth = 0.35; g.beginPath(); g.moveTo(0.6, 0.2); g.quadraticCurveTo(mid[0], mid[1], tip[0], tip[1]); g.lineTo(tip[0] - 0.6, tip[1] + 5.4); g.moveTo(tip[0], tip[1]); g.lineTo(tip[0] - 3, tip[1] + 7.4); g.stroke();
        g.restore();
      }
      g.beginPath(); g.moveTo(8.6, 13.8); g.bezierCurveTo(5, 17.4, 1.6, 15.4, 2.2, 12.2); g.strokeStyle = sd; g.lineWidth = 0.5; g.stroke();
      limb(g, 8.6, 13.4, 7.4, 15.6, 0.75, 0.45, sd); limb(g, 7.4, 15.6, 8.2 - (f ? 0.6 : 0), 18.2, 0.45, 0.3, sd); claws(g, 8.2 - (f ? 0.6 : 0), 18.3, 0.2, 3, 1, 0.22, '#d8d0b8');
      limb(g, 10.4, 13.4, 11.8, 15.4, 0.75, 0.45, sh(s, -0.2)); limb(g, 11.8, 15.4, 11.2 + (f ? 0 : 0.6), 18.2, 0.45, 0.3, sh(s, -0.2)); claws(g, 11.2 + (f ? 0 : 0.6), 18.3, 0.2, 3, 1, 0.22, '#d8d0b8');
      // a thin, ribbed torso
      g.beginPath(); g.moveTo(7.6, 9.2); g.quadraticCurveTo(9.6, 8, 11.8, 9.2); g.lineTo(11, 13.8); g.quadraticCurveTo(9.6, 14.4, 8.2, 13.8); g.closePath();
      P.fill(g, P.lg(g, 7, 8, 12, 14, [sh(s, 0.25), s, sd]));
      g.strokeStyle = sh(s, -0.6); g.lineWidth = 0.28; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(8.2, 10.2 + i * 1.1); g.quadraticCurveTo(9.6, 10.8 + i * 1.1, 11.2, 10.2 + i * 1.1); g.stroke(); }
      limb(g, 11.6, 9.6, 13.8, 12, 0.55, 0.4, s); limb(g, 13.8, 12, 15, 14, 0.4, 0.3, s); claws(g, 15, 14.1, 0.9, 4, 1.8, 0.24, '#ece4cc');
      // head: long and narrow, horns raked straight back
      const hx = 10.4, hy = 6;
      horn2(g, hx - 0.8, hy - 1.6, hx - 3.4, hy - 3, hx - 6.2, hy - 3.2, 0.7);
      horn2(g, hx + 0.4, hy - 1.9, hx - 2, hy - 4, hx - 4.8, hy - 4.8, 0.6);
      g.beginPath(); g.moveTo(hx - 1.8, hy - 1.2); g.quadraticCurveTo(hx, hy - 2.8, hx + 2, hy - 1.2); g.lineTo(hx + 3.6, hy + 1); g.quadraticCurveTo(hx + 2, hy + 3.2, hx - 0.4, hy + 2.4); g.quadraticCurveTo(hx - 2, hy + 1, hx - 1.8, hy - 1.2); g.closePath();
      P.fill(g, P.lg(g, hx - 2, hy - 2, hx + 3, hy + 3, [sh(s, 0.3), s, sd]));
      P.path(g, [hx - 0.6, hy - 0.9, hx + 2.6, hy - 0.4, hx + 1.4, hy]); P.fill(g, sd);
      evil(g, hx + 1.5, hy - 0.3, 0.4, c.eye, -0.35); evil(g, hx, hy - 0.4, 0.32, c.eye, 0.3);
      P.path(g, [hx + 0.2, hy + 1.2, hx + 3.2, hy + 1, hx + 2.4, hy + 2.2, hx + 0.6, hy + 2]); P.fill(g, '#100002');
      P.path(g, [hx + 2.4, hy + 1.05, hx + 2.6, hy + 2, hx + 2.8, hy + 1.05]); P.fill(g, '#f0e6cc');
    } });

  /* ---------- Golem: a hunched heap of cracked boulders with a burning rune heart ---------- */
  def('golem', { w: 28, h: 28, frames: 2,
    colors: { stone: '#6a6c74', rune: '#6ad8f0' },
    variants: { ice: { stone: '#7a9cb8', rune: '#ffffff' }, fire: { stone: '#4a3028', rune: '#ff8a20' }, bog: { stone: '#4e543a', rune: '#b0ff50' }, gold: { stone: '#9c8650', rune: '#fff8c0' }, purple: { stone: '#4a3c5a', rune: '#ff60c0' }, bone: { stone: '#c8bc98', rune: '#8affd0' }, drowned: { stone: '#3e5a56', rune: '#70ffd0' } },
    draw(g, f, c) {
      // a stone colossus: a torso like a cliff face, a small head sunk between vast shoulders, arms hanging past its knees
      const s = c.stone, w = f ? 0.8 : 0;
      const shape = (pts, col) => { P.path(g, pts); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); } P.fill(g, P.lg(g, x0, y0, x1, y1, [sh(col, 0.32), col, sh(col, -0.6)])); };
      const crack = (pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.strokeStyle = G.rgba(c.rune, 0.45); g.lineWidth = 1; g.stroke(); g.strokeStyle = c.rune; g.lineWidth = 0.35; g.stroke(); };
      P.glow(g, 14, 12, 10, c.rune, 0.2);
      // legs: tapered pillars
      shape([9.4 - w, 17, 13 - w, 17, 12.6 - w, 26, 8.4 - w, 26.2], sh(s, -0.3)); shape([15 + w, 17, 18.6 + w, 17, 19.6 + w, 26.2, 15.4 + w, 26], sh(s, -0.12));
      // far arm: shoulder boulder, forearm, fist
      shape([3.6, 6.8, 7.6, 6, 8, 12.4, 4.4, 13.6], sh(s, -0.4)); shape([3.2, 13.2, 7, 12.4, 7.2, 19, 3, 19.6], sh(s, -0.4)); shape([1.6, 18.8, 7.4, 18.4, 7.6, 23.4, 2, 23.8], sh(s, -0.42));
      // the torso: broad at the shoulders, hunched, narrowing to the hips
      shape([6.4, 7, 10.8, 3.6, 18.6, 3.6, 22.6, 7.2, 20.4, 13, 18.4, 18.2, 9.8, 18.2, 7.6, 13], s);
      g.strokeStyle = sh(s, -0.7); g.lineWidth = 0.35; g.beginPath(); g.moveTo(8.6, 9); g.lineTo(11.4, 11); g.moveTo(20.4, 8.4); g.lineTo(17.6, 10.2); g.moveTo(10.2, 15.6); g.lineTo(13.6, 16.6); g.moveTo(14.4, 4.6); g.lineTo(14.6, 7); g.stroke();
      crack([13.6, 7.4, 12.6, 10, 14.4, 12.2, 13.4, 15.4]); crack([14.4, 12.2, 17, 13]); crack([12.6, 10, 10, 10.6]);
      P.glow(g, 13.8, 11, 3.2, c.rune, 0.65);
      // the head: a heavy wedge sunk forward between the shoulders
      shape([14.6, 1.2, 19.4, 1.4, 20.6, 5.6, 15.6, 6.4], sh(s, 0.08));
      P.path(g, [14.8, 2.8, 20.2, 3, 20, 3.8, 15, 3.6]); P.fill(g, sh(s, -0.7));
      P.ell(g, 16.6, 4.1, 0.7, 0.4, VOID); P.ell(g, 19, 4.2, 0.7, 0.4, VOID); evil(g, 16.6, 4.1, 0.45, c.rune, 0); evil(g, 19, 4.2, 0.45, c.rune, 0);
      // near arm, a fist like a boulder
      shape([20.2, 6, 24.4, 6.8, 24.6, 13.6, 20.6, 13], s); shape([20.6, 12.6, 24.8, 13.2, 25, 19.6, 20.8, 19.4], sh(s, 0.05)); shape([19.8, 19, 26, 19, 26.4, 24.6, 20, 24.8], sh(s, 0.1));
      g.strokeStyle = sh(s, -0.65); g.lineWidth = 0.3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(21.4 + i * 1.5, 21); g.lineTo(21.5 + i * 1.5, 24); g.stroke(); }
    } });

  /* ---------- Wolf (summon): a spectral dire wolf ---------- */
  def('wolf', { w: 24, h: 15, frames: 2,
    colors: { fur: '#2a3448', eye: '#8ff0ff' },
    draw(g, f, c) {
      // a spirit wolf of shadow and frost: a heavy mane streaming like smoke, low and stalking, jaws half open
      const s = c.fur, sd = sh(s, -0.55), mist = G.rgba(c.eye, 0.35), w = f ? 1 : -1;
      P.glow(g, 12, 8, 11, c.eye, 0.2);
      // a tail of mist
      g.beginPath(); g.moveTo(5, 6.6); g.bezierCurveTo(2, 5.4, 1, 3.4 + w * 0.5, 0.2, 4.8 + w * 0.5); g.bezierCurveTo(1.6, 6.8, 3.4, 8, 5.2, 8.4); g.closePath(); P.fill(g, P.lg(g, 0, 4, 5, 8, [mist, sd]));
      // legs, digitigrade, stalking
      [[6.4, -w, 1, 1], [8.6, w, 0, 1], [15.2, w, 1, 0], [17.4, -w, 0, 0]].forEach(([x, o, back, hind]) => { const col = back ? sd : s, kx = x + o * 0.5 + (hind ? -1.2 : 0.4); limb(g, x, 8.4, kx, 11.2, 1.1, 0.6, col); limb(g, kx, 11.2, x + o + (hind ? 0.1 : 0.8), 14.1, 0.6, 0.35, col); claws(g, x + o + (hind ? 0.1 : 0.8), 14.2, 0.2, 3, 0.9, 0.2, '#e8f4ff'); });
      // a long body, the back smooth and low
      g.beginPath(); g.moveTo(4.4, 6.6); g.bezierCurveTo(8, 4.2, 13, 3.8, 16.4, 4.6); g.quadraticCurveTo(18.6, 6.4, 17.8, 9.4); g.quadraticCurveTo(12.6, 10, 11, 8.8); g.quadraticCurveTo(8, 10, 5, 9.2); g.closePath();
      P.fill(g, P.lg(g, 4, 3.8, 17, 10, [sh(s, 0.35), s, sd]));
      // the mane: long strands of smoke flowing back from the shoulders
      for (let i = 0; i < 6; i++) { const x = 16 - i * 1.3, y = 3.6 + i * 0.25; g.beginPath(); g.moveTo(x + 1.4, y + 1.2); g.quadraticCurveTo(x - 1, y - 1.6 + (i % 2), x - 3.2 - (f ? 0.4 : 0), y - 0.2); g.quadraticCurveTo(x - 0.6, y + 0.4, x + 1.4, y + 2.2); g.closePath(); P.fill(g, P.lg(g, x - 3, y - 1, x + 1, y + 2, [mist, sh(s, 0.2)])); }
      // head: a long wolf's skull, ears laid back, jaws parted
      const hx = 18.6, hy = 5.6;
      P.path(g, [hx - 1.2, hy - 1.2, hx - 2.8, hy - 3.2, hx - 0.2, hy - 1.8]); P.fill(g, sd);
      P.ell(g, hx, hy, 2.5, 2.1, P.vol(g, hx, hy - 0.2, 2.5, s));
      P.path(g, [hx + 0.8, hy - 1, hx + 5.4, hy - 0.2, hx + 5.2, hy + 0.9, hx + 1, hy + 0.9]); P.fill(g, P.lg(g, hx, hy - 1, hx + 5, hy + 1, [sh(s, 0.2), sd]));
      P.path(g, [hx + 1, hy + 1.6, hx + 4.4, hy + 2.3, hx + 4, hy + 3, hx + 0.8, hy + 2.5]); P.fill(g, sd);
      P.path(g, [hx + 1, hy + 0.9, hx + 5.2, hy + 0.9, hx + 4.4, hy + 2.3, hx + 1, hy + 1.8]); P.fill(g, '#0a1420');
      P.path(g, [hx + 3.9, hy + 0.9, hx + 4.2, hy + 2.1, hx + 4.5, hy + 0.9]); P.fill(g, '#f0f8ff'); P.path(g, [hx + 1.6, hy + 2.2, hx + 1.9, hy + 1.3, hx + 2.2, hy + 2.3]); P.fill(g, '#dde8f0');
      P.glow(g, hx + 2.8, hy + 1.4, 2, c.eye, 0.45);
      evil(g, hx + 0.9, hy - 0.6, 0.45, c.eye, -0.25);
      P.circle(g, hx + 5.3, hy + 0.1, 0.35, '#0a0a12');
    } });

  /* ---------- Rat: a mangy plague rat with bristles, a bald tail and yellow teeth ---------- */
  def('rat', { w: 18, h: 12, frames: 2,
    colors: { fur: '#4e4038', eye: '#ff2a2a' },
    variants: { drowned: { fur: '#3a5652', eye: '#70ffd0' }, bog: { fur: '#48482c', eye: '#d0ff40' } },
    draw(g, f, c) {
      // a sewer rat the size of a dog: humped, patchy, a naked ringed tail, a long head and one yellow pair of incisors
      const s = c.fur, sd = sh(s, -0.55), w = f ? 0.8 : -0.8, skin = '#9a7474';
      g.beginPath(); g.moveTo(3.2, 7.6); g.bezierCurveTo(0.6, 9.4 + w, -0.2, 6 - w, 0.8, 3.6 + w * 0.6); g.strokeStyle = skin; g.lineWidth = 0.8; g.stroke();
      g.strokeStyle = sh(skin, -0.45); g.lineWidth = 0.2; for (let i = 0; i < 5; i++) { const t = (i + 1) / 6, x = 3.2 - t * 2.6, y = 7.6 - t * 3.6 + (i % 2 ? w * 0.3 : 0); g.beginPath(); g.moveTo(x - 0.45, y - 0.2); g.lineTo(x + 0.45, y + 0.25); g.stroke(); }
      limb(g, 5, 7.6, 4.4 + w, 11, 0.8, 0.45, sd); claws(g, 4.4 + w, 11.1, 0.3, 3, 0.8, 0.2, '#d8ccb0');
      // the hump of the body
      g.beginPath(); g.moveTo(2.8, 8); g.bezierCurveTo(2.2, 2.4, 9, 1.4, 12.4, 4.2); g.quadraticCurveTo(13.8, 7.4, 11.6, 9); g.quadraticCurveTo(6.8, 10, 2.8, 8); g.closePath();
      P.fill(g, P.lg(g, 3, 1.8, 12, 9.6, [sh(s, 0.3), s, sd]));
      g.strokeStyle = sh(s, 0.35); g.lineWidth = 0.18; for (let i = 0; i < 12; i++) { const x = 3.6 + (i % 6) * 1.5, y = 3.6 + Math.floor(i / 6) * 2 + (i % 2) * 0.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 0.6, y + 0.9); g.stroke(); } // matted fur
      P.ell(g, 7.6, 6.4, 1.8, 1.1, skin); g.strokeStyle = sh(skin, -0.5); g.lineWidth = 0.22; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(7.6, 5.4 + i * 0.6, 1.3, 0.4, 2.6); g.stroke(); } // bald flank, ribs
      P.line(g, 9.8, 4.2, 11.2, 6.2, 0.3, '#5a1818'); // an old wound
      limb(g, 10.8, 8, 12 - w, 11, 0.75, 0.42, s); claws(g, 12 - w, 11.1, 0.1, 3, 0.9, 0.22, '#d8ccb0');
      // the head: long, low, ears flat, eye burning, incisors bared
      P.path(g, [11.4, 4.2, 14.4, 4.6, 17.8, 6.6, 17.2, 7.6, 13.6, 7.8, 11.6, 8]); P.fill(g, P.lg(g, 11, 4, 17, 8, [sh(s, 0.15), sd]));
      P.ell(g, 12.2, 4.2, 1.1, 0.8, skin, -0.4); P.ell(g, 12.2, 4.2, 0.6, 0.4, sh(skin, -0.3), -0.4);
      P.path(g, [14.2, 7.6, 17, 7.6, 16.4, 8.8, 14.4, 8.4]); P.fill(g, '#140406');
      P.rect(g, 16.3, 7.4, 0.8, 2, '#e8c860'); P.rect(g, 16.3, 7.4, 0.8, 0.5, '#fff0a0');
      P.circle(g, 17.7, 6.7, 0.35, '#2a1010');
      evil(g, 14.6, 5.5, 0.5, c.eye, -0.25);
      g.strokeStyle = 'rgba(220,210,190,0.5)'; g.lineWidth = 0.15; g.beginPath(); g.moveTo(16.6, 6.8); g.lineTo(18, 5.9); g.moveTo(16.6, 7.1); g.lineTo(18, 7.7); g.stroke();
    } });

  /* ---------- Gilded Ooze: a heavy, faceless mass of molten gold, coins and bones sinking in it ---------- */
  def('slime', { w: 24, h: 22, cy: 16, frames: 2,
    colors: { body: '#4a8a30', core: '#d0ff80', eye: '#102008' },
    variants: { gold: { body: '#c89018', core: '#fff4a0', eye: '#3a2004' } },
    draw(g, f, c) {
      // a heaving mass of melted corpses: skulls and ribs half sunk in it, bony arms clawing up out of it
      const sq = f ? 0.93 : 1, w = 9 / sq, h = 6.8 * sq, cx = 12, by = 20.4, bone = '#e0d4b4';
      P.ell(g, cx, by, w + 0.8, 1.5, 'rgba(0,0,0,0.5)');
      // arms clawing out of the top and the sides
      [[-5.6, -10, -2.2], [4.8, -11, -0.9], [-9.2, -4.6, -2.8], [9.4, -4.4, -0.3]].forEach(([x, l, a], i) => {
        const x0 = cx + x * 0.8, y0 = by - (i < 2 ? h * 1.2 : 2.4), x1 = cx + x + Math.cos(a) * 1.2, y1 = by + l + (f && i < 2 ? -0.7 : 0);
        P.line(g, x0, y0, x1, y1, 0.7, bone); P.line(g, x0 + 0.35, y0, x1 + 0.35, y1, 0.3, sh(bone, -0.35));
        claws(g, x1, y1, a, 4, 2, 0.34, '#efe4c8');
      });
      g.beginPath(); g.moveTo(cx - w, by); g.bezierCurveTo(cx - w * 0.95, by - h * 1.15, cx - 3, by - h * 1.7, cx + 0.5, by - h * 1.55); g.bezierCurveTo(cx + w * 0.8, by - h * 1.45, cx + w, by - h * 0.7, cx + w, by);
      g.quadraticCurveTo(cx, by + 1.2, cx - w, by); g.closePath();
      P.fill(g, P.rg(g, cx - 2, by - h, w * 1.3, [[0, sh(c.body, 0.3)], [0.55, c.body], [1, sh(c.body, -0.7)]], cx - 3, by - h * 1.2));
      // half-sunken skulls with embers in their sockets
      const skull = (x, y, r, tilt) => {
        P.ell(g, x, y, r, r * 0.9, P.vol(g, x, y - r * 0.2, r, '#d8ccaa'), tilt);
        P.ell(g, x - r * 0.38, y - r * 0.05, r * 0.26, r * 0.32, VOID); P.ell(g, x + r * 0.38, y - r * 0.05, r * 0.26, r * 0.32, VOID);
        P.circle(g, x - r * 0.38, y, r * 0.1, '#ff5030'); P.circle(g, x + r * 0.38, y, r * 0.1, '#ff5030');
        P.teeth(g, x - r * 0.45, y + r * 0.55, x + r * 0.45, y + r * 0.55, 3, r * 0.3, 1, '#e8dcc0');
      };
      skull(cx - 1.4, by - h * 1.05, 2.3, -0.15); skull(cx + 4.4, by - 3.4, 1.6, 0.3); skull(cx - 5.6, by - 2.4, 1.4, -0.3);
      // ribs breaking the surface
      g.strokeStyle = bone; g.lineWidth = 0.4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + 1.6, by - 1 + i * 0.1, 2.4 - i * 0.5, Math.PI * 1.1, Math.PI * 1.75); g.stroke(); }
      [[-2.4, -1.2, 0.7], [6, -6, 0.55], [-7, -5.6, 0.5]].forEach(([x, y, r]) => P.circle(g, cx + x, by + y, r, P.vol(g, cx + x, by + y, r, c.core)));
      [[-6, 1.6], [-0.8, 1.4], [5.4, 2]].forEach(([x, l]) => P.ell(g, cx + x, by + l * 0.4, 0.6, l * 0.7, sh(c.body, -0.25)));
      P.ell(g, cx - 4.4, by - h * 1.15, 1.2, 0.5, 'rgba(255,255,255,0.3)', -0.4);
    } });
  /* ---------- Snow Effigy (Frozen Catacombs): a bound idol of sticks and ice under a stitched sack ---------- */
  def('effigy', { w: 26, h: 35, cy: 25, frames: 2,
    colors: { straw: '#8a8470', ice: '#bfe6ff', eye: '#8ff0ff' },
    draw(g, f, c) {
      // the Snow Bogeyman: a gangling scarecrow on stilt legs, hunched over; straw fingers, a frost-bleached rag, a crimson
      // scarf, a sack head with a crooked peak, one burning eye and a wide mouth sewn shut; a scythe rimed with ice
      const w = f ? 1.1 : -1.1, wood = '#4e3824', woodL = '#8a6a44', twine = '#d8c898', rag = '#cfcfc4', eye = c.eye;
      const stick = (x1, y1, x2, y2, t) => { P.line(g, x1, y1, x2, y2, t, wood); P.line(g, x1 - 0.25, y1, x2 - 0.25, y2, t * 0.35, woodL); };
      const bind = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a || 0); P.rect(g, -1, -0.4, 2, 0.8, twine); g.restore(); };
      const straw = (x, y, a, n, len) => { for (let i = 0; i < n; i++) { const b = a + (i - (n - 1) / 2) * 0.34; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(b + 0.35) * len * 0.6, y + Math.sin(b + 0.35) * len * 0.6, x + Math.cos(b) * len, y + Math.sin(b) * len); g.strokeStyle = i % 2 ? '#e0d090' : '#b0a060'; g.lineWidth = 0.55; g.stroke(); } };
      P.glow(g, 15, 8, 9, eye, 0.2);
      // the scythe held behind, blade high
      stick(20.4, 18, 7.4, 1.6, 0.9);
      g.beginPath(); g.moveTo(7.6, 1.4); g.quadraticCurveTo(0, 1.6, 0.4, 11.4); g.quadraticCurveTo(1.8, 5.4, 7.4, 3.6); g.closePath();
      P.fill(g, P.lg(g, 0, 1, 7, 11, ['#f4faff', '#9ab8d8', '#3a4a64']));
      // stilt legs with log knees
      stick(11.4, 19.4, 8.8 - w, 26.4, 1.1); stick(8.8 - w, 26.4, 10 - w, 33.8, 0.85); P.ell(g, 8.8 - w, 26.4, 1.3, 1.6, P.lg(g, 7, 25, 10, 28, [woodL, wood])); bind(9 - w, 28, 0.2);
      stick(14, 19.4, 16.8 + w, 26.4, 1.2); stick(16.8 + w, 26.4, 15.4 + w, 33.8, 0.9); P.ell(g, 16.8 + w, 26.4, 1.4, 1.7, P.lg(g, 15, 25, 18, 28, [woodL, wood])); bind(16.6 + w, 28, -0.2);
      // the far arm hanging to the knee, straw fingers splayed
      stick(10.4, 11.4, 6.2, 16, 0.85); stick(6.2, 16, 5.4, 21.6, 0.7); bind(6.2, 16, 0.6); straw(5.4, 21.8, 1.9, 5, 3.4);
      // the rag: long, narrow, torn into tongues that reach the knees
      g.beginPath(); g.moveTo(9.8, 10.4); g.lineTo(15.4, 10); g.quadraticCurveTo(15.6, 14, 15.8, 18.6); g.lineTo(9.6, 18.8); g.quadraticCurveTo(9.2, 14, 9.8, 10.4); g.closePath();
      P.fill(g, P.lg(g, 9, 10, 16, 19, ['#f0f0e8', rag, sh(rag, -0.5)]));
      P.rag(g, 9.2, 18.6, 16.2, 18.4, 3, 5.6 + (f ? 0.8 : 0), P.lg(g, 0, 18, 0, 25, [sh(rag, -0.25), sh(rag, -0.6)]));
      P.line(g, 9.6, 14.6, 15.6, 14.4, 0.6, twine);
      P.ell(g, 12, 16.4, 0.9, 2, G.rgba('#7ab0d0', 0.5), 0.2);
      // a crimson scarf, one end streaming behind
      g.beginPath(); g.moveTo(9.6, 10.6); g.quadraticCurveTo(12.6, 12.6, 16, 10.2); g.lineTo(16.4, 8.6); g.quadraticCurveTo(12.6, 10.4, 9.4, 8.8); g.closePath(); P.fill(g, P.lg(g, 9, 8, 16, 12, ['#c03828', '#701410']));
      g.beginPath(); g.moveTo(10, 10.4); g.quadraticCurveTo(7.4, 11.8, 5.6 - (f ? 0.6 : 0), 10.8); g.quadraticCurveTo(7.4, 13, 10.4, 11.8); g.closePath(); P.fill(g, '#8a1a14');
      g.fillStyle = G.rgba(c.ice, 0.75); g.beginPath(); g.ellipse(12.8, 9.8, 3.6, 0.8, 0, 0, Math.PI * 2); g.fill();
      // the head, thrust forward: a long sack, a crooked peak bending back, one eye burning, a wide sewn mouth
      g.save(); g.translate(16.6, 5.4); g.rotate(0.1);
      g.beginPath(); g.moveTo(-3.4, 2.6); g.quadraticCurveTo(-4.4, -2.4, -1, -3.8); g.quadraticCurveTo(-2.6, -6.4, -6.6, -6.8); g.quadraticCurveTo(-1.4, -8.6, 1.6, -4.2); g.quadraticCurveTo(5.4, -3.2, 5.6, 1); g.quadraticCurveTo(5, 4.4, 1, 4.6); g.quadraticCurveTo(-2.6, 4.4, -3.4, 2.6); g.closePath();
      P.fill(g, P.lg(g, -6, -8, 6, 5, ['#ece8dc', '#c0b8a6', '#6a6254']));
      P.line(g, -1.6, -3.6, 1.8, -4, 0.7, twine);
      P.ell(g, 2.6, -0.8, 1.35, 1.2, VOID); P.circle(g, 2.7, -0.8, 0.75, eye); P.circle(g, 2.8, -0.9, 0.3, '#ffffff'); P.glow(g, 2.7, -0.8, 3, eye, 0.9);
      P.path(g, [-1.4, -1.6, 0.6, -1.2, 0.4, -0.6, -1.4, -0.8]); P.fill(g, VOID); // the other eye, a slit
      g.beginPath(); g.moveTo(-2.2, 1.4); g.quadraticCurveTo(1.4, 3.6, 5.2, 1); g.quadraticCurveTo(1.6, 2.2, -2.2, 1.4); g.closePath(); P.fill(g, '#0a0402'); // the grin
      g.beginPath(); g.moveTo(-2.2, 1.4); g.quadraticCurveTo(1.4, 3.6, 5.2, 1); g.lineWidth = 0.9; g.strokeStyle = '#0a0402'; g.stroke();
      g.strokeStyle = twine; g.lineWidth = 0.35; for (let i = 0; i < 4; i++) { const x = -1 + i * 1.5, y = 1.6 + Math.sin((i + 0.5) / 4 * Math.PI) * 0.9; g.beginPath(); g.moveTo(x, y - 0.7); g.lineTo(x + 0.3, y + 0.8); g.stroke(); } // stitches
      g.fillStyle = G.rgba(c.ice, 0.8); g.beginPath(); g.ellipse(-3.6, -6.4, 1.8, 0.5, -0.5, 0, Math.PI * 2); g.fill();
      g.restore();
      // the near arm, bent up to grip the scythe
      stick(15, 11.2, 20.2, 13.6, 0.9); stick(20.2, 13.6, 19.8, 18.8, 0.75); bind(20.2, 13.6, -0.4); straw(19.8, 19, 2.2, 5, 3);
    } });

  /* ---------- Vault Pylon (Sealed Reliquary): a runed obelisk feeding the Lord's seal ---------- */
  def('pylon', { w: 14, h: 26, cy: 20, frames: 2,
    colors: { stone: '#3a3440', rune: '#ffd060' },
    draw(g, f, c) {
      P.glow(g, 7, 4, 7, c.rune, f ? 0.8 : 0.55);
      P.ell(g, 7, 24.4, 6, 1.4, 'rgba(0,0,0,0.45)');
      P.path(g, [2.2, 24, 11.8, 24, 10.6, 21, 3.4, 21]); P.fill(g, sh(c.stone, -0.2));
      P.path(g, [3.6, 21, 10.4, 21, 9, 6, 5, 6]); P.fill(g, P.lg(g, 3, 6, 11, 21, [sh(c.stone, 0.3), c.stone, sh(c.stone, -0.55)]));
      g.strokeStyle = c.rune; g.lineWidth = 0.5; g.beginPath(); g.moveTo(7, 8); g.lineTo(7, 19); g.moveTo(5.6, 10); g.lineTo(8.4, 12); g.moveTo(8.4, 14); g.lineTo(5.8, 16); g.stroke();
      P.glow(g, 7, 13, 4, c.rune, 0.35);
      P.path(g, [5, 6, 7, 0.6, 9, 6]); P.fill(g, P.lg(g, 5, 0, 9, 6, ['#fff6c0', c.rune, sh(c.rune, -0.4)]));
    } });
})(window.DH);
