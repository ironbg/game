# Dreadhollow — English style guide and glossary

English is the base language: every other language is translated from it, so it must be clear,
consistent and unambiguous first. Tone follows Diablo II: grim, terse, evocative
for names and lore; plain and exact for rules, stats and tutorials.

## Style
- **US spelling** (armor, color, gray).
- **Title Case** for proper names: heroes, abilities, traits, items, artifacts, relics, halls, bosses,
  blessings, deeds categories, screen titles. **Sentence case** for buttons longer than one word
  ("Claim x2", "Watch ad"), descriptions, hints, tooltips.
- Descriptions: full sentences end with a period. Short labels, buttons, stat names and chips have no period.
- Second person, imperative for goals ("Defeat 500 foes"), present tense for effects ("Deals fire damage").
- Numbers: digits ("3 foes"), `%` without a space, `x2` for multipliers, time units "s" / "min" / "h" after a space ("{v} s", "{t} min").
- Punctuation: typographic apostrophe is not required (use '), use … (single character) for ellipses,
  use “…” for quoted names only if needed, en dash – for ranges in prose ("1–4").
- Keep UI labels short: buttons ≤ ~14 characters, tabs ≤ ~10, HUD callouts ≤ ~24.
- Never change `{placeholders}`; phrase so every value fits. Counts that can be 1 use a label form ("Foes defeated: {n}") instead of "{n} foes".
- Some strings are fragments the code joins with others (e.g. `common.gold`, `common.lv`, damage tags): check the call site before changing their case or punctuation.
- One concept = one word. Don't alternate "enemies"/"foes"/"monsters" inside the same kind of text:
  **foes** in flavor and deed goals, **enemies** in stat/effect descriptions.

## Terms
| Term | Use | Notes |
|---|---|---|
| Hall | the playable stages | never "level" or "stage" in player-facing text |
| Run | one attempt in a hall | "in one run" |
| Lord | the hall's final boss | Lord of Anguish |
| Boss / Champion / Elite | | |
| Agony | the difficulty gauge that rises in a run | "Agony III" |
| Torment / Torment Rank | the chosen difficulty on top of Agony | |
| Lament Shards | Archive currency | |
| Artifact / Relic / Secret | run modifier / secret reward / hidden hall quest | |
| Shrine: Blessings / Altar / Archive (the Archivist) / Apothecary | | |
| Deeds | permanent quests | |
| Quests / Daily | | |
| Armory / Relics tab / Wellkeeper | | |
| Vigil | idle rewards | "Vigil Rewards" |
| The Well / Wellkeeper / Bucket | | |
| Arcane Tome / Tome of Mastery | | |
| Chest / Lord's Hoard / Champion's Chest | | |
| Ability / Trait / Upgrade / Mark | | |
| Hero / Level (Lv) / XP | | |
| Gold / Gems / Torches | Torches = energy | |
| Revive | | |
| Kill Mode | | |
| Damage / Crit Chance / Crit Damage | | |
| Multistrike / Area / Duration / Cooldown | | |
| Defense / Block Strength | | |
| Move Speed / Attack Speed | | |
| Burn / Spark / Frost / Decay / Fragile / Affliction / Slow / Stun / Curse | status effects | capitalized |
| Frost Wave | the Frost burst | |
| Physical / Magic / Fire / Ice / Lightning | damage tags | |
| Summon / Projectile / Melee | | |
| Common / Uncommon / Rare / Epic / Legendary / Mythic | rarities | |
| Signet / Pendant | ring / neck items | |
| Hex | the Lord's hex | Curse is the status |
