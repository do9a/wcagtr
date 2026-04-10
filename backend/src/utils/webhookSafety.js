import dns from "dns/promises";
import net from "net";

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function shouldAllowPrivateWebhookTargets() {
  return (
    String(process.env.ALLOW_PRIVATE_WEBHOOK_TARGETS || "false").toLowerCase() ===
    "true"
  );
}

function ipv4ToInt(ip) {
  const parts = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }

  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  );
}

function inIpv4Range(ip, start, end) {
  const value = ipv4ToInt(ip);
  if (value === null) return false;
  return value >= ipv4ToInt(start) && value <= ipv4ToInt(end);
}

function isPrivateOrReservedIpv4(ip) {
  return (
    inIpv4Range(ip, "0.0.0.0", "0.255.255.255") ||
    inIpv4Range(ip, "10.0.0.0", "10.255.255.255") ||
    inIpv4Range(ip, "100.64.0.0", "100.127.255.255") ||
    inIpv4Range(ip, "127.0.0.0", "127.255.255.255") ||
    inIpv4Range(ip, "169.254.0.0", "169.254.255.255") ||
    inIpv4Range(ip, "172.16.0.0", "172.31.255.255") ||
    inIpv4Range(ip, "192.0.0.0", "192.0.0.255") ||
    inIpv4Range(ip, "192.168.0.0", "192.168.255.255") ||
    inIpv4Range(ip, "198.18.0.0", "198.19.255.255") ||
    inIpv4Range(ip, "224.0.0.0", "255.255.255.255")
  );
}

function isPrivateOrReservedIpv6(ip) {
  const normalized = String(ip || "").trim().toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  );
}

function isPrivateOrReservedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateOrReservedIpv4(ip);
  if (version === 6) return isPrivateOrReservedIpv6(ip);
  return false;
}

function isBlockedHostname(hostname) {
  const normalized = String(hostname || "").trim().toLowerCase();
  if (!normalized) return true;
  if (LOCALHOST_HOSTS.has(normalized)) return true;
  return (
    normalized.endsWith(".local") ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".home.arpa")
  );
}

async function assertPublicDnsResolution(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Webhook hedefi çözümlenemedi");
  }

  for (const record of records) {
    const ip = String(record?.address || "").trim();
    if (!ip) {
      throw new Error("Webhook hedefi için geçersiz DNS kaydı");
    }
    if (isPrivateOrReservedIp(ip)) {
      throw new Error("Webhook URL iç ağ veya rezerve IP'ye çözülüyor");
    }
  }
}

export async function assertSafeWebhookUrl(rawUrl) {
  const allowPrivateTargets = shouldAllowPrivateWebhookTargets();
  const parsed = new URL(String(rawUrl || "").trim());

  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL kimlik bilgisi içeremez");
  }

  const isLocalhost = LOCALHOST_HOSTS.has(parsed.hostname.toLowerCase());
  if (parsed.protocol !== "https:") {
    if (!(allowPrivateTargets && isLocalhost && parsed.protocol === "http:")) {
      throw new Error("Webhook URL için HTTPS zorunlu");
    }
  }

  if (!allowPrivateTargets && isBlockedHostname(parsed.hostname)) {
    throw new Error("Webhook URL localhost veya internal alan adı olamaz");
  }

  const ipVersion = net.isIP(parsed.hostname);
  if (ipVersion) {
    if (!allowPrivateTargets && isPrivateOrReservedIp(parsed.hostname)) {
      throw new Error("Webhook URL private/rezerve IP olamaz");
    }
  } else if (!allowPrivateTargets) {
    await assertPublicDnsResolution(parsed.hostname);
  }

  return parsed.toString();
}
