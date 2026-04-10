import { query } from "../config/database.js";

export async function requestLogger(req, res, next) {
  const startTime = Date.now();

  res.on("finish", async () => {
    const duration = Date.now() - startTime;

    if (process.env.NODE_ENV !== "test") {
      console.log(
        `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      );
    }

    if (req.originalUrl.startsWith("/api/")) {
      try {
        await query(
          `INSERT INTO api_logs (
            domain_id, endpoint, method, status_code,
            response_time_ms, ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            req.user?.domainId || null,
            req.originalUrl,
            req.method,
            res.statusCode,
            duration,
            req.ip,
            req.get("user-agent"),
          ],
        );
      } catch (error) {
        console.error("Failed to log API request:", error.message);
      }
    }
  });

  next();
}
