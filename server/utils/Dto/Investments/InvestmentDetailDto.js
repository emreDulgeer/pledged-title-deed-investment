// server/utils/dto/Investments/InvestmentDetailDto.js

const InvestmentDto = require("./InvestmentDto");
const {
  getRepresentativeRegions,
} = require("../../representativeRegions");

class InvestmentDetailDto extends InvestmentDto {
  constructor(investment) {
    super(investment);
    const agreedMonthlyRent =
      investment.offerTerms?.desiredMonthlyRent || investment.property?.rentOffered || 0;

    // Detaylı property bilgileri
    if (investment.property && typeof investment.property === "object") {
      this.property = {
        id: investment.property._id,
        country: investment.property.country,
        city: investment.property.city,
        fullAddress: investment.property.fullAddress,
        mapSearchAddress: investment.property.mapSearchAddress,
        locationPin: investment.property.locationPin,
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
        status: investment.property.status,
        trustScore: investment.property.trustScore,
      };

    }

    // Property owner bilgileri
    if (investment.propertyOwner && typeof investment.propertyOwner === "object") {
      this.propertyOwner = {
        id: investment.propertyOwner._id,
        fullName: investment.propertyOwner.fullName,
        email: investment.propertyOwner.email,
        phoneNumber: investment.propertyOwner.phoneNumber,
        country: investment.propertyOwner.country,
        totalProperties: investment.propertyOwner.totalProperties ?? null,
        completedContracts: investment.propertyOwner.completedContracts ?? null,
        ongoingContracts: investment.propertyOwner.ongoingContracts ?? null,
        verificationStatus: investment.propertyOwner.kycStatus ?? null,
        trustScore:
          investment.propertyOwner.ownerTrustScore ??
          investment.propertyOwner.trustScore ??
          null,
      };

      if (this.property) {
        this.property.owner = {
          id: investment.propertyOwner._id,
          fullName: investment.propertyOwner.fullName,
          email: investment.propertyOwner.email,
          phone: investment.propertyOwner.phoneNumber,
          country: investment.propertyOwner.country,
          totalProperties: investment.propertyOwner.totalProperties ?? null,
          completedContracts: investment.propertyOwner.completedContracts ?? null,
          ongoingContracts: investment.propertyOwner.ongoingContracts ?? null,
          verificationStatus: investment.propertyOwner.kycStatus ?? null,
          trustScore:
            investment.propertyOwner.ownerTrustScore ??
            investment.propertyOwner.trustScore ??
            null,
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
        regions: getRepresentativeRegions(investment.localRepresentative),
      };
    }

    // Representative request bilgisi
    if (investment.representativeRequestedBy) {
      this.representativeRequest = {
        requestedBy:
          investment.representativeRequestedBy._id ||
          investment.representativeRequestedBy,
        requestedByRole: investment.representativeRequestedByRole || null,
        requestDate: investment.representativeRequestDate,
        region: investment.representativeRequestedRegion || null,
        status: investment.representativeRequestStatus || "none",
        claimedAt: investment.representativeRequestClaimedAt || null,
        resolvedAt: investment.representativeRequestResolvedAt || null,
        isPending: !investment.localRepresentative,
      };
    }

    // Hesaplamalar
    if (investment.property && typeof investment.property === "object") {
      this.calculations = {
        totalExpectedIncome:
          agreedMonthlyRent *
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
      contractSigning: {
        completed: !!investment.contractWorkflow?.fullySignedAt,
        active:
          investment.status === "contract_signed" &&
          !investment.contractWorkflow?.fullySignedAt,
        date: investment.contractWorkflow?.fullySignedAt || null,
      },
      principalPayment: {
        completed:
          investment.principalPayment?.status === "confirmed" ||
          ["title_deed_pending", "active", "completed", "refunded"].includes(
            investment.status,
          ),
        active:
          investment.status === "contract_signed" &&
          !!investment.contractWorkflow?.fullySignedAt &&
          investment.principalPayment?.status !== "confirmed",
        date:
          investment.principalPayment?.confirmedAt ||
          investment.principalPayment?.receiptUploadedAt ||
          investment.principalPayment?.initiatedAt ||
          null,
      },
      titleDeedRegistration: {
        completed: ["active", "completed", "refunded"].includes(
          investment.status
        ),
        active: investment.status === "title_deed_pending",
        date:
          investment.titleDeedDocument?.verifiedAt ||
          investment.titleDeedDocument?.uploadedAt ||
          null,
      },
      rentalPeriod: {
        active: investment.status === "active",
        startDate:
          investment.titleDeedDocument?.verifiedAt ||
          investment.titleDeedDocument?.uploadedAt ||
          null,
      },
      completion: {
        completed: ["completed", "refunded"].includes(investment.status),
        date: ["completed", "refunded"].includes(investment.status)
          ? investment.updatedAt
          : null,
        method: investment.refund?.refunded
          ? "refund"
          : investment.transferOfProperty?.transferred
          ? "transfer"
          : null,
      },
    };

    this.nextRequiredAction = this.getNextRequiredAction(investment);
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

  getNextRequiredAction(investment) {
    if (investment.status === "offer_sent") {
      return {
        actor: "property_owner",
        key: "review_offer",
      };
    }

    if (investment.status === "rejected") {
      return null;
    }

    if (investment.status === "contract_signed") {
      if (!investment.contractWorkflow?.investorSigned?.fileId) {
        return { actor: "investor", key: "upload_contract" };
      }

      if (!investment.contractWorkflow?.ownerSigned?.fileId) {
        return { actor: "property_owner", key: "upload_contract" };
      }

      if (investment.principalPayment?.status === "receipt_uploaded") {
        return { actor: "property_owner", key: "confirm_payment" };
      }

      if (investment.principalPayment?.status !== "confirmed") {
        return { actor: "investor", key: "prepare_payment" };
      }

      if (!investment.titleDeedDocument?.fileId) {
        return { actor: "property_owner", key: "upload_title_deed" };
      }
    }

    if (investment.status === "title_deed_pending") {
      return { actor: "admin", key: "approve_title_deed" };
    }

    if (investment.status === "active") {
      return { actor: "property_owner", key: "manage_rental_period" };
    }

    return null;
  }
}

module.exports = InvestmentDetailDto;
