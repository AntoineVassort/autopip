'use strict';

const DEFAULTS = {
  enabled: true,
  excludedSites: [],
  minVideoArea: 40000,
  debounceDelay: 300,
};

const toggleEnabled = document.getElementById('toggle-enabled');
const textareaExcluded = document.getElementById('excluded-sites');
const btnAddCurrent = document.getElementById('btn-add-current');
const rangeDebounce = document.getElementById('debounce-delay');
const rangeArea = document.getElementById('min-video-area');
const debounceDisplay = document.getElementById('debounce-display');
const areaDisplay = document.getElementById('area-display');
const statusText = document.getElementById('status-text');

chrome.storage.sync.get(DEFAULTS, (result) => {
  toggleEnabled.checked = result.enabled;
  textareaExcluded.value = result.excludedSites.join('\n');
  rangeDebounce.value = result.debounceDelay;
  rangeArea.value = result.minVideoArea;
  updateDisplays(result);
});

function saveConfig() {
  const excludedSites = textareaExcluded.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const config = {
    enabled: toggleEnabled.checked,
    excludedSites,
    minVideoArea: parseInt(rangeArea.value),
    debounceDelay: parseInt(rangeDebounce.value),
  };

  chrome.storage.sync.set(config, () => {
    setStatus('Saved ✓', 1500);
  });
}

function updateDisplays(config) {
  debounceDisplay.textContent = `${config.debounceDelay} ms`;
  const side = Math.round(Math.sqrt(config.minVideoArea));
  areaDisplay.textContent = `${side} × ${side} px`;
}

function setStatus(msg, duration = 0) {
  statusText.textContent = msg;
  if (duration) setTimeout(() => { statusText.textContent = 'Ready'; }, duration);
}

toggleEnabled.addEventListener('change', saveConfig);
textareaExcluded.addEventListener('input', debounce(saveConfig, 600));

rangeDebounce.addEventListener('input', () => {
  debounceDisplay.textContent = `${rangeDebounce.value} ms`;
});
rangeDebounce.addEventListener('change', saveConfig);

rangeArea.addEventListener('input', () => {
  const side = Math.round(Math.sqrt(parseInt(rangeArea.value)));
  areaDisplay.textContent = `${side} × ${side} px`;
});
rangeArea.addEventListener('change', saveConfig);

// Force PiP via executeScript — propagates user activation from popup click (Brave workaround)
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
  } catch {
    setStatus('No video found', 2000);
  }
});

btnAddCurrent.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab?.url) return;
    const hostname = new URL(tab.url).hostname;
    const current = textareaExcluded.value.trim();
    const lines = current ? current.split('\n') : [];
    if (!lines.includes(hostname)) {
      textareaExcluded.value = [...lines, hostname].join('\n');
      saveConfig();
    }
    setStatus(`Excluded: ${hostname}`, 2000);
  });
});

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
