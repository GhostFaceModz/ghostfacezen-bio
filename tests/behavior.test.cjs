const test = require('node:test'); const assert = require('node:assert/strict');
const vm = require('node:vm'); const fs = require('node:fs'); const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8');

function boot({ reduced = false, storageBlocked = false, yt = true, failIds = [] } = {}) {
  const nodes = new Map();
  const make = id => {
    const attrs = {}, classes = new Set(), handlers = {};
    const el = { id, value: id === 'volume' ? '30' : '0', textContent: '', innerHTML: '', src: '', alt: '', href: '', inert: false, children: [], attrs, handlers,
      style: { setProperty(k, v) { this[k] = v; } },
      classList: { add: (...x) => x.forEach(v => classes.add(v)), remove: (...x) => x.forEach(v => classes.delete(v)), contains: x => classes.has(x), toggle(x, on) { if (on === undefined) on = !classes.has(x); on ? classes.add(x) : classes.delete(x); return on; } },
      setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: k => attrs[k],
      addEventListener(k, f) { (handlers[k] ??= []).push(f); },
      appendChild(c) { this.children.push(c); return c; },
      querySelector() { return element(id + '-use'); }, focus() {},
      fire(k, e = {}) { for (const f of handlers[k] || []) f({ target: this, preventDefault() {}, ...e }); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 500 }), getContext: () => null };
    return el;
  };
  const element = id => { if (!nodes.has(id)) nodes.set(id, make(id)); return nodes.get(id); };
  const body = element('body'), head = element('head');
  const soon = [element('soon-1'), element('soon-2'), element('soon-3')];
  const timers = [];
  const doc = { body, head, hidden: false, getElementById: id => id === 'background-video' ? null : element(id), querySelectorAll: () => soon, addEventListener() {}, createElement: tag => make(tag) };
  const store = new Map();
  const localStorage = { getItem(k) { if (storageBlocked) throw Error('blocked'); return store.get(k) || null; }, setItem(k, v) { if (storageBlocked) throw Error('blocked'); store.set(k, v); } };
  const players = [];
  class Player {
    constructor(el, opts) { this.opts = opts; this.vol = 100; this.muted = false; this.state = -1; this.t = 0; this.id = ''; this.calls = []; players.push(this); }
    _ready() { this.opts.events.onReady({ target: this }); }
    _set(s) { this.state = s; this.opts.events.onStateChange({ data: s, target: this }); }
    cueVideoById(id) { this.id = id; this.calls.push(['cue', id]); }
    loadVideoById(id) { this.id = id; this.calls.push(['load', id]); if (failIds.includes(id)) this.opts.events.onError({ data: 150 }); else this._set(1); }
    playVideo() { if (failIds.includes(this.id)) { this.opts.events.onError({ data: 150 }); return; } this._set(1); }
    pauseVideo() { this._set(2); }
    setVolume(v) { this.vol = v; } mute() { this.muted = true; } unMute() { this.muted = false; }
    getCurrentTime() { return this.t; } getDuration() { return 200; } seekTo(s) { this.t = s; }
    getVideoData() { return { video_id: this.id, title: 'Song ' + this.id, author: 'Artist' }; }
  }
  const context = { document: doc, localStorage, window: null, location: { protocol: 'http:', origin: 'http://localhost' },
    matchMedia: q => ({ matches: q.includes('reduced') ? reduced : true, addEventListener() {} }),
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1, addEventListener() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setTimeout: (f) => { timers.push(f); return 1; }, clearTimeout() {}, setInterval: () => 1, clearInterval() {}, performance: { now: () => 0 }, console, Math, Date };
  if (yt) context.YT = { Player, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 } };
  context.window = context;
  vm.runInNewContext(src, context);
  return { element, body, head, soon, store, players, timers, context };
}

test('entry is gated, ghost floats away, music starts on the click gesture', () => {
  const { element, players, timers } = boot();
  assert.equal(element('experience').inert, true);
  const p = players[0]; p._ready();
  assert.deepEqual(p.calls[0], ['cue', '8xdmFpNb8EI']);
  element('enter-button').fire('click');
  assert.equal(element('experience').inert, false);
  assert.equal(element('entrance').classList.contains('leaving'), true);
  assert.equal(element('entrance').classList.contains('dismissed'), false);
  timers.forEach(f => f());
  assert.equal(element('entrance').classList.contains('dismissed'), true);
  assert.equal(p.state, 1);
  assert.equal(element('player-state').textContent, 'NOW PLAYING');
  assert.match(element('track-cover').src, /i\.ytimg\.com\/vi\/8xdmFpNb8EI/);
});

test('if the API is not ready yet, play is queued until onReady', () => {
  const { element, players } = boot();
  element('enter-button').fire('click');
  const p = players[0];
  assert.equal(p.state, -1);
  p._ready();
  assert.equal(p.state, 1);
});

test('transport, seek, volume and mute drive the YouTube player', () => {
  const { element, players } = boot();
  const p = players[0]; p._ready();
  element('enter-button').fire('click');
  element('play-toggle').fire('click'); assert.equal(p.state, 2);
  element('play-toggle').fire('click'); assert.equal(p.state, 1);
  element('next').fire('click'); assert.deepEqual(p.calls.at(-1), ['load', 'DZrG_Cjx1L8']);
  element('previous').fire('click'); assert.deepEqual(p.calls.at(-1), ['load', '8xdmFpNb8EI']);
  element('previous').fire('click'); assert.deepEqual(p.calls.at(-1), ['load', '0E5c8Ol-5xo']);
  element('seek').value = '50'; element('seek').fire('change'); assert.equal(p.t, 100);
  element('volume').value = '70'; element('volume').fire('input'); assert.equal(p.vol, 70); assert.equal(p.muted, false);
  element('mute-toggle').fire('click'); assert.equal(p.muted, true);
  assert.equal(element('mute-toggle').attrs['aria-pressed'], 'true');
});

test('embed errors skip to the next track', () => {
  const { element, players } = boot({ failIds: ['8xdmFpNb8EI'] });
  const p = players[0]; p._ready();
  element('enter-button').fire('click');
  assert.deepEqual(p.calls.at(-1), ['load', 'DZrG_Cjx1L8']);
  assert.equal(p.state, 1);
});

test('loads the IFrame API script when YT is absent', () => {
  const { head, context } = boot({ yt: false });
  assert.equal(head.children[0].src, 'https://www.youtube.com/iframe_api');
  assert.equal(typeof context.onYouTubeIframeAPIReady, 'function');
});

test('reduced motion defaults off, can be toggled, and social placeholders never navigate', () => {
  const { body, element, soon, timers } = boot({ reduced: true });
  assert.equal(body.classList.contains('motion-off'), true);
  element('motion-toggle').fire('click');
  assert.equal(body.classList.contains('motion-off'), true);
  let prevented = false; soon[0].fire('click', { preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
});

test('storage-denied mode gracefully falls back to a truthful local visit count', () => {
  const { element } = boot({ storageBlocked: true });
  assert.equal(String(element('view-count').textContent), '1');
});

test('clicking anywhere on the start screen (including the ghost) enters once', () => {
  const { element, players } = boot();
  const p = players[0]; p._ready();
  element('entrance').fire('click');
  assert.equal(element('experience').inert, false);
  assert.equal(element('entrance').classList.contains('leaving'), true);
  element('enter-button').fire('click');
  assert.equal(p.state, 1);
});
