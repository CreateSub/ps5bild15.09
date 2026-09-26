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
