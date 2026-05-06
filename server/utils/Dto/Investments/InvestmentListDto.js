// server/utils/dto/Investments/InvestmentListDto.js

const { getPrimaryPropertyImage } = require("../../propertyImages");
const { APP_CURRENCY } = require("../../currency");
const {
  getRepresentativeRegions,
} = require("../../representativeRegions");

class InvestmentListDto {
  constructor(investment) {
    this.id = investment._id;
    this.amountInvested = investment.amountInvested;
    this.currency = APP_CURRENCY;
    this.status = investment.status;
    this.createdAt = investment.createdAt;
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
    };

    // Property özet bilgileri
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        propertyType: investment.property.propertyType,
        thumbnail: getPrimaryPropertyImage(investment.property),
      };

      // Beklenen toplam gelir
      this.expectedTotalIncome =
        (investment.offerTerms?.desiredMonthlyRent ||
          investment.property.rentOffered) *
        investment.property.contractPeriodMonths;
    }

    if (
      investment.localRepresentative &&
      typeof investment.localRepresentative === "object"
    ) {
      this.localRepresentative = {
        id: investment.localRepresentative._id,
        fullName: investment.localRepresentative.fullName,
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
        isPending:
          investment.representativeRequestStatus === "pending" &&
          !investment.localRepresentative,
      };
    }

    // Kira ödeme özeti
    if (investment.rentalPayments) {
      const paidPayments = investment.rentalPayments.filter(
        (p) => p.status === "paid"
      );
      const pendingPayments = investment.rentalPayments.filter(
        (p) => p.status === "pending"
      );
      const delayedPayments = investment.rentalPayments.filter(
        (p) => p.status === "delayed"
      );
      const totalPaid = paidPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      this.rentalSummary = {
        totalPayments: investment.rentalPayments.length,
        paidPayments: paidPayments.length,
        totalPaidAmount: totalPaid,
        nextPaymentDue: this.getNextPaymentDue(investment.rentalPayments),
      };
      this.rentalPaymentsSummary = {
        total: investment.rentalPayments.length,
        paid: paidPayments.length,
        pending: pendingPayments.length,
        delayed: delayedPayments.length,
        totalPayments: investment.rentalPayments.length,
        paidPayments: paidPayments.length,
        pendingPayments: pendingPayments.length,
        delayedPayments: delayedPayments.length,
        totalPaidAmount: totalPaid,
        nextPaymentDue: this.getNextPaymentDue(investment.rentalPayments),
      };
    }

    // Durum göstergesi
    this.statusDisplay = this.getStatusDisplay(investment.status);
  }

  getNextPaymentDue(rentalPayments) {
    const pendingPayments = rentalPayments
      .filter((p) => p.status === "pending")
      .sort((a, b) => a.month.localeCompare(b.month));

    return pendingPayments.length > 0 ? pendingPayments[0].month : null;
  }

  getStatusDisplay(status) {
    const statusMap = {
      offer_sent: { text: "Offer Sent", color: "blue" },
      contract_signed: { text: "Contract Signed", color: "orange" },
      title_deed_pending: { text: "Title Deed Pending", color: "yellow" },
      active: { text: "Active", color: "green" },
      completed: { text: "Completed", color: "gray" },
      defaulted: { text: "Defaulted", color: "red" },
      rejected: { text: "Rejected", color: "red" },
    };

    return statusMap[status] || { text: status, color: "gray" };
  }
}

module.exports = InvestmentListDto;
