/**
 * Admin API (Netlify Blobs + env secrets).
 * POST actions: login | changePassword | listInventory | addInventory | removeInventory | listAdminsMeta
 * GET: health / seed status (no secrets)
 *
 * Env (Netlify → Environment variables), NOT in frontend:
 *   ADMIN_ALEX_PASSWORD, ADMIN_GEORGE_PASSWORD, ADMIN_NEFT_PASSWORD
 */
const { getRentalStore } = require("./lib/store");
const crypto = require("crypto");

const STORE = "ps5-rental";
const ADMINS_KEY = "admins";
const INVENTORY_KEY = "inventory";

const CITIES = {
  tyumen: "Тюмень",
  surgut: "Сургут",
  nefteyugansk: "Нефтеюганск",
};

const ALL_CITIES = ["tyumen", "surgut", "nefteyugansk"];
const INITIAL_PASSWORD = "12345";
const AUTH_VERSION = 2;

function cors() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(code, body) {
  return { statusCode: code, headers: cors(), body: JSON.stringify(body) };
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), s, 64).toString("hex");
  return { salt: s, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    const h = crypto.scryptSync(String(password), salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
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
  push("tyumen", "ps5_pro", "1", "PS5 PRO");
  ["1", "3", "4", "5", "6", "8", "9", "10", "2A", "3A", "4A", "5A", "6A", "7A"].forEach((c) =>
    push("tyumen", "ps5", c, "PS5")
  );
  push("tyumen", "vr2", "1", "VR2");

  push("surgut", "ps5_pro", "2", "PS5 PRO");
  ["2", "7", "C1", "C2", "C4"].forEach((c) => push("surgut", "ps5", c, "PS5"));
  push("surgut", "vr2", "2", "VR2");

  push("nefteyugansk", "ps5", "1A", "PS5");
  push("nefteyugansk", "ps5", "C3", "PS5");

  return items;
}

async function ensureAdmins(store) {
  const seedDefs = [
    {
      phone: "79821415152",
      name: "Александр",
      role: "super",
      cities: ALL_CITIES.slice(),
      passEnv: "ADMIN_ALEX_PASSWORD",
    },
    {
      phone: "79227702068",
      name: "Георгий",
      role: "super",
      cities: ALL_CITIES.slice(),
      passEnv: "ADMIN_GEORGE_PASSWORD",
    },
    {
      phone: "79090490349",
      name: "Админ Нефтеюганск",
      role: "city",
      cities: ["nefteyugansk"],
      passEnv: "ADMIN_NEFT_PASSWORD",
    },
  ];

  function buildAdmin(d) {
    const password = process.env[d.passEnv] || INITIAL_PASSWORD;
    const { salt, hash } = hashPassword(password);
    return {
      phone: d.phone,
      name: d.name,
      role: d.role,
      cities: d.cities,
      salt,
      hash,
      envPasswordFp: process.env[d.passEnv]
        ? crypto.createHash("sha256").update(String(password)).digest("hex")
        : null,
      token: null,
      mustChangePassword: !process.env[d.passEnv],
      passwordChangedByUser: false,
      authVersion: AUTH_VERSION,
      updatedAt: new Date().toISOString(),
    };
  }

  let admins = await store.get(ADMINS_KEY, { type: "json" });
  let changed = false;

  if (!Array.isArray(admins) || admins.length === 0) {
    admins = seedDefs.map(buildAdmin);
    await store.setJSON(ADMINS_KEY, admins);
    return admins;
  }

  for (const d of seedDefs) {
    if (!admins.some((a) => a.phone === d.phone)) {
      admins.push(buildAdmin(d));
      changed = true;
    }
  }

  // Reset leftover default hashes so login works from any device with 12345
  // until the admin changes password (stored in Blobs).
  for (const d of seedDefs) {
    const admin = admins.find((a) => a.phone === d.phone);
    if (!admin) continue;
    if (admin.authVersion === AUTH_VERSION || admin.passwordChangedByUser) continue;
    const password = process.env[d.passEnv] || INITIAL_PASSWORD;
    const { salt, hash } = hashPassword(password);
    admin.salt = salt;
    admin.hash = hash;
    admin.mustChangePassword = !process.env[d.passEnv];
    admin.authVersion = AUTH_VERSION;
    admin.envPasswordFp = process.env[d.passEnv]
      ? crypto.createHash("sha256").update(String(password)).digest("hex")
      : null;
    admin.updatedAt = new Date().toISOString();
    changed = true;
  }

  // Keep env passwords in sync until the admin changes password in UI
  const force = process.env.ADMIN_FORCE_PASSWORD_SYNC === "1";
  for (const d of seedDefs) {
    const admin = admins.find((a) => a.phone === d.phone);
    const pass = process.env[d.passEnv];
    if (!admin || !pass) continue;
    if (admin.passwordChangedByUser && !force) continue;
    const fp = crypto.createHash("sha256").update(String(pass)).digest("hex");
    if (!force && admin.envPasswordFp === fp) continue;
    const { salt, hash } = hashPassword(pass);
    admin.salt = salt;
    admin.hash = hash;
    admin.envPasswordFp = fp;
    admin.mustChangePassword = false;
    if (force) admin.passwordChangedByUser = false;
    admin.updatedAt = new Date().toISOString();
    changed = true;
  }

  if (changed) await store.setJSON(ADMINS_KEY, admins);
  return admins;
}

async function ensureInventory(store) {
  let inv = await store.get(INVENTORY_KEY, { type: "json" });
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
  if (changed) await store.setJSON(INVENTORY_KEY, inv);
  return inv;
}

function publicAdmin(a) {
  return {
    phone: a.phone,
    name: a.name,
    role: a.role,
    cities: a.cities,
    mustChangePassword: Boolean(a.mustChangePassword),
  };
}

function findByToken(admins, token) {
  if (!token) return null;
  return admins.find((a) => a.token && a.token === token) || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(), body: "" };
  }

  let store;
  try {
    store = getRentalStore(STORE, event);
  } catch (err) {
    return json(500, { ok: false, error: "Blobs: " + (err.message || err) });
  }

  if (event.httpMethod === "GET") {
    await ensureAdmins(store);
    await ensureInventory(store);
    return json(200, {
      ok: true,
      cities: CITIES,
      hint: "POST login / changePassword / inventory actions",
    });
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

  const action = payload.action || "login";
  const admins = await ensureAdmins(store);

  try {
    if (action === "login") {
      const phone = normalizePhone(payload.phone);
      const password = String(payload.password || "");
      const admin = admins.find((a) => a.phone === phone);
      if (!admin || !verifyPassword(password, admin.salt, admin.hash)) {
        return json(401, { ok: false, error: "Неверный телефон или пароль администратора" });
      }
      admin.token = makeToken();
      admin.lastLoginAt = new Date().toISOString();
      await store.setJSON(ADMINS_KEY, admins);
      return json(200, {
        ok: true,
        session: {
          role: "admin",
          phone: admin.phone,
          name: admin.name,
          adminRole: admin.role,
          cities: admin.cities,
          token: admin.token,
          mustChangePassword: Boolean(admin.mustChangePassword),
          loggedInAt: admin.lastLoginAt,
        },
        cities: CITIES,
      });
    }

    if (action === "changePassword") {
      const admin = findByToken(admins, payload.token);
      if (!admin) return json(401, { ok: false, error: "Сессия истекла. Войдите снова." });
      const current = String(payload.currentPassword || "");
      const next = String(payload.newPassword || "");
      if (next.length < 5) {
        return json(400, { ok: false, error: "Пароль не короче 5 символов" });
      }
      if (next === INITIAL_PASSWORD) {
        return json(400, { ok: false, error: "Придумайте пароль, отличный от стартового" });
      }
      if (!admin.mustChangePassword && !verifyPassword(current, admin.salt, admin.hash)) {
        return json(400, { ok: false, error: "Текущий пароль неверен" });
      }
      const { salt, hash } = hashPassword(next);
      admin.salt = salt;
      admin.hash = hash;
      admin.mustChangePassword = false;
      admin.passwordChangedByUser = true;
      admin.authVersion = AUTH_VERSION;
      admin.updatedAt = new Date().toISOString();
      admin.token = makeToken();
      await store.setJSON(ADMINS_KEY, admins);
      return json(200, {
        ok: true,
        session: {
          role: "admin",
          phone: admin.phone,
          name: admin.name,
          adminRole: admin.role,
          cities: admin.cities,
          token: admin.token,
          mustChangePassword: false,
          loggedInAt: new Date().toISOString(),
        },
      });
    }

    if (action === "listInventory") {
      const admin = findByToken(admins, payload.token);
      if (!admin) return json(401, { ok: false, error: "Нужна авторизация админа" });
      const inv = await ensureInventory(store);
      const filtered = inv.filter((i) => admin.cities.includes(i.city));
      return json(200, { ok: true, inventory: filtered, cities: CITIES });
    }

    if (action === "addInventory") {
      const admin = findByToken(admins, payload.token);
      if (!admin) return json(401, { ok: false, error: "Нужна авторизация админа" });
      const city = payload.city;
      const type = payload.type;
      const code = String(payload.code || "").trim();
      const label = String(payload.label || "").trim();
      if (!CITIES[city] || !["ps5", "ps5_pro", "vr2"].includes(type) || !code || !label) {
        return json(400, { ok: false, error: "Укажите город, тип, код и название" });
      }
      if (!admin.cities.includes(city)) {
        return json(403, { ok: false, error: "Нет доступа к этому городу" });
      }
      const inv = await ensureInventory(store);
      if (inv.some((i) => i.city === city && i.type === type && i.code === code)) {
        return json(409, { ok: false, error: "Такая приставка уже есть в базе" });
      }
      const item = {
        id: `INV-${city}-${type}-${code}-${Date.now().toString(36)}`,
        city,
        type,
        code,
        label,
        status: "available",
        createdAt: new Date().toISOString(),
      };
      inv.push(item);
      await store.setJSON(INVENTORY_KEY, inv);
      return json(200, { ok: true, item, inventory: inv.filter((i) => admin.cities.includes(i.city)) });
    }

    if (action === "removeInventory") {
      const admin = findByToken(admins, payload.token);
      if (!admin) return json(401, { ok: false, error: "Нужна авторизация админа" });
      const inv = await ensureInventory(store);
      const idx = inv.findIndex((i) => i.id === payload.id);
      if (idx < 0) return json(404, { ok: false, error: "Не найдено" });
      if (!admin.cities.includes(inv[idx].city)) {
        return json(403, { ok: false, error: "Нет доступа к этому городу" });
      }
      inv.splice(idx, 1);
      await store.setJSON(INVENTORY_KEY, inv);
      return json(200, { ok: true, inventory: inv.filter((i) => admin.cities.includes(i.city)) });
    }

    if (action === "me") {
      const admin = findByToken(admins, payload.token);
      if (!admin) return json(401, { ok: false, error: "Сессия истекла" });
      return json(200, { ok: true, admin: publicAdmin(admin), cities: CITIES });
    }

    return json(400, { ok: false, error: "Unknown action" });
  } catch (err) {
    return json(500, { ok: false, error: err.message || "Server error" });
  }
};
