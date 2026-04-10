import crypto from "crypto";
import { getClient, query } from "../config/database.js";
import { triggerWebhookEvent } from "./webhooks.js";

const ALLOWED_PAYMENT_PROVIDERS = new Set(["mock", "stripe", "iyzico"]);

function parsePlanRow(row) {
  return {
    code: row.code,
    name: row.name,
    priceMonthlyTry:
      row.price_monthly_try === null ? null : Number(row.price_monthly_try),
    intervalDays: Number(row.interval_days || 30),
    features: Array.isArray(row.features) ? row.features : [],
    isActive: Boolean(row.is_active),
    displayOrder: Number(row.display_order || 100),
    updatedAt: row.updated_at,
  };
}

export async function listBillingPlans({ includeInactive = false } = {}) {
  const result = await query(
    `SELECT code, name, price_monthly_try, interval_days, features, is_active, display_order, updated_at
     FROM billing_plans
     ${includeInactive ? "" : "WHERE is_active = true"}
     ORDER BY display_order ASC, code ASC`,
  );
  return result.rows.map(parsePlanRow);
}

export async function getBillingPlanByCode(code, { includeInactive = false } = {}) {
  const result = await query(
    `SELECT code, name, price_monthly_try, interval_days, features, is_active, display_order, updated_at
     FROM billing_plans
     WHERE code = $1
     ${includeInactive ? "" : "AND is_active = true"}
     LIMIT 1`,
    [code],
  );
  if (result.rows.length === 0) return null;
  return parsePlanRow(result.rows[0]);
}

export function resolvePaymentProvider() {
  const provider = String(process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (!ALLOWED_PAYMENT_PROVIDERS.has(provider)) {
    return "mock";
  }
  return provider;
}

export function getPaymentWebhookSecret() {
  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.TOKEN_SIGNING_KEY ||
    process.env.JWT_SECRET ||
    "";
  if (secret.length < 32) {
    throw new Error(
      "PAYMENT_WEBHOOK_SECRET / TOKEN_SIGNING_KEY / JWT_SECRET en az 32 karakter olmalı",
    );
  }
  return secret;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function resolveStripeReturnUrls() {
  const baseUrl = String(
    process.env.PAYMENT_CHECKOUT_BASE_URL || "http://localhost:3000",
  ).replace(/\/+$/, "");

  const fallbackSuccess = `${baseUrl}/customer-panel/#/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const fallbackCancel = `${baseUrl}/customer-panel/#/billing?payment=cancelled`;

  const rawSuccess = String(process.env.STRIPE_SUCCESS_URL || fallbackSuccess).trim();
  const rawCancel = String(process.env.STRIPE_CANCEL_URL || fallbackCancel).trim();

  const successUrl = rawSuccess.includes("{CHECKOUT_SESSION_ID}")
    ? rawSuccess
    : `${rawSuccess}${rawSuccess.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;

  return {
    successUrl,
    cancelUrl: rawCancel,
  };
}

function getStripeSecretKey() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY yapılandırılmalı");
  }
  return key;
}

function getStripeWebhookSecret() {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET yapılandırılmalı");
  }
  return secret;
}

function getIyzicoConfig() {
  const apiKey = String(process.env.IYZICO_API_KEY || "").trim();
  const secretKey = String(process.env.IYZICO_SECRET_KEY || "").trim();
  const baseUrl = String(
    process.env.IYZICO_API_BASE_URL || "https://sandbox-api.iyzipay.com",
  )
    .trim()
    .replace(/\/+$/, "");

  if (!apiKey || !secretKey) {
    throw new Error("IYZICO_API_KEY ve IYZICO_SECRET_KEY yapılandırılmalı");
  }

  return { apiKey, secretKey, baseUrl };
}

function buildIyzicoAuthorization({ apiKey, secretKey, requestPath, requestBody }) {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1000000)}`;
  const payload = `${randomKey}${requestPath}${requestBody || ""}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");
  const authData = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  const encoded = Buffer.from(authData, "utf8").toString("base64");

  return {
    authorization: `IYZWSv2 ${encoded}`,
    randomKey,
  };
}

async function iyzicoPost({
  requestPath,
  payload,
  allowFailureStatus = false,
}) {
  const { apiKey, secretKey, baseUrl } = getIyzicoConfig();
  const requestBody = JSON.stringify(payload || {});
  const { authorization, randomKey } = buildIyzicoAuthorization({
    apiKey,
    secretKey,
    requestPath,
    requestBody,
  });

  const response = await fetch(`${baseUrl}${requestPath}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "x-iyzi-rnd": randomKey,
      "x-iyzi-client-version": "wcagtr-backend/1.0",
      "Content-Type": "application/json",
    },
    body: requestBody,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const reason =
      data?.errorMessage || data?.errorCode || data?.message || `HTTP ${response.status}`;
    throw new Error(`iyzico isteği başarısız: ${reason}`);
  }

  if (
    !allowFailureStatus &&
    String(data?.status || "").toLowerCase() !== "success"
  ) {
    const reason = data?.errorMessage || data?.errorCode || "unknown_error";
    throw new Error(`iyzico yanıtı başarısız: ${reason}`);
  }

  return data;
}

function resolveIyzicoCallbackUrl() {
  const explicit = String(process.env.IYZICO_CALLBACK_URL || "").trim();
  if (explicit) return explicit;

  const baseUrl = String(
    process.env.PAYMENT_CHECKOUT_BASE_URL || "http://localhost:3000",
  ).replace(/\/+$/, "");
  return `${baseUrl}/api/v1/payments/webhook/iyzico`;
}

function toIyzicoMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("iyzico için geçersiz tutar");
  }
  return amount.toFixed(2);
}

function splitBuyerName(companyName, fallbackEmail) {
  const source = String(companyName || "").trim() || String(fallbackEmail || "").trim();
  if (!source) {
    return { name: "WCAGTR", surname: "Musteri" };
  }

  const cleaned = source.replace(/\s+/g, " ").trim();
  const [first, ...rest] = cleaned.split(" ");
  return {
    name: first || "WCAGTR",
    surname: rest.join(" ") || "Musteri",
  };
}

async function createIyzicoCheckoutSession({ paymentId, plan, customerId }) {
  const customerResult = await query(
    `SELECT id, email, company_name, created_at
     FROM customers
     WHERE id = $1
     LIMIT 1`,
    [customerId],
  );
  if (customerResult.rows.length === 0) {
    throw new Error("iyzico checkout için müşteri bulunamadı");
  }

  const customer = customerResult.rows[0];
  const amount = toIyzicoMoney(plan.priceMonthlyTry);
  const callbackUrl = resolveIyzicoCallbackUrl();
  const { name, surname } = splitBuyerName(customer.company_name, customer.email);
  const address = String(process.env.IYZICO_DEFAULT_ADDRESS || "Maslak Mah. Teknoloji Cad. No:1");
  const city = String(process.env.IYZICO_DEFAULT_CITY || "Istanbul");
  const country = String(process.env.IYZICO_DEFAULT_COUNTRY || "Turkey");
  const zipCode = String(process.env.IYZICO_DEFAULT_ZIP_CODE || "34000");
  const gsmNumber = String(process.env.IYZICO_DEFAULT_GSM || "+905350000000");
  const identityNumber = String(
    process.env.IYZICO_DEFAULT_IDENTITY_NUMBER || "11111111111",
  );
  const ipAddress = String(process.env.IYZICO_DEFAULT_BUYER_IP || "85.34.78.112");

  const payload = {
    locale: "tr",
    conversationId: String(paymentId),
    price: amount,
    paidPrice: amount,
    currency: "TRY",
    basketId: `wcagtr-plan-${plan.code}-${paymentId}`,
    paymentGroup: "SUBSCRIPTION",
    callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: String(customer.id),
      name,
      surname,
      gsmNumber,
      email: customer.email,
      identityNumber,
      registrationAddress: address,
      city,
      country,
      zipCode,
      ip: ipAddress,
    },
    shippingAddress: {
      contactName: `${name} ${surname}`.trim(),
      city,
      country,
      address,
      zipCode,
    },
    billingAddress: {
      contactName: `${name} ${surname}`.trim(),
      city,
      country,
      address,
      zipCode,
    },
    basketItems: [
      {
        id: `plan-${plan.code}`,
        name: `${plan.name} Plani`,
        category1: "SaaS",
        itemType: "VIRTUAL",
        price: amount,
      },
    ],
  };

  const data = await iyzicoPost({
    requestPath: "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    payload,
  });

  const checkoutUrl = String(data?.paymentPageUrl || "").trim();
  const providerReference = String(data?.token || "").trim();
  if (!checkoutUrl || !providerReference) {
    throw new Error("iyzico checkout yanıtı eksik (paymentPageUrl/token)");
  }

  return {
    checkoutUrl,
    providerReference,
  };
}

export async function retrieveIyzicoCheckoutResult({
  token,
  conversationId = null,
}) {
  const safeToken = String(token || "").trim();
  if (!safeToken) {
    throw new Error("iyzico sonuç sorgusu için token gerekli");
  }

  const payload = {
    locale: "tr",
    token: safeToken,
    ...(conversationId ? { conversationId: String(conversationId) } : {}),
  };

  return iyzicoPost({
    requestPath: "/payment/iyzipos/checkoutform/auth/ecom/detail",
    payload,
    allowFailureStatus: true,
  });
}

export function createPaymentWebhookSignature(payload) {
  const secret = getPaymentWebhookSecret();
  const canonical = stableStringify(payload);
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

export function verifyPaymentWebhookSignature(payload, signatureHeader) {
  const expected = createPaymentWebhookSignature(payload);
  const actualRaw = String(signatureHeader || "").trim().toLowerCase();
  const actual = actualRaw.startsWith("sha256=")
    ? actualRaw.substring("sha256=".length)
    : actualRaw;

  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(actual, "utf8"),
    Buffer.from(expected, "utf8"),
  );
}

function toPositiveInt(value) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function createPaymentTransaction({ customerId, plan, provider }) {
  const customer = toPositiveInt(customerId);
  if (!customer) {
    throw new Error("Geçersiz customerId");
  }

  const amount = plan.priceMonthlyTry;
  const paymentProvider = String(provider || resolvePaymentProvider());
  const initialProviderReference =
    paymentProvider === "mock" ? crypto.randomUUID() : null;

  const insert = await query(
    `INSERT INTO payment_transactions (
       customer_id, plan_code, provider, amount_try, currency, status, provider_reference, expires_at
     ) VALUES ($1, $2, $3, $4, 'TRY', 'pending', $5, NOW() + INTERVAL '30 minutes')
     RETURNING id, status, amount_try, currency, provider_reference, created_at, expires_at`,
    [customer, plan.code, paymentProvider, amount, initialProviderReference],
  );

  const payment = insert.rows[0];
  let checkout;
  try {
    checkout = await createCheckoutSessionForProvider({
      provider: paymentProvider,
      paymentId: payment.id,
      planCode: plan.code,
      plan,
      customerId: customer,
      providerReference: payment.provider_reference,
    });
  } catch (error) {
    await query(
      `UPDATE payment_transactions
       SET status = 'failed',
           failure_reason = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [String(error?.message || "checkout_create_failed"), payment.id],
    );
    throw error;
  }
  const checkoutUrl = checkout.checkoutUrl;
  const finalProviderReference =
    checkout.providerReference || payment.provider_reference || null;

  const updated = await query(
    `UPDATE payment_transactions
     SET checkout_url = $1,
         provider_reference = COALESCE($2, provider_reference),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id, customer_id, plan_code, provider, amount_try, currency, status, checkout_url, provider_reference, created_at, expires_at`,
    [checkoutUrl, finalProviderReference, payment.id],
  );

  return updated.rows[0];
}

async function createCheckoutSessionForProvider({
  provider,
  paymentId,
  planCode,
  plan,
  customerId,
  providerReference,
}) {
  if (provider === "mock") {
    return {
      checkoutUrl: buildMockCheckoutUrl({
        paymentId,
        planCode,
        providerReference,
      }),
      providerReference,
    };
  }

  if (provider === "stripe") {
    return createStripeCheckoutSession({
      paymentId,
      plan,
      customerId,
    });
  }

  if (provider === "iyzico") {
    return createIyzicoCheckoutSession({
      paymentId,
      plan,
      customerId,
    });
  }

  throw new Error(`Desteklenmeyen ödeme sağlayıcısı: ${provider}`);
}

function buildMockCheckoutUrl({ paymentId, planCode, providerReference }) {
  const baseUrl = String(
    process.env.PAYMENT_CHECKOUT_BASE_URL || "http://localhost:3000",
  ).replace(/\/+$/, "");

  return `${baseUrl}/api/v1/payments/mock/checkout?paymentId=${encodeURIComponent(String(paymentId))}&plan=${encodeURIComponent(planCode)}&token=${encodeURIComponent(String(providerReference || ""))}`;
}

async function createStripeCheckoutSession({ paymentId, plan, customerId }) {
  const stripeSecretKey = getStripeSecretKey();
  const amountMajor = Number(plan.priceMonthlyTry);
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    throw new Error("Stripe için geçersiz plan tutarı");
  }

  const amountMinor = Math.round(amountMajor * 100);
  const { successUrl, cancelUrl } = resolveStripeReturnUrls();

  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", successUrl);
  form.set("cancel_url", cancelUrl);
  form.set("client_reference_id", String(paymentId));
  form.set("metadata[paymentId]", String(paymentId));
  form.set("metadata[planCode]", String(plan.code));
  form.set("metadata[customerId]", String(customerId));
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", "try");
  form.set("line_items[0][price_data][unit_amount]", String(amountMinor));
  form.set("line_items[0][price_data][product_data][name]", `${plan.name} Planı`);
  form.set(
    "line_items[0][price_data][product_data][description]",
    "WCAGTR erişilebilirlik platformu aylık abonelik ödemesi",
  );

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const reason =
      payload?.error?.message ||
      payload?.message ||
      `HTTP ${response.status}`;
    throw new Error(`Stripe checkout oluşturulamadı: ${reason}`);
  }

  const providerReference = String(payload?.id || "").trim();
  const checkoutUrl = String(payload?.url || "").trim();

  if (!providerReference || !checkoutUrl) {
    throw new Error("Stripe checkout yanıtı eksik");
  }

  return {
    checkoutUrl,
    providerReference,
  };
}

export function verifyStripeWebhookSignature(rawPayload, signatureHeader) {
  const secret = getStripeWebhookSecret();
  const raw = String(rawPayload || "");
  const header = String(signatureHeader || "").trim();
  if (!header) return false;

  let timestamp = "";
  const signatures = [];

  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=");
    if (!key || !value) continue;
    if (key === "t") {
      timestamp = value;
      continue;
    }
    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const toleranceRaw = Number.parseInt(
    String(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS || "300"),
    10,
  );
  const tolerance = Number.isInteger(toleranceRaw) && toleranceRaw > 0 ? toleranceRaw : 300;
  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isInteger(timestampSeconds)) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    return false;
  }

  const signedPayload = `${timestamp}.${raw}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signatures.some((candidate) => {
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(candidate, "utf8"),
      Buffer.from(expected, "utf8"),
    );
  });
}

export async function markPaymentPaid({
  paymentId,
  providerPaymentId = null,
  providerReference = null,
  rawPayload = null,
}) {
  const id = toPositiveInt(paymentId);
  if (!id) {
    return { found: false, alreadyFinal: false };
  }

  const client = await getClient();
  let paid = null;
  let updatedCustomer = null;
  let plan = null;
  let previousPlan = null;

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `SELECT id, customer_id, plan_code, status, expires_at, raw_payload
       FROM payment_transactions
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { found: false, alreadyFinal: false };
    }

    const payment = paymentResult.rows[0];
    if (["paid", "failed", "cancelled", "refunded"].includes(payment.status)) {
      await client.query("COMMIT");
      return { found: true, alreadyFinal: true, payment };
    }

    const expiresAt = payment.expires_at ? new Date(payment.expires_at) : null;
    const now = new Date();
    if (
      expiresAt &&
      !Number.isNaN(expiresAt.getTime()) &&
      expiresAt.getTime() <= now.getTime()
    ) {
      const failedResult = await client.query(
        `UPDATE payment_transactions
         SET status = 'failed',
             failure_reason = COALESCE(failure_reason, 'payment_expired'),
             provider_payment_id = COALESCE($1, provider_payment_id),
             provider_reference = COALESCE($2, provider_reference),
             raw_payload = COALESCE($3::jsonb, raw_payload),
             updated_at = NOW()
         WHERE id = $4
         RETURNING id, status, failure_reason, updated_at`,
        [
          providerPaymentId || null,
          providerReference || null,
          rawPayload ? JSON.stringify(rawPayload) : null,
          id,
        ],
      );
      await client.query("COMMIT");
      return {
        found: true,
        alreadyFinal: false,
        expired: true,
        payment: failedResult.rows[0],
      };
    }

    const planResult = await client.query(
      `SELECT code, name, interval_days
       FROM billing_plans
       WHERE code = $1
       LIMIT 1`,
      [payment.plan_code],
    );
    if (planResult.rows.length === 0) {
      throw new Error("Ödenen plan bulunamadı");
    }
    plan = {
      code: planResult.rows[0].code,
      name: planResult.rows[0].name,
      intervalDays: Number(planResult.rows[0].interval_days || 30),
    };

    const currentCustomerResult = await client.query(
      `SELECT id, subscription_plan, subscription_status, subscription_expires_at
       FROM customers
       WHERE id = $1
       FOR UPDATE`,
      [payment.customer_id],
    );
    if (currentCustomerResult.rows.length === 0) {
      throw new Error("Müşteri bulunamadı");
    }
    const customerBeforePayment = currentCustomerResult.rows[0];
    previousPlan = customerBeforePayment.subscription_plan;

    const mergedRawPayload = {
      ...(payment.raw_payload && typeof payment.raw_payload === "object"
        ? payment.raw_payload
        : {}),
      ...(rawPayload && typeof rawPayload === "object"
        ? { providerPayload: rawPayload }
        : {}),
      entitlementSnapshotBeforePayment: {
        plan: customerBeforePayment.subscription_plan,
        status: customerBeforePayment.subscription_status,
        expiresAt: customerBeforePayment.subscription_expires_at,
      },
    };

    const updatePayment = await client.query(
      `UPDATE payment_transactions
       SET status = 'paid',
           paid_at = NOW(),
           provider_payment_id = COALESCE($1, provider_payment_id),
           provider_reference = COALESCE($2, provider_reference),
           raw_payload = $3::jsonb,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, customer_id, plan_code, status, paid_at`,
      [
        providerPaymentId || null,
        providerReference || null,
        JSON.stringify(mergedRawPayload),
        id,
      ],
    );
    paid = updatePayment.rows[0];

    const customerResult = await client.query(
      `UPDATE customers
       SET subscription_plan = $1,
           subscription_status = 'active',
           subscription_expires_at = CASE
             WHEN subscription_expires_at IS NULL OR subscription_expires_at < NOW()
               THEN NOW() + ($2 * INTERVAL '1 day')
             ELSE subscription_expires_at + ($2 * INTERVAL '1 day')
           END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, subscription_plan, subscription_status, subscription_expires_at`,
      [plan.code, plan.intervalDays, paid.customer_id],
    );
    updatedCustomer = customerResult.rows[0];

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  try {
    await triggerWebhookEvent({
      customerId: paid.customer_id,
      eventType: "billing.plan_changed",
      payload: {
        customerId: paid.customer_id,
        previousPlan,
        newPlan: updatedCustomer.subscription_plan,
        status: updatedCustomer.subscription_status,
        expiresAt: updatedCustomer.subscription_expires_at,
        paymentId: paid.id,
      },
    });
  } catch (webhookError) {
    console.error("Payment plan webhook notify error:", webhookError);
  }

  return {
    found: true,
    alreadyFinal: false,
    payment: paid,
    subscription: {
      plan: updatedCustomer.subscription_plan,
      status: updatedCustomer.subscription_status,
      expiresAt: updatedCustomer.subscription_expires_at,
      planName: plan.name,
    },
  };
}

export async function markPaymentFailed({
  paymentId,
  providerPaymentId = null,
  providerReference = null,
  failureReason = null,
  rawPayload = null,
}) {
  const id = toPositiveInt(paymentId);
  if (!id) {
    return { found: false, alreadyFinal: false };
  }

  const paymentResult = await query(
    `SELECT id, status
     FROM payment_transactions
     WHERE id = $1`,
    [id],
  );
  if (paymentResult.rows.length === 0) {
    return { found: false, alreadyFinal: false };
  }

  const current = paymentResult.rows[0];
  if (["paid", "failed", "cancelled", "refunded"].includes(current.status)) {
    return { found: true, alreadyFinal: true, payment: current };
  }

  const updateResult = await query(
    `UPDATE payment_transactions
     SET status = 'failed',
         failure_reason = COALESCE($1, failure_reason),
         provider_payment_id = COALESCE($2, provider_payment_id),
         provider_reference = COALESCE($3, provider_reference),
         raw_payload = COALESCE($4::jsonb, raw_payload),
         updated_at = NOW()
     WHERE id = $5
     RETURNING id, status, provider_payment_id, provider_reference, failure_reason, updated_at`,
    [
      failureReason || null,
      providerPaymentId || null,
      providerReference || null,
      rawPayload ? JSON.stringify(rawPayload) : null,
      id,
    ],
  );

  return {
    found: true,
    alreadyFinal: false,
    payment: updateResult.rows[0],
  };
}

export async function markPaymentRefunded({
  paymentId,
  providerPaymentId = null,
  providerReference = null,
  rawPayload = null,
}) {
  const id = toPositiveInt(paymentId);
  if (!id) {
    return { found: false, alreadyFinal: false };
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `SELECT id, customer_id, status, raw_payload
       FROM payment_transactions
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { found: false, alreadyFinal: false };
    }

    const current = paymentResult.rows[0];
    if (["failed", "cancelled", "refunded"].includes(current.status)) {
      await client.query("COMMIT");
      return { found: true, alreadyFinal: true, payment: current };
    }

    const existingRawPayload =
      current.raw_payload && typeof current.raw_payload === "object"
        ? current.raw_payload
        : {};
    const mergedRawPayload = {
      ...existingRawPayload,
      ...(rawPayload && typeof rawPayload === "object"
        ? { refundPayload: rawPayload }
        : {}),
    };

    const updateResult = await client.query(
      `UPDATE payment_transactions
       SET status = 'refunded',
           provider_payment_id = COALESCE($1, provider_payment_id),
           provider_reference = COALESCE($2, provider_reference),
           raw_payload = $3::jsonb,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, customer_id, status, provider_payment_id, provider_reference, updated_at`,
      [
        providerPaymentId || null,
        providerReference || null,
        JSON.stringify(mergedRawPayload),
        id,
      ],
    );

    if (current.status === "paid") {
      const snapshot = existingRawPayload.entitlementSnapshotBeforePayment;
      if (snapshot && snapshot.plan) {
        await client.query(
          `UPDATE customers
           SET subscription_plan = $1,
               subscription_status = $2,
               subscription_expires_at = $3,
               updated_at = NOW()
           WHERE id = $4`,
          [
            String(snapshot.plan),
            String(snapshot.status || "active"),
            snapshot.expiresAt || null,
            updateResult.rows[0].customer_id,
          ],
        );
      } else {
        await client.query(
          `UPDATE customers
           SET subscription_status = 'inactive',
               subscription_expires_at = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [updateResult.rows[0].customer_id],
        );
      }
    }

    await client.query("COMMIT");
    return {
      found: true,
      alreadyFinal: false,
      payment: updateResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findPaymentIdByProviderReference({
  provider,
  providerReference,
}) {
  const normalizedProvider = String(provider || "").trim().toLowerCase();
  const reference = String(providerReference || "").trim();
  if (!normalizedProvider || !reference) return null;

  const result = await query(
    `SELECT id
     FROM payment_transactions
     WHERE provider = $1
       AND provider_reference = $2
     ORDER BY id DESC
     LIMIT 1`,
    [normalizedProvider, reference],
  );
  if (result.rows.length === 0) return null;
  return Number(result.rows[0].id);
}

export async function findPaymentIdByProviderPaymentId(providerPaymentId) {
  const providerId = String(providerPaymentId || "").trim();
  if (!providerId) return null;

  const result = await query(
    `SELECT id
     FROM payment_transactions
     WHERE provider_payment_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [providerId],
  );
  if (result.rows.length === 0) return null;
  return Number(result.rows[0].id);
}

export async function listCustomerPayments(customerId, limit = 20) {
  const customer = toPositiveInt(customerId);
  if (!customer) return [];

  const safeLimit = Math.min(Math.max(toPositiveInt(limit) || 20, 1), 100);

  const result = await query(
    `SELECT id, plan_code, provider, amount_try, currency, status, checkout_url, paid_at, failure_reason, created_at
     FROM payment_transactions
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [customer, safeLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    planCode: row.plan_code,
    provider: row.provider,
    amountTry: row.amount_try === null ? null : Number(row.amount_try),
    currency: row.currency,
    status: row.status,
    checkoutUrl: row.checkout_url,
    paidAt: row.paid_at,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
  }));
}
