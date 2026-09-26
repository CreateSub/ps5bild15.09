/**
 * Netlify Scheduled Function (расписание в netlify.toml): за 12 часов до конца аренды
 * отправляет клиенту пуш во ВКонтакте с предложением продлить. По одному напоминанию на
 * каждое время окончания — после продления напоминание придёт снова.
 */
const { getRentalStore } = require("./lib/store");
const { REMIND_BEFORE_MS, rentalEndsAt } = require("./lib/rental");
const { sendVkClientReminder, orderVkId } = require("./vkBot");

const STORE_NAME = "ps5-rental";
const ORDERS_KEY = "orders";
const TIME_ZONE = "Asia/Yekaterinburg";

function formatEnd(iso) {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function reminderText(order, endsAt) {
  const product = order.consoleLabel || order.productLabel || "консоли";
  return (
    `⏰ Аренда ${product} заканчивается ${formatEnd(endsAt)}. ` +
    "Хочешь поиграть ещё? Нажми «Продлить ещё» в приложении «Приставка рядом»."
  );
}

function dueOrders(orders, now) {
  return orders.filter((order) => {
    if (order.status !== "issued") return false;
    const endsAt = rentalEndsAt(order);
    if (!endsAt || order.reminderFor === endsAt) return false;
    const left = Date.parse(endsAt) - now;
    return left > 0 && left <= REMIND_BEFORE_MS && Boolean(orderVkId(order));
  });
}

exports.handler = async (event) => {
  const store = getRentalStore(STORE_NAME, event);
  const now = Date.now();
  const orders = (await store.get(ORDERS_KEY, { type: "json" })) || [];
  const due = dueOrders(orders, now);
  if (!due.length) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0 }) };

  const marks = new Map();
  const errors = [];
  for (const order of due) {
    const endsAt = rentalEndsAt(order);
    try {
      const result = await sendVkClientReminder(orderVkId(order), reminderText(order, endsAt), "/rentals");
      marks.set(order.id, { reminderFor: endsAt, reminderSentAt: new Date().toISOString(), reminderChannels: result.sent });
      console.log("[reminder] OK", order.id, result.sent.join("+"));
    } catch (err) {
      errors.push(`${order.id}: ${err.message || err}`);
      console.error("[reminder] FAIL", order.id, err.message || err);
    }
  }

  if (marks.size) {
    // Перечитываем перед записью, чтобы не затереть заказы, изменённые во время отправки.
    const fresh = (await store.get(ORDERS_KEY, { type: "json" })) || [];
    const updated = fresh.map((order) => (marks.has(order.id) ? { ...order, ...marks.get(order.id) } : order));
    await store.setJSON(ORDERS_KEY, updated);
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: marks.size, errors }) };
};
