/* Gameplay content: heroes, abilities (+ their traits), player traits, enemies, bosses, stages.
 * Names are localized via keys: hero.<id>.name, ab.<id>.name, trait.<id>, enemy.<id>, stage.<id>.name ... */
(function (DH) {
  'use strict';
  const C = {};
  C.RUN_LENGTH = 600;
  /** Berserker quests: damage in one run per hall (tiers I-III are x1, x3, x8). */
  C.BERSERK_DMG = { crypt: 250000, abyss: 500000, aqueduct: 800000, catacombs: 800000, discord: 1200000, blightmire: 1500000, reliquary: 2000000 };
  C.RUN_ENERGY = 5;
  C.MAX_ABILITIES = 5;          // tome abilities besides the hero weapon
  C.BASE_TRAIT_MAX = 8;
  C.ELEVATED_LEVELS = [15, 30, 60];
  C.CLASS_LEVELS = [5, 15, 25, 40, 60];
  /* Agony champions drop ONE reward, checked top to bottom: chance = base + inc x (TR+AR),
   * capped at max; 'min' is the TR+AR needed; 'cap' is the most per run. The 150 gold bag always ends the list. */
  C.CHAMP_DROPS = [
    { k: 'bucket',  min: 0, base: 0.05, inc: 0.01, max: 0.2, cap: 2 },
    { k: 'potion',  min: 0, base: 0.05, inc: 0.03, max: 0.2, cap: 2 },
    { k: 'mastery', min: 5, base: 0,    inc: 0.01, max: 0.2, cap: 9 },
    { k: 'chest',   min: 0, base: 0.2,  inc: 0.03, max: 0.5, cap: 7 },
    { k: 'tome',    min: 0, base: 0.3,  inc: 0.04, max: 0.6, cap: 9 },
    { k: 'gold',    min: 0, base: 0,    inc: 0.01, max: 1, n: 48 },
    { k: 'gold',    min: 0, base: 0.1,  inc: 0.02, max: 1, n: 24 },
    { k: 'gold',    min: 0, base: 0.2,  inc: 0.04, max: 1, n: 12 },
    { k: 'gold',    min: 0, base: 1,    inc: 0,    max: 1, n: 6 },
  ];
  /* Agony: the gauge climbs by itself (+1 rank every 4:48 of a 30-minute hall = every 96 s here) and with every
   * kill; a revive drains a fifth of it. With Agony on, champions come every (50 - 3 x AR) x 0.95^TR seconds. */
  C.AGONY = { passive: 1 / 96, kill: 0, eliteKill: 5, revive: 1, champBase: 50, champPerAR: 3 }; // the gauge climbs with time only: rank V at 8:00 of a 10-minute hall
  /* Lament Shards per Lord by Torment Rank (chance of at least 2 / 3 / 4), interpolated between ranks */
  C.SHARD_TABLE = [[0, 0, 0, 0], [10, 1, 0.57, 0.1], [20, 1, 1, 0.62], [30, 1, 1, 1]];
  C.KILL_MODE = 2500;            // Kill Mode (Shrine): the Lord rises at this many kills instead of 10:00
  C.LOOT_TIERS = { champion: 11, lord: 16, all: 25 };
  /* Items waiting at fixed spots in each hall, 320-380 m out and far apart */
  C.STAGE_START = {
    crypt:      ['tome', 'tome'],
    abyss:      ['tome', 'magnet'],
    aqueduct:   ['tome', 'potion', 'tome'],
    catacombs:  ['tome', 'magnet'],
    discord:    ['tome', 'chest_red'],
    blightmire: ['tome', 'magnet'],
    reliquary:  ['tome', 'chest_red', 'magnet'],
  };
  /** Defense -> damage reduction (Defense is stored /100: 0.05 = 5 Defense).
   *  DR = sgn(D) x (0.6 - 24 / (|D| + 40)) + min(0.4, 0.004 D); past 100 Defense effective HP grows ~4.17% per point. */
  C.defenseDR = (d) => { const D = d * 100; if (!D) return 0; return Math.min(0.99, Math.sign(D) * (0.6 - 24 / (Math.abs(D) + 40)) + Math.min(0.4, 0.004 * D)); };
  C.UNITS_PER_M = 14;           // world units per metre: heroes (~70 units/s) walk ~5 m/s
  C.START_DIST = [320 * C.UNITS_PER_M, 380 * C.UNITS_PER_M]; // 320-380 m: about a minute's walk (a 10-minute hall leaves time for the rest)
  /* "Starting Ability": a hall quest (deed) that puts an Arcane Tome right next to the hero at the start */
  // the deed that puts an Arcane Tome beside the hero at the start of each hall
  C.START_TOME_QUEST = { crypt: { kills: 2000 }, abyss: { kills: 2000 }, catacombs: { survive: 6 }, blightmire: { survive: 4 }, reliquary: { kills: 2000 } };
  C.START_TOME_DEED = {
    crypt: 'd_start_crypt', abyss: 'd_start_abyss', aqueduct: 'd_boss_lich', catacombs: 'd_start_catacombs',
    discord: 'd_boss_discolossus', blightmire: 'd_start_blightmire', reliquary: 'd_start_reliquary',
  };
  // the older, harder deeds that used to unlock them still count (save.js migrates them)
  C.START_TOME_OLD = { d_start_crypt: 'd_stage_crypt_kills', d_start_abyss: 'd_stage_abyss_kills', d_start_catacombs: 'd_stage_catacombs_s8', d_start_blightmire: 'd_stage_blightmire_s5', d_start_reliquary: 'd_stage_reliquary_kills' };
  /* Status effects. Damage per stack is a share of the ability's base damage (not its % bonuses;
   * the element's own bonus, Affliction and the Incubator do count).
   *   Burn   up to 20 stacks, a tick every 0.33 s, 2.5 s refreshed by each new stack; at 20 a new stack burns at once
   *   Spark  up to 20 stacks, a tick every 2 x 0.854^(stacks-1) s hits for every stack and spends one; at 20 a new
   *          stack hits for 5 stacks at once
   *   Frost  stores up to 20 stacks for 10 s; at 20, or when the foe dies (not from its first hit), a Frost Wave hits
   *          everyone around for every stack; its reach grows with the hardest single hit the foe took
   *   Decay  no cap and no end: damage every second, and every stack strips armor for good
   *   Fragile / Affliction  +5% direct / effect damage per stack; the stacks halve on every tick, and the ticks come
   *          faster the more stacks there are; on death half of the Affliction jumps to each foe nearby
   *   Slow   up to 20 stacks, speed x0.91 per stack; one stack fades every 3 / stacks s
   *   Stun   0.4 s, never stacks; Curse (the Lord of Anguish's bolt): death in 40 s unless you revive */
  C.STATUS = {
    burn: { per: 0.12, tick: 0.33, dur: 2.5, max: 20, overflow: 7.5 },
    spark: { per: 0.4, tick: 2, shrink: 0.854, max: 20, overflow: 5 },
    frost: { per: 0.6, window: 10, max: 20 },
    decay: { per: 0.03, armor: 0.015 },
    halve: { tick: 3, k: 0.1 }, // Fragile / Affliction: a tick every 3 / (1 + 0.1 x stacks) s
    slow: { mult: 0.91, max: 20, tick: 3 },
    stun: 0.4, curse: 40,
  };
  C.FRAGILE_PER = 0.05;         // Fragile: +5% direct damage taken per stack (unlimited, permanent)
  C.AFFLICT_PER = 0.05;         // Affliction: +5% effect damage taken per stack; half the stacks spread on death
  C.ABILITY_TRAIT_EVERY = 8;    // one ability-trait rank per ability per 8 player levels
  C.ABILITY_TRAIT_MAX = 3;
  C.MAX_TRAIT_CHOICES = 3;

  /* ------------------------------------------------------------------ */
  /* Abilities. tags: physical | magic, projectile | melee | area | summon, fire | lightning | ice
   * base: dmg, cd (s), area (x), count, pierce, speed, duration (s), knock, crit (base crit chance)
   * traits: six ability traits; the first two are available from the start, the rest unlock via deeds. */
  const T = (k, m) => ({ k, m });
  C.abilities = {
    // ---- hero weapons ----
    cleave:     { hero: true, icon: 'sword',    tags: ['physical', 'melee', 'area'], base: { dmg: 18, cd: 1.15, area: 1, count: 1, knock: 70, crit: 0.05 },
                  traits: [T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.25 }), T('twin', { count: 1 }), T('haste', { as: 0.2 }), T('brittle', { fragile: 0.2 }), T('echo', { ms: 0.35 })] },
    longbow:    { hero: true, icon: 'bow',      tags: ['physical', 'projectile'], base: { dmg: 12, cd: 0.85, count: 1, pierce: 1, speed: 290, knock: 25, crit: 0.15 },
                  traits: [T('multi', { count: 1 }), T('impale', { pierce: 2 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 }), T('velocity', { speed: 0.3, dmgPct: 0.1 }), T('echo', { ms: 0.35 })] },
    judgment:   { hero: true, icon: 'hammer',   tags: ['magic', 'area'], base: { dmg: 130, cd: 1.6, area: 1, knock: 50, crit: 0 }, noCrit: true, split: true,
                  traits: [T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.3 }), T('haste', { as: 0.2 }), T('kindle', { burn: 0.25 }), T('torment', { affliction: 0.25 }), T('twin', { count: 1 })] },
    flamejet:   { hero: true, icon: 'flame',    tags: ['fire', 'projectile', 'area'], base: { dmg: 5, cd: 0.14, area: 1, duration: 0.5, knock: 4, crit: 0.05, burn: 0.35 },
                  traits: [T('kindle', { burn: 0.25 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('linger', { duration: 0.3 }), T('static', { spark: 0.2 }), T('haste', { as: 0.15 })] },
    spirits:    { hero: true, icon: 'wisp',     tags: ['magic', 'summon', 'projectile'], base: { dmg: 16, cd: 1.5, count: 2, speed: 120, duration: 4, area: 1, crit: 0.05 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('torment', { affliction: 0.25 }), T('haste', { as: 0.2 }), T('expanse', { area: 0.3 }), T('linger', { duration: 0.4 })] },
    shieldbash: { hero: true, icon: 'shield',   tags: ['physical', 'melee', 'area'], base: { dmg: 14, cd: 1.0, area: 1, knock: 160, crit: 0.05, blockDmg: 1.5 },
                  traits: [T('bulwark', { blockDmg: 0.75 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('haste', { as: 0.2 }), T('brittle', { fragile: 0.25 }), T('twin', { count: 1 })] },
    arcbolt:    { hero: true, icon: 'bolt',     tags: ['magic', 'lightning', 'projectile'], base: { dmg: 14, cd: 0.8, count: 1, pierce: 0, speed: 340, chain: 2, crit: 0.33 },
                  traits: [T('chain', { chain: 2 }), T('static', { spark: 0.25 }), T('multi', { count: 1 }), T('haste', { as: 0.2 }), T('keen', { crit: 0.1 }), T('amp', { dmgPct: 0.25 })] },
    wolves:     { hero: true, icon: 'wolf',     tags: ['physical', 'summon', 'ice', 'melee'], base: { dmg: 12, cd: 0.7, count: 2, speed: 95, crit: 0.05, frost: 0.25 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('rime', { frost: 0.25 }), T('haste', { as: 0.2 }), T('velocity', { speed: 0.3 }), T('brittle', { fragile: 0.2 })] },
    frostaxe:   { hero: true, icon: 'axe',      tags: ['physical', 'ice', 'melee', 'area'], base: { dmg: 30, cd: 1.7, area: 1, knock: 80, crit: 0.05, frost: 0.4 },
                  traits: [T('rime', { frost: 0.3 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('haste', { as: 0.2 }), T('twin', { count: 1 }), T('echo', { ms: 0.3 })] },
    arcaneorb:  { hero: true, icon: 'orb',      tags: ['magic', 'projectile'], base: { dmg: 9, cd: 1.1, count: 1, pierce: 99, speed: 38, duration: 3.4, area: 1, crit: 0.08 },
                  traits: [T('multi', { count: 1 }), T('expanse', { area: 0.3 }), T('linger', { duration: 0.4 }), T('amp', { dmgPct: 0.25 }), T('brittle', { fragile: 0.2 }), T('haste', { as: 0.2 })] },
    bloodpulse: { hero: true, icon: 'drop',     tags: ['magic', 'area'], base: { dmg: 34, cd: 1.3, area: 1, knock: 40, crit: 0.05, affliction: 0.6, hpCost: 0.03 },
                  traits: [T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.25 }), T('torment', { affliction: 0.3 }), T('haste', { as: 0.2 }), T('rot', { decay: 0.25 }), T('twin', { count: 1 })] },
    scythes:    { hero: true, icon: 'scythe',   tags: ['physical', 'melee'], base: { dmg: 12, cd: 0, count: 2, area: 1, speed: 3.4, knock: 30, crit: 0.08 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.2 }), T('velocity', { speed: 0.3 }), T('torment', { affliction: 0.2 }), T('keen', { crit: 0.1 })] },
    // Skald: songs fire on the beat of the battle music (beat = beats between casts; attack speed lets them hit more beats)
    chord:      { hero: true, icon: 'lute',     tags: ['magic', 'area'], base: { dmg: 17, cd: 0.8, area: 1, knock: 50, crit: 0.08 }, beat: 1,
                  traits: [T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.25 }), T('twin', { count: 1 }), T('haste', { as: 0.25 }), T('brittle', { fragile: 0.2 }), T('static', { spark: 0.2 })] },
    // Landsknecht: a slow, heavy arquebus (Multistrike speeds it up instead of adding shots); grenades throw back the damage it dealt
    arquebus:   { hero: true, icon: 'gun',      tags: ['physical', 'projectile'], base: { dmg: 46, cd: 1.9, count: 1, pierce: 2, speed: 520, knock: 60, crit: 0.05 }, msToAs: true,
                  traits: [T('amp', { dmgPct: 0.25 }), T('impale', { pierce: 2 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 }), T('velocity', { speed: 0.3, dmgPct: 0.1 }), T('multi', { count: 1 })] },
    // Alchemist: flasks thrown around him in a circle; each element he wields elsewhere adds its own brew and puddle
    concoction: { hero: true, icon: 'flask',    tags: ['physical', 'area'], base: { dmg: 24, cd: 0.95, count: 1, area: 1, duration: 2.5, knock: 30, crit: 0.05 },
                  traits: [T('multi', { count: 1 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('haste', { as: 0.2 }), T('linger', { duration: 0.4 }), T('keen', { crit: 0.1 })] },
    // Crone: bog plants sprout over time and as she walks: snare, biter, pod and spitter
    bogplants:  { hero: true, icon: 'plant',    tags: ['magic', 'summon'], base: { dmg: 13, cd: 1.7, count: 4, area: 1, duration: 11, crit: 0.05, decay: 0.33 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('rot', { decay: 0.2 }), T('haste', { as: 0.2 }), T('expanse', { area: 0.25 }), T('linger', { duration: 0.4 })] },
    // ---- tome abilities ----
    hexlance:   { icon: 'lance',    tags: ['magic', 'projectile'], base: { dmg: 12, cd: 1.3, count: 1, pierce: 99, speed: 260, crit: 0.05, fragile: 0.35, affliction: 0.35 }, falloff: 0.666,
                  traits: [T('multi', { count: 1 }), T('brittle', { fragile: 0.25 }), T('torment', { affliction: 0.25 }), T('haste', { as: 0.2 }), T('keen', { crit: 0.1 }), T('amp', { dmgPct: 0.3 })] },
    chakrams:   { icon: 'chakram',  tags: ['physical', 'projectile'], base: { dmg: 14, cd: 1.4, count: 1, pierce: 99, speed: 200, duration: 1.2, area: 1, crit: 0.1 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 }), T('expanse', { area: 0.3 }), T('echo', { ms: 0.35 })] },
    orbs:       { icon: 'orbs',     tags: ['physical', 'projectile', 'summon'], base: { dmg: 10, cd: 0, count: 2, area: 1, speed: 2.4, knock: 40, crit: 0.05 }, moveSpin: true,
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.25 }), T('velocity', { speed: 0.3 }), T('brittle', { fragile: 0.15 }), T('keen', { crit: 0.1 })] },
    darts:      { icon: 'dagger',   tags: ['physical', 'projectile'], base: { dmg: 6, cd: 0.4, count: 1, pierce: 0, speed: 360, crit: 0.1 }, msMult: true,
                  traits: [T('echo', { ms: 0.4 }), T('haste', { as: 0.25 }), T('keen', { crit: 0.1 }), T('impale', { pierce: 1 }), T('multi', { count: 1 }), T('amp', { dmgPct: 0.3 })] },
    wyrmfire:   { icon: 'breath',   tags: ['fire', 'projectile', 'area'], base: { dmg: 10, cd: 1.6, count: 3, area: 1, speed: 120, duration: 0.8, crit: 0.05, burn: 0.5 },
                  traits: [T('kindle', { burn: 0.25 }), T('linger', { duration: 0.3 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('multi', { count: 1 }), T('haste', { as: 0.2 })] },
    stormsphere:{ icon: 'sphere',   tags: ['lightning', 'projectile'], base: { dmg: 8, cd: 3, count: 1, speed: 36, duration: 4, area: 1, crit: 0.08, spark: 0.3 }, msMult: true,
                  traits: [T('static', { spark: 0.25 }), T('linger', { duration: 0.4 }), T('multi', { count: 1 }), T('expanse', { area: 0.25 }), T('haste', { as: 0.2 }), T('amp', { dmgPct: 0.25 })] },
    halo:       { icon: 'sun',      tags: ['magic', 'area'], base: { dmg: 24, cd: 0.5, area: 1, knock: 10, crit: 0.05 }, split: true,
                  traits: [T('expanse', { area: 0.2 }), T('amp', { dmgPct: 0.3 }), T('brittle', { fragile: 0.15 }), T('torment', { affliction: 0.15 }), T('kindle', { burn: 0.2 }), T('haste', { as: 0.15 })] },
    rifts:      { icon: 'rift',     tags: ['magic', 'area'], base: { dmg: 40, cd: 1.2, count: 1, area: 1, duration: 8, knock: 60, crit: 0.05 },
                  traits: [T('multi', { count: 1 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.3 }), T('linger', { duration: 0.4 }), T('torment', { affliction: 0.2 }), T('haste', { as: 0.2 })] },
    skyfall:    { icon: 'meteor',   tags: ['fire', 'area'], base: { dmg: 40, cd: 2.6, count: 1, area: 1, knock: 70, crit: 0.05, burn: 0.3 },
                  traits: [T('multi', { count: 1 }), T('expanse', { area: 0.3 }), T('kindle', { burn: 0.25 }), T('amp', { dmgPct: 0.3 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 })] },
    golem:      { icon: 'golem',    tags: ['physical', 'summon', 'area'], base: { dmg: 30, cd: 1.6, count: 1, area: 1, speed: 45, knock: 90, crit: 0.05 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.25 }), T('haste', { as: 0.2 }), T('velocity', { speed: 0.3 }), T('brittle', { fragile: 0.2 })] },
    phantom:    { icon: 'helm',     tags: ['magic', 'summon', 'melee'], base: { dmg: 22, cd: 2.4, count: 1, area: 1, duration: 6, speed: 80, crit: 0.08 },
                  traits: [T('multi', { count: 1 }), T('linger', { duration: 0.4 }), T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.25 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 })] },
    avalanche:  { icon: 'ice',      tags: ['ice', 'area'], base: { dmg: 22, cd: 2.2, count: 1, area: 1, crit: 0.05, frost: 0.6 },
                  traits: [T('rime', { frost: 0.25 }), T('multi', { count: 1 }), T('expanse', { area: 0.3 }), T('amp', { dmgPct: 0.3 }), T('haste', { as: 0.2 }), T('brittle', { fragile: 0.2 })] },
    hail:       { icon: 'hail',     tags: ['ice', 'projectile', 'area'], base: { dmg: 12, cd: 0.6, count: 1, area: 1, crit: 0.05, frost: 0.3 },
                  traits: [T('multi', { count: 1 }), T('rime', { frost: 0.25 }), T('expanse', { area: 0.25 }), T('haste', { as: 0.2 }), T('amp', { dmgPct: 0.3 }), T('echo', { ms: 0.3 })] },
    flail:      { icon: 'flail',    tags: ['physical', 'melee', 'area'], base: { dmg: 26, cd: 0, count: 1, area: 1, speed: 2.2, knock: 110, crit: 0.05 },
                  traits: [T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.3 }), T('velocity', { speed: 0.3 }), T('multi', { count: 1 }), T('brittle', { fragile: 0.2 }), T('keen', { crit: 0.1 })] },
    fists:      { icon: 'fist',     tags: ['magic', 'melee'], base: { dmg: 22, cd: 0.7, count: 1, area: 1, knock: 90, crit: 0.08 }, noAs: true, noMs: true,
                  traits: [T('multi', { count: 1 }), T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.25 }), T('brittle', { fragile: 0.2 }), T('torment', { affliction: 0.2 }), T('echo', { ms: 0.35 })] },
    storm:      { icon: 'bolt',     tags: ['lightning', 'area'], base: { dmg: 28, cd: 2.2, count: 2, area: 1, crit: 0.05, spark: 0.3, stun: 0.35 },
                  traits: [T('multi', { count: 1 }), T('static', { spark: 0.25 }), T('amp', { dmgPct: 0.3 }), T('haste', { as: 0.2 }), T('expanse', { area: 0.4 }), T('chain', { chain: 2 })] },
    axes:       { icon: 'axe',      tags: ['physical', 'projectile'], base: { dmg: 20, cd: 1.5, count: 1, area: 1, pierce: 999, knock: 30, crit: 0.05 },
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.25 }), T('haste', { as: 0.2 }), T('keen', { crit: 0.1 }), T('echo', { ms: 0.3 })] },
    nova:       { icon: 'snow',     tags: ['ice', 'area'], base: { dmg: 12, cd: 3, area: 1, knock: 50, crit: 0.05, frost: 0.8 },
                  traits: [T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.2 }), T('haste', { as: 0.25 }), T('rime', { frost: 0.3 }), T('brittle', { fragile: 0.2 }), T('twin', { count: 1 })] },
    plague:     { icon: 'flask',    tags: ['area'], base: { dmg: 6, cd: 2.4, count: 1, area: 1, duration: 3, crit: 0.05, decay: 0.5 },
                  traits: [T('multi', { count: 1 }), T('rot', { decay: 0.25 }), T('expanse', { area: 0.25 }), T('linger', { duration: 0.5 }), T('amp', { dmgPct: 0.3 }), T('torment', { affliction: 0.2 })] },
    fireball:   { icon: 'fireball', tags: ['fire', 'projectile', 'area'], base: { dmg: 24, cd: 1.6, count: 1, area: 1, speed: 170, knock: 40, crit: 0.05, burn: 0.3 },
                  traits: [T('amp', { dmgPct: 0.25 }), T('expanse', { area: 0.25 }), T('multi', { count: 1 }), T('kindle', { burn: 0.25 }), T('haste', { as: 0.2 }), T('static', { spark: 0.2 })] },
    // Searing Smite: single-target fire strike; damage and crit chance build up while it is on cooldown
    smite:      { icon: 'fistfire', tags: ['fire', 'melee'], base: { dmg: 70, cd: 2.4, count: 1, area: 1, knock: 60, crit: 0.1, burn: 0.6 }, charge: true,
                  traits: [T('amp', { dmgPct: 0.3 }), T('kindle', { burn: 0.25 }), T('keen', { crit: 0.1 }), T('haste', { as: 0.2 }), T('multi', { count: 1 }), T('brittle', { fragile: 0.25 })] },
    // Thornroot: brambles erupt around the hero, rooting (slowing) and wounding what stands in them
    thorns:     { icon: 'thorns',   tags: ['physical', 'area'], base: { dmg: 7, cd: 2.6, count: 2, area: 1, duration: 4, crit: 0.05, decay: 0.2 },
                  traits: [T('multi', { count: 1 }), T('linger', { duration: 0.4 }), T('expanse', { area: 0.25 }), T('rot', { decay: 0.25 }), T('amp', { dmgPct: 0.3 }), T('haste', { as: 0.2 })] },
    // Illumination: holy pulses from the hero; cannot crit
    illumination: { icon: 'sun',    tags: ['magic', 'area'], base: { dmg: 18, cd: 1.6, area: 1, knock: 40, crit: 0 }, noCrit: true,
                  traits: [T('expanse', { area: 0.25 }), T('amp', { dmgPct: 0.3 }), T('haste', { as: 0.2 }), T('torment', { affliction: 0.2 }), T('brittle', { fragile: 0.2 }), T('twin', { count: 1 })] },
    // Prism Cascade: a bolt that bounces between enemies, cycling fire -> ice -> lightning
    prism:      { icon: 'prism', badge: 'magic', tags: ['magic', 'projectile', 'fire', 'ice', 'lightning'], base: { dmg: 14, cd: 1.5, count: 1, chain: 4, crit: 0.08, burn: 0.3, frost: 0.3, spark: 0.3 },
                  traits: [T('chain', { chain: 2 }), T('multi', { count: 1 }), T('amp', { dmgPct: 0.25 }), T('haste', { as: 0.2 }), T('keen', { crit: 0.1 }), T('elements', { burn: 0.15, frost: 0.15, spark: 0.15 })] },
    // ---- Skald-exclusive songs ----
    wardrum:    { exclusive: 'skald', icon: 'drum', tags: ['physical', 'area'], base: { dmg: 44, cd: 3.2, area: 1, knock: 140, crit: 0.05, stun: 0.25 }, beat: 4,
                  traits: [T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.25 }), T('haste', { as: 0.25 }), T('brittle', { fragile: 0.2 }), T('keen', { crit: 0.1 }), T('twin', { count: 1 })] },
    deathwall:  { exclusive: 'skald', icon: 'helm', tags: ['magic', 'summon'], base: { dmg: 40, cd: 6.3, count: 5, speed: 230, area: 1, knock: 90, crit: 0.05 }, beat: 8,
                  traits: [T('multi', { count: 2 }), T('amp', { dmgPct: 0.3 }), T('haste', { as: 0.25 }), T('torment', { affliction: 0.2 }), T('velocity', { speed: 0.3 }), T('expanse', { area: 0.25 })] },
    moshpit:    { exclusive: 'skald', icon: 'rings', tags: ['physical', 'area'], base: { dmg: 15, cd: 3.2, count: 1, area: 1, duration: 4, knock: 0, crit: 0.05 }, beat: 4,
                  traits: [T('multi', { count: 1 }), T('amp', { dmgPct: 0.3 }), T('expanse', { area: 0.25 }), T('linger', { duration: 0.4 }), T('brittle', { fragile: 0.2 }), T('haste', { as: 0.2 })] },
  };

  /* Ability Upgrades: at ability level III and VI (total trait ranks) the next level-up offers one of two
   * mechanic-changing upgrades. A third one (any leftover) opens at level IX with an Ability Signet or for the
   * Oracle. Upgrades are shared archetypes (name key up.<id>) with mods added on top of the ability's traits. */
  C.UPGRADES = {
    overpower:    { dmgPct: 0.6, as: -0.25 },
    frenzy:       { as: 0.45, dmgPct: -0.15 },
    barrage:      { count: 2, dmgPct: -0.25 },
    colossus:     { area: 0.6, dmgPct: 0.1 },
    searing:      { burn: 0.5, dmgPct: 0.1 },
    shatter:      { frost: 0.5, fragile: 0.1 },
    conductive:   { spark: 0.5, dmgPct: 0.1 },
    hexed:        { fragile: 0.3, affliction: 0.3 },
    lethal:       { crit: 0.15, dmgPct: 0.1 },
    concussive:   { stun: 0.3, knock: 60 },
    impaling:     { pierce: 3, dmgPct: 0.15 },
    enduring:     { duration: 0.7, area: 0.15 },
    echoing:      { ms: 0.6, dmgPct: -0.1 },
    blight:       { decay: 0.5, affliction: 0.15 },
    cyclone:      { orbit: 1, duration: 0.5 },
    streamfire:   { stream: 1 },
    forked:       { fork: 1 },
    cascade:      { chainRift: 1 },
    constellation:{ count: 2, speed: -0.15 },
    cataclysm:    { count: 2, area: 0.2 },
    legion:       { count: 2 },
    overcharge:   { as: 0.35, pulse: 1 },
    chainstorm:   { chain: 3 },
    luminous:     { purge: 1, area: 0.2 },
  };
  const UP = (t1, t2) => [t1, t2];
  Object.entries({
    darts: UP(['lethal', 'echoing'], ['barrage', 'impaling']),
    orbs: UP(['constellation', 'colossus'], ['overpower', 'hexed']),
    halo: UP(['searing', 'hexed'], ['colossus', 'overpower']),
    chakrams: UP(['cyclone', 'lethal'], ['barrage', 'colossus']),
    hexlance: UP(['forked', 'hexed'], ['barrage', 'frenzy']),
    hail: UP(['shatter', 'colossus'], ['barrage', 'overpower']),
    fists: UP(['concussive', 'overpower'], ['barrage', 'hexed']),
    storm: UP(['chainstorm', 'concussive'], ['conductive', 'overpower']),
    axes: UP(['overpower', 'colossus'], ['barrage', 'lethal']),
    nova: UP(['shatter', 'colossus'], ['echoing', 'overpower']),
    plague: UP(['blight', 'enduring'], ['colossus', 'hexed']),
    fireball: UP(['searing', 'colossus'], ['barrage', 'conductive']),
    wyrmfire: UP(['streamfire', 'searing'], ['colossus', 'overpower']),
    stormsphere: UP(['overcharge', 'conductive'], ['barrage', 'colossus']),
    rifts: UP(['cascade', 'colossus'], ['barrage', 'hexed']),
    skyfall: UP(['cataclysm', 'colossus'], ['searing', 'overpower']),
    golem: UP(['colossus', 'frenzy'], ['barrage', 'hexed']),
    phantom: UP(['legion', 'enduring'], ['lethal', 'frenzy']),
    avalanche: UP(['shatter', 'barrage'], ['colossus', 'overpower']),
    flail: UP(['concussive', 'colossus'], ['barrage', 'overpower']),
    smite: UP(['searing', 'lethal'], ['colossus', 'echoing']),
    thorns: UP(['blight', 'enduring'], ['colossus', 'concussive']),
    illumination: UP(['luminous', 'colossus'], ['hexed', 'overpower']),
    prism: UP(['chainstorm', 'barrage'], ['overpower', 'lethal']),
    wardrum: UP(['concussive', 'colossus'], ['echoing', 'overpower']),
    deathwall: UP(['legion', 'hexed'], ['overpower', 'lethal']),
    moshpit: UP(['enduring', 'concussive'], ['barrage', 'colossus']),
  }).forEach(([id, ups]) => { C.abilities[id].ups = ups; });
  C.UPGRADE_LEVELS = [3, 6, 9];
  C.exclusiveAbilities = Object.keys(C.abilities).filter((k) => C.abilities[k].exclusive);
  C.tomeAbilities = ['darts', 'orbs', 'halo', 'chakrams', 'hexlance', 'hail', 'fists', 'storm', 'axes', 'nova', 'plague', 'fireball', 'wyrmfire', 'stormsphere', 'rifts', 'skyfall', 'golem', 'phantom', 'avalanche', 'flail', 'smite', 'thorns', 'illumination', 'prism'];
  // unlocks follow quests: survive a hall, or deal a kind of damage in a single run
  C.lockedAbilities = {
    avalanche: 'd_stage_abyss_s8', smite: 'd_stage_abyss_s8', hail: 'd_dmg_ice', chakrams: 'd_dmg_weapon', hexlance: 'd_crits',
    wyrmfire: 'd_dmg_fire', halo: 'd_dmg_magic', golem: 'd_dmg_summon', skyfall: 'd_dmg_lightning', stormsphere: 'd_dmg_shieldbash',
    rifts: 'd_stage_catacombs_kills', phantom: 'd_dmg_physical', flail: 'd_dmg_projectile', fists: 'd_dmg_abilities',
    thorns: 'd_stage_blightmire_s5', illumination: 'd_stage_blightmire_win', prism: 'd_boss_mirebasilisk',
  };
  C.DMG_DEEDS = { fire: 40000, ice: 60000, lightning: 50000, magic: 60000, summon: 40000, physical: 120000, projectile: 150000, weapon: 60000, abilities: 400000 };
  C.TRAIT_UNLOCK_DMG = [30000, 90000, 250000, 700000]; // ability traits 3..6

  /* ------------------------------------------------------------------ */
  /* Player traits */
  C.baseTraits = {
    strength:    { icon: 'fistup',  per: { dmgPct: 0.08 } },
    vitality:    { icon: 'heart',   per: { maxHpPct: 0.12 } },
    metabolism:  { icon: 'cross',   per: { regen: 0.4 } },
    parry:       { icon: 'shield',  per: { block: 3 } },
    thickhide:   { icon: 'hide',    per: { defense: 0.04 } },
    swiftfeet:   { icon: 'boot',    per: { speedPct: 0.06 } },
    quickhands:  { icon: 'hourglass', per: { as: 0.06 } },
    reach:       { icon: 'rings',   per: { area: 0.08 } },
    magnetism:   { icon: 'magnet',  per: { pickup: 0.25 } },
    precision:   { icon: 'target',  per: { critPct: 0.1 } },
    brutality:   { icon: 'fang',    per: { critBonus: 0.15 } },
    persistence: { icon: 'candle',  per: { duration: 0.1 } },
  };
  C.elevatedTraits = {
    multistrike: { icon: 'echo',    per: { ms: 0.2 } },
    keenedge:    { icon: 'star',    per: { addCrit: 0.08 } },
    honed:       { icon: 'whet',    per: { addBase: 5 } },
    volley:      { icon: 'arrows',  per: { count: 1 } },
    summoner:    { icon: 'wisp',    per: { summonPct: 0.25, summons: 1 } },
    afflictor:   { icon: 'skull',   per: { fragile: 0.08, affliction: 0.08 } },
    elementalist:{ icon: 'elements', per: { burn: 0.08, spark: 0.08, frost: 0.08 } },
  };
  C.AFFINITY = [0.6, 1, 1.6]; // weak / normal / strong

  /* ------------------------------------------------------------------ */
  /* Heroes. affinity: base-trait strength per hero (0 weak, 1 normal, 2 strong).
   * ct: class traits — three categories, two sister variants each. w = weapon mods, s = player stat mods. */
  const CT = (k, w, s) => ({ k, w: w || {}, s: s || {} });
  /* Heroes. Base stats keep proportions (140 HP for a sturdy melee hero, 5 m/s = 70 units/s);
   * perLevel: what each level adds, after the heroes' Level Up Bonuses there (x1.5: our halls end near level 40). */
  C.heroes = {
    knight:    { weapon: 'cleave', hp: 140, speed: 70, regen: 0.2, defense: 0.05, block: 4, home: 'crypt', unlock: { free: true },
                 affinity: { vitality: 2, parry: 2, thickhide: 2, precision: 0, magnetism: 0 }, bonus: {}, perLevel: { maxHpPct: 0.0075, dmgPct: 0.0075, area: 0.003 }, mark: { regen: 0.3, maxHpPct: 0.05 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_tempo', { as: 0.25 })], st: [CT('st_sweep', { area: 0.3 }), CT('st_twin', { count: 1 })], dd: [CT('dd_guard', null, { defense: 0.05, block: 3 }), CT('dd_stride', null, { speedPct: 0.08, area: 0.05 })] } },
    ranger:    { weapon: 'longbow', hp: 105, speed: 78, regen: 0.1, defense: 0, block: 0, home: 'crypt', unlock: { deed: 'd_stage_crypt_s5', gems: 300 },
                 affinity: { precision: 2, brutality: 2, swiftfeet: 2, vitality: 0, parry: 0, thickhide: 0 }, bonus: { critBonus: 0.6 }, perLevel: { critPct: 0.0075, speedPct: 0.003, pierce: 0.03 }, mark: { addCrit: 0.1 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_crit', { crit: 0.12 })], st: [CT('st_volley', { count: 1 }), CT('st_pierce', { pierce: 2 })], dd: [CT('dd_hunt', null, { critBonus: 0.3 }), CT('dd_stride', null, { speedPct: 0.1 })] } },
    templar:   { weapon: 'judgment', hp: 125, speed: 63, regen: 1.2, defense: 0.05, block: 2, home: 'aqueduct', unlock: { deed: 'd_boss_lich', gems: 500 },
                 affinity: { metabolism: 2, vitality: 2, precision: 0, brutality: 0 }, bonus: {}, perLevel: { regen: 0.004, effectPct: 0.015 }, mark: { effectPct: 0.2 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.35 }), CT('wp_tempo', { as: 0.25 })], st: [CT('st_sweep', { area: 0.35 }), CT('st_twin', { count: 1 })], dd: [CT('dd_vigor', null, { regen: 1, maxHpPct: 0.1 }), CT('dd_arcane', null, { magicPct: 0.2 })] } },
    pyro:      { weapon: 'flamejet', hp: 105, speed: 70, regen: 0.25, defense: 0.03, block: 0, home: 'abyss', unlock: { deed: 'd_kills_run_1000', gems: 500 },
                 affinity: { quickhands: 2, persistence: 2, reach: 2, parry: 0 }, bonus: { burn: 0.1, firePct: 0.1 }, perLevel: { firePct: 0.0075, burn: 0.0015, defense: 0.0003 }, mark: { wBurn: 0.15 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_tempo', { as: 0.2 })], st: [CT('st_sweep', { area: 0.3 }), CT('st_linger', { duration: 0.4 })], dd: [CT('dd_flame', null, { burn: 0.15, firePct: 0.15 }), CT('dd_guard', null, { defense: 0.06, block: 2 })] } },
    occultist: { weapon: 'spirits', hp: 95, speed: 72, regen: 0, defense: 0, block: 0, home: 'abyss', unlock: { deed: 'd_boss_wyrm', gems: 800 },
                 affinity: { persistence: 2, reach: 2, vitality: 0, thickhide: 0, parry: 0 }, bonus: { summons: 1, summonPct: 0.15 }, perLevel: { duration: 0.012, summonPct: 0.005, defense: 0.0004 }, mark: { summonPct: 0.3 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_swarm', { count: 1 })], st: [CT('st_linger', { duration: 0.5 }), CT('st_sweep', { area: 0.35 })], dd: [CT('dd_pack', null, { summonPct: 0.3 }), CT('dd_arcane', null, { magicPct: 0.2, affliction: 0.05 })] } },
    valkyrie:  { weapon: 'shieldbash', hp: 150, speed: 64, regen: 0.3, defense: 0.04, block: 12, home: 'aqueduct', unlock: { deed: 'd_boss_horseman', gems: 800 },
                 affinity: { parry: 2, thickhide: 2, vitality: 2, swiftfeet: 0, precision: 0 }, bonus: {}, perLevel: { critBonus: 0.03, area: 0.0075 }, mark: { defense: 0.08 },
                 ct: { wp: [CT('wp_bulwark', { blockDmg: 1 }), CT('wp_tempo', { as: 0.25 })], st: [CT('st_sweep', { area: 0.3 }), CT('st_twin', { count: 1 })], dd: [CT('dd_guard', null, { block: 6, defense: 0.04 }), CT('dd_vigor', null, { maxHpPct: 0.15, regen: 0.4 })] } },
    stormwitch:{ weapon: 'arcbolt', hp: 85, speed: 76, regen: 0, defense: 0, block: 6, home: 'discord', unlock: { deed: 'd_kills_run_4000', gems: 900 },
                 affinity: { precision: 2, brutality: 2, quickhands: 2, vitality: 0, thickhide: 0 }, bonus: { spark: 0.05 }, perLevel: { ms: 0.02 }, mark: { wSpark: 0.15 },
                 ct: { wp: [CT('wp_crit', { crit: 0.12 }), CT('wp_tempo', { as: 0.25 })], st: [CT('st_chain', { chain: 2 }), CT('st_volley', { count: 1 })], dd: [CT('dd_storm', null, { spark: 0.12, lightningPct: 0.15 }), CT('dd_hunt', null, { critBonus: 0.3 })] } },
    huntress:  { weapon: 'wolves', hp: 105, speed: 76, regen: 0.3, defense: 0.03, block: 2, home: 'catacombs', unlock: { deed: 'd_boss_basilisk', gems: 1000 },
                 affinity: { swiftfeet: 2, persistence: 2, magnetism: 2, brutality: 0 }, bonus: { frost: 0.1, summons: 1 }, perLevel: { maxHpPct: 0.004, summonPct: 0.01 }, mark: { wFrost: 0.15 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_swarm', { count: 1 })], st: [CT('st_swift', { speed: 0.35 }), CT('st_linger', { duration: 0.4 })], dd: [CT('dd_pack', null, { summonPct: 0.3 }), CT('dd_frost', null, { frost: 0.12, icePct: 0.15 })] } },
    jarl:      { weapon: 'frostaxe', hp: 135, speed: 76, regen: 0.4, defense: 0.06, block: 4, home: 'catacombs', unlock: { deed: 'd_boss_jotun', gems: 1000 },
                 affinity: { strength: 2, vitality: 2, reach: 2, quickhands: 0, precision: 0 }, bonus: { icePct: 0.15 }, perLevel: { icePct: 0.0075, maxHpPct: 0.004 }, mark: { dmgPct: 0.2 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.35 }), CT('wp_tempo', { as: 0.2 })], st: [CT('st_sweep', { area: 0.35 }), CT('st_twin', { count: 1 })], dd: [CT('dd_frost', null, { frost: 0.12, icePct: 0.15 }), CT('dd_vigor', null, { maxHpPct: 0.15, regen: 0.4 })] } },
    oracle:    { weapon: 'arcaneorb', hp: 75, speed: 70, regen: 0, defense: 0, block: 0, home: 'discord', unlock: { deed: 'd_level_50', gems: 1200 },
                 affinity: { reach: 2, persistence: 2, strength: 0, parry: 0 }, bonus: { growth: 0.1 }, mark: { growth: 0.1 }, perLevel: { dmgPct: 0.03, taken: 0.01, pickup: 0.015 }, anyAbilityTrait: true,
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_swarm', { count: 1 })], st: [CT('st_sweep', { area: 0.35 }), CT('st_linger', { duration: 0.4 })], dd: [CT('dd_arcane', null, { magicPct: 0.2 }), CT('dd_stride', null, { speedPct: 0.08, pickup: 0.3 })] } },
    bloodsaint:{ weapon: 'bloodpulse', hp: 130, speed: 70, regen: 0, defense: 0.03, block: 0, home: 'blightmire', unlock: { deed: 'd_stage_crypt_a3', gems: 1500 },
                 affinity: { vitality: 2, strength: 2, metabolism: 0, parry: 0 }, bonus: { affliction: 0.1 }, perLevel: { maxHpPct: 0.0075, affliction: 0.002 }, mark: { affliction: 0.1 }, noRegen: true, afflictHeal: 0.015,
                 ct: { wp: [CT('wp_might', { dmgPct: 0.35 }), CT('wp_tempo', { as: 0.2 })], st: [CT('st_sweep', { area: 0.35 }), CT('st_twin', { count: 1 })], dd: [CT('dd_blood', null, { affliction: 0.1, maxHpPct: 0.1 }), CT('dd_arcane', null, { magicPct: 0.2, fragile: 0.05 })] } },
    skald:     { weapon: 'chord', hp: 165, speed: 84, regen: 0.3, defense: 0.03, block: 2, home: 'blightmire', unlock: { deed: 'd_stage_discord_win', gems: 1200 },
                 affinity: { quickhands: 2, reach: 2, metabolism: 2, precision: 0 }, bonus: { as: 0.05 }, perLevel: { dmgPct: 0.015, maxHpPct: 0.0075 }, mark: { as: 0.12 }, exclusive: true,
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_tempo', { as: 0.25 })], st: [CT('st_sweep', { area: 0.35 }), CT('st_twin', { count: 1 })], dd: [CT('dd_vigor', null, { maxHpPct: 0.12, regen: 0.4 }), CT('dd_arcane', null, { magicPct: 0.2 })] } },
    reaper:    { weapon: 'scythes', hp: 115, speed: 74, regen: 0.2, defense: 0.03, block: 2, home: 'reliquary', unlock: { gems: 1500, premium: true },
                 affinity: { brutality: 2, swiftfeet: 2, metabolism: 0 }, bonus: { dmgPct: 0.12 }, perLevel: { dmgPct: 0.006, speedPct: 0.002 }, mark: { dmgPct: 0.08, speedPct: 0.05 },
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_swarm', { count: 1 })], st: [CT('st_sweep', { area: 0.3 }), CT('st_swift', { speed: 0.35 })], dd: [CT('dd_hunt', null, { critBonus: 0.3, addCrit: 0.03 }), CT('dd_blood', null, { affliction: 0.1 })] } },
    landsknecht:{ weapon: 'arquebus', hp: 112, speed: 70, regen: 0.15, defense: 0.03, block: 3, home: 'discord', unlock: { deed: 'd_stage_discord_s5', gems: 1200 },
                 affinity: { thickhide: 2, parry: 0 }, bonus: { critBonus: 1.5 }, perLevel: { dmgPct: 0.0075, pierce: 0.06, critBonus: 0.0075, defense: 0.0004 }, mark: { critBonus: 0.25 }, grenades: true,
                 ct: { wp: [CT('lk_arq', { as: 0.3 }, { grenadePct: -0.15 }), CT('lk_gren', { as: -0.15 }, { grenadePct: 0.4 })], st: [CT('lk_accuracy', { pierce: 2, crit: 0.05 }, { critBonus: 0.5 }), CT('lk_impact', { dmgPct: 0.6 }, { critBonus: -0.8 })], dd: [CT('lk_grenadier', { dmgPct: -0.15 }, { grenadePct: 0.5 }), CT('lk_rifleman', { dmgPct: 0.35 }, { grenadePct: -0.15 })] } },
    alchemist: { weapon: 'concoction', hp: 115, speed: 72, regen: 0.3, defense: 0.03, block: 3, home: 'blightmire', unlock: { deed: 'd_stage_blightmire_s5', gems: 1200 },
                 affinity: { vitality: 2, metabolism: 2, swiftfeet: 2, thickhide: 2, parry: 2 }, bonus: {}, perLevel: { effectPct: 0.01, dmgPct: 0.005 }, mark: { effectPct: 0.1 }, potionBrew: true,
                 ct: { wp: [CT('wp_might', { dmgPct: 0.3 }), CT('wp_swarm', { count: 1 })], st: [CT('al_chance', null, { effectPct: 0.15 }), CT('al_strength', null, { firePct: 0.1, lightningPct: 0.1, icePct: 0.1, physPct: 0.1 })], dd: [CT('dd_flame', null, { burn: 0.12, firePct: 0.15 }), CT('dd_storm', null, { spark: 0.12, lightningPct: 0.15 })] } },
    crone:     { weapon: 'bogplants', hp: 110, speed: 70, regen: 0.4, defense: 0.04, block: 0, home: 'blightmire', unlock: { deed: 'd_stage_blightmire_k1', gems: 1400 },
                 affinity: { metabolism: 2, thickhide: 2, parry: 0 }, bonus: { summonPct: 0.1 }, perLevel: { regen: 0.004, decay: 0.002 }, mark: { decay: 0.08 }, blessing: true,
                 ct: { wp: [CT('cr_flourish', { area: 0.2 }), CT('cr_propagate', { count: 1 })], st: [CT('cr_expanding', { area: 0.1, dmgPct: 0.15 }), CT('cr_spreading', { decay: 0.2 })], dd: [CT('cr_rot', null, { decay: 0.1 }), CT('dd_vigor', null, { maxHpPct: 0.1, regen: 0.4 })] } },
  };
  C.heroOrder = ['knight', 'ranger', 'templar', 'pyro', 'occultist', 'valkyrie', 'stormwitch', 'huntress', 'jarl', 'oracle', 'bloodsaint', 'skald', 'landsknecht', 'alchemist', 'crone', 'reaper'];

  /* ------------------------------------------------------------------ */
  /* Enemies. mass drives knockback resistance, def is % damage reduction. */
  C.enemies = {
    bat:      { painter: 'bat',      hp: 5,   spd: 62, dmg: 4,  xp: 1, r: 5,  mass: 0.5, ai: 'flutter', fly: true, anim: 0.16 },
    rat:      { painter: 'rat',      hp: 6,   spd: 56, dmg: 4,  xp: 1, r: 4,  mass: 0.5, anim: 0.2 },
    skeleton: { painter: 'skeleton', hp: 13,  spd: 36, dmg: 7,  xp: 1, r: 6,  mass: 1 },
    ghoul:    { painter: 'ghoul',    hp: 28,  spd: 28, dmg: 10, xp: 2, r: 7,  mass: 1.6 },
    ghost:    { painter: 'ghost',    hp: 16,  spd: 46, dmg: 7,  xp: 2, r: 6,  mass: 0.8, ai: 'float', fly: true, alpha: 0.85 },
    spider:   { painter: 'spider',   hp: 10,  spd: 40, dmg: 6,  xp: 1, r: 6,  mass: 0.8, ai: 'dash', anim: 0.18 },
    cultist:  { painter: 'cultist',  hp: 22,  spd: 32, dmg: 8,  xp: 3, r: 6,  mass: 1, ai: 'ranged', shot: { dmg: 9, spd: 95, cd: 2.8 } },
    imp:      { painter: 'imp',      hp: 20,  spd: 58, dmg: 9,  xp: 2, r: 6,  mass: 0.8, fly: true },
    wraith:   { painter: 'ghost', variant: 'wraith', hp: 44, spd: 50, dmg: 13, xp: 4, r: 7, mass: 1.2, ai: 'float', fly: true, alpha: 0.92 },
    hknight:  { painter: 'hknight',  hp: 70,  spd: 30, dmg: 15, xp: 5, r: 7,  mass: 2.5, def: 0.2 },
    golem:    { painter: 'golem',    hp: 150, spd: 22, dmg: 18, xp: 10, r: 10, mass: 6, def: 0.25 },
    // bosses
    colossus:    { painter: 'colossus', hp: 1500, spd: 30, dmg: 22, xp: 150, r: 16, mass: 60, def: 0.15, ai: 'b_charge', boss: true },
    anguish:     { painter: 'anguish', painter2: 'anguish_foot', hp: 3000, spd: 44, dmg: 26, xp: 400, r: 17, mass: 80, def: 0.2, ai: 'b_lord', boss: true, lord: true },
    overlord:    { painter: 'overlord', hp: 1900, spd: 32, dmg: 24, xp: 180, r: 15, mass: 60, def: 0.15, ai: 'b_overlord', boss: true },
    wyrm:        { painter: 'wyrm', hp: 3400, spd: 36, dmg: 26, xp: 400, r: 18, mass: 90, def: 0.2, ai: 'b_wyrm', boss: true, lord: true, fly: true },
    lich:        { painter: 'lich', hp: 2200, spd: 34, dmg: 18, xp: 200, r: 14, mass: 40, def: 0.15, ai: 'b_caster', boss: true },
    horseman:    { painter: 'horseman', hp: 3600, spd: 50, dmg: 26, xp: 400, r: 17, mass: 80, def: 0.2, ai: 'b_horseman', boss: true, lord: true, alpha: 0.95 },
    basilisk:    { painter: 'basilisk', variant: 'ice', hp: 2200, spd: 34, dmg: 22, xp: 220, r: 16, mass: 70, def: 0.2, ai: 'b_basilisk', boss: true },
    jotun:       { painter: 'jotun', hp: 4200, spd: 30, dmg: 30, xp: 450, r: 18, mass: 120, def: 0.25, ai: 'b_jotun', boss: true, lord: true },
    discolossus: { painter: 'colossus', variant: 'purple', hp: 2600, spd: 34, dmg: 26, xp: 250, r: 16, mass: 60, def: 0.2, ai: 'b_charge', boss: true },
    archdemon:   { painter: 'demon', variant: 'purple', hp: 4600, spd: 38, dmg: 30, xp: 500, r: 18, mass: 100, def: 0.25, ai: 'b_demon', boss: true, lord: true },
    mirebasilisk:{ painter: 'basilisk', variant: 'bog', hp: 2800, spd: 36, dmg: 26, xp: 260, r: 16, mass: 70, def: 0.2, ai: 'b_basilisk', boss: true },
    rotwyrm:     { painter: 'wyrm', variant: 'bog', hp: 5200, spd: 38, dmg: 32, xp: 550, r: 18, mass: 90, def: 0.25, ai: 'b_wyrm', boss: true, lord: true, fly: true },
    echoanguish: { painter: 'anguish', painter2: 'anguish_foot', hp: 3600, spd: 46, dmg: 30, xp: 300, r: 17, mass: 80, def: 0.2, ai: 'b_lord', boss: true },
    effigy:      { painter: 'effigy', hp: 10, spd: 24, dmg: 9, xp: 3, r: 7, mass: 2, dmgFactor: 0.17, noPierce: true }, // Snow Effigy: shrugs off direct hits, not burns and frost
    pylon:       { painter: 'pylon', hp: 400, spd: 0, dmg: 0, xp: 60, r: 10, mass: 999 },
    // hall secrets: guardians and breakables (secrets.js)
    cyclops:     { painter: 'colossus', variant: 'fire', hp: 1700, spd: 34, dmg: 24, xp: 200, r: 16, mass: 60, def: 0.15, ai: 'b_charge', boss: true },
    ghoullt:     { painter: 'ghoul', variant: 'ice', hp: 1600, spd: 40, dmg: 22, xp: 200, r: 14, mass: 50, def: 0.15, ai: 'b_charge', boss: true, scale: 2.4 },
    blightworm:  { painter: 'wyrm', variant: 'bog', hp: 1900, spd: 40, dmg: 24, xp: 220, r: 15, mass: 60, def: 0.15, ai: 'b_wyrm', boss: true, fly: true, scale: 0.8 },
    sarcophagus: { painter: 'sarcophagus', hp: 900, spd: 0, dmg: 0, xp: 40, r: 12, mass: 999, noPierce: true },
    eviltree:    { painter: 'eviltree', hp: 1400, spd: 0, dmg: 0, xp: 60, r: 14, mass: 999, noPierce: true },
    custodian:   { painter: 'lich', variant: 'gold', hp: 6400, spd: 36, dmg: 34, xp: 700, r: 15, mass: 60, def: 0.3, ai: 'b_caster', boss: true, lord: true },
  };
  // Gilded Ooze: a treasure champion. Every hit deals exactly 1 damage and knocks out gold; flees and escapes after 20s.
  C.enemies.gildedooze = { painter: 'slime', variant: 'gold', hp: 1, hits: 45, spd: 40, dmg: 0, xp: 0, r: 8, mass: 99, ai: 'flee', life: 20, gilded: true, anim: 0.3 };
  /* Power-up runes smashed out of urns (duration in seconds) */
  /* Urns: one roll per urn, top to bottom; nothing special -> a single coin */
  C.BAG_SIZE = 4; // the bag holds 4 spare items found in the run; more and you must discard one
  C.URN_DROPS = [{ k: 'food', p: 0.25 }, { k: 'coins', p: 0.30 }, { k: 'herb', p: 0.10 }, { k: 'potion', p: 0.05 }, { k: 'magnet', p: 0.015 },
    { k: 'coinbag', p: 0.014 }, { k: 'ooze', p: 0.01 }, { k: 'rune_fury', p: 0.02 }, { k: 'rune_haste', p: 0.02 }, { k: 'rune_wraith', p: 0.01 }];
  C.COIN_VALUE = { coin: 2, coins: 10, coinbag: 50 }; // x the hall's gold multiplier
  C.FOOD_HEAL = 5; C.POTION_HEAL = [25, 0.05];     // food: 5 HP; Health Potion: 25 + 5% of max HP
  C.BUFFS = { fury: { dur: 15, color: '#ff3a30' }, haste: { dur: 15, color: '#ffd040' }, wraith: { dur: 10, color: '#80e8ff' } };
  /* Lord's Hex: a hidden obelisk in every hall. Touching it weakens that hall's Lord. */
  C.HEX = { hp: 0.6, dmg: 0.8, enrageAt: 90, dist: [620, 860], firstShards: 2 };
  C.OOZE_EVERY = [150, 260];
  C.ELITE = { hp: 8, dmg: 1.4, scale: 1.5, def: 0.1 };
  C.CHAMPION = { hp: 18, dmg: 1.7, scale: 1.8, def: 0.2 };

  /* ------------------------------------------------------------------ */
  /* Spawn timeline (shared); stages remap enemy types and tint them with a variant. */
  C.timeline = [
    { t: 0,   rate: 1.0, mix: { bat: 3, skeleton: 2, rat: 1 } },
    { t: 40,  rate: 1.6, mix: { bat: 2, skeleton: 4, rat: 1 } },
    { t: 80,  rate: 2.1, mix: { skeleton: 4, ghoul: 2, bat: 1 } },
    { t: 130, rate: 2.7, mix: { skeleton: 3, ghoul: 2, ghost: 3 } },
    { t: 180, rate: 3.1, mix: { ghoul: 3, ghost: 2, spider: 3 } },
    { t: 240, rate: 3.7, mix: { skeleton: 3, ghoul: 3, cultist: 1, spider: 2 } },
    { t: 300, rate: 3.0, mix: { skeleton: 4, ghost: 2 } },
    { t: 330, rate: 4.5, mix: { ghoul: 3, wraith: 2, cultist: 1, ghost: 2, hknight: 1 } },
    { t: 420, rate: 5.1, mix: { wraith: 3, ghoul: 2, golem: 1, skeleton: 3, hknight: 1 } },
    { t: 480, rate: 5.9, mix: { wraith: 3, golem: 1, cultist: 2, bat: 4, hknight: 2 } },
    { t: 540, rate: 6.7, mix: { wraith: 4, golem: 2, ghoul: 3, spider: 2, hknight: 2 } },
    { t: 600, rate: 2.0, mix: { skeleton: 3, bat: 3, wraith: 1 } },
  ];
  C.events = [
    { t: 30, type: 'elite', enemy: 'skeleton' },
    { t: 60, type: 'swarm', enemy: 'bat', count: 26 },
    { t: 95, type: 'elite', enemy: 'ghoul' },
    { t: 130, type: 'champion', enemy: 'ghoul' },
    { t: 160, type: 'elite', enemy: 'ghost' },
    { t: 200, type: 'ring', enemy: 'skeleton', count: 34 },
    { t: 230, type: 'elite', enemy: 'spider' },
    { t: 270, type: 'champion', enemy: 'cultist' },
    { t: 360, type: 'swarm', enemy: 'bat', count: 40 },
    { t: 385, type: 'elite', enemy: 'wraith' },
    { t: 420, type: 'champion', enemy: 'hknight' },
    { t: 450, type: 'elite', enemy: 'golem' },
    { t: 470, type: 'ring', enemy: 'ghoul', count: 40 },
    { t: 510, type: 'elite', enemy: 'wraith' },
    { t: 540, type: 'champion', enemy: 'golem' },
    { t: 560, type: 'swarm', enemy: 'bat', count: 50 },
    { t: 580, type: 'elite', enemy: 'hknight' },
  ];

  /* ------------------------------------------------------------------ */
  /* Stages. theme colours are RGB arrays for the procedural floor. */
  C.stages = {
    crypt: { index: 0, agonyXp: 0.529, hpMult: 1, dmgMult: 1, goldMult: 1, variant: null, remap: {}, herb: 'moss',
      bosses: [{ t: 300, id: 'colossus' }, { t: 600, id: 'anguish', final: true }],
      theme: { floorA: [66, 60, 74], floorB: [52, 47, 60], mortar: [20, 17, 26], moss: [70, 104, 58], dark: [7, 5, 12], darkness: 0.84, lightTint: 'rgba(255,170,90,', accent: '#e8a050', accentRate: 0.12 } },
    abyss: { index: 1, agonyXp: 0.31, hpMult: 1.9, dmgMult: 1.45, goldMult: 1.6, variant: 'fire', remap: { ghost: 'imp', rat: 'bat' }, herb: 'ember',
      bosses: [{ t: 300, id: 'overlord' }, { t: 600, id: 'wyrm', final: true }],
      theme: { floorA: [78, 46, 40], floorB: [60, 34, 32], mortar: [24, 8, 8], moss: [200, 70, 20], dark: [14, 4, 4], darkness: 0.78, lightTint: 'rgba(255,120,60,', accent: '#ff6a3a', lava: true, accentRate: 0.1, blood: '#3a0404' } },
    aqueduct: { index: 2, agonyXp: 0.24, hpMult: 3.0, dmgMult: 1.85, goldMult: 2.2, variant: 'drowned', remap: { spider: 'rat' }, herb: 'lily', bridge: 110,
      bosses: [{ t: 300, id: 'lich' }, { t: 600, id: 'horseman', final: true }],
      theme: { floorA: [58, 76, 78], floorB: [44, 60, 62], mortar: [12, 22, 24], moss: [60, 130, 110], dark: [3, 10, 12], darkness: 0.8, lightTint: 'rgba(140,255,220,', accent: '#70ffd0', pools: [30, 70, 80], accentRate: 0.14 } },
    catacombs: { index: 3, agonyXp: 0.395, hpMult: 4.3, dmgMult: 2.3, goldMult: 3, variant: 'ice', remap: { spider: 'effigy' }, herb: 'lily',
      bosses: [{ t: 300, id: 'basilisk' }, { t: 600, id: 'jotun', final: true }],
      theme: { floorA: [60, 74, 96], floorB: [46, 58, 78], mortar: [14, 20, 32], moss: [150, 200, 230], dark: [4, 8, 18], darkness: 0.8, lightTint: 'rgba(150,210,255,', accent: '#7fd0ff', crystals: [140, 220, 255], accentRate: 0.14 } },
    discord: { index: 4, agonyXp: 0.13, hpMult: 6.0, dmgMult: 2.8, goldMult: 3.8, variant: 'purple', remap: { rat: 'bat', ghoul: 'hknight' }, herb: 'ember', dissonator: true,
      bosses: [{ t: 300, id: 'discolossus' }, { t: 600, id: 'archdemon', final: true }],
      theme: { floorA: [68, 52, 84], floorB: [52, 38, 66], mortar: [18, 10, 26], moss: [170, 80, 200], dark: [10, 4, 16], darkness: 0.82, lightTint: 'rgba(230,140,255,', accent: '#e080ff', crystals: [220, 110, 255], accentRate: 0.1 } },
    blightmire: { index: 5, agonyXp: 0.13, hpMult: 8.0, dmgMult: 3.3, goldMult: 4.6, variant: 'bog', remap: { cultist: 'spider', bat: 'bat' }, herb: 'moss', lordKills: 3000,
      bosses: [{ t: 300, id: 'mirebasilisk' }, { t: 600, id: 'rotwyrm', final: true }],
      theme: { floorA: [64, 70, 46], floorB: [50, 54, 36], mortar: [16, 18, 8], moss: [120, 150, 40], dark: [6, 8, 2], darkness: 0.82, lightTint: 'rgba(200,255,120,', accent: '#b0ff50', pools: [50, 70, 30], accentRate: 0.22, blood: '#2a3a0a' } },
    reliquary: { index: 6, agonyXp: 0.1, hpMult: 10, dmgMult: 3.6, goldMult: 6, variant: 'gold', remap: { rat: 'hknight', bat: 'ghost' }, herb: 'dust', vault: true,
      bosses: [{ t: 300, id: 'echoanguish' }, { t: 600, id: 'custodian', final: true }],
      theme: { floorA: [96, 88, 74], floorB: [78, 70, 58], mortar: [30, 24, 16], moss: [230, 200, 120], dark: [10, 8, 4], darkness: 0.8, lightTint: 'rgba(255,230,160,', accent: '#fff0a0', crystals: [255, 230, 140], accentRate: 0.1 } },
  };
  /* Hall rules (js/game/halls.js) */
  C.BOG_FALLBACK = 900;          // the Blightmire's Lord comes at 3000 kills, or at 15:00 at the latest
  C.DISSO = { relays: 8, step: 190, srcDist: 520, touch: 12, pulse: 5, lordDmg: 0.04, hordeDmg: 0.6, radius: 110 }; // Halls of Discord light puzzle
  C.VAULT = { every: 80, max: 7, def: 0.04, pylonDist: 120, pylonHp: 0.06 }; // torment level every 80 s: +4% enemy defense each
  C.stageOrder = ['crypt', 'abyss', 'aqueduct', 'catacombs', 'discord', 'blightmire', 'reliquary'];

  /* XP: gems worth 1 / 10 / 100 / 1000. */
  C.GEM_TIERS = [[1000, 'gem1000'], [100, 'gem100'], [10, 'gem10'], [1, 'gem1']];
  /* XP to go from level L to L+1: per-hall formula, floor((fa·xa^L + fb·xb^L + k_lin)·L + k_base),
   * scaled to this game's gem values and 10-minute halls (XP_SCALE). The fb·1.04^L term dominates late levels. */
  C.XP_CURVE = {
    crypt:      [15, 0.95, 10, 1.04, 4, -1],
    abyss:      [25, 0.95, 10, 1.04, 5, 1],
    aqueduct:   [35, 0.95, 10, 1.04, 6, 3],
    catacombs:  [45, 0.95, 10, 1.04, 7, 4],
    discord:    [55, 0.95, 10, 1.04, 8, 5],
    blightmire: [55, 0.95, 10, 1.04, 8, 5],
    reliquary:  [60, 0.96, 10, 1.04, 10, 6],
  };
  C.XP_SCALE = 0.22;  // a hall ends near level 41 (was ~45): fewer, better-spaced level-ups
  C.SCROLL_DROP = 0.5; // Elites and Champions drop a Scroll of Mastery half the time (+15% per miss)
  C.xpToNext = (L, stageId) => {
    const [fa, xa, fb, xb, kl, kb] = C.XP_CURVE[stageId] || C.XP_CURVE.crypt;
    return Math.max(3, Math.floor(((fa * Math.pow(xa, L) + fb * Math.pow(xb, L) + kl) * L + kb) * C.XP_SCALE));
  };

  /* Agony (dynamic difficulty after a stage is cleared) */
  C.AGONY_MAX = 5;

  DH.content = C;
})(window.DH);
