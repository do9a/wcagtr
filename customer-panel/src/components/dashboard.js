/**
 * Dashboard Component
 */

import { get } from "../api.js";

export function renderDashboard() {
  const container = document.createElement("div");
  container.className = "dashboard-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-subtitle">Erişilebilirlik performansınızın genel görünümü</p>
    </div>

    <div class="stats-grid">
      <article class="stat-card">
        <h3 class="stat-label">Toplam Tarama</h3>
        <p class="stat-value" id="stat-total-scans">—</p>
        <p class="stat-change neutral">Son 30 gün</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Aktif Tokenlar</h3>
        <p class="stat-value" id="stat-active-tokens">—</p>
        <p class="stat-change positive">✓ Aktif</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Toplam İhlal</h3>
        <p class="stat-value" id="stat-total-violations">—</p>
        <p class="stat-change neutral">Tüm zamanlar</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Ortalama Skor</h3>
        <p class="stat-value" id="stat-avg-score">—</p>
        <p class="stat-change positive">WCAG AA</p>
      </article>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Son Taramalar</h2>
        <div class="table-actions">
          <a href="#/scans" class="btn-secondary">Tümünü Gör</a>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="table" aria-label="Son taramalar">
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">Tarih</th>
              <th scope="col">İhlal Sayısı</th>
              <th scope="col">TR Skor</th>
              <th scope="col">Durum</th>
            </tr>
          </thead>
          <tbody id="recent-scans-table">
            <tr>
              <td colspan="5" class="empty-state">
                <p>Veriler yükleniyor...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="table-wrapper dashboard-secondary-table">
      <div class="table-header">
        <h2 class="table-title">Erişilebilirlik Bildirimleri</h2>
        <div class="table-actions">
          <a href="#/scans" class="btn-secondary">Fixleri Yönet</a>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="table" aria-label="Erişilebilirlik bildirimleri">
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">İhlal</th>
              <th scope="col">Bekleyen Fix</th>
              <th scope="col">İşlem</th>
            </tr>
          </thead>
          <tbody id="notifications-table">
            <tr>
              <td colspan="4" class="empty-state">
                <p>Bildirimler yükleniyor...</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Load dashboard data
  loadDashboardData();

  return container;
}

async function loadDashboardData() {
  try {
    // Load stats
    const scansResult = await get("/scans", { limit: 5 });
    const tokensResult = await get("/tokens");

    if (scansResult.success) {
      updateStats(scansResult.data);
      updateRecentScans(scansResult.data.scans || []);
      updateAccessibilityNotifications(scansResult.data.scans || []);
    }

    if (tokensResult.success) {
      updateTokenStats(tokensResult.data);
    }
  } catch (error) {
    console.error("[Dashboard] Load error:", error);
  }
}

function updateStats(data) {
  const totalScans = document.getElementById("stat-total-scans");
  const totalViolations = document.getElementById("stat-total-violations");
  const avgScore = document.getElementById("stat-avg-score");

  if (totalScans) {
    totalScans.textContent = data.total || 0;
  }

  if (totalViolations) {
    const total = (data.scans || []).reduce(
      (sum, scan) => sum + (scan.total_violations || 0),
      0,
    );
    totalViolations.textContent = total;
  }

  if (avgScore) {
    const scores = (data.scans || [])
      .map((s) => s.tr_compliance_score || 0)
      .filter((s) => s > 0);
    const avg =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : "—";
    avgScore.textContent = avg !== "—" ? `${avg}%` : avg;
  }
}

function updateTokenStats(data) {
  const activeTokens = document.getElementById("stat-active-tokens");
  if (activeTokens) {
    const active = (data.tokens || []).filter((t) => t.is_active).length;
    activeTokens.textContent = active;
  }
}

function updateRecentScans(scans) {
  const tbody = document.getElementById("recent-scans-table");
  if (!tbody) return;

  if (scans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">
          <p>Henüz tarama bulunmuyor</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = scans
    .map(
      (scan) => `
    <tr>
      <td class="cell-mono">${escapeHtml(scan.url || "")}</td>
      <td>${formatDate(scan.created_at)}</td>
      <td>${scan.total_violations || 0}</td>
      <td><strong>${scan.tr_compliance_score ? scan.tr_compliance_score.toFixed(1) + "%" : "—"}</strong></td>
      <td>
        <span class="cell-badge ${getBadgeClass(scan.tr_compliance_score)}">
          ${getScoreLabel(scan.tr_compliance_score)}
        </span>
      </td>
    </tr>
  `,
    )
    .join("");
}

function updateAccessibilityNotifications(scans) {
  const tbody = document.getElementById("notifications-table");
  if (!tbody) return;

  const rows = scans.filter((scan) => Number(scan.total_violations || 0) > 0);

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <p>Aktif erişilebilirlik bildirimi bulunmuyor.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .slice(0, 5)
    .map((scan) => {
      const pendingFixCount = Number(scan.pending_fix_count || 0);
      return `
        <tr>
          <td class="cell-mono">${escapeHtml(scan.url || "")}</td>
          <td><strong>${Number(scan.total_violations || 0)}</strong></td>
          <td>
            ${
              pendingFixCount > 0
                ? `<span class="cell-badge badge-warning">${pendingFixCount} bekleyen</span>`
                : '<span class="cell-badge badge-success">Onay beklemiyor</span>'
            }
          </td>
          <td>
            <a class="btn-secondary" href="#/scans/${scan.id}">
              İncele
            </a>
          </td>
        </tr>
      `;
    })
    .join("");
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getBadgeClass(score) {
  if (!score) return "badge-neutral";
  if (score >= 90) return "badge-success";
  if (score >= 70) return "badge-warning";
  return "badge-error";
}

function getScoreLabel(score) {
  if (!score) return "Bekliyor";
  if (score >= 90) return "Mükemmel";
  if (score >= 70) return "İyi";
  return "Gelişmeli";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
