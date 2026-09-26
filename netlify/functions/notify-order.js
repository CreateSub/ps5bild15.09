/**
 * Netlify Function — уведомление о новом заказе сразу в Telegram и во ВКонтакте.
 * Вызывается сайтом и VK Mini App после создания заказа (POST /api/notify-order).
 * Ошибка одного канала не мешает другому и не отменяет заказ.
 */
const { sendOrderNotification } = require("./telegramBot");
const { sendVkOrderNotification, vkConfigured, vkConfig, orderVkId } = require("./vkBot");

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function reply(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

function telegramConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
      (process.env.TELEGRAM_ADMIN_GROUP_CHAT_ID || process.env.TELEGRAM_CHAT_ID)
  );
}

function channelResult(result) {
  if (result.status === "fulfilled") {
    const failed = (result.value && result.value.failed) || [];
    return failed.length ? { ok: true, failed } : { ok: true };
  }
  return { ok: false, error: (result.reason && result.reason.message) || String(result.reason) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod === "GET") {
    const tg = telegramConfigured();
    const vk = vkConfigured();
    const { groupId, adminIds } = vkConfig();
    return reply(200, {
      ok: tg || vk,
      telegramConfigured: tg,
      vkConfigured: vk,
      vkGroupId: groupId || null,
      vkAdminCount: adminIds.length,
      hint:
        tg && vk
          ? "Telegram и VK настроены."
          : "Netlify → Environment variables: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_GROUP_CHAT_ID, VK_BOT_TOKEN, VK_GROUP_ID, VK_ADMIN_IDS → redeploy",
    });
  }

  if (event.httpMethod !== "POST") {
    return reply(405, { ok: false, error: "Method not allowed" });
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return reply(400, { ok: false, error: "Некорректный JSON" });
  }

  if (!order.id || !order.customerPhone) {
    return reply(400, { ok: false, error: "Недостаточно данных заказа" });
  }

  const title = order.notifyTitle ? String(order.notifyTitle).slice(0, 60) : "";
  const vkId = orderVkId(order);
  const telegramOrder = vkId ? { ...order, customerPhone: `VK vk.com/id${vkId}` } : order;

  const [telegram, vk] = await Promise.allSettled([
    telegramConfigured()
      ? sendOrderNotification(telegramOrder, title)
      : Promise.reject(new Error("Telegram не настроен")),
    vkConfigured()
      ? sendVkOrderNotification(order, title)
      : Promise.reject(new Error("VK не настроен")),
  ]);

  const channels = { telegram: channelResult(telegram), vk: channelResult(vk) };
  const ok = channels.telegram.ok || channels.vk.ok;
  return reply(ok ? 200 : 502, {
    ok,
    telegram: channels.telegram.ok,
    vk: channels.vk.ok,
    channels,
    error: ok ? undefined : [channels.telegram.error, channels.vk.error].filter(Boolean).join("; "),
  });
};
