'use strict';

let config = {
  enabled: true,
  excludedSites: [],
  minVideoArea: 40000,
  debounceDelay: 300,
};

let currentVideo = null;
let pipActive = false;
let autoVideo = null; // video currently assigned autoPictureInPicture=true
let initialized = false;

// ─── CONFIG ───────────────────────────────────────────────────────────────────

async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { enabled: true, excludedSites: [], minVideoArea: 40000, debounceDelay: 300 },
      (result) => { config = result; resolve(); }
    );
  });
}

chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    config[key] = newValue;
  }
  if (!config.enabled) {
    assignAutoPip(null);
    exitPip();
  } else {
    refreshAutoPip();
  }
});

// ─── LOGIQUE PiP ──────────────────────────────────────────────────────────────

function videoArea(v) {
  const rect = v.getBoundingClientRect();
  return (rect.width * rect.height) || (v.videoWidth * v.videoHeight);
}

function findMainVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 0) return null;

  const candidates = videos.filter(v => {
    if (v.readyState < 2) return false;
    if (v.ended) return false;
    if (v.muted && v.autoplay) return false;
    return videoArea(v) >= config.minVideoArea;
  });

  if (candidates.length === 0) return null;

  const playing = candidates.filter(v => !v.paused);
  const pool = playing.length > 0 ? playing : candidates;

  return pool.reduce((best, v) => videoArea(v) > videoArea(best) ? v : best);
}

// Assign autoPictureInPicture to the given video (and remove it from the previous one).
// The browser then handles PiP automatically when the tab is hidden — no user gesture needed.
function assignAutoPip(video) {
  if (autoVideo && autoVideo !== video) {
    autoVideo.autoPictureInPicture = false;
  }
  autoVideo = video;
  if (video) {
    video.disablePictureInPicture = false;
    video.autoPictureInPicture = true;
  }
}

function refreshAutoPip() {
  assignAutoPip(config.enabled ? findMainVideo() : null);
}

async function enterPip(video) {
  if (pipActive || !video) return;
  if (!document.pictureInPictureEnabled) return;
  video.disablePictureInPicture = false;
  try {
    await video.requestPictureInPicture();
  } catch (err) {
    if (err.name === 'InvalidStateError') setTimeout(() => enterPip(video), 500);
  }
}

async function exitPip() {
  if (!pipActive) return;
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
  } catch (_) {}
}

// ─── TRACKING DE L'ÉTAT PiP ──────────────────────────────────────────────────
// Covers both our manual enterPip() calls and browser-triggered autoPictureInPicture

document.addEventListener('enterpictureinpicture', (e) => {
  pipActive = true;
  currentVideo = e.target;
}, true);

document.addEventListener('leavepictureinpicture', () => {
  pipActive = false;
  currentVideo = null;
}, true);

// ─── MESSAGES DU BACKGROUND ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TAB_HIDDEN') {
    // autoPictureInPicture handles this natively; manual call is a fallback
    // for browsers that don't support it or when user activation is available
    if (config.enabled && !pipActive) {
      const video = findMainVideo();
      if (video) enterPip(video);
    }
    sendResponse({ ok: true });
  }
  if (message.type === 'TAB_VISIBLE') {
    exitPip();
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_STATUS') {
    sendResponse({ pipActive, videoFound: !!findMainVideo(), url: window.location.href });
  }
  if (message.type === 'FORCE_PIP') {
    const video = findMainVideo();
    if (video) enterPip(video);
    sendResponse({ ok: true });
  }
  if (message.type === 'FORCE_EXIT') {
    exitPip();
    sendResponse({ ok: true });
  }
  return true;
});

// ─── INIT ─────────────────────────────────────────────────────────────────────

async function init() {
  if (initialized) return;
  initialized = true;

  await loadConfig();

  const host = window.location.hostname;
  if (config.excludedSites.some(site => host.includes(site))) return;
  if (!document.pictureInPictureEnabled) return;

  // Set autoPictureInPicture on whatever video is already present
  refreshAutoPip();

  // Re-assign when a new video starts playing (SPA navigation, late-loading players)
  document.addEventListener('play', (e) => {
    if (e.target.tagName === 'VIDEO') refreshAutoPip();
  }, true);

  // Fallback for browsers where visibilitychange is not blocked
  document.addEventListener('visibilitychange', () => {
    if (!config.enabled) return;
    if (document.hidden) {
      const video = findMainVideo();
      if (video) enterPip(video);
    } else {
      exitPip();
    }
  });

  // Update autoPip assignment when video changes during SPA navigation
  const observer = new MutationObserver(() => {
    if (!pipActive) refreshAutoPip();
    else {
      const newVideo = findMainVideo();
      if (newVideo && newVideo !== currentVideo) {
        exitPip().then(() => { if (document.hidden) enterPip(newVideo); });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

init();
