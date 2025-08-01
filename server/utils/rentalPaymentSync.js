// server/utils/rentalPaymentSync.js

const Investment = require("../models/Investment");
const RentalPayment = require("../models/RentalPayment");

class RentalPaymentSync {
  // Mevcut investment'lardan RentalPayment kayıtları oluştur
  static async syncFromInvestments() {
    console.log("🔄 Starting rental payment sync...");

    const investments = await Investment.find({
      status: { $in: ["active", "completed"] },
    }).populate("property");

    let created = 0;
    let skipped = 0;

    for (const investment of investments) {
      for (const payment of investment.rentalPayments) {
        // Var olan kayıt kontrolü
        const exists = await RentalPayment.findOne({
          investment: investment._id,
          month: payment.month,
        });

        if (exists) {
          skipped++;
          continue;
        }

        // Due date hesaplama
        const [year, month] = payment.month.split("-");
        const dueDate = new Date(year, month - 1, 5); // Her ayın 5'i

        await RentalPayment.create({
          investment: investment._id,
          property: investment.property._id,
          investor: investment.investor,
          propertyOwner: investment.propertyOwner || investment.property.owner,
          month: payment.month,
          amount: payment.amount,
          currency: investment.currency,
          status: payment.status,
          dueDate: dueDate,
          paidAt: payment.paidAt,
          paymentReceipt: payment.paymentReceipt,
        });

        created++;
      }
    }

    console.log(`✅ Sync completed: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }

  // Investment oluşturulduğunda RentalPayment kayıtları oluştur
  static async createPaymentsForInvestment(investment) {
    const payments = [];

    for (const payment of investment.rentalPayments) {
      const [year, month] = payment.month.split("-");
      const dueDate = new Date(year, month - 1, 5);

      const rentalPayment = await RentalPayment.create({
        investment: investment._id,
        property: investment.property,
        investor: investment.investor,
        propertyOwner: investment.propertyOwner,
        month: payment.month,
        amount: payment.amount,
        currency: investment.currency,
        status: payment.status,
        dueDate: dueDate,
      });

      payments.push(rentalPayment);
    }

    return payments;
  }

  // Gecikmiş ödemeleri güncelle
  static async updateDelayedPayments() {
    const today = new Date();

    const overduePayments = await RentalPayment.updateMany(
      {
        status: "pending",
        dueDate: { $lt: today },
      },
      {
        status: "delayed",
        delayedSince: today,
      }
    );

    console.log(`🔄 Updated ${overduePayments.modifiedCount} delayed payments`);
    return overduePayments.modifiedCount;
  }
}

module.exports = RentalPaymentSync;
