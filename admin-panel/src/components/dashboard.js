/**
 * Dashboard Component
 * Shows key metrics and recent activity
 */

import { getDashboardStats, getSystemHealth } from "../api.js";

let statsData = null;
let healthData = null;

export async function render() {
  // Fetch data
  const [statsResult, healthResult] = await Promise.all([
    getDashboardStats(),
    getSystemHealth(),
  ]);

  if (statsResult.success) {
    statsData = statsResult.data;
  }

  if (healthResult.success) {
    healthData = healthResult.data;
  }

  return `
    <div class="dashboard-view">
      <header class="view-header">
        <h1>Genel Bakış</h1>
        <button class="btn btn-secondary btn-sm" id="refresh-dashboard" type="button">
          <span aria-hidden="true">🔄</span> Yenile
        </button>
      </header>

      <!-- Stats Cards -->
      <div class="dashboard-grid">
        ${renderStatCard("Toplam Müşteri", statsData?.totalCustomers || 0, "👥", "customers")}
        ${renderStatCard("Toplam Tarama", statsData?.totalScans || 0, "🔍", "scans")}
        ${renderStatCard("Aktif Token", statsData?.activeTokens || 0, "🔑", "tokens")}
        ${renderStatCard("Sistem Durumu", healthData?.status === "healthy" ? "Sağlıklı" : "Sorunlu", "💚", "health", healthData?.status === "healthy")}
      </div>

      <!-- Recent Activity -->
      <section class="recent-activity">
        <h2>Son Aktivite</h2>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>İşlem</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              ${renderRecentActivity()}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderStatCard(title, value, icon, link, isPositive = true) {
  const changeClass = isPositive ? "positive" : "negative";

  return `
    <a href="#/${link}" class="stat-card">
      <div class="stat-card-header">
        <h3 class="stat-card-title">${title}</h3>
        <span class="stat-card-icon" aria-hidden="true">${icon}</span>
      </div>
      <div class="stat-card-value">${value}</div>
    </a>
  `;
}

function renderRecentActivity() {
  if (!statsData || !statsData.recentActivity) {
    return `
      <tr>
        <td colspan="3" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
          Henüz aktivite yok
        </td>
      </tr>
    `;
  }

  return statsData.recentActivity
    .map(
      (activity) => `
    <tr>
      <td>${activity.customerName}</td>
      <td>${activity.action}</td>
      <td>${formatDate(activity.date)}</td>
    </tr>
  `,
    )
    .join("");
}

function formatDate(date) {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function init() {
  const refreshBtn = document.getElementById("refresh-dashboard");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      refreshBtn.querySelector("span").textContent = "⏳";

      // Re-render
      await render();
      window.location.reload(); // Simple refresh for now
    });
  }
}
