/**
 * Scans Component
 */

import { getScans } from "../api.js";
import { createTable, initTableSorting } from "./table.js";

export async function render() {
  const result = await getScans({ limit: 50 });
  const scans = result.success ? result.data.scans || [] : [];

  const headers = [
    { key: "id", label: "ID", sortable: true },
    { key: "url", label: "URL", sortable: true },
    { key: "violations", label: "İhlaller", sortable: true },
    { key: "score", label: "Skor", sortable: true },
    { key: "created_at", label: "Tarih", sortable: true },
  ];

  const rows = scans.map((s) => ({
    id: s.id,
    url: s.url,
    violations: s.total_violations || 0,
    score: `${s.tr_compliance_score || 0}%`,
    created_at: formatDate(s.created_at),
  }));

  return `
    <div class="scans-view">
      <h1>Taramalar</h1>
      ${createTable(headers, rows, { id: "scans-table" })}
    </div>
  `;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function init() {
  initTableSorting("scans-table");
}
