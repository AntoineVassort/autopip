'use strict';

const previousTabs = new Map(); // windowId → tabId
const tabMuteState = new Map(); // tabId → was muted before we touched it

// ─── TAB VISIBILITY ──────────────────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  const prevTabId = previousTabs.get(windowId);

  if (prevTabId && prevTabId !== tabId) {
    try { await chrome.tabs.sendMessage(prevTabId, { type: 'TAB_HIDDEN' }); } catch (_) {}
  }
  try { await chrome.tabs.sendMessage(tabId, { type: 'TAB_VISIBLE' }); } catch (_) {}

  previousTabs.set(windowId, tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    for (const [, tabId] of previousTabs) {
      try { await chrome.tabs.sendMessage(tabId, { type: 'TAB_HIDDEN' }); } catch (_) {}
    }
  } else {
    const tabId = previousTabs.get(windowId);
    if (tabId) {
      try { await chrome.tabs.sendMessage(tabId, { type: 'TAB_VISIBLE' }); } catch (_) {}
    }
  }
});

// ─── KEYBOARD SHORTCUT ───────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-pip') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try { await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PIP' }); } catch (_) {}
});

// ─── TAB MUTING ON PIP ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (message.type === 'PIP_ENTERED') {
    const { muteTabs } = await chrome.storage.sync.get({ muteTabs: false });
    if (!muteTabs) return;
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (!tab) return;
    const wasMuted = tab.mutedInfo?.muted ?? false;
    tabMuteState.set(tabId, wasMuted);
    if (!wasMuted) await chrome.tabs.update(tabId, { muted: true });
  }

  if (message.type === 'PIP_LEFT') {
    if (!tabMuteState.has(tabId)) return;
    const wasMuted = tabMuteState.get(tabId);
    tabMuteState.delete(tabId);
    if (!wasMuted) await chrome.tabs.update(tabId, { muted: false });
  }
});

// ─── ICON & STORAGE ──────────────────────────────────────────────────────────

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => updateIcon(enabled));

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) updateIcon(changes.enabled.newValue);
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
    chrome.tabs.create({ url: 'https://github.com/AntoineVassort/autopip#getting-started' });
  }
});
