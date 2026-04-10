/**
 * Tokens Component
 */

import { get, post, del, showToast } from "../api.js";

export function renderTokens() {
  const container = document.createElement("div");
  container.className = "tokens-view";

  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Widget Tokenları</h1>
      <p class="page-subtitle">Domain bazlı widget erişim tokenları</p>
    </div>

    <div class="table-wrapper">
      <div class="table-header">
        <h2 class="table-title">Tokenlar</h2>
        <div class="table-actions">
          <button class="btn btn-primary" id="create-token-btn">+ Yeni Token</button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" role="table" aria-label="Token listesi">
          <thead>
            <tr>
              <th scope="col">Domain</th>
              <th scope="col">Token</th>
              <th scope="col">Oluşturma Tarihi</th>
              <th scope="col">Durum</th>
              <th scope="col">İşlemler</th>
            </tr>
          </thead>
          <tbody id="tokens-table">
            <tr>
              <td colspan="5" class="empty-state">Yükleniyor...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Token Modal (Simple) -->
    <div id="token-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
      <div class="modal-container size-sm">
        <h2 id="modal-title" class="table-title mb-lg">Yeni Token Oluştur</h2>

        <form id="token-form">
          <div class="form-group">
            <label for="domain-input" class="form-label">Domain</label>
            <input
              type="text"
              id="domain-input"
              name="domain"
              class="form-input"
              placeholder="ornek.com"
              required
            >
          </div>

          <div class="form-group inline-actions">
            <button type="button" class="btn btn-secondary flex-fill" id="cancel-token">İptal</button>
            <button type="submit" class="btn btn-primary flex-fill">Oluştur</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setTimeout(() => {
    loadTokens();
    setupTokensListeners();
  }, 0);

  return container;
}

async function loadTokens() {
  const tbody = document.getElementById("tokens-table");
  if (!tbody) return;

  try {
    const result = await get("/tokens");

    if (!result.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <p class="empty-title">Hata</p>
            <p class="empty-message">${result.error}</p>
          </td>
        </tr>
      `;
      return;
    }

    const tokens = result.data.tokens || [];

    if (tokens.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <p class="empty-title">Henüz token yok</p>
            <p class="empty-message">Widget kullanmak için bir token oluşturun</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tokens
      .map(
        (token) => `
      <tr>
        <td><strong>${escapeHtml(token.domain || "")}</strong></td>
        <td class="cell-mono token-value">${escapeHtml(token.widget_token || "").substring(0, 40)}...</td>
        <td>${formatDate(token.created_at)}</td>
        <td>
          <span class="cell-badge ${token.is_active ? "badge-success" : "badge-neutral"}">
            ${token.is_active ? "Aktif" : "Pasif"}
          </span>
        </td>
        <td>
          <button
            class="btn-secondary token-delete-btn"
            data-token-id="${token.id}"
            type="button"
          >
            Sil
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("[Tokens] Load error:", error);
  }
}

function setupTokensListeners() {
  const createBtn = document.getElementById("create-token-btn");
  const cancelBtn = document.getElementById("cancel-token");
  const tokenForm = document.getElementById("token-form");
  const modal = document.getElementById("token-modal");
  const tbody = document.getElementById("tokens-table");

  if (createBtn) {
    createBtn.addEventListener("click", () => {
      modal.hidden = false;
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modal.hidden = true;
      tokenForm.reset();
    });
  }

  if (tokenForm) {
    tokenForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(tokenForm);
      const domain = formData.get("domain").trim();

      if (!domain) {
        showToast("Domain gerekli", "error");
        return;
      }

      const result = await post("/tokens", {
        domain,
        autoFixEnabled: true,
        serverPatchEnabled: false,
      });

      if (result.success) {
        showToast("Token başarıyla oluşturuldu", "success");
        modal.hidden = true;
        tokenForm.reset();
        loadTokens();
      } else {
        showToast(result.error, "error");
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const deleteButton = target?.closest(".token-delete-btn");
      if (!deleteButton) return;

      const tokenId = Number.parseInt(
        deleteButton.getAttribute("data-token-id") || "",
        10,
      );
      if (!Number.isInteger(tokenId) || tokenId <= 0) return;

      if (!confirm("Bu tokeni silmek istediğinizden emin misiniz?")) {
        return;
      }

      const result = await del(`/tokens/${tokenId}`);

      if (result.success) {
        showToast("Token silindi", "success");
        loadTokens();
      } else {
        showToast(result.error, "error");
      }
    });
  }
}

function formatDate(dateString) {
  if (!dateString) return "—";
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
