import express from "express";
import {
  findPaymentIdByProviderPaymentId,
  findPaymentIdByProviderReference,
  markPaymentFailed,
  markPaymentPaid,
  markPaymentRefunded,
  retrieveIyzicoCheckoutResult,
  verifyPaymentWebhookSignature,
  verifyStripeWebhookSignature,
} from "../services/billing.js";
import { query } from "../config/database.js";

const router = express.Router();

function parsePaymentId(rawValue) {
  const parsed = Number.parseInt(String(rawValue || ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function resolveStripePaymentId(stripeObject) {
  const metadataPaymentId = parsePaymentId(
    stripeObject?.metadata?.paymentId || stripeObject?.client_reference_id,
  );
  if (metadataPaymentId) {
    return metadataPaymentId;
  }

  const checkoutSessionId = String(stripeObject?.id || "").trim();
  if (checkoutSessionId) {
    const byReference = await findPaymentIdByProviderReference({
      provider: "stripe",
      providerReference: checkoutSessionId,
    });
    if (Number.isInteger(byReference) && byReference > 0) {
      return byReference;
    }
  }

  const providerPaymentId = String(
    stripeObject?.payment_intent || stripeObject?.id || "",
  ).trim();
  if (providerPaymentId) {
    const byProviderPaymentId =
      await findPaymentIdByProviderPaymentId(providerPaymentId);
    if (Number.isInteger(byProviderPaymentId) && byProviderPaymentId > 0) {
      return byProviderPaymentId;
    }
  }

  return null;
}

async function resolveIyzicoPaymentId(detailPayload, token) {
  const conversationId = parsePaymentId(detailPayload?.conversationId);
  if (conversationId) return conversationId;

  const tokenReference = String(token || "").trim();
  if (tokenReference) {
    const byReference = await findPaymentIdByProviderReference({
      provider: "iyzico",
      providerReference: tokenReference,
    });
    if (Number.isInteger(byReference) && byReference > 0) {
      return byReference;
    }
  }

  const providerPaymentId = String(
    detailPayload?.paymentId || detailPayload?.iyziReferenceCode || "",
  ).trim();
  if (providerPaymentId) {
    const byProviderPaymentId =
      await findPaymentIdByProviderPaymentId(providerPaymentId);
    if (Number.isInteger(byProviderPaymentId) && byProviderPaymentId > 0) {
      return byProviderPaymentId;
    }
  }

  return null;
}

router.get("/mock/checkout", async (req, res) => {
  const paymentId = parsePaymentId(req.query.paymentId);
  const plan = String(req.query.plan || "").trim();
  const token = String(req.query.token || "").trim();
  const safePlan = escapeHtml(plan || "-");

  if (!paymentId || !token) {
    return res
      .status(400)
      .send("<h1>Geçersiz ödeme</h1><p>paymentId ve token gerekli.</p>");
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock Ödeme - WCAGTR</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 2rem; line-height: 1.5; }
      button { min-height: 44px; min-width: 44px; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #ccc; cursor: pointer; }
      #status { margin-top: 1rem; font-weight: 600; }
    </style>
  </head>
  <body>
    <h1>Mock Ödeme Sayfası</h1>
    <p>Ödeme ID: <strong>${paymentId}</strong></p>
    <p>Plan: <strong>${safePlan}</strong></p>
    <button id="confirm-btn" type="button">Ödemeyi Onayla</button>
    <p id="status" aria-live="polite"></p>
    <script>
      const btn = document.getElementById("confirm-btn");
      const status = document.getElementById("status");
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        status.textContent = "Ödeme onaylanıyor...";
        const response = await fetch("/api/v1/payments/mock/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: ${paymentId}, token: ${JSON.stringify(token)} })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          status.textContent = data.error || "Ödeme onaylanamadı";
          btn.disabled = false;
          return;
        }
        status.textContent = "Ödeme onaylandı. Uygulamaya dönebilirsiniz.";
      });
    </script>
  </body>
</html>`);
});

router.post("/mock/confirm", async (req, res) => {
  try {
    const paymentId = parsePaymentId(req.body?.paymentId);
    const token = String(req.body?.token || "").trim();
    if (!paymentId) {
      return res.status(400).json({ error: "Geçersiz paymentId" });
    }
    if (!token) {
      return res.status(400).json({ error: "Ödeme doğrulama token'ı gerekli" });
    }

    const paymentCheck = await query(
      `SELECT id
       FROM payment_transactions
       WHERE id = $1
         AND provider = 'mock'
         AND provider_reference = $2`,
      [paymentId, token],
    );
    if (paymentCheck.rows.length === 0) {
      return res.status(403).json({ error: "Ödeme doğrulama token'ı geçersiz" });
    }

    const result = await markPaymentPaid({
      paymentId,
      providerPaymentId: `mock-${paymentId}-${Date.now()}`,
      providerReference: "mock-checkout-confirm",
      rawPayload: req.body || null,
    });

    if (!result.found) {
      return res.status(404).json({ error: "Ödeme kaydı bulunamadı" });
    }
    if (result.expired) {
      return res.status(410).json({ error: "Ödeme süresi dolduğu için işlenemedi" });
    }

    if (result.alreadyFinal) {
      return res.json({
        success: true,
        message: "Ödeme zaten son durumdaydı",
        status: result.payment.status,
      });
    }

    res.json({
      success: true,
      message: "Ödeme onaylandı",
      payment: result.payment,
      subscription: result.subscription,
    });
  } catch (error) {
    console.error("Mock payment confirm error:", error);
    res.status(500).json({ error: "Ödeme onaylanamadı" });
  }
});

router.post("/webhook/mock", async (req, res) => {
  try {
    const signatureHeader =
      req.headers["x-wcagtr-payment-signature"] ||
      req.headers["x-payment-signature"];
    if (!signatureHeader) {
      return res.status(401).json({ error: "Webhook imzası gerekli" });
    }

    const isValid = verifyPaymentWebhookSignature(req.body || {}, signatureHeader);
    if (!isValid) {
      return res.status(401).json({ error: "Webhook imzası geçersiz" });
    }

    const paymentId = parsePaymentId(req.body?.paymentId);
    if (!paymentId) {
      return res.status(400).json({ error: "Geçersiz paymentId" });
    }

    const status = String(req.body?.status || "").toLowerCase();
    if (status !== "paid") {
      return res
        .status(400)
        .json({ error: "Mock webhook şu an sadece paid durumunu destekler" });
    }

    const result = await markPaymentPaid({
      paymentId,
      providerPaymentId: req.body?.providerPaymentId || null,
      providerReference: req.body?.providerReference || "mock-webhook",
      rawPayload: req.body || null,
    });

    if (!result.found) {
      return res.status(404).json({ error: "Ödeme kaydı bulunamadı" });
    }
    if (result.expired) {
      return res.status(410).json({ error: "Ödeme süresi dolduğu için işlenemedi" });
    }

    res.json({
      success: true,
      message: result.alreadyFinal
        ? "Ödeme daha önce işlenmiş"
        : "Ödeme işlendi",
      payment: result.payment,
      subscription: result.subscription || null,
    });
  } catch (error) {
    console.error("Mock payment webhook error:", error);
    res.status(500).json({ error: "Webhook işlenemedi" });
  }
});

router.post("/webhook/stripe", async (req, res) => {
  try {
    const signatureHeader = req.headers["stripe-signature"];
    if (!signatureHeader) {
      return res.status(401).json({ error: "Stripe webhook imzası gerekli" });
    }

    const rawPayload =
      typeof req.rawBody === "string"
        ? req.rawBody
        : JSON.stringify(req.body || {});
    const isValid = verifyStripeWebhookSignature(rawPayload, signatureHeader);
    if (!isValid) {
      return res.status(401).json({ error: "Stripe webhook imzası geçersiz" });
    }

    const event = req.body || {};
    const eventType = String(event.type || "").trim().toLowerCase();
    const eventObject = event?.data?.object || {};
    if (!eventType || !eventObject || typeof eventObject !== "object") {
      return res.status(400).json({ error: "Geçersiz Stripe event formatı" });
    }

    const paymentId = await resolveStripePaymentId(eventObject);
    if (!paymentId) {
      return res.status(202).json({
        received: true,
        ignored: true,
        reason: "İlgili ödeme kaydı bulunamadı",
      });
    }

    if (eventType === "checkout.session.completed") {
      const paymentStatus = String(eventObject.payment_status || "")
        .trim()
        .toLowerCase();
      if (paymentStatus !== "paid") {
        return res.status(202).json({
          received: true,
          ignored: true,
          reason: `Ödeme tamamlanmadı (${paymentStatus || "unknown"})`,
        });
      }

      const result = await markPaymentPaid({
        paymentId,
        providerPaymentId: eventObject.payment_intent || null,
        providerReference: eventObject.id || null,
        rawPayload: event,
      });
      if (result.expired) {
        return res.status(410).json({
          received: true,
          processed: false,
          reason: "Ödeme süresi dolduğu için işlenemedi",
          payment: result.payment || null,
        });
      }
      return res.json({
        received: true,
        processed: true,
        payment: result.payment,
        subscription: result.subscription || null,
      });
    }

    if (
      eventType === "checkout.session.expired" ||
      eventType === "checkout.session.async_payment_failed"
    ) {
      const result = await markPaymentFailed({
        paymentId,
        providerPaymentId: eventObject.payment_intent || null,
        providerReference: eventObject.id || null,
        failureReason: eventType,
        rawPayload: event,
      });
      return res.json({
        received: true,
        processed: true,
        payment: result.payment,
      });
    }

    if (eventType === "charge.refunded") {
      const result = await markPaymentRefunded({
        paymentId,
        providerPaymentId: eventObject.payment_intent || null,
        providerReference: eventObject.id || null,
        rawPayload: event,
      });
      return res.json({
        received: true,
        processed: true,
        payment: result.payment,
      });
    }

    return res.status(202).json({
      received: true,
      ignored: true,
      reason: `Desteklenmeyen Stripe event: ${eventType}`,
    });
  } catch (error) {
    console.error("Stripe payment webhook error:", error);
    res.status(500).json({ error: "Stripe webhook işlenemedi" });
  }
});

router.all("/webhook/iyzico", async (req, res) => {
  try {
    const token = String(req.body?.token || req.query?.token || "").trim();
    const conversationId = String(
      req.body?.conversationId || req.query?.conversationId || "",
    ).trim();
    if (!token) {
      return res.status(400).json({ error: "iyzico callback token zorunlu" });
    }

    const detail = await retrieveIyzicoCheckoutResult({
      token,
      conversationId: conversationId || null,
    });

    const paymentId = await resolveIyzicoPaymentId(detail, token);
    if (!paymentId) {
      return res.status(202).json({
        received: true,
        ignored: true,
        reason: "İlgili ödeme kaydı bulunamadı",
      });
    }

    const explicitPaymentStatus = String(detail?.paymentStatus || "").toLowerCase();
    const apiStatus = String(detail?.status || "").toLowerCase();
    const paymentStatus = explicitPaymentStatus || apiStatus;
    const providerPaymentId = String(
      detail?.paymentId || detail?.iyziReferenceCode || "",
    ).trim();
    const isPaid = explicitPaymentStatus
      ? ["success", "paid", "completed"].includes(explicitPaymentStatus)
      : apiStatus === "success" && Boolean(providerPaymentId);

    if (isPaid) {
      const result = await markPaymentPaid({
        paymentId,
        providerPaymentId: providerPaymentId || null,
        providerReference: token,
        rawPayload: {
          callback: req.body || {},
          detail,
        },
      });
      if (result.expired) {
        return res.status(410).json({
          received: true,
          processed: false,
          reason: "Ödeme süresi dolduğu için işlenemedi",
          payment: result.payment || null,
        });
      }

      return res.json({
        received: true,
        processed: true,
        payment: result.payment,
        subscription: result.subscription || null,
      });
    }

    const result = await markPaymentFailed({
      paymentId,
      providerPaymentId: providerPaymentId || null,
      providerReference: token,
      failureReason: detail?.errorMessage || paymentStatus || "iyzico_payment_failed",
      rawPayload: {
        callback: req.body || {},
        detail,
      },
    });

    return res.json({
      received: true,
      processed: true,
      payment: result.payment,
      reason: detail?.errorMessage || paymentStatus || "iyzico_payment_failed",
    });
  } catch (error) {
    console.error("iyzico payment webhook error:", error);
    res.status(500).json({ error: "iyzico webhook işlenemedi" });
  }
});

export default router;
