import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { query, testConnection } from "../src/config/database.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log("🚀 Starting database migrations...\n");

  const connected = await testConnection();
  if (!connected) {
    console.error(
      "❌ Cannot connect to database. Check your .env configuration.",
    );
    process.exit(1);
  }

  const migrationsDir = __dirname;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    console.log(`📄 Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

    try {
      await query(sql);
      console.log(`✓ ${file} completed\n`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log("✅ All migrations completed successfully!");
  process.exit(0);
}

runMigrations();
