// server/utils/dto/Investments/InvestmentDto.js

const { APP_CURRENCY } = require("../../currency");
const {
  getRepresentativeRegions,
} = require("../../representativeRegions");

const mapFileInfo = (file) => {
  if (!file) return null;

  return {
    fileId: file.fileId?._id || file.fileId || null,
    url: file.url,
    uploadedAt: file.uploadedAt || null,
    uploadedBy: file.uploadedBy || null,
  };
};

class InvestmentDto {
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
      investorSigned: mapFileInfo(investment.contractWorkflow?.investorSigned),
      ownerSigned: mapFileInfo(investment.contractWorkflow?.ownerSigned),
      fullySignedAt: investment.contractWorkflow?.fullySignedAt || null,
    };
    this.principalPayment = {
      status: investment.principalPayment?.status || "not_started",
      providerKey: investment.principalPayment?.providerKey || null,
      providerLabel: investment.principalPayment?.providerLabel || null,
      method: investment.principalPayment?.method || null,
      amount: investment.principalPayment?.amount || investment.amountInvested,
      currency:
        investment.principalPayment?.currency || investment.currency || APP_CURRENCY,
      referenceCode: investment.principalPayment?.referenceCode || null,
      instructions: investment.principalPayment?.instructions || null,
      initiatedAt: investment.principalPayment?.initiatedAt || null,
      receiptUploadedAt: investment.principalPayment?.receiptUploadedAt || null,
      confirmedAt: investment.principalPayment?.confirmedAt || null,
      confirmedBy: investment.principalPayment?.confirmedBy || null,
    };

    // Property bilgileri
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        propertyType: investment.property.propertyType,
        rentOffered: investment.property.rentOffered,
        annualYieldPercent: investment.property.annualYieldPercent,
        contractPeriodMonths: investment.property.contractPeriodMonths,
      };
    } else {
      this.propertyId = investment.property;
    }

    // Investor bilgileri
    if (investment.investor && typeof investment.investor === "object") {
      this.investor = {
        id: investment.investor._id,
        fullName: investment.investor.fullName,
        email: investment.investor.email,
      };
    } else {
      this.investorId = investment.investor;
    }

    if (
      investment.localRepresentative &&
      typeof investment.localRepresentative === "object"
    ) {
      this.localRepresentative = {
        id: investment.localRepresentative._id,
        fullName: investment.localRepresentative.fullName,
        email: investment.localRepresentative.email,
        region: investment.localRepresentative.region || null,
        regions: getRepresentativeRegions(investment.localRepresentative),
      };
    } else if (investment.localRepresentative) {
      this.localRepresentativeId = investment.localRepresentative;
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

    // Rental payments özeti
    if (investment.rentalPayments && investment.rentalPayments.length > 0) {
      this.rentalPaymentsSummary = {
        total: investment.rentalPayments.length,
        paid: investment.rentalPayments.filter((p) => p.status === "paid")
          .length,
        pending: investment.rentalPayments.filter((p) => p.status === "pending")
          .length,
        delayed: investment.rentalPayments.filter((p) => p.status === "delayed")
          .length,
      };
    }

    // Refund bilgisi
    if (investment.refund && investment.refund.refunded) {
      this.refund = {
        refunded: true,
        amount: investment.refund.amount,
        refundedAt: investment.refund.refundedAt,
      };
    }

    // Transfer bilgisi
    if (
      investment.transferOfProperty &&
      investment.transferOfProperty.transferred
    ) {
      this.propertyTransfer = {
        transferred: true,
        date: investment.transferOfProperty.date,
        method: investment.transferOfProperty.method,
      };
    }
  }
}

module.exports = InvestmentDto;
