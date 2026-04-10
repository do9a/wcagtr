/**
 * Pricing Component
 * Admin billing plan management
 */

import {
  getBillingPlans,
  showSuccess,
  updateBillingPlan,
} from "../api.js";
import { createTable, initTableSorting } from "./table.js";

let plansState = [];
let selectedPlanCode = null;

export async function render() {
  const result = await getBillingPlans();
  plansState = result.success ? result.data.plans || [] : [];

  if (!result.success) {
    return `
      <div class="pricing-view">
        <header class="view-header">
          <h1>Fiyatlandırma Yönetimi</h1>
        </header>
        <div class="alert alert-error" role="alert">
          ${escapeHtml(result.error || "Planlar alınamadı")}
        </div>
      </div>
    `;
  }

  const headers = [
    { key: "code", label: "Kod", sortable: true },
    { key: "name", label: "Plan", sortable: true },
    { key: "price", label: "Aylık Fiyat", sortable: true },
    { key: "interval", label: "Periyot", sortable: true },
    { key: "status", label: "Durum", sortable: true },
    { key: "updated", label: "Son Güncelleme", sortable: true },
    { key: "actions", label: "İşlemler", sortable: false },
  ];

  const rows = plansState.map((plan) => ({
    code: `<span class="badge badge-neutral">${escapeHtml(plan.code)}</span>`,
    name: escapeHtml(plan.name || "-"),
    price: formatPrice(plan.priceMonthlyTry),
    interval: `${Number(plan.intervalDays || 30)} gün`,
    status: plan.isActive
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-warning">Pasif</span>',
    updated: formatDate(plan.updatedAt, true),
    actions: `
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        data-action="edit-plan"
        data-code="${escapeHtml(plan.code)}"
      >
        Düzenle
      </button>
    `,
  }));

  return `
    <div class="pricing-view">
      <header class="view-header">
        <h1>Fiyatlandırma Yönetimi</h1>
        <button id="refresh-pricing" class="btn btn-secondary btn-sm" type="button">
          <span aria-hidden="true">🔄</span> Yenile
        </button>
      </header>

      <p style="margin-bottom: var(--space-4); color: var(--color-text-muted);">
        Plan fiyatlarını, özelliklerini ve aktiflik durumunu bu ekrandan anında güncelleyebilirsiniz.
      </p>

      ${createTable(headers, rows, { id: "pricing-table" })}

      <div id="pricing-status-live" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>

      <div id="pricing-modal-backdrop" class="modal-backdrop" hidden>
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pricing-modal-title"
        >
          <div class="modal-header">
            <h2 id="pricing-modal-title" class="modal-title">Plan Düzenle</h2>
            <button
              id="pricing-modal-close"
              class="modal-close"
              type="button"
              aria-label="Düzenleme penceresini kapat"
            >
              ×
            </button>
          </div>
          <div class="modal-body">
            <form id="pricing-form" novalidate>
              <div class="form-group">
                <label for="plan-name" class="form-label">Plan Adı</label>
                <input id="plan-name" name="name" class="form-input" required />
              </div>

              <div class="form-group">
                <label for="plan-price" class="form-label">Aylık Fiyat (TRY)</label>
                <input
                  id="plan-price"
                  name="priceMonthlyTry"
                  type="number"
                  min="0"
                  step="1"
                  class="form-input"
                  aria-describedby="plan-price-help"
                />
                <small id="plan-price-help" style="display:block; margin-top: var(--space-2); color: var(--color-text-muted);">
                  Enterprise gibi teklif planları için alanı boş bırakabilirsiniz.
                </small>
              </div>

              <div class="form-group">
                <label for="plan-interval" class="form-label">Periyot (Gün)</label>
                <input
                  id="plan-interval"
                  name="intervalDays"
                  type="number"
                  min="1"
                  max="3650"
                  step="1"
                  class="form-input"
                  required
                />
              </div>

              <div class="form-group">
                <label for="plan-order" class="form-label">Sıralama</label>
                <input
                  id="plan-order"
                  name="displayOrder"
                  type="number"
                  min="0"
                  max="10000"
                  step="1"
                  class="form-input"
                />
              </div>

              <div class="form-group">
                <label for="plan-features" class="form-label">Özellikler (satır başına bir madde)</label>
                <textarea
                  id="plan-features"
                  name="features"
                  class="form-input"
                  rows="5"
                  style="resize: vertical;"
                ></textarea>
              </div>

              <div class="form-group">
                <label for="plan-active" class="form-label" style="display: inline-flex; gap: var(--space-2); align-items: center;">
                  <input id="plan-active" name="isActive" type="checkbox" />
                  Plan aktif
                </label>
              </div>

              <div id="pricing-form-error" class="alert alert-error" role="alert" hidden></div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="pricing-cancel-btn" class="btn btn-secondary" type="button">İptal</button>
            <button id="pricing-save-btn" class="btn btn-primary" type="button">Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function init() {
  initTableSorting("pricing-table");

  const refreshButton = document.getElementById("refresh-pricing");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      window.location.reload();
    });
  }

  const table = document.getElementById("pricing-table");
  if (table) {
    table.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='edit-plan']");
      if (!button) return;
      const planCode = String(button.dataset.code || "").trim();
      if (!planCode) return;
      openEditModal(planCode);
    });
  }

  const closeButton = document.getElementById("pricing-modal-close");
  const cancelButton = document.getElementById("pricing-cancel-btn");
  const saveButton = document.getElementById("pricing-save-btn");
  const backdrop = document.getElementById("pricing-modal-backdrop");

  if (closeButton) closeButton.addEventListener("click", closeEditModal);
  if (cancelButton) cancelButton.addEventListener("click", closeEditModal);
  if (backdrop) {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closeEditModal();
      }
    });
  }
  if (saveButton) {
    saveButton.addEventListener("click", async () => {
      await submitPlanUpdate();
    });
  }
}

function openEditModal(planCode) {
  const plan = plansState.find((item) => item.code === planCode);
  if (!plan) return;

  selectedPlanCode = planCode;

  const form = document.getElementById("pricing-form");
  const backdrop = document.getElementById("pricing-modal-backdrop");
  const errorBox = document.getElementById("pricing-form-error");
  if (!form || !backdrop || !errorBox) return;

  errorBox.hidden = true;
  errorBox.textContent = "";

  form.elements.name.value = plan.name || "";
  form.elements.priceMonthlyTry.value =
    plan.priceMonthlyTry === null || plan.priceMonthlyTry === undefined
      ? ""
      : String(plan.priceMonthlyTry);
  form.elements.intervalDays.value = String(plan.intervalDays || 30);
  form.elements.displayOrder.value = String(plan.displayOrder || 0);
  form.elements.features.value = Array.isArray(plan.features)
    ? plan.features.join("\n")
    : "";
  form.elements.isActive.checked = Boolean(plan.isActive);

  backdrop.hidden = false;

  setTimeout(() => {
    const firstField = document.getElementById("plan-name");
    if (firstField) firstField.focus();
  }, 20);
}

function closeEditModal() {
  const backdrop = document.getElementById("pricing-modal-backdrop");
  if (!backdrop) return;
  backdrop.hidden = true;
  selectedPlanCode = null;
}

async function submitPlanUpdate() {
  if (!selectedPlanCode) return;

  const form = document.getElementById("pricing-form");
  const errorBox = document.getElementById("pricing-form-error");
  const saveButton = document.getElementById("pricing-save-btn");
  if (!form || !errorBox || !saveButton) return;

  errorBox.hidden = true;
  errorBox.textContent = "";

  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const priceRaw = String(formData.get("priceMonthlyTry") || "").trim();
  const intervalRaw = String(formData.get("intervalDays") || "").trim();
  const orderRaw = String(formData.get("displayOrder") || "").trim();
  const featuresRaw = String(formData.get("features") || "");
  const isActive = formData.get("isActive") === "on";

  if (!name) {
    showFormError("Plan adı gerekli");
    return;
  }

  const intervalDays = Number.parseInt(intervalRaw, 10);
  if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 3650) {
    showFormError("Periyot (gün) 1 ile 3650 arasında olmalı");
    return;
  }

  const displayOrder = orderRaw ? Number.parseInt(orderRaw, 10) : 0;
  if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) {
    showFormError("Sıralama 0 ile 10000 arasında olmalı");
    return;
  }

  let priceMonthlyTry = null;
  if (priceRaw !== "") {
    const parsedPrice = Number.parseInt(priceRaw, 10);
    if (!Number.isInteger(parsedPrice) || parsedPrice < 0) {
      showFormError("Fiyat 0 veya pozitif tam sayı olmalı");
      return;
    }
    priceMonthlyTry = parsedPrice;
  }

  const features = featuresRaw
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  saveButton.disabled = true;
  saveButton.setAttribute("aria-busy", "true");

  const result = await updateBillingPlan(selectedPlanCode, {
    name,
    priceMonthlyTry,
    intervalDays,
    displayOrder,
    features,
    isActive,
  });

  saveButton.disabled = false;
  saveButton.removeAttribute("aria-busy");

  if (!result.success) {
    showFormError(result.error || "Plan güncellenemedi");
    return;
  }

  showSuccess("Plan başarıyla güncellendi.");
  announce("Plan başarıyla güncellendi.");
  closeEditModal();
  window.location.reload();
}

function showFormError(message) {
  const errorBox = document.getElementById("pricing-form-error");
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.hidden = false;
  announce(message);
}

function formatPrice(amount) {
  if (amount === null || amount === undefined) return "Teklif usulü";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "Ücretsiz";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}

function announce(message) {
  const liveRegion = document.getElementById("pricing-status-live");
  if (!liveRegion) return;
  liveRegion.textContent = "";
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}
