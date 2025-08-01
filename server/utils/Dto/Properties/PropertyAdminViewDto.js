class PropertyAdminViewDto {
  constructor(property) {
    this.id = property._id;
    this.country = property.country;
    this.city = property.city;
    this.fullAddress = property.fullAddress;
    this.locationPin = property.locationPin;
    this.description = property.description;
    this.propertyType = property.propertyType;
    this.size = property.size;
    this.rooms = property.rooms;
    this.estimatedValue = property.estimatedValue;
    this.requestedInvestment = property.requestedInvestment;
    this.rentOffered = property.rentOffered;
    this.annualYieldPercent = property.annualYieldPercent;
    this.currency = property.currency;
    this.contractPeriodMonths = property.contractPeriodMonths;
    this.images = property.images;
    this.documents = property.documents;
    this.status = property.status;
    this.trustScore = property.trustScore;
    this.createdAt = property.createdAt;
    this.updatedAt = property.updatedAt;

    // Owner detaylı bilgileri
    if (property.owner && typeof property.owner === "object") {
      this.owner = {
        id: property.owner._id,
        fullName: property.owner.fullName,
        email: property.owner.email,
        phone: property.owner.phoneNumber,
        country: property.owner.country,
        trustScore:
          property.owner.ownerTrustScore || property.owner.trustScore || 50,
        verificationStatus: property.owner.kycStatus,
        membershipPlan: property.owner.membershipPlan,
        totalProperties: property.owner.totalProperties || 0,
        completedContracts: property.owner.completedContracts || 0,
        ongoingContracts: property.owner.ongoingContracts || 0,
      };
    }

    // Admin için metadata - flaggedIssues dahil
    this.metadata = {
      lastStatusChange: property.lastStatusChange,
      reviewNotes: property.reviewNotes,
      flaggedIssues: property.flaggedIssues || [], // Admin için flagged issues
      totalViews: property.viewCount || 0,
      totalFavorites: property.favoriteCount || 0,
      totalOffers: property.investmentOfferCount || 0,
    };

    // Öne çıkarma bilgileri
    if (property.isFeatured) {
      this.featuredInfo = {
        isFeatured: true,
        featuredAt: property.featuredAt,
        featuredUntil: property.featuredUntil,
        featuredWeeks: property.featuredWeeks,
      };
    }
  }
}

module.exports = PropertyAdminViewDto;
