/* Boot + main loop + run lifecycle. */
(function (DH) {
  'use strict';
  const C = DH.content, E = DH.economy, ui = DH.ui, M = DH.meta;

  const game = {
    run: null, mode: 'menu',
    startRun() {
      const s = DH.save.data, st = C.stages[s.selectedStage];
      if (!ui.stageUnlocked(s.selectedStage)) { ui.toast(t('home.lockedShort'), 'bad'); return; }
      if (!M.useEnergy(st.energy || C.RUN_ENERGY)) { ui.toast(t('energy.notEnough'), 'bad'); ui.openEnergy(); return; }
      DH.audio.play('click');
      ui.closeAll(); ui.show(false);
      this.run = new DH.Run({ hero: s.selectedHero, stage: s.selectedStage, agony: !!(s.cleared[s.selectedStage] && s.agony[s.selectedStage]) });
      this.mode = 'run';
      ui.hud.build(this.run);
      DH.input.enable(true);
      DH.audio.music('battle'); DH.audio.ambience(s.selectedStage);
      setTimeout(() => ui.hud.banner(t('stage.' + s.selectedStage + '.name'), t('hud.survive', { t: DH.util.fmtTime(C.RUN_LENGTH) }), true), 300);
    },
    pause() {
      const r = this.run; if (!r || r.state !== 'playing') return;
      r.state = 'paused'; DH.input.enable(false); ui.openPause(r);
    },
    /** The bag / Character screen from the HUD: pauses the run while it is open. */
    openBag() {
      const r = this.run; if (!r || r.state !== 'playing') return;
      r.state = 'paused'; DH.input.enable(false); ui.openCharacter(r, { onClose: () => this.resume() });
    },
    resume() { const r = this.run; if (r && r.state === 'paused') { r.state = 'playing'; DH.input.enable(true); r.pump(); } },
    finishRun(run) {
      if (!run || run.finished) return;
      run.finished = true;
      if (run.state !== 'victory') run.state = 'over';
      DH.input.enable(false);
      const res = M.settleRun(run.summary());
      ui.openResults(run, res);
    },
    async toMenu(win) {
      ui.hud.hide();
      this.run = null; this.mode = 'menu';
      ui.show(true);
      DH.audio.music('menu'); DH.audio.ambience(DH.save.data.selectedStage);
      ui.flushLevelUps();
      const s = DH.save.data;
      if (s.runsSinceAd >= E.INTERSTITIAL_EVERY && !s.purchases.noAds) {
        s.runsSinceAd = 0; DH.save.persist();
        await DH.ads.interstitial('post_run');
      }
      DH.cloud.flush('run');
      // gentle upsell after a defeat, at most once a day
      const today = DH.util.dayKey();
      if (!win && !s.purchases.once.starter && s.stats.runs >= 2 && s.seen.starterDay !== today) {
        s.seen.starterDay = today; DH.save.persist();
        setTimeout(() => ui.openStarter(), 400);
      }
    },
  };
  DH.game = game;

  /* ---------------- events from the run ---------------- */
  DH.events.on('run:levelup', (run) => ui.openLevelUp(run));
  DH.events.on('run:tome', (d) => ui.openTome(game.run, d));
  DH.events.on('run:loot', (d) => ui.openLoot(game.run, d));
  DH.events.on('run:well', (run) => ui.openWell(run));
  DH.events.on('run:dead', (run) => ui.openRevive(run));
  DH.events.on('run:victory', (run) => game.finishRun(run));
  DH.events.on('run:boss', (b) => ui.hud.banner(b.name, b.sub ? b.sub : b.artifact ? t('hud.artifactSub') : b.hex ? t('hud.hexSub') : b.final ? t('hud.finalBoss') : t('hud.boss')));
  DH.events.on('run:warning', (txt) => ui.hud.banner(txt, null, true));
  DH.events.on('pauseKey', () => {
    if (game.mode !== 'run' || !game.run) return;
    if (game.run.state === 'playing') game.pause();
  });
  DH.events.on('missionDone', () => { if (game.mode === 'menu') ui.toast(t('quests.missionDone'), 'good'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
  DH.events.on('app:pause', () => game.pause());
  // Android back button: close the top window, pause a run, or leave the app from the home screen
  DH.events.on('app:back', () => {
    const top = ui.topModal();
    if (top) { if (top.closable) top.close(); return; }
    if (game.mode === 'run') { game.pause(); return; }
    if (ui.screen !== 'home') { ui.go('home'); return; }
    const App = DH.platform.plugin('App'); if (App) App.exitApp();
  });

  /* ---------------- loop ---------------- */
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    try {
      if (game.mode === 'run' && game.run) {
        const r = game.run;
        if (r.state === 'playing') { const n = dt > 1 / 40 ? 2 : 1; for (let i = 0; i < n; i++) r.update(dt / n); }
        r.render();
        ui.hud.update(r);
      } else DH.menuScene.render(dt);
    } catch (e) { console.error(e); }
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    const s = await DH.save.load();
    DH.i18n.set(s.settings.lang || DH.i18n.detect());
    DH.audio.setVolumes(s.settings.sfx, s.settings.music);
    DH.view.init(document.getElementById('game'));
    DH.input.attach(document.getElementById('game'));
    M.ensureDaily();
    M.energy();
    ui.init();
    document.documentElement.style.setProperty('--ic-check', 'url(' + DH.icons.url('u_check') + ')'); // CSS check marks use the pixel icon
    ui.show(true);
    DH.audio.music('menu'); DH.audio.ambience(s.selectedStage);
    const bootEl = document.getElementById('boot');
    bootEl.style.opacity = '0';
    setTimeout(() => bootEl.remove(), 650);
    requestAnimationFrame(frame);
    if (M.loginPending()) setTimeout(() => ui.openLogin(), 700);
    DH.cloud.init();
    // daily rollover while the app stays open
    let day = DH.util.dayKey();
    setInterval(() => { const d = DH.util.dayKey(); if (d !== day) { day = d; M.ensureDaily(); DH.events.emit('meta'); } }, 30000);
  }

  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  window.addEventListener('load', () => { fontsReady.then(boot).catch((e) => console.error('boot failed', e)); });
})(window.DH);
