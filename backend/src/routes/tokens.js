import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { generateWidgetToken } from "../middleware/auth.js";
import {
  canUseServerPatch,
  getDomainLimit,
  isSubscriptionExpired,
} from "../utils/planEntitlements.js";

const router = express.Router();

function customerOnly(req, res, next) {
  if (req.user?.role !== "customer" || !req.user?.customerId) {
    return res.status(403).json({ error: "Müşteri erişimi gerekli" });
  }
  return next();
}

function normalizeDomainInput(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const stripped = normalized
    .replace(/^https?:\/\//u, "")
    .replace(/\/+$/u, "");
  if (!stripped) return null;

  const domainPattern =
    /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/u;
  if (!domainPattern.test(stripped)) return null;
  return stripped;
}

async function getCustomerPlanContext(customerId) {
  const result = await query(
    `SELECT
       c.id,
       c.subscription_plan,
       c.subscription_status,
       c.subscription_expires_at,
       bp.features
     FROM customers c
     LEFT JOIN billing_plans bp ON bp.code = c.subscription_plan
     WHERE c.id = $1
     LIMIT 1`,
    [customerId],
  );
  if (result.rows.length === 0) return null;
  return result.rows[0];
}

router.post("/", authMiddleware, customerOnly, async (req, res) => {
  try {
    const { autoFixEnabled, serverPatchEnabled } = req.body;
    const domain = normalizeDomainInput(req.body?.domain);

    if (!domain) {
      return res.status(400).json({ error: "Geçerli bir domain gerekli" });
    }

    const planContext = await getCustomerPlanContext(req.user.customerId);
    if (!planContext) {
      return res.status(404).json({ error: "Müşteri hesabı bulunamadı" });
    }

    const subscriptionExpired = isSubscriptionExpired(
      planContext.subscription_expires_at,
    );
    if (
      planContext.subscription_status !== "active" ||
      subscriptionExpired
    ) {
      return res.status(403).json({ error: "Aboneliğiniz aktif değil" });
    }

    const domainLimit = getDomainLimit(
      planContext.subscription_plan,
      planContext.features,
    );
    if (domainLimit !== null) {
      const usageResult = await query(
        `SELECT COUNT(*) AS total
         FROM domains
         WHERE customer_id = $1`,
        [req.user.customerId],
      );
      const currentDomainCount = Number(usageResult.rows[0]?.total || 0);
      if (currentDomainCount >= domainLimit) {
        return res.status(403).json({
          error: `Plan limitiniz dolu. Bu plan için en fazla ${domainLimit} domain ekleyebilirsiniz.`,
        });
      }
    }

    const requestedServerPatch = Boolean(serverPatchEnabled);
    const serverPatchAllowed = canUseServerPatch(
      planContext.subscription_plan,
      planContext.features,
    );
    if (requestedServerPatch && !serverPatchAllowed) {
      return res.status(403).json({
        error:
          "Server-side patch özelliği sadece bu özelliği içeren planlarda kullanılabilir",
      });
    }

    const domainResult = await query(
      `INSERT INTO domains (customer_id, domain, auto_fix_enabled, server_patch_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id, domain, auto_fix_enabled, server_patch_enabled`,
      [
        req.user.customerId,
        domain,
        Boolean(autoFixEnabled),
        requestedServerPatch && serverPatchAllowed,
      ],
    );

    const domainData = domainResult.rows[0];
    domainData.customer_id = req.user.customerId;

    const token = generateWidgetToken(domainData);

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await query(
      "UPDATE domains SET token = $1, token_expires_at = $2 WHERE id = $3",
      [token, expiresAt, domainData.id],
    );

    res.status(201).json({
      success: true,
      domain: {
        id: domainData.id,
        domain: domainData.domain,
        token,
        expiresAt,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Bu domain zaten kayıtlı" });
    }
    console.error("Token creation error:", error);
    res.status(500).json({ error: "Token oluşturulamadı" });
  }
});

router.get("/", authMiddleware, customerOnly, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, domain, token, token AS widget_token, token_expires_at, auto_fix_enabled,
              server_patch_enabled, is_active, created_at
       FROM domains
       WHERE customer_id = $1
       ORDER BY created_at DESC`,
      [req.user.customerId],
    );

    res.json({ tokens: result.rows });
  } catch (error) {
    console.error("Token list error:", error);
    res.status(500).json({ error: "Token listesi alınamadı" });
  }
});

router.delete("/:id", authMiddleware, customerOnly, async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM domains WHERE id = $1 AND customer_id = $2 RETURNING id",
      [req.params.id, req.user.customerId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Token bulunamadı" });
    }

    res.json({ success: true, message: "Token silindi" });
  } catch (error) {
    console.error("Token delete error:", error);
    res.status(500).json({ error: "Token silinemedi" });
  }
});

export default router;
