const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const guard = require(path.join(root, 'player-guard.js'));

test('metadata uses the https site url', () => {
  assert.match(html, /property="og:url" content="https:\/\/ghostapps\.org\/"/);
  assert.match(html, /rel="canonical" href="https:\/\/ghostapps\.org\/"/);
  assert.doesNotMatch(html, /http:\/\/ghostapps\.org/);
  assert.equal(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim(), 'ghostapps.org');
});

test('the page referrer policy sends the origin from http and https', () => {
  assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
});

test('youtube embed navigations keep a referrer on http and https parents', () => {
  const policy = 'strict-origin-when-cross-origin';
  assert.equal(guard.referrerPolicyForUrl('https://www.youtube.com/embed/8xdmFpNb8EI?enablejsapi=1'), policy);
  assert.equal(guard.referrerPolicyForUrl('https://www.youtube.com/embed/?autoplay=0&origin=http%3A%2F%2Fghostapps.org'), policy);
  assert.equal(guard.referrerPolicyForUrl('https://www.youtube-nocookie.com/embed/8xdmFpNb8EI'), policy);
  assert.equal(guard.referrerPolicyForUrl('https://www.youtube.com/watch?v=8xdmFpNb8EI'), '');
  assert.equal(guard.referrerPolicyForUrl('https://i.ytimg.com/vi/8xdmFpNb8EI/hqdefault.jpg'), '');
  assert.equal(guard.referrerPolicyForUrl(''), '');
});

test('a player configuration error is not a bad track id', () => {
  assert.equal(guard.isEmbedConfigurationError(153), true);
  for (const code of [2, 5, 100, 101, 150]) assert.equal(guard.isEmbedConfigurationError(code), false);
  assert.match(js, /isEmbedConfigurationError/);
  assert.match(js, /referrerPolicyForUrl/);
});
