/**
 * Domains Component - Domain Management & Widget Integration Guide
 */

import { get, showToast } from "../api.js";

export function renderDomains() {
  const container = document.createElement("div");
  container.className = "domains-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Domain Yönetimi</h1>
      <p class="page-subtitle">Kayıtlı domain'leriniz ve widget entegrasyon durumu</p>
    </div>

    <!-- Domain Stats -->
    <div class="stats-grid">
      <article class="stat-card">
        <h3 class="stat-label">Toplam Domain</h3>
        <p class="stat-value" id="total-domains">0</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Aktif Widget</h3>
        <p class="stat-value" id="active-widgets">0</p>
      </article>

      <article class="stat-card">
        <h3 class="stat-label">Bugünkü Tarama</h3>
        <p class="stat-value" id="today-scans">0</p>
      </article>
    </div>

    <!-- Domain List -->
    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Domain Listesi</h2>
        <div class="table-actions">
          <button class="btn-secondary" id="refresh-domains">Yenile</button>
          <a href="#/tokens" class="btn btn-primary">+ Yeni Domain Ekle</a>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="table" aria-label="Domain listesi">
          <thead>
            <tr>
              <th scope="col">Domain</th>
              <th scope="col">Widget Durumu</th>
              <th scope="col">Auto-Fix</th>
              <th scope="col">Kayıt Tarihi</th>
              <th scope="col">Son Tarama</th>
              <th scope="col">Durum</th>
              <th scope="col">İşlemler</th>
            </tr>
          </thead>
          <tbody id="domains-table">
            <tr>
              <td colspan="7" class="empty-state">Yükleniyor...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Widget Integration Guide -->
    <div class="widget-guide section-spaced">
      <div class="table-wrapper">
        <div class="table-header">
          <h2 class="table-title">Widget Entegrasyon Kılavuzu</h2>
        </div>

        <div class="panel-content">
          <div class="integration-steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3 class="step-title">Token Oluştur</h3>
                <p class="step-description">Öncelikle domain'iniz için bir widget token oluşturun.</p>
                <a href="#/tokens" class="btn-secondary">Token Sayfasına Git →</a>
              </div>
            </div>

            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3 class="step-title">Widget Kodunu Ekle</h3>
                <p class="step-description">Aşağıdaki kodu sitenizin <code>&lt;head&gt;</code> bölümüne ekleyin:</p>
                <pre class="code-block"><code id="widget-code">&lt;script src="https://cdn.wcagtr.com/widget.js"&gt;&lt;/script&gt;
&lt;script&gt;
  WCAGTRWidget.init({
    token: 'WIDGET_TOKEN_BURAYA',
    lang: 'tr'
  });
&lt;/script&gt;</code></pre>
                <button class="btn-secondary" id="copy-widget-code">
                  📋 Kodu Kopyala
                </button>
              </div>
            </div>

            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3 class="step-title">Entegrasyonu Test Et</h3>
                <p class="step-description">Widget'ın çalıştığını doğrulamak için sitenizi ziyaret edin. Widget otomatik olarak sayfayı tarayacak ve erişilebilirlik sorunlarını tespit edecektir.</p>
              </div>
            </div>

            <div class="step">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3 class="step-title">Sonuçları İzle</h3>
                <p class="step-description">Tarama sonuçları otomatik olarak dashboard'unuzda görünecektir. Detaylı raporlar için <a href="#/scans">Taramalar</a> sayfasını ziyaret edin.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Domain Detail Modal -->
    <div id="domain-detail-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="domain-modal-title" hidden>
      <div class="modal-container size-md modal-anchor">
        <button class="modal-close modal-close-top" id="close-domain-modal">×</button>

        <h2 id="domain-modal-title" class="table-title mb-lg">Domain Detayları</h2>

        <div id="domain-detail-content">
          <!-- Dynamic content -->
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    loadDomains();
    setupDomainListeners();
  }, 0);

  return container;
}

async function loadDomains() {
  const tbody = document.getElementById("domains-table");
  if (!tbody) return;

  try {
    // Fetch domains and scans data
    const [tokensResult, scansResult] = await Promise.all([
      get("/tokens"),
      get("/scans", { limit: 100 }),
    ]);

    if (!tokensResult.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <p class="empty-title">Hata</p>
            <p class="empty-message">${tokensResult.error}</p>
          </td>
        </tr>
      `;
      return;
    }

    const domains = tokensResult.data.tokens || [];
    const scans = scansResult.success ? scansResult.data.scans || [] : [];

    // Update stats
    updateDomainStats(domains, scans);

    if (domains.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <p class="empty-title">Henüz domain yok</p>
            <p class="empty-message">Tokenlar sayfasından yeni bir token oluşturun</p>
            <a href="#/tokens" class="btn btn-primary">Token Oluştur</a>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = domains
      .map((domain) => {
        const domainScans = scans.filter(
          (s) => s.url && s.url.includes(domain.domain),
        );
        const lastScan = domainScans.length > 0 ? domainScans[0] : null;

        return `
        <tr>
          <td>
            <strong>${escapeHtml(domain.domain || "")}</strong>
            ${domainScans.length > 0 ? `<br><small class="muted-inline">${domainScans.length} tarama</small>` : ""}
          </td>
          <td>
            <span class="cell-badge ${domain.widget_token ? "badge-success" : "badge-neutral"}">
              ${domain.widget_token ? "✓ Aktif" : "Pasif"}
            </span>
          </td>
          <td>
            <span class="cell-badge ${domain.auto_fix_enabled ? "badge-success" : "badge-neutral"}">
              ${domain.auto_fix_enabled ? "Açık" : "Kapalı"}
            </span>
          </td>
          <td>${formatDate(domain.created_at)}</td>
          <td>${lastScan ? formatDate(lastScan.created_at) : '<span class="muted-inline">Henüz yok</span>'}</td>
          <td>
            <span class="cell-badge ${domain.is_active ? "badge-success" : "badge-neutral"}">
              ${domain.is_active ? "Aktif" : "Pasif"}
            </span>
          </td>
          <td>
            <button
              class="btn-secondary domain-detail-btn"
              data-domain="${encodeURIComponent(domain.domain || "")}"
              data-token="${encodeURIComponent(domain.widget_token || domain.token || "")}"
              type="button"
            >
              Detay
            </button>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (error) {
    console.error("[Domains] Load error:", error);
  }
}

function updateDomainStats(domains, scans) {
  const totalEl = document.getElementById("total-domains");
  const activeEl = document.getElementById("active-widgets");
  const todayEl = document.getElementById("today-scans");

  if (totalEl) {
    totalEl.textContent = domains.length;
  }

  if (activeEl) {
    const activeCount = domains.filter(
      (d) => d.is_active && d.widget_token,
    ).length;
    activeEl.textContent = activeCount;
  }

  if (todayEl) {
    const today = new Date().toDateString();
    const todayScans = scans.filter((s) => {
      if (!s.created_at) return false;
      const scanDate = new Date(s.created_at).toDateString();
      return scanDate === today;
    });
    todayEl.textContent = todayScans.length;
  }
}

function setupDomainListeners() {
  const refreshBtn = document.getElementById("refresh-domains");
  const copyCodeBtn = document.getElementById("copy-widget-code");
  const closeModalBtn = document.getElementById("close-domain-modal");
  const tbody = document.getElementById("domains-table");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadDomains();
      showToast("Veriler yenilendi", "success");
    });
  }

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener("click", () => {
      const codeEl = document.getElementById("widget-code");
      if (codeEl) {
        const code = codeEl.textContent;
        navigator.clipboard
          .writeText(code)
          .then(() => {
            showToast("Widget kodu kopyalandı!", "success");
          })
          .catch(() => {
            showToast("Kopyalama başarısız", "error");
          });
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("domain-detail-modal");
      if (modal) modal.hidden = true;
    });
  }

  if (tbody) {
    tbody.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const detailButton = target?.closest(".domain-detail-btn");
      if (!detailButton) return;

      const domain = decodeURIComponent(
        detailButton.getAttribute("data-domain") || "",
      );
      const token = decodeURIComponent(
        detailButton.getAttribute("data-token") || "",
      );
      showDomainDetailModal(domain, token);
    });
  }
}

function showDomainDetailModal(domain, token) {
  const modal = document.getElementById("domain-detail-modal");
  const content = document.getElementById("domain-detail-content");

  if (!modal || !content) return;

  const safeToken = token || "";
  const tokenLiteral = JSON.stringify(safeToken || "WIDGET_TOKEN_BURAYA");
  const integrationSnippet = `<script src="https://cdn.wcagtr.com/widget.js"></script>
<script>
  WCAGTRWidget.init({
    token: ${tokenLiteral},
    lang: 'tr',
    autoFix: true
  });
</script>`;

  content.innerHTML = `
    <div class="domain-summary">
      <h3>Domain</h3>
      <p class="domain-chip">${escapeHtml(domain)}</p>
    </div>

    <div class="domain-summary">
      <h3>Widget Token</h3>
      <div class="soft-box">
        ${escapeHtml(safeToken) || "Token henüz oluşturulmamış"}
      </div>
      ${
        safeToken
          ? `
        <button class="btn-secondary copy-token-btn mt-sm w-full" type="button">
          📋 Token'ı Kopyala
        </button>
      `
          : ""
      }
    </div>

    <div class="domain-summary">
      <h3>Entegrasyon Kodu</h3>
      <pre class="soft-pre"><code>${escapeHtml(integrationSnippet)}</code></pre>
      ${
        safeToken
          ? `
        <button class="btn-secondary copy-code-btn mt-sm w-full" type="button">
          📋 Kodu Kopyala
        </button>
      `
          : ""
      }
    </div>

    <div class="tip-box">
      <h3>💡 Entegrasyon İpucu</h3>
      <p>
        Widget kodunu sitenizin <code>&lt;head&gt;</code>
        bölümüne ekleyin. Widget otomatik olarak yüklenir ve erişilebilirlik taraması yapar.
      </p>
    </div>
  `;

  const copyTokenButton = content.querySelector(".copy-token-btn");
  if (copyTokenButton) {
    copyTokenButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(safeToken);
        showToast("Token kopyalandı", "success");
      } catch (error) {
        showToast("Token kopyalanamadı", "error");
      }
    });
  }

  const copyCodeButton = content.querySelector(".copy-code-btn");
  if (copyCodeButton) {
    copyCodeButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(integrationSnippet);
        showToast("Kod kopyalandı", "success");
      } catch (error) {
        showToast("Kod kopyalanamadı", "error");
      }
    });
  }

  modal.hidden = false;
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
