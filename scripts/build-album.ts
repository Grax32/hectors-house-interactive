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
  bg0: string;
  bg1: string;
  bg2: string;
  gold: string;
  goldSoft: string;
  violet: string;
  violetSoft: string;
  cyan: string;
  text: string;
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
  bg0?: string;
  bg1?: string;
  bg2?: string;
  gold?: string;
  goldSoft?: string;
  violet?: string;
  violetSoft?: string;
  cyan?: string;
  text?: string;
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
  audioDataPathFromRoot: string;
  audioDataKey: string;
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
  bg: '#03030a',
  ink: '#f8f1ff',
  hero: '#e4a84a',
  muted: '#bfa6ff',
  accent: '#8b32ff',
  surface: 'rgba(255, 255, 255, 0.03)',
  line: 'rgba(164, 83, 255, 0.35)',
  bg0: '#03030a',
  bg1: '#09051a',
  bg2: '#071f22',
  gold: '#e4a84a',
  goldSoft: '#ffd98a',
  violet: '#8b32ff',
  violetSoft: '#c45cff',
  cyan: '#37f0e7',
  text: '#f8f1ff'
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
    line: p.line ?? DEFAULT_THEME.line,
    bg0: p.bg0 ?? p.bg ?? DEFAULT_THEME.bg0,
    bg1: p.bg1 ?? DEFAULT_THEME.bg1,
    bg2: p.bg2 ?? DEFAULT_THEME.bg2,
    gold: p.gold ?? p.hero ?? DEFAULT_THEME.gold,
    goldSoft: p.goldSoft ?? DEFAULT_THEME.goldSoft,
    violet: p.violet ?? p.accent ?? DEFAULT_THEME.violet,
    violetSoft: p.violetSoft ?? p.muted ?? DEFAULT_THEME.violetSoft,
    cyan: p.cyan ?? DEFAULT_THEME.cyan,
    text: p.text ?? p.ink ?? DEFAULT_THEME.text
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
  const musicAudioDataRoot = path.join(musicRoot, 'audio-data');
  fs.mkdirSync(contentRoot, { recursive: true });
  fs.mkdirSync(musicRoot, { recursive: true });
  fs.mkdirSync(musicWavRoot, { recursive: true });
  fs.mkdirSync(musicAudioDataRoot, { recursive: true });

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

    const audioDataBase64 = fs.readFileSync(mp3OutputPath).toString('base64');
    const audioDataScript = [
      'window.__albumAudioData = window.__albumAudioData || {};',
      `window.__albumAudioData[${JSON.stringify(track.audioDataKey)}] = ${JSON.stringify(audioDataBase64)};`
    ].join('\n');
    fs.writeFileSync(
      path.join(DIST_DIR, track.audioDataPathFromRoot.replace(/^\.\//, '')),
      `${audioDataScript}\n`,
      'utf-8'
    );

    playlistLines.push(`#EXTINF:-1,${track.title}`);
    playlistLines.push(track.mp3OutputFileName);
    console.log(`[OK] Packaged track: ${track.trackFolder}`);
  }

  const playlistName = `__${sanitizeFileName(album.title)}.m3u8`;
  fs.writeFileSync(path.join(musicRoot, playlistName), `${playlistLines.join('\n')}\n`, 'utf-8');
  console.log(`[OK] Wrote playlist: music/${playlistName}`);
}

function buildPartyModeLoaderScript(): string {
  return `
;(function () {
  'use strict';

  var button = null;
  var target = null;
  var canvas = null;
  var audioContext = null;
  var visualizer = null;
  var connectedAudio = null;
  var connectedNode = null;
  var renderFrame = 0;
  var isEnabled = localStorage.getItem('partyModeEnabled') === 'true';
  var isRendering = false;
  var presetNames = [];
  var debugPrefix = '[Party Mode]';

  function log(message, details) {
    if (details === undefined) {
      console.log(debugPrefix, message);
      return;
    }
    console.log(debugPrefix, message, details);
  }

  function warn(message, details) {
    if (details === undefined) {
      console.warn(debugPrefix, message);
      return;
    }
    console.warn(debugPrefix, message, details);
  }

  function isAudioPlaying(audio) {
    return Boolean(audio && !audio.paused && !audio.ended && audio.readyState > 0);
  }

  function getAudio() {
    var audioElements = Array.prototype.slice.call(document.querySelectorAll('audio'));
    return audioElements.find(function (audio) {
      return isAudioPlaying(audio);
    }) || audioElements.find(function (audio) {
      return Boolean((audio.currentSrc || audio.src) && !audio.ended);
    }) || null;
  }

  function getPartyTarget() {
    return document.querySelector('.party-div, [data-party-div], #party-div');
  }

  function ensureStyles() {
    if (document.getElementById('party-mode-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'party-mode-styles';
    style.textContent = [
      '.party-mode-button{position:fixed;right:22px;bottom:22px;z-index:50;display:inline-flex;border:1px solid rgba(255,217,138,.58);border-radius:999px;padding:12px 18px;color:#05030c;background:linear-gradient(135deg,#8b32ff,#a332ff 55%,#37f0e7);font:800 14px Inter,system-ui,sans-serif;box-shadow:0 0 26px rgba(139,50,255,.62),0 0 54px rgba(55,240,231,.22);cursor:pointer}',
      '.party-mode-button:not(.is-active){color:#f8f1ff;background:rgba(3,3,10,.82);box-shadow:inset 0 0 18px rgba(139,50,255,.18)}',
      '.party-mode-button:hover{transform:translateY(-2px)}',
      '.party-div{display:none;position:fixed;inset:0;z-index:0;background:#03030a}',
      '.party-div.is-active{display:block}',
      '.party-div canvas{display:block;width:100%;height:100%}',
      'body.party-mode-active main:not([data-view="mini"]):not([data-view="micro"]),body.party-mode-active .wrap{position:relative;z-index:1}',
      'body.party-mode-active .panel[data-view="mini"],body.party-mode-active .panel[data-view="micro"]{position:fixed;left:24px;bottom:24px;z-index:1}',
      'body.party-mode-active main.panel{background:rgba(3,3,10,.9)}',
      'body.party-mode-active{overflow:hidden}'
    ].join('\\n');
    document.head.appendChild(style);
  }

  function ensureButton() {
    if (button) {
      return button;
    }

    button = document.createElement('button');
    button.type = 'button';
    button.className = 'party-mode-button';
    button.textContent = 'Party Mode: OFF';
    button.setAttribute('aria-label', 'Toggle party mode');
    button.addEventListener('click', function () {
      setPartyModeEnabled(!isEnabled);
    });
    document.body.appendChild(button);
    return button;
  }

  function ensureCanvas() {
    target = getPartyTarget();
    if (!target) {
      warn('No party target found. Add an element with class "party-div".');
      return null;
    }

    if (!canvas) {
      canvas = document.createElement('canvas');
      target.innerHTML = '';
      target.appendChild(canvas);
    }
    resizeCanvas();
    return canvas;
  }

  function resizeCanvas() {
    if (!canvas || !target) {
      return;
    }

    var rect = target.getBoundingClientRect();
    var width = Math.max(320, Math.floor(rect.width || window.innerWidth));
    var height = Math.max(240, Math.floor(rect.height || window.innerHeight));
    canvas.width = width;
    canvas.height = height;
    if (visualizer && visualizer.setRendererSize) {
      visualizer.setRendererSize(width, height);
    }
  }

  function getPreset() {
    if (!window.butterchurnPresets || !window.butterchurnPresets.getPresets) {
      return null;
    }

    var presets = window.butterchurnPresets.getPresets();
    if (!presetNames.length) {
      presetNames = Object.keys(presets);
      log('Loaded presets.', { count: presetNames.length });
    }
    if (!presetNames.length) {
      return null;
    }

    return presets[presetNames[Math.floor(Math.random() * presetNames.length)]];
  }

  function connectAudio(audio) {
    if (connectedAudio === audio && visualizer) {
      return;
    }

    if (!audioContext) {
      var AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('Web Audio is not supported in this browser.');
      }
      audioContext = new AudioContextCtor();
      log('Created audio context.');
    }

    var source = audio.__partyModeSource;
    if (!source) {
      source = audioContext.createMediaElementSource(audio);
      source.connect(audioContext.destination);
      audio.__partyModeSource = source;
    }
    log('Connected media element source.', { src: audio.currentSrc || audio.src });

    if (connectedNode && connectedNode !== source && visualizer.disconnectAudio) {
      try {
        visualizer.disconnectAudio(connectedNode);
      } catch (error) {
        warn('Could not disconnect previous audio source.', error);
      }
    }

    if (!visualizer) {
      visualizer = window.butterchurn.createVisualizer(audioContext, canvas, {
        width: canvas.width,
        height: canvas.height,
        textureRatio: 1
      });
      var preset = getPreset();
      if (preset) {
        visualizer.loadPreset(preset, 0);
        log('Loaded initial preset.');
      } else {
        warn('No Butterchurn preset was available.');
      }
    }

    visualizer.connectAudio(source);
    connectedAudio = audio;
    connectedNode = source;
    log('Audio connected to visualizer.');
  }

  function render() {
    var audio = getAudio();
    if (!isEnabled || !isRendering || !isAudioPlaying(audio) || !visualizer) {
      isRendering = false;
      return;
    }

    visualizer.render();
    renderFrame = window.requestAnimationFrame(render);
  }

  function setPartyModeEnabled(nextValue) {
    isEnabled = Boolean(nextValue);
    localStorage.setItem('partyModeEnabled', String(isEnabled));
    log(isEnabled ? 'Party mode enabled.' : 'Party mode disabled.');
    if (!isEnabled) {
      stopVisualizer();
    } else {
      maybeStartVisualizer();
    }
    updateButtonState();
  }

  async function maybeStartVisualizer() {
    var audio = getAudio();
    if (!isEnabled || !isAudioPlaying(audio)) {
      updateButtonState();
      return;
    }

    if (isRendering) {
      updateButtonState();
      return;
    }

    if (!window.butterchurn || !window.butterchurn.createVisualizer) {
      warn('Could not start: Butterchurn is unavailable.');
      updateButtonState();
      return;
    }

    if (!ensureCanvas()) {
      warn('Could not start: add a div with class "party-div".');
      updateButtonState();
      return;
    }

    try {
      connectAudio(audio);
    } catch (error) {
      warn('Could not connect audio to Butterchurn visualizer.', error);
      updateButtonState();
      return;
    }

    if (audioContext && audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (error) {
        warn('Could not resume audio context.', error);
      }
    }

    isRendering = true;
    target.classList.add('is-active');
    document.body.classList.add('party-mode-active');
    updateButtonState();
    window.cancelAnimationFrame(renderFrame);
    log('Party visualizer started.');
    render();
  }

  function stopVisualizer() {
    isRendering = false;
    window.cancelAnimationFrame(renderFrame);
    if (target) {
      target.classList.remove('is-active');
    }
    document.body.classList.remove('party-mode-active');
    updateButtonState();
    log('Party visualizer stopped.');
  }

  function updateButtonState() {
    if (!button) {
      return;
    }

    var audio = getAudio();
    var targetExists = Boolean(getPartyTarget());
    button.classList.toggle('is-active', isEnabled);
    button.textContent = isEnabled ? 'Party Mode: ON' : 'Party Mode: OFF';
    log('Button state updated.', {
      enabled: isEnabled,
      rendering: isRendering,
      audioPlaying: isAudioPlaying(audio),
      targetFound: targetExists,
      visible: true
    });
  }

  function bindAudioEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('audio'), function (audio) {
      if (audio.__partyModeBound) {
        return;
      }
      audio.__partyModeBound = true;
      audio.addEventListener('play', function () {
        log('Audio play event.', { src: audio.currentSrc || audio.src });
        maybeStartVisualizer();
        updateButtonState();
      });
      audio.addEventListener('playing', function () {
        log('Audio playing event.', { src: audio.currentSrc || audio.src });
        maybeStartVisualizer();
        updateButtonState();
      });
      audio.addEventListener('pause', function () {
        log('Audio pause event.');
        stopVisualizer();
        updateButtonState();
      });
      audio.addEventListener('ended', function () {
        log('Audio ended event.');
        stopVisualizer();
        updateButtonState();
      });
      audio.addEventListener('emptied', function () {
        log('Audio emptied event.');
        stopVisualizer();
        updateButtonState();
      });
    });
  }

  function boot() {
    ensureStyles();
    ensureButton();
    bindAudioEvents();
    log('Booted.', {
      audioElements: document.querySelectorAll('audio').length,
      targetFound: Boolean(getPartyTarget()),
      butterchurnLoaded: Boolean(window.butterchurn && window.butterchurn.createVisualizer),
      presetsLoaded: Boolean(window.butterchurnPresets && window.butterchurnPresets.getPresets)
    });
    updateButtonState();
    maybeStartVisualizer();
  }

  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('click', function (event) {
    if (isRendering && event.target === target) {
      setPartyModeEnabled(false);
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      updateButtonState();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;
}

function writePartyModeScript(): void {
  const butterchurnPath = require.resolve('butterchurn/lib/butterchurn.min.js');
  const presetsPath = require.resolve('butterchurn-presets/lib/butterchurnPresetsMinimal.min.js');
  const wrapUmdLibrary = (libraryName: string, source: string): string => `
;(function () {
  var previousModule = window.module;
  var previousExports = window.exports;
  var module = { exports: {} };
  var exports = module.exports;
${source}
  window.${libraryName} = window.${libraryName} || module.exports.default || module.exports;
  window.module = previousModule;
  window.exports = previousExports;
})();
`;

  const parts = [
    wrapUmdLibrary('butterchurn', fs.readFileSync(butterchurnPath, 'utf-8')),
    wrapUmdLibrary('butterchurnPresets', fs.readFileSync(presetsPath, 'utf-8')),
    buildPartyModeLoaderScript()
  ];

  fs.writeFileSync(path.join(DIST_DIR, 'party-mode.js'), `${parts.join('\n\n')}\n`, 'utf-8');
  console.log('[OK] Wrote party mode bundle: party-mode.js');
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
    'play-album.html',
    'party-mode.js'
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
        audioDataPathFromRoot: `./music/audio-data/${trackFolder}.js`,
        audioDataKey: trackFolder,
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
            <a class="btn" href="./play-album.html">Play Album</a>
            <a class="btn secondary" href="./music/">Open Music Folder</a>
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
  </body>
</html>
`;
}

function buildPlayAlbumHtml(album: ResolvedAlbum, theme: ThemeVariables): string {
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
        background: var(--bg);
        color: var(--ink);
        font-family: "Inter", "Segoe UI", sans-serif;
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
          <p class="sub">${escapeHtml(album.title)} - play all.</p>
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
    <script>
      const playlist = ${JSON.stringify(playlist)};
      const player = document.getElementById('player');
      const playerPanel = document.getElementById('playerPanel');
      const playerMain = document.getElementById('playerMain');
      const list = document.getElementById('list');
      const nowArt = document.getElementById('nowArt');
      const nowTitle = document.getElementById('nowTitle');
      const playBtn = document.getElementById('playBtn');
      const nextBtn = document.getElementById('nextBtn');
      const viewButtons = Array.from(document.querySelectorAll('.view-btn'));
      let index = 0;

      window.__albumAudioData = window.__albumAudioData || {};

      function base64ToBlobUrl(base64) {
        const binary = atob(base64);
        const chunks = [];
        for (let offset = 0; offset < binary.length; offset += 32768) {
          const slice = binary.slice(offset, offset + 32768);
          const bytes = new Uint8Array(slice.length);
          for (let i = 0; i < slice.length; i += 1) {
            bytes[i] = slice.charCodeAt(i);
          }
          chunks.push(bytes);
        }
        return URL.createObjectURL(new Blob(chunks, { type: 'audio/mpeg' }));
      }

      async function getPlayableSrc(item) {
        if (item.blobUrl) {
          return item.blobUrl;
        }

        const encodedAudio = window.__albumAudioData[item.audioKey];
        if (encodedAudio) {
          item.blobUrl = base64ToBlobUrl(encodedAudio);
          return item.blobUrl;
        }

        console.warn('Embedded audio data was unavailable; falling back to file path.', item.audioKey);
        return item.src;
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
        const wasPlaying = !player.paused;
        await loadTrack(index - 1);
        if (wasPlaying) {
          try { await player.play(); } catch (err) { console.error(err); }
        }
      }

      async function nextTrack() {
        const wasPlaying = !player.paused;
        await loadTrack(index + 1);
        if (wasPlaying) {
          try { await player.play(); } catch (err) { console.error(err); }
        }
      }

      async function playTrack(newIndex) {
        await loadTrack(newIndex);
        try { await player.play(); } catch (err) { console.error(err); }
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
          const tagName = event.target && event.target.tagName;
          if (tagName && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tagName)) {
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

      loadTrack(0).catch((err) => console.error(err));
      setView(localStorage.getItem('albumPlayerView') || 'standard');
    </script>
    <script src="./party-mode.js"></script>
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
              <a href="${escapeHtml(secondaryActionHref)}">${escapeHtml(secondaryActionLabel)}</a>
            </div>
            <audio id="player" controls src="../../${escapeHtml(track.audioPathFromRoot.replace(/^\.\//, ''))}"></audio>
          </section>
        </section>
      </section>
    </main>
    <div class="party-div" aria-hidden="true"></div>
    <script src="../../${escapeHtml(track.audioDataPathFromRoot.replace(/^\.\//, ''))}"></script>
    <script>
      const player = document.getElementById('player');
      const playSong = document.getElementById('playSong');
      const audioKey = ${JSON.stringify(track.audioDataKey)};

      function base64ToBlobUrl(base64) {
        const binary = atob(base64);
        const chunks = [];
        for (let offset = 0; offset < binary.length; offset += 32768) {
          const slice = binary.slice(offset, offset + 32768);
          const bytes = new Uint8Array(slice.length);
          for (let i = 0; i < slice.length; i += 1) {
            bytes[i] = slice.charCodeAt(i);
          }
          chunks.push(bytes);
        }
        return URL.createObjectURL(new Blob(chunks, { type: 'audio/mpeg' }));
      }

      if (window.__albumAudioData && window.__albumAudioData[audioKey]) {
        player.src = base64ToBlobUrl(window.__albumAudioData[audioKey]);
      }

      playSong.addEventListener('click', async () => {
        try { await player.play(); } catch (err) { console.error(err); }
      });
    </script>
    <script src="../../party-mode.js"></script>
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
  writePartyModeScript();

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
