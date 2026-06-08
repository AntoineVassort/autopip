// ==UserScript==
// @name         AutoPiP — Universal Picture-in-Picture
// @namespace    https://github.com/autopip/autopip
// @version      1.0.0
// @description  Automatic Picture-in-Picture when you switch tabs. Works on any HTML5 video.
// @author       AutoPiP Contributors
// @license      MIT
// @match        *://*/*
// @exclude      *://mail.google.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

'use strict';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const CONFIG = {
  enabled: GM_getValue('enabled', true),
  excludedSites: GM_getValue('excludedSites', []),
  minVideoArea: 40000,
  debounceDelay: 300,
  spaObserverDelay: 1000,
};

// ─── ÉTAT ────────────────────────────────────────────────────────────────────
let currentVideo = null;
let pipActive = false;
let debounceTimer = null;
let mutationObserver = null;

// ─── FONCTIONS UTILITAIRES ───────────────────────────────────────────────────

function findMainVideo() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 0) return null;

  const candidates = videos.filter(v => {
    if (v.readyState < 2) return false;
    if (v.ended) return false;
    if (v.muted && v.autoplay) return false;
    const rect = v.getBoundingClientRect();
    const area = rect.width * rect.height;
    return area >= CONFIG.minVideoArea;
  });

  if (candidates.length === 0) return null;

  const playing = candidates.filter(v => !v.paused);
  const pool = playing.length > 0 ? playing : candidates;

  return pool.reduce((best, v) => {
    const rect = v.getBoundingClientRect();
    const bestRect = best.getBoundingClientRect();
    return (rect.width * rect.height) > (bestRect.width * bestRect.height) ? v : best;
  });
}

function isPipSupported(video) {
  return (
    document.pictureInPictureEnabled &&
    !video.disablePictureInPicture
  );
}

async function enterPip(video) {
  if (pipActive || !video) return;
  if (!document.pictureInPictureEnabled) return;

  // Override site-level block (YouTube sets this to prevent native PiP)
  video.disablePictureInPicture = false;

  try {
    await video.requestPictureInPicture();
    pipActive = true;
    currentVideo = video;
    video.addEventListener('leavepictureinpicture', onLeavePip, { once: true });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      // Site blocks PiP (e.g. Netflix) — silent
    } else if (err.name === 'InvalidStateError') {
      setTimeout(() => enterPip(video), 500);
    } else {
      console.warn('[AutoPiP] PiP error:', err.message);
    }
  }
}

async function exitPip() {
  if (!pipActive) return;

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  } catch (_) {}
  finally {
    pipActive = false;
    currentVideo = null;
  }
}

function onLeavePip() {
  pipActive = false;
  currentVideo = null;
}

// ─── DÉTECTION DU CHANGEMENT D'ONGLET ────────────────────────────────────────

function onVisibilityChange() {
  if (!CONFIG.enabled) return;

  clearTimeout(debounceTimer);

  if (document.hidden) {
    debounceTimer = setTimeout(() => {
      const video = findMainVideo();
      if (video) enterPip(video);
    }, CONFIG.debounceDelay);
  } else {
    exitPip();
  }
}

// ─── SUPPORT SPA ──────────────────────────────────────────────────────────────

function setupSpaObserver() {
  if (mutationObserver) mutationObserver.disconnect();

  mutationObserver = new MutationObserver(() => {
    if (pipActive) {
      const newVideo = findMainVideo();
      if (newVideo && newVideo !== currentVideo) {
        exitPip().then(() => {
          if (document.hidden) enterPip(newVideo);
        });
      }
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
  });
}

// ─── MENU UTILISATEUR ─────────────────────────────────────────────────────────

GM_registerMenuCommand(
  `AutoPiP: ${CONFIG.enabled ? '✅ Activé' : '❌ Désactivé'} — Cliquer pour basculer`,
  () => {
    CONFIG.enabled = !CONFIG.enabled;
    GM_setValue('enabled', CONFIG.enabled);
    if (!CONFIG.enabled) exitPip();
    alert(`AutoPiP ${CONFIG.enabled ? 'activé ✅' : 'désactivé ❌'}`);
  }
);

// ─── INIT ─────────────────────────────────────────────────────────────────────

function init() {
  const host = window.location.hostname;
  if (CONFIG.excludedSites.some(site => host.includes(site))) return;

  if (!document.pictureInPictureEnabled) {
    console.info('[AutoPiP] PiP not supported in this browser.');
    return;
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  setupSpaObserver();

  if (document.hidden) {
    setTimeout(() => {
      const video = findMainVideo();
      if (video) enterPip(video);
    }, CONFIG.spaObserverDelay);
  }
}

init();
