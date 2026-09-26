# Dreadhollow — Halls of the Damned

A dark-fantasy **horde-survival roguelite** built for mobile first.
It runs in any browser today and is structured to be wrapped as an Android/iOS app later.

> **BG:** Отвори `index.html` в браузър (или `npm start`) и играй. Играта е на английски, има и пълен български превод (Настройки → Език). Инструкции за добавяне на нов език са по-долу.

## Play

* Double-click `index.html` (works from `file://`, no build step), **or**
* `npm start` and open http://localhost:8080 (needed for offline/PWA install).

Controls: drag anywhere on the screen (floating joystick) or use WASD / arrow keys. Attacks are automatic. `Esc`/`P` pauses.

## The game

**Core loop:** survive 10 minutes in torch-lit halls against ever-growing hordes, grow your build every level-up, kill the mid-boss at 5:00 and the stage Lord at 10:00.

**Audio:** everything is synthesized with WebAudio in a dark, gothic style.
* **Effects:** heavy low impacts, metal clinks and clangs, tolling bells and breathy noise, through a long, dark stone-hall reverb.
* **Hall ambience:** quiet one-shots under the music, a different mix per hall:
  * drips, far-off moans, chains, creaks and wind
  * crackling fire and deep rumbles in the Abyss
  * cracking ice in the Catacombs
  * bubbling bog in the Blightmire
  * whispers in the Halls of Discord
  * chimes in the Reliquary
  * a slow bell toll
* **Music:** slow and ambient, in A harmonic minor: a drone, wind, formant choir pads, plucked strings and bells. War drums and a low string ostinato come in during battle.

**Atmosphere and spell VFX** (`js/game/vfx.js`):
* **Cast shadows:** sprites cast projected shadows away from nearby braziers, candles and crystals, as in Diablo II.
* **Hall atmosphere:** each hall has its own drifting fog and ambient particles:
  * dust in the Crypt
  * glowing embers in the Abyss
  * dripping water in the Aqueduct
  * snow in the Catacombs
  * arcane motes in the Halls of Discord
  * spores in the Blightmire
  * gold dust in the Reliquary
* **Light shafts:** shafts of light fall from cracks in the ceiling, with dust dancing inside them.
* **Spells:** spells leave glowing trails and burst into elemental sparks on hit. Big spells draw a rune circle on the ground.
* **Glow effects:** a pillar of light rises on level-up, elites and bosses swirl with aura motes, and the hero's torch flickers.
* **Battery saver** (Settings → *Battery saver*) thins out all of these effects.

**Graphics:** one look, detailed dark pixel art in the spirit of Diablo II.
* **Sprites:** every painter is rasterized at 2 pixels per world unit, then post-processed:
  * key light from the top-left with bevelled edges
  * a gritty dungeon palette of about 110 colours with 4×4 Bayer dithering and grain
  * a crisp 1px outline
* **World:** rendered into a low-res buffer and scaled up with nearest-neighbour, with dynamic torch lighting on top. Floors are quantized the same way and dressed with rubble, cobwebs, grates, tomb slabs, rune circles, broken columns, bones, candles and braziers.
* **UI:** uses the same style.
  * Icons are drawn at 64×64 (2 px per design unit, the same density as the sprites). Relics are detailed hand-built vector items (banded metal, faceted gems, stitched leather, rivets) and run through the same palette, bevel and outline.
  * Hero portraits are cut from the in-game sprites.
  * Panels, buttons, tabs and slots are hard-edged pixel frames with notched corners, a bevel and dithered stone textures generated from the palette.
* **Fonts:** *Alegreya Sans* is used for text and *Cinzel* for titles, both easy to read. *Press Start 2P* is used for numbers. `size-adjust` enlarges them slightly for readability on phones.

### Combat model

| Rule | Formula |
|---|---|
| Damage | (Base + Added Base) x (1 + additive %) x crit x vulnerability x (1 - enemy defense) |
| Crit chance | (Base Crit + Added Base Crit) x (1 + Increased Crit %). Above 100% every hit crits and the excess raises the multiplier; on-crit effects still trigger once. |
| Defense | % damage reduction, capped at 80% |
| Block | chance = min(1/2 x B/D, 1/2 x sqrt(B/D), 1). Blocked hits deal nothing. |
| Knockback | force / enemy mass (bosses barely move) |
| Multistrike | chance to repeat an attack (values above 100% guarantee repeats) |

**Status effects:** Burn (damage over time), Spark (5 stacks discharge a shock), Frost (6 stacks explode; the radius comes from the biggest hit, the damage from the stacks), Decay (damage over time plus defense shred), Fragile (+20% damage taken per stack), Affliction (+10% per stack; half the stacks jump to nearby enemies on death). Fragile and Affliction have no stack cap. Stun (from Lightning, War Drum and Concussive upgrades) freezes a non-boss enemy for 0.4s; stunning again refreshes the duration rather than stacking.

### Build system

* **Base traits:** 12 core stats. Each hero has an affinity per trait (weak / normal / strong, shown as arrows).
* **Elevated traits:** 7 rare stats (Multistrike, base crit, added base damage, +projectiles…), available from level 15 and upgradable at 30 and 60.
* **Class traits:** at levels 5, 15, 25, 40 and 60. There are three categories (Weapon Proficiency, Proficient Stance, Dedication), each with two sister variants, and taking one locks the other.
* **Ability traits:** every ability has 6 upgrades, and one rank opens every 8 levels. Two are available at the start; the other four unlock by dealing damage with that ability.
* **Arcane Tomes:** one at the entrance, and elites and Lords drop more. A tome teaches a new ability (up to 5 besides the hero weapon) or empowers one.
* **Ability Upgrades:** when a tome ability reaches level III and VI (total trait ranks), the next level-up offers one of two mechanic-changing upgrades.
  * Examples: Cyclone, Stream of Fire, Forked, Cascade, Constellation, Cataclysm, Legion, Overcharge, Chain Storm and Luminous Power, plus trade-offs such as Overpower (+60% damage, −25% attack speed), Frenzy, Barrage, Colossus, Concussive (stun) and Hexed.
  * A third upgrade opens at level IX with an Ability Signet, or for the Oracle.
* **Ability quirks**:
  * Spectral Fists ignore attack speed and Multistrike.
  * Transfixion loses a third of its damage per enemy pierced.
  * The orbs spin faster while you move.
  * Hailstorm gathers hailstones while you keep moving and drops them all, heavier, when you stop.
  * The Spirit Warrior holds its ground and dashes after you when left behind.
  * Searing Smite charges up damage and crit while it waits for a target.
* **Potions** (Apothecary), brewed from herbs found in runs or bought with gems:
  * *Draught of Remembrance* keeps an offered trait for later, even the sister of a class trait you already took.
  * *Echo Tincture* applies a trait twice.
  * *Lethe Draught* banishes a trait from the run.

### Content

| | |
|---|---|
| Heroes | 13, each with a signature weapon, affinities, 6 class traits and a Class Mark: Knight, Ranger, Templar, Pyromancer, Occultist, Valkyrie, Stormwitch, Huntress, Frostjarl, Oracle, Blood Saint, Skald, Reaper. The **Skald** (the Bard) has exclusive songs that fire on the beat of the battle music: Thunder Chord, War Drum, Wall of the Dead and Brawl Circle. |
| Abilities | 13 hero weapons + 24 shared tome abilities + 3 Skald songs. New: Searing Smite, Thornroot, Illumination, Prism Cascade. Others: Piercing Hex, Whirling Chakrams, Celestial Orbs, Ghost Darts, Wyrmfire, Storm Sphere, Radiant Halo, Void Rifts, Skyfall, Bone Golem, Phantom Knight, Glacial Surge, Ice Barrage, Penitent Flail, Wraith Fists…) |
| Stages | 7: Forsaken Crypt, Cinder Abyss, Drowned Aqueduct, Frozen Catacombs, Halls of Discord, Blightmire, The Sealed Reliquary |
| Bosses | 14. Lords clear the field, use telegraphed attacks and enrage over time. The Lord of Anguish fights mounted, then on foot with fire waves and grasping hands. |
| Enemies | elites (drop tomes), champions (drop item chests), swarms, encirclements. Far-away enemies despawn without XP. |
| Gilded Ooze | a treasure champion. Every hit deals exactly 1 damage and knocks out gold. It flees, leaves a gold trail and escapes after 20s. |
| Urns | break for herbs, healing, magnets, bombs and power-up runes: Fury (+100% damage, 15s), Quickening (+100% attack speed, 15s) and Wraithform (invulnerable, +50% speed, 10s) |
| Secrets | every hall has its own secret chain (js/game/secrets.js). Each starts with a page lying in the hall: Crypt: two Altars of Pain, fed by kills inside their circles, make the Protective Pendant (takes half the Lord's life). Abyss: skeleton statues lead to the Altar of Embers and an Ember Cyclops; its Cracked Eye makes the Lord's hazards harmless. Aqueduct: follow a raven to a sarcophagus; the Sentinel Orb stops the Horseman's ethereal phases. Catacombs: four orbs lead to the Frost Ghoul Lieutenant; the Hating Heart makes the Lord predictable and exposes it every 12 s. Blightmire: glowing roots lead to the Evil Tree and the Blight Worm (+1 Lament Shard). Discord has the light puzzle, the Reliquary the Lord's Hex (60% HP, 80% damage). |
| Status effects | damage per stack is a share of the ability's base damage (its element bonus, Affliction and the Incubator count; general damage bonuses do not). Burn: up to 20 stacks, a tick every 0.33 s, 2.5 s refreshed by each stack, overflow burns at once. Spark: up to 20 stacks; each tick strikes for every stack and spends one, ticks every 2 x 0.854^(stacks-1) s; overflow strikes for 5 stacks. Frost: stores up to 20 stacks for 10 s; at 20, or on death (not a one-hit kill), a Frost Wave hits all around, its reach set by the hardest hit taken. Decay: no cap or end, damage every second and armor stripped for good. Fragile / Affliction: +5% per stack, halving on ticks that come faster with more stacks; Affliction jumps at half strength to each nearby foe on death. Slow: x0.91 speed per stack up to 20, one stack fades every 3 / stacks s. Stun: 0.4 s. Curse: the Lord of Anguish's slow Curse Bolt kills in 40 s unless you revive. |
| Hazards | js/game/hazards.js: iron braziers in the Crypt and the Abyss tip over when struck and spill a field of embers (a Burn stack every 0.33 s to foes walking through, 6 s); ice spikes in the Catacombs burst and load nearby foes with 8 Frost stacks; the Blightmire's mud pits and root snares slow the horde (10 / 14 Slow stacks). The Viaduct has none. Hazard damage follows the hall's strength, not your damage or crit, yet counts as your fire / frost: mind it for the Elemental Heathen and Direct Damage deeds. |
| Pickups | urns roll once down a table (food 25% for 5 HP, coin stack 30%, herbs, Health Potion for 25 + 5% max HP, Hand of Greed 1.5%, coin bag 1.4%, Gilded Ooze 1%, power-ups: Unholy Strength / Berserk's Rage 2%, Angelic Boon 1%), else a single coin. No bombs; the rank and file drop only experience and a little gold. A gem's worth is fixed when it drops. Chests: a Lord's holds 3 pieces to choose from, a champion's 2 (Uncommon at least, Rare from Torment Level 10); choosing grants 0.5 s of invulnerability (not with Ivory Dice, which chooses for you). A Tome of Mastery offers every ability. Once per run the Strange Pendulum brings a chest with an item you have never found. |
| Hall quests | per hall: Dominator I-III (kills in one run), Berserker I-III (damage in one run), Adept (8 min with the main attack only), Speedster (the secret within 4 min), plus Up and Down, Vault Challenger and Army of the Dead. |
| Readability | enemies get a pale outline (red for bosses and champions); the hero's ability effects can be faded in Settings so foes never hide behind them. |
| XP | gems worth 1 / 10 / 100 / 1000. Unclaimed gems fold into clusters that keep their value. Leftover tomes and chests at victory give half a level each. |

### Meta progression

* **Deeds:** ~280 permanent quests. Each gives +1% XP forever, and many unlock heroes, abilities, ability traits, Marks, potions or artifacts.
* **Relics:** 7 slots (head, neck, chest, hands, feet, two rings) plus a Mark slot, with 21 named items and 6 rarities. Items can be levelled, merged and salvaged.
* **The Well:** items found in a run are lost unless you send one up the Well. The Wellkeeper then sells it back for gold or gems.
* **Loot steering:** champion and Lord chests prefer items you have discovered but are not wearing. Higher Torment Rank plus Agony guarantees the top rarity above 18 (champion) or 23 (Lord).
* **Class Marks:** clear a hero's home stage at Agony III with that hero. Wearing the Mark gives its bonus and adds that hero's class traits to your choices. Examples:
  * Sword: +0.3 regen.
  * Arrow: +10% base crit.
  * Incineration, Sorcery and the Beast: +15% Burn, Spark or Frost chance on the main weapon only.
  * Sanctity: +20% effect chance.
  * Rituals: +30% summon damage.
  * North: +20% damage.
* **Ability unlocks:** most tome abilities unlock by surviving a hall or by dealing a kind of damage in a single run. Kinds are fire, ice, lightning, magic, physical, summon, projectile, main-weapon or ability damage, critical hits, or Shield Bash damage.
* **Per-hero builds**:
  * Every hero has their own **loadout** (7 gear slots + Mark), so the same stash supports different builds. A newly picked hero starts with a copy of the current loadout.
  * Every hero has their own **Archive**: Lament Shards are assigned per hero and can be unassigned at any time.
  * Saves from before v5 got their Archive shards back to reassign.
* **Blessings with requirements:** most Shrine Blessings open with a deed. For example, Might opens at level 30, Revival after surviving 3 minutes in the Crypt, and Haste at 1,000 kills in one run. Swiftness, Vitality, Armor, Reach and Magnet are open from the start. Levels already bought keep working.
* **UI icons:** no emoji. Agony, Kill Mode, secrets, locks, checks, stars, arrows, settings, close and the tutorial use pixel icons (`u_*` in `js/core/icons.js`).
* **Revives:** one free revive per run after a rewarded ad. Gem revives cost 150, then 300, then 600 gems, at most three per run (`E.REVIVE_GEMS`). Shrine revives (Revival blessing) are separate.
* **Agony mode:** unlocked per stage after the first clear. The gauge, from 0 to V, climbs by itself (+1 rank every 96 s) and with every kill. A revive drains a fifth of it (one rank). Each rank brings:
  * denser and tougher hordes;
  * more XP, by hall: Crypt +52.9%, Catacombs +39.5%, Abyss +31%, Aqueduct +24%, Discord and Blightmire +13%.

  Agony champions arrive every (50 − 3×AR) × 0.95^TR s. Each drops **one** reward, checked top to bottom:
  * Bucket, up to 2 per run;
  * potion, up to 2 per run;
  * Tome of Mastery (5 choices) at TR+AR ≥ 5, up to 9 per run;
  * red chest, up to 7 per run;
  * Scroll (Arcane Tome), up to 9 per run;
  * gold bags of 1200, 600, 300 or 150 gold.

  The chances are in `C.CHAMP_DROPS`.
* **Artifacts and Torment Rank:** with Agony on, Lords drop Artifacts. Each hall has a guaranteed Hall Artifact. A random Generic one drops with a chance of 60% + 1.5% per Generic you have not found yet. Some drop only in one hall (the Blightmire) or for one hero (the Skald), and four are unlocked by Deeds. There are 48 in all (`js/data/artifacts.js`), for example:
  * the Mirror of Three Lords: three final Lords;
  * lava, spike-trap and crystal-rain hazards;
  * treasure chests that appear somewhere in the hall;
  * trade-offs such as +100% damage for +50% enemy damage.

  The Altar opens after the Chapter V Lord (Halls of Discord) falls. Toggle them at the **Altar**. Every active Artifact is +1 **Torment Rank**. Per rank, enemies get ×1.11 HP, +2% damage and +1.5% speed, and champions come 5% sooner. You get +5% XP, +8% gold, better loot and more Lament Shards. Run logic is in `js/game/artifacts.js`.
* **Torment Level (Rank + Agony) and loot:**
  * At 11+, champion chests can hold legendary items.
  * At 16+, Lord chests can hold mythic items.
  * At 25+, every chest holds the top rarity.
* **Champion drop table**, better with Torment Level:
  * always gold, plus a chance of bigger gold bags;
  * Tome: up to 9 per run;
  * red chest: up to 7 per run;
  * potion: up to 2 per run;
  * Bucket: 1 per run. It lets you use the Well once more, so a second item goes to the Wellkeeper.
* **Hall starting items**: each hall places items at fixed spots 320–380 m from the spawn, about a minute's walk (14 world units = 1 m, so heroes walk about 5 m/s), far apart from each other. Every hall has an Arcane Tome:
  * Crypt: 2 tomes;
  * Abyss, Catacombs and Blightmire: a tome and a magnet;
  * Aqueduct: 2 tomes and a potion;
  * Discord: a tome and a chest;
  * Reliquary: a tome, a chest and a magnet.

  The list is `C.STAGE_START`.
* **Enemy art:** enemies and Lords are drawn to read as dread, not cartoon. They have:
  * gaunt, hunched silhouettes;
  * glowing eyes with no highlights;
  * claws, fangs, horns and rags.

  The two-frame gait is slower. The shared helpers `P.evil`, `P.teeth`, `P.claws` and `P.limb` are in `js/core/paint_enemies.js`.
* **Hall rules** (`js/game/halls.js`):
  * **Drowned Aqueduct:** a 220 m-wide viaduct over a chasm. The horde comes from both ends of the bridge, and the starting items lie along it.
  * **Frozen Catacombs:** Snow Effigies take only 17% of direct hits but full Burn and Frost damage (`def.dmgFactor`).
  * **Blightmire:** no clock. The Lord rises after 3,000 kills, or at 15:00 at the latest, and the horde keeps growing until then. The kill count is shown in the HUD.
  * **Halls of Discord:** the hall's secret is a light puzzle. A source lies about 37 m from the spawn, and a winding path runs through 8 relays to the Dissonator Monolith.
    * Walking into a relay turns it 90° clockwise. A golden arrow on each pedestal shows where its light must go.
    * The beam stops at the first relay that is turned wrong. A marker points to that relay once the puzzle is found.
    * When the light reaches the Monolith, it pulses every 5 s. Each pulse deals 4% of the Lord's health and heavy damage to foes within 8 m.
    * Solving it counts as the hall's secret (Lament Shards, deed). Tuning is in `C.DISSO`.
  * **Sealed Reliquary:** the torment deepens every 80 s, up to level 7, and each level gives new foes +4% defense. The Lord arrives sealed behind four pylons (6% of its health each) that must be broken first.
* **Kill Mode** (after the Altar opens, a chip on the stage card): the Lord rises at 2,500 kills instead of 10:00, like the Blightmire.
* **Over-crit:** crit chance above 100% gives sure crit tiers plus a chance of one more, and the tiers multiply. For example, 150% chance with a ×2 crit gives ×2 or ×4. Torment multiplies enemy base defense by 1.10 per rank.
* **Off-screen markers:** bosses, the Well, Arcane Tomes, chests, artifacts, starting items and Buckets. Each marker has an iron-and-gold arrowhead, a badge with the target's sprite and the distance in metres (14 world units = 1 m). The 8 nearest are shown.
* **Starting Ability:** each hall has a quest (deed) that puts an Arcane Tome right next to the hero at the start, where it is a hall quest reward and not a Shrine blessing.
  * Crypt, Abyss and Reliquary: kill 2,500 enemies in one run.
  * Aqueduct: defeat the Lich.
  * Catacombs: survive 8 minutes.
  * Discord: defeat the Discordant Colossus.
  * Blightmire: survive 5 minutes.

  The list is `C.START_TOME_DEED`.
* **Statuses:** Fragile adds +5% direct damage per stack. Affliction adds +5% effect damage per stack. Neither has a cap or fades, and half the Affliction stacks spread when the enemy dies.
* **Shrine:** 14 permanent gold blessings.
* **Lament Shards and the Archivist:** with Agony or Torment on, every Lord drops 1–4 shards by Torment Rank: an average of 1 at TR 0, 2.7 at TR 10, 3.6 at TR 20 and 4 from TR 30 (`C.SHARD_TABLE`). Finding a hall's secret the first time grants 2 shards. The Archivist trades shards for permanent upgrades, including +1 projectile or summon.
* **Ability Signets:** rings that grant extra upgrade picks, plus one extra rank, for abilities of their element.
* **Main quests:** a guided path through the deeds. The next one is shown on the home screen and pays gems.
* Reviving drains a fifth of the Agony gauge (one rank).

## Monetization integration (currently in TEST MODE)

All money flows go through two adapters, so no game code changes are needed to go live:

* `js/services/iap.js`: `DH.iap.buy(productId)`. The mock provider shows a confirmation dialog and charges nothing.
  To ship, implement a provider around **cordova-plugin-purchase** or **RevenueCat** (mobile) or **Stripe Checkout / Xsolla** (web).
  Validate receipts server-side, then call `DH.meta.fulfillProduct(id)`. Product ids and prices live in `js/data/economy.js` (`E.products`).
* `js/services/ads.js`: `DH.ads.rewarded(placement)` and `DH.ads.interstitial(placement)`. The mock shows a 5-second placeholder.
  To ship, wrap **AdMob** (`@capacitor-community/admob`), Unity Ads or AppLovin MAX.

## Adding a language

1. Copy `js/i18n/bg.js` to `js/i18n/<code>.js` and change the `register('<code>', { name, native }, {...})` call.
2. Translate the values. Any key you leave out falls back to English.
3. Add `<script src="js/i18n/<code>.js"></script>` in `index.html` (and to the `FILES` list in `sw.js`).
4. Run `npm run check` to verify keys. It reports every key used in code that is missing from English, and counts missing keys per language.

The language is auto-detected from the device and can be changed in Settings.

## Building the mobile app (later)

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
mkdir -p www && cp -r index.html manifest.webmanifest sw.js css js assets www/
npx cap add android      # and/or: npx cap add ios
npx cap sync && npx cap open android
```

The game already handles touch, safe areas (notches), pause on background, vibration, and offline assets (fonts are bundled).

## Project layout

```
index.html            entry point (script order matters)
css/style.css         UI theme
js/core/              helpers, gfx pipeline (HD/pixel), vector painters (heroes, enemies, bosses, props), icons,
                      pixel sprites, synth audio, input, save
js/i18n/              localization engine + languages (en, bg)
js/data/              content (heroes, abilities, traits, enemies, stages), economy, deeds
js/services/          ads + in-app purchase adapters
js/meta/meta.js       progression, rewards, missions, pass, gear, chests, idle
js/game/              view, run core, combat maths, abilities & summons, bosses & hazards, renderer
js/ui/                menus, popups, in-run HUD, animated menu backdrop
tools/check-i18n.js   translation checker
```

All art is generated from code: vector-painted HD sprites with automatic outlines, hit-flash and colour variants per stage, text-defined pixel sprites for Pixel mode, procedural dungeon floors, and dynamic lighting. All audio is synthesized with WebAudio, so the game ships with no image or sound files except fonts and app icons.

Progress is saved in `localStorage`. Settings → *Transfer progress* exports and imports a save code.
