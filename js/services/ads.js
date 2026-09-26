/* Advertising adapter.
 * The game only talks to DH.ads.rewarded(placement) and DH.ads.interstitial(placement).
 * provider 'mock' shows an in-game placeholder so every ad flow is testable in the browser.
 * To ship: implement a provider that wraps e.g. AdMob (@capacitor-community/admob)
 * or Unity Ads / AppLovin MAX, and set DH.ads.provider = thatProvider at boot. */
(function (DH) {
  'use strict';
  const h = DH.util.h;

  const MockProvider = {
    name: 'mock',
    show(kind) {
      return new Promise((resolve) => {
        const secs = kind === 'rewarded' ? 5 : 3;
        let left = secs;
        const count = h('div.ad-count', t('ad.rewardIn', { s: left }));
        const close = h('button.ad-close.hidden', { 'aria-label': t('common.close') }, DH.icons.img('u_close', 'ci'));
        const layer = h('div.ad-layer',
          h('div.ad-tag', t('ad.label')),
          h('div.ad-body',
            h('div.ad-art', DH.art.img('n_pass', 'ad-icon')),
            h('div.ad-title', t('ad.demoTitle')),
            h('div.ad-sub', t('ad.demoSub')),
            h('div.ad-note', t('ad.mockNote'))),
          count, close);
        document.getElementById('modals').appendChild(layer);
        DH.audio.stopMusic();
        const iv = setInterval(() => {
          left--;
          count.textContent = left > 0 ? t(kind === 'rewarded' ? 'ad.rewardIn' : 'ad.closeIn', { s: left }) : (kind === 'rewarded' ? t('ad.rewardReady') : '');
          if (left <= 0) { clearInterval(iv); close.classList.remove('hidden'); }
        }, 1000);
        close.addEventListener('click', () => { layer.remove(); resolve(true); });
      });
    },
  };

  const ads = {
    provider: MockProvider,
    busy: false,
    /** Rewarded video. Resolves true if the player earned the reward. */
    async rewarded(placement) {
      if (this.busy) return false;
      const S = DH.save.data;
      this.busy = true;
      let ok = true;
      try {
        if (!S.purchases.noAds) ok = await this.provider.show('rewarded', placement);
      } catch (e) { console.warn('ad failed', e); ok = false; }
      this.busy = false;
      if (ok) {
        S.stats.adsWatched++;
        DH.meta.track('ads', 1);
        DH.save.persist();
      } else DH.ui.toast(t('ad.unavailable'), 'bad');
      DH.events.emit('adClosed');
      return ok;
    },
    /** Interstitial shown between runs; skipped entirely with the No-Ads purchase. */
    async interstitial(placement) {
      const S = DH.save.data;
      if (S.purchases.noAds || this.busy) return;
      this.busy = true;
      try { await this.provider.show('interstitial', placement); } catch (e) { /* ignore */ }
      this.busy = false;
      DH.events.emit('adClosed');
    },
  };
  DH.ads = ads;
})(window.DH);
