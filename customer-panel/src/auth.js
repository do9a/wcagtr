/**
 * WCAGTR Customer Panel - Authentication Module
 * Handles customer login, JWT storage, token validation, and logout
 */

const API_BASE = resolveApiBase();
const TOKEN_KEY = "customer_token";
const USER_KEY = "customer_user";

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

export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Giriş başarısız",
      };
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.customer));

    window.dispatchEvent(
      new CustomEvent("customer-login", {
        detail: { user: data.customer },
      }),
    );

    return {
      success: true,
      user: data.customer,
    };
  } catch (error) {
    console.error("[Auth] Login error:", error);
    return {
      success: false,
      error: "Sunucuya bağlanılamadı",
    };
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("customer-logout"));
}

export function isAuthenticated() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) return false;

  try {
    const payload = parseJWT(token);

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn("[Auth] Token expired");
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

export function getCustomerUser() {
  try {
    const userJson = localStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("[Auth] Error parsing user:", error);
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

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
