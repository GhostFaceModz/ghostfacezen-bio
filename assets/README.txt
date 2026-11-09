GHOSTAPPS BIO PAGE — ASSETS & EDITING GUIDE

ASSETS
ghostflix-icon.png  — GhostFlix app icon (192px), from ghostflix.uk/icons/icon-192.png (its web manifest).
ghostgames-icon.png — GhostGames app icon (192px), from ghostgames.app/ghostgames/icons/icon-192.png.
discord-icon.webp — ZenClipsDaily x GhostApps Discord server icon (animated WebP, 256px), downloaded from the Discord CDN via the public invite. Used as the profile avatar.
discord-icon.png  — same icon, static PNG (450px). Fallback for browsers without WebP, and the favicon.
cover.svg         — placeholder artwork shown until YouTube's thumbnail loads.
og-preview.png    — 1200x630 share-preview artwork (og:image points at the live GitHub Pages URL).
background/       — optional video slot (see its README). Not required; the CSS aurora mesh, fog, grid and particles run without it.

CHOOSING YOUR MUSIC (YouTube, like YouTube Music on Discord)
Open script.js. At the very top is the MUSIC block:

  PLAYLIST: [
    { id: '8xdmFpNb8EI', title: '...', artist: '...' },
    ...
  ],
  PLAYLIST_ID: '',
  SHUFFLE: false,
  VOLUME: 30

- Option A (song list): put the YouTube video IDs you want in PLAYLIST. The ID is the bit after "watch?v=" in a
  YouTube link (https://www.youtube.com/watch?v=8xdmFpNb8EI -> 8xdmFpNb8EI; for youtu.be/XXXX links it's XXXX).
  title/artist are optional; the real YouTube title, channel and thumbnail are shown once a song loads.
- Option B (whole playlist): paste a YouTube playlist ID (the bit after "list=" in a playlist link) into PLAYLIST_ID.
  When PLAYLIST_ID is filled in, it replaces the PLAYLIST list.
- SHUFFLE: true starts on a random song. VOLUME: starting volume 0–100.
- Current playlist (Zane's picks, in order): 8xdmFpNb8EI, DZrG_Cjx1L8, oblsGyGuoIY, HGrW7jSFqyE, 0E5c8Ol-5xo.
  YouTube Music links work too: music.youtube.com/watch?v=ID&si=... -> just copy the ID after v= (ignore &si=...).
- Songs whose owner has disabled embedding (common for big-label music videos) are skipped automatically.
  Tip: "Topic" / official audio uploads and NCS-style channels usually embed fine.

HOW THE PLAYER WORKS
- Uses the official YouTube IFrame Player API. The YouTube iframe is hidden/minimised; the card shows a custom player
  (play/pause, previous/next, seek, volume, mute, title, channel, thumbnail, "YouTube ↗" link to the current song).
- Music starts when the visitor clicks "click to enter" (browsers only allow sound after a click/tap).
- Must be served over http(s) — opening index.html straight from disk (file://) stops YouTube from playing.
- Taglines under the bio: edit CONFIG.taglines in script.js. Shooting stars: CONFIG.shootingStars.
- The avatar ring "beats" while music plays (YouTube audio can't be analysed directly, so it's a visual pulse).

EDITING
- Name / handle / badges / bio / links: index.html. YouTube links to https://www.youtube.com/@GhostGames_App. The two remaining social placeholders (X, Instagram) have href="#", data-soon and
  aria-disabled. Remove the latter two attributes when adding real URLs.
- Fonts: GhostFaceZen uses "Unbounded" (Google Fonts), with Space Grotesk/Inter for labels and body. If Google Fonts
  can't load, system fallbacks are used (see --font-* in style.css :root).
- Palette / layout: style.css :root.
- Effects: CONFIG near the top of script.js. effects:false is the master off switch; floatAwayMs sets the length of
  the ghost float-away on entry.
- Sound and Motion controls are separate: Sound mutes, pause stops. Motion pauses the animated background, card edge
  glow, cursor glow, tilt and optional video. A device reduced-motion preference always wins. Motion choice is saved locally.
- Local visits are a per-page-load count in this browser's localStorage, NOT unique users or a server-wide view count.

Verification: node --check script.js && node --test tests/*.test.cjs
