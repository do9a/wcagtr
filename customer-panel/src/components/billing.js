/**
 * Billing Component
 */

import {
  getBillingSummary,
  getBillingPlans,
  showToast,
  upgradeBillingPlan,
} from "../api.js";

let cachedPlans = [];
let currentPlan = "";

export function renderBilling() {
  const container = document.createElement("div");
  container.className = "billing-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Abonelik ve Faturalandırma</h1>
      <p class="page-subtitle">Planınız, kullanımınız ve abonelik süreniz</p>
    </div>

    <div id="billing-status-live" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>

    <div class="stats-grid">
      <article class="stat-card">
        <h3 class="stat-label">Mevcut Plan</h3>
        <p class="stat-value" id="billing-current-plan">—</p>
        <p class="stat-change neutral" id="billing-status-text">Durum yükleniyor</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Bitiş Tarihi</h3>
        <p class="stat-value" id="billing-expires-at">—</p>
        <p class="stat-change neutral">Abonelik yenileme</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Son 30 Gün Tarama</h3>
        <p class="stat-value" id="billing-scans-last-30">—</p>
        <p class="stat-change neutral">Kullanım metriği</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Aktif Domain</h3>
        <p class="stat-value" id="billing-active-domains">—</p>
        <p class="stat-change neutral" id="billing-total-domains">Toplam —</p>
      </article>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Plan Yönetimi</h2>
      </div>
      <div class="panel-content">
        <form id="billing-upgrade-form" class="form-group form-grid-inline">
          <div>
            <label for="billing-plan-select" class="form-label">Plan Seçin</label>
            <select id="billing-plan-select" class="form-input" aria-describedby="billing-plan-help">
              <option value="">Planlar yükleniyor...</option>
            </select>
            <p id="billing-plan-help" class="page-subtitle field-note">Plan değişikliği anında hesabınıza uygulanır.</p>
          </div>
          <button id="billing-upgrade-btn" class="btn btn-primary btn-min-220" type="submit">
            Planı Güncelle
          </button>
        </form>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Plan Karşılaştırması</h2>
      </div>
      <div class="table-container">
        <table class="data-table" role="table" aria-label="Abonelik planları">
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Aylık Ücret</th>
              <th scope="col">Özellikler</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody id="billing-plans-table">
            <tr>
              <td colspan="4" class="empty-state">Planlar yükleniyor...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    setupBillingListeners();
    loadBillingData();
  }, 0);

  return container;
}

function setupBillingListeners() {
  const form = document.getElementById("billing-upgrade-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitPlanChange();
  });
}

async function loadBillingData() {
  const [summaryResult, plansResult] = await Promise.all([
    getBillingSummary(),
    getBillingPlans(),
  ]);

  if (!summaryResult.success) {
    showToast(summaryResult.error || "Billing bilgileri alınamadı", "error");
    announce(summaryResult.error || "Billing bilgileri alınamadı");
    return;
  }

  if (!plansResult.success) {
    showToast(plansResult.error || "Plan listesi alınamadı", "error");
    announce(plansResult.error || "Plan listesi alınamadı");
    return;
  }

  cachedPlans = plansResult.data.plans || [];
  currentPlan = summaryResult.data.subscription?.plan || "";

  renderSummary(summaryResult.data);
  renderPlans(cachedPlans, currentPlan);
  populatePlanSelect(cachedPlans, currentPlan);
}

async function submitPlanChange() {
  const select = document.getElementById("billing-plan-select");
  const button = document.getElementById("billing-upgrade-btn");
  if (!select || !button) return;

  const selectedPlan = String(select.value || "");
  if (!selectedPlan) {
    showToast("Lütfen bir plan seçin", "error");
    return;
  }

  if (selectedPlan === currentPlan) {
    showToast("Bu plan zaten aktif", "info");
    return;
  }

  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  const result = await upgradeBillingPlan(selectedPlan);

  button.disabled = false;
  button.removeAttribute("aria-busy");

  if (!result.success) {
    showToast(result.error || "Plan güncellenemedi", "error");
    announce(result.error || "Plan güncellenemedi");
    return;
  }

  if (result.data?.paymentRequired) {
    const checkoutUrl = result.data?.payment?.checkoutUrl;
    showToast(result.data.message || "Ödeme bağlantısı oluşturuldu", "info");
    if (checkoutUrl) {
      announce("Ödeme bağlantısı oluşturuldu. Yeni sekmede açılıyor.");
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    } else {
      announce("Ödeme bağlantısı oluşturuldu.");
    }
    await loadBillingData();
    return;
  }

  if (result.data?.subscription?.plan) {
    updateStoredSubscriptionPlan(result.data.subscription.plan);
  }
  showToast(result.data?.message || "Plan güncellendi", "success");
  announce("Plan başarıyla güncellendi.");
  await loadBillingData();
}

function renderSummary(data) {
  const subscription = data.subscription || {};
  const usage = data.usage || {};

  setText("billing-current-plan", (subscription.planName || subscription.plan || "—").toUpperCase());
  setText("billing-status-text", getSubscriptionStatusLabel(subscription.status));
  setText("billing-expires-at", formatDate(subscription.expiresAt, true));
  setText("billing-scans-last-30", usage.scansLast30Days ?? 0);
  setText("billing-active-domains", usage.activeDomains ?? 0);
  setText("billing-total-domains", `Toplam ${usage.totalDomains ?? 0} domain`);
}

function renderPlans(plans, activePlan) {
  const tbody = document.getElementById("billing-plans-table");
  if (!tbody) return;

  if (!Array.isArray(plans) || plans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Plan bilgisi bulunamadı.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = plans
    .map((plan) => {
      const isActive = plan.code === activePlan;

      return `
        <tr>
          <td><strong>${escapeHtml(plan.name || plan.code)}</strong></td>
          <td class="cell-mono">${formatPrice(plan.priceMonthlyTry)}</td>
          <td>${escapeHtml((plan.features || []).join(" • ") || "—")}</td>
          <td>
            <span class="cell-badge ${isActive ? "badge-success" : "badge-neutral"}">
              ${isActive ? "Aktif" : "Uygun"}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populatePlanSelect(plans, activePlan) {
  const select = document.getElementById("billing-plan-select");
  if (!select) return;

  if (!Array.isArray(plans) || plans.length === 0) {
    select.innerHTML = `<option value="">Plan bulunamadı</option>`;
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = plans
    .map((plan) => {
      const selected = plan.code === activePlan ? " selected" : "";
      const disabled =
        plan.priceMonthlyTry === null && plan.code !== activePlan
          ? " disabled"
          : "";
      return `<option value="${escapeHtml(plan.code)}"${selected}${disabled}>${escapeHtml(plan.name)} (${formatPrice(plan.priceMonthlyTry)})</option>`;
    })
    .join("");
}

function updateStoredSubscriptionPlan(plan) {
  try {
    const raw = localStorage.getItem("customer_user");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.subscriptionPlan = plan;
    localStorage.setItem("customer_user", JSON.stringify(parsed));
  } catch (error) {
    console.warn("[Billing] customer_user cache güncellenemedi:", error);
  }
}

function getSubscriptionStatusLabel(status) {
  if (!status) return "Durum bilinmiyor";
  const normalized = String(status).toLowerCase();
  if (normalized === "active") return "Aktif abonelik";
  if (normalized === "trial") return "Deneme planı";
  if (normalized === "past_due") return "Ödeme bekleniyor";
  return status;
}

function formatPrice(value) {
  if (value === null || value === undefined) return "Teklif usulü";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  if (amount === 0) return "Ücretsiz";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(input, includeTime = false) {
  if (!input) return "—";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = String(value ?? "—");
}

function announce(message) {
  const live = document.getElementById("billing-status-live");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => {
    live.textContent = message;
  }, 20);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}
