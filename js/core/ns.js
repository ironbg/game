/* Dreadhollow - global namespace and shared helpers.
 * Classic scripts (no bundler) so the game runs from file://, any static host,
 * or inside a Capacitor/Cordova WebView without a build step. */
window.DH = window.DH || {};
(function (DH) {
  'use strict';

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    dist2: (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; },
    now: () => Date.now(),

    /** Deterministic 2D hash -> [0,1). Used for infinite procedural floors. */
    hash2(x, y, seed) {
      let h = (x | 0) * 374761393 + (y | 0) * 668265263 + ((seed | 0) * 2246822519);
      h = (h ^ (h >>> 13)) * 1274126177;
      h = h ^ (h >>> 16);
      return ((h >>> 0) % 100000) / 100000;
    },

    /** Seeded PRNG (mulberry32). */
    seeded(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    strSeed(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return h >>> 0;
    },

    weighted(table, rng) {
      // table: {key: weight}
      const r = (rng || Math.random)();
      let total = 0;
      for (const k in table) total += table[k];
      let acc = 0;
      for (const k in table) { acc += table[k] / total; if (r <= acc) return k; }
      return Object.keys(table)[0];
    },

    shuffle(arr, rng) {
      const r = rng || Math.random;
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    },

    /** Local calendar day key, used for daily resets. */
    dayKey(ts) {
      const d = ts ? new Date(ts) : new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    msToMidnight() {
      const d = new Date(); const m = new Date(d); m.setHours(24, 0, 0, 0); return m - d;
    },
    daysBetween(k1, k2) {
      const a = new Date(k1 + 'T00:00:00'), b = new Date(k2 + 'T00:00:00');
      return Math.round((b - a) / 86400000);
    },

    fmt(n) {
      n = Math.floor(n);
      if (n < 10000) return String(n);
      if (n < 1e6) return (n / 1000).toFixed(n < 1e5 ? 1 : 0).replace(/\.0$/, '') + 'K';
      if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 2 : 1).replace(/\.?0+$/, '') + 'M';
      return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    },
    fmtTime(sec) {
      sec = Math.max(0, Math.floor(sec));
      const m = Math.floor(sec / 60), s = sec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },
    fmtDuration(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
      if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
      if (m > 0) return m + 'm ' + String(ss).padStart(2, '0') + 's';
      return ss + 's';
    },
    pct(v) { return Math.round(v * 100) + '%'; },

    /** Tiny DOM builder: h('div.cls#id', {attrs/on*}, children...) */
    h(sel, props, ...kids) {
      const m = sel.match(/^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i);
      const el = document.createElement((m && m[1]) || 'div');
      if (m && m[2]) {
        m[2].replace(/([.#])([\w-]+)/g, (_, t, v) => { if (t === '.') el.classList.add(v); else el.id = v; });
      }
      if (props != null && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) { kids.unshift(props); props = null; }
      if (props) {
        for (const k in props) {
          const v = props[k];
          if (v == null || v === false) continue;
          if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else if (k === 'html') el.innerHTML = v;
          else if (k === 'text') el.textContent = v;
          else if (k === 'cls') String(v).split(' ').filter(Boolean).forEach((c) => el.classList.add(c));
          else el.setAttribute(k, v === true ? '' : v);
        }
      }
      const add = (k) => {
        if (k == null || k === false) return;
        if (Array.isArray(k)) k.forEach(add);
        else if (k instanceof Node) el.appendChild(k);
        else el.appendChild(document.createTextNode(String(k)));
      };
      kids.forEach(add);
      return el;
    },
  };

  /** Minimal event bus. */
  const listeners = {};
  DH.events = {
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { const l = listeners[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    emit(ev, data) { (listeners[ev] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };

  DH.util = U;
  DH.VERSION = '1.36.4';
})(window.DH);
