/* Firebase provider for DH.cloud: Firebase Auth (Google, email + password) + Firestore (one save per account).
 * The SDK is vendored in js/vendor/firebase (ES modules, loaded on first use) so the game works offline and
 * without a CDN. In the Android app Google sign-in runs natively through @capacitor-firebase/authentication
 * (skipNativeAuth: the web SDK stays the single source of the signed-in user). */
(function (DH) {
  'use strict';

  const CONFIG = {
    apiKey: 'AIzaSyD-nAf06uPFKjLqD199MunLhD1HMA8dzsM',
    authDomain: 'dreadhollow-b49c7.firebaseapp.com',
    projectId: 'dreadhollow-b49c7',
    storageBucket: 'dreadhollow-b49c7.firebasestorage.app',
    messagingSenderId: '553225221148',
    appId: '1:553225221148:web:1aa3f0527e32c13fd95bd9',
  };
  /** Hosts where Firebase sign-in is allowed (Authentication → Settings → Authorized domains). */
  const HOSTS = ['dreadhollow-b49c7.web.app', 'dreadhollow-b49c7.firebaseapp.com', 'localhost', '127.0.0.1'];
  const SAVES = 'saves';
  const RECENT_MS = 5 * 60e3; // Firebase refuses to delete an account whose last sign-in is older than this

  const fail = (code, extra) => Object.assign(new Error(code), { code }, extra);
  const CODES = {
    'auth/email-already-in-use': 'email-in-use', 'auth/invalid-email': 'invalid-email', 'auth/weak-password': 'weak-password',
    'auth/missing-password': 'weak-password', 'auth/user-not-found': 'wrong-credentials', 'auth/wrong-password': 'wrong-credentials',
    'auth/invalid-credential': 'wrong-credentials', 'auth/invalid-login-credentials': 'wrong-credentials',
    'auth/credential-already-in-use': 'credential-in-use', 'auth/provider-already-linked': 'already-linked',
    'auth/popup-closed-by-user': 'cancelled', 'auth/cancelled-popup-request': 'cancelled', 'auth/user-cancelled': 'cancelled',
    'auth/popup-blocked': 'popup-blocked', 'auth/too-many-requests': 'too-many', 'auth/requires-recent-login': 'requires-login',
    'auth/network-request-failed': 'network', 'auth/unauthorized-domain': 'unavailable', 'auth/operation-not-allowed': 'unavailable',
    'auth/user-disabled': 'disabled', 'permission-denied': 'denied', unavailable: 'network',
  };
  /** Firebase error → the provider-neutral codes DH.cloud and its UI understand. */
  const wrap = (e) => {
    if (e && e.code && !String(e.code).includes('/') && !CODES[e.code]) return e; // already ours
    const code = (e && CODES[e.code]) || (/cancel/i.test(e && e.message) ? 'cancelled' : 'network');
    if (code === 'network' && e) console.warn('firebase', e.code, e.message);
    return fail(code);
  };

  let A = null, F = null, auth = null, db = null;
  const load = async () => {
    if (auth) return;
    const url = (f) => new URL('js/vendor/firebase/' + f + '.js', document.baseURI).href;
    const [app, a, f] = await Promise.all(['firebase-app', 'firebase-auth', 'firebase-firestore-lite'].map((m) => import(url(m))));
    A = a; F = f;
    const cfg = Object.assign({}, CONFIG);
    if (/\.(web\.app|firebaseapp\.com)$/.test(location.hostname)) cfg.authDomain = location.hostname; // same-site sign-in helper
    const fb = app.initializeApp(cfg);
    auth = A.initializeAuth(fb, {
      persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence],
      popupRedirectResolver: DH.platform.native ? undefined : A.browserPopupRedirectResolver,
    });
    db = F.getFirestore(fb);
  };

  const Native = () => DH.platform.plugin('FirebaseAuthentication');
  /** A Google credential: the native account picker in the app, a popup in the browser. */
  const googleCredential = async () => {
    const r = await Native().signInWithGoogle({ skipNativeAuth: true });
    const idToken = r && r.credential && r.credential.idToken;
    if (!idToken) throw fail('cancelled');
    return A.GoogleAuthProvider.credential(idToken);
  };
  const provider = () => { const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; };

  const FirebaseCloud = {
    name: 'firebase',
    /** Firebase needs an authorized host (or the app); anywhere else (file://, previews) the game keeps local saves only. */
    available() { return DH.platform.native || HOSTS.includes(location.hostname); },
    map(u) {
      if (!u) return null;
      return { uid: u.uid, email: u.email, emailVerified: u.emailVerified, name: u.displayName,
        providers: u.providerData.map((p) => (p.providerId === 'google.com' ? 'google' : p.providerId)) };
    },
    /** onAuthStateChanged skips links and reloads: report the user again after those. */
    notify() { this.cb(this.map(auth.currentUser)); },
    async init(cb) {
      this.cb = cb;
      await load();
      auth.languageCode = DH.i18n.current; // verification and reset emails in the player's language
      A.onAuthStateChanged(auth, (u) => cb(this.map(u)));
    },
    async signInGoogle() {
      await load();
      try {
        if (Native()) await A.signInWithCredential(auth, await googleCredential());
        else await A.signInWithPopup(auth, provider());
      } catch (e) {
        if (e.code === 'auth/account-exists-with-different-credential') {
          // the address already has an email + password account: sign in there once, then Google gets linked
          const email = (e.customData && e.customData.email) || '';
          throw fail('account-exists', { email, pending: A.GoogleAuthProvider.credentialFromError(e) });
        }
        throw wrap(e);
      }
    },
    async signUpEmail(email, pw) {
      auth.languageCode = DH.i18n.current;
      try { await A.createUserWithEmailAndPassword(auth, email, pw); } catch (e) { throw wrap(e); }
    },
    async signInEmail(email, pw) {
      try { await A.signInWithEmailAndPassword(auth, email, pw); } catch (e) { throw wrap(e); }
    },
    async linkGoogle(pending) {
      const u = auth.currentUser; if (!u) throw fail('requires-login');
      try {
        if (pending) await A.linkWithCredential(u, pending);
        else if (Native()) await A.linkWithCredential(u, await googleCredential());
        else await A.linkWithPopup(u, provider());
      } catch (e) { throw wrap(e); }
      this.notify();
    },
    async sendVerification() {
      auth.languageCode = DH.i18n.current;
      try { await A.sendEmailVerification(auth.currentUser); } catch (e) { throw wrap(e); }
    },
    async reload() {
      if (!auth.currentUser) return;
      try { await A.reload(auth.currentUser); } catch (e) { throw wrap(e); }
      this.notify();
    },
    async resetPassword(email) {
      auth.languageCode = DH.i18n.current;
      try { await A.sendPasswordResetEmail(auth, email); } catch (e) {
        if (e.code !== 'auth/user-not-found') throw wrap(e); // never reveal whether an address has an account
      }
    },
    async signOut() {
      if (Native()) Native().signOut().catch(() => {});
      await A.signOut(auth);
    },
    async deleteAccount() {
      const u = auth.currentUser; if (!u) return;
      // check first, so the cloud save is never deleted while the account itself survives
      if (Date.now() - Date.parse(u.metadata.lastSignInTime) > RECENT_MS) throw fail('requires-login');
      try {
        await F.deleteDoc(F.doc(db, SAVES, u.uid));
        await A.deleteUser(u);
      } catch (e) { throw wrap(e); }
      if (Native()) Native().signOut().catch(() => {});
    },
    async getSave(uid) {
      try {
        const snap = await F.getDoc(F.doc(db, SAVES, uid));
        return snap.exists() ? snap.data() : null;
      } catch (e) { throw wrap(e); }
    },
    /** Write only if the cloud is still at expectedRev (a transaction, so two devices can never overwrite each other). */
    async putSave(uid, doc, expectedRev) {
      const ref = F.doc(db, SAVES, uid);
      try {
        return await F.runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          const cur = snap.exists() ? snap.data().rev : 0;
          if (cur !== expectedRev) throw fail('conflict');
          tx.set(ref, Object.assign({}, doc, { rev: expectedRev + 1, updated: F.serverTimestamp() }));
          return expectedRev + 1;
        });
      } catch (e) { throw e.code === 'conflict' ? e : wrap(e); }
    },
  };

  DH.FirebaseCloud = FirebaseCloud;
})(window.DH);
