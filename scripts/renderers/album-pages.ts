import { escapeHtml, formatDisplayDate } from './html-utils';
import type { BuildOptions, ResolvedAlbum, ResolvedTrack, ThemeVariables } from './types';

export function buildAlbumLandingHtml(album: ResolvedAlbum, theme: ThemeVariables, options: BuildOptions): string {
  const songRows = album.tracks
    .map((track, index) => {
      return `
        <a class="song-row" href="${track.contentPathFromRoot}">
          <img class="song-art" src="./content/${escapeHtml(track.trackFolder)}/${escapeHtml(track.artworkFileName)}" alt="${escapeHtml(track.title)} artwork" />
          <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="song-meta">
            <span class="song-title">${escapeHtml(track.title)}</span>
          </span>
        </a>`;
    })
    .join('');

  const releaseText = formatDisplayDate(album.releaseDate, 'long');
  const musicFolderButton = options.includeWavFiles
    ? '<a class="btn secondary" href="./music/">Open Music Folder</a>'
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(album.title)} - Album</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;600;700;800&display=swap');

      :root {
        --bg: ${theme.bg};
        --ink: ${theme.ink};
        --hero: ${theme.hero};
        --muted: ${theme.muted};
        --accent: ${theme.accent};
        --surface: ${theme.surface};
        --line: ${theme.line};
        --bg-0: ${theme.bg0};
        --bg-1: ${theme.bg1};
        --bg-2: ${theme.bg2};
        --gold: ${theme.gold};
        --gold-soft: ${theme.goldSoft};
        --violet: ${theme.violet};
        --violet-soft: ${theme.violetSoft};
        --cyan: ${theme.cyan};
        --text: ${theme.text};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text);
        font-family: "Inter", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 24% 18%, rgba(139, 50, 255, 0.28), transparent 34%),
          radial-gradient(circle at 80% 8%, rgba(55, 240, 231, 0.16), transparent 30%),
          linear-gradient(135deg, var(--bg-0), var(--bg-1) 45%, var(--bg-2));
      }
      .wrap {
        max-width: 1320px;
        margin: 0 auto;
        padding: 42px 28px 80px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(280px, 430px) 1fr;
        gap: 64px;
        align-items: center;
        min-height: 430px;
      }
      .cover {
        position: relative;
        border-radius: 24px;
        overflow: hidden;
        box-shadow:
          0 0 0 3px rgba(228, 168, 74, 0.75),
          0 0 0 6px rgba(139, 50, 255, 0.75),
          0 0 48px rgba(139, 50, 255, 0.8),
          0 0 120px rgba(55, 240, 231, 0.28);
      }
      .cover img {
        display: block;
        width: 100%;
        aspect-ratio: 1/1;
        object-fit: cover;
        filter: contrast(1.12) saturate(1.18);
      }
      .cover::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(135deg, rgba(255, 217, 138, 0.18), transparent 35%),
          linear-gradient(315deg, rgba(55, 240, 231, 0.18), transparent 40%);
        pointer-events: none;
      }
      .meta h1 {
        margin: 0 0 18px;
        font-family: "Cinzel", Georgia, serif;
        font-size: clamp(3.4rem, 7vw, 6.8rem);
        font-weight: 800;
        letter-spacing: 0;
        line-height: 0.9;
        color: var(--gold);
        text-shadow:
          0 0 18px rgba(228, 168, 74, 0.25),
          0 0 46px rgba(139, 50, 255, 0.25);
      }
      .meta p {
        margin: 0 0 12px;
        color: var(--violet-soft);
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.25rem;
        font-weight: 600;
        text-shadow: 0 0 18px rgba(139, 50, 255, 0.45);
      }
      .actions {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 28px;
      }
      .btn {
        display: inline-block;
        padding: 13px 24px;
        border: 1px solid rgba(196, 92, 255, 0.45);
        border-radius: 999px;
        text-decoration: none;
        color: white;
        background: rgba(255, 255, 255, 0.04);
        font-size: 1rem;
        font-weight: 800;
        box-shadow: inset 0 0 18px rgba(139, 50, 255, 0.18);
        transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
      }
      .btn:hover {
        transform: translateY(-2px);
        border-color: var(--cyan);
        box-shadow:
          0 0 24px rgba(139, 50, 255, 0.55),
          0 0 50px rgba(55, 240, 231, 0.22);
      }
      .btn:first-child {
        color: #05030c;
        background: linear-gradient(135deg, var(--violet), #a332ff 55%, var(--cyan));
        border: 0;
        box-shadow:
          0 0 26px rgba(139, 50, 255, 0.65),
          0 0 54px rgba(55, 240, 231, 0.22);
      }
      .btn.secondary {
        color: white;
      }
      .songs {
        margin-top: 56px;
        border: 1px solid var(--line);
        border-radius: 22px;
        background:
          linear-gradient(180deg, rgba(13, 7, 31, 0.88), rgba(8, 5, 20, 0.88)),
          rgba(255, 255, 255, 0.03);
        box-shadow:
          0 0 40px rgba(139, 50, 255, 0.18),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(14px);
        overflow: hidden;
      }
      .songs h2 {
        margin: 0;
        padding: 20px;
        font-family: "Cinzel", Georgia, serif;
        color: white;
        font-size: 1.05rem;
        font-weight: 700;
        letter-spacing: 0;
      }
      .song-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1px;
        background: var(--line);
        border-top: 1px solid var(--line);
      }
      .song-row {
        position: relative;
        display: block;
        min-height: 230px;
        text-decoration: none;
        color: var(--text);
        background: var(--bg-0);
        overflow: hidden;
        isolation: isolate;
        transition: transform 160ms ease, filter 160ms ease;
      }
      .song-row:hover {
        transform: translateY(-3px);
        filter: brightness(1.08);
        z-index: 1;
      }
      .song-art {
        display: block;
        width: 100%;
        aspect-ratio: 1/1;
        object-fit: cover;
        filter: contrast(1.08) saturate(1.14);
        transition: transform 180ms ease;
      }
      .song-row:hover .song-art { transform: scale(1.04); }
      .song-meta {
        position: absolute;
        inset: auto 0 0;
        display: grid;
        gap: 8px;
        padding: 42px 16px 16px;
        background:
          linear-gradient(180deg, transparent, rgba(3, 3, 10, 0.82) 42%, rgba(3, 3, 10, 0.96));
      }
      .song-index {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 2;
        width: 54px;
        padding: 5px 0;
        font-size: 0.9rem;
        color: white;
        border: 1px solid rgba(255, 217, 138, 0.62);
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(9, 5, 26, 0.78);
        box-shadow:
          inset 0 0 12px rgba(139, 50, 255, 0.34),
          0 0 18px rgba(139, 50, 255, 0.42);
        backdrop-filter: blur(6px);
      }
      .song-title {
        color: white;
        font-size: 1.05rem;
        font-weight: 900;
        line-height: 1.15;
      }
      @media (max-width: 900px) {
        .wrap { padding: 32px 18px 56px; }
        .hero {
          grid-template-columns: 1fr;
          gap: 32px;
        }
        .cover { max-width: 420px; }
        .meta h1 { font-size: clamp(3rem, 18vw, 5.2rem); }
        .song-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .song-row { min-height: 190px; }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <figure class="cover">
          <img src="${escapeHtml(album.artworkPathFromRoot)}" alt="${escapeHtml(album.title)} cover art" />
        </figure>
        <section class="meta">
          <h1>${escapeHtml(album.title)}</h1>
          <p>${escapeHtml(releaseText)} | ${album.tracks.length} tracks</p>
          <p>${escapeHtml(album.description)}</p>
          <div class="actions">
            <a class="btn" href="./play-album.html?autoplay=1">Play Album</a>
            ${musicFolderButton}
          </div>
        </section>
      </section>
      <section class="songs">
        <h2>Songs</h2>
        <div class="song-grid">
          ${songRows}
        </div>
      </section>
    </main>
    <script src="./runtime-profile.js"></script>
  </body>
</html>
`;
}

export function buildPlayAlbumHtml(album: ResolvedAlbum, theme: ThemeVariables): string {
  const playlist = album.tracks.map((track) => ({
    title: track.title,
    src: track.audioPathFromRoot,
    audioData: track.audioDataPathFromRoot,
    audioKey: track.audioDataKey,
    page: track.contentPathFromRoot,
    artwork: `./content/${track.trackFolder}/${track.artworkFileName}`
  }));
  const audioDataScripts = album.tracks
    .map((track) => `    <script src="${escapeHtml(track.audioDataPathFromRoot)}"></script>`)
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Play Album - ${escapeHtml(album.title)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;600;700;800&display=swap');

      :root {
        --bg: ${theme.bg};
        --ink: ${theme.ink};
        --hero: ${theme.hero};
        --muted: ${theme.muted};
        --accent: ${theme.accent};
        --surface: ${theme.surface};
        --line: ${theme.line};
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #000;
        color: var(--ink);
        font-family: "Inter", "Segoe UI", sans-serif;
      }
      .art-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        background: #000;
        pointer-events: none;
      }
      .art-backdrop img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        opacity: 0.75;
      }
      body.party-mode-active .art-backdrop {
        display: block;
      }
      body.player-view-mini {
        display: block;
        overflow: hidden;
      }
      body.player-view-micro {
        display: block;
        overflow: hidden;
      }
      .panel {
        position: relative;
        width: min(760px, 94vw);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 22px;
        background: var(--surface);
      }
      .view-switcher {
        position: absolute;
        top: 18px;
        right: 18px;
        display: inline-flex;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(3, 3, 10, 0.78);
        box-shadow: inset 0 0 16px rgba(124, 44, 255, 0.2);
      }
      .view-btn {
        width: 42px;
        height: 42px;
        padding: 0;
        border: 0;
        border-left: 1px solid var(--line);
        border-radius: 0;
        background: transparent;
        color: var(--ink);
        font-size: 1.2rem;
        line-height: 1;
      }
      .view-btn.is-active {
        color: var(--bg);
        background: var(--accent);
        box-shadow: 0 0 22px rgba(124, 44, 255, 0.62);
      }
      .player-layout {
        display: grid;
        grid-template-columns: minmax(180px, 280px) 1fr;
        gap: 20px;
        align-items: start;
      }
      .now-art {
        margin: 0;
        border-radius: 14px;
        overflow: hidden;
        border: 1px solid var(--line);
        background: var(--bg);
        box-shadow:
          0 16px 34px rgba(0, 0, 0, 0.45),
          0 0 34px rgba(124, 44, 255, 0.22);
      }
      .now-art img {
        display: block;
        width: 100%;
        aspect-ratio: 1/1;
        object-fit: cover;
      }
      .now-title {
        margin: 12px 0 0;
        color: var(--hero);
        font-family: "Cinzel", Georgia, serif;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.2;
        text-align: center;
      }
      .player-main { min-width: 0; }
      h1 {
        margin-top: 0;
        color: var(--hero);
        font-family: "Cinzel", Georgia, serif;
        font-weight: 800;
        letter-spacing: 0;
      }
      .sub {
        color: var(--muted);
        margin-bottom: 14px;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.2rem;
        font-weight: 600;
      }
      .controls { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 18px; }
      button, a {
        border: 1px solid ${theme.line};
        background: var(--bg);
        color: var(--ink);
        padding: 10px 14px;
        border-radius: 999px;
        text-decoration: none;
        cursor: pointer;
      }
      button.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 700; }
      ol { margin: 0; padding-left: 20px; }
      li { margin: 8px 0; }
      .now { color: var(--accent); font-weight: 700; }
      .track-select {
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: inherit;
        text-align: left;
      }
      .panel[data-view="mini"] {
        position: fixed;
        left: 24px;
        bottom: 24px;
        width: min(540px, 92vw);
        padding: 28px;
        border-radius: 22px;
        background: rgba(3, 3, 10, 0.9);
      }
      .panel[data-view="mini"] .view-switcher {
        top: 10px;
        right: 10px;
        transform: scale(0.82);
        transform-origin: top right;
      }
      .panel[data-view="mini"] .player-layout {
        grid-template-columns: 174px 1fr;
        align-items: center;
      }
      .panel[data-view="mini"] .now-title,
      .panel[data-view="mini"] h1,
      .panel[data-view="mini"] .controls,
      .panel[data-view="mini"] ol {
        display: none;
      }
      .panel[data-view="mini"] .sub {
        margin: 0 0 18px;
        font-size: 1.35rem;
      }
      .panel[data-view="mini"] .player-main::before {
        content: attr(data-current-title);
        display: block;
        margin-bottom: 8px;
        color: var(--ink);
        font-size: 1.15rem;
        font-weight: 800;
      }
      .panel[data-view="mini"] audio { width: 100%; }
      .panel[data-view="micro"] {
        position: fixed;
        left: 24px;
        bottom: 24px;
        width: min(380px, 88vw);
        padding: 12px 14px;
        border-radius: 999px;
        background: rgba(3, 3, 10, 0.92);
      }
      .panel[data-view="micro"] .now-art,
      .panel[data-view="micro"] h1,
      .panel[data-view="micro"] .sub,
      .panel[data-view="micro"] .controls,
      .panel[data-view="micro"] ol,
      .panel[data-view="micro"] audio {
        display: none;
      }
      .panel[data-view="micro"] .player-layout {
        display: block;
      }
      .panel[data-view="micro"] .view-switcher {
        top: 50%;
        right: 8px;
        transform: translateY(-50%) scale(0.58);
        transform-origin: center right;
      }
      .panel[data-view="micro"] .view-btn {
        width: 34px;
        height: 34px;
      }
      .panel[data-view="micro"] .player-main::before {
        content: "▰▰▌";
        margin-right: 18px;
        color: var(--ink);
      }
      .panel[data-view="micro"] .player-main::after {
        content: attr(data-current-title);
        color: var(--ink);
        font-weight: 800;
      }
      @media (max-width: 680px) {
        body { place-items: start center; padding: 16px 0; }
        .player-layout { grid-template-columns: 1fr; }
        .now-art { width: min(280px, 100%); margin: 0 auto; }
        .view-switcher { position: static; margin: 0 0 16px auto; width: fit-content; }
        .panel[data-view="mini"] .player-layout { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="art-backdrop" aria-hidden="true">
      <img id="backdropArt" src="${escapeHtml(playlist[0]?.artwork || album.artworkPathFromRoot)}" alt="" />
    </div>
    <main class="panel" id="playerPanel" data-view="standard">
      <nav class="view-switcher" aria-label="Player view">
        <button class="view-btn" type="button" data-view="micro" aria-label="Micro view" title="Micro">−</button>
        <button class="view-btn" type="button" data-view="mini" aria-label="Mini view" title="Mini">▦</button>
        <button class="view-btn is-active" type="button" data-view="standard" aria-label="Standard view" title="Standard">□</button>
        <button class="view-btn" type="button" data-view="fullscreen" aria-label="Full Screen view" title="Full Screen">⛶</button>
      </nav>
      <section class="player-layout">
        <figure class="now-art">
          <img id="nowArt" src="${escapeHtml(playlist[0]?.artwork || album.artworkPathFromRoot)}" alt="${escapeHtml(playlist[0]?.title || album.title)} artwork" />
          <figcaption id="nowTitle" class="now-title">${escapeHtml(playlist[0]?.title || album.title)}</figcaption>
        </figure>
        <section class="player-main" id="playerMain" data-current-title="${escapeHtml(playlist[0]?.title || album.title)}">
          <h1>Play Album</h1>
          <p class="sub">${escapeHtml(album.title)}</p>
          <audio id="player" controls style="width:100%;"></audio>
          <div class="controls">
            <button class="primary" id="playBtn">Play Album</button>
            <button id="nextBtn">Next Song</button>
            <a href="./START-HERE.html">Back to Album</a>
          </div>
          <ol id="list"></ol>
        </section>
      </section>
    </main>
    <div class="party-div" aria-hidden="true"></div>
${audioDataScripts}
    <script src="./runtime-profile.js"></script>
    <script>
      const playlist = ${JSON.stringify(playlist)};
      const player = document.getElementById('player');
      const playerPanel = document.getElementById('playerPanel');
      const playerMain = document.getElementById('playerMain');
      const list = document.getElementById('list');
      const backdropArt = document.getElementById('backdropArt');
      const nowArt = document.getElementById('nowArt');
      const nowTitle = document.getElementById('nowTitle');
      const playBtn = document.getElementById('playBtn');
      const nextBtn = document.getElementById('nextBtn');
      const viewButtons = Array.from(document.querySelectorAll('.view-btn'));
      const shouldAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1';
      let index = 0;

      async function getPlayableSrc(item) {
        return window.albumRuntime.audioProvider.getAudioUrl(item);
      }

      function renderList() {
        list.innerHTML = playlist.map((item, i) => {
          const cls = i === index ? 'class="now"' : '';
          return '<li ' + cls + '><button class="track-select" type="button" data-track-index="' + i + '">' + item.title + '</button></li>';
        }).join('');
      }

      async function loadTrack(newIndex) {
        index = (newIndex + playlist.length) % playlist.length;
        player.src = await getPlayableSrc(playlist[index]);
        nowArt.src = playlist[index].artwork;
        nowArt.alt = playlist[index].title + ' artwork';
        backdropArt.src = playlist[index].artwork;
        nowTitle.textContent = playlist[index].title;
        playerMain.dataset.currentTitle = playlist[index].title;
        renderList();
      }

      async function requestFullscreenMicro() {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            try { await document.exitFullscreen(); } catch (err) { console.error(err); }
          }
          setView('standard');
          return;
        }

        setView('micro', false);
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.error(err);
        }
      }

      function setView(view, persist = true) {
        if (!['standard', 'mini', 'micro'].includes(view)) {
          view = 'standard';
        }
        playerPanel.dataset.view = view;
        document.body.classList.remove('player-view-standard', 'player-view-mini', 'player-view-micro');
        document.body.classList.add('player-view-' + view);
        viewButtons.forEach((button) => {
          button.classList.toggle('is-active', button.dataset.view === view);
        });
        if (persist) {
          localStorage.setItem('albumPlayerView', view);
        }
      }

      viewButtons.forEach((button) => {
        button.addEventListener('click', async () => {
          if (button.dataset.view === 'fullscreen') {
            await requestFullscreenMicro();
            return;
          }
          setView(button.dataset.view);
        });
      });

      document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
          setView('standard');
        }
      });

      async function togglePlayback() {
        if (player.paused) {
          if (!player.src) {
            await loadTrack(index);
          }
          try { await player.play(); } catch (err) { console.error(err); }
          return;
        }
        player.pause();
      }

      function isPlayerActivelyPlaying() {
        return Boolean(!player.paused && !player.ended && player.readyState > 0);
      }

      playerPanel.addEventListener('click', async (event) => {
        if (playerPanel.dataset.view !== 'micro') {
          return;
        }
        if (event.target.closest('.view-switcher')) {
          return;
        }
        await togglePlayback();
      });

      async function previousTrack() {
        const wasPlaying = isPlayerActivelyPlaying();
        await loadTrack(index - 1);
        if (wasPlaying) {
          try { await player.play(); } catch (err) { console.error(err); }
        }
      }

      function applyRuntimeProfile() {
        const profile = window.albumRuntime.getProfile();
        player.preload = profile.player.preload;
        if (profile.player.uiDensity === 'compact' && playerPanel.dataset.view === 'standard') {
          setView('mini', false);
        }
      }

      async function nextTrack() {
        const wasPlaying = isPlayerActivelyPlaying();
        await loadTrack(index + 1);
        if (wasPlaying) {
          try { await player.play(); } catch (err) { console.error(err); }
        }
      }

      async function playTrack(newIndex) {
        await loadTrack(newIndex);
        try { await player.play(); } catch (err) { console.error(err); }
      }

      function isTypingTarget(target) {
        if (!target) {
          return false;
        }
        const tagName = target.tagName;
        return Boolean(
          target.isContentEditable ||
          target.closest('[contenteditable="true"]') ||
          (tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName))
        );
      }

      list.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-track-index]');
        if (!button) {
          return;
        }
        await playTrack(Number(button.dataset.trackIndex));
      });

      document.addEventListener('keydown', async (event) => {
        if (event.code === 'Space') {
          if (event.repeat || isTypingTarget(event.target)) {
            return;
          }
          event.preventDefault();
          await togglePlayback();
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          await previousTrack();
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          await nextTrack();
        }

        if (event.key === 'Escape') {
          if (document.fullscreenElement && document.exitFullscreen) {
            try { await document.exitFullscreen(); } catch (err) { console.error(err); }
          }
          setView('standard');
        }
      });

      playBtn.addEventListener('click', async () => {
        await togglePlayback();
      });

      nextBtn.addEventListener('click', async () => {
        await nextTrack();
      });

      player.addEventListener('ended', async () => {
        await loadTrack(index + 1);
        try { await player.play(); } catch (err) { console.error(err); }
      });

      loadTrack(0)
        .then(async () => {
          if (shouldAutoplay) {
            try { await player.play(); } catch (err) { console.error(err); }
          }
        })
        .catch((err) => console.error(err));
      setView(localStorage.getItem('albumPlayerView') || 'standard');
      applyRuntimeProfile();
      window.addEventListener('album-runtime-profile-change', applyRuntimeProfile);
    </script>
    <script src="./party-mode.js"></script>
  </body>
</html>
`;
}

export function buildSongPageHtml(album: ResolvedAlbum, track: ResolvedTrack, currentIndex: number, theme: ThemeVariables): string {
  const nextTrack = album.tracks[(currentIndex + 1) % album.tracks.length];
  const isLastTrack = currentIndex === album.tracks.length - 1;
  const secondaryActionHref = isLastTrack
    ? '../../START-HERE.html'
    : `../${nextTrack.trackFolder}/index.html`;
  const secondaryActionLabel = isLastTrack ? 'Album' : 'Next Song';
  const secondaryActionAttributes = isLastTrack
    ? ''
    : ' id="secondaryAction"';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(track.title)} - ${escapeHtml(album.title)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter:wght@400;600;700;800&display=swap');

      :root {
        --bg: ${theme.bg};
        --ink: ${theme.ink};
        --hero: ${theme.hero};
        --muted: ${theme.muted};
        --accent: ${theme.accent};
        --surface: ${theme.surface};
        --line: ${theme.line};
      }
      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        background: linear-gradient(180deg, var(--bg), var(--bg));
        font-family: "Inter", "Segoe UI", sans-serif;
      }
      .wrap { max-width: 900px; margin: 0 auto; padding: 28px 18px 48px; }
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: color-mix(in srgb, var(--bg) 70%, transparent);
        backdrop-filter: blur(4px);
        color: var(--ink);
        text-decoration: none;
        font-weight: 600;
      }
      .back-link:hover { filter: brightness(1.08); }
      .back-link .icon {
        width: 16px;
        height: 16px;
        display: inline-block;
        flex: 0 0 16px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 18px;
        background: var(--surface);
      }
      .song-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .cover {
        width: min(440px, 92vw);
        border-radius: 14px;
        overflow: hidden;
        margin: 0 auto;
        border: 1px solid var(--line);
        position: relative;
      }
      .cover .back-link {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 2;
      }
      .cover img { width: 100%; display: block; aspect-ratio: 1/1; object-fit: cover; }
      h1 {
        margin: 0 0 8px;
        color: var(--hero);
        font-family: "Cinzel", Georgia, serif;
        font-weight: 800;
        letter-spacing: 0;
      }
      p {
        color: var(--muted);
        margin: 0 0 14px;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.18rem;
        font-weight: 600;
      }
      .song-info { display: grid; gap: 12px; }
      .actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 14px;
      }
      button, a {
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--ink);
        padding: 10px 14px;
        border-radius: 999px;
        text-decoration: none;
        cursor: pointer;
        text-align: center;
      }
      button.primary { background: var(--accent); color: var(--bg); border-color: var(--accent); font-weight: 700; }
      audio { width: 100%; }
      @media (max-width: 980px) {
        .wrap { padding: 18px 14px 28px; }
        .card { padding: 14px; }
        .song-layout { gap: 12px; }
        .cover { width: min(74vw, 360px); }
      }
      @media (max-width: 700px) {
        .wrap { padding: 14px 12px 22px; }
        .card { padding: 12px; }
        .song-layout { gap: 12px; }
        .cover { width: min(78vw, 320px); }
        .song-info { gap: 8px; }
        .actions { margin: 6px 0 8px; gap: 8px; }
      }
      @media (max-width: 540px) {
        .actions { grid-template-columns: 1fr; }
      }
      @media (orientation: landscape) and (min-width: 860px) {
        .card { padding: 22px; }
        .song-layout {
          grid-template-columns: minmax(260px, 420px) 1fr;
          gap: 22px;
          align-items: start;
        }
        .cover {
          width: 100%;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <section class="song-layout">
          <figure class="cover">
            <a class="back-link" href="../../START-HERE.html" aria-label="Back to album">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M15 5L8 12L15 19"
                  stroke="currentColor"
                  stroke-width="3.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </a>
            <img src="./${escapeHtml(track.artworkFileName)}" alt="${escapeHtml(track.title)} artwork" />
          </figure>
          <section class="song-info">
            <h1>${escapeHtml(track.title)}</h1>
            <p>From ${escapeHtml(album.title)}</p>
            <div class="actions">
              <button id="playSong" class="primary">Play Song</button>
              <a${secondaryActionAttributes} href="${escapeHtml(secondaryActionHref)}">${escapeHtml(secondaryActionLabel)}</a>
            </div>
            <audio id="player" controls src="../../${escapeHtml(track.audioPathFromRoot.replace(/^\.\//, ''))}"></audio>
          </section>
        </section>
      </section>
    </main>
    <div class="party-div" aria-hidden="true"></div>
    <script src="../../${escapeHtml(track.audioDataPathFromRoot.replace(/^\.\//, ''))}"></script>
    <script src="../../runtime-profile.js"></script>
    <script>
      const player = document.getElementById('player');
      const playSong = document.getElementById('playSong');
      const secondaryAction = document.getElementById('secondaryAction');
      const audioKey = ${JSON.stringify(track.audioDataKey)};
      const shouldAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1';

      window.albumRuntime.audioProvider.getAudioUrl({
        src: player.getAttribute('src'),
        audioKey
      }).then((url) => {
        player.src = url;
        player.preload = window.albumRuntime.getProfile().player.preload;
      }).catch((err) => console.error(err));

      function isPlayerActivelyPlaying() {
        return Boolean(!player.paused && !player.ended && player.readyState > 0);
      }

      playSong.addEventListener('click', async () => {
        try { await player.play(); } catch (err) { console.error(err); }
      });

      if (secondaryAction) {
        secondaryAction.addEventListener('click', (event) => {
          if (!isPlayerActivelyPlaying()) {
            return;
          }

          event.preventDefault();
          const nextUrl = new URL(secondaryAction.href);
          nextUrl.searchParams.set('autoplay', '1');
          window.location.href = nextUrl.toString();
        });
      }

      if (shouldAutoplay) {
        player.play().catch((err) => console.error(err));
      }
    </script>
    <script src="../../party-mode.js"></script>
  </body>
</html>
`;
}

