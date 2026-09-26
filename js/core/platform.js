/* Platform layer: web browser vs. the Capacitor app (Android), plus async key/value storage.
 * In the browser everything goes to localStorage. Inside the app the profile goes to
 * Capacitor Preferences (native storage the OS will not purge like WebView storage),
 * with a one-time import of whatever an older build left in localStorage. */
(function (DH) {
  'use strict';
  const Cap = window.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (native && Cap.Plugins && Cap.Plugins[name]) || null;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { console.warn('storage write failed', e); } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) { /* storage blocked */ } },
  };

  const Prefs = plugin('Preferences');
  const storage = Prefs ? {
    async get(k) {
      const r = await Prefs.get({ key: k });
      if (r && r.value != null) return r.value;
      const old = ls.get(k); // one-time import from WebView storage
      if (old != null) await Prefs.set({ key: k, value: old });
      return old;
    },
    set(k, v) { return Prefs.set({ key: k, value: v }); },
    remove(k) { ls.remove(k); return Prefs.remove({ key: k }); },
  } : {
    async get(k) { return ls.get(k); },
    async set(k, v) { ls.set(k, v); },
    async remove(k) { ls.remove(k); },
  };

  const ua = navigator.userAgent || '';
  const os = native ? (Cap.getPlatform ? Cap.getPlatform() : 'android')
    : /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Windows/i.test(ua) ? 'windows'
    : /Mac OS/i.test(ua) ? 'mac' : /Linux|CrOS/i.test(ua) ? 'linux' : 'web';

  DH.platform = {
    native, os, plugin, storage,
    /** Short device label shown when two saves conflict ("Android app", "Windows browser"). */
    deviceLabel() { return t('device.' + os) + ' · ' + t(native ? 'device.app' : 'device.browser'); },
  };

  /* Native niceties; all optional so the web build never depends on them. */
  if (native) {
    const App = plugin('App'), StatusBar = plugin('StatusBar');
    if (StatusBar) StatusBar.hide().catch(() => {});
    if (App) {
      App.addListener('pause', () => DH.events.emit('app:pause'));
      App.addListener('resume', () => DH.events.emit('app:resume'));
      App.addListener('backButton', () => DH.events.emit('app:back'));
    }
  }
})(window.DH);
