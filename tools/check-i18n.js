/* Checks that every i18n key the code uses exists in English, and reports
 * keys missing from other languages.  Usage: node tools/check-i18n.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {}, console, navigator: { language: 'en' }, document: { documentElement: {} } };
ctx.window = ctx; ctx.DH = {}; vm.createContext(ctx);
['js/core/ns.js', 'js/i18n/i18n.js', 'js/data/content.js', 'js/data/economy.js', 'js/data/artifacts.js', 'js/data/deeds.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx));
const langFiles = fs.readdirSync(path.join(root, 'js/i18n')).filter((f) => f !== 'i18n.js');
langFiles.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'js/i18n', f), 'utf8'), ctx));
const DH = ctx.DH, C = DH.content, E = DH.economy;
const used = new Set();
const walk = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js') && !p.includes('i18n')) {
  const src = fs.readFileSync(p, 'utf8'); for (const m of src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)) if (!m[1].endsWith('.')) used.add(m[1]); } });
walk(path.join(root, 'js'));
// dynamic key families
Object.keys(C.heroes).forEach((k) => { used.add(`hero.${k}.name`); used.add(`hero.${k}.desc`); });
Object.keys(C.abilities).forEach((k) => { used.add(`ab.${k}.name`); used.add(`ab.${k}.desc`); C.abilities[k].traits.forEach((t) => used.add(`at.${t.k}`)); C.abilities[k].tags.forEach((t) => used.add(`tag.${t}`)); Object.keys(C.abilities[k].traits.reduce((a, t) => Object.assign(a, t.m), {})).forEach((m) => used.add(`mod.${m}`)); });
Object.values(C.heroes).forEach((h) => ['wp', 'st', 'dd'].forEach((c) => h.ct[c].forEach((x) => { used.add(`ct.${x.k}`); Object.keys(x.w).forEach((m) => used.add(`mod.${m}`)); Object.keys(x.s).forEach((m) => used.add(`stat.${m}`)); })));
Object.values(C.heroes).forEach((h) => { Object.keys(h.bonus || {}).concat(Object.keys(h.mark || {})).forEach((m) => used.add(`stat.${m}`)); });
Object.keys(C.baseTraits).concat(Object.keys(C.elevatedTraits)).forEach((k) => used.add(`trait.${k}`));
Object.values(C.baseTraits).concat(Object.values(C.elevatedTraits)).forEach((t) => Object.keys(t.per).forEach((m) => used.add(`stat.${m}`)));
Object.keys(C.enemies).filter((k) => C.enemies[k].boss).forEach((k) => used.add(`enemy.${k}`));
Object.keys(C.stages).forEach((k) => { used.add(`stage.${k}.name`); used.add(`stage.${k}.desc`); });
Object.keys(E.shrine).forEach((k) => { used.add(`shrine.${k}`); Object.keys(E.shrine[k].per).forEach((m) => used.add(`stat.${m}`)); });
E.missionPool.forEach((m) => used.add(`mission.${m.id}`));
E.achievements.forEach((a) => { used.add(`ach.${a.id}.name`); used.add(`ach.${a.id}.desc`); });
Object.keys(E.products).forEach((k) => used.add(`product.${k}`));
Object.keys(E.chests).forEach((k) => used.add(`chest.${k}`));
E.rarities.forEach((k) => used.add(`rarity.${k}`));
Object.keys(E.gear).forEach((k) => { used.add(`gear.${k}`); Object.keys(E.gear[k].stats).forEach((m) => used.add(`stat.${m}`)); if (E.gear[k].special) used.add(`gearsp.${k}`); });
E.slots.concat(['mark']).forEach((k) => used.add(`slot.${k}`));
E.potionOrder.forEach((k) => { used.add(`potion.${k}.name`); used.add(`potion.${k}.desc`); used.add(`potion.hint.${k}`); });
E.herbs.forEach((k) => used.add(`herb.${k}`));
E.artifactOrder.forEach((k) => { used.add(`artifact.${k}.name`); used.add(`artifact.${k}.desc`); });
DH.deeds.list.forEach((d) => { const c = d.cond; used.add('deed.' + (c.type === 'stat' ? 'stat.' + c.stat : c.type === 'killsRun' && c.stage ? 'killsStage' : c.type)); });
['stage', 'hero', 'ability', 'general'].forEach((k) => used.add(`deeds.cat.${k}`));
['wp', 'st', 'dd'].forEach((k) => used.add(`lv.class.${k}`));
Object.keys(E.archive).forEach((k) => { used.add(`archive.${k}`); Object.keys(E.archive[k].per).forEach((m) => used.add(`stat.${m}`)); });
Object.keys(C.BUFFS).forEach((k) => used.add(`buff.${k}`));
Object.keys(C.UPGRADES).forEach((k) => { used.add(`up.${k}`); Object.keys(C.UPGRADES[k]).forEach((m) => used.add(`mod.${m}`)); });
Object.keys(C.DMG_DEEDS).forEach((k) => used.add(`dmgtag.${k}`));
used.add('enemy.gildedooze');
['dmgPct', 'as', 'area', 'critPct', 'critBonus', 'ms', 'regen', 'speedPct', 'growth', 'defense', 'block', 'maxHp'].forEach((k) => used.add(`stat.${k}`));
['popular', 'best'].forEach((k) => used.add(`shop.tag.${k}`));
['shop', 'armory', 'home', 'shrine', 'quests'].forEach((k) => used.add(`nav.${k}`));
let bad = 0;
for (const k of used) { if (!DH.i18n.has(k)) { console.log('MISSING in en:', k); bad++; } }
DH.i18n.list().forEach((l) => { if (l.code === 'en') return; const miss = DH.i18n.missing(l.code); console.log(`${l.code}: ${miss.length} keys missing${miss.length ? ' -> ' + miss.slice(0, 20).join(', ') : ''}`); });
console.log(bad ? `${bad} missing english keys` : `OK: ${used.size} keys used, all present in English`);
process.exit(bad ? 1 : 0);
