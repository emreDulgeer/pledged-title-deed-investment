const PropertyDetailDto = require("./PropertyDetailDto");
const { getPrimaryPropertyImage } = require("../../propertyImages");

class PropertyInvestorViewDto extends PropertyDetailDto {
  constructor(property, investorId) {
    super(property);

    this.thumbnail = getPrimaryPropertyImage(property);

    if (property.owner && typeof property.owner === "object") {
      this.ownerName = property.owner.fullName;
      this.ownerTrustScore =
        property.owner.ownerTrustScore || property.owner.trustScore || 50;
      this.ownerCompletedContracts = property.owner.completedContracts || 0;
    }

    // Yatırımcıya özel bilgiler
    this.isFavorited =
      property.favorites && property.favorites.includes(investorId);
    this.hasActiveOffer = false; // Bu bilgi controller'da doldurulmalı
    this.isEligibleForInvestment = property.status === "published";

    // Yatırımcı için risk göstergeleri
    this.riskIndicators = {
      ownerTrustScore: property.owner?.trustScore || property.trustScore,
      propertyAge: this.calculatePropertyAge(property.createdAt),
      documentVerification: property.documents && property.documents.length > 0,
      locationVerified:
        property.locationPin &&
        property.locationPin.lat &&
        property.locationPin.lng,
    };
  }

  calculatePropertyAge(createdAt) {
    const days = Math.floor(
      (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)
    );
    return days;
  }
}

module.exports = PropertyInvestorViewDto;
