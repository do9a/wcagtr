/**
 * Tokens Component
 */

import { getTokens } from "../api.js";
import { createTable, initTableSorting } from "./table.js";

export async function render() {
  const result = await getTokens({ limit: 50 });
  const tokens = result.success ? result.data.tokens || [] : [];

  const headers = [
    { key: "id", label: "ID", sortable: true },
    { key: "domain", label: "Domain", sortable: true },
    { key: "customer", label: "Müşteri", sortable: true },
    { key: "status", label: "Durum", sortable: true },
    { key: "expires_at", label: "Son Kullanma", sortable: true },
    { key: "actions", label: "İşlemler", sortable: false },
  ];

  const rows = tokens.map((t) => ({
    id: t.id,
    domain: t.domain,
    customer: t.customer_name || "-",
    status: t.is_active
      ? '<span class="badge badge-success">Aktif</span>'
      : '<span class="badge badge-neutral">Pasif</span>',
    expires_at: formatDate(t.expires_at),
    actions: `
      <button class="btn btn-sm btn-secondary" data-action="revoke" data-id="${t.id}">
        İptal Et
      </button>
    `,
  }));

  return `
    <div class="tokens-view">
      <h1>Widget Tokenları</h1>
      ${createTable(headers, rows, { id: "tokens-table" })}
    </div>
  `;
}

function formatDate(date) {
  if (!date) return "Süresiz";
  return new Date(date).toLocaleDateString("tr-TR");
}

export function init() {
  initTableSorting("tokens-table");
}
