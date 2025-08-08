// server/controllers/investmentController.js

const InvestmentService = require("../services/investmentService");
const responseWrapper = require("../utils/responseWrapper");

class InvestmentController {
  constructor() {
    this.investmentService = new InvestmentService();
  }

  // Yeni yatırım teklifi gönder
  createInvestmentOffer = async (req, res) => {
    try {
      const investorId = req.user.id;
      const propertyId = req.params.propertyId;

      const investment = await this.investmentService.createInvestmentOffer(
        propertyId,
        investorId,
        req.body
      );

      return responseWrapper.created(
        res,
        investment,
        "Investment offer sent successfully"
      );
    } catch (error) {
      if (error.message.includes("not found")) {
        return responseWrapper.notFound(res, error.message);
      }
      if (
        error.message.includes("limit reached") ||
        error.message.includes("not available") ||
        error.message.includes("already have")
      ) {
        return responseWrapper.badRequest(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Teklifi kabul et (Property Owner)
  acceptOffer = async (req, res) => {
    try {
      const propertyOwnerId = req.user.id;
      const investmentId = req.params.id;

      const investment = await this.investmentService.acceptOffer(
        investmentId,
        propertyOwnerId
      );

      return responseWrapper.success(
        res,
        investment,
        "Offer accepted successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("not in pending")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Teklifi reddet (Property Owner)
  rejectOffer = async (req, res) => {
    try {
      const propertyOwnerId = req.user.id;
      const investmentId = req.params.id;

      const result = await this.investmentService.rejectOffer(
        investmentId,
        propertyOwnerId
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("not in pending")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Kontrat yükle
  uploadContract = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const investmentId = req.params.id;
      const contractFile = req.body.contractFile; // File upload middleware'den gelecek

      const investment = await this.investmentService.uploadContract(
        investmentId,
        userId,
        contractFile,
        userRole
      );

      return responseWrapper.success(
        res,
        investment,
        "Contract uploaded successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("not in contract")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Tapu kaydı yükle
  uploadTitleDeed = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const investmentId = req.params.id;
      const titleDeedDocument = req.body.titleDeedDocument;

      const investment = await this.investmentService.uploadTitleDeed(
        investmentId,
        userId,
        titleDeedDocument,
        userRole
      );

      return responseWrapper.success(
        res,
        investment,
        "Title deed uploaded successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("Contract must be")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Kira ödemesi yap
  makeRentalPayment = async (req, res) => {
    try {
      const propertyOwnerId = req.user.id;
      const investmentId = req.params.id;
      const { month, paymentReceipt } = req.body;

      const investment = await this.investmentService.makeRentalPayment(
        investmentId,
        month,
        propertyOwnerId
      );

      return responseWrapper.success(
        res,
        investment,
        "Rental payment marked as paid"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("not active") ||
        error.message.includes("already made")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // İade işlemi (Admin veya Property Owner)
  processRefund = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const investmentId = req.params.id;
      const refundData = req.body;

      const investment = await this.investmentService.processRefund(
        investmentId,
        refundData,
        userId,
        userRole
      );

      return responseWrapper.success(
        res,
        investment,
        "Refund processed successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("must be active")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Mülk transferi (Admin)
  transferProperty = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const investmentId = req.params.id;
      const transferData = req.body;

      const investment = await this.investmentService.transferProperty(
        investmentId,
        transferData,
        userId,
        userRole
      );

      return responseWrapper.success(
        res,
        investment,
        "Property transferred successfully"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (
        error.message.includes("Only admin") ||
        error.message.includes("must be active")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Investor'ın yatırımlarını getir
  // getMyInvestments metodunu güncelle
  getMyInvestments = async (req, res) => {
    try {
      const investorId = req.user.id;
      const result = await this.investmentService.getInvestorInvestments(
        investorId,
        req.query // Direkt query'yi gönder, service'de işleyeceğiz
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Investments fetched successfully"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Yatırım detayını getir
  getInvestmentById = async (req, res) => {
    try {
      const investmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Service'de yetki kontrolü yapılacak
      const investment = await this.investmentService.getInvestmentById(
        investmentId,
        userId,
        userRole
      );

      return responseWrapper.success(
        res,
        investment,
        "Investment details fetched"
      );
    } catch (error) {
      if (error.message === "Investment not found") {
        return responseWrapper.notFound(res, "Investment not found");
      }
      if (error.message.includes("Unauthorized")) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Property'nin yatırımlarını getir (Property Owner)
  getPropertyInvestments = async (req, res) => {
    try {
      const propertyId = req.params.propertyId;
      const investments = await this.investmentService.getPropertyInvestments(
        propertyId
      );

      return responseWrapper.success(
        res,
        investments,
        "Property investments fetched"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Admin: Tüm yatırımlar
  getAllInvestments = async (req, res) => {
    try {
      const result = await this.investmentService.getAllInvestmentsForAdmin(
        req.query
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "All investments fetched"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Yaklaşan kira ödemeleri
  getUpcomingPayments = async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 7;
      const investments =
        await this.investmentService.getUpcomingRentalPayments(days);

      return responseWrapper.success(
        res,
        investments,
        `Upcoming payments for next ${days} days`
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Gecikmiş ödemeler
  getDelayedPayments = async (req, res) => {
    try {
      const investments = await this.investmentService.getDelayedPayments();

      return responseWrapper.success(
        res,
        investments,
        "Delayed payments fetched"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Yatırım istatistikleri
  getInvestmentStatistics = async (req, res) => {
    try {
      const investmentId = req.params.id;
      const statistics = await this.investmentService.getInvestmentStatistics(
        investmentId
      );

      if (!statistics) {
        return responseWrapper.notFound(res, "Investment not found");
      }

      return responseWrapper.success(
        res,
        statistics,
        "Investment statistics fetched"
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Local representative atama (Admin)
  assignLocalRepresentative = async (req, res) => {
    try {
      const adminId = req.user.id;
      const investmentId = req.params.id;
      const { representativeId } = req.body;

      if (!representativeId) {
        return responseWrapper.badRequest(res, "Representative ID is required");
      }

      const investment = await this.investmentService.assignLocalRepresentative(
        investmentId,
        representativeId,
        adminId
      );

      return responseWrapper.success(
        res,
        investment,
        "Local representative assigned successfully"
      );
    } catch (error) {
      if (error.message.includes("not found")) {
        return responseWrapper.notFound(res, error.message);
      }
      if (error.message.includes("not assigned to this")) {
        return responseWrapper.badRequest(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Local representative talebi
  requestLocalRepresentative = async (req, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const investmentId = req.params.id;

      const result = await this.investmentService.requestLocalRepresentative(
        investmentId,
        userId,
        userRole
      );

      return responseWrapper.success(res, result, result.message);
    } catch (error) {
      if (error.message.includes("not found")) {
        return responseWrapper.notFound(res, error.message);
      }
      if (
        error.message.includes("Unauthorized") ||
        error.message.includes("already")
      ) {
        return responseWrapper.forbidden(res, error.message);
      }
      return responseWrapper.error(res, error.message);
    }
  };

  // Property Owner'ın kira ödemelerini getir
  getPropertyOwnerRentalPayments = async (req, res) => {
    try {
      const propertyOwnerId = req.user.id;
      const result =
        await this.investmentService.getPropertyOwnerRentalPayments(
          propertyOwnerId,
          req.query
        );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Rental payments fetched successfully",
        { summary: result.summary }
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };

  // Investor'ın kira ödemelerini getir
  getInvestorRentalPayments = async (req, res) => {
    try {
      const investorId = req.user.id;
      const result = await this.investmentService.getInvestorRentalPayments(
        investorId,
        req.query
      );

      return responseWrapper.paginated(
        res,
        result.data,
        result.pagination.page,
        result.pagination.limit,
        result.pagination.total,
        "Rental income fetched successfully",
        { summary: result.summary }
      );
    } catch (error) {
      return responseWrapper.error(res, error.message);
    }
  };
}

module.exports = new InvestmentController();
