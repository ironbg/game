/* Artifacts.
 * Lords drop Artifacts when Agony is on. Each hall has one guaranteed Hall Artifact; Generic ones drop with
 * chance min(1, 0.6 + 0.015 x uncollected generics). Some can only drop in a given hall or for a given hero,
 * a few are unlocked by deeds. Every active Artifact adds +1 Torment Rank, which scales the enemies
 * (see E.TORMENT) and improves gold, loot and Lament Shards.
 *   hall:  guaranteed Hall Artifact of that stage       only: can only drop in that stage
 *   hero:  can only drop for that hero                   deed: unlocked by completing that deed
 *   fx:    run modifiers read by js/game/artifacts.js    icon: [glyph, colour] for the altar */
(function (DH) {
  'use strict';
  const E = DH.economy;
  const A = (o) => Object.assign({ generic: !o.hall && !o.deed && !o.only && !o.hero }, o);
  E.artifacts = {
    // ---- Hall Artifacts ----
    sands:     A({ hall: 'crypt', fx: { runLength: 0.7, spawn: 1.3, allSpeed: 1.2 }, icon: ['hourglass', '#c07030'] }),
    magma:     A({ hall: 'abyss', fx: { magma: 1 }, icon: ['flame', '#d04010'] }),
    banner:    A({ hall: 'aqueduct', fx: { spawn: 1.4 }, icon: ['banner', '#7a2a9a'] }),
    mirror:    A({ hall: 'catacombs', generic: true, fx: { mirror: 1 }, icon: ['mirror', '#6aa8d8'] }),
    chime:     A({ hall: 'discord', fx: { traps: 1 }, icon: ['bell', '#3a2a4a'] }),
    bog:       A({ hall: 'blightmire', fx: { bog: 1 }, icon: ['totem', '#6a8a2a'] }),
    thread:    A({ hall: 'reliquary', fx: { thread: 1 }, icon: ['thread', '#c8a040'] }),
    // ---- Generic ----
    idol:      A({ fx: { idol: 1 }, icon: ['golem', '#8a7a5a'] }),
    wheel:     A({ fx: { agonyGain: 2 }, icon: ['wheel', '#b01828'] }),
    star:      A({ fx: { star: 1 }, icon: ['star', '#60c0ff'] }),
    darkness:  A({ fx: { darkness: 1 }, icon: ['moon', '#30203a'] }),
    gaze:      A({ fx: { gaze: 1 }, icon: ['eye', '#c02838'] }),
    scorch:    A({ fx: { scorch: 0.2 }, icon: ['fistfire', '#e05020'] }),
    scales:    A({ fx: { playerDmg: 1, enemyDmg: 1.5 }, icon: ['scales', '#c8a040'] }),
    lens:      A({ fx: { allSpeed: 0.87 }, icon: ['lens', '#5a8aa0'] }),
    cube:      A({ fx: { cube: 1 }, icon: ['cube', '#8a1a2a'] }),
    urn:       A({ fx: { urn: 0.06 }, icon: ['wisp', '#5a4a7a'] }),
    stone:     A({ fx: { burden: 0.03 }, icon: ['stone', '#6a6a72'] }),
    scarab:    A({ fx: { scarab: 1 }, icon: ['scarab', '#4a3a6a'] }),
    edict:     A({ fx: { edict: 1 }, icon: ['scroll', '#8a6a4a'] }),
    regret:    A({ fx: { regret: 0.002 }, icon: ['mask', '#8a8a9a'] }),
    hunger:    A({ fx: { heal: 0.5 }, icon: ['drop', '#6a5a3a'] }),
    odice:     A({ fx: { randomTomes: 1 }, icon: ['dice', '#2a2a3a'] }),
    veil:      A({ fx: { deedXp: 0.5 }, icon: ['book', '#4a4a6a'] }),
    vice:      A({ fx: { vice: 1 }, icon: ['heart', '#6a1020'] }),
    silver:    A({ fx: { silver: 0.8 }, icon: ['sword', '#b8c0d0'] }),
    apocrypha: A({ fx: { apocrypha: 1.2 }, icon: ['skull', '#5a3a6a'] }),
    dagger:    A({ fx: { selfSlow: 1 }, icon: ['dagger', '#8a8a9a'] }),
    cuff:      A({ fx: { selfFragile: 1 }, icon: ['chain', '#7a5a3a'] }),
    targe:     A({ fx: { targe: 0.6 }, icon: ['shield', '#6a6e7a'] }),
    incubator: A({ fx: { incubator: 1 }, icon: ['elements', '#40a060'] }),
    root:      A({ fx: { lessSlots: 2, ms: -0.1 }, icon: ['root', '#5a4a2a'] }),
    accolade:  A({ fx: { accolade: 0.01 }, icon: ['laurel', '#6a1018'] }),
    giants:    A({ fx: { giants: 1 }, icon: ['totem', '#8a5a3a'] }),
    goblet:    A({ fx: { goblet: 1 }, icon: ['goblet', '#c8c0b0'] }),
    commit:    A({ fx: { commit: 1 }, icon: ['chain', '#6a1a4a'] }),
    idice:     A({ fx: { ivoryDice: 1 }, icon: ['dice', '#d8d0c0'] }),
    edge:      A({ fx: { edge: 1 }, icon: ['sword', '#6a2a1a'] }),
    // ---- hall-only (the Blightmire) ----
    ulcer:     A({ only: 'blightmire', generic: true, fx: { ulcer: 1 }, icon: ['ulcer', '#1a1a1a'] }),
    leash:     A({ only: 'blightmire', generic: true, fx: { leash: 1 }, icon: ['chain', '#4a6a2a'] }),
    // ---- hero-only (the Skald) ----
    curtain:   A({ hero: 'skald', generic: true, fx: { curtain: 1 }, icon: ['curtain', '#8a1a2a'] }),
    flute:     A({ hero: 'skald', generic: true, fx: { flute: 1 }, icon: ['flute', '#c89050'] }),
    drums:     A({ hero: 'skald', generic: true, fx: { playerSpeed: 1.5, enemySpeed: 1.3 }, icon: ['drum', '#a04020'] }),
    // ---- unlocked by deeds ----
    plate:     A({ deed: 'd_stage_discord_win', fx: { plate: 1 }, icon: ['hide', '#e0b030'] }),
    pendulum:  A({ deed: 'd_well_10', fx: { pendulum: 1 }, icon: ['pendulum', '#40c060'] }),
    glass:     A({ deed: 'd_level_70', fx: { glass: 1 }, icon: ['bones', '#3a4a6a'] }),
    tinder:    A({ deed: 'd_oozes_10', fx: { tinder: 1 }, icon: ['fireball', '#ff8030'] }),
    suppressor: A({ deed: 'd_stage_reliquary_win', fx: { suppress: 0.5 }, icon: ['skull', '#8a1a8a'] }),
  };
  E.artifactOrder = Object.keys(E.artifacts);
  E.hallArtifact = {}; E.artifactOrder.forEach((k) => { if (E.artifacts[k].hall) E.hallArtifact[E.artifacts[k].hall] = k; });
  /* Torment Rank = number of active Artifacts. Per rank: */
  E.TORMENT = { hp: 1.11, armor: 0.01, dmg: 0.02, speed: 0.015, xp: 0.05, champion: 0.95, gold: 0.08 };
  E.DREAD = { gold: E.TORMENT.gold, hp: 0.11 }; // legacy name used by settle/combat
  // old Altar artifacts carried over to their closest new counterparts
  E.ARTIFACT_MIGRATE = { hourglass: 'sands', famine: 'hunger', ironhorde: 'idol', bloodmoon: 'accolade', glasssoul: 'glass', exchange: 'scales', frenzy: 'gaze' };
})(window.DH);
