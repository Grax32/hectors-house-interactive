import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { buildRuntimeProfileScript } from './runtime-client';
import { buildAlbumLandingHtml, buildPlayAlbumHtml, buildSongPageHtml } from './renderers/album-pages';

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

interface BuildOptions {
  includeWavFiles: boolean;
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

function prepareContentAndMusic(album: ResolvedAlbum, options: BuildOptions): void {
  const ffmpegPath = getFfmpegBinaryPath();
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static is required to generate MP3 files');
  }

  const contentRoot = path.join(DIST_DIR, 'content');
  const musicRoot = path.join(DIST_DIR, 'music');
  const musicAudioDataRoot = path.join(musicRoot, 'audio-data');
  fs.mkdirSync(contentRoot, { recursive: true });
  fs.mkdirSync(musicRoot, { recursive: true });
  if (options.includeWavFiles) {
    fs.mkdirSync(path.join(musicRoot, 'wav'), { recursive: true });
  }
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

    if (options.includeWavFiles) {
      const wavOutputPath = path.join(musicRoot, 'wav', track.wavOutputFileName);
      fs.copyFileSync(track.wavSourcePath, wavOutputPath);
    }

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
  var activeProfile = null;
  var profilePromise = null;
  var lastRenderTime = 0;
  var currentPresetName = '';
  var lastAudioSrc = '';

  var fallbackProfile = {
    name: 'desktop-low',
    label: 'Desktop Low',
    visualizer: { width: 960, height: 540, fps: 30, textureRatio: 1, presetComplexity: 'medium' }
  };

  function getVisualizerProfile() {
    var profile = activeProfile || fallbackProfile;
    return profile.visualizer || fallbackProfile.visualizer;
  }

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
      '.party-div{display:none;position:fixed;inset:0;z-index:1;background:transparent;opacity:.75;pointer-events:none}',
      '.party-div.is-active{display:block}',
      '.party-div canvas{display:block;width:100%;height:100%;object-fit:cover}',
      'body.party-mode-active main:not([data-view="mini"]):not([data-view="micro"]),body.party-mode-active .wrap{position:relative;z-index:2}',
      'body.party-mode-active .panel[data-view="mini"],body.party-mode-active .panel[data-view="micro"]{position:fixed;left:24px;bottom:24px;z-index:2}',
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
    if (!canvas || !target || !activeProfile) {
      return;
    }

    var visualizerProfile = getVisualizerProfile();
    canvas.width = visualizerProfile.width;
    canvas.height = visualizerProfile.height;
    if (visualizer && visualizer.setRendererSize) {
      visualizer.setRendererSize(visualizerProfile.width, visualizerProfile.height);
    }
  }

  async function getPerformanceProfile() {
    if (activeProfile) {
      return activeProfile;
    }

    if (!profilePromise) {
      profilePromise = Promise.resolve().then(function () {
        activeProfile = window.albumRuntime && window.albumRuntime.getProfile
          ? window.albumRuntime.getProfile()
          : fallbackProfile;
        var visualizerProfile = getVisualizerProfile();
        log('Selected performance profile.', {
          profile: activeProfile.name,
          resolution: visualizerProfile.width + 'x' + visualizerProfile.height,
          fps: visualizerProfile.fps,
          presetComplexity: visualizerProfile.presetComplexity
        });
        return activeProfile;
      });
    }

    return profilePromise;
  }

  function getPresetChoice() {
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

    var availableNames = presetNames;
    if (presetNames.length > 1 && currentPresetName) {
      availableNames = presetNames.filter(function (name) {
        return name !== currentPresetName;
      });
    }

    var name = availableNames[Math.floor(Math.random() * availableNames.length)];
    return {
      name: name,
      preset: presets[name]
    };
  }

  function changePreset(reason, blendSeconds) {
    if (!visualizer) {
      return;
    }

    var choice = getPresetChoice();
    if (!choice) {
      warn('No Butterchurn preset was available.');
      return;
    }

    currentPresetName = choice.name;
    visualizer.loadPreset(choice.preset, blendSeconds);
    log('Loaded visualizer preset.', {
      reason: reason,
      preset: currentPresetName,
      blendSeconds: blendSeconds
    });
  }

  function noteAudioSource(audio, reason) {
    var src = audio && (audio.currentSrc || audio.src);
    if (!src || src === lastAudioSrc) {
      return;
    }

    if (!lastAudioSrc) {
      lastAudioSrc = src;
      return;
    }

    lastAudioSrc = src;
    changePreset(reason, 1.2);
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
      var profile = getVisualizerProfile();
      visualizer = window.butterchurn.createVisualizer(audioContext, canvas, {
        width: profile.width,
        height: profile.height,
        textureRatio: profile.textureRatio
      });
      changePreset('initial', 0);
    }

    visualizer.connectAudio(source);
    connectedAudio = audio;
    connectedNode = source;
    noteAudioSource(audio, 'song-change');
    log('Audio connected to visualizer.');
  }

  function render() {
    var audio = getAudio();
    if (!isEnabled || !isRendering || !isAudioPlaying(audio) || !visualizer) {
      isRendering = false;
      return;
    }

    var now = window.performance ? window.performance.now() : Date.now();
    var frameInterval = 1000 / getVisualizerProfile().fps;
    if (now - lastRenderTime >= frameInterval - 1) {
      visualizer.render();
      lastRenderTime = now;
    }
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
    window.dispatchEvent(new CustomEvent('album-party-mode-change', {
      detail: { enabled: isEnabled, rendering: isRendering }
    }));
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

    await getPerformanceProfile();
    resizeCanvas();

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
    lastRenderTime = 0;
    log('Party visualizer started.', {
      profile: activeProfile && activeProfile.name,
      resolution: activeProfile && (getVisualizerProfile().width + 'x' + getVisualizerProfile().height),
      fps: activeProfile && getVisualizerProfile().fps
    });
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
    button.textContent = isEnabled
      ? 'Party Mode: ON' + (activeProfile ? ' - ' + activeProfile.label : '')
      : 'Party Mode: OFF';
    log('Button state updated.', {
      enabled: isEnabled,
      rendering: isRendering,
      audioPlaying: isAudioPlaying(audio),
      targetFound: targetExists,
      profile: activeProfile && activeProfile.name,
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
        noteAudioSource(audio, 'song-change');
        maybeStartVisualizer();
        updateButtonState();
      });
      audio.addEventListener('playing', function () {
        log('Audio playing event.', { src: audio.currentSrc || audio.src });
        noteAudioSource(audio, 'song-change');
        maybeStartVisualizer();
        updateButtonState();
      });
      audio.addEventListener('loadstart', function () {
        log('Audio loadstart event.', { src: audio.currentSrc || audio.src });
        noteAudioSource(audio, 'song-change');
      });
      audio.addEventListener('loadedmetadata', function () {
        log('Audio loadedmetadata event.', { src: audio.currentSrc || audio.src });
        noteAudioSource(audio, 'song-change');
      });
      audio.addEventListener('pause', function () {
        log('Audio pause event.');
        changePreset('pause', 0);
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
      presetsLoaded: Boolean(window.butterchurnPresets && window.butterchurnPresets.getPresets),
      storedProfile: localStorage.getItem('albumRuntimeProfile') || localStorage.getItem('partyModePerformance') || 'auto'
    });
    updateButtonState();
    maybeStartVisualizer();
    window.dispatchEvent(new CustomEvent('album-party-mode-change', {
      detail: { enabled: isEnabled, rendering: isRendering }
    }));
  }

  window.albumPartyMode = {
    isEnabled: function () {
      return isEnabled;
    },
    isRendering: function () {
      return isRendering;
    },
    setEnabled: setPartyModeEnabled,
    toggle: function () {
      setPartyModeEnabled(!isEnabled);
    }
  };

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('album-runtime-profile-change', function (event) {
    activeProfile = event.detail;
    resizeCanvas();
    updateButtonState();
  });
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

function writeRuntimeProfileScript(): void {
  fs.writeFileSync(path.join(DIST_DIR, 'runtime-profile.js'), buildRuntimeProfileScript(), 'utf-8');
  console.log('[OK] Wrote runtime profile script: runtime-profile.js');
}

function writeRootRedirectPage(): void {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=./START-HERE.html" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hector's House</title>
    <script>
      window.location.replace('./START-HERE.html');
    </script>
  </head>
  <body>
    <p><a href="./START-HERE.html">Start Hector's House</a></p>
  </body>
</html>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), html, 'utf-8');
  console.log('[OK] Wrote root redirect page: index.html');
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
    'runtime-profile.js',
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

function writeGuidedEntryPoint(theme: ThemeVariables, options: BuildOptions): void {
  const album = resolvePrimaryAlbum();
  if (!album) {
    const fallback = `<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Album</title></head><body><h1>No album found</h1><p>Add media under content-files/music/albums or place audio files in content-files and run build again.</p></body></html>`;
    fs.writeFileSync(path.join(DIST_DIR, 'START-HERE.html'), fallback, 'utf-8');
    return;
  }

  prepareContentAndMusic(album, options);
  writeRuntimeProfileScript();
  writePartyModeScript();

  const landing = buildAlbumLandingHtml(album, theme, options);
  fs.writeFileSync(path.join(DIST_DIR, 'START-HERE.html'), landing, 'utf-8');
  console.log('[OK] Wrote guided entry file: START-HERE.html');
  writeRootRedirectPage();

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
    const isLiteBuild = process.argv.includes('--lite');
    const options: BuildOptions = {
      includeWavFiles: !isLiteBuild
    };

    console.log('[INFO] Starting album build process...\n');
    if (isLiteBuild) {
      console.log('[INFO] Lite build enabled: skipping WAV files in dist/music/wav.\n');
    }

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
    writeGuidedEntryPoint(theme, options);
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

