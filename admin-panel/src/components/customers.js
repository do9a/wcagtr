/**
 * Customers Component
 */

import {
  getCustomers,
  suspendCustomer,
  handleAPIError,
  showSuccess,
} from "../api.js";
import { createTable, initTableSorting } from "./table.js";

export async function render() {
  const result = await getCustomers({ limit: 50 });
  const customers = result.success ? result.data.customers || [] : [];

  const headers = [
    { key: "id", label: "ID", sortable: true },
    { key: "name", label: "İsim", sortable: true },
    { key: "email", label: "E-posta", sortable: true },
    { key: "company", label: "Şirket", sortable: true },
    { key: "plan", label: "Plan", sortable: true },
    { key: "status", label: "Durum", sortable: true },
    { key: "created_at", label: "Kayıt Tarihi", sortable: true },
    { key: "actions", label: "İşlemler", sortable: false },
  ];

  const rows = customers.map((customer) => {
    const isSuspended = Boolean(customer.is_suspended);
    const suspensionLabel = isSuspended ? "Aktifleştir" : "Askıya Al";

    return {
      id: customer.id,
      name: escapeHtml(customer.contact_name || customer.company_name || "-"),
      email: escapeHtml(customer.email || "-"),
      company: escapeHtml(customer.company_name || "-"),
      plan: `<span class="badge badge-info">${escapeHtml(customer.subscription_plan || "free")}</span>`,
      status: renderStatusBadge(isSuspended),
      created_at: formatDate(customer.created_at),
      actions: `
        <div class="table-actions">
          <button class="btn btn-sm btn-secondary" data-action="view" data-id="${customer.id}">
            Görüntüle
          </button>
          <button
            class="btn btn-sm btn-secondary"
            data-action="suspend"
            data-id="${customer.id}"
            data-next-suspended="${String(!isSuspended)}"
            aria-label="${escapeHtml(customer.email || "Müşteri")} için ${suspensionLabel}"
          >
            ${suspensionLabel}
          </button>
        </div>
      `,
    };
  });

  return `
    <div class="customers-view">
      <header class="view-header">
        <h1>Müşteriler</h1>
        <button class="btn btn-primary" id="add-customer">+ Yeni Müşteri</button>
      </header>

      ${createTable(headers, rows, { id: "customers-table" })}
    </div>
  `;
}

export function init() {
  initTableSorting("customers-table");

  const table = document.getElementById("customers-table");
  if (!table) return;

  table.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const customerId = button.dataset.id;

    if (!customerId) return;

    if (action === "view") {
      window.location.hash = `/customer-detail?id=${encodeURIComponent(customerId)}`;
      return;
    }

    if (action === "suspend") {
      await handleSuspendAction(button, customerId);
    }
  });
}

async function handleSuspendAction(button, customerId) {
  const nextSuspended = button.dataset.nextSuspended === "true";
  const confirmMessage = nextSuspended
    ? "Bu müşteriyi askıya almak istediğinizden emin misiniz?"
    : "Bu müşteriyi tekrar aktifleştirmek istediğinizden emin misiniz?";

  if (!window.confirm(confirmMessage)) {
    return;
  }

  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  const result = await suspendCustomer(customerId, nextSuspended);

  button.disabled = false;
  button.removeAttribute("aria-busy");

  if (!result.success) {
    handleAPIError(result.error, "Müşteri durumu güncellenemedi");
    return;
  }

  const isSuspended = Boolean(result.data?.isSuspended);
  const row = button.closest("tr");
  if (row) {
    updateRowSuspensionState(row, isSuspended);
  }

  showSuccess(
    isSuspended ? "Müşteri askıya alındı." : "Müşteri yeniden aktifleştirildi.",
  );
}

function updateRowSuspensionState(row, isSuspended) {
  const statusCell = row.querySelector("[data-customer-status]");
  if (statusCell) {
    statusCell.innerHTML = renderStatusBadge(isSuspended);
  }

  const actionButton = row.querySelector('[data-action="suspend"]');
  if (actionButton) {
    const nextLabel = isSuspended ? "Aktifleştir" : "Askıya Al";
    actionButton.textContent = nextLabel;
    actionButton.dataset.nextSuspended = String(!isSuspended);
  }
}

function renderStatusBadge(isSuspended) {
  if (isSuspended) {
    return '<span class="badge badge-warning" data-customer-status="true">Askıda</span>';
  }

  return '<span class="badge badge-success" data-customer-status="true">Aktif</span>';
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value || "");
  return div.innerHTML;
}
