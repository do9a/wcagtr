/**
 * Health Component
 */

import { getSystemHealth, getSystemMetrics } from "../api.js";

export async function render() {
  const [healthResult, metricsResult] = await Promise.all([
    getSystemHealth(),
    getSystemMetrics(),
  ]);

  const health = healthResult.success ? healthResult.data : null;
  const metrics = metricsResult.success ? metricsResult.data : null;

  const dbStatus = health?.database?.status || "unknown";
  const backendStatus = health?.status || "unknown";

  return `
    <div class="health-view">
      <header class="view-header">
        <h1>Sistem Sağlığı</h1>
        <button class="btn btn-secondary btn-sm" id="refresh-health">
          <span aria-hidden="true">🔄</span> Yenile
        </button>
      </header>

      <div class="dashboard-grid">
        <div class="stat-card">
          <div class="stat-card-header">
            <h3 class="stat-card-title">Backend</h3>
            <span class="stat-card-icon" aria-hidden="true">🖥️</span>
          </div>
          <div class="stat-card-value ${backendStatus === "healthy" ? "positive" : "negative"}">
            ${backendStatus === "healthy" ? "✓ Sağlıklı" : "✗ Sorunlu"}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <h3 class="stat-card-title">Veritabanı</h3>
            <span class="stat-card-icon" aria-hidden="true">💾</span>
          </div>
          <div class="stat-card-value ${dbStatus === "connected" ? "positive" : "negative"}">
            ${dbStatus === "connected" ? "✓ Bağlı" : "✗ Bağlı Değil"}
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <h3 class="stat-card-title">Yanıt Süresi</h3>
            <span class="stat-card-icon" aria-hidden="true">⚡</span>
          </div>
          <div class="stat-card-value">
            ${metrics?.avgResponseTime || "-"} ms
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <h3 class="stat-card-title">Çalışma Süresi</h3>
            <span class="stat-card-icon" aria-hidden="true">⏱️</span>
          </div>
          <div class="stat-card-value">
            ${formatUptime(metrics?.uptime)}
          </div>
        </div>
      </div>

      <section>
        <h2>Detaylı Metrikler</h2>
        <pre style="background: var(--color-bg-alt); padding: var(--space-4); border-radius: var(--border-radius); overflow-x: auto;">
${JSON.stringify({ health, metrics }, null, 2)}
        </pre>
      </section>
    </div>
  `;
}

function formatUptime(seconds) {
  if (!seconds) return "-";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${mins}d`;
  return `${mins}d`;
}

export function init() {
  const refreshBtn = document.getElementById("refresh-health");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }
}
