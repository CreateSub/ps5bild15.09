/**
 * Локальный тест отправки уведомления в Telegram.
 * Запуск: node scripts/test-telegram.js
 * (предварительно создайте .env по образцу .env.example)
 */
require("dotenv").config();
const { sendOrderNotification } = require("../netlify/functions/telegramBot");

const testOrder = {
  id: "ORD-TEST-001",
  customerName: "Тестовый Клиент",
  customerPhone: "79001234567",
  productLabel: "PS5 / PS5 PRO",
  startDate: "2026-08-22",
  endDate: "2026-08-25",
  days: 3,
  totalPrice: 2700,
  fulfillment: "delivery",
  deliveryAddress: "г. Казань, ул. Тестовая, 1",
  extras: ["Дополнительный геймпад"],
};

sendOrderNotification(testOrder)
  .then(() => {
    console.log("Тест успешен — проверьте группу в Telegram");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Тест не пройден:", err.message);
    process.exit(1);
  });
