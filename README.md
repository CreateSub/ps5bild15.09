#createtest1

## Telegram-уведомления о заказах

При оформлении заказа сайт вызывает Netlify Function, которая через `services/telegramBot.js` отправляет сообщение в группу админов.

### Архитектура

```
app.js (браузер)
  → POST /api/notify-order
    → netlify/functions/notify-order.js
      → services/telegramBot.js → Telegram API
```

Заказ сохраняется в `js/backend.js` (localStorage). Уведомление — отдельно, ошибка Telegram **не отменяет** заказ.

---

### 1. Переменные окружения

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен от [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_ADMIN_GROUP_CHAT_ID` | ID группы админов (отрицательное число) |

**Netlify:** Site configuration → Environment variables → добавить обе переменные → **Clear cache and deploy**.

**Локально:** скопируйте `.env.example` в `.env` и заполните.

> ⚠️ **Безопасность:** никогда не коммитьте `.env` и не публикуйте токен. Если токен засветился — отзовите его в BotFather (`/revoke`) и создайте новый.

---

### 2. Бот в группе

1. Добавьте бота в группу админов
2. Сделайте его **администратором** (право писать сообщения)
3. ID группы: `https://api.telegram.org/bot<ТОКЕН>/getUpdates` → `"chat":{"id":-100...}`

---

### 3. Деплой

```bash
npm install
git add .
git commit -m "Telegram bot notifications"
git push
```

Netlify при сборке установит `node-telegram-bot-api` из `package.json`.

---

### 4. Проверка

**На сайте:** войдите → выберите категорию → оформите заказ → сообщение должно появиться в группе.

**Локально (без Netlify):**

```bash
npm install
# создайте .env с TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_GROUP_CHAT_ID
node scripts/test-telegram.js
```

**Через Netlify Dev:**

```bash
npm install -g netlify-cli   # один раз
netlify dev
# сайт на http://localhost:8888, функции и .env подхватываются автоматически
```

Логи успеха/ошибок смотрите в Netlify → **Functions** → `notify-order`.
