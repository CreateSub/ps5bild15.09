/**
 * Telegram-уведомления через HTTP API (без тяжёлых библиотек — стабильно на Netlify).
 */

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatOrderMessage(orderData, title) {
  const total = Number(orderData.totalPrice || 0).toLocaleString("ru-RU");
  const product = orderData.productLabel || orderData.product || "—";

  const fulfillment =
    orderData.fulfillment === "delivery"
      ? `🚚 <b>Доставка:</b> ${escapeHtml(orderData.deliveryAddress || "—")}`
      : `🏪 <b>Самовывоз:</b> ${escapeHtml(orderData.pickupLocation || "—")}`;

  const extras =
    Array.isArray(orderData.extras) && orderData.extras.length
      ? `\n➕ <b>Доп. периферия:</b> ${escapeHtml(orderData.extras.join(", "))}`
      : "";

  const gameNote = orderData.gameNote
    ? `\n💬 <b>Комментарий:</b> ${escapeHtml(orderData.gameNote)}`
    : "";

  const discount = Number(orderData.discountPercent)
    ? `\n🏷 <b>Скидка:</b> ${orderData.discountPercent}%${
        orderData.promoCode ? ` (промо ${escapeHtml(orderData.promoCode)})` : " (лояльность)"
      }`
    : "";

  const extensions = Array.isArray(orderData.extensions) ? orderData.extensions : [];
  const ext = extensions[extensions.length - 1];
  const extension = ext
    ? `\n⏱ <b>Продление:</b> +${ext.days} сут. до ${escapeHtml(ext.toDate)} · +${Number(ext.price || 0).toLocaleString("ru-RU")} ₽`
    : "";

  return (
    `🆕 <b>${escapeHtml(title || "Новый заказ")}</b> <code>${escapeHtml(orderData.id)}</code>\n\n` +
    `🏙 <b>Город:</b> ${escapeHtml(orderData.cityLabel || orderData.city || "—")}\n` +
    `👤 <b>Клиент:</b> ${escapeHtml(orderData.customerName)}\n` +
    `📱 <b>Телефон:</b> ${escapeHtml(orderData.customerPhone)}\n` +
    `🎮 <b>Приставка:</b> ${escapeHtml(product)}\n` +
    `📅 <b>Аренда:</b> ${escapeHtml(orderData.startDate)} — ${escapeHtml(orderData.endDate)} (${orderData.days} сут.)` +
    `${extension}\n` +
    `💰 <b>Сумма:</b> ${total} ₽` +
    `${discount}\n` +
    `${fulfillment}` +
    `${extras}` +
    `${gameNote}`
  );
}

async function sendOrderNotification(orderData, title) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId =
    process.env.TELEGRAM_ADMIN_GROUP_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    throw new Error(
      "Не заданы TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_GROUP_CHAT_ID в Netlify → Environment variables"
    );
  }

  if (!orderData?.id) {
    throw new Error("orderData.id обязателен");
  }

  const text = formatOrderMessage(orderData, title);
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json();

  if (!data.ok) {
    const errText = data.description || `Telegram HTTP ${response.status}`;
    console.error("[Telegram] FAIL:", orderData.id, errText);
    throw new Error(errText);
  }

  console.log("[Telegram] OK, заказ:", orderData.id);
}

module.exports = { sendOrderNotification, formatOrderMessage };
