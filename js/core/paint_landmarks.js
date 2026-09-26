/* Landmarks: the ruins, columns and set pieces that stand in each hall.
 * Every painter takes the hall's variant: crypt (mossy grey stone), fire (scorched stone, embers), drowned (wet
 * stone, algae), ice (frosted stone, snow), purple (arcane stone, runes), bog (mossy, rotten), gold (gilded). */
(function (DH) {
  'use strict';
  const G = DH.gfx, P = G.P, sh = G.shade;
  const def = (name, o) => { G.painters[name] = o; };

  const BASE = { stone: '#6a6272', dark: '#2a2430', acc: '#5a7a3a', glow: '#000000' };
  const VAR = {
    fire: { stone: '#5a423c', dark: '#1e1210', acc: '#ff7a20', glow: '#ff7a20' },
    drowned: { stone: '#5e6e6c', dark: '#1e2a2a', acc: '#3a8a6a', glow: '#000000' },
    ice: { stone: '#7a8a9c', dark: '#26303c', acc: '#e8f6ff', glow: '#8fe0ff' },
    purple: { stone: '#4e4468', dark: '#1a1426', acc: '#c070ff', glow: '#c070ff' },
    bog: { stone: '#565a44', dark: '#1e2014', acc: '#7a9a30', glow: '#b0ff50' },
    gold: { stone: '#6e5e4c', dark: '#241c14', acc: '#ffd040', glow: '#ffd040' },
  };
  const land = (name, o) => def(name, Object.assign({ colors: BASE, variants: VAR }, o));
  const shadow = (g, x, y, rx, ry) => P.ell(g, x, y, rx, ry || rx * 0.28, 'rgba(0,0,0,0.5)');
  // a lit stone face: light from the top-left
  const stoneX = (g, x0, x1, c) => P.lg(g, x0, 0, x1, 0, [sh(c.stone, 0.3), c.stone, sh(c.stone, -0.45)]);
  const stoneY = (g, y0, y1, c) => P.lg(g, 0, y0, 0, y1, [sh(c.stone, 0.4), sh(c.stone, -0.25)]);
  function cracks(g, pts, c) { g.strokeStyle = G.rgba(c.dark, 0.8); g.lineWidth = 0.5; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
  /** The hall's accent on a piece of stone: moss, embers, algae, snow, runes or gilding. */
  function accent(g, c, x, y, w, kind) {
    if (c.acc === BASE.acc || c.acc === VAR.bog.acc || c.acc === VAR.drowned.acc) { // moss / algae patches
      for (let i = 0; i < 5; i++) P.ell(g, x + (i * 0.23 % 1) * w, y + (i % 2) * 1.2, 1.4 + (i % 3) * 0.6, 0.9, G.rgba(c.acc, 0.8));
    } else if (c.acc === VAR.ice.acc && kind === 'top') { // snow cap
      P.path(g, [x - 0.6, y + 1, x + w * 0.2, y - 1.4, x + w * 0.6, y - 1, x + w + 0.6, y + 0.4, x + w, y + 2, x, y + 2]); P.fill(g, P.lg(g, 0, y - 1.5, 0, y + 2, ['#ffffff', '#c8e4f4']));
      for (let i = 0; i < 3; i++) { const ix = x + w * (0.2 + i * 0.3); P.path(g, [ix - 0.7, y + 1.8, ix + 0.7, y + 1.8, ix, y + 4.5 + i % 2 * 1.5]); P.fill(g, '#d8f2ff'); }
    } else if (c.acc === VAR.fire.acc) { // glowing cracks
      g.strokeStyle = '#ff8a30'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + w * 0.3, y); g.lineTo(x + w * 0.45, y + 3); g.lineTo(x + w * 0.35, y + 6); g.stroke();
      P.glow(g, x + w * 0.4, y + 3, 3.4, '#ff6a20', 0.5);
    } else if (c.acc === VAR.purple.acc) { // a rune
      g.strokeStyle = c.acc; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2 - 1.4, y + 2); g.lineTo(x + w / 2 + 1.4, y + 3); g.lineTo(x + w / 2, y + 5); g.stroke();
      P.glow(g, x + w / 2, y + 2.5, 3.6, c.acc, 0.45);
    } else if (c.acc === VAR.gold.acc) { // a gilded band
      P.rect(g, x, y, w, 1.6, P.lg(g, x, 0, x + w, 0, ['#fff0a0', '#d8a830', '#7a5410']));
    }
  }

  /* ---------- columns ---------- */
  land('lm_column', { w: 18, h: 62, cy: 58, draw(g, f, c) {
    shadow(g, 9, 58.4, 8.6, 2.4);
    P.rrect(g, 1, 51, 16, 7, 1, stoneY(g, 51, 58, c)); P.rrect(g, 2, 49, 14, 3, 0.8, stoneY(g, 49, 52, c));
    P.path(g, [4, 49, 4.6, 13, 13.4, 13, 14, 49]); P.fill(g, stoneX(g, 4, 14, c));
    g.strokeStyle = G.rgba(c.dark, 0.55); g.lineWidth = 0.6;
    for (const x of [6.4, 9, 11.6]) { g.beginPath(); g.moveTo(x, 14.5); g.lineTo(x + (x - 9) * 0.03, 48); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(5.4, 14.5); g.lineTo(5.2, 48); g.stroke();
    P.rrect(g, 2.4, 9, 13.2, 4.6, 1.4, stoneY(g, 9, 14, c)); P.rrect(g, 0.6, 5.6, 16.8, 3.6, 0.6, stoneY(g, 5.6, 9.2, c));
    cracks(g, [11, 22, 12.4, 27, 11.2, 31, 12.6, 36], c);
    if (c.acc === VAR.gold.acc) { accent(g, c, 4.4, 17, 9.4); accent(g, c, 4.2, 44, 9.8); }
    else if (c.acc === VAR.ice.acc) accent(g, c, 0.6, 5, 16.8, 'top');
    else if (c.acc === VAR.purple.acc) { accent(g, c, 4.6, 22, 8.8); accent(g, c, 4.6, 34, 8.8); }
    else if (c.acc === VAR.fire.acc) accent(g, c, 5, 30, 8);
    else { accent(g, c, 3, 48.4, 12); accent(g, c, 5, 12.6, 8); }
  } });
  land('lm_colbroken', { w: 22, h: 40, cy: 36, draw(g, f, c) {
    shadow(g, 10, 36.4, 9.6, 2.4);
    P.rrect(g, 1, 29, 16, 7, 1, stoneY(g, 29, 36, c)); P.rrect(g, 2, 27, 14, 3, 0.8, stoneY(g, 27, 30, c));
    P.path(g, [4, 27, 4.4, 12, 6.4, 9, 8, 13, 10, 7.4, 11.4, 12, 13.6, 10.6, 14, 27]); P.fill(g, stoneX(g, 4, 14, c));
    P.path(g, [4.4, 12, 6.4, 9, 8, 13, 10, 7.4, 11.4, 12, 13.6, 10.6, 12.6, 13.4, 5.6, 13.6]); P.fill(g, sh(c.stone, -0.2));
    g.strokeStyle = G.rgba(c.dark, 0.55); g.lineWidth = 0.6; for (const x of [6.4, 9, 11.6]) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 26.4); g.stroke(); }
    // the fallen drum lying beside it
    P.ell(g, 18.6, 35.4, 3.4, 1.2, 'rgba(0,0,0,0.45)');
    P.rrect(g, 12.6, 30, 8.6, 5.4, 1.2, stoneY(g, 30, 35.4, c)); P.ell(g, 21, 32.7, 1.4, 2.7, sh(c.stone, -0.35));
    accent(g, c, 3.4, 26.6, 10);
    if (c.acc === VAR.ice.acc) accent(g, c, 4.2, 10.6, 9.6, 'top');
  } });

  /* ---------- a ruined wall with a gothic window ---------- */
  land('lm_wall', { w: 72, h: 54, cy: 48, draw(g, f, c) {
    shadow(g, 36, 48.6, 34, 3.2);
    const top = [1, 8, 9, 6, 15, 10, 22, 9, 27, 14, 33, 13, 38, 20, 45, 21, 50, 27, 57, 29, 61, 34, 67, 36, 71, 40];
    P.path(g, [1, 47].concat(top, [71, 47])); P.fill(g, P.lg(g, 0, 6, 0, 47, [sh(c.stone, 0.15), c.stone, sh(c.stone, -0.4)]));
    // brick courses
    g.save(); P.path(g, [1, 47].concat(top, [71, 47])); g.clip();
    g.strokeStyle = G.rgba(c.dark, 0.6); g.lineWidth = 0.55;
    for (let y = 11, r = 0; y < 47; y += 4, r++) { g.beginPath(); g.moveTo(0, y); g.lineTo(72, y); g.stroke(); for (let x = (r & 1) ? 3 : 7; x < 72; x += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 4); g.stroke(); } }
    g.fillStyle = 'rgba(255,255,255,0.07)'; for (let y = 11; y < 47; y += 4) g.fillRect(0, y + 0.6, 72, 0.6);
    g.restore();
    // the pointed window: darkness behind, a sill below
    P.path(g, [13, 36, 13, 22, 18, 15, 23, 22, 23, 36]); P.fill(g, '#07050a');
    P.path(g, [14.4, 36, 14.4, 23, 18, 17.4, 21.6, 23, 21.6, 36]); P.fill(g, P.lg(g, 0, 17, 0, 36, [G.rgba(c.glow === '#000000' ? '#3a3050' : c.glow, 0.35), 'rgba(0,0,0,0)']));
    P.rect(g, 18, 18, 0.9, 18, sh(c.stone, -0.3));
    P.rrect(g, 11.6, 35.6, 12.8, 2.2, 0.4, stoneY(g, 35.6, 38, c));
    // a doorway fallen in on the right
    P.path(g, [42, 47, 42, 33, 47, 29, 52, 33, 52, 47]); P.fill(g, '#0a080c');
    cracks(g, [30, 16, 31, 24, 29, 30, 31, 38], c); cracks(g, [60, 35, 58, 41, 60, 46], c);
    // rubble at its foot
    for (const [x, y, r] of [[40, 47, 3.4], [45, 46.4, 2.4], [55, 47.4, 3], [8, 47.6, 2.6], [63, 47, 2.2], [49, 48, 1.8]]) P.circle(g, x, y, r, P.vol(g, x, y, r, c.stone));
    accent(g, c, 2, 44.4, 20); accent(g, c, 30, 12, 8);
    if (c.acc === VAR.ice.acc) { accent(g, c, 1, 7, 14, 'top'); accent(g, c, 27, 13, 12, 'top'); }
  } });

  /* ---------- a ruined gateway ---------- */
  land('lm_arch', { w: 62, h: 68, cy: 62, draw(g, f, c) {
    shadow(g, 31, 62.4, 28, 3);
    for (const x0 of [4, 47]) {
      P.rrect(g, x0 - 2, 55, 15, 7, 1, stoneY(g, 55, 62, c));
      P.path(g, [x0, 55, x0, 22, x0 + 11, 22, x0 + 11, 55]); P.fill(g, stoneX(g, x0, x0 + 11, c));
      g.strokeStyle = G.rgba(c.dark, 0.55); g.lineWidth = 0.5; for (let y = 26; y < 55; y += 5) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 11, y); g.stroke(); }
      P.rrect(g, x0 - 1.4, 19, 13.8, 3.6, 0.6, stoneY(g, 19, 22.6, c));
    }
    // the pointed arch, its right shoulder fallen away
    g.beginPath(); g.moveTo(3, 20); g.quadraticCurveTo(6, 4, 31, 2); g.lineTo(38, 3.4); g.lineTo(40, 8); g.lineTo(36, 10.6); g.quadraticCurveTo(16, 11, 15, 20); g.closePath();
    P.fill(g, P.lg(g, 0, 2, 0, 20, [sh(c.stone, 0.35), c.stone, sh(c.stone, -0.3)]));
    g.strokeStyle = G.rgba(c.dark, 0.6); g.lineWidth = 0.5; for (const [x1, y1, x2, y2] of [[8, 14, 13, 17], [13, 8, 17, 12], [20, 4.6, 22, 9.6], [28, 3, 29, 9]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    P.path(g, [47, 20, 50, 13, 53, 16, 58, 12, 59, 20]); P.fill(g, stoneX(g, 47, 59, c)); // the stump on the right
    // keystone: a carved skull (fire), a rune (arcane), a crown (gold), else a plain block
    P.rrect(g, 27, 1.6, 7, 8, 1, stoneY(g, 1.6, 9.6, c));
    if (c.acc === VAR.fire.acc) { P.circle(g, 30.5, 5.2, 2.6, '#c8b89a'); P.circle(g, 29.4, 5, 0.7, '#ff6a20'); P.circle(g, 31.6, 5, 0.7, '#ff6a20'); P.glow(g, 30.5, 5, 4, '#ff6a20', 0.6); }
    else if (c.acc === VAR.purple.acc || c.acc === VAR.gold.acc) accent(g, c, 27.6, 3, 5.8);
    // fallen blocks under the gap
    for (const [x, y, r] of [[36, 60.6, 3.2], [41, 61, 2.4], [32, 61.4, 2]]) P.circle(g, x, y, r, P.vol(g, x, y, r, c.stone));
    accent(g, c, 3, 54, 12); accent(g, c, 46, 54.4, 12);
    if (c.acc === VAR.ice.acc) accent(g, c, 6, 4, 26, 'top');
  } });

  /* ---------- graves, statues, rubble ---------- */
  land('lm_tomb', { w: 12, h: 18, cy: 16, frames: 2, draw(g, f, c) {
    shadow(g, 6, 16.4, 5.4, 1.6);
    if (f) { P.path(g, [4.6, 16, 4.6, 7, 1.4, 7, 1.4, 4.6, 4.6, 4.6, 4.6, 1, 7.4, 1, 7.4, 4.6, 10.6, 4.6, 10.6, 7, 7.4, 7, 7.4, 16]); P.fill(g, stoneX(g, 1.4, 10.6, c)); }
    else { g.beginPath(); g.moveTo(1.6, 16); g.lineTo(1.6, 6); g.arc(6, 6, 4.4, Math.PI, 0); g.lineTo(10.4, 16); g.closePath(); P.fill(g, stoneX(g, 1.6, 10.4, c));
      g.strokeStyle = G.rgba(c.dark, 0.7); g.lineWidth = 0.55; g.beginPath(); g.moveTo(6, 5); g.lineTo(6, 10); g.moveTo(4.2, 6.6); g.lineTo(7.8, 6.6); g.stroke(); }
    P.rect(g, 0.6, 14.6, 10.8, 1.8, sh(c.stone, -0.3));
    accent(g, c, 1.6, 14.2, 8);
    if (c.acc === VAR.ice.acc) accent(g, c, 2, 2.6, 8, 'top');
  } });
  land('lm_statue', { w: 24, h: 50, cy: 46, draw(g, f, c) {
    shadow(g, 12, 46.4, 10.6, 2.4);
    P.rrect(g, 2, 38, 20, 8.4, 1, stoneY(g, 38, 46.4, c)); P.rrect(g, 3.6, 35.6, 16.8, 3, 0.6, stoneY(g, 35.6, 38.6, c));
    // a hooded mourner, both hands on the pommel of a sword planted before it
    const robe = P.lg(g, 4, 0, 20, 0, [sh(c.stone, 0.35), c.stone, sh(c.stone, -0.55)]);
    P.path(g, [4.4, 35.6, 5.4, 26, 5.6, 19, 7.4, 15.6, 12, 14.4, 16.6, 15.6, 18.4, 19, 18.6, 26, 19.6, 35.6]); P.fill(g, robe);
    g.beginPath(); g.moveTo(7.2, 16.4); g.quadraticCurveTo(6.6, 6, 12, 4.6); g.quadraticCurveTo(17.4, 6, 16.8, 16.4); g.quadraticCurveTo(12, 18, 7.2, 16.4); P.fill(g, P.lg(g, 7, 0, 17, 0, [sh(c.stone, 0.45), sh(c.stone, 0.05), sh(c.stone, -0.4)]));
    g.beginPath(); g.moveTo(9, 15.6); g.quadraticCurveTo(9, 9, 12, 8.2); g.quadraticCurveTo(15, 9, 15, 15.6); g.closePath(); P.fill(g, '#0a080c'); // the face lost in the hood
    if (c.glow !== '#000000') { P.circle(g, 10.9, 12, 0.55, c.glow); P.circle(g, 13.1, 12, 0.55, c.glow); P.glow(g, 12, 12, 3.4, c.glow, 0.55); }
    g.strokeStyle = G.rgba(c.dark, 0.6); g.lineWidth = 0.6; for (const x of [8, 10.4, 13.6, 16]) { g.beginPath(); g.moveTo(x, 24); g.quadraticCurveTo(x - 0.4, 30, x - 0.8 + (x > 12 ? 1.4 : 0), 35.4); g.stroke(); }
    // arms folded down to the hilt, the blade to the plinth
    g.strokeStyle = sh(c.stone, 0.1); g.lineWidth = 2; g.beginPath(); g.moveTo(7, 19); g.quadraticCurveTo(8, 22.6, 11, 23.4); g.moveTo(17, 19); g.quadraticCurveTo(16, 22.6, 13, 23.4); g.stroke();
    P.path(g, [11.3, 25.4, 12.7, 25.4, 12.5, 36, 11.5, 36]); P.fill(g, P.lg(g, 11, 0, 13, 0, [sh(c.stone, 0.6), sh(c.stone, 0.1)]));
    P.rect(g, 9, 24.4, 6, 1.3, sh(c.stone, 0.35)); P.circle(g, 12, 23, 1.5, P.vol(g, 12, 23, 1.5, sh(c.stone, 0.2)));
    cracks(g, [17, 26, 16, 30, 17.4, 34], c);
    if (c.acc === VAR.gold.acc) { accent(g, c, 3.6, 36, 16.8); accent(g, c, 9, 24.2, 6); }
    else accent(g, c, 2.6, 44.6, 18.8);
    if (c.acc === VAR.ice.acc) accent(g, c, 8, 5, 8, 'top');
  } });
  land('lm_rubble', { w: 28, h: 14, cy: 11, draw(g, f, c) {
    shadow(g, 14, 11.4, 13, 2.2);
    for (const [x, y, w, h] of [[2, 6, 8, 5], [9, 3, 9, 8], [17, 5.4, 8, 5.6], [6, 1.4, 6, 4], [14, 8, 6, 3.4]]) P.rrect(g, x, y, w, h, 1, P.lg(g, x, y, x + w * 0.4, y + h, [sh(c.stone, 0.35), c.stone, sh(c.stone, -0.45)]));
    for (const [x, y, r] of [[24, 10, 1.6], [1.6, 10.4, 1.2], [21, 2.6, 1.2]]) P.circle(g, x, y, r, P.vol(g, x, y, r, c.stone));
    accent(g, c, 4, 10, 18);
  } });

  /* ---------- the ritual dais, its fire pillars, obsidian spires ---------- */
  land('lm_dais', { w: 112, h: 68, cy: 34, draw(g, f, c) {
    P.ell(g, 56, 36, 55, 32, 'rgba(0,0,0,0.45)');
    P.ell(g, 56, 34, 54, 31, P.lg(g, 0, 3, 0, 65, [sh(c.stone, -0.05), sh(c.stone, -0.35)]));
    P.ell(g, 56, 33, 50, 28, P.rg(g, 56, 33, 50, [[0, sh(c.stone, -0.25)], [0.7, sh(c.stone, -0.1)], [1, sh(c.stone, 0.1)]]));
    // concentric carved rings and spokes
    g.strokeStyle = G.rgba(c.dark, 0.7); g.lineWidth = 0.7;
    for (const k of [0.78, 0.5, 0.24]) { g.beginPath(); g.ellipse(56, 33, 50 * k, 28 * k, 0, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(56 + Math.cos(a) * 12, 33 + Math.sin(a) * 6.7); g.lineTo(56 + Math.cos(a) * 39, 33 + Math.sin(a) * 21.8); g.stroke(); }
    // a glowing sigil at its heart
    if (c.glow !== '#000000') {
      g.strokeStyle = G.rgba(c.glow, 0.85); g.lineWidth = 0.8; g.beginPath();
      for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; const x = 56 + Math.cos(a) * 11, y = 33 + Math.sin(a) * 6.2; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); P.glow(g, 56, 33, 16, c.glow, 0.35);
    }
    // rim stones
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, x = 56 + Math.cos(a) * 52, y = 34 + Math.sin(a) * 29.6; P.rrect(g, x - 2.4, y - 1.4, 4.8, 2.8, 0.6, sh(c.stone, Math.sin(a) > 0 ? -0.2 : 0.15)); }
    cracks(g, [20, 30, 28, 34, 26, 40], c); cracks(g, [82, 22, 88, 27, 94, 26], c);
  } });
  land('lm_firepillar', { w: 16, h: 34, cy: 31, frames: 2, draw(g, f, c) {
    shadow(g, 8, 31.4, 7, 2);
    P.rrect(g, 1.4, 25, 13.2, 6.4, 1, stoneY(g, 25, 31.4, c));
    P.path(g, [3.6, 25, 4.2, 11, 11.8, 11, 12.4, 25]); P.fill(g, stoneX(g, 3.6, 12.4, c));
    P.rect(g, 3.4, 14, 9.2, 1.4, P.lg(g, 3, 0, 13, 0, ['#fff0a0', '#c89030', '#6a4a14'])); P.rect(g, 3.8, 21, 8.4, 1.2, P.lg(g, 3, 0, 13, 0, ['#fff0a0', '#c89030', '#6a4a14']));
    // the bronze bowl and its flame
    P.path(g, [1, 8, 15, 8, 12.4, 12, 3.6, 12]); P.fill(g, P.lg(g, 0, 8, 0, 12, ['#e8c060', '#8a5a18', '#3a2408']));
    P.ell(g, 8, 8.2, 7, 1.4, P.lg(g, 1, 8, 15, 8, ['#ff5020', '#ffd040', '#ff5020']));
    P.glow(g, 8, 4.6, 9, '#ff8a20', f ? 0.9 : 0.7);
    g.beginPath(); g.moveTo(3.6, 8); g.quadraticCurveTo(4.4, 2.4, 8, f ? 0 : 1); g.quadraticCurveTo(11.6, 2.4, 12.4, 8); g.closePath(); P.fill(g, P.lg(g, 0, 0, 0, 8, ['#fff4b0', '#ffb030', '#e04010']));
    g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(6.4, 4.4, 8, f ? 2.6 : 3.6); g.quadraticCurveTo(9.6, 4.4, 10, 8); g.closePath(); P.fill(g, '#fff8d0');
  } });
  land('lm_spire', { w: 24, h: 52, cy: 48, draw(g, f, c) {
    shadow(g, 12, 48.4, 11, 2.6);
    P.path(g, [2, 48, 5, 30, 4, 22, 8, 12, 10, 1, 13, 10, 16, 6, 17, 20, 20, 28, 22, 48]); P.fill(g, P.lg(g, 2, 0, 22, 0, ['#4a3a44', '#1a1216', '#07050a']));
    P.path(g, [10, 1, 13, 10, 11.6, 24, 9, 34, 8, 12]); P.fill(g, 'rgba(255,255,255,0.08)');
    g.strokeStyle = '#ff7a20'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(9, 46); g.lineTo(11, 36); g.lineTo(9.6, 28); g.lineTo(12, 18); g.moveTo(11, 36); g.lineTo(15, 31); g.stroke();
    P.glow(g, 11, 34, 8, '#ff6a20', 0.5);
    for (const [x, y, r] of [[3, 47.4, 2], [20, 47.6, 2.4]]) P.circle(g, x, y, r, P.vol(g, x, y, r, '#2a2026'));
  } });

  /* ---------- Frozen Catacombs ---------- */
  land('lm_stalag', { w: 30, h: 46, cy: 42, draw(g, f, c) {
    shadow(g, 15, 42.4, 13, 2.6);
    P.glow(g, 15, 26, 16, '#8fe0ff', 0.3);
    const ice = (pts, hl) => { P.path(g, pts); P.fill(g, P.lg(g, pts[0], 0, pts[4], 0, ['#ffffff', '#9fdcff', '#2e6a9a'])); P.path(g, hl); P.fill(g, 'rgba(255,255,255,0.6)'); };
    ice([2, 42, 6, 20, 11, 42], [6, 20, 6.8, 32, 5.2, 32]);
    ice([18, 42, 23, 16, 28, 42], [23, 16, 23.8, 28, 22.2, 28]);
    ice([7, 42, 14, 1, 21, 42], [14, 1, 15.2, 20, 13, 20]);
    P.path(g, [0, 42.4, 4, 38.6, 10, 40, 16, 37.6, 22, 39.6, 28, 38.4, 30, 42.4]); P.fill(g, P.lg(g, 0, 37, 0, 43, ['#ffffff', '#c8e4f4']));
  } });
  // a warrior frozen mid-fight: the body (solid) and the ice around it (lm_frozen_ice, translucent, drawn on top)
  land('lm_frozen', { w: 28, h: 40, cy: 36, draw(g, f, c) {
    shadow(g, 14, 36.4, 13, 2.6);
    P.ell(g, 14, 35.4, 12.6, 3, P.lg(g, 0, 32, 0, 38, ['#ffffff', '#b8d8ec'])); // the frozen pool it stands in
    // a warrior caught by the cold mid-stride: one arm thrown up before the face, the sword trailing behind
    const skin = '#aabccb', mail = '#4c5a68', plate = '#6a7a8a', cloak = '#263240', leather = '#3a3632';
    const limb = (pts, w, col) => { g.strokeStyle = '#0c1016'; g.lineWidth = w + 1.2; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
    // the cloak, blown back and frozen stiff
    P.path(g, [9.6, 12.4, 18.6, 12, 22, 18, 24.6, 27, 22.4, 26, 23, 31, 19.6, 28.6, 17, 31.4, 16, 22]); P.fill(g, P.lg(g, 10, 0, 25, 0, ['#3a4a5c', cloak, '#141c26']));
    // legs: the front one bent, the back one braced
    limb([12, 21, 10, 27, 8.4, 32.6], 2.6, leather); limb([15.4, 21, 16.6, 27, 18.4, 32.6], 2.6, leather);
    P.rrect(g, 6, 31.4, 4.6, 2.2, 0.8, '#1c1a18'); P.rrect(g, 17, 31.4, 4.6, 2.2, 0.8, '#1c1a18');
    // the body: mail shirt, breastplate, belt
    P.path(g, [9.4, 12.6, 18.4, 12.4, 17, 21.6, 10.6, 21.6]); P.fill(g, P.lg(g, 9, 0, 18, 0, [sh(mail, 0.3), mail, sh(mail, -0.4)]));
    P.path(g, [10.4, 13, 17.4, 12.8, 16.4, 18.4, 11.4, 18.4]); P.fill(g, P.lg(g, 10, 12, 17, 18, [sh(plate, 0.5), plate, sh(plate, -0.35)]));
    P.rect(g, 10.4, 20, 7, 1.3, '#2a2218'); P.rect(g, 13.3, 19.8, 1.4, 1.7, '#8a8a70');
    // the sword arm, trailing, the blade reaching back to the ice
    limb([17.8, 13.4, 20.4, 17.4, 21.6, 20.6], 2.2, mail);
    g.strokeStyle = '#0c1016'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(21.6, 20.6); g.lineTo(25.4, 30.6); g.stroke();
    g.strokeStyle = '#c8d4de'; g.lineWidth = 1; g.beginPath(); g.moveTo(21.6, 20.6); g.lineTo(25.4, 30.6); g.stroke();
    P.line(g, 20, 21.8, 23.2, 19.8, 1, '#5a5040'); P.circle(g, 21.6, 20.6, 1, skin);
    // the shielding arm, thrown up before the face
    limb([9.8, 13.4, 6.6, 11, 9.6, 6.8], 2.2, mail); P.circle(g, 10, 6.6, 1.2, skin);
    // the head, turned from the cold: pale, eyes shut, hair white with rime
    P.circle(g, 13.8, 9, 2.8, '#0c1016'); P.circle(g, 13.8, 9, 2.3, P.vol(g, 13.8, 9, 2.3, skin));
    P.path(g, [11.2, 8.4, 12, 6, 14.6, 5.6, 16.6, 7.2, 16.4, 9, 14.6, 7.6, 12.6, 8.2]); P.fill(g, '#dfeaf2');
    P.line(g, 14.4, 9.4, 15.6, 9.2, 0.45, '#3a4450'); P.line(g, 14.8, 11, 15.8, 10.8, 0.45, '#5a4a50');
    // hoarfrost on everything facing up
    for (const [x, y, w] of [[9.8, 12.4, 3.6], [15.4, 12.2, 3.2], [10.4, 12.9, 2], [6.4, 10.4, 2.4], [19.6, 16.6, 2.2]]) P.rect(g, x, y, w, 0.7, 'rgba(236,248,255,0.95)');
  } });
  def('lm_frozen_ice', { w: 28, h: 40, cy: 36, soft: true, draw(g) {
    const blk = [2.4, 35, 1, 16, 3.6, 5, 9, 1.4, 19, 0.6, 25, 4.4, 27.4, 14, 26, 35];
    P.path(g, blk); P.fill(g, P.lg(g, 0, 0, 28, 38, ['rgba(236,250,255,0.34)', 'rgba(150,210,245,0.16)', 'rgba(70,140,200,0.3)']));
    // facets: a lit face on the left, a shaded one on the right
    P.path(g, [1, 16, 3.6, 5, 9, 1.4, 8, 14, 5, 35, 2.4, 35]); P.fill(g, 'rgba(255,255,255,0.14)');
    P.path(g, [19, 0.6, 25, 4.4, 27.4, 14, 26, 35, 20, 35, 21, 12]); P.fill(g, 'rgba(20,70,120,0.22)');
    // bright edges and streaks
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 0.6; P.path(g, blk); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 0.9;
    for (const [x1, y1, x2, y2] of [[4.4, 8, 6.4, 18], [5, 22, 5.8, 28], [22, 6, 23.4, 11], [11, 3, 16, 2.4]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 0.4; // cracks
    for (const pts of [[17, 18, 19.6, 22, 18.4, 26, 21, 30], [8, 27, 10.6, 24, 12, 27.4], [22.6, 16, 25.6, 19]]) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); }
    // rime creeping up from the base
    P.path(g, [2.4, 35, 3, 30, 6, 32, 9, 29.4, 13, 31.6, 17, 29, 21, 31.4, 24, 29.6, 26, 35]); P.fill(g, 'rgba(240,250,255,0.75)');
  } });

  /* ---------- Halls of Discord ---------- */
  land('lm_obelisk', { w: 16, h: 60, cy: 56, frames: 2, draw(g, f, c) {
    shadow(g, 8, 56.4, 7.4, 2);
    P.rrect(g, 1, 50, 14, 6.4, 1, stoneY(g, 50, 56.4, c));
    P.path(g, [3, 50, 4.6, 9, 8, 3, 11.4, 9, 13, 50]); P.fill(g, P.lg(g, 3, 0, 13, 0, [sh(c.stone, 0.25), sh(c.stone, -0.2), sh(c.stone, -0.6)]));
    P.path(g, [4.6, 9, 8, 3, 11.4, 9]); P.fill(g, sh(c.stone, 0.4));
    const gl = c.glow === '#000000' ? '#c070ff' : c.glow;
    g.strokeStyle = G.rgba(gl, f ? 1 : 0.7); g.lineWidth = 0.7;
    for (let i = 0; i < 6; i++) { const y = 14 + i * 6; g.beginPath(); g.moveTo(8, y); g.lineTo(6.8 + (i % 2) * 2.4, y + 2); g.lineTo(8, y + 4); g.stroke(); }
    P.glow(g, 8, 28, 10, gl, f ? 0.5 : 0.32);
  } });
  land('lm_crystal', { w: 26, h: 34, cy: 31, frames: 2, draw(g, f, c) {
    shadow(g, 13, 31.4, 11, 2.2);
    const gl = c.glow === '#000000' ? '#c070ff' : c.glow;
    P.glow(g, 13, 20, 14, gl, f ? 0.55 : 0.38);
    // faceted prisms: a flat-sided body with a short cut tip, lit face and shaded face
    const prism = (x, w, h, lean) => {
      const b = 31, t = b - h, tip = t - w * 0.7;
      P.path(g, [x, b, x + lean, t, x + w / 2 + lean, tip, x + w + lean, t, x + w, b]); P.fill(g, P.lg(g, x, 0, x + w, 0, [sh(gl, 0.55), gl, sh(gl, -0.5)]));
      P.path(g, [x + w / 2, b, x + w / 2 + lean, t + 0.4, x + w / 2 + lean, tip, x + w + lean, t, x + w, b]); P.fill(g, G.rgba(sh(gl, -0.6), 0.45));
      P.path(g, [x + 0.8 + lean * 0.8, t + 2, x + w * 0.3 + lean * 0.8, t + 1, x + w * 0.3, b - 3, x + 0.8, b - 2]); P.fill(g, 'rgba(255,255,255,0.35)');
    };
    prism(2.4, 6, 11, -1.6); prism(16.4, 6.4, 14, 1.8); prism(8.4, 8.4, 22, 0);
    for (const [x, y, r] of [[4, 30.6, 2], [22, 30.8, 2.2], [13, 31, 2.4]]) P.circle(g, x, y, r, P.vol(g, x, y, r, c.stone));
  } });

  /* ---------- Blightmire ---------- */
  land('lm_deadtree', { w: 46, h: 62, cy: 58, draw(g, f, c) {
    shadow(g, 23, 58.4, 17, 3);
    const bark = P.lg(g, 14, 0, 32, 0, ['#5a4a30', '#2e2414', '#120c06']);
    P.path(g, [15, 58, 18, 44, 17, 30, 10, 20, 3, 17, 4, 15, 12, 17, 19, 25, 21, 12, 17, 4, 20, 3, 24, 11, 26, 22, 33, 13, 42, 9, 43, 11, 35, 17, 29, 30, 28, 44, 33, 58]); P.fill(g, bark);
    g.strokeStyle = '#2e2414'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(15, 58); g.lineTo(8, 60); g.moveTo(33, 58); g.lineTo(41, 60); g.moveTo(24, 58); g.lineTo(24, 61); g.stroke();
    // hanging moss
    g.strokeStyle = G.rgba(c.acc === VAR.bog.acc ? '#7a9a30' : '#5a6a3a', 0.85); g.lineWidth = 0.9;
    for (const [x, y, l] of [[6, 17, 9], [12, 18, 6], [36, 14, 10], [40, 11, 7], [20, 6, 5], [30, 20, 8]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y + l / 2, x - 0.6, y + l); g.stroke(); }
    P.ell(g, 23, 40, 2.4, 3.4, '#0a0602'); // a knot hole
  } });
  // an abandoned hut sinking into the bog, swallowed by moss, ivy and ferns; one window still holds a dim candle
  land('lm_hut', { w: 68, h: 72, cy: 66, frames: 2, draw(g, f, c) {
    shadow(g, 34, 66.4, 31, 3.6);
    const leaf = (x, y, r, col) => P.ell(g, x, y, r, r * 0.62, col, (x * 7 + y) % 3 - 1);
    const MOSS = ['#1c2610', '#2a3818', '#3a4c20', '#4e6428'], wood = (x0, x1) => P.lg(g, x0, 0, x1, 0, ['#4e4838', '#2e2a20', '#16140e']);
    // short, sagging stilts sunk in the mud, furred with moss, pale mushrooms on them
    for (const [x, lean] of [[14, -1.6], [30, 0.6], [44, -0.8], [56, 1.6]]) {
      g.strokeStyle = '#0c0a06'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x, 50); g.lineTo(x + lean, 65); g.stroke();
      g.strokeStyle = '#3a3426'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 50); g.lineTo(x + lean, 65); g.stroke();
      P.ell(g, x + lean * 0.6, 60, 1.8, 3, MOSS[2]);
    }
    for (const [x, y] of [[15.4, 55], [45, 57.4], [57, 54]]) { P.ell(g, x, y, 1.8, 0.8, '#d8d0b8'); P.rect(g, x - 0.4, y, 0.8, 1.4, '#b8b098'); }
    // the rotten platform, sagging at one end
    P.path(g, [8, 49, 60, 47, 61, 51.6, 7, 53.4]); P.fill(g, P.lg(g, 0, 47, 0, 53, ['#4a4434', '#1a1810']));
    g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 0.5; for (let x = 12; x < 60; x += 5) { g.beginPath(); g.moveTo(x, 48); g.lineTo(x - 0.3, 53); g.stroke(); }
    // walls of grey, weathered planks, one side bowed
    P.path(g, [12, 49, 11.4, 27, 56.6, 25, 56, 47.6]); P.fill(g, wood(11, 57));
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 0.6; for (let i = 0; i < 12; i++) { const x = 14.6 + i * 3.7; g.beginPath(); g.moveTo(x, 26.8 - i * 0.16); g.lineTo(x, 48.4); g.stroke(); }
    g.strokeStyle = 'rgba(200,200,170,0.07)'; for (let i = 0; i < 12; i++) { const x = 15.6 + i * 3.7; g.beginPath(); g.moveTo(x, 27 - i * 0.16); g.lineTo(x, 48.2); g.stroke(); }
    P.path(g, [40, 31, 44, 30.6, 43, 36, 40.6, 35]); P.fill(g, '#0a0806'); // a plank torn away
    // a low doorway, half hidden behind hanging vines
    P.path(g, [24, 48.6, 24, 34, 33, 33.2, 33, 48.4]); P.fill(g, '#060504');
    P.rect(g, 23, 32.4, 11, 1.6, '#2a2418');
    // one small window with a dim candle behind cracked shutters; the other boarded up
    P.rect(g, 43.6, 36.6, 7.4, 6, '#0a0804');
    P.rect(g, 44.4, 37.4, 5.8, 4.4, P.rg(g, 47.3, 39.6, 4.4, [[0, f ? '#f0c060' : '#d8a040'], [0.5, '#7a5418'], [1, '#1a1206']]));
    P.rect(g, 47, 36.6, 0.8, 6, '#1a1408'); P.rect(g, 43.6, 39.2, 7.4, 0.7, '#1a1408');
    P.path(g, [42.4, 36, 43.6, 36.6, 43.6, 42.6, 42, 43.4]); P.fill(g, '#3a3426'); // a hanging shutter
    P.rect(g, 15, 35, 6.4, 6.4, '#0a0806'); // the other window, boarded up
    for (const y of [35.6, 38.4]) { P.path(g, [14.4, y + 0.6, 22, y - 0.4, 22, y + 1.2, 14.4, y + 2.2]); P.fill(g, '#4a4434'); }
    // a crooked stone chimney, cold and overgrown
    P.path(g, [46, 16, 45.4, 4, 51, 3.4, 51.4, 15]); P.fill(g, P.lg(g, 45, 0, 52, 0, ['#5a5a50', '#34342e', '#1a1a16']));
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.5; for (const y of [6.4, 9.4, 12.4]) { g.beginPath(); g.moveTo(45.6, y); g.lineTo(51.2, y - 0.3); g.stroke(); }
    leaf(47, 4, 2.2, MOSS[2]); leaf(50, 3.6, 1.6, MOSS[3]);
    // the roof: a heavy, sagging mat of moss and turf
    const roof = [5, 29, 12, 17, 22, 10, 34, 7, 46, 9.6, 56, 15, 63, 26, 58, 27.4, 50, 26, 42, 28, 34, 26.6, 26, 28.4, 18, 27, 10, 30.4];
    P.path(g, roof); P.fill(g, P.lg(g, 0, 7, 0, 30, [MOSS[3], MOSS[2], MOSS[0]]));
    g.save(); P.path(g, roof); g.clip();
    for (let i = 0; i < 70; i++) { const x = 5 + (i * 37 % 58), y = 8 + (i * 23 % 22); leaf(x, y, 1.2 + (i % 3) * 0.6, MOSS[(i * 7) % 4]); }
    g.restore();
    // hanging moss drapes from the eaves, and ivy climbing the walls
    g.lineCap = 'round';
    for (const [x, y, l] of [[8, 29, 9], [13, 29.6, 6], [21, 27.6, 12], [29, 28, 7], [37, 27, 10], [45, 27.6, 6], [53, 26.4, 11], [60, 27, 7]]) {
      g.strokeStyle = MOSS[1]; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (f ? 0.8 : -0.4), y + l * 0.6, x + (f ? 0.4 : -0.2), y + l); g.stroke();
      g.strokeStyle = MOSS[3]; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 0.3, y); g.lineTo(x - 0.2, y + l * 0.8); g.stroke();
    }
    g.strokeStyle = '#1e2a12'; g.lineWidth = 0.8;
    for (const pts of [[12, 49, 13, 42, 11.6, 36, 13.4, 30], [34, 48.4, 35.6, 40, 34, 33], [56, 47.6, 54.6, 40, 56.4, 32]]) {
      g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke();
      for (let i = 0; i < pts.length; i += 2) { leaf(pts[i] - 1.2, pts[i + 1], 1.3, MOSS[2]); leaf(pts[i] + 1.2, pts[i + 1] - 1.4, 1.1, MOSS[3]); }
    }
    // ferns and bushes at its feet, mist over the mire
    const fern = (x, y, s, col) => { g.strokeStyle = col; g.lineWidth = 0.9; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 2.4 * s, y - 4 * s, x + k * 4.4 * s, y - (5.4 - Math.abs(k)) * s); g.stroke(); } };
    fern(6, 66, 1.3, MOSS[2]); fern(20, 66.4, 1, MOSS[3]); fern(38, 66.6, 1.1, MOSS[2]); fern(62, 66, 1.3, MOSS[3]); fern(50, 67, 0.9, MOSS[1]);
    for (const [x, y, r] of [[2.4, 64, 3.4], [9, 65, 2.6], [64.6, 64, 3.2], [27, 66, 2.2]]) { leaf(x, y, r, MOSS[1]); leaf(x + 1, y - 1.4, r * 0.7, MOSS[2]); }
    P.glow(g, 34, 62, 30, '#8aa070', 0.12);
  } });
  land('lm_reeds', { w: 24, h: 22, cy: 20, frames: 2, draw(g, f, c) {
    P.ell(g, 12, 20.4, 10, 1.8, 'rgba(0,0,0,0.35)');
    for (let i = 0; i < 9; i++) {
      const x = 2 + i * 2.4, top = 3 + (i * 37 % 9), bend = (f ? 1 : -0.6) * ((i % 3) - 1);
      g.strokeStyle = i % 2 ? '#5a7a28' : '#7a9a38'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x, 20); g.quadraticCurveTo(x + bend, 12, x + bend * 2, top); g.stroke();
      if (i % 3 === 0) P.ell(g, x + bend * 2, top + 1.6, 0.9, 2, '#4a2e14');
    }
  } });
  land('lm_menhir', { w: 16, h: 36, cy: 33, draw(g, f, c) {
    shadow(g, 8, 33.4, 7, 2);
    P.path(g, [2, 33, 3, 12, 6, 3, 10, 2, 13, 10, 14, 33]); P.fill(g, stoneX(g, 2, 14, c));
    const gl = c.glow === '#000000' ? '#9ab070' : c.glow;
    g.strokeStyle = G.rgba(gl, 0.75); g.lineWidth = 0.7; g.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.3) { const r = 0.4 + a * 0.3; const x = 8 + Math.cos(a) * r, y = 17 + Math.sin(a) * r * 1.2; if (a) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke(); P.glow(g, 8, 17, 6, gl, 0.3);
    accent(g, c, 2.6, 30.6, 11); accent(g, c, 5, 5, 6);
  } });

  /* ---------- Sealed Reliquary ---------- */
  land('lm_hoard', { w: 34, h: 22, cy: 18, draw(g, f, c) {
    shadow(g, 17, 18.4, 16, 2.6);
    P.path(g, [1, 18, 5, 11, 11, 7, 17, 5, 24, 7, 30, 11, 33, 18]); P.fill(g, P.lg(g, 0, 5, 0, 18, ['#fff0a0', '#e0b040', '#8a5a10']));
    for (let i = 0; i < 26; i++) { const x = 3 + (i * 53 % 29), y = 8 + (i * 31 % 9); P.ell(g, x, y, 1.3, 0.7, i % 3 ? '#ffe070' : '#b07a18'); }
    // a goblet and a spilled chest lid
    P.path(g, [6, 11, 10, 11, 9, 14, 8.6, 16, 10, 16.6, 6, 16.6, 7.4, 16, 7, 14]); P.fill(g, P.lg(g, 6, 0, 10, 0, ['#fff0a0', '#c89030', '#6a4a14'])); P.circle(g, 8, 12.6, 0.7, '#ff3040');
    P.rrect(g, 22, 4, 10, 5, 1, P.lg(g, 0, 4, 0, 9, ['#8a4a24', '#4a2410'])); P.rect(g, 22, 6, 10, 1, '#e0b040');
    for (const [x, y] of [[14, 7], [26, 12], [18, 13]]) { P.glow(g, x, y, 3, '#fff4c0', 0.8); P.circle(g, x, y, 0.5, '#ffffff'); }
  } });
})(window.DH);
