/* HD vector painters: pickups, props and projectiles. */
(function (DH) {
  'use strict';
  const G = DH.gfx, P = G.P, sh = G.shade;
  const def = (name, o) => { G.painters[name] = o; };

  function gem(g, cx, cy, r, col) {
    const pts = [cx, cy - r * 1.3, cx + r, cy - r * 0.2, cx + r * 0.55, cy + r * 1.1, cx - r * 0.55, cy + r * 1.1, cx - r, cy - r * 0.2];
    P.path(g, pts); P.fill(g, P.lg(g, cx - r, cy - r, cx + r, cy + r, [sh(col, 0.55), col, sh(col, -0.45)]));
    P.path(g, [cx, cy - r * 1.3, cx + r, cy - r * 0.2, cx, cy + 0.1 * r]); P.fill(g, G.rgba(sh(col, 0.7), 0.55));
    P.path(g, [cx - r, cy - r * 0.2, cx, cy + 0.1 * r, cx - r * 0.55, cy + r * 1.1]); P.fill(g, G.rgba(sh(col, -0.6), 0.35));
    P.circle(g, cx - r * 0.35, cy - r * 0.55, r * 0.22, 'rgba(255,255,255,0.9)');
  }
  const GEMS = { gem1: '#4aa8ff', gem10: '#ffd040', gem100: '#c060ff', gem1000: '#ffb020', cluster: '#e02838', clusterX: '#2a1a2a' };
  Object.keys(GEMS).forEach((k) => {
    const big = k.startsWith('cluster');
    def(k, { w: big ? 10 : 6, h: big ? 10 : 7, draw(g) {
      if (big) { gem(g, 3.2, 5.6, 2, GEMS[k]); gem(g, 6.8, 5.2, 2.2, GEMS[k]); gem(g, 5, 3.6, 2.4, k === 'clusterX' ? '#6a2a6a' : sh(GEMS[k], 0.1)); if (k === 'clusterX') P.glow(g, 5, 5, 6, '#ff2040', 0.4); }
      else gem(g, 3, 3.6, k === 'gem1' ? 1.7 : k === 'gem10' ? 2 : k === 'gem100' ? 2.3 : 2.6, GEMS[k]);
    } });
  });
  def('coin', { w: 6, h: 6, draw(g) {
    P.circle(g, 3, 3, 2.6, P.vol(g, 3, 3, 2.6, '#f0b030')); P.circle(g, 3, 3, 1.8, P.lg(g, 1, 1, 5, 5, ['#fff0a0', '#e0a020']));
    P.path(g, [3, 1.6, 3.45, 2.55, 4.4, 3, 3.45, 3.45, 3, 4.4, 2.55, 3.45, 1.6, 3, 2.55, 2.55]); P.fill(g, '#b07010'); // stamped star
  } });
  def('potion', { w: 8, h: 10, draw(g) {
    P.rrect(g, 2.9, 0.3, 2.2, 1.4, 0.4, '#8a5a30');
    P.rrect(g, 3.1, 1.5, 1.8, 2, 0.3, 'rgba(210,230,255,0.8)');
    P.circle(g, 4, 6.2, 3.2, 'rgba(210,230,255,0.5)');
    g.save(); g.beginPath(); g.arc(4, 6.2, 3, 0, Math.PI * 2); g.clip(); P.rect(g, 0, 5.2, 8, 5, P.lg(g, 0, 5, 0, 9, ['#ff5060', '#a01020'])); g.restore();
    P.glow(g, 4, 7, 4, '#ff3040', 0.4); P.ell(g, 2.8, 5, 0.7, 1.2, 'rgba(255,255,255,0.8)', 0.4);
  } });
  def('magnet', { w: 9, h: 9, draw(g) {
    g.lineCap = 'butt'; g.beginPath(); g.arc(4.5, 4.2, 2.7, Math.PI, 0, true); g.strokeStyle = P.lg(g, 1, 0, 8, 0, ['#e02838', '#ff7080', '#e02838']); g.lineWidth = 2; g.stroke();
    P.rect(g, 0.8, 1, 2, 2.2, '#e02838'); P.rect(g, 6.2, 1, 2, 2.2, '#e02838'); P.rect(g, 0.8, 0.2, 2, 1.1, '#e8eef6'); P.rect(g, 6.2, 0.2, 2, 1.1, '#e8eef6');
  } });
  def('bomb', { w: 9, h: 10, draw(g) {
    P.circle(g, 4.5, 6, 3.4, P.vol(g, 4.5, 6, 3.4, '#4a3a5a'));
    P.rrect(g, 3.5, 1.8, 2, 1.4, 0.3, '#8a8290');
    g.beginPath(); g.moveTo(4.5, 1.8); g.quadraticCurveTo(5.6, 0.4, 6.8, 0.8); g.strokeStyle = '#c8a070'; g.lineWidth = 0.4; g.stroke();
    P.glow(g, 7, 0.8, 2.4, '#ffd040', 0.9); P.circle(g, 7, 0.8, 0.5, '#fff8c0');
    P.circle(g, 3.2, 4.8, 0.8, 'rgba(255,255,255,0.35)');
  } });
  function chest(g, body, band, glow) {
    P.rrect(g, 1, 5, 12, 6.4, 0.8, P.lg(g, 0, 5, 0, 11.4, [sh(body, 0.25), body, sh(body, -0.4)]));
    g.beginPath(); g.moveTo(1, 5.4); g.quadraticCurveTo(1, 0.8, 7, 0.8); g.quadraticCurveTo(13, 0.8, 13, 5.4); g.closePath(); P.fill(g, P.lg(g, 0, 0.8, 0, 5.4, [sh(body, 0.45), sh(body, 0.05)]));
    [2.6, 11.4].forEach((x) => P.rrect(g, x - 0.7, 0.9, 1.4, 10.4, 0.3, P.lg(g, x - 0.7, 0, x + 0.7, 0, [sh(band, 0.4), band, sh(band, -0.3)])));
    P.rrect(g, 1, 4.9, 12, 1, 0.3, band);
    P.rrect(g, 5.8, 4.4, 2.4, 3, 0.4, P.lg(g, 0, 4.4, 0, 7.4, [sh(band, 0.5), band])); P.circle(g, 7, 6.1, 0.4, '#1a1010');
  }
  def('chest_red', { w: 14, h: 12, draw(g) { chest(g, '#8a1a24', '#c8ccd8', '#ff3040'); } });
  def('chest_gold', { w: 14, h: 12, draw(g) { chest(g, '#6a3a1a', '#ffd35a', '#ffd35a'); } });
  def('chest', { w: 14, h: 12, draw(g) { chest(g, '#7a4a24', '#9aa0aa', '#ffb050'); } });
  def('chest_new', { w: 14, h: 12, frames: 2, draw(g, f) { P.glow(g, 7, 6, 8, '#c070ff', f ? 0.7 : 0.45); chest(g, '#3a1a4a', '#e0c0ff', '#c070ff'); } }); // the Strange Pendulum's chest
  // coins: a stack (5) and a bag (25)
  def('coin_stack', { w: 8, h: 8, draw(g) {
    for (const [x, y] of [[2.6, 5.4], [5.4, 5.6], [4, 3.2]]) { P.ell(g, x, y, 2.3, 1.5, P.lg(g, x - 2, y - 1, x + 2, y + 1, ['#fff0a0', '#e0a020', '#8a5a10'])); P.ell(g, x, y - 0.3, 1.5, 0.8, '#ffe070'); }
  } });
  def('coin_bag', { w: 10, h: 10, draw(g) {
    P.glow(g, 5, 6, 5, '#ffd35a', 0.4);
    g.beginPath(); g.moveTo(3.6, 2.6); g.quadraticCurveTo(0.6, 5, 1.4, 8.4); g.quadraticCurveTo(2.4, 9.8, 5, 9.8); g.quadraticCurveTo(7.6, 9.8, 8.6, 8.4); g.quadraticCurveTo(9.4, 5, 6.4, 2.6); g.closePath();
    P.fill(g, P.lg(g, 1, 0, 9, 0, ['#c89a5a', '#8a5a2a', '#4a2a10']));
    P.rect(g, 3.4, 1.8, 3.2, 1.1, '#5a3a18'); P.ell(g, 5, 1.2, 2, 0.9, '#a07040');
    P.circle(g, 5, 6.2, 1.6, P.lg(g, 3.4, 4.6, 6.6, 7.8, ['#fff0a0', '#e0a020'])); P.path(g, [5, 5.2, 5.4, 6.2, 5, 7.2, 4.6, 6.2]); P.fill(g, '#b07010');
  } });
  // food: soup, carrot, cheese (a mouthful of health)
  def('food_soup', { w: 9, h: 8, draw(g) {
    P.ell(g, 4.5, 3.4, 3.8, 1.2, '#c86a2a'); P.circle(g, 3.4, 3.2, 0.5, '#f0d060'); P.circle(g, 5.6, 3.5, 0.45, '#70b040');
    g.beginPath(); g.moveTo(0.7, 3.4); g.quadraticCurveTo(1.2, 7.4, 4.5, 7.4); g.quadraticCurveTo(7.8, 7.4, 8.3, 3.4); g.closePath(); P.fill(g, P.lg(g, 0, 3, 0, 8, ['#a8784a', '#5a3a1a']));
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(3.4, 1.6); g.quadraticCurveTo(2.8, 0.8, 3.6, 0.2); g.moveTo(5.4, 1.8); g.quadraticCurveTo(6, 1, 5.4, 0.3); g.stroke();
  } });
  def('food_carrot', { w: 9, h: 9, draw(g) {
    P.path(g, [1.4, 7.8, 6.2, 2.4, 7.6, 3.8]); P.fill(g, P.lg(g, 1, 8, 7, 3, ['#c04a10', '#ff8a2a']));
    g.strokeStyle = '#a03a08'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(4, 5.4); g.lineTo(4.7, 6); g.moveTo(5.2, 4.2); g.lineTo(5.8, 4.8); g.stroke();
    g.strokeStyle = '#5ab030'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(6.9, 3.1); g.lineTo(8.4, 0.8); g.moveTo(6.9, 3.1); g.lineTo(8.8, 2.6); g.moveTo(6.9, 3.1); g.lineTo(6.8, 0.6); g.stroke();
  } });
  def('food_cheese', { w: 9, h: 8, draw(g) {
    P.path(g, [0.8, 6.8, 8.2, 6.8, 8.2, 3.2, 0.8, 5]); P.fill(g, P.lg(g, 0, 3, 0, 7, ['#ffe070', '#e0a830']));
    P.path(g, [0.8, 5, 8.2, 3.2, 6, 1.8]); P.fill(g, '#fff0a0');
    P.circle(g, 3, 5.8, 0.6, '#c89020'); P.circle(g, 6, 5.2, 0.8, '#c89020'); P.circle(g, 7.2, 6.2, 0.4, '#c89020');
  } });
  def('tome', { w: 12, h: 11, draw(g) {
    P.rrect(g, 1, 2, 10, 7.6, 0.8, P.lg(g, 0, 2, 0, 9.6, ['#4a60c0', '#2a3a8a', '#1a2460']));
    P.rrect(g, 1.6, 2.6, 8.8, 6.4, 0.5, '#efe4c8'); P.rrect(g, 1, 2, 1.4, 7.6, 0.5, '#1a2460');
    g.strokeStyle = '#6a8aff'; g.lineWidth = 0.5; g.beginPath(); g.arc(6.4, 5.8, 1.9, 0, Math.PI * 2); g.moveTo(6.4, 3.4); g.lineTo(6.4, 8.2); g.moveTo(4, 5.8); g.lineTo(8.8, 5.8); g.stroke();
    P.rrect(g, 3, 0.4, 6.4, 1.8, 0.4, '#d8b048');
  } });
  const HERBS = { moss: '#7ad04a', ember: '#ff7a2a', lily: '#8ae8ff', dust: '#fff0a0' };
  Object.keys(HERBS).forEach((k) => def('herb_' + k, { w: 8, h: 8, draw(g) {
    const c = HERBS[k];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - 1.57; P.ell(g, 4 + Math.cos(a) * 1.6, 4 + Math.sin(a) * 1.6, 1.3, 0.8, P.lg(g, 2, 2, 6, 6, [sh(c, 0.4), c, sh(c, -0.4)]), a); }
    P.circle(g, 4, 4, 0.9, sh(c, 0.6));
  } }));
  def('urn', { w: 10, h: 12, draw(g) {
    P.rrect(g, 3, 0.6, 4, 1.2, 0.4, '#6a3e22');
    g.beginPath(); g.moveTo(3.4, 1.6); g.quadraticCurveTo(0.2, 5, 1.6, 9.4); g.quadraticCurveTo(2.4, 11.4, 5, 11.4); g.quadraticCurveTo(7.6, 11.4, 8.4, 9.4); g.quadraticCurveTo(9.8, 5, 6.6, 1.6); g.closePath();
    P.fill(g, P.lg(g, 1, 0, 9, 0, ['#c8844a', '#9a5a2e', '#5a3016']));
    g.strokeStyle = '#e8c070'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(1.6, 5.4); g.lineTo(8.4, 5.4); g.moveTo(1.4, 7.4); g.lineTo(8.6, 7.4); g.stroke();
    for (let i = 0; i < 4; i++) P.circle(g, 2.6 + i * 1.6, 6.4, 0.35, '#3a1a0a');
  } });
  def('well', { w: 30, h: 30, cy: 20, draw(g) {
    P.ell(g, 15, 25, 13, 4.4, 'rgba(0,0,0,0.4)');
    P.ell(g, 15, 19, 12, 5.4, P.lg(g, 3, 14, 27, 24, ['#8a8a96', '#5a5a66', '#34343e']));
    P.rrect(g, 3, 19, 24, 6, 1, P.lg(g, 0, 19, 0, 25, ['#6a6a76', '#3a3a44']));
    for (let i = 0; i < 6; i++) P.line(g, 5 + i * 4, 19.4, 5 + i * 4, 24.6, 0.4, '#2a2a32');
    P.ell(g, 15, 19, 9.4, 3.8, P.rg(g, 15, 19, 9, ['#1a3a5a', '#08101a']));
    P.glow(g, 15, 19, 10, '#4ab0ff', 0.35);
    P.line(g, 4.4, 19, 4.4, 4, 1.2, '#5a3a22'); P.line(g, 25.6, 19, 25.6, 4, 1.2, '#5a3a22');
    P.path(g, [1, 5.6, 15, -0.4, 29, 5.6, 26, 7, 15, 2, 4, 7]); P.fill(g, P.lg(g, 0, 0, 0, 7, ['#8a4a2a', '#4a2412']));
    P.line(g, 4.4, 6.4, 25.6, 6.4, 0.8, '#3a2412'); P.line(g, 15, 6.4, 15, 12, 0.3, '#c8b890');
    P.rrect(g, 13.4, 12, 3.2, 2.6, 0.5, '#7a5230');
  } });

  /* projectiles & weapon parts (drawn rotated at runtime, pointing right) */
  def('axe_p', { w: 10, h: 10, outline: 0.5, draw(g) {
    P.line(g, 1, 9, 7, 3, 1, '#6a4428');
    P.path(g, [5, 1, 9.6, 0.6, 9.4, 5, 7.4, 4.6, 6, 3]); P.fill(g, P.lg(g, 5, 0, 10, 5, ['#f0f4fa', '#8a92a4']));
  } });
  def('scythe_p', { w: 14, h: 12, outline: 0.5, draw(g) {
    P.line(g, 7, 11.6, 7.6, 3.4, 0.8, '#3a2e3a');
    g.beginPath(); g.moveTo(7.6, 3.4); g.quadraticCurveTo(3, 0, 0.4, 4.6); g.quadraticCurveTo(3.4, 2.4, 7.4, 5); g.closePath();
    P.fill(g, P.lg(g, 0, 0, 8, 5, ['#8a94a8', '#f4f8ff', '#9aa4b8'])); P.glow(g, 3.6, 2.6, 4, '#8affd0', 0.4);
  } });
  def('dagger_p', { w: 9, h: 4, outline: 0.4, draw(g) {
    P.rrect(g, 0, 1.3, 2.4, 1.4, 0.4, '#5a3a22'); P.rrect(g, 2.2, 0.4, 0.7, 3.2, 0.2, '#c9a24a');
    P.path(g, [2.9, 1.2, 8.8, 2, 2.9, 2.8]); P.fill(g, P.lg(g, 0, 1.2, 0, 2.8, ['#ffffff', '#9aa2b4']));
  } });
  def('arrow_p', { w: 11, h: 4, outline: 0.35, draw(g) {
    P.line(g, 1, 2, 9, 2, 0.45, '#8a6a4a');
    P.path(g, [8.6, 0.8, 11, 2, 8.6, 3.2]); P.fill(g, '#e8eef6');
    P.path(g, [0, 0.6, 2.4, 2, 0, 3.4, 0.8, 2]); P.fill(g, '#e84a4a');
  } });
  def('flask_p', { w: 6, h: 8, outline: 0.4, draw(g) {
    P.rrect(g, 2, 0, 2, 1.4, 0.3, '#7a5230'); P.circle(g, 3, 5, 2.6, 'rgba(210,255,220,0.5)');
    g.save(); g.beginPath(); g.arc(3, 5, 2.4, 0, Math.PI * 2); g.clip(); P.rect(g, 0, 4.4, 6, 4, '#60d050'); g.restore(); P.glow(g, 3, 5, 3.4, '#80ff60', 0.5);
  } });
  def('grenade_p', { w: 7, h: 8, outline: 0.4, draw(g) { // an iron powder grenade with a lit fuse
    P.circle(g, 3.5, 4.8, 2.8, P.vol(g, 3.5, 4.8, 2.8, '#4a4a52')); P.rrect(g, 2.6, 1.4, 1.8, 1.2, 0.3, '#6a6a72');
    P.line(g, 3.5, 1.4, 4.6, 0.4, 0.4, '#c8a878'); P.glow(g, 4.8, 0.4, 2, '#ffb040', 0.9); P.circle(g, 4.8, 0.4, 0.4, '#fff0a0');
  } });
  // the Alchemist's flasks: a round bomb and one bottle per element
  [['bomb', '#c8b890', '#8a7a5a'], ['fire', '#ff7a30', '#ffd070'], ['lightning', '#f0e060', '#ffffff'], ['ice', '#70d0ff', '#e8faff'], ['earth', '#80c040', '#d8ff90']].forEach(([el, col, hi]) => {
    def('flask_' + el + '_p', { w: 7, h: 9, outline: 0.4, draw(g) {
      if (el === 'bomb') { P.circle(g, 3.5, 5.4, 2.8, P.vol(g, 3.5, 5.4, 2.8, '#6a5a44')); P.rrect(g, 2.7, 1.8, 1.6, 1.4, 0.3, '#8a7a5a'); P.line(g, 3.5, 1.8, 4.4, 0.6, 0.4, '#c8a878'); P.circle(g, 4.5, 0.6, 0.45, '#ffd070'); return; }
      P.rrect(g, 2.6, 0.2, 1.8, 1, 0.3, '#7a5230'); P.rect(g, 2.9, 1.2, 1.2, 1.6, 'rgba(220,240,255,0.6)');
      P.circle(g, 3.5, 5.6, 2.9, 'rgba(220,240,255,0.45)');
      g.save(); g.beginPath(); g.arc(3.5, 5.6, 2.7, 0, Math.PI * 2); g.clip(); P.rect(g, 0, 4.6, 7, 5, P.lg(g, 0, 4.6, 0, 8.6, [hi, col, sh(col, -0.35)])); g.restore();
      P.circle(g, 2.6, 4.6, 0.55, 'rgba(255,255,255,0.85)'); P.glow(g, 3.5, 5.8, 4, col, 0.45);
    } });
  });
  /* Crone's bog plants (anchored at the root; frame 1 = striking) */
  const leaf = (g, x, y, a, l, col) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(l * 0.5, -l * 0.35, l, 0); g.quadraticCurveTo(l * 0.5, l * 0.3, 0, 0); P.fill(g, P.lg(g, 0, -1, l, 1, [sh(col, 0.25), col, sh(col, -0.35)])); g.restore(); };
  const mound = (g) => { P.ell(g, 8, 15.4, 5.2, 1.6, P.lg(g, 0, 14, 0, 17, ['#4a3a24', '#2a2014'])); for (let i = 0; i < 4; i++) P.circle(g, 4.6 + i * 2.2, 15 + (i % 2) * 0.5, 0.5, '#5a4a30'); };
  def('plant_snare', { w: 16, h: 17, cy: 15, frames: 2, draw(g, f) { // a knot of thorned vines around a sticky bulb
    mound(g);
    for (let i = 0; i < 5; i++) {
      const a = -2.6 + i * 0.55, up = f ? 1.6 : 1, bx = 8 + Math.cos(a) * 1.5, by = 14.4;
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + Math.cos(a) * 5, by - 5 * up + (i % 2) * 2, bx + Math.cos(a) * 7 * (f ? 0.8 : 1), by - (f ? 9 : 4) - (i % 2));
      g.strokeStyle = i % 2 ? '#4a6a22' : '#3a5418'; g.lineWidth = 0.9; g.stroke();
      for (let k = 1; k < 3; k++) P.circle(g, bx + Math.cos(a) * 2.4 * k, by - (f ? 3.2 : 1.6) * k, 0.35, '#c8d890');
    }
    P.circle(g, 8, 12.8, 2.2, P.vol(g, 8, 12.8, 2.2, '#8a3a4a')); P.circle(g, 7.4, 12.2, 0.6, 'rgba(255,220,230,0.8)');
    if (f) P.glow(g, 8, 12.8, 5, '#c0ff60', 0.4);
  } });
  def('plant_biter', { w: 16, h: 20, cy: 18, frames: 2, draw(g, f) { // a bog flytrap on a crooked stalk
    P.ell(g, 8, 18.4, 4.4, 1.4, '#2a2014');
    leaf(g, 7.6, 17.6, -2.7, 5, '#4a7a28'); leaf(g, 8.4, 17.6, -0.4, 5, '#3a6a20');
    g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(5.6, 13, 8.2, 9.4); g.strokeStyle = '#3a5a1a'; g.lineWidth = 1.2; g.stroke();
    const open = f ? 0.25 : 1, hx = 9.6, hy = 8.2;
    g.save(); g.translate(hx, hy);
    g.save(); g.rotate(-0.55 * open); g.beginPath(); g.moveTo(-1.6, 0); g.quadraticCurveTo(2, -4, 5.6, -0.6); g.lineTo(-1.6, 0.4); P.fill(g, P.lg(g, 0, -4, 0, 0, ['#8ac040', '#4a7a20'])); P.path(g, [-0.6, 0, 1.6, -1, 3.8, -0.3]); P.fill(g, '#c0283a'); for (let i = 0; i < 4; i++) P.path(g, [0.6 + i * 1.2, -0.4, 1 + i * 1.2, 0.8, 1.4 + i * 1.2, -0.3]); g.fillStyle = '#f0ecd8'; g.fill(); g.restore();
    g.save(); g.rotate(0.55 * open); g.beginPath(); g.moveTo(-1.6, 0); g.quadraticCurveTo(2, 4, 5.6, 0.6); g.lineTo(-1.6, -0.4); P.fill(g, P.lg(g, 0, 0, 0, 4, ['#4a7a20', '#2a4a12'])); P.path(g, [-0.6, 0, 1.6, 1, 3.8, 0.3]); P.fill(g, '#8a1424'); for (let i = 0; i < 4; i++) P.path(g, [0.6 + i * 1.2, 0.4, 1 + i * 1.2, -0.8, 1.4 + i * 1.2, 0.3]); g.fillStyle = '#e0dcc8'; g.fill(); g.restore();
    g.restore();
    P.circle(g, hx - 0.8, hy - 1.2, 0.35, '#ffe060');
  } });
  def('plant_pod', { w: 16, h: 18, cy: 16, frames: 2, draw(g, f) { // a swollen spore pod with glowing veins
    mound(g); leaf(g, 7, 15, -2.9, 4.6, '#3a5a1a'); leaf(g, 9, 15, -0.3, 4.6, '#4a6a22');
    const r = f ? 4.4 : 3.8, cx = 8, cy2 = 11.2 - (f ? 0.4 : 0);
    P.ell(g, cx, cy2, r * 0.9, r, P.rg(g, cx - 1, cy2 - 1.4, r * 1.2, ['#e0b0ff', '#8a3ac0', '#3a1050']));
    g.strokeStyle = 'rgba(230,190,255,0.8)'; g.lineWidth = 0.35;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - r * 0.7 + i * r * 0.45, cy2 + r * 0.8); g.quadraticCurveTo(cx - r * 0.4 + i * r * 0.3, cy2, cx - 0.4 + i * 0.3, cy2 - r * 0.9); g.stroke(); }
    P.path(g, [cx - 1.2, cy2 - r * 0.9, cx, cy2 - r - 1.4, cx + 1.2, cy2 - r * 0.9]); P.fill(g, '#4a6a22');
    P.glow(g, cx, cy2, r * 2, '#b070ff', f ? 0.6 : 0.3);
  } });
  def('plant_spitter', { w: 16, h: 20, cy: 18, frames: 2, draw(g, f) { // a pitcher plant that spits thorny seeds
    P.ell(g, 8, 18.4, 4.4, 1.4, '#2a2014');
    leaf(g, 7.4, 17.8, -2.8, 5.2, '#3a6a20'); leaf(g, 8.6, 17.8, -0.35, 5.2, '#4a7a28');
    g.save(); g.translate(8, 17.6); g.rotate(f ? -0.12 : 0);
    g.beginPath(); g.moveTo(-1.6, 0); g.quadraticCurveTo(-3.6, -6, -1.2, -9.4); g.lineTo(3.8, -11.4); g.lineTo(3.4, -8.6); g.quadraticCurveTo(2.4, -4, 1.6, 0); g.closePath();
    P.fill(g, P.lg(g, -3, -10, 3, 0, ['#9ac850', '#5a8a2a', '#2e4a14']));
    for (let i = 0; i < 3; i++) P.line(g, -1.6 + i * 1, -1 - i * 0.2, -1 + i * 1.2, -8.6 - i * 0.4, 0.3, '#8a2a3a');
    P.ell(g, 3.6, -10, 0.9, 1.6, '#3a0c18', -0.4); P.rrect(g, 1.6, -12.6, 2.8, 1, 0.4, '#b83a4a');
    g.restore();
    if (f) P.glow(g, 11.6, 7.6, 3.4, '#c890ff', 0.8);
  } });
  def('chakram_p', { w: 10, h: 10, outline: 0.4, draw(g) {
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; P.path(g, [5 + Math.cos(a) * 2, 5 + Math.sin(a) * 2, 5 + Math.cos(a + 0.5) * 5, 5 + Math.sin(a + 0.5) * 5, 5 + Math.cos(a + 0.9) * 2.4, 5 + Math.sin(a + 0.9) * 2.4]); P.fill(g, P.lg(g, 0, 0, 10, 10, ['#ffffff', '#9aa4b8'])); }
    g.beginPath(); g.arc(5, 5, 2.4, 0, Math.PI * 2); g.strokeStyle = '#d8b048'; g.lineWidth = 0.9; g.stroke();
  } });
  def('flail_p', { w: 10, h: 10, outline: 0.5, draw(g) {
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.path(g, [5 + Math.cos(a - 0.3) * 2.8, 5 + Math.sin(a - 0.3) * 2.8, 5 + Math.cos(a) * 4.8, 5 + Math.sin(a) * 4.8, 5 + Math.cos(a + 0.3) * 2.8, 5 + Math.sin(a + 0.3) * 2.8]); P.fill(g, '#c8ccd8'); }
    P.circle(g, 5, 5, 3.1, P.vol(g, 5, 5, 3.1, '#6a6e7a'));
  } });
  def('orb_p', { w: 8, h: 8, outline: 0.3, draw(g) { P.glow(g, 4, 4, 4, '#c8d8ff', 0.6); P.circle(g, 4, 4, 2.6, P.vol(g, 4, 4, 2.6, '#aab4c8')); g.strokeStyle = '#e8c870'; g.lineWidth = 0.4; g.beginPath(); g.ellipse(4, 4, 3.4, 1.1, 0.4, 0, Math.PI * 2); g.stroke(); } });
  def('hammer_p', { w: 10, h: 10, outline: 0.5, draw(g) {
    P.glow(g, 5, 5, 6, '#ffe89a', 0.6);
    P.line(g, 5, 9.6, 5, 4, 1, '#6a4428');
    P.rrect(g, 1.4, 1, 7.2, 4, 0.8, P.lg(g, 0, 1, 0, 5, ['#fffbe8', '#e8c050', '#9a7a30']));
  } });
  def('fist_p', { w: 9, h: 8, outline: 0.4, draw(g) {
    P.glow(g, 4.5, 4, 5, '#b080ff', 0.6);
    P.rrect(g, 1, 1.6, 6.4, 5, 2, G.rgba('#c8a8ff', 0.9));
    for (let i = 0; i < 4; i++) P.line(g, 5.2, 2.2 + i * 1.2, 7.4, 2.2 + i * 1.2, 0.8, G.rgba('#e8d8ff', 0.9));
  } });
  def('shield_p', { w: 12, h: 12, outline: 0.5, draw(g) { P.circle(g, 6, 6, 5.2, P.vol(g, 6, 6, 5.2, '#b0402a')); g.strokeStyle = '#d8b048'; g.lineWidth = 0.7; g.beginPath(); g.arc(6, 6, 4.8, 0, Math.PI * 2); g.stroke(); P.circle(g, 6, 6, 1.6, P.vol(g, 6, 6, 1.6, '#e0e0e8')); } });
  def('rift_p', { w: 14, h: 10, outline: 0, draw(g) {
    P.glow(g, 7, 5, 7, '#b050ff', 0.7);
    g.beginPath(); g.moveTo(1, 5); g.quadraticCurveTo(7, -1, 13, 5); g.quadraticCurveTo(7, 11, 1, 5); P.fill(g, P.rg(g, 7, 5, 6, ['#ffffff', '#c070ff', '#40106a']));
  } });
  /* ---------- power-up runes (barrel drops), lament shard, hex obelisk ---------- */
  const RUNES = { rune_fury: ['#ff3a30', 'fist'], rune_haste: ['#ffd040', 'bolt'], rune_wraith: ['#80e8ff', 'wisp'] };
  Object.keys(RUNES).forEach((k) => {
    const [col, glyph] = RUNES[k];
    def(k, { w: 11, h: 12, draw(g) {
      P.glow(g, 5.5, 6, 6, col, 0.55);
      P.path(g, [5.5, 0.6, 10, 4.2, 8.6, 10.6, 2.4, 10.6, 1, 4.2]);
      P.fill(g, P.lg(g, 1, 0.6, 10, 10.6, ['#6a6070', '#3a3440', '#1c1822']));
      g.strokeStyle = sh(col, 0.2); g.lineWidth = 0.55;
      if (glyph === 'fist') { g.beginPath(); g.moveTo(3.6, 8); g.lineTo(5.5, 3.2); g.lineTo(7.4, 8); g.moveTo(4.2, 6.4); g.lineTo(6.8, 6.4); g.stroke(); }
      else if (glyph === 'bolt') { g.beginPath(); g.moveTo(6.4, 2.8); g.lineTo(4.2, 6.2); g.lineTo(6.6, 6.2); g.lineTo(4.6, 9.2); g.stroke(); }
      else { g.beginPath(); g.arc(5.5, 5.6, 2.2, 0.3, Math.PI * 1.8); g.moveTo(5.5, 7.8); g.lineTo(5.5, 9.4); g.stroke(); }
      P.circle(g, 5.5, 2.4, 0.5, 'rgba(255,255,255,0.8)');
    } });
  });
  def('shard', { w: 8, h: 11, draw(g) {
    P.glow(g, 4, 6, 5.5, '#ff40a0', 0.6);
    P.path(g, [4, 0.4, 6.8, 5, 5, 10.4, 2.6, 9, 1.2, 4]); P.fill(g, P.lg(g, 1, 0, 7, 10, ['#ffc0e8', '#d0308a', '#4a0a3a']));
    P.path(g, [4, 0.4, 6.8, 5, 4.2, 5.6]); P.fill(g, 'rgba(255,255,255,0.45)');
  } });
  def('hexstone', { w: 18, h: 30, cy: 26, frames: 2, draw(g, f) {
    P.ell(g, 9, 27, 8, 2.4, 'rgba(0,0,0,0.5)');
    P.path(g, [4, 27, 5.4, 6, 9, 1, 12.6, 6, 14, 27]); P.fill(g, P.lg(g, 4, 0, 14, 0, ['#4a4458', '#2a2434', '#120e18']));
    P.path(g, [9, 1, 12.6, 6, 14, 27, 11, 27]); P.fill(g, 'rgba(0,0,0,0.3)');
    const a = f ? 0.95 : 0.7;
    g.strokeStyle = 'rgba(220,120,255,' + a + ')'; g.lineWidth = 0.7;
    g.beginPath(); g.arc(9, 12, 2.4, 0, Math.PI * 2); g.moveTo(9, 8.6); g.lineTo(9, 21); g.moveTo(6.4, 17); g.lineTo(11.6, 17); g.moveTo(7, 20.4); g.lineTo(11, 23.6); g.stroke();
    P.glow(g, 9, 12, 7, '#c060ff', f ? 0.7 : 0.45);
    P.rrect(g, 2.4, 25.6, 13.2, 2.4, 0.6, P.lg(g, 0, 25, 0, 28, ['#5a5468', '#241e2c']));
  } });
  /* ---------- Artifact relic (dropped by Lords in Agony) and the Black Ulcer crystal ---------- */
  def('artifact', { w: 12, h: 14, frames: 2, draw(g, f) {
    P.glow(g, 6, 7, 7, '#ff70ff', f ? 0.8 : 0.55);
    P.path(g, [6, 0.6, 11, 4, 11, 10, 6, 13.4, 1, 10, 1, 4]); P.fill(g, P.lg(g, 1, 0, 11, 13, ['#fff0b0', '#c89030', '#5a3a10']));
    P.path(g, [6, 2.6, 9.2, 4.8, 9.2, 9.2, 6, 11.4, 2.8, 9.2, 2.8, 4.8]); P.fill(g, P.rg(g, 5, 5, 6, ['#ffd0ff', '#b040c0', '#3a0a4a']));
    P.circle(g, 6, 7, 1.4, f ? '#ffffff' : '#ffc0ff'); P.rect(g, 4.4, 4.4, 1, 1, '#ffffff');
  } });
  def('bucket', { w: 10, h: 10, draw(g) {
    P.glow(g, 5, 6, 5, '#5ab8ff', 0.45);
    g.strokeStyle = '#c8ccd8'; g.lineWidth = 0.7; g.beginPath(); g.arc(5, 3.6, 3.4, Math.PI, 0); g.stroke();
    P.path(g, [1.4, 3.6, 8.6, 3.6, 7.6, 9.6, 2.4, 9.6]); P.fill(g, P.lg(g, 1, 0, 9, 0, ['#5a3a1a', '#a0703a', '#4a2a10']));
    P.rect(g, 1.6, 5, 6.8, 0.8, '#6a6e7a'); P.rect(g, 2.1, 8, 5.8, 0.8, '#6a6e7a');
    P.ell(g, 5, 3.7, 3.5, 0.9, P.lg(g, 0, 3, 0, 5, ['#bfe8ff', '#3a8ad0']));
  } });
  def('ulcer', { w: 8, h: 11, draw(g) {
    P.glow(g, 4, 6, 5, '#8040c0', 0.5);
    P.path(g, [4, 0.4, 7, 4.6, 5.4, 10.4, 2.6, 10.4, 1, 4.6]); P.fill(g, P.lg(g, 1, 0, 7, 10, ['#6a4a7a', '#1a0a20', '#000000']));
    P.path(g, [4, 0.4, 7, 4.6, 4.2, 5]); P.fill(g, 'rgba(200,140,255,0.4)');
  } });

  /* ---------- Halls of Discord light puzzle ---------- */
  def('relay', { w: 14, h: 20, cy: 16, frames: 2, draw(g, f) {
    P.ell(g, 7, 17.4, 6.4, 2.2, 'rgba(0,0,0,0.5)');
    P.path(g, [1.4, 16, 3, 13.4, 11, 13.4, 12.6, 16, 11, 18.6, 3, 18.6]); P.fill(g, P.lg(g, 0, 13, 0, 19, ['#6a5a78', '#2e2438']));
    P.rect(g, 5, 8, 4, 6, P.lg(g, 5, 0, 9, 0, ['#4a3e58', '#221a2c']));
    P.path(g, [7, 1.4, 10.4, 5, 7, 9.4, 3.6, 5]); P.fill(g, P.lg(g, 4, 1, 10, 9, f ? ['#ffffff', '#e0b0ff', '#8a40d0'] : ['#b8a0d0', '#6a4a8a', '#2e1a44']));
    if (f) P.glow(g, 7, 5, 7, '#c070ff', 0.8);
  } });
  def('lightsrc', { w: 16, h: 20, cy: 16, frames: 2, draw(g, f) {
    P.ell(g, 8, 17.6, 6.6, 2, 'rgba(0,0,0,0.5)');
    P.path(g, [2, 11, 14, 11, 12, 17.6, 4, 17.6]); P.fill(g, P.lg(g, 0, 11, 0, 18, ['#5a4a3a', '#1e1610']));
    P.rect(g, 1.4, 10, 13.2, 1.6, '#8a6a40');
    P.glow(g, 8, 6, 9, '#b060ff', f ? 0.95 : 0.75);
    g.beginPath(); g.moveTo(8, f ? 0.4 : 1.4); g.quadraticCurveTo(12.6, 6, 10.6, 10.4); g.lineTo(5.4, 10.4); g.quadraticCurveTo(3.4, 6, 8, f ? 0.4 : 1.4); P.fill(g, P.lg(g, 0, 0, 0, 10, ['#ffffff', '#e0a0ff', '#7a30c0']));
  } });
  def('monolith', { w: 20, h: 38, cy: 33, frames: 2, draw(g, f) {
    P.ell(g, 10, 35, 9, 2.6, 'rgba(0,0,0,0.55)');
    P.path(g, [3, 35, 17, 35, 15.4, 4, 10, 0.6, 4.6, 4]); P.fill(g, P.lg(g, 3, 0, 17, 35, ['#3a3044', '#18121e', '#070409']));
    P.path(g, [10, 0.6, 15.4, 4, 13.6, 6, 10, 3.6]); P.fill(g, 'rgba(255,255,255,0.12)');
    const rune = f ? '#e8b0ff' : '#5a3a78';
    g.strokeStyle = rune; g.lineWidth = 0.8; g.beginPath();
    g.moveTo(10, 8); g.lineTo(10, 30); g.moveTo(7, 12); g.lineTo(13, 16); g.moveTo(13, 20); g.lineTo(7, 24); g.moveTo(7.6, 28); g.lineTo(12.4, 28); g.stroke();
    if (f) { P.glow(g, 10, 18, 12, '#b060ff', 0.7); P.glow(g, 10, 4, 5, '#ffffff', 0.6); }
  } });

  /* ---------- Hall secrets ---------- */
  // a torn page: bloodied (crypt), scorched (abyss), torn (aqueduct), frosted (catacombs), rooted (blightmire)
  def('page', { w: 12, h: 12, frames: 2, colors: { ink: '#7a1018', edge: '#b02030', glow: '#ff4050' },
    variants: { fire: { ink: '#3a1808', edge: '#2a1206', glow: '#ff8a30' }, drowned: { ink: '#2a3a40', edge: '#6a7a80', glow: '#70ffd0' }, ice: { ink: '#1a3a5a', edge: '#a8d8f0', glow: '#8ff0ff' }, bog: { ink: '#2e3a10', edge: '#6a8a20', glow: '#b0ff50' } },
    draw(g, f, c) {
      P.glow(g, 6, 6, 7, c.glow, f ? 0.7 : 0.45);
      g.save(); g.translate(6, 6); g.rotate(-0.18);
      P.path(g, [-4, -5, 3.4, -5.2, 4.4, -2, 4, 5, -3.6, 5.2, -4.4, 1]); P.fill(g, P.lg(g, -4, -5, 4, 5, ['#f0e2c0', '#d8c49a', '#a88c60']));
      P.path(g, [3.4, -5.2, 4.4, -2, 2.4, -3]); P.fill(g, 'rgba(0,0,0,0.25)');
      g.strokeStyle = G.rgba(c.ink, 0.8); g.lineWidth = 0.5; g.beginPath();
      for (let i = 0; i < 4; i++) { g.moveTo(-2.8, -2.6 + i * 2); g.lineTo(2.4 - (i % 2), -2.6 + i * 2); } g.stroke();
      P.circle(g, -1.6, 3, 1.3, G.rgba(c.edge, 0.85)); P.circle(g, 1.8, -3.6, 0.8, G.rgba(c.edge, 0.7));
      g.restore();
    } });
  // a stone altar; the Altar of Pain bleeds, the Altar of Embers holds the Ember Eye
  def('altar', { w: 22, h: 22, cy: 18, frames: 2, colors: { stone: '#4a4050', rune: '#ff3040', top: '#7a1018' },
    variants: { fire: { stone: '#4a3028', rune: '#ff9a30', top: '#ffb040' } },
    draw(g, f, c) {
      P.ell(g, 11, 19.4, 10, 2.6, 'rgba(0,0,0,0.5)');
      P.path(g, [2, 19, 4, 9, 18, 9, 20, 19]); P.fill(g, P.lg(g, 2, 0, 20, 0, [sh(c.stone, 0.25), c.stone, sh(c.stone, -0.5)]));
      P.rrect(g, 1.4, 6.6, 19.2, 3.2, 0.8, P.lg(g, 0, 6, 0, 10, [sh(c.stone, 0.45), sh(c.stone, -0.2)]));
      g.strokeStyle = G.rgba(c.rune, f ? 0.95 : 0.6); g.lineWidth = 0.7; g.beginPath();
      g.moveTo(7, 12); g.lineTo(11, 16.6); g.lineTo(15, 12); g.moveTo(11, 11.4); g.lineTo(11, 16.6); g.stroke();
      P.ell(g, 11, 6.6, 5, 1.6, c.top); P.glow(g, 11, 6, 7, c.rune, f ? 0.75 : 0.45);
      P.circle(g, 11, 4.8, 1.6, P.rg(g, 10.4, 4.2, 2, ['#ffffff', c.rune, sh(c.rune, -0.5)]));
    } });
  // a skeleton statue pointing the way (drawn with the arm up; the arrow is added in the world)
  def('statue', { w: 14, h: 28, cy: 25, frames: 1, draw(g) {
    P.ell(g, 7, 25.6, 6.6, 2, 'rgba(0,0,0,0.5)');
    P.rrect(g, 1.4, 22, 11.2, 3.6, 0.6, P.lg(g, 0, 22, 0, 26, ['#6a5a4a', '#2e241a']));
    const bone = P.lg(g, 3, 0, 11, 0, ['#d8ccb0', '#a89a7c', '#6a5e48']);
    P.path(g, [5.2, 22, 5.6, 14, 8.4, 14, 8.8, 22]); P.fill(g, bone);
    P.rrect(g, 4.4, 9, 5.2, 6, 1.2, bone);
    g.strokeStyle = '#c8bca0'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(9, 10.6); g.lineTo(13, 6); g.moveTo(5, 10.6); g.lineTo(3, 15); g.stroke();
    P.circle(g, 7, 6, 3.2, P.vol(g, 7, 6, 3.2, '#d8ccb0')); P.circle(g, 5.9, 6, 0.8, '#ff7a20'); P.circle(g, 8.1, 6, 0.8, '#ff7a20');
    P.glow(g, 7, 6, 4, '#ff7a20', 0.5);
  } });
  // the black raven on the viaduct
  def('raven', { w: 14, h: 12, cy: 10, frames: 2, draw(g, f) {
    P.ell(g, 7, 10.6, 4.6, 1.2, 'rgba(0,0,0,0.4)');
    P.glow(g, 7, 6, 8, '#a8c8ff', 0.35); // a pale sheen so it reads on the dark stones
    const body = P.lg(g, 0, 0, 14, 12, ['#3a3a4a', '#141420', '#050508']);
    if (f) { P.path(g, [7, 6, 0.4, 1, 3, 6.6]); P.fill(g, body); P.path(g, [7, 6, 13.6, 1, 11, 6.6]); P.fill(g, body); }
    P.ell(g, 7, 7, 3.4, 2.6, body); P.path(g, [4, 7.6, 0.8, 9.4, 3.8, 8.8]); P.fill(g, body);
    P.circle(g, 10, 5, 2, body); P.path(g, [11.6, 4.6, 14, 5.4, 11.6, 6]); P.fill(g, '#2a2418');
    P.circle(g, 10.6, 4.6, 0.7, '#ff3040'); P.glow(g, 10.6, 4.6, 2.4, '#ff3040', 0.8);
    g.strokeStyle = '#1a1410'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(6.4, 9.4); g.lineTo(6.2, 10.6); g.moveTo(7.8, 9.4); g.lineTo(8, 10.6); g.stroke();
  } });
  // a sealed sarcophagus (breakable)
  def('sarcophagus', { w: 26, h: 18, cy: 14, frames: 1, draw(g) {
    P.ell(g, 13, 15.4, 12.4, 2.4, 'rgba(0,0,0,0.55)');
    P.path(g, [1, 14.6, 2.4, 5, 23.6, 5, 25, 14.6]); P.fill(g, P.lg(g, 0, 5, 0, 15, ['#7a8a88', '#4a5856', '#232c2c']));
    P.path(g, [2.4, 5, 5, 1.4, 21, 1.4, 23.6, 5]); P.fill(g, P.lg(g, 0, 1, 0, 5, ['#a8b8b4', '#6a7a78']));
    g.strokeStyle = '#2a3434'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(13, 2); g.lineTo(13, 14); g.moveTo(9, 7.6); g.lineTo(17, 7.6); g.moveTo(6, 11); g.lineTo(9, 14); g.stroke();
    P.glow(g, 13, 8, 6, '#70ffd0', 0.35);
  } });
  // a hovering will-o'-wisp orb (catacombs) / a glowing root (blightmire)
  def('wisp', { w: 12, h: 18, cy: 15, frames: 2, colors: { glow: '#8ff0ff' }, variants: { bog: { glow: '#b0ff50' } }, draw(g, f, c) {
    P.ell(g, 6, 16.4, 3.4, 1, 'rgba(0,0,0,0.35)');
    P.glow(g, 6, 7, 7, c.glow, f ? 0.95 : 0.7);
    P.circle(g, 6, 7 - (f ? 0.6 : 0), 2.6, P.rg(g, 5.4, 6.2, 3, ['#ffffff', c.glow, sh(c.glow, -0.5)]));
  } });
  def('root', { w: 20, h: 12, cy: 9, frames: 2, draw(g, f) {
    P.glow(g, 10, 6, 9, '#b0ff50', f ? 0.6 : 0.4);
    g.strokeStyle = '#3a2a14'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(1, 9); g.quadraticCurveTo(6, 3, 10, 7); g.quadraticCurveTo(14, 11, 19, 4); g.stroke();
    g.strokeStyle = f ? '#d8ff80' : '#90c040'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(1, 9); g.quadraticCurveTo(6, 3, 10, 7); g.quadraticCurveTo(14, 11, 19, 4); g.stroke();
    P.circle(g, 10, 7, 1, '#f0ffc0');
  } });
  // the Evil Tree of the Blightmire (breakable)
  def('eviltree', { w: 34, h: 44, cy: 40, frames: 2, draw(g, f) {
    P.ell(g, 17, 41, 14, 3, 'rgba(0,0,0,0.55)');
    const bark = P.lg(g, 8, 0, 26, 0, ['#4a3a22', '#2a1e10', '#120a04']);
    P.path(g, [10, 41, 13, 26, 11, 16, 4, 8, 6, 7, 13, 13, 15, 4, 18, 4, 19, 13, 27, 5, 29, 7, 22, 17, 21, 27, 25, 41]); P.fill(g, bark);
    g.strokeStyle = '#2a1e10'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 41); g.lineTo(3, 43); g.moveTo(25, 41); g.lineTo(32, 43); g.stroke();
    P.ell(g, 17.4, 24, 3.4, 4.4, '#0a0602'); // the maw
    P.circle(g, 14.4, 19, 1.3, f ? '#e8ff60' : '#b0ff50'); P.circle(g, 20.4, 19, 1.3, f ? '#e8ff60' : '#b0ff50');
    P.glow(g, 17, 20, 9, '#b0ff50', f ? 0.6 : 0.4);
    for (const [x, y] of [[6, 8], [15, 4], [28, 6]]) P.circle(g, x, y, 1.6, G.rgba('#90b030', 0.8));
  } });

  /* ---------- Environmental hazards ---------- */
  def('brazier', { w: 14, h: 22, cy: 20, frames: 2, draw(g, f) {
    P.ell(g, 7, 20.4, 5.6, 1.6, 'rgba(0,0,0,0.5)');
    g.strokeStyle = '#2a2a30'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(7, 12); g.lineTo(2.4, 20.4); g.moveTo(7, 12); g.lineTo(11.6, 20.4); g.moveTo(7, 12); g.lineTo(7, 20); g.stroke();
    P.path(g, [1.4, 9, 12.6, 9, 10.6, 13, 3.4, 13]); P.fill(g, P.lg(g, 0, 9, 0, 13, ['#6a6a74', '#2a2a32']));
    P.rect(g, 1, 8.4, 12, 1.2, '#8a8a94');
    P.ell(g, 7, 8.8, 5, 1.2, P.lg(g, 2, 8, 12, 9, ['#ff5020', '#ffd040', '#ff5020']));
    P.glow(g, 7, 5, 8, '#ff8a20', f ? 0.9 : 0.7);
    g.beginPath(); g.moveTo(4, 8.6); g.quadraticCurveTo(4.6, 3.6, 7, f ? 0.6 : 1.6); g.quadraticCurveTo(9.4, 3.6, 10, 8.6); g.closePath(); P.fill(g, P.lg(g, 0, 1, 0, 9, ['#fff4b0', '#ffb030', '#e04010']));
    g.beginPath(); g.moveTo(5.6, 8.6); g.quadraticCurveTo(6, 5.4, 7, f ? 3.4 : 4.2); g.quadraticCurveTo(8, 5.4, 8.4, 8.6); g.closePath(); P.fill(g, '#fff8d0');
  } });
  def('icespike', { w: 16, h: 20, cy: 18, frames: 1, draw(g) {
    P.ell(g, 8, 18.4, 7, 1.8, 'rgba(0,0,0,0.45)');
    P.glow(g, 8, 11, 8, '#8fe0ff', 0.45);
    const ice = (pts, a) => { P.path(g, pts); P.fill(g, P.lg(g, pts[0], pts[1], pts[2], pts[3], ['#ffffff', '#9fdcff', '#3a7ab0'])); if (a) { P.path(g, a); P.fill(g, 'rgba(255,255,255,0.55)'); } };
    ice([2.4, 18, 4.4, 7, 6.6, 18], [4.4, 7, 5, 12, 4.2, 12]);
    ice([10, 18, 12.2, 9, 14.2, 18], [12.2, 9, 12.8, 13, 12, 13]);
    ice([5.4, 18, 8, 1.2, 10.8, 18], [8, 1.2, 8.8, 9, 7.6, 9]);
  } });
})(window.DH);
