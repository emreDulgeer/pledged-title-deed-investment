// server/services/investmentService.js

const InvestmentRepository = require("../repositories/investmentRepository");
const PropertyRepository = require("../repositories/propertyRepository");
const InvestorRepository = require("../repositories/investorRepository");
const notificationService = require("./notificationService");
const paymentService = require("./payment");
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
const { APP_CURRENCY } = require("../utils/currency");
const {
  normalizeSupportedPropertyCountry,
} = require("../utils/propertyCountries");
const {
  getRepresentativeRegions,
  representativeHasRegion,
} = require("../utils/representativeRegions");

const ACTIVE_ASSIGNMENT_STATUSES = [
  "offer_sent",
  "contract_signed",
  "title_deed_pending",
  "active",
];
const REVIEWABLE_DOCUMENT_TYPES = new Set([
  "contract_investor_signed",
  "contract_owner_signed",
  "payment_receipt",
  "title_deed",
  "notary_document",
  "power_of_attorney",
  "tax_receipt",
  "other",
]);

class InvestmentService {
  constructor() {
    this.investmentRepository = new InvestmentRepository();
    this.propertyRepository = new PropertyRepository();
    this.investorRepository = new InvestorRepository();
    this.notificationService = notificationService;
    this.paymentService = paymentService;
  }
  async displayNameOf(user) {
    if (!user) return "User";
    if (user.fullName && user.fullName.trim()) return user.fullName.trim();

    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length ? parts.join(" ") : "User";
  }

  async safeNotify(methodName, ...args) {
    const notifyFn = this.notificationService?.[methodName];
    if (typeof notifyFn !== "function") {
      return null;
    }

    try {
      return await notifyFn.call(this.notificationService, ...args);
    } catch (error) {
      console.warn(`Notification skipped (${methodName}): ${error.message}`);
      return null;
    }
  }

  loadInvestmentForResponse(investmentId) {
    return this.investmentRepository.findById(
      investmentId,
      [
        { path: "property" },
        { path: "investor" },
        { path: "propertyOwner" },
        { path: "localRepresentative" },
        { path: "representativeRequestedBy" },
        {
          path: "contractWorkflow.investorSigned.fileId",
          select: "review originalName filename",
        },
        {
          path: "contractWorkflow.ownerSigned.fileId",
          select: "review originalName filename",
        },
        {
          path: "paymentReceipt.fileId",
          select: "review originalName filename",
        },
        {
          path: "titleDeedDocument.fileId",
          select: "review originalName filename",
        },
      ],
    );
  }

  enrichInvestmentDto(dto, investment) {
    if (!dto) return dto;

    dto.paymentProvider = this.paymentService.getProviderInfo();
    dto.paymentOptions = this.paymentService.getSupportedMethods({
      investment,
      property: investment?.property,
      propertyOwner: investment?.propertyOwner,
    });

    return dto;
  }

  toDetailResponse(investment, { adminView = false } = {}) {
    const dto =
      adminView && typeof toInvestmentAdminViewDto === "function"
        ? toInvestmentAdminViewDto(investment)
        : toInvestmentDetailDto(investment);

    return this.enrichInvestmentDto(dto, investment);
  }

  getRepresentativeRegionForInvestment(investment) {
    return normalizeSupportedPropertyCountry(
      investment?.representativeRequestedRegion || investment?.property?.country,
    );
  }

  getUserBrief(user) {
    if (!user || typeof user !== "object") {
      return null;
    }

    return {
      id: user._id || user.id || null,
      fullName: user.fullName || null,
      email: user.email || null,
      country: user.country || null,
      role: user.role || null,
    };
  }

  getRepresentativeRequestPayload(investment) {
    return {
      status: investment.representativeRequestStatus || "none",
      requestDate: investment.representativeRequestDate || null,
      requestedBy:
        this.getUserBrief(investment.representativeRequestedBy) ||
        investment.representativeRequestedBy ||
        null,
      requestedByRole: investment.representativeRequestedByRole || null,
      region: this.getRepresentativeRegionForInvestment(investment),
      claimedAt: investment.representativeRequestClaimedAt || null,
      resolvedAt: investment.representativeRequestResolvedAt || null,
      isPending:
        investment.representativeRequestStatus === "pending" &&
        !investment.localRepresentative,
    };
  }

  mapRepresentativeCase(investment) {
    const nextStep =
      investment.status === "title_deed_pending"
        ? "Review uploaded title deed"
        : investment.status === "contract_signed"
          ? "Track signed documents and payment proof"
          : investment.status === "active"
            ? "Monitor rental cycle"
            : "Open the case for details";

    return {
      id: investment._id,
      status: investment.status,
      amountInvested: investment.amountInvested,
      currency: investment.currency || APP_CURRENCY,
      createdAt: investment.createdAt || null,
      updatedAt: investment.updatedAt || null,
      nextStep,
      localRepresentative: investment.localRepresentative
        ? {
            id:
              investment.localRepresentative._id || investment.localRepresentative,
            fullName: investment.localRepresentative.fullName || null,
            email: investment.localRepresentative.email || null,
            region: investment.localRepresentative.region || null,
            regions: getRepresentativeRegions(investment.localRepresentative),
          }
        : null,
      representativeRequest: this.getRepresentativeRequestPayload(investment),
      property: investment.property
        ? {
            id: investment.property._id,
            city: investment.property.city || null,
            country: investment.property.country || null,
            fullAddress: investment.property.fullAddress || null,
            propertyType: investment.property.propertyType || null,
          }
        : null,
      investor: this.getUserBrief(investment.investor),
      propertyOwner: this.getUserBrief(investment.propertyOwner),
    };
  }

  getContractWorkflow(investment) {
    if (!investment?.contractWorkflow) {
      return {};
    }

    return investment.contractWorkflow.toObject
      ? investment.contractWorkflow.toObject()
      : { ...investment.contractWorkflow };
  }

  getPrincipalPayment(investment) {
    if (!investment?.principalPayment) {
      return {};
    }

    return investment.principalPayment.toObject
      ? investment.principalPayment.toObject()
      : { ...investment.principalPayment };
  }

  isAssignedRepresentative(investment, userId) {
    return (
      String(
        investment?.localRepresentative?._id || investment?.localRepresentative,
      ) === String(userId)
    );
  }

  getReviewerLabel(role) {
    switch (role) {
      case "investor":
        return "Investor";
      case "property_owner":
        return "Property owner";
      case "local_representative":
        return "Local representative";
      default:
        return role;
    }
  }

  buildApprovalKey(approval) {
    return `${approval?.reviewerRole || "unknown"}:${String(
      approval?.reviewerId || "",
    )}`;
  }

  getRequiredApprovalsForDocument(type, investment, uploadedBy) {
    const uploadedById = String(uploadedBy?._id || uploadedBy || "");
    const investorId = investment?.investor?._id || investment?.investor;
    const ownerId =
      investment?.propertyOwner?._id ||
      investment?.propertyOwner ||
      investment?.property?.owner;
    const representativeId =
      investment?.localRepresentative?._id || investment?.localRepresentative;

    const approvals = [];
    const pushApproval = (reviewerId, reviewerRole) => {
      if (!reviewerId) {
        return;
      }

      const normalizedId = String(reviewerId);
      if (!normalizedId || normalizedId === uploadedById) {
        return;
      }

      const alreadyExists = approvals.some(
        (item) =>
          item.reviewerRole === reviewerRole &&
          String(item.reviewerId) === normalizedId,
      );

      if (!alreadyExists) {
        approvals.push({
          reviewerId,
          reviewerRole,
          status: "pending",
          notes: "",
          reviewedAt: null,
        });
      }
    };

    if (type === "contract_investor_signed") {
      pushApproval(ownerId, "property_owner");
      pushApproval(representativeId, "local_representative");
      return approvals;
    }

    if (type === "contract_owner_signed") {
      pushApproval(investorId, "investor");
      pushApproval(representativeId, "local_representative");
      return approvals;
    }

    if (type === "payment_receipt") {
      pushApproval(ownerId, "property_owner");
      return approvals;
    }

    if (
      type === "title_deed" ||
      type === "notary_document" ||
      type === "power_of_attorney" ||
      type === "tax_receipt" ||
      type === "other"
    ) {
      pushApproval(investorId, "investor");
      pushApproval(ownerId, "property_owner");
      pushApproval(representativeId, "local_representative");
      return approvals;
    }

    return approvals;
  }

  buildDocumentReviewWorkflow({
    type,
    investment,
    uploadedBy,
    existingReview = {},
  }) {
    if (!REVIEWABLE_DOCUMENT_TYPES.has(type)) {
      return {
        status: "not_requested",
        reviewedBy: null,
        reviewerRole: null,
        reviewedAt: null,
        notes: "",
        requiredApprovals: [],
      };
    }

    const requiredApprovals = this.getRequiredApprovalsForDocument(
      type,
      investment,
      uploadedBy,
    );
    const existingApprovals = Array.isArray(existingReview?.requiredApprovals)
      ? existingReview.requiredApprovals
      : [];
    const existingByKey = new Map(
      existingApprovals.map((item) => [this.buildApprovalKey(item), item]),
    );

    const normalizedApprovals = requiredApprovals.map((approval) => {
      const existing = existingByKey.get(this.buildApprovalKey(approval));
      return {
        reviewerId: approval.reviewerId,
        reviewerRole: approval.reviewerRole,
        status: existing?.status || approval.status,
        notes: existing?.notes || "",
        reviewedAt: existing?.reviewedAt || null,
      };
    });

    const hasChangesRequested = normalizedApprovals.some(
      (item) => item.status === "changes_requested",
    );
    const allApproved =
      normalizedApprovals.length > 0 &&
      normalizedApprovals.every((item) => item.status === "approved");

    return {
      status: hasChangesRequested
        ? "changes_requested"
        : allApproved
          ? "approved"
          : normalizedApprovals.length > 0
            ? "pending_review"
            : "approved",
      reviewedBy: existingReview?.reviewedBy || null,
      reviewerRole: existingReview?.reviewerRole || null,
      reviewedAt: existingReview?.reviewedAt || null,
      notes: existingReview?.notes || "",
      requiredApprovals: normalizedApprovals,
    };
  }

  getReviewState(
    fileMetadata,
    { type, investment, uploadedBy, userId, userRole } = {},
  ) {
    const workflow = this.buildDocumentReviewWorkflow({
      type,
      investment,
      uploadedBy,
      existingReview: fileMetadata?.review || {},
    });
    const currentApproval = workflow.requiredApprovals.find(
      (item) =>
        item.reviewerRole === userRole &&
        String(item.reviewerId) === String(userId),
    );

    return {
      reviewStatus: workflow.status,
      reviewNotes: workflow.notes || "",
      reviewedAt: workflow.reviewedAt || null,
      reviewedBy: workflow.reviewedBy || null,
      reviewerRole: workflow.reviewerRole || null,
      approvalStatus: currentApproval?.status || "not_required",
      pendingApprovalsCount: workflow.requiredApprovals.filter(
        (item) => item.status === "pending",
      ).length,
      requiredApprovals: workflow.requiredApprovals.map((item) => ({
        reviewerId: item.reviewerId,
        reviewerRole: item.reviewerRole,
        reviewerLabel: this.getReviewerLabel(item.reviewerRole),
        status: item.status,
        notes: item.notes || "",
        reviewedAt: item.reviewedAt || null,
      })),
      canReview:
        !!currentApproval &&
        workflow.status !== "changes_requested" &&
        currentApproval.status !== "approved",
    };
  }

  async initializeDocumentReview(fileMetadataId, type, investment, uploadedBy) {
    const workflow = this.buildDocumentReviewWorkflow({
      type,
      investment,
      uploadedBy,
    });

    await FileMetadata.findByIdAndUpdate(fileMetadataId, {
      relatedModel: "Investment",
      relatedId: investment?._id || investment?.id || investment,
      documentType: type,
      review: workflow,
    });
  }

  async getDocumentReviewSnapshot(type, investment, source) {
    const fileId = source?.fileId?._id || source?.fileId;
    if (!fileId) {
      return null;
    }

    const fileMetadata =
      source?.fileId && typeof source.fileId === "object" && source.fileId.review
        ? source.fileId
        : await FileMetadata.findById(fileId).lean();

    if (!fileMetadata) {
      return null;
    }

    return this.buildDocumentReviewWorkflow({
      type,
      investment,
      uploadedBy: source?.uploadedBy,
      existingReview: fileMetadata.review || {},
    });
  }

  async areContractsApproved(investment) {
    if (
      !investment?.contractWorkflow?.investorSigned?.fileId ||
      !investment?.contractWorkflow?.ownerSigned?.fileId
    ) {
      return false;
    }

    const [investorContractReview, ownerContractReview] = await Promise.all([
      this.getDocumentReviewSnapshot(
        "contract_investor_signed",
        investment,
        investment.contractWorkflow.investorSigned,
      ),
      this.getDocumentReviewSnapshot(
        "contract_owner_signed",
        investment,
        investment.contractWorkflow.ownerSigned,
      ),
    ]);

    return (
      investorContractReview?.status === "approved" &&
      ownerContractReview?.status === "approved"
    );
  }

  async activateInvestmentAfterTitleDeedApproval(
    investment,
    reviewerId,
    reviewerRole,
  ) {
    const agreedMonthlyRent =
      investment.offerTerms?.desiredMonthlyRent || investment.property?.rentOffered || 0;

    await this.investmentRepository.update(investment._id, {
      "titleDeedDocument.verifiedBy": reviewerId,
      "titleDeedDocument.verifiedAt": new Date(),
      status: "active",
      rentalPayments:
        investment.rentalPayments?.length > 0
          ? investment.rentalPayments
          : this.generateRentalPaymentSchedule(
              agreedMonthlyRent,
              investment.property.contractPeriodMonths,
            ),
    });

    await this.propertyRepository.update(investment.property._id, {
      status: "active",
    });

    await this.safeNotify("notifyTitleDeedRegistered", investment.investor._id, {
      investmentId: investment._id,
      propertyCity: investment.property.city,
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investment._id);
    return this.toDetailResponse(refreshedInvestment);
  }

  buildInvestmentDocument(type, source, investment, extra = {}) {
    const fileRecord = source?.fileId;
    const fileId = fileRecord?._id || fileRecord;

    if (!fileId) {
      return null;
    }

    return {
      type,
      fileId,
      name: fileRecord?.originalName || fileRecord?.filename || extra.name,
      url: source?.url || extra.url || null,
      uploadedAt: source?.uploadedAt || extra.uploadedAt || null,
      uploadedBy: source?.uploadedBy || extra.uploadedBy || null,
      verified: Boolean(extra.verified),
      ...this.getReviewState(
        fileRecord,
        {
          type,
          investment,
          uploadedBy: source?.uploadedBy || extra.uploadedBy || null,
          userId: extra.userId,
          userRole: extra.userRole,
        },
      ),
      ...extra,
    };
  }

  getInvestmentDocumentContext(investment, fileId) {
    const matchesFileId = (candidate) =>
      String(candidate?._id || candidate || "") === String(fileId);

    if (matchesFileId(investment?.contractWorkflow?.investorSigned?.fileId)) {
      return {
        type: "contract_investor_signed",
        source: investment.contractWorkflow.investorSigned,
        uploadedBy: investment.contractWorkflow.investorSigned?.uploadedBy,
      };
    }

    if (matchesFileId(investment?.contractWorkflow?.ownerSigned?.fileId)) {
      return {
        type: "contract_owner_signed",
        source: investment.contractWorkflow.ownerSigned,
        uploadedBy: investment.contractWorkflow.ownerSigned?.uploadedBy,
      };
    }

    if (matchesFileId(investment?.paymentReceipt?.fileId)) {
      return {
        type: "payment_receipt",
        source: investment.paymentReceipt,
        uploadedBy: investment.paymentReceipt?.uploadedBy,
      };
    }

    if (matchesFileId(investment?.titleDeedDocument?.fileId)) {
      return {
        type: "title_deed",
        source: investment.titleDeedDocument,
        uploadedBy: investment.titleDeedDocument?.uploadedBy,
      };
    }

    const additionalDocument = investment?.additionalDocuments?.find((item) =>
      matchesFileId(item?.fileId),
    );
    if (additionalDocument) {
      return {
        type: additionalDocument.type,
        source: additionalDocument,
        uploadedBy: additionalDocument?.uploadedBy,
      };
    }

    return null;
  }

  normalizeOfferTerms(property, offerData = {}) {
    const listedAmount = Number(property?.requestedInvestment || 0);
    const listedMonthlyRent = Number(property?.rentOffered || 0);
    const rawAmount = offerData?.amountInvested;
    const rawOwnershipPercent =
      offerData?.ownershipPercent ?? offerData?.offeredOwnershipPercent;
    const rawDesiredMonthlyRent =
      offerData?.desiredMonthlyRent ?? offerData?.requestedMonthlyRent;
    const hasAmount =
      rawAmount !== undefined && rawAmount !== null && rawAmount !== "";
    const hasOwnershipPercent =
      rawOwnershipPercent !== undefined &&
      rawOwnershipPercent !== null &&
      rawOwnershipPercent !== "";

    if (!hasAmount && !hasOwnershipPercent) {
      throw new Error("Offer amount or ownership percentage is required");
    }

    let amountInvested = hasAmount ? Number(rawAmount) : null;
    let ownershipPercent = hasOwnershipPercent
      ? Number(rawOwnershipPercent)
      : null;

    if (hasAmount && (!Number.isFinite(amountInvested) || amountInvested <= 0)) {
      throw new Error("Offer amount must be greater than zero");
    }

    if (
      hasOwnershipPercent &&
      (!Number.isFinite(ownershipPercent) ||
        ownershipPercent <= 0 ||
        ownershipPercent > 100)
    ) {
      throw new Error("Ownership percentage must be between 0 and 100");
    }

    if (!hasAmount) {
      amountInvested = Number(
        ((listedAmount * ownershipPercent) / 100).toFixed(2),
      );
    }

    if (!hasOwnershipPercent) {
      ownershipPercent = Number(
        ((amountInvested / listedAmount) * 100).toFixed(2),
      );
    }

    const expectedOwnershipPercent = Number(
      ((amountInvested / listedAmount) * 100).toFixed(2),
    );

    if (Math.abs(expectedOwnershipPercent - ownershipPercent) > 0.5) {
      throw new Error("Offer amount and ownership percentage do not match");
    }

    if (amountInvested > listedAmount) {
      throw new Error("Offer amount cannot exceed the listed investment amount");
    }

    const desiredMonthlyRent = Number(
      rawDesiredMonthlyRent !== undefined &&
        rawDesiredMonthlyRent !== null &&
        rawDesiredMonthlyRent !== ""
        ? rawDesiredMonthlyRent
        : listedMonthlyRent,
    );

    if (!Number.isFinite(desiredMonthlyRent) || desiredMonthlyRent <= 0) {
      throw new Error("Desired monthly rent must be greater than zero");
    }

    const annualYieldPercent = Number(
      (((desiredMonthlyRent * 12) / amountInvested) * 100).toFixed(2),
    );
    const message =
      typeof offerData?.message === "string"
        ? offerData.message.trim().slice(0, 500)
        : "";

    return {
      amountInvested,
      ownershipPercent,
      desiredMonthlyRent,
      annualYieldPercent,
      message,
    };
  }

  // Yeni yatırım teklifi oluştur
  async createInvestmentOffer(propertyId, investorId, offerData) {
    // Property kontrolü
    const property = await this.propertyRepository.findById(
      propertyId,
      "owner",
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
        `Investment limit reached. Current plan allows ${investor.investmentLimit} active investments`,
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
        "You already have an active or pending investment for this property",
      );
    }

    const offerTerms = this.normalizeOfferTerms(property, offerData);

    // Yeni Investment oluştur
    const newInvestment = await this.investmentRepository.create({
      property: propertyId,
      investor: investorId,
      propertyOwner: property.owner?._id,
      currency: APP_CURRENCY,
      amountInvested: offerTerms.amountInvested,
      status: "offer_sent",
      offerTerms,
    });

    // Teklif sayacı
    await this.propertyRepository.update(propertyId, {
      $inc: { investmentOfferCount: 1 },
    });

    await this.safeNotify("notifyNewInvestmentOffer", property.owner._id, {
      investmentId: newInvestment._id,
      investorName: investor.fullName,
      amount: offerTerms.amountInvested,
    });

    return newInvestment;
  }

  // Offer'ı kabul et
  async acceptOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Durum kontrolü
    if (investment.status !== "offer_sent") {
      throw new Error(
        `Cannot accept offer. Current status is: ${investment.status}. Offer must be in 'offer_sent' status to be accepted.`,
      );
    }

    // Property owner kontrolü
    if (investment.property.owner.toString() !== propertyOwnerId.toString()) {
      throw new Error("Unauthorized to accept this offer");
    }

    if (investment.property.status !== "published") {
      throw new Error("Property is no longer open for offer acceptance");
    }

    const competingOffers = await this.investmentRepository.findAll(
      {
        property: investment.property._id,
        status: "offer_sent",
        _id: { $ne: investmentId },
      },
      "investor property",
    );

    // Property durumunu güncelle
    await this.propertyRepository.update(investment.property._id, {
      status: "in_contract",
      investmentOfferCount: 0,
    });

    // Investment durumunu güncelle
    await this.investmentRepository.update(investmentId, {
      status: "contract_signed",
      offerDecision: {
        acceptedAt: new Date(),
        decidedBy: propertyOwnerId,
      },
      principalPayment: {
        status: "not_started",
        amount: investment.amountInvested,
        currency: investment.currency || APP_CURRENCY,
      },
    });

    if (competingOffers.length > 0) {
      await this.investmentRepository.updateMany(
        {
          property: investment.property._id,
          status: "offer_sent",
          _id: { $ne: investmentId },
        },
        {
          status: "rejected",
          offerDecision: {
            rejectedAt: new Date(),
            rejectionReason: "Another offer was accepted for this property",
            decidedBy: propertyOwnerId,
          },
        },
      );

      for (const competingOffer of competingOffers) {
        await this.safeNotify(
          "notifyOfferRejected",
          competingOffer.investor?._id || competingOffer.investor,
          {
            investmentId: competingOffer._id,
            propertyCity: competingOffer.property?.city || investment.property.city,
          },
        );
      }
    }

    await this.safeNotify("notifyOfferAccepted", investment.investor._id, {
      investmentId: investmentId,
      propertyCity: investment.property.city,
    });

    // Investor'ın aktif yatırım sayısını artır
    await this.investorRepository.update(investment.investor._id, {
      $inc: { activeInvestmentCount: 1 },
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Offer'ı reddet
  async rejectOffer(investmentId, propertyOwnerId) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Durum kontrolü
    if (investment.status !== "offer_sent") {
      throw new Error(
        `Cannot reject offer. Current status is: ${investment.status}. Offer must be in 'offer_sent' status to be rejected.`,
      );
    }

    // Property owner kontrolü
    if (investment.property.owner.toString() !== propertyOwnerId.toString()) {
      throw new Error("Unauthorized to reject this offer");
    }

    // Investment'ı rejected durumuna al
    await this.investmentRepository.update(investmentId, {
      status: "rejected",
      offerDecision: {
        rejectedAt: new Date(),
        rejectionReason: "Rejected by property owner",
        decidedBy: propertyOwnerId,
      },
    });
    await this.propertyRepository.update(investment.property._id, {
      investmentOfferCount: Math.max(
        Number(investment.property.investmentOfferCount || 1) - 1,
        0,
      ),
    });

    await this.safeNotify("notifyOfferRejected", investment.investor._id, {
      investmentId: investmentId,
      propertyCity: investment.property.city,
    });

    return { message: "Offer rejected successfully" };
  }

  // Kontrat yükle - FileUploadManager ile entegre
  async uploadContract(investmentId, userId, fileMetadataId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
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

    const contractWorkflow = this.getContractWorkflow(investment);
    const signatureKey = isInvestor
      ? "investorSigned"
      : isOwner
        ? "ownerSigned"
        : contractWorkflow.investorSigned?.fileId
          ? "ownerSigned"
          : "investorSigned";
    const uploadedAt = new Date();

    contractWorkflow[signatureKey] = {
      fileId: fileMetadataId,
      url: fileMetadata.url,
      uploadedAt,
      uploadedBy: userId,
    };
    contractWorkflow.fullySignedAt = null;

    const updateData = {
      contractFile: {
        fileId: fileMetadataId,
        url: fileMetadata.url,
        uploadedAt,
        uploadedBy: userId,
      },
      contractWorkflow,
    };

    await this.investmentRepository.update(investmentId, updateData);

    // FileMetadata'yı güncelle - Investment ile ilişkilendir
    await this.initializeDocumentReview(
      fileMetadataId,
      signatureKey === "investorSigned"
        ? "contract_investor_signed"
        : "contract_owner_signed",
      investment,
      userId,
    );

    if (isInvestor) {
      await this.safeNotify(
        "notifyContractUploaded",
        investment.property.owner,
        "property_owner",
        {
          investmentId: investmentId,
          propertyCity: investment.property.city,
        },
      );
    } else if (isOwner) {
      await this.safeNotify(
        "notifyContractUploaded",
        investment.investor._id,
        "investor",
        {
          investmentId: investmentId,
          propertyCity: investment.property.city,
        },
      );
    }

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Tapu kaydı yükle - FileUploadManager ile entegre
  async uploadTitleDeed(investmentId, userId, fileMetadataId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isOwner = investment.property.owner.toString() === userId.toString();

    if (!isOwner && userRole !== "admin") {
      throw new Error("Unauthorized to upload title deed");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Contract must be signed before title deed upload");
    }

    if (!(await this.areContractsApproved(investment))) {
      throw new Error(
        "All signed contracts must be approved before title deed registration",
      );
    }

    if (investment.principalPayment?.status !== "confirmed") {
      throw new Error(
        "Principal payment must be confirmed before title deed upload",
      );
    }

    // Property Owner KYC kontrolü
    const PropertyOwner = require("../models/PropertyOwner");
    const propertyOwner = await PropertyOwner.findById(
      investment.property.owner,
    );

    if (propertyOwner.kycStatus !== "Approved") {
      throw new Error(
        "Property owner's KYC must be approved before title deed registration",
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
        verifiedBy: null,
        verifiedAt: null,
      },
      status: "title_deed_pending",
    };

    await this.investmentRepository.update(investmentId, updateData);

    // FileMetadata'yı güncelle - Investment ile ilişkilendir
    await this.initializeDocumentReview(
      fileMetadataId,
      "title_deed",
      investment,
      userId,
    );

    // Admin'e onay için bildirim gönder
    // await this.notificationService.notifyAdminForTitleDeedApproval(
    //   investmentId,
    //   {
    //     propertyCity: investment.property.city,
    //     investorName: this.displayNameOf(investment.investor),
    //   }
    // );

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Yalnızca gerekli onaylar tamamlandıktan sonra title deed aktivasyonu
  async approveTitleDeed(
    investmentId,
    reviewerId,
    reviewerRole = "admin",
  ) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
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

    const titleDeedReview = await this.getDocumentReviewSnapshot(
      "title_deed",
      investment,
      investment.titleDeedDocument,
    );

    if (titleDeedReview?.status !== "approved") {
      throw new Error("Title deed approvals are still pending");
    }

    return this.activateInvestmentAfterTitleDeedApproval(
      investment,
      reviewerId,
      reviewerRole,
    );
  }

  async reviewInvestmentDocument(
    investmentId,
    fileId,
    reviewerId,
    reviewerRole,
    { action, notes = "" } = {},
  ) {
    if (!["approve", "request_changes"].includes(action)) {
      throw new Error("Invalid review action");
    }

    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    const documentContext = this.getInvestmentDocumentContext(investment, fileId);
    if (!documentContext) {
      throw new Error("Document not found on this investment");
    }

    if (!REVIEWABLE_DOCUMENT_TYPES.has(documentContext.type)) {
      throw new Error("This document cannot be reviewed");
    }

    const fileMetadata = await FileMetadata.findById(fileId);
    if (!fileMetadata || String(fileMetadata.relatedId || "") !== String(investmentId)) {
      throw new Error("Document not found on this investment");
    }

    const reviewNotes = String(notes || "").trim();
    if (action === "request_changes" && !reviewNotes) {
      throw new Error("Please add a note when requesting a new upload");
    }

    const currentReview = this.buildDocumentReviewWorkflow({
      type: documentContext.type,
      investment,
      uploadedBy: documentContext.uploadedBy,
      existingReview: fileMetadata.review || {},
    });

    if (currentReview.status === "changes_requested") {
      throw new Error("A new upload is required before this document can be reviewed");
    }

    const currentApprovalIndex = currentReview.requiredApprovals.findIndex(
      (item) =>
        item.reviewerRole === reviewerRole &&
        String(item.reviewerId) === String(reviewerId),
    );

    if (currentApprovalIndex === -1) {
      throw new Error("Unauthorized to review investment documents");
    }

    currentReview.requiredApprovals[currentApprovalIndex] = {
      ...currentReview.requiredApprovals[currentApprovalIndex],
      status: action === "approve" ? "approved" : "changes_requested",
      notes: reviewNotes,
      reviewedAt: new Date(),
    };

    const hasChangesRequested = currentReview.requiredApprovals.some(
      (item) => item.status === "changes_requested",
    );
    const allApproved =
      currentReview.requiredApprovals.length > 0 &&
      currentReview.requiredApprovals.every(
        (item) => item.status === "approved",
      );

    const reviewPayload = {
      ...currentReview,
      status: hasChangesRequested
        ? "changes_requested"
        : allApproved
          ? "approved"
          : "pending_review",
      reviewedBy: reviewerId,
      reviewerRole,
      reviewedAt: new Date(),
      notes: reviewNotes,
    };

    await FileMetadata.findByIdAndUpdate(fileId, {
      review: reviewPayload,
    });

    if (action === "request_changes" && documentContext.type === "title_deed") {
      investment.status = "contract_signed";
      if (investment.titleDeedDocument) {
        investment.titleDeedDocument.verifiedBy = null;
        investment.titleDeedDocument.verifiedAt = null;
      }
      await investment.save();
    }

    if (
      (documentContext.type === "contract_investor_signed" ||
        documentContext.type === "contract_owner_signed") &&
      action === "request_changes" &&
      investment.contractWorkflow
    ) {
      investment.contractWorkflow.fullySignedAt = null;
      await investment.save();
    }

    if (action === "request_changes" && documentContext.type === "payment_receipt") {
      const currentPayment = this.getPrincipalPayment(investment);
      await this.investmentRepository.update(investmentId, {
        principalPayment: {
          ...currentPayment,
          status: currentPayment.instructions ? "instructions_ready" : "not_started",
          confirmedAt: null,
          confirmedBy: null,
        },
      });
    }

    if (action === "approve" && reviewPayload.status === "approved") {
      if (
        documentContext.type === "contract_investor_signed" ||
        documentContext.type === "contract_owner_signed"
      ) {
        if (await this.areContractsApproved(investment)) {
          await this.investmentRepository.update(investmentId, {
            "contractWorkflow.fullySignedAt": new Date(),
          });
        }
      }

      if (documentContext.type === "payment_receipt") {
        const currentPayment = this.getPrincipalPayment(investment);
        await this.investmentRepository.update(investmentId, {
          principalPayment: {
            ...currentPayment,
            status: "confirmed",
            amount: currentPayment.amount || investment.amountInvested,
            currency:
              currentPayment.currency || investment.currency || APP_CURRENCY,
            confirmedAt: new Date(),
            confirmedBy: reviewerId,
          },
        });
      }

      if (documentContext.type === "title_deed") {
        return this.activateInvestmentAfterTitleDeedApproval(
          investment,
          reviewerId,
          reviewerRole,
        );
      }
    }

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Payment receipt yükle
  async uploadPaymentReceipt(investmentId, userId, fileMetadataId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();

    if (!isInvestor && userRole !== "admin") {
      throw new Error("Unauthorized to upload payment receipt");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Payment receipt can only be uploaded during funding stage");
    }

    if (!(await this.areContractsApproved(investment))) {
      throw new Error(
        "All signed contracts must be approved before payment proof upload",
      );
    }

    // FileMetadata kontrolü
    const fileMetadata = await FileMetadata.findById(fileMetadataId);
    if (!fileMetadata) {
      throw new Error("File not found");
    }

    const principalPayment = this.getPrincipalPayment(investment);
    const providerInfo = this.paymentService.getProviderInfo();
    const supportedMethods = this.paymentService.getSupportedMethods({
      investment,
      property: investment.property,
    });

    const updateData = {
      paymentReceipt: {
        fileId: fileMetadataId,
        url: fileMetadata.url,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
      principalPayment: {
        ...principalPayment,
        status: "receipt_uploaded",
        providerKey: principalPayment.providerKey || providerInfo.key,
        providerLabel: principalPayment.providerLabel || providerInfo.name,
        method: principalPayment.method || supportedMethods[0]?.key,
        amount: principalPayment.amount || investment.amountInvested,
        currency: principalPayment.currency || investment.currency || APP_CURRENCY,
        receiptUploadedAt: new Date(),
        receiptUploadedBy: userId,
        confirmedAt: null,
        confirmedBy: null,
      },
    };

    await this.investmentRepository.update(investmentId, updateData);

    // FileMetadata'yı güncelle
    await this.initializeDocumentReview(
      fileMetadataId,
      "payment_receipt",
      investment,
      userId,
    );

    await this.safeNotify("notifyPaymentReceiptUploaded", investment.property.owner, {
      investmentId: investmentId,
      investorName: this.displayNameOf(investment.investor),
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  async preparePrincipalPayment(investmentId, userId, userRole, paymentData = {}) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    const isInvestor = String(investment.investor?._id) === String(userId);
    if (!isInvestor && userRole !== "admin") {
      throw new Error("Unauthorized to prepare payment");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Payment instructions are only available in contract stage");
    }

    const contractsApproved =
      !!investment.contractWorkflow?.fullySignedAt ||
      (await this.areContractsApproved(investment));

    if (!contractsApproved) {
      throw new Error(
        "All signed contracts must be approved before payment instructions are prepared",
      );
    }

    if (!investment.contractWorkflow?.fullySignedAt) {
      await this.investmentRepository.update(investmentId, {
        "contractWorkflow.fullySignedAt": new Date(),
      });
    }

    const supportedMethods = this.paymentService.getSupportedMethods({
      investment,
      property: investment.property,
      propertyOwner: investment.propertyOwner,
    });
    const requestedMethod = paymentData.method || supportedMethods[0]?.key;

    if (!supportedMethods.some((item) => item.key === requestedMethod)) {
      throw new Error("Unsupported payment method");
    }

    const paymentSession = await this.paymentService.initializeInvestmentPayment({
      investment,
      property: investment.property,
      propertyOwner: investment.propertyOwner,
      initiatedBy: userId,
      method: requestedMethod,
    });

    const principalPayment = {
      ...this.getPrincipalPayment(investment),
      ...paymentSession,
      status: "instructions_ready",
      initiatedAt: new Date(),
      initiatedBy: userId,
    };

    await this.investmentRepository.update(investmentId, {
      principalPayment,
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  async confirmPrincipalPayment(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    const isOwner =
      String(investment.propertyOwner?._id || investment.property?.owner) ===
      String(userId);

    if (!isOwner && userRole !== "admin") {
      throw new Error("Unauthorized to confirm payment");
    }

    if (investment.status !== "contract_signed") {
      throw new Error("Payment confirmation is only available in contract stage");
    }

    const contractsApproved =
      !!investment.contractWorkflow?.fullySignedAt ||
      (await this.areContractsApproved(investment));

    if (!contractsApproved) {
      throw new Error(
        "All signed contracts must be approved before payment confirmation",
      );
    }

    if (!investment.contractWorkflow?.fullySignedAt) {
      await this.investmentRepository.update(investmentId, {
        "contractWorkflow.fullySignedAt": new Date(),
      });
    }

    const currentPayment = this.getPrincipalPayment(investment);
    if (currentPayment.status === "confirmed") {
      throw new Error("Principal payment is already confirmed");
    }

    if (!currentPayment.providerKey && !investment.paymentReceipt?.fileId) {
      throw new Error("Payment has not been prepared or submitted yet");
    }

    if (investment.paymentReceipt?.fileId) {
      const paymentReceiptReview = await this.getDocumentReviewSnapshot(
        "payment_receipt",
        investment,
        investment.paymentReceipt,
      );

      if (paymentReceiptReview?.status !== "approved") {
        throw new Error("Payment receipt approvals are still pending");
      }
    }

    await this.investmentRepository.update(investmentId, {
      principalPayment: {
        ...currentPayment,
        status: "confirmed",
        amount: currentPayment.amount || investment.amountInvested,
        currency: currentPayment.currency || investment.currency || APP_CURRENCY,
        confirmedAt: new Date(),
        confirmedBy: userId,
      },
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Investment dökümanlarını listele
  async getInvestmentDocuments(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      [
        { path: "property", select: "owner" },
        { path: "investor", select: "_id" },
        {
          path: "contractFile.fileId",
          select: "originalName filename review",
        },
        {
          path: "contractWorkflow.investorSigned.fileId",
          select: "originalName filename review",
        },
        {
          path: "contractWorkflow.ownerSigned.fileId",
          select: "originalName filename review",
        },
        {
          path: "titleDeedDocument.fileId",
          select: "originalName filename review",
        },
        {
          path: "paymentReceipt.fileId",
          select: "originalName filename review",
        },
        {
          path: "additionalDocuments.fileId",
          select: "originalName filename review",
        },
        {
          path: "rentalPayments.paymentReceipt.fileId",
          select: "originalName filename review",
        },
        {
          path: "refund.refundReceipt.fileId",
          select: "originalName filename review",
        },
        {
          path: "transferOfProperty.transferDocument.fileId",
          select: "originalName filename review",
        },
        {
          path: "localRepresentative",
          select: "_id",
        },
      ],
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    // Yetki kontrolü
    const isInvestor = investment.investor._id.toString() === userId.toString();
    const isOwner = investment.property.owner.toString() === userId.toString();
    const isAssignedRepresentative =
      String(
        investment.localRepresentative?._id || investment.localRepresentative,
      ) === String(userId);

    if (
      !isInvestor &&
      !isOwner &&
      userRole !== "admin" &&
      !isAssignedRepresentative
    ) {
      throw new Error("Unauthorized to view investment documents");
    }

    const documents = [];
    const pushDocument = (document) => {
      if (!document?.fileId) return;
      documents.push(document);
    };

    if (investment.contractWorkflow?.investorSigned?.fileId) {
      pushDocument(
        this.buildInvestmentDocument(
          "contract_investor_signed",
          investment.contractWorkflow.investorSigned,
          investment,
          { userId, userRole },
        ),
      );
    }

    if (investment.contractWorkflow?.ownerSigned?.fileId) {
      pushDocument(
        this.buildInvestmentDocument(
          "contract_owner_signed",
          investment.contractWorkflow.ownerSigned,
          investment,
          { userId, userRole },
        ),
      );
    } else if (investment.contractFile?.fileId) {
      pushDocument(
        this.buildInvestmentDocument(
          "contract",
          investment.contractFile,
          investment,
          { userId, userRole },
        ),
      );
    }

    // Title Deed
    if (investment.titleDeedDocument?.fileId) {
      pushDocument(
        this.buildInvestmentDocument(
          "title_deed",
          investment.titleDeedDocument,
          investment,
          {
            verified: !!investment.titleDeedDocument.verifiedAt,
            userId,
            userRole,
          },
        ),
      );
    }

    // Payment Receipt
    if (investment.paymentReceipt?.fileId) {
      pushDocument(
        this.buildInvestmentDocument(
          "payment_receipt",
          investment.paymentReceipt,
          investment,
          { userId, userRole },
        ),
      );
    }

    // Additional Documents
    if (investment.additionalDocuments?.length > 0) {
      investment.additionalDocuments.forEach((doc) => {
        pushDocument(
          this.buildInvestmentDocument(doc.type, doc, investment, {
            description: doc.description,
            userId,
            userRole,
          }),
        );
      });
    }

    // Rental payment receipts
    if (investment.rentalPayments?.length > 0) {
      investment.rentalPayments.forEach((payment) => {
        if (!payment.paymentReceipt?.fileId) {
          return;
        }

        pushDocument({
          type: "rental_receipt",
          fileId:
            payment.paymentReceipt.fileId._id ||
            payment.paymentReceipt.fileId,
          name:
            payment.paymentReceipt.fileId.originalName ||
            payment.paymentReceipt.fileId.filename,
          url: payment.paymentReceipt.url,
          description: payment.month
            ? `Rental receipt for ${payment.month}`
            : undefined,
          uploadedAt: payment.paidAt || payment.dueDate,
          uploadedBy: investment.property?.owner,
          month: payment.month,
        });
      });
    }

    if (investment.refund?.refundReceipt?.fileId) {
      pushDocument({
        type: "refund_receipt",
        fileId:
          investment.refund.refundReceipt.fileId._id ||
          investment.refund.refundReceipt.fileId,
        name:
          investment.refund.refundReceipt.fileId.originalName ||
          investment.refund.refundReceipt.fileId.filename,
        url: investment.refund.refundReceipt.url,
        uploadedAt: investment.refund.refundedAt,
      });
    }

    if (investment.transferOfProperty?.transferDocument?.fileId) {
      pushDocument({
        type: "transfer_document",
        fileId:
          investment.transferOfProperty.transferDocument.fileId._id ||
          investment.transferOfProperty.transferDocument.fileId,
        name:
          investment.transferOfProperty.transferDocument.fileId.originalName ||
          investment.transferOfProperty.transferDocument.fileId.filename,
        url: investment.transferOfProperty.transferDocument.url,
        uploadedAt: investment.transferOfProperty.date,
      });
    }

    return documents.sort((a, b) => {
      const dateA = a.uploadedAt ? new Date(a.uploadedAt).valueOf() : 0;
      const dateB = b.uploadedAt ? new Date(b.uploadedAt).valueOf() : 0;
      return dateB - dateA;
    });
  }
  async markDelayedPayments() {
    const RentalPayment = require("../models/RentalPayment");
    const now = new Date();

    const res = await RentalPayment.updateMany(
      { status: "pending", dueDate: { $lt: now } },
      { $set: { status: "delayed", delayedSince: now } },
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
      now.getTime() + daysBefore * 24 * 60 * 60 * 1000,
    );

    const upcoming = await RentalPayment.find({
      status: "pending",
      dueDate: { $gte: now, $lte: threshold },
    })
      .populate("investor", "fullName firstName lastName email")
      .populate("property", "city country");

    for (const rp of upcoming) {
      // Bildirim içeriğini düzenle
      await this.safeNotify("notifyUpcomingRentalPayment", rp.investor, {
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
        start.getDate(),
      );
      if (end >= now && end <= threshold && !inv.contractEndNotified) {
        await this.investmentRepository.update(inv._id, {
          $set: { contractEndNotified: true },
        });
        await this.safeNotify("notifyContractEnding", inv.investor, {
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
    // İKİ parametre ver: (query, options). Üçüncü argüman zaten yok sayılıyordu.
    const raw = await this.investmentRepository.paginate(
      paginationOptions,
      options,
    );
    return {
      data: raw.data.map((x) =>
        toInvestmentAdminViewDto
          ? toInvestmentAdminViewDto(x)
          : toInvestmentListDto(x),
      ),
      pagination: raw.pagination,
    };
  }

  // Kira ödemesi yap
  async makeRentalPayment(
    investmentId,
    rentalPaymentId,
    amountPaid,
    receiptFileId = null,
  ) {
    const Investment = require("../models/Investment");
    const RentalPayment = require("../models/RentalPayment");
    const Investor = require("../models/Investor");

    const investment = await this.investmentRepository.findById(
      investmentId,
      "investor property",
    );
    if (!investment) throw new Error("Investment not found");
    if (
      !["active", "contract_signed", "title_deed_pending"].includes(
        investment.status,
      )
    ) {
      throw new Error(
        "Payments can only be made for active/pending investments",
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
      (x) => String(x._id) === String(rentalPaymentId),
    );
    if (idx >= 0) {
      investment.rentalPayments[idx].status = "paid";
      investment.rentalPayments[idx].paidAt = rp.paidAt;
      investment.rentalPayments[idx].amountPaid = amountPaid;
    }
    await Investment.updateOne(
      { _id: investmentId },
      { $set: { rentalPayments: investment.rentalPayments } },
    );

    // 3) Investor.rentalIncome artır
    await Investor.updateOne(
      { _id: investment.investor },
      { $inc: { rentalIncome: amountPaid } },
    );

    // 4) Bildirim
    await this.safeNotify("notifyRentalPaymentReceived", investment.investor, {
      investmentId,
      propertyId: investment.property?._id,
      amount: amountPaid,
    });

    return { success: true };
  }

  // Diğer metodlar
  async getAllInvestments(paginationOptions = {}) {
    const result = await this.investmentRepository.paginate(paginationOptions, {
      populate: "property investor propertyOwner localRepresentative",
      allowedFilters: {
        ...investmentFilters,
        status: "exact",
      },
      allowedSortFields: [...investmentSortFields, "status", "createdAt"],
    });

    return {
      data: result.data.map((investment) => toInvestmentListDto(investment)),
      pagination: result.pagination,
    };
  }

  async getInvestmentById(investmentId, userId, userRole, userContext = {}) {
    let investment = await this.loadInvestmentForResponse(investmentId);
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
    const isRegionalPendingRep =
      userRole === "local_representative" &&
      !investment.localRepresentative &&
      investment.representativeRequestStatus === "pending" &&
      getRepresentativeRegions(userContext).includes(
        this.getRepresentativeRegionForInvestment(investment),
      );

    if (!(isAdmin || isInvestor || isOwner || isLocalRep || isRegionalPendingRep)) {
      throw new Error("Not authorized to view this investment");
    }

    let shouldReloadInvestment = false;

    if (
      investment.status === "contract_signed" &&
      !investment.contractWorkflow?.fullySignedAt &&
      (await this.areContractsApproved(investment))
    ) {
      await this.investmentRepository.update(investmentId, {
        "contractWorkflow.fullySignedAt": new Date(),
      });
      shouldReloadInvestment = true;
    }

    if (
      investment.status === "contract_signed" &&
      investment.paymentReceipt?.fileId &&
      investment.principalPayment?.status !== "confirmed"
    ) {
      const paymentReceiptReview = await this.getDocumentReviewSnapshot(
        "payment_receipt",
        investment,
        investment.paymentReceipt,
      );

      if (paymentReceiptReview?.status === "approved") {
        const currentPayment = this.getPrincipalPayment(investment);
        await this.investmentRepository.update(investmentId, {
          principalPayment: {
            ...currentPayment,
            status: "confirmed",
            amount: currentPayment.amount || investment.amountInvested,
            currency:
              currentPayment.currency || investment.currency || APP_CURRENCY,
            confirmedAt: currentPayment.confirmedAt || new Date(),
            confirmedBy:
              currentPayment.confirmedBy || paymentReceiptReview.reviewedBy || null,
          },
        });
        shouldReloadInvestment = true;
      }
    }

    if (shouldReloadInvestment) {
      investment = await this.loadInvestmentForResponse(investmentId);
    }

    // Admin görünümü ayrı
    if (isAdmin && typeof toInvestmentAdminViewDto === "function") {
      return this.toDetailResponse(investment, { adminView: true });
    }
    return this.toDetailResponse(investment);
  }
  async getMyInvestments(investorId, paginationOptions = {}) {
    const { status, ...queryOptions } = paginationOptions;
    const filter = { investor: investorId };

    if (status) {
      const statuses = String(status)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    const options = {
      populate: "property propertyOwner",
      allowedFilters: {
        ...investmentFilters,
        status: "exact",
      },
      allowedSortFields: [...investmentSortFields, "status", "createdAt"],
      customFilters: filter,
    };

    const result = await this.investmentRepository.paginate(
      queryOptions,
      options,
    );

    return {
      data: result.data.map((investment) => toInvestmentListDto(investment)),
      pagination: result.pagination,
    };
  }

  async getPropertyInvestments(
    propertyId,
    paginationOptions = {},
    propertyOwnerId = null,
  ) {
    const property = await this.propertyRepository.findById(propertyId, "owner");

    if (!property) {
      throw new Error("Property not found");
    }

    const propertyOwnerValue = property.owner?._id || property.owner;
    if (
      propertyOwnerId &&
      String(propertyOwnerValue) !== String(propertyOwnerId)
    ) {
      throw new Error("Unauthorized to view investments for this property");
    }

    const { status, sortBy = "createdAt", sortOrder = "desc" } =
      paginationOptions;
    const filter = {
      property: propertyId,
      ...(propertyOwnerId ? { propertyOwner: propertyOwnerId } : {}),
    };

    if (status) {
      const statuses = String(status)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (statuses.length === 1) {
        filter.status = statuses[0];
      } else if (statuses.length > 1) {
        filter.status = { $in: statuses };
      }
    }

    const investments = await this.investmentRepository.findAll(
      filter,
      "property investor propertyOwner",
    );

    const safeSortBy = investmentSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";
    const safeSortDirection = sortOrder === "asc" ? 1 : -1;

    return investments
      .sort((left, right) => {
        const leftValue = left?.[safeSortBy];
        const rightValue = right?.[safeSortBy];

        if (leftValue === rightValue) return 0;
        if (leftValue === undefined || leftValue === null) {
          return 1 * safeSortDirection;
        }
        if (rightValue === undefined || rightValue === null) {
          return -1 * safeSortDirection;
        }

        return leftValue > rightValue
          ? safeSortDirection
          : -1 * safeSortDirection;
      })
      .map((investment) => toInvestmentDto(investment));
  }

  // Local representative ata
  async assignLocalRepresentative(investmentId, representativeId, _adminId = null) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor",
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

    if (representative.accountStatus !== "active") {
      throw new Error("Local representative account is not active");
    }

    const investmentRegion = this.getRepresentativeRegionForInvestment(investment);
    if (!investmentRegion) {
      throw new Error("This investment does not belong to a supported region");
    }

    if (!representativeHasRegion(representative, investmentRegion)) {
      throw new Error(
        "Local representative is not assigned to this investment region",
      );
    }

    // Investment'ı güncelle
    investment.localRepresentative = representativeId;
    if (investment.representativeRequestStatus === "pending") {
      investment.representativeRequestStatus = "fulfilled";
      investment.representativeRequestClaimedAt = new Date();
      investment.representativeRequestResolvedAt = new Date();
    }
    await investment.save();

    // Bildirim gönder
    await this.safeNotify("notifyRepresentativeAssigned", representativeId, {
      investmentId: investmentId,
      propertyCity: investment.property.city,
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  // Local representative talep et
  async requestLocalRepresentative(investmentId, userId, userRole) {
    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor",
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

    if (investment.localRepresentative) {
      throw new Error("A local representative is already assigned");
    }

    if (investment.representativeRequestStatus === "pending") {
      throw new Error("A representative request is already pending");
    }

    const requestedRegion = this.getRepresentativeRegionForInvestment(investment);
    if (!requestedRegion) {
      throw new Error("This investment is not in a supported representative region");
    }

    const requestDate = new Date();
    const updatedInvestment =
      await this.investmentRepository.createRepresentativeRequestIfAvailable(
        investmentId,
        {
          representativeRequestedBy: userId,
          representativeRequestDate: requestDate,
          representativeRequestedByRole: userRole,
          representativeRequestedRegion: requestedRegion,
          representativeRequestStatus: "pending",
          representativeRequestClaimedAt: null,
          representativeRequestResolvedAt: null,
        },
      );

    if (!updatedInvestment) {
      const currentState = await this.investmentRepository.findById(
        investmentId,
        "localRepresentative representativeRequestStatus",
      );

      if (!currentState) {
        throw new Error("Investment not found");
      }

      if (currentState.localRepresentative) {
        throw new Error("A local representative is already assigned");
      }

      if (currentState.representativeRequestStatus === "pending") {
        throw new Error("A representative request is already pending");
      }

      throw new Error("Failed to create representative request");
    }

    // Admin'e bildirim
    await this.safeNotify("notifyAdminRepresentativeRequested", investmentId, {
      requestedBy: userId,
      propertyCity: investment.property.city,
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  async getRepresentativeRequestPool(localRepresentativeId) {
    const LocalRepresentative = require("../models/LocalRepresentative");
    const representative = await LocalRepresentative.findById(localRepresentativeId);

    if (!representative) {
      throw new Error("Local representative not found");
    }

    const regions = getRepresentativeRegions(representative);
    if (!regions.length) {
      return {
        data: [],
        summary: {
          total: 0,
          byRegion: [],
        },
      };
    }

    const investments = await this.investmentRepository.findAll(
      {
        representativeRequestStatus: "pending",
        localRepresentative: null,
        representativeRequestedRegion: { $in: regions },
      },
      "property investor propertyOwner representativeRequestedBy",
    );

    const data = investments
      .sort(
        (left, right) =>
          new Date(right.representativeRequestDate || right.createdAt) -
          new Date(left.representativeRequestDate || left.createdAt),
      )
      .map((investment) => this.mapRepresentativeCase(investment));

    return {
      data,
      summary: {
        total: data.length,
        byRegion: regions.map((region) => ({
          region,
          count: data.filter(
            (item) => item.representativeRequest?.region === region,
          ).length,
        })),
      },
    };
  }

  async claimRepresentativeRequest(investmentId, localRepresentativeId) {
    const LocalRepresentative = require("../models/LocalRepresentative");
    const representative = await LocalRepresentative.findById(localRepresentativeId);

    if (!representative) {
      throw new Error("Local representative not found");
    }

    const investment = await this.investmentRepository.findById(
      investmentId,
      "property investor propertyOwner localRepresentative representativeRequestedBy",
    );

    if (!investment) {
      throw new Error("Investment not found");
    }

    if (investment.localRepresentative) {
      throw new Error("This request has already been claimed");
    }

    if (investment.representativeRequestStatus !== "pending") {
      throw new Error("There is no pending representative request for this investment");
    }

    const investmentRegion = this.getRepresentativeRegionForInvestment(investment);
    if (!investmentRegion || !representativeHasRegion(representative, investmentRegion)) {
      throw new Error("You are not authorized to claim this request");
    }

    const claimedAt = new Date();
    const claimedInvestment =
      await this.investmentRepository.claimRepresentativeRequestIfPending(
        investmentId,
        representative._id,
        claimedAt,
      );

    if (!claimedInvestment) {
      const currentState = await this.investmentRepository.findById(
        investmentId,
        "localRepresentative representativeRequestStatus",
      );

      if (!currentState) {
        throw new Error("Investment not found");
      }

      if (currentState.localRepresentative) {
        throw new Error("This request has already been claimed");
      }

      if (currentState.representativeRequestStatus !== "pending") {
        throw new Error("There is no pending representative request for this investment");
      }

      throw new Error("Failed to claim representative request");
    }

    await this.safeNotify("notifyRepresentativeAssigned", representative._id, {
      investmentId,
      propertyCity: investment.property?.city,
    });

    const refreshedInvestment = await this.loadInvestmentForResponse(investmentId);
    return this.toDetailResponse(refreshedInvestment);
  }

  async getRepresentativeAssignments(localRepresentativeId) {
    const investments = await this.investmentRepository.findAll(
      { localRepresentative: localRepresentativeId },
      "property investor propertyOwner localRepresentative representativeRequestedBy",
    );

    const data = investments
      .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
      .map((investment) => this.mapRepresentativeCase(investment));

    return {
      data,
      summary: {
        total: data.length,
        active: data.filter((item) => ACTIVE_ASSIGNMENT_STATUSES.includes(item.status))
          .length,
        titleDeedPending: data.filter(
          (item) => item.status === "title_deed_pending",
        ).length,
      },
    };
  }

  async processRefund(
    investmentId,
    refundData = {},
    _userId = null,
    _userRole = "admin",
  ) {
    const Property = require("../models/Property");
    const Investor = require("../models/Investor");
    const refundReason =
      typeof refundData === "string"
        ? refundData
        : refundData.reason || refundData.note || "Refund processed";

    const inv = await this.investmentRepository.findById(
      investmentId,
      "property investor",
    );
    if (!inv) throw new Error("Investment not found");

    // Investment
    await this.investmentRepository.update(investmentId, {
      $set: {
        status: "refunded",
        refundReason,
        refundedAt: new Date(),
        refund: {
          refunded: true,
          amount: refundData.amount || inv.amountInvested,
          refundedAt: new Date(),
        },
      },
    });

    // Property -> completed (ya da iş akışına uygun statü)
    await Property.updateOne(
      { _id: inv.property },
      { $set: { status: "completed" } },
    );

    // Investor aktif yatırım sayısını azalt
    await Investor.updateOne(
      { _id: inv.investor },
      { $inc: { activeInvestmentCount: -1 } },
    );

    // Bildirim
    await this.safeNotify("notifyInvestmentRefunded", inv.investor, {
      investmentId,
      reason: refundReason,
    });

    return { success: true };
  }

  async transferProperty(
    investmentId,
    transferData = {},
    _userId = null,
    userRole = "admin",
  ) {
    if (userRole !== "admin") {
      throw new Error("Only admin can transfer property");
    }

    const Property = require("../models/Property");
    const Investor = require("../models/Investor");

    const inv = await this.investmentRepository.findById(
      investmentId,
      "property investor",
    );
    if (!inv) throw new Error("Investment not found");

    // Transfer kaydını tamamlanmış durumuna taşı.
    await Property.updateOne(
      { _id: inv.property },
      { $set: { status: "completed" } },
    );

    await this.investmentRepository.update(investmentId, {
      $set: {
        status: "completed",
        transferOfProperty: {
          transferred: true,
          date: new Date(),
          method: transferData.method || "manual",
        },
      },
    });

    // Investor aktif yatırım sayısını azalt
    await Investor.updateOne(
      { _id: inv.investor },
      { $inc: { activeInvestmentCount: -1 } },
    );

    // Bildirim
    await this.safeNotify("notifyPropertyTransferred", inv.investor, {
      investmentId,
      propertyId: inv.property,
    });

    return { success: true };
  }

  // Property Owner'ın kira ödemelerini getir
  async getPropertyOwnerRentalPayments(
    propertyOwnerId,
    paginationOptions = {},
  ) {
    const options = {
      populate: "property investor",
      customFilters: { propertyOwner: propertyOwnerId, status: "active" },
      allowedFilters: {},
      allowedSortFields: ["createdAt", "updatedAt"],
    };

    const investments = await this.investmentRepository.paginate(
      paginationOptions,
      options,
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
          currency: APP_CURRENCY,
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
    const options = {
      populate: "property propertyOwner",
      customFilters: { investor: investorId, status: "active" },
      allowedFilters: {},
      allowedSortFields: ["createdAt", "updatedAt"],
    };

    const investments = await this.investmentRepository.paginate(
      paginationOptions,
      options,
    );

    // Kira gelirlerini topla
    const incomes = [];
    investments.data.forEach((investment) => {
      investment.rentalPayments.forEach((payment) => {
        incomes.push({
          investmentId: investment._id,
          propertyCity: investment.property.city,
          propertyOwnerName: this.displayNameOf(investment.propertyOwner),
          month: payment.month,
          amount: payment.amount,
          currency: APP_CURRENCY,
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
      "property investor propertyOwner",
    );

    const upcomingPayments = [];
    investments.forEach((investment) => {
      investment.rentalPayments
        .filter(
          (p) =>
            p.status === "pending" &&
            p.dueDate >= today &&
            p.dueDate <= nextWeek,
        )
        .forEach((payment) => {
          upcomingPayments.push({
            investmentId: investment._id,
            property: investment.property.city,
            investor: this.displayNameOf(investment.investor),
            propertyOwner: this.displayNameOf(investment.propertyOwner),
            month: payment.month,
            amount: payment.amount,
            currency: APP_CURRENCY,
            dueDate: payment.dueDate,
            daysRemaining: Math.ceil(
              (payment.dueDate - today) / (1000 * 60 * 60 * 24),
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
      "property investor propertyOwner",
    );

    const delayedPayments = [];
    investments.forEach((investment) => {
      investment.rentalPayments
        .filter(
          (p) =>
            p.status === "delayed" ||
            (p.status === "pending" && p.dueDate < today),
        )
        .forEach((payment) => {
          delayedPayments.push({
            investmentId: investment._id,
            property: investment.property.city,
            investor: this.displayNameOf(investment.investor),
            propertyOwner: this.displayNameOf(investment.propertyOwner),
            month: payment.month,
            amount: payment.amount,
            currency: APP_CURRENCY,
            dueDate: payment.dueDate,
            daysDelayed: Math.ceil(
              (today - payment.dueDate) / (1000 * 60 * 60 * 24),
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
      "property investor propertyOwner rentalPayments",
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
      (p) => p.status === "paid",
    ).length;
    const pendingPayments = investment.rentalPayments.filter(
      (p) => p.status === "pending",
    ).length;
    const delayedPayments = investment.rentalPayments.filter(
      (p) => p.status === "delayed",
    ).length;

    const totalExpectedAmount = investment.rentalPayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const totalPaidAmount = investment.rentalPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);

    const paymentRate =
      totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;
    const onTimePayments = investment.rentalPayments.filter(
      (p) => p.status === "paid" && p.paidAt <= p.dueDate,
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
        1,
      );
      const month = `${dueDate.getFullYear()}-${String(
        dueDate.getMonth() + 1,
      ).padStart(2, "0")}`;
      schedule.push({
        month,
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
