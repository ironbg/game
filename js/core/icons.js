/* UI icons: vector glyphs drawn on a 32x32 grid, then turned into pixel art with the same palette,
 * bevel and outline as the sprites (shown with image-rendering: pixelated). DH.icons.img(name) -> <img>. Names:
 *   i_gold i_gem i_energy i_revive i_reroll · n_* nav · c_wood/c_silver/c_gold chests · h_<hero> portraits
 *   ab_<ability> · tr_<trait> · g_<item> · p_<potion> · herb_<herb> · a_<artifact> · m_<hero> marks · s_<slot> */
(function (DH) {
  'use strict';
  const G = DH.gfx, P = G.P, sh = G.shade, C = DH.content;
  const SIZE = 64, U2 = SIZE / 32; // 2 icon pixels per unit of the 32x32 design box (same density as sprites)
  const cache = {};

  const ELEM = { fire: '#e8602a', lightning: '#e8c020', ice: '#3aa8e8', magic: '#9a50e0', physical: '#8a92a6', summon: '#40b080', area: '#c07030' };
  function badge(g, col, round) {
    if (round) { P.circle(g, 16, 16, 14.5, P.lg(g, 0, 2, 0, 30, [sh(col, 0.25), sh(col, -0.45)])); g.strokeStyle = sh(col, 0.45); g.lineWidth = 1.2; g.beginPath(); g.arc(16, 16, 14, 0, Math.PI * 2); g.stroke(); return; }
    P.rrect(g, 1.5, 1.5, 29, 29, 7, P.lg(g, 0, 1.5, 0, 30, [sh(col, 0.2), sh(col, -0.5)]));
    g.strokeStyle = sh(col, 0.45); g.lineWidth = 1.1; P.rrect(g, 2.1, 2.1, 27.8, 27.8, 6.5); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.ellipse(16, 7, 12, 5, 0, 0, Math.PI * 2); g.fill();
  }
  const W = '#f6f0e4', WD = '#c8c0b0';

  /* ---------- glyphs (light, drawn over a badge or on their own) ---------- */
  const GL = {
    sword(g) { P.path(g, [9, 23, 22, 6, 25, 5, 24, 8, 11, 25]); P.fill(g, P.lg(g, 9, 5, 25, 25, [W, WD])); P.line(g, 8, 20, 14, 26, 2, '#e0b040'); P.line(g, 10, 24, 6, 28, 2.4, '#6a4428'); },
    bow(g) { g.beginPath(); g.arc(10, 16, 11, -1.1, 1.1); g.strokeStyle = '#c8905a'; g.lineWidth = 2.4; g.stroke(); P.line(g, 10 + Math.cos(-1.1) * 11, 16 + Math.sin(-1.1) * 11, 10 + Math.cos(1.1) * 11, 16 + Math.sin(1.1) * 11, 0.8, W); P.line(g, 8, 16, 26, 16, 1.4, WD); P.path(g, [24, 13, 28, 16, 24, 19]); P.fill(g, W); },
    hammer(g) { P.line(g, 10, 26, 18, 12, 2.4, '#8a5a30'); g.save(); g.translate(19, 10); g.rotate(0.5); P.rrect(g, -7, -4, 14, 8, 1.5, P.lg(g, 0, -4, 0, 4, ['#fff6d0', '#e8c050'])); g.restore(); },
    flame(g, c) { g.beginPath(); g.moveTo(16, 4); g.bezierCurveTo(24, 12, 26, 18, 22, 24); g.quadraticCurveTo(16, 30, 10, 24); g.bezierCurveTo(6, 18, 10, 14, 12, 10); g.quadraticCurveTo(13, 15, 15, 15); g.quadraticCurveTo(13, 9, 16, 4); P.fill(g, P.lg(g, 0, 4, 0, 28, [c || '#ffe070', '#ff7a20', '#c02810'])); g.beginPath(); g.moveTo(16, 14); g.quadraticCurveTo(21, 20, 18, 25); g.quadraticCurveTo(15, 27, 13, 24); g.quadraticCurveTo(12, 19, 16, 14); P.fill(g, '#fff4b0'); },
    wisp(g) { P.glow(g, 16, 14, 11, '#d090ff', 0.8); g.beginPath(); g.moveTo(16, 6); g.bezierCurveTo(24, 8, 24, 18, 18, 22); g.quadraticCurveTo(16, 28, 20, 30); g.quadraticCurveTo(12, 28, 12, 22); g.bezierCurveTo(8, 18, 8, 8, 16, 6); P.fill(g, 'rgba(240,220,255,0.95)'); P.circle(g, 14, 14, 1.4, '#4a1a6a'); P.circle(g, 18.5, 14, 1.4, '#4a1a6a'); },
    shield(g, c) { g.beginPath(); g.moveTo(7, 6); g.lineTo(25, 6); g.lineTo(24.5, 16); g.quadraticCurveTo(22, 24, 16, 28); g.quadraticCurveTo(10, 24, 7.5, 16); g.closePath(); P.fill(g, P.lg(g, 7, 6, 25, 28, [sh(c || '#6a8ad0', 0.35), c || '#4a6ab0', sh(c || '#4a6ab0', -0.4)])); g.strokeStyle = '#e8c860'; g.lineWidth = 1.6; g.stroke(); P.rrect(g, 15, 9, 2, 15, 0.5, '#e8c860'); P.rrect(g, 10, 13, 12, 2, 0.5, '#e8c860'); },
    bolt(g) { P.path(g, [19, 3, 9, 18, 15, 18, 12, 29, 24, 12, 17, 12]); P.fill(g, P.lg(g, 9, 3, 24, 29, ['#fffbd0', '#ffe040', '#e0a010'])); },
    wolf(g) { P.path(g, [6, 12, 9, 4, 13, 10, 19, 10, 23, 4, 26, 12, 25, 20, 16, 28, 7, 20]); P.fill(g, P.lg(g, 0, 4, 0, 28, ['#f0f6ff', '#9aaac0'])); P.path(g, [11, 15, 14, 16, 11, 17]); P.fill(g, '#40c0ff'); P.path(g, [21, 15, 18, 16, 21, 17]); P.fill(g, '#40c0ff'); P.path(g, [14, 22, 18, 22, 16, 25]); P.fill(g, '#2a2a34'); },
    axe(g) { P.line(g, 8, 27, 20, 8, 2.4, '#8a5a30'); g.beginPath(); g.moveTo(17, 7); g.quadraticCurveTo(28, 4, 29, 14); g.quadraticCurveTo(24, 13, 21, 16); g.closePath(); P.fill(g, P.lg(g, 17, 4, 29, 16, [W, '#98a0b0'])); },
    orb(g, c) { P.glow(g, 16, 16, 13, c || '#80e0ff', 0.7); P.circle(g, 16, 16, 7.5, P.vol(g, 16, 16, 7.5, c || '#a0f0ff')); P.circle(g, 13.5, 13, 2, 'rgba(255,255,255,0.85)'); },
    drop(g) { g.beginPath(); g.moveTo(16, 4); g.bezierCurveTo(22, 13, 25, 17, 25, 21); g.arc(16, 21, 9, 0, Math.PI); g.bezierCurveTo(7, 17, 10, 13, 16, 4); P.fill(g, P.lg(g, 7, 4, 25, 30, ['#ff7080', '#d0182c', '#6a0a14'])); P.ell(g, 13, 20, 2, 3.5, 'rgba(255,255,255,0.5)', 0.3); },
    scythe(g) { P.line(g, 12, 29, 18, 5, 2, '#5a4a5a'); g.beginPath(); g.moveTo(18, 5); g.quadraticCurveTo(6, 0, 3, 13); g.quadraticCurveTo(8, 7, 18, 9); g.closePath(); P.fill(g, P.lg(g, 3, 2, 18, 12, ['#9aa4b8', W])); },
    lance(g) { P.glow(g, 16, 16, 12, '#c060ff', 0.6); P.path(g, [4, 28, 26, 6, 28, 4, 26, 10, 7, 29]); P.fill(g, P.lg(g, 4, 28, 28, 4, ['#8a30d0', '#e8b0ff', W])); },
    chakram(g) { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; P.path(g, [16 + Math.cos(a) * 5, 16 + Math.sin(a) * 5, 16 + Math.cos(a + 0.6) * 13, 16 + Math.sin(a + 0.6) * 13, 16 + Math.cos(a + 1.1) * 6, 16 + Math.sin(a + 1.1) * 6]); P.fill(g, W); } g.beginPath(); g.arc(16, 16, 6, 0, Math.PI * 2); g.strokeStyle = '#e8c050'; g.lineWidth = 2.4; g.stroke(); },
    orbs(g) { g.strokeStyle = 'rgba(255,240,200,0.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(16, 16, 12, 5, -0.4, 0, Math.PI * 2); g.stroke(); [[6, 20], [26, 12], [16, 16]].forEach(([x, y], i) => P.circle(g, x, y, i === 2 ? 5 : 3.2, P.vol(g, x, y, 5, i === 2 ? '#d0d8e8' : '#e8c870'))); },
    dagger(g) { for (const o of [-4, 4]) { P.path(g, [10 + o, 22, 24 + o, 6, 25 + o, 9, 12 + o, 24]); P.fill(g, P.lg(g, 10, 6, 25, 24, [W, WD])); P.line(g, 8 + o, 20, 13 + o, 25, 1.4, '#e0b040'); } },
    breath(g) { g.beginPath(); g.moveTo(5, 16); g.quadraticCurveTo(18, 2, 29, 6); g.quadraticCurveTo(24, 16, 29, 26); g.quadraticCurveTo(18, 30, 5, 16); P.fill(g, P.lg(g, 5, 0, 29, 0, ['#fff4b0', '#ffa030', '#e04010'])); P.circle(g, 6, 16, 3.4, '#8a2a1a'); },
    sphere(g) { P.glow(g, 16, 16, 14, '#fff080', 0.8); P.circle(g, 16, 16, 7, P.vol(g, 16, 16, 7, '#fff6a0')); g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i; g.moveTo(16 + Math.cos(a) * 7, 16 + Math.sin(a) * 7); g.lineTo(16 + Math.cos(a + 0.2) * 12, 16 + Math.sin(a + 0.2) * 12); } g.stroke(); },
    sun(g) { P.glow(g, 16, 16, 14, '#ffe080', 0.7); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; P.path(g, [16 + Math.cos(a - 0.12) * 8, 16 + Math.sin(a - 0.12) * 8, 16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14, 16 + Math.cos(a + 0.12) * 8, 16 + Math.sin(a + 0.12) * 8]); P.fill(g, '#ffe070'); } P.circle(g, 16, 16, 7, P.vol(g, 16, 16, 7, '#fff4c0')); },
    rift(g) { P.glow(g, 16, 16, 14, '#b050ff', 0.8); g.beginPath(); g.moveTo(3, 16); g.quadraticCurveTo(16, 4, 29, 16); g.quadraticCurveTo(16, 28, 3, 16); P.fill(g, P.rg(g, 16, 16, 12, [W, '#c070ff', '#30105a'])); },
    meteor(g) { g.strokeStyle = 'rgba(255,170,60,0.8)'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(28, 4); g.lineTo(16, 16); g.stroke(); P.glow(g, 12, 20, 10, '#ff8020', 0.8); P.circle(g, 12, 20, 6.5, P.vol(g, 12, 20, 6.5, '#9a5a3a')); P.circle(g, 10, 19, 1.5, '#5a2a1a'); P.circle(g, 14, 22, 1.2, '#5a2a1a'); },
    golem(g) { P.rrect(g, 8, 6, 16, 14, 3, P.lg(g, 0, 6, 0, 20, ['#f0e6cc', '#a8987a'])); P.rrect(g, 5, 18, 22, 10, 3, P.lg(g, 0, 18, 0, 28, ['#d8cca8', '#8a7a5a'])); P.circle(g, 13, 13, 1.8, '#40ffc0'); P.circle(g, 19, 13, 1.8, '#40ffc0'); },
    helm(g, c) { g.beginPath(); g.arc(16, 16, 11, Math.PI, 0); g.lineTo(27, 26); g.lineTo(20, 26); g.lineTo(19, 20); g.lineTo(13, 20); g.lineTo(12, 26); g.lineTo(5, 26); g.closePath(); P.fill(g, P.lg(g, 5, 5, 27, 26, [W, c || '#98a0b8', sh(c || '#98a0b8', -0.4)])); P.rrect(g, 9, 15, 14, 3, 1, '#1a1020'); P.line(g, 16, 5, 16, 14, 1.2, 'rgba(255,255,255,0.6)'); },
    ice(g) { [[10, 26, 8], [16, 26, 16], [22, 26, 10]].forEach(([x, y, hh]) => { P.path(g, [x - 4, y, x, y - hh - 4, x + 4, y]); P.fill(g, P.lg(g, x - 4, 0, x + 4, 0, [W, '#80d0ff', '#2a78c0'])); }); },
    hail(g) { [[10, 10, 4], [21, 8, 3], [15, 20, 5], [24, 22, 3.4], [7, 23, 2.6]].forEach(([x, y, r]) => P.circle(g, x, y, r, P.vol(g, x, y, r, '#e0f6ff'))); },
    flail(g) { P.line(g, 5, 28, 12, 18, 2.4, '#8a5a30'); g.strokeStyle = '#a0a0b0'; g.lineWidth = 1.2; g.setLineDash([2, 1.5]); g.beginPath(); g.moveTo(12, 18); g.quadraticCurveTo(14, 10, 20, 11); g.stroke(); g.setLineDash([]); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.path(g, [21 + Math.cos(a - 0.3) * 5, 11 + Math.sin(a - 0.3) * 5, 21 + Math.cos(a) * 9, 11 + Math.sin(a) * 9, 21 + Math.cos(a + 0.3) * 5, 11 + Math.sin(a + 0.3) * 5]); P.fill(g, W); } P.circle(g, 21, 11, 5.5, P.vol(g, 21, 11, 5.5, '#7a7e8a')); },
    fist(g, c) { P.glow(g, 16, 16, 13, c || '#b080ff', 0.6); P.rrect(g, 8, 9, 16, 14, 5, c ? sh(c, 0.3) : '#e0d0ff'); for (let i = 0; i < 4; i++) P.rrect(g, 9 + i * 3.8, 7, 3.4, 6, 1.6, c ? sh(c, 0.45) : '#f0e8ff'); P.rrect(g, 11, 22, 10, 7, 2, c ? sh(c, 0.1) : '#c8b0f0'); },
    fistup(g) { GL.fist(g, '#e04040'); },
    fistfire(g) { P.glow(g, 16, 14, 13, '#ff7a20', 0.7); GL.fist(g, '#ff8a30'); g.beginPath(); g.moveTo(16, 1); g.quadraticCurveTo(22, 6, 19, 11); g.lineTo(13, 11); g.quadraticCurveTo(10, 6, 16, 1); P.fill(g, P.lg(g, 0, 1, 0, 11, ['#fff4b0', '#ff8a20'])); },
    thorns(g) {
      g.lineCap = 'round';
      [[8, 28, 6, 8, '#6a8a30'], [16, 29, 17, 4, '#80a040'], [24, 28, 27, 10, '#5a7a28']].forEach(([x0, y0, x1, y1, c]) => {
        g.strokeStyle = '#1c2a0c'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + 4, (y0 + y1) / 2, x1, y1); g.stroke();
        g.strokeStyle = c; g.lineWidth = 2.2; g.stroke();
        for (let i = 1; i < 4; i++) { const t = i / 4, x = x0 + (x1 - x0) * t + 2, y = y0 + (y1 - y0) * t; P.path(g, [x, y, x + 3, y - 1.5, x + 0.5, y + 1]); P.fill(g, '#d8e8a0'); }
      });
      P.circle(g, 17, 4.5, 2.4, P.vol(g, 17, 4.5, 2.4, '#c02838'));
    },
    gun(g) { // an arquebus with a puff of smoke
      P.glow(g, 26, 8, 7, '#ffb040', 0.6); P.circle(g, 27, 7, 2.4, 'rgba(220,220,230,0.8)'); P.circle(g, 29, 10, 1.8, 'rgba(200,200,210,0.7)');
      g.save(); g.translate(16, 17); g.rotate(-0.55);
      P.path(g, [-14, 3, -5, -1, -1, -1, -1, 2, -12, 7]); P.fill(g, P.lg(g, -14, 0, -1, 0, ['#b07a40', '#6a3c18']));
      P.rrect(g, -3, -2.6, 16, 2.6, 1, P.lg(g, 0, -2.6, 0, 0, ['#f0f2f8', '#8a90a0', '#4a4e58'])); P.rect(g, 12, -3, 2, 3.4, '#3a3e48');
      P.line(g, -1, 0, -2.4, 3.4, 1, '#e0b040'); g.restore();
    },
    flask(g) {
      P.rrect(g, 13, 3, 6, 3, 1, '#8a5a30'); P.rect(g, 14, 6, 4, 5, 'rgba(230,245,255,0.7)');
      P.glow(g, 16, 20, 12, '#90e050', 0.6); P.circle(g, 16, 20, 9, 'rgba(230,245,255,0.55)');
      g.save(); g.beginPath(); g.arc(16, 20, 8.4, 0, Math.PI * 2); g.clip(); P.rect(g, 6, 18, 20, 12, P.lg(g, 0, 18, 0, 29, ['#d8ff90', '#70c030', '#2a6a14'])); g.restore();
      [[12, 22, 1.6], [18, 24, 1.2], [15, 19, 1]].forEach(([x, y, r]) => P.circle(g, x, y, r, 'rgba(255,255,255,0.8)'));
      P.circle(g, 11.5, 16, 1.6, 'rgba(255,255,255,0.9)');
    },
    plant(g) { // a bog flytrap snapping
      P.ell(g, 16, 28, 9, 2.4, '#3a2a14');
      g.strokeStyle = '#3a5a1a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(16, 28); g.quadraticCurveTo(11, 20, 15, 14); g.stroke();
      [[-2.6, '#4a7a28'], [-0.5, '#5a8a30']].forEach(([a, c]) => { g.save(); g.translate(16, 27); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(5, -3.5, 10, 0); g.quadraticCurveTo(5, 3, 0, 0); P.fill(g, c); g.restore(); });
      g.save(); g.translate(16, 13);
      g.save(); g.rotate(-0.5); g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(5, -8, 12, -1); g.lineTo(-2, 1); P.fill(g, P.lg(g, 0, -7, 0, 0, ['#a8d850', '#4a7a20'])); P.path(g, [0, 0, 4, -2, 8, -0.6]); P.fill(g, '#d0283a'); g.restore();
      g.save(); g.rotate(0.5); g.beginPath(); g.moveTo(-2, 0); g.quadraticCurveTo(5, 8, 12, 1); g.lineTo(-2, -1); P.fill(g, P.lg(g, 0, 0, 0, 7, ['#5a8a28', '#2a4a12'])); P.path(g, [0, 0, 4, 2, 8, 0.6]); P.fill(g, '#9a1424'); g.restore();
      for (let i = 0; i < 4; i++) { P.path(g, [3 + i * 2.2, -2.2 - i * 0.3, 4 + i * 2.2, 0, 5 + i * 2.2, -2.4 - i * 0.3]); P.fill(g, W); }
      g.restore();
    },
    lute(g) {
      g.save(); g.translate(16, 16); g.rotate(-0.7);
      P.rrect(g, -1.4, -15, 2.8, 14, 0.8, '#4a2a14'); for (let i = 0; i < 3; i++) P.rect(g, -2.6, -14 + i * 1.8, 5.2, 0.8, '#e8d8b0');
      P.ell(g, 0, 5, 8, 9.5, P.rg(g, -2, 2, 11, ['#f0b870', '#b06a2a', '#5a3010']));
      P.circle(g, 0, 3, 2.6, '#1a0c06'); P.rect(g, -3, 10.5, 6, 1.4, '#2a1608');
      g.strokeStyle = 'rgba(255,240,200,0.9)'; g.lineWidth = 0.4; g.beginPath(); for (const o of [-0.8, 0, 0.8]) { g.moveTo(o, -14); g.lineTo(o, 10.5); } g.stroke();
      g.restore();
    },
    drum(g) {
      P.ell(g, 16, 22, 12, 5, '#3a1e0e'); P.rect(g, 4, 11, 24, 11, P.lg(g, 4, 0, 28, 0, ['#8a3a1a', '#c05a2a', '#6a2410']));
      P.ell(g, 16, 11, 12, 5, P.rg(g, 14, 10, 12, ['#f4ead0', '#c8b890']));
      g.strokeStyle = '#e8c050'; g.lineWidth = 0.9; g.beginPath(); for (let i = 0; i < 5; i++) { const x = 5 + i * 5.5; g.moveTo(x, 13); g.lineTo(x + 2.8, 21); } g.stroke();
      P.line(g, 20, 2, 25, 9, 1.6, '#e8d8b0'); P.circle(g, 20, 2, 1.6, '#f4ead0');
    },
    prism(g) {
      P.glow(g, 16, 16, 14, '#c080ff', 0.6);
      P.path(g, [16, 3, 27, 24, 5, 24]); P.fill(g, P.lg(g, 5, 3, 27, 24, ['#ffffff', '#c8b8ff', '#6a4ab0']));
      P.path(g, [16, 3, 16, 24, 5, 24]); P.fill(g, 'rgba(255,255,255,0.3)');
      [['#ff7a30', 0], ['#80d8ff', 3], ['#fff080', 6]].forEach(([c, o]) => P.line(g, 22, 15 + o * 0.6, 30, 13 + o * 1.8, 1.8, c));
      P.line(g, 2, 11, 10, 15, 1.8, '#ffffff');
    },
    snow(g) { g.strokeStyle = '#e8f8ff'; g.lineWidth = 2; g.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; g.beginPath(); g.moveTo(16 - Math.cos(a) * 12, 16 - Math.sin(a) * 12); g.lineTo(16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12); g.stroke(); } for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, x = 16 + Math.cos(a) * 8, y = 16 + Math.sin(a) * 8; g.beginPath(); g.moveTo(x + Math.cos(a + 2.2) * 3, y + Math.sin(a + 2.2) * 3); g.lineTo(x, y); g.lineTo(x + Math.cos(a - 2.2) * 3, y + Math.sin(a - 2.2) * 3); g.stroke(); } },
    flask(g, c) { P.rrect(g, 13, 3, 6, 4, 1, '#8a5a30'); P.rrect(g, 13.5, 6, 5, 6, 1, 'rgba(220,240,255,0.8)'); P.circle(g, 16, 20, 9, 'rgba(220,240,255,0.55)'); g.save(); g.beginPath(); g.arc(16, 20, 8.4, 0, Math.PI * 2); g.clip(); P.rect(g, 0, 18, 32, 14, P.lg(g, 0, 18, 0, 30, [c || '#80e060', sh(c || '#80e060', -0.5)])); g.restore(); P.ell(g, 12.5, 17, 1.8, 3, 'rgba(255,255,255,0.7)', 0.4); },
    fireball(g) { P.glow(g, 18, 14, 14, '#ff8020', 0.8); g.beginPath(); g.moveTo(4, 28); g.quadraticCurveTo(10, 16, 14, 12); g.lineTo(20, 18); g.quadraticCurveTo(14, 22, 4, 28); P.fill(g, 'rgba(255,160,60,0.7)'); P.circle(g, 19, 13, 7, P.rg(g, 19, 13, 7, ['#fff6c0', '#ffb030', '#e04010'])); },
    heart(g) { g.beginPath(); g.moveTo(16, 27); g.bezierCurveTo(2, 18, 4, 5, 11, 6); g.quadraticCurveTo(14, 6, 16, 10); g.quadraticCurveTo(18, 6, 21, 6); g.bezierCurveTo(28, 5, 30, 18, 16, 27); P.fill(g, P.lg(g, 4, 5, 28, 27, ['#ff8090', '#e01830', '#7a0814'])); P.ell(g, 10.5, 11, 2.4, 1.6, 'rgba(255,255,255,0.6)', -0.5); },
    cross(g) { P.rrect(g, 12, 5, 8, 22, 2, P.lg(g, 0, 5, 0, 27, ['#a0ff90', '#30a040'])); P.rrect(g, 5, 12, 22, 8, 2, P.lg(g, 0, 12, 0, 20, ['#a0ff90', '#30a040'])); },
    hide(g) { g.beginPath(); g.moveTo(8, 6); g.lineTo(24, 6); g.lineTo(27, 12); g.lineTo(24, 27); g.lineTo(8, 27); g.lineTo(5, 12); g.closePath(); P.fill(g, P.lg(g, 5, 6, 27, 27, ['#c8a070', '#8a6038', '#4a3018'])); g.strokeStyle = '#3a2410'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(9, 11 + i * 5); g.lineTo(23, 11 + i * 5); g.stroke(); } },
    boot(g) { P.path(g, [11, 4, 19, 4, 19, 20, 27, 22, 27, 27, 9, 27, 9, 20]); P.fill(g, P.lg(g, 9, 4, 27, 27, ['#b88458', '#7a5030', '#4a2e18'])); P.line(g, 4, 10, 9, 10, 1.5, 'rgba(255,255,255,0.6)'); P.line(g, 3, 15, 8, 15, 1.5, 'rgba(255,255,255,0.5)'); },
    hourglass(g) { P.rrect(g, 7, 3, 18, 3, 1, '#c89050'); P.rrect(g, 7, 26, 18, 3, 1, '#c89050'); g.beginPath(); g.moveTo(9, 6); g.lineTo(23, 6); g.lineTo(17, 16); g.lineTo(23, 26); g.lineTo(9, 26); g.lineTo(15, 16); g.closePath(); P.fill(g, 'rgba(220,240,255,0.5)'); P.path(g, [11, 8, 21, 8, 16, 14]); P.fill(g, '#ffd060'); P.path(g, [16, 18, 21, 25, 11, 25]); P.fill(g, '#ffd060'); },
    rings(g) { for (let i = 3; i >= 1; i--) { g.beginPath(); g.arc(16, 16, i * 4.4, 0, Math.PI * 2); g.strokeStyle = ['#c070ff', '#80a0ff', '#80f0ff'][i - 1]; g.lineWidth = 2; g.stroke(); } P.circle(g, 16, 16, 2, W); },
    magnet(g) { g.lineCap = 'butt'; g.beginPath(); g.arc(16, 14, 8, Math.PI, 0, true); g.strokeStyle = '#e02838'; g.lineWidth = 6; g.stroke(); P.rect(g, 5, 13, 6, 10, '#e02838'); P.rect(g, 21, 13, 6, 10, '#e02838'); P.rect(g, 5, 22, 6, 4, W); P.rect(g, 21, 22, 6, 4, W); },
    target(g) { [11, 7.5, 4].forEach((r, i) => P.circle(g, 16, 16, r, i % 2 ? W : '#e03040')); P.line(g, 27, 5, 17, 15, 1.6, '#8a5a30'); P.path(g, [17, 15, 20, 15, 17, 12]); P.fill(g, W); },
    fang(g) { P.path(g, [8, 5, 14, 5, 12, 28]); P.fill(g, P.lg(g, 8, 0, 14, 0, [W, WD])); P.path(g, [18, 5, 24, 5, 21, 22]); P.fill(g, P.lg(g, 18, 0, 24, 0, [W, WD])); P.rrect(g, 5, 3, 22, 4, 2, '#c02838'); },
    candle(g) { P.glow(g, 16, 7, 7, '#ffc040', 0.8); P.ell(g, 16, 7, 2.4, 4, '#ffd050'); P.rrect(g, 12, 11, 8, 15, 1.5, P.lg(g, 12, 0, 20, 0, ['#fff4dc', '#d8c7a0'])); P.ell(g, 16, 27, 8, 2.4, '#b08050'); },
    echo(g) { for (const o of [0, 8]) { P.path(g, [6 + o, 6, 14 + o, 16, 6 + o, 26, 9 + o, 26, 17 + o, 16, 9 + o, 6]); P.fill(g, o ? '#80e0ff' : W); } },
    star(g) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.5 : 13; pts.push(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } P.path(g, pts); P.fill(g, P.lg(g, 0, 3, 0, 29, ['#fff8c0', '#ffc030'])); },
    whet(g) { g.save(); g.translate(16, 16); g.rotate(-0.6); P.rrect(g, -12, -4, 24, 8, 3, P.lg(g, 0, -4, 0, 4, ['#a0a6b4', '#5a606e'])); g.restore(); P.path(g, [10, 24, 26, 8, 27, 11, 12, 26]); P.fill(g, W); },
    arrows(g) { [-7, 0, 7].forEach((o) => { P.line(g, 16 + o * 0.4, 28, 16 + o, 8, 1.4, '#c8905a'); P.path(g, [12.6 + o, 9, 16 + o, 3, 19.4 + o, 9]); P.fill(g, W); }); },
    skull(g) { P.circle(g, 16, 13, 10, P.vol(g, 16, 13, 10, '#ece2c8')); P.rrect(g, 10, 18, 12, 8, 2, '#dcd0b0'); P.ell(g, 12, 13, 2.8, 3.2, '#2a1418'); P.ell(g, 20, 13, 2.8, 3.2, '#2a1418'); P.path(g, [16, 16, 14.5, 19, 17.5, 19]); P.fill(g, '#2a1418'); for (let i = 0; i < 4; i++) P.line(g, 12 + i * 2.7, 22, 12 + i * 2.7, 26, 0.8, '#8a7a5a'); },
    elements(g) { P.circle(g, 11, 12, 5, P.vol(g, 11, 12, 5, '#ff7a30')); P.circle(g, 21, 12, 5, P.vol(g, 21, 12, 5, '#ffe040')); P.circle(g, 16, 21, 5, P.vol(g, 16, 21, 5, '#60c8ff')); },
    coin(g) { // an old minted coin: milled rim, a stamped four-pointed star
      P.circle(g, 16, 16, 12, P.vol(g, 16, 16, 12, '#f0b030'));
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; P.circle(g, 16 + Math.cos(a) * 10.6, 16 + Math.sin(a) * 10.6, 0.7, '#b87818'); }
      P.circle(g, 16, 16, 8.5, P.lg(g, 8, 8, 24, 24, ['#fff0a0', '#e0a020']));
      const star = (r, w, col) => { P.path(g, [16, 16 - r, 16 + w, 16 - w, 16 + r, 16, 16 + w, 16 + w, 16, 16 + r, 16 - w, 16 + w, 16 - r, 16, 16 - w, 16 - w]); P.fill(g, col); };
      star(6.4, 1.9, '#a86a10'); star(5, 1.2, '#f8d868'); P.circle(g, 16, 16, 1.1, '#a86a10');
    },
    gem(g, c) { const col = c || '#ff5ad8'; P.path(g, [9, 7, 23, 7, 29, 13, 16, 28, 3, 13]); P.fill(g, P.lg(g, 3, 7, 29, 28, [sh(col, 0.5), col, sh(col, -0.45)])); P.path(g, [9, 7, 23, 7, 20, 13, 12, 13]); P.fill(g, 'rgba(255,255,255,0.35)'); P.path(g, [3, 13, 12, 13, 16, 28]); P.fill(g, 'rgba(0,0,0,0.18)'); P.circle(g, 11, 10, 1.4, '#fff'); },
    torch(g) { P.rrect(g, 13.5, 15, 5, 14, 1.5, P.lg(g, 13, 0, 19, 0, ['#9a6a3a', '#5a3a1a'])); P.rrect(g, 12, 14, 8, 3, 1, '#6a6e7a'); GL.flameSmall(g); },
    flameSmall(g) { g.beginPath(); g.moveTo(16, 1); g.bezierCurveTo(23, 7, 22, 13, 20, 15); g.lineTo(12, 15); g.bezierCurveTo(9, 12, 10, 7, 16, 1); P.fill(g, P.lg(g, 0, 1, 0, 15, ['#fff4b0', '#ffa030', '#e04010'])); },
    trophy(g) { P.path(g, [8, 5, 24, 5, 23, 14, 16, 20, 9, 14]); P.fill(g, P.lg(g, 8, 0, 24, 0, ['#fff0a0', '#f0b830', '#b07810'])); g.strokeStyle = '#e8b030'; g.lineWidth = 1.6; g.beginPath(); g.arc(8, 10, 3.6, 1.2, 4.8); g.stroke(); g.beginPath(); g.arc(24, 10, 3.6, -1.6, 1.9); g.stroke(); P.rect(g, 14.5, 19, 3, 5, '#d09820'); P.rrect(g, 10, 24, 12, 4, 1, '#8a5a30'); },
    calendar(g) { P.rrect(g, 5, 7, 22, 21, 2, '#f0ece4'); P.rrect(g, 5, 7, 22, 6, 2, '#d02838'); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) P.rect(g, 8 + c * 4.4, 16 + r * 3.6, 2.6, 2, r === 2 && c === 3 ? '#d02838' : '#6a6a7a'); P.rect(g, 10, 4, 2, 5, '#6a6a7a'); P.rect(g, 20, 4, 2, 5, '#6a6a7a'); },
    banner(g) { P.rect(g, 5, 4, 22, 2.4, '#8a5a30'); P.path(g, [7, 6, 25, 6, 25, 28, 16, 22, 7, 28]); P.fill(g, P.lg(g, 7, 6, 25, 28, ['#b070f0', '#6a2aa0'])); GL.starSmall(g); },
    starSmall(g) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 2.6 : 6; pts.push(16 + Math.cos(a) * r, 14 + Math.sin(a) * r); } P.path(g, pts); P.fill(g, '#ffd35a'); },
    tv(g) { P.rrect(g, 3, 8, 26, 18, 3, '#6a6e7a'); P.rrect(g, 5, 10, 22, 14, 2, '#10141a'); P.path(g, [13, 13, 21, 17, 13, 21]); P.fill(g, '#40d060'); P.line(g, 11, 3, 15, 8, 1.2, '#6a6e7a'); P.line(g, 21, 3, 17, 8, 1.2, '#6a6e7a'); },
    swords(g) { g.save(); g.translate(16, 16); for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.rotate(-0.78); P.rrect(g, -1.6, -14, 3.2, 20, 1, P.lg(g, -1.6, 0, 1.6, 0, [W, WD])); P.rrect(g, -5, 5, 10, 2, 1, '#e0b040'); P.rrect(g, -1.4, 7, 2.8, 6, 1, '#6a4428'); g.restore(); } g.restore(); },
    altar(g) { P.glow(g, 16, 8, 8, '#ffa040', 0.8); GL.flameSmall(g); P.rrect(g, 6, 15, 20, 6, 1, P.lg(g, 0, 15, 0, 21, ['#a0a4b0', '#5a5e6a'])); P.rrect(g, 9, 21, 14, 5, 0.5, '#6a6e7a'); P.rrect(g, 5, 26, 22, 3, 1, '#5a5e6a'); },
    scroll(g) { P.rrect(g, 7, 5, 18, 22, 2, P.lg(g, 7, 0, 25, 0, ['#f4e6c0', '#d8c090'])); P.ell(g, 16, 5, 10, 2.6, '#c8a870'); P.ell(g, 16, 27, 10, 2.6, '#c8a870'); for (let i = 0; i < 4; i++) P.line(g, 10, 10 + i * 4, 22 - (i === 3 ? 5 : 0), 10 + i * 4, 1, '#8a6a4a'); },
    ankh(g) { g.strokeStyle = '#ffd050'; g.lineWidth = 3; g.beginPath(); g.ellipse(16, 9, 5, 6, 0, 0, Math.PI * 2); g.stroke(); P.rect(g, 14.5, 14, 3, 15, '#ffd050'); P.rect(g, 7, 15.5, 18, 3, '#ffd050'); },
    dice(g) { P.rrect(g, 5, 5, 22, 22, 4, P.lg(g, 0, 5, 0, 27, ['#ffffff', '#c8ccd8'])); [[11, 11], [21, 11], [16, 16], [11, 21], [21, 21]].forEach(([x, y]) => P.circle(g, x, y, 2, '#2a2a3a')); },
    book(g) { P.rrect(g, 5, 5, 22, 22, 2, P.lg(g, 0, 5, 0, 27, ['#5a78d8', '#23347a'])); P.rrect(g, 8, 7, 17, 18, 1, '#efe4c8'); g.strokeStyle = '#4a70e0'; g.lineWidth = 1.4; g.beginPath(); g.arc(16.5, 16, 4.5, 0, Math.PI * 2); g.moveTo(16.5, 10); g.lineTo(16.5, 22); g.stroke(); },
    chest(g, c) { const b = c || '#8a5a2a', band = c === '#4a5a7a' ? '#dfe6f2' : c === '#8a2034' ? '#ffd35a' : '#9aa0aa'; P.rrect(g, 3, 14, 26, 13, 2, P.lg(g, 0, 14, 0, 27, [sh(b, 0.25), sh(b, -0.4)])); g.beginPath(); g.moveTo(3, 15); g.quadraticCurveTo(3, 5, 16, 5); g.quadraticCurveTo(29, 5, 29, 15); g.closePath(); P.fill(g, P.lg(g, 0, 5, 0, 15, [sh(b, 0.4), b])); [7, 25].forEach((x) => P.rrect(g, x - 1.6, 5.5, 3.2, 21.5, 0.8, band)); P.rrect(g, 3, 14, 26, 2.2, 0.5, band); P.rrect(g, 13.5, 12.5, 5, 6, 1, band); P.circle(g, 16, 15.5, 0.9, '#1a1010'); },
  };
  DH.glyphs = GL;

  /* ---------- gear glyphs (full colour, 32-unit box, rendered at 2 px per unit) ---------- */
  const MAT = {
    steel:   ['#f6f8fc', '#c4cad8', '#8a92a6', '#4e5466', '#262a34'],
    gold:    ['#fff6c8', '#f4cc58', '#c8902c', '#7e5616', '#3a2608'],
    bronze:  ['#ffd8a0', '#d4883c', '#8e5020', '#522a0e', '#261206'],
    leather: ['#dcaa78', '#a8743e', '#744a24', '#4a2c12', '#24140a'],
    silver:  ['#ffffff', '#dfe4ee', '#a8b0c2', '#686e80', '#30343e'],
    iron:    ['#b8bcc8', '#7c8292', '#50566a', '#30343e', '#16181e'],
  };
  /** banded metal gradient (hard-ish stops read as pixel-art shading) */
  function mfill(g, x0, y0, x1, y1, m) { return P.lg(g, x0, y0, x1, y1, [[0, m[0]], [0.16, m[1]], [0.45, m[2]], [0.78, m[3]], [1, m[4]]]); }
  function gemCut(g, cx, cy, r, col) {
    P.circle(g, cx, cy, r + 0.8, '#1a0c10');
    P.circle(g, cx, cy, r, P.rg(g, cx, cy, r, [[0, sh(col, 0.35)], [0.6, col], [1, sh(col, -0.55)]], cx - r * 0.3, cy - r * 0.3));
    P.path(g, [cx - r * 0.75, cy - r * 0.2, cx - r * 0.2, cy - r * 0.75, cx + r * 0.1, cy - r * 0.1]); P.fill(g, G.rgba(sh(col, 0.75), 0.75));
    P.path(g, [cx + r * 0.8, cy + r * 0.1, cx + r * 0.1, cy + r * 0.8, cx, cy]); P.fill(g, G.rgba(sh(col, -0.6), 0.5));
    P.rect(g, cx - r * 0.5, cy - r * 0.55, Math.max(1, r * 0.3), Math.max(1, r * 0.3), '#ffffff');
  }
  function rivet(g, x, y, r, m) { P.circle(g, x, y, r, (m || MAT.steel)[3]); P.circle(g, x - r * 0.25, y - r * 0.25, r * 0.6, (m || MAT.steel)[1]); }
  function stitch(g, pts, col) { g.save(); g.setLineDash([1.2, 1.2]); g.strokeStyle = col || 'rgba(255,230,190,0.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); g.restore(); }
  function chain(g, x0, y0, x1, y1, m) {
    const n = 7; g.strokeStyle = (m || MAT.gold)[2]; g.lineWidth = 0.9;
    for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; g.beginPath(); g.ellipse(x, y, 0.9, 0.6, Math.atan2(y1 - y0, x1 - x0), 0, Math.PI * 2); g.stroke(); }
  }
  function ringBand(g, m, cy) {
    cy = cy || 20;
    g.lineWidth = 4.4; g.strokeStyle = m[4]; g.beginPath(); g.ellipse(16, cy, 9.6, 8.6, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3.2; g.strokeStyle = mfill(g, 6, cy - 9, 26, cy + 9, m); g.beginPath(); g.ellipse(16, cy, 9.6, 8.6, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 0.8; g.strokeStyle = G.rgba(m[0], 0.9); g.beginPath(); g.ellipse(16, cy, 9.6, 8.6, 0, Math.PI * 1.05, Math.PI * 1.55); g.stroke();
  }
  function ring(g, band, stone) {
    const m = band.length ? band : MAT.gold;
    ringBand(g, m);
    P.path(g, [10.5, 12, 13, 8, 19, 8, 21.5, 12, 19, 14.5, 13, 14.5]); P.fill(g, mfill(g, 10, 7, 22, 15, m));
    gemCut(g, 16, 10.8, 3.4, stone);
  }
  function glove(g, m, cuff) {
    // back of a gauntlet / glove: cuff, palm, four fingers and a thumb
    P.path(g, [8, 30, 7, 20, 8, 12, 24, 12, 25, 20, 23, 30]); P.fill(g, '#140c08');
    P.rrect(g, 8.6, 12.5, 15.4, 12.5, 3, mfill(g, 8, 12, 24, 25, m));
    for (let i = 0; i < 4; i++) { const x = 9 + i * 3.7; P.rrect(g, x - 0.4, 3.4 + (i === 0 || i === 3 ? 2 : 0), 3.6, 11, 1.6, '#140c08'); P.rrect(g, x, 4 + (i === 0 || i === 3 ? 2 : 0), 2.8, 10, 1.3, mfill(g, x, 4, x + 3, 14, m)); P.rect(g, x + 0.3, 8.5 + (i === 0 || i === 3 ? 1 : 0), 2.2, 0.7, G.rgba(m[4], 0.6)); }
    P.path(g, [23, 16, 28.5, 13, 29.5, 15.5, 25, 21]); P.fill(g, mfill(g, 23, 13, 30, 21, m));
    P.rrect(g, 7.4, 24, 17.2, 6.4, 1, mfill(g, 7, 24, 25, 30, cuff || m)); P.rect(g, 7.4, 24, 17.2, 1, G.rgba((cuff || m)[0], 0.8));
  }
  function boot(g, m, trim) {
    P.path(g, [9.6, 3, 21, 3, 21, 19, 28.5, 21.5, 29.5, 28, 7.5, 28, 8.5, 19]); P.fill(g, '#140c08');
    P.path(g, [10.4, 3.8, 20.2, 3.8, 20.2, 19.6, 27.6, 22, 28.4, 27, 8.6, 27, 9.6, 19.4]); P.fill(g, mfill(g, 8, 4, 28, 27, m));
    P.rect(g, 8.6, 25, 19.8, 2, G.rgba(m[4], 0.9));
    P.rrect(g, 9.6, 3, 11.2, 4, 1, mfill(g, 9, 3, 21, 7, trim || m));
    stitch(g, [11, 9, 11, 22]); stitch(g, [20, 20, 26, 22.5]);
  }
  function torso(g, m, o) {
    o = o || {};
    // shoulders, chest and waist of a tunic / cuirass
    P.path(g, [9, 3.5, 23, 3.5, 29.5, 8.5, 27, 15, 24.5, 13.5, 24.5, 29, 7.5, 29, 7.5, 13.5, 5, 15, 2.5, 8.5]); P.fill(g, '#120a0c');
    P.path(g, [9.4, 4.4, 22.6, 4.4, 28.6, 8.8, 26.6, 13.8, 23.6, 12.4, 23.6, 28.2, 8.4, 28.2, 8.4, 12.4, 5.4, 13.8, 3.4, 8.8]); P.fill(g, mfill(g, 3, 4, 29, 28, m));
    P.path(g, [12.6, 4.4, 16, 9, 19.4, 4.4]); P.fill(g, '#120a0c');
  }
  const GEAR = {
    gale_circlet(g) {
      g.lineWidth = 3.6; g.strokeStyle = MAT.gold[4]; g.beginPath(); g.ellipse(16, 20, 12, 5.4, 0, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2.4; g.strokeStyle = mfill(g, 4, 15, 28, 25, MAT.gold); g.beginPath(); g.ellipse(16, 20, 12, 5.4, 0, 0, Math.PI * 2); g.stroke();
      [[8, 17, 5], [16, 15, 8], [24, 17, 5]].forEach(([x, y, hh]) => { P.path(g, [x - 2.4, y + 1, x, y - hh, x + 2.4, y + 1]); P.fill(g, mfill(g, x - 3, y - hh, x + 3, y + 1, MAT.gold)); });
      gemCut(g, 16, 17.4, 2.2, '#40d8ff'); gemCut(g, 8.4, 19.4, 1.4, '#80f0ff'); gemCut(g, 23.6, 19.4, 1.4, '#80f0ff');
      g.strokeStyle = 'rgba(190,245,255,0.8)'; g.lineWidth = 0.9; g.beginPath(); g.arc(24, 7, 3, Math.PI * 0.2, Math.PI * 1.6); g.stroke(); g.beginPath(); g.moveTo(3, 9); g.quadraticCurveTo(12, 4, 20, 8); g.stroke();
    },
    brawler_band(g) {
      g.lineWidth = 6; g.strokeStyle = '#1a0608'; g.beginPath(); g.ellipse(16, 15, 11.5, 5.5, 0, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 4.4; g.strokeStyle = P.lg(g, 0, 10, 0, 21, ['#ff6a70', '#c01c2c', '#6a0a14']); g.beginPath(); g.ellipse(16, 15, 11.5, 5.5, 0, 0, Math.PI * 2); g.stroke();
      stitch(g, [6, 15, 10, 19.4, 16, 20.6, 22, 19.4, 26, 15]);
      P.path(g, [24, 17, 30, 27, 27, 28.5, 22, 20]); P.fill(g, P.lg(g, 22, 17, 30, 28, ['#e0303c', '#7a0c16']));
      P.path(g, [25, 17.5, 26, 29.5, 23, 29.5, 22.6, 20]); P.fill(g, P.lg(g, 22, 17, 26, 29, ['#c01c2c', '#5a0810']));
      P.circle(g, 24, 18.6, 2.2, '#a01424'); rivet(g, 9, 17.5, 1, MAT.steel); rivet(g, 16, 20.4, 1, MAT.steel);
    },
    warden_helm(g) {
      g.beginPath(); g.moveTo(5, 28); g.lineTo(5, 14); g.quadraticCurveTo(5, 3.5, 16, 3); g.quadraticCurveTo(27, 3.5, 27, 14); g.lineTo(27, 28); g.closePath(); P.fill(g, '#15161c');
      g.beginPath(); g.moveTo(6, 27); g.lineTo(6, 14); g.quadraticCurveTo(6, 4.5, 16, 4); g.quadraticCurveTo(26, 4.5, 26, 14); g.lineTo(26, 27); g.closePath(); P.fill(g, mfill(g, 6, 4, 26, 27, MAT.steel));
      P.rect(g, 15, 4, 2, 23, G.rgba(MAT.steel[0], 0.55)); P.rect(g, 17, 4, 1, 23, G.rgba(MAT.steel[4], 0.4));
      P.rrect(g, 7, 13, 18, 3, 0.4, '#0a0a10'); P.rect(g, 7, 13, 18, 0.8, '#000');
      for (let i = 0; i < 5; i++) P.rect(g, 9.5 + i * 3.2, 19, 1.4, 2.6, '#101018');
      [[7.6, 9], [24.4, 9], [7.6, 24.5], [24.4, 24.5]].forEach(([x, y]) => rivet(g, x, y, 1));
      P.path(g, [13, 4, 16, -0.5, 19, 4]); P.fill(g, '#c02838');
    },
    crimson_chalice(g) {
      P.path(g, [6.5, 4, 25.5, 4, 22.5, 14, 17.8, 17, 14.2, 17, 9.5, 14]); P.fill(g, '#1c1004');
      P.path(g, [7.5, 5, 24.5, 5, 21.8, 13.4, 17.4, 16, 14.6, 16, 10.2, 13.4]); P.fill(g, mfill(g, 7, 5, 25, 16, MAT.gold));
      P.ell(g, 16, 5.4, 8.5, 2, '#4a0610'); P.ell(g, 16, 5.8, 7.4, 1.4, P.lg(g, 8, 0, 24, 0, ['#ff5060', '#a00c1c']));
      gemCut(g, 16, 10.4, 1.8, '#e02030');
      P.rect(g, 14.6, 16, 2.8, 7, mfill(g, 14, 16, 18, 23, MAT.gold)); P.ell(g, 16, 18.5, 2.6, 1, MAT.gold[2]);
      P.ell(g, 16, 25.5, 7.4, 2.8, '#1c1004'); P.ell(g, 16, 25, 6.8, 2.2, mfill(g, 9, 23, 23, 27, MAT.gold));
      P.ell(g, 21.5, 9, 1, 3.5, 'rgba(255,40,60,0.9)'); P.circle(g, 21.5, 13.5, 1, '#c0101e');
    },
    jade_talisman(g) {
      chain(g, 7, 2, 13.5, 11); chain(g, 25, 2, 18.5, 11);
      P.circle(g, 16, 19.5, 10, '#0a2014');
      P.circle(g, 16, 19.5, 9.2, P.rg(g, 16, 19.5, 9.2, [[0, '#9af0c0'], [0.55, '#34a066'], [1, '#12482a']], 12.5, 16));
      g.strokeStyle = '#0e3a22'; g.lineWidth = 1; g.beginPath(); g.arc(16, 19.5, 6.4, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#d8ffe8'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(16, 14.5); g.lineTo(16, 24.5); g.moveTo(12.5, 17); g.lineTo(19.5, 22); g.moveTo(19.5, 17); g.lineTo(12.5, 22); g.stroke();
      P.circle(g, 16, 19.5, 1.8, '#0e3a22'); P.rrect(g, 13.8, 8.4, 4.4, 3, 0.6, mfill(g, 13, 8, 18, 11, MAT.gold));
    },
    wrath_amulet(g) {
      chain(g, 7, 2, 13.5, 9); chain(g, 25, 2, 18.5, 9);
      P.path(g, [16, 7.5, 27, 18.5, 16, 30, 5, 18.5]); P.fill(g, '#1c1004');
      P.path(g, [16, 8.8, 25.6, 18.5, 16, 28.6, 6.4, 18.5]); P.fill(g, mfill(g, 6, 9, 26, 29, MAT.gold));
      P.path(g, [16, 11.4, 23, 18.5, 16, 26, 9, 18.5]); P.fill(g, P.lg(g, 9, 11, 23, 26, ['#ff8a90', '#d0182c', '#5a0612']));
      P.path(g, [16, 11.4, 23, 18.5, 16, 18.5]); P.fill(g, 'rgba(255,190,200,0.4)'); P.path(g, [9, 18.5, 16, 26, 16, 18.5]); P.fill(g, 'rgba(40,0,6,0.35)');
      P.rect(g, 12.8, 14.6, 1.6, 1.6, '#ffffff'); rivet(g, 16, 9.6, 0.9, MAT.gold);
    },
    gore_tunic(g) {
      torso(g, ['#f2e6cc', '#d8c8a4', '#b0a07c', '#7a6c52', '#4a3e2c']);
      P.rect(g, 8.4, 19, 15.2, 3, mfill(g, 8, 19, 24, 22, MAT.leather)); P.rrect(g, 14.4, 18.6, 3.2, 3.8, 0.4, mfill(g, 14, 18, 18, 22, MAT.bronze));
      stitch(g, [16, 9.5, 16, 18], 'rgba(90,70,50,0.8)');
      [[12, 13, 3, 2.2], [19.5, 24.5, 2.6, 1.8], [11, 25.5, 1.8, 1.4], [21, 11, 1.6, 1.2]].forEach(([x, y, rx, ry]) => { P.ell(g, x, y, rx, ry, 'rgba(150,10,20,0.9)'); P.ell(g, x - 0.4, y - 0.3, rx * 0.5, ry * 0.4, 'rgba(210,40,50,0.8)'); });
      P.rect(g, 12, 15, 0.8, 3, 'rgba(150,10,20,0.9)');
    },
    blazing_shell(g) {
      torso(g, ['#ffe0a0', '#e07830', '#a03a14', '#5a1a0a', '#2a0a04']);
      [[8.4, 22], [23.6, 22], [16, 27]].forEach(([x, y]) => { P.path(g, [x - 2, y, x, y - 5, x + 2, y]); P.fill(g, 'rgba(255,200,60,0.85)'); });
      P.glow(g, 16, 17, 7, '#ff8020', 0.7);
      g.beginPath(); g.moveTo(16, 10.5); g.bezierCurveTo(20.5, 14, 20, 20, 16, 22.5); g.bezierCurveTo(12, 20, 11.5, 14, 16, 10.5); P.fill(g, P.lg(g, 0, 10, 0, 23, ['#fff6b0', '#ffb030', '#e04810']));
      P.ell(g, 16, 18.5, 1.6, 2.4, '#fff8d0');
    },
    defiant_plate(g) {
      torso(g, MAT.iron);
      P.path(g, [2.6, 8.6, 9, 3.8, 11, 9, 5.4, 14]); P.fill(g, mfill(g, 2, 3, 11, 14, MAT.iron)); P.path(g, [29.4, 8.6, 23, 3.8, 21, 9, 26.6, 14]); P.fill(g, mfill(g, 21, 3, 30, 14, MAT.iron));
      g.beginPath(); g.moveTo(11, 11); g.lineTo(21, 11); g.lineTo(20.6, 18); g.quadraticCurveTo(19, 23, 16, 25); g.quadraticCurveTo(13, 23, 11.4, 18); g.closePath(); P.fill(g, mfill(g, 11, 11, 21, 25, MAT.silver));
      g.strokeStyle = MAT.gold[2]; g.lineWidth = 0.9; g.stroke();
      P.rect(g, 15.3, 13, 1.4, 9, '#9a1a24'); P.rect(g, 12.8, 15.3, 6.4, 1.4, '#9a1a24');
      [[10, 26], [22, 26]].forEach(([x, y]) => rivet(g, x, y, 0.8, MAT.gold));
    },
    stalwart_cuirass(g) {
      torso(g, MAT.steel);
      P.path(g, [2.6, 8.6, 9, 3.8, 11, 9, 5.4, 14]); P.fill(g, mfill(g, 2, 3, 11, 14, MAT.steel)); P.path(g, [29.4, 8.6, 23, 3.8, 21, 9, 26.6, 14]); P.fill(g, mfill(g, 21, 3, 30, 14, MAT.steel));
      g.strokeStyle = MAT.gold[1]; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3.4, 8.8); g.lineTo(9.2, 4.4); g.moveTo(28.6, 8.8); g.lineTo(22.8, 4.4); g.stroke();
      P.path(g, [9.5, 10, 16, 14, 22.5, 10, 22, 21, 16, 25.5, 10, 21]); P.fill(g, G.rgba(MAT.steel[0], 0.25));
      P.rect(g, 15.4, 10, 1.2, 15, G.rgba(MAT.steel[4], 0.5));
      P.path(g, [13, 13, 19, 13, 16, 17.5]); P.fill(g, mfill(g, 13, 13, 19, 18, MAT.gold));
      for (let i = 0; i < 3; i++) P.rect(g, 8.4, 22.5 + i * 2, 15.2, 0.8, G.rgba(MAT.steel[4], 0.7));
      [[10, 12], [22, 12], [10, 26], [22, 26]].forEach(([x, y]) => rivet(g, x, y, 0.8, MAT.gold));
    },
    stillhunter_garb(g) {
      torso(g, ['#8aa66a', '#5e7a44', '#3e5630', '#28381e', '#141c0e']);
      P.path(g, [11, 4.4, 16, 12, 21, 4.4, 19.4, 3, 16, 7, 12.6, 3]); P.fill(g, '#243218');
      stitch(g, [16, 12, 16, 27]);
      for (let i = 0; i < 4; i++) { g.strokeStyle = '#c8a870'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(14.2, 13 + i * 3); g.lineTo(17.8, 14.6 + i * 3); g.moveTo(17.8, 13 + i * 3); g.lineTo(14.2, 14.6 + i * 3); g.stroke(); }
      P.rect(g, 8.4, 21, 15.2, 2.6, mfill(g, 8, 21, 24, 24, MAT.leather));
      [[10.5, 16], [21, 16.5], [11, 25.5], [21.5, 26]].forEach(([x, y]) => P.ell(g, x, y, 1.8, 1.1, '#6a8a3a', 0.5));
    },
    stalker_grips(g) { glove(g, MAT.leather, ['#6a4a8a', '#4a2c6a', '#301a48', '#1e0e30', '#0e0618']); stitch(g, [10, 14, 22, 14]); gemCut(g, 16, 18.5, 2.2, '#40e0ff'); },
    spark_gauntlets(g) {
      glove(g, MAT.steel, MAT.iron);
      for (let i = 0; i < 3; i++) P.rect(g, 9, 15.5 + i * 2.4, 14.6, 0.7, G.rgba(MAT.steel[4], 0.6));
      [[10.5, 3], [21.5, 5]].forEach(([x, y], i) => { P.glow(g, x, y, 4, i ? '#ff8020' : '#ffd040', 0.9); P.path(g, [x - 1, y - 3, x + 1.5, y - 0.5, x - 0.3, y, x + 1, y + 3]); g.strokeStyle = '#fff4a0'; g.lineWidth = 0.8; g.stroke(); });
      rivet(g, 11, 27, 0.8); rivet(g, 21, 27, 0.8);
    },
    duelist_ember(g) { glove(g, ['#ffffff', '#ece2d2', '#c8b8a0', '#8a7a64', '#4a3e30'], MAT.gold); gemCut(g, 16, 18.5, 2.6, '#ff6a20'); P.glow(g, 16, 18.5, 5, '#ff7a20', 0.5); },
    tempo_treads(g) {
      boot(g, MAT.leather, MAT.bronze);
      P.path(g, [21, 9, 30, 4.5, 28.5, 8, 31, 8.5, 27.5, 12, 29.5, 13, 21, 15]); P.fill(g, P.lg(g, 21, 4, 31, 15, ['#ffffff', '#bfe8ff', '#6aa8d8']));
      g.strokeStyle = '#3a6a9a'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(22, 11); g.lineTo(28, 6.5); g.moveTo(22, 13); g.lineTo(28, 10); g.stroke();
    },
    striders(g) { boot(g, MAT.leather); rivet(g, 12, 13, 0.8, MAT.bronze); rivet(g, 18, 13, 0.8, MAT.bronze); P.rect(g, 9.6, 16, 10.6, 1.6, MAT.leather[3]); rivet(g, 15, 16.8, 0.9, MAT.steel); },
    grave_walkers(g) {
      boot(g, ['#8a6aa8', '#5e3e80', '#3e2458', '#26143a', '#12081e'], MAT.silver);
      P.circle(g, 14.5, 13, 2.8, P.vol(g, 14.5, 13, 2.8, '#ece2c8')); P.rect(g, 13.2, 14.6, 2.6, 1.6, '#dcd0b0');
      P.rect(g, 13.3, 12.4, 0.9, 1, '#1a1018'); P.rect(g, 14.9, 12.4, 0.9, 1, '#1a1018');
    },
    oak_band(g) { ring(g, ['#d8a870', '#9a6a38', '#6a4420', '#40280e', '#1e1206'], '#6ad060'); for (let i = 0; i < 5; i++) P.rect(g, 8 + i * 3.5, 26 + (i % 2), 1.6, 0.5, '#2a1a0a'); },
    bronze_loop(g) { ring(g, MAT.bronze, '#ff5030'); },
    steel_signet(g) { ringBand(g, MAT.silver); P.rrect(g, 10, 6.5, 12, 8, 1.5, '#16181e'); P.rrect(g, 10.8, 7.2, 10.4, 6.6, 1.2, mfill(g, 10, 7, 22, 14, MAT.silver)); P.path(g, [14, 8.4, 18, 8.4, 18, 12.6, 16, 13.6, 14, 12.6]); P.fill(g, MAT.silver[3]); },
    infernal_pact(g) { ring(g, MAT.iron, '#ff2030'); P.glow(g, 16, 10.8, 7, '#ff3040', 0.55); P.path(g, [11, 9, 9, 4.5, 12.5, 7.5]); P.fill(g, MAT.iron[1]); P.path(g, [21, 9, 23, 4.5, 19.5, 7.5]); P.fill(g, MAT.iron[1]); },
    greed_signet(g) { ringBand(g, MAT.gold); P.circle(g, 16, 10.5, 5.6, '#1c1004'); P.circle(g, 16, 10.5, 4.9, mfill(g, 11, 6, 21, 15, MAT.gold)); P.circle(g, 16, 10.5, 3.2, MAT.gold[3]); P.path(g, [16, 8.1, 16.7, 9.8, 18.4, 10.5, 16.7, 11.2, 16, 12.9, 15.3, 11.2, 13.6, 10.5, 15.3, 9.8]); P.fill(g, MAT.gold[0]); gemCut(g, 11, 14.5, 1.1, '#e02838'); gemCut(g, 21, 14.5, 1.1, '#e02838'); },
    aegis_ring(g) { ring(g, MAT.silver, '#4a90ff'); P.path(g, [12.5, 17, 19.5, 17, 19, 21, 16, 23.5, 13, 21]); P.fill(g, mfill(g, 12, 17, 20, 24, MAT.silver)); },
    signet_flame(g) { signet(g, '#e8602a', 'flame'); },
    signet_frost(g) { signet(g, '#3aa8e8', 'snow'); },
    signet_storm(g) { signet(g, '#e8c020', 'bolt'); },
    signet_arcana(g) { signet(g, '#9a50e0', 'wisp'); },
    signet_steel(g) { signet(g, '#8a92a6', 'sword'); },
    signet_legion(g) { signet(g, '#40b080', 'golem'); },
  };
  function signet(g, col, glyph) {
    ringBand(g, MAT.gold, 21.5);
    P.circle(g, 16, 11, 9.2, '#1c1004');
    P.circle(g, 16, 11, 8.4, mfill(g, 8, 3, 24, 19, MAT.gold));
    P.circle(g, 16, 11, 6.6, P.rg(g, 16, 11, 6.6, [[0, sh(col, 0.15)], [1, sh(col, -0.65)]], 14, 9));
    g.save(); g.translate(16, 11); g.scale(0.34, 0.34); g.translate(-16, -16); GL[glyph](g); g.restore();
    P.rect(g, 11.5, 5.4, 1.6, 1.6, 'rgba(255,255,255,0.7)');
  }
  DH.gearGlyphs = GEAR;

  const TRAIT_GLYPH = Object.assign({}, ...Object.entries(C.baseTraits).map(([k, v]) => ({ [k]: v.icon })), ...Object.entries(C.elevatedTraits).map(([k, v]) => ({ [k]: v.icon })));
  const ARTIFACT = Object.fromEntries(Object.entries(DH.economy.artifacts).map(([k, v]) => [k, v.icon || ['skull', '#5a5e6a']]));
  /* artifact glyphs */
  const M = (c) => P.lg(g0, 0, 4, 0, 28, [sh(c, 0.4), c, sh(c, -0.45)]); let g0 = null;
  Object.assign(GL, {
    mirror(g) { g0 = g; P.ell(g, 16, 14, 9, 11, M('#c89030')); P.ell(g, 16, 14, 6.6, 8.6, P.lg(g, 10, 6, 22, 22, ['#e8f4ff', '#6a8aa8', '#1a2a3a'])); P.rrect(g, 14, 25, 4, 5, 1, '#c89030'); P.path(g, [12, 9, 15, 8, 12, 14]); P.fill(g, 'rgba(255,255,255,0.6)'); },
    bell(g) { g0 = g; g.beginPath(); g.moveTo(6, 24); g.quadraticCurveTo(8, 8, 16, 6); g.quadraticCurveTo(24, 8, 26, 24); g.closePath(); P.fill(g, M('#d8a838')); P.rect(g, 5, 23, 22, 3, '#8a6420'); P.circle(g, 16, 28, 2.4, '#8a6420'); P.circle(g, 16, 5, 2, '#8a6420'); },
    totem(g) { g0 = g; P.rrect(g, 9, 4, 14, 25, 2, M('#8a6a3a')); [[12, 10], [20, 10], [12, 19], [20, 19]].forEach(([x, y]) => P.circle(g, x, y, 1.8, '#1a0a04')); P.rect(g, 12, 13.5, 8, 1.6, '#1a0a04'); P.rect(g, 12, 22.5, 8, 1.6, '#1a0a04'); P.path(g, [9, 4, 5, 2, 9, 9]); P.fill(g, '#6a4a2a'); P.path(g, [23, 4, 27, 2, 23, 9]); P.fill(g, '#6a4a2a'); },
    thread(g) { g0 = g; P.circle(g, 14, 16, 9, M('#c8a040')); g.strokeStyle = '#6a4a14'; g.lineWidth = 0.8; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(14, 16, 9, 3 + Math.abs(i) * 1.4, i * 0.6, 0, Math.PI * 2); g.stroke(); } g.strokeStyle = '#f0d890'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(21, 21); g.quadraticCurveTo(27, 24, 29, 30); g.stroke(); },
    wheel(g) { g0 = g; g.strokeStyle = M('#b01828'); g.lineWidth = 3; g.beginPath(); g.arc(16, 16, 11, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.line(g, 16, 16, 16 + Math.cos(a) * 11, 16 + Math.sin(a) * 11, 1.6, '#e04050'); } P.circle(g, 16, 16, 3, '#ffd0d0'); },
    eye(g) { g0 = g; g.beginPath(); g.moveTo(3, 16); g.quadraticCurveTo(16, 4, 29, 16); g.quadraticCurveTo(16, 28, 3, 16); P.fill(g, '#f0e8e0'); P.circle(g, 16, 16, 6, P.rg(g, 16, 16, 6, ['#ff6050', '#a01020'])); P.circle(g, 16, 16, 2.4, '#100008'); P.circle(g, 14, 14, 1.2, '#ffffff'); },
    scales(g) { g0 = g; P.line(g, 16, 4, 16, 27, 1.6, '#c89030'); P.line(g, 5, 9, 27, 9, 1.6, '#c89030'); [7, 25].forEach((x, i) => { P.line(g, x, 9, x - 4, 18, 0.6, '#e8c860'); P.line(g, x, 9, x + 4, 18, 0.6, '#e8c860'); P.ell(g, x, 18 + (i ? 2 : 0), 5, 1.8, M('#d8a838')); }); P.rrect(g, 10, 26, 12, 3, 1, '#8a6420'); },
    lens(g) { g0 = g; g.strokeStyle = M('#c89030'); g.lineWidth = 2.4; g.beginPath(); g.arc(13, 13, 8, 0, Math.PI * 2); g.stroke(); P.circle(g, 13, 13, 6.8, 'rgba(160,210,255,0.55)'); P.line(g, 19, 19, 28, 28, 3.4, '#6a4a2a'); g.strokeStyle = '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.arc(13, 13, 4, 3.6, 4.6); g.stroke(); },
    cube(g) { g0 = g; P.path(g, [16, 3, 28, 9, 16, 15, 4, 9]); P.fill(g, '#d04050'); P.path(g, [4, 9, 16, 15, 16, 29, 4, 22]); P.fill(g, '#8a1a2a'); P.path(g, [28, 9, 16, 15, 16, 29, 28, 22]); P.fill(g, '#5a0a18'); P.circle(g, 10, 17, 1.6, '#ffd040'); P.circle(g, 22, 17, 1.6, '#ffd040'); },
    stone(g) { g0 = g; P.path(g, [6, 26, 4, 14, 10, 6, 22, 5, 28, 13, 27, 26]); P.fill(g, M('#7a7a82')); P.path(g, [10, 6, 22, 5, 17, 12]); P.fill(g, 'rgba(255,255,255,0.25)'); g.strokeStyle = '#2a2a30'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(9, 15); g.lineTo(15, 18); g.lineTo(13, 24); g.stroke(); },
    scarab(g) { g0 = g; P.ell(g, 16, 18, 8, 10, M('#e0b030')); P.line(g, 16, 9, 16, 28, 1, '#6a4a10'); P.circle(g, 16, 7, 4, M('#c89020')); for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) P.line(g, 16 + s2 * 7, 13 + i * 5, 16 + s2 * 12, 11 + i * 6, 1.2, '#8a6420'); },
    mask(g) { g0 = g; g.beginPath(); g.moveTo(5, 8); g.quadraticCurveTo(16, 2, 27, 8); g.quadraticCurveTo(28, 22, 16, 29); g.quadraticCurveTo(4, 22, 5, 8); P.fill(g, M('#c8c8d8')); P.ell(g, 11, 14, 3, 2, '#1a1020'); P.ell(g, 21, 14, 3, 2, '#1a1020'); g.strokeStyle = '#1a1020'; g.lineWidth = 1.2; g.beginPath(); g.arc(16, 25, 5, 3.6, 5.8); g.stroke(); P.line(g, 11, 17, 10, 23, 0.8, '#6080c0'); },
    chain(g) { g0 = g; for (let i = 0; i < 4; i++) { g.strokeStyle = M('#8a8a9a'); g.lineWidth = 2.4; g.beginPath(); g.ellipse(8 + i * 5.6, 8 + i * 5.6, 4.6, 2.8, 0.785, 0, Math.PI * 2); g.stroke(); } },
    root(g) { g0 = g; g.lineCap = 'round'; [[16, 4, 16, 16, 3], [16, 16, 7, 28, 2.4], [16, 16, 25, 27, 2.4], [16, 18, 16, 29, 2], [12, 22, 5, 22, 1.4]].forEach(([a, b, c, d, w]) => P.line(g, a, b, c, d, w, '#6a4a2a')); P.circle(g, 16, 6, 3.4, '#b050ff'); P.glow(g, 16, 6, 6, '#b050ff', 0.6); },
    laurel(g) { g0 = g; for (const s2 of [-1, 1]) for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + s2 * (0.4 + i * 0.36), x = 16 + Math.cos(a) * 11, y = 17 + Math.sin(a) * 11; P.ell(g, x, y, 3, 1.4, M('#d0a020'), a + s2 * 0.8); } P.circle(g, 16, 7, 2.6, '#ff3040'); },
    goblet(g) { g0 = g; P.path(g, [7, 4, 25, 4, 21, 15, 11, 15]); P.fill(g, M('#d8d0c0')); P.rect(g, 14.5, 15, 3, 9, '#b8b0a0'); P.ell(g, 16, 26, 7, 2.6, '#a8a090'); P.ell(g, 16, 5, 9, 2, '#c0e0ff'); },
    ulcer(g) { g0 = g; P.glow(g, 16, 16, 12, '#8040c0', 0.6); P.path(g, [16, 3, 25, 13, 21, 29, 11, 29, 7, 13]); P.fill(g, P.lg(g, 7, 3, 25, 29, ['#6a4a7a', '#1a0a20', '#000000'])); P.path(g, [16, 3, 25, 13, 16, 14]); P.fill(g, 'rgba(200,140,255,0.35)'); },
    curtain(g) { g0 = g; P.rect(g, 3, 3, 26, 3, '#c89030'); for (let i = 0; i < 2; i++) { const x = i ? 17 : 4; P.path(g, [x, 6, x + 11, 6, x + (i ? 0 : 11) + (i ? 4 : -4), 29, x + (i ? 11 : 0), 29]); P.fill(g, M('#8a1a2a')); } P.path(g, [15, 10, 17, 6, 19, 12]); P.fill(g, '#f0d0d0'); },
    flute(g) { g0 = g; g.save(); g.translate(16, 16); g.rotate(-0.7); P.rrect(g, -13, -2, 26, 4, 2, M('#c89050')); for (let i = 0; i < 5; i++) P.circle(g, -6 + i * 4, 0, 0.9, '#3a200e'); g.restore(); [[24, 7], [27, 12]].forEach(([x, y]) => { P.circle(g, x, y + 3, 1.6, '#f0e0ff'); P.line(g, x + 1.4, y + 3, x + 1.4, y - 2, 0.8, '#f0e0ff'); }); },
    pendulum(g) { g0 = g; P.rect(g, 6, 3, 20, 2.4, '#8a6420'); P.line(g, 16, 5, 21, 20, 1.2, '#c8b890'); P.circle(g, 21.5, 22, 5, P.vol(g, 21.5, 22, 5, '#40c060')); P.circle(g, 20, 20.5, 1.2, '#e0ffe0'); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.arc(16, 5, 18, 1.2, 1.9); g.stroke(); },
    bones(g) { g0 = g; P.bone(g, 7, 7, 25, 25, 2.4, '#e8f0f8'); P.bone(g, 25, 7, 7, 25, 2.4, '#d8e0ec'); g.strokeStyle = '#6a90b8'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(14, 12); g.lineTo(17, 15); g.lineTo(15, 18); g.stroke(); },
  });
  GL.moon = (g) => { P.circle(g, 16, 16, 11, P.vol(g, 16, 16, 11, '#e02838')); P.circle(g, 20, 13, 9, 'rgba(0,0,0,0.55)'); };

  function heroPortrait(g, id, frame) {
    // crop the head and shoulders out of the in-game sprite, one sprite pixel per icon pixel
    const s = G.sprite(id), k = G.CPX, img = s.frames[0];
    const n = frame ? 13 : 16, sx = Math.round((s.ox - n / 2) * k), sy = Math.round((s.oy - 12.6) * k);
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, n * k, n * k, frame ? 3 : 0, frame ? 3 : 0, n * 2, n * 2); // 2 box units per sprite unit
  }
  /** Draw an in-game sprite centred in the 32 box at an integer (or nearest) scale. */
  function spriteIcon(g, name, box) {
    // works in icon pixels: the box is in design units, the canvas has U2 pixels per unit
    const s = G.sprite(name), img = s.frames[0], w = img.width, h = img.height, m = Math.max(w, h), bp = box * U2;
    const k = (m <= bp ? Math.floor(bp / m) : bp / m) / U2;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, Math.round((16 - w * k / 2) * U2) / U2, Math.round((16 - h * k / 2) * U2) / U2, w * k, h * k);
  }
  const ICON_STYLE = { dither: 10, sat: 0.95 };


  /* ---------- UI glyphs (u_*): replace emoji and typographic symbols with pixel icons ---------- */
  const IRON = ['#e8ecf4', '#aab0c0', '#6a7084', '#3a3e4c', '#1a1c24'];
  const UI = {
    agony(g) { P.glow(g, 16, 15, 14, '#ff2a3a', 0.5); P.circle(g, 16, 13, 10, P.vol(g, 16, 13, 10, '#e4d8bc')); P.rrect(g, 10.5, 18, 11, 8, 2, '#d0c4a4');
      P.ell(g, 12, 13.4, 3, 3.2, '#1a0608', -0.3); P.ell(g, 20, 13.4, 3, 3.2, '#1a0608', 0.3); P.circle(g, 12.3, 13.6, 1.2, '#ff3040'); P.circle(g, 19.7, 13.6, 1.2, '#ff3040');
      P.path(g, [16, 16.4, 14.6, 19.2, 17.4, 19.2]); P.fill(g, '#1a0608'); for (let i = 0; i < 4; i++) P.line(g, 12.2 + i * 2.5, 22, 12.2 + i * 2.5, 25.6, 0.8, '#6a5a40');
      P.path(g, [9, 6, 5, 1, 11, 4.4]); P.fill(g, '#c8b890'); P.path(g, [23, 6, 27, 1, 21, 4.4]); P.fill(g, '#c8b890'); },
    kill(g) { g.save(); g.translate(16, 16); for (const s of [-1, 1]) { g.save(); g.scale(s, 1); g.rotate(-0.78); P.path(g, [-1.8, 6, -1.8, -11, 0, -15, 1.8, -11, 1.8, 6]); P.fill(g, P.lg(g, -2, 0, 2, 0, [IRON[0], IRON[2]])); P.line(g, 0, 4, 0, -11, 0.6, 'rgba(160,20,30,0.9)'); P.rrect(g, -5.4, 5, 10.8, 2.2, 1, '#b08030'); P.rrect(g, -1.3, 7, 2.6, 6, 1, '#5a3a20'); P.circle(g, 0, 13.6, 1.5, '#b08030'); g.restore(); } g.restore(); },
    lock(g) { g.strokeStyle = P.lg(g, 0, 3, 0, 16, [IRON[0], IRON[3]]); g.lineWidth = 3.4; g.beginPath(); g.moveTo(10, 15); g.lineTo(10, 10.5); g.arc(16, 10.5, 6, Math.PI, 0); g.lineTo(22, 15); g.stroke();
      P.rrect(g, 6.5, 14, 19, 14, 2.5, P.lg(g, 0, 14, 0, 28, ['#e8c060', '#b07a20', '#5a3a10'])); P.rrect(g, 6.5, 14, 19, 2, 1, 'rgba(255,255,255,0.3)');
      P.circle(g, 16, 19.6, 2.3, '#1c1004'); P.path(g, [14.8, 20.4, 17.2, 20.4, 16.8, 25, 15.2, 25]); P.fill(g, '#1c1004'); },
    unlock(g) { g.strokeStyle = P.lg(g, 0, 3, 0, 16, [IRON[0], IRON[3]]); g.lineWidth = 3.4; g.beginPath(); g.moveTo(22, 15); g.lineTo(22, 9); g.arc(16, 9, 6, 0, Math.PI, true); g.lineTo(10, 11); g.stroke();
      P.rrect(g, 6.5, 14, 19, 14, 2.5, P.lg(g, 0, 14, 0, 28, ['#b8f070', '#5aa030', '#2a5010'])); P.circle(g, 16, 19.6, 2.3, '#0c1a04'); P.path(g, [14.8, 20.4, 17.2, 20.4, 16.8, 25, 15.2, 25]); P.fill(g, '#0c1a04'); },
    check(g) { g.strokeStyle = '#0c2008'; g.lineWidth = 6.4; g.beginPath(); g.moveTo(6, 16.5); g.lineTo(13, 23.5); g.lineTo(26.5, 8.5); g.stroke();
      g.strokeStyle = P.lg(g, 0, 8, 0, 24, ['#c8ff90', '#5ad040', '#2a8a20']); g.lineWidth = 3.8; g.stroke(); },
    secret(g) { P.glow(g, 16, 16, 14, '#c070ff', 0.6); const st = (r, w, c) => { P.path(g, [16, 16 - r, 16 + w, 16 - w, 16 + r, 16, 16 + w, 16 + w, 16, 16 + r, 16 - w, 16 + w, 16 - r, 16, 16 - w, 16 - w]); P.fill(g, c); };
      st(13, 3.2, '#6a2a9a'); st(10.5, 2.2, '#e0b0ff'); P.circle(g, 16, 16, 2, '#ffffff'); },
    star(g) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.6 : 13; pts.push(16 + Math.cos(a) * r, 16.6 + Math.sin(a) * r); } P.path(g, pts); P.fill(g, '#3a2408'); g.save(); g.translate(16, 16.6); g.scale(0.82, 0.82); g.translate(-16, -16.6); P.path(g, pts); P.fill(g, P.lg(g, 0, 4, 0, 28, ['#fff4b0', '#f0b030', '#a86a10'])); g.restore(); },
    star0(g) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.6 : 13; pts.push(16 + Math.cos(a) * r, 16.6 + Math.sin(a) * r); } P.path(g, pts); P.fill(g, '#1a1418'); g.save(); g.translate(16, 16.6); g.scale(0.78, 0.78); g.translate(-16, -16.6); P.path(g, pts); P.fill(g, '#3e3440'); g.restore(); },
    bag(g) { // a leather satchel: flap, buckle strap, shoulder strap
      g.strokeStyle = '#1a0e06'; g.lineWidth = 4; g.beginPath(); g.moveTo(9, 13); g.quadraticCurveTo(16, 1, 23, 13); g.stroke();
      g.strokeStyle = '#7a4a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(9, 13); g.quadraticCurveTo(16, 1, 23, 13); g.stroke();
      P.path(g, [5, 13, 27, 13, 28.5, 27, 26, 29, 6, 29, 3.5, 27]); P.fill(g, '#1a0e06');
      P.path(g, [6.5, 14.5, 25.5, 14.5, 26.8, 26.4, 25, 27.6, 7, 27.6, 5.2, 26.4]); P.fill(g, P.lg(g, 0, 14, 0, 28, ['#b07840', '#8a5428', '#5a3416']));
      P.path(g, [5.4, 13, 26.6, 13, 25.6, 20.5, 16, 22.6, 6.4, 20.5]); P.fill(g, '#1a0e06');
      P.path(g, [6.8, 14.2, 25.2, 14.2, 24.4, 19.6, 16, 21.4, 7.6, 19.6]); P.fill(g, P.lg(g, 0, 14, 0, 21, ['#d09a58', '#9a6230']));
      g.fillStyle = '#5a3416'; g.fillRect(14.6, 19.5, 2.8, 6);
      P.path(g, [13.2, 21, 18.8, 21, 18.8, 25.4, 13.2, 25.4]); P.fill(g, '#1a0e06');
      P.path(g, [14.2, 22, 17.8, 22, 17.8, 24.4, 14.2, 24.4]); P.fill(g, P.lg(g, 0, 22, 0, 24.4, ['#fff0a0', '#c89030']));
      g.strokeStyle = 'rgba(255,230,180,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(8, 15.4); g.lineTo(24, 15.4); g.stroke(); },
    close(g) { for (const [w, c] of [[6, '#140a0c'], [3.4, '#e8dcc8']]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(8, 8); g.lineTo(24, 24); g.moveTo(24, 8); g.lineTo(8, 24); g.stroke(); } },
    cog(g) { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 10 : 13.4; pts.push(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } P.path(g, pts); P.fill(g, P.lg(g, 0, 3, 0, 29, [IRON[1], IRON[2], IRON[4]]));
      P.circle(g, 16, 16, 8.4, P.lg(g, 0, 8, 0, 24, [IRON[0], IRON[2]])); P.circle(g, 16, 16, 4, '#1a1c24'); },
    hand(g) { // a touch: a fingertip dot inside two fading rings
      g.strokeStyle = 'rgba(240,200,110,0.45)'; g.lineWidth = 1.6; g.beginPath(); g.arc(16, 16, 13, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(240,200,110,0.8)'; g.lineWidth = 2; g.beginPath(); g.arc(16, 16, 8.6, 0, Math.PI * 2); g.stroke();
      P.circle(g, 16, 16, 5, P.vol(g, 16, 16, 5, '#f0c860')); },
    left(g) { P.path(g, [22, 5, 22, 27, 7, 16]); P.fill(g, '#1a1004'); P.path(g, [20.4, 8, 20.4, 24, 9.4, 16]); P.fill(g, P.lg(g, 0, 8, 0, 24, ['#fff0a0', '#e0b040', '#a06a10'])); },
    right(g) { P.path(g, [10, 5, 10, 27, 25, 16]); P.fill(g, '#1a1004'); P.path(g, [11.6, 8, 11.6, 24, 22.6, 16]); P.fill(g, P.lg(g, 0, 8, 0, 24, ['#fff0a0', '#e0b040', '#a06a10'])); },
  };
  function draw(name) {
    const c = G.canvas(SIZE, SIZE), g = c.getContext('2d');
    g.scale(U2, U2); g.lineJoin = 'round'; g.lineCap = 'round';
    const [pre, ...rest] = name.split('_'); const id = rest.join('_');
    if (name === 'i_gold') GL.coin(g);
    else if (name === 'i_gem') GL.gem(g);
    else if (name === 'i_energy') GL.torch(g);
    else if (name === 'i_revive') GL.ankh(g);
    else if (name === 'i_reroll') GL.dice(g);
    else if (pre === 'u' && UI[id]) UI[id](g);
    else if (name === 'n_battle') GL.swords(g);
    else if (name === 'n_shrine') GL.altar(g);
    else if (name === 'n_scroll') GL.scroll(g);
    else if (name === 'n_trophy') GL.trophy(g);
    else if (name === 'n_calendar') GL.calendar(g);
    else if (name === 'n_pass') GL.banner(g);
    else if (name === 'n_ad') GL.tv(g);
    else if (name === 'n_skull') GL.skull(g);
    else if (name === 'n_book') GL.book(g);
    else if (name === 't_wisdom') GL.book(g);
    else if (name === 't_haste') GL.hourglass(g);
    else if (name === 't_might') GL.fistup(g);
    else if (name === 'c_wood') GL.chest(g, '#8a5a2a');
    else if (name === 'c_silver') GL.chest(g, '#4a5a7a');
    else if (name === 'c_gold') GL.chest(g, '#8a2034');
    else if (name === 'c_red') GL.chest(g, '#8a1a24');
    else if (pre === 'h' && DH.gfx.painters[id]) { P.circle(g, 16, 16, 15.5, P.rg(g, 16, 20, 16, ['#4a3a44', '#1a1016'])); g.save(); g.beginPath(); g.arc(16, 16, 15, 0, Math.PI * 2); g.clip(); g.setTransform(1, 0, 0, 1, 0, 0); g.scale(U2, U2); heroPortrait(g, id); g.restore(); }
    else if (pre === 'm' && DH.gfx.painters[id]) { P.circle(g, 16, 16, 15, P.lg(g, 0, 1, 0, 31, ['#fff0a0', '#c89030', '#6a4a14'])); P.circle(g, 16, 16, 12.5, P.rg(g, 16, 18, 13, ['#4a3a44', '#1a1016'])); g.save(); g.beginPath(); g.arc(16, 16, 12.3, 0, Math.PI * 2); g.clip(); g.setTransform(1, 0, 0, 1, 0, 0); g.scale(U2, U2); heroPortrait(g, id, true); g.restore(); }
    else if (pre === 'ab') {
      const def = C.abilities[id];
      const tag = def && def.badge ? def.badge : def ? (def.tags.find((t) => ['fire', 'lightning', 'ice'].includes(t)) || (def.tags.includes('summon') ? 'summon' : def.tags.includes('magic') ? 'magic' : def.tags[0])) : 'physical';
      badge(g, ELEM[tag] || ELEM.physical);
      const gl = def && GL[def.icon]; if (gl) { g.save(); g.translate(16, 16); g.scale(0.82, 0.82); g.translate(-16, -16); gl(g); g.restore(); }
      if (def && def.hero) { P.circle(g, 26, 26, 4.2, '#e8c050'); GL.starSmallAt(g, 26, 26); }
    }
    else if (pre === 'tr') { badge(g, C.elevatedTraits[id] ? '#b07020' : '#4a3a5a', true); const gl = GL[TRAIT_GLYPH[id]]; if (gl) { g.save(); g.translate(16, 16); g.scale(0.72, 0.72); g.translate(-16, -16); gl(g); g.restore(); } }
    else if (pre === 'g' && GEAR[id]) GEAR[id](g);
    else if (pre === 's') { g.globalAlpha = 0.25; const t = { head: 'warden_helm', neck: 'wrath_amulet', chest: 'stalwart_cuirass', hands: 'stalker_grips', feet: 'striders', ring1: 'oak_band', ring2: 'oak_band' }[id]; if (GEAR[t]) GEAR[t](g); }
    else if (pre === 'p') { const col = { remembrance: '#60a0ff', resonance: '#ff9a30', lethe: '#8a8a9a' }[id]; P.glow(g, 16, 20, 12, col, 0.5); GL.flask(g, col); }
    else if (pre === 'herb') spriteIcon(g, 'herb_' + id, 28);
    else if (pre === 'a' && ARTIFACT[id]) { badge(g, ARTIFACT[id][1], true); g.save(); g.translate(16, 16); g.scale(0.7, 0.7); g.translate(-16, -16); GL[ARTIFACT[id][0]](g); g.restore(); }
    else if (DH.gfx.painters[name]) spriteIcon(g, name, 30);
    else if (GL[name]) GL[name](g);
    return G.classicize(c, ICON_STYLE, 2).toDataURL();
  }
  GL.starSmallAt = (g, x, y) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.4 : 3.2; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); } P.path(g, pts); P.fill(g, '#fff8e0'); };

  DH.icons = {
    url(name) { return cache[name] || (cache[name] = draw(name)); },
    img(name, cls) { const el = document.createElement('img'); el.src = this.url(name); el.className = 'ic ' + (cls || ''); el.alt = ''; el.draggable = false; return el; },
  };
  // UI modules call DH.art.img / DH.art.icon — route them to the vector icons.
  DH.art.img = (n, c) => DH.icons.img(n, c);
  DH.art.icon = (n) => DH.icons.url(n);
})(window.DH);
