import express from "express";
import { verifyWidgetRequestToken } from "../middleware/auth.js";
import { query } from "../config/database.js";
import { createPatchSignature } from "../utils/patchSignature.js";

const router = express.Router();

async function parseWidgetToken(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token gerekli" });
    return null;
  }

  const token = authHeader.substring(7);
  const verification = await verifyWidgetRequestToken(token);
  if (!verification.valid) {
    res
      .status(verification.status || 401)
      .json({ error: verification.error || "Geçersiz token" });
    return null;
  }

  return verification.decoded;
}

function buildPatchCandidate(violation) {
  const selector = (violation?.selector || "").trim();
  const type = (violation?.type || "").trim();

  if (!selector || !type || selector.length > 512 || type.length > 100) {
    return null;
  }

  if (type === "low-contrast") {
    return {
      patchType: "css",
      patchContent: `${selector} { color: #1a1a1a !important; background-color: #ffffff !important; }`,
      filePath: null,
    };
  }

  if (type === "focus-indicator" || type === "non-text-contrast") {
    return {
      patchType: "css",
      patchContent: `${selector}:focus, ${selector}:focus-visible { outline: 3px solid #0066cc !important; outline-offset: 2px !important; }`,
      filePath: null,
    };
  }

  if (
    type === "text-spacing" ||
    type === "line-height" ||
    type === "resize-text"
  ) {
    return {
      patchType: "css",
      patchContent: `${selector} { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }`,
      filePath: null,
    };
  }

  if (type === "missing-lang" && selector === "html") {
    return {
      patchType: "html",
      patchContent: JSON.stringify({
        selector: "html",
        attributes: { lang: "tr" },
      }),
      filePath: null,
    };
  }

  if (type === "missing-alt") {
    return {
      patchType: "html",
      patchContent: JSON.stringify({ selector, attributes: { alt: "" } }),
      filePath: null,
    };
  }

  return null;
}

async function getPendingPatches(domainId) {
  const result = await query(
    `SELECT id, patch_content, patch_signature, file_path, patch_type
     FROM patches
     WHERE domain_id = $1 AND delivery_status = 'pending'
     ORDER BY created_at ASC
     LIMIT 10`,
    [domainId],
  );

  return result.rows;
}

router.post("/request", async (req, res) => {
  try {
    const decoded = await parseWidgetToken(req, res);
    if (!decoded) return;
    if (!decoded.features?.serverPatch) {
      return res.status(403).json({ error: "Server patch özelliği bu domain için aktif değil" });
    }

    const { violations } = req.body || {};
    if (violations !== undefined && !Array.isArray(violations)) {
      return res.status(400).json({ error: "violations dizi olmalı" });
    }

    const incomingViolations = Array.isArray(violations) ? violations : [];
    if (incomingViolations.length > 100) {
      return res
        .status(400)
        .json({ error: "En fazla 100 ihlal gönderilebilir" });
    }

    for (const violation of incomingViolations) {
      const candidate = buildPatchCandidate(violation);
      if (!candidate) continue;

      const signature = createPatchSignature(
        decoded.domainId,
        candidate.patchType,
        candidate.patchContent,
      );

      await query(
        `INSERT INTO patches (domain_id, patch_content, patch_signature, file_path, patch_type, delivery_status)
         SELECT $1, $2, $3, $4, $5::varchar, 'pending'
         WHERE NOT EXISTS (
           SELECT 1
           FROM patches
           WHERE domain_id = $1
             AND patch_type = $5::varchar
             AND patch_content = $2
             AND delivery_status IN ('pending', 'delivered')
         )`,
        [
          decoded.domainId,
          candidate.patchContent,
          signature,
          candidate.filePath,
          candidate.patchType,
        ],
      );
    }

    const patches = await getPendingPatches(decoded.domainId);
    res.json({ patches });
  } catch (error) {
    console.error("Patch request error:", error);
    res.status(500).json({ error: "Patch isteği işlenemedi" });
  }
});

router.get("/pending", async (req, res) => {
  try {
    const decoded = await parseWidgetToken(req, res);
    if (!decoded) return;
    if (!decoded.features?.serverPatch) {
      return res.status(403).json({ error: "Server patch özelliği bu domain için aktif değil" });
    }

    const patches = await getPendingPatches(decoded.domainId);
    res.json({ patches });
  } catch (error) {
    console.error("Patches fetch error:", error);
    res.status(500).json({ error: "Patch'ler alınamadı" });
  }
});

router.post("/applied", async (req, res) => {
  try {
    const decoded = await parseWidgetToken(req, res);
    if (!decoded) return;
    if (!decoded.features?.serverPatch) {
      return res.status(403).json({ error: "Server patch özelliği bu domain için aktif değil" });
    }

    const { patchId, patchSignature } = req.body;

    if (!patchId) {
      return res.status(400).json({ error: "Patch ID gerekli" });
    }
    if (!patchSignature || typeof patchSignature !== "string") {
      return res.status(400).json({ error: "Patch signature gerekli" });
    }

    const updateResult = await query(
      `UPDATE patches
       SET delivery_status = 'applied', applied_at = NOW()
       WHERE id = $1
         AND domain_id = $2
         AND patch_signature = $3
         AND delivery_status IN ('pending', 'delivered')
       RETURNING id`,
      [patchId, decoded.domainId, patchSignature],
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Patch bulunamadı veya geçersiz" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Patch applied error:", error);
    res.status(500).json({ error: "Patch durumu güncellenemedi" });
  }
});

export default router;
