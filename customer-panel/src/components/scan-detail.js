/**
 * Scan Detail Component
 */

import { getScanDetail, showToast } from "../api.js";

export function renderScanDetail(scanId) {
  const container = document.createElement("div");
  container.className = "scan-detail-view";

  container.innerHTML = `
    <div class="page-header">
      <div class="inline-actions inline-space-between">
        <div>
          <h1 class="page-title">Tarama Detayı</h1>
          <p class="page-subtitle" id="scan-detail-subtitle">Tarama yükleniyor…</p>
        </div>
        <a href="#/scans" class="btn-secondary">Taramalara Dön</a>
      </div>
    </div>

    <div id="scan-detail-live" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>

    <div class="stats-grid" id="scan-detail-stats" aria-label="Tarama özet metrikleri">
      <article class="stat-card">
        <h3 class="stat-label">Toplam İhlal</h3>
        <p class="stat-value">—</p>
      </article>
      <article class="stat-card">
        <h3 class="stat-label">TR Skor</h3>
        <p class="stat-value">—</p>
      </article>
      <article class="stat-card">
        <h3 class="stat-label">WCAG Seviye</h3>
        <p class="stat-value">—</p>
      </article>
      <article class="stat-card">
        <h3 class="stat-label">Tarama Süresi</h3>
        <p class="stat-value">—</p>
      </article>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">İhlal Dağılımı</h2>
      </div>
      <div class="table-container">
        <table class="data-table" aria-label="İhlal dağılımı">
          <thead>
            <tr>
              <th scope="col">Seviye</th>
              <th scope="col">Adet</th>
            </tr>
          </thead>
          <tbody id="scan-detail-severity-table">
            <tr><td colspan="2" class="empty-state">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">İhlal Listesi</h2>
      </div>
      <div class="table-container">
        <table class="data-table" aria-label="Tarama ihlal listesi">
          <thead>
            <tr>
              <th scope="col">Kriter</th>
              <th scope="col">Seviye</th>
              <th scope="col">İhlal</th>
              <th scope="col">Hedef</th>
              <th scope="col">Fix Durumu</th>
            </tr>
          </thead>
          <tbody id="scan-detail-violations-table">
            <tr><td colspan="5" class="empty-state">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    loadScanDetail(scanId);
  }, 0);

  return container;
}

async function loadScanDetail(scanId) {
  const id = Number.parseInt(String(scanId || ""), 10);
  if (!Number.isInteger(id) || id <= 0) {
    updateSubtitle("Geçersiz tarama ID");
    renderErrorState("Tarama ID geçersiz.");
    return;
  }

  const result = await getScanDetail(id);
  if (!result.success) {
    updateSubtitle("Tarama detayı alınamadı");
    renderErrorState(result.error || "Tarama detayı alınamadı.");
    showToast(result.error || "Tarama detayı alınamadı", "error");
    announce("Tarama detayı alınamadı.");
    return;
  }

  const data = result.data || {};
  const scan = data.scan || {};
  const violations = Array.isArray(data.violations) ? data.violations : [];
  const breakdown = Array.isArray(data.severityBreakdown)
    ? data.severityBreakdown
    : [];

  updateSubtitle(
    `Tarama #${scan.id || id} • ${escapeHtml(scan.url || "URL bilgisi yok")} • ${formatDate(scan.created_at)}`,
  );
  renderStats(scan);
  renderSeverityBreakdown(breakdown);
  renderViolations(violations);
  announce("Tarama detayı yüklendi.");
}

function renderStats(scan) {
  const stats = document.getElementById("scan-detail-stats");
  if (!stats) return;

  const duration = Number(scan.scan_duration_ms || 0);
  const score =
    scan.tr_compliance_score === null || scan.tr_compliance_score === undefined
      ? "—"
      : `${Number(scan.tr_compliance_score).toFixed(1)}%`;

  stats.innerHTML = `
    <article class="stat-card">
      <h3 class="stat-label">Toplam İhlal</h3>
      <p class="stat-value">${Number(scan.total_violations || 0)}</p>
    </article>
    <article class="stat-card">
      <h3 class="stat-label">TR Skor</h3>
      <p class="stat-value">${score}</p>
    </article>
    <article class="stat-card">
      <h3 class="stat-label">WCAG Seviye</h3>
      <p class="stat-value">${escapeHtml(scan.wcag_level || "—")}</p>
    </article>
    <article class="stat-card">
      <h3 class="stat-label">Tarama Süresi</h3>
      <p class="stat-value">${duration > 0 ? `${duration} ms` : "—"}</p>
    </article>
  `;
}

function renderSeverityBreakdown(rows) {
  const tbody = document.getElementById("scan-detail-severity-table");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="empty-state">İhlal dağılımı bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${renderSeverityBadge(row.severity)}</td>
          <td>${Number(row.total || 0)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderViolations(rows) {
  const tbody = document.getElementById("scan-detail-violations-table");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Bu taramada ihlal bulunamadı.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((violation) => {
      const totalFixes = Number(violation.total_fixes || 0);
      const pendingFixes = Number(violation.pending_fixes || 0);
      const approvedFixes = Number(violation.approved_fixes || 0);

      let fixStatus = "Fix yok";
      if (totalFixes > 0) {
        fixStatus = `${approvedFixes} onaylı / ${pendingFixes} bekleyen`;
      }

      return `
        <tr>
          <td><code>${escapeHtml(violation.wcag_criterion || "—")}</code></td>
          <td>${renderSeverityBadge(violation.severity)}</td>
          <td>${escapeHtml(violation.violation_type || "—")}</td>
          <td class="cell-mono">${escapeHtml(violation.element_selector || "—")}</td>
          <td>${escapeHtml(fixStatus)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderErrorState(message) {
  const severityTable = document.getElementById("scan-detail-severity-table");
  const violationsTable = document.getElementById("scan-detail-violations-table");

  if (severityTable) {
    severityTable.innerHTML = `<tr><td colspan="2" class="empty-state">${escapeHtml(message)}</td></tr>`;
  }
  if (violationsTable) {
    violationsTable.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHtml(message)}</td></tr>`;
  }
}

function renderSeverityBadge(severity) {
  const normalized = String(severity || "").toLowerCase();
  const label = normalized || "unknown";
  let className = "badge-neutral";
  if (normalized === "critical") className = "badge-error";
  if (normalized === "major") className = "badge-warning";
  if (normalized === "minor") className = "badge-success";

  return `<span class="cell-badge ${className}">${escapeHtml(label)}</span>`;
}

function updateSubtitle(text) {
  const subtitle = document.getElementById("scan-detail-subtitle");
  if (!subtitle) return;
  subtitle.innerHTML = text;
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function announce(message) {
  const liveRegion = document.getElementById("scan-detail-live");
  if (!liveRegion) return;
  liveRegion.textContent = "";
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 20);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
