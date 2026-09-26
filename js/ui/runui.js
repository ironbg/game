/* In-run UI: HUD, level-up (traits + potions), tomes, loot, the Well, pause, revive, results. */
(function (DH) {
  'use strict';
  const U = DH.util, h = U.h, E = DH.economy, C = DH.content, A = DH.art, ui = DH.ui;
  const click = () => DH.audio.play('click');

  /* ---------------- descriptions ---------------- */
  ui.fmtMods = (m, k) => Object.keys(m).map((key) => {
    const v = m[key] * (k == null ? 1 : k);
    if (['orbit', 'stream', 'chainRift', 'fork', 'purge', 'pulse'].includes(key)) return t('mod.' + key);
    const pct = ['dmgPct', 'as', 'area', 'duration', 'speed', 'ms', 'burn', 'spark', 'frost', 'decay', 'fragile', 'affliction', 'crit', 'blockDmg', 'stun'].includes(key);
    return t('mod.' + key, { v: pct ? Math.round(v * 100) : Math.round(v * 10) / 10 }).replace('+-', '−'); // trade-offs read '−25% …'
  }).join(' · ');
  const ARROW = ['↗', '↑', '⇈'];
  ui.choiceInfo = (run, c) => {
    if (c.kind === 'base') {
      const af = (run.hero.affinity || {})[c.id]; const a = af == null ? 1 : af;
      return { icon: 'tr_' + c.id, name: t('trait.' + c.id), desc: ui.fmtStats(C.baseTraits[c.id].per, C.AFFINITY[a]), tag: t('lv.base') + ' ' + ARROW[a], tcls: 'aff' + a };
    }
    if (c.kind === 'elev') return { icon: 'tr_' + c.id, name: t('trait.' + c.id), desc: ui.fmtStats(C.elevatedTraits[c.id].per), tag: t('lv.elevated'), tcls: 'elev' };
    if (c.kind === 'cls') {
      const ct = C.heroes[c.hero].ct[c.cat][c.v], sis = C.heroes[c.hero].ct[c.cat][1 - c.v];
      const parts = []; if (Object.keys(ct.w).length) parts.push(ui.fmtMods(ct.w)); if (Object.keys(ct.s).length) parts.push(ui.fmtStats(ct.s));
      return { icon: c.hero === run.heroId ? 'h_' + c.hero : 'm_' + c.hero, name: t('ct.' + ct.k), desc: parts.join(' · '),
        tag: t('lv.class.' + c.cat) + (c.hero !== run.heroId ? ' · ' + t('lv.mark', { hero: t('hero.' + c.hero + '.name') }) : ''), tcls: 'cls',
        note: c.rank === 1 && !c.sister ? t('lv.sister', { name: t('ct.' + sis.k) }) : null };
    }
    if (c.kind === 'ab') {
      const T = C.abilities[c.ab].traits[c.idx];
      return { icon: 'ab_' + c.ab, name: t('ab.' + c.ab + '.name') + ': ' + t('at.' + T.k), desc: ui.fmtMods(T.m), tag: t('lv.ability'), tcls: 'abt' };
    }
    if (c.kind === 'up') return { icon: 'ab_' + c.ab, name: t('ab.' + c.ab + '.name') + ': ' + t('up.' + c.id), desc: ui.fmtMods(C.UPGRADES[c.id]), tag: t('lv.upgrade', { n: ['', 'III', 'VI', 'IX'][c.tier] }), tcls: 'upg' };
    if (c.kind === 'ability') { const d = C.abilities[c.id]; return { icon: 'ab_' + c.id, name: t('ab.' + c.id + '.name'), desc: t('ab.' + c.id + '.desc'), tag: d.tags.map((x) => t('tag.' + x)).join(' · '), tcls: 'abt' }; }
    if (c.kind === 'edge') return { icon: 'a_edge', name: t('stat.' + c.stat), desc: ui.fmtStats({ [c.stat]: c.v }), tag: t('artifact.edge.name'), tcls: 'upg' };
    if (c.kind === 'gold') return { icon: 'i_gold', name: t('levelup.gold'), desc: '+' + c.amount };
    return { icon: 'heart', name: t('levelup.heal'), desc: t('levelup.healDesc') };
  };

  /* ---------------- HUD ---------------- */
  const hud = { refs: null, sig: '' };
  hud.build = (run) => {
    const el = document.getElementById('hud');
    el.innerHTML = '';
    const r = hud.refs = {}, desk = DH.input.desktop;
    r.xpFill = h('i'); r.lvl = h('span');
    r.timer = h('div.timer'); r.kills = h('span'); r.gold = h('span');
    r.build = h('div.build'); r.buffs = h('div.buffs'); r.curse = h('div.cursed.hidden', A.img('u_agony', 'ci'), r.curseT = h('b'));
    r.boss = h('div.bossbar.hidden', r.bossName = h('div.n'), h('div.bar', r.bossFill = h('i')));
    r.agony = run.agonyOn ? h('div.agony', h('span.al', t('hud.agony')), r.agFill = h('div.agbar', h('i')), r.agNum = h('b')) : null;
    el.append(...[h('div.xp', r.xpFill, r.lvl),
      h('div.top', h('div.hbtns',
        h('button.pause', { onclick: () => DH.game.pause(), title: t('pause.title') + (desk ? ' [P]' : '') }, A.img('u_pause'), desk ? h('b.key', 'P') : null),
        h('button.pause.bagbtn', { onclick: () => DH.game.openBag(), title: t('inv.title') + (desk ? ' [I]' : '') }, A.img('u_bag'), r.bagN = h('i'), desk ? h('b.key', 'I') : null),
        desk && DH.input.fullscreenAvailable() ? r.fsBtn = h('button.pause.fsbtn', { onclick: () => { DH.input.toggleFullscreen(); }, title: t('settings.fullscreen') + ' [F]' }, A.img(DH.input.isFullscreen() ? 'u_unfull' : 'u_full'), h('b.key', 'F')) : null), r.timer,
        h('div.stats', h('div', r.kills, A.img('n_skull')), h('div', r.gold, A.img('i_gold')))),
      r.build, r.buffs, r.curse, r.boss, r.agony, r.track = hud.tracker(run), r.lordK = run.lordKills ? h('div.lordk', A.img('u_agony', 'ci'), r.lordKT = h('span')) : null].filter(Boolean)); // append() would print a null as text
    if (!DH.save.data.tutorialDone) { r.tut = h('div.tutorial', h('div', h('span.hand', A.img('u_hand', 'bigic')), t('tutorial.move'), h('br'), h('span.small.muted', t('tutorial.auto')))); el.append(r.tut); }
    hud.sig = ''; el.classList.remove('hidden');
  };
  /** The pinned quest (chosen in Deeds): its text and live progress under the kill and gold counters. */
  hud.tracker = (run) => {
    const d = DH.meta.trackedDeed(); if (!d) return null;
    const r = hud.refs;
    r.trD = d; r.trV = h('b'); r.trFill = h('i');
    return h('div.tracker', h('div.trh', A.img('u_pin', 'ci'), t('hud.quest')), h('div.trt', ui.deedText(d)), h('div.trp', h('div.trbar', r.trFill), r.trV));
  };
  const trackUpdate = (run) => {
    const r = hud.refs; if (!r.track) return;
    const p = DH.meta.deedLive(r.trD, run), done = p.here && p.v >= p.n;
    const f = (v) => p.time ? U.fmtTime(Math.min(v, p.n)) : p.n === 1 ? String(Math.min(v, 1)) : U.fmt(Math.min(Math.floor(v), p.n));
    r.trV.textContent = p.here ? f(p.v) + '/' + f(p.n) : t('hud.questElsewhere');
    r.trFill.style.width = (p.here ? Math.min(100, p.v / p.n * 100) : 0) + '%';
    r.track.classList.toggle('off', !p.here); r.track.classList.toggle('done', done);
  };
  const bq = []; let bBusy = false;
  function nextBanner() {
    if (bBusy || !bq.length) return;
    const b = bq.shift(); bBusy = true;
    const el = h('div.banner' + (b.warn ? '.warn' : ''), b.sub ? h('small', b.sub) : null, b.text);
    document.getElementById('hud').appendChild(el);
    setTimeout(() => { el.remove(); bBusy = false; nextBanner(); }, b.warn ? 2200 : 3000);
  }
  hud.banner = (text, sub, warn) => { if (!warn) bq.unshift({ text, sub, warn }); else bq.push({ text, sub, warn }); if (bq.length > 3) bq.length = 3; nextBanner(); };
  hud.hide = () => { const el = document.getElementById('hud'); el.classList.add('hidden'); el.innerHTML = ''; bq.length = 0; };
  let lastTxt = 0;
  hud.update = (run) => {
    const r = hud.refs; if (!r) return;
    r.xpFill.style.width = Math.min(100, run.xp / run.xpNext * 100) + '%';
    const now = performance.now(); if (now - lastTxt < 120) return; lastTxt = now;
    r.lvl.textContent = t('common.lv') + ' ' + run.level;
    r.timer.textContent = U.fmtTime(run.time); r.timer.classList.toggle('boss', run.time >= run.runLength);
    r.kills.textContent = U.fmt(run.kills); r.gold.textContent = U.fmt(run.gold);
    r.bagN.textContent = run.bag.length ? run.bag.length + '/' + C.BAG_SIZE : ''; r.bagN.classList.toggle('full', run.bag.length >= C.BAG_SIZE);
    if (r.lordK) { r.lordKT.textContent = run.lordUp ? '' : t('hud.lordKills', { n: U.fmt(Math.min(run.kills, run.lordKills)), m: U.fmt(run.lordKills) }); r.lordK.classList.toggle('hidden', !!run.lordUp); }
    const sig = run.abilities.map((a) => a.id + JSON.stringify(run.traits.ab[a.id] || {})).join() + '|' + run.level;
    if (sig !== hud.sig) {
      hud.sig = sig; r.build.innerHTML = '';
      r.build.append(h('div.r', run.abilities.map((a) => { const n = Object.values(run.traits.ab[a.id] || {}).reduce((x, y) => x + y, 0); return h('div.b', A.img('ab_' + a.id), n ? h('i', n) : null); })));
    }
    const bs = Object.keys(run.buffs).filter((k) => run.buffs[k] > 0).map((k) => k + Math.ceil(run.buffs[k])).join();
    if (bs !== r.bsig) { r.bsig = bs; r.buffs.innerHTML = ''; Object.keys(run.buffs).forEach((k) => { if (run.buffs[k] > 0) r.buffs.append(h('div.bf.' + k, A.img('rune_' + k), h('b', Math.ceil(run.buffs[k])))); }); }
    r.curse.classList.toggle('hidden', !(run.curse > 0)); if (run.curse > 0) r.curseT.textContent = t('hud.curse', { n: Math.ceil(run.curse) });
    const b = run.bosses[0];
    r.boss.classList.toggle('hidden', !b);
    if (b) { r.bossName.textContent = t('enemy.' + b.id) + (b.enr > 1.01 ? ' · ' + t('hud.enraged') : ''); r.bossFill.style.width = Math.max(0, b.hp / b.maxHp * 100) + '%'; }
    if (r.agony) { r.agFill.firstChild.style.width = (run.agony / C.AGONY_MAX * 100) + '%'; r.agNum.textContent = ['0', 'I', 'II', 'III', 'IV', 'V'][Math.floor(run.agony + 1e-6)]; }
    if (r.track && now - (r.trT || 0) > 400) { r.trT = now; trackUpdate(run); }
    if (r.fsBtn) { const fs = DH.input.isFullscreen(); if (fs !== r.fsOn) { r.fsOn = fs; r.fsBtn.firstChild.replaceWith(A.img(fs ? 'u_unfull' : 'u_full')); } }
    if (r.tut && (run.time > 6 || (run.player.moving && run.time > 1.5))) { r.tut.remove(); r.tut = null; DH.save.data.tutorialDone = true; DH.save.persist(); }
  };
  ui.hud = hud;

  function buildRow(run) {
    const row = h('div.buildrow');
    for (let i = 0; i <= C.MAX_ABILITIES; i++) {
      const a = run.abilities[i];
      if (!a) { row.append(h('div.b.empty')); continue; }
      const n = Object.values(run.traits.ab[a.id] || {}).reduce((x, y) => x + y, 0);
      row.append(h('div.b', A.img('ab_' + a.id), n ? h('i', n) : null));
    }
    return row;
  }
  function traitRow(run) {
    const row = h('div.buildrow.traits');
    for (const id in run.traits.base) row.append(h('div.b', A.img('tr_' + id), h('i', run.traits.base[id])));
    for (const id in run.traits.elev) row.append(h('div.b.elev', A.img('tr_' + id), h('i', run.traits.elev[id])));
    for (const k in run.traits.cls) { const c = run.traits.cls[k]; row.append(h('div.b.cls', A.img(c.hero === run.heroId ? 'h_' + c.hero : 'm_' + c.hero), h('i', c.rank))); }
    return row.childNodes.length ? row : null;
  }

  /* ---------------- Level up ---------------- */
  ui.openLevelUp = (run) => {
    DH.input.enable(false);
    let mode = null; // potion mode: remembrance | resonance | lethe
    const m = ui.modal({ closable: false, cls: 'levelup', body: () => h('div') });
    const draw = () => {
      const isClass = C.CLASS_LEVELS.includes(run.levelFor);
      const cards = run.choices.map((c, i) => {
        const info = ui.choiceInfo(run, c);
        const rank = c.rank ? (c.rank === 1 ? h('span.new', t('levelup.new')) : h('span.lv', t('lv.rank', { n: c.rank }))) : null;
        return h('div.choice.' + (info.tcls || 'x') + (c.remembered ? '.remembered' : '') + (mode ? '.targeting' : ''), { style: { animationDelay: (i * 0.05) + 's' }, onclick: () => {
          click();
          if (mode) {
            if (mode === 'resonance') { run.potions.resonance--; run.potionsUsed.resonance = (run.potionsUsed.resonance || 0) + 1; m.close(); run.choose(c, true); DH.audio.play('levelup'); if (run.state === 'playing') DH.input.enable(true); return; }
            run.usePotion(mode, c); mode = null; draw(); return;
          }
          m.close(); run.choose(c);
          if (run.state === 'playing') DH.input.enable(true);
        } },
          h('div.ico', A.img(info.icon)),
          h('div.grow', h('div.tg', info.tag || ''), h('div.t', info.name, rank), h('div.d', info.desc), info.note ? h('div.note2', info.note) : null, c.remembered ? h('div.note2.mem', t('potion.remembered')) : null));
      });
      const pot = (k) => {
        const n = run.potions[k] || 0;
        return h('button.potbtn' + (mode === k ? '.on' : '') + (n ? '' : '.off'), { onclick: () => { click(); mode = mode === k ? null : k; draw(); } }, A.img('p_' + k), h('span', n));
      };
      const hasPot = E.potionOrder.some((k) => (run.potions[k] || 0) > 0);
      const rerollBtn = run.rerolls > 0
        ? h('button.btn.small.blue', { onclick: () => { click(); run.reroll(); draw(); } }, A.img('i_reroll'), t('levelup.reroll', { n: run.rerolls }))
        : !run.usedAdReroll ? h('button.btn.small.ad', { onclick: async () => { if (await DH.ads.rewarded('reroll')) { run.usedAdReroll = true; run.reroll(true); draw(); } } }, h('span.adtag', 'AD'), t('levelup.rerollAd')) : null;
      m.set(h('div',
        h('div.lvl-title', isClass ? t('levelup.classTitle') : run.choices.some((c) => c.kind === 'up') ? t('levelup.upTitle') : t('levelup.title')),
        h('div.center.small.muted', t('levelup.sub', { n: run.levelFor })),
        buildRow(run),
        mode ? h('div.center.potionhint', t('potion.hint.' + mode)) : null,
        h('div', { style: { marginTop: '8px' } }, cards),
        h('div.row.lvfoot', hasPot ? h('div.row.pots', E.potionOrder.map(pot)) : h('span'), h('span.grow'), rerollBtn)));
    };
    draw();
  };

  /* ---------------- Arcane Tome ---------------- */
  ui.openTome = (run, data) => {
    DH.input.enable(false);
    const m = ui.modal({ closable: false, cls: 'levelup', body: h('div',
      h('div.lvl-title', data.mastery ? t('tome.mastery') : t('tome.title')),
      h('div.center.small.muted', data.traitsOnly ? t('tome.full') : data.mastery ? t('tome.masterySub') : t('tome.sub')),
      h('div', { style: { marginTop: '8px' } }, data.choices.map((c, i) => {
        const info = ui.choiceInfo(run, c);
        return h('div.choice.abt', { style: { animationDelay: (i * 0.06) + 's' }, onclick: () => { click(); m.close(); run.chooseTome(c); if (run.state === 'playing') DH.input.enable(true); } },
          h('div.ico', A.img(info.icon)), h('div.grow', h('div.tg', info.tag || ''), h('div.t', info.name), h('div.d', info.desc)));
      }))) });
  };

  /* ---------------- Loot (champion / boss chest) ---------------- */
  ui.openLoot = (run, d) => {
    DH.input.enable(false);
    const done = (m) => { m.close(); DH.input.enable(true); run.resume(); };
    const gearLine = (it) => {
      const def = E.gear[it.type], st = E.gearStat(it.type, it.rarity, 1), sp = E.gearSpecial(it.type, it.rarity);
      const slot = DH.meta.slotForRun(it.type, run.runGear), cur = run.runGear[slot] || DH.meta.equippedItem(slot);
      const better = !cur || it.rarity > cur.rarity, same = cur && cur.rarity === it.rarity;
      return { def, st, sp, cur, better, same };
    };
    ui.modal({ title: d.fresh ? t('loot.pendulum') : d.boss ? t('loot.boss') : t('loot.champion'), rays: true, closable: false, cls: 'levelup', body: (m) => h('div',
      h('div.center.small.muted', d.auto ? t('loot.ivory') : d.items.length > 1 ? t('loot.pick', { n: d.items.length }) : d.fresh ? t('loot.newItem') : ''),
      h('div', { style: { marginTop: '8px' } }, d.items.map((it, i) => {
        const L = gearLine(it);
        const res = d.auto ? d.result : null;
        return h('div.choice.abt.lootpick', { style: { animationDelay: (i * 0.06) + 's' }, onclick: () => {
          click(); if (d.auto) { if (run.bagOverflow()) { m.close(); ui.openCharacter(run, { overflow: true, onClose: () => { DH.input.enable(true); run.resume(); } }); } else done(m); return; }
          const r = run.takeLoot(it); DH.audio.play('reward');
          if (!r.overflow) ui.toast(t(r.equipped ? 'loot.equipped' : 'loot.bagged'), r.equipped ? 'good' : null);
          if (r.overflow) { m.close(); ui.openCharacter(run, { overflow: true, onClose: () => { DH.input.enable(true); run.resume(); } }); } else done(m);
        } },
          h('div.slot.rar' + it.rarity, { style: { flex: 'none', width: '52px', height: '52px' } }, A.img('g_' + it.type)),
          h('div.grow',
            h('div.tg.rar' + it.rarity, h('span.rtxt', t('rarity.' + E.rarities[it.rarity])), h('span.muted', ' · ' + t('slot.' + (L.def.slot === 'ring' ? 'ring1' : L.def.slot)))),
            h('div.t', t('gear.' + it.type)),
            h('div.d', ui.fmtStats(L.st), L.sp ? h('div.goldtxt', ui.gearSpecialText(it.type, L.sp)) : null),
            h('div.small.' + (L.better ? 'good' : 'muted'), res ? t(res.equipped ? 'loot.equipped' : 'loot.bagged') : L.better ? t('loot.upgrade') : L.same ? t('loot.sidegrade') : t('loot.worse', { r: t('rarity.' + E.rarities[L.cur.rarity]) }))));
      })),
      h('div.center.small', { style: { marginTop: '6px' } }, A.img('i_gold', 'ci'), ' +' + d.gold),
      h('div.note', t('loot.wellHint'))) });
  };

  /* ---------------- The Well ---------------- */
  ui.openWell = (run) => {
    DH.input.enable(false);
    const close = (m) => { m.close(); DH.input.enable(true); run.resume(); };
    const items = run.carried(); let sel = items[0] || null;
    const m = ui.modal({ title: t('well.title'), closable: false, body: () => h('div') });
    // tap an item to see what it is; send it up the Well from the detail panel
    const draw = () => {
      const def = sel && E.gear[sel.type], sp = sel && E.gearSpecial(sel.type, sel.rarity), st = sel && E.gearStat(sel.type, sel.rarity, 1);
      const owned = sel ? DH.save.data.gear.filter((g) => g.type === sel.type).length : 0;
      m.set(h('div',
        h('div.center.small.muted', t('well.desc')),
        items.length ? h('div.grid4', { style: { marginTop: '10px' } }, items.map((it) => h('div', { onclick: () => { click(); sel = it; draw(); } },
          h('div.slot.rar' + it.rarity + (it === sel ? '.picked' : ''), A.img('g_' + it.type), run.bag.includes(it) ? null : h('span.eq', 'E')),
          h('div.center.small.rar' + it.rarity, h('span.rtxt', t('rarity.' + E.rarities[it.rarity]))))))
          : h('div.panel.center.muted', { style: { marginTop: '10px' } }, t('well.empty')),
        sel ? h('div.panel.wellinfo', { style: { marginTop: '10px' } },
          h('div.row', { style: { alignItems: 'flex-start' } },
            h('div.slot.rar' + sel.rarity, { style: { flex: 'none', width: '56px', height: '56px' } }, A.img('g_' + sel.type)),
            h('div.grow',
              h('div', { style: { fontWeight: 800 } }, t('gear.' + sel.type)),
              h('div.small', h('span.rar' + sel.rarity, h('span.rtxt', t('rarity.' + E.rarities[sel.rarity]))), h('span.muted', ' · ' + t('slot.' + (def.slot === 'ring' ? 'ring1' : def.slot)))),
              h('div', { style: { marginTop: '4px' } }, Object.keys(st).map((k) => h('div.small', ui.fmtStat(k, st[k])))),
              sp ? h('div.small.goldtxt', { style: { marginTop: '3px' } }, ui.gearSpecialText(sel.type, sp)) : null,
              h('div.small.muted', { style: { marginTop: '3px' } }, owned ? t('well.owned', { n: owned }) : t('well.newItem')))),
          h('button.btn.gold.block', { style: { marginTop: '8px' }, onclick: () => { run.sendToWell(sel); DH.audio.play('reward'); ui.toast(t('well.sent', { item: t('gear.' + sel.type) }), 'good'); close(m); } }, t('well.send'))) : null,
        h('div.btns', h('button.btn.ghost', { onclick: () => { click(); close(m); } }, t('well.later')))));
    };
    draw();
  };

  /* ---------------- Character: equipment, the bag (4 spare pieces), stats, damage ---------------- */
  /** opts.overflow: the bag is over its size, so one piece must be equipped or discarded before the run goes on.
   *  opts.onClose: called when the screen closes (resume the run). */
  ui.openCharacter = (run, opts) => {
    opts = opts || {};
    let sel = opts.overflow ? run.bag[run.bag.length - 1] : null;
    const m = ui.modal({ title: t('inv.title'), closable: false, onX: () => close(), cls: 'charsheet', body: () => h('div') }); // the X: same rules as the Close button
    // closing with the bag too full leaves the newest pieces behind: no need to discard by hand
    const close = () => {
      click();
      const left = run.bag.splice(C.BAG_SIZE);
      if (left.length) ui.toast(t('inv.leftBehind', { item: left.map((it) => t('gear.' + it.type)).join(', ') }));
      ui.charClose = null; m.close(); if (opts.onClose) opts.onClose();
    };
    ui.charClose = close; // the I key closes it again
    const slotOf = (it) => E.slots.find((sl) => run.runGear[sl] === it);
    const commit = !!(run.fx_ || {}).commit;
    const itemBox = (it, extra) => h('div.slot.rar' + it.rarity + (it === sel ? '.picked' : ''), { onclick: () => { click(); sel = it; draw(); } }, A.img('g_' + it.type), extra);
    const detail = () => {
      if (!sel) return h('div.panel.center.small.muted.wellinfo', t('inv.tapHint'));
      const def = E.gear[sel.type], sp = E.gearSpecial(sel.type, sel.rarity), st = E.gearStat(sel.type, sel.rarity, sel.level || 1);
      const worn = slotOf(sel), inBag = run.bag.includes(sel), own = !worn && !inBag; // own = the hero's own gear from home
      let note = null; const btns = [];
      if (inBag) {
        const sl = DH.meta.slotForRun(sel.type, run.runGear), cur = run.runGear[sl] || DH.meta.equippedItem(sl);
        note = cur ? t('inv.replaces', { item: t('gear.' + cur.type), r: t('rarity.' + E.rarities[cur.rarity]) }) : null;
        btns.push(h('button.btn.gold' + (commit && run.runGear[sl] ? '.off' : ''), { onclick: () => {
          if (!run.equipFromBag(sel, sl)) { ui.toast(t('inv.committed'), 'bad'); return; }
          DH.audio.play('reward'); draw(); } }, t('inv.equip')));
        btns.push(h('button.btn.red', { onclick: async () => {
          const it = sel;
          if (!opts.overflow && !(await ui.confirm({ title: t('inv.discard'), body: t('inv.discardConfirm', { item: t('gear.' + it.type) }), okCls: 'red', ok: t('inv.discard') }))) return;
          run.discardItem(it); DH.audio.play('click'); sel = null; draw(); } }, t('inv.discard')));
      } else if (worn) {
        note = t('inv.found');
        btns.push(h('button.btn.ghost' + (run.bag.length >= C.BAG_SIZE || commit ? '.off' : ''), { onclick: () => {
          if (!run.unequipToBag(worn)) { ui.toast(t(commit ? 'inv.committed' : 'inv.bagFull'), 'bad'); return; }
          click(); draw(); } }, t('inv.toBag')));
      } else if (own) note = t('inv.own');
      return h('div.panel.wellinfo',
        h('div.row', { style: { alignItems: 'flex-start' } },
          h('div.slot.rar' + sel.rarity, { style: { flex: 'none', width: '52px', height: '52px' } }, A.img('g_' + sel.type)),
          h('div.grow',
            h('div', { style: { fontWeight: 800 } }, t('gear.' + sel.type)),
            h('div.small', h('span.rar' + sel.rarity, h('span.rtxt', t('rarity.' + E.rarities[sel.rarity]))), h('span.muted', ' · ' + t('slot.' + (def.slot === 'ring' ? 'ring1' : def.slot)))),
            h('div.small', { style: { marginTop: '3px' } }, ui.fmtStats(st)),
            sp ? h('div.small.goldtxt', { style: { marginTop: '2px' } }, ui.gearSpecialText(sel.type, sp)) : null,
            note ? h('div.small.muted', { style: { marginTop: '3px' } }, note) : null)),
        btns.length ? h('div.btns', { style: { marginTop: '8px' } }, btns) : null);
    };
    const stats = () => {
      const b = DH.meta.baseStats(run.heroId, {}), P = run.P, z = (k) => b[k] || 0;
      const row = (k, base, now, fmt) => h('div.cs-row', h('span', t(k)), h('b', fmt(base)), h('b' + (now > base + 1e-6 ? '.good' : now < base - 1e-6 ? '.bad' : ''), fmt(now)));
      const n0 = (v) => String(Math.round(v)), n1 = (v) => v.toFixed(1), pc = (v) => (v >= 0 ? '+' : '') + U.pct(v);
      return h('div.cs-stats',
        h('div.cs-head', h('span', t('inv.attribute')), h('span', t('inv.base')), h('span', t('inv.total'))),
        row('stat.maxHp', z('baseHp') * (1 + z('maxHpPct')), P.maxHp, n0),
        row('stat.regen', z('regen'), P.regen, n1),
        row('stat.block', z('block'), P.block, n0),
        row('stat.defense', z('defense') * 100, P.defense * 100, n0),
        row('stat.speedPct', z('baseSpeed') * (1 + z('speedPct')), P.speed, n0),
        row('stat.pickup', 30 * (1 + z('pickup')), P.pickupR, n0),
        row('stat.dmgPct', z('dmgPct'), P.dmgPct, pc),
        row('stat.as', z('as'), P.as, pc),
        row('stat.area', z('area'), P.area, pc),
        row('stat.critPct', z('critPct'), P.critPct, pc),
        row('stat.critBonus', 0.5 + z('critBonus') - 0.5, P.critBonus, pc));
    };
    const damage = () => h('div.cs-stats',
      h('div.cs-head', h('span', t('inv.ability')), h('span', t('inv.dps')), h('span', t('inv.totalDmg'))),
      run.abilities.map((a, i) => {
        const d = run.dmgByAb[a.id] || 0, since = Math.max(1, run.time - ((run.abTimes || [])[i] || 0));
        return h('div.cs-row', h('span', A.img('ab_' + a.id, 'ci'), ' ', t('ab.' + a.id + '.name')), h('b', U.fmt(Math.round(d / since))), h('b', U.fmt(Math.round(d))));
      }));
    const draw = () => {
      if (sel && !run.bag.includes(sel) && !slotOf(sel) && !E.slots.some((sl) => !run.runGear[sl] && DH.meta.equippedItem(sl) === sel)) sel = null;
      const over = run.bagOverflow();
      const eq = h('div.grid4.cs-eq', E.slots.map((sl) => {
        const found = run.runGear[sl], it = found || DH.meta.equippedItem(sl);
        return h('div', it ? itemBox(it, found ? h('span.found') : null) : h('div.slot.empty', A.img('s_' + sl)), h('div.center.small.muted', t('slot.' + sl)));
      }));
      const bag = h('div.grid4.cs-bag' + (over ? '.over' : ''), Array.from({ length: Math.max(C.BAG_SIZE, run.bag.length) }, (_, i) => {
        const it = run.bag[i];
        return h('div', it ? itemBox(it, i >= C.BAG_SIZE ? h('span.newdot') : null) : h('div.slot.empty.bagslot'));
      }));
      m.set(h('div',
        over ? h('div.panel.center.small.goldtxt', t('inv.overflow', { n: C.BAG_SIZE })) : null,
        h('div.cs-sec', t('inv.equipment')), eq,
        h('div.cs-sec', t('inv.bag', { n: Math.min(run.bag.length, 99), m: C.BAG_SIZE })), bag,
        detail(),
        h('div.cs-sec', t('inv.stats')), stats(),
        h('div.cs-sec', t('inv.damage')), damage(),
        h('div.btns', h('button.btn.gold', { onclick: close }, t(over ? 'inv.leave' : opts.overflow ? 'common.continue' : 'common.close')))));
    };
    draw();
  };

  /* ---------------- Pause ---------------- */
  ui.openPause = (run) => {
    const P = run.P;
    const statRows = [
      [t('stat.maxHp'), Math.round(run.player.hp) + '/' + P.maxHp], [t('stat.defense'), Math.round(P.defense * 100) + ' (' + U.pct(C.defenseDR(P.defense)) + ')'], [t('stat.block'), Math.round(P.block)],
      [t('stat.dmgPct'), '+' + U.pct(P.dmgPct)], [t('stat.as'), '+' + U.pct(P.as)], [t('stat.area'), '+' + U.pct(P.area)],
      [t('stat.critPct'), '+' + U.pct(P.critPct)], [t('stat.critBonus'), '+' + U.pct(P.critBonus)], [t('stat.ms'), U.pct(P.ms)],
      [t('stat.regen'), P.regen.toFixed(1)], [t('stat.speedPct'), Math.round(P.speed)], [t('stat.growth'), U.pct(P.growth)],
    ];
    ui.modal({ title: t('pause.title'), closable: false, body: (m) => h('div',
      h('div.center.small.muted', t('stage.' + run.stageId + '.name') + ' · ' + U.fmtTime(run.time) + (run.dread ? ' · ' + t('dread.rank', { n: run.dread }) : '')),
      buildRow(run), traitRow(run),
      h('div.statgrid.three', statRows.map(([k, v]) => h('div', h('span', k), h('b', v)))),
      h('div.col',
        h('button.btn.gold.block', { onclick: () => { click(); m.close(); DH.game.resume(); } }, t('pause.resume')),
        h('button.btn.ghost.block', { onclick: () => { click(); ui.openCharacter(run); } }, A.img('u_bag', 'ci'), ' ', t('inv.title')),
        h('button.btn.ghost.block', { onclick: () => ui.openSettings() }, t('home.settings')),
        h('button.btn.red.block', { onclick: async () => {
          if (await ui.confirm({ title: t('pause.quit'), body: t('pause.quitConfirm'), okCls: 'red', ok: t('pause.quit') })) { m.close(); DH.game.finishRun(run); }
        } }, t('pause.quit')))) });
  };

  /* ---------------- Revive ---------------- */
  ui.openRevive = (run) => {
    DH.input.enable(false);
    let left = 10, done = false, iv;
    const cnt = h('div.num', { style: { fontSize: '26px', color: 'var(--blood-hi)', textAlign: 'center', margin: '8px 0' } }, left);
    const cost = E.REVIVE_GEMS[run.usedGemRevive], gemsLeft = E.REVIVE_GEMS.length - run.usedGemRevive;
    const giveUp = () => { if (done) return; done = true; clearInterval(iv); m.close(); DH.game.finishRun(run); };
    const revived = () => { done = true; clearInterval(iv); m.close(); run.revive(false); DH.input.enable(true); };
    const startTimer = () => { clearInterval(iv); iv = setInterval(() => { left--; cnt.textContent = Math.max(0, left); if (left <= 0) giveUp(); }, 1000); };
    const m = ui.modal({ title: t('revive.title'), closable: false, body: h('div',
      h('div.center.muted', t('revive.desc')), cnt,
      h('div.col',
        !run.usedAdRevive ? h('button.btn.ad.block.shine', { onclick: async () => { clearInterval(iv); if (await DH.ads.rewarded('revive')) { run.usedAdRevive = true; revived(); } else startTimer(); } }, h('span.adtag', 'AD'), t('revive.free')) : null,
        cost == null ? h('div.center.small.muted', t('revive.noMore')) : h('button.btn.gem.block', { onclick: () => { if (DH.meta.spend({ gems: cost })) { run.usedGemRevive++; DH.audio.play('buy'); revived(); } else { clearInterval(iv); ui.toast(t('common.notEnough'), 'bad'); startTimer(); } } }, t('revive.gems'), A.img('i_gem'), cost, h('small', { style: { opacity: 0.75, marginLeft: '6px' } }, t('revive.left', { n: gemsLeft }))),
        h('button.btn.ghost.block', { onclick: () => { click(); giveUp(); } }, t('revive.giveUp')))) });
    startTimer();
  };

  /* ---------------- Results ---------------- */
  ui.openResults = (run, res) => {
    const sum = run.summary(), win = sum.victory;
    const dmg = Object.entries(run.dmgByAb).filter(([k]) => C.abilities[k]).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxD = dmg.length ? dmg[0][1] : 1;
    let doubled = false;
    const goldEl = h('span', U.fmt(res.gold));
    const extras = [];
    if (res.gems) extras.push({ icon: 'i_gem', text: '+' + res.gems });
    res.gear.forEach((g) => extras.push({ icon: 'g_' + g.type, text: t('gear.' + g.type), rarity: g.rarity }));
    [sum.wellSent].concat(sum.wellExtra || []).forEach((w) => { if (w) extras.push({ icon: 'g_' + w.type, text: t('well.toKeeper'), rarity: w.rarity }); });
    for (const k in sum.herbs) extras.push({ icon: 'herb_' + k, text: '+' + sum.herbs[k] });
    if (res.shards) extras.push({ icon: 'shard', text: '+' + res.shards });
    (res.artifacts || []).forEach((k) => extras.push({ icon: 'a_' + k, text: t('artifact.' + k + '.name'), rarity: 4 }));
    const dblBtn = h('button.btn.ad.shine', { onclick: async () => {
      if (doubled) return;
      if (await DH.ads.rewarded('double_gold')) { doubled = true; DH.meta.doubleRunGold(res); goldEl.textContent = U.fmt(res.gold * 2); dblBtn.classList.add('off'); DH.audio.play('coin'); }
    } }, h('span.adtag', 'AD'), t('results.double'));
    ui.modal({ closable: false, cls: 'results wide', rays: win, body: (m) => h('div',
      h('div.big.' + (win ? 'win' : 'lose'), win ? t('results.victory') : t('results.defeat')),
      h('div.center.small.muted', t('stage.' + sum.stage + '.name') + (sum.agonyOn ? ' · ' + t('hud.agony') + ' ' + ['0', 'I', 'II', 'III', 'IV', 'V'][sum.agony] : '') + (res.firstClear ? ' · ' + t('results.firstClear') : '')),
      h('div.statgrid',
        h('div', h('span', t('results.time')), h('b', U.fmtTime(sum.time))), h('div', h('span', t('results.kills')), h('b', U.fmt(sum.kills))),
        h('div', h('span', t('results.level')), h('b', sum.level + (sum.lateLevels ? ' (+' + sum.lateLevels + ')' : ''))), h('div', h('span', t('results.bosses')), h('b', sum.bossKills))),
      h('div.goldline', h('span', t('results.goldRun')), h('b', U.fmt(res.goldRun))),
      h('div.goldline', h('span', t('results.goldTime')), h('b', U.fmt(res.timeBonus))),
      res.winBonus ? h('div.goldline', h('span', t('results.goldWin')), h('b', U.fmt(res.winBonus))) : null,
      h('div.goldtotal', A.img('i_gold'), goldEl),
      extras.length ? h('div.reward-list', extras.map((e) => h('div.reward', h('div.slot' + (e.rarity != null ? '.rar' + e.rarity : ''), A.img(e.icon)), h('div.n' + (ui.isWord(e.text) ? '.word' : ''), e.text)))) : null,
      res.secret ? h('div.center.goldtxt', { style: { fontWeight: 800, margin: '6px 0' } }, A.img('u_secret', 'ci'), ' ' + t('results.secret', { n: C.HEX.firstShards })) : null,
      res.deeds && res.deeds.length ? h('div.deedsdone', h('div.goldtxt', { style: { fontWeight: 800 } }, t('results.deeds', { n: res.deeds.length, x: Math.round(res.deeds.length * DH.deeds.XP_PER_DEED * 1000) / 10 })), res.deeds.slice(0, 6).map((d) => h('div.small', A.img('u_check', 'ci'), ' ' + ui.deedText(d))), res.deeds.length > 6 ? h('div.small.muted', '…') : null) : null,
      h('div.center.small.muted', t('results.xp', { a: res.accountXp, p: res.passXp })),
      dmg.length ? h('div', { style: { marginTop: '10px' } }, dmg.map(([id, v]) => h('div.dmgrow', A.img('ab_' + id), h('div.bar', h('i', { style: { width: (v / maxD * 100) + '%' } })), h('b', U.fmt(v))))) : null,
      h('div.btns', dblBtn, h('button.btn.gold', { onclick: () => { click(); m.close(); DH.game.toMenu(win); } }, t('common.continue')))) });
  };
})(window.DH);
