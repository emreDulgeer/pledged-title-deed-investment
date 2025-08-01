const PropertyDto = require("./PropertyDto");

class PropertyDetailDto extends PropertyDto {
  constructor(property) {
    super(property);

    // İstatistik bilgileri
    this.viewCount = property.viewCount || 0;
    this.favoriteCount = property.favoriteCount || 0;
    this.investmentOfferCount = property.investmentOfferCount || 0;

    // Owner detaylı bilgileri - PDF gereksinimleri
    if (property.owner && typeof property.owner === "object") {
      this.owner = {
        id: property.owner._id,
        fullName: property.owner.fullName,
        email: property.owner.email,
        phone: property.owner.phoneNumber,
        country: property.owner.country,
        trustScore:
          property.owner.ownerTrustScore || property.owner.trustScore || 50,
        totalProperties: property.owner.totalProperties || 0,
        completedContracts: property.owner.completedContracts || 0,
        ongoingContracts: property.owner.ongoingContracts || 0,
        memberSince: property.owner.createdAt,
        verificationStatus: property.owner.kycStatus,
      };
    }

    // Hesaplama bilgileri
    this.calculations = {
      monthlyRent: property.rentOffered,
      yearlyRent: property.rentOffered * 12,
      totalReturnAmount: property.rentOffered * property.contractPeriodMonths,
      roi: (
        ((property.rentOffered * property.contractPeriodMonths) /
          property.requestedInvestment) *
        100
      ).toFixed(2),
    };

    // Öne çıkarma bilgisi
    if (property.isFeatured) {
      this.featuredInfo = {
        isFeatured: true,
        featuredUntil: property.featuredUntil,
      };
    }
  }
}

module.exports = PropertyDetailDto;
