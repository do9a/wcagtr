/**
 * WCAG TR Admin Panel - API Client
 *
 * Centralized API client with automatic JWT injection, error handling, and retries.
 * All requests to backend /api/v1/* endpoints.
 */

import { getToken, logout } from "./auth.js";

const API_BASE = resolveApiBase();

// Request timeout (30 seconds)
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

/**
 * Generic API request wrapper
 * @param {string} endpoint - API endpoint (e.g., '/admin/customers')
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - { success, data?, error? }
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  // Build headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Build fetch options
  const fetchOptions = {
    ...options,
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      console.warn("[API] Unauthorized, logging out");
      logout();
      return {
        success: false,
        error: "Oturum süresi doldu. Lütfen tekrar giriş yapın.",
      };
    }

    // Handle other errors
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

    // Handle timeout
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return {
        success: false,
        error: "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.",
      };
    }

    // Handle network error
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.",
      };
    }

    return {
      success: false,
      error: error.message || "Beklenmeyen bir hata oluştu",
    };
  }
}

/**
 * GET request
 */
export async function get(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  return apiRequest(url, {
    method: "GET",
  });
}

/**
 * POST request
 */
export async function post(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * PUT request
 */
export async function put(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * PATCH request
 */
export async function patch(endpoint, body = {}) {
  return apiRequest(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * DELETE request
 */
export async function del(endpoint) {
  return apiRequest(endpoint, {
    method: "DELETE",
  });
}

// ============================================
// Admin-specific API methods
// ============================================

/**
 * Get all customers (admin only)
 * @param {object} params - { page, limit, search }
 */
export async function getCustomers(params = {}) {
  return get("/admin/customers", params);
}

/**
 * Get customer by ID
 */
export async function getCustomer(customerId) {
  return get(`/admin/customers/${customerId}`);
}

/**
 * Get customer detail (summary + domains + scans + payments)
 */
export async function getCustomerDetail(customerId) {
  return get(`/admin/customers/${customerId}/detail`);
}

/**
 * Suspend customer
 */
export async function suspendCustomer(customerId, isSuspended) {
  const body = typeof isSuspended === "boolean" ? { isSuspended } : {};
  return patch(`/admin/customers/${customerId}/suspend`, body);
}

/**
 * Delete customer
 */
export async function deleteCustomer(customerId) {
  return del(`/admin/customers/${customerId}`);
}

/**
 * Get all scans
 * @param {object} params - { page, limit, customerId, status, startDate, endDate }
 */
export async function getScans(params = {}) {
  return get("/admin/scans", params);
}

/**
 * Get scan by ID
 */
export async function getScan(scanId) {
  return get(`/admin/scans/${scanId}`);
}

/**
 * Get all widget tokens
 * @param {object} params - { page, limit, customerId, isActive }
 */
export async function getTokens(params = {}) {
  return get("/admin/tokens", params);
}

/**
 * Revoke token
 */
export async function revokeToken(tokenId) {
  return patch(`/admin/tokens/${tokenId}/revoke`);
}

/**
 * Get system health
 */
export async function getSystemHealth() {
  return get("/health");
}

/**
 * Get system metrics (admin only)
 */
export async function getSystemMetrics() {
  return get("/admin/metrics");
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  return get("/admin/dashboard");
}

/**
 * Get billing plans (admin only)
 */
export async function getBillingPlans() {
  return get("/admin/billing/plans");
}

/**
 * Update billing plan (admin only)
 */
export async function updateBillingPlan(planCode, payload) {
  return patch(`/admin/billing/plans/${planCode}`, payload);
}

// ============================================
// Error handling helpers
// ============================================

/**
 * Show API error as toast notification
 */
export function handleAPIError(error, defaultMessage = "Bir hata oluştu") {
  const message = error || defaultMessage;

  // Import showToast from app.js (circular dependency workaround)
  const event = new CustomEvent("show-toast", {
    detail: { message, type: "error" },
  });
  window.dispatchEvent(event);
}

/**
 * Show success toast
 */
export function showSuccess(message) {
  const event = new CustomEvent("show-toast", {
    detail: { message, type: "success" },
  });
  window.dispatchEvent(event);
}
