#!/usr/bin/env node
// Run: node generate-icons.js
// Generates extension/icons/*.png — pure Node.js, no dependencies.

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG ENCODER ─────────────────────────────────────────────────────────────

function writePNG(w, h, rgba) {
  const tbl = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    tbl[n] = c;
  }
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = tbl[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function chunk(type, data) {
    const t = Buffer.from(type);
    const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length);
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
    return Buffer.concat([len, t, d, crcBuf]);
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA
  const raw = Buffer.allocUnsafe(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * (1 + w * 4) + 1 + x * 4;
      raw[d] = rgba[s]; raw[d+1] = rgba[s+1]; raw[d+2] = rgba[s+2]; raw[d+3] = rgba[s+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── PIXEL BUFFER ────────────────────────────────────────────────────────────

function createBuffer(w, h) {
  const px = new Uint8ClampedArray(w * h * 4);

  function blend(x, y, r, g, b, a) {
    const xi = Math.round(x), yi = Math.round(y);
    if (xi < 0 || xi >= w || yi < 0 || yi >= h) return;
    const i = (yi * w + xi) * 4;
    const sa = a / 255, da = px[i+3] / 255;
    const oa = sa + da * (1 - sa);
    if (oa < 0.0001) return;
    px[i]   = (r * sa + px[i]   * da * (1-sa)) / oa;
    px[i+1] = (g * sa + px[i+1] * da * (1-sa)) / oa;
    px[i+2] = (b * sa + px[i+2] * da * (1-sa)) / oa;
    px[i+3] = oa * 255;
  }

  // Gradient fill
  function fillGrad(x1, y1, x2, y2, c1, c2, vertical = true) {
    for (let y = Math.max(0, Math.floor(y1)); y < Math.min(h, Math.ceil(y2)); y++) {
      for (let x = Math.max(0, Math.floor(x1)); x < Math.min(w, Math.ceil(x2)); x++) {
        const t = vertical
          ? Math.max(0, Math.min(1, (y - y1) / (y2 - y1)))
          : Math.max(0, Math.min(1, (x - x1) / (x2 - x1)));
        blend(x, y,
          c1[0] + (c2[0]-c1[0]) * t,
          c1[1] + (c2[1]-c1[1]) * t,
          c1[2] + (c2[2]-c1[2]) * t,
          255);
      }
    }
  }

  // Anti-aliased rounded rect
  function fillRR(x1, y1, x2, y2, rad, c, a = 255) {
    const r = Math.min(rad, (x2-x1)/2, (y2-y1)/2);
    const corners = [[x1+r,y1+r],[x2-r,y1+r],[x1+r,y2-r],[x2-r,y2-r]];
    for (let y = Math.max(0, Math.floor(y1-1)); y <= Math.min(h-1, Math.ceil(y2+1)); y++) {
      for (let x = Math.max(0, Math.floor(x1-1)); x <= Math.min(w-1, Math.ceil(x2+1)); x++) {
        const px_ = x + 0.5, py_ = y + 0.5;
        if (px_ < x1 || px_ > x2 || py_ < y1 || py_ > y2) continue;
        let alpha = 1;
        // corner arcs
        if      (px_ < x1+r && py_ < y1+r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x1+r), py_-(y1+r)));
        else if (px_ > x2-r && py_ < y1+r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x2-r), py_-(y1+r)));
        else if (px_ < x1+r && py_ > y2-r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x1+r), py_-(y2-r)));
        else if (px_ > x2-r && py_ > y2-r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x2-r), py_-(y2-r)));
        else alpha = Math.min(1, px_-x1, x2-px_, py_-y1, y2-py_);
        if (alpha > 0) blend(x, y, c[0], c[1], c[2], Math.round(Math.min(1,alpha) * a));
      }
    }
  }

  // Anti-aliased rounded rect with horizontal gradient
  function fillRRGrad(x1, y1, x2, y2, rad, c1, c2) {
    const r = Math.min(rad, (x2-x1)/2, (y2-y1)/2);
    for (let y = Math.max(0, Math.floor(y1-1)); y <= Math.min(h-1, Math.ceil(y2+1)); y++) {
      for (let x = Math.max(0, Math.floor(x1-1)); x <= Math.min(w-1, Math.ceil(x2+1)); x++) {
        const px_ = x + 0.5, py_ = y + 0.5;
        if (px_ < x1 || px_ > x2 || py_ < y1 || py_ > y2) continue;
        let alpha = 1;
        if      (px_ < x1+r && py_ < y1+r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x1+r), py_-(y1+r)));
        else if (px_ > x2-r && py_ < y1+r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x2-r), py_-(y1+r)));
        else if (px_ < x1+r && py_ > y2-r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x1+r), py_-(y2-r)));
        else if (px_ > x2-r && py_ > y2-r) alpha = Math.max(0, r + 0.7 - Math.hypot(px_-(x2-r), py_-(y2-r)));
        else alpha = Math.min(1, px_-x1, x2-px_, py_-y1, y2-py_);
        if (alpha <= 0) continue;
        const t = Math.max(0, Math.min(1, (px_ - x1) / (x2 - x1)));
        blend(x, y,
          c1[0] + (c2[0]-c1[0]) * t,
          c1[1] + (c2[1]-c1[1]) * t,
          c1[2] + (c2[2]-c1[2]) * t,
          Math.round(Math.min(1, alpha) * 255));
      }
    }
  }

  // Filled triangle (play button) pointing right
  function fillTriangle(cx, cy, size_, c) {
    const h_ = size_ * 0.9;
    const w_ = size_;
    for (let y = Math.floor(cy - h_); y <= Math.ceil(cy + h_); y++) {
      const dy = Math.abs(y - cy) / h_;
      if (dy > 1) continue;
      const xEnd = cx + w_ * (1 - dy);
      const xStart = cx - w_ * 0.35;
      for (let x = Math.floor(xStart); x <= Math.ceil(xEnd); x++) {
        const alpha = Math.min(
          Math.min(1, x - xStart + 0.5),
          Math.min(1, xEnd - x + 0.5)
        );
        if (alpha > 0) blend(x, y, c[0], c[1], c[2], Math.round(alpha * 230));
      }
    }
  }

  return { px, fillGrad, fillRR, fillRRGrad, fillTriangle };
}

// ─── ICON DESIGN ─────────────────────────────────────────────────────────────

const C = {
  bg1:    [26,  26,  46 ],
  bg2:    [18,  24,  50 ],
  accent: [79,  110, 247],
  purple: [124, 58,  237],
  white:  [255, 255, 255],
  dimBg1: [32,  32,  44 ],
  dimBg2: [24,  24,  38 ],
  dimAcc: [60,  65,  100],
  dimPip: [55,  55,  90 ],
};

function generateIcon(size, disabled = false) {
  const s = size;
  const { px, fillGrad, fillRR, fillRRGrad, fillTriangle } = createBuffer(s, s);

  const bg1   = disabled ? C.dimBg1 : C.bg1;
  const bg2   = disabled ? C.dimBg2 : C.bg2;
  const acc   = disabled ? C.dimAcc : C.accent;
  const pur   = disabled ? C.dimPip : C.purple;

  // Background gradient (top-dark → bottom-darker-blue)
  fillGrad(0, 0, s, s, bg1, bg2, true);

  // ── Main screen (outer border = accent color, inner = background) ──
  const mPad = s * 0.09;
  const mBW  = Math.max(1.5, s * 0.048);
  const mRad = s * 0.12;

  fillRR(mPad, mPad, s-mPad, s-mPad, mRad, acc);
  // inner bg (slightly smaller)
  fillRRGrad(mPad+mBW, mPad+mBW, s-mPad-mBW, s-mPad-mBW, mRad-mBW, bg2, bg1);

  // ── PiP window (bottom-right, gradient accent→purple) ──
  const pX1 = s * 0.48;
  const pY1 = s * 0.52;
  const pX2 = s * 0.90;
  const pY2 = s * 0.88;
  const pRad = s * 0.06;

  fillRRGrad(pX1, pY1, pX2, pY2, pRad, acc, pur);

  // ── Play triangle inside PiP window (only at ≥ 32px) ──
  if (size >= 32) {
    const cx = (pX1 + pX2) / 2 + s * 0.015;
    const cy = (pY1 + pY2) / 2;
    const ts = (pY2 - pY1) * (size >= 48 ? 0.22 : 0.18);
    fillTriangle(cx, cy, ts, C.white);
  }

  return writePNG(s, s, px);
}

// ─── WRITE FILES ─────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, 'extension', 'icons');

for (const size of [16, 32, 48, 64, 128]) {
  const buf = generateIcon(size, false);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), buf);
  process.stdout.write(`  icon${size}.png\n`);
}

for (const size of [16, 48, 128]) {
  const buf = generateIcon(size, true);
  fs.writeFileSync(path.join(outDir, `icon${size}_disabled.png`), buf);
  process.stdout.write(`  icon${size}_disabled.png\n`);
}

console.log('Done.');
