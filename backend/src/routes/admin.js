/**
 * Admin Routes - For admin panel only
 *
 * All routes require admin authentication (type: 'admin' in JWT)
 */

import express from "express";
import { pool } from "../config/database.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Admin-only middleware (checks JWT type)
function adminOnly(req, res, next) {
  if (req.user.type !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

// Apply auth and admin check to all routes
router.use(authMiddleware);
router.use(adminOnly);

// ============================================
// Dashboard Stats
// ============================================

router.get("/dashboard", async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM customers"),
      pool.query("SELECT COUNT(*) as total FROM scans"),
      pool.query(
        "SELECT COUNT(*) as total FROM domains WHERE is_active = true",
      ),
      pool.query(`
        SELECT c.company_name as customer_name, s.url as action, s.created_at as date
        FROM scans s
        JOIN domains d ON d.id = s.domain_id
        JOIN customers c ON d.customer_id = c.id
        ORDER BY s.created_at DESC
        LIMIT 10
      `),
    ]);

    res.json({
      totalCustomers: parseInt(stats[0].rows[0].total),
      totalScans: parseInt(stats[1].rows[0].total),
      activeTokens: parseInt(stats[2].rows[0].total),
      recentActivity: stats[3].rows.map((row) => ({
        customerName: row.customer_name,
        action: `Tarama: ${row.action}`,
        date: row.date,
      })),
    });
  } catch (error) {
    console.error("[Admin] Dashboard stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// Customers Management
// ============================================

router.get("/customers", async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "" } = req.query;
    const offset = (page - 1) * limit;

    let customersQuery = `
      SELECT id, email, company_name, contact_name, subscription_plan, is_suspended, created_at
      FROM customers
    `;
    let countQuery = `SELECT COUNT(*) FROM customers`;

    const params = [];
    if (search) {
      customersQuery += ` WHERE email ILIKE $1 OR company_name ILIKE $1 OR contact_name ILIKE $1`;
      countQuery += ` WHERE email ILIKE $1 OR company_name ILIKE $1 OR contact_name ILIKE $1`;
      params.push(`%${search}%`);
    }

    customersQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const queryParams = [...params, limit, offset];

    const result = await pool.query(customersQuery, queryParams);
    const countResult = await pool.query(countQuery, params);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("[Admin] Get customers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM customers WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("[Admin] Get customer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id/detail", async (req, res) => {
  try {
    const customerId = parsePositiveInt(req.params.id);
    if (!customerId) {
      return res.status(400).json({ error: "Geçersiz müşteri ID" });
    }

    const customerResult = await pool.query(
      `SELECT
         id,
         email,
         company_name,
         contact_name,
         phone,
         subscription_plan,
         subscription_status,
         subscription_expires_at,
         is_suspended,
         created_at,
         updated_at
       FROM customers
       WHERE id = $1`,
      [customerId],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const [summaryResult, domainsResult, scansResult, breakdownResult] =
      await Promise.all([
        pool.query(
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
              WHERE d.customer_id = $1) AS total_violations`,
          [customerId],
        ),
        pool.query(
          `SELECT
             id,
             domain,
             is_active,
             auto_fix_enabled,
             server_patch_enabled,
             created_at,
             updated_at
           FROM domains
           WHERE customer_id = $1
           ORDER BY created_at DESC`,
          [customerId],
        ),
        pool.query(
          `SELECT
             s.id,
             s.url,
             s.total_violations,
             s.tr_compliance_score,
             s.created_at,
             d.domain
           FROM scans s
           JOIN domains d ON d.id = s.domain_id
           WHERE d.customer_id = $1
           ORDER BY s.created_at DESC
           LIMIT 20`,
          [customerId],
        ),
        pool.query(
          `SELECT
             v.severity,
             COUNT(*) AS total
           FROM violations v
           JOIN scans s ON s.id = v.scan_id
           JOIN domains d ON d.id = s.domain_id
           WHERE d.customer_id = $1
           GROUP BY v.severity`,
          [customerId],
        ),
      ]);

    const paymentTableCheck = await pool.query(
      `SELECT to_regclass('public.payment_transactions') AS table_name`,
    );

    let recentPayments = [];
    if (paymentTableCheck.rows[0]?.table_name) {
      const paymentsResult = await pool.query(
        `SELECT
           id,
           plan_code,
           provider,
           amount_try,
           currency,
           status,
           created_at,
           paid_at,
           failure_reason
         FROM payment_transactions
         WHERE customer_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [customerId],
      );
      recentPayments = paymentsResult.rows.map((row) => ({
        id: row.id,
        planCode: row.plan_code,
        provider: row.provider,
        amountTry: row.amount_try === null ? null : Number(row.amount_try),
        currency: row.currency,
        status: row.status,
        createdAt: row.created_at,
        paidAt: row.paid_at,
        failureReason: row.failure_reason,
      }));
    }

    const summary = summaryResult.rows[0] || {};

    res.json({
      customer: customerResult.rows[0],
      summary: {
        totalDomains: Number(summary.total_domains || 0),
        activeDomains: Number(summary.active_domains || 0),
        totalScans: Number(summary.total_scans || 0),
        scansLast30Days: Number(summary.scans_last_30_days || 0),
        totalViolations: Number(summary.total_violations || 0),
      },
      domains: domainsResult.rows,
      recentScans: scansResult.rows.map((row) => ({
        ...row,
        total_violations: Number(row.total_violations || 0),
        tr_compliance_score:
          row.tr_compliance_score === null
            ? null
            : Number(row.tr_compliance_score),
      })),
      violationBreakdown: breakdownResult.rows.map((row) => ({
        severity: row.severity,
        total: Number(row.total || 0),
      })),
      recentPayments,
    });
  } catch (error) {
    console.error("[Admin] Get customer detail error:", error);
    res.status(500).json({ error: "Müşteri detayları alınamadı" });
  }
});

router.patch("/customers/:id/suspend", async (req, res) => {
  try {
    const { id } = req.params;
    const customerResult = await pool.query(
      `SELECT id, is_suspended
       FROM customers
       WHERE id = $1`,
      [id],
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const bodyState = req.body?.isSuspended;
    if (bodyState !== undefined && typeof bodyState !== "boolean") {
      return res.status(400).json({ error: "isSuspended boolean olmalı" });
    }

    const currentState = customerResult.rows[0].is_suspended;
    const nextState =
      typeof bodyState === "boolean" ? bodyState : !currentState;

    await pool.query(
      `UPDATE customers
       SET is_suspended = $1, updated_at = NOW()
       WHERE id = $2`,
      [nextState, id],
    );

    res.json({
      success: true,
      isSuspended: nextState,
      message: nextState ? "Customer suspended" : "Customer unsuspended",
    });
  } catch (error) {
    console.error("[Admin] Suspend customer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Delete customer (cascade should handle related records)
    await pool.query("DELETE FROM customers WHERE id = $1", [id]);

    res.json({ success: true, message: "Customer deleted" });
  } catch (error) {
    console.error("[Admin] Delete customer error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// Scans Monitoring
// ============================================

router.get("/scans", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      customerId,
      status,
      startDate,
      endDate,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.id, s.url, s.total_violations, s.tr_compliance_score, s.created_at,
             c.company_name as customer_name, c.email as customer_email
      FROM scans s
      JOIN domains d ON d.id = s.domain_id
      JOIN customers c ON d.customer_id = c.id
    `;

    const conditions = [];
    const params = [];

    if (customerId) {
      conditions.push(`d.customer_id = $${params.length + 1}`);
      params.push(customerId);
    }

    if (startDate) {
      conditions.push(`s.created_at >= $${params.length + 1}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`s.created_at <= $${params.length + 1}`);
      params.push(endDate);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery =
      conditions.length > 0
        ? `SELECT COUNT(*)
           FROM scans s
           JOIN domains d ON d.id = s.domain_id
           WHERE ${conditions.join(" AND ")}`
        : "SELECT COUNT(*) FROM scans";
    const countResult = await pool.query(
      countQuery,
      params.slice(0, conditions.length),
    );

    res.json({
      scans: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("[Admin] Get scans error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/scans/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, c.company_name as customer_name, c.email as customer_email
       FROM scans s
       JOIN domains d ON d.id = s.domain_id
       JOIN customers c ON d.customer_id = c.id
       WHERE s.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Scan not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("[Admin] Get scan error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// Tokens Oversight
// ============================================

router.get("/tokens", async (req, res) => {
  try {
    const { page = 1, limit = 50, customerId, isActive } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT d.id, d.domain, d.is_active, d.token_expires_at AS expires_at, d.created_at,
             c.company_name as customer_name, c.email as customer_email
      FROM domains d
      JOIN customers c ON d.customer_id = c.id
    `;

    const conditions = [];
    const params = [];

    if (customerId) {
      conditions.push(`d.customer_id = $${params.length + 1}`);
      params.push(customerId);
    }

    if (isActive !== undefined) {
      conditions.push(`d.is_active = $${params.length + 1}`);
      params.push(isActive === "true");
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY d.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery =
      conditions.length > 0
        ? `SELECT COUNT(*) FROM domains d WHERE ${conditions.join(" AND ")}`
        : "SELECT COUNT(*) FROM domains";
    const countResult = await pool.query(
      countQuery,
      params.slice(0, conditions.length),
    );

    res.json({
      tokens: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("[Admin] Get tokens error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tokens/:id/revoke", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE domains SET is_active = false WHERE id = $1", [
      id,
    ]);

    res.json({ success: true, message: "Token revoked" });
  } catch (error) {
    console.error("[Admin] Revoke token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// System Metrics
// ============================================

router.get("/metrics", async (req, res) => {
  try {
    // Simple metrics (can be expanded with real monitoring data)
    const stats = await Promise.all([
      pool.query(
        "SELECT COUNT(*) FROM api_logs WHERE created_at > NOW() - INTERVAL '1 hour'",
      ),
      pool.query(
        "SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age FROM api_logs WHERE created_at > NOW() - INTERVAL '1 hour'",
      ),
    ]);

    res.json({
      requestsLastHour: parseInt(stats[0].rows[0].count),
      avgResponseTime: Math.round(
        parseFloat(stats[1].rows[0].avg_age || 0) * 1000,
      ), // Convert to ms
      uptime: process.uptime(), // Backend uptime in seconds
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Admin] Get metrics error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================
// Billing Plan Management
// ============================================

router.get("/billing/plans", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         code,
         name,
         price_monthly_try,
         interval_days,
         features,
         is_active,
         display_order,
         updated_at
       FROM billing_plans
       ORDER BY display_order ASC, code ASC`,
    );

    res.json({
      plans: result.rows.map((row) => ({
        code: row.code,
        name: row.name,
        priceMonthlyTry:
          row.price_monthly_try === null ? null : Number(row.price_monthly_try),
        intervalDays: Number(row.interval_days || 30),
        features: Array.isArray(row.features) ? row.features : [],
        isActive: Boolean(row.is_active),
        displayOrder: Number(row.display_order || 100),
        updatedAt: row.updated_at,
      })),
      currency: "TRY",
    });
  } catch (error) {
    console.error("[Admin] Billing plans fetch error:", error);
    res.status(500).json({ error: "Billing planları alınamadı" });
  }
});

router.patch("/billing/plans/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().toLowerCase();
    if (!code) {
      return res.status(400).json({ error: "Plan kodu gerekli" });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (req.body?.name !== undefined) {
      const name = String(req.body.name || "").trim();
      if (!name) {
        return res.status(400).json({ error: "Plan adı boş olamaz" });
      }
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }

    if (req.body?.priceMonthlyTry !== undefined) {
      const rawPrice = req.body.priceMonthlyTry;
      if (rawPrice !== null) {
        const price = Number.parseInt(String(rawPrice), 10);
        if (!Number.isInteger(price) || price < 0) {
          return res.status(400).json({ error: "Fiyat 0 veya pozitif tam sayı olmalı" });
        }
        updates.push(`price_monthly_try = $${paramIndex++}`);
        params.push(price);
      } else {
        updates.push(`price_monthly_try = NULL`);
      }
    }

    if (req.body?.intervalDays !== undefined) {
      const intervalDays = Number.parseInt(String(req.body.intervalDays), 10);
      if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 3650) {
        return res
          .status(400)
          .json({ error: "intervalDays 1 ile 3650 arasında olmalı" });
      }
      updates.push(`interval_days = $${paramIndex++}`);
      params.push(intervalDays);
    }

    if (req.body?.features !== undefined) {
      if (!Array.isArray(req.body.features)) {
        return res.status(400).json({ error: "features dizi olmalı" });
      }
      const features = req.body.features
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0)
        .slice(0, 20);
      updates.push(`features = $${paramIndex++}::text[]`);
      params.push(features);
    }

    if (req.body?.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(Boolean(req.body.isActive));
    }

    if (req.body?.displayOrder !== undefined) {
      const displayOrder = Number.parseInt(String(req.body.displayOrder), 10);
      if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) {
        return res
          .status(400)
          .json({ error: "displayOrder 0 ile 10000 arasında olmalı" });
      }
      updates.push(`display_order = $${paramIndex++}`);
      params.push(displayOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Güncellenecek alan bulunamadı" });
    }

    updates.push("updated_at = NOW()");
    params.push(code);

    const result = await pool.query(
      `UPDATE billing_plans
       SET ${updates.join(", ")}
       WHERE code = $${paramIndex}
       RETURNING code, name, price_monthly_try, interval_days, features, is_active, display_order, updated_at`,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plan bulunamadı" });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      message: "Plan güncellendi",
      plan: {
        code: row.code,
        name: row.name,
        priceMonthlyTry:
          row.price_monthly_try === null ? null : Number(row.price_monthly_try),
        intervalDays: Number(row.interval_days || 30),
        features: Array.isArray(row.features) ? row.features : [],
        isActive: Boolean(row.is_active),
        displayOrder: Number(row.display_order || 100),
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error("[Admin] Billing plan update error:", error);
    res.status(500).json({ error: "Plan güncellenemedi" });
  }
});

export default router;
