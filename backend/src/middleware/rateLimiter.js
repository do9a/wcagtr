import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: "Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyin",
  standardHeaders: true,
  legacyHeaders: false,
});

export const scanLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: "Tarama limiti aşıldı, 1 dakika sonra tekrar deneyin",
  skipSuccessfulRequests: false,
});

export const authLimiter = rateLimit({
  windowMs: 900000,
  max: 5,
  message: "Çok fazla giriş denemesi, 15 dakika sonra tekrar deneyin",
  skipSuccessfulRequests: true,
});
