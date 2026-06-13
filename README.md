# AutoPiP — Universal Picture-in-Picture

> Automatic PiP when you switch tabs. Free, open-source, zero tracking.

## Features

- **Auto-activation** — enters PiP the moment you leave a tab with a playing video, exits when you return
- **Keyboard shortcut** — press `Alt+P` at any time to toggle PiP (customizable in browser settings)
- **Mute tab in PiP** — optionally silence the tab while PiP is open, audio restored on exit
- **Whitelist / Blacklist** — restrict AutoPiP to specific sites only, or exclude domains you choose
- **Smart video detection** — picks the largest playing video, ignores muted autoplay ads
- **SPA support** — works on YouTube, Twitch, Vimeo without page reloads
- **Adjustable delay** — configure how quickly PiP activates after switching tabs
- **Minimum video size** — ignore small embedded videos
- **Privacy-first** — no data collection, no network calls, fully local
- **Free forever** — MIT license, open-source

## Install

### Browser Extension
- **Firefox**: [Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/autopip/)
- **Chrome / Edge / Brave / Opera**: [Chrome Web Store](#) *(coming soon)*

**Manual install (dev)**:
1. Clone this repo
2. Go to `chrome://extensions/` → Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder

### Userscript
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. [Click here to install AutoPiP](https://raw.githubusercontent.com/AntoineVassort/autopip/master/userscript/autopip.user.js)

## Keyboard shortcut

The default shortcut is `Alt+P`. To change it:
- **Firefox**: `about:addons` → gear icon → Manage Extension Shortcuts
- **Chrome / Edge**: `chrome://extensions/shortcuts`

## Popup settings

| Setting | Description |
|---------|-------------|
| Enable AutoPiP | Master on/off toggle |
| Mute tab in PiP | Silences the tab while PiP is open |
| Blacklist / Whitelist | Switch between excluding sites or allowing only specific sites |
| Activation delay | How long to wait before triggering PiP (0–2000 ms) |
| Min. video size | Minimum video dimensions to consider (ignores small embeds) |
| Enter PiP manually | Force PiP with a button click (useful for Brave or strict-mode browsers) |

## Tested sites

| Site | Status |
|------|--------|
| YouTube | ✅ |
| Vimeo | ✅ |
| Twitch | ✅ |
| Udemy | ✅ |
| Generic HTML5 | ✅ |
| Netflix | ⚠️ DRM blocks PiP (browser limitation) |
| Disney+ | ⚠️ DRM blocks PiP |

## Browser support

| Browser | Userscript | Extension |
|---------|-----------|-----------|
| Chrome 92+ | ✅ | ✅ MV3 |
| Edge 92+ | ✅ | ✅ MV3 |
| Firefox 142+ | ✅ | ✅ MV3 |
| Brave | ✅ | ✅ MV3 |
| Opera | ✅ | ✅ MV3 |
| Safari | ❌ | ❌ |

## Privacy

AutoPiP collects zero data. No analytics, no network requests, no tracking. Everything runs locally in your browser.

## Contributing

PRs welcome! Please open an issue first for major changes.

## License

MIT — see [LICENSE](LICENSE)
