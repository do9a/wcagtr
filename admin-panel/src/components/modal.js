/**
 * Modal Component
 * Reusable accessible modal with focus trap
 */

export function createModal(title, content, options = {}) {
  const modalId = `modal-${Date.now()}`;
  const container = document.getElementById("modal-container");

  const modal = document.createElement("div");
  modal.className = "modal-backdrop";
  modal.id = modalId;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-labelledby", `${modalId}-title`);
  modal.setAttribute("aria-modal", "true");

  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 id="${modalId}-title" class="modal-title">${title}</h2>
        <button class="modal-close" type="button" aria-label="Kapat">×</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ""}
    </div>
  `;

  container.appendChild(modal);
  container.hidden = false;

  // Focus trap
  const closeBtn = modal.querySelector(".modal-close");
  const firstFocusable = modal.querySelector(
    "button, input, select, textarea, a[href]",
  );

  if (firstFocusable) firstFocusable.focus();

  // Close handlers
  closeBtn.addEventListener("click", () => closeModal(modalId));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modalId);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(modalId);
  });

  return modalId;
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  const container = document.getElementById("modal-container");

  if (modal) {
    modal.remove();
  }

  if (container && container.children.length === 0) {
    container.hidden = true;
  }
}
