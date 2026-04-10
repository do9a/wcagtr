import crypto from "crypto";
import { query } from "../config/database.js";
import { assertSafeWebhookUrl } from "../utils/webhookSafety.js";

const DELIVERY_TIMEOUT_MS = 10000;
const MAX_RESPONSE_BODY_LENGTH = 2000;
const MAX_DELIVERY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const WEBHOOK_EVENT_TYPES = [
  "scan.completed",
  "fix.approved",
  "billing.plan_changed",
];

function maskText(value, maxLength = MAX_RESPONSE_BODY_LENGTH) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

function buildSignature(secret, timestamp, rawPayload) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawPayload}`)
    .digest("hex");
}

function getRetryDelayMs(attempt) {
  const exponent = Math.max(0, attempt - 1);
  const jitter = Math.floor(Math.random() * 200);
  return RETRY_BASE_DELAY_MS * 2 ** exponent + jitter;
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableStatus(statusCode) {
  if (!Number.isInteger(statusCode)) return false;
  return RETRYABLE_STATUS_CODES.has(statusCode);
}

async function insertDeliveryLog({
  webhookId,
  eventType,
  payload,
  responseStatus,
  responseBody,
  success,
  errorMessage,
}) {
  await query(
    `INSERT INTO webhook_deliveries (
       webhook_id, event_type, payload, response_status, response_body, success, error_message
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
    [
      webhookId,
      eventType,
      JSON.stringify(payload),
      responseStatus || null,
      responseBody || null,
      success,
      errorMessage || null,
    ],
  );
}

async function markWebhookSuccess(webhookId) {
  await query(
    `UPDATE webhooks
     SET last_success_at = NOW(),
         failure_count = 0,
         updated_at = NOW()
     WHERE id = $1`,
    [webhookId],
  );
}

async function markWebhookFailure(webhookId) {
  await query(
    `UPDATE webhooks
     SET last_failure_at = NOW(),
         failure_count = failure_count + 1,
         updated_at = NOW()
     WHERE id = $1`,
    [webhookId],
  );
}

async function deliverWebhook(webhook, eventType, payloadData) {
  const safeWebhookUrl = await assertSafeWebhookUrl(webhook.url);
  const eventPayload = {
    id: crypto.randomUUID(),
    type: eventType,
    createdAt: new Date().toISOString(),
    data: payloadData,
  };

  const rawPayload = JSON.stringify(eventPayload);
  const timestamp = String(Date.now());
  const signature = buildSignature(webhook.secret, timestamp, rawPayload);

  let lastStatus = null;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(safeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "WCAGTR-Webhook/1.0",
          "X-WCAGTR-Event": eventType,
          "X-WCAGTR-Timestamp": timestamp,
          "X-WCAGTR-Signature": `sha256=${signature}`,
          "X-WCAGTR-Attempt": String(attempt),
        },
        body: rawPayload,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      const responseText = await response.text().catch(() => "");
      const success = response.ok;

      await insertDeliveryLog({
        webhookId: webhook.id,
        eventType,
        payload: eventPayload,
        responseStatus: response.status,
        responseBody: maskText(responseText),
        success,
        errorMessage: success
          ? null
          : `HTTP ${response.status} (deneme ${attempt}/${MAX_DELIVERY_ATTEMPTS})`,
      });

      if (success) {
        await markWebhookSuccess(webhook.id);
        return {
          webhookId: webhook.id,
          success: true,
          status: response.status,
          attempts: attempt,
        };
      }

      lastStatus = response.status;
      lastError = `HTTP ${response.status}`;

      const shouldRetry =
        isRetryableStatus(response.status) && attempt < MAX_DELIVERY_ATTEMPTS;
      if (!shouldRetry) {
        await markWebhookFailure(webhook.id);
        return {
          webhookId: webhook.id,
          success: false,
          status: response.status,
          attempts: attempt,
          error: lastError,
        };
      }
    } catch (error) {
      lastError = error.message;

      await insertDeliveryLog({
        webhookId: webhook.id,
        eventType,
        payload: eventPayload,
        responseStatus: null,
        responseBody: null,
        success: false,
        errorMessage: `${error.message} (deneme ${attempt}/${MAX_DELIVERY_ATTEMPTS})`,
      });

      if (attempt >= MAX_DELIVERY_ATTEMPTS) {
        await markWebhookFailure(webhook.id);
        return {
          webhookId: webhook.id,
          success: false,
          status: null,
          attempts: attempt,
          error: error.message,
        };
      }
    }

    await wait(getRetryDelayMs(attempt));
  }

  await markWebhookFailure(webhook.id);
  return {
    webhookId: webhook.id,
    success: false,
    status: lastStatus,
    attempts: MAX_DELIVERY_ATTEMPTS,
    error: lastError || "Webhook teslimatı başarısız",
  };
}

async function getActiveWebhooks(customerId, eventType) {
  const result = await query(
    `SELECT id, customer_id, url, events, secret, is_active
     FROM webhooks
     WHERE customer_id = $1
       AND is_active = true
       AND $2 = ANY(events)
     ORDER BY id ASC`,
    [customerId, eventType],
  );

  return result.rows;
}

export async function triggerWebhookEvent({ customerId, eventType, payload }) {
  if (!Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
    throw new Error("Geçersiz customerId");
  }

  if (!WEBHOOK_EVENT_TYPES.includes(eventType)) {
    throw new Error(`Desteklenmeyen webhook olayı: ${eventType}`);
  }

  const webhooks = await getActiveWebhooks(Number(customerId), eventType);
  if (webhooks.length === 0) {
    return { total: 0, delivered: 0, failed: 0 };
  }

  const results = [];
  for (const webhook of webhooks) {
    const result = await deliverWebhook(webhook, eventType, payload);
    results.push(result);
  }

  return {
    total: results.length,
    delivered: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

export async function sendTestWebhook({ webhookId, customerId }) {
  const result = await query(
    `SELECT id, customer_id, url, events, secret, is_active
     FROM webhooks
     WHERE id = $1 AND customer_id = $2`,
    [webhookId, customerId],
  );

  if (result.rows.length === 0) {
    return { found: false };
  }

  const webhook = result.rows[0];
  const delivery = await deliverWebhook(webhook, "webhook.test", {
    message: "Bu bir test webhook bildirimidir.",
    webhookId: webhook.id,
  });

  return { found: true, delivery };
}
