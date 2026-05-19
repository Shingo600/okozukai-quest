// 依存なしの PNG ジェネレータ。
// public/icon-192.png と icon-512.png を生成する。
// 黄〜オレンジのグラデ風（実際は 2 段のベタ塗り）+ 中央に「¥」を白丸の上に描画。

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public");

// 7x9 ビットマップの「¥」(0=透明, 1=描画)
const YEN_GLYPH = [
  "1.....1",
  ".1...1.",
  "..1.1..",
  "...1...",
  ".11111.",
  "...1...",
  ".11111.",
  "...1...",
  "...1...",
];

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}

function makePixelData(size) {
  // RGBA バッファ
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const cornerR = size * 0.22;
  const circleR = size * 0.34;
  const top = hexToRgb("#FFE38A");
  const bottom = hexToRgb("#FFB99A");
  const white = [255, 255, 255];
  const yen = hexToRgb("#E08A3C");

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // 角丸判定
      const dxLeft = x;
      const dxRight = size - 1 - x;
      const dyTop = y;
      const dyBottom = size - 1 - y;
      const nx = Math.min(dxLeft, dxRight);
      const ny = Math.min(dyTop, dyBottom);
      let inRect = true;
      if (nx < cornerR && ny < cornerR) {
        const ddx = cornerR - nx;
        const ddy = cornerR - ny;
        if (ddx * ddx + ddy * ddy > cornerR * cornerR) inRect = false;
      }
      if (!inRect) { buf[i + 3] = 0; continue; }

      // 縦グラデ
      const t = y / size;
      const r = Math.round(top[0] * (1 - t) + bottom[0] * t);
      const g = Math.round(top[1] * (1 - t) + bottom[1] * t);
      const b = Math.round(top[2] * (1 - t) + bottom[2] * t);

      // 中央の白丸
      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;
      const inCircle = distSq <= circleR * circleR;

      let [pr, pg, pb] = [r, g, b];
      if (inCircle) [pr, pg, pb] = white;

      buf[i] = pr; buf[i + 1] = pg; buf[i + 2] = pb; buf[i + 3] = 255;
    }
  }

  // 中央に「¥」を描画
  const glyphH = YEN_GLYPH.length;
  const glyphW = YEN_GLYPH[0].length;
  const cellSize = Math.floor((size * 0.34) / glyphH); // glyph 全体が円の高さ程度
  const totalW = cellSize * glyphW;
  const totalH = cellSize * glyphH;
  const startX = Math.round(center - totalW / 2);
  const startY = Math.round(center - totalH / 2);
  for (let gy = 0; gy < glyphH; gy++) {
    for (let gx = 0; gx < glyphW; gx++) {
      if (YEN_GLYPH[gy][gx] !== "1") continue;
      for (let py = 0; py < cellSize; py++) {
        for (let px = 0; px < cellSize; px++) {
          const x = startX + gx * cellSize + px;
          const y = startY + gy * cellSize + py;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          const i = (y * size + x) * 4;
          buf[i] = yen[0]; buf[i + 1] = yen[1]; buf[i + 2] = yen[2]; buf[i + 3] = 255;
        }
      }
    }
  }

  return buf;
}

// CRC32 テーブル
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, pixelRGBA) {
  // IDAT: 各行頭にフィルタバイト 0
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0;
    pixelRGBA.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(raw);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.concat([
    u32be(size), u32be(size),
    Buffer.from([8, 6, 0, 0, 0]), // bit depth 8, color type 6 (RGBA), compression, filter, interlace
  ]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const px = makePixelData(size);
  const png = encodePNG(size, px);
  const out = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(out, png);
  console.log(`generated ${out} (${png.length} bytes)`);
}
