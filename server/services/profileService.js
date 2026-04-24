const User = require("../models/User");
const Property = require("../models/Property");
const Investment = require("../models/Investment");
const { getPrimaryPropertyImage } = require("../utils/propertyImages");
const { APP_CURRENCY } = require("../utils/currency");

class ProfileService {
  async getProfileById(userId, viewer = null) {
    const user = await User.findById(userId).select("-password").lean();

    if (!user || user.accountStatus === "deleted") {
      throw new Error("Profile not found");
    }

    const isAdminViewer = viewer?.role === "admin";
    const properties = await this.getPropertiesForProfile(user, isAdminViewer);
    const investments = isAdminViewer
      ? await this.getInvestmentsForProfile(user)
      : [];

    return {
      id: String(user._id),
      fullName: user.fullName,
      role: user.role,
      country: user.country || null,
      region: user.region || null,
      memberSince: user.createdAt || null,
      kycStatus: user.kycStatus || null,
      trustScore: this.resolveTrustScore(user),
      viewMode: isAdminViewer ? "private" : "public",
      stats: this.buildStats(user, properties, investments, isAdminViewer),
      contact: isAdminViewer
        ? {
            email: user.email || null,
            phoneNumber: user.phoneNumber || null,
          }
        : null,
      account: isAdminViewer
        ? {
            accountStatus: user.accountStatus || null,
            membershipPlan: user.membershipPlan || null,
            membershipStatus: user.membershipStatus || null,
            emailVerified: !!user.emailVerified,
            phoneVerified: !!user.phoneVerified,
            lastLoginAt: user.lastLoginAt || null,
          }
        : null,
      properties,
      investments,
    };
  }

  async getPropertiesForProfile(user, isAdminViewer) {
    if (user.role !== "property_owner") {
      return [];
    }

    const filter = { owner: user._id };
    if (!isAdminViewer) {
      filter.status = "published";
    }

    const properties = await Property.find(filter).sort({ createdAt: -1 }).lean();

    return properties.map((property) =>
      this.mapPropertySummary(property, isAdminViewer),
    );
  }

  async getInvestmentsForProfile(user) {
    const filter = this.getInvestmentFilterForRole(user);
    if (!filter) {
      return [];
    }

    const investments = await Investment.find(filter)
      .populate(
        "property",
        "country city fullAddress propertyType status requestedInvestment currency rentOffered annualYieldPercent contractPeriodMonths images",
      )
      .populate("investor", "fullName email country role")
      .populate(
        "propertyOwner",
        "fullName email phoneNumber country role ownerTrustScore trustScore",
      )
      .populate("localRepresentative", "fullName email country region role")
      .sort({ createdAt: -1 })
      .lean();

    return investments.map((investment) => this.mapInvestmentSummary(investment));
  }

  getInvestmentFilterForRole(user) {
    switch (user.role) {
      case "investor":
        return { investor: user._id };
      case "property_owner":
        return { propertyOwner: user._id };
      case "local_representative":
        return { localRepresentative: user._id };
      default:
        return null;
    }
  }

  mapPropertySummary(property, isPrivateView = false) {
    const primaryImage = getPrimaryPropertyImage(property);

    return {
      id: String(property._id),
      city: property.city,
      country: property.country,
      fullAddress: isPrivateView ? property.fullAddress || null : null,
      propertyType: property.propertyType || null,
      requestedInvestment: property.requestedInvestment ?? null,
      currency: APP_CURRENCY,
      annualYieldPercent: property.annualYieldPercent ?? null,
      rentOffered: property.rentOffered ?? null,
      contractPeriodMonths: property.contractPeriodMonths ?? null,
      status: property.status,
      createdAt: property.createdAt || null,
      thumbnail: primaryImage || null,
    };
  }

  mapInvestmentSummary(investment) {
    return {
      id: String(investment._id),
      amountInvested: investment.amountInvested ?? null,
      currency: APP_CURRENCY,
      status: investment.status,
      createdAt: investment.createdAt || null,
      property: investment.property
        ? {
            id: String(investment.property._id),
            city: investment.property.city || null,
            country: investment.property.country || null,
            fullAddress: investment.property.fullAddress || null,
            propertyType: investment.property.propertyType || null,
            requestedInvestment: investment.property.requestedInvestment ?? null,
            currency: APP_CURRENCY,
            status: investment.property.status || null,
          }
        : null,
      investor: this.mapUserBrief(investment.investor, {
        includeEmail: true,
      }),
      propertyOwner: this.mapUserBrief(investment.propertyOwner, {
        includeEmail: true,
        includePhone: true,
      }),
      localRepresentative: this.mapUserBrief(investment.localRepresentative, {
        includeEmail: true,
      }),
    };
  }

  mapUserBrief(user, options = {}) {
    if (!user) {
      return null;
    }

    const { includeEmail = false, includePhone = false } = options;
    const userId = user._id || user.id || user;

    return {
      id: userId ? String(userId) : null,
      fullName: user.fullName || "User",
      role: user.role || null,
      country: user.country || null,
      region: user.region || null,
      ...(includeEmail ? { email: user.email || null } : {}),
      ...(includePhone ? { phoneNumber: user.phoneNumber || null } : {}),
    };
  }

  buildStats(user, properties, investments, isAdminViewer) {
    if (!isAdminViewer) {
      if (user.role === "property_owner") {
        return {
          publishedProperties: properties.length,
          completedContracts: user.completedContracts || 0,
          ongoingContracts: user.ongoingContracts || 0,
        };
      }

      return {};
    }

    const publishedProperties = properties.filter(
      (property) => property.status === "published",
    ).length;
    const activeInvestments = investments.filter((investment) =>
      ["offer_sent", "contract_signed", "title_deed_pending", "active"].includes(
        investment.status,
      ),
    ).length;

    return {
      totalProperties: properties.length,
      publishedProperties,
      totalInvestments: investments.length,
      activeInvestments,
      completedContracts: user.completedContracts || 0,
      ongoingContracts: user.ongoingContracts || 0,
      investmentLimit:
        user.role === "investor" ? user.investmentLimit ?? null : null,
      activeInvestmentCount:
        user.role === "investor" ? user.activeInvestmentCount ?? 0 : null,
    };
  }

  resolveTrustScore(user) {
    if (user.role === "property_owner") {
      return user.ownerTrustScore ?? user.trustScore ?? null;
    }

    return user.trustScore ?? null;
  }
}

module.exports = ProfileService;
