const PLAN_DOMAIN_LIMIT_FALLBACK = {
  trial: 1,
  basic: 3,
  starter: 3,
  pro: 10,
  professional: 10,
  enterprise: null,
};

const SERVER_PATCH_PLAN_FALLBACK = new Set(["enterprise"]);

function normalizeFeatureList(features) {
  if (!Array.isArray(features)) return [];
  return features
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function parseDomainLimitFeature(featureText) {
  if (
    featureText.includes("sınırsız domain") ||
    featureText.includes("unlimited domain")
  ) {
    return { matched: true, limit: null };
  }

  const match = featureText.match(/(\d+)\s*domain/u);
  if (!match) {
    return { matched: false, limit: null };
  }

  const parsed = Number.parseInt(match[1], 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { matched: false, limit: null };
  }

  return { matched: true, limit: parsed };
}

export function getDomainLimit(planCode, features) {
  const normalizedFeatures = normalizeFeatureList(features);
  for (const feature of normalizedFeatures) {
    const parsed = parseDomainLimitFeature(feature);
    if (parsed.matched) {
      return parsed.limit;
    }
  }

  const normalizedPlan = String(planCode || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(PLAN_DOMAIN_LIMIT_FALLBACK, normalizedPlan)) {
    return PLAN_DOMAIN_LIMIT_FALLBACK[normalizedPlan];
  }

  return 1;
}

export function canUseServerPatch(planCode, features) {
  const normalizedFeatures = normalizeFeatureList(features);
  if (
    normalizedFeatures.some(
      (feature) =>
        feature.includes("patch agent") ||
        feature.includes("server patch") ||
        feature.includes("sunucu patch"),
    )
  ) {
    return true;
  }

  const normalizedPlan = String(planCode || "").trim().toLowerCase();
  return SERVER_PATCH_PLAN_FALLBACK.has(normalizedPlan);
}

export function isSubscriptionExpired(expiresAt) {
  if (!expiresAt) return false;
  const expiresDate = new Date(expiresAt);
  if (Number.isNaN(expiresDate.getTime())) return false;
  return expiresDate.getTime() <= Date.now();
}
