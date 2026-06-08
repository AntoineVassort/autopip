# AutoPiP — Universal Picture-in-Picture

> Automatic PiP when you switch tabs. Free, open-source, zero tracking.

## Features

- **Smart video detection** — picks the largest playing video, ignores muted ads
- **SPA support** — works on YouTube, Twitch, Vimeo without page reloads
- **Universal** — any site with `<video>` HTML5 element
- **Privacy-first** — no data collection, no network calls, fully local
- **Free forever** — MIT license, open-source

## Install

### Userscript (quickest)
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. [Click here to install AutoPiP](https://raw.githubusercontent.com/AntoineVassort/autopip/master/userscript/autopip.user.js)

### Browser Extension
- **Chrome / Edge / Brave / Opera**: [Chrome Web Store](#) *(coming soon)*
- **Firefox**: [Mozilla Add-ons](#) *(coming soon)*

**Manual install (dev)**:
1. Clone this repo
2. Go to `chrome://extensions/` → Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder

## Tested sites

| Site | Status |
|------|--------|
| YouTube | ✅ |
| Vimeo | ✅ |
| Twitch | ✅ |
| Netflix | ⚠️ DRM blocks PiP (browser limitation) |
| Disney+ | ⚠️ DRM blocks PiP |
| Udemy | ✅ |
| Generic HTML5 | ✅ |

## Browser support

| Browser | Userscript | Extension |
|---------|-----------|-----------|
| Chrome 92+ | ✅ | ✅ MV3 |
| Edge 92+ | ✅ | ✅ MV3 |
| Firefox 140+ | ✅ | ✅ MV3 |
| Brave | ✅ | ✅ MV3 |
| Opera | ✅ | ✅ MV3 |
| Safari | ❌ | ❌ |

## Privacy Policy

AutoPiP collects no data whatsoever. All processing happens locally in your browser. No network requests are made, no analytics, no tracking.

## Contributing

PRs welcome! Please open an issue first for major changes.

## License

MIT — see [LICENSE](LICENSE)
