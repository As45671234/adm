
const XLSX = require("xlsx");

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { saveOptimizedProductImage } = require("../lib/imageOptimize");


async function extractImagesFromZip(buffer, imagesDir) {
  // Fallback: extract all xl/media/* images in order.
  // Returns array of saved URL paths.
  const out = [];
  let JSZip;
  try { JSZip = require("jszip"); } catch (e) { return out; }

  if (!imagesDir) return out;
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  let zip;
  try { zip = await JSZip.loadAsync(buffer); } catch (e) { return out; }

  const media = Object.keys(zip.files)
    .filter((p) => /^xl\/media\//i.test(p) && /\.(png|jpe?g|webp|gif|bmp)$/i.test(p))
    .sort();

  for (const p of media) {
    try {
      const buf = await zip.file(p).async("nodebuffer");
      const imageUrl = await saveOptimizedProductImage({
        buffer: buf,
        imagesDir,
        baseSlug: crypto.randomBytes(8).toString("hex"),
        maxWidth: 1920,
        quality: 80,
      });
      if (imageUrl) out.push(imageUrl);
    } catch (e) {
      // ignore
    }
  }

  return out;
}

function pickText(xml, tag) {
  const reTag = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = String(xml || "").match(reTag);
  return m ? m[1] : "";
}

function getAttr(s, attr) {
  const reAttr = new RegExp(`${attr}="([^"]+)"`, "i");
  const m = String(s || "").match(reAttr);
  return m ? m[1] : "";
}

function parseIntSafe(v) {
  const n = parseInt(String(v || "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

async function extractImagesXlsx(buffer) {
  // Returns map:
  //  - `${sheetName}|${row}` -> [{ buf, ext }, ...]
  //  - `${sheetName}|${row}|${col}` -> [{ buf, ext }, ...]
  const map = new Map();
  let JSZip;
  try { JSZip = require("jszip"); } catch (e) { return map; }

  let zip;
  try { zip = await JSZip.loadAsync(buffer); } catch (e) { return map; }

  // workbook: map sheet rid -> { name, sheetPath }
  const workbookXml = zip.file("xl/workbook.xml") ? await zip.file("xl/workbook.xml").async("string") : "";
  const wbRelsXml = zip.file("xl/_rels/workbook.xml.rels") ? await zip.file("xl/_rels/workbook.xml.rels").async("string") : "";

  const wbRelMap = {};
  const relRe = /<Relationship\b[^>]*>/gi;
  let rm;
  while ((rm = relRe.exec(wbRelsXml))) {
    const tag = rm[0];
    const id = getAttr(tag, "Id");
    const target = getAttr(tag, "Target");
    if (id && target) wbRelMap[id] = target.replace(/^\/+/, "");
  }

  const sheetRe = /<sheet\b[^>]*>/gi;
  let sm;
  const sheets = [];
  while ((sm = sheetRe.exec(workbookXml))) {
    const tag = sm[0];
    const name = getAttr(tag, "name") || "Sheet";
    const rid = getAttr(tag, "r:id") || getAttr(tag, "id");
    if (!rid) continue;
    const target = wbRelMap[rid];
    if (!target) continue;
    const sheetPath = target.startsWith("xl/") ? target : "xl/" + target;
    sheets.push({ name: String(name).trim() || "Sheet", sheetPath });
  }

  // drawing rels cache
  const drawingRelsCache = new Map();

  function pushImageToMap(key, value) {
    const cur = map.get(key);
    if (Array.isArray(cur)) {
      cur.push(value);
      map.set(key, cur);
    } else if (cur) {
      map.set(key, [cur, value]);
    } else {
      map.set(key, [value]);
    }
  }

  async function getDrawingRelMap(drawingPath) {
    if (drawingRelsCache.has(drawingPath)) return drawingRelsCache.get(drawingPath);

    // xl/drawings/drawing1.xml -> xl/drawings/_rels/drawing1.xml.rels
    const base = drawingPath.split("/").pop() || "";
    const relsPath = "xl/drawings/_rels/" + base + ".rels";
    const xml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    const map2 = {};
    let m2;
    relRe.lastIndex = 0;
    while ((m2 = relRe.exec(xml))) {
      const tag = m2[0];
      const id = getAttr(tag, "Id");
      const target = getAttr(tag, "Target");
      if (id && target) map2[id] = target;
    }
    drawingRelsCache.set(drawingPath, map2);
    return map2;
  }

  async function getSheetDrawingPath(sheetPath) {
    const sheetXml = zip.file(sheetPath) ? await zip.file(sheetPath).async("string") : "";
    if (!sheetXml) return null;

    // Find <drawing r:id="rIdX"/>
    const dTag = sheetXml.match(/<drawing\b[^>]*\/>/i) || sheetXml.match(/<drawing\b[^>]*>[\s\S]*?<\/drawing>/i);
    if (!dTag) return null;
    const rid = getAttr(dTag[0], "r:id");
    if (!rid) return null;

    // sheet rels: xl/worksheets/sheet1.xml -> xl/worksheets/_rels/sheet1.xml.rels
    const base = sheetPath.split("/").pop() || "";
    const relsPath = "xl/worksheets/_rels/" + base + ".rels";
    const relXml = zip.file(relsPath) ? await zip.file(relsPath).async("string") : "";
    if (!relXml) return null;

    let m3;
    relRe.lastIndex = 0;
    while ((m3 = relRe.exec(relXml))) {
      const tag = m3[0];
      const id = getAttr(tag, "Id");
      const target = getAttr(tag, "Target");
      if (id === rid && target) {
        // targets like "../drawings/drawing1.xml"
        const clean = target.replace(/^\/+/, "");
        const full = clean.startsWith("xl/") ? clean : "xl/worksheets/" + clean;
        // normalize ../
        const parts = full.split("/");
        const norm = [];
        for (const p of parts) {
          if (p === "..") norm.pop();
          else if (p === ".") continue;
          else norm.push(p);
        }
        return norm.join("/");
      }
    }
    return null;
  }

  async function parseDrawing(sheetName, drawingPath) {
    const drawingXml = zip.file(drawingPath) ? await zip.file(drawingPath).async("string") : "";
    if (!drawingXml) return;

    const dRelMap = await getDrawingRelMap(drawingPath);

    const anchorRe = /<xdr:(twoCellAnchor|oneCellAnchor)\b[\s\S]*?<\/xdr:\1>/gi;
    let am;
    while ((am = anchorRe.exec(drawingXml))) {
      const block = am[0];

      const fromXml = pickText(block, "xdr:from");
      const toXml = pickText(block, "xdr:to");
      const fromRow = parseIntSafe(pickText(fromXml, "xdr:row"));
      const fromCol = parseIntSafe(pickText(fromXml, "xdr:col"));
      const toRow = parseIntSafe(pickText(toXml, "xdr:row"));

      if (fromRow === null) continue;

      const rowZero = (toRow !== null) ? Math.round((fromRow + toRow) / 2) : fromRow;
      const row1 = rowZero + 1;
      const col1 = (fromCol !== null) ? (fromCol + 1) : null;

      // a:blip r:embed="rIdX"
      const blip = block.match(/<a:blip\b[^>]*>/i);
      const embed = blip ? (getAttr(blip[0], "r:embed") || getAttr(blip[0], "embed")) : "";
      if (!embed) continue;

      const target = dRelMap[embed];
      if (!target) continue;

      // Target is like "../media/image1.png"
      let mediaPath = target.replace(/^\/+/, "");
      if (!mediaPath.startsWith("xl/")) {
        // drawing is in xl/drawings, so ../media => xl/media
        const parts = ("xl/drawings/" + mediaPath).split("/");
        const norm = [];
        for (const p of parts) {
          if (p === "..") norm.pop();
          else if (p === ".") continue;
          else norm.push(p);
        }
        mediaPath = norm.join("/");
      }

      const f = zip.file(mediaPath);
      if (!f) continue;

      const ext = (mediaPath.split(".").pop() || "png").toLowerCase();
      const safeExt = ["png","jpg","jpeg","webp","gif","bmp"].includes(ext) ? ext : "png";
      const buf = await f.async("nodebuffer");
      if (!buf || !buf.length) continue;

      const obj = { buf, ext: safeExt };

      const rowKey = `${sheetName}|${row1}`;
      pushImageToMap(rowKey, obj);

      if (col1 !== null) {
        const cellKey = `${sheetName}|${row1}|${col1}`;
        pushImageToMap(cellKey, obj);
      }
    }
  }

  async function parseRichDataCellImages() {
    const metadataFile = zip.file("xl/metadata.xml");
    const rvRelFile = zip.file("xl/richData/richValueRel.xml");
    const rvDataFile = zip.file("xl/richData/rdrichvalue.xml");
    const rvRelRelsFile = zip.file("xl/richData/_rels/richValueRel.xml.rels");
    if (!metadataFile || !rvRelFile || !rvDataFile || !rvRelRelsFile) return;

    const [metadataXml, rvRelXml, rvDataXml, rvRelRelsXml] = await Promise.all([
      metadataFile.async("string"),
      rvRelFile.async("string"),
      rvDataFile.async("string"),
      rvRelRelsFile.async("string"),
    ]);

    const relIdByLocalImageIdx = [];
    const relTagRe = /<rel\b[^>]*>/gi;
    let rtm;
    while ((rtm = relTagRe.exec(rvRelXml))) {
      const rid = getAttr(rtm[0], "r:id") || getAttr(rtm[0], "id");
      if (rid) relIdByLocalImageIdx.push(rid);
    }

    const targetByRid = {};
    const relRe = /<Relationship\b[^>]*>/gi;
    let rm;
    while ((rm = relRe.exec(rvRelRelsXml))) {
      const tag = rm[0];
      const id = getAttr(tag, "Id");
      const target = getAttr(tag, "Target");
      if (id && target) targetByRid[id] = target;
    }

    // rv index -> local image identifier (0-based index into richValueRel rel list)
    const localImageIdxByRvIdx = [];
    const rvRe = /<rv\b[^>]*>[\s\S]*?<\/rv>/gi;
    let rvm;
    while ((rvm = rvRe.exec(rvDataXml))) {
      const block = rvm[0];
      const vMatch = block.match(/<v>([^<]+)<\/v>/i);
      const idx = parseInt(String(vMatch ? vMatch[1] : ""), 10);
      localImageIdxByRvIdx.push(Number.isFinite(idx) ? idx : -1);
    }

    // future metadata index -> rv index
    const rvIdxByFutureIdx = [];
    const futureBlock = metadataXml.match(/<futureMetadata\b[^>]*name="XLRICHVALUE"[^>]*>[\s\S]*?<\/futureMetadata>/i);
    if (futureBlock) {
      const bkRe = /<bk\b[^>]*>[\s\S]*?<\/bk>/gi;
      let bkm;
      while ((bkm = bkRe.exec(futureBlock[0]))) {
        const rvbTag = bkm[0].match(/<xlrd:rvb\b[^>]*>/i);
        const i = rvbTag ? parseInt(getAttr(rvbTag[0], "i"), 10) : -1;
        rvIdxByFutureIdx.push(Number.isFinite(i) ? i : -1);
      }
    }

    // vm (1-based) -> future metadata index
    const futureIdxByVm = [];
    const valueMetaBlock = metadataXml.match(/<valueMetadata\b[^>]*>[\s\S]*?<\/valueMetadata>/i);
    if (valueMetaBlock) {
      const bkRe = /<bk\b[^>]*>[\s\S]*?<\/bk>/gi;
      let bkm;
      while ((bkm = bkRe.exec(valueMetaBlock[0]))) {
        const rcTag = bkm[0].match(/<rc\b[^>]*>/i);
        const v = rcTag ? parseInt(getAttr(rcTag[0], "v"), 10) : -1;
        futureIdxByVm.push(Number.isFinite(v) ? v : -1);
      }
    }

    function cellRefToRowCol(ref) {
      const m = String(ref || "").match(/^([A-Z]+)(\d+)$/i);
      if (!m) return null;
      const letters = m[1].toUpperCase();
      const row = parseInt(m[2], 10);
      let col = 0;
      for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64);
      return Number.isFinite(row) && Number.isFinite(col) ? { row, col } : null;
    }

    for (const sh of sheets) {
      const sheetXml = zip.file(sh.sheetPath) ? await zip.file(sh.sheetPath).async("string") : "";
      if (!sheetXml) continue;

      const cellRe = /<c\b[^>]*r="([A-Z]+\d+)"[^>]*vm="(\d+)"[^>]*>/gi;
      let cm;
      while ((cm = cellRe.exec(sheetXml))) {
        const cellRef = cm[1];
        const vm = parseInt(cm[2], 10);
        if (!Number.isFinite(vm) || vm <= 0) continue;

        const futureIdx = futureIdxByVm[vm - 1];
        const rvIdx = Number.isFinite(futureIdx) ? rvIdxByFutureIdx[futureIdx] : -1;
        const localImageIdx = Number.isFinite(rvIdx) ? localImageIdxByRvIdx[rvIdx] : -1;
        if (!Number.isFinite(localImageIdx) || localImageIdx < 0) continue;

        const rid = relIdByLocalImageIdx[localImageIdx];
        const target = targetByRid[rid];
        if (!rid || !target) continue;

        // richData rel target is like ../media/imageX.png
        const parts = ("xl/richData/" + target).split("/");
        const norm = [];
        for (const p of parts) {
          if (p === "..") norm.pop();
          else if (p !== ".") norm.push(p);
        }
        const mediaPath = norm.join("/");
        const f = zip.file(mediaPath);
        if (!f) continue;

        const ext = (mediaPath.split(".").pop() || "png").toLowerCase();
        const safeExt = ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext) ? ext : "png";
        const buf = await f.async("nodebuffer");
        if (!buf || !buf.length) continue;

        const rc = cellRefToRowCol(cellRef);
        if (!rc) continue;

        const obj = { buf, ext: safeExt };
        pushImageToMap(`${sh.name}|${rc.row}`, obj);
        pushImageToMap(`${sh.name}|${rc.row}|${rc.col}`, obj);
      }
    }
  }

  for (const sh of sheets) {
    const drawingPath = await getSheetDrawingPath(sh.sheetPath);
    if (!drawingPath) continue;
    await parseDrawing(sh.name, drawingPath);
  }

  // Excel modern in-cell images (IMAGE / rich data) are stored in richData parts, not drawings.
  await parseRichDataCellImages();

  return map;
}
const { slugify, parseNumber, isRowEmpty, rowNonEmptyCount } = require("../utils");

const KNOWN_CATEGORIES = [
  "Утеплитель",
  "Protan",
  "Plastfoil",
  "Пеноплэкс",
  "ВОРОНКИ",
  "Аэраторы",
  "Комплектующие",
  "Металл",
  "Трапы",
  "Садовый"
].map((x) => x.toLowerCase());

const PENOPLEX_GROUP_WORDS = [
  "основа",
  "фасад",
  "гео",
  "гео с",
  "кровля",
  "тип 45",
  "тип45"
];

function normalizeHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isRichImageErrorCell(ws, row1, col0) {
  if (!ws || !Number.isFinite(row1) || !Number.isFinite(col0) || col0 < 0) return false;
  const addr = XLSX.utils.encode_cell({ r: row1 - 1, c: col0 });
  const cell = ws[addr];
  if (!cell) return false;
  const text = String(cell.w || cell.v || "").trim().toUpperCase();
  return cell.t === "e" && text.includes("#VALUE");
}

// Parse "Ключ: Значение; Ключ2: Значение2;" into { ключ: "Значение", ... }
function parseCharacteristics(str) {
  const out = {};
  const s = String(str || "").trim();
  if (!s) return out;
  const parts = s.split(/;/);
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key || !value) continue;
    const safeKey = key
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-zа-яё0-9_]/gi, "")
      .replace(/^_+|_+$/g, "");
    if (safeKey) out[safeKey] = value;
  }
  return out;
}

function parsePricingMode(value, unitHint) {
  const raw = String(value || "").trim().toLowerCase();
  const unit = String(unitHint || "").trim().toLowerCase();

  if (!raw) {
    if (unit.includes("м3") || unit.includes("м³")) return "m3";
    if (unit.includes("м2") || unit.includes("м²")) return "m2";
    return "piece";
  }

  if (raw === "1" || raw === "шт" || raw === "piece" || raw === "pcs") return "piece";
  if (raw === "2" || raw === "м2" || raw === "м²" || raw === "m2") return "m2";
  if (raw === "3" || raw === "м3" || raw === "м³" || raw === "m3") return "m3";

  if (raw.includes("шт") || raw.includes("piece") || raw.includes("pcs")) return "piece";
  if (raw.includes("м2") || raw.includes("м²") || raw.includes("m2")) return "m2";
  if (raw.includes("м3") || raw.includes("м³") || raw.includes("m3")) return "m3";

  // Some malformed template rows may contain excel serial/date-like numbers
  if (/^\d{5,}$/.test(raw)) {
    if (unit.includes("м3") || unit.includes("м³")) return "m3";
    if (unit.includes("м2") || unit.includes("м²")) return "m2";
    return "piece";
  }

  return "piece";
}

function unitFromMode(mode, unitValue) {
  const u = String(unitValue || "").trim();
  if (u) return u;
  if (mode === "m2") return "м2";
  if (mode === "m3") return "м3";
  return "шт";
}

function looksLikeTemplateMetaRow(row, headerMap) {
  const sku = headerMap.sku !== undefined ? String(row[headerMap.sku] || "").trim().toLowerCase() : "";
  const name = headerMap.name !== undefined ? String(row[headerMap.name] || "").trim().toLowerCase() : "";
  const price = headerMap.price_any !== undefined ? String(row[headerMap.price_any] || "").trim().toLowerCase() : "";
  const unit = headerMap.unit !== undefined ? String(row[headerMap.unit] || "").trim().toLowerCase() : "";

  // new ADM template row 1: SKU="ID", name="Текст"
  if (sku === "id" && (name === "text" || name === "name" || name === "текст")) return true;
  if (price === "number" && (unit === "unit" || unit === "step" || unit === "text")) return true;
  // meta row where all non-empty cells are type hints (в ячейку, число, текст, html/текст)
  const metaHints = ["в ячейку", "число", "текст", "html/текст", "ключ:значение", "шт / компл"];
  if (sku === "id" && metaHints.some((h) => name.includes(h) || sku.includes(h))) return true;

  return false;
}

function buildHeaderMap(headerRow) {
  const map = {};
  for (let i = 0; i < headerRow.length; i++) {
    const h = normalizeHeader(headerRow[i]);
    if (!h) continue;

    if (h === "sku" || h.includes("sku") || h.includes("артикул")) map.sku = i;
    if (h === "название" || h === "наименование" || h.includes("наименование материала")) map.name = i;
    if (h === "категория" || h.includes("категория")) map.category = i;
    if (h === "подкатегория" || h.includes("подкатег")) map.subcategory = i;
    if (h === "режим цены" || h.includes("режим цен")) map.pricing_mode = i;
    if (h === "цена" || h.includes("цена")) map.price_any = map.price_any || i;
    if (h === "ед. изм." || h === "ед изм" || h === "ед изм." || h.includes("ед.")) map.unit = i;
    if (h === "шаг" || h.includes("шаг")) map.step = i;
    if (h === "главное фото" || h === "фото 1" || h.includes("главное фото")) map.image = i;
    if (h === "фото 2") map.image2 = i;
    if (h === "фото 3") map.image3 = i;

    if (h.includes("артикул")) map.sku = i;
    if (h === "наименование" || h.includes("наименование материала") || h.includes("наименование")) map.name = i;
    if (h.includes("описание")) map.description = i;

    if (h.includes("толщина")) map.thickness = i;
    if (h.includes("размер")) map.size = i;

    if (h.includes("площадь") && h.includes("пачке")) map.pack_area = i;
    if (h.includes("объем") && h.includes("пачке")) map.pack_volume = i;
    if (h.includes("площадь") && h.includes("рулоне")) map.roll_area = i;

    // some sheets use short units columns for penoplex
    if (h === "м2" || h === "m2") map.pack_area = map.pack_area !== undefined ? map.pack_area : i;
    if (h === "м3" || h === "m3") map.pack_volume = map.pack_volume !== undefined ? map.pack_volume : i;

    // "Количество в упаковке"
    if (h.includes("количество") && h.includes("упаков")) map.pack_qty = i;

    if (h.includes("кратность")) map.pack_qty = i;
    if (h.includes("маркировка")) map.marking = i;
    if (h.includes("изображение")) map.image = i;

    // prices
    if (h === "цена" || h.includes("цена ")) map.price_any = map.price_any || i;
    if (h.includes("закупоч")) map.purchase = i;
    if (h.includes("рекоменд")) map.recommended = i;
    if (h.includes("цена розниц")) map.retail = i;
    if (h.includes("цена для клиент")) map.client = i;
    if (h.includes("интернет-магаз")) map.online = i;
    if (h.includes("от 5")) map.wholesale_5m = i;
    if (h.includes("от 1")) map.wholesale_1m = i;

    // New ADM template columns
    if (h === "характеристики" || h.includes("характеристик")) map.characteristics = i;
    if ((h.includes("длина") && h.includes("мм")) || h === "длина") map.length_mm = i;
    if ((h.includes("ширина") && h.includes("мм")) || h === "ширина") map.width_mm = i;
    if ((h.includes("высота") && h.includes("мм")) || h === "высота") map.height_mm = i;

    // Also map "название" as a name column (new template uses this, not "наименование")
    if (h === "название" || h.includes("название")) map.name = map.name !== undefined ? map.name : i;
  }
  return map;
}

function looksLikeHeaderRow(row) {
  const joined = row.map((c) => normalizeHeader(c)).join(" | ");
  return (
    joined.includes("sku") ||
    joined.includes("режим цены") ||
    joined.includes("главное фото") ||
    joined.includes("наименование") ||
    joined.includes("артикул") ||
    joined.includes("цена") ||
    (joined.includes("толщина") && joined.includes("упаков"))
  );
}

function looksLikeCategoryTitle(title, currentCategoryTitle) {
  const t = String(title || "").trim();
  if (!t) return false;
  const low = t.toLowerCase();

  // If we are already inside a known top-level category (sheet tabs),
  // do NOT replace it with long descriptive titles. Treat those as groups instead.
  const cur = String(currentCategoryTitle || "").trim();
  if (cur && KNOWN_CATEGORIES.includes(cur.toLowerCase())) {
    const picked = pickCategoryFromTitle(t);
    if (!picked) return false;
  }

  // Don't treat penoplex sub-groups as categories
  if (String(currentCategoryTitle || "").toLowerCase().includes("пеноп")) {
    const isPenoplexGroup = PENOPLEX_GROUP_WORDS.some((w) => low === w || low.startsWith(w + " "));
    if (isPenoplexGroup) return false;
  }

  if (pickCategoryFromTitle(t)) return true;

  // big titles in caps are usually category blocks
  const letters = t.replace(/[^\p{L}]+/gu, "");
  if (letters.length >= 4 && t === t.toUpperCase() && t.includes(" ")) return true;

  // known block keywords
  if (/(воронк|аэратор|дефлектор|крепеж|саморез|опор|инвентар)/i.test(t)) return true;

  return false;
}

function pickCategoryFromTitle(title) {
  const t = String(title || "").trim();
  const low = t.toLowerCase();
  const isKnown = KNOWN_CATEGORIES.some((c) => low === c);
  if (isKnown) return t;

  // If starts with known category
  const found = KNOWN_CATEGORIES.find((c) => low.includes(c));
  return found ? t : null;
}

async function workbookToProducts({ buffer, filename, imagesDir, categoryId, categoryTitle }) {
  // When a categoryId is passed from the import request, it overrides whatever is in the file.
  const overrideCategoryId = categoryId ? String(categoryId).trim() : null;
  const overrideCategoryTitle = categoryTitle ? String(categoryTitle).trim() : null;

  const wb = XLSX.read(buffer, { type: "buffer" });
  const products = [];

  const isXlsx = filename && String(filename).toLowerCase().endsWith(".xlsx");
  let imagesByRow = new Map();
  let imagesQueue = [];
  let queueIdx = 0;

  if (isXlsx) {
    try {
      imagesByRow = await extractImagesXlsx(buffer);
    } catch (e) {
      imagesByRow = new Map();
    }

    // If we couldn't map images to rows (or exceljs was heavy), fall back to extracting all media files.
    if (!imagesByRow || imagesByRow.size === 0) {
      try {
        imagesQueue = await extractImagesFromZip(buffer, imagesDir);
      } catch (e) {
        imagesQueue = [];
      }
    }
  }


  const normalizeImageValue = (val) => {
    const s = String(val || "").trim();
    if (!s) return "";
    const low = s.toLowerCase();
    const isUrl = /^https?:\/\//i.test(s);
    const hasExt = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(low);
    if (isUrl) return s;
    if (s.startsWith("/uploads/") || s.startsWith("uploads/")) {
      return s.startsWith("/") ? s : `/${s}`;
    }
    if (hasExt) {
      if (s.includes("/") || s.includes("\\")) return s.replace(/\\/g, "/");
      return `/uploads/products/${s}`;
    }
    return "";
  };


  for (const sheetName of wb.SheetNames) {
    const sn = String(sheetName || "").trim();
    if (!sn) continue;
    if (/^диаграм/i.test(sn) || /^chart/i.test(sn) || /^diagram/i.test(sn)) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });

    let currentCategoryTitle = String(sheetName || "Каталог").trim();
    let currentGroup = "";
    let headerMap = null;
    let rowMode = "normal";

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (isRowEmpty(row)) continue;

      const nonEmpty = rowNonEmptyCount(row);

      // category/group title row (single cell)
      if (nonEmpty === 1) {
        const title = String(row.find((c) => String(c || "").trim()) || "").trim();
        if (looksLikeCategoryTitle(title, currentCategoryTitle)) {
          currentCategoryTitle = title;
          currentGroup = "";
          headerMap = null;
          rowMode = "normal";
          continue;
        }

        currentGroup = title;
        // If group row explicitly mentions a catalog brand/group, reset mode
        rowMode = "normal";
        continue;
      }

      if (looksLikeHeaderRow(row)) {
        headerMap = buildHeaderMap(row);

        // Special case: Penoplex sheets often don't have a "name" column.
        // They have thickness and other numeric columns.
        const isPenoplex = String(currentCategoryTitle || "").toLowerCase().includes("пеноп");
        if (!headerMap.name && isPenoplex && headerMap.thickness !== undefined) {
          headerMap.name = headerMap.thickness;
          rowMode = "penoplex";
        } else {
          rowMode = "normal";
        }
        continue;
      }

      if (!headerMap || headerMap.name === undefined) continue;

      if (looksLikeTemplateMetaRow(row, headerMap)) continue;

      let name = String(row[headerMap.name] || "").trim();
      if (!name) continue;

      if (rowMode === "penoplex") {
        const thicknessText = name;
        const t = /мм/i.test(thicknessText) ? thicknessText : `${thicknessText} мм`;
        name = `${currentGroup ? currentGroup + " " : ""}${t}`.trim();
      }

      const sku = headerMap.sku !== undefined ? String(row[headerMap.sku] || "").trim() : "";
      const description = headerMap.description !== undefined ? String(row[headerMap.description] || "").trim() : "";

      const imageMain = headerMap.image !== undefined ? normalizeImageValue(row[headerMap.image]) : "";
      const image2 = headerMap.image2 !== undefined ? normalizeImageValue(row[headerMap.image2]) : "";
      const image3 = headerMap.image3 !== undefined ? normalizeImageValue(row[headerMap.image3]) : "";
      const galleryImages = [imageMain, image2, image3]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .filter((x, i, arr) => arr.indexOf(x) === i);

      let image = imageMain || "";
      let imageSecond = image2 || "";
      let imageThird = image3 || "";
      const embeddedGallery = [];

      // Embedded images in .xlsx: resolve each slot (image/image2/image3) independently.
      if (isXlsx && imagesByRow && imagesByRow.size > 0) {
        const excelRow = r + 1;
        const hasExplicitImageColumns =
          headerMap.image !== undefined ||
          headerMap.image2 !== undefined ||
          headerMap.image3 !== undefined;

        const slotHasTextValue =
          (headerMap.image !== undefined && !!String(row[headerMap.image] || "").trim()) ||
          (headerMap.image2 !== undefined && !!String(row[headerMap.image2] || "").trim()) ||
          (headerMap.image3 !== undefined && !!String(row[headerMap.image3] || "").trim());

        // New Excel "image in cell" stores image cells as error tokens (#VALUE!) + metadata.
        // `sheet_to_json` may hide these values, so inspect raw worksheet cells directly.
        const strictSameRow = [headerMap.image, headerMap.image2, headerMap.image3]
          .filter((x) => x !== undefined)
          .some((col0) => isRichImageErrorCell(ws, excelRow, col0));

        const hasRichImageMarker = [headerMap.image, headerMap.image2, headerMap.image3]
          .filter((x) => x !== undefined)
          .some((col0) => isRichImageErrorCell(ws, excelRow, col0));

        // For templates with explicit image slots, empty cells must stay empty.
        // Otherwise row-level fallback can borrow neighboring product photos.
        const allowRowFallback = !hasExplicitImageColumns || slotHasTextValue || hasRichImageMarker;

        const rowCandidates = strictSameRow
          ? [excelRow]
          : [excelRow, excelRow + 1, excelRow - 1, excelRow + 2, excelRow - 2].filter((x) => x > 0);
        const usedObjs = new Set();

        const asList = (value) => {
          if (!value) return [];
          return Array.isArray(value) ? value : [value];
        };

        const collectByColumn = (col1) => {
          const out = [];
          if (!col1) return out;
          for (const rr of rowCandidates) {
            const cellKey = `${sheetName}|${rr}|${col1}`;
            for (const obj of asList(imagesByRow.get(cellKey))) {
              if (!obj || !obj.buf || usedObjs.has(obj)) continue;
              out.push(obj);
            }
          }
          return out;
        };

        const collectByRow = () => {
          const out = [];
          for (const rr of rowCandidates) {
            const rowKey = `${sheetName}|${rr}`;
            for (const obj of asList(imagesByRow.get(rowKey))) {
              if (!obj || !obj.buf || usedObjs.has(obj)) continue;
              out.push(obj);
            }
          }
          return out;
        };

        const saveObj = async (obj, slotSuffix) => {
          if (!obj || !obj.buf || !imagesDir) return "";
          const base = sku ? `${sku}-${name}-${slotSuffix}` : `${name}-${slotSuffix}`;
          const baseSlug = slugify(base || "image") || "image";
          const url = await saveOptimizedProductImage({
            buffer: obj.buf,
            imagesDir,
            baseSlug,
            maxWidth: 1920,
            quality: 80,
          });
          usedObjs.add(obj);
          if (!url) return "";
          embeddedGallery.push(url);
          return url;
        };

        const takeFirst = (arr) => (Array.isArray(arr) && arr.length > 0 ? arr[0] : null);

        if (!image) {
          const obj = takeFirst(collectByColumn(headerMap.image !== undefined ? headerMap.image + 1 : null));
          if (obj) image = await saveObj(obj, "1");
        }
        if (!imageSecond) {
          const obj = takeFirst(collectByColumn(headerMap.image2 !== undefined ? headerMap.image2 + 1 : null));
          if (obj) imageSecond = await saveObj(obj, "2");
        }
        if (!imageThird) {
          const obj = takeFirst(collectByColumn(headerMap.image3 !== undefined ? headerMap.image3 + 1 : null));
          if (obj) imageThird = await saveObj(obj, "3");
        }

        // Row-level fallback is useful for legacy drawing anchors,
        // but for strict image-in-cell mode it can blend neighboring product photos.
        if (!strictSameRow && allowRowFallback) {
          const rowPool = collectByRow();
          let poolIdx = 0;
          const takeFromPool = async (slot) => {
            if (slot) return slot;
            const obj = rowPool[poolIdx++];
            if (!obj) return "";
            return await saveObj(obj, `row-${poolIdx}`);
          };

          if (!image) image = await takeFromPool(image);
          if (!imageSecond) imageSecond = await takeFromPool(imageSecond);
          if (!imageThird) imageThird = await takeFromPool(imageThird);
        }
      }

      // Very last fallback (only for main image): assign next extracted media image in order.
      if (!image && imagesQueue.length && queueIdx < imagesQueue.length) {
        image = imagesQueue[queueIdx];
        queueIdx++;
      }

      const thickness = headerMap.thickness !== undefined ? String(row[headerMap.thickness] || "").trim() : "";
      const size = headerMap.size !== undefined ? String(row[headerMap.size] || "").trim() : "";

      const attrs = {};
      if (thickness) attrs.thickness_mm = thickness;
      if (size) attrs.roll_size_mm = size;

      if (headerMap.pack_area !== undefined) {
        const v = String(row[headerMap.pack_area] || "").trim();
        if (v) attrs.pack_area_m2 = v;
      }
      if (headerMap.pack_volume !== undefined) {
        const n = parseNumber(row[headerMap.pack_volume]);
        if (n !== undefined) attrs.pack_volume_m3 = n;
      }
      if (headerMap.roll_area !== undefined) {
        const v = String(row[headerMap.roll_area] || "").trim();
        if (v) attrs.roll_area_m2 = v;
      }
      if (headerMap.pack_qty !== undefined) {
        const v = String(row[headerMap.pack_qty] || "").trim();
        if (v) attrs.pack_qty = v;
      }
      if (headerMap.marking !== undefined) {
        const v = String(row[headerMap.marking] || "").trim();
        if (v) attrs.marking = v;
      }

      // ADM template: parse "Характеристики" column (Ключ: Значение; format)
      if (headerMap.characteristics !== undefined) {
        const rawChars = String(row[headerMap.characteristics] || "").trim();
        if (rawChars) {
          const parsed = parseCharacteristics(rawChars);
          Object.assign(attrs, parsed);
        }
      }

      // ADM template: dimension columns
      if (headerMap.length_mm !== undefined) {
        const v = String(row[headerMap.length_mm] || "").trim();
        if (v) attrs.length_mm = v;
      }
      if (headerMap.width_mm !== undefined) {
        const v = String(row[headerMap.width_mm] || "").trim();
        if (v) attrs.width_mm = v;
      }
      if (headerMap.height_mm !== undefined) {
        const v = String(row[headerMap.height_mm] || "").trim();
        if (v) attrs.height_mm = v;
      }
      const finalImage2 = imageSecond;
      const finalImage3 = imageThird;
      const finalGallery = [image, imageSecond, imageThird, ...galleryImages, ...embeddedGallery]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .filter((x, i, arr) => arr.indexOf(x) === i);
      if (finalImage2) attrs.image2 = finalImage2;
      if (finalImage3) attrs.image3 = finalImage3;
      if (finalGallery.length > 0) {
        attrs.gallery_images = finalGallery;
      }

      const prices = {};
      const retail = headerMap.retail !== undefined ? parseNumber(row[headerMap.retail]) : undefined;
      const recommended = headerMap.recommended !== undefined ? parseNumber(row[headerMap.recommended]) : undefined;
      const purchase = headerMap.purchase !== undefined ? parseNumber(row[headerMap.purchase]) : undefined;
      const client = headerMap.client !== undefined ? parseNumber(row[headerMap.client]) : undefined;
      const online = headerMap.online !== undefined ? parseNumber(row[headerMap.online]) : undefined;
      const w5 = headerMap.wholesale_5m !== undefined ? parseNumber(row[headerMap.wholesale_5m]) : undefined;
      const w1 = headerMap.wholesale_1m !== undefined ? parseNumber(row[headerMap.wholesale_1m]) : undefined;

      if (retail !== undefined) prices.retail = retail;
      else if (recommended !== undefined) prices.retail = recommended;
      else if (purchase !== undefined && rowMode === "penoplex") prices.retail = purchase;
      else if (headerMap.price_any !== undefined) {
        const any = parseNumber(row[headerMap.price_any]);
        if (any !== undefined) prices.retail = any;
      }

      if (purchase !== undefined) prices.purchase = purchase;
      if (recommended !== undefined) prices.recommended = recommended;
      if (client !== undefined) prices.client = client;
      if (online !== undefined) prices.online = online;
      if (w5 !== undefined) prices.wholesale_5m = w5;
      if (w1 !== undefined) prices.wholesale_1m = w1;

      const templateUnit = headerMap.unit !== undefined ? String(row[headerMap.unit] || "").trim() : "";
      const pricingMode = parsePricingMode(
        headerMap.pricing_mode !== undefined ? row[headerMap.pricing_mode] : "",
        templateUnit
      );
      const templatePrice = headerMap.price_any !== undefined ? parseNumber(row[headerMap.price_any]) : undefined;

      if (templatePrice !== undefined) {
        if (pricingMode === "m2") prices.perM2 = templatePrice;
        else if (pricingMode === "m3") prices.perM3 = templatePrice;
        else prices.perPiece = templatePrice;

        if (prices.retail === undefined) prices.retail = templatePrice;
      }

      // note / "по запросу"
      const rowText = row.map((c) => String(c || "")).join(" ").toLowerCase();
      if (rowText.includes("по запросу")) prices.note = "Цена по запросу";

      const categoryFromCell = headerMap.category !== undefined ? String(row[headerMap.category] || "").trim() : "";
      const subcategoryFromCell = headerMap.subcategory !== undefined ? String(row[headerMap.subcategory] || "").trim() : "";
      // Use override category from import request if provided, otherwise derive from file
      const effectiveCategoryTitle = overrideCategoryId
        ? (overrideCategoryTitle || overrideCategoryId)
        : (categoryFromCell || currentCategoryTitle || String(sheetName || "Каталог"));
      const category_id = overrideCategoryId || slugify(effectiveCategoryTitle || sheetName);
      const segment = subcategoryFromCell || currentGroup || "";

      const step = headerMap.step !== undefined ? parseNumber(row[headerMap.step]) : undefined;
      if (step !== undefined) attrs.qty_step = step;

      const keyBase = sku ? `sku:${sku}` : `${category_id}|${slugify(segment)}|${slugify(name)}|${slugify(thickness)}|${slugify(size)}`;
      const key = slugify(keyBase);

      products.push({
        key,
        category_id,
        category_title: effectiveCategoryTitle,
        name,
        segment,
        unit: unitFromMode(pricingMode, templateUnit),
        sku,
        image,
        description,
        prices,
        attrs,
        inStock: true,
        active: true
      });
    }
  }

  return products;
}

module.exports = { workbookToProducts };