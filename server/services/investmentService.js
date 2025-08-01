// server/services/investmentService.js

const InvestmentRepository = require("../repositories/investmentRepository");
const PropertyRepository = require("../repositories/propertyRepository");
const InvestorRepository = require("../repositories/investorRepository");
const NotificationService = require("./notificationService");
const BaseRepository = require("../repositories/baseRepository");
const {
  investmentFilters,
  investmentSortFields,
} = require("../utils/paginationHelper");
const {
  toInvestmentDto,
  toInvestmentListDto,
  toInvestmentDetailDto,
  toInvestmentAdminViewDto,
} = require("../utils/dto/Investments");

class InvestmentService {
  constructor() {
    this.investmentRepository = new InvestmentRepository();
    this.propertyRepository = new PropertyRepository();
    this.investorRepository = new InvestorRepository();
    this.notificationService = new NotificationService();
  }

  // Yeni yatırım teklifi oluştur
  async createInvestmentOffer(propertyId, investorId, offerData) {
    // Property kontrolü
    const property = await this.propertyRepository.findById(
      propertyId,
      "owner"
    );
    if (!property) {
      throw new Error("Property not found");
    }

    if (property.status !== "published") {
      throw new Error("Property is not available for investment");
    }

    // Investor kontrolü
    const investor = await this.investorRepository.findById(investorId);
    if (!investor) {
      throw new Error("Investor not found");
    }

    // KYC kontrolü - Investor
    if (investor.kycStatus !== "Approved") {
      throw new Error("KYC approval is required before making investments");
    }

    // Yatırım limiti kontrolü
    if (investor.activeInvestmentCount >= investor.investmentLimit) {
      throw new Error(
        `Investment limit reached. Current plan allows only ${investor.investmentLimit} active investments`
      );
    }

    // Mevcut bir teklif var mı kontrolü
    const existingOffer = await this.investmentRepository.findOne({
      property: propertyId,
      investor: investorId,
      status: {
        $in: ["offer_sent", "contract_signed", "title_deed_pending", "active"],
      },
    });

    if (existingOffer) {
      throw new Error("You already have an active offer for this property");
    }

    // Yatırım miktarı kontrolü
    const investmentAmount =
      offerData.amountInvested || property.requestedInvestment;
    if (investmentAmount !== property.requestedInvestment) {
      throw new Error("Investment amount must match the requested amount");
    }

    // Yeni yatırım oluştur
    const newInvestment = await this.investmentRepository.create({
      property: propertyId,
      investor: investorId,
      propertyOwner: property.owner._id, // PropertyOwner'ı da kaydediyoruz
      amountInvested: investmentAmount,
      currency: property.currency,
      status: "offer_sent",
      rentalPayments: this.generateRentalPaymentSchedule(
        property.rentOffered,
        property.contractPeriodMonths
      ),
    });

    // Property'nin offer count'unu artır
    await this.propertyRepository.update(propertyId, {
      $inc: { investmentOfferCount: 1 },
    });

    // Property Owner'a bildirim gönder
    await this.notificationService.notifyNewInvestmentOffer(
      property.owner._id,
      {
        investmentId: newInvestment._id,
        investorName: investor.fullName,
        amount: investmentAmount,
        currency: property.currency,
        propertyCity: property.city,
      }
    );

    // RentalPayment kayıtlarını oluştur
    const RentalPaymentSync = require("../utils/rentalPaymentSync");
    await RentalPaymentSync.createPaymentsForInvestment(newInvestment);

    return toInvestmentDetailDto(newInvestment);
  }

  // Kira ödeme takvimi oluştur
  generateRentalPaymentSchedule(monthlyRent, contractMonths) {
    const schedule = [];
    const startDate = new Date();

    for (let i = 0; i < contractMonths; i++) {
      const paymentDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i + 1,
        1
      );
      schedule.push({
        month: paymentDate.toISOString().slice(0, 7), // "YYYY-MM"
        amount: monthlyRent,
        status: "pending",
      });
    }

    return schedule;
  }

  // Teklifi kabul et
  async acceptOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    if (investment.status !== "offer_sent") {
      throw new Error("Offer is not in pending state");
    }

    // Property owner kontrolü
    if (investment.property.owner.toString() !== propertyOwnerId.toString()) {
      throw new Error("Unauthorized to accept this offer");
    }

    // Property durumunu güncelle
    await this.propertyRepository.update(investment.property._id, {
      status: "in_contract",
    });

    // Investment durumunu güncelle
    const updatedInvestment = await this.investmentRepository.update(
      investmentId,
      {
        status: "contract_signed",
      }
    );

    // Investor'ın aktif yatırım sayısını artır
    await this.investorRepository.update(investment.investor._id, {
      $inc: { activeInvestmentCount: 1 },
    });

    // Investor'a bildirim gönder
    await this.notificationService.notifyOfferAccepted(
      investment.investor._id,
      {
        investmentId: investmentId,
        propertyCity: investment.property.city,
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Teklifi reddet
  async rejectOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    if (investment.status !== "offer_sent") {
      throw new Error("Offer is not in pending state");
    }

    // Property owner kontrolü
    if (investment.property.owner.toString() !== propertyOwnerId.toString()) {
      throw new Error("Unauthorized to reject this offer");
    }

    // Investment'ı sil veya iptal et
    await this.investmentRepository.delete(investmentId);

    // Investor'a bildirim gönder
    await this.notificationService.notifyOfferRejected(
      investment.investor._id,
      {
        investmentId: investmentId,
        propertyCity: investment.property.city,
      }
    );

    return { message: "Offer rejected successfully" };
  }

  // Kontrat yükle
  async uploadContract(investmentId, userId, contractFile, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isOwner = investment.property.owner.toString() === userId.toString();

    if (!isInvestor && !isOwner && userRole !== "admin") {
      throw new Error("Unauthorized to upload contract");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Investment is not in contract stage");
    }

    const updatedInvestment =
      await this.investmentRepository.updateContractFile(
        investmentId,
        contractFile
      );

    // Karşı tarafa bildirim gönder
    if (isInvestor) {
      // Property Owner'a bildirim
      await this.notificationService.notifyContractUploaded(
        investment.property.owner,
        "property_owner",
        {
          investmentId: investmentId,
          propertyCity: investment.property.city,
        }
      );
    } else if (isOwner) {
      // Investor'a bildirim
      await this.notificationService.notifyContractUploaded(
        investment.investor._id,
        "investor",
        {
          investmentId: investmentId,
          propertyCity: investment.property.city,
        }
      );
    }

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Tapu kaydı yükle
  async uploadTitleDeed(investmentId, userId, titleDeedDocument, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isOwner = investment.property.owner.toString() === userId.toString();

    if (
      !isOwner &&
      userRole !== "admin" &&
      userRole !== "local_representative"
    ) {
      throw new Error("Unauthorized to upload title deed");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Contract must be signed before title deed upload");
    }

    // Property Owner KYC kontrolü
    const PropertyOwner = require("../models/PropertyOwner");
    const propertyOwner = await PropertyOwner.findById(
      investment.property.owner
    );

    if (propertyOwner.kycStatus !== "Approved") {
      throw new Error(
        "Property owner's KYC must be approved before title deed registration"
      );
    }

    const updatedInvestment = await this.investmentRepository.updateTitleDeed(
      investmentId,
      titleDeedDocument
    );

    // Property durumunu active yap
    await this.propertyRepository.update(investment.property._id, {
      status: "active",
    });

    // Investor'a bildirim gönder
    await this.notificationService.notifyTitleDeedRegistered(
      investment.investor._id,
      {
        investmentId: investmentId,
        propertyCity: investment.property.city,
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Kira ödemesi yap
  async makeRentalPayment(investmentId, month, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Property owner kontrolü
    if (investment.property.owner.toString() !== propertyOwnerId.toString()) {
      throw new Error("Unauthorized to make payment");
    }

    if (investment.status !== "active") {
      throw new Error("Investment is not active");
    }

    // İlgili ayın ödemesini bul
    const payment = investment.rentalPayments.find((p) => p.month === month);
    if (!payment) {
      throw new Error("Payment not found for this month");
    }

    if (payment.status === "paid") {
      throw new Error("Payment already made for this month");
    }

    const updatedInvestment =
      await this.investmentRepository.updateRentalPayment(investmentId, month, {
        status: "paid",
        paidAt: new Date(),
      });

    // RentalPayment tablosunu da güncelle
    const RentalPayment = require("../models/RentalPayment");
    await RentalPayment.findOneAndUpdate(
      {
        investment: investmentId,
        month: month,
      },
      {
        status: "paid",
        paidAt: new Date(),
        paymentReceipt: req.body?.paymentReceipt,
      }
    );

    // Investor'ın rentalIncome kaydına ekle
    await this.investorRepository.addRentalIncome(investment.investor._id, {
      propertyId: investment.property._id,
      amount: payment.amount,
      currency: investment.currency,
      status: "Paid",
      date: new Date(),
    });

    // Investor'a bildirim gönder
    await this.notificationService.notifyRentPaymentReceived(
      investment.investor._id,
      {
        investmentId: investmentId,
        amount: payment.amount,
        currency: investment.currency,
        month: month,
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Gecikmiş ödemeleri işaretle
  async markDelayedPayments() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const investments = await this.investmentRepository.findActiveInvestments();

    for (const investment of investments) {
      for (const payment of investment.rentalPayments) {
        if (payment.month < currentMonth && payment.status === "pending") {
          await this.investmentRepository.updateRentalPayment(
            investment._id,
            payment.month,
            { status: "delayed" }
          );

          // Property Owner'a bildirim gönder
          await this.notificationService.notifyRentPaymentDelayed(
            investment.property.owner,
            "property_owner",
            {
              investmentId: investment._id,
              month: payment.month,
              propertyCity: investment.property.city,
            }
          );

          // Investor'a bildirim gönder
          await this.notificationService.notifyRentPaymentDelayed(
            investment.investor._id,
            "investor",
            {
              investmentId: investment._id,
              month: payment.month,
              propertyCity: investment.property.city,
            }
          );
        }
      }
    }
  }

  // İade işlemi
  async processRefund(investmentId, refundData, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    if (
      userRole !== "admin" &&
      investment.property.owner.toString() !== userId.toString()
    ) {
      throw new Error("Unauthorized to process refund");
    }

    if (investment.status !== "active") {
      throw new Error("Investment must be active to process refund");
    }

    const updatedInvestment = await this.investmentRepository.processRefund(
      investmentId,
      refundData
    );

    // Property durumunu güncelle
    await this.propertyRepository.update(investment.property._id, {
      status: "completed",
    });

    // Investor'ın aktif yatırım sayısını azalt
    await this.investorRepository.update(investment.investor._id, {
      $inc: { activeInvestmentCount: -1 },
    });

    // Investor'a bildirim gönder
    await this.notificationService.notifyInvestmentRefunded(
      investment.investor._id,
      {
        investmentId: investmentId,
        amount: refundData.amount,
        currency: investment.currency,
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Mülk transferi
  async transferProperty(investmentId, transferData, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    if (userRole !== "admin") {
      throw new Error("Only admin can process property transfer");
    }

    if (investment.status !== "active") {
      throw new Error("Investment must be active to transfer property");
    }

    const updatedInvestment = await this.investmentRepository.transferProperty(
      investmentId,
      transferData
    );

    // Property durumunu güncelle
    await this.propertyRepository.update(investment.property._id, {
      status: "completed",
    });

    // Investor'ın aktif yatırım sayısını azalt
    await this.investorRepository.update(investment.investor._id, {
      $inc: { activeInvestmentCount: -1 },
    });

    // Investor'a bildirim gönder
    await this.notificationService.notifyPropertyTransferred(
      investment.investor._id,
      "investor",
      {
        investmentId: investmentId,
        propertyId: investment.property._id,
        propertyCity: investment.property.city,
      }
    );

    // Property Owner'a bildirim gönder
    await this.notificationService.notifyPropertyTransferred(
      investment.property.owner,
      "property_owner",
      {
        investmentId: investmentId,
        propertyId: investment.property._id,
        propertyCity: investment.property.city,
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Yatırım detayını getir
  async getInvestmentById(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isPropertyOwner =
      investment.property.owner.toString() === userId.toString();
    const isAdmin = userRole === "admin";
    const isLocalRep = userRole === "local_representative";

    if (!isInvestor && !isPropertyOwner && !isAdmin && !isLocalRep) {
      throw new Error("Unauthorized to view this investment");
    }

    // Role göre DTO seç
    if (isAdmin) {
      return toInvestmentAdminViewDto(investment);
    } else {
      return toInvestmentDetailDto(investment);
    }
  }

  // Investor'ın yatırımlarını getir
  async getInvestorInvestments(investorId, queryParams) {
    const options = {
      populate: "property",
      allowedFilters: investmentFilters,
      allowedSortFields: investmentSortFields,
      customFilters: { investor: investorId },
    };

    const result = await this.investmentRepository.paginate(
      queryParams,
      options
    );
    return {
      data: result.data.map((inv) => toInvestmentListDto(inv)),
      pagination: result.pagination,
    };
  }

  // Property'nin yatırımlarını getir
  async getPropertyInvestments(propertyId) {
    const investments = await this.investmentRepository.findByProperty(
      propertyId
    );
    return investments.map((inv) => toInvestmentDto(inv));
  }

  // Admin için tüm yatırımlar
  async getAllInvestmentsForAdmin(queryParams) {
    const options = {
      populate: "property investor",
      allowedFilters: { ...investmentFilters, status: "exact" },
      allowedSortFields: [...investmentSortFields, "status"],
    };

    const result = await this.investmentRepository.paginate(
      queryParams,
      options
    );
    return {
      data: result.data.map((inv) => toInvestmentAdminViewDto(inv)),
      pagination: result.pagination,
    };
  }

  // Yaklaşan kira ödemelerini getir
  async getUpcomingRentalPayments(days = 7) {
    const investments =
      await this.investmentRepository.findUpcomingRentalPayments(days);
    return investments.map((inv) => toInvestmentDto(inv));
  }

  // Gecikmiş ödemeleri getir
  async getDelayedPayments() {
    const investments = await this.investmentRepository.findDelayedPayments();
    return investments.map((inv) => toInvestmentDto(inv));
  }

  // Yatırım istatistiklerini getir
  async getInvestmentStatistics(investmentId) {
    return await this.investmentRepository.getInvestmentStatistics(
      investmentId
    );
  }

  // Yaklaşan ödemeler için bildirim gönder (Cron job için)
  async sendUpcomingPaymentNotifications() {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().slice(0, 7);

    const investments = await this.investmentRepository
      .find({
        status: "active",
        rentalPayments: {
          $elemMatch: {
            month: nextMonthStr,
            status: "pending",
          },
        },
      })
      .populate("property investor");

    for (const investment of investments) {
      const payment = investment.rentalPayments.find(
        (p) => p.month === nextMonthStr
      );

      // Property Owner'a bildirim
      await this.notificationService.notifyUpcomingRentPayment(
        investment.property.owner,
        "property_owner",
        {
          investmentId: investment._id,
          amount: payment.amount,
          currency: investment.currency,
          month: nextMonthStr,
        }
      );

      // Investor'a bildirim
      await this.notificationService.notifyUpcomingRentPayment(
        investment.investor._id,
        "investor",
        {
          investmentId: investment._id,
          amount: payment.amount,
          currency: investment.currency,
          month: nextMonthStr,
        }
      );
    }
  }

  // Kontrat bitişi yaklaşan yatırımlar için bildirim (60 gün önceden)
  async sendContractEndNotifications() {
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

    const investments = await this.investmentRepository
      .find({
        status: "active",
      })
      .populate("property investor");

    for (const investment of investments) {
      const contractEndDate = new Date(investment.createdAt);
      contractEndDate.setMonth(
        contractEndDate.getMonth() + investment.property.contractPeriodMonths
      );

      const daysUntilEnd = Math.floor(
        (contractEndDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilEnd === 60) {
        // Property Owner'a bildirim
        await this.notificationService.notifyContractEndingSoon(
          investment.property.owner,
          "property_owner",
          {
            investmentId: investment._id,
            propertyCity: investment.property.city,
            daysRemaining: 60,
          }
        );

        // Investor'a bildirim
        await this.notificationService.notifyContractEndingSoon(
          investment.investor._id,
          "investor",
          {
            investmentId: investment._id,
            propertyCity: investment.property.city,
            daysRemaining: 60,
          }
        );
      }
    }
  }

  // Local representative atama (Admin)
  async assignLocalRepresentative(investmentId, representativeId, adminId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor localRepresentative"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Local representative'in bölge kontrolü
    const LocalRepresentative = require("../models/LocalRepresentative");
    const representative = await LocalRepresentative.findById(representativeId);

    if (!representative) {
      throw new Error("Local representative not found");
    }

    if (representative.region !== investment.property.country) {
      throw new Error(
        "Representative is not assigned to this property's region"
      );
    }

    const updatedInvestment =
      await this.investmentRepository.assignLocalRepresentative(
        investmentId,
        representativeId
      );

    // İlgili taraflara bildirim gönder
    // Investor'a bildirim
    await this.notificationService.createNotification(
      investment.investor._id,
      "investor",
      {
        type: "general_announcement",
        title: "Local Representative Assigned",
        message: `A local representative has been assigned to assist with your investment in ${investment.property.city}`,
        relatedEntity: {
          entityType: "investment",
          entityId: investmentId,
        },
        priority: "medium",
      }
    );

    // Property Owner'a bildirim
    await this.notificationService.createNotification(
      investment.property.owner,
      "property_owner",
      {
        type: "general_announcement",
        title: "Local Representative Assigned",
        message: `A local representative has been assigned to assist with the investment process for your property in ${investment.property.city}`,
        relatedEntity: {
          entityType: "investment",
          entityId: investmentId,
        },
        priority: "medium",
      }
    );

    // Representative'e bildirim
    await this.notificationService.createNotification(
      representativeId,
      "local_representative",
      {
        type: "general_announcement",
        title: "New Investment Assignment",
        message: `You have been assigned to assist with an investment in ${investment.property.city}`,
        relatedEntity: {
          entityType: "investment",
          entityId: investmentId,
        },
        priority: "high",
        actions: [
          {
            label: "View Investment",
            url: `/investments/${investmentId}`,
            type: "primary",
          },
        ],
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Local representative talebi (Investor veya Property Owner)
  async requestLocalRepresentative(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isPropertyOwner =
      investment.property.owner.toString() === userId.toString();

    if (!isInvestor && !isPropertyOwner) {
      throw new Error("Unauthorized to request local representative");
    }

    if (investment.localRepresentative) {
      throw new Error(
        "A local representative is already assigned to this investment"
      );
    }

    if (investment.representativeRequestedBy) {
      throw new Error(
        "A representative request is already pending for this investment"
      );
    }

    const updatedInvestment =
      await this.investmentRepository.requestLocalRepresentative(
        investmentId,
        userId
      );

    // Admin'e bildirim gönder
    const User = require("../models/User");
    const admins = await User.find({ role: "admin" });

    for (const admin of admins) {
      await this.notificationService.createNotification(admin._id, "admin", {
        type: "general_announcement",
        title: "Local Representative Request",
        message: `${
          userRole === "investor" ? "Investor" : "Property Owner"
        } has requested a local representative for investment in ${
          investment.property.city
        }`,
        relatedEntity: {
          entityType: "investment",
          entityId: investmentId,
        },
        priority: "high",
        actions: [
          {
            label: "Assign Representative",
            url: `/admin/investments/${investmentId}/assign-representative`,
            type: "primary",
          },
        ],
      });
    }

    return {
      message: "Local representative request submitted successfully",
      investment: toInvestmentDetailDto(updatedInvestment),
    };
  }

  // Property Owner'ın kira ödemelerini getir
  async getPropertyOwnerRentalPayments(propertyOwnerId, queryParams) {
    const RentalPayment = require("../models/RentalPayment");

    const options = {
      populate: "investment property investor",
      allowedFilters: {
        status: "exact",
        month: "exact",
        property: "exact",
        daysDelayed: "numberRange",
      },
      allowedSortFields: ["month", "amount", "status", "paidAt", "dueDate"],
      customFilters: { propertyOwner: propertyOwnerId },
    };

    const result = await new BaseRepository(RentalPayment).paginate(
      queryParams,
      options
    );

    return {
      data: result.data.map((payment) => ({
        id: payment._id,
        investment: {
          id: payment.investment._id,
          status: payment.investment.status,
        },
        property: {
          id: payment.property._id,
          address: payment.property.fullAddress,
          city: payment.property.city,
          country: payment.property.country,
        },
        investor: {
          id: payment.investor._id,
          fullName: payment.investor.fullName,
          email: payment.investor.email,
        },
        month: payment.month,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        daysDelayed: payment.daysDelayed,
        isOverdue: payment.isOverdue,
        daysUntilDue: payment.daysUntilDue,
        paymentReceipt: payment.paymentReceipt,
      })),
      pagination: result.pagination,
      summary: await this.getRentalPaymentSummary(
        propertyOwnerId,
        "propertyOwner"
      ),
    };
  }

  // Investor'ın kira ödemelerini getir
  async getInvestorRentalPayments(investorId, queryParams) {
    const RentalPayment = require("../models/RentalPayment");

    const options = {
      populate: "investment property propertyOwner",
      allowedFilters: {
        status: "exact",
        month: "exact",
        property: "exact",
        daysDelayed: "numberRange",
      },
      allowedSortFields: ["month", "amount", "status", "paidAt", "dueDate"],
      customFilters: { investor: investorId },
    };

    const result = await new BaseRepository(RentalPayment).paginate(
      queryParams,
      options
    );

    return {
      data: result.data.map((payment) => ({
        id: payment._id,
        investment: {
          id: payment.investment._id,
          status: payment.investment.status,
        },
        property: {
          id: payment.property._id,
          address: payment.property.fullAddress,
          city: payment.property.city,
          country: payment.property.country,
        },
        propertyOwner: {
          id: payment.propertyOwner._id,
          fullName: payment.propertyOwner.fullName,
          email: payment.propertyOwner.email,
          trustScore: payment.propertyOwner.ownerTrustScore,
        },
        month: payment.month,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        daysDelayed: payment.daysDelayed,
        isOverdue: payment.isOverdue,
        daysUntilDue: payment.daysUntilDue,
      })),
      pagination: result.pagination,
      summary: await this.getRentalPaymentSummary(investorId, "investor"),
    };
  }

  // Kira ödeme özeti
  async getRentalPaymentSummary(userId, userType) {
    const RentalPayment = require("../models/RentalPayment");
    const filter =
      userType === "investor"
        ? { investor: userId }
        : { propertyOwner: userId };

    const [total, paid, pending, delayed] = await Promise.all([
      RentalPayment.countDocuments(filter),
      RentalPayment.countDocuments({ ...filter, status: "paid" }),
      RentalPayment.countDocuments({ ...filter, status: "pending" }),
      RentalPayment.countDocuments({ ...filter, status: "delayed" }),
    ]);

    const totalAmount = await RentalPayment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$amount" },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0],
            },
          },
          totalDelayed: {
            $sum: {
              $cond: [{ $eq: ["$status", "delayed"] }, "$amount", 0],
            },
          },
        },
      },
    ]);

    return {
      totalPayments: total,
      paidPayments: paid,
      pendingPayments: pending,
      delayedPayments: delayed,
      amounts: totalAmount[0] || {
        totalExpected: 0,
        totalPaid: 0,
        totalDelayed: 0,
      },
      collectionRate: total > 0 ? ((paid / total) * 100).toFixed(2) : 0,
    };
  }
}

module.exports = InvestmentService;
