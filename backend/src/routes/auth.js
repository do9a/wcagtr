import express from "express";
import bcrypt from "bcrypt";
import { query } from "../config/database.js";
import { generateToken } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getEmailDomain(email) {
  const normalized = normalizeEmail(email);
  const [, domain = ""] = normalized.split("@");
  return domain;
}

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: "Email ve şifre gereklidir" });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Geçerli bir email adresi girin" });
    }

    const result = await query("SELECT * FROM customers WHERE email = $1", [
      normalizedEmail,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Geçersiz email veya şifre" });
    }

    const customer = result.rows[0];

    if (customer.is_suspended) {
      return res
        .status(403)
        .json({
          error: "Hesabınız askıya alındı. Lütfen destek ile iletişime geçin.",
        });
    }

    if (customer.subscription_status !== "active") {
      return res.status(403).json({ error: "Aboneliğiniz aktif değil" });
    }
    if (
      customer.subscription_expires_at &&
      new Date(customer.subscription_expires_at).getTime() <= Date.now()
    ) {
      if (customer.subscription_status === "active") {
        await query(
          `UPDATE customers
           SET subscription_status = 'expired', updated_at = NOW()
           WHERE id = $1`,
          [customer.id],
        );
      }
      return res.status(403).json({ error: "Aboneliğinizin süresi dolmuş" });
    }

    const validPassword = await bcrypt.compare(
      password,
      customer.password_hash,
    );
    if (!validPassword) {
      return res.status(401).json({ error: "Geçersiz email veya şifre" });
    }

    const token = generateToken({
      customerId: customer.id,
      email: customer.email,
      role: "customer",
    });

    res.json({
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        companyName: customer.company_name,
        subscriptionPlan: customer.subscription_plan,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Giriş başarısız" });
  }
});

router.post("/admin/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email ve şifre gereklidir" });
    }

    const result = await query(
      "SELECT * FROM admin_users WHERE email = $1 AND is_active = true",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Geçersiz email veya şifre" });
    }

    const admin = result.rows[0];
    const validPassword = await bcrypt.compare(password, admin.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: "Geçersiz email veya şifre" });
    }

    await query("UPDATE admin_users SET last_login_at = NOW() WHERE id = $1", [
      admin.id,
    ]);

    const token = generateToken({
      type: "admin",
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Giriş başarısız" });
  }
});

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { email, password, companyName, contactName, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const normalizedCompanyName = String(companyName || "").trim();
    const emailDomain = getEmailDomain(normalizedEmail);

    if (!normalizedEmail || !password || !normalizedCompanyName) {
      return res.status(400).json({
        error: "Email, şifre ve şirket adı gereklidir",
      });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Geçerli bir email adresi girin" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Şifre en az 8 karakter olmalıdır",
      });
    }

    const existingCustomer = await query(
      "SELECT id FROM customers WHERE email = $1",
      [normalizedEmail],
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(409).json({ error: "Bu email zaten kayıtlı" });
    }

    const recentTrialResult = await query(
      `SELECT id
       FROM customers
       WHERE subscription_plan = 'trial'
         AND created_at >= NOW() - INTERVAL '90 days'
         AND (
           LOWER(company_name) = LOWER($1)
           OR split_part(LOWER(email), '@', 2) = $2
         )
       LIMIT 1`,
      [normalizedCompanyName, emailDomain],
    );
    if (recentTrialResult.rows.length > 0) {
      return res.status(429).json({
        error:
          "Bu şirket/e-posta alanı için son 90 gün içinde trial hesabı oluşturulmuş. Lütfen satış ekibiyle iletişime geçin.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
       `INSERT INTO customers (
        email, password_hash, company_name, contact_name, phone,
        subscription_plan, subscription_status, subscription_expires_at
       ) VALUES ($1, $2, $3, $4, $5, 'trial', 'active', NOW() + INTERVAL '14 days')
       RETURNING id, email, company_name, subscription_plan`,
      [normalizedEmail, passwordHash, normalizedCompanyName, contactName, phone],
    );

    const customer = result.rows[0];

    const token = generateToken({
      customerId: customer.id,
      email: customer.email,
      role: "customer",
    });

    res.status(201).json({
      token,
      customer: {
        id: customer.id,
        email: customer.email,
        companyName: customer.company_name,
        subscriptionPlan: customer.subscription_plan,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Kayıt başarısız" });
  }
});

export default router;
