/**
 * WCAG TR Admin Panel - Authentication Module
 *
 * Handles admin login, JWT storage, token validation, and logout.
 * Uses existing backend /api/v1/auth/admin/login endpoint.
 */

const API_BASE = resolveApiBase();
const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

function resolveApiBase() {
  const metaBase =
    document
      .querySelector('meta[name="wcagtr-api-base"]')
      ?.getAttribute("content")
      ?.trim() || "";
  const globalBase =
    (typeof window !== "undefined" && window.__WCAGTR_API_BASE__) || "";

  if (globalBase) return globalBase.replace(/\/$/, "");
  if (metaBase) return metaBase.replace(/\/$/, "");

  const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
  return isLocal
    ? "http://localhost:3000/api/v1"
    : "https://wcagtr.app/api/v1";
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Giriş başarısız",
      };
    }

    // Store token and user
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.admin));

    // Dispatch login event
    window.dispatchEvent(
      new CustomEvent("admin-login", {
        detail: { user: data.admin },
      }),
    );

    return {
      success: true,
      user: data.admin,
    };
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return {
      success: false,
      error: "Sunucuya bağlanılamadı",
    };
  }
}

/**
 * Logout and clear session
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  // Dispatch logout event
  window.dispatchEvent(new CustomEvent("admin-logout"));
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) return false;

  // Validate token (basic check - JWT decoding)
  try {
    const payload = parseJWT(token);

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn("[Auth] Token expired");
      logout();
      return false;
    }

    // Check type
    if (payload.type !== "admin") {
      console.warn("[Auth] Invalid token type");
      logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Auth] Invalid token:", error);
    logout();
    return false;
  }
}

/**
 * Get current admin user
 * @returns {object|null}
 */
export function getAdminUser() {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("[Auth] Error parsing user:", error);
    return null;
  }
}

/**
 * Get current JWT token
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Parse JWT token (client-side only for basic validation)
 * @param {string} token
 * @returns {object}
 */
function parseJWT(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );

  return JSON.parse(jsonPayload);
}

/**
 * Setup login form listeners
 */
function setupLoginForm() {
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear previous errors
    clearFormErrors();
    loginError.hidden = true;

    // Get form data
    const formData = new FormData(loginForm);
    const email = formData.get("email").trim();
    const password = formData.get("password");

    // Client-side validation
    const errors = validateLoginForm(email, password);
    if (errors.length > 0) {
      showFormErrors(errors);
      return;
    }

    // Show loading
    setButtonLoading(loginButton, true);

    // Attempt login
    const result = await login(email, password);

    setButtonLoading(loginButton, false);

    if (!result.success) {
      loginError.textContent = result.error;
      loginError.hidden = false;

      // Focus error for screen readers
      loginError.focus();
    }
    // Success is handled by app.js listening to 'admin-login' event
  });

  // Language toggle
  const langToggle = document.getElementById("lang-toggle");
  if (langToggle) {
    langToggle.addEventListener("click", () => {
      const currentLang = localStorage.getItem("admin-lang") || "tr";
      const newLang = currentLang === "tr" ? "en" : "tr";
      localStorage.setItem("admin-lang", newLang);

      // Reload to apply translations (future: dynamic i18n)
      window.location.reload();
    });
  }
}

/**
 * Validate login form
 */
function validateLoginForm(email, password) {
  const errors = [];

  if (!email) {
    errors.push({ field: "email", message: "E-posta adresi gerekli" });
  } else if (!isValidEmail(email)) {
    errors.push({ field: "email", message: "Geçersiz e-posta adresi" });
  }

  if (!password) {
    errors.push({ field: "password", message: "Şifre gerekli" });
  } else if (password.length < 6) {
    errors.push({
      field: "password",
      message: "Şifre en az 6 karakter olmalı",
    });
  }

  return errors;
}

/**
 * Show form validation errors
 */
function showFormErrors(errors) {
  errors.forEach((error) => {
    const input = document.getElementById(`admin-${error.field}`);
    const errorSpan = document.getElementById(`${error.field}-error`);

    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.classList.add("error");
    }

    if (errorSpan) {
      errorSpan.textContent = error.message;
    }
  });

  // Focus first error field
  if (errors.length > 0) {
    const firstErrorField = document.getElementById(`admin-${errors[0].field}`);
    if (firstErrorField) firstErrorField.focus();
  }
}

/**
 * Clear form errors
 */
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

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
  if (!button) return;

  const btnText = button.querySelector(".btn-text");
  const btnLoader = button.querySelector(".btn-loader");

  button.disabled = loading;

  if (btnText) btnText.hidden = loading;
  if (btnLoader) btnLoader.hidden = !loading;

  button.setAttribute("aria-busy", String(loading));
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Initialize login form when DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupLoginForm);
} else {
  setupLoginForm();
}
