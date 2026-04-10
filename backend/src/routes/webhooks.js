import express from "express";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { WEBHOOK_EVENT_TYPES, sendTestWebhook } from "../services/webhooks.js";
import { assertSafeWebhookUrl } from "../utils/webhookSafety.js";

const router = express.Router();

router.use(authMiddleware);
router.use(customerOnly);

function customerOnly(req, res, next) {
  if (req.user?.role !== "customer" || !req.user?.customerId) {
    return res.status(403).json({ error: "Müşteri erişimi gerekli" });
  }
  return next();
}

function parseWebhookId(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseDeliveriesLimit(value) {
  const parsed = Number.parseInt(String(value || "20"), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) return 20;
  return parsed;
}

function normalizeEvents(events) {
  if (!Array.isArray(events)) return null;
  const normalized = [...new Set(events.map((item) => String(item || "").trim()))];
  if (normalized.length === 0) return null;
  if (normalized.some((event) => !WEBHOOK_EVENT_TYPES.includes(event))) return null;
  return normalized;
}

function createDefaultSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function maskSecret(secret) {
  if (!secret) return null;
  const text = String(secret);
  if (text.length <= 8) return "********";
  return `${text.substring(0, 4)}...${text.substring(text.length - 4)}`;
}

router.get("/", async (req, res) => {
  try {
    const result = await query(
      `SELECT
         w.id,
         w.url,
         w.events,
         w.is_active,
         w.failure_count,
         w.last_success_at,
         w.last_failure_at,
         w.created_at,
         w.updated_at,
         ld.success AS last_delivery_success,
         ld.response_status AS last_delivery_status,
         ld.attempted_at AS last_delivery_at
       FROM webhooks w
       LEFT JOIN LATERAL (
         SELECT success, response_status, attempted_at
         FROM webhook_deliveries wd
         WHERE wd.webhook_id = w.id
         ORDER BY wd.attempted_at DESC
         LIMIT 1
       ) ld ON true
       WHERE w.customer_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.customerId],
    );

    res.json({
      webhooks: result.rows.map((row) => ({
        id: row.id,
        url: row.url,
        events: row.events,
        isActive: row.is_active,
        failureCount: Number(row.failure_count || 0),
        lastSuccessAt: row.last_success_at,
        lastFailureAt: row.last_failure_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastDelivery: row.last_delivery_at
          ? {
              success: row.last_delivery_success,
              status: row.last_delivery_status,
              attemptedAt: row.last_delivery_at,
            }
          : null,
      })),
      availableEvents: WEBHOOK_EVENT_TYPES,
    });
  } catch (error) {
    console.error("Webhook list error:", error);
    res.status(500).json({ error: "Webhook listesi alınamadı" });
  }
});

router.post("/", async (req, res) => {
  try {
    const rawUrl = String(req.body?.url || "").trim();
    const events = normalizeEvents(req.body?.events);
    const inputSecret = String(req.body?.secret || "").trim();
    const secret = inputSecret || createDefaultSecret();

    if (!rawUrl) {
      return res.status(400).json({ error: "Webhook URL gerekli" });
    }
    let safeUrl = "";
    try {
      safeUrl = await assertSafeWebhookUrl(rawUrl);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }
    if (!events) {
      return res.status(400).json({ error: "Geçerli en az bir olay seçin" });
    }
    if (secret.length < 16) {
      return res.status(400).json({ error: "Webhook secret en az 16 karakter olmalı" });
    }

    const result = await query(
       `INSERT INTO webhooks (customer_id, url, events, secret, is_active)
        VALUES ($1, $2, $3::text[], $4, true)
        RETURNING id, url, events, is_active, created_at`,
      [req.user.customerId, safeUrl, events, secret],
    );

    const webhook = result.rows[0];
    res.status(201).json({
      success: true,
      message: "Webhook oluşturuldu",
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.is_active,
        createdAt: webhook.created_at,
        secret,
        secretMasked: maskSecret(secret),
      },
    });
  } catch (error) {
    console.error("Webhook create error:", error);
    res.status(500).json({ error: "Webhook oluşturulamadı" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const webhookId = parseWebhookId(req.params.id);
    if (!webhookId) {
      return res.status(400).json({ error: "Geçersiz webhook ID" });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (req.body?.url !== undefined) {
      const rawUrl = String(req.body.url || "").trim();
      if (!rawUrl) {
        return res.status(400).json({ error: "Webhook URL geçersiz" });
      }

      let safeUrl = "";
      try {
        safeUrl = await assertSafeWebhookUrl(rawUrl);
      } catch (validationError) {
        return res.status(400).json({ error: validationError.message });
      }
      updates.push(`url = $${paramIndex++}`);
      params.push(safeUrl);
    }

    if (req.body?.events !== undefined) {
      const events = normalizeEvents(req.body.events);
      if (!events) {
        return res.status(400).json({ error: "Geçerli olay listesi gerekli" });
      }
      updates.push(`events = $${paramIndex++}::text[]`);
      params.push(events);
    }

    if (req.body?.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(req.body.isActive));
    }

    if (req.body?.secret !== undefined) {
      const secret = String(req.body.secret || "").trim();
      if (secret.length < 16) {
        return res
          .status(400)
          .json({ error: "Webhook secret en az 16 karakter olmalı" });
      }
      updates.push(`secret = $${paramIndex++}`);
      params.push(secret);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Güncellenecek alan bulunamadı" });
    }

    updates.push("updated_at = NOW()");
    params.push(webhookId, req.user.customerId);

    const result = await query(
      `UPDATE webhooks
       SET ${updates.join(", ")}
       WHERE id = $${paramIndex++}
         AND customer_id = $${paramIndex}
       RETURNING id, url, events, is_active, failure_count, updated_at`,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Webhook bulunamadı" });
    }

    const webhook = result.rows[0];
    res.json({
      success: true,
      message: "Webhook güncellendi",
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.is_active,
        failureCount: Number(webhook.failure_count || 0),
        updatedAt: webhook.updated_at,
      },
    });
  } catch (error) {
    console.error("Webhook update error:", error);
    res.status(500).json({ error: "Webhook güncellenemedi" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const webhookId = parseWebhookId(req.params.id);
    if (!webhookId) {
      return res.status(400).json({ error: "Geçersiz webhook ID" });
    }

    const result = await query(
      `DELETE FROM webhooks
       WHERE id = $1
         AND customer_id = $2
       RETURNING id`,
      [webhookId, req.user.customerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Webhook bulunamadı" });
    }

    res.json({ success: true, message: "Webhook silindi" });
  } catch (error) {
    console.error("Webhook delete error:", error);
    res.status(500).json({ error: "Webhook silinemedi" });
  }
});

router.post("/:id/test", async (req, res) => {
  try {
    const webhookId = parseWebhookId(req.params.id);
    if (!webhookId) {
      return res.status(400).json({ error: "Geçersiz webhook ID" });
    }

    const result = await sendTestWebhook({
      webhookId,
      customerId: req.user.customerId,
    });

    if (!result.found) {
      return res.status(404).json({ error: "Webhook bulunamadı" });
    }

    if (!result.delivery.success) {
      return res.status(502).json({
        error: "Test webhook gönderilemedi",
        details: result.delivery.error || "Bilinmeyen hata",
      });
    }

    res.json({
      success: true,
      message: "Test webhook gönderildi",
      delivery: result.delivery,
    });
  } catch (error) {
    console.error("Webhook test error:", error);
    res.status(500).json({ error: "Test webhook gönderilemedi" });
  }
});

router.get("/:id/deliveries", async (req, res) => {
  try {
    const webhookId = parseWebhookId(req.params.id);
    if (!webhookId) {
      return res.status(400).json({ error: "Geçersiz webhook ID" });
    }

    const limit = parseDeliveriesLimit(req.query.limit);

    const webhookResult = await query(
      "SELECT id FROM webhooks WHERE id = $1 AND customer_id = $2",
      [webhookId, req.user.customerId],
    );
    if (webhookResult.rows.length === 0) {
      return res.status(404).json({ error: "Webhook bulunamadı" });
    }

    const deliveriesResult = await query(
      `SELECT id, event_type, response_status, success, error_message, attempted_at
       FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY attempted_at DESC
       LIMIT $2`,
      [webhookId, limit],
    );

    res.json({
      deliveries: deliveriesResult.rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        responseStatus: row.response_status,
        success: row.success,
        errorMessage: row.error_message,
        attemptedAt: row.attempted_at,
      })),
    });
  } catch (error) {
    console.error("Webhook deliveries fetch error:", error);
    res.status(500).json({ error: "Webhook teslimatları alınamadı" });
  }
});

export default router;
