/**
 * Table Component
 * Sortable, accessible data table with keyboard navigation
 */

export function createTable(headers, rows, options = {}) {
  const tableId = options.id || `table-${Date.now()}`;

  return `
    <div class="table-container">
      <table class="data-table" id="${tableId}">
        <thead>
          <tr>
            ${headers
              .map(
                (h) => `
              <th ${h.sortable ? `aria-sort="none" tabindex="0"` : ""} data-key="${h.key}">
                ${h.label}
              </th>
            `,
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${
            rows.length === 0
              ? `
            <tr>
              <td colspan="${headers.length}" style="text-align: center; padding: var(--space-6); color: var(--color-text-muted);">
                Veri bulunamadı
              </td>
            </tr>
          `
              : rows
                  .map(
                    (row) => `
            <tr>
              ${headers.map((h) => `<td>${row[h.key] || "-"}</td>`).join("")}
            </tr>
          `,
                  )
                  .join("")
          }
        </tbody>
      </table>
    </div>
  `;
}

export function initTableSorting(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll("th[aria-sort]");

  headers.forEach((th) => {
    th.addEventListener("click", () => sortTable(table, th));
    th.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        sortTable(table, th);
      }
    });
  });
}

function sortTable(table, th) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const columnIndex = Array.from(th.parentElement.children).indexOf(th);
  const currentSort = th.getAttribute("aria-sort");

  // Reset all headers
  table
    .querySelectorAll("th[aria-sort]")
    .forEach((h) => h.setAttribute("aria-sort", "none"));

  // Determine new sort direction
  const newSort = currentSort === "ascending" ? "descending" : "ascending";
  th.setAttribute("aria-sort", newSort);

  // Sort rows
  rows.sort((a, b) => {
    const aValue = a.cells[columnIndex].textContent.trim();
    const bValue = b.cells[columnIndex].textContent.trim();

    const comparison = aValue.localeCompare(bValue, "tr", { numeric: true });
    return newSort === "ascending" ? comparison : -comparison;
  });

  // Re-append sorted rows
  rows.forEach((row) => tbody.appendChild(row));
}
