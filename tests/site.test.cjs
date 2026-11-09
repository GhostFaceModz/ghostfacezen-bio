const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = () => fs.readFileSync(path.join(root, 'script.js'), 'utf8');
test('entrance gates a YouTube-powered player with custom controls', () => {
  assert.match(html(), /id="enter-button"/);
  assert.match(html(), /id="splash-ghost"/);
  assert.match(html(), /id="yt-player"/);
  assert.match(html(), /id="seek"[^>]+type="range"/);
  assert.match(js(), /PLAYLIST:\s*\[/);
  assert.match(js(), /PLAYLIST_ID:/);
  assert.match(js(), /youtube\.com\/iframe_api/);
});
test('all destination links are correct and social placeholders are disabled', () => {
  for (const url of ['https://ghostflix.uk','https://ghostgames.app','https://discord.gg/zenclipsdaily-arc-raiders-store-bloodstrike-1408818003591827539']) assert.ok(html().includes(url));
  assert.equal((html().match(/<a[^>]+data-soon/g) || []).length, 2);
  assert.ok(html().includes('https://www.youtube.com/@GhostGames_App'));
  assert.match(html(), /Local visits/);
  assert.doesNotMatch(html(), /portfolio/i);
});
test('motion, music and social sharing have explicit controls and metadata', () => {
  for (const id of ['motion-toggle','mute-toggle','play-toggle','volume','previous','next','track-title','track-cover']) assert.ok(html().includes(`id="${id}"`));
  assert.match(html(), /property="og:image"/);
  assert.match(fs.readFileSync(path.join(root,'style.css'),'utf8'), /prefers-reduced-motion/);
});
test('local assets (Discord icon, OG, video hook) exist', () => {
  for (const name of ['discord-icon.png','discord-icon.webp','cover.svg','og-preview.png','background/README.txt']) assert.ok(fs.existsSync(path.join(root,'assets',name)), name);
  assert.match(html(), /assets\/discord-icon\.png/);
  assert.match(html(), /background\/background\.webm/);
});
test('CSS hexadecimal colors have supported lengths', () => {
  const css = fs.readFileSync(path.join(root,'style.css'),'utf8');
  const colors = css.match(/#[0-9a-fA-F]+\b/g) || [];
  assert.deepEqual(colors.filter(color => ![3,4,6,8].includes(color.length-1)), []);
});
test('GhostFlix and GhostGames use their real logos, in a clear order with labels', () => {
  const h = html();
  for (const f of ['ghostflix-icon.png','ghostgames-icon.png']) { assert.ok(fs.existsSync(path.join(root,'assets',f)), f); assert.ok(h.includes(`assets/${f}`)); }
  const order = ['https://ghostflix.uk','https://ghostgames.app','https://discord.gg/'].map(u => h.indexOf(u));
  assert.deepEqual([...order].sort((a,b)=>a-b), order);
  for (const label of ['GhostFlix','GhostGames','Discord']) assert.match(h, new RegExp(`class="social-label">${label}<`));
  assert.match(h, /class="ghost-tag">click to enter</);
});
