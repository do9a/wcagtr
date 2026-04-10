import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { createPatchSignature } from "../utils/patchSignature.js";
import { triggerWebhookEvent } from "../services/webhooks.js";
import {
  createPaymentTransaction,
  getBillingPlanByCode,
  listBillingPlans,
  listCustomerPayments,
  markPaymentPaid,
  resolvePaymentProvider,
} from "../services/billing.js";
import { canUseServerPatch } from "../utils/planEntitlements.js";

const router = express.Router();

router.use(authMiddleware);
router.use(customerOnly);

function customerOnly(req, res, next) {
  if (req.user?.role !== "customer" || !req.user?.customerId) {
    return res.status(403).json({ error: "Müşteri erişimi gerekli" });
  }
  next();
}

function parsePositiveInt(value, fallback, min = 1, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}

function buildPatchFromFix(fix) {
  if (fix.fix_type === "css" && fix.css_patch) {
    return {
      patchType: "css",
      patchContent: fix.css_patch,
    };
  }

  if (fix.fix_type === "html" && fix.html_patch) {
    return {
      patchType: "html",
      patchContent: fix.html_patch,
    };
  }

  return null;
}

function toNumber(value) {
  return Number(value || 0);
}

async function getCustomerPatchEntitlement(customerId) {
  const result = await query(
    `SELECT c.subscription_plan, bp.features
     FROM customers c
     LEFT JOIN billing_plans bp ON bp.code = c.subscription_plan
     WHERE c.id = $1
     LIMIT 1`,
    [customerId],
  );

  if (result.rows.length === 0) {
    return false;
  }
  const row = result.rows[0];
  return canUseServerPatch(row.subscription_plan, row.features);
}

router.get("/scans", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 20, 1, 100);
    const offset = (page - 1) * limit;

    const totalResult = await query(
      `SELECT COUNT(*) AS total
       FROM scans s
       JOIN domains d ON d.id = s.domain_id
       WHERE d.customer_id = $1`,
      [req.user.customerId],
    );

    const scansResult = await query(
      `SELECT
         s.id,
         s.url,
         s.total_violations,
         s.wcag_level,
         s.tr_compliance_score,
         s.created_at,
         d.domain,
         COUNT(f.id) FILTER (WHERE f.approval_status = 'pending') AS pending_fix_count,
         COUNT(f.id) AS total_fix_count
       FROM scans s
       JOIN domains d ON d.id = s.domain_id
       LEFT JOIN violations v ON v.scan_id = s.id
       LEFT JOIN fixes f ON f.violation_id = v.id
       WHERE d.customer_id = $1
       GROUP BY s.id, d.domain
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.customerId, limit, offset],
    );

    res.json({
      scans: scansResult.rows.map((row) => ({
        ...row,
        pending_fix_count: Number(row.pending_fix_count || 0),
        total_fix_count: Number(row.total_fix_count || 0),
      })),
      total: Number(totalResult.rows[0].total || 0),
      page,
      limit,
    });
  } catch (error) {
    console.error("Customer scans list error:", error);
    res.status(500).json({ error: "Tarama listesi alınamadı" });
  }
});

router.get("/scans/:id", async (req, res) => {
  try {
    const scanId = parsePositiveInt(
      req.params.id,
      NaN,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    if (!Number.isInteger(scanId)) {
      return res.status(400).json({ error: "Geçersiz tarama ID" });
    }

    const scanResult = await query(
      `SELECT
         s.id,
         s.url,
         s.scan_type,
         s.total_violations,
         s.critical_count,
         s.major_count,
         s.minor_count,
         s.wcag_level,
         s.tr_compliance_score,
         s.scan_duration_ms,
         s.created_at,
         d.domain
       FROM scans s
       JOIN domains d ON d.id = s.domain_id
       WHERE s.id = $1
         AND d.customer_id = $2
       LIMIT 1`,
      [scanId, req.user.customerId],
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ error: "Tarama bulunamadı" });
    }

    const [violationsResult, severityResult] = await Promise.all([
      query(
        `SELECT
           v.id,
           v.wcag_criterion,
           v.severity,
           v.violation_type,
           v.element_selector,
           v.description,
           v.recommendation,
           COUNT(f.id) AS total_fixes,
           COUNT(f.id) FILTER (WHERE f.approval_status = 'pending') AS pending_fixes,
           COUNT(f.id) FILTER (WHERE f.approval_status = 'approved') AS approved_fixes,
           COUNT(f.id) FILTER (WHERE f.approval_status = 'rejected') AS rejected_fixes
         FROM violations v
         LEFT JOIN fixes f ON f.violation_id = v.id
         WHERE v.scan_id = $1
         GROUP BY
           v.id,
           v.wcag_criterion,
           v.severity,
           v.violation_type,
           v.element_selector,
           v.description,
           v.recommendation
         ORDER BY
           CASE v.severity
             WHEN 'critical' THEN 1
             WHEN 'major' THEN 2
             WHEN 'minor' THEN 3
             ELSE 4
           END,
           v.id ASC`,
        [scanId],
      ),
      query(
        `SELECT
           severity,
           COUNT(*) AS total
         FROM violations
         WHERE scan_id = $1
         GROUP BY severity`,
        [scanId],
      ),
    ]);

    res.json({
      scan: {
        ...scanResult.rows[0],
        total_violations: Number(scanResult.rows[0].total_violations || 0),
        critical_count: Number(scanResult.rows[0].critical_count || 0),
        major_count: Number(scanResult.rows[0].major_count || 0),
        minor_count: Number(scanResult.rows[0].minor_count || 0),
        tr_compliance_score:
          scanResult.rows[0].tr_compliance_score === null
            ? null
            : Number(scanResult.rows[0].tr_compliance_score),
      },
      violations: violationsResult.rows.map((row) => ({
        id: row.id,
        wcag_criterion: row.wcag_criterion,
        severity: row.severity,
        violation_type: row.violation_type,
        element_selector: row.element_selector,
        description: row.description,
        recommendation: row.recommendation,
        total_fixes: Number(row.total_fixes || 0),
        pending_fixes: Number(row.pending_fixes || 0),
        approved_fixes: Number(row.approved_fixes || 0),
        rejected_fixes: Number(row.rejected_fixes || 0),
      })),
      severityBreakdown: severityResult.rows.map((row) => ({
        severity: row.severity,
        total: Number(row.total || 0),
      })),
    });
  } catch (error) {
    console.error("Customer scan detail fetch error:", error);
    res.status(500).json({ error: "Tarama detayı alınamadı" });
  }
});

router.get("/scans/:id/fixes", async (req, res) => {
  try {
    const scanId = parsePositiveInt(
      req.params.id,
      NaN,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    if (!Number.isInteger(scanId)) {
      return res.status(400).json({ error: "Geçersiz tarama ID" });
    }

    const status = String(req.query.status || "pending").toLowerCase();
    const validStatuses = new Set(["pending", "approved", "rejected", "all"]);
    if (!validStatuses.has(status)) {
      return res
        .status(400)
        .json({
          error: "Geçersiz status. pending|approved|rejected|all olmalı",
        });
    }

    const statusFilterSql =
      status === "all" ? "" : "AND f.approval_status = $3";
    const params =
      status === "all"
        ? [scanId, req.user.customerId]
        : [scanId, req.user.customerId, status];

    const fixesResult = await query(
      `SELECT
         f.id,
         f.fix_type,
         f.fix_method,
         f.css_patch,
         f.html_patch,
         f.approval_status,
         f.ai_confidence,
         f.ai_reasoning,
         f.created_at,
         v.wcag_criterion,
         v.severity,
         v.violation_type,
         v.element_selector,
         v.description,
         v.recommendation
       FROM fixes f
       JOIN violations v ON v.id = f.violation_id
       JOIN scans s ON s.id = v.scan_id
       JOIN domains d ON d.id = s.domain_id
       WHERE s.id = $1
         AND d.customer_id = $2
         ${statusFilterSql}
       ORDER BY f.created_at DESC`,
      params,
    );

    res.json({
      scanId,
      status,
      total: fixesResult.rows.length,
      fixes: fixesResult.rows,
    });
  } catch (error) {
    console.error("Customer fixes fetch error:", error);
    res.status(500).json({ error: "Fix listesi alınamadı" });
  }
});

router.patch("/fixes/:id/approval", async (req, res) => {
  try {
    const fixId = parsePositiveInt(
      req.params.id,
      NaN,
      1,
      Number.MAX_SAFE_INTEGER,
    );
    if (!Number.isInteger(fixId)) {
      return res.status(400).json({ error: "Geçersiz fix ID" });
    }

    const status = String(req.body?.status || "").toLowerCase();
    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ error: "status alanı approved veya rejected olmalı" });
    }

    const fixResult = await query(
      `SELECT
         f.id,
         f.fix_type,
         f.css_patch,
         f.html_patch,
         f.approval_status,
         d.id AS domain_id,
         d.server_patch_enabled
       FROM fixes f
       JOIN violations v ON v.id = f.violation_id
       JOIN scans s ON s.id = v.scan_id
       JOIN domains d ON d.id = s.domain_id
       WHERE f.id = $1
         AND d.customer_id = $2`,
      [fixId, req.user.customerId],
    );

    if (fixResult.rows.length === 0) {
      return res.status(404).json({ error: "Fix bulunamadı" });
    }

    await query(
      `UPDATE fixes
       SET approval_status = $1
       WHERE id = $2`,
      [status, fixId],
    );

    const fixData = fixResult.rows[0];
    let queuedPatch = false;
    const patchEntitled = await getCustomerPatchEntitlement(req.user.customerId);

    if (status === "approved" && fixData.server_patch_enabled && patchEntitled) {
      const patch = buildPatchFromFix(fixData);
      if (patch) {
        const signature = createPatchSignature(
          fixData.domain_id,
          patch.patchType,
          patch.patchContent,
        );

        const patchInsertResult = await query(
          `INSERT INTO patches (domain_id, fix_id, patch_content, patch_signature, file_path, patch_type, delivery_status)
           SELECT $1, $2, $3, $4, NULL, $5, 'pending'
           WHERE NOT EXISTS (
             SELECT 1
             FROM patches
             WHERE fix_id = $2
               AND delivery_status IN ('pending', 'delivered', 'applied')
           )`,
          [
            fixData.domain_id,
            fixId,
            patch.patchContent,
            signature,
            patch.patchType,
          ],
        );

        queuedPatch = patchInsertResult.rowCount > 0;
      }
    }

    if (status === "approved") {
      try {
        await triggerWebhookEvent({
          customerId: req.user.customerId,
          eventType: "fix.approved",
          payload: {
            fixId,
            domainId: fixData.domain_id,
            approvalStatus: status,
            queuedPatch,
          },
        });
      } catch (webhookError) {
        console.error("Fix approval webhook notify error:", webhookError);
      }
    }

    res.json({
      success: true,
      fixId,
      approvalStatus: status,
      queuedPatch,
      patchEntitled,
    });
  } catch (error) {
    console.error("Fix approval update error:", error);
    res.status(500).json({ error: "Fix onayı güncellenemedi" });
  }
});

router.get("/customer/billing/plans", async (req, res) => {
  try {
    const plans = await listBillingPlans({ includeInactive: false });
    res.json({
      plans,
      currency: "TRY",
    });
  } catch (error) {
    console.error("Billing plans fetch error:", error);
    res.status(500).json({ error: "Plan listesi alınamadı" });
  }
});

router.get("/customer/billing", async (req, res) => {
  try {
    const customerResult = await query(
      `SELECT
         id,
         email,
         company_name,
         subscription_plan,
         subscription_status,
         subscription_expires_at,
         created_at
       FROM customers
       WHERE id = $1`,
      [req.user.customerId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Müşteri bulunamadı" });
    }

    const usageResult = await query(
      `SELECT
         (SELECT COUNT(*)
          FROM domains
          WHERE customer_id = $1) AS total_domains,
         (SELECT COUNT(*)
          FROM domains
          WHERE customer_id = $1 AND is_active = true) AS active_domains,
         (SELECT COUNT(*)
          FROM scans s
          JOIN domains d ON d.id = s.domain_id
          WHERE d.customer_id = $1) AS total_scans,
         (SELECT COUNT(*)
          FROM scans s
          JOIN domains d ON d.id = s.domain_id
          WHERE d.customer_id = $1
            AND s.created_at >= NOW() - INTERVAL '30 days') AS scans_last_30_days,
         (SELECT COALESCE(SUM(s.total_violations), 0)
           FROM scans s
           JOIN domains d ON d.id = s.domain_id
           WHERE d.customer_id = $1
             AND s.created_at >= NOW() - INTERVAL '30 days') AS violations_last_30_days`,
      [req.user.customerId],
    );

    const customer = customerResult.rows[0];
    const usage = usageResult.rows[0];
    const plan = await getBillingPlanByCode(customer.subscription_plan, {
      includeInactive: true,
    });

    res.json({
      subscription: {
        plan: customer.subscription_plan,
        planName: plan?.name || customer.subscription_plan,
        status: customer.subscription_status,
        expiresAt: customer.subscription_expires_at,
        customerSince: customer.created_at,
      },
      customer: {
        id: customer.id,
        email: customer.email,
        companyName: customer.company_name,
      },
      usage: {
        totalDomains: toNumber(usage.total_domains),
        activeDomains: toNumber(usage.active_domains),
        totalScans: toNumber(usage.total_scans),
        scansLast30Days: toNumber(usage.scans_last_30_days),
        violationsLast30Days: toNumber(usage.violations_last_30_days),
      },
    });
  } catch (error) {
    console.error("Billing summary fetch error:", error);
    res.status(500).json({ error: "Billing bilgileri alınamadı" });
  }
});

router.get("/customer/billing/payments", async (req, res) => {
  try {
    const limit = parsePositiveInt(req.query.limit, 20, 1, 100);
    const payments = await listCustomerPayments(req.user.customerId, limit);
    res.json({ payments });
  } catch (error) {
    console.error("Billing payments fetch error:", error);
    res.status(500).json({ error: "Ödeme geçmişi alınamadı" });
  }
});

router.post("/customer/billing/upgrade", async (req, res) => {
  try {
    const planCode = String(req.body?.plan || "").toLowerCase();
    const selectedPlan = await getBillingPlanByCode(planCode, {
      includeInactive: false,
    });

    if (!selectedPlan) {
      return res.status(400).json({ error: "Geçersiz plan seçimi" });
    }

    if (selectedPlan.priceMonthlyTry === null) {
      return res.status(400).json({
        error: "Enterprise plan için lütfen satış ekibiyle iletişime geçin",
      });
    }

    const currentCustomerResult = await query(
      `SELECT id, subscription_plan
       FROM customers
       WHERE id = $1`,
      [req.user.customerId],
    );
    if (currentCustomerResult.rows.length === 0) {
      return res.status(404).json({ error: "Müşteri bulunamadı" });
    }

    const currentPlan = currentCustomerResult.rows[0].subscription_plan;
    if (currentPlan === selectedPlan.code) {
      return res.status(400).json({ error: "Bu plan zaten aktif" });
    }

    if (selectedPlan.priceMonthlyTry > 0) {
      const payment = await createPaymentTransaction({
        customerId: req.user.customerId,
        plan: selectedPlan,
        provider: resolvePaymentProvider(),
      });

      const autoApproveMockPayments =
        String(process.env.PAYMENT_AUTO_APPROVE_MOCK || "false").toLowerCase() ===
        "true";

      if (payment.provider === "mock" && autoApproveMockPayments) {
        const paid = await markPaymentPaid({
          paymentId: payment.id,
          providerPaymentId: `mock-${payment.id}`,
          providerReference: `auto-${payment.id}`,
          rawPayload: { source: "auto-approve-mock" },
        });

        if (paid.found && !paid.alreadyFinal && paid.subscription) {
          return res.json({
            success: true,
            message: "Abonelik planı güncellendi (mock ödeme onaylandı)",
            paymentRequired: false,
            payment: {
              id: payment.id,
              status: "paid",
              provider: payment.provider,
              amountTry: payment.amount_try,
              currency: payment.currency,
            },
            subscription: paid.subscription,
          });
        }
      }

      return res.json({
        success: true,
        paymentRequired: true,
        message: "Ödeme gerekli. Checkout bağlantısı oluşturuldu.",
        payment: {
          id: payment.id,
          status: payment.status,
          provider: payment.provider,
          amountTry: payment.amount_try,
          currency: payment.currency,
          checkoutUrl: payment.checkout_url,
          expiresAt: payment.expires_at,
        },
      });
    }

    const updatedCustomerResult = await query(
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
      [selectedPlan.code, selectedPlan.intervalDays, req.user.customerId],
    );

    if (updatedCustomerResult.rows.length === 0) {
      return res.status(404).json({ error: "Müşteri bulunamadı" });
    }

    const updated = updatedCustomerResult.rows[0];

    try {
      await triggerWebhookEvent({
        customerId: req.user.customerId,
        eventType: "billing.plan_changed",
        payload: {
          customerId: req.user.customerId,
          previousPlan: currentPlan,
          newPlan: updated.subscription_plan,
          status: updated.subscription_status,
          expiresAt: updated.subscription_expires_at,
          paymentId: null,
        },
      });
    } catch (webhookError) {
      console.error("Billing webhook notify error:", webhookError);
    }

    res.json({
      success: true,
      message: "Abonelik planı güncellendi",
      paymentRequired: false,
      subscription: {
        plan: updated.subscription_plan,
        planName: selectedPlan.name,
        status: updated.subscription_status,
        expiresAt: updated.subscription_expires_at,
      },
    });
  } catch (error) {
    console.error("Billing upgrade error:", error);
    res.status(500).json({ error: "Plan güncellenemedi" });
  }
});

export default router;
