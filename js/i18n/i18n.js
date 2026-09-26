/* Localization.
 * Add a language: create js/i18n/<code>.js calling DH.i18n.register(code, meta, strings)
 * and add a <script> tag for it in index.html. Missing keys fall back to English.
 * Strings may contain {placeholders} which are filled from the params object. */
(function (DH) {
  'use strict';
  const langs = {};
  let current = 'en';
  const FALLBACK = 'en';

  function lookup(code, key) {
    const l = langs[code];
    return l ? l.strings[key] : undefined;
  }

  const i18n = {
    register(code, meta, strings) {
      if (langs[code]) Object.assign(langs[code].strings, strings);
      else langs[code] = { code, name: meta.name, native: meta.native, strings: Object.assign({}, strings) };
    },
    t(key, params) {
      let s = lookup(current, key);
      if (s === undefined) s = lookup(FALLBACK, key);
      if (s === undefined) {
        if (DH.DEBUG) console.warn('[i18n] missing key', key);
        return key;
      }
      if (params) s = s.replace(/\{(\w+)\}/g, (m, p) => (params[p] !== undefined ? params[p] : m));
      return s;
    },
    has(key) { return lookup(current, key) !== undefined || lookup(FALLBACK, key) !== undefined; },
    set(code) {
      if (!langs[code]) code = FALLBACK;
      current = code;
      document.documentElement.lang = code;
      DH.events.emit('lang', code);
    },
    get current() { return current; },
    list() { return Object.values(langs).map((l) => ({ code: l.code, name: l.name, native: l.native })); },
    detect() {
      const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
      const code = nav.slice(0, 2).toLowerCase();
      return langs[code] ? code : FALLBACK;
    },
    /** Report keys present in English but missing from a language (dev helper). */
    missing(code) {
      const en = langs[FALLBACK].strings, other = langs[code] ? langs[code].strings : {};
      return Object.keys(en).filter((k) => !(k in other));
    },
  };
  DH.i18n = i18n;
  window.t = i18n.t;
})(window.DH);
