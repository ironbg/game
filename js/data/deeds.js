/* Deeds: ~280 permanent quests. Every completed deed grants +1% XP forever,
 * and many unlock heroes, abilities, ability traits, marks, potions or artifacts.
 * Conditions are evaluated from run summaries (see DH.meta.checkDeeds). */
(function (DH) {
  'use strict';
  const C = DH.content;
  const D = [];
  const add = (id, cat, cond, extra) => D.push(Object.assign({ id, cat, cond }, extra || {}));

  // ---- stages ----
  C.stageOrder.forEach((s) => {
    [3, 5, 8].forEach((m) => add('d_stage_' + s + '_s' + m, 'stage', { type: 'survive', stage: s, t: m * 60 }, { args: { stage: s, t: m } }));
    add('d_stage_' + s + '_win', 'stage', { type: 'win', stage: s }, { args: { stage: s }, gold: 500 });
    [1, 3, 5].forEach((a) => add('d_stage_' + s + '_a' + a, 'stage', { type: 'agony', stage: s, a }, { args: { stage: s, a } }));
    // hall quests: Dominator (kills), Berserker (damage), Adept (main attack only), Speedster (the secret)
    const gm = 1 + C.stages[s].index * 0.25, G = (n) => Math.round(n * gm / 50) * 50;
    add('d_stage_' + s + '_k1', 'stage', { type: 'killsRun', stage: s, n: 1200 }, { args: { stage: s, n: 1200 }, gold: G(300) });
    add('d_stage_' + s + '_kills', 'stage', { type: 'killsRun', stage: s, n: 2500 }, { args: { stage: s, n: 2500 }, gold: G(600) });
    add('d_stage_' + s + '_k3', 'stage', { type: 'killsRun', stage: s, n: 5000 }, { args: { stage: s, n: 5000 }, gold: G(1000) });
    [1, 3, 8].forEach((m, i) => { const n = C.BERSERK_DMG[s] * m; add('d_stage_' + s + '_dmg' + (i + 1), 'stage', { type: 'dmgStage', stage: s, n }, { args: { stage: s, n }, gold: G([400, 800, 1500][i]) }); });
    add('d_stage_' + s + '_adept', 'stage', { type: 'adept', stage: s, t: 480 }, { args: { stage: s, t: 8 }, gold: G(1500) });
    add('d_secret_speed_' + s, 'stage', { type: 'secretBy', stage: s, t: 240 }, { args: { stage: s, t: 4 }, gold: G(800) });
    add('d_secret_' + s, 'stage', { type: 'secret', stage: s }, { args: { stage: s }, gold: 400 });
    C.stages[s].bosses.forEach((b) => add('d_boss_' + b.id, 'stage', { type: 'boss', id: b.id }, { args: { boss: b.id }, gold: 300 }));
  });
  // the Starting Tome of each hall (an Arcane Tome beside the hero): its own, gentler quests
  Object.entries(C.START_TOME_QUEST).forEach(([s, q]) => add('d_start_' + s, 'stage', q.kills ? { type: 'killsRun', stage: s, n: q.kills } : { type: 'survive', stage: s, t: q.survive * 60 }, { args: q.kills ? { stage: s, n: q.kills } : { stage: s, t: q.survive } }));
  // hall specials
  add('d_upanddown', 'stage', { type: 'abilitiesBy', stage: 'aqueduct', n: 5, t: 180 }, { args: { stage: 'aqueduct', n: 5, t: 3 }, gold: 1200 });
  [1, 2, 3].forEach((n) => add('d_vault_shards_' + n, 'stage', { type: 'shardsRun', stage: 'reliquary', n }, { args: { stage: 'reliquary', n }, gold: [2000, 4000, 7000][n - 1] }));
  // play clean: no elemental damage at all / no elemental effect at all (hazards count too; the Viaduct has none)
  add('d_heathen', 'general', { type: 'heathen', t: 480 }, { args: { t: 8 }, gold: 2500 });
  add('d_direct', 'general', { type: 'direct', t: 480 }, { args: { t: 8 }, gold: 2500 });
  add('d_army_dead', 'general', { type: 'stat', stat: 'kills', n: 50666 }, { args: { n: 50666 }, gold: 6660 });
  // ---- heroes ----
  C.heroOrder.forEach((h) => {
    [20, 35, 50].forEach((l) => add('d_hero_' + h + '_l' + l, 'hero', { type: 'heroLevel', hero: h, n: l }, { args: { hero: h, n: l } }));
    add('d_hero_' + h + '_win', 'hero', { type: 'heroWin', hero: h }, { args: { hero: h }, gold: 400 });
    add('d_mark_' + h, 'hero', { type: 'mark', hero: h, stage: C.heroes[h].home, a: 3 }, { args: { hero: h, stage: C.heroes[h].home, a: 3 } });
  });
  // ---- abilities (damage dealt, cumulative) ----
  Object.keys(C.abilities).forEach((ab) => {
    C.TRAIT_UNLOCK_DMG.forEach((n, i) => add('d_ab_' + ab + '_' + (i + 1), 'ability', { type: 'abDmg', ab, n }, { args: { ab, n }, unlockTrait: { ab, idx: i + 2 } }));
  });
  // ---- general ----
  [1000, 2500, 4000].forEach((n) => add('d_kills_run_' + n, 'general', { type: 'killsRun', n }, { args: { n } }));
  [30, 50, 70].forEach((n) => add('d_level_' + n, 'general', { type: 'level', n }, { args: { n } }));
  [20, 100].forEach((n) => add('d_tomes_' + n, 'general', { type: 'stat', stat: 'tomes', n }, { args: { n } }));
  [1, 10].forEach((n) => add('d_well_' + n, 'general', { type: 'stat', stat: 'wellSent', n }, { args: { n } }));
  [1, 10].forEach((n) => add('d_brew_' + n, 'general', { type: 'stat', stat: 'brewed', n }, { args: { n } }));
  [50, 300].forEach((n) => add('d_elites_' + n, 'general', { type: 'stat', stat: 'eliteKills', n }, { args: { n } }));
  [10, 100].forEach((n) => add('d_champions_' + n, 'general', { type: 'stat', stat: 'championKills', n }, { args: { n } }));
  [1, 10].forEach((n) => add('d_oozes_' + n, 'general', { type: 'stat', stat: 'oozes', n }, { args: { n } }));
  // damage of one kind in a single run (these unlock abilities, see C.lockedAbilities)
  Object.entries(C.DMG_DEEDS).forEach(([tag, n]) => add('d_dmg_' + tag, 'general', { type: 'dmgRun', tag, n }, { args: { tag, n } }));
  add('d_dmg_shieldbash', 'general', { type: 'abRun', ab: 'shieldbash', n: 30000 }, { args: { ab: 'shieldbash', n: 30000 } });
  add('d_crits', 'general', { type: 'crits', n: 1500 }, { args: { n: 1500 } });
  [4, 8].forEach((n) => add('d_dread_' + n, 'general', { type: 'dread', n }, { args: { n } }));

  DH.deeds = { list: D, byId: Object.fromEntries(D.map((d) => [d.id, d])), XP_PER_DEED: 0.003 }; // +0.3% XP per completed quest
})(window.DH);
