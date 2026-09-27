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

      desc: "Геймпад, телевизор, клавиатура и мышь. 1 геймпад — 300 ₽/сут, два — 600 ₽/сут. От 2 суток: 200 ₽/сут за один и 400 ₽/сут за два.",

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
    adminTab: "orders",

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

    const days = PricingService.durationDays(state.startDate, state.endDate);

    if (qty === 1) {
      const price = PricingService.calculateGamepadPrice(days, 1);
      list.push(`Дополнительный геймпад ×1 (${price ? price.toLocaleString("ru-RU") + " ₽" : "300 ₽/сут"})`);
    }

    if (qty === 2) {
      const price = PricingService.calculateGamepadPrice(days, 2);
      list.push(`Дополнительные геймпады ×2 (${price ? price.toLocaleString("ru-RU") + " ₽" : "600 ₽/сут"})`);
    }

    if (state.extras.tv) {
      const price = PricingService.calculateTvPrice(days);
      list.push(`Телевизор${price ? " (" + price.toLocaleString("ru-RU") + " ₽)" : ""}`);
    }

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
    const gamepadPrice = PricingService.calculateGamepadPrice(days, state.extras.gamepadQty);
    const tvPrice = state.extras.tv ? PricingService.calculateTvPrice(days) : 0;
    const extrasPrice = gamepadPrice + tvPrice;
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

    els.adminOrdersPanel.hidden = tab !== "orders" && tab !== "archive";

    els.adminClientsPanel.hidden = tab !== "clients";

    if (els.adminInventoryPanel) els.adminInventoryPanel.hidden = tab !== "inventory";
    if (els.adminPromosPanel) els.adminPromosPanel.hidden = tab !== "promos";

    state.adminTab = tab;

    if (tab === "orders" || tab === "archive") {

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
          <button type="button" class="btn btn-primary" data-assign-confirm="${escapeHtml(o.id)}">Подтвердить</button>
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
            <button type="submit" class="btn btn-primary">Сохранить комментарий</button>
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

    const inArchive = (order) => {
      const status = normalizeOrderStatus(order.status);
      return status === "completed" || status === "rejected";
    };
    list = list.filter((order) => (state.adminTab === "archive" ? inArchive(order) : !inArchive(order)));

    if (list.length === 0) {
      els.ordersList.innerHTML = `<p class="empty-cell">${
        state.adminTab === "archive" ? "В архиве пока пусто" : "Активных заказов нет"
      }</p>`;
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



  function initGtaWanted() {
    const root = document.getElementById("gta-wanted");
    if (!root) return;
    const starsEl = root.querySelector(".gta-wanted-stars");
    const captionEl = root.querySelector(".gta-wanted-caption");
    const release = Date.UTC(2026, 10, 18, 11, 0, 0);
    const day = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((release - Date.now()) / day);
    const level = daysLeft <= 1 ? 5 : daysLeft <= 7 ? 4 : daysLeft <= 14 ? 3 : daysLeft <= 30 ? 2 : 1;
    const lines = {
      1: "GTA 6 ещё не скоро",
      2: "Месяц до выхода GTA 6",
      3: "Две недели до GTA 6",
      4: "Неделя до GTA 6",
      5: "GTA 6 уже на пороге",
    };
    const cta = "Успей забронировать свою пс5 на выход гта 6";
    const star =
      '<svg class="gta-star" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2 14.7 8.6 21.6 9.2 16.4 13.6 18 20.3 12 16.7 6 20.3 7.6 13.6 2.4 9.2 9.3 8.6z"/></svg>';
    starsEl.innerHTML = Array.from({ length: 5 }, (_, i) =>
      star.replace("gta-star", i < level ? "gta-star is-on" : "gta-star")
    ).join("");
    let showCta = false;
    const paint = () => {
      captionEl.textContent = showCta ? cta : lines[level];
    };
    paint();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (fine.matches) {
      root.addEventListener("mouseenter", () => {
        showCta = true;
        paint();
      });
      root.addEventListener("mouseleave", () => {
        showCta = false;
        paint();
      });
      return;
    }
    window.setInterval(() => {
      showCta = !showCta;
      paint();
    }, 12000);
  }

  initGtaWanted();

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

