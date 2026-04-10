import express from "express";
import { testConnection } from "../config/database.js";

const router = express.Router();

router.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  };

  try {
    const dbConnected = await testConnection();
    health.database = dbConnected ? "connected" : "disconnected";

    if (!dbConnected) {
      health.status = "degraded";
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    health.status = "error";
    health.database = "error";
    health.error = error.message;
    res.status(503).json(health);
  }
});

router.get("/ready", async (req, res) => {
  try {
    const dbConnected = await testConnection();
    if (dbConnected) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: "database unavailable" });
    }
  } catch (error) {
    res.status(503).json({ ready: false, reason: error.message });
  }
});

export default router;
