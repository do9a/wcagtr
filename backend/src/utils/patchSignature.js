import crypto from "crypto";

export function getPatchSigningKey() {
  const key = process.env.TOKEN_SIGNING_KEY || process.env.JWT_SECRET;
  if (!key || key.length < 32) {
    throw new Error("TOKEN_SIGNING_KEY veya JWT_SECRET en az 32 karakter olmalı");
  }
  return key;
}

export function createPatchSignature(domainId, patchType, patchContent) {
  if (!domainId) {
    throw new Error("Patch imzası için domainId gerekli");
  }

  return crypto
    .createHmac("sha256", getPatchSigningKey())
    .update(`${domainId}:${patchType}:${patchContent}`)
    .digest("hex");
}
