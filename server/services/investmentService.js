// server/services/investmentService.js

const InvestmentRepository = require("../repositories/investmentRepository");
const PropertyRepository = require("../repositories/propertyRepository");
const InvestorRepository = require("../repositories/investorRepository");
const NotificationService = require("./notificationService");
const FileMetadata = require("../models/FileMetadata");
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
  async displayNameOf(user) {
    if (!user) return "User";
    if (user.fullName && user.fullName.trim()) return user.fullName.trim();

    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : "User";
  }
  // Yeni yatırım teklifi oluştur
  async createInvestmentOffer(propertyId, investorId, offerData) {
    // Property kontrolü
    const property = await this.propertyRepository.findById(
      propertyId,
      "owner"
    );
    if (!property) throw new Error("Property not found");
    if (property.status !== "published") {
      throw new Error("This property is not available for new offers");
    }

    // Investor kontrolü
    const investor = await this.investorRepository.findById(investorId);
    if (!investor) throw new Error("Investor not found");
    if (investor.kycStatus !== "Approved") {
      throw new Error("KYC approval is required before making investments");
    }
    // Limit kontrolü
    if (investor.activeInvestmentCount >= investor.investmentLimit) {
      throw new Error(
        `Investment limit reached. Current plan allows ${investor.investmentLimit} active investments`
      );
    }

    // Aynı property + investor için aktif bir teklif/ yatırım var mı?
    const hasExisting = await this.investmentRepository.findOne({
      investor: investorId,
      property: propertyId,
      status: {
        $in: ["offer_sent", "contract_signed", "title_deed_pending", "active"],
      },
    });
    if (hasExisting) {
      throw new Error(
        "You already have an active or pending investment for this property"
      );
    }

    // Tutarın property.requestedInvestment ile bire bir eşleşmesi
    const { amountInvested } = offerData || {};
    if (Number(amountInvested) !== Number(property.requestedInvestment)) {
      throw new Error(
        "amountInvested must equal property's requestedInvestment"
      );
    }

    // Kira ödeme takvimi oluştur
    const rentalPayments = this.generateRentalPaymentSchedule(
      property.rentOffered, // aylık kira
      property.contractPeriodMonths // sözleşme süresi (ay)
    );

    // Yeni Investment oluştur
    const newInvestment = await this.investmentRepository.create({
      property: propertyId,
      investor: investorId,
      propertyOwner: property.owner?._id,
      currency: property.currency,
      amountInvested,
      status: "offer_sent",
      rentalPayments,
    });

    // Teklif sayacı
    await this.propertyRepository.update(propertyId, {
      $inc: { investmentOfferCount: 1 },
    });

    // Property Owner’a bildirim
    await this.notificationService.notifyNewInvestmentOffer(
      property.owner._id,
      {
        investmentId: newInvestment._id,
        investorName: investor.fullName,
        amount: amountInvested,
      }
    );

    return newInvestment;
  }

  // Offer'ı kabul et
  async acceptOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Durum kontrolü
    if (investment.status !== "offer_sent") {
      throw new Error(
        `Cannot accept offer. Current status is: ${investment.status}. Offer must be in 'offer_sent' status to be accepted.`
      );
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

    // Investor'a bildirim gönder
    await this.notificationService.notifyOfferAccepted(
      investment.investor._id,
      {
        investmentId: investmentId,
        propertyCity: investment.property.city,
      }
    );

    // Investor'ın aktif yatırım sayısını artır
    await this.investorRepository.update(investment.investor._id, {
      $inc: { activeInvestmentCount: 1 },
    });

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Offer'ı reddet
  async rejectOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Durum kontrolü
    if (investment.status !== "offer_sent") {
      throw new Error(
        `Cannot reject offer. Current status is: ${investment.status}. Offer must be in 'offer_sent' status to be rejected.`
      );
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

  // Kontrat yükle - FileUploadManager ile entegre
  async uploadContract(investmentId, userId, fileMetadataId, userRole) {
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

    // FileMetadata kontrolü
    const fileMetadata = await FileMetadata.findById(fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    // Dosya tipini kontrol et
    if (!fileMetadata.mimeType.includes("pdf")) {
      throw new Error("Contract must be a PDF file");
    }

    // Investment'ı güncelle
    const updateData = {
      contractFile: {
        fileId: fileMetadataId,
        url: fileMetadata.url,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
    };

    const updatedInvestment = await this.investmentRepository.update(
      investmentId,
      updateData
    );

    // FileMetadata'yı güncelle - Investment ile ilişkilendir
    await FileMetadata.findByIdAndUpdate(fileMetadataId, {
      relatedModel: "Investment",
      relatedId: investmentId,
      documentType: "contract",
    });

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

  // Tapu kaydı yükle - FileUploadManager ile entegre
  async uploadTitleDeed(investmentId, userId, fileMetadataId, userRole) {
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

    // FileMetadata kontrolü
    const fileMetadata = await FileMetadata.findById(fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    // Investment'ı güncelle
    const updateData = {
      titleDeedDocument: {
        fileId: fileMetadataId,
        url: fileMetadata.url,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
      status: "title_deed_pending", // Admin onayı bekliyor
    };

    const updatedInvestment = await this.investmentRepository.update(
      investmentId,
      updateData
    );

    // FileMetadata'yı güncelle - Investment ile ilişkilendir
    await FileMetadata.findByIdAndUpdate(fileMetadataId, {
      relatedModel: "Investment",
      relatedId: investmentId,
      documentType: "title_deed",
    });

    // Admin'e onay için bildirim gönder
    // await this.notificationService.notifyAdminForTitleDeedApproval(
    //   investmentId,
    //   {
    //     propertyCity: investment.property.city,
    //     investorName: this.displayNameOf(investment.investor),
    //   }
    // );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Admin tarafından title deed onayı
  async approveTitleDeed(investmentId, adminId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    if (investment.status !== "title_deed_pending") {
      throw new Error("Title deed is not pending approval");
    }

    if (!investment.titleDeedDocument?.fileId) {
      throw new Error("No title deed document uploaded");
    }

    // Investment'ı güncelle
    const updateData = {
      "titleDeedDocument.verifiedBy": adminId,
      "titleDeedDocument.verifiedAt": new Date(),
      status: "active",
    };

    const updatedInvestment = await this.investmentRepository.update(
      investmentId,
      updateData
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

  // Payment receipt yükle
  async uploadPaymentReceipt(investmentId, userId, fileMetadataId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();

    if (!isInvestor && userRole !== "admin") {
      throw new Error("Unauthorized to upload payment receipt");
    }

    // FileMetadata kontrolü
    const fileMetadata = await FileMetadata.findById(fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    // Investment'ı güncelle
    const updateData = {
      paymentReceipt: {
        fileId: fileMetadataId,
        url: fileMetadata.url,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
    };

    const updatedInvestment = await this.investmentRepository.update(
      investmentId,
      updateData
    );

    // FileMetadata'yı güncelle
    await FileMetadata.findByIdAndUpdate(fileMetadataId, {
      relatedModel: "Investment",
      relatedId: investmentId,
      documentType: "payment_receipt",
    });

    // Property Owner'a bildirim
    await this.notificationService.notifyPaymentReceiptUploaded(
      investment.property.owner,
      {
        investmentId: investmentId,
        investorName: this.displayNameOf(investment.investor),
      }
    );

    return toInvestmentDetailDto(updatedInvestment);
  }

  // Investment dökümanlarını listele
  async getInvestmentDocuments(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor contractFile.fileId titleDeedDocument.fileId paymentReceipt.fileId"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isOwner = investment.property.owner.toString() === userId.toString();

    if (
      !isInvestor &&
      !isOwner &&
      userRole !== "admin" &&
      userRole !== "local_representative"
    ) {
      throw new Error("Unauthorized to view investment documents");
    }

    const documents = [];

    // Contract
    if (investment.contractFile?.fileId) {
      documents.push({
        type: "contract",
        fileId: investment.contractFile.fileId,
        url: investment.contractFile.url,
        uploadedAt: investment.contractFile.uploadedAt,
        uploadedBy: investment.contractFile.uploadedBy,
      });
    }

    // Title Deed
    if (investment.titleDeedDocument?.fileId) {
      documents.push({
        type: "title_deed",
        fileId: investment.titleDeedDocument.fileId,
        url: investment.titleDeedDocument.url,
        uploadedAt: investment.titleDeedDocument.uploadedAt,
        uploadedBy: investment.titleDeedDocument.uploadedBy,
        verified: !!investment.titleDeedDocument.verifiedAt,
      });
    }

    // Payment Receipt
    if (investment.paymentReceipt?.fileId) {
      documents.push({
        type: "payment_receipt",
        fileId: investment.paymentReceipt.fileId,
        url: investment.paymentReceipt.url,
        uploadedAt: investment.paymentReceipt.uploadedAt,
        uploadedBy: investment.paymentReceipt.uploadedBy,
      });
    }

    // Additional Documents
    if (investment.additionalDocuments?.length > 0) {
      investment.additionalDocuments.forEach((doc) => {
        documents.push({
          type: doc.type,
          fileId: doc.fileId,
          url: doc.url,
          description: doc.description,
          uploadedAt: doc.uploadedAt,
          uploadedBy: doc.uploadedBy,
        });
      });
    }

    return documents;
  }
  async markDelayedPayments() {
    const RentalPayment = require("../models/RentalPayment");
    const now = new Date();

    const res = await RentalPayment.updateMany(
      { status: "pending", dueDate: { $lt: now } },
      { $set: { status: "delayed", delayedSince: now } }
    );

    // (opsiyonel) geciken ödeme sahiplerine bildirim at
    // await this.notificationService.notifyDelayedPayment(...)

    return {
      matched: res.matchedCount ?? res.matched,
      modified: res.modifiedCount ?? res.modified,
    };
  }
  async sendUpcomingPaymentNotifications(daysBefore = 3) {
    const RentalPayment = require("../models/RentalPayment");
    const now = new Date();
    const threshold = new Date(
      now.getTime() + daysBefore * 24 * 60 * 60 * 1000
    );

    const upcoming = await RentalPayment.find({
      status: "pending",
      dueDate: { $gte: now, $lte: threshold },
    })
      .populate("investor", "fullName firstName lastName email")
      .populate("property", "city country");

    for (const rp of upcoming) {
      // Bildirim içeriğini düzenle
      await this.notificationService.notifyUpcomingRentalPayment(rp.investor, {
        rentalPaymentId: rp._id,
        investmentId: rp.investment,
        propertyId: rp.property,
        dueDate: rp.dueDate,
        amount: rp.amount,
      });
    }

    return { count: upcoming.length };
  }
  async sendContractEndNotifications(daysBefore = 7) {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(now.getDate() + daysBefore);

    const investments = await this.investmentRepository
      .find({ status: "active" })
      .populate("property");
    for (const inv of investments) {
      const months = inv.property?.contractPeriodMonths || 0;
      if (!months) continue;
      const start = new Date(inv.createdAt || inv.updatedAt || new Date());
      const end = new Date(
        start.getFullYear(),
        start.getMonth() + months,
        start.getDate()
      );
      if (end >= now && end <= threshold && !inv.contractEndNotified) {
        await this.investmentRepository.update(inv._id, {
          $set: { contractEndNotified: true },
        });
        await this.notificationService.notifyContractEnding(inv.investor, {
          investmentId: inv._id,
          contractEndDate: end,
        });
      }
    }
    return { success: true };
  }
  async getAllInvestmentsForAdmin(paginationOptions = {}) {
    const options = {
      populate: "property investor propertyOwner",
      allowedFilters: { ...investmentFilters, status: "exact" },
      allowedSortFields: [...investmentSortFields, "status", "createdAt"],
    };
    const result = await this.investmentRepository.paginate(
      paginationOptions,
      {},
      options
    );
    return toInvestmentListDto(result);
  }

  // Kira ödemesi yap
  async makeRentalPayment(
    investmentId,
    rentalPaymentId,
    amountPaid,
    receiptFileId = null
  ) {
    const Investment = require("../models/Investment");
    const RentalPayment = require("../models/RentalPayment");
    const Investor = require("../models/Investor");

    const investment = await this.investmentRepository.findById(
      investmentId,
      "investor property"
    );
    if (!investment) throw new Error("Investment not found");
    if (
      !["active", "contract_signed", "title_deed_pending"].includes(
        investment.status
      )
    ) {
      throw new Error(
        "Payments can only be made for active/pending investments"
      );
    }

    // 1) RentalPayment dokümanını güncelle/oluştur
    let rp = await RentalPayment.findById(rentalPaymentId);
    if (!rp) throw new Error("RentalPayment not found");

    rp.status = "paid";
    rp.paidAt = new Date();
    rp.amountPaid = amountPaid;
    if (receiptFileId) rp.receiptFile = receiptFileId;
    await rp.save();

    // 2) Investment içindeki embedded ödeme kaydını senkronize et
    const idx = investment.rentalPayments.findIndex(
      (x) => String(x._id) === String(rentalPaymentId)
    );
    if (idx >= 0) {
      investment.rentalPayments[idx].status = "paid";
      investment.rentalPayments[idx].paidAt = rp.paidAt;
      investment.rentalPayments[idx].amountPaid = amountPaid;
    }
    await Investment.updateOne(
      { _id: investmentId },
      { $set: { rentalPayments: investment.rentalPayments } }
    );

    // 3) Investor.rentalIncome artır
    await Investor.updateOne(
      { _id: investment.investor },
      { $inc: { rentalIncome: amountPaid } }
    );

    // 4) Bildirim
    await this.notificationService.notifyRentalPaymentReceived(
      investment.investor,
      {
        investmentId,
        propertyId: investment.property?._id,
        amount: amountPaid,
      }
    );

    return { success: true };
  }

  // Diğer metodlar
  async getAllInvestments(paginationOptions = {}) {
    const result = await this.investmentRepository.findWithPagination(
      paginationOptions,
      {},
      "property investor propertyOwner"
    );
    return toInvestmentListDto(result);
  }

  async getInvestmentById(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative"
    );
    if (!investment) throw new Error("Investment not found");

    // Yetkilendirme
    const isAdmin = userRole === "admin";
    const isInvestor =
      userRole === "investor" &&
      String(investment.investor?._id) === String(userId);
    const isOwner =
      userRole === "property_owner" &&
      String(investment.propertyOwner?._id) === String(userId);
    const isLocalRep =
      userRole === "local_representative" &&
      String(investment.localRepresentative?._id) === String(userId);

    if (!(isAdmin || isInvestor || isOwner || isLocalRep)) {
      throw new Error("Not authorized to view this investment");
    }

    // Admin görünümü ayrı
    if (isAdmin && typeof toInvestmentAdminViewDto === "function") {
      return toInvestmentAdminViewDto(investment);
    }
    return toInvestmentDetailDto(investment);
  }

  async getMyInvestments(investorId, paginationOptions = {}) {
    const filter = { investor: investorId };
    const result = await this.investmentRepository.findWithPagination(
      paginationOptions,
      filter,
      "property propertyOwner"
    );
    return toInvestmentListDto(result);
  }

  async getPropertyInvestments(propertyId, paginationOptions = {}) {
    const filter = { property: propertyId };
    const result = await this.investmentRepository.findWithPagination(
      paginationOptions,
      filter,
      "investor"
    );
    return toInvestmentListDto(result);
  }

  // Local representative ata
  async assignLocalRepresentative(investmentId, representativeId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Representative kontrolü
    const LocalRepresentative = require("../models/LocalRepresentative");
    const representative = await LocalRepresentative.findById(representativeId);

    if (!representative) {
      throw new Error("Local representative not found");
    }

    // Investment'ı güncelle
    investment.localRepresentative = representativeId;
    await investment.save();

    // Bildirim gönder
    await this.notificationService.notifyRepresentativeAssigned(
      representativeId,
      {
        investmentId: investmentId,
        propertyCity: investment.property.city,
      }
    );

    return toInvestmentDetailDto(investment);
  }

  // Local representative talep et
  async requestLocalRepresentative(investmentId, userId) {
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

    if (!isInvestor && !isOwner) {
      throw new Error("Unauthorized to request representative");
    }

    // Talebi kaydet
    investment.representativeRequestedBy = userId;
    investment.representativeRequestDate = new Date();
    await investment.save();

    // Admin'e bildirim
    await this.notificationService.notifyAdminRepresentativeRequested(
      investmentId,
      {
        requestedBy: userId,
        propertyCity: investment.property.city,
      }
    );

    return toInvestmentDetailDto(investment);
  }

  async processRefund(investmentId, reason) {
    const Investment = require("../models/Investment");
    const Property = require("../models/Property");
    const Investor = require("../models/Investor");

    const inv = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );
    if (!inv) throw new Error("Investment not found");

    // Investment
    await this.investmentRepository.update(investmentId, {
      $set: {
        status: "refunded",
        refundReason: reason,
        refundedAt: new Date(),
      },
    });

    // Property -> completed (ya da iş akışına uygun statü)
    await Property.updateOne(
      { _id: inv.property },
      { $set: { status: "completed" } }
    );

    // Investor aktif yatırım sayısını azalt
    await Investor.updateOne(
      { _id: inv.investor },
      { $inc: { activeInvestmentCount: -1 } }
    );

    // Bildirim
    await this.notificationService.notifyInvestmentRefunded(inv.investor, {
      investmentId,
      reason,
    });

    return { success: true };
  }

  async transferProperty(
    investmentId,
    targetOwnerId,
    performedByRole = "admin"
  ) {
    if (performedByRole !== "admin") {
      throw new Error("Only admin can transfer property");
    }

    const Property = require("../models/Property");
    const Investor = require("../models/Investor");

    const inv = await this.investmentRepository.findById(
      investmentId,
      "property investor"
    );
    if (!inv) throw new Error("Investment not found");

    // Mülkiyeti devret (iş akışındaki alanlara göre güncelle)
    await Property.updateOne(
      { _id: inv.property },
      { $set: { owner: targetOwnerId, status: "completed" } }
    );

    // Yatırım bitti say
    await this.investmentRepository.update(investmentId, {
      $set: { status: "completed" },
    });

    // Investor aktif yatırım sayısını azalt
    await Investor.updateOne(
      { _id: inv.investor },
      { $inc: { activeInvestmentCount: -1 } }
    );

    // Bildirim
    await this.notificationService.notifyPropertyTransferred(inv.investor, {
      investmentId,
      propertyId: inv.property,
    });

    return { success: true };
  }

  // Property Owner'ın kira ödemelerini getir
  async getPropertyOwnerRentalPayments(
    propertyOwnerId,
    paginationOptions = {}
  ) {
    const filter = { propertyOwner: propertyOwnerId, status: "active" };
    const investments = await this.investmentRepository.findWithPagination(
      paginationOptions,
      filter,
      "property investor"
    );

    // Kira ödemelerini topla
    const payments = [];
    investments.data.forEach((investment) => {
      investment.rentalPayments.forEach((payment) => {
        payments.push({
          investmentId: investment._id,
          propertyCity: investment.property.city,
          investorName: this.displayNameOf(investment.investor),
          month: payment.month,
          amount: payment.amount,
          status: payment.status,
          dueDate: payment.dueDate,
          paidAt: payment.paidAt,
        });
      });
    });

    return {
      data: payments,
      pagination: investments.pagination,
    };
  }

  // Investor'ın kira gelirlerini getir
  async getInvestorRentalPayments(investorId, paginationOptions = {}) {
    const filter = { investor: investorId, status: "active" };
    const investments = await this.investmentRepository.findWithPagination(
      paginationOptions,
      filter,
      "property propertyOwner"
    );

    // Kira gelirlerini topla
    const incomes = [];
    investments.data.forEach((investment) => {
      investment.rentalPayments.forEach((payment) => {
        incomes.push({
          investmentId: investment._id,
          propertyCity: investment.property.city,
          propertyOwnerName:
            investment.propertyOwner.firstName +
            " " +
            investment.propertyOwner.lastName,
          month: payment.month,
          amount: payment.amount,
          status: payment.status,
          expectedDate: payment.dueDate,
          receivedAt: payment.paidAt,
        });
      });
    });

    return {
      data: incomes,
      pagination: investments.pagination,
    };
  }

  // Yaklaşan ödemeleri getir
  async getUpcomingPayments(queryOptions = {}) {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const investments = await this.investmentRepository.findAll(
      {
        status: "active",
        "rentalPayments.status": "pending",
        "rentalPayments.dueDate": {
          $gte: today,
          $lte: nextWeek,
        },
      },
      "property investor propertyOwner"
    );

    const upcomingPayments = [];
    investments.forEach((investment) => {
      investment.rentalPayments
        .filter(
          (p) =>
            p.status === "pending" &&
            p.dueDate >= today &&
            p.dueDate <= nextWeek
        )
        .forEach((payment) => {
          upcomingPayments.push({
            investmentId: investment._id,
            property: investment.property.city,
            investor:
              investment.investor.firstName +
              " " +
              investment.investor.lastName,
            propertyOwner:
              investment.propertyOwner.firstName +
              " " +
              investment.propertyOwner.lastName,
            month: payment.month,
            amount: payment.amount,
            dueDate: payment.dueDate,
            daysRemaining: Math.ceil(
              (payment.dueDate - today) / (1000 * 60 * 60 * 24)
            ),
          });
        });
    });

    return upcomingPayments;
  }

  // Geciken ödemeleri getir
  async getDelayedPayments(queryOptions = {}) {
    const today = new Date();

    const investments = await this.investmentRepository.findAll(
      {
        status: "active",
        "rentalPayments.status": "delayed",
      },
      "property investor propertyOwner"
    );

    const delayedPayments = [];
    investments.forEach((investment) => {
      investment.rentalPayments
        .filter(
          (p) =>
            p.status === "delayed" ||
            (p.status === "pending" && p.dueDate < today)
        )
        .forEach((payment) => {
          delayedPayments.push({
            investmentId: investment._id,
            property: investment.property.city,
            investor:
              investment.investor.firstName +
              " " +
              investment.investor.lastName,
            propertyOwner:
              investment.propertyOwner.firstName +
              " " +
              investment.propertyOwner.lastName,
            month: payment.month,
            amount: payment.amount,
            dueDate: payment.dueDate,
            daysDelayed: Math.ceil(
              (today - payment.dueDate) / (1000 * 60 * 60 * 24)
            ),
          });
        });
    });

    return delayedPayments;
  }

  // Investment istatistikleri
  async getInvestmentStatistics(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner rentalPayments"
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isOwner =
      investment.propertyOwner._id.toString() === userId.toString();

    if (!isInvestor && !isOwner && userRole !== "admin") {
      throw new Error("Unauthorized to view statistics");
    }

    // İstatistikleri hesapla
    const totalPayments = investment.rentalPayments.length;
    const paidPayments = investment.rentalPayments.filter(
      (p) => p.status === "paid"
    ).length;
    const pendingPayments = investment.rentalPayments.filter(
      (p) => p.status === "pending"
    ).length;
    const delayedPayments = investment.rentalPayments.filter(
      (p) => p.status === "delayed"
    ).length;

    const totalExpectedAmount = investment.rentalPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalPaidAmount = investment.rentalPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentRate =
      totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
    const onTimePayments = investment.rentalPayments.filter(
      (p) => p.status === "paid" && p.paidAt <= p.dueDate
    ).length;
    const onTimeRate =
      paidPayments > 0 ? (onTimePayments / paidPayments) * 100 : 0;

    return {
      investmentId: investment._id,
      property: {
        city: investment.property.city,
        requestedInvestment: investment.property.requestedInvestment,
      },
      amountInvested: investment.amountInvested,
      status: investment.status,
      contractDate: investment.createdAt,
      statistics: {
        payments: {
          total: totalPayments,
          paid: paidPayments,
          pending: pendingPayments,
          delayed: delayedPayments,
        },
        amounts: {
          totalExpected: totalExpectedAmount,
          totalPaid: totalPaidAmount,
          outstanding: totalExpectedAmount - totalPaidAmount,
        },
        rates: {
          paymentRate: paymentRate.toFixed(2),
          onTimeRate: onTimeRate.toFixed(2),
        },
      },
    };
  }
  generateRentalPaymentSchedule(monthlyRent, contractMonths) {
    const schedule = [];
    const startDate = new Date();
    for (let i = 0; i < contractMonths; i++) {
      const dueDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i + 1,
        1
      );
      schedule.push({
        dueDate,
        amount: monthlyRent,
        status: "pending",
        isDelayed: false,
        notifiedUpcoming: false,
      });
    }
    return schedule;
  }
}

module.exports = InvestmentService;
