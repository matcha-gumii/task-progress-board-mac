const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'タスク管理ツール.html'), 'utf8');

assert.match(html, /href="app\.css"/);
assert.doesNotMatch(html, /cdn\.tailwindcss\.com|fonts\.googleapis\.com/);
assert.match(html, /window\.desktopAPI\.chooseSyncFile/);
assert.match(html, /window\.desktopAPI\.writeSyncFile/);
assert.match(html, /window\.desktopAPI\.exportJson/);
assert.match(html, /window\.desktopAPI\.importJson/);

for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
  new vm.Script(match[1]);
}

const main = fs.readFileSync(path.join(root, 'desktop/main.cjs'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'desktop/preload.cjs'), 'utf8');
new vm.Script(main);
new vm.Script(preload);
assert.match(main, /contextIsolation: true/);
assert.match(main, /nodeIntegration: false/);
assert.match(main, /sandbox: true/);
assert.match(main, /writeFile\(temporaryPath/);
assert.match(main, /rename\(temporaryPath/);
assert.match(main, /app:\/\/task-progress-board/);

console.log('PASS: offline assets, renderer syntax, native bridge coverage, secure window settings, atomic sync write and stable app origin.');
