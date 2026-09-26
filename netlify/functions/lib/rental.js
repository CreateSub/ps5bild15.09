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
  if (d === 1) return t.p1;
  if (d === 2) return t.p2;
  if (d >= 7) return t.from7Daily * d;
  return t.from3Daily * d;
}

function rentalEndsAt(order) {
  if (order.endsAt) return order.endsAt;
  if (!order.issuedAt) return null;
  const issued = Date.parse(order.issuedAt);
  if (!Number.isFinite(issued)) return null;
  return new Date(issued + (Number(order.days) || 1) * DAY_MS).toISOString();
}

module.exports = { DAY_MS, REMIND_BEFORE_MS, calculateRentalPrice, rentalEndsAt };
