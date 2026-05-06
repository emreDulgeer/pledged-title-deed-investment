// server/utils/dto/Investments/InvestmentAdminViewDto.js

const { APP_CURRENCY } = require("../../currency");
const {
  getRepresentativeRegions,
} = require("../../representativeRegions");

class InvestmentAdminViewDto {
  constructor(investment) {
    this.id = investment._id;
    this.amountInvested = investment.amountInvested;
    this.currency = APP_CURRENCY;
    this.status = investment.status;
    this.contractFile = investment.contractFile;
    this.paymentReceipt = investment.paymentReceipt;
    this.titleDeedDocument = investment.titleDeedDocument;
    this.createdAt = investment.createdAt;
    this.updatedAt = investment.updatedAt;
    this.offerTerms = {
      ownershipPercent: investment.offerTerms?.ownershipPercent ?? null,
      desiredMonthlyRent: investment.offerTerms?.desiredMonthlyRent ?? null,
      annualYieldPercent: investment.offerTerms?.annualYieldPercent ?? null,
      message: investment.offerTerms?.message || "",
    };
    this.offerDecision = {
      acceptedAt: investment.offerDecision?.acceptedAt || null,
      rejectedAt: investment.offerDecision?.rejectedAt || null,
      rejectionReason: investment.offerDecision?.rejectionReason || null,
      decidedBy: investment.offerDecision?.decidedBy || null,
    };
    this.contractWorkflow = {
      investorSigned: investment.contractWorkflow?.investorSigned || null,
      ownerSigned: investment.contractWorkflow?.ownerSigned || null,
      fullySignedAt: investment.contractWorkflow?.fullySignedAt || null,
    };
    this.principalPayment = {
      status: investment.principalPayment?.status || "not_started",
      providerKey: investment.principalPayment?.providerKey || null,
      providerLabel: investment.principalPayment?.providerLabel || null,
      method: investment.principalPayment?.method || null,
      amount: investment.principalPayment?.amount || investment.amountInvested,
      currency: investment.principalPayment?.currency || this.currency,
      referenceCode: investment.principalPayment?.referenceCode || null,
      instructions: investment.principalPayment?.instructions || null,
      initiatedAt: investment.principalPayment?.initiatedAt || null,
      receiptUploadedAt: investment.principalPayment?.receiptUploadedAt || null,
      confirmedAt: investment.principalPayment?.confirmedAt || null,
      confirmedBy: investment.principalPayment?.confirmedBy || null,
    };

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

    }

    // Property owner bilgileri
    if (
      investment.propertyOwner &&
      typeof investment.propertyOwner === "object"
    ) {
      this.propertyOwner = {
        id: investment.propertyOwner._id,
        fullName: investment.propertyOwner.fullName,
        email: investment.propertyOwner.email,
        phone: investment.propertyOwner.phoneNumber,
        country: investment.propertyOwner.country,
        kycStatus: investment.propertyOwner.kycStatus,
        riskScore:
          investment.propertyOwner.ownerTrustScore ??
          investment.propertyOwner.trustScore ??
          50,
      };
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

    if (
      investment.localRepresentative &&
      typeof investment.localRepresentative === "object"
    ) {
      this.localRepresentative = {
        id: investment.localRepresentative._id,
        fullName: investment.localRepresentative.fullName,
        email: investment.localRepresentative.email,
        phone: investment.localRepresentative.phoneNumber,
        region: investment.localRepresentative.region || null,
        regions: getRepresentativeRegions(investment.localRepresentative),
      };
    }

    if (
      investment.representativeRequestedBy ||
      investment.representativeRequestStatus === "pending"
    ) {
      this.representativeRequest = {
        requestedBy:
          investment.representativeRequestedBy?._id ||
          investment.representativeRequestedBy ||
          null,
        requestedByRole: investment.representativeRequestedByRole || null,
        requestDate: investment.representativeRequestDate || null,
        region: investment.representativeRequestedRegion || null,
        status: investment.representativeRequestStatus || "none",
        claimedAt: investment.representativeRequestClaimedAt || null,
        resolvedAt: investment.representativeRequestResolvedAt || null,
        isPending:
          investment.representativeRequestStatus === "pending" &&
          !investment.localRepresentative,
      };
    }

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
        (investment.offerTerms?.desiredMonthlyRent ||
          investment.property?.rentOffered ||
          0) *
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
