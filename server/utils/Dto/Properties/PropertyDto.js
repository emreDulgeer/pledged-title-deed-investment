const { APP_CURRENCY } = require("../../currency");

class PropertyDto {
  constructor(property) {
    this.id = property._id;
    this.country = property.country;
    this.city = property.city;
    this.fullAddress = property.fullAddress;
    this.mapSearchAddress = property.mapSearchAddress;
    this.locationPin = property.locationPin;
    this.description = property.description;
    this.propertyType = property.propertyType;
    this.size = property.size;
    this.rooms = property.rooms;
    this.estimatedValue = property.estimatedValue;
    this.requestedInvestment = property.requestedInvestment;
    this.rentOffered = property.rentOffered;
    this.annualYieldPercent = property.annualYieldPercent;
    this.currency = APP_CURRENCY;
    this.contractPeriodMonths = property.contractPeriodMonths;
    this.images = property.images;
    this.status = property.status;
    this.trustScore = property.trustScore;
    this.createdAt = property.createdAt;
    this.updatedAt = property.updatedAt;

    // Owner bilgilerini populate edilmişse ekle
    if (property.owner && typeof property.owner === "object") {
      this.owner = {
        id: property.owner._id,
        fullName: property.owner.fullName,
        trustScore: property.owner.trustScore,
        totalProperties: property.owner.totalProperties,
        completedContracts: property.owner.completedContracts,
      };
    } else {
      this.ownerId = property.owner;
    }
  }
}

module.exports = PropertyDto;
