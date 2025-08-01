// server/utils/dto/Investments/InvestmentListDto.js

class InvestmentListDto {
  constructor(investment) {
    this.id = investment._id;
    this.amountInvested = investment.amountInvested;
    this.currency = investment.currency;
    this.status = investment.status;
    this.createdAt = investment.createdAt;

    // Property özet bilgileri
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        propertyType: investment.property.propertyType,
        thumbnail:
          investment.property.images && investment.property.images.length > 0
            ? investment.property.images[0]
            : null,
      };

      // Beklenen toplam gelir
      this.expectedTotalIncome =
        investment.property.rentOffered *
        investment.property.contractPeriodMonths;
    }

    // Kira ödeme özeti
    if (investment.rentalPayments) {
      const paidPayments = investment.rentalPayments.filter(
        (p) => p.status === "paid"
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
    };

    return statusMap[status] || { text: status, color: "gray" };
  }
}

module.exports = InvestmentListDto;
