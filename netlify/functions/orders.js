/**
 * Shared orders + reviews API (Netlify Blobs).
 * Occupied dates are per-city: "tyumen|2026-08-23"
 *
 * GET  /api/orders?city=tyumen (optional city filter for calendar)
 * POST actions: create | updateStatus | addReview
 */
const { getRentalStore } = require("./lib/store");

const STORE_NAME = "ps5-rental";
const ORDERS_KEY = "orders";
const OCCUPIED_KEY = "occupied";
const REVIEWS_KEY = "reviews";
const ADMINS_KEY = "admins";
const PROMOS_KEY = "promos";

const CITIES = {
  tyumen: "Тюмень",
  surgut: "Сургут",
  nefteyugansk: "Нефтеюганск",
};

const PICKUP_BY_CITY = {
  tyumen: "г. Тюмень, ул. Павла Шарова 1к1, 6 подъезд",
  surgut: "г. Сургут, проспект Ленина 16",
  nefteyugansk: "г. Нефтеюганск — адрес уточнит менеджер",
};

const STATUS_LABELS = {
  pending: "Новая заявка",
  issued: "Аренда выдана",
  rejected: "В аренде отказано",
  completed: "Аренда завершена",
  active: "Новая заявка",
};

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function getOrdersStore(event) {
  return getRentalStore(STORE_NAME, event);
}

async function readJson(s, key, fallback) {
  const data = await s.get(key, { type: "json" });
  return data == null ? fallback : data;
}

function datesInRange(startKey, endKey) {
  const keys = [];
  const [ys, ms, ds] = startKey.split("-").map(Number);
  const cur = new Date(ys, ms - 1, ds);
  const [ye, me, de] = endKey.split("-").map(Number);
  const end = new Date(ye, me - 1, de);
  while (cur < end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function occKey(city, date) {
  return `${city || "tyumen"}|${date}`;
}

function normalizePromoCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function formatDeliveryAddress(parts) {
  const city = String((parts && parts.city) || "").trim();
  const street = String((parts && parts.street) || "").trim();
  const apt = String((parts && parts.apt) || "").trim();
  if (!city && !street && !apt) return null;
  return [city, street, apt ? `кв. ${apt}` : ""].filter(Boolean).join(", ");
}

const LOYALTY_LEVELS = [
  { id: "none", min: 0, percent: 0, label: "Новичок" },
  { id: "bronze", min: 5, percent: 15, label: "Бронза" },
  { id: "silver", min: 15, percent: 20, label: "Серебро" },
  { id: "gold", min: 20, percent: 25, label: "Золото" },
  { id: "platinum", min: 25, percent: 30, label: "Платина" },
];

function loyaltyForPhone(orders, phone) {
  const p = String(phone || "").replace(/\D/g, "");
  const count = (orders || []).filter((o) => {
    if (String(o.customerPhone || "").replace(/\D/g, "") !== p) return false;
    return o.status === "completed" || o.status === "issued";
  }).length;
  let level = LOYALTY_LEVELS[0];
  LOYALTY_LEVELS.forEach((l) => {
    if (count >= l.min) level = l;
  });
  return { ...level, orderCount: count };
}

function applyDiscount(base, percent) {
  const p = Math.max(0, Math.min(90, Number(percent) || 0));
  const b = Math.max(0, Math.round(Number(base) || 0));
  if (!p) return b;
  return Math.max(0, Math.round(b * (1 - p / 100)));
}

function rebuildOccupied(orders) {
  const set = new Set();
  orders.forEach((o) => {
    if (o.status === "pending" || o.status === "issued" || o.status === "active") {
      const city = o.city || "tyumen";
      datesInRange(o.startDate, o.endDate).forEach((d) => set.add(occKey(city, d)));
    }
  });
  return Array.from(set);
}

async function adminFromToken(s, token) {
  if (!token) return null;
  const admins = await readJson(s, ADMINS_KEY, []);
  return admins.find((a) => a.token && a.token === token) || null;
}

function filterOrdersForAdmin(orders, admin) {
  if (!admin) return orders;
  if (admin.role === "super") return orders;
  const cities = admin.cities || [];
  return orders.filter((o) => cities.includes(o.city || "tyumen"));
}

async function handleCreate(s, payload) {
  const city = payload.city;
  if (!CITIES[city]) {
    return json(400, { ok: false, error: "Выберите город: Тюмень, Сургут или Нефтеюганск" });
  }

  const orders = await readJson(s, ORDERS_KEY, []);
  let occupied = await readJson(s, OCCUPIED_KEY, []);
  // migrate legacy plain dates to city|date if needed
  occupied = (occupied || []).map((x) => (String(x).includes("|") ? x : `tyumen|${x}`));

  const range = datesInRange(payload.startDate, payload.endDate);
  const cityOcc = range.map((d) => occKey(city, d));

  if (cityOcc.some((k) => occupied.includes(k))) {
    return json(409, { ok: false, error: "В выбранном периоде есть занятые даты в этом городе" });
  }

  const loyalty = loyaltyForPhone(orders, payload.customerPhone);
  const promoCode = normalizePromoCode(payload.promoCode);
  let promoPercent = 0;
  let promoIdx = -1;
  const promos = await readJson(s, PROMOS_KEY, []);
  if (promoCode) {
    promoIdx = promos.findIndex((x) => normalizePromoCode(x.code) === promoCode);
    if (promoIdx < 0) return json(400, { ok: false, error: "Промокод не найден" });
    if (promos[promoIdx].used) return json(400, { ok: false, error: "Промокод уже использован" });
    if (promos[promoIdx].city && promos[promoIdx].city !== city) {
      return json(400, { ok: false, error: "Промокод не действует в этом городе" });
    }
    promoPercent = Number(promos[promoIdx].percent) || 0;
  }

  const discountPercent = Math.max(loyalty.percent, promoPercent);
  const basePrice = Number(payload.basePrice || payload.totalPrice) || 0;
  const totalPrice = applyDiscount(basePrice, discountPercent);

  const deliveryCity = String(payload.deliveryCity || "").trim();
  const deliveryStreet = String(payload.deliveryStreet || "").trim();
  const deliveryApt = String(payload.deliveryApt || "").trim();
  const deliveryAddress =
    payload.fulfillment === "delivery"
      ? formatDeliveryAddress({
          city: deliveryCity,
          street: deliveryStreet,
          apt: deliveryApt,
        }) || payload.deliveryAddress || null
      : null;

  const order = {
    id: payload.id || `ORD-${Date.now().toString(36).toUpperCase()}`,
    customerName: payload.customerName || "",
    customerPhone: payload.customerPhone,
    city,
    cityLabel: CITIES[city],
    startDate: payload.startDate,
    endDate: payload.endDate,
    days: payload.days || range.length,
    status: "pending",
    basePrice,
    totalPrice,
    loyaltyLevel: loyalty.id,
    loyaltyPercent: loyalty.percent,
    promoCode: promoCode || null,
    promoPercent,
    discountPercent,
    fulfillment: payload.fulfillment || "pickup",
    deliveryCity: payload.fulfillment === "delivery" ? deliveryCity : null,
    deliveryStreet: payload.fulfillment === "delivery" ? deliveryStreet : null,
    deliveryApt: payload.fulfillment === "delivery" ? deliveryApt : null,
    deliveryAddress,
    pickupLocation:
      payload.fulfillment === "pickup" ? PICKUP_BY_CITY[city] : null,
    product: payload.product || null,
    productLabel: payload.productLabel || "",
    consoleModel: payload.consoleModel || null,
    consoleLabel: payload.consoleLabel || "",
    extras: payload.extras || [],
    extraGamepads: Number(payload.extraGamepads) || 0,
    gameNote: String(payload.gameNote || "").trim().slice(0, 500),
    reviewLeft: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (promoIdx >= 0) {
    promos[promoIdx] = {
      ...promos[promoIdx],
      used: true,
      usedAt: order.createdAt,
      usedByPhone: order.customerPhone,
      usedOrderId: order.id,
    };
    await s.setJSON(PROMOS_KEY, promos);
  }

  orders.unshift(order);
  occupied = rebuildOccupied(orders);
  await s.setJSON(ORDERS_KEY, orders);
  await s.setJSON(OCCUPIED_KEY, occupied);

  return json(200, {
    ok: true,
    order,
    occupied,
    statusLabel: STATUS_LABELS[order.status],
  });
}

async function handleUpdateStatus(s, payload) {
  const id = payload.id;
  const next = payload.status;
  const allowed = ["issued", "rejected", "completed"];
  if (!id || !allowed.includes(next)) {
    return json(400, { ok: false, error: "Некорректный статус" });
  }

  const admin = await adminFromToken(s, payload.token);
  const orders = await readJson(s, ORDERS_KEY, []);
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return json(404, { ok: false, error: "Заказ не найден" });

  const order = orders[idx];
  if (admin && admin.role !== "super") {
    if (!(admin.cities || []).includes(order.city || "tyumen")) {
      return json(403, { ok: false, error: "Нет доступа к заказам этого города" });
    }
  }

  const current = order.status === "active" ? "pending" : order.status;

  if (next === "issued" && current !== "pending") {
    return json(400, { ok: false, error: "Выдать можно только новую заявку" });
  }
  if (next === "rejected" && current !== "pending") {
    return json(400, { ok: false, error: "Отклонить можно только новую заявку" });
  }
  if (next === "completed" && current !== "issued") {
    return json(400, { ok: false, error: "Завершить можно только выданную аренду" });
  }

  order.status = next;
  order.updatedAt = new Date().toISOString();
  if (next === "completed") order.completedAt = order.updatedAt;
  if (next === "rejected") order.rejectedAt = order.updatedAt;
  if (next === "issued") order.issuedAt = order.updatedAt;

  orders[idx] = order;
  const occupied = rebuildOccupied(orders);
  await s.setJSON(ORDERS_KEY, orders);
  await s.setJSON(OCCUPIED_KEY, occupied);

  return json(200, {
    ok: true,
    order,
    occupied,
    statusLabel: STATUS_LABELS[order.status],
  });
}

async function handleAddComment(s, payload) {
  if (!payload.id || !String(payload.text || "").trim()) {
    return json(400, { ok: false, error: "Нужны id заказа и текст комментария" });
  }
  const orders = await readJson(s, ORDERS_KEY, []);
  const idx = orders.findIndex((o) => o.id === payload.id);
  if (idx < 0) return json(404, { ok: false, error: "Заказ не найден" });

  const order = { ...orders[idx] };
  if (!Array.isArray(order.adminComments)) order.adminComments = [];
  const comment = {
    id: `CMT-${Date.now().toString(36).toUpperCase()}`,
    text: String(payload.text).trim().slice(0, 1000),
    author: String(payload.author || "Админ").trim().slice(0, 80) || "Админ",
    createdAt: new Date().toISOString(),
  };
  order.adminComments.push(comment);
  order.updatedAt = new Date().toISOString();
  orders[idx] = order;
  await s.setJSON(ORDERS_KEY, orders);
  return json(200, { ok: true, order, comment });
}

async function handleCreatePromo(s, payload) {
  const percent = Number(payload.percent);
  if (![10, 15, 20, 25, 30, 40, 50].includes(percent)) {
    return json(400, { ok: false, error: "Выберите процент скидки" });
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = normalizePromoCode(payload.code);
  if (!code) {
    code = "PR-";
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  const promos = await readJson(s, PROMOS_KEY, []);
  if (promos.some((p) => normalizePromoCode(p.code) === code)) {
    return json(409, { ok: false, error: "Такой код уже есть" });
  }
  const cityRaw = payload.city;
  let city = null;
  if (cityRaw && cityRaw !== "all") {
    city = String(cityRaw);
    if (!CITIES[city]) {
      return json(400, { ok: false, error: "Некорректный город промокода" });
    }
  }
  const promo = {
    id: `PROMO-${Date.now().toString(36).toUpperCase()}`,
    code,
    percent,
    city: city || null,
    used: false,
    usedAt: null,
    usedByPhone: null,
    usedOrderId: null,
    createdAt: new Date().toISOString(),
    createdBy: String(payload.createdBy || "Админ").slice(0, 80),
  };
  promos.unshift(promo);
  await s.setJSON(PROMOS_KEY, promos);
  return json(200, { ok: true, promo, promos });
}

async function handleListPromos(s) {
  const promos = await readJson(s, PROMOS_KEY, []);
  return json(200, { ok: true, promos });
}

async function handleAddReview(s, payload) {
  const rating = Number(payload.rating);
  if (!payload.orderId || !payload.customerPhone || !(rating >= 1 && rating <= 5)) {
    return json(400, { ok: false, error: "Нужны orderId, телефон и оценка 1–5" });
  }

  const orders = await readJson(s, ORDERS_KEY, []);
  const idx = orders.findIndex((o) => o.id === payload.orderId);
  if (idx < 0) return json(404, { ok: false, error: "Заказ не найден" });

  const order = orders[idx];
  if (order.status !== "completed") {
    return json(400, { ok: false, error: "Отзыв доступен только после завершения аренды" });
  }
  if (String(order.customerPhone) !== String(payload.customerPhone)) {
    return json(403, { ok: false, error: "Отзыв может оставить только клиент заказа" });
  }
  if (order.reviewLeft) {
    return json(400, { ok: false, error: "Отзыв по этому заказу уже оставлен" });
  }

  const review = {
    id: `REV-${Date.now().toString(36).toUpperCase()}`,
    orderId: order.id,
    customerName: payload.customerName || order.customerName || "Клиент",
    customerPhone: order.customerPhone,
    rating,
    comment: String(payload.comment || "").trim().slice(0, 800),
    productLabel: order.consoleLabel || order.productLabel || "",
    city: order.city || null,
    cityLabel: order.cityLabel || "",
    createdAt: new Date().toISOString(),
  };

  const reviews = await readJson(s, REVIEWS_KEY, []);
  reviews.unshift(review);
  order.reviewLeft = true;
  order.reviewId = review.id;
  orders[idx] = order;

  await s.setJSON(REVIEWS_KEY, reviews);
  await s.setJSON(ORDERS_KEY, orders);

  return json(200, { ok: true, review, reviews });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  let s;
  try {
    s = getOrdersStore(event);
  } catch (err) {
    return json(500, {
      ok: false,
      error: "Netlify Blobs недоступны: " + (err.message || err),
    });
  }

  if (event.httpMethod === "GET") {
    try {
      const orders = await readJson(s, ORDERS_KEY, []);
      let occupied = await readJson(s, OCCUPIED_KEY, []);
      occupied = (occupied || []).map((x) =>
        String(x).includes("|") ? x : `tyumen|${x}`
      );
      const reviews = await readJson(s, REVIEWS_KEY, []);
      const params = event.queryStringParameters || {};
      const token = params.token || "";
      const city = params.city || "";
      const admin = await adminFromToken(s, token);

      let outOrders = orders;
      if (admin) {
        outOrders = filterOrdersForAdmin(orders, admin);
      }

      let outOccupied = occupied;
      if (city && CITIES[city]) {
        outOccupied = occupied.filter((k) => k.startsWith(city + "|"));
      }

      return json(200, {
        ok: true,
        orders: outOrders,
        occupied: outOccupied,
        reviews,
        statusLabels: STATUS_LABELS,
        cities: CITIES,
      });
    } catch (err) {
      return json(500, { ok: false, error: err.message || "Read error" });
    }
  }

  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const action = payload.action || "create";

  try {
    if (action === "create") {
      if (!payload.customerPhone || !payload.startDate || !payload.endDate) {
        return json(400, { ok: false, error: "Недостаточно данных заказа" });
      }
      return await handleCreate(s, payload);
    }
    if (action === "updateStatus") return await handleUpdateStatus(s, payload);
    if (action === "addComment") return await handleAddComment(s, payload);
    if (action === "createPromo") return await handleCreatePromo(s, payload);
    if (action === "listPromos") return await handleListPromos(s);
    if (action === "addReview") return await handleAddReview(s, payload);
    return json(400, { ok: false, error: "Unknown action" });
  } catch (err) {
    return json(500, { ok: false, error: err.message || "Write error" });
  }
};
