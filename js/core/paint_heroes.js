/* HD vector painters: humanoid rig + heroes. Coordinates are world units in a 20x20 box, facing right. */
(function (DH) {
  'use strict';
  const G = DH.gfx, P = G.P, sh = G.shade, rgba = G.rgba;

  function weapon(g, o, f, hx, hy) {
    const w = o.weapon, wc = o.wcol || '#9fe0ff';
    switch (w) {
      case 'sword': {
        P.line(g, hx - 0.2, hy + 1.6, hx + 0.1, hy - 0.2, 1.1, '#5a3a22');
        P.path(g, [hx - 0.1, hy - 0.4, hx + 0.9, hy - 0.8, hx + 3.2, hy - 8.6, hx + 2.8, hy - 9.6, hx + 2.2, hy - 8.9]);
        P.fill(g, P.lg(g, hx, hy, hx + 1.4, hy - 0.4, ['#f4f7ff', '#b8c0d0', '#7a8294']));
        P.line(g, hx - 1.6, hy - 0.2, hx + 2.2, hy - 1.2, 0.9, '#c9a24a');
        P.circle(g, hx - 0.4, hy + 2.1, 0.6, '#c9a24a');
        break;
      }
      case 'greatsword': {
        P.line(g, hx - 0.4, hy + 2.2, hx, hy - 0.2, 1.3, '#3a2418');
        P.path(g, [hx - 0.4, hy - 0.4, hx + 1.2, hy - 0.8, hx + 4.4, hy - 12, hx + 3.8, hy - 13.2, hx + 2.8, hy - 12.2]);
        P.fill(g, P.lg(g, hx, hy, hx + 1.6, hy, ['#e8ecf4', '#9aa2b4', '#5a6274']));
        P.line(g, hx - 2, hy - 0.2, hx + 2.8, hy - 1.4, 1.1, o.wcol || '#b08a3a');
        break;
      }
      case 'bow': {
        g.beginPath(); g.arc(hx - 2.6, hy - 1.5, 6.6, -1.2, 1.2); g.strokeStyle = '#6a4222'; g.lineWidth = 1.1; g.stroke();
        g.beginPath(); g.arc(hx - 2.6, hy - 1.5, 6.6, -1.2, 1.2); g.strokeStyle = '#a8784a'; g.lineWidth = 0.45; g.stroke();
        const a1 = -1.2, a2 = 1.2, r = 6.6;
        P.line(g, hx - 2.6 + Math.cos(a1) * r, hy - 1.5 + Math.sin(a1) * r, hx - 2.6 + Math.cos(a2) * r, hy - 1.5 + Math.sin(a2) * r, 0.25, '#f0ead8');
        P.line(g, hx - 2.4, hy - 1.4, hx + 4.6, hy - 1.4, 0.4, '#8a6a4a'); P.path(g, [hx + 4.4, hy - 2.1, hx + 5.8, hy - 1.4, hx + 4.4, hy - 0.7]); P.fill(g, '#dfe4ee');
        break;
      }
      case 'staff': case 'eyestaff': case 'stormstaff': {
        P.line(g, hx + 0.3, hy + 6.2, hx + 0.8, hy - 8.2, 0.9, P.lg(g, hx, 0, hx + 1, 0, ['#7a5230', '#4a2e18']));
        const ox = hx + 0.9, oy = hy - 9.4;
        if (w === 'eyestaff') { P.circle(g, ox, oy, 1.7, P.vol(g, ox, oy, 1.7, '#e8f0ff')); P.circle(g, ox + 0.3, oy, 0.8, wc); P.circle(g, ox + 0.4, oy, 0.35, '#000'); P.glow(g, ox, oy, 4.5, wc, 0.5); }
        else { P.glow(g, ox, oy, 5, wc, 0.6); P.circle(g, ox, oy, 1.6, P.vol(g, ox, oy, 1.6, wc)); P.circle(g, ox - 0.5, oy - 0.5, 0.45, '#fff'); }
        if (w === 'stormstaff') { g.strokeStyle = '#fffbe0'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(ox - 2.6, oy - 1.4); g.lineTo(ox - 1, oy - 0.3); g.lineTo(ox - 1.8, oy + 0.6); g.lineTo(ox - 0.2, oy + 1.8); g.stroke(); }
        P.path(g, [ox - 1.3, oy + 1, ox, oy + 2.4, ox + 1.3, oy + 1]); P.stroke(g, '#c9a24a', 0.4);
        break;
      }
      case 'hammer': {
        P.line(g, hx - 0.2, hy + 3, hx + 1.8, hy - 7, 0.9, '#6a4428');
        g.save(); g.translate(hx + 2, hy - 7.6); g.rotate(0.2);
        P.rrect(g, -3, -1.8, 6, 3.6, 0.7, P.lg(g, 0, -1.8, 0, 1.8, ['#f0e6c8', '#c9b27a', '#8a7648']));
        P.rrect(g, -3, -0.4, 6, 0.8, 0.2, o.wcol || '#e8c050'); g.restore();
        P.glow(g, hx + 2, hy - 7.6, 5, '#ffe89a', 0.35);
        break;
      }
      case 'axe': case 'greataxe': {
        const big = w === 'greataxe';
        P.line(g, hx - 0.6, hy + (big ? 5 : 2.4), hx + 2.4, hy - (big ? 9.6 : 6.6), big ? 1.1 : 0.9, '#5a3a22');
        const ax = hx + (big ? 2.2 : 1.8), ay = hy - (big ? 8.6 : 5.8), s = big ? 1.4 : 1;
        P.path(g, [ax - 0.4, ay - 1.2 * s, ax + 3.6 * s, ay - 3.4 * s, ax + 4.4 * s, ay + 0.2, ax + 3.4 * s, ay + 3 * s, ax - 0.2, ay + 1.4 * s]);
        P.fill(g, P.lg(g, ax, ay - 3, ax + 4, ay + 3, ['#eef2fa', '#a6aebe', '#5e6678']));
        if (o.wcol) { g.save(); g.globalAlpha = 0.6; P.path(g, [ax + 3.2 * s, ay - 2.8 * s, ax + 4.2 * s, ay + 0.2, ax + 3.1 * s, ay + 2.5 * s]); P.stroke(g, o.wcol, 0.6); g.restore(); }
        break;
      }
      case 'spear': {
        P.line(g, hx - 3, hy + 5, hx + 5, hy - 8, 0.75, '#6a4a2a');
        P.path(g, [hx + 4.4, hy - 7.2, hx + 6.8, hy - 11.2, hx + 5.6, hy - 6.6]); P.fill(g, P.lg(g, hx + 4, 0, hx + 7, 0, ['#f0f4fa', '#8a92a4']));
        if (o.wcol) P.circle(g, hx + 4.2, hy - 6.4, 0.6, o.wcol);
        break;
      }
      case 'scythe': {
        P.line(g, hx - 0.6, hy + 6.4, hx + 0.6, hy - 9, 0.9, P.lg(g, hx, 0, hx + 1, 0, ['#4a3a4a', '#2a1e2a']));
        g.beginPath(); g.moveTo(hx + 0.6, hy - 9); g.quadraticCurveTo(hx - 5, hy - 11.5, hx - 8.6, hy - 6.2);
        g.quadraticCurveTo(hx - 4.4, hy - 9, hx + 0.4, hy - 7.6); g.closePath();
        P.fill(g, P.lg(g, hx - 8, hy - 11, hx, hy - 7, ['#6a7488', '#e6ecf6', '#9aa4b8']));
        P.glow(g, hx - 4, hy - 9, 5, o.wcol || '#8affd0', 0.25);
        break;
      }
      case 'flamer': {
        P.rrect(g, hx - 1, hy - 1.4, 6.2, 2, 0.5, P.lg(g, 0, hy - 1.4, 0, hy + 0.6, ['#9aa0aa', '#5a606a', '#3a3e46']));
        P.rrect(g, hx + 4.8, hy - 1.8, 1.6, 2.8, 0.4, '#3a3e46');
        P.circle(g, hx + 6.8, hy - 0.4, 0.6, '#ffb040'); P.glow(g, hx + 7, hy - 0.4, 3, '#ff7a20', 0.7);
        P.line(g, hx - 1, hy - 0.2, hx - 4.6, hy - 2.8, 0.6, '#2a2a30');
        break;
      }
      case 'book': {
        g.save(); g.translate(hx + 1.2, hy - 1.2); g.rotate(-0.25);
        P.rrect(g, -2.2, -1.6, 4.4, 3.2, 0.3, '#4a1a3a'); P.path(g, [-2, -1.3, 0, -0.8, 2, -1.3, 2, 1.3, 0, 1.6, -2, 1.3]); P.fill(g, '#efe4c8');
        P.line(g, 0, -0.8, 0, 1.6, 0.2, '#8a7a5a'); g.restore();
        P.glow(g, hx + 1.2, hy - 2.4, 4.5, o.wcol || '#c070ff', 0.6);
        for (let i = 0; i < 3; i++) P.circle(g, hx + 0.4 + i * 0.9, hy - 3.6 - i * 0.7, 0.3, o.wcol || '#e0a0ff');
        break;
      }
      case 'chalice': {
        P.path(g, [hx - 1.4, hy - 2.4, hx + 1.4, hy - 2.4, hx + 0.6, hy - 0.6, hx - 0.6, hy - 0.6]); P.fill(g, P.lg(g, hx - 1.4, 0, hx + 1.4, 0, ['#fff0b0', '#c9a24a', '#8a6a2a']));
        P.line(g, hx, hy - 0.6, hx, hy + 0.6, 0.4, '#c9a24a'); P.ell(g, hx, hy + 0.7, 1, 0.3, '#c9a24a');
        P.ell(g, hx, hy - 2.4, 1.3, 0.35, '#a0101e'); P.glow(g, hx, hy - 2.6, 3.4, '#ff2030', 0.5);
        break;
      }
      case 'lute': {
        g.save(); g.translate(hx + 0.6, hy - 0.4); g.rotate(-0.7);
        P.rrect(g, -0.45, -8.6, 0.9, 7, 0.3, '#4a2a14'); for (let i = 0; i < 3; i++) P.rect(g, -0.9, -8.4 + i * 0.8, 1.8, 0.35, '#e8d8b0');
        P.path(g, [-0.5, -9.6, 0.5, -9.6, 0.9, -8.4, -0.9, -8.4]); P.fill(g, '#3a200e');
        P.ell(g, 0, 0.6, 2.7, 3.4, P.rg(g, -0.8, -0.4, 3.6, ['#e8a860', '#b06a2a', '#5a3010']));
        P.circle(g, 0, -0.2, 0.9, '#1a0c06'); P.rect(g, -1.1, 2.2, 2.2, 0.5, '#2a1608');
        g.strokeStyle = 'rgba(255,240,200,0.8)'; g.lineWidth = 0.15; g.beginPath(); g.moveTo(-0.25, -8.4); g.lineTo(-0.25, 2.2); g.moveTo(0.25, -8.4); g.lineTo(0.25, 2.2); g.stroke();
        g.restore();
        P.glow(g, hx + 3.6, hy - 3.2, 3, o.wcol || '#ffd070', 0.5);
        break;
      }
      case 'arquebus': { // a matchlock arquebus levelled at the hip
        P.path(g, [hx - 5.6, hy + 1.8, hx - 1, hy - 0.7, hx + 1.6, hy - 0.5, hx + 1.2, hy + 0.8, hx - 4.8, hy + 3]); P.fill(g, P.lg(g, hx - 5, hy, hx + 1, hy + 2, ['#9a6a3a', '#5a3418']));
        P.rrect(g, hx - 0.8, hy - 1.6, 8.2, 1.15, 0.4, P.lg(g, 0, hy - 1.6, 0, hy - 0.4, ['#c8ccd8', '#6a6e7a', '#34383f']));
        P.rrect(g, hx + 6.4, hy - 1.85, 0.9, 1.6, 0.2, '#2e3238'); P.line(g, hx + 1.4, hy - 1.7, hx + 5.4, hy - 1.7, 0.2, 'rgba(255,255,255,0.5)');
        P.line(g, hx + 0.8, hy - 0.4, hx + 0.1, hy + 1.3, 0.35, '#c9a24a');
        P.line(g, hx - 0.2, hy - 1.8, hx - 1.2, hy - 3, 0.3, '#c8a878'); P.circle(g, hx - 1.2, hy - 3, 0.35, '#ffb040'); P.glow(g, hx - 1.2, hy - 3, 1.8, '#ff8a30', 0.8); // the smouldering match
        break;
      }
      case 'flask': { // a bubbling flask held up, ready to throw
        P.rrect(g, hx + 0.5, hy - 4.6, 1.2, 1.2, 0.2, '#7a5230'); P.rect(g, hx + 0.6, hy - 3.6, 1, 1.2, 'rgba(220,240,255,0.6)');
        P.circle(g, hx + 1.1, hy - 1.2, 1.9, 'rgba(220,240,255,0.5)');
        g.save(); g.beginPath(); g.arc(hx + 1.1, hy - 1.2, 1.75, 0, Math.PI * 2); g.clip(); P.rect(g, hx - 1, hy - 1.6, 4.4, 3, P.lg(g, 0, hy - 1.6, 0, hy + 0.6, ['#d8ff90', o.wcol || '#80c040'])); g.restore();
        P.circle(g, hx + 0.5, hy - 1.9, 0.4, 'rgba(255,255,255,0.9)'); P.glow(g, hx + 1.1, hy - 1.2, 4, o.wcol || '#80c040', 0.55);
        break;
      }
      case 'plantstaff': { // a crooked root-staff sprouting leaves around a glowing bulb
        g.beginPath(); g.moveTo(hx + 0.2, hy + 6.2); g.quadraticCurveTo(hx - 0.8, hy, hx + 0.8, hy - 4); g.quadraticCurveTo(hx + 2.4, hy - 7, hx + 1.6, hy - 9.6); g.strokeStyle = '#4a3420'; g.lineWidth = 0.95; g.stroke();
        g.beginPath(); g.moveTo(hx + 1.8, hy - 8.4); g.quadraticCurveTo(hx + 4, hy - 9.2, hx + 3.8, hy - 11.4); g.strokeStyle = '#4a3420'; g.lineWidth = 0.6; g.stroke();
        for (const [lx, ly, la] of [[hx + 1.2, hy - 5.4, -0.4], [hx + 1.4, hy - 8.8, -2.6], [hx + 3.6, hy - 10.6, -1.1]]) { g.save(); g.translate(lx, ly); g.rotate(la); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(1.2, -0.9, 2.6, 0); g.quadraticCurveTo(1.2, 0.8, 0, 0); P.fill(g, '#5a8a2a'); g.restore(); }
        P.circle(g, hx + 2.1, hy - 10.4, 1.1, P.vol(g, hx + 2.1, hy - 10.4, 1.1, o.wcol || '#c0ff60')); P.glow(g, hx + 2.1, hy - 10.4, 3.6, o.wcol || '#c0ff60', 0.5);
        break;
      }
      case 'claws': {
        for (let i = 0; i < 3; i++) P.line(g, hx + 0.4, hy - 0.4 + i * 0.6, hx + 2.6, hy - 1.4 + i * 0.9, 0.35, '#e8e0cc');
        break;
      }
      default: break;
    }
  }

  function head(g, o, hx, hy) {
    const r = 2.9;
    const skin = o.skin || '#e8b890';
    if (o.headBack) o.headBack(g, hx, hy);
    // hair behind
    if (o.hair && (o.hairStyle === 'long' || o.hairStyle === 'braid')) {
      P.path(g, [hx - 2.6, hy - 1.4, hx - 3.4, hy + 3.6, hx - 1.8, hy + 4.6, hx + 0.4, hy + 1.8]); P.fill(g, P.lg(g, hx - 3, hy, hx, hy + 4, [sh(o.hair, 0.15), sh(o.hair, -0.3)]));
      if (o.hairStyle === 'braid') for (let i = 0; i < 4; i++) P.circle(g, hx - 2.8 - i * 0.2, hy + 4 + i * 1.1, 0.7, sh(o.hair, -0.1 * i));
    }
    if (o.skull) {
      P.circle(g, hx, hy, r * 0.95, P.vol(g, hx, hy, r, '#e4dac0'));
      P.ell(g, hx + 0.9, hy + 1.9, 1.5, 1, '#cfc3a2');
      P.circle(g, hx + 1.3, hy - 0.2, 0.8, '#120a10'); P.circle(g, hx - 0.4, hy - 0.2, 0.7, '#120a10');
      if (o.eye) { P.eye(g, hx + 1.3, hy - 0.2, 0.35, o.eye); }
      for (let i = 0; i < 3; i++) P.line(g, hx + 0.1 + i * 0.6, hy + 1.5, hx + 0.1 + i * 0.6, hy + 2.5, 0.2, '#6a5a40');
    } else {
      P.circle(g, hx, hy, r, P.vol(g, hx, hy, r, skin));
      // ear + nose + eye
      P.ell(g, hx - 0.6, hy + 0.2, 0.6, 0.9, sh(skin, -0.15));
      P.path(g, [hx + 2.7, hy + 0.1, hx + 3.35, hy + 0.9, hx + 2.7, hy + 1.2]); P.fill(g, sh(skin, -0.12));
      if (o.eyeGlow) P.eye(g, hx + 1.6, hy - 0.2, 0.4, o.eyeGlow);
      else { P.ell(g, hx + 1.7, hy - 0.2, 0.42, 0.55, '#1a1016'); P.circle(g, hx + 1.82, hy - 0.4, 0.14, '#ffffff'); P.line(g, hx + 1.1, hy - 1.1, hx + 2.3, hy - 1.0, 0.3, sh(o.hair || '#3a2a1a', -0.2)); }
      if (o.beard) { P.path(g, [hx + 0.2, hy + 0.8, hx + 3.2, hy + 1, hx + 2.6, hy + 3.8, hx + 0.6, hy + 4.2, hx - 0.6, hy + 2.2]); P.fill(g, P.lg(g, hx, hy + 1, hx, hy + 4, [sh(o.beard, 0.2), sh(o.beard, -0.25)])); }
      if (o.hair && o.hairStyle !== 'none') { g.beginPath(); g.arc(hx, hy, r + 0.15, Math.PI * 0.95, Math.PI * 2.08); g.quadraticCurveTo(hx + 1.6, hy - 1.6, hx - 0.8, hy - 0.6); g.closePath(); P.fill(g, P.lg(g, hx, hy - 3, hx, hy, [sh(o.hair, 0.2), o.hair, sh(o.hair, -0.3)])); }
    }
    const hc = o.headCol || '#9aa2b4', hc2 = o.headCol2 || sh(hc, -0.3);
    switch (o.head) {
      case 'helm': case 'wingedhelm': case 'hornedhelm': {
        g.beginPath(); g.arc(hx, hy - 0.1, r + 0.55, Math.PI * 0.92, Math.PI * 2.1); g.lineTo(hx + 3.2, hy + 1.2); g.lineTo(hx + 1.2, hy + 1.2); g.lineTo(hx + 0.8, hy + 2.8); g.lineTo(hx - 3, hy + 2.8); g.closePath();
        P.fill(g, P.lg(g, hx - 3, hy - 3, hx + 3, hy + 2, [sh(hc, 0.45), hc, hc2]));
        if (o.head === 'helm') { P.rrect(g, hx + 1.1, hy - 0.6, 2.4, 0.7, 0.2, '#0c0810'); P.line(g, hx - 0.2, hy - 3.2, hx - 0.2, hy + 2.6, 0.35, sh(hc, 0.5)); }
        else { P.ell(g, hx + 1.9, hy - 0.2, 0.9, 0.55, '#0c0810'); if (o.eyeGlow) P.eye(g, hx + 2, hy - 0.2, 0.3, o.eyeGlow); }
        if (o.plume) { g.beginPath(); g.moveTo(hx - 0.5, hy - 3.2); g.quadraticCurveTo(hx - 4, hy - 5.4, hx - 5.6, hy - 1.4); g.quadraticCurveTo(hx - 3.2, hy - 3.2, hx - 0.2, hy - 2.4); P.fill(g, P.lg(g, hx - 5, hy - 5, hx, hy, [sh(o.plume, 0.3), o.plume, sh(o.plume, -0.4)])); }
        if (o.head === 'wingedhelm') for (const s of [-1]) { g.beginPath(); g.moveTo(hx - 1.4, hy - 1.2); g.quadraticCurveTo(hx - 4.8, hy - 5.8, hx - 6.2, hy - 3.2 * s * -1); g.quadraticCurveTo(hx - 4, hy - 1.8, hx - 1.6, hy + 0.2); P.fill(g, P.lg(g, hx - 6, hy - 5, hx - 1, hy, ['#ffffff', '#c8d4e8'])); for (let i = 0; i < 3; i++) P.line(g, hx - 2 - i, hy - 1 - i * 0.6, hx - 3.6 - i * 0.6, hy - 3 - i * 0.4, 0.25, '#9aa8c0'); }
        if (o.head === 'hornedhelm') { g.beginPath(); g.moveTo(hx - 1.6, hy - 2.2); g.quadraticCurveTo(hx - 5.4, hy - 3, hx - 4.6, hy - 7.2); g.quadraticCurveTo(hx - 3.6, hy - 4.2, hx - 0.8, hy - 3.2); P.fill(g, P.lg(g, hx - 5, hy - 7, hx, hy, ['#fffbe8', '#d8c8a0', '#8a7a58'])); g.beginPath(); g.moveTo(hx + 1.6, hy - 2.6); g.quadraticCurveTo(hx + 4.6, hy - 4.2, hx + 3.6, hy - 7.4); g.quadraticCurveTo(hx + 3.2, hy - 4.6, hx + 0.6, hy - 3.4); P.fill(g, P.lg(g, hx, hy - 7, hx + 4, hy, ['#fffbe8', '#d8c8a0', '#8a7a58'])); }
        break;
      }
      case 'greathelm': { // a flat-topped great helm: the whole head in steel, a cross-shaped slit
        g.beginPath(); g.moveTo(hx - 3.2, hy - 3.2); g.lineTo(hx + 3.2, hy - 3.4); g.quadraticCurveTo(hx + 3.8, hy, hx + 3.4, hy + 3.2); g.lineTo(hx - 3, hy + 3.4); g.quadraticCurveTo(hx - 3.6, hy, hx - 3.2, hy - 3.2); g.closePath();
        P.fill(g, P.lg(g, hx - 3, hy - 3, hx + 3, hy + 3, [sh(hc, 0.45), hc, hc2]));
        P.rect(g, hx - 3.3, hy - 3.6, 6.6, 0.8, sh(hc, 0.2)); // the rim of the crown
        P.rect(g, hx + 0.2, hy - 0.8, 3.4, 0.6, '#08060a'); P.rect(g, hx + 1.4, hy - 1.8, 0.6, 3.4, '#08060a'); // the visor cross
        if (o.eyeGlow) P.glow(g, hx + 2, hy - 0.5, 1.6, o.eyeGlow, 0.6);
        for (let i = 0; i < 3; i++) P.circle(g, hx + 2.6, hy + 1 + i * 0.7, 0.18, '#08060a'); // breathing holes
        P.line(g, hx - 0.2, hy - 3.2, hx - 0.2, hy + 3.2, 0.3, sh(hc, 0.5));
        break;
      }
      case 'spectacle': { // a Norse iron helm with eye-guards and a nasal, a mail curtain at the neck
        g.beginPath(); g.arc(hx, hy - 0.4, r + 0.5, Math.PI * 0.96, Math.PI * 2.04); g.closePath(); P.fill(g, P.lg(g, hx - 3, hy - 4, hx + 3, hy, [sh(hc, 0.45), hc, hc2]));
        P.line(g, hx - 3, hy - 0.6, hx + 3.2, hy - 0.8, 0.6, sh(hc, -0.2)); P.line(g, hx, hy - 3.6, hx, hy - 0.6, 0.4, sh(hc, 0.4));
        g.strokeStyle = hc; g.lineWidth = 0.55; g.beginPath(); g.arc(hx + 1.7, hy - 0.1, 0.8, Math.PI, Math.PI * 2.1); g.stroke(); P.line(g, hx + 2.6, hy - 0.4, hx + 3, hy + 1.2, 0.5, hc); // eye-guard and nasal
        P.path(g, [hx - 3.2, hy - 0.4, hx - 1, hy - 0.2, hx - 1.2, hy + 3.2, hx - 3.6, hy + 2.6]); P.fill(g, P.lg(g, hx - 3, 0, hx - 1, 0, ['#7a808a', '#4a4e56'])); // mail at the neck
        break;
      }
      case 'hood': case 'deephood': {
        g.beginPath(); g.moveTo(hx + 2.4, hy - 2.8); g.quadraticCurveTo(hx - 0.5, hy - 5.2, hx - 3.4, hy - 2); g.quadraticCurveTo(hx - 5.2, hy + 1.2, hx - 3.2, hy + 4.2);
        g.lineTo(hx + 1, hy + 3.8); g.quadraticCurveTo(hx + 0.4, hy + 1.2, hx + 1.4, hy - 0.8); g.quadraticCurveTo(hx + 2.6, hy - 1.6, hx + 2.4, hy - 2.8); g.closePath();
        P.fill(g, P.lg(g, hx - 4, hy - 4, hx + 2, hy + 4, [sh(hc, 0.25), hc, hc2]));
        g.beginPath(); g.moveTo(hx + 2.4, hy - 2.8); g.quadraticCurveTo(hx + 4.2, hy - 1, hx + 3.4, hy + 2.6); g.lineTo(hx + 1, hy + 3.8); g.quadraticCurveTo(hx + 0.4, hy + 1.2, hx + 1.4, hy - 0.8); g.closePath(); P.fill(g, sh(hc, -0.15));
        if (o.head === 'deephood') { P.ell(g, hx + 2.2, hy + 0.4, 1.4, 2.1, '#08040a'); if (o.eyeGlow) { P.eye(g, hx + 2.4, hy - 0.2, 0.32, o.eyeGlow); P.eye(g, hx + 1.4, hy - 0.2, 0.26, o.eyeGlow); } }
        break;
      }
      case 'hat': {
        P.ell(g, hx + 0.4, hy - 2.3, 5.4, 1.3, P.lg(g, hx - 5, 0, hx + 5, 0, [hc2, hc, hc2]), -0.08);
        g.beginPath(); g.moveTo(hx - 2.8, hy - 2.6); g.quadraticCurveTo(hx - 1, hy - 7, hx - 4.6, hy - 10.4); g.quadraticCurveTo(hx + 0.6, hy - 8.4, hx + 2.8, hy - 2.6); g.closePath();
        P.fill(g, P.lg(g, hx - 3, hy - 10, hx + 3, hy - 2, [sh(hc, 0.3), hc, hc2]));
        P.rrect(g, hx - 2.8, hy - 3.6, 5.6, 1, 0.3, o.hatBand || '#c9a24a');
        break;
      }
      case 'mitre': {
        g.beginPath(); g.moveTo(hx - 2.6, hy - 1.8); g.lineTo(hx - 1.8, hy - 6.4); g.quadraticCurveTo(hx, hy - 8, hx + 1.8, hy - 6.4); g.lineTo(hx + 2.6, hy - 1.8); g.closePath();
        P.fill(g, P.lg(g, hx - 2, hy - 7, hx + 2, hy - 2, ['#ffffff', '#e8e2d2', '#bdb49c']));
        P.line(g, hx, hy - 7.4, hx, hy - 2, 0.6, '#d8b048'); P.line(g, hx - 1.2, hy - 4.8, hx + 1.2, hy - 4.8, 0.6, '#d8b048');
        P.rrect(g, hx - 2.7, hy - 2.4, 5.4, 0.9, 0.3, '#d8b048');
        break;
      }
      case 'mask': {
        P.path(g, [hx - 0.2, hy - 2.4, hx + 3.2, hy - 1.6, hx + 3.4, hy + 1.8, hx + 0.4, hy + 2.8]); P.fill(g, P.lg(g, hx, hy - 2, hx + 3, hy + 2, ['#8a8e96', '#4a4e56']));
        P.circle(g, hx + 2.2, hy - 0.4, 0.9, '#1a0a04'); P.circle(g, hx + 2.2, hy - 0.4, 0.6, P.rg(g, hx + 2.2, hy - 0.4, 0.6, ['#ffd070', '#ff6a10'])); P.glow(g, hx + 2.2, hy - 0.4, 2.2, '#ff8a20', 0.5);
        P.circle(g, hx + 3.2, hy + 1.6, 1, P.vol(g, hx + 3.2, hy + 1.6, 1, '#5a5e66'));
        g.beginPath(); g.arc(hx, hy, r + 0.3, Math.PI * 0.9, Math.PI * 1.95); g.closePath(); P.fill(g, P.lg(g, 0, hy - 3, 0, hy, [sh(hc, 0.2), hc2]));
        break;
      }
      case 'crown': case 'thorns': {
        if (o.head === 'crown') { P.path(g, [hx - 2.4, hy - 2.2, hx - 2.6, hy - 4.6, hx - 1.2, hy - 3.2, hx, hy - 5, hx + 1.2, hy - 3.2, hx + 2.6, hy - 4.6, hx + 2.4, hy - 2.2]); P.fill(g, P.lg(g, 0, hy - 5, 0, hy - 2, ['#fff3b0', '#d8a838', '#8a6420'])); P.circle(g, hx, hy - 2.8, 0.45, '#e02040'); }
        else { g.strokeStyle = '#4a2a1a'; g.lineWidth = 0.45; g.beginPath(); g.ellipse(hx, hy - 2.3, 3, 0.9, 0, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; P.line(g, hx + Math.cos(a) * 3, hy - 2.3 + Math.sin(a) * 0.9, hx + Math.cos(a) * 3.8, hy - 3.1 + Math.sin(a) * 0.9, 0.3, '#6a3a22'); } P.glow(g, hx, hy - 4, 5, '#ffd0a0', 0.25); g.strokeStyle = 'rgba(255,220,150,0.7)'; g.lineWidth = 0.3; g.beginPath(); g.ellipse(hx - 0.4, hy - 4.6, 3.2, 0.8, -0.1, 0, Math.PI * 2); g.stroke(); }
        break;
      }
      case 'turban': {
        g.beginPath(); g.arc(hx - 0.2, hy - 1.2, r + 0.6, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); P.fill(g, P.lg(g, 0, hy - 4, 0, hy, [sh(hc, 0.3), hc, hc2]));
        for (let i = 0; i < 3; i++) P.line(g, hx - 3 + i * 0.3, hy - 1.6 - i * 0.9, hx + 2.9 - i * 0.2, hy - 1.2 - i * 0.9, 0.3, hc2);
        P.circle(g, hx + 1.4, hy - 2.8, 0.7, P.vol(g, hx + 1.4, hy - 2.8, 0.7, o.wcol || '#60e0d0'));
        break;
      }
      case 'cap': { // bard's feathered cap
        P.ell(g, hx, hy - 2.2, 4, 1.4, P.lg(g, hx - 4, 0, hx + 4, 0, [hc2, hc, hc2]), -0.12);
        g.beginPath(); g.arc(hx - 0.2, hy - 2.4, r - 0.2, Math.PI, Math.PI * 2); g.closePath(); P.fill(g, P.lg(g, 0, hy - 5, 0, hy - 2, [sh(hc, 0.3), hc]));
        g.beginPath(); g.moveTo(hx - 1.4, hy - 3.6); g.quadraticCurveTo(hx - 5.6, hy - 8.6, hx - 7.2, hy - 5.6); g.quadraticCurveTo(hx - 4.6, hy - 6.2, hx - 1, hy - 3); P.fill(g, P.lg(g, hx - 7, hy - 8, hx - 1, hy - 3, ['#fff4d0', o.feather || '#e8c050']));
        P.rrect(g, hx - 3, hy - 2.8, 6, 0.8, 0.3, o.hatBand || '#e8c050');
        break;
      }
      case 'morion': { // a Spanish morion: a combed steel dome on a brim that sweeps up fore and aft
        g.beginPath(); g.moveTo(hx - 4.6, hy - 3.6); g.quadraticCurveTo(hx - 4.4, hy - 2.4, hx - 3, hy - 1.7); g.quadraticCurveTo(hx, hy - 0.8, hx + 3.2, hy - 1.8); g.quadraticCurveTo(hx + 4.6, hy - 2.5, hx + 4.8, hy - 3.8);
        g.quadraticCurveTo(hx + 3.4, hy - 3.1, hx, hy - 2.9); g.quadraticCurveTo(hx - 3.2, hy - 3, hx - 4.6, hy - 3.6); g.closePath(); // a broad brim, gently upturned
        P.fill(g, P.lg(g, hx - 5, hy - 4, hx + 5, hy - 1, [hc2, hc, sh(hc, 0.3), hc2]));
        g.beginPath(); g.arc(hx, hy - 2.1, 2.7, Math.PI, 0); g.closePath(); P.fill(g, P.lg(g, hx - 3, hy - 5, hx + 3, hy - 2, [sh(hc, 0.35), hc, hc2]));
        g.beginPath(); g.moveTo(hx - 2.3, hy - 3.6); g.quadraticCurveTo(hx - 0.2, hy - 7.6, hx + 2.3, hy - 3.6); g.closePath(); P.fill(g, P.lg(g, hx - 2, hy - 7, hx + 2, hy - 3, [sh(hc, 0.45), hc, hc2]));
        P.line(g, hx - 1.9, hy - 3.9, hx + 1.9, hy - 3.9, 0.25, 'rgba(255,255,255,.55)');
        for (const rx of [hx - 1.8, hx, hx + 1.8]) P.circle(g, rx, hy - 2.4, 0.2, '#e8c050');
        break;
      }
      case 'band': { // a leather headband low on the brow, stubble on the jaw
        P.path(g, [hx - 3.1, hy - 1.5, hx + 3.1, hy - 1.9, hx + 3.2, hy - 0.9, hx - 3.1, hy - 0.6]); P.fill(g, P.lg(g, 0, hy - 1.9, 0, hy - 0.6, [sh(hc, 0.3), hc]));
        P.ell(g, hx + 1.8, hy + 1.9, 1.5, 0.9, 'rgba(60,34,20,.35)');
        break;
      }
      case 'bandana': { // a red cloth tied round the brow, its ends fluttering behind
        P.path(g, [hx - 3, hy - 2, hx + 3, hy - 2.5, hx + 3.1, hy - 1.4, hx - 3, hy - 0.9]); P.fill(g, P.lg(g, 0, hy - 2.5, 0, hy - 0.9, [sh(hc, 0.25), hc]));
        P.path(g, [hx - 2.8, hy - 1.6, hx - 5.2, hy - 0.4, hx - 4.6, hy + 0.8, hx - 2.6, hy - 0.8]); P.fill(g, sh(hc, -0.2));
        break;
      }
      case 'beret': { // a slashed Landsknecht beret, tilted, with a spray of plumes
        g.beginPath(); g.arc(hx - 0.2, hy - 2.2, r - 0.1, Math.PI, Math.PI * 2); g.closePath(); P.fill(g, P.lg(g, 0, hy - 5, 0, hy - 2, [sh(hc, 0.25), hc]));
        P.ell(g, hx + 0.4, hy - 3.1, 5.2, 1.7, P.lg(g, hx - 5, 0, hx + 5, 0, [hc2, hc, sh(hc, 0.2), hc2]), -0.18);
        for (let i = 0; i < 4; i++) P.line(g, hx - 3 + i * 1.8, hy - 3.9 + i * 0.3, hx - 2.4 + i * 1.8, hy - 2.7 + i * 0.3, 0.45, o.hatBand || '#e8c050'); // slashes showing the lining
        g.beginPath(); g.moveTo(hx - 2.4, hy - 4); g.quadraticCurveTo(hx - 6.4, hy - 9.4, hx - 8.4, hy - 6.4); g.quadraticCurveTo(hx - 5.4, hy - 6.8, hx - 1.8, hy - 3.4); P.fill(g, P.lg(g, hx - 8, hy - 9, hx - 2, hy - 3, ['#ffffff', '#d8d0c0']));
        g.beginPath(); g.moveTo(hx - 1.8, hy - 4.2); g.quadraticCurveTo(hx - 4.4, hy - 10, hx - 6.6, hy - 8.8); g.quadraticCurveTo(hx - 3.8, hy - 7.4, hx - 1.2, hy - 3.6); P.fill(g, P.lg(g, hx - 6, hy - 10, hx - 1, hy - 4, [o.feather || '#e0303a', sh(o.feather || '#e0303a', -0.3)]));
        break;
      }
      case 'goggles': { // a leather cap with brass goggles pushed up on the brow
        g.beginPath(); g.arc(hx, hy - 0.6, r + 0.35, Math.PI * 0.95, Math.PI * 2.05); g.closePath(); P.fill(g, P.lg(g, 0, hy - 4, 0, hy, [sh(hc, 0.3), hc, hc2]));
        P.line(g, hx - 3.2, hy - 1.4, hx + 3.2, hy - 1.6, 0.6, '#3a2a1a');
        for (const gx of [hx + 0.6, hx + 2.4]) { P.circle(g, gx, hy - 1.9, 0.95, P.vol(g, gx, hy - 1.9, 1, '#c9a24a')); P.circle(g, gx, hy - 1.9, 0.6, P.rg(g, gx - 0.2, hy - 2.1, 0.7, ['#e8fff0', o.wcol || '#80c040'])); }
        break;
      }
      case 'hag': { // a ragged hood pulled low over the brow, lank grey hair, a hooked nose and one pale eye
        P.path(g, [hx + 2.7, hy + 0.1, hx + 4.1, hy + 1.7, hx + 3.2, hy + 2.3, hx + 2.6, hy + 1.4]); P.fill(g, sh(skin, -0.12)); P.circle(g, hx + 3.3, hy + 1.2, 0.28, sh(skin, -0.4));
        P.line(g, hx + 1.6, hy + 2.3, hx + 2.8, hy + 2.1, 0.3, sh(skin, -0.45)); // thin mouth
        g.beginPath(); g.moveTo(hx + 3.2, hy - 1.2); g.quadraticCurveTo(hx + 2.4, hy - 4.8, hx - 1, hy - 4.2); g.quadraticCurveTo(hx - 4.6, hy - 3, hx - 4.4, hy + 1.2); g.lineTo(hx - 4, hy + 4.8);
        for (let i = 0; i < 4; i++) g.lineTo(hx - 3.2 + i * 1.05, hy + (i % 2 ? 3.8 : 4.8));
        g.quadraticCurveTo(hx - 0.6, hy + 1.2, hx - 0.1, hy - 1.2); g.quadraticCurveTo(hx + 1.6, hy - 2, hx + 3.2, hy - 1.2); g.closePath();
        P.fill(g, P.lg(g, hx - 4, hy - 4, hx + 3, hy + 4, [sh(hc, 0.25), hc, hc2]));
        P.line(g, hx - 0.1, hy - 1.2, hx + 3.2, hy - 1.2, 0.35, sh(hc2, -0.3)); // the brow shadow
        for (let i = 0; i < 3; i++) P.line(g, hx - 0.2 + i * 0.3, hy - 1 + i * 0.1, hx - 0.8 + i * 0.35, hy + 3.2 + (i % 2) * 1.2, 0.25, i % 2 ? '#a8a498' : '#7a776c'); // lank hair at the hood's edge
        break;
      }
      case 'wolfhood': {
        g.beginPath(); g.moveTo(hx - 3.8, hy + 3.2); g.quadraticCurveTo(hx - 4.4, hy - 3.8, hx + 0.4, hy - 3.8); g.quadraticCurveTo(hx + 3.6, hy - 3.6, hx + 4.8, hy - 1.2); g.lineTo(hx + 2.4, hy - 1.4); g.quadraticCurveTo(hx, hy - 1.4, hx - 1.2, hy + 3.4); g.closePath();
        P.fill(g, P.lg(g, hx - 4, hy - 4, hx + 4, hy, ['#b8b0a4', '#7a7066', '#4a443c']));
        P.path(g, [hx - 1.6, hy - 3.4, hx - 0.8, hy - 5.6, hx + 0.4, hy - 3.6]); P.fill(g, '#6a6258');
        P.circle(g, hx + 2.4, hy - 2.4, 0.3, '#f0d040');
        break;
      }
      default: break;
    }
  }

  /** Generic humanoid. o = options, f = frame (0/1 walk). Box 20x20. */
  // how each weapon moves in the attack frames (2 = wind-up, 3 = strike): rot = arm swing about the shoulder, dx = push
  const SWING = { sword: 'slash', greatsword: 'slash', hammer: 'slash', axe: 'slash', greataxe: 'slash', scythe: 'slash', claws: 'slash',
    spear: 'thrust', bow: 'shoot', arquebus: 'shoot', flamer: 'shoot', staff: 'cast', eyestaff: 'cast', stormstaff: 'cast', plantstaff: 'cast', book: 'cast', chalice: 'cast', flask: 'throw', lute: 'strum' };
  const POSE = { // three beats: wind-up, strike, follow-through - { r: arm rotation, x: arm push, lean: body shift }
    slash: [{ r: -0.8, x: -0.3, lean: -0.4 }, { r: 0.55, x: 0.7, lean: 0.8 }, { r: 1.25, x: 0.4, lean: 0.5 }],
    thrust: [{ r: -0.12, x: -1.3, lean: -0.5 }, { r: 0.1, x: 2.4, lean: 0.9 }, { r: 0.05, x: 1, lean: 0.3 }],
    shoot: [{ r: -0.05, x: 0.2, lean: 0.1 }, { r: -0.26, x: -1.1, lean: -0.5 }, { r: -0.1, x: -0.4, lean: -0.2 }],
    cast: [{ r: -0.5, x: -0.2, lean: -0.3 }, { r: 0.3, x: 0.9, lean: 0.5 }, { r: 0.12, x: 0.4, lean: 0.2 }],
    throw: [{ r: -1.15, x: -0.6, lean: -0.4 }, { r: 0.4, x: 0.9, lean: 0.7 }, { r: 1, x: 0.5, lean: 0.4 }],
    strum: [{ r: -0.18, x: 0, lean: 0 }, { r: 0.22, x: 0.3, lean: 0.2 }, { r: 0.05, x: 0.1, lean: 0.1 }],
  };
  // frames: 0 stand, 1 stride (left foot forward), 2-4 attack (wind-up, strike, follow-through), 5 stride (right foot forward)
  function humanoid(g, f, o) {
    const stride = f === 1 ? 1 : f === 5 ? -1 : 0, walk = stride ? 1 : 0, pose = f >= 2 && f <= 4 ? POSE[SWING[o.weapon] || 'cast'][f - 2] : null;
    if (pose) g.translate(pose.lean, 0);
    const bx = 9.4, hipY = 12.6, footY = 18.3;
    const body = o.body || '#7a2a2a', trim = o.trim || sh(body, 0.35), legs = o.legs || '#3a3040', boots = o.boots || '#2a1e18';
    // cape
    if (o.cape) {
      g.beginPath(); g.moveTo(bx - 2.6, 7.8); g.quadraticCurveTo(bx - 5.6 - walk * 0.8, 13, bx - 5.2 - walk, 17.6); g.lineTo(bx - 0.4, 17); g.lineTo(bx + 0.6, 8.2); g.closePath();
      P.fill(g, P.lg(g, bx - 5, 8, bx, 17, [sh(o.cape, 0.1), o.cape, sh(o.cape, -0.45)]));
    }
    if (o.backpack) o.backpack(g, bx);
    // legs
    if (!o.robe) {
      const dl = walk ? 1.2 : 0.35;
      for (const s of [-1, 1]) {
        const q = stride < 0 ? -s : s; // the other stride: the legs trade places (the shading stays with each leg)
        const lx = bx + q * 0.95 + (q === -1 ? -dl : dl) * 0.8;
        g.save(); g.translate(bx + q * 0.9, hipY); g.rotate((q === -1 ? 1 : -1) * (walk ? 0.22 : 0.03));
        P.rrect(g, -1.05, 0, 2.1, 5, 0.9, P.lg(g, -1, 0, 1, 0, [sh(legs, s === -1 ? -0.25 : 0.15), legs, sh(legs, -0.35)]));
        g.restore();
        P.rrect(g, lx - 1.2, footY - 1.9, 2.8, 1.9, 0.8, P.lg(g, 0, footY - 2, 0, footY, [sh(boots, 0.3), boots, sh(boots, -0.4)]));
      }
    }
    // back arm
    P.rrect(g, bx - 3.2, 8.4, 1.8, 4.6, 0.9, P.lg(g, bx - 3, 8, bx - 1.4, 8, [sh(o.arms || body, -0.35), sh(o.arms || body, -0.15)]));
    P.circle(g, bx - 2.3, 13.2, 0.95, sh(o.skin || '#e8b890', -0.15));
    // robe / torso
    if (o.robe) {
      g.beginPath(); g.moveTo(bx - 3, 8); g.lineTo(bx + 2.8, 8); g.quadraticCurveTo(bx + 3.6, 13, bx + 4.6 + walk * 0.4, footY); g.lineTo(bx - 4.4 - walk * 0.4, footY); g.quadraticCurveTo(bx - 3.6, 13, bx - 3, 8); g.closePath();
      P.fill(g, P.lg(g, bx - 4, 8, bx + 4, footY, [sh(o.robe, 0.3), o.robe, sh(o.robe, -0.45)]));
      P.rrect(g, bx - 4.5 - walk * 0.4, footY - 1.2, 9.1 + walk * 0.8, 1.2, 0.5, trim);
      g.save(); g.globalAlpha = 0.35; for (let i = 0; i < 3; i++) P.line(g, bx - 1.5 + i * 1.6, 12.5, bx - 2.2 + i * 2.2, footY - 1.2, 0.3, sh(o.robe, -0.5)); g.restore();
      P.ell(g, bx + 2.6 + walk, footY - 0.1, 1.2, 0.6, boots);
    }
    g.beginPath(); g.moveTo(bx - 3.4, 8.6); g.quadraticCurveTo(bx - 3.4, 7.5, bx - 2, 7.5); g.lineTo(bx + 2.2, 7.5); g.quadraticCurveTo(bx + 3.6, 7.5, bx + 3.4, 9); g.lineTo(bx + 2.6, 13); g.lineTo(bx - 2.6, 13); g.closePath();
    P.fill(g, P.lg(g, bx - 3, 7.5, bx + 3, 13, [sh(body, 0.3), body, sh(body, -0.4)]));
    if (o.chest) o.chest(g, bx);
    P.rrect(g, bx - 2.8, 11.7, 5.6, 1.1, 0.4, o.belt || '#3a2418'); P.rrect(g, bx + 0.2, 11.8, 1, 0.9, 0.2, '#d8b048');
    // shoulders / pauldrons
    if (o.pauldron) { P.ell(g, bx + 2.2, 8.6, 1.9, 1.4, P.vol(g, bx + 2.2, 8.4, 2, o.pauldron)); }
    // shield
    if (o.shield) {
      const sx = bx - 2.6, sy = 11;
      if (o.shieldShape === 'round') { P.circle(g, sx, sy, 3.9, P.vol(g, sx, sy, 3.9, o.shield)); g.strokeStyle = '#c9a24a'; g.lineWidth = 0.55; g.beginPath(); g.arc(sx, sy, 3.6, 0, Math.PI * 2); g.stroke(); P.circle(g, sx, sy, 1.1, P.vol(g, sx, sy, 1.1, '#d8d8e0')); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P.circle(g, sx + Math.cos(a) * 2.6, sy + Math.sin(a) * 2.6, 0.25, '#e8e0c0'); } }
      else {
        g.beginPath(); g.moveTo(sx - 3, sy - 3.6); g.lineTo(sx + 3, sy - 3.6); g.lineTo(sx + 2.8, sy + 0.8); g.quadraticCurveTo(sx + 1.8, sy + 3.6, sx, sy + 4.8); g.quadraticCurveTo(sx - 1.8, sy + 3.6, sx - 2.8, sy + 0.8); g.closePath();
        P.fill(g, P.lg(g, sx - 3, sy - 4, sx + 3, sy + 4, [sh(o.shield, 0.35), o.shield, sh(o.shield, -0.4)]));
        g.strokeStyle = '#d8b048'; g.lineWidth = 0.5; g.stroke();
        if (o.emblem !== false) { P.rrect(g, sx - 0.4, sy - 2.6, 0.8, 5, 0.2, '#e8d070'); P.rrect(g, sx - 2, sy - 0.8, 4, 0.8, 0.2, '#e8d070'); }
      }
    }
    // head
    head(g, o, bx + 0.6, 4.9);
    // front arm + hand + weapon
    const hx = bx + 3.3, hy = 11.4;
    if (o.weaponBehind !== true) {
      g.save();
      if (pose) { const sx = bx + 2.7, sy = 8.8; g.translate(sx + pose.x, sy); g.rotate(pose.r); g.translate(-sx, -sy); } // the attack: arm and weapon swing about the shoulder
      P.rrect(g, bx + 1.8, 8.4, 1.8, 3.8, 0.9, P.lg(g, bx + 2, 8, bx + 3.6, 8, [sh(o.arms || body, 0.2), sh(o.arms || body, -0.2)]));
      if (o.puff) o.puff(g, bx);
      weapon(g, o, f, hx, hy);
      P.circle(g, hx - 0.2, hy + 0.2, 0.95, P.vol(g, hx - 0.2, hy + 0.2, 1, o.gloves || o.skin || '#e8b890'));
      g.restore();
    }
  }
  G.humanoid = humanoid;

  /* ---------------- hero definitions ---------------- */
  // size > 1 draws a bigger hero; the feet stay on the same ground point
  // M: room around the hero so a swung weapon never runs off the sprite (anchors shift with it)
  const M = 7, H = (name, o) => { const k = o.size || 1; G.painters[name] = { w: Math.ceil(20 * k) + M * 2, h: Math.ceil(25 * k) + M * 2, cx: 10 * k + M, cy: 23.3 * k - 7.3 + M, frames: 6, colors: {}, draw: (g, f) => { g.translate(M, M); g.scale(k, k); g.translate(0, 5); humanoid(g, f, o); } }; };

  // the Swordbearer: a barbarian of the north (after Diablo II's) - bare and broad, furs and leather, a great two-handed sword
  H('knight', { size: 1.15, body: '#c8845a', trim: '#8a5a34', arms: '#d8966a', legs: '#5a4230', boots: '#7a6650', hair: '#2e1c12', hairStyle: 'long', skin: '#d8966a',
    head: 'band', headCol: '#6a4428', weapon: 'greatsword', wcol: '#8a6a3a', gloves: '#6a4a2a', belt: '#3a2414',
    chest: (g, bx) => { // a bare, scarred chest: pecs and belly, a leather strap and a heavy buckle
      g.strokeStyle = 'rgba(90,40,20,.55)'; g.lineWidth = 0.3;
      g.beginPath(); g.moveTo(bx - 2.2, 9.6); g.quadraticCurveTo(bx - 0.9, 10.4, bx - 0.1, 9.5); g.moveTo(bx + 0.2, 9.5); g.quadraticCurveTo(bx + 1, 10.4, bx + 2.2, 9.6); g.stroke();
      for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(bx - 0.9, 10.6 + i * 0.6); g.lineTo(bx + 0.9, 10.6 + i * 0.6); g.stroke(); }
      P.line(g, bx - 1.8, 8.4, bx - 0.8, 9.4, 0.2, 'rgba(255,220,200,.5)'); // a pale old scar
      // a shaggy fur mantle over both shoulders: the broad frame of a northern barbarian
      g.beginPath(); g.moveTo(bx - 3.8, 8.6); g.quadraticCurveTo(bx - 3.6, 6.6, bx - 1, 6.9); g.lineTo(bx + 1.2, 6.9); g.quadraticCurveTo(bx + 4.4, 6.6, bx + 4.6, 9.2);
      for (let i = 0; i < 6; i++) g.lineTo(bx + 4.2 - i * 1.4, 9.6 + (i % 2) * 0.8);
      g.closePath(); P.fill(g, P.lg(g, 0, 6.6, 0, 10.2, ['#b8a080', '#8a7458', '#5a4a36']));
      for (let i = 0; i < 5; i++) P.line(g, bx - 3 + i * 1.6, 7.4, bx - 3.3 + i * 1.6, 8.8, 0.2, 'rgba(60,44,30,.6)');
      P.line(g, bx + 2.8, 7.8, bx - 2.4, 12, 0.9, '#4a2c16'); P.circle(g, bx + 0.4, 10, 0.35, '#8a8a90');
      P.rrect(g, bx - 1, 11.5, 2, 1.5, 0.3, '#b8904a'); P.rrect(g, bx - 0.5, 11.9, 1, 0.7, 0.2, '#3a2414');
      // a fur loincloth over the leather breeches
      P.path(g, [bx - 2.8, 12.8, bx + 2.8, 12.8, bx + 2.2, 15.2, bx + 0.8, 14.4, bx - 0.4, 15.4, bx - 1.6, 14.4, bx - 2.6, 15]); P.fill(g, P.lg(g, 0, 12.8, 0, 15.4, ['#9a8468', '#6a5640']));
    },
    backpack: (g, bx) => { P.ell(g, bx - 2.2, 8.2, 2.2, 1.3, P.lg(g, bx - 4, 7, bx, 9.5, ['#a08a6a', '#6a5640'])); } }); // a fur mantle on the back shoulder
  H('ranger', { body: '#3e6a34', trim: '#a8d070', arms: '#5a4028', legs: '#5a4028', boots: '#3a2616', head: 'hood', headCol: '#3a6a30', headCol2: '#1e3a1a', hair: '#8a5a2a', cape: '#2a4a24', weapon: 'bow', skin: '#e8b890',
    backpack: (g, bx) => { P.rrect(g, bx - 4.2, 6.6, 1.8, 5.8, 0.6, '#6a4222'); for (let i = 0; i < 3; i++) { P.line(g, bx - 3.8 + i * 0.5, 6.8, bx - 4.6 + i * 0.6, 4.8, 0.3, '#8a6a4a'); P.path(g, [bx - 5.1 + i * 0.6, 4.9, bx - 4.4 + i * 0.6, 3.8, bx - 4.1 + i * 0.6, 5]); P.fill(g, '#e8e0d0'); } } });
  H('templar', { robe: '#ece6d8', body: '#f4efe4', trim: '#d8b048', arms: '#e8e2d4', head: 'mitre', skin: '#e0b088', weapon: 'hammer', wcol: '#e8c050', beard: '#c8c0b0', hair: '#c8c0b0', cape: '#c8a040',
    chest: (g, bx) => { P.rrect(g, bx - 0.45, 8.2, 0.9, 3.4, 0.2, '#d8b048'); P.rrect(g, bx - 1.5, 9.1, 3, 0.8, 0.2, '#d8b048'); } });
  H('pyro', { body: '#6a4a30', trim: '#e0a040', arms: '#5a3a24', legs: '#3a3030', boots: '#2a1a14', head: 'mask', headCol: '#5a4030', weapon: 'flamer', gloves: '#3a2a20',
    backpack: (g, bx) => { P.rrect(g, bx - 5, 7.4, 2.6, 6, 1.2, P.lg(g, bx - 5, 0, bx - 2.4, 0, ['#d86a2a', '#a0401a', '#6a2410'])); P.rrect(g, bx - 4.8, 8.6, 2.2, 0.5, 0.2, '#3a2a20'); P.rrect(g, bx - 4.8, 11.6, 2.2, 0.5, 0.2, '#3a2a20'); } });
  H('occultist', { robe: '#4a2466', body: '#5a2e7a', trim: '#c070ff', arms: '#4a2466', head: 'deephood', headCol: '#3a1a52', headCol2: '#1e0c2e', eyeGlow: '#e080ff', weapon: 'book', wcol: '#c070ff', skin: '#c8b0c8',
    headBack: (g, hx, hy) => { g.beginPath(); g.moveTo(hx - 2, hy - 3); g.quadraticCurveTo(hx - 3, hy - 7, hx - 5.6, hy - 7.6); g.quadraticCurveTo(hx - 3.6, hy - 5.2, hx - 3.4, hy - 2.2); P.fill(g, '#2a1438'); } });
  H('valkyrie', { body: '#8aa0c0', trim: '#e8e0c0', arms: '#d8b898', legs: '#4a5a78', boots: '#5a4028', head: 'wingedhelm', headCol: '#c8d0e0', hair: '#f0d070', hairStyle: 'braid', shield: '#b0402a', shieldShape: 'round', weapon: 'spear', wcol: '#e8d070', pauldron: '#c8d0e0', cape: '#2a3a6a', skin: '#f0c8a0',
    chest: (g, bx) => { P.ell(g, bx, 9.6, 2.2, 1.4, P.vol(g, bx, 9.4, 2.2, '#b8c4d8')); } });
  H('stormwitch', { robe: '#1e2e6a', body: '#26387a', trim: '#f0d040', arms: '#26387a', head: 'hat', headCol: '#1a2250', headCol2: '#0c1030', hatBand: '#f0d040', hair: '#1a1a2a', hairStyle: 'long', weapon: 'stormstaff', wcol: '#8ad8ff', skin: '#f0d0b8',
    chest: (g, bx) => { g.strokeStyle = '#f0d040'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(bx + 0.8, 8); g.lineTo(bx - 0.4, 9.8); g.lineTo(bx + 0.6, 9.8); g.lineTo(bx - 0.6, 11.6); g.stroke(); } });
  H('huntress', { body: '#6a4a34', trim: '#c8b8a0', arms: '#d09878', legs: '#4a3a2a', boots: '#3a2a1c', head: 'wolfhood', hair: '#b83a1a', hairStyle: 'long', weapon: 'spear', wcol: '#80e0ff', skin: '#e0a880', cape: '#8a8278',
    chest: (g, bx) => { P.path(g, [bx - 3, 8, bx + 3, 8, bx + 1.6, 10, bx - 1.6, 10]); P.fill(g, '#b8b0a4'); } });
  H('jarl', { body: '#3a3430', trim: '#9a8a6a', arms: '#d8a888', legs: '#2e2e36', boots: '#3a2a1c', head: 'spectacle', headCol: '#6a7280', headCol2: '#2e343e', beard: '#c8783a', hair: '#c8783a', hairStyle: 'braid', weapon: 'greataxe', wcol: '#9fe8ff', pauldron: '#6a5a4a', skin: '#e0ae8c', cape: '#4a3c2e',
    chest: (g, bx) => { g.beginPath(); g.moveTo(bx - 3.6, 7.4); g.quadraticCurveTo(bx, 6.6, bx + 3.6, 7.4); g.quadraticCurveTo(bx + 2.4, 9.6, bx + 1.2, 9); g.quadraticCurveTo(bx, 10.2, bx - 1.2, 9); g.quadraticCurveTo(bx - 2.4, 9.6, bx - 3.6, 7.4); g.closePath(); P.fill(g, P.lg(g, 0, 6.8, 0, 10, ['#8a7a64', '#4a3e30'])); } }); // a bear-fur mantle
  H('oracle', { robe: '#1a6a6a', body: '#1e7a78', trim: '#e8d070', arms: '#1a6a6a', head: 'turban', headCol: '#e8e0c8', headCol2: '#a89a78', wcol: '#60e0d0', weapon: 'eyestaff', skin: '#c89070', beard: '#e8e8e8',
    chest: (g, bx) => { P.circle(g, bx, 9.8, 1, '#e8d070'); P.circle(g, bx, 9.8, 0.5, '#1a6a6a'); } });
  H('bloodsaint', { robe: '#7a0e1c', body: '#8a1424', trim: '#e8c070', arms: '#8a1424', head: 'thorns', hair: '#e8e4dc', hairStyle: 'long', skin: '#e8dcd4', weapon: 'chalice', cape: '#4a0610',
    chest: (g, bx) => { P.rrect(g, bx - 0.4, 8.4, 0.8, 3, 0.2, '#e8c070'); P.rrect(g, bx - 1.4, 9.2, 2.8, 0.7, 0.2, '#e8c070'); } });
  H('skald', { body: '#3a2424', trim: '#b89a50', arms: '#d8a888', legs: '#2a2630', boots: '#3a2a1c', head: 'hood', headCol: '#2a3040', headCol2: '#12161e', hair: '#b8763a', hairStyle: 'braid', beard: '#b8763a', weapon: 'lute', wcol: '#ffd070', cape: '#1e2430', skin: '#e0ae8c',
    chest: (g, bx) => { P.line(g, bx - 2.6, 8, bx + 2.4, 12, 0.7, '#4a3a2a'); P.circle(g, bx - 1.2, 9.2, 0.5, '#b89a50'); P.circle(g, bx + 0.4, 10.4, 0.5, '#b89a50'); } }); // a strap studded with rune-coins
  // the Landsknecht: an arquebusier in a steel morion and breastplate, slashed puffed sleeves and striped pluderhose
  H('landsknecht', { body: '#9a1c22', trim: '#e8c050', arms: '#9a1c22', legs: '#3a2a3a', boots: '#2e2018', head: 'morion', headCol: '#c8ccd6', headCol2: '#6a707c', hair: '#c8763a', hairStyle: 'braid', skin: '#f0c8a0', weapon: 'arquebus', gloves: '#6a4a2a', belt: '#3a2414',
    puff: (g, bx) => { // the front sleeve: a puffed, slashed shoulder in red and yellow
      P.ell(g, bx + 2.7, 9.2, 1.6, 1.5, P.vol(g, bx + 2.7, 9, 1.7, '#c8282e'));
      for (let i = 0; i < 2; i++) P.line(g, bx + 2.3 + i * 0.9, 8.3, bx + 2.3 + i * 0.9, 10.1, 0.25, '#e8c050');
    },
    chest: (g, bx) => {
      // the back sleeve and the pluderhose: puffed, slashed, striped
      P.ell(g, bx - 2.6, 9.4, 1.5, 1.4, P.vol(g, bx - 2.6, 9.2, 1.6, '#8a181e'));
      for (const lx of [bx - 1.3, bx + 1.3]) { P.ell(g, lx, 14.1, 1.7, 1.5, P.vol(g, lx, 13.9, 1.8, '#b8242a')); for (let i = 0; i < 2; i++) P.line(g, lx - 0.6 + i * 1.2, 12.9, lx - 0.5 + i * 1.2, 15.3, 0.4, '#f0d060'); }
      // the breastplate: polished steel with a central ridge and gilt rivets
      g.beginPath(); g.moveTo(bx - 2.7, 8.1); g.lineTo(bx + 2.5, 8.1); g.quadraticCurveTo(bx + 3, 10.4, bx + 2.3, 12.2); g.lineTo(bx - 2.3, 12.2); g.quadraticCurveTo(bx - 3, 10.4, bx - 2.7, 8.1); g.closePath();
      P.fill(g, P.lg(g, bx - 3, 8, bx + 3, 12, ['#f0f2f8', '#b8bcc8', '#6a707c']));
      P.line(g, bx - 0.1, 8.3, bx - 0.1, 12, 0.35, 'rgba(255,255,255,.7)');
      for (const [rx, ry] of [[bx - 2.1, 8.6], [bx + 1.9, 8.6], [bx - 1.8, 11.6], [bx + 1.6, 11.6]]) P.circle(g, rx, ry, 0.28, '#e8c050');
      P.line(g, bx + 2.6, 8.2, bx - 2.6, 12.3, 0.55, '#5a3a20'); P.circle(g, bx - 0.8, 10.8, 0.5, '#3a3a40'); // bandolier with a powder flask
    },
    backpack: (g, bx) => { P.rrect(g, bx - 4.4, 11.2, 1.8, 2.4, 0.6, '#5a3a20'); P.circle(g, bx - 3.5, 11, 0.7, '#3a3a40'); } }); // grenade pouch
  H('alchemist', { robe: '#4a3a2a', body: '#5a4632', trim: '#c9a24a', arms: '#5a4632', head: 'goggles', headCol: '#6a4a2a', headCol2: '#3a2616', wcol: '#80c040', skin: '#e0b090', beard: '#9a948a', weapon: 'flask',
    chest: (g, bx) => { P.path(g, [bx - 2.2, 8.6, bx + 2.2, 8.6, bx + 2.6, 13, bx - 2.6, 13]); P.fill(g, P.lg(g, 0, 8.6, 0, 13, ['#a88a60', '#7a6040'])); for (let i = 0; i < 3; i++) { P.rrect(g, bx - 2.4 + i * 1.7, 11.8, 1.1, 1.5, 0.3, ['#ff7a30', '#70d0ff', '#80c040'][i]); P.rect(g, bx - 2.2 + i * 1.7, 11.4, 0.7, 0.5, '#7a5230'); } } }); // leather apron, a belt of vials
  H('crone', { robe: '#3e4a2a', body: '#465230', trim: '#8a9a4a', arms: '#3e4a2a', head: 'hag', headCol: '#4a5436', headCol2: '#1e2414', hair: '#9a968a', hairStyle: 'none', skin: '#c8d0a8', eyeGlow: '#d8ff80', weapon: 'plantstaff', wcol: '#c0ff60', cape: '#262c1a',
    chest: (g, bx) => { P.line(g, bx - 2.6, 9, bx + 2.2, 9.6, 0.4, '#5a4a2a'); for (let i = 0; i < 3; i++) P.circle(g, bx - 1.6 + i * 1.5, 9.4 + (i % 2) * 0.4, 0.45, ['#e8e0c8', '#8a3a4a', '#c8b060'][i]); } }); // a string of bones and charms
  H('reaper', { robe: '#1c1624', body: '#241c2e', trim: '#4a3a5a', arms: '#1c1624', head: 'deephood', headCol: '#2a2034', headCol2: '#100a16', eyeGlow: '#8affd0', weapon: 'scythe', wcol: '#8affd0', skin: '#d8d0c0' });

  /* enemy humanoids */
  G.painters.cultist = { w: 20, h: 22, cy: 13, frames: 2, colors: { robe: '#4a2466', glow: '#e070ff' }, draw: (g, f, c) => { g.translate(0, 2); humanoid(g, f, { robe: c.robe, body: sh(c.robe, 0.1), trim: c.glow, arms: c.robe, head: 'deephood', headCol: sh(c.robe, -0.1), headCol2: sh(c.robe, -0.5), eyeGlow: c.glow, weapon: 'staff', wcol: c.glow }); },
    variants: { fire: { robe: '#6a1a10', glow: '#ffa030' }, ice: { robe: '#1e3a6a', glow: '#8ff0ff' }, bog: { robe: '#3a4a1a', glow: '#b0ff50' }, gold: { robe: '#6a5a2a', glow: '#fff0a0' }, purple: { robe: '#3a1450', glow: '#ff60c0' }, drowned: { robe: '#1a4a4a', glow: '#70ffd0' } } };
  G.painters.hknight = { w: 20, h: 23, cy: 14, frames: 2, colors: { metal: '#4a4a56', glow: '#ff3a3a', cloth: '#3a1a1a' }, draw: (g, f, c) => { g.translate(0, 3); humanoid(g, f, { body: c.metal, trim: sh(c.metal, 0.3), arms: c.metal, legs: sh(c.metal, -0.2), boots: sh(c.metal, -0.4), head: 'hornedhelm', headCol: c.metal, eyeGlow: c.glow, weapon: 'sword', shield: sh(c.metal, -0.1), emblem: false, cape: c.cloth, pauldron: sh(c.metal, 0.2), gloves: c.metal, skin: '#3a3040' }); },
    variants: { gold: { metal: '#8a7a4a', glow: '#fff0a0', cloth: '#5a1a2a' }, purple: { metal: '#3a2a4a', glow: '#ff60c0', cloth: '#2a0a3a' }, drowned: { metal: '#3a5a5a', glow: '#70ffd0', cloth: '#1a3a3a' }, ice: { metal: '#5a7a9a', glow: '#8ff0ff', cloth: '#1a2a4a' } } };
})(window.DH);
