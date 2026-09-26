/**
 * Netlify Blobs with env / local filesystem fallback.
 *
 * Priority:
 * 1) connectLambda(event) + getStore(name) — Functions v1
 * 2) siteID + token from env (NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN)
 * 3) local JSON files under .netlify/blobs-fallback/ (только локально / netlify dev)
 *
 * На проде Netlify НЕ используем /tmp — данные там не общие между браузерами.
 */
const { getStore, connectLambda } = require("@netlify/blobs");
const fs = require("fs");
const path = require("path");

function fileStoreRoot(name) {
  const base = path.join(process.cwd(), ".netlify", "blobs-fallback", name);
  fs.mkdirSync(base, { recursive: true });
  return base;
}

function createFileStore(name) {
  const root = fileStoreRoot(name);
  return {
    async get(key, opts) {
      const file = path.join(root, encodeURIComponent(key) + ".json");
      if (!fs.existsSync(file)) return null;
      const raw = fs.readFileSync(file, "utf8");
      if (opts && opts.type === "json") {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return raw;
    },
    async setJSON(key, value) {
      const file = path.join(root, encodeURIComponent(key) + ".json");
      fs.writeFileSync(file, JSON.stringify(value), "utf8");
    },
    async set(key, value) {
      const file = path.join(root, encodeURIComponent(key) + ".json");
      fs.writeFileSync(file, typeof value === "string" ? value : String(value), "utf8");
    },
  };
}

function isNetlifyRuntime() {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.NETLIFY_DEV === "true"
  );
}

function envCredentials() {
  let siteID = String(process.env.NETLIFY_SITE_ID || process.env.SITE_ID || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  const token = String(
    process.env.NETLIFY_AUTH_TOKEN ||
      process.env.NETLIFY_BLOBS_TOKEN ||
      process.env.BLOBS_TOKEN ||
      ""
  )
    .trim()
    .replace(/^["']|["']$/g, "");
  // URL сайта сюда часто вставляют по ошибке — Blobs нужен UUID
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteID)) {
    siteID = "";
  }
  return siteID && token ? { siteID, token } : null;
}

/**
 * @param {string} name
 * @param {object} [event] — Lambda event for connectLambda (Functions v1)
 */
function getRentalStore(name, event) {
  if (event) {
    try {
      connectLambda(event);
    } catch (_) {
      /* already connected or not a Lambda event */
    }
  }

  const errors = [];

  try {
    return getStore(name);
  } catch (err) {
    errors.push("auto: " + (err && err.message ? err.message : err));
  }

  const creds = envCredentials();
  if (creds) {
    try {
      return getStore({ name, siteID: creds.siteID, token: creds.token });
    } catch (err) {
      errors.push("env: " + (err && err.message ? err.message : err));
    }
  }

  const msg = errors.join(" | ") || "unknown";

  if (isNetlifyRuntime() && process.env.NETLIFY_DEV !== "true") {
    throw new Error(
      "Netlify Blobs не настроены. NETLIFY_SITE_ID должен быть UUID (Site ID), не адрес сайта. Затем NETLIFY_AUTH_TOKEN и Redeploy. " +
        msg
    );
  }

  if (/not been configured|siteID|token|MissingBlobs/i.test(msg)) {
    console.warn(
      "[blobs] Using local file store (.netlify/blobs-fallback). For shared DB set NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN"
    );
    return createFileStore(name);
  }
  throw new Error(msg);
}

module.exports = { getRentalStore, createFileStore };
