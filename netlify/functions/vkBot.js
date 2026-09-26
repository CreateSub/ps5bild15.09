/**
 * VK-уведомления о заказах: сообщество-бот пишет в личку администраторам.
 *
 * Netlify → Environment variables:
 *   VK_BOT_TOKEN   — ключ сообщества с правом «Сообщения сообщества»
 *   VK_GROUP_ID    — ID сообщества (цифры, без минуса)
 *   VK_ADMIN_IDS   — VK ID администраторов через запятую
 *
 * Администратор получит сообщение, только если разрешил сообществу писать ему
 * (написал в сообщения сообщества или нажал «Разрешить сообщения от бота» в мини-приложении).
 */

const VK_API = "https://api.vk.com/method/messages.send";
const VK_VERSION = "5.199";

function vkConfig() {
  const token = String(process.env.VK_BOT_TOKEN || process.env.VK_GROUP_TOKEN || "").trim();
  const groupId = String(process.env.VK_GROUP_ID || "").replace(/\D/g, "");
  const adminIds = String(process.env.VK_ADMIN_IDS || "")
    .split(/[,\s]+/)
    .map((id) => id.replace(/\D/g, ""))
    .filter(Boolean);
  return { token, groupId, adminIds };
}

function vkConfigured() {
  const { token, adminIds } = vkConfig();
  return Boolean(token && adminIds.length);
}

function orderVkId(order) {
  if (order.customerVkId) return String(order.customerVkId).replace(/\D/g, "");
  const phone = String(order.customerPhone || "");
  return phone.startsWith("vk:") ? phone.slice(3).replace(/\D/g, "") : "";
}

function formatDate(key) {
  const [y, m, d] = String(key || "").split("-");
  return d && m ? `${d}.${m}.${String(y || "").slice(2)}` : String(key || "");
}

function formatVkMessage(order, title) {
  const vkId = orderVkId(order);
  const phone = String(order.customerPhone || "");
  const total = Number(order.totalPrice || 0).toLocaleString("ru-RU");
  const receive =
    order.fulfillment === "delivery"
      ? `Доставка: ${order.deliveryAddress || "адрес не указан"}`
      : `Самовывоз: ${order.pickupLocation || "—"}`;
  const extras = Array.isArray(order.extras) ? order.extras.filter(Boolean).join(", ") : "";
  const discount = Number(order.discountPercent)
    ? `Скидка: ${order.discountPercent}%${order.promoCode ? ` (промо ${order.promoCode})` : ""}`
    : "";

  return [
    `🎮 ${title || "Новый заказ"} ${order.id}`,
    "",
    `Город: ${order.cityLabel || order.city || "—"}`,
    `Клиент: ${order.customerName || "—"}`,
    vkId ? `VK: https://vk.com/id${vkId}` : `Телефон: ${phone || "—"}`,
    `Приставка: ${order.consoleLabel || order.productLabel || order.product || "—"}`,
    `Аренда: ${formatDate(order.startDate)} — ${formatDate(order.endDate)} (${order.days} сут.)`,
    `Сумма: ${total} ₽`,
    discount || null,
    receive,
    extras ? `Доп.: ${extras}` : null,
    order.gameNote ? `Комментарий: ${order.gameNote}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n")
    .slice(0, 4000);
}

async function sendToAdmin(token, userId, message, randomId) {
  const body = new URLSearchParams({
    user_id: userId,
    peer_id: userId,
    random_id: String(randomId),
    message,
    dont_parse_links: "1",
    access_token: token,
    v: VK_VERSION,
  });
  const res = await fetch(VK_API, { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (data.error) {
    throw new Error(`${userId}: ${data.error.error_msg || "VK API error"}`);
  }
  return data.response;
}

async function sendVkOrderNotification(order, title) {
  const { token, adminIds } = vkConfig();
  if (!token || !adminIds.length) {
    throw new Error("Не заданы VK_BOT_TOKEN и VK_ADMIN_IDS в Netlify → Environment variables");
  }
  const message = formatVkMessage(order, title);
  const base = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const results = await Promise.allSettled(
    adminIds.map((id, index) => sendToAdmin(token, id, message, base + index))
  );
  const failed = results.filter((r) => r.status === "rejected").map((r) => r.reason.message);
  const sent = results.length - failed.length;
  if (failed.length) console.error("[VK] FAIL:", order.id, failed.join("; "));
  if (!sent) throw new Error(failed.join("; ") || "VK: сообщение не отправлено");
  console.log("[VK] OK, заказ:", order.id, `${sent}/${results.length}`);
  return { sent, failed };
}

module.exports = { sendVkOrderNotification, vkConfigured, vkConfig, orderVkId };
