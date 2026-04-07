const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/telegram-subscribers.json");

function readSubscribers() {
  try {
    if (!fs.existsSync(FILE)) return [];
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSubscribers(list) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save telegram subscribers:", err.message);
  }
}

function addSubscriber(chatId) {
  const id = String(chatId);
  const list = readSubscribers();
  if (list.includes(id)) return false; // already exists
  list.push(id);
  writeSubscribers(list);
  return true;
}

function removeSubscriber(chatId) {
  const id = String(chatId);
  const list = readSubscribers().filter((c) => c !== id);
  writeSubscribers(list);
}

function getSubscribers() {
  const list = readSubscribers();
  // also include TELEGRAM_CHAT_ID from env if set and not already in list
  const envId = process.env.TELEGRAM_CHAT_ID ? String(process.env.TELEGRAM_CHAT_ID) : null;
  if (envId && !list.includes(envId)) {
    list.push(envId);
  }
  return [...new Set(list)];
}

module.exports = { addSubscriber, removeSubscriber, getSubscribers };
