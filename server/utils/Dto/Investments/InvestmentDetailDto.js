// server/utils/dto/Investments/InvestmentDetailDto.js

const InvestmentDto = require("./InvestmentDto");

class InvestmentDetailDto extends InvestmentDto {
  constructor(investment) {
    super(investment);

    // Detaylı property bilgileri
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        fullAddress: investment.property.fullAddress,
        description: investment.property.description,
        propertyType: investment.property.propertyType,
        size: investment.property.size,
        rooms: investment.property.rooms,
        estimatedValue: investment.property.estimatedValue,
        requestedInvestment: investment.property.requestedInvestment,
        rentOffered: investment.property.rentOffered,
        annualYieldPercent: investment.property.annualYieldPercent,
        contractPeriodMonths: investment.property.contractPeriodMonths,
        images: investment.property.images,
        documents: investment.property.documents,
        trustScore: investment.property.trustScore,
      };

      // Property owner bilgileri
      if (
        investment.property.owner &&
        typeof investment.property.owner === "object"
      ) {
        this.property.owner = {
          id: investment.property.owner._id,
          fullName: investment.property.owner.fullName,
          email: investment.property.owner.email,
          trustScore: investment.property.owner.trustScore,
        };
      }
    }

    // Detaylı investor bilgileri
    if (investment.investor && typeof investment.investor === "object") {
      this.investor = {
        id: investment.investor._id,
        fullName: investment.investor.fullName,
        email: investment.investor.email,
        country: investment.investor.country,
        membershipPlan: investment.investor.membershipPlan,
        activeInvestmentCount: investment.investor.activeInvestmentCount,
      };
    }

    // Tüm kira ödemeleri
    this.rentalPayments = investment.rentalPayments;

    // Local representative bilgisi
    if (investment.localRepresentative) {
      this.localRepresentative = {
        id:
          investment.localRepresentative._id || investment.localRepresentative,
        fullName: investment.localRepresentative.fullName,
        email: investment.localRepresentative.email,
        phone: investment.localRepresentative.phoneNumber,
        region: investment.localRepresentative.region,
      };
    }

    // Representative request bilgisi
    if (investment.representativeRequestedBy) {
      this.representativeRequest = {
        requestedBy: investment.representativeRequestedBy,
        requestDate: investment.representativeRequestDate,
        isPending: !investment.localRepresentative,
      };
    }

    // Hesaplamalar
    if (investment.property && typeof investment.property === "object") {
      this.calculations = {
        totalExpectedIncome:
          investment.property.rentOffered *
          investment.property.contractPeriodMonths,
        totalPaidAmount: investment.rentalPayments
          .filter((p) => p.status === "paid")
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        remainingPayments: investment.rentalPayments.filter(
          (p) => p.status !== "paid"
        ).length,
        paymentProgress: this.calculatePaymentProgress(
          investment.rentalPayments
        ),
        contractEndDate: this.calculateContractEndDate(
          investment.createdAt,
          investment.property.contractPeriodMonths
        ),
      };
    }

    // Süreç takibi
    this.processTracking = {
      offerSent: {
        completed: true,
        date: investment.createdAt,
      },
      contractSigned: {
        completed: [
          "contract_signed",
          "title_deed_pending",
          "active",
          "completed",
        ].includes(investment.status),
        date: investment.contractFile ? investment.updatedAt : null,
      },
      titleDeedRegistered: {
        completed: ["active", "completed"].includes(investment.status),
        date: investment.titleDeedDocument ? investment.updatedAt : null,
      },
      rentalPeriod: {
        active: investment.status === "active",
        startDate: investment.titleDeedDocument ? investment.updatedAt : null,
      },
      completion: {
        completed: investment.status === "completed",
        date: investment.status === "completed" ? investment.updatedAt : null,
        method: investment.refund?.refunded
          ? "refund"
          : investment.transferOfProperty?.transferred
          ? "transfer"
          : null,
      },
    };
  }

  calculatePaymentProgress(rentalPayments) {
    if (!rentalPayments || rentalPayments.length === 0) return 0;
    const paidCount = rentalPayments.filter((p) => p.status === "paid").length;
    return Math.round((paidCount / rentalPayments.length) * 100);
  }

  calculateContractEndDate(startDate, contractMonths) {
    if (!startDate || !contractMonths) return null;
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + contractMonths);
    return date.toISOString();
  }
}

module.exports = InvestmentDetailDto;
