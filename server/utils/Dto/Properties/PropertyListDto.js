class PropertyListDto {
  constructor(property) {
    this.id = property._id;
    this.country = property.country;
    this.city = property.city;
    this.propertyType = property.propertyType;
    this.size = property.size;
    this.rooms = property.rooms;
    this.requestedInvestment = property.requestedInvestment;
    this.rentOffered = property.rentOffered;
    this.annualYieldPercent = property.annualYieldPercent;
    this.currency = property.currency;
    this.contractPeriodMonths = property.contractPeriodMonths;
    this.status = property.status;
    this.trustScore = property.trustScore;
    this.description = property.description;

    this.thumbnail =
      property.images && property.images.length > 0 ? property.images[0] : null;

    // PDF'e göre ilan kartında görünmesi gereken ek bilgiler
    if (property.owner && typeof property.owner === "object") {
      this.ownerName = property.owner.fullName;
      this.ownerTrustScore =
        property.owner.ownerTrustScore || property.owner.trustScore || 50;
      this.ownerCompletedContracts = property.owner.completedContracts || 0;
    }

    // "Bu ilan X kez yatırım aldı" bilgisi
    this.investmentOfferCount = property.investmentOfferCount || 0;

    // Öne çıkarılmış ilan bilgisi
    this.isFeatured = property.isFeatured || false;

    this.createdAt = property.createdAt;
  }
}

module.exports = PropertyListDto;
