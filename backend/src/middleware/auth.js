import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../config/database.js";
import { isSubscriptionExpired } from "../utils/planEntitlements.js";

function getJWTSecret() {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    console.error("❌ JWT_SECRET must be at least 32 characters long");
    process.exit(1);
  }
  return JWT_SECRET;
}

function normalizePem(input) {
  if (!input) return null;
  const normalized = String(input).trim();
  if (!normalized) return null;
  return normalized.replace(/\\n/g, "\n");
}

function getWidgetPrivateKey() {
  return normalizePem(process.env.WIDGET_JWT_PRIVATE_KEY);
}

function getWidgetPublicKey() {
  return normalizePem(process.env.WIDGET_JWT_PUBLIC_KEY);
}

function getWidgetTokenExpiresIn() {
  return (
    process.env.WIDGET_JWT_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "365d"
  );
}

export function generateToken(payload, expiresIn = "365d") {
  return jwt.sign(payload, getJWTSecret(), { expiresIn });
}

function verifyLegacyToken(token) {
  try {
    return jwt.verify(token, getJWTSecret(), { algorithms: ["HS256"] });
  } catch (error) {
    return null;
  }
}

function verifyWidgetToken(token) {
  const publicKey = getWidgetPublicKey();
  if (!publicKey) return null;

  try {
    return jwt.verify(token, publicKey, { algorithms: ["RS256"] });
  } catch (error) {
    return null;
  }
}

function constantTimeTokenEquals(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyToken(token) {
  const decodedUnsafe = jwt.decode(token);
  const tokenType =
    decodedUnsafe && typeof decodedUnsafe === "object"
      ? decodedUnsafe.type
      : null;

  if (tokenType === "widget") {
    return verifyWidgetToken(token) || verifyLegacyToken(token);
  }

  return verifyLegacyToken(token);
}

export function getWidgetPublicKeyPem() {
  return getWidgetPublicKey();
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token bulunamadı" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: "Geçersiz veya süresi dolmuş token" });
  }

  if (decoded.customerId) {
    try {
      const customerResult = await query(
        `SELECT is_suspended, subscription_status, subscription_expires_at
         FROM customers
         WHERE id = $1`,
        [decoded.customerId],
      );

      if (customerResult.rows.length === 0) {
        return res.status(401).json({ error: "Müşteri hesabı bulunamadı" });
      }

      const customer = customerResult.rows[0];
      if (customer.is_suspended) {
        return res
          .status(403)
          .json({
            error:
              "Hesabınız askıya alındı. Lütfen destek ile iletişime geçin.",
          });
      }

      const subscriptionExpired = isSubscriptionExpired(
        customer.subscription_expires_at,
      );
      if (subscriptionExpired && customer.subscription_status === "active") {
        await query(
          `UPDATE customers
           SET subscription_status = 'expired', updated_at = NOW()
           WHERE id = $1`,
          [decoded.customerId],
        );
      }

      if (customer.subscription_status !== "active" || subscriptionExpired) {
        return res.status(403).json({ error: "Aboneliğiniz aktif değil" });
      }
    } catch (error) {
      console.error("Auth middleware customer check error:", error);
      return res
        .status(500)
        .json({ error: "Kimlik doğrulama kontrolü başarısız" });
    }
  }

  req.user = decoded;
  return next();
}

export function adminMiddleware(req, res, next) {
  if (
    !req.user ||
    !req.user.role ||
    !["admin", "superadmin"].includes(req.user.role)
  ) {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }
  next();
}

export function generateWidgetToken(domainData) {
  const payload = {
    type: "widget",
    domainId: domainData.id,
    customerId: domainData.customer_id,
    domain: domainData.domain,
    features: {
      autoFix: domainData.auto_fix_enabled,
      serverPatch: domainData.server_patch_enabled,
    },
  };

  const privateKey = getWidgetPrivateKey();
  const publicKey = getWidgetPublicKey();

  if ((privateKey && !publicKey) || (!privateKey && publicKey)) {
    throw new Error(
      "WIDGET_JWT_PRIVATE_KEY ve WIDGET_JWT_PUBLIC_KEY birlikte tanımlanmalı",
    );
  }

  if (privateKey && publicKey) {
    return jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      expiresIn: getWidgetTokenExpiresIn(),
    });
  }

  return generateToken(payload, getWidgetTokenExpiresIn());
}

export async function verifyWidgetRequestToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, status: 401, error: "Token gerekli" };
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.type !== "widget") {
    return { valid: false, status: 401, error: "Geçersiz widget token" };
  }

  const domainId = Number.parseInt(String(decoded.domainId || ""), 10);
  const customerId = Number.parseInt(String(decoded.customerId || ""), 10);
  if (!Number.isInteger(domainId) || domainId <= 0) {
    return { valid: false, status: 401, error: "Widget token domain bilgisi geçersiz" };
  }
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return {
      valid: false,
      status: 401,
      error: "Widget token müşteri bilgisi geçersiz",
    };
  }

  const result = await query(
    `SELECT
       d.id,
       d.customer_id,
       d.domain,
       d.is_active,
       d.token,
       d.token_expires_at,
       d.auto_fix_enabled,
       d.server_patch_enabled,
       c.is_suspended,
       c.subscription_status,
       c.subscription_expires_at
     FROM domains d
     JOIN customers c ON c.id = d.customer_id
     WHERE d.id = $1
     LIMIT 1`,
    [domainId],
  );

  if (result.rows.length === 0) {
    return { valid: false, status: 401, error: "Widget token alanı bulunamadı" };
  }

  const domainRow = result.rows[0];
  if (Number(domainRow.customer_id) !== customerId) {
    return { valid: false, status: 401, error: "Widget token alan eşleşmesi hatalı" };
  }

  if (!domainRow.is_active) {
    return { valid: false, status: 401, error: "Widget token iptal edilmiş" };
  }

  if (!domainRow.token || !constantTimeTokenEquals(domainRow.token, token)) {
    return { valid: false, status: 401, error: "Widget token geçersiz veya yenilenmiş" };
  }

  if (isSubscriptionExpired(domainRow.token_expires_at)) {
    return { valid: false, status: 401, error: "Widget token süresi dolmuş" };
  }

  if (domainRow.is_suspended) {
    return {
      valid: false,
      status: 403,
      error: "Hesabınız askıya alındı. Lütfen destek ile iletişime geçin.",
    };
  }

  const customerSubscriptionExpired = isSubscriptionExpired(
    domainRow.subscription_expires_at,
  );
  if (
    domainRow.subscription_status !== "active" ||
    customerSubscriptionExpired
  ) {
    return { valid: false, status: 403, error: "Aboneliğiniz aktif değil" };
  }

  return {
    valid: true,
    decoded: {
      ...decoded,
      domainId,
      customerId,
      features: {
        autoFix: Boolean(domainRow.auto_fix_enabled),
        serverPatch: Boolean(domainRow.server_patch_enabled),
      },
    },
    domain: domainRow,
  };
}
