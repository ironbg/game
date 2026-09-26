/* In-app purchase adapter.
 * provider 'mock' simulates the store with a confirmation dialog (no money is charged).
 * To ship on mobile: wrap cordova-plugin-purchase (CdvPurchase) or RevenueCat's Capacitor SDK,
 * register the product ids from DH.economy.products, validate receipts on your server,
 * then call DH.meta.fulfillProduct(id) once the platform confirms the purchase.
 * On the web: redirect to Stripe Checkout / Xsolla and fulfil from a webhook. */
(function (DH) {
  'use strict';

  const MockStore = {
    name: 'mock',
    price(id) { const p = DH.economy.products[id]; return p ? '$' + p.price.toFixed(2) : ''; },
    buy(id) {
      return new Promise((resolve) => {
        const p = DH.economy.products[id];
        DH.ui.confirm({
          title: t('iap.confirmTitle'),
          body: t('iap.confirmBody', { item: DH.meta.productName(id), price: this.price(id) }),
          note: t('iap.mockNote'),
          ok: t('iap.buyFor', { price: this.price(id) }),
          cancel: t('common.cancel'),
        }).then((yes) => resolve(!!(yes && p)));
      });
    },
    restore() { return Promise.resolve([]); },
  };

  const iap = {
    provider: MockStore,
    price(id) { return this.provider.price(id); },
    async buy(id) {
      const p = DH.economy.products[id];
      if (!p) return false;
      if (p.once && DH.save.data.purchases.once[id]) { DH.ui.toast(t('iap.owned'), 'bad'); return false; }
      let ok = false;
      try { ok = await this.provider.buy(id); } catch (e) { console.warn(e); }
      if (!ok) return false;
      DH.meta.fulfillProduct(id);
      DH.cloud.flush('purchase'); // paid progress goes to the cloud right away
      return true;
    },
    async restore() {
      const ids = await this.provider.restore();
      ids.forEach((id) => { const p = DH.economy.products[id]; if (p && (p.once || p.type === 'noads')) DH.meta.fulfillProduct(id, true); });
      DH.ui.toast(t('iap.restored'));
    },
  };
  DH.iap = iap;
})(window.DH);
