// server/repositories/investorRepository.js

const Investor = require("../models/Investor");
const BaseRepository = require("./baseRepository");

class InvestorRepository extends BaseRepository {
  constructor() {
    super(Investor);
  }

  // Investor'a özel sorgular
  async findWithInvestments(investorId) {
    return await this.model.findById(investorId).populate({
      path: "investments",
      populate: { path: "property" },
    });
  }

  async addToFavorites(investorId, propertyId) {
    return await this.model.findByIdAndUpdate(
      investorId,
      { $addToSet: { favoriteProperties: propertyId } },
      { new: true }
    );
  }

  async removeFromFavorites(investorId, propertyId) {
    return await this.model.findByIdAndUpdate(
      investorId,
      { $pull: { favoriteProperties: propertyId } },
      { new: true }
    );
  }

  async getFavoriteProperties(investorId) {
    const investor = await this.model
      .findById(investorId)
      .populate("favoriteProperties");
    return investor ? investor.favoriteProperties : [];
  }

  async updateBankInfo(investorId, bankInfo) {
    return await this.model.findByIdAndUpdate(
      investorId,
      { bankAccountInfo: bankInfo },
      { new: true }
    );
  }

  async addRentalIncome(investorId, incomeData) {
    return await this.model.findByIdAndUpdate(
      investorId,
      { $push: { rentalIncome: incomeData } },
      { new: true }
    );
  }

  async updateSubscription(investorId, subscriptionData) {
    return await this.model.findByIdAndUpdate(
      investorId,
      { subscription: subscriptionData },
      { new: true }
    );
  }

  async getInvestorStatistics(investorId) {
    const investor = await this.model
      .findById(investorId)
      .populate("investments");

    if (!investor) return null;

    const activeInvestments = investor.investments.filter(
      (i) => i.status === "active"
    ).length;
    const completedInvestments = investor.investments.filter(
      (i) => i.status === "completed"
    ).length;
    const totalInvestedAmount = investor.investments.reduce(
      (sum, inv) => sum + (inv.amountInvested || 0),
      0
    );
    const totalRentalIncome = investor.rentalIncome.reduce(
      (sum, income) => sum + (income.amount || 0),
      0
    );

    return {
      activeInvestments,
      completedInvestments,
      totalInvestments: investor.investments.length,
      totalInvestedAmount,
      totalRentalIncome,
      favoritePropertiesCount: investor.favoriteProperties.length,
    };
  }
}

module.exports = InvestorRepository;
