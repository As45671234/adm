const fs = require("fs");
const path = require("path");

let sharpLib = null;
try {
  sharpLib = require("sharp");
} catch (e) {
  sharpLib = null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeFileName(baseSlug, ext = "webp") {
  const clean = String(baseSlug || "image").trim() || "image";
  const safeBase = clean.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "image";
  return `${safeBase}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
}

async function saveOptimizedProductImage({
  buffer,
  imagesDir,
  baseSlug,
  maxWidth = 1920,
  quality = 82,
}) {
  if (!buffer || !Buffer.isBuffer(buffer) || !imagesDir) return "";

  ensureDir(imagesDir);

  if (sharpLib) {
    try {
      const out = await sharpLib(buffer)
        .rotate()
        .resize({
          width: maxWidth,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({ quality, effort: 4 })
        .toBuffer();

      const fileName = makeFileName(baseSlug, "webp");
      fs.writeFileSync(path.join(imagesDir, fileName), out);
      return `/uploads/products/${fileName}`;
    } catch (e) {
      // fallback below
    }
  }

  const fileName = makeFileName(baseSlug, "jpg");
  fs.writeFileSync(path.join(imagesDir, fileName), buffer);
  return `/uploads/products/${fileName}`;
}

module.exports = {
  saveOptimizedProductImage,
};
