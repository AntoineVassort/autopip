/**
 * AutoPiP — Shared core logic (documented reference)
 *
 * This file documents the shared PiP logic used by both the userscript
 * and the extension. It is NOT loaded at runtime — each target includes
 * its own copy adapted to its environment (GM_* vs chrome.storage).
 */

/**
 * findMainVideo(videos, minArea)
 *
 * Selects the "main" video from a NodeList/Array using these criteria:
 *  1. readyState >= 2 (HAVE_CURRENT_DATA)
 *  2. Not ended
 *  3. Not (muted AND autoplay) — likely an ad
 *  4. Visible area >= minArea px²
 *  5. Prefer playing (not paused) over paused
 *  6. Among equals, pick largest by bounding-box area
 */

/**
 * enterPip(video)
 *
 * Calls video.requestPictureInPicture().
 * Error handling:
 *  - NotAllowedError  → site blocks PiP (DRM etc.) — silent
 *  - InvalidStateError → video not ready yet — retry after 500ms
 *  - Other           → console.warn
 */

/**
 * exitPip()
 *
 * Calls document.exitPictureInPicture() if a PiP element is active.
 * Always resets pipActive + currentVideo state.
 */

/**
 * onVisibilityChange()
 *
 * Listens to document visibilitychange:
 *  - hidden  → debounced enterPip(findMainVideo())
 *  - visible → exitPip()
 */

/**
 * MutationObserver (SPA support)
 *
 * Watches document.body for DOM mutations (childList + subtree).
 * When PiP is active and the main video changes, exits current PiP
 * and re-enters on the new video if the tab is still hidden.
 * This handles navigation on YouTube, Twitch, etc.
 */

/**
 * Config schema (synced via GM_setValue / chrome.storage.sync):
 * {
 *   enabled: boolean       — master on/off switch
 *   excludedSites: string[] — hostnames to ignore
 *   minVideoArea: number   — px² threshold (default 40000 = 200×200)
 *   debounceDelay: number  — ms before activating PiP (default 300)
 * }
 */
