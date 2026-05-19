export function buildRuntimeProfileScript(): string {
  return `
;(function () {
  'use strict';

  var PROFILE_DEFINITIONS = {
    offline: {
      name: 'offline',
      label: 'Offline',
      visualizer: { width: 960, height: 540, fps: 30, textureRatio: 1, presetComplexity: 'medium' },
      player: { preload: 'auto', uiDensity: 'comfortable', keyboardControls: true, touchControls: false }
    },
    'desktop-high': {
      name: 'desktop-high',
      label: 'Desktop High',
      visualizer: { width: 1280, height: 720, fps: 60, textureRatio: 1, presetComplexity: 'high' },
      player: { preload: 'auto', uiDensity: 'comfortable', keyboardControls: true, touchControls: false }
    },
    'desktop-low': {
      name: 'desktop-low',
      label: 'Desktop Low',
      visualizer: { width: 960, height: 540, fps: 30, textureRatio: 1, presetComplexity: 'medium' },
      player: { preload: 'metadata', uiDensity: 'comfortable', keyboardControls: true, touchControls: false }
    },
    mobile: {
      name: 'mobile',
      label: 'Mobile',
      visualizer: { width: 640, height: 360, fps: 24, textureRatio: 0.75, presetComplexity: 'low' },
      player: { preload: 'metadata', uiDensity: 'compact', keyboardControls: false, touchControls: true }
    },
    kiosk: {
      name: 'kiosk',
      label: 'Kiosk',
      visualizer: { width: 1280, height: 720, fps: 30, textureRatio: 1, presetComplexity: 'medium' },
      player: { preload: 'auto', uiDensity: 'comfortable', keyboardControls: true, touchControls: true }
    }
  };

  var cachedProfile = null;

  function isFileUrl() {
    return window.location.protocol === 'file:';
  }

  function isTouchDevice() {
    return Boolean(
      window.matchMedia && window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0
    );
  }

  function getHardwareScore() {
    var cores = navigator.hardwareConcurrency || 2;
    var memory = navigator.deviceMemory || 4;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    var viewportPixels = window.innerWidth * window.innerHeight * dpr * dpr;
    var score = 0;

    if (cores >= 8) {
      score += 2;
    } else if (cores >= 4) {
      score += 1;
    }

    if (memory >= 8) {
      score += 2;
    } else if (memory >= 4) {
      score += 1;
    }

    if (viewportPixels <= 1920 * 1080) {
      score += 1;
    } else if (viewportPixels > 3840 * 2160) {
      score -= 1;
    }

    return score;
  }

  function getStoredProfileName() {
    try {
      return localStorage.getItem('albumRuntimeProfile') || localStorage.getItem('partyModePerformance');
    } catch (error) {
      return null;
    }
  }

  function normalizeLegacyProfileName(name) {
    if (name === 'high') {
      return 'desktop-high';
    }
    if (name === 'medium' || name === 'low') {
      return 'desktop-low';
    }
    return name;
  }

  function detectProfileName() {
    var stored = normalizeLegacyProfileName(getStoredProfileName());
    if (stored && PROFILE_DEFINITIONS[stored]) {
      return stored;
    }

    var forced = document.documentElement.getAttribute('data-runtime-profile');
    if (forced && PROFILE_DEFINITIONS[forced]) {
      return forced;
    }

    if (isFileUrl()) {
      return 'offline';
    }

    if (window.innerWidth < 900 || isTouchDevice()) {
      return 'mobile';
    }

    return getHardwareScore() >= 3 ? 'desktop-high' : 'desktop-low';
  }

  function cloneProfile(profile) {
    return JSON.parse(JSON.stringify(profile));
  }

  function applyProfile(profile) {
    document.documentElement.dataset.runtimeProfile = profile.name;
    document.documentElement.dataset.uiDensity = profile.player.uiDensity;
    document.body.classList.remove(
      'runtime-profile-offline',
      'runtime-profile-desktop-high',
      'runtime-profile-desktop-low',
      'runtime-profile-mobile',
      'runtime-profile-kiosk'
    );
    document.body.classList.add('runtime-profile-' + profile.name);
  }

  function getProfile() {
    if (!cachedProfile) {
      cachedProfile = cloneProfile(PROFILE_DEFINITIONS[detectProfileName()]);
    }
    return cachedProfile;
  }

  function refreshProfile() {
    cachedProfile = cloneProfile(PROFILE_DEFINITIONS[detectProfileName()]);
    applyProfile(cachedProfile);
    return cachedProfile;
  }

  function base64ToBlobUrl(base64, mimeType) {
    var binary = atob(base64);
    var chunks = [];
    for (var offset = 0; offset < binary.length; offset += 32768) {
      var slice = binary.slice(offset, offset + 32768);
      var bytes = new Uint8Array(slice.length);
      for (var i = 0; i < slice.length; i += 1) {
        bytes[i] = slice.charCodeAt(i);
      }
      chunks.push(bytes);
    }
    return URL.createObjectURL(new Blob(chunks, { type: mimeType || 'audio/mpeg' }));
  }

  var audioProvider = {
    async getAudioUrl(item) {
      window.__albumAudioData = window.__albumAudioData || {};

      if (item.blobUrl) {
        return item.blobUrl;
      }

      var encodedAudio = window.__albumAudioData[item.audioKey];
      if (encodedAudio) {
        item.blobUrl = base64ToBlobUrl(encodedAudio, 'audio/mpeg');
        return item.blobUrl;
      }

      return item.src;
    }
  };

  window.albumRuntime = {
    profiles: PROFILE_DEFINITIONS,
    getProfile: getProfile,
    refreshProfile: refreshProfile,
    audioProvider: audioProvider,
    base64ToBlobUrl: base64ToBlobUrl
  };

  function boot() {
    applyProfile(getProfile());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('resize', function () {
    var previousName = getProfile().name;
    var nextProfile = refreshProfile();
    if (previousName !== nextProfile.name) {
      window.dispatchEvent(new CustomEvent('album-runtime-profile-change', { detail: nextProfile }));
    }
  });
})();
`;
}
