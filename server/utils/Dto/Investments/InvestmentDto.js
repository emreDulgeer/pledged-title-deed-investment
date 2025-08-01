// server/utils/dto/Investments/InvestmentDto.js

class InvestmentDto {
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
