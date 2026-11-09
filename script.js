/* GHOSTAPPS / edit-friendly settings. */
(() => {
  'use strict';

  /* =====================================================================
   *  MUSIC — choose your songs here (YouTube, like YouTube Music on Discord)
   * ---------------------------------------------------------------------
   *  Option A: PLAYLIST — a list of YouTube video IDs.
   *    The ID is the part after "watch?v=" in a YouTube link, e.g.
   *    https://www.youtube.com/watch?v=8xdmFpNb8EI  ->  '8xdmFpNb8EI'
   *    Add / remove / reorder lines. "title" and "artist" are optional
   *    (they're shown until YouTube reports the real title).
   *    YouTube Music links work too: music.youtube.com/watch?v=ID -> ID.
   *
   *  Option B: PLAYLIST_ID — paste a YouTube playlist ID (the part after
   *    "list=" in a playlist link). When set, it is used INSTEAD of PLAYLIST.
   *
   *  Videos must allow embedding. Any song that can't be embedded is
   *  skipped automatically.
   * ===================================================================== */
  const MUSIC = {
    PLAYLIST: [
      { id: '8xdmFpNb8EI', title: 'It’s Not So Bad (Dido – Thank You) Trap Remix', artist: 'Faze Beats' },
      { id: 'DZrG_Cjx1L8', title: '13', artist: 'Lund' },
      { id: 'oblsGyGuoIY', title: 'Been Here Before (feat. Baby Dreco)', artist: 'GTW Mik' },
      { id: 'HGrW7jSFqyE', title: 'MONSTERS', artist: 'Jay Armon' },
      { id: '0E5c8Ol-5xo', title: 'Clap G', artist: 'Velvet Zero' }
    ],
    PLAYLIST_ID: '',     // e.g. 'PLxxxxxxxxxxxxxxxx' — leave '' to use PLAYLIST above
    SHUFFLE: false,      // true = start on a random song
    VOLUME: 30           // starting volume, 0–100
  };

  const CONFIG = {
    effects: true,       // Master switch: false disables ALL visual motion.
    cursorGlow: true,
    tilt: true,
    particles: true,
    floatAwayMs: 1500,   // length of the ghost float-away on "click to enter"
    shootingStars: true, // occasional shooting stars in the background
    // Rotating typewriter taglines under the bio. Edit / add lines freely.
    taglines: [
      'Good games. Great stories. Your kind of people.',
      'Clips, games & movies — all in one ghostly place.',
      'Home of GhostFlix & GhostGames.',
      'Join the ZenClipsDaily Discord 👻'
    ]
  };

  const $ = id => document.getElementById(id);
  const experience = $('experience');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let entered = false, motionEnabled = false, frameId = 0, lastTime = 0, noticeTimer;
  const canvas = $('particles');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const profile = $('profile');
  const glow = $('cursor-glow');
  let width = innerWidth, height = innerHeight;
  let mouseX = width / 2, mouseY = height / 2, glowX = mouseX, glowY = mouseY;
  let pointerActive = false, particles = [];
  const video = $('background-video');
  const ghostVideo = $('ghost-video');
  experience.inert = true;
  $('year').textContent = new Date().getFullYear();

  function readSetting(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function saveSetting(key, value) { try { localStorage.setItem(key, value); } catch { /* storage denied */ } }
  function notify(message) {
    $('notice').textContent = message;
    $('notice').classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => $('notice').classList.remove('visible'), 2800);
  }

  /* ---------- local visit counter (this browser only) ---------- */
  let count = Number(readSetting('ghostapps.local-visits.v1'));
  count = Number.isSafeInteger(count) && count >= 0 && count < Number.MAX_SAFE_INTEGER ? count + 1 : 1;
  saveSetting('ghostapps.local-visits.v1', String(count));
  $('view-count').textContent = count.toLocaleString();

  /* =================== YOUTUBE MUSIC PLAYER =================== */
  const usePlaylistId = typeof MUSIC.PLAYLIST_ID === 'string' && MUSIC.PLAYLIST_ID.trim() !== '';
  const tracks = (MUSIC.PLAYLIST || []).filter(t => t && typeof t.id === 'string' && t.id.trim());
  let trackIndex = MUSIC.SHUFFLE && tracks.length ? Math.floor(Math.random() * tracks.length) : 0;
  let player = null, ready = false, playing = false, wantPlay = false, muted = false;
  let volume = Math.max(0, Math.min(100, Number(MUSIC.VOLUME) || 0));
  let failures = 0, pollTimer = 0, seeking = false;

  function timeLabel(value) {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
  }
  function paintRange(input, percent) { input.style.setProperty('--progress', `${Math.max(0, Math.min(100, percent))}%`); }
  function setState(text) { $('player-state').textContent = text; }
  function currentId() {
    if (player && ready && player.getVideoData) { const d = player.getVideoData(); if (d && d.video_id) return d.video_id; }
    return tracks[trackIndex] ? tracks[trackIndex].id : '';
  }
  function setTitle(text) {
    const h2 = $('track-title');
    h2.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = text;
    h2.appendChild(span);
    h2.classList.toggle('overflowing', text.length > 30);
  }
  // Trims noisy YouTube suffixes like " | Electronic Pop | NCS - Copyright Free Music" or "(Official Video)".
  function cleanTitle(title) {
    if (!title) return '';
    return String(title).split(' | ')[0].replace(/\s*[\[(](official|lyric|audio|music video|visualizer)[^\])]*[\])]/ig, '').trim();
  }
  function showMeta() {
    const fallback = tracks[trackIndex] || {};
    const data = player && ready && player.getVideoData ? player.getVideoData() || {} : {};
    const id = currentId();
    setTitle(cleanTitle(data.title) || fallback.title || 'YouTube music');
    $('track-subtitle').textContent = data.author || fallback.artist || 'YouTube';
    if (id) {
      $('track-cover').src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      $('track-cover').alt = `Thumbnail for ${data.title || fallback.title || 'current song'}`;
      $('yt-link').href = `https://www.youtube.com/watch?v=${id}`;
    }
    let total = tracks.length, position = trackIndex;
    if (usePlaylistId && player && ready && player.getPlaylist) {
      const list = player.getPlaylist() || []; total = list.length || 1; position = Math.max(0, player.getPlaylistIndex());
    }
    $('track-count').textContent = `${position + 1} / ${Math.max(total, 1)}`;
  }
  function updateProgress() {
    if (!player || !ready || seeking) return;
    const t = Number(player.getCurrentTime()) || 0, d = Number(player.getDuration()) || 0;
    $('elapsed').textContent = timeLabel(t);
    $('duration').textContent = timeLabel(d);
    const percent = d > 0 ? t / d * 100 : 0;
    $('seek').value = String(percent);
    $('seek').setAttribute('aria-valuetext', `${timeLabel(t)} of ${timeLabel(d)}`);
    paintRange($('seek'), percent);
  }
  function updatePlayState() {
    document.body.classList.toggle('is-playing', playing);
    $('play-toggle').querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
    $('play-toggle').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    setState(playing ? 'NOW PLAYING' : (entered ? 'PAUSED' : 'READY WHEN YOU ARE'));
  }
  function updateMuteState() {
    const silent = muted || volume === 0;
    $('mute-toggle').setAttribute('aria-pressed', String(silent));
    $('mute-toggle').setAttribute('aria-label', silent ? 'Unmute music' : 'Mute music');
    $('mute-toggle').querySelector('use').setAttribute('href', silent ? '#i-muted' : '#i-sound');
    $('volume').value = String(volume);
    paintRange($('volume'), muted ? 0 : volume);
  }
  function applyVolume() {
    if (!player || !ready) return;
    player.setVolume(volume);
    if (muted || volume === 0) player.mute(); else player.unMute();
  }
  function play() {
    wantPlay = true;
    if (!player || !ready) { setState('LOADING…'); return; }
    applyVolume();
    player.playVideo();
  }
  function pause() { wantPlay = false; if (player && ready) player.pauseVideo(); }
  function loadTrack(index, autoplay) {
    if (usePlaylistId) { if (!player || !ready) return; index > trackIndex ? player.nextVideo() : player.previousVideo(); return; }
    if (!tracks.length) return;
    trackIndex = (index + tracks.length) % tracks.length;
    showMeta();
    if (!player || !ready) return;
    if (autoplay) player.loadVideoById(tracks[trackIndex].id); else player.cueVideoById(tracks[trackIndex].id);
  }
  function next() {
    if (usePlaylistId) { if (player && ready) player.nextVideo(); return; }
    loadTrack(trackIndex + 1, wantPlay || playing);
  }
  function previous() {
    if (player && ready && player.getCurrentTime() > 3) { player.seekTo(0, true); return; }
    if (usePlaylistId) { if (player && ready) player.previousVideo(); return; }
    loadTrack(trackIndex - 1, wantPlay || playing);
  }

  function onReady() {
    ready = true;
    applyVolume();
    if (usePlaylistId) player.cuePlaylist({ list: MUSIC.PLAYLIST_ID.trim(), listType: 'playlist' });
    else if (tracks.length) player.cueVideoById(tracks[trackIndex].id);
    showMeta();
    if (wantPlay) play();
    clearInterval(pollTimer);
    pollTimer = setInterval(updateProgress, 250);
  }
  function onStateChange(event) {
    const S = (window.YT && window.YT.PlayerState) || { ENDED: 0, PLAYING: 1, PAUSED: 2, CUED: 5 };
    if (event.data === S.PLAYING) { playing = true; failures = 0; }
    else if (event.data === S.PAUSED || event.data === S.CUED) playing = false;
    else if (event.data === S.ENDED) { playing = false; if (!usePlaylistId) loadTrack(trackIndex + 1, true); }
    showMeta(); updatePlayState(); updateProgress();
  }
  function onError(event) {
    if (window.console) console.warn('[music] YouTube error', event && event.data, 'on', currentId());
    // 2 bad id, 5 html5 error, 100 removed/private, 101/150 embedding disabled -> skip.
    failures += 1;
    const total = usePlaylistId ? 50 : tracks.length;
    if (failures >= Math.max(total, 1)) { playing = false; updatePlayState(); setState('MUSIC UNAVAILABLE'); notify('None of the songs could be embedded. Check the IDs in script.js.'); return; }
    notify('That song can’t play here, skipping to the next one.');
    if (usePlaylistId) player.nextVideo(); else loadTrack(trackIndex + 1, wantPlay);
  }
  function createPlayer() {
    if (player || !window.YT || !window.YT.Player) return;
    if (!usePlaylistId && !tracks.length) { setTitle('Add songs in script.js'); return; }
    const origin = window.location && /^https?:/.test(window.location.protocol) ? window.location.origin : undefined;
    const vars = { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1, rel: 0, iv_load_policy: 3 };
    if (origin) vars.origin = origin;
    player = new window.YT.Player('yt-player', {
      width: 200, height: 200, playerVars: vars,
      events: { onReady, onStateChange, onError }
    });
  }
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) { createPlayer(); return; }
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof previousReady === 'function') previousReady(); createPlayer(); };
    if (window.location && window.location.protocol === 'file:') notify('Music needs the page served over http(s), not opened as a file.');
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = () => { setState('MUSIC OFFLINE'); setTitle('YouTube couldn’t load'); };
    document.head.appendChild(tag);
  }

  $('play-toggle').addEventListener('click', () => (playing ? pause() : play()));
  $('next').addEventListener('click', next);
  $('previous').addEventListener('click', previous);
  $('mute-toggle').addEventListener('click', () => {
    if (volume === 0) { volume = MUSIC.VOLUME || 30; muted = false; } else muted = !muted;
    applyVolume(); updateMuteState();
  });
  $('volume').addEventListener('input', event => {
    volume = Math.max(0, Math.min(100, Math.round(Number(event.target.value))));
    muted = false; applyVolume(); updateMuteState();
  });
  $('seek').addEventListener('input', event => {
    seeking = true;
    const d = player && ready ? Number(player.getDuration()) : 0;
    const percent = Number(event.target.value);
    paintRange($('seek'), percent);
    if (d > 0) $('elapsed').textContent = timeLabel(percent / 100 * d);
  });
  $('seek').addEventListener('change', event => {
    seeking = false;
    const d = player && ready ? Number(player.getDuration()) : 0;
    if (d > 0) player.seekTo(Number(event.target.value) / 100 * d, true);
    updateProgress();
  });

  /* =================== CLICK TO ENTER (ghost floats away) =================== */
  function enter() {
    if (entered) return;
    entered = true;
    play(); // inside the user gesture so the browser allows sound
    const entrance = $('entrance');
    entrance.classList.add('leaving');
    entrance.setAttribute('aria-hidden', 'true');
    experience.inert = false;
    document.body.classList.remove('not-entered');
    $('mute-toggle').focus({ preventScroll: true });
    const delay = motionEnabled ? CONFIG.floatAwayMs : 0;
    setTimeout(() => entrance.classList.add('dismissed'), delay);
    syncAnimation();
    startTaglines();
  }
  $('enter-button').addEventListener('click', enter);
  $('entrance').addEventListener('click', enter); // clicking anywhere on the start screen (incl. the ghost) enters

  document.querySelectorAll('[data-soon]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); notify('This social profile is coming soon.');
  }));

  /* =================== KREA VIDEOS: graceful fallback =================== */
  function watchVideo(v, onFail) {
    if (!v || !v.addEventListener) return;
    v.addEventListener('playing', () => v.classList.add('ready'));
    v.addEventListener('error', onFail, true);
    // the <source> elements fire the error; the last one failing means no playable source
    const sources = v.querySelectorAll ? v.querySelectorAll('source') : [];
    if (sources.length) sources[sources.length - 1].addEventListener('error', onFail);
  }
  watchVideo(video, () => video.classList.add('failed'));          // poster image + CSS aurora remain
  watchVideo(ghostVideo, () => { ghostVideo.classList.remove('ready'); $('splash-ghost').classList.remove('video-on'); }); // transparent still remains
  if (ghostVideo && ghostVideo.addEventListener) ghostVideo.addEventListener('playing', () => $('splash-ghost').classList.add('video-on'));

  /* =================== DISCORD LIVE COUNTS =================== */
  const DISCORD_INVITE = 'zenclipsdaily-arc-raiders-store-bloodstrike-1408818003591827539';
  function loadDiscordCounts() {
    if (typeof fetch !== 'function' || !$('dc-online')) return;
    fetch(`https://discord.com/api/v10/invites/${DISCORD_INVITE}?with_counts=true`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => {
        if (Number.isFinite(d.approximate_presence_count)) $('dc-online').textContent = d.approximate_presence_count.toLocaleString();
        if (Number.isFinite(d.approximate_member_count)) $('dc-members').textContent = d.approximate_member_count.toLocaleString();
      })
      .catch(() => { /* keep the dashes */ });
  }

  /* =================== TYPEWRITER TAGLINES =================== */
  let tagTimer = 0, tagIndex = 0;
  function startTaglines() {
    const el = $('tagline'), lines = CONFIG.taglines || [];
    if (!el || lines.length < 2 || tagTimer) return;
    let text = lines[0], typing = false, pos = text.length;
    const step = () => {
      if (!motionEnabled) { el.textContent = lines[tagIndex]; tagTimer = setTimeout(step, 1000); return; }
      if (!typing) {               // deleting
        pos -= 1; el.textContent = text.slice(0, Math.max(pos, 0));
        if (pos <= 0) { tagIndex = (tagIndex + 1) % lines.length; text = lines[tagIndex]; typing = true; }
        tagTimer = setTimeout(step, 28);
      } else {                     // typing
        pos += 1; el.textContent = text.slice(0, pos);
        if (pos >= text.length) { typing = false; tagTimer = setTimeout(step, 3600); return; }
        tagTimer = setTimeout(step, 55);
      }
    };
    tagTimer = setTimeout(step, 4200);
  }

  /* =================== EFFECTS =================== */
  function resetTilt() {
    profile.style.setProperty('--tilt-x', '0deg');
    profile.style.setProperty('--tilt-y', '0deg');
    glow.style.opacity = '0';
    pointerActive = false;
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    if (!ctx) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const number = width < 600 ? 45 : 90;
    particles = Array.from({ length: number }, () => ({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.6 + .4, speed: Math.random() * .22 + .08, drift: Math.random() * Math.PI * 2, alpha: Math.random() * .45 + .25, phase: Math.random() * Math.PI * 2 }));
    drawParticles(0);
  }
  let shooting = [], nextShot = 2500, clock = 0;
  function drawShootingStars(delta) {
    if (!CONFIG.shootingStars) return;
    nextShot -= delta * 16.67;
    if (nextShot <= 0) {
      nextShot = 3000 + Math.random() * 5000;
      const angle = Math.PI * (0.12 + Math.random() * 0.12);
      shooting.push({ x: Math.random() * width * 0.8 + width * 0.1, y: Math.random() * height * 0.35, vx: Math.cos(angle) * 11, vy: Math.sin(angle) * 11, life: 1 });
    }
    for (const s of shooting) {
      s.x += s.vx * delta; s.y += s.vy * delta; s.life -= 0.018 * delta;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 14, s.y - s.vy * 14);
      grad.addColorStop(0, `rgba(255,255,255,${Math.max(s.life, 0)})`);
      grad.addColorStop(1, 'rgba(185,166,255,0)');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 14, s.y - s.vy * 14); ctx.stroke();
    }
    shooting = shooting.filter(s => s.life > 0 && s.x < width + 200 && s.y < height + 200);
  }
  function drawParticles(delta) {
    if (!ctx || !CONFIG.particles) return;
    ctx.clearRect(0, 0, width, height);
    clock += delta;
    for (const p of particles) {
      p.y -= p.speed * delta;
      p.x += Math.sin(p.drift + p.y * .004) * .06 * delta;
      if (p.y < -8) { p.y = height + 8; p.x = Math.random() * width; }
      const twinkle = .55 + .45 * Math.sin(p.phase + clock * .05);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(225,218,255,${p.alpha * twinkle})`;
      ctx.shadowBlur = 9; ctx.shadowColor = '#c3afff'; ctx.fill();
    }
    ctx.shadowBlur = 0;
    drawShootingStars(delta);
  }
  function animate(now) {
    const delta = lastTime ? Math.min((now - lastTime) / 16.67, 3) : 1;
    lastTime = now;
    drawParticles(delta);
    if (CONFIG.cursorGlow && pointerActive && finePointer.matches && entered) {
      glowX += (mouseX - glowX) * .075; glowY += (mouseY - glowY) * .075;
      glow.style.transform = `translate(${glowX}px,${glowY}px)`;
    }
    // Gentle "beat" on the avatar ring while music plays (YouTube audio can't be analysed cross-origin).
    $('avatar-ring').style.setProperty('--pulse', playing ? String(.35 + .35 * Math.sin(now / 260)) : '0');
    frameId = requestAnimationFrame(animate);
  }
  // The background runs from page load (behind the splash too), not only after entry.
  function syncAnimation() {
    cancelAnimationFrame(frameId); lastTime = 0;
    const active = motionEnabled && !document.hidden;
    if (active) frameId = requestAnimationFrame(animate);
    // Krea background + splash ghost videos run from page load; Motion off / hidden tab pauses them.
    [video, ghostVideo].forEach(v => {
      if (!v) return;
      if (active) { const promise = v.play && v.play(); if (promise && promise.catch) promise.catch(() => {}); }
      else if (v.pause) v.pause();
    });
  }
  function setMotion(enabled) {
    motionEnabled = enabled && CONFIG.effects && !reduced.matches;
    document.body.classList.toggle('motion-off', !motionEnabled);
    $('motion-toggle').setAttribute('aria-pressed', String(!motionEnabled));
    $('motion-toggle').setAttribute('aria-label', motionEnabled ? 'Pause visual motion' : 'Enable visual motion');
    if (!motionEnabled) resetTilt();
    syncAnimation();
  }
  $('motion-toggle').addEventListener('click', () => {
    if (reduced.matches || !CONFIG.effects) {
      notify(reduced.matches ? 'Motion stays off to respect your device’s reduced-motion setting.' : 'Visual motion is disabled in the site settings.');
      return;
    }
    setMotion(!motionEnabled);
    saveSetting('ghostapps.motion.v1', motionEnabled ? 'on' : 'off');
  });
  if (reduced.addEventListener) reduced.addEventListener('change', () => setMotion(readSetting('ghostapps.motion.v1') !== 'off'));
  window.addEventListener('pointermove', event => {
    if (!motionEnabled || !finePointer.matches || !entered) return;
    mouseX = event.clientX; mouseY = event.clientY; pointerActive = true;
    if (CONFIG.cursorGlow) glow.style.opacity = '1';
    if (CONFIG.tilt) {
      const rect = profile.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (mouseX - rect.left - rect.width / 2) / (rect.width / 2)));
      const y = Math.max(-1, Math.min(1, (mouseY - rect.top - rect.height / 2) / (rect.height / 2)));
      profile.style.setProperty('--tilt-x', `${-y * 2.2}deg`);
      profile.style.setProperty('--tilt-y', `${x * 2.6}deg`);
      profile.style.setProperty('--glow-x', `${50 + x * 40}%`);
      profile.style.setProperty('--glow-y', `${50 + y * 40}%`);
    }
  }, { passive: true });
  document.addEventListener('pointerleave', resetTilt);
  window.addEventListener('blur', resetTilt);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', syncAnimation);

  resize();
  setMotion(readSetting('ghostapps.motion.v1') !== 'off');
  updateMuteState();
  showMeta();
  updatePlayState();
  loadDiscordCounts();
  loadYouTubeApi(); // preload so the player is ready by the time "click to enter" is pressed
})();
