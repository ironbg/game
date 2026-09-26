/* Meta-game economy data: permanent upgrades, gear, chests, missions,
 * achievements, season pass, login calendar and store catalogue. */
(function (DH) {
  'use strict';
  const E = {};

  /* ---------- Shrine (permanent gold upgrades) ---------- */
  E.shrine = {
    might:    { icon: 'fistup',    per: { dmgPct: 0.05 },   max: 10, cost: 300,  growth: 1.45, unlock: 'd_level_30' },
    vitality: { icon: 'heart',     per: { maxHpPct: 0.08 }, max: 10, cost: 250,  growth: 1.45 },
    armor:    { icon: 'hide',      per: { defense: 0.02 },  max: 5,  cost: 600,  growth: 1.8 },
    fortitude:{ icon: 'shield',    per: { block: 1.5 },     max: 5,  cost: 700,  growth: 1.8, unlock: 'd_stage_crypt_s8' },
    recovery: { icon: 'cross',     per: { regen: 0.2 },     max: 5,  cost: 500,  growth: 1.7, unlock: 'd_brew_1' },
    swiftness:{ icon: 'boot',      per: { speedPct: 0.04 }, max: 5,  cost: 400,  growth: 1.7 },
    haste:    { icon: 'hourglass', per: { as: 0.03 },       max: 5,  cost: 700,  growth: 1.75, unlock: 'd_kills_run_1000' },
    reach:    { icon: 'rings',     per: { area: 0.05 },     max: 5,  cost: 500,  growth: 1.7 },
    magnet:   { icon: 'magnet',    per: { pickup: 0.12 },   max: 5,  cost: 300,  growth: 1.6 },
    greed:    { icon: 'i_gold',    per: { greed: 0.08 },    max: 10, cost: 400,  growth: 1.5, unlock: 'd_elites_50' },
    wisdom:   { icon: 't_wisdom',  per: { growth: 0.06 },   max: 5,  cost: 500,  growth: 1.7, unlock: 'd_tomes_20' },
    luck:     { icon: 'target',    per: { critPct: 0.05 },  max: 5,  cost: 600,  growth: 1.7, unlock: 'd_crits' },
    revival:  { icon: 'i_revive',  per: { revives: 1 },     max: 2,  cost: 6000, growth: 3, unlock: 'd_stage_crypt_s3' },
    reroll:   { icon: 'i_reroll',  per: { rerolls: 1 },     max: 3,  cost: 1500, growth: 2.2, unlock: 'd_champions_10' },
  };
  // unlock: the deed that opens a Blessing (as Blessings open with quests); the rest are open from the start
  E.shrineOrder = Object.keys(E.shrine);
  E.shrineCost = (id, level) => Math.floor(E.shrine[id].cost * Math.pow(E.shrine[id].growth, level) / 10) * 10;

  /* ---------- Gear: 7 slots, named items, 6 rarities ---------- */
  E.rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  E.rarityColor = ['#b8b2a7', '#5fd06a', '#4aa3ff', '#b366ff', '#ffb52e', '#ff4a4a'];
  E.rarityMult = [1, 1.5, 2.2, 3.2, 4.6, 6.5];
  E.rarityMaxLevel = [10, 15, 20, 30, 40, 50];
  E.slots = ['head', 'neck', 'chest', 'hands', 'feet', 'ring1', 'ring2'];
  E.slotOf = (type) => E.gear[type].slot === 'ring' ? 'ring' : E.gear[type].slot;
  E.gear = {
    gale_circlet:     { slot: 'head',  stats: { as: 0.02 },               special: { killAs: 0.004, killAsMax: 0.1 } },
    brawler_band:     { slot: 'head',  stats: { maxHpPct: 0.03 },         special: { eliteHeal: 0.06 } },
    warden_helm:      { slot: 'head',  stats: { defense: 0.025, block: 1 } },
    crimson_chalice:  { slot: 'neck',  stats: { dmgPct: 0.05 },           special: { killHealChance: 0.02 } },
    jade_talisman:    { slot: 'neck',  stats: { growth: 0.06 } },
    wrath_amulet:     { slot: 'neck',  stats: { dmgPct: 0.06 } },
    gore_tunic:       { slot: 'chest', stats: { maxHpPct: 0.04 },         special: { killHeal: 0.03 } },
    stalwart_cuirass: { slot: 'chest', stats: { defense: 0.03 },          special: { hitRegen: 1.5 } },
    stillhunter_garb: { slot: 'chest', stats: { critPct: 0.05 },          special: { stillDmg: 0.1 } },
    blazing_shell:    { slot: 'chest', stats: { firePct: 0.04 },          special: { thornBurn: 0.1 } },
    defiant_plate:    { slot: 'chest', stats: { defense: 0.02 },          special: { hitDefense: 0.01 } },
    stalker_grips:    { slot: 'hands', stats: { ms: 0.07 } },
    spark_gauntlets:  { slot: 'hands', stats: { firePct: 0.06 },          special: { fireSpark: 0.08 } },
    duelist_ember:    { slot: 'hands', stats: { critBonus: 0.08, addCrit: 0.015 } },
    tempo_treads:     { slot: 'feet',  stats: { as: 0.025, speedPct: 0.025 } },
    striders:         { slot: 'feet',  stats: { speedPct: 0.05 } },
    grave_walkers:    { slot: 'feet',  stats: { pickup: 0.12, regen: 0.15 } },
    oak_band:         { slot: 'ring',  stats: { addCrit: 0.02 } },
    bronze_loop:      { slot: 'ring',  stats: { critBonus: 0.08 } },
    steel_signet:     { slot: 'ring',  stats: { addBase: 1.5 } },
    infernal_pact:    { slot: 'ring',  stats: { summonPct: 0.05 },        special: { imps: 1 } },
    greed_signet:     { slot: 'ring',  stats: { greed: 0.06, growth: 0.02 } },
    aegis_ring:       { slot: 'ring',  stats: { block: 1.2 } },
    // Ability Signets: each allows extra upgrade picks (and one extra rank) for abilities of its element
    signet_flame:     { slot: 'ring',  stats: { firePct: 0.03 },          special: { sig_fire: 1 },      signet: 'fire' },
    signet_frost:     { slot: 'ring',  stats: { icePct: 0.03 },           special: { sig_ice: 1 },       signet: 'ice' },
    signet_storm:     { slot: 'ring',  stats: { lightningPct: 0.03 },     special: { sig_lightning: 1 }, signet: 'lightning' },
    signet_arcana:    { slot: 'ring',  stats: { magicPct: 0.03 },         special: { sig_magic: 1 },     signet: 'magic' },
    signet_steel:     { slot: 'ring',  stats: { physPct: 0.03 },          special: { sig_physical: 1 },  signet: 'physical' },
    signet_legion:    { slot: 'ring',  stats: { summonPct: 0.03 },        special: { sig_summon: 1 },    signet: 'summon' },
  };
  E.gearOrder = Object.keys(E.gear);
  E.STARTER_GEAR = ['wrath_amulet', 'striders', 'oak_band', 'warden_helm', 'gore_tunic', 'tempo_treads'];
  E.gearStat = (type, rarity, level) => {
    const out = {}; const g = E.gear[type];
    for (const k in g.stats) out[k] = g.stats[k] * E.rarityMult[rarity] * (1 + 0.1 * (level - 1));
    return out;
  };
  E.gearSpecial = (type, rarity) => {
    const sp = E.gear[type].special; if (!sp) return null;
    const out = {}; for (const k in sp) out[k] = sp[k] * E.rarityMult[rarity];
    return out;
  };
  E.gearLevelCost = (rarity, level) => Math.floor(60 * Math.pow(level, 1.35) * (1 + rarity * 0.6) / 5) * 5;
  /* Wellkeeper redemption price for items sent up the Well */
  E.wellPrice = (rarity) => [300, 700, 1600, 3500, 8000, 18000][rarity];
  E.wellGems = (rarity) => [10, 20, 40, 80, 150, 300][rarity];
  E.WELL_MAX = 12;

  /* ---------- Potions (Apothecary) & ingredients ---------- */
  E.herbs = ['moss', 'ember', 'lily'];
  E.potions = {
    remembrance: { recipe: { moss: 3, lily: 2 }, gold: 500, gems: 40, unlock: 'd_boss_colossus' },
    resonance:   { recipe: { ember: 3, moss: 2 }, gold: 800, gems: 60, unlock: 'd_stage_abyss_win' },
    lethe:       { recipe: { lily: 2, ember: 2 }, gold: 400, gems: 25, unlock: 'd_stage_crypt_win' },
  };
  E.potionOrder = ['remembrance', 'resonance', 'lethe'];
  E.POTION_USES_PER_RUN = 2;

  /* ---------- Altar of Anguish: artifacts raise the Dread Rank ---------- */
  E.artifacts = {
    hourglass: { rank: 2, unlock: 'd_stage_crypt_win',      fx: { runLength: 0.7, spawn: 1.4 } },
    exchange:  { rank: 2, unlock: 'd_stage_abyss_win',      fx: { swapCrit: 1 } },
    bloodmoon: { rank: 3, unlock: 'd_stage_aqueduct_win',   fx: { elites: 2 } },
    ironhorde: { rank: 3, unlock: 'd_boss_anguish',         fx: { enemyHp: 1.6 } },
    famine:    { rank: 2, unlock: 'd_stage_catacombs_win',  fx: { heal: 0.5 } },
    frenzy:    { rank: 2, unlock: 'd_stage_discord_win',    fx: { enemySpeed: 1.25 } },
    glasssoul: { rank: 3, unlock: 'd_stage_blightmire_win', fx: { maxHp: 0.6 } },
  };
  E.artifactOrder = Object.keys(E.artifacts);
  E.DREAD = { gold: 0.1, hp: 0.06 };

  /* ---------- The Archivist: permanent upgrades bought with Lament Shards (dropped by Lords) ---------- */
  E.archive = {
    vigor:     { icon: 'heart',     per: { maxHpPct: 0.04 }, max: 10, cost: 1, step: 1 },
    ferocity:  { icon: 'fistup',    per: { dmgPct: 0.04 },   max: 10, cost: 1, step: 1 },
    precision: { icon: 'target',    per: { addCrit: 0.01 },  max: 5,  cost: 2, step: 1 },
    celerity:  { icon: 'hourglass', per: { as: 0.03 },       max: 5,  cost: 2, step: 1 },
    expanse:   { icon: 'rings',     per: { area: 0.04 },     max: 5,  cost: 2, step: 1 },
    bulwark:   { icon: 'shield',    per: { block: 1.5 },     max: 5,  cost: 2, step: 1 },
    resolve:   { icon: 'hide',      per: { defense: 0.015 }, max: 5,  cost: 2, step: 2 },
    insight:   { icon: 't_wisdom',  per: { growth: 0.04 },   max: 5,  cost: 2, step: 1 },
    fortune:   { icon: 'i_reroll',  per: { rerolls: 1 },     max: 2,  cost: 4, step: 4 },
    legion:    { icon: 'orbs',      per: { count: 1 },       max: 1,  cost: 14, step: 0 },
  };
  E.archiveOrder = Object.keys(E.archive);
  E.archiveCost = (id, level) => E.archive[id].cost + E.archive[id].step * level;

  /* ---------- Main quests: a guided path through the deeds, each pays out gems ---------- */
  E.mainQuests = [
    ['d_stage_crypt_s3', 30], ['d_stage_crypt_s5', 30], ['d_boss_colossus', 40], ['d_hero_knight_l20', 30], ['d_stage_crypt_win', 60],
    ['d_brew_1', 30], ['d_stage_abyss_s5', 40], ['d_well_1', 40], ['d_secret_crypt', 50], ['d_stage_abyss_win', 80],
    ['d_stage_crypt_a1', 60], ['d_level_50', 60], ['d_stage_aqueduct_win', 100], ['d_champions_10', 60], ['d_dread_4', 80],
    ['d_stage_catacombs_win', 120], ['d_stage_discord_win', 150], ['d_stage_blightmire_win', 180], ['d_stage_reliquary_win', 250],
  ];

  /* ---------- Chests ---------- */
  E.chests = {
    wood:   { icon: 'c_wood',   price: { gold: 1500 }, odds: [70, 25, 5, 0, 0, 0],           adEveryMs: 4 * 3600e3 },
    silver: { icon: 'c_silver', price: { gems: 150 },  odds: [0, 55, 35, 9, 1, 0] },
    gold:   { icon: 'c_gold',   price: { gems: 400 },  odds: [0, 0, 60, 32.5, 7, 0.5], pity: 10, x10: 3600 },
  };

  /* ---------- Daily missions ---------- */
  E.missionPool = [
    { id: 'kills',    target: 400,  reward: { gold: 600, passXp: 60 } },
    { id: 'kills2',   stat: 'kills', target: 1500, reward: { gems: 15, passXp: 90 } },
    { id: 'runs',     target: 2,    reward: { gold: 500, passXp: 60 } },
    { id: 'survive',  target: 300,  reward: { gems: 10, passXp: 80 } },
    { id: 'level',    target: 20,   reward: { gold: 800, passXp: 70 } },
    { id: 'boss',     target: 1,    reward: { gems: 20, passXp: 100 } },
    { id: 'gold',     target: 400,  reward: { energy: 10, passXp: 60 } },
    { id: 'chest',    target: 1,    reward: { gold: 700, passXp: 60 } },
    { id: 'ads',      target: 2,    reward: { gems: 15, passXp: 80 } },
    { id: 'upgrade',  target: 2,    reward: { gold: 600, passXp: 60 } },
    { id: 'elites',   target: 3,    reward: { gems: 10, passXp: 70 } },
  ];
  E.MISSIONS_PER_DAY = 5;
  E.missionBonus = { chest: 'silver', gems: 30, passXp: 150 };
  E.missionPool.push({ id: 'tomes', target: 3, reward: { gold: 600, passXp: 60 } }, { id: 'champions', target: 1, reward: { gems: 15, passXp: 80 } });

  /* ---------- Achievements (tiered) ---------- */
  E.achievements = [
    { id: 'slayer',    stat: 'kills',        tiers: [500, 5000, 25000, 100000, 500000], gems: [20, 40, 80, 150, 300] },
    { id: 'survivor',  stat: 'wins',         tiers: [1, 5, 20, 50, 150],                 gems: [30, 50, 100, 200, 400] },
    { id: 'bosshunter',stat: 'bossKills',    tiers: [1, 10, 40, 100, 300],               gems: [20, 40, 80, 150, 300] },
    { id: 'elitehunter',stat: 'eliteKills',  tiers: [5, 50, 200, 800],                   gems: [15, 40, 80, 150] },
    { id: 'hoarder',   stat: 'goldEarned',   tiers: [5000, 50000, 250000, 1000000],      gems: [20, 50, 100, 250] },
    { id: 'ascendant', stat: 'maxLevel',     tiers: [15, 30, 45, 60],                    gems: [15, 40, 80, 150] },
    { id: 'veteran',   stat: 'runs',         tiers: [3, 20, 75, 250, 1000],              gems: [15, 30, 60, 120, 250] },
    { id: 'heroes',    stat: 'heroesOwned',  tiers: [2, 3, 4, 5],                        gems: [30, 60, 100, 200] },
    { id: 'blacksmith',stat: 'itemsMerged',  tiers: [1, 10, 40, 120],                    gems: [20, 50, 100, 200] },
    { id: 'opener',    stat: 'chestsOpened', tiers: [3, 20, 80, 300],                    gems: [15, 40, 80, 150] },
    { id: 'faithful',  stat: 'loginDays',    tiers: [3, 7, 30, 100],                     gems: [20, 50, 150, 400] },
    { id: 'devotee',   stat: 'shrineLevels', tiers: [5, 20, 45, 75],                     gems: [20, 50, 100, 200] },
    { id: 'patron',    stat: 'adsWatched',   tiers: [5, 25, 100, 300],                   gems: [15, 40, 80, 150] },
    { id: 'conqueror', stat: 'stagesCleared',tiers: [1, 2, 3],                           gems: [50, 150, 300] },
  ];

  /* ---------- Season pass ---------- */
  E.PASS_TIERS = 30;
  E.PASS_XP_PER_TIER = 300;
  E.PASS_TIER_GEM_COST = 90;
  E.passRewards = (function () {
    const free = [], prem = [];
    for (let i = 1; i <= 30; i++) {
      // free track
      if (i % 10 === 0) free.push({ chest: 'gold' });
      else if (i % 5 === 0) free.push({ chest: 'silver' });
      else if (i % 3 === 0) free.push({ gems: 20 + i * 2 });
      else if (i % 2 === 0) free.push({ energy: 10 });
      else free.push({ gold: 400 + i * 80 });
      // premium track
      if (i === 1) prem.push({ hero: 'reaper' });
      else if (i === 30) prem.push({ gear: { rarity: 5 } });
      else if (i % 10 === 0) prem.push({ gear: { rarity: 4 } });
      else if (i % 5 === 0) prem.push({ chest: 'gold' });
      else if (i % 3 === 0) prem.push({ gems: 60 + i * 4 });
      else if (i % 2 === 0) prem.push({ chest: 'silver' });
      else prem.push({ gold: 1500 + i * 200 });
    }
    return { free, prem };
  })();

  /* ---------- 7-day login calendar ---------- */
  E.loginRewards = [
    { gold: 1000 }, { gems: 25 }, { energy: 20 }, { gold: 3000 }, { chest: 'silver' }, { gems: 60 }, { chest: 'gold' },
  ];

  /* ---------- Vigil (idle) rewards ---------- */
  E.VIGIL_CAP_MS = 12 * 3600e3;
  E.vigilRates = (stagesCleared) => ({ goldPerMin: 6 + stagesCleared * 6, xpPerMin: 1 + stagesCleared });
  E.QUICK_VIGIL_MS = 2 * 3600e3;
  E.QUICK_VIGIL_ADS = 3;
  E.QUICK_VIGIL_GEMS = 40;

  /* ---------- Energy ---------- */
  E.ENERGY_MAX = 30;
  E.ENERGY_REGEN_MS = 6 * 60e3;
  E.ENERGY_AD_AMOUNT = 10;
  E.ENERGY_AD_LIMIT = 3;
  E.ENERGY_GEM_COST = 50;
  E.ENERGY_GEM_AMOUNT = 30;

  /* ---------- Revive ---------- */
  E.REVIVE_GEMS = [150, 300, 600]; // gem revives per run: each costs double the last, three at most

  /* ---------- Free gems via ads ---------- */
  E.FREE_GEM_ADS = 5;
  E.FREE_GEM_AMOUNT = 10;

  /* ---------- Account level ---------- */
  E.accountXpNext = (lvl) => 100 + (lvl - 1) * 60;
  E.accountLevelReward = (lvl) => ({ gems: 20 + lvl * 2, gold: 300 * lvl });

  /* ---------- Store catalogue (real money) ----------
   * Prices are placeholders in USD. On a real store the platform returns
   * localized prices; see js/services/iap.js. */
  E.products = {
    gems_1: { type: 'gems', gems: 80,    price: 0.99,  icon: 'gems_s' },
    gems_2: { type: 'gems', gems: 450,   price: 4.99,  icon: 'gems_m', bonus: 10 },
    gems_3: { type: 'gems', gems: 1000,  price: 9.99,  icon: 'gems_m', bonus: 20, tag: 'popular' },
    gems_4: { type: 'gems', gems: 2200,  price: 19.99, icon: 'gems_l', bonus: 30 },
    gems_5: { type: 'gems', gems: 6000,  price: 49.99, icon: 'gems_l', bonus: 50 },
    gems_6: { type: 'gems', gems: 13500, price: 99.99, icon: 'gems_xl', bonus: 70, tag: 'best' },
    starter:  { type: 'bundle', price: 1.99, once: true, grant: { gems: 300, gold: 10000, gear: { rarity: 3 }, energy: 30 }, value: 800 },
    noads:    { type: 'noads', price: 4.99, once: true },
    soulcard: { type: 'sub', price: 4.99, grant: { gems: 300 }, daily: { gems: 100, energy: 10 }, days: 30 },
    pass:     { type: 'pass', price: 9.99 },
    reaper:   { type: 'bundle', price: 4.99, once: true, grant: { hero: 'reaper', gems: 500, chest: 'gold' }, value: 400 },
    legend:   { type: 'bundle', price: 19.99, once: true, grant: { gems: 2500, gear: { rarity: 4 }, chest: 'gold', gold: 50000 }, value: 500 },
  };
  E.gemPackOrder = ['gems_1', 'gems_2', 'gems_3', 'gems_4', 'gems_5', 'gems_6'];

  /* Gold for gems */
  E.goldPacks = [
    { id: 'gold_s', gems: 60,  gold: 4000 },
    { id: 'gold_m', gems: 250, gold: 18000 },
    { id: 'gold_l', gems: 600, gold: 48000 },
  ];

  /* Daily deals: rotated every day. kind: ad (free with ad), gold, gems */
  E.dealPool = [
    { id: 'd_gold_ad',   cost: { ad: 1 },     grant: { gold: 1500 } },
    { id: 'd_gems_ad',   cost: { ad: 1 },     grant: { gems: 15 } },
    { id: 'd_energy_ad', cost: { ad: 1 },     grant: { energy: 15 } },
    { id: 'd_gear_rare', cost: { gems: 90 },  grant: { gear: { rarity: 2 } } },
    { id: 'd_gear_epic', cost: { gems: 280 }, grant: { gear: { rarity: 3 } } },
    { id: 'd_silver',    cost: { gold: 9000 },grant: { chest: 'silver' } },
    { id: 'd_gear_unc',  cost: { gold: 4000 },grant: { gear: { rarity: 1 } } },
    { id: 'd_energy',    cost: { gems: 30 },  grant: { energy: 30 } },
    { id: 'd_gold_big',  cost: { gems: 120 }, grant: { gold: 12000 } },
  ];

  /* Ads */
  E.INTERSTITIAL_EVERY = 3; // runs between interstitials (skipped with No Ads)

  DH.economy = E;
})(window.DH);
