/**
 * Scans Component
 */

import { get, patch, showToast } from "../api.js";

let currentPage = 1;
const ITEMS_PER_PAGE = 20;
let activeScanId = null;
let modalReturnFocus = null;

export function renderScans() {
  const container = document.createElement("div");
  container.className = "scans-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Taramalar</h1>
      <p class="page-subtitle">WCAG erişilebilirlik tarama geçmişi ve AI fix onay akışı</p>
    </div>

    <div id="fix-approval-status" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Tüm Taramalar</h2>
        <div class="table-actions">
          <button class="btn-secondary" id="refresh-scans">Yenile</button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="table" aria-label="Tarama listesi">
          <thead>
            <tr>
              <th scope="col">URL</th>
              <th scope="col">Tarih</th>
              <th scope="col">İhlal</th>
              <th scope="col">WCAG Seviye</th>
              <th scope="col">TR Skor</th>
              <th scope="col">Durum</th>
              <th scope="col">Fix Onayı</th>
              <th scope="col">Detay</th>
            </tr>
          </thead>
          <tbody id="scans-table">
            <tr>
              <td colspan="8" class="empty-state">Yükleniyor...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination" id="scans-pagination">
        <div class="pagination-info">
          <span id="pagination-info-text">Sayfa 1 / 1</span>
        </div>
        <div class="pagination-buttons">
          <button class="pagination-btn" id="prev-page" disabled aria-label="Önceki sayfa">‹</button>
          <button class="pagination-btn" id="next-page" disabled aria-label="Sonraki sayfa">›</button>
        </div>
      </div>
    </div>

    <div id="fixes-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="fixes-modal-title" hidden>
      <div class="modal-container size-lg modal-anchor">
        <button id="close-fixes-modal" class="modal-close modal-close-top" aria-label="Fix onay penceresini kapat">×</button>
        <h2 id="fixes-modal-title" class="table-title mb-sm">Bekleyen AI Fix Önerileri</h2>
        <p id="fixes-modal-subtitle" class="page-subtitle mb-lg"></p>
        <div id="fixes-modal-content" aria-live="polite">
          <p class="empty-message">Yükleniyor...</p>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    loadScans();
    setupScansListeners();
  }, 0);

  return container;
}

async function loadScans(page = 1) {
  const tbody = document.getElementById("scans-table");
  if (!tbody) return;

  try {
    const result = await get("/scans", { page, limit: ITEMS_PER_PAGE });

    if (!result.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <p class="empty-title">Hata</p>
            <p class="empty-message">${escapeHtml(result.error)}</p>
          </td>
        </tr>
      `;
      return;
    }

    const scans = result.data.scans || [];

    if (scans.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-state">
            <p class="empty-title">Henüz tarama yok</p>
            <p class="empty-message">Widget kurulumu tamamlandığında taramalar burada görünecek</p>
          </td>
        </tr>
      `;
      updatePagination(page, 0);
      return;
    }

    tbody.innerHTML = scans
      .map((scan) => {
        const pendingFixCount = Number(scan.pending_fix_count || 0);

        return `
        <tr>
          <td class="cell-mono">${escapeHtml(scan.url || "")}</td>
          <td>${formatDate(scan.created_at)}</td>
          <td><strong>${scan.total_violations || 0}</strong></td>
          <td><code>${escapeHtml(scan.wcag_level || "AA")}</code></td>
          <td class="cell-mono">${scan.tr_compliance_score ? Number(scan.tr_compliance_score).toFixed(1) + "%" : "—"}</td>
          <td>
            <span class="cell-badge ${getBadgeClass(scan.tr_compliance_score)}">
              ${getScoreLabel(scan.tr_compliance_score)}
            </span>
          </td>
          <td>
            ${
              pendingFixCount > 0
                ? `<button class="btn-secondary" data-open-fixes="true" data-scan-id="${scan.id}" data-scan-url="${escapeHtml(scan.url || "")}" aria-label="${pendingFixCount} bekleyen fixi yönet">
                    ${pendingFixCount} bekleyen
                   </button>`
                : '<span class="cell-badge badge-success">Onay beklemiyor</span>'
            }
          </td>
          <td>
            <a class="btn-secondary" href="#/scans/${scan.id}" aria-label="Tarama detayını aç">
              Detay
            </a>
          </td>
        </tr>
      `;
      })
      .join("");

    updatePagination(page, result.data.total);
  } catch (error) {
    console.error("[Scans] Load error:", error);
  }
}

function updatePagination(page, total) {
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const infoText = document.getElementById("pagination-info-text");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");

  if (infoText) {
    infoText.textContent = `Sayfa ${page} / ${totalPages}`;
  }

  if (prevBtn) {
    prevBtn.disabled = page <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = page >= totalPages;
  }

  currentPage = page;
}

function setupScansListeners() {
  const refreshBtn = document.getElementById("refresh-scans");
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  const scansTable = document.getElementById("scans-table");
  const modal = document.getElementById("fixes-modal");
  const closeModalBtn = document.getElementById("close-fixes-modal");
  const modalContent = document.getElementById("fixes-modal-content");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => loadScans(currentPage));
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => loadScans(currentPage - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => loadScans(currentPage + 1));
  }

  if (scansTable) {
    scansTable.addEventListener("click", (event) => {
      const button = event.target.closest('[data-open-fixes="true"]');
      if (!button) return;

      const scanId = Number.parseInt(
        button.getAttribute("data-scan-id") || "",
        10,
      );
      const scanUrl = button.getAttribute("data-scan-url") || "";
      if (Number.isNaN(scanId)) return;

      openFixModal(scanId, scanUrl, button);
    });
  }

  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeFixModal();
      }
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeFixModal();
      }
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeFixModal);
  }

  if (modalContent) {
    modalContent.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-fix-action]");
      if (!button) return;

      const fixId = Number.parseInt(
        button.getAttribute("data-fix-id") || "",
        10,
      );
      const action = button.getAttribute("data-fix-action");
      if (Number.isNaN(fixId) || !action) return;

      await updateFixApproval(fixId, action, button);
    });
  }
}

async function openFixModal(scanId, scanUrl, triggerButton) {
  const modal = document.getElementById("fixes-modal");
  const subtitle = document.getElementById("fixes-modal-subtitle");
  const closeButton = document.getElementById("close-fixes-modal");

  if (!modal) return;

  activeScanId = scanId;
  modalReturnFocus = triggerButton;
  modal.hidden = false;

  if (subtitle) {
    subtitle.textContent = `Tarama #${scanId} • ${scanUrl || "URL bilgisi yok"}`;
  }

  await loadScanFixes();
  if (closeButton) closeButton.focus();
}

function closeFixModal() {
  const modal = document.getElementById("fixes-modal");
  const subtitle = document.getElementById("fixes-modal-subtitle");
  const content = document.getElementById("fixes-modal-content");

  if (modal) {
    modal.hidden = true;
  }

  if (subtitle) {
    subtitle.textContent = "";
  }

  if (content) {
    content.innerHTML = '<p class="empty-message">Yükleniyor...</p>';
  }

  activeScanId = null;

  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
    modalReturnFocus.focus();
  }
  modalReturnFocus = null;
}

async function loadScanFixes() {
  const content = document.getElementById("fixes-modal-content");
  if (!content || !activeScanId) return;

  content.innerHTML =
    '<p class="empty-message">Fix önerileri yükleniyor...</p>';

  const result = await get(`/scans/${activeScanId}/fixes`, {
    status: "pending",
  });

  if (!result.success) {
    content.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">Fix önerileri alınamadı</p>
        <p class="empty-message">${escapeHtml(result.error)}</p>
      </div>
    `;
    return;
  }

  const fixes = result.data.fixes || [];
  if (fixes.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <p class="empty-title">Bekleyen fix yok</p>
        <p class="empty-message">Bu taramadaki tüm öneriler işlenmiş durumda.</p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="table-container">
      <table class="data-table" role="table" aria-label="Bekleyen fix listesi">
        <thead>
          <tr>
            <th scope="col">Kriter</th>
            <th scope="col">İhlal</th>
            <th scope="col">Hedef</th>
            <th scope="col">Patch</th>
            <th scope="col">Güven</th>
            <th scope="col">İşlem</th>
          </tr>
        </thead>
        <tbody>
          ${fixes
            .map(
              (fix) => `
            <tr>
              <td><code>${escapeHtml(fix.wcag_criterion || "—")}</code></td>
              <td>${escapeHtml(fix.violation_type || "—")}</td>
              <td class="cell-mono">${escapeHtml(fix.element_selector || "—")}</td>
              <td class="cell-mono">${escapeHtml(getPatchPreview(fix))}</td>
              <td>${formatConfidence(fix.ai_confidence)}</td>
              <td>
                <div class="inline-actions">
                  <button class="btn-secondary" data-fix-action="approved" data-fix-id="${fix.id}">
                    Onayla
                  </button>
                  <button class="btn-secondary" data-fix-action="rejected" data-fix-id="${fix.id}">
                    Reddet
                  </button>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function updateFixApproval(fixId, approvalStatus, button) {
  const actionText = approvalStatus === "approved" ? "onaylandı" : "reddedildi";
  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  const result = await patch(`/fixes/${fixId}/approval`, {
    status: approvalStatus,
  });

  button.removeAttribute("aria-busy");
  button.disabled = false;

  if (!result.success) {
    showToast(result.error || "Fix güncellenemedi", "error");
    announceFixStatus(
      `Fix güncellenemedi: ${result.error || "Bilinmeyen hata"}`,
    );
    return;
  }

  showToast(
    `Fix ${approvalStatus === "approved" ? "onaylandı" : "reddedildi"}`,
    "success",
  );
  announceFixStatus(`Fix başarıyla ${actionText}.`);

  await Promise.all([loadScanFixes(), loadScans(currentPage)]);
}

function announceFixStatus(message) {
  const region = document.getElementById("fix-approval-status");
  if (!region) return;

  region.textContent = "";
  setTimeout(() => {
    region.textContent = message;
  }, 20);
}

function getPatchPreview(fix) {
  const raw = fix.css_patch || fix.html_patch || "";
  if (!raw) return "—";
  const compact = raw.replace(/\s+/g, " ").trim();
  return compact.length > 72 ? `${compact.substring(0, 72)}…` : compact;
}

function formatConfidence(value) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return `${num.toFixed(0)}%`;
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
  div.textContent = String(text || "");
  return div.innerHTML;
}
