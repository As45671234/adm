const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { prisma } = require("../lib/prisma");
const { requireAdmin } = require("../middleware/auth");
const { workbookToProducts } = require("../services/excelImport");
const { slugify } = require("../utils");
const { readHomeContent, saveHomeContent } = require("../lib/homeContent");
const { saveOptimizedProductImage } = require("../lib/imageOptimize");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 60 * 1024 * 1024 },
});
const productImagesDir = path.join(__dirname, "..", "..", "uploads", "products");
fs.mkdirSync(productImagesDir, { recursive: true });

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function uploadSingle(field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "file too large" });
      }
      return res.status(400).json({ error: "upload failed", details: String(err && err.message ? err.message : err) });
    });
  };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function mergeEditableObject(existingValue, patchValue) {
  const next = { ...asObject(existingValue) };
  for (const [key, value] of Object.entries(asObject(patchValue))) {
    const isEmptyString = typeof value === "string" && !value.trim();
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || value === undefined || isEmptyString || isEmptyArray) {
      delete next[key];
      continue;
    }
    next[key] = value;
  }
  return next;
}

function mapProductForApi(product) {
  return {
    id: String(product.id),
    name: product.name,
    segment: product.brandOrGroup || "",
    brandOrGroup: product.brandOrGroup || "",
    unit: product.unit || "шт",
    sku: product.sku || "",
    image: product.image || "",
    description: product.description || "",
    prices: asObject(product.prices),
    attrs: asObject(product.attrs),
    category_id: product.categoryId,
    inStock: !!product.inStock,
    active: !!product.active,
  };
}

async function buildCatalog({ onlyInStock }) {
  const where = { active: true };
  if (onlyInStock) where.inStock = true;

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ categoryTitle: "asc" }, { name: "asc" }],
  });

  const categoriesMap = new Map();
  for (const p of products) {
    const catId = p.categoryId;
    if (!categoriesMap.has(catId)) {
      categoriesMap.set(catId, { id: catId, title: p.categoryTitle, fields: [], items: [], image: "" });
    }
    categoriesMap.get(catId).items.push(mapProductForApi(p));
  }

  const catIds = Array.from(categoriesMap.keys());
  if (catIds.length > 0) {
    const metas = await prisma.categoryMeta.findMany({ where: { categoryId: { in: catIds } } });
    const metaMap = new Map(metas.map((m) => [m.categoryId, m]));
    for (const [id, cat] of categoriesMap.entries()) {
      const meta = metaMap.get(id);
      if (meta && meta.image) cat.image = meta.image;
      if (meta && meta.title && !cat.title) cat.title = meta.title;
    }
  }

  return Array.from(categoriesMap.values());
}

router.post("/login", (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "password required" });

  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || password !== expected) return res.status(401).json({ error: "invalid password" });

  const token = jwt.sign(
    { role: "admin" },
    process.env.JWT_SECRET || "secret",
    { expiresIn: "7d" }
  );

  res.json({ token });
});

router.get("/catalog", requireAdmin, async (req, res) => {
  const categories = await buildCatalog({ onlyInStock: false });
  res.json({ categories });
});

router.get("/categories", requireAdmin, async (req, res) => {
  // Start from all admin-managed categories (CategoryMeta)
  const allMetas = await prisma.categoryMeta.findMany();
  const categoriesMap = new Map();
  for (const m of allMetas) {
    categoriesMap.set(m.categoryId, { id: m.categoryId, title: m.title || "", image: m.image || "" });
  }

  // Also include product-derived categories not yet in CategoryMeta
  const products = await prisma.product.findMany({
    where: { active: true },
    select: { categoryId: true, categoryTitle: true },
    distinct: ["categoryId"],
  });
  for (const p of products) {
    if (!categoriesMap.has(p.categoryId)) {
      categoriesMap.set(p.categoryId, { id: p.categoryId, title: p.categoryTitle || "", image: "" });
    }
  }

  const items = Array.from(categoriesMap.values()).sort((a, b) =>
    String(a.title || "").localeCompare(String(b.title || ""), "ru")
  );

  res.json({ categories: items });
});

router.get("/site/home", requireAdmin, async (req, res) => {
  const content = readHomeContent();
  res.json({ content });
});

router.patch("/site/home", requireAdmin, async (req, res) => {
  const content = saveHomeContent(req.body?.content || {});
  res.json({ ok: true, content });
});

router.post("/categories", requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "title required" });

  const categoryId = slugify(title);
  if (!categoryId) return res.status(400).json({ error: "invalid category title" });

  const image = String(req.body?.image || "");

  const saved = await prisma.categoryMeta.upsert({
    where: { categoryId },
    create: { categoryId, title, image },
    update: { title, ...(image ? { image } : {}) },
  });

  res.json({
    ok: true,
    category: { id: saved.categoryId, title: saved.title || "", image: saved.image || "" },
  });
});

router.patch("/categories/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "category id required" });

  const image = req.body?.image;
  const title = req.body?.title;

  const saved = await prisma.categoryMeta.upsert({
    where: { categoryId: id },
    create: {
      categoryId: id,
      image: image !== undefined ? String(image || "") : "",
      title: title !== undefined ? String(title || "") : "",
    },
    update: {
      ...(image !== undefined ? { image: String(image || "") } : {}),
      ...(title !== undefined ? { title: String(title || "") } : {}),
    },
  });

  res.json({
    ok: true,
    category: {
      id: saved.categoryId,
      title: saved.title || "",
      image: saved.image || "",
    },
  });
});

router.post("/import/excel", requireAdmin, uploadSingle("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "file is required" });

    const originalName = String(file.originalname || "").trim();
    if (originalName.startsWith("~$")) {
      return res.status(400).json({
        error: "temporary excel lock file",
        details: "Close Excel and upload the original .xlsx file, not a ~$ temporary lock file.",
      });
    }

    // Category can be passed as form field (required when uploading a per-category template)
    const passedCategoryId = String(req.body?.categoryId || "").trim();
    const passedCategoryTitle = String(req.body?.categoryTitle || "").trim();

    const items = await workbookToProducts({
      buffer: file.buffer,
      filename: file.originalname || "",
      imagesDir: path.join(__dirname, "..", "..", "uploads", "products"),
      categoryId: passedCategoryId || undefined,
      categoryTitle: passedCategoryTitle || undefined,
    });

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const it of items) {
      if (!it.name || !it.category_id) {
        skipped++;
        continue;
      }

      const existing = await prisma.product.findUnique({ where: { key: it.key } });
      if (!existing) {
        await prisma.product.create({
          data: {
            key: it.key,
            categoryId: it.category_id,
            categoryTitle: it.category_title,
            name: it.name,
            brandOrGroup: it.segment || "",
            unit: it.unit || "шт",
            sku: it.sku || "",
            image: it.image || "",
            description: it.description || "",
            prices: asObject(it.prices),
            attrs: asObject(it.attrs),
            inStock: it.inStock !== undefined ? !!it.inStock : true,
            active: true,
          },
        });
        inserted++;
      } else {
        const mergedPrices = { ...asObject(existing.prices), ...asObject(it.prices) };

        // Important: prevent stale mixed gallery slots when re-importing from Excel.
        // We clear media-related keys first, then apply fresh attrs from current row.
        const existingAttrs = asObject(existing.attrs);
        const nextAttrsBase = { ...existingAttrs };
        delete nextAttrsBase.image2;
        delete nextAttrsBase.image3;
        delete nextAttrsBase.gallery_images;
        const mergedAttrs = { ...nextAttrsBase, ...asObject(it.attrs) };
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            categoryId: it.category_id,
            categoryTitle: it.category_title,
            name: it.name,
            brandOrGroup: it.segment || "",
            sku: it.sku || existing.sku,
            unit: it.unit || existing.unit,
            image: it.image || existing.image,
            description: it.description || existing.description,
            prices: mergedPrices,
            attrs: mergedAttrs,
          },
        });
        updated++;
      }
    }

    res.json({ ok: true, inserted, updated, skipped, totalParsed: items.length });
  } catch (e) {
    res.status(500).json({ error: "import failed", details: String(e && e.message ? e.message : e) });
  }
});

router.post("/upload/product-image", requireAdmin, (req, res) => {
  imageUpload.single("file")(req, res, async (err) => {
    if (err && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "file too large" });
    }
    if (err) {
      return res.status(400).json({ error: "upload failed", details: String(err.message || err) });
    }

    if (!req.file) return res.status(400).json({ error: "file is required" });

    try {
      const original = String(req.file.originalname || "image");
      const base = original.replace(/\.[^.]+$/, "");
      const imageUrl = await saveOptimizedProductImage({
        buffer: req.file.buffer,
        imagesDir: productImagesDir,
        baseSlug: base,
        maxWidth: 1920,
        quality: 82,
      });
      return res.json({ ok: true, imageUrl });
    } catch (e) {
      return res.status(500).json({ error: "image optimization failed", details: String(e && e.message ? e.message : e) });
    }
  });
});

router.post("/products", requireAdmin, async (req, res) => {
  const body = req.body || {};
  const categoryTitle = String(body.category_title || "").trim();
  const name = String(body.name || "").trim();

  if (!categoryTitle || !name) return res.status(400).json({ error: "category_title and name are required" });

  const categoryId = slugify(categoryTitle);
  const sku = String(body.sku || "").trim();
  const keyBase = sku
    ? `sku:${sku}`
    : `${categoryId}|${slugify(body.segment || body.brandOrGroup || "")}|${slugify(name)}|${slugify(body.attrs?.thickness_mm || "")}|${slugify(body.attrs?.roll_size_mm || "")}`;
  const key = slugify(keyBase);

  const created = await prisma.product.create({
    data: {
      key,
      categoryId,
      categoryTitle,
      name,
      brandOrGroup: String(body.segment || body.brandOrGroup || ""),
      unit: String(body.unit || "шт"),
      sku,
      image: String(body.image || ""),
      description: String(body.description || ""),
      prices: asObject(body.prices),
      attrs: asObject(body.attrs),
      inStock: body.inStock !== undefined ? !!body.inStock : true,
      active: true,
    },
  });

  res.json({ product: mapProductForApi(created) });
});

router.patch("/products/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const patch = req.body || {};

  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: "not found" });

  const data = {};
  if (patch.inStock !== undefined) data.inStock = !!patch.inStock;
  if (patch.active !== undefined) data.active = !!patch.active;

  if (patch.name !== undefined) data.name = String(patch.name);
  if (patch.segment !== undefined || patch.brandOrGroup !== undefined) {
    data.brandOrGroup = String(patch.segment ?? patch.brandOrGroup ?? "");
  }
  if (patch.unit !== undefined) data.unit = String(patch.unit);
  if (patch.sku !== undefined) data.sku = String(patch.sku);
  if (patch.image !== undefined) data.image = String(patch.image);
  if (patch.description !== undefined) data.description = String(patch.description);

  if (patch.prices && typeof patch.prices === "object") {
    data.prices = mergeEditableObject(p.prices, patch.prices);
  }
  if (patch.attrs && typeof patch.attrs === "object") {
    data.attrs = mergeEditableObject(p.attrs, patch.attrs);
  }

  const updated = await prisma.product.update({ where: { id }, data });
  res.json({ product: mapProductForApi(updated) });
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return res.status(404).json({ error: "not found" });
  await prisma.product.delete({ where: { id } });
  res.json({ ok: true });
});

router.get("/orders", requireAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;

  const status = String(req.query.status || "").trim();
  const sortBy = String(req.query.sortBy || "date").trim();
  const sortDir = String(req.query.sortDir || "desc").trim();

  const where = {};
  if (status && ["new", "processing", "completed", "cancelled"].includes(status)) {
    where.status = status;
  }

  const orderBy = [];
  if (sortBy === "status") orderBy.push({ status: sortDir === "asc" ? "asc" : "desc" });
  orderBy.push({ createdAt: sortDir === "asc" ? "asc" : "desc" });

  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy, skip, take: limit }),
    prisma.order.count({ where }),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((o) => ({
      id: String(o.id),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      customerEmail: o.customerEmail || "",
      address: o.address || "",
      comment: o.comment || "",
      status: o.status,
      total: o.total || 0,
      createdAt: o.createdAt,
    })),
  });
});

router.get("/orders/:id", requireAdmin, async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!order) return res.status(404).json({ error: "order not found" });

  res.json({
    order: {
      id: String(order.id),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || "",
      address: order.address || "",
      comment: order.comment || "",
      status: order.status,
      total: order.total || 0,
      items: (order.items || []).map((it) => ({
        ...it,
        meta: asObject(it.meta),
      })),
      createdAt: order.createdAt,
    },
  });
});

router.patch("/orders/:id", requireAdmin, async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (!["new", "processing", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  }).catch(() => null);

  if (!order) return res.status(404).json({ error: "order not found" });
  res.json({ ok: true, status: order.status });
});

router.delete("/orders/:id", requireAdmin, async (req, res) => {
  const existing = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "order not found" });
  await prisma.order.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.get("/orders/:id/export", requireAdmin, async (req, res) => {
  const ExcelJS = require("exceljs");
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!order) return res.status(404).json({ error: "order not found" });

  const wb = new ExcelJS.Workbook();

  const ws1 = wb.addWorksheet("Order");
  ws1.columns = [
    { header: "Field", key: "field", width: 20 },
    { header: "Value", key: "value", width: 60 },
  ];

  const rows1 = [
    ["Order ID", String(order.id)],
    ["Status", String(order.status || "")],
    ["Created At", order.createdAt ? new Date(order.createdAt).toISOString() : ""],
    ["Customer Name", String(order.customerName || "")],
    ["Customer Phone", String(order.customerPhone || "")],
    ["Customer Email", String(order.customerEmail || "")],
    ["Address", String(order.address || "")],
    ["Comment", String(order.comment || "")],
    ["Total", Number(order.total || 0)],
  ].map(([field, value]) => ({ field, value }));

  ws1.addRows(rows1);
  ws1.getRow(1).font = { bold: true };

  const ws2 = wb.addWorksheet("Items");
  ws2.columns = [
    { header: "Name", key: "name", width: 40 },
    { header: "SKU", key: "sku", width: 18 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Mode", key: "pricingMode", width: 10 },
    { header: "Metrics", key: "metrics", width: 28 },
    { header: "Price", key: "price", width: 12 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Line Total", key: "lineTotal", width: 14 },
    { header: "Image", key: "image", width: 40 },
  ];
  ws2.getRow(1).font = { bold: true };

  const items = Array.isArray(order.items) ? order.items : [];
  ws2.addRows(items.map((it) => ({
    name: String(it.name || ""),
    sku: String(it.sku || ""),
    unit: String(it.unit || ""),
    pricingMode: String(it.pricingMode || "piece"),
    metrics: (() => {
      const meta = asObject(it.meta);
      if (!meta.quantity) return "";
      const dims = [meta.widthM, meta.heightM, meta.depthM]
        .filter((value) => value !== undefined && value !== null && value !== "")
        .join(" x ");
      return `${dims} м | ${meta.quantity} ${meta.unit || ""}`.trim();
    })(),
    price: Number(it.price || 0),
    quantity: Number(it.quantity || 0),
    lineTotal: Number(it.lineTotal || 0),
    image: String(it.image || ""),
  })));

  const buf = await wb.xlsx.writeBuffer();

  const fname = `order_${String(order.id)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
  res.send(Buffer.from(buf));
});

router.get("/leads", requireAdmin, async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;

  const status = String(req.query.status || "").trim();
  const sortDir = String(req.query.sortDir || "desc").trim();

  const where = {};
  if (status && ["new", "processing", "done"].includes(status)) where.status = status;

  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: sortDir === "asc" ? "asc" : "desc" }, skip, take: limit }),
    prisma.lead.count({ where }),
  ]);

  res.json({
    page,
    limit,
    total,
    items: items.map((l) => ({
      id: String(l.id),
      name: l.name,
      phone: l.phone,
      email: l.email || "",
      message: l.message || "",
      status: l.status,
      createdAt: l.createdAt,
    })),
  });
});

router.get("/leads/:id", requireAdmin, async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: "lead not found" });
  res.json({
    lead: {
      id: String(lead.id),
      name: lead.name,
      phone: lead.phone,
      email: lead.email || "",
      message: lead.message || "",
      status: lead.status,
      createdAt: lead.createdAt,
    },
  });
});

router.patch("/leads/:id", requireAdmin, async (req, res) => {
  const status = String(req.body?.status || "").trim();
  if (!["new", "processing", "done"].includes(status)) {
    return res.status(400).json({ error: "invalid status" });
  }

  const lead = await prisma.lead.update({ where: { id: req.params.id }, data: { status } }).catch(() => null);
  if (!lead) return res.status(404).json({ error: "lead not found" });
  res.json({ ok: true, status: lead.status });
});

router.delete("/leads/:id", requireAdmin, async (req, res) => {
  const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: "lead not found" });
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
