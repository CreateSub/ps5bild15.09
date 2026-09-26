/* PS5 Rental bundle: intro + pricing + backend + catalog + app */
/**
 * Intro overlay — DualSense collision + logo handoff.
 * Isolated from the main app: replace #app-shell freely without touching this file.
 *
 * Public API:
 *   window.Ps5Intro.start({ onComplete?: () => void })
 *   window.Ps5Intro.skip()
 */
(function (global) {
  const TIMING = {
    logoToCornerAt: 5900,
    fadeIntroAt: 7350,
    removeIntroAt: 8500,
  };

  let timers = [];
  let rafId = 0;
  let finished = false;

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function schedule(fn, ms) {
    timers.push(setTimeout(fn, ms));
  }

  function finish(onComplete) {
    if (finished) return;
    finished = true;
    clearTimers();

    const intro = document.getElementById("intro");
    const siteLogo = document.getElementById("site-logo");
    const appShell = document.getElementById("app-shell");

    document.body.classList.remove("intro-active");
    document.body.classList.add("intro-done");

    if (siteLogo) {
      siteLogo.classList.add("is-visible");
    }
    if (appShell) {
      appShell.classList.add("is-ready");
      appShell.removeAttribute("aria-hidden");
    }
    if (intro) {
      intro.style.opacity = "0";
      schedule(() => {
        intro.style.display = "none";
        intro.setAttribute("aria-hidden", "true");
      }, 1000);
    }

    if (typeof onComplete === "function") onComplete();
  }

  function startParticles(canvas) {
    if (!canvas) return () => {};
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    let W = 0;
    let H = 0;
    let DPR = 1;
    const particles = [];
    const animationStart = performance.now();
    let running = true;

    function resizeCanvas() {
      DPR = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    for (let i = 0; i < 450; i += 1) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 3,
        radius: 0.5 + Math.random() * 2,
        delay: Math.random() * 1.8,
      });
    }

    function renderParticles(currentTime) {
      if (!running) return;
      const elapsed = (currentTime - animationStart) / 1000;
      ctx.clearRect(0, 0, W, H);

      if (elapsed > 2.1 && elapsed < 6) {
        const time = elapsed - 2.1;
        const centerX = W / 2;
        const centerY = H / 2;

        particles.forEach((particle) => {
          if (time < particle.delay) return;
          const localTime = time - particle.delay;
          const distance = localTime * localTime * 95 * particle.speed;
          const x = centerX + Math.cos(particle.angle) * distance;
          const y = centerY + Math.sin(particle.angle) * distance;

          ctx.globalAlpha = Math.max(0, Math.min(1, 1 - localTime / 2.6));
          ctx.fillStyle = particle.speed > 2 ? "#e5b85d" : "#ffffff";
          ctx.beginPath();
          ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      rafId = requestAnimationFrame(renderParticles);
    }

    rafId = requestAnimationFrame(renderParticles);

    return function stopParticles() {
      running = false;
      window.removeEventListener("resize", resizeCanvas);
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };
  }

  function start(options) {
    const opts = options || {};
    const onComplete = opts.onComplete;
    const intro = document.getElementById("intro");
    const logo = intro && intro.querySelector(".intro-logo");
    const siteLogo = document.getElementById("site-logo");
    const appShell = document.getElementById("app-shell");

    if (
      !intro ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finish(onComplete);
      return;
    }

    finished = false;
    document.body.classList.add("intro-active");
    if (appShell) appShell.setAttribute("aria-hidden", "true");

    const stopParticles = startParticles(document.getElementById("intro-fx"));

    // Этап 2: логотип улетает в левый верхний угол
    schedule(() => {
      if (logo) {
        logo.style.animation =
          "logoToCorner 1.4s cubic-bezier(.22,.8,.2,1) forwards";
      }
    }, TIMING.logoToCornerAt);

    // Этап 3: fade intro + показать постоянный логотип сайта
    schedule(() => {
      intro.style.opacity = "0";
      if (siteLogo) siteLogo.classList.add("is-visible");
      if (appShell) appShell.classList.add("is-ready");
      document.body.classList.remove("intro-active");
      document.body.classList.add("intro-done");
    }, TIMING.fadeIntroAt);

    // Этап 4: убрать intro из DOM-потока
    schedule(() => {
      stopParticles();
      intro.style.display = "none";
      intro.setAttribute("aria-hidden", "true");
      finished = true;
      if (typeof onComplete === "function") onComplete();
    }, TIMING.removeIntroAt);
  }

  function skip(onComplete) {
    finish(onComplete);
  }

  global.Ps5Intro = { start, skip, TIMING };

  function boot() {
    if (!global.Ps5Intro) return;
    global.Ps5Intro.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);

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


/**
 * Backend layer — client localStorage + Netlify Functions API.
 * Admin passwords live in Netlify Blobs (admin-api) so login works from any device.
 */
(function (global) {
  const KEYS = {
    users: "ps5_rental_users",
    session: "ps5_rental_session",
    adminSession: "ps5_rental_admin_session",
    adminAccounts: "ps5_rental_admin_accounts",
    orders: "ps5_rental_orders",
    occupied: "ps5_rental_bookings",
    reviews: "ps5_rental_reviews",
    inventory: "ps5_rental_inventory",
    manualClients: "ps5_rental_manual_clients",
    promos: "ps5_rental_promos",
  };

  const LOYALTY_LEVELS = [
    { id: "none", min: 0, percent: 0, label: "Новичок", nextAt: 5 },
    { id: "bronze", min: 5, percent: 15, label: "Бронза", nextAt: 15 },
    { id: "silver", min: 15, percent: 20, label: "Серебро", nextAt: 20 },
    { id: "gold", min: 20, percent: 25, label: "Золото", nextAt: 25 },
    { id: "platinum", min: 25, percent: 30, label: "Платина", nextAt: null },
  ];

  const STATUS_LABELS = {
    pending: "Новая заявка",
    issued: "Аренда выдана",
    rejected: "В аренде отказано",
    completed: "Аренда завершена",
    active: "Новая заявка",
  };

  const CITIES = {
    tyumen: "Тюмень",
    surgut: "Сургут",
    nefteyugansk: "Нефтеюганск",
  };

  const ALL_CITIES = ["tyumen", "surgut", "nefteyugansk"];

  const PICKUP_BY_CITY = {
    tyumen: "г. Тюмень, ул. Павла Шарова 1к1, 6 подъезд",
    surgut: "г. Сургут, проспект Ленина 16",
    nefteyugansk: "г. Нефтеюганск — адрес уточнит менеджер",
  };

  const INITIAL_ADMIN_PASSWORD = "12345";
  const ADMIN_API = "/.netlify/functions/admin-api";
  const AUTH_API = "/.netlify/functions/auth";

  const ADMIN_SEED = [
    {
      phone: "79821415152",
      name: "Главный администратор",
      role: "super",
      cities: ALL_CITIES.slice(),
    },
    {
      phone: "79227702068",
      name: "Администратор",
      role: "super",
      cities: ALL_CITIES.slice(),
    },
    {
      phone: "79090490349",
      name: "Админ Нефтеюганск",
      role: "city",
      cities: ["nefteyugansk"],
    },
  ];

  const RETIRED_TEST_PHONE = "79026936225";

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizePhone(phone) {
    let d = String(phone || "").replace(/\D/g, "");
    if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
    return d;
  }

  function ensureSeedUsers() {
    return readJson(KEYS.users, []);
  }

  /** Убирает бывший тестовый аккаунт, который раньше создавался у каждого посетителя. */
  function removeRetiredTestUser() {
    const users = readJson(KEYS.users, []);
    const kept = users.filter((u) => normalizePhone(u.phone) !== RETIRED_TEST_PHONE);
    if (kept.length !== users.length) writeJson(KEYS.users, kept);
    const session = readJson(KEYS.session, null);
    if (session && normalizePhone(session.phone) === RETIRED_TEST_PHONE) {
      localStorage.removeItem(KEYS.session);
    }
  }

  function ensureSeedOccupied() {
    let occupied = readJson(KEYS.occupied, null);
    if (occupied) return occupied;
    writeJson(KEYS.occupied, []);
    return [];
  }

  function seedInventoryCatalog() {
    const items = [];
    const push = (city, type, code, label) => {
      items.push({
        id: `INV-${city}-${type}-${code}`,
        city,
        type,
        code: String(code),
        label,
        status: "available",
        createdAt: new Date().toISOString(),
      });
    };

    // Тюмень
    push("tyumen", "ps5_pro", "1", "PS5 PRO");
    ["1", "3", "4", "5", "6", "8", "9", "10", "2A", "3A", "4A", "5A", "6A", "7A"].forEach((c) =>
      push("tyumen", "ps5", c, "PS5")
    );
    push("tyumen", "vr2", "1", "VR2");

    // Сургут
    push("surgut", "ps5_pro", "2", "PS5 PRO");
    ["2", "7", "C1", "C2", "C4"].forEach((c) => push("surgut", "ps5", c, "PS5"));
    push("surgut", "vr2", "2", "VR2");

    // Нефтеюганск
    push("nefteyugansk", "ps5", "1A", "PS5");
    push("nefteyugansk", "ps5", "C3", "PS5");

    return items;
  }

  function ensureInventory() {
    let inv = readJson(KEYS.inventory, null);
    if (!Array.isArray(inv)) inv = [];
    const seed = seedInventoryCatalog();
    let changed = false;
    if (inv.length === 0) {
      inv = seed;
      changed = true;
    } else {
      seed.forEach((item) => {
        const exists = inv.some(
          (i) => i.city === item.city && i.type === item.type && i.code === item.code
        );
        if (!exists) {
          inv.push({ ...item });
          changed = true;
        }
      });
    }
    if (changed) writeJson(KEYS.inventory, inv);
    return inv;
  }

  function occKey(city, date) {
    return `${city || "tyumen"}|${date}`;
  }

  function ensureAdmins() {
    let list = readJson(KEYS.adminAccounts, []);
    if (!Array.isArray(list)) list = [];
    let changed = false;
    ADMIN_SEED.forEach((seed) => {
      const existing = list.find((a) => a.phone === seed.phone);
      if (!existing) {
        list.push({
          phone: seed.phone,
          name: seed.name,
          role: seed.role,
          cities: seed.cities.slice(),
          password: INITIAL_ADMIN_PASSWORD,
          mustChangePassword: true,
          updatedAt: new Date().toISOString(),
        });
        changed = true;
      } else {
        existing.name = seed.name;
        existing.role = seed.role;
        existing.cities = seed.cities.slice();
        if (!existing.password) {
          existing.password = INITIAL_ADMIN_PASSWORD;
          existing.mustChangePassword = true;
          changed = true;
        }
      }
    });
    if (changed) writeJson(KEYS.adminAccounts, list);
    return list;
  }

  function isAdminPhone(phone) {
    const digits = normalizePhone(phone);
    return ADMIN_SEED.some((a) => a.phone === digits);
  }

  function syncLocalAdminFromSession(phone, password, session) {
    const admins = ensureAdmins();
    const admin = admins.find((a) => a.phone === phone);
    if (!admin) return;
    if (password != null) admin.password = String(password);
    admin.mustChangePassword = Boolean(session.mustChangePassword);
    if (session.name) admin.name = session.name;
    if (session.adminRole) admin.role = session.adminRole;
    if (Array.isArray(session.cities)) admin.cities = session.cities.slice();
    admin.updatedAt = new Date().toISOString();
    writeJson(KEYS.adminAccounts, admins);
  }

  function publicAdminSession(admin) {
    return {
      role: "admin",
      phone: admin.phone,
      name: admin.name,
      adminRole: admin.role,
      cities: admin.cities.slice(),
      mustChangePassword: Boolean(admin.mustChangePassword),
      loggedInAt: new Date().toISOString(),
    };
  }

  function adminLoginLocal(phone, password) {
    const digits = normalizePhone(phone);
    const admins = ensureAdmins();
    const admin = admins.find((a) => a.phone === digits);
    if (!admin || String(password) !== String(admin.password)) {
      return { ok: false, error: "Неверный телефон или пароль администратора" };
    }
    const session = publicAdminSession(admin);
    writeJson(KEYS.adminSession, session);
    return { ok: true, session };
  }

  async function adminLogin(phone, password) {
    const digits = normalizePhone(phone);
    try {
      const res = await fetch(ADMIN_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", phone: digits, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.session) {
        writeJson(KEYS.adminSession, data.session);
        syncLocalAdminFromSession(digits, password, data.session);
        return { ok: true, session: data.session, synced: true };
      }
      if (res.status === 401 || res.status === 400) {
        return {
          ok: false,
          error: data.error || "Неверный телефон или пароль администратора",
        };
      }
    } catch (_) {
      /* offline / local file — fall back */
    }
    return adminLoginLocal(phone, password);
  }

  function adminChangePasswordLocal(newPassword, repeatPassword) {
    const session = getAdminSession();
    if (!session) return { ok: false, error: "Нет сессии" };
    const next = String(newPassword || "");
    const repeat = String(repeatPassword || "");
    if (next.length < 5) return { ok: false, error: "Пароль не короче 5 символов" };
    if (next !== repeat) return { ok: false, error: "Пароли не совпадают" };
    if (next === INITIAL_ADMIN_PASSWORD) {
      return { ok: false, error: "Придумайте пароль, отличный от стартового" };
    }
    const admins = ensureAdmins();
    const admin = admins.find((a) => a.phone === session.phone);
    if (!admin) return { ok: false, error: "Админ не найден" };
    admin.password = next;
    admin.mustChangePassword = false;
    admin.updatedAt = new Date().toISOString();
    writeJson(KEYS.adminAccounts, admins);
    session.mustChangePassword = false;
    writeJson(KEYS.adminSession, session);
    return { ok: true, session };
  }

  async function adminChangePassword(newPassword, repeatPassword) {
    const session = getAdminSession();
    if (!session) return { ok: false, error: "Нет сессии" };
    const next = String(newPassword || "");
    const repeat = String(repeatPassword || "");
    if (next.length < 5) return { ok: false, error: "Пароль не короче 5 символов" };
    if (next !== repeat) return { ok: false, error: "Пароли не совпадают" };
    if (next === INITIAL_ADMIN_PASSWORD) {
      return { ok: false, error: "Придумайте пароль, отличный от стартового" };
    }

    if (session.token) {
      try {
        const res = await fetch(ADMIN_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "changePassword",
            token: session.token,
            newPassword: next,
            currentPassword: "",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.session) {
          writeJson(KEYS.adminSession, data.session);
          syncLocalAdminFromSession(session.phone, next, data.session);
          return { ok: true, session: data.session, synced: true };
        }
        if (!res.ok) {
          return { ok: false, error: data.error || "Не удалось сохранить пароль на сервере" };
        }
      } catch (_) {
        /* keep local copy if the network is down */
      }
    }
    return adminChangePasswordLocal(newPassword, repeatPassword);
  }

  function listInventory() {
    const admin = getAdminSession();
    if (!admin) return Promise.resolve({ ok: false, error: "Нет сессии", inventory: [] });
    let inv = ensureInventory();
    if (admin.adminRole !== "super") {
      inv = inv.filter((i) => (admin.cities || []).includes(i.city));
    }
    return Promise.resolve({ ok: true, inventory: inv, cities: CITIES });
  }

  function addInventory({ city, type, code, label }) {
    const admin = getAdminSession();
    if (!admin) return Promise.resolve({ ok: false, error: "Нет сессии" });
    if (!CITIES[city] || !["ps5", "ps5_pro", "vr2"].includes(type) || !code || !label) {
      return Promise.resolve({ ok: false, error: "Укажите город, тип, код и название" });
    }
    if (admin.adminRole !== "super" && !(admin.cities || []).includes(city)) {
      return Promise.resolve({ ok: false, error: "Нет доступа к этому городу" });
    }
    const inv = ensureInventory();
    const codeStr = String(code).trim();
    if (inv.some((i) => i.city === city && i.type === type && i.code === codeStr)) {
      return Promise.resolve({ ok: false, error: "Такая приставка уже есть в базе" });
    }
    const item = {
      id: `INV-${city}-${type}-${codeStr}-${Date.now().toString(36)}`,
      city,
      type,
      code: codeStr,
      label: String(label).trim(),
      status: "available",
      createdAt: new Date().toISOString(),
    };
    inv.push(item);
    writeJson(KEYS.inventory, inv);
    const filtered =
      admin.adminRole === "super" ? inv : inv.filter((i) => (admin.cities || []).includes(i.city));
    return Promise.resolve({ ok: true, item, inventory: filtered });
  }

  function removeInventory(id) {
    const admin = getAdminSession();
    if (!admin) return Promise.resolve({ ok: false, error: "Нет сессии" });
    const inv = ensureInventory();
    const idx = inv.findIndex((i) => i.id === id);
    if (idx < 0) return Promise.resolve({ ok: false, error: "Не найдено" });
    if (admin.adminRole !== "super" && !(admin.cities || []).includes(inv[idx].city)) {
      return Promise.resolve({ ok: false, error: "Нет доступа к этому городу" });
    }
    if (inv[idx].status === "rented") {
      return Promise.resolve({ ok: false, error: "Нельзя удалить приставку в аренде" });
    }
    inv.splice(idx, 1);
    writeJson(KEYS.inventory, inv);
    const filtered =
      admin.adminRole === "super" ? inv : inv.filter((i) => (admin.cities || []).includes(i.city));
    return Promise.resolve({ ok: true, inventory: filtered });
  }

  function getInventoryById(id) {
    return ensureInventory().find((i) => i.id === id) || null;
  }

  function listAvailableInventory(city, type, includeOrderId) {
    return ensureInventory().filter((i) => {
      if (i.status === "rented" && i.rentedOrderId !== includeOrderId) return false;
      if (city && i.city !== city) return false;
      if (type && i.type !== type) return false;
      return true;
    });
  }

  function assignConsoleToOrder(orderId, inventoryId) {
    const admin = getAdminSession();
    if (!admin) return { ok: false, error: "Нет сессии" };
    const orders = listOrders();
    const oIdx = orders.findIndex((o) => o.id === orderId);
    if (oIdx < 0) return { ok: false, error: "Заказ не найден" };
    const order = { ...orders[oIdx] };
    const st = order.status === "active" ? "pending" : order.status;
    if (st !== "issued") {
      return { ok: false, error: "Приставку можно назначить только после выдачи аренды" };
    }
    const inv = ensureInventory();
    const iIdx = inv.findIndex((i) => i.id === inventoryId);
    if (iIdx < 0) return { ok: false, error: "Приставка не найдена" };
    const item = inv[iIdx];
    if (item.status === "rented" && order.assignedConsoleId !== item.id) {
      return { ok: false, error: "Эта приставка уже занята" };
    }
    if (item.city !== (order.city || "tyumen")) {
      return { ok: false, error: "Город приставки не совпадает с заказом" };
    }

    // free previous if re-assigning
    if (order.assignedConsoleId && order.assignedConsoleId !== inventoryId) {
      const prev = inv.findIndex((i) => i.id === order.assignedConsoleId);
      if (prev >= 0) {
        inv[prev].status = "available";
        inv[prev].rentedOrderId = null;
        inv[prev].rentedPhone = null;
        inv[prev].rentedName = null;
      }
    }

    item.status = "rented";
    item.rentedOrderId = order.id;
    item.rentedPhone = order.customerPhone;
    item.rentedName = order.customerName;
    item.rentedFrom = order.startDate;
    item.rentedTo = order.endDate;

    order.assignedConsoleId = item.id;
    order.assignedConsoleCode = item.code;
    order.assignedConsoleLabel = item.label;
    order.assignedConsoleType = item.type;
    order.updatedAt = new Date().toISOString();

    orders[oIdx] = order;
    writeJson(KEYS.orders, orders);
    writeJson(KEYS.inventory, inv);
    return { ok: true, order, item };
  }

  function addOrderComment(orderId, text) {
    const admin = getAdminSession();
    if (!admin) return { ok: false, error: "Нет сессии" };
    const comment = String(text || "").trim().slice(0, 1000);
    if (!comment) return { ok: false, error: "Введите комментарий" };

    const orders = listOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return { ok: false, error: "Заказ не найден" };
    const order = { ...orders[idx] };
    if (!adminCanAccessCity(order.city || "tyumen")) {
      return { ok: false, error: "Нет доступа к заказам этого города" };
    }
    if (!Array.isArray(order.adminComments)) order.adminComments = [];
    order.adminComments.push({
      id: `CMT-${Date.now().toString(36).toUpperCase()}`,
      text: comment,
      author: admin.name || admin.phone || "Админ",
      createdAt: new Date().toISOString(),
    });
    order.updatedAt = new Date().toISOString();
    orders[idx] = order;
    writeJson(KEYS.orders, orders);
    return { ok: true, order };
  }

  async function addOrderCommentRemote(orderId, text) {
    const local = addOrderComment(orderId, text);
    if (!local.ok) return local;
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          id: orderId,
          text,
          author: local.order.adminComments.slice(-1)[0].author,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.order) {
        const orders = listOrders();
        const i = orders.findIndex((o) => o.id === orderId);
        if (i >= 0) orders[i] = data.order;
        else orders.unshift(data.order);
        writeJson(KEYS.orders, orders);
        return { ok: true, order: data.order, synced: true };
      }
      return { ok: true, order: local.order, synced: false, error: data.error };
    } catch (err) {
      return { ok: true, order: local.order, synced: false, error: err.message || "Сеть" };
    }
  }

  function releaseConsoleForOrder(orderId) {
    const inv = ensureInventory();
    const orders = listOrders();
    const order = orders.find((o) => o.id === orderId);
    let changed = false;
    if (order && order.assignedConsoleId) {
      const idx = inv.findIndex((i) => i.id === order.assignedConsoleId);
      if (idx >= 0) {
        inv[idx].status = "available";
        inv[idx].rentedOrderId = null;
        inv[idx].rentedPhone = null;
        inv[idx].rentedName = null;
        inv[idx].rentedFrom = null;
        inv[idx].rentedTo = null;
        changed = true;
      }
    }
    // also clear by rentedOrderId
    inv.forEach((i) => {
      if (i.rentedOrderId === orderId) {
        i.status = "available";
        i.rentedOrderId = null;
        i.rentedPhone = null;
        i.rentedName = null;
        i.rentedFrom = null;
        i.rentedTo = null;
        changed = true;
      }
    });
    if (changed) writeJson(KEYS.inventory, inv);
  }

  function addManualClient({ fio, phone, city, note, startDate, endDate }) {
    const digits = normalizePhone(phone);
    const name = String(fio || "").trim();
    if (!name || digits.length < 10) {
      return { ok: false, error: "Укажите ФИО и телефон" };
    }
    const admin = getAdminSession();
    let cityId = city;
    if (admin && admin.adminRole === "city") {
      cityId = (admin.cities && admin.cities[0]) || "nefteyugansk";
    }
    if (cityId && !CITIES[cityId]) {
      return { ok: false, error: "Некорректный город" };
    }
    if (admin && cityId && !adminCanAccessCity(cityId)) {
      return { ok: false, error: "Нет доступа к этому городу" };
    }
    if (!startDate || !endDate || endDate <= startDate) {
      return { ok: false, error: "Выберите период аренды в мини-календаре" };
    }

    const list = readJson(KEYS.manualClients, []);
    let client = list.find((c) => c.phone === digits);
    if (!client) {
      client = {
        id: `CL-${Date.now().toString(36).toUpperCase()}`,
        fio: name,
        phone: digits,
        city: cityId || null,
        note: String(note || "").trim().slice(0, 200),
        source: "manual",
        createdAt: new Date().toISOString(),
      };
      list.unshift(client);
    } else {
      client.fio = name;
      if (cityId) client.city = cityId;
      if (note) client.note = String(note).trim().slice(0, 200);
    }
    writeJson(KEYS.manualClients, list);

    return {
      ok: true,
      client,
      startDate,
      endDate,
      city: cityId || "tyumen",
      days: datesInRange(startDate, endDate).length,
    };
  }

  function listManualClients() {
    const list = readJson(KEYS.manualClients, []);
    const admin = getAdminSession();
    if (!admin || admin.adminRole === "super") return list;
    const cities = admin.cities || [];
    return list.filter((c) => c.city && cities.includes(c.city));
  }

  function adminLogout() {
    localStorage.removeItem(KEYS.adminSession);
  }

  function getAdminSession() {
    return readJson(KEYS.adminSession, null);
  }

  function clientLoginLocal(phone, password) {
    const digits = normalizePhone(phone);
    const users = ensureSeedUsers();
    const user = users.find((u) => normalizePhone(u.phone) === digits && String(u.password) === String(password));
    if (!user) return { ok: false, error: "Неверный телефон или пароль" };
    const session = {
      role: "client",
      phone: user.phone,
      fio: user.fio,
      loyaltyStatus: user.loyaltyStatus || "standard",
    };
    writeJson(KEYS.session, session);
    return { ok: true, session };
  }

  function syncLocalUser(phone, password, session) {
    const digits = normalizePhone(phone);
    const users = ensureSeedUsers();
    let user = users.find((u) => normalizePhone(u.phone) === digits);
    if (!user) {
      user = {
        fio: session.fio || "",
        phone: digits,
        password: String(password),
        loyaltyStatus: session.loyaltyStatus || "standard",
      };
      users.push(user);
    } else {
      user.password = String(password);
      if (session.fio) user.fio = session.fio;
    }
    writeJson(KEYS.users, users);
  }

  async function clientLogin(phone, password) {
    const digits = normalizePhone(phone);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", phone: digits, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.session) {
        writeJson(KEYS.session, data.session);
        syncLocalUser(digits, password, data.session);
        return { ok: true, session: data.session, synced: true };
      }
      if (res.status === 401 || res.status === 400) {
        const local = clientLoginLocal(digits, password);
        if (local.ok) {
          const migrated = await clientRegisterRemote({
            fio: local.session.fio,
            phone: digits,
            password,
          });
          if (migrated.ok) return migrated;
          if (migrated.status === 409) {
            return { ok: false, error: "Неверный телефон или пароль" };
          }
          return local;
        }
        return { ok: false, error: data.error || "Неверный телефон или пароль" };
      }
    } catch (_) {
      /* offline */
    }
    return clientLoginLocal(phone, password);
  }

  async function clientRegisterRemote({ fio, phone, password }) {
    const digits = normalizePhone(phone);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", fio, phone: digits, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.session) {
        writeJson(KEYS.session, data.session);
        syncLocalUser(digits, password, data.session);
        return { ok: true, session: data.session, synced: true };
      }
      return {
        ok: false,
        status: res.status,
        error: data.error || "Не удалось зарегистрироваться",
      };
    } catch (err) {
      return { ok: false, error: err.message || "Сеть" };
    }
  }

  function clientRegisterLocal({ fio, phone, password }) {
    const users = ensureSeedUsers();
    const digits = normalizePhone(phone);
    if (isAdminPhone(digits)) {
      return { ok: false, error: "Этот номер зарезервирован" };
    }
    if (users.some((u) => normalizePhone(u.phone) === digits)) {
      return { ok: false, error: "Такой телефон уже зарегистрирован" };
    }
    const user = { fio, phone: digits, password, loyaltyStatus: "standard" };
    users.push(user);
    writeJson(KEYS.users, users);
    const session = { role: "client", phone: digits, fio, loyaltyStatus: "standard" };
    writeJson(KEYS.session, session);
    return { ok: true, session };
  }

  async function clientRegister({ fio, phone, password }) {
    const digits = normalizePhone(phone);
    if (isAdminPhone(digits)) {
      return { ok: false, error: "Этот номер зарезервирован" };
    }
    const remote = await clientRegisterRemote({ fio, phone: digits, password });
    if (remote.ok) return remote;
    if (remote.status === 409 || remote.status === 400) return remote;
    return clientRegisterLocal({ fio, phone: digits, password });
  }

  async function requestPasswordReset(phone) {
    const digits = normalizePhone(phone);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestReset", phone: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return { ok: true, message: data.message };
      return { ok: false, error: data.error || "Не удалось отправить код" };
    } catch {
      return { ok: false, error: "Нет связи с сервером. Откройте сайт на Netlify." };
    }
  }

  async function confirmPasswordReset({ phone, code, newPassword, repeatPassword }) {
    const digits = normalizePhone(phone);
    try {
      const res = await fetch(AUTH_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirmReset",
          phone: digits,
          code,
          newPassword,
          repeatPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        const users = ensureSeedUsers();
        const user = users.find((u) => normalizePhone(u.phone) === digits);
        if (user) {
          user.password = String(newPassword);
          writeJson(KEYS.users, users);
        }
        const admins = ensureAdmins();
        const admin = admins.find((a) => a.phone === digits);
        if (admin) {
          admin.password = String(newPassword);
          admin.mustChangePassword = false;
          writeJson(KEYS.adminAccounts, admins);
        }
        return { ok: true, role: data.role, message: data.message };
      }
      return { ok: false, error: data.error || "Не удалось сменить пароль" };
    } catch {
      return { ok: false, error: "Нет связи с сервером. Откройте сайт на Netlify." };
    }
  }

  function clientLogout() {
    localStorage.removeItem(KEYS.session);
  }

  function getClientSession() {
    return readJson(KEYS.session, null);
  }

  function adminCanAccessCity(city) {
    const admin = getAdminSession();
    if (!admin) return false;
    if (admin.adminRole === "super") return true;
    return (admin.cities || []).includes(city);
  }

  function filterOrdersForAdmin(orders) {
    const admin = getAdminSession();
    if (!admin) return orders;
    if (admin.adminRole === "super") return orders;
    const cities = admin.cities || [];
    return orders.filter((o) => cities.includes(o.city || "tyumen"));
  }

  function listClients() {
    const map = new Map();

    listManualClients().forEach((c) => {
      map.set(c.phone, {
        fio: c.fio,
        phone: c.phone,
        cities: c.city ? new Set([c.city]) : new Set(),
        source: "Звонок / вручную",
        note: c.note || "",
      });
    });

    filterOrdersForAdmin(listOrders()).forEach((o) => {
      const phone = o.customerPhone;
      if (!phone) return;
      if (!map.has(phone)) {
        map.set(phone, {
          fio: o.customerName || "—",
          phone,
          cities: new Set(),
          source: "Сайт",
          note: "",
        });
      }
      const row = map.get(phone);
      if (o.customerName) row.fio = o.customerName;
      if (o.city) row.cities.add(o.city);
      if (row.source === "Звонок / вручную") row.source = "Вручную + сайт";
    });

    return Array.from(map.values()).map((c) => ({
      fio: c.fio,
      phone: c.phone,
      cities: Array.from(c.cities),
      cityLabels: Array.from(c.cities)
        .map((id) => CITIES[id] || id)
        .join(", ") || "—",
      source: c.source,
      note: c.note,
    }));
  }

  function listOrders() {
    return readJson(KEYS.orders, []);
  }

  function getOccupiedDates(city) {
    const c = city || "tyumen";
    const raw = ensureSeedOccupied();
    const set = new Set();
    raw.forEach((k) => {
      const s = String(k);
      if (s.includes("|")) {
        const [oc, date] = s.split("|");
        if (oc === c) set.add(date);
      } else if (c === "tyumen") {
        set.add(s);
      }
    });
    return set;
  }

  async function syncFromServer(opts) {
    const city = opts && opts.city;
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    const q = params.toString() ? `?${params}` : "";
    try {
      const res = await fetch("/.netlify/functions/orders" + q);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || `HTTP ${res.status}` };
      }
      if (Array.isArray(data.orders)) {
        writeJson(KEYS.orders, data.orders);
      }
      if (Array.isArray(data.occupied)) {
        const prev = ensureSeedOccupied();
        let next;
        if (city) {
          const kept = prev.filter((k) => !String(k).startsWith(city + "|"));
          next = kept.concat(data.occupied);
        } else {
          next = data.occupied;
        }
        writeJson(KEYS.occupied, next);
      }
      if (Array.isArray(data.reviews)) writeJson(KEYS.reviews, data.reviews);
      return {
        ok: true,
        orders: data.orders || [],
        occupied: data.occupied || [],
        reviews: data.reviews || [],
      };
    } catch (err) {
      return { ok: false, error: err.message || "Сеть" };
    }
  }

  async function listOrdersRemote() {
    const sync = await syncFromServer();
    if (sync.ok) return filterOrdersForAdmin(sync.orders);
    return filterOrdersForAdmin(listOrders());
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

  function isRangeAvailable(startKey, endKey, city) {
    const occupied = getOccupiedDates(city || "tyumen");
    return datesInRange(startKey, endKey).every((k) => !occupied.has(k));
  }

  function countCompletedRentals(phone) {
    const p = normalizePhone(phone);
    return listOrders().filter((o) => {
      if (normalizePhone(o.customerPhone) !== p) return false;
      return o.status === "completed" || o.status === "issued";
    }).length;
  }

  function getLoyaltyForCount(count) {
    let level = LOYALTY_LEVELS[0];
    LOYALTY_LEVELS.forEach((l) => {
      if (count >= l.min) level = l;
    });
    return {
      ...level,
      orderCount: count,
      remaining: level.nextAt ? Math.max(0, level.nextAt - count) : 0,
    };
  }

  function getClientLoyalty(phone) {
    return getLoyaltyForCount(countCompletedRentals(phone));
  }

  function listClientOrders(phone) {
    const p = normalizePhone(phone);
    return listOrders().filter((o) => normalizePhone(o.customerPhone) === p);
  }

  function listPromos() {
    return readJson(KEYS.promos, []);
  }

  function normalizePromoCode(code) {
    return String(code || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
  }

  function makePromoCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "PR-";
    for (let i = 0; i < 6; i += 1) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  function createPromoLocal(percent, city) {
    const admin = getAdminSession();
    if (!admin) return { ok: false, error: "Нет сессии" };
    const p = Number(percent);
    if (![10, 15, 20, 25, 30, 40, 50].includes(p)) {
      return { ok: false, error: "Выберите процент скидки" };
    }
    let promoCity = city === "" || city == null || city === "all" ? null : String(city);
    if (admin.adminRole === "city") {
      promoCity = (admin.cities && admin.cities[0]) || "nefteyugansk";
    }
    if (promoCity && !CITIES[promoCity]) {
      return { ok: false, error: "Некорректный город" };
    }
    if (promoCity && !adminCanAccessCity(promoCity)) {
      return { ok: false, error: "Нет доступа к этому городу" };
    }
    const list = listPromos();
    const promo = {
      id: `PROMO-${Date.now().toString(36).toUpperCase()}`,
      code: makePromoCode(),
      percent: p,
      city: promoCity,
      used: false,
      usedAt: null,
      usedByPhone: null,
      usedOrderId: null,
      createdAt: new Date().toISOString(),
      createdBy: admin.name || admin.phone || "Админ",
    };
    list.unshift(promo);
    writeJson(KEYS.promos, list);
    return { ok: true, promo, promos: list };
  }

  function redeemPromoLocal(code, phone, orderId, city) {
    const normalized = normalizePromoCode(code);
    if (!normalized) return { ok: true, promo: null };
    const list = listPromos();
    const idx = list.findIndex((x) => normalizePromoCode(x.code) === normalized);
    if (idx < 0) return { ok: false, error: "Промокод не найден" };
    if (list[idx].used) return { ok: false, error: "Промокод уже использован" };
    if (list[idx].city && city && list[idx].city !== city) {
      return { ok: false, error: "Промокод не действует в этом городе" };
    }
    list[idx] = {
      ...list[idx],
      used: true,
      usedAt: new Date().toISOString(),
      usedByPhone: phone || null,
      usedOrderId: orderId || null,
    };
    writeJson(KEYS.promos, list);
    return { ok: true, promo: list[idx] };
  }

  function peekPromo(code, city) {
    const normalized = normalizePromoCode(code);
    if (!normalized) return { ok: true, promo: null };
    const found = listPromos().find((x) => normalizePromoCode(x.code) === normalized);
    if (!found) return { ok: false, error: "Промокод не найден", unknown: true };
    if (found.used) return { ok: false, error: "Промокод уже использован" };
    if (found.city && city && found.city !== city) {
      return { ok: false, error: "Промокод не действует в этом городе" };
    }
    return { ok: true, promo: found };
  }

  function filterPromosForAdmin(promos) {
    const admin = getAdminSession();
    const list = Array.isArray(promos) ? promos : [];
    if (!admin || admin.adminRole === "super") return list;
    const cities = admin.cities || [];
    return list.filter((p) => !p.city || cities.includes(p.city));
  }

  async function createPromoRemote(percent, city) {
    const local = createPromoLocal(percent, city);
    if (!local.ok) return local;
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createPromo",
          percent,
          city: local.promo.city || null,
          code: local.promo.code,
          createdBy: local.promo.createdBy,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.promo) {
        const list = listPromos();
        const i = list.findIndex((p) => p.code === local.promo.code);
        if (i >= 0) list[i] = data.promo;
        else list.unshift(data.promo);
        writeJson(KEYS.promos, list);
        return { ok: true, promo: data.promo, promos: list, synced: true };
      }
      return { ...local, synced: false, error: data.error };
    } catch (err) {
      return { ...local, synced: false, error: err.message || "Сеть" };
    }
  }

  async function listPromosRemote() {
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "listPromos" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.promos)) {
        writeJson(KEYS.promos, data.promos);
        return data.promos;
      }
    } catch (_) {
      /* local fallback */
    }
    return listPromos();
  }

  function formatDeliveryAddress(parts) {
    if (!parts) return null;
    const city = String(parts.city || "").trim();
    const street = String(parts.street || "").trim();
    const apt = String(parts.apt || "").trim();
    if (!city && !street && !apt) return null;
    return [city, street, apt ? `кв. ${apt}` : ""]
      .filter(Boolean)
      .join(", ");
  }

  function createOrderLocal(payload) {
    const city = payload.city || "tyumen";
    const orders = listOrders();
    const id = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const promoCode = normalizePromoCode(payload.promoCode);
    let promoPercent = 0;
    if (promoCode) {
      const redeemed = redeemPromoLocal(promoCode, payload.customerPhone, id, city);
      if (!redeemed.ok) return redeemed;
      promoPercent = Number(redeemed.promo && redeemed.promo.percent) || 0;
    }
    const loyalty = getClientLoyalty(payload.customerPhone);
    const discountPercent = Math.max(loyalty.percent, promoPercent);
    const basePrice = Number(payload.basePrice || payload.totalPrice) || 0;
    const extraGamepads = Number(payload.extraGamepads) || 0;
    const extrasPrice = extraGamepads * 300;
    const rentalTotal =
      global.PricingService && typeof global.PricingService.applyDiscount === "function"
        ? global.PricingService.applyDiscount(basePrice, discountPercent)
        : Math.round(basePrice * (1 - discountPercent / 100));
    const totalPrice = rentalTotal + extrasPrice;

    const deliveryCity = String((payload.deliveryCity || "")).trim();
    const deliveryStreet = String((payload.deliveryStreet || "")).trim();
    const deliveryApt = String((payload.deliveryApt || "")).trim();
    const deliveryAddress =
      payload.fulfillment === "delivery"
        ? formatDeliveryAddress({
            city: deliveryCity,
            street: deliveryStreet,
            apt: deliveryApt,
          }) || payload.deliveryAddress || null
        : null;

    const order = {
      id,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      city,
      cityLabel: CITIES[city] || city,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: payload.days,
      status: "pending",
      basePrice,
      totalPrice,
      loyaltyLevel: loyalty.id,
      loyaltyPercent: loyalty.percent,
      promoCode: promoCode || null,
      promoPercent,
      discountPercent,
      fulfillment: payload.fulfillment,
      deliveryCity: payload.fulfillment === "delivery" ? deliveryCity : null,
      deliveryStreet: payload.fulfillment === "delivery" ? deliveryStreet : null,
      deliveryApt: payload.fulfillment === "delivery" ? deliveryApt : null,
      deliveryAddress,
      pickupLocation:
        payload.fulfillment === "pickup" ? PICKUP_BY_CITY[city] || "" : null,
      product: payload.product || null,
      productLabel: payload.productLabel || "",
      consoleModel: payload.consoleModel || null,
      consoleLabel: payload.consoleLabel || "",
      extras: payload.extras || [],
      extraGamepads,
      extrasPrice,
      gameNote: String(payload.gameNote || "").trim().slice(0, 500),
      reviewLeft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.unshift(order);
    writeJson(KEYS.orders, orders);

    const occupied = ensureSeedOccupied();
    datesInRange(payload.startDate, payload.endDate).forEach((d) => {
      const k = occKey(city, d);
      if (!occupied.includes(k)) occupied.push(k);
    });
    writeJson(KEYS.occupied, occupied);

    return { ok: true, order };
  }

  function isDeployedSite() {
    try {
      const h = location.hostname || "";
      if (!h || h === "localhost" || h === "127.0.0.1") return false;
      if (location.protocol === "file:") return false;
      return true;
    } catch {
      return false;
    }
  }

  async function createOrder(payload) {
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        console.warn("Server createOrder failed:", data.error || res.status);
        if (data.error && res.status === 400) {
          return { ok: false, error: data.error };
        }
        if (isDeployedSite()) {
          const detail = data.error || `HTTP ${res.status}`;
          return {
            ok: false,
            synced: false,
            error:
              res.status === 404
                ? "Сервер заказов не найден (404). Залейте netlify.toml и папку netlify/functions в GitHub, затем Redeploy."
                : "Сервер не сохранил заявку: " + detail,
          };
        }
        const local = createOrderLocal(payload);
        return {
          ok: true,
          order: local.order,
          synced: false,
          error: data.error || `HTTP ${res.status}`,
        };
      }
      const orders = listOrders();
      const exists = orders.some((o) => o.id === data.order.id);
      if (!exists) orders.unshift(data.order);
      writeJson(KEYS.orders, orders);
      if (Array.isArray(data.occupied)) {
        writeJson(KEYS.occupied, data.occupied);
      }
      return { ok: true, order: data.order, synced: true };
    } catch (err) {
      console.warn("Server createOrder error:", err);
      if (isDeployedSite()) {
        return {
          ok: false,
          synced: false,
          error:
            "Нет связи с сервером заказов. Откройте сайт через Netlify (https://…netlify.app), не локальный файл.",
        };
      }
      const local = createOrderLocal(payload);
      return {
        ok: true,
        order: local.order,
        synced: false,
        error: err.message || "Сеть",
      };
    }
  }

  function rebuildOccupiedLocal(orders) {
    const set = new Set();
    orders.forEach((o) => {
      const st = o.status === "active" ? "pending" : o.status;
      if (st === "pending" || st === "issued") {
        const city = o.city || "tyumen";
        datesInRange(o.startDate, o.endDate).forEach((d) => set.add(occKey(city, d)));
      }
    });
    return Array.from(set);
  }

  function updateOrderStatusLocal(id, status) {
    const allowed = ["issued", "rejected", "completed"];
    if (!allowed.includes(status)) {
      return { ok: false, error: "Некорректный статус" };
    }
    const orders = listOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx < 0) return { ok: false, error: "Заказ не найден" };

    const order = { ...orders[idx] };
    if (!adminCanAccessCity(order.city || "tyumen")) {
      return { ok: false, error: "Нет доступа к заказам этого города" };
    }
    const current = order.status === "active" ? "pending" : order.status;

    if (status === "issued" && current !== "pending") {
      return { ok: false, error: "Выдать можно только новую заявку" };
    }
    if (status === "rejected" && current !== "pending") {
      return { ok: false, error: "Отклонить можно только новую заявку" };
    }
    if (status === "completed" && current !== "issued") {
      return { ok: false, error: "Завершить можно только выданную аренду" };
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (status === "completed") order.completedAt = order.updatedAt;
    if (status === "rejected") order.rejectedAt = order.updatedAt;
    if (status === "issued") order.issuedAt = order.updatedAt;
    if (status === "completed" || status === "rejected") {
      releaseConsoleForOrder(id);
      order.assignedConsoleId = null;
      order.assignedConsoleCode = null;
    }

    orders[idx] = order;
    writeJson(KEYS.orders, orders);
    writeJson(KEYS.occupied, rebuildOccupiedLocal(orders));
    return { ok: true, order, localOnly: true };
  }

  async function updateOrderStatus(id, status) {
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const local = updateOrderStatusLocal(id, status);
        if (local.ok) {
          return { ok: true, order: local.order, synced: false, error: data.error };
        }
        return { ok: false, error: data.error || local.error || `HTTP ${res.status}` };
      }
      const orders = listOrders();
      const idx = orders.findIndex((o) => o.id === id);
      if (idx >= 0) orders[idx] = data.order;
      else orders.unshift(data.order);
      writeJson(KEYS.orders, orders);
      if (Array.isArray(data.occupied)) writeJson(KEYS.occupied, data.occupied);
      if (status === "completed" || status === "rejected") {
        releaseConsoleForOrder(id);
      }
      return { ok: true, order: data.order, synced: true };
    } catch (err) {
      const local = updateOrderStatusLocal(id, status);
      if (local.ok) {
        return {
          ok: true,
          order: local.order,
          synced: false,
          error: err.message || "Сеть",
        };
      }
      return { ok: false, error: local.error || err.message || "Сеть" };
    }
  }

  function addReviewLocal({ orderId, customerPhone, customerName, rating, comment }) {
    const orders = listOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0) return { ok: false, error: "Заказ не найден" };
    const order = orders[idx];
    if (order.status !== "completed") {
      return { ok: false, error: "Отзыв доступен только после завершения аренды" };
    }
    if (String(order.customerPhone) !== String(customerPhone)) {
      return { ok: false, error: "Отзыв может оставить только клиент заказа" };
    }
    if (order.reviewLeft) {
      return { ok: false, error: "Отзыв по этому заказу уже оставлен" };
    }
    const review = {
      id: `REV-${Date.now().toString(36).toUpperCase()}`,
      orderId,
      customerName: customerName || order.customerName || "Клиент",
      customerPhone,
      rating: Number(rating),
      comment: String(comment || "").trim().slice(0, 800),
      productLabel: order.consoleLabel || order.productLabel || "",
      city: order.city || null,
      createdAt: new Date().toISOString(),
    };
    const reviews = listReviews();
    reviews.unshift(review);
    writeJson(KEYS.reviews, reviews);
    orders[idx] = { ...order, reviewLeft: true, reviewId: review.id };
    writeJson(KEYS.orders, orders);
    return { ok: true, review, reviews, localOnly: true };
  }

  async function addReview({ orderId, customerPhone, customerName, rating, comment }) {
    try {
      const res = await fetch("/.netlify/functions/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addReview",
          orderId,
          customerPhone,
          customerName,
          rating,
          comment,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const local = addReviewLocal({
          orderId,
          customerPhone,
          customerName,
          rating,
          comment,
        });
        if (local.ok) return { ...local, synced: false, error: data.error };
        return { ok: false, error: data.error || local.error || `HTTP ${res.status}` };
      }
      if (Array.isArray(data.reviews)) writeJson(KEYS.reviews, data.reviews);
      const orders = listOrders();
      const i = orders.findIndex((o) => o.id === orderId);
      if (i >= 0) {
        orders[i].reviewLeft = true;
        writeJson(KEYS.orders, orders);
      }
      return { ok: true, review: data.review, reviews: data.reviews, synced: true };
    } catch (err) {
      const local = addReviewLocal({
        orderId,
        customerPhone,
        customerName,
        rating,
        comment,
      });
      if (local.ok) {
        return { ...local, synced: false, error: err.message || "Сеть" };
      }
      return { ok: false, error: local.error || err.message || "Сеть" };
    }
  }

  function listReviews() {
    return readJson(KEYS.reviews, []);
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  function migrateUsers() {
    const users = readJson(KEYS.users, []);
    let changed = false;
    users.forEach((u) => {
      if (u.name && !u.fio) {
        u.fio = u.name;
        delete u.name;
        changed = true;
      }
      if (u.login && !u.phone) {
        u.phone = u.login;
        delete u.login;
        changed = true;
      }
    });
    if (changed) writeJson(KEYS.users, users);
  }

  migrateUsers();
  removeRetiredTestUser();
  ensureSeedOccupied();
  ensureAdmins();

  global.BackendAPI = {
    KEYS,
    CITIES,
    PICKUP_BY_CITY,
    PICKUP_LOCATION: PICKUP_BY_CITY.tyumen,
    adminLogin,
    adminChangePassword,
    isAdminPhone,
    listInventory,
    addInventory,
    removeInventory,
    getInventoryById,
    listAvailableInventory,
    assignConsoleToOrder,
    addOrderComment: addOrderCommentRemote,
    getClientLoyalty,
    getLoyaltyForCount,
    listClientOrders,
    LOYALTY_LEVELS,
    createPromo: createPromoRemote,
    listPromos,
    listPromosRemote,
    peekPromo,
    filterPromosForAdmin,
    formatDeliveryAddress,
    addManualClient,
    listManualClients,
    adminLogout,
    getAdminSession,
    clientLogin,
    clientRegister,
    requestPasswordReset,
    confirmPasswordReset,
    clientLogout,
    getClientSession,
    listClients,
    listOrders,
    listOrdersRemote,
    syncFromServer,
    getOccupiedDates,
    isRangeAvailable,
    datesInRange,
    createOrder,
    createOrderLocal,
    updateOrderStatus,
    addReview,
    listReviews,
    statusLabel,
    STATUS_LABELS,
    filterOrdersForAdmin,
    adminCanAccessCity,
  };
})(window);


/**
 * Снимки публичных каталогов подписок (не закрытый API).
 * Premium — каталог игр PS Plus (GAME_CATALOG) + классика Premium.
 * EA Play — игры подписки EA Play на PlayStation.
 * Источники:
 * https://www.playstation.com/ru-ru/ps-plus/games/?category=GAME_CATALOG
 * https://www.ea.com/ru-ru/ea-play/games#playstation
 * Состав подписок меняется; полный актуальный список — на сайтах Sony и EA.
 */
(function (global) {
  global.SUBSCRIPTION_CATALOGS = {
    premium: {
      id: "premium",
      title: "PlayStation Plus Premium",
      subtitle: "Каталог игр Extra + классика Premium",
      sourceLabel: "PlayStation",
      sourceUrl: "https://www.playstation.com/ru-ru/ps-plus/games/?category=GAME_CATALOG",
      updatedAt: "2026-08-29",
      games: [
        { name: "7th Sector" },
        { name: "35MM" },
        { name: "A Plague Tale: Requiem" },
        { name: "Absolute Tactics: Daughters of Mercy" },
        { name: "Acre Crisis" },
        { name: "AEW: Fight Forever" },
        { name: "AFL 23" },
        { name: "Age of Wonders 4" },
        { name: "AI: THE SOMNIUM FILES - nirvanA Initiative" },
        { name: "Alan Wake 2" },
        { name: "Alaskan Road Truckers: Highway Edition" },
        { name: "Ape Escape" },
        { name: "Arizona Sunshine VR 2" },
        { name: "Asterigos: Curse of the Stars" },
        { name: "Astrea: Six-Sided Oracles" },
        { name: "Astro Bot" },
        { name: "Baby Steps" },
        { name: "Backpack Hero" },
        { name: "Baldur's Gate 3" },
        { name: "BALL x PIT" },
        { name: "Behind the Frame: The Finest Scenery" },
        { name: "Biomutant" },
        { name: "Bionic Bay" },
        { name: "BIT.TRIP RERUNNER" },
        { name: "Black Myth: Wukong" },
        { name: "Black Skylands" },
        { name: "BlazBlue Entropy Effect X" },
        { name: "Bloodborne" },
        { name: "Bonfire Peaks" },
        { name: "Borderlands 4" },
        { name: "Breachers" },
        { name: "Bright Lights of Svetlov" },
        { name: "Buildest" },
        { name: "Caligo" },
        { name: "CARRION" },
        { name: "Cartel Tycoon" },
        { name: "CASE: Animatronics" },
        { name: "Cash Cleaner Simulator" },
        { name: "Castlevania: Symphony of the Night" },
        { name: "CATAN - Console Edition" },
        { name: "Chicken Assassin: Reloaded" },
        { name: "Clair Obscur: Expedition 33" },
        { name: "Cobra Kai 2: Dojos Rising" },
        { name: "Control Ultimate Edition" },
        { name: "Crash Bandicoot" },
        { name: "Creepy Tale: Ingrid Penance" },
        { name: "Creepy Tale: Some Other Place" },
        { name: "Crown Wars: The Black Prince" },
        { name: "Cryptmaster" },
        { name: "Cubic Odyssey" },
        { name: "CUSTOM MECH WARS" },
        { name: "Cyberpunk 2077" },
        { name: "CyberTD" },
        { name: "Cybertrash STATYX" },
        { name: "Days Gone" },
        { name: "DE-EXIT - Eternal Matters" },
        { name: "Deadside" },
        { name: "DEATH STRANDING 2: ON THE BEACH" },
        { name: "Death Stranding Director's Cut" },
        { name: "Death's Door" },
        { name: "Deathless. The Hero Quest" },
        { name: "Deathloop" },
        { name: "Demeo" },
        { name: "Demon's Souls" },
        { name: "Desert Child" },
        { name: "Destruction Derby" },
        { name: "Devil May Cry" },
        { name: "Devil May Cry 5 Special Edition" },
        { name: "Disney's Atlantis: The Lost Empire" },
        { name: "Dispatch" },
        { name: "DNF Duel" },
        { name: "DOOM: The Dark Ages" },
        { name: "Drill Core" },
        { name: "Dusk Diver 2" },
        { name: "Dying Light 2 Stay Human" },
        { name: "Ed-0: Zombie Uprising" },
        { name: "Eiyuden Chronicle: Hundred Heroes" },
        { name: "Elemental War 2" },
        { name: "Eriksholm: The Stolen Dream" },
        { name: "Escape from Ever After" },
        { name: "Eternal Exodus" },
        { name: "Etherborn" },
        { name: "Everafter Falls" },
        { name: "EVERSPACE 2" },
        { name: "Evil West" },
        { name: "Exit the Gungeon" },
        { name: "Expeditions: A MudRunner Game" },
        { name: "Farlands Journey" },
        { name: "Fear the Spotlight" },
        { name: "Fell Seal: Arbiter's Mark" },
        { name: "Final Fantasy IX" },
        { name: "Final Fantasy VII" },
        { name: "Final Fantasy VII Remake" },
        { name: "Final Fantasy VIII" },
        { name: "Forgive Me Father 2" },
        { name: "Fort Solis" },
        { name: "Froggy Hates Snow" },
        { name: "Fruit Mountain" },
        { name: "Fruitbus" },
        { name: "FULL METAL SCHOOLGIRL" },
        { name: "Funko Fusion" },
        { name: "Galaxy Kart" },
        { name: "Gangs of Sherwood" },
        { name: "Ghost of Tsushima Director's Cut" },
        { name: "God of War" },
        { name: "God of War (2005)" },
        { name: "God of War II" },
        { name: "God of War Ragnarök" },
        { name: "GORN" },
        { name: "Gran Turismo 7" },
        { name: "Grand Theft Auto III" },
        { name: "Grand Theft Auto: San Andreas" },
        { name: "Grand Theft Auto: Vice City" },
        { name: "Gravity Rush 2" },
        { name: "GreedFall: The Dying World" },
        { name: "Greyhill Incident" },
        { name: "GRIME" },
        { name: "Ground Zero Hero" },
        { name: "Hades" },
        { name: "Happy's Humble Burger Farm" },
        { name: "Hell is Us" },
        { name: "Hellboy Web of Wyrd" },
        { name: "Helldivers 2" },
        { name: "Hillbilly Doomsday" },
        { name: "Hollow Knight" },
        { name: "Horizon Forbidden West" },
        { name: "Horizon Zero Dawn Remastered" },
        { name: "Hot Shots Golf" },
        { name: "HOT WHEELS UNLEASHED 2 - Turbocharged" },
        { name: "House Flipper 2" },
        { name: "Hunting Simulator 2" },
        { name: "I Am Future: Cozy Apocalypse Survival" },
        { name: "I, AI" },
        { name: "Ico" },
        { name: "Indiana Jones and the Great Circle" },
        { name: "inKONBINI: One Store. Many Stories" },
        { name: "IRON GUARD" },
        { name: "IRON GUARD: Day Zero" },
        { name: "IRON GUARD: Salvation" },
        { name: "Is this Game Trying to Kill Me?" },
        { name: "It Takes Two" },
        { name: "Jagged Alliance 3" },
        { name: "Jak and Daxter: The Precursor Legacy" },
        { name: "Judgment" },
        { name: "Jurassic World Evolution 3" },
        { name: "KarmaZoo" },
        { name: "Kena: Bridge of Spirits" },
        { name: "KILL IT WITH FIRE! 2" },
        { name: "KILL KNIGHT" },
        { name: "Kingdom Come: Deliverance" },
        { name: "Kingdom Come: Deliverance II" },
        { name: "Kingdom Hearts" },
        { name: "LEGO Batman: Legacy of the Dark Knight" },
        { name: "LEGO Star Wars: The Skywalker Saga" },
        { name: "Lies of P" },
        { name: "Like a Dragon: Infinite Wealth" },
        { name: "Lil' Guardsman" },
        { name: "Little League World Series Baseball 2022" },
        { name: "Lost Judgment" },
        { name: "Lost Soul Aside" },
        { name: "Lumines Arise" },
        { name: "MADiSON" },
        { name: "Mafia: The Old Country" },
        { name: "Mandragora: Whispers of the Witch Tree" },
        { name: "Marvel's Midnight Suns Enhanced Edition" },
        { name: "Marvel's Spider-Man" },
        { name: "Marvel's Spider-Man 2" },
        { name: "Marvel's Spider-Man: Miles Morales" },
        { name: "Matchpoint - Tennis Championships" },
        { name: "MediEvil" },
        { name: "Mega Man Star Force Legacy Collection" },
        { name: "MEGALAN 11" },
        { name: "Metal Gear Solid" },
        { name: "Metaphor: ReFantazio" },
        { name: "Metro Awakening" },
        { name: "Metro Exodus" },
        { name: "Midnight Murder Club" },
        { name: "Miraculous: Rise of the Sphinx" },
        { name: "MLB The Show 26" },
        { name: "Monster Energy Supercross - The Official Videogame 6" },
        { name: "Monster Energy Supercross 25 - The Official Video Game" },
        { name: "Monster Hunter Rise" },
        { name: "Mortal Kombat 1" },
        { name: "Mortisomem" },
        { name: "Moss II VR" },
        { name: "Moss VR" },
        { name: "MotoGP 26" },
        { name: "MOUTHOLE" },
        { name: "Mr. Run and Jump" },
        { name: "Murder Inc" },
        { name: "Mutazione" },
        { name: "My Friend Pedro" },
        { name: "NHRA Championship Drag Racing: Speed For All" },
        { name: "Nickelodeon Kart Racers 3: Slime Speedway" },
        { name: "Nicktoons & The Dice of Destiny" },
        { name: "Nioh 2" },
        { name: "Oddsparks - An Automation Adventure" },
        { name: "Oddworld: Abe's Exoddus" },
        { name: "Onimusha Warlords" },
        { name: "Onimusha: Dawn of Dreams" },
        { name: "Palworld" },
        { name: "Park Beyond" },
        { name: "Patapon" },
        { name: "Pepper Grinder" },
        { name: "Persona 3 Portable" },
        { name: "Persona 5 Royal" },
        { name: "PGA TOUR 2K23" },
        { name: "Phoenix Point" },
        { name: "Pixel Ripped 1978: An Atari Adventure" },
        { name: "Poetic Trio" },
        { name: "Possessor(s)" },
        { name: "Potion Craft: Alchemist Simulator" },
        { name: "Promise Mascot Agency" },
        { name: "Punch Club 2: Fast Forward" },
        { name: "Rabbit Raid" },
        { name: "RAIDOU Remastered: The Mystery of the Soulless Army" },
        { name: "Ratchet & Clank" },
        { name: "Ratchet & Clank: Rift Apart" },
        { name: "Relayer" },
        { name: "Resident Evil" },
        { name: "Resident Evil 2" },
        { name: "Resident Evil 3" },
        { name: "Resident Evil 4" },
        { name: "Resident Evil Village" },
        { name: "Returnal" },
        { name: "Rhythm Sprout" },
        { name: "RIDE 6" },
        { name: "RiMS Racing" },
        { name: "ROAD TO EXOTICS" },
        { name: "Rogue Waters" },
        { name: "RollerCoaster Tycoon Adventures Deluxe" },
        { name: "Rollerdrome" },
        { name: "Ruinarch" },
        { name: "Rust Console Edition" },
        { name: "Sackboy: A Big Adventure" },
        { name: "SANDSPEED: CAMEL RACING" },
        { name: "SAROS" },
        { name: "Satisfactory" },
        { name: "Scar-Lead Salvation" },
        { name: "Screamer" },
        { name: "Sekiro: Shadows Die Twice" },
        { name: "Serious Sam: Siberian Mayhem" },
        { name: "Shadow of the Colossus" },
        { name: "Shadow Warrior 3: Definitive Edition" },
        { name: "Sid Meier's Civilization VII" },
        { name: "Silent Hill" },
        { name: "Sky of Destruction" },
        { name: "Sly Cooper and the Thievius Raccoonus" },
        { name: "Songs of Conquest" },
        { name: "SONIC SUPERSTARS" },
        { name: "Sorry We're Closed" },
        { name: "Soulcalibur" },
        { name: "SpiderHeck" },
        { name: "Stardew Valley" },
        { name: "STARSEEKER: Astroneer Expeditions" },
        { name: "Steelrising" },
        { name: "Stellar Blade" },
        { name: "STELLATUM" },
        { name: "Strategic Mind: Spirit of Liberty" },
        { name: "Stray" },
        { name: "Street Fighter Alpha 3" },
        { name: "Styx: Blades of Greed" },
        { name: "Suicide Squad: Kill the Justice League" },
        { name: "SUPER CRAZY RHYTHM CASTLE" },
        { name: "Survival: Fountain of Youth - Captain's Edition" },
        { name: "Syphon Filter" },
        { name: "Tactics Ogre: Reborn" },
        { name: "Tale of Dark Lands" },
        { name: "Tekken 3" },
        { name: "Terraformers" },
        { name: "The 7th Guest Remake" },
        { name: "The 7th Guest VR" },
        { name: "The Callisto Protocol" },
        { name: "The Cruel King and the Great Hero" },
        { name: "The Darkside Detective" },
        { name: "The Darkside Detective: A Fumble in the Dark" },
        { name: "The Devil Within: Satgat" },
        { name: "The Last of Us Part I" },
        { name: "The Last of Us Part II Remastered" },
        { name: "The Last of Us Remastered" },
        { name: "The Last Shot" },
        { name: "The Lord of the Rings: Gollum" },
        { name: "The Messenger" },
        { name: "The Metronomicon: Slay the Dance Floor" },
        { name: "The Midnight Walk" },
        { name: "The Stone of Madness" },
        { name: "The Talos Principle: Deluxe Edition" },
        { name: "The Talos Principle: Reawakened" },
        { name: "TIEBREAK – GRAND SLAM EDITION" },
        { name: "Tinykin" },
        { name: "Tomb Raider" },
        { name: "Townsmen VR" },
        { name: "Transport Fever 2: Console Edition" },
        { name: "Trek to Yomi" },
        { name: "Tri6: Infinite" },
        { name: "TT Isle Of Man: Ride on the Edge 3" },
        { name: "Twisted Metal" },
        { name: "Two Point Museum" },
        { name: "Uncharted 2: Among Thieves" },
        { name: "Uncharted 3: Drake's Deception" },
        { name: "Uncharted: Drake's Fortune" },
        { name: "Uncharted: Legacy of Thieves Collection" },
        { name: "UNDERDOGS" },
        { name: "Undisputed" },
        { name: "Universe For Sale" },
        { name: "UNRAILED!" },
        { name: "Until Dawn" },
        { name: "Until Then" },
        { name: "Vampire Crawlers: The Turbo Wildcard from Vampire Survivors" },
        { name: "Vampire Survivors" },
        { name: "Vampire: The Masquerade - Bloodlines 2" },
        { name: "Visions of Mana" },
        { name: "VR Skater" },
        { name: "Warhammer 40,000: Chaos Gate - Daemonhunters" },
        { name: "Warhammer Age of Sigmar: Realms of Ruin" },
        { name: "Watch Dogs: Legion" },
        { name: "Weedcraft Inc" },
        { name: "Weird West: Definitive Edition" },
        { name: "Werewolf: The Apocalypse — Purgatory" },
        { name: "Whispering Willows" },
        { name: "Wipeout Omega Collection" },
        { name: "Worms Armageddon" },
        { name: "WWE 2K26 Standard Edition" },
        { name: "Yakuza: Like a Dragon" }
      ],
    },
    eaPlay: {
      id: "eaPlay",
      title: "EA Play",
      subtitle: "Игры подписки EA Play на PlayStation",
      sourceLabel: "EA",
      sourceUrl: "https://www.ea.com/ru-ru/ea-play/games#playstation",
      updatedAt: "2026-08-29",
      games: [
        { name: "A Way Out" },
        { name: "Apex Legends" },
        { name: "Battlefield 1" },
        { name: "Battlefield 4" },
        { name: "Battlefield 6" },
        { name: "Battlefield 2042" },
        { name: "Battlefield Hardline" },
        { name: "Battlefield V" },
        { name: "Burnout Paradise Remastered" },
        { name: "Dead Space" },
        { name: "Dirt 5" },
        { name: "Dirt Rally 2.0" },
        { name: "Dragon Age: Inquisition" },
        { name: "Dragon Age: The Veilguard" },
        { name: "EA SPORTS College Football 25" },
        { name: "EA SPORTS College Football 26" },
        { name: "EA SPORTS College Football 27" },
        { name: "EA SPORTS FC 24" },
        { name: "EA SPORTS FC 25" },
        { name: "EA SPORTS FC 26" },
        { name: "EA SPORTS PGA Tour" },
        { name: "EA SPORTS UFC 4" },
        { name: "EA SPORTS UFC 5" },
        { name: "EA SPORTS WRC" },
        { name: "F1 23" },
        { name: "F1 24" },
        { name: "F1 25" },
        { name: "Fe" },
        { name: "FIFA 23" },
        { name: "GRID Legends" },
        { name: "Immortals of Aveum" },
        { name: "It Takes Two" },
        { name: "Lost in Random" },
        { name: "Madden NFL 25" },
        { name: "Madden NFL 26" },
        { name: "Madden NFL 27" },
        { name: "Mass Effect Legendary Edition" },
        { name: "Mirror's Edge Catalyst" },
        { name: "Need for Speed" },
        { name: "Need for Speed Heat" },
        { name: "Need for Speed Hot Pursuit Remastered" },
        { name: "Need for Speed Payback" },
        { name: "Need for Speed Rivals" },
        { name: "Need for Speed Unbound" },
        { name: "NHL 24" },
        { name: "NHL 25" },
        { name: "NHL 26" },
        { name: "NHL 94 Rewind" },
        { name: "Peggle 2" },
        { name: "Plants vs. Zombies: Battle for Neighborville" },
        { name: "Plants vs. Zombies: Garden Warfare" },
        { name: "Plants vs. Zombies: Garden Warfare 2" },
        { name: "Sea of Solitude" },
        { name: "Star Wars Battlefront II" },
        { name: "Star Wars Jedi: Fallen Order" },
        { name: "Star Wars Jedi: Survivor" },
        { name: "Star Wars Squadrons" },
        { name: "Super Mega Baseball 3" },
        { name: "Super Mega Baseball 4" },
        { name: "Tales of Kenzera: Zau" },
        { name: "The Sims 4" },
        { name: "The Sims: 25th Birthday Bundle" },
        { name: "Titanfall 2" },
        { name: "Unravel" },
        { name: "Unravel Two" },
        { name: "Wild Hearts" }
      ],
    },
  };
})(window);


/**

 * Frontend state & UI

 * Catalog navigation, calendar per product, order without payment

 */

(() => {

  const { PricingService, BackendAPI } = window;



  const PRODUCT_INFO = {

    ps5: {

      title: "PS5 / PS5 PRO",

      desc: "Консоль с полной комплектацией. Выберите даты и отметьте доп. периферию, если нужна.",

    },

    vr2: {

      title: "PlayStation VR2",

      desc: "Шлем виртуальной реальности. Выберите период аренды и способ получения.",

    },

    periphery: {

      title: "Периферия",

      desc: "Геймпады, наушники, камеры и другое. Выберите даты аренды.",

    },

  };



  const monthFormatter = new Intl.DateTimeFormat("ru-RU", {

    month: "long",

    year: "numeric",

  });

  const dayFormatter = new Intl.DateTimeFormat("ru-RU", {

    day: "numeric",

    month: "long",

    year: "numeric",

    weekday: "short",

  });



  const state = {

    viewYear: null,

    viewMonth: null,

    calendarMode: "range",

    startDate: null,

    endDate: null,

    pickStep: "start",

    fulfillment: "delivery",

    termsAgreed: false,

    privacyAgreed: false,

    /** @type {'home'|'product'} */

    currentView: "home",

    /** @type {'ps5'|'vr2'|'periphery'|null} */

    selectedProduct: null,

    /** @type {'ps5'|'ps5_pro'} */

    consoleModel: "ps5",

    extras: { gamepadQty: 0, tv: false },

    wantedGames: [],

    reviewRating: 0,

    reviewOrderId: null,

    /** @type {'tyumen'|'surgut'|'nefteyugansk'} */
    selectedCity: "tyumen",

    adminCityFilter: "",

    invFilterCity: "",

    invFilterType: "",

    expandedOrderId: null,

    clientCalYear: null,

    clientCalMonth: null,

    clientStartDate: null,

    clientEndDate: null,

    clientPickStep: "start",

  };



  const els = {

    authScreen: document.getElementById("auth-screen"),

    bookingScreen: document.getElementById("booking-screen"),

    adminScreen: document.getElementById("admin-screen"),

    bookingHomeView: document.getElementById("booking-home-view"),

    productDetailView: document.getElementById("product-detail-view"),

    backToHome: document.getElementById("back-to-home"),

    productDetailTitle: document.getElementById("product-detail-title"),

    productDetailDesc: document.getElementById("product-detail-desc"),

    consoleChoice: document.getElementById("console-choice"),

    ps5KitSection: document.getElementById("ps5-kit-section"),

    ps5ExtrasSection: document.getElementById("ps5-extras-section"),

    extraGamepadQty: document.getElementById("extra-gamepad-qty"),

    extraTv: document.getElementById("extra-tv"),

    headerActions: document.getElementById("header-actions"),

    cabinetBtn: document.getElementById("cabinet-btn"),

    cabinetScreen: document.getElementById("cabinet-screen"),

    cabinetBack: document.getElementById("cabinet-back"),

    userChip: document.getElementById("user-chip"),

    logoutBtn: document.getElementById("logout-btn"),

    loginForm: document.getElementById("login-form"),

    registerForm: document.getElementById("register-form"),

    resetRequestForm: document.getElementById("reset-request-form"),

    resetConfirmForm: document.getElementById("reset-confirm-form"),

    adminLoginForm: document.getElementById("admin-login-form"),

    loginError: document.getElementById("login-error"),

    registerError: document.getElementById("register-error"),

    resetRequestError: document.getElementById("reset-request-error"),

    resetConfirmError: document.getElementById("reset-confirm-error"),

    adminLoginError: document.getElementById("admin-login-error"),

    calendarDays: document.getElementById("calendar-days"),

    monthLabel: document.getElementById("calendar-month-label"),

    prevMonth: document.getElementById("prev-month"),

    nextMonth: document.getElementById("next-month"),

    calendarHint: document.getElementById("calendar-hint"),

    clearRangeBtn: document.getElementById("clear-range-btn"),

    selectedDatesList: document.getElementById("selected-dates-list"),

    totalPrice: document.getElementById("total-price"),

    pricingNote: document.getElementById("pricing-note"),

    orderForm: document.getElementById("order-form"),

    orderError: document.getElementById("order-error"),

    orderBtn: document.getElementById("order-btn"),

    deliveryAddressWrap: document.getElementById("delivery-address-wrap"),

    deliveryCity: document.getElementById("delivery-city"),

    deliveryStreet: document.getElementById("delivery-street"),

    deliveryApt: document.getElementById("delivery-apt"),

    orderPromo: document.getElementById("order-promo"),

    orderGameNote: document.getElementById("order-game-note"),

    pickupNote: document.getElementById("pickup-note"),

    termsAgree: document.getElementById("terms-agree"),

    privacyAgree: document.getElementById("privacy-agree"),

    toast: document.getElementById("toast"),

    successModal: document.getElementById("success-modal"),

    successText: document.getElementById("success-text"),

    successClose: document.getElementById("success-close"),

    ordersList: document.getElementById("orders-list"),
    ordersTbody: document.getElementById("orders-list"),

    clientsTbody: document.getElementById("clients-tbody"),

    adminOrdersPanel: document.getElementById("admin-orders-panel"),

    adminClientsPanel: document.getElementById("admin-clients-panel"),

    reviewModal: document.getElementById("review-modal"),

    reviewHint: document.getElementById("review-order-hint"),

    starRating: document.getElementById("star-rating"),

    reviewComment: document.getElementById("review-comment"),

    reviewError: document.getElementById("review-error"),

    reviewSkip: document.getElementById("review-skip"),

    reviewSubmit: document.getElementById("review-submit"),

    reviewsGrid: document.getElementById("reviews-grid"),

    orderCity: document.getElementById("order-city"),

    adminCityFilter: document.getElementById("admin-city-filter"),

    adminCityFilterWrap: document.getElementById("admin-city-filter-wrap"),

    adminInventoryPanel: document.getElementById("admin-inventory-panel"),

    adminPromosPanel: document.getElementById("admin-promos-panel"),

    promoCreateForm: document.getElementById("promo-create-form"),

    promoPercent: document.getElementById("promo-percent"),

    promoError: document.getElementById("promo-error"),

    promoLast: document.getElementById("promo-last"),

    promosTbody: document.getElementById("promos-tbody"),

    adminPasswordPanel: document.getElementById("admin-password-panel"),

    adminPasswordModal: document.getElementById("admin-password-modal"),

    adminPasswordForm: document.getElementById("admin-password-form"),

    adminNewPassword: document.getElementById("admin-new-password"),

    adminNewPassword2: document.getElementById("admin-new-password2"),

    adminPasswordError: document.getElementById("admin-password-error"),

    inventoryTbody: document.getElementById("inventory-tbody"),

    inventoryAddForm: document.getElementById("inventory-add-form"),

    inventoryError: document.getElementById("inventory-error"),

    adminIntroText: document.getElementById("admin-intro-text"),

    clientAddForm: document.getElementById("client-add-form"),

    clientAddError: document.getElementById("client-add-error"),

    consoleInfoModal: document.getElementById("console-info-modal"),

    consoleInfoBody: document.getElementById("console-info-body"),

    consoleInfoClose: document.getElementById("console-info-close"),

    invFilterCity: document.getElementById("inv-filter-city"),

    invFilterType: document.getElementById("inv-filter-type"),

    clientCalDays: document.getElementById("client-cal-days"),

    clientCalMonthLabel: document.getElementById("client-cal-month-label"),

    clientCalHint: document.getElementById("client-cal-hint"),

    clientPrevMonth: document.getElementById("client-prev-month"),

    clientNextMonth: document.getElementById("client-next-month"),

    clientStartDate: document.getElementById("client-start-date"),

    clientEndDate: document.getElementById("client-end-date"),

  };



  const STATIC_REVIEWS_HTML = "";



  let toastTimer = null;



  function todayStart() {

    const d = new Date();

    d.setHours(0, 0, 0, 0);

    return d;

  }



  function toKey(date) {

    const y = date.getFullYear();

    const m = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${day}`;

  }



  function parseKey(key) {

    const [y, m, d] = key.split("-").map(Number);

    return new Date(y, m - 1, d);

  }



  function addDays(key, n) {

    const d = parseKey(key);

    d.setDate(d.getDate() + n);

    return toKey(d);

  }



  function showToast(message) {

    els.toast.textContent = message;

    els.toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

      els.toast.hidden = true;

    }, 2800);

  }



  /** @returns {Promise<{ok: boolean, error?: string}>} */

  async function notifyTelegram(order) {

    try {

      const res = await fetch("/.netlify/functions/notify-order", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(order),

      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {

        const msg = data.error || `HTTP ${res.status}`;

        console.warn("Notify failed:", msg);

        return { ok: false, error: msg, email: false, ...data };

      }

      return { ok: Boolean(data.ok ?? data.telegram ?? true), email: Boolean(data.email), ...data };

    } catch (err) {

      console.warn("Telegram notify error:", err);

      return { ok: false, error: err.message || "Сеть" };

    }

  }



  function showError(el, message) {

    el.textContent = message;

    el.hidden = !message;

  }



  function hideAllScreens() {

    els.authScreen.hidden = true;

    els.bookingScreen.hidden = true;

    els.adminScreen.hidden = true;

    if (els.cabinetScreen) els.cabinetScreen.hidden = true;

  }



  function switchAuthTab(tab) {

    document.querySelectorAll(".auth-tab").forEach((btn) => {

      const active = btn.dataset.tab === tab;

      btn.classList.toggle("is-active", active);

      btn.setAttribute("aria-selected", String(active));

    });

    els.loginForm.hidden = tab !== "login";

    els.registerForm.hidden = tab !== "register";

    if (els.resetRequestForm) els.resetRequestForm.hidden = true;

    if (els.resetConfirmForm) els.resetConfirmForm.hidden = true;

    if (els.adminLoginForm) els.adminLoginForm.hidden = true;

    showError(els.loginError, "");

    showError(els.registerError, "");

    if (els.resetRequestError) showError(els.resetRequestError, "");

    if (els.resetConfirmError) showError(els.resetConfirmError, "");

    if (els.adminLoginError) showError(els.adminLoginError, "");

  }



  function showAuth() {

    hideAllScreens();

    els.authScreen.hidden = false;

    els.headerActions.hidden = true;

    if (els.cabinetBtn) els.cabinetBtn.hidden = true;

    if (els.adminPasswordModal) els.adminPasswordModal.hidden = true;

    switchAuthTab("login");

  }



  function getPricingModel() {

    if (state.selectedProduct === "ps5") return state.consoleModel;

    if (state.selectedProduct === "vr2" || state.selectedProduct === "periphery") {

      return state.selectedProduct;

    }

    return "ps5";

  }



  function consoleLabelForOrder() {

    if (state.consoleModel === "ps5_pro") return "PS5 PRO";

    if (state.selectedProduct === "ps5") return "PS5";

    return PRODUCT_INFO[state.selectedProduct]?.title || "";

  }



  function normalizeOrderStatus(status) {

    return status === "active" ? "pending" : status;

  }



  function resetBookingState() {

    state.startDate = null;

    state.endDate = null;

    state.pickStep = "start";

    state.calendarMode = "range";

    state.fulfillment = "delivery";

    state.termsAgreed = false;

    state.privacyAgreed = false;

    state.consoleModel = "ps5";

    state.extras = { gamepadQty: 0, tv: false };

    document.querySelectorAll(".mode-btn").forEach((b) => {

      b.classList.toggle("is-active", b.dataset.mode === "range");

    });

    els.termsAgree.checked = false;

    if (els.privacyAgree) els.privacyAgree.checked = false;

    if (els.extraGamepadQty) els.extraGamepadQty.value = "0";

    if (els.extraTv) els.extraTv.checked = false;

    const ps5Radio = document.getElementById("console-ps5");

    if (ps5Radio) ps5Radio.checked = true;

    const deliveryRadio = document.getElementById("opt-delivery");

    if (deliveryRadio) deliveryRadio.checked = true;

    updateFulfillmentUI();

    updateCalendarHint();

  }



  let catalogId = "premium";

  let catalogQuery = "";



  function catalogOf(id) {

    const all = window.SUBSCRIPTION_CATALOGS || {};

    return all[id] || all.premium || all.extra;

  }



  function wantedGamesHint() {

    const text = state.wantedGames.length
      ? "Попадёт в «Комментарии для сервиса»: " + state.wantedGames.join(", ")
      : "";

    ["games-wanted-hint", "order-wanted-games"].forEach((id) => {

      const el = document.getElementById(id);

      if (!el) return;

      el.hidden = !text;

      el.textContent = text;

    });

  }



  function applyWantedGamesToNote() {

    if (!els.orderGameNote || !state.wantedGames.length) return;

    const gamesLine = "Игры: " + state.wantedGames.join(", ");

    const rest = els.orderGameNote.value.replace(/^Игры:\s*[^\n]*/i, "").trim();

    els.orderGameNote.value = rest ? gamesLine + "\n" + rest : gamesLine;

  }



  function addWantedGame(name) {

    if (!state.wantedGames.includes(name)) state.wantedGames.push(name);

    applyWantedGamesToNote();

    wantedGamesHint();

    renderGamesCatalog();

    showToast(name + " добавлена в комментарий к заявке");

  }



  function renderGamesCatalog() {

    const listEl = document.getElementById("games-catalog-list");

    const emptyEl = document.getElementById("games-catalog-empty");

    const metaEl = document.getElementById("games-catalog-meta");

    const cat = catalogOf(catalogId);

    if (!listEl || !cat) return;

    const q = catalogQuery.trim().toLowerCase();

    const games = (cat.games || []).filter((g) => !q || String(g.name).toLowerCase().includes(q));

    if (metaEl) {

      metaEl.innerHTML =

        `${games.length} из ${cat.games.length} · источник: <a href="${cat.sourceUrl}" target="_blank" rel="noopener">${escapeHtml(cat.sourceLabel)}</a> · снимок ${escapeHtml(cat.updatedAt)}`;

    }

    listEl.innerHTML = "";

    games.forEach((g) => {

      const li = document.createElement("li");

      const added = state.wantedGames.includes(g.name);

      li.className = "games-catalog-item" + (added ? " is-wanted" : "");

      const title = document.createElement("strong");

      title.textContent = g.name;

      const btn = document.createElement("button");

      btn.type = "button";

      btn.textContent = added ? "Добавлено" : "В заявку";

      btn.disabled = added;

      btn.addEventListener("click", () => addWantedGame(g.name));

      li.append(title, btn);

      listEl.appendChild(li);

    });

    if (emptyEl) emptyEl.hidden = games.length > 0;

  }



  function initGamesCatalog() {

    if (!initGamesCatalog.done) {

      initGamesCatalog.done = true;

      document.querySelectorAll(".games-catalog-tab").forEach((btn) => {

        btn.addEventListener("click", () => {

          catalogId = btn.dataset.catalog;

          document.querySelectorAll(".games-catalog-tab").forEach((b) => {

            const on = b === btn;

            b.classList.toggle("is-active", on);

            b.setAttribute("aria-selected", String(on));

          });

          renderGamesCatalog();

        });

      });

      const search = document.getElementById("games-search");

      if (search) {

        search.addEventListener("input", () => {

          catalogQuery = search.value;

          renderGamesCatalog();

        });

      }

    }

    wantedGamesHint();

    renderGamesCatalog();

  }



  function showBookingHome() {

    state.currentView = "home";

    state.selectedProduct = null;

    els.bookingHomeView.hidden = false;

    els.productDetailView.hidden = true;

    renderReviews();

    maybePromptReview();

    initGamesCatalog();

  }



  async function showProductDetail(productId) {

    const info = PRODUCT_INFO[productId];

    if (!info) return;



    state.currentView = "product";

    state.selectedProduct = productId;

    resetBookingState();



    els.bookingHomeView.hidden = true;

    els.productDetailView.hidden = false;

    els.productDetailTitle.textContent = info.title;

    els.productDetailDesc.textContent = info.desc;



    const isPs5 = productId === "ps5";

    if (els.consoleChoice) els.consoleChoice.hidden = !isPs5;

    els.ps5KitSection.hidden = !isPs5;

    els.ps5ExtrasSection.hidden = !isPs5;



    const now = todayStart();

    state.viewYear = now.getFullYear();

    state.viewMonth = now.getMonth();



    await BackendAPI.syncFromServer({ city: state.selectedCity });

    renderCalendar();

    updateOrderSummary();

    els.orderForm.reset();

    applyWantedGamesToNote();

    wantedGamesHint();

    if (els.orderCity) {

      els.orderCity.value = state.selectedCity;

    }

    document.querySelectorAll('input[name="order-city"]').forEach((radio) => {

      radio.checked = radio.value === state.selectedCity;

    });

    document.getElementById("opt-delivery").checked = true;

    const ps5Radio = document.getElementById("console-ps5");

    if (ps5Radio) ps5Radio.checked = true;

    state.consoleModel = "ps5";

    updateFulfillmentUI();

    showError(els.orderError, "");

  }



  function showBooking(session) {

    hideAllScreens();

    els.bookingScreen.hidden = false;

    els.headerActions.hidden = false;

    if (els.cabinetBtn) els.cabinetBtn.hidden = false;

    els.userChip.textContent = session.fio || session.phone;

    showBookingHome();

  }



  function lockAdminCityRadios(admin, radioName, hiddenId) {
    if (!admin) return;
    const isCity = admin.adminRole === "city";
    const allowedCity = isCity && admin.cities && admin.cities[0] ? admin.cities[0] : null;
    document.querySelectorAll(`input[name="${radioName}"]`).forEach((radio) => {
      const allowed = !isCity || radio.value === allowedCity;
      radio.disabled = !allowed;
      const wrap = radio.closest(".console-option");
      if (wrap) wrap.style.opacity = allowed ? "" : "0.4";
    });
    if (isCity && allowedCity) {
      const hidden = document.getElementById(hiddenId);
      const pick = document.querySelector(`input[name="${radioName}"][value="${allowedCity}"]`);
      if (pick) pick.checked = true;
      if (hidden) hidden.value = allowedCity;
    }
  }

  async function showAdminDashboard() {

    hideAllScreens();

    els.adminScreen.hidden = false;

    els.headerActions.hidden = false;

    if (els.cabinetBtn) els.cabinetBtn.hidden = true;

    const admin = BackendAPI.getAdminSession();

    const name = admin && admin.name ? admin.name : "Админ";

    els.userChip.textContent = admin ? `${name} · ${admin.phone}` : "Админ";

    if (els.adminIntroText && admin) {

      els.adminIntroText.textContent =

        admin.adminRole === "super"

          ? "Доступ ко всем городам: заказы, клиенты и парк."

          : "Заказы, клиенты, парк и промокоды только по Нефтеюганску.";

    }

    const cityOnly = admin && admin.adminRole === "city";

    document.querySelectorAll(".admin-tab").forEach((btn) => {

      btn.hidden = false;

    });

    if (cityOnly) {

      state.adminCityFilter = (admin.cities && admin.cities[0]) || "nefteyugansk";

    }

    if (els.adminCityFilterWrap) {

      els.adminCityFilterWrap.hidden = !(admin && admin.adminRole === "super");

    }

    if (els.inventoryAddForm && admin) {

      lockAdminCityRadios(admin, "inv-city-radio", "inv-city");

    }

    lockAdminCityRadios(admin, "client-city-radio", "client-city");

    lockAdminCityRadios(admin, "promo-city-radio", "promo-city");

    switchAdminTab("orders");

    await renderOrdersTable();

    renderClientsTable();

    if (admin && admin.mustChangePassword) {

      showAdminPasswordModal();

    } else {

      hideAdminPasswordModal();

    }

  }



  function updateCalendarHint() {

    if (state.calendarMode === "week") {

      els.calendarHint.textContent =

        "Режим «неделя»: выберите дату начала — конец автоматически +7 дней.";

      return;

    }

    if (state.pickStep === "start" || !state.startDate) {

      els.calendarHint.textContent =

        "Выберите дату начала — конец по умолчанию +1 день (минимум 24 ч). Затем можно выбрать другой конец.";

    } else {

      els.calendarHint.textContent =

        "Выберите дату окончания (не раньше завтра от начала) или оставьте минимум 24 ч.";

    }

  }



  function setRange(startKey, endKey) {

    if (!startKey || !endKey) {

      state.startDate = null;

      state.endDate = null;

      return;

    }

    if (endKey <= startKey) {

      endKey = addDays(startKey, 1);

    }

    state.startDate = startKey;

    state.endDate = endKey;

    return true;

  }



  function onDayClick(key) {

    if (state.calendarMode === "week") {

      const end = addDays(key, 7);

      if (setRange(key, end) !== false) {

        state.pickStep = "start";

        renderCalendar();

        updateOrderSummary();

        showToast("Выбрана неделя (7 суток)");

      }

      return;

    }



    if (state.pickStep === "start" || !state.startDate) {

      if (setRange(key, addDays(key, 1)) !== false) {

        state.pickStep = "end";

        updateCalendarHint();

        renderCalendar();

        updateOrderSummary();

      }

      return;

    }



    if (key <= state.startDate) {

      if (setRange(key, addDays(key, 1)) !== false) {

        state.pickStep = "end";

        renderCalendar();

        updateOrderSummary();

      }

      return;

    }



    if (setRange(state.startDate, key) !== false) {

      state.pickStep = "end";

      renderCalendar();

      updateOrderSummary();

    }

  }



  function clearRange() {

    state.startDate = null;

    state.endDate = null;

    state.pickStep = "start";

    updateCalendarHint();

    renderCalendar();

    updateOrderSummary();

  }



  function isInSelectedRange(key) {

    if (!state.startDate || !state.endDate) return false;

    return key >= state.startDate && key < state.endDate;

  }



  function renderCalendar() {

    const labelDate = new Date(state.viewYear, state.viewMonth, 1);

    els.monthLabel.textContent = monthFormatter.format(labelDate);



    const firstDay = new Date(state.viewYear, state.viewMonth, 1);

    let startWeekday = firstDay.getDay();

    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;



    const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();

    const today = todayStart();



    els.calendarDays.innerHTML = "";



    for (let i = 0; i < startWeekday; i += 1) {

      const empty = document.createElement("div");

      empty.className = "day-cell empty";

      empty.setAttribute("aria-hidden", "true");

      els.calendarDays.appendChild(empty);

    }



    for (let day = 1; day <= daysInMonth; day += 1) {

      const date = new Date(state.viewYear, state.viewMonth, day);

      const key = toKey(date);

      const btn = document.createElement("button");

      btn.type = "button";

      btn.textContent = String(day);

      btn.dataset.date = key;



      const isPast = date < today;

      const inRange = isInSelectedRange(key);

      const isEdge = key === state.startDate || key === state.endDate;



      btn.className = "day-cell";

      if (isPast) {

        btn.classList.add("past");

        btn.disabled = true;

      } else if (inRange || isEdge) {

        btn.classList.add("selected");

        if (isEdge) btn.classList.add("range-edge");

      } else {

        btn.classList.add("available");

      }



      if (!isPast) {

        btn.addEventListener("click", () => onDayClick(key));

      }



      els.calendarDays.appendChild(btn);

    }

  }



  function getSelectedExtras() {

    const list = [];

    const qty = Number(state.extras.gamepadQty) || 0;

    if (qty === 1) list.push("Дополнительный геймпад ×1 (300 ₽)");

    if (qty === 2) list.push("Дополнительные геймпады ×2 (600 ₽)");

    if (state.extras.tv) list.push("Телевизор");

    return list;

  }

  function currentQuote() {
    const days = PricingService.durationDays(state.startDate, state.endDate);
    const model = getPricingModel();
    const rental = PricingService.calculateRentalPrice(days, model);
    const session = BackendAPI.getClientSession();
    const loyalty = session
      ? BackendAPI.getClientLoyalty(session.phone)
      : { percent: 0, label: "Новичок" };
    const promoRaw = els.orderPromo ? els.orderPromo.value : "";
    const peek = promoRaw && promoRaw.trim() ? BackendAPI.peekPromo(promoRaw, state.selectedCity) : { ok: true, promo: null };
    const promoPercent = peek.ok && peek.promo ? Number(peek.promo.percent) || 0 : 0;
    const discountPercent = Math.max(Number(loyalty.percent) || 0, promoPercent);
    const extrasPrice =
      (Number(state.extras.gamepadQty) || 0) * (PricingService.EXTRA_GAMEPAD_PRICE || 300);
    const total = PricingService.applyDiscount(rental, discountPercent) + extrasPrice;
    return {
      days,
      model,
      base: rental,
      extrasPrice,
      total,
      discountPercent,
      loyalty,
      promoPercent,
      promoError: peek.ok || peek.unknown ? "" : peek.error || "",
    };
  }

  function deliveryFilled() {
    if (state.fulfillment !== "delivery") return true;
    const city = els.deliveryCity ? els.deliveryCity.value.trim() : "";
    const street = els.deliveryStreet ? els.deliveryStreet.value.trim() : "";
    return city.length >= 2 && street.length >= 3;
  }



  function updateOrderSummary() {

    const days = PricingService.durationDays(state.startDate, state.endDate);

    const model = getPricingModel();

    const quote = currentQuote();

    const total = quote.total;



    els.selectedDatesList.innerHTML = "";

    if (!state.startDate || !state.endDate || days < 1) {

      const li = document.createElement("li");

      li.className = "empty";

      li.textContent = "Период не выбран";

      els.selectedDatesList.appendChild(li);

    } else {

      const productLabel = state.selectedProduct

        ? PRODUCT_INFO[state.selectedProduct]?.title || ""

        : "";

      const rows = [

        ...(productLabel ? [["Категория", productLabel]] : []),

      ];

      if (state.selectedProduct === "ps5") {

        rows.push([

          "Консоль",

          state.consoleModel === "ps5_pro" ? "PS5 PRO" : "PS5",

        ]);

      }

      rows.push(

        ["Начало", dayFormatter.format(parseKey(state.startDate))],

        ["Окончание", dayFormatter.format(parseKey(state.endDate))],

        ["Длительность", `${days} сут. (от 24 ч)`]

      );

      const extras = getSelectedExtras();

      if (extras.length) {

        rows.push(["Доп. периферия", extras.join(", ")]);

      }

      if (quote.discountPercent) {
        rows.push([
          "Скидка",
          `${quote.discountPercent}%${quote.promoPercent >= quote.loyalty.percent && quote.promoPercent ? " · промокод" : " · лояльность"}`,
        ]);
      }

      rows.forEach(([label, value]) => {

        const li = document.createElement("li");

        const a = document.createElement("span");

        a.textContent = label;

        const b = document.createElement("span");

        b.textContent = value;

        li.append(a, b);

        els.selectedDatesList.appendChild(li);

      });

    }



    if (quote.discountPercent && quote.base !== quote.total) {
      els.totalPrice.innerHTML = `<span class="old-price">${quote.base.toLocaleString("ru-RU")} ₽</span>${total.toLocaleString("ru-RU")} ₽`;
    } else {
      els.totalPrice.textContent = `${total.toLocaleString("ru-RU")} ₽`;
    }

    if (state.selectedProduct === "ps5" && days < 1) {

      els.pricingNote.textContent = PricingService.tariffHint(state.consoleModel);

    } else {

      els.pricingNote.textContent = PricingService.describePricing(days, model);

    }

    updateOrderButtonState();

  }



  function updateFulfillmentUI() {

    const isDelivery = state.fulfillment === "delivery";

    els.deliveryAddressWrap.hidden = !isDelivery;

    els.pickupNote.hidden = isDelivery;

    if (els.deliveryCity) els.deliveryCity.required = isDelivery;
    if (els.deliveryStreet) els.deliveryStreet.required = isDelivery;

    if (!isDelivery) {
      if (els.deliveryCity) els.deliveryCity.value = "";
      if (els.deliveryStreet) els.deliveryStreet.value = "";
      if (els.deliveryApt) els.deliveryApt.value = "";
    }

    if (els.pickupNote) {
      els.pickupNote.textContent =
        "Адрес самовывоза: " +
        (BackendAPI.PICKUP_BY_CITY[state.selectedCity] || "уточнит менеджер");
    }

    updateOrderButtonState();

  }



  function updateOrderButtonState() {

    const days = PricingService.durationDays(state.startDate, state.endDate);

    const hasRange = days >= 1;

    const termsOk = state.termsAgreed;

    const deliveryOk = deliveryFilled();

    els.orderBtn.disabled = !(hasRange && termsOk && deliveryOk);

  }



  function switchAdminTab(tab) {

    document.querySelectorAll(".admin-tab").forEach((btn) => {

      btn.classList.toggle("is-active", btn.dataset.adminTab === tab);

    });

    els.adminOrdersPanel.hidden = tab !== "orders";

    els.adminClientsPanel.hidden = tab !== "clients";

    if (els.adminInventoryPanel) els.adminInventoryPanel.hidden = tab !== "inventory";
    if (els.adminPromosPanel) els.adminPromosPanel.hidden = tab !== "promos";

    if (tab === "orders") {

      renderOrdersTable();

    }

    if (tab === "clients") {

      renderClientsTable();

      initClientMiniCalendar();

    }

    if (tab === "inventory") {

      renderInventoryTable();

    }

    if (tab === "promos") {
      renderPromosTable();
    }

  }



  function adminActionsHtml(id, status, order) {
    const expandBtn = `<button type="button" class="admin-action-btn" data-action="expand" data-id="${escapeHtml(id)}">Подробнее${
      order && order.assignedConsoleCode ? ` · №${escapeHtml(order.assignedConsoleCode)}` : ""
    }</button>`;

    if (status === "pending") {
      return `
        ${expandBtn}
        <button type="button" class="admin-action-btn" data-action="issued" data-id="${escapeHtml(id)}">Аренда выдана</button>
        <button type="button" class="admin-action-btn admin-action-danger" data-action="rejected" data-id="${escapeHtml(id)}">В аренде отказано</button>
      `;
    }

    if (status === "issued") {
      return `
        ${expandBtn}
        <button type="button" class="admin-action-btn" data-action="completed" data-id="${escapeHtml(id)}">Закончить аренду</button>
      `;
    }

    return expandBtn;
  }

  const INV_TYPE_LABELS = { ps5: "PS5", ps5_pro: "PS5 PRO", vr2: "PS VR2" };

  const INV_TYPE_ORDER = { ps5_pro: 0, ps5: 1, vr2: 2 };

  function orderDetailHtml(o) {
    const city = o.city || "tyumen";
    const status = normalizeOrderStatus(o.status);
    const comments = Array.isArray(o.adminComments) ? o.adminComments : [];
    const commentsHtml = comments.length
      ? comments
          .map(
            (c) => `
        <div class="order-comment">
          <p class="order-comment-meta">${escapeHtml(c.author || "Админ")} · ${escapeHtml(
              c.createdAt ? new Date(c.createdAt).toLocaleString("ru-RU") : ""
            )}</p>
          <p class="order-comment-text">${escapeHtml(c.text || "")}</p>
        </div>`
          )
          .join("")
      : `<p class="muted">Комментариев пока нет</p>`;

    let assignBlock = "";
    if (status === "issued") {
      const available = BackendAPI.listAvailableInventory(city, null, o.id);
      const options = available.length
        ? available
            .map(
              (i) => `
          <label class="console-option">
            <input type="radio" name="assign-${escapeHtml(o.id)}" value="${escapeHtml(i.id)}" ${
                o.assignedConsoleId === i.id ? "checked" : ""
              } />
            <span class="console-option-card">
              <strong>${escapeHtml(INV_TYPE_LABELS[i.type] || i.type)} №${escapeHtml(i.code)}</strong>
              <small>${escapeHtml(i.label)}</small>
            </span>
          </label>`
            )
            .join("")
        : `<p class="muted">Нет свободных приставок в этом городе</p>`;
      const current = o.assignedConsoleId
        ? `<p>Назначена: <strong>${escapeHtml(o.assignedConsoleLabel || "")} №${escapeHtml(
            o.assignedConsoleCode || ""
          )}</strong></p>`
        : `<p class="muted">Приставка ещё не назначена</p>`;
      assignBlock = `
        ${current}
        <div class="order-detail-actions">
          <div>
            <p class="admin-filter-label" style="margin-top:0">Назначить приставку</p>
            <div class="stack-choice" data-assign-group="${escapeHtml(o.id)}">
              ${options}
            </div>
          </div>
          <button type="button" class="btn btn-gold" data-assign-confirm="${escapeHtml(o.id)}">Подтвердить</button>
        </div>`;
    }

    return `
      <div class="order-detail-card" data-order-detail="${escapeHtml(o.id)}">
        <p><strong>Период аренды:</strong> ${escapeHtml(o.startDate)} — ${escapeHtml(o.endDate)} (${
      o.days || "—"
    } сут.)</p>
        <p><strong>Клиент:</strong> ${escapeHtml(o.customerName || "—")} · ${escapeHtml(
      o.customerPhone || "—"
    )}</p>
        <p><strong>Город:</strong> ${escapeHtml(o.cityLabel || BackendAPI.CITIES[city] || city)}</p>
        ${
          o.fulfillment === "delivery"
            ? `<p><strong>Доставка:</strong> ${escapeHtml(o.deliveryAddress || "—")}</p>`
            : `<p><strong>Самовывоз:</strong> ${escapeHtml(o.pickupLocation || "—")}</p>`
        }
        ${
          o.gameNote
            ? `<p><strong>Комментарий:</strong> ${escapeHtml(o.gameNote)}</p>`
            : ""
        }
        ${
          Array.isArray(o.extras) && o.extras.length
            ? `<p><strong>Доп. оборудование:</strong> ${escapeHtml(o.extras.join(", "))}</p>`
            : ""
        }
        ${
          o.discountPercent
            ? `<p><strong>Скидка:</strong> ${escapeHtml(String(o.discountPercent))}%${
                o.promoCode ? ` · промокод ${escapeHtml(o.promoCode)}` : " · лояльность"
              }</p>`
            : ""
        }
        ${assignBlock}
        <div class="order-comments">
          <p class="admin-filter-label" style="margin-top:0">Комментарии администратора</p>
          <div class="order-comments-list">${commentsHtml}</div>
          <form class="order-comment-form" data-comment-form="${escapeHtml(o.id)}">
            <textarea name="comment" maxlength="1000" placeholder="Заметка по заказу…" required></textarea>
            <button type="submit" class="btn btn-gold">Сохранить комментарий</button>
          </form>
        </div>
      </div>
    `;
  }



  async function renderOrdersTable(localOnly) {
    if (!els.ordersList) return;

    els.ordersList.innerHTML = '<p class="empty-cell">Загрузка заказов…</p>';

    const orders = localOnly
      ? BackendAPI.filterOrdersForAdmin(BackendAPI.listOrders())
      : await BackendAPI.listOrdersRemote();

    els.ordersList.innerHTML = "";

    let list = orders;
    if (state.adminCityFilter) {
      list = orders.filter((o) => (o.city || "tyumen") === state.adminCityFilter);
    }

    if (list.length === 0) {
      els.ordersList.innerHTML = '<p class="empty-cell">Заказов пока нет</p>';
      return;
    }

    list.forEach((o) => {
      const status = normalizeOrderStatus(o.status);
      const statusText = BackendAPI.statusLabel(status);
      const productCell = o.consoleLabel || o.productLabel || "—";
      const cityCell = o.cityLabel || BackendAPI.CITIES[o.city] || o.city || "—";
      const period = `${escapeHtml(o.startDate)} — ${escapeHtml(o.endDate)}`;
      const price = `${Number(o.totalPrice || 0).toLocaleString("ru-RU")} ₽`;

      const card = document.createElement("article");
      card.className = "order-card";
      card.dataset.orderId = o.id;
      card.innerHTML = `
        <div class="order-card-head">
          <div class="order-card-title-block">
            <p class="order-card-id">${escapeHtml(o.id)}</p>
            <h4 class="order-card-title">${escapeHtml(productCell)}${
              o.assignedConsoleCode
                ? ` <span class="status-pill status-issued">№${escapeHtml(o.assignedConsoleCode)}</span>`
                : ""
            }</h4>
            <p class="order-card-sub">${escapeHtml(o.customerName || "—")} · ${escapeHtml(cityCell)}</p>
          </div>
          <span class="status-pill status-${escapeHtml(status)}">${escapeHtml(statusText)}</span>
        </div>
        <div class="order-card-meta">
          <div><span>Период</span><strong>${period}</strong></div>
          <div><span>Сумма</span><strong>${price}</strong></div>
        </div>
        <div class="order-card-actions admin-actions-cell">${adminActionsHtml(o.id, status, o)}</div>
        ${
          state.expandedOrderId === o.id
            ? `<div class="order-card-detail">${orderDetailHtml(o)}</div>`
            : ""
        }
      `;
      els.ordersList.appendChild(card);
    });
  }



  function renderClientsTable() {

    const clients = BackendAPI.listClients();

    els.clientsTbody.innerHTML = "";

    if (clients.length === 0) {

      els.clientsTbody.innerHTML =

        '<tr><td colspan="4" class="empty-cell">Клиентов пока нет</td></tr>';

      return;

    }

    clients.forEach((c) => {

      const tr = document.createElement("tr");

      tr.innerHTML = `

        <td>${escapeHtml(c.fio)}${c.note ? `<br><small class="muted">${escapeHtml(c.note)}</small>` : ""}</td>

        <td>${escapeHtml(c.phone)}</td>

        <td>${escapeHtml(c.cityLabels || "—")}</td>

        <td>${escapeHtml(c.source || "—")}</td>

      `;

      els.clientsTbody.appendChild(tr);

    });

  }

  function sortInventory(list) {

    return list.slice().sort((a, b) => {

      const byCity = String(a.city).localeCompare(String(b.city), "ru");

      if (byCity !== 0) return byCity;

      const byType =

        (INV_TYPE_ORDER[a.type] ?? 9) - (INV_TYPE_ORDER[b.type] ?? 9);

      if (byType !== 0) return byType;

      return String(a.code).localeCompare(String(b.code), "ru", { numeric: true });

    });

  }

  async function renderInventoryTable() {

    if (!els.inventoryTbody) return;

    els.inventoryTbody.innerHTML =

      '<tr><td colspan="6" class="empty-cell">Загрузка…</td></tr>';

    const result = await BackendAPI.listInventory();

    els.inventoryTbody.innerHTML = "";

    if (!result.ok) {

      els.inventoryTbody.innerHTML =

        `<tr><td colspan="6" class="empty-cell">${escapeHtml(result.error || "Ошибка")}</td></tr>`;

      return;

    }

    let inv = result.inventory || [];

    if (state.invFilterCity) {

      inv = inv.filter((i) => i.city === state.invFilterCity);

    }

    if (state.invFilterType) {

      inv = inv.filter((i) => i.type === state.invFilterType);

    }

    inv = sortInventory(inv);

    if (!inv.length) {

      els.inventoryTbody.innerHTML =

        '<tr><td colspan="6" class="empty-cell">Нет приставок по фильтру — добавьте или сбросьте фильтр</td></tr>';

      return;

    }

    inv.forEach((item) => {

      const rented = item.status === "rented";

      const tr = document.createElement("tr");

      if (rented) tr.classList.add("inv-row-rented");

      tr.innerHTML = `

        <td>${escapeHtml(BackendAPI.CITIES[item.city] || item.city)}</td>

        <td>${escapeHtml(INV_TYPE_LABELS[item.type] || item.type)}</td>

        <td>

          <button type="button" class="inv-code-btn ${rented ? "is-rented" : ""}" data-inv-info="${escapeHtml(item.id)}">

            <span class="status-dot ${rented ? "is-rented" : ""}"></span>${escapeHtml(item.code)}

          </button>

        </td>

        <td>${escapeHtml(item.label)}</td>

        <td>${rented ? '<span class="status-pill status-issued">В аренде</span>' : '<span class="status-pill">Свободна</span>'}</td>

        <td>${rented ? "—" : `<button type="button" class="admin-action-btn admin-action-danger" data-inv-remove="${escapeHtml(item.id)}">Удалить</button>`}</td>

      `;

      els.inventoryTbody.appendChild(tr);

    });

  }



  function starsText(rating) {

    const n = Math.max(0, Math.min(5, Number(rating) || 0));

    return "★".repeat(n) + "☆".repeat(5 - n);

  }



  function renderReviews() {
    initAllCarousels();
  }

  function initAllCarousels() {
    document.querySelectorAll("[data-carousel]").forEach((root) => initPromoCarousel(root));
  }

  function initPromoCarousel(root) {
    if (!root || root.dataset.ready === "1") return;
    const slides = Array.from(root.querySelectorAll(".promo-slide"));
    const dots = Array.from(root.querySelectorAll("[data-carousel-dot]"));
    if (slides.length < 2) return;
    let index = 0;
    let timer = null;

    function go(to) {
      index = ((to % slides.length) + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    }

    function next() {
      go(index + 1);
    }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 5500);
    }

    root.querySelector("[data-carousel-prev]")?.addEventListener("click", () => {
      go(index - 1);
      restart();
    });
    root.querySelector("[data-carousel-next]")?.addEventListener("click", () => {
      next();
      restart();
    });
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        go(Number(dot.dataset.carouselDot) || 0);
        restart();
      });
    });

    root.dataset.ready = "1";
    restart();
  }



  function openReviewModal(order) {

    state.reviewOrderId = order.id;

    state.reviewRating = 0;

    if (els.reviewComment) els.reviewComment.value = "";

    if (els.reviewError) showError(els.reviewError, "");

    if (els.starRating) {

      els.starRating.querySelectorAll(".star-btn").forEach((b) => {

        b.classList.remove("is-active");

      });

    }

    if (els.reviewHint) {

      els.reviewHint.textContent =

        `Аренда ${order.id} завершена. Поставьте оценку и напишите короткий отзыв.`;

    }

    if (els.reviewModal) els.reviewModal.hidden = false;

  }



  async function maybePromptReview() {

    const session = BackendAPI.getClientSession();

    if (!session || !els.reviewModal) return;

    await BackendAPI.syncFromServer();

    renderReviews();

    const order = BackendAPI.listOrders().find(

      (o) =>

        o.customerPhone === session.phone &&

        o.status === "completed" &&

        !o.reviewLeft

    );

    if (order) openReviewModal(order);

  }



  function escapeHtml(str) {

    return String(str)

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;");

  }



  // —— Events ——

  document.querySelectorAll(".auth-tab").forEach((btn) => {

    btn.addEventListener("click", () => switchAuthTab(btn.dataset.tab));

  });



  document.querySelectorAll(".product-card").forEach((btn) => {

    btn.addEventListener("click", () => showProductDetail(btn.dataset.product));

  });



  els.backToHome.addEventListener("click", () => {

    resetBookingState();

    showBookingHome();

  });



  document.querySelectorAll(".mode-btn").forEach((btn) => {

    btn.addEventListener("click", () => {

      state.calendarMode = btn.dataset.mode;

      document.querySelectorAll(".mode-btn").forEach((b) => {

        b.classList.toggle("is-active", b === btn);

      });

      state.pickStep = "start";

      updateCalendarHint();

      if (state.calendarMode === "week") {

        showToast("Выберите день начала недели");

      }

    });

  });



  els.clearRangeBtn.addEventListener("click", clearRange);



  document.querySelectorAll('input[name="console-model"]').forEach((radio) => {

    radio.addEventListener("change", () => {

      state.consoleModel = radio.value === "ps5_pro" ? "ps5_pro" : "ps5";

      updateOrderSummary();

    });

  });



  els.loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const phone = els.loginForm.login.value.trim();

    const password = els.loginForm.password.value;

    showError(els.loginError, "");

    if (BackendAPI.isAdminPhone(phone)) {

      const result = await BackendAPI.adminLogin(phone, password);

      if (!result.ok) {

        showError(els.loginError, result.error);

        return;

      }

      showAdminDashboard();

      showToast("Вход в панель администратора");

      return;

    }

    const result = await BackendAPI.clientLogin(phone, password);

    if (!result.ok) {

      showError(els.loginError, result.error);

      return;

    }

    showBooking(result.session);

    showToast("Добро пожаловать!");

  });



  els.registerForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const fio = els.registerForm.name.value.trim();

    const phone = els.registerForm.login.value.trim();

    const password = els.registerForm.password.value;

    const password2 = els.registerForm.password2.value;



    if (!/^\d{10,11}$/.test(phone.replace(/\D/g, ""))) {

      showError(els.registerError, "Телефон — 10–11 цифр");

      return;

    }

    if (password !== password2) {

      showError(els.registerError, "Пароли не совпадают");

      return;

    }

    if (password.length < 6) {

      showError(els.registerError, "Пароль должен быть не короче 6 символов");

      return;

    }

    const regPrivacy = document.getElementById("reg-privacy-agree");

    if (regPrivacy && !regPrivacy.checked) {

      showError(els.registerError, "Нужно согласие на обработку персональных данных");

      return;

    }



    const result = await BackendAPI.clientRegister({ fio, phone, password });

    if (!result.ok) {

      showError(els.registerError, result.error);

      return;

    }

    showBooking(result.session);

    showToast("Регистрация успешна");

  });

  const forgotBtn = document.getElementById("forgot-password-btn");
  const resetBackLogin = document.getElementById("reset-back-login");
  const resetResendBtn = document.getElementById("reset-resend-btn");
  const resetConfirmHint = document.getElementById("reset-confirm-hint");
  let resetPhone = "";

  function showResetRequest() {
    if (els.loginForm) els.loginForm.hidden = true;
    if (els.registerForm) els.registerForm.hidden = true;
    if (els.resetRequestForm) els.resetRequestForm.hidden = false;
    if (els.resetConfirmForm) els.resetConfirmForm.hidden = true;
    if (els.resetRequestError) showError(els.resetRequestError, "");
    const phoneInput = document.getElementById("reset-phone");
    const loginPhone = document.getElementById("login-login");
    if (phoneInput && loginPhone && loginPhone.value && !phoneInput.value) {
      phoneInput.value = loginPhone.value;
    }
  }

  function showResetConfirm() {
    if (els.resetRequestForm) els.resetRequestForm.hidden = true;
    if (els.resetConfirmForm) els.resetConfirmForm.hidden = false;
    if (els.resetConfirmError) showError(els.resetConfirmError, "");
    const codeEl = document.getElementById("reset-code");
    if (codeEl) codeEl.value = "";
    if (resetConfirmHint) {
      resetConfirmHint.textContent = `Код отправлен на ${resetPhone}. Действует 10 минут.`;
    }
  }

  if (forgotBtn) {
    forgotBtn.addEventListener("click", () => showResetRequest());
  }
  if (resetBackLogin) {
    resetBackLogin.addEventListener("click", () => switchAuthTab("login"));
  }

  async function sendResetCode(phone) {
    const result = await BackendAPI.requestPasswordReset(phone);
    if (!result.ok) return result;
    resetPhone = phone.replace(/\D/g, "");
    if (resetPhone.length === 11 && resetPhone.startsWith("8")) {
      resetPhone = "7" + resetPhone.slice(1);
    }
    showResetConfirm();
    return result;
  }

  if (els.resetRequestForm) {
    els.resetRequestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(els.resetRequestError, "");
      const phone = document.getElementById("reset-phone")
        ? document.getElementById("reset-phone").value.trim()
        : "";
      const result = await sendResetCode(phone);
      if (!result.ok) showError(els.resetRequestError, result.error);
      else showToast("Если номер есть в системе, код уже в SMS");
    });
  }

  if (resetResendBtn) {
    resetResendBtn.addEventListener("click", async () => {
      showError(els.resetConfirmError, "");
      const result = await sendResetCode(resetPhone);
      if (!result.ok) showError(els.resetConfirmError, result.error);
      else showToast("Код отправлен повторно");
    });
  }

  if (els.resetConfirmForm) {
    els.resetConfirmForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(els.resetConfirmError, "");
      const code = document.getElementById("reset-code")
        ? document.getElementById("reset-code").value.trim()
        : "";
      const password = document.getElementById("reset-password")
        ? document.getElementById("reset-password").value
        : "";
      const password2 = document.getElementById("reset-password2")
        ? document.getElementById("reset-password2").value
        : "";
      const result = await BackendAPI.confirmPasswordReset({
        phone: resetPhone,
        code,
        newPassword: password,
        repeatPassword: password2,
      });
      if (!result.ok) {
        showError(els.resetConfirmError, result.error);
        return;
      }
      switchAuthTab("login");
      showToast(result.message || "Пароль обновлён. Войдите с новым паролем.");
    });
  }

  function showAdminPasswordModal() {
    if (!els.adminPasswordModal) return;
    if (els.adminNewPassword) els.adminNewPassword.value = "";
    if (els.adminNewPassword2) els.adminNewPassword2.value = "";
    if (els.adminPasswordError) showError(els.adminPasswordError, "");
    els.adminPasswordModal.hidden = false;
  }

  function hideAdminPasswordModal() {
    if (els.adminPasswordModal) els.adminPasswordModal.hidden = true;
  }

  if (els.adminPasswordForm) {
    els.adminPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const result = await BackendAPI.adminChangePassword(
        els.adminNewPassword ? els.adminNewPassword.value : "",
        els.adminNewPassword2 ? els.adminNewPassword2.value : ""
      );
      if (!result.ok) {
        showError(els.adminPasswordError, result.error);
        return;
      }
      hideAdminPasswordModal();
      showToast("Пароль сохранён. Теперь им можно войти с любого устройства");
    });
  }

  if (els.adminPasswordModal) {
    els.adminPasswordModal.addEventListener("click", (e) => {
      if (e.target === els.adminPasswordModal) e.stopPropagation();
    });
  }



  document.querySelectorAll(".admin-tab").forEach((btn) => {

    btn.addEventListener("click", () => switchAdminTab(btn.dataset.adminTab));

  });

  if (els.orderCity || document.getElementById("order-city-choice")) {

    document.querySelectorAll('input[name="order-city"]').forEach((radio) => {

      radio.addEventListener("change", async () => {

        if (!radio.checked) return;

        state.selectedCity = radio.value;

        const hidden = document.getElementById("order-city");

        if (hidden) hidden.value = radio.value;

        state.startDate = null;

        state.endDate = null;

        state.pickStep = "start";

        await BackendAPI.syncFromServer({ city: state.selectedCity });

        if (els.pickupNote) {

          els.pickupNote.textContent =

            "Адрес самовывоза: " +

            (BackendAPI.PICKUP_BY_CITY[state.selectedCity] || "уточнит менеджер");

        }

        renderCalendar();

        updateOrderSummary();

        updateOrderButtonState();

      });

    });

  }

  function setChipActive(container, attr, value) {

    if (!container) return;

    container.querySelectorAll(".choice-chip").forEach((btn) => {

      btn.classList.toggle("is-active", (btn.getAttribute(attr) || "") === value);

    });

  }

  if (els.adminCityFilter) {

    els.adminCityFilter.addEventListener("click", (e) => {

      const btn = e.target.closest(".choice-chip");

      if (!btn) return;

      state.adminCityFilter = btn.dataset.city || "";

      setChipActive(els.adminCityFilter, "data-city", state.adminCityFilter);

      renderOrdersTable(true);

    });

  }

  if (els.invFilterCity) {

    els.invFilterCity.addEventListener("click", (e) => {

      const btn = e.target.closest(".choice-chip");

      if (!btn) return;

      state.invFilterCity = btn.dataset.city || "";

      setChipActive(els.invFilterCity, "data-city", state.invFilterCity);

      renderInventoryTable();

    });

  }

  if (els.invFilterType) {

    els.invFilterType.addEventListener("click", (e) => {

      const btn = e.target.closest(".choice-chip");

      if (!btn) return;

      state.invFilterType = btn.dataset.type || "";

      setChipActive(els.invFilterType, "data-type", state.invFilterType);

      renderInventoryTable();

    });

  }

  document.querySelectorAll('input[name="inv-city-radio"]').forEach((radio) => {

    radio.addEventListener("change", () => {

      const hidden = document.getElementById("inv-city");

      if (hidden && radio.checked) hidden.value = radio.value;

    });

  });

  document.querySelectorAll('input[name="inv-type-radio"]').forEach((radio) => {

    radio.addEventListener("change", () => {

      const hidden = document.getElementById("inv-type");

      if (hidden && radio.checked) {

        hidden.value = radio.value;

        const label = document.getElementById("inv-label");

        if (label && !label.value) {

          label.value = INV_TYPE_LABELS[radio.value] || radio.value;

        }

      }

    });

  });

  function initClientMiniCalendar() {

    const now = todayStart();

    if (state.clientCalYear == null) {

      state.clientCalYear = now.getFullYear();

      state.clientCalMonth = now.getMonth();

    }

    renderClientMiniCalendar();

  }

  function isInClientRange(key) {

    if (!state.clientStartDate || !state.clientEndDate) return false;

    return key >= state.clientStartDate && key < state.clientEndDate;

  }

  function renderClientMiniCalendar() {

    if (!els.clientCalDays || !els.clientCalMonthLabel) return;

    const labelDate = new Date(state.clientCalYear, state.clientCalMonth, 1);

    els.clientCalMonthLabel.textContent = monthFormatter.format(labelDate);

    const firstDay = new Date(state.clientCalYear, state.clientCalMonth, 1);

    let startWeekday = firstDay.getDay();

    startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

    const daysInMonth = new Date(state.clientCalYear, state.clientCalMonth + 1, 0).getDate();

    const today = todayStart();

    els.clientCalDays.innerHTML = "";

    for (let i = 0; i < startWeekday; i += 1) {

      const empty = document.createElement("div");

      empty.className = "day-cell empty";

      empty.setAttribute("aria-hidden", "true");

      els.clientCalDays.appendChild(empty);

    }

    for (let day = 1; day <= daysInMonth; day += 1) {

      const date = new Date(state.clientCalYear, state.clientCalMonth, day);

      const key = toKey(date);

      const btn = document.createElement("button");

      btn.type = "button";

      btn.textContent = String(day);

      btn.dataset.date = key;

      const isPast = date < today;

      const inRange = isInClientRange(key);

      const isEdge = key === state.clientStartDate || key === state.clientEndDate;

      btn.className = "day-cell";

      if (isPast) {

        btn.classList.add("past");

        btn.disabled = true;

      } else if (inRange || isEdge) {

        btn.classList.add("selected");

        if (isEdge) btn.classList.add("range-edge");

      } else {

        btn.classList.add("available");

      }

      if (!isPast) {

        btn.addEventListener("click", () => onClientCalDayClick(key));

      }

      els.clientCalDays.appendChild(btn);

    }

    if (els.clientCalHint) {

      if (!state.clientStartDate) {

        els.clientCalHint.textContent = "Выберите дату начала аренды";

      } else if (!state.clientEndDate) {

        els.clientCalHint.textContent = "Выберите дату окончания";

      } else {

        els.clientCalHint.textContent = `Период: ${state.clientStartDate} — ${state.clientEndDate}`;

      }

    }

    if (els.clientStartDate) els.clientStartDate.value = state.clientStartDate || "";

    if (els.clientEndDate) els.clientEndDate.value = state.clientEndDate || "";

  }

  function onClientCalDayClick(key) {

    if (state.clientPickStep === "start" || !state.clientStartDate) {

      const end = addDays(key, 1);

      state.clientStartDate = key;

      state.clientEndDate = end;

      state.clientPickStep = "end";

    } else {

      let end = key;

      if (end <= state.clientStartDate) {

        end = addDays(state.clientStartDate, 1);

      }

      state.clientEndDate = end;

      state.clientPickStep = "start";

    }

    renderClientMiniCalendar();

  }

  if (els.clientAddForm) {

    els.clientAddForm.addEventListener("submit", async (e) => {

      e.preventDefault();

      const fd = new FormData(els.clientAddForm);

      const cityEl = document.getElementById("client-city");

      const productRadio = els.clientAddForm.querySelector('input[name="client-product-radio"]:checked');

      const model = (productRadio && productRadio.value) || "ps5";

      showError(els.clientAddError, "");

      if (!state.clientStartDate || !state.clientEndDate) {

        showError(els.clientAddError, "Выберите период аренды в календаре");

        return;

      }

      const days = PricingService.durationDays(state.clientStartDate, state.clientEndDate);

      if (days < 1) {

        showError(els.clientAddError, "Выберите период аренды в календаре");

        return;

      }

      const fio = String(fd.get("fio") || "").trim();

      const phone = String(fd.get("phone") || "").replace(/\D/g, "");

      const note = String(fd.get("note") || "").trim();

      const city = cityEl ? cityEl.value : fd.get("city");

      if (!fio || phone.length < 10) {

        showError(els.clientAddError, "Укажите ФИО и телефон");

        return;

      }

      const loyalty = BackendAPI.getClientLoyalty(phone);

      const basePrice = PricingService.calculateRentalPrice(days, model);

      const totalPrice = PricingService.applyDiscount(basePrice, loyalty.percent || 0);

      const isVr = model === "vr2";

      const product = isVr ? "vr2" : "ps5";

      const consoleModel = isVr ? null : model;

      const consoleLabel = isVr ? "PlayStation VR2" : model === "ps5_pro" ? "PS5 PRO" : "PS5";

      const productLabel = isVr ? PRODUCT_INFO.vr2.title : PRODUCT_INFO.ps5.title;

      const orderResult = await BackendAPI.createOrder({

        customerName: fio,

        customerPhone: phone,

        city,

        startDate: state.clientStartDate,

        endDate: state.clientEndDate,

        days,

        basePrice,

        totalPrice,

        fulfillment: "pickup",

        product,

        productLabel,

        consoleModel,

        consoleLabel,

        extras: [],

        extraGamepads: 0,

        gameNote: note,

      });

      if (!orderResult.ok) {

        showError(els.clientAddError, orderResult.error || "Не удалось создать заявку");

        return;

      }

      BackendAPI.addManualClient({

        fio,

        phone,

        city,

        note,

        startDate: state.clientStartDate,

        endDate: state.clientEndDate,

      });

      await notifyTelegram(orderResult.order);

      els.clientAddForm.reset();

      state.clientStartDate = null;

      state.clientEndDate = null;

      state.clientPickStep = "start";

      const cityHidden = document.getElementById("client-city");
      const admin = BackendAPI.getAdminSession();
      const resetCity =
        admin && admin.adminRole === "city" && admin.cities && admin.cities[0]
          ? admin.cities[0]
          : "tyumen";
      if (cityHidden) cityHidden.value = resetCity;
      document.querySelectorAll('input[name="client-city-radio"]').forEach((r) => {
        r.checked = r.value === resetCity;
      });
      document.querySelectorAll('input[name="client-product-radio"]').forEach((r) => {
        r.checked = r.value === "ps5";
      });

      renderClientMiniCalendar();

      state.expandedOrderId = orderResult.order && orderResult.order.id;

      showToast("Заявка добавлена в активные заказы");

      renderClientsTable();

      switchAdminTab("orders");

      await renderOrdersTable();

    });

  }

  document.querySelectorAll('input[name="client-city-radio"]').forEach((radio) => {

    radio.addEventListener("change", () => {

      const hidden = document.getElementById("client-city");

      if (hidden && radio.checked) hidden.value = radio.value;

      state.clientStartDate = null;

      state.clientEndDate = null;

      state.clientPickStep = "start";

      renderClientMiniCalendar();

    });

  });

  document.querySelectorAll('input[name="promo-city-radio"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      const hidden = document.getElementById("promo-city");
      if (hidden && radio.checked) hidden.value = radio.value;
    });
  });

  if (els.clientPrevMonth) {

    els.clientPrevMonth.addEventListener("click", () => {

      state.clientCalMonth -= 1;

      if (state.clientCalMonth < 0) {

        state.clientCalMonth = 11;

        state.clientCalYear -= 1;

      }

      renderClientMiniCalendar();

    });

  }

  if (els.clientNextMonth) {

    els.clientNextMonth.addEventListener("click", () => {

      state.clientCalMonth += 1;

      if (state.clientCalMonth > 11) {

        state.clientCalMonth = 0;

        state.clientCalYear += 1;

      }

      renderClientMiniCalendar();

    });

  }

  if (els.inventoryAddForm) {

    els.inventoryAddForm.addEventListener("submit", async (e) => {

      e.preventDefault();

      const cityEl = document.getElementById("inv-city");

      const typeEl = document.getElementById("inv-type");

      const codeEl = document.getElementById("inv-code");

      const labelEl = document.getElementById("inv-label");

      showError(els.inventoryError, "");

      const result = await BackendAPI.addInventory({

        city: cityEl ? cityEl.value : "tyumen",

        type: typeEl ? typeEl.value : "ps5",

        code: String(codeEl && codeEl.value || "").trim(),

        label: String(labelEl && labelEl.value || "").trim(),

      });

      if (!result.ok) {

        showError(els.inventoryError, result.error);

        return;

      }

      if (codeEl) codeEl.value = "";

      showToast("Приставка добавлена");

      await renderInventoryTable();

    });

  }

  if (els.inventoryTbody) {

    els.inventoryTbody.addEventListener("click", async (e) => {

      const infoBtn = e.target.closest("[data-inv-info]");

      if (infoBtn) {

        const item = BackendAPI.getInventoryById(infoBtn.dataset.invInfo);

        if (!item || !els.consoleInfoModal || !els.consoleInfoBody) return;

        if (item.status !== "rented") {

          els.consoleInfoBody.innerHTML = `

            <p><strong>${escapeHtml(item.label)} №${escapeHtml(item.code)}</strong></p>

            <p>Статус: свободна</p>

            <p>Город: ${escapeHtml(BackendAPI.CITIES[item.city] || item.city)}</p>

          `;

        } else {

          els.consoleInfoBody.innerHTML = `

            <p><strong>${escapeHtml(item.label)} №${escapeHtml(item.code)}</strong></p>

            <p>Статус: в аренде</p>

            <p>Клиент: ${escapeHtml(item.rentedName || "—")}</p>

            <p>Телефон: ${escapeHtml(item.rentedPhone || "—")}</p>

            <p>Период: ${escapeHtml(item.rentedFrom || "—")} — ${escapeHtml(item.rentedTo || "—")}</p>

            <p>Заказ: ${escapeHtml(item.rentedOrderId || "—")}</p>

          `;

        }

        els.consoleInfoModal.hidden = false;

        return;

      }

      const btn = e.target.closest("[data-inv-remove]");

      if (!btn) return;

      if (!window.confirm("Удалить приставку из базы?")) return;

      const result = await BackendAPI.removeInventory(btn.dataset.invRemove);

      if (!result.ok) {

        showToast(result.error || "Ошибка удаления");

        return;

      }

      showToast("Удалено");

      await renderInventoryTable();

    });

  }

  if (els.consoleInfoClose && els.consoleInfoModal) {

    els.consoleInfoClose.addEventListener("click", () => {

      els.consoleInfoModal.hidden = true;

    });

  }



  els.ordersTbody.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-comment-form]");
    if (!form) return;
    e.preventDefault();
    const orderId = form.dataset.commentForm;
    const textarea = form.querySelector("textarea");
    const text = textarea ? textarea.value : "";
    const result = await BackendAPI.addOrderComment(orderId, text);
    if (!result.ok) {
      showToast(result.error || "Не удалось сохранить комментарий");
      return;
    }
    showToast("Комментарий сохранён");
    state.expandedOrderId = orderId;
    await renderOrdersTable(true);
  });

  els.ordersTbody.addEventListener("click", async (e) => {

    const assignBtn = e.target.closest("[data-assign-confirm]");

    if (assignBtn) {

      const orderId = assignBtn.dataset.assignConfirm;

      const checked = els.ordersTbody.querySelector(

        `input[name="assign-${orderId}"]:checked`

      );

      const inventoryId = checked && checked.value;

      if (!inventoryId) {

        showToast("Выберите приставку");

        return;

      }

      const result = BackendAPI.assignConsoleToOrder(orderId, inventoryId);

      if (!result.ok) {

        showToast(result.error || "Не удалось назначить");

        return;

      }

      showToast(`Назначена приставка №${result.item.code}`);

      await renderOrdersTable(true);

      return;

    }

    const btn = e.target.closest(".admin-action-btn");

    if (!btn) return;

    const id = btn.dataset.id;

    const status = btn.dataset.action;

    if (status === "expand") {

      state.expandedOrderId = state.expandedOrderId === id ? null : id;

      await renderOrdersTable(true);

      return;

    }

    const confirmMsg = {

      issued: "Отметить заказ как «Аренда выдана»?",

      rejected: "Отметить заказ как «В аренде отказано»?",

      completed: "Закончить аренду по этому заказу?",

    };

    if (!window.confirm(confirmMsg[status] || "Изменить статус заказа?")) return;

    const result = await BackendAPI.updateOrderStatus(id, status);

    if (!result.ok) {

      showToast(result.error || "Не удалось обновить статус");

      return;

    }

    if (status === "issued") {

      state.expandedOrderId = id;

    }

    if (status === "completed" || status === "rejected") {

      if (state.expandedOrderId === id) state.expandedOrderId = null;

    }

    await renderOrdersTable(result.synced === false);

    showToast(

      result.synced === false

        ? BackendAPI.statusLabel(status) + " (локально)"

        : BackendAPI.statusLabel(status)

    );

  });



  function loyaltyTrophyClass(id) {
    if (id === "bronze") return "trophy-bronze";
    if (id === "silver") return "trophy-silver";
    if (id === "gold") return "trophy-gold";
    if (id === "platinum") return "trophy-platinum";
    return "trophy-none";
  }

  async function showCabinet() {
    const session = BackendAPI.getClientSession();
    if (!session || !els.cabinetScreen) {
      showAuth();
      return;
    }
    hideAllScreens();
    els.cabinetScreen.hidden = false;
    els.headerActions.hidden = false;
    if (els.cabinetBtn) els.cabinetBtn.hidden = false;
    els.userChip.textContent = session.fio || session.phone;
    await BackendAPI.syncFromServer();
    renderCabinet(session);
  }

  function renderCabinet(session) {
    const loyalty = BackendAPI.getClientLoyalty(session.phone);
    const fioEl = document.getElementById("cab-fio");
    const phoneEl = document.getElementById("cab-phone");
    const titleEl = document.getElementById("cab-loyalty-title");
    const metaEl = document.getElementById("cab-loyalty-meta");
    const trophy = document.querySelector("#cabinet-loyalty .trophy");
    if (fioEl) fioEl.textContent = session.fio || "—";
    if (phoneEl) phoneEl.textContent = session.phone || "—";
    if (titleEl) {
      titleEl.textContent = loyalty.percent
        ? `${loyalty.label} · скидка ${loyalty.percent}%`
        : loyalty.label;
    }
    if (metaEl) {
      metaEl.textContent =
        loyalty.id === "platinum"
          ? `Выполнено заказов: ${loyalty.orderCount}. Максимальная скидка 30%.`
          : `Выполнено заказов: ${loyalty.orderCount}. До следующего уровня осталось ${loyalty.remaining}.`;
    }
    if (trophy) trophy.className = `trophy ${loyaltyTrophyClass(loyalty.id)}`;

    const box = document.getElementById("cabinet-orders");
    if (!box) return;
    const orders = BackendAPI.listClientOrders(session.phone);
    if (!orders.length) {
      box.innerHTML = '<p class="empty-cell">Заказов пока нет</p>';
      initAllCarousels();
      return;
    }
    box.innerHTML = orders
      .map((o) => {
        const status = BackendAPI.statusLabel(normalizeOrderStatus(o.status));
        const addr =
          o.fulfillment === "delivery"
            ? o.deliveryAddress || "—"
            : o.pickupLocation || "Самовывоз";
        return `
        <article class="order-card cabinet-order-card">
          <div class="order-card-head">
            <div class="order-card-title-block">
              <p class="order-card-id">${escapeHtml(o.id)}</p>
              <h4 class="order-card-title">${escapeHtml(o.consoleLabel || o.productLabel || "Заказ")}</h4>
              <p class="order-card-sub">${escapeHtml(o.cityLabel || "")} · ${escapeHtml(session.fio || "")}</p>
            </div>
            <span class="status-pill status-${escapeHtml(normalizeOrderStatus(o.status))}">${escapeHtml(status)}</span>
          </div>
          <div class="order-card-meta">
            <div><span>Сроки аренды</span><strong>${escapeHtml(o.startDate)} — ${escapeHtml(o.endDate)}</strong></div>
            <div><span>Адрес</span><strong>${escapeHtml(addr)}</strong></div>
            <div><span>Сумма</span><strong>${Number(o.totalPrice || 0).toLocaleString("ru-RU")} ₽</strong></div>
            ${o.gameNote ? `<div><span>Комментарий</span><strong>${escapeHtml(o.gameNote)}</strong></div>` : ""}
          </div>
        </article>`;
      })
      .join("");
    initAllCarousels();
  }

  async function renderPromosTable() {
    if (!els.promosTbody) return;
    const raw = await BackendAPI.listPromosRemote();
    const list = BackendAPI.filterPromosForAdmin(raw);
    if (!list.length) {
      els.promosTbody.innerHTML =
        '<tr><td colspan="6" class="empty-cell">Промокодов пока нет</td></tr>';
      return;
    }
    els.promosTbody.innerHTML = "";
    list.forEach((p) => {
      const cityLabel = p.city
        ? BackendAPI.CITIES[p.city] || p.city
        : "Все города";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(p.code)}</strong></td>
        <td>${escapeHtml(cityLabel)}</td>
        <td>${escapeHtml(String(p.percent))}%</td>
        <td>${p.used ? "Использован" : "Активен"}</td>
        <td>${escapeHtml(p.createdBy || "—")}</td>
        <td>${p.used ? escapeHtml(p.usedByPhone || p.usedOrderId || "да") : "—"}</td>`;
      els.promosTbody.appendChild(tr);
    });
  }

  els.logoutBtn.addEventListener("click", () => {

    BackendAPI.clientLogout();

    BackendAPI.adminLogout();

    state.wantedGames = [];

    wantedGamesHint();

    resetBookingState();

    showAuth();

  });

  if (els.cabinetBtn) {
    els.cabinetBtn.addEventListener("click", () => {
      showCabinet();
    });
  }
  if (els.cabinetBack) {
    els.cabinetBack.addEventListener("click", () => {
      const session = BackendAPI.getClientSession();
      if (session) showBooking(session);
    });
  }
  if (els.promoCreateForm) {
    els.promoCreateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      showError(els.promoError, "");
      const percent = els.promoPercent ? els.promoPercent.value : 15;
      const cityEl = document.getElementById("promo-city");
      const city = cityEl ? cityEl.value : "";
      const result = await BackendAPI.createPromo(percent, city);
      if (!result.ok) {
        showError(els.promoError, result.error || "Не удалось создать промокод");
        return;
      }
      if (els.promoLast) {
        els.promoLast.hidden = false;
        els.promoLast.innerHTML = `Код: <strong>${escapeHtml(result.promo.code)}</strong> · скидка ${escapeHtml(
          String(result.promo.percent)
        )}% · ${escapeHtml(
          result.promo.city
            ? BackendAPI.CITIES[result.promo.city] || result.promo.city
            : "все города"
        )}. Действует один раз.`;
      }
      showToast(`Промокод ${result.promo.code} создан`);
      await renderPromosTable();
    });
  }



  els.prevMonth.addEventListener("click", () => {

    state.viewMonth -= 1;

    if (state.viewMonth < 0) {

      state.viewMonth = 11;

      state.viewYear -= 1;

    }

    renderCalendar();

  });



  els.nextMonth.addEventListener("click", () => {

    state.viewMonth += 1;

    if (state.viewMonth > 11) {

      state.viewMonth = 0;

      state.viewYear += 1;

    }

    renderCalendar();

  });



  document.querySelectorAll('input[name="fulfillment"]').forEach((radio) => {

    radio.addEventListener("change", () => {

      state.fulfillment = radio.value;

      updateFulfillmentUI();

    });

  });



  [els.deliveryCity, els.deliveryStreet, els.deliveryApt].forEach((input) => {
    if (input) input.addEventListener("input", updateOrderButtonState);
  });
  if (els.orderPromo) {
    els.orderPromo.addEventListener("input", updateOrderSummary);
  }



  els.termsAgree.addEventListener("change", () => {

    state.termsAgreed = els.termsAgree.checked;

    state.privacyAgreed = els.termsAgree.checked;

    updateOrderButtonState();

  });

  if (els.privacyAgree) {

    els.privacyAgree.addEventListener("change", () => {

      state.privacyAgreed = els.privacyAgree.checked;

      updateOrderButtonState();

    });

  }

  function openLegalModal(id) {

    const modal = document.getElementById(id);

    if (modal) modal.hidden = false;

  }

  function closeLegalModal(id) {

    const modal = document.getElementById(id);

    if (modal) modal.hidden = true;

  }

  document.querySelectorAll(".js-open-oferta").forEach((btn) => {

    btn.addEventListener("click", (e) => {

      e.preventDefault();

      e.stopPropagation();

      openLegalModal("oferta-modal");

    });

  });

  document.querySelectorAll(".js-open-privacy").forEach((btn) => {

    btn.addEventListener("click", (e) => {

      e.preventDefault();

      e.stopPropagation();

      openLegalModal("privacy-modal");

    });

  });

  document.querySelectorAll(".js-close-legal").forEach((btn) => {

    btn.addEventListener("click", () => closeLegalModal(btn.dataset.closeModal));

  });

  ["oferta-modal", "privacy-modal"].forEach((id) => {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.addEventListener("click", (e) => {

      if (e.target === modal) closeLegalModal(id);

    });

  });



  if (els.extraGamepadQty) {

    els.extraGamepadQty.addEventListener("change", () => {

      state.extras.gamepadQty = Number(els.extraGamepadQty.value) || 0;

      updateOrderSummary();

    });

  }



  if (els.extraTv) {

    els.extraTv.addEventListener("change", () => {

      state.extras.tv = els.extraTv.checked;

      updateOrderSummary();

    });

  }



  if (els.starRating) {

    els.starRating.addEventListener("click", (e) => {

      const btn = e.target.closest(".star-btn");

      if (!btn) return;

      const n = Number(btn.dataset.star);

      state.reviewRating = n;

      els.starRating.querySelectorAll(".star-btn").forEach((b) => {

        b.classList.toggle("is-active", Number(b.dataset.star) <= n);

      });

      if (els.reviewError) showError(els.reviewError, "");

    });

  }



  if (els.reviewSkip) {

    els.reviewSkip.addEventListener("click", () => {

      if (els.reviewModal) els.reviewModal.hidden = true;

      state.reviewOrderId = null;

      state.reviewRating = 0;

    });

  }



  if (els.reviewSubmit) {

    els.reviewSubmit.addEventListener("click", async () => {

      if (state.reviewRating < 1) {

        showError(els.reviewError, "Выберите оценку от 1 до 5");

        return;

      }

      const session = BackendAPI.getClientSession();

      if (!session || !state.reviewOrderId) {

        showError(els.reviewError, "Сессия не найдена");

        return;

      }

      els.reviewSubmit.disabled = true;

      const result = await BackendAPI.addReview({

        orderId: state.reviewOrderId,

        customerPhone: session.phone,

        customerName: session.fio,

        rating: state.reviewRating,

        comment: (els.reviewComment?.value || "").trim(),

      });

      els.reviewSubmit.disabled = false;

      if (!result.ok) {

        showError(els.reviewError, result.error || "Не удалось отправить отзыв");

        return;

      }

      if (els.reviewModal) els.reviewModal.hidden = true;

      state.reviewOrderId = null;

      state.reviewRating = 0;

      renderReviews();

      showToast("Спасибо за отзыв!");

    });

  }



  els.orderForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const days = PricingService.durationDays(state.startDate, state.endDate);

    if (days < 1) {

      showError(els.orderError, "Выберите период аренды (минимум 24 часа)");

      return;

    }

    if (!state.termsAgreed) {

      showError(els.orderError, "Необходимо согласие с публичной офертой и обработкой персональных данных");

      return;

    }

    if (state.fulfillment === "delivery" && !deliveryFilled()) {

      showError(els.orderError, "Укажите город и улицу с домом");

      return;

    }

    showError(els.orderError, "");



    const session = BackendAPI.getClientSession();

    const quote = currentQuote();

    if (quote.promoError) {
      showError(els.orderError, quote.promoError);
      return;
    }

    const productInfo = PRODUCT_INFO[state.selectedProduct];



    if (!state.selectedCity) {

      showError(els.orderError, "Выберите город");

      return;

    }

    const result = await BackendAPI.createOrder({

      customerName: session.fio,

      customerPhone: session.phone,

      city: state.selectedCity,

      startDate: state.startDate,

      endDate: state.endDate,

      days,

      basePrice: quote.base,

      totalPrice: quote.total,

      fulfillment: state.fulfillment,

      deliveryCity: state.fulfillment === "delivery" ? els.deliveryCity.value.trim() : "",

      deliveryStreet: state.fulfillment === "delivery" ? els.deliveryStreet.value.trim() : "",

      deliveryApt: state.fulfillment === "delivery" ? (els.deliveryApt.value || "").trim() : "",

      promoCode: els.orderPromo ? els.orderPromo.value.trim() : "",

      gameNote: (els.orderGameNote ? els.orderGameNote.value.trim() : "") || (state.wantedGames.length ? "Игры: " + state.wantedGames.join(", ") : ""),

      extraGamepads: Number(state.extras.gamepadQty) || 0,

      product: state.selectedProduct,

      productLabel: productInfo?.title || "",

      consoleModel: state.selectedProduct === "ps5" ? state.consoleModel : null,

      consoleLabel: consoleLabelForOrder(),

      extras: getSelectedExtras(),

    });

    if (!result.ok) {

      showError(els.orderError, result.error || "Не удалось оформить заказ");

      return;

    }



    els.orderBtn.disabled = true;

    const tgResult = await notifyTelegram(result.order);

    els.orderBtn.disabled = false;



    const fulfillLabel =

      state.fulfillment === "delivery"

        ? `Доставка: ${[els.deliveryCity.value.trim(), els.deliveryStreet.value.trim(), els.deliveryApt.value.trim()].filter(Boolean).join(", ")}`

        : `Самовывоз: ${BackendAPI.PICKUP_BY_CITY[state.selectedCity] || BackendAPI.PICKUP_LOCATION}`;



    els.successText.textContent =

      `Заказ ${result.order.id} принят. Скоро с вами свяжется менеджер и уточнит детали ` +

      `(оплату, комплектацию и время ${state.fulfillment === "delivery" ? "доставки" : "самовывоза"}). ` +

      `${productInfo?.title || "Аренда"} · ${days} сут. · ${fulfillLabel}.`;

    els.successModal.hidden = false;



    if (!result.synced) {

      showToast("Заказ сохранён локально. Синхронизация с сервером не удалась — админ на другом устройстве может его не увидеть.");

    }

    if (!tgResult.ok) {

      showToast(`Telegram: ${tgResult.error || tgResult.telegramError || "не отправлено"}. Проверьте переменные в Netlify.`);

    }

    if (tgResult.email) {

      showToast("Подписанный договор отправлен на PristavkaRyadom@yandex.ru");

    } else if (tgResult.emailError && !tgResult.emailSkipped) {

      showToast(`Договор на почту: ${tgResult.emailError}`);

    }



    clearRange();

    els.orderForm.reset();

    state.wantedGames = [];

    wantedGamesHint();

    document.getElementById("opt-delivery").checked = true;

    state.fulfillment = "delivery";

    state.termsAgreed = false;

    state.privacyAgreed = false;

    state.extras = { gamepadQty: 0, tv: false };

    updateFulfillmentUI();

    renderCalendar();

    updateOrderSummary();

  });



  els.successClose.addEventListener("click", () => {

    els.successModal.hidden = true;

    showBookingHome();

  });



  const adminSession = BackendAPI.getAdminSession();

  const clientSession = BackendAPI.getClientSession();

  if (adminSession) {

    showAdminDashboard();

  } else if (clientSession) {

    showBooking(clientSession);

  } else {

    showAuth();

  }

})();

