/**
 * WCAGTR Customer Panel - API Client
 * Centralized API client with automatic JWT injection and error handling
 */

import { getToken, logout } from "./auth.js";

const API_BASE = resolveApiBase();
const REQUEST_TIMEOUT = 30000;

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

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    ...options,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (response.status === 401) {
      console.warn("[API] Unauthorized, logging out");
      logout();
      return {
        success: false,
        error: "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("[API] Request error:", error);

    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return {
        success: false,
        error: "İstek zaman aşımına uğradı",
      };
    }

    return {
      success: false,
      error: error.message || "Beklenmeyen bir hata oluştu",
    };
  }
}

export async function get(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return apiRequest(url, { method: "GET" });
}

export async function post(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function put(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function patch(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function del(endpoint) {
  return apiRequest(endpoint, { method: "DELETE" });
}

// Customer API methods
export async function getMyScans(params = {}) {
  return get("/scans", params);
}

export async function getScanDetail(scanId) {
  return get(`/scans/${scanId}`);
}

export async function getMyTokens(params = {}) {
  return get("/tokens", params);
}

export async function createToken(domainData) {
  return post("/tokens", domainData);
}

export async function deleteToken(tokenId) {
  return del(`/tokens/${tokenId}`);
}

export async function getBillingSummary() {
  return get("/customer/billing");
}

export async function getBillingPlans() {
  return get("/customer/billing/plans");
}

export async function upgradeBillingPlan(plan) {
  return post("/customer/billing/upgrade", { plan });
}

export async function getBillingPayments(params = {}) {
  return get("/customer/billing/payments", params);
}

export async function getWebhooks() {
  return get("/webhooks");
}

export async function createWebhook(payload) {
  return post("/webhooks", payload);
}

export async function updateWebhook(webhookId, payload) {
  return patch(`/webhooks/${webhookId}`, payload);
}

export async function deleteWebhook(webhookId) {
  return del(`/webhooks/${webhookId}`);
}

export async function testWebhook(webhookId) {
  return post(`/webhooks/${webhookId}/test`, {});
}

export async function getWebhookDeliveries(webhookId, params = {}) {
  return get(`/webhooks/${webhookId}/deliveries`, params);
}

export function showToast(message, type = "info") {
  const event = new CustomEvent("show-toast", {
    detail: { message, type },
  });
  window.dispatchEvent(event);
}
