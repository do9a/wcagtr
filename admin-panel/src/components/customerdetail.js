/**
 * Customer Detail Component
 */

import { getCustomerDetail, handleAPIError } from "../api.js";

let currentCustomerId = null;

function getCustomerIdFromContext(routeContext = {}) {
  const fromContext = routeContext?.query?.get("id");
  const fallbackQuery = window.location.hash.split("?")[1] || "";
  const fromHash = new URLSearchParams(fallbackQuery).get("id");
  const raw = fromContext || fromHash || "";
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function render(routeContext = {}) {
  currentCustomerId = getCustomerIdFromContext(routeContext);

  if (!currentCustomerId) {
    return `
      <div class="customers-view">
        <header class="view-header">
          <h1>Müşteri Detayı</h1>
        </header>
        <div class="alert alert-error" role="alert">
          Geçersiz müşteri ID.
        </div>
        <a class="btn btn-secondary" href="#/customers">Müşteri listesine dön</a>
      </div>
    `;
  }

  const result = await getCustomerDetail(currentCustomerId);
  if (!result.success) {
    handleAPIError(result.error, "Müşteri detayları alınamadı");
    return `
      <div class="customers-view">
        <header class="view-header">
          <h1>Müşteri Detayı</h1>
        </header>
        <div class="alert alert-error" role="alert">
          ${escapeHtml(result.error || "Müşteri detayları alınamadı")}
        </div>
        <a class="btn btn-secondary" href="#/customers">Müşteri listesine dön</a>
      </div>
    `;
  }

  const data = result.data || {};
  const customer = data.customer || {};
  const summary = data.summary || {};
  const domains = Array.isArray(data.domains) ? data.domains : [];
  const scans = Array.isArray(data.recentScans) ? data.recentScans : [];
  const payments = Array.isArray(data.recentPayments) ? data.recentPayments : [];
  const breakdown = Array.isArray(data.violationBreakdown)
    ? data.violationBreakdown
    : [];

  return `
    <div class="customers-view">
      <header class="view-header" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap;">
        <div>
          <h1>Müşteri Detayı</h1>
          <p style="margin: 0; color: var(--color-text-muted);">
            #${customer.id} • ${escapeHtml(customer.company_name || customer.email || "-")}
          </p>
        </div>
        <div style="display: flex; gap: var(--space-2);">
          <a class="btn btn-secondary btn-sm" href="#/customers">Geri Dön</a>
          <button class="btn btn-secondary btn-sm" id="refresh-customer-detail" type="button">Yenile</button>
        </div>
      </header>

      <section class="dashboard-grid" aria-label="Müşteri özet kartları">
        ${renderStatCard("Toplam Domain", summary.totalDomains || 0)}
        ${renderStatCard("Aktif Domain", summary.activeDomains || 0)}
        ${renderStatCard("Toplam Tarama", summary.totalScans || 0)}
        ${renderStatCard("Toplam İhlal", summary.totalViolations || 0)}
      </section>

      <section class="table-container" style="margin-bottom: var(--space-6);">
        <table class="data-table">
          <tbody>
            <tr><th scope="row">E-posta</th><td>${escapeHtml(customer.email || "-")}</td></tr>
            <tr><th scope="row">Firma</th><td>${escapeHtml(customer.company_name || "-")}</td></tr>
            <tr><th scope="row">İletişim</th><td>${escapeHtml(customer.contact_name || "-")}</td></tr>
            <tr><th scope="row">Plan</th><td>${renderPlanBadge(customer.subscription_plan)}</td></tr>
            <tr><th scope="row">Abonelik Durumu</th><td>${escapeHtml(customer.subscription_status || "-")}</td></tr>
            <tr><th scope="row">Hesap Durumu</th><td>${customer.is_suspended ? '<span class="badge badge-warning">Askıda</span>' : '<span class="badge badge-success">Aktif</span>'}</td></tr>
            <tr><th scope="row">Kayıt Tarihi</th><td>${formatDate(customer.created_at)}</td></tr>
          </tbody>
        </table>
      </section>

      <section style="margin-bottom: var(--space-6);">
        <h2>Domainler</h2>
        <div class="table-container">
          <table class="data-table" aria-label="Müşteri domainleri">
            <thead>
              <tr>
                <th scope="col">Domain</th>
                <th scope="col">Durum</th>
                <th scope="col">Auto Fix</th>
                <th scope="col">Server Patch</th>
                <th scope="col">Kayıt</th>
              </tr>
            </thead>
            <tbody>
              ${domains.length === 0
                ? `<tr><td colspan="5" style="text-align:center;">Domain bulunamadı</td></tr>`
                : domains
                    .map(
                      (domain) => `
                        <tr>
                          <td>${escapeHtml(domain.domain || "-")}</td>
                          <td>${domain.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-neutral">Pasif</span>'}</td>
                          <td>${domain.auto_fix_enabled ? "Açık" : "Kapalı"}</td>
                          <td>${domain.server_patch_enabled ? "Açık" : "Kapalı"}</td>
                          <td>${formatDate(domain.created_at)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section style="margin-bottom: var(--space-6);">
        <h2>Son Taramalar</h2>
        <div class="table-container">
          <table class="data-table" aria-label="Müşteri son taramaları">
            <thead>
              <tr>
                <th scope="col">URL</th>
                <th scope="col">Domain</th>
                <th scope="col">İhlal</th>
                <th scope="col">TR Skor</th>
                <th scope="col">Tarih</th>
              </tr>
            </thead>
            <tbody>
              ${scans.length === 0
                ? `<tr><td colspan="5" style="text-align:center;">Tarama bulunamadı</td></tr>`
                : scans
                    .map(
                      (scan) => `
                        <tr>
                          <td>${escapeHtml(scan.url || "-")}</td>
                          <td>${escapeHtml(scan.domain || "-")}</td>
                          <td>${Number(scan.total_violations || 0)}</td>
                          <td>${scan.tr_compliance_score === null ? "—" : `${Number(scan.tr_compliance_score).toFixed(1)}%`}</td>
                          <td>${formatDate(scan.created_at)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section style="margin-bottom: var(--space-6);">
        <h2>İhlal Dağılımı</h2>
        <div class="table-container">
          <table class="data-table" aria-label="Müşteri ihlal dağılımı">
            <thead>
              <tr>
                <th scope="col">Seviye</th>
                <th scope="col">Adet</th>
              </tr>
            </thead>
            <tbody>
              ${breakdown.length === 0
                ? `<tr><td colspan="2" style="text-align:center;">İhlal verisi bulunamadı</td></tr>`
                : breakdown
                    .map(
                      (row) => `
                        <tr>
                          <td>${escapeHtml(row.severity || "-")}</td>
                          <td>${Number(row.total || 0)}</td>
                        </tr>
                      `,
                    )
                    .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Son Ödemeler</h2>
        <div class="table-container">
          <table class="data-table" aria-label="Müşteri son ödemeleri">
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Plan</th>
                <th scope="col">Provider</th>
                <th scope="col">Tutar</th>
                <th scope="col">Durum</th>
              </tr>
            </thead>
            <tbody>
              ${payments.length === 0
                ? `<tr><td colspan="5" style="text-align:center;">Ödeme kaydı yok</td></tr>`
                : payments
                    .map(
                      (payment) => `
                        <tr>
                          <td>${formatDate(payment.createdAt)}</td>
                          <td>${escapeHtml(payment.planCode || "-")}</td>
                          <td>${escapeHtml(payment.provider || "-")}</td>
                          <td>${formatMoney(payment.amountTry, payment.currency)}</td>
                          <td>${escapeHtml(payment.status || "-")}</td>
                        </tr>
                      `,
                    )
                    .join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

export function init() {
  const refreshBtn = document.getElementById("refresh-customer-detail");
  if (!refreshBtn || !currentCustomerId) return;

  refreshBtn.addEventListener("click", () => {
    window.location.hash = `/customer-detail?id=${currentCustomerId}&r=${Date.now()}`;
  });
}

function renderStatCard(title, value) {
  return `
    <article class="stat-card">
      <div class="stat-card-header">
        <h3 class="stat-card-title">${escapeHtml(title)}</h3>
      </div>
      <p class="stat-card-value">${escapeHtml(String(value ?? 0))}</p>
    </article>
  `;
}

function renderPlanBadge(planCode) {
  const code = String(planCode || "-").toLowerCase();
  return `<span class="badge badge-info">${escapeHtml(code)}</span>`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(amountTry, currency) {
  if (amountTry === null || amountTry === undefined) return "-";
  const amount = Number(amountTry);
  if (!Number.isFinite(amount)) return "-";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: String(currency || "TRY"),
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
