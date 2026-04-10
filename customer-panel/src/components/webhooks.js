/**
 * Webhooks Component
 */

import {
  createWebhook,
  deleteWebhook,
  getWebhookDeliveries,
  getWebhooks,
  showToast,
  testWebhook,
  updateWebhook,
} from "../api.js";

const EVENT_LABELS = {
  "scan.completed": "Tarama tamamlandı",
  "fix.approved": "Fix onaylandı",
  "billing.plan_changed": "Plan değişti",
};

export function renderWebhooks() {
  const container = document.createElement("div");
  container.className = "webhooks-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Webhook Bildirimleri</h1>
      <p class="page-subtitle">Tarama, fix ve abonelik olaylarını kendi sisteminize iletin</p>
    </div>

    <div id="webhook-status-live" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Yeni Webhook</h2>
      </div>
      <div class="panel-content">
        <form id="webhook-create-form" novalidate>
          <div class="form-group">
            <label for="webhook-url" class="form-label">Webhook URL</label>
            <input
              id="webhook-url"
              name="url"
              type="url"
              class="form-input"
              placeholder="https://example.com/api/wcagtr-webhook"
              required
              aria-describedby="webhook-url-help"
            />
            <p id="webhook-url-help" class="page-subtitle field-note">
              Güvenlik için HTTPS kullanın. Local geliştirme için localhost URL kabul edilir.
            </p>
          </div>

          <fieldset class="form-group field-group">
            <legend>Bildirim Olayları</legend>
            <div class="field-group-list">
              <label><input type="checkbox" name="events" value="scan.completed" checked /> Tarama tamamlandığında</label>
              <label><input type="checkbox" name="events" value="fix.approved" checked /> Fix onaylandığında</label>
              <label><input type="checkbox" name="events" value="billing.plan_changed" checked /> Plan değiştiğinde</label>
            </div>
          </fieldset>

          <div class="form-group">
            <label for="webhook-secret" class="form-label">İmzalama Secret (Opsiyonel)</label>
            <input
              id="webhook-secret"
              name="secret"
              type="text"
              class="form-input"
              placeholder="Boş bırakırsanız otomatik üretilir"
              aria-describedby="webhook-secret-help"
            />
            <p id="webhook-secret-help" class="page-subtitle field-note">
              Secret en az 16 karakter olmalıdır ve her webhook isteği HMAC-SHA256 ile imzalanır.
            </p>
          </div>

          <button id="webhook-create-btn" class="btn btn-primary btn-min-200" type="submit">
            Webhook Ekle
          </button>
        </form>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Kayıtlı Webhooklar</h2>
      </div>
      <div class="table-container">
        <table class="data-table" role="table" aria-label="Webhook listesi">
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">Olaylar</th>
              <th scope="col">Durum</th>
              <th scope="col">Son Teslimat</th>
              <th scope="col">İşlemler</th>
            </tr>
          </thead>
          <tbody id="webhooks-table">
            <tr>
              <td colspan="5" class="empty-state">Webhooklar yükleniyor...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="table-wrapper section-spaced">
      <div class="table-header">
        <h2 class="table-title">Son Teslimatlar</h2>
      </div>
      <div class="table-container">
        <table class="data-table" role="table" aria-label="Webhook teslimat geçmişi">
          <thead>
            <tr>
              <th scope="col">Tarih</th>
              <th scope="col">Olay</th>
              <th scope="col">Sonuç</th>
              <th scope="col">HTTP</th>
              <th scope="col">Hata</th>
            </tr>
          </thead>
          <tbody id="webhook-deliveries-table">
            <tr>
              <td colspan="5" class="empty-state">Bir webhook seçip teslimat geçmişini görüntüleyin.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    setupWebhookListeners();
    loadWebhooks();
  }, 0);

  return container;
}

function setupWebhookListeners() {
  const form = document.getElementById("webhook-create-form");
  const tbody = document.getElementById("webhooks-table");
  if (!form || !tbody) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleCreateWebhook(form);
  });

  tbody.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const webhookId = Number.parseInt(button.dataset.webhookId || "", 10);
    if (!Number.isInteger(webhookId) || webhookId <= 0) return;

    const action = button.dataset.action;
    if (action === "test") {
      await handleTestWebhook(webhookId);
      return;
    }

    if (action === "toggle") {
      const nextState = button.dataset.nextState === "true";
      await handleToggleWebhook(webhookId, nextState);
      return;
    }

    if (action === "delete") {
      await handleDeleteWebhook(webhookId);
      return;
    }

    if (action === "deliveries") {
      await loadWebhookDeliveries(webhookId);
    }
  });
}

async function loadWebhooks() {
  const tbody = document.getElementById("webhooks-table");
  if (!tbody) return;

  const result = await getWebhooks();
  if (!result.success) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p class="empty-title">Webhooklar alınamadı</p>
          <p class="empty-message">${escapeHtml(result.error || "Bilinmeyen hata")}</p>
        </td>
      </tr>
    `;
    announce(result.error || "Webhooklar alınamadı");
    return;
  }

  const webhooks = result.data.webhooks || [];
  if (webhooks.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p class="empty-title">Webhook bulunamadı</p>
          <p class="empty-message">Yukarıdaki formdan ilk webhook adresinizi ekleyin.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = webhooks
    .map((webhook) => {
      const isActive = Boolean(webhook.isActive);
      const toggleLabel = isActive ? "Durdur" : "Aktifleştir";

      return `
        <tr>
          <td class="cell-mono cell-mono-wrap">${escapeHtml(webhook.url)}</td>
          <td>${formatEvents(webhook.events)}</td>
          <td>
            <span class="cell-badge ${isActive ? "badge-success" : "badge-neutral"}">
              ${isActive ? "Aktif" : "Pasif"}
            </span>
          </td>
          <td>${formatLastDelivery(webhook.lastDelivery)}</td>
          <td>
            <div class="inline-actions">
              <button class="btn-secondary" data-action="test" data-webhook-id="${webhook.id}">Test</button>
              <button class="btn-secondary" data-action="toggle" data-webhook-id="${webhook.id}" data-next-state="${String(!isActive)}">${toggleLabel}</button>
              <button class="btn-secondary" data-action="deliveries" data-webhook-id="${webhook.id}">Teslimatlar</button>
              <button class="btn-secondary btn-danger" data-action="delete" data-webhook-id="${webhook.id}">Sil</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function handleCreateWebhook(form) {
  const submitButton = document.getElementById("webhook-create-btn");
  if (!submitButton) return;

  const formData = new FormData(form);
  const url = String(formData.get("url") || "").trim();
  const secret = String(formData.get("secret") || "").trim();
  const events = getSelectedEvents(form);

  if (!url) {
    showToast("Webhook URL gerekli", "error");
    announce("Webhook URL gerekli.");
    return;
  }

  if (events.length === 0) {
    showToast("En az bir olay seçin", "error");
    announce("En az bir olay seçin.");
    return;
  }

  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  const result = await createWebhook({
    url,
    events,
    secret: secret || undefined,
  });

  submitButton.disabled = false;
  submitButton.removeAttribute("aria-busy");

  if (!result.success) {
    showToast(result.error || "Webhook oluşturulamadı", "error");
    announce(result.error || "Webhook oluşturulamadı.");
    return;
  }

  form.reset();
  restoreDefaultEventSelection(form);
  const secretMessage = result.data?.webhook?.secret
    ? " Webhook secret sadece bu adımda gösterilir; güvenli şekilde saklayın."
    : "";
  showToast("Webhook oluşturuldu.", "success");
  announce(`Webhook oluşturuldu.${secretMessage}`);
  await loadWebhooks();
}

async function handleTestWebhook(webhookId) {
  const result = await testWebhook(webhookId);
  if (!result.success) {
    showToast(result.error || "Test webhook başarısız", "error");
    announce(result.error || "Test webhook başarısız.");
    return;
  }

  showToast("Test webhook gönderildi", "success");
  announce("Test webhook gönderildi.");
  await loadWebhooks();
  await loadWebhookDeliveries(webhookId);
}

async function handleToggleWebhook(webhookId, nextState) {
  const result = await updateWebhook(webhookId, { isActive: nextState });
  if (!result.success) {
    showToast(result.error || "Webhook güncellenemedi", "error");
    announce(result.error || "Webhook güncellenemedi.");
    return;
  }

  showToast(nextState ? "Webhook aktifleştirildi" : "Webhook durduruldu", "success");
  announce(nextState ? "Webhook aktifleştirildi." : "Webhook durduruldu.");
  await loadWebhooks();
}

async function handleDeleteWebhook(webhookId) {
  const confirmed = confirm("Bu webhook kaydını silmek istediğinizden emin misiniz?");
  if (!confirmed) return;

  const result = await deleteWebhook(webhookId);
  if (!result.success) {
    showToast(result.error || "Webhook silinemedi", "error");
    announce(result.error || "Webhook silinemedi.");
    return;
  }

  showToast("Webhook silindi", "success");
  announce("Webhook silindi.");
  await loadWebhooks();
  clearDeliveriesTable();
}

async function loadWebhookDeliveries(webhookId) {
  const tbody = document.getElementById("webhook-deliveries-table");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-state">Teslimat geçmişi yükleniyor...</td>
    </tr>
  `;

  const result = await getWebhookDeliveries(webhookId, { limit: 20 });
  if (!result.success) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">${escapeHtml(result.error || "Teslimatlar alınamadı")}</td>
      </tr>
    `;
    announce(result.error || "Teslimatlar alınamadı.");
    return;
  }

  const deliveries = result.data.deliveries || [];
  if (deliveries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Bu webhook için teslimat kaydı yok.</td>
      </tr>
    `;
    announce("Teslimat kaydı bulunamadı.");
    return;
  }

  tbody.innerHTML = deliveries
    .map((delivery) => `
      <tr>
        <td>${formatDate(delivery.attemptedAt, true)}</td>
        <td>${escapeHtml(EVENT_LABELS[delivery.eventType] || delivery.eventType)}</td>
        <td>
          <span class="cell-badge ${delivery.success ? "badge-success" : "badge-error"}">
            ${delivery.success ? "Başarılı" : "Hata"}
          </span>
        </td>
        <td>${delivery.responseStatus || "—"}</td>
        <td>${escapeHtml(delivery.errorMessage || "—")}</td>
      </tr>
    `)
    .join("");

  announce("Teslimat geçmişi güncellendi.");
}

function clearDeliveriesTable() {
  const tbody = document.getElementById("webhook-deliveries-table");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="empty-state">Bir webhook seçip teslimat geçmişini görüntüleyin.</td>
    </tr>
  `;
}

function getSelectedEvents(form) {
  const checkboxes = Array.from(
    form.querySelectorAll('input[name="events"]:checked'),
  );
  return checkboxes.map((input) => input.value);
}

function restoreDefaultEventSelection(form) {
  const checkboxes = Array.from(form.querySelectorAll('input[name="events"]'));
  checkboxes.forEach((input) => {
    input.checked = true;
  });
}

function formatEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return "—";
  return events
    .map((eventType) => EVENT_LABELS[eventType] || eventType)
    .map((label) => escapeHtml(label))
    .join(" • ");
}

function formatLastDelivery(lastDelivery) {
  if (!lastDelivery) {
    return '<span class="muted-inline">Henüz gönderim yok</span>';
  }

  const statusLabel = lastDelivery.success ? "Başarılı" : "Hata";
  const cssClass = lastDelivery.success ? "badge-success" : "badge-error";
  const dateText = formatDate(lastDelivery.attemptedAt, true);
  const http = lastDelivery.status ? `HTTP ${lastDelivery.status}` : "HTTP yok";

  return `
    <span class="cell-badge ${cssClass}">${statusLabel}</span>
    <br>
    <small class="muted-inline">${escapeHtml(dateText)} • ${escapeHtml(http)}</small>
  `;
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

function announce(message) {
  const live = document.getElementById("webhook-status-live");
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
