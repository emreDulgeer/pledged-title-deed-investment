// server/utils/dto/Investments/InvestmentAdminViewDto.js

class InvestmentAdminViewDto {
  constructor(investment) {
    this.id = investment._id;
    this.amountInvested = investment.amountInvested;
    this.currency = investment.currency;
    this.status = investment.status;
    this.contractFile = investment.contractFile;
    this.paymentReceipt = investment.paymentReceipt;
    this.titleDeedDocument = investment.titleDeedDocument;
    this.createdAt = investment.createdAt;
    this.updatedAt = investment.updatedAt;

    // Property detayları
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        fullAddress: investment.property.fullAddress,
        propertyType: investment.property.propertyType,
        estimatedValue: investment.property.estimatedValue,
        requestedInvestment: investment.property.requestedInvestment,
        rentOffered: investment.property.rentOffered,
        annualYieldPercent: investment.property.annualYieldPercent,
        contractPeriodMonths: investment.property.contractPeriodMonths,
        status: investment.property.status,
        trustScore: investment.property.trustScore,
      };

      // Property owner bilgileri
      if (investment.property.owner) {
        this.propertyOwner = {
          id: investment.property.owner._id || investment.property.owner,
          fullName: investment.property.owner.fullName,
          email: investment.property.owner.email,
          phone: investment.property.owner.phoneNumber,
          country: investment.property.owner.country,
          kycStatus: investment.property.owner.kycStatus,
          riskScore: investment.property.owner.riskScore,
        };
      }
    }

    // Investor detayları
    if (investment.investor && typeof investment.investor === "object") {
      this.investor = {
        id: investment.investor._id,
        fullName: investment.investor.fullName,
        email: investment.investor.email,
        phone: investment.investor.phoneNumber,
        country: investment.investor.country,
        membershipPlan: investment.investor.membershipPlan,
        kycStatus: investment.investor.kycStatus,
        riskScore: investment.investor.riskScore,
        activeInvestmentCount: investment.investor.activeInvestmentCount,
        investmentLimit: investment.investor.investmentLimit,
      };
    }

    // Tüm kira ödemeleri detayı
    this.rentalPayments = investment.rentalPayments;

    // Ödeme istatistikleri
    if (investment.rentalPayments && investment.rentalPayments.length > 0) {
      const paidPayments = investment.rentalPayments.filter(
        (p) => p.status === "paid"
      );
      const delayedPayments = investment.rentalPayments.filter(
        (p) => p.status === "delayed"
      );

      this.paymentStatistics = {
        totalPayments: investment.rentalPayments.length,
        paidPayments: paidPayments.length,
        pendingPayments: investment.rentalPayments.filter(
          (p) => p.status === "pending"
        ).length,
        delayedPayments: delayedPayments.length,
        totalPaidAmount: paidPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        ),
        totalDelayedAmount: delayedPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        ),
        paymentComplianceRate: (
          (paidPayments.length / investment.rentalPayments.length) *
          100
        ).toFixed(2),
      };
    }

    // Refund detayı
    this.refund = investment.refund;

    // Transfer detayı
    this.transferOfProperty = investment.transferOfProperty;

    // Risk göstergeleri
    this.riskIndicators = {
      investorRiskScore: investment.investor?.riskScore || 50,
      propertyOwnerRiskScore: investment.property?.owner?.riskScore || 50,
      paymentDelayCount:
        investment.rentalPayments?.filter((p) => p.status === "delayed")
          .length || 0,
      contractCompletionRate: this.calculateContractCompletionRate(investment),
      hasAllDocuments: !!(
        investment.contractFile && investment.titleDeedDocument
      ),
      kycCompliant:
        investment.investor?.kycStatus === "Approved" &&
        investment.property?.owner?.kycStatus === "Approved",
    };

    // Metadata
    this.metadata = {
      lastPaymentDate: this.getLastPaymentDate(investment.rentalPayments),
      nextPaymentDue: this.getNextPaymentDue(investment.rentalPayments),
      daysUntilContractEnd: this.calculateDaysUntilContractEnd(investment),
      totalReturnAmount:
        investment.amountInvested +
        (investment.property?.rentOffered || 0) *
          (investment.property?.contractPeriodMonths || 0),
    };
  }

  calculateContractCompletionRate(investment) {
    if (!investment.property?.contractPeriodMonths) return 0;
    const startDate = new Date(investment.createdAt);
    const now = new Date();
    const monthsPassed =
      (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth());
    return Math.min(
      100,
      ((monthsPassed / investment.property.contractPeriodMonths) * 100).toFixed(
        2
      )
    );
  }

  getLastPaymentDate(rentalPayments) {
    if (!rentalPayments || rentalPayments.length === 0) return null;
    const paidPayments = rentalPayments
      .filter((p) => p.status === "paid" && p.paidAt)
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
    return paidPayments.length > 0 ? paidPayments[0].paidAt : null;
  }

  getNextPaymentDue(rentalPayments) {
    if (!rentalPayments || rentalPayments.length === 0) return null;
    const pendingPayments = rentalPayments
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.month.localeCompare(b.month));
    return pendingPayments.length > 0 ? pendingPayments[0].month : null;
  }

  calculateDaysUntilContractEnd(investment) {
    if (!investment.property?.contractPeriodMonths || !investment.createdAt)
      return null;
    const startDate = new Date(investment.createdAt);
    const endDate = new Date(startDate);
    endDate.setMonth(
      endDate.getMonth() + investment.property.contractPeriodMonths
    );
    const now = new Date();
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }
}

module.exports = InvestmentAdminViewDto;
