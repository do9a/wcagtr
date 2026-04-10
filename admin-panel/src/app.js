/**
 * WCAG TR Admin Panel - Main Application Router
 *
 * Hash-based SPA router with authentication, state management, and view rendering.
 * WCAG 2.2 compliant: manages focus, announces route changes, keyboard accessible.
 */

import { isAuthenticated, getAdminUser, logout } from "./auth.js";

// Application state
const state = {
  currentRoute: null,
  currentQuery: null,
  user: null,
  lang: localStorage.getItem("admin-lang") || "tr",
};

// Route definitions
const routes = {
  "/dashboard": {
    title: { tr: "Genel Bakış", en: "Dashboard" },
    component: "dashboard",
    requiresAuth: true,
  },
  "/customers": {
    title: { tr: "Müşteriler", en: "Customers" },
    component: "customers",
    requiresAuth: true,
  },
  "/scans": {
    title: { tr: "Taramalar", en: "Scans" },
    component: "scans",
    requiresAuth: true,
  },
  "/tokens": {
    title: { tr: "Tokenlar", en: "Tokens" },
    component: "tokens",
    requiresAuth: true,
  },
  "/pricing": {
    title: { tr: "Fiyatlandırma", en: "Pricing" },
    component: "pricing",
    requiresAuth: true,
  },
  "/customer-detail": {
    title: { tr: "Müşteri Detayı", en: "Customer Detail" },
    component: "customerdetail",
    requiresAuth: true,
  },
  "/health": {
    title: { tr: "Sistem Sağlığı", en: "System Health" },
    component: "health",
    requiresAuth: true,
  },
};

// Default route
const DEFAULT_ROUTE = "/dashboard";
const NOT_FOUND_ROUTE = "/dashboard";

/**
 * Initialize the application
 */
export function init() {
  console.log("[App] Initializing admin panel...");
  hydrateSessionFromQuery();

  // Check authentication
  if (isAuthenticated()) {
    state.user = getAdminUser();
    showApp();
    setupNavigation();
    handleRoute();
  } else {
    showLogin();
  }

  // Listen for hash changes (browser back/forward)
  window.addEventListener("hashchange", handleRoute);

  // Listen for auth state changes
  window.addEventListener("admin-login", handleLogin);
  window.addEventListener("admin-logout", handleLogout);
  window.addEventListener("show-toast", handleToastEvent);

  // Logout button
  const logoutBtn = document.getElementById("logout-button");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      logout();
    });
  }
}

function hydrateSessionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) return;

  localStorage.setItem("admin_token", token);

  const payload = parseJwtPayload(token);
  if (payload) {
    const cachedUser = localStorage.getItem("admin_user");
    if (!cachedUser) {
      localStorage.setItem(
        "admin_user",
        JSON.stringify({
          name:
            payload.name ||
            payload.email?.split("@")[0] ||
            "Admin",
          email: payload.email || "",
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

/**
 * Handle route changes
 */
function handleRoute() {
  const rawHash = window.location.hash.slice(1) || DEFAULT_ROUTE; // Remove #
  const [path, queryString = ""] = rawHash.split("?");
  const route = routes[path];
  const query = new URLSearchParams(queryString);

  if (!route) {
    console.warn(
      `[App] Route not found: ${path}, redirecting to ${NOT_FOUND_ROUTE}`,
    );
    window.location.hash = NOT_FOUND_ROUTE;
    return;
  }

  // Check authentication
  if (route.requiresAuth && !isAuthenticated()) {
    console.warn("[App] Route requires auth, showing login");
    showLogin();
    return;
  }

  state.currentRoute = path;
  state.currentQuery = query;
  renderRoute(route, { path, query });
  updateNavigation(path);
  updatePageTitle(route);
}

/**
 * Render the current route's component
 */
async function renderRoute(route, routeContext = {}) {
  const viewContainer = document.getElementById("view-container");
  if (!viewContainer) return;

  // Show loading state
  showLoading(viewContainer);

  try {
    // Dynamically import and render component
      const module = await import(`./components/${route.component}.js`);

      if (module && typeof module.render === "function") {
      const html = await module.render(routeContext);
      viewContainer.innerHTML = html;

      // Initialize component (if it has init function)
      if (typeof module.init === "function") {
        module.init(routeContext);
      }

      // Announce route change to screen readers (WCAG 2.4.3)
      announceRouteChange(route.title[state.lang]);

      // Focus main content (WCAG 2.4.3)
      focusMainContent();
    } else {
      throw new Error(`Component ${route.component} has no render function`);
    }
  } catch (error) {
    console.error(`[App] Error rendering route ${route.component}:`, error);
    showError(viewContainer, error.message);
  }
}

/**
 * Update navigation active states
 */
function updateNavigation(currentPath) {
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    const route = link.getAttribute("data-route");
    const path = `/${route}`;

    if (path === currentPath) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

/**
 * Update page title (WCAG 2.4.2)
 */
function updatePageTitle(route) {
  const title = route.title[state.lang];
  document.title = `${title} - Admin Panel - WCAG TR Platform`;
}

/**
 * Setup navigation event listeners
 */
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      // Let default behavior handle hash change
      // hashchange event will trigger handleRoute()
    });
  });

  // Mobile nav toggle
  const navToggle = document.getElementById("nav-toggle");
  const appNav = document.getElementById("app-nav");

  if (navToggle && appNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      appNav.setAttribute("data-expanded", String(!expanded));
    });

    // Close menu on route change (mobile)
    window.addEventListener("hashchange", () => {
      navToggle.setAttribute("aria-expanded", "false");
      appNav.setAttribute("data-expanded", "false");
    });
  }

  // Update admin info
  const adminName = document.getElementById("admin-name");
  const adminEmail = document.getElementById("admin-email-display");

  if (adminName && state.user) {
    adminName.textContent = state.user.name || "Admin";
  }

  if (adminEmail && state.user) {
    adminEmail.textContent = state.user.email || "";
  }
}

/**
 * Show login screen
 */
function showLogin() {
  const loginScreen = document.getElementById("login-screen");
  const appContainer = document.getElementById("app-container");

  if (loginScreen) loginScreen.hidden = false;
  if (appContainer) appContainer.hidden = true;

  // Focus first input
  setTimeout(() => {
    const emailInput = document.getElementById("admin-email");
    if (emailInput) emailInput.focus();
  }, 100);
}

/**
 * Show app (hide login)
 */
function showApp() {
  const loginScreen = document.getElementById("login-screen");
  const appContainer = document.getElementById("app-container");

  if (loginScreen) loginScreen.hidden = true;
  if (appContainer) appContainer.hidden = false;
}

/**
 * Handle login event
 */
function handleLogin(event) {
  console.log("[App] Login successful");
  state.user = event.detail.user;
  showApp();
  setupNavigation();

  // Navigate to dashboard
  window.location.hash = DEFAULT_ROUTE;
  handleRoute();
}

/**
 * Handle logout event
 */
function handleLogout() {
  console.log("[App] Logout");
  state.user = null;
  state.currentRoute = null;
  showLogin();
  window.location.hash = "";
}

function handleToastEvent(event) {
  const { message, type = "info" } = event.detail || {};
  if (!message) return;
  showToast(message, type);
}

/**
 * Show loading state
 */
function showLoading(container) {
  container.innerHTML = `
    <div class="loading-view" role="status" aria-live="polite">
      <div class="spinner-large"></div>
      <p>Yükleniyor...</p>
    </div>
  `;
}

/**
 * Show error state
 */
function showError(container, message) {
  container.innerHTML = `
    <div class="error-view" role="alert">
      <h2>Hata</h2>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="window.location.reload()">
        Sayfayı Yenile
      </button>
    </div>
  `;
}

/**
 * Announce route change to screen readers (WCAG 4.1.3)
 */
function announceRouteChange(title) {
  const announcement = document.createElement("div");
  announcement.setAttribute("role", "status");
  announcement.setAttribute("aria-live", "polite");
  announcement.className = "sr-only";
  announcement.textContent = `Sayfa yüklendi: ${title}`;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Focus main content (WCAG 2.4.3)
 */
function focusMainContent() {
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.focus();
  }
}

/**
 * Navigate programmatically
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get current state
 */
export function getState() {
  return { ...state };
}

/**
 * Show toast notification
 */
export function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 5000);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
