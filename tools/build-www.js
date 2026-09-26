/* Copies the game into www/: the folder Capacitor packs into the Android app
 * and the one the web version is deployed from. No bundling: the files ship as they are.
 * Usage: node tools/build-www.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'assets'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
FILES.forEach((f) => fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true }));
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log('www/ ready: ' + count(out) + ' files');
