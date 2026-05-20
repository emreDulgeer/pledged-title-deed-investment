function normalizeSupportLevel(level) {
  switch (level) {
    case "priority":
      return "priority";
    case "dedicated":
    case "vip":
      return "dedicated";
    default:
      return "basic";
  }
}

function getFeatureRoot(planOrFeatures = {}) {
  return planOrFeatures.features || planOrFeatures;
}

function buildMembershipFeatureSnapshot(planOrFeatures = {}) {
  const features = getFeatureRoot(planOrFeatures);
  const serviceDiscounts = Object.values(
    features?.services?.serviceDiscounts || {}
  ).filter((value) => Number.isFinite(value));

  return {
    maxActiveInvestments: features?.investments?.maxActiveInvestments ?? 1,
    platformCommissionDiscount:
      features?.commissions?.platformCommissionDiscount ?? 0,
    rentalCommissionDiscount:
      features?.commissions?.rentalCommissionDiscount ?? 0,
    supportLevel: normalizeSupportLevel(features?.support?.level),
    includedServices: features?.services?.includedServices || [],
    serviceDiscountRate:
      serviceDiscounts.length > 0 ? Math.max(...serviceDiscounts) : 0,
    hasAnalyticsAccess: Boolean(
      features?.analytics?.hasBasicAnalytics ||
        features?.analytics?.hasAdvancedAnalytics
    ),
    hasApiAccess: Boolean(features?.api?.hasAccess || features?.api?.enabled),
    hasCustomReports: Boolean(features?.analytics?.hasCustomReports),
    hasPriorityListings: Boolean(features?.properties?.priorityListing),
  };
}

function getMaxActiveInvestments(features = {}) {
  return (
    features?.maxActiveInvestments ??
    features?.investments?.maxActiveInvestments ??
    1
  );
}

function getCommissionDiscount(features = {}, type = "platform") {
  const discountField =
    type === "rental"
      ? "rentalCommissionDiscount"
      : "platformCommissionDiscount";

  return (
    features?.[discountField] ??
    features?.commissions?.[discountField] ??
    0
  );
}

module.exports = {
  buildMembershipFeatureSnapshot,
  getCommissionDiscount,
  getMaxActiveInvestments,
  normalizeSupportLevel,
};
