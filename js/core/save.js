/* Persistent profile (versioned, with migrations), kept through DH.platform.storage:
 * localStorage in the browser, native Preferences in the app.
 * Cloud sync (js/services/cloud.js) mirrors the same blob per account; its bookkeeping
 * (revision, unsynced changes, account id) lives in a separate record, `meta`. */
(function (DH) {
  'use strict';
  const KEY = 'dreadhollow.save.v1';
  const META_KEY = 'dreadhollow.sync.v1';
  const SAVE_VERSION = 6;
  const store = () => DH.platform.storage;
  const newMeta = () => ({ rev: 0, dirty: false, uid: null, syncedAt: 0, device: Math.random().toString(36).slice(2, 10) });

  function defaults() {
    const now = Date.now();
    return {
      v: SAVE_VERSION,
      created: now,
      gold: 800, gems: 60,
      energy: 30, energyTs: now,
      accountLevel: 1, accountXp: 0,
      heroes: { knight: true }, selectedHero: 'knight',
      selectedStage: 'crypt', cleared: {}, bestTime: {},
      shrine: {},
      gear: [], equipped: { head: null, neck: null, chest: null, hands: null, feet: null, ring1: null, ring2: null, mark: null }, nextGearId: 1,
      loadouts: {}, archiveBy: {}, // per hero: equipped gear + Mark, and Archive shards
      discovered: {}, potions: {}, herbs: {}, wellkeeper: [], deeds: {}, artifacts: {}, agony: {},
      shards: 0, archive: {}, secrets: {}, mainQuest: 0, artifactsOwned: {},
      stats: { kills: 0, runs: 0, wins: 0, bossKills: 0, eliteKills: 0, goldEarned: 0, maxLevel: 0,
        itemsMerged: 0, chestsOpened: 0, loginDays: 0, adsWatched: 0, playTime: 0, gemsSpent: 0, bestSurvival: 0,
        championKills: 0, tomes: 0, wellSent: 0, brewed: 0, abDmg: {}, maxAgony: {}, oozes: 0, secrets: 0, shardsEarned: 0 },
      achievements: {},
      daily: null,
      login: { lastDay: null, index: 0 },
      pass: { season: 1, xp: 0, premium: false, free: {}, prem: {} },
      vigil: { ts: now },
      purchases: { noAds: false, once: {}, firstGems: {}, soulUntil: 0, soulLastDay: null, total: 0 },
      chestPity: 0, freeChestTs: 0,
      runsSinceAd: 0,
      settings: { music: 0.5, sfx: 0.8, vibration: true, lang: null, dmgNumbers: true, shake: true, lowFx: false, outlines: true, fxAlpha: 1, twinStick: false, mouseAim: false },
      tutorialDone: false,
      seen: {},
    };
  }

  function merge(def, obj) {
    // deep-fill missing keys from defaults (forward-compatible saves)
    for (const k in def) {
      if (obj[k] === undefined) obj[k] = def[k];
      else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k]) && obj[k] && typeof obj[k] === 'object') merge(def[k], obj[k]);
    }
    return obj;
  }

  const save = {
    VERSION: SAVE_VERSION,
    data: null,
    /** Sync bookkeeping: rev = cloud revision this profile is based on, dirty = changed since. */
    meta: newMeta(),
    /** True when the profile was written by a newer game version (never migrate it down). */
    newer: false,
    _json: null,
    async load() {
      let raw = null, rawMeta = null;
      try { [raw, rawMeta] = await Promise.all([store().get(KEY), store().get(META_KEY)]); } catch (e) { console.warn('storage read failed', e); }
      if (raw) {
        try { this.data = merge(defaults(), JSON.parse(raw)); } catch (e) { console.warn('Corrupt save, resetting', e); this.data = defaults(); }
      } else this.data = defaults();
      try { if (rawMeta) this.meta = Object.assign(newMeta(), JSON.parse(rawMeta)); } catch (e) { /* keep fresh meta */ }
      this.migrate();
      this._json = JSON.stringify(this.data);
      return this.data;
    },
    migrate() {
      const d = this.data;
      // A newer build wrote this profile: keep its version so its migrations never run twice.
      this.newer = d.v > SAVE_VERSION;
      if (this.newer) return;
      if (d.v < 2) {
        // v1 had 4 gear slots and 8 item types
        const map = { amulet_wrath: 'wrath_amulet', amulet_blood: 'crimson_chalice', ring_haste: 'oak_band', ring_greed: 'greed_signet',
          armor_plate: 'stalwart_cuirass', armor_shadow: 'stillhunter_garb', boots_strider: 'striders', boots_grave: 'grave_walkers' };
        d.gear = (d.gear || []).filter((g) => map[g.type]).map((g) => Object.assign(g, { type: map[g.type] }));
        const old = d.equipped || {};
        d.equipped = { head: null, neck: old.amulet || null, chest: old.armor || null, hands: null, feet: old.boots || null, ring1: old.ring || null, ring2: null, mark: null };
        d.gear.forEach((g) => { d.discovered[g.type] = true; });
        if (d.selectedStage && !['crypt', 'catacombs', 'abyss'].includes(d.selectedStage)) d.selectedStage = 'crypt';
        if (d.heroes && d.heroes.exorcist) { d.heroes.templar = true; delete d.heroes.exorcist; }
        if (d.selectedHero === 'exorcist') d.selectedHero = 'templar';
      }
      if (d.settings) { delete d.settings.gfx; delete d.settings.font; } // single graphics mode and font
      if (d.v < 4 && DH.economy && DH.economy.ARTIFACT_MIGRATE) { // v4: Artifacts drop from Lords; carry the old Altar set over
        const oldUnlock = { hourglass: 'd_stage_crypt_win', exchange: 'd_stage_abyss_win', bloodmoon: 'd_stage_aqueduct_win', ironhorde: 'd_boss_anguish', famine: 'd_stage_catacombs_win', frenzy: 'd_stage_discord_win', glasssoul: 'd_stage_blightmire_win' };
        d.artifactsOwned = d.artifactsOwned || {};
        for (const k in oldUnlock) if (d.deeds && d.deeds[oldUnlock[k]]) d.artifactsOwned[DH.economy.ARTIFACT_MIGRATE[k]] = Date.now();
        d.artifacts = {};
      }
      if (d.v < 5) { // v5: gear loadouts and the Archive are per hero
        d.loadouts = d.loadouts || {};
        const eq = Object.assign({}, d.equipped || {});
        for (const h in d.heroes || {}) if (d.heroes[h]) d.loadouts[h] = Object.assign({}, eq);
        // Archive shards come back to the pool so they can be assigned to each hero
        if (DH.economy && DH.economy.archiveCost) {
          let back = 0; for (const id in d.archive || {}) if (DH.economy.archive[id]) for (let l = 0; l < d.archive[id]; l++) back += DH.economy.archiveCost(id, l);
          d.shards = (d.shards || 0) + back; d.archiveRefund = back;
        }
        d.archive = {}; d.archiveBy = d.archiveBy || {};
      }
      if (d.v < 6 && DH.economy && DH.economy.archiveCost) { // v6: shards are a shared total every hero can assign in full
        let spent = 0; const by = d.archiveBy || {};
        for (const h in by) for (const id in by[h]) if (DH.economy.archive[id]) for (let l = 0; l < by[h][id]; l++) spent += DH.economy.archiveCost(id, l);
        d.shards = (d.shards || 0) + spent;
      }
      if (!Number.isFinite(d.energy)) { d.energy = 30; d.energyTs = Date.now(); } // repair saves hit by the old run-cost bug
      if (DH.content && !DH.content.heroes[d.selectedHero]) d.selectedHero = 'knight';
      if (DH.content && !DH.content.stages[d.selectedStage]) d.selectedStage = 'crypt';
      // the Starting Tome quests became gentler: whoever beat the old ones keeps the tome
      const ST = DH.content && DH.content.START_TOME_OLD; if (ST && d.deeds) for (const k in ST) if (d.deeds[ST[k]] && !d.deeds[k]) d.deeds[k] = d.deeds[ST[k]];
      d.v = SAVE_VERSION;
    },
    _t: null,
    persist(now) {
      if (now) { clearTimeout(this._t); this._t = null; this.write(); return; }
      if (this._t) return;
      this._t = setTimeout(() => { this._t = null; this.write(); }, 400);
    },
    write() {
      const json = JSON.stringify(this.data);
      if (json === this._json) return Promise.resolve();
      this._json = json;
      const done = store().set(KEY, json).catch((e) => console.warn('save failed', e));
      if (!this.meta.dirty) { this.meta.dirty = true; this.writeMeta(); }
      DH.events.emit('save:changed');
      return done;
    },
    writeMeta() { return store().set(META_KEY, JSON.stringify(this.meta)).catch((e) => console.warn('sync meta write failed', e)); },
    /** Wipe progress. When signed in, the fresh profile replaces the cloud one on the next sync. */
    reset() {
      this.data = defaults();
      return this.write();
    },
    /** Take a profile from the cloud account `uid`: purchases already owned on this device are kept. */
    async replace(obj, rev, uid) {
      const old = this.data;
      this.data = merge(defaults(), obj);
      this.migrate();
      if (old) this.keepEntitlements(old);
      const done = this.write();
      Object.assign(this.meta, { rev, uid, dirty: false, syncedAt: Date.now() });
      await Promise.all([done, this.writeMeta()]);
    },
    /** Forget the cloud account (sign-out / account deleted); `wipe` also starts a fresh profile. */
    async detach(wipe) {
      clearTimeout(this._t); this._t = null;
      this.meta = Object.assign(newMeta(), { device: this.meta.device });
      if (wipe) { this.data = defaults(); this._json = JSON.stringify(this.data); await store().set(KEY, this._json); }
      await this.writeMeta();
    },
    /** Paid unlocks survive whichever profile wins a conflict (currencies never merge: that would duplicate them). */
    keepEntitlements(from) {
      const a = this.data.purchases, b = from.purchases || {};
      if (b.noAds) a.noAds = true;
      Object.assign(a.once, b.once);
      if ((b.soulUntil || 0) > a.soulUntil) a.soulUntil = b.soulUntil;
      if (b.once && b.once.reaper) this.data.heroes.reaper = true;
      if (from.pass && from.pass.premium && from.pass.season === this.data.pass.season) this.data.pass.premium = true;
    },
    /** A profile nobody has played yet: signing in on it simply takes the cloud profile. */
    isFresh(d) { d = d || this.data; return !d.stats.runs && !d.purchases.total; },
    /** Compact facts shown side by side when two profiles conflict. */
    summary(d) {
      d = d || this.data;
      return { level: d.accountLevel, heroes: Object.keys(d.heroes || {}).filter((k) => d.heroes[k]).length,
        gold: d.gold, gems: d.gems, runs: d.stats.runs, wins: d.stats.wins, playTime: d.stats.playTime };
    },
    exportString() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); },
    importString(s) {
      const obj = JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
      this.data = merge(defaults(), obj); this.migrate(); return this.write();
    },
  };
  window.addEventListener('pagehide', () => save.persist(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) save.persist(true); });
  DH.events.on('app:pause', () => save.persist(true));
  DH.save = save;
})(window.DH);
