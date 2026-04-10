import express from "express";
import { verifyWidgetRequestToken } from "../middleware/auth.js";
import { scanLimiter } from "../middleware/rateLimiter.js";
import { query } from "../config/database.js";
import { getAIFixes, getFallbackFixes } from "../services/gemini.js";
import { triggerWebhookEvent } from "../services/webhooks.js";

const router = express.Router();
const MAX_VIOLATIONS_PER_SCAN = 2000;

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
}

function normalizeText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeWcagLevel(value) {
  const normalized = String(value || "").toUpperCase().trim();
  if (["A", "AA", "AAA"].includes(normalized)) return normalized;
  return "AA";
}

function normalizeSeverity(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (["critical", "major", "minor"].includes(normalized)) return normalized;
  return "minor";
}

function normalizeImpact(value) {
  const normalized = String(value || "").toLowerCase().trim();
  if (["high", "moderate", "low"].includes(normalized)) return normalized;
  return "moderate";
}

function normalizeViolations(input) {
  if (!Array.isArray(input)) return [];

  return input.slice(0, MAX_VIOLATIONS_PER_SCAN).map((item) => ({
    wcagCriterion: normalizeText(item?.wcagCriterion, 50),
    trCriterion: normalizeText(item?.trCriterion, 50),
    severity: normalizeSeverity(item?.severity),
    selector: normalizeText(item?.selector, 512),
    type: normalizeText(item?.type, 100),
    description: normalizeText(item?.description, 1000),
    recommendation: normalizeText(item?.recommendation, 1000),
    impact: normalizeImpact(item?.impact),
  }));
}

function calculateComplianceScore(metrics) {
  const weighted =
    metrics.criticalCount * 5 + metrics.majorCount * 3 + metrics.minorCount * 1;
  const rawScore = 100 - weighted * 2;
  const bounded = Math.max(0, Math.min(100, rawScore));
  return Number(bounded.toFixed(2));
}

function deriveMetrics(violations) {
  const metrics = {
    totalViolations: violations.length,
    criticalCount: 0,
    majorCount: 0,
    minorCount: 0,
  };

  for (const item of violations) {
    if (item.severity === "critical") metrics.criticalCount += 1;
    else if (item.severity === "major") metrics.majorCount += 1;
    else metrics.minorCount += 1;
  }

  return {
    ...metrics,
    trComplianceScore: calculateComplianceScore(metrics),
  };
}

router.post("/report", scanLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token gerekli" });
    }

    const token = authHeader.substring(7);
    const verification = await verifyWidgetRequestToken(token);
    if (!verification.valid) {
      return res
        .status(verification.status || 401)
        .json({ error: verification.error || "Geçersiz widget token" });
    }
    const decoded = verification.decoded;

    const {
      url,
      wcagLevel,
      scanDurationMs,
      userAgent,
      viewportWidth,
      viewportHeight,
      violations,
    } = req.body;

    const normalizedUrl = normalizeText(url, 2048);
    if (!normalizedUrl) {
      return res.status(400).json({ error: "Geçerli bir URL gerekli" });
    }
    const normalizedViolations = normalizeViolations(violations);
    const metrics = deriveMetrics(normalizedViolations);

    const scanResult = await query(
      `INSERT INTO scans (
        domain_id, url, scan_type, total_violations,
        critical_count, major_count, minor_count,
        wcag_level, tr_compliance_score, scan_duration_ms,
        user_agent, viewport_width, viewport_height, scan_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        decoded.domainId,
        normalizedUrl,
        "widget",
        metrics.totalViolations,
        metrics.criticalCount,
        metrics.majorCount,
        metrics.minorCount,
        normalizeWcagLevel(wcagLevel),
        metrics.trComplianceScore,
        clampInteger(scanDurationMs, 0, 3600000, 0),
        normalizeText(userAgent, 512),
        clampInteger(viewportWidth, 1, 10000, 1920),
        clampInteger(viewportHeight, 1, 10000, 1080),
        JSON.stringify({ violations: normalizedViolations }),
      ],
    );

    const scanId = scanResult.rows[0].id;

    if (normalizedViolations.length > 0) {
      for (const v of normalizedViolations) {
        await query(
          `INSERT INTO violations (
            scan_id, wcag_criterion, tr_criterion, severity,
            element_selector, violation_type, description,
            recommendation, impact
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            scanId,
            v.wcagCriterion || "",
            v.trCriterion || "",
            v.severity || "medium",
            v.selector || "",
            v.type || "",
            v.description || "",
            v.recommendation || "",
            v.impact || "moderate",
          ],
        );
      }
    }

    try {
      await triggerWebhookEvent({
        customerId: decoded.customerId,
        eventType: "scan.completed",
        payload: {
            scanId,
            domainId: decoded.domainId,
            url: normalizedUrl,
            totalViolations: metrics.totalViolations,
            criticalCount: metrics.criticalCount,
            majorCount: metrics.majorCount,
            minorCount: metrics.minorCount,
            wcagLevel: normalizeWcagLevel(wcagLevel),
            trComplianceScore: metrics.trComplianceScore,
          },
        });
    } catch (webhookError) {
      console.error("Scan webhook notify error:", webhookError);
    }

    res.json({
      success: true,
      scanId,
      message: "Tarama sonuçları kaydedildi",
    });
  } catch (error) {
    console.error("Scan report error:", error);
    res.status(500).json({ error: "Tarama kaydedilemedi" });
  }
});

router.post("/ai", scanLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token gerekli" });
    }

    const token = authHeader.substring(7);
    const verification = await verifyWidgetRequestToken(token);
    if (!verification.valid) {
      return res
        .status(verification.status || 401)
        .json({ error: verification.error || "Geçersiz widget token" });
    }
    const decoded = verification.decoded;

    const { violations, domSnapshot } = req.body;

    if (!violations || violations.length === 0) {
      return res.json({ fixes: [], source: "none" });
    }

    let fixes = null;
    let source = "fallback";

    try {
      fixes = await getAIFixes(violations, domSnapshot);
      if (fixes) source = "gemini";
    } catch (err) {
      console.warn(
        "[AI] Gemini çağrısı başarısız, fallback kullanılıyor:",
        err.message,
      );
    }

    if (!fixes) {
      fixes = getFallbackFixes(violations);
    }

    // fixes tablosuna kaydet (scanId varsa violation'ları eşleştirerek)
    const scanId = clampInteger(req.body?.scanId, 1, Number.MAX_SAFE_INTEGER, null);
    if (scanId && fixes.length > 0) {
      try {
        const scanOwnerResult = await query(
          `SELECT id
           FROM scans
           WHERE id = $1 AND domain_id = $2
           LIMIT 1`,
          [scanId, decoded.domainId],
        );
        if (scanOwnerResult.rows.length === 0) {
          return res.status(403).json({ error: "Bu taramaya fix kaydı yetkiniz yok" });
        }

        const violationRows = await query(
          "SELECT id, element_selector FROM violations WHERE scan_id = $1",
          [scanId],
        );
        const violationMap = {};
        for (const row of violationRows.rows) {
          violationMap[row.element_selector] = row.id;
        }

        for (const fix of fixes) {
          const violationId = violationMap[fix.selector];
          if (!violationId) continue;
          try {
            await query(
              `INSERT INTO fixes (violation_id, fix_type, fix_method, css_patch, html_patch, ai_confidence, ai_reasoning)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                violationId,
                fix.fixType === "css"
                  ? "css"
                  : fix.fixType === "attribute"
                    ? "html"
                    : "manual",
                "ai",
                fix.cssPatch || null,
                fix.attrPatch
                  ? JSON.stringify(fix.attrPatch)
                  : fix.htmlSuggestion || null,
                fix.confidence,
                fix.reasoning,
              ],
            );
          } catch (dbErr) {
            console.warn("[AI] Fix kaydedilemedi:", dbErr.message);
          }
        }
      } catch (dbErr) {
        console.warn("[AI] Violation lookup başarısız:", dbErr.message);
      }
    }

    res.json({ fixes, source });
  } catch (error) {
    console.error("AI scan error:", error);
    res.status(500).json({ error: "AI analizi başarısız" });
  }
});

export default router;
