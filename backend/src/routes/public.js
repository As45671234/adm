const express = require("express");
const { prisma } = require("../lib/prisma");
const { readHomeContent } = require("../lib/homeContent");
const { sendTelegramMessage, formatOrderMessage, formatLeadMessage } = require("../lib/telegram");

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function mapProductForApi(p) {
  return {
    id: String(p.id),
    name: p.name,
    segment: p.brandOrGroup || "",
    brandOrGroup: p.brandOrGroup || "",
    unit: p.unit || "шт",
    sku: p.sku || "",
    image: p.image || "",
    description: p.description || "",
    prices: asObject(p.prices),
    attrs: asObject(p.attrs),
    category_id: p.categoryId,
    inStock: !!p.inStock,
  };
}

function normalizeOrderItems(items) {
  if (!Array.isArray(items)) return [];

  const normalizeMetrics = (metrics, pricingMode) => {
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return null;

    const widthM = toNumber(metrics.widthM);
    const heightM = toNumber(metrics.heightM);
    const depthM = toNumber(metrics.depthM);
    const quantity = toNumber(metrics.quantity);
    const unit = pricingMode === "m3" ? "м³" : "м²";

    if (pricingMode === "piece") return null;
    if (widthM === undefined || heightM === undefined || quantity === undefined) return null;
    if (pricingMode === "m3" && depthM === undefined) return null;

    return {
      source: metrics.source === "preset" ? "preset" : "custom",
      unit,
      quantity,
      widthM,
      heightM,
      ...(pricingMode === "m3" ? { depthM } : {}),
    };
  };

  return items
    .map((it) => {
      const quantity = toNumber(it.quantity) || 0;
      const price = toNumber(it.unitPrice ?? it.prices?.retail ?? it.price);
      const modeRaw = String(it.pricingMode || "piece").trim().toLowerCase();
      const pricingMode = ["piece", "m2", "m3"].includes(modeRaw) ? modeRaw : "piece";
      const lineTotal = (price || 0) * quantity;
      const meta = normalizeMetrics(it.metrics, pricingMode);

      return {
        productId: it.id ? String(it.id) : (it.productId ? String(it.productId) : ""),
        name: String(it.name || "").trim(),
        sku: String(it.sku || "").trim(),
        unit: String(it.unit || "шт"),
        image: String(it.image || ""),
        pricingMode,
        meta,
        price: price,
        quantity,
        lineTotal,
      };
    })
    .filter((x) => x.name && x.quantity > 0);
}

async function createOrderFromPayload(payload) {
  const { customerName, customerPhone, customerEmail, address, comment, items, total } = payload || {};
  if (!customerPhone || !customerName || !Array.isArray(items) || items.length === 0) return null;

  const cleanItems = normalizeOrderItems(items);
  if (cleanItems.length === 0) return null;

  const computedTotal = cleanItems.reduce((s, x) => s + Number(x.lineTotal || 0), 0);
  const finalTotal = toNumber(total) !== undefined ? Number(total) : computedTotal;

  return prisma.order.create({
    data: {
      customerName: String(customerName || "").trim(),
      customerPhone: String(customerPhone).trim(),
      customerEmail: String(customerEmail || "").trim(),
      address: String(address || "").trim(),
      comment: String(comment || "").trim(),
      total: finalTotal,
      items: {
        create: cleanItems.map((it) => ({
          productId: it.productId,
          name: it.name,
          sku: it.sku,
          unit: it.unit,
          image: it.image,
          pricingMode: it.pricingMode,
          meta: it.meta,
          price: it.price,
          quantity: it.quantity,
          lineTotal: it.lineTotal,
        })),
      },
    },
    include: { items: true },
  });
}

function publicRoutes(emailLimiter) {
  const router = express.Router();

  router.get("/site/home", async (req, res) => {
    const content = readHomeContent();
    res.json({ content });
  });

  // Catalog for website (only active + inStock)
  router.get("/catalog", async (req, res) => {
    const products = await prisma.product.findMany({
      where: { active: true, inStock: true },
      orderBy: [{ categoryTitle: "asc" }, { name: "asc" }],
    });
    const categoriesMap = new Map();

    for (const p of products) {
      const catId = p.categoryId;
      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, {
          id: catId,
          title: p.categoryTitle,
          fields: [],
          items: [],
          image: "",
        });
      }
      const cat = categoriesMap.get(catId);
      cat.items.push(mapProductForApi(p));
    }

    const catIds = Array.from(categoriesMap.keys());
    if (catIds.length > 0) {
      const metas = await prisma.categoryMeta.findMany({ where: { categoryId: { in: catIds } } });
      const metaMap = new Map(metas.map((m) => [m.categoryId, m]));
      for (const [id, cat] of categoriesMap.entries()) {
        const meta = metaMap.get(id);
        if (meta && meta.image) cat.image = meta.image;
      }
    }

    res.json({ categories: Array.from(categoriesMap.values()) });
  });

  // Lead form: save to DB only (no email delivery)
  router.post("/leads/email", emailLimiter, async (req, res) => {
    const { name, phone, email, message } = req.body || {};
    if (!phone) return res.status(400).json({ error: "phone is required" });

    const lead = await prisma.lead.create({
      data: {
        name: String(name || "").trim(),
        phone: String(phone).trim(),
        email: String(email || "").trim(),
        message: String(message || "").trim(),
      },
    });

    // Send Telegram notification
    const telegramText = formatLeadMessage(lead);
    sendTelegramMessage(telegramText).catch((err) => {
      console.error("Failed to send Telegram notification for lead:", err.message);
    });

    res.json({ ok: true, id: String(lead.id) });
  });

  // Main order endpoint: save to DB only (no email delivery)
  router.post("/orders", emailLimiter, async (req, res) => {
    const order = await createOrderFromPayload(req.body || {});
    if (!order) return res.status(400).json({ error: "invalid order" });

    // Send Telegram notification
    const telegramText = formatOrderMessage(order);
    sendTelegramMessage(telegramText).catch((err) => {
      console.error("Failed to send Telegram notification for order:", err.message);
    });

    res.json({ ok: true, id: String(order.id) });
  });

  // Backward-compatible endpoint
  router.post("/orders/email", emailLimiter, async (req, res) => {
    const order = await createOrderFromPayload(req.body || {});
    if (!order) return res.status(400).json({ error: "invalid order" });

    // Send Telegram notification
    const telegramText = formatOrderMessage(order);
    sendTelegramMessage(telegramText).catch((err) => {
      console.error("Failed to send Telegram notification for order:", err.message);
    });

    res.json({ ok: true, id: String(order.id) });
  });

  return router;
}

module.exports = publicRoutes;
