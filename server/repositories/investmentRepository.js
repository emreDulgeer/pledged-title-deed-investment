// server/repositories/investmentRepository.js

const Investment = require("../models/Investment");
const BaseRepository = require("./baseRepository");

class InvestmentRepository extends BaseRepository {
  constructor() {
    super(Investment);
  }

  // Investment'a özel sorgular
  async findByInvestor(investorId) {
    return await this.model
      .find({ investor: investorId })
      .populate("property investor");
  }

  async findByProperty(propertyId) {
    return await this.model
      .find({ property: propertyId })
      .populate("property investor");
  }

  async findByStatus(status) {
    return await this.model.find({ status }).populate("property investor");
  }

  async findActiveInvestments() {
    return await this.model
      .find({ status: "active" })
      .populate("property investor");
  }

  async findByInvestorAndStatus(investorId, status) {
    return await this.model
      .find({ investor: investorId, status })
      .populate("property investor");
  }

  async updateRentalPayment(investmentId, month, paymentData) {
    return await this.model.findOneAndUpdate(
      {
        _id: investmentId,
        "rentalPayments.month": month,
      },
      {
        $set: {
          "rentalPayments.$.status": paymentData.status,
          "rentalPayments.$.paidAt": paymentData.paidAt || new Date(),
        },
      },
      { new: true }
    );
  }

  async addRentalPayment(investmentId, rentalPayment) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      { $push: { rentalPayments: rentalPayment } },
      { new: true }
    );
  }

  async updateContractFile(investmentId, contractFile) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      { contractFile, status: "contract_signed" },
      { new: true }
    );
  }

  async updateTitleDeed(investmentId, titleDeedDocument) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      { titleDeedDocument, status: "active" },
      { new: true }
    );
  }

  async processRefund(investmentId, refundData) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      {
        refund: {
          refunded: true,
          amount: refundData.amount,
          refundedAt: new Date(),
        },
        status: "completed",
      },
      { new: true }
    );
  }

  async transferProperty(investmentId, transferData) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      {
        transferOfProperty: {
          transferred: true,
          date: new Date(),
          method: transferData.method,
        },
        status: "completed",
      },
      { new: true }
    );
  }

  async getInvestmentStatistics(investmentId) {
    const investment = await this.model
      .findById(investmentId)
      .populate("property");
    if (!investment) return null;

    const totalExpectedPayments =
      investment.contractPeriodMonths ||
      (investment.property ? investment.property.contractPeriodMonths : 0);
    const paidPayments = investment.rentalPayments.filter(
      (p) => p.status === "paid"
    ).length;
    const pendingPayments = investment.rentalPayments.filter(
      (p) => p.status === "pending"
    ).length;
    const delayedPayments = investment.rentalPayments.filter(
      (p) => p.status === "delayed"
    ).length;

    return {
      totalExpectedPayments,
      paidPayments,
      pendingPayments,
      delayedPayments,
      totalPaidAmount: investment.rentalPayments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      paymentCompletionRate:
        totalExpectedPayments > 0
          ? ((paidPayments / totalExpectedPayments) * 100).toFixed(2)
          : 0,
    };
  }

  async findUpcomingRentalPayments(days = 7) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    // Bu ay ve gelecek ay için ödeme tarihleri hesapla
    const currentMonth = today.toISOString().slice(0, 7); // "YYYY-MM"
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 7);

    return await this.model
      .find({
        status: "active",
        $or: [
          {
            "rentalPayments.month": currentMonth,
            "rentalPayments.status": "pending",
          },
          {
            "rentalPayments.month": nextMonth,
            "rentalPayments.status": "pending",
          },
        ],
      })
      .populate("property investor");
  }

  async findDelayedPayments() {
    const currentMonth = new Date().toISOString().slice(0, 7);

    return await this.model
      .find({
        status: "active",
        rentalPayments: {
          $elemMatch: {
            month: { $lt: currentMonth },
            status: { $in: ["pending", "delayed"] },
          },
        },
      })
      .populate("property investor");
  }

  // Local representative atama
  async assignLocalRepresentative(investmentId, representativeId) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      { localRepresentative: representativeId },
      { new: true }
    );
  }

  // Local representative isteği kaydet
  async requestLocalRepresentative(investmentId, requestedBy) {
    return await this.model.findByIdAndUpdate(
      investmentId,
      {
        representativeRequestedBy: requestedBy,
        representativeRequestDate: new Date(),
      },
      { new: true }
    );
  }

  // Property owner'ın tüm kira ödemelerini getir
  async getPropertyOwnerRentalPayments(propertyOwnerId, filters = {}) {
    const query = {
      propertyOwner: propertyOwnerId,
      status: { $in: ["active", "completed"] },
    };

    if (filters.status) {
      query["rentalPayments.status"] = filters.status;
    }

    return await this.model
      .find(query)
      .populate("property investor")
      .sort({ createdAt: -1 });
  }

  // Investor'ın tüm kira ödemelerini getir
  async getInvestorRentalPayments(investorId, filters = {}) {
    const query = {
      investor: investorId,
      status: { $in: ["active", "completed"] },
    };

    if (filters.status) {
      query["rentalPayments.status"] = filters.status;
    }

    return await this.model
      .find(query)
      .populate("property propertyOwner")
      .sort({ createdAt: -1 });
  }
}

module.exports = InvestmentRepository;
