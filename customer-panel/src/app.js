/**
 * WCAGTR Customer Panel - Main Application Entry Point
 */

import { login, logout, isAuthenticated, getCustomerUser } from "./auth.js";
import { initRouter } from "./router.js";

// ========================================
// App State
// ========================================

let currentUser = null;

// ========================================
// Init
// ========================================

function init() {
  hydrateSessionFromQuery();

  if (isAuthenticated()) {
    showDashboard();
  } else {
    showLogin();
  }

  setupEventListeners();
}

function hydrateSessionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;

  localStorage.setItem("customer_token", token);

  const payload = parseJwtPayload(token);
  if (payload) {
    const cachedUser = localStorage.getItem("customer_user");
    if (!cachedUser) {
      localStorage.setItem(
        "customer_user",
        JSON.stringify({
          email: payload.email || "",
          companyName:
            payload.companyName ||
            payload.company ||
            payload.email?.split("@")[0] ||
            "Müşteri",
        }),
      );
    }
  }

  const cleanUrl = `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState({}, "", cleanUrl);
}

function parseJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ========================================
// Views
// ========================================

function showLogin() {
  document.getElementById("login-view").hidden = false;
  document.getElementById("dashboard-view").hidden = true;
  setupLoginForm();
}

function showDashboard() {
  document.getElementById("login-view").hidden = true;
  document.getElementById("dashboard-view").hidden = false;

  currentUser = getCustomerUser();
  updateUserProfile();
  initRouter();
}

// ========================================
// Login Form
// ========================================

function setupLoginForm() {
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    clearFormErrors();
    loginError.hidden = true;

    const formData = new FormData(loginForm);
    const email = formData.get("email").trim();
    const password = formData.get("password");

    const errors = validateLoginForm(email, password);
    if (errors.length > 0) {
      showFormErrors(errors);
      return;
    }

    setButtonLoading(loginButton, true);
    const result = await login(email, password);
    setButtonLoading(loginButton, false);

    if (!result.success) {
      loginError.textContent = result.error;
      loginError.hidden = false;
      loginError.focus();
    }
  });
}

function validateLoginForm(email, password) {
  const errors = [];

  if (!email) {
    errors.push({ field: "email", message: "E-posta adresi gerekli" });
  } else if (!isValidEmail(email)) {
    errors.push({ field: "email", message: "Geçersiz e-posta adresi" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Şifre gerekli" });
  }

  return errors;
}

function showFormErrors(errors) {
  errors.forEach((error) => {
    const input = document.getElementById(`customer-${error.field}`);
    const errorSpan = document.getElementById(`${error.field}-error`);

    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.classList.add("error");
    }

    if (errorSpan) {
      errorSpan.textContent = error.message;
    }
  });

  if (errors.length > 0) {
    const firstField = document.getElementById(`customer-${errors[0].field}`);
    if (firstField) firstField.focus();
  }
}

function clearFormErrors() {
  const inputs = document.querySelectorAll(".form-input");
  const errorSpans = document.querySelectorAll(".error-message");

  inputs.forEach((input) => {
    input.removeAttribute("aria-invalid");
    input.classList.remove("error");
  });

  errorSpans.forEach((span) => {
    span.textContent = "";
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ========================================
// User Profile
// ========================================

function updateUserProfile() {
  const user = getCustomerUser();
  if (!user) return;

  const userName = document.getElementById("user-name");
  const userEmail = document.getElementById("user-email");
  const userInitials = document.getElementById("user-initials");

  if (userName) {
    userName.textContent = user.companyName || user.email;
  }

  if (userEmail) {
    userEmail.textContent = user.email;
  }

  if (userInitials) {
    const initials = getInitials(user.companyName || user.email);
    userInitials.textContent = initials;
  }
}

function getInitials(name) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
  // Login event
  window.addEventListener("customer-login", () => {
    showDashboard();
  });

  // Logout event
  window.addEventListener("customer-logout", () => {
    showLogin();
  });

  // Logout button
  const logoutButton = document.getElementById("logout-button");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }

  // Toast notifications
  window.addEventListener("show-toast", (e) => {
    showToastNotification(e.detail.message, e.detail.type);
  });
}

// ========================================
// Toast Notifications
// ========================================

function showToastNotification(message, type = "info") {
  const container = document.querySelector(".toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// ========================================
// Utility - Button Loading State
// ========================================

function setButtonLoading(button, loading) {
  if (!button) return;

  const btnText = button.querySelector(".btn-text");
  const btnLoader = button.querySelector(".btn-loader");

  button.disabled = loading;

  if (btnText) btnText.hidden = loading;
  if (btnLoader) btnLoader.hidden = !loading;

  button.setAttribute("aria-busy", String(loading));
}

// ========================================
// Start App
// ========================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
