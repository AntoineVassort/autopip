'use strict';

const DEFAULTS = {
  enabled: true,
  muteTabs: false,
  whitelistMode: false,
  excludedSites: [],
  allowedSites: [],
  minVideoArea: 40000,
  debounceDelay: 300,
};

// DOM refs
const toggleEnabled   = document.getElementById('toggle-enabled');
const toggleMute      = document.getElementById('toggle-mute');
const sitesTextarea   = document.getElementById('sites-textarea');
const sitesLabel      = document.getElementById('sites-label');
const sitesHint       = document.getElementById('sites-hint');
const btnAddCurrent   = document.getElementById('btn-add-current');
const btnBlacklist    = document.getElementById('btn-blacklist');
const btnWhitelist    = document.getElementById('btn-whitelist');
const rangeDebounce   = document.getElementById('debounce-delay');
const rangeArea       = document.getElementById('min-video-area');
const debounceDisplay = document.getElementById('debounce-display');
const areaDisplay     = document.getElementById('area-display');
const statusText      = document.getElementById('status-text');
const statusBadge     = document.getElementById('status-badge');
const shortcutLink    = document.getElementById('shortcut-link');

// In-memory copies of both site lists (so switching mode doesn't lose either)
let excludedSites = [];
let allowedSites  = [];
let whitelistMode = false;

// ─── LOAD ─────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(DEFAULTS, (result) => {
  toggleEnabled.checked  = result.enabled;
  toggleMute.checked     = result.muteTabs;
  excludedSites          = result.excludedSites;
  allowedSites           = result.allowedSites;
  whitelistMode          = result.whitelistMode;
  rangeDebounce.value    = result.debounceDelay;
  rangeArea.value        = result.minVideoArea;
  updateDisplays(result);
  updateSitesUI();
  refreshStatus();
});

// ─── SAVE ─────────────────────────────────────────────────────────────────────

function saveConfig() {
  // Sync current textarea into whichever list is active
  const lines = sitesTextarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (whitelistMode) allowedSites = lines;
  else excludedSites = lines;

  const config = {
    enabled:       toggleEnabled.checked,
    muteTabs:      toggleMute.checked,
    whitelistMode,
    excludedSites,
    allowedSites,
    minVideoArea:  parseInt(rangeArea.value),
    debounceDelay: parseInt(rangeDebounce.value),
  };

  chrome.storage.sync.set(config, () => setStatus('Saved ✓', 1500));
}

function updateDisplays({ debounceDelay, minVideoArea }) {
  debounceDisplay.textContent = `${debounceDelay} ms`;
  const side = Math.round(Math.sqrt(minVideoArea));
  areaDisplay.textContent = `${side} × ${side} px`;
}

function setStatus(msg, duration = 0) {
  statusText.textContent = msg;
  if (duration) setTimeout(() => { statusText.textContent = 'Ready'; }, duration);
}

// ─── SITES MODE ───────────────────────────────────────────────────────────────

function updateSitesUI() {
  if (whitelistMode) {
    sitesLabel.textContent       = 'Allowed sites';
    sitesHint.textContent        = 'AutoPiP only activates on these sites.';
    sitesTextarea.placeholder    = 'youtube.com\ntwitch.tv';
    sitesTextarea.value          = allowedSites.join('\n');
    btnBlacklist.classList.remove('active');
    btnWhitelist.classList.add('active');
  } else {
    sitesLabel.textContent       = 'Excluded sites';
    sitesHint.textContent        = 'AutoPiP is disabled on these sites.';
    sitesTextarea.placeholder    = 'meet.google.com\nzoom.us';
    sitesTextarea.value          = excludedSites.join('\n');
    btnBlacklist.classList.add('active');
    btnWhitelist.classList.remove('active');
  }
}

btnBlacklist.addEventListener('click', () => {
  if (!whitelistMode) return;
  allowedSites = sitesTextarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  whitelistMode = false;
  updateSitesUI();
  saveConfig();
});

btnWhitelist.addEventListener('click', () => {
  if (whitelistMode) return;
  excludedSites = sitesTextarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  whitelistMode = true;
  updateSitesUI();
  saveConfig();
});

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

async function refreshStatus() {
  statusBadge.className = 'badge';
  statusBadge.textContent = '—';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  if (!tab?.id) return;

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' });
    if (res?.pipActive) {
      statusBadge.textContent = 'PiP active';
      statusBadge.classList.add('pip-active');
    } else if (res?.videoFound) {
      statusBadge.textContent = 'Video found';
      statusBadge.classList.add('video-found');
    } else {
      statusBadge.textContent = 'No video';
    }
  } catch {
    // Content script not available on this page (chrome://, new tab, etc.)
  }
}

// ─── SHORTCUT LINK ────────────────────────────────────────────────────────────

shortcutLink.addEventListener('click', (e) => {
  e.preventDefault();
  // Firefox uses a different URL for shortcut management
  const url = typeof browser !== 'undefined'
    ? 'about:addons' // Firefox → user navigates to manage extension shortcuts manually
    : 'chrome://extensions/shortcuts';
  chrome.tabs.create({ url });
});

// ─── FORCE PIP ────────────────────────────────────────────────────────────────

document.getElementById('btn-force-pip').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const videos = Array.from(document.querySelectorAll('video'));
        const playing = videos.filter(v =>
          !v.paused && !v.ended && v.readyState >= 2 &&
          !(v.muted && v.autoplay) &&
          (v.videoWidth * v.videoHeight) >= 40000
        );
        const pool = playing.length ? playing : videos.filter(v =>
          !v.ended && v.readyState >= 2 && (v.videoWidth * v.videoHeight) >= 40000
        );
        if (!pool.length) return;
        const best = pool.reduce((a, b) =>
          (a.videoWidth * a.videoHeight) > (b.videoWidth * b.videoHeight) ? a : b
        );
        best.disablePictureInPicture = false;
        best.requestPictureInPicture().catch(() => {});
      },
    });
    setStatus('PiP triggered ✓', 2000);
    setTimeout(refreshStatus, 600);
  } catch {
    setStatus('No video found', 2000);
  }
});

// ─── ADD CURRENT SITE ─────────────────────────────────────────────────────────

btnAddCurrent.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.url) return;
    let hostname;
    try { hostname = new URL(tab.url).hostname; } catch { return; }

    const current = sitesTextarea.value.trim();
    const lines = current ? current.split('\n') : [];
    if (!lines.includes(hostname)) {
      sitesTextarea.value = [...lines, hostname].join('\n');
      saveConfig();
    }
    setStatus(`Added: ${hostname}`, 2000);
  });
});

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

toggleEnabled.addEventListener('change', saveConfig);
toggleMute.addEventListener('change', saveConfig);
sitesTextarea.addEventListener('input', debounce(saveConfig, 600));

rangeDebounce.addEventListener('input', () => {
  debounceDisplay.textContent = `${rangeDebounce.value} ms`;
});
rangeDebounce.addEventListener('change', saveConfig);

rangeArea.addEventListener('input', () => {
  const side = Math.round(Math.sqrt(parseInt(rangeArea.value)));
  areaDisplay.textContent = `${side} × ${side} px`;
});
rangeArea.addEventListener('change', saveConfig);

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
