import { escapeHtml, formatDisplayDate } from './html-utils';
import type { BuildOptions, ResolvedAlbum, ResolvedTrack, ThemeVariables } from './types';

export function buildAlbumLandingHtml(album: ResolvedAlbum, theme: ThemeVariables, options: BuildOptions): string {
  const songRows = album.tracks
    .map((track, index) => {
      const trackNumber = String(index + 1).padStart(2, '0');
      return `
        <a class="song-row" href="./play-album.html?track=${trackNumber}">
          <img class="song-art" src="./content/${escapeHtml(track.trackFolder)}/${escapeHtml(track.artworkFileName)}" alt="${escapeHtml(track.title)} artwork" />
          <span class="song-index">${trackNumber}</span>
          <span class="song-meta">
            <span class="song-title">${escapeHtml(track.title)}</span>
          </span>
        </a>`;
    })
    .join('');

  const releaseText = formatDisplayDate(album.releaseDate, 'long');

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
    page: track.contentPathFromRoot,
    artwork: `./content/${track.trackFolder}/${track.artworkFileName}`
  }));

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
      .panel {
        position: relative;
        width: min(760px, 94vw);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 22px;
        background: var(--surface);
      }
      .desktop-top-actions {
        position: absolute;
        top: 18px;
        right: 18px;
        z-index: 6;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: opacity 180ms ease;
      }
      .desktop-action-btn {
        min-height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(3, 3, 10, 0.78);
        color: var(--ink);
        box-shadow: inset 0 0 16px rgba(124, 44, 255, 0.2);
      }
      .desktop-exit-btn {
        width: 42px;
        padding: 0;
        font-size: 1.45rem;
        line-height: 1;
      }
      .desktop-fullscreen-btn {
        padding: 0 16px;
        font-weight: 800;
      }
      .is-fullscreen .desktop-fullscreen-btn,
      .standard-party-controls-hidden .desktop-fullscreen-btn {
        display: none;
      }
      @media (hover: hover) and (pointer: fine) {
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard.standard-party-controls-hidden main.panel,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard.standard-party-controls-hidden .player-layout,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard.standard-party-controls-hidden .desktop-top-actions,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard.standard-party-controls-hidden .party-mode-button {
          opacity: 0;
          pointer-events: none;
        }
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard main.panel,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard .player-layout,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard .desktop-top-actions,
        body.party-mode-active:not(.runtime-profile-mobile).player-view-standard .party-mode-button {
          transition: opacity 220ms ease;
        }
      }
      .player-layout {
        display: grid;
        grid-template-columns: minmax(180px, 280px) 1fr;
        gap: 20px;
        align-items: start;
        padding-top: 46px;
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
      .now-title { display: none; }
      .player-main { min-width: 0; }
      h1 {
        margin: 0 0 10px;
        color: var(--hero);
        font-family: "Cinzel", Georgia, serif;
        font-size: clamp(2.1rem, 5vw, 3.6rem);
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: 0;
      }
      .sub {
        color: var(--muted);
        margin: 0 0 18px;
        font-family: "Cormorant Garamond", Georgia, serif;
        font-size: 1.2rem;
        font-weight: 600;
      }
      .controls {
        display: grid;
        grid-template-columns: 48px 74px 48px;
        column-gap: 28px;
        justify-content: center;
        align-items: center;
        margin: 20px 0 22px;
      }
      .transport-control,
      .transport-control-small {
        appearance: none;
        -webkit-appearance: none;
        display: grid;
        place-items: center;
        padding: 0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 999px;
        background: rgba(7, 4, 16, 0.58);
        color: white;
        box-shadow:
          inset 0 0 18px rgba(139, 50, 255, 0.22),
          0 0 24px rgba(139, 50, 255, 0.22);
      }
      .transport-control {
        width: 74px;
        height: 74px;
        border-color: rgba(173, 70, 255, 0.82);
        font-size: 2.1rem;
        box-shadow:
          inset 0 0 20px rgba(139, 50, 255, 0.3),
          0 0 30px rgba(139, 50, 255, 0.58);
      }
      .transport-control-small {
        width: 48px;
        height: 48px;
        font-size: 1.25rem;
      }
      .transport-play-icon {
        display: grid;
        place-items: center;
        position: relative;
        width: 30px;
        height: 30px;
        line-height: 1;
      }
      .transport-play-icon::before {
        content: '';
        width: 0;
        height: 0;
        border-top: 12px solid transparent;
        border-bottom: 12px solid transparent;
        border-left: 18px solid currentColor;
        transform: translateX(2px);
      }
      .transport-control.is-playing .transport-play-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 7px;
      }
      .transport-control.is-playing .transport-play-icon::before,
      .transport-control.is-playing .transport-play-icon::after {
        content: '';
        width: 7px;
        height: 24px;
        border-radius: 2px;
        background: currentColor;
        border: 0;
        transform: none;
      }
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
      .next-up {
        display: grid;
        width: 100%;
        margin-top: 24px;
        padding: 18px 22px;
        border: 1px solid rgba(196, 92, 255, 0.32);
        border-radius: 18px;
        background:
          linear-gradient(135deg, rgba(139, 50, 255, 0.16), rgba(55, 240, 231, 0.08)),
          rgba(7, 4, 16, 0.46);
        color: var(--ink);
        text-align: left;
        box-shadow:
          inset 0 0 22px rgba(139, 50, 255, 0.12),
          0 0 28px rgba(139, 50, 255, 0.14);
        transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
      }
      .next-up:hover {
        transform: translateY(-2px);
        border-color: rgba(55, 240, 231, 0.54);
        box-shadow:
          inset 0 0 24px rgba(139, 50, 255, 0.16),
          0 0 32px rgba(139, 50, 255, 0.24);
      }
      .next-up-label {
        color: var(--accent);
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .next-up-title {
        margin-top: 5px;
        color: white;
        font-family: "Cinzel", Georgia, serif;
        font-size: clamp(1.2rem, 2.8vw, 1.8rem);
        font-weight: 800;
        line-height: 1.08;
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
      .panel[data-view="mini"] .desktop-top-actions {
        display: none;
      }
      .panel[data-view="mini"] .player-layout {
        grid-template-columns: 174px 1fr;
        align-items: center;
        padding-top: 0;
      }
      .panel[data-view="mini"] .now-title,
      .panel[data-view="mini"] h1,
      .panel[data-view="mini"] .sub,
      .panel[data-view="mini"] .controls,
      .panel[data-view="mini"] .next-up {
        display: none;
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
      .mobile-party-ui,
      .mobile-tracklist {
        display: none;
      }
      .autoplay-cta {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 9;
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 14px;
        min-height: 64px;
        max-width: min(90vw, 280px);
        width: min(90vw, 280px);
      }
      .autoplay-scrim {
        position: fixed;
        inset: 0;
        z-index: 8;
        background: rgba(0, 0, 0, 0.7);
      }
      .autoplay-scrim[hidden] {
        display: none;
      }
      .autoplay-cta[hidden] {
        display: none;
      }
      .autoplay-cta-button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 56px;
        padding: 0 18px;
        width: 100%;
        border: 1px solid rgba(228, 168, 74, 0.82);
        border-radius: 999px;
        background: linear-gradient(135deg, rgba(139, 50, 255, 0.92), rgba(55, 240, 231, 0.78));
        color: #05030c;
        font-size: 0.95rem;
        font-weight: 900;
        letter-spacing: 0.02em;
        cursor: pointer;
        box-shadow:
          0 0 20px rgba(228, 168, 74, 0.38),
          0 0 40px rgba(139, 50, 255, 0.32);
        transition: transform 120ms ease, box-shadow 120ms ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .autoplay-cta-button:hover {
        transform: translateY(-2px);
        box-shadow:
          0 0 28px rgba(228, 168, 74, 0.48),
          0 0 56px rgba(139, 50, 255, 0.42);
      }
      .autoplay-cta-button[hidden] {
        display: none;
      }
      .autoplay-cta-button:active {
        transform: translateY(0);
      }
      .autoplay-cta-button-icon {
        font-size: 1.25rem;
        display: inline-block;
        line-height: 1;
      }
      @media (max-width: 900px), (pointer: coarse) {
        body.runtime-profile-mobile.party-mode-active,
        body.runtime-profile-mobile.player-view-party {
          display: block;
          min-height: 100svh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, rgba(139, 50, 255, 0.34), transparent 34%),
            #000;
          touch-action: manipulation;
        }
        body.runtime-profile-mobile.party-mode-active .art-backdrop,
        body.runtime-profile-mobile.player-view-party .art-backdrop {
          display: block;
        }
        body.runtime-profile-mobile.player-view-party .art-backdrop img {
          object-fit: contain;
          opacity: 1;
        }
        body.runtime-profile-mobile.party-mode-active .art-backdrop img {
          opacity: 0.75;
        }
        body.runtime-profile-mobile.party-mode-active .party-div {
          display: block;
          z-index: 2;
          opacity: 0.75;
        }
        body.runtime-profile-mobile.party-mode-active .party-mode-button,
        body.runtime-profile-mobile.player-view-party .party-mode-button {
          display: none;
        }
        body.runtime-profile-mobile.party-mode-active .panel,
        body.runtime-profile-mobile.player-view-party .panel {
          position: fixed;
          inset: 0;
          z-index: 3;
          width: 100vw;
          min-height: 100svh;
          padding: max(18px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
          box-sizing: border-box;
          border: 0;
          border-radius: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.02) 36%, rgba(0, 0, 0, 0.74));
          box-shadow: inset 0 0 0 1px rgba(139, 50, 255, 0.16);
        }
        body.runtime-profile-mobile.party-mode-active .panel::before,
        body.runtime-profile-mobile.player-view-party .panel::before {
          content: "";
          position: fixed;
          inset: 12px;
          border: 1px solid rgba(167, 70, 255, 0.6);
          border-radius: 28px;
          box-shadow:
            inset 0 0 24px rgba(139, 50, 255, 0.24),
            0 0 42px rgba(139, 50, 255, 0.34);
          pointer-events: none;
        }
        body.runtime-profile-mobile.party-mode-active .player-layout,
        body.runtime-profile-mobile.player-view-party .player-layout,
        body.runtime-profile-mobile.party-mode-active .desktop-top-actions,
        body.runtime-profile-mobile.player-view-party .desktop-top-actions,
        body.runtime-profile-mobile.party-mode-active .player-main > h1,
        body.runtime-profile-mobile.player-view-party .player-main > h1,
        body.runtime-profile-mobile.party-mode-active .player-main > .sub,
        body.runtime-profile-mobile.player-view-party .player-main > .sub,
        body.runtime-profile-mobile.party-mode-active .player-main > audio,
        body.runtime-profile-mobile.player-view-party .player-main > audio,
        body.runtime-profile-mobile.party-mode-active .player-main > .controls,
        body.runtime-profile-mobile.player-view-party .player-main > .controls,
        body.runtime-profile-mobile.party-mode-active .next-up,
        body.runtime-profile-mobile.player-view-party .next-up {
          display: none;
        }
        body.runtime-profile-mobile.party-mode-active .mobile-party-ui,
        body.runtime-profile-mobile.player-view-party .mobile-party-ui {
          position: relative;
          z-index: 4;
          display: grid;
          grid-template-rows: auto 1fr auto;
          min-height: calc(100svh - max(36px, env(safe-area-inset-top)) - max(36px, env(safe-area-inset-bottom)));
          color: white;
          pointer-events: none;
          transition: opacity 220ms ease, transform 220ms ease;
        }
        .mobile-party-top {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          padding: 22px 20px 0;
          transition: opacity 220ms ease, transform 220ms ease;
        }
        .mobile-party-top > div {
          min-width: 0;
        }
        .mobile-party-kicker {
          margin: 0 0 2px;
          color: var(--hero);
          font-size: 0.88rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          text-shadow: 0 0 18px rgba(228, 168, 74, 0.38);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-party-title {
          margin: 0;
          color: rgba(255, 255, 255, 0.86);
          font-size: 0.92rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .mobile-exit-btn {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.42);
          color: white;
          font-size: 1.45rem;
          line-height: 1;
          text-decoration: none;
          box-shadow: 0 0 24px rgba(139, 50, 255, 0.26);
          cursor: pointer;
          pointer-events: auto;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .mobile-party-spacer {
          min-height: 36svh;
        }
        .mobile-party-bottom {
          display: grid;
          gap: 18px;
          width: min(calc(100vw - 72px), 360px);
          max-width: 100%;
          margin: 0 auto;
          padding: 14px 14px 18px;
          border: 1px solid rgba(167, 70, 255, 0.24);
          border-radius: 24px;
          background: rgba(7, 4, 16, 0.1);
          box-sizing: border-box;
          pointer-events: auto;
          transition: opacity 220ms ease, transform 220ms ease;
        }
        body.runtime-profile-mobile.mobile-controls-idle .mobile-party-bottom {
          opacity: 0;
          pointer-events: none;
          transform: translateY(14px);
        }
        .mobile-time-row {
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) 46px;
          gap: 10px;
          align-items: center;
          color: rgba(255, 255, 255, 0.64);
          font-size: 0.78rem;
          font-variant-numeric: tabular-nums;
        }
        .mobile-time-row > span {
          min-width: 0;
        }
        .mobile-time-row > span:last-child {
          justify-self: end;
          text-align: right;
        }
        .mobile-time-row > span:first-child,
        .mobile-time-row > span:last-child {
          width: 46px;
        }
        .mobile-progress {
          position: relative;
          min-width: 0;
          height: 4px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.18);
        }
        .mobile-progress-fill {
          display: block;
          width: 0%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, var(--accent), var(--cyan));
          box-shadow: 0 0 16px rgba(139, 50, 255, 0.86);
        }
        .mobile-control-row {
          display: grid;
          grid-template-columns: 48px 74px 48px;
          column-gap: 28px;
          justify-content: center;
          align-items: center;
        }
        .mobile-control,
        .mobile-control-small {
          appearance: none;
          -webkit-appearance: none;
          display: grid;
          place-items: center;
          -webkit-tap-highlight-color: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(7, 4, 16, 0.58);
          color: white;
          box-shadow:
            inset 0 0 18px rgba(139, 50, 255, 0.22),
            0 0 24px rgba(139, 50, 255, 0.22);
        }
        .mobile-control {
          width: 74px;
          height: 74px;
          border-color: rgba(173, 70, 255, 0.82);
          font-size: 2.1rem;
          box-shadow:
            inset 0 0 20px rgba(139, 50, 255, 0.3),
            0 0 30px rgba(139, 50, 255, 0.58);
        }
        .mobile-play-icon {
          display: grid;
          place-items: center;
          position: relative;
          width: 30px;
          height: 30px;
          line-height: 1;
        }
        .mobile-play-icon::before {
          content: '';
          width: 0;
          height: 0;
          border-top: 12px solid transparent;
          border-bottom: 12px solid transparent;
          border-left: 18px solid currentColor;
          transform: translateX(2px);
        }
        .mobile-control.is-playing .mobile-play-icon {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
        }
        .mobile-control.is-playing .mobile-play-icon::before,
        .mobile-control.is-playing .mobile-play-icon::after {
          content: '';
          width: 7px;
          height: 24px;
          border-radius: 2px;
          background: currentColor;
          border: 0;
          transform: none;
        }
        .mobile-control-small {
          width: 48px;
          height: 48px;
          font-size: 1.25rem;
        }
        .mobile-secondary-row {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin: 0 auto;
        }
        .mobile-chip,
        .mobile-icon-btn {
          appearance: none;
          -webkit-appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(7, 4, 16, 0.62);
          color: rgba(255, 255, 255, 0.9);
          box-shadow: inset 0 0 18px rgba(139, 50, 255, 0.16);
        }
        .mobile-chip {
          width: 100%;
          max-width: none;
          padding: 0 16px;
          font-weight: 800;
          white-space: nowrap;
          min-width: 0;
        }
        .mobile-chip.is-active {
          border-color: rgba(228, 168, 74, 0.72);
          color: rgba(255, 255, 255, 0.97);
          background: linear-gradient(135deg, rgba(139, 50, 255, 0.88), rgba(55, 240, 231, 0.7));
          box-shadow:
            0 0 20px rgba(228, 168, 74, 0.36),
            0 0 34px rgba(139, 50, 255, 0.28);
        }
        .mobile-chip:focus-visible,
        .mobile-chip:active {
          color: rgba(255, 255, 255, 0.97);
          background: linear-gradient(135deg, rgba(139, 50, 255, 0.88), rgba(55, 240, 231, 0.7));
          outline: none;
        }
        .mobile-icon-btn {
          flex: 0 0 44px;
          width: 44px;
          -webkit-tap-highlight-color: transparent;
          padding: 0;
          font-size: 1.05rem;
        }
        .mobile-control:focus-visible,
        .mobile-control-small:focus-visible,
        .mobile-icon-btn:focus-visible {
          outline: none;
          border-color: rgba(173, 70, 255, 0.82);
        }
        #mobileVolumeBtn {
          display: none;
        }
        #mobileTracklistBtn {
          width: min(100%, 240px);
        }
        body.runtime-profile-mobile.party-mode-active .mobile-tracklist,
        body.runtime-profile-mobile.player-view-party .mobile-tracklist {
          position: fixed;
          left: max(24px, env(safe-area-inset-left));
          right: max(24px, env(safe-area-inset-right));
          bottom: max(24px, env(safe-area-inset-bottom));
          z-index: 6;
          display: grid;
          gap: 8px;
          max-height: min(58svh, 420px);
          padding: 18px;
          border: 1px solid rgba(139, 50, 255, 0.62);
          border-radius: 22px;
          background: rgba(8, 5, 20, 0.94);
          box-shadow: 0 0 44px rgba(139, 50, 255, 0.42);
          backdrop-filter: blur(18px);
          transform: translateY(calc(100% + 36px));
          transition: transform 220ms ease;
          overflow: auto;
        }
        body.mobile-tracklist-open .mobile-tracklist {
          transform: translateY(0);
        }
        .mobile-tracklist-title {
          margin: 0 0 4px;
          color: var(--hero);
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .mobile-tracklist button {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: rgba(255, 255, 255, 0.86);
          text-align: left;
        }
        .mobile-tracklist button.is-active {
          background: rgba(139, 50, 255, 0.34);
          color: white;
        }
        @media (orientation: landscape) and (max-height: 620px) {
          body.runtime-profile-mobile.party-mode-active .panel::before,
          body.runtime-profile-mobile.player-view-party .panel::before {
            inset: 10px 24px;
            border-radius: 30px;
          }
          body.runtime-profile-mobile.party-mode-active .mobile-party-ui,
          body.runtime-profile-mobile.player-view-party .mobile-party-ui {
            min-height: calc(100svh - 28px);
            grid-template-rows: auto 1fr;
          }
          .mobile-party-spacer {
            display: none;
          }
          .mobile-party-bottom {
            align-self: end;
            max-width: 620px;
            justify-self: center;
            width: min(74vw, 620px);
            padding: 12px 14px 14px;
          }
          .mobile-party-top {
            padding: 18px 48px 0;
          }
          .mobile-control {
            width: 70px;
            height: 70px;
          }
        }
      }
      @media (max-width: 680px) {
        body { place-items: start center; padding: 16px 0; }
        .player-layout { grid-template-columns: 1fr; }
        .now-art { width: min(280px, 100%); margin: 0 auto; }
        .panel[data-view="mini"] .player-layout { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="art-backdrop" aria-hidden="true">
      <img id="backdropArt" src="${escapeHtml(playlist[0]?.artwork || album.artworkPathFromRoot)}" alt="" />
    </div>
    <main class="panel" id="playerPanel" data-view="standard">
      <nav class="desktop-top-actions" aria-label="Player actions">
        <button class="desktop-action-btn desktop-fullscreen-btn" id="fullscreenBtn" type="button">Full Screen</button>
        <a class="desktop-action-btn desktop-exit-btn" href="./START-HERE.html" aria-label="Return to Start" title="Return to Start">←</a>
      </nav>
      <section class="player-layout">
        <figure class="now-art">
          <img id="nowArt" src="${escapeHtml(playlist[0]?.artwork || album.artworkPathFromRoot)}" alt="${escapeHtml(playlist[0]?.title || album.title)} artwork" />
          <figcaption id="nowTitle" class="now-title">${escapeHtml(playlist[0]?.title || album.title)}</figcaption>
        </figure>
        <section class="player-main" id="playerMain" data-current-title="${escapeHtml(playlist[0]?.title || album.title)}">
          <h1 id="playerTitle">${escapeHtml(playlist[0]?.title || album.title)}</h1>
          <p class="sub">${escapeHtml(album.title)}</p>
          <audio id="player" controls style="width:100%;"></audio>
          <div class="controls" aria-label="Album playback controls">
            <button class="transport-control-small" id="prevBtn" type="button" aria-label="Previous song">◀</button>
            <button class="transport-control" id="playBtn" type="button" aria-label="Play"><span class="transport-play-icon" aria-hidden="true"></span></button>
            <button class="transport-control-small" id="nextBtn" type="button" aria-label="Next song">▶</button>
          </div>
        </section>
      </section>
      <button class="next-up" id="nextUpBtn" type="button" aria-label="Play next song">
        <span class="next-up-label">Next Up</span>
        <span class="next-up-title" id="nextUpTitle">${escapeHtml(playlist[1]?.title || playlist[0]?.title || album.title)}</span>
      </button>
      <section class="mobile-party-ui" id="mobilePartyUi" aria-label="Mobile party player">
        <header class="mobile-party-top">
          <div>
            <p class="mobile-party-kicker" id="mobileTrackTitle">${escapeHtml(playlist[0]?.title || album.title)}</p>
            <p class="mobile-party-title">${escapeHtml(album.title)}</p>
          </div>
          <a class="mobile-exit-btn" href="./START-HERE.html" aria-label="Return to Start" title="Return to Start">←</a>
        </header>
        <div class="mobile-party-spacer" aria-hidden="true"></div>
        <footer class="mobile-party-bottom">
          <div class="mobile-time-row" aria-hidden="true">
            <span id="mobileElapsed">0:00</span>
            <span class="mobile-progress"><span class="mobile-progress-fill" id="mobileProgressFill"></span></span>
            <span id="mobileDuration">0:00</span>
          </div>
          <div class="mobile-control-row">
            <button class="mobile-control-small" id="mobilePrevBtn" type="button" aria-label="Previous song">◀</button>
            <button class="mobile-control" id="mobilePlayBtn" type="button" aria-label="Play or pause"><span class="mobile-play-icon" aria-hidden="true"></span></button>
            <button class="mobile-control-small" id="mobileNextBtn" type="button" aria-label="Next song">▶</button>
          </div>
          <div class="mobile-secondary-row">
            <button class="mobile-icon-btn" id="mobileVolumeBtn" type="button" aria-label="Mute or unmute">◉</button>
            <button class="mobile-chip" id="mobileTracklistBtn" type="button" aria-pressed="false">Party Mode Off</button>
          </div>
        </footer>
      </section>
    </main>
    <div class="autoplay-scrim" id="autoplayScrim" hidden></div>
    <div class="autoplay-cta" id="autoplayCta" hidden>
      <button id="autoplayMusicBtn" class="autoplay-cta-button" type="button" aria-label="Start music playback">
        <span class="autoplay-cta-button-icon" id="autoplayMusicIcon">▶</span>
        <span id="autoplayMusicLabel">Start Music</span>
      </button>
      <button id="autoplayPartyBtn" class="autoplay-cta-button" type="button" aria-label="Start music with party mode">
        <span class="autoplay-cta-button-icon">🪩</span>
        <span>Start in Party Mode</span>
      </button>
    </div>
    <aside class="mobile-tracklist" id="mobileTracklist" aria-label="Tracklist">
      <p class="mobile-tracklist-title">Tracklist</p>
      <div id="mobileTracklistItems"></div>
    </aside>
    <div class="party-div" aria-hidden="true"></div>
    <script src="./runtime-profile.js"></script>
    <script>
      const playlist = ${JSON.stringify(playlist)};
      const player = document.getElementById('player');
      const playerPanel = document.getElementById('playerPanel');
      const playerMain = document.getElementById('playerMain');
      const playerTitle = document.getElementById('playerTitle');
      const backdropArt = document.getElementById('backdropArt');
      const nowArt = document.getElementById('nowArt');
      const nowTitle = document.getElementById('nowTitle');
      const prevBtn = document.getElementById('prevBtn');
      const playBtn = document.getElementById('playBtn');
      const nextBtn = document.getElementById('nextBtn');
      const nextUpBtn = document.getElementById('nextUpBtn');
      const nextUpTitle = document.getElementById('nextUpTitle');
      const fullscreenBtn = document.getElementById('fullscreenBtn');
      const mobilePartyUi = document.getElementById('mobilePartyUi');
      const mobileTrackTitle = document.getElementById('mobileTrackTitle');
      const mobileElapsed = document.getElementById('mobileElapsed');
      const mobileDuration = document.getElementById('mobileDuration');
      const mobileProgressFill = document.getElementById('mobileProgressFill');
      const mobilePrevBtn = document.getElementById('mobilePrevBtn');
      const mobilePlayBtn = document.getElementById('mobilePlayBtn');
      const mobileNextBtn = document.getElementById('mobileNextBtn');
      const mobileVolumeBtn = document.getElementById('mobileVolumeBtn');
      const mobileTracklistBtn = document.getElementById('mobileTracklistBtn');
      const mobileTracklist = document.getElementById('mobileTracklist');
      const mobileTracklistItems = document.getElementById('mobileTracklistItems');
      const autoplayScrim = document.getElementById('autoplayScrim');
      const autoplayCta = document.getElementById('autoplayCta');
      const autoplayMusicBtn = document.getElementById('autoplayMusicBtn');
      const autoplayMusicIcon = document.getElementById('autoplayMusicIcon');
      const autoplayMusicLabel = document.getElementById('autoplayMusicLabel');
      const autoplayPartyBtn = document.getElementById('autoplayPartyBtn');
      const urlParams = new URLSearchParams(window.location.search);
      const requestedTrackNumber = urlParams.get('track');
      const requestedTrackIndex = /^\\d{2}$/.test(requestedTrackNumber || '') ? Number(requestedTrackNumber) - 1 : 0;
      const initialTrackIndex = requestedTrackIndex >= 0 && requestedTrackIndex < playlist.length ? requestedTrackIndex : 0;
      const shouldAutoplay = urlParams.get('autoplay') === '1';
      let index = initialTrackIndex;
      let mobileControlsTimer = 0;
      let lastTapTime = 0;
      let pointerStart = null;
      let longPressTimer = 0;
      let standardControlsTimer = 0;
      let wakeLock = null;
      let mobileProgressRaf = 0;
      let lastMobileElapsed = '';
      let lastMobileDuration = '';
      let lastMobileProgressWidth = '';
      let lastMobilePlayAriaLabel = '';
      let lastMobileVolumeLabel = '';
      let lastMobilePartyEnabled = null;

      async function getPlayableSrc(item) {
        return window.albumRuntime.audioProvider.getAudioUrl(item);
      }

      function renderList() {
        const nextIndex = (index + 1) % playlist.length;
        nextUpTitle.textContent = playlist[nextIndex].title;
        nextUpBtn.setAttribute('aria-label', 'Play next song: ' + playlist[nextIndex].title);
        mobileTracklistItems.innerHTML = playlist.map((item, i) => {
          const active = i === index ? ' is-active' : '';
          const number = String(i + 1).padStart(2, '0');
          return '<button class="mobile-track-option' + active + '" type="button" data-track-index="' + i + '"><span>' + number + '</span><span>' + item.title + '</span></button>';
        }).join('');
      }

      function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
          return '0:00';
        }
        const wholeSeconds = Math.floor(seconds);
        const minutes = Math.floor(wholeSeconds / 60);
        const remainder = String(wholeSeconds % 60).padStart(2, '0');
        return minutes + ':' + remainder;
      }

      function updateMobilePartyButton() {
        const enabled = Boolean(window.albumPartyMode && window.albumPartyMode.isEnabled());
        if (enabled === lastMobilePartyEnabled) {
          return;
        }

        lastMobilePartyEnabled = enabled;
        mobileTracklistBtn.textContent = enabled ? 'Party Mode On' : 'Party Mode Off';
        mobileTracklistBtn.classList.toggle('is-active', enabled);
        mobileTracklistBtn.setAttribute('aria-pressed', String(enabled));
      }

      function setAutoplayPromptVisible(isVisible) {
        if (!autoplayCta) {
          return;
        }
        if (autoplayScrim) {
          autoplayScrim.hidden = !isVisible;
        }
        autoplayCta.hidden = !isVisible;
        syncAutoplayPromptButtons();
      }

      function syncAutoplayPromptButtons() {
        if (!autoplayCta) {
          return;
        }
        const isVisible = !autoplayCta.hidden;
        const partyModeEnabled = Boolean(
          document.body.classList.contains('party-mode-active') ||
          (window.albumPartyMode && window.albumPartyMode.isEnabled())
        );
        if (autoplayMusicIcon) {
          autoplayMusicIcon.textContent = partyModeEnabled ? '🪩' : '▶';
        }
        if (autoplayMusicLabel) {
          autoplayMusicLabel.textContent = 'Start Music';
        }
        if (autoplayPartyBtn) {
          autoplayPartyBtn.hidden = Boolean(isVisible && partyModeEnabled);
        }
      }

      function updateMobileProgress() {
        const elapsed = formatTime(player.currentTime);
        const duration = formatTime(player.duration);
        const progress = player.duration > 0 ? Math.min(player.currentTime / player.duration, 1) : 0;
        const progressWidth = Math.round(progress * 1000) / 10 + '%';
        const playAriaLabel = player.paused ? 'Play' : 'Pause';
        const volumeLabel = player.muted || player.volume === 0 ? '○' : '◉';

        if (elapsed !== lastMobileElapsed) {
          mobileElapsed.textContent = elapsed;
          lastMobileElapsed = elapsed;
        }
        if (duration !== lastMobileDuration) {
          mobileDuration.textContent = duration;
          lastMobileDuration = duration;
        }
        if (progressWidth !== lastMobileProgressWidth) {
          mobileProgressFill.style.width = progressWidth;
          lastMobileProgressWidth = progressWidth;
        }
        playBtn.classList.toggle('is-playing', !player.paused);
        playBtn.setAttribute('aria-label', playAriaLabel);
        mobilePlayBtn.classList.toggle('is-playing', !player.paused);
        if (playAriaLabel !== lastMobilePlayAriaLabel) {
          mobilePlayBtn.setAttribute('aria-label', playAriaLabel);
          lastMobilePlayAriaLabel = playAriaLabel;
        }
        if (volumeLabel !== lastMobileVolumeLabel) {
          mobileVolumeBtn.textContent = volumeLabel;
          lastMobileVolumeLabel = volumeLabel;
        }

        updateMobilePartyButton();
      }

      function scheduleMobileProgressUpdate() {
        if (mobileProgressRaf) {
          return;
        }

        mobileProgressRaf = window.requestAnimationFrame(() => {
          mobileProgressRaf = 0;
          updateMobileProgress();
        });
      }

      async function requestWakeLock() {
        if (!isMobileProfile() || !('wakeLock' in navigator) || player.paused) {
          return;
        }
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => {
            wakeLock = null;
          });
        } catch (err) {
          wakeLock = null;
          console.warn('Screen wake lock was unavailable.', err);
        }
      }

      async function releaseWakeLock() {
        if (!wakeLock) {
          return;
        }
        try {
          await wakeLock.release();
        } catch (err) {
          console.warn('Screen wake lock could not be released.', err);
        } finally {
          wakeLock = null;
        }
      }

      async function loadTrack(newIndex) {
        index = (newIndex + playlist.length) % playlist.length;
        player.src = await getPlayableSrc(playlist[index]);
        nowArt.src = playlist[index].artwork;
        nowArt.alt = playlist[index].title + ' artwork';
        backdropArt.src = playlist[index].artwork;
        nowTitle.textContent = playlist[index].title;
        playerTitle.textContent = playlist[index].title;
        playerMain.dataset.currentTitle = playlist[index].title;
        mobileTrackTitle.textContent = playlist[index].title;
        renderList();
        updateMobileProgress();
      }

      async function requestFullscreen() {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            try { await document.exitFullscreen(); } catch (err) { console.error(err); }
          }
          return;
        }

        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          console.error(err);
        }
      }

      function setView(view, persist = true) {
        if (view === 'micro') {
          view = 'mini';
        }
        if (!['standard', 'mini', 'party'].includes(view)) {
          view = 'standard';
        }
        playerPanel.dataset.view = view;
        document.body.classList.remove('player-view-standard', 'player-view-mini', 'player-view-party');
        document.body.classList.add('player-view-' + view);
        if (persist && view !== 'party') {
          localStorage.setItem('albumPlayerView', view);
        }
        updateFullscreenState();
        syncDesktopPartyControls();
      }

      function updateFullscreenState() {
        document.body.classList.toggle('is-fullscreen', Boolean(document.fullscreenElement));
      }

      function isMobileProfile() {
        return window.albumRuntime.getProfile().name === 'mobile';
      }

      function showMobileControls() {
        if (!isMobileProfile()) {
          return;
        }
        updateMobilePartyButton();
        document.body.classList.remove('mobile-controls-idle');
        window.clearTimeout(mobileControlsTimer);
        mobileControlsTimer = window.setTimeout(() => {
          if (!document.body.classList.contains('mobile-tracklist-open')) {
            document.body.classList.add('mobile-controls-idle');
          }
        }, 3600);
      }

      function openMobileTracklist() {
        if (playerPanel.dataset.view !== 'party') {
          return;
        }
        document.body.classList.add('mobile-tracklist-open');
        showMobileControls();
      }

      function closeMobileTracklist() {
        document.body.classList.remove('mobile-tracklist-open');
        showMobileControls();
      }

      function enterMobilePartyView() {
        if (!isMobileProfile()) {
          return;
        }
        setView('party', false);
        showMobileControls();
      }

      function exitMobilePartyView() {
        document.body.classList.remove('mobile-controls-idle', 'mobile-tracklist-open');
        if (playerPanel.dataset.view === 'party') {
          setView(localStorage.getItem('albumPlayerView') || 'standard', false);
        }
      }

      function syncMobilePartyView() {
        if (!isMobileProfile()) {
          exitMobilePartyView();
          return;
        }
        updateMobilePartyButton();
        enterMobilePartyView();
      }

      function isDesktopStandardPartyMode() {
        return Boolean(
          !isMobileProfile() &&
          playerPanel.dataset.view === 'standard' &&
          window.albumPartyMode &&
          window.albumPartyMode.isEnabled()
        );
      }

      function syncDesktopPartyControls() {
        window.clearTimeout(standardControlsTimer);
        if (!isDesktopStandardPartyMode()) {
          document.body.classList.remove('standard-party-controls-hidden');
          return;
        }
        showStandardControlsTemporarily();
      }

      function showStandardControlsTemporarily() {
        window.clearTimeout(standardControlsTimer);
        if (!isDesktopStandardPartyMode()) {
          document.body.classList.remove('standard-party-controls-hidden');
          return;
        }
        document.body.classList.remove('standard-party-controls-hidden');
        standardControlsTimer = window.setTimeout(() => {
          if (isDesktopStandardPartyMode()) {
            document.body.classList.add('standard-party-controls-hidden');
          }
        }, 2400);
      }

      function handleStandardPartyActivity() {
        showStandardControlsTemporarily();
      }

      fullscreenBtn.addEventListener('click', async () => {
        await requestFullscreen();
      });

      document.addEventListener('fullscreenchange', () => {
        updateFullscreenState();
        if (!document.fullscreenElement && !isMobileProfile()) {
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
        syncMobilePartyView();
        syncDesktopPartyControls();
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

      mobileTracklistItems.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-track-index]');
        if (!button) {
          return;
        }
        await playTrack(Number(button.dataset.trackIndex));
        closeMobileTracklist();
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
          if (!isMobileProfile()) {
            setView('standard');
          }
        }
      });

      playBtn.addEventListener('click', async () => {
        await togglePlayback();
      });

      prevBtn.addEventListener('click', async () => {
        await previousTrack();
      });

      nextBtn.addEventListener('click', async () => {
        await nextTrack();
      });

      nextUpBtn.addEventListener('click', async () => {
        await nextTrack();
      });

      mobilePlayBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await togglePlayback();
        showMobileControls();
      });

      mobilePrevBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await previousTrack();
        showMobileControls();
      });

      mobileNextBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await nextTrack();
        showMobileControls();
      });

      mobileVolumeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        player.muted = !player.muted;
        updateMobileProgress();
        showMobileControls();
      });

      mobileTracklistBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (window.albumPartyMode) {
          window.albumPartyMode.toggle();
        }
          requestWakeLock();
      });

      document.addEventListener('pointermove', handleStandardPartyActivity);
      document.addEventListener('mousemove', handleStandardPartyActivity);
      document.addEventListener('pointerdown', handleStandardPartyActivity);

      playerPanel.addEventListener('pointerdown', (event) => {
        if (!isMobileProfile() || playerPanel.dataset.view !== 'party') {
          return;
        }
        if (event.target.closest('button, a, input, [data-track-index]')) {
          return;
        }
        pointerStart = {
          x: event.clientX,
          y: event.clientY,
          time: Date.now(),
          volume: player.volume
        };
        window.clearTimeout(longPressTimer);
        longPressTimer = window.setTimeout(() => {
          localStorage.setItem('partyModePerformance', localStorage.getItem('partyModePerformance') === 'low' ? 'medium' : 'low');
          showMobileControls();
        }, 700);
      });

      playerPanel.addEventListener('pointermove', (event) => {
        if (!pointerStart || !isMobileProfile() || playerPanel.dataset.view !== 'party') {
          return;
        }
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          window.clearTimeout(longPressTimer);
        }
        if (pointerStart.x > window.innerWidth * 0.72 && Math.abs(dy) > 12) {
          const nextVolume = Math.max(0, Math.min(1, pointerStart.volume - dy / 260));
          player.volume = nextVolume;
          player.muted = nextVolume === 0;
          updateMobileProgress();
          showMobileControls();
        }
      });

      playerPanel.addEventListener('pointerup', async (event) => {
        if (!pointerStart || !isMobileProfile() || playerPanel.dataset.view !== 'party') {
          pointerStart = null;
          return;
        }
        if (event.target.closest('button, a, input, [data-track-index]')) {
          pointerStart = null;
          return;
        }
        window.clearTimeout(longPressTimer);
        const dx = event.clientX - pointerStart.x;
        const dy = event.clientY - pointerStart.y;
        const distance = Math.hypot(dx, dy);
        const now = Date.now();

        if (dy < -70 && Math.abs(dx) < 90) {
          openMobileTracklist();
        } else if (dy > 80 && Math.abs(dx) < 90) {
          window.location.href = './START-HERE.html';
        } else if (distance < 14) {
          if (now - lastTapTime < 320) {
            if (event.clientX < window.innerWidth * 0.45) {
              await previousTrack();
            } else {
              await nextTrack();
            }
            lastTapTime = 0;
          } else {
            lastTapTime = now;
            if (document.body.classList.contains('mobile-controls-idle')) {
              showMobileControls();
            } else {
              document.body.classList.add('mobile-controls-idle');
            }
          }
        }

        pointerStart = null;
      });

      window.addEventListener('album-party-mode-change', () => {
        syncMobilePartyView();
        syncDesktopPartyControls();
        syncAutoplayPromptButtons();
      });
      window.addEventListener('load', syncAutoplayPromptButtons);
      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          await requestWakeLock();
        }
      });

      player.addEventListener('ended', async () => {
        await loadTrack(index + 1);
        try { await player.play(); } catch (err) { console.error(err); }
      });
      player.addEventListener('timeupdate', scheduleMobileProgressUpdate);
      player.addEventListener('durationchange', scheduleMobileProgressUpdate);
      player.addEventListener('play', () => {
        setAutoplayPromptVisible(false);
        scheduleMobileProgressUpdate();
        showMobileControls();
        requestWakeLock();
      });
      player.addEventListener('pause', () => {
        scheduleMobileProgressUpdate();
        showMobileControls();
        releaseWakeLock();
      });

      loadTrack(initialTrackIndex)
        .then(async () => {
          if (shouldAutoplay) {
            setAutoplayPromptVisible(true);
          }
          if (shouldAutoplay) {
            try {
              await player.play();
              setAutoplayPromptVisible(false);
            } catch (err) {
              console.error(err);
              setAutoplayPromptVisible(true);
            }
          }
        })
        .catch((err) => console.error(err));

      if (autoplayMusicBtn) {
        autoplayMusicBtn.addEventListener('click', async () => {
          try {
            await player.play();
            setAutoplayPromptVisible(false);
          } catch (err) {
            console.error(err);
            setAutoplayPromptVisible(true);
          }
        });
      }

      if (autoplayPartyBtn) {
        autoplayPartyBtn.addEventListener('click', async () => {
          try {
            await player.play();
            setAutoplayPromptVisible(false);
            if (window.albumPartyMode) {
              window.albumPartyMode.setEnabled(true);
            }
          } catch (err) {
            console.error(err);
            setAutoplayPromptVisible(true);
          }
        });
      }
      setView(localStorage.getItem('albumPlayerView') || 'standard');
      applyRuntimeProfile();
      window.addEventListener('album-runtime-profile-change', applyRuntimeProfile);
    </script>
    <script src="./butterchurn.min.js"></script>
    <script src="./butterchurnPresetsMinimal.min.js"></script>
    <script>
      (function () {
        var butterchurnLib = window.butterchurn && window.butterchurn.default
          ? window.butterchurn.default
          : window.butterchurn;
        if (butterchurnLib && butterchurnLib.createVisualizer) {
          window.butterchurn = butterchurnLib;
        }

        var presetLib = window.butterchurnPresets
          || window.butterchurnPresetsMinimal
          || (window.butterchurnPresets && window.butterchurnPresets.default)
          || (window.butterchurnPresetsMinimal && window.butterchurnPresetsMinimal.default)
          || null;
        if (presetLib && presetLib.getPresets) {
          window.butterchurnPresets = presetLib;
          window.butterchurnPresetsMinimal = presetLib;
        }
      })();
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
    <script src="../../runtime-profile.js"></script>
    <script>
      const player = document.getElementById('player');
      const playSong = document.getElementById('playSong');
      const secondaryAction = document.getElementById('secondaryAction');
      const shouldAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1';

      player.preload = window.albumRuntime.getProfile().player.preload;

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
    <script src="../../butterchurn.min.js"></script>
    <script src="../../butterchurnPresetsMinimal.min.js"></script>
    <script>
      (function () {
        var butterchurnLib = window.butterchurn && window.butterchurn.default
          ? window.butterchurn.default
          : window.butterchurn;
        if (butterchurnLib && butterchurnLib.createVisualizer) {
          window.butterchurn = butterchurnLib;
        }

        var presetLib = window.butterchurnPresets
          || window.butterchurnPresetsMinimal
          || (window.butterchurnPresets && window.butterchurnPresets.default)
          || (window.butterchurnPresetsMinimal && window.butterchurnPresetsMinimal.default)
          || null;
        if (presetLib && presetLib.getPresets) {
          window.butterchurnPresets = presetLib;
          window.butterchurnPresetsMinimal = presetLib;
        }
      })();
    </script>
    <script src="../../party-mode.js"></script>
  </body>
</html>
`;
}
