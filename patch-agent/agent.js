#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const REQUEST_TIMEOUT_MS = 15000;
const MIN_POLL_INTERVAL_MS = 10000;
const MAX_BACKUPS_PER_FILE = 5;

const config = buildConfig();
let loopTimer = null;

async function main() {
  printStartup();
  await runCycle();

  loopTimer = setInterval(() => {
    runCycle().catch((error) => {
      console.error("[PatchAgent] Poll cycle error:", error.message);
    });
  }, config.pollIntervalMs);

  const shutdown = () => {
    if (loopTimer) {
      clearInterval(loopTimer);
    }
    console.log("\n[PatchAgent] Durduruldu.");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function buildConfig() {
  const apiBaseRaw =
    process.env.PATCH_AGENT_API_BASE || "http://localhost:3000/api/v1";
  const apiBase = normalizeApiBase(apiBaseRaw);
  const widgetToken =
    process.env.PATCH_AGENT_WIDGET_TOKEN || process.env.WIDGET_TOKEN || "";
  const signingKey =
    process.env.PATCH_AGENT_SIGNING_KEY ||
    process.env.TOKEN_SIGNING_KEY ||
    process.env.JWT_SECRET ||
    "";
  const pollIntervalMs = parsePollInterval(process.env.PATCH_AGENT_POLL_MS);
  const workdir = path.resolve(process.env.PATCH_AGENT_WORKDIR || process.cwd());
  const backupDir = path.resolve(
    workdir,
    process.env.PATCH_AGENT_BACKUP_DIR || ".wcagtr-patch-backups",
  );
  const cssTarget = path.resolve(
    workdir,
    process.env.PATCH_AGENT_CSS_TARGET || "public/wcagtr-server-patches.css",
  );
  const htmlTarget = path.resolve(
    workdir,
    process.env.PATCH_AGENT_HTML_TARGET || "public/wcagtr-server-patches.html",
  );
  const domainId = resolveDomainId(process.env.PATCH_AGENT_DOMAIN_ID, widgetToken);

  enforceSecureTransport(apiBase);

  if (!widgetToken) {
    throw new Error("PATCH_AGENT_WIDGET_TOKEN gerekli");
  }

  if (signingKey.length < 32) {
    throw new Error(
      "PATCH_AGENT_SIGNING_KEY / TOKEN_SIGNING_KEY en az 32 karakter olmalı",
    );
  }

  assertPathInside(workdir, backupDir, "PATCH_AGENT_BACKUP_DIR");
  assertPathInside(workdir, cssTarget, "PATCH_AGENT_CSS_TARGET");
  assertPathInside(workdir, htmlTarget, "PATCH_AGENT_HTML_TARGET");

  return {
    apiBase,
    widgetToken,
    signingKey,
    pollIntervalMs,
    workdir,
    backupDir,
    cssTarget,
    htmlTarget,
    domainId,
  };
}

function assertPathInside(baseDir, targetPath, fieldName) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  const prefix = `${resolvedBase}${path.sep}`;
  const inside =
    resolvedTarget === resolvedBase || resolvedTarget.startsWith(prefix);

  if (!inside) {
    throw new Error(`${fieldName} çalışma dizini dışına çıkamaz`);
  }
}

function normalizeApiBase(input) {
  return String(input || "")
    .trim()
    .replace(/\/+$/, "");
}

function parsePollInterval(rawValue) {
  const parsed = Number.parseInt(String(rawValue || "300000"), 10);
  if (!Number.isFinite(parsed) || parsed < MIN_POLL_INTERVAL_MS) {
    return 300000;
  }
  return parsed;
}

function resolveDomainId(rawDomainId, token) {
  if (rawDomainId) {
    const parsed = Number.parseInt(String(rawDomainId), 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
    throw new Error("PATCH_AGENT_DOMAIN_ID pozitif sayı olmalı");
  }

  const payload = decodeJwtPayload(token);
  const tokenDomainId = Number.parseInt(String(payload?.domainId || ""), 10);
  if (!Number.isInteger(tokenDomainId) || tokenDomainId <= 0) {
    throw new Error(
      "Widget token içinde domainId bulunamadı. PATCH_AGENT_DOMAIN_ID tanımlayın",
    );
  }
  return tokenDomainId;
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(toBase64(parts[1]), "base64").toString("utf8");
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

function toBase64(base64url) {
  let output = String(base64url || "").replace(/-/g, "+").replace(/_/g, "/");
  while (output.length % 4 !== 0) output += "=";
  return output;
}

function enforceSecureTransport(apiBase) {
  const url = new URL(apiBase);
  const localhostHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocalhost = localhostHosts.has(url.hostname);

  if (!isLocalhost && url.protocol !== "https:") {
    throw new Error("Localhost dışı API endpoint'i için HTTPS zorunlu");
  }
}

async function runCycle() {
  const payload = await request("/patches/pending", "GET");
  const patches = Array.isArray(payload?.patches) ? payload.patches : [];

  if (patches.length === 0) {
    console.log("[PatchAgent] Bekleyen patch yok.");
    return;
  }

  console.log(`[PatchAgent] ${patches.length} patch alındı.`);

  for (const patch of patches) {
    try {
      await processPatch(patch);
    } catch (error) {
      const patchId = patch && patch.id ? `#${patch.id}` : "(id yok)";
      console.error(`[PatchAgent] Patch ${patchId} işlenemedi:`, error.message);
    }
  }
}

async function processPatch(patch) {
  validatePatch(patch);
  verifyPatchSignature(patch);

  const targetFile = resolveTargetFile(patch);
  const applyResult =
    patch.patch_type === "css"
      ? await applyCssPatch(patch, targetFile)
      : await applyHtmlPatch(patch, targetFile);

  if (applyResult.status === "applied") {
    console.log(`[PatchAgent] Patch #${patch.id} uygulandı -> ${targetFile}`);
  } else {
    console.log(`[PatchAgent] Patch #${patch.id} zaten uygulanmış.`);
  }

  await request("/patches/applied", "POST", {
    patchId: patch.id,
    patchSignature: patch.patch_signature,
  });
}

function validatePatch(patch) {
  if (!patch || typeof patch !== "object") {
    throw new Error("Patch formatı geçersiz");
  }

  if (!Number.isInteger(Number(patch.id)) || Number(patch.id) <= 0) {
    throw new Error("Patch ID geçersiz");
  }

  if (!["css", "html"].includes(String(patch.patch_type))) {
    throw new Error(`Desteklenmeyen patch türü: ${patch.patch_type}`);
  }

  if (!patch.patch_content || !patch.patch_signature) {
    throw new Error("Patch content veya signature eksik");
  }
}

function verifyPatchSignature(patch) {
  const expected = crypto
    .createHmac("sha256", config.signingKey)
    .update(`${config.domainId}:${patch.patch_type}:${patch.patch_content}`)
    .digest("hex");
  const actual = String(patch.patch_signature || "").trim().toLowerCase();
  if (actual.length !== expected.length) {
    throw new Error(`Patch #${patch.id} imza uzunluğu geçersiz`);
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error(`Patch #${patch.id} imza doğrulaması başarısız`);
  }
}

function resolveTargetFile(patch) {
  const filePath = String(patch.file_path || "").trim();
  if (filePath.includes("\0")) {
    throw new Error("Patch file_path geçersiz");
  }

  let resolvedTarget;
  if (filePath) {
    resolvedTarget = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(config.workdir, filePath);
  } else {
    resolvedTarget = patch.patch_type === "css" ? config.cssTarget : config.htmlTarget;
  }

  assertPathInside(config.workdir, resolvedTarget, "Patch target");

  const extension = path.extname(resolvedTarget).toLowerCase();
  if (patch.patch_type === "css" && extension !== ".css") {
    throw new Error("CSS patch hedefi .css uzantılı olmalı");
  }
  if (
    patch.patch_type === "html" &&
    !new Set([".html", ".htm"]).has(extension)
  ) {
    throw new Error("HTML patch hedefi .html/.htm uzantılı olmalı");
  }

  return resolvedTarget;
}

async function applyCssPatch(patch, targetFile) {
  const marker = `WCAGTR_PATCH_${patch.id}`;
  const startMarker = `/* ${marker}_START */`;
  const endMarker = `/* ${marker}_END */`;
  const existing = await readFileOrEmpty(targetFile);

  if (existing.includes(startMarker)) {
    return { status: "already_applied" };
  }

  await backupBeforeWrite(targetFile, existing);
  await ensureParentDir(targetFile);

  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  const block = `${separator}${startMarker}\n${patch.patch_content}\n${endMarker}\n`;
  await fs.writeFile(targetFile, `${existing}${block}`, "utf8");

  return { status: "applied" };
}

async function applyHtmlPatch(patch, targetFile) {
  const marker = `WCAGTR_PATCH_${patch.id}`;
  const startMarker = `<!-- ${marker}_START -->`;
  const endMarker = `<!-- ${marker}_END -->`;
  const existing = await readFileOrEmpty(targetFile);

  if (existing.includes(startMarker)) {
    return { status: "already_applied" };
  }

  const transformed = tryApplyHtmlAttributePatch(existing, patch.patch_content);
  await backupBeforeWrite(targetFile, existing);
  await ensureParentDir(targetFile);

  if (transformed.changed) {
    await fs.writeFile(targetFile, transformed.content, "utf8");
    return { status: "applied" };
  }

  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  const block = `${separator}${startMarker}\n${patch.patch_content}\n${endMarker}\n`;
  await fs.writeFile(targetFile, `${existing}${block}`, "utf8");
  return { status: "applied" };
}

function tryApplyHtmlAttributePatch(html, patchContent) {
  let parsed = null;
  try {
    parsed = JSON.parse(patchContent);
  } catch (error) {
    return { changed: false, content: html };
  }

  if (!parsed || parsed.selector !== "html" || !parsed.attributes) {
    return { changed: false, content: html };
  }

  const htmlTagMatch = html.match(/<html\b[^>]*>/i);
  if (!htmlTagMatch) return { changed: false, content: html };

  let htmlTag = htmlTagMatch[0];
  const attributes = Object.entries(parsed.attributes);
  for (const [name, value] of attributes) {
    const attrRegex = new RegExp(`\\s${name}="[^"]*"`, "i");
    if (attrRegex.test(htmlTag)) {
      htmlTag = htmlTag.replace(attrRegex, ` ${name}="${escapeAttribute(value)}"`);
    } else {
      htmlTag = htmlTag.replace(">", ` ${name}="${escapeAttribute(value)}">`);
    }
  }

  const replaced = html.replace(htmlTagMatch[0], htmlTag);
  if (replaced === html) return { changed: false, content: html };
  return { changed: true, content: replaced };
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}

async function backupBeforeWrite(targetFile, originalContent) {
  if (!originalContent) return;

  await fs.mkdir(config.backupDir, { recursive: true });
  const backupPrefix = sanitizeFileName(targetFile);
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const backupPath = path.join(
    config.backupDir,
    `${backupPrefix}.${timestamp}.bak`,
  );

  await fs.writeFile(backupPath, originalContent, "utf8");
  await pruneBackups(backupPrefix);
}

async function pruneBackups(backupPrefix) {
  const files = await fs.readdir(config.backupDir);
  const matching = files
    .filter((file) => file.startsWith(`${backupPrefix}.`) && file.endsWith(".bak"))
    .sort()
    .reverse();

  const removable = matching.slice(MAX_BACKUPS_PER_FILE);
  for (const file of removable) {
    await fs.unlink(path.join(config.backupDir, file));
  }
}

async function ensureParentDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function readFileOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function sanitizeFileName(filePath) {
  return path.resolve(filePath).replace(/[^\w.-]/g, "_");
}

async function request(endpoint, method, body) {
  const url = `${config.apiBase}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.widgetToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `API hata ${response.status}: ${payload.error || response.statusText}`,
    );
  }

  return payload;
}

function printStartup() {
  console.log("[PatchAgent] Başlatıldı");
  console.log(`[PatchAgent] API: ${config.apiBase}`);
  console.log(`[PatchAgent] Domain ID: ${config.domainId}`);
  console.log(`[PatchAgent] Poll: ${config.pollIntervalMs}ms`);
  console.log(`[PatchAgent] CSS hedefi: ${config.cssTarget}`);
  console.log(`[PatchAgent] HTML hedefi: ${config.htmlTarget}`);
}

main().catch((error) => {
  console.error("[PatchAgent] Başlatma hatası:", error.message);
  process.exit(1);
});
