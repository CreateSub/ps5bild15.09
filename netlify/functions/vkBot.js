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
 *
 * Напоминания клиентам (lib: sendVkClientReminder):
 *   VK_APP_SERVICE_TOKEN — сервисный ключ мини-приложения (уведомления notifications.sendMessage)
 *   VK_APP_ID            — ID мини-приложения, по умолчанию 54777188
 * Клиент получит уведомление, если разрешил его в мини-приложении; сообщение от сообщества —
 * если разрешил сообществу писать ему. Достаточно одного из каналов.
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

function lastExtension(order) {
  const list = Array.isArray(order.extensions) ? order.extensions : [];
  return list.length ? list[list.length - 1] : null;
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
  const extension = lastExtension(order);

  return [
    `🎮 ${title || "Новый заказ"} ${order.id}`,
    "",
    `Город: ${order.cityLabel || order.city || "—"}`,
    `Клиент: ${order.customerName || "—"}`,
    vkId ? `VK: https://vk.com/id${vkId}` : `Телефон: ${phone || "—"}`,
    `Приставка: ${order.consoleLabel || order.productLabel || order.product || "—"}`,
    `Аренда: ${formatDate(order.startDate)} — ${formatDate(order.endDate)} (${order.days} сут.)`,
    extension
      ? `Продление: +${extension.days} сут. до ${formatDate(extension.toDate)} · +${Number(extension.price || 0).toLocaleString("ru-RU")} ₽`
      : null,
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

function appConfig() {
  const serviceToken = String(process.env.VK_APP_SERVICE_TOKEN || "").trim();
  const appId = String(process.env.VK_APP_ID || "54777188").replace(/\D/g, "");
  return { serviceToken, appId };
}

async function sendAppNotification(serviceToken, userId, message, fragment) {
  const body = new URLSearchParams({
    user_ids: userId,
    message: message.slice(0, 254),
    fragment,
    random_id: String(Date.now()),
    access_token: serviceToken,
    v: VK_VERSION,
  });
  const res = await fetch("https://api.vk.com/method/notifications.sendMessage", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (data.error) throw new Error(data.error.error_msg || "VK API error");
  const item = Array.isArray(data.response) ? data.response[0] : null;
  if (item && item.status === false) {
    throw new Error((item.error && item.error.description) || "уведомления не разрешены");
  }
  return data.response;
}

/** Пуш клиенту: уведомление мини-приложения и/или сообщение от сообщества. */
async function sendVkClientReminder(userId, text, fragment) {
  const { token } = vkConfig();
  const { serviceToken, appId } = appConfig();
  const link = `https://vk.com/app${appId}#${fragment}`;
  const tasks = [];
  if (serviceToken) tasks.push(sendAppNotification(serviceToken, userId, text, fragment).then(() => "app"));
  if (token) tasks.push(sendToAdmin(token, userId, `${text}\n\n${link}`, Date.now() * 1000 + 7).then(() => "message"));
  if (!tasks.length) throw new Error("Не заданы VK_APP_SERVICE_TOKEN или VK_BOT_TOKEN");
  const results = await Promise.allSettled(tasks);
  const sent = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const failed = results.filter((r) => r.status === "rejected").map((r) => r.reason.message);
  if (!sent.length) throw new Error(failed.join("; "));
  return { sent, failed };
}

module.exports = { sendVkOrderNotification, sendVkClientReminder, vkConfigured, vkConfig, orderVkId };
