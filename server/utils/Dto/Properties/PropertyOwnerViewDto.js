const PropertyDto = require("./PropertyDto");

class PropertyOwnerViewDto extends PropertyDto {
  constructor(property) {
    super(property);

    // Owner için detaylı istatistikler
    this.statistics = {
      viewCount: property.viewCount || 0,
      favoriteCount: property.favoriteCount || 0,
      investmentOfferCount: property.investmentOfferCount || 0,
      // Günlük ortalama görüntülenme
      viewsPerDay: property.viewCount
        ? (
            property.viewCount /
            Math.max(
              1,
              Math.floor(
                (Date.now() - property.createdAt) / (1000 * 60 * 60 * 24)
              )
            )
          ).toFixed(2)
        : 0,
    };

    // Admin notları ve flagler - Owner bunları görebilmeli
    this.adminFeedback = {
      reviewNotes: property.reviewNotes || null,
      flaggedIssues: property.flaggedIssues || [],
      hasFeedback: !!(
        property.reviewNotes ||
        (property.flaggedIssues && property.flaggedIssues.length > 0)
      ),
      lastStatusChange: property.lastStatusChange,
    };

    // Hesaplamalar
    this.calculations = {
      monthlyRent: property.rentOffered,
      yearlyRent: property.rentOffered * 12,
      totalReturnAmount: property.rentOffered * property.contractPeriodMonths,
      roi: property.requestedInvestment
        ? (
            ((property.rentOffered * 12) / property.requestedInvestment) *
            100
          ).toFixed(2)
        : 0,
    };

    // Öne çıkarma bilgisi
    if (property.isFeatured) {
      this.featuredInfo = {
        isFeatured: true,
        featuredAt: property.featuredAt,
        featuredUntil: property.featuredUntil,
        daysRemaining: property.featuredUntil
          ? Math.max(
              0,
              Math.floor(
                (new Date(property.featuredUntil) - new Date()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          : 0,
      };
    }

    // Durum bazlı uyarılar
    this.alerts = [];

    // Flagler varsa uyarı ekle
    if (property.flaggedIssues && property.flaggedIssues.length > 0) {
      this.alerts.push({
        type: "warning",
        message: `Admin tarafından ${property.flaggedIssues.length} sorun işaretlendi`,
        priority: "high",
      });
    }

    // Pending review durumundaysa
    if (property.status === "pending_review") {
      this.alerts.push({
        type: "info",
        message: "İlanınız inceleme bekliyor",
        priority: "medium",
      });
    }

    // Draft durumundaysa
    if (property.status === "draft") {
      this.alerts.push({
        type: "info",
        message: "İlanınız taslak durumunda, yayınlamak için tamamlayın",
        priority: "low",
      });
    }
  }
}

module.exports = PropertyOwnerViewDto;
