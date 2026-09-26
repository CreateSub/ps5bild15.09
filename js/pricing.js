/**
 * Pricing by console model (same for all cities).
 *
 * Fixed: 1 day, 2 days.
 * From 3 days: daily rate × days.
 * From 7 days (week+): cheaper daily rate × days.
 */
(function (global) {
  const TARIFFS = {
    ps5_pro: {
      label: "PS5 PRO",
      p1: 1699,
      p2: 2499,
      from3Daily: 1199,
      from7Daily: 799,
    },
    ps5: {
      label: "PS5",
      p1: 1199,
      p2: 1999,
      from3Daily: 899,
      from7Daily: 599,
    },
    vr2: {
      label: "VR2",
      p1: 1199,
      p2: 1999,
      from3Daily: 899,
      from7Daily: 599,
    },
    periphery: {
      label: "Периферия",
      p1: 1199,
      p2: 1999,
      from3Daily: 899,
      from7Daily: 599,
    },
  };

  const EXTRA_GAMEPAD_PRICE = 300;

  function getTariff(model) {
    return TARIFFS[model] || TARIFFS.ps5;
  }

  function calculateRentalPrice(days, model) {
    const t = getTariff(model);
    const d = Math.floor(Number(days));
    if (!Number.isFinite(d) || d < 1) return 0;
    if (d === 1) return t.p1;
    if (d === 2) return t.p2;
    if (d >= 7) return t.from7Daily * d;
    return t.from3Daily * d;
  }

  function durationDays(startKey, endKey) {
    if (!startKey || !endKey) return 0;
    const [ys, ms, ds] = startKey.split("-").map(Number);
    const [ye, me, de] = endKey.split("-").map(Number);
    const start = Date.UTC(ys, ms - 1, ds);
    const end = Date.UTC(ye, me - 1, de);
    const diff = Math.round((end - start) / 86400000);
    return diff < 1 ? 0 : diff;
  }

  function describePricing(days, model) {
    const t = getTariff(model);
    if (days < 1) return "Выберите период";
    const total = calculateRentalPrice(days, model).toLocaleString("ru-RU");
    if (days === 1) return `${t.label}: 1 день — ${total} ₽`;
    if (days === 2) return `${t.label}: 2 дня — ${total} ₽`;
    if (days >= 7) {
      return `${t.label}: ${days} дн. × ${t.from7Daily.toLocaleString("ru-RU")} ₽ = ${total} ₽`;
    }
    return `${t.label}: ${days} дн. × ${t.from3Daily.toLocaleString("ru-RU")} ₽ = ${total} ₽`;
  }

  function tariffHint(model) {
    const t = getTariff(model);
    return (
      `Тариф ${t.label}: 1 дн. — ${t.p1.toLocaleString("ru-RU")} ₽ · ` +
      `2 — ${t.p2.toLocaleString("ru-RU")} · ` +
      `от 3 дн. — ${t.from3Daily.toLocaleString("ru-RU")}/сут. · ` +
      `от 7 дн. — ${t.from7Daily.toLocaleString("ru-RU")}/сут.`
    );
  }

  function applyDiscount(base, percent) {
    const p = Math.max(0, Math.min(90, Number(percent) || 0));
    const b = Math.max(0, Math.round(Number(base) || 0));
    if (!p) return b;
    return Math.max(0, Math.round(b * (1 - p / 100)));
  }

  global.PricingService = {
    calculateRentalPrice,
    durationDays,
    describePricing,
    tariffHint,
    applyDiscount,
    getTariff,
    TARIFFS,
    EXTRA_GAMEPAD_PRICE,
  };
})(window);
