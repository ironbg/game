/* Main menu screens. */
(function (DH) {
  'use strict';
  const U = DH.util, h = U.h, E = DH.economy, C = DH.content, A = DH.art, ui = DH.ui, M = DH.meta;
  const S = () => DH.save.data;
  const click = () => DH.audio.play('click');
  const thumbs = {};

  function stageUnlocked(id) {
    const i = C.stageOrder.indexOf(id);
    return i === 0 || !!S().cleared[C.stageOrder[i - 1]];
  }
  ui.stageUnlocked = stageUnlocked;

  function sideBtn(icon, label, onclick, badge, extra) {
    return h('button.sidebtn' + (extra && extra.hot ? '.hot' : ''), { onclick: () => { click(); onclick(); } },
      h('div.ic', typeof icon === 'string' && icon.length > 2 ? A.img(icon) : h('span.sym', icon)),
      h('span.l', label),
      extra && extra.timer ? h('span.tm', extra.timer) : null,
      badge ? h('span.badge', badge) : null);
  }

  /* ================= HOME ================= */
  ui.screens.home = {
    render() {
      const s = S(), b = M.badges();
      if (!M.heroOwned(s.selectedHero)) s.selectedHero = 'knight';
      const root = h('div.home');
      const left = h('div.side.l'), right = h('div.side.r');
      left.append(sideBtn('n_calendar', t('home.login'), () => ui.openLogin(), b.login ? '!' : 0, { hot: b.login }));
      if (!s.purchases.once.starter) left.append(sideBtn('c_gold', t('home.offer'), () => ui.openStarter(), 0, { hot: true, timer: U.fmtDuration(U.msToMidnight()) }));
      left.append(sideBtn('n_ad', t('home.freeGems'), () => ui.go('shop', 'free')));
      right.append(sideBtn('u_cog', t('home.settings'), () => ui.openSettings()));
      right.append(sideBtn('n_pass', t('home.pass'), () => ui.go('quests', 'pass'), b.pass));
      right.append(sideBtn('n_book', t('home.deeds'), () => ui.go('quests', 'deeds')));
      if (DH.input.desktop && DH.input.fullscreenAvailable()) right.append(sideBtn(DH.input.isFullscreen() ? 'u_unfull' : 'u_full', t('settings.fullscreen'), () => { DH.input.toggleFullscreen(); setTimeout(() => ui.refresh(), 300); }));
      root.append(left, right);
      root.append(h('div.hero-stage',
        h('div.hero-name', t('hero.' + s.selectedHero + '.name')),
        h('div.power', { onclick: () => ui.go('armory') }, t('home.power'), h('b', U.fmt(M.powerScore())))));
      const vText = h('div.small.muted'), vGold = h('span.num.goldtxt');
      const vig = h('div.panel.vigil', { onclick: () => { click(); ui.openVigil(); } },
        A.img('c_wood'), h('div.grow', h('div', { style: { fontWeight: 800 } }, t('home.vigil')), vText), h('div.row', A.img('i_gold'), vGold));
      const updVigil = () => {
        const x = M.vigil();
        vText.textContent = x.full ? t('home.vigilFull') : t('home.vigilTime', { t: U.fmtDuration(x.ms), max: 12 });
        vText.className = x.full ? 'small full' : 'small muted';
        vGold.textContent = U.fmt(x.gold);
      };
      updVigil(); root.append(vig);
      const mq = M.mainQuest();
      if (mq) root.append(h('div.panel.mainq' + (mq.done ? '.done' : ''), { onclick: () => { click(); if (mq.done) { const g = M.claimMainQuest(); DH.audio.play('reward'); ui.toast(t('main.claimed', { n: g }), 'good'); ui.refresh(); } else ui.go('quests', 'deeds'); } },
        h('span.mqt', t('main.title', { n: mq.idx + 1 })), h('span.grow.mqd', ui.deedText(mq.deed)),
        mq.done ? h('button.btn.tiny.green', t('common.claim')) : h('span.row.mqr', A.img('i_gem'), mq.gems)));
      // stage card
      const sid = s.selectedStage, st = C.stages[sid], idx = C.stageOrder.indexOf(sid);
      if (!thumbs[sid]) thumbs[sid] = { url: A.stageArt(sid, 720, 300).toDataURL('image/jpeg', 0.9) }; // the hall's key art
      const unlocked = stageUnlocked(sid), cleared = !!s.cleared[sid];
      if (!cleared && s.agony[sid]) { s.agony[sid] = false; DH.save.persist(); } // Agony needs the hall's Lord beaten once
      const agonyOn = cleared && !!s.agony[sid];
      const dread = M.dreadRank();
      const card = h('div.panel.gold.stagecard.frame', { style: { marginTop: '8px' } },
        h('img.thumb.art', { src: thumbs[sid].url, alt: '' }),
        h('div.chips',
          cleared ? h('button.chip' + (agonyOn ? '.on' : ''), { onclick: (e) => { e.stopPropagation(); click(); s.agony[sid] = !s.agony[sid]; DH.save.persist(); ui.refresh(); } }, A.img('u_agony', 'ci'), t('hud.agony'), agonyOn ? A.img('u_check', 'ci') : null) : h('button.chip.off', { onclick: (e) => { e.stopPropagation(); click(); ui.toast(t('home.agonyLocked')); } }, A.img('u_lock', 'ci'), t('hud.agony')),
          M.altarUnlocked() && !st.lordKills && !st.vault ? h('button.chip' + (s.killMode ? '.on' : ''), { onclick: (e) => { e.stopPropagation(); click(); s.killMode = !s.killMode; DH.save.persist(); ui.toast(s.killMode ? t('home.killModeOn', { n: C.KILL_MODE }) : t('home.killModeOff')); ui.refresh(); } }, A.img('u_kill', 'ci'), t('home.killMode'), s.killMode ? A.img('u_check', 'ci') : null) : null,
          s.secrets[sid] ? h('span.chip.secret', A.img('u_secret', 'ci'), t('home.secret')) : null,
          dread ? h('button.chip.dread', { onclick: (e) => { e.stopPropagation(); ui.go('shrine', 'altar'); } }, A.img('a_mirror', 'ci'), t('dread.short', { n: dread })) : null),
        h('div.info',
          h('div.sname', (idx + 1) + '. ' + t('stage.' + sid + '.name')),
          h('div.srule', t('stage.' + sid + '.rule')), // every hall shows its character
          h('div.sdiff', t('stage.' + sid + '.desc') + ' · ' + t('home.best', { t: U.fmtTime(s.bestTime[sid] || 0) }) + (s.stats.maxAgony[sid] ? ' · ' + t('hud.agony') + ' ' + ['0', 'I', 'II', 'III', 'IV', 'V'][s.stats.maxAgony[sid]] : ''))),
        idx > 0 ? h('button.arrow.l', { onclick: () => { click(); s.selectedStage = C.stageOrder[idx - 1]; DH.save.persist(); ui.refresh(); } }, A.img('u_left', 'ci')) : null,
        idx < C.stageOrder.length - 1 ? h('button.arrow.r', { onclick: () => { click(); s.selectedStage = C.stageOrder[idx + 1]; DH.save.persist(); ui.refresh(); } }, A.img('u_right', 'ci')) : null,
        !unlocked ? h('div.lock', A.img('u_lock', 'bigic'), t('home.lockedStage', { name: t('stage.' + C.stageOrder[idx - 1] + '.name') })) : null);
      root.append(card);
      const en = M.energy();
      // the battle plaque: a medallion (crossed swords, or the Agony seal), the engraved title with the hall below, the torch cost in a socket
      root.append(h('div.bbwrap' + (agonyOn ? '.agony' : '') + (unlocked ? '' : '.off'),
        h('button.battlebtn', { onclick: () => { DH.game.startRun(); } },
          h('span.bb-face'),
          h('span.bb-medal', A.img(agonyOn ? 'u_agony' : 'n_battle')),
          h('span.bb-main', h('span.bb-title', t('home.battle')),
            h('span.bb-sub', t('stage.' + sid + '.name')),
            h('span.bb-tag' + (agonyOn ? '' : '.hide'), t('hud.agony'))), // its own line, always reserved: the text never shifts
          h('span.bb-cost', A.img('i_energy'), h('b', st.energy || C.RUN_ENERGY)))));
      root.append(h('div.center.small.muted', { style: { marginTop: '6px' } }, en < E.ENERGY_MAX ? t('home.energyNext', { t: U.fmtDuration(M.energyNextMs()) }) : t('home.energyFull')));
      ui.tick = updVigil;
      return root;
    },
  };

  /* ================= ARMORY ================= */
  ui.unlockText = (u) => {
    if (!u || u.free) return '';
    if (u.deed) return ui.deedText(DH.deeds.byId[u.deed]);
    return '';
  };
  ui.screens.armory = {
    render() {
      const tab = ui.sub.armory || 'heroes', b = M.badges();
      const root = h('div');
      root.append(h('h2.title', t('nav.armory')));
      root.append(h('div.tabs',
        h('button' + (tab === 'heroes' ? '.on' : ''), { onclick: () => { click(); ui.go('armory', 'heroes'); } }, t('armory.heroes')),
        h('button' + (tab === 'gear' ? '.on' : ''), { onclick: () => { click(); ui.go('armory', 'gear'); } }, t('armory.gear'), b.gear - b.well > 0 ? h('span.badge', b.gear - b.well) : null),
        h('button' + (tab === 'well' ? '.on' : ''), { onclick: () => { click(); ui.go('armory', 'well'); } }, t('armory.well'), b.well ? h('span.badge', b.well) : null)));
      root.append(tab === 'heroes' ? this.heroes() : tab === 'gear' ? this.gear() : this.well());
      return root;
    },
    heroes() {
      const s = S(), box = h('div');
      C.heroOrder.forEach((id) => {
        const hd = C.heroes[id], owned = M.heroOwned(id), sel = s.selectedHero === id;
        let action;
        if (sel) action = h('button.btn.small.ghost.off', t('armory.selected'));
        else if (owned) action = h('button.btn.small.gold', { onclick: (e) => { e.stopPropagation(); click(); s.heroes[id] = true; s.selectedHero = id; DH.save.persist(); ui.refresh(); } }, t('armory.select'));
        else {
          const u = hd.unlock;
          action = h('div.col', { style: { gap: '4px', alignItems: 'stretch' } },
            h('button.btn.small.gem', { onclick: (e) => {
              e.stopPropagation();
              if (M.unlockHero(id)) { DH.audio.play('buy'); s.selectedHero = id; DH.save.persist(); ui.rewardPopup(t('armory.unlocked'), [{ icon: 'h_' + id, text: t('hero.' + id + '.name') }]); }
              else { ui.toast(t('common.notEnough'), 'bad'); ui.go('shop', 'gems'); }
            } }, A.img('i_gem'), U.fmt(u.gems)),
            u.premium ? h('button.btn.tiny.red', { onclick: (e) => { e.stopPropagation(); ui.go('shop', 'offers'); } }, t('armory.bundle')) : null);
        }
        const aff = Object.entries(hd.affinity || {}).filter(([, v]) => v === 2).map(([k]) => t('trait.' + k)).join(', ');
        box.append(h('div.panel.hero-card' + (sel ? '.sel' : '') + (owned ? '' : '.locked'), { style: { marginBottom: '8px' }, onclick: () => { if (owned && !sel) { click(); s.heroes[id] = true; s.selectedHero = id; DH.save.persist(); ui.refresh(); } } },
          h('div.pic', A.img('h_' + id)),
          h('div.grow',
            h('div', { style: { fontWeight: 800, fontSize: '16px' } }, t('hero.' + id + '.name')),
            h('div.small.muted', t('hero.' + id + '.desc')),
            h('div.row', { style: { marginTop: '4px', gap: '4px' } }, A.img('ab_' + hd.weapon, 'wi'), h('span.small', t('ab.' + hd.weapon + '.name'))),
            aff ? h('div.small.good', t('armory.affinity', { list: aff })) : null,
            hd.perLevel ? h('div.small.goldtxt', t('armory.perLevel', { list: ui.fmtStats(Object.fromEntries(Object.entries(hd.perLevel).filter(([k]) => k !== 'taken')), 10) })) : null,
            h('div.small.muted', t('armory.hpSpeed', { hp: hd.hp, spd: hd.speed })),
            !owned && hd.unlock.deed ? h('div.small.goldtxt', A.img('u_unlock', 'ci'), ' ' + ui.unlockText(hd.unlock)) : null),
          action));
      });
      box.querySelectorAll('img.wi').forEach((i) => { i.style.width = '20px'; i.style.height = '20px'; });
      return box;
    },
    gear() {
      const s = S(), box = h('div');
      box.append(h('div.center', h('span.power', t('home.power'), h('b', U.fmt(M.powerScore())))));
      box.append(h('h3.sect.herosect', A.img('h_' + s.selectedHero), t('armory.equippedFor', { hero: t('hero.' + s.selectedHero + '.name') })));
      const eq = h('div.grid4'), eqp = M.eq();
      E.slots.forEach((slot) => {
        const g = M.gearById(eqp[slot]);
        eq.append(h('div', g ? gearSlot(g, true, () => ui.openSlotPicker(slot)) : h('div.slot.empty', { onclick: () => ui.openSlotPicker(slot) }, A.img('s_' + slot)), h('div.center.small.muted', t('slot.' + slot))));
      });
      const mk = eqp.mark;
      eq.append(h('div', h('div.slot.mark' + (mk ? '.rar4' : '.empty'), { onclick: () => ui.openMarks() }, A.img(mk ? 'm_' + mk : 'm_knight')), h('div.center.small.muted', t('slot.mark'))));
      box.append(eq);
      box.append(h('h3.sect', t('armory.inventory', { n: s.gear.length })));
      const canMerge = s.gear.some((g) => M.mergeCandidates(g.id).length >= 2);
      box.append(h('div.row', { style: { marginBottom: '8px' } },
        h('button.btn.small.blue.grow' + (canMerge ? '' : '.off'), { onclick: () => autoMerge() }, t('armory.autoMerge')),
        h('button.btn.small.gold.grow', { onclick: () => ui.go('shop', 'chests') }, A.img('c_gold'), t('armory.getGear'))));
      // filters by kind: all, helmets, amulets, armour, gloves, boots, rings
      const GF_ICON = { head: 'warden_helm', neck: 'wrath_amulet', chest: 'stalwart_cuirass', hands: 'stalker_grips', feet: 'striders', ring: 'oak_band' };
      const kindOf = (g) => E.gear[g.type].slot, FILTERS = ['all', 'head', 'neck', 'chest', 'hands', 'feet', 'ring'];
      const cur = FILTERS.includes(ui.sub.gearFilter) ? ui.sub.gearFilter : 'all';
      const count = (f) => f === 'all' ? s.gear.length : s.gear.filter((g) => kindOf(g) === f).length;
      box.append(h('div.gfilters', FILTERS.map((f) => h('button.gf' + (f === cur ? '.on' : '') + (count(f) ? '' : '.empty'), { onclick: () => { click(); ui.sub.gearFilter = f; ui.refresh(); }, 'aria-label': t('filter.' + f) },
        f === 'all' ? h('span.gf-all', '✦') : A.img('g_' + GF_ICON[f]), h('i', count(f))))));
      box.append(h('div.gf-name', t('filter.' + cur)));
      const inv = h('div.grid4');
      const list = s.gear.filter((g) => cur === 'all' || kindOf(g) === cur).sort((a, b) => b.rarity - a.rarity || b.level - a.level || a.type.localeCompare(b.type));
      list.forEach((g) => inv.append(gearSlot(g)));
      if (!list.length) box.append(h('div.panel.center.muted', s.gear.length ? t('armory.noSlotItems') : t('armory.noGear')));
      box.append(inv);
      box.append(h('div.note', t('armory.lootHint')));
      return box;
    },
    well() {
      const s = S(), box = h('div');
      box.append(h('div.panel.item', h('div.ico', A.img('well')), h('div.grow', h('div.t', t('well.keeper')), h('div.d', t('well.keeperDesc')))));
      if (!s.wellkeeper.length) { box.append(h('div.panel.center.muted', { style: { marginTop: '8px' } }, t('well.none'))); return box; }
      s.wellkeeper.forEach((it, i) => {
        box.append(h('div.panel.item',
          h('div', { style: { width: '52px', flex: 'none' } }, h('div.slot.rar' + it.rarity, A.img('g_' + it.type))),
          h('div.grow', h('div.t', t('gear.' + it.type)), h('div.rar' + it.rarity, h('span.rtxt', t('rarity.' + E.rarities[it.rarity]))), h('div.d', ui.fmtStats(E.gearStat(it.type, it.rarity, 1)))),
          h('div.col', { style: { gap: '4px' } },
            h('button.btn.small.gold' + (s.gold >= E.wellPrice(it.rarity) ? '' : '.off'), { onclick: () => { const g = M.wellClaim(i, false); if (g) { DH.audio.play('buy'); ui.rewardPopup(t('well.claimed'), [{ icon: 'g_' + g.type, text: t('gear.' + g.type), rarity: g.rarity }]); } else ui.toast(t('common.notEnough'), 'bad'); } }, A.img('i_gold'), U.fmt(E.wellPrice(it.rarity))),
            h('button.btn.tiny.gem', { onclick: () => { const g = M.wellClaim(i, true); if (g) { DH.audio.play('buy'); ui.rewardPopup(t('well.claimed'), [{ icon: 'g_' + g.type, text: t('gear.' + g.type), rarity: g.rarity }]); } else ui.toast(t('common.notEnough'), 'bad'); } }, A.img('i_gem'), E.wellGems(it.rarity)))));
      });
      return box;
    },
  };
  function gearSlot(g, hideEq, onTap) {
    const eq = M.isEquipped(g.id);
    return h('div.slot.rar' + g.rarity, { onclick: () => { click(); if (onTap) onTap(); else ui.openGear(g.id); } },
      A.img('g_' + g.type), h('span.lv', t('common.lv') + ' ' + g.level), eq && !hideEq ? h('span.eq', 'E') : null, g.isNew ? h('span.newdot') : null,
      !hideEq && M.mergeCandidates(g.id).length >= 2 ? h('span.mergeb', '▲') : null); // three alike: ready to merge
  }
  ui.gearSlot = gearSlot;
  function autoMerge() {
    const merged = []; let again = true;
    while (again) {
      again = false;
      for (const g of S().gear.slice().sort((a, b) => a.rarity - b.rarity)) if (M.gearById(g.id) && M.mergeCandidates(g.id).length >= 2) { M.merge(g.id); merged.push(g); again = true; break; }
    }
    if (merged.length) { DH.audio.play('chest'); ui.rewardPopup(t('armory.merged'), [...new Set(merged)].map((g) => ({ icon: 'g_' + g.type, text: t('gear.' + g.type), rarity: g.rarity }))); }
  }

  /* ================= SHRINE ================= */
  ui.screens.shrine = {
    render() {
      const tab = ui.sub.shrine || 'bless', root = h('div');
      root.append(h('h2.title', t('nav.shrine')));
      root.append(h('div.tabs',
        h('button' + (tab === 'bless' ? '.on' : ''), { onclick: () => { click(); ui.go('shrine', 'bless'); } }, t('shrine.bless')),
        h('button' + (tab === 'altar' ? '.on' : ''), { onclick: () => { click(); ui.go('shrine', 'altar'); } }, t('shrine.altar')),
        h('button' + (tab === 'brew' ? '.on' : ''), { onclick: () => { click(); ui.go('shrine', 'brew'); } }, t('shrine.brew')),
        h('button' + (tab === 'archive' ? '.on' : ''), { onclick: () => { click(); ui.go('shrine', 'archive'); } }, t('shrine.archive'), M.archiveAffordable() ? h('span.badge', '!') : null)));
      root.append(tab === 'bless' ? this.bless() : tab === 'altar' ? this.altar() : tab === 'archive' ? this.archive() : this.brew());
      return root;
    },
    bless() {
      const s = S(), root = h('div');
      root.append(h('div.center.small.muted', { style: { marginBottom: '8px' } }, t('shrine.desc')));
      const grid = h('div.shrine-grid');
      E.shrineOrder.forEach((id) => {
        const def = E.shrine[id], lvl = M.shrineLevel(id), max = lvl >= def.max, cost = max ? 0 : E.shrineCost(id, lvl), open = M.shrineUnlocked(id);
        const pips = h('div.pips'); for (let i = 0; i < def.max; i++) pips.append(h('i' + (i < lvl ? '.on' : '')));
        grid.append(h('div.panel.shrine' + (open ? '' : '.sealed'),
          A.img(def.icon.includes('_') ? def.icon : 'tr_' + ({ fistup: 'strength', heart: 'vitality', hide: 'thickhide', shield: 'parry', cross: 'metabolism', boot: 'swiftfeet', hourglass: 'quickhands', rings: 'reach', magnet: 'magnetism', target: 'precision' }[def.icon] || 'strength')),
          h('div.t', t('shrine.' + id)), pips,
          h('div.d', t('shrine.perLevel', { v: ui.fmtStats(def.per) }), h('br'), lvl ? h('span.good', t('shrine.total', { v: ui.fmtStats(def.per, lvl) })) : null),
          !open ? h('div.sealnote', A.img('u_lock'), ui.deedText(DH.deeds.byId[def.unlock]))
          : max ? h('button.btn.small.ghost.off.block', t('common.max'))
            : h('button.btn.small.gold.block' + (s.gold >= cost ? '' : '.off'), { onclick: () => { if (M.buyShrine(id)) DH.audio.play('buy'); else ui.toast(t('common.notEnough'), 'bad'); } }, A.img('i_gold'), U.fmt(cost))));
      });
      root.append(grid);
      return root;
    },
    altar() {
      const s = S(), root = h('div'), rank = M.dreadRank(), T = E.TORMENT;
      if (!M.altarUnlocked()) { root.append(h('div.panel.item', h('div.ico', { style: { filter: 'grayscale(1) brightness(0.55)' } }, A.img('a_mirror')), h('div.grow', h('div.t', t('shrine.altar')), h('div.d', t('altar.locked'))), A.img('u_lock', 'ci'))); return root; }
      const pct = (v) => Math.round(v * 100);
      root.append(h('div.panel.gold.item', h('div.ico', A.img('a_mirror')), h('div.grow',
        h('div.t', t('dread.rank', { n: rank }), ' ', h('span.small.muted', t('altar.count', { n: M.artifactsOwnedCount(), m: E.artifactOrder.length }))),
        h('div.d', t('altar.desc', { hp: pct(T.hp - 1), dmg: pct(T.dmg), spd: pct(T.speed), xp: pct(T.xp), g: pct(T.gold) })),
        h('div.small.goldtxt', { style: { marginTop: '4px' } }, t('altar.tiers', { c: C.LOOT_TIERS.champion, l: C.LOOT_TIERS.lord, a: C.LOOT_TIERS.all })))));
      const hint = (a) => a.deed ? ui.deedText(DH.deeds.byId[a.deed])
        : a.hall && !a.generic ? t('altar.hintHall', { hall: t('stage.' + a.hall + '.name') })
        : a.hall ? t('altar.hintHallAny', { hall: t('stage.' + a.hall + '.name') })
        : a.only ? t('altar.hintOnly', { hall: t('stage.' + a.only + '.name') })
        : a.hero ? t('altar.hintHero', { hero: t('hero.' + a.hero + '.name') }) : t('altar.hintGeneric');
      E.artifactOrder.forEach((k) => {
        const a = E.artifacts[k], un = M.artifactUnlocked(k), on = !!s.artifacts[k] && un;
        root.append(h('div.panel.item' + (on ? '.done' : '') + (un ? '' : '.locked'),
          h('div.ico', { style: un ? null : { filter: 'grayscale(1) brightness(0.55)' } }, A.img('a_' + k)),
          h('div.grow', h('div.t', un ? t('artifact.' + k + '.name') : '???'), h('div.d', un ? t('artifact.' + k + '.desc') : null),
            !un ? h('div.small.muted', hint(a)) : null),
          un ? h('div.switch' + (on ? '.on' : ''), { onclick: () => { click(); M.toggleArtifact(k); } }) : A.img('u_lock', 'ci')));
      });
      return root;
    },
    archive() {
      const s = S(), root = h('div');
      root.append(h('div.panel.item', h('div.ico', A.img('shard')), h('div.grow', h('div.t', t('archive.title')), h('div.d', t('archive.desc'))), h('div.shardcount', A.img('shard'), h('b', M.shardsFree()), h('span.small.muted', ' / ' + (s.shards || 0)))));
      if (s.archiveRefund) { root.append(h('div.panel.note.goldtxt', t('archive.refunded', { n: s.archiveRefund }))); s.archiveRefund = 0; DH.save.persist(); }
      // every hero keeps a separate Archive: pick whose shards you are assigning
      root.append(h('div.heropick', C.heroOrder.filter((id) => M.heroOwned(id)).map((id) => h('button.hp' + (id === s.selectedHero ? '.on' : ''), { onclick: () => { click(); s.selectedHero = id; DH.save.persist(); ui.refresh(); } }, A.img('h_' + id)))));
      const spent = M.archiveSpent();
      root.append(h('div.row.archhead', h('div.grow', h('b', t('hero.' + s.selectedHero + '.name')), h('span.small.muted', ' · ' + t('archive.spent', { n: spent }))),
        spent ? h('button.btn.small.ghost', { onclick: async () => { if (await ui.confirm({ title: t('archive.reset'), body: t('archive.resetBody', { n: spent }), ok: t('archive.reset') })) { M.resetArchive(); DH.audio.play('coin'); ui.refresh(); } } }, t('archive.reset')) : null));
      const grid = h('div.shrine-grid');
      E.archiveOrder.forEach((id) => {
        const def = E.archive[id], lvl = M.archiveLevel(id), max = lvl >= def.max, cost = max ? 0 : E.archiveCost(id, lvl);
        const pips = h('div.pips'); for (let i = 0; i < def.max; i++) pips.append(h('i' + (i < lvl ? '.on' : '')));
        const ic = def.icon.includes('_') ? def.icon : def.icon === 'orbs' ? 'tr_multistrike' : 'tr_' + ({ fistup: 'strength', heart: 'vitality', hide: 'thickhide', shield: 'parry', hourglass: 'quickhands', rings: 'reach', target: 'precision' }[def.icon] || 'strength');
        grid.append(h('div.panel.shrine.arch',
          A.img(ic), h('div.t', t('archive.' + id)), pips,
          h('div.d', t('shrine.perLevel', { v: ui.fmtStats(def.per) }), h('br'), lvl ? h('span.good', t('shrine.total', { v: ui.fmtStats(def.per, lvl) })) : null),
          max ? h('button.btn.small.ghost.off.block', t('common.max'))
            : h('button.btn.small.gem.block' + (M.shardsFree() >= cost ? '' : '.off'), { onclick: () => { if (M.buyArchive(id)) { DH.audio.play('buy'); ui.refresh(); } else ui.toast(t('archive.notEnough'), 'bad'); } }, A.img('shard'), cost)));
      });
      root.append(grid);
      root.append(h('div.center.small.muted', { style: { marginTop: '8px' } }, t('archive.how')));
      return root;
    },
    brew() {
      const s = S(), root = h('div');
      root.append(h('div.panel.item', h('div.ico', A.img('p_resonance')), h('div.grow', h('div.t', t('brew.title')), h('div.d', t('brew.desc', { n: E.POTION_USES_PER_RUN })))));
      root.append(h('div.row.herbs', E.herbs.map((k) => h('div.panel.herb', A.img('herb_' + k), h('b', s.herbs[k] || 0), h('span.small', t('herb.' + k))))));
      E.potionOrder.forEach((k) => {
        const p = E.potions[k], un = M.potionUnlocked(k);
        root.append(h('div.panel.item',
          h('div.ico', A.img('p_' + k), h('span.cnt', s.potions[k] || 0)),
          h('div.grow', h('div.t', t('potion.' + k + '.name')), h('div.d', t('potion.' + k + '.desc')),
            un ? h('div.rewards', Object.keys(p.recipe).map((hb) => ui.rw({ icon: 'herb_' + hb, text: p.recipe[hb] })), ui.rw({ icon: 'i_gold', text: U.fmt(p.gold) })) : h('div.small.muted', A.img('u_lock', 'ci'), ' ' + ui.deedText(DH.deeds.byId[p.unlock]))),
          un ? h('div.col', { style: { gap: '4px' } },
            h('button.btn.small.green' + (M.canBrew(k) ? '' : '.off'), { onclick: () => { if (M.brew(k)) { DH.audio.play('reward'); ui.toast(t('brew.done', { name: t('potion.' + k + '.name') }), 'good'); } } }, t('brew.brew')),
            h('button.btn.tiny.gem', { onclick: () => { if (M.buyPotion(k)) DH.audio.play('buy'); else ui.toast(t('common.notEnough'), 'bad'); } }, A.img('i_gem'), p.gems)) : null));
      });
      return root;
    },
  };

  /* ================= QUESTS ================= */
  ui.deedText = (d) => {
    if (!d) return '';
    const a = Object.assign({}, d.args || {});
    if (a.stage) a.stage = t('stage.' + a.stage + '.name');
    if (a.hero) a.hero = t('hero.' + a.hero + '.name');
    if (a.boss) a.boss = t('enemy.' + a.boss);
    if (a.ab) a.ab = t('ab.' + a.ab + '.name');
    if (a.a) a.a = ['0', 'I', 'II', 'III', 'IV', 'V'][a.a];
    if (a.tag) a.tag = t('dmgtag.' + a.tag);
    if (a.n) a.n = U.fmt(a.n);
    const c = d.cond;
    return t('deed.' + (c.type === 'stat' ? 'stat.' + c.stat : c.type === 'killsRun' && c.stage ? 'killsStage' : c.type), a);
  };
  ui.deedReward = (d) => {
    const out = [t('deeds.xp')];
    C.heroOrder.forEach((hid) => { if (C.heroes[hid].unlock.deed === d.id) out.push(t('deeds.unlockHero', { name: t('hero.' + hid + '.name') })); });
    for (const ab in C.lockedAbilities) if (C.lockedAbilities[ab] === d.id) out.push(t('deeds.unlockAbility', { name: t('ab.' + ab + '.name') }));
    E.shrineOrder.forEach((k) => { if (E.shrine[k].unlock === d.id) out.push(t('deeds.unlockBlessing', { name: t('shrine.' + k) })); });
    E.potionOrder.forEach((k) => { if (E.potions[k].unlock === d.id) out.push(t('deeds.unlockPotion', { name: t('potion.' + k + '.name') })); });
    E.artifactOrder.forEach((k) => { if (E.artifacts[k].deed === d.id) out.push(t('deeds.unlockArtifact', { name: t('artifact.' + k + '.name') })); });
    for (const st in C.START_TOME_DEED) if (C.START_TOME_DEED[st] === d.id) out.push(t('deeds.unlockStartTome', { stage: t('stage.' + st + '.name') }));
    if (d.id.startsWith('d_mark_')) out.push(t('deeds.unlockMark', { name: t('hero.' + d.args.hero + '.name') }));
    if (d.unlockTrait) out.push(t('deeds.unlockTrait', { name: t('at.' + C.abilities[d.unlockTrait.ab].traits[d.unlockTrait.idx].k) }));
    if (d.gold) out.push('+' + d.gold + ' ' + t('common.gold'));
    return out.join(' · ');
  };
  ui.screens.quests = {
    render() {
      const tab = ui.sub.quests || 'daily', b = M.badges();
      const root = h('div');
      root.append(h('div.tabs',
        h('button' + (tab === 'daily' ? '.on' : ''), { onclick: () => { click(); ui.go('quests', 'daily'); } }, t('quests.daily'), b.missions ? h('span.badge', b.missions) : null),
        h('button' + (tab === 'pass' ? '.on' : ''), { onclick: () => { click(); ui.go('quests', 'pass'); } }, t('quests.pass'), b.pass ? h('span.badge', b.pass) : null),
        h('button' + (tab === 'deeds' ? '.on' : ''), { onclick: () => { click(); ui.go('quests', 'deeds'); } }, t('quests.deeds')),
        h('button' + (tab === 'ach' ? '.on' : ''), { onclick: () => { click(); ui.go('quests', 'ach'); } }, t('quests.ach'), b.ach ? h('span.badge', b.ach) : null)));
      root.append(tab === 'daily' ? this.daily() : tab === 'pass' ? this.pass() : tab === 'deeds' ? this.deeds() : this.ach());
      return root;
    },
    deeds() {
      const cat = ui.sub.deedCat || 'stage', box = h('div');
      const all = DH.deeds.list, done = M.deedCount();
      box.append(h('div.panel.gold.item', h('div.ico', A.img('n_book')), h('div.grow', h('div.t', t('deeds.title', { n: done, max: all.length })), h('div.d', t('deeds.bonus', { v: Math.round(done * DH.deeds.XP_PER_DEED * 1000) / 10 })),
        h('div.prog', h('div.bar', h('i', { style: { width: (done / all.length * 100) + '%' } }))))));
      box.append(h('div.tabs.small', ['stage', 'hero', 'ability', 'general'].map((c) => {
        const n = all.filter((d) => d.cat === c).length, dn = all.filter((d) => d.cat === c && M.deedDone(d.id)).length;
        return h('button' + (cat === c ? '.on' : ''), { onclick: () => { click(); ui.sub.deedCat = c; ui.refresh(); } }, t('deeds.cat.' + c) + ' ' + dn + '/' + n);
      })));
      const pinned = DH.save.data.trackedDeed;
      const list = all.filter((d) => d.cat === cat).sort((a, b) => M.deedDone(a.id) - M.deedDone(b.id) || (b.id === pinned) - (a.id === pinned));
      box.append(h('div.small.muted.center', { style: { margin: '2px 0 6px' } }, A.img('u_pin', 'ci'), ' ' + t('deeds.pinHint')));
      list.slice(0, 80).forEach((d) => {
        const ok = M.deedDone(d.id), pr = M.deedProgress(d);
        box.append(h('div.panel.item.deed' + (ok ? '.claimed' : ''),
          h('div.ico', A.img(ok ? 'n_trophy' : d.cat === 'ability' ? 'ab_' + d.args.ab : d.cat === 'hero' ? 'h_' + d.args.hero : d.cat === 'stage' ? 'n_skull' : 'n_scroll')),
          h('div.grow', h('div.t', ui.deedText(d)), h('div.d.goldtxt', ui.deedReward(d)),
            pr && !ok ? h('div.prog', h('div.bar', h('i', { style: { width: Math.min(100, pr.v / pr.n * 100) + '%' } })), h('div.v', U.fmt(Math.min(pr.v, pr.n)) + ' / ' + U.fmt(pr.n))) : null),
          ok ? h('span.good', { style: { fontSize: '20px', fontWeight: 800 } }, A.img('u_check', 'bigic'))
            : h('button.pinbtn' + (d.id === pinned ? '.on' : ''), { title: t('deeds.pin'), onclick: (e) => { e.stopPropagation(); click(); const on = M.trackDeed(d.id); ui.toast(t(on ? 'deeds.pinned' : 'deeds.unpinned'), on ? 'good' : null); ui.refresh(); } }, A.img('u_pin'))));
      });
      if (list.length > 80) box.append(h('div.center.small.muted', '…'));
      return box;
    },
    daily() {
      const d = M.ensureDaily(), box = h('div');
      const timer = h('span.timer');
      const upd = () => { timer.textContent = t('quests.resetsIn', { t: U.fmtDuration(U.msToMidnight()) }); };
      upd(); ui.tick = upd;
      box.append(h('h3.sect', t('quests.dailyTitle'), timer));
      d.missions.forEach((m, i) => {
        const def = M.missionDef(m.id);
        const n = m.id === 'survive' ? U.fmtTime(def.target) : def.target;
        const pv = m.id === 'survive' ? U.fmtTime(m.p) + ' / ' + U.fmtTime(def.target) : U.fmt(m.p) + ' / ' + U.fmt(def.target);
        let btn;
        if (m.claimed) btn = h('button.btn.small.ghost.off', A.img('u_check', 'ci'));
        else if (m.done) btn = h('button.btn.small.green.shine', { onclick: () => { const r = M.claimMission(i); ui.rewardPopup(t('quests.complete'), r); } }, t('common.claim'));
        else btn = h('button.btn.small.ghost', { onclick: () => { click(); missionGo(m.id); } }, t('common.go'));
        box.append(h('div.panel.item' + (m.done && !m.claimed ? '.done' : '') + (m.claimed ? '.claimed' : ''),
          h('div.ico', A.img(missionIcon(m.id))),
          h('div.grow', h('div.t', t('mission.' + m.id, { n })), ui.rewardChips(def.reward),
            h('div.prog', h('div.bar.green', h('i', { style: { width: (m.p / def.target * 100) + '%' } })), h('div.v', pv))),
          btn));
      });
      const allDone = d.missions.every((m) => m.claimed);
      box.append(h('div.panel.gold.item', { style: { marginTop: '12px' } },
        h('div.ico', A.img('c_silver')),
        h('div.grow', h('div.t', t('quests.bonus')), h('div.d', t('quests.bonusDesc')), ui.rewardChips(E.missionBonus)),
        d.bonusClaimed ? h('button.btn.small.ghost.off', A.img('u_check', 'ci'))
          : h('button.btn.small.gold' + (allDone ? '.shine' : '.off'), { onclick: () => { const r = M.claimMissionBonus(); if (r) ui.rewardPopup(t('quests.bonus'), r); } }, t('common.claim'))));
      return box;
    },
    pass() {
      const s = S(), p = s.pass, tier = M.passTier(), box = h('div');
      const inTier = p.xp - tier * E.PASS_XP_PER_TIER;
      box.append(h('div.panel.gold.passhead',
        h('div.row',
          A.img('n_pass'),
          h('div.grow', h('div', { style: { fontFamily: 'var(--title)', color: 'var(--gold)', fontSize: '17px' } }, t('pass.season', { n: p.season })),
            h('div.small.muted', t('pass.tierOf', { n: tier, max: E.PASS_TIERS }))),
          p.premium ? h('span.small.good', { style: { fontWeight: 800 } }, t('pass.premiumOn'))
            : h('button.btn.small.gold.shine', { onclick: () => DH.iap.buy('pass') }, t('pass.unlock', { price: DH.iap.price('pass') }))),
        h('div.bar.blue', { style: { marginTop: '8px' } }, h('i', { style: { width: (tier >= E.PASS_TIERS ? 100 : inTier / E.PASS_XP_PER_TIER * 100) + '%' } })),
        h('div.row', { style: { marginTop: '6px' } },
          h('div.small.muted.grow', tier >= E.PASS_TIERS ? t('pass.maxed') : t('pass.xpToNext', { v: E.PASS_XP_PER_TIER - inTier })),
          tier < E.PASS_TIERS ? h('button.btn.tiny.gem', { onclick: () => { if (M.buyPassTier()) DH.audio.play('buy'); else ui.toast(t('common.notEnough'), 'bad'); } }, t('pass.buyTier'), A.img('i_gem'), E.PASS_TIER_GEM_COST) : null,
          M.badges().pass ? h('button.btn.tiny.green', { onclick: () => { const r = M.claimAllPass(); ui.rewardPopup(t('pass.rewards'), r); } }, t('pass.claimAll')) : null)));
      box.append(h('div.pass-row', { style: { marginTop: '10px' } }, h('div.center.small.muted', t('pass.free')), h('div'), h('div.center.small.goldtxt', { style: { fontWeight: 800 } }, t('pass.premium'))));
      for (let i = 1; i <= E.PASS_TIERS; i++) {
        const cell = (track) => {
          const rw = E.passRewards[track][i - 1], got = p[track][i], can = M.passClaimable(i, track);
          const pv = M.rewardPreview(rw)[0];
          return h('div.pass-cell' + (track === 'prem' ? '.prem' : '') + (got ? '.got' : '') + (can ? '.can' : ''), {
            onclick: () => {
              if (can) { const r = M.claimPass(i, track); ui.rewardPopup(t('pass.rewards'), r); }
              else if (track === 'prem' && !p.premium) DH.iap.buy('pass');
            } },
            h('div.slot' + (pv.rarity != null ? '.rar' + pv.rarity : ''), { style: { width: '38px', flex: 'none' } }, A.img(pv.icon)),
            h('span.v' + (ui.isWord(pv.text) ? '.word' : ''), pv.text),
            track === 'prem' && !p.premium ? h('span.lockic', A.img('u_lock', 'ci')) : null);
        };
        box.append(h('div.pass-row' + (i <= tier ? '.reached' : ''), cell('free'), h('div.tier', i), cell('prem')));
      }
      return box;
    },
    ach() {
      const box = h('div');
      E.achievements.forEach((a) => {
        const c = M.achClaimed(a.id), val = M.achValue(a), done = c >= a.tiers.length;
        const target = a.tiers[Math.min(c, a.tiers.length - 1)];
        const can = M.achClaimable(a);
        const stars = h('span', { style: { color: 'var(--gold)', letterSpacing: '1px' } }, a.tiers.map((x, i) => A.img(i < c ? 'u_star' : 'u_star0', 'ci')));
        box.append(h('div.panel.item' + (can ? '.done' : ''),
          h('div.ico', A.img('n_trophy')),
          h('div.grow',
            h('div.t', t('ach.' + a.id + '.name'), ' ', stars),
            h('div.d', t('ach.' + a.id + '.desc', { n: U.fmt(target) })),
            h('div.prog', h('div.bar', h('i', { style: { width: Math.min(100, val / target * 100) + '%' } })), h('div.v', U.fmt(Math.min(val, target)) + ' / ' + U.fmt(target)))),
          done ? h('button.btn.small.ghost.off', A.img('u_check', 'ci'))
            : h('button.btn.small.' + (can ? 'green.shine' : 'ghost.off'), { onclick: () => { const r = M.claimAch(a.id); if (r) ui.rewardPopup(t('ach.unlocked'), r); } }, A.img('i_gem'), a.gems[c])));
      });
      return box;
    },
    scrollTo() { },
  };
  function missionIcon(id) {
    return { kills: 'n_skull', kills2: 'n_skull', runs: 'n_battle', survive: 't_haste', level: 't_wisdom', boss: 'n_trophy', gold: 'i_gold', chest: 'c_wood', ads: 'n_ad', upgrade: 'n_shrine', elites: 't_might', tomes: 'tome', champions: 'c_red' }[id] || 'n_scroll';
  }
  function missionGo(id) {
    if (id === 'chest') ui.go('shop', 'chests');
    else if (id === 'ads') ui.go('shop', 'free');
    else if (id === 'upgrade') ui.go('shrine');
    else ui.go('home');
  }

  /* ================= SHOP ================= */
  ui.screens.shop = {
    render() {
      const s = S(), d = M.ensureDaily(), root = h('div');
      root.append(h('h2.title', t('nav.shop')));

      // ---- special offers
      root.append(h('h3.sect', { id: 'shop-offers' }, t('shop.offers')));
      if (!s.purchases.once.starter) root.append(offerCard('starter', 'offer', t('shop.starterDesc'), '-80%'));
      if (M.soulCardActive()) {
        const left = Math.ceil((s.purchases.soulUntil - Date.now()) / 86400e3);
        root.append(h('div.panel.offer.blue', { style: { marginTop: '8px' } },
          h('div.ot', t('product.soulcard')), h('div.small', t('shop.soulActive', { d: left })),
          h('div.contents', M.rewardPreview(E.products.soulcard.daily).map(ui.rw)),
          M.soulCardClaimable() ? h('button.btn.green.block.shine', { onclick: () => { const r = M.claimSoulCard(); ui.rewardPopup(t('product.soulcard'), r); } }, t('shop.claimDaily'))
            : h('button.btn.ghost.block.off', t('shop.claimedToday'))));
      } else root.append(offerCard('soulcard', 'offer blue', t('shop.soulDesc'), t('shop.value', { v: '600%' })));
      if (!s.heroes.reaper && !s.purchases.once.reaper) root.append(offerCard('reaper', 'offer red', t('shop.reaperDesc'), t('shop.hero')));
      if (!s.purchases.once.legend) root.append(offerCard('legend', 'offer', t('shop.legendDesc'), '-70%'));
      if (!s.purchases.noAds) root.append(offerCard('noads', 'offer blue', t('shop.noadsDesc'), null));

      // ---- daily deals
      const dealTimer = h('span.timer');
      root.append(h('h3.sect', t('shop.deals'), dealTimer));
      const deals = h('div.grid3');
      d.deals.forEach((deal, i) => {
        const def = E.dealPool[deal.i], pv = M.rewardPreview(def.grant)[0];
        let btn;
        if (deal.bought) btn = h('button.btn.small.ghost.off', t('shop.soldOut'));
        else if (def.cost.ad) btn = h('button.btn.small.ad', { onclick: async () => { const r = await M.buyDeal(i); if (r) ui.rewardPopup(t('shop.deals'), r); } }, h('span.adtag', 'AD'), t('common.free'));
        else btn = h('button.btn.small.' + (def.cost.gems ? 'gem' : 'gold'), { onclick: async () => { const r = await M.buyDeal(i); if (r) ui.rewardPopup(t('shop.deals'), r); else ui.toast(t('common.notEnough'), 'bad'); } },
          A.img(def.cost.gems ? 'i_gem' : 'i_gold'), U.fmt(def.cost.gems || def.cost.gold));
        deals.append(h('div.panel.chest', h('div.slot' + (pv.rarity != null ? '.rar' + pv.rarity : ''), { style: { width: '56px' } }, A.img(pv.icon)), h('div.small', { style: { fontWeight: 800 } }, pv.text), btn));
      });
      root.append(deals);

      // ---- chests
      root.append(h('h3.sect', { id: 'shop-chests' }, t('shop.chests')));
      const ch = h('div.grid3');
      const freeIn = M.freeChestReadyIn();
      const chestTimer = h('span');
      ch.append(h('div.panel.chest',
        A.img('c_wood'), h('div.t', t('chest.wood')),
        freeIn <= 0 ? h('button.btn.small.ad.shine', { onclick: async () => { const r = await M.freeChestAd(); if (r) chestResult(r); } }, h('span.adtag', 'AD'), t('common.free'))
          : h('button.btn.small.ghost.off', chestTimer),
        h('button.btn.small.gold', { onclick: () => buyChest('wood') }, A.img('i_gold'), U.fmt(E.chests.wood.price.gold))));
      ch.append(h('div.panel.chest',
        A.img('c_silver'), h('div.t', t('chest.silver')),
        h('div.small.muted', t('shop.epicChance', { v: 10 })),
        h('button.btn.small.gem', { onclick: () => buyChest('silver') }, A.img('i_gem'), E.chests.silver.price.gems)));
      ch.append(h('div.panel.chest.gold',
        A.img('c_gold'), h('div.t', t('chest.gold')),
        h('div.small.goldtxt', t('shop.pity', { n: M.pityLeft() })),
        h('button.btn.small.gem', { onclick: () => buyChest('gold') }, A.img('i_gem'), E.chests.gold.price.gems),
        h('button.btn.small.red', { onclick: () => buyChest('gold', true) }, 'x10 ', A.img('i_gem'), U.fmt(E.chests.gold.x10))));
      root.append(ch);
      root.append(h('div.center', { style: { marginTop: '6px' } }, h('button.btn.tiny.ghost', { onclick: () => ui.openRates() }, t('shop.rates'))));

      // ---- gems
      root.append(h('h3.sect', { id: 'shop-gems' }, t('shop.gems')));
      const gp = h('div.grid3');
      E.gemPackOrder.forEach((id) => {
        const p = E.products[id], first = !s.purchases.firstGems[id];
        gp.append(h('div.panel.pack', { onclick: () => DH.iap.buy(id) },
          first ? h('span.x2', t('shop.x2')) : null,
          p.tag ? h('span.tag', t('shop.tag.' + p.tag)) : null,
          h('div', { style: { position: 'relative' } }, A.img('i_gem')),
          h('div.amt', U.fmt(p.gems)),
          p.bonus ? h('div.bonus', t('shop.bonus', { v: p.bonus })) : h('div.bonus', ' '),
          h('button.btn.small.green', DH.iap.price(id))));
      });
      root.append(gp);

      // ---- gold
      root.append(h('h3.sect', { id: 'shop-gold' }, t('shop.gold')));
      const gg = h('div.grid3');
      E.goldPacks.forEach((p) => {
        gg.append(h('div.panel.pack', A.img('i_gold'), h('div.amt', U.fmt(p.gold)),
          h('button.btn.small.gem', { onclick: () => { if (M.spend({ gems: p.gems })) { const r = M.grant({ gold: p.gold }); ui.rewardPopup(t('shop.gold'), r); } else { ui.toast(t('common.notEnough'), 'bad'); } } }, A.img('i_gem'), p.gems)));
      });
      root.append(gg);

      // ---- free
      root.append(h('h3.sect', { id: 'shop-free' }, t('shop.free')));
      const gemsLeft = E.FREE_GEM_ADS - d.ads.gems, enLeft = E.ENERGY_AD_LIMIT - d.ads.energy;
      root.append(h('div.panel.item', h('div.ico', A.img('i_gem')),
        h('div.grow', h('div.t', t('shop.freeGems', { n: E.FREE_GEM_AMOUNT })), h('div.d', t('shop.leftToday', { n: gemsLeft }))),
        h('button.btn.small.ad' + (gemsLeft > 0 ? '.shine' : '.off'), { onclick: async () => { const r = await M.adGems(); if (r) ui.rewardPopup(t('shop.free'), r); } }, h('span.adtag', 'AD'), t('common.watch'))));
      root.append(h('div.panel.item', h('div.ico', A.img('i_energy')),
        h('div.grow', h('div.t', t('shop.freeEnergy', { n: E.ENERGY_AD_AMOUNT })), h('div.d', t('shop.leftToday', { n: enLeft }))),
        h('button.btn.small.ad' + (enLeft > 0 ? '' : '.off'), { onclick: async () => { const r = await M.adEnergy(); if (r) ui.rewardPopup(t('shop.free'), r); } }, h('span.adtag', 'AD'), t('common.watch'))));

      root.append(h('div.center', { style: { margin: '18px 0 6px' } }, h('button.btn.tiny.ghost', { onclick: () => DH.iap.restore() }, t('shop.restore'))));
      root.append(h('div.center.small', { style: { color: 'var(--dim)' } }, t('shop.testMode')));

      const upd = () => {
        dealTimer.textContent = t('quests.resetsIn', { t: U.fmtDuration(U.msToMidnight()) });
        const f = M.freeChestReadyIn(); chestTimer.textContent = f > 0 ? U.fmtDuration(f) : '';
      };
      upd(); ui.tick = upd;
      return root;
    },
    scrollTo(sub) {
      requestAnimationFrame(() => {
        const el = document.getElementById('shop-' + sub);
        if (el) ui.contentEl.scrollTop = el.offsetTop - 8;
      });
    },
  };
  function offerCard(id, cls, desc, ribbon) {
    const p = E.products[id];
    const contents = p.grant ? M.rewardPreview(p.grant) : [];
    if (id === 'soulcard') contents.push(...M.rewardPreview(p.daily).map((e) => ({ icon: e.icon, text: e.text + t('shop.perDay') })));
    return h('div.panel.' + cls.split(' ').join('.'), { style: { marginTop: '8px' } },
      h('div.ohead', h('div.ot', t('product.' + id)), ribbon ? h('div.ribbon', ribbon) : null), // the tag sits beside the title, never over the text
      h('div.small', desc),
      contents.length ? h('div.contents', contents.map(ui.rw)) : null,
      h('button.btn.gold.block.shine', { onclick: () => DH.iap.buy(id) }, DH.iap.price(id)));
  }
  function buyChest(type, x10) {
    const r = M.buyChest(type, x10);
    if (!r) { ui.toast(t('common.notEnough'), 'bad'); return; }
    chestResult(r);
  }
  function chestResult(items) {
    DH.audio.play('chest');
    ui.rewardPopup(t('shop.chestOpened'), items.map((g) => ({ icon: 'g_' + g.type, text: t('gear.' + g.type), rarity: g.rarity })));
  }
  ui.chestResult = chestResult;
})(window.DH);
