/**
 * Время аренды: таймер идёт с момента выдачи консоли (issuedAt), длительность — days × 24 ч.
 * Тарифы продублированы из js/pricing.js, чтобы сервер сам считал цену продления.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const REMIND_BEFORE_MS = 12 * 60 * 60 * 1000;

const TARIFFS = {
  ps5_pro: { p1: 1699, p2: 2499, from3Daily: 1199, from7Daily: 799 },
  ps5: { p1: 1199, p2: 1999, from3Daily: 899, from7Daily: 599 },
  vr2: { p1: 1199, p2: 1999, from3Daily: 899, from7Daily: 599 },
  periphery: { p1: 1199, p2: 1999, from3Daily: 899, from7Daily: 599 },
};

function calculateRentalPrice(days, model) {
  const t = TARIFFS[model] || TARIFFS.ps5;
  const d = Math.floor(Number(days));
  if (!Number.isFinite(d) || d < 1) return 0;
  if (d >= 30) return 399 * d;
  if (d === 1) return t.p1;
  if (d === 2) return t.p2;
  if (d >= 7) return t.from7Daily * d;
  return t.from3Daily * d;
}

function calculateTvPrice(days) {
  const d = Math.floor(Number(days));
  if (!Number.isFinite(d) || d < 1) return 0;
  if (d === 1) return 799;
  if (d === 2) return 599 * 2;
  if (d >= 30) return 199 * d;
  if (d >= 7) return 299 * d;
  return 399 * d;
}

function calculateGamepadPrice(days, qty) {
  const d = Math.floor(Number(days));
  const count = Number(qty) || 0;
  if (!Number.isFinite(d) || d < 1 || count < 1) return 0;
  if (d === 1) return count === 1 ? 300 : 600;
  return (count === 1 ? 200 : 400) * d;
}

function rentalEndsAt(order) {
  if (order.endsAt) return order.endsAt;
  if (!order.issuedAt) return null;
  const issued = Date.parse(order.issuedAt);
  if (!Number.isFinite(issued)) return null;
  return new Date(issued + (Number(order.days) || 1) * DAY_MS).toISOString();
}

/** Выданная аренда закончилась: по таймеру выдачи или в 16:00 дня возврата (Тюмень). */
function rentalHasEnded(order, now = Date.now()) {
  const status = order.status === "active" ? "pending" : order.status;
  if (status !== "issued") return false;
  const ends = rentalEndsAt(order);
  if (ends) return Date.parse(ends) <= now;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(order.endDate || ""))) return false;
  const [y, m, d] = order.endDate.split("-").map(Number);
  return now >= Date.UTC(y, m - 1, d, 11, 0, 0);
}

function archiveExpired(orders, now = Date.now()) {
  let changed = false;
  orders.forEach((order) => {
    if (!rentalHasEnded(order, now)) return;
    const stamp = new Date(now).toISOString();
    order.status = "completed";
    order.completedAt = stamp;
    order.updatedAt = stamp;
    changed = true;
  });
  return changed;
}

module.exports = {
  DAY_MS,
  REMIND_BEFORE_MS,
  calculateRentalPrice,
  calculateTvPrice,
  calculateGamepadPrice,
  rentalEndsAt,
  rentalHasEnded,
  archiveExpired,
};
