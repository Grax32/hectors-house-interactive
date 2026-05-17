import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

interface ThemeVariables {
  bg: string;
  ink: string;
  hero: string;
  muted: string;
  accent: string;
  surface: string;
  line: string;
}

interface AlbumContents {
  files?: string[];
  directories?: string[];
  copy?: CopyRule[];
}

interface CopyRule {
  from: string;
  to: string;
}

const ALBUM_CONTENTS_FILE = path.join(process.cwd(), 'album-contents.json');
const DIST_DIR = path.join(process.cwd(), 'dist');
const CONTENT_FILES_DIR = path.join(process.cwd(), 'content-files');
const SOURCE_ALBUMS_DIR = path.join(CONTENT_FILES_DIR, 'music', 'albums');

interface SongMetadata {
  title: string;
  duration?: string;
  releaseDate?: string;
  artwork?: string;
  audioFile?: string;
  description?: string;
}

interface AlbumPalette {
  bg?: string;
  ink?: string;
  hero?: string;
  muted?: string;
  accent?: string;
  surface?: string;
  line?: string;
}

interface AlbumMetadata {
  title: string;
  year?: string;
  releaseDate?: string;
  description?: string;
  artwork?: string;
  tracks?: string[];
  palette?: AlbumPalette;
}

interface ResolvedTrack {
  trackFolder: string;
  title: string;
  releaseDate: string;
  artworkFileName: string;
  artworkSourcePath: string;
  songJsonSourcePath: string;
  wavSourcePath: string;
  wavOutputFileName: string;
  mp3OutputFileName: string;
  audioPathFromRoot: string;
  contentPathFromRoot: string;
}

interface ResolvedAlbum {
  albumFolder: string;
  title: string;
  releaseDate: string;
  description: string;
  artworkPathFromRoot: string;
  albumArtworkSourcePath: string;
  albumArtworkFileName: string;
  tracks: ResolvedTrack[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isAudioFile(fileName: string): boolean {
  return /\.(mp3|wav|m4a|ogg|flac)$/i.test(fileName);
}

function isImageFile(fileName: string): boolean {
  return /\.(png|jpg|jpeg|webp)$/i.test(fileName);
}

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function getFirstFileByPredicate(dirPath: string, predicate: (name: string) => boolean): string | null {
  if (!fs.existsSync(dirPath)) {
    return null;
  }

  const names = fs.readdirSync(dirPath).sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const full = path.join(dirPath, name);
    if (!fs.statSync(full).isFile()) {
      continue;
    }
    if (predicate(name)) {
      return name;
    }
  }

  return null;
}

function listSubdirectories(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function toTitle(slug: string): string {
  return slug
    .replace(/^\d+-/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function replaceExtension(fileName: string, nextExtension: string): string {
  return `${path.basename(fileName, path.extname(fileName))}${nextExtension}`;
}

function ensureUniqueFileName(fileName: string, seen: Set<string>): string {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let candidate = fileName;
  let counter = 2;

  while (seen.has(candidate.toLowerCase())) {
    candidate = `${base}-${counter}${ext}`;
    counter += 1;
  }

  seen.add(candidate.toLowerCase());
  return candidate;
}

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return cleaned || 'album';
}

function logWarnYellow(message: string): void {
  console.warn(`\x1b[33m[WARN] ${message}\x1b[0m`);
}

function buildNumberedFileName(trackNumber: number, title: string, extension: '.wav' | '.mp3'): string {
  const prefix = String(trackNumber).padStart(2, '0');
  const safeTitle = sanitizeFileName(title) || `Track ${prefix}`;
  return `${prefix} - ${safeTitle}${extension}`;
}

function formatDisplayDate(input: string, month: 'short' | 'long' = 'short'): string {
  const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const monthIndex = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const utcDate = new Date(Date.UTC(year, monthIndex, day));

    return new Intl.DateTimeFormat('en-US', {
      month,
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(utcDate);
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      month,
      day: 'numeric',
      year: 'numeric'
    }).format(parsed);
  }

  return input;
}

const DEFAULT_THEME: ThemeVariables = {
  bg: '#111319',
  ink: '#e8f2ff',
  hero: '#e8f2ff',
  muted: '#99a3b3',
  accent: '#32d5c8',
  surface: 'rgba(255, 255, 255, 0.06)',
  line: 'rgba(84, 213, 197, 0.34)'
};

function themeFromAlbumMeta(albumMeta: AlbumMetadata | null): ThemeVariables {
  const p = albumMeta?.palette;
  if (!p) {
    console.log('[INFO] No palette in album.json, using default theme');
    return DEFAULT_THEME;
  }

  return {
    bg: p.bg ?? DEFAULT_THEME.bg,
    ink: p.ink ?? DEFAULT_THEME.ink,
    hero: p.hero ?? DEFAULT_THEME.hero,
    muted: p.muted ?? DEFAULT_THEME.muted,
    accent: p.accent ?? DEFAULT_THEME.accent,
    surface: p.surface ?? DEFAULT_THEME.surface,
    line: p.line ?? DEFAULT_THEME.line
  };
}

function getFfmpegBinaryPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require('ffmpeg-static') as string | null;
    return imported || null;
  } catch {
    return null;
  }
}

function prepareContentAndMusic(album: ResolvedAlbum): void {
  const ffmpegPath = getFfmpegBinaryPath();
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static is required to generate MP3 files');
  }

  const contentRoot = path.join(DIST_DIR, 'content');
  const musicRoot = path.join(DIST_DIR, 'music');
  const musicWavRoot = path.join(musicRoot, 'wav');
  fs.mkdirSync(contentRoot, { recursive: true });
  fs.mkdirSync(musicRoot, { recursive: true });
  fs.mkdirSync(musicWavRoot, { recursive: true });

  if (album.albumArtworkSourcePath && fs.existsSync(album.albumArtworkSourcePath) && album.albumArtworkFileName) {
    fs.copyFileSync(album.albumArtworkSourcePath, path.join(contentRoot, album.albumArtworkFileName));
  }

  const playlistLines: string[] = ['#EXTM3U'];

  for (const track of album.tracks) {
    const trackContentDir = path.join(contentRoot, track.trackFolder);
    fs.mkdirSync(trackContentDir, { recursive: true });

    fs.copyFileSync(track.songJsonSourcePath, path.join(trackContentDir, 'song.json'));
    if (track.artworkSourcePath && fs.existsSync(track.artworkSourcePath)) {
      fs.copyFileSync(track.artworkSourcePath, path.join(trackContentDir, track.artworkFileName));
    }

    const wavOutputPath = path.join(musicWavRoot, track.wavOutputFileName);
    fs.copyFileSync(track.wavSourcePath, wavOutputPath);

    const mp3OutputPath = path.join(musicRoot, track.mp3OutputFileName);
    const args = ['-y', '-i', track.wavSourcePath];

    if (track.artworkSourcePath && fs.existsSync(track.artworkSourcePath)) {
      args.push(
        '-i', track.artworkSourcePath,
        '-map', '0:a:0',
        '-map', '1:v:0',
        '-c:v', 'mjpeg',
        '-disposition:v:0', 'attached_pic',
        '-metadata:s:v', 'title=Album cover',
        '-metadata:s:v', 'comment=Cover (front)'
      );
    }

    args.push('-c:a', 'libmp3lame', '-b:a', '192k', '-id3v2_version', '3', mp3OutputPath);
    execFileSync(ffmpegPath, args, { stdio: 'pipe' });

    playlistLines.push(`#EXTINF:-1,${track.title}`);
    playlistLines.push(track.mp3OutputFileName);
    console.log(`[OK] Packaged track: ${track.trackFolder}`);
  }

  const playlistName = `__${sanitizeFileName(album.title)}.m3u8`;
  fs.writeFileSync(path.join(musicRoot, playlistName), `${playlistLines.join('\n')}\n`, 'utf-8');
  console.log(`[OK] Wrote playlist: music/${playlistName}`);
}


function resetDistDirectory(): void {
  const purgeTargets = [
    'album',
    'content',
    'music',
    'artist',
    'singles',
    'index.html',
    'START-HERE.html',
    'play-album.html'
  ];

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`[OK] Created dist directory at ${DIST_DIR}`);
    return;
  }

  try {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    fs.mkdirSync(DIST_DIR, { recursive: true });
    console.log(`[OK] Cleared dist directory at ${DIST_DIR}`);
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[WARN] Full dist reset failed (${message}). Trying targeted cleanup.`);
  }

  for (const target of purgeTargets) {
    const targetPath = path.join(DIST_DIR, target);
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[WARN] Could not remove ${target}: ${message}`);
    }
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log(`[OK] Dist cleanup complete at ${DIST_DIR}`);
}

function copyDirectory(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyContent(albumContents: AlbumContents): void {
  const copyRules = albumContents.copy || [];

  for (const rule of copyRules) {
    const { from, to } = rule;

    if (!from || !to) {
      console.warn('[WARN] Copy rule missing "from" or "to" field, skipping');
      continue;
    }

    const sourcePath = path.join(process.cwd(), from);
    const destPath = path.join(DIST_DIR, to);

    if (!fs.existsSync(sourcePath)) {
      console.warn(`[WARN] Source path not found: ${from}`);
      continue;
    }

    const destDir = path.dirname(destPath);
    fs.mkdirSync(destDir, { recursive: true });

    const stat = fs.statSync(sourcePath);
    if (stat.isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`[OK] Copied file: ${from} -> ${to}`);
    } else if (stat.isDirectory()) {
      copyDirectory(sourcePath, destPath);
      console.log(`[OK] Copied directory: ${from} -> ${to}`);
    }
  }
}

function scaffoldAlbumFromLooseMedia(): void {
  const albumRoot = path.join(DIST_DIR, 'album');
  const existingAlbums = listSubdirectories(albumRoot);
  if (existingAlbums.length > 0) {
    return;
  }

  if (!fs.existsSync(CONTENT_FILES_DIR)) {
    return;
  }

  const sourceFiles = fs
    .readdirSync(CONTENT_FILES_DIR)
    .filter((name) => fs.statSync(path.join(CONTENT_FILES_DIR, name)).isFile())
    .sort((a, b) => a.localeCompare(b));

  const audioFiles = sourceFiles.filter(isAudioFile);
  if (audioFiles.length === 0) {
    return;
  }

  const imageFiles = sourceFiles.filter(isImageFile);
  const albumArtCandidate = imageFiles.find((name) => /hectors?-house/i.test(name)) || imageFiles[0] || '';

  const albumFolderName = 'hectors-house';
  const albumFolderPath = path.join(albumRoot, albumFolderName);
  const tracksRoot = path.join(albumFolderPath, 'tracks');
  fs.mkdirSync(tracksRoot, { recursive: true });

  let albumArtworkFile = '';
  if (albumArtCandidate) {
    const ext = path.extname(albumArtCandidate).toLowerCase();
    albumArtworkFile = `artwork${ext}`;
    fs.copyFileSync(
      path.join(CONTENT_FILES_DIR, albumArtCandidate),
      path.join(albumFolderPath, albumArtworkFile)
    );
  }

  const trackFolders: string[] = [];
  for (let i = 0; i < audioFiles.length; i += 1) {
    const audioName = audioFiles[i];
    const title = path.basename(audioName, path.extname(audioName));
    const index = String(i + 1).padStart(2, '0');
    const trackSlug = slugify(title || `track-${index}`);
    const trackFolder = `${index}-${trackSlug}`;
    trackFolders.push(trackFolder);

    const trackPath = path.join(tracksRoot, trackFolder);
    fs.mkdirSync(trackPath, { recursive: true });

    const audioFileName = audioName;
    fs.copyFileSync(
      path.join(CONTENT_FILES_DIR, audioName),
      path.join(trackPath, audioFileName)
    );

    let trackArtworkFile = '';
    const trackArtGuess = imageFiles.find((name) => {
      const normalizedImage = slugify(path.basename(name, path.extname(name)));
      return normalizedImage.includes(trackSlug) || trackSlug.includes(normalizedImage);
    });

    const pickedArt = trackArtGuess || imageFiles[i % Math.max(imageFiles.length, 1)];
    if (pickedArt) {
      const artExt = path.extname(pickedArt).toLowerCase();
      trackArtworkFile = `artwork${artExt}`;
      fs.copyFileSync(
        path.join(CONTENT_FILES_DIR, pickedArt),
        path.join(trackPath, trackArtworkFile)
      );
    }

    const songMetadata: SongMetadata = {
      title: toTitle(trackFolder),
      releaseDate: new Date().toISOString().slice(0, 10),
      artwork: trackArtworkFile || undefined,
      audioFile: audioFileName,
      description: 'Single album track'
    };
    fs.writeFileSync(path.join(trackPath, 'song.json'), JSON.stringify(songMetadata, null, 2), 'utf-8');
  }

  const albumMetadata: AlbumMetadata = {
    title: "Hector's House",
    releaseDate: new Date().toISOString().slice(0, 10),
    year: String(new Date().getFullYear()),
    description: 'A single album listening experience',
    artwork: albumArtworkFile || undefined,
    tracks: trackFolders
  };

  fs.writeFileSync(path.join(albumFolderPath, 'album.json'), JSON.stringify(albumMetadata, null, 2), 'utf-8');
  console.log('[OK] Scaffolded album/hectors-house from loose media files.');
}

function resolvePrimaryAlbum(): ResolvedAlbum | null {
  const albumRoot = SOURCE_ALBUMS_DIR;
  const albumFolders = listSubdirectories(albumRoot);
  if (albumFolders.length === 0) {
    return null;
  }

  const albumFolder = albumFolders[0];
  const albumPath = path.join(albumRoot, albumFolder);
  const albumMeta = readJsonIfExists<AlbumMetadata>(path.join(albumPath, 'album.json'));

  const albumArtworkFile = albumMeta?.artwork || getFirstFileByPredicate(albumPath, isImageFile) || '';
  const albumArtworkSourcePath = albumArtworkFile ? path.join(albumPath, albumArtworkFile) : '';
  if (!albumArtworkSourcePath) {
    logWarnYellow(`Album artwork missing for ${albumFolder}. Landing page will fall back to first track artwork if available.`);
  }
  const albumArtworkExt = albumArtworkFile ? path.extname(albumArtworkFile).toLowerCase() : '.png';
  const albumArtworkFileName = `album-artwork${albumArtworkExt}`;
  let albumArtworkPathFromRoot = albumArtworkSourcePath ? `./content/${albumArtworkFileName}` : '';

  const tracksRoot = path.join(albumPath, 'tracks');
  const trackFolders = albumMeta?.tracks && albumMeta.tracks.length > 0
    ? albumMeta.tracks
    : listSubdirectories(tracksRoot);

  const releaseDate = albumMeta?.releaseDate || new Date().toISOString().slice(0, 10);
  const seenWavNames = new Set<string>();
  const seenMp3Names = new Set<string>();

  const tracks: ResolvedTrack[] = trackFolders
    .map((trackFolder, index) => {
      const trackPath = path.join(tracksRoot, trackFolder);
      if (!fs.existsSync(trackPath) || !fs.statSync(trackPath).isDirectory()) {
        return null;
      }

      const songMeta = readJsonIfExists<SongMetadata>(path.join(trackPath, 'song.json'));
      const title = songMeta?.title || toTitle(trackFolder) || `Track ${index + 1}`;
      const trackRelease = songMeta?.releaseDate || releaseDate;
      const artworkFile = songMeta?.artwork || getFirstFileByPredicate(trackPath, isImageFile) || '';
      const wavFile = songMeta?.audioFile && /\.wav$/i.test(songMeta.audioFile)
        ? songMeta.audioFile
        : getFirstFileByPredicate(trackPath, (name) => /\.wav$/i.test(name)) || '';

      if (!wavFile) {
        return null;
      }

      const artworkSourcePath = artworkFile && fs.existsSync(path.join(trackPath, artworkFile))
        ? path.join(trackPath, artworkFile)
        : albumArtworkSourcePath;
      const artworkFileName = artworkFile || path.basename(albumArtworkSourcePath || 'artwork.png');
      const trackNumber = index + 1;
      const wavOutputFileName = ensureUniqueFileName(buildNumberedFileName(trackNumber, title, '.wav'), seenWavNames);
      const mp3OutputFileName = ensureUniqueFileName(buildNumberedFileName(trackNumber, title, '.mp3'), seenMp3Names);

      return {
        trackFolder,
        title,
        releaseDate: trackRelease,
        artworkFileName,
        artworkSourcePath,
        songJsonSourcePath: path.join(trackPath, 'song.json'),
        wavSourcePath: path.join(trackPath, wavFile),
        wavOutputFileName,
        mp3OutputFileName,
        audioPathFromRoot: `./music/${mp3OutputFileName}`,
        contentPathFromRoot: `./content/${trackFolder}/index.html`
      };
    })
    .filter((track): track is ResolvedTrack => track !== null);

  if (tracks.length === 0) {
    return null;
  }

  if (!albumArtworkPathFromRoot) {
    albumArtworkPathFromRoot = `${tracks[0].contentPathFromRoot}${tracks[0].artworkFileName}`;
  }

  return {
    albumFolder,
    title: albumMeta?.title || toTitle(albumFolder),
    releaseDate,
    description: albumMeta?.description || 'A guided single album experience',
    artworkPathFromRoot: albumArtworkPathFromRoot,
    albumArtworkSourcePath,
    albumArtworkFileName,
    tracks
  };
}

function buildAlbumLandingHtml(album: ResolvedAlbum, theme: ThemeVariables): string {
  const songRows = album.tracks
    .map((track, index) => {
      const releaseText = formatDisplayDate(track.releaseDate, 'short');

      return `
        <a class="song-row" href="${track.contentPathFromRoot}">
          <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
          <span class="song-title">${escapeHtml(track.title)}</span>
          <span class="song-date">${escapeHtml(releaseText)}</span>
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
      :root {
        --bg: ${theme.bg};
        --ink: ${theme.ink};
        --hero: ${theme.hero};
        --muted: ${theme.muted};
        --accent: ${theme.accent};
        --surface: ${theme.surface};
        --line: ${theme.line};
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--ink);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at 85% 20%, rgba(50, 213, 200, 0.2), transparent 46%),
          radial-gradient(circle at 15% 10%, rgba(89, 102, 255, 0.2), transparent 35%),
          var(--bg);
      }
      .wrap { max-width: 1080px; margin: 0 auto; padding: 28px 18px 56px; }
      .hero {
        display: grid;
        grid-template-columns: minmax(260px, 410px) 1fr;
        gap: 26px;
        align-items: center;
        margin-bottom: 28px;
      }
      .cover {
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid var(--line);
        box-shadow: 0 25px 45px rgba(0, 0, 0, 0.45);
      }
      .cover img { width: 100%; display: block; aspect-ratio: 1/1; object-fit: cover; }
      .meta h1 {
        margin: 0 0 10px;
        font-size: clamp(2.2rem, 5vw, 3.6rem);
        line-height: 1.03;
        color: var(--hero);
      }
      .meta p { margin: 0 0 16px; color: var(--muted); }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; }
      .btn {
        display: inline-block;
        padding: 11px 16px;
        border-radius: 999px;
        text-decoration: none;
        color: var(--bg);
        background: var(--accent);
        font-weight: 700;
      }
      .btn.secondary {
        color: var(--ink);
        background: transparent;
        border: 1px solid var(--line);
      }
      .songs {
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--surface);
        overflow: hidden;
      }
      .songs h2 { margin: 0; padding: 14px 16px; font-size: 1.05rem; border-bottom: 1px solid var(--line); }
      .song-row {
        display: grid;
        grid-template-columns: 54px 1fr auto;
        gap: 14px;
        padding: 12px 16px;
        text-decoration: none;
        color: var(--ink);
        border-bottom: 1px solid var(--line);
      }
      .song-row:hover { background: var(--surface); }
      .song-row:last-child { border-bottom: 0; }
      .song-index {
        font-size: 0.86rem;
        color: var(--accent);
        border: 1px solid var(--line);
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 24px;
      }
      .song-title { font-weight: 700; }
      .song-date { color: var(--muted); font-size: 0.9rem; }
      @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; }
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
            <a class="btn" href="./play-album.html">Play Album</a>
            <a class="btn secondary" href="./content/">Open Content Folder</a>
          </div>
        </section>
      </section>
      <section class="songs">
        <h2>Songs</h2>
        ${songRows}
      </section>
    </main>
  </body>
</html>
`;
}

function buildPlayAlbumHtml(album: ResolvedAlbum, theme: ThemeVariables): string {
  const playlist = album.tracks.map((track) => ({
    title: track.title,
    src: track.audioPathFromRoot,
    page: track.contentPathFromRoot
  }));

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Play Album - ${escapeHtml(album.title)}</title>
    <style>
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
        background: var(--bg);
        color: var(--ink);
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      }
      .panel {
        width: min(760px, 94vw);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 22px;
        background: var(--surface);
      }
      h1 { margin-top: 0; color: var(--hero); }
      .sub { color: var(--muted); margin-bottom: 14px; }
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
    </style>
  </head>
  <body>
    <main class="panel">
      <h1>Play Album</h1>
      <p class="sub">${escapeHtml(album.title)} - plays songs in order.</p>
      <audio id="player" controls style="width:100%;"></audio>
      <div class="controls">
        <button class="primary" id="playBtn">Play Album</button>
        <button id="nextBtn">Next Song</button>
        <a href="./START-HERE.html">Back to Album</a>
      </div>
      <ol id="list"></ol>
    </main>
    <script>
      const playlist = ${JSON.stringify(playlist)};
      const player = document.getElementById('player');
      const list = document.getElementById('list');
      const playBtn = document.getElementById('playBtn');
      const nextBtn = document.getElementById('nextBtn');
      let index = 0;

      function renderList() {
        list.innerHTML = playlist.map((item, i) => {
          const cls = i === index ? 'class="now"' : '';
          return '<li ' + cls + '><a href="' + item.page + '">' + item.title + '</a></li>';
        }).join('');
      }

      function loadTrack(newIndex) {
        index = (newIndex + playlist.length) % playlist.length;
        player.src = playlist[index].src;
        renderList();
      }

      playBtn.addEventListener('click', async () => {
        if (!player.src) {
          loadTrack(index);
        }
        try { await player.play(); } catch (err) { console.error(err); }
      });

      nextBtn.addEventListener('click', async () => {
        loadTrack(index + 1);
        try { await player.play(); } catch (err) { console.error(err); }
      });

      player.addEventListener('ended', async () => {
        loadTrack(index + 1);
        try { await player.play(); } catch (err) { console.error(err); }
      });

      loadTrack(0);
    </script>
  </body>
</html>
`;
}

function buildSongPageHtml(album: ResolvedAlbum, track: ResolvedTrack, currentIndex: number, theme: ThemeVariables): string {
  const nextTrack = album.tracks[(currentIndex + 1) % album.tracks.length];
  const isLastTrack = currentIndex === album.tracks.length - 1;
  const secondaryActionHref = isLastTrack
    ? '../../START-HERE.html'
    : `../${nextTrack.trackFolder}/index.html`;
  const secondaryActionLabel = isLastTrack ? 'Album' : 'Next Song';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(track.title)} - ${escapeHtml(album.title)}</title>
    <style>
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
        font-family: "Trebuchet MS", "Segoe UI", sans-serif;
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
      h1 { margin: 0 0 8px; color: var(--hero); }
      p { color: var(--muted); margin: 0 0 14px; }
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
              <a href="${escapeHtml(secondaryActionHref)}">${escapeHtml(secondaryActionLabel)}</a>
            </div>
            <audio id="player" controls src="../../${escapeHtml(track.audioPathFromRoot.replace(/^\.\//, ''))}"></audio>
          </section>
        </section>
      </section>
    </main>
    <script>
      const player = document.getElementById('player');
      const playSong = document.getElementById('playSong');
      playSong.addEventListener('click', async () => {
        try { await player.play(); } catch (err) { console.error(err); }
      });
    </script>
  </body>
</html>
`;
}

function writeGuidedEntryPoint(theme: ThemeVariables): void {
  const album = resolvePrimaryAlbum();
  if (!album) {
    const fallback = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Album</title></head><body><h1>No album found</h1><p>Add media under content-files/music/albums or place audio files in content-files and run build again.</p></body></html>`;
    fs.writeFileSync(path.join(DIST_DIR, 'START-HERE.html'), fallback, 'utf-8');
    return;
  }

  prepareContentAndMusic(album);

  const landing = buildAlbumLandingHtml(album, theme);
  fs.writeFileSync(path.join(DIST_DIR, 'START-HERE.html'), landing, 'utf-8');
  console.log('[OK] Wrote guided entry file: START-HERE.html');

  const playAlbum = buildPlayAlbumHtml(album, theme);
  fs.writeFileSync(path.join(DIST_DIR, 'play-album.html'), playAlbum, 'utf-8');
  console.log('[OK] Wrote play-album page: play-album.html');

  for (let i = 0; i < album.tracks.length; i += 1) {
    const track = album.tracks[i];
    const contentDir = path.join(DIST_DIR, 'content', track.trackFolder);
    fs.mkdirSync(contentDir, { recursive: true });
    const html = buildSongPageHtml(album, track, i, theme);
    fs.writeFileSync(path.join(contentDir, 'index.html'), html, 'utf-8');
  }
  console.log('[OK] Wrote song pages in content/<track>/index.html.');
}


/**
 * Read and parse album-contents.json
 */
function readAlbumContents(): AlbumContents {
  if (!fs.existsSync(ALBUM_CONTENTS_FILE)) {
    throw new Error(
      `album-contents.json not found at ${ALBUM_CONTENTS_FILE}`
    );
  }

  const content = fs.readFileSync(ALBUM_CONTENTS_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Validate that all required files from album-contents.json exist in dist
 */
function validateDistContents(albumContents: AlbumContents): void {
  const requiredFiles = albumContents.files || [];
  const requiredDirs = albumContents.directories || [];
  const missingItems: string[] = [];

  // Check required files
  for (const file of requiredFiles) {
    const filePath = path.join(DIST_DIR, file);
    if (!fs.existsSync(filePath)) {
      missingItems.push(`File: ${file}`);
    } else {
      console.log(`[OK] Found file: ${file}`);
    }
  }

  // Check required directories
  for (const dir of requiredDirs) {
    const dirPath = path.join(DIST_DIR, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      missingItems.push(`Directory: ${dir}`);
    } else {
      console.log(`[OK] Found directory: ${dir}`);
    }
  }

  if (missingItems.length > 0) {
    console.error('\n[ERROR] Missing required content:');
    missingItems.forEach((item) => console.error(`  - ${item}`));
    process.exit(1);
  }

  console.log('\n[OK] All required content validated successfully!');
}


/**
 * Main build function
 */
async function buildAlbum(): Promise<void> {
  try {
    console.log('[INFO] Starting album build process...\n');

    // Step 1: Read album contents config
    console.log('[INFO] Reading album-contents.json...');
    const albumContents = readAlbumContents();
    console.log('[OK] Album contents loaded\n');

    // Step 2: Reset dist directory for a clean build
    console.log('[INFO] Resetting dist directory...');
    resetDistDirectory();
    console.log('');

    // Step 3: Copy content if specified
    if (albumContents.copy && albumContents.copy.length > 0) {
      console.log('[INFO] Copying content to dist...');
      copyContent(albumContents);
      console.log('');
    }

    // Step 4: Ensure source albums are available
    console.log('[INFO] Using source albums from content-files/music/albums...');
    if (listSubdirectories(SOURCE_ALBUMS_DIR).length === 0) {
      throw new Error('No source albums found under content-files/music/albums');
    }
    console.log('');

    // Step 5: Read theme from source album.json palette
    console.log('[INFO] Reading theme palette from album.json...');
    const albumFolder = listSubdirectories(SOURCE_ALBUMS_DIR)[0];
    const albumMetaPath = path.join(SOURCE_ALBUMS_DIR, albumFolder, 'album.json');
    const albumMeta = readJsonIfExists<AlbumMetadata>(albumMetaPath);
    const theme = themeFromAlbumMeta(albumMeta);
    console.log('[OK] Theme loaded\n');

    // Step 6: Create packaged content, media, and guided pages
    console.log('[INFO] Writing guided root and song pages...');
    writeGuidedEntryPoint(theme);
    console.log('');

    // Step 7: Validate dist contents
    console.log('[INFO] Validating dist contents...');
    validateDistContents(albumContents);
    console.log('');

    console.log('[OK] Build completed successfully!');
  } catch (error) {
    console.error('[ERROR] Build failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the build
buildAlbum();
