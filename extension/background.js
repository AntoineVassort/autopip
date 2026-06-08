'use strict';

// Per-window tracking of the previously active tab
const previousTabs = new Map(); // windowId → tabId

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const prevTabId = previousTabs.get(windowId);

  if (prevTabId && prevTabId !== tabId) {
    // Previous tab just became hidden → trigger PiP
    try {
      await chrome.tabs.sendMessage(prevTabId, { type: 'TAB_HIDDEN' });
    } catch (_) {}
  }

  // Newly active tab → exit PiP
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TAB_VISIBLE' });
  } catch (_) {}

  previousTabs.set(windowId, tabId);
});

// Window minimized → hide all tabs in that window
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // All windows lost focus — find the last active tab per window and hide it
    for (const [wid, tabId] of previousTabs) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'TAB_HIDDEN' });
      } catch (_) {}
    }
  } else {
    // A window regained focus — restore the active tab in it
    const tabId = previousTabs.get(windowId);
    if (tabId) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'TAB_VISIBLE' });
      } catch (_) {}
    }
  }
});

// ─── ICON & STORAGE ──────────────────────────────────────────────────────────

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  updateIcon(enabled);
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    updateIcon(changes.enabled.newValue);
  }
});

function updateIcon(enabled) {
  chrome.action.setIcon({
    path: {
      16: enabled ? 'icons/icon16.png' : 'icons/icon16_disabled.png',
      48: enabled ? 'icons/icon48.png' : 'icons/icon48_disabled.png',
      128: enabled ? 'icons/icon128.png' : 'icons/icon128_disabled.png',
    }
  });
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({
      url: 'https://github.com/autopip/autopip#getting-started'
    });
  }
});
