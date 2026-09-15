/**
 * Сборка для Netlify:
 * 1) js/main.js — intro + pricing + backend + catalog-data + app
 * 2) styles.css + home.css + intro.css
 * 3) dist/index.html — CSS и JS внутри одного HTML
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const parts = ["js/intro.js", "js/pricing.js", "js/backend.js", "js/catalog-data.js", "app.js"];
const out = path.join(root, "js", "main.js");
const htmlPath = path.join(root, "index.html");

const CSS_MARK_START = "<!-- inject:css -->";
const CSS_MARK_END = "<!-- /inject:css -->";
const JS_MARK_START = "<!-- inject:main-js -->";
const JS_MARK_END = "<!-- /inject:main-js -->";

function escapeForScript(js) {
  return js.replace(/<\/script/gi, "<\\/script");
}

const jsContent =
  "/* PS5 Rental bundle: intro + pricing + backend + catalog + app */\n" +
  parts.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n\n");

fs.writeFileSync(out, jsContent, "utf8");
console.log("OK: js/main.js (" + Math.round(jsContent.length / 1024) + " KB)");

const stylesPath = path.join(root, "styles.css");
let styles = fs.readFileSync(stylesPath, "utf8");

function syncCssBlock(markerStart, markerEnd, fileRel) {
  const filePath = path.join(root, fileRel);
  const content = fs.readFileSync(filePath, "utf8");
  const block = `${markerStart}\n${content}\n${markerEnd}`;
  const escapedStart = markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedStart}[\\s\\S]*?(?:${escapedEnd}|$)`);
  if (re.test(styles)) {
    styles = styles.replace(re, block);
  } else {
    styles = styles + "\n\n" + block;
  }
}

syncCssBlock("/* —— home.css —— */", "/* —— /home.css —— */", "css/home.css");
syncCssBlock("/* —— intro.css —— */", "/* —— /intro.css —— */", "css/intro.css");

fs.writeFileSync(stylesPath, styles, "utf8");
console.log("OK: styles.css sync home.css + intro.css (" + Math.round(styles.length / 1024) + " KB)");

let html = fs.readFileSync(htmlPath, "utf8");

const cssBlockRegex = new RegExp(
  CSS_MARK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "[\\s\\S]*?" +
    CSS_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
);
const jsBlockRegex = new RegExp(
  JS_MARK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "[\\s\\S]*?" +
    JS_MARK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
);

if (!cssBlockRegex.test(html) || !jsBlockRegex.test(html)) {
  console.error("Ошибка: маркеры inject:css / inject:main-js не найдены в index.html");
  process.exit(1);
}

html = html.replace(
  cssBlockRegex,
  `${CSS_MARK_START}\n  <style id="app-styles">\n${styles}\n  </style>\n  ${CSS_MARK_END}`
);
html = html.replace(
  jsBlockRegex,
  `${JS_MARK_START}\n  <script>\n${escapeForScript(jsContent)}\n  </script>\n  ${JS_MARK_END}`
);

fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
console.log(
  "OK: dist/index.html (" + Math.round(html.length / 1024) + " KB, CSS+JS inline)"
);

fs.writeFileSync(path.join(distDir, "styles.css"), styles, "utf8");
fs.mkdirSync(path.join(distDir, "js"), { recursive: true });
fs.writeFileSync(path.join(distDir, "js", "main.js"), jsContent, "utf8");
fs.mkdirSync(path.join(distDir, "css"), { recursive: true });
fs.copyFileSync(path.join(root, "css", "intro.css"), path.join(distDir, "css", "intro.css"));

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyDir(path.join(root, "img"), path.join(distDir, "img"));
console.log("OK: dist/img copied");

copyDir(path.join(root, "docs"), path.join(distDir, "docs"));
console.log("OK: dist/docs copied");

const redirects = [
  "/api/notify-order  /.netlify/functions/notify-order  200",
  "/api/orders  /.netlify/functions/orders  200",
  "/api/admin  /.netlify/functions/admin-api  200",
  "/api/auth  /.netlify/functions/auth  200",
].join("\n");
fs.writeFileSync(path.join(distDir, "_redirects"), redirects, "utf8");
console.log("OK: dist/_redirects");
