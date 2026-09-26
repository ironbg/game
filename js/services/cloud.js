/* Accounts + cloud save.
 * The game talks only to DH.cloud. A provider supplies sign-in and one save document per account:
 *   'mock'     - fake accounts kept in this browser, so every flow is testable without a backend
 *   'firebase' - Firebase Auth (Google, email + password) + Firestore (plugs in here for release)
 * Sync model: the cloud document carries a revision number. A device uploads only when the cloud
 * is still at the revision its profile was based on; if both sides changed, the player picks which
 * profile to keep (paid unlocks survive either choice, currencies never merge). */
(function (DH) {
  'use strict';
  const U = DH.util, h = U.h;

  /** Provider errors carry a code: network, cancelled, invalid-email, weak-password, email-in-use,
   * wrong-credentials, popup-blocked, already-linked, unavailable, account-exists (Google sign-in met an email + password account),
   * credential-in-use (that Google account belongs to another player), needs-verify, requires-login,
   * conflict (the cloud moved on), outdated (the cloud profile is from a newer game version). */
  const fail = (code, extra) => Object.assign(new Error(code), { code }, extra);

  /* ---------------- Mock provider: a pretend backend in localStorage ---------------- */
  const MOCK_KEY = 'dreadhollow.mockcloud', MOCK_SESSION = 'dreadhollow.mockcloud.session'; // the "server" and this device's sign-in
  const MockCloud = {
    name: 'mock',
    db() {
      let db = null; try { db = JSON.parse(localStorage.getItem(MOCK_KEY)); } catch (e) { /* start empty */ }
      db = db || { users: {}, saves: {} };
      db.session = localStorage.getItem(MOCK_SESSION) || null;
      if (db.session && !db.users[db.session]) db.session = null;
      return db;
    },
    put(db) {
      const { session, ...server } = db;
      localStorage.setItem(MOCK_KEY, JSON.stringify(server));
      if (session) localStorage.setItem(MOCK_SESSION, session); else localStorage.removeItem(MOCK_SESSION);
    },
    lag() { return new Promise((r) => setTimeout(r, 250)); },
    user(db, uid) {
      const u = db.users[uid]; if (!u) return null;
      return { uid, email: u.email, emailVerified: !!u.verified, name: u.email, providers: [u.pw ? 'password' : null, u.google ? 'google' : null].filter(Boolean) };
    },
    find(db, test) { for (const uid in db.users) if (test(db.users[uid])) return uid; return null; },
    login(db, uid) { db.session = uid; this.put(db); this.notify(); },
    notify() { const db = this.db(); this.cb(db.session ? this.user(db, db.session) : null); },
    async init(cb) { this.cb = cb; this.notify(); },
    /** Stand-in for Google's account chooser. */
    pickGoogle() {
      return new Promise((resolve) => {
        const inp = h('input.field', { type: 'email', placeholder: 'name@gmail.com', autocomplete: 'off' });
        let done = false;
        const m = DH.ui.modal({ title: 'Google', onClose: () => { if (!done) resolve(null); }, body: h('div',
          h('div.small.muted', t('cloud.mockGoogle')), inp,
          h('div.btns', h('button.btn.gold', { onclick: () => { const v = inp.value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(v)) return; done = true; m.close(); resolve(v); } }, t('common.continue')))) });
        setTimeout(() => inp.focus(), 50);
      });
    },
    async signInGoogle() {
      const email = await this.pickGoogle(); if (!email) throw fail('cancelled');
      await this.lag();
      const db = this.db();
      let uid = this.find(db, (u) => u.google === email);
      if (!uid) {
        const other = this.find(db, (u) => u.email === email);
        if (other && db.users[other].verified) throw fail('account-exists', { email, pending: { google: email } });
        if (other) Object.assign(db.users[other], { google: email, pw: null, verified: true }); // Google takes over an unconfirmed address
        uid = other || this.newUser(db, { email, google: email, verified: true });
      }
      this.login(db, uid);
    },
    newUser(db, u) { const uid = 'mock_' + Math.random().toString(36).slice(2, 10); db.users[uid] = u; return uid; },
    async signUpEmail(email, pw) {
      await this.lag();
      const db = this.db();
      if (this.find(db, (u) => u.email === email)) throw fail('email-in-use');
      this.login(db, this.newUser(db, { email, pw, verified: false }));
    },
    async signInEmail(email, pw) {
      await this.lag();
      const db = this.db(), uid = this.find(db, (u) => u.email === email);
      if (!uid || !db.users[uid].pw || db.users[uid].pw !== pw) throw fail('wrong-credentials');
      this.login(db, uid);
    },
    async linkGoogle(pending) {
      const email = pending ? pending.google : await this.pickGoogle(); if (!email) throw fail('cancelled');
      await this.lag();
      const db = this.db(), uid = db.session;
      if (this.find(db, (u) => u.google === email && db.users[uid] !== u)) throw fail('credential-in-use');
      db.users[uid].google = email; this.put(db); this.notify();
    },
    // test mode: "clicking the emailed link" happens when the player taps I confirmed it (reload)
    async sendVerification() { await this.lag(); const db = this.db(); db.users[db.session].sent = true; this.put(db); },
    async reload() { const db = this.db(), u = db.users[db.session]; if (u && u.sent) { u.verified = true; this.put(db); } this.notify(); },
    async resetPassword() { await this.lag(); },
    async signOut() { const db = this.db(); db.session = null; this.put(db); this.notify(); },
    async deleteAccount() { const db = this.db(); delete db.users[db.session]; delete db.saves[db.session]; db.session = null; this.put(db); this.notify(); },
    async getSave(uid) { await this.lag(); return this.db().saves[uid] || null; },
    async putSave(uid, doc, expectedRev) {
      await this.lag();
      const db = this.db(), cur = db.saves[uid];
      if ((cur ? cur.rev : 0) !== expectedRev) throw fail('conflict');
      db.saves[uid] = Object.assign({}, doc, { rev: expectedRev + 1 });
      this.put(db);
      return expectedRev + 1;
    },
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const checkCreds = (email, pw) => {
    if (!EMAIL_RE.test(email)) throw fail('invalid-email');
    if (pw != null && pw.length < 6) throw fail('weak-password');
  };

  /** ?cloud=mock forces test accounts; otherwise Firebase wherever it can sign in (its hosts and the app). */
  const pickProvider = () => {
    if (/[?&]cloud=mock\b/.test(location.search) || !DH.FirebaseCloud || !DH.FirebaseCloud.available()) return MockCloud;
    return DH.FirebaseCloud;
  };

  const cloud = {
    provider: MockCloud,
    user: null,
    ready: null, authBusy: false, loginPending: false,
    /** off (signed out) | idle | syncing | error | outdated */
    state: 'off',
    error: null,
    busy: false, again: false, deferred: false,
    timer: null, lastUpload: 0, lastCheck: 0,

    init() {
      DH.events.on('save:changed', () => this.schedule());
      DH.events.on('app:pause', () => this.flush('pause'));
      DH.events.on('app:resume', () => this.check());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush('hide'); else this.check(); });
      window.addEventListener('online', () => { this.ensure().catch(() => {}); this.sync('online'); });
      this.provider = pickProvider();
      return this.ensure().catch((e) => console.warn('cloud init failed', e));
    },
    /** Start the provider once; if that failed (offline at launch), the next account action retries. */
    ensure() {
      if (!this.ready) this.ready = this.provider.init((u) => this.onUser(u)).catch((e) => { this.ready = null; throw e; });
      return this.ready;
    },
    onUser(u) {
      const prev = this.user;
      this.user = u;
      if (!u) this.state = 'off';
      else if (this.state === 'off') this.state = 'idle';
      this.emit();
      if (u && (!prev || prev.uid !== u.uid)) {
        if (this.authBusy) this.loginPending = true; // sync once the sign-in flow (e.g. sign in + link Google) is complete
        else this.sync('login');
      }
    },
    /** Run a sign-in step with the provider ready and the first sync held until it finishes. */
    async auth(fn) {
      try { await this.ensure(); } catch (e) { throw fail('network'); }
      this.authBusy = true;
      try { return await fn(); } finally {
        this.authBusy = false;
        if (this.loginPending) { this.loginPending = false; if (this.user) this.sync('login'); }
      }
    },
    emit() { DH.events.emit('cloud'); },
    linked(p) { return !!(this.user && this.user.providers.includes(p)); },

    /* ---------- sign-in flows (errors are thrown with a code for the UI) ---------- */
    signInGoogle() {
      return this.auth(async () => {
        try { await this.provider.signInGoogle(); return { ok: true }; } catch (e) {
          if (e.code === 'account-exists') return { needPassword: true, email: e.email, pending: e.pending };
          throw e;
        }
      });
    },
    signUpEmail(email, pw) {
      email = email.trim().toLowerCase(); checkCreds(email, pw);
      return this.auth(async () => {
        await this.provider.signUpEmail(email, pw);
        this.provider.sendVerification().catch(() => {});
      });
    },
    signInEmail(email, pw, pending) {
      email = email.trim().toLowerCase(); checkCreds(email);
      return this.auth(async () => {
        await this.provider.signInEmail(email, pw);
        if (pending) await this.provider.linkGoogle(pending);
      });
    },
    /** Add Google to an email account, so either sign-in opens the same progress. */
    async linkGoogle() {
      if (!this.user.emailVerified) throw fail('needs-verify'); // an unconfirmed address could be taken over by Google sign-in
      await this.provider.linkGoogle();
    },
    async resendVerification() { await this.provider.sendVerification(); },
    async refreshUser() { await this.provider.reload(); },
    resetPassword(email) { email = email.trim().toLowerCase(); checkCreds(email); return this.auth(() => this.provider.resetPassword(email)); },
    /** Sign out: progress is safe in the cloud, so this device goes back to a fresh profile. */
    async signOut() {
      await this.flush('signout');
      await this.provider.signOut();
      await DH.save.detach(true);
      location.reload();
    },
    /** Delete the account and its cloud save; progress on this device stays, unlinked. */
    async deleteAccount() {
      await this.provider.deleteAccount();
      await DH.save.detach(false);
      location.reload();
    },

    /* ---------- sync ---------- */
    /** Upload soon after a change: at most once a minute. */
    schedule() {
      if (!this.user || this.timer) return;
      const wait = Math.max(5000, 60000 - (Date.now() - this.lastUpload));
      this.timer = setTimeout(() => { this.timer = null; this.sync('auto'); }, wait);
    },
    /** Upload now (end of a run, purchase, app to background). */
    flush(reason) {
      if (!this.user) return Promise.resolve();
      clearTimeout(this.timer); this.timer = null;
      DH.save.persist(true);
      if (this.deferred || DH.save.meta.dirty || reason === 'run') return this.sync(reason);
      return Promise.resolve();
    },
    /** Look for progress made on another device (on resume, at most every 30 s). */
    check() { if (this.user && Date.now() - this.lastCheck > 30000) this.sync('resume'); },
    async sync(reason) {
      if (!this.user || this.state === 'outdated') return;
      if (this.busy) { this.again = true; return; }
      this.busy = true; this.state = 'syncing'; this.emit();
      try {
        await this.syncOnce(reason);
        this.state = 'idle'; this.error = null;
      } catch (e) {
        if (e.code === 'conflict') { this.again = true; this.state = 'idle'; } // the cloud moved on mid-upload: look again
        else if (e.code === 'outdated') this.state = 'outdated';
        else { this.state = 'error'; this.error = e.code || 'network'; console.warn('cloud sync failed', e); }
      }
      this.busy = false; this.emit();
      if (this.again) { this.again = false; this.sync('again'); }
    },
    async syncOnce() {
      const S = DH.save, meta = S.meta, uid = this.user.uid;
      S.persist(true);
      this.lastCheck = Date.now();
      if (S.newer) throw fail('outdated');
      const remote = await this.provider.getSave(uid);
      if (!this.user || this.user.uid !== uid) return; // signed out meanwhile
      if (remote && remote.v > S.VERSION) throw fail('outdated');
      if (!remote) return this.upload(0);
      const ours = meta.uid === uid; // this device's profile already belongs to this account
      if (ours && remote.rev === meta.rev) { if (meta.dirty) await this.upload(remote.rev); return; }
      // the cloud holds progress this device has not seen
      if (DH.game && DH.game.mode === 'run') { this.deferred = true; return; } // swap profiles only from the menu
      this.deferred = false;
      const localMatters = ours ? meta.dirty : !S.isFresh();
      if (localMatters && await this.askConflict(remote) === 'local') return this.upload(remote.rev);
      return this.apply(remote);
    },
    async upload(expectedRev) {
      const S = DH.save, uid = this.user.uid, json = JSON.stringify(S.data);
      const doc = { v: S.data.v, ts: Date.now(), device: DH.platform.deviceLabel(), summary: S.summary(), data: json };
      const rev = await this.provider.putSave(uid, doc, expectedRev);
      Object.assign(S.meta, { rev, uid, syncedAt: Date.now() });
      if (JSON.stringify(S.data) === json) S.meta.dirty = false; // nothing changed while uploading
      S.writeMeta();
      this.lastUpload = Date.now();
    },
    async apply(remote) {
      await DH.save.replace(JSON.parse(remote.data), remote.rev, this.user.uid);
      DH.ui.toast(t('cloud.loaded'), 'good');
      setTimeout(() => location.reload(), 600); // every screen rebuilds from the new profile
    },

    /** Both sides changed: show them side by side and let the player keep one. */
    askConflict(remote) {
      const local = { summary: DH.save.summary(), device: DH.platform.deviceLabel(), ts: Date.now(), here: true };
      return new Promise((resolve) => {
        const card = (p) => { const s = p.summary; return h('div.panel.cf-card',
          h('div.cf-title', t(p.here ? 'cloud.thisDevice' : 'cloud.inCloud')),
          h('div.small.muted', p.here ? p.device : (p.device || '') + ' · ' + new Date(p.ts).toLocaleString()),
          h('div.cf-stats',
            h('div', t('cloud.sumLevel', { n: s.level })), h('div', t('cloud.sumHeroes', { n: s.heroes })),
            h('div', t('cloud.sumRuns', { n: s.runs, w: s.wins })), h('div', t('cloud.sumTime', { t: U.fmtDuration((s.playTime || 0) * 1000) })),
            h('div', t('cloud.sumGold', { n: U.fmt(s.gold) })), h('div', t('cloud.sumGems', { n: U.fmt(s.gems) }))),
          h('button.btn.small.block.' + (p.here ? 'ghost' : 'gold'), { onclick: () => choose(p.here ? 'local' : 'cloud') }, t(p.here ? 'cloud.keepThis' : 'cloud.keepCloud'))); };
        const choose = async (pick) => {
          if (!await DH.ui.confirm({ title: t('cloud.conflictTitle'), body: t(pick === 'local' ? 'cloud.confirmLocal' : 'cloud.confirmCloud'), okCls: 'red' })) return;
          m.close(); resolve(pick);
        };
        const m = DH.ui.modal({ title: t('cloud.conflictTitle'), closable: false, body: h('div',
          h('div.small.center', { style: { marginBottom: '8px' } }, t('cloud.conflictDesc')),
          h('div.cf-grid', card(local), card(remote)),
          h('div.note', t('cloud.conflictNote'))) });
      });
    },
  };

  DH.cloud = cloud;
})(window.DH);
