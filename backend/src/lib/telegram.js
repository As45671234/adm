const https = require("https");

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials not configured");
    return { ok: false, error: "Telegram not configured" };
  }

  try {
    const message = encodeURIComponent(text);
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${message}&parse_mode=HTML`;

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.error("Telegram error:", err.message);
    return { ok: false, error: err.message };
  }
}


function formatOrderMessage(order) {
  const formatMetricPart = (value) => Number(value || 0).toLocaleString("ru-RU", { maximumFractionDigits: 3 });

  let items = "";
  if (Array.isArray(order.items) && order.items.length > 0) {
    items = order.items
      .map((item) => {
        let line = `• <b>${item.name}</b>`;
        if (item.sku) line += ` (${item.sku})`;

        const meta = item.meta && typeof item.meta === "object" ? item.meta : null;
        if (item.pricingMode === "m2" && meta?.widthM && meta?.heightM) {
          line += ` - ${formatMetricPart(meta.widthM)} м × ${formatMetricPart(meta.heightM)} м = ${formatMetricPart(item.quantity)} м²`;
        } else if (item.pricingMode === "m3" && meta?.widthM && meta?.heightM && meta?.depthM) {
          line += ` - ${formatMetricPart(meta.widthM)} м × ${formatMetricPart(meta.heightM)} м × ${formatMetricPart(meta.depthM)} м = ${formatMetricPart(item.quantity)} м³`;
        } else {
          line += ` - ${formatMetricPart(item.quantity)} ${item.unit}`;
        }

        if (item.price) {
          const lineTotal = Number(item.lineTotal || 0).toLocaleString('ru-RU');
          line += ` × ${item.price}₸ = <b>${lineTotal}₸</b>`;
        }
        return line;
      })
      .join("\n");
  } else {
    items = "(Нет товаров)";
  }

  const totalFormatted = Number(order.total || 0).toLocaleString('ru-RU');
  const text = `
<b>📦 Новый заказ!</b>

<b>ID:</b> <code>${order.id}</code>
<b>Клиент:</b> ${order.customerName}
<b>Телефон:</b> <code>${order.customerPhone}</code>
<b>Адрес:</b> ${order.address || "(не указан)"}

<b>Товары:</b>
${items}

<b>Сумма:</b> <b>${totalFormatted}₸</b>
${order.comment ? `\n<b>Комментарий:</b> ${order.comment}` : ""}
`;

  return text.trim();
}
function formatLeadMessage(lead) {
  const text = `
<b>📝 Новая заявка!</b>

<b>ID:</b> ${lead.id}
<b>Имя:</b> ${lead.name}
<b>Телефон:</b> <code>${lead.phone}</code>
<b>Email:</b> ${lead.email || "(не указан)"}

<b>Сообщение:</b>
${lead.message || "(нет сообщения)"}
`;

  return text.trim();
}

module.exports = {
  sendTelegramMessage,
  formatOrderMessage,
  formatLeadMessage,
};
