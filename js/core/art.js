/* Shared canvas helpers for the renderer: light and glow stamps, stage thumbnails.
 * Sprites, floors and icons live in gfx.js / paint_*.js / icons.js. */
(function (DH) {
  'use strict';
  const U = DH.util;

  function makeCanvas(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
  }
  // img / icon are provided by icons.js
  const art = { makeCanvas };

  /* ---------------------------------------------------------------- */
  /* Lights                                                            */
  /* ---------------------------------------------------------------- */
  art.lightSprite = (function () {
    const c = makeCanvas(128, 128), g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return c;
  })();
  const glowCache = {};
  art.glow = function (color) {
    if (glowCache[color]) return glowCache[color];
    const c = makeCanvas(64, 64), g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return (glowCache[color] = c);
  };

  /** Small scene thumbnail for the stage selector. */
  art.stageThumb = function (stageId, w, h) {
    const G = DH.gfx, C = DH.content, st = C.stages[stageId], res = G.CPX;
    const c = makeCanvas(w * res, h * res), g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.scale(res, res);
    const fl = G.floor(st.theme, 3 + st.index * 11), ch = fl.chunk(0, 0);
    g.drawImage(ch.canvas, 0, 0, G.CHUNK, G.CHUNK);
    const pool = Object.keys(C.timeline[4].mix).concat(['bat', 'skeleton']).map((k) => st.remap[k] || k);
    const rng = U.seeded(42 + st.index);
    for (let i = 0; i < 10; i++) {
      const def = C.enemies[pool[i % pool.length]]; if (!def) continue;
      const p = G.painters[def.painter], v = def.variant || (p && p.variants && p.variants[st.variant] ? st.variant : null);
      const s = G.sprite(def.painter, v);
      const x = 12 + rng() * (w - 24), y = 16 + rng() * (h - 26);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, y + 7, 6, 2, 0, 0, Math.PI * 2); g.fill();
      g.drawImage(s.frames[0], x - s.ox, y - s.oy, s.w, s.h);
    }
    const bdef = C.enemies[st.bosses[1].id], bs = G.sprite(bdef.painter, bdef.variant || null);
    const k = Math.min(1, (h - 10) / bs.h);
    g.drawImage(bs.frames[0], w / 2 - bs.w * k / 2, h / 2 - bs.h * k / 2 + 4, bs.w * k, bs.h * k);
    const dark = makeCanvas(w, h), dg = dark.getContext('2d'), D = st.theme.dark;
    dg.fillStyle = 'rgba(' + D[0] + ',' + D[1] + ',' + D[2] + ',' + (st.theme.darkness - 0.12) + ')'; dg.fillRect(0, 0, w, h);
    dg.globalCompositeOperation = 'destination-out';
    dg.drawImage(art.lightSprite, w / 2 - 75, h / 2 - 75, 150, 150);
    ch.lights.forEach((l) => { if (l.x < w + 40 && l.y < h + 40) dg.drawImage(art.lightSprite, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); });
    g.drawImage(dark, 0, 0, w, h);
    return c;
  };

  DH.art = art;
})(window.DH);
